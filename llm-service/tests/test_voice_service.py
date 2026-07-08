import io
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services import voice


class VoiceServiceTests(unittest.IsolatedAsyncioTestCase):
    async def test_classification_contract_accepts_only_two_intents(self):
        adapter = MagicMock()
        adapter.generate_response = AsyncMock(
            return_value='{"intent": "REGISTRAR_MOVIMIENTO"}'
        )
        with patch.object(voice.LLMFactory, "get_adapter", return_value=adapter):
            intent = await voice.classify_intent("gaste veinte dolares")
        self.assertEqual(intent, "registrar_movimiento")

    async def test_unknown_classification_falls_back_to_consulta(self):
        adapter = MagicMock()
        adapter.generate_response = AsyncMock(return_value='{"intent": "otra"}')
        with patch.object(voice.LLMFactory, "get_adapter", return_value=adapter):
            intent = await voice.classify_intent("texto ambiguo")
        self.assertEqual(intent, "consulta")

    def test_transcription_uses_configured_model(self):
        client = MagicMock()
        client.audio.transcriptions.create.return_value.text = " resultado "
        with patch.object(voice, "_get_openai_client", return_value=client):
            result = voice.transcribe_audio(b"audio", "clip.webm")

        self.assertEqual(result, "resultado")
        kwargs = client.audio.transcriptions.create.call_args.kwargs
        self.assertEqual(kwargs["model"], voice.settings.OPENAI_TRANSCRIPTION_MODEL)
        self.assertIsInstance(kwargs["file"], io.BytesIO)


if __name__ == "__main__":
    unittest.main()
