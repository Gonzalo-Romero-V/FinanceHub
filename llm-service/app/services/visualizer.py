from app.services.llm.factory import LLMFactory
import json
import uuid

class VisualizerService:
    def __init__(self):
        self.llm = LLMFactory.get_adapter()

    async def determine_widget(self, query_results: list, user_prompt: str, semantic_map_raw: str) -> dict:
        semantic_map = json.loads(semantic_map_raw.replace("```json", "").replace("```", "").strip())
        category = semantic_map.get("category", "DETAIL")

        if not query_results:
            return self._empty_widget(user_prompt)

        # Mapeo directo basado en la categoría semántica (expert rules)
        if category == "TEMPORAL":
            widget_type = "line"
            config = {"xKey": "x", "yKey": "y", "title": "Evolución Temporal"}
        elif category == "DISTRIBUTION":
            widget_type = "pie"
            config = {"categoryKey": "name", "valueKey": "value", "title": "Distribución"}
        elif category == "KPI":
            widget_type = "kpi"
            config = {"metric": query_results[0].get("metric", 0), "title": "Total"}
        else:
            widget_type = "table"
            config = {"title": "Detalle de Movimientos"}

        # Enriquecer con IA para el título y subtexto
        system_prompt = f"Genera un titulo breve y un insight de una linea para este reporte: {user_prompt}. Datos: {json.dumps(query_results[:3])}. Responde JSON: {{\"title\": \"...\", \"insight\": \"...\"}}"
        enrichment_raw = await self.llm.generate_response(system_prompt, "Enriquece widget")
        enrichment = json.loads(enrichment_raw.replace("```json", "").replace("```", "").strip())

        widget = {
            "id": str(uuid.uuid4()),
            "type": widget_type,
            "data": query_results,
            "title": enrichment.get("title", config["title"]),
            "subtext": enrichment.get("insight", ""),
            **config
        }
        
        return {
            "intent": user_prompt,
            "mode": "append",
            "widgets": [widget]
        }

    def _empty_widget(self, intent):
        return {
            "intent": intent,
            "mode": "append",
            "widgets": [{
                "id": str(uuid.uuid4()),
                "type": "table",
                "title": "Sin Resultados",
                "data": [],
                "subtext": "No encontramos datos para esta consulta. Intenta con otros términos."
            }]
        }

visualizer_service = VisualizerService()
