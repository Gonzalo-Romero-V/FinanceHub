"""
Entry point del LLM service.

Pipeline:
1. Planner decide qué widgets responder al prompt.
2. Por cada widget, sql_gen produce SQL con placeholders y SqlValidator lo
   inspecciona antes de ejecutarlo.
3. db_service ejecuta el SQL bindeado con `:uid`, `:today`, `:tz` en una
   transacción READ ONLY con statement_timeout.
4. Analyst genera el resumen ejecutivo.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Annotated, Literal, Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.core.config import settings
from app.services.analyst import analyst_service
from app.services.database import db_service
from app.services.semantic import semantic_service
from app.services.sql_gen import sql_gen_service
from app.services.sql_validator import SqlValidationError

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
log = logging.getLogger(__name__)


app = FastAPI(title=settings.APP_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Schemas ─────────────────────────────────────────────────────────────────


WidgetType = Literal["kpi", "line", "bar", "pie", "table"]
DashboardMode = Literal["replace", "append", "update"]


class AnalyzeRequest(BaseModel):
    prompt: str = Field(min_length=1)
    user_id: int = Field(gt=0)


ValueFormat = Literal["currency", "percent", "integer", "number", "auto"]


class Widget(BaseModel):
    id: str
    type: WidgetType
    title: str
    data: list[dict]
    raw_total_records: int
    sql: Optional[str] = None
    metric: Optional[float | int] = None
    value_format: ValueFormat = "auto"
    currency: Optional[str] = None
    unit: Optional[str] = None


class AnalysisResponse(BaseModel):
    intent: str
    dashboard_title: str
    summary: str
    mode: DashboardMode
    widgets: list[Widget]


# ─── Helpers ─────────────────────────────────────────────────────────────────


def _resolve_timezone(header_value: Optional[str]) -> str:
    """
    Valida el header X-Client-Timezone contra IANA. Cae a UTC si no se
    encuentra el dato (ej. Windows sin tzdata) o si el valor es inválido.
    """
    if not header_value:
        return "UTC"
    try:
        ZoneInfo(header_value)
        return header_value
    except (ZoneInfoNotFoundError, ValueError) as e:
        log.warning("X-Client-Timezone %r no resoluble (%s) → uso UTC.", header_value, e)
        return "UTC"


def _today_iso_in_tz(tz: str) -> str:
    """
    Devuelve YYYY-MM-DD del 'hoy' en la TZ pedida. Si la base IANA no está
    disponible (Windows sin `tzdata`), cae a UTC usando `datetime.timezone.utc`
    para no romper el endpoint.
    """
    try:
        return datetime.now(ZoneInfo(tz)).strftime("%Y-%m-%d")
    except ZoneInfoNotFoundError:
        log.error(
            "ZoneInfo(%r) no resoluble. Instalá `tzdata` (`pip install tzdata`) "
            "para soporte IANA completo. Uso datetime.timezone.utc.",
            tz,
        )
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")


# ─── Endpoint ────────────────────────────────────────────────────────────────


@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze(
    request: AnalyzeRequest,
    x_client_timezone: Annotated[Optional[str], Header(alias="X-Client-Timezone")] = None,
) -> AnalysisResponse:
    tz = _resolve_timezone(x_client_timezone)
    today_iso = _today_iso_in_tz(tz)
    bind_params = {"uid": request.user_id, "today": today_iso, "tz": tz}

    log.info(
        "analyze: user_id=%s tz=%s today=%s prompt=%r",
        request.user_id,
        tz,
        today_iso,
        request.prompt,
    )

    # 1. PLANNER
    try:
        plan = await semantic_service.design_dashboard(
            request.prompt,
            request.user_id,
            client_timezone=tz,
            today_iso=today_iso,
        )
    except Exception:
        log.exception("Planner falló; uso plan por defecto.")
        plan = {
            "dashboard_title": "Análisis General",
            "mode": "replace",
            "widgets": [
                {
                    "id_ref": "w1",
                    "type": "table",
                    "goal": "Listado de movimientos del mes actual",
                }
            ],
        }

    final_widgets: list[Widget] = []
    valid_formats = {"currency", "percent", "integer", "number", "auto"}

    # 2. EJECUCIÓN POR WIDGET
    for spec in plan.get("widgets", []):
        spec_type = spec.get("type", "table")
        if spec_type not in {"kpi", "line", "bar", "pie", "table"}:
            log.warning("Tipo de widget no soportado: %r → cae a 'table'.", spec_type)
            spec_type = "table"

        value_format = spec.get("value_format", "auto")
        if value_format not in valid_formats:
            log.warning("value_format inválido %r → 'auto'.", value_format)
            value_format = "auto"

        try:
            sql = await sql_gen_service.generate_sql_for_widget(
                spec,
                request.prompt,
                user_id=request.user_id,
                client_timezone=tz,
                today_iso=today_iso,
            )
            results = db_service.execute_query(sql, bind_params)
        except SqlValidationError as e:
            log.warning("Widget %s rechazado por validator: %s", spec.get("id_ref"), e)
            continue
        except Exception:
            log.exception("Widget %s falló al ejecutar SQL.", spec.get("id_ref"))
            continue

        safe_results = (results or [])[: settings.MAX_ROWS_PER_QUERY]

        widget_data: dict = {
            "id": str(uuid.uuid4()),
            "type": spec_type,
            "title": spec.get("goal", "Reporte"),
            "data": safe_results,
            "raw_total_records": len(results) if results else 0,
            "sql": sql if settings.DEBUG else None,
            "value_format": value_format,
            "currency": "USD" if value_format == "currency" else None,
        }

        if spec_type == "kpi":
            if results:
                first_row = results[0]
                val = first_row.get("metric") or next(iter(first_row.values()), 0)
                widget_data["metric"] = val if val is not None else 0
            else:
                widget_data["metric"] = 0

        final_widgets.append(Widget(**widget_data))

    # 3. RESUMEN EJECUTIVO
    summary = "No se encontraron datos suficientes para un análisis detallado."
    if final_widgets:
        try:
            summary = await analyst_service.generate_executive_summary(
                request.prompt,
                [w.model_dump() for w in final_widgets],
            )
        except Exception:
            log.exception("Analyst falló.")
            summary = "Se generó el reporte pero hubo un error al crear el resumen ejecutivo."

    mode_raw = plan.get("mode", "append")
    mode: DashboardMode = mode_raw if mode_raw in ("replace", "append", "update") else "append"

    return AnalysisResponse(
        intent=request.prompt,
        dashboard_title=plan.get("dashboard_title", "Análisis Financiero"),
        summary=summary,
        mode=mode,
        widgets=final_widgets,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=settings.PORT)
