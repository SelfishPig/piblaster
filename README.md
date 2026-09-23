# PiBlaster

PiBlaster turns a Raspberry Pi into a self-hosted infrared remote. It learns the
raw waveform from a physical remote, keeps the waveform alongside any decoded
protocol data in SQLite, and retransmits commands from a phone-friendly web UI
or REST API. It is designed for a trusted LAN and has no cloud dependency.

> Screenshot placeholder: Home, Learn, Layouts, and Status views.

## Architecture

The FastAPI backend owns the REST/WebSocket API, application services, SQLite
persistence, and an IR hardware abstraction. `MockIRDevice` makes the complete
workflow usable on any development machine. `LinuxIRDevice` discovers
receive/transmit capability per `/dev/lirc*` device and invokes `ir-ctl` with an
argument list—never `shell=True` and never timing-critical GPIO code in Python.

The React + TypeScript frontend uses Vite, Tailwind CSS, daisyUI, Oxlint, and Prettier.
Development requests use relative `/api` and `/ws` URLs through Vite's proxy. A
production Vite build is served by FastAPI, including SPA fallbacks such as
`/learn`.

Remotes organize learned commands on the Learn page, where commands can be edited,
run, or deleted. Layouts are independent control surfaces that can combine commands
from any remote. Create and edit them on Layouts, then use them on Home. Deleting a
layout keeps its commands; deleting a command unassigns it from layouts. Existing
saved remote layouts are copied into independent layouts once on startup.

The Status page theme selector includes System plus all enabled daisyUI themes.
The choice is stored locally in the browser; System follows the OS light/dark
preference and does not depend on the backend.

```text
Browser ── REST/WebSocket ── FastAPI ── services ── SQLite
                                      └─ IRDevice ─┬─ mock
                                                   └─ ir-ctl / Linux rc-core
```

## Development

