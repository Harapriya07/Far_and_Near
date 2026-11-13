from __future__ import annotations
import uuid
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Index, Integer, JSON, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Uuid
from app.db.base import Base

class SharedGameRoom(Base):
    __tablename__ = "shared_game_rooms"
    __table_args__ = (
        UniqueConstraint("space_id", name="uq_shared_game_rooms_space_id"),
        UniqueConstraint("code", name="uq_shared_game_rooms_code"),
        Index("ix_shared_game_rooms_space_updated", "space_id", "updated_at"),
    )
    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    space_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("spaces.id", ondelete="CASCADE"), nullable=False)
    code: Mapped[str] = mapped_column(String(6), nullable=False)
    player_one_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    player_two_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    player_one_name: Mapped[str | None] = mapped_column(String(40), nullable=True)
    player_two_name: Mapped[str | None] = mapped_column(String(40), nullable=True)
    player_one_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    player_two_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    states: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    revisions: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
