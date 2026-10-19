# Tool UI Spec（TUS）· 工具型产品 UI 设计规范

> **版本** 1.0.0 ｜ **状态** 稳定 ｜ **适用范围** Web / 桌面端工具型产品（IDE、编辑器、控制台、后台、AI 工作台）
> **定位** 本规范是 coding agent Harness 的 UI 约束层。agent 在每一次迭代中产出前端代码前必须读取，产出后必须自检。
> **配套文件** `tokens.json`（机器可读）· `tokens.css`（运行时）· `AGENT-RULES.md`（常驻精简版）· `SELF-CHECK.md`（交付门禁）

---

## 0. 如何阅读本规范

### 0.1 规则的三种强度

| 标记 | 含义 | agent 行为 |
| :-- | :-- | :-- |
| **MUST** | 强制。违反即为缺陷 | 不得产出违反该条的代码 |
| **SHOULD** | 推荐。偏离需说明理由 | 可偏离，但必须在 PR / commit 中注明原因 |
| **NEVER** | 禁止。无例外 | 绝对不得出现 |

### 0.2 规则 ID 命名

`域-序号`，例如 `LAY-02`。域含义：

| 域 | 全称 | 覆盖范围 |
| :-- | :-- | :-- |
| `TOK` | Tokens | 令牌、变量、取值来源 |
| `LAY` | Layout & Elevation | 层级、边框、圆角、阴影、版心 |
| `TYP` | Typography | 字阶、行高、换行、数字、对齐 |
| `COL` | Color | 语义色、状态色、对比度 |
| `MOT` | Motion | 动效预设、时长、性能 |
| `INT` | Interaction | 状态机、反馈、确认、焦点 |
| `EDGE` | Edge Cases | 输入法、滚动、网络、极窄容器 |
| `A11Y` | Accessibility | 键盘、ARIA、触控、动效偏好 |

### 0.3 冲突裁决顺序

当规则之间出现张力时，按此优先级裁决（数字越小优先级越高）：

```
A11Y  >  EDGE  >  INT  >  LAY  >  COL  >  TYP  >  MOT  >  TOK
```

即：**无障碍与边界容错永远高于视觉表现**。任何"为了好看"而牺牲可访问性或数据安全的方案，一律否决。

---

## 1. 设计立场：工具型产品的第一性原理

规范里的每一条规则，都服务于同一个目标。理解它，才能在规则未覆盖的地方做出正确判断。

> **工具型产品的设计目标，是降低「长期使用」的认知负担，而不是制造「第一眼」的惊艳。**

这条立场推导出四个必然结果，也是本规范的四个底层信念：

| 信念 | 推论 | 反例 |
| :-- | :-- | :-- |
| **长时间注视** → 视觉必须低刺激 | 低饱和、低对比层级、暖中性底色、无大面积高亮 | 霓虹渐变、纯黑纯白、高饱和品牌色铺满 |
| **高频重复操作** → 交互必须可预测 | 固定位置、固定动效、固定反馈，不搞惊喜 | 每次打开位置都变、动效随机、按钮位置漂移 |
| **信息密度高** → 层级必须靠结构而非装饰 | 用明度差与留白分层，不用边框与色块堆叠 | 卡片套卡片、每个区域都描边 |
| **键盘优先** → 焦点与快捷键是一等公民 | 全键盘可达、焦点可见、roving tabindex | 只能用鼠标点、focus 后看不见在哪 |

**判断检验**：任何设计决策，问一句"用户连续用 8 小时后，这个决定还成立吗？"——不成立的，就是消费级审美，不是工具级设计。

---

## 2. 规范架构：不变量与可变量

这是本规范能被"通用化"的关键。我们把设计系统切成两层：

### 2.1 不变量（Invariant）—— 任何品牌都必须遵守

结构性规则。换了品牌色、换了字体，这些依然成立：

- 四层表面阶梯的**分层逻辑**
- 单闭合边框原则
- 圆角的**语义分级**与同心圆角
- 动效的**物理预设分类**
- 状态机、边界守卫、无障碍基线

> agent 在任何项目中都**不得**违反不变量。

### 2.2 可变量（Brand Variable）—— 允许按品牌替换

