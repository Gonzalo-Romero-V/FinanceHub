# FinanceHub

FinanceHub es un dashboard financiero personal con asistente de lenguaje natural (NL2SQL).
El stack tiene tres servicios independientes:

1. **Frontend**: Next.js (App Router) — UI y reverse proxy hacia los servicios internos.
2. **Backend**: Laravel — API REST y persistencia.
3. **LLM Service**: FastAPI — interpretación de prompts y generación de widgets.

---

## Arquitectura de red

**Solo el Frontend se expone al exterior** via Cloudflare Tunnel.
Backend y LLM Service corren estrictamente en local; el browser **nunca los llama directamente**.
Todo el tráfico hacia esos servicios pasa a través de los rewrites server-side de Next.js.

```
Internet
   │
   ▼  (Cloudflare Tunnel → https://financehub.cc)
Frontend :3000
   │
   ├── /api/*      ──(rewrite server-side)──► Backend  :8000
   └── /llm-api/*  ──(rewrite server-side)──► LLM Svc :8001
                                                   │
                                              PostgreSQL :5432
```

### Por qué rutas relativas en el browser

El código cliente construye URLs relativas (`/api/...`, `/llm-api/...`).
El browser las resuelve contra el mismo origen (`https://financehub.cc`),
y Next.js las intercepta server-side antes de que salgan hacia internet,
redirigiendo al servicio interno correspondiente.

Si el cliente usara URLs absolutas (`https://financehub.cc/api/...`), Next.js
las reescribiría a sí mismo, creando un loop infinito a través del tunnel.

---

## Variables de entorno del Frontend

Hay dos grupos con responsabilidades distintas:

| Variable | Prefijo | Valor | Usado por |
|---|---|---|---|
| `BACKEND_URL` | — (privada) | `http://localhost:8000` | `next.config.ts` (destino del rewrite) |
| `LLM_URL` | — (privada) | `http://localhost:8001` | `next.config.ts` (destino del rewrite) |
| `NEXT_PUBLIC_API_URL` | `NEXT_PUBLIC_` | `/api` | `lib/api/client.ts` en el browser |
| `NEXT_PUBLIC_LLM_API_BASE_URL` | `NEXT_PUBLIC_` | `/llm-api` | `lib/api/llm.ts` en el browser |

`BACKEND_URL` y `LLM_URL` son siempre `localhost` — no cambian entre entornos porque el backend
nunca se expone directamente. Lo que cambia entre local y producción son las variables del **Backend**.

---

## Arranque de servicios

Cada servicio corre en su propia terminal.

### 1. Backend (Laravel) — `http://localhost:8000`

```powershell
cd backend
composer install
cp .env.example .env        # ajustar credenciales DB, Google OAuth, etc.
php artisan key:generate
php artisan migrate --seed
php artisan config:clear    # limpiar caché si se cambia .env
php artisan serve --host=127.0.0.1 --port=8000
```

### 2. LLM Service (FastAPI) — `http://localhost:8001`

```powershell
cd llm-service
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### 3. Frontend (Next.js) — `http://localhost:3000`

**Desarrollo** (hot-reload, sin compilar — no usar con tunnel público):

```powershell
cd frontend
npm install
cp .env.example .env
npm run dev
```

**Producción** (compilado — recomendado para Cloudflare Tunnel):

```powershell
cd frontend
npm install
cp .env.example .env
npm run build       # compila la app (~1-2 min)
npm start           # sirve el compilado en :3000
```

> Si modificas `frontend/.env` o `frontend/next.config.ts`, debes volver a
> ejecutar `npm run build` y reiniciar `npm start`. Los cambios de env **no**
> se aplican en caliente.

### 4. Cloudflare Tunnel — `https://financehub.cc`

Expone únicamente el frontend. Arrancar **después** de que `npm start` (o `npm run dev`) esté levantado:

```powershell
cloudflared tunnel run <nombre-del-tunnel>
```

`frontend/.env.example` tiene los valores correctos para local (y para producción con Cloudflare Tunnel):

```env
BACKEND_URL=http://localhost:8000
LLM_URL=http://localhost:8001
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_LLM_API_BASE_URL=/llm-api
```

Estos valores **no cambian** entre local y producción — el backend siempre es `localhost` porque nunca se expone directamente.

Solo se tuneliza el frontend (puerto 3000). Backend y LLM Service no necesitan tunnel.

---

## Cambio de entorno (local → producción)

Las variables del **frontend nunca cambian** — siempre apuntan a localhost internamente.
Lo que se ajusta al pasar a producción son las variables del **backend**:

