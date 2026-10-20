# Changelog

## 0.6.0 — 2026-10-20

- **Package rename** — the npm package is now `beepress`; imports are
  `beepress`, `beepress/react`, `beepress/vue2` and `beepress/vite`. The CLI
  keeps `beepress`, `builder-kit` and `bk` aliases.
- **Compatibility package** — `compat/builder-kit` re-exports `beepress` for
  existing `builder-kit/*` imports and the `builder-kit` CLI. The legacy
  `BUILDER_KIT_*` environment variables and `virtual:builder-kit/host` module
  remain accepted; new code should use `BEEPRESS_*` and
  `virtual:beepress/host`.
- **`ctx.beepress` service** — the dsh bundle registers a Cordis service and
  routes both tools and HTTP handlers through it.
- **Content confirmation tools** — `beepress_content_status` reads
  `docs/kb/_lock.json` via `beepress kb status --json`;
  `beepress_content_confirm` records reviewed refs via `beepress kb ack`.
- **Publish plan** — `beepress_publish_plan` compares local pages with
  `docs/kb/_published.json`, reports the configured destination and exposes the
  plan in the right-sidebar panel.
- **Media capture tool** — `beepress_capture_media` rebuilds screenshots or
  clips with the existing reproducible `capture-kb-shots` /
  `record-kb-clips` recipe runner instead of ad-hoc screenshots.
- **Panel** — added content-lock and publish-plan sections, plus a content
  check action backed by `/beepress/api/content`.
- **Thin desktop shell** — added `integrations/desktop`, an Electron wrapper
  that boots an upstream dsh profile and loads its Web UI, plus an
  `install-profile` helper for the preinstalled Bee Press bundle.

## 0.5.0 — 2026-10-19

- **DeepSeek Harness + MCP integration** — added `integrations/` with
  `@beepress/dsh-bundle`, a dsh plugin, a right-sidebar Bee Press panel and a
  `beepress-mcp` stdio entrypoint over one shared workspace reader. The dsh
  host exposes `beepress_status`, `beepress_context`, `beepress_review_open`,
  `beepress_review_add` and `beepress_review_resolve`; the panel reads the
  current session workspace and can resolve reviews. MCP remains read-only.
  Media capture and publishing are not included yet.
- **dsh session directory** — the dsh tools now resolve the active session
  working directory through `ctx.workingDirectory.ensure()` instead of the
  Harness process cwd, so selecting a project workspace gives the correct
  `docs/` tree.

## 0.4.0

- **Bee Press brand** — the product is now **Bee Press**, with the positioning
  “a hive of agents. One source of truth.” The name reflects the operating
  model: specialised agents coordinate through shared artifacts (fact refs,
  review locks, media ledgers, publish state), not a human-in-the-loop chat.
- **Compatible CLI aliases** — `beepress` was added alongside `builder-kit` and
  `bk`. The npm package name, import paths and `BUILDER_KIT_*` environment
  variables are unchanged.
- **Brand guide** — added `docs/brand.md` covering naming, taglines, voice and
  visual direction.
- **Documentation and demo** — README, architecture, adapter, publishing and UI
  spec docs now use the Bee Press name; the React demo title and copy follow.

## 0.3.0

- **Tailwind 4 migration** — the demo, canonical components and docs now target
  Tailwind 4.3 via `@tailwindcss/postcss`. The token-derived legacy config is
  loaded with `@config`; container queries use Tailwind's built-in support.
- **Pluggable publish destinations** — the studio keeps the plan/state/confirm
  workflow and loads the actual destination through
  `BUILDER_KIT_PUBLISH_GATEWAY`; `pipeline/destinations/docs-cli.mjs` is now a
  reference adapter, not core coupling. See `docs/publishing.md`.
- **Content destination guide** — reframed publishing as content carriers, not
  just document pages. Added a Chinese, step-by-step `docs/publishing.zh-CN.md`
  covering content bundles, cards/assets, adapter layout, environment setup,
  authentication, validation and troubleshooting.
