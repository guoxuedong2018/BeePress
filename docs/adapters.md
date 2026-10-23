# Adapters

BuilderHarness has two adapter layers:

1. **Host adapters** — mount the React UI into a prototype framework.
2. **Pipeline adapters** — teach the screenshot/clip engine how to manipulate a particular stack.

## Host adapter

A host adapter calls `mountKit(host)` from `client/core/mount.jsx`. The host object is documented in [`client/core/host.js`](../client/core/host.js):

```js
{
  slots: {
    bar,      // toolbar
    content,  // prototype content area (review uses it to tell “is this the prototype?”)
    drawer,   // comment drawer
  },
  frsRegistry: [],              // requirement regions (business data)
  barLinks: [],                 // [{ label, route, title? }]
  agentPrompt: "",              // optional prefix for “copy for Agent”
  router: {
    current: () => location.hash,
    subscribe: (cb) => () => {},
    href: (route) => "#",
    push: (path) => {},
  },
  mountExtras: (el) => () => {}, // optional: mount host controls into the toolbar
}
```

The included Vue 2 adapter ([`client/adapters/vue2.js`](../client/adapters/vue2.js)) shows the three responsibilities:

- build the three layout slots;
- bridge the router (`currentRoute`, `afterEach`, `resolve`, `push`);
- mount host components with the host root instance as parent.

For Vue 3 or React, copy that file and call `mountKit` with the equivalent objects. The React UI itself does not change.

### React adapter

[`client/adapters/react.jsx`](../client/adapters/react.jsx) is included:

```jsx
// App entry, dev-only
if (import.meta.env.DEV) {
  import("builderharness/react").then(({ BuilderHarnessRoot }) => {
    root.render(
      <BuilderHarnessRoot router={router}>
        <App />
      </BuilderHarnessRoot>,
    );
  });
}
```

`router` is the same four-method contract (`current`, `subscribe`, `href`,
`push`). The adapter exports `hashRouter()` for a router-library-free setup.
`barExtras` are rendered as React components, so a React host can use React
toolbar controls.

### Source anchors

`builderHarness({ anchorLoc })` controls the dev source-anchor plugin:

| Value | Behaviour |
|---|---|
| `"auto"` (default) | Vue SFC plugin + React/JSX plugin; each only sees its own files |
| `"vue"` | Vue SFC plugin only |
| `"react"` | React/JSX plugin only |
| `false` | No source anchors |

The React plugin injects `data-loc` and `data-comp` on **intrinsic** JSX
elements only. Component props are not injected, because React components do
not automatically forward unknown props; component roots still get L2/L3
anchors. The plugin is dev-only and imports Babel lazily.

## Pipeline adapter

The screenshot and clip engine (`pipeline/lib/cdp.mjs`, `capture-*.mjs`, `record-kb-clips.mjs`) does not know any frontend framework. It asks the adapter for three things:

| Capability | Why the engine cannot do it |
|---|---|
| `stateInjector` — defines `window.__protoSetState(patch)` | Putting the page into an error/empty/filled state requires touching component internals. |
| `fieldSelector` — `{ container, label }` | Locating a form field by its label depends on the design system's class names. |
| `resolveRoute(repoRoot, route)` | “Which source files does this screen depend on?” depends on the router and import conventions. |

Select an adapter with:

```bash
BUILDERHARNESS_ADAPTER=react-router npx builderharness capture-kb-shots
```

`PROTO_ADAPTER` is still accepted for projects migrating from older versions.

### Writing a pipeline adapter

Create `pipeline/adapters/<name>.mjs`:

```js
export default {
  name: "react-router",

  stateInjector: `window.__protoSetState = function (patch) { /* … */ };`,

  fieldSelector: { container: ".form-item", label: ".form-item-label" },

  async resolveRoute(repoRoot, route) {
    return ["src/pages/Example.jsx"];
  },
};
```

`stateInjector` must return an empty string on success and a reason string on failure. If the host already exposes `window.__protoSetState` in dev, leave `stateInjector` empty and the engine will use the host's implementation.

The bundled `vue2-vite` adapter is a reference implementation. It assumes:

- Vue 2.7 with `__vue__`, `$data` and `$children`;
- `@/` resolves to `src/`;
- routes are declared in `src/router/index.js` with lazy `import("@/pages/…")`.

Copy and adapt it for your stack.
