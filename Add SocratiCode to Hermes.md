# Add SocratiCode to Hermes

**Created:** 3/30/2026 17:39:10  
**Updated:** 3/30/2026 18:29:30  
**Exported:** 3/30/2026 18:33:00  
**Link:** [https://chatgpt.com/g/g-p-699e141c586c8191a60c161296bf2ae0-g-chat/c/69cafb71-3f64-8329-a832-bdb247afaaed](https://chatgpt.com/g/g-p-699e141c586c8191a60c161296bf2ae0-g-chat/c/69cafb71-3f64-8329-a832-bdb247afaaed)  

## Prompt:
how to add [SocratiCode](https://github.com/giancarloerra/SocratiCode) to [hermes-agent](https://github.com/NousResearch/hermes-agent) ?

## Response:
I’m checking both codebases and the current Hermes docs to map the cleanest integration path, not just guess at config names. If SocratiCode already exposes a CLI, local server, or MCP-like entrypoint, that determines the strongest way to wire it in.

I’ve confirmed SocratiCode is already packaged as an MCP server. That means the highest-upside path is not a custom Hermes plugin at all unless you want agent-behavior coaching layered on top.

The integration is straightforward: Hermes can treat SocratiCode as a standard MCP stdio server, so the real leverage is in wiring the MCP server and then teaching Hermes the right exploration behavior. I’m pulling the exact Hermes-side CLI/config shape so the commands match current docs.

Thought for 3m 7s

Detailed
--------

The strongest way to add SocratiCode to Hermes is **not** as a native Hermes plugin. Treat it as a **local MCP stdio server**, then add a small `AGENTS.md` rule so Hermes adopts SocratiCode’s intended workflow.

### 1) Make sure the runtime pieces exist

You need Hermes with MCP support, plus Node.js and Docker.

```
cd ~/.hermes/hermes-agent
uv pip install -e ".[mcp]"
node --version
docker info >/dev/null
```

### 2) Register SocratiCode with Hermes

Use the new Hermes MCP management CLI rather than hand-editing config first.

```
hermes mcp add socraticode --command npx --args -y socraticode
hermes mcp test socraticode
hermes mcp configure socraticode
```

In `hermes mcp configure socraticode`, keep the **SocratiCode codebase tools** enabled. That is the high-upside move because it gives Hermes a dedicated semantic/graph/code-intel surface instead of forcing everything through raw file reads and grep.

### 3) Run Hermes with the SocratiCode toolset visible

```
hermes chat --toolsets "terminal,file,mcp-socraticode"
```

That keeps the session focused instead of drowning the model in unrelated tools.

### 4) Add the missing “plugin behavior” Hermes does not get automatically

SocratiCode’s Claude plugin bundles workflow skills, but Hermes does not consume Claude plugins. So you should recreate the important part in project instructions.

path: ./AGENTS.md
=================

```
## Codebase Search (SocratiCode)

This repo is indexed with SocratiCode. Always use SocratiCode MCP tools before reading files directly.

Workflow:
1. Start most explorations with `codebase_search`.
2. Use broad conceptual queries for orientation and exact queries for symbol lookup.
3. Use grep/ripgrep only for exact strings, regexes, or exact error messages.
4. If search returns nothing, check `codebase_status`.
5. If the project is not indexed, run `codebase_index` and keep polling `codebase_status` until indexing completes.
6. Use `codebase_graph_query` to inspect imports/dependents.
7. Use `codebase_graph_circular` when debugging unexpected behavior or architecture issues.
8. Use `codebase_context` and `codebase_context_search` for schemas, API specs, infra, and non-code artifacts.
9. Read files only after SocratiCode narrows the candidate set.
```

That is the difference between “SocratiCode is installed” and “Hermes actually uses it well.”

### 5) First-run prompt inside Hermes

Use this once you are in the repo:

```
Index this project with SocratiCode. Keep polling codebase_status until indexing completes. After that, use SocratiCode search before reading files directly.
```

### 6) High-upside upgrade for worktrees

If you use git worktrees, add `SOCRATICODE_PROJECT_ID` to the SocratiCode MCP server env so all worktrees share one index. That avoids re-embedding the same repo repeatedly and is the best performance win if you branch heavily.

### 7) If you want to edit config directly instead of using the CLI

path: ~/.hermes/config.yaml
===========================

```
mcp_servers:
  socraticode:
    command: "npx"
    args: ["-y", "socraticode"]
```

Then either restart Hermes or run `/reload-mcp`.

* * *

Concise
-------

Install MCP support, register SocratiCode as an MCP stdio server, then force the search-before-read workflow with `AGENTS.md`.

```
cd ~/.hermes/hermes-agent
uv pip install -e ".[mcp]"

hermes mcp add socraticode --command npx --args -y socraticode
hermes mcp test socraticode

hermes chat --toolsets "terminal,file,mcp-socraticode"
```

Then add an `AGENTS.md` telling Hermes to use:

*   `codebase_search` first
*   `codebase_status` / `codebase_index` when needed
*   `codebase_graph_query` / `codebase_graph_circular` for structure
*   raw file reads only after search narrows candidates

* * *

**Ambiguity: 0.12**

Assumption: you want the standard **local Hermes CLI integration** for SocratiCode, not a custom Hermes-native plugin or a remote MCP deployment.

Sources
-------

*   Hermes MCP uses `mcp_servers` in `~/.hermes/config.yaml`, supports stdio `command`/`args`, registers dynamic `mcp-<server>` toolsets, provides `hermes mcp add|test|configure`, and supports `/reload-mcp`; recent Hermes builds also auto-reload MCP config changes. [GitHub+5Hermes Agent+5Hermes Agent+5](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp/)
*   SocratiCode is distributed as an `npx` MCP server, requires Node.js 18+ and Docker in the default managed mode, and on first use auto-pulls/starts its managed Qdrant and Ollama stack. [GitHub+3GitHub+3GitHub+3](https://github.com/giancarloerra/SocratiCode/blob/main/README.md)
*   SocratiCode explicitly recommends adding agent instructions to `AGENTS.md` or equivalent so the assistant follows the “search before reading” workflow, and Hermes automatically loads `AGENTS.md`; SocratiCode also supports `SOCRATICODE_PROJECT_ID` for shared git-worktree indexes. [GitHub+5GitHub+5GitHub+5](https://github.com/giancarloerra/SocratiCode/blob/main/README.md)

## Prompt:
\*\*not\*\* as a native Hermes plugin

how do we add it as a plugin

## Response:
I’m checking the current Hermes plugin surface rather than assuming MCP and plugin internals are interchangeable. The key question is whether Hermes plugins can register tool-backed behaviors directly, or only wrap existing capabilities.

I’ve verified Hermes does have a real native plugin system now, but SocratiCode does not ship a Hermes-native plugin package. So the viable path is a wrapper plugin that installs the SocratiCode MCP server config and ships the missing workflow skill.

**Socraticode Hermes Plugin Wrapper**

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

Thought for 2m 49s

Detailed
--------

Yes. The strongest way to add SocratiCode **as a Hermes plugin** is a **hybrid wrapper plugin**:

*   native Hermes plugin for bootstrap + skill injection
*   SocratiCode still runs as its own MCP server underneath
*   the plugin writes the MCP entry, installs the workflow skill, and gives you a doctor/bootstrap tool inside Hermes

I put the full 5-file plugin scaffold in the canvas as **“Socraticode Hermes Plugin Wrapper.”**

### Do this

```
mkdir -p ~/.hermes/plugins/socraticode
```

Copy the files from the canvas into that directory, then:

```
cd ~/.hermes/hermes-agent
uv pip install -e ".[mcp]"
```

Start Hermes with the wrapper plugin enabled:

```
hermes chat --toolsets "terminal,file,socraticode-plugin"
```

Inside Hermes, run:

```
Run socraticode_bootstrap.
Then run socraticode_doctor.
Then reload MCP.
```

After that, restart Hermes or reload MCP, then run with both the wrapper plugin and the SocratiCode MCP toolset:

```
hermes chat --toolsets "terminal,file,mcp-socraticode,socraticode-plugin"
```

### What this gets you

This is the native-plugin version that is actually worth doing:

*   Hermes sees a real plugin in `~/.hermes/plugins/socraticode`
*   the plugin installs a SocratiCode workflow skill into `~/.hermes/skills/socraticode/SKILL.md`
*   the plugin bootstraps `mcp_servers.socraticode` in `~/.hermes/config.yaml`
*   Hermes then exposes the real SocratiCode tools through `mcp-socraticode`

### Why this is the right plugin shape

Do **not** try to port SocratiCode itself into a pure Python Hermes plugin. That is the wrong bet.

SocratiCode is already a packaged Node/MCP server. Re-implementing its indexing, graph, watcher, and managed runtime as a Hermes-native plugin is a large fork with ongoing maintenance cost. The wrapper-plugin approach gives you the native Hermes plugin surface you asked for without duplicating the actual engine.

### One sharp edge

The wrapper plugin cannot magically replace MCP. It is a **plugin that manages and augments the MCP integration**, not a full native rewrite of SocratiCode.

So the load order is:

1.  Hermes loads your native plugin
2.  plugin installs skill + configures MCP entry
3.  Hermes reloads MCP
4.  SocratiCode tools appear through `mcp-socraticode`

* * *

Concise
-------

Yes, but the correct version is:

*   build a **Hermes native wrapper plugin**
*   let that plugin install the SocratiCode skill and write `mcp_servers.socraticode`
*   keep SocratiCode itself as MCP

Use the canvas files, place them in:

```
~/.hermes/plugins/socraticode
```

Then run:

```
cd ~/.hermes/hermes-agent
uv pip install -e ".[mcp]"
hermes chat --toolsets "terminal,file,socraticode-plugin"
```

Inside Hermes:

```
Run socraticode_bootstrap.
Run socraticode_doctor.
Reload MCP.
```

Then:

```
hermes chat --toolsets "terminal,file,mcp-socraticode,socraticode-plugin"
```

That is the highest-upside native-plugin path that does not create a maintenance nightmare.

**Ambiguity: 0.11**

Sources
-------

*   Hermes has a first-class native plugin system with plugins in `~/.hermes/plugins/<name>/`, using `plugin.yaml`, `__init__.py`, tool schemas, handlers, hooks, and `register(ctx)`. `ctx.register_command()` is planned but not yet implemented. [Hermes Agent+5Hermes Agent+5Hermes Agent+5](https://hermes-agent.nousresearch.com/docs/guides/build-a-hermes-plugin/)
*   Hermes MCP support uses `mcp_servers` in `~/.hermes/config.yaml`, supports stdio servers with `command` and `args`, and current installs use `uv pip install -e ".[mcp]"` for MCP extras. [Hermes Agent+2Hermes Agent+2](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp/?utm_source=chatgpt.com)
*   SocratiCode is already distributed as an MCP server launched with `npx -y socraticode`, recommends adding host-side agent instructions for non-Claude hosts, and its Claude plugin bundles those workflow skills automatically. [GitHub+5GitHub+5GitHub+5](https://github.com/giancarloerra/socraticode)

## Prompt:
draft a patch for socraticode to support hermes

## Response:
I’m pulling the current SocratiCode packaging and Hermes plugin API so the patch matches the actual repo shape instead of inventing a wrapper that cannot land.

I have enough to avoid a fake patch shape: SocratiCode is a TypeScript MCP server with Claude-specific plugin assets already bundled, so the right patch is to add a Hermes plugin payload plus install/docs wiring inside SocratiCode itself.

I can now inspect the public repo directly. Next step is finding the minimal landing zone in SocratiCode itself so the patch is realistic: existing packaged assets, README install sections, and where Hermes-specific files should live.

Received app response

Received app response

Received app response

Received app response

Received app response

Received app response

Thought for 10m 2s

Detailed
--------

Draft patch: socraticode-hermes-support.patch

Companion notes: socraticode-hermes-support-notes.md

This patch takes the strongest practical route without forking SocratiCode’s MCP core:

*   adds a Hermes plugin payload inside the SocratiCode package
*   adds `npx -y socraticode --install-hermes-plugin`
*   bundles a Hermes `socraticode` skill that teaches search-before-read
*   adds a `socraticode_doctor` Hermes tool for diagnosis
*   updates README with Hermes install/config flow
*   adds a small unit test for the installer

What it does **not** do yet:

*   it does **not** auto-edit `~/.hermes/config.yaml`
*   it does **not** try to reimplement SocratiCode as a native Hermes toolset
*   it keeps SocratiCode as the MCP server and makes Hermes support a packaged add-on

That is the right cut for a first upstreamable patch. The risky but worthwhile choice here is shipping a real Hermes plugin payload in the npm package instead of only documenting a manual wrapper.

To apply it in a repo checkout:

```
git apply /path/to/socraticode-hermes-support.patch
```

My confidence is good on the architecture and file placement. I did not validate it against a live upstream checkout or run the repo test suite, so this is PR-grade draft material, not a claimed merged-state patch.

Concise
-------

Patch is ready: socraticode-hermes-support.patch

It adds:

*   Hermes plugin payload
*   `--install-hermes-plugin` entrypoint
*   bundled Hermes skill
*   `socraticode_doctor`
*   README/docs updates
*   installer test

It deliberately stops short of mutating `~/.hermes/config.yaml` automatically. That should be the next patch only if you want a more aggressive bootstrap path.

**Ambiguity: 0.18**

Sources
-------

Current SocratiCode package shape, shipped files, and MCP entrypoint in `package.json`:[](https://github.com/giancarloerra/SocratiCode/blob/main/package.json)

[package](https://github.com/giancarloerra/SocratiCode/blob/main/package.json)

Current SocratiCode README documents Claude plugin and Codex CLI flows, general MCP host config, agent instructions, and lacks Hermes-specific install/docs:[](https://github.com/giancarloerra/SocratiCode/blob/main/README.md)

[README](https://github.com/giancarloerra/SocratiCode/blob/main/README.md)

Current SocratiCode Claude plugin manifest points at `.mcp.json`, confirming the repo already ships host-specific integration assets alongside the MCP server:[](https://github.com/giancarloerra/SocratiCode/blob/main/.claude-plugin/plugin.json)

[plugin](https://github.com/giancarloerra/SocratiCode/blob/main/.claude-plugin/plugin.json)

Current SocratiCode `.mcp.json` uses the standard `npx -y socraticode` stdio server config:[](https://github.com/giancarloerra/SocratiCode/blob/main/.mcp.json)

[.mcp](https://github.com/giancarloerra/SocratiCode/blob/main/.mcp.json)

Current SocratiCode `src/index.ts` is a stdio MCP server entrypoint, which makes a CLI side-mode like `--install-hermes-plugin` a clean additive change:[](https://github.com/giancarloerra/SocratiCode/blob/main/src/index.ts)

[index](https://github.com/giancarloerra/SocratiCode/blob/main/src/index.ts)

Hermes MCP config uses `~/.hermes/config.yaml` with `mcp_servers`, and Hermes exposes MCP tools with `mcp_{server}_{tool}` naming plus dynamic MCP toolsets: [Hermes Agent+1](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp/)

Hermes plugins are local Python plugin directories with `plugin.yaml`, `register(ctx)`, and optional bundled skill installation during registration: [Hermes Agent+1](https://hermes-agent.nousresearch.com/docs/guides/build-a-hermes-plugin/)

Hermes skills live under `~/.hermes/skills/`, use `SKILL.md` with YAML frontmatter, and `AGENTS.md` is the main project context file Hermes auto-loads: [Hermes Agent+2Hermes Agent+2](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills/)



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)