from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uuid
import json

from app.services.semantic import semantic_service 
from app.services.sql_gen import sql_gen_service
from app.services.database import db_service
from app.services.analyst import analyst_service
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

app = FastAPI(title=settings.APP_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeRequest(BaseModel):
    prompt: str

@app.post("/api/analyze")
async def analyze(request: AnalyzeRequest):
    try:
        # 1. DISEÑO
        plan = await semantic_service.design_dashboard(request.prompt)
        
        final_widgets = []
        
        # 2. EJECUCIÓN
        for spec in plan.get("widgets", []):
            try:
                sql = await sql_gen_service.generate_sql_for_widget(spec, request.prompt)
                results = db_service.execute_query(sql)
                
                if results or spec["type"] == "table":
                    safe_results = results[:500] if results else []
                    
                    widget = {
                        "id": str(uuid.uuid4()),
                        "type": spec["type"],
                        "title": spec.get("goal", "Reporte"),
                        "data": safe_results,
                        "raw_total_records": len(results) if results else 0,
                    }
                    
                    # Manejo minimalista de KPI: busca 'metric' o el primer valor de la primera fila
                    if spec["type"] == "kpi" and results:
                        first_row = results[0]
                        val = first_row.get("metric") or list(first_row.values())[0]
                        widget["metric"] = val if val is not None else 0
                        
                    final_widgets.append(widget)
            except Exception as e:
                print(f"Error procesando widget {spec['id_ref']}: {e}")

        # 3. ANÁLISIS
        summary = "No se encontraron datos suficientes para un análisis detallado."
        if final_widgets:
            summary = await analyst_service.generate_executive_summary(request.prompt, final_widgets)

        return {
            "intent": request.prompt,
            "dashboard_title": plan.get("dashboard_title", "Análisis Financiero"),
            "summary": summary,
            "mode": plan.get("mode", "append"),
            "widgets": final_widgets
        }
        
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=settings.PORT)
