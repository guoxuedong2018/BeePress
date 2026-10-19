#!/usr/bin/env node
/**
 * Isolated end-to-end test for a "deploy prototype" skill.
 *
 * The skill under test is copied into a throwaway project with:
 *   - a fake auth CLI (login / no-login), named from the skill source
 *   - a fake `npx` that stands in for the hosting CLI
 *   - a fake `fetch` that stands in for the deployed site
 *   - a tiny `web/` project whose build can emit clean or leaking output
 *
 * Nothing touches the real hosting platform, the real registry, the user's
 * home directory, or the network.
 *
 * Usage:
 *   DEPLOY_SKILL=/path/to/deploy.mjs node scripts/test-deploy-skill-e2e.mjs
 *
 * If DEPLOY_SKILL is not set, the script looks for the Harness skill next to
 * this repository (../proto-toolkit/.agent/skills/deploy-prototype/deploy.mjs).
 * If it cannot find one, it exits 2 with instructions.
 */
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILL = process.env.DEPLOY_SKILL
  ? path.resolve(process.env.DEPLOY_SKILL)
  : path.resolve(ROOT, "../proto-toolkit/.agent/skills/deploy-prototype/deploy.mjs");

try {
  await fs.access(SKILL);
} catch {
  console.error(
    `Cannot find the deploy skill at ${SKILL}.\n` +
      "Set DEPLOY_SKILL=/path/to/deploy.mjs and run again.",
  );
  process.exit(2);
}

const TMP = await fs.mkdtemp(path.join(os.tmpdir(), "bk-deploy-e2e-"));
const APP = path.join(TMP, "app");
const BIN = path.join(APP, "bin");
const HOME = path.join(APP, "home");
const WEB = path.join(APP, "web");
const BINDING = path.join(WEB, ".static-site-deploy.json");
const DEPLOY_LOG = path.join(APP, "deploy.log");

await fs.mkdir(path.join(APP, "builder-kit/pipeline/lib"), { recursive: true });
await fs.mkdir(path.join(APP, ".agent/skills/deploy-prototype"), { recursive: true });
await fs.mkdir(path.join(APP, "docs/kb"), { recursive: true });
await fs.mkdir(path.join(APP, "docs/reviews"), { recursive: true });
await fs.mkdir(path.join(WEB, "src/mock/real-cases"), { recursive: true });
await fs.mkdir(path.join(WEB, "src/mock/real-tags"), { recursive: true });
await fs.mkdir(BIN, { recursive: true });
await fs.mkdir(path.join(HOME, ".npm-global/bin"), { recursive: true });

await fs.copyFile(path.join(ROOT, "pipeline/lib/paths.mjs"), path.join(APP, "builder-kit/pipeline/lib/paths.mjs"));
await fs.copyFile(SKILL, path.join(APP, ".agent/skills/deploy-prototype/deploy.mjs"));