| 可变量 | 默认值 | 替换约束 |
| :-- | :-- | :-- |
| `accent` 强调色 | `#c96442` 陶土橙 | 全站**只能有 1 个**强调色；须满足 4.5:1 对比 |
| 中性色温度 | 暖中性（偏黄） | 可换冷中性或纯中性，但四层明度差必须保持 1–3% |
| `font.family` | 系统字体栈 | 可换品牌字体，但必须保留 CJK 回退 |
| 圆角性格 | 柔和（8–20px） | 可换锐利（2–6px），但语义分级不得打乱 |
| 动效性格 | 沉稳（ζ 0.6–0.8） | 可换活泼（ζ 0.4–0.6），但过阻尼场景不得改 |

> **替换方式**：只改 `tokens.css` 的 `:root` 段，**绝不**在组件里改。组件层永远只引用语义变量。

---

## 3. 规则正文

### 3.1 TOK · 令牌

| ID | 强度 | 规则 | 验收方式 |
| :-- | :-- | :-- | :-- |
| TOK-01 | **MUST** | 组件内一切视觉值必须来自语义令牌。**颜色**严禁裸写 hex/rgb/hsl；**间距/圆角/字号**必须走网格或令牌。允许的例外仅限一次性布局约束（`max-width`、`blur`、grid 轨道） | grep 组件目录，无 `#[0-9a-f]{3,8}`、无 `rgba(`、无刻度外间距 |
| TOK-02 | **MUST** | 令牌分三层：`primitive → semantic → component`。组件层只允许引用 semantic / component，禁止直接引用 primitive | 人工审查 + lint |
| TOK-03 | **MUST** | 全站只有一个强调色。禁止出现第二个彩色作为"第二主色" | 统计所有非中性色相，应 ≤ 1 个 |
| TOK-04 | **MUST** | 深色模式是语义令牌的重新映射，不是 CSS `filter: invert` 或简单反色 | 检查 dark 段是否独立定义 |
| TOK-05 | **MUST** | 间距必须为 **4 的倍数**；2px 仅允许用于发丝级微调（如分段控件轨道内边距）。禁止 magic number | grep `padding\|margin\|gap`，值须满足 `v % 4 === 0 \|\| v === 2` |
| TOK-06 | **SHOULD** | 新增令牌须同时更新 `tokens.json` 与 `tokens.css`，保持单一事实源 | 两文件 diff 一致性 |
| TOK-07 | **NEVER** | 禁止在组件内定义局部颜色变量覆盖语义层（如 `--my-blue`） | grep 组件内 `--[a-z]+:` 定义 |

**示例 · 正确与错误**

```tsx
// ❌ 错误：裸值 + magic number
<div style={{ background: '#ffffff', padding: '13px', borderRadius: '7px' }}>

// ✅ 正确：语义令牌 + 刻度内取值
<div className="bg-surface-2 p-3 rounded-panel">
```

---

### 3.2 LAY · 层级、边框、圆角、阴影

#### 表面阶梯

| ID | 强度 | 规则 | 验收方式 |
| :-- | :-- | :-- | :-- |
| LAY-01 | **MUST** | 界面层级只能使用 4 层表面：`surface-0`（外壳）→ `surface-1`（画布）→ `surface-2`（容器）→ `surface-3`（浮起）。相邻层明度差控制在 1–3% | 目视 + 取色 |
| LAY-02 | **MUST** | 层级优先用「表面明度 + 阴影」表达，**不得**用「边框 + z-index 堆叠」表达 | 审查层叠结构 |
| LAY-03 | **SHOULD** | 深色模式下表面明度递增（越靠上越亮），浅色模式下亦递增（越靠上越白） | 取色对比 |

#### 单闭合边框原则（核心）

| ID | 强度 | 规则 | 验收方式 |
| :-- | :-- | :-- | :-- |
| LAY-04 | **MUST** | 从主画布向内穿透的任一视线路径上，**至多穿过 1 层闭合矩形边框** | 数每条路径的 border 层数 |
| LAY-05 | **MUST** | 外层容器已有边框时，其内部所有子控件必须降级为无边框：用 `Ghost`（透明 + hover 底色）或柔和填充 | 检查嵌套组件 |
| LAY-06 | **MUST** | 容器内部的结构分隔使用**单向 1px 细线**（`border-b` / `border-t` / `border-r`），禁止用闭合方框 | grep `border:` 全向 |
| LAY-07 | **NEVER** | 禁止出现「卡片套卡片套卡片」的三层以上边框嵌套 | 目视 + 结构树 |

> **判定口诀**：数一数，从屏幕边缘走到你要操作的那个按钮，中间穿过了几道灰线？**超过 1 道就是错的。**

