/**
 * 路由登记一致性校验
 * ==================================================================
 * 仓库硬性规则要求新增页面三处同步登记：
 *   src/router/index.js       路由
 *   src/config/navigation.js  导航
 *   src/config/frs-map.js     需求区域映射
 *
 * 三者靠人工维护极易漂移，且漂移是「静默」的——批注归错档、菜单点了 404、
 * 需求区域查不到页面，都要等到用的时候才发现。本脚本接在 build 之前，
 * 把漂移变成构建失败。
 *
 * 实现说明：navigation.js 与 frs-map.js 是无依赖的纯 ESM，直接 import 取真实
 * 数据，不做文本解析。router/index.js 因 import 了 Vue 与 .vue 组件无法在
 * Node 里直接执行，只能正则提取；故对提取结果做了下限校验，避免解析器
 * 失效时「零路由通过」的假阴性。
 *
 * frs-map.js 是产品自己的业务数据（工具套件只认格式、不含数据），因此工具层被剥离
 * 后它依然在，校验照常生效。仍保留存在性判断，供不做需求区域划分的工程跳过。
 */
import { readFile, access } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { WEB_DIR } from "./lib/paths.mjs";

const srcDir = path.join(WEB_DIR, "src");

const ROUTER_FILE = path.join(srcDir, "router", "index.js");
const NAV_FILE = path.join(srcDir, "config", "navigation.js");
const FRS_FILE = path.join(srcDir, "config", "frs-map.js");

/**
 * 不参与登记校验的特殊路径：
 *   "*"  404 兜底  ·  ""  默认子路由（重定向）  ·  "/"  BasicLayout 容器本身
 */
const IGNORED = new Set(["*", "", "/"]);

/**
 * 工具页：面向设计/研发而非业务用户，刻意不进产品导航、不归属需求区域。
 * 新增此类页面时必须显式登记到这里，而不是放宽校验规则。
 *
 * `/external/**` 是**其他平台的模拟页**，用于演示跨平台链路的发起端
 * （例如从 A 平台跳转到 B 平台）。它们不是当前应用的页面，
 * 所以既不进导航，也不归需求区域——批注该落在被跳转到的那一侧。
 */
const TOOL_ROUTES = new Set(["/design-system", "/external/infer-orchestration"]);

/** 相对子路由 → 绝对路径 */
function toAbsolute(p) {
  return ("/" + p).replace(/\/{2,}/g, "/").replace(/(.)\/$/, "$1");
}

async function exists(f) {
  try {
    await access(f);
    return true;
  } catch {
    return false;
  }
}

async function readRouterPaths() {
  const code = await readFile(ROUTER_FILE, "utf8");
  const found = [...code.matchAll(/path:\s*["'`]([^"'`]*)["'`]/g)].map((m) => m[1]);
  if (found.length === 0) {
    throw new Error(
      `未能从 ${path.relative(process.cwd(), ROUTER_FILE)} 提取到任何 path。\n` +
        "路由表写法可能已变化，请同步更新本脚本的提取规则，不要直接放行。",
    );
  }
  const abs = found.filter((p) => !IGNORED.has(p)).map(toAbsolute);
  return [...new Set(abs.filter((p) => !IGNORED.has(p)))].sort();
}

const problems = [];
function report(title, items, hint) {
  if (items.length === 0) return;
  problems.push({ title, items, hint });
}

const allRouterPaths = await readRouterPaths();
/** 参与「三处登记」校验的业务页面路由 */
const routerPaths = allRouterPaths.filter((p) => !TOOL_ROUTES.has(p));

report(
  "TOOL_ROUTES 里登记了不存在的路由",
  [...TOOL_ROUTES].filter((p) => !allRouterPaths.includes(p)),
  "工具页已删除或改名，同步清理本脚本的 TOOL_ROUTES。",
);

// ── 导航：菜单项必须真实可达 ──────────────────────────────────────
const { NAVIGATION, MENU_ALIAS } = await import(pathToFileURL(NAV_FILE).href);
const navPaths = NAVIGATION.flatMap((g) => g.children.map((c) => c.path));

report(
  "导航菜单指向了不存在的路由（点击会 404）",
  navPaths.filter((p) => !routerPaths.includes(p)),
  "在 src/router/index.js 补上对应路由，或修正 navigation.js 里的 path。",
);

report(
  "MENU_ALIAS 的键指向了不存在的路由",
  Object.keys(MENU_ALIAS).filter((p) => !routerPaths.includes(p)),
  "别名的键应是真实子页面路径（如 /eval-set/detail）。",
);

report(
  "MENU_ALIAS 的值不是任何菜单项",
  Object.values(MENU_ALIAS).filter((p) => !navPaths.includes(p)),
  "别名的值应是 navigation.js 里存在的菜单项 path，否则高亮不到任何菜单。",
);

// 每个页面都应能点亮某个菜单：要么自身是菜单项，要么有别名
report(
  "页面既不是菜单项、也没有 MENU_ALIAS（进入后侧边栏无高亮）",
  routerPaths.filter((p) => !navPaths.includes(p) && !(p in MENU_ALIAS)),
  "在 navigation.js 加菜单项，或在 MENU_ALIAS 里把它映射到所属列表页。",
);

// ── FRS：需求区域映射（未做区域划分的工程可无此文件，跳过）──────────
if (await exists(FRS_FILE)) {
  const { FRS_REGISTRY } = await import(pathToFileURL(FRS_FILE).href);
  const frsPaths = FRS_REGISTRY.flatMap((e) => e.routes).filter((r) => r !== "*");

  report(
    "路由未登记到任何需求区域（批注会落到 APP_SHELL 兜底，PRD 归并不准）",
    routerPaths.filter((p) => !frsPaths.includes(p)),
    "在 src/config/frs-map.js 的 FRS_REGISTRY 里把该路由挂到所属需求区域。",
  );

  report(
    "需求区域登记了已不存在的路由",
    frsPaths.filter((p) => !routerPaths.includes(p)),
    "路由已删除或改名，同步清理 frs-map.js 中的登记。",
  );
}

// ── 输出 ────────────────────────────────────────────────────────
if (problems.length === 0) {
  console.log(`✓ 路由登记一致（${routerPaths.length} 条路由，${navPaths.length} 个菜单项）`);
  process.exit(0);
}

console.error("\n✗ 路由登记存在漂移：\n");
for (const { title, items, hint } of problems) {
  console.error(`  ${title}`);
  for (const it of items) console.error(`    · ${it}`);
  console.error(`    → ${hint}\n`);
}
process.exit(1);
