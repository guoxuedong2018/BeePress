/**
 * 画面清单：截图那一刻，裁剪区里看得见的每个元素是什么、写着什么、什么状态、在哪。
 *
 * 为什么要它：审阅台要回答的是「这张图哪里变了、怎么变的」，只靠像素答不了——
 * 像素差异是「原来那里有的」和「现在那里有的」叠在一起，不分先后：一个东西没了，
 * 框落在「现在」那张的空白处；一行变高，下面每一行都算变了。浏览器在截图那一刻其实
 * 什么都知道，以前全扔了只留像素（2026-10-08 勾选框旁边空白处被框，评审说架构有问题）。
 *
 * 只收「原子」：带字的元素、表单控件、按钮、勾选框 / 单选 / 开关、图标、图片。容器不收——
 * 容器变没变由它里面的原子说。被浮层蒙住的、被滚动区挡住的、落在留白里的都不收。
 *
 * 身份按「源码文件 + 从最近的源码锚点往下的标签路径 + 种类」认，**不带行号**：
 * 改代码时行号整体挪动，带行号就会让整页都成了「删了又加」。
 */
import { evaluate } from "./cdp.mjs";

const PAGE_SCRIPT = `
(function (subject) {
  var STATE = /(^|-)(checked|disabled|active|selected|error|open|indeterminate|loading)$/;
  var styleMemo = new Map();
  function style(el) {
    var s = styleMemo.get(el);
    if (!s) { s = getComputedStyle(el); styleMemo.set(el, s); }
    return s;
  }
  function ownText(el) {
    var t = '';
    for (var n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 3) t += n.textContent;
    return t.replace(/\\s+/g, ' ').trim();
  }
  function classOf(el) {
    return typeof el.className === 'string' ? el.className : el.getAttribute('class') || '';
  }
  function kindOf(el, tag, cls, text) {
    if (/^(input|textarea|select)$/.test(tag)) return el.type === 'hidden' ? null : 'field';
    if (tag === 'img' || tag === 'video' || tag === 'canvas') return 'media';
    if (tag === 'svg' || /(^|\\s)ivu-icon(\\s|$)/.test(cls)) return 'icon';
    if (/(^|\\s)ivu-(checkbox|radio|switch)(\\s|$)/.test(cls)) return 'toggle';
    if (tag === 'button') return 'button';
    if (text) return 'text';
    return null;
  }
  // 「图层」：最近的 fixed 祖先，没有就是 body 下面那一层。被蒙层盖住的页面元素，
  // 在它中心点打到的是蒙层——图层不同，就是看不见
  var layerMemo = new Map();
  function layerOf(el) {
    if (layerMemo.has(el)) return layerMemo.get(el);
    var out = el;
    for (var p = el; p && p !== document.body; p = p.parentElement) {
      if (style(p).position === 'fixed') { out = p; break; }
      out = p;
    }
    layerMemo.set(el, out);
    return out;
  }
  // 被滚动区、overflow:hidden 的祖先裁掉之后还剩下的那块
  function visibleRect(el) {
    var r = el.getBoundingClientRect();
    var x0 = r.left, y0 = r.top, x1 = r.right, y1 = r.bottom;
    for (var p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      var s = style(p);
      if (!/(hidden|auto|scroll|clip)/.test(s.overflow + s.overflowX + s.overflowY)) continue;
      var q = p.getBoundingClientRect();
      x0 = Math.max(x0, q.left); y0 = Math.max(y0, q.top); x1 = Math.min(x1, q.right); y1 = Math.min(y1, q.bottom);
      if (x1 <= x0 || y1 <= y0) return null;
    }
    return { x0: x0, y0: y0, x1: x1, y1: y1 };
  }
  // 最近的滚动区：同一个滚动区里的东西一起挪，判「原地改了字」只拿同一滚动区里的邻居作参照
  var scrollMemo = new Map();
  function scrollerOf(el) {
    for (var p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      if (scrollMemo.has(p)) return scrollMemo.get(p);
      var s = style(p);
      if (/(auto|scroll)/.test(s.overflowY + s.overflowX) && (p.scrollHeight > p.clientHeight + 1 || p.scrollWidth > p.clientWidth + 1)) {
        var key = keyOf(p, 'scroll');
        scrollMemo.set(p, key);
        return key;
      }
    }
    return '';
  }
  // 自己或往上三层里有「…」截断的
  function isCut(el) {
    for (var p = el, i = 0; p && i < 4; p = p.parentElement, i++) {
      var s = style(p);
      if (s.textOverflow === 'ellipsis' && p.scrollWidth > p.clientWidth + 1) return 1;
    }
    return 0;
  }
  function stateOf(el, cls) {
    var out = cls.split(/\\s+/).filter(function (c) { return STATE.test(c); }).map(function (c) { return c.match(STATE)[2]; });
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') out.push('disabled');
    if (el.checked || el.getAttribute('aria-checked') === 'true') out.push('checked');
    if (el.getAttribute('aria-selected') === 'true') out.push('selected');
    return Array.from(new Set(out)).sort().join(' ');
  }
  // 输入框的占位文字是它的身份不是内容：表单滚动后两个输入框可能恰好落在同一处，不能配成「改了字」
  function keyOf(el, kind) {
    var anchor = el.closest('[data-use],[data-loc]');
    var loc = anchor ? anchor.getAttribute('data-use') || anchor.getAttribute('data-loc') : '';
    var file = loc.replace(/:\\d+:\\d+$/, '');
    var steps = [];
    for (var p = el; p && p !== anchor && steps.length < 4; p = p.parentElement) {
      var base = classOf(p).split(/\\s+/).filter(function (c) { return c && !STATE.test(c); })[0];
      steps.unshift(p.tagName.toLowerCase() + (base ? '.' + base : ''));
    }
    return file + '|' + steps.join('>') + '|' + kind + (kind === 'field' && el.placeholder ? '|' + el.placeholder : '');
  }

  var items = [];
  var all = document.body.getElementsByTagName('*');
  for (var i = 0; i < all.length && items.length < 4000; i++) {
    var el = all[i];
    var tag = el.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style') continue;
    if (el.closest('#__manual_marks, .bk-root, [data-review-ui]')) continue;
    if (tag !== 'svg' && el.closest('svg')) continue;
    var cls = classOf(el);
    var text = ownText(el);
    var kind = kindOf(el, tag, cls, text);
    if (!kind) continue;
    var s = style(el);
    if (s.visibility === 'hidden' || Number(s.opacity) === 0) continue;
    var full = el.getBoundingClientRect();
    var v = visibleRect(el);
    if (!v) continue;
    var x0 = Math.max(v.x0, subject.x), y0 = Math.max(v.y0, subject.y);
    var x1 = Math.min(v.x1, subject.x + subject.width), y1 = Math.min(v.y1, subject.y + subject.height);
    if (x1 - x0 < 1 || y1 - y0 < 1) continue;
    var hit = document.elementFromPoint((x0 + x1) / 2, (y0 + y1) / 2);
    if (!hit || layerOf(hit) !== layerOf(el)) continue;
    if (kind === 'field') text = el.value || '';
    if (kind === 'media') text = el.getAttribute('alt') || '';
    if (kind === 'icon') text = (cls.match(/ivu-icon-([\\w-]+)/) || [])[1] || '';
    // 按钮、勾选框的字在子元素或旁边的 label 里：这里的字只用来称呼它，字本身变没变由那个子元素说
    if (kind === 'button') text = (el.textContent || '').replace(/\\s+/g, ' ').trim();
    if (kind === 'toggle') text = ((el.closest('label') || el.parentElement).textContent || '').replace(/\\s+/g, ' ').trim();
    // 无障碍名：只有图标的按钮靠它称呼（IconButton 的 label 必填）
    var named = el.closest('[aria-label],[title]');
    items.push({
      k: keyOf(el, kind),
      kind: kind,
      t: text.slice(0, 120),
      n: named && named.contains(el) ? (named.getAttribute('aria-label') || named.getAttribute('title') || '').slice(0, 40) : '',
      s: stateOf(el, cls),
      c: isCut(el),
      sc: scrollerOf(el),
      l: [s.color, s.backgroundColor, s.fontWeight].join(' '),
      r: [x0, y0, x1 - x0, y1 - y0].map(function (n) { return Math.round(n * 2) / 2; }),
      // 元素本身的大小（没被滚动区裁过）：比「大小变了」用它，半截滚出去不算变小
      z: [Math.round(full.width), Math.round(full.height)],
    });
  }
  return items;
})
`;

/**
 * @param clip    截图的裁剪框（视口 CSS 像素）：坐标都换成相对它的左上角
 * @param subject 截图对象本身（裁剪框去掉四边留白）：留白里的东西不收
 * @returns {{ w: number, h: number, items: object[] }}
 */
export async function layoutSnapshot(session, clip, subject = clip) {
  const items = await evaluate(session, `${PAGE_SCRIPT}(${JSON.stringify(subject)})`);
  return {
    w: clip.width,
    h: clip.height,
    items: (items ?? []).map((it) => ({ ...it, r: [it.r[0] - clip.x, it.r[1] - clip.y, it.r[2], it.r[3]] })),
  };
}
