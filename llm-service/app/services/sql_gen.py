import re
import json
from app.services.llm.factory import LLMFactory
from app.services.database import db_service


class SQLGenerationService:
    def __init__(self):
        self.llm = LLMFactory.get_adapter()
        self.forbidden_keywords = [
            "DROP", "DELETE", "UPDATE", "INSERT",
            "TRUNCATE", "ALTER", "GRANT", "REVOKE"
        ]

    def is_safe(self, sql: str) -> bool:
        clean_sql = re.sub(r'--.*', '', sql)
        clean_sql = re.sub(r'/\*.*?\*/', '', clean_sql, flags=re.DOTALL)

        sql_upper = clean_sql.upper().strip()

        if not sql_upper.startswith("SELECT"):
            return False

        return not any(
            re.search(rf"\b{kw}\b", sql_upper)
            for kw in self.forbidden_keywords
        )

    def _clean_sql(self, sql: str) -> str:
        return sql.replace("```sql", "").replace("```", "").strip()

    async def generate_sql_for_widget(self, widget_spec: dict, user_prompt: str, user_id: int) -> str:
        schema = db_service.get_schema_info(user_id)

        widget_type = widget_spec.get("type", "table")
        goal = widget_spec.get("goal", "")

        # CONTRATO ESTRICTO POR WIDGET
        output_contract = ""

        if widget_type == "kpi":
            output_contract = """
            DEBES devolver EXACTAMENTE:
            SELECT SUM(m.monto) AS metric
            """

        elif widget_type == "pie":
            output_contract = """
            DEBES devolver EXACTAMENTE:
            SELECT <categoria> AS label, SUM(m.monto) AS value
            SOLO dos columnas: label y value
            """

        elif widget_type == "table":
            output_contract = """
            Devuelve columnas tabulares normales con alias claros.
            """

        system_prompt = f"""
Eres un generador experto de SQL para PostgreSQL en una app de finanzas personales.

Fecha sistema: 2026-03-27
user_id: {user_id}

OBJETIVO:
{goal}

TIPO DE WIDGET:
{widget_type}

{output_contract}

ESQUEMA:
- movimientos(id, monto, cuenta_origen_id, cuenta_destino_id, concepto_id, nota, fecha)
- conceptos(id, nombre, user_id, tipo_movimiento_id)
- tipos_movimiento(id, nombre)
- cuentas(id, nombre, user_id)

REGLAS CRÍTICAS:
1. SIEMPRE filtrar por user_id = {user_id}
2. NUNCA usar INSERT, UPDATE, DELETE, DROP
3. Para ingresos: usa cuenta_destino_id
4. Para egresos: usa cuenta_origen_id
5. Evita JOIN con OR (prohibido)
6. Usa JOINs lineales y deterministas
7. NO explicaciones, SOLO SQL limpio

RELACIONES CORRECTAS:
movimientos → conceptos → tipos_movimiento

ESQUEMA DISPONIBLE:
{json.dumps(schema)}
"""

        raw_sql = await self.llm.generate_response(
            system_prompt,
            f"Usuario: {user_prompt}"
        )

        sql = self._clean_sql(raw_sql)

        if not self.is_safe(sql):
            raise ValueError("SQL No Seguro Detectado")

        return sql


sql_gen_service = SQLGenerationService()