# Project instructions

## Graphify setup for this repository

- Graphify 0.9.40 is installed for this project under `.codex/skills/graphify/`.
- Build a missing graph with `npm run graphify:build`. This runs local code extraction and generates the report and HTML without LLM calls. Project documentation is not semantically indexed by this command.
- Use `npm run graphify:query -- "<symbol or question>"` to inspect the graph, and `npm run graphify:update` after code changes.
- Honor `.graphifyignore`; do not index credentials, order data, downloaded audio, dependencies, or generated assets.
- `graphify-out/` and the machine-specific `.codex/hooks.json` are local generated files. Recreate the project hook with `npm run graphify:install`.
- See `docs/graphify.md` for installation and usage.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
