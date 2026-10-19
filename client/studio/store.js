import { proxy } from "valtio";

import { getHost } from "../core/host";

/**
 * 内容审阅台 · 运行时状态
 * ------------------------------------------------------------------
 * 与评审套件的 store 同构：独立的 valtio proxy，不进宿主的状态树——工具层要能整体剥离。
 *
 * 这里**不产生判断**。叙述在 docs/kb/*.md 里，由 IDE 里的 Agent 写、人审，人也可以在审阅台里按段就地改（写回的就是 md）；
 * 要不要审、为什么、前后差多少，都由 pipeline/lib/content-build.mjs 算好送过来。
 * 审阅台只做三件事：摆出来给人看、记下人的确认、把活派出去（重拍 / 发布；要 Agent 写的复制一条指令给 IDE 里的 Agent）。
 *
 * 从前这里是一整套生产图编辑器（节点、连线、下发动作），5000 多行，而人在这条链上
 * 实际做的只有「审」和「批准发出」。正文的生产者是 Agent，它直接改 md 更可靠。
 */

const API = "/__builder_studio";
const DEMO_KEY = "builder-kit:demo";

export const studioState = proxy({
  open: false,
  loading: false,
  /** dev 服务在不在：不在就只能看不能确认 */
  persistent: false,
  /** buildStatus() 的结果：files（每篇带 open / unfilled / stale）/ groups / reshoot / summary */
  status: null,
  /** 当前选中：{ kind: "file" | "new-topic", id } */
  selected: null,
  /** 选中文档的详情：原文 + 每条引用 */
  file: null,
  /** 操作结果的提示：{ text, kind: ok | error | info, id }，在审阅台底部冒一下 */
  notice: null,
  busy: "",
  /** 一份文档看哪一面：review 要看的地方 + 正文；structure 这篇由什么构成 */
  view: "review",
  /** 选中文档的构成（structureOf 的结果） */
  structure: null,
  /** 示范录制：{ phase: arming | recording | review | running, page, section, route, steps, job } */
  demo: loadDemo(),
  /** 全屏预览：{ items: [{ src, video?, label, caption, regions? }], index } */
  lightbox: null,
  /** 后台任务：重拍、发布、示范（录屏 / 截图） */
  jobs: { shoot: null, publish: null, clip: null },
  /** 构成视图打开时要选中的节点（从正文里点了某个格子过来） */
  focus: null,
  /** 兼容发布按钮：它读的是 publish 这一格 */
  publish: null,
});

// ────────────────────────────────────────────────────────────────
// 示范录制的状态要跨过一次整页刷新：开始录制时刷新页面，让录制从这条路由刚打开的样子开始
// ────────────────────────────────────────────────────────────────


function loadDemo() {
  try {
    return JSON.parse(window.sessionStorage.getItem(DEMO_KEY) || "null");
  } catch {
    return null;
  }
}

export function saveDemo() {
  if (studioState.demo) window.sessionStorage.setItem(DEMO_KEY, JSON.stringify(studioState.demo));
  else window.sessionStorage.removeItem(DEMO_KEY);
}

/** 出错的多留一会儿：要读清原因 */
export function notify(text, kind = "ok") {
  if (!text) return;
  studioState.notice = { text, kind, id: Date.now() };
  window.clearTimeout(notify._t);
  notify._t = window.setTimeout(() => (studioState.notice = null), kind === "error" ? 8000 : 4000);
}

export function dismissNotice() {
  window.clearTimeout(notify._t);
  studioState.notice = null;
}

