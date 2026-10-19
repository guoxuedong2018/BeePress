#!/usr/bin/env node
/**
 * 知识库发布：docs/kb/ → 外部文档服务
 * ------------------------------------------------------------------
 * 仓库里的 Markdown 是真源，外部文档是它的一个渲染视图。**不要在外部文档里直接改正文**
 * ——下次发布会被覆盖，而且改动没进版本库。
 *
 * ## 为什么是这个流程
 *
 * 三条实测结论决定了它长这样：
 *
 * 1. **知识库不支持真文件夹。** 层级靠「空文档当节点」实现：建一个标题为「资产」的
 *    文档，拿它自己的 `viewId` 当子页的 `--parent-view-id`。我们把每个目录的
 *    `overview.md` 直接当成这个节点文档，于是目录节点同时也是域概述页。
 *
 * 2. **相对链接的 href 会被吃掉，绝对链接不会。** `[x](./y.md)` 发上去只剩蓝色下划线
 *    文字、点不动；`[x](https://<外部文档域名>/...#h.xxx)` 则完整保留，
 *    连锚点片段都在。所以链接在**上传前**就改写成绝对云地址，不做发布后的 JsonML 手术。
 *
 * 3. **图片不用自己传。** 带图的页打成 zip 走 `--content-zip`，CLI 会按 zip 内
 *    Markdown 所在目录解析相对路径并自动上传——不需要 `append-image` 拿 imageId
 *    再用 JsonML 归位。zip 里必须保持原目录层级，摊平就找不着图。
 *
 * 4. **标题锚点是服务端生成的不透明 id**（`h.xxxx`），发布后才知道。所以首次发布时
 *    跨页链接必然解析不了——**第一趟建立地址，第二趟链接才全通**。脚本会提示再跑一次，
 *    之后稳态一趟即可（内容没变的页按 hash 跳过）。
 *
 * ## 用法
 *
 *   npx builder-kit kb-publish --root <知识库根 viewId>   # 首次，之后从状态文件读
 *   npx builder-kit kb-publish --dry-run                  # 只看计划，不动云端
 *   npx builder-kit kb-publish --only evaluation/         # 只发某个前缀
 *
 * 状态落在 docs/kb/_published.json：`viewId` 用来当爹，`docId` 用来被链接，
 * `anchors` 是深链的落点表。这份文件是派生物，但**必须入库**——它是下次发布与
 * 通告深链的唯一依据，丢了就得整库重发。
 */

import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { KB_DIR } from "./lib/paths.mjs";
import { parseFrontMatter, slugify } from "./lib/kb-md.mjs";
import { stripFactMarks } from "./lib/content-build.mjs";
import { planOf, stripPlanMarks } from "./lib/plan-marks.mjs";
import { compareMedia, hashMedia, storeBlob } from "./lib/media-ledger.mjs";

import { createDoc, fetchOutline, setIntent, shellQuote, updateJsonml, writeDoc } from "./lib/docs-gateway.mjs";

const STATE_FILE = path.join(KB_DIR, "_published.json");
const TMP_DIR = path.join(os.tmpdir(), "builder-kit-publish");
/**
 * 外部文档地址前缀（到 `/k/home` 为止）。它是服务域名，按硬性规则 10 不写进仓库：
 * 从上次发布记下的页面地址里取，首次发布还没有任何地址时用 `--doc-base` 给一次。
 */
let DOC_BASE = null;
function docBaseOf(state, flag) {
  if (flag) return flag.replace(/\/+$/, "");
  const url = Object.values(state.pages ?? {}).find((p) => p.url)?.url;
  return url ? url.replace(/\/[^/]+\/[^/]+$/, "") : null;
}
/**
 * 纸张宽度。服务端默认 A4，对这类带宽表格和整页截图的文档太窄——
 * 功能点表、字段矩阵、1920 宽的配图在 A4 下都会被挤成一团。
 *
 * 只能走 `setAttrs @root`，Markdown 通道表达不了文档级样式。
 * 取值：A3 / A4 / A5 / Letter / Legal / Custom。
 */
const PAPER = "A3";

// ---------------------------------------------------------------- CLI

function parseArgs(argv) {
  const args = { root: null, docBase: null, dryRun: false, only: [], force: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const [flag, inline] = argv[i].split("=");
    const take = () => inline ?? argv[++i];
    if (flag === "--root") args.root = take();
    else if (flag === "--doc-base") args.docBase = take();
    else if (flag === "--dry-run") args.dryRun = true;
    else if (flag === "--force") args.force = true;
    else if (flag === "--only") args.only.push(take());
    else if (flag === "--help" || flag === "-h") args.help = true;
  }
  return args;
}

