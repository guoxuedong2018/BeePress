import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { readEnv } from "./env.mjs";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);

let cachedKitRoot;

/**
 * Locate the installed builderharness package. The dsh bundle can run next to
 * a workspace install, from the repository, or from a global profile.
 */
export async function resolveKitRoot(rootHint) {
  if (cachedKitRoot) return cachedKitRoot;
  const hint = rootHint ? path.resolve(rootHint) : null;
  const candidates = [
    readEnv("KIT_ROOT"),
    hint,
    hint ? path.join(hint, "node_modules", "builderharness") : null,
    process.cwd(),
    path.join(process.cwd(), "node_modules", "builderharness"),
    (() => {
      try {
        return path.dirname(require.resolve("builderharness/package.json"));
      } catch {
        return null;
      }
    })(),
    path.resolve(fileURLToPath(new URL("../../..", import.meta.url))),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const root = path.resolve(candidate);
    try {
      await fs.access(path.join(root, "bin", "builderharness.mjs"));
      cachedKitRoot = root;
      return root;
    } catch {
      // Try the next candidate.
    }
  }
  throw new Error(
    "找不到 builderharness CLI。请在工作区安装 builderharness，或设置 BUILDERHARNESS_KIT_ROOT 指向包目录。",
  );
}

/** Run a BuilderHarness pipeline command against a session workspace. */
export async function runKit(root, args, { timeout = 120_000 } = {}) {
  const cwd = path.resolve(root || readEnv("ROOT") || process.cwd());
  const kitRoot = await resolveKitRoot(cwd);
  const bin = path.join(kitRoot, "bin", "builderharness.mjs");
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [bin, ...args], {
      cwd,
      env: {
        ...process.env,
        BUILDERHARNESS_ROOT: cwd,
        BUILDERHARNESS_KIT_ROOT: kitRoot,
      },
      maxBuffer: 20 * 1024 * 1024,
      timeout,
    });
    return { stdout, stderr, kitRoot, root: cwd };
  } catch (error) {
    const detail = [error.stderr, error.stdout].filter(Boolean).join("\n").trim();
    throw new Error(`builderharness ${args.join(" ")} 失败：${detail || error.message}`);
  }
}

export function resetKitRootCache() {
  cachedKitRoot = undefined;
}