#### 圆角

| ID | 强度 | 规则 | 验收方式 |
| :-- | :-- | :-- | :-- |
| LAY-08 | **MUST** | 圆角按组件角色取值（见 `tokens.json → radius.roleMap`），禁止全局统一一个值 | 比对 roleMap |
| LAY-09 | **MUST** | 嵌套时满足同心圆角：`R_outer = R_inner + padding` | 计算验证 |
| LAY-10 | **SHOULD** | 同一视图内圆角不超过 3 种尺寸，避免视觉噪声 | 统计 |
| LAY-11 | **NEVER** | 禁止在圆角容器内使用直角子元素（除非子元素贴边且被裁切） | 目视 |

#### 阴影与焦点

| ID | 强度 | 规则 | 验收方式 |
| :-- | :-- | :-- | :-- |
| LAY-12 | **MUST** | 阴影必须双层复合（近距微遮蔽 + 远距漫反射），禁止单层死黑 `0 4px 8px #000` | 检查 shadow 定义 |
| LAY-13 | **MUST** | 浮层（popover / dropdown / tooltip）使用双环结构；深色模式改用**内侧 inset 高光**代替外描边 | 切深色目视 |
| LAY-14 | **MUST** | 焦点环必须自定义（品牌色 + 隔离垫片 + 柔和外扩），禁止使用系统默认 outline | Tab 走查 |
| LAY-15 | **MUST** | 长文本版心宽度限制在 640–760px（约 60–75 字符） | 测量容器宽度 |

---

### 3.3 TYP · 排版

| ID | 强度 | 规则 | 验收方式 |
| :-- | :-- | :-- | :-- |
| TYP-01 | **MUST** | 字号只能取 8 档角色（caption / footnote / body / body-lg / prose / heading / title / display），禁止任意 font-size | grep `text-\[` 或 `font-size:` |
| TYP-02 | **MUST** | 字号必须与行高成对绑定，不得单独指定其中一个 | 检查角色类使用 |
| TYP-03 | **MUST** | 所有会动态变化的数字（计数、计时、金额、行号、坐标）必须 `tabular-nums` | grep 数字渲染处 |
| TYP-04 | **MUST** | 标题使用 `text-wrap: balance`，正文段落使用 `text-wrap: pretty` | grep |
| TYP-05 | **MUST** | 可能含超长串（URL、hash、模型 ID、变量名）的容器必须 `overflow-wrap:anywhere` + `min-width:0` | 注入超长串测试 |
| TYP-06 | **MUST** | 行内图标必须做光学基线校准（`vertical-align: -0.125em`），禁止默认 baseline | 目视图标与文字重心 |
| TYP-07 | **MUST** | 深色模式必须做字重逆补偿（正文 400→360，medium 500→460），不得沿用浅色字重 | 切深色对比截图 |
| TYP-08 | **MUST** | 移动端输入控件 `font-size ≥ 16px`，防止 iOS 聚焦缩放 | 真机验证 |
| TYP-09 | **SHOULD** | 中文排版禁止单字竖排：`word-break: normal` + `min-width: 0` | 极窄容器测试 |
| TYP-10 | **NEVER** | 禁止用 `letter-spacing` 拉大中文正文（仅允许标题微调 -0.01~-0.02em） | grep |

---

### 3.4 COL · 色彩

| ID | 强度 | 规则 | 验收方式 |
| :-- | :-- | :-- | :-- |
| COL-01 | **MUST** | 文本只有三级（primary / secondary / tertiary）+ disabled，禁止第四级 | grep 文本色 |
| COL-02 | **MUST** | 状态色固定四类：success / warning / danger / info，且必须搭配图标或文字冗余编码 | 灰度截图仍可辨识 |
| COL-03 | **MUST** | 正文对比度 ≥ 4.5:1；大字（≥18px 或 14px bold）≥ 3:1；UI 组件边界 ≥ 3:1 | 对比度工具检测 |
| COL-04 | **MUST** | 禁止用颜色作为唯一信息载体（色盲友好） | 灰度模式验证 |
| COL-05 | **SHOULD** | 强调色面积占比 < 10%。大面积使用会稀释其"值得注意"的语义 | 目视估算 |
| COL-06 | **MUST** | 危险色仅用于破坏性操作与错误态，禁止用于普通强调 | grep danger 用法 |
| COL-07 | **NEVER** | 禁止纯黑 `#000` 与纯白 `#fff` 作为大面积背景（代码块底色除外） | 取色 |

