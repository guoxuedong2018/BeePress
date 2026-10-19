# SELF-CHECK · UI 交付门禁

> **使用方式** agent 在每次产出/修改前端代码后、提交前，必须逐条执行本清单。
> **判定** 所有 **BLOCKER** 项必须通过；**MAJOR** 项通过率 ≥ 90%；否则不得提交。
> **自动化** A 段命令可直接在 CI / Harness 中执行。

---

## A. 自动化检查（可直接跑）

> 将 `$SRC` 设为目标源码目录，例如 `SRC=./src`。

### A1. 裸色值（BLOCKER）

```bash
# 组件内不应出现 hex / rgb / hsl 硬编码
grep -rnE '#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(' $SRC \
  --include='*.tsx' --include='*.jsx' --include='*.vue' --include='*.svelte' \
  | grep -v 'tokens.css' | grep -v '\.test\.'
```

**期望**：无输出（`tokens.css` 与配置文件除外）。

### A2. 禁用动效（BLOCKER）

```bash
grep -rnE 'transition:\s*all|animation-timing-function:\s*(linear|ease)\b|transition:[^;]*\b(linear|ease)\b' $SRC \
  --include='*.tsx' --include='*.jsx' --include='*.css' --include='*.vue'
```

**期望**：无输出。

### A3. 组件内视口断点（BLOCKER）

```bash
grep -rn '@media' $SRC --include='*.tsx' --include='*.jsx' --include='*.vue' --include='*.css' \
  | grep -vE 'prefers-reduced-motion|prefers-color-scheme|print'
```

**期望**：无输出（页面级 shell 布局文件可豁免，需注明）。

### A4. 间距非 4px 网格（MAJOR）

```bash
# 提取所有 padding/margin/gap 的 px 值，检查是否为 4 的倍数（2px 例外）
grep -rhoE '(padding|margin|gap)[a-z-]*:\s*[0-9]+px' $SRC --include='*.css' --include='*.tsx' \
  | grep -oE '[0-9]+px' | sort -u \
  | awk -F'px' '{ n=$1; if (n%4!=0 && n!=2) print "⚠ 非 4px 网格: " n "px" }'
```

**期望**：无输出。

### A5. 禁用圆角（MAJOR）

```bash
grep -rnoE 'border-radius:\s*[0-9]+px' $SRC --include='*.css' --include='*.tsx' \
  | grep -vE ':\s*(0|2|4|6|8|10|12|16|18|20)px'
```

**期望**：无输出。

### A6. outline:none 无补偿（BLOCKER）

```bash
grep -rn 'outline:\s*none\|outline-none' $SRC \
  | grep -v 'focus-visible'
```

**期望**：无输出，或每处均在相邻行有 `focus-visible` / `--focus-shadow`。

### A7. 图标按钮缺 aria-label（BLOCKER）

```bash
# 粗略扫描：含 svg 的 button 无 aria-label / title
grep -rn '<button' $SRC --include='*.tsx' --include='*.jsx' -A3 \
  | grep -B1 '<svg' | grep -v 'aria-label'
```

**期望**：无输出。

### A8. 过渡属性白名单（MAJOR）

```bash
grep -rnE 'transition[^:]*:\s*[a-z]' $SRC --include='*.css' \
  | grep -vE 'transform|opacity|color|background|box-shadow|filter|grid-template-rows|border-color|all'
```

**期望**：无输出。若出现 `width|height|top|left|margin`，属 BLOCKER（MOT-05）。

### A9. 类型与构建（BLOCKER）

```bash
npm run typecheck && npm run build
```

**期望**：退出码 0，零错误。

---

## B. 视觉检查（截图对比）

| # | 检查项 | 方法 | 等级 |
| :-- | :-- | :-- | :-- |
| B1 | 浅色模式整体 | 全页截图，检查层级是否靠明度而非边框 | BLOCKER |
| B2 | 深色模式整体 | 切换 `[data-theme=dark]`，检查：①无纯黑大块 ②文字不发胀 ③浮层有内侧高光 | BLOCKER |
| B3 | 边框层数 | 从画布到最内层按钮，数闭合边框 ≤1 | BLOCKER |
| B4 | 圆角一致性 | 同视图内圆角种类 ≤3 | MAJOR |
| B5 | 同心圆角 | 嵌套元素满足 R_outer = R_inner + padding | MAJOR |
| B6 | 对比度 | 正文 ≥4.5:1，UI 边界 ≥3:1 | BLOCKER |
| B7 | 灰度可读 | 去色后状态仍可区分（色盲友好） | MAJOR |
| B8 | 空状态 | 每个列表/面板都有说明 + 行动按钮 | MAJOR |
| B9 | 错误态 | 每个 error UI 含"发生了什么+为什么+怎么做" | MAJOR |
| B10 | 加载态 | 每个异步都有指示，无无限转圈 | BLOCKER |

---

## C. 交互检查（手动 / E2E）

