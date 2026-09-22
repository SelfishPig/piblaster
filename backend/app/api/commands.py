from fastapi import APIRouter, HTTPException, Response, status

from app.api.dependencies import IRServiceDependency, SessionDependency
from app.ir.types import IRSignal
from app.models import Command
from app.schemas.command import CommandRead, CommandUpdate, SendResult
from app.services import remote_service
from app.services.remote_service import ConflictError

router = APIRouter(tags=["commands"])


def _not_found() -> HTTPException:
    return HTTPException(status_code=404, detail="Command not found")


def _signal(item: Command) -> IRSignal:
    return IRSignal(
        carrier_frequency=item.carrier_frequency,
        raw=item.raw_signal,
        protocol=item.protocol,
        address=item.address,
        command=item.command,
    )


async def _send(item: Command, ir_service: IRServiceDependency) -> SendResult:
    if not ir_service.device.transmitter_available:
        raise HTTPException(status_code=503, detail="IR transmitter is unavailable")
    try:
        await ir_service.transmit(_signal(item))
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    return SendResult(command_id=item.id)


@router.get("/api/commands", response_model=list[CommandRead])
def get_commands(session: SessionDependency) -> list[object]:
    return list(remote_service.list_commands(session))


@router.get("/api/commands/{command_id}", response_model=CommandRead)
def get_command(command_id: int, session: SessionDependency) -> object:
    item = remote_service.get_command(session, command_id)
    if item is None:
        raise _not_found()
    return item


@router.patch("/api/commands/{command_id}", response_model=CommandRead)
def patch_command(command_id: int, data: CommandUpdate, session: SessionDependency) -> object:
    item = remote_service.get_command(session, command_id)
    if item is None:
        raise _not_found()
    try:
        return remote_service.update_command(session, item, data)
    except (ConflictError, ValueError) as error:
        raise HTTPException(status_code=409, detail=str(error)) from error


@router.delete("/api/commands/{command_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_command(command_id: int, session: SessionDependency) -> Response:
    item = remote_service.get_command(session, command_id)
    if item is None:
        raise _not_found()
    remote_service.delete_command(session, item)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/api/commands/{command_id}/send", response_model=SendResult)
async def send_command(
    command_id: int, session: SessionDependency, ir_service: IRServiceDependency
) -> SendResult:
    item = remote_service.get_command(session, command_id)
    if item is None:
        raise _not_found()
    return await _send(item, ir_service)


@router.post("/api/send/{remote_slug}/{command_slug}", response_model=SendResult)
async def send_by_slug(
    remote_slug: str,
    command_slug: str,
    session: SessionDependency,
    ir_service: IRServiceDependency,
) -> SendResult:
    item = remote_service.get_command_by_slugs(session, remote_slug, command_slug)
    if item is None:
        raise _not_found()
    return await _send(item, ir_service)
