/**
 * 两份画面清单（见 layout-snapshot.mjs）对比：这张图上变了什么、在哪。
 *
 * 产出的是一条条「人话」，每条带它在图上的位置，位置取元素自己的框：
 * 新出现的、变了的框在「现在」那张上，没了的框在「上次确认时」那张上——
 * 像素比对给不出这个方向，框只能落在两版叠在一起的地方。
 *
 * 只是挪了位置的不逐条列（上面一行变高，下面整体往下挪），只报个数。
 * 同一处（同一源码位置、同一种变化）重复出现的并成一条：表格每行的勾选框都变了，是一条，不是五条。
 */

const NAME = { toggle: "勾选框", field: "输入框", button: "按钮", icon: "图标", media: "图片", text: "文字" };
/** 字本身算不算这个元素的内容。按钮、勾选框的字在子元素里，由子元素报，这里只拿来称呼 */
const TEXT_IS_CONTENT = new Set(["text", "field"]);
const CONTROL = new Set(["toggle", "field", "button", "icon", "media"]);
const STATE_PHRASE = {
  disabled: ["变成不可点", "变成可点"],
  checked: ["勾上了", "取消了勾选"],
  selected: ["被选中了", "取消了选中"],
  active: ["变成当前项", "不再是当前项"],
  error: ["出现报错", "报错消失"],
  open: ["展开了", "收起了"],
  loading: ["开始加载", "加载完了"],
  indeterminate: ["变成半选", "不再半选"],
};
const MAX_ENTRIES = 6;
/** 位置、尺寸差在这以内算没动（CSS 像素）：字体换入、取整的抖动 */
const JITTER = 2;

const short = (t, n = 16) => (t.length > n ? `${t.slice(0, n)}…` : t);
function nameOf(it) {
  const t = it.kind === "icon" ? it.n : it.t || it.n || placeholderOf(it);
  if (it.kind === "text") return `「${short(t)}」`;
  return t ? `${NAME[it.kind]}「${short(t)}」` : NAME[it.kind];
}
const tokens = (s) => new Set(s.split(" ").filter(Boolean));
const placeholderOf = (it) => (it.kind === "field" ? it.k.split("|")[3] ?? "" : "");

/**
 * 同一身份的几个元素两版之间配对：先配字和状态都一样的，再配字一样的——这两轮配上的是「同一个东西」。
 * 剩下的才可能是「原地改了字」，但要两条都满足：位置几乎重合，且挪动量和周围已配上的元素一致。
 * 只看位置不够：表单滚了一截，另一个输入框恰好落到同一处，会被说成「A 改成了 B」——错话比漏报更糟。
 * 配不上的老老实实报「没了」+「新出现」。
 */
function pairUp(was, now, motionAt) {
  const pairs = [];
  const usedA = new Set();
  const usedB = new Set();
  const take = (i, j, inPlace) => {
    usedA.add(i);
    usedB.add(j);
    pairs.push([was[i], now[j], inPlace]);
  };
  for (const ok of [(a, b) => a.t === b.t && a.s === b.s, (a, b) => a.t === b.t]) {
    for (let i = 0; i < was.length; i++) {
      if (usedA.has(i)) continue;
      const j = now.findIndex((b, k) => !usedB.has(k) && ok(was[i], b));
      if (j >= 0) take(i, j, false);
    }
  }
  if (motionAt) {
    for (let i = 0; i < was.length; i++) {
      if (usedA.has(i)) continue;
      const a = was[i];
      const motion = motionAt(a);
      if (!motion) continue;
      const [mx, my] = motion;
      const j = now.findIndex((b, k) => !usedB.has(k) && Math.abs(b.r[0] - a.r[0] - mx) <= 8 && Math.abs(b.r[1] - a.r[1] - my) <= 8);
      if (j >= 0) take(i, j, true);
    }
    // 同一滚动区里这一类两边各只剩一个、离得也近：就是它换了字。右对齐的按钮换了字会连带邻居一起挪，
    // 上面那条「挪动量一致」判不出来；表单滚动时两边会各剩一串，不会落进这一条
    const leftA = was.map((a, i) => i).filter((i) => !usedA.has(i));
    const leftB = now.map((b, k) => k).filter((k) => !usedB.has(k));
    if (leftA.length === 1 && leftB.length === 1) {
      const a = was[leftA[0]];
      const b = now[leftB[0]];
      if (a.sc === b.sc && Math.hypot(a.r[0] - b.r[0], a.r[1] - b.r[1]) < 150) take(leftA[0], leftB[0], true);
    }
  }
  return {
    pairs,
    removed: was.filter((_, i) => !usedA.has(i)),
    added: now.filter((_, k) => !usedB.has(k)),
  };
}

