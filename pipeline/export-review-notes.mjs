#!/usr/bin/env node
/**
 * 原型批注 → 评审意见汇总 Markdown
 * ------------------------------------------------------------------
 * 读取 docs/reviews/<FRS>.json 里的批注，按需求区域归并成结构化章节，
 * 输出可交给宿主发布适配器（或内置 docs-cli 参考适配器）的 Markdown。
 *
 * 这条链路和「需求 → PRD」是两回事：那条的输入是 docs/features/<KEY>/ 的 FRS 件套，
 * 走 builder-kit export-frs-prd 与 builder-kit prd，产出给研发推敲细节的规格文档。
 * 这里产出的是评审意见清单，受众是需求方与设计评审。
 *
 * 用法：
 *   npx builder-kit export-review-notes                        # 全部批注 → docs/prd/<日期>-评审意见.md
 *   npx builder-kit export-review-notes --status open          # 只导出未解决项
 *   npx builder-kit export-review-notes --frs DESIGN_SYSTEM    # 只导出指定区域
 *   npx builder-kit export-review-notes --out -                # 输出到 stdout
 *   npx builder-kit export-review-notes --title "登录改版评审意见"
 *
 * 使用内置 docs-cli 参考适配器发布（需安装并登录兼容 CLI）：
 *   docs-cli word +create --title "<标题>" --content-file <生成的 md> --link-share READ_ONLY
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { PRD_DIR, REPO_ROOT, REVIEWS_DIR } from "./lib/paths.mjs";

const STATUS_LABEL = { open: "未解决", resolved: "已解决" };

function parseArgs(argv) {
  const args = { status: "all", frs: null, out: null, title: null };
  for (let i = 0; i < argv.length; i += 1) {
    const [key, inline] = argv[i].split("=");
    const take = () => inline ?? argv[++i];
    if (key === "--status") args.status = take();
    else if (key === "--frs") args.frs = take();
    else if (key === "--out") args.out = take();
    else if (key === "--title") args.title = take();
    else if (key === "--help" || key === "-h") args.help = true;
  }
  return args;
}

async function readComments() {
  let files;
  try {
    files = await fs.readdir(REVIEWS_DIR);
  } catch {
    return [];
  }
  const all = [];
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    try {
      const parsed = JSON.parse(await fs.readFile(path.join(REVIEWS_DIR, f), "utf8"));
      const arr = Array.isArray(parsed) ? parsed : (parsed.comments ?? []);
      all.push(...arr);
    } catch (err) {
      console.warn(`跳过无法解析的文件 ${f}：${err.message}`);
    }
  }
  return all;
}

/** 人读区域名，与 client/review/anchor.js 的 anchorSummary 保持一致 */
function anchorSummary(anchor = {}) {
  const chain = Array.isArray(anchor.componentPath) ? anchor.componentPath : [];
  const pathText = chain.join(" › ");
  const leaf = anchor.name ? `${anchor.role}["${anchor.name}"]` : anchor.role;
  return pathText ? `${pathText} › ${leaf}` : leaf || anchor.label || "未知区域";
}

function sourceRef(anchor = {}) {
  const src = anchor.src;
  if (!src?.file) return null;
  return `${src.file}:${src.line}:${src.col}`;
}

function groupBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

function renderMarkdown(comments, { title }) {
  const lines = [];
  const total = comments.length;
  const open = comments.filter((c) => c.status === "open").length;

  lines.push(`# ${title}`, "");
  lines.push(
    `> 由原型批注自动归并生成 · 共 ${total} 条，其中未解决 ${open} 条 · ${new Date().toLocaleString("zh-CN")}`,
    "",
  );
  lines.push(
    "> 每条意见附带原型中的区域路径与源码坐标，研发可据此直接定位到对应组件。",
    "",
  );

  const byFrs = groupBy(comments, (c) => c.frs || "APP_SHELL");
  for (const [frs, group] of [...byFrs.entries()].sort()) {
    lines.push(`## ${frs}`, "");

    const byRoute = groupBy(group, (c) => c.route || "/");
    for (const [route, routeGroup] of [...byRoute.entries()].sort()) {
      lines.push(`### 页面 \`${route}\``, "");

      const sorted = [...routeGroup].sort((a, b) =>
        String(a.createdAt).localeCompare(String(b.createdAt)),
      );
      for (const c of sorted) {
        lines.push(`#### ${anchorSummary(c.anchor)}`, "");

        const meta = [`状态：${STATUS_LABEL[c.status] ?? c.status}`, `提出人：${c.author ?? "-"}`];
        const ref = sourceRef(c.anchor);
        if (ref) meta.push(`源码：\`${ref}\``);
        lines.push(meta.join(" · "), "");

        lines.push(c.body?.trim() || "（无正文）", "");

        if (Array.isArray(c.replies) && c.replies.length > 0) {
          lines.push("讨论：", "");
          for (const r of c.replies) {
            lines.push(`- **${r.author}**：${r.body}`);
          }
          lines.push("");
        }
      }
    }
  }

  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(
      [
        "用法: npx builder-kit export-review-notes [选项]",
        "",
        "  --status <all|open|resolved>  按状态筛选，默认 all",
        "  --frs <KEY>                   只导出指定需求区域",
        "  --out <路径|->                输出路径，- 表示 stdout",
        "  --title <标题>                文档标题",
      ].join("\n"),
    );
    return;
  }

  let comments = await readComments();
  if (comments.length === 0) {
    console.error("docs/reviews/ 下没有批注。先运行 npm run dev，在原型上圈选留言后再导出。");
    process.exitCode = 1;
    return;
  }

  if (args.status !== "all") comments = comments.filter((c) => c.status === args.status);
  if (args.frs) comments = comments.filter((c) => c.frs === args.frs);

  if (comments.length === 0) {
    console.error("按当前筛选条件没有匹配的批注。");
    process.exitCode = 1;
    return;
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const title = args.title ?? `原型评审意见汇总 ${stamp}`;
  const markdown = renderMarkdown(comments, { title });

  if (args.out === "-") {
    process.stdout.write(markdown);
    return;
  }

  const outPath = args.out
    ? path.resolve(REPO_ROOT, args.out)
    : path.join(PRD_DIR, `${stamp}-评审意见.md`);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, `${markdown}\n`, "utf8");

  const rel = path.relative(REPO_ROOT, outPath);
  console.log(`已生成 ${rel}（${comments.length} 条批注）`);
  console.log("");
  console.log("发布到目标端（内置 docs-cli 参考示例）：");
  console.log(`  docs-cli word +create --title "${title}" --content-file ${rel} --link-share READ_ONLY`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
