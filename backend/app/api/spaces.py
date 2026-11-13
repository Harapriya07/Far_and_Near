from typing import Annotated
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.api.deps import CurrentUser
from app.db.session import get_db
from app.schemas.spaces import SpaceCreate, SpaceJoin, SpaceResponse
from app.services.spaces import create_space, get_user_space, join_space, serialize_space

router = APIRouter(prefix="/spaces", tags=["shared spaces"])
DbSession = Annotated[Session, Depends(get_db)]

@router.get("/me", response_model=SpaceResponse | None)
def my_space(user: CurrentUser, db: DbSession):
    space = get_user_space(db, user.id)
    return serialize_space(space) if space else None

@router.post("", response_model=SpaceResponse, status_code=status.HTTP_201_CREATED)
def new_space(payload: SpaceCreate, user: CurrentUser, db: DbSession):
    return serialize_space(create_space(db, user, payload.name))

@router.post("/join", response_model=SpaceResponse)
def join(payload: SpaceJoin, user: CurrentUser, db: DbSession):
    return serialize_space(join_space(db, user, payload.code))
