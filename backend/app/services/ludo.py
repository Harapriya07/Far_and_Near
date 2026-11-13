from __future__ import annotations
import secrets
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models import LudoRoom, SharedGameRoom, Space, SpaceMembership, User
from app.services.auth import AuthError

ONLINE_WINDOW = timedelta(seconds=18)
PLAYER_NAMES = ["Red", "Green", "Yellow", "Blue"]
PLAYER_HEX = ["#E85D5D", "#42A879", "#E6B938", "#4F6BFF"]
SAFE_SQUARES = {0, 8, 13, 21, 26, 34, 39, 47}
FINISH = 57
STARTS = [0, 13, 26, 39]
# Two-player mode: Player 1 owns Red (0), Player 2 owns Blue (3).
COLOR_OWNER = [0, None, None, 1]
ACTIVE_COLORS = (0, 3)
TURN_ORDER = [0, 3]
RULES_VERSION = 4


def _next_turn(color_index: int) -> int:
    return TURN_ORDER[(TURN_ORDER.index(color_index) + 1) % len(TURN_ORDER)]


def _team_colors(team: int) -> tuple[int, int]:
    return (0,) if team == 0 else (3,)


def new_game_state() -> dict:
    return {
        "rulesVersion": RULES_VERSION,
        "turn": 0,
        "dice": None,
        "lastRoll": None,
        "lastRollPlayer": None,
        "pieces": [[{"id": i, "step": -1} for i in range(4)] if color in ACTIVE_COLORS else [] for color in range(4)],
        "winner": None,
        "message": "Red starts. Roll a six to bring a token out.",
    }


def _membership(db: Session, user_id: UUID) -> SpaceMembership:
    membership = db.scalar(select(SpaceMembership).where(SpaceMembership.user_id == user_id))
    if membership is None:
        raise AuthError(409, "space_required", "Join your shared ALYA space before playing Ludo.")
    lounge = db.scalar(select(SharedGameRoom).where(SharedGameRoom.space_id == membership.space_id))
    if lounge is None or lounge.player_two_id is None or user_id not in {lounge.player_one_id, lounge.player_two_id}:
        raise AuthError(403, "room_access_required", "Join the shared game lounge with its six-character code before playing Ludo.")
    return membership


def _touch(room: LudoRoom, user_id: UUID, now: datetime) -> None:
    if room.player_one_id == user_id:
        room.player_one_seen_at = now
    elif room.player_two_id == user_id:
        room.player_two_seen_at = now
    else:
        raise AuthError(403, "not_a_player", "You are not a player in this Ludo room.")


def _is_online(seen_at: datetime | None, now: datetime) -> bool:
    if seen_at is None:
        return False
    if seen_at.tzinfo is None:
        seen_at = seen_at.replace(tzinfo=timezone.utc)
    return now - seen_at <= ONLINE_WINDOW


def _refresh_status(room: LudoRoom, now: datetime) -> tuple[bool, bool]:
    one_online = _is_online(room.player_one_seen_at, now)
    two_online = _is_online(room.player_two_seen_at, now)
    if room.game_state.get("winner") is not None:
        room.status = "finished"
    else:
        room.status = "playing" if room.player_two_id and one_online and two_online else "waiting"
    return one_online, two_online


def _room_for_user(db: Session, user_id: UUID, create: bool = True) -> tuple[LudoRoom, SpaceMembership]:
    membership = _membership(db, user_id)
    space = db.scalar(select(Space).where(Space.id == membership.space_id).with_for_update())
    if space is None:
        raise AuthError(404, "space_not_found", "Your shared space could not be found.")
    room = db.scalar(select(LudoRoom).where(LudoRoom.space_id == membership.space_id).order_by(LudoRoom.created_at.desc()).with_for_update())
    now = datetime.now(timezone.utc)
    if room is None:
        if not create:
            raise AuthError(404, "ludo_room_not_found", "There is no Ludo room yet.")
        owner = db.get(User, user_id)
        room = LudoRoom(space_id=membership.space_id, player_one_id=user_id, status="waiting", game_state=new_game_state(), player_one_seen_at=now)
        db.add(room)
        db.flush()
    else:
        if room.status == "finished" and user_id not in {room.player_one_id, room.player_two_id}:
            raise AuthError(403, "not_a_player", "You are not a player in this Ludo room.")
        if room.game_state.get("rulesVersion") != RULES_VERSION and room.status != "finished":
            room.game_state = new_game_state()
        if user_id in {room.player_one_id, room.player_two_id}:
            _touch(room, user_id, now)
        elif room.player_two_id is None and room.status != "finished":
            room.player_two_id = user_id
            room.player_two_seen_at = now
        else:
            raise AuthError(409, "ludo_room_full", "This Ludo room already belongs to your two-person space.")
    _refresh_status(room, now)
    db.commit()
    db.refresh(room)
    return room, membership


