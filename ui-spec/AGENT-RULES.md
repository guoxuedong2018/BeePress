# AGENT-RULES · UI 规范常驻注入版

> **用途** 本文件是 `UI-SPEC.md` 的常驻精简版，直接注入 coding agent 的 system prompt 或 rules 文件。
> **原则** 你（agent）在生成任何前端 UI 代码前，必须遵守以下全部规则。详细说明见 `UI-SPEC.md`，令牌值见 `tokens.json`。
> **自检** 交付前必须执行 `SELF-CHECK.md`。

---

## 0. 你的角色定位

你产出的不是"能跑的界面"，而是**符合本规范的产品级界面**。在视觉上你没有自由发挥权：
- 颜色、间距、圆角、字号、动效 → **只能**从令牌里取
- 遇到规范未覆盖的情况 → 走决策树，不要发明新值
- 任何偏离 → 必须写 `// UI-SPEC-EXEMPT: {规则ID} —— {理由}`

**核心判断**：用户会连续用 8 小时。任何"第一眼惊艳但长期疲劳"的设计都是错的。

### 0.1 技术栈契约

- **正典**：React 18 + TypeScript + Tailwind 3.4。参考实现见 `impl/react/`。
- **适配**：Vue 3 走 `ADAPTER-VUE.md`。令牌层（`tokens.css` / `tokens.json`）两端**原样复用**。
- **组件不跨框架**：不要写"框架无关的组件"。共享规范，各自实现。
- **不引入重型 UI 库**（MUI / Ant Design 等）。从令牌构建组件，不要在既有库上做主题覆盖——那必然破坏单闭合边框与表面阶梯。

**React 生成规范**：
- 组件用 `forwardRef`，props 继承原生 HTML 属性
- 类名统一走 `cn()`（clsx + tailwind-merge）
- 动效参数从 `lib/motion.ts` 导入，不内联写 stiffness/damping
- 条件渲染的状态必须显式标注

---

## 1. 十条不可违反的铁律

1. **只用令牌，不写裸值。** 禁止 `#hex`、`rgb()`、`13px`、`7px`。
2. **单闭合边框。** 视线路径上至多 1 层边框；容器内的子控件必须无边框。
3. **一个强调色。** 全站只有一个 accent，其余全是中性灰。
4. **层级靠明度，不靠边框。** 用 surface-0→3，不用描边分层。
5. **动效只用 4 套预设。** 禁止 `linear` / `ease` / `transition: all`。
6. **数字必须等宽。** 计数、计时、金额、行号一律 `tabular-nums`。
7. **组件用容器查询。** 组件内部禁止 `@media`，必须 `@container`。
8. **异步必须有状态机。** idle → loading → success/error/retry，每态都有 UI。
9. **输入法必须守卫。** `isComposing || keyCode===229` 时不提交、不拦截。
10. **边界优先于美观。** 与无障碍/容错冲突时，永远牺牲视觉。

---

## 2. 令牌速查（生成代码时直接引用）

### 2.1 表面（4 层，禁止第 5 层）
```
surface-0  外壳/侧栏      surface-1  主画布
surface-2  卡片/容器      surface-3  输入框/浮层
hover      surface-hover  active     surface-active
```

### 2.2 文本（3 级，禁止第 4 级）
```
text-primary   正文/标题     text-secondary  辅助
text-tertiary  占位/元信息    text-disabled   禁用
```

### 2.3 边框（3 档，永不纯黑）
```
border-subtle   分隔线        border-default  卡片/输入框
border-strong   强调边界       hairline        1px
```

### 2.4 强调与状态
```
accent / accent-hover / accent-active / accent-subtle
success / warning / danger / info （各带 -subtle）
⚠ 状态色必须配图标或文字，不能只靠颜色
```

### 2.5 圆角（按角色，禁止统一值）
```
2 徽章 · 4 键帽 · 6 小按钮 · 8 标准按钮/输入框
10 卡片 · 12 代码块 · 16 弹窗 · 18 气泡 · 20 输入终端 · 999 胶囊
嵌套必须满足：R_outer = R_inner + padding
```

### 2.6 间距（4px 网格）
```
规则：值必须是 4 的倍数；2px 仅用于发丝级微调
2 · 4 · 6 · 8 · 10 · 12 · 14 · 16 · 20 · 24 · 28 · 32 · 36 · 40 · 44 · 48 · 56 · 64

Tailwind 原生即 4px 网格，直接用：
p-0.5=2  p-1=4  p-1.5=6  p-2=8  p-2.5=10  p-3=12  p-3.5=14
p-4=16   p-5=20 p-6=24   p-7=28 p-8=32    p-9=36  p-10=40
p-11=44  p-12=48 p-14=56  p-16=64
```

### 2.7 字号（8 档角色，成对绑定行高）
```
caption 11/16   footnote 12/16   body 14/20    body-lg 15/22
prose 16/26     heading 15/20    title 20/28   display 32/40
```

