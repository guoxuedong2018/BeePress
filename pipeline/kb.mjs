#!/usr/bin/env node
/**
 * kb —— 内容构建的命令行
 * ------------------------------------------------------------------
 * 这套链路的主要使用者是 Agent：它读页面、改 md、跑截图。人在审阅台上看结果、
 * 确认、批准发出。从前 Agent 只能靠临时脚本去改内容任务 JSON（封存、迁移、补字段），
 * 因为系统没给它一等命令；这里补上。
 *
 *   status  [--json]                 哪些文档哪几行要审、哪些图该重拍、哪些页还没写
 *   shoot   [--stale | --all | <key>...]  重拍。--stale 只拍源码真变了的；图没变就到此为止
 *   ack     <页> [<引用id>...]        我看过了：把现在的值记进锁（不给引用就是整页）
 *   adopt   <页> <引用id>             需求规格改了措辞：把正文里那句换成新的并确认
 *   where   <配方key|路由|依据|需求>   谁在引用它
 *   context <页|路由> [--json]         给 Agent 打包：这页的引用、涉及的路由、可用配方、可引的规格原文
 *   check                            给 npm run check：引用断了才失败，要审只提醒
 *   new     <页> <类型> <话题> [--pages=/a,/b] [--frs=K1,K2] [--title=…]
 *                                    按话题建一页：front-matter 记话题与涉及的屏，正文是模板骨架（意图 + 格子）
 */

import { spawn } from "node:child_process";
import path from "node:path";

import {
  BASIS_LABEL,
  REF_STATE_LABEL,
  ack,
  adoptFact,
  buildStatus,
  fileStatus,
  listPages,
  makeResolver,
  parseBasis,
  whereUsed,
} from "./lib/content-build.mjs";
import { createTopicPage } from "./lib/topic-context.mjs";
import { SLOT_KINDS, TOPIC_TYPES } from "./lib/topic-types.mjs";
import { factsOfFrs, frsStatus, loadAllFrs, normRoute } from "./lib/frs.mjs";
import { loadLedger, sourceDrift } from "./lib/media-ledger.mjs";
import { PIPELINE_DIR, REPO_ROOT } from "./lib/paths.mjs";

const [, , cmd, ...rest] = process.argv;
const flags = new Set(rest.filter((a) => a.startsWith("--")).map((a) => a.split("=")[0]));
const flagValue = (k) => rest.find((a) => a.startsWith(`${k}=`))?.slice(k.length + 1) ?? "";
const args = rest.filter((a) => !a.startsWith("--"));
const json = flags.has("--json");

const COMMANDS = { status, shoot, ack: ackCmd, adopt, where, context, check, new: newPage };
if (!COMMANDS[cmd]) {
  console.log(`用法: npx beepress kb <命令>

  status  [--json]                 哪些文档要审、哪些图该重拍、哪些页还没写
  shoot   [--stale | --all | <key>...]  重拍（画面没变不打扰文档）
  ack     <页> [<引用id>...]        我看过了，把现在的值记进锁
  adopt   <页> <引用id>             需求规格改了措辞：换成新的并确认
  where   <配方key|路由|依据|需求>   谁在引用它
  context <页|路由> [--json]         给 Agent 打包上下文
  check                            引用断了才失败，要审只提醒
  new     <页> <类型> <话题> [--pages=/a,/b] [--frs=…] [--title=…]
                                   按话题建一页（类型：${Object.keys(TOPIC_TYPES).join(" / ")}）`);
  process.exit(!cmd || cmd === "--help" || cmd === "-h" ? 0 : 1);
}
await COMMANDS[cmd]().catch((e) => {
  console.error(`✗ ${e.message}`);
  process.exitCode = 1;
});

// ────────────────────────────────────────────────────────────────

