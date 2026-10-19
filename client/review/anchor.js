/**
 * 三层锚点 —— 批注定位的事实来源
 * ==================================================================
 * 设计说明见 docs/design/ANCHOR_AUTOMATION.md。三层各司其职：
 *
 *   L1 源码坐标 src          注入插件自动写入，权威层，可直接跳到「文件:行:列」
 *   L2 语义坐标 componentPath/role/name   自动派生，对改样式/换布局免疫，且人类可读
 *   L3 几何坐标 geo          兜底层，相对锚定元素的百分比坐标
 *
 * 重定位时按 L1 → L2 → L3 依次降级，并把命中层级作为 confidence 暴露出去——
 * 关键在于「定位失效必须被看见」，而不是静默钉在错误的位置上。
 *
 * 浮层（AppModal / AppDrawer）被 iView 传送到 <body>，不在评审根子树内，
 * 检索范围需要单独处理，见 OVERLAY_SELECTOR 一节。
 *
 * @typedef {"exact" | "moved" | "approx" | "overlay-closed" | "lost"} AnchorConfidence
 * @typedef {{ file: string, line: number, col: number }} SourceLoc
 * @typedef {{ kind: "modal" | "drawer", title: string }} OverlayRef
 * @typedef {{
 *   v: 2,
 *   src: SourceLoc | null,
 *   componentPath: string[],
 *   role: string,
 *   name: string,
 *   geo: { xPct: number, yPct: number },
 *   frs: string,
 *   overlay: OverlayRef | null,
 *   label: string,
 *   selector: string
 * }} CommentAnchor
 */

/* ------------------------------ 坐标序列化 ------------------------------ */

/** @returns {SourceLoc | null} */
export function parseLoc(raw) {
  if (!raw) return null;
  // 文件路径可能含冒号以外的任意字符，从右侧取两段数字
  const m = raw.match(/^(.*):(\d+):(\d+)$/);
  if (!m) return null;
  return { file: m[1], line: Number(m[2]), col: Number(m[3]) };
}

export function formatLoc(loc) {
  return loc ? `${loc.file}:${loc.line}:${loc.col}` : "";
}

/* ------------------------------ 语义信息提取 ------------------------------ */

const TAG_ROLE = {
  button: "button",
  a: "link",
  input: "textbox",
  textarea: "textbox",
  select: "combobox",
  table: "table",
  th: "columnheader",
  td: "cell",
  tr: "row",
  img: "img",
  h1: "heading",
  h2: "heading",
  h3: "heading",
  h4: "heading",
  ul: "list",
  ol: "list",
  li: "listitem",
  nav: "navigation",
  form: "form",
};

export function roleOf(el) {
  const explicit = el.getAttribute("role");
  if (explicit) return explicit;
  return TAG_ROLE[el.tagName.toLowerCase()] ?? el.tagName.toLowerCase();
}

function normalize(s) {
  return s.trim().replace(/\s+/g, " ").slice(0, 60);
}

/**
 * 可访问名称（简化版 accname 计算）。
 * 优先级：aria-label → aria-labelledby → 关联 label → alt/title → placeholder → 自身文本。
 */
export function accessibleName(el) {
  const aria = el.getAttribute("aria-label");
  if (aria && aria.trim()) return aria.trim();

  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    const text = labelledBy
      .split(/\s+/)
      .map((id) => {
        const target = document.getElementById(id);
        return target ? target.textContent ?? "" : "";
      })
      .join(" ")
      .trim();
    if (text) return normalize(text);
  }

  const id = el.getAttribute("id");
  if (id) {
    const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (label && label.textContent && label.textContent.trim()) return normalize(label.textContent);
  }

  const alt = el.getAttribute("alt") ?? el.getAttribute("title");
  if (alt && alt.trim()) return alt.trim();

  const placeholder = el.getAttribute("placeholder");
  if (placeholder && placeholder.trim()) return placeholder.trim();

  return normalize(el.textContent ?? "");
}

