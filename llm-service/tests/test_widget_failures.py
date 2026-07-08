import unittest
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

import main
from app.core.auth import get_current_user_id
from app.core.failures import FAILURE_MESSAGES, WidgetFailureReason
from app.services.sql_validator import SqlValidationError


class WidgetFailureTests(unittest.TestCase):
    def setUp(self):
        main.app.dependency_overrides[get_current_user_id] = lambda: 7
        self.client = TestClient(main.app)

    def tearDown(self):
        main.app.dependency_overrides.clear()

    def test_planner_failure_returns_no_entendido_without_calling_sql_gen(self):
        with (
            patch.object(
                main.semantic_service,
                "design_dashboard",
                new=AsyncMock(side_effect=RuntimeError("boom")),
            ),
            patch.object(main.sql_gen_service, "generate_sql_for_widget") as gen_sql,
        ):
            response = self.client.post("/api/analyze", json={"prompt": "algo raro"})

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["widgets"], [])
        self.assertEqual(body["summary"], FAILURE_MESSAGES[WidgetFailureReason.NO_ENTENDIDO])
        gen_sql.assert_not_called()

    def test_single_widget_blocked_table_returns_tabla_no_disponible(self):
        plan = {
            "dashboard_title": "Deudas",
            "mode": "replace",
            "widgets": [{"id_ref": "w1", "type": "table", "title": "Deudas", "goal": "listar deudas"}],
        }
        with (
            patch.object(
                main.semantic_service,
                "design_dashboard",
                new=AsyncMock(return_value=plan),
            ),
            patch.object(
                main.sql_gen_service,
                "generate_sql_for_widget",
                new=AsyncMock(
                    side_effect=SqlValidationError(
                        "Tablas no permitidas en el FROM/JOIN: {'deudas'}."
                    )
                ),
            ),
        ):
            response = self.client.post("/api/analyze", json={"prompt": "cuanto debo"})

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["widgets"], [])
        self.assertEqual(
            body["summary"], FAILURE_MESSAGES[WidgetFailureReason.TABLA_NO_DISPONIBLE]
        )

    def test_missing_token_still_returns_401_not_generic_500(self):
        main.app.dependency_overrides.clear()
        response = self.client.post("/api/analyze", json={"prompt": "hola"})
        self.assertEqual(response.status_code, 401)
        self.assertIn("detail", response.json())


if __name__ == "__main__":
    unittest.main()