def _serialize(db: Session, room: LudoRoom, user_id: UUID) -> dict:
    now = datetime.now(timezone.utc)
    one_online, two_online = _refresh_status(room, now)
    one = db.get(User, room.player_one_id)
    two = db.get(User, room.player_two_id) if room.player_two_id else None
    me_is_one = room.player_one_id == user_id
    me = one if me_is_one else two
    partner = two if me_is_one else one
    my_online = one_online if me_is_one else two_online
    partner_online = two_online if me_is_one else one_online
    my_team = 0 if me_is_one else 1
    partner_team = 1 - my_team
    my_color = 0 if me_is_one else 3
    partner_color = 3 if me_is_one else 0
    turn = room.game_state.get("turn", 0)
    return {
        "id": str(room.id), "status": room.status, "state": room.game_state,
        "me": {"id": str(me.id), "name": me.display_name, "team": my_team, "colorIndex": my_color, "seatIndexes": [my_color]},
        "partner": ({"id": str(partner.id), "name": partner.display_name, "team": partner_team, "colorIndex": partner_color, "seatIndexes": [partner_color]} if partner else None),
        "players": [
            {"id": str(one.id), "name": one.display_name, "team": 0, "colorIndex": 0, "seatIndexes": [0], "online": one_online},
            *([{"id": str(two.id), "name": two.display_name, "team": 1, "colorIndex": 3, "seatIndexes": [3], "online": two_online}] if two else []),
        ],
        "partnerOnline": partner_online, "bothOnline": my_online and partner_online,
        "canAct": room.status == "playing" and my_online and partner_online and room.game_state.get("winner") is None and turn in ACTIVE_COLORS and COLOR_OWNER[turn] == my_team,
        "updatedAt": room.updated_at.isoformat() if room.updated_at else None,
    }


def get_room(db: Session, user_id: UUID) -> dict:
    room, _ = _room_for_user(db, user_id)
    return _serialize(db, room, user_id)


def create_next_room(db: Session, user_id: UUID) -> dict:
    membership = _membership(db, user_id)
    space = db.scalar(select(Space).where(Space.id == membership.space_id).with_for_update())
    if space is None:
        raise AuthError(404, "space_not_found", "Your shared space could not be found.")
    room = db.scalar(select(LudoRoom).where(LudoRoom.space_id == membership.space_id).order_by(LudoRoom.created_at.desc()).with_for_update())
    now = datetime.now(timezone.utc)
    if room and room.status != "finished":
        if user_id not in {room.player_one_id, room.player_two_id}:
            raise AuthError(409, "ludo_room_full", "The current Ludo room already has both players.")
        _touch(room, user_id, now)
    else:
        if room is not None and user_id not in {room.player_one_id, room.player_two_id}:
            raise AuthError(403, "not_a_player", "You are not a player in this Ludo room.")
        first_id = room.player_one_id if room else user_id
        second_id = room.player_two_id if room else None
        first_seen = now if user_id == first_id else (room.player_one_seen_at if room else None)
        second_seen = now if user_id == second_id else (room.player_two_seen_at if room else None)
        room = LudoRoom(space_id=membership.space_id, player_one_id=first_id, player_two_id=second_id, status="waiting", game_state=new_game_state(), player_one_seen_at=first_seen, player_two_seen_at=second_seen)
        db.add(room)
        db.flush()
    _refresh_status(room, now)
    db.commit(); db.refresh(room)
    return _serialize(db, room, user_id)


def _active_room(db: Session, user_id: UUID) -> LudoRoom:
    membership = _membership(db, user_id)
    room = db.scalar(select(LudoRoom).where(LudoRoom.space_id == membership.space_id, LudoRoom.status != "finished").order_by(LudoRoom.created_at.desc()).with_for_update())
    if room is None or user_id not in {room.player_one_id, room.player_two_id}:
        raise AuthError(404, "ludo_room_not_found", "Your Ludo room is no longer available. Reopen the game to create a new one.")
    now = datetime.now(timezone.utc)
    _touch(room, user_id, now)
    if room.game_state.get("rulesVersion") != RULES_VERSION:
        room.game_state = new_game_state()
    _refresh_status(room, now)
    if room.status != "playing":
        db.commit()
        raise AuthError(409, "partner_not_ready", "Waiting for your partner to be online. The game will resume when both of you are here.")
    return room


