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
  $("stage-output").hidden = true;
  window.beepress.recent().then(renderRecent).catch(() => {});
}

function renderProject(project) {
  currentProject = project;
  launcherView.hidden = true;
  projectView.hidden = false;
  $("project-name").textContent = project.name || "项目";
  $("project-path").textContent = project.root;
  $("stage-output").hidden = true;
  $("publish-gateway").value = project.publish?.destination || "";
  $("stage-requirements-value").textContent = `${project.features?.length ?? 0} 份 FRS`;
  $("stage-prototype-value").textContent = project.devScript ? `dev: ${project.devScript}` : "未配置 dev 脚本";
  $("stage-review-value").textContent = `${project.openReviews ?? 0} 条待处理`;
  $("stage-content-value").textContent = `${project.kbPages ?? 0} 页知识库`;
  $("stage-publish-value").textContent = project.publish?.configured
    ? `${project.publish.destination || "已配置"} · ${project.publish.publishedPages ?? 0} 已发布`
    : "未配置目标";
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

function showOutput(text) {
  const output = $("stage-output");
  output.hidden = false;
  output.textContent = String(text ?? "").trim() || "完成。";
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

async function action(name) {
  if (!currentProject) return;
  const root = currentProject.root;
  const output = $("stage-output");
  output.hidden = false;
  output.textContent = "执行中…";
  try {
    if (name === "create-feature") {
      const title = $("feature-title").value.trim();
      const result = await window.beepress.createFeature({ root, title });
      showOutput(`已创建需求件套：\n${result.relativePath}\n\n下一步：\n${result.checkCommand}`);
      $("feature-title").value = "";
      currentProject.features = [...(currentProject.features || []), result.key].sort();
      $("stage-requirements-value").textContent = `${currentProject.features.length} 份 FRS`;
      return;
    }
    if (name === "install-deps") {
      setBusy(true, "正在安装依赖", "在项目目录执行 npm install…");
      const result = await window.beepress.installDependencies(root);
      setBusy(false);
      showOutput(result.output || (result.ok ? "依赖安装完成。" : "依赖安装失败。"));
      return;
    }
    if (name === "check-frs") {
      const result = await window.beepress.checkFrs(root);
      showOutput(result.output || (result.ok ? "FRS 校验通过。" : "FRS 校验失败。"));
      return;
    }
    if (name === "start-prototype") {
      const result = await window.beepress.startPrototype(root);
      showOutput(result.ok ? `原型已启动：${result.url}\n${result.reused ? "（复用已运行的 dev server）" : ""}` : result.error);
      return;
    }
    if (name === "open-review") {
      const result = await window.beepress.openReview(root);
      showOutput(result.ok ? `评审页已打开：${result.url}\n在页面上按住 ⌘/Ctrl 或点击评论按钮开始圈选。` : result.error);
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
      showOutput(result.output || (result.ok ? "截图完成。" : "截图失败。"));
      return;
    }
    if (name === "record-clips") {
      setBusy(true, "正在重建录屏", "先启动原型，再按 clips 配方录制 MP4/GIF…");
      const result = await window.beepress.recordClips(root);
      setBusy(false);
      showOutput(result.output || (result.ok ? "录屏完成。" : "录屏失败。"));
      return;
    }
    if (name === "save-gateway") {
      const gateway = $("publish-gateway").value.trim();
      const project = await window.beepress.savePublishGateway({ root, gateway });
      currentProject = project;
      $("stage-publish-value").textContent = project.publish?.configured
    ? `${project.publish.destination || "已配置"} · ${project.publish.publishedPages ?? 0} 已发布`
    : "未配置目标";
      showOutput(gateway ? `已保存发布目标：${gateway}` : "已清除发布目标。");
      return;
    }
    if (name === "publish-plan") {
      setBusy(true, "正在生成发布计划", "运行 kb-publish --dry-run…");
      const result = await window.beepress.publishPlan(root);
      setBusy(false);
      showOutput(result.output || (result.ok ? "发布计划完成。" : "发布计划失败。"));
      return;
    }
    showOutput(`未知操作：${name}`);
  } catch (error) {
    setBusy(false);
    showOutput(error instanceof Error ? error.message : String(error));
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

projectView.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (button) action(button.dataset.action);
});

$("feature-title").addEventListener("keydown", (event) => {
  if (event.key === "Enter") action("create-feature");
});

$("enter-project").addEventListener("click", () => {
  if (currentProject) start(currentProject.root);
});

$("switch-project").addEventListener("click", showLauncher);
$("back-to-launcher").addEventListener("click", showLauncher);

window.beepress.recent().then(renderRecent).catch(() => {});
