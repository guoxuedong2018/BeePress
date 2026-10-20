/**
 * 对比度工具
 * ==================================================================
 * 供 beepress/pipeline/check-ui.mjs（构建时校验）与设计系统规范页（运行时实算并展示）共用，
 * 两边算法必须是同一份，否则页面上显示"达标"而构建报"不达标"。
 *
 * 判定基准：WCAG 2.1 AA。正文基准 12px、辅助标注 11px，
 * 都属于 WCAG 定义的"小字"（大字指 ≥18.66px 粗体或 ≥24px），因此
 * 一律按 4.5:1 要求，不能套用大字的 3:1。
 */

/** #rgb / #rrggbb → [r, g, b]，取值 0~255 */
export function parseHex(hex) {
  let c = String(hex).trim().replace("#", "");
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  return [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16));
}

export function toHex([r, g, b]) {
  const f = (v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0");
  return `#${f(r)}${f(g)}${f(b)}`;
}

/** WCAG 相对亮度 */
function luminance(hex) {
  const [r, g, b] = parseHex(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** 对比度，1 ~ 21 */
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export const AA_SMALL_TEXT = 4.5;

export function rgbToHsl(hex) {
  const [r, g, b] = parseHex(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === r
      ? ((g - b) / d + (g < b ? 6 : 0)) / 6
      : max === g
        ? ((b - r) / d + 2) / 6
        : ((r - g) / d + 4) / 6;
  return [h, s, l];
}

export function hslToRgb([h, s, l]) {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [hue(h + 1 / 3), hue(h), hue(h - 1 / 3)].map((v) => v * 255);
}

/**
 * 把 `color` 压暗（或提亮）到相对 `bg` 达标为止，**色相与饱和度保持不变**。
 * 只动明度是刻意的：换色相等于换了一套视觉语言，改动会被当成"重新设计"；
 * 只压明度则肉眼几乎看不出差别，却能过线。
 *
 * 步长 0.005 是为了取到"刚好达标"的那一档，不要一压到底压成黑色。
 */
export function toAccessible(color, bg, target = AA_SMALL_TEXT) {
  if (contrast(color, bg) >= target) return color;

  const [h, s, l] = rgbToHsl(color);
  // 底色亮就往暗里走，底色暗就往亮里走
  const darken = luminance(bg) > luminance(color) || luminance(bg) > 0.18;

  for (let step = 0.005; step <= 1; step += 0.005) {
    const next = darken ? l - step : l + step;
    if (next < 0 || next > 1) break;
    const candidate = toHex(hslToRgb([h, s, next]));
    if (contrast(candidate, bg) >= target) return candidate;
  }
  return darken ? "#000000" : "#ffffff";
}
