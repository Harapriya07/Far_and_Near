from __future__ import annotations
from datetime import date, datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_validator

class SpaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        value = " ".join(value.split())
        if not value:
            raise ValueError("Space name is required")
        return value

class SpaceJoin(BaseModel):
    code: str = Field(min_length=6, max_length=6)
    @field_validator("code")
    @classmethod
    def normalize_code(cls, value: str) -> str:
        return value.strip().upper()

class SpaceMemberResponse(BaseModel):
    id: UUID
    display_name: str
    role: str
    joined_at: datetime

class SpaceResponse(BaseModel):
    id: UUID
    name: str
    code: str
    created_at: datetime
    members: list[SpaceMemberResponse]

class BucketItemCreate(BaseModel):
    text: str = Field(min_length=1, max_length=160)
    category: str = Field(default="experiences", min_length=1, max_length=32)
    note: str = Field(default="", max_length=1000)
    target_date: date | None = None
    completed: bool = False
    @field_validator("text", "category")
    @classmethod
    def clean_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be empty")
        return value
    @field_validator("note")
    @classmethod
    def clean_note(cls, value: str) -> str:
        return value.strip()

class BucketItemUpdate(BaseModel):
    text: str | None = Field(default=None, min_length=1, max_length=160)
    category: str | None = Field(default=None, min_length=1, max_length=32)
    note: str | None = Field(default=None, max_length=1000)
    target_date: date | None = None
    completed: bool | None = None
    @field_validator("text", "category")
    @classmethod
    def clean_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be empty")
        return value

class BucketListImportRequest(BaseModel):
    items: list[BucketItemCreate] = Field(min_length=1, max_length=200)

class BucketItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    text: str
    category: str
    note: str
    target_date: date | None
    completed: bool
    created_by: UUID
    created_at: datetime
    updated_at: datetime
