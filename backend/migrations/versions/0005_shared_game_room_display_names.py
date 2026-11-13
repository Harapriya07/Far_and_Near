"""Store each partner's display name inside the shared games lounge.

Revision ID: 0005_shared_game_room_names
Revises: 0004_shared_game_room
"""
from alembic import op
import sqlalchemy as sa

revision = "0005_shared_game_room_names"
down_revision = "0004_shared_game_room"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column("shared_game_rooms", sa.Column("player_one_name", sa.String(length=40), nullable=True))
    op.add_column("shared_game_rooms", sa.Column("player_two_name", sa.String(length=40), nullable=True))

def downgrade() -> None:
    op.drop_column("shared_game_rooms", "player_two_name")
    op.drop_column("shared_game_rooms", "player_one_name")