- **Content-check UX** — the studio opens with a guided review queue and
  page progress, shows requirement context on "needs confirmation" cards,
  hides AI/source-editing actions behind an advanced toggle, and disables
  publishing until a destination is configured.
- **React-first dependencies** — Vue 2 is an optional peer only. It is no longer
  installed for development or allowed to gate the build/audit; the Vue adapter
  remains available for hosts that opt in.
- **Dependency refresh** — Vite 6.4, Mermaid 12.2, tailwind-merge 3.7 and a
  patched `postcss-selector-parser` override. `npm audit` now reports
  **0 vulnerabilities**.

## 0.2.0

- **React adapter** — `beepress/react` mounts the toolkit in React prototypes;
  `hashRouter()` provides a router-library-free bridge.
- **React source anchors** — `anchorLoc: "auto" | "react" | "vue" | false`;
  the JSX plugin injects `data-loc` / `data-comp` on intrinsic elements in dev.
- **React + Tailwind demo** — `examples/react-tailwind`, a synthetic product
  workspace with review comments, a command palette, async dialog states, dark
  mode and the content studio.
- **Tool UI Spec** — `ui-spec/` now ships tokens, Tailwind config and canonical
  React components. Export `beepress/ui` and `beepress/tokens.css`.
- **UI conformance gate** — `scripts/check-ui-spec.mjs` checks raw colors,
  transitions, viewport breakpoints, spacing, radii, focus compensation and
  icon-button labels.
- **UI audit** — tokenized typography, spacing, radii, focus rings and motion in
  the review/studio UI; IME guards; draft persistence; tabular numerals.
- **Pre-deploy preflight** — `scripts/preflight-dist.mjs` scans artifacts for dev
  endpoints, source anchors, local paths, source maps and common secrets.
- **Deploy skill review** — `docs/deploy-skill-review.md` covers new-environment
  detection and user guidance.
- **Isolated deploy-skill E2E** — `scripts/test-deploy-skill-e2e.mjs` runs the real
  Harness skill against a fake CLI, registry, `fetch` and `HOME`, reproducing new
  machine, binding mismatch, offline, leaky artifact and stale-verification states.
- **Public dependency guard** — `.npmrc` pins `registry.npmjs.org` and
  `scripts/check-public-deps.mjs` rejects private registries, local specs and
  non-npmjs lockfile URLs.
- **Public docs cleanup** — genericized private deploy CLI names in the deploy
  review and removed an internal host name from an export comment.
- Fixed the content-menu trigger so its title, count and caret are vertically
  centered instead of sitting against the top of the 30px control.
- **Full UI spec page** — the demo `#/ui-spec` route now documents foundations,
  live component states, patterns, accessibility and a searchable token table.
- **Type-scale merge fix** — `cn` registers the custom font-size roles with
  `tailwind-merge`, so `text-body` / `text-prose` survive merging with
  `text-primary`.
- **Dialog focus** — destructive dialogs now focus an explicit
  `data-autofocus` target (Cancel) instead of the last focusable button.
- **Security hardening** — shell-quoted document CLI arguments, blocked
  `docs/kb` path traversal in publishing, refused to overwrite corrupt review
  files, and required a same-origin confirmation token for publishing.
- **Compatibility and robustness** — CRLF front-matter, legacy comments without
  `replies`, JSX in `.js` files, `<MessageActions>` hover, composer labelling,
  missing ffmpeg/Chrome spawn errors, and publish modal focus handling.
- **UI token cleanup** — danger buttons, code-block hover/focus, table headers
  and segmented tracks now use their semantic roles.
- Fixed a Vite Less edge case where an `@import` in a comment triggered URL
  rebasing.

## 0.1.0

Initial open-source release.

- Review suite: select-and-comment UI, source-coordinate anchors (L1/L2/L3), comment persistence.
- Studio suite: review queue, content status, before/after comparison, structure view, demo recorder.
- Vite integration with a host bridge and a Vue 2 adapter.
- Pipeline CLI for review notes, feature specs, PRDs, screenshots, clips and content status.
- Optional, pluggable external document publishing.
