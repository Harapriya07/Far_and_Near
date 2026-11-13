from __future__ import annotations
import secrets
from uuid import UUID
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload
from app.models import Space, SpaceMembership, User
from app.services.auth import AuthError

_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

def _new_code(db: Session) -> str:
    for _ in range(20):
        code = "".join(secrets.choice(_CODE_CHARS) for _ in range(6))
        if db.scalar(select(Space.id).where(Space.code == code)) is None:
            return code
    raise AuthError(503, "invite_unavailable", "A new invite code could not be generated. Please try again.")

def get_user_space(db: Session, user_id: UUID) -> Space | None:
    membership = db.scalar(select(SpaceMembership).where(SpaceMembership.user_id == user_id))
    if membership is None:
        return None
    return db.execute(select(Space).options(joinedload(Space.memberships).joinedload(SpaceMembership.user)).where(Space.id == membership.space_id)).unique().scalar_one_or_none()

def create_space(db: Session, user: User, name: str) -> Space:
    if db.scalar(select(SpaceMembership.id).where(SpaceMembership.user_id == user.id)) is not None:
        raise AuthError(409, "already_in_space", "Your account is already connected to a space.")
    space = Space(name=name, code=_new_code(db), created_by=user.id)
    db.add(space)
    db.flush()
    db.add(SpaceMembership(space_id=space.id, user_id=user.id, role="owner"))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise AuthError(409, "space_conflict", "Your space could not be created. Please try again.") from None
    return get_user_space(db, user.id)

def join_space(db: Session, user: User, code: str) -> Space:
    if db.scalar(select(SpaceMembership.id).where(SpaceMembership.user_id == user.id)) is not None:
        raise AuthError(409, "already_in_space", "Your account is already connected to a space.")
    space = db.scalar(select(Space).where(Space.code == code).with_for_update())
    if space is None:
        raise AuthError(404, "invite_not_found", "That invite code wasn't found. Check it and try again.")
    count = db.scalar(select(func.count(SpaceMembership.id)).where(SpaceMembership.space_id == space.id)) or 0
    if count >= 2:
        raise AuthError(409, "space_full", "This space already has two members.")
    if space.created_by == user.id:
        raise AuthError(409, "cannot_join_own_space", "You already created this space.")
    db.add(SpaceMembership(space_id=space.id, user_id=user.id, role="member"))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise AuthError(409, "space_conflict", "This account or space changed while you were joining. Please refresh and try again.") from None
    return get_user_space(db, user.id)

def serialize_space(space: Space) -> dict:
    return {
        "id": space.id,
        "name": space.name,
        "code": space.code,
        "created_at": space.created_at,
        "members": [
            {"id": m.user.id, "display_name": m.user.display_name, "role": m.role, "joined_at": m.created_at}
            for m in sorted(space.memberships, key=lambda item: item.created_at)
        ],
    }
