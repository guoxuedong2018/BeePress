/**
 * UI 规范符合性检查
 * ==================================================================
 * 设计系统只有落到组件粒度才谈得上「渐进式替换」：先有标准组件，再能逐页把
 * 非标准写法换掉。本脚本负责让「还剩哪些非标准写法」这件事**可枚举**，
 * 而不是靠人翻代码。
 *
 * 两档结果，刻意区分：
 *
 *   error（构建失败）—— 硬性规则，新代码不允许再犯：
 *       硬编码十六进制色值、页面 import 评审层。
 *
 *   warn（只报告，不阻断）—— 待迁移清单，用于渐进式替换：
 *       直接用 iView 裸组件而非标准组件、手写状态胶囊或操作链接样式。
 *
 * 为什么待迁移项不设成 error：平台是渐进式迭代，存量页面不可能一次改完；
 * 设成 error 会逼人加豁免注释绕过，规范反而失去意义。warn 列表逐步清零，
 * 清零后再考虑是否升级为 error。
 *
 * 只检查业务页面与业务组件（pages/ 与 components/），不检查标准组件自身、
 * 设计系统规范页与评审层——它们本来就要写原始样式。
 */
import { readFile, readdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { WEB_DIR } from "./lib/paths.mjs";

const srcDir = path.join(WEB_DIR, "src");

/**
 * 对比度算法取自宿主：`/design-system` 的无障碍审计表也在用同一份，两边必须算出
 * 一样的结果。本脚本的职责本就是「读宿主的文件来校验宿主」，动态取它不算越界；
 * 反过来把算法搬进套件才会出问题——那会让产品反向依赖套件。
 */
let contrast;
let toAccessible;
let AA_SMALL_TEXT;
try {
  ({ contrast, toAccessible, AA_SMALL_TEXT } = await import(pathToFileURL(path.join(srcDir, "utils", "contrast.js")).href));
} catch {
  console.error(
    `check-ui: cannot load ${path.relative(process.cwd(), path.join(srcDir, "utils", "contrast.js"))}.\n` +
      "This is a reference host check; adapt it to your design system or remove it.",
  );
  process.exit(1);
}

/**
 * 标准组件库与规范页不参与「该用标准组件」这类检查——
 * 它们本来就要写原始样式，拿裸组件检查它们没有意义。
 *
 * utils/contrast.js 里的黑白是色彩算法的取值边界，不是设计色值。
 *
 * 工具套件（beepress/）不在扫描范围内：本脚本只扫宿主的 src/。它的批注标记
 * 用固定色值是刻意的——要在任意主题、任意页面背景上都看得清。
 */
const EXEMPT = [
  "components/common/",
  "pages/design-system/",
  "config/design-tokens.js",
  "utils/contrast.js",
];

/**
 * 但**标准组件不豁免"该用 token"这一类规则**（色值、阴影、动效）。
 *
 * 这条豁免原先是全量的，结果 PageHeader 里一句 `color: #1f2329` 一直没被发现，
 * 直到暗色主题上线，页面标题在深色底上成了看不见的深灰——而检查一路是绿的。
 * 写死取值恰恰在标准组件里危害最大：它被所有页面复用，一处写死，处处失效。
 *
 * 规范页仍然豁免：它要把取值本身**当内容展示**（色板、对比度审计表、
 * 阴影与动效演示块），那些字面量就是这一页的内容。
 */
const TOKEN_RULE_EXEMPT = [
  ...EXEMPT.filter((x) => x !== "components/common/"),
  // mock/ 里的色值是**图片内容**，不是界面取值：占位缩略图是一段内联 SVG，
  // 那几个 hsl / rgba 是画在图里的像素，相当于一张照片的颜色。
  // 主题切换不该影响一张图长什么样，所以它们本来就不该走 token。
  "mock/",
  // 某些配置文件生成的是**发给外部系统的模板字符串**，不是宿主的样式。
  // 那边是另一个系统，没有我们的 CSS 变量，`var(--color-*)` 过去就是一个解析不出来的值；
  // 官方模板范本本来也是内联十六进制。与 mock/ 同理：这些色值是「内容」而不是「界面取值」，
  // 主题切换不该、也无法影响一段发出去的模板文本长什么样。
  //
  // 豁免刻意只给这一个文件、且只免 token 那几条规则：一旦扩到整个 config/，
  // design-tokens.js 之外的配置里写死色值就又没人拦了。
  "config/push-fields.js",
];
const TOKEN_RULES = new Set([
  "hardcoded-color",
  "hardcoded-color-fn",
  "hardcoded-shadow",
  "hardcoded-motion",
  "hardcoded-code-font",
  // 焦点环也归这一类：标准组件里去掉它，所有页面的键盘焦点一起消失
  "outline-none",
]);

const RULES = [
  {
    level: "error",
    id: "hardcoded-color",
    // 排除注释行：注释里写量取值是允许的
    test: (line) => !/^\s*(\/\/|\*|<!--)/.test(line) && /#[0-9a-fA-F]{3,8}\b/.test(line),
    msg: "硬编码十六进制色值",
    hint: "改从 @/config/design-tokens.js 取；新色需先量取线上并回填 token。",
  },
  {
    level: "error",
    id: "hardcoded-color-fn",
    // 上一条只认 `#rrggbb`，于是 `rgba(0,0,0,.42)` 从缝里漏了两年：
    // 播放图标底衬曾经写死成半透明黑，检查一路是绿的。
    // 半透明色最容易漏，正因为 Less 的 fade() 吃不了 var()，写不了才顺手写死。
    test: (line) =>
      !/^\s*(\/\/|\*|<!--)/.test(line) && /\b(rgba?|hsla?)\s*\(/.test(line),
    msg: "硬编码 rgb / rgba / hsl 色值",
    hint:
      "Less 颜色函数吃不了 var()，需要半透明变体请去 styles/theme.less 新增 token，" +
      "不要在调用点算（例：--color-scrim）。",
  },
  {
    level: "error",
    id: "hardcoded-shadow",
    // 层级只有 elevation-0 / 1 与一个方向性变体。写死一个新阴影就是在造第三级，
    // 而阴影是最容易被"随手加一点让它浮起来"的属性。
    // 0 0 0 <n>px 是描边式的环（选中态），不是层级阴影，放过。
    test: (line) => {
      const m = line.match(/box-shadow\s*:\s*([^;]+)/);
      if (!m || /^\s*(\/\/|\*|<!--)/.test(line)) return false;
      const v = m[1].trim();
      if (/@elevation-|^none\b|^inset\b|^0 0 0 /.test(v)) return false;
      return /\d/.test(v);
    },
    msg: "自造阴影层级",
    hint: "层级只有 @elevation-0 / @elevation-1（含 @elevation-1-x 方向性变体），不要造第三级。",
  },
  {
    level: "error",
    id: "hardcoded-motion",
    // 动效只有两档。写死时长的代价不只是不统一：常见的是时长抄对了、缓动没抄对
    // （`0.2s ease` vs `@motion-fast ease-in-out`），同一个展开动作两条曲线。
    // 循环动画（loading 骨架的脉冲）不属于状态过渡，规范没有管，故只查 transition。
    test: (line) =>
      !/^\s*(\/\/|\*|<!--)/.test(line) &&
      /transition\s*:/.test(line) &&
      /\d(\.\d+)?m?s\b/.test(line),
    msg: "写死过渡时长",
    hint: "控件状态用 @motion-fast，浮层进出用 @motion-slow，缓动配 @easing-standard / @easing-overlay。",
  },
  {
    level: "error",
    id: "hardcoded-code-font",
    // 代码字体曾在 15 处各写一份、三种写法，同一段 JSON 在两页字形不同
    test: (line) =>
      !/^\s*(\/\/|\*|<!--)/.test(line) &&
      /font-family\s*:[^;]*monospace/.test(line),
    msg: "手写代码字体栈",
    hint: "改用 @font-family-code（styles/tokens.less，JS 副本是 design-tokens.js 的 FONT_FAMILY_CODE）。",
  },
  {
    level: "error",
    id: "outline-none",
    // 全局 :focus-visible 画的是 2px 实色环（WCAG 2.4.11 要求 ≥3:1）。本轮审查一次翻出 9 处
    // `outline: none`，换成的要么是一圈 16% 透明度的蓝（约 1.3:1），要么只是换个底色——
    // 键盘用户停在哪儿看不出来，而检查一路是绿的。
    test: (line) =>
      !/^\s*(\/\/|\*|<!--)/.test(line) && /outline\s*:\s*(none|0)\s*(;|$)/.test(line),
    msg: "去掉了焦点环（outline: none）",
    hint: "全局 :focus-visible 已画好焦点环，删掉这一行即可；确需换样式，新样式也得 ≥3:1、只在 :focus-visible 出现。",
  },
  {
    level: "error",
    id: "clickable-icon",
    // 给 <Icon> 挂 @click：它是个 <i>，Tab 不到、回车按不动、读屏只念空白
    test: (line) => /<Icon\b[^>]*@click/.test(line),
    msg: "可点击的 <Icon>",
    hint: "改用 @/components/common/IconButton.vue：label 必填，键盘可达，悬停自动出说明。",
  },
  {
    level: "error",
    id: "import-kit",
    // 静态与动态两种写法都要拦：套件是 dev 动态挂载的，只查 `from "…"` 会漏掉 import()
    test: (line) => /(from\s+["']|import\(\s*["'])beepress/.test(line),
    // App.vue 是套件唯一被允许的落点。只对这一条规则开口子，其余规则照常管它
    skip: ["App.vue"],
    msg: "业务代码引用了工具套件",
    hint: "套件必须可整层剥离，只允许 App.vue 一处 dev 动态 import（见硬性规则 9）。",
  },
  {
    level: "warn",
    id: "raw-table",
    // 标签名后允许空白、'>' 或行尾（多行写法里 `<Table` 常常独占一行）
    test: (line) => /<Table(\s|>|$)/.test(line),
    msg: "直接使用 iView <Table>",
    hint: "改用 @/components/common/DataTable.vue，统一分页与空态。",
  },
  {
    level: "warn",
    id: "raw-page",
    test: (line) => /<Page(\s|>|$)/.test(line),
    msg: "直接使用 iView <Page>",
    hint: "分页已包含在 DataTable 里；卡片网格等非表格场景用 PaginationBar.vue。",
  },
  {
    level: "warn",
    id: "raw-modal",
    test: (line) => /<Modal(\s|>|$)/.test(line),
    msg: "直接使用 iView <Modal>",
    hint: "改用 @/components/common/AppModal.vue，统一宽度档位、按钮顺序与主操作文案。",
  },
  {
    level: "warn",
    id: "raw-drawer",
    test: (line) => /<Drawer(\s|>|$)/.test(line),
    msg: "直接使用 iView <Drawer>",
    hint: "改用 @/components/common/AppDrawer.vue，统一宽度档位与底部操作条。",
  },
  {
    level: "warn",
    id: "handrolled-filter-row",
    // FilterField 本身是标准组件，但页面**直接**摆它就等于自己在排筛选区版式：
    // 宽度、placeholder、能不能清除全靠手写，抄到第三个页面必然开始漂。
    // 长尾条件也就无处折叠、生效条件无处回显。列表页的筛选区一律声明式过 FilterPanel。
    test: (line) => /<FilterField(\s|>|$)/.test(line),
    msg: "页面手写筛选区版式",
    hint: "改用 @/components/common/FilterPanel.vue，页面只声明 fields；表单项用 FormField。",
  },
  {
    level: "warn",
    id: "adhoc-selection-hint",
    // 手写的已选提示只会说「已选 N 条」。跨页勾选后一改筛选，这句话就和眼前的行数
    // 对不上，而用户要拿它判断批量操作的范围。
    test: (line) => /class="[^"]*selection-(hint|bar)/.test(line),
    msg: "手写已选条数提示",
    hint: "改用 @/components/common/BulkActionBar.vue，它会回显不在当前筛选结果内的条数。",
  },
  {
    level: "warn",
    id: "adhoc-status-tag",
    test: (line) => /class="[^"]*status-(tag|badge)/.test(line),
    msg: "手写状态胶囊",
    hint: "改用 @/components/common/StatusTag.vue。",
  },
  {
    level: "warn",
    id: "adhoc-action-link",
    test: (line) => /class="[^"]*(action-link|action-delete|table-link)/.test(line),
    msg: "手写操作链接样式",
    hint: "改用 @/components/common/ActionLink.vue，它同时带二次确认与禁用提示。",
  },
];

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else if (/\.(vue|js)$/.test(e.name)) out.push(full);
  }
  return out;
}

