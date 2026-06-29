# FinanceHub

FinanceHub es un sistema de dashboard financiero personal con un asistente
basado en Lenguaje Natural (NL2SQL). El stack tiene tres servicios independientes:

1. **Frontend**: Next.js (App Router) — sirve la UI y proxea OAuth.
2. **Backend**: Laravel — API REST y persistencia.
3. **LLM Service**: FastAPI — interpretación de prompts y generación de widgets.

### Arquitectura de red

**Solo el Frontend se expone al exterior** via Cloudflare Tunnel.
Backend y LLM Service corren estrictamente en local y nunca reciben tráfico externo directamente.

```
Internet
   │
   ▼  (Cloudflare Tunnel)
Frontend :3000  ──────── llama directamente desde el browser ──────►  Backend  :8000
                                                                  └──►  LLM Svc :8001
                                                                            │
                                                                       PostgreSQL :5432
```

---

## Quick Start (desarrollo local)

Cada servicio se ejecuta en su propia terminal. Toda la configuración por defecto
apunta a `localhost`; no necesitas tocar dominios ni DNS.

### 1. Backend (Laravel) — `http://localhost:8000`

```powershell
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
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

```powershell
cd frontend
npm install
cp .env.example .env        # o .env.local — ambos son válidos en Next.js
npm run dev
```

Las variables que lee el frontend están en `frontend/.env.example`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_LLM_API_BASE_URL=http://localhost:8001
```

> **Importante**: estas variables no tienen fallback en el código.
> Si `.env` no existe, las URLs quedan vacías y las llamadas fallan.

### 4. Exposición pública con Cloudflare Tunnel

El frontend corre en local y se expone al exterior con `cloudflared`:

```powershell
# Tunnel rápido (URL aleatoria, ideal para desarrollo/demo)
cloudflared tunnel --url http://localhost:3000
# Cloudflare imprime algo como: https://abc-xyz.trycloudflare.com

# Tunnel con nombre fijo (producción)
cloudflared tunnel run <nombre-del-tunnel>
```

Backend y LLM Service **no necesitan tunnel** — el browser los llama
directamente usando las URLs de `.env` (que en local son `localhost`).

---

## Estructura del Frontend

```
frontend/
  app/
    layout.tsx                       # root layout (AuthProvider)
    page.tsx                         # redirige a /home
    (public)/                        # rutas públicas
      layout.tsx                     # usa <HeaderPublic /> + <Footer />
      home/, tutorial/, login/
    (user)/                          # rutas autenticadas (rol "user")
      layout.tsx                     # usa <HeaderUser /> + <AuthGate />
      dashboard/, movimientos/, cuentas/, conceptos/, help/
    auth/callback/                   # callback de OAuth

  components/
    layout/
      header-shell.tsx               # base reusable (logo + nav + cluster)
      aside-shell.tsx                # base mobile (overlay + slide-in)
      header-public.tsx, aside-public.tsx
      header-user.tsx,   aside-user.tsx
      nav-links.ts                   # publicNavLinks, userNavLinks
      footer.tsx, logo.tsx
    custom/
      page-shell.tsx                 # max-w + padding consistente
      page-header.tsx                # título + descripción + acción
      page-state.tsx                 # <PageLoading />, <PageError />
      data-table.tsx                 # tabla genérica con filtros y acciones
      balance-general.tsx
    forms/                           # modales de creación/edición
    auth/auth-gate.tsx               # gating de rutas privadas
    charts/                          # widgets del dashboard AI
    ui/                              # primitivos shadcn

  lib/
    api/
      client.ts                      # apiFetch + getApiBaseUrl
      cuentas.ts, conceptos.ts, movimientos.ts
    auth/
      api.ts, context.tsx, storage.ts, types.ts
    utils/
      format.ts                      # formatCurrency, formatDate, ...
    utils.ts                         # cn()
```

### Convenciones

- **Componentes por rol**: `header-{rol}.tsx`, `aside-{rol}.tsx`. Para agregar
  un rol nuevo, exporta un `xxxNavLinks` en `nav-links.ts` y compón con
  `HeaderShell` + `AsideShell`. No hay `if (role === ...)` repartidos en
  componentes grandes.
- **Tipografía**: las utilities `.h1`, `.h2`, `.h3`, `.body`, `.small`, `.xs`
  están definidas en `app/globals.css` con sus tokens en `@theme`. Los
  componentes consumen estas clases en vez de declarar `text-Xxl font-Y` a mano.
- **Colores**: tokens semánticos (`brand-1`, `chart-1..8`, `destructive`, etc.)
  declarados como vars CSS, también en `globals.css`.
- **Fetch**: las páginas no llaman `fetch()` directo. Usan los módulos
  `lib/api/*` que consumen `apiFetch` (incluye token, base URL y manejo de
  errores con `ApiError`).

---

## Cambio de entorno (local → producción)

Todo está parametrizado via `.env`. Para apuntar a un dominio de producción:

| Archivo                  | Variable                        | Valor en producción           |
|--------------------------|---------------------------------|-------------------------------|
| `frontend/.env`          | `NEXT_PUBLIC_API_URL`           | `https://api.tudominio.com/api` |
| `frontend/.env`          | `NEXT_PUBLIC_LLM_API_BASE_URL`  | `https://llm.tudominio.com`   |
| `backend/.env`           | `APP_URL`                       | `https://api.tudominio.com`   |
| `backend/.env`           | `FRONTEND_URL`                  | `https://tudominio.com`       |
| `backend/.env`           | `SANCTUM_STATEFUL_DOMAINS`      | `tudominio.com`               |
| `backend/.env`           | `GOOGLE_REDIRECT`               | `https://api.tudominio.com/api/login/google/callback` |
| `llm-service/.env`       | `ALLOWED_ORIGINS`               | `https://tudominio.com`       |

No se requiere ningún cambio de código.
