from app.core.config import get_settings


def test_render_postgres_urls_are_normalized_to_psycopg(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://alya:secret@db.example:5432/far_near")
    assert get_settings().database_url == "postgresql+psycopg://alya:secret@db.example:5432/far_near"
    monkeypatch.setenv("DATABASE_URL", "postgres://alya:secret@db.example:5432/far_near")
    assert get_settings().database_url == "postgresql+psycopg://alya:secret@db.example:5432/far_near"
