"""
Extrae los campos de un movimiento (tipo, concepto, cuenta(s), monto, nota) a
partir de un texto transcrito por voz, resolviendo concepto/cuenta contra los
datos REALES del usuario — el LLM nunca puede inventar un id: solo puede
elegir entre los conceptos/cuentas que efectivamente pertenecen al `user_id`
resuelto por la dependencia de autenticación (nunca por el texto del usuario).
"""

from __future__ import annotations

import json
import logging
from typing import Any, Optional

from sqlalchemy import text

from app.services.database import db_service
from app.services.llm.factory import LLMFactory
from app.utils.json_helper import extract_json

log = logging.getLogger(__name__)

REQUIRED_BY_TIPO: dict[str, list[str]] = {
    "Ingreso": ["tipo", "concepto_id", "cuenta_destino_id", "monto"],
    "Egreso": ["tipo", "concepto_id", "cuenta_origen_id", "monto"],
    "Transferencia": ["tipo", "concepto_id", "cuenta_origen_id", "cuenta_destino_id", "monto"],
}

FIELD_QUESTIONS: dict[str, str] = {
    "tipo": "¿Es un ingreso, un egreso o una transferencia?",
    "concepto_id": "¿A qué categoría o concepto corresponde?",
    "cuenta_origen_id": "¿Desde qué cuenta sale el dinero?",
    "cuenta_destino_id": "¿A qué cuenta entra el dinero?",
    "monto": "¿Cuál fue el monto?",
}


def _fetch_conceptos(user_id: int) -> list[dict[str, Any]]:
    query = text(
        "SELECT c.id, c.nombre, c.parent_id, tm.nombre AS tipo "
        "FROM conceptos AS c "
        "JOIN tipos_movimiento AS tm ON tm.id = c.tipo_movimiento_id "
        "WHERE c.user_id = :uid"
    )
    with db_service.engine.connect() as conn:
        rows = conn.execute(query, {"uid": user_id}).mappings().all()
    return [dict(r) for r in rows]


def _fetch_cuentas(user_id: int) -> list[dict[str, Any]]:
    query = text("SELECT id, nombre FROM cuentas WHERE user_id = :uid AND activa = true")
    with db_service.engine.connect() as conn:
        rows = conn.execute(query, {"uid": user_id}).mappings().all()
    return [dict(r) for r in rows]


async def parse_movimiento(
    user_id: int,
    texto: str,
    estado_previo: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    conceptos = _fetch_conceptos(user_id)
    cuentas = _fetch_cuentas(user_id)
    state_fields = (
        "tipo", "concepto_id", "cuenta_origen_id", "cuenta_destino_id", "monto", "nota"
    )
    previous = {field: (estado_previo or {}).get(field) for field in state_fields}

    llm = LLMFactory.get_adapter()
    system_prompt = f"""
Extraés los datos de un movimiento financiero a partir de lo que dice un
usuario por voz. NUNCA inventes un concepto o cuenta que no esté en las
listas de abajo — son las únicas reales de este usuario.

CONCEPTOS DEL USUARIO (id, nombre, parent_id): {json.dumps(conceptos, ensure_ascii=False)}
CUENTAS DEL USUARIO (id, nombre): {json.dumps(cuentas, ensure_ascii=False)}

ESTADO PREVIO (datos ya confirmados en un turno anterior de este mismo
registro; el texto nuevo puede completar un dato faltante o corregir uno
previo): {json.dumps(previous, ensure_ascii=False)}

Reglas:
- "tipo" es exactamente uno de: "Ingreso", "Egreso", "Transferencia".
- "concepto_id" DEBE ser el id real de uno de los conceptos de arriba
  (matcheá por nombre lo más parecido posible; nunca inventes un id).
- "cuenta_origen_id"/"cuenta_destino_id" DEBEN ser ids reales de las cuentas
  de arriba. Egreso usa cuenta_origen; Ingreso usa cuenta_destino;
  Transferencia usa ambas.
- "monto" es un número positivo (sin símbolo de moneda).
- "nota" es opcional, texto libre breve.
- Si un dato no se menciona en el texto nuevo NI estaba en el estado previo,
  dejalo en null. Si el texto nuevo contradice el estado previo, el texto
  nuevo tiene prioridad (el usuario está corrigiendo ese dato).

Responde SOLO con JSON:
{{"tipo": "..." o null, "concepto_id": entero o null, "cuenta_origen_id": entero o null,
  "cuenta_destino_id": entero o null, "monto": numero o null, "nota": "..." o null}}
""".strip()

    raw = await llm.generate_response(system_prompt, texto)
    extracted = extract_json(raw)

    # El estado previo se conserva del lado servidor aunque el LLM omita un
    # campo en la respuesta del turno nuevo. Un valor nuevo no nulo lo corrige.
    estado: dict[str, Any] = {
        field: extracted.get(field)
        if extracted.get(field) is not None
        else previous.get(field)
        for field in state_fields
    }

    # Blindaje: solo se aceptan ids que existan realmente entre los
    # conceptos/cuentas de ESTE usuario, sin importar lo que haya devuelto el
    # LLM (defensa adicional a que el LLM ya sólo vio esas listas).
    concepto_ids = {c["id"] for c in conceptos}
    cuenta_ids = {c["id"] for c in cuentas}
    if estado["concepto_id"] not in concepto_ids:
        estado["concepto_id"] = None
    if estado["cuenta_origen_id"] not in cuenta_ids:
        estado["cuenta_origen_id"] = None
    if estado["cuenta_destino_id"] not in cuenta_ids:
        estado["cuenta_destino_id"] = None
    if estado["tipo"] not in REQUIRED_BY_TIPO:
        estado["tipo"] = None

    selected_concept = next(
        (concepto for concepto in conceptos if concepto["id"] == estado["concepto_id"]),
        None,
    )
    if selected_concept:
        if estado["tipo"] is None:
            estado["tipo"] = selected_concept["tipo"]
        elif selected_concept["tipo"] != estado["tipo"]:
            # El concepto determina la semantica real del movimiento en Laravel.
            # Ante una contradiccion, pedir un concepto correcto en vez de guardar
            # un ingreso como egreso (o viceversa).
            estado["concepto_id"] = None

    if (
        estado["tipo"] == "Transferencia"
        and estado["cuenta_origen_id"] is not None
        and estado["cuenta_origen_id"] == estado["cuenta_destino_id"]
    ):
        estado["cuenta_destino_id"] = None
    if (
        isinstance(estado["monto"], bool)
        or not isinstance(estado["monto"], (int, float))
        or estado["monto"] <= 0
    ):
        estado["monto"] = None

    tipo = estado["tipo"]
    required = REQUIRED_BY_TIPO.get(tipo, ["tipo"])
    faltantes = [f for f in required if not estado.get(f)]
    pregunta = FIELD_QUESTIONS[faltantes[0]] if faltantes else None

    concepto_nombre = next((c["nombre"] for c in conceptos if c["id"] == estado["concepto_id"]), "")
    cuenta_origen_nombre = next((c["nombre"] for c in cuentas if c["id"] == estado["cuenta_origen_id"]), "")
    cuenta_destino_nombre = next((c["nombre"] for c in cuentas if c["id"] == estado["cuenta_destino_id"]), "")

    return {
        "estado": {
            **estado,
            "concepto_nombre": concepto_nombre,
            "cuenta_origen_nombre": cuenta_origen_nombre,
            "cuenta_destino_nombre": cuenta_destino_nombre,
        },
        "faltantes": faltantes,
        "pregunta": pregunta,
        "completo": not faltantes,
    }
