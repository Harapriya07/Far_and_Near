from __future__ import annotations

import hmac
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from argon2.exceptions import HashingError
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import (
    AuthConfigurationError,
    create_access_token,
    digest_refresh_token,
    hash_password,
    new_refresh_token,
    verify_password,
)
from app.models import RefreshSession, User


class AuthError(Exception):
    def __init__(self, status_code: int, code: str, message: str):
        self.status_code = status_code
        self.code = code
        self.message = message
        super().__init__(message)


# A fixed valid Argon2id hash keeps unknown-account login failures on the same
# verification path as existing-account failures. It contains no user secret.
_DUMMY_PASSWORD_HASH = hash_password("dummy-password-for-timing-only-7391")


def register_user(db: Session, email: str, display_name: str, password: str) -> User:
    try:
        user = User(email=email.strip().lower(), display_name=display_name, password_hash=hash_password(password))
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    except IntegrityError:
        db.rollback()
        raise AuthError(409, "email_unavailable", "An account with this email already exists") from None
    except (HashingError, SQLAlchemyError):
        db.rollback()
        raise


def authenticate_user(db: Session, email: str, password: str) -> User:
    user = db.scalar(select(User).where(User.email == email.strip().lower()))
    password_hash = user.password_hash if user is not None else _DUMMY_PASSWORD_HASH
    if not verify_password(password_hash, password) or user is None:
        raise AuthError(401, "invalid_credentials", "Invalid email or password")
    return user


def create_refresh_session(db: Session, user_id: UUID) -> str:
    settings = get_settings()
    if settings.refresh_token_ttl_days < 1 or settings.refresh_token_ttl_days > 90:
        raise AuthConfigurationError("Refresh token lifetime is outside the allowed range")
    raw = new_refresh_token()
    now = datetime.now(timezone.utc)
    session = RefreshSession(
        user_id=user_id,
        family_id=uuid4(),
        token_digest=digest_refresh_token(raw),
        created_at=now,
        expires_at=now + timedelta(days=settings.refresh_token_ttl_days),
    )
    db.add(session)
    db.commit()
    return raw


def rotate_refresh_session(db: Session, raw_token: str) -> tuple[User, str]:
    if not raw_token or len(raw_token) > 512:
        raise AuthError(401, "invalid_refresh", "Invalid or expired refresh session")
    digest = digest_refresh_token(raw_token)
    session = db.scalar(select(RefreshSession).where(RefreshSession.token_digest == digest).with_for_update())
    if session is None:
        raise AuthError(401, "invalid_refresh", "Invalid or expired refresh session")
    now = datetime.now(timezone.utc)
    expires = session.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if session.revoked_at is not None:
        # A revoked credential presented again indicates possible token reuse.
        db.execute(
            update(RefreshSession)
            .where(RefreshSession.family_id == session.family_id, RefreshSession.revoked_at.is_(None))
            .values(revoked_at=now)
        )
        db.commit()
        raise AuthError(401, "invalid_refresh", "Invalid or expired refresh session")
    if expires <= now:
        session.revoked_at = now
        db.commit()
        raise AuthError(401, "invalid_refresh", "Invalid or expired refresh session")
    user = db.get(User, session.user_id)
    if user is None:
        session.revoked_at = now
        db.commit()
        raise AuthError(401, "invalid_refresh", "Invalid or expired refresh session")

    raw_new = new_refresh_token()
    new_id = uuid4()
    replacement = RefreshSession(
        id=new_id,
        user_id=session.user_id,
        family_id=session.family_id,
        token_digest=digest_refresh_token(raw_new),
        created_at=now,
        expires_at=now + timedelta(days=get_settings().refresh_token_ttl_days),
    )
    session.revoked_at = now
    session.replaced_by_id = new_id
    db.add(replacement)
    db.commit()
    return user, raw_new


def revoke_refresh_session(db: Session, raw_token: str | None) -> None:
    if not raw_token or len(raw_token) > 512:
        return
    session = db.scalar(select(RefreshSession).where(RefreshSession.token_digest == digest_refresh_token(raw_token)).with_for_update())
    if session is None or session.revoked_at is not None:
        return
    session.revoked_at = datetime.now(timezone.utc)
    db.commit()