const groupBy = (list, key) => {
  const m = new Map();
  for (const it of list) {
    const k = key(it);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(it);
  }
  return m;
};

/** 一对元素之间的变化，没变（或只是挪了）返回 [] */
function changesOf(a, b) {
  const out = [];
  if (TEXT_IS_CONTENT.has(b.kind) && a.t !== b.t) out.push({ type: "text" });
  if (a.s !== b.s) {
    const was = tokens(a.s);
    const now = tokens(b.s);
    const phrases = [];
    for (const t of now) if (!was.has(t) && STATE_PHRASE[t]) phrases.push(STATE_PHRASE[t][0]);
    for (const t of was) if (!now.has(t) && STATE_PHRASE[t]) phrases.push(STATE_PHRASE[t][1]);
    if (phrases.length) out.push({ type: "state", phrase: phrases.join("、") });
  }
  if (a.c !== b.c) out.push({ type: "cut", phrase: b.c ? "显示不全了，被截成「…」" : "不再被截成「…」，显示完整了" });
  // 状态变了颜色自然跟着变，不重复报
  // 按钮、勾选框换了字，颜色和大小跟着变是自然的，字的变化由里面那个元素报，这里不重复
  const renamed = !TEXT_IS_CONTENT.has(b.kind) && a.t !== b.t;
  if (!out.length && !renamed && a.l !== b.l) out.push({ type: "look" });
  if (!out.length && !renamed && CONTROL.has(b.kind) && (Math.abs(a.z[0] - b.z[0]) > JITTER || Math.abs(a.z[1] - b.z[1]) > JITTER)) {
    out.push({ type: "size" });
  }
  return out;
}

function sentence(type, list, extra) {
  const n = list.length;
  const one = list[0];
  const kind = NAME[one.it.kind];
  switch (type) {
    case "added":
      return n === 1 ? `新出现 ${nameOf(one.it)}` : `新出现 ${n} 处${kind}，如 ${nameOf(one.it)}`;
    case "removed":
      return n === 1 ? `${nameOf(one.it)} 没了` : `${n} 处${kind}没了，如 ${nameOf(one.it)}`;
    case "text": {
      const { a, b } = one;
      const one1 = !a.t ? `新写上了「${short(b.t)}」` : !b.t ? `「${short(a.t)}」清空了` : `「${short(a.t)}」改成了「${short(b.t)}」`;
      return n === 1 ? one1 : `${n} 处文字变了，如${one1}`;
    }
    case "state":
    case "cut":
      return n === 1 ? `${nameOf(one.it)}${extra}` : `${n} 个${kind}${extra}`;
    case "look":
      return n === 1 ? `${nameOf(one.it)} 的颜色或粗细变了` : `${n} 处${kind}的颜色或粗细变了`;
    case "size":
      return n === 1 ? `${nameOf(one.it)} 大小变了` : `${n} 个${kind}大小变了`;
    default:
      return "";
  }
}

const pct = (v, total) => Math.round(Math.min(100, Math.max(0, (v / total) * 100)) * 10) / 10;
const boxOf = (r, snap) => ({ x: pct(r[0], snap.w), y: pct(r[1], snap.h), w: pct(r[2], snap.w), h: pct(r[3], snap.h) });

const ROW_TYPES = new Set(["added", "removed", "text"]);
const rowsOf = (list) => [...new Set(list.map((f) => Math.round((f.r[1] + f.r[3] / 2) / 8)))].sort((p, q) => p - q).join(",");

/**
 * 表格里一整行新出现 / 没了 / 换了内容时，每一列各成一组（每列的单元格是不同的源码位置），
 * 十列就是十条。落在同一组行上、同一种变化的几组并成一条「N 行」。
 */
function mergeRows(groups) {
  const out = [];
  const byRows = new Map();
  for (const g of groups) {
    const f = g[0];
    if (!ROW_TYPES.has(f.type) || g.length < 2) {
      out.push({ list: g });
      continue;
    }
    const sig = `${f.type}|${f.side}|${rowsOf(g)}`;
    if (!byRows.has(sig)) out.push(byRows.set(sig, { list: [], parts: 0 }).get(sig));
    const row = byRows.get(sig);
    row.list.push(...g);
    row.parts++;
  }
  return out;
}

