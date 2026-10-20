# Bee Press

**蜂群协作，一个事实源。**

Bee Press 是原型原生的内容生产与发布层。把运行中的原型变成可评审、可校验、可持续更新的内容资源——操作手册、上线通知、消息卡片、宣传图文、截图/GIF/视频——并投递到任意内容载体。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node.js >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)

[English](./README.md) · [品牌说明](./docs/brand.md)

> **命名：** Bee Press 是产品名。npm 包和导入路径是 `beepress`；`builder-kit` 包与 CLI 作为兼容别名保留，`BUILDER_KIT_*` 环境变量也继续接受。

两个平级工具，都挂在运行中的原型上：

| 工具 | 做什么 | 落到哪 |
|---|---|---|
| `client/review` | 收集对原型的**意见** —— 圈选批注、定位源码 | `docs/reviews/<区域>.json` |
| `client/studio` | 把原型变成可发布的**内容资源** —— 操作手册、上线通知、消息卡片、宣传图文 | `docs/kb/*.md` + `images/` + `media/` + 发布状态 |

界面是 **React**，挂在 `<body>` 下独立的根上；原型保持自己的框架，不用装 React。**React 是主适配层**（`beepress/react`）；**Vue 2**（`beepress/vue2`）是可选的兼容适配层。换框架只需按 `client/core/host.js` 写一层很薄的适配。

套件**只在 dev 生效**：入口组件的 `import.meta.env.DEV` 动态 import 在生产构建期被消除，产物里不留任何套件代码。

## 内容生产定位

Bee Press 的核心不是“让模型写一篇文章”，而是把可验证的原型环境交给 Agent：

- Agent 能读源码、路由、组件、FRS 和页面 DOM，知道真实界面和真实文案，不靠猜。
- Agent 能调用 Chrome/CDP 截图、录屏，调用 ffmpeg 生成 GIF/视频、裁剪和合成，媒体是可复现的构建产物。
- 正文里的事实引用 `frs:` / `code:` 会在上游变化时进入待确认队列；内容不会发出去就失控。
- 同一份内容资源可以生成长文、上线通知、消息卡片、宣传图文，通过统一发布层投递到飞书文档、腾讯文档、内部内容平台或 IM。
- Markdown、媒体配方、事实和评审锁都留在仓库里，可 diff、可回滚、可继续由 Agent 编辑。

Bee Press 不内嵌后台写作 Agent：它把源码、页面、媒体配方、事实校验和发布状态组织成 Agent 可用的上下文，管线负责执行和核对。

一句话：**Bee Press 是原型原生的内容生产与发布层，而不是通用文档编辑器或截图工具。**

### 为什么叫 Bee Press

Bee Press 不是“人类和 AI 一起写文档”的聊天框，而是一个 Agent 蜂巢在共享工件上协作：

- **工蜂角色** —— 读源码、看页面、截图录屏、写作、审阅、发布，都可以是不同的 Agent。
- **共识主动性（stigmergy）** —— Agent 不靠聊天协调，而是通过仓库里的痕迹协作：事实引用、评审锁、媒体台账、发布状态。
- **蜂蜜** —— 最终的内容 Bundle。
- **授粉** —— 发布适配器把同一份 Bundle 送到文档、IM、素材库或内部平台。
- **Press** —— 审阅和发布始终显式发生，不会自动发出去。

蜜蜂不是“AI 魔法”的吉祥物，而是一种工作模型：许多小工蜂，一个事实源。

### 产出形态

| 产出 | Bee Press 提供什么 | 典型载体 |
| :-- | :-- | :-- |
| 操作手册 / 功能说明 | 正文 + 真实截图 + 可核对步骤 | 飞书文档、腾讯文档、Wiki、站点 |
| 上线通知 / 版本更新 | 发布事实 + 封面 + 跳转链接 | 文档、IM、邮件、内部信息流 |
| 消息卡片 | 标题、字段、动作和可追溯文案 | 飞书/企微机器人、内部 IM |
| 宣传 / 视觉物料 | 截图、GIF、录屏、封面图 | 素材库、CDN、内容平台 |
| PRD / 评审报告 | FRS 事实、评审意见和生成结构 | 文档、评审归档 |
| 内容 Bundle | 正文 + 资产 + 事实 + 元数据 + 评审状态 | 任意目的地适配器 |

## 为什么单独一层

