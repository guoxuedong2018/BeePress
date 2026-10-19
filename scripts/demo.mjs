#!/usr/bin/env node
/**
 * Run the React + Tailwind demo from its own directory so the Bee Press path
 * resolver treats the demo as the host project (docs/, src/, package.json).
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXAMPLE = path.join(ROOT, "examples/react-tailwind");
const VITE = path.join(ROOT, "node_modules/vite/bin/vite.js");
const build = process.argv[2] === "build";
const extra = build ? process.argv.slice(3) : process.argv.slice(2);

const result = spawnSync(process.execPath, [VITE, ...(build ? ["build"] : []), ...extra], {
  cwd: EXAMPLE,
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
