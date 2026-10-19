/**
 * 物料台账（docs/kb/_media.json）
 * ------------------------------------------------------------------
 * 每张图 / 每段录屏记三件事：它来自哪条路由、抓的时候那条路由的源码长什么样
 * （逐文件的内容哈希）、抓出来的产物本身的哈希。
 *
 * 这三件事分别回答两个不同的问题，**这两个问题从前被混成了一个**：
 *
 *   该不该重拍？   源码快照的哈希变了 → 该。这一层只关乎素材，不打扰任何文档。
 *   文档要不要审？ 重拍后产物哈希变了 → 要；没变 → 到此为止（早截断）。
 *
 * 从前两个问题共用一个判据「抓取时刻」：任何一次重拍都让所有引用它的文档变成过期，
 * 哪怕图一个像素都没动。2026-09-22 实测一张图重拍前后字节一致，下游照样被标过期；
 * 每次全量重拍都得把 20 份内容重新对照一遍。构建系统的做法是早截断——
 * 输入变了就重建，产物没变就不往下游传。
 *
 * 产物同时按哈希存进 `docs/kb/_blobs/`（内容寻址、不入库）。文档锁里记的是
 * 「写的时候看到的那张图的哈希」，审阅时就能把那一张原样调出来与现在的并排看，
 * 不必另存「上一版」——上一版是谁，由引用它的那份文档自己说了算。
 */

import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { inflateSync } from "node:zlib";

import { diffLayouts } from "./layout-diff.mjs";
import { KB_DIR, REPO_ROOT } from "./paths.mjs";
import { sourcesForRoute } from "./route-source.mjs";
import { currentHashes, snapshotSources } from "./source-snapshot.mjs";

export const LEDGER_FILE = path.join(KB_DIR, "_media.json");
export const BLOB_DIR = path.join(KB_DIR, "_blobs");

const shaBuf = (buf) => createHash("sha1").update(buf).digest("hex").slice(0, 16);

export async function loadLedger() {
  return fs.readFile(LEDGER_FILE, "utf8").then(JSON.parse).catch(() => ({}));
}

// ────────────────────────────────────────────────────────────────
// 画面比较：字节不同 ≠ 画面变了
// ────────────────────────────────────────────────────────────────

/**
 * 最小 PNG 解码（8 位 RGB / RGBA，非隔行）——截图脚本产出的就是这一种。
 * 不引第三方包：套件的管线只依赖 Node 自带的 zlib。
 */
function decodePng(buf) {
  let pos = 8;
  let w = 0;
  let h = 0;
  let bpp = 4;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const body = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      w = body.readUInt32BE(0);
      h = body.readUInt32BE(4);
      bpp = body[9] === 2 ? 3 : 4;
    } else if (type === "IDAT") idat.push(body);
    pos += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * bpp;
  const out = new Uint8Array(stride * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const dst = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[dst + x - bpp] : 0;
      const b = y ? out[dst - stride + x] : 0;
      const c = x >= bpp && y ? out[dst - stride + x - bpp] : 0;
      let v = raw[src + x];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[dst + x] = v & 255;
    }
  }
  return { w, h, bpp, px: out };
}

/** 按 CELL×CELL 像素分格取灰度均值。格子粗细决定「多小的差异算抖动」 */
const CELL = 16;
function grid({ w, h, bpp, px }) {
  const cols = Math.ceil(w / CELL);
  const rows = Math.ceil(h / CELL);
  const sum = new Float64Array(cols * rows);
  const cnt = new Uint32Array(cols * rows);
  for (let y = 0; y < h; y++) {
    const r = ((y / CELL) | 0) * cols;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * bpp;
      const k = r + ((x / CELL) | 0);
      sum[k] += px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114;
      cnt[k]++;
    }
  }
  const g = new Float32Array(cols * rows);
  for (let k = 0; k < g.length; k++) g[k] = sum[k] / cnt[k];
  return { cols, rows, g };
}

/**
 * 两版图画面上差多少：有多少个格子的灰度均值差超过阈值。
 * 抗锯齿抖动只会动到一两个格子；改一个按钮文案就是十几二十个。
 *
 * 还有一类抖动格子数很多：某条边线整体挪了 1 个 CSS 像素（2026-09-28 实测：标注框底边上移 1px，
 * 横跨 480px，按 4 倍像素拍出来碰了 331 个格子，画面一个字没变）。所以每个差异格再逐像素核一遍：
 * 这一版的每个像素，在另一版 1 个 CSS 像素范围内找得到同色的点（反过来也一样），就算解释得通。
 * 不按整格或整块平移：一格里常常是一条线挪了、旁边一条没挪，怎么平移都对不上（实测剩一半）。
 * 字真改了照样抓得到：换一个字，新笔画离旧笔画远不止 1 个像素。
 */
