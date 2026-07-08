"""
Funciones de solo lectura para Deudas, Presupuestos y Balance General.

A diferencia del resto del pipeline (`sql_gen.py`), el SQL de este módulo es
FIJO y escrito a mano — el LLM nunca lo genera ni lo modifica. El único
parámetro que decide de qué usuario se leen datos es `user_id`, y ese valor
llega siempre desde la dependencia de autenticación (`app.core.auth`), nunca
desde el prompt del usuario ni desde una decisión del LLM. Estas funciones
replican, en SQL directo contra el mismo Postgres, la misma semántica de
negocio que ya implementan los controllers de Laravel (`BalanceController`,
`DeudaController`, `PresupuestoController`) — no se llama a Laravel por HTTP.
"""

from __future__ import annotations

import logging
from contextlib import contextmanager
from typing import Any

from sqlalchemy import text

from app.core.config import settings
from app.services.database import db_service

log = logging.getLogger(__name__)

_VENTANAS = ("diario", "semanal", "mensual", "anual")


@contextmanager
def _readonly_connection():
    """Misma postura defensiva que `db_service.execute_query`: transacción
    READ ONLY con `statement_timeout`, aunque este SQL es fijo (no lo genera
    el LLM), para no dejar una conexión sin timeout por descuido futuro."""
    with db_service.engine.connect() as conn:
        conn.execute(text(f"SET LOCAL statement_timeout = {int(settings.STATEMENT_TIMEOUT_MS)}"))
        conn.execute(text("SET TRANSACTION READ ONLY"))
        yield conn


def get_balance_general(user_id: int) -> list[dict[str, Any]]:
    """
    Activos, pasivos y patrimonio neto del usuario. Misma fórmula que
    `BalanceController::index()`: activos = cuentas activas tipo 'Activo';
    pasivos = cuentas activas tipo 'Pasivo' + cuotas pendientes de deudas
    activas; patrimonio = activos - pasivos.
    """
    query = text(
        """
        SELECT
            COALESCE(SUM(cu.saldo) FILTER (WHERE tc.nombre = 'Activo'), 0) AS total_activos,
            COALESCE(SUM(cu.saldo) FILTER (WHERE tc.nombre = 'Pasivo'), 0) AS pasivos_cuentas,
            COALESCE((
                SELECT SUM(cuot.cuota_total)
                FROM cuotas cuot
                JOIN deudas d ON d.id = cuot.deuda_id
                WHERE d.user_id = :uid AND d.estado = 'activa' AND cuot.pagada = false
            ), 0) AS pasivos_deudas
        FROM cuentas cu
        JOIN tipos_cuenta tc ON tc.id = cu.tipo_cuenta_id
        WHERE cu.user_id = :uid AND cu.activa = true
        """
    )
    with _readonly_connection() as conn:
        row = conn.execute(query, {"uid": user_id}).mappings().first()

    total_activos = float(row["total_activos"]) if row else 0.0
    total_pasivos = float(row["pasivos_cuentas"] or 0) + float(row["pasivos_deudas"] or 0) if row else 0.0
    patrimonio = total_activos - total_pasivos

    return [
        {"label": "Activos", "value": round(total_activos, 2)},
        {"label": "Pasivos", "value": round(total_pasivos, 2)},
        {"label": "Patrimonio Neto", "value": round(patrimonio, 2)},
    ]


def get_resumen_deudas(user_id: int) -> list[dict[str, Any]]:
    """
    Deudas activas del usuario con saldo pendiente (suma de cuotas no
    pagadas, misma fórmula que `DeudaController::enriquecer()`) y fecha de
    la próxima cuota sin pagar.
    """
    query = text(
        """
        SELECT
            d.id,
            d.nombre,
            d.acreedor,
            d.sistema,
            COALESCE(SUM(cuot.cuota_total) FILTER (WHERE cuot.pagada = false), 0) AS saldo_pendiente,
            MIN(cuot.fecha_vencimiento) FILTER (WHERE cuot.pagada = false) AS proxima_cuota_fecha
        FROM deudas d
        LEFT JOIN cuotas cuot ON cuot.deuda_id = d.id
        WHERE d.user_id = :uid AND d.estado = 'activa'
        GROUP BY d.id, d.nombre, d.acreedor, d.sistema
        ORDER BY d.id
        """
    )
    with _readonly_connection() as conn:
        rows = conn.execute(query, {"uid": user_id}).mappings().all()

    return [
        {
            "label": row["nombre"],
            "value": round(float(row["saldo_pendiente"] or 0), 2),
            "acreedor": row["acreedor"],
            "sistema": row["sistema"],
            "proxima_cuota_fecha": (
                row["proxima_cuota_fecha"].isoformat() if row["proxima_cuota_fecha"] else None
            ),
        }
        for row in rows
    ]


