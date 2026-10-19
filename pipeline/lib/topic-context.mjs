/**
 * 按话题建一页
 * ------------------------------------------------------------------
 * 一篇文档从话题出发：它要回答什么问题（topic）、属于哪一类（type）、讲的是哪几屏（pages）。
 * front-matter 记下这三样，正文按话题类型的模板排出骨架（意图 + 格子）。
 */

import { promises as fs } from "node:fs";
import path from "node:path";

import { normRoute } from "./frs.mjs";
import { renderFrontMatter } from "./kb-md.mjs";
import { KB_DIR } from "./paths.mjs";
import { TOPIC_TYPES, skeletonOf } from "./topic-types.mjs";

/**
 * 骨架只是起点：结构在审阅台「构成」里调，或交给 IDE 里的 Agent 按话题提议蓝图。
 */
export async function createTopicPage({ path: rel, title, type, topic, pages = [], frs = [], audience = [], lead = "" }) {
  if (!rel || rel.includes("..") || !rel.endsWith(".md")) throw new Error("页面路径要是 <模块>/<名字>.md");
  if (!TOPIC_TYPES[type]) throw new Error(`话题类型要是 ${Object.keys(TOPIC_TYPES).join(" / ")} 之一`);
  if (!String(topic ?? "").trim()) throw new Error("要写清这篇回答什么问题（话题）");
  const abs = path.join(KB_DIR, rel);
  if (await fs.access(abs).then(() => true, () => false)) throw new Error(`已经有这一页了：${rel}`);
  // 每个目录发布成云文档里的一个节点，节点就是它的 overview.md；没有它，这一页发不出去
  const dir = path.posix.dirname(rel);
  if (dir !== "." && !(await fs.access(path.join(KB_DIR, dir, "overview.md")).then(() => true, () => false))) {
    throw new Error(`${dir}/ 还没有 overview.md（模块概述），先建它，或放进已有的模块目录`);
  }
  const routes = [].concat(pages).map(normRoute);
  // 路由会写进 front-matter 的数组和正文的格子注释里，逗号、方括号、`-->` 都会把它们弄坏
  const bad = routes.find((r) => !/^\/[\w\-./]*$/.test(r));
  if (bad) throw new Error(`路由「${bad}」不对，要是 /xxx 这样的路径`);
  const fm = renderFrontMatter({
    title: title || topic,
    audience: audience.length ? audience : ["全体"],
    docStatus: "待撰写",
    type,
    topic: String(topic).replace(/\n/g, " ").trim(),
    pages: routes.length ? routes : undefined,
    frs: frs.length ? frs : undefined,
  });
  const body = `# ${title || topic}\n\n${lead || "<!--intent 开头一两句：这篇讲什么、读完能做什么-->"}\n\n${skeletonOf(type, { routes })}`;
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, `${fm}\n${body}`);
  return rel;
}
