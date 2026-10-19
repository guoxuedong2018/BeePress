#!/usr/bin/env node
/**
 * Isolated check for the publish-destination boundary.
 *
 * Verifies that:
 *   - the core passes a `{ kind, path }` source descriptor to the destination
 *   - a custom adapter can publish without any docs-cli dependency
 *   - a missing destination fails with configuration guidance
 */
import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "bk-publish-gateway-"));
const env = { ...process.env, BUILDER_KIT_ROOT: tmp };
delete env.BUILDER_KIT_PUBLISH_GATEWAY;
delete env.BUILDER_KIT_PUBLISH_DESTINATION;
delete env.BUILDER_KIT_DOCS_CLI;

try {
  await fs.mkdir(path.join(tmp, "docs", "kb"), { recursive: true });
  await fs.writeFile(
    path.join(tmp, "docs", "kb", "temp.md"),
    "---\ntitle: Temp\n---\n# Temp\n\nA page without slots.\n",
  );
  await fs.writeFile(
    path.join(tmp, "publish-gateway.mjs"),
    `import { writeFile } from "node:fs/promises";
export const destination = { id: "test", label: "Test" };
export async function createDoc(input) {
  await writeFile(new URL("./source.json", import.meta.url), JSON.stringify(input.source));
  return { docId: "d1", viewId: "v1" };
}
export async function writeDoc() {}
export async function fetchOutline() { return [{ id: "h1", text: "Temp" }]; }
export async function updateJsonml() {}
export function buildPageUrl({ base, viewId, docId }) { return base + "/" + viewId + "/" + docId; }
export function setIntent() {}
`,
  );

  const run = (extraEnv) =>
    spawnSync(
      process.execPath,
      [path.join(ROOT, "pipeline", "kb-publish.mjs"), "--root", "root", "--doc-base", "https://example.test"],
      { cwd: ROOT, env: { ...env, ...extraEnv }, encoding: "utf8" },
    );

  const configured = run({ BUILDER_KIT_PUBLISH_GATEWAY: "./publish-gateway.mjs" });
  if (configured.status !== 0) {
    throw new Error(`custom adapter publish failed:\n${configured.stdout}\n${configured.stderr}`);
  }
  const source = JSON.parse(await fs.readFile(path.join(tmp, "source.json"), "utf8"));
  if (source.kind !== "file" || !source.path) throw new Error(`unexpected source descriptor: ${JSON.stringify(source)}`);
  const state = JSON.parse(await fs.readFile(path.join(tmp, "docs", "kb", "_published.json"), "utf8"));
  if (state.baseUrl !== "https://example.test" || state.pages["temp.md"].url !== "https://example.test/v1/d1") {
    throw new Error(`unexpected publish state: ${JSON.stringify(state)}`);
  }

  const unconfigured = run({});
  if (unconfigured.status === 0 || !`${unconfigured.stdout}${unconfigured.stderr}`.includes("未配置发布目标")) {
    throw new Error(`missing destination was not rejected:\n${unconfigured.stdout}\n${unconfigured.stderr}`);
  }

  console.log("✓ publish destination boundary");
  console.log("  • core passes a file/zip source descriptor");
  console.log("  • custom adapter publishes without docs-cli");
  console.log("  • missing destination fails with configuration guidance");
} finally {
  await fs.rm(tmp, { recursive: true, force: true });
}
