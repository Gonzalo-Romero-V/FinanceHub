import re
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
        
        # Debe empezar con SELECT (después de limpiar espacios y comentarios)
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
<<<<<<< HEAD
Eres un generador experto de SQL para PostgreSQL en una app de finanzas personales.
=======
        Eres un experto generador de SQL para PostgreSQL enfocado en Finanzas.
        Fecha actual del sistema: {current_date}.
>>>>>>> 92ab7cf (feat: enhance LLM context and robustness for improved query handling)

Fecha sistema: 2026-03-27
user_id: {user_id}

<<<<<<< HEAD
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

=======
        Reglas Estrictas de Seguridad y Filtrado:
        1. SEGURIDAD DE USUARIO: DEBES FILTRAR SIEMPRE por user_id = {user_id}.
           - Las tablas 'cuentas' y 'conceptos' tienen la columna 'user_id' directamente.
           - La tabla 'movimientos' NO tiene 'user_id'. Debes hacer JOIN con 'cuentas' (usando cuenta_origen_id o cuenta_destino_id) para filtrar por el user_id del dueño de la cuenta.
           Ejemplo: SELECT m.* FROM movimientos m JOIN cuentas c ON m.cuenta_origen_id = c.id WHERE c.user_id = {user_id}
        2. Temporalidad: Si la meta implica historial o 'todos los registros', NO APLIQUES filtros de fecha. Si es una consulta genérica, asume el mes actual relativo a {current_date}.
        3. Límites: NO utilices LIMIT a menos que se pida explícitamente 'top', 'últimos N', etc.
        4. Agrupación: Para gráficos (bar, line, pie), agrupa por fecha (truncada a día o mes) o por nombre de concepto/cuenta.
        5. KPIs: Devuelve un solo valor numérico con el alias 'metric'.
        6. Formato: Devuelve SOLO el código SQL. Sin bloques markdown, sin explicaciones.

        Esquema (incluyendo FKs para joins): {json.dumps(schema)}
        """
        
        sql = await self.llm.generate_response(system_prompt, f"Prompt: {user_prompt}")
        
        # Limpiar posibles bloques markdown si el LLM ignoró la instrucción
        sql = sql.replace("```sql", "").replace("```", "").strip()
        
        if not self.is_safe(sql):
            raise ValueError(f"SQL No Seguro o Inválido Detectado")
            
>>>>>>> 92ab7cf (feat: enhance LLM context and robustness for improved query handling)
        return sql


sql_gen_service = SQLGenerationService()