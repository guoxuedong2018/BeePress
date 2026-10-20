#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const profile = process.argv[2] || process.env.BEEPRESS_DSH_PROFILE || "web";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const bundle = path.join(root, "integrations", "host");
const dsh = process.env.BEEPRESS_DSH_BIN || "dsh";
const result = spawnSync(dsh, ["plugin", "--profile", profile, "add", `file:${bundle}`], {
  cwd: root,
  stdio: "inherit",
});
if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
