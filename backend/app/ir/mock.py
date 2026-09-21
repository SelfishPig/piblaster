from __future__ import annotations

import asyncio
import logging
from collections.abc import Sequence

from app.ir.base import IRDevice
from app.ir.types import IRSignal

logger = logging.getLogger(__name__)

NEC_SAMPLE = [
    9000,
    4500,
    560,
    560,
    560,
    1690,
    560,
    560,
    560,
    1690,
    560,
    560,
    560,
    560,
    560,
    1690,
    560,
]


class MockIRDevice(IRDevice):
    name = "mock"

    def __init__(self) -> None:
        self._learning = False
        self._signals: asyncio.Queue[IRSignal] = asyncio.Queue()
        self.transmissions: list[IRSignal] = []

    @property
    def receiver_available(self) -> bool:
        return True

    @property
    def transmitter_available(self) -> bool:
        return True

    async def start_learning(self) -> None:
        self._learning = True

    async def stop_learning(self) -> None:
        self._learning = False

    async def receive(self) -> IRSignal:
        if not self._learning:
            raise RuntimeError("Learning is not active")
        return await self._signals.get()

    async def inject(self, signal: IRSignal | None = None) -> IRSignal:
        if not self._learning:
            raise RuntimeError("Start learning before injecting a signal")
        signal = signal or self.sample_signal()
        await self._signals.put(signal)
        return signal

    async def transmit(self, signal: IRSignal) -> None:
        self.transmissions.append(signal)
        logger.info("Mock IR transmission: %s", signal.to_dict())

    async def close(self) -> None:
        self._learning = False

    @staticmethod
    def sample_signal(raw: Sequence[int] | None = None) -> IRSignal:
        return IRSignal(
            carrier_frequency=38_000,
            protocol="NEC",
            address="0x04",
            command="0x08",
            raw=list(raw or NEC_SAMPLE),
        )
