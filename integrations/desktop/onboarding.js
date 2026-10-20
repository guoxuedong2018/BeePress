const $ = (id) => document.getElementById(id);
const overlay = $("overlay");
const overlayTitle = $("overlay-title");
const overlayDetail = $("overlay-detail");
const views = {
  home: $("home-view"),
  setup: $("setup-view"),
  project: $("project-view"),
};
const nameInput = $("project-name");
const parentPath = $("parent-path");
const styleUrl = $("style-url");

let parent = null;
let currentProject = null;
let selectedStack = "react-tailwind";
let selectedUi = "bee-press";
let lastAnalysis = null;
let currentStage = "requirements";
let activeTab = null;

const LAYOUT_KEY = "beepress.layout.v1";
const layout = {
  sidebar: 264,
  rightbar: 360,
  sidebarOpen: true,
  rightbarOpen: true,
};
try {
  Object.assign(layout, JSON.parse(localStorage.getItem(LAYOUT_KEY) || "{}"));
} catch {
  // A malformed preference falls back to the defaults above.
}

const clampWidth = (px, min, max) => Math.min(max, Math.max(min, Math.round(px)));

// Column solver and pointer-capture drag behavior adapted from
// @deepseek-ai/dsh-client-ui-layout (AppFrame / DragHandle).
function computeColumns(viewport, sidebar, rightbar, collapsedWidth = 0) {
  const s = sidebar === 0 ? collapsedWidth : clampWidth(sidebar, 264, 420);
  const available = viewport - s - 400;
  const r = rightbar === 0 || available < 300 ? 0 : Math.min(available, clampWidth(rightbar, 300, viewport * 0.7));
  return { sidebar: s, center: Math.max(0, viewport - s - r), rightbar: r };
}

function saveLayout() {
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
  } catch {
    // Layout persistence is best effort.
  }
}

function applyLayout() {
  const frame = $("app-frame");
  const app = $("app");
  const viewport = frame.clientWidth || window.innerWidth;
  const project = app.dataset.view === "project";
  const sidebarPreference = layout.sidebarOpen ? layout.sidebar : 0;
  const cols = computeColumns(viewport, sidebarPreference, layout.rightbarOpen && project ? layout.rightbar : 0);
  frame.style.setProperty("--sidebar-width", `${cols.sidebar}px`);
  frame.style.setProperty("--rightbar-width", `${cols.rightbar}px`);
  app.dataset.sidebarCollapsed = cols.sidebar === 0 ? "true" : "false";
  app.dataset.rightbarCollapsed = cols.rightbar === 0 ? "true" : "false";
  $("handle-sidebar").style.left = `${cols.sidebar}px`;
  $("handle-sidebar").style.display = cols.sidebar ? "" : "none";
  $("handle-rightbar").style.left = `${viewport - cols.rightbar}px`;
  $("handle-rightbar").style.display = cols.rightbar ? "" : "none";
  $("status-inspector").classList.toggle("active", cols.rightbar > 0);
  $("status-browser").classList.toggle("active", cols.rightbar > 0 && activeTab === "browser");
}

function bindColumnHandle(element, side) {
  let origin = 0;
  let base = 0;
  let latest = 0;
  let frame = null;
  let capture = null;
  const end = () => {
    if (capture === null) return;
    if (frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
    }
    if (element.hasPointerCapture(capture)) element.releasePointerCapture(capture);
    capture = null;
    $("app-frame").removeAttribute("data-dragging");
    applyLayout();
    saveLayout();
  };
  element.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || capture !== null) return;
    event.preventDefault();
    element.setPointerCapture(event.pointerId);
    capture = event.pointerId;
    origin = latest = event.clientX;
    base = side === "sidebar" ? layout.sidebar : layout.rightbar;
    $("app-frame").setAttribute("data-dragging", "");
  });
  element.addEventListener("pointermove", (event) => {
    if (capture !== event.pointerId) return;
    latest = event.clientX;
    frame ??= requestAnimationFrame(() => {
      frame = null;
      const dx = latest - origin;
      if (side === "sidebar") layout.sidebar = base + dx;
      else layout.rightbar = base - dx;
      applyLayout();
    });
  });
  element.addEventListener("pointerup", end);
  element.addEventListener("pointercancel", end);
  element.addEventListener("lostpointercapture", end);
}


const TAB_STORE_PREFIX = "beepress.tabs.v1:";
const tabTypes = new Map();
let openTabs = [];
let filePath = null;
let browserUrl = null;

function registerTabType(definition) {
  if (!definition?.kind || tabTypes.has(definition.kind)) throw new Error(`重复的标签类型：${definition?.kind || "unknown"}`);
  tabTypes.set(definition.kind, definition);
  return () => tabTypes.delete(definition.kind);
}

[
  { kind: "output", title: "运行", icon: "▣", description: "动作输出与每个阶段的历史", keepMounted: true, closable: true },
  { kind: "browser", title: "浏览器", icon: "◎", description: "在应用内打开本地原型或线上页面", keepMounted: true, closable: true },
  { kind: "files", title: "文件", icon: "▤", description: "浏览项目目录并预览文本文件", keepMounted: true, closable: true },
  { kind: "file", title: "文件预览", icon: "▤", description: "", guide: false, keepMounted: true, closable: true },
  { kind: "terminal", title: "终端", icon: ">_", description: "在项目目录启动交互式 shell", keepMounted: true, closable: true },
  { kind: "guide", title: "新标签页", icon: "+", description: "", guide: false, keepMounted: true, closable: true },
].forEach(registerTabType);

function tabStoreKey(root = currentProject?.root) {
  return root ? `${TAB_STORE_PREFIX}${root}` : null;
}

function saveTabs() {
  const key = tabStoreKey();
  if (!key) return;
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        tabs: openTabs.filter((tab) => tab.kind !== "guide").map((tab) => tab.kind),
        active: activeTab === "guide" ? null : activeTab,
        filePath,
        browserUrl,
      }),
    );
  } catch {
    // Tab persistence is best effort.
  }
}

function tabType(kind) {
  return tabTypes.get(kind);
}

function ensureTabPanel(kind) {
  let panel = document.querySelector(`[data-tab-panel="${CSS.escape(kind)}"]`);
  if (panel) return panel;
  const type = tabType(kind);
  if (!type?.render) return null;
  panel = document.createElement("section");
  panel.className = "tab-panel";
  panel.dataset.tabPanel = kind;
  panel.hidden = true;
  $("tab-body").append(panel);
  panel._cleanup = type.render(panel);
  return panel;
}

