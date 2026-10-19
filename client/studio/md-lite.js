/**
 * 够用的 Markdown 渲染：审阅台里把一页手册原样摆出来。
 *
 * 不引库——仓库零运行时依赖，而这里只需要标题 / 段落 / 列表 / 表格 / 图片 / 强调。
 * 输出 HTML 前先转义全部文本，图片地址按知识库根改写到 dev 服务的媒体回源。
 *
 * 认识两样东西，用来把「待审」的地方就地标出来：
 *   事实标记 `<!--f 依据-->原文<!--/f-->`  渲染成 <mark>，待审的加 is-open
 *   图片                                    带 data-key，待审的加 is-open
 *
 * 以及蓝图：`<!--intent …-->` 渲染成一行「这一节要回答」，`<!--slot …-->` 渲染成待填的占位框
 * （带 data-slot 行号，点它去构成视图填）。发布时这两样会被剥掉，这里摆出来是给写的人看的。
 * Mermaid 代码块先出一个占位（data-mermaid），由调用方异步画成图——库很大，只在真有图时才加载。
 */
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const flat = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

/** 只允许普通链接协议；javascript: / data: / vbscript: 一律降级为 #。 */
function safeHref(href) {
  const value = String(href ?? "").trim();
  if (!value) return null;
  if (/^(?:https?:|mailto:|tel:)/i.test(value)) return value;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return null;
  return value;
}

/** 相对目标页的图片路径 → 相对 docs/kb/ 的路径 → 媒体回源 URL */
function resolveAsset(src, basePage) {
  if (/^(https?:)?\/\//.test(src) || src.startsWith("/__builder_studio/")) return src;
  const baseDir = basePage && basePage.includes("/") ? basePage.slice(0, basePage.lastIndexOf("/")) : "";
  const parts = (baseDir ? `${baseDir}/${src}` : src).split("/");
  const out = [];
  for (const p of parts) {
    if (p === "." || p === "") continue;
    if (p === "..") out.pop();
    else out.push(p);
  }
  return `/__builder_studio/media/${out.join("/")}`;
}

const MARK_OPEN = "\uE000";
const MARK_CLOSE = "\uE001";

const CODE_OPEN = "\uE002";
const CODE_CLOSE = "\uE003";

function inline(text, ctx) {
  // 行内代码先收起来：写作约定里用它举标记的例子，例子不该被当成真标记渲染
  const codes = [];
  let pre = String(text).replace(/`([^`\n]+)`/g, (_, c) => {
    codes.push(c);
    return `${CODE_OPEN}${codes.length - 1}${CODE_CLOSE}`;
  });
  // 事实标记抽成占位符：它是 HTML 注释，按普通文本转义就会原样露出来
  const facts = [];
  pre = pre.replace(/<!--f\s+([^>]+?)\s*-->([\s\S]*?)<!--\/f-->/g, (_, basis, body) => {
    facts.push({ basis: basis.trim(), body });
    return `${MARK_OPEN}${facts.length - 1}${MARK_CLOSE}`;
  });
  const restoreCode = (s) => s.replace(new RegExp(`${CODE_OPEN}(\\d+)${CODE_CLOSE}`, "g"), (_, i) => `<code>${esc(codes[Number(i)])}</code>`);
  let s = restoreCode(decorate(esc(pre), ctx));
  s = s.replace(new RegExp(`${MARK_OPEN}(\\d+)${MARK_CLOSE}`, "g"), (_, i) => {
    const f = facts[Number(i)];
    const open = ctx.openFacts?.has(`${f.basis}\u0001${flat(f.body)}`);
    return `<mark class="md-fact${open ? " is-open" : ""}" title="${esc(f.basis)}">${restoreCode(decorate(esc(f.body), ctx))}</mark>`;
  });
  return s;
}

function decorate(s, ctx) {
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) => {
    const key = src.match(/images\/(.+)\.png$/)?.[1] ?? src.match(/media\/(.+)\.(?:gif|mp4)$/)?.[1] ?? "";
    const open = key && ctx.openMedia?.has(key);
    const url = resolveAsset(src, ctx.basePage) + (ctx.bust ? `?v=${encodeURIComponent(ctx.bust)}` : "");
    return `<img alt="${alt}" src="${esc(url)}" data-key="${esc(key)}" class="${open ? "is-open" : ""}" loading="lazy" />`;
  });
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, href) => {
    const target = safeHref(href);
    return `<a href="${esc(target ?? "#")}" target="_blank" rel="noopener">${t}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  return s;
}

/**
 * @param opts.basePage   这一页相对 docs/kb 的路径，图片相对它解析
 * @param opts.openMedia  待审的图 / 录屏配方 key
 * @param opts.openFacts  待审的事实，`依据\u0001原文` 形式
 * @param opts.bust       拼到图片地址后面：重拍后地址不变，不加这个浏览器会一直显示旧图
 */
const SLOT_NAME = { shot: "截图", clip: "录屏", diagram: "流程图", table: "表格", 截图: "截图", 录屏: "录屏", 流程图: "流程图", 表格: "表格" };
const SLOT_KIND = { 截图: "shot", 录屏: "clip", 流程图: "diagram", 表格: "table" };

/**
 * @param opts.lineOffset 这段 md 在整篇文件里从第几行之后开始：格子的行号按整篇算
 */
