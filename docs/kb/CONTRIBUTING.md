---
title: 知识库写作约定
audience: [文档维护者]
docStatus: 已发布
publish: false
---

# 知识库写作约定

## 四层结构

| 层 | 位置 | 只回答 |
|---|---|---|
| 平台总览 | `README.md` | 这个产品有哪几块能力，从哪开始 |
| 核心概念 | `concepts/*.md` | 这些名词是什么，彼此什么关系 |
| 模块概述 | `<模块>/overview.md` | 模块解决什么，常用任务和 FAQ |
| 操作页 | `<模块>/<任务>.md` | 我要做 X，怎么一步步做 |

**概念独立成页。** 被多篇操作页引用的名词不要塞进其中一篇。

**操作页按用户任务命名，不按界面命名。** `create-task.md`，不是 `task-page.md`；
标题应能接在「我要……」后面。

## 先定话题，再排结构

一篇回答一个读者问题。`type` 决定起点结构：

| type | 读者 | 起点 |
|---|---|---|
| `howto` | 想做成一件事 | 何时用 → 开始之前 → 步骤 → 怎么确认 → FAQ |
| `concept` | 想弄明白是什么 | 为什么先理解 → 是什么 → 和谁有关 → 状态 |
| `reference` | 想查规则/取值 | 这张表管什么 → 规则 → 易误解点 |
| `troubleshoot` | 遇到问题 | 看到什么 → 为什么 → 怎么解决 → 找谁 |
| `overview` | 第一次进入模块 | 解决什么 → 常用任务 → 与其他模块关系 → FAQ |

**蓝图写在正文里**，发布时剥掉：

```md
## 怎么重跑

<!--intent 确认原因后决定重跑，先区分两种方式-->

<!--slot diagram 两种重跑分别重跑哪些对象、已有结果怎么处理-->
```

`intent` 是这一节要回答的问题；`slot` 是未填物料，类型 `shot` / `clip` / `diagram` / `table`。
规则和取值用表格，界面位置用截图，操作过程用录屏，对象关系/状态用流程图。

## 内容边界

| 写 | 不写 |
|---|---|
| 怎么做、做错会怎样、怎么确认 | 为什么这样设计（那是 FRS） |
| 影响用户决策的约束 | 技术实现（组件、接口、字段类型） |
| 人话术语 | 内部行话 |

判据：这条信息能不能帮读者做决定或避免踩坑。

## Front-matter

```yaml
---
title: 页面标题
audience: [目标读者]
docStatus: 待撰写 | 撰写中 | 已发布
type: howto
topic: 这篇回答读者的什么问题
pages: [/route]                 # 讲的是哪几屏
frs: [<FEATURE_KEY>]            # 事实来源；FRS 变了就知道哪页要动
iterating: 功能仍在迭代（可选，收口后删除）
publish: false                  # 可选：维护者页面不发布
---
```

`frs` 不是装饰：事实校验和「上游变了」都靠它。
`iterating` 表示功能还在改：审阅台不计入待处理，一键重拍会跳过。

## 只写已确认的需求

需求还是草案时，不要写进操作页；可以先建 stub 占住标题锚点。
标题就是锚点，更新通告要能深链到具体步骤。

## 配图

图由配方驱动，不手动截：

```bash
npx beepress capture-kb-shots --only <key> --headed   # 调配方
npx beepress capture-kb-shots --stale                # 只重拍过期的
```

- 配方：`shots.config.mjs`
- 产物：`images/<页面>/<序号>-<说明>.png`
- 页面一个图片目录，页面删了图也好清。

重拍后画面没变（渲染抖动不算变），引用页不会进待审；变了就进「待审」。

## 录屏

录屏讲操作过程：鼠标怎么走、点了哪里、浮层怎么弹出。

```bash
npx beepress record-kb-clips --only <key>
```

配方在 `clips.config.mjs`，产物在 `media/`，同时生成 MP4、GIF 和 SRT。
GIF 适合嵌入文档，MP4 适合归档。

## 审阅与确认

```bash
npx beepress kb status
npx beepress kb ack <页>
```

- `status` 是 Agent 的待办清单；`ack` 是人的确认动作。
- 不要让 Agent 为了让清单变绿而确认。
- 上游变了先改正文或配方，断掉的引用不会被 `ack` 修好。
