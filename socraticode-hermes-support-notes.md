# SocratiCode Hermes support patch

This draft patch adds first-class Hermes support without rewriting the SocratiCode MCP server.

## What it adds

- `npx -y socraticode --install-hermes-plugin`
  - Copies a bundled Hermes plugin payload into `~/.hermes/plugins/socraticode`
- A Hermes plugin payload under `hermes-plugin/`
  - Registers `socraticode_doctor`
  - Installs a bundled `socraticode` skill into `~/.hermes/skills/socraticode/SKILL.md`
- README updates
  - Quick-start section for Hermes
  - Config/install section for Hermes
  - Agent Instructions note for Hermes users
- A small unit test for the installer

## New files

- `scripts/install-hermes-plugin.mjs`
- `hermes-plugin/plugin.yaml`
- `hermes-plugin/__init__.py`
- `hermes-plugin/schemas.py`
- `hermes-plugin/tools.py`
- `hermes-plugin/skill.md`
- `tests/unit/install-hermes-plugin.test.ts`

## Changed files

- `package.json`
- `README.md`
- `src/index.ts`

## Intended flow

1. User runs:
   - `npx -y socraticode --install-hermes-plugin`
2. User adds SocratiCode MCP config to `~/.hermes/config.yaml`
3. User starts Hermes with:
   - `hermes chat --toolsets "terminal,file,mcp-socraticode,socraticode-plugin"`
4. Hermes plugin auto-installs the bundled skill on first load
5. If anything is missing, user runs `socraticode_doctor`

## Scope decision

This patch does not try to mutate `~/.hermes/config.yaml` automatically. That keeps the patch low-friction and avoids fragile YAML rewriting logic inside the npm package.

## Follow-up improvement worth doing next

If you want the stronger version, the next patch should add one of these:

- a safe config writer for `~/.hermes/config.yaml`, or
- a `socraticode_bootstrap` Hermes tool that can add the MCP block from inside Hermes
