from __future__ import annotations

import os
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import UUID

import jwt
import pytest
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import digest_refresh_token, verify_password
from app.db.session import _engine_for_url
from app.models import RefreshSession, User
from conftest import csrf_headers, signup_payload


def count_users(client):
    engine = _engine_for_url(get_settings().database_url)
    with Session(engine) as db:
        return db.scalar(select(func.count()).select_from(User))


def test_successful_signup(client):
    response = client.post("/api/v1/auth/signup", json=signup_payload())
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "harapriya.example@example.com"
    assert body["display_name"] == "Harapriya"
    assert "password_hash" not in body and "password" not in body
    UUID(body["id"])


def test_password_is_not_stored_in_plaintext(client):
    client.post("/api/v1/auth/signup", json=signup_payload())
    with Session(_engine_for_url(get_settings().database_url)) as db:
        user = db.scalar(select(User))
        assert user.password_hash != signup_payload()["password"]
        assert not user.password_hash.startswith("correct horse")


def test_stored_hash_verifies_password_and_is_argon2id(client):
    client.post("/api/v1/auth/signup", json=signup_payload())
    with Session(_engine_for_url(get_settings().database_url)) as db:
        user = db.scalar(select(User))
        assert user.password_hash.startswith("$argon2id$")
        assert verify_password(user.password_hash, signup_payload()["password"])


def test_duplicate_email_rejected(client):
    assert client.post("/api/v1/auth/signup", json=signup_payload()).status_code == 201
    response = client.post("/api/v1/auth/signup", json=signup_payload(email="HARAPRIYA.EXAMPLE@example.com"))
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "email_unavailable"


def test_email_normalization_is_consistent(client):
    assert client.post("/api/v1/auth/signup", json=signup_payload(email="  HARApriya.Example@Example.com ")).status_code == 201
    response = client.post("/api/v1/auth/login", json={"email": "harapriya.example@example.com", "password": signup_payload()["password"]})
    assert response.status_code == 200


@pytest.mark.parametrize("payload", [
    {},
    {"email": "not-an-email", "display_name": "Name", "password": "correct horse battery staple"},
    {"email": "person@example.com", "display_name": "", "password": "correct horse battery staple"},
    {"email": "person@example.com", "display_name": "Name", "password": ""},
    {"email": "person@example.com", "display_name": "Name", "password": "short"},
    {"email": "person@example.com", "display_name": "Name", "password": "x" * 129},
])
def test_invalid_or_missing_signup_fields_rejected(client, payload):
    assert client.post("/api/v1/auth/signup", json=payload).status_code == 422


def test_password_hash_never_appears_in_signup_or_me_response(client):
    signup = client.post("/api/v1/auth/signup", json=signup_payload())
    login = client.post("/api/v1/auth/login", json={"email": signup_payload()["email"], "password": signup_payload()["password"]})
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {login.json()['access_token']}"})
    assert "password_hash" not in signup.text + login.text + me.text


def test_successful_login_returns_access_token_and_http_only_refresh_cookie(client):
    client.post("/api/v1/auth/signup", json=signup_payload())
    response = client.post("/api/v1/auth/login", json={"email": signup_payload()["email"], "password": signup_payload()["password"]})
    assert response.status_code == 200
    assert response.json()["token_type"] == "bearer"
    assert response.json()["expires_in"] == 600
    cookies = "\n".join(response.headers.get_list("set-cookie"))
    assert "far_near_refresh=" in cookies and "HttpOnly" in cookies and "SameSite=lax" in cookies
    assert "far_near_csrf=" in cookies and "HttpOnly" not in cookies.split("far_near_csrf=")[1].split("\n")[0]
    assert "far_near_csrf=" in cookies and "Path=/;" in cookies.split("far_near_csrf=")[1].split("\n")[0]


def test_incorrect_password_rejected_generically(client):
    client.post("/api/v1/auth/signup", json=signup_payload())
    response = client.post("/api/v1/auth/login", json={"email": signup_payload()["email"], "password": "incorrect password"})
    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Invalid email or password"


