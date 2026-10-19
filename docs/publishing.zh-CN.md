# 接入外部发布目的地

Builder Kit 只负责**发布流程**：判断哪些页面变了、打包图片、生成计划、等待确认、记录可续跑状态、把结果展示在内容检查台。内容实际发布到哪里，由宿主的**发布目标适配器**决定。

未配置目的地时，发布功能保持关闭；本地批注、内容检查、截图和录屏不受影响。

## 1. 先选一种接入方式

| 方式 | 适合场景 | 配置 |
| :-- | :-- | :-- |
| 内置 `docs-cli` 参考适配器 | 已有兼容的文档 CLI | `BUILDER_KIT_PUBLISH_GATEWAY=docs-cli` |
| 宿主项目内的适配器文件 | 内部 Wiki、CMS、业务 API | `BUILDER_KIT_PUBLISH_GATEWAY=./tools/publish-gateway.mjs` |
| 独立 npm 包 | 多个原型共享同一套发布能力 | `BUILDER_KIT_PUBLISH_GATEWAY=@acme/builder-kit-publish` |

适配器只运行在 Vite dev server 的 Node 进程里，不进入浏览器产物，也不进入生产构建。

## 2. 五步接入

### 第 1 步：在宿主项目里创建适配器

建议放在：

```text
my-prototype/
├── tools/
│   └── publish-gateway.mjs
├── docs/
│   └── kb/
└── package.json
```

不要把适配器放进 `docs/kb`，也不要让浏览器代码 import 它。

### 第 2 步：实现核心方法

最小可用适配器需要这 5 个方法：

| 方法 | 做什么 | 关键约束 |
| :-- | :-- | :-- |
| `createDoc` | 第一次发布，新建一页 | **不要自动重试**；超时不代表没创建 |
| `writeDoc` | 更新已发布页面 | 覆盖是用户确认过的动作 |
| `fetchOutline` | 返回标题/大纲 `[{ id, text }]` | `id` 用于页内锚点 |
| `updateJsonml` | 应用核心生成的结构化操作 | `dryRun: true` 只校验、不落盘 |
| `buildPageUrl` | 把不透明 id 转成页面 URL | 返回的 URL 会写进 `_published.json` 并用于跨页链接 |

可选方法：

- `destination`：给内容检查台显示目的地名称和说明；
- `setIntent`：告知适配器“用户已确认这次外发”；
- PRD 管线还需要 `createBlankDoc`、`appendImages`、`fetchJsonml`；不需要 PRD 时可以不实现。

完整 TypeScript 接口见 [publishing.md](./publishing.md)。

### 第 3 步：处理内容源

核心会把每一页打包成 `Source` 交给适配器：

```ts
type Source =
  | { kind: "file"; path: string }  // 无图页面：渲染后的 Markdown 临时文件
  | { kind: "zip"; path: string };  // 有图页面：Markdown + 相对图片，保留目录层级
```

适配器负责把 `file` 读成文本，或把 `zip` 上传给目标服务。**不要**在核心流程里拼 CLI 参数、加签名或处理登录。

### 第 4 步：配置并重启 dev server

环境变量必须设置在启动 Vite 的进程上：

```bash
BUILDER_KIT_PUBLISH_GATEWAY=./tools/publish-gateway.mjs npm run dev
```

配置后需要重启 dev server；修改适配器文件本身通常由 Node 重新加载，但环境变量不会自动更新。

### 第 5 步：验证

```bash
# 1. 看目的地是否被识别
curl http://localhost:5173/__builder_studio/publish-config

# 2. 只算发布计划，不写目标端（首次需要根节点和地址前缀）
npx builder-kit kb-publish --root <目标根 id> --doc-base https://your-destination.example --dry-run

# 3. 在内容检查台打开「发布」，先看计划，再确认
```

第一次真实发布后，`docs/kb/_published.json` 会记录根节点、页面 id、URL 和内容指纹；之后不再需要每次传 `--root` / `--doc-base`。