---

### 3.5 MOT · 动效

| ID | 强度 | 规则 | 验收方式 |
| :-- | :-- | :-- | :-- |
| MOT-01 | **MUST** | 动效必须来自 4 套预设之一（snappy / bouncy / gentle / heavySnap），禁止手写任意 stiffness/damping | grep 内联 transition 参数 |
| MOT-02 | **MUST** | 按交互类别选预设：微交互→snappy；情绪反馈→bouncy；大尺度→gentle；精确落位→heavySnap | 对照决策树 §4.2 |
| MOT-03 | **MUST** | 时长硬上限：微交互 ≤200ms，面板 ≤300ms，环境转场 ≤450ms | grep duration |
| MOT-04 | **MUST** | 必须响应 `prefers-reduced-motion: reduce`：移除位移与缩放，保留状态变化 | 系统设置验证 |
| MOT-05 | **MUST** | 禁止对 layout 属性做动画（`width/height/top/left/margin`）。只能动 `transform` / `opacity` / `grid-template-rows` | grep transition 属性 |
| MOT-06 | **MUST** | 高频场景（流式文本、长列表、拖拽跟随）必须走 CSS compositor，禁止 JS 逐帧改样式 | 检查是否用 rAF 改 top |
| MOT-07 | **MUST** | 滚动边缘羽化使用多档非线性遮罩（≥5 档），禁止单段 `linear-gradient(transparent, black)` | 检查 mask 定义 |
| MOT-08 | **SHOULD** | 同一元素的进入 / 退出使用非对称时长（退出更快，约进入的 60–70%） | 目视 |
| MOT-09 | **NEVER** | 禁止 `transition: all` | grep `transition: all` |
| MOT-10 | **NEVER** | 禁止夸张弹跳（overshoot > 15%）用于工具型产品的高频操作 | 检查 spring 参数 |

---

### 3.6 INT · 交互与状态

| ID | 强度 | 规则 | 验收方式 |
| :-- | :-- | :-- | :-- |
| INT-01 | **MUST** | 每个异步操作必须有显式状态机：`idle → loading/streaming → success / error / retry`，且每个状态都有对应 UI | 状态图审查 |
| INT-02 | **MUST** | 有副作用的操作（删除、执行命令、调用外部工具）必须二次确认或显式授权 | 走查危险操作 |
| INT-03 | **MUST** | 所有可交互元素必须具备四态：default / hover / focus-visible / disabled | 逐态截图 |
| INT-04 | **MUST** | 按压反馈为 `scale(0.97–0.99)`，时长 ≤120ms，禁止位移式按压 | grep active |
| INT-05 | **MUST** | 拖拽必须同时具备：4px 死区 + 落点指示 + `Escape` 取消 + 释放吸附 | 手测 |
| INT-06 | **MUST** | 破坏性操作必须可撤销，或二次确认；危险按钮不得作为默认焦点 | 手测 |
| INT-07 | **MUST** | 模态必须：焦点陷阱、`Escape` 关闭、关闭后焦点归还触发源 | 键盘走查 |
| INT-08 | **MUST** | 任何超过 1s 的操作必须有活动指示；超过 3s 必须有进度或阶段说明 | 模拟慢网 |
| INT-09 | **MUST** | 空状态必须包含：说明 + 下一步动作按钮，禁止只有"暂无数据" | 清空数据查看 |
| INT-10 | **SHOULD** | 乐观更新：本地先反馈，失败再回滚并提示 | 断网操作测试 |
| INT-11 | **NEVER** | 禁止无出口的加载态（必须提供取消或超时） | 走查 |
| INT-12 | **NEVER** | 禁止自动播放音频 / 自动触发有副作用的操作 | 代码审查 |

---

### 3.7 EDGE · 边界与容错

> 这一域是"产品"与"Demo"的分水岭。**所有条目均为 MUST。**