async function api(path, { method = "GET", body } = {}) {
  const r = await fetch(`${API}${path}`, {
    method,
    cache: "no-store",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `${method} ${path} 失败`);
  return j;
}

// ────────────────────────────────────────────────────────────────
// 打开 / 关闭 / 刷新
// ────────────────────────────────────────────────────────────────

export async function openStudio() {
  studioState.open = true;
  await refresh();
  pollJob("shoot");
  pollJob("publish");
  pollJob("clip");
}

export function closeStudio() {
  studioState.open = false;
}

/** 重新算一遍工作清单；选中的那一项还在就顺带刷新它 */
export async function refresh() {
  studioState.loading = true;
  try {
    studioState.status = await api("/status");
    studioState.persistent = true;
    const sel = studioState.selected;
    if (sel?.kind === "file") await openFile(sel.id, { quiet: true });
    else if (!sel) selectFirst();
  } catch (e) {
    studioState.persistent = false;
    notify(`连不上开发服务，读不到内容清单：${e.message}`, "error");
  } finally {
    studioState.loading = false;
  }
}

function selectFirst() {
  const s = studioState.status;
  const first = s?.review?.[0]?.path ?? s?.files?.[0]?.path;
  if (first) openFile(first);
}

export async function openFile(rel, { quiet = false } = {}) {
  studioState.selected = { kind: "file", id: rel };
  if (!quiet) studioState.file = null;
  try {
    const file = await api(`/file?path=${encodeURIComponent(rel)}`);
    // 用户可能在等这个请求时点了别的
    if (studioState.selected?.kind === "file" && studioState.selected.id === rel) studioState.file = { ...file, loadedAt: Date.now() };
    if (studioState.view === "structure") await loadStructure(rel);
  } catch (e) {
    notify(e.message, "error");
  }
}

export async function setView(view) {
  studioState.view = view;
  if (view === "structure" && studioState.selected?.kind === "file") await loadStructure(studioState.selected.id);
}

export async function loadStructure(rel) {
  try {
    const s = await api(`/structure?path=${encodeURIComponent(rel)}`);
    if (studioState.selected?.id === rel) studioState.structure = { ...s, loadedAt: Date.now() };
  } catch (e) {
    notify(e.message, "error");
  }
}

export function selectOther(kind, id) {
  studioState.selected = { kind, id };
  studioState.file = null;
}

// ────────────────────────────────────────────────────────────────
// 人的动作
// ────────────────────────────────────────────────────────────────

/** 我看过了：整页（refs 为空）或其中几条 */
export async function ackRefs(rel, refs = null) {
  studioState.busy = "ack";
  try {
    const r = await api("/ack", { method: "POST", body: { path: rel, refs } });
    notify(r.skipped?.length ? `已确认 ${r.acked.length} 处；另有 ${r.skipped.length} 处找不到了，要改正文才能确认` : `已确认 ${r.acked.length} 处，下次它们变了会再提醒`);
    await refresh();
  } catch (e) {
    notify(e.message, "error");
  } finally {
    studioState.busy = "";
  }
}

export async function adoptFact(rel, ref) {
  studioState.busy = "adopt";
  try {
    await api("/adopt", { method: "POST", body: { path: rel, ref } });
    notify("已换成需求规格里现在的写法");
    await refresh();
  } catch (e) {
    notify(e.message, "error");
  } finally {
    studioState.busy = "";
  }
}

export function openLightbox(items, index = 0) {
  studioState.lightbox = { items, index };
}

export function closeLightbox() {
  studioState.lightbox = null;
}

/** 录屏的动图 → 同名 mp4（能暂停、能拖）。预览时放视频，不放动图 */
export const videoOf = (src) => (/\/media\/media\/.+\.gif(\?|$)/.test(src) ? src.replace(/\.gif(\?|$)/, ".mp4$1") : null);

/** 按段改正文。before 是打开时看到的那一段，对不上服务端会拒绝 */
export async function saveBlock(rel, { start, end, before }, after) {
  await api("/edit", { method: "POST", body: { path: rel, start, end, before, after } });
  notify("已保存到正文");
  await refresh();
}

/** 在编辑器里打开，定位到行。用 Vite 自带的 /__open-in-editor */
export function openInEditor(abs, line = 1) {
  fetch(`/__open-in-editor?file=${encodeURIComponent(`${abs}:${line}`)}`).catch(() => notify("打不开编辑器", "error"));
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    notify("已复制，到 IDE 的 Agent 对话里粘贴");
  } catch {
    notify("复制失败，手动选中复制吧", "error");
  }
}

/** 要 Agent 写的活：复制一条指令，交给 IDE 里的 Agent；前缀由宿主接线（见 vite.mjs 的 agentPrompt） */
export function copyForAgent(page, ask) {
  const prefix = getHost().agentPrompt || "";
  return copyText(`${prefix ? `${prefix} ` : ""}docs/kb/${page}：${ask}`);
}

// ────────────────────────────────────────────────────────────────
// 后台任务：重拍、发布
// ────────────────────────────────────────────────────────────────

const timers = {};