function updateTabTitle(kind, title) {
  const tab = openTabs.find((entry) => entry.kind === kind);
  if (!tab) return;
  tab.title = String(title || tabType(kind)?.title || kind).slice(0, 60);
  renderTabStrip();
  saveTabs();
}

function renderTabStrip() {
  $("tab-chips").innerHTML = openTabs
    .map(
      (tab) => `
        <div class="tab-chip${tab.kind === activeTab ? " active" : ""}" data-tab="${escapeHtml(tab.kind)}" role="tab" tabindex="0" aria-selected="${tab.kind === activeTab}">
          <span class="tab-icon" aria-hidden="true">${escapeHtml(tab.icon || tabType(tab.kind)?.icon || "•")}</span>
          <span class="tab-title">${escapeHtml(tab.title)}</span>
          <button type="button" class="tab-close" data-close="${escapeHtml(tab.kind)}" title="关闭标签页">×</button>
        </div>`,
    )
    .join("");
  const strip = $("tab-chips");
  const chip = strip.querySelector(".tab-chip.active");
  if (chip) {
    if (chip.offsetLeft < strip.scrollLeft) strip.scrollLeft = chip.offsetLeft;
    else if (chip.offsetLeft + chip.offsetWidth > strip.scrollLeft + strip.clientWidth) {
      strip.scrollLeft = chip.offsetLeft + chip.offsetWidth - strip.clientWidth;
    }
  }
}

function activateTab(kind) {
  const type = tabType(kind);
  if (!type || !openTabs.some((tab) => tab.kind === kind)) return;
  if (!ensureTabPanel(kind)) return;
  activeTab = kind;
  for (const panel of document.querySelectorAll("[data-tab-panel]")) panel.hidden = panel.dataset.tabPanel !== kind;
  layout.rightbarOpen = true;
  applyLayout();
  renderTabStrip();
  if (kind === "browser") requestAnimationFrame(updateBrowserNav);
  if (kind === "files") ensureFiles();
  if (kind === "file") renderFilePanel();
  if (kind === "terminal") {
    ensureTerminal();
    requestAnimationFrame(() => terminalFit());
  }
  if (kind === "guide") renderGuide();
  saveTabs();
}

function openTab(kind, options = {}) {
  const type = tabType(kind);
  if (!type) return null;
  if (options.replaceGuide) openTabs = openTabs.filter((entry) => entry.kind !== "guide");
  let tab = openTabs.find((entry) => entry.kind === kind);
  if (!tab) {
    tab = { kind, title: options.title || type.title, icon: type.icon };
    openTabs.push(tab);
  }
  if (kind === "file" && options.title) tab.title = options.title;
  if (options.activate === false) {
    renderTabStrip();
    saveTabs();
  } else {
    activateTab(kind);
  }
  return tab;
}

function openGuide() {
  if (!openTabs.some((tab) => tab.kind === "guide")) {
    openTabs.push({ kind: "guide", title: "新标签页", icon: "+" });
  }
  activeTab = "guide";
  for (const panel of document.querySelectorAll("[data-tab-panel]")) panel.hidden = panel.dataset.tabPanel !== "guide";
  layout.rightbarOpen = true;
  applyLayout();
  renderGuide();
  renderTabStrip();
}

function renderGuide() {
  const entries = [...tabTypes.values()].filter((type) => type.guide !== false && type.kind !== "file");
  $("guide-list").innerHTML = entries
    .map(
      (type) => `
        <button type="button" class="guide-entry" data-guide-kind="${escapeHtml(type.kind)}">
          <span class="guide-icon" aria-hidden="true">${escapeHtml(type.icon || "•")}</span>
          <span><strong>${escapeHtml(type.title)}</strong><small>${escapeHtml(type.description || "")}</small></span>
          <kbd>${openTabs.some((tab) => tab.kind === type.kind) ? "已打开" : ""}</kbd>
        </button>`,
    )
    .join("");
}

function closeTab(kind) {
  const index = openTabs.findIndex((tab) => tab.kind === kind);
  if (index < 0) return;
  if (kind === "terminal") disposeTerminal();
  const panel = document.querySelector(`[data-tab-panel="${CSS.escape(kind)}"]`);
  panel?._cleanup?.();
  if (panel && tabType(kind)?.render) panel.remove();
  openTabs.splice(index, 1);
  if (activeTab === kind) {
    const next = openTabs[index] || openTabs[index - 1];
    if (next) activateTab(next.kind);
    else openGuide();
  } else {
    renderTabStrip();
    saveTabs();
  }
}

function restoreTabs(root) {
  disposeTerminal();
  openTabs = [];
  activeTab = null;
  filePath = null;
  browserUrl = null;
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(tabStoreKey(root)) || "null");
  } catch {
    saved = null;
  }
  const kinds = Array.isArray(saved?.tabs) ? saved.tabs.filter((kind) => tabTypes.has(kind) && kind !== "guide") : null;
  const initial = kinds?.length ? kinds : ["output", "browser"];
  openTabs = initial.map((kind) => ({ kind, title: tabType(kind).title, icon: tabType(kind).icon }));
  filePath = saved?.filePath || null;
  browserUrl = saved?.browserUrl || null;
  renderTabStrip();
  const desired = openTabs.some((tab) => tab.kind === saved?.active) ? saved.active : openTabs[0]?.kind;
  if (desired) activateTab(desired);
  if (filePath) requestAnimationFrame(() => openFile(filePath, { activate: false }));
  if (browserUrl) requestAnimationFrame(() => showBrowser(browserUrl, { activate: false }));
}

window.beepressTabs = {
  register: registerTabType,
  open: openTab,
  close: closeTab,
  guide: openGuide,
  get active() { return activeTab; },
  list: () => openTabs.map((tab) => ({ ...tab })),
};


