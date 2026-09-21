from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


def _bool_env(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True, slots=True)
class Settings:
    ir_backend: str = "mock"
    database_path: Path = Path("piblaster.db")
    host: str = "0.0.0.0"
    port: int = 8000
    seed_example: bool = False
    frontend_dist: Path | None = None

    @classmethod
    def from_env(cls) -> Settings:
        root = Path(__file__).resolve().parents[2]
        frontend = os.getenv("PIBLASTER_FRONTEND_DIST")
        backend = os.getenv("PIBLASTER_IR_BACKEND", "mock").lower()
        if backend not in {"mock", "linux"}:
            raise ValueError("PIBLASTER_IR_BACKEND must be 'mock' or 'linux'")
        return cls(
            ir_backend=backend,
            database_path=Path(os.getenv("PIBLASTER_DATABASE_PATH", "piblaster.db")),
            host=os.getenv("PIBLASTER_HOST", "0.0.0.0"),
            port=int(os.getenv("PIBLASTER_PORT", "8000")),
            seed_example=_bool_env("PIBLASTER_SEED_EXAMPLE"),
            frontend_dist=Path(frontend) if frontend else root / "frontend" / "dist",
        )
