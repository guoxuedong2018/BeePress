import { createRoot } from "react-dom/client";

import { setFrsRegistry } from "../review/frs";
import { App } from "./App";
import { setHost } from "./host";

/**
 * 把套件挂到宿主上。宿主要交什么见 ./host.js；Vue 2 宿主由 adapters/vue2.js 调用。
 *
 * 套件在 <body> 下另开一个根放浮层（圈选、审阅台、预览）：浮层都是 position: fixed，
 * 不必挤进宿主的布局。根上带 data-review-ui，圈选时整块算作「工具层」、不会被当成原型点中。
 *
 * @returns {{ unmount(): void }}
 */
export function mountKit(host) {
  setHost(host);
  setFrsRegistry(host.frsRegistry);
  const el = document.createElement("div");
  el.className = "bk-root";
  el.setAttribute("data-review-ui", "");
  document.body.appendChild(el);
  const root = createRoot(el);
  root.render(<App />);
  return {
    unmount() {
      root.unmount();
      el.remove();
    },
  };
}
