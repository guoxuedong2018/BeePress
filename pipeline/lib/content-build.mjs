/**
 * 内容构建：md 是叙述的唯一真源，锁记着「写的时候看到的是什么」
 * ==================================================================
 *
 * 这套东西本质上是一个构建系统，和 make 同构：
 *
 *   叙述     手写的源文件            docs/kb/**\/*.md（Agent 写、人审）
 *   截图录屏  可复现的构建产物        配方 + 原型 → docs/kb/images|media（kb shoot）
 *   事实     被校验的断言            md 里用 <!--f 依据-->原文<!--/f--> 标出来
 *   锁       审过的那一刻的依赖哈希   docs/kb/_lock.json
 *
 * 一份文档「要不要审」，只看它引用的东西现在的哈希与锁里记的是否一致：
 *
 *   图 / 录屏    产物字节哈希变了（重拍出来一样就不算——早截断）
 *   需求规格事实  FRS 里那一句的文字变了
 *   源码事实     那句原文在那个文件里找不到了
 *   人工记录事实  验不了，永远不自动报；只计入「未验证」
 *   整份需求     页面 front-matter 挂了 frs: [KEY]，那份 spec 任何一句变了
 *
 * 从前叙述存两份：内容任务 JSON 里一份（46,815 字），下发进 md 又一份。下发后
 * 「页面是真源」，JSON 那份就成了死副本，可画布编辑的偏偏是它。而 md 里的
 * 74 条图片链接本来就带着配方 key——md 自己就装得下全部引用信息。所以只留 md。
 */

import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { isPlanOnly, planOf } from "./plan-marks.mjs";
import { sourcesForRoute } from "./route-source.mjs";
import { frsStatus, loadAllFrs, normRoute, resolveFrsFact, specFingerprint } from "./frs.mjs";
import { maskCode, parseFrontMatter, sectionOfLine, sectionsOf, stripPrdMarkup } from "./kb-md.mjs";
import { compareMedia, hashMedia, loadLedger, sourceDrift, storeBlob } from "./media-ledger.mjs";
import { KB_DIR, REPO_ROOT } from "./paths.mjs";

export { maskCode, sectionOfLine, sectionsOf };

export const LOCK_FILE = path.join(KB_DIR, "_lock.json");

/** 更新日志：由已下线的通告管线生成过，不再更新，也不进审阅 */
const GENERATED = new Set(["changelog.md"]);

const sha = (s) => createHash("sha1").update(String(s)).digest("hex").slice(0, 12);
const flat = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

// ────────────────────────────────────────────────────────────────
// 事实标记
// ────────────────────────────────────────────────────────────────

/**
 * `<!--f 依据-->原文<!--/f-->`
 *
 * 用一对 HTML 注释包住原文，而不是造一种新语法：任何 Markdown 渲染器都把注释
 * 当成不可见，页面读起来和没标一样；解析起来又不会被原文里嵌套的「」绊倒——
 * 手册里「点右上角「创建节点类型」新建」这种套两层的写法很常见。
 * 发布到云文档前由 kb-publish 剥掉。
 */
export const FACT_RE = /<!--f\s+([^>]+?)\s*-->([\s\S]*?)<!--\/f-->/g;


/** 在遮住代码之后的文本上找匹配，返回原文里对应的片段 */
function* matchOutsideCode(text, re) {
  const scan = maskCode(text);
  for (const m of scan.matchAll(re)) {
    const raw = text.slice(m.index, m.index + m[0].length);
    yield { index: m.index, raw, groups: [...raw.matchAll(new RegExp(re.source, re.flags.replace("g", "") + "g"))][0] };
  }
}

export function stripFactMarks(md) {
  const s = String(md ?? "");
  let out = "";
  let last = 0;
  for (const m of matchOutsideCode(s, FACT_RE)) {
    out += s.slice(last, m.index) + m.groups[2];
    last = m.index + m.raw.length;
  }
  return out + s.slice(last);
}

