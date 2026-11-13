from typing import Annotated
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.api.deps import CurrentUser
from app.db.session import get_db
from app.services.ludo import create_next_room, get_room, move_piece, roll_dice

router = APIRouter(prefix="/games/ludo", tags=["Ludo multiplayer"])
DbSession = Annotated[Session, Depends(get_db)]

class LudoMoveRequest(BaseModel):
    piece_id: int = Field(ge=0, le=3)

@router.get("/room", summary="Create or join the shared Ludo room")
def current_room(user: CurrentUser, db: DbSession):
    return get_room(db, user.id)

@router.post("/room/new", summary="Start a new shared Ludo round")
def new_room(user: CurrentUser, db: DbSession):
    return create_next_room(db, user.id)

@router.post("/room/roll", summary="Roll the server-authoritative Ludo dice")
def roll(user: CurrentUser, db: DbSession):
    return roll_dice(db, user.id)

@router.post("/room/move", summary="Move a legal Ludo token")
def move(payload: LudoMoveRequest, user: CurrentUser, db: DbSession):
    return move_piece(db, user.id, payload.piece_id)
