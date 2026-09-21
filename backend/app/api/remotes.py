from fastapi import APIRouter, HTTPException, Response, status

from app.api.dependencies import SessionDependency
from app.schemas.command import CommandCreate, CommandRead
from app.schemas.remote import RemoteCreate, RemoteRead, RemoteUpdate
from app.services import remote_service
from app.services.remote_service import ConflictError

router = APIRouter(prefix="/api/remotes", tags=["remotes"])


def _not_found() -> HTTPException:
    return HTTPException(status_code=404, detail="Remote not found")


@router.get("", response_model=list[RemoteRead])
def get_remotes(session: SessionDependency) -> list[object]:
    return list(remote_service.list_remotes(session))


@router.post("", response_model=RemoteRead, status_code=status.HTTP_201_CREATED)
def post_remote(data: RemoteCreate, session: SessionDependency) -> object:
    try:
        return remote_service.create_remote(session, data)
    except (ConflictError, ValueError) as error:
        raise HTTPException(status_code=409, detail=str(error)) from error


@router.get("/{remote_id}", response_model=RemoteRead)
def get_remote(remote_id: int, session: SessionDependency) -> object:
    remote = remote_service.get_remote(session, remote_id)
    if remote is None:
        raise _not_found()
    return remote


@router.patch("/{remote_id}", response_model=RemoteRead)
def patch_remote(remote_id: int, data: RemoteUpdate, session: SessionDependency) -> object:
    remote = remote_service.get_remote(session, remote_id)
    if remote is None:
        raise _not_found()
    try:
        return remote_service.update_remote(session, remote, data)
    except (ConflictError, ValueError) as error:
        raise HTTPException(status_code=409, detail=str(error)) from error


@router.delete("/{remote_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_remote(remote_id: int, session: SessionDependency) -> Response:
    remote = remote_service.get_remote(session, remote_id)
    if remote is None:
        raise _not_found()
    remote_service.delete_remote(session, remote)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{remote_id}/commands", response_model=list[CommandRead])
def get_remote_commands(remote_id: int, session: SessionDependency) -> list[object]:
    if remote_service.get_remote(session, remote_id) is None:
        raise _not_found()
    return list(remote_service.list_commands(session, remote_id))


@router.post(
    "/{remote_id}/commands", response_model=CommandRead, status_code=status.HTTP_201_CREATED
)
def post_remote_command(remote_id: int, data: CommandCreate, session: SessionDependency) -> object:
    if remote_service.get_remote(session, remote_id) is None:
        raise _not_found()
    try:
        return remote_service.create_command(session, remote_id, data)
    except (ConflictError, ValueError) as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
