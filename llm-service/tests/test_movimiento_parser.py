import json
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services import movimiento_parser as mp

CONCEPTOS = [
    {"id": 1, "nombre": "Alimentación", "parent_id": None, "tipo": "Egreso"},
    {"id": 2, "nombre": "Restaurantes", "parent_id": 1, "tipo": "Egreso"},
]
CUENTAS = [
    {"id": 10, "nombre": "Efectivo"},
    {"id": 11, "nombre": "Banco X"},
]


def _patched(llm_json: dict):
    llm = MagicMock()
    llm.generate_response = AsyncMock(return_value=json.dumps(llm_json))
    return (
        patch.object(mp, "_fetch_conceptos", return_value=CONCEPTOS),
        patch.object(mp, "_fetch_cuentas", return_value=CUENTAS),
        patch.object(mp.LLMFactory, "get_adapter", return_value=llm),
    )


class ParseMovimientoTests(unittest.IsolatedAsyncioTestCase):
    async def test_complete_extraction_marks_completo_true(self):
        llm_json = {
            "tipo": "Egreso",
            "concepto_id": 2,
            "cuenta_origen_id": 10,
            "cuenta_destino_id": None,
            "monto": 15.5,
            "nota": None,
        }
        p1, p2, p3 = _patched(llm_json)
        with p1, p2, p3:
            result = await mp.parse_movimiento(user_id=7, texto="gasté 15.50 en restaurantes con efectivo")

        self.assertTrue(result["completo"])
        self.assertEqual(result["faltantes"], [])
        self.assertIsNone(result["pregunta"])
        self.assertEqual(result["estado"]["concepto_nombre"], "Restaurantes")
        self.assertEqual(result["estado"]["cuenta_origen_nombre"], "Efectivo")

    async def test_missing_monto_returns_targeted_question(self):
        llm_json = {
            "tipo": "Egreso",
            "concepto_id": 1,
            "cuenta_origen_id": 10,
            "cuenta_destino_id": None,
            "monto": None,
            "nota": None,
        }
        p1, p2, p3 = _patched(llm_json)
        with p1, p2, p3:
            result = await mp.parse_movimiento(user_id=7, texto="gasté en comida con efectivo")

        self.assertFalse(result["completo"])
        self.assertEqual(result["faltantes"], ["monto"])
        self.assertEqual(result["pregunta"], mp.FIELD_QUESTIONS["monto"])

    async def test_llm_invented_id_outside_user_data_is_discarded(self):
        # El LLM devuelve un concepto_id que NO pertenece a este usuario
        # (ej. alucinación, o intento de referenciar datos de otro usuario).
        llm_json = {
            "tipo": "Egreso",
            "concepto_id": 999,
            "cuenta_origen_id": 10,
            "cuenta_destino_id": None,
            "monto": 20,
            "nota": None,
        }
        p1, p2, p3 = _patched(llm_json)
        with p1, p2, p3:
            result = await mp.parse_movimiento(user_id=7, texto="algo")

        self.assertIsNone(result["estado"]["concepto_id"])
        self.assertFalse(result["completo"])
        self.assertIn("concepto_id", result["faltantes"])

    async def test_estado_previo_is_forwarded_to_prompt(self):
        llm_json = {
            "tipo": "Egreso",
            "concepto_id": 1,
            "cuenta_origen_id": 10,
            "cuenta_destino_id": None,
            "monto": 30,
            "nota": None,
        }
        llm = MagicMock()
        llm.generate_response = AsyncMock(return_value=json.dumps(llm_json))
        with (
            patch.object(mp, "_fetch_conceptos", return_value=CONCEPTOS),
            patch.object(mp, "_fetch_cuentas", return_value=CUENTAS),
            patch.object(mp.LLMFactory, "get_adapter", return_value=llm),
        ):
            await mp.parse_movimiento(
                user_id=7,
                texto="30 dolares",
                estado_previo={"tipo": "Egreso", "concepto_id": 1, "cuenta_origen_id": 10},
            )

        system_prompt = llm.generate_response.await_args.args[0]
        self.assertIn('"concepto_id": 1', system_prompt)

    async def test_previous_state_survives_nulls_from_followup(self):
        llm_json = {
            "tipo": None,
            "concepto_id": None,
            "cuenta_origen_id": None,
            "cuenta_destino_id": None,
            "monto": 30,
            "nota": None,
        }
        p1, p2, p3 = _patched(llm_json)
        with p1, p2, p3:
            result = await mp.parse_movimiento(
                user_id=7,
                texto="fueron 30 dolares",
                estado_previo={"tipo": "Egreso", "concepto_id": 1, "cuenta_origen_id": 10},
            )

        self.assertTrue(result["completo"])
        self.assertEqual(result["estado"]["concepto_id"], 1)
        self.assertEqual(result["estado"]["cuenta_origen_id"], 10)
        self.assertEqual(result["estado"]["monto"], 30)

    async def test_concept_with_incompatible_type_is_rejected(self):
        llm_json = {
            "tipo": "Ingreso",
            "concepto_id": 1,
            "cuenta_origen_id": None,
            "cuenta_destino_id": 11,
            "monto": 50,
            "nota": None,
        }
        p1, p2, p3 = _patched(llm_json)
        with p1, p2, p3:
            result = await mp.parse_movimiento(user_id=7, texto="recibi 50")

        self.assertIsNone(result["estado"]["concepto_id"])
        self.assertIn("concepto_id", result["faltantes"])


if __name__ == "__main__":
    unittest.main()