原型是产品资产，随业务演进、要整份交付研发；套件是跨原型复用的能力，生命周期完全不同。把套件寄居在原型源码里，后果是「删掉工具层还得动产品代码」。Bee Press 把两者的边界收敛成宿主工程里的两行配置。

## 做工具时的几条判断

- **一个事实只有一份真源，派生的不存。** 构成视图全由正文算出来，改结构就是改 md。
- **机制不暴露成功能。** 用户要学的只有问题本身的名词（原型页面、截图录屏、内容资源），节点类型、任务状态是实现。
- **失败要响。** 产物生成了、流程绿灯、内容却是错的，是最坏的失败；判据要显式。
- **按内容判断变没变，不按时间。** 源码哈希、画面比对决定要不要重拍、重发。
- **Agent 可以读源码、看页面、调用媒体工具；落盘与核对由管线负责，人的判断不替人做。**

## 安装

```bash
npm install --save-dev beepress
# CLI 别名：beepress、builder-kit、bk
# 宿主还没有这些 peer 时
npm install --save-dev vite less
# 仅当宿主使用可选 Vue 2 适配层时
npm install --save-dev vue@2.7
```

已有项目迁移期可以安装 `builder-kit` 兼容包，继续使用旧导入；它只是
`beepress` 的薄转发。新代码应使用 `beepress/*` 和 `BEEPRESS_*`。

要求：Node.js >= 18、Vite >= 5、Vue 2.7（可选，仅使用 Vue 2 适配层与 Vue 源码坐标注入时）、React 18/19（使用 React 适配层时，套件自身已依赖 React）、Tailwind >= 4（使用 `beepress/ui` 的规范组件时）、Less >= 3（使用自带样式时）。

## 目录约定

```text
my-prototype/
├── docs/
│   ├── templates/                   # FRS / FLOW / STATE / ACCEPTANCE 模板
│   ├── WORKFLOW.md                  # 需求 → FRS → 原型 → 内容 → 发布
│   ├── features/<KEY>/FRS.json      # 需求件套（可选）
│   ├── kb/
│   │   ├── outline.config.mjs       # 内容大纲
│   │   ├── shots.config.mjs         # 截图配方
│   │   ├── clips.config.mjs         # 录屏配方
│   │   └── *.md                     # 正文，唯一真源
│   ├── prd/                         # 生成的 PRD
│   └── reviews/                     # 批注（生成）
├── web/                             # 原型工程（可用 BEEPRESS_WEB_DIR 改）
│   └── src/
├── .agent/skills/                   # 需求 / PRD / 内容 / 评审技能
└── package.json
```

项目根从当前工作目录向上找：最近的包含 `docs/`、`beepress.config.*`，或 `package.json` 依赖 `beepress` 的目录。也可以用 `BEEPRESS_ROOT` 显式指定；`BUILDER_KIT_ROOT` 仍兼容。

## 接入

### 0. 初始化新工程

```bash
cd my-prototype
npx beepress init
# 先看会复制什么：npx beepress init --list
# 覆盖已生成的文件：npx beepress init --force
```

会把 `docs/templates/`、`docs/WORKFLOW.md`、`docs/kb/CONTRIBUTING.md`、
知识库配置骨架、`src/config/frs-map.js`、`AGENTS.md` / `CLAUDE.md` 和核心
`.agent/skills/` 复制到宿主项目。已存在的文件默认保留，只有 `--force` 才覆盖。
然后运行：

```bash
npx beepress kb-scaffold
```

### 1. 宿主 `vite.config.js`

```js
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue2";
import { beePress } from "beepress/vite";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [
    beePress({
      root,
      frsRegistry: "src/config/frs-map.js",   // 需求区域注册表（业务数据）
      barExtras: ["src/components/common/ThemeToggle.vue"], // 注入工具栏的宿主控件
      barLinks: [{ label: "设计规范", route: { name: "design-system" } }],
      agentPrompt: "",                        // “复制给 Agent”的指令前缀
    }),
    vue(),   // beePress 内的 anchor-loc 必须先拿到原始 SFC
  ],
});
```

### 2. 挂载 UI（Vue 2 / React）

```js
// App.vue
export default {
  data: () => ({ kitRoot: null }),
  mounted() {
    if (import.meta.env.DEV) {
      import("beepress/vue2").then((m) => { this.kitRoot = m.BeePressRoot; });
    }
  },
};
```

