---
name: socraticode
description: Explore indexed codebases with SocratiCode before speculative file reads.
version: 1.0.0
metadata:
  hermes:
    tags: [codebase, search, architecture, mcp]
    category: development
---
# SocratiCode

Use SocratiCode when the task is to understand an unfamiliar repository, locate features quickly,
trace dependencies, or answer architecture questions without wasting context on blind file reads.

## When to Use

- The user asks where a feature lives or how a subsystem works.
- The repository is large enough that exploratory file reads would be expensive.
- You need dependency information before following imports manually.
- The answer may depend on schemas, API specs, infrastructure configs, or other non-code artifacts.

## Quick Reference

| Goal | Tool |
| --- | --- |
| Check whether a project is indexed | `mcp_socraticode_codebase_status` |
| Start or resume indexing | `mcp_socraticode_codebase_index` |
| Search conceptually across the codebase | `mcp_socraticode_codebase_search` |
| See imports and dependents for a file | `mcp_socraticode_codebase_graph_query` |
| Find circular dependencies | `mcp_socraticode_codebase_graph_circular` |
| Discover context artifacts | `mcp_socraticode_codebase_context` |
| Search schemas, specs, infra docs | `mcp_socraticode_codebase_context_search` |
| Diagnose Hermes integration issues | `socraticode_doctor` |

## Procedure

1. Start with `mcp_socraticode_codebase_status`.
   - If the project is not indexed, call `mcp_socraticode_codebase_index`.
   - Poll `mcp_socraticode_codebase_status` until indexing is complete before searching.

2. Use `mcp_socraticode_codebase_search` before opening files.
   - Use broad conceptual queries first.
   - Use exact symbol names only when you already know the identifier you need.

3. Use `mcp_socraticode_codebase_graph_query` before reading transitive dependencies.
   - Check what a file imports.
   - Check what depends on that file.
   - Then read only the most relevant files.

4. Use context artifacts when the question is not purely about code.
   - Run `mcp_socraticode_codebase_context` to see what artifacts exist.
   - Run `mcp_socraticode_codebase_context_search` for schemas, API specs, deployment config, and architecture documents.

5. Prefer grep only when the query is an exact identifier, error string, or regex.
   - SocratiCode is the default for exploration.
   - Exact-text search is better for already-known strings.

## Pitfalls

- Searching before indexing completes produces weak or empty results.
- Blind file reads waste context and often miss the most relevant entry points.
- If SocratiCode tools are missing in Hermes, run `socraticode_doctor` and verify that:
  - Node.js and `npx` are installed
  - Docker is available
  - `~/.hermes/config.yaml` contains the SocratiCode MCP server block

## Verification

- Search results identify the right files before any deep file reading.
- Graph queries show import and dependent relationships for the file under investigation.
- Context searches surface non-code artifacts when the question involves infrastructure or domain docs.