/**
 * 源码去掉注释之后的样子。源码事实只认「会被渲染出来的那部分」：
 * 注释里提到一句文案，不等于界面上有这句话——注释留着、界面改了，事实就该报断。
 * `//` 只在行首或空白后才算注释，免得把字符串里的 `https://` 截掉。
 */
export function codeOnly(src) {
  return String(src ?? "")
    .replace(/<!--[\s\S]*?-->/g, " ")
    // 前面得是行首、空白或分隔符：`accept="image/*,video/*"` 里的 `/*` 不是注释，当成注释会吞掉后面整段模板
    .replace(/(^|[\s;{}(])\/\*[\s\S]*?\*\//g, "$1 ")
    .replace(/(^|\s)\/\/[^\n]*/g, "$1");
}

export function parseBasis(basis) {
  const m = String(basis ?? "").trim().match(/^(frs|code|note):([\s\S]*)$/);
  return m ? { kind: m[1], rest: m[2].trim() } : { kind: "", rest: String(basis ?? "").trim() };
}
export const BASIS_LABEL = { frs: "需求规格", code: "原型代码", note: "人工记录" };

// ────────────────────────────────────────────────────────────────
// 解析：一页 md 引用了什么
// ────────────────────────────────────────────────────────────────

/**
 * @returns [{ id, type: shot|clip|fact|spec, key?, basis?, text?, line, caption? }]
 *   同一个引用在页里出现多次只算一条（第一次出现的行号）。
 */
export function parseRefs(text) {
  const { data, body } = parseFrontMatter(text);
  const offset = text.split("\n").length - body.split("\n").length;
  const lineOf = (idx) => offset + body.slice(0, idx).split("\n").length;
  const out = new Map();
  const put = (ref) => out.has(ref.id) || out.set(ref.id, ref);

  for (const m of matchOutsideCode(body, /!?\[([^\]]*)\]\(([^)\s]+)\)/g)) {
    const [, caption, href] = m.groups;
    const img = href.match(/(?:^|\/)images\/(.+)\.png$/);
    const vid = href.match(/(?:^|\/)media\/(.+)\.(gif|mp4)$/);
    if (img) put({ id: `shot:${img[1]}`, type: "shot", key: img[1], media: `images/${img[1]}.png`, caption, line: lineOf(m.index) });
    else if (vid) put({ id: `clip:${vid[1]}`, type: "clip", key: vid[1], media: `media/${vid[1]}.gif`, caption, line: lineOf(m.index) });
  }
  for (const m of matchOutsideCode(body, FACT_RE)) {
    const basis = m.groups[1].trim();
    const factText = m.groups[2];
    put({ id: `fact:${basis}#${sha(flat(factText))}`, type: "fact", basis, text: factText, line: lineOf(m.index) });
  }
  for (const key of [].concat(data.frs ?? [])) {
    if (key) put({ id: `spec:${key}`, type: "spec", key, line: 1 });
  }
  return [...out.values()];
}


// ────────────────────────────────────────────────────────────────
// 求值：每条引用「现在」是什么
// ────────────────────────────────────────────────────────────────

/**
 * 一次构建里共享的读缓存。台账、FRS、配方都只读一遍。
 */