```vue
<template>
  <component :is="kitRoot" v-if="kitRoot">
    <router-view />
  </component>
  <router-view v-else />
</template>
```

React 原型用 `beepress/react`：

```jsx
// main.jsx
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { hashRouter } from "beepress/react";

const root = createRoot(document.getElementById("root"));

if (import.meta.env.DEV) {
  import("beepress/react").then(({ BeePressRoot }) => {
    root.render(
      <BeePressRoot router={hashRouter()}>
        <App />
      </BeePressRoot>,
    );
  });
} else {
  root.render(<App />);
}
```

这两处就是全部集成缝。删掉它们即可剥离整个工具层，生产产物里不留任何痕迹。

### 3. 设计 Token

自带样式使用 `@color-primary`、`@color-border`、`@space-8` 这类语义变量。宿主已有 token 注入时不用管；没有时引入中性默认值：

```js
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const kitRoot = path.dirname(require.resolve("beepress/package.json"));
const themeDefaults = path.join(kitRoot, "client/core/theme-defaults.less");

export default defineConfig({
  css: {
    preprocessorOptions: {
      less: { additionalData: `@import "${themeDefaults}";` },
    },
  },
});
```

默认值是带 fallback 的 CSS 变量，运行时可以改：

```css
:root { --bk-color-primary: #1677ff; }
```

详见 [docs/styling.md](./docs/styling.md)。

### 4. 使用 UI 规范组件（可选）

仓库内置 **Tool UI Spec**（[`ui-spec/`](./ui-spec)）：令牌、Tailwind 配置与 React 参考组件。

```jsx
import { Badge, Button, Card, Dialog, EmptyState, SegmentedControl, Table } from "beepress/ui";
import "beepress/tokens.css";
```

令牌管线、Less 桥接与门禁见 [docs/ui-spec.md](./docs/ui-spec.md)。

## 演示原型

[`examples/react-tailwind`](./examples/react-tailwind) 是一个 React + Tailwind 的合成产品原型，完整跑通套件。

| 浅色 | 深色 |
|---|---|
| ![Helix 演示，浅色](./docs/assets/demo-overview-light.png) | ![Helix 演示，深色](./docs/assets/demo-overview-dark.png) |

![内容工作台](./docs/assets/demo-content-studio.png)


```bash
npm run demo        # 开发服务，默认 http://localhost:5173/#/overview
npm run build:demo  # 生产构建
```

包含源码坐标批注、内容检查队列、截图前后对比、Agent 上下文与指令、IME 守卫的命令面板、带重试的异步弹窗、深色模式、发布面板，以及完整的 UI 规范页：基础令牌、组件实时状态、组合模式、无障碍说明和可搜索的 Token 表。所有视觉值都来自与套件相同的令牌。

## Agent Host 集成：DeepSeek Harness + MCP

[`integrations/`](./integrations) 把 Bee Press 接到 Agent runtime 上：

- [`integrations/host`](./integrations/host) — `@beepress/dsh-bundle`，包含 DeepSeek Harness 插件、右侧栏 Bee Press 面板、评论写工具，以及 `beepress-mcp` stdio 入口，可接 Cursor、Claude、Codex 或其他 MCP 客户端。
- [`integrations/desktop`](./integrations/desktop) — 品牌化薄 Electron 壳，启动上游 dsh profile 并加载 Web UI，不 fork 内核。首屏是 Bee Press 启动器：导入已有项目、新建脚手架项目，或打开最近工作区。工作台采用可拖拽的工作区与 DSH 风格右侧栏标签系统（运行输出、浏览器、文件、终端），每个生产阶段有独立运行历史，并提供原生应用菜单与 `⌘K` 命令面板。标签类型可通过 `window.beepressTabs.register(...)` 注册，并可提供 `render(panel)` 自定义正文。
- 所有入口共用同一个无依赖的工作区读取器，项目文件仍是契约。

```bash
npm run test:integrations
```

dsh 插件可以检查工作区、列出内容与评论、新增并解决评论、读取/确认内容锁、查看发布计划，并用可复现的配方重建截图或录屏。同一组能力通过 `ctx.beepress` 服务暴露；MCP 仍只读。

![DeepSeek Harness 中的 Bee Press 面板](./docs/assets/dsh-bee-press-panel.png)

详见 [integrations/README.md](./integrations/README.md)。

## 发布前检查