const skillSource = await fs.readFile(SKILL, "utf8");
// CLI names and the host marker are details of the skill under test. Derive them
// so this harness does not need to embed any private tooling name.
const AUTH_CLI = skillSource.match(/run\("([^"]+)",\s*\["whoami"\]\)/)?.[1] ?? "deploy-auth";
const HOST_MARKER = skillSource.match(/match\(\/https:[^\n]*?\+([a-z0-9-]+)\[/i)?.[1] ?? "hosting";
const DOMAIN = `fixture-project.${HOST_MARKER}.example`;
const OTHER_DOMAIN = `other-project.${HOST_MARKER}.example`;

await fs.writeFile(
  path.join(WEB, "package.json"),
  JSON.stringify({ name: "deploy-e2e-fixture", private: true, type: "module", scripts: { build: "node build.mjs" } }, null, 2),
);
await fs.writeFile(
  path.join(WEB, "build.mjs"),
  `import { mkdir, rm, writeFile } from "node:fs/promises";
await rm("dist", { recursive: true, force: true });
await mkdir("dist/assets", { recursive: true });
await writeFile("dist/index.html", '<script src="/assets/index-test123.js"></script>');
const leak = process.env.E2E_LEAK === "1";
await writeFile(
  "dist/assets/index-test123.js",
  leak ? 'const a="/__proto_review"; const b="data-loc";' : 'console.log("clean build");',
);
`,
);
await fs.writeFile(
  path.join(BIN, AUTH_CLI),
  `#!/usr/bin/env node
if (process.env.E2E_LOGIN === "ok") console.log("Email: e2e@example.com");
else { console.log("not logged in"); process.exit(1); }
`,
  { mode: 0o755 },
);
await fs.writeFile(
  path.join(BIN, "npx"),
  `#!/usr/bin/env node
const fs = require("node:fs");
fs.appendFileSync(process.env.E2E_DEPLOY_LOG || "/dev/null", JSON.stringify(process.argv.slice(2)) + "\\n");
if (process.env.E2E_DEPLOY === "fail") {
  console.error("npm error 404 Not Found - registry unreachable (simulated)");
  process.exit(1);
}
console.log("https://" + process.env.E2E_DOMAIN + "/");
console.log("https://fixture-project-abc123." + process.env.E2E_HOST_MARKER + ".example/");
`,
  { mode: 0o755 },
);
await fs.writeFile(
  path.join(APP, "patch-fetch.cjs"),
  `const original = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  const href = String(url);
  if (href.includes(".example")) {
    const stale = process.env.E2E_VERIFY_STALE === "1";
    const html = stale
      ? '<script src="/assets/index-old.js"></script>'
      : '<script src="/assets/index-test123.js"></script>';
    return new Response(html, { status: 200, headers: { "content-type": "text/html" } });
  }
  return original(url, opts);
};
`,
);

function envFor({ login = false, deploy = "ok", leak = false, stale = false, noCli = false } = {}) {
  const basePath = noCli ? "/usr/bin:/bin:/usr/sbin:/sbin" : `${BIN}:${process.env.PATH}`;
  return {
    ...process.env,
    HOME,
    PATH: basePath,
    E2E_LOGIN: login ? "ok" : "no",
    E2E_DEPLOY: deploy,
    E2E_LEAK: leak ? "1" : "0",
    E2E_VERIFY_STALE: stale ? "1" : "0",
    E2E_DEPLOY_LOG: DEPLOY_LOG,
    E2E_DOMAIN: DOMAIN,
    E2E_HOST_MARKER: HOST_MARKER,
    NODE_OPTIONS: `--require ${path.join(APP, "patch-fetch.cjs")}`,
  };
}

async function reset({ binding = null } = {}) {
  await fs.rm(BINDING, { force: true });
  await fs.rm(DEPLOY_LOG, { force: true });
  if (binding) await fs.writeFile(BINDING, JSON.stringify(binding, null, 2));
  await fs.rm(path.join(WEB, "dist"), { recursive: true, force: true });
}

function runSkill(args, env) {
  const result = spawnSync(process.execPath, [path.join(APP, ".agent/skills/deploy-prototype/deploy.mjs"), ...args], {
    cwd: APP,
    env,
    encoding: "utf8",
    maxBuffer: 32 << 20,
  });
  return {
    status: result.status,
    out: `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim(),
  };
}

async function deployLog() {
  const text = await fs.readFile(DEPLOY_LOG, "utf8").catch(() => "");
  return text.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

const scenarios = [];
function check(name, result, expect) {
  const problems = [];
  if (expect.status !== undefined && result.status !== expect.status) {
    problems.push(`exit ${result.status}, expected ${expect.status}`);
  }
  for (const marker of expect.includes ?? []) {
    if (!result.out.includes(marker)) problems.push(`missing: ${marker}`);
  }
  for (const marker of expect.excludes ?? []) {
    if (result.out.includes(marker)) problems.push(`unexpected: ${marker}`);
  }
  scenarios.push({ name, pass: problems.length === 0, problems, out: result.out });
  return scenarios.at(-1);
}

await reset();
check("A. new machine: no binding is reported first", runSkill([], envFor({ noCli: true })), {
  status: 1,
  includes: ["本机没有部署绑定"],
  excludes: [AUTH_CLI],
});

await reset({ binding: { domain: DOMAIN } });
check("B. binding present, no deploy CLI", runSkill([], envFor({ noCli: true })), {
  status: 1,
  includes: ["本机没有", AUTH_CLI],
});

await reset({ binding: { domain: DOMAIN } });
check("C. CLI present, not logged in", runSkill([], envFor({ login: false })), {
  status: 1,
  includes: ["还没登录部署平台"],
});

await reset();
check("D. logged in, no binding", runSkill([], envFor({ login: true })), {
  status: 1,
  includes: ["本机没有部署绑定"],
});

await reset();
check("E. dry-run works in a new environment", runSkill(["--dry-run"], envFor({ login: false })), {
  status: 0,
  includes: ["构建通过、产物干净", "这次没有部署"],
});

await reset({ binding: { domain: DOMAIN } });
check("F. clean deploy", runSkill([], envFor({ login: true })), {
  status: 0,
  includes: ["已部署", "最新版", "本次固定版"],
});
const cleanCalls = await deployLog();
check("G. deploy CLI received only --dir", { status: cleanCalls.length ? 0 : 1, out: JSON.stringify(cleanCalls) }, {
  status: 0,
  includes: ['"--dir"'],
  excludes: ["--project-id", "--project-name"],
});

await reset({ binding: { domain: DOMAIN } });
check("H. leaky artifact stops before deploy", runSkill([], envFor({ login: true, leak: true })), {
  status: 1,
  includes: ["评审层的源码坐标", "批注落盘接口"],
});

await reset({ binding: { domain: DOMAIN } });
check("I. registry / CLI failure stops", runSkill([], envFor({ login: true, deploy: "fail" })), {
  status: 1,
  includes: ["部署失败", "registry unreachable"],
});

await reset({ binding: { domain: DOMAIN } });
check("J. stale verification is reported", runSkill([], envFor({ login: true, stale: true })), {
  status: 0,
  includes: ["线上首页还不是这次的构建"],
});

await reset({ binding: { domain: OTHER_DOMAIN } });
const mismatch = runSkill([], envFor({ login: true }));
const mismatchCalls = await deployLog();
check("K. copied binding is NOT detected", mismatch, {
  status: 0,
  includes: ["已部署"],
});
check(
  "L. copied binding still deploys with no project validation",
  { status: mismatchCalls.length ? 0 : 1, out: JSON.stringify(mismatchCalls) },
  { status: 0, includes: ['"--dir"'], excludes: ["mismatch", "other-project"] },
);

console.log("\nIsolated deploy-skill E2E\n");
for (const s of scenarios) {
  console.log(`${s.pass ? "✓" : "✗"} ${s.name}`);
  for (const p of s.problems) console.log(`    ${p}`);
  if (!s.pass && process.env.VERBOSE === "1") console.log(`    output: ${s.out.replace(/\n/g, "\n            ")}`);
}

console.log(`\nFixture: ${APP}`);
console.log("Scenarios are intentionally isolated: fake CLI, fake registry, fake fetch, temp HOME.");

const failed = scenarios.filter((s) => !s.pass);
if (failed.length) {
  console.error(`\n${failed.length} scenario(s) failed.`);
  if (process.env.KEEP !== "1") await fs.rm(TMP, { recursive: true, force: true });
  process.exit(1);
}

await fs.rm(TMP, { recursive: true, force: true });
console.log("\nAll scenarios behaved as documented.");
