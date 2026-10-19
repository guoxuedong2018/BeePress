# Helix · React + Tailwind demo

A synthetic product workspace that demonstrates Builder Kit on a **React 19 +
Tailwind 3.4** prototype. It is intentionally data-free: every project, person
and metric is made up.

## Run it

From the repository root (the demo resolves Vite and dependencies from the root
`node_modules`):

```bash
npm run demo
# open the printed URL, usually http://localhost:5173/#/overview
```

Production build:

```bash
npm run build:demo
```

The demo runs from `examples/react-tailwind`, so Builder Kit treats that folder
as the host project (`docs/`, `src/`, `package.json`). Review comments are
written to `examples/react-tailwind/docs/reviews/`.

## What to try

- **Review** — the Builder Kit toolbar is mounted above the app. Click 「评论」,
  then click any element (a heading, a metric card, a table row). The comment
  composer shows the injected source coordinate, e.g. `src/App.jsx:83:9`.
- **Drafts** — type a comment, close it, reopen the same element: the draft is
  restored from `localStorage`.
- **Command palette** — `⌘K` / `Ctrl+K`, filter with an IME, `↑`/`↓`, `Enter`.
- **New experiment** — validates the name, keeps input on failure, retries, and
  has a loading/success/error state machine. Type `fail` to exercise the error
  path.
- **Dark mode** — the toggle persists to `localStorage` and re-maps the semantic
  tokens (it is not a filter).
- **Views** — `#/overview`, `#/experiments`, `#/reviews`, `#/ui-spec`.
- **UI spec** — `#/ui-spec` is the living reference page: foundations, live
  component states, patterns, accessibility notes and a searchable token table.

## Stack

- React 19 + Vite 6
- Tailwind CSS 3.4 with [`ui-spec/impl/react/tailwind.config.cjs`](../../ui-spec/impl/react/tailwind.config.cjs)
- Tokens from [`ui-spec/tokens.css`](../../ui-spec/tokens.css)
- Components from [`ui-spec/impl/react`](../../ui-spec/impl/react)
- Builder Kit's React adapter (`client/adapters/react.jsx`)

The Vite config aliases the in-repo package subpaths:

```js
{ find: /^builder-kit\/react$/, replacement: path.join(kitRoot, "client/adapters/react.jsx") }
{ find: /^builder-kit\/ui$/, replacement: path.join(kitRoot, "ui-spec/impl/react/index.ts") }
```

A project that installs the published package does not need those aliases; it
imports `builder-kit/react` and `builder-kit/ui` directly.

## Copy it out

To use this as a starting point for a real prototype:

1. Copy the folder.
2. Replace `"builder-kit": "file:../.."` with the published version.
3. Keep `docs/` next to `src/`; Builder Kit detects the project root from it.
4. Run `npm install && npm run dev`.
5. Keep the dev-only dynamic import in `src/main.jsx`; production builds strip
   Builder Kit and React never enters the artifact as part of the toolkit.

## Tailwind notes

- `tailwind.config.cjs` reuses the canonical token config and adds the demo and
  toolkit source paths. Paths are absolute because Vite may run from the repo
  root.
- `postcss.config.cjs` points Tailwind at that config explicitly for the same
  reason.
- Do not add a second accent color. The only accent is `--accent`; status colors
  are paired with icons or text.