| ID | 规则 | 验收方式 |
| :-- | :-- | :-- |
| EDGE-01 | 文本输入必须守卫 IME 合成态：`e.nativeEvent.isComposing \|\| e.keyCode === 229` 时不得提交 / 不得拦截 | 中文输入法实测回车 |
| EDGE-02 | 流式输出期间禁止抢夺滚动：用户一旦手动滚动，立即暂停自动跟随，并设冷却窗口（≥150ms） | 生成中上滚 |
| EDGE-03 | 用户输入必须本地持久化（草稿 / 发送队列），刷新与断网不得丢失 | 断网后刷新 |
| EDGE-04 | 网络失败必须：指数退避 + 重试上限（≤3）+ 手动重试出口 + 剩余时间提示 | 模拟 429/503 |
| EDGE-05 | 组件必须声明容器查询（`container-type: inline-size`），内部禁止使用视口 `@media` 断点 | grep `@media` |
| EDGE-06 | 极窄容器（<320px）必须防挤压：`min-width:0`、文本可截断、操作可折叠为图标 | 拖窄侧栏 |
| EDGE-07 | 错误提示必须包含三要素：发生了什么 + 为什么 + 下一步怎么做 | 审查所有 error UI |
| EDGE-08 | 危险操作必须提供 `Escape` / 取消 的即时回滚路径 | 手测 |
| EDGE-09 | 长文本 / 大列表必须虚拟化或分页，单次渲染节点 ≤1000 | 性能面板 |
| EDGE-10 | 所有外部内容渲染（用户输入、AI 生成 HTML）必须沙箱隔离，禁止同源执行 | 安全审查 |

**EDGE-01 标准实现**

```ts
function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
  // 合成态：中文/日文/韩文候选词确认，绝不提交
  if (e.nativeEvent.isComposing || e.keyCode === 229) return;

  if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
    e.preventDefault();
    submit();
  }
}
```

**EDGE-02 标准实现**

```ts
const COOLDOWN = 150;
const BOTTOM_TOLERANCE = 40;
let lastUserScrollAt = 0;
let pinned = true;

function onUserScroll() {
  lastUserScrollAt = performance.now();
  pinned = false;               // 用户手势优先，立刻释放自动跟随
}

function onNewChunk(el: HTMLElement) {
  if (performance.now() - lastUserScrollAt <= COOLDOWN) return;  // 冷却窗口内不抢
  const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
  if (dist <= BOTTOM_TOLERANCE) pinned = true;
  if (pinned) el.scrollTo({ top: el.scrollHeight, behavior: 'auto' });
}
```

---

### 3.8 A11Y · 无障碍

| ID | 强度 | 规则 | 验收方式 |
| :-- | :-- | :-- | :-- |
| A11Y-01 | **MUST** | 全部功能可纯键盘完成，焦点顺序符合视觉顺序 | 拔掉鼠标走查 |
| A11Y-02 | **MUST** | 复合控件（菜单、标签页、列表、网格）使用 roving tabindex：组内仅一个 `tabIndex=0` | 检查 tabIndex |
| A11Y-03 | **MUST** | 图标按钮必须有 `aria-label`；装饰性图标 `aria-hidden="true"` | grep |
| A11Y-04 | **MUST** | 模态 `role="dialog"` + `aria-modal="true"` + `aria-labelledby` | 检查 DOM |
| A11Y-05 | **MUST** | 触控目标 ≥44×44px（视觉可小，用透明扩展命中区） | 测量 |
| A11Y-06 | **MUST** | 动态状态变化使用 `aria-live`（polite / assertive）播报 | 屏幕阅读器测试 |
| A11Y-07 | **MUST** | 禁止 `outline: none` 而不补焦点样式 | grep |
| A11Y-08 | **SHOULD** | 支持 RTL：方向键语义、图标方向、内联 padding 需镜像 | dir="rtl" 验证 |

---

## 4. 决策树

> agent 遇到需要"判断"的地方，必须走这里的决策树，**不允许自由发挥**。

### 4.1 我需要区分两个区域，用什么？

```
需要区分两个视觉区域
│
├─ 它们是「父子层级」（外壳 vs 内容）？
│   └─ 用 surface 明度差（LAY-01）
│
├─ 它们是「同层级并列」（卡片 A vs 卡片 B）？
│   ├─ 有间距 → 只用间距，不加任何边框
│   └─ 无间距 → 加 1px 单向细线（LAY-06）
│
├─ 它是「独立可交互的实体」（弹窗、代码块、可拖拽卡片）？
│   └─ 允许 1 层闭合边框 + 阴影（LAY-04 的唯一例外）
│
└─ 它在「已有边框的容器内部」？
    └─ 禁止加边框，改用 hover 底色 / 填充（LAY-05）
```

### 4.2 这个动效该用哪套弹簧？

