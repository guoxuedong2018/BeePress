const { app, BrowserWindow, dialog } = require("electron");
const { spawn } = require("node:child_process");
const path = require("node:path");

const PROFILE = process.env.BEEPRESS_DSH_PROFILE || "web";
const DSH = process.env.BEEPRESS_DSH_BIN || "dsh";
let child;
let window;

function startHarness() {
  child = spawn(DSH, ["--profile", PROFILE, "--no-open", "--port", "0"], {
    cwd: path.resolve(__dirname, "../.."),
    env: { ...process.env, BEEPRESS_KIT_ROOT: path.resolve(__dirname, "../..") },
    stdio: ["ignore", "pipe", "pipe"],
  });

  return new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => reject(new Error(`DeepSeek Harness 没有在 30 秒内启动：\n${output}`)), 30_000);
    const onData = (chunk) => {
      output += chunk.toString();
      const match = output.match(/https?:\/\/[^\s]+/);
      if (!match) return;
      clearTimeout(timer);
      resolve(match[0]);
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("exit", (code) => {
      if (code && !output.match(/https?:\/\//)) {
        clearTimeout(timer);
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
