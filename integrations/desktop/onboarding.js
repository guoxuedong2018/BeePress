const $ = (id) => document.getElementById(id);
const overlay = $("overlay");
const overlayTitle = $("overlay-title");
const overlayDetail = $("overlay-detail");
const nameInput = $("project-name");
const parentPath = $("parent-path");

let parent = null;

function setBusy(busy, title = "正在打开项目", detail = "启动 DeepSeek Harness…") {
  overlay.hidden = !busy;
  overlayTitle.textContent = title;
  overlayDetail.textContent = detail;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
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
    button.addEventListener("click", () => openWorkspace(button.dataset.root));
  }
}

async function openWorkspace(root) {
  setBusy(true, "正在打开工作区", "启动 DeepSeek Harness，加载 BuilderHarness 右侧栏…");
  try {
    await window.builderHarness.start(root);
  } catch (error) {
    setBusy(false);
    alert(error instanceof Error ? error.message : String(error));
  }
}

function showHome() {
  window.builderHarness?.recent?.().then(renderRecent).catch(() => {});
}

function switchIntake(name) {
  for (const node of document.querySelectorAll("[data-intake]")) node.classList.toggle("active", node.dataset.intake === name);
  for (const pane of document.querySelectorAll("[data-pane]")) pane.hidden = pane.dataset.pane !== name;
}

function goHomeIntake(name) {
  showHome();
  switchIntake(name);
}

function openExistingProject() {
  switchIntake("drop");
  $("dropzone").click();
}

for (const tab of document.querySelectorAll("[data-intake]")) {
  tab.addEventListener("click", () => switchIntake(tab.dataset.intake));
}

$("import-shortcut").addEventListener("click", openExistingProject);
$("scan-shortcut").addEventListener("click", () => goHomeIntake("agent"));
$("new-project-shortcut").addEventListener("click", () => {
  goHomeIntake("new");
  nameInput.focus();
});

async function runAgentScan() {
  if (!$("agent-command").value.trim()) {
    alert("先写一句要 Agent 找什么。");
    return;
  }
  const root = await window.builderHarness.chooseScanRoot();
  if (!root) return;
  setBusy(true, "Agent 正在搜索本地项目", "只读取你授权的目录，不移动、不上传代码…");
  try {
    const result = await window.builderHarness.scanProjects(root);
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
      button.addEventListener("click", () => openWorkspace(button.dataset.root));
    }
  } catch (error) {
    setBusy(false);
    $("scan-results").innerHTML = `<p class="empty">${escapeHtml(error instanceof Error ? error.message : String(error))}</p>`;
  }
}

$("run-agent").addEventListener("click", runAgentScan);

$("dropzone").addEventListener("click", async () => {
  try {
    const root = await window.builderHarness.chooseExisting();
    if (root) await openWorkspace(root);
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
    const filePath = window.builderHarness.pathForFile(file);
    if (!filePath) throw new Error("无法读取拖入的路径，请改用目录选择。");
    $("drop-hint").textContent = filePath;
    await openWorkspace(filePath);
  } catch (error) {
    alert(error instanceof Error ? error.message : String(error));
  }
});

$("import-existing").addEventListener("click", (event) => {
  event.stopPropagation();
  $("dropzone").click();
});

$("choose-parent").addEventListener("click", async () => {
  const selected = await window.builderHarness.chooseParent();
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
    const root = await window.builderHarness.createProject({ parent, name: nameInput.value.trim() });
    await openWorkspace(root);
  } catch (error) {
    setBusy(false);
    alert(error instanceof Error ? error.message : String(error));
  }
});

document.addEventListener("keydown", (event) => {
  const command = event.metaKey || event.ctrlKey;
  if (command && event.key.toLowerCase() === "o") {
    event.preventDefault();
    openExistingProject();
  } else if (command && event.shiftKey && event.key.toLowerCase() === "f") {
    event.preventDefault();
    goHomeIntake("agent");
  } else if (command && event.key.toLowerCase() === "n") {
    event.preventDefault();
    goHomeIntake("new");
    nameInput.focus();
  }
});

window.builderHarness?.onMenu?.((command) => {
  if (command === "import-project") openExistingProject();
  else if (command === "new-project") {
    goHomeIntake("new");
    nameInput.focus();
  }
});

showHome();