```
动效场景
│
├─ 是「高频微交互」（点击、Tab、开关、hover）？
│   └─ snappy（600/30/0.6）· 220ms · 超调 1.8%
│
├─ 是「情绪反馈」（成功、点赞、徽章出现）？
│   └─ bouncy（400/25/0.8）· 380ms · 超调 8.8%
│
├─ 是「大尺度空间变化」（弹窗、折叠、抽屉、分栏）？
│   └─ gentle（220/24/1.0）· 480ms · 超调 1.5%
│
├─ 是「精确落位」（拖拽吸附、碰撞、贴边）？
│   └─ heavySnap（1200/80/0.1）· 140ms · 零超调
│
└─ 只是「透明度 / 颜色变化」？
    └─ 不用弹簧，用 --dur-fast + --ease-out
```

### 4.3 这个圆角取多少？

```
组件类型
│
├─ 徽章 / 角标 / 复选框        → 2px  (xs)
├─ 快捷键键帽                  → 4px  (sm)
├─ 极小按钮（≤24px 高）        → 6px  (md)
├─ 标准按钮 / 输入框 / 菜单项  → 8px  (lg)
├─ 卡片 / 附件磁贴             → 10px (panel)
├─ 代码块 / 大卡片             → 12px (xl)
├─ 弹窗 / 抽屉                 → 16px (2xl)
├─ 消息气泡                    → 18px (bubble)
├─ 大输入框（Composer）        → 20px (composer)
└─ 分段控件 / 头像 / 胶囊       → 999px (pill)

⚠ 嵌套时必须校验：R_outer = R_inner + padding
```

### 4.4 异步操作该展示什么状态？

```
发起异步操作
│
├─ 预计 < 100ms？
│   └─ 不展示 loading（避免闪烁），直接出结果
│
├─ 预计 100ms ~ 1s？
│   └─ 局部骨架屏 / 按钮内 spinner，禁用重复提交
│
├─ 预计 1s ~ 10s？
│   └─ 骨架屏 + 阶段文案（"正在分析…" → "正在生成…"）
│
├─ 预计 > 10s 或流式？
│   └─ 流式输出 + 进度指示 + 取消按钮 + 完成后可复制
│
└─ 失败？
    └─ 错误三要素（EDGE-07）+ 重试按钮 + 保留用户输入
```

### 4.5 用 media query 还是 container query？

```
需要响应式适配
│
├─ 调整的是「页面级骨架」（侧栏宽度、整体栅格）？
│   └─ 用 @media（视口断点）
│
└─ 调整的是「组件内部布局」（卡片内列数、按钮文字显隐）？
    └─ 必须用 @container（EDGE-05）
        └─ 该组件根元素必须声明 container-type: inline-size
```

---

## 5. 反模式清单

> agent 生成代码后，必须逐条比对。以下每一行都是真实高频错误。

| # | ❌ 反模式 | ✅ 正确做法 | 违反规则 |
| :-- | :-- | :-- | :-- |
| 1 | `border border-gray-200` 套在卡片里，卡片又套在容器里 | 外层保留边框，内层改 `bg-surface-2` 无边框 | LAY-04/05 |
| 2 | 助手消息气泡加背景色 + 边框 | 助手消息零背景零边框，直接浮于画布 | LAY-05 |
| 3 | 容器内按钮写 `border border-neutral-300` | 容器内按钮用 Ghost：透明 + hover 底色 | LAY-05 |
| 4 | `transition: all 0.3s ease` | `transition: transform 120ms var(--ease-snap)` | MOT-01/09 |
| 5 | `padding: 13px` | `padding: var(--space-5)`（12px） | TOK-05 |
| 6 | `border-radius: 7px` | 取 roleMap：`var(--radius-lg)` 8px | LAY-08 |
| 7 | 深色模式直接 `filter: invert(1)` | 独立定义 `[data-theme=dark]` 语义令牌 | TOK-04 |
| 8 | 深色模式沿用 400 字重，文字发胀 | 深色降至 360 | TYP-07 |
| 9 | 计数器 `12:03` 用比例数字，跳秒时抖动 | `tabular-nums` | TYP-03 |
| 10 | 用 `@media (min-width: 768px)` 控制卡片内列数 | `@container` | EDGE-05 |
| 11 | 流式生成时每次 chunk 都 `scrollTop = scrollHeight` | 加 150ms 冷却 + 用户手势优先 | EDGE-02 |
| 12 | `onKeyDown` 里直接判断 Enter 就提交 | 先判 `isComposing \|\| keyCode===229` | EDGE-01 |
| 13 | 空状态只写「暂无数据」 | 说明 + 主行动按钮 | INT-09 |
| 14 | 删除按钮放在主位（右侧最显眼） | 危险操作放次位，主位给"取消" | INT-06 |
| 15 | `outline: none` 后不补焦点样式 | 补 `--focus-shadow` | A11Y-07 |
| 16 | 图标按钮只有 `<Icon />` 无 aria-label | 加 `aria-label="关闭"` | A11Y-03 |
| 17 | 骨架屏用 90° 垂直直扫 | 105° 倾斜非线性扫光 | MOT-07 精神 |
| 18 | 用红色表示"重要"（非错误） | 红色仅用于 danger | COL-06 |
| 19 | 长 URL 撑破容器 | `overflow-wrap:anywhere` + `min-width:0` | TYP-05 |
| 20 | 每个新功能都新造一套颜色变量 | 复用语义令牌 | TOK-07 |

