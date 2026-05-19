# Contratos

## Backend (Laravel) — base `http://localhost:8000/api`

Convención de respuesta:
```jsonc
// Recurso simple
{ "mensaje": "...", "data": { ... } }

// Colección
{ "data": [ ... ] }

// Error
{ "mensaje": "..." }  // o { "message": "..." }
```

El cliente del frontend (`lib/api/client.ts`) acepta ambas variantes
(`mensaje`/`message`).

### Auth (público)

| Método | Path | Body | 200 |
|---|---|---|---|
| POST | `/auth/login` | `{email, password}` | `{mensaje, data:User, token}` |
| POST | `/auth/register` | `{name, email, password}` | `{mensaje, data:User, token}` |
| GET | `/auth/google` | — | 302 → Google consent |
| GET | `/auth/google/callback` | (query de Google) | 302 → `FRONTEND_URL/auth/callback?token=...` |
| GET | `/login/google/callback` | (alias del anterior) | idem |

### Auth (Bearer)

| Método | Path | 200 |
|---|---|---|
| GET | `/auth/me` | `{mensaje, data:User}` |
| POST | `/auth/logout` | `{mensaje}` |

### Cuentas (Bearer)

| Método | Path | Body | 200 |
|---|---|---|---|
| GET | `/cuentas` | — | `{data:Cuenta[]}` |
| GET | `/cuentas/{id}` | — | `{data:Cuenta}` |
| POST | `/cuentas` | `{nombre, tipo_cuenta_id, saldo, activa}` | `{data:Cuenta}` |
| PATCH | `/cuentas/{id}` | `{nombre?, tipo_cuenta_id?, activa?}` | `{data:Cuenta}` |
| DELETE | `/cuentas/{id}` | — | 204 |
| GET | `/tipos-cuenta` | — | `{data:TipoCuenta[]}` |

### Conceptos (Bearer)

| Método | Path | Body | 200 |
|---|---|---|---|
| GET | `/conceptos` | — | `{data:Concepto[]}` (con `tipo_movimiento` anidado y `total_monto` agregado) |
| GET | `/conceptos/{id}` | — | `{data:Concepto}` |
| POST | `/conceptos` | `{nombre, tipo_movimiento_id}` | `{data:Concepto}` |
| PATCH | `/conceptos/{id}` | `{nombre?, tipo_movimiento_id?}` | `{data:Concepto}` |
| DELETE | `/conceptos/{id}` | — | 204 |
| GET | `/tipos-movimiento` | — | `{data:TipoMovimiento[]}` |
| GET | `/tipos-movimiento/{id}` | — | `{data:TipoMovimiento}` |

### Movimientos (Bearer)

| Método | Path | Body | 200 |
|---|---|---|---|
| GET | `/movimientos` | — | `{data:Movimiento[]}` (con `concepto`, `cuenta_origen`, `cuenta_destino` anidados) |
| GET | `/movimientos/{id}` | — | `{data:Movimiento}` |
| POST | `/movimientos` | `{monto, concepto_id, cuenta_origen_id?, cuenta_destino_id?, nota?, fecha?}` | `{data:Movimiento}` |
| PATCH | `/movimientos/{id}` | `{...partial}` | `{data:Movimiento}` |
| DELETE | `/movimientos/{id}` | — | 204 |

### Balance (Bearer)

| Método | Path | 200 |
|---|---|---|
| GET | `/balance` | `{data:{...}}` |

### Users (Bearer)

| Método | Path | Autorización | Body | 200 |
|---|---|---|---|---|
| GET | `/users` | solo admin | — | `{mensaje, data:User[]}` |
| GET | `/users/{id}` | self o admin | — | `{mensaje, data:User}` |
| PATCH | `/users/{id}` | self o admin | `{name?, email?, password?}` | `{mensaje, data:User}` |
| DELETE | `/users/{id}` | solo admin | — | `{mensaje}` |

Notas:
- `PATCH /users/{id}` valida `name|string|max:100`, `email|email`,
  `password|string|min:6` (todos `sometimes`).
- El campo `password` se bcrypta automáticamente en el modelo
  (`setPasswordAttribute`).
- Si `auth()->id() !== id` y el usuario no es admin → 403.

---

## LLM Service (FastAPI) — base `http://localhost:8001`

### POST `/api/analyze`

Request:
```json
{
  "prompt": "Muéstrame el gasto mensual en supermercado",
  "user_id": 42
}
```

Response 200:
```json
{
  "intent": "Muéstrame el gasto mensual en supermercado",
  "dashboard_title": "Análisis Financiero",
  "summary": "...",
  "mode": "replace" | "append" | "update",
  "widgets": [
    {
      "id": "uuid",
      "type": "kpi" | "table" | "bar" | "line" | "pie",
      "title": "...",
      "data": [ ... ],
      "raw_total_records": 0,
      "metric": 0,         // sólo para type=kpi
      "sql": "..."         // sólo si DEBUG=true
    }
  ]
}
```

Notas:
- Sin autenticación. El `user_id` viaja en el payload — confiar/validar
  todavía es un gap (ver `alcance.md`).
- CORS abierto (`*`). En prod hay que restringir.

---

## Tipos compartidos (frontend)

Definidos en `lib/api/{cuentas,conceptos,movimientos}.ts` y
`lib/auth/types.ts`. Cuando agregues campos a un modelo del backend,
actualizá también la interface TS correspondiente.
