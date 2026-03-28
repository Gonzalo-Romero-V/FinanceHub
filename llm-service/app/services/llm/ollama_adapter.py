import httpx
from app.core.config import settings
from .base import BaseLLMAdapter

class OllamaAdapter(BaseLLMAdapter):
    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL
        self.model = settings.OLLAMA_MODEL

    async def generate_response(self, system_prompt: str, user_prompt: str) -> str:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/chat",
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "stream": False
                },
                timeout=60.0
            )
            response.raise_for_status()
            return response.json()["message"]["content"]
