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
}

function selectStage(name) {
  for (const node of document.querySelectorAll("[data-stage]")) {
    if (node.tagName === "BUTTON") node.classList.toggle("active", node.dataset.stage === name);
  }
  for (const node of document.querySelectorAll("[data-stage-panel]")) {
    node.classList.toggle("active", node.dataset.stagePanel === name);
  }
}

function showHome() {
  currentProject = null;
  lastAnalysis = null;
  for (const button of document.querySelectorAll("#recent-list [data-root]")) button.classList.remove("active");
  showView("home", 1);
  window.beepress?.recent?.().then(renderRecent).catch(() => {});
}

function showOutput(text, state = "完成") {
  const output = $("stage-output");
  output.hidden = false;
  output.textContent = String(text ?? "").trim() || "完成。";
  output.scrollTop = 0;
  $("output-empty").hidden = true;
  $("output-state").textContent = state;
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
  selectStage("requirements");
  $("project-note").textContent = project.templates
    ? "核心工具直接在这里使用；Agent 工作区只是其中一种入口，不是 Bee Press 本身。"
    : "项目还缺少 Bee Press 脚手架；进入 Agent 工作区后可以运行 npx beepress init 补齐。";
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
  showOutput("执行中…", "运行中");
  try {
    if (name === "create-feature") {
      const title = $("feature-title").value.trim();
      const result = await window.beepress.createFeature({ root, title });
      showOutput(`已创建需求件套：\n${result.relativePath}\n\n下一步：\n${result.checkCommand}`);
      $("feature-title").value = "";
      currentProject.features = [...(currentProject.features || []), result.key].sort();
      $("status-requirements").textContent = `${currentProject.features.length} FRS`;
      return;
    }
    if (name === "check-frs") {
      const result = await window.beepress.checkFrs(root);
      showOutput(result.output || (result.ok ? "FRS 校验通过。" : "FRS 校验失败。"), result.ok ? "完成" : "失败");
      return;
    }
    if (name === "install-deps") {
      setBusy(true, "正在安装依赖", "在项目目录执行 npm install…");
      const result = await window.beepress.installDependencies(root);
      setBusy(false);
      showOutput(result.output || (result.ok ? "依赖安装完成。" : "依赖安装失败。"), result.ok ? "完成" : "失败");
      return;
    }
    if (name === "start-prototype") {
      const result = await window.beepress.startPrototype(root);
      showOutput(result.ok ? `原型已启动：${result.url}\n${result.reused ? "（复用已运行的 dev server）" : ""}` : result.error, result.ok ? "完成" : "失败");
      return;
    }
    if (name === "open-review") {
      const result = await window.beepress.openReview(root);
      showOutput(result.ok ? `评审页已打开：${result.url}\n在页面上按住 ⌘/Ctrl 或点击评论按钮开始圈选。` : result.error, result.ok ? "完成" : "失败");
      return;
    }
    if (name === "review-status") {
      const result = await window.beepress.reviewStatus(root);
      showOutput(result.output || "没有待处理批注。");
      return;
    }
    if (name === "content-status") {
      const result = await window.beepress.contentStatus(root);
      showOutput(formatContent(result));
      return;
    }
    if (name === "capture-media") {
      setBusy(true, "正在重建截图", "先启动原型，再按配方抓取过期截图…");
      const result = await window.beepress.captureMedia(root);
      setBusy(false);
      showOutput(result.output || (result.ok ? "截图完成。" : "截图失败。"), result.ok ? "完成" : "失败");
      return;
    }
    if (name === "record-clips") {
      setBusy(true, "正在重建录屏", "先启动原型，再按 clips 配方录制 MP4/GIF…");
      const result = await window.beepress.recordClips(root);
      setBusy(false);
      showOutput(result.output || (result.ok ? "录屏完成。" : "录屏失败。"), result.ok ? "完成" : "失败");
      return;
    }
    if (name === "save-gateway") {
      const gateway = $("publish-gateway").value.trim();
      const project = await window.beepress.savePublishGateway({ root, gateway });
      currentProject = project;
      $("status-publish").textContent = project.publish?.configured
        ? `${project.publish.publishedPages ?? 0} 已发`
        : "未配置";
      showOutput(gateway ? `已保存发布目标：${gateway}` : "已清除发布目标。");
      return;
    }
    if (name === "publish-plan") {
      setBusy(true, "正在生成发布计划", "运行 kb-publish --dry-run…");
      const result = await window.beepress.publishPlan(root);
      setBusy(false);
      showOutput(result.output || (result.ok ? "发布计划完成。" : "发布计划失败。"), result.ok ? "完成" : "失败");
      return;
    }
    showOutput(`未知操作：${name}`);
  } catch (error) {
    setBusy(false);
    showOutput(error instanceof Error ? error.message : String(error), "失败");
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
  } else if (event.key === "Escape" && !palette.hidden) {
    closePalette();
  }
});

showHome();
