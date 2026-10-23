import fs from "node:fs/promises";
import path from "node:path";

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  ".nuxt",
  ".output",
  "dist",
  "build",
  "coverage",
  "docs",
  ".builderharness",
  ".pnpm-store",
  ".venv",
  "__pycache__",
]);

const NAMED_CANDIDATES = [
  "web",
  "app",
  "apps/web",
  "apps/app",
  "packages/web",
  "packages/app",
  "client",
  "frontend",
  "site",
  "ui",
  "prototype",
];

const PACKAGE_MANAGERS = [
  ["pnpm-lock.yaml", "pnpm"],
  ["yarn.lock", "yarn"],
  ["bun.lockb", "bun"],
  ["bun.lock", "bun"],
  ["package-lock.json", "npm"],
];

async function isDir(target) {
  try {
    return (await fs.stat(target)).isDirectory();
  } catch {
    return false;
  }
}

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return null;
  }
}

async function detectPackageManager(dir, root) {
  for (const base of [dir, root]) {
    for (const [file, manager] of PACKAGE_MANAGERS) {
      if (await fs.access(path.join(base, file)).then(() => true, () => false)) return manager;
    }
  }
  return "npm";
}

/**
 * Finds the runnable web app inside a workspace. Product repos rarely put the
 * dev server at the repository root (`web/`, `apps/app`, ...), so scanning for a
 * real `dev` script keeps the cockpit usable on imported projects.
 */
export async function detectPrototype(inputRoot) {
  const root = path.resolve(inputRoot);
  const inspected = [];
  const usable = [];

  const consider = async (dir, depth) => {
    const manifest = await readJson(path.join(dir, "package.json"));
    if (!manifest) return;
    const devScript = typeof manifest.scripts?.dev === "string" ? manifest.scripts.dev : null;
    inspected.push({ dir, hasPackageJson: true, devScript });
    if (!devScript) return;
    const dependencies = Object.keys({
      ...manifest.dependencies,
      ...manifest.devDependencies,
      ...manifest.optionalDependencies,
    }).length;
    usable.push({ dir, devScript, depth, name: manifest.name || "", dependencies });
  };

  await consider(root, 0);

  for (const candidate of NAMED_CANDIDATES) {
    const dir = path.join(root, candidate);
    if (await isDir(dir)) await consider(dir, candidate.split("/").length);
  }

  if (!usable.some((entry) => entry.dir !== root)) {
    const walkable = async (dir) =>
      (await fs.readdir(dir, { withFileTypes: true }).catch(() => [])).filter(
        (entry) => entry.isDirectory() && !SKIP_DIRS.has(entry.name) && !entry.name.startsWith("."),
      );
    for (const entry of await walkable(root)) {
      const dir = path.join(root, entry.name);
      await consider(dir, 1);
      for (const child of await walkable(dir)) await consider(path.join(dir, child.name), 2);
    }
  }

  const named = NAMED_CANDIDATES.map((candidate) => path.join(root, candidate));
  const pick =
    usable.sort((a, b) => {
      const namedA = named.indexOf(a.dir);
      const namedB = named.indexOf(b.dir);
      if (a.dir === root) return -1;
      if (b.dir === root) return 1;
      if (namedA !== -1 || namedB !== -1) return (namedA === -1 ? 999 : namedA) - (namedB === -1 ? 999 : namedB);
      return a.depth - b.depth;
    })[0] || null;

  if (!pick) {
    const manifestDirs = inspected.filter((entry) => entry.hasPackageJson);
    const manifestDir = manifestDirs.find((entry) => entry.dir === root) || manifestDirs[0] || null;
    return {
      root,
      found: false,
      dir: null,
      absoluteDir: null,
      manifestDir: manifestDir ? manifestDir.dir : null,
      devScript: null,
      packageManager: await detectPackageManager(root, root),
      installed: false,
      scanned: inspected.map((entry) => path.relative(root, entry.dir) || "."),
      reason:
        manifestDirs.length === 0
          ? "工作区没有 package.json。BuilderHarness 需要一个带 dev 脚本的前端应用。"
          : `找到 ${manifestDirs.length} 个 package.json，但都没有 dev 脚本：${manifestDirs
              .map((entry) => path.relative(root, entry.dir) || ".")
              .join("、")}`,
    };
  }

  const packageManager = await detectPackageManager(pick.dir, root);
  const hasNodeModules =
    (await isDir(path.join(pick.dir, "node_modules"))) || (pick.dir !== root && (await isDir(path.join(root, "node_modules"))));
  // A zero-dependency app runs without node_modules; requiring the folder would
  // block projects that never needed an install in the first place.
  const installed = hasNodeModules || pick.dependencies === 0;

  return {
    root,
    found: true,
    dir: path.relative(root, pick.dir) || ".",
    absoluteDir: pick.dir,
    manifestDir: pick.dir,
    devScript: pick.devScript,
    packageManager,
    installed,
    scanned: inspected.map((entry) => path.relative(root, entry.dir) || "."),
    reason: installed ? null : `依赖未安装：先在 ${path.relative(root, pick.dir) || "."} 运行 ${packageManager} install。`,
  };
}

