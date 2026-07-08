import datetime
import unittest
from unittest.mock import MagicMock, patch

from app.services import finance_tools


def _mock_connection(fetch_results):
    """
    `fetch_results` es una lista de valores a devolver en orden, uno por cada
    llamada a `conn.execute(...)`. Cada valor puede ser un dict (para
    `.mappings().first()`), una lista de dicts (para `.mappings().all()`) o
    un escalar (para `.scalar_one()`).
    """
    conn = MagicMock()
    calls = iter(fetch_results)

    def fake_execute(query, params=None):
        value = next(calls)
        result = MagicMock()
        if isinstance(value, list):
            result.mappings.return_value.all.return_value = value
        elif isinstance(value, dict):
            result.mappings.return_value.first.return_value = value
        else:
            result.scalar_one.return_value = value
        return result

    conn.execute.side_effect = fake_execute
    return conn


class FinanceToolsTests(unittest.TestCase):
    def _patch_readonly_connection(self, conn):
        return patch.object(
            finance_tools,
            "_readonly_connection",
            return_value=_ContextManagerStub(conn),
        )

    def test_get_balance_general_computes_net_worth(self):
        conn = _mock_connection(
            [{"total_activos": 1000.0, "pasivos_cuentas": 100.0, "pasivos_deudas": 250.0}]
        )
        with self._patch_readonly_connection(conn):
            rows = finance_tools.get_balance_general(user_id=7)

        by_label = {r["label"]: r["value"] for r in rows}
        self.assertEqual(by_label["Activos"], 1000.0)
        self.assertEqual(by_label["Pasivos"], 350.0)
        self.assertEqual(by_label["Patrimonio Neto"], 650.0)

    def test_get_resumen_deudas_uses_pending_installments_sum(self):
        conn = _mock_connection(
            [
                [
                    {
                        "id": 1,
                        "nombre": "Auto",
                        "acreedor": "Banco X",
                        "sistema": "frances",
                        "saldo_pendiente": 500.5,
                        "proxima_cuota_fecha": datetime.date(2026, 8, 1),
                    }
                ]
            ]
        )
        with self._patch_readonly_connection(conn):
            rows = finance_tools.get_resumen_deudas(user_id=7)

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["label"], "Auto")
        self.assertEqual(rows[0]["value"], 500.5)
        self.assertEqual(rows[0]["proxima_cuota_fecha"], "2026-08-01")

    def test_get_resumen_presupuestos_computes_pct_within_current_period(self):
        bounds_row = {f"{v}_{b}": f"{v}-{b}" for v in finance_tools._VENTANAS for b in ("inicio", "fin")}
        conn = _mock_connection(
            [
                bounds_row,  # _periodo_bounds
                [
                    {
                        "id": 1,
                        "concepto_id": 9,
                        "monto": 200.0,
                        "ventana": "mensual",
                        "concepto_nombre": "Alimentación",
                    }
                ],
                50.0,  # consumo_query scalar_one
            ]
        )
        with self._patch_readonly_connection(conn):
            rows = finance_tools.get_resumen_presupuestos(user_id=7, client_timezone="America/Guayaquil")

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["label"], "Alimentación")
        self.assertEqual(rows[0]["value"], 25.0)
        self.assertEqual(rows[0]["consumo_actual"], 50.0)
        self.assertEqual(rows[0]["monto_presupuesto"], 200.0)


class _ContextManagerStub:
    def __init__(self, conn):
        self._conn = conn

    def __call__(self, *args, **kwargs):
        return self

    def __enter__(self):
        return self._conn

    def __exit__(self, *exc):
        return False


if __name__ == "__main__":
    unittest.main()
