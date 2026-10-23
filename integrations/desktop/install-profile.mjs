#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

function readEnv(name) {
  return process.env[`BUILDERHARNESS_${name}`] || "";
}

const profile = process.argv[2] || readEnv("DSH_PROFILE") || "web";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const bundle = path.join(root, "integrations", "host");
const dsh = readEnv("DSH_BIN") || "dsh";
const result = spawnSync(dsh, ["plugin", "--profile", profile, "add", `file:${bundle}`], {
  cwd: root,
  stdio: "inherit",
});
if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
if (result.status !== 0) process.exit(result.status ?? 1);

// `dsh plugin add` records the dependency but keeps the previously copied
// bundle, so edits and new files never reach the profile on their own.
const dshHome = process.env.DSH_HOME || path.join(os.homedir(), ".dsh");
const scope = path.join(dshHome, "profiles", profile, "node_modules");
const target = path.join(scope, "@builderharness", "dsh-bundle");
fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(bundle, target, { recursive: true, filter: (source) => !source.includes(`${path.sep}node_modules`) });
console.log(`✓ synced ${path.relative(process.cwd(), target)}`);
process.exit(0);
