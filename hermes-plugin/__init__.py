"""SocratiCode Hermes plugin registration."""

from __future__ import annotations

import logging
import shutil
from pathlib import Path

from . import schemas, tools

logger = logging.getLogger(__name__)
_PLUGIN_DIR = Path(__file__).parent
_SKILL_SOURCE = _PLUGIN_DIR / "skill.md"


def _skill_destination() -> Path:
    try:
        from hermes_cli.config import get_hermes_home  # type: ignore

        return Path(get_hermes_home()) / "skills" / "socraticode" / "SKILL.md"
    except Exception:
        return Path.home() / ".hermes" / "skills" / "socraticode" / "SKILL.md"


def _install_skill() -> None:
    destination = _skill_destination()

    if destination.exists() or not _SKILL_SOURCE.exists():
        return

    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(_SKILL_SOURCE, destination)


def register(ctx):
    ctx.register_tool(
        name="socraticode_doctor",
        toolset="socraticode-plugin",
        schema=schemas.SOCRATICODE_DOCTOR,
        handler=tools.socraticode_doctor,
    )
    _install_skill()
    logger.info("SocratiCode Hermes plugin registered")
