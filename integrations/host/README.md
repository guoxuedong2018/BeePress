# Bee Press × DeepSeek Harness integration

Integration package for running Bee Press beside an agent runtime. One package
has three faces:

- `src/dsh.mjs` — a DeepSeek Harness / Cordis plugin (`@beepress/dsh-bundle`)
- `lib/client.js` — the dsh client plugin (right-sidebar Bee Press panel)
- `src/mcp.mjs` — a stdio MCP server (`beepress-mcp`)
- `src/project.mjs` — the dependency-free workspace reader shared by all faces

The separation is intentional: the reader is the domain seam; dsh and MCP are
two hosts. The package is one directory so a `file:` install of the dsh bundle
does not depend on files outside the package.

## Tools

| Tool | Purpose |
| :-- | :-- |
| `beepress_status` | Content pages, open reviews, feature specs, dev script, publish config |
| `beepress_context` | `docs/kb` pages and excerpts, optionally filtered by topic |
| `beepress_review_open` | Unresolved review comments with anchors and reply counts |
| `beepress_review_add` | Add an open comment to `docs/reviews` |
| `beepress_review_resolve` | Resolve a comment, optionally appending a note |

The dsh plugin also ships a **Bee Press** right-sidebar tab. It reads the
current Session workspace, shows content pages/review counts/specs, lists open
reviews, supports refresh, and resolves a comment in place. The HTTP path is
`/beepress/api/state`; resolution posts to `/beepress/api/review/resolve`.

![Bee Press panel in DeepSeek Harness](../../docs/assets/dsh-bee-press-panel.png)

The MCP entrypoint remains read-only: Cursor/Claude/Codex get the three read
tools, not the write tools. Media capture and publishing are not included yet.

## Load into dsh

From the repository root:

```bash
dsh plugin --profile web add "file:$PWD/integrations/host"
```

Restart the Web UI or let the profile HMR pick up the patch, then:

1. Open a session in the target workspace.
2. Open the right sidebar and choose **Bee Press** from the guide.
3. Or ask the agent: `Use beepress_status and summarize the content workspace.`

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

- The host plugin uses raw JSON-Schema tool definitions; the client bundle is a
  hand-written `window.__ModuleLoader__` factory so it needs no build step.
- Tools are registered through `ctx.tools`; Cordis unregisters them when the
  plugin unloads.
- The workspace root defaults to the dsh **session working directory**, then
  `BEEPRESS_ROOT`. Pass `root` to a tool when you need another workspace.
- The client panel uses the session's `cwd`; use dsh's `working_directory` tool
  (or a new session in the target workspace) before opening it.
- The package is `private` and versioned as a spike. The dsh package is
  `0.2.1-rc.2`; pin a compatible version before publishing.