const COMPARE_CACHE = path.join(BLOB_DIR, "_compare.json");
let compareMemo = null;

export async function compareMedia(hashA, hashB, ext = ".png", { inset } = {}) {
  if (hashA === hashB) return { same: true, cells: 0 };
  // 结果形状变过就换前缀，旧前缀的条目读进来时丢掉
  compareMemo ??= await fs
    .readFile(COMPARE_CACHE, "utf8")
    .then((t) => Object.fromEntries(Object.entries(JSON.parse(t)).filter(([k]) => k.startsWith("v9|"))))
    .catch(() => ({}));
  const key = `v9|${hashA}|${hashB}|${inset ?? ""}`;
  if (compareMemo[key]) return compareMemo[key];
  let r = await compareUncached(hashA, hashB, ext, inset);
  // 像素只管「变没变」；变了什么、在哪，两版都有画面清单时按清单说（见 layout-diff.mjs）。
  // 清单里一条变化都没有（改的是图片内容、阴影这类不进清单的东西）就留着像素框
  if (!r.same && r.cells !== null) {
    const [la, lb] = await Promise.all([loadLayout(hashA), loadLayout(hashB)]);
    if (la && lb) {
      const d = diffLayouts(la, lb);
      if (d.changes.length || d.moved) r = { ...r, basis: "layout", wide: null, ...d };
    }
  }
  // 两版都在才缓存：缺一版的结论只是「暂时比不了」，下次补齐了还要重算
  if (r.cells !== null) {
    compareMemo[key] = r;
    await fs.mkdir(BLOB_DIR, { recursive: true });
    await fs.writeFile(COMPARE_CACHE, JSON.stringify(compareMemo));
  }
  return r;
}

/**
 * 四边留白 [上, 右, 下, 左] 里的像素，把 B 的抄给 A，两版留白就一模一样、不参与比对。
 * 留白是截图对象周围的东西（蒙层、相邻的行），它变了不等于这张图要说的变了。
 * 抄像素而不是跳过格子：格子 16px，压在留白边界上的那一列一半是留白，跳不干净（实测弹窗两侧各剩一列碎框）。
 */
function sameMargin(A, B, [top, right, bottom, left]) {
  if (A.bpp !== B.bpp) return;
  const row = A.w * A.bpp;
  const copy = (from, to) => A.px.set(B.px.subarray(from, to), from);
  for (let y = 0; y < A.h; y++) {
    const at = y * row;
    if (y < top || y >= A.h - bottom) copy(at, at + row);
    else {
      if (left > 0) copy(at, at + left * A.bpp);
      if (right > 0) copy(at + (A.w - right) * A.bpp, at + row);
    }
  }
}

async function compareUncached(hashA, hashB, ext, inset) {
  const [a, b] = await Promise.all([hashA, hashB].map((h) => fs.readFile(path.join(BLOB_DIR, `${h}${ext}`)).catch(() => null)));
  if (!a || !b) return { same: false, cells: null, reason: "缓存里缺一版，比不了" };
  const A = decodePng(a);
  const B = decodePng(b);
  if (A.w !== B.w || A.h !== B.h) return { same: false, cells: null, reason: `尺寸变了 ${A.w}×${A.h} → ${B.w}×${B.h}` };
  if (inset) sameMargin(A, B, inset);
  const ga = grid(A);
  const gb = grid(B);
  const diff = new Uint8Array(ga.g.length);
  let cells = 0;
  for (let k = 0; k < ga.g.length; k++) if (Math.abs(ga.g[k] - gb.g[k]) > 6) (diff[k] = 1), cells++;
  let shifted = 0;
  if (cells > JITTER_CELLS) {
    for (let k = 0; k < diff.length; k++) {
      if (!diff[k] || !cellShiftsIntoPlace(A, B, k % ga.cols, (k / ga.cols) | 0)) continue;
      diff[k] = 0;
      cells--;
      shifted++;
    }
  }
  const same = cells <= JITTER_CELLS;
  const area = Math.round((cells / ga.g.length) * 1000) / 1000;
  const base = { same, cells, shifted, total: ga.g.length, area, basis: "pixels", changes: [], more: 0, moved: 0, wide: null };
  if (same) return base;
  const r = regionsOf(diff, ga.cols, ga.rows);
  const wide = area > WIDE_AREA || r.cover > WIDE_COVER ? "area" : r.spots > SCATTERED_SPOTS ? "scattered" : null;
  if (wide) return { ...base, wide, spots: r.spots };
  const pct = (v, total) => Math.round(Math.min(100, Math.max(0, (v / total) * 100)) * 10) / 10;
  const changes = r.boxes.map((b) => ({
    // 原来有、现在空了的，框画在上次那张上；其余（现在才有、或两版都有但不一样）画在现在这张上
    side: inked(A, b) && !inked(B, b) ? "was" : "now",
    text: "",
    boxes: [{ x: pct(b.c0 * CELL, A.w), y: pct(b.r0 * CELL, A.h), w: pct((b.c1 - b.c0 + 1) * CELL, A.w), h: pct((b.r1 - b.r0 + 1) * CELL, A.h) }],
  }));
  return { ...base, changes, more: r.more, spots: r.spots };
}
export const JITTER_CELLS = 8;

