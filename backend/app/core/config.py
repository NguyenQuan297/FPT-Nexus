from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict

# Luôn đọc backend/.env dù chạy uvicorn từ thư mục gốc repo hay từ backend/
_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
_ENV_FILE = _BACKEND_DIR / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/leads"
    sync_database_url: str = "postgresql://postgres:postgres@127.0.0.1:5432/leads"
    redis_url: str = "redis://localhost:6379/0"

    sla_hours: float = 16.0
    job_interval_minutes: int = 5

    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[str] = None
    aws_region: str = "ap-southeast-1"
    s3_bucket: Optional[str] = None
    upload_dir: str = "./uploads"

    telegram_bot_token: Optional[str] = None
    #: Username bot (không có @) — dùng cho nút "Đăng nhập Telegram" trên web; BotFather: /setdomain
    telegram_bot_username: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: int = 587
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    alert_email_from: Optional[str] = None
    alert_email_to: Optional[str] = None

    lead_ingest_queue_key: str = "queue:lead_ingest"
    lead_ingest_dlq_key: str = "queue:lead_ingest:dlq"

    jwt_secret: str = "change-me-in-production-use-openssl-rand-hex-32"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24

    seed_admin_username: Optional[str] = "admin"
    seed_admin_password: Optional[str] = None
    #: If true and admin user already exists, overwrite password_hash from SEED_ADMIN_PASSWORD (use once, then set false)
    seed_admin_update_existing: bool = False


settings = Settings()
