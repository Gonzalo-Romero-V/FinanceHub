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
