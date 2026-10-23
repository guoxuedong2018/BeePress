import Vue from "vue";
import { AGENT_PROMPT, FRS_REGISTRY, barExtras, barLinks } from "virtual:builderharness/host";

import { mountKit } from "../core/mount";
import "./vue2.less";

/**
 * Vue 2 宿主适配层 —— 套件里唯一认识 Vue 的地方
 * ==================================================================
 * 套件界面是 React，挂在自己的根上。原型是 Vue 2：它的页面子树（router-view）得原样留在
 * Vue 里，研发复用高保真代码时直接取走那一块。所以这一层只做三件事：
 *
 *   1. 搭格子：工具栏 / 原型内容区 / 评论抽屉。原型放进内容区，与直接挂到 #app 时布局一致
 *   2. 桥接路由：当前路径、订阅变化、按路由算 href、跳转
 *   3. 挂宿主控件：vite.config.js 的 barExtras 是宿主的 Vue 组件，套件画不了，
 *      由这里以宿主根实例为 parent 挂进工具栏留的位置（全局组件、路由、store 照常可用）
 *
 * 换一个 Vue 3 或 React 的原型，照这份写一个同样三件事的适配层即可，核心不用动。
 */
export const BuilderHarnessRoot = {
  name: "BuilderHarnessRoot",
  mounted() {
    const router = this.$router;
    const parent = this;
    this.kit = mountKit({
      slots: { bar: this.$refs.bar, content: this.$refs.content, drawer: this.$refs.drawer },
      frsRegistry: FRS_REGISTRY,
      barLinks,
      agentPrompt: AGENT_PROMPT,
      router: {
        current: () => router.currentRoute.path,
        subscribe: (cb) => router.afterEach((to) => cb(to.path)),
        href: (route) => router.resolve(route).href,
        push: (path) => router.push(path).catch(() => {}),
      },
      mountExtras: barExtras.length
        ? (el) => {
            const vm = new Vue({ parent, render: (h) => h("span", { class: "bk-host-extras" }, barExtras.map((c) => h(c))) }).$mount();
            el.appendChild(vm.$el);
            return () => {
              vm.$destroy();
              vm.$el.remove();
            };
          }
        : undefined,
    });
  },
  beforeDestroy() {
    if (this.kit) this.kit.unmount();
  },
  /**
   * 格子里除了原型子树什么都不放：工具栏与抽屉由 React 画进去（portal）。
   * Vue 重新渲染时这两个空格子的子节点它不认识、也不会去动。
   */
  render(h) {
    return h("div", { class: "review-shell" }, [
      h("div", { ref: "bar", class: "bk-slot-bar" }),
      h("div", { class: "rs-body" }, [
        h("div", { ref: "content", class: "rs-content", attrs: { "data-review-root": "" } }, this.$slots.default),
        h("div", { ref: "drawer", class: "bk-slot-drawer" }),
      ]),
    ]);
  },
};
