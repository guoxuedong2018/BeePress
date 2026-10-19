/**
 * 示范录制：把一次点击变成录屏脚本能重放的一步
 * ------------------------------------------------------------------
 * 难点只有一个——选择器要**稳**：原型改几行代码之后，重拍还得找得到同一个按钮。
 * 所以按「人读得懂、改版后多半还在」的顺序挑：
 *
 *   1. 文字       `text=新建模板`，同名的多个时限定在最近的浮层 / 弹窗 / 卡片里
 *   2. 表单字段   `field=工作组 >> .ivu-select-selection`
 *   3. 占位符     `input[placeholder="输入模板名称"]`
 *   4. 结构路径   `div.page-card > table > tr:nth-of-type(2) …`，能用但改版容易断
 *   5. 源码坐标   `[data-loc="…"]`，只在上面都不行时兜底，标成「容易断」
 *
 * 每个候选都用录屏脚本**同一份**选择器引擎（cdp.mjs 的 SELECTOR_HELPER，由 dev 服务下发）
 * 当场解析一遍，找回来的就是刚点的那个元素才用——生成的和重放的是同一套规则。
 */

export function installFinder(cfg) {
  // eslint-disable-next-line no-new-func -- 选择器引擎的源码由 dev 服务下发，与录屏脚本注入的是同一份
  if (!window.__protoFind) new Function(cfg.selectorHelper)();
  window.__protoFieldSelector = cfg.fieldSelector;
}

const INTERACTIVE = [
  "button", "a", "input", "textarea", "select", "label",
  '[role="button"]', '[role="tab"]', '[role="option"]', '[role="menuitem"]', '[role="checkbox"]', '[role="radio"]', '[role="switch"]',
  ".ivu-select-selection", ".ivu-select-item", ".ivu-dropdown-item", ".ivu-menu-item", ".ivu-tabs-tab",
  ".ivu-checkbox-wrapper", ".ivu-radio-wrapper", ".ivu-switch", ".ivu-page-item", ".ivu-tag", ".ivu-tree-title",
].join(", ");

/** 点在图标、内层 span 上时，归到它所在的那个可操作元素 */
export function actionable(el) {
  return el.closest(INTERACTIVE) || el;
}

