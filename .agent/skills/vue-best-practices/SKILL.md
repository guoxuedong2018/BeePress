---
name: vue-best-practices
description: Vue 2 原型实现约定。仅当宿主原型使用 Vue 2 时读取；React 宿主跳过。覆盖 Vue 2.7、路由桥接、组件边界、生产剥离和可访问性。
---

# Vue 2 原型约定

Bee Press 的 UI 是 React，但 Vue 2 宿主可以通过 `beepress/vue2` 适配层挂载；
工具 UI 不需要改写业务组件。

## 版本与写法

- 用 Vue 2.7；新代码优先 Composition API，存量 Options API 不强迁。
- 不引入只在 Vue 3 存在的 API；需要时先确认宿主升级计划。
- 组件按「布局 / 业务块 / 基础控件」分层；基础控件优先复用宿主设计系统。

## 路由与挂载

- 宿主路由保持自己的实现；适配层只要求 `current`、`subscribe`、`href`、`push`。
- 只在开发期挂载：

```js
if (import.meta.env.DEV) {
  import("beepress/vue2").then((m) => {
    this.kitRoot = m.BeePressRoot;
  });
}
```

- 生产构建不包含适配层和工具 UI。

## 状态与数据

- 示例数据必须标明是合成/演示数据，不写真实账号或客户数据。
- 业务规则来自 FRS 或界面文案，不从 mock 数据归纳。
- 异步状态覆盖 loading / empty / error / permission denied；不要只做成功态。

## 可访问性

- 交互元素用原生 button / input，或补齐 role、tabindex 和键盘事件。
- 焦点环可见；不要让 `outline: none` 成为默认。
- 颜色对比度用 `src/utils/contrast.js` 或宿主 token 检查。
