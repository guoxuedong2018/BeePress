# Changelog

## 0.2.0

- **React adapter** — `builder-kit/react` mounts the toolkit in React prototypes;
  `hashRouter()` provides a router-library-free bridge.
- **React source anchors** — `anchorLoc: "auto" | "react" | "vue" | false`;
  the JSX plugin injects `data-loc` / `data-comp` on intrinsic elements in dev.
- **React + Tailwind demo** — `examples/react-tailwind`, a synthetic product
  workspace with review comments, a command palette, async dialog states, dark
  mode and the content studio.
- **Tool UI Spec** — `ui-spec/` now ships tokens, Tailwind config and canonical
  React components. Export `builder-kit/ui` and `builder-kit/tokens.css`.
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
- Fixed a Vite Less edge case where an `@import` in a comment triggered URL
  rebasing.

## 0.1.0

Initial open-source release.

- Review suite: select-and-comment UI, source-coordinate anchors (L1/L2/L3), comment persistence.
- Studio suite: review queue, content status, before/after comparison, structure view, demo recorder.
- Vite integration with a host bridge and a Vue 2 adapter.
- Pipeline CLI for review notes, feature specs, PRDs, screenshots, clips and content status.
- Optional, pluggable external document publishing.