| Archivo | Variable | Valor local | Valor producción |
|---|---|---|---|
| `backend/.env` | `APP_URL` | `http://localhost:8000` | `https://financehub.cc` |
| `backend/.env` | `FRONTEND_URL` | `http://localhost:3000` | `https://financehub.cc` |
| `backend/.env` | `SESSION_DOMAIN` | `null` | `financehub.cc` |
| `backend/.env` | `SANCTUM_STATEFUL_DOMAINS` | `localhost:3000,localhost,127.0.0.1` | `financehub.cc` |
| `backend/.env` | `GOOGLE_REDIRECT` | `http://localhost:8000/api/login/google/callback` | `https://financehub.cc/api/login/google/callback` |
| `llm-service/.env` | `ALLOWED_ORIGINS` | `http://localhost:3000` | `https://financehub.cc` |

No se requiere ningún cambio de código ni en las variables del frontend.

---

## Google OAuth — flujo completo

```
1. Browser      →  GET /api/login/google          (ruta relativa)
2. Next.js      →  rewrite → localhost:8000/api/login/google
3. Laravel      →  redirect 302 → accounts.google.com/o/oauth2/...
4. Google       →  (autenticación del usuario)
5. Google       →  redirect → https://financehub.cc/api/login/google/callback
6. Next.js      →  rewrite → localhost:8000/api/login/google/callback
7. Laravel      →  crea token → redirect → https://financehub.cc/auth/callback?token=...
8. Browser      →  /auth/callback guarda el token y redirige al dashboard
```

La URL de callback registrada en Google Console debe ser:
`https://financehub.cc/api/login/google/callback`

---

## Estructura del Frontend

```
frontend/
  next.config.ts                       # rewrites: /api/* → BACKEND_URL, /llm-api/* → LLM_URL
  app/
    layout.tsx                         # root layout (AuthProvider)
    page.tsx                           # redirige a /home
    (public)/                          # rutas públicas
      layout.tsx
      home/, tutorial/, login/
    (user)/                            # rutas autenticadas (rol "user")
      layout.tsx                       # AuthGate
      dashboard/, movimientos/, cuentas/, conceptos/, perfil/, help/
    auth/callback/                     # receptor del token OAuth

  components/
    layout/
      header-shell.tsx                 # base reusable (logo + nav + cluster)
      aside-shell.tsx                  # base mobile (overlay + slide-in)
      header-public.tsx, aside-public.tsx
      header-user.tsx,   aside-user.tsx
      nav-links.ts                     # publicNavLinks, userNavLinks
      footer.tsx, logo.tsx
    custom/
      page-shell.tsx                   # max-w + padding consistente
      page-header.tsx                  # título + descripción + acción
      page-state.tsx                   # <PageLoading />, <PageError />
      data-table.tsx                   # tabla genérica con filtros y acciones (onView/onEdit/onDelete/onReconciliar)
      balance-general.tsx              # card de patrimonio total (activos − pasivos)
      historial-balance.tsx            # curva histórica de saldo con filtro por cuenta/general
    forms/                             # modales: CuentaForm, ConceptoForm, MovimientoForm, ReconciliacionModal, etc.
    charts/                            # widgets del dashboard AI
    ui/                                # primitivos shadcn

  lib/
    api/
      client.ts                        # apiFetch + getApiBaseUrl (usa NEXT_PUBLIC_API_URL)
      llm.ts                           # analyzeRequest (usa NEXT_PUBLIC_LLM_API_BASE_URL)
      cuentas.ts, conceptos.ts, movimientos.ts, users.ts
      reconciliaciones.ts, user-settings.ts
    auth/
      api.ts, context.tsx, storage.ts, types.ts
    utils/
      format.ts                        # formatCurrency, formatDate, ...
    utils.ts                           # cn()
```

### Convenciones

- **Componentes por rol**: `header-{rol}.tsx`, `aside-{rol}.tsx`. Para agregar un rol nuevo,
  exporta `xxxNavLinks` en `nav-links.ts` y compón con `HeaderShell` + `AsideShell`.
- **Fetch**: las páginas no llaman `fetch()` directo. Usan los módulos `lib/api/*`
  que consumen `apiFetch` (token, base URL y `ApiError` unificados).
- **Tipografía y colores**: utilities `.h1`–`.h3`, `.body`, `.small`, `.xs` y tokens
  semánticos (`brand-1`, `chart-1..8`, etc.) declarados en `app/globals.css`.
