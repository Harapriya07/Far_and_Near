"""Add two-person shared spaces and bucket-list items.

Revision ID: 0002_shared_spaces_bucket_list
Revises: 0001_auth_tables
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.types import Uuid

revision = "0002_shared_spaces_bucket_list"
down_revision = "0001_auth_tables"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        "spaces",
        sa.Column("id", Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=40), nullable=False),
        sa.Column("code", sa.String(length=6), nullable=False),
        sa.Column("created_by", Uuid(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_spaces_code", "spaces", ["code"], unique=True)
    op.create_index("ix_spaces_created_at", "spaces", ["created_at"], unique=False)
    op.create_table(
        "space_memberships",
        sa.Column("id", Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("space_id", Uuid(as_uuid=True), sa.ForeignKey("spaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", Uuid(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(length=12), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", name="uq_space_memberships_user_id"),
        sa.UniqueConstraint("space_id", "user_id", name="uq_space_memberships_space_user"),
    )
    op.create_index("ix_space_memberships_space_id", "space_memberships", ["space_id"], unique=False)
    op.create_table(
        "bucket_items",
        sa.Column("id", Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("space_id", Uuid(as_uuid=True), sa.ForeignKey("spaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_by", Uuid(as_uuid=True), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("text", sa.String(length=160), nullable=False),
        sa.Column("category", sa.String(length=32), nullable=False),
        sa.Column("note", sa.Text(), nullable=False),
        sa.Column("target_date", sa.Date(), nullable=True),
        sa.Column("completed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_bucket_items_space_created", "bucket_items", ["space_id", "created_at"], unique=False)

def downgrade() -> None:
    op.drop_index("ix_bucket_items_space_created", table_name="bucket_items")
    op.drop_table("bucket_items")
    op.drop_index("ix_space_memberships_space_id", table_name="space_memberships")
    op.drop_table("space_memberships")
    op.drop_index("ix_spaces_created_at", table_name="spaces")
    op.drop_index("ix_spaces_code", table_name="spaces")
    op.drop_table("spaces")
