from __future__ import annotations

import asyncio
import logging
from collections.abc import Awaitable, Callable

from app.ir.base import IRDevice
from app.ir.types import IRSignal

logger = logging.getLogger(__name__)
EventHandler = Callable[[dict[str, object]], Awaitable[None]]


class IRService:
    def __init__(self, device: IRDevice) -> None:
        self.device = device
        self.learning = False
        self.last_signal: IRSignal | None = None
        self._receive_task: asyncio.Task[None] | None = None
        self._handlers: set[EventHandler] = set()
        self._lock = asyncio.Lock()

    def subscribe(self, handler: EventHandler) -> None:
        self._handlers.add(handler)

    def unsubscribe(self, handler: EventHandler) -> None:
        self._handlers.discard(handler)

    async def _broadcast(self, event: dict[str, object]) -> None:
        if self._handlers:
            await asyncio.gather(
                *(handler(event) for handler in tuple(self._handlers)), return_exceptions=True
            )

    async def start_learning(self) -> None:
        async with self._lock:
            if self.learning:
                return
            await self.device.start_learning()
            self.learning = True
            self.last_signal = None
            self._receive_task = asyncio.create_task(self._receive_loop())
        await self._broadcast({"type": "state", "active": True})

    async def stop_learning(self) -> None:
        async with self._lock:
            if not self.learning and self._receive_task is None:
                return
            self.learning = False
            task = self._receive_task
            self._receive_task = None
            if task is not None and task is not asyncio.current_task():
                task.cancel()
            await self.device.stop_learning()
            if task is not None and task is not asyncio.current_task():
                await asyncio.gather(task, return_exceptions=True)
        await self._broadcast({"type": "state", "active": False})

    async def _receive_loop(self) -> None:
        try:
            while self.learning:
                signal = await self.device.receive()
                self.last_signal = signal
                await self._broadcast({"type": "signal", "signal": signal.to_dict()})
                # Keep mock learning continuous; Linux receive may have stopped itself.
                if not self.learning:
                    break
        except asyncio.CancelledError:
            raise
        except Exception as error:
            logger.warning("IR receive stopped: %s", error)
            self.learning = False
            await self._broadcast({"type": "error", "message": str(error)})
            await self._broadcast({"type": "state", "active": False})

    async def transmit(self, signal: IRSignal) -> None:
        await self.device.transmit(signal)

    async def close(self) -> None:
        await self.stop_learning()
        await self.device.close()
