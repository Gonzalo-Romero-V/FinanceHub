import re
from app.services.llm.factory import LLMFactory
from app.services.database import db_service
import json

class SQLGenerationService:
    def __init__(self):
        self.llm = LLMFactory.get_adapter()
        self.forbidden_keywords = ["DROP", "DELETE", "UPDATE", "INSERT", "TRUNCATE", "ALTER", "GRANT", "REVOKE"]

    def is_safe(self, sql: str) -> bool:
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

        system_prompt = f"""
        Eres un experto generador de SQL para PostgreSQL enfocado en Finanzas.
        Fecha del sistema: 2026-03-27.

        Objetivo: Generar SQL para un widget tipo '{widget_type}'.
        Meta: {goal}

        Reglas Estrictas:
        1. SEGURIDAD DE USUARIO: DEBES FILTRAR SIEMPRE POR user_id = {user_id} en todas las tablas que contengan esta columna (cuentas, conceptos, movimientos). Esto es MANDATORIO para la privacidad de datos.
        2. Temporalidad: Si la meta implica historial o 'todos los registros', NO APLIQUES ningún filtro temporal. Solo asume el mes actual (Marzo 2026) si la consulta es genérica o pide explícitamente contexto presente.
        3. Límites: NO utilices la cláusula LIMIT a menos que el usuario pida explícitamente 'los N principales', 'top' o limite la cantidad de resultados.
        4. Agrupación: Para gráficos, agrupa pertinentemente por fecha o categoría.
        5. KPIs: Devuelve un solo valor numérico bajo un alias (ej. 'metric').
        6. Formato: Devuelve STRICTAMENTE y solo el código SQL ejecutable, sin explicaciones ni bloques Markdown.

        Esquema: {json.dumps(schema)}
        """
        
        sql = await self.llm.generate_response(system_prompt, f"Prompt del usuario: {user_prompt}")
        sql = sql.replace("```sql", "").replace("```", "").strip()
        
        if not self.is_safe(sql):
            raise ValueError(f"SQL No Seguro Detectado")
            
        return sql

sql_gen_service = SQLGenerationService()
