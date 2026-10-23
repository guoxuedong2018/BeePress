# BuilderHarness · Claude 入口

仓库约定与工作流见 [AGENTS.md](./AGENTS.md)。本文件只补充 Claude Code 的读取顺序：

1. 先读 `AGENTS.md` 的角色边界与硬性规则。
2. 需求规格在 `docs/features/<KEY>/`，模板在 `docs/templates/`。
3. 改操作台前先读 `integrations/host/lib/client.js`；改桌面壳前先读 `integrations/desktop/main.cjs`。
4. 提交前跑 `npm run check`。
