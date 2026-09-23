import os
import sys
from pathlib import Path

import pytest

from app.ir.linux import LinuxIRDevice


@pytest.mark.parametrize("original", [None, "/opt/system-libraries"])
def test_frozen_ir_ctl_uses_system_libraries(tmp_path: Path, monkeypatch, original) -> None:
    monkeypatch.setattr(sys, "frozen", True, raising=False)
    monkeypatch.setenv("LD_LIBRARY_PATH", "/tmp/bundled-libraries")
    if original is None:
        monkeypatch.delenv("LD_LIBRARY_PATH_ORIG", raising=False)
    else:
        monkeypatch.setenv("LD_LIBRARY_PATH_ORIG", original)
    ir_ctl = tmp_path / "ir-ctl"
    ir_ctl.write_text('#!/bin/sh\nprintf "%s" "${LD_LIBRARY_PATH-unset}"\n')
    ir_ctl.chmod(0o755)

    assert LinuxIRDevice._capabilities(str(ir_ctl), Path("/dev/lirc0")) == (original or "unset")
    assert os.environ["LD_LIBRARY_PATH"] == "/tmp/bundled-libraries"
