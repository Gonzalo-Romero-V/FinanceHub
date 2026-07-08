import unittest
from unittest.mock import MagicMock

from app.services.database import DatabaseService
from app.services.sql_gen import _build_prompt, _output_contract_for


class CuentaSampleTests(unittest.TestCase):
    def test_cuenta_samples_include_color(self):
        service = DatabaseService.__new__(DatabaseService)
        service.engine = MagicMock()
        connection = service.engine.connect.return_value.__enter__.return_value
        connection.execute.return_value = [
            ("Ahorros", "#3b82f6"),
            ("Efectivo", None),
        ]

        samples = service._fetch_samples("cuentas", user_id=7)

        self.assertEqual(
            samples,
            [
                {"nombre": "Ahorros", "color": "#3b82f6"},
                {"nombre": "Efectivo", "color": None},
            ],
        )
        sql = str(connection.execute.call_args.args[0])
        self.assertIn("SELECT nombre, color FROM cuentas", sql)
        self.assertEqual(connection.execute.call_args.args[1], {"uid": 7})


class CuentaCategoryContractTests(unittest.TestCase):
    def test_account_category_contract_requires_exact_name_and_id(self):
        for widget_type in ("pie", "bar", "line"):
            contract = _output_contract_for(widget_type)
            self.assertIn("`cuenta_id`", contract)
            self.assertIn("`cuentas.nombre AS label`", contract)

    def test_sql_prompt_contains_cuenta_categorization_rule(self):
        prompt = _build_prompt(
            schema={},
            widget_type="pie",
            goal="Comparar saldos por cuenta",
            output_contract="label y value",
            today_iso="2026-07-07",
            client_timezone="America/Guayaquil",
        )

        self.assertIn("CATEGORIZACIÓN POR CUENTA", prompt)
        self.assertIn("<alias>.id AS cuenta_id, <alias>.nombre AS label", prompt)


if __name__ == "__main__":
    unittest.main()