function setBusy(busy, title = "正在打开项目", detail = "启动 DeepSeek Harness…") {
  overlay.hidden = !busy;
  overlayTitle.textContent = title;
  overlayDetail.textContent = detail;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function setStep(step) {
  for (const node of document.querySelectorAll("[data-step]")) {
    node.classList.toggle("active", Number(node.dataset.step) === step);
  }
}

function showView(name, step) {
  for (const [key, node] of Object.entries(views)) node.hidden = key !== name;
  setStep(step);
  $("app").dataset.view = name;
  $("window-title").textContent = name === "project" ? currentProject?.name || "工作台" : name === "setup" ? "生产基线" : "项目";
  $("status-project").textContent = name === "project" ? `${currentProject?.name || "项目"} · 本地` : name === "setup" ? `${currentProject?.name || "项目"} · 基线` : "未打开项目";
  applyLayout();
  requestAnimationFrame(applyLayout);
}

function selectStage(name, { silent = false } = {}) {
  currentStage = name;
  for (const node of document.querySelectorAll("[data-stage]")) {
    if (node.tagName === "BUTTON") node.classList.toggle("active", node.dataset.stage === name);
  }
  for (const node of document.querySelectorAll("[data-stage-panel]")) {
    node.classList.toggle("active", node.dataset.stagePanel === name);
  }
  if (currentProject) {
    renderHistory();
    restoreStageOutput({ activate: !silent });
  }
}

function stageEntries(stage = currentStage) {
  const entries = currentProject?.stageHistory?.[stage];
  return Array.isArray(entries) ? entries : [];
}

function renderHistory() {
  const entries = stageEntries();
  $("history-count").textContent = entries.length ? String(entries.length) : "";
  if (!entries.length) {
    $("history-list").innerHTML = '<p class="history-empty">这个阶段还没有运行记录。</p>';
    return;
  }
  $("history-list").innerHTML = entries
    .map((entry, index) => {
      const time = new Date(entry.at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
      return `
        <button type="button" class="history-item" data-history-index="${index}" data-ok="${entry.ok ? "true" : "false"}" title="${escapeHtml(entry.title || "")}">
          <time>${time}</time>
          <strong>${escapeHtml(entry.title || entry.action || "运行")}</strong>
          <span>${entry.ok ? "完成" : "失败"}</span>
        </button>`;
    })
    .join("");
}

function restoreStageOutput({ activate = true } = {}) {
  const latest = stageEntries()[0];
  if (latest) showOutput(latest.text, latest.ok ? "完成" : "失败", { activate });
  else resetOutput();
}

function selectInspectorTab(name) {
  for (const node of document.querySelectorAll("[data-inspector-tab]")) node.classList.toggle("active", node.dataset.inspectorTab === name);
  $("output-view").hidden = name !== "output";
  $("history-panel").hidden = name !== "history";
}

function showHome() {
  saveTabs();
  disposeTerminal();
  openTabs = [];
  activeTab = null;
  currentProject = null;
  currentStage = "requirements";
  lastAnalysis = null;
  for (const button of document.querySelectorAll("#recent-list [data-root]")) button.classList.remove("active");
  selectInspectorTab("output");
  showView("home", 1);
  window.beepress?.recent?.().then(renderRecent).catch(() => {});
}

function showOutput(text, state = "完成", { activate = true } = {}) {
  if (currentProject && activate) openTab("output");
  const output = $("stage-output");
  output.hidden = false;
  output.textContent = String(text ?? "").trim() || "完成。";
  output.scrollTop = 0;
  $("output-empty").hidden = true;
  $("output-state").textContent = state;
  selectInspectorTab("output");
  if (!layout.rightbarOpen) {
    layout.rightbarOpen = true;
    applyLayout();
    saveLayout();
  }
}

function resetOutput() {
  $("stage-output").hidden = true;
  $("stage-output").textContent = "";
  $("output-empty").hidden = false;
  $("output-state").textContent = "就绪";
}

function formatContent(result) {
  if (!result.ok) return result.output || "读取失败。";
  const data = result.data;
  if (!data) return result.output || "没有可读的内容状态。";
  const s = data.summary || {};
  return [
    `内容页：${s.pages ?? 0}，待审：${s.review ?? 0}，未确认引用：${s.refsOpen ?? 0}`,
    `待重拍：${s.reshoot ?? 0}，待撰写：${s.backlog ?? 0}，未覆盖需求：${s.uncovered ?? 0}`,
    `事实引用：${s.facts ?? 0}，人工记录：${s.unverified ?? 0}`,
  ].join("\n");
}

const stackLabels = {
  "react-tailwind": "React + Tailwind",
  react: "React",
  vue2: "Vue 2.7",
  existing: "沿用项目现状",
};
const uiLabels = {
  "bee-press": "Bee Press UI Spec",
  existing: "沿用现有产品",
  url: "对齐线上页面",
};

const actionStages = {
  "create-feature": "requirements",
  "check-frs": "requirements",
  "install-deps": "prototype",
  "start-prototype": "prototype",
  "open-review": "review",
  "review-status": "review",
  "content-status": "content",
  "capture-media": "content",
  "record-clips": "content",
  "save-gateway": "publish",
  "publish-plan": "publish",
};
const actionLabels = {
  "create-feature": "新建 FRS 件套",
  "check-frs": "检查 FRS",
  "install-deps": "安装依赖",
  "start-prototype": "启动原型",
  "open-review": "打开评审页",
  "review-status": "查看待处理批注",
  "content-status": "检查内容锁",
  "capture-media": "重拍过期截图",
  "record-clips": "重建录屏",
  "save-gateway": "保存发布目标",
  "publish-plan": "生成发布计划",
};

async function persistRun(stage, action, text, ok) {
  if (!currentProject || !window.beepress?.recordRun) return;
  try {
    currentProject.stageHistory = await window.beepress.recordRun({
      root: currentProject.root,
      stage,
      action,
      title: actionLabels[action] || action,
      text,
      ok,
    });
    if (stage === currentStage) renderHistory();
  } catch (error) {
    console.error(error);
  }
}

function mapDetectedStack(project) {
  if (!project.stack) return "existing";
  if (project.stack.id === "vue") return "vue2";
  if (project.stack.frameworks?.includes("Tailwind")) return "react-tailwind";
  if (project.stack.id === "react") return "react";
  return "existing";
}

function showSetup(project) {
  currentProject = project;
  lastAnalysis = project.setup?.analysis ?? null;
  selectedStack = project.setup?.stack || mapDetectedStack(project);
  selectedUi = project.setup?.uiPreset || "bee-press";
  showView("setup", 2);
  $("setup-project").textContent = `${project.name} · ${project.root}`;
  $("detected-stack").textContent = project.stack?.label ? `检测到：${project.stack.label}` : "";
  $("style-url").value = project.setup?.sourceUrl || "";
  for (const button of document.querySelectorAll("[data-stack]")) {
    button.classList.toggle("selected", button.dataset.stack === selectedStack);
  }
  for (const button of document.querySelectorAll("[data-ui]")) {
    button.classList.toggle("selected", button.dataset.ui === selectedUi);
  }
  if (lastAnalysis) renderAnalysis(lastAnalysis);
  else $("url-analysis").hidden = true;
}

function renderAnalysis(analysis) {
  lastAnalysis = analysis;
  const box = $("url-analysis");
  box.hidden = false;
  box.textContent = [
    `页面：${analysis.title}  ${analysis.url}`,
    `技术栈：${analysis.frameworks?.join(" + ") || "未识别"}`,
    analysis.ui?.colors?.length ? `颜色：${analysis.ui.colors.join("  ")}` : "",
    analysis.ui?.fonts?.length ? `字体：${analysis.ui.fonts.join("  ")}` : "",
    analysis.evidence?.length ? `证据：${analysis.evidence.join(" | ")}` : "",
  ].filter(Boolean).join("\n");
}

function renderHub(project) {
  currentProject = project;
  showView("project", 3);
  for (const button of document.querySelectorAll("#recent-list [data-root]")) {
    button.classList.toggle("active", button.dataset.root === project.root);
  }
  $("project-title").textContent = project.name || "项目";
  $("project-path").textContent = project.root;
  $("project-baseline").textContent = [
    project.setup?.stack
      ? `技术栈：${stackLabels[project.setup.stack] || project.setup.stack}`
      : project.stack?.label
        ? `技术栈：${project.stack.label}`
        : "",
    project.setup?.uiPreset ? `UI：${uiLabels[project.setup.uiPreset] || project.setup.uiPreset}` : "",
    project.setup?.sourceUrl ? `对齐网页：${project.setup.sourceUrl}` : "",
  ].filter(Boolean).join(" · ");
  resetOutput();
  $("publish-gateway").value = project.publish?.destination || "";
  $("status-requirements").textContent = `${project.features?.length ?? 0} FRS`;
  $("status-prototype").textContent = project.devScript ? project.devScript : "未配置";
  $("status-review").textContent = `${project.openReviews ?? 0} 待处理`;
  $("status-content").textContent = `${project.kbPages ?? 0} 页`;
  $("status-publish").textContent = project.publish?.configured
    ? `${project.publish.publishedPages ?? 0} 已发`
    : "未配置";
  selectStage("requirements", { silent: true });
  $("project-note").textContent = project.templates
    ? "核心工具直接在这里使用；Agent 工作区只是其中一种入口，不是 Bee Press 本身。"
    : "项目还缺少 Bee Press 脚手架；进入 Agent 工作区后可以运行 npx beepress init 补齐。";
  restoreTabs(project.root);
}

async function inspect(root, { skipSetup = false } = {}) {
  setBusy(true, "正在读取项目", "检查技术栈、需求、知识库、评审和原型配置…");
  try {
    const project = await window.beepress.inspect(root);
    setBusy(false);
    if (!skipSetup && !project.setup?.stack) showSetup(project);
    else renderHub(project);
  } catch (error) {
    setBusy(false);
    alert(error instanceof Error ? error.message : String(error));
  }
}

function renderRecent(config) {
  const list = $("recent-list");
  const recent = Array.isArray(config.recent) ? config.recent : [];
  $("recent-count").textContent = recent.length ? String(recent.length) : "";
  if (!recent.length) {
    list.innerHTML = '<p class="empty">还没有最近项目。</p>';
    return;
  }
  list.innerHTML = recent
    .map(
      (item) => `
        <button type="button" class="recent-item" data-root="${escapeHtml(item.root)}">
          <span class="recent-name">${escapeHtml(item.name || item.root)}</span>
          <span class="recent-path">${escapeHtml(item.root)}</span>
        </button>`,
    )
    .join("");
  for (const button of list.querySelectorAll("[data-root]")) {
    button.addEventListener("click", () => inspect(button.dataset.root));
  }
}

async function start(root) {
  setBusy(true);
  try {
    await window.beepress.start(root);
  } catch (error) {
    setBusy(false);
    console.error(error);
  }
}

async function runAgentScan() {
  const command = $("agent-command").value.trim();
  if (!command) {
    alert("先写一句要 Agent 找什么。");
    return;
  }
  const root = await window.beepress.chooseScanRoot();
  if (!root) return;
  setBusy(true, "Agent 正在搜索本地项目", "只读取你授权的目录，不移动、不上传代码…");
  try {
    const result = await window.beepress.scanProjects(root);
    setBusy(false);
    const box = $("scan-results");
    if (!result.projects?.length) {
      box.innerHTML = '<p class="empty">这个目录下没有找到 package.json 项目。</p>';
      return;
    }
    box.innerHTML = result.projects
      .slice(0, 12)
      .map(
        (project) => `
          <button type="button" class="scan-item" data-root="${escapeHtml(project.root)}">
            <span class="scan-name">${escapeHtml(project.name)} · ${escapeHtml(project.stack?.label || "未识别")}</span>
            <span class="scan-path">${escapeHtml(project.root)}</span>
          </button>`,
      )
      .join("");
    for (const button of box.querySelectorAll("[data-root]")) {
      button.addEventListener("click", () => inspect(button.dataset.root));
    }
  } catch (error) {
    setBusy(false);
    $("scan-results").innerHTML = `<p class="empty">${escapeHtml(error instanceof Error ? error.message : String(error))}</p>`;
  }
}

async function action(name) {
  if (!currentProject) return;
  const root = currentProject.root;
  const stage = actionStages[name] || currentStage;
  const record = (text, ok = true) => {
    showOutput(text, ok ? "完成" : "失败");
    persistRun(stage, name, text, ok);
  };
  showOutput("执行中…", "运行中");
  try {
    if (name === "create-feature") {
      const title = $("feature-title").value.trim();
      const result = await window.beepress.createFeature({ root, title });
      record(`已创建需求件套：\n${result.relativePath}\n\n下一步：\n${result.checkCommand}`);
      $("feature-title").value = "";
      currentProject.features = [...(currentProject.features || []), result.key].sort();
      $("status-requirements").textContent = `${currentProject.features.length} FRS`;
      return;
    }
    if (name === "check-frs") {
      const result = await window.beepress.checkFrs(root);
      record(result.output || (result.ok ? "FRS 校验通过。" : "FRS 校验失败。"), result.ok);
      return;
    }
    if (name === "install-deps") {
      setBusy(true, "正在安装依赖", "在项目目录执行 npm install…");
      const result = await window.beepress.installDependencies(root);
      setBusy(false);
      record(result.output || (result.ok ? "依赖安装完成。" : "依赖安装失败。"), result.ok);
      return;
    }
    if (name === "start-prototype") {
      const result = await window.beepress.startPrototype(root);
      record(result.ok ? `原型已启动：${result.url}\n${result.reused ? "（复用已运行的 dev server）" : ""}` : result.error, result.ok);
      if (result.ok) showBrowser(result.url);
      return;
    }
    if (name === "open-review") {
      const result = await window.beepress.openReview(root);
      record(result.ok ? `评审页已打开：${result.url}\n在页面上按住 ⌘/Ctrl 或点击评论按钮开始圈选。` : result.error, result.ok);
      if (result.ok) showBrowser(result.url);
      return;
    }
    if (name === "review-status") {
      const result = await window.beepress.reviewStatus(root);
      record(result.output || "没有待处理批注。", result.ok !== false);
      return;
    }
    if (name === "content-status") {
      const result = await window.beepress.contentStatus(root);
      record(formatContent(result), result.ok !== false);
      return;
    }
    if (name === "capture-media") {
      setBusy(true, "正在重建截图", "先启动原型，再按配方抓取过期截图…");
      const result = await window.beepress.captureMedia(root);
      setBusy(false);
      record(result.output || (result.ok ? "截图完成。" : "截图失败。"), result.ok);
      if (result.prototypeUrl) showBrowser(result.prototypeUrl);
      return;
    }
    if (name === "record-clips") {
      setBusy(true, "正在重建录屏", "先启动原型，再按 clips 配方录制 MP4/GIF…");
      const result = await window.beepress.recordClips(root);
      setBusy(false);
      record(result.output || (result.ok ? "录屏完成。" : "录屏失败。"), result.ok);
      if (result.prototypeUrl) showBrowser(result.prototypeUrl);
      return;
    }
    if (name === "save-gateway") {
      const gateway = $("publish-gateway").value.trim();
      const project = await window.beepress.savePublishGateway({ root, gateway });
      currentProject = project;
      $("status-publish").textContent = project.publish?.configured
        ? `${project.publish.publishedPages ?? 0} 已发`
        : "未配置";
      record(gateway ? `已保存发布目标：${gateway}` : "已清除发布目标。");
      return;
    }
    if (name === "publish-plan") {
      setBusy(true, "正在生成发布计划", "运行 kb-publish --dry-run…");
      const result = await window.beepress.publishPlan(root);
      setBusy(false);
      record(result.output || (result.ok ? "发布计划完成。" : "发布计划失败。"), result.ok);
      return;
    }
    record(`未知操作：${name}`, false);
  } catch (error) {
    setBusy(false);
    record(error instanceof Error ? error.message : String(error), false);
  }
}

function switchIntake(name) {
  for (const node of document.querySelectorAll("[data-intake]")) node.classList.toggle("active", node.dataset.intake === name);
  for (const pane of document.querySelectorAll("[data-pane]")) pane.hidden = pane.dataset.pane !== name;
}

for (const tab of document.querySelectorAll("[data-intake]")) {
  tab.addEventListener("click", () => switchIntake(tab.dataset.intake));
}

function goHomeIntake(name) {
  showHome();
  switchIntake(name);
}

function openExistingProject() {
  goHomeIntake("drop");
  $("dropzone").click();
}

$("import-shortcut").addEventListener("click", openExistingProject);
$("scan-shortcut").addEventListener("click", () => goHomeIntake("agent"));
$("new-project-shortcut").addEventListener("click", () => {
  goHomeIntake("new");
  nameInput.focus();
});
$("output-clear").addEventListener("click", resetOutput);

for (const tab of document.querySelectorAll("[data-inspector-tab]")) {
  tab.addEventListener("click", () => selectInspectorTab(tab.dataset.inspectorTab));
}

$("history-list").addEventListener("click", (event) => {
  const button = event.target.closest("[data-history-index]");
  if (!button) return;
  const entry = stageEntries()[Number(button.dataset.historyIndex)];
  if (!entry) return;
  showOutput(entry.text, entry.ok ? "完成" : "失败");
  selectInspectorTab("output");
});

function toggleSidebar() {
  layout.sidebarOpen = !layout.sidebarOpen;
  applyLayout();
  saveLayout();
}

function toggleInspector() {
  if (!layout.rightbarOpen) {
    layout.rightbarOpen = true;
    if (!activeTab) openTab("output");
  } else {
    layout.rightbarOpen = false;
  }
  applyLayout();
  saveLayout();
}

function toggleBrowser() {
  if (!layout.rightbarOpen || activeTab !== "browser") {
    layout.rightbarOpen = true;
    openTab("browser");
    applyLayout();
    saveLayout();
  } else {
    layout.rightbarOpen = false;
    applyLayout();
    saveLayout();
  }
}

$("status-inspector").addEventListener("click", toggleInspector);
$("status-browser").addEventListener("click", toggleBrowser);

const previewWebview = $("preview-webview");

function normalizeBrowserUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i.test(raw)) return `http://${raw}`;
  return `https://${raw}`;
}

