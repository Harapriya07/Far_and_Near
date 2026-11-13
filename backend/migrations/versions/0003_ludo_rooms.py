"""Add synchronized two-person Ludo rooms.

Revision ID: 0003_ludo_rooms
Revises: 0002_shared_spaces_bucket_list
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.types import Uuid

revision = "0003_ludo_rooms"
down_revision = "0002_shared_spaces_bucket_list"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        "ludo_rooms",
        sa.Column("id", Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("space_id", Uuid(as_uuid=True), sa.ForeignKey("spaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("player_one_id", Uuid(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("player_two_id", Uuid(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="waiting"),
        sa.Column("game_state", sa.JSON(), nullable=False),
        sa.Column("player_one_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("player_two_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_ludo_rooms_space_updated", "ludo_rooms", ["space_id", "updated_at"], unique=False)

def downgrade() -> None:
    op.drop_index("ix_ludo_rooms_space_updated", table_name="ludo_rooms")
    op.drop_table("ludo_rooms")