---

## 6. 核心组件配方

> agent 生成以下组件时，必须严格按配方实现，不得自行组合样式。

### 6.1 Button

```
尺寸：xs 24/8 · sm 28/10 · md 32/12 · lg 40/16（高/横向内边距）
字号：11 / 12 / 14 / 15
圆角：md / lg / lg / xl
变体：
  primary   → bg accent,     fg on-accent,  hover accent-hover
  secondary → bg surface-2,  fg text-primary, border border-default
  ghost     → bg transparent, fg text-secondary, hover surface-hover, border 0
  outline   → bg transparent, fg text-primary, border border-strong
  danger    → bg danger,     fg text-inverse
四态：default / hover / focus-visible(--focus-shadow) / disabled(opacity .45 + cursor not-allowed)
按压：active:scale-[0.98]，120ms
禁止：在带边框容器内使用 secondary / outline（改 ghost）
```

### 6.2 Card

```
圆角：panel(10px)
背景：surface-2
边框：1px border-subtle
阴影：shadow-sm
hover：translateY(-1.5px) + shadow-md + border-default，180ms ease-out
内边距：16px（紧凑 12px）
禁止：卡片内再放带边框的子卡片
```

### 6.3 Dialog

```
圆角：2xl(16px)
背景：surface-2
阴影：shadow-popover
最大宽度：448px
遮罩：--overlay + backdrop-blur 8px
内边距：24px
标题：t-heading，text-wrap:balance
焦点：进入时聚焦首个可交互元素；Tab 循环；Escape 关闭；关闭后归还焦点
危险变体：主按钮为 danger，且默认焦点在"取消"
```

### 6.4 Composer（输入终端）

```
圆角：composer(20px)
背景：surface-3
阴影：0 4px 20px rgba(28,27,25,.035), inset 0 0 0 1px border-default
最小高度：88px；最大高度：384px（超出内部滚动）
内边距：16px（--space-6，符合 TOK-05 刻度）
字号：body-lg(15px)，行高 22px
聚焦：--focus-shadow
底部工具栏：高度 32px，与输入区之间用 border-t 单向细线分隔
发送按钮：32×32，accent 底，禁用时 opacity .35
守卫：Enter 提交（需 EDGE-01 守卫），Shift+Enter 换行
```

### 6.5 Message

```
用户消息：右对齐，bg accent-subtle，radius bubble(18px)，padding 16/10
助手消息：左对齐，无背景，无边框，max-width 720px，prose 字号
消息元信息（时间/模型）：t-caption + text-tertiary + tabular-nums
操作栏：hover 才显示，ghost 按钮，不占布局高度
禁止：助手消息加气泡背景或边框
```

### 6.6 Code Block

```
圆角：xl(12px)
背景：--code-bg (#0d0d0c)
文字：--code-text
头部：高 36px，语言标签 t-caption + text-tertiary，复制按钮 ghost
字号：12px / 行高 18px，font-mono
复制反馈：对勾 + "已复制"，2.5s 后自动淡出
横向滚动：overflow-x auto，不换行（或按用户偏好）
```

### 6.7 Table

```
表头：bg surface-3，t-footnote，text-secondary，字重 600
行：border-bottom 1px border-subtle，hover bg surface-0
单元格：padding 12/16，t-body
数字列：右对齐 + tabular-nums
空状态：合并单元格 + 空状态组件
禁止：单元格内再套卡片边框
```

