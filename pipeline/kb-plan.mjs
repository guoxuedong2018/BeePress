#!/usr/bin/env node
/**
 * 内容影响范围分析
 * ------------------------------------------------------------------
 * 绿线的**第一格**：一个需求做完了，它到底牵动哪些内容工作？
 *
 * 这一步以前全靠人脑记：改了送标模板，要想起来「手册里那两页要改、术语表要加词」。
 * 需求多了必然漏，而漏掉是静默的——没人会发现某页文档停在三个月前。
 *
 * 这个脚本把判断所需的**事实**摆出来，判断仍然由人做：
 *
 *   1. 哪些知识库页面声明了依赖这份 FRS（`frs:` front-matter 反查）
 *   2. 这些页面里，哪些还是「待撰写」——需求上线了但文档还是空的
 *   3. 这份 FRS 改了哪些功能点，对应的文档段落可能要跟着动
 *   4. 面向哪些角色（从页面的 audience 汇总）
 *
 * **不自动改任何东西。** 它只回答「该做什么」，做不做、怎么写由人定——
 * 这一格是判断密集的，自动生成叙述只会产出读起来像规格书的东西。
 *
 * 用法：
 *   npx builder-kit kb-plan                    # 扫全部需求，给概览
 *   npx builder-kit kb-plan <FEATURE_KEY>      # 单个需求的详细影响面
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { FEATURES_DIR, KB_DIR } from "./lib/paths.mjs";
import { featureRows, specPoints } from "./lib/content-state.mjs";

function parseArgs(argv) {
  const args = { key: null, help: false };
  for (const a of argv) {
    if (a === "--help" || a === "-h") args.help = true;
    else if (!a.startsWith("-")) args.key = a;
  }
  return args;
}

async function loadFrs(key) {
  const raw = await fs.readFile(path.join(FEATURES_DIR, key, "FRS.json"), "utf8").catch(() => null);
  return raw ? JSON.parse(raw) : null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(
      [
        "用法: npx builder-kit kb-plan [FEATURE_KEY]",
        "",
        "  不带 key    扫全部需求给概览",
        "  带 key      算这个需求的内容影响面",
      ].join("\n"),
    );
    return;
  }

  const index = await fs
    .readFile(path.join(KB_DIR, "_index.json"), "utf8")
    .then(JSON.parse)
    .catch(() => null);
  if (!index) throw new Error("找不到 docs/kb/_index.json，先跑 npx builder-kit kb-index");

  const keys = (await fs.readdir(FEATURES_DIR, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  if (!args.key) return overview(index);

  if (!keys.includes(args.key)) throw new Error(`没有这个需求目录：${args.key}`);
  await detail(args.key, index);
}

/** 全局视角：哪些需求还没有内容产出。事实由 content-state 统一算，这里只负责印 */
async function overview(index) {
  console.log("需求 → 内容产出覆盖情况\n");
  const rows = await featureRows(index);

  for (const r of rows) {
    const n = r.pages.length;
    const doc = n === 0 ? "无页面声明依赖" : `${r.written}/${n} 页已发布`;
    const note = n === 0 ? "  ← 没有任何文档挂这份 FRS" : r.written < n ? "  ← 有页面还没写" : "";
    console.log(`  ${r.key}\n      状态 ${r.status.padEnd(8)} 文档 ${doc}${note}`);
  }

  const noDoc = rows.filter((r) => r.pages.length === 0);
  console.log("");
  if (noDoc.length) console.log(`⚠️  ${noDoc.length} 个需求没有任何文档声明依赖它——要么该补文档，要么该在页面 front-matter 里挂 frs`);
  console.log("\n看单个需求：npx builder-kit kb-plan <FEATURE_KEY>");
  console.log("要动手：npx builder-kit kb status —— 待审、该重拍、待撰写与没页面挂靠的需求都在里面");
}

/** 单需求视角：这次迭代牵动什么 */
async function detail(key, index) {
  const frs = await loadFrs(key);
  const points = specPoints(frs);
  const pages = index.byFrs?.[key] ?? [];

  console.log(`${key}\n  ${frs.goal ?? "（FRS 没写 goal）"}\n  状态：${frs.status ?? "?"}\n`);

  console.log("① 声明依赖这份 FRS 的知识库页面");
  if (pages.length === 0) {
    console.log("     （没有）——页面 front-matter 里加 `frs: [本 KEY]` 才能被反查到\n");
  } else {
    for (const p of pages) {
      const meta = index.pages.find((x) => x.path === p);
      const flag = meta?.docStatus === "已发布" ? "  " : "⚠️ ";
      console.log(`     ${flag}${p}  [${meta?.docStatus ?? "?"}]  ${meta?.anchors.length ?? 0} 个锚点`);
    }
    console.log("");
  }

  console.log(`② spec 功能点（${points.length} 个）——逐条判断要不要动文档`);
  for (const p of points) console.log(`     ${p.name}${p.ac.length ? `  [${p.ac.join(", ")}]` : ""}`);
  if (points.length === 0) console.log("     （这份 FRS 还没写 spec）");
  console.log("");

  const audience = [...new Set(index.pages.filter((p) => pages.includes(p.path)).flatMap((p) => p.audience))];
  console.log(`③ 面向角色：${audience.length ? audience.join(" / ") : "（页面没标 audience）"}`);
}

main().catch((err) => {
  console.error(`分析失败：${err.message}`);
  process.exitCode = 1;
});
