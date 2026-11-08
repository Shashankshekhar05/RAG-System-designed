from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://tokensaver:tokensaver123@postgres:5432/tokensaver_db"

    # Cache & Queue
    REDIS_URL: str = "redis://redis:6379/0"

    # Vector DB
    QDRANT_URL: str = "http://qdrant:6333"

    # LLM (Grok Free Tier)
    GROK_API_KEY: Optional[str] = ""
    GROK_MODEL: str = "grok-beta"

    # SMTP / Email
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: Optional[int] = None
    SMTP_USER: Optional[str] = None
    SMTP_PASS: Optional[str] = None

    EMAIL_HOST: Optional[str] = "smtp.gmail.com"
    EMAIL_PORT: Optional[int] = 587
    EMAIL_USER: Optional[str] = ""
    EMAIL_PASSWORD: Optional[str] = ""

    # Worker Settings
    WORKER_RETRY_DELAY: int = 120  # 2 minutes wait before retrying Grok

    # Security
    JWT_SECRET: str = "tokensaver_super_secret_jwt_key_2026_change_in_production"

    # URLs
    FRONTEND_URL: str = "http://localhost:3000"

    @property
    def resolved_smtp_host(self) -> str:
        return self.SMTP_HOST or self.EMAIL_HOST or "smtp.gmail.com"

    @property
    def resolved_smtp_port(self) -> int:
        return self.SMTP_PORT or self.EMAIL_PORT or 587

    @property
    def resolved_smtp_user(self) -> str:
        return self.SMTP_USER or self.EMAIL_USER or ""

    @property
    def resolved_smtp_pass(self) -> str:
        return self.SMTP_PASS or self.EMAIL_PASSWORD or ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