/** 截图按设备像素拍：2 倍截图 × 2 倍屏时 1 个 CSS 像素是 4 个图片像素。平移只试这么远 */
const SHIFT_PX = 4;

/**
 * 这一格的差异能不能都用「挪了不到 1 个 CSS 像素」解释：两个方向各数一遍解释不了的像素，
 * 合计不超过 8 个（抗锯齿会留下零星几个）。
 */
function cellShiftsIntoPlace(A, B, c, r) {
  const x0 = c * CELL;
  const y0 = r * CELL;
  const x1 = Math.min(A.w, x0 + CELL);
  const y1 = Math.min(A.h, y0 + CELL);
  const ALLOW = 8;
  const bad = unexplained(A, B, x0, y0, x1, y1, ALLOW);
  return bad <= ALLOW && bad + unexplained(B, A, x0, y0, x1, y1, ALLOW - bad) <= ALLOW;
}

/** P 在这一格里有几个像素，在 Q 的 SHIFT_PX 范围内找不到同色点（数到 limit 以上就停） */
function unexplained(P, Q, x0, y0, x1, y1, limit) {
  let bad = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * P.w + x) * P.bpp;
      if (Math.abs(P.px[i] - Q.px[i]) <= 40 && Math.abs(P.px[i + 1] - Q.px[i + 1]) <= 40 && Math.abs(P.px[i + 2] - Q.px[i + 2]) <= 40) continue;
      let found = false;
      for (let dy = -SHIFT_PX; dy <= SHIFT_PX && !found; dy++) {
        const yq = y + dy;
        if (yq < 0 || yq >= Q.h) continue;
        for (let dx = -SHIFT_PX; dx <= SHIFT_PX; dx++) {
          const xq = x + dx;
          if (xq < 0 || xq >= Q.w) continue;
          const j = (yq * Q.w + xq) * Q.bpp;
          if (Math.abs(P.px[i] - Q.px[j]) <= 40 && Math.abs(P.px[i + 1] - Q.px[j + 1]) <= 40 && Math.abs(P.px[i + 2] - Q.px[j + 2]) <= 40) {
            found = true;
            break;
          }
        }
      }
      if (!found && ++bad > limit) return bad;
    }
  }
  return bad;
}

/** 差异格按连通（相距两格以内算连着）聚成块：{ c0, c1, r0, r1, cells } */
function components(diff, cols, rows) {
  const seen = new Uint8Array(diff.length);
  const out = [];
  const R = 2;
  for (let k0 = 0; k0 < diff.length; k0++) {
    if (!diff[k0] || seen[k0]) continue;
    let c0 = cols, c1 = -1, r0 = rows, r1 = -1;
    const cells = [];
    const stack = [k0];
    seen[k0] = 1;
    while (stack.length) {
      const k = stack.pop();
      const c = k % cols;
      const r = (k / cols) | 0;
      cells.push(k);
      c0 = Math.min(c0, c); c1 = Math.max(c1, c);
      r0 = Math.min(r0, r); r1 = Math.max(r1, r);
      for (let dr = -R; dr <= R; dr++) for (let dc = -R; dc <= R; dc++) {
        const rr = r + dr;
        const cc = c + dc;
        if (rr < 0 || cc < 0 || rr >= rows || cc >= cols) continue;
        const kk = rr * cols + cc;
        if (diff[kk] && !seen[kk]) (seen[kk] = 1), stack.push(kk);
      }
    }
    out.push({ c0, c1, r0, r1, cells });
  }
  return out;
}

