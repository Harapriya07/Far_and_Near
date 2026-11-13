from __future__ import annotations
from conftest import signup_payload


def create_user(client, email, name):
    payload = signup_payload(email=email, display_name=name)
    assert client.post("/api/v1/auth/signup", json=payload).status_code == 201
    login = client.post("/api/v1/auth/login", json={"email": email, "password": payload["password"]})
    return login.json()["access_token"]


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_shared_room_code_joins_partner_and_allows_shared_game_state(client):
    one = create_user(client, "room-one@example.com", "One")
    two = create_user(client, "room-two@example.com", "Two")
    space = client.post("/api/v1/spaces", json={"name": "Together"}, headers=auth(one)).json()
    assert client.post("/api/v1/spaces/join", json={"code": space["code"]}, headers=auth(two)).status_code == 200

    created = client.get("/api/v1/games/room", headers=auth(one))
    assert created.status_code == 200
    room = created.json()
    assert len(room["code"]) == 6
    assert room["joined"] is True
    assert room["bothJoined"] is False

    partner_waiting = client.get("/api/v1/games/room", headers=auth(two)).json()
    assert partner_waiting["joined"] is False
    joined = client.post("/api/v1/games/room/join", json={"code": room["code"].lower(), "display_name": "Sammy"}, headers=auth(two))
    assert joined.status_code == 200
    assert joined.json()["bothJoined"] is True
    assert joined.json()["me"]["name"] == "Sammy"
    # The first partner can paste the same code too, to update their room name.
    owner_update = client.post("/api/v1/games/room/join", json={"code": room["code"], "display_name": "Alex in ALYA"}, headers=auth(one))
    assert owner_update.status_code == 200
    assert owner_update.json()["me"]["name"] == "Alex in ALYA"

    initial = client.get("/api/v1/games/room/state/tic-tac-toe", headers=auth(one))
    assert initial.status_code == 200
    saved = client.put("/api/v1/games/room/state/tic-tac-toe", json={"state": {"board": ["X", None]}, "expected_revision": 0}, headers=auth(one))
    assert saved.status_code == 200
    assert saved.json()["revision"] == 1
    partner_state = client.get("/api/v1/games/room/state/tic-tac-toe", headers=auth(two))
    assert partner_state.json()["state"] == {"board": ["X", None]}
    stale = client.put("/api/v1/games/room/state/tic-tac-toe", json={"state": {"board": []}, "expected_revision": 0}, headers=auth(two))
    assert stale.status_code == 409
    assert stale.json()["error"]["code"] == "state_conflict"


def test_shared_room_code_cannot_be_used_outside_the_same_space(client):
    one = create_user(client, "private-one@example.com", "One")
    outsider = create_user(client, "private-outsider@example.com", "Outsider")
    client.post("/api/v1/spaces", json={"name": "Private"}, headers=auth(one))
    client.post("/api/v1/spaces", json={"name": "Elsewhere"}, headers=auth(outsider))
    code = client.get("/api/v1/games/room", headers=auth(one)).json()["code"]
    response = client.post("/api/v1/games/room/join", json={"code": code}, headers=auth(outsider))
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "room_code_invalid"


def test_all_six_games_have_independent_shared_rounds(client):
    one = create_user(client, "six-games-one@example.com", "One")
    two = create_user(client, "six-games-two@example.com", "Two")
    space = client.post("/api/v1/spaces", json={"name": "Together"}, headers=auth(one)).json()
    assert client.post("/api/v1/spaces/join", json={"code": space["code"]}, headers=auth(two)).status_code == 200
    room = client.get("/api/v1/games/room", headers=auth(one)).json()
    assert client.post("/api/v1/games/room/join", json={"code": room["code"], "display_name": "Two"}, headers=auth(two)).status_code == 200
    game_states = {
        "truth-or-dare": {"type": "truth", "prompt": "Test prompt"},
        "would-you-rather": {"prompt": {"a": "A", "b": "B"}, "choices": {}},
        "never-have-i-ever": {"statement": "Test statement", "responses": {}},
        "finish-my-sentence": {"sentence": "I love ______", "answers": {}},
        "tic-tac-toe": {"board": [None] * 9, "turn": "X"},
        "ludo": {"rulesVersion": 3, "turn": 1},
    }
    for key, state in game_states.items():
        initial = client.get(f"/api/v1/games/room/state/{key}", headers=auth(one))
        assert initial.status_code == 200, (key, initial.text)
        saved = client.put(f"/api/v1/games/room/state/{key}", json={"state": state, "expected_revision": initial.json()["revision"]}, headers=auth(one))
        assert saved.status_code == 200, (key, saved.text)
        partner = client.get(f"/api/v1/games/room/state/{key}", headers=auth(two))
        assert partner.status_code == 200
        assert partner.json()["state"] == state
