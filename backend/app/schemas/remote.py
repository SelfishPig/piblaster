from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import Field, field_validator

from app.schemas.base import APIModel


class RemoteCreate(APIModel):
    name: str = Field(min_length=1, max_length=120)
    slug: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=1000)
    layout: dict[str, Any] | None = None

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        return value.strip()


class RemoteUpdate(APIModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    slug: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=1000)
    layout: dict[str, Any] | None = None


class RemoteRead(APIModel):
    id: int
    name: str
    slug: str
    description: str | None
    layout: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime
