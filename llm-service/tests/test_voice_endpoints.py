import unittest
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

import main
from app.core.auth import get_current_user_id


class VoiceEndpointsTests(unittest.TestCase):
    def setUp(self):
        main.app.dependency_overrides[get_current_user_id] = lambda: 7
        self.client = TestClient(main.app)

    def tearDown(self):
        main.app.dependency_overrides.clear()

    def test_transcribe_without_classify_returns_text_only(self):
        with patch("main.transcribe_audio", return_value="gasté 20 en comida") as transcribe:
            response = self.client.post(
                "/api/voice/transcribe",
                files={"audio": ("clip.webm", b"fake-audio-bytes", "audio/webm")},
            )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["text"], "gasté 20 en comida")
        self.assertIsNone(body["intent"])
        transcribe.assert_called_once()

    def test_transcribe_with_classify_returns_intent(self):
        with (
            patch("main.transcribe_audio", return_value="cuanto gaste este mes"),
            patch("main.classify_intent", new=AsyncMock(return_value="consulta")),
        ):
            response = self.client.post(
                "/api/voice/transcribe?classify=true",
                files={"audio": ("clip.webm", b"fake-audio-bytes", "audio/webm")},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["intent"], "consulta")

    def test_transcribe_empty_audio_returns_400(self):
        response = self.client.post(
            "/api/voice/transcribe",
            files={"audio": ("clip.webm", b"", "audio/webm")},
        )
        self.assertEqual(response.status_code, 400)

    def test_transcribe_rejects_audio_over_configured_limit(self):
        with patch.object(main.settings, "MAX_AUDIO_BYTES", 4):
            response = self.client.post(
                "/api/voice/transcribe",
                files={"audio": ("clip.webm", b"12345", "audio/webm")},
            )

        self.assertEqual(response.status_code, 413)

    def test_transcribe_failure_returns_human_502_not_stacktrace(self):
        with patch("main.transcribe_audio", side_effect=RuntimeError("openai down")):
            response = self.client.post(
                "/api/voice/transcribe",
                files={"audio": ("clip.webm", b"fake-audio-bytes", "audio/webm")},
            )

        self.assertEqual(response.status_code, 502)
        self.assertNotIn("openai down", response.text)

    def test_parse_movimiento_delegates_to_service_with_authenticated_user_id(self):
        fake_result = {
            "estado": {"tipo": "Egreso", "concepto_id": 1, "concepto_nombre": "Comida",
                       "cuenta_origen_id": 10, "cuenta_origen_nombre": "Efectivo",
                       "cuenta_destino_id": None, "cuenta_destino_nombre": "",
                       "monto": 20, "nota": None},
            "faltantes": [],
            "pregunta": None,
            "completo": True,
        }
        with patch("main.parse_movimiento", new=AsyncMock(return_value=fake_result)) as parse:
            response = self.client.post(
                "/api/voice/parse-movimiento", json={"texto": "gasté 20 en comida"}
            )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["completo"])
        parse.assert_called_once()
        self.assertEqual(parse.call_args.args[0], 7)  # user_id del token, no del body

    def test_parse_movimiento_without_token_returns_401(self):
        main.app.dependency_overrides.clear()
        response = self.client.post(
            "/api/voice/parse-movimiento", json={"texto": "algo"}
        )
        self.assertEqual(response.status_code, 401)


if __name__ == "__main__":
    unittest.main()
