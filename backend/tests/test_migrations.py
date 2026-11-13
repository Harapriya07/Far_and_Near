from __future__ import annotations

from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

BACKEND = Path(__file__).resolve().parents[1]


def test_clean_database_migration_applies_and_discovers_revision(tmp_path, monkeypatch):
    db_path = tmp_path / "migration.sqlite3"
    monkeypatch.setenv("DATABASE_URL", f"sqlite+pysqlite:///{db_path.as_posix()}")
    config = Config(str(BACKEND / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND / "migrations"))
    command.upgrade(config, "head")
    engine = create_engine(f"sqlite+pysqlite:///{db_path.as_posix()}")
    try:
        inspector = inspect(engine)
        assert "users" in inspector.get_table_names()
        assert "refresh_sessions" in inspector.get_table_names()
        assert "spaces" in inspector.get_table_names()
        assert "space_memberships" in inspector.get_table_names()
        assert "bucket_items" in inspector.get_table_names()
        assert "ludo_rooms" in inspector.get_table_names()
        assert "shared_game_rooms" in inspector.get_table_names()
        assert {"player_one_name", "player_two_name"}.issubset({column["name"] for column in inspector.get_columns("shared_game_rooms")})
        with engine.connect() as connection:
            revision = connection.execute(text("SELECT version_num FROM alembic_version")).scalar_one()
        assert revision == "0005_shared_game_room_names"
    finally:
        engine.dispose()
