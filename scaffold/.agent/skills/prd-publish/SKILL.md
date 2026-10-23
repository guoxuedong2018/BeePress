---
name: prd-publish
description: 把已确认的 FRS 发布成 PRD 或评审文档。适用于用户说「发布 PRD」「生成评审文档」「把需求发到文档平台」时；发布是外发动作，必须先 dry-run 并由人确认目标、密级和分享范围。
---

# PRD 发布

## 前提

- `npx builderharness check-frs <KEY>` 通过；
- 需求状态已是「已确认」或用户明确要求预览；
- 发布目标已通过 `BUILDERHARNESS_PUBLISH_GATEWAY` 配置；没有配置时不要伪造发布结果。

## 步骤

1. 预览：

```bash
npx builderharness prd <KEY> --dry-run
```

2. 检查计划：目标页面、创建/更新、图片、密级、分享范围。
3. 让人确认后执行：

```bash
npx builderharness prd <KEY> --yes
```

4. 把返回的文档地址和版本写回 FRS 的 `prdDocId`，或记录到需求 README 的文件导航。

## 边界

- 不把内部域名、账号、密钥写进仓库。
- 发布失败时保留本地构建产物；不要静默重试到线上。
- 发布计划与目的地适配器 UI 在 dsh 面板 / Studio 中查看；命令行只负责确定性构建。
