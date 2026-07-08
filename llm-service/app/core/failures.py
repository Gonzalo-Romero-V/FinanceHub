"""Motivos de fallo por widget y mensajes humanos para el usuario final."""

from __future__ import annotations

from enum import Enum


class WidgetFailureReason(str, Enum):
    NO_ENTENDIDO = "no_entendido"
    SIN_DATOS = "sin_datos"
    TABLA_NO_DISPONIBLE = "tabla_no_disponible"
    ERROR_SQL = "error_sql"
    TIMEOUT = "timeout"


FAILURE_MESSAGES: dict[WidgetFailureReason, str] = {
    WidgetFailureReason.NO_ENTENDIDO: (
        "No pude interpretar esa consulta. ¿Podrías reformularla mencionando "
        "qué cuenta, concepto o período te interesa?"
    ),
    WidgetFailureReason.SIN_DATOS: (
        "No encontré movimientos que coincidan con esa consulta en el "
        "período indicado."
    ),
    WidgetFailureReason.TABLA_NO_DISPONIBLE: (
        "Esa información todavía no está disponible desde el asistente (por "
        "ejemplo, deudas o presupuestos) — intenta consultarlo desde su "
        "sección correspondiente."
    ),
    WidgetFailureReason.ERROR_SQL: (
        "Tuve un problema técnico generando esa consulta. Intenta "
        "reformularla de otra manera."
    ),
    WidgetFailureReason.TIMEOUT: (
        "La consulta tardó demasiado en responder. Intenta acotar el período "
        "o simplificar la pregunta."
    ),
}

# Orden de especificidad: el motivo más informativo para el usuario gana
# cuando varios widgets fallaron por razones distintas.
_PRIORITY = [
    WidgetFailureReason.TABLA_NO_DISPONIBLE,
    WidgetFailureReason.TIMEOUT,
    WidgetFailureReason.ERROR_SQL,
    WidgetFailureReason.SIN_DATOS,
    WidgetFailureReason.NO_ENTENDIDO,
]


def pick_summary_reason(reasons: list[WidgetFailureReason]) -> WidgetFailureReason:
    """Elige el motivo más específico/accionable entre los recolectados."""
    for candidate in _PRIORITY:
        if candidate in reasons:
            return candidate
    return WidgetFailureReason.NO_ENTENDIDO


def classify_sql_validation_error(message: str) -> WidgetFailureReason:
    if message.startswith("Tablas no permitidas"):
        return WidgetFailureReason.TABLA_NO_DISPONIBLE
    return WidgetFailureReason.ERROR_SQL


def classify_execution_error(exc: Exception) -> WidgetFailureReason:
    text = str(exc).lower()
    pgcode = getattr(getattr(exc, "orig", None), "pgcode", None)
    if pgcode == "57014" or "statement timeout" in text:
        return WidgetFailureReason.TIMEOUT
    return WidgetFailureReason.ERROR_SQL
