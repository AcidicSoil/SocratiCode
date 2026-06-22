Tree:

~/.hermes/plugins/socraticode/
├── plugin.yaml
├── __init__.py
├── schemas.py
├── tools.py
└── skill.md

# path: ~/.hermes/plugins/socraticode/plugin.yaml
```yaml
name: socraticode
version: 0.1.0
description: SocratiCode bootstrap plugin for Hermes — installs workflow skill and configures the SocratiCode MCP server.
provides_tools:
  - socraticode_bootstrap
  - socraticode_doctor
```

# path: ~/.hermes/plugins/socraticode/schemas.py
```python
"""Schemas for the SocratiCode Hermes wrapper plugin."""

SOCRATICODE_BOOTSTRAP = {
    "name": "socraticode_bootstrap",
    "description": (
        "Configure Hermes to use the SocratiCode MCP server and install the "
        "recommended workflow skill. Use this when SocratiCode should be added "
        "to Hermes as a managed integration."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "force": {
                "type": "boolean",
                "description": "Overwrite the existing SocratiCode MCP config if it already exists.",
                "default": False,
            },
            "command": {
                "type": "string",
                "description": "Command used to launch the MCP server.",
                "default": "npx",
            },
            "args": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Arguments passed to the MCP server command.",
                "default": ["-y", "socraticode"],
            },
            "use_latest": {
                "type": "boolean",
                "description": "Use socraticode@latest instead of the cached npx package.",
                "default": False,
            },
        },
        "required": [],
    },
}

SOCRATICODE_DOCTOR = {
    "name": "socraticode_doctor",
    "description": (
        "Validate that Hermes can run SocratiCode prerequisites and that the "
        "MCP configuration is present. Use this after bootstrap or when the "
        "integration is failing."
    ),
    "parameters": {
        "type": "object",
        "properties": {},
        "required": [],
    },
}
```

# path: ~/.hermes/plugins/socraticode/tools.py
```python
"""Tool handlers for the SocratiCode Hermes wrapper plugin."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
from pathlib import Path
from typing import Any

import yaml


PLUGIN_DIR = Path(__file__).parent
SKILL_SOURCE = PLUGIN_DIR / "skill.md"
PLUGIN_NAME = "socraticode"
DEFAULT_COMMAND = "npx"
DEFAULT_ARGS = ["-y", "socraticode"]
LATEST_ARGS = ["-y", "socraticode@latest"]


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


def _skill_dest() -> Path:
    return _hermes_home() / "skills" / PLUGIN_NAME / "SKILL.md"


def _load_yaml(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    raw = path.read_text(encoding="utf-8")
    data = yaml.safe_load(raw)
    return data if isinstance(data, dict) else {}


def _dump_yaml(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(yaml.safe_dump(data, sort_keys=False), encoding="utf-8")


def _install_skill() -> str:
    dest = _skill_dest()
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        return str(dest)
    shutil.copy2(SKILL_SOURCE, dest)
    return str(dest)


def _ensure_mcp_config(*, force: bool, command: str, args: list[str]) -> dict[str, Any]:
    path = _config_path()
    cfg = _load_yaml(path)
    mcp_servers = cfg.setdefault("mcp_servers", {})
    existing = mcp_servers.get(PLUGIN_NAME)

    desired = {
        "command": command,
        "args": args,
    }

    changed = False
    if existing is None:
        mcp_servers[PLUGIN_NAME] = desired
        changed = True
    elif force:
        mcp_servers[PLUGIN_NAME] = desired
        changed = existing != desired

    if changed:
        _dump_yaml(path, cfg)

    return {
        "config_path": str(path),
        "changed": changed,
        "existing": existing,
        "current": mcp_servers.get(PLUGIN_NAME),
    }


def _run(cmd: list[str]) -> dict[str, Any]:
    try:
        proc = subprocess.run(
            cmd,
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
            "command": cmd,
        }
    except FileNotFoundError:
        return {
            "ok": False,
            "returncode": None,
            "stdout": "",
            "stderr": f"Command not found: {cmd[0]}",
            "command": cmd,
        }
    except subprocess.TimeoutExpired:
        return {
            "ok": False,
            "returncode": None,
            "stdout": "",
            "stderr": f"Timed out running: {' '.join(cmd)}",
            "command": cmd,
        }


def socraticode_bootstrap(args: dict, **kwargs) -> str:
    force = bool(args.get("force", False))
    command = str(args.get("command") or DEFAULT_COMMAND)
    use_latest = bool(args.get("use_latest", False))
    raw_args = args.get("args")

    if isinstance(raw_args, list) and all(isinstance(x, str) for x in raw_args):
        command_args = raw_args
    else:
        command_args = LATEST_ARGS if use_latest else DEFAULT_ARGS

    if use_latest and raw_args is None:
        command_args = LATEST_ARGS

    skill_path = _install_skill()
    mcp = _ensure_mcp_config(force=force, command=command, args=command_args)

    return json.dumps(
        {
            "ok": True,
            "plugin": PLUGIN_NAME,
            "skill_installed": skill_path,
            "mcp": mcp,
            "next_steps": [
                "Install Hermes MCP extras if needed: cd ~/.hermes/hermes-agent && uv pip install -e '.[mcp]'",
                "Restart Hermes or use /reload-mcp",
                "Open a repo and ask: Index this codebase",
            ],
        }
    )


def socraticode_doctor(args: dict, **kwargs) -> str:
    config = _load_yaml(_config_path())
    mcp_entry = config.get("mcp_servers", {}).get(PLUGIN_NAME)

    checks = {
        "node": _run(["node", "--version"]),
        "npx": _run(["npx", "--version"]),
        "docker": _run(["docker", "info"]),
    }

    suggested_test = None
    if isinstance(mcp_entry, dict):
        command = mcp_entry.get("command") or DEFAULT_COMMAND
        entry_args = mcp_entry.get("args") or DEFAULT_ARGS
        if isinstance(entry_args, list) and all(isinstance(x, str) for x in entry_args):
            suggested_test = [command, *entry_args]

    return json.dumps(
        {
            "ok": True,
            "plugin": PLUGIN_NAME,
            "config_path": str(_config_path()),
            "mcp_present": mcp_entry is not None,
            "mcp_entry": mcp_entry,
            "skill_present": _skill_dest().exists(),
            "checks": checks,
            "suggested_manual_test": suggested_test,
        }
    )
```