// ---------------------------------------------------------------- 正文处理

// 标题 → 锚点与 front-matter 只在 lib/kb-md.mjs 定义一次，与 kb-index 同源

/**
 * 把一页 Markdown 渲染成可上传的正文。
 *
 * 做三件事：
 *   - 剥 front-matter（它会原样显示成一段裸文本）
 *   - 去掉与文档标题重复的首个 H1（`+create --title` 已经给了标题）
 *   - 相对链接 → 绝对云链接。目标还没发布时保持原样，本轮记一笔待解析
 */
function renderBody(relPath, raw, state) {
  const { data, body } = parseFrontMatter(raw);
  // 事实标记是给构建链路看的（<!--f 依据-->原文<!--/f-->），读者不需要；外部文档也未必把注释当注释
  // 蓝图标记（节意图、没填的格子）同理：读者只看按蓝图写成的文档
  let text = stripPlanMarks(stripFactMarks(body)).replace(/^\s*#\s+.*\n+/, ""); // 首个 H1
  const unresolved = [];

  // 功能还在迭代的页，读者有权在读第一句之前就知道。
  // 不拦发布——拦了就是「明知在改所以什么都不给」，比给一份带日期的旧版更糟
  const churning = typeof data.iterating === "string" && data.iterating.trim() && data.iterating.trim() !== "false";
  if (churning) text = `> ⚠️ 这一页对应的功能正在迭代：${data.iterating.trim()}。以原型实际表现为准，截图与步骤可能落后。\n\n${text}`;

  text = text.replace(/\[([^\]]+)\]\((\.[^)\s#]*\.md)(#[^)\s]*)?\)/g, (whole, label, rel, frag) => {
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(relPath), rel));
    const page = state.pages[target];
    if (!page?.docId) {
      unresolved.push(`${label} → ${target}`);
      return whole;
    }
    let url = `${DOC_BASE}/${page.viewId}/${page.docId}`;
    if (frag) {
      const anchor = page.anchors?.[slugify(decodeURIComponent(frag.slice(1)))];
      if (anchor) url += `#${anchor}`;
      else unresolved.push(`${label} → ${target}${frag}（锚点未采集）`);
    }
    return `[${label}](${url})`;
  });

  return { title: data.title ?? path.basename(relPath, ".md"), text, unresolved, data };
}

/**
 * 把一页打包成 CLI 的内容参数。
 *
 * 没图的页直接 `--content-file`。有图的页走 `--content-zip`：CLI 会解压后
 * **按 zip 内 Markdown 所在目录解析相对图片路径，自己上传图片**——
 * 所以不需要 `append-image` 拿 imageId 再用 JsonML 归位那一整套。
 *
 * 关键是 zip 里要**保持原有目录层级**：正文在 `evaluation/x.md`、图片在
 * `images/evaluation-x/*.png`，`../images/...` 才解析得到。摊平成一层就找不着图。
 */
