/**
 * 需求件套（FRS）的读取与引用
 * ------------------------------------------------------------------
 * 内容构建链路里，FRS 是事实的一种来源：规格里的一句原文可以被手册原样引用，
 * 规格改了就要知道哪几句跟着失效。这里只负责「读」与「定位一句话」，
 * 不关心引用它的是谁。
 */

import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

import { FEATURES_DIR } from "./paths.mjs";

const sha = (s) => createHash("sha1").update(String(s)).digest("hex").slice(0, 12);

export const normRoute = (r) => `/${String(r ?? "").split("?")[0].replace(/^\//, "")}`;

/** FRS 的 status 字段在仓库里既有英文枚举也有「✅ 已确认」这种人读写法，收成一套 */
export function frsStatus(frs) {
  const s = String(frs?.status ?? "");
  if (/archived|归档/.test(s)) return "archived";
  if (/accepting|验收/.test(s)) return "accepting";
  if (/in_dev|开发/.test(s)) return "in_dev";
  if (/confirmed|已确认/.test(s)) return "confirmed";
  return "draft";
}

let frsCache = null;
export async function loadAllFrs({ fresh = false } = {}) {
  if (frsCache && !fresh) return frsCache;
  const out = new Map();
  const dirs = await fs.readdir(FEATURES_DIR, { withFileTypes: true }).catch(() => []);
  for (const e of dirs) {
    if (!e.isDirectory()) continue;
    const frs = await fs.readFile(path.join(FEATURES_DIR, e.name, "FRS.json"), "utf8").then(JSON.parse).catch(() => null);
    if (frs) out.set(e.name, frs);
  }
  frsCache = out;
  return out;
}

const RULES = ["display", "interaction", "value", "permission"];
const ruleText = (v) =>
  typeof v === "string"
    ? v
    : [v?.text ?? "", ...(v?.children ?? []).map((c) => `- ${typeof c === "string" ? c : c?.text ?? ""}`)]
        .filter(Boolean)
        .join("\n");

/** 一份 FRS 里所有可引用的事实：功能点名 + 四类规则逐条 */
export function factsOfFrs(key, frs) {
  const out = [];
  for (const g of frs?.spec ?? []) {
    const route = g.route ? normRoute(g.route) : null;
    (g.points ?? []).forEach((p, pi) => {
      const pid = p.id ?? `FP${pi + 1}`;
      const point = { id: pid, name: ruleText(p.name) };
      out.push({ ref: `${key}#${pid}.name`, text: point.name, rule: "name", index: null, point, frs: key, route, group: g.group });
      for (const rule of RULES) {
        (p[rule] ?? []).forEach((v, i) => {
          out.push({ ref: `${key}#${pid}.${rule}[${i}]`, text: ruleText(v), rule, index: i, point, frs: key, route, group: g.group });
        });
      }
    });
  }
  return out;
}

/**
 * `KEY#FP3.value[1]` → 那一句的当前文本；找不到返回 null。
 * 常驻进程（dev 服务）里要传 `frsMap` 进来：模块级缓存只在一次性的命令行里安全
 */
export async function resolveFrsFact(ref, frsMap = null) {
  const m = String(ref ?? "").match(/^([^#]+)#(.+)$/);
  if (!m) return null;
  const frs = (frsMap ?? (await loadAllFrs())).get(m[1]);
  if (!frs) return null;
  return factsOfFrs(m[1], frs).find((f) => f.ref === ref) ?? null;
}

/** 一份 FRS 的 spec 指纹：任一功能点、任一条规则的文字变了，指纹就变 */
export function specFingerprint(key, frs) {
  return sha(factsOfFrs(key, frs).map((f) => `${f.ref}:${f.text}`).join("\n"));
}