# path: ~/.hermes/plugins/socraticode/__init__.py
```python
"""Registration for the SocratiCode Hermes wrapper plugin."""

from __future__ import annotations

import logging
from pathlib import Path
import shutil

from . import schemas, tools

logger = logging.getLogger(__name__)
_PLUGIN_DIR = Path(__file__).parent
_SKILL_SOURCE = _PLUGIN_DIR / "skill.md"


def _install_skill() -> None:
    try:
        from hermes_cli.config import get_hermes_home  # type: ignore

        dest = Path(get_hermes_home()) / "skills" / "socraticode" / "SKILL.md"
    except Exception:
        dest = Path.home() / ".hermes" / "skills" / "socraticode" / "SKILL.md"

    if dest.exists() or not _SKILL_SOURCE.exists():
        return

    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(_SKILL_SOURCE, dest)


def register(ctx):
    ctx.register_tool(
        name="socraticode_bootstrap",
        toolset="socraticode-plugin",
        schema=schemas.SOCRATICODE_BOOTSTRAP,
        handler=tools.socraticode_bootstrap,
    )
    ctx.register_tool(
        name="socraticode_doctor",
        toolset="socraticode-plugin",
        schema=schemas.SOCRATICODE_DOCTOR,
        handler=tools.socraticode_doctor,
    )
    _install_skill()
    logger.info("SocratiCode plugin registered")
```

# path: ~/.hermes/plugins/socraticode/skill.md
```md
---
name: socraticode
version: 1
---

Use SocratiCode before speculative file reads.

Workflow:
1. Start most codebase exploration with `codebase_search`.
2. Use broad conceptual queries for orientation and exact queries for symbols.
3. Use grep or ripgrep only when you already know the exact identifier, regex, or error string.
4. If search returns nothing, check `codebase_status`.
5. If the project is not indexed yet, run `codebase_index` and keep polling `codebase_status` until it completes.
6. Use `codebase_graph_query` to inspect imports and dependents before reading more files.
7. Use `codebase_graph_circular` when debugging subtle behavior or architecture issues.
8. Use `codebase_context` and `codebase_context_search` for schemas, API specs, infra configs, and architecture docs.
9. Read files only after SocratiCode narrows the candidate set.
```

Install commands:

```bash
mkdir -p ~/.hermes/plugins/socraticode
```

Then write the five files above into that directory.

Bootstrap and verify:

```bash
cd ~/.hermes/hermes-agent
uv pip install -e ".[mcp]"

hermes chat --toolsets "terminal,file,socraticode-plugin"
```

Inside Hermes:

```text
Run socraticode_bootstrap.
Then run socraticode_doctor.
Then reload MCP.
```

After reload or restart, start Hermes normally or with an MCP toolset if you prefer:

```bash
hermes chat --toolsets "terminal,file,mcp-socraticode,socraticode-plugin"
```

