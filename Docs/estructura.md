# Estructura de archivos

Resumen de qué vive dónde y por qué.

## Repo

```
financehub/
  backend/         # Laravel API (puerto 8000)
  frontend/        # Next.js (puerto 3000)
  llm-service/     # FastAPI (puerto 8001)
  Docs/            # esta carpeta — contexto para agentes
  README.md        # quick start
  PENDIENTES.md    # backlog informal (canonical)
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
      tutorial/page.tsx
      login/page.tsx

    (user)/                     # rutas autenticadas (rol "user")
      layout.tsx                # HeaderUser + AuthGate
      dashboard/page.tsx        # AI builder
      movimientos/page.tsx
      cuentas/page.tsx
      conceptos/page.tsx
      perfil/page.tsx           # edición de name/email/password
      help/page.tsx

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
      historial-balance.tsx     # gráfico de evolución de balance (por cuenta o general)
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
      cuentas.ts
      conceptos.ts
      movimientos.ts
      reconciliaciones.ts       # listReconciliaciones, createReconciliacion
      user-settings.ts          # getUserSettings, updateUserSettings
      users.ts                  # updateUser, getUser
      llm.ts                    # analyzeRequest() para el LLM service
                                #   (manda X-Client-Timezone)
    auth/
      api.ts                    # loginRequest, registerRequest, fetchCurrentUser, logoutRequest
      context.tsx               # AuthProvider + useAuth
      storage.ts                # persistAuthToken, getAuthToken, clearAuthToken
      types.ts                  # AuthUser, LoginCredentials, RegisterCredentials, AuthSession
    utils/
      format.ts                 # formatCurrency, formatDate, formatDateTime,
                                #   formatNumber, parseApiDate, isSameLocalDay,
                                #   getBrowserTimezone, todayIsoDate
    utils.ts                    # cn() (clsx + tailwind-merge)

  .env.example                  # plantilla — copiar a .env.local en dev
```

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
      AuthController.php          # login/register/google/me/logout
      CuentaController.php
      ConceptoController.php
      MovimientoController.php    # store/update/destroy con regla "día actual"
      TipoCuentaController.php
      TipoMovimientoController.php
      BalanceController.php
      UserController.php
    Models/
      UserModel.php
      CuentaModel.php
      ConceptoModel.php
      MovimientoModel.php
      TipoCuentaModel.php
      TipoMovimientoModel.php
      Concerns/
        SerializesDatesAsIso.php  # trait: JSON con Y-m-d\TH:i:s.u\Z (UTC)
  database/migrations/            # ver Docs/entidades.md
  routes/
    api.php                       # registra los grupos
    auth/AuthRouter.php
    cuentas/CuentasRouter.php
    conceptos/ConceptosRouter.php
    movimientos/MovimientosRouter.php
    tipo_movimiento/TiposMovimientoRouter.php
    users/UsersRouter.php
    balance/BalanceRouter.php
  config/services.php             # Google OAuth keys
  .env.example
```

Nota: los modelos usan sufijo `...Model.php` y NO el default Eloquent
(`User.php`). Mantener esa convención al agregar entidades.

## LLM Service (detalle)

```
llm-service/
  main.py                         # FastAPI app + POST /api/analyze;
                                  #   Pydantic AnalyzeRequest/AnalysisResponse,
                                  #   header X-Client-Timezone
  app/
    core/config.py                # Settings (Pydantic) — env_file=.env;
                                  #   valida OPENAI_API_KEY, ALLOWED_ORIGINS,
                                  #   STATEMENT_TIMEOUT_MS, MAX_ROWS_PER_QUERY
    services/
      semantic.py                 # planner (prompt → spec de widgets)
      sql_gen.py                  # spec → SQL con :uid/:today/:tz
      sql_validator.py            # post-validación con sqlglot
      database.py                 # execute_query con bindings, READ ONLY,
                                  #   statement_timeout, schema cacheado
      analyst.py                  # resumen ejecutivo
      llm/                        # adapters (openai / ollama) + factory
    utils/json_helper.py
  check_db.py                     # script utilitario
  requirements.txt                # incluye sqlglot
  .env                            # OPENAI_API_KEY, OLLAMA_*, DB_*, PORT,
                                  #   ALLOWED_ORIGINS, STATEMENT_TIMEOUT_MS
```

## Archivos que NO deben estar en el repo
- `frontend/.env.local`, `backend/.env`, `llm-service/.env` (configuración local con secrets).
- `frontend/.next/`, `frontend/node_modules/`, `backend/vendor/`,
  `llm-service/venv/`, `__pycache__/`.

Verificá que cualquier nuevo archivo de config sensible esté gitignored
antes de stagear.
