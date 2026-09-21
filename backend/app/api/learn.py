from __future__ import annotations

from typing import Annotated, cast

from fastapi import APIRouter, Body, HTTPException, Request, WebSocket, WebSocketDisconnect

from app.api.dependencies import IRServiceDependency
from app.ir.mock import MockIRDevice
from app.ir.types import IRSignal
from app.schemas.learn import LearningStatus, MockSignalCreate, SignalRead
from app.services.ir_service import IRService

router = APIRouter(tags=["learning"])


@router.post("/api/learn/start", response_model=LearningStatus)
async def start_learning(ir_service: IRServiceDependency) -> LearningStatus:
    try:
        await ir_service.start_learning()
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    return LearningStatus(active=True, receiver_available=True)


@router.post("/api/learn/stop", response_model=LearningStatus)
async def stop_learning(ir_service: IRServiceDependency) -> LearningStatus:
    await ir_service.stop_learning()
    return LearningStatus(active=False, receiver_available=ir_service.device.receiver_available)


@router.get("/api/learn/status", response_model=LearningStatus)
async def learning_status(ir_service: IRServiceDependency) -> LearningStatus:
    return LearningStatus(
        active=ir_service.learning,
        receiver_available=ir_service.device.receiver_available,
    )


@router.post("/api/learn/test")
async def test_signal(data: SignalRead, ir_service: IRServiceDependency) -> dict[str, bool]:
    if not ir_service.device.transmitter_available:
        raise HTTPException(status_code=503, detail="IR transmitter is unavailable")
    signal = IRSignal(
        carrier_frequency=data.carrier_frequency,
        raw=data.raw,
        protocol=data.protocol,
        address=data.address,
        command=data.command,
        timestamp=data.timestamp,
    )
    try:
        await ir_service.transmit(signal)
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    return {"sent": True}


@router.websocket("/ws/learn")
async def learning_socket(websocket: WebSocket) -> None:
    await websocket.accept()
    ir_service = cast(IRService, websocket.app.state.ir_service)

    async def send(event: dict[str, object]) -> None:
        await websocket.send_json(event)

    ir_service.subscribe(send)
    try:
        await websocket.send_json({"type": "state", "active": ir_service.learning})
        while True:
            # Client messages act as keepalives; state changes arrive via the service callback.
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        ir_service.unsubscribe(send)


def mock_router() -> APIRouter:
    development = APIRouter(tags=["development"])

    @development.post("/api/dev/mock-signal", response_model=SignalRead)
    async def inject_mock_signal(
        request: Request, data: Annotated[MockSignalCreate | None, Body()] = None
    ) -> SignalRead:
        ir_service = cast(IRService, request.app.state.ir_service)
        device = ir_service.device
        if not isinstance(device, MockIRDevice):
            raise HTTPException(status_code=404, detail="Mock IR mode is not enabled")
        data = data or MockSignalCreate()
        signal = IRSignal(
            carrier_frequency=data.carrier_frequency,
            raw=data.raw or device.sample_signal().raw,
            protocol=data.protocol,
            address=data.address,
            command=data.command,
        )
        try:
            await device.inject(signal)
        except RuntimeError as error:
            raise HTTPException(status_code=409, detail=str(error)) from error
        return SignalRead.model_validate(signal.to_dict())

    return development
