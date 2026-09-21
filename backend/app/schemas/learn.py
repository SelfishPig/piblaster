from __future__ import annotations

from datetime import datetime

from pydantic import Field, field_validator

from app.schemas.base import APIModel


class SignalRead(APIModel):
    carrier_frequency: int
    raw: list[int]
    protocol: str | None = None
    address: str | None = None
    command: str | None = None
    timestamp: datetime


class MockSignalCreate(APIModel):
    carrier_frequency: int = Field(default=38_000, ge=10_000, le=1_000_000)
    raw: list[int] | None = Field(default=None, min_length=2, max_length=100_000)
    protocol: str | None = Field(default="NEC", max_length=80)
    address: str | None = Field(default="0x04", max_length=80)
    command: str | None = Field(default="0x08", max_length=80)

    @field_validator("raw")
    @classmethod
    def valid_timings(cls, value: list[int] | None) -> list[int] | None:
        if value is not None and any(timing <= 0 or timing > 10_000_000 for timing in value):
            raise ValueError("raw timings must be positive microsecond values")
        return value


class LearningStatus(APIModel):
    active: bool
    receiver_available: bool


class LearningEvent(APIModel):
    type: str
    active: bool | None = None
    signal: SignalRead | None = None