export async function pollJob(name) {
  try {
    const job = (await api(`/job?name=${name}`)).job;
    const wasRunning = studioState.jobs[name]?.running;
    studioState.jobs[name] = job;
    if (name === "publish") studioState.publish = job;
    // 重拍刚跑完：图变了，工作清单要重算
    if (name === "shoot" && wasRunning && job && !job.running) {
      const got = String(job.output ?? "").match(/已抓 (\d+)\/(\d+) 张/);
      if (job.code !== 0) notify("重拍中断了，已拍好的留着，没拍的还是旧图", "error");
      else if (got && got[1] !== got[2]) notify(`重拍完：${got[2]} 张里 ${got[2] - got[1]} 张没拍成，还是旧图`, "error");
      else notify("重拍完成。画面变了的已放进各篇「要看的」，没变的不用管");
      refresh();
    }
    if (name === "clip" && studioState.demo?.phase === "running") saveDemo();
  } catch {
    studioState.jobs[name] = null;
  }
  window.clearTimeout(timers[name]);
  if (studioState.jobs[name]?.running) timers[name] = window.setTimeout(() => pollJob(name), 2000);
  return studioState.jobs[name];
}

export async function shoot({ stale = false, keys = [] } = {}) {
  try {
    await api("/shoot", { method: "POST", body: stale ? { stale: true } : { keys } });
    notify("开始重拍，一张十来秒。画面没变的不会打扰任何一篇", "info");
    pollJob("shoot");
  } catch (e) {
    notify(e.message, "error");
  }
}

// ────────────────────────────────────────────────────────────────
// 示范录制：在原型里操作一遍 → 生成配方 → 录制 → 放进那一节
// ────────────────────────────────────────────────────────────────

/**
 * 从构成视图的某一节（或某个格子）发起。审阅台收起来，让出原型给人操作。
 * kind：clip 录一段操作；shot 操作到那一屏、框出范围拍一张。给了格子就填那个格子
 */