Prerequisites are Python 3.12+, [uv](https://docs.astral.sh/uv/), and a current
Node.js/npm release.

Terminal one:

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload
```

Terminal two:

```bash
cd frontend
npm ci
npm run dev
```

Open <http://localhost:5173>. Mock IR is the default. Open Learn, create a remote,
start learning, and select **Simulate signal**. The equivalent API call is:

```bash
curl -X POST http://localhost:8000/api/dev/mock-signal
```

The endpoint exists only in mock mode and requires an active learning session.
It also accepts `protocol`, `address`, `command`, `carrierFrequency`, and `raw`:

```bash
curl -X POST http://localhost:8000/api/dev/mock-signal \
  -H 'Content-Type: application/json' \
  -d '{"protocol":"NEC","address":"0x04","command":"0x08","carrierFrequency":38000}'
```

Useful checks:

```bash
cd backend
uv run ruff format --check .
uv run ruff check .
uv run pyright
uv run pytest

cd ../frontend
npm run lint
npm run lint:fix
npm run format
npm run typecheck
npm run build
```

Or run the complete production gate with `./scripts/build.sh`.

## API examples

Interactive OpenAPI documentation is available at <http://localhost:8000/docs>.

```bash
# List and create remotes
curl http://localhost:8000/api/remotes
curl -X POST http://localhost:8000/api/remotes \
  -H 'Content-Type: application/json' \
  -d '{"name":"Living Room TV","description":"Main television"}'

# List all commands or one remote's commands
curl http://localhost:8000/api/commands
curl http://localhost:8000/api/remotes/1/commands

# Create a layout (command IDs may belong to different remotes)
curl http://localhost:8000/api/layouts
curl -X POST http://localhost:8000/api/layouts \
  -H 'Content-Type: application/json' \
  -d '{"name":"Living Room","rows":[{"id":"controls","type":"button-2","controls":[{"commandId":1},{"commandId":2}]}]}'

# Transmit by database ID or friendly slugs
curl -X POST http://localhost:8000/api/commands/12/send
curl -X POST http://localhost:8000/api/send/living-room-tv/volume-up

# Learning lifecycle
curl -X POST http://localhost:8000/api/learn/start
curl http://localhost:8000/api/learn/status
curl -X POST http://localhost:8000/api/learn/stop

# Diagnostics
curl http://localhost:8000/api/system/status
```

WebSocket learning events are published at `ws://localhost:8000/ws/learn`.
Receiving a signal does not save it; the user must test and explicitly save it.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `PIBLASTER_IR_BACKEND` | `mock` | `mock` or `linux` |
| `PIBLASTER_DATABASE_PATH` | `piblaster.db` | SQLite file controlled by the service |
| `PIBLASTER_HOST` | `0.0.0.0` | Uvicorn bind address for CLI use |
| `PIBLASTER_PORT` | `8000` | Uvicorn port for CLI use |
| `PIBLASTER_SEED_EXAMPLE` | false | Seed one empty example remote |
| `PIBLASTER_FRONTEND_DIST` | `frontend/dist` | Compiled frontend location |

The application is intended for a trusted LAN in v1. Binding to `0.0.0.0`
exposes it to that network; use firewall rules or bind to loopback when that is
not desired.

## Production build and Raspberry Pi installation

`scripts/build.sh` syncs the locked Python and npm environments, runs formatting,
linting, type checks and backend tests, then creates `frontend/dist`.

On Raspberry Pi OS or Debian, from a checkout:

```bash
sudo ./scripts/install.sh
```

The idempotent installer copies the app to `/opt/piblaster`, stores data in
`/var/lib/piblaster`, runs it as the `piblaster` user, enables Avahi, and installs
the systemd unit. It deliberately does not edit boot configuration or reboot.

The installer includes C/C++ build tools, Python development headers, and Rust/Cargo
for dependencies that need to compile from source. This is especially relevant on
32-bit Raspberry Pi OS, where prebuilt Python packages may be unavailable. The
first dependency installation can take a while on older Pi hardware.

Configure the kernel overlays in the boot config used by your OS (commonly
`/boot/firmware/config.txt` on current Raspberry Pi OS):

```ini
dtoverlay=gpio-ir,gpio_pin=17
dtoverlay=gpio-ir-tx,gpio_pin=18
```

Reboot when convenient, then inspect discovery with:

```bash
ls -l /dev/lirc*
ir-ctl --features --device /dev/lirc0
ir-ctl --features --device /dev/lirc1
```

PiBlaster does not assume that `lirc0` is RX or that `lirc1` is TX. The service
user is added to the `video` group, which commonly owns LIRC devices.

Manage the service with:

```bash
sudo systemctl status piblaster
sudo systemctl restart piblaster
sudo journalctl -u piblaster -f
```

Avahi advertises the machine's hostname as `<hostname>.local`. To use the exact
address <http://piblaster.local:8000>, set the Pi hostname and restart Avahi:

```bash
sudo hostnamectl set-hostname piblaster
sudo systemctl restart avahi-daemon
```

Port 8000 is explicit because the service does not install a privileged-port
reverse proxy. A trusted-LAN reverse proxy may expose port 80 if desired.

## Wiring

The default overlay example expects BCM GPIO numbers, not physical header
positions:

```text
IR transmitter                 IR receiver
VCC  → appropriate supply      VCC  → appropriate supply
GND  → GND                     GND  → GND
DATA → GPIO18                  DATA → GPIO17
```

**Verify the voltage, current requirements, transistor/driver circuit, and pinout
of each specific module before connecting it.** Do not infer pin order from a
module's physical orientation. A transmitter LED normally needs a suitable
driver rather than being powered directly by a GPIO pin.

## Troubleshooting

- **Status says unavailable:** confirm the overlays loaded, `/dev/lirc*` exists,
  `ir-ctl --features` reports the needed capability, and the service user has the
  device's group membership. Check `journalctl -u piblaster`.
- **Learning receives nothing:** verify GPIO17/receiver wiring, orientation, and
  supply voltage. Stop other processes holding the receive device.
- **Transmission is weak:** use a transistor driver and appropriate current for
  the IR LED; verify GPIO18 and carrier support on the transmit device.
- **`piblaster.local` does not resolve:** confirm Avahi is active and that the
  client supports mDNS; try the Pi's IP address and port 8000.
- **Frontend route returns 404:** run `npm run build` in `frontend` and restart
  the backend so `frontend/dist/index.html` is present.
