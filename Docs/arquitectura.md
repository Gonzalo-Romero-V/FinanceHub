# Arquitectura

```
                   ┌────────────────────┐
                   │   Navegador (3000) │
                   │   Next.js + React  │
                   └─────────┬──────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
        (REST + Bearer)    (HTTP)      (window.location)
              │              │              │
              ▼              ▼              ▼
   ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐
   │ Laravel API     │  │ FastAPI LLM     │  │ Google OAuth │
   │ localhost:8000  │  │ localhost:8001  │  │  (externa)   │
   └────────┬────────┘  └────────┬────────┘  └──────┬───────┘
            │                    │                  │
            │      SQL r/w       │     SQL r/o      │
            └────────┬───────────┘                  │
                     ▼                              │
            ┌────────────────────┐                  │
            │  PostgreSQL        │◀─ callback ──────┘
            │  financehub        │
            └────────────────────┘
```

## Responsabilidades

### Frontend (Next.js)
- UI, rutas, gestión de sesión en cliente.
- Llama a Laravel para todo el CRUD (`/api/...` con `Authorization: Bearer`).
- Llama al LLM service directo en `POST /api/analyze` con el token Sanctum en `Authorization: Bearer`; nunca envia `user_id` en el payload.
- Para OAuth Google, el browser hace `window.location.href = ${apiUrl}/auth/google`
  → Laravel → Google → Laravel callback → `redirect` a
  `/auth/callback?token=...` en el frontend.

### Backend (Laravel)
- Único dueño de la escritura sobre la DB.
- Emite tokens Sanctum (`auth_token`) que el frontend persiste.
- Implementa la lógica de dominio: validación de movimientos, cálculo de
  saldos, balance.
- Maneja el flujo OAuth completo (redirect + callback).

### LLM Service (FastAPI)
- Recibe `{prompt}` + headers `Authorization` y `X-Client-Timezone`, devuelve
  `{widgets[], summary, mode, ...}` tipado vía Pydantic.
- Antes del pipeline, `core.auth.get_current_user_id` valida `{id}|{plaintext}` con SHA-256 contra `personal_access_tokens`; el `user_id` sale solo del token.
- Pipeline interno:
  1. **Resolución temporal**: valida el header con `zoneinfo.ZoneInfo`,
     calcula `today_iso` en esa TZ. Estos valores se inyectan como bindings
     `:today` y `:tz` en cada query.
  2. **Semantic** (`semantic.design_dashboard`): planifica qué widgets
     responder. Recibe `today_iso`, `tz` y el schema introspectado
     (cacheado).
  3. **SQL Gen** (`sql_gen.generate_sql_for_widget`): pide al LLM SQL con
     placeholders `:uid`, `:today`, `:tz` y reglas de TZ
     (`AT TIME ZONE` para comparar días locales).
  4. **SqlValidator** (`sql_validator.validate_sql`): parser real (sqlglot)
     que rechaza statements no-SELECT, tokens prohibidos, tablas fuera de
     la whitelist y, crucialmente, exige el filtro `user_id = :uid` en
     toda tabla user-scoped. Si el LLM falla, el widget se descarta.
  5. **DB** (`db_service.execute_query`): ejecuta el SQL con bindings, en
     transacción `READ ONLY` con `statement_timeout` (5 s default) y
     truncado a `MAX_ROWS_PER_QUERY` (500 default).
  6. **Analyst** (`analyst.generate_executive_summary`): genera el
     resumen ejecutivo a partir de los resultados (sólo muestra top-3
     más metadatos).
- CORS leído de `ALLOWED_ORIGINS` (env). Default `http://localhost:3000`.

## Flujos clave

### Login con email+password
1. Frontend `POST /api/auth/login` → Laravel valida y devuelve `{token, data}`.
2. Frontend persiste token vía `persistAuthToken` (localStorage + cookie).
3. Frontend redirige a `/dashboard`.

### Login con Google
1. Frontend redirige el browser a `GET /api/auth/google`.
2. Laravel (Socialite) redirige a Google.
3. Usuario consiente, Google llama a `GET /api/auth/google/callback`
   (o el alias `/api/login/google/callback`).