/** 向上收集 data-comp，得到外层 → 内层的组件路径（去重相邻重复，最多 5 层）。 */
export function componentPathOf(el) {
  const chain = [];
  let cur = el;
  while (cur && cur !== document.body) {
    const comp = cur.getAttribute("data-comp");
    if (comp && chain[0] !== comp) chain.unshift(comp);
    cur = cur.parentElement;
  }
  return chain.slice(-5);
}

/* ------------------------------ 兜底选择器 ------------------------------ */

/** 生成相对最近锚定祖先的短 CSS 选择器（尽力而为）。 */
function cssPath(el) {
  const parts = [];
  let cur = el;
  let depth = 0;
  while (cur && depth < 4 && cur.tagName.toLowerCase() !== "body") {
    let sel = cur.tagName.toLowerCase();
    const parent = cur.parentElement;
    if (parent) {
      const node = cur;
      const same = Array.from(parent.children).filter((n) => n.tagName === node.tagName);
      if (same.length > 1) sel += `:nth-of-type(${same.indexOf(node) + 1})`;
    }
    parts.unshift(sel);
    if (cur.hasAttribute("data-frs")) break;
    cur = parent;
    depth += 1;
  }
  return parts.join(" > ");
}

/* ------------------------------ 拾取 ------------------------------ */

function clamp(v) {
  return Math.max(0, Math.min(1, v));
}

/* ------------------------------ 浮层（传送到 body） ------------------------------ */

/**
 * 原型浮层的根节点。iView 会把 Modal / Drawer 传送到 <body>（v-transfer-dom），
 * 于是它们**落在 [data-review-root] 之外**——这正是浮层里的元素一度完全无法圈选、
 * 也无法被重定位找到的原因：两边都在用评审根当检索范围。
 *
 * 只认这两个类：规范要求原型浮层一律走 AppModal / AppDrawer（见 AGENTS.md 规则 3），
 * 因此它们覆盖了全部原型浮层。故意不放开 .v-transfer-dom 这类泛化匹配——下拉面板、
 * 日期面板也会传送出去，但它们随手一点就消失，锚在上面的批注注定重定位不到。
 */
const OVERLAY_SELECTOR = ".app-modal, .app-drawer";

/**
 * 当前「打开着」的浮层。
 *
 * 判可见，不能只判存在：iView 关闭 Modal / Drawer 用的是 display: none，节点仍留在
 * DOM 里。只判存在的话，浮层关着时 bySource 照样能查到里面的元素并判定为 exact，
 * 而隐藏元素的 getBoundingClientRect() 全为 0——Pin 会被静默钉到页面左上角。
 */
function openOverlay() {
  for (const el of document.querySelectorAll(OVERLAY_SELECTOR)) {
    // 量子节点，不能量容器自身：容器的子节点（遮罩与浮层体）都是 position: fixed，
    // 脱离普通流，容器高度**恒为 0**，拿它判可见会永远判成「关着」。
    // 逐个子节点看有没有占位，不依赖 iView 的内部类名，Modal 与 Drawer 同样成立。
    for (const child of el.children) {
      const r = child.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return el;
    }
  }
  return null;
}

/** 浮层身份：kind 决定提示措辞，title 让提示能报出具体是哪一个。 */
function overlayOf(el) {
  const root = el.closest(OVERLAY_SELECTOR);
  if (!root) return null;
  const kind = root.classList.contains("app-drawer") ? "drawer" : "modal";
  const head = root.querySelector(".ivu-modal-header-inner, .ivu-drawer-header-inner");
  return { kind, title: head ? normalize(head.textContent ?? "") : "" };
}

/** 找到承载源码坐标的最近祖先（含自身）。 */
function anchoredAncestor(el) {
  return el.closest("[data-use],[data-loc]");
}

