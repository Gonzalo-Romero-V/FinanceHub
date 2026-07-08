"""
Transcripción de voz (Whisper vía OpenAI, independiente de `LLM_PROVIDER`
para el texto) y clasificación de intención de un texto ya transcrito.

La transcripción SIEMPRE usa la API de OpenAI: es la única disponible en este
proyecto con soporte de speech-to-text, incluso si el resto del pipeline de
texto está configurado con `LLM_PROVIDER=ollama`.
"""

from __future__ import annotations

import io
import logging
from typing import Literal

from openai import OpenAI

from app.core.config import settings
from app.services.llm.factory import LLMFactory
from app.utils.json_helper import extract_json

log = logging.getLogger(__name__)

_client: OpenAI | None = None
VoiceIntent = Literal["consulta", "registrar_movimiento"]


def _get_openai_client() -> OpenAI:
    global _client
    if _client is None:
        if not settings.OPENAI_API_KEY:
            raise RuntimeError(
                "OPENAI_API_KEY no configurada; requerida para transcripción de voz."
            )
        _client = OpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


def transcribe_audio(file_bytes: bytes, filename: str) -> str:
    """Transcribe un clip de audio corto a texto en español."""
    client = _get_openai_client()
    buffer = io.BytesIO(file_bytes)
    buffer.name = filename or "audio.webm"
    result = client.audio.transcriptions.create(
        model=settings.OPENAI_TRANSCRIPTION_MODEL,
        file=buffer,
        language="es",
    )
    return result.text.strip()


async def classify_intent(texto: str) -> VoiceIntent:
    """Clasifica un texto transcrito como 'consulta' o 'registrar_movimiento'."""
    llm = LLMFactory.get_adapter()
    system_prompt = (
        'Clasificá el siguiente texto (transcripción de voz de un usuario de una '
        'app de finanzas personales) en una de dos categorías EXACTAS:\n'
        '- "consulta": el usuario pide ver datos, un análisis, un gráfico o hace '
        'una pregunta sobre su información financiera.\n'
        '- "registrar_movimiento": el usuario quiere registrar/anotar un ingreso, '
        'egreso o transferencia (ej. "gasté 20 dólares en comida", "registra un '
        'ingreso de 500").\n'
        'Responde SOLO con JSON: {"intent": "consulta" | "registrar_movimiento"}.'
    )
    try:
        raw = await llm.generate_response(system_prompt, texto)
        data = extract_json(raw)
        intent = str(data.get("intent", "")).strip().lower()
        return intent if intent in ("consulta", "registrar_movimiento") else "consulta"
    except Exception:
        log.exception("Clasificación de intención falló; se asume 'consulta'.")
        return "consulta"
