import sys
from pathlib import Path

from app.config import Settings


def test_frozen_frontend_and_persistent_database(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setattr(sys, "_MEIPASS", str(tmp_path / "bundle"), raising=False)
    monkeypatch.delenv("PIBLASTER_FRONTEND_DIST", raising=False)
    monkeypatch.delenv("PIBLASTER_DATABASE_PATH", raising=False)

    settings = Settings.from_env()

    assert settings.frontend_dist == tmp_path / "bundle" / "frontend" / "dist"
    assert settings.database_path == Path("piblaster.db")


def test_frozen_frontend_override(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setattr(sys, "_MEIPASS", str(tmp_path / "bundle"), raising=False)
    monkeypatch.setenv("PIBLASTER_FRONTEND_DIST", str(tmp_path / "custom"))

    assert Settings.from_env().frontend_dist == tmp_path / "custom"


def test_source_frontend_default(monkeypatch) -> None:
    monkeypatch.delattr(sys, "_MEIPASS", raising=False)
    monkeypatch.delenv("PIBLASTER_FRONTEND_DIST", raising=False)

    assert (
        Settings.from_env().frontend_dist
        == Path(__file__).resolve().parents[2] / "frontend" / "dist"
    )