function toEntry({ list, parts = 1 }, was, now) {
  const f = list[0];
  const snap = f.side === "was" ? was : now;
  const top = list.reduce((m, x) => (x.r[1] < m.r[1] || (x.r[1] === m.r[1] && x.r[0] < m.r[0]) ? x : m), list[0]);
  let text;
  let boxes;
  if (parts > 1) {
    // 并成「N 行」的：一行一个框，框住这一行里变了的那几格
    const rows = [...groupBy(list, (x) => Math.round((x.r[1] + x.r[3] / 2) / 8)).values()];
    const sample = list.find((x) => x.it.kind === "text" && x.it.t) ?? f;
    const n = rows.length;
    text =
      f.type === "added" ? `新出现 ${n} 行，如 ${nameOf(sample.it)}` :
      f.type === "removed" ? `${n} 行没了，如 ${nameOf(sample.it)}` :
      `${n} 行内容变了，如「${short(sample.a?.t ?? "")}」改成了「${short(sample.b?.t ?? "")}」`;
    boxes = rows.slice(0, 60).map((cells) => {
      const x0 = Math.min(...cells.map((x) => x.r[0]));
      const y0 = Math.min(...cells.map((x) => x.r[1]));
      const x1 = Math.max(...cells.map((x) => x.r[0] + x.r[2]));
      const y1 = Math.max(...cells.map((x) => x.r[1] + x.r[3]));
      return boxOf([x0, y0, x1 - x0, y1 - y0], snap);
    });
  } else {
    text = sentence(f.type, list, f.phrase ?? "");
    boxes = list.slice(0, 60).map((x) => boxOf(x.r, snap));
  }
  return { side: f.side, text, boxes, at: [top.r[1], top.r[0]] };
}

/**
 * @returns {{ changes: { side: "now"|"was", text: string, boxes: {x,y,w,h}[] }[], more: number, moved: number }}
 */
export function diffLayouts(was, now) {
  const A = groupBy(was.items, (it) => it.k);
  const B = groupBy(now.items, (it) => it.k);
  const found = [];
  let moved = 0;
  const keys = [...new Set([...A.keys(), ...B.keys()])];
  // 第一遍只配「同一个东西」，得到画面各处的挪动量；第二遍再用它判「原地改了字」。
  // 参照点只取两版里都只出现一次的字——同样的字出现好几处时可能配错，挪动量就是假的；
  // 只取同一滚动区里的——表单滚了一截，滚动区外面没动的元素说明不了里面；
  // 取最近的三个，三个说法一致才算数，不一致就不下「原地改了」的结论
  const once = (map) => {
    const n = new Map();
    for (const list of map.values()) for (const it of list) n.set(`${it.k}|${it.t}`, (n.get(`${it.k}|${it.t}`) ?? 0) + 1);
    return n;
  };
  const onceA = once(A);
  const onceB = once(B);
  const anchors = keys
    .flatMap((key) => pairUp(A.get(key) ?? [], B.get(key) ?? []).pairs)
    .filter(([p]) => p.t && onceA.get(`${p.k}|${p.t}`) === 1 && onceB.get(`${p.k}|${p.t}`) === 1);
  const motionAt = (a) => {
    const near = anchors
      .filter(([p]) => p.sc === a.sc)
      .map(([p, q]) => ({ d: Math.hypot(p.r[0] - a.r[0], p.r[1] - a.r[1]), m: [q.r[0] - p.r[0], q.r[1] - p.r[1]] }))
      .sort((x, y) => x.d - y.d)
      .slice(0, 3);
    if (!near.length) return null;
    const spread = (i) => Math.max(...near.map((x) => x.m[i])) - Math.min(...near.map((x) => x.m[i]));
    if (spread(0) > 8 || spread(1) > 8) return null;
    return near[0].m;
  };
  for (const key of keys) {
    const { pairs, removed, added } = pairUp(A.get(key) ?? [], B.get(key) ?? [], motionAt);
    for (const it of added) found.push({ key, type: "added", side: "now", it, r: it.r });
    for (const it of removed) found.push({ key, type: "removed", side: "was", it, r: it.r });
    for (const [a, b] of pairs) {
      const cs = changesOf(a, b);
      if (!cs.length && (Math.abs(a.r[0] - b.r[0]) > JITTER || Math.abs(a.r[1] - b.r[1]) > JITTER)) moved++;
      for (const c of cs) found.push({ key, type: c.type, phrase: c.phrase ?? "", side: "now", it: b, a, b, r: b.r });
    }
  }

  // 同一身份、同一种变化（状态变化还要同一句话）并成一组
  const groups = [...groupBy(found, (f) => `${f.key}|${f.type}|${f.phrase ?? ""}`).values()];
  const entries = [...mergeRows(groups).map((g) => toEntry(g, was, now))];
  // 条目按在图上的先后排：先上后下、先左后右，和看图的顺序一致
  entries.sort((p, q) => p.at[0] - q.at[0] || p.at[1] - q.at[1]);
  return {
    changes: entries.slice(0, MAX_ENTRIES).map(({ at, ...e }) => e),
    more: Math.max(0, entries.length - MAX_ENTRIES),
    moved,
  };
}