def test_unknown_email_uses_same_generic_error(client):
    response = client.post("/api/v1/auth/login", json={"email": "unknown@example.com", "password": "incorrect password"})
    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Invalid email or password"


def test_missing_login_credentials_rejected(client):
    assert client.post("/api/v1/auth/login", json={}).status_code == 422


def test_valid_access_token_can_access_me(client):
    client.post("/api/v1/auth/signup", json=signup_payload())
    login = client.post("/api/v1/auth/login", json={"email": signup_payload()["email"], "password": signup_payload()["password"]})
    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {login.json()['access_token']}"})
    assert response.status_code == 200
    assert response.json()["email"] == "harapriya.example@example.com"


def test_missing_token_rejected(client):
    assert client.get("/api/v1/auth/me").status_code == 401


@pytest.mark.parametrize("token", ["not-a-jwt", "eyJhbGciOiJub25lIn0.eyJzdWIiOiJ4In0."])
def test_malformed_or_unsafe_token_rejected(client, token):
    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


def test_expired_token_rejected(client):
    now = datetime.now(timezone.utc)
    token = jwt.encode({"sub": "00000000-0000-0000-0000-000000000001", "iat": now - timedelta(minutes=5), "exp": now - timedelta(minutes=1), "iss": get_settings().token_issuer, "aud": get_settings().token_audience, "jti": "expired", "token_use": "access"}, get_settings().access_token_secret, algorithm="HS256")
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_tampered_token_rejected(client):
    client.post("/api/v1/auth/signup", json=signup_payload())
    login = client.post("/api/v1/auth/login", json={"email": signup_payload()["email"], "password": signup_payload()["password"]})
    token = login.json()["access_token"][:-2] + "xx"
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_refresh_rotates_token_and_returns_new_access_token(client):
    client.post("/api/v1/auth/signup", json=signup_payload())
    client.post("/api/v1/auth/login", json={"email": signup_payload()["email"], "password": signup_payload()["password"]})
    old_refresh = client.cookies.get("far_near_refresh")
    response = client.post("/api/v1/auth/refresh", headers=csrf_headers(client))
    assert response.status_code == 200
    assert response.json()["access_token"]
    assert client.cookies.get("far_near_refresh") != old_refresh


def test_expired_refresh_session_rejected(client):
    client.post("/api/v1/auth/signup", json=signup_payload())
    client.post("/api/v1/auth/login", json={"email": signup_payload()["email"], "password": signup_payload()["password"]})
    token = client.cookies.get("far_near_refresh")
    digest = digest_refresh_token(token)
    engine = _engine_for_url(get_settings().database_url)
    with Session(engine) as db:
        db.execute(update(RefreshSession).where(RefreshSession.token_digest == digest).values(expires_at=datetime.now(timezone.utc) - timedelta(days=1)))
        db.commit()
    response = client.post("/api/v1/auth/refresh", headers=csrf_headers(client))
    assert response.status_code == 401


def test_revoked_refresh_session_rejected(client):
    client.post("/api/v1/auth/signup", json=signup_payload())
    client.post("/api/v1/auth/login", json={"email": signup_payload()["email"], "password": signup_payload()["password"]})
    old_token = client.cookies.get("far_near_refresh")
    client.post("/api/v1/auth/refresh", headers=csrf_headers(client))
    current_token = client.cookies.get("far_near_refresh")
    client.cookies.set("far_near_refresh", old_token, path="/api/v1/auth")
    response = client.post("/api/v1/auth/refresh", headers=csrf_headers(client))
    assert response.status_code == 401
    # Reuse of the previous credential revokes the still-active family token too.
    client.cookies.set("far_near_refresh", current_token, path="/api/v1/auth")
    family_response = client.post("/api/v1/auth/refresh", headers=csrf_headers(client))
    assert family_response.status_code == 401


def test_logout_revokes_refresh_and_clears_cookies(client):
    client.post("/api/v1/auth/signup", json=signup_payload())
    client.post("/api/v1/auth/login", json={"email": signup_payload()["email"], "password": signup_payload()["password"]})
    token = client.cookies.get("far_near_refresh")
    response = client.post("/api/v1/auth/logout", headers=csrf_headers(client))
    assert response.status_code == 204
    with Session(_engine_for_url(get_settings().database_url)) as db:
        row = db.scalar(select(RefreshSession).where(RefreshSession.token_digest == digest_refresh_token(token)))
        assert row.revoked_at is not None
    assert client.cookies.get("far_near_refresh") is None


