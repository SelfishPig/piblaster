"""Exercise the frozen server from an empty working directory, without hardware."""

import base64
import json
import os
import re
import socket
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from urllib.error import URLError
from urllib.request import Request, urlopen


def main() -> None:
    executable = str(Path(sys.argv[1]).resolve())
    with tempfile.TemporaryDirectory() as directory:
        with socket.socket() as port_socket:
            port_socket.bind(("127.0.0.1", 0))
            port = port_socket.getsockname()[1]
        env = {
            key: value
            for key, value in os.environ.items()
            if not key.startswith(("PIBLASTER_", "PYTHON"))
        }
        env.update(
            PIBLASTER_IR_BACKEND="mock",
            PIBLASTER_HOST="127.0.0.1",
            PIBLASTER_PORT=str(port),
            PIBLASTER_DATABASE_PATH=str(Path(directory, "smoke.db")),
        )
        with tempfile.TemporaryFile(mode="w+") as log:
            process = subprocess.Popen([executable], cwd=directory, env=env, stdout=log, stderr=log)
            try:
                base = f"http://127.0.0.1:{port}"
                deadline = time.monotonic() + 120
                while True:
                    if process.poll() is not None:
                        raise RuntimeError("Executable exited before becoming ready")
                    try:
                        with urlopen(f"{base}/api/system/status", timeout=2) as response:
                            status = json.load(response)
                        break
                    except (URLError, TimeoutError):
                        if time.monotonic() >= deadline:
                            raise RuntimeError("Executable did not become ready") from None
                        time.sleep(0.5)
                assert status["irBackend"] == "mock", status
                assert status["database"] == "ok", status
                for route in ("/", "/learn"):
                    with urlopen(base + route, timeout=5) as response:
                        html = response.read().decode()
                    assert '<div id="root">' in html, html
                asset = re.search(r'src="(/assets/[^\"]+\.js)"', html)
                assert asset, "Frontend JavaScript missing from index.html"
                with urlopen(base + asset[1], timeout=5) as response:
                    assert "javascript" in response.headers["Content-Type"]
                    assert response.read(), "Empty frontend JavaScript"
                request = Request(
                    f"{base}/api/remotes",
                    data=json.dumps({"name": "Build smoke test"}).encode(),
                    headers={"Content-Type": "application/json"},
                )
                with urlopen(request, timeout=5) as response:
                    assert response.status == 201
                # Check that Uvicorn's dynamically loaded WebSocket backend is bundled.
                with socket.create_connection(("127.0.0.1", port), timeout=5) as connection:
                    key = base64.b64encode(os.urandom(16)).decode()
                    connection.sendall(
                        (
                            f"GET /ws/learn HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\n"
                            "Upgrade: websocket\r\nConnection: Upgrade\r\n"
                            f"Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n"
                        ).encode()
                    )
                    response = b""
                    while b"\r\n\r\n" not in response:
                        chunk = connection.recv(4096)
                        assert chunk, "WebSocket connection closed before handshake"
                        response += chunk
                    assert b" 101 " in response.split(b"\r\n", 1)[0], response
                assert Path(directory, "smoke.db").is_file()
            except BaseException:
                log.seek(0)
                print(log.read(), file=sys.stderr)
                raise
            finally:
                process.terminate()
                try:
                    process.wait(timeout=15)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()
    print("Executable smoke test passed (API, SQLite, frontend, SPA, WebSocket).")


if __name__ == "__main__":
    main()
