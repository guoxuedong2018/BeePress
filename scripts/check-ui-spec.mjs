#!/usr/bin/env node
/**
 * Tool UI Spec conformance check (subset of ui-spec/SELF-CHECK.md A1–A8).
 *
 * Scope: BuilderHarness UI (`client/`) and the React + Tailwind demo. The
 * canonical spec components under `ui-spec/impl` are the source of truth and
 * are not re-linted here.
 *
 * This is intentionally dependency-free. It catches the high-frequency
 * violations: raw colors, `transition: all`, viewport breakpoints inside
 * components, arbitrary radii/font sizes, and missing focus compensation.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TARGETS = ["client", "examples/react-tailwind/src"];
const EXT = new Set([".js", ".jsx", ".ts", ".tsx", ".less"]);

const problems = [];
const add = (file, line, rule, message) => problems.push({ file: path.relative(ROOT, file), line, rule, message });

/** TOK-05 — 4px grid, with 2px allowed for hairline adjustments. */
const SPACING = new Set([0, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 56, 64]);

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(file);
      continue;
    }
    if (!EXT.has(path.extname(file))) continue;
    await check(file);
  }
}

async function check(file) {
  const text = await readFile(file, "utf8");
  const lines = text.split("\n");
  const isStyle = file.endsWith(".less");
  const isCode = /\.(?:jsx|tsx|js|ts)$/.test(file);

  lines.forEach((line, i) => {
    const n = i + 1;

    // A1 — raw colors in code (tokens belong in tokens.css / Less variables)
    if (isCode && !file.includes("/ui-spec/") && /#[0-9a-fA-F]{3,8}\b/.test(line) && !/^\s*\/\//.test(line)) {
      add(file, n, "A1", "raw hex color; use a semantic token or CSS variable");
    }
    if (isCode && /\b(?:rgba?|hsla?)\(/.test(line) && !/^\s*\/\//.test(line)) {
      add(file, n, "A1", "raw color function; use a semantic token or CSS variable");
    }

    // A2 / A8 — transition: all and banned timing functions
    if (/transition:\s*all\b/.test(line)) add(file, n, "A2", "transition: all is forbidden");
    if (/transition-all\b/.test(line)) add(file, n, "A2", "transition-all is forbidden");
    if (/transition[^;]*\blinear\b/.test(line)) add(file, n, "A8", "linear transitions are forbidden");

    // A3 — viewport breakpoints inside components
    if (isStyle && /@media\s*\(\s*(?:min|max)-width/.test(line)) {
      add(file, n, "A3", "use a container query inside components");
    }

    // A5 — arbitrary radius / font-size values
    if (isCode && /(?:rounded|text)-\[[^\]]*\d+px[^\]]*\]/.test(line)) {
      add(file, n, "A5", "arbitrary radius/font-size; use a token class");
    }

    // A4 — spacing values on the 4px grid (2px allowed)
    if (isStyle) {
      for (const m of line.matchAll(/(?:padding|margin|gap)\s*:\s*([^;]+)/g)) {
        for (const px of m[1].matchAll(/(?<![\w-])(\d+)px/g)) {
          const value = Number(px[1]);
          if (!SPACING.has(value)) add(file, n, "A4", `off-grid spacing ${value}px`);
        }
      }
    }

    // A6 — outline removed without a focus compensation in the file
    if (isCode && /outline-none|outline:\s*none/.test(line)) {
      const compensated = /shadow-focus|focus-shadow|focus-visible/.test(text);
      if (!compensated) add(file, n, "A6", "outline removed without a focus-visible shadow");
    }
  });

  // A7 — icon-only buttons must carry an accessible name
  if (isCode) {
    lines.forEach((line, i) => {
      const n = i + 1;
      if (/<Button[^>]*\biconOnly\b/.test(line) && !/aria-label/.test(line)) {
        add(file, n, "A7", "iconOnly button needs aria-label");
      }
      if (/<button[^>]*>\s*(?:<Icon|<svg)/.test(line) && !/aria-label|title=/.test(line)) {
        add(file, n, "A7", "icon-only button needs aria-label");
      }
    });
  }
}

for (const target of TARGETS) await walk(path.join(ROOT, target));

if (problems.length) {
  for (const p of problems) console.error(`✗ ${p.file}:${p.line} [${p.rule}] ${p.message}`);
  console.error(`\n${problems.length} UI-spec violation(s). See ui-spec/SELF-CHECK.md.`);
  process.exit(1);
}
console.log("✓ UI spec checks passed.");
