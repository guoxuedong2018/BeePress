#!/usr/bin/env node
/**
 * 把「本地重新渲染的 PRD 正文」与「云文档现状」逐段对齐，只为**变化的段落**生成 ops。
 * ------------------------------------------------------------------
 * 为什么不直接 setBodyChildren：整篇覆盖会把别人在文档里的手工订正一起抹掉，
 * 而 PRD 是要给研发看的协作文档，评审期间对方会直接在上面改。整篇覆盖只适合首发。
 *
 * 只比功能点表（两边都只取表格）：需求背景、方案设计里有 Mermaid 与列表，按段替换容易把结构弄坏，
 * 这几段变了由调用方提醒人。
 *
 * 对齐方式是按段落文本做 LCS（配图按 imageId 算进文本，换了图也算这一段变了）：
 *   - 文本相同        → 跳过
 *   - 1:1 变化        → setInline（保留段落 ID、列表归属与评论锚点，只换行内内容）
 *   - 本地多出        → insert，锚在上一段之后，列表属性沿用邻居（新列表 ID 会断号）
 *   - 云端多出        → delete
 *
 * 给了底稿（上次发布后云端的段落文本）时，云端那段对不上底稿的——有人在云文档里改过或加过——
 * 不改也不删，列出来交给人。没有底稿就分不清，所有改写与删除都会落到云端现状上。
 *
 * 用法：
 *   npx builder-kit prd-patch-ops <FEATURE_KEY> --cloud <fetch-jsonml 的输出> [--base <底稿>] [--out <ops 文件>]
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PRD_DIR, REPO_ROOT } from "./lib/paths.mjs";

/** 段落的可比较文本：忽略空白，行内样式不参与比较（样式改动跟着文本一起重写）；配图记成它的 imageId */
export function paraText(node) {
  const out = [];
  (function walk(n) {
    if (typeof n === "string") {
      out.push(n);
      return;
    }
    if (!Array.isArray(n)) return;
    if (n[1]?.imageId) out.push(`[图:${n[1].imageId}]`);
    n.slice(2).forEach(walk);
  })(node);
  return out.join("").replace(/\s+/g, "");
}

/** 深度优先收集所有段落节点（表格单元格里的段落也在内） */
function collectParagraphs(node, acc) {
  if (!Array.isArray(node)) return acc;
  if (node[0] === "p") {
    acc.push(node);
    return acc;
  }
  node.slice(2).forEach((child) => collectParagraphs(child, acc));
  return acc;
}

const topBlocks = (body) => (body[0] === "root" ? body.slice(2) : body);

/** 一篇正文里功能点表的全部段落 */
export function tableParagraphs(body) {
  return collectParagraphs(["root", {}, ...topBlocks(body).filter((b) => b[0] === "table")], []);
}

/** 功能点表以外的块（标题之外）：需求背景、原型地址、方案设计。只用来判断这几段有没有变 */
export function proseTexts(body) {
  return topBlocks(body)
    .filter((b) => b[0] !== "table" && b[0] !== "title")
    .map(paraText)
    .filter(Boolean);
}

/** 标准 LCS，回溯出 equal / replace / insert / delete 四种编辑 */
function diff(a, b) {
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const script = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      script.push({ type: "equal", i, j });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      script.push({ type: "delete", i });
      i += 1;
    } else {
      script.push({ type: "insert", j, after: i - 1 });
      j += 1;
    }
  }
  while (i < n) script.push({ type: "delete", i: i++ });
  while (j < m) script.push({ type: "insert", j: j++, after: n - 1 });

  // 相邻的一删一增合并成 setInline：段落 ID、列表归属、评论锚点都留在原地
  const merged = [];
  for (let k = 0; k < script.length; k += 1) {
    const cur = script[k];
    const next = script[k + 1];
    if (cur.type === "delete" && next?.type === "insert") {
      merged.push({ type: "change", i: cur.i, j: next.j });
      k += 1;
    } else {
      merged.push(cur);
    }
  }
  return merged;
}

/**
 * @param localBody  本地渲染出的正文（setBodyChildren 的 content）
 * @param cloudBody  fetch-jsonml 拿到的 result.body
 * @param base       上次发布后云端功能点表的段落文本；null 表示没有底稿
 * @returns { ops, summary, lines, kept }  kept 是有人改过、这次没动的段落
 */