async function status() {
  const s = await buildStatus();
  if (json) return console.log(JSON.stringify(s, null, 2));
  const { summary: m } = s;
  console.log(`${m.pages} 页 · ${m.review} 页待审（${m.refsOpen} 处）· ${m.reshoot} 张截图录屏过期该重拍 · ${m.slots ? `${m.slots} 个格子待填 · ` : ""}${m.backlog} 页待撰写 · ${m.uncovered} 份需求没页面挂靠`);
  console.log(`事实引用 ${m.facts} 条${m.unverified ? `，其中 ${m.unverified} 条是人工记录（验不了）` : ""}`);

  if (s.review.length) {
    console.log("\n待审");
    for (const f of s.review) {
      console.log(`  ${f.path}  ${f.title}`);
      for (const r of f.refs.filter((x) => x.state !== "ok" && !x.unverified)) {
        console.log(`    ${String(r.line).padStart(4)}  ${REF_STATE_LABEL[r.state].padEnd(6)} ${label(r)}  — ${r.reason}`);
      }
    }
  }
  if (s.following.length) {
    console.log("\n跟随迭代中（页面收口前不必处理）");
    for (const f of s.following) console.log(`  ${f.path}  ${f.open} 处 · ${f.iterating}`);
  }
  const line = (r) => {
    const files = [...r.changed, ...r.added, ...r.removed];
    return `  ${r.key}  ← ${files.slice(0, 2).join("、")}${files.length > 2 ? ` 等 ${files.length} 个` : ""}${r.usedBy.length ? "" : "（没有文档引用）"}`;
  };
  const now = s.reshoot.filter((r) => !r.following);
  const later = s.reshoot.filter((r) => r.following);
  if (now.length) {
    console.log("\n该重拍（源码在抓完之后变过）——npx beepress kb shoot --stale");
    for (const r of now) console.log(line(r));
  }
  if (later.length) {
    console.log("\n也过期了，但只有正在迭代的页在用（--stale 会跳过，要拍就点名）");
    for (const r of later) console.log(line(r));
  }
  // 截图脚本拍完自检写进台账的问题：图是产出了，但半截、或角标没落上。重拍多半解决不了，要改配方
  const broken = Object.entries(await loadLedger()).filter(([, v]) => v.warnings?.length);
  if (broken.length) {
    console.log("\n拍出来有问题（改 docs/kb/shots.config.mjs 里的配方后重拍）");
    for (const [key, v] of broken) for (const w of v.warnings) console.log(`  ${key}  ${w}`);
  }
  if (s.planning.length) {
    console.log("\n蓝图排好了、格子还空着——截图录屏在审阅台「构成」里示范，流程图表格交给 IDE 里的 Agent（/content-draft）");
    for (const f of s.planning) {
      const kinds = Object.entries(SLOT_KINDS).map(([k, v]) => [v, f.plan.slots.filter((x) => x.kind === k).length]).filter(([, n]) => n);
      console.log(`  ${f.path}  ${f.unfilled} 个格子（${kinds.map(([v, n]) => `${v} ${n}`).join("、")}）`);
    }
  }
  if (s.backlog.length) {
    console.log("\n待撰写");
    for (const f of s.backlog) console.log(`  ${f.path}  ${f.title}`);
  }
  if (s.uncovered.length) {
    console.log("\n已确认、却没有页面挂靠的需求（在相关页 front-matter 的 frs 里加上它）");
    for (const u of s.uncovered) console.log(`  ${u.key}  ${u.title}`);
  }
}

function label(r) {
  if (r.type === "shot" || r.type === "clip") return `${r.type === "shot" ? "图" : "录屏"} ${r.key}`;
  if (r.type === "spec") return `需求 ${r.key}`;
  const { kind } = parseBasis(r.basis);
  const t = String(r.text ?? "").replace(/\s+/g, " ");
  return `${BASIS_LABEL[kind] ?? "事实"}「${t.length > 24 ? `${t.slice(0, 24)}…` : t}」`;
}

// ────────────────────────────────────────────────────────────────

/**
 * 重拍。`--stale` 只拍源码真变了的；给 key 就拍那几张。
 *
 * 拍完告诉你哪几份文档因此要审——只有画面真的变了的才算，
 * 字节一致的图到这里就截断了。
 */
async function shoot() {
  let shots = [];
  let clips = [];
  if (flags.has("--stale")) {
    const { reshoot } = await buildStatus();
    const skipped = reshoot.filter((m) => m.following);
    for (const m of reshoot) {
      if (m.following) continue;
      if (m.key.startsWith("images/")) shots.push(m.recipe);
      else clips.push(m.recipe);
    }
    if (skipped.length) console.log(`跳过 ${skipped.length} 份只被「正在迭代」页面用到的物料；要拍就点名：beepress kb shoot ${skipped[0].recipe}`);
  } else if (flags.has("--all")) {
    const { shots: S, clips: C } = await makeResolver().recipes();
    shots = Object.keys(S);
    clips = Object.keys(C);
  } else {
    const { shots: S, clips: C } = await makeResolver().recipes();
    for (const k of args) {
      if (k in C) clips.push(k);
      else if (k in S) shots.push(k);
      else console.error(`没有这个配方：${k}`);
    }
  }
  if (!shots.length && !clips.length) return console.log("没有要重拍的。");

  const before = await snapshotOpen();
  const media = [...shots.map((k) => `images/${k}.png`), ...clips.map((k) => `media/${k}.gif`)];
  const takenAt = async () => {
    const led = await loadLedger();
    return media.map((m) => led[m]?.capturedAt ?? null);
  };
  const t0 = await takenAt();
  if (shots.length) await run("capture-kb-shots.mjs", shots.flatMap((k) => ["--only", k]));
  if (clips.length) await run("record-kb-clips.mjs", clips.flatMap((k) => ["--only", k]));
  const t1 = await takenAt();
  const after = await snapshotOpen();

  const newly = [...after].filter((id) => !before.has(id));
  const n = media.length;
  // 按台账里的抓取时刻数拍成了几份：没拍成的那几张根本没参与比较，不能算进「画面没变」
  const done = t1.filter((t, i) => t && t !== t0[i]).length;
  if (done < n) {
    process.exitCode = 1;
    console.log(`\n${n - done} 份没拍成（见上面的输出），还是旧图。`);
    if (!done) return;
  }
  if (!newly.length) console.log(`\n重拍了 ${done} 份，画面都没变——没有文档需要审。`);
  else {
    console.log(`\n重拍了 ${done} 份，其中画面变了、需要回头看文档的：`);
    for (const id of newly) console.log(`  ${id}`);
  }
}

