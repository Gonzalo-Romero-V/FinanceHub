# Estructura de archivos

Resumen de qué vive dónde y por qué.

## Repo

```
financehub/
  backend/         # Laravel API (puerto 8000)
  frontend/        # Next.js (puerto 3000) + frontend/android/ (proyecto Capacitor)
  llm-service/     # FastAPI (puerto 8001)
  Docs/            # esta carpeta — contexto para agentes
  README.md        # quick start
  PENDIENTES.md    # backlog informal (canonical) — incluye la Sección Z de
                   #   verificación manual pendiente (todo lo que no se
                   #   puede probar con tests automatizados)
```

## Frontend (detalle)

```
frontend/
  app/
    layout.tsx                  # root layout (AuthProvider)
    page.tsx                    # redirige a /home
    globals.css                 # tokens + utilities tipográficas

    (public)/                   # rutas sin auth
      layout.tsx                # HeaderPublic + Footer
      home/page.tsx
      tutorial/page.tsx         # ahora "Guía rápida" (renombrada de referencia)
      login/page.tsx            # maneja ?verified=1 y ?error=invalid_verification_link
      forgot-password/page.tsx
      reset-password/page.tsx

    (user)/                     # rutas autenticadas (rol "user")
      layout.tsx                # HeaderUser + AuthGate + OnboardingProvider + OfflineStatusBar
      dashboard/page.tsx        # AI builder + ícono mic
      movimientos/page.tsx      # + "Registrar por voz" + badge "Pendiente" (offline)
      cuentas/page.tsx
      conceptos/page.tsx
      presupuestos/page.tsx
      deudas/page.tsx
      perfil/page.tsx           # edición de name/email/password + notificaciones + reiniciar recorrido
      help/page.tsx              # "Guía rápida"

    auth/callback/page.tsx      # callback OAuth Google

  components/
    layout/
      header-shell.tsx          # base reusable de header
      aside-shell.tsx           # base reusable de aside mobile
      header-public.tsx         # rol público
      header-user.tsx           # rol user
      aside-public.tsx          # idem aside
      aside-user.tsx
      nav-links.ts              # publicNavLinks, userNavLinks, userSecondaryLinks
      footer.tsx
      logo.tsx
    custom/                     # abstracciones de UI propias del proyecto
      page-shell.tsx
      page-header.tsx
      page-state.tsx            # PageLoading + PageError
      data-table.tsx            # tabla genérica con filtro de fecha, acciones y footer
      balance-general.tsx       # resumen activos − pasivos
      concepto-tree.tsx         # árbol expandible raíz/hijo para conceptos
      historial-balance.tsx     # evolución de balance: general, por cuenta o todas comparadas
    forms/                      # modales de crear / editar / ver
      cuenta-form.tsx
      concepto-form.tsx
      movimiento-form.tsx           # wizard 5 pasos (crear)
      movimiento-edit-form.tsx      # form con cascada tipo → concepto → cuentas
      movimiento-detail-modal.tsx   # solo lectura, todos los campos
      confirm-delete-modal.tsx
      reconciliacion-modal.tsx      # compara saldo real vs sistema y crea ajuste
    auth/
      auth-gate.tsx
    charts/                     # widgets del dashboard AI
      widget-renderer.tsx
      kpi-widget.tsx, bar-chart-widget.tsx, line-chart-widget.tsx,
      pie-chart-widget.tsx, table-widget.tsx
      types.ts, index.ts
    ui/                         # primitivos shadcn (NO inventar acá)
      button, card, input, label, modal, popover, select, table,
      textarea, calendar

  lib/
    api/
      client.ts                 # apiFetch + getApiBaseUrl + ApiError
      cuentas.ts, conceptos.ts, movimientos.ts, deudas.ts, presupuestos.ts,
      balance.ts, notifications.ts
      reconciliaciones.ts       # listReconciliaciones, createReconciliacion
      user-settings.ts          # getUserSettings, updateUserSettings
      users.ts                  # updateUser, getUser
      llm.ts                    # analyzeRequest() para el LLM service
                                #   (manda X-Client-Timezone)
      voice.ts                  # transcribeAudio, parseMovimientoVoz
    auth/
      api.ts                    # login/register/forgotPassword/resetPassword/
                                #   resendVerification/fetchCurrentUser/logoutRequest
      context.tsx               # AuthProvider + useAuth
      storage.ts                # persistAuthToken, getAuthToken, clearAuthToken
      types.ts                  # AuthUser (incluye has_password), LoginCredentials, ...
    offline/                    # mobile-only — inerte en el build web
                                #   (gateado por platform.ts)
      platform.ts                # isNativeApp() — único punto de verdad
      storage.ts                 # wrapper @capacitor/preferences
      network.ts                 # wrapper @capacitor/network
      cached-fetch.ts             # withOfflineCache() + OFFLINE_CACHE_KEYS
      queue.ts                    # cola de movimientos creados offline
      sync.ts                     # drena la cola al reconectar
      use-offline-sync.ts         # hook React que conecta todo esto
    notifications/               # interfaz común + 2 implementaciones por plataforma
      types.ts                    # PushProvider contract
      web-push.ts                  # Push API + Service Worker + VAPID
      native-push.ts               # @capacitor-firebase/messaging (FCM)
      local-reminders.ts           # @capacitor/local-notifications (mobile-only)
      index.ts                     # dispatch por Capacitor.isNativePlatform()
    onboarding/
      context.tsx                  # OnboardingProvider
      page-keys.ts                 # claves de coach marks por página
      use-help-icon-action.ts      # ícono de ayuda del header → reabre onboarding
    ui/
      notify.ts                    # notifyError/Success/Warning/Info (wrapper sonner)
    utils/
      format.ts                 # formatCurrency, formatDate, formatDateTime,
                                #   formatNumber, parseApiDate, isSameLocalDay,
                                #   getBrowserTimezone, todayIsoDate
    utils.ts                    # cn() (clsx + tailwind-merge)

  components/
    voice/                      # voice-recorder-button.tsx, voice-movimiento-capture.tsx
    onboarding/                 # welcome-carousel.tsx, coach-mark.tsx, onboarding-root.tsx
    notifications/               # notification-bell.tsx (ícono + inbox del header)
    offline/                     # offline-status-bar.tsx (mobile-only)

  public/sw.js                  # Service Worker — recibe Web Push, no cachea nada más

  android/                      # proyecto nativo Capacitor (generado, no editar a
                                #   mano salvo AndroidManifest.xml/MainActivity.java)
  capacitor.config.ts           # appId cc.financehub.app, webDir "out"

  .env.example                  # plantilla — copiar a .env.local en dev
```

