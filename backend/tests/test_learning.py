from fastapi.testclient import TestClient


def test_start_stop_learning(client: TestClient) -> None:
    assert client.get("/api/learn/status").json()["active"] is False
    started = client.post("/api/learn/start")
    assert started.status_code == 200
    assert started.json()["active"] is True
    assert client.get("/api/learn/status").json()["active"] is True
    assert client.post("/api/learn/stop").json()["active"] is False


def test_mock_signal_websocket_and_save(client: TestClient, remote: dict[str, object]) -> None:
    with client.websocket_connect("/ws/learn") as websocket:
        assert websocket.receive_json() == {"type": "state", "active": False}
        assert client.post("/api/learn/start").status_code == 200
        assert websocket.receive_json() == {"type": "state", "active": True}
        injected = client.post("/api/dev/mock-signal")
        assert injected.status_code == 200
        event = websocket.receive_json()
        assert event["type"] == "signal"
        assert event["signal"]["protocol"] == "NEC"
        assert len(event["signal"]["raw"]) > 4

    signal = injected.json()
    tested = client.post("/api/learn/test", json=signal)
    assert tested.status_code == 200
    saved = client.post(
        f"/api/remotes/{remote['id']}/commands",
        json={
            "name": "Power",
            "protocol": signal["protocol"],
            "address": signal["address"],
            "command": signal["command"],
            "carrierFrequency": signal["carrierFrequency"],
            "rawSignal": signal["raw"],
        },
    )
    assert saved.status_code == 201
    assert saved.json()["slug"] == "power"


def test_mock_injection_requires_learning(client: TestClient) -> None:
    response = client.post("/api/dev/mock-signal")
    assert response.status_code == 409
