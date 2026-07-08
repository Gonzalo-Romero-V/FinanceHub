# Entidades (DB schema)

Base de datos: **PostgreSQL** `financehub`. Las migraciones canónicas viven en
`backend/database/migrations/`.

## users
| Columna | Tipo | Notas |
|---|---|---|
| id | bigserial PK | |
| name | string | |
| email | string unique | |
| email_verified_at | timestamp nullable | **Bloqueante desde esta sesión**: login rechaza con 409 si es null (cuentas tradicionales). Cuentas Google se verifican solas al crearse. Cuentas ya existentes antes de esta funcionalidad quedaron confirmadas retroactivamente por una migración de backfill. |
| password | string nullable | Null cuando el usuario entró por OAuth. |
| provider | string nullable | `google`, etc. |
| provider_id | string nullable | id del proveedor OAuth. |
| role | enum('admin','user') | default `user`. |
| remember_token | string | |
| timestamps | created_at / updated_at | |

Índice: `(provider, provider_id)`.

`has_password: bool` es un atributo calculado (no columna) expuesto en el
JSON — cierto si `password` no es null. Puede ser `true` en una cuenta
Google que además configuró login híbrido desde Perfil o vía
"olvidé mi contraseña". El frontend lo usa para saber si debe pedir
`current_password` al cambiar la contraseña.

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
se deduce vía `cuenta_origen.user_id`/`cuenta_destino.user_id` (todos los
controllers ya filtran así). **Importante**: al editar un movimiento, hay que
revalidar la ownership de los valores *nuevos* que vengan en el body
(`concepto_id`, `cuenta_origen_id`, `cuenta_destino_id`), no solo la del
movimiento original — hubo un IDOR real acá (`MovimientoController::update()`
dejaba mover saldo hacia/desde la cuenta de otro usuario), corregido con
`verificarConceptoDelUsuario()`/`verificarCuentaDelUsuario()`.

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
users 1───* deudas
deudas 1───* cuotas
deudas 0..1──1 conceptos (concepto_id, es_sistema=true)
users 1───* push_subscriptions
users 1───* notifications (polimórfico, vía Notifiable)
users 1───1 llm_usage_daily (por día — usage_date compuesto en la unique)
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

## presupuestos
| Columna | Tipo | Notas |
|---|---|---|
| id | bigserial PK | |
| user_id | bigint FK → users.id ON DELETE CASCADE | |
| concepto_id | bigint FK → conceptos.id ON DELETE CASCADE | |
| monto | decimal(14,2) | Límite / meta del período. Siempre > 0. |
| ventana | varchar(20) | `diario` \| `semanal` \| `mensual` \| `anual`. Período calendario en la TZ del cliente. |
| umbrales | jsonb default `[50,75,90]` | Array de enteros (1–100). Porcentajes en los que se dispara una alerta. |
| activo | bool default true | Los inactivos no generan alertas. |
| timestamps | created_at / updated_at | |

UNIQUE `(user_id, concepto_id, ventana)` — un presupuesto por concepto y ventana.

**Comportamiento de consumo:**
- Si el concepto tiene subcategorías (hijos), el consumo del período agrega movimientos de la categoría raíz **y** todos sus hijos.
- Si el concepto es un hijo, solo se contabilizan sus propios movimientos.

**Alertas (stateless):**
Al crear o editar un movimiento, el backend detecta qué umbrales del presupuesto fueron cruzados comparando el estado del período antes y después del movimiento, y los devuelve en `alertas_presupuesto[]` en la respuesta.

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
| reconciliacion_proxima | date nullable | Calculada por `UserSettingsModel::calcularProximaReconciliacion()` — al guardar la preferencia Y al reconciliar (antes solo se reprogramaba para el tipo `personalizado`, era un bug). |
| onboarding_seen | jsonb default `{}` | Claves de coach marks/carrusel ya vistas. Se resetea (total o por clave) desde Perfil o el ícono de ayuda. |
| updated_at | timestamp nullable | |

## deudas
| Columna | Tipo | Notas |
|---|---|---|
| id | bigserial PK | |
| user_id | bigint FK → users.id | |
| nombre | string | |
| acreedor | string nullable | |
| sistema | string(20) | `frances` \| `aleman` \| `bullet` — determina cómo se genera el plan de `cuotas` al crear. |
| monto_original | decimal(14,2) | |
| plazo_meses | int | |
| fecha_inicio | date | |
| tasa_mensual | decimal(8,6) nullable | |
| cuota_directa | decimal(14,2) nullable | |
| total_informal | decimal(14,2) nullable | |
| notas | text nullable | |
| estado | string(20) default 'activa' | `activa` \| `pagada` \| `cancelada` |
| concepto_id | bigint FK nullable → conceptos.id | Concepto de sistema (`es_sistema=true`) creado junto con la deuda — registrar un movimiento contra él auto-marca la próxima cuota pendiente como pagada. |
| timestamps | | |

## cuotas
| Columna | Tipo | Notas |
|---|---|---|
| id | bigserial PK | |
| deuda_id | bigint FK → deudas.id | |
| numero_cuota | int | |
| fecha_vencimiento | date | Casteada como `date` en el modelo (necesario para comparar con `isPast()` en los triggers de notificación). |
| cuota_total | decimal(14,2) | |
| capital | decimal(14,2) nullable | |
| interes | decimal(14,2) nullable | |
| saldo_restante | decimal(14,2) | |
| pagada | bool default false | |
| fecha_pago | timestamp nullable | |
| movimiento_id | bigint FK nullable → movimientos.id | |

UNIQUE `(deuda_id, numero_cuota)`. Sin `timestamps` (`public $timestamps = false`).

## notifications
Tabla nativa de Laravel (no custom) — generada con `php artisan notifications:table`, usada vía el trait `Notifiable` que `UserModel` ya tenía para mail.

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| type | string | FQCN de la clase de notificación (`App\Notifications\ReconciliacionProximaNotification`, etc.) |
| notifiable_type / notifiable_id | polimórfico | Siempre `App\Models\UserModel` acá. |
| data | text | JSON serializado — siempre incluye al menos `{titulo, mensaje}`. |
| read_at | timestamp nullable | |
| timestamps | | |

## push_subscriptions
| Columna | Tipo | Notas |
|---|---|---|
| id | bigserial PK | |
| user_id | bigint FK → users.id ON DELETE CASCADE | Un usuario puede tener varias (web + Android, o varios navegadores). |
| tipo | enum('web','fcm') | Transporte — Web Push y FCM tienen payloads distintos. |
| identificador | text | Endpoint de la suscripción Push API (`web`) o token del dispositivo (`fcm`). |
| payload | jsonb | Claves `p256dh`/`auth` (web) o vacío (fcm). |
| timestamps | | |

UNIQUE `(user_id, identificador)` — re-registrar el mismo dispositivo actualiza en vez de duplicar.

## llm_usage_daily
| Columna | Tipo | Notas |
|---|---|---|
| id | bigserial PK | |
| user_id | bigint FK → users.id ON DELETE CASCADE | |
| usage_date | date | |
| count | unsigned int default 0 | |
| timestamps | | |

UNIQUE `(user_id, usage_date)`. El schema vive acá (Laravel gestiona esta
DB compartida) pero quien lee/escribe en tiempo real es el llm-service
(Python, acceso directo a Postgres vía SQLAlchemy) — mismo patrón que ya
usa para validar `personal_access_tokens` sin pasar por HTTP a Laravel.
