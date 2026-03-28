from app.core.config import settings
from .openai_adapter import OpenAIAdapter
from .ollama_adapter import OllamaAdapter

class LLMFactory:
    @staticmethod
    def get_adapter():
        if settings.LLM_PROVIDER == "openai":
            return OpenAIAdapter()
        elif settings.LLM_PROVIDER == "ollama":
            return OllamaAdapter()
        else:
            raise ValueError(f"Proveedor de LLM no soportado: {settings.LLM_PROVIDER}")
