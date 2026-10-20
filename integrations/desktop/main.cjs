const { app, BrowserWindow, dialog } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const PROFILE = process.env.BEEPRESS_DSH_PROFILE || "web";
let child;
let window;

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

function startHarness() {
  const dsh = resolveDsh();
  console.log(`[beepress-desktop] profile=${PROFILE} dsh=${dsh}`);
  child = spawn(dsh, ["--profile", PROFILE, "--no-open", "--port", "0"], {
    cwd: path.resolve(__dirname, "../.."),
    env: { ...process.env, BEEPRESS_KIT_ROOT: path.resolve(__dirname, "../..") },
    stdio: ["ignore", "pipe", "pipe"],
  });

  return new Promise((resolve, reject) => {
    let output = "";
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      if (child && !child.killed) child.kill("SIGTERM");
      reject(new Error(`DeepSeek Harness 没有在 30 秒内启动：\n${output}`));
    }, 30_000);
    const onData = (chunk) => {
      output += chunk.toString();
      const match = output.match(/https?:\/\/[^\s]+/);
      if (!match) return;
      clearTimeout(timer);
      if (settled) return;
      settled = true;
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

async function createWindow() {
  window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 960,
    minHeight: 640,
    title: "Bee Press",
    backgroundColor: "#ffffff",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  try {
    const url = await startHarness();
    await window.loadURL(url);
  } catch (error) {
    await dialog.showMessageBox({
      type: "error",
      title: "Bee Press",
      message: "无法启动 DeepSeek Harness",
      detail: error instanceof Error ? error.message : String(error),
    });
    app.quit();
  }
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
app.on("before-quit", () => {
  if (child && !child.killed) child.kill("SIGTERM");
});