def _assert_turn(room: LudoRoom, user_id: UUID) -> None:
    color = room.game_state["turn"]
    if color not in ACTIVE_COLORS:
        raise AuthError(409, "invalid_game_state", "The current Ludo turn is not assigned to an active house.")
    expected = room.player_one_id if COLOR_OWNER[color] == 0 else room.player_two_id
    if expected != user_id:
        raise AuthError(409, "not_your_turn", "It's your partner's turn. Wait for them to play.")


def _track_index(player: int, step: int) -> int | None:
    if step < 0 or step >= 52:
        return None
    return (STARTS[player] + step) % 52


def _legal_moves(state: dict, roll: int) -> list[int]:
    color = state["turn"]
    return [p["id"] for p in state["pieces"][color] if p["step"] != FINISH and ((p["step"] == -1 and roll == 6) or (p["step"] >= 0 and p["step"] + roll <= FINISH))]


def roll_dice(db: Session, user_id: UUID) -> dict:
    room = _active_room(db, user_id); _assert_turn(room, user_id)
    state = deepcopy(room.game_state)
    if state["dice"] is not None or state["winner"] is not None:
        raise AuthError(409, "invalid_game_action", "Move your token before rolling again.")
    roll = secrets.randbelow(6) + 1
    state["dice"] = roll; state["lastRoll"] = roll; state["lastRollPlayer"] = state["turn"]
    if not _legal_moves(state, roll):
        old_color = state["turn"]; next_color = _next_turn(old_color)
        state.update({"dice": None, "turn": next_color, "message": f"No legal move on {roll}. {PLAYER_NAMES[next_color]}'s turn."})
    else:
        state["message"] = f"{PLAYER_NAMES[state['turn']]} rolled {roll}. Choose a highlighted token."
    room.game_state = state; _refresh_status(room, datetime.now(timezone.utc))
    db.commit(); db.refresh(room)
    return _serialize(db, room, user_id)


def move_piece(db: Session, user_id: UUID, piece_id: int) -> dict:
    if piece_id not in range(4):
        raise AuthError(422, "invalid_piece", "Choose a valid token.")
    room = _active_room(db, user_id); _assert_turn(room, user_id)
    state = deepcopy(room.game_state); roll = state["dice"]
    if roll is None or piece_id not in _legal_moves(state, roll):
        raise AuthError(409, "illegal_move", "That token cannot move with the current roll.")
    color = state["turn"]; current = state["pieces"][color][piece_id]
    step = 0 if current["step"] == -1 else current["step"] + roll
    state["pieces"][color][piece_id] = {"id": piece_id, "step": step}
    captured = None; landing = _track_index(color, step)
    if landing is not None and landing not in SAFE_SQUARES:
        for opponent_color in ACTIVE_COLORS:
            if opponent_color == color:
                continue
            for other in state["pieces"][opponent_color]:
                if _track_index(opponent_color, other["step"]) == landing:
                    other["step"] = -1; captured = PLAYER_NAMES[opponent_color]
    team = COLOR_OWNER[color]
    team_complete = all(piece["step"] == FINISH for piece in state["pieces"][color])
    if team_complete:
        winner_user = db.get(User, room.player_one_id if team == 0 else room.player_two_id)
        state.update({"dice": None, "winner": team, "message": f"{winner_user.display_name if winner_user else 'Player'} wins! All four tokens are home."})
        room.status = "finished"
    else:
        next_color = _next_turn(color)
        state.update({"dice": None, "turn": next_color})
        if captured: state["message"] = f"{PLAYER_NAMES[color]} captured a {captured} token! {PLAYER_NAMES[next_color]}'s turn."
        elif current["step"] == -1: state["message"] = f"{PLAYER_NAMES[color]} entered a token. {PLAYER_NAMES[next_color]}'s turn."
        else: state["message"] = f"{PLAYER_NAMES[color]} moved {roll} spaces. {PLAYER_NAMES[next_color]}'s turn."
    room.game_state = state; _refresh_status(room, datetime.now(timezone.utc))
    db.commit(); db.refresh(room)
    return _serialize(db, room, user_id)


def rematch(db: Session, user_id: UUID) -> dict:
    membership = _membership(db, user_id)
    room = db.scalar(select(LudoRoom).where(LudoRoom.space_id == membership.space_id).order_by(LudoRoom.created_at.desc()).with_for_update())
    if room is None or user_id not in {room.player_one_id, room.player_two_id}:
        raise AuthError(404, "ludo_room_not_found", "The previous Ludo room could not be found.")
    _touch(room, user_id, datetime.now(timezone.utc))
    room.game_state = new_game_state(); room.status = "waiting"
    _refresh_status(room, datetime.now(timezone.utc))
    db.commit(); db.refresh(room)
    return _serialize(db, room, user_id)
