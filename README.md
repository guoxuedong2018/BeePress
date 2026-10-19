# Builder Kit

**Local-first toolkit for prototype reviews, source-anchored comments, and a content workspace that keeps documentation in sync with the prototype.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node.js >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)

[中文文档](./README.zh-CN.md)

Builder Kit attaches two independent suites to a running prototype:

| Suite | What it collects | Where it lands |
|---|---|---|
| **Review** | Opinions about the prototype — select an element, leave a comment anchored to its source | `docs/reviews/<REGION>.json` |
| **Studio** | Whether the documentation still matches the prototype — stale screenshots, unreviewed facts, content gaps | `docs/kb/_lock.json`, `docs/kb/*.md` |

The UI is React and lives in an isolated root under `<body>`. A thin host adapter mounts it; the prototype keeps its own framework. A Vue 2 adapter is included, and writing an adapter for React, Vue 3 or another framework is intentionally small (three responsibilities: layout slots, router bridge, host controls).

The toolkit is **dev-only**. Production builds contain no Builder Kit code and no React.

---

## Why this exists

Review feedback is usually lost between the document and the implementation. A comment says “change this button to secondary”; by the time a developer reads it, nobody knows which button, on which page, in which file.

Builder Kit makes every comment addressable:

- **Automatic source locations** — during dev, the Vite plugin injects `file:line:column` into every Vue template element. Comments carry source coordinates without manual `data-*` attributes.
- **Graceful relocation** — after the source changes, an anchor degrades through three layers (`source coordinate → component semantics → geometry`) and reports its confidence. Comments do not silently drift onto the wrong element.
- **Comments become documentation material** — comments are grouped by requirement region and exported as structured Markdown.
- **Content is a build system** — prose is handwritten; screenshots and clips are reproducible build artifacts; facts are assertions checked against specs and source. “Is this sentence still true after the upstream change?” is the only thing a human has to judge.

## Features

- Select any element on the prototype and leave a comment; the comment is persisted to disk by a Vite dev middleware.
- Three-layer anchors: source coordinates (L1), component semantics (L2), geometry (L3).
- Content workspace: review queue, stale-asset detection by content hash (not timestamps), before/after screenshot comparison, structural view of a Markdown page, topic-based page scaffolding.
- Demo recorder: record clicks on the prototype and turn them into a replayable clip recipe.
- Optional screenshot/clip pipeline built on Chrome DevTools Protocol (no Playwright dependency).
- Optional external document publishing through a pluggable CLI.
- Markdown remains the single source of truth. No parallel JSON copy of the content graph.

## Requirements

- Node.js >= 18
- Vite >= 5
- Vue 2.7 if you use the included Vue adapter and source-anchor injection
- Less >= 3 if you use the bundled styles

## Install

```bash
npm install --save-dev builder-kit
# peers, if the host does not already have them
npm install --save-dev vite vue@2.7 less
```

## Project layout

Builder Kit reads and writes a small, conventional directory tree in the host project:

```text
my-prototype/
├── docs/
│   ├── features/<KEY>/FRS.json      # feature specs (optional)
│   ├── kb/
│   │   ├── outline.config.mjs       # knowledge-base outline
│   │   ├── shots.config.mjs         # screenshot recipes
│   │   ├── clips.config.mjs         # clip recipes
│   │   └── *.md                     # content, the source of truth
│   ├── prd/                         # generated PRDs
│   └── reviews/                     # review comments (generated)
├── web/                             # your prototype app (configurable)
│   └── src/
└── package.json
```

The project root is detected by walking up from the current working directory to the nearest ancestor containing `docs/`, a `builder-kit.config.*` file, or a `package.json` that depends on `builder-kit`. Override it with `BUILDER_KIT_ROOT`.

## Quick start

### 1. Add the Vite plugin

```js
// web/vite.config.js
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue2";
import { builderKit } from "builder-kit/vite";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [
    builderKit({
      root,
      // optional: requirement-region registry (business data)
      frsRegistry: "src/config/frs-map.js",
      // optional: host controls injected into the review toolbar
      barExtras: ["src/components/common/ThemeToggle.vue"],
      // optional: host links on the right side of the toolbar
      barLinks: [{ label: "Design system", route: { name: "design-system" } }],
      // optional: prefix for “copy for Agent” prompts
      agentPrompt: "",
    }),
    vue(), // builderKit's anchor plugin runs before this
  ],
});
```

`builderKit()` registers four things:

1. `build/anchor-loc.js` — dev-time source-coordinate injection.
2. `server/review-server.js` — dev middleware that persists comments.
3. `server/studio-server.js` — dev middleware for the content workspace.
4. `client/` — the React UI, exposed through the host adapter.

