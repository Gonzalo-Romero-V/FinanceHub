import hashlib
import unittest
from unittest.mock import MagicMock, patch

from fastapi import HTTPException

from app.core.auth import _parse_bearer_token, get_current_user_id


class SanctumAuthTests(unittest.TestCase):
    def test_parse_valid_bearer_token(self):
        self.assertEqual(_parse_bearer_token("Bearer 12|secret"), (12, "secret"))

    def test_rejects_missing_or_malformed_tokens_with_401(self):
        malformed = [None, "", "Basic abc", "Bearer abc", "Bearer 0|secret", "Bearer 1|"]

        for authorization in malformed:
            with self.subTest(authorization=authorization), self.assertRaises(HTTPException) as raised:
                _parse_bearer_token(authorization)
            self.assertEqual(raised.exception.status_code, 401)

    @patch("app.core.auth.db_service.engine")
    def test_resolves_user_by_id_and_sha256_hash(self, engine):
        connection = MagicMock()
        engine.connect.return_value.__enter__.return_value = connection
        connection.execute.return_value.scalar_one_or_none.return_value = 47

        user_id = get_current_user_id("Bearer 12|secret")

        self.assertEqual(user_id, 47)
        params = connection.execute.call_args.args[1]
        self.assertEqual(params["token_id"], 12)
        self.assertEqual(params["token_hash"], hashlib.sha256(b"secret").hexdigest())
        self.assertEqual(params["tokenable_type"], r"App\Models\UserModel")

    @patch("app.core.auth.db_service.engine")
    def test_rejects_unknown_token_with_401(self, engine):
        connection = MagicMock()
        engine.connect.return_value.__enter__.return_value = connection
        connection.execute.return_value.scalar_one_or_none.return_value = None

        with self.assertRaises(HTTPException) as raised:
            get_current_user_id("Bearer 12|wrong")

        self.assertEqual(raised.exception.status_code, 401)


if __name__ == "__main__":
    unittest.main()
