# Contratos

## Backend (Laravel) — base `http://localhost:8000/api`

### Headers automáticos
Todas las requests del frontend incluyen:
- `Authorization: Bearer <token>` cuando hay sesión.
- `Accept: application/json`.
- `X-Client-Timezone: <IANA>` (ej. `America/Guayaquil`). Lo usa el backend
  para aplicar reglas día-local (p.ej. "solo editar movimientos de hoy").
  Default `UTC` si el header no llega o es inválido.

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

| Método | Path | Body | 200 / Errores |
|---|---|---|---|
| GET | `/movimientos` | — | `{data:Movimiento[]}` (con `concepto`, `cuenta_origen`, `cuenta_destino` anidados, ordenado por `fecha desc`) |
| GET | `/movimientos/{id}` | — | `{data:Movimiento}` |
| POST | `/movimientos` | `{monto, concepto_id, cuenta_origen_id?, cuenta_destino_id?, nota?}` | `{data:Movimiento}` con `fecha = now()` UTC. **El campo `fecha` enviado por el cliente se ignora.** |
| PATCH | `/movimientos/{id}` | `{monto?, concepto_id?, cuenta_origen_id?, cuenta_destino_id?, nota?}` | 200 ok; **403 si la `fecha` del movimiento NO cae en el día actual del cliente** (TZ del header). El campo `fecha` no es editable. |
| DELETE | `/movimientos/{id}` | — | 200; **403 si la `fecha` no es de hoy en TZ del cliente.** |

Notas:
- `fecha` es inmutable después de crear. Eloquent no la auto-actualiza
  (`$timestamps = false` en `MovimientoModel`).
- El controller usa `CarbonImmutable::parse($mov->fecha, 'UTC')->setTimezone($tz)`
  para comparar el día calendario.

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

Headers:
- `Content-Type: application/json`
- `X-Client-Timezone: <IANA>` (ej. `America/Guayaquil`). Igual que el backend
  Laravel. Default `UTC` si falta o es inválida. Validada contra
  `zoneinfo.ZoneInfo` (lanza warning y cae a UTC si no existe).

Request (Pydantic):
```json
{
  "prompt": "Muéstrame el gasto mensual en supermercado",
  "user_id": 42
}
```

Response 200 (Pydantic `AnalysisResponse`):
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

### Guardrails

**Multi-usuario** (defensa en profundidad):
1. El prompt al LLM exige usar el placeholder `:uid` para todo filtro por
   usuario; nunca interpolar literales.
2. `SqlValidator` (post-generación, basado en `sqlglot`):
   - Acepta sólo un `SELECT` (o `WITH ... SELECT`) por respuesta.
   - Rechaza `INSERT/UPDATE/DELETE/DROP/ALTER/TRUNCATE/GRANT/REVOKE/COPY/INTO`,
     `pg_*`, `current_user`, `current_setting`.
   - Acepta sólo placeholders `:uid`, `:today`, `:tz`.
   - Acepta sólo tablas en la whitelist (`movimientos`, `cuentas`, `conceptos`,
     `tipos_movimiento`, `tipos_cuenta`).
   - Para cada tabla user-scoped en el FROM/JOIN exige un filtro
     `<alias>.user_id = :uid`. `movimientos` se permite sólo si una tabla
     puente (`cuentas` o `conceptos`) filtrada ya está unida.

**Ejecución**:
- Transacción `READ ONLY`.
- `SET LOCAL statement_timeout = STATEMENT_TIMEOUT_MS` (default 5 s).
- Parámetros bindeados (`:uid`, `:today`, `:tz`), nunca interpolación.
- Resultados truncados a `MAX_ROWS_PER_QUERY` (default 500).

**Consistencia temporal**:
- `today_iso` y `tz` se calculan a partir del header `X-Client-Timezone`.
- El SQL convierte `fecha` UTC al día del cliente vía
  `((m.fecha AT TIME ZONE 'UTC') AT TIME ZONE :tz)::date`.
- "Hoy", "ayer", "este mes" se interpretan en la TZ del usuario, no en UTC.

**CORS**: leído de `ALLOWED_ORIGINS` (CSV; default `http://localhost:3000`).

---

## Tipos compartidos (frontend)

Definidos en `lib/api/{cuentas,conceptos,movimientos}.ts` y
`lib/auth/types.ts`. Cuando agregues campos a un modelo del backend,
actualizá también la interface TS correspondiente.
