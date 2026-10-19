import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

import { readContext, readOpenReviews, readStatus } from "./host/src/project.mjs";
import { apply as applyDshPlugin } from "./host/src/dsh.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const mcpServer = path.join(here, "host", "src", "mcp.mjs");

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "beepress-spike-"));
  await fs.mkdir(path.join(root, "docs", "kb", "guides"), { recursive: true });
  await fs.mkdir(path.join(root, "docs", "kb", "concepts"), { recursive: true });
  await fs.mkdir(path.join(root, "docs", "reviews"), { recursive: true });
  await fs.mkdir(path.join(root, "docs", "features", "OVERVIEW"), { recursive: true });
  await fs.writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ scripts: { dev: "vite" }, dependencies: { "builder-kit": "^0.4.0" } }, null, 2),
  );
  await fs.writeFile(path.join(root, "docs", "kb", "guides", "import.md"), "# Import guide\n\nImport a CSV file.\n");
  await fs.writeFile(
    path.join(root, "docs", "kb", "concepts", "overview.md"),
    "---\ntitle: Workspace overview\n---\n\nThe workspace combines review and content.\n",
  );
  await fs.writeFile(path.join(root, "docs", "features", "OVERVIEW", "FRS.json"), JSON.stringify({ key: "OVERVIEW" }));
  await fs.writeFile(
    path.join(root, "docs", "reviews", "OVERVIEW.json"),
    JSON.stringify([
      {
        id: "c1",
        frs: "OVERVIEW",
        route: "/overview",
        author: "Ada",
        body: "Keep the score column right-aligned.",
        status: "open",
        createdAt: "2026-10-19T10:00:00.000Z",
        replies: [],
        anchor: { loc: "src/App.jsx:42:3" },
      },
      {
        id: "c2",
        frs: "OVERVIEW",
        route: "/overview",
        author: "Milo",
        body: "Resolved.",
        status: "resolved",
        createdAt: "2026-10-19T09:00:00.000Z",
        replies: [],
      },
    ]),
  );
  return root;
}

async function testManifest() {
  const hostDir = path.join(here, "host");
  const pkg = JSON.parse(await fs.readFile(path.join(hostDir, "package.json"), "utf8"));
  assert.equal(pkg.dsh.bundle.patch, "./cordis.patch.yml");
  assert.equal(pkg.bin["beepress-mcp"], "./src/mcp.mjs");
  assert.equal(pkg.exports["./mcp"], "./src/mcp.mjs");
  const patch = await fs.readFile(path.join(hostDir, pkg.dsh.bundle.patch), "utf8");
  assert.match(patch, /@beepress\/dsh-bundle/);
}

async function testCore(root) {
  const status = await readStatus(root);
  assert.equal(status.docs.kb.files, 2);
  assert.equal(status.docs.reviews.open, 1);
  assert.equal(status.docs.reviews.comments, 2);
  assert.equal(status.docs.features.specs, 1);
  assert.equal(status.prototype.devScript, "vite");

  const context = await readContext(root, { topic: "import", limit: 5 });
  assert.equal(context.files.length, 1);
  assert.equal(context.files[0].file, "guides/import.md");
  assert.equal(context.files[0].title, "Import guide");

  const reviews = await readOpenReviews(root);
  assert.equal(reviews.comments.length, 1);
  assert.equal(reviews.comments[0].id, "c1");
  assert.equal(reviews.comments[0].anchor.loc, "src/App.jsx:42:3");
}

async function testDshPlugin(root) {
  const tools = [];
  let ensured = 0;
  applyDshPlugin(
    {
      tools: { register: (tool) => tools.push(tool) },
      workingDirectory: {
        ensure: async () => {
          ensured += 1;
          return root;
        },
      },
    },
    {},
  );
  assert.deepEqual(
    tools.map((tool) => tool.name).sort(),
    ["beepress_context", "beepress_review_open", "beepress_status"],
  );

  const statusTool = tools.find((tool) => tool.name === "beepress_status");
  const value = await statusTool.execute({}, { agent: {}, signal: new AbortController().signal });
  const status = JSON.parse(value);
  assert.equal(status.root, root);
  assert.equal(status.docs.reviews.open, 1);
  assert.equal(ensured, 1);
  assert.equal(statusTool.output.schema.type, "string");
  assert.equal(statusTool.parameters.additionalProperties, false);
}

function startMcp(root) {
  const child = spawn(process.execPath, [mcpServer], {
    env: { ...process.env, BEEPRESS_ROOT: root },
    stdio: ["pipe", "pipe", "inherit"],
  });
  const pending = new Map();
  let nextId = 1;
  const rl = createInterface({ input: child.stdout, crlfDelay: Infinity });
  rl.on("line", (line) => {
    const message = JSON.parse(line);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  });
  const request = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
    });
  return { child, request, rl };
}

async function testMcp(root) {
  const { child, request, rl } = startMcp(root);
  const initialized = await request("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "spike-test", version: "0.0.0" },
  });
  assert.equal(initialized.serverInfo.name, "bee-press-mcp");
  child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`);

  const list = await request("tools/list");
  assert.deepEqual(
    list.tools.map((tool) => tool.name).sort(),
    ["beepress_context", "beepress_review_open", "beepress_status"],
  );

  const called = await request("tools/call", {
    name: "beepress_review_open",
    arguments: {},
  });
  assert.equal(called.isError, undefined);
  const reviews = JSON.parse(called.content[0].text);
  assert.equal(reviews.comments.length, 1);
  assert.equal(reviews.comments[0].id, "c1");

  const context = await request("tools/call", {
    name: "beepress_context",
    arguments: { topic: "import", limit: 5 },
  });
  const contextValue = JSON.parse(context.content[0].text);
  assert.equal(contextValue.files.length, 1);
  assert.equal(contextValue.files[0].file, "guides/import.md");

  child.stdin.end();
  rl.close();
  await new Promise((resolve) => child.once("exit", resolve));
}

const root = await fixture();
try {
  await testManifest();
  await testCore(root);
  await testDshPlugin(root);
  await testMcp(root);
  console.log("✓ integration spike checks passed");
} finally {
  await fs.rm(root, { recursive: true, force: true });
}
