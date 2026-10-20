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
    button.addEventListener("click", () => start(button.dataset.root));
  }
}

$("import-existing").addEventListener("click", async () => {
  try {
    const root = await window.beepress.chooseExisting();
    if (root) await start(root);
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
    overlayDetail.textContent = "项目已创建，正在启动 DeepSeek Harness…";
    await window.beepress.start(root);
  } catch (error) {
    setBusy(false);
    alert(error instanceof Error ? error.message : String(error));
  }
});

window.beepress.recent().then(renderRecent).catch(() => {});