/** 外扩 gap 格后相交的块并成一块，并到不再变化为止 */
function mergeNear(boxes, gap) {
  const out = [...boxes];
  for (let merged = true; merged; ) {
    merged = false;
    outer: for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const a = out[i];
        const b = out[j];
        if (a.c0 - gap > b.c1 || b.c0 - gap > a.c1 || a.r0 - gap > b.r1 || b.r0 - gap > a.r1) continue;
        out[i] = union([a, b]);
        out.splice(j, 1);
        merged = true;
        break outer;
      }
    }
  }
  return out;
}

const union = (list) => ({
  c0: Math.min(...list.map((b) => b.c0)),
  c1: Math.max(...list.map((b) => b.c1)),
  r0: Math.min(...list.map((b) => b.r0)),
  r1: Math.max(...list.map((b) => b.r1)),
  n: list.reduce((sum, b) => sum + b.n, 0),
});
const span = (b, lo, hi) => b[hi] - b[lo] + 1;

/**
 * 差异格聚成几块框——只在没有画面清单可比时用（见 compareMedia）。
 * 相距两格以内的算同一块（一行字改了会断成好几段）；块与块再按「相距 3% 短边以内」合并——
 * 缩略图里挨得这么近的两个框分不开，只显得碎。
 * 有成块的改动时，零星改动（三格以内、或不到最大那块十分之一）不框，只报个数。
 * 不按列 / 按行并条：像素层面并出来的长条会框住中间没变的空白（2026-10-08 一整列勾选框旁边的空白被框）。
 * @returns {{ boxes: {c0,c1,r0,r1,n}[], more: number, spots: number, cover: number }}
 */
const MAX_REGIONS = 5;
function regionsOf(diff, cols, rows) {
  const gap = Math.max(4, Math.round(Math.min(cols, rows) * 0.03));
  const raw = components(diff, cols, rows).map((b) => ({ c0: b.c0, c1: b.c1, r0: b.r0, r1: b.r1, n: b.cells.length }));
  const boxes = mergeNear(raw, gap).sort((a, b) => b.n - a.n);
  // 「成块」看的是和最大那块比：同一类小改动大小差不多，不能有一个被框、其余算零星
  const solid = boxes.filter((b) => b.n > 3 && b.n >= boxes[0].n / 10);
  const shown = (solid.length ? solid : boxes).slice(0, MAX_REGIONS);
  const cover = Math.round((shown.reduce((sum, b) => sum + span(b, "c0", "c1") * span(b, "r0", "r1"), 0) / (cols * rows)) * 1000) / 1000;
  return { boxes: shown, more: boxes.length - shown.length, spots: boxes.length, cover };
}

/**
 * 这块地方在这一版里有没有东西：和这块的底色差得远的像素占到 2% 以上。
 * 像素差异是两版叠在一起的，靠它分出「原来有、现在没了」（框画在上次那张上）还是「现在才有」。
 */
function inked(img, b) {
  const { w, bpp, px } = img;
  const x0 = b.c0 * CELL;
  const x1 = Math.min(w, (b.c1 + 1) * CELL);
  const y0 = b.r0 * CELL;
  const y1 = Math.min(img.h, (b.r1 + 1) * CELL);
  const gray = (i) => (px[i] * 299 + px[i + 1] * 587 + px[i + 2] * 114) / 1000;
  const hist = new Uint32Array(32);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) hist[gray((y * w + x) * bpp) >> 3]++;
  const bg = (hist.indexOf(Math.max(...hist)) << 3) + 4;
  let ink = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (Math.abs(gray((y * w + x) * bpp) - bg) > 24) ink++;
  return ink / Math.max(1, (x1 - x0) * (y1 - y0)) > 0.02;
}

/**
 * 什么时候不框：改动占了大半张图、框要框住三成以上的画面，或者散成十几处——典型是表格上面一行变高，
 * 下面每一行整体往下挪，没改的格子也全对不上了。这时框出来的只是一堆碎片，反倒让人以为处处都改了。
 */
const WIDE_AREA = 0.3;
const WIDE_COVER = 0.35;
const SCATTERED_SPOTS = 12;

/** 某一版截图拍下时的画面清单（见 layout-snapshot.mjs）。这个功能之前拍的没有，返回 null */
export async function loadLayout(hash) {
  return fs
    .readFile(path.join(BLOB_DIR, `${hash}.layout.json`), "utf8")
    .then(JSON.parse)
    .catch(() => null);
}

