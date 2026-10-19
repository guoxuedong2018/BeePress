# Tool UI Spec Kit

> 一套面向 **coding agent** 的工具型产品 UI 规范工具包。
> 它不是给人读的设计手册，而是**agent 可执行、可自检、可门禁**的约束系统。

---

## 1. 这套东西解决什么问题

当你让 agent 反复迭代前端时，会遇到三个必然问题：

| 问题 | 表现 | 本方案的解法 |
| :-- | :-- | :-- |
| **漂移** | 第 1 版是暖灰，第 5 版变冷灰；圆角从 8px 飘到 7px | 令牌化 + grep 门禁（A1/A4/A5） |
| **膨胀** | 每加一个功能就多一层边框、多一个颜色 | 反模式清单 + 单边框硬规则（LAY-04/05） |
| **短视** | 界面"能看"，但中文输入误发、断网丢数据 | 边界守卫 + 交互门禁（EDGE/C 段） |

核心思路：**把设计决策从"审美判断"降维成"规则查表"**，让 agent 没有发挥空间，也就没有漂移空间。

---

## 2. 文件地图

```
ui-spec-kit/
├── README.md          ← 你在这里：集成指南
├── UI-SPEC.md         ← 规范正文（人审 + agent 按需查阅）
├── AGENT-RULES.md     ← 常驻注入版（进 system prompt / rules 文件）
├── SELF-CHECK.md      ← 交付门禁（含可执行 grep 与机器可读 JSON）
├── tokens.json        ← 单一事实源（机器可读令牌）
├── tokens.css         ← 运行时（直接 @import）
├── ui-spec.html       ← 可视化手册（团队对齐 / 设计评审用）
├── ADAPTER-VUE.md     ← Vue 适配指南（映射表 + 代码示例 + 坑）
└── impl/
    └── react/         ← React 参考实现（正典）
        ├── tailwind.config.cjs     从 tokens.json 派生
        ├── index.ts               统一导出
        ├── lib/
        │   ├── cn.ts              类名合并
        │   ├── motion.ts          4 套弹簧预设
        │   └── useScrollPinning.ts  流式滚动防抢夺
        └── components/
            ├── Button.tsx         4 尺寸 × 5 变体
            ├── Card.tsx           含 CardTitle / CardDescription
            ├── Input.tsx          含 Field
            ├── Badge.tsx          强制图标冗余编码
            ├── Dialog.tsx         焦点陷阱 + Esc + 焦点归还
            ├── Composer.tsx       IME 守卫 + 自适应高度
            ├── Message.tsx        user / assistant 双态
            ├── CodeBlock.tsx      2.5s 复制衰减
            ├── EmptyState.tsx     强制行动按钮
            ├── SegmentedControl.tsx  roving tabindex
            └── Table.tsx          数字列等宽右对齐
```

**三个角色分工**：

- `tokens.json` → **唯一权威**。所有颜色/间距/圆角/动效值以此为准。
- `AGENT-RULES.md` → **常驻上下文**。控制 token 预算，只放最高频规则。
- `UI-SPEC.md` → **完整参考**。agent 遇到规则未覆盖的情况时按需检索。

---

## 2.1 技术栈策略

规范在**原则层框架无关，实现层 React 为正典**。

| 栈 | 地位 | 怎么用 |
| :-- | :-- | :-- |
| React 18 + TS + Tailwind | **正典** | 直接用 `impl/react/*`，新组件以它为参考 |
| Vue 3 + TS + Tailwind | 适配 | 令牌层原样复用，组件按 `ADAPTER-VUE.md` 重写 |

三条纪律：

1. **令牌只有一份。** 多框架项目把 `tokens` 抽成独立包，两端 `peerDepend` 同一份。
2. **组件不跨框架。** 不要做"框架无关的组件库"——共享规范，各自实现。
3. **改组件前先改规范。** 先更新 `UI-SPEC.md §6` 的配方，再同步两套实现。

**React 版依赖**：

```bash
npm i tailwindcss@^4 @tailwindcss/postcss@^4 clsx tailwind-merge
npm i framer-motion          # 仅在使用 SPRING_* 预设时需要
```

