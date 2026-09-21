from __future__ import annotations

from abc import ABC, abstractmethod

from app.ir.types import IRSignal


class IRDevice(ABC):
    name: str

    @property
    @abstractmethod
    def receiver_available(self) -> bool: ...

    @property
    @abstractmethod
    def transmitter_available(self) -> bool: ...

    @abstractmethod
    async def start_learning(self) -> None: ...

    @abstractmethod
    async def stop_learning(self) -> None: ...

    @abstractmethod
    async def receive(self) -> IRSignal: ...

    @abstractmethod
    async def transmit(self, signal: IRSignal) -> None: ...

    @abstractmethod
    async def close(self) -> None: ...
