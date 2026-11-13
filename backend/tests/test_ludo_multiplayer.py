from __future__ import annotations
from conftest import signup_payload


def create_user(client, email, name):
    payload = signup_payload(email=email, display_name=name)
    assert client.post("/api/v1/auth/signup", json=payload).status_code == 201
    login = client.post("/api/v1/auth/login", json={"email": email, "password": payload["password"]})
    assert login.status_code == 200
    return login.json()["access_token"]


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def create_ludo_pair(client, prefix="pair"):
    one = create_user(client, f"{prefix}-one@example.com", "Alex")
    two = create_user(client, f"{prefix}-two@example.com", "Sam")
    space = client.post("/api/v1/spaces", json={"name": "Together"}, headers=auth(one)).json()
    assert client.post("/api/v1/spaces/join", json={"code": space["code"]}, headers=auth(two)).status_code == 200
    lounge = client.get("/api/v1/games/room", headers=auth(one)).json()
    assert client.post("/api/v1/games/room/join", json={"code": lounge["code"], "display_name": "Sam"}, headers=auth(two)).status_code == 200
    client.get("/api/v1/games/ludo/room", headers=auth(one))
    joined = client.get("/api/v1/games/ludo/room", headers=auth(two))
    assert joined.status_code == 200
    return one, two, joined.json()


def _set_room_state(room_id, state):
    from uuid import UUID
    from sqlalchemy.orm import Session
    from app.db.session import get_engine
    from app.models import LudoRoom
    with Session(get_engine()) as db:
        room = db.get(LudoRoom, UUID(room_id))
        room.game_state = state
        db.commit()


def test_ludo_only_red_and_blue_houses_alternate(client):
    one, two, joined = create_ludo_pair(client, "ludo-red-blue")
    assert joined["status"] == "playing"
    assert joined["me"]["seatIndexes"] == [3]
    assert joined["partner"]["seatIndexes"] == [0]
    state = joined["state"]
    assert state["turn"] == 0  # Player one starts with Red
    assert len(state["pieces"][0]) == 4
    assert state["pieces"][1] == [] and state["pieces"][2] == []
    assert len(state["pieces"][3]) == 4
    assert joined["canAct"] is False

    wrong_turn = client.post("/api/v1/games/ludo/room/roll", headers=auth(two))
    assert wrong_turn.status_code == 409
    assert wrong_turn.json()["error"]["code"] == "not_your_turn"

    rolled = client.post("/api/v1/games/ludo/room/roll", headers=auth(one))
    assert rolled.status_code == 200
    if rolled.json()["state"]["dice"] is None:
        assert rolled.json()["state"]["turn"] == 3
    else:
        assert 1 <= rolled.json()["state"]["dice"] <= 6
        legal = [p["id"] for p in rolled.json()["state"]["pieces"][0] if p["step"] == -1 and rolled.json()["state"]["dice"] == 6]
        if legal:
            moved = client.post("/api/v1/games/ludo/room/move", json={"piece_id": legal[0]}, headers=auth(one))
            assert moved.status_code == 200
            assert moved.json()["state"]["turn"] == 3

    # Player two can act only when Blue is the active turn.
    state = rolled.json()["state"]
    if state["turn"] == 3:
        blue_roll = client.post("/api/v1/games/ludo/room/roll", headers=auth(two))
        assert blue_roll.status_code == 200


def test_ludo_capture_only_targets_the_other_active_house(client):
    one, two, joined = create_ludo_pair(client, "ludo-capture-red-blue")
    state = joined["state"]
    state["turn"] = 0  # Red, player one
    state["dice"] = 1
    state["pieces"][0][0]["step"] = 4
    # Blue is positioned on Red's landing square and is capturable.
    state["pieces"][3][0]["step"] = 18
    _set_room_state(joined["id"], state)
    moved = client.post("/api/v1/games/ludo/room/move", json={"piece_id": 0}, headers=auth(one))
    assert moved.status_code == 200
    result = moved.json()["state"]["pieces"]
    assert result[3][0]["step"] == -1
    assert moved.json()["state"]["turn"] == 3


def test_ludo_player_wins_when_all_four_tokens_reach_home(client):
    one, two, joined = create_ludo_pair(client, "ludo-four-token-win")
    state = joined["state"]
    state["turn"] = 0  # Red, player one
    state["dice"] = 1
    state["pieces"][0] = [{"id": i, "step": 57} for i in range(4)]
    state["pieces"][0][3] = {"id": 3, "step": 56}
    _set_room_state(joined["id"], state)
    won = client.post("/api/v1/games/ludo/room/move", json={"piece_id": 3}, headers=auth(one))
    assert won.status_code == 200
    assert won.json()["state"]["winner"] == 0
    assert won.json()["status"] == "finished"

def test_ludo_requires_shared_space_and_game_lounge(client):
    token = create_user(client, "ludo-alone@example.com", "Alone")
    response = client.get("/api/v1/games/ludo/room", headers=auth(token))
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "space_required"


def test_ludo_requires_shared_game_room_code(client):
    one = create_user(client, "ludo-code-one@example.com", "Alex")
    two = create_user(client, "ludo-code-two@example.com", "Sam")
    space = client.post("/api/v1/spaces", json={"name": "Together"}, headers=auth(one)).json()
    client.post("/api/v1/spaces/join", json={"code": space["code"]}, headers=auth(two))
    response = client.get("/api/v1/games/ludo/room", headers=auth(two))
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "room_access_required"
