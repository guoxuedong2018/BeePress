# BuilderHarness · Agent 工作指南

> 本仓库既是 BuilderHarness 工具本身，也是它的第一个宿主项目（dogfooding）。
> 不要把内部平台名、域名、账号或密钥写进仓库。

## 这个仓库是什么

需求规格、原型、评审和内容在同一个仓库里协作：

- 需求：`docs/features/<KEY>/`，模板在 `docs/templates/`；自身需求见 `docs/features/`（ONBOARDING / COCKPIT / REVIEW）
- 评审 UI：`client/`（React，构建产物进 `build/`）
- 原型参考实现：`examples/react-tailwind/`（可运行，`npm run dev`）
- DSH 插件与操作台：`integrations/host/`（`lib/client.js` 是主面板与右侧栏）
- 桌面壳：`integrations/desktop/`
- 批注：`docs/reviews/`
- 内容：`docs/kb/`
- 发布状态：`docs/kb/_published.json`

## 工作流索引

按需读取，不要一次全塞进上下文：

| 场景 | 读什么 |
|---|---|
| 新需求评审 | `.agent/skills/requirement-review/SKILL.md` |
| 写 FRS / 需求件套 | `.agent/skills/prd-author/SKILL.md` + `docs/templates/` |
| 写 / 更新知识库 | `.agent/skills/content-draft/SKILL.md` + `docs/kb/CONTRIBUTING.md` |
| 处理批注 | `.agent/skills/review-local/SKILL.md` |
| 原型实现 | `.agent/skills/ui-prototype/SKILL.md` |
| Vue 2 宿主 | `.agent/skills/vue-best-practices/SKILL.md` |
| 提交前质量检查 | `.agent/skills/frontend-quality/SKILL.md` |
| 发布 | `.agent/skills/prd-publish/SKILL.md` + `docs/WORKFLOW.md` |
| 产品定位 / 对外文案 | `docs/brand.md` |
| 部署原型 | `.agent/skills/deploy-prototype/SKILL.md` + `docs/DEPLOY.md` |

## 角色边界

- 人：确认需求状态、内容锁、发布目标和外发范围。
- Agent：读源码、写文件、跑检查、生成媒体、提出方案；不替人做确认。
- 工具：负责落盘、校验和可复现产物；不隐藏失败。

## 硬性规则

1. **先看源码和现状，再改。** 不要按旧文档或示例数据推断产品事实。
2. **批注按源码坐标定位。** 坐标失效时报告降级原因，不要静默漂移。
3. **内容以 Markdown 为唯一真源。** 不另建一份内容 JSON 副本。
4. **事实要可追溯。** 抄自 FRS 或源码的句子用 `frs:` / `code:` 标记。
5. **发布是外发动作。** 先 dry-run，确认目标、密级和分享范围。
6. **不提交密钥、真实用户数据或内部域名。**
7. **开发期 UI 不得进入生产构建。** 只通过 `import.meta.env.DEV` 挂载。

> `check-ui` / `check-routes` are reference host checks. They expect a
> design-token setup and a three-place route registry; adapt them to the host
> or leave them out if the host uses a different convention.

## 必须由人确认

- 需求从草案进入已确认；
- 内容引用从「待审」进入「确认」；
- 发布目标、发布范围和密级；
- 任何会改变产品语义的取舍。

## 常用命令

```bash
npx builderharness kb status
npx builderharness kb context <页|路由>
npx builderharness kb ack <页>
npx builderharness check-frs <KEY>
npx builderharness check-ui          # reference host check; see caveat below
npx builderharness check-routes
npx builderharness prd <KEY> --dry-run
```

## Harness

- Cursor / Claude Code / Codex：把本文件作为入口，按表格按需读取 Skill。
- DeepSeek Harness：安装 `@builderharness/dsh-bundle`，使用右侧栏面板和 `builderharness_*` 工具。
- 其他 Agent：只要能读文件、跑命令，就能使用同一套工作流。