/** 产物文件现在的内容哈希（纯读，不碰缓存）。按实际字节算，不信台账——有人手换一张图也瞒不过 */
export async function hashMedia(rel) {
  const buf = await fs.readFile(path.join(KB_DIR, rel)).catch(() => null);
  return buf ? shaBuf(buf) : null;
}

/** 产物文件 → 内容哈希，并把这一版存进内容寻址缓存 */
export async function storeBlob(rel) {
  const abs = path.join(KB_DIR, rel);
  const buf = await fs.readFile(abs).catch(() => null);
  if (!buf) return null;
  const hash = shaBuf(buf);
  const blob = path.join(BLOB_DIR, `${hash}${path.extname(rel)}`);
  await fs.mkdir(BLOB_DIR, { recursive: true });
  await fs.access(blob).catch(() => fs.writeFile(blob, buf));
  return hash;
}

/** 缓存里按哈希取回某一版产物的相对路径（相对 docs/kb），不存在返回 null */
export async function blobPath(hash, ext) {
  if (!hash) return null;
  const rel = path.join("_blobs", `${hash}${ext}`);
  return fs.access(path.join(KB_DIR, rel)).then(() => rel, () => null);
}

/**
 * 记一笔：截图与录屏两个脚本共用。
 *
 * `sources` 保持字符串数组（旧的读取方仍在用）；`snapshot` 是逐文件内容哈希，
 * 判「该不该重拍」只看它；`hash` 是产物本身，判「文档要不要审」只看它。
 */
export async function recordMedia(entries) {
  const ledger = await loadLedger();
  for (const { key, route, warnings, inset, layout } of entries) {
    const sources = await sourcesForRoute(REPO_ROOT, route);
    const hash = await storeBlob(key);
    if (hash && layout) await fs.writeFile(path.join(BLOB_DIR, `${hash}.layout.json`), JSON.stringify(layout));
    ledger[key] = {
      route,
      capturedAt: new Date().toISOString(),
      sources,
      snapshot: await snapshotSources(REPO_ROOT, sources),
      hash,
      // 拍完自检出的问题（半截、角标没落上）。重拍干净了就不再带这一项
      ...(warnings?.length ? { warnings } : {}),
      // 截图四边留白的像素数 [上, 右, 下, 左]，比对时跳过（见 compareMedia）
      ...(inset ? { inset } : {}),
    };
  }
  await fs.writeFile(LEDGER_FILE, `${JSON.stringify(ledger, null, 2)}\n`);
}

/**
 * 这份物料抓完之后，它依赖的源码变过没有。
 *
 * 比的是内容哈希而不是修改时间：`cp` 还原一个文件、`git checkout` 一下，
 * mtime 都会前移，内容却一个字没变——按时间判就是假警报。
 * 依赖集合本身也要比：新 import 了一个文件、删掉了一个，同样算变了。
 *
 * 抓的时候路由没解析出源码（快照为空）、现在解析得出来：没有基线也算该重拍——
 * 拍一次就有了；否则这份物料会一直处在「永远不过期」的盲区里。
 *
 * @returns null（路由至今解析不出源码，判断不了）或 { stale, changed: [文件], added: [文件], removed: [文件] }
 */
export async function sourceDrift(meta) {
  if (!meta?.route) return null;
  const now = await sourcesForRoute(REPO_ROOT, meta.route);
  const was = meta.snapshot ?? {};
  if (!now.length && !Object.keys(was).length) return null;
  const cur = await currentHashes(REPO_ROOT, now);
  const changed = now.filter((f) => f in was && cur[f] !== was[f]);
  const added = now.filter((f) => !(f in was));
  const removed = Object.keys(was).filter((f) => !now.includes(f));
  return { stale: changed.length + added.length + removed.length > 0, changed, added, removed };
}

/** 全部物料里，源码在抓完之后变过的那些——「该重拍」清单 */
export async function staleMedia() {
  const ledger = await loadLedger();
  const out = [];
  for (const [key, meta] of Object.entries(ledger)) {
    const exists = await fs.access(path.join(KB_DIR, key)).then(() => true, () => false);
    if (!exists) continue;
    const drift = await sourceDrift(meta);
    if (drift?.stale) out.push({ key, route: meta.route, capturedAt: meta.capturedAt, ...drift });
  }
  return out.sort((a, b) => a.key.localeCompare(b.key));
}
