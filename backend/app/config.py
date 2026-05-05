import secrets

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Database — SQLite for local dev, PostgreSQL for production (set via env var)
    DATABASE_URL: str = "sqlite:////tmp/nobel.db"  # /tmp is writable on Railway

    # Auth — MUST be overridden in production via environment variable
    SECRET_KEY: str = secrets.token_hex(32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    # CORS — comma-separated list of allowed origins, e.g. "https://nobel.app,https://www.nobel.app"
    ALLOWED_ORIGINS: str = "*"

    # LLM
    OPENAI_API_KEY: str = "test"
    LLM_BASE_URL: str = "https://vjioo4r1vyvcozuj.us-east-2.aws.endpoints.huggingface.cloud/v1"
    LLM_MODEL: str = "openai/gpt-oss-120b"

    # Environment
    ENVIRONMENT: str = "development"  # "production" in prod

    @model_validator(mode="after")
    def require_sane_production_secrets(self) -> "Settings":
        """Refuse to boot in production with wildcards or placeholder secrets."""
        if (self.ENVIRONMENT or "").lower() != "production":
            return self
        if (self.ALLOWED_ORIGINS or "").strip() == "*":
            raise ValueError(
                "ALLOWED_ORIGINS cannot be '*' in production. "
                "Set explicit origins (e.g. https://your-app.netlify.app)."
            )
        key = (self.SECRET_KEY or "").strip()
        if len(key) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters in production.")
        lowered = key.lower()
        unsafe = (
            "replace-this",
            "replace_me",
            "changeme",
            "your-super-secret",
            "dev-secret-key",
            "please-change",
            "example",
        )
        if any(s in lowered for s in unsafe):
            raise ValueError(
                "SECRET_KEY looks like a placeholder. Generate a strong secret for production."
            )
        return self


settings = Settings()
