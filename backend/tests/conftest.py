from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


@pytest.fixture
def client(tmp_path: Path) -> Iterator[TestClient]:
    settings = Settings(database_path=tmp_path / "test.db", frontend_dist=None)
    with TestClient(create_app(settings)) as test_client:
        yield test_client


@pytest.fixture
def remote(client: TestClient) -> dict[str, object]:
    response = client.post(
        "/api/remotes", json={"name": "Living Room TV", "description": "Main television"}
    )
    assert response.status_code == 201
    return response.json()


@pytest.fixture
def command_payload() -> dict[str, object]:
    return {
        "name": "Volume Up",
        "slug": "volume-up",
        "protocol": "NEC",
        "address": "0x04",
        "command": "0x08",
        "carrierFrequency": 38_000,
        "rawSignal": [9000, 4500, 560, 560, 560, 1690],
    }