const matches = (list, rel) => list.some((x) => rel.startsWith(x) || rel.includes(x));

const hits = [];
let scanned = 0;
for (const file of await walk(srcDir)) {
  const srcRel = path.relative(srcDir, file).split(path.sep).join("/");
  const rel = path.relative(WEB_DIR, file).split(path.sep).join("/");
  // 色值规则的豁免范围比其余规则小，逐条判断；rule.skip 再给单条规则开口子
  const active = RULES.filter((rule) => {
    if (rule.skip && matches(rule.skip, srcRel)) return false;
    return TOKEN_RULES.has(rule.id)
      ? !matches(TOKEN_RULE_EXEMPT, srcRel)
      : !matches(EXEMPT, srcRel);
  });
  if (!active.length) continue;
  scanned += 1;

  const lines = (await readFile(file, "utf8")).split("\n");
  lines.forEach((line, i) => {
    for (const rule of active) {
      if (rule.test(line)) {
        hits.push({ rule, file: rel, line: i + 1, text: line.trim().slice(0, 80) });
      }
    }
  });
}

// ── 双份 Token 的一致性 ────────────────────────────────────────
// 色值有两份：config/design-tokens.js（模板 / 脚本用）与 styles/theme.less
// （<style> 块经 tokens.less 的 var() 别名间接引用）。Less 读不了 JS，
// 只能各存一份，因此这里机械校验不漂移。
//
// 尺寸类仍在 tokens.less，两个文件都要读。
const themeLess = (
  await readFile(path.join(srcDir, "styles", "theme.less"), "utf8")
).toLowerCase();
const tokensLess = (
  await readFile(path.join(srcDir, "styles", "tokens.less"), "utf8")
).toLowerCase();
const tokensJs = await import(
  pathToFileURL(path.join(srcDir, "config", "design-tokens.js")).href
);