## Compilar el APK de Android

Requiere Android SDK + JDK 21 (no alcanza con un JDK 17 del sistema — usar
el que trae embebido Android Studio). Comandos, desde `frontend/`:

```powershell
# 1. Export estático de Next.js (no rewrites — URLs absolutas de producción)
$env:NEXT_PUBLIC_API_URL="https://financehub.cc/api"
$env:NEXT_PUBLIC_LLM_API_BASE_URL="https://financehub.cc/llm-api"
$env:NEXT_PUBLIC_VAPID_PUBLIC_KEY="<la clave pública VAPID>"
npm run build:mobile

# 2. Copiar el output + sincronizar plugins nativos al proyecto Android
npx cap sync android

# 3. Compilar el APK debug
cd android
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
.\gradlew.bat assembleDebug
```

El APK queda en `android/app/build/outputs/apk/debug/app-debug.apk`. Para
un build de release (firmado, para subir a Play Store) hace falta además
un keystore — no configurado todavía, pendiente cuando se llegue a esa
etapa.

`frontend/android/app/google-services.json` (config de Firebase/FCM) y
`frontend/android/local.properties` (ruta al SDK) son locales de cada
máquina — están gitignorados, cada dev/servidor necesita el suyo.

## Convenciones de naming

| Tipo | Convención | Ejemplos |
|---|---|---|
| Archivos React | `kebab-case.tsx` | `header-user.tsx`, `data-table.tsx` |
| Componente exportado | `PascalCase` | `HeaderUser`, `DataTable` |
| Hook / función | `camelCase` | `useAuth`, `apiFetch` |
| Tipos / interfaces | `PascalCase` | `AuthUser`, `MovimientoRaw` |
| Constantes módulo | `camelCase` o `UPPER_SNAKE` (env-like) | `userNavLinks`, `DEFAULT_API_URL` |
| Sufijo de rol | `-{rol}` | `header-public`, `aside-user` |

