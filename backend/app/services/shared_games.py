from __future__ import annotations
import secrets
import string
from datetime import datetime, timedelta, timezone
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models import SharedGameRoom, Space, SpaceMembership, User
from app.services.auth import AuthError

ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
ONLINE_WINDOW = timedelta(seconds=20)
GAME_KEYS = {"truth-or-dare", "would-you-rather", "never-have-i-ever", "finish-my-sentence", "tic-tac-toe", "ludo"}

def _membership(db: Session, user_id: UUID) -> SpaceMembership:
    membership = db.scalar(select(SpaceMembership).where(SpaceMembership.user_id == user_id))
    if membership is None:
        raise AuthError(409, "space_required", "Join your shared ALYA space before opening the game lounge.")
    return membership

def _new_code(db: Session) -> str:
    for _ in range(30):
        code = "".join(secrets.choice(ALPHABET) for _ in range(6))
        if db.scalar(select(SharedGameRoom.id).where(SharedGameRoom.code == code)) is None:
            return code
    raise AuthError(503, "room_code_unavailable", "Could not generate a room code. Please try again.")

def _is_online(value: datetime | None, now: datetime) -> bool:
    if value is None:
        return False
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return now - value <= ONLINE_WINDOW

def _touch(room: SharedGameRoom, user_id: UUID, now: datetime) -> None:
    if room.player_one_id == user_id:
        room.player_one_seen_at = now
    elif room.player_two_id == user_id:
        room.player_two_seen_at = now
    else:
        raise AuthError(403, "room_access_required", "Join this shared room with its six-character code first.")

def _serialize(db: Session, room: SharedGameRoom, user_id: UUID) -> dict:
    now = datetime.now(timezone.utc)
    one = db.get(User, room.player_one_id)
    two = db.get(User, room.player_two_id) if room.player_two_id else None
    joined = user_id in {room.player_one_id, room.player_two_id}
    one_online, two_online = _is_online(room.player_one_seen_at, now), _is_online(room.player_two_seen_at, now)
    return {
        "id": str(room.id), "code": room.code, "joined": joined,
        "status": "ready" if two and one_online and two_online else "waiting",
        "players": [
            {"id": str(one.id), "name": room.player_one_name or one.display_name, "online": one_online},
            *([{"id": str(two.id), "name": room.player_two_name or two.display_name, "online": two_online}] if two else [None]),
        ],
        "me": {"id": str(user_id), "name": (room.player_one_name or one.display_name) if user_id == one.id else ((room.player_two_name or two.display_name) if two else None)},
        "partner": ({"id": str(two.id), "name": room.player_two_name or two.display_name, "online": two_online} if user_id == one.id and two else ({"id": str(one.id), "name": room.player_one_name or one.display_name, "online": one_online} if user_id == (two.id if two else None) else None)),
        "bothJoined": bool(two), "bothOnline": bool(two and one_online and two_online),
        "states": room.states or {}, "revisions": room.revisions or {},
        "updatedAt": room.updated_at.isoformat() if room.updated_at else None,
    }

def get_or_create_room(db: Session, user_id: UUID) -> dict:
    membership = _membership(db, user_id)
    space = db.scalar(select(Space).where(Space.id == membership.space_id).with_for_update())
    if space is None:
        raise AuthError(404, "space_not_found", "Your shared space could not be found.")
    room = db.scalar(select(SharedGameRoom).where(SharedGameRoom.space_id == membership.space_id).with_for_update())
    now = datetime.now(timezone.utc)
    if room is None:
        owner = db.get(User, user_id)
        room = SharedGameRoom(space_id=membership.space_id, code=_new_code(db), player_one_id=user_id, player_one_name=owner.display_name if owner else None, player_one_seen_at=now, states={}, revisions={})
        db.add(room)
        db.flush()
    if user_id in {room.player_one_id, room.player_two_id}:
        _touch(room, user_id, now)
    db.commit()
    db.refresh(room)
    return _serialize(db, room, user_id)

def join_room(db: Session, user_id: UUID, code: str, display_name: str | None = None) -> dict:
    membership = _membership(db, user_id)
    normalized = code.strip().upper()
    room = db.scalar(select(SharedGameRoom).where(SharedGameRoom.code == normalized).with_for_update())
    if room is None or room.space_id != membership.space_id:
        raise AuthError(404, "room_code_invalid", "That room code is invalid for your shared space.")
    now = datetime.now(timezone.utc)
    clean_name = (display_name or "").strip()[:40]
    if not clean_name:
        user = db.get(User, user_id)
        clean_name = user.display_name if user else "Partner"
    if room.player_one_id == user_id:
        room.player_one_name = clean_name
        _touch(room, user_id, now)
    elif room.player_two_id is None:
        room.player_two_id = user_id
        room.player_two_name = clean_name
        room.player_two_seen_at = now
    elif room.player_two_id == user_id:
        room.player_two_name = clean_name
        _touch(room, user_id, now)
    else:
        raise AuthError(409, "room_full", "This shared room already has both partners.")
    db.commit()
    db.refresh(room)
    return _serialize(db, room, user_id)

def heartbeat_room(db: Session, user_id: UUID) -> dict:
    membership = _membership(db, user_id)
    room = db.scalar(select(SharedGameRoom).where(SharedGameRoom.space_id == membership.space_id).with_for_update())
    if room is None:
        return get_or_create_room(db, user_id)
    if user_id in {room.player_one_id, room.player_two_id}:
        _touch(room, user_id, datetime.now(timezone.utc))
        db.commit()
        db.refresh(room)
    return _serialize(db, room, user_id)

def get_game_state(db: Session, user_id: UUID, game_key: str) -> dict:
    if game_key not in GAME_KEYS:
        raise AuthError(404, "game_not_found", "Unknown game.")
    room_data = heartbeat_room(db, user_id)
    if not room_data["joined"]:
        raise AuthError(403, "room_access_required", "Enter the shared room code before playing.")
    return {"game": game_key, "state": room_data["states"].get(game_key), "revision": room_data["revisions"].get(game_key, 0), "room": room_data}

def update_game_state(db: Session, user_id: UUID, game_key: str, state: dict, expected_revision: int) -> dict:
    if game_key not in GAME_KEYS:
        raise AuthError(404, "game_not_found", "Unknown game.")
    if len(str(state)) > 50000:
        raise AuthError(413, "state_too_large", "Game state is too large.")
    membership = _membership(db, user_id)
    room = db.scalar(select(SharedGameRoom).where(SharedGameRoom.space_id == membership.space_id).with_for_update())
    if room is None or user_id not in {room.player_one_id, room.player_two_id} or room.player_two_id is None:
        raise AuthError(409, "partner_not_joined", "Wait until your partner joins the shared room.")
    current = (room.revisions or {}).get(game_key, 0)
    if expected_revision != current:
        raise AuthError(409, "state_conflict", "Your partner updated this game. The latest state is being refreshed.")
    states, revisions = dict(room.states or {}), dict(room.revisions or {})
    states[game_key] = state
    revisions[game_key] = current + 1
    room.states, room.revisions = states, revisions
    _touch(room, user_id, datetime.now(timezone.utc))
    db.commit()
    db.refresh(room)
    return {"game": game_key, "state": states[game_key], "revision": revisions[game_key], "room": _serialize(db, room, user_id)}
