# Architecture

BuilderHarness is a set of dev-only Vite plugins plus a React UI mounted in an isolated root. It has no runtime presence in production.

The core loop is **spec ↔ same-stack prototype ↔ review**. The studio is a
downstream deliverable surface: it consumes the same workspace but is not part
of the gate.

```text
host prototype (Vue 2, React, …)
        │
        ├── virtual:builderharness/host ── business wiring (regions, toolbar controls, links)
        │
        ├── builderharness/vite ────────── plugins (dev only)
        │      ├── build/anchor-loc.js       source coordinates in SFC templates
        │      ├── server/review-server.js   /__proto_review  (comments → JSON)
        │      ├── server/studio-server.js   /__builder_studio (content workspace)
        │      └── host bridge               virtual module generated from config
        │
        ├── builderharness/vue2 ────────── Vue 2 adapter → mountKit → React UI
        └── builderharness/react ───────── React adapter → mountKit → React UI
```

## Review suite

`client/review/` renders a toolbar, a selection layer, pins and a comment drawer.

A comment anchor has three layers, tried in order when the prototype is re-rendered:

| Layer | Data | Purpose |
|---|---|---|
| **L1 source** | `src: { file, line, col }` | Exact place in the prototype source. Injected by `build/anchor-loc.js` during dev. |
| **L2 semantics** | `componentPath`, `role`, `name` | Survives class/layout changes. Human-readable in review notes. |
| **L3 geometry** | `geo: { xPct, yPct }` | Last resort. Percentages are relative to the nearest anchored element, not the whole page. |

The source plugin injects three attributes:

- `data-loc` — where a native element is defined.
- `data-use` — where a component is **used** (Vue 2 attribute fall-through makes this land on the child root).
- `data-comp` — the owning component name, used to build `componentPath`.

Vue SFCs and React/JSX are both supported (`anchorLoc: "auto"`). The React
plugin injects anchors on intrinsic elements only; component props are not
injected because React components do not automatically forward unknown props.

Relocation reports a confidence level:

| Match | Confidence | UI |
|---|---|---|
| exact source coordinate | `exact` | no warning |
| component path + role + name | `moved` | “element moved” |
| selector | `approx` | “approximate location” |
| geometry only | `approx` | “approximate location” |
| nothing | `lost` | greyed out, “element no longer exists” |

Comments are written to `docs/reviews/<REGION>.json` by the dev middleware. The file is the source of truth; the CLI (`builderharness review …`) and the UI read and write the same shape.

## Studio suite

`client/studio/` is a full-screen content production workspace. It turns
prototype source, facts and media recipes into publishable content resources
(manuals, launch notes, message cards, campaign assets). It does not decide what
is stale; it calls `pipeline/lib/content-build.mjs`, the same module used by the
CLI, so the terminal and the UI cannot disagree.

The content model is described in [content-model.md](./content-model.md).

Publishing keeps the workflow in the kit and the destination in the host:
change detection, packaging, plan/confirm, resumable state and the studio UI
live here; the actual API or CLI is a destination adapter selected with
`BUILDERHARNESS_PUBLISH_GATEWAY`. See [publishing.md](./publishing.md).

## Host bridge

Only two kinds of business data cross the boundary:

1. The requirement-region registry (`FRS_REGISTRY`).
2. Toolbar extensions and links (`barExtras`, `barLinks`), plus an optional `agentPrompt` prefix.

`vite.mjs` generates `virtual:builderharness/host` from the options. The toolkit never imports product code directly. Removing the `builderHarness()` line is enough to remove the entire tool layer.

## Dev-only guarantee

The host entry uses a guarded dynamic import:

```js
if (import.meta.env.DEV) import("builderharness/react").then(/* … */);
```

Vite replaces `import.meta.env.DEV` with `false` in production, so the import and the entire toolkit branch are tree-shaken away. React, React Flow, valtio and mermaid never enter the production bundle.

## Why not a separate app?

A separate review app cannot anchor comments to the live DOM or the source coordinates of the page being discussed. Mounting into the prototype keeps the discussion on the artifact itself, while the isolated React root keeps the toolkit from leaking into the product framework.
