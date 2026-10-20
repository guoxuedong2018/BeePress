/**
 * Vue 2 + Vue Router + Vite 适配器
 * ------------------------------------------------------------------
 * 接口说明见同目录 README。这份实现对应Vue 2.7 + iView + Vite 的参考实现。
 */

import { existsSync, promises as fs } from "node:fs";
import path from "node:path";

export default {
  name: "vue2-vite",

  /**
   * 翻页面组件上的本地开关。
   *
   * 错误态、无权限态这些没有自然触发入口，原型里是留了 data 字段让人在 devtools
   * 里翻的（见 `eval-case/index.vue` 的注释）。
   *
   * ⚠️ 这段是**遍历组件树偷内部结构**，脆且只对 Vue 2 成立：Vue 3 没有 `__vue__`，
   * `$children` 也被移除了。长远更稳的做法是让应用在 dev 构建里自己挂一个
   * `window.__protoSetState`——见 README「更省事的路子」。这里先兜住现状。
   *
   * 约定：返回空字符串代表成功，返回非空字符串代表失败原因。
   */
  stateInjector: `
window.__protoSetState = function (patch) {
  // Vue 2 挂载时会把 #app 替换掉，只能从任意带 __vue__ 的节点回溯到 $root
  const host = Array.from(document.querySelectorAll('body *')).find(function (el) { return el.__vue__; });
  const vm = host && host.__vue__.$root;
  if (!vm) return ' 拿不到 Vue 根实例';
  const stack = [vm];
  while (stack.length) {
    const node = stack.shift();
    const known = Object.keys(patch).filter(function (k) { return k in node.$data; });
    // 必须同时具备全部字段，否则会把 patch 拆散写到不同组件上
    if (known.length === Object.keys(patch).length) {
      known.forEach(function (k) { node[k] = patch[k]; });
      return '';
    }
    stack.push.apply(stack, node.$children);
  }
  return ' 没有组件同时具备这些字段：' + Object.keys(patch).join(', ');
};
`,

  /**
   * `field=标签` 的落点。
   *
   * 这是**设计体系**的约定不是框架的：参考实现的表单项统一走 `FormField`、
   * 筛选项走 `FilterField`，两者各有固定类名。换一套组件库就换这两个值。
   */
  fieldSelector: {
    container: ".filter-field, .form-field",
    label: ".filter-label, .form-field-label",
  },

  /**
   * 路由 → 这一屏画出来依赖的全部源码文件，用于判断配图该不该重拍。
   *
   * 从页面组件出发，沿 import 走完整个闭包（`@/` 别名、相对路径、懒加载的
   * `import()` 都跟），只收原型源码根下的文件，第三方包不收。
   *
   * 从前只追一层 `@/components/`，于是 mock 数据、页面自带的子组件、组件再引的组件
   * 改了都看不见：2026-09-22 就有一张图源码「没变」、重拍出来却变了。
   * 追得全会多报「该重拍」，但那一侧的代价只是几秒钟截图——产物字节没变就会被截断，
   * 不会打扰到引用它的文档。漏报则是图悄悄过时，没有任何东西会响。
   *
   * **不收布局壳与全局样式**（BasicLayout、theme.less）：截图都裁在页面内容区，
   * 把它们算进来等于任何一次侧栏改动都让全站配图进「待重拍」清单。
   */
  async resolveRoute(repoRoot, route) {
    const srcRoot = srcRootOf(repoRoot);
    const routeMap = await loadRouteMap(repoRoot, srcRoot);
    const clean = `/${route.split("?")[0].replace(/^\//, "")}`;
    const page = routeMap.get(clean);
    if (!page) return [];

    const seen = new Set();
    const queue = [page];
    while (queue.length) {
      const rel = queue.shift();
      if (seen.has(rel)) continue;
      seen.add(rel);
      for (const dep of await importsOf(repoRoot, rel, srcRoot)) if (!seen.has(dep)) queue.push(dep);
    }
    return [...seen];
  },
};

const EXTS = ["", ".js", ".mjs", ".vue", "/index.js", "/index.vue"];
const importCache = new Map();

/** Prototype source root, relative to the project root. */
function srcRootOf(repoRoot) {
  const configured = process.env.BEEPRESS_WEB_DIR || process.env.BUILDER_KIT_WEB_DIR;
  const web = configured || (existsSync(path.join(repoRoot, "web")) ? "web" : "");
  return path.normalize(path.join(web, "src"));
}

/** 一个文件直接 import 了 src/ 下的哪些文件（已解析成仓库相对路径） */
async function importsOf(repoRoot, rel, srcRoot) {
  const abs = path.join(repoRoot, rel);
  const stat = await fs.stat(abs).catch(() => null);
  if (!stat) return [];
  const hit = importCache.get(rel);
  if (hit && hit.mtime === stat.mtimeMs) return hit.deps;

  const src = await fs.readFile(abs, "utf8").catch(() => "");
  const specs = new Set();
  for (const m of src.matchAll(/(?:import|export)\s[^"'`]*?from\s*["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|import\s+["']([^"']+)["']/g)) {
    specs.add((m[1] ?? m[2] ?? m[3]).split("?")[0]);
  }

  const deps = [];
  for (const spec of specs) {
    let base;
    if (spec.startsWith("@/")) base = path.join(srcRoot, spec.slice(2));
    else if (spec.startsWith(".")) base = path.join(path.dirname(rel), spec);
    else continue; // 第三方包
    for (const ext of EXTS) {
      const cand = path.normalize(base + ext);
      if (!cand.startsWith(srcRoot)) break;
      const st = await fs.stat(path.join(repoRoot, cand)).catch(() => null);
      if (st?.isFile()) {
        deps.push(cand.split(path.sep).join("/"));
        break;
      }
    }
  }
  importCache.set(rel, { mtime: stat.mtimeMs, deps });
  return deps;
}

let cached = null;

/** 解析 router/index.js，得到 `路由路径 → 页面组件文件` */
async function loadRouteMap(repoRoot, srcRoot) {
  const file = path.join(repoRoot, srcRoot, "router", "index.js");
  const mtime = (await fs.stat(file).catch(() => null))?.mtimeMs;
  if (cached && cached.mtime === mtime) return cached.map;
  const src = await fs.readFile(file, "utf8");
  const map = new Map();
  // path: "x" 与紧随其后的 import("@/pages/...") 成对出现。中间**不许跨过下一个 path:**——
  // 否则 `path: "/"`（布局壳，组件不是懒加载）会一路吃到第一个子路由的 import，
  // 把子路由的页面算到根上，子路由自己反而查不到（某个页面就这样漏了，配图从不提示过期）
  for (const m of src.matchAll(/path:\s*"([^"]*)"(?:(?!path:)[\s\S]){0,200}?import\("@\/([^"]+)"\)/g)) {
    map.set(`/${m[1].replace(/^\//, "")}`, path.join(srcRoot, m[2]));
  }
  cached = { mtime, map };
  return map;
}
