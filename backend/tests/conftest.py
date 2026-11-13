from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

BACKEND_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_ROOT.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

# Set test configuration before importing app modules; do not inherit a developer DB.
os.environ["DATABASE_URL"] = "sqlite+pysqlite:///:memory:"
os.environ["ACCESS_TOKEN_SECRET"] = "test-only-secret-key-at-least-32-bytes-long"
os.environ["ACCESS_TOKEN_TTL_MINUTES"] = "10"
os.environ["REFRESH_TOKEN_TTL_DAYS"] = "14"
os.environ["FRONTEND_ORIGINS"] = "http://testserver,http://localhost:5173"
os.environ["APP_ENV"] = "test"
os.environ["COOKIE_SECURE"] = "false"
os.environ["COOKIE_SAMESITE"] = "lax"


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    from app.db.base import Base
    from app.db.session import _engine_for_url
    from app import models  # noqa: F401
    from app.main import app

    db_path = tmp_path / "test-auth.sqlite3"
    db_url = f"sqlite+pysqlite:///{db_path.as_posix()}"
    monkeypatch.setenv("DATABASE_URL", db_url)
    _engine_for_url.cache_clear()
    engine = _engine_for_url(db_url)
    Base.metadata.create_all(engine)
    with TestClient(app) as test_client:
        yield test_client
    Base.metadata.drop_all(engine)
    engine.dispose()
    _engine_for_url.cache_clear()


def signup_payload(**overrides):
    data = {"email": "Harapriya.Example@example.com", "display_name": "Harapriya", "password": "correct horse battery staple 123"}
    data.update(overrides)
    return data


def csrf_headers(client: TestClient, csrf: str | None = None):
    csrf_value = csrf or client.cookies.get("far_near_csrf")
    return {"Origin": "http://testserver", "X-CSRF-Token": csrf_value or ""}