const declaredColors = [
  ...tokensJs.BRAND.map((c) => [c.name, c.value]),
  ...tokensJs.NEUTRALS.map((c) => [c.name, c.value]),
  ...tokensJs.STATUS.flatMap((s) => [
    [`${s.label} 文字色`, s.color],
    [`${s.label} 底色`, s.bg],
  ]),
  ...tokensJs.MEDIA_TYPE.map((m) => [`素材类型 ${m.label}`, m.color]),
  ...tokensJs.TAG_TONES.flatMap((t) => [
    [`标签色 ${t.key} 文字色`, t.color],
    [`标签色 ${t.key} 底色`, t.bg],
  ]),
  ...tokensJs.CODE_BLOCK.map((c) => [`代码块 ${c.name}`, c.value]),
  [tokensJs.ON_ACCENT.name, tokensJs.ON_ACCENT.value],
  [tokensJs.ON_PRIMARY.name, tokensJs.ON_PRIMARY.value],
  [`暗色 ${tokensJs.ON_PRIMARY.name}`, tokensJs.ON_PRIMARY.dark],
  [tokensJs.SCRIM.name, tokensJs.SCRIM.value],
  ["危险操作", tokensJs.DANGER.color],
  ["危险操作 hover", tokensJs.DANGER.hover],
  ["浮层蒙层", tokensJs.OVERLAY.find((o) => o.name === "蒙层").value],
  // 暗色主题同样两份，同样会漂
  ...["surfaces", "text", "brand"].flatMap((group) =>
    tokensJs.DARK[group].map((c) => [`暗色 ${c.name}`, c.value]),
  ),
  ...tokensJs.DARK.status.flatMap((s) => [
    [`暗色状态 ${s.label} 文字色`, s.color],
    [`暗色状态 ${s.label} 底色`, s.bg],
  ]),
  ...tokensJs.DARK.tagTones.flatMap((t) => [
    [`暗色标签色 ${t.key} 文字色`, t.color],
    [`暗色标签色 ${t.key} 底色`, t.bg],
  ]),
];

