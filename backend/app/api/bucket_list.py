from typing import Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.api.deps import CurrentUser
from app.db.session import get_db
from app.models import BucketItem, SpaceMembership
from app.schemas.spaces import BucketItemCreate, BucketItemResponse, BucketItemUpdate, BucketListImportRequest
from app.services.auth import AuthError

router = APIRouter(prefix="/bucket-list", tags=["shared bucket list"])
DbSession = Annotated[Session, Depends(get_db)]

def _space_id(db: Session, user_id: UUID):
    membership = db.scalar(select(SpaceMembership).where(SpaceMembership.user_id == user_id))
    if membership is None:
        raise AuthError(409, "space_required", "Create or join a shared space before using the bucket list.")
    return membership.space_id

@router.get("", response_model=list[BucketItemResponse])
def list_items(user: CurrentUser, db: DbSession):
    space_id = _space_id(db, user.id)
    return db.scalars(select(BucketItem).where(BucketItem.space_id == space_id).order_by(BucketItem.created_at.desc())).all()

@router.post("", response_model=BucketItemResponse, status_code=status.HTTP_201_CREATED)
def add_item(payload: BucketItemCreate, user: CurrentUser, db: DbSession):
    item = BucketItem(space_id=_space_id(db, user.id), created_by=user.id, text=payload.text, category=payload.category, note=payload.note, target_date=payload.target_date, completed=payload.completed)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.post("/import", response_model=list[BucketItemResponse], status_code=status.HTTP_201_CREATED)
def import_legacy_items(payload: BucketListImportRequest, user: CurrentUser, db: DbSession):
    space_id = _space_id(db, user.id)
    existing = db.scalar(select(func.count(BucketItem.id)).where(BucketItem.space_id == space_id)) or 0
    if existing:
        raise AuthError(409, "bucket_list_not_empty", "Import is available only when your shared list is empty.")
    items = [BucketItem(space_id=space_id, created_by=user.id, text=item.text, category=item.category, note=item.note, target_date=item.target_date, completed=item.completed) for item in payload.items]
    db.add_all(items)
    db.commit()
    for item in items:
        db.refresh(item)
    return items

@router.patch("/{item_id}", response_model=BucketItemResponse)
def update_item(item_id: UUID, payload: BucketItemUpdate, user: CurrentUser, db: DbSession):
    space_id = _space_id(db, user.id)
    item = db.scalar(select(BucketItem).where(BucketItem.id == item_id, BucketItem.space_id == space_id))
    if item is None:
        raise AuthError(404, "bucket_item_not_found", "That bucket-list item could not be found.")
    changes = payload.model_dump(exclude_unset=True)
    for key, value in changes.items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: UUID, user: CurrentUser, db: DbSession):
    space_id = _space_id(db, user.id)
    item = db.scalar(select(BucketItem).where(BucketItem.id == item_id, BucketItem.space_id == space_id))
    if item is None:
        raise AuthError(404, "bucket_item_not_found", "That bucket-list item could not be found.")
    db.delete(item)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