| # | 检查项 | 方法 | 等级 |
| :-- | :-- | :-- | :-- |
| C1 | 中文输入法 | 拼音输入时按 Enter 确认候选词，**不得**触发提交 | BLOCKER |
| C2 | 流式滚动 | 生成中向上滚动，**不得**被拉回底部 | BLOCKER |
| C3 | 键盘全通 | 拔掉鼠标，Tab/Shift+Tab/Enter/Space/Esc/方向键完成所有操作 | BLOCKER |
| C4 | 焦点可见 | 每次 Tab 都能看到清晰焦点环 | BLOCKER |
| C5 | 焦点归还 | 关闭弹窗后焦点回到触发按钮 | MAJOR |
| C6 | 焦点陷阱 | 弹窗内 Tab 循环不逃逸 | BLOCKER |
| C7 | 拖拽取消 | 拖拽中按 Esc 立即回滚 | MAJOR |
| C8 | 断网恢复 | 断网提交，输入不丢失；恢复后可重发 | BLOCKER |
| C9 | 限流退避 | 模拟 429，有退避 + 倒计时 + 手动重试 | MAJOR |
| C10 | 极窄容器 | 侧栏拖到 280px，无单字竖排、无横向滚动 | MAJOR |
| C11 | 减弱动效 | 系统开启 reduce motion，无位移动画 | MAJOR |
| C12 | 触控目标 | 移动端按钮命中区 ≥44×44 | MAJOR |
| C13 | 危险操作 | 删除/执行类操作有确认，默认焦点不在危险按钮 | BLOCKER |
| C14 | 双击/重复提交 | 快速连点发送，不产生重复请求 | MAJOR |

---

## D. 代码结构检查

| # | 检查项 | 等级 |
| :-- | :-- | :-- |
| D1 | 组件内无局部颜色变量定义（`--my-color:`） | BLOCKER |
| D2 | 组件内无 magic number（`13px` / `7px` / `0.3s`） | MAJOR |
| D3 | 每个异步操作有显式状态标注 | MAJOR |
| D4 | 新增令牌已同步 `tokens.json` 与 `tokens.css` | BLOCKER |
| D5 | 偏离 MUST 规则处有 `UI-SPEC-EXEMPT` 注释 | BLOCKER |
| D6 | 无 `transition: all` / `outline: none` 裸用 | BLOCKER |
| D7 | 列表渲染 >200 项时已虚拟化 | MAJOR |
| D8 | 外部 HTML 渲染在 sandbox iframe 中 | BLOCKER |

---

## E. 机器可读门禁（供 Harness 直接消费）

```json
{
  "specVersion": "1.0.0",
  "blockers": [
    { "id": "A1",  "type": "grep", "desc": "无裸色值" },
    { "id": "A2",  "type": "grep", "desc": "无禁用动效" },
    { "id": "A3",  "type": "grep", "desc": "组件内无视口断点" },
    { "id": "A6",  "type": "grep", "desc": "outline:none 已补偿" },
    { "id": "A7",  "type": "grep", "desc": "图标按钮有 aria-label" },
    { "id": "A9",  "type": "cmd",  "desc": "typecheck + build 通过" },
    { "id": "B1",  "type": "visual", "desc": "浅色层级正确" },
    { "id": "B2",  "type": "visual", "desc": "深色模式正确" },
    { "id": "B3",  "type": "visual", "desc": "单闭合边框" },
    { "id": "B6",  "type": "visual", "desc": "对比度达标" },
    { "id": "B10", "type": "visual", "desc": "加载态完整" },
    { "id": "C1",  "type": "e2e",  "desc": "IME 守卫" },
    { "id": "C2",  "type": "e2e",  "desc": "滚动不抢夺" },
    { "id": "C3",  "type": "e2e",  "desc": "键盘全通" },
    { "id": "C4",  "type": "e2e",  "desc": "焦点可见" },
    { "id": "C6",  "type": "e2e",  "desc": "焦点陷阱" },
    { "id": "C8",  "type": "e2e",  "desc": "断网不丢输入" },
    { "id": "C13", "type": "e2e",  "desc": "危险操作确认" },
    { "id": "D1",  "type": "grep", "desc": "无局部颜色变量" },
    { "id": "D4",  "type": "check","desc": "令牌双端同步" },
    { "id": "D5",  "type": "grep", "desc": "豁免已标注" },
    { "id": "D6",  "type": "grep", "desc": "无 all/outline:none" },
    { "id": "D8",  "type": "check","desc": "外部内容沙箱" }
  ],
  "majors": [
    "A4", "A5", "A8",
    "B4", "B5", "B7", "B8", "B9",
    "C5", "C7", "C9", "C10", "C11", "C12", "C14",
    "D2", "D3", "D7"
  ],
  "passCriteria": {
    "blockers": "全部通过",
    "majors": "通过率 ≥ 90%",
    "onFail": "阻止提交，输出失败项清单与修复建议"
  }
}
```

---

## F. 提交前最后一问

在按下提交前，问自己三个问题：

1. **删掉这个装饰，界面会更清楚吗？** 如果会 → 删掉。
2. **用户连续用 8 小时，这个决定还成立吗？** 如果不成立 → 改。
3. **这个异常路径，用户遇到时会骂人吗？** 如果会 → 补守卫。

---

*未通过门禁的代码不得提交。这是规范能否落地的唯一保障。*
