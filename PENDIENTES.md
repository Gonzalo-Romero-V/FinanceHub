# Pendientes

> Leyenda: `[x]` hecho · `[~]` parcial · `[ ]` pendiente.
> Última revisión del estado: 2026-05-19.

---

- [~] **Aplicar NOT NULL en `cuenta_origen_id` / `cuenta_destino_id` en movimientos.**
  La regla se aplica a nivel **aplicación**: `MovimientoController` exige la
  cuenta correcta según el tipo (`Ingreso → destino`, `Egreso → origen`,
  `Transferencia → ambas y distintas`) tanto en `store` como en `update`, y el
  edit form en frontend bloquea el submit si falta. La migración de columna a
  `NOT NULL` con check constraint condicional queda pendiente.

# DESARROLLO

- [~] **Enfoque multiusuario en LLM Service.**
  Fase 1 implementada: `SqlValidator` con `sqlglot` rechaza SQL sin filtro
  `user_id = :uid` en tablas sensibles; ejecución con bindings, READ ONLY y
  statement_timeout; whitelist de tablas y placeholders; bloqueo de
  DML/DDL/funciones de sesión. Fase 2 pendiente: usuario PG separado +
  Row-Level Security para defensa a nivel base de datos.

- [x] **Modal móvil y desktop contenedor de forms.**
  `components/ui/modal.tsx` es responsive (Escape, backdrop, bloqueo de scroll,
  `persistent` durante async). Todos los forms y el confirm-delete lo usan.

- [x] **Carpeta y componentes de forms para ingreso/edición de datos.**
  `components/forms/` contiene `cuenta-form`, `concepto-form`,
  `movimiento-form` (wizard de 5 pasos), `movimiento-edit-form` (form plano
  con cascada Tipo → Concepto → Cuentas), `movimiento-detail-modal` y
  `confirm-delete-modal`.

- [~] **Sección de configuración y personalización de cuenta.**
  Página `/perfil` permite editar nombre, email y contraseña (mín. 6) vía
  `PATCH /api/users/{id}`. Muestra badge de proveedor (Google / contraseña).
  Falta "configuración avanzada" (preferencias, TZ explícita, etc.).

- [ ] **Reportes (exportables).**

- [ ] **Timeline chart por concepto.**
- [ ] **Histórico de balances.**

## Reglas de negocio de fechas (extra implementado)
- [x] `fecha` de un movimiento la dicta el **servidor** al crear (`now()` UTC).
- [x] `fecha` es **inmutable** (Eloquent ya no la reescribe en updates;
  `MovimientoModel: $timestamps = false`).
- [x] Solo se pueden **editar/eliminar movimientos del día actual** del cliente
  (header `X-Client-Timezone` → 403 en backend; botones deshabilitados con
  tooltip en frontend).
- [x] Serialización JSON con sufijo `Z` (trait `SerializesDatesAsIso`) para que
  el browser no interprete UTC como hora local.

# DESPLIEGUE

- [~] **Verificar variables de entorno.**
  `frontend/.env.example` documenta `NEXT_PUBLIC_API_URL` y
  `NEXT_PUBLIC_LLM_API_BASE_URL`. Backend tiene `APP_TIMEZONE=UTC` explícito.
  Falta documentar las del LLM service y un `.env.example` global para
  producción.

- [x] **Quitar código quemado y centralizar fetch en variables de entorno.**
  `lib/api/client.ts` expone `apiFetch` con `getApiBaseUrl()` y fallback
  `http://localhost:8000/api`. Ya no hay IPs LAN ni dominios hardcodeados en
  el código. Las páginas no llaman `fetch()` directo: pasan por los módulos
  `lib/api/{cuentas,conceptos,movimientos,users}.ts`.

- [ ] **Clonar y reproducir entorno en servidor.**
- [ ] **Conseguir dominio fijo y habilitar Cloudflare.**
- [ ] **Actualizar Secret ID y Client ID (OAuth).**

# MANTENIMIENTO Y MEJORA CONTINUA

- [ ] **Comandos de voz** en la app.
- [ ] **Voz a texto** para las consultas del dashboard.
- [ ] **Voz a texto** para registros (NL2API).
- [ ] **Backups periódicos** de la BD.