const tokenDrift = declaredColors.filter(
  ([, v]) => !themeLess.includes(v.toLowerCase()),
);

// 浮层宽度档位同样两份：JS 侧给组件挑档，Less 侧给样式引用，必须对得上
const declaredSizes = [
  ...tokensJs.OVERLAY_WIDTHS.map((w) => [`弹窗 ${w.key} 档`, `@modal-width-${w.key}`, w.value]),
  ...tokensJs.DRAWER_WIDTHS.map((w) => [`抽屉 ${w.key} 档`, `@drawer-width-${w.key}`, w.value]),
];

const sizeDrift = declaredSizes.filter(
  ([, name, value]) => !new RegExp(`${name}:\\s*${value}px`).test(tokensLess),
);

// 代码字体同样两份：Less 给样式、JS 给规范页展示
const codeFontLess = (tokensLess.match(/@font-family-code:\s*([^;]+);/) || [])[1];
// tokensLess 读进来时整体转了小写，这里同样按小写比
if (!codeFontLess || codeFontLess.trim() !== tokensJs.FONT_FAMILY_CODE.toLowerCase()) {
  sizeDrift.push(["代码字体", "@font-family-code", tokensJs.FONT_FAMILY_CODE]);
}

// ── 对比度（WCAG 2.1 AA）────────────────────────────────────────
// 平台正文基准 12px、辅助标注 11px，都属 WCAG 的"小字"，要求 4.5:1。
// 这条设成 error 而不是 warn：不达标的色值一旦进 token，会被规范页展示、
// 被其他平台照抄，等于把缺陷复制出去；而改一个色值的成本远低于事后全网返工。
//
// 唯一豁免的是禁用态——WCAG 1.4.3 明确不要求禁用控件达标，
// 且刻意压低对比度正是"不可用"的视觉表达。
const CONTRAST_EXEMPT = new Set(["禁用"]);