发布是对外动作，先扫产物：

```bash
npm run build
node scripts/preflight-dist.mjs --dir dist
node scripts/preflight-dist.mjs --dir dist --deny "corp\\.example\\.com"
```

会拦截开发接口、源码坐标、批注数据路径、本机绝对路径、localhost、source map、私钥与常见凭据。Harness 部署 skill 在新环境下的检测机制与引导建议见 [docs/deploy-skill-review.md](./docs/deploy-skill-review.md)；该评审附隔离式端到端测试（假 CLI、假 registry、假 fetch、临时 HOME）：

```bash
DEPLOY_SKILL=/path/to/deploy.mjs npm run test:deploy-skill
```

## 配置

```js
beePress({
  root,                 // 宿主应用根，默认 process.cwd()
  frsRegistry,          // 导出 FRS_REGISTRY 的模块，相对 root
  barExtras: [],        // 注入评审工具栏的宿主组件
  barLinks: [],         // [{ label, route, title? }]
  reviewsDir,           // 批注目录，默认 <项目根>/docs/reviews
  anchorLoc: true,      // 非 Vue 原型设为 false
  agentPrompt: "",      // “复制给 Agent”的指令前缀
})
```

环境变量：

| 变量 | 含义 | 默认 |
|---|---|---|
| `BEEPRESS_ROOT` | 宿主项目根（`BUILDER_KIT_ROOT` 兼容） | 自动探测 |
| `BEEPRESS_DOCS_DIR` | 文档目录，相对项目根（`BUILDER_KIT_DOCS_DIR` 兼容） | `docs` |
| `BEEPRESS_WEB_DIR` | 原型工程目录，相对项目根（`BUILDER_KIT_WEB_DIR` 兼容） | 有 `web/` 用 `web`，否则项目根 |
| `BEEPRESS_ADAPTER` | 管线适配器名（`BUILDER_KIT_ADAPTER` 兼容） | `vue2-vite` |
| `BEEPRESS_PUBLISH_GATEWAY` | 发布目标适配器：路径、`file:` URL 或包名（`BUILDER_KIT_PUBLISH_GATEWAY` 兼容） | 未配置 |
| `BEEPRESS_DOCS_CLI` | 内置 `docs-cli` 适配器的命令前缀（`BUILDER_KIT_DOCS_CLI` 兼容） | `docs-cli` |

## 内容工作台

**这条链路是一个内容构建系统。** 叙述由 Agent 或人写成源文件，截图录屏是按配方可复现的构建产物，事实是被校验的断言；「上游变了之后，这几句还成立吗」是唯一需要人判断的事。

| 概念 | 在哪 | 谁维护 |
|---|---|---|
| 叙述 | `docs/kb/*.md`，唯一真源 | Agent 或人，在编辑器里写 |
| 截图 / 录屏 | `docs/kb/shots.config.mjs` / `clips.config.mjs` 的配方 → `images/` `media/` | 管线重拍，台账 `_media.json` 记源码快照与产物哈希 |
| 事实 | 正文里 `<!--f 依据-->原文<!--/f-->`，依据是 `frs:` / `code:` / `note:` | 写的人标；`frs:` 对照需求规格原文，`code:` 对照原型源码，`note:` 验不了 |
| 锁 | `docs/kb/_lock.json`：每页检查过时每条引用的值 | 人点「确认这处」或 `kb ack` |
| 蓝图 | 正文里 `<!--intent …-->` 与 `<!--slot 类型 @路由 说明-->`，front-matter 的 `topic` / `type` / `pages` | Agent 提议、人在构成视图里调；发布时剥掉 |

**早截断。** 页面源码变了 → 物料该重拍（按依赖闭包的内容哈希判，不看修改时间）；重拍之后画面没变 → 到此为止，不打扰任何文档。「画面没变」按 16×16 格比灰度，差异格不超过 8 个算没变；高倍截图里一条边线挪 1 个 CSS 像素会碰几百个格子，这类差异再逐像素核一遍。

**内容工作台只做三件事：摆出来、记下确认、交给发布目的地。** 入口在评审工具栏的「内容」，整屏打开：

