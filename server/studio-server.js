import { spawn } from "node:child_process";
import { promises as fs, createReadStream } from "node:fs";
import path from "node:path";

import os from "node:os";

import { loadAdapter } from "../pipeline/lib/adapter.mjs";
import { SELECTOR_HELPER } from "../pipeline/lib/cdp.mjs";
import { ack, adoptFact, buildStatus, fileStatus, sectionsOf, structureOf } from "../pipeline/lib/content-build.mjs";
import { parseFrontMatter } from "../pipeline/lib/kb-md.mjs";
import { ROUTE_RE, applyPlanOp } from "../pipeline/lib/plan-marks.mjs";
import { createTopicPage } from "../pipeline/lib/topic-context.mjs";
import { SLOT_KINDS, TOPIC_TYPES } from "../pipeline/lib/topic-types.mjs";
import { blobPath } from "../pipeline/lib/media-ledger.mjs";
import { KB_DIR, PIPELINE_DIR, REPO_ROOT } from "../pipeline/lib/paths.mjs";

/**
 * 内容审阅台 · 开发态服务
 * ------------------------------------------------------------------
 * 与评审套件的 review-server 同级：都只在 `vite dev` 挂载。
 *
 * 它只做两件事——**给人看**与**记下人的确认**。叙述在 docs/kb/*.md 里，
 * 由人或 IDE 里的 Agent 写；这里只提供按段写回（打开后被改过就拒绝）。判断逻辑一概不写在这里，
 * 全部取自 pipeline/lib/content-build.mjs，与 `kb` 命令行是同一份事实——
 * 否则终端说要审、审阅台说没事，谁也不知道信谁。
 *
 *   GET    /__builder_studio/status                 全部内容（每篇带要看几处、几份物料源码变过）与分组
 *   GET    /__builder_studio/file?path=             一页：原文 + 每条引用的处境
 *   POST   /__builder_studio/ack                    我看过了（body: { path, refs? }）
 *   POST   /__builder_studio/adopt                  采纳需求规格的新写法（body: { path, ref }）
 *   POST   /__builder_studio/shoot                  重拍（body: { stale } 或 { keys }），后台任务
 *   POST   /__builder_studio/publish                发布到云文档（body: { dryRun }），后台任务
 *   GET    /__builder_studio/job?name=              后台任务的实时状态与输出
 *   GET    /__builder_studio/media/<path>           回源 docs/kb/ 下的图与视频（含 _blobs 里的旧版）
 *   GET    /__builder_studio/structure?path=        一页的构成：来源 → 素材 / 事实 → 章节
 *   GET    /__builder_studio/demo-config            示范录制要的：选择器引擎源码、字段定位
 *   POST   /__builder_studio/clip                   示范录好了：写配方、录制、放进那一节，后台任务
 *   POST   /__builder_studio/shot                   示范截图：写配方、截图、放进那一节（有格子就填格子），后台任务
 *
 *   GET    /__builder_studio/plan-config            话题类型与格子类型（建页、加格子时的选项）
 *   POST   /__builder_studio/topic                  按话题建一页（body: { path, title, type, topic, pages, frs }）
 *   POST   /__builder_studio/plan                   调整蓝图：改意图、加删格子、加一节；目标行打开后被改过就拒绝
 *   POST   /__builder_studio/edit                   按段改正文（body: { path, start, end, before, after }），打开后被改过就拒绝
 *
 * 要 Agent 写的活不在这里跑：审阅台把指令复制出来，交给 IDE 里的 Agent。
 *
 * 在编辑器里打开文件用 Vite 自带的 `/__open-in-editor`，不必再造一个。
 */

const PREFIX = "/__builder_studio";

const MIME = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".srt": "text/plain; charset=utf-8",
};

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

function sendJson(res, code, obj) {
  res.statusCode = code;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(obj));
}

const safeRel = (p) => typeof p === "string" && p.endsWith(".md") && !p.includes("..") && !path.isAbsolute(p);

/** 有没有后台任务正在改这一页 */
const pageBusy = (rel) => jobs.clip?.running && jobs.clip.page === rel;

