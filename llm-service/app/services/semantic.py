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

        CONTEXTO FINANCIERO:
        - Los movimientos están clasificados por tipo (tipos_movimiento): 
          * tipo_id=1: INGRESOS (dinero entrante)
          * tipo_id=2: EGRESOS (dinero saliente)
          * tipo_id=3: TRANSFERENCIAS (movimientos internos)
        - Cada movimiento tiene una cuenta origen y destino
        - Los conceptos categorizan movimientos (Salario, Alimentación, etc.)

        Reglas Clave:
        1. Determina el 'mode': 'replace' para consultas o tableros nuevos; 'append' para seguimientos.
        2. Analiza la intención:
           - Si pide "ingresos vs egresos", "pie de ingresos y egresos": Crea un pie chart agrupando por tipo_movimiento (1=Ingresos, 2=Egresos)
           - Si pide datos específicos, histórico o tabla: Devuelve UN SOLO widget del tipo adecuado
           - Si pide un reporte GENERAL: Incluye varios widgets (KPI, gráfico, tabla)
        3. Sé ultra específico en los 'goals' del SQL. Ejemplos:
           - "Agregar montos de movimientos por tipo_movimiento (Ingresos vs Egresos)"
           - "Contar movimientos agrupados por concepto"
        4. No supongas límites de tiempo si el usuario pide historial o "todos"

        Esquema: {json.dumps(schema)}
        
        Responde SOLO JSON (sin bloques markdown):
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
