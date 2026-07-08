import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

import main
from app.core.auth import get_current_user_id


class UsageEndpointTests(unittest.TestCase):
    def setUp(self):
        main.app.dependency_overrides[get_current_user_id] = lambda: 7
        self.client = TestClient(main.app)

    def tearDown(self):
        main.app.dependency_overrides.clear()

    def test_returns_used_and_limit(self):
        with patch("main.get_current_usage", return_value=12):
            response = self.client.get("/api/usage")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["used"], 12)
        self.assertEqual(body["limit"], main.settings.DAILY_LLM_LIMIT)

    def test_does_not_increment_the_counter(self):
        # A diferencia de enforce_daily_limit, esta consulta es de solo
        # lectura — no debe llamar a nada que escriba en llm_usage_daily.
        with patch("main.get_current_usage", return_value=0) as usage_read:
            self.client.get("/api/usage")
        usage_read.assert_called_once_with(7)


if __name__ == "__main__":
    unittest.main()