// 暗色的"卡片面"就是亮色的白，文字与品牌色都压在它上面
const DARK_SURFACE = tokensJs.DARK.surfaces.find((s) => s.name === "卡片面").value;

/**
 * 文字实际会压在哪些面上。
 *
 * 原先这里只校验白底，于是一整类问题从检查底下漏了过去：文字并不只落在白卡片上，
 * 它同样落在浅底区、页面底与计数角标上，而那几档更深。
 * 走查量出来的实况是「弱化」在白底 4.61 达标、在计数片只有 3.70——29 处失败，
 * 检查器却一路是绿的，因为没人声明过这几组配对。
 *
 * 所以文字色要**对所有面做叉乘**，而不是只对最宽松的那一个。
 */
const LIGHT_SURFACES = [
  ["白底", "#ffffff"],
  // 页面底不在 NEUTRALS 里（它是 theme.less 的 --color-page-bg），显式列出
  ["页面底", "#f5f7fa"],
  ...tokensJs.NEUTRALS.filter((s) => /^(浅底|条目底|计数底)$/.test(s.name)).map((s) => [
    s.name,
    s.value,
  ]),
];

/**
 * 会当正文用的那几档。叉乘只对它们做——
 * 主色是**填充**色（按钮、选中态），当文字只出现在白底上，
 * 把它也叉进带色底会造出一堆现实中不存在的配对，检查器一旦开始报假问题就没人看了。
 */
