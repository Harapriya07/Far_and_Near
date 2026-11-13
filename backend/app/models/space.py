from __future__ import annotations
import uuid
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Index, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Uuid
from app.db.base import Base

class Space(Base):
    __tablename__ = "spaces"
    __table_args__ = (Index("ix_spaces_created_at", "created_at"),)
    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(40), nullable=False)
    code: Mapped[str] = mapped_column(String(6), nullable=False, unique=True, index=True)
    created_by: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    memberships: Mapped[list["SpaceMembership"]] = relationship(back_populates="space", cascade="all, delete-orphan", passive_deletes=True)

class SpaceMembership(Base):
    __tablename__ = "space_memberships"
    __table_args__ = (
        UniqueConstraint("user_id", name="uq_space_memberships_user_id"),
        UniqueConstraint("space_id", "user_id", name="uq_space_memberships_space_user"),
        Index("ix_space_memberships_space_id", "space_id"),
    )
    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    space_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("spaces.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[str] = mapped_column(String(12), nullable=False, default="member")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    space: Mapped[Space] = relationship(back_populates="memberships")
    user: Mapped["User"] = relationship()
