#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pkg = require.resolve("beepress/package.json");
const bin = path.join(path.dirname(pkg), "bin/beepress.mjs");
const result = spawnSync(process.execPath, [bin, ...process.argv.slice(2)], { stdio: "inherit" });
process.exit(result.status ?? 1);