const TEXT_ROLES = /^(正文|次要|弱化|链接蓝)$/;

const declaredPairs = [
  // ── 亮色 ──
  // 所有文字色压白底
  ...[...tokensJs.BRAND, ...tokensJs.NEUTRALS]
    .filter((c) => !/底|分隔|边框|白/.test(c.name) && !CONTRAST_EXEMPT.has(c.name))
    .map((c) => [c.name, c.value, "#ffffff", "白底"]),
  // 正文类还要压在带色的面上
  ...[...tokensJs.BRAND, ...tokensJs.NEUTRALS]
    .filter((c) => TEXT_ROLES.test(c.name) && !CONTRAST_EXEMPT.has(c.name))
    .flatMap((c) =>
      LIGHT_SURFACES.filter(([sn]) => sn !== "白底").map(([sn, sv]) => [
        `${c.name}@${sn}`,
        c.value,
        sv,
        sn,
      ]),
    ),
  ["危险操作", tokensJs.DANGER.color, "#ffffff", "白底"],
  ["危险操作 hover", tokensJs.DANGER.hover, "#ffffff", "白底"],
  // 状态徽章：文字压在自己的底色上
  ...tokensJs.STATUS.map((s) => [`状态 ${s.label}`, s.color, s.bg, "徽章底"]),
  // 标签胶囊：文字压在自己那一档的底上
  ...tokensJs.TAG_TONES.map((t) => [`标签色 ${t.key}（${t.label}）`, t.color, t.bg, "胶囊底"]),
  // 素材类型角标是白字压在色底上，方向反过来。
  //
  // 前景取 ON_ACCENT 而不是字面写 "#ffffff"：这里断言的是**组件实际渲染出来的颜色**。
  // 原先写死 #ffffff，而 MediaTypeTag 用的是 @color-white——那个 token 暗色下是
  // #1f2126，真实对比度只有 3.57:1，检查却按 4.51:1 算，一路是绿的。
  // 断言必须指向组件真正用的那个 token，否则校验的是一个不存在的页面。
  ...tokensJs.MEDIA_TYPE.map((m) => [
    `素材类型 ${m.label}`,
    tokensJs.ON_ACCENT.value,
    m.color,
    "徽章底",
  ]),
  // PanelBox 的计数徽章压在主色底上，而主色底两套主题不同值，故前景成对校验。
  // 这一对最容易想当然："白字蓝底"在暗色下只有 3.58:1，方向是反的。
  ["主色底前景", tokensJs.ON_PRIMARY.value, tokensJs.BRAND[0].value, "主色底"],
  [
    "暗色主色底前景",
    tokensJs.ON_PRIMARY.dark,
    tokensJs.DARK.brand.find((c) => c.name === "主色").value,
    "暗色主色底",
  ],
  // 代码块是平台唯一的深色区块
  ...[
    ["代码块 JSON 文本", tokensJs.CODE_BLOCK[2].value, tokensJs.CODE_BLOCK[0].value],
    ["代码块 语言标识", tokensJs.CODE_BLOCK[3].value, tokensJs.CODE_BLOCK[1].value],
  ].map(([n, fg, bg]) => [n, fg, bg, "深色底"]),

  // 代码编辑器的配色不在这里校验：换回生产同款 CodeMirror 5 之后，
  // 明 / 暗两套直接用它自带的 eclipse 与 monokai。那是第三方样式表，
  // 与 iView 自带 CSS 同一性质，不是我们维护的设计变量，也就没有「两份漂移」可言。

  // ── 暗色 ──
  // 暗色不是"换个皮"，它自己也得过同一条线，否则等于只做了一半
  ...[...tokensJs.DARK.text, ...tokensJs.DARK.brand]
    .filter((c) => !CONTRAST_EXEMPT.has(c.name))
    .map((c) => [`暗色 ${c.name}`, c.value, DARK_SURFACE, "暗色卡片面"]),
  ...tokensJs.DARK.status.map((s) => [`暗色状态 ${s.label}`, s.color, s.bg, "暗色徽章底"]),
  ...tokensJs.DARK.tagTones.map((t) => [`暗色标签色 ${t.key}`, t.color, t.bg, "暗色胶囊底"]),
];

