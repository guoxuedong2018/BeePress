---
title: 知识库
audience: [全体]
docStatus: 待撰写
publish: false
---

# 知识库

这里放产品的操作指南、概念和规则参考。写作约定见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 从哪开始

- 第一次进入：先看概念页，再看对应模块的 `overview.md`。
- 要完成一个任务：按 `guides/` 下的操作页走。
- 查规则或取值：看 `reference` 类型的页面。

## 结构

```text
docs/kb/
├── README.md
├── CONTRIBUTING.md
├── outline.config.mjs
├── shots.config.mjs
├── clips.config.mjs
├── concepts/
│   └── overview.md
├── <模块>/
│   ├── overview.md
│   └── <任务>.md
├── images/<页面>/
└── media/<页面>/
```

先用 `npx builderharness kb-scaffold` 按大纲生成页面，再用
`npx builderharness kb status` 看哪些引用需要确认。
