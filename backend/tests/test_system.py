from pathlib import Path

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def test_system_status(client: TestClient) -> None:
    status = client.get("/api/system/status")
    assert status.status_code == 200
    assert (
        status.json()
        | {
            "irBackend": "mock",
            "receiverAvailable": True,
            "transmitterAvailable": True,
            "database": "ok",
        }
        == status.json()
    )
    assert status.json()["version"] == "0.1.0"


def test_linux_mode_starts_without_hardware(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setattr("app.ir.linux.shutil.which", lambda _: None)
    settings = Settings(ir_backend="linux", database_path=tmp_path / "linux.db", frontend_dist=None)
    with TestClient(create_app(settings)) as client:
        status = client.get("/api/system/status").json()
        assert status["irBackend"] == "linux"
        assert status["receiverAvailable"] is False
        assert status["transmitterAvailable"] is False
        assert client.post("/api/learn/start").status_code == 503


def test_spa_fallback(tmp_path: Path) -> None:
    dist = tmp_path / "dist"
    dist.mkdir()
    (dist / "index.html").write_text("<h1>PiBlaster</h1>")
    settings = Settings(database_path=tmp_path / "spa.db", frontend_dist=dist)
    with TestClient(create_app(settings)) as client:
        assert "PiBlaster" in client.get("/learn").text
        assert client.get("/docs").status_code == 200
        assert client.get("/api/remotes").status_code == 200