export function makeResolver() {
  let ledger, frsMap, recipes;
  const fileCache = new Map();
  const readSrc = async (rel) => {
    if (!fileCache.has(rel)) fileCache.set(rel, fs.readFile(path.join(REPO_ROOT, rel), "utf8").catch(() => null));
    return fileCache.get(rel);
  };

  // 审阅台跑在常驻的 dev 服务里：FRS 每个 resolver 重读一遍；配方是 ES 模块，
  // import 的缓存清不掉，只能按修改时间换一个地址——否则改了配方要重启 dev 服务才看得到
  const importFresh = async (file) => {
    const st = await fs.stat(file).catch(() => null);
    return st ? import(`file://${file}?v=${st.mtimeMs}`).catch(() => ({})) : {};
  };
  const r = {
    ledger: async () => (ledger ??= await loadLedger()),
    frs: async () => (frsMap ??= await loadAllFrs({ fresh: true })),
    recipes: async () =>
      (recipes ??= {
        shots: (await importFresh(path.join(KB_DIR, "shots.config.mjs"))).SHOTS ?? {},
        clips: (await importFresh(path.join(KB_DIR, "clips.config.mjs"))).CLIPS ?? {},
      }),

    /**
     * @returns { value, missing?, reason?, unverified?, ...附加信息 }
     *   value 是拿来和锁比的那个值；missing 表示引用本身已经断了（图不在、原文找不到）
     */
    async current(ref) {
      if (ref.type === "shot" || ref.type === "clip") {
        const led = await r.ledger();
        const { shots, clips } = await r.recipes();
        const hasRecipe = ref.type === "shot" ? ref.key in shots : ref.key in clips;
        const meta = led[ref.media];
        const exists = await fs.access(path.join(KB_DIR, ref.media)).then(() => true, () => false);
        if (!exists) return { value: null, missing: true, reason: "图片文件不存在", hasRecipe };
        // 截图按产物字节判：页面没变，冻结动画后截出来就逐字节一致，这才有早截断。
        // 录屏不行——帧时序天然抖动，同一段交互每录一次字节都不同。它能诚实给出的
        // 信号只有「依赖的源码变没变」，所以录屏按源码快照判，而不是按产物
        const value = ref.type === "clip" && meta?.snapshot ? sha(JSON.stringify(Object.entries(meta.snapshot).sort())) : await hashMedia(ref.media);
        return { value, hasRecipe, route: meta?.route ?? (ref.type === "shot" ? shots : clips)[ref.key]?.route ?? null, warnings: meta?.warnings ?? [], inset: meta?.inset };
      }

      if (ref.type === "fact") {
        const { kind, rest } = parseBasis(ref.basis);
        if (kind === "frs") {
          const cur = await resolveFrsFact(rest, await r.frs());
          if (!cur) return { value: null, missing: true, reason: `需求规格里已经找不到这一条（${rest}）` };
          const now = stripPrdMarkup(cur.text);
          return { value: sha(flat(now)), now, adoptable: flat(now) !== flat(ref.text) };
        }
        if (kind === "code") {
          if (!rest || rest.includes("..")) return { value: null, missing: true, reason: "没写这句话出自哪个文件" };
          const src = await readSrc(rest);
          if (src === null) return { value: null, missing: true, reason: `出处的文件 ${rest} 不存在了` };
          const present = flat(codeOnly(src)).includes(flat(stripFactMarks(ref.text)));
          return present ? { value: "present", file: rest } : { value: null, missing: true, reason: `这句话在 ${rest} 里找不到了，界面上的文案可能改了`, file: rest };
        }
        if (kind === "note") return { value: "note", unverified: true };
        return { value: null, missing: true, reason: `看不懂出处的写法：${ref.basis}` };
      }

      if (ref.type === "spec") {
        const frs = (await r.frs()).get(ref.key);
        if (!frs) return { value: null, missing: true, reason: `挂靠的需求 ${ref.key} 不存在了` };
        return { value: specFingerprint(ref.key, frs), status: frsStatus(frs) };
      }
      return { value: null, missing: true, reason: "未知引用" };
    },
  };
  return r;
}

// ────────────────────────────────────────────────────────────────
// 锁
// ────────────────────────────────────────────────────────────────

export async function loadLock() {
  const lock = await fs.readFile(LOCK_FILE, "utf8").then(JSON.parse).catch(() => null);
  return lock?.files ? lock : { version: 1, files: {} };
}

export async function saveLock(lock) {
  const files = Object.fromEntries(Object.entries(lock.files).sort(([a], [b]) => a.localeCompare(b)));
  await fs.writeFile(LOCK_FILE, `${JSON.stringify({ version: 1, files }, null, 2)}\n`);
}

