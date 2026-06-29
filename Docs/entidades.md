# Entidades (DB schema)

Base de datos: **PostgreSQL** `financehub`. Las migraciones canónicas viven en
`backend/database/migrations/`.

## users
| Columna | Tipo | Notas |
|---|---|---|
| id | bigserial PK | |
| name | string | |
| email | string unique | |
| email_verified_at | timestamp nullable | |
| password | string nullable | Null cuando el usuario entró por OAuth. |
| provider | string nullable | `google`, etc. |
| provider_id | string nullable | id del proveedor OAuth. |
| role | enum('admin','user') | default `user`. |
| remember_token | string | |
| timestamps | created_at / updated_at | |

Índice: `(provider, provider_id)`.

## tipos_cuenta
| Columna | Tipo |
|---|---|
| id | bigserial PK |
| nombre | string(50) unique |

Valores semilla típicos: `Activo`, `Pasivo`.

## tipos_movimiento
| Columna | Tipo |
|---|---|
| id | bigserial PK |
| nombre | string(100) unique |

Valores semilla típicos: `Ingreso`, `Egreso`, `Transferencia`.

## cuentas
| Columna | Tipo | Notas |
|---|---|---|
| id | bigserial PK | |
| nombre | string(100) | |
| tipo_cuenta_id | bigint FK → tipos_cuenta.id | |
| saldo | decimal(14) default 0 | saldo corriente, lo actualizan movimientos. |
| saldo_inicial | decimal(14,2) default 0 | snapshot de auditoría. |
| activa | bool default true | |
| fecha_creacion | timestamp default now | |
| user_id | bigint FK → users.id | |

## conceptos
| Columna | Tipo | Notas |
|---|---|---|
| id | bigserial PK | |
| nombre | string | |
| tipo_movimiento_id | bigint FK → tipos_movimiento.id | clasifica el concepto. |
| user_id | bigint FK → users.id | |

## movimientos
| Columna | Tipo | Notas |
|---|---|---|
| id | bigserial PK | |
| monto | decimal(14) | siempre positivo; el signo lo da `tipo_movimiento`. |
| cuenta_origen_id | bigint FK nullable | requerida para Egreso/Transferencia. |
| cuenta_destino_id | bigint FK nullable | requerida para Ingreso/Transferencia. |
| concepto_id | bigint FK → conceptos.id | de aquí se infiere el `tipo_movimiento`. |
| nota | string nullable | |
| fecha | timestamp | UTC. Se setea en backend con `now()` al crear. **Inmutable**: no se modifica en updates. Ver `Docs/contratos.md` para la regla "solo editar movimientos del día actual". |

⚠️ La tabla `movimientos` NO tiene `user_id` directo. La pertenencia al usuario
se deduce vía `concepto.user_id` (o `cuenta_*.user_id`). Está en `PENDIENTES.md`
agregar `NOT NULL` en origen/destino según corresponda.

## Relaciones (resumen)

```
users 1───* cuentas
users 1───* conceptos
tipos_cuenta 1───* cuentas
tipos_movimiento 1───* conceptos
conceptos 0..1──* conceptos (parent_id — auto-referencial, max 2 niveles)
conceptos 1───* movimientos
cuentas 1───* movimientos (cuenta_origen_id)
cuentas 1───* movimientos (cuenta_destino_id)
```

## Reglas de dominio (validación viva en backend)
- Ingreso → `cuenta_destino_id` obligatoria, `cuenta_origen_id` null.
- Egreso → `cuenta_origen_id` obligatoria, `cuenta_destino_id` null.
- Transferencia → ambas obligatorias y distintas.
- `monto > 0` siempre.
- El `tipo_movimiento` se infiere del `concepto`, no se envía suelto.
- `movimientos.fecha` la dicta el servidor; el cliente no puede setearla.
- Sólo se pueden editar / eliminar movimientos cuya `fecha` esté en el día
  actual del cliente (TZ del header `X-Client-Timezone`).

---

## conceptos (columnas adicionales)
| Columna | Tipo | Notas |
|---|---|---|
| es_sistema | bool default false | Si true, el backend bloquea edición y eliminación. Lo usan los conceptos de ajuste de conciliación. |
| parent_id | bigint nullable FK → conceptos.id ON DELETE SET NULL | Null = concepto raíz. Máximo 2 niveles (raíz → hijo). |
| color | varchar(7) nullable | Color hex `#rrggbb`. Solo se guarda en conceptos raíz. Los hijos derivan su color del padre en el frontend (`parent.color + '80'`). |

**Reglas:**
- `parent_id` debe apuntar a un concepto raíz del mismo usuario (no puede anidar hijos de hijos).
- Los conceptos con `es_sistema=true` no pueden usarse como padres.
- El `tipo_movimiento_id` de un hijo se hereda del padre y no es editable desde el hijo.
- No se puede eliminar un concepto raíz si tiene hijos (`422`).
- Un concepto sin `color` se muestra en `#64748b` (slate) en la UI.

---

## reconciliaciones
| Columna | Tipo | Notas |
|---|---|---|
| id | bigserial PK | |
| cuenta_id | bigint FK → cuentas.id ON DELETE CASCADE | |
| user_id | bigint FK → users.id ON DELETE CASCADE | |
| saldo_real | decimal(14,2) | Lo que el usuario reporta como saldo real. |
| saldo_sistema | decimal(14,2) | Valor de `cuentas.saldo` en el momento de la reconciliación. |
| diferencia | decimal(14,2) | `saldo_real − saldo_sistema`. Positivo = faltaban ingresos; negativo = faltaban egresos. |
| movimiento_ajuste_id | bigint FK nullable → movimientos.id ON DELETE SET NULL | Movimiento de ajuste creado automáticamente, si el usuario eligió crear uno. |
| nota | string nullable | |
| fecha | timestamp (server-assigned) | |

Invariantes:
- `diferencia = saldo_real − saldo_sistema` (calculado en backend al crear).
- Los conceptos de ajuste usados son `es_sistema = true`, tipo Ingreso o Egreso según el signo.
- La curva histórica de balance se construye desde `movimientos + cuentas.saldo_inicial`; los movimientos de ajuste aparecen como correcciones en esa curva.

---

## user_settings
| Columna | Tipo | Notas |
|---|---|---|
| id | bigserial PK | |
| user_id | bigint FK → users.id (unique) | Un registro por usuario. |
| reconciliacion_tipo | string(20) default 'ninguno' | `ninguno` \| `semanal` \| `quincenal` \| `mensual` \| `personalizado` |
| reconciliacion_dia_semana | tinyint unsigned nullable | 1=lun … 7=dom. Aplica para tipo `semanal` y `quincenal`. |
| reconciliacion_dia_mes | tinyint unsigned nullable | 1–28, 0 = último día del mes. Aplica para tipo `mensual`. |
| reconciliacion_frecuencia_dias | int nullable | Solo para tipo `personalizado`: cada N días. |
| reconciliacion_proxima | date nullable | Calculada automáticamente según el tipo al guardar. |
| updated_at | timestamp nullable | |
