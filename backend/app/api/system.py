from time import monotonic

from fastapi import APIRouter, Request

from app import __version__
from app.api.dependencies import IRServiceDependency
from app.db.database import database_healthy
from app.schemas.system import SystemStatus

router = APIRouter(prefix="/api/system", tags=["system"])


@router.get("/status", response_model=SystemStatus)
def system_status(request: Request, ir_service: IRServiceDependency) -> SystemStatus:
    healthy = database_healthy(request.app.state.database.engine)
    return SystemStatus(
        version=__version__,
        ir_backend=ir_service.device.name,
        receiver_available=ir_service.device.receiver_available,
        transmitter_available=ir_service.device.transmitter_available,
        learning=ir_service.learning,
        database="ok" if healthy else "error",
        uptime_seconds=int(monotonic() - request.app.state.started_at),
    )
