/**
 * 需求区域 ↔ 界面区域映射（BuilderHarness 自身）
 * ------------------------------------------------------------------
 * 被 `npx builderharness check-frs` 和评审归档读取。保持零依赖纯 ESM。
 *
 * BuilderHarness 的操作台是 DSH 主面板，没有 URL 路由；这里登记的是评审用的
 * 逻辑界面 id，与 docs/features/<KEY>/FRS.json 的 spec[].route 对应。
 *
 * @typedef {"draft" | "confirmed" | "in_dev" | "accepting" | "archived"} FrsStatus
 * @typedef {{ key: string, title: string, status: FrsStatus, routes: string[], docPath?: string }} FrsEntry
 */

/** @type {FrsEntry[]} */
export const FRS_REGISTRY = [
  {
    key: "APP_SHELL",
    title: "应用外壳与通用界面",
    status: "draft",
    routes: ["*", "/"],
    docPath: "docs/architecture.md",
  },
  {
    key: "ONBOARDING",
    title: "首次启动与新手引导",
    status: "draft",
    routes: ["/onboarding"],
    docPath: "docs/features/10202150_ONBOARDING",
  },
  {
    key: "COCKPIT",
    title: "原型操作台主界面",
    status: "draft",
    routes: ["/cockpit"],
    docPath: "docs/features/10202155_COCKPIT",
  },
  {
    key: "REVIEW",
    title: "源码锚点评审",
    status: "draft",
    routes: ["/review"],
    docPath: "docs/features/10202200_REVIEW",
  },
];
