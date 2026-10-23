/**
 * BuilderHarness client entry
 * ==================================================================
 * The UI is React (core / review / studio) and does not know the host
 * framework. Hosts integrate through a thin adapter:
 *
 *   Vue 2   import { BuilderHarnessRoot } from "builderharness/vue2"
 *   other   write adapters/<framework>.js and call mountKit (see core/host.js)
 *
 * This entry deliberately has no framework imports, so it can be loaded by
 * any host.
 */
export { mountKit } from "./core/mount";
export { reviewState, setAuthor, addComment, updateComment, removeComment } from "./review/store";
export { frsForRoute, FRS_STATUS_LABEL } from "./review/frs";
export { anchorSummary, formatLoc, migrateAnchor, relocate } from "./review/anchor";
export { studioState } from "./studio/store";
