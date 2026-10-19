#!/usr/bin/env node
/**
 * 往一页里加一张截图
 * ------------------------------------------------------------------
 * 和示范录屏同一条路：人在原型上操作到那一屏、框出截图范围 → 写配方 → 截图 →
 * 放进那一节（有格子就填格子）→ 校验。旁边的文字要不要跟着改，交给人或 IDE 里的 Agent。
 *
 *   npx builder-kit kb-add-shot --spec /tmp/shot.json
 *
 * spec：{
 *   page, section: { line, text }, slot?,         同 kb-add-clip
 *   route:   "/infer-task-new",                   从这条路由刚打开的样子开始
 *   caption: "导入失败时列表里的样子",              图片说明
 *   key?:    "infer-task-troubleshoot/demo-0928-1030",
 *   steps:   [{ selector, caption, type?, clear? }],   操作到那一屏的步骤（点击 / 输入）
 *   clip?:   "[data-loc=…]",                       截图范围：框选的元素；不给就是整屏
 *   marks?:  true,                                 在操作过的控件上压序号角标
 * }
 *
 * 截不成就把刚写的配方删掉；什么都不会被自动确认——新图是新引用，进待审。
 */

import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

import { fileStatus, parseRefs } from "./lib/content-build.mjs";
import { KB_DIR, PIPELINE_DIR, REPO_ROOT } from "./lib/paths.mjs";
import { findSection, placeMaterial } from "./lib/section-writer.mjs";

const SHOTS_FILE = path.join(KB_DIR, "shots.config.mjs");

const argv = process.argv.slice(2);
const specFile = argv[argv.indexOf("--spec") + 1];

const step = (n, text) => console.log(`\n▸ ${n}/4 ${text}`);
const fail = (msg) => {
  console.log(`\n✗ ${msg}`);
  process.exit(1);
};

function imageDirOf(text, page) {
  const ref = parseRefs(text).find((r) => r.type === "shot" || r.type === "clip");
  return ref ? ref.key.split("/")[0] : path.basename(page, ".md");
}

function localTime() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

/** 示范的每一步 → 截图配方的步骤：点击就是 click，输入就是 fill */
function recipeOf(spec) {
  const steps = [
    // 列表页首屏有骨架屏，表格晚几百毫秒才出来：示范时人看到的是加载完的样子
    { wait: 900 },
    ...spec.steps.map((s) => (s.type != null ? { fill: { selector: s.selector, text: String(s.type) } } : { click: s.selector })),
  ];
  return {
    route: spec.route,
    caption: spec.caption,
    steps,
    ...(spec.clip ? { clip: spec.clip } : {}),
    // 只给输入框压号：点过的下拉项、按钮点完多半就不在了，角标会压空
    ...(spec.marks ? { marks: spec.steps.map((s, i) => ({ n: i + 1, at: s.selector, keep: s.type != null })).filter((m) => m.keep).map(({ n, at }) => ({ n, at })) } : {}),
  };
}

const markers = (key) => [`// ── 示范截图 ${key} ──`, `// ── /示范截图 ${key} ──`];
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function writeRecipe(key, spec) {
  const [begin, end] = markers(key);
  let src = await fs.readFile(SHOTS_FILE, "utf8");
  src = src.replace(new RegExp(`\\n?${escapeRe(begin)}[\\s\\S]*?${escapeRe(end)}\\n?`), "\n");
  const when = localTime();
  const block = [
    begin,
    `// ${spec.page}「${spec.section.text}」· ${when} 由审阅台示范截图生成。可以手改：步骤、截图范围、角标都在这里`,
    `SHOTS[${JSON.stringify(key)}] = ${JSON.stringify(recipeOf(spec), null, 2)};`,
    end,
  ].join("\n");
  await fs.writeFile(SHOTS_FILE, `${src.replace(/\s*$/, "")}\n\n${block}\n`);
}

async function removeRecipe(key) {
  const [begin, end] = markers(key);
  const src = await fs.readFile(SHOTS_FILE, "utf8");
  await fs.writeFile(SHOTS_FILE, src.replace(new RegExp(`\\n*${escapeRe(begin)}[\\s\\S]*?${escapeRe(end)}\\n?`), "\n"));
}

function run(script, args) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [path.join(PIPELINE_DIR, script), ...args], { cwd: REPO_ROOT, stdio: "inherit" });
    p.on("exit", resolve);
  });
}

async function main() {
  if (!specFile) fail("要给 --spec <json 文件>");
  const spec = JSON.parse(await fs.readFile(specFile, "utf8"));
  const abs = path.join(KB_DIR, spec.page ?? "");
  if (!spec.page || spec.page.includes("..") || !spec.page.endsWith(".md")) fail("page 不对");
  let text = await fs.readFile(abs, "utf8").catch(() => null);
  if (text === null) fail(`没有这一页：${spec.page}`);
  if (!spec.route) fail("没有路由");
  spec.steps ??= [];
  if (!findSection(text, spec.section ?? {})) fail(`这一页里找不到「${spec.section?.text}」这一节`);

  const key = spec.key ?? `${imageDirOf(text, spec.page)}/demo-${stamp()}`;
  console.log(`截图 ${key}  ←  ${spec.route}，${spec.steps.length} 步${spec.clip ? "，只截框选的那一块" : "，整屏"}`);

  step(1, "写配方");
  await writeRecipe(key, spec);
  console.log(`  docs/kb/shots.config.mjs 末尾加了 ${key}`);

  step(2, "截图");
  const png = path.join(KB_DIR, "images", `${key}.png`);
  const t0 = Date.now();
  const code = await run("capture-kb-shots.mjs", ["--only", key]);
  const made = await fs.stat(png).then((st) => st.mtimeMs >= t0 - 1000, () => false);
  if (code !== 0 || !made) {
    await removeRecipe(key);
    fail("截图没成功，刚写的配方已删掉。多半是某一步的元素没找到，或截图范围框的元素不见了——看上面的报错，重新示范一次");
  }

  step(3, "放进正文");
  text = await fs.readFile(abs, "utf8");
  const sec = findSection(text, spec.section);
  if (!sec) fail(`截好了（${key}），但这一页里已经找不到「${spec.section.text}」这一节，没放进正文。去编辑器里手动引用 ../images/${key}.png`);
  const imgLine = `![${spec.caption.replace(/[[\]]/g, "")}](${path.posix.relative(path.posix.dirname(spec.page), `images/${key}.png`)})`;
  const placed = placeMaterial(text, sec, [imgLine], { slot: spec.slot, kind: "shot" });
  await fs.writeFile(abs, placed.text);
  console.log(`  「${sec.text}」第 ${placed.at} 行${placed.filled ? "（填进了蓝图里的截图格子）" : ""}`);

  step(4, "校验");
  const st = await fileStatus(spec.page);
  for (const r of st.refs.filter((x) => x.state === "missing")) console.log(`  ✗ 第 ${r.line} 行 ${r.id}：${r.reason}`);
  console.log(`  这一页 ${st.open} 处待审（新截图是其中之一），去审阅台看一遍再点「没问题」`);
  console.log(`\n✓ 完成：${key} 已放进 ${spec.page}「${sec.text}」`);
}

main().catch((e) => fail(e.message));
