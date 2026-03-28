from abc import ABC, abstractmethod
from typing import List, Dict, Any

class BaseLLMAdapter(ABC):
    @abstractmethod
    async def generate_response(self, system_prompt: str, user_prompt: str) -> str:
        """Genera una respuesta del LLM basándose en prompts de sistema y usuario."""
        pass