/**
 * 归属区域。浮层在评审根之外，closest 找不到 [data-frs]，直接退回 APP_SHELL 会让
 * 所有浮层批注都归错区；改用评审根上记的当前路由区域。
 */
function frsOf(el) {
  const region = el.closest("[data-frs]");
  if (region) return region.getAttribute("data-frs");
  const root = document.querySelector("[data-review-root]");
  return (root && root.getAttribute("data-frs")) || "APP_SHELL";
}

/** 同一元素上，使用处（data-use）优先于定义处（data-loc）。 */
function locOf(el) {
  return parseLoc(el.getAttribute("data-use")) ?? parseLoc(el.getAttribute("data-loc"));
}

export function describeElement(el) {
  const name = accessibleName(el);
  const role = roleOf(el);
  return name ? `${role} · ${name}` : role;
}

/**
 * 点选时生成锚点。基准盒子取最近的锚定元素，几何精度远高于按整页计算。
 * @returns {CommentAnchor}
 */
export function createAnchor(el, clientX, clientY) {
  const anchored = anchoredAncestor(el);
  const base = anchored ?? el;
  const rect = base.getBoundingClientRect();

  return {
    v: 2,
    src: anchored ? locOf(anchored) : null,
    componentPath: componentPathOf(el),
    role: roleOf(el),
    name: accessibleName(el),
    geo: {
      xPct: clamp(rect.width ? (clientX - rect.left) / rect.width : 0),
      yPct: clamp(rect.height ? (clientY - rect.top) / rect.height : 0),
    },
    frs: frsOf(el),
    overlay: overlayOf(el),
    label: describeElement(el),
    selector: cssPath(el),
  };
}

/* ------------------------------ 重定位（补强） ------------------------------ */

function bySource(loc) {
  const v = CSS.escape(formatLoc(loc));
  return document.querySelector(`[data-use="${v}"], [data-loc="${v}"]`);
}

/**
 * L2/L3 的检索范围。浮层里的锚点必须在浮层内找：它不在评审根的子树里，
 * 拿评审根去 querySelector 是永远找不到的。
 */
function searchScope(anchor) {
  if (anchor.overlay) return openOverlay();
  return document.querySelector("[data-review-root]");
}

function bySemantics(anchor) {
  if (!anchor.role || !anchor.name) return null;
  const root = searchScope(anchor) ?? document.body;

  // 第一轮只按「角色 + 可访问名称」筛，这两项对改样式/换布局免疫
  const candidates = Array.from(root.querySelectorAll("*")).filter(
    (el) => roleOf(el) === anchor.role && accessibleName(el) === anchor.name,
  );
  if (candidates.length === 1) return candidates[0];
  if (candidates.length === 0) return null;

  // 多个同名同角色元素时才用组件路径消歧。
  // 组件路径不能当硬过滤条件：设了 inheritAttrs: false 的组件拿不到 data-use，
  // 硬过滤会把正确候选也筛掉。
  const leaf = anchor.componentPath[anchor.componentPath.length - 1];
  if (!leaf) return null;
  const narrowed = candidates.filter((el) => componentPathOf(el).includes(leaf));

  // 仍然只认唯一命中：区分不开就宁可降级，也不要猜错位置
  return narrowed.length === 1 ? narrowed[0] : null;
}

function bySelector(anchor) {
  if (!anchor.selector) return null;
  const scope = anchor.overlay
    ? openOverlay()
    : (document.querySelector(`[data-frs="${CSS.escape(anchor.frs)}"]`) ??
      document.querySelector("[data-review-root]"));
  if (!scope) return null;
  try {
    return scope.querySelector(anchor.selector);
  } catch {
    return null;
  }
}

/**
 * 按 L1 → L2 → L3 降级重定位，并给出置信度。
 * exact  源码坐标命中，位置精确
 * moved  源码已变但语义唯一命中，元素还在
 * approx 只能靠选择器或几何坐标近似
 * lost   全部失败，锚定元素已不存在
 * @returns {{ el: HTMLElement | null, confidence: AnchorConfidence }}
 */
