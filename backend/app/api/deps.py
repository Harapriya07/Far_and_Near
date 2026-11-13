from __future__ import annotations
from typing import Annotated
from uuid import UUID

import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import AuthConfigurationError, decode_access_token
from app.db.session import get_db
from app.models import User
from app.services.auth import AuthError

bearer = HTTPBearer(auto_error=False, scheme_name="AccessToken")
DbSession = Annotated[Session, Depends(get_db)]


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    db: DbSession,
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise AuthError(401, "unauthorized", "Authentication required")
    try:
        claims = decode_access_token(credentials.credentials)
        user_id = UUID(str(claims["sub"]))
        if claims.get("token_use") != "access":
            raise ValueError("Wrong token type")
    except AuthConfigurationError:
        raise
    except (jwt.InvalidTokenError, KeyError, ValueError, TypeError):
        raise AuthError(401, "invalid_token", "Invalid or expired access token") from None
    user = db.get(User, user_id)
    if user is None:
        raise AuthError(401, "invalid_token", "Invalid or expired access token")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
