"""
Resumen ejecutivo: 2-3 líneas a partir de los widgets producidos.
"""

import json
import logging

from app.services.llm.factory import LLMFactory

log = logging.getLogger(__name__)


class AnalystService:
    def __init__(self):
        self.llm = LLMFactory.get_adapter()

    async def generate_executive_summary(
        self,
        user_prompt: str,
        consolidated_data: list[dict],
    ) -> str:
        system_prompt = """
Eres un Analista Financiero Senior.

Tu tarea: dar una conclusión rápida y valiosa observando el resumen de los
datos generados.

Reglas Estrictas:
1. Sé directo. No saludes. Máximo 2 o 3 líneas.
2. Recibirás metadatos de los widgets, incluido el total real de filas
   ('total_rows_in_db') y solo una MUESTRA (top 3) de los datos.
3. CRÍTICO: NO INVENTES SUMAS NI TOTALES usando la muestra. Si necesitas dar
   cantidad de datos, usa 'total_rows_in_db'.
4. Para listas largas, describe de qué tratan los datos e identifica
   tendencias sólo si la muestra de KPI te lo permite validar.
""".strip()

        data_summary_list = []
        for d in consolidated_data:
            total = d.get("raw_total_records", len(d.get("data", [])))
            data_summary_list.append(
                {
                    "widget_title": d.get("title", ""),
                    "widget_type": d.get("type", ""),
                    "total_rows_in_db": total,
                    "data_sample": d.get("data", [])[:3],
                }
            )

        data_summary = json.dumps(data_summary_list)
        user_context = (
            f"Pregunta del usuario: {user_prompt}\n"
            f"Datos obtenidos para análisis:\n{data_summary}"
        )

        summary = await self.llm.generate_response(system_prompt, user_context)
        return summary.strip()


analyst_service = AnalystService()
