from typing import Literal, Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ─── LLM ──────────────────────────────────────────────────────────────────
    LLM_PROVIDER: Literal["openai", "ollama"] = "openai"
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o"
    OPENAI_TEMPERATURE: float = 0.0
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "mistral"

    # ─── Database ─────────────────────────────────────────────────────────────
    DB_HOST: str = "127.0.0.1"
    DB_PORT: str = "5432"
    DB_NAME: str = "financehub"
    DB_USER: str = "postgres"
    DB_PASSWORD: str = ""
    # Tope (milisegundos) por query individual. Postgres aborta con error si se excede.
    STATEMENT_TIMEOUT_MS: int = 5000
    # Tope de filas por widget para evitar respuestas gigantes.
    MAX_ROWS_PER_QUERY: int = 500

    # ─── App ──────────────────────────────────────────────────────────────────
    APP_NAME: str = "FinanceHub-LLM-Service"
    DEBUG: bool = True
    PORT: int = 8001
    # CSV de orígenes permitidos para CORS. Usar "*" sólo en dev.
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        extra = "ignore"

    @field_validator("OPENAI_API_KEY")
    @classmethod
    def _require_openai_key(cls, v, info):
        # Si el provider seleccionado es openai, la clave es obligatoria.
        if info.data.get("LLM_PROVIDER") == "openai" and not v:
            raise ValueError(
                "OPENAI_API_KEY es requerida cuando LLM_PROVIDER='openai'. "
                "Definilo en .env."
            )
        return v

    @property
    def allowed_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]


settings = Settings()
