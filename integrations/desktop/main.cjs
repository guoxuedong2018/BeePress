const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const { execFile, spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);

const KIT_ROOT = process.env.BEEPRESS_KIT_ROOT || (app?.isPackaged
  ? path.join(process.resourcesPath, "beepress")
  : path.resolve(__dirname, "../.."));
const PROFILE = process.env.BEEPRESS_DSH_PROFILE || "web";
const CONFIG_FILE = () => path.join(app.getPath("userData"), "desktop.json");
const ONBOARDING = path.join(__dirname, "onboarding.html");

let child;
let window;
let prototypeChild;
let prototypeRoot;
let prototypeUrl;

app.setName("Bee Press");
try {
  app.setPath("userData", path.join(app.getPath("appData"), "Bee Press"));
} catch {
  // Keep Electron's default when appData is unavailable.
}

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE(), "utf8"));
  } catch {
    return { recent: [] };
  }
}

function writeConfig(config) {
  fs.mkdirSync(path.dirname(CONFIG_FILE()), { recursive: true });
  fs.writeFileSync(CONFIG_FILE(), `${JSON.stringify(config, null, 2)}\n`);
}

function rememberProject(root) {
  const config = readConfig();
  const entry = {
    root,
    name: path.basename(root),
    lastUsed: new Date().toISOString(),
  };
  config.recent = [entry, ...(config.recent || []).filter((item) => item.root !== root)].slice(0, 8);
  config.lastProject = root;
  writeConfig(config);
  return config.recent;
}

async function isProject(root) {
  const checks = ["package.json", "docs", "beepress.config.mjs", "beepress.config.js", "beepress.config.json"];
  for (const name of checks) {
    try {
      await fs.promises.access(path.join(root, name));
      return true;
    } catch {
      // Try the next marker.
    }
  }
  return false;
}

function resolveDsh() {
  const candidates = [
    process.env.BEEPRESS_DSH_BIN,
    path.join(os.homedir(), ".npm-global", "bin", "dsh"),
    "/opt/homebrew/bin/dsh",
    "/usr/local/bin/dsh",
    "dsh",
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (!candidate.includes(path.sep)) return candidate;
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch {
      // Try the next candidate.
    }
  }
  return "dsh";
}

function stopHarness() {
  if (child && !child.killed) child.kill("SIGTERM");
  child = undefined;
}

function projectSettingsFile(root) {
  return path.join(root, ".beepress", "desktop.json");
}

function readProjectSettings(root) {
  try {
    return JSON.parse(fs.readFileSync(projectSettingsFile(root), "utf8"));
  } catch {
    return {};
  }
}

function writeProjectSettings(root, patch) {
  const current = readProjectSettings(root);
  const next = { ...current, ...patch };
  fs.mkdirSync(path.dirname(projectSettingsFile(root)), { recursive: true });
  fs.writeFileSync(projectSettingsFile(root), `${JSON.stringify(next, null, 2)}\n`);
  return next;
}

function kitEnv(root) {
  const settings = readProjectSettings(root);
  return {
    ...process.env,
    ELECTRON_RUN_AS_NODE: "1",
    BEEPRESS_ROOT: root,
    BEEPRESS_KIT_ROOT: KIT_ROOT,
    ...(settings.publishGateway ? { BEEPRESS_PUBLISH_GATEWAY: settings.publishGateway } : {}),
  };
}

async function runKit(root, args, timeout = 120_000) {
  const bin = path.join(KIT_ROOT, "bin", "beepress.mjs");
  try {
    const result = await execFileAsync(process.execPath, [bin, ...args], {
      cwd: root,
      env: kitEnv(root),
      maxBuffer: 30 * 1024 * 1024,
      timeout,
    });
    return { ok: true, output: `${result.stdout}${result.stderr}`.trim() };
  } catch (error) {
    return {
      ok: false,
      output: [error.stdout, error.stderr].filter(Boolean).join("\n").trim() || error.message,
    };
  }
}

