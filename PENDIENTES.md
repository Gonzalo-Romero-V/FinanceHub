# Pendientes - FinanceHub

## Dashboard AI (LLM Service + Frontend Charts)
- [x] **Refactor de Diseño**: Mejora estética de widgets (bordes, sombras, tipografía).
- [x] **Consistencia de Datos**: Implementar normalización de tipos (string a number) para evitar fallos en Recharts.
- [x] **Visualización**: Corregir errores de dimensionamiento (`width -1`) mediante hidratación segura y contenedores estables.
- [x] **Metadatos de Widgets**: Separar `title` (breve) de `description` (detalle SQL/Goal).
- [x] **UX de Análisis**: Implementar Popover para descripciones largas en lugar de títulos truncados.
- [x] **Proporciones**: Cálculo automático de porcentaje de share en Tooltips de todos los gráficos (Pie, Bar, Line).
- [ ] **Persistencia de Dashboard**: Guardar la configuración de widgets preferidos por el usuario.
- [ ] **Exportación**: Botón para descargar reporte de análisis en PDF o CSV.

## Backend (Laravel)
- [x] Migraciones base y seeders.
- [x] CRUD de Cuentas y Movimientos.
- [x] Lógica de Balances.
- [x] Implementar sistema de presupuestos (diario/semanal/mensual/anual) con alertas por umbral.
- [ ] Reportes avanzados de flujo de caja.

## Frontend (Next.js)
- [x] Layout principal y navegación.
- [x] Formuarios de creación de movimientos.
- [x] Integración con LLM Service.
- [ ] Página de configuración de perfil.
- [ ] Vista detallada de transacciones con filtros avanzados.
