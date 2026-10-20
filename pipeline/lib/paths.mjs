import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Path resolution — the single source of truth
 * ==================================================================
 * The toolkit runs inside a *host project* that owns the prototype, the
 * docs and the content recipes. The toolkit itself may live in
 * `node_modules/beepress`, as a sibling directory, or anywhere else,
 * so it must never derive the project root from its own location.
 *
 * Project root is resolved, in order:
 *
 *   1. `BEEPRESS_ROOT` / `BUILDER_KIT_ROOT` (absolute or relative to cwd)
 *   2. the nearest ancestor of cwd that contains `docs/`
 *      or a `beepress.config.*` file
 *   3. `process.cwd()`
 *
 * Optional overrides:
 *
 *   BEEPRESS_DOCS_DIR / BUILDER_KIT_DOCS_DIR
 *                         docs directory, relative to the project root
 *                         (default: `docs`)
 *   BEEPRESS_WEB_DIR / BUILDER_KIT_WEB_DIR
 *                         prototype app directory, relative to the project
 *                         root (default: `web` when it exists, otherwise the
 *                         project root itself)
 */

export const KIT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function isDir(p) {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function isHostRoot(dir) {
  const cfg = [
    "beepress.config.mjs", "beepress.config.js", "beepress.config.json",
    "builder-kit.config.mjs", "builder-kit.config.js", "builder-kit.config.json",
  ].some((f) => existsSync(path.join(dir, f)));
  if (cfg || isDir(path.join(dir, "docs"))) return true;

  const pkgFile = path.join(dir, "package.json");
  if (!existsSync(pkgFile)) return false;
  try {
    const pkg = JSON.parse(readFileSync(pkgFile, "utf8"));
    return (
      pkg.name === "beepress" ||
      pkg.name === "builder-kit" ||
      Boolean(pkg.dependencies?.["beepress"]) ||
      Boolean(pkg.devDependencies?.["beepress"]) ||
      Boolean(pkg.dependencies?.["builder-kit"]) ||
      Boolean(pkg.devDependencies?.["builder-kit"])
    );
  } catch {
    return false;
  }
}

function detectProjectRoot() {
  const configuredRoot = process.env.BEEPRESS_ROOT || process.env.BUILDER_KIT_ROOT;
  if (configuredRoot) return path.resolve(configuredRoot);

  let dir = process.cwd();
  for (;;) {
    if (isHostRoot(dir)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

/** Host project root. `REPO_ROOT` is kept as a compatibility alias. */
export const REPO_ROOT = detectProjectRoot();
export const PROJECT_ROOT = REPO_ROOT;

/** Toolkit's own pipeline directory (templates and adapters ship with it). */
export const PIPELINE_DIR = path.join(KIT_ROOT, "pipeline");

export const DOCS_DIR = path.resolve(REPO_ROOT, process.env.BEEPRESS_DOCS_DIR || process.env.BUILDER_KIT_DOCS_DIR || "docs");
export const FEATURES_DIR = path.join(DOCS_DIR, "features");
export const KB_DIR = path.join(DOCS_DIR, "kb");
export const PRD_DIR = path.join(DOCS_DIR, "prd");
export const REVIEWS_DIR = path.join(DOCS_DIR, "reviews");

/** Prototype application directory. It does not have to be called `web`. */
export const WEB_DIR = (process.env.BEEPRESS_WEB_DIR || process.env.BUILDER_KIT_WEB_DIR)
  ? path.resolve(REPO_ROOT, process.env.BEEPRESS_WEB_DIR || process.env.BUILDER_KIT_WEB_DIR)
  : isDir(path.join(REPO_ROOT, "web"))
    ? path.join(REPO_ROOT, "web")
    : REPO_ROOT;
