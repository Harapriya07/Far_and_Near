from __future__ import annotations
from uuid import UUID
from app.core.config import get_settings
from app.db.session import _engine_for_url
from app.models import BucketItem, Space, SpaceMembership
from sqlalchemy import select
from sqlalchemy.orm import Session
from conftest import signup_payload


def create_user(client, email, name):
    payload = signup_payload(email=email, display_name=name)
    assert client.post("/api/v1/auth/signup", json=payload).status_code == 201
    login = client.post("/api/v1/auth/login", json={"email": email, "password": payload["password"]})
    assert login.status_code == 200
    return login.json()["access_token"]


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_create_space_and_join_with_second_account(client):
    owner = create_user(client, "owner@example.com", "Owner")
    partner = create_user(client, "partner@example.com", "Partner")
    created = client.post("/api/v1/spaces", json={"name": "Our little world"}, headers=auth(owner))
    assert created.status_code == 201
    body = created.json()
    assert body["name"] == "Our little world"
    assert len(body["code"]) == 6
    assert len(body["members"]) == 1
    joined = client.post("/api/v1/spaces/join", json={"code": body["code"].lower()}, headers=auth(partner))
    assert joined.status_code == 200
    assert len(joined.json()["members"]) == 2
    assert {m["display_name"] for m in joined.json()["members"]} == {"Owner", "Partner"}


def test_space_membership_is_one_space_per_user_and_capacity_two(client):
    owner = create_user(client, "one@example.com", "One")
    partner = create_user(client, "two@example.com", "Two")
    third = create_user(client, "three@example.com", "Three")
    space = client.post("/api/v1/spaces", json={"name": "First"}, headers=auth(owner)).json()
    assert client.post("/api/v1/spaces", json={"name": "Second"}, headers=auth(owner)).status_code == 409
    assert client.post("/api/v1/spaces/join", json={"code": space["code"]}, headers=auth(partner)).status_code == 200
    full = client.post("/api/v1/spaces/join", json={"code": space["code"]}, headers=auth(third))
    assert full.status_code == 409
    assert full.json()["error"]["code"] == "space_full"


def test_space_requires_authentication(client):
    assert client.get("/api/v1/spaces/me").status_code == 401
    assert client.post("/api/v1/spaces", json={"name": "Nope"}).status_code == 401


def test_shared_bucket_list_crud_and_space_isolation(client):
    owner = create_user(client, "bucket-owner@example.com", "Owner")
    partner = create_user(client, "bucket-partner@example.com", "Partner")
    outsider = create_user(client, "outsider@example.com", "Outsider")
    space = client.post("/api/v1/spaces", json={"name": "Together"}, headers=auth(owner)).json()
    assert client.post("/api/v1/spaces/join", json={"code": space["code"]}, headers=auth(partner)).status_code == 200
    assert client.post("/api/v1/spaces", json={"name": "Elsewhere"}, headers=auth(outsider)).status_code == 201

    created = client.post("/api/v1/bucket-list", json={"text": "Visit Kyoto", "category": "travel", "note": "During spring", "target_date": "2027-04-01"}, headers=auth(owner))
    assert created.status_code == 201
    item = created.json()
    item_id = item["id"]
    assert item["target_date"] == "2027-04-01"
    assert len(client.get("/api/v1/bucket-list", headers=auth(partner)).json()) == 1
    assert client.get("/api/v1/bucket-list", headers=auth(outsider)).json() == []

    updated = client.patch(f"/api/v1/bucket-list/{item_id}", json={"completed": True, "note": "Booked!"}, headers=auth(partner))
    assert updated.status_code == 200
    assert updated.json()["completed"] is True
    assert updated.json()["note"] == "Booked!"
    assert client.patch(f"/api/v1/bucket-list/{item_id}", json={"text": "Steal item"}, headers=auth(outsider)).status_code == 404
    assert client.delete(f"/api/v1/bucket-list/{item_id}", headers=auth(partner)).status_code == 204
    assert client.get("/api/v1/bucket-list", headers=auth(owner)).json() == []


def test_bucket_list_requires_space_and_valid_date(client):
    user = create_user(client, "nospace@example.com", "No Space")
    response = client.get("/api/v1/bucket-list", headers=auth(user))
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "space_required"
    client.post("/api/v1/spaces", json={"name": "Test"}, headers=auth(user))
    invalid = client.post("/api/v1/bucket-list", json={"text": "Something", "target_date": "not-a-date"}, headers=auth(user))
    assert invalid.status_code == 422


def test_legacy_bucket_import_is_atomic_and_only_allowed_on_empty_list(client):
    user = create_user(client, "legacy-import@example.com", "Legacy")
    token = auth(user)
    client.post("/api/v1/spaces", json={"name": "Old memories"}, headers=token)
    payload = {"items": [
        {"text": "See the ocean", "category": "places", "completed": False},
        {"text": "Cook together", "category": "food", "note": "Pasta night", "completed": True},
    ]}
    imported = client.post("/api/v1/bucket-list/import", json=payload, headers=token)
    assert imported.status_code == 201
    assert len(imported.json()) == 2
    blocked = client.post("/api/v1/bucket-list/import", json=payload, headers=token)
    assert blocked.status_code == 409
    assert blocked.json()["error"]["code"] == "bucket_list_not_empty"
