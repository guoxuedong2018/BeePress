import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * 知识库 Markdown 的最小工具集
 * ==================================================================
 * 标题 → 锚点的规则此前在 kb-index / kb-publish / render-notice 各写一份，注释里
 * 互相提醒「三处必须一致」——靠提醒维持一致性迟早失守。收到这里只定义一次。
 *
 * front-matter 只认 `key: value` 与 `key: [a, b]` 两种写法，够知识库用且不引依赖。
 */

/** 标题 → 锚点。与云文档 / GitHub 的中文锚点规则一致：去标点、空格转连字符。 */
export function slugify(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[（）()「」《》【】、，。：；！？,.:;!?/\\]/g, "")
    .replace(/\s+/g, "-");
}

export function parseFrontMatter(text) {
  const normalized = String(text ?? "").replace(/\r\n/g, "\n").replace(/^\uFEFF/, "");
  const m = normalized.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { data: {}, body: normalized, raw: "" };
  const data = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    const [, key, raw] = kv;
    const v = raw.trim();
    data[key] =
      v.startsWith("[") && v.endsWith("]")
        ? v.slice(1, -1).split(",").map((s) => s.trim()).filter(Boolean)
        : v;
  }
  return { data, body: normalized.slice(m[0].length), raw: m[0] };
}

export function renderFrontMatter(data) {
  const lines = ["---"];
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || v === null) continue;
    lines.push(Array.isArray(v) ? `${k}: [${v.join(", ")}]` : `${k}: ${v}`);
  }
  lines.push("---");
  return `${lines.join("\n")}\n`;
}

/**
 * 正文里的 H2/H3 标题，带行号。代码块里的 `#` 不是标题——mermaid 与 bash 注释都会误命中，
 * 所以先把围栏块内的行清空（保留行数，行号才对得上）。
 */
export function headings(body) {
  const lines = body.split("\n");
  const out = [];
  let inFence = false;
  lines.forEach((line, i) => {
    if (/^```/.test(line)) inFence = !inFence;
    if (inFence) return;
    const h = line.match(/^(#{1,3})\s+(.*\S)\s*$/);
    if (!h) return;
    out.push({ level: h[1].length, text: h[2], anchor: slugify(h[2]), line: i });
  });
  return out;
}

/**
 * 某个锚点所辖的行区间 [start, end)：从标题行起，到下一个同级或更高级标题为止。
 * 找不到返回 null——调用方据此报错，不要静默落到页首。
 */
export function sectionRange(body, anchor) {
  const hs = headings(body);
  const idx = hs.findIndex((h) => h.anchor === anchor || h.text === anchor);
  if (idx < 0) return null;
  const head = hs[idx];
  const next = hs.slice(idx + 1).find((h) => h.level <= head.level);
  const lines = body.split("\n");
  return { start: head.line, end: next ? next.line : lines.length, heading: head };
}

/** 页面 A 引用产物 B 的相对路径，两者都相对 docs/kb/ */
export function relativeAsset(fromPage, assetPath) {
  const rel = path.posix.relative(path.posix.dirname(fromPage), assetPath);
  return rel.startsWith(".") ? rel : `./${rel}`;
}

/** 把一段块插进正文；返回新正文。block 两端自带空行，不与相邻内容粘连。 */
export function insertBlock(body, block, { op, anchor }) {
  const lines = body.replace(/\s+$/, "").split("\n");
  const chunk = block.trim();

  if (op === "append-page") {
    return `${lines.join("\n")}\n\n${chunk}\n`;
  }

  const range = sectionRange(body, anchor);
  if (!range) throw new Error(`锚点不存在：#${anchor}`);

  if (op === "append-section") {
    // 在下一节标题之前插入，节尾多余空行先收掉
    let end = Math.min(range.end, lines.length);
    while (end > range.start + 1 && lines[end - 1].trim() === "") end -= 1;
    const before = lines.slice(0, end);
    const after = lines.slice(end);
    return `${[...before, "", chunk, ...(after.length ? ["", ...after.filter((l, i) => !(i === 0 && l.trim() === ""))] : [])].join("\n")}\n`;
  }

  if (op === "replace-section") {
    const before = lines.slice(0, range.start + 1);
    const after = lines.slice(Math.min(range.end, lines.length));
    return `${[...before, "", chunk, ...(after.length ? ["", ...after.filter((l, i) => !(i === 0 && l.trim() === ""))] : [])].join("\n")}\n`;
  }

  throw new Error(`不认识的写入方式：${op}`);
}

/** 读一页并拆出 front-matter；文件不存在返回 null */
export async function readPage(kbDir, rel) {
  const text = await fs.readFile(path.join(kbDir, rel), "utf8").catch(() => null);
  if (text === null) return null;
  return { rel, text, ...parseFrontMatter(text) };
}

/** 把 Markdown 压成一句话：去图片、链接留文字、去强调符号 */
export function plainText(md) {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>#]+/g, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/** FRS 文案里的 PRD 排版记号，进手册前要洗掉：`==重点==` 与 `{$变量}` 对读者没有意义 */
export function stripPrdMarkup(text) {
  return String(text)
    .replace(/==([^=]+)==/g, "$1")
    .replace(/\{\$([^}]+)\}/g, "$1");
}

/**
 * 代码块与行内代码原样盖成空格（换行保留，下标与行号不变）。
 * 写作约定里要举「事实标记怎么写」「图片链接怎么写」的例子，例子写在代码里——
 * 不遮掉的话，例子本身会被当成真引用，发布时还会被剥成没有标记的样子。
 */
const CODE_RE = /```[\s\S]*?(?:```|$)|`[^`\n]+`/g;
export const maskCode = (s) => String(s ?? "").replace(CODE_RE, (m) => m.replace(/[^\n]/g, " "));

/**
 * 一页的章节：`{ level, text, line, bodyEnd, end }`，行号从 1 起、按整篇文件算（与 parseRefs 一致）。
 *   bodyEnd  这一节自己的正文到哪（第一个子标题之前）
 *   end      这一节连同子节到哪（下一个同级或更高级标题之前）
 * 代码块里的 `#` 不算标题。
 */
export function sectionsOf(text) {
  const lines = String(text ?? "").split("\n");
  const masked = maskCode(text).split("\n");
  const { body } = parseFrontMatter(text);
  const offset = lines.length - body.split("\n").length;
  const out = [];
  for (let i = offset; i < masked.length; i++) {
    const m = masked[i].match(/^(#{1,6})\s+(.+?)\s*$/);
    if (m) out.push({ level: m[1].length, text: lines[i].replace(/^#{1,6}\s+/, "").trim(), line: i + 1 });
  }
  for (const [k, s] of out.entries()) {
    const next = out.slice(k + 1);
    s.end = (next.find((n) => n.level <= s.level)?.line ?? lines.length + 1);
    s.bodyEnd = next[0] && next[0].line < s.end ? next[0].line : s.end;
  }
  return out;
}

/** 一条引用落在哪一节：它前面最近的那个标题 */
export function sectionOfLine(sections, line) {
  let hit = null;
  for (const s of sections) if (s.line <= line) hit = s;
  return hit;
}
