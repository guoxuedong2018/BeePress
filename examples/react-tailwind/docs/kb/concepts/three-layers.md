---
title: Three anchor layers
audience: [Engineering]
docStatus: 已确认
type: concept
topic: Source coordinates, component semantics and geometry
pages: [/overview]
frs: [OVERVIEW]
---

# Three anchor layers

<!--intent Define each layer and when it is used.-->

1. **Source** — `file:line:column`, injected at dev transform time.
2. **Semantics** — component path, role and accessible name.
3. **Geometry** — percentage position relative to the nearest anchored element.

Relocation tries them in order and reports a confidence level: `exact`,
`moved`, `approx` or `lost`.

<!--slot table Compare the layers by stability and cost-->