export function patchOps({ localBody, cloudBody, base = null }) {
  const cloudParas = tableParagraphs(cloudBody);
  const localParas = tableParagraphs(localBody);
  const cloudText = cloudParas.map(paraText);
  const localText = localParas.map(paraText);
  const show = (t, n) => t.replace(/\[图:[^\]]+\]/g, "[图]").slice(0, n);
  const published = base ? new Set(base) : null;
  // 云端这一段是不是我们上次发出去的样子：不是就说明有人动过，不替人改
  const touched = (i) => published && !published.has(cloudText[i]);

  const ops = [];
  const lines = [];
  const kept = [];
  const summary = { change: 0, insert: 0, delete: 0 };
  // 插入只能锚在**这批操作之后还活着**的段落上：锚到同批里已被删掉的段落会直接报错
  let lastKept = -1;
  for (const step of diff(cloudText, localText)) {
    if (step.type === "equal") {
      lastKept = step.i;
      continue;
    }
    if (step.type === "change" || step.type === "delete") {
      if (touched(step.i)) {
        lastKept = step.i;
        kept.push(show(cloudText[step.i], 80));
        continue;
      }
      const anchor = cloudParas[step.i][1]?.id;
      if (!anchor) throw new Error(`云端段落缺 id：${cloudText[step.i].slice(0, 30)}`);
      if (step.type === "change") {
        lastKept = step.i;
        ops.push({ op: "setInline", anchor, content: localParas[step.j].slice(2) });
        summary.change += 1;
        lines.push(`  ~ ${show(cloudText[step.i], 42)}\n    → ${show(localText[step.j], 42)}`);
      } else {
        ops.push({ op: "delete", anchors: [anchor] });
        summary.delete += 1;
        lines.push(`  - ${show(cloudText[step.i], 48)}`);
      }
      continue;
    }
    const prev = cloudParas[lastKept];
    if (!prev) throw new Error("新增段落前面没有可用锚点（都被删了或落在开头），需人工指定");
    const node = localParas[step.j];
    // 列表属性沿用邻居，只保留本地的层级，否则新段落会自成一列表、编号从 1 重来
    const attrs = { ...node[1] };
    if (attrs.list && prev[1]?.list) {
      attrs.list = { ...prev[1].list, level: attrs.list.level ?? 0 };
    }
    const block = [node[0], attrs, ...node.slice(2)];
    // 连续新增必须并进同一个 insert：分开提交时每条都锚在同一段之后，顺序会整个翻过来
    const last = ops[ops.length - 1];
    if (last?.op === "insert" && last.anchor === prev[1].id) {
      last.content.push(block);
    } else {
      ops.push({ op: "insert", anchor: prev[1].id, position: "after", content: [block] });
    }
    summary.insert += 1;
    lines.push(`  + ${show(localText[step.j], 48)}`);
  }
  return { ops, summary, lines, kept, cloudCount: cloudParas.length, localCount: localParas.length };
}

function parseArgs(argv) {
  const args = { key: null, cloud: null, base: null, out: null };
  for (let i = 0; i < argv.length; i += 1) {
    const [flag, inline] = argv[i].split("=");
    const take = () => inline ?? argv[++i];
    if (flag === "--cloud") args.cloud = take();
    else if (flag === "--base") args.base = take();
    else if (flag === "--out") args.out = take();
    else if (!flag.startsWith("-")) args.key = flag;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.key || !args.cloud) {
    console.error("用法: npx builder-kit prd-patch-ops <FEATURE_KEY> --cloud <fetch-jsonml 的输出> [--base <底稿>] [--out <文件>]");
    process.exitCode = 1;
    return;
  }

  const localOps = JSON.parse(await fs.readFile(path.join(PRD_DIR, args.key, "ops.json"), "utf8"));
  const cloudRaw = JSON.parse(await fs.readFile(args.cloud, "utf8"));
  const cloudBody = (cloudRaw.data?.result ?? cloudRaw.result ?? cloudRaw).body;
  const base = args.base ? JSON.parse(await fs.readFile(args.base, "utf8")) : null;
  const r = patchOps({ localBody: localOps[0].content, cloudBody, base });

  const outFile = args.out ? path.resolve(REPO_ROOT, args.out) : path.join(PRD_DIR, args.key, "patch-ops.json");
  await fs.writeFile(outFile, `${JSON.stringify(r.ops, null, 2)}\n`, "utf8");

  console.log(`云端 ${r.cloudCount} 段 / 本地 ${r.localCount} 段 → 改写 ${r.summary.change}、新增 ${r.summary.insert}、删除 ${r.summary.delete}`);
  if (r.kept.length) console.log(`云端有人改过、没动 ${r.kept.length} 段`);
  console.log(`补丁写入 ${path.relative(REPO_ROOT, outFile)}`);
  for (const line of r.lines) console.log(line);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
