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
    concept_category_contract = (
        " Si la categoría proviene de `conceptos`, devuelve además "
        "`concepto_id` (el `conceptos.id` de la misma fila usada como categoría) "
        "y usa exactamente `conceptos.nombre AS label`, sin concatenar, traducir, "
        "normalizar ni transformar el nombre."
    )
    if widget_type == "kpi":
        return "Devuelve UNA fila con UNA columna llamada `metric` (numérica)."
    if widget_type == "pie":
        return (
            "Devuelve `label` (texto) y `value` (numérico)."
            + concept_category_contract
        )
    if widget_type in {"bar", "line"}:
        return (
            "Devuelve dos columnas: una categórica o temporal (alias `label` o "
            "`x`) y una numérica (alias `value` o `y`)."
            + concept_category_contract
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

7. JERARQUÍA DE CONCEPTOS:
   - `conceptos.parent_id IS NULL` identifica un concepto raíz.
   - `conceptos.parent_id = <raíz.id>` identifica una subcategoría. La jerarquía
     tiene como máximo dos niveles: raíz → hija.
   - Salvo pedido explícito de contar sólo asignaciones directas a la raíz, el
     total de un concepto raíz DEBE incluir movimientos de la raíz y sus hijas.
   - Para agrupar movimientos por raíz, une dos veces `conceptos` y usa
     `COALESCE(co.parent_id, co.id)` para resolver la raíz. Si el usuario pide
     desglose por subcategoría, agrupa por `co.nombre` sin colapsar las hijas.
   - Cuando la categoría del widget sea un concepto, devuelve el ID y nombre del
     MISMO concepto: `<alias>.id AS concepto_id, <alias>.nombre AS label`. El
     `label` debe ser exactamente `conceptos.nombre`, sin transformaciones. Para
     agrupación por raíz usa `raiz.id`/`raiz.nombre`; para desglose usa
     `co.id`/`co.nombre`.
   - Cada alias de `conceptos` debe quedar filtrado por `user_id = :uid`.
   - Ejemplo correcto de agregación por concepto raíz:
       SELECT raiz.id AS concepto_id, raiz.nombre AS label, SUM(m.monto) AS value
       FROM movimientos AS m
       JOIN conceptos AS co ON co.id = m.concepto_id
       JOIN conceptos AS raiz
         ON raiz.id = COALESCE(co.parent_id, co.id)
        AND raiz.user_id = :uid
       WHERE co.user_id = :uid
        AND date_trunc('month', ((m.fecha AT TIME ZONE 'UTC') AT TIME ZONE :tz)::date)
            = date_trunc('month', (:today)::date)
       GROUP BY raiz.id, raiz.nombre

8. FECHAS Y ZONAS HORARIAS:
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

9. AGREGACIONES PARA GRÁFICOS:
   - pie: `SELECT <categoría> AS label, SUM(...) AS value`.
   - bar/line: una columna categórica/temporal y una numérica, con alias claros.
   - kpi: una sola fila, una sola columna `metric`.

10. FORMATO DE RESPUESTA:
   - Devuelve ÚNICAMENTE el SQL ejecutable.
   - Sin markdown, sin explicaciones, sin texto adicional.

ESQUEMA DE LA DB:
{json.dumps(schema)}
""".strip()