export function devCommand(packageManager, script = "dev") {
  switch (packageManager) {
    case "pnpm":
      return { command: "pnpm", args: ["run", script] };
    case "yarn":
      return { command: "yarn", args: [script] };
    case "bun":
      return { command: "bun", args: ["run", script] };
    default:
      return { command: process.platform === "win32" ? "npm.cmd" : "npm", args: ["run", script] };
  }
}

export function installCommand(packageManager) {
  switch (packageManager) {
    case "pnpm":
      return { command: "pnpm", args: ["install"] };
    case "yarn":
      return { command: "yarn", args: ["install"] };
    case "bun":
      return { command: "bun", args: ["install"] };
    default:
      return { command: process.platform === "win32" ? "npm.cmd" : "npm", args: ["install"] };
  }
}


const STACK_LABELS = {
  "react-tailwind": "React + Tailwind",
  react: "React",
  vue2: "Vue 2.7",
  existing: "沿用项目现状",
};

function majorOf(range) {
  const match = String(range || "").match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

/**
 * Infers the production stack from the real app directory so the first-run
 * guide can offer one click instead of a blank select box.
 */
export async function detectStack(inputRoot) {
  const root = path.resolve(inputRoot);
  const detection = await detectPrototype(root);
  const dir = detection.absoluteDir || detection.manifestDir;
  if (!dir) return { appDir: null, stack: null, label: null, evidence: [], reason: detection.reason };

  const manifest = (await readJson(path.join(dir, "package.json"))) || {};
  const dependencies = { ...manifest.dependencies, ...manifest.devDependencies };
  const has = (name) => Boolean(dependencies[name]);
  const rel = path.relative(root, dir) || ".";
  const evidence = [`${rel}/package.json`];

  const react = has("react");
  const vueRange = dependencies.vue || dependencies["vue-template-compiler"];
  const vueMajor = majorOf(vueRange);
  const vue2 = Boolean(vueRange) && (vueMajor === null || vueMajor < 3);

  let tailwind = has("tailwindcss");
  for (const name of ["tailwind.config.js", "tailwind.config.cjs", "tailwind.config.mjs", "tailwind.config.ts"]) {
    if (await fs.access(path.join(dir, name)).then(() => true, () => false)) {
      tailwind = true;
      evidence.push(`${rel}/${name}`);
    }
  }

  let typescript = has("typescript");
  if (await fs.access(path.join(dir, "tsconfig.json")).then(() => true, () => false)) {
    typescript = true;
    evidence.push(`${rel}/tsconfig.json`);
  }

  const bundler = has("next") ? "next" : has("nuxt") ? "nuxt" : has("vite") ? "vite" : null;
  if (bundler) evidence.push(`${rel}/package.json#${bundler}`);

  const stack = vue2 ? "vue2" : react ? (tailwind ? "react-tailwind" : "react") : "existing";
  return {
    appDir: rel,
    stack,
    label: STACK_LABELS[stack],
    framework: vue2 ? "vue2" : react ? "react" : has("vue") ? "vue3" : null,
    tailwind,
    typescript,
    bundler,
    evidence,
  };
}
