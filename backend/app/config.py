from dotenv import load_dotenv
from pydantic import Field
from pydantic_settings import BaseSettings
import os

load_dotenv()


def _default_cors_origins() -> list[str]:
    raw_origins = os.getenv("CORS_ORIGINS", "")
    if raw_origins:
        return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

    return [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]


class Settings(BaseSettings):
    mongo_uri: str = os.getenv("MONGO_URI", "")
    mongo_db: str = os.getenv("DB_NAME", "fleximl")
    redis_host: str = os.getenv("REDIS_HOST", "localhost")
    redis_port: int = int(os.getenv("REDIS_PORT", 6379))
    redis_password: str = os.getenv("REDIS_PASSWORD", "")
    app_name: str = "FlexiML"
    api_version: str = "v1"
    cors_origins: list[str] = Field(default_factory=_default_cors_origins)


settings = Settings()
