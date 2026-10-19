# Publishing destinations

Builder Kit owns the **publishing workflow**: deciding which Markdown pages
changed, packaging images, computing a plan, persisting resumable state, and
showing the confirmation UI. It does **not** own the destination. A host that
publishes to an internal wiki, a CMS, a docs service, or a product database
provides a small destination adapter.

The bundled `docs-cli` adapter is a reference implementation, not a requirement.
Local review, content status, screenshots and clips work without any publishing
destination.

## Configure

```bash
# A path relative to the host project root, a file: URL, or a package name
BUILDER_KIT_PUBLISH_GATEWAY=./tools/publish-gateway.mjs
# BUILDER_KIT_PUBLISH_GATEWAY=@acme/builder-kit-publish
```

When unset, publishing is disabled. To use the bundled
[`pipeline/destinations/docs-cli.mjs`](../pipeline/destinations/docs-cli.mjs)
reference adapter, set `BUILDER_KIT_PUBLISH_GATEWAY=docs-cli`; it still reads
`BUILDER_KIT_DOCS_CLI` for its command prefix. Setting `BUILDER_KIT_DOCS_CLI`
alone is also accepted as the legacy opt-in.

## Loaded interface

Bare package names are resolved from the host project's `node_modules`; relative
paths are resolved from the host project root. The adapter module may export an
object as its default export, or named exports. Every core method is required for knowledge-base publishing; the PRD
pipeline additionally needs the three PRD methods.

```ts
type Source =
  | { kind: "file"; path: string }  // rendered Markdown or destination-native text
  | { kind: "zip"; path: string };  // Markdown plus relative image assets

interface PublishGateway {
  /** Shown in the studio. All fields are optional. */
  destination?: { id?: string; label?: string; description?: string };

  /** Create a page. Must not be retried by the adapter; the core treats it as non-idempotent. */
  createDoc(input: {
    title: string;
    source: Source;
    parentViewId?: string | null;
  }): Promise<{ docId: string; viewId: string; url?: string }>;

  /** Replace a page. The core already decided that overwriting is intentional. */
  writeDoc(input: {
    docId: string;
    source: Source;
    position?: "REPLACE_ALL" | string;
  }): Promise<unknown>;

  /** Return `[{ id, text, type? }]` for the page outline/headings. */
  fetchOutline(docId: string): Promise<Array<{ id: string; text: string; type?: string }>>;

  /** Apply the core's structured operations to a page. */
  updateJsonml(input: {
    docId: string;
    opsFile: string;
    dryRun?: boolean;
  }): Promise<unknown>;

  /** Turn opaque page ids into the URL stored in `_published.json` and rendered links. */
  buildPageUrl(input: {
    base: string;
    viewId: string;
    docId: string;
  }): string;

  /** Optional: tells the adapter that the user confirmed the outbound action. */
  setIntent?(text: string): void;

  /** PRD pipeline only. */
  createBlankDoc(input: { title: string }): Promise<{ docId: string; url?: string }>;
  appendImages(input: { docId: string; files: string[] }): Promise<string[]>;
  fetchJsonml(docId: string): Promise<{ body: unknown[]; version: number | string }>;

  /** Not used by the core workflow today; keep it for custom content tooling. */
  uploadSource?(input: { docId: string; file: string; type?: string }): Promise<string>;
  listWiki?(viewId: string): Promise<Array<{ id: string; text?: string }>>;
}
```

### Content source

`packSource()` in [`pipeline/kb-publish.mjs`](../pipeline/kb-publish.mjs)
produces a `Source` descriptor. The adapter decides how to send it:

- `file`: a rendered Markdown/temp file;
- `zip`: Markdown plus relative images, with the original directory layout.

Do not put CLI flags, shell quoting, or destination authentication into the
core workflow. Those belong to the adapter.

### State

`docs/kb/_published.json` stores opaque ids, the destination base URL, content
fingerprints and outline anchors. The core uses those ids only for follow-up
calls and link rendering. A destination can use any id format, as long as it
returns the same ids from `createDoc` and accepts them in later methods.

## Minimal custom adapter

```js
// tools/publish-gateway.mjs
import { readFile } from "node:fs/promises";

export const destination = {
  id: "internal-wiki",
  label: "内部 Wiki",
  description: "通过内部 API 发布到团队 Wiki。",
};

let token = process.env.WIKI_TOKEN;

async function request(pathname, body) {
  const res = await fetch(`${process.env.WIKI_BASE}${pathname}`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Wiki ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function createDoc({ title, source, parentViewId }) {
  const content = await readFile(source.path, "utf8");
  const page = await request("/pages", { title, page: parentViewId, content });
  return { docId: page.id, viewId: page.id, url: page.url };
}

export async function writeDoc({ docId, source }) {
  const content = await readFile(source.path, "utf8");
  await request(`/pages/${docId}`, { content });
}

export async function fetchOutline(docId) {
  const page = await request(`/pages/${docId}/outline`, {});
  return page.items;
}

export async function updateJsonml({ docId, opsFile, dryRun }) {
  const ops = JSON.parse(await readFile(opsFile, "utf8"));
  return request(`/pages/${docId}/ops`, { ops, dryRun: !!dryRun });
}

export function buildPageUrl({ base, docId }) {
  return `${base.replace(/\/+$/, "")}/${docId}`;
}
```

The custom adapter can ignore `opsFile` and interpret the operations in its own
way, or expose a different authoring API behind the same method names.

## Retry boundary

Only idempotent operations are retried by the core. Creating a page is not
idempotent: a timeout can mean the page was created. The core persists each
page's ids as it goes, so a later run updates instead of creating duplicates.
Adapters should surface ambiguous failures rather than retrying a create.