function updateBrowserNav() {
  try {
    $("browser-back").disabled = !previewWebview.canGoBack();
    $("browser-forward").disabled = !previewWebview.canGoForward();
    const current = previewWebview.getURL();
    if (current) $("browser-url").value = current;
  } catch {
    // The webview may not be attached yet.
  }
}

function showBrowser(url, { activate = true } = {}) {
  const target = normalizeBrowserUrl(url);
  if (!target) return;
  const cols = computeColumns($("app-frame").clientWidth || window.innerWidth, layout.sidebarOpen ? layout.sidebar : 0, layout.rightbar);
  if (cols.rightbar === 0 && activate) {
    window.beepress?.openExternal?.(target).catch(() => {});
    return;
  }
  layout.rightbarOpen = true;
  browserUrl = target;
  openTab("browser", { activate });
  applyLayout();
  $("browser-empty").hidden = true;
  $("browser-url").value = target;
  previewWebview.dataset.active = "true";
  let hasPage = false;
  try {
    hasPage = Boolean(previewWebview.getURL());
  } catch {
    // The webview has not attached yet.
  }
  try {
    if (hasPage) previewWebview.loadURL(target);
    else previewWebview.src = target;
  } catch {
    previewWebview.src = target;
  }
  requestAnimationFrame(updateBrowserNav);
}

