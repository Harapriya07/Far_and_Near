"""Environment-backed settings for the Far & Near API."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

_BACKEND_ENV = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(_BACKEND_ENV, override=False)


def _csv(value: str) -> tuple[str, ...]:
    return tuple(part.strip().rstrip("/") for part in value.split(",") if part.strip())


def _bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    app_name: str = "Far & Near API"
    app_env: str = "development"
    api_v1_prefix: str = "/api/v1"
    database_url: str = ""
    frontend_origins: tuple[str, ...] = ("http://localhost:5173",)
    access_token_secret: str = ""
    access_token_ttl_minutes: int = 10
    refresh_token_ttl_days: int = 14
    token_issuer: str = "far-and-near"
    token_audience: str = "far-and-near-api"
    cookie_secure: bool = False
    cookie_samesite: str = "lax"
    cookie_domain: str | None = None


def get_settings() -> Settings:
    prefix = os.getenv("API_V1_PREFIX", "/api/v1").strip()
    if not prefix.startswith("/"):
        prefix = f"/{prefix}"
    prefix = prefix.rstrip("/") or "/api/v1"
    app_env = os.getenv("APP_ENV", "development").strip().lower() or "development"
    raw_domain = os.getenv("COOKIE_DOMAIN", "").strip()
    database_url = os.getenv("DATABASE_URL", "").strip()
    if database_url.startswith("postgres://"):
        database_url = "postgresql+psycopg://" + database_url[len("postgres://"):]
    elif database_url.startswith("postgresql://"):
        database_url = "postgresql+psycopg://" + database_url[len("postgresql://"):]
    return Settings(
        app_name=os.getenv("APP_NAME", "Far & Near API").strip() or "Far & Near API",
        app_env=app_env,
        api_v1_prefix=prefix,
        database_url=database_url,
        frontend_origins=_csv(os.getenv("FRONTEND_ORIGINS", "http://localhost:5173")),
        access_token_secret=os.getenv("ACCESS_TOKEN_SECRET", "").strip(),
        access_token_ttl_minutes=int(os.getenv("ACCESS_TOKEN_TTL_MINUTES", "10")),
        refresh_token_ttl_days=int(os.getenv("REFRESH_TOKEN_TTL_DAYS", "14")),
        token_issuer=os.getenv("TOKEN_ISSUER", "far-and-near").strip() or "far-and-near",
        token_audience=os.getenv("TOKEN_AUDIENCE", "far-and-near-api").strip() or "far-and-near-api",
        cookie_secure=_bool(os.getenv("COOKIE_SECURE"), default=app_env == "production"),
        cookie_samesite=os.getenv("COOKIE_SAMESITE", "lax").strip().lower() or "lax",
        cookie_domain=raw_domain or None,
    )
