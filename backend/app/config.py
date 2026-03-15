import secrets
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
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

    class Config:
        env_file = ".env"


settings = Settings()
