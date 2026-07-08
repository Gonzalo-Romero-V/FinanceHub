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

from fastapi import Depends, FastAPI, Header, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.core.rate_limit import enforce_daily_limit
from app.core.config import settings
from app.core.failures import (
    FAILURE_MESSAGES,
    WidgetFailureReason,
    classify_execution_error,
    classify_sql_validation_error,
    pick_summary_reason,
)
from app.services.analyst import analyst_service
from app.services.database import db_service
from app.services.finance_tools import (
    get_balance_general,
    get_resumen_deudas,
    get_resumen_presupuestos,
)
from app.services.movimiento_parser import parse_movimiento
from app.services.retry_orchestrator import attempt_discovery
from app.services.semantic import semantic_service
from app.services.sql_gen import sql_gen_service
from app.services.sql_validator import SqlValidationError
from app.services.voice import VoiceIntent, classify_intent, transcribe_audio

FINANCE_TOOLS = {
    "balance_general": lambda user_id, tz: get_balance_general(user_id),
    "resumen_deudas": lambda user_id, tz: get_resumen_deudas(user_id),
    "resumen_presupuestos": lambda user_id, tz: get_resumen_presupuestos(user_id, tz),
}


def _kpi_metric_from_tool(tool: str, results: list[dict]) -> float:
    """Reduce el resultado label/value de una tool a un único número de KPI."""
    if not results:
        return 0
    if tool == "balance_general":
        match = next((r for r in results if r.get("label") == "Patrimonio Neto"), None)
        return match["value"] if match else results[-1].get("value", 0)
    if tool == "resumen_deudas":
        return sum(r.get("value", 0) for r in results)
    return results[0].get("value", 0)

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
log = logging.getLogger(__name__)


app = FastAPI(title=settings.APP_NAME)

