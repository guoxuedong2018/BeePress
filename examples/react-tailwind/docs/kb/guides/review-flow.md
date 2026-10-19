---
title: Run a review
audience: [PM, Design]
docStatus: 已确认
type: howto
topic: How to run a prototype review with anchored comments
pages: [/overview, /reviews]
frs: [OVERVIEW, REVIEWS]
---

# Run a review

This page is synthetic demo content. It exists so the content workspace has
something to show.

## Open the review surface

<!--intent Explain where the review toolbar lives and when to use it.-->

The review toolbar sits above the prototype. Choose 「评论」 to enter selection
mode, then click the element you want to discuss.

<!--slot shot @/overview The review toolbar and a selected element-->

## Leave a comment

<!--intent Show the source coordinate and the draft persistence behavior.-->

The composer shows the anchored source coordinate, for example
`src/App.jsx:83:9`. Drafts are stored locally, so closing the composer does not
lose the text.

<!--slot diagram Show the anchor → comment → review queue flow-->

## Resolve the thread

<!--intent Give the team a closing move.-->

Open 「评论区」 and resolve the thread once the change has landed. Resolved
threads remain visible under the resolved filter.
