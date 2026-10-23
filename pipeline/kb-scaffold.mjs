#!/usr/bin/env node
/**
 * 知识库骨架生成
 * ------------------------------------------------------------------
 * 按 docs/kb/outline.config.mjs 那份大纲，在 docs/kb/ 下补齐缺失的页面。**已存在的文件一律不动**，
 * 所以可以反复跑：加了新页就在 docs/kb/outline.config.mjs 里补一条，重跑即可。
 *
 * 分层照 Langfuse 的做法（langfuse.com/docs）：
 *
 *   平台总览   README.md              整个平台在解决什么、从哪开始
 *   核心概念   concepts/*.md          名词与关系，被所有操作页共同引用
 *   域概述     <模块>/overview.md     这个模块解决什么 + 常用任务 + FAQ
 *   操作页     <模块>/<任务>.md       Why → 开始之前 → 分步 → FAQ
 *
 * 为什么概念要独立成页：它会被多篇操作页引用（例如创建和编辑流程都要解释同一个概念），
 * 塞进任一篇操作页就会在另一篇里重写一遍，两份迟早对不上。
 *
 * 骨架按话题类型取模板（lib/topic-types.mjs）：每节带意图（这节回答什么）和物料格子
 * （建议用截图 / 录屏 / 流程图 / 表格讲），这是一份可调的蓝图，不是定死的格式。
 *
 * 为什么 stub 里先把 H2/H3 摆好：**标题就是锚点契约**。内容可以后填，但锚点先定下来，
 * 需求迭代时才谈得上「这次改动落在 <页面>#<锚点>」——这是内容运营系统那一格的输入。
 *
 * 用法：
 *   npx builderharness kb-scaffold          # 补齐缺失页面
 *   npx builderharness kb-scaffold --list   # 只列大纲，不落盘
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { KB_DIR } from "./lib/paths.mjs";
import { TOPIC_TYPES, skeletonOf } from "./lib/topic-types.mjs";

/** 大纲里每页的 kind 就是话题类型，骨架取自话题模板（带节意图与物料格子） */
const KINDS = Object.keys(TOPIC_TYPES);

// 大纲是业务内容，在 docs/kb/outline.config.mjs；套件只提供四层结构与各层骨架
const { OUTLINE } = await import(`file://${path.join(KB_DIR, "outline.config.mjs")}`);

const fm = (o) =>
  [
    "---",
    `title: ${o.title}`,
    `audience: [${(o.audience ?? ["全体"]).join(", ")}]`,
    `docStatus: 待撰写`,
    o.kind ? `type: ${o.kind}` : null,
    o.topic ? `topic: ${o.topic}` : null,
    o.pages?.length ? `pages: [${o.pages.join(", ")}]` : null,
    o.frs?.length ? `frs: [${o.frs.join(", ")}]` : null,
    "---",
  ]
    .filter(Boolean)
    .join("\n");

function stub(page) {
  let body;
  if (page.sections) body = page.sections.map(([h, intent]) => `## ${h}\n\n<!--intent ${intent}-->\n`).join("\n");
  else if (TOPIC_TYPES[page.kind]) body = skeletonOf(page.kind, { routes: page.pages ?? [] });
  else throw new Error(`${page.file}: kind 要是 ${KINDS.join(" / ")} 之一，或直接给 sections`);
  return `${fm(page)}\n\n# ${page.title}\n\n${page.lead}\n\n${body}`;
}

async function main() {
  const listOnly = process.argv.includes("--list");
  const created = [];
  const skipped = [];

  for (const group of OUTLINE) {
    const pages = [...(group.pages ?? [])];
    if (group.overview) {
      pages.unshift({
        file: "overview.md",
        ...group.overview,
        kind: "overview",
      });
    }
    for (const page of pages) {
      const rel = path.join("docs", "kb", group.dir, page.file);
      const abs = path.join(KB_DIR, group.dir, page.file);
      if (listOnly) {
        console.log(`  ${rel}  —  ${page.title}`);
        continue;
      }
      try {
        await fs.access(abs);
        skipped.push(rel);
        continue;
      } catch {
        /* 不存在才写 */
      }
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, stub(page));
      created.push(rel);
    }
  }

  if (listOnly) return;
  console.log(`新建 ${created.length} 页，跳过已存在 ${skipped.length} 页`);
  for (const f of created) console.log(`  + ${f}`);
  for (const f of skipped) console.log(`  = ${f}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
