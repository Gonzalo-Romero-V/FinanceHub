"""
Generación de SQL por widget.

Recibe un widget spec + TZ del cliente + 'hoy' en esa TZ y produce un SQL
con placeholders bindeables (`:uid`, `:today`, `:tz`). El SQL es validado
por `sql_validator.validate_sql` antes de devolverlo.
"""

import json
import logging
import re

from app.services.database import db_service
from app.services.llm.factory import LLMFactory
from app.services.sql_validator import SqlValidationError, validate_sql

log = logging.getLogger(__name__)


class SQLGenerationService:
    def __init__(self):
        self.llm = LLMFactory.get_adapter()

    async def generate_sql_for_widget(
        self,
        widget_spec: dict,
        user_prompt: str,
        user_id: int,
        client_timezone: str,
        today_iso: str,
    ) -> str:
        """
        Devuelve un SQL validado listo para ejecutar con bindings
        `{uid: int, today: 'YYYY-MM-DD', tz: 'America/Guayaquil'}`.
        """
        schema = db_service.get_schema_info(user_id)

        widget_type = widget_spec.get("type", "table")
        goal = widget_spec.get("goal", "")

        output_contract = _output_contract_for(widget_type)
        system_prompt = _build_prompt(
            schema=schema,
            widget_type=widget_type,
            goal=goal,
            output_contract=output_contract,
            today_iso=today_iso,
            client_timezone=client_timezone,
        )

        raw = await self.llm.generate_response(system_prompt, f"Prompt: {user_prompt}")
        sql = _strip_markdown(raw)

        try:
            result = validate_sql(sql)
        except SqlValidationError as e:
            log.warning(
                "SQL rechazado por el validador. widget=%s goal=%s error=%s sql=%s",
                widget_type,
                goal,
                e,
                sql,
            )
            raise

        return result.sql


sql_gen_service = SQLGenerationService()


# ─── Helpers ─────────────────────────────────────────────────────────────────


def _strip_markdown(text: str) -> str:
    return re.sub(r"```(?:sql)?", "", text).strip()


def _output_contract_for(widget_type: str) -> str:
    if widget_type == "kpi":
        return "Devuelve UNA fila con UNA columna llamada `metric` (numérica)."
    if widget_type == "pie":
        return "Devuelve dos columnas: `label` (texto) y `value` (numérico)."
    if widget_type in {"bar", "line"}:
        return (
            "Devuelve dos columnas: una categórica o temporal (alias `label` o "
            "`x`) y una numérica (alias `value` o `y`)."
        )
    return "Devuelve columnas tabulares con alias legibles."


def _build_prompt(
    *,
    schema: dict,
    widget_type: str,
    goal: str,
    output_contract: str,
    today_iso: str,
    client_timezone: str,
) -> str:
    return f"""
Eres un generador de SQL para PostgreSQL especializado en finanzas personales.

CONTEXTO DEL REQUEST:
- Hoy (en TZ del usuario): {today_iso}
- Zona horaria del usuario (IANA): {client_timezone}
- Esta TZ está disponible como placeholder :tz en el SQL.
- La fecha de hoy está disponible como placeholder :today (formato 'YYYY-MM-DD').
- El user_id está disponible como placeholder :uid (entero).

OBJETIVO DEL WIDGET ({widget_type}):
{goal}

CONTRATO DE SALIDA:
{output_contract}

REGLAS OBLIGATORIAS (el SQL será validado automáticamente y rechazado si las viola):

1. Usa SOLO un único statement SELECT (puede tener WITH ... SELECT).
2. NO uses INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, GRANT, REVOKE, COPY, INTO.
3. NO uses funciones de sesión: current_user, session_user, current_setting, pg_*.
4. Los únicos placeholders permitidos son :uid, :today, :tz. NUNCA inyectes
   valores como texto plano para user_id o fechas; SIEMPRE usa los placeholders.

5. FILTRO DE USUARIO (obligatorio):
   - Si referencias `conceptos`: agrega `co.user_id = :uid`.
   - Si referencias `cuentas`: agrega `cu.user_id = :uid` (o el alias que uses).
   - Si referencias `movimientos`: DEBES unirla con `conceptos` o `cuentas`
     filtrados por `:uid`. `movimientos` no tiene `user_id` directo.

6. SEMÁNTICA DE MOVIMIENTOS:
   - `tipos_movimiento.nombre` es uno de: 'Ingreso', 'Egreso', 'Transferencia'.
   - Para EGRESO: el dinero sale por `m.cuenta_origen_id`.
   - Para INGRESO: el dinero entra por `m.cuenta_destino_id`.
   - Para TRANSFERENCIA: ambas cuentas son del mismo usuario.

7. FECHAS Y ZONAS HORARIAS:
   - `movimientos.fecha` y `cuentas.fecha_creacion` se almacenan en UTC.
   - Para comparar contra el día calendario del usuario, convierte a TZ local:
       ((m.fecha AT TIME ZONE 'UTC') AT TIME ZONE :tz)::date
   - SINTAXIS DE PLACEHOLDERS CON CAST (importante):
     NUNCA escribas `:today::date` ni `:uid::int`. SQLAlchemy no detecta el
     bindparam cuando está pegado a `::`. SIEMPRE envuelvelo en paréntesis:
     `(:today)::date`, `(:uid)::int`.
   - Patrones esperados:
       Hoy:           ((m.fecha AT TIME ZONE 'UTC') AT TIME ZONE :tz)::date = (:today)::date
       Ayer:          ((m.fecha AT TIME ZONE 'UTC') AT TIME ZONE :tz)::date = ((:today)::date - INTERVAL '1 day')
       Mes actual:    date_trunc('month', ((m.fecha AT TIME ZONE 'UTC') AT TIME ZONE :tz)::date)
                      = date_trunc('month', (:today)::date)
       Últimos 7 días: ((m.fecha AT TIME ZONE 'UTC') AT TIME ZONE :tz)::date
                       >= ((:today)::date - INTERVAL '6 days')
   - Si el usuario no especifica rango, asume "mes actual".

8. AGREGACIONES PARA GRÁFICOS:
   - pie: `SELECT <categoría> AS label, SUM(...) AS value`.
   - bar/line: una columna categórica/temporal y una numérica, con alias claros.
   - kpi: una sola fila, una sola columna `metric`.

9. FORMATO DE RESPUESTA:
   - Devuelve ÚNICAMENTE el SQL ejecutable.
   - Sin markdown, sin explicaciones, sin texto adicional.

ESQUEMA DE LA DB:
{json.dumps(schema)}
""".strip()
