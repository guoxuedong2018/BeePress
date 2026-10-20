#!/usr/bin/env node
/**
 * 出 PRD：一条命令把 FRS 件套发成外部目标 PRD
 * ------------------------------------------------------------------
 * 从前每出一版 PRD，Agent 要照着 Skill 手拼七八条发布命令：建文档、追图、对 imageId、写正文、回读；
 * 改一轮已发布的 PRD 更贵——取大纲找表格锚点、抠 JSON、打补丁，一轮两百多次工具调用。
 * 全是确定的步骤，收在这里。Agent 只管 FRS 里写什么、这一版该不该发。
 *
 *   npx beepress prd <KEY> [--scope delta]             只出计划：校验、渲染、截图、和目标端比，不写目标端
 *   npx beepress prd <KEY> [--scope delta] --yes       按计划外发
 *   npx beepress prd <KEY> --yes --rewrite             已有的那篇整篇覆盖（确认没人改过才用）
 *
 * 新建（FRS 没有 prdDocId）：建空文档 → 追图换 imageId → 带图渲染 → 整篇写入 → 回读核对 → 回写 prdDocId。
 * 更新：只补功能点表里变了的段落，目标端有人改过的段落不动、列出来。需求背景与方案设计变了只提醒——
 * 这几段有 Mermaid 和列表，按段替换容易弄坏，要么去目标端手改，要么确认没人改过后 --rewrite。
 *
 * 本地记两样（docs/prd/<KEY>/，已 gitignore）：
 *   base.json    上次发布后目标端功能点表的段落，下次用来认出哪些段落是人改的
 *   images.json  每张图上传后的 imageId 与图片哈希，图没变就复用，不重复上传
 */

import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

import { PRD_METHODS, loadPublishGateway } from "./lib/publish-gateway.mjs";
import { compareMedia, storeBlob } from "./lib/media-ledger.mjs";
import { FEATURES_DIR, KB_DIR, PIPELINE_DIR, PRD_DIR, REPO_ROOT } from "./lib/paths.mjs";
import { alignImages } from "./prd-images.mjs";
import { paraText, patchOps, proseTexts, tableParagraphs } from "./prd-patch-ops.mjs";

const DEV = "http://localhost:5273/";
const SECTIONS = ["需求背景", "需求描述", "方案设计", "功能点规则描述"];

const argv = process.argv.slice(2);
const key = argv.find((a) => !a.startsWith("-") && argv[argv.indexOf(a) - 1] !== "--scope");
const scope = argv.includes("--scope") ? argv[argv.indexOf("--scope") + 1] : "all";
const yes = argv.includes("--yes");
const rewrite = argv.includes("--rewrite");

const stop = (msg) => {
  console.log(`✗ ${msg}`);
  process.exit(1);
};
const step = (text) => console.log(`▸ ${text}`);
const readJson = (file, fallback) => fs.readFile(file, "utf8").then(JSON.parse, () => fallback);
const idOf = (v) => (typeof v === "string" ? v : v?.imageId ?? null);
const today = () => new Date().toLocaleDateString("sv-SE");

function node(script, args) {
  return spawnSync(process.execPath, [path.join(PIPELINE_DIR, script), ...args], { cwd: REPO_ROOT, encoding: "utf8", maxBuffer: 64 << 20 });
}
const tail = (r, n = 15) => `${r.stdout ?? ""}\n${r.stderr ?? ""}`.trim().split("\n").slice(-n).join("\n");

async function ensureDev() {
  const up = await fetch(DEV, { signal: AbortSignal.timeout(3000) }).then((r) => r.ok, () => false);
  if (!up) stop("截图要从活的原型上抓：先在另一个终端 cd web && npm run dev（5273），再跑一次");
}

