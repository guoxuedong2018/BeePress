import { promises as fs } from "node:fs";
import path from "node:path";

import { FEATURES_DIR, KB_DIR } from "./paths.mjs";

/**
 * 需求件套的内容覆盖情况（给 kb-plan 印排期表）
 * ==================================================================
 * 只算事实，**不打印、不写盘、不做判断**。「哪些文档要审、哪些物料该重拍」
 * 不在这里——那是 content-build.mjs 的 buildStatus()，审阅台和 kb CLI 共用。
 */

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

export async function loadIndex() {
  return readJson(path.join(KB_DIR, "_index.json"), null);
}

const txt = (v) => (typeof v === "string" ? v : v?.text ?? "");

/** spec 里的全部功能点，扁平化 */
export function specPoints(frs) {
  return (frs?.spec ?? []).flatMap((g) =>
    (g.points ?? []).map((p) => ({ page: g.page, name: txt(p.name), ac: p.ac ?? [] })),
  );
}

/** 每份需求件套的内容产出覆盖情况 */
export async function featureRows(index) {
  const keys = (await fs.readdir(FEATURES_DIR, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  const rows = [];
  for (const key of keys) {
    const frs = await readJson(path.join(FEATURES_DIR, key, "FRS.json"), null);
    if (!frs) continue;
    const pages = index?.byFrs?.[key] ?? [];
    const pageMeta = pages.map((p) => index.pages.find((x) => x.path === p)).filter(Boolean);
    const written = pageMeta.filter((p) => p.docStatus === "已发布");

    rows.push({
      key,
      goal: frs.goal ?? "",
      status: frs.status ?? "?",
      pages,
      pageMeta,
      written: written.length,
      points: specPoints(frs),
      audience: [...new Set(pageMeta.flatMap((p) => p.audience ?? []))],
    });
  }
  return rows;
}
