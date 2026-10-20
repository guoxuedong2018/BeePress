/**
 * 知识库大纲（宿主项目的业务内容）
 * ------------------------------------------------------------------
 * `npx beepress kb-scaffold` 按这份大纲补齐 docs/kb/ 页面。
 * 这里只放「有哪些模块、每个模块有哪些页」；四层结构和页面骨架由套件提供。
 *
 * kind: howto / concept / reference / troubleshoot / overview
 */
export const OUTLINE = [
  {
    dir: "concepts",
    label: "核心概念",
    pages: [
      {
        file: "overview.md",
        title: "核心概念",
        lead: "先读这一页，理解产品里的名词和它们的关系。",
        audience: ["全体"],
        kind: "concept",
      },
    ],
  },
  {
    dir: "guides",
    label: "使用指南",
    overview: {
      title: "使用指南总览",
      lead: "按任务找到对应的操作说明。",
      audience: ["全体"],
    },
    pages: [
      {
        file: "getting-started.md",
        title: "开始使用",
        lead: "第一次使用产品时，从注册到完成第一个任务。",
        audience: ["全体"],
        kind: "howto",
      },
    ],
  },
];