export function startDemo(page, section, { kind = "clip", slot = null } = {}) {
  studioState.demo = { phase: "arming", kind, page, section: { line: section.line, text: section.text }, slot: slot ? { line: slot.line, hint: slot.hint, route: slot.route } : null, route: "", steps: [], clip: null };
  saveDemo();
  closeStudio();
  // 格子写了从哪一屏拍：直接去那一屏，省得人自己找
  if (slot?.route && window.location.hash.replace(/^#/, "") !== slot.route) window.location.hash = slot.route;
}

/**
 * 录制时这个标签页带着的标记，与录屏管线同一个参数名（`?clip=`）。
 * 录下的步骤——点了哪段文字、输入了什么——会写进入库的配方；宿主据此把不该入镜的东西关掉
 * （如本机才有的真实数据），录的就和管线重放时看到的是同一份页面。
 */
const RECORDING_MARK = ["clip", "demo"];

function withRecordingMark(on) {
  const u = new URL(window.location.href);
  if (on) u.searchParams.set(...RECORDING_MARK);
  else if (u.searchParams.get(RECORDING_MARK[0]) === RECORDING_MARK[1]) u.searchParams.delete(RECORDING_MARK[0]);
  return u.toString();
}

/** 开始录：记下当前路由，整页刷新——录制从这条路由刚打开的样子开始，和录屏脚本的起点一致 */
export function beginRecording() {
  const d = studioState.demo;
  d.route = window.location.hash.replace(/^#/, "") || "/";
  d.phase = "recording";
  d.steps = [];
  saveDemo();
  // 地址一模一样（已经带着标记）时 replace 只算锚点跳转、不刷新，得显式 reload
  const next = withRecordingMark(true);
  if (next === window.location.href) window.location.reload();
  else window.location.replace(next);
}

/** 录完 / 取消：摘掉标记（不刷新，下次刷新或换路由时宿主自己恢复） */
function dropRecordingMark() {
  const next = withRecordingMark(false);
  if (next !== window.location.href) window.history.replaceState(window.history.state, "", next);
}

export function finishRecording() {
  studioState.demo.phase = "review";
  saveDemo();
  dropRecordingMark();
}

export function cancelDemo() {
  studioState.demo = null;
  saveDemo();
  dropRecordingMark();
}

let demoConfig = null;
export async function loadDemoConfig() {
  demoConfig ??= await api("/demo-config");
  return demoConfig;
}

export async function submitDemo({ caption, marks = false }) {
  const d = studioState.demo;
  try {
    await api(d.kind === "shot" ? "/shot" : "/clip", {
      method: "POST",
      body: {
        page: d.page,
        section: d.section,
        slot: d.slot?.line ?? null,
        route: d.route,
        caption,
        steps: d.steps.map(({ selector, caption: c, type, clear }) => ({ selector, caption: c, type, clear })),
        ...(d.kind === "shot" ? { clip: d.clip?.selector ?? null, marks } : {}),
      },
    });
    d.phase = "running";
    saveDemo();
    pollJob("clip");
  } catch (e) {
    notify(e.message, "error");
    throw e;
  }
}

/** 录完：清掉示范，打开审阅台停在这一页的构成上，新录屏在里面标着「还没确认过」 */
export async function openDemoResult() {
  const page = studioState.demo?.page;
  cancelDemo();
  studioState.view = "structure";
  studioState.selected = { kind: "file", id: page };
  await openStudio();
}

// ────────────────────────────────────────────────────────────────
// 结构规划：话题 → 蓝图（节、意图、格子）→ 填格子 → 写正文
// ────────────────────────────────────────────────────────────────

let planConfig = null;
export async function loadPlanConfig() {
  planConfig ??= await api("/plan-config");
  return planConfig;
}

/** 按话题建一页，建好停在它的构成上 */
export async function createTopic(spec) {
  const r = await api("/topic", { method: "POST", body: spec });
  notify("建好了，按模板排了骨架");
  studioState.view = "structure";
  await refresh();
  await openFile(r.path);
  return r.path;
}

/** 调整蓝图：改意图、加删格子、加一节。expect 是打开时看到的那一行原文，对不上服务端会拒绝 */
export async function planOp(rel, body) {
  try {
    await api("/plan", { method: "POST", body: { path: rel, ...body } });
    await refresh();
    return true;
  } catch (e) {
    notify(e.message, "error");
    return false;
  }
}

/** 从正文里点了一个格子：去构成视图，选中它 */
export async function focusSlot(line) {
  studioState.focus = `slot:${line}`;
  await setView("structure");
}

// 发布按钮沿用这三个名字

export async function pollPublish() {
  return pollJob("publish");
}

/** 发布目标的名称与说明；目的地由宿主配置，套件不假设是哪一个服务 */
export async function publishConfig() {
  return api("/publish-config");
}

/** 算一遍这次会动哪些页，不碰目标端。确认框里摆的就是它 */
export async function publishPlan() {
  const started = await api("/publish", { method: "POST", body: { dryRun: true } });
  for (let i = 0; i < 60; i += 1) {
    const job = await pollJob("publish");
    if (job && !job.running) return { ...job, confirmToken: started.confirmToken };
    await new Promise((r) => window.setTimeout(r, 300));
  }
  throw new Error("算发布计划超时");
}

export async function publishNow(confirmToken) {
  if (!confirmToken) throw new Error("发布确认已过期，请重新打开发布面板算一次计划");
  await api("/publish", { method: "POST", body: { confirmToken } });
  notify("发布已开始，十几分钟，关掉审阅台也不影响", "info");
  return pollJob("publish");
}

// ────────────────────────────────────────────────────────────────
// 展示用
// ────────────────────────────────────────────────────────────────

export const REF_STATE_LABEL = { ok: "没变", changed: "有变化", unreviewed: "没确认过", missing: "找不到了" };
export const BASIS_LABEL = { frs: "需求规格", code: "原型代码", note: "人工记录" };

/** 卡片标题：截图录屏说它拍的是什么（图注），原文说它出自哪 */
export function refTitle(r) {
  if (r.type === "shot") return `截图：${r.caption || r.key}`;
  if (r.type === "clip") return `录屏：${r.caption || r.key}`;
  if (r.type === "spec") return `挂靠的需求 ${r.key}`;
  const kind = String(r.basis ?? "").split(":")[0];
  if (kind === "code") return "照抄的界面文案";
  if (kind === "frs") return "照抄的需求规格";
  return BASIS_LABEL[kind] ?? "照抄的原文";
}

/** 原文出自哪：「需求规格 KEY#FP2」「原型代码 src/…/X.vue」 */
export function basisText(basis) {
  const [kind, ...rest] = String(basis ?? "").split(":");
  return `${BASIS_LABEL[kind] ?? kind} ${rest.join(":")}`.trim();
}
