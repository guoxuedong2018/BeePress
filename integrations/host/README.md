# Bee Press × DeepSeek Harness host spike

Phase 0 package for running Bee Press beside an agent runtime. One package has
two entrypoints:

- `src/dsh.mjs` — a DeepSeek Harness / Cordis plugin (`@beepress/dsh-bundle`)
- `src/mcp.mjs` — a stdio MCP server (`beepress-mcp`)
- `src/project.mjs` — the dependency-free workspace reader shared by both

The separation is intentional: the reader is the domain seam; dsh and MCP are
two hosts. The package is one directory so a `file:` install of the dsh bundle
does not depend on files outside the package.

## Tools

| Tool | Purpose |
| :-- | :-- |
| `beepress_status` | Content pages, open reviews, feature specs, dev script, publish config |
| `beepress_context` | `docs/kb` pages and excerpts, optionally filtered by topic |
| `beepress_review_open` | Unresolved review comments with anchors and reply counts |

The spike is read-only. It does not write files, start a browser, capture media
or publish.

## Load into dsh

From the repository root:

```bash
dsh plugin --profile web add "file:$PWD/integrations/host"
```

Restart the Web UI or let the profile HMR pick up the patch, then ask the agent:

> Use `beepress_status` and summarize the content workspace.

For a one-off overlay without installing:

```bash
cat >/tmp/beepress-dsh.yml <<EOF
- insert:
    - id: beepress
      name: '$PWD/integrations/host/src/dsh.mjs'
EOF
dsh web --patch /tmp/beepress-dsh.yml
```

## Run MCP

```bash
BEEPRESS_ROOT=/path/to/project node integrations/host/src/mcp.mjs
```

Cursor / Claude configuration:

```json
{
  "mcpServers": {
    "bee-press": {
      "command": "node",
      "args": ["/absolute/path/to/builder-kit/integrations/host/src/mcp.mjs"],
      "env": {
        "BEEPRESS_ROOT": "/absolute/path/to/your/project"
      }
    }
  }
}
```

## Notes

- The plugin uses raw JSON-Schema tool definitions, so it has no dependency on
  dsh packages at build time.
- Tools are registered through `ctx.tools`; Cordis unregisters them when the
  plugin unloads.
- The workspace root defaults to the dsh session working directory, then `BEEPRESS_ROOT`.
  Pass `root` to a tool when you need another workspace.
- The package is `private` and versioned as a spike. The dsh package is
  `0.2.1-rc.2`; pin a compatible version before publishing.
