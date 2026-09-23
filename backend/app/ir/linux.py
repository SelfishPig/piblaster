from __future__ import annotations

import asyncio
import logging
import os
import shutil
import sys
import tempfile
from contextlib import suppress
from pathlib import Path

from app.ir.base import IRDevice
from app.ir.types import IRSignal

logger = logging.getLogger(__name__)


def _ir_environment() -> dict[str, str] | None:
    if not getattr(sys, "frozen", False):
        return None
    # ir-ctl belongs to the OS and must not load PyInstaller's bundled libraries.
    env = os.environ.copy()
    original = env.get("LD_LIBRARY_PATH_ORIG")
    if original is None:
        env.pop("LD_LIBRARY_PATH", None)
    else:
        env["LD_LIBRARY_PATH"] = original
    return env


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
            # Headings and "Device cannot receive/send" also contain those verbs.
            # Only accept an explicit positive raw-IR capability.
            if self.rx_device is None and "device can receive raw ir" in lowered:
                self.rx_device = device
            if self.tx_device is None and "device can send raw ir" in lowered:
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
                env={**(_ir_environment() or os.environ), "LC_ALL": "C"},
            )
            if result.returncode:
                logger.warning(
                    "Cannot inspect IR device %s (exit %s): %s",
                    device,
                    result.returncode,
                    result.stderr.strip(),
                )
                return ""
            return result.stdout
        except (OSError, subprocess.TimeoutExpired) as error:
            logger.warning("Cannot inspect IR device %s: %s", device, error)
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
        process = await asyncio.create_subprocess_exec(
            ir_ctl,
            "--device",
            str(self.rx_device),
            "--receive",
            "--mode2",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=_ir_environment(),
        )
        self._receive_process = process
        assert process.stdout is not None
        assert process.stderr is not None
        stderr_task = asyncio.create_task(process.stderr.read())
        raw: list[int] = []
        terminated = False
        try:
            while self._learning:
                try:
                    line = await asyncio.wait_for(process.stdout.readline(), timeout=0.15)
                except TimeoutError:
                    if raw:
                        break
                    continue
                if not line:
                    await process.wait()
                    break
                parts = line.decode(errors="replace").strip().split()
                if len(parts) == 2 and parts[0] in {"pulse", "space"}:
                    try:
                        raw.append(int(parts[1]))
                    except ValueError:
                        continue
        finally:
            if process.returncode is None:
                terminated = True
                with suppress(ProcessLookupError):
                    process.terminate()
                try:
                    await asyncio.wait_for(process.wait(), timeout=1)
                except TimeoutError:
                    with suppress(ProcessLookupError):
                        process.kill()
                    await process.wait()
            stderr = (await stderr_task).decode(errors="replace").strip()
            if self._receive_process is process:
                self._receive_process = None
        if process.returncode and not terminated:
            detail = stderr or "no error output"
            raise RuntimeError(
                f"ir-ctl receive failed on {self.rx_device} (exit {process.returncode}): {detail}"
            )
        if not raw:
            detail = stderr or "no pulse/space data received"
            raise RuntimeError(f"IR receiver {self.rx_device} stopped without a signal: {detail}")
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
                env=_ir_environment(),
            )
            _, stderr = await process.communicate()
            if process.returncode:
                raise RuntimeError(f"ir-ctl transmission failed: {stderr.decode().strip()}")
        finally:
            if path is not None:
                path.unlink(missing_ok=True)

    async def close(self) -> None:
        await self.stop_learning()