async function packSource(relPath, text) {
  const refs = mediaRefs(text);

  if (refs.length === 0) {
    const file = path.join(TMP_DIR, relPath.replace(/\//g, "__"));
    await fs.writeFile(file, text);
    return `--content-file ${shellQuote(file)}`;
  }

  const stage = path.join(TMP_DIR, `zip-${relPath.replace(/\W/g, "_")}`);
  await fs.rm(stage, { recursive: true, force: true });
  const mdIn = path.join(stage, relPath);
  await fs.mkdir(path.dirname(mdIn), { recursive: true });
  await fs.writeFile(mdIn, text);

  for (const ref of new Set(refs)) {
    const src = path.resolve(path.dirname(path.join(KB_DIR, relPath)), ref);
    const dst = path.resolve(path.dirname(mdIn), ref);
    const srcRel = path.relative(KB_DIR, src);
    const dstRel = path.relative(stage, dst);
    if (!srcRel || srcRel.startsWith("..") || path.isAbsolute(srcRel)) {
      throw new Error(`${relPath} 引用的图片越出了 docs/kb：${ref}`);
    }
    if (!dstRel || dstRel.startsWith("..") || path.isAbsolute(dstRel)) {
      throw new Error(`${relPath} 引用的图片越出了发布暂存目录：${ref}`);
    }
    await fs.mkdir(path.dirname(dst), { recursive: true });
    await fs.copyFile(src, dst).catch(() => {
      throw new Error(`${relPath} 引用的图片不存在：${ref}`);
    });
  }

  const zip = path.join(TMP_DIR, `${relPath.replace(/\W/g, "_")}.zip`);
  await fs.rm(zip, { force: true });
  await new Promise((resolve, reject) => {
    const p = spawn("zip", ["-q", "-r", zip, "."], { cwd: stage, stdio: ["ignore", "ignore", "pipe"] });
    let e = "";
    p.stderr.on("data", (d) => (e += d));
    p.on("error", (err) => reject(new Error(`启动不了 zip：${err.message}`)));
    p.on("exit", (c) => (c === 0 ? resolve() : reject(new Error(`zip 失败：${e}`))));
  });
  return `--content-zip ${shellQuote(zip)}`;
}

/** 旧版指纹：正文 + 引用媒体的原始字节揉成一个值。只用来认出还没记 fp 的老条目 */
async function contentHash(relPath, text) {
  const h = createHash("sha256").update(text);
  for (const ref of mediaRefs(text).sort()) {
    const abs = path.resolve(path.dirname(path.join(KB_DIR, relPath)), ref);
    const buf = await fs.readFile(abs).catch(() => null);
    h.update(ref).update(buf ?? Buffer.alloc(0));
  }
  return h.digest("hex").slice(0, 16);
}

const kbRel = (relPath, ref) => path.relative(KB_DIR, path.resolve(path.dirname(path.join(KB_DIR, relPath)), ref)).split(path.sep).join("/");

/**
 * 指纹：正文一个值，每张图各一个值。
 *
 * 图分开记，是因为「字节不同」不等于「画面变了」：重拍一次，角标抗锯齿、字体换入的时机
 * 都会让字节变而画面不变。揉成一个值的话，每次全量重拍都会把所有带图的页推一遍，
 * 云端的修订历史被刷成噪音。分开之后字节不同的图再比一次画面，没变就当没变。
 */
async function fingerprint(relPath, text) {
  const media = {};
  for (const ref of [...new Set(mediaRefs(text))].sort()) media[ref] = await hashMedia(kbRel(relPath, ref));
  return { text: createHash("sha256").update(text).digest("hex").slice(0, 16), media };
}

/** 与上次发出去的比，这一页要不要动。返回 null 表示内容没变 */
async function changeOf(relPath, text, prev, fp, force) {
  if (!prev?.docId) return "新建";
  if (force || prev.paper !== PAPER) return "更新";
  if (!prev.fp) return prev.hash === (await contentHash(relPath, text)) ? null : "更新";
  if (prev.fp.text !== fp.text) return "更新";
  for (const ref of new Set([...Object.keys(prev.fp.media), ...Object.keys(fp.media)])) {
    const was = prev.fp.media[ref];
    const now = fp.media[ref];
    if (was === now) continue;
    if (!was || !now || !ref.endsWith(".png")) return "更新";
    await storeBlob(kbRel(relPath, ref));
    // 缓存里没有发出去那一版就比不了，比不了按变了算——宁可多发一次也不漏
    if (!(await compareMedia(was, now)).same) return "更新";
  }
  return null;
}

/** 发出去的每张图留一份在内容寻址缓存里，下次才比得了画面 */
async function keepPublished(relPath, fp) {
  for (const ref of Object.keys(fp.media)) await storeBlob(kbRel(relPath, ref));
}

/** 正文里引用的本地图片 / 媒体路径（http 外链不算，它们不归我们管） */
function mediaRefs(text) {
  return [...text.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)]
    .map((m) => m[1])
    .filter((s) => !/^https?:/.test(s));
}

// ---------------------------------------------------------------- 树与顺序

async function walk(dir) {
  const out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".") || e.name === "images" || e.name === "media") continue;
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(abs)));
    else if (e.name.endsWith(".md")) out.push(abs);
  }
  return out;
}

/**
 * 发布顺序必须是拓扑序：父节点先建，子页才拿得到 `--parent-view-id`。
 *
 * 规则：根目录的 README 先发（它是知识库首页），然后每个目录先发 `overview.md`
 * 当节点、再发该目录其余页。这也是为什么每个目录都必须有 overview——
 * 没有的话就得为特例写分支。
 */
function orderPages(files) {
  const rel = files.map((f) => path.relative(KB_DIR, f).split(path.sep).join("/"));
  const root = rel.filter((r) => !r.includes("/")).sort();
  const dirs = [...new Set(rel.filter((r) => r.includes("/")).map((r) => r.split("/")[0]))].sort();
  const ordered = [...root];
  for (const d of dirs) {
    const inDir = rel.filter((r) => r.startsWith(`${d}/`));
    const overview = inDir.find((r) => r.endsWith("/overview.md"));
    if (!overview) throw new Error(`目录 ${d}/ 缺 overview.md——它要当知识库的目录节点`);
    ordered.push(overview, ...inDir.filter((r) => r !== overview).sort());
  }
  return ordered;
}

