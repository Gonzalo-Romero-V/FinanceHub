import unittest
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

import main
from app.core.auth import get_current_user_id
from app.core.failures import FAILURE_MESSAGES, WidgetFailureReason


EMPTY_PLAN = {"dashboard_title": "Nada", "mode": "replace", "widgets": []}


class AutoDiscoveryTests(unittest.TestCase):
    def setUp(self):
        main.app.dependency_overrides[get_current_user_id] = lambda: 7
        self.client = TestClient(main.app)

    def tearDown(self):
        main.app.dependency_overrides.clear()

    def test_uses_second_reformulation_when_first_fails(self):
        second_plan = {
            "dashboard_title": "Distribución",
            "mode": "replace",
            "widgets": [
                {
                    "id_ref": "w1",
                    "type": "pie",
                    "title": "Gastos por categoría",
                    "goal": "distribución de egresos",
                }
            ],
        }

        design_dashboard_calls = []

        async def fake_design_dashboard(prompt, user_id, client_timezone, today_iso, strategy_hint=None):
            design_dashboard_calls.append(strategy_hint)
            # Falla en el intento inicial (hint=None) y en la 1ra reformulación;
            # recién la 2da reformulación (3ra llamada total) produce datos.
            if len(design_dashboard_calls) == 3:
                return second_plan
            return EMPTY_PLAN

        with (
            patch.object(main.semantic_service, "design_dashboard", new=fake_design_dashboard),
            patch.object(
                main.sql_gen_service,
                "generate_sql_for_widget",
                new=AsyncMock(return_value="SELECT co.nombre AS label, 1 AS value"),
            ),
            patch.object(
                main.db_service,
                "execute_query",
                return_value=[{"label": "Alimentación", "value": 42}],
            ),
            patch.object(
                main.analyst_service,
                "generate_executive_summary",
                new=AsyncMock(return_value="Gastaste 42 en Alimentación."),
            ),
        ):
            response = self.client.post("/api/analyze", json={"prompt": "algo ambiguo"})

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(len(body["widgets"]), 1)
        self.assertTrue(body["widgets"][0]["auto_discovery"])
        self.assertEqual(body["dashboard_title"], "Resultado aproximado")
        # 1 intento inicial + 2 reformulaciones hasta encontrar datos
        self.assertEqual(len(design_dashboard_calls), 3)

    def test_all_reformulations_fail_falls_back_to_no_entendido(self):
        with (
            patch.object(
                main.semantic_service,
                "design_dashboard",
                new=AsyncMock(return_value=EMPTY_PLAN),
            ),
        ):
            response = self.client.post("/api/analyze", json={"prompt": "algo imposible"})

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["widgets"], [])
        self.assertEqual(body["summary"], FAILURE_MESSAGES[WidgetFailureReason.NO_ENTENDIDO])


if __name__ == "__main__":
    unittest.main()