## Backend (detalle)

```
backend/
  app/
    Http/Controllers/
      AuthController.php          # login/register/google/me/logout +
                                  #   forgotPassword/resetPassword/verifyEmail/
                                  #   resendVerification
      CuentaController.php
      ConceptoController.php
      MovimientoController.php    # store/update/destroy con regla "día actual" +
                                  #   verificarConceptoDelUsuario/verificarCuentaDelUsuario
                                  #   (valida ownership de TODO lo que venga en el body,
                                  #   no solo del recurso original — ver nota de seguridad)
      TipoCuentaController.php
      TipoMovimientoController.php
      BalanceController.php       # netea activos - (pasivos + deudas activas)
      UserController.php          # current_password obligatorio para cambiar password propio
      UserSettingsController.php  # reconciliación (tipo/día/frecuencia) + onboarding_seen
      PresupuestoController.php
      DeudaController.php         # genera plan de cuotas según sistema (francés/alemán/bullet)
      ReconciliacionController.php
      NotificationController.php
      PushSubscriptionController.php
    Models/
      UserModel.php                # implements MustVerifyEmail
      CuentaModel.php
      ConceptoModel.php
      MovimientoModel.php
      TipoCuentaModel.php
      TipoMovimientoModel.php
      UserSettingsModel.php        # calcularProximaReconciliacion() — compartido entre
                                   #   UserSettingsController y ReconciliacionController
      PresupuestoModel.php
      DeudaModel.php
      CuotaModel.php
      PushSubscriptionModel.php
      Concerns/
        SerializesDatesAsIso.php  # trait: JSON con Y-m-d\TH:i:s.u\Z (UTC)
    Notifications/
      ResetPasswordNotification.php
      VerifyEmailNotification.php
      ReconciliacionProximaNotification.php
      CuotaDeudaProximaNotification.php
      PresupuestoUmbralNotification.php
      LimiteIADiarioNotification.php   # el llm-service la dispara insertando
                                       #   directo en `notifications` (Python), no
                                       #   pasa por acá salvo que Laravel la use directo
      Channels/
        WebPushChannel.php          # canal custom, llama a WebPushSender
        FcmChannel.php              # canal custom, llama a FcmSender
    Services/
      WebPushSender.php             # minishlink/web-push, poda suscripciones con 410
      FcmSender.php                 # kreait/laravel-firebase, poda tokens con NotFound
                                    #   (constructor NO tipa Messaging — ver nota abajo)
    Console/Commands/
      CheckReconciliacionesDue.php  # notificaciones:reconciliaciones
      CheckCuotasDeudaDue.php       # notificaciones:cuotas-deuda
  database/migrations/            # ver Docs/entidades.md
  routes/
    api.php                       # registra los grupos, throttle:120,1 en todo
                                  #   el grupo auth:sanctum
    console.php                   # Schedule::command(...)->dailyAt('08:00')
                                  #   para los 2 comandos de notificaciones —
                                  #   necesita `schedule:run` en cron/Task Scheduler
    auth/AuthRouter.php
    cuentas/CuentasRouter.php
    conceptos/ConceptosRouter.php
    movimientos/MovimientosRouter.php
    tipo_movimiento/TiposMovimientoRouter.php
    users/UsersRouter.php
    balance/BalanceRouter.php
    user_settings/UserSettingsRouter.php
    presupuestos/PresupuestosRouter.php
    deudas/DeudasRouter.php
    reconciliaciones/ReconciliacionesRouter.php
    notifications/NotificationsRouter.php
    push_subscriptions/PushSubscriptionsRouter.php
  config/
    services.php                  # Google OAuth, Resend, VAPID, Firebase
    cors.php                      # antes no existía (default abierto de Laravel) —
                                  #   ahora explícito vía CORS_ALLOWED_ORIGINS
  storage/cacert.pem              # bundle CA público — fix para el bug de cURL/SSL
                                  #   en instalaciones Windows de PHP (ver nota abajo)
  .env.example
```

