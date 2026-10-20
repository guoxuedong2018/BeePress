/**
 * 宿主接口 —— 套件核心只通过它认识宿主
 * ==================================================================
 * 套件界面是 React，挂在自己的根上；原型（宿主）是什么框架它不知道，也不该知道。
 * 宿主适配层（adapters/vue2.js 是 Vue 2 示例）负责把下面这些交进来：
 *
 *   slots.bar       工具栏格子：原型上方那一条
 *   slots.content   原型内容区：评审靠它判「点的是不是原型」、给它打区域标记
 *   slots.drawer    评论抽屉格子：原型右侧，开合时挤压原型而不是盖住它
 *   frsRegistry     需求区域注册表（业务数据）
 *   barLinks        工具栏上的宿主链接 [{ label, route, title? }]
 *   agentPrompt?    复制给 Agent 的指令前缀（如 "/content-draft"）；不给则只复制原文路径
 *   router          { current(): string, subscribe(cb): () => void, href(route): string, push(path): void }
 *   mountExtras?    (el) => () => void   把宿主自己的控件（密度、主题切换）挂进工具栏留的位置
 *
 * 浮层（圈选、审阅台、预览）不占格子：套件在 <body> 下另开一个根，全部 position: fixed。
 */

let host = null;

export function setHost(h) {
  host = h;
}

export function getHost() {
  if (!host) throw new Error("beepress：还没挂载宿主（mountKit 没调用）");
  return host;
}
