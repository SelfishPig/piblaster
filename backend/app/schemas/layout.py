from datetime import datetime
from typing import Literal

from pydantic import Field, field_validator

from app.schemas.base import APIModel


class LayoutControl(APIModel):
    command_id: int | None = None
    label: str | None = None
    icon: str | None = None


class LayoutRow(APIModel):
    id: str = Field(min_length=1)
    type: Literal[
        "button-1", "button-2", "button-3", "arrow-wheel", "volume-channel", "rocker-buttons"
    ]
    controls: list[LayoutControl]


class LayoutCreate(APIModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=1000)
    rows: list[LayoutRow] = Field(default_factory=list)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("A layout needs a name")
        return value.strip()


class LayoutUpdate(APIModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=1000)
    rows: list[LayoutRow] | None = None

    @field_validator("name", "rows")
    @classmethod
    def reject_null(cls, value: object) -> object:
        if value is None:
            raise ValueError("Name and rows cannot be null")
        if isinstance(value, str):
            return LayoutCreate.strip_name(value)
        return value


class LayoutRead(APIModel):
    id: int
    name: str
    description: str | None
    rows: list[LayoutRow]
    created_at: datetime
    updated_at: datetime
