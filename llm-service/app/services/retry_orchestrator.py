"""
Orquestador de reintentos guiados ("Auto-Discovery").

Se activa cuando el plan inicial del planner no produjo ningún widget
utilizable. En vez de rendirse de inmediato, prueba hasta `MAX_ATTEMPTS`
reformulaciones internas (distintas hipótesis de qué tipo de widget responde
la pregunta) antes de admitir que no se pudo resolver la consulta.

Acotado por un timeout total (`TOTAL_TIMEOUT_SECONDS`) para no degradar la
UX: si se agota, se corta y se informa que no se encontró nada, igual que si
los 3 intentos hubieran fallado.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from app.services.database import db_service
from app.services.semantic import semantic_service
from app.services.sql_gen import sql_gen_service
from app.services.sql_validator import SqlValidationError

log = logging.getLogger(__name__)

STRATEGY_HINTS = [
    "Interpreta la consulta como una serie temporal (line o bar) usando el "
    "rango de fechas disponible.",
    "Interpreta la consulta como una comparación o distribución entre "
    "categorías (pie o bar agrupado por concepto/cuenta).",
    "Interpreta la consulta como un único indicador (KPI) que responda la "
    "pregunta de forma directa y simple.",
]

MAX_ATTEMPTS = len(STRATEGY_HINTS)
TOTAL_TIMEOUT_SECONDS = 20


async def attempt_discovery(
    *,
    user_prompt: str,
    user_id: int,
    client_timezone: str,
    today_iso: str,
) -> tuple[list[dict[str, Any]], str | None]:
    """
    Prueba hasta `MAX_ATTEMPTS` reformulaciones. Devuelve `(widget_specs, hint)`
    del primer intento que produjo al menos un widget con datos no vacíos, o
    `([], None)` si ninguno lo logró (o se agotó el timeout total).

    Cada elemento de `widget_specs` es un dict con las claves necesarias para
    construir un `Widget` en `main.py`: spec_type, title, goal, value_format,
    sql, results.
    """
    try:
        async with asyncio.timeout(TOTAL_TIMEOUT_SECONDS):
            for hint in STRATEGY_HINTS:
                widgets = await _try_single_attempt(
                    user_prompt, user_id, client_timezone, today_iso, hint
                )
                if widgets:
                    return widgets, hint
    except TimeoutError:
        log.warning("Auto-discovery: timeout total (%ss) alcanzado.", TOTAL_TIMEOUT_SECONDS)
    return [], None


async def _try_single_attempt(
    user_prompt: str,
    user_id: int,
    client_timezone: str,
    today_iso: str,
    hint: str,
) -> list[dict[str, Any]]:
    try:
        plan = await semantic_service.design_dashboard(
            user_prompt,
            user_id,
            client_timezone=client_timezone,
            today_iso=today_iso,
            strategy_hint=hint,
        )
    except Exception:
        log.exception("Auto-discovery: planner falló con hint=%r", hint)
        return []

    bind_params = {"uid": user_id, "today": today_iso, "tz": client_timezone}
    valid_formats = {"currency", "percent", "integer", "number", "auto"}
    widgets: list[dict[str, Any]] = []

    for spec in plan.get("widgets", []):
        spec_type = spec.get("type", "table")
        if spec_type not in {"kpi", "line", "bar", "pie", "table"}:
            spec_type = "table"
        value_format = spec.get("value_format", "auto")
        if value_format not in valid_formats:
            value_format = "auto"

        try:
            sql = await sql_gen_service.generate_sql_for_widget(
                spec,
                user_prompt,
                user_id=user_id,
                client_timezone=client_timezone,
                today_iso=today_iso,
            )
            results = db_service.execute_query(sql, bind_params)
        except SqlValidationError:
            continue
        except Exception:
            log.exception("Auto-discovery: widget %s falló con hint=%r", spec.get("id_ref"), hint)
            continue

        if not results:
            continue

        widgets.append(
            {
                "spec_type": spec_type,
                "title": spec.get("title", "Reporte"),
                "goal": spec.get("goal"),
                "value_format": value_format,
                "sql": sql,
                "results": results,
            }
        )

    return widgets
