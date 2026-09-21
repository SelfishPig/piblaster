from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from starlette.exceptions import HTTPException
from starlette.responses import Response
from starlette.staticfiles import StaticFiles
from starlette.types import Scope

from app.api import commands, learn, remotes, system
from app.config import Settings
from app.db.database import Database
from app.ir.base import IRDevice
from app.ir.linux import LinuxIRDevice
from app.ir.mock import MockIRDevice
from app.schemas.remote import RemoteCreate
from app.services.ir_service import IRService
from app.services.remote_service import create_remote, list_remotes


class SPAStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope: Scope) -> Response:
        try:
            response = await super().get_response(path, scope)
        except HTTPException as error:
            if error.status_code != 404:
                raise
            return await super().get_response("index.html", scope)
        if response.status_code == 404:
            response = await super().get_response("index.html", scope)
        return response


def _device(settings: Settings) -> IRDevice:
    if settings.ir_backend == "linux":
        return LinuxIRDevice()
    return MockIRDevice()


def create_app(settings: Settings | None = None) -> FastAPI:
    config = settings or Settings.from_env()
    database = Database(config.database_path)
    ir_service = IRService(_device(config))

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        from time import monotonic

        database.create_tables()
        app.state.started_at = monotonic()
        if config.seed_example:
            with database.session_factory() as session:
                if not list_remotes(session):
                    create_remote(
                        session,
                        RemoteCreate(
                            name="Living Room TV",
                            description="Example remote — learn commands to add buttons",
                        ),
                    )
        yield
        await ir_service.close()
        database.close()

    app = FastAPI(
        title="PiBlaster API",
        description="Local REST and WebSocket API for learned infrared remotes.",
        version="0.1.0",
        lifespan=lifespan,
    )
    app.state.settings = config
    app.state.database = database
    app.state.ir_service = ir_service
    app.include_router(remotes.router)
    app.include_router(commands.router)
    app.include_router(learn.router)
    app.include_router(system.router)
    if config.ir_backend == "mock":
        app.include_router(learn.mock_router())

    frontend = config.frontend_dist
    if frontend is not None and Path(frontend, "index.html").is_file():
        app.mount("/", SPAStaticFiles(directory=frontend, html=True), name="frontend")
    return app


app = create_app()
