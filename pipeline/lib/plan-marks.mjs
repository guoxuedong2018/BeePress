/**
 * 蓝图标记：一篇文档的结构规划，就写在 md 里
 * ------------------------------------------------------------------
 * 规划阶段的产出是一张「结构蓝图」：分哪几节、每节回答什么、用什么讲。它不另存一份——
 * 另存就是第二份真源（上一版画布的教训）。蓝图直接落进正文，两种标记，都独占一行：
 *
 *   <!--intent 这一节要回答读者的什么问题-->          紧跟在标题后面
 *   <!--slot 录屏 @/infer-task-new 演示……-->          一个还没填的物料格子
 *
 * slot 的类型：shot 截图 / clip 录屏 / diagram 流程图 / table 表格（中文名也认）。
 * `@路由` 可选，截图与录屏从哪一屏取。格子填上之后，标记就被换成真正的图片 / 录屏引用
 * 或表格、Mermaid 代码块——填了的格子不再是格子，是正文。
 *
 * 发布前两种标记都剥掉：读者看不到蓝图，只看到按蓝图写成的文档。
 * 代码块里的标记不算（写作约定要举例子）。
 */

import { maskCode, sectionOfLine, sectionsOf } from "./kb-md.mjs";
import { SLOT_KINDS } from "./topic-types.mjs";

const KIND_ALIAS = { shot: "shot", 截图: "shot", clip: "clip", 录屏: "clip", diagram: "diagram", 流程图: "diagram", table: "table", 表格: "table" };
export const INTENT_RE = /^\s*<!--intent\s+([\s\S]*?)\s*-->\s*$/;
export const SLOT_RE = /^\s*<!--slot\s+(\S+)(?:\s+@(\S+))?\s*([\s\S]*?)\s*-->\s*$/;

/** 一行是不是蓝图标记（代码块外）。返回解析结果或 null */
function markOf(line) {
  const i = line.match(INTENT_RE);
  if (i) return { mark: "intent", text: i[1] };
  const s = line.match(SLOT_RE);
  if (s && KIND_ALIAS[s[1]]) return { mark: "slot", kind: KIND_ALIAS[s[1]], route: s[2] ?? null, hint: s[3] ?? "" };
  return null;
}

/**
 * 读出蓝图：每节的意图、所有没填的格子。行号从 1 起、按整篇文件算。
 * @returns {{ intents: {line, section, text}[], slots: {line, section, kind, route, hint}[] }}
 */
export function planOf(text) {
  const lines = String(text ?? "").split("\n");
  const masked = maskCode(text).split("\n");
  const sections = sectionsOf(text).filter((s) => s.level >= 2);
  const intents = [];
  const slots = [];
  masked.forEach((m, i) => {
    const mk = markOf(m) && markOf(lines[i]);
    if (!mk) return;
    const sec = sectionOfLine(sections, i + 1);
    const section = sec ? sec.line : null;
    if (mk.mark === "intent") intents.push({ line: i + 1, section, text: mk.text });
    else slots.push({ line: i + 1, section, kind: mk.kind, route: mk.route, hint: mk.hint });
  });
  return { intents, slots };
}

/** 发布前剥掉蓝图标记，连带它留下的空行，不让正文多出一串空段 */
export function stripPlanMarks(md) {
  const lines = String(md ?? "").split("\n");
  const masked = maskCode(md).split("\n");
  const out = [];
  lines.forEach((line, i) => {
    if (markOf(masked[i]) && markOf(line)) {
      if (out.length && out[out.length - 1].trim() === "" && (lines[i + 1] ?? "").trim() === "") out.pop();
      return;
    }
    out.push(line);
  });
  return out.join("\n");
}

/* ------------------------------ 调整蓝图（审阅台的构成视图调用） ------------------------------ */

const SLOT_LINE = ({ kind, route, hint }) => `<!--slot ${kind}${route ? ` @${route}` : ""} ${String(hint ?? "").replace(/-->/g, "").trim()}-->`;

