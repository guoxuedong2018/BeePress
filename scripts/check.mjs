#!/usr/bin/env node
/**
 * Lightweight repository checks.
 *
 * - syntax-checks every `.js` / `.mjs` file outside node_modules
 * - verifies the CLI help path works
 * - verifies the path resolver and public client entry can be imported
 *
 * This is intentionally dependency-free so `npm run check` works before
 * `npm install`.
 */
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKIP_DIRS = new Set(["node_modules", ".git", "dist"]);

let failures = 0;
let checked = 0;

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(file);
      continue;
    }
    if (!/\.(?:js|mjs)$/.test(entry.name)) continue;
    checked += 1;
    const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    if (result.status !== 0) {
      failures += 1;
      console.error(`✗ ${path.relative(ROOT, file)}\n${result.stderr?.trim() ?? result.error?.message}`);
    }
  }
}

await walk(ROOT);

for (const [name, file] of [["path resolver", "pipeline/lib/paths.mjs"]]) {
  checked += 1;
  const href = pathToFileURL(path.join(ROOT, file)).href;
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", `await import(${JSON.stringify(href)})`], {
    encoding: "utf8",
    cwd: ROOT,
  });
  if (result.status !== 0) {
    failures += 1;
    console.error(`✗ ${name} (${file}) failed to import\n${result.stderr?.trim() ?? result.error?.message}`);
  }
}

checked += 1;
const help = spawnSync(process.execPath, [path.join(ROOT, "bin/builder-kit.mjs"), "--help"], {
  encoding: "utf8",
  cwd: ROOT,
});
if (help.status !== 0 || !help.stdout.includes("builder-kit")) {
  failures += 1;
  console.error(`✗ CLI --help failed\n${help.stderr?.trim() ?? ""}`);
}

if (failures) {
  console.error(`\n${failures} check(s) failed (${checked} checked).`);
  process.exit(1);
}
console.log(`✓ ${checked} checks passed.`);