- 顶栏的「内容」下拉是生产出来的全部篇目，带「几处待确认 / 迭代中 / 几处待补充 / 不发布」标记。
- 文档页把「待确认 N 处」排在上面：截图并排「上次确认时」与「现在」，图下逐条写出变了什么。
- 构成视图是同一份 md 的另一种看法：来源 → 素材与事实 → 章节，画布可缩放、可筛选、可折叠。
- 发布是把选中的长文/物料交给宿主配置的载体；目的地适配器负责飞书、腾讯文档、内部平台、IM 等差异。

当前长文内容已经端到端跑通；消息卡片、素材库等载体复用同一发布层，由适配器暴露资源级方法，不把卡片硬塞成 Markdown。

**要 Agent 写的活交给 IDE 里的 Agent。** 内容工作台不起后台写作 Agent：按钮都是「复制给 Agent」，复制一条指令，粘到 IDE 里的 Agent 对话。`agentPrompt` 可配置指令前缀。

## 命令行

安装后提供统一入口，三个别名等价：`beepress`、`builder-kit`、`bk`。

```bash
npx beepress kb status            # 哪些内容待确认、哪些图该重拍
npx beepress kb context <页|路由>  # 给 Agent：引用、可用媒体配方、可引的规格原文
npx beepress kb shoot --stale     # 只重拍源码真变了的
npx beepress kb ack <页> [<id>…]  # 我看过了
npx beepress kb where <配方|路由|依据> # 谁在引用它
npx beepress kb check             # 引用断了才失败，要审只提醒
npx beepress kb new <页> <类型> "<话题>" --pages=/a,/b
npx beepress review open          # 未解决的批注，带源码坐标
npx beepress review resolve <id…> --note "…"
npx beepress export-review-notes --status open
npx beepress prd <KEY> --scope delta
```

完整列表见 `npx beepress --help`。`pipeline/` 下的脚本也可以直接用 `node` 运行。

`check-ui` / `check-routes` / `check-frs` 是**宿主符合性检查的参考实现**，写死了一套设计体系约定（iView 组件、token 文件、导航登记）。换产品时照抄约定或改这三份脚本；其余能力与框架无关。

## 发布

发布是可选的。Bee Press 只提供核心流程——内容 bundle、计划确认、可续跑状态和内容工作台 UI；**投递到哪个载体**由宿主自己的适配器决定：

```bash
BEEPRESS_PUBLISH_GATEWAY=./tools/publish-gateway.mjs npx beepress kb-publish --dry-run
```

适配器可以接飞书文档、腾讯文档、内部 Wiki/CMS、IM 机器人等内容平台。发布物不只长文：操作手册、上线通知、消息卡片、截图/录屏/GIF/视频都可以走同一个接入层。接口契约和最小示例见
[`docs/publishing.zh-CN.md`](./docs/publishing.zh-CN.md)（接口契约见 [publishing.md](./docs/publishing.md)）。未配置时发布功能关闭；要使用内置的
[`docs-cli` 参考适配器](./pipeline/destinations/docs-cli.mjs)，设置 `BEEPRESS_PUBLISH_GATEWAY=docs-cli`（它仍通过
`BEEPRESS_DOCS_CLI` 接收外部 CLI 命令前缀；`BUILDER_KIT_*` 仍兼容）。完全不接发布目标时，本地批注、内容清单、截图录屏都照常可用。

## 边界规矩

套件**不得 import 任何产品模块**。需要业务侧的东西一律走 `virtual:beepress/host` 虚拟模块，由宿主在 Vite 配置里接线。反过来产品代码也只在入口组件一处引用套件。

知识库侧同理：产品内容全在 `docs/kb/` 的几份配置里，套件不含一个产品词。

## 开发

```bash
npm install
npm run check
npm run test:publish-gateway
```

`npm run check` 会做语法检查、路径解析导入、CLI help、UI 规范门禁，并校验 package.json 与 package-lock.json 中的所有依赖都来自 `https://registry.npmjs.org`。仓库已在 `.npmrc` 固定公共 registry，避免本机全局或代理源悄悄改变安装来源。

## 更多文档

- [工程脚手架与模板](./scaffold/README.md)
- [架构与三层锚点](./docs/architecture.md)
- [宿主与管线适配器](./docs/adapters.md)
- [内容模型](./docs/content-model.md)
- [样式与 Token](./docs/styling.md)
- [UI 规范集成](./docs/ui-spec.md)
- [发布目的地接入](./docs/publishing.zh-CN.md)
- [部署 skill 评审](./docs/deploy-skill-review.md)

## 许可

[MIT](./LICENSE)
