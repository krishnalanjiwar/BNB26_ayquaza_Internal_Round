from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    DATABASE_URL: str = "sqlite+aiosqlite:///./fairdrop.db"
    REDIS_URL: str = "redis://localhost:6379/0"

    QUEUE_TOKEN_SECRET: str = "fairdrop-queue-secret-key-32chars-min!"
    QUEUE_TOKEN_TTL_SECONDS: int = 300

    SESSION_SECRET_KEY: str = "fairdrop-session-secret-key-32chars-min!"
    SESSION_TOKEN_TTL_SECONDS: int = 86400

    QUEUE_ADMISSION_PER_SECOND: int = 50
    QUEUE_ADMISSION_INTERVAL_SECONDS: int = 1

    USER_REQUESTS_PER_SECOND: int = 20
    IP_REQUESTS_PER_SECOND: int = 100

    SECURITY_BLOCK_SECONDS: int = 30
    MITIGATION_ENABLED: bool = True

    FRONTEND_ORIGIN: str = "http://localhost:3000"

    RISK_THROTTLE_THRESHOLD: int = 60
    RISK_BLOCK_THRESHOLD: int = 80


@lru_cache()
def get_settings() -> Settings:
    return Settings()
