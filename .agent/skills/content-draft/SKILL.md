---
name: content-draft
description: 写或改一页知识库（docs/kb/*.md）：先定话题与类型，按节意图和物料格子规划结构，再用 beepress kb context 取引用、路由、配方和规格原文，写正文、给事实打标记、补截图/录屏配方。也用于上游变化后按待审清单逐条核对。当用户说「/content-draft <页>」「把这页写一下」「这页上游变了」「给需求 X 补文档」时触发。不确认、不发布。
---

# 知识库起草 / 回流

内容链路是一个构建系统。先读 `docs/kb/CONTRIBUTING.md`。

| 东西 | 在哪 | 谁改 |
|---|---|---|
| 叙述 | `docs/kb/<模块>/<页>.md` | Agent / 人 |
| 截图配方 | `docs/kb/shots.config.mjs` | Agent |
| 录屏配方 | `docs/kb/clips.config.mjs` | Agent |
| 事实来源 | `docs/features/<KEY>/FRS.json` / 源码 | 上游 |
| 确认状态 | `docs/kb/_lock.json` | 人 |

## 写一页

1. 查已有页，避免同一问题写两篇。
2. 建页或改页：

```bash
npx beepress kb new <模块>/<名字>.md <类型> "<话题>" --pages=/a,/b
npx beepress kb context <页|路由>
```

3. 按 `intent` / `slot` 蓝图排结构；`slot` 类型：`shot` / `clip` / `diagram` / `table`。
4. 写正文。抄自 FRS 或源码的句子用事实标记：

```md
<!--f frs:KEY/FP1-->这句必须与规格一致<!--/f-->
<!--f code:src/App.jsx:42-->界面文案<!--/f-->
```

5. 补配方并重拍：

```bash
npx beepress capture-kb-shots --only <key>
npx beepress record-kb-clips --only <key>
```

6. 自检：

```bash
npx beepress kb status
npx beepress kb check
```

## 上游变了

1. 跑 `npx beepress kb status`，逐条看：
   - 引用断掉 → 修正文或补配方；
   - 值变了 → 核对后改正文；
   - 只是未确认 → 留给人在审阅台确认。
2. 不要为了让清单变绿而 `ack`；确认是人的动作。

## 边界

- 只写已确认的需求；草案不写进操作页。
- 原因、取值、规则来自 FRS 或界面文案，不从示例数据归纳。
- 不改 `_lock.json` 来「修复」状态。
