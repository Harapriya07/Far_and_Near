from fastapi.testclient import TestClient

from app.main import app
from app.db import session as db_session


def test_health_reports_connected_database(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "sqlite+pysqlite:///:memory:")
    db_session._engine_for_url.cache_clear()
    response = TestClient(app).get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "connected"}
    db_session._engine_for_url.cache_clear()


def test_health_does_not_claim_database_is_healthy_when_unconfigured(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    db_session._engine_for_url.cache_clear()
    response = TestClient(app).get("/api/v1/health")
    assert response.status_code == 503
    assert response.json()["detail"] == {
        "status": "degraded",
        "database": "not_configured",
    }
    db_session._engine_for_url.cache_clear()


def test_health_reports_unavailable_for_unusable_database_url(monkeypatch):
    monkeypatch.setenv(
        "DATABASE_URL",
        "postgresql+driver_that_does_not_exist://user:secret@localhost/db",
    )
    db_session._engine_for_url.cache_clear()
    response = TestClient(app).get("/api/v1/health")
    assert response.status_code == 503
    assert response.json()["detail"] == {
        "status": "degraded",
        "database": "unavailable",
    }
    assert "secret" not in response.text
    db_session._engine_for_url.cache_clear()
