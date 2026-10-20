import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);

let cachedKitRoot;

/**
 * Locate the installed beepress package. The dsh bundle can run next to a
 * workspace install, from the repository, or from a global profile.
 */
export async function resolveKitRoot(rootHint) {
  if (cachedKitRoot) return cachedKitRoot;
  const hint = rootHint ? path.resolve(rootHint) : null;
  const candidates = [
    process.env.BEEPRESS_KIT_ROOT,
    process.env.BUILDER_KIT_KIT_ROOT,
    hint,
    hint ? path.join(hint, "node_modules", "beepress") : null,
    process.cwd(),
    path.join(process.cwd(), "node_modules", "beepress"),
    (() => {
      try {
        return path.dirname(require.resolve("beepress/package.json"));
      } catch {
        return null;
      }
    })(),
    path.resolve(fileURLToPath(new URL("../../..", import.meta.url))),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const root = path.resolve(candidate);
    try {
      await fs.access(path.join(root, "bin", "beepress.mjs"));
      cachedKitRoot = root;
      return root;
    } catch {
      // Try the next candidate.
    }
  }
  throw new Error(
    "找不到 beepress CLI。请在工作区安装 beepress，或设置 BEEPRESS_KIT_ROOT 指向 Bee Press 包目录。",
  );
}

/** Run a Bee Press pipeline command against a session workspace. */
export async function runKit(root, args, { timeout = 120_000 } = {}) {
  const cwd = path.resolve(root || process.env.BEEPRESS_ROOT || process.cwd());
  const kitRoot = await resolveKitRoot(cwd);
  const bin = path.join(kitRoot, "bin", "beepress.mjs");
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [bin, ...args], {
      cwd,
      env: {
        ...process.env,
        BEEPRESS_ROOT: cwd,
        BEEPRESS_KIT_ROOT: kitRoot,
      },
      maxBuffer: 20 * 1024 * 1024,
      timeout,
    });
    return { stdout, stderr, kitRoot, root: cwd };
  } catch (error) {
    const detail = [error.stderr, error.stdout].filter(Boolean).join("\n").trim();
    throw new Error(`beepress ${args.join(" ")} 失败：${detail || error.message}`);
  }
}

export function resetKitRootCache() {
  cachedKitRoot = undefined;
}
