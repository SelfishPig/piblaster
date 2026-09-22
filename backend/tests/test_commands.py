from typing import cast

import pytest
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
    assert created.json()["role"] is None
    assert created.json()["buttonText"] is None

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


def test_command_role_round_trip(
    client: TestClient, remote: dict[str, object], command_payload: dict[str, object]
) -> None:
    path = f"/api/remotes/{remote['id']}/commands"
    created = client.post(path, json={**command_payload, "role": "power"})
    assert created.status_code == 201
    assert created.json()["role"] == "power"
    command_path = f"/api/commands/{created.json()['id']}"
    assert client.get(command_path).json()["role"] == "power"
    assert client.get(path).json()[0]["role"] == "power"

    renamed = client.patch(command_path, json={"name": "New name"})
    assert renamed.json()["role"] == "power"
    updated = client.patch(command_path, json={"role": "custom"})
    assert updated.status_code == 200
    assert client.get(command_path).json()["role"] == "custom"
    cleared = client.patch(command_path, json={"role": None})
    assert cleared.status_code == 200
    assert client.get(command_path).json()["role"] is None


@pytest.mark.parametrize("role", ["unknown", "", 123])
def test_invalid_command_role_is_rejected(
    client: TestClient, remote: dict[str, object], command_payload: dict[str, object], role: object
) -> None:
    path = f"/api/remotes/{remote['id']}/commands"
    assert client.post(path, json={**command_payload, "role": role}).status_code == 422
    created = client.post(path, json=command_payload).json()
    assert client.patch(f"/api/commands/{created['id']}", json={"role": role}).status_code == 422


def test_command_button_appearance_can_be_created_edited_and_cleared(
    client: TestClient, remote: dict[str, object], command_payload: dict[str, object]
) -> None:
    path = f"/api/remotes/{remote['id']}/commands"
    created = client.post(
        path, json={**command_payload, "role": "none", "buttonText": "  Netflix  "}
    )
    assert created.status_code == 201
    command_path = f"/api/commands/{created.json()['id']}"
    assert created.json()["role"] == "none"
    assert created.json()["buttonText"] == "Netflix"
    assert client.get(path).json()[0]["buttonText"] == "Netflix"

    renamed = client.patch(command_path, json={"name": "Streaming"})
    assert renamed.json()["role"] == "none"
    assert renamed.json()["buttonText"] == "Netflix"
    updated = client.patch(command_path, json={"role": "home", "buttonText": "Apps"})
    assert updated.status_code == 200
    assert client.get(command_path).json()["role"] == "home"
    assert client.get(command_path).json()["buttonText"] == "Apps"

    for empty in [None, "", "   "]:
        assert client.patch(command_path, json={"buttonText": "Apps"}).status_code == 200
        cleared = client.patch(command_path, json={"role": "none", "buttonText": empty})
        assert cleared.status_code == 200
        assert client.get(command_path).json()["buttonText"] is None
        assert client.get(command_path).json()["role"] == "none"

    assert client.post(f"{command_path}/send").status_code == 200


def test_button_text_length_is_validated(
    client: TestClient, remote: dict[str, object], command_payload: dict[str, object]
) -> None:
    path = f"/api/remotes/{remote['id']}/commands"
    payload = {**command_payload, "buttonText": "x" * 121}
    assert client.post(path, json=payload).status_code == 422
    payload["buttonText"] = "x" * 120
    created = client.post(path, json=payload)
    assert created.status_code == 201
    response = client.patch(f"/api/commands/{created.json()['id']}", json={"buttonText": "x" * 121})
    assert response.status_code == 422