/**
 * 「我看过了」：把这份文档引用的东西按现在的值记进锁。
 *
 * 不给 refIds 就是整页确认；给了只确认那几条。已经不在正文里的引用顺手清掉，
 * 否则删掉一张图之后锁里永远留着它。断掉的引用（图不在、原文找不到）不记——
 * 那不是「看过了没事」能解决的，得去改正文。
 */
export async function ack(rel, refIds = null, { resolver = makeResolver() } = {}) {
  const text = await fs.readFile(path.join(KB_DIR, rel), "utf8");
  const refs = parseRefs(text);
  const lock = await loadLock();
  const entry = lock.files[rel] ?? { refs: {} };
  const keep = new Set(refs.map((r) => r.id));
  for (const id of Object.keys(entry.refs)) if (!keep.has(id)) delete entry.refs[id];

  const acked = [];
  const skipped = [];
  for (const ref of refs) {
    if (refIds && !refIds.includes(ref.id)) continue;
    const cur = await resolver.current(ref);
    if (cur.missing) { skipped.push({ id: ref.id, reason: cur.reason }); continue; }
    // 确认的这一版图存进缓存：之后画面再变，审阅时才调得出「当时看到的是哪一张」
    if (ref.media) await storeBlob(ref.media);
    entry.refs[ref.id] = cur.value;
    acked.push(ref.id);
  }
  entry.at = new Date().toISOString();
  lock.files[rel] = entry;
  await saveLock(lock);
  return { acked, skipped };
}

// ────────────────────────────────────────────────────────────────
// 一页的状态、整库的工作清单
// ────────────────────────────────────────────────────────────────

// 状态名给人看：审阅台与 kb status 共用。不用「上游」「引用断了」这类内部说法
export const REF_STATE_LABEL = {
  ok: "没变",
  changed: "有变化",
  unreviewed: "没确认过",
  missing: "找不到了",
};

/** 一份文档：每条引用的处境 */
export async function fileStatus(rel, { resolver = makeResolver(), lock } = {}) {
  lock ??= await loadLock();
  const text = await fs.readFile(path.join(KB_DIR, rel), "utf8").catch(() => null);
  if (text === null) return null;
  const { data } = parseFrontMatter(text);
  const locked = lock.files[rel]?.refs ?? {};
  const refs = [];
  for (const ref of parseRefs(text)) {
    const cur = await resolver.current(ref);
    let state;
    let visual = null;
    if (cur.missing) state = "missing";
    else if (!(ref.id in locked)) state = "unreviewed";
    else if (locked[ref.id] !== cur.value) {
      state = "changed";
      // 截图字节不同不等于画面变了：渲染有亚像素级的抖动（角标抗锯齿、字体换入时机）。
      // 实测抖动全是 0 个差异格，真改过的是几十到上万格——差得远，阈值放在中间
      if (ref.type === "shot") {
        visual = await compareMedia(locked[ref.id], cur.value, ".png", { inset: cur.inset });
        if (visual.same) state = "ok";
      }
    } else state = "ok";
    refs.push({ ...ref, ...cur, state, visual, was: locked[ref.id] ?? null, reason: cur.reason ?? reasonOf(ref, state, visual) });
  }
  const iterating = typeof data.iterating === "string" && data.iterating.trim() && data.iterating.trim() !== "false" ? data.iterating.trim() : "";
  const open = refs.filter((r) => r.state !== "ok" && !r.unverified);
  const plan = planOf(text);
  const updatedAt = (await fs.stat(path.join(KB_DIR, rel))).mtime.toISOString();
  return {
    path: rel,
    title: data.title ?? rel,
    updatedAt,
    // front-matter 写 publish: false 的页只在本地用（如写作约定），不发到知识库
    publish: String(data.publish ?? "").trim() !== "false",
    // 话题：这篇要回答的问题、话题类型、涉及的原型页面（结构规划的起点）
    topic: data.topic ?? "",
    type: data.type ?? "",
    pages: [].concat(data.pages ?? []),
    plan,
    unfilled: plan.slots.length,
    docStatus: data.docStatus ?? null,
    audience: data.audience ?? [],
    frs: [].concat(data.frs ?? []),
    iterating,
    reviewedAt: lock.files[rel]?.at ?? null,
    refs,
    open: open.length,
    unverified: refs.filter((r) => r.unverified).length,
  };
}

