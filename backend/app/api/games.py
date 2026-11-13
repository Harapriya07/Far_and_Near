from typing import Annotated
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.api.deps import CurrentUser
from app.db.session import get_db
from app.services.shared_games import get_or_create_room, join_room, heartbeat_room, get_game_state, update_game_state

router = APIRouter(prefix="/games", tags=["Shared game lounge"])
DbSession = Annotated[Session, Depends(get_db)]

class JoinRoomRequest(BaseModel):
    code: str = Field(min_length=6, max_length=6, pattern=r"^[A-Za-z0-9]{6}$")
    display_name: str | None = Field(default=None, min_length=1, max_length=40)

class GameStateRequest(BaseModel):
    state: dict
    expected_revision: int = Field(ge=0)

@router.get("/room")
def get_room(user: CurrentUser, db: DbSession):
    return get_or_create_room(db, user.id)

@router.post("/room/join")
def join(user: CurrentUser, db: DbSession, payload: JoinRoomRequest):
    return join_room(db, user.id, payload.code, payload.display_name)

@router.get("/room/heartbeat")
def heartbeat(user: CurrentUser, db: DbSession):
    return heartbeat_room(db, user.id)

@router.get("/room/state/{game_key}")
def read_state(game_key: str, user: CurrentUser, db: DbSession):
    return get_game_state(db, user.id, game_key)

@router.put("/room/state/{game_key}")
def write_state(game_key: str, payload: GameStateRequest, user: CurrentUser, db: DbSession):
    return update_game_state(db, user.id, game_key, payload.state, payload.expected_revision)