/** 重拍与示范各起一个浏览器，同时跑会抢端口；发布要等图拍完 */
const busyWith = () => (jobs.shoot?.running && "重拍还在跑") || (jobs.clip?.running && "示范录制还在跑") || null;

/** 一次示范的公共部分：放哪一页哪一节、哪个格子、从哪条路由开始、每一步 */
function demoSpec(body) {
  return {
    page: body.page,
    section: { line: Number(body.section?.line) || 0, text: String(body.section?.text ?? "") },
    ...(Number(body.slot) ? { slot: Number(body.slot) } : {}),
    route: String(body.route),
    caption: String(body.caption || "操作演示").slice(0, 80),
    steps: (Array.isArray(body.steps) ? body.steps : []).slice(0, 30).map((s) => ({
      selector: String(s.selector),
      caption: String(s.caption ?? "").slice(0, 60),
      ...(s.type != null ? { type: String(s.type).slice(0, 200) } : {}),
      ...(s.clear ? { clear: true } : {}),
    })),
  };
}


/**
 * 后台任务。重拍与发布都是分钟级的，撑不住一个 HTTP 请求：POST 起一个，GET 拿进度。
 * 关掉审阅台、刷新页面都不影响它跑完。每种任务只留一个槽位——
 * 同时跑两轮重拍会抢同一个浏览器端口，同时跑两次发布会互相覆盖云端文档。
 */
const jobs = {};
function startJob(name, script, argv, { page = null } = {}) {
  if (jobs[name]?.running) return false;
  // page：这个任务在改哪一页。它跑着的时候，这一页不接受就地改与蓝图调整——
  // 示范放物料时会整篇写回，期间别人的改动会被冲掉
  const job = { name, running: true, output: "", code: null, startedAt: new Date().toISOString(), finishedAt: null, argv, page };
  jobs[name] = job;
  const child = spawn(process.execPath, [path.join(PIPELINE_DIR, script), ...argv], { cwd: REPO_ROOT, stdio: ["ignore", "pipe", "pipe"] });
  const append = (d) => {
    job.output += d;
    if (job.output.length > 40000) job.output = job.output.slice(-40000);
  };
  child.stdout.on("data", append);
  child.stderr.on("data", append);
  child.on("exit", (code) => Object.assign(job, { running: false, code, finishedAt: new Date().toISOString() }));
  child.on("error", (err) => {
    append(`\n启动失败：${err.message}`);
    Object.assign(job, { running: false, code: -1, finishedAt: new Date().toISOString() });
  });
  return true;
}