function sectionAt(text, line) {
  const s = sectionsOf(text).find((x) => x.line === Number(line));
  if (!s) throw new Error(`第 ${line} 行不是标题，蓝图可能在你打开之后被改过，刷新一下`);
  return s;
}

/** 这一节自己的正文末尾（子标题之前），往回跳过空行——新东西插在这里 */
function tailOf(lines, s) {
  let at = s.bodyEnd - 1;
  while (at > s.line && lines[at - 1].trim() === "") at--;
  return at;
}

export function setIntent(text, sectionLine, intent) {
  const s = sectionAt(text, sectionLine);
  const lines = text.split("\n");
  const clean = String(intent ?? "").replace(/-->/g, "").trim();
  // 标题后面第一条非空行是意图就换掉，不是就插一条
  let i = s.line;
  while (i < lines.length && lines[i].trim() === "") i++;
  if (i < s.bodyEnd - 1 && INTENT_RE.test(lines[i])) {
    if (clean) lines[i] = `<!--intent ${clean}-->`;
    else lines.splice(i, lines[i + 1]?.trim() === "" ? 2 : 1);
  } else if (clean) lines.splice(s.line, 0, "", `<!--intent ${clean}-->`);
  return lines.join("\n");
}

export function addSlot(text, sectionLine, slot) {
  if (!KIND_ALIAS[slot?.kind]) throw new Error("格子类型要是 截图 / 录屏 / 流程图 / 表格 之一");
  const s = sectionAt(text, sectionLine);
  const lines = text.split("\n");
  lines.splice(tailOf(lines, s), 0, "", SLOT_LINE({ ...slot, kind: KIND_ALIAS[slot.kind] }));
  return lines.join("\n");
}

export function removeSlot(text, line) {
  const lines = text.split("\n");
  const i = Number(line) - 1;
  if (!markOf(lines[i] ?? "") || markOf(lines[i]).mark !== "slot") throw new Error(`第 ${line} 行不是格子，刷新一下`);
  lines.splice(i, 1);
  // 删掉之后上下两行都是空行的话，并成一行
  if (i > 0 && (lines[i - 1] ?? "").trim() === "" && (lines[i] ?? "").trim() === "") lines.splice(i, 1);
  return lines.join("\n");
}

/** 用一段内容换掉一个格子（填格子）。换之前核对这一行确实还是那个格子 */
export function fillSlot(text, line, replacement) {
  const lines = text.split("\n");
  const i = Number(line) - 1;
  if (!markOf(lines[i] ?? "") || markOf(lines[i]).mark !== "slot") throw new Error(`第 ${line} 行已经不是格子了（可能被填过或被改过）`);
  lines.splice(i, 1, ...String(replacement).replace(/\n+$/, "").split("\n"));
  return lines.join("\n");
}

/** 在某一节后面加一节（同级），带意图，正文留空等着填 */
export function addSection(text, afterLine, { title, intent, level }) {
  const s = sectionAt(text, afterLine);
  const lines = text.split("\n");
  const lv = Math.min(4, Math.max(2, Number(level) || s.level));
  // 同级：插在这一节连同子节之后；子级：插在这一节自己的正文末尾
  let at = lv > s.level ? tailOf(lines, s) : s.end - 1;
  while (at > s.line && lines[at - 1].trim() === "") at--;
  const block = ["", `${"#".repeat(lv)} ${String(title).trim()}`, ...(intent ? ["", `<!--intent ${String(intent).replace(/-->/g, "").trim()}-->`] : [])];
  lines.splice(at, 0, ...block);
  return lines.join("\n");
}

/* ------------------------------ 整理与调整（审阅台、命令行、Agent 工具共用） ------------------------------ */