_origins = settings.allowed_origins_list
log.info("CORS allow_origins=%s", _origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Cualquier falla no controlada devuelve un mensaje humano, nunca un 500 plano.

    No intercepta `HTTPException` (ej. 401 de `get_current_user_id`): FastAPI
    registra un handler específico para esa clase que tiene prioridad sobre
    este handler genérico de `Exception`.
    """
    log.exception("Error no controlado en %s", request.url.path)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "El servicio de análisis no está disponible en este momento. Intentá de nuevo en unos minutos."
        },
    )


# ─── Schemas ─────────────────────────────────────────────────────────────────


WidgetType = Literal["kpi", "line", "bar", "pie", "table"]
DashboardMode = Literal["replace", "append", "update"]


class AnalyzeRequest(BaseModel):
    prompt: str = Field(min_length=1)


ValueFormat = Literal["currency", "percent", "integer", "number", "auto"]


class Widget(BaseModel):
    id: str
    type: WidgetType
    title: str
    description: Optional[str] = None
    data: list[dict]
    raw_total_records: int
    sql: Optional[str] = None
    metric: Optional[float | int] = None
    value_format: ValueFormat = "auto"
    currency: Optional[str] = None
    unit: Optional[str] = None
    auto_discovery: bool = False


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
    user_id: Annotated[int, Depends(enforce_daily_limit)],
    x_client_timezone: Annotated[Optional[str], Header(alias="X-Client-Timezone")] = None,
) -> AnalysisResponse:
    tz = _resolve_timezone(x_client_timezone)
    today_iso = _today_iso_in_tz(tz)
    bind_params = {"uid": user_id, "today": today_iso, "tz": tz}

    log.info(
        "analyze: user_id=%s tz=%s today=%s prompt=%r",
        user_id,
        tz,
        today_iso,
        request.prompt,
    )

    # 1. PLANNER
    try:
        plan = await semantic_service.design_dashboard(
            request.prompt,
            user_id,
            client_timezone=tz,
            today_iso=today_iso,
        )
    except Exception:
        log.exception("Planner falló; no se pudo interpretar la consulta.")
        plan = {"dashboard_title": "No se pudo generar el análisis", "mode": "replace", "widgets": []}

    final_widgets: list[Widget] = []
    failure_reasons: list[WidgetFailureReason] = []
    auto_discovery_used = False
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

        tool = spec.get("tool")
        sql: Optional[str] = None

        if tool in FINANCE_TOOLS:
            # user_id viene exclusivamente de la dependencia de auth (nunca
            # del prompt ni de una decisión del LLM) — ver finance_tools.py.
            try:
                results = FINANCE_TOOLS[tool](user_id, tz)
            except Exception as e:
                log.exception("Widget %s (tool=%s) falló.", spec.get("id_ref"), tool)
                failure_reasons.append(classify_execution_error(e))
                continue
        else:
            try:
                sql = await sql_gen_service.generate_sql_for_widget(
                    spec,
                    request.prompt,
                    user_id=user_id,
                    client_timezone=tz,
                    today_iso=today_iso,
                )
                results = db_service.execute_query(sql, bind_params)
            except SqlValidationError as e:
                log.warning("Widget %s rechazado por validator: %s", spec.get("id_ref"), e)
                failure_reasons.append(classify_sql_validation_error(str(e)))
                continue
            except Exception as e:
                log.exception("Widget %s falló al ejecutar SQL.", spec.get("id_ref"))
                failure_reasons.append(classify_execution_error(e))
                continue

        safe_results = (results or [])[: settings.MAX_ROWS_PER_QUERY]

        widget_data: dict = {
            "id": str(uuid.uuid4()),
            "type": spec_type,
            "title": spec.get("title", "Reporte"),
            "description": spec.get("goal"),
            "data": safe_results,
            "raw_total_records": len(results) if results else 0,
            "sql": sql if settings.DEBUG else None,
            "value_format": value_format,
            "currency": "USD" if value_format == "currency" else None,
        }

        if spec_type == "kpi":
            if results:
                if tool in FINANCE_TOOLS:
                    widget_data["metric"] = _kpi_metric_from_tool(tool, results)
                else:
                    first_row = results[0]
                    val = first_row.get("metric") or next(iter(first_row.values()), 0)
                    widget_data["metric"] = val if val is not None else 0
            else:
                widget_data["metric"] = 0

        final_widgets.append(Widget(**widget_data))

    # 2b. AUTO-DISCOVERY: si el plan inicial no produjo nada usable, se
    # reintenta con hasta 3 reformulaciones guiadas antes de rendirse.
    if not final_widgets:
        discovered, _hint = await attempt_discovery(
            user_prompt=request.prompt,
            user_id=user_id,
            client_timezone=tz,
            today_iso=today_iso,
        )
        if discovered:
            auto_discovery_used = True
            for item in discovered:
                results = item["results"]
                safe_results = results[: settings.MAX_ROWS_PER_QUERY]
                widget_data = {
                    "id": str(uuid.uuid4()),
                    "type": item["spec_type"],
                    "title": item["title"],
                    "description": item.get("goal"),
                    "data": safe_results,
                    "raw_total_records": len(results),
                    "sql": item["sql"] if settings.DEBUG else None,
                    "value_format": item["value_format"],
                    "currency": "USD" if item["value_format"] == "currency" else None,
                    "auto_discovery": True,
                }
                if item["spec_type"] == "kpi":
                    first_row = results[0]
                    val = first_row.get("metric") or next(iter(first_row.values()), 0)
                    widget_data["metric"] = val if val is not None else 0
                final_widgets.append(Widget(**widget_data))

    # 3. RESUMEN EJECUTIVO
    if final_widgets:
        try:
            summary = await analyst_service.generate_executive_summary(
                request.prompt,
                [w.model_dump() for w in final_widgets],
            )
        except Exception:
            log.exception("Analyst falló.")
            summary = "Se generó el reporte pero hubo un error al crear el resumen ejecutivo."
    else:
        summary = FAILURE_MESSAGES[pick_summary_reason(failure_reasons)]

    mode_raw = plan.get("mode", "append")
    mode: DashboardMode = mode_raw if mode_raw in ("replace", "append", "update") else "append"
    dashboard_title = (
        "Resultado aproximado"
        if auto_discovery_used
        else plan.get("dashboard_title", "Análisis Financiero")
    )

    return AnalysisResponse(
        intent=request.prompt,
        dashboard_title=dashboard_title,
        summary=summary,
        mode=mode,
        widgets=final_widgets,
    )


# ─── Voz ─────────────────────────────────────────────────────────────────────


class TranscribeResponse(BaseModel):
    text: str
    intent: Optional[VoiceIntent] = None


@app.post("/api/voice/transcribe", response_model=TranscribeResponse)
async def voice_transcribe(
    user_id: Annotated[int, Depends(enforce_daily_limit)],
    audio: UploadFile,
    classify: bool = False,
) -> TranscribeResponse:
    """
    Transcribe un clip de audio corto. `user_id` solo gatea el acceso
    (autenticación); la transcripción en sí no depende de datos del usuario.
    Si `classify=true`, además clasifica la intención del texto resultante
    (usado por el mic del dashboard, que no sabe de antemano si es una
    consulta o un registro de movimiento).
    """
    contents = await audio.read(settings.MAX_AUDIO_BYTES + 1)
    if not contents:
        raise HTTPException(status_code=400, detail="No se recibió audio.")
    if len(contents) > settings.MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="El archivo de audio es demasiado grande.")

    try:
        texto = transcribe_audio(contents, audio.filename or "audio.webm")
    except Exception:
        log.exception("Transcripción de audio falló (user_id=%s).", user_id)
        raise HTTPException(
            status_code=502, detail="No se pudo transcribir el audio. Intentá de nuevo."
        )

    intent = await classify_intent(texto) if classify else None
    return TranscribeResponse(text=texto, intent=intent)


MovimientoType = Literal["Ingreso", "Egreso", "Transferencia"]


class MovimientoDraft(BaseModel):
    tipo: Optional[MovimientoType] = None
    concepto_id: Optional[int] = None
    concepto_nombre: str = ""
    cuenta_origen_id: Optional[int] = None
    cuenta_origen_nombre: str = ""
    cuenta_destino_id: Optional[int] = None
    cuenta_destino_nombre: str = ""
    monto: Optional[float] = Field(default=None, gt=0)
    nota: Optional[str] = None


class ParseMovimientoRequest(BaseModel):
    texto: str = Field(min_length=1)
    estado_previo: Optional[MovimientoDraft] = None


class ParseMovimientoResponse(BaseModel):
    estado: MovimientoDraft
    faltantes: list[str]
    pregunta: Optional[str]
    completo: bool


@app.post("/api/voice/parse-movimiento", response_model=ParseMovimientoResponse)
async def voice_parse_movimiento(
    request: ParseMovimientoRequest,
    user_id: Annotated[int, Depends(enforce_daily_limit)],
) -> ParseMovimientoResponse:
    """
    Extrae/completa los campos de un movimiento a partir de texto transcrito.
    `user_id` (del token, nunca del body) acota qué conceptos/cuentas puede
    ver y elegir el LLM — jamás puede resolver contra datos de otro usuario.
    """
    try:
        result = await parse_movimiento(
            user_id,
            request.texto,
            request.estado_previo.model_dump() if request.estado_previo else None,
        )
    except Exception:
        log.exception("Parseo de movimiento por voz falló (user_id=%s).", user_id)
        raise HTTPException(
            status_code=502, detail="No pude interpretar el movimiento. Intentá de nuevo."
        )
    return ParseMovimientoResponse(**result)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=settings.PORT)
