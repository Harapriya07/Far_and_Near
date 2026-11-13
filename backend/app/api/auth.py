from __future__ import annotations

import hmac
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, Header, Request, Response, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser
from app.core.config import get_settings
from app.core.security import AuthConfigurationError, create_access_token, new_csrf_token, validate_auth_configuration
from app.db.session import get_db
from app.models import User
from app.schemas.auth import LoginRequest, SignupRequest, TokenResponse, UserResponse
from app.services.auth import (
    AuthError,
    authenticate_user,
    create_refresh_session,
    register_user,
    revoke_refresh_session,
    rotate_refresh_session,
)

router = APIRouter(prefix="/auth", tags=["authentication"])
DbSession = Annotated[Session, Depends(get_db)]
_REFRESH_COOKIE = "far_near_refresh"
_CSRF_COOKIE = "far_near_csrf"
_COOKIE_PATH = "/api/v1/auth"
_CSRF_COOKIE_PATH = "/"


def _set_session_cookies(response: Response, refresh_token: str, csrf_token: str) -> None:
    settings = get_settings()
    secure = settings.cookie_secure
    same_site = settings.cookie_samesite
    domain = settings.cookie_domain
    max_age = settings.refresh_token_ttl_days * 24 * 60 * 60
    response.set_cookie(
        _REFRESH_COOKIE, refresh_token, max_age=max_age, httponly=True,
        secure=secure, samesite=same_site, path=_COOKIE_PATH, domain=domain,
    )
    response.set_cookie(
        _CSRF_COOKIE, csrf_token, max_age=max_age, httponly=False,
        secure=secure, samesite=same_site, path=_CSRF_COOKIE_PATH, domain=domain,
    )
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"


def _clear_session_cookies(response: Response) -> None:
    settings = get_settings()
    for name in (_REFRESH_COOKIE, _CSRF_COOKIE):
        response.delete_cookie(
            name, path=(_COOKIE_PATH if name == _REFRESH_COOKIE else _CSRF_COOKIE_PATH), domain=settings.cookie_domain,
            secure=settings.cookie_secure,
            httponly=(name == _REFRESH_COOKIE),
            samesite=settings.cookie_samesite,
        )
    response.headers["Cache-Control"] = "no-store"


def _check_cookie_csrf(request: Request, csrf_cookie: str | None, csrf_header: str | None) -> None:
    settings = get_settings()
    origin = request.headers.get("origin")
    if not origin or origin.rstrip("/") not in settings.frontend_origins:
        raise AuthError(403, "csrf_failed", "Request origin is not allowed")
    if not csrf_cookie or not csrf_header or not hmac.compare_digest(csrf_cookie, csrf_header):
        raise AuthError(403, "csrf_failed", "CSRF validation failed")


@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: DbSession) -> UserResponse:
    user = register_user(db, payload.email, payload.display_name, payload.password)
    return UserResponse.model_validate(user)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, response: Response, db: DbSession) -> TokenResponse:
    user = authenticate_user(db, payload.email, payload.password)
    access_token, expires_in = create_access_token(user.id)
    refresh_token = create_refresh_session(db, user.id)
    csrf_token = new_csrf_token()
    _set_session_cookies(response, refresh_token, csrf_token)
    return TokenResponse(
        access_token=access_token,
        expires_in=expires_in,
        csrf_token=csrf_token,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
def me(user: CurrentUser) -> UserResponse:
    return UserResponse.model_validate(user)


@router.post("/refresh", response_model=TokenResponse)
def refresh(
    request: Request,
    response: Response,
    db: DbSession,
    refresh_cookie: Annotated[str | None, Cookie(alias=_REFRESH_COOKIE)] = None,
    csrf_cookie: Annotated[str | None, Cookie(alias=_CSRF_COOKIE)] = None,
    csrf_header: Annotated[str | None, Header(alias="X-CSRF-Token")] = None,
) -> TokenResponse:
    _check_cookie_csrf(request, csrf_cookie, csrf_header)
    validate_auth_configuration()
    if not refresh_cookie:
        raise AuthError(401, "invalid_refresh", "Invalid or expired refresh session")
    user, rotated_refresh = rotate_refresh_session(db, refresh_cookie)
    access_token, expires_in = create_access_token(user.id)
    csrf_token = new_csrf_token()
    _set_session_cookies(response, rotated_refresh, csrf_token)
    return TokenResponse(access_token=access_token, expires_in=expires_in, csrf_token=csrf_token, user=UserResponse.model_validate(user))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    request: Request,
    response: Response,
    db: DbSession,
    refresh_cookie: Annotated[str | None, Cookie(alias=_REFRESH_COOKIE)] = None,
    csrf_cookie: Annotated[str | None, Cookie(alias=_CSRF_COOKIE)] = None,
    csrf_header: Annotated[str | None, Header(alias="X-CSRF-Token")] = None,
) -> Response:
    if refresh_cookie:
        _check_cookie_csrf(request, csrf_cookie, csrf_header)
    revoke_refresh_session(db, refresh_cookie)
    _clear_session_cookies(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response