async function main() {
  if (!key) stop("用法：npx beepress prd <FEATURE_KEY> [--scope delta] [--yes] [--rewrite]");
  if (!["all", "delta"].includes(scope)) stop(`--scope 只接受 all 或 delta，收到「${scope}」`);
  const frsFile = path.join(FEATURES_DIR, key, "FRS.json");
  const frs = await readJson(frsFile, null);
  if (!frs) stop(`没有这个需求件套：docs/features/${key}/FRS.json`);
  const gateway = await loadPublishGateway({ methods: PRD_METHODS }).catch((e) => stop(e.message));
  const outDir = path.join(PRD_DIR, key);
  const title = `【PRD】${frs.title ?? key}`;
  const docId = frs.prdDocId || null;

  // ── 1 校验、渲染、截图 ──────────────────────────────────────────
  let r = node("check-frs.mjs", []);
  if (r.status !== 0) stop(`需求件套校验没过（PRD 会带着错的验收编号或不存在的页面）：\n${tail(r)}`);
  r = node("export-frs-prd.mjs", [key, "--scope", scope]);
  if (r.status !== 0) stop(`渲染失败：\n${tail(r)}`);
  const made = r.stdout.match(/已生成 .*?：(.+)/)?.[1] ?? "";
  const shots = JSON.parse(await fs.readFile(path.join(outDir, "shots.json"), "utf8"));
  if (shots.order.length) {
    await ensureDev();
    r = node("capture-shots.mjs", [key, ...shots.order.flatMap((k) => ["--only", k])]);
    if (r.status !== 0) stop(`截图没成功：\n${tail(r)}`);
    for (const line of r.stdout.split("\n").filter((l) => /⚠|宽高比|点不开/.test(l))) console.log(`  ${line.trim()}`);
  }
  // 每一版截图存进内容寻址缓存（与知识库共用），下次才比得了画面
  const hashes = Object.fromEntries(await Promise.all(shots.order.map(async (k, i) => [k, await storeBlob(path.relative(KB_DIR, shots.files[i]))])));

  // 已上传过、画面没变、而且属于这篇文档的 imageId 可以复用（imageId 以文档 docId 结尾，换一篇就不能用）。
  // 画面没变不等于字节相同：抽屉、浮层这类截图每拍一次字节都不一样，按 16×16 格比灰度才认得出（compareMedia）。
  // 旧记录只有 imageId、没有哈希，分不出图变没变，按要重传算：多传一次无害，漏换一张图没人发现
  const imagesFile = path.join(outDir, "images.json");
  const recorded = await readJson(imagesFile, {});
  const reuse = {};
  for (const k of shots.order) {
    const v = recorded[k];
    if (!docId || !idOf(v)?.endsWith(docId) || !v.hash) continue;
    if (v.hash === hashes[k] || (await compareMedia(v.hash, hashes[k])).same) reuse[k] = v.imageId;
  }
  const toUpload = shots.order.filter((k) => !reuse[k]);

  /** 按给定的图渲染一遍，返回正文。图的记录只在真传上去之后才改（见 finish） */
  const render = async (map) => {
    const file = path.join(outDir, "images.render.json");
    await fs.writeFile(file, `${JSON.stringify(map, null, 2)}\n`);
    const res = node("export-frs-prd.mjs", [key, "--scope", scope, "--images", path.relative(REPO_ROOT, file)]);
    if (res.status !== 0) stop(`带图渲染失败：\n${tail(res)}`);
    return JSON.parse(await fs.readFile(path.join(outDir, "ops.json"), "utf8"))[0].content;
  };

  // ── 2 计划 ─────────────────────────────────────────────────────
  console.log(`\n${docId ? "更新" : "新建"}「${title}」${made ? `：${made}` : ""}，配图 ${shots.order.length} 张`);
  if (!docId || rewrite) {
    if (docId) console.log("  整篇覆盖：目标端有人改过的内容会一起没掉");
    else console.log("  新文档默认只有你自己能看，分享范围在目标端设");
    if (!yes) return plan();
    return publishWhole();
  }

  step("读目标端现状");
  const cloud = await gateway.fetchJsonml(docId);
  const base = await readJson(path.join(outDir, "base.json"), null);
  // 计划阶段图还没传：要换的图先沿用旧的 imageId，不然每张都会被算成一处改动
  const planned = { ...Object.fromEntries(Object.entries(recorded).map(([k, v]) => [k, idOf(v)]).filter(([, id]) => id?.endsWith(docId))), ...reuse };
  const localBody = await render(planned);
  const patch = patchOps({ localBody, cloudBody: cloud.body, base });
  const proseChanged = JSON.stringify(proseTexts(localBody)) !== JSON.stringify(proseTexts(cloud.body));
  const changedImages = toUpload.filter((k) => planned[k]);
  const newImages = toUpload.filter((k) => !planned[k]);

  const { change, insert, delete: del } = patch.summary;
  console.log(`  目标端第 ${cloud.version} 版`);
  console.log(`  功能点表：改写 ${change} · 新增 ${insert} · 删除 ${del}`);
  for (const line of patch.lines.slice(0, 20)) console.log(line);
  if (patch.lines.length > 20) console.log(`  …… 还有 ${patch.lines.length - 20} 处`);
  if (changedImages.length) console.log(`  配图换 ${changedImages.length} 张：${changedImages.join("、")}`);
  if (newImages.length) console.log(`  配图新增 ${newImages.length} 张：${newImages.join("、")}`);
  if (patch.kept.length) {
    console.log(`  目标端有人改过、这次不动 ${patch.kept.length} 段（要保留就把改动同步回 FRS.json）：`);
    for (const t of patch.kept.slice(0, 8)) console.log(`    · ${t.slice(0, 48)}`);
  }
  if (!base && change + del > 0) {
    console.log("  ⚠️ 这篇没有上次发布的底稿，分不清目标端哪些段落是人改的：上面的改写与删除会落到目标端现在的样子上。");
    console.log("     目标端那边的改动是对的，就先改回 FRS.json 再出计划；确认都要覆盖再 --yes");
  }
  if (proseChanged) console.log("  ⚠️ 需求背景 / 方案设计和目标端不一样：这条命令只同步功能点表，这几段去目标端手改；确认没人改过可以 --yes --rewrite 整篇覆盖");
  if (!change && !insert && !del && !toUpload.length) return console.log("\n✓ 功能点表和目标端一致，没有要发的");
  if (!yes) return plan();
  return publishPatch();

  // ── 3 外发 ─────────────────────────────────────────────────────

  function plan() {
    console.log("\n这次没有写目标端。确认密级与分享范围、看过上面的改动后，加 --yes 再跑一次");
  }

  function intent() {
    gateway.setIntent?.(`publish the PRD for ${key} to the configured destination. The user reviewed the plan printed by beepress prd and re-ran it with --yes.`);
  }

  async function publishWhole() {
    intent();
    let target = docId;
    let url = null;
    if (!target) {
      step("建文档");
      ({ docId: target, url } = await gateway.createBlankDoc({ title }));
    }
    const ids = { ...(docId ? reuse : {}) };
    const pending = shots.order.filter((k) => !ids[k]);
    if (pending.length) {
      step(`追图 ${pending.length} 张`);
      const files = pending.map((k) => shots.files[shots.order.indexOf(k)]);
      Object.assign(ids, alignImages(pending, await gateway.appendImages({ docId: target, files }), target));
    }
    const opsFile = path.join(outDir, "ops.json");
    await render(ids);
    step("写正文");
    await gateway.updateJsonml({ docId: target, opsFile, dryRun: true });
    await gateway.updateJsonml({ docId: target, opsFile });
    await finish(target, url, ids);
  }

  async function publishPatch() {
    intent();
    const ids = { ...planned };
    let fresh = [];
    if (toUpload.length) {
      step(`追图 ${toUpload.length} 张`);
      const files = toUpload.map((k) => shots.files[shots.order.indexOf(k)]);
      const got = alignImages(toUpload, await gateway.appendImages({ docId, files }), docId);
      Object.assign(ids, got);
      fresh = Object.values(got);
    }
    const body = await render(ids);
    // 追图之后目标端多了文末那几张临时图、版本也变了：重新读一次再算补丁
    const now = fresh.length ? await gateway.fetchJsonml(docId) : cloud;
    const p = patchOps({ localBody: body, cloudBody: now.body, base });
    const temp = topLevel(now.body).filter((b) => b[0] !== "table" && imagesIn(b).length && imagesIn(b).every((id) => fresh.includes(id)));
    if (temp.length) p.ops.push({ op: "delete", anchors: temp.map((b) => b[1].id) });
    if (!p.ops.length) return console.log("\n✓ 功能点表和目标端一致，没有要发的");
    const opsFile = path.join(outDir, "patch-ops.json");
    await fs.writeFile(opsFile, `${JSON.stringify(p.ops, null, 2)}\n`);
    step(`补功能点表：改写 ${p.summary.change} · 新增 ${p.summary.insert} · 删除 ${p.summary.delete}`);
    await gateway.updateJsonml({ docId, opsFile, dryRun: true });
    await gateway.updateJsonml({ docId, opsFile });
    await finish(docId, null, ids);
  }

  /** 回读核对四节与配图，记下这一版的功能点表当下次的底稿，回写 FRS */
  async function finish(target, url, ids) {
    step("回读核对");
    const outline = (await gateway.fetchOutline(target)).map((i) => i.text ?? "");
    const lost = SECTIONS.filter((s) => !outline.some((t) => t.includes(s)));
    const after = await gateway.fetchJsonml(target);
    const used = tableParagraphs(after.body).flatMap(imagesIn);
    const foreign = used.filter((id) => !id.endsWith(target));
    await fs.writeFile(path.join(outDir, "base.json"), `${JSON.stringify(tableParagraphs(after.body).map(paraText))}\n`);
    // 沿用的图记它当初传上去那一版的哈希：以后都和那一次发布的目标端版本比，不和某次重拍比
    const hashOf = (k) => (reuse[k] && ids[k] === reuse[k] ? recorded[k].hash : hashes[k]);
    await fs.writeFile(imagesFile, `${JSON.stringify(Object.fromEntries(Object.entries(ids).map(([k, id]) => [k, { imageId: id, hash: hashOf(k) }])), null, 2)}\n`);

    const latest = JSON.parse(await fs.readFile(frsFile, "utf8"));
    latest.prdDocId = target;
    latest.updatedAt = today();
    await fs.writeFile(frsFile, `${JSON.stringify(latest, null, 2)}\n`);

    console.log(`\n✓ 已发布（目标端第 ${after.version} 版，功能点表配图 ${used.length} 张）${url ? `：${url}` : ""}`);
    if (!docId) console.log(`  docId 已写回 FRS.json 的 prdDocId；之后再跑就是更新这一篇`);
    if (lost.length) console.log(`  ⚠️ 大纲里没找到：${lost.join("、")}，打开文档看一眼`);
    if (foreign.length) console.log(`  ⚠️ ${foreign.length} 张图的 imageId 不属于这篇文档，渲染时会挂：重跑一次会重新上传`);
    if (Object.keys(ids).length < shots.order.length) console.log("  ⚠️ 有图没传上，参考图列留了占位");
  }
}

const topLevel = (body) => (body[0] === "root" ? body.slice(2) : body);

/** 一个节点里所有配图的 imageId */
function imagesIn(node) {
  const out = [];
  (function walk(n) {
    if (!Array.isArray(n)) return;
    if (n[1]?.imageId) out.push(n[1].imageId);
    n.slice(2).forEach(walk);
  })(node);
  return out;
}

main().catch((e) => stop(e.message));
