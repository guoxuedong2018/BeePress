# Bee Press scaffold

Host-project files that turn an empty repository into a Bee Press workspace.
The package ships them as plain files; `npx beepress init` copies them into the
current project without overwriting existing files.

## Contents

| Path | Purpose |
|---|---|
| `docs/templates/` | FRS, README, FLOW, STATE and ACCEPTANCE templates |
| `docs/WORKFLOW.md` | requirement → FRS → prototype → review → content → publish |
| `docs/DEPLOY.md` | deployment checklist and target conventions |
| `docs/DECISIONS.md` | cross-feature decision log |
| `docs/kb/README.md` | knowledge-base entry page |
| `docs/kb/CONTRIBUTING.md` | knowledge-base writing rules |
| `docs/kb/outline.config.mjs` | starter outline for `beepress kb-scaffold` |
| `docs/kb/shots.config.mjs` | screenshot recipe registry |
| `docs/kb/clips.config.mjs` | clip/GIF recipe registry |
| `src/config/frs-map.js` | route ↔ feature-region registry |
| `src/utils/contrast.js` | WCAG contrast helper used by `check-ui` and the design-system page |
| `.agent/skills/` | requirement review, PRD authoring, content drafting, review, UI, quality and optional Vue 2 skills |
| `AGENTS.md` / `CLAUDE.md` | project guide and Claude Code entrypoint |
| `.gitignore` | ignores generated reviews, PRD, media caches and credentials |

## Use

```bash
cd your-prototype
npx beepress init
npx beepress init --list          # show what would be copied
npx beepress init --force         # overwrite generated files
npx beepress init --only docs     # copy one subtree
```

After init:

1. Replace the placeholders in `AGENTS.md` and `docs/kb/outline.config.mjs`.
2. Add `beepress` to the host project and mount the Vite plugin.
3. Run `npx beepress kb-scaffold` to create the first knowledge-base pages.

The scaffold deliberately contains no product data, internal domains, credentials
or example business rules. Those belong to the host project.
