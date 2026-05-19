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
- Llama al LLM service directo en `POST /api/analyze` (sin token; el LLM
  recibe `user_id` por payload — este es uno de los gaps de seguridad de la
  versión actual, ver `alcance.md`).
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
- Recibe `{prompt, user_id}`, devuelve `{widgets[], summary, mode, ...}`.
- Pipeline interno:
  1. **Semantic** (`semantic_service.design_dashboard`): planifica qué widgets
     responder al prompt.
  2. **SQL Gen** (`sql_gen_service.generate_sql_for_widget`): genera SQL por
     widget basándose en el schema y el `user_id`.
  3. **DB** (`db_service.execute_query`): ejecuta SQL (read-only).
  4. **Analyst** (`analyst_service.generate_executive_summary`): genera el
     resumen ejecutivo a partir de los resultados.
- CORS abierto (`allow_origins=["*"]`) — solo aceptable en dev.

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
1. Frontend (Dashboard) `POST {LLM}/api/analyze` con `{prompt, user_id}`.
2. LLM service ejecuta pipeline y devuelve `AnalysisResponse`.
3. Frontend aplica `mode` (auto/replace/append/update) sobre los widgets actuales.
