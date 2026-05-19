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
| fecha | timestamp default now | |

⚠️ La tabla `movimientos` NO tiene `user_id` directo. La pertenencia al usuario
se deduce vía `concepto.user_id` (o `cuenta_*.user_id`). Está en `PENDIENTES.md`
agregar `NOT NULL` en origen/destino según corresponda.

## Relaciones (resumen)

```
users 1───* cuentas
users 1───* conceptos
tipos_cuenta 1───* cuentas
tipos_movimiento 1───* conceptos
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