export function studioServer() {
  return {
    name: "builder-kit:studio-server",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || "";
        if (!url.startsWith(PREFIX)) return next();
        const u = new URL(url, "http://localhost");
        const seg = u.pathname.slice(PREFIX.length).split("/").filter(Boolean);

        try {
          if (req.method === "GET" && seg[0] === "media") {
            const target = decodeURIComponent(u.pathname.slice(`${PREFIX}/media/`.length));
            const abs = path.join(KB_DIR, target);
            if (!abs.startsWith(KB_DIR + path.sep)) return sendJson(res, 403, { error: "forbidden" });
            if (!(await fs.access(abs).then(() => true, () => false))) return sendJson(res, 404, { error: "not found" });
            res.setHeader("content-type", MIME[path.extname(abs).toLowerCase()] ?? "application/octet-stream");
            res.setHeader("cache-control", "no-store");
            return createReadStream(abs).pipe(res);
          }

          if (req.method === "GET" && seg[0] === "status") {
            return sendJson(res, 200, { ...(await buildStatus()), root: REPO_ROOT });
          }

          if (req.method === "GET" && seg[0] === "file") {
            const rel = u.searchParams.get("path");
            if (!safeRel(rel)) return sendJson(res, 400, { error: "bad path" });
            const status = await fileStatus(rel);
            if (!status) return sendJson(res, 404, { error: "page not found" });
            const text = await fs.readFile(path.join(KB_DIR, rel), "utf8");
            // 画面变了的图，把「写的时候看到的那一版」从缓存里找出来，给审阅台并排看
            for (const r of status.refs) {
              if (r.type === "shot" && r.was && r.state === "changed") r.wasMedia = await blobPath(r.was, ".png");
            }
            const bodyStart = text.split("\n").length - parseFrontMatter(text).body.split("\n").length + 1;
            return sendJson(res, 200, { ...status, text, abs: path.join(KB_DIR, rel), sections: sectionsOf(text), bodyStart });
          }

          if (req.method === "POST" && seg[0] === "edit") {
            // 按段改正文：[start, end) 行换成 after。before 是打开时看到的那一段——
            // 对不上说明这期间被别人（Agent、编辑器）改过，拒绝，不互相覆盖
            const body = await readBody(req);
            if (!safeRel(body.path)) return sendJson(res, 400, { error: "bad path" });
            if (pageBusy(body.path)) return sendJson(res, 409, { error: "示范录制正在往这一页放东西，等它跑完再改" });
            const abs = path.join(KB_DIR, body.path);
            const text = await fs.readFile(abs, "utf8");
            const lines = text.split("\n");
            const bodyStart = lines.length - parseFrontMatter(text).body.split("\n").length + 1;
            const start = Number(body.start);
            const end = Number(body.end);
            if (!(start >= bodyStart && end > start && end <= lines.length + 1)) return sendJson(res, 400, { error: "行号不对，或者想改的是页头（front-matter 请在编辑器里改）" });
            if (lines.slice(start - 1, end - 1).join("\n") !== String(body.before)) return sendJson(res, 409, { error: "这一段在你打开之后被改过（Agent 或编辑器），刷新一下再改" });
            const after = String(body.after ?? "").replace(/\r\n/g, "\n").replace(/\n+$/, "");
            // 段尾统一留一个空行再接下一段；只动这一段，别处的空行一个不碰
            lines.splice(start - 1, end - start, ...after.split("\n"), ...(end <= lines.length ? [""] : []));
            await fs.writeFile(abs, lines.join("\n"));
            return sendJson(res, 200, { ok: true });
          }

          if (req.method === "GET" && seg[0] === "structure") {
            const rel = u.searchParams.get("path");
            if (!safeRel(rel)) return sendJson(res, 400, { error: "bad path" });
            const s = await structureOf(rel);
            return s ? sendJson(res, 200, s) : sendJson(res, 404, { error: "page not found" });
          }

          if (req.method === "GET" && seg[0] === "demo-config") {
            const adapter = await loadAdapter();
            return sendJson(res, 200, { selectorHelper: SELECTOR_HELPER, fieldSelector: adapter.fieldSelector ?? null });
          }

          if (req.method === "POST" && (seg[0] === "clip" || seg[0] === "shot")) {
            const body = await readBody(req);
            const isShot = seg[0] === "shot";
            if (!safeRel(body.page) || !body.route || !Array.isArray(body.steps) || (!isShot && !body.steps.length)) return sendJson(res, 400, { error: isShot ? "要有页面和路由" : "要有页面、路由和至少一步操作" });
            // 示范和重拍各起一个浏览器，同时跑会抢端口
            const busy = busyWith();
            if (busy) return sendJson(res, 409, { error: `${busy}，等它跑完再示范` });
            const spec = demoSpec(body);
            if (isShot) Object.assign(spec, body.clip ? { clip: String(body.clip).slice(0, 300) } : {}, body.marks ? { marks: true } : {});
            const file = path.join(os.tmpdir(), `kb-${seg[0]}-${Date.now()}.json`);
            await fs.writeFile(file, JSON.stringify(spec, null, 2));
            // 截图与录屏共用一个槽位：审阅台只盯这一个「示范」任务
            if (!ROUTE_RE.test(spec.route)) return sendJson(res, 400, { error: "起点路由不对" });
            if (!startJob("clip", isShot ? "kb-add-shot.mjs" : "kb-add-clip.mjs", ["--spec", file], { page: spec.page })) return sendJson(res, 409, { error: "已经有一次示范在跑", job: jobs.clip });
            return sendJson(res, 200, { job: jobs.clip });
          }

          if (req.method === "GET" && seg[0] === "plan-config") {
            const types = Object.fromEntries(Object.entries(TOPIC_TYPES).map(([k, t]) => [k, { label: t.label, reader: t.reader, sections: t.sections.map((x) => x.title) }]));
            return sendJson(res, 200, { types, slotKinds: SLOT_KINDS });
          }

          if (req.method === "POST" && seg[0] === "topic") {
            const body = await readBody(req);
            if (!safeRel(body.path)) return sendJson(res, 400, { error: "页面路径要是 <模块>/<名字>.md" });
            const list = (v) => (Array.isArray(v) ? v : String(v ?? "").split(/[,，\s]+/)).map((x) => String(x).trim()).filter(Boolean).slice(0, 8);
            try {
              const rel = await createTopicPage({ path: body.path, title: String(body.title ?? "").trim().slice(0, 60), type: body.type, topic: String(body.topic ?? "").slice(0, 200), pages: list(body.pages), frs: list(body.frs) });
              return sendJson(res, 200, { path: rel });
            } catch (e) {
              return sendJson(res, 400, { error: e.message });
            }
          }

          if (req.method === "POST" && seg[0] === "plan") {
            const body = await readBody(req);
            if (!safeRel(body.path)) return sendJson(res, 400, { error: "bad path" });
            if (pageBusy(body.path)) return sendJson(res, 409, { error: "示范录制正在往这一页放东西，等它跑完再调" });
            const abs = path.join(KB_DIR, body.path);
            const text = await fs.readFile(abs, "utf8");
            try {
              await fs.writeFile(abs, applyPlanOp(text, body));
            } catch (e) {
              return sendJson(res, e.code ?? 400, { error: e.message });
            }
            return sendJson(res, 200, { ok: true });
          }

          if (req.method === "POST" && seg[0] === "ack") {
            const body = await readBody(req);
            if (!safeRel(body.path)) return sendJson(res, 400, { error: "bad path" });
            const r = await ack(body.path, Array.isArray(body.refs) && body.refs.length ? body.refs : null);
            return sendJson(res, 200, r);
          }

          if (req.method === "POST" && seg[0] === "adopt") {
            const body = await readBody(req);
            if (!safeRel(body.path) || !body.ref) return sendJson(res, 400, { error: "bad request" });
            return sendJson(res, 200, await adoptFact(body.path, body.ref));
          }

          if (req.method === "POST" && seg[0] === "shoot") {
            const body = await readBody(req);
            const keys = Array.isArray(body.keys) ? body.keys.filter((k) => /^[\w./-]+$/.test(k)) : [];
            const argv = body.stale ? ["shoot", "--stale"] : ["shoot", ...keys];
            if (!body.stale && !keys.length) return sendJson(res, 400, { error: "要给 keys 或 stale" });
            if (jobs.clip?.running) return sendJson(res, 409, { error: "示范录制还在跑，等它跑完再重拍" });
            // 截图脚本默认连 5273——仓库约定 dev 端口固定、占用即报错，不会悄悄换端口
            if (!startJob("shoot", "kb.mjs", argv)) return sendJson(res, 409, { error: "已经有一轮重拍在跑", job: jobs.shoot });
            return sendJson(res, 200, { job: jobs.shoot });
          }

          if (req.method === "POST" && seg[0] === "publish") {
            const body = await readBody(req);
            // 重拍到一半就发，云端会拿到一半新一半旧的图
            if (!body.dryRun && busyWith()) return sendJson(res, 409, { error: `${busyWith()}，等它跑完再发布` });
            if (!startJob("publish", "kb-publish.mjs", body.dryRun ? ["--dry-run"] : [])) return sendJson(res, 409, { error: "已经有一次发布在跑", job: jobs.publish });
            return sendJson(res, 200, { job: { ...jobs.publish, dryRun: !!body.dryRun } });
          }

          if (req.method === "GET" && seg[0] === "job") {
            const name = u.searchParams.get("name");
            const job = jobs[name] ?? null;
            return sendJson(res, 200, { job: job && { ...job, dryRun: name === "publish" && job.argv.includes("--dry-run") } });
          }


          return sendJson(res, 404, { error: "not found" });
        } catch (err) {
          return sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
        }
      });
    },
  };
}
