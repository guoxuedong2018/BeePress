/**
 * 需求区域（FRS）的格式、状态词表与路由查找 —— 能力侧
 * ==================================================================
 * 本文件只定义「区域这个概念长什么样、怎么按路由查」，**不含任何具体业务数据**。
 * 注册表由宿主适配层在挂载时交进来（mountKit 的 frsRegistry），
 * 宿主的实际数据由 vite.config.js 的 frsRegistry 接线。
 *
 * 这样切分的原因：区域划分随业务演进天天变，而「区域有五种状态、按路由段匹配」
 * 是方法论的一部分，跨产品复用。两者放一个文件里，套件就没法搬到别的原型上。
 *
 * @typedef {"draft" | "confirmed" | "in_dev" | "accepting" | "archived"} FrsStatus
 * @typedef {{ key: string, title: string, status: FrsStatus, routes: string[], docPath?: string }} FrsEntry
 */
let FRS_REGISTRY = [];

export function setFrsRegistry(list) {
  FRS_REGISTRY = Array.isArray(list) ? list : [];
}

/** 状态词表属于方法论：状态必须如实使用这五种之一，不得自造。 */
export const FRS_STATUS_LABEL = {
  draft: "草案",
  confirmed: "已确认",
  in_dev: "开发中",
  accepting: "验收中",
  archived: "已归档",
};

function routeMatch(pattern, pathname) {
  if (pattern === "*") return true;
  const expected = pattern.split("/").filter(Boolean);
  const actual = pathname.split("/").filter(Boolean);
  if (expected.length !== actual.length) return false;
  return expected.every((segment, index) => segment.startsWith(":") || segment === actual[index]);
}

/** @returns {FrsEntry[]} */
export function frsForRoute(pathname) {
  const specific = FRS_REGISTRY.filter((entry) =>
    entry.routes.some((route) => route !== "*" && routeMatch(route, pathname)),
  );
  if (specific.length > 0) return specific;
  return FRS_REGISTRY.filter((entry) => entry.routes.includes("*"));
}