def test_logged_out_refresh_credential_cannot_be_reused(client):
    client.post("/api/v1/auth/signup", json=signup_payload())
    client.post("/api/v1/auth/login", json={"email": signup_payload()["email"], "password": signup_payload()["password"]})
    old_token = client.cookies.get("far_near_refresh")
    client.post("/api/v1/auth/logout", headers=csrf_headers(client))
    client.cookies.set("far_near_refresh", old_token, path="/api/v1/auth")
    client.cookies.set("far_near_csrf", "valid-csrf", path="/api/v1/auth")
    response = client.post("/api/v1/auth/refresh", headers={"Origin": "http://testserver", "X-CSRF-Token": "valid-csrf"})
    assert response.status_code == 401


def test_csrf_mismatch_rejected(client):
    client.post("/api/v1/auth/signup", json=signup_payload())
    client.post("/api/v1/auth/login", json={"email": signup_payload()["email"], "password": signup_payload()["password"]})
    response = client.post("/api/v1/auth/refresh", headers={"Origin": "http://testserver", "X-CSRF-Token": "wrong"})
    assert response.status_code == 403


def test_untrusted_origin_rejected(client):
    client.post("/api/v1/auth/signup", json=signup_payload())
    client.post("/api/v1/auth/login", json={"email": signup_payload()["email"], "password": signup_payload()["password"]})
    response = client.post("/api/v1/auth/refresh", headers={"Origin": "https://evil.example", "X-CSRF-Token": client.cookies.get("far_near_csrf")})
    assert response.status_code == 403


def test_repeated_logout_is_safe(client):
    response = client.post("/api/v1/auth/logout")
    assert response.status_code == 204
    assert client.post("/api/v1/auth/logout").status_code == 204


def test_cookie_attributes_are_development_safe_and_scoped(client):
    client.post("/api/v1/auth/signup", json=signup_payload())
    response = client.post("/api/v1/auth/login", json={"email": signup_payload()["email"], "password": signup_payload()["password"]})
    cookies = response.headers.get_list("set-cookie")
    refresh = next(c for c in cookies if c.startswith("far_near_refresh="))
    assert "Path=/api/v1/auth" in refresh and "HttpOnly" in refresh and "SameSite=lax" in refresh
    assert "Secure" not in refresh


def test_duplicate_registration_race_keeps_one_user(client):
    payload = signup_payload(email="race@example.com")
    def post_signup():
        return client.post("/api/v1/auth/signup", json=payload).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _: post_signup(), range(2)))
    assert sorted(results) == [201, 409]
    assert count_users(client) == 1


def test_database_failure_does_not_return_false_success(client, monkeypatch):
    from app.db import session as db_session
    from sqlalchemy.exc import OperationalError
    from app.main import app
    def fail_db():
        raise OperationalError("SELECT 1", {}, Exception("offline"))
        yield
    app.dependency_overrides[db_session.get_db] = fail_db
    try:
        response = client.post("/api/v1/auth/signup", json=signup_payload())
        assert response.status_code == 503
        assert response.json()["error"]["code"] == "database_unavailable"
    finally:
        app.dependency_overrides.pop(db_session.get_db, None)


def test_existing_health_check_remains_intact(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "connected"}


def test_missing_signing_secret_fails_closed_without_issuing_token(client, monkeypatch):
    client.post("/api/v1/auth/signup", json=signup_payload())
    monkeypatch.delenv("ACCESS_TOKEN_SECRET", raising=False)
    response = client.post("/api/v1/auth/login", json={"email": signup_payload()["email"], "password": signup_payload()["password"]})
    assert response.status_code == 503
    assert "access_token" not in response.text


def test_missing_database_configuration_does_not_return_false_success(client, monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    response = client.post("/api/v1/auth/signup", json=signup_payload())
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "database_unavailable"