4. Laravel crea/actualiza el `UserModel`, genera token Sanctum, y redirige
   con `redirect()->away(FRONTEND_URL + '/auth/callback?token=...')`.
5. Frontend `AuthCallbackPage` toma el `?token=` y llama a
   `loginWithToken` → `fetchCurrentUser` → guarda sesión → redirige a `/dashboard`.

### Análisis con IA
1. Frontend (Dashboard) llama `analyzeRequest(token, {prompt})` y envia `Authorization: Bearer` junto con `X-Client-Timezone`.
2. LLM service valida el token, resuelve el usuario y la TZ y calcula `today_iso`, ejecuta el pipeline
   (planner → sql_gen → validator → db → analyst) y devuelve la
   `AnalysisResponse` validada por Pydantic.
3. Frontend aplica `mode` (auto/replace/append/update) sobre los widgets
   actuales.
4. Cada request cuenta contra un límite diario por usuario (`enforce_daily_limit`,
   ~50/día) — ver "Rate limiting y costos de IA" más abajo.

### Olvidé mi contraseña / verificación de email
1. `POST /auth/forgot-password` (siempre responde 200, mensaje neutro —
   anti-enumeración) → Laravel usa el broker nativo (`Password::sendResetLink`)
   → `ResetPasswordNotification` manda un email (Resend) con link a
   `{FRONTEND_URL}/reset-password?token=...&email=...` (no al link web
   default de Laravel, el backend es API-only).
2. `POST /auth/reset-password` valida el token, cambia el password y
   revoca **todos** los tokens Sanctum existentes del usuario.
3. Registro tradicional (`POST /auth/register`) crea la cuenta sin
   verificar y **no devuelve token** — manda `VerifyEmailNotification`
   (link firmado `URL::temporarySignedRoute`, pega directo a
   `GET /auth/email/verify/{id}/{hash}`, que valida y redirige a
   `{FRONTEND_URL}/login?verified=1`).
4. `POST /auth/login` rechaza con 409 si el email no está verificado.
   Cuentas Google se verifican automáticamente al crearse (Google ya lo
   garantiza). Cuentas creadas antes de esta funcionalidad quedan
   confirmadas retroactivamente por una migración de backfill.

## Mobile (Capacitor) y respaldo offline

La app Android (`frontend/android/`, appId `cc.financehub.app`) **no es un
WebView apuntando al sitio en vivo** — Next.js se compila como export
estático (`BUILD_TARGET=mobile npm run build:mobile`, ver
`next.config.ts`) y se empaqueta en el APK. Sin servidor Next.js corriendo
en el dispositivo, no hay rewrites: todas las llamadas a la API usan URLs
absolutas (`NEXT_PUBLIC_API_URL=https://financehub.cc/api`) — siguen
pegándole al mismo proxy server-side de siempre, el que cambia es quién
llama (la app nativa en vez del navegador), no la arquitectura de
seguridad.

**Por qué una app y no solo el sitio en un WebView**: respaldo offline de
movimientos (crear nuevos sin conexión, se sincronizan solos al
reconectar) y notificaciones/recordatorios nativos.

- **Código específico de plataforma**: un único punto de gateo,
  `lib/offline/platform.ts` (`Capacitor.isNativePlatform()`). Todo lo que
  cuelga de `lib/offline/` y las implementaciones nativas de
  `lib/notifications/` quedan inertes en el build web — cero cambio de
  comportamiento ahí.
- **Caché de lectura**: `withOfflineCache()` envuelve `listCuentas`,
  `getBalance`, `listMovimientos`, `listConceptos`, `listPresupuestos`,
  `listDeudas`, etc. — guarda la última respuesta buena
  (`@capacitor/preferences`, key-value simple, no SQLite) y cae a ese
  valor si falla por red (nunca si es un error HTTP real, ej. 401).
- **Cola de escritura**: `createMovimiento()` detecta offline
  (`@capacitor/network`) y encola localmente en vez de fallar
  (`lib/offline/queue.ts`) — se muestra con badge "Pendiente" en la UI
  (editar/eliminar bloqueado hasta sincronizar). Al reconectar,
  `lib/offline/sync.ts` sube la cola en orden y refresca los cachés.