Tailwind 4 在入口 CSS 中导入 `@import "tailwindcss";`，再用
`@config "./tailwind.config.cjs";` 加载令牌配置；PostCSS 插件是
`@tailwindcss/postcss`。容器查询已内置，不再需要额外插件。若使用
`data-theme="dark"` 切换主题，在入口 CSS 加：

```css
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));
```

---

## 3. 集成到 Harness 的三种模式

### 模式 A · 最小接入（10 分钟）

适合：已有 Harness，只想加 UI 约束。

**步骤 1** — 把令牌引入项目：

```bash
cp ui-spec-kit/tokens.css  src/styles/tokens.css
cp ui-spec-kit/tokens.json src/styles/tokens.json
```

```css
/* src/styles/index.css */
@import "./tokens.css";
```

**步骤 2** — 把常驻规则挂到 agent 的 rules 文件：

```bash
cp ui-spec-kit/AGENT-RULES.md ./AGENTS.md   # 或追加到已有 AGENTS.md
```

**步骤 3** — 把门禁加入提交前钩子：

```json
// package.json
{
  "scripts": {
    "ui:check": "bash scripts/ui-gate.sh",
    "precommit": "npm run typecheck && npm run ui:check"
  }
}
```

`scripts/ui-gate.sh` 直接复用 `SELF-CHECK.md` A 段的 grep 命令。

---

### 模式 B · 分层注入（推荐）

适合：认真做 Harness，需要控制上下文预算。

关键洞察：**不是所有规则都该常驻**。agent 的上下文窗口有限，塞满规则会挤压业务代码的理解空间。

```
┌─────────────────────────────────────────┐
│ L0 常驻（每次请求都带）                    │
│   AGENT-RULES.md  §1 十条铁律            │  ~300 tokens
│   AGENT-RULES.md  §2 令牌速查            │  ~600 tokens
│   AGENT-RULES.md  §4 绝对禁止            │  ~300 tokens
├─────────────────────────────────────────┤
│ L1 按任务注入（检测到 UI 任务时）          │
│   AGENT-RULES.md  §3 决策树              │
│   AGENT-RULES.md  §5 四个守卫            │
│   UI-SPEC.md      §6 组件配方（相关组件）  │
├─────────────────────────────────────────┤
│ L2 按需检索（agent 主动调用）              │
│   UI-SPEC.md      全文                    │
│   tokens.json     具体值                  │
├─────────────────────────────────────────┤
│ L3 交付时强制                              │
│   SELF-CHECK.md   全部门禁                │
└─────────────────────────────────────────┘
```

**Harness 伪代码**：

```ts
function buildContext(task: Task) {
  const base = load('AGENT-RULES.md#L0');           // 常驻

  if (isUITask(task)) {
    return base
      + load('AGENT-RULES.md#L1')
      + load('UI-SPEC.md#component-recipes', task.components);
  }
  return base;
}

function beforeCommit() {
  const result = runGate('SELF-CHECK.md');
  if (!result.pass) throw new Error(result.report);
}
```

---

### 模式 C · 工具化（最高约束力）

适合：多人协作、多 agent 并行。

把规范变成**可执行工具**，而不是可读文档：

| 工具 | 作用 | 实现 |
| :-- | :-- | :-- |
| `ui-lint` | 静态检查 A1–A8 | ESLint 插件 / grep 脚本 |
| `ui-tokens` | 从 `tokens.json` 生成 CSS / Tailwind / TS 类型 | Node 脚本 |
| `ui-gate` | 跑完 SELF-CHECK，输出结构化报告 | CI step |
| `ui-preview` | 渲染组件到浅/深双主题截图 | Playwright |

**Tailwind 配置派生**（避免令牌与工具类脱节）：

```js
// tailwind.config.cjs（由入口 CSS 的 @config 加载）
const t = require('./src/styles/tokens.json');

module.exports = {
  theme: {
    extend: {
      colors: {
        surface: {
          0: 'var(--surface-0)', 1: 'var(--surface-1)',
          2: 'var(--surface-2)', 3: 'var(--surface-3)',
        },
        accent: 'var(--accent)',
        'text-primary': 'var(--text-primary)',
      },
      borderRadius: t.radius,
      spacing: t.space,
      fontSize: Object.fromEntries(
        Object.entries(t.typography.scale)
          .map(([k, v]) => [k, [v.size, { lineHeight: v.lineHeight }]])
      ),
    },
  },
};
```