function resolveNpm() {
  const candidates = [
    process.env.BEEPRESS_NPM,
    path.join(os.homedir(), ".npm-global", "bin", "npm"),
    "/opt/homebrew/bin/npm",
    "/usr/local/bin/npm",
    "npm",
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (!candidate.includes(path.sep)) return candidate;
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch {
      // Try the next candidate.
    }
  }
  return "npm";
}

function stopPrototype() {
  if (prototypeChild && !prototypeChild.killed) prototypeChild.kill("SIGTERM");
  prototypeChild = undefined;
  prototypeRoot = undefined;
  prototypeUrl = undefined;
}

function startPrototype(root) {
  const project = path.resolve(root);
  if (prototypeChild && prototypeRoot === project && prototypeUrl && !prototypeChild.killed) {
    return Promise.resolve({ url: prototypeUrl, reused: true });
  }
  stopPrototype();
  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(path.join(project, "package.json"), "utf8"));
  } catch {
    throw new Error("项目没有 package.json，无法启动原型。");
  }
  if (!pkg.scripts?.dev) throw new Error("package.json 没有 scripts.dev；先接入原型 dev server。");
  prototypeRoot = project;
  prototypeChild = spawn(resolveNpm(), ["run", "dev"], {
    cwd: project,
    env: { ...kitEnv(project), BROWSER: "none" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  return new Promise((resolve, reject) => {
    let output = "";
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      stopPrototype();
      reject(new Error(`原型没有在 25 秒内启动：\n${output}`));
    }, 25_000);
    const onData = (chunk) => {
      output += chunk.toString();
      const match = output.match(/https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?\/?/);
      if (!match || settled) return;
      settled = true;
      clearTimeout(timer);
      prototypeUrl = match[0];
      resolve({ url: prototypeUrl, reused: false });
    };
    prototypeChild.stdout.on("data", onData);
    prototypeChild.stderr.on("data", onData);
    prototypeChild.once("error", (error) => {
      clearTimeout(timer);
      if (!settled) {
        settled = true;
        reject(error);
      }
    });
    prototypeChild.once("exit", (code) => {
      if (!settled && code) {
        clearTimeout(timer);
        settled = true;
        reject(new Error(`原型 dev server 退出（${code}）：\n${output}`));
      }
      prototypeChild = undefined;
      prototypeUrl = undefined;
    });
  });
}

function featureStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function featureSlug(title) {
  const ascii = String(title || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return ascii || "FEATURE";
}

async function copyDirectory(from, to) {
  await fs.promises.mkdir(to, { recursive: true });
  for (const entry of await fs.promises.readdir(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) await copyDirectory(src, dst);
    else if (entry.isFile()) await fs.promises.copyFile(src, dst);
  }
}

async function createFeature(root, title) {
  const project = path.resolve(root);
  const safeTitle = String(title || "").trim();
  if (!safeTitle) throw new Error("先填功能名称。");
  const key = `${featureStamp()}_${featureSlug(safeTitle)}`;
  const featureDir = path.join(project, "docs", "features", key);
  try {
    await fs.promises.access(featureDir);
    throw new Error(`需求件套已存在：${path.relative(project, featureDir)}`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const templates = fs.existsSync(path.join(project, "docs", "templates"))
    ? path.join(project, "docs", "templates")
    : path.join(KIT_ROOT, "docs", "templates");
  if (!fs.existsSync(templates)) throw new Error("找不到 FRS 模板；先运行 npx beepress init。");
  await copyDirectory(templates, featureDir);
  const replace = async (name) => {
    const file = path.join(featureDir, name);
    const text = await fs.promises.readFile(file, "utf8");
    await fs.promises.writeFile(
      file,
      text
        .replaceAll("<功能名称>", safeTitle)
        .replaceAll("<ID>_MODULE_NAME", key)
        .replaceAll("MMDDHHMM_MODULE_NAME", key)
        .replaceAll("YYYY-MM-DD", new Date().toISOString().slice(0, 10)),
    );
  };
  for (const name of ["README.md", "FLOW.md", "STATE.md", "ACCEPTANCE.md"]) await replace(name);
  const frsFile = path.join(featureDir, "FRS.json");
  const frs = JSON.parse(await fs.promises.readFile(frsFile, "utf8"));
  frs.key = key;
  frs.title = safeTitle;
  frs.createdAt = new Date().toISOString().slice(0, 10);
  frs.updatedAt = frs.createdAt;
  await fs.promises.writeFile(frsFile, `${JSON.stringify(frs, null, 2)}\n`);
  return {
    key,
    path: featureDir,
    relativePath: path.relative(project, featureDir),
    checkCommand: `npx beepress check-frs ${key}`,
  };
}

function startHarness(projectRoot) {
  stopHarness();
  const dsh = resolveDsh();
  console.log(`[beepress-desktop] profile=${PROFILE} dsh=${dsh} project=${projectRoot}`);
  child = spawn(dsh, ["--profile", PROFILE, "--no-open", "--port", "0"], {
    cwd: projectRoot,
    env: { ...kitEnv(projectRoot) },
    stdio: ["ignore", "pipe", "pipe"],
  });

  return new Promise((resolve, reject) => {
    let output = "";
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      stopHarness();
      reject(new Error(`DeepSeek Harness 没有在 30 秒内启动：\n${output}`));
    }, 30_000);
    const onData = (chunk) => {
      output += chunk.toString();
      const match = output.match(/https?:\/\/[^\s]+/);
      if (!match || settled) return;
      settled = true;
      clearTimeout(timer);
      console.log(`[beepress-desktop] loading ${match[0]}`);
      resolve(match[0]);
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.once("error", (error) => {
      clearTimeout(timer);
      if (!settled) {
        settled = true;
        reject(error);
      }
    });
    child.once("exit", (code) => {
      if (code && !output.match(/https?:\/\//) && !settled) {
        clearTimeout(timer);
        settled = true;
        reject(new Error(`DeepSeek Harness 退出（${code}）：\n${output}`));
      }
    });
  });
}

async function loadHarness(projectRoot) {
  const root = path.resolve(projectRoot);
  if (!(await isProject(root))) {
    throw new Error("这个目录不像一个项目：需要 package.json、docs/ 或 beepress.config.*。");
  }
  const url = await startHarness(root);
  rememberProject(root);
  await window.loadURL(url);
  window.setTitle("Bee Press");
  try {
    await openProjectInUi(root);
  } catch (error) {
    console.warn(`[beepress-desktop] workspace selection failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function openProjectInUi(root) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const ready = await window.webContents
      .executeJavaScript("Boolean(window.__beepressDesktop?.openProject)")
      .catch(() => false);
    if (ready) {
      await window.webContents.executeJavaScript(
        `window.__beepressDesktop.openProject(${JSON.stringify(root)})`,
        true,
      );
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  console.warn("[beepress-desktop] Bee Press client helper did not load; open the workspace manually.");
}

async function walkFiles(dir, predicate) {
  const out = [];
  let entries;
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walkFiles(full, predicate)));
    else if (predicate(full, entry.name)) out.push(full);
  }
  return out;
}

async function inspectProject(root) {
  const project = path.resolve(root);
  if (!(await isProject(project))) {
    throw new Error("这个目录不像一个项目：需要 package.json、docs/ 或 beepress.config.*。");
  }
  const pkgFile = path.join(project, "package.json");
  let pkg = {};
  try {
    pkg = JSON.parse(await fs.promises.readFile(pkgFile, "utf8"));
  } catch {
    // A docs-only project is still inspectable.
  }
  const featureDir = path.join(project, "docs", "features");
  const features = [];
  try {
    for (const entry of await fs.promises.readdir(featureDir, { withFileTypes: true })) {
      if (entry.isDirectory() && fs.existsSync(path.join(featureDir, entry.name, "FRS.json"))) features.push(entry.name);
    }
  } catch {
    // No feature specs yet.
  }
  const kbFiles = await walkFiles(path.join(project, "docs", "kb"), (_full, name) => name.endsWith(".md"));
  const reviewFiles = await walkFiles(path.join(project, "docs", "reviews"), (_full, name) => name.endsWith(".json"));
  let openReviews = 0;
  for (const file of reviewFiles) {
    try {
      const parsed = JSON.parse(await fs.promises.readFile(file, "utf8"));
      const comments = Array.isArray(parsed) ? parsed : parsed.comments;
      if (Array.isArray(comments)) openReviews += comments.filter((comment) => comment?.status !== "resolved").length;
    } catch {
      // Ignore malformed local review files in the launcher.
    }
  }
  const settings = readProjectSettings(project);
  const gateway = settings.publishGateway || process.env.BEEPRESS_PUBLISH_GATEWAY || process.env.BUILDER_KIT_PUBLISH_GATEWAY || null;
  const docsCli = process.env.BEEPRESS_DOCS_CLI || process.env.BUILDER_KIT_DOCS_CLI || null;
  let publishedPages = 0;
  try {
    const published = JSON.parse(await fs.promises.readFile(path.join(project, "docs", "kb", "_published.json"), "utf8"));
    publishedPages = Object.keys(published.pages || {}).length;
  } catch {
    // Publishing has not run yet.
  }
  return {
    root: project,
    name: path.basename(project),
    devScript: pkg.scripts?.dev ?? null,
    features: features.sort(),
    kbPages: kbFiles.length,
    openReviews,
    publish: {
      configured: Boolean(gateway || docsCli),
      destination: gateway || (docsCli ? "docs-cli" : null),
      publishedPages,
    },
    templates: fs.existsSync(path.join(project, "docs", "templates")),
    workflow: fs.existsSync(path.join(project, "docs", "WORKFLOW.md")),
    skills: fs.existsSync(path.join(project, ".agent", "skills")),
  };
}

function createWindow() {
  window = new BrowserWindow({
    width: 1180,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: "Bee Press",
    icon: path.join(__dirname, "assets", "icon.png"),
    backgroundColor: "#f7f4ec",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
      sandbox: true,
    },
  });
  window.on("page-title-updated", (event) => {
    event.preventDefault();
    window.setTitle("Bee Press");
  });
  window.loadFile(ONBOARDING);
}

ipcMain.handle("beepress:recent", () => readConfig());
ipcMain.handle("beepress:choose-parent", async () => {
  const result = await dialog.showOpenDialog(window, {
    title: "选择项目所在目录",
    properties: ["openDirectory", "createDirectory"],
  });
  return result.canceled ? null : result.filePaths[0];
});
ipcMain.handle("beepress:inspect", (_event, root) => inspectProject(root));
ipcMain.handle("beepress:choose-existing", async () => {
  const result = await dialog.showOpenDialog(window, {
    title: "导入已有开发项目",
    properties: ["openDirectory"],
  });
  if (result.canceled) return null;
  const root = result.filePaths[0];
  if (!(await isProject(root))) throw new Error("这个目录不像一个项目：需要 package.json、docs/ 或 beepress.config.*。");
  return root;
});
ipcMain.handle("beepress:create-project", async (_event, { parent, name }) => {
  const safeName = String(name || "").trim();
  if (!safeName || /[\\/:*?"<>|]/.test(safeName) || safeName.startsWith(".")) {
    throw new Error("项目名不能为空，也不能包含 \\ / : * ? \" < > |，或从 . 开头。");
  }
  const root = path.join(parent, safeName);
  try {
    const entries = await fs.promises.readdir(root);
    if (entries.length) throw new Error(`目录已经存在且不为空：${root}`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  await fs.promises.mkdir(root, { recursive: true });
  const bin = path.join(KIT_ROOT, "bin", "beepress.mjs");
  const nodeEnv = { ...process.env, ELECTRON_RUN_AS_NODE: "1", BEEPRESS_KIT_ROOT: KIT_ROOT };
  await execFileAsync(process.execPath, [bin, "init", "--target", root], {
    cwd: root,
    env: nodeEnv,
    maxBuffer: 20 * 1024 * 1024,
  });
  await execFileAsync(process.execPath, [bin, "kb-scaffold"], {
    cwd: root,
    env: { ...nodeEnv, BEEPRESS_ROOT: root },
    maxBuffer: 20 * 1024 * 1024,
  }).catch(() => {
    // The outline is optional; project creation should still succeed.
  });
  const starter = path.join(KIT_ROOT, "scaffold", "starter");
  if (fs.existsSync(starter)) await copyDirectory(starter, root);
  let pkg = {};
  try {
    pkg = JSON.parse(await fs.promises.readFile(path.join(starter, "package.json"), "utf8"));
  } catch {
    pkg = { private: true, type: "module" };
  }
  pkg.name = safeName.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase() || "bee-press-project";
  pkg.dependencies = { ...(pkg.dependencies || {}), beepress: `file:${KIT_ROOT}` };
  await fs.promises.writeFile(path.join(root, "package.json"), `${JSON.stringify(pkg, null, 2)}\n`);
  return root;
});
ipcMain.handle("beepress:create-feature", (_event, { root, title }) => createFeature(root, title));
ipcMain.handle("beepress:check-frs", (_event, root) => runKit(root, ["check-frs"], 60_000));
ipcMain.handle("beepress:install-deps", async (_event, root) => {
  try {
    const result = await execFileAsync(resolveNpm(), ["install"], {
      cwd: root,
      env: { ...process.env, BROWSER: "none" },
      maxBuffer: 30 * 1024 * 1024,
      timeout: 10 * 60_000,
    });
    return { ok: true, output: `${result.stdout}${result.stderr}`.trim() };
  } catch (error) {
    return { ok: false, output: [error.stdout, error.stderr].filter(Boolean).join("\n").trim() || error.message };
  }
});
ipcMain.handle("beepress:start-prototype", async (_event, root) => {
  try {
    const started = await startPrototype(root);
    await shell.openExternal(started.url);
    return { ok: true, ...started };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
});
ipcMain.handle("beepress:open-review", async (_event, root) => {
  try {
    const started = await startPrototype(root);
    await shell.openExternal(started.url);
    return { ok: true, url: started.url };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
});
ipcMain.handle("beepress:review-status", async (_event, root) => runKit(root, ["review", "open"]));
ipcMain.handle("beepress:content-status", async (_event, root) => {
  const result = await runKit(root, ["kb", "status", "--json"]);
  if (!result.ok) return result;
  try {
    return { ok: true, data: JSON.parse(result.output) };
  } catch {
    return { ok: true, data: null, output: result.output };
  }
});
ipcMain.handle("beepress:capture-media", async (_event, root) => {
  try {
    const started = await startPrototype(root);
    const result = await runKit(root, ["capture-kb-shots", "--stale", "--base-url", started.url], 15 * 60_000);
    return { ...result, prototypeUrl: started.url };
  } catch (error) {
    return { ok: false, output: error instanceof Error ? error.message : String(error) };
  }
});
ipcMain.handle("beepress:record-clips", async (_event, root) => {
  try {
    const started = await startPrototype(root);
    const result = await runKit(root, ["record-kb-clips", "--base-url", started.url], 30 * 60_000);
    return { ...result, prototypeUrl: started.url };
  } catch (error) {
    return { ok: false, output: error instanceof Error ? error.message : String(error) };
  }
});
ipcMain.handle("beepress:publish-plan", async (_event, root) => runKit(root, ["kb-publish", "--dry-run"], 5 * 60_000));
ipcMain.handle("beepress:save-publish-gateway", async (_event, { root, gateway }) => {
  writeProjectSettings(root, { publishGateway: String(gateway || "").trim() || null });
  return inspectProject(root);
});
ipcMain.handle("beepress:open-path", async (_event, target) => {
  const error = await shell.openPath(target);
  if (error) throw new Error(error);
  return true;
});
ipcMain.handle("beepress:start", async (_event, root) => {
  try {
    await loadHarness(root);
    return { ok: true };
  } catch (error) {
    await dialog.showMessageBox(window, {
      type: "error",
      title: "Bee Press",
      message: "无法打开项目",
      detail: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
});
ipcMain.on("beepress:quit", () => app.quit());

app.whenReady().then(() => {
  if (process.platform === "darwin" && app.dock) {
    app.dock.setIcon(path.join(__dirname, "assets", "icon.png"));
  }
  createWindow();
});
app.on("window-all-closed", () => app.quit());
app.on("before-quit", () => {
  stopHarness();
  stopPrototype();
});