### 6.8 Empty State

```
图标：24px，text-tertiary，opacity .7
标题：t-title，text-primary
描述：t-body，text-secondary，max-width 360px，居中
动作：primary 按钮（1 个）+ 可选 ghost 次按钮
垂直居中于容器，上下留白 ≥48px
禁止：只有"暂无数据"而无行动指引
```

---

## 7. 变更与豁免

### 7.1 新增令牌

1. 先判断能否用现有语义令牌表达——**能复用就不得新增**
2. 确实需要时，同时更新 `tokens.json` 与 `tokens.css`
3. 命名遵循 `--{类别}-{角色}-{变体}`，如 `--surface-raised`
4. 在 PR 描述中说明：为什么现有令牌不够用

### 7.2 规则豁免

任何对 **MUST** 规则的偏离，必须在代码旁写明：

```ts
// UI-SPEC-EXEMPT: LAY-04 —— 此处的双边框是设计稿明确要求的品牌视觉，
// 已与设计负责人确认，仅限营销页 hero 区域，不进入产品主界面。
```

无豁免注释的偏离，一律视为缺陷，必须在合并前修复。

### 7.3 版本策略

| 变更类型 | 版本位 | 示例 |
| :-- | :-- | :-- |
| 新增规则 / 新增令牌 | MINOR | 1.0.0 → 1.1.0 |
| 收紧既有规则（可能导致存量代码不合规） | MAJOR | 1.1.0 → 2.0.0 |
| 措辞澄清、示例修正 | PATCH | 1.1.0 → 1.1.1 |

> **MAJOR 升级必须附带迁移指南**，并同步更新 `AGENT-RULES.md` 与 `SELF-CHECK.md`。

---

## 8. 与 Harness 的集成契约

本规范在 Harness 中的挂载方式见 `README.md`。三条硬约束：

1. **注入顺序**：`AGENT-RULES.md`（常驻）→ `UI-SPEC.md` 相关章节（按需）→ `tokens.json`（生成时）
2. **交付门禁**：任何 UI 相关提交必须通过 `SELF-CHECK.md` 全部条目
3. **单一事实源**：`tokens.json` 是唯一权威，`tokens.css` 与 Tailwind 配置必须由它派生（或人工保持一致）

---

## 9. 技术栈契约

本规范**在原则层是框架无关的，在实现层以 React 为正典**。这样既能跨项目复用，又不至于抽象成谁也不像的"通用组件"。

### 9.1 分层归属

| 层 | 内容 | 是否框架相关 |
| :-- | :-- | :-- |
| 原则层 | `UI-SPEC.md` §1–§5 全部规则、决策树、反模式 | 否 |
| 令牌层 | `tokens.json`、`tokens.css` | 否（纯 CSS 变量 / JSON） |
| 实现层 | `impl/react/*` 组件与 hooks | 是 |
| 适配层 | `ADAPTER-VUE.md` 的映射与示例 | 是 |

### 9.2 正典与适配

| 栈 | 地位 | 说明 |
| :-- | :-- | :-- |
| **React 18 + TypeScript + Tailwind 3.4** | **正典（Canonical）** | 新组件、新规则的参考实现一律以 React 版为准 |
| Vue 3 + TS + Tailwind | 适配（Adapter） | 令牌层直接复用，组件层按 `ADAPTER-VUE.md` 重写 |

### 9.3 三条纪律

1. **令牌只有一份。** 多框架项目必须把 `tokens` 抽成独立包，两端 `peerDepend` 同一份，禁止各存一份。
2. **组件不跨框架。** 不要试图做"框架无关的组件库"——那会让两边都别扭。共享规范，各自实现。
3. **改组件前先改规范。** 任何组件行为变更，先在 `UI-SPEC.md §6` 更新配方，再同步两套实现。

### 9.4 依赖约定（React 正典）

```
react / react-dom        ^18
tailwindcss              ^3.4
@tailwindcss/container-queries
clsx / tailwind-merge
framer-motion            ^11（仅在使用 SPRING_* 预设时需要）
```

> 不引入重型 UI 库（如 MUI / Ant Design）。本规范的目标是**从令牌出发构建组件**，而非在既有库上做主题覆盖——后者几乎必然破坏单闭合边框与表面阶梯规则。

---

*本规范从 Anthropic Claude Design System 的逆向工程成果中提炼方法论，已做品牌解耦与场景泛化，不包含任何专有资产。*
