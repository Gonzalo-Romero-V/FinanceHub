# FinanceHub — Frontend (Next.js)

UI del dashboard financiero. Se comunica directamente con el Backend (Laravel) y el LLM Service (FastAPI) usando las URLs definidas en `.env`.

## Arranque

```powershell
npm install
cp .env.example .env
npm run dev
# → http://localhost:3000
```

## Exposición pública

El frontend es el único servicio que se expone al exterior, via Cloudflare Tunnel:

```powershell
# En una terminal separada (mientras `npm run dev` corre):
cloudflared tunnel --url http://localhost:3000
```

## Variables de entorno

| Variable                        | Descripción                  |
|---------------------------------|------------------------------|
| `NEXT_PUBLIC_API_URL`           | URL base del Backend Laravel |
| `NEXT_PUBLIC_LLM_API_BASE_URL`  | URL base del LLM Service     |

Estas variables no tienen fallback en el código — si no existen, las llamadas fallan con error visible.

## Scripts

```powershell
npm run dev    # servidor de desarrollo
npm run build  # build de producción
npm run start  # sirve el build de producción
npm run lint   # ESLint
```
