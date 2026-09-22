import pytest
from fastapi.testclient import TestClient


def test_layout_crud_is_independent_of_remotes(client: TestClient) -> None:
    created = client.post("/api/layouts", json={"name": " Living Room ", "rows": []})
    assert created.status_code == 201
    layout_id = created.json()["id"]
    assert created.json()["name"] == "Living Room"
    assert client.get("/api/remotes").json() == []
    assert client.get("/api/layouts").json()[0]["id"] == layout_id
    updated = client.patch(
        f"/api/layouts/{layout_id}", json={"name": "Cinema", "description": "TV and soundbar"}
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Cinema"
    assert client.get(f"/api/layouts/{layout_id}").json()["description"] == "TV and soundbar"
    assert client.delete(f"/api/layouts/{layout_id}").status_code == 204
    assert client.get(f"/api/layouts/{layout_id}").status_code == 404
    assert client.patch(f"/api/layouts/{layout_id}", json={"rows": []}).status_code == 404
    assert client.delete(f"/api/layouts/{layout_id}").status_code == 404


def test_layout_uses_commands_from_multiple_remotes(
    client: TestClient, remote: dict[str, object], command_payload: dict[str, object]
) -> None:
    other = client.post("/api/remotes", json={"name": "Soundbar"}).json()
    first = client.post(f"/api/remotes/{remote['id']}/commands", json=command_payload).json()
    second = client.post(f"/api/remotes/{other['id']}/commands", json=command_payload).json()
    assert {command["id"] for command in client.get("/api/commands").json()} == {
        first["id"],
        second["id"],
    }
    rows = [
        {
            "id": "both",
            "type": "button-2",
            "controls": [
                {"commandId": first["id"], "icon": "custom"},
                {"commandId": second["id"], "icon": "custom"},
            ],
        }
    ]
    layout = client.post("/api/layouts", json={"name": "Cinema", "rows": rows})
    assert layout.status_code == 201
    layout_id = layout.json()["id"]
    read = client.get(f"/api/layouts/{layout_id}").json()
    assert [control["commandId"] for control in read["rows"][0]["controls"]] == [
        first["id"],
        second["id"],
    ]
    for command in (first, second):
        assert client.post(f"/api/commands/{command['id']}/send").status_code == 200
    assert client.delete(f"/api/layouts/{layout_id}").status_code == 204
    assert len(client.get("/api/remotes").json()) == 2
    assert len(client.get("/api/commands").json()) == 2

    layout_id = client.post("/api/layouts", json={"name": "Again", "rows": rows}).json()["id"]
    assert client.delete(f"/api/commands/{first['id']}").status_code == 204
    controls = client.get(f"/api/layouts/{layout_id}").json()["rows"][0]["controls"]
    assert [control["commandId"] for control in controls] == [None, second["id"]]
    assert client.delete(f"/api/remotes/{other['id']}").status_code == 204
    controls = client.get(f"/api/layouts/{layout_id}").json()["rows"][0]["controls"]
    assert [control["commandId"] for control in controls] == [None, None]
    assert len(client.get("/api/layouts").json()) == 1

    updated = client.patch(f"/api/layouts/{layout_id}", json={"rows": []})
    assert updated.status_code == 200
    assert updated.json()["rows"] == []


@pytest.mark.parametrize(
    "data",
    [
        {"name": " "},
        {"name": None},
        {"rows": None},
        {"rows": [{"id": "bad", "type": "unknown", "controls": []}]},
    ],
)
def test_invalid_layout_updates_are_rejected(client: TestClient, data: dict[str, object]) -> None:
    created = client.post("/api/layouts", json={"name": "TV"}).json()
    assert client.patch(f"/api/layouts/{created['id']}", json=data).status_code == 422
    assert client.get(f"/api/layouts/{created['id']}").json()["name"] == "TV"
