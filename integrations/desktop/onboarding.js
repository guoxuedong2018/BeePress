const $ = (id) => document.getElementById(id);
const overlay = $("overlay");
const overlayTitle = $("overlay-title");
const overlayDetail = $("overlay-detail");
const nameInput = $("project-name");
const parentPath = $("parent-path");
const launcherView = $("launcher-view");
const projectView = $("project-view");

let parent = null;
let currentProject = null;

function setBusy(busy, title = "正在打开项目", detail = "启动 DeepSeek Harness…") {
  overlay.hidden = !busy;
  overlayTitle.textContent = title;
  overlayDetail.textContent = detail;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

async function start(root) {
  setBusy(true);
  try {
    await window.beepress.start(root);
  } catch (error) {
    setBusy(false);
    // The main process already showed a native dialog; keep the launcher usable.
    console.error(error);
  }
}

function showLauncher() {
  currentProject = null;
  projectView.hidden = true;
  launcherView.hidden = false;
  window.beepress.recent().then(renderRecent).catch(() => {});
}

function renderProject(project) {
  currentProject = project;
  launcherView.hidden = true;
  projectView.hidden = false;
  $("project-name").textContent = project.name || "项目";
  $("project-path").textContent = project.root;
  $("stage-requirements-value").textContent = `${project.features?.length ?? 0} 份 FRS`;
  $("stage-prototype-value").textContent = project.devScript ? `dev: ${project.devScript}` : "未配置 dev 脚本";
  $("stage-review-value").textContent = `${project.openReviews ?? 0} 条待处理`;
  $("stage-content-value").textContent = `${project.kbPages ?? 0} 页知识库`;
  $("stage-publish-value").textContent = project.publish?.configured ? project.publish.destination || "已配置" : "未配置目标";
  $("project-note").textContent = project.templates
    ? "项目已具备 FRS 模板、工作流和 Agent Skills。进入工作区后可从右侧 Bee Press 面板开始。"
    : "项目还缺少 Bee Press 脚手架；进入工作区后可以在终端运行 npx beepress init 补齐。";
}

async function inspect(root) {
  setBusy(true, "正在读取项目", "检查需求、知识库、评审和原型配置…");
  try {
    const project = await window.beepress.inspect(root);
    setBusy(false);
    renderProject(project);
  } catch (error) {
    setBusy(false);
    alert(error instanceof Error ? error.message : String(error));
  }
}

function renderRecent(config) {
  const list = $("recent-list");
  const recent = Array.isArray(config.recent) ? config.recent : [];
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

$("import-existing").addEventListener("click", async () => {
  try {
    const root = await window.beepress.chooseExisting();
    if (root) await inspect(root);
  } catch (error) {
    overlay.hidden = true;
    alert(error instanceof Error ? error.message : String(error));
  }
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
  setBusy(true, "正在创建项目", "复制 FRS 模板、知识库和 Agent Skills…");
  try {
    const root = await window.beepress.createProject({ parent, name: nameInput.value.trim() });
    setBusy(false);
    await inspect(root);
  } catch (error) {
    setBusy(false);
    alert(error instanceof Error ? error.message : String(error));
  }
});

$("enter-project").addEventListener("click", () => {
  if (currentProject) start(currentProject.root);
});

$("switch-project").addEventListener("click", showLauncher);
$("back-to-launcher").addEventListener("click", showLauncher);

window.beepress.recent().then(renderRecent).catch(() => {});