const KIND = { shot: "shot", 截图: "shot", clip: "clip", 录屏: "clip", diagram: "diagram", 流程图: "diagram", table: "table", 表格: "table" };
const HEADING = /^(#{2,4})\s+(\S.*)$/;
/** 路由只收路径形状：它会被写进 md 注释和 front-matter 数组，`-->`、`,`、`]` 都会把标记弄坏 */
export const ROUTE_RE = /^\/[\w\-./?=&%]*$/;

/** 这些行（第一个二级标题往下）是不是只有蓝图：标题、意图、格子、旧骨架的「待撰写」提示 */
export function isPlanOnly(lines) {
  return lines.every((l) => !l.trim() || /^#{2,6}\s/.test(l) || INTENT_RE.test(l) || SLOT_RE.test(l) || /^>\s*待撰写/.test(l));
}

/** 把一份蓝图草稿整理成合法蓝图：认不出的行丢掉并计数，格子类型归一，截图录屏补路由 */
export function normalizeBlueprint(raw, routes = []) {
  const out = [];
  let dropped = 0;
  const warn = [];
  for (const line of String(raw ?? "").split("\n")) {
    // 照抄了指令里的语法示例、给标记套了反引号的，去掉反引号再认
    const l = line.trimEnd().replace(/^(\s*)`(<!--[\s\S]*-->)`$/, "$1$2");
    if (!l.trim()) continue;
    if (HEADING.test(l) || INTENT_RE.test(l)) { out.push(l); continue; }
    const m = l.match(SLOT_RE);
    if (m && KIND[m[1]]) {
      const kind = KIND[m[1]];
      let route = m[2] ?? null;
      if (route && !ROUTE_RE.test(route)) {
        warn.push(`格子「${m[3]}」的路由 ${route} 不像路径，去掉了`);
        route = null;
      }
      if ((kind === "shot" || kind === "clip") && !route && routes.length === 1) route = routes[0];
      if ((kind === "shot" || kind === "clip") && route && routes.length && !routes.includes(route.split("?")[0])) warn.push(`格子「${m[3]}」的 @${route} 不在这篇涉及的页面里`);
      out.push(`<!--slot ${kind}${route && (kind === "shot" || kind === "clip") ? ` @${route}` : ""} ${m[3]}-->`);
      continue;
    }
    dropped++;
  }
  // 标题、意图、格子之间一律空一行：md 里挤在一起不好读，调整蓝图时也好按行增删
  return { text: out.join("\n\n"), dropped, warn };
}

/**
 * 蓝图的一次调整。body：{ op: intent | add-slot | remove-slot | add-section, section | slot | after, expect?, … }
 * expect 是目标行（标题或格子）打开时的原文，对不上说明这期间被改过，拒绝。出错时 error.code 是 400 或 409
 */
export function applyPlanOp(text, body) {
  const lines = text.split("\n");
  const target = Number(body.section ?? body.slot ?? body.after);
  if (!(target >= 1 && target <= lines.length)) throw Object.assign(new Error("行号不对"), { code: 400 });
  if (body.expect != null && lines[target - 1] !== String(body.expect)) throw Object.assign(new Error("这一处在打开之后被改过（Agent 或编辑器），刷新一下再调"), { code: 409 });
  const s = (v, n) => String(v ?? "").replace(/\n/g, " ").trim().slice(0, n);
  switch (body.op) {
    case "intent":
      return setIntent(text, target, s(body.intent, 200));
    case "add-slot": {
      if (!SLOT_KINDS[body.kind]) throw Object.assign(new Error("格子类型要是 shot / clip / diagram / table 之一"), { code: 400 });
      const route = body.route ? s(body.route, 200) : null;
      if (route && !ROUTE_RE.test(route)) throw Object.assign(new Error("路由要是 /xxx 这样的路径"), { code: 400 });
      return addSlot(text, target, { kind: body.kind, route, hint: s(body.hint, 120) || SLOT_KINDS[body.kind] });
    }
    case "remove-slot":
      return removeSlot(text, target);
    case "add-section":
      if (!s(body.title, 60)) throw Object.assign(new Error("要有标题"), { code: 400 });
      return addSection(text, target, { title: s(body.title, 60), intent: s(body.intent, 200), level: Number(body.level) || undefined });
    default:
      throw Object.assign(new Error(`不认识的调整：${body.op}`), { code: 400 });
  }
}
