# builder-kit compatibility package

The active package is now [`beepress`](https://www.npmjs.com/package/beepress).
This package keeps existing `builder-kit/*` imports and the `builder-kit` CLI
working while projects migrate.

```bash
npm install --save-dev beepress
```

Use the new package for new code:

```js
import { beePress } from "beepress/vite";
import { BeePressRoot } from "beepress/react";
import { Badge, Button } from "beepress/ui";
```

For a compatibility window, existing imports still resolve:

```js
import { beePress } from "builder-kit/vite";
import { BeePressRoot } from "builder-kit/react";
```

The compatibility package is a thin re-export of `beepress`; it does not carry
a second copy of the toolkit. `builder-kit` CLI delegates to the `beepress`
CLI. `BUILDER_KIT_*` environment variables remain accepted as aliases.

The package will be deprecated after the migration window; pin it only when
you cannot yet update imports and build configuration.
