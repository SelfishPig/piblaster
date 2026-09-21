from typing import Annotated, Any, cast

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.db.database import Database
from app.services.ir_service import IRService


def get_database(request: Request) -> Database:
    return cast(Database, request.app.state.database)


def get_session(database: Annotated[Database, Depends(get_database)]) -> Any:
    yield from database.session()


def get_ir_service(request: Request) -> IRService:
    return cast(IRService, request.app.state.ir_service)


SessionDependency = Annotated[Session, Depends(get_session)]
IRServiceDependency = Annotated[IRService, Depends(get_ir_service)]