### 2. Mount the UI

Vue 2 example (the adapter is exported from `builder-kit/vue2`):

```js
// App.vue
export default {
  data: () => ({ kitRoot: null }),
  mounted() {
    if (import.meta.env.DEV) {
      import("builder-kit/vue2").then((m) => {
        this.kitRoot = m.BuilderKitRoot;
      });
    }
  },
};
```

```vue
<template>
  <component :is="kitRoot" v-if="kitRoot">
    <router-view />
  </component>
  <router-view v-else />
</template>
```

`import.meta.env.DEV` is replaced with `false` at build time, so the dynamic import and the whole toolkit branch disappear from production.

For another framework, create an adapter that calls `mountKit` and provides the slots described in [`client/core/host.js`](./client/core/host.js). See [docs/adapters.md](./docs/adapters.md).

### 3. Provide design tokens

The bundled Less files use semantic variables such as `@color-primary`, `@color-border` and `@space-8`. If the host already injects its own tokens, no action is needed.

If you do not have a design-token sheet, import the neutral defaults:

```js
// vite.config.js
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const kitRoot = path.dirname(require.resolve("builder-kit/package.json"));
const themeDefaults = path.join(kitRoot, "client/core/theme-defaults.less");

export default defineConfig({
  css: {
    preprocessorOptions: {
      less: {
        additionalData: `@import "${themeDefaults}";`,
      },
    },
  },
});
```

The defaults are CSS variables with fallbacks, so the palette can be changed at runtime:

```css
:root {
  --bk-color-primary: #1677ff;
}
```

See [docs/styling.md](./docs/styling.md).

## Configuration

```js
builderKit({
  root,                 // host app root (default: process.cwd())
  frsRegistry,          // module exporting FRS_REGISTRY, relative to root
  barExtras: [],        // host components rendered in the review toolbar
  barLinks: [],         // [{ label, route, title? }]
  reviewsDir,           // default: <project>/docs/reviews
  anchorLoc: true,      // set false for non-Vue prototypes
  agentPrompt: "",      // prompt prefix for “copy for Agent” buttons
})
```

Environment variables:

| Variable | Meaning | Default |
|---|---|---|
| `BUILDER_KIT_ROOT` | Host project root | auto-detected |
| `BUILDER_KIT_DOCS_DIR` | Docs directory, relative to project root | `docs` |
| `BUILDER_KIT_WEB_DIR` | Prototype app directory, relative to project root | `web` if present, else project root |
| `BUILDER_KIT_ADAPTER` | Pipeline adapter name | `vue2-vite` |
| `BUILDER_KIT_DOCS_CLI` | Command prefix for external document publishing | `docs-cli` |

## CLI

The package installs one dispatcher with two aliases (`builder-kit` and `bk`):

```bash
npx builder-kit kb status
npx builder-kit kb context docs/kb/guides/import.md
npx builder-kit kb shoot --stale
npx builder-kit kb ack guides/import.md
npx builder-kit review open
npx builder-kit review resolve <comment-id> --note "Changed to secondary style"
npx builder-kit export-review-notes --status open
npx builder-kit prd MY_FEATURE --scope delta
npx builder-kit check-frs
```

Run `npx builder-kit --help` for the full list. The scripts under [`pipeline/`](./pipeline) can also be executed directly with `node`.

The `check-ui`, `check-routes` and `check-frs` scripts are **reference host checks**: they encode one design-system convention (iView components, a specific token file, a navigation registry). Adapt or remove them for your project. Everything else is framework-agnostic.

## Publishing

Publishing to a cloud document service is optional. Builder Kit calls an external CLI through `pipeline/lib/docs-gateway.mjs`; the command prefix is configurable:

```bash
BUILDER_KIT_DOCS_CLI="docs-cli" npx builder-kit kb-publish --dry-run
```

The CLI must implement the small JSON protocol documented at the top of [`pipeline/lib/docs-gateway.mjs`](./pipeline/lib/docs-gateway.mjs). Without it, local review, content status, screenshots and clips all still work.

## Development

```bash
npm install
npm run check
```

`npm run check` syntax-checks every `.js`/`.mjs` file, imports the path resolver, and exercises the CLI help path. It is intentionally dependency-free so it works before `npm install`.

## Design notes

- [Architecture and anchors](./docs/architecture.md)
- [Host and pipeline adapters](./docs/adapters.md)
- [Content model](./docs/content-model.md)
- [Styling and tokens](./docs/styling.md)

## License

[MIT](./LICENSE)
