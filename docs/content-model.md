# Content model

The studio and the `kb` CLI share one model. Prose is handwritten; everything else is derived or verified.

```text
docs/kb/
├── outline.config.mjs     # outline: modules → pages
├── shots.config.mjs       # screenshot recipes
├── clips.config.mjs       # clip recipes
├── *.md                   # content — the only source of truth
├── images/                # generated screenshots
├── media/                 # generated clips
├── _media.json            # media ledger (source hashes + output hashes)
├── _lock.json             # what a human confirmed, per page
├── _index.json            # derived index
├── _blobs/                # versioned layout snapshots / old media
├── _sources/              # source snapshots used for drift detection
└── _published.json        # external publication state (optional)
```

## Pages

A page is a Markdown file with front matter:

```yaml
---
title: Import data
topic: How to import a CSV
type: guide
pages: /data/import,/data/import/result
frs: DATA_IMPORT
---
```

`type` selects a skeleton from `pipeline/lib/topic-types.mjs` (`guide`, `concept`, `reference`, `troubleshooting`, `module`).

## References

Everything the page depends on is parsed from the Markdown. Nothing is stored in a parallel data structure.

| Reference | Syntax | Checked against |
|---|---|---|
| Screenshot | `![…](images/x.png)` | `shots.config.mjs` + `_media.json` |
| Clip | `![](media/x.mp4)` | `clips.config.mjs` + `_media.json` |
| Fact | `<!--f frs:KEY#FP1-->quoted text<!--/f-->` | feature spec |
| Code fact | `<!--f code:src/pages/x.vue:10-->quoted text<!--/f-->` | prototype source |
| Note | `<!--f note:…-->…<!--/f-->` | not verifiable; always reported as such |
| Feature link | `frs: KEY` in front matter | `docs/features/<KEY>/FRS.json` |

If a reference cannot be resolved, `kb check` fails. If it resolves but the value changed, the page appears in the review queue — it does not fail the build.

## Lock

`_lock.json` records the value of every reference at the moment a human confirmed the page:

```json
{
  "guides/import.md": {
    "refs": {
      "shot:import-dialog": "sha256-…",
      "frs:DATA_IMPORT#FP2": "…"
    },
    "at": "2026-01-01T00:00:00.000Z"
  }
}
```

The review queue is the comparison between the lock and the current values. There is no separate task list to keep in sync.

## Media ledger

`_media.json` records, for every recipe:

- the content hash of the source files the screen depends on;
- the hash of the produced file;
- a layout snapshot (text, controls, icons and their boxes) used to explain what changed.

“Stale” means the source hash changed, not that the file is old. After a reshoot, if the rendered pixels did not change (16×16 grayscale cells, ≤ 8 differing cells), the page is not disturbed.

## Plan marks

Structural intent lives in the Markdown too:

```html
<!--intent Answer “what happens after import?” with one screenshot and one table.-->
<!--slot shot @/data/import/result Import result page-->
<!--slot diagram Render the state machine-->
```

The structure view renders these as dashed nodes. Filling a slot writes back into the Markdown. Publishing strips the marks.

## Commands

```bash
beepress kb status                 # what needs review / reshoot / writing
beepress kb context <page|route>   # bundle references, recipes and specs for an agent
beepress kb shoot --stale          # reshoot only genuinely stale recipes
beepress kb ack <page> [ref…]      # record a human confirmation
beepress kb check                  # fail only on broken references
beepress kb new <page> <type> "<topic>" --pages=/a,/b
```
