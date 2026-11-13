"""Add a shared two-person game lounge and synchronized state for all six games.

Revision ID: 0004_shared_game_room
Revises: 0003_ludo_rooms
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.types import Uuid

revision = "0004_shared_game_room"
down_revision = "0003_ludo_rooms"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        "shared_game_rooms",
        sa.Column("id", Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("space_id", Uuid(as_uuid=True), sa.ForeignKey("spaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("code", sa.String(length=6), nullable=False),
        sa.Column("player_one_id", Uuid(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("player_two_id", Uuid(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
        sa.Column("player_one_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("player_two_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("states", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("revisions", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("space_id", name="uq_shared_game_rooms_space_id"),
        sa.UniqueConstraint("code", name="uq_shared_game_rooms_code"),
    )
    op.create_index("ix_shared_game_rooms_space_updated", "shared_game_rooms", ["space_id", "updated_at"], unique=False)

def downgrade() -> None:
    op.drop_index("ix_shared_game_rooms_space_updated", table_name="shared_game_rooms")
    op.drop_table("shared_game_rooms")
