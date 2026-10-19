/**
 * 往一页的某一节里放物料
 * ------------------------------------------------------------------
 * 示范录屏、示范截图共用：物料拍好之后都是两步——找到那一节、放进去。
 *
 * 放的位置：给了格子（蓝图里的 <!--slot-->）且格子还在，就换掉格子；否则放在这一节
 * 自己的正文末尾。旁边的文字要不要跟着改，交给人或 IDE 里的 Agent。
 */

import { sectionsOf } from "./kb-md.mjs";
import { SLOT_RE, fillSlot } from "./plan-marks.mjs";

/** 找目标那一节：行号上的标题文字对得上就用它，对不上（正文在这之间被改过）按文字找 */
export function findSection(text, want) {
  const all = sectionsOf(text);
  return all.find((s) => s.line === want?.line && s.text === want?.text) ?? all.find((s) => s.text === want?.text) ?? null;
}

/** 一行是不是这一节里、指定类型的格子 */
function slotAt(lines, sec, line, kind) {
  const n = Number(line);
  if (!n || n <= sec.line || n >= sec.bodyEnd) return false;
  const m = (lines[n - 1] ?? "").match(SLOT_RE);
  return !!m && (!kind || m[1] === kind || { 截图: "shot", 录屏: "clip" }[m[1]] === kind);
}

/**
 * 把物料放进那一节。
 * @returns {{ text, at, filled }}  at 是物料第一行的行号；filled 表示换掉了格子
 */
export function placeMaterial(text, sec, materialLines, { slot, kind } = {}) {
  const lines = text.split("\n");
  if (slot && slotAt(lines, sec, slot, kind)) {
    return { text: fillSlot(text, slot, materialLines.join("\n\n")), at: Number(slot), filled: true };
  }
  let at = sec.bodyEnd - 1;
  while (at > sec.line && lines[at - 1].trim() === "") at--;
  lines.splice(at, 0, ...materialLines.flatMap((l) => ["", l]));
  return { text: lines.join("\n"), at: at + 2, filled: false };
}
