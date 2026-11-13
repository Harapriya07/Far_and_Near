from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

import jwt
from argon2 import PasswordHasher, Type
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from app.core.config import get_settings

_password_hasher = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=2, hash_len=32, salt_len=16, type=Type.ID)


class AuthConfigurationError(RuntimeError):
    pass


def hash_password(password: str) -> str:
    return _password_hasher.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return _password_hasher.verify(password_hash, password)
    except (VerifyMismatchError, VerificationError, InvalidHashError, ValueError):
        return False


def _token_secret() -> str:
    settings = get_settings()
    secret = settings.access_token_secret
    if len(secret.encode("utf-8")) < 32 or secret.lower().startswith("replace_"):
        raise AuthConfigurationError("Authentication signing secret is not configured")
    if settings.access_token_ttl_minutes < 1 or settings.access_token_ttl_minutes > 60:
        raise AuthConfigurationError("Access token lifetime is outside the allowed range")
    if settings.refresh_token_ttl_days < 1 or settings.refresh_token_ttl_days > 90:
        raise AuthConfigurationError("Refresh token lifetime is outside the allowed range")
    if settings.cookie_samesite not in {"lax", "strict", "none"}:
        raise AuthConfigurationError("Invalid cookie SameSite configuration")
    if settings.app_env == "production" and not settings.cookie_secure:
        raise AuthConfigurationError("Secure cookies are required in production")
    if settings.cookie_samesite == "none" and not settings.cookie_secure:
        raise AuthConfigurationError("SameSite=None requires Secure cookies")
    return secret


def validate_auth_configuration() -> None:
    _token_secret()


def create_access_token(user_id: UUID) -> tuple[str, int]:
    settings = get_settings()
    secret = _token_secret()
    now = datetime.now(timezone.utc)
    ttl = settings.access_token_ttl_minutes * 60
    claims = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(seconds=ttl),
        "iss": settings.token_issuer,
        "aud": settings.token_audience,
        "jti": secrets.token_urlsafe(16),
        "token_use": "access",
    }
    return jwt.encode(claims, secret, algorithm="HS256"), ttl


def decode_access_token(token: str) -> dict[str, object]:
    settings = get_settings()
    secret = _token_secret()
    return jwt.decode(
        token,
        secret,
        algorithms=["HS256"],
        issuer=settings.token_issuer,
        audience=settings.token_audience,
        options={"require": ["sub", "iat", "exp", "iss", "aud", "jti", "token_use"]},
        leeway=0,
    )


def new_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def digest_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def new_csrf_token() -> str:
    return secrets.token_urlsafe(32)