Notas:
- Los modelos usan sufijo `...Model.php` y NO el default Eloquent
  (`User.php`). Mantener esa convención al agregar entidades.
- **`FcmSender::__construct`** deliberadamente NO tipa su parámetro
  `Messaging` (usa `mixed $messaging = null`) — si lo tipara, el
  contenedor de Laravel intenta resolver (e instanciar) el cliente de
  Firebase apenas se construye la clase, aunque el valor termine siendo
  `null`, y explota si no hay credenciales configuradas. Rompía CUALQUIER
  notificación, no solo las push. Ver el comentario en el archivo antes
  de "arreglarlo" agregando el tipo de vuelta.
- **Certificados SSL en Windows**: PHP en Windows suele no traer un CA
  bundle configurado, causando `cURL error 60` en cualquier llamada HTTPS
  saliente (Resend, Google, Web Push). `storage/cacert.pem` es el bundle
  estándar de Mozilla — para usarlo, apuntar `curl.cainfo`/`openssl.cafile`
  en el `php.ini` real (no alcanza con `.user.ini`, ese no lo lee el CLI,
  y los comandos programados de notificaciones corren por CLI) a esa
  ruta. **No hace falta nada de esto en Linux.**

## LLM Service (detalle)

```
llm-service/
  main.py                         # FastAPI app; POST /api/analyze,
                                  #   POST /api/voice/transcribe,
                                  #   POST /api/voice/parse-movimiento
  app/
    core/
      auth.py                     # valida token Sanctum y resuelve user_id
      rate_limit.py                # enforce_daily_limit — envuelve a auth.py,
                                   #   ~50 usos/día por usuario contra llm_usage_daily
      config.py                   # Settings (Pydantic) — env_file=.env;
                                  #   valida OPENAI_API_KEY, ALLOWED_ORIGINS,
                                  #   STATEMENT_TIMEOUT_MS, MAX_ROWS_PER_QUERY,
                                  #   DAILY_LLM_LIMIT
      failures.py                  # motivos de fallo por widget (no_entendido,
                                   #   sin_datos, tabla_no_disponible, error_sql, timeout)
    services/
      semantic.py                 # planner (prompt → spec de widgets)
      sql_gen.py                  # spec → SQL con :uid/:today/:tz
      sql_validator.py            # post-validación con sqlglot
      database.py                 # execute_query con bindings, READ ONLY,
                                  #   statement_timeout, schema cacheado
      analyst.py                  # resumen ejecutivo
      retry_orchestrator.py        # auto-discovery: hasta 3 reintentos con
                                   #   estrategias distintas si el plan inicial falla
      finance_tools.py             # funciones de solo lectura para deudas/presupuestos/
                                   #   balance (user_id siempre desde el token, nunca
                                   #   del prompt del usuario)
      voice.py                     # transcripción (Whisper) + clasificación consulta/registro
      movimiento_parser.py         # texto transcrito → MovimientoDraft estructurado
      llm/                        # adapters (openai / ollama) + factory
    utils/json_helper.py
  tests/                          # unittest (no pytest) — `python -m unittest discover -s tests`
  check_db.py                     # script utilitario
  requirements.txt                # incluye sqlglot
  .env                            # OPENAI_API_KEY, OLLAMA_*, DB_*, PORT,
                                  #   ALLOWED_ORIGINS, STATEMENT_TIMEOUT_MS,
                                  #   DAILY_LLM_LIMIT
```

## Archivos que NO deben estar en el repo
- `frontend/.env.local`, `backend/.env`, `llm-service/.env` (configuración local con secrets).
- `frontend/.next/`, `frontend/node_modules/`, `backend/vendor/`,
  `llm-service/venv/`, `__pycache__/`.
- `frontend/android/app/google-services.json` (credenciales del proyecto Firebase).
- `frontend/android/local.properties` (ruta al Android SDK, específica de cada máquina).
- `backend/public/.user.ini` (fix de SSL específico de cada máquina Windows, ver arriba).
- `backend/storage/firebase-service-account.json` (o donde se guarde la
  credencial de cuenta de servicio de Firebase) — nunca al repo, es la
  credencial server-side para *enviar* FCM.

Verificá que cualquier nuevo archivo de config sensible esté gitignored
antes de stagear.