export function renderMarkdown(md, opts = {}) {
  const ctx = { basePage: opts.basePage ?? "", openMedia: opts.openMedia, openFacts: opts.openFacts, bust: opts.bust };
  const lineOffset = opts.lineOffset ?? 0;
  const lines = String(md ?? "").replace(/\r\n/g, "\n").replace(/^---\n[\s\S]*?\n---\n/, "").split("\n");
  const out = [];
  let i = 0;
  let para = [];
  const flush = () => {
    if (para.length) out.push(`<p>${inline(para.join(" "), ctx)}</p>`);
    para = [];
  };

  while (i < lines.length) {
    const line = lines[i];

    if (/^```/.test(line)) {
      flush();
      const lang = line.slice(3).trim();
      const buf = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i += 1;
      const code = esc(buf.join("\n"));
      // 画不出来（语法错、库没装）时留着源码，不至于一片空白
      out.push(lang === "mermaid" ? `<figure class="md-mermaid" data-mermaid="${code}"><pre><code>${code}</code></pre></figure>` : `<pre><code>${code}</code></pre>`);
      continue;
    }
    const intent = line.match(/^\s*<!--intent\s+([\s\S]*?)\s*-->\s*$/);
    if (intent) {
      flush();
      out.push(`<p class="md-intent"><span>这一节要回答</span>${esc(intent[1])}</p>`);
      i += 1;
      continue;
    }
    const slot = line.match(/^\s*<!--slot\s+(\S+)(?:\s+@(\S+))?\s*([\s\S]*?)\s*-->\s*$/);
    if (slot && SLOT_NAME[slot[1]]) {
      flush();
      const kind = SLOT_KIND[slot[1]] ?? slot[1];
      out.push(
        `<div class="md-slot is-${kind}" data-slot="${i + 1 + lineOffset}" title="在「构成」里填这个格子">` +
          `<b>待填 · ${SLOT_NAME[slot[1]]}</b><span>${esc(slot[3])}</span>${slot[2] ? `<code>@${esc(slot[2])}</code>` : ""}</div>`,
      );
      i += 1;
      continue;
    }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flush();
      out.push(`<h${h[1].length} data-line="${i + 1}">${inline(h[2], ctx)}</h${h[1].length}>`);
      i += 1;
      continue;
    }
    if (/^\s*>\s?/.test(line)) {
      flush();
      const buf = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ""));
      out.push(`<blockquote>${renderMarkdown(buf.join("\n"), opts)}</blockquote>`);
      continue;
    }
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      flush();
      const ordered = /^\s*\d+\./.test(line);
      const buf = [];
      while (i < lines.length && (/^\s*[-*]\s+/.test(lines[i]) || /^\s*\d+\.\s+/.test(lines[i]))) {
        buf.push(lines[i++].replace(/^\s*([-*]|\d+\.)\s+/, ""));
      }
      const tag = ordered ? "ol" : "ul";
      out.push(`<${tag}>${buf.map((b) => `<li>${inline(b, ctx)}</li>`).join("")}</${tag}>`);
      continue;
    }
    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      flush();
      const cells = (l) => l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
      const head = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) rows.push(cells(lines[i++]));
      out.push(
        `<table><thead><tr>${head.map((c) => `<th>${inline(c, ctx)}</th>`).join("")}</tr></thead>` +
          `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c, ctx)}</td>`).join("")}</tr>`).join("")}</tbody></table>`,
      );
      continue;
    }
    if (/^\s*---+\s*$/.test(line)) {
      flush();
      out.push("<hr />");
      i += 1;
      continue;
    }
    if (line.trim() === "") {
      flush();
      i += 1;
      continue;
    }
    // 独占一行的图片单独成块，不裹进段落——预览里图要撑满宽
    if (/^\s*!\[[^\]]*\]\([^)]+\)\s*$/.test(line)) {
      flush();
      out.push(`<figure>${inline(line.trim(), ctx)}</figure>`);
      i += 1;
      continue;
    }
    para.push(line.trim());
    i += 1;
  }
  flush();
  return out.join("\n");
}

/**
 * 把容器里的 Mermaid 占位画成图。库按需加载；画过的跳过。
 * 亮暗跟着宿主 <html data-theme> 走：mermaid 的配色写死在生成的 svg 里，拿不到 CSS 变量。
 */
let mermaidLib = null;
let seq = 0;
export async function paintDiagrams(root) {
  const todo = [...(root?.querySelectorAll?.(".md-mermaid:not([data-painted])") ?? [])];
  if (!todo.length) return;
  try {
    mermaidLib ??= (await import("mermaid")).default;
  } catch {
    return;
  }
  const dark = document.documentElement.getAttribute("data-theme") === "dark";
  mermaidLib.initialize({ startOnLoad: false, theme: dark ? "dark" : "default", securityLevel: "strict" });
  for (const el of todo) {
    el.setAttribute("data-painted", "1");
    const id = `bk-mmd-${++seq}`;
    try {
      const { svg } = await mermaidLib.render(id, el.getAttribute("data-mermaid"));
      el.innerHTML = svg;
    } catch (e) {
      el.classList.add("is-broken");
      el.insertAdjacentHTML("afterbegin", `<figcaption>流程图画不出来：${esc(String(e?.message ?? e).split("\n")[0])}</figcaption>`);
      // 画失败时 mermaid 会把它的临时容器（id 前加 d）留在 body 上
      document.getElementById(`d${id}`)?.remove();
    }
  }
}
