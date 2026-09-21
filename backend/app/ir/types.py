from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any


@dataclass(slots=True)
class IRSignal:
    carrier_frequency: int
    raw: list[int]
    protocol: str | None = None
    address: str | None = None
    command: str | None = None
    timestamp: datetime = field(default_factory=lambda: datetime.now(UTC))

    def to_dict(self) -> dict[str, Any]:
        return {
            "carrierFrequency": self.carrier_frequency,
            "raw": self.raw,
            "protocol": self.protocol,
            "address": self.address,
            "command": self.command,
            "timestamp": self.timestamp.isoformat(),
        }
