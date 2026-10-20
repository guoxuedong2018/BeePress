/**
 * 需求区域 ↔ 原型路由映射（宿主项目）
 * ------------------------------------------------------------------
 * 被 `npx beepress check-frs` 和评审归档读取。保持零依赖纯 ESM。
 *
 * 新增页面时把路由登记到对应区域；没有登记的路由会落到 APP_SHELL。
 * 需求件套建好后，把 `docs/features/<KEY>/` 写进 docPath。
 *
 * @typedef {"draft" | "confirmed" | "in_dev" | "accepting" | "archived"} FrsStatus
 * @typedef {{ key: string, title: string, status: FrsStatus, routes: string[], docPath?: string }} FrsEntry
 */

/** @type {FrsEntry[]} */
export const FRS_REGISTRY = [
  {
    key: "APP_SHELL",
    title: "应用外壳与通用页面",
    status: "draft",
    routes: ["*", "/"],
  },
];
