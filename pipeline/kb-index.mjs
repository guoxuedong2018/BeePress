#!/usr/bin/env node
/**
 * 知识库锚点索引
 * ------------------------------------------------------------------
 * 扫 docs/kb/ 下所有 Markdown，抽出「文档树 + 每页的 H2/H3 锚点 + front-matter」
 * 写成 docs/kb/_index.json。
 *
 * 这份索引是内容运营的地基。有了它才谈得上：
 *
 *   - **文档影响范围分析**：新需求进来，回答「这次改动落在哪几页的哪个锚点」
 *   - **通告不断链**：快讯里的「详见操作手册」链接由锚点生成，指不到就构建失败
 *   - **FRS 变更影响面**：某份 FRS 改了，反查出所有 frs 字段引用它的页面
 *   - **覆盖度**：还有几页是「待撰写」，哪些模块一篇都没写
 *
 * 真源是 Markdown 本身，这份 JSON 是它的派生——所以随时可以删了重建，
 * 不要手改。
 *
 * 用法：
 *   npx builderharness kb-index           # 重建索引
 *   npx builderharness kb-index --check   # 只校验不写盘（校验失败退出码非 0）
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { KB_DIR, REPO_ROOT } from "./lib/paths.mjs";

import { staleMedia } from "./lib/media-ledger.mjs";
// 标题 → 锚点、front-matter 只在 lib/kb-md.mjs 定义一次，与 kb-publish 同源
import { parseFrontMatter, slugify } from "./lib/kb-md.mjs";

const OUT_FILE = path.join(KB_DIR, "_index.json");

async function walk(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    // _ 开头的是构建状态（锁、台账、索引、缓存），不是页面
    if (entry.name.startsWith(".") || entry.name.startsWith("_") || entry.name === "images" || entry.name === "media") continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(abs)));
    else if (entry.name.endsWith(".md")) out.push(abs);
  }
  return out;
}

async function main() {
  const checkOnly = process.argv.includes("--check");
  const files = (await walk(KB_DIR)).sort();
  const pages = [];
  const problems = [];

  for (const abs of files) {
    const rel = path.relative(KB_DIR, abs).split(path.sep).join("/");
    const text = await fs.readFile(abs, "utf8");
    const { data, body } = parseFrontMatter(text);

    // 代码块里的 # 不是标题（mermaid、bash 注释都会误命中）
    const withoutFences = body.replace(/```[\s\S]*?```/g, "");
    const anchors = [];
    for (const line of withoutFences.split("\n")) {
      const h = line.match(/^(#{2,3})\s+(.*\S)\s*$/);
      if (!h) continue;
      anchors.push({ level: h[1].length, text: h[2], anchor: slugify(h[2]) });
    }

    const dup = anchors
      .map((a) => a.anchor)
      .filter((a, i, arr) => arr.indexOf(a) !== i);
    if (dup.length) problems.push(`${rel}: 锚点重复 ${[...new Set(dup)].join(", ")}`);
    if (!data.title) problems.push(`${rel}: front-matter 缺 title`);

    // 页内图片引用要真实存在，否则发到云文档就是一张挂图
    for (const m of body.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) {
      const src = m[1];
      if (/^https?:/.test(src)) continue;
      const target = path.resolve(path.dirname(abs), src);
      try {
        await fs.access(target);
      } catch {
        problems.push(`${rel}: 图片不存在 ${src}`);
      }
    }

    pages.push({
      path: rel,
      title: data.title ?? null,
      audience: data.audience ?? [],
      docStatus: data.docStatus ?? "待撰写",
      // 功能还在迭代：`docStatus` 讲的是「写到哪一步」，这个讲的是「底下的东西稳没稳」，
      // 两者正交——一页可以既已发布、功能又还在改（导入页就是）
      iterating: data.iterating ?? null,
      frs: data.frs ?? [],
      anchors,
      // 页内链接留到第二轮统一校验——第一轮还不知道别的页有哪些锚点
      links: [...body.matchAll(/\]\((\.[^)\s#]*\.md)(#[^)\s]*)?\)/g)].map((m) => ({
        to: m[1],
        anchor: m[2] ? decodeURIComponent(m[2].slice(1)) : null,
      })),
    });
  }

  /**
   * 第二轮：跨页链接与锚点校验。
   *
   * 这是整份索引最该拦住的一类错——更新通告里的「详见操作手册」深链就靠它。
   * 链接指到一个不存在的锚点，Markdown 不会报错，云文档也照发，
   * 只有点进去的读者会落到页首然后自己找。
   */
  const anchorsByPage = new Map(
    pages.map((p) => [p.path, new Set(p.anchors.map((a) => a.anchor))]),
  );
  for (const page of pages) {
    for (const link of page.links) {
      const target = path
        .normalize(path.join(path.dirname(page.path), link.to))
        .split(path.sep)
        .join("/");
      if (!anchorsByPage.has(target)) {
        problems.push(`${page.path}: 链接指向不存在的页面 ${link.to}`);
        continue;
      }
      if (link.anchor && !anchorsByPage.get(target).has(slugify(link.anchor))) {
        problems.push(`${page.path}: 链接 ${link.to}#${link.anchor} 的锚点不存在`);
      }
    }
  }

  const byStatus = {};
  for (const p of pages) byStatus[p.docStatus] = (byStatus[p.docStatus] ?? 0) + 1;

  const index = {
    generatedAt: new Date().toISOString().slice(0, 10),
    pageCount: pages.length,
    anchorCount: pages.reduce((n, p) => n + p.anchors.length, 0),
    byStatus,
    // FRS → 引用它的页面，用于回答「这份需求改了，哪几页要跟着动」
    byFrs: pages.reduce((acc, p) => {
      for (const key of p.frs) (acc[key] ??= []).push(p.path);
      return acc;
    }, {}),
    pages,
  };

  if (problems.length) {
    console.error(`发现 ${problems.length} 个问题：`);
    for (const p of problems) console.error(`  ✗ ${p}`);
  }

  // 只按源码内容哈希判：源码变了 → 该重拍。重拍后产物字节没变，引用它的文档不会被打扰
  // （早截断），所以这里不再需要「本次改动不影响这张」这种人工豁免
  const stale = await staleMedia();
  if (stale.length) {
    console.log(`\n⚠️  ${stale.length} 张截图录屏过期了（拍完之后页面代码改过）：`);
    for (const s of stale) {
      const files = [...s.changed, ...s.added].slice(0, 3).join("、") || s.removed.slice(0, 3).join("、");
      console.log(`     ${s.key}  ← ${files}${s.changed.length + s.added.length > 3 ? " 等" : ""}`);
    }
    console.log("\n     重拍：npx builderharness kb shoot --stale");
    console.log("     （只是提醒，不阻断构建——重拍后图没变，引用它的文档不会被打扰）");
  }

  if (!checkOnly) {
    await fs.writeFile(OUT_FILE, `${JSON.stringify(index, null, 2)}\n`);
    console.log(`已写入 ${path.relative(REPO_ROOT, OUT_FILE)}`);
  }
  console.log(`${index.pageCount} 页，${index.anchorCount} 个锚点`);
  console.log(
    "  状态：" +
      Object.entries(byStatus)
        .map(([k, v]) => `${k} ${v}`)
        .join(" / "),
  );
  const covered = Object.keys(index.byFrs);
  console.log(`  已挂 FRS 的需求：${covered.length ? covered.join(", ") : "（无）"}`);

  if (problems.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
