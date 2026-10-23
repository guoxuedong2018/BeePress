#!/usr/bin/env node
/**
 * 往一页里加一段操作录屏
 * ------------------------------------------------------------------
 * 写配方 → 录制 → 放进指定那一节 → 校验。旁边的文字要不要跟着改，交给人或 IDE 里的 Agent。
 *
 * 由审阅台「构成」里的示范录制触发（studio-server 起成后台任务），也能在命令行跑：
 *
 *   npx builderharness kb-add-clip --spec /tmp/clip.json
 *
 * spec：{
 *   page:    "labeling/label-template.md",
 *   section: { line, text },                     放进哪一节（行号对不上时按标题文字找）
 *   slot?:   42,                                 蓝图里那个录屏格子的行号：填它；格子不在了就放节末
 *   route:   "/label-template?x=1",              录制从这条路由刚打开的样子开始
 *   caption: "换工作组会清空已选的节点类型",       这段录屏讲什么，也是图片说明
 *   key?:    "label-template/demo-0923-1412",    不给就按页面的图片目录自动起
 *   steps:   [{ selector, caption, type?, clear? }],
 * }
 *
 * 失败时收拾干净：录不成就把刚写的配方删掉。什么都不会被自动确认——新录屏是新引用，进待审。
 */

import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

import { fileStatus, parseRefs } from "./lib/content-build.mjs";
import { KB_DIR, PIPELINE_DIR, REPO_ROOT } from "./lib/paths.mjs";
import { findSection, placeMaterial } from "./lib/section-writer.mjs";

const CLIPS_FILE = path.join(KB_DIR, "clips.config.mjs");

const argv = process.argv.slice(2);
const specFile = argv[argv.indexOf("--spec") + 1];

const step = (n, text) => console.log(`\n▸ ${n}/4 ${text}`);
const fail = (msg) => {
  console.log(`\n✗ ${msg}`);
  process.exit(1);
};

// ────────────────────────────────────────────────────────────────

/** 页面自己的图片目录名（`images/<它>/…`），录屏跟着放 `media/<它>/` */
function mediaDirOf(text, page) {
  const ref = parseRefs(text).find((r) => r.type === "shot" || r.type === "clip");
  return ref ? ref.key.split("/")[0] : path.basename(page, ".md");
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

function recipeOf(spec) {
  return {
    route: spec.route,
    caption: spec.caption,
    // 录制从这条路由刚打开的样子开始：示范时也是先刷新再录的，两边起点一致
    setup: [{ settle: 900 }],
    cursorStart: { x: 240, y: 240 },
    gif: { width: 900, fps: 10 },
    // 先给结论再拆步骤，与手写的配方同一个结构
    segments: [
      { name: "结论", say: spec.caption, timeline: [{ hold: 1200 }] },
      ...spec.steps.map((s, i) => ({
        name: `第${i + 1}步`,
        say: s.caption,
        timeline: [
          { moveTo: s.selector, ease: 700, settle: 250 },
          { click: true },
          ...(s.type != null ? [{ type: String(s.type), ...(s.clear ? { clear: true } : {}) }] : []),
          { hold: s.type != null ? 700 : 1000 },
        ],
      })),
    ],
  };
}

const markers = (key) => [`// ── 示范录制 ${key} ──`, `// ── /示范录制 ${key} ──`];
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function writeRecipe(key, spec) {
  const [begin, end] = markers(key);
  let src = await fs.readFile(CLIPS_FILE, "utf8");
  src = src.replace(new RegExp(`\\n?${escapeRe(begin)}[\\s\\S]*?${escapeRe(end)}\\n?`), "\n");
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  const when = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  const block = [
    begin,
    `// ${spec.page}「${spec.section.text}」· ${when} 由审阅台示范录制生成。可以手改：节奏、字幕、选择器都在这里`,
    `CLIPS[${JSON.stringify(key)}] = ${JSON.stringify(recipeOf(spec), null, 2)};`,
    end,
  ].join("\n");
  await fs.writeFile(CLIPS_FILE, `${src.replace(/\s*$/, "")}\n\n${block}\n`);
}

async function removeRecipe(key) {
  const [begin, end] = markers(key);
  const src = await fs.readFile(CLIPS_FILE, "utf8");
  await fs.writeFile(CLIPS_FILE, src.replace(new RegExp(`\\n*${escapeRe(begin)}[\\s\\S]*?${escapeRe(end)}\\n?`), "\n"));
}

function run(script, args) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [path.join(PIPELINE_DIR, script), ...args], { cwd: REPO_ROOT, stdio: "inherit" });
    p.on("exit", resolve);
  });
}

// ────────────────────────────────────────────────────────────────

async function main() {
  if (!specFile) fail("要给 --spec <json 文件>");
  const spec = JSON.parse(await fs.readFile(specFile, "utf8"));
  const abs = path.join(KB_DIR, spec.page ?? "");
  if (!spec.page || spec.page.includes("..") || !spec.page.endsWith(".md")) fail("page 不对");
  let text = await fs.readFile(abs, "utf8").catch(() => null);
  if (text === null) fail(`没有这一页：${spec.page}`);
  if (!spec.route || !spec.steps?.length) fail("没有录到任何步骤");
  if (!findSection(text, spec.section ?? {})) fail(`这一页里找不到「${spec.section?.text}」这一节`);

  const key = spec.key ?? `${mediaDirOf(text, spec.page)}/demo-${stamp()}`;
  console.log(`录屏 ${key}  ←  ${spec.route}，${spec.steps.length} 步`);

  step(1, "写配方");
  await writeRecipe(key, spec);
  console.log(`  docs/kb/clips.config.mjs 末尾加了 ${key}`);

  step(2, "录制");
  const code = await run("record-kb-clips.mjs", ["--only", key]);
  const gif = path.join(KB_DIR, "media", `${key}.gif`);
  if (code !== 0 || !(await fs.access(gif).then(() => true, () => false))) {
    await removeRecipe(key);
    fail("录制没成功，刚写的配方已删掉。多半是某一步的元素没找到——看上面是哪一步，重新示范一次");
  }

  step(3, "放进正文");
  text = await fs.readFile(abs, "utf8");
  const sec = findSection(text, spec.section);
  // 录制那一两分钟里这一页可能被人改过、那个标题没了：录屏留着，让人自己放
  if (!sec) fail(`录好了（${key}），但这一页里已经找不到「${spec.section.text}」这一节，没放进正文。去编辑器里手动引用 ../media/${key}.gif`);
  const rel = (f) => path.posix.relative(path.posix.dirname(spec.page), `media/${key}.${f}`);
  const gifLine = `![${spec.caption.replace(/[[\]]/g, "")}](${rel("gif")})`;
  const videoLine = `[视频版（可暂停回看）](${rel("mp4")})`;
  const placed = placeMaterial(text, sec, [gifLine, videoLine], { slot: spec.slot, kind: "clip" });
  await fs.writeFile(abs, placed.text);
  console.log(`  「${sec.text}」第 ${placed.at} 行${placed.filled ? "（填进了蓝图里的录屏格子）" : ""}`);

  step(4, "校验");
  const st = await fileStatus(spec.page);
  const broken = st.refs.filter((r) => r.state === "missing");
  for (const r of broken) console.log(`  ✗ 第 ${r.line} 行 ${r.id}：${r.reason}`);
  console.log(`  这一页 ${st.open} 处待审（新录屏是其中之一），去审阅台看一遍再点「没问题」`);
  console.log(`\n✓ 完成：${key} 已放进 ${spec.page}「${sec.text}」`);
}

main().catch((e) => fail(e.message));