- **Micrófono**: el WebView de Android soporta `getUserMedia`/`MediaRecorder`
  nativamente — el código de voz es el mismo en web y mobile, sin
  desacoplar nada. Solo hace falta el permiso `RECORD_AUDIO` en el manifest
  y un `WebChromeClient` custom en `MainActivity.java` que se lo conceda al
  WebView (`onPermissionRequest`).

## Notificaciones

Arquitectura de 3 capas, cada una independiente de que las otras dos
funcionen:

1. **Inbox in-app (fuente de verdad)**: tabla nativa de notificaciones de
   Laravel (`notifications`, vía el trait `Notifiable` que `UserModel` ya
   usaba para mail). Siempre se escribe acá, sin importar si el usuario
   activó push o no. `NotificationController` (`GET /notifications`,
   `PATCH .../leida`, `PATCH .../leer-todas`) + `NotificationBell` en el
   header (compartido web/mobile, sin código de Capacitor).
2. **Push best-effort**: `lib/notifications/` define una interfaz común
   (`PushProvider`) con 2 implementaciones intercambiadas por
   `Capacitor.isNativePlatform()` — `web-push.ts` (Push API + Service
   Worker `public/sw.js` + VAPID) y `native-push.ts`
   (`@capacitor-firebase/messaging`, FCM). El backend tiene el mismo
   patrón espejado: `WebPushChannel`/`FcmChannel` (canales custom de
   notificación de Laravel), cada uno con su sender (`WebPushSender` vía
   `minishlink/web-push`, `FcmSender` vía `kreait/laravel-firebase`) que
   se queda callado si faltan credenciales — nunca rompe el flujo
   `database` aunque push no esté configurado.
3. **Recordatorios locales (mobile-only)**: `@capacitor/local-notifications`
   — se agendan en el dispositivo (no dependen del servidor ni de
   conexión el día que disparan) para avisos de fecha conocida.

**Disparadores** (`backend/app/Console/Commands/`, corren vía
`Schedule::command(...)->dailyAt('08:00')` en `routes/console.php` —
necesita `php artisan schedule:run` en cron/Task Scheduler cada minuto):
- `notificaciones:reconciliaciones` — reconciliación próxima/vencida
  (umbral 3 días), dedup contra notificaciones ya creadas para esa fecha.
- `notificaciones:cuotas-deuda` — cuotas no pagadas de deudas activas
  venciendo en ≤3 días.
- Alertas de presupuesto: síncronas, dentro de
  `MovimientoController::calcularAlertasPresupuesto()` (mismo cálculo que
  ya devolvía el toast efímero, ahora también persiste en el inbox).

## Rate limiting y costos de IA

- Laravel: `throttle:120,1` en todo el grupo `auth:sanctum` (además de
  `throttle:6,1` en las rutas de auth específicamente).
- llm-service: tabla `llm_usage_daily` (schema vía migración Laravel,
  leída/escrita directo por Python vía SQLAlchemy — mismo patrón que ya
  usa para validar tokens Sanctum sin pasar por HTTP a Laravel).
  `app/core/rate_limit.py::enforce_daily_limit` reemplaza a
  `get_current_user_id` como dependencia en `/api/analyze` y los
  endpoints de voz — incrementa un contador atómico
  (`INSERT ... ON CONFLICT DO UPDATE ... RETURNING count`) y rechaza con
  429 al superar `DAILY_LLM_LIMIT` (~50/día). Falla abierta (permite la
  request) si el chequeo mismo falla por un problema de DB.
- **1 request de usuario = 1 uso**, sin importar cuántas llamadas internas
  a OpenAI dispare (el auto-discovery puede hacer hasta 3 reintentos
  internos, cada uno con su propia llamada real — se cuenta como una sola
  consulta desde la perspectiva del usuario).
- CORS: `config/cors.php` (Laravel) cerrado a una lista explícita vía
  `CORS_ALLOWED_ORIGINS` — antes caía en el default abierto (`*`) de
  Laravel al no existir el archivo. Incluye `https://localhost` (origen
  default del WebView de Capacitor en Android).