def get_resumen_presupuestos(user_id: int, client_timezone: str) -> list[dict[str, Any]]:
    """
    Consumo actual de los presupuestos activos del usuario en su período
    calendario vigente (diario/semanal/mensual/anual, calculado en la TZ del
    cliente). Un presupuesto de un concepto raíz agrega también los
    movimientos de sus subcategorías, igual que
    `PresupuestoController::consumoActual()`.
    """
    bounds = _periodo_bounds(client_timezone)

    presupuestos_query = text(
        """
        SELECT p.id, p.concepto_id, p.monto, p.ventana, c.nombre AS concepto_nombre
        FROM presupuestos p
        JOIN conceptos c ON c.id = p.concepto_id AND c.user_id = :uid
        WHERE p.user_id = :uid AND p.activo = true
        ORDER BY p.id DESC
        """
    )
    consumo_query = text(
        """
        SELECT COALESCE(SUM(m.monto), 0) AS total
        FROM movimientos m
        JOIN conceptos mc ON mc.id = m.concepto_id
        WHERE (mc.id = :concepto_id OR mc.parent_id = :concepto_id)
          AND mc.user_id = :uid
          AND m.fecha >= :inicio AND m.fecha < :fin
        """
    )

    with _readonly_connection() as conn:
        presupuestos = conn.execute(presupuestos_query, {"uid": user_id}).mappings().all()

        result = []
        for p in presupuestos:
            ventana = p["ventana"] if p["ventana"] in bounds else "mensual"
            inicio, fin = bounds[ventana]
            consumo = conn.execute(
                consumo_query,
                {
                    "concepto_id": p["concepto_id"],
                    "uid": user_id,
                    "inicio": inicio,
                    "fin": fin,
                },
            ).scalar_one()
            consumo = float(consumo or 0)
            monto = float(p["monto"])
            pct = round((consumo / monto) * 100, 1) if monto > 0 else 0.0

            result.append(
                {
                    "label": p["concepto_nombre"],
                    "value": pct,
                    "monto_presupuesto": round(monto, 2),
                    "consumo_actual": round(consumo, 2),
                    "ventana": p["ventana"],
                }
            )

    return result


def _periodo_bounds(client_timezone: str) -> dict[str, tuple[Any, Any]]:
    """
    Calcula, en un único round-trip a Postgres, el [inicio, fin) en UTC del
    período calendario vigente para cada ventana posible, evaluado en la TZ
    del cliente. Se delega el cálculo a Postgres (date_trunc + AT TIME ZONE)
    en vez de aritmética de fechas a mano en Python, para no reintroducir
    bugs de DST/meses de distinta duración/años bisiestos.
    """
    query = text(
        """
        SELECT
            (date_trunc('day', now() AT TIME ZONE :tz) AT TIME ZONE :tz) AS diario_inicio,
            ((date_trunc('day', now() AT TIME ZONE :tz) + interval '1 day') AT TIME ZONE :tz) AS diario_fin,
            (date_trunc('week', now() AT TIME ZONE :tz) AT TIME ZONE :tz) AS semanal_inicio,
            ((date_trunc('week', now() AT TIME ZONE :tz) + interval '1 week') AT TIME ZONE :tz) AS semanal_fin,
            (date_trunc('month', now() AT TIME ZONE :tz) AT TIME ZONE :tz) AS mensual_inicio,
            ((date_trunc('month', now() AT TIME ZONE :tz) + interval '1 month') AT TIME ZONE :tz) AS mensual_fin,
            (date_trunc('year', now() AT TIME ZONE :tz) AT TIME ZONE :tz) AS anual_inicio,
            ((date_trunc('year', now() AT TIME ZONE :tz) + interval '1 year') AT TIME ZONE :tz) AS anual_fin
        """
    )
    with _readonly_connection() as conn:
        row = conn.execute(query, {"tz": client_timezone}).mappings().first()

    return {
        ventana: (row[f"{ventana}_inicio"], row[f"{ventana}_fin"]) for ventana in _VENTANAS
    }
