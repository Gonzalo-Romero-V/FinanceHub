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

    - SIEMPRE filtrar por user_id = {user_id}.
    - La forma más directa y segura de filtrar 'movimientos' por usuario es uniendo con 'conceptos' (co.user_id = {user_id}).
    - 'cuentas' también tiene user_id.

2. FILTRADO POR TIPO DE MOVIMIENTO Y CUENTAS:
    - La tabla 'tipos_movimiento' tiene los nombres: 'Ingreso', 'Egreso', 'Transferencia'.
    - **EGRESO (Gasto)**: El dinero SALE. Usar `m.cuenta_origen_id` para identificar la cuenta del usuario.
    - **INGRESO**: El dinero ENTRA. Usar `m.cuenta_destino_id` para identificar la cuenta del usuario.
    - Ejemplo para Egresos por concepto:
      SELECT co.nombre as label, SUM(m.monto) as value 
      FROM movimientos m
      JOIN conceptos co ON m.concepto_id = co.id
      JOIN tipos_movimiento tm ON co.tipo_movimiento_id = tm.id
      WHERE co.user_id = {user_id} AND tm.nombre = 'Egreso'
      GROUP BY co.nombre

3. SEGURIDAD SQL:
    - SOLO SENTENCIAS SELECT.
    - PROHIBIDO: INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE.

4. TEMPORALIDAD Y FECHAS (USAR FECHA DE REFERENCIA: {current_date}):
    - La fecha de referencia es {current_date}.
    - **Hoy**: `fecha::date = '{current_date}'::date`
    - **Ayer**: `fecha::date = ('{current_date}'::date - INTERVAL '1 day')::date`
    - **Mes actual**: `EXTRACT(MONTH FROM fecha) = EXTRACT(MONTH FROM '{current_date}'::date) AND EXTRACT(YEAR FROM fecha) = EXTRACT(YEAR FROM '{current_date}'::date)`
    - **Mes anterior**: `fecha >= DATE_TRUNC('month', '{current_date}'::date - INTERVAL '1 month') AND fecha < DATE_TRUNC('month', '{current_date}'::date)`
    - **Historial / Todos**: No aplicar filtros de fecha.
    - **Si no se especifica fecha**: Asumir el mes actual.

5. AGRUPACIÓN PARA GRÁFICOS:
    - Para 'pie': devolver 'label' y 'value'.
    - Para 'line'/'bar': agrupar por fecha o categoría según el 'goal'.

6. FORMATO DE SALIDA:
    - Devuelve ÚNICAMENTE el código SQL ejecutable.
    - Sin bloques markdown, sin explicaciones.

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