export function relocate(anchor) {
  // 浮层里的锚点，浮层没开时直接判定，不能往下走三层链：浮层是 display: none 而非
  // 被移除，L1 照样能按源码坐标查到那个元素并报 exact，Pin 则钉在 0,0。
  // 这不是「丢失」，重新打开浮层就还在，如实说清楚即可。
  if (anchor.overlay && !openOverlay()) {
    return { el: null, confidence: "overlay-closed" };
  }

  if (anchor.src) {
    const el = bySource(anchor.src);
    if (el) return { el, confidence: "exact" };
  }

  const semantic = bySemantics(anchor);
  if (semantic) return { el: semantic, confidence: "moved" };

  const selected = bySelector(anchor);
  if (selected) return { el: selected, confidence: "approx" };

  // 浮层开着却三层都没命中：退回浮层本身近似定位，别掉进下面的页面区域兜底——
  // 那会把 Pin 钉到一个和批注无关的位置上。
  if (anchor.overlay) {
    return { el: openOverlay(), confidence: "approx" };
  }

  const region =
    document.querySelector(`[data-frs="${CSS.escape(anchor.frs)}"]`) ??
    document.querySelector("[data-review-root]");
  if (region) return { el: region, confidence: "approx" };

  return { el: null, confidence: "lost" };
}

/** 把重定位结果换算成视口坐标，用于渲染 Pin。 */
export function pinPosition(anchor, el) {
  const r = el.getBoundingClientRect();
  return {
    left: r.left + anchor.geo.xPct * r.width,
    top: r.top + anchor.geo.yPct * r.height,
  };
}

export const CONFIDENCE_HINT = {
  exact: null,
  moved: "源码位置已变，按组件语义重新定位",
  approx: "定位为近似结果，请确认锚定元素",
  "overlay-closed": "锚点在浮层内，重新打开该浮层即可定位",
  lost: "锚定元素已不存在",
};

/**
 * 带锚点上下文的提示。浮层关闭时能报出是哪一个（「线上数据导入」弹窗），
 * 否则用户只知道「在某个浮层里」，还得自己挨个翻。
 */
export function confidenceHint(anchor, confidence) {
  if (confidence !== "overlay-closed") return CONFIDENCE_HINT[confidence] ?? null;
  const kind = anchor.overlay && anchor.overlay.kind === "drawer" ? "抽屉" : "弹窗";
  const title = anchor.overlay && anchor.overlay.title;
  return title
    ? `锚点在「${title}」${kind}内，重新打开即可定位`
    : `锚点在${kind}内，重新打开即可定位`;
}

/* ------------------------------ v1 → v2 迁移 ------------------------------ */

/**
 * 旧批注读盘时自动升级，不需要手工迁移、不丢数据。
 * v1 没有源码与组件信息，首次重定位只能走 L3，会显示为 approx；
 * 重新圈选或回复后即可补齐高层坐标。
 * @returns {CommentAnchor}
 */
export function migrateAnchor(raw) {
  const a = raw ?? {};
  if (a.v === 2) return a;

  return {
    v: 2,
    src: null,
    componentPath: [],
    role: "",
    name: "",
    geo: { xPct: a.xPct ?? 0.5, yPct: a.yPct ?? 0.5 },
    frs: a.regionFrs ?? "APP_SHELL",
    overlay: null,
    label: a.label ?? "（旧批注）",
    selector: a.selector ?? "",
  };
}

/** 供评论抽屉与 PRD 导出使用的人读区域名，如 EvalTaskPage › PagePlaceholder › button["新建"] */
export function anchorSummary(anchor) {
  const path = anchor.componentPath.join(" › ");
  const leaf = anchor.name ? `${anchor.role}["${anchor.name}"]` : anchor.role;
  return path ? `${path} › ${leaf}` : leaf || anchor.label;
}