$("browser-go").addEventListener("click", () => showBrowser($("browser-url").value));
$("browser-url").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    showBrowser($("browser-url").value);
  }
});
$("browser-back").addEventListener("click", () => {
  try { previewWebview.canGoBack() && previewWebview.goBack(); } catch { /* not attached */ }
});
$("browser-forward").addEventListener("click", () => {
  try { previewWebview.canGoForward() && previewWebview.goForward(); } catch { /* not attached */ }
});
$("browser-reload").addEventListener("click", () => {
  try { previewWebview.reload(); } catch { /* not attached */ }
});
$("browser-external").addEventListener("click", async () => {
  const current = $("browser-url").value.trim();
  if (current) await window.beepress.openExternal(normalizeBrowserUrl(current));
});

previewWebview.addEventListener("did-navigate", (event) => {
  $("browser-url").value = event.url;
  browserUrl = event.url;
  saveTabs();
  updateBrowserNav();
});
previewWebview.addEventListener("did-navigate-in-page", (event) => {
  $("browser-url").value = event.url;
  browserUrl = event.url;
  saveTabs();
  updateBrowserNav();
});
previewWebview.addEventListener("page-title-updated", (event) => {
  if (event.title) updateTabTitle("browser", event.title);
});
previewWebview.addEventListener("dom-ready", () => {
  $("browser-empty").hidden = true;
  updateBrowserNav();
});
previewWebview.addEventListener("did-fail-load", (event) => {
  if (event.errorCode === -3) return;
  $("browser-empty").hidden = false;
  $("browser-empty").innerHTML = `<strong>页面没有加载</strong><span>${escapeHtml(event.errorDescription || "未知错误")}</span>`;
});

