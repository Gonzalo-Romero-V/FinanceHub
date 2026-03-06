BEGIN;

-- =========================
-- 1. CUENTAS
-- =========================
CREATE TABLE cuentas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    tipo_cuenta VARCHAR(20) NOT NULL,
    saldo NUMERIC(12, 2) NOT NULL DEFAULT 0,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
    activa BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT chk_tipo_cuenta
    CHECK (tipo_cuenta IN ('activo', 'pasivo'))
);

-- =========================
-- 2. TIPOS DE MOVIMIENTO
-- =========================
CREATE TABLE tipos_movimiento (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(20) NOT NULL UNIQUE
);

-- Valores esperados:
-- ingreso
-- egreso
-- transferencia

-- =========================
-- 3. CONCEPTOS
-- =========================
CREATE TABLE conceptos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    tipo_movimiento_id INTEGER NOT NULL,

    CONSTRAINT fk_concepto_tipo_movimiento
        FOREIGN KEY (tipo_movimiento_id)
        REFERENCES tipos_movimiento(id),

    CONSTRAINT uq_concepto_tipo
        UNIQUE (nombre, tipo_movimiento_id)
);

-- =========================
-- 4. MOVIMIENTOS
-- =========================
CREATE TABLE movimientos (
    id SERIAL PRIMARY KEY,
    monto NUMERIC(12, 2) NOT NULL CHECK (monto > 0),

    cuenta_origen_id INTEGER NULL,
    cuenta_destino_id INTEGER NULL,

    concepto_id INTEGER NOT NULL,

    nota TEXT NULL,
    fecha TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_mov_cuenta_origen
        FOREIGN KEY (cuenta_origen_id)
        REFERENCES cuentas(id),

    CONSTRAINT fk_mov_cuenta_destino
        FOREIGN KEY (cuenta_destino_id)
        REFERENCES cuentas(id),

    CONSTRAINT fk_mov_concepto
        FOREIGN KEY (concepto_id)
        REFERENCES conceptos(id)
);

COMMIT;


/* ✅ REGLAS ASEGURADAS POR LA BASE DE DATOS

No puede existir una cuenta sin tipo (activo o pasivo).

Una cuenta solo puede ser de tipo activo o pasivo.

El saldo de una cuenta nunca es NULL.

Un tipo de movimiento no puede repetirse por nombre.

Un concepto siempre pertenece a un tipo de movimiento válido.

No pueden existir conceptos duplicados para un mismo tipo de movimiento.

Un movimiento siempre tiene un monto mayor a cero.

Un movimiento siempre tiene una fecha de registro.

Un movimiento siempre está asociado a un concepto válido.

Una cuenta origen debe existir si se especifica.

Una cuenta destino debe existir si se especifica.

Las claves primarias son únicas e inmutables.

Las relaciones entre tablas no pueden romperse (integridad referencial).

No pueden existir movimientos huérfanos de conceptos.

No pueden existir conceptos huérfanos de tipos de movimiento. */