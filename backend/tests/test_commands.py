from typing import cast

from fastapi import FastAPI
from fastapi.testclient import TestClient


def test_command_crud_and_send(
    client: TestClient, remote: dict[str, object], command_payload: dict[str, object]
) -> None:
    remote_id = remote["id"]
    created = client.post(f"/api/remotes/{remote_id}/commands", json=command_payload)
    assert created.status_code == 201
    command_id = created.json()["id"]
    assert created.json()["rawSignal"] == command_payload["rawSignal"]

    listed = client.get(f"/api/remotes/{remote_id}/commands")
    assert listed.status_code == 200
    assert len(listed.json()) == 1
    assert client.get(f"/api/commands/{command_id}").status_code == 200
    assert (
        client.patch(f"/api/commands/{command_id}", json={"name": "Vol +"}).json()["name"]
        == "Vol +"
    )

    sent = client.post(f"/api/commands/{command_id}/send")
    assert sent.status_code == 200
    assert sent.json() == {"sent": True, "commandId": command_id}
    friendly = client.post("/api/send/living-room-tv/volume-up")
    assert friendly.status_code == 200

    device = cast(FastAPI, client.app).state.ir_service.device
    assert len(device.transmissions) == 2
    assert client.delete(f"/api/commands/{command_id}").status_code == 204


def test_command_slug_unique_within_remote(
    client: TestClient, remote: dict[str, object], command_payload: dict[str, object]
) -> None:
    path = f"/api/remotes/{remote['id']}/commands"
    assert client.post(path, json=command_payload).status_code == 201
    duplicate = client.post(path, json={**command_payload, "name": "Louder"})
    assert duplicate.status_code == 409

    other = client.post("/api/remotes", json={"name": "Soundbar"}).json()
    assert (
        client.post(f"/api/remotes/{other['id']}/commands", json=command_payload).status_code == 201
    )


def test_invalid_signal_is_rejected(
    client: TestClient, remote: dict[str, object], command_payload: dict[str, object]
) -> None:
    payload = {**command_payload, "rawSignal": [9000, -1]}
    assert client.post(f"/api/remotes/{remote['id']}/commands", json=payload).status_code == 422


def test_deleting_remote_cascades_to_commands(
    client: TestClient, remote: dict[str, object], command_payload: dict[str, object]
) -> None:
    created = client.post(f"/api/remotes/{remote['id']}/commands", json=command_payload).json()
    assert client.delete(f"/api/remotes/{remote['id']}").status_code == 204
    assert client.get(f"/api/commands/{created['id']}").status_code == 404