$("tab-chips").addEventListener("click", (event) => {
  const close = event.target.closest("[data-close]");
  if (close) {
    event.stopPropagation();
    closeTab(close.dataset.close);
    return;
  }
  const chip = event.target.closest("[data-tab]");
  if (chip) activateTab(chip.dataset.tab);
});
$("tab-chips").addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const chip = event.target.closest("[data-tab]");
  if (!chip) return;
  event.preventDefault();
  activateTab(chip.dataset.tab);
});
$("tab-add").addEventListener("click", openGuide);
$("tab-collapse").addEventListener("click", () => {
  layout.rightbarOpen = false;
  applyLayout();
  saveLayout();
});
$("guide-list").addEventListener("click", (event) => {
  const entry = event.target.closest("[data-guide-kind]");
  if (!entry) return;
  openTab(entry.dataset.guideKind, { replaceGuide: true });
});

let fileTreeRoot = null;
let fileTreeLoaded = new Set();
let fileContent = "";
let fileMessage = "";

async function loadDirectory(relative, container, depth) {
  container.innerHTML = '<p class="file-empty">读取中…</p>';
  try {
    const entries = await window.beepress.listDirectory({ root: currentProject.root, path: relative });
    container.innerHTML = "";
    if (!entries.length) {
      container.innerHTML = '<p class="file-empty">空目录</p>';
      return;
    }
    for (const entry of entries) {
      const indent = 5 + depth * 13;
      const row = document.createElement("button");
      row.type = "button";
      row.className = `file-row ${entry.type === "directory" ? "directory" : ""}`;
      row.style.paddingLeft = `${indent}px`;
      row.dataset.file = entry.type === "file" ? entry.path : "";
      row.dataset.dir = entry.type === "directory" ? entry.path : "";
      row.disabled = entry.type === "other";
      row.innerHTML = `<span class="file-glyph">${entry.type === "directory" ? "▸" : "·"}</span><span class="file-name">${escapeHtml(entry.name)}</span>`;
      container.append(row);
      if (entry.type === "directory") {
        const children = document.createElement("div");
        children.dataset.children = entry.path;
        children.hidden = true;
        children.style.marginLeft = `${indent + 8}px`;
        container.append(children);
      }
    }
  } catch (error) {
    container.innerHTML = `<p class="file-empty">${escapeHtml(error instanceof Error ? error.message : String(error))}</p>`;
  }
}

async function ensureFiles() {
  if (!currentProject) return;
  $("files-root").textContent = currentProject.root;
  $("files-root").title = currentProject.root;
  if (fileTreeRoot === currentProject.root) return;
  fileTreeRoot = currentProject.root;
  fileTreeLoaded = new Set();
  await loadDirectory("", $("file-tree"), 0);
}

$("files-refresh").addEventListener("click", () => {
  fileTreeRoot = null;
  ensureFiles();
});

$("file-tree").addEventListener("click", async (event) => {
  const row = event.target.closest(".file-row");
  if (!row) return;
  if (row.dataset.dir) {
    const children = $("file-tree").querySelector(`[data-children="${CSS.escape(row.dataset.dir)}"]`);
    if (!children) return;
    if (!fileTreeLoaded.has(row.dataset.dir)) {
      fileTreeLoaded.add(row.dataset.dir);
      await loadDirectory(row.dataset.dir, children, row.style.paddingLeft ? Math.max(1, Math.round((parseInt(row.style.paddingLeft, 10) - 5) / 13) + 1) : 1);
    }
    children.hidden = !children.hidden;
    row.querySelector(".file-glyph").textContent = children.hidden ? "▸" : "▾";
    return;
  }
  if (row.dataset.file) openFile(row.dataset.file);
});

function renderFilePanel() {
  $("file-path").textContent = filePath || "";
  $("file-path").title = filePath || "";
  $("file-content").textContent = fileContent || fileMessage || "选择一个文件预览。";
}

async function openFile(relative, { activate = true } = {}) {
  if (!currentProject) return;
  filePath = relative;
  const title = String(relative).split("/").pop() || relative;
  openTab("file", { title, activate });
  if (!activate) renderTabStrip();
  fileContent = "";
  fileMessage = "读取中…";
  renderFilePanel();
  try {
    const result = await window.beepress.readFile({ root: currentProject.root, path: relative });
    if (result.ok) {
      fileContent = result.content;
      fileMessage = "";
    } else {
      fileContent = "";
      fileMessage = result.message || "无法预览。";
    }
  } catch (error) {
    fileContent = "";
    fileMessage = error instanceof Error ? error.message : String(error);
  }
  renderFilePanel();
  updateTabTitle("file", title);
  saveTabs();
}

let terminal = null;
let terminalUnsubs = [];
let terminalResizeObserver = null;

function terminalFit() {
  if (!terminal || !$("terminal-panel").hidden) {
    try { terminal?.fit.fit(); } catch { /* hidden or detached */ }
  }
}