function reasonOf(ref, state, visual) {
  if (state === "ok") return null;
  if (state === "unreviewed") return "新加进来的，还没人确认过";
  if (ref.type === "shot" && visual?.reason) return `重拍后和上次确认的那版比不了：${visual.reason}`;
  if (ref.type === "clip") return "页面代码改过，录屏已重录，从头看一遍操作还对不对";
  if (ref.type === "shot") return "页面改过，重拍后画面和上次确认的那版不一样";
  if (ref.type === "spec") return "这篇挂靠的需求改过了";
  if (ref.type === "fact") return "出处里的这句话改了";
  return "有变化";
}

export async function listPages() {
  const out = [];
  const walk = async (dir) => {
    for (const e of await fs.readdir(dir, { withFileTypes: true })) {
      if (e.name.startsWith(".") || e.name.startsWith("_") || e.name === "images" || e.name === "media") continue;
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) await walk(abs);
      else if (e.name.endsWith(".md")) {
        const rel = path.relative(KB_DIR, abs).split(path.sep).join("/");
        if (!GENERATED.has(rel)) out.push(rel);
      }
    }
  };
  await walk(KB_DIR);
  return out.sort();
}

/**
 * 内容按什么分组、什么顺序摆：取知识库大纲（docs/kb/outline.config.mjs）里的模块顺序与组名，
 * 根目录的页排最前。大纲里没有的目录接在后面，组名取它 overview 的标题。
 * 套件不认识产品有哪些模块，顺序只能来自大纲。
 */
async function contentGroups(files) {
  const file = path.join(KB_DIR, "outline.config.mjs");
  const st = await fs.stat(file).catch(() => null);
  const outline = st ? (await import(`file://${file}?v=${st.mtimeMs}`).catch(() => ({}))).OUTLINE ?? [] : [];
  const groups = [{ dir: "", label: "总览" }, ...outline.map((g) => ({ dir: g.dir, label: g.label ?? g.dir }))];
  for (const f of files) {
    const dir = f.path.includes("/") ? f.path.split("/")[0] : "";
    if (groups.some((g) => g.dir === dir)) continue;
    const overview = files.find((x) => x.path === `${dir}/overview.md`);
    groups.push({ dir, label: overview?.title ?? dir });
  }
  return groups.filter((g) => files.some((f) => (f.path.includes("/") ? f.path.split("/")[0] : "") === g.dir));
}

/**
 * 整库的工作清单——从前的「内容任务」现在全部由它派生，不再存。
 *
 *   review    有引用变了 / 没确认过 / 断了的文档
 *   reshoot   源码在抓完之后变过的物料（重拍；图没变就到此为止）
 *   backlog   还是待撰写骨架的页
 *   uncovered 已确认、却没有任何页面挂靠的需求
 */
