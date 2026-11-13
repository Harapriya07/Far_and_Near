"""SQLAlchemy engine and session dependencies."""
from __future__ import annotations

from collections.abc import Generator
from functools import lru_cache

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import get_settings


class DatabaseConfigurationError(RuntimeError):
    pass


@lru_cache(maxsize=4)
def _engine_for_url(database_url: str) -> Engine:
    connect_args = {"check_same_thread": False} if database_url.startswith("sqlite:") else {}
    options: dict[str, object] = {"pool_pre_ping": True, "connect_args": connect_args}
    if database_url in {"sqlite:///:memory:", "sqlite+pysqlite:///:memory:"}:
        options["poolclass"] = StaticPool
    return create_engine(database_url, **options)


def get_engine() -> Engine | None:
    url = get_settings().database_url
    return _engine_for_url(url) if url else None


def get_db() -> Generator[Session, None, None]:
    engine = get_engine()
    if engine is None:
        raise DatabaseConfigurationError("Database is not configured")
    factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    with factory() as session:
        yield session


def probe_database() -> tuple[bool, str]:
    if not get_settings().database_url:
        return False, "not_configured"
    try:
        engine = get_engine()
        if engine is None:
            return False, "not_configured"
        with engine.connect() as connection:
            connection.execute(text("SELECT 1")).scalar_one()
        return True, "connected"
    except (SQLAlchemyError, ImportError, ModuleNotFoundError, ValueError):
        return False, "unavailable"
