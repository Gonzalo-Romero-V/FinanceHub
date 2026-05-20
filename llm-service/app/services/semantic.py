"""
Planner: traduce el prompt del usuario en una lista de widget specs.
"""

import json
import logging

from app.services.database import db_service
from app.services.llm.factory import LLMFactory
from app.utils.json_helper import extract_json

log = logging.getLogger(__name__)


class PlannerService:
    def __init__(self):
        self.llm = LLMFactory.get_adapter()

    async def design_dashboard(
        self,
        user_prompt: str,
        user_id: int,
        client_timezone: str,
        today_iso: str,
    ) -> dict:
        schema = db_service.get_schema_info(user_id)

        # Usamos {{ y }} para escapar las llaves en el f-string
        system_prompt = f"""
Eres un diseñador de dashboards de BI para finanzas personales. Tu trabajo es
interpretar la solicitud del usuario y planificar los widgets necesarios.

CONTEXTO TEMPORAL:
- Hoy (en TZ del usuario): {today_iso}
- Zona horaria del usuario: {client_timezone}
- La fecha "hoy", "ayer", "este mes", etc. siempre se interpreta en la TZ del
  usuario, no en UTC.

CONTEXTO FINANCIERO:
- `tipos_movimiento.nombre`: 'Ingreso' (dinero entra) | 'Egreso' (dinero sale) |
  'Transferencia' (movimiento interno entre cuentas del propio usuario).
- Cada `movimiento` tiene `cuenta_origen_id` y/o `cuenta_destino_id`. La cuenta
  relevante depende del tipo:
    Ingreso       → cuenta_destino
    Egreso        → cuenta_origen
    Transferencia → ambas
- Los `conceptos` clasifican los movimientos (Salario, Alimentación, etc.).

REGLAS DE PLANIFICACIÓN:
1. Determina el `mode`:
   - 'replace' para consultas o tableros nuevos.
   - 'append' para seguimientos o agregar info.
2. Objetivos (`goal`) ULTRA-ESPECÍFICOS, no genéricos:
   - Mal: "Egresos de ayer".
   - Bien: "Sumar montos de movimientos cuyo concepto sea de tipo 'Egreso',
           filtrados a fecha ayer en la TZ del usuario, agrupados por nombre
           del concepto".
3. Si el usuario pide un resumen general, combina KPI (total), gráfico
   (distribución) y tabla (detalle).
4. Identificación temporal admitida: 'hoy', 'ayer', 'este mes', 'mes pasado',
   'últimos N días', 'histórico'. Si no se especifica, asumir 'mes actual'.
5. La base es relacional: usa los nombres de las tablas y columnas del esquema.

ESQUEMA DE LA DB:
{json.dumps(schema)}

FORMATO DE LOS NÚMEROS (`value_format`):
Cada widget debe declarar cómo se interpretan sus valores numéricos:
- "currency": montos en USD (SIEMPRE usar para sumas de dinero, saldos, balances, ingresos, egresos).
- "percent":  proporciones o shares (usar SÓLO si el SQL ya calcula el porcentaje de 0 a 100).
- "integer":  conteos sin decimales (cantidad de movimientos, transacciones).
- "number":   numéricos genéricos con decimales.

Regla de oro para Gráficos de Pastel:
- Si el usuario pide "distribución en USD", usar "currency". El componente calculará los % visuales automáticamente.
- Si el usuario pide "proporción" o "porcentaje", el SQL debe calcular el share y el formato debe ser "percent".
- NUNCA uses "percent" para montos de dinero directos.

Responde SOLO con JSON con este formato exacto:
{{
  "dashboard_title": "...",
  "mode": "replace" | "append",
  "widgets": [
    {{
      "id_ref": "w1",
      "type": "kpi" | "line" | "bar" | "pie" | "table",
      "title": "Breve título descriptivo (ej. 'Egresos por Categoría')",
      "goal": "...",
      "value_format": "currency" | "percent" | "integer" | "number" | "auto"
    }}
  ]
}}
""".strip()

        response_raw = await self.llm.generate_response(system_prompt, user_prompt)
        return extract_json(response_raw)


semantic_service = PlannerService()
