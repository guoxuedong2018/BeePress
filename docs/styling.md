# Styling and tokens

## Rules

- Colors, spacing, radii, focus rings and the code font come from host tokens. The toolkit does not define a second palette.
- Font sizes use the `@bk-fs-*` scale. The minimum is 11px.
- Reusable controls use mixins from [`client/core/kit.less`](../client/core/kit.less):
  - `.bk-input()` — text input
  - `.bk-chip()` — multi-select pill
  - `.bk-seg()` — exclusive segmented control
  - `.bk-badge()` — count badge
  - `.bk-reveal()` — secondary button revealed on hover/focus
- Keyboard focus is drawn once by `.bk-root :focus-visible`; do not write `outline: none`.
- Respect `prefers-reduced-motion`.
- Layout decisions use container queries, not screen width.

## Variables used by the toolkit

```less
@color-primary, @color-on-primary, @color-primary-ring, @color-link
@color-text, @color-heading, @color-text-secondary, @color-text-weak, @color-text-disabled
@color-white, @color-page-bg, @color-bg-subtle, @color-bg-thead, @color-bg-count
@color-hover-bg, @color-border, @color-divider, @color-mask
@color-danger, @color-status-success, @color-status-info, @color-status-info-bg
@color-status-warning, @color-status-warning-bg, @color-status-failed, @color-status-failed-bg
@radius-control, @radius-overlay, @radius-tag
@space-4, @space-8, @space-12, @space-16, @space-24, @space-40, @space-48
@elevation-1
@focus-ring-width, @focus-ring-color, @focus-ring-offset
@font-family-code
```

## Using the defaults

`client/core/theme-defaults.less` defines every variable as a CSS variable with a light-theme fallback:

```less
@color-primary: var(--bk-color-primary, #2563eb);
@color-border: var(--bk-color-border, #e5e6eb);
```

Import it through Less `additionalData` if the host has no token sheet:

```js
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const kitRoot = path.dirname(require.resolve("beepress/package.json"));
const themeDefaults = path.join(kitRoot, "client/core/theme-defaults.less");

export default defineConfig({
  css: {
    preprocessorOptions: {
      less: { additionalData: `@import "${themeDefaults}";` },
    },
  },
});
```

Override the palette at runtime:

```css
:root {
  --bk-color-primary: #1677ff;
  --bk-radius-control: 6px;
}
```

If the host already injects its own `@color-*` tokens, do **not** import the defaults: host tokens and defaults would redefine the same variables in one scope.

## Layers

The review layer starts at `z-index: 3000`, above common component-library layers (iView tops out around 2010). The studio is one step above the review layer (`3100`), because it is a full-screen workspace that must cover the prototype and the review UI. Keep these values in the `z-index.less` files.
