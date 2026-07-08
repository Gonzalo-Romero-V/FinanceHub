import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.database import DatabaseService
from app.services.semantic import PlannerService
from app.services.sql_gen import _build_prompt, _output_contract_for


class ConceptSampleTests(unittest.TestCase):
    def test_concept_samples_include_hierarchy_and_color(self):
        service = DatabaseService.__new__(DatabaseService)
        service.engine = MagicMock()
        connection = service.engine.connect.return_value.__enter__.return_value
        connection.execute.return_value = [
            ("Alimentación", None, "#22c55e"),
            ("Restaurantes", 10, None),
        ]

        samples = service._fetch_samples("conceptos", user_id=7)

        self.assertEqual(
            samples,
            [
                {"nombre": "Alimentación", "parent_id": None, "color": "#22c55e"},
                {"nombre": "Restaurantes", "parent_id": 10, "color": None},
            ],
        )
        sql = str(connection.execute.call_args.args[0])
        self.assertIn("SELECT nombre, parent_id, color FROM conceptos", sql)
        self.assertEqual(connection.execute.call_args.args[1], {"uid": 7})


class ConceptHierarchyPromptTests(unittest.IsolatedAsyncioTestCase):
    def test_concept_category_contract_requires_exact_name_and_id(self):
        for widget_type in ("pie", "bar", "line"):
            contract = _output_contract_for(widget_type)
            self.assertIn("`concepto_id`", contract)
            self.assertIn("exactamente `conceptos.nombre AS label`", contract)
            self.assertIn("sin concatenar", contract)

    async def test_planner_receives_hierarchy_semantics(self):
        service = PlannerService.__new__(PlannerService)
        service.llm = AsyncMock()
        service.llm.generate_response.return_value = '{"widgets": []}'

        with patch("app.services.semantic.db_service.get_schema_info", return_value={}):
            await service.design_dashboard(
                "¿Cuánto gasté en alimentación?",
                user_id=7,
                client_timezone="America/Guayaquil",
                today_iso="2026-07-07",
            )

        system_prompt = service.llm.generate_response.await_args.args[0]
        self.assertIn("`parent_id IS NULL`", system_prompt)
        self.assertIn("incluye los movimientos de la raíz y de todas sus hijas", system_prompt)
        self.assertIn("desglose por subcategoría", system_prompt)

    def test_sql_prompt_contains_root_aggregation_rule_and_example(self):
        prompt = _build_prompt(
            schema={},
            widget_type="pie",
            goal="Agrupar egresos por concepto raíz",
            output_contract="label y value",
            today_iso="2026-07-07",
            client_timezone="America/Guayaquil",
        )

        self.assertIn("JERARQUÍA DE CONCEPTOS", prompt)
        self.assertIn("COALESCE(co.parent_id, co.id)", prompt)
        self.assertIn("raiz.id AS concepto_id, raiz.nombre AS label", prompt)
        self.assertIn("`co.id`/`co.nombre`", prompt)
        self.assertIn("WHERE co.user_id = :uid", prompt)
        self.assertIn("AND raiz.user_id = :uid", prompt)
        self.assertIn("date_trunc('month'", prompt)
        self.assertIn("desglose por subcategoría", prompt)


if __name__ == "__main__":
    unittest.main()
