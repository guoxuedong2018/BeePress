/**
 * 路由 → 源码文件
 * ------------------------------------------------------------------
 * 配图和录屏的配方里写的是**路由**，而「这张图该不该重拍」要问的是
 * **这条路由牵涉的源码变没变**。这个模块把两者接上。
 *
 * 路由怎么解析成文件是技术栈相关的，交给适配器（`pipeline/adapters/`）。
 * 变没变按内容哈希判，在 source-snapshot / media-ledger 里——不看修改时间：
 * `git clone` 会把 mtime 全刷成检出时刻，而改了又改回去的文件时间变了、内容没变。
 */

import { loadAdapter } from "./adapter.mjs";

/**
 * 一个路由牵涉哪些源码文件。委托给适配器。
 *
 * 路由匹配不到时返回空数组——调用方应当把它当成「查不出来」而不是
 * 「没有依赖」，不要据此判定为不过期。
 */
export async function sourcesForRoute(repoRoot, route) {
  const adapter = await loadAdapter();
  return adapter.resolveRoute(repoRoot, route);
}
