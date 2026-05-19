# Alcance actual

## Implementado ✅

### Autenticación
- Login y registro por email + contraseña (Laravel Sanctum, tokens bearer).
- Login con Google OAuth (Socialite + flujo stateless con redirect a
  `/auth/callback?token=...` en el frontend).
- Sesión persistida en `localStorage` + cookie (`auth_token`).
- `AuthGate` que redirige a `/login?redirect=...` cuando falta sesión.

### CRUD del usuario
- **Cuentas**: crear, listar (separado por tipo Activo/Pasivo), editar, borrar.
  Saldo inicial sólo se setea al crear; después se modifica vía movimientos.
- **Conceptos**: crear/editar/borrar; agrupados por tipo de movimiento.
- **Movimientos**:
  - **Registrar**: wizard de 5 pasos (`tipo → concepto filtrado por tipo →
    cuenta(s) según tipo → monto/descripción → resumen`).
  - **Editar**: form plano con la misma cascada Tipo → Concepto → Cuentas; el
    selector de Tipo es un combobox editable y al cambiarlo limpia concepto y
    cuentas para forzar re-elección coherente. Validación: la cuenta del lado
    correspondiente es requerida; en Transferencia origen y destino deben ser
    distintas.
  - **Ver detalles**: modal de solo lectura (`MovimientoDetailModal`) con
    monto destacado, concepto, cuenta(s), fecha y hora en TZ local, descripción
    e ID.
  - **Tabla**: columnas visibles `ID · Descripción · Concepto · Monto · Tipo ·
    Cuenta`. La columna `Fecha` ya no es visible pero sigue presente en cada
    row para el filtro de rango y las reglas día-actual.
  - **Acciones por fila**: 👁️ ver (siempre) · ✏️ editar (deshabilitada con
    tooltip si la fila no es de hoy) · 🗑️ eliminar (idem).
- **Balance**: `BalanceGeneral` muestra activos – pasivos.
- **Perfil** (`/perfil`): el usuario edita su `name`, `email` y, opcionalmente,
  setea/cambia `password` (mín. 6 caracteres). Acceso desde el cluster GR del
  header y desde el aside mobile. Consume `PATCH /api/users/{id}` con
  autorización `auth()->id() === user.id`. Tras guardar, llama
  `refreshSession()` para reflejar los cambios en el contexto.

### Dashboard AI
- Prompt + selector de modo (`auto` / `replace` / `append`).
- Llama a `POST /api/analyze` del LLM service.
- Renderiza widgets devueltos: KPI, tabla, line / bar / pie chart.
- Cierre/eliminación de widgets individual.

### Layout
- Header + aside por rol (`HeaderPublic`/`HeaderUser`, `AsidePublic`/`AsideUser`).
- Aside mobile con portal + slide-in.
- Tema claro/oscuro vía tokens CSS (`oklch`). Toggle todavía NO implementado.

## NO implementado / pendiente ❌

(Mantengo esto sincronizado con `PENDIENTES.md` que tiene la lista canónica.)

### Funcional
- Toggle dark/light en UI.
- Sección de configuración / personalización de cuenta avanzada
  (más allá de los 3 campos básicos del perfil).
- Reportes exportables.
- Comandos de voz (NL2API por voz).
- `NOT NULL` en `cuenta_origen_id`/`cuenta_destino_id` según tipo de movimiento
  (validación de dominio).
- Backups periódicos de DB.

### Reglas de negocio: fecha/hora de movimientos (implementadas)
- La `fecha` de un movimiento la dicta el **servidor** al crear (`now()` en UTC).
  El cliente no puede setear ni modificar `fecha`.
- Una vez creada, `fecha` es **inmutable** (no se reescribe en updates).
- Sólo se pueden **editar/eliminar movimientos del día actual** del cliente.
  La regla se aplica en backend (403) y en frontend (botones deshabilitados con
  tooltip). El día del cliente se determina vía header `X-Client-Timezone` (IANA)
  que envía automáticamente `apiFetch`.

### Multiusuario LLM
- El LLM service todavía no filtra estrictamente por `user_id` en todas las
  queries generadas. Hay que reforzar el guardrail para que ningún SQL emitido
  pueda leer datos de otro usuario.

### Operacional
- Variables de entorno de producción / dominio fijo / Cloudflare.
- Despliegue real (todo el flujo de producción se pospuso, ver `Docs/objetivo.md`
  y README raíz sección "Despliegue (TBD)").