/** 此刻所有「图变了」的引用，形如 `页|引用id` */
async function snapshotOpen() {
  const s = await buildStatus();
  return new Set(s.files.flatMap((f) => f.refs.filter((r) => r.state === "changed" && r.media).map((r) => `${f.path}|${r.id}`)));
}

function run(script, argv) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [path.join(PIPELINE_DIR, script), ...argv], { cwd: REPO_ROOT, stdio: "inherit" });
    p.on("exit", resolve);
  });
}

// ────────────────────────────────────────────────────────────────

async function ackCmd() {
  const [rel, ...ids] = args;
  if (!rel) throw new Error("要给页面路径，如 labeling/label-config.md");
  const r = await ack(rel, ids.length ? ids : null);
  console.log(`✓ ${rel}：确认 ${r.acked.length} 条引用`);
  for (const s of r.skipped) console.log(`  ✗ ${s.id} 没确认——${s.reason}（这得改正文，不是「看过了」能解决的）`);
}

async function adopt() {
  const [rel, id] = args;
  if (!rel || !id) throw new Error("用法：kb adopt <页> <引用id>");
  const r = await adoptFact(rel, id);
  console.log(`✓ 已换成需求规格里现在的写法并确认：${r.id}`);
}

async function where() {
  const hits = await whereUsed(args[0]);
  if (json) return console.log(JSON.stringify(hits, null, 2));
  if (!hits.length) return console.log("没有文档引用它。");
  for (const h of hits) console.log(`  ${h.file}:${h.line}  ${h.id}`);
}

// ────────────────────────────────────────────────────────────────

/**
 * 给 Agent 打包一页（或一条路由）的上下文：写这页需要知道的全部，一次给齐。
 * /content-draft 从这里开始，而不是自己满仓库找。
 */
