#!/usr/bin/env node
/**
 * Bee Press CLI dispatcher.
 *
 * The npm package is still `builder-kit`; `beepress`, `builder-kit` and `bk`
 * are aliases for this entry point. All pipeline scripts live in `pipeline/`:
 *
 *   beepress kb status
 *   beepress review open
 *   beepress prd MY_FEATURE --scope delta
 *
 * Commands run with the current working directory as the host project root
 * (or `BUILDER_KIT_ROOT` when set).
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const KIT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PIPELINE_DIR = path.join(KIT_ROOT, "pipeline");

const COMMANDS = {
  kb: "kb.mjs",
  review: "review.mjs",
  prd: "prd.mjs",
  "prd-images": "prd-images.mjs",
  "prd-patch-ops": "prd-patch-ops.mjs",
  "export-frs-prd": "export-frs-prd.mjs",
  "export-review-notes": "export-review-notes.mjs",
  "check-frs": "check-frs.mjs",
  "check-ui": "check-ui.mjs",
  "check-routes": "check-routes.mjs",
  "check-prototype-syntax": "check-prototype-syntax.mjs",
  "capture-shots": "capture-shots.mjs",
  "capture-kb-shots": "capture-kb-shots.mjs",
  "record-kb-clips": "record-kb-clips.mjs",
  "kb-scaffold": "kb-scaffold.mjs",
  "kb-plan": "kb-plan.mjs",
  "kb-index": "kb-index.mjs",
  "kb-publish": "kb-publish.mjs",
  "kb-add-clip": "kb-add-clip.mjs",
  "kb-add-shot": "kb-add-shot.mjs",
};

function printHelp(code = 0) {
  console.log(`Bee Press — a hive of agents for prototype review & content

Usage:
  beepress <command> [options]
  builder-kit <command> [options]   # compatibility alias
  bk <command> [options]            # short compatibility alias

Commands:
  kb                       Content workspace CLI (status / shoot / ack / check / new …)
  review                   Review comments CLI (open / resolve / reply …)
  prd                      Build and publish a PRD from a feature spec
  prd-images               Align PRD images
  prd-patch-ops            Generate incremental PRD patch operations
  export-frs-prd           Render a feature spec as PRD content
  export-review-notes      Export review comments as Markdown
  check-frs                Validate feature specs
  check-ui                 UI conformance check (reference implementation)
  check-routes             Route registration check (reference implementation)
  check-prototype-syntax   Read-only JS / Vue SFC syntax check
  capture-shots            Capture PRD reference screenshots
  capture-kb-shots         Capture documentation screenshots
  record-kb-clips          Record documentation clips
  kb-scaffold              Create missing knowledge-base pages
  kb-plan                  Impact analysis for a feature
  kb-index                 Rebuild the knowledge-base index
  kb-publish               Publish the knowledge base
  kb-add-clip              Add a recorded clip to a section
  kb-add-shot              Add a captured screenshot to a section

Environment:
  BUILDER_KIT_ROOT         Host project root (default: auto-detect from cwd)
  BUILDER_KIT_DOCS_DIR     Docs directory inside the project (default: docs)
  BUILDER_KIT_WEB_DIR      Prototype app directory (default: web, or project root)
  BUILDER_KIT_ADAPTER      Pipeline adapter (default: vue2-vite)
  BUILDER_KIT_PUBLISH_GATEWAY  Publish destination adapter (default: disabled)
  BUILDER_KIT_DOCS_CLI     Command prefix for the bundled docs-cli adapter

Run \`beepress kb --help\` for command-specific options.`);
  process.exit(code);
}

const [command, ...args] = process.argv.slice(2);
if (!command || command === "--help" || command === "-h" || command === "help") printHelp();

const script = COMMANDS[command];
if (!script) {
  console.error(`Unknown command: ${command}\n`);
  printHelp(1);
}

const result = spawnSync(process.execPath, [path.join(PIPELINE_DIR, script), ...args], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
