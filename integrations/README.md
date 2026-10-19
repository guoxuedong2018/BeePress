# Bee Press integrations

This directory is the **Phase 0 spike** for running Bee Press beside an agent
runtime instead of inside a prototype. It is intentionally read-only: the goal
is to validate the workspace contract before adding writes, media capture or
publishing.

## Pieces

| Path | What it is |
| :-- | :-- |
| [`host/`](./host/README.md) | `@beepress/dsh-bundle`: a dsh plugin plus a `beepress-mcp` entrypoint |
| [`host/src/project.mjs`](./host/src/project.mjs) | Dependency-free workspace reader used by both hosts |
| [`test-integrations.mjs`](./test-integrations.mjs) | Mock-harness and MCP protocol tests |

## The seam

```text
Cursor / Claude / Codex ──MCP──┐
                                ├── shared workspace reader ── docs/
DeepSeek Harness ──Cordis──────┘
```

Both hosts expose the same three read tools:

- `beepress_status`
- `beepress_context`
- `beepress_review_open`

The workspace is the contract, not the agent runtime. That is what keeps the
kit usable with an external IDE agent and with a bundled Bee Press Desktop.

## Run the checks

```bash
npm run test:integrations
```

The test creates a temporary Bee Press workspace, exercises the shared reader,
registers the dsh plugin against a mock `ctx.tools`, and drives the MCP server
over newline-delimited JSON-RPC.

## Model setup

In a dsh Web profile, open **Settings → Models** and configure either the
DeepSeek route, a third-party provider, or a custom OpenAI-compatible endpoint
for a local vLLM / LM Studio / Ollama-style server. Local models are only useful
for this workflow when they support tool calls and structured output; validate
that before treating them as a full-lifecycle agent.

## Status

The integration contract and MCP protocol are tested. A real `dsh web` boot is
the next verification step on a machine where the dsh package can be installed;
the current environment blocks remote npm package installation.

## What comes next

1. A `ctx.beepress` service instead of direct filesystem reads in tools.
2. Write tools for review resolution and content confirmation.
3. A client UI panel in dsh.
4. Media capture through dsh `browser-use` / `computer-use`.
5. Publish planning through the existing destination gateway.
6. A thin downstream desktop shell; do not patch the dsh core.
