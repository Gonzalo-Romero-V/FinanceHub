from pydantic_settings import BaseSettings
from typing import Literal, Optional

class Settings(BaseSettings):
    # LLM Settings
    LLM_PROVIDER: Literal["openai", "ollama"] = "openai"
    OPENAI_API_KEY: Optional[str] = None
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "mistral"

    # Database Settings
    DB_HOST: str = "127.0.0.1"
    DB_PORT: str = "5432"
    DB_NAME: str = "financehub"
    DB_USER: str = "postgres"
    DB_PASSWORD: str = ""

    # App Settings
    APP_NAME: str = "FinanceHub-LLM-Service"
    DEBUG: bool = True
    PORT: int = 8001

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