/** 子页挂在同目录 overview 的 viewId 下；根目录的页挂知识库根 */
function parentOf(relPath, state) {
  const dir = path.posix.dirname(relPath);
  if (dir === ".") return state.rootViewId;
  if (relPath.endsWith("/overview.md")) return state.rootViewId;
  const nodeView = state.pages[`${dir}/overview.md`]?.viewId;
  if (!nodeView) throw new Error(`${relPath} 的父节点 ${dir}/overview.md 还没发布`);
  return nodeView;
}

// ---------------------------------------------------------------- 主流程

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(
      [
        "用法: npx builder-kit kb-publish [选项]",
        "",
        "  --root <viewId>   知识库根节点，首次必填，之后从状态文件读",
        "  --doc-base <前缀> 外部文档地址前缀（到 /k/home），首次必填，之后从状态文件里的页面地址推出",
        "  --dry-run         只打印计划，不动云端",
        "  --only <前缀>     只发路径以此开头的页，可重复",
        "  --force           忽略 hash，强制重写（修复线上被写坏的页）",
      ].join("\n"),
    );
    return;
  }

  const state = await fs
    .readFile(STATE_FILE, "utf8")
    .then(JSON.parse)
    .catch(() => ({ rootViewId: null, pages: {} }));
  if (args.root) state.rootViewId = args.root;
  if (!state.rootViewId) throw new Error("没有知识库根节点，首次发布请带 --root <viewId>");
  DOC_BASE = docBaseOf(state, args.docBase);
  if (!DOC_BASE) throw new Error("不知道外部文档地址前缀，首次发布请带 --doc-base <前缀>（服务域名不入库，只记在本地发布状态里）");

  await fs.mkdir(TMP_DIR, { recursive: true });
  const paperOps = path.join(TMP_DIR, "paper.json");
  await fs.writeFile(
    paperOps,
    JSON.stringify([{ op: "setAttrs", anchor: "@root", attrs: { paper: PAPER } }]),
  );
  const ordered = orderPages(await walk(KB_DIR));
  const chosen = ordered.filter(
    (r) => args.only.length === 0 || args.only.some((p) => r.startsWith(p)),
  );

  // 蓝图里还有格子没填的页：规划了要用截图 / 录屏讲，却还没拍。
  // 新页等填完再发——读者看到的会是该有图的几节空着，而且没有任何提示；
  // 已经发过的页照常更新，只提醒：为了一个新加的格子卡住整页的文字修正，得不偿失
  const picked = [];
  const held = [];
  const local = [];
  for (const r of chosen) {
    const raw = await fs.readFile(path.join(KB_DIR, r), "utf8");
    // 写给维护者的页（写作约定）只在本地用；云端已有的那篇不删不改
    if (String(parseFrontMatter(raw).data.publish ?? "").trim() === "false") {
      local.push(r);
      continue;
    }
    const n = planOf(raw).slots.length;
    if (n && !state.pages[r]) held.push(`${r}（${n} 格）`);
    else {
      if (n) console.log(`  ⚠️ ${r} 还有 ${n} 个格子没填，这次照常更新`);
      picked.push(r);
    }
  }

  console.log(`知识库根 ${state.rootViewId}，共 ${ordered.length} 页，本轮处理 ${picked.length} 页`);
  if (held.length) console.log(`  先不发（新页，蓝图里还有格子没填）：${held.join("、")}`);
  if (local.length) console.log(`  不发布（front-matter 写了 publish: false）：${local.join("、")}`);
  if (args.dryRun) {
    // 要真算一遍 hash，否则「会不会更新」这个最想知道的事恰恰看不出来
    const tally = {};
    for (const r of picked) {
      const raw = await fs.readFile(path.join(KB_DIR, r), "utf8");
      const { text } = renderBody(r, raw, state);
      const act = (await changeOf(r, text, state.pages[r], await fingerprint(r, text), args.force)) ?? "跳过";
      tally[act] = (tally[act] ?? 0) + 1;
      if (act !== "跳过") console.log(`  [${act}] ${r}`);
    }
    console.log(
      `\n${Object.entries(tally).map(([k, v]) => `${k} ${v}`).join("，")}` +
        (tally["跳过"] ? "（跳过的未逐条列出）" : ""),
    );
    return;
  }

  // 跑到这里是人已经点过头的：审阅台先给他看过这份计划、他点了「确认发布」；命令行则是他亲手去掉了 --dry-run。
  // 把确认意图交给发布适配器（自定义 docs CLI 可以据此决定是否要求二次确认）。
  setIntent(
    "publish the local knowledge base (docs/kb/*.md) to the user's own docs wiki. " +
      "Each cloud doc is a rendered view of a local Markdown file, so overwriting an existing page with --position REPLACE_ALL is the intended, confirmed action.",
  );

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const allUnresolved = [];
  const failed = [];
  let failStreak = 0;

  for (const rel of picked) {
    // 一页失败不拖累后面的页：先记下、接着发下一页，最后一并报。2026-10-08 第 3 页卡住，
    // 排在后面的十几页（包括人正想发的那篇）一页都没轮到。连着三页都失败多半是通道本身断了，再试只是一页页等超时
    if (failStreak >= 3) {
      failed.push({ rel, why: "没轮到：前面连着三页失败，先停下" });
      continue;
    }
    try {
      const r = await publishOne(rel);
      if (r === "created") created += 1;
      else if (r === "updated") updated += 1;
      else skipped += 1;
      failStreak = 0;
    } catch (err) {
      failStreak += 1;
      failed.push({ rel, why: err.message });
      console.log(`  ✗ ${rel}：${err.message}`);
    }
  }

  async function publishOne(rel) {
    const raw = await fs.readFile(path.join(KB_DIR, rel), "utf8");
    const { title, text, unresolved } = renderBody(rel, raw, state);
    // 指纹要带上引用的媒体：图换了但正文一字没改时，只比正文会漏掉这次变更，
    // 云端一直停在旧图上——这是最难发现的一类漂移，它连报错都没有
    const fp = await fingerprint(rel, text);
    const prev = state.pages[rel];

    if (!(await changeOf(rel, text, prev, fp, args.force))) {
      skipped += 1;
      // 老条目只有揉在一起的 hash：既然判定一致，就地补上分开的指纹，以后按画面比
      if (!prev.fp) {
        prev.fp = fp;
        await keepPublished(rel, fp);
        await fs.writeFile(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`);
      }
      if (unresolved.length) allUnresolved.push(...unresolved.map((u) => `${rel}: ${u}`));
      return "skipped";
    }

    const source = await packSource(rel, text);

    let docId;
    let viewId;
    let result;
    if (prev?.docId) {
      // ⚠️ --position 默认是 APPEND_TAIL，不传就是往文末追加、不是替换
      await writeDoc({ docId: prev.docId, source });
      ({ docId, viewId } = prev);
      result = "updated";
      console.log(`  ↻ ${rel}`);
    } else {
      const parent = parentOf(rel, state);
      ({ docId, viewId } = await createDoc({ title, source, parentViewId: parent }));
      result = "created";
      console.log(`  + ${rel}  →  ${docId}`);
    }

    // 纸张只在没设过或改了目标值时动一次，不用每轮都发
    if (prev?.paper !== PAPER) {
      await updateJsonml({ docId, opsFile: paperOps });
    }

    const items = await fetchOutline(docId);
    const anchors = {};
    for (const it of items) anchors[slugify(it.text)] = it.id;

    await keepPublished(rel, fp);
    state.pages[rel] = {
      docId,
      viewId,
      title,
      fp,
      url: `${DOC_BASE}/${viewId}/${docId}`,
      paper: PAPER,
      anchors,
    };
    if (unresolved.length) allUnresolved.push(...unresolved.map((u) => `${rel}: ${u}`));
    await fs.writeFile(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`); // 边跑边存，中断可续
    return result;
  }

  console.log(`\n新建 ${created}，更新 ${updated}，跳过 ${skipped}（内容未变）${failed.length ? `，没发出去 ${failed.length}` : ""}`);

  if (allUnresolved.length) {
    const uniq = [...new Set(allUnresolved)];
    console.log(`\n⚠️  ${uniq.length} 条跨页链接没解析（目标当时还没发布或锚点没采集）：`);
    for (const u of uniq.slice(0, 12)) console.log(`     ${u}`);
    if (uniq.length > 12) console.log(`     …… 还有 ${uniq.length - 12} 条`);
    console.log("\n     这是首次发布的正常现象——地址要发布后才存在。");
    console.log("     现在所有页都有 docId 和锚点了，**再跑一次**就会全部解析。");
  }

  if (failed.length) {
    console.log(`\n✗ ${failed.length} 页没发出去（重跑一次只补这几页，发出去的会跳过）：`);
    for (const f of failed) console.log(`     ${f.rel}：${f.why}`);
    process.exitCode = 1;
  }
}

export { STATE_FILE, contentHash, fingerprint, keepPublished, renderBody };

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`发布失败：${err.message}`);
    process.exitCode = 1;
  });
}
