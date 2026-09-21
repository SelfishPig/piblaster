from __future__ import annotations

import asyncio
import logging
import shutil
import tempfile
from pathlib import Path

from app.ir.base import IRDevice
from app.ir.types import IRSignal

logger = logging.getLogger(__name__)


class LinuxIRDevice(IRDevice):
    """Linux rc-core adapter using ir-ctl, never userspace GPIO modulation."""

    name = "linux"

    def __init__(self) -> None:
        self.rx_device: Path | None = None
        self.tx_device: Path | None = None
        self._learning = False
        self._receive_process: asyncio.subprocess.Process | None = None
        self._discover_devices()

    def _discover_devices(self) -> None:
        ir_ctl = shutil.which("ir-ctl")
        if ir_ctl is None:
            logger.warning("ir-ctl is unavailable; Linux IR hardware is disabled")
            return
        for device in sorted(Path("/dev").glob("lirc*")):
            capabilities = self._capabilities(ir_ctl, device)
            lowered = capabilities.lower()
            if self.rx_device is None and ("receive" in lowered or "rec_mode2" in lowered):
                self.rx_device = device
            if self.tx_device is None and ("send" in lowered or "send_pulse" in lowered):
                self.tx_device = device
        logger.info("Discovered Linux IR devices: rx=%s tx=%s", self.rx_device, self.tx_device)

    @staticmethod
    def _capabilities(ir_ctl: str, device: Path) -> str:
        # Startup discovery is intentionally bounded and does not accept user input.
        import subprocess

        try:
            result = subprocess.run(  # noqa: S603
                [ir_ctl, "--device", str(device), "--features"],
                capture_output=True,
                check=False,
                text=True,
                timeout=2,
            )
            return result.stdout + result.stderr
        except (OSError, subprocess.TimeoutExpired):
            return ""

    @property
    def receiver_available(self) -> bool:
        return self.rx_device is not None

    @property
    def transmitter_available(self) -> bool:
        return self.tx_device is not None

    async def start_learning(self) -> None:
        if self.rx_device is None:
            raise RuntimeError("No receive-capable /dev/lirc device was discovered")
        self._learning = True

    async def stop_learning(self) -> None:
        self._learning = False
        if self._receive_process and self._receive_process.returncode is None:
            self._receive_process.terminate()
            try:
                await asyncio.wait_for(self._receive_process.wait(), timeout=1)
            except TimeoutError:
                self._receive_process.kill()
                await self._receive_process.wait()
        self._receive_process = None

    async def receive(self) -> IRSignal:
        if not self._learning or self.rx_device is None:
            raise RuntimeError("Learning is not active or the receiver is unavailable")
        ir_ctl = shutil.which("ir-ctl")
        if ir_ctl is None:
            raise RuntimeError("ir-ctl is not installed")
        self._receive_process = await asyncio.create_subprocess_exec(
            ir_ctl,
            "--device",
            str(self.rx_device),
            "--receive",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        assert self._receive_process.stdout is not None
        raw: list[int] = []
        while self._learning:
            try:
                line = await asyncio.wait_for(self._receive_process.stdout.readline(), timeout=0.15)
            except TimeoutError:
                if raw:
                    break
                continue
            if not line:
                break
            parts = line.decode(errors="replace").strip().split()
            if len(parts) == 2 and parts[0] in {"pulse", "space"}:
                try:
                    raw.append(int(parts[1]))
                except ValueError:
                    continue
        if self._receive_process and self._receive_process.returncode is None:
            self._receive_process.terminate()
            await self._receive_process.wait()
        self._receive_process = None
        if not raw:
            raise RuntimeError("IR receiver stopped without capturing a signal")
        return IRSignal(carrier_frequency=38_000, raw=raw)

    async def transmit(self, signal: IRSignal) -> None:
        if self.tx_device is None:
            raise RuntimeError("No transmit-capable /dev/lirc device was discovered")
        ir_ctl = shutil.which("ir-ctl")
        if ir_ctl is None:
            raise RuntimeError("ir-ctl is not installed")
        content = [f"carrier {signal.carrier_frequency}"]
        content.extend(
            f"{'pulse' if index % 2 == 0 else 'space'} {duration}"
            for index, duration in enumerate(signal.raw)
        )
        path: Path | None = None
        try:
            with tempfile.NamedTemporaryFile("w", suffix=".ir", delete=False) as output:
                output.write("\n".join(content) + "\n")
                path = Path(output.name)
            process = await asyncio.create_subprocess_exec(
                ir_ctl,
                "--device",
                str(self.tx_device),
                f"--send={path}",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            _, stderr = await process.communicate()
            if process.returncode:
                raise RuntimeError(f"ir-ctl transmission failed: {stderr.decode().strip()}")
        finally:
            if path is not None:
                path.unlink(missing_ok=True)

    async def close(self) -> None:
        await self.stop_learning()
