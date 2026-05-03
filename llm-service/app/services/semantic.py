from app.services.database import db_service
from app.services.llm.factory import LLMFactory
from app.utils.json_helper import extract_json
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
           - Si pide "egresos de ayer": Crea un widget de tipo adecuado (pie, bar o table) con el objetivo de mostrar gastos del día anterior.
           - Si pide un "gráfico de pastel por [categoría]": Agrupa siempre por esa categoría (ej. concepto).
           - Si pide un resumen general: Combina KPI (Total), Gráfico (Distribución) y Tabla (Detalle).
        3. Objetivos (goals) ULTRA-ESPECÍFICOS:
           - Mal: "Egresos de ayer"
           - Bien: "Sumar montos de movimientos de tipo Egreso realizados ayer, agrupados por el nombre del concepto"
           - Bien: "Listar los 10 movimientos más recientes con su concepto y cuenta"
        4. Identificación de tiempos:
           - "hoy", "ayer", "este mes", "mes pasado", "histórico".
        5. La estructura de la base de datos es relacional. Usa los nombres de las tablas y columnas del esquema.

        Esquema: {json.dumps(schema)}
        
        Responde SOLO JSON con este formato:
        {{
          "dashboard_title": "...",
          "mode": "replace | append",
          "widgets": [
            {{ "id_ref": "w1", "type": "kpi | line | bar | pie | table", "goal": "..." }}
          ]
        }}
        """
        
        response_raw = await self.llm.generate_response(system_prompt, user_prompt)
        return extract_json(response_raw)

semantic_service = PlannerService()