async function ensureTerminal() {
  if (terminal || !currentProject) return;
  if (!window.Terminal || !window.FitAddon?.FitAddon) {
    $("terminal-status").textContent = "xterm.js 未加载。";
    return;
  }
  const host = $("terminal-host");
  const term = new window.Terminal({
    fontFamily: '"SFMono-Regular", "SF Mono", Menlo, monospace',
    fontSize: 11,
    lineHeight: 1.3,
    cursorBlink: true,
    allowProposedApi: true,
    theme: {
      background: "#1b1e1b",
      foreground: "#edf1ed",
      cursor: "#7fb39b",
      selectionBackground: "#3b5c4e",
    },
  });
  const fit = new window.FitAddon.FitAddon();
  term.loadAddon(fit);
  term.open(host);
  const dims = fit.proposeDimensions() || { cols: 80, rows: 24 };
  try {
    const created = await window.beepress.createTerminal({ cwd: currentProject.root, cols: dims.cols, rows: dims.rows });
    terminal = { id: created.id, term, fit };
    $("terminal-status").textContent = `${created.shell} · ${currentProject.root}`;
    term.onData((data) => window.beepress.writeTerminal(created.id, data));
    term.onResize(({ cols, rows }) => window.beepress.resizeTerminal(created.id, cols, rows));
    terminalUnsubs.push(window.beepress.onTerminalData(({ id, data }) => {
      if (terminal?.id === id) term.write(data);
    }));
    terminalUnsubs.push(window.beepress.onTerminalExit(({ id, exitCode }) => {
      if (terminal?.id === id) $("terminal-status").textContent = `进程已退出（${exitCode}）`;
    }));
    terminalResizeObserver = new ResizeObserver(() => terminalFit());
    terminalResizeObserver.observe(host);
    requestAnimationFrame(() => {
      terminalFit();
      term.focus();
    });
  } catch (error) {
    $("terminal-status").textContent = error instanceof Error ? error.message : String(error);
    term.dispose();
  }
}

function disposeTerminal() {
  for (const unsubscribe of terminalUnsubs) unsubscribe();
  terminalUnsubs = [];
  terminalResizeObserver?.disconnect();
  terminalResizeObserver = null;
  if (!terminal) return;
  const { id, term } = terminal;
  terminal = null;
  try { term.dispose(); } catch { /* already disposed */ }
  $("terminal-host").innerHTML = "";
  $("terminal-status").textContent = "终端会在项目目录启动";
  window.beepress?.disposeTerminal?.(id).catch(() => {});
}


bindColumnHandle($("handle-sidebar"), "sidebar");
bindColumnHandle($("handle-rightbar"), "rightbar");
const frameObserver = new ResizeObserver(() => requestAnimationFrame(applyLayout));
frameObserver.observe($("app-frame"));

window.beepress?.onMenu?.((command) => {
  if (command === "import-project") openExistingProject();
  else if (command === "new-project") {
    goHomeIntake("new");
    nameInput.focus();
  } else if (command === "command-palette") openPalette();
  else if (command === "toggle-sidebar") toggleSidebar();
  else if (command === "toggle-inspector") toggleInspector();
  else if (command === "toggle-browser") toggleBrowser();
  else if (command === "tab-output" && currentProject) openTab("output");
  else if (command === "tab-browser" && currentProject) openTab("browser");
  else if (command === "tab-files" && currentProject) openTab("files");
  else if (command === "tab-terminal" && currentProject) openTab("terminal");
});

for (const nav of document.querySelectorAll("[data-stage]")) {
  if (nav.tagName !== "BUTTON") continue;
  nav.addEventListener("click", () => selectStage(nav.dataset.stage));
}

$("dropzone").addEventListener("click", async () => {
  try {
    const root = await window.beepress.chooseExisting();
    if (root) await inspect(root);
  } catch (error) {
    alert(error instanceof Error ? error.message : String(error));
  }
});
$("dropzone").addEventListener("dragover", (event) => {
  event.preventDefault();
  $("dropzone").classList.add("dragging");
});
$("dropzone").addEventListener("dragleave", () => $("dropzone").classList.remove("dragging"));
$("dropzone").addEventListener("drop", async (event) => {
  event.preventDefault();
  $("dropzone").classList.remove("dragging");
  const file = event.dataTransfer.files?.[0];
  if (!file) return;
  try {
    const filePath = window.beepress.pathForFile(file);
    if (!filePath) throw new Error("无法读取拖入的路径，请改用目录选择。");
    $("drop-hint").textContent = filePath;
    await inspect(filePath);
  } catch (error) {
    alert(error instanceof Error ? error.message : String(error));
  }
});

$("run-agent").addEventListener("click", runAgentScan);
$("import-existing").addEventListener("click", (event) => {
  event.stopPropagation();
  $("dropzone").click();
});

$("choose-parent").addEventListener("click", async () => {
  const selected = await window.beepress.chooseParent();
  if (!selected) return;
  parent = selected;
  parentPath.textContent = selected;
  parentPath.title = selected;
});

$("create-project").addEventListener("click", async () => {
  if (!parent) {
    alert("先选择项目所在目录。");
    return;
  }
  if (!nameInput.value.trim()) {
    alert("先填项目名。");
    nameInput.focus();
    return;
  }
  setBusy(true, "正在创建项目", "复制 FRS 模板、知识库、Agent Skills 和 React starter…");
  try {
    const root = await window.beepress.createProject({ parent, name: nameInput.value.trim() });
    setBusy(false);
    await inspect(root);
  } catch (error) {
    setBusy(false);
    alert(error instanceof Error ? error.message : String(error));
  }
});

for (const button of document.querySelectorAll("[data-stack]")) {
  button.addEventListener("click", () => {
    selectedStack = button.dataset.stack;
    for (const node of document.querySelectorAll("[data-stack]")) node.classList.toggle("selected", node === button);
  });
}
for (const button of document.querySelectorAll("[data-ui]")) {
  button.addEventListener("click", () => {
    selectedUi = button.dataset.ui;
    for (const node of document.querySelectorAll("[data-ui]")) node.classList.toggle("selected", node === button);
    if (selectedUi === "url") styleUrl.focus();
  });
}

$("analyze-url").addEventListener("click", async () => {
  const url = styleUrl.value.trim();
  if (!url) {
    alert("先填写要分析的网页地址。");
    return;
  }
  setBusy(true, "正在分析网页", "读取页面结构、框架痕迹和样式 token…");
  try {
    const analysis = await window.beepress.analyzeUrl(url);
    setBusy(false);
    renderAnalysis(analysis);
    selectedUi = "url";
    for (const node of document.querySelectorAll("[data-ui]")) node.classList.toggle("selected", node.dataset.ui === "url");
    if (analysis.stack?.id === "vue") {
      selectedStack = "vue2";
    } else if (analysis.stack?.id === "react") {
      selectedStack = analysis.ui?.hasTailwind ? "react-tailwind" : "react";
    }
    for (const node of document.querySelectorAll("[data-stack]")) node.classList.toggle("selected", node.dataset.stack === selectedStack);
  } catch (error) {
    setBusy(false);
    $("url-analysis").hidden = false;
    $("url-analysis").textContent = error instanceof Error ? error.message : String(error);
  }
});

