from app.services.database import db_service
from app.services.llm.factory import LLMFactory
import json

class PlannerService:
    def __init__(self):
        self.llm = LLMFactory.get_adapter()

    async def design_dashboard(self, user_prompt: str, user_id: int) -> dict:
        schema = db_service.get_schema_info(user_id)
        
        system_prompt = f"""
        Eres un Diseñador de Dashboards de BI para Finanzas Personales.
        Tu misión es interpretar la solicitud del usuario y planificar los widgets necesarios.

        Reglas Clave:
        1. Determina el 'mode': 'replace' para consultas o tableros nuevos; 'append' para seguimientos.
        2. Analiza la intención:
           - Si pide un dato específico, histórico o tabla (ej. "todos los movimientos históricos"): Devuelve UN SOLO widget del tipo adecuado (table) y pon de título exactamente lo pedido (ej. "Todos los Movimientos Históricos").
           - Si pide un reporte GENERAL (ej. "dime cómo voy"): Incluye varios widgets como un KPI, un gráfico y una tabla.
        3. Sé ultra específico en los 'goals' (el objetivo que el generador SQL debe cumplir). Si el usuario pide todo el histórico, indícalo expresamente.
        4. No supongas límites de tiempo si el usuario pide historial o "todos", pero asume el mes actual si la consulta es genérica.

        Esquema: {json.dumps(schema)}
        
        Responde SOLO JSON:
        {{
          "dashboard_title": "...",
          "mode": "replace | append",
          "widgets": [
            {{ "id_ref": "w1", "type": "kpi | line | bar | pie | table", "goal": "..." }}
          ]
        }}
        """
        
        response_raw = await self.llm.generate_response(system_prompt, user_prompt)
        clean_json = response_raw.replace("```json", "").replace("```", "").strip()
        return json.loads(clean_json)

semantic_service = PlannerService()
