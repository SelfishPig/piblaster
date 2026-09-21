from __future__ import annotations

from datetime import datetime

from pydantic import Field, field_validator

from app.schemas.base import APIModel


class CommandCreate(APIModel):
    name: str = Field(min_length=1, max_length=120)
    slug: str | None = Field(default=None, min_length=1, max_length=120)
    protocol: str | None = Field(default=None, max_length=80)
    address: str | None = Field(default=None, max_length=80)
    command: str | None = Field(default=None, max_length=80)
    carrier_frequency: int = Field(default=38_000, ge=10_000, le=1_000_000)
    raw_signal: list[int] = Field(min_length=2, max_length=100_000)

    @field_validator("raw_signal")
    @classmethod
    def valid_timings(cls, value: list[int]) -> list[int]:
        if any(timing <= 0 or timing > 10_000_000 for timing in value):
            raise ValueError("raw signal timings must be positive microsecond values")
        return value


class CommandUpdate(APIModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    slug: str | None = Field(default=None, min_length=1, max_length=120)
    protocol: str | None = Field(default=None, max_length=80)
    address: str | None = Field(default=None, max_length=80)
    command: str | None = Field(default=None, max_length=80)
    carrier_frequency: int | None = Field(default=None, ge=10_000, le=1_000_000)
    raw_signal: list[int] | None = Field(default=None, min_length=2, max_length=100_000)

    @field_validator("raw_signal")
    @classmethod
    def valid_timings(cls, value: list[int] | None) -> list[int] | None:
        if value is not None and any(timing <= 0 or timing > 10_000_000 for timing in value):
            raise ValueError("raw signal timings must be positive microsecond values")
        return value


class CommandRead(APIModel):
    id: int
    remote_id: int
    name: str
    slug: str
    protocol: str | None
    address: str | None
    command: str | None
    carrier_frequency: int
    raw_signal: list[int]
    created_at: datetime
    updated_at: datetime


class SendResult(APIModel):
    sent: bool = True
    command_id: int