$("save-setup").addEventListener("click", async () => {
  if (!currentProject) return;
  if (selectedUi === "url" && !lastAnalysis) {
    alert("先分析一个网页，或选择其他 UI 基线。");
    return;
  }
  setBusy(true, "正在保存生产基线", "写入 .beepress/desktop.json…");
  try {
    const project = await window.beepress.saveSetup({
      root: currentProject.root,
      stack: selectedStack,
      uiPreset: selectedUi,
      sourceUrl: styleUrl.value.trim() || null,
      analysis: lastAnalysis,
    });
    setBusy(false);
    renderHub(project);
  } catch (error) {
    setBusy(false);
    alert(error instanceof Error ? error.message : String(error));
  }
});

$("setup-back").addEventListener("click", showHome);
$("setup-cancel").addEventListener("click", showHome);
$("back-to-launcher").addEventListener("click", showHome);
$("switch-project").addEventListener("click", showHome);
$("reconfigure").addEventListener("click", () => currentProject && showSetup(currentProject));

projectViewClick();
function projectViewClick() {
  views.project.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (button) action(button.dataset.action);
  });
}

$("feature-title").addEventListener("keydown", (event) => {
  if (event.key === "Enter") action("create-feature");
});

$("enter-project").addEventListener("click", () => {
  if (currentProject) start(currentProject.root);
});

const paletteCommands = [
  { label: "导入已有项目", hint: "⌘O", run: openExistingProject },
  { label: "让 Agent 搜索本地项目", hint: "⌘⇧F", run: () => goHomeIntake("agent") },
  { label: "新建项目", hint: "⌘N", run: () => { goHomeIntake("new"); nameInput.focus(); } },
  { label: "转到需求规格", hint: "生产线", when: () => Boolean(currentProject), run: () => selectStage("requirements") },
  { label: "转到原型", hint: "生产线", when: () => Boolean(currentProject), run: () => selectStage("prototype") },
  { label: "转到原型评审", hint: "生产线", when: () => Boolean(currentProject), run: () => selectStage("review") },
  { label: "转到内容工作台", hint: "生产线", when: () => Boolean(currentProject), run: () => selectStage("content") },
  { label: "转到发布", hint: "生产线", when: () => Boolean(currentProject), run: () => selectStage("publish") },
  { label: "重新配置生产基线", hint: "设置", when: () => Boolean(currentProject), run: () => showSetup(currentProject) },
  { label: "打开 Agent 工作区", hint: "Enter", when: () => Boolean(currentProject), run: () => start(currentProject.root) },
  { label: "显示/隐藏侧栏", hint: "⌘B", run: toggleSidebar },
  { label: "显示/隐藏右侧栏", hint: "⌘J", when: () => Boolean(currentProject), run: toggleInspector },
  { label: "显示运行输出", hint: "⌘⇧O", when: () => Boolean(currentProject), run: () => openTab("output") },
  { label: "显示浏览器", hint: "⌘⇧B", when: () => Boolean(currentProject), run: () => openTab("browser") },
  { label: "显示文件", hint: "⌘P", when: () => Boolean(currentProject), run: () => openTab("files") },
  { label: "显示终端", hint: "⌘⇧T", when: () => Boolean(currentProject), run: () => openTab("terminal") },
  { label: "回到项目列表", hint: "Esc", when: () => Boolean(currentProject), run: showHome },
];
let paletteIndex = 0;
let paletteVisible = [];
const palette = $("command-palette");
const commandInput = $("command-input");

function renderPalette() {
  const query = commandInput.value.trim().toLowerCase();
  paletteVisible = paletteCommands.filter((command) => (!command.when || command.when()) && (!query || command.label.toLowerCase().includes(query)));
  paletteIndex = Math.min(paletteIndex, Math.max(paletteVisible.length - 1, 0));
  $("command-list").innerHTML = paletteVisible.length
    ? paletteVisible
        .map(
          (command, index) => `
            <button type="button" class="palette-item${index === paletteIndex ? " active" : ""}" data-command="${index}">
              <strong>${escapeHtml(command.label)}</strong><span>${escapeHtml(command.hint || "")}</span>
            </button>`,
        )
        .join("")
    : '<p class="empty">没有匹配的命令。</p>';
  for (const button of $("command-list").querySelectorAll("[data-command]")) {
    button.addEventListener("click", () => runPalette(Number(button.dataset.command)));
  }
}

function openPalette() {
  palette.hidden = false;
  commandInput.value = "";
  paletteIndex = 0;
  renderPalette();
  commandInput.focus();
}

function closePalette() {
  palette.hidden = true;
}

function runPalette(index) {
  const command = paletteVisible[index];
  if (!command) return;
  closePalette();
  command.run();
}

function movePalette(delta) {
  if (!paletteVisible.length) return;
  paletteIndex = (paletteIndex + delta + paletteVisible.length) % paletteVisible.length;
  renderPalette();
}

$("command-trigger").addEventListener("click", openPalette);
palette.addEventListener("click", (event) => {
  if (event.target === palette) closePalette();
});
commandInput.addEventListener("input", () => {
  paletteIndex = 0;
  renderPalette();
});
commandInput.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    movePalette(1);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    movePalette(-1);
  } else if (event.key === "Enter") {
    event.preventDefault();
    runPalette(paletteIndex);
  } else if (event.key === "Escape") {
    closePalette();
  }
});
document.addEventListener("keydown", (event) => {
  const command = event.metaKey || event.ctrlKey;
  if (command && event.key.toLowerCase() === "k") {
    event.preventDefault();
    palette.hidden ? openPalette() : closePalette();
  } else if (command && event.key.toLowerCase() === "o") {
    event.preventDefault();
    openExistingProject();
  } else if (command && event.shiftKey && event.key.toLowerCase() === "f") {
    event.preventDefault();
    goHomeIntake("agent");
  } else if (command && event.key.toLowerCase() === "n") {
    event.preventDefault();
    goHomeIntake("new");
    nameInput.focus();
  } else if (command && event.key.toLowerCase() === "b") {
    event.preventDefault();
    if (event.shiftKey) toggleBrowser();
    else toggleSidebar();
  } else if (command && event.key.toLowerCase() === "j") {
    event.preventDefault();
    toggleInspector();
  } else if (event.key === "Escape" && !palette.hidden) {
    closePalette();
  }
});

showHome();
applyLayout();