export async function buildStatus() {
  const resolver = makeResolver();
  const lock = await loadLock();
  const files = [];
  for (const rel of await listPages()) files.push(await fileStatus(rel, { resolver, lock }));

  const ledger = await resolver.ledger();
  const usedBy = new Map();
  for (const f of files) for (const r of f.refs) if (r.media) (usedBy.get(r.media) ?? usedBy.set(r.media, []).get(r.media)).push(f.path);

  const iteratingPages = new Set(files.filter((f) => f.iterating).map((f) => f.path));
  const reshoot = [];
  for (const [key, meta] of Object.entries(ledger)) {
    // 一次录屏在台账里是 mp4 + gif 两条，文档引用的是 gif，按它算一份
    if (key.endsWith(".mp4") && ledger[key.replace(/\.mp4$/, ".gif")]) continue;
    const drift = await sourceDrift(meta);
    if (!drift?.stale) continue;
    const pages = usedBy.get(key) ?? [];
    // 只被「正在迭代」的页用到：页面还在改，现在重拍多半白拍，配方也可能跟不上
    const following = pages.length > 0 && pages.every((p) => iteratingPages.has(p));
    reshoot.push({ key, recipe: key.replace(/^(images|media)\//, "").replace(/\.(png|gif|mp4)$/, ""), route: meta.route, capturedAt: meta.capturedAt, ...drift, usedBy: pages, following });
  }

  const frsMap = await resolver.frs();
  const covered = new Set(files.flatMap((f) => f.frs));
  const uncovered = [...frsMap.entries()]
    .filter(([key, frs]) => frsStatus(frs) !== "draft" && frsStatus(frs) !== "archived" && !covered.has(key))
    .map(([key, frs]) => ({ key, title: frs.title ?? frs.goal?.slice(0, 40) ?? key, status: frsStatus(frs) }));

  // 每一页用到的物料里有几份源码变过：重拍放在那一页里做，审阅台不再单列一张物料清单
  const staleOf = new Map();
  for (const m of reshoot) for (const p of m.usedBy) (staleOf.get(p) ?? staleOf.set(p, []).get(p)).push(m.recipe);
  for (const f of files) f.stale = staleOf.get(f.path) ?? [];

  const review = files.filter((f) => f.open > 0);
  return {
    files,
    groups: await contentGroups(files),
    review: review.filter((f) => !f.iterating),
    following: review.filter((f) => f.iterating),
    reshoot: reshoot.sort((a, b) => a.key.localeCompare(b.key)),
    // 有格子的新页归「待填」：它已经过了规划，缺的是物料，不是从零开写
    backlog: files.filter((f) => f.docStatus === "待撰写" && !f.unfilled),
    // 蓝图排好了、格子还空着的页：规划阶段做完、填充阶段没做完
    planning: files.filter((f) => f.unfilled > 0 && !f.iterating),
    uncovered,
    summary: {
      pages: files.length,
      review: review.filter((f) => !f.iterating).length,
      refsOpen: review.filter((f) => !f.iterating).reduce((a, f) => a + f.open, 0),
      reshoot: reshoot.filter((m) => !m.following).length,
      backlog: files.filter((f) => f.docStatus === "待撰写" && !f.unfilled).length,
      uncovered: uncovered.length,
      slots: files.filter((f) => !f.iterating).reduce((a, f) => a + f.unfilled, 0),
      facts: files.reduce((a, f) => a + f.refs.filter((r) => r.type === "fact").length, 0),
      unverified: files.reduce((a, f) => a + f.unverified, 0),
    },
  };
}

/**
 * 一页的构成：从哪来（原型页面 / 需求件套）→ 用了什么（截图、录屏、事实）→ 落在哪一节。
 *
 * 全部从正文与台账推出来，**不存任何东西**：上一版画布存了一张可编辑的生产图，
 * 结果和 md 成了两份真源。这里是同一份 md 的另一种看法，改结构就是改 md。
 *
 * 事实按出处归组（同一个源码文件的二十几句算一个节点），否则一页几十个节点，看不出结构。
 */
export async function structureOf(rel, { resolver = makeResolver() } = {}) {
  const st = await fileStatus(rel, { resolver });
  if (!st) return null;
  const text = await fs.readFile(path.join(KB_DIR, rel), "utf8");
  const sections = sectionsOf(text).filter((s) => s.level >= 2);
  const secId = (line) => {
    const s = sectionOfLine(sections, line);
    return s ? `s:${s.line}` : "s:top";
  };
  const ledger = await resolver.ledger();
  const frsMap = await resolver.frs();
  const worst = (states) => ["missing", "changed", "unreviewed"].find((s) => states.includes(s)) ?? "ok";
  const open = (r) => r.state !== "ok" && !r.unverified;

  const materials = [];
  const groups = new Map();
  const sources = new Map();
  const edges = [];
  const source = (id, make) => sources.get(id) ?? sources.set(id, make()).get(id);

  for (const r of st.refs) {
    if (r.type === "shot" || r.type === "clip") {
      const route = r.route ? normRoute(r.route) : null;
      materials.push({ id: r.id, kind: r.type, key: r.key, media: r.media, caption: r.caption, line: r.line, state: r.state, open: open(r), reason: r.reason, warnings: r.warnings ?? [], route, section: secId(r.line) });
      if (route) {
        const src = source(`r:${route}`, () => ({ id: `r:${route}`, kind: "route", label: route, files: new Set() }));
        for (const f of ledger[r.media]?.sources ?? []) src.files.add(f);
        edges.push({ from: src.id, to: r.id, state: r.state });
      }
      edges.push({ from: r.id, to: secId(r.line), state: r.state });
    } else if (r.type === "fact") {
      const { kind, rest } = parseBasis(r.basis);
      const gk = kind === "code" ? `code:${rest}` : kind === "frs" ? `frs:${rest.split("#")[0]}` : "note";
      const g = groups.get(gk) ?? groups.set(gk, { id: `g:${gk}`, kind, file: kind === "code" ? rest : null, frs: kind === "frs" ? rest.split("#")[0] : null, facts: [] }).get(gk);
      g.facts.push({ id: r.id, text: stripFactMarks(r.text), line: r.line, state: r.state, open: open(r), reason: r.reason, section: secId(r.line), now: r.now ?? null, adoptable: !!r.adoptable });
    } else if (r.type === "spec") {
      const frs = frsMap.get(r.key);
      const src = source(`f:${r.key}`, () => ({ id: `f:${r.key}`, kind: "frs", label: frs?.title ?? r.key, key: r.key, status: frs ? frsStatus(frs) : "missing" }));
      src.spec = { id: r.id, state: r.state, reason: r.reason };
    }
  }

  for (const g of groups.values()) {
    g.state = worst(g.facts.filter((f) => f.open).map((f) => f.state));
    g.open = g.facts.filter((f) => f.open).length;
    g.label = g.kind === "code" ? path.basename(g.file) : g.kind === "frs" ? frsMap.get(g.frs)?.title ?? g.frs : "人工记录";
    g.line = Math.min(...g.facts.map((f) => f.line));
    if (g.kind === "frs") {
      const frs = frsMap.get(g.frs);
      const src = source(`f:${g.frs}`, () => ({ id: `f:${g.frs}`, kind: "frs", label: frs?.title ?? g.frs, key: g.frs, status: frs ? frsStatus(frs) : "missing" }));
      edges.push({ from: src.id, to: g.id, state: g.state });
    }
    // 源码事实挂到「依赖闭包里有这个文件」的那条路由上：界面文案出自哪一屏一眼能看到
    if (g.kind === "code") for (const src of sources.values()) if (src.files?.has(g.file)) edges.push({ from: src.id, to: g.id, state: g.state });
    const perSection = new Map();
    for (const f of g.facts) perSection.set(f.section, [...(perSection.get(f.section) ?? []), f.state]);
    for (const [sid, states] of perSection) edges.push({ from: g.id, to: sid, state: worst(states), count: states.length });
  }

  // 没填的格子也是构成的一部分：规划好了要用什么讲，只是还没拍 / 没画
  for (const sl of st.plan.slots) {
    const id = `slot:${sl.line}`;
    const route = sl.route ? normRoute(sl.route) : null;
    materials.push({ id, kind: "slot", slot: sl.kind, hint: sl.hint, route, line: sl.line, state: "planned", open: false, section: sl.section ? `s:${sl.section}` : "s:top" });
    if (route) {
      const src = source(`r:${route}`, () => ({ id: `r:${route}`, kind: "route", label: route, files: new Set() }));
      // 还没拍过的屏，台账里没有它的源码清单，现场解析一遍
      if (!src.files.size) for (const f of await sourcesForRoute(REPO_ROOT, route)) src.files.add(f);
      edges.push({ from: src.id, to: id, state: "planned" });
    }
    edges.push({ from: id, to: sl.section ? `s:${sl.section}` : "s:top", state: "planned" });
  }
  const intentOf = new Map(st.plan.intents.map((i) => [i.section, i.text]));

  const sectionNodes = sections.map((s) => {
    const id = `s:${s.line}`;
    const inside = [...materials.filter((m) => m.section === id), ...[...groups.values()].flatMap((g) => g.facts.filter((f) => f.section === id))];
    return { id, level: s.level, text: s.text, line: s.line, bodyEnd: s.bodyEnd, end: s.end, intent: intentOf.get(s.line) ?? "", open: inside.filter((x) => x.open).length, slots: inside.filter((x) => x.kind === "slot").length, refs: inside.filter((x) => x.kind !== "slot").length };
  });
  if (edges.some((e) => e.to === "s:top")) sectionNodes.unshift({ id: "s:top", level: 2, text: "（开头，第一个标题之前）", line: 1, open: 0, refs: 0 });

  return {
    path: rel,
    title: st.title,
    topic: st.topic,
    type: st.type,
    pages: st.pages,
    // 第一个二级标题往下只有蓝图（标题、意图、格子）：还没写正文，可以让 Agent 重新提议
    planOnly: isPlanOnly(text.split("\n").slice((sections[0]?.line ?? Infinity) - 1)),
    iterating: st.iterating,
    sources: [...sources.values()].map((s) => ({ ...s, files: s.files ? [...s.files] : undefined })),
    materials,
    groups: [...groups.values()],
    sections: sectionNodes,
    edges,
  };
}

/**
 * 反查：谁在引用它。可以给图的配方 key、路由、事实依据（或其中的文件名）、需求 key。
 */
export async function whereUsed(query) {
  const q = String(query ?? "").trim();
  const resolver = makeResolver();
  const ledger = await resolver.ledger();
  const hits = [];
  for (const rel of await listPages()) {
    const text = await fs.readFile(path.join(KB_DIR, rel), "utf8");
    for (const ref of parseRefs(text)) {
      const route = ref.media ? ledger[ref.media]?.route?.split("?")[0] : null;
      const match =
        ref.key === q ||
        ref.id === q ||
        (route && route === q.split("?")[0]) ||
        (ref.type === "fact" && (ref.basis === q || parseBasis(ref.basis).rest === q || ref.basis.includes(q)));
      if (match) hits.push({ file: rel, line: ref.line, id: ref.id, type: ref.type });
    }
  }
  return hits;
}

/**
 * 把 md 里那段事实原文换成 FRS 现在的写法，并确认这一条。
 * 只对需求规格档有意义——源码档说不出「改成了什么」，人工记录档本来就验不了。
 */
export async function adoptFact(rel, refId) {
  const abs = path.join(KB_DIR, rel);
  const text = await fs.readFile(abs, "utf8");
  const ref = parseRefs(text).find((r) => r.id === refId);
  if (!ref || ref.type !== "fact" || parseBasis(ref.basis).kind !== "frs") throw new Error("只有需求规格档的事实能一键采纳");
  const cur = await makeResolver().current(ref);
  if (cur.missing) throw new Error(cur.reason);
  const before = `<!--f ${ref.basis}-->${ref.text}<!--/f-->`;
  if (!text.includes(before)) throw new Error("没在正文里找到这段标记，可能被手工改过格式");
  // 替换用函数而不用字符串：规格原文里出现 `$&` 一类写法时，字符串替换会把它当成替换模式
  await fs.writeFile(abs, text.replace(before, () => `<!--f ${ref.basis}-->${cur.now}<!--/f-->`));
  const newId = `fact:${ref.basis}#${sha(flat(cur.now))}`;
  await ack(rel, [newId]);
  return { id: newId };
}