// 状态类（选中、展开、聚焦……）点完就变，不能进选择器
const UNSTABLE = /(^|-)(active|focused|focus|hover|visible|selected|checked|open|opened|disabled|enter|leave|show|hidden|loading|error|dirty|current)(-|$)|^is-|^has-|--|^v-|^router-link/;
const stableClasses = (el) => [...el.classList].filter((c) => !UNSTABLE.test(c) && !/\d{3,}/.test(c));
const textOf = (el) => (el?.innerText || el?.textContent || "").replace(/\s+/g, " ").trim();
const quote = (s) => String(s).replace(/"/g, '\\"');

function finds(sel, el) {
  try {
    const hit = window.__protoFind(sel);
    return !!hit && (hit === el || el.contains(hit));
  } catch {
    return false;
  }
}

const TEXT_ENTRY = 'textarea, input:not([type="radio"]):not([type="checkbox"]):not([type="hidden"])';

function byText(el) {
  const t = textOf(el);
  // 单选、复选的外壳里也有 input，但它们的文字就是选项名，照样按文字找；只有文本框不行
  if (!t || t.length > 30 || el.querySelector(TEXT_ENTRY)) return null;
  const want = `text=${t}`;
  // 在表单项里：`field=素材类型 >> text=图片` 最好读，也最不怕别处有同名的字
  const fs = window.__protoFieldSelector;
  const field = fs && el.closest(fs.container);
  const label = field && field.querySelector(fs.label)?.textContent.trim();
  if (label && finds(`field=${label} >> ${want}`, el)) return `field=${label} >> ${want}`;
  // 下拉项几乎总是和页面上别处的字重名（「算法不可见」既是选项又是行内标记），先限定浮层
  const pop = el.closest(".ivu-select-dropdown, .ivu-dropdown-menu, .ivu-poptip-popper, .ivu-modal-wrap, .ivu-drawer-wrap");
  if (pop) {
    const cls = stableClasses(pop)[0];
    if (cls && finds(`.${cls} >> ${want}`, el)) return `.${cls} >> ${want}`;
  }
  if (finds(want, el)) return want;
  for (let a = el.parentElement, depth = 0; a && a !== document.body && depth < 10; a = a.parentElement, depth++) {
    const cls = stableClasses(a)[0];
    if (cls && finds(`.${cls} >> ${want}`, el)) return `.${cls} >> ${want}`;
  }
  return null;
}

function byField(el) {
  const fs = window.__protoFieldSelector;
  const field = fs && el.closest(fs.container);
  const label = field && field.querySelector(fs.label)?.textContent.trim();
  if (!label) return null;
  const tag = el.tagName.toLowerCase();
  for (const inner of [...stableClasses(el).map((c) => `.${c}`), tag]) {
    if (finds(`field=${label} >> ${inner}`, el)) return `field=${label} >> ${inner}`;
  }
  return null;
}

function byAttr(el) {
  const tag = el.tagName.toLowerCase();
  for (const attr of ["placeholder", "aria-label", "title", "name"]) {
    const v = el.getAttribute(attr);
    if (v && finds(`${tag}[${attr}="${quote(v)}"]`, el)) return `${tag}[${attr}="${quote(v)}"]`;
  }
  return null;
}

function byPath(el) {
  const parts = [];
  for (let cur = el, depth = 0; cur && cur !== document.body && depth < 7; cur = cur.parentElement, depth++) {
    const cls = stableClasses(cur).slice(0, 2);
    let seg = cur.tagName.toLowerCase() + cls.map((c) => `.${CSS.escape(c)}`).join("");
    const sibs = cur.parentElement ? [...cur.parentElement.children].filter((c) => c.tagName === cur.tagName) : [];
    if (sibs.length > 1) seg += `:nth-of-type(${sibs.indexOf(cur) + 1})`;
    parts.unshift(seg);
    const sel = parts.join(" > ");
    if (finds(sel, el)) return sel;
  }
  return null;
}

/** @returns { selector, fragile } 或 null（点在了找不回来的地方） */
export function selectorFor(el) {
  const s = byText(el) ?? byField(el) ?? byAttr(el);
  if (s) return { selector: s, fragile: false };
  const p = byPath(el);
  if (p) return { selector: p, fragile: true };
  const loc = el.getAttribute("data-loc") ?? el.closest("[data-loc]")?.getAttribute("data-loc");
  if (loc && finds(`[data-loc="${quote(loc)}"]`, el)) return { selector: `[data-loc="${quote(loc)}"]`, fragile: true };
  return null;
}

/**
 * 截图范围：框选的那一块容器。和点击不同，找回来的必须**恰好是它**——
 * 找成里面的某个子元素，裁出来就只剩一角。所以不走文字（容器的字太长），
 * 按「独有的类名 → 结构路径 → 源码坐标」挑，每个都要求命中的就是它本身。
 */
export function regionSelectorFor(el) {
  const exact = (sel) => {
    try {
      return window.__protoFind(sel) === el;
    } catch {
      return false;
    }
  };
  for (const c of stableClasses(el)) {
    const s = `.${CSS.escape(c)}`;
    if (exact(s)) return { selector: s, fragile: false };
  }
  const parts = [];
  for (let cur = el, depth = 0; cur && cur !== document.body && depth < 8; cur = cur.parentElement, depth++) {
    const cls = stableClasses(cur).slice(0, 2);
    let seg = cur.tagName.toLowerCase() + cls.map((c) => `.${CSS.escape(c)}`).join("");
    const sibs = cur.parentElement ? [...cur.parentElement.children].filter((c) => c.tagName === cur.tagName) : [];
    if (sibs.length > 1) seg += `:nth-of-type(${sibs.indexOf(cur) + 1})`;
    parts.unshift(seg);
    if (exact(parts.join(" > "))) return { selector: parts.join(" > "), fragile: parts.length > 3 };
  }
  const loc = el.getAttribute("data-loc");
  if (loc && exact(`[data-loc="${quote(loc)}"]`)) return { selector: `[data-loc="${quote(loc)}"]`, fragile: true };
  return null;
}

/** 字段的人话名字：表单标签 > 占位符 > aria-label */
export function labelOf(el) {
  const fs = window.__protoFieldSelector;
  const field = fs && el.closest(fs.container);
  return (field && field.querySelector(fs.label)?.textContent.trim().replace(/[*：:]\s*$/, "")) || el.getAttribute("placeholder") || el.getAttribute("aria-label") || "";
}

/** 这一步默认的字幕。人在核对时可以改 */
export function captionFor(el) {
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || el.matches(".ivu-select-selection")) {
    const l = labelOf(el);
    return l ? `点「${l}」` : "点输入框";
  }
  const t = textOf(el);
  const short = t && t.length <= 20 ? t : "";
  if (el.closest(".ivu-select-dropdown, .ivu-dropdown-menu")) return short ? `选「${short}」` : "选一项";
  if (el.matches(".ivu-tabs-tab, [role=tab]")) return short ? `切到「${short}」` : "切换页签";
  if (el.matches(".ivu-checkbox-wrapper, [role=checkbox]") || el.querySelector?.(".ivu-checkbox")) return short ? `勾选「${short}」` : "勾上这一项";
  return short ? `点「${short}」` : "点这里";
}