const contrastFails = declaredPairs
  .map(([name, fg, bg, on]) => ({ name, fg, bg, on, ratio: contrast(fg, bg) }))
  .filter((p) => p.ratio < AA_SMALL_TEXT);

const errors = hits.filter((h) => h.rule.level === "error");
const warns = hits.filter((h) => h.rule.level === "warn");

function print(list, title) {
  if (list.length === 0) return;
  console.log(`\n${title}\n`);
  const byRule = new Map();
  for (const h of list) {
    if (!byRule.has(h.rule.id)) byRule.set(h.rule.id, []);
    byRule.get(h.rule.id).push(h);
  }
  for (const [, group] of byRule) {
    const { msg, hint } = group[0].rule;
    console.log(`  ${msg}（${group.length} 处）`);
    for (const h of group) console.log(`    ${h.file}:${h.line}  ${h.text}`);
    console.log(`    → ${hint}\n`);
  }
}

print(warns, "○ 待迁移（不阻断构建，逐步替换即可）：");
print(errors, "✗ 违反硬性规则：");

if (tokenDrift.length > 0) {
  console.error("\n✗ 两份 Token 不一致：\n");
  console.error("  design-tokens.js 里的色值在 styles/tokens.less 中找不到");
  for (const [name, value] of tokenDrift) console.error(`    · ${name}  ${value}`);
  console.error("    → 在 src/styles/tokens.less 补上同名变量，两处必须同时改。\n");
}

if (sizeDrift.length > 0) {
  console.error("\n✗ 尺寸 / 字体 token 两份不一致：\n");
  for (const [label, name, value] of sizeDrift) {
    const shown = typeof value === "number" ? `${value}px` : value;
    console.error(`    · ${label}  design-tokens.js 是 ${shown}，${name} 对不上`);
  }
  console.error("    → 组件按 JS 侧挑档、样式按 Less 侧排版，对不上会当场错位。\n");
}

if (contrastFails.length > 0) {
  console.error("\n✗ 对比度不达 WCAG AA（小字 4.5:1）：\n");
  for (const p of contrastFails) {
    const fix = toAccessible(p.fg, p.bg);
    console.error(
      `    · ${p.name}  ${p.fg} 压在 ${p.on} ${p.bg} 上只有 ${p.ratio.toFixed(2)}:1` +
        `\n        建议改为 ${fix}（${contrast(fix, p.bg).toFixed(2)}:1，色相不变，只压明度）`,
    );
  }
  console.error(
    "    → 平台正文 12px、辅助标注 11px 都算 WCAG 小字，一律要 4.5:1。\n" +
      "      线上原值请保留在 design-tokens.js 的 live 字段里，不要直接丢弃。\n",
  );
}

const hardFailures =
  errors.length + tokenDrift.length + sizeDrift.length + contrastFails.length;
if (hardFailures > 0) {
  console.error(`UI 规范检查未通过：${hardFailures} 处硬性问题。\n`);
  process.exit(1);
}

const pass = `${scanned} 个文件，Token 两份一致，${declaredPairs.length} 组配色均达 AA`;
console.log(
  warns.length === 0
    ? `✓ UI 规范检查通过（${pass}，无待迁移项）`
    : `✓ UI 规范硬性检查通过（${pass}，${warns.length} 处待迁移）`,
);
