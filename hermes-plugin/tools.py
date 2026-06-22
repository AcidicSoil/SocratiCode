"""Tool handlers for the SocratiCode Hermes plugin."""

from __future__ import annotations

import json
import os
import re
import subprocess
from pathlib import Path


def _hermes_home() -> Path:
    env_home = os.environ.get("HERMES_HOME")
    if env_home:
        return Path(env_home).expanduser()

    try:
        from hermes_cli.config import get_hermes_home  # type: ignore

        return Path(get_hermes_home())
    except Exception:
        return Path.home() / ".hermes"


def _config_path() -> Path:
    return _hermes_home() / "config.yaml"


def _skill_path() -> Path:
    return _hermes_home() / "skills" / "socraticode" / "SKILL.md"


def _plugin_path() -> Path:
    return _hermes_home() / "plugins" / "socraticode"


def _run(command: list[str]) -> dict:
    try:
        proc = subprocess.run(
            command,
            text=True,
            capture_output=True,
            timeout=20,
            check=False,
        )
        return {
            "ok": proc.returncode == 0,
            "returncode": proc.returncode,
            "stdout": proc.stdout.strip(),
            "stderr": proc.stderr.strip(),
            "command": command,
        }
    except FileNotFoundError:
        return {
            "ok": False,
            "returncode": None,
            "stdout": "",
            "stderr": f"Command not found: {command[0]}",
            "command": command,
        }
    except subprocess.TimeoutExpired:
        return {
            "ok": False,
            "returncode": None,
            "stdout": "",
            "stderr": f"Timed out running: {' '.join(command)}",
            "command": command,
        }


def _mcp_configured(config_text: str) -> bool:
    if not config_text.strip():
        return False

    if "mcp_servers:" not in config_text:
        return False

    return re.search(r"(?m)^\s*socraticode:\s*$", config_text) is not None


def socraticode_doctor(args: dict, **kwargs) -> str:
    config_path = _config_path()
    config_text = config_path.read_text(encoding="utf-8") if config_path.exists() else ""

    checks = {
        "node": _run(["node", "--version"]),
        "npx": _run(["npx", "--version"]),
        "docker": _run(["docker", "info"]),
    }

    return json.dumps(
        {
            "ok": True,
            "plugin_path": str(_plugin_path()),
            "plugin_present": _plugin_path().exists(),
            "skill_path": str(_skill_path()),
            "skill_present": _skill_path().exists(),
            "config_path": str(config_path),
            "mcp_configured": _mcp_configured(config_text),
            "expected_mcp_yaml": (
                "mcp_servers:\n"
                "  socraticode:\n"
                '    command: "npx"\n'
                '    args: ["-y", "socraticode"]'
            ),
            "checks": checks,
        }
    )