## 3. 一个 HTTP API 适配器示例

```js
// tools/publish-gateway.mjs
import { readFile } from "node:fs/promises";

export const destination = {
  id: "internal-wiki",
  label: "内部 Wiki",
  description: "通过内部 API 发布到团队 Wiki。",
};

const base = process.env.WIKI_BASE;
const token = process.env.WIKI_TOKEN;

async function request(pathname, body) {
  const res = await fetch(`${base}${pathname}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Wiki ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function createDoc({ title, source, parentViewId }) {
  // 这里只演示 file；zip 请按目标 API 要求上传压缩包或解压后上传图片。
  const content = await readFile(source.path, "utf8");
  const page = await request("/pages", { title, parentId: parentViewId, content });
  return { docId: page.id, viewId: page.id, url: page.url };
}

export async function writeDoc({ docId, source }) {
  const content = await readFile(source.path, "utf8");
  await request(`/pages/${docId}/content`, { content });
}

export async function fetchOutline(docId) {
  const page = await request(`/pages/${docId}/outline`, {});
  return page.items;
}

export async function updateJsonml({ docId, opsFile, dryRun }) {
  const ops = JSON.parse(await readFile(opsFile, "utf8"));
  return request(`/pages/${docId}/ops`, { ops, dryRun: !!dryRun });
}

export function buildPageUrl({ base, viewId, docId }) {
  return `${base.replace(/\/+$/, "")}/${viewId}/${docId}`;
}
```

## 4. 鉴权和敏感信息

- 适配器运行在 Node 服务端，Token 从环境变量或本机密钥工具读取，**不要**写进浏览器代码、Markdown 或 Git。
- 发布是外发动作：UI 会先算计划、要求同源确认；适配器不要把确认逻辑删掉。
- 错误信息里不要回显完整 Token；只保留状态码和安全的摘要。
- 目标地址由宿主控制；如果允许用户在 UI 里填任意 URL，需要额外做 SSRF/域名白名单校验。

## 5. 状态与重试

`docs/kb/_published.json` 是核心状态文件：

- `docId` / `viewId` 是不透明 id，适配器可以返回任意字符串，只要后续方法能接受；
- `baseUrl` 是目的地地址前缀；
- `anchors` 是页内标题到目标 id 的映射；
- 每页保存内容指纹，避免重复发布。

`createDoc` 不是幂等操作。超时后不要盲目重试创建；核心会在每页成功后立刻写状态，下一次运行会走 `writeDoc` 更新同一页。

## 6. 故障排查

| 现象 | 检查 |
| :-- | :-- |
| UI 显示「发布（未配置）」 | 是否设置了 `BUILDER_KIT_PUBLISH_GATEWAY`，是否重启了 dev server |
| `加载发布目标失败` | 相对路径是否相对宿主项目根；包名是否安装在宿主 `node_modules` |
| `缺少 createDoc、writeDoc…` | 对照接口补齐核心方法 |
| `发布计划没算出来` | 先看适配器抛出的错误，再用 `kb-publish --dry-run` 复现 |
| `发布确认已过期` | 重新打开发布面板，重新算一次计划 |
| 首次提示没有根节点/地址前缀 | 第一次带 `--root` 和 `--doc-base`，之后从 `_published.json` 读取 |
| 重复创建页面 | 检查 `createDoc` 是否在超时后被自动重试；核心不会替你重试创建 |
| 跨页链接打不开 | 检查 `buildPageUrl` 返回的路径和 `anchors` 的 id 是否与目标端一致 |

## 7. 参考适配器

只使用内置 `docs-cli` 参考实现时：

```bash
BUILDER_KIT_PUBLISH_GATEWAY=docs-cli \
BUILDER_KIT_DOCS_CLI="docs-cli" \
npm run dev
```

旧的 `BUILDER_KIT_DOCS_CLI=...` 单独设置也会自动选用内置适配器；新的接入建议显式设置 `BUILDER_KIT_PUBLISH_GATEWAY`。
