import { useEffect, useMemo, useRef, useState } from "react";
import { useSnapshot } from "valtio";

import { Btn, cx } from "../core/ui";
import { paintDiagrams, renderMarkdown } from "./md-lite";
import { MediaWarnings, StructureView } from "./StructureView";
import {
  REF_STATE_LABEL,
  ackRefs,
  adoptFact,
  basisText,
  copyForAgent,
  focusSlot,
  notify,
  openFile,
  openInEditor,
  openLightbox,
  refTitle,
  saveBlock,
  setView,
  shoot,
  studioState,
  videoOf,
} from "./store";
import "./FileView.less";

const flat = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const GUIDE_KEY = "builder-kit:content-check-guide";
const fmt = (iso) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}-${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
/** 只有位置尺寸走内联；框的颜色在样式表里 */
const box = (b) => ({ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%` });
/** 截图的变化条目（见 media-ledger 的 compareMedia）：side 说框画在哪张上——没了的在上次那张，其余在现在这张 */
const changesOf = (r) => (r.state === "changed" ? r.visual?.changes ?? [] : []);
/** 同一条重复太多处（整张表换了数据）默认不框，框满一屏等于没框；悬停那一条时只框它 */
const BOX_LIMIT = 8;
const boxesOn = (changes, side, hot = null) =>
  changes.flatMap((c, i) => {
    if (c.side !== side) return [];
    if (hot !== null) return hot === i ? c.boxes : [];
    return c.boxes.length <= BOX_LIMIT ? c.boxes : [];
  });
/** 两张图标题旁的一句。按画面清单比的，变了什么在图下面逐条写；按像素比的只能说框了哪里 */
const captionNote = (r, side, boxes) => {
  const v = r.state === "changed" ? r.visual : null;
  if (!v?.cells) return "";
  if (side === "was") return boxes.length ? " · 框出来的现在没了" : "";
  if (v.wide === "area") return " · 大面积变化，框不出重点，点开两版来回切着看";
  if (v.wide === "scattered") return ` · 变化零散地分布在 ${v.spots} 处，框不出重点，点开两版来回切着看`;
  if (!boxes.length) return "";
  return ` · 框出来的是变了的${v.basis === "pixels" && v.more ? `，另有 ${v.more} 处零星改动没框` : ""}`;
};
const codeFile = (r) => String(r.basis ?? "").match(/^code:(.+)$/)?.[1] ?? "";
const rowsOf = (t) => Math.min(36, Math.max(6, t.split("\n").length + 1));
/** 改过的页面文件，列两个，其余说个数 */
const staleFiles = (items) => {
  const files = [...new Set(items.flatMap((r) => [...(r.changed ?? []), ...(r.added ?? [])]))].map((x) => x.split("/").pop());
  return files.length > 2 ? `${files.slice(0, 2).join("、")} 等 ${files.length} 个文件` : files.join("、") || "依赖的文件";
};

/** 卡片上的图：变了的截图给两版，←→ 来回切；录屏放 mp4 */
function zoom(r, index) {
  const now = `/__builder_studio/media/${r.media}?v=${r.value}`;
  if (r.type === "clip") return openLightbox([{ src: now, video: videoOf(now), caption: r.caption || r.key }]);
  const changes = changesOf(r);
  const items = [];
  if (r.wasMedia) items.push({ src: `/__builder_studio/media/${r.wasMedia}`, label: "上次确认时", caption: r.caption || r.key, regions: boxesOn(changes, "was") });
  items.push({ src: now, label: "现在", caption: r.caption || r.key, regions: boxesOn(changes, "now") });
  openLightbox(items, Math.min(index, items.length - 1));
}

/** 复制给 Agent 的指令：说清是哪一处、怎么了、要它做到什么程度 */
function agentGoalFor(r) {
  if (r.type === "fact" && r.state === "missing")
    return `第 ${r.line} 行照抄的「${flat(r.text)}」，在出处（${basisText(r.basis)}）里已经找不到了。对照出处现在的内容改写这一句，照抄的部分重新标上事实标记；别的段落不动。`;
  if (r.type === "fact") return `第 ${r.line} 行照抄的「${flat(r.text)}」：${r.reason}。按出处（${basisText(r.basis)}）现在的写法判断这一句还对不对，不对就改；对就不用动，并说明理由。`;
  if (r.type === "spec") return `这篇挂靠的需求 ${r.key} 改过了。读需求规格现在的写法，找出这篇里不再成立的描述改掉；仍然成立的不动。`;
  return `第 ${r.line} 行的${r.type === "clip" ? "录屏" : "截图"}「${r.caption || r.key}」：${r.reason}。对照现在的界面和需求规格，判断这张图旁边的正文还对不对：不对就改成一致的，对就不用动，并说明理由。`;
}

function RefCard({ f, r, busy, persistent, root, onEdit, advanced }) {
  const changes = changesOf(r);
  // 悬停在某一条变化上：两张图上只框这一条
  const [hot, setHot] = useState(null);
  const wasBoxes = boxesOn(changes, "was", hot);
  const nowBoxes = boxesOn(changes, "now", hot);
  const v = r.state === "changed" ? r.visual : null;
  const listed = v?.basis === "layout";
  const media = r.type === "shot" || r.type === "clip";
  const toAgent = advanced ? (
    <Btn kind="ghost" size="sm" title="复制一条说清这一处的修改要求，交给 IDE 里的 AI" onClick={() => copyForAgent(f.path, agentGoalFor(r))}>
      让 AI 修改
    </Btn>
  ) : null;
  return (
    <article className={cx("fv-card", `is-${r.state}`)}>
      <header className="fv-card-head">
        <span className="fv-kind" title={media ? r.key : undefined}>
          {refTitle(r)}
        </span>
        <span className="fv-state">{REF_STATE_LABEL[r.state]}</span>
        <button type="button" className="fv-line" title={`在编辑器里定位到第 ${r.line} 行`} onClick={() => openInEditor(f.abs, r.line)}>
          查看原文
        </button>
      </header>
      <p className="fv-reason">{r.reason}</p>
      {r.type === "spec" && (
        <>
          {r.specSummary && <p className="fv-quote is-now">{r.specSummary}</p>}
          <p className="st-help">
            {r.state === "changed"
              ? "需求文档更新了：打开看变更，或让 AI 按新需求核对这篇。确认这处只表示这篇内容仍然成立。"
              : "这篇关联了需求文档；先打开核对内容，再决定是否确认。"}
          </p>
        </>
      )}
      {r.warnings?.length > 0 && <MediaWarnings list={r.warnings} />}

      {media && (
        <div className="fv-media">
          {r.wasMedia && (
            <figure>
              <figcaption>
                上次确认时
                {captionNote(r, "was", wasBoxes) && <span className="st-muted">{captionNote(r, "was", wasBoxes)}</span>}
              </figcaption>
              <div className="fv-shot" title="点开看大图，← → 两版来回切" onClick={() => zoom(r, 0)}>
                <img src={`/__builder_studio/media/${r.wasMedia}`} alt="上次确认时的那一版" />
                {wasBoxes.map((b, i) => (
                  <i key={i} className="fv-region" style={box(b)} />
                ))}
              </div>
            </figure>
          )}
          {!r.missing && (
            <figure>
              <figcaption>
                {r.wasMedia || r.type === "clip" || r.state !== "changed" ? "现在" : "现在（上次确认的那版没留底，比不了）"}
                {captionNote(r, "now", nowBoxes) && <span className="st-muted">{captionNote(r, "now", nowBoxes)}</span>}
              </figcaption>
              <div className="fv-shot" title={r.type === "clip" ? "点开播放视频版" : "点开看大图"} onClick={() => zoom(r, r.wasMedia ? 1 : 0)}>
                <img src={`/__builder_studio/media/${r.media}?v=${r.value}`} alt={r.caption || r.key} />
                {nowBoxes.map((b, i) => (
                  <i key={i} className="fv-region" style={box(b)} />
                ))}
              </div>
            </figure>
          )}
        </div>
      )}
      {listed && (
        <ul className="fv-changes" onMouseLeave={() => setHot(null)}>
          {changes.map((c, i) => (
            <li key={i} className={cx(hot === i && "is-hot")} onMouseEnter={() => setHot(i)}>
              {c.text}
            </li>
          ))}
          {v.more > 0 && <li className="st-muted">另有 {v.more} 处变化没列出</li>}
          {v.moved > 0 && <li className="st-muted">{changes.length ? "另有" : "东西都在，只是"} {v.moved} 处挪了位置</li>}
        </ul>
      )}
      {media && r.state === "changed" && (
        <p className="st-help">
          {r.type === "clip" && "录屏每录一次都不完全一样，比不出差异，只能提醒页面代码改过。"}
          对照这一段正文：说的和现在的画面还一致，就「确认没问题」；不一致就自己「改这一段」，或「复制给 Agent」对着新图改。
        </p>
      )}
      {media && r.state === "unreviewed" && <p className="st-help">新放进来的，看一眼拍得对不对、和旁边的正文配不配。</p>}

      {r.type === "fact" && (
        <>
          <blockquote className="fv-quote">{r.text}</blockquote>
          <p className="st-help">出处：{basisText(r.basis)}</p>
          {r.now && r.adoptable && (
            <>
              <p className="st-help">需求规格现在写的是：</p>
              <blockquote className="fv-quote is-now">{r.now}</blockquote>
            </>
          )}
        </>
      )}
      {r.type === "spec" && r.state === "changed" && <p className="st-help">需求改了，这篇可能有地方要跟着改：打开需求件套看改了什么，或复制给 Agent 对一遍。</p>}

      <div className="st-row">
        {r.type === "fact" && r.adoptable ? (
          <>
            <Btn kind="primary" size="sm" disabled={busy} title="把正文里这句换成需求规格现在的写法" onClick={() => adoptFact(f.path, r.id)}>
              采用新写法
            </Btn>
            <Btn size="sm" disabled={busy} title="规格的措辞变了，但这篇原来的说法仍然对：确认它，规格再变才会再提醒" onClick={() => ackRefs(f.path, [r.id])}>
              保留现在的写法
            </Btn>
            {toAgent}
          </>
        ) : r.state === "missing" ? (
          <>
            {r.type === "shot" && r.hasRecipe && (
              <Btn size="sm" onClick={() => shoot({ keys: [r.key] })}>
                拍这一张
              </Btn>
            )}
            {persistent && (
              <Btn size="sm" onClick={() => onEdit(r.line)}>
                编辑正文
              </Btn>
            )}
            {toAgent}
            {codeFile(r) && (
              <Btn kind="ghost" size="sm" title={codeFile(r)} onClick={() => openInEditor(`${root}/${codeFile(r)}`)}>
                打开出处文件
              </Btn>
            )}
            <span className="st-muted fv-note">找不到的确认不了，要改正文{r.type === "shot" ? "或重拍" : ""}</span>
          </>
        ) : (
          <>
            <Btn size="sm" disabled={busy || !persistent} title="看过了，旁边的正文仍然对：记下现在这一版，它再变才会再提醒" onClick={() => ackRefs(f.path, [r.id])}>
              确认这处
            </Btn>
            {r.type !== "spec" && persistent && (
              <Btn kind="ghost" size="sm" onClick={() => onEdit(r.line)}>
                改这一段
              </Btn>
            )}
            {toAgent}
            {r.type === "shot" && r.hasRecipe && r.state === "changed" && (
              <Btn kind="ghost" size="sm" title="觉得这张拍坏了（没加载完、弹窗没弹出来）才用：重拍一次，再和上次确认的比。不改正文" onClick={() => shoot({ keys: [r.key] })}>
                重拍这张
              </Btn>
            )}
            {r.type === "spec" && (
              <Btn kind="ghost" size="sm" onClick={() => openInEditor(`${root}/docs/features/${r.key}/FRS.json`)}>
                查看需求文档
              </Btn>
            )}
          </>
        )}
      </div>
    </article>
  );
}

/**
 * 一份文档：要看的地方摆在上面，渲染好的正文在下面、就地高亮；右边是目录。
 *
 * 每条引用的出路：确认没问题（记进锁）、换成新写法（只有需求规格的原文能自动换）、改这一段、复制给 Agent。
 *
 * 正文按标题切成一段一段，每段能就地改：改的就是 md 本身，不另存一份。保存时服务端核对
 * 这一段在打开之后没被别人（Agent、编辑器）动过，动过就拒绝——不互相覆盖。
 */
export function FileView() {
  const snap = useSnapshot(studioState);
  const f = snap.file;
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState(null);
  const [advanced, setAdvanced] = useState(false);
  const [guideOpen, setGuideOpen] = useState(() => {
    try {
      return localStorage.getItem(GUIDE_KEY) !== "1";
    } catch {
      return false;
    }
  });
  const rootRef = useRef(null);
  const editorRef = useRef(null);

  useEffect(() => setEditing(null), [f?.path]);
  useEffect(() => {
    if (!editing) return;
    editorRef.current?.focus();
    document.getElementById(`fv-blk-${editing.start}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [editing?.start]);

  const open = useMemo(() => (f?.refs ?? []).filter((r) => r.state !== "ok" && !r.unverified), [f]);
  const queue = useMemo(
    () => (snap.status?.files ?? []).filter((x) => !x.iterating && (x.open || 0) + (x.unfilled || 0) > 0),
    [snap.status],
  );
  const queueIndex = queue.findIndex((x) => x.path === f?.path);
  // 这篇用到的截图录屏里，拍完之后页面代码改过的：重拍在这一篇里做，不另设一张清单
  const stale = useMemo(() => {
    const keys = new Set(snap.status?.files.find((x) => x.path === f?.path)?.stale ?? []);
    return (snap.status?.reshoot ?? []).filter((r) => keys.has(r.recipe));
  }, [snap.status, f?.path]);
  const renderOpts = useMemo(() => {
    if (!f) return null;
    const openMedia = new Set(open.filter((r) => r.type === "shot" || r.type === "clip").map((r) => r.key));
    const openFacts = new Set(open.filter((r) => r.type === "fact").map((r) => `${r.basis}\u0001${flat(r.text)}`));
    return { basePage: f.path, openMedia, openFacts, bust: f.loadedAt };
  }, [f, open]);

  /** 按标题切段：每个标题到下一个标题之前是一段，第一个标题前的开场也是一段。行号按整篇文件算 */
  const blocks = useMemo(() => {
    if (!f) return [];
    const lines = f.text.split("\n");
    const first = f.bodyStart ?? 1;
    const starts = [...new Set([first, ...(f.sections ?? []).map((x) => x.line).filter((l) => l > first)])].sort((a, b) => a - b);
    const out = [];
    starts.forEach((start, k) => {
      const end = starts[k + 1] ?? lines.length + 1;
      const raw = lines.slice(start - 1, end - 1).join("\n");
      if (!raw.trim()) return;
      out.push({ start, end, raw, open: open.filter((r) => r.line >= start && r.line < end).length, html: renderMarkdown(raw, { ...renderOpts, lineOffset: start - 1 }) });
    });
    return out;
  }, [f, open, renderOpts]);

  // 正文里的流程图：渲染完再画（库按需加载）；编辑时的预览同理
  useEffect(() => {
    paintDiagrams(rootRef.current);
  }, [blocks, draft, editing, snap.view]);

  if (!f) return <div className="fv"><div className="fv-loading">读取中…</div></div>;

  const broken = open.filter((r) => r.state === "missing");
  const ackable = open.filter((r) => r.state !== "missing");
  const todoCount = open.length;
  const pageTodo = todoCount + (f.unfilled || 0);
  const root = snap.status?.root ?? "";
  const busy = !!snap.busy;
  const byStart = new Map(blocks.map((b) => [b.start, b.open]));
  const toc = (f.sections ?? []).filter((x) => x.level >= 2 && x.level <= 4).map((x) => ({ ...x, open: byStart.get(x.line) ?? 0 }));
  const blockAt = (line) => blocks.find((b) => line >= b.start && line < b.end) ?? null;
  const dismissGuide = () => {
    setGuideOpen(false);
    try {
      localStorage.setItem(GUIDE_KEY, "1");
    } catch {
      // localStorage 不可用时只关掉本次提示
    }
  };
  const startChecking = () => {
    if (todoCount > 0) {
      rootRef.current?.querySelector(".fv-card")?.scrollIntoView({ block: "start", behavior: "smooth" });
    } else if (f.unfilled > 0) {
      setView("structure");
    }
  };
  const nextPage = () => {
    if (queue.length < 2) return;
    const next = queue[(Math.max(queueIndex, 0) + 1) % queue.length];
    if (next) openFile(next.path);
  };

  const startEdit = (b) => {
    if (editing && draft !== editing.before && editing.start !== b.start) return notify("先保存或取消正在改的那一段");
    setEditing({ start: b.start, end: b.end, before: b.raw });
    setDraft(b.raw);
  };
  const editAt = (line) => {
    const b = blockAt(line);
    if (b) startEdit(b);
  };
  const save = async () => {
    if (!editing || saving || draft === editing.before) return;
    setSaving(true);
    try {
      await saveBlock(f.path, editing, draft);
      setEditing(null);
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setSaving(false);
    }
  };
  const jump = (line) => {
    const b = blockAt(line);
    if (!b) return;
    document.getElementById(`fv-blk-${b.start}`)?.scrollIntoView({ block: "start", behavior: "smooth" });
    setFlash(b.start);
    window.setTimeout(() => setFlash(null), 1600);
  };
  const onDocClick = (e) => {
    const slot = e.target.closest?.(".md-slot");
    if (slot && !e.target.closest(".fv-editor")) return focusSlot(Number(slot.getAttribute("data-slot")));
    const img = e.target.closest?.("img");
    if (!img || e.target.closest(".fv-editor")) return;
    const src = img.getAttribute("src");
    openLightbox([{ src, video: videoOf(src), caption: img.getAttribute("alt") }]);
  };

  return (
    <div ref={rootRef} className={cx("fv", snap.view === "structure" && "is-wide")}>
      <header className="fv-head">
        <div className="fv-title">
          <h3>{f.title}</h3>
          <p className="st-help">
            {f.path}
            {f.docStatus && ` · ${f.docStatus}`} · {f.reviewedAt ? `上次确认 ${fmt(f.reviewedAt)}` : "从没确认过"} · 用了 {f.refs.length} 处图与原文
            {f.unfilled > 0 && ` · ${f.unfilled} 处待补充`}
          </p>
          {f.topic && <p className="fv-topic">话题：{f.topic}</p>}
          <p className="fv-progress">
            {queue.length > 1 ? `待检查 ${queue.length} 篇 · 第 ${Math.max(queueIndex + 1, 1)} 篇` : "当前待检查内容"}
            {todoCount > 0 ? ` · 本篇 ${todoCount} 处待确认` : f.unfilled > 0 ? ` · 本篇 ${f.unfilled} 处待补充` : " · 本篇已检查完"}
          </p>
        </div>
        <div className="st-row fv-actions">
          <div className="fv-tabs" role="tablist">
            {[
              ["review", "检查", "待确认内容和可就地编辑的正文"],
              ["structure", "页面结构", "这篇由哪几屏、哪些截图录屏和原文组成；在这里规划各节、补充内容、示范录制"],
            ].map(([v, label, tip]) => (
              <button key={v} type="button" role="tab" aria-selected={snap.view === v} title={tip} className={cx(snap.view === v && "is-on")} onClick={() => setView(v)}>
                {label}
              </button>
            ))}
          </div>
          {queue.length > 1 && (
            <Btn size="sm" title="打开下一篇待检查的内容" onClick={nextPage}>
              下一篇
            </Btn>
          )}
          <Btn kind="ghost" size="sm" aria-pressed={advanced} title="显示让 AI 修改、结构编辑等高级操作" onClick={() => setAdvanced(!advanced)}>
            {advanced ? "收起高级" : "高级"}
          </Btn>
          <Btn title="md 就是这篇的唯一真源，大改在编辑器里做" onClick={() => openInEditor(f.abs, 1)}>
            在编辑器打开
          </Btn>
        </div>
      </header>

      {snap.view === "structure" ? (
        <StructureView />
      ) : (
        <div className="fv-layout">
          <div className="fv-body">
            {f.iterating && (
              <p className="fv-banner">这页标了「正在迭代」：{f.iterating}。页面收口前变动是预期的，不必逐条处理；收口后删掉 front-matter 里的 iterating 再整页过一遍。</p>
            )}

            {guideOpen && pageTodo > 0 && (
              <div className="fv-guide">
                <div>
                  <strong>先看变更，再做确认</strong>
                  <span>每张卡片都列出要判断的内容和来源；确认只记录这次检查，不会发布。</span>
                </div>
                <div className="st-row">
                  <Btn kind="primary" size="sm" onClick={startChecking}>
                    {todoCount > 0 ? "开始检查" : "去补充内容"}
                  </Btn>
                  <Btn kind="ghost" size="sm" onClick={dismissGuide}>
                    知道了
                  </Btn>
                </div>
              </div>
            )}

            {stale.length > 0 && (
              <div className="fv-banner is-stale">
                <span>
                  这篇有 {stale.length} 张截图录屏过期了：拍完之后页面代码改过（{staleFiles(stale)}）。重拍后画面没变就没事；变了的会进下面「要看的」，等你确认。
                </span>
                <Btn size="sm" disabled={!!snap.jobs.shoot?.running || !snap.persistent} onClick={() => shoot({ keys: stale.map((r) => r.recipe) })}>
                  {snap.jobs.shoot?.running ? "重拍中…" : `重拍这 ${stale.length} 张`}
                </Btn>
              </div>
            )}

            {todoCount > 0 ? (
              <section className="fv-open">
                <header className="fv-open-head">
                  <h4>待确认 {todoCount} 处</h4>
                  {ackable.length > 1 && (
                    <Btn size="sm" disabled={busy || !snap.persistent} title="逐张看过、旁边的正文都还对再点：记下现在这一版，它们再变才会再提醒" onClick={() => ackRefs(f.path)}>
                      {snap.busy === "ack" ? "确认中…" : `下面 ${ackable.length} 处图与原文都没问题`}
                    </Btn>
                  )}
                  {ackable.length > 1 && broken.length > 0 && <span className="st-muted">找不到的 {broken.length} 处要改正文</span>}
                </header>
                {open.map((r) => (
                  <RefCard key={r.id} f={f} r={r} busy={busy} persistent={snap.persistent} root={root} onEdit={editAt} advanced={advanced} />
                ))}
              </section>
            ) : (
              <div className="fv-clean">
                {f.unfilled > 0 ? `没有待确认内容，但还有 ${f.unfilled} 处待补充。` : "这一页检查完了，没有待确认内容。"}
                {f.unverified > 0 && `其中 ${f.unverified} 处出自人工记录，系统验不了，改动时留意。`}
                {f.unfilled > 0 && (
                  <Btn kind="primary" size="sm" onClick={() => setView("structure")}>
                    去页面结构补充
                  </Btn>
                )}
                {queue.length > 1 && (
                  <Btn kind="primary" size="sm" onClick={nextPage}>
                    去下一篇
                  </Btn>
                )}
              </div>
            )}

            <section className="fv-doc">
              <h4>
                正文 <span className="st-muted">（高亮的是待确认内容。把鼠标移到段落上点「编辑」可直接改；点图看大图）</span>
              </h4>
              <div className="st-md" onClick={onDocClick}>
                {blocks.map((b) => {
                  const isEditing = editing?.start === b.start;
                  return (
                    <div key={b.start} id={`fv-blk-${b.start}`} className={cx("fv-blk", isEditing && "is-editing", flash === b.start && "is-flash")}>
                      {isEditing ? (
                        <>
                          <div className="fv-editor">
                            <textarea
                              ref={editorRef}
                              value={draft}
                              className="fv-textarea"
                              rows={rowsOf(draft)}
                              spellCheck={false}
                              aria-label="这一段的原文"
                              onChange={(e) => setDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                                  e.preventDefault();
                                  save();
                                }
                                if (e.key === "Escape") setEditing(null);
                              }}
                            />
                            {/* md-lite 先转义全部文本再拼标签 */}
                            <div className="st-md fv-preview" dangerouslySetInnerHTML={{ __html: renderMarkdown(draft, renderOpts) }} />
                          </div>
                          <p className="st-help">
                            左边是 md 原文，右边是预览。<code>&lt;!--f …--&gt;</code> 包着的是照抄来的原文，改了里面的字，这一句会重新进「要看的」；图片那一行就是截图。⌘ / Ctrl + Enter 保存，Esc 取消。
                          </p>
                          <div className="st-row">
                            <Btn kind="primary" size="sm" disabled={saving || draft === editing.before} onClick={save}>
                              保存
                            </Btn>
                            <Btn size="sm" onClick={() => setEditing(null)}>
                              取消
                            </Btn>
                            <Btn kind="ghost" size="sm" onClick={() => openInEditor(f.abs, b.start)}>
                              在编辑器里改
                            </Btn>
                          </div>
                        </>
                      ) : (
                        <>
                          {snap.persistent && (
                            <button
                              type="button"
                              className="fv-edit"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEdit(b);
                              }}
                            >
                              编辑
                            </button>
                          )}
                          <div dangerouslySetInnerHTML={{ __html: b.html }} />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <aside className="fv-rail" aria-label="目录">
            <p className="fv-rail-title">目录</p>
            {todoCount > 0 && (
              <button type="button" className="fv-toc is-top" onClick={() => rootRef.current?.querySelector(".fv-open")?.scrollIntoView({ block: "start", behavior: "smooth" })}>
                待确认 {todoCount} 处
              </button>
            )}
            {toc.map((t) => (
              <button key={t.line} type="button" className={cx("fv-toc", `is-h${t.level}`, t.open && "is-open")} onClick={() => jump(t.line)}>
                <span>{t.text}</span>
                {t.open > 0 && <em>{t.open}</em>}
              </button>
            ))}
          </aside>
        </div>
      )}
    </div>
  );
}
