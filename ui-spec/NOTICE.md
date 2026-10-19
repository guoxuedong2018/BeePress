# Attribution and scope

This directory contains the **Tool UI Spec Kit** used by Builder Kit's UI.

- `UI-SPEC.md`, `AGENT-RULES.md`, `SELF-CHECK.md`, `ADAPTER-VUE.md`, `tokens.css`, `tokens.json`, `impl/` are kept as the canonical design specification and reference implementation.
- The spec is framework-agnostic at the principle and token layers. Builder Kit uses the tokens and the React reference components; the Vue 2 adapter in `client/adapters/vue2.js` only provides the host layout and router bridge.
- The spec states that it was distilled from a design-system methodology exercise and contains no proprietary assets or brand tokens.

When changing the design system, update `tokens.json` first, then keep `tokens.css`, the Tailwind config and the components in sync.