async function context() {
  const target = args[0];
  if (!target) throw new Error("要给页面路径或路由");
  const resolver = makeResolver();
  const ledger = await resolver.ledger();
  const { shots, clips } = await resolver.recipes();
  const frsMap = await loadAllFrs();

  const isPage = target.endsWith(".md");
  const page = isPage ? await fileStatus(target, { resolver }) : null;
  if (isPage && !page) throw new Error(`页面不存在：${target}`);

  const routes = new Set();
  if (isPage) {
    for (const r of page.refs) if (r.route) routes.add(normRoute(r.route));
    for (const key of page.frs) for (const g of frsMap.get(key)?.spec ?? []) if (g.route) routes.add(normRoute(g.route));
  } else routes.add(normRoute(target));

  const recipes = [
    ...Object.entries(shots).map(([key, d]) => ({ kind: "截图", key, route: d.route, caption: d.caption ?? "" })),
    ...Object.entries(clips).map(([key, d]) => ({ kind: "录屏", key, route: d.route, caption: d.caption ?? "" })),
  ].filter((r) => routes.has(normRoute(r.route)));

  const specFacts = [];
  for (const [key, frs] of frsMap) {
    for (const f of factsOfFrs(key, frs)) if (f.route && routes.has(f.route)) specFacts.push({ basis: `frs:${f.ref}`, status: frsStatus(frs), text: f.text });
  }

  const drift = [];
  for (const [key, meta] of Object.entries(ledger)) {
    if (!routes.has(normRoute(meta.route))) continue;
    const d = await sourceDrift(meta);
    if (d?.stale) drift.push({ key, changed: [...d.changed, ...d.added] });
  }

  const pages = isPage ? [] : (await Promise.all((await listPages()).map((p) => fileStatus(p, { resolver }))))
    .filter((f) => f.refs.some((r) => r.route && routes.has(normRoute(r.route))))
    .map((f) => f.path);

  const bundle = { target, page, routes: [...routes], recipes, specFacts, drift, pages };
  if (json) return console.log(JSON.stringify(bundle, null, 2));

  console.log(`# ${target}${page ? `  ${page.title}（${page.docStatus ?? "?"}）` : ""}\n`);
  console.log(`涉及路由：${[...routes].join("  ") || "（没找到——正文还没引用任何图，front-matter 也没挂需求）"}`);
  if (page) {
    console.log(`\n正文引用（${page.refs.length}）`);
    for (const r of page.refs) console.log(`  ${String(r.line).padStart(4)}  ${REF_STATE_LABEL[r.state].padEnd(6)} ${label(r)}`);
  }
  console.log(`\n可用配方（${recipes.length}）——正文里写 ![说明](../images/<key>.png) 即引用`);
  for (const r of recipes) console.log(`  ${r.kind} ${r.key}  ${r.caption}`);
  console.log(`\n可原样引用的需求规格（${specFacts.length}）——正文里写 <!--f 依据-->原文<!--/f-->`);
  for (const f of specFacts.slice(0, 40)) console.log(`  [${f.status}] ${f.basis}  ${f.text.replace(/\s+/g, " ").slice(0, 60)}`);
  if (specFacts.length > 40) console.log(`  …另有 ${specFacts.length - 40} 条，--json 看全部`);
  console.log(`\n没有需求规格时，页面上照抄的文案就是事实：<!--f code:<源码文件>-->原文<!--/f-->`);
  if (drift.length) {
    console.log(`\n过期的截图录屏：拍完之后页面代码改过（${drift.length}）——先 kb shoot --stale`);
    for (const d of drift) console.log(`  ${d.key}  ← ${d.changed.slice(0, 2).join("、")}`);
  }
  if (pages.length) console.log(`\n引用这条路由的页：${pages.join("  ")}`);
}

// ────────────────────────────────────────────────────────────────

/** 按话题建一页。下一步：让 IDE 里的 Agent 按话题提议蓝图 */
async function newPage() {
  const [page, type, ...topicWords] = args;
  const list = (k) => flagValue(k).split(",").map((x) => x.trim()).filter(Boolean);
  const rel = await createTopicPage({ path: page, type, topic: topicWords.join(" "), pages: list("--pages"), frs: list("--frs"), title: flagValue("--title") });
  console.log(`✓ 建好了 docs/kb/${rel}（${TOPIC_TYPES[type].label}，按模板排了骨架）`);
  console.log(`  下一步：/content-draft 给 docs/kb/${rel} 按话题提议蓝图`);
}

// ────────────────────────────────────────────────────────────────

/** 接进 npm run check：引用断了（图不在、原文找不到、依据看不懂）才失败，要审只提醒 */
async function check() {
  const s = await buildStatus();
  const broken = [];
  for (const f of s.files) for (const r of f.refs) if (r.state === "missing" && r.type !== "fact") broken.push(`${f.path}:${r.line}  ${label(r)} — ${r.reason}`);
  const goneFacts = s.files.flatMap((f) => f.refs.filter((r) => r.state === "missing" && r.type === "fact").map((r) => `${f.path}:${r.line}  ${label(r)} — ${r.reason}`));
  const noRecipe = s.files.flatMap((f) => f.refs.filter((r) => r.media && r.hasRecipe === false).map((r) => `${f.path}:${r.line}  ${label(r)}`));

  for (const b of broken) console.log(`  ✗ ${b}`);
  for (const g of goneFacts) console.log(`  ⚠️  ${g}`);
  for (const n of noRecipe) console.log(`  ⚠️  没有配方、重拍不了：${n}`);
  const m = s.summary;
  const tail = [
    m.review && `${m.review} 页待审（${m.refsOpen} 处）`,
    m.reshoot && `${m.reshoot} 张截图录屏过期该重拍`,
    m.slots && `${m.slots} 个格子待填`,
    m.backlog && `${m.backlog} 页待撰写`,
    m.uncovered && `${m.uncovered} 份需求没页面挂靠`,
  ].filter(Boolean).join(" · ");
  if (broken.length) {
    console.log(`✗ ${broken.length} 处引用断了`);
    process.exitCode = 1;
  } else {
    console.log(`✓ ${m.pages} 页引用完整，事实 ${m.facts} 条${tail ? `；${tail}——npx beepress kb status` : ""}`);
  }
}
