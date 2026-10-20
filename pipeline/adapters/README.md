# 技术栈适配器

引擎（`pipeline/lib/`、各 `kb-*.mjs`）本身不认识任何前端框架。它只依赖三件事，由适配器提供：

| 能力 | 为什么引擎自己做不了 |
|---|---|
| **状态注入** `__protoSetState(patch)` | 「把页面摆成错误态 / 表单填好的样子」要动组件内部状态，每个框架的组件树结构都不一样 |
| **语义选择器** `field=标签` | 「按标签文字定位整块表单项」依赖的是**设计体系的类名约定**，不是框架 |
| **路由 → 源码** | 物料过期检测要知道「这张图来自哪个文件」，路由表的写法各家不同 |

除这三件，其余全是通用的：CDP 驱动、截图裁剪、录屏与合成光标、external document publishing、锚点索引、发布器、通告渲染器。

## 选用

默认 `vue2-vite`。换别的：

```bash
BEEPRESS_ADAPTER=react-router npx beepress capture-kb-shots
```

## 写一个新适配器

照 `vue2-vite.mjs` 的形状导出一个对象：

```js
export default {
  name: "react-router",

  // 注入页面的 JS 片段，必须定义 window.__protoSetState(patch)。
  // 返回空字符串表示成功，返回原因字符串表示失败——引擎据此报错。
  stateInjector: `window.__protoSetState = function (patch) { ... };`,

  // 语义选择器：容器与标签的类名，用来实现 field=标签
  fieldSelector: { container: ".form-item", label: ".form-item-label" },

  // 路由 → 仓库相对路径数组。查不到返回空数组
  async resolveRoute(repoRoot, route) { ... },
};
```

## 更省事的路子

`stateInjector` 现在的 Vue 实现是**遍历组件树偷内部结构**（`__vue__` / `$data` / `$children`），
脆，而且只对 Vue 2 成立。

如果接入方愿意改一行应用代码，更好的做法是让应用自己在 dev 构建里挂一个：

```js
if (import.meta.env.DEV) window.__protoSetState = (patch) => { /* 你自己知道怎么改状态 */ };
```

适配器的 `stateInjector` 就可以留空——引擎会直接用应用暴露的那个。
这样引擎彻底不碰框架内部，升级框架也不会把截图管线带崩。
