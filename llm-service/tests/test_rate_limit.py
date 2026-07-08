import unittest
from unittest.mock import MagicMock, patch

from fastapi import HTTPException

from app.core.rate_limit import enforce_daily_limit


class RateLimitTests(unittest.TestCase):
    @patch("app.core.rate_limit.get_current_user_id")
    @patch("app.core.rate_limit.db_service.engine")
    def test_allows_request_under_limit(self, engine, get_current_user_id):
        get_current_user_id.return_value = 5
        connection = MagicMock()
        engine.connect.return_value.__enter__.return_value = connection
        connection.execute.return_value.scalar_one.return_value = 10

        user_id = enforce_daily_limit(user_id=5)

        self.assertEqual(user_id, 5)
        connection.commit.assert_called_once()

    @patch("app.core.rate_limit.get_current_user_id")
    @patch("app.core.rate_limit.db_service.engine")
    def test_rejects_request_over_limit_with_429(self, engine, get_current_user_id):
        get_current_user_id.return_value = 5
        connection = MagicMock()
        engine.connect.return_value.__enter__.return_value = connection
        connection.execute.return_value.scalar_one.return_value = 51

        with self.assertRaises(HTTPException) as raised:
            enforce_daily_limit(user_id=5)

        self.assertEqual(raised.exception.status_code, 429)

    @patch("app.core.rate_limit.get_current_user_id")
    @patch("app.core.rate_limit._notify_limit_reached")
    @patch("app.core.rate_limit.db_service.engine")
    def test_notifies_only_on_the_exact_request_that_crosses_the_limit(
        self, engine, notify, get_current_user_id
    ):
        get_current_user_id.return_value = 5
        connection = MagicMock()
        engine.connect.return_value.__enter__.return_value = connection

        connection.execute.return_value.scalar_one.return_value = 51
        with self.assertRaises(HTTPException):
            enforce_daily_limit(user_id=5)
        notify.assert_called_once()

        notify.reset_mock()
        connection.execute.return_value.scalar_one.return_value = 52
        with self.assertRaises(HTTPException):
            enforce_daily_limit(user_id=5)
        notify.assert_not_called()

    @patch("app.core.rate_limit.get_current_user_id")
    @patch("app.core.rate_limit.db_service.engine")
    def test_fails_open_on_db_error(self, engine, get_current_user_id):
        get_current_user_id.return_value = 5
        engine.connect.side_effect = Exception("db down")

        user_id = enforce_daily_limit(user_id=5)

        self.assertEqual(user_id, 5)


if __name__ == "__main__":
    unittest.main()