### 2.8 阴影（双层复合，禁止单层死黑）
```
sm  卡片    md  悬停抬升    lg  弹窗    popover  浮层（双环）
深色模式：popover 改内侧 inset 0 0 0 1px rgba(255,255,255,.10)
```

### 2.9 动效（4 套预设）
```
snappy     600/30/0.6   220ms   超调 1.8%    → 点击、Tab、hover
bouncy     400/25/0.8   380ms   超调 8.8%    → 成功、徽章、开关
gentle     220/24/1.0   480ms   超调 1.5%    → 弹窗、折叠、抽屉
heavySnap  1200/80/0.1  140ms   零超调        → 拖拽吸附、碰撞
时长上限：微交互 200ms / 面板 300ms / 转场 450ms
必须响应 prefers-reduced-motion
```

---

## 3. 生成前的四个决策

### 3.1 要区分两个区域 → 用什么？
```
父子层级        → surface 明度差
同层并列有间距  → 只用间距
同层并列无间距  → 1px 单向细线
独立可交互实体  → 允许 1 层边框 + 阴影
已在带框容器内  → 禁止边框，改 hover 底色
```

### 3.2 动效 → 哪套？
```
高频微交互 → snappy ｜ 情绪反馈 → bouncy
大尺度空间 → gentle ｜ 精确落位 → heavySnap
仅透明度/颜色 → 不用弹簧，用 120ms ease-out
```

### 3.3 异步 → 展示什么？
```
<100ms      不展示 loading
100ms–1s    局部骨架 / 按钮内 spinner
1s–10s      骨架 + 阶段文案
>10s/流式   流式输出 + 进度 + 取消按钮
失败        错误三要素 + 重试 + 保留输入
```

### 3.4 响应式 → 哪种查询？
```
页面级骨架 → @media（视口）
组件内部   → @container（必须声明 container-type: inline-size）
```

---

## 4. 绝对禁止（出现即判定为缺陷）

```
✗ border border-gray-200 套在已有边框的容器内
✗ 助手消息气泡加背景色或边框
✗ transition: all / linear / ease + 任意时长
✗ padding: 13px / border-radius: 7px（刻度外取值）
✗ 深色模式 filter: invert(1)
✗ 深色模式沿用 400 字重
✗ 计数器不用 tabular-nums
✗ 组件内 @media (min-width: ...)
✗ 流式输出时每次 chunk 都强制 scrollTo 底部
✗ onKeyDown 判断 Enter 就提交（无 IME 守卫）
✗ 空状态只写"暂无数据"
✗ 删除按钮放主位
✗ outline: none 且不补焦点样式
✗ 图标按钮无 aria-label
✗ 用红色表示"重要"（非错误）
✗ 长 URL 撑破容器
✗ 组件内自定义局部颜色变量
✗ 单层死黑阴影 0 4px 8px #000
✗ 嵌套圆角不满足同心法则
✗ 三层以上边框嵌套
```

---

## 5. 必须内建的四个守卫

### 5.1 IME 合成守卫
```ts
if (e.nativeEvent.isComposing || e.keyCode === 229) return;
```

### 5.2 滚动防抢夺
```ts
// 用户手动滚动后 150ms 内，禁止程序化滚动
if (performance.now() - lastUserScrollAt <= 150) return;
// 且仅在距底部 ≤40px 时才自动跟随
```

### 5.3 焦点管理
```ts
// 模态：焦点陷阱 + Escape 关闭 + 关闭后归还触发源
// 复合控件：roving tabindex，组内仅一个 tabIndex=0
```

### 5.4 数据不丢失
```ts
// 用户输入必须本地持久化（草稿/队列），刷新与断网不得丢失
```

---

## 6. 输出格式要求

生成 UI 代码时：

1. **先声明组件契约**：用一行注释写出用了哪些令牌
```tsx
// UI: surface-2 / radius-panel / shadow-sm / space-6 / t-body
```
2. **不写行内 style 里的颜色与尺寸**，全部走 class 或 CSS 变量
3. **深色模式必须同时验证**：不能用"只写浅色"交付
4. **每个异步操作标注状态**：`// state: idle | loading | error | success`
5. **交付前自检**：逐条过 `SELF-CHECK.md`，未通过的不得提交

---

## 7. 不确定时怎么办

| 情况 | 行动 |
| :-- | :-- |
| 规范里有明确规则 | 严格执行，不解释 |
| 规范有决策树 | 走决策树，取唯一分支 |
| 规范未覆盖 | 复用最接近的既有令牌 + 在 PR 注明 |
| 与无障碍冲突 | 无障碍优先，记录豁免 |
| 与设计稿冲突 | 以规范为准，向人确认 |

**永远不要**：发明新颜色、发明新圆角、发明新时长、跳过自检。
