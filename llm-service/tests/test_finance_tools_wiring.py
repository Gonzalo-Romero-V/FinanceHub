import unittest
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

import main
from app.core.auth import get_current_user_id


class FinanceToolWiringTests(unittest.TestCase):
    def setUp(self):
        main.app.dependency_overrides[get_current_user_id] = lambda: 7
        self.client = TestClient(main.app)

    def tearDown(self):
        main.app.dependency_overrides.clear()

    def test_tool_widget_bypasses_sql_gen_and_validator(self):
        plan = {
            "dashboard_title": "Deudas",
            "mode": "replace",
            "widgets": [
                {
                    "id_ref": "w1",
                    "type": "table",
                    "title": "Mis deudas",
                    "tool": "resumen_deudas",
                }
            ],
        }
        fake_rows = [{"label": "Auto", "value": 500.0, "acreedor": "Banco X"}]

        with (
            patch.object(
                main.semantic_service, "design_dashboard", new=AsyncMock(return_value=plan)
            ),
            patch.object(main.sql_gen_service, "generate_sql_for_widget") as gen_sql,
            patch("main.get_resumen_deudas", return_value=fake_rows) as tool_fn,
            patch.object(
                main.analyst_service,
                "generate_executive_summary",
                new=AsyncMock(return_value="Tenés una deuda activa."),
            ),
        ):
            response = self.client.post("/api/analyze", json={"prompt": "cuanto debo"})

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(len(body["widgets"]), 1)
        self.assertEqual(body["widgets"][0]["data"], fake_rows)
        gen_sql.assert_not_called()
        tool_fn.assert_called_once()
        # user_id debe venir del token autenticado (7), nunca del prompt/LLM.
        self.assertEqual(tool_fn.call_args.args[0], 7)

    def test_unknown_tool_name_falls_back_to_normal_sql_path(self):
        plan = {
            "dashboard_title": "X",
            "mode": "replace",
            "widgets": [
                {
                    "id_ref": "w1",
                    "type": "table",
                    "title": "X",
                    "tool": "algo_inventado_por_el_llm",
                    "goal": "listar movimientos",
                }
            ],
        }
        with (
            patch.object(
                main.semantic_service, "design_dashboard", new=AsyncMock(return_value=plan)
            ),
            patch.object(
                main.sql_gen_service,
                "generate_sql_for_widget",
                new=AsyncMock(return_value="SELECT 1 AS label, 2 AS value"),
            ) as gen_sql,
            patch.object(main.db_service, "execute_query", return_value=[{"label": 1, "value": 2}]),
            patch.object(
                main.analyst_service,
                "generate_executive_summary",
                new=AsyncMock(return_value="ok"),
            ),
        ):
            response = self.client.post("/api/analyze", json={"prompt": "algo"})

        self.assertEqual(response.status_code, 200)
        gen_sql.assert_called_once()


if __name__ == "__main__":
    unittest.main()
