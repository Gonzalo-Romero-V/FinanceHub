import re
import json
from datetime import datetime
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
        # Eliminar comentarios antes de validar
        clean_sql = re.sub(r'--.*', '', sql)
        clean_sql = re.sub(r'/\*.*?\*/', '', clean_sql, flags=re.DOTALL)

        sql_upper = clean_sql.upper().strip()

        if not sql_upper.startswith("SELECT"):
            return False

        for keyword in self.forbidden_keywords:
            if re.search(rf"\b{keyword}\b", sql_upper):
                return False

        return True

    async def generate_sql_for_widget(self, widget_spec: dict, user_prompt: str, user_id: int) -> str:
        schema = db_service.get_schema_info(user_id)

        widget_type = widget_spec.get("type", "table")
        goal = widget_spec.get("goal", "")
        current_date = datetime.now().strftime("%Y-%m-%d")

        # Contrato por widget
        output_contract = ""

        if widget_type == "kpi":
            output_contract = "Debe devolver un único valor numérico con alias 'metric'."

        elif widget_type == "pie":
            output_contract = "Debe devolver dos columnas: label y value."

        elif widget_type == "table":
            output_contract = "Debe devolver columnas tabulares con alias claros."

        system_prompt = f"""
Eres un experto generador de SQL para PostgreSQL enfocado en finanzas personales.

Fecha actual del sistema: {current_date}
user_id: {user_id}

OBJETIVO:
{goal}

TIPO DE WIDGET:
{widget_type}

REGLAS DE SALIDA:
{output_contract}

REGLAS ESTRICTAS:

1. SEGURIDAD DE USUARIO:
   - SIEMPRE filtrar por user_id = {user_id}
   - 'cuentas' y 'conceptos' tienen user_id directo
   - 'movimientos' requiere JOIN con 'cuentas'
   Ejemplo:
   SELECT m.* FROM movimientos m
   JOIN cuentas c ON m.cuenta_origen_id = c.id
   WHERE c.user_id = {user_id}

2. SEGURIDAD SQL:
   - SOLO SELECT
   - PROHIBIDO: INSERT, UPDATE, DELETE, DROP, ALTER

3. TEMPORALIDAD:
   - Si no se especifica, asumir mes actual
   - Si se pide historial, no filtrar por fecha

4. AGRUPACIÓN:
   - Para gráficos: agrupar por fecha o categoría

5. FORMATO:
   - SOLO SQL
   - Sin markdown
   - Sin explicaciones

ESQUEMA (con relaciones):
{json.dumps(schema)}
"""

        sql = await self.llm.generate_response(system_prompt, f"Prompt: {user_prompt}")

        # Limpieza básica
        sql = sql.replace("```sql", "").replace("```", "").strip()

        if not self.is_safe(sql):
            raise ValueError("SQL No Seguro o Inválido Detectado")

        return sql


sql_gen_service = SQLGenerationService()