---

## 4. 定制：把它变成你自己的规范

这套规范默认值偏"暖中性 + 陶土橙"，因为它被验证过适合长时间注视。但你应该按品牌替换。

### 4.1 只改可变量

打开 `tokens.css` 的 `:root`，**只改这一段**：

```css
:root {
  /* ① 换强调色 —— 全站唯一彩色 */
  --accent: #2f6f5e;            /* 例：墨绿 */
  --accent-hover: #25594b;
  --accent-active: #1d473c;
  --accent-subtle: rgba(47, 111, 94, 0.10);
  --accent-ring: rgba(47, 111, 94, 0.40);

  /* ② 换中性温度 —— 冷中性示例 */
  --surface-0: #f4f5f6;
  --surface-1: #fafbfb;
  --surface-2: #ffffff;
  --surface-3: #ffffff;

  /* ③ 换字体 */
  --font-sans: "Inter", "PingFang SC", sans-serif;

  /* ④ 换圆角性格（锐利型） */
  --radius-panel: 6px;
  --radius-xl: 8px;
  --radius-2xl: 10px;
  --radius-composer: 10px;
}
```

### 4.2 不要改的（不变量）

- 四层表面的**存在性**（可换色值，不可减层）
- 单闭合边框原则
- 圆角的**语义分级关系**（可整体缩放，不可打乱层级）
- 动效的**四类分工**
- 所有 `EDGE` / `A11Y` 规则

> 改了不变量，这套规范就退化成"另一套审美偏好"，失去约束力。

---

## 5. 版本与演进

| 变更 | 版本位 | 必做动作 |
| :-- | :-- | :-- |
| 新增规则/令牌 | MINOR | 同步 4 个文件 |
| 收紧规则（存量可能不合规） | MAJOR | 附迁移指南 + 全量回归 |
| 澄清措辞 | PATCH | 无需迁移 |

**同步检查清单**（每次改规范必跑）：

```
□ tokens.json 已更新
□ tokens.css 已同步
□ AGENT-RULES.md 速查表已同步
□ SELF-CHECK.md 门禁项已同步
□ ui-spec.html 可视化已同步
□ 版本号三处一致（json / css / spec）
```

---

## 6. 落地建议

### 6.1 不要一次全上

按这个顺序引入，阻力最小：

1. **第 1 周**：只上 `tokens.css` + A1/A2 两条门禁（裸色值、禁用动效）
   → 立刻止住 80% 的视觉漂移
2. **第 2 周**：加 `AGENT-RULES.md` L0 + LAY-04/05（单边框）
   → 解决界面"厚重感"
3. **第 3 周**：加 EDGE-01/02（IME、滚动）
   → 解决最伤用户的边界问题
4. **第 4 周**：全量门禁 + 可视化手册评审

### 6.2 让 agent 引用规则 ID

在 code review 时，评论直接写规则号：

```
❌ LAY-05: 容器内的按钮不应有边框，请改 ghost
❌ MOT-01: 这里的 0.3s ease 应改为 --dur-fast + --ease-out
✅ 已修复
```

规则 ID 是**人和 agent 的共同语言**，这比"这里不太好看"有效一百倍。

### 6.3 定期做"反模式考古"

每月跑一次 A 段 grep，把命中项归类：
- 如果是 agent 反复犯的错 → 说明 `AGENT-RULES.md` 表述不够强，改措辞
- 如果是新场景没覆盖 → 补规则
- 如果是历史遗留 → 排期清理

规范不是写完就结束的文档，是**持续收敛的系统**。

---

## 7. 附：一句话总结

> 这套规范的本质，是把「Claude 为什么好看」翻译成「agent 不能怎么写」。
> 前者是审美，后者是工程。只有后者能被规模化执行。

---

*方法论提炼自 Anthropic Claude Design System 的逆向工程成果，已做品牌解耦与场景泛化。不包含任何专有资产。*
