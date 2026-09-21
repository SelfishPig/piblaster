from fastapi.testclient import TestClient


def test_remote_crud(client: TestClient) -> None:
    created = client.post("/api/remotes", json={"name": "Projector"})
    assert created.status_code == 201
    assert created.json()["slug"] == "projector"
    remote_id = created.json()["id"]

    assert client.get("/api/remotes").json()[0]["name"] == "Projector"
    assert client.get(f"/api/remotes/{remote_id}").status_code == 200
    patched = client.patch(f"/api/remotes/{remote_id}", json={"name": "Cinema Projector"})
    assert patched.json()["name"] == "Cinema Projector"
    assert patched.json()["slug"] == "projector"
    assert client.delete(f"/api/remotes/{remote_id}").status_code == 204
    assert client.get(f"/api/remotes/{remote_id}").status_code == 404


def test_remote_slug_is_unique(client: TestClient) -> None:
    assert client.post("/api/remotes", json={"name": "TV"}).status_code == 201
    duplicate = client.post("/api/remotes", json={"name": "Other", "slug": "tv"})
    assert duplicate.status_code == 409
    assert "slug" in duplicate.json()["detail"].lower()


def test_remote_layout_round_trip(client: TestClient) -> None:
    layout = {
        "version": 2,
        "rows": [
            {
                "id": "navigation",
                "type": "arrow-wheel",
                "controls": [
                    {"commandId": None, "icon": role}
                    for role in ["up", "right", "down", "left", "ok"]
                ],
            }
        ],
    }
    created = client.post("/api/remotes", json={"name": "TV", "layout": layout})
    assert created.status_code == 201
    assert created.json()["layout"] == layout

    remote_id = created.json()["id"]
    updated_layout = {"version": 2, "rows": []}
    patched = client.patch(f"/api/remotes/{remote_id}", json={"layout": updated_layout})
    assert patched.status_code == 200
    assert patched.json()["layout"] == updated_layout
