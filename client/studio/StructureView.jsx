import { Background, Controls, Handle, MiniMap, Position, ReactFlow, ReactFlowProvider, useNodesState, useReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo, useState } from "react";
import { useSnapshot } from "valtio";

import { Btn, cx } from "../core/ui";
import { BASIS_LABEL, REF_STATE_LABEL, copyForAgent, loadPlanConfig, notify, openInEditor, openLightbox, planOp, shoot, startDemo, studioState, videoOf } from "./store";
import "./StructureView.less";

const FRS_LABEL = { draft: "草案", confirmed: "已确认", in_dev: "开发中", accepting: "验收中", archived: "已归档", missing: "件套不存在" };
const SLOT_NAME = { shot: "截图", clip: "录屏", diagram: "流程图", table: "表格" };
const COL = { src: 0, mid: 280, sec: 610 };
const WIDTH = { source: 210, media: 250, group: 250, slot: 250, section: 290 };
const HEIGHT = { source: 58, media: 62, group: 46, slot: 50, 2: 32, 3: 28, 4: 26 };
// 带意图的标题多一行字
const INTENT_H = 16;
// 适应窗口只缩小不放大：节点少的时候放到 2 倍，字大得像海报，反而看不出结构
const FIT = { padding: 0.12, maxZoom: 1 };
const worst = (states) => ["missing", "changed", "unreviewed", "planned"].find((s) => states.includes(s)) ?? "ok";
const mediaUrl = (m, bust) => `/__builder_studio/media/${m.media}?v=${bust}`;
const TO_AGENT = "复制一条指令，到 IDE 里的 Agent 对话里粘贴";

/* ------------------------------ 节点 ------------------------------ */

const Ports = () => (
  <>
    <Handle type="target" position={Position.Left} isConnectable={false} className="sv-port" />
    <Handle type="source" position={Position.Right} isConnectable={false} className="sv-port" />
  </>
);

function SourceNode({ data }) {
  const x = data.item;
  return (
    <div className={cx("sv-node is-source", data.state && `is-${data.state}`)}>
      <Ports />
      <span className="sv-kind">{x.kind === "route" ? "原型页面" : "需求件套"}</span>
      <span className="sv-label">{x.label}</span>
      <span className="sv-meta">{x.kind === "route" ? `由 ${x.files.length} 个页面文件画出` : x.spec ? "整篇挂靠" : "引用了其中几句"}</span>
    </div>
  );
}

/**
 * 拍完自检出的问题（半截、角标没落上），截图脚本写在台账里。
 * 和「有变化」不是一回事：变化是要人对照正文，这里是图本身拍坏了，重拍多半解决不了，要改配方
 */
export function MediaWarnings({ list }) {
  return (
    <div className="sv-broken">
      <b>这张图拍出来有问题</b>
      <ul>
        {list.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
      <span className="st-help">改 docs/kb/shots.config.mjs 里这张图的配方后再重拍。</span>
    </div>
  );
}

function MediaNode({ data }) {
  const m = data.item;
  const broken = m.warnings?.length > 0;
  return (
    <div className={cx("sv-node is-media", m.open && `is-${m.state}`, broken && "is-broken")}>
      <Ports />
      <img src={mediaUrl(m, data.bust)} alt="" loading="lazy" />
      <span className="sv-text">
        <span className="sv-kind">
          {m.kind === "clip" ? "录屏" : "截图"} · 第 {m.line} 行{broken && " · 拍坏了"}
        </span>
        <span className="sv-label">{m.key.split("/").pop()}</span>
      </span>
    </div>
  );
}

/** 蓝图里还没填的格子：虚线框，写着要用什么讲、讲什么 */
function SlotNode({ data }) {
  const m = data.item;
  return (
    <div className={cx("sv-node is-slot", `is-${m.slot}`)}>
      <Ports />
      <span className="sv-kind">
        待填 · {SLOT_NAME[m.slot]} · 第 {m.line} 行
      </span>
      <span className="sv-label" title={m.hint}>
        {m.hint}
      </span>
    </div>
  );
}

function GroupNode({ data }) {
  const g = data.item;
  return (
    <div className={cx("sv-node is-group", g.open && `is-${g.state}`)}>
      <Ports />
      <span className="sv-kind">
        {BASIS_LABEL[g.kind] || "事实"} · {g.facts.length} 句{g.open ? ` · ${g.open} 句要看` : ""}
      </span>
      <span className="sv-label">{g.label}</span>
    </div>
  );
}

function SectionNode({ data }) {
  const sec = data.item;
  return (
    <div className={cx("sv-node is-section", `is-h${Math.min(4, sec.level)}`, data.open > 0 && "is-changed", sec.intent && "has-intent")}>
      <Ports />
      <span className="sv-text">
        <span className="sv-label">{sec.text}</span>
        {sec.intent && (
          <span className="sv-intent" title={sec.intent}>
            {sec.intent}
          </span>
        )}
      </span>
      {data.folded > 0 && <span className="sv-folded">+{data.folded} 小节</span>}
      {data.slots > 0 && <span className="sv-todo">{data.slots} 待填</span>}
      {data.open > 0 && <span className="sv-badge">{data.open}</span>}
      {sec.id !== "s:top" && (
        <button
          type="button"
          className="sv-add nodrag"
          title="在原型里操作一遍，录成一段录屏放进这一节"
          onClick={(e) => {
            e.stopPropagation();
            data.onRecord(sec);
          }}
        >
          + 录屏
        </button>
      )}
    </div>
  );
}

const NODE_TYPES = { source: SourceNode, media: MediaNode, slot: SlotNode, group: GroupNode, section: SectionNode };

/* ------------------------------ 排版 ------------------------------ */

/**
 * 分层排版：章节按行号往下排；中间一列尽量和它所在的章节对齐；来源对齐它喂的那几个。
 * 这就是初始布局，也是「重新排版」回到的样子——结构由正文决定，拖动只为看清楚，不存。
 *
 * 折叠子章节：三四级标题并进它所属的二级标题，指向它们的线改指二级标题。
 */
function layout(s, { fold, show, bust, onRecord }) {
  const visibleSec = s.sections.filter((x) => !fold || x.level <= 2);
  const owner = {};
  let lastTop = null;
  for (const x of s.sections) {
    if (x.level <= 2) lastTop = x.id;
    owner[x.id] = fold && x.level > 2 && lastTop ? lastTop : x.id;
  }
  const foldedCount = {};
  // 折叠后，子节里要看的几处、待填的几格算到它所属的二级标题上，不能随子节一起藏起来
  const openSum = {};
  const slotSum = {};
  for (const x of s.sections) {
    openSum[owner[x.id]] = (openSum[owner[x.id]] ?? 0) + x.open;
    slotSum[owner[x.id]] = (slotSum[owner[x.id]] ?? 0) + (x.slots ?? 0);
    if (owner[x.id] !== x.id) foldedCount[owner[x.id]] = (foldedCount[owner[x.id]] ?? 0) + 1;
  }

  const pos = {};
  const nodes = [];
  let y = 0;
  for (const sec of visibleSec) {
    const indent = Math.max(0, sec.level - 2) * 16;
    if (sec.level <= 2 && y > 0) y += 10;
    const h = HEIGHT[Math.min(4, Math.max(2, sec.level))] + (sec.intent ? INTENT_H : 0);
    pos[sec.id] = { x: COL.sec + indent, y, h };
    nodes.push({
      id: sec.id,
      type: "section",
      position: { x: COL.sec + indent, y },
      data: { item: sec, open: openSum[sec.id] ?? sec.open, slots: slotSum[sec.id] ?? 0, folded: foldedCount[sec.id] ?? 0, onRecord },
      style: { width: WIDTH.section - indent },
    });
    y += h + 6;
  }

  const mids = [
    ...s.materials.filter((m) => show[m.kind]).map((m) => ({ id: m.id, line: m.line, section: owner[m.section] ?? m.section, type: m.kind === "slot" ? "slot" : "media", item: m })),
    ...(show.fact ? s.groups.map((g) => ({ id: g.id, line: g.line, section: owner[[...g.facts].sort((a, b) => a.line - b.line)[0]?.section] ?? null, type: "group", item: g })) : []),
  ].sort((a, b) => a.line - b.line);
  let cursor = 0;
  for (const m of mids) {
    const h = HEIGHT[m.type];
    const at = pos[m.section];
    const top = Math.max(at ? at.y + at.h / 2 - h / 2 : cursor, cursor);
    pos[m.id] = { x: COL.mid, y: top, h };
    nodes.push({ id: m.id, type: m.type, position: { x: COL.mid, y: top }, data: { item: m.item, bust }, style: { width: WIDTH[m.type] } });
    cursor = top + h + 10;
  }

  // 边：折叠后改指二级标题，重复的合并（取最糟的状态）
  const merged = new Map();
  for (const e of s.edges) {
    const to = owner[e.to] ?? e.to;
    if (!pos[e.from] && !s.sources.some((x) => x.id === e.from)) continue;
    if (!pos[to]) continue;
    const id = `${e.from}->${to}`;
    const prev = merged.get(id);
    merged.set(id, { id, source: e.from, target: to, state: worst([prev?.state, e.state].filter(Boolean)) });
  }

  cursor = 0;
  const sources = s.sources
    .map((x) => {
      const outs = [...merged.values()].filter((e) => e.source === x.id).map((e) => pos[e.target]).filter(Boolean);
      return { x, c: outs.length ? outs.reduce((a, p) => a + p.y + p.h / 2, 0) / outs.length : 0, used: outs.length > 0 || !!x.spec };
    })
    .filter((x) => x.used)
    .sort((a, b) => a.c - b.c);
  for (const { x, c } of sources) {
    const top = Math.max(c - HEIGHT.source / 2, cursor);
    pos[x.id] = { x: COL.src, y: top, h: HEIGHT.source };
    nodes.push({ id: x.id, type: "source", position: { x: COL.src, y: top }, data: { item: x, state: x.spec?.state !== "ok" ? x.spec?.state : null }, style: { width: WIDTH.source } });
    cursor = top + HEIGHT.source + 12;
  }

  const edges = [...merged.values()].filter((e) => pos[e.source]).map((e) => ({ ...e, className: `is-${e.state}`, selectable: false, focusable: false }));
  return { nodes, edges };
}

/* ------------------------------ 画布 ------------------------------ */

function Graph({ s, onPick, selectedId }) {
  const [fold, setFold] = useState(false);
  const [show, setShow] = useState({ shot: true, clip: true, slot: true, fact: true });
  const [hover, setHover] = useState(null);
  const rf = useReactFlow();

  const base = useMemo(() => layout(s, { fold, show, bust: s.loadedAt, onRecord: (sec) => startDemo(s.path, sec) }), [s, fold, show]);
  const [nodes, setNodes, onNodesChange] = useNodesState(base.nodes);

  /**
   * 回到正文决定的排版。保留已经量过的尺寸：同 id 的节点 React 会复用原来的 DOM，
   * 尺寸没变就不会再量一次；新对象不带尺寸的话，React Flow 会把它一直当成「没量过」藏起来，
   * 连线也跟着不画。
   */
  const relayout = () => {
    setNodes((prev) => {
      const measured = new Map(prev.map((n) => [n.id, n.measured]));
      return base.nodes.map((n) => (measured.get(n.id) ? { ...n, measured: measured.get(n.id) } : n));
    });
    requestAnimationFrame(() => rf.fitView({ ...FIT, duration: 200 }));
  };

  // 结构、折叠、筛选一变就回到正文决定的排版，并重新取景
  useEffect(relayout, [base]);
  // 详情一开一合，画布宽度就变了：等它排完再取一次景，免得右边的章节被截掉
  const narrow = selectedId != null;
  useEffect(() => {
    const t = window.setTimeout(() => rf.fitView({ ...FIT, duration: 200 }), 60);
    return () => window.clearTimeout(t);
  }, [narrow]);

  const hot = useMemo(() => {
    if (!hover) return null;
    const set = new Set([hover]);
    for (const e of base.edges) {
      if (e.source === hover) set.add(e.target);
      if (e.target === hover) set.add(e.source);
    }
    return set;
  }, [hover, base.edges]);

  const shownNodes = nodes.map((n) => ({ ...n, selected: n.id === selectedId, className: cx(hot && !hot.has(n.id) && "is-dim") }));
  const shownEdges = base.edges.map((e) => ({ ...e, className: cx(e.className, hot && (e.source === hover || e.target === hover ? "is-hot" : "is-dim")) }));
  const toggle = (k) => setShow({ ...show, [k]: !show[k] });

  return (
    <>
      {/* 工具条放在画布上方，不浮在图上：浮着会压住左上角的节点 */}
      <div className="sv-toolbar">
        <span className="sv-toolbar-label">显示</span>
        {[
          ["shot", "截图"],
          ["clip", "录屏"],
          ["slot", "待填"],
          ["fact", "原文"],
        ].map(([k, label]) => (
          <button key={k} type="button" className={cx("sv-chip", show[k] && "is-on")} aria-pressed={show[k]} onClick={() => toggle(k)}>
            {label}
          </button>
        ))}
        <span className="sv-toolbar-sep" />
        <button type="button" className={cx("sv-chip", fold && "is-on")} aria-pressed={fold} title="三四级标题并进所属的二级标题" onClick={() => setFold(!fold)}>
          折叠子章节
        </button>
        <button type="button" className="sv-chip" title="回到按正文排的位置" onClick={relayout}>
          重新排版
        </button>
        <span className="sv-toolbar-hint">滚轮缩放 · 拖空白处平移 · 节点可拖开看（不保存）</span>
      </div>
      <div className="sv-canvas">
        <ReactFlow
          nodes={shownNodes}
          edges={shownEdges}
          nodeTypes={NODE_TYPES}
          onNodesChange={onNodesChange}
          onNodeClick={(_, n) => onPick(n)}
          onNodeMouseEnter={(_, n) => setHover(n.id)}
          onNodeMouseLeave={() => setHover(null)}
          onPaneClick={() => onPick(null)}
          nodesConnectable={false}
          elementsSelectable
          minZoom={0.2}
          maxZoom={2.5}
          fitView
          fitViewOptions={FIT}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={18} size={1} />
          <Controls showInteractive={false} position="bottom-left" />
          <MiniMap pannable zoomable position="bottom-right" nodeClassName={(n) => cx(`mm-${n.type}`, n.data.item?.open && "is-open")} />
        </ReactFlow>
      </div>
    </>
  );
}

/* ------------------------------ 话题条 ------------------------------ */

/**
 * 这篇讲什么话题、属于哪一类、讲的是哪几屏；蓝图排到哪一步了。
 * 规划与填充交给 IDE 里的 Agent：提议蓝图（只在还没写正文时）、按蓝图写全篇，这里只复制指令。
 */
function TopicBar({ s, cfg }) {
  const slots = s.materials.filter((m) => m.kind === "slot");
  const kinds = Object.entries(SLOT_NAME)
    .map(([k, v]) => [v, slots.filter((m) => m.slot === k).length])
    .filter(([, n]) => n);
  const type = cfg?.types?.[s.type];

  return (
    <div className="sv-topic">
      <div className="sv-topic-main">
        {type ? <span className="sv-type" title={`读者${type.reader}`}>{type.label}</span> : <span className="sv-type is-none">没写话题类型</span>}
        <span className="sv-topic-q">{s.topic || "这篇没写话题（front-matter 的 topic：这篇要回答读者的什么问题）"}</span>
        {s.pages?.length > 0 && <span className="sv-topic-pages">讲的是 {s.pages.join("、")}</span>}
      </div>
      <div className="sv-topic-side">
        {slots.length > 0 ? (
          <span className="sv-topic-todo">
            {slots.length} 格待填（{kinds.map(([v, n]) => `${v} ${n}`).join(" · ")}）
          </span>
        ) : s.type ? (
          <span className="st-muted">格子都填上了</span>
        ) : null}
        {s.planOnly && s.type && s.topic && (
          <Btn size="sm" title={TO_AGENT} onClick={() => copyForAgent(s.path, "按话题提议这篇的蓝图：读 front-matter 里 pages 那几屏的页面代码和挂靠的需求规格，把骨架改成贴合这个话题的结构（分几节、每节回答读者什么、用什么讲），只定结构、不写正文")}>
            复制给 Agent：提议蓝图
          </Btn>
        )}
        {s.type && !s.planOnly && (
          <Btn size="sm" title={TO_AGENT} onClick={() => copyForAgent(s.path, "按蓝图写全篇正文：每节回答它的意图；标题、意图、格子和截图录屏一行不动")}>
            复制给 Agent：写全篇
          </Btn>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ 详情 ------------------------------ */

/** 整篇原文的第 n 行：调整蓝图时带上，服务端核对这一行没在打开之后被改过 */
const rawLine = (file, n) => String(file?.text ?? "").split("\n")[n - 1] ?? null;

function SlotDetail({ x, s, file }) {
  const sec = s.sections.find((y) => y.id === x.section);
  const demo = (kind) => (sec ? startDemo(s.path, sec, { kind, slot: x }) : notify("这个格子不在任何一节里，先挪进某一节", "error"));
  return (
    <>
      <p className="sv-title">{x.hint}</p>
      <p className="st-help">
        第 {x.line} 行 · 在「{sec?.text ?? "开头"}」{x.route ? ` · 从 ${x.route} 取` : ""}
      </p>
      {sec?.intent && <p className="sv-quote">这一节要回答：{sec.intent}</p>}
      <div className="st-row">
        {x.slot === "shot" && (
          <Btn kind="primary" size="sm" onClick={() => demo("shot")}>
            在原型上示范这一屏
          </Btn>
        )}
        {x.slot === "clip" && (
          <Btn kind="primary" size="sm" onClick={() => demo("clip")}>
            在原型上示范这段操作
          </Btn>
        )}
        {(x.slot === "diagram" || x.slot === "table") && (
          <Btn kind="primary" size="sm" title={TO_AGENT} onClick={() => copyForAgent(s.path, `填第 ${x.line} 行的${SLOT_NAME[x.slot]}格子：${x.hint}。读这几屏的页面代码和需求规格，画好或列好之后替换这个格子`)}>
            {x.slot === "diagram" ? "复制给 Agent：画流程图" : "复制给 Agent：列表格"}
          </Btn>
        )}
        <Btn size="sm" onClick={() => planOp(s.path, { op: "remove-slot", slot: x.line, expect: rawLine(file, x.line) })}>
          不要这个格子
        </Btn>
        <Btn kind="ghost" size="sm" onClick={() => openInEditor(file.abs, x.line)}>
          定位到正文
        </Btn>
      </div>
      <p className="st-help">
        {x.slot === "shot" || x.slot === "clip"
          ? "截图和录屏要人在原型上示范：操作到那一屏（截图还要框出范围），工具记下步骤、拍好、填进这个格子。"
          : "流程图和表格交给 IDE 里的 Agent：复制指令粘过去，它画好或列好之后替换这个格子，照抄的原文会标上出处。"}
      </p>
    </>
  );
}

function SectionPlan({ x, s, file, cfg }) {
  const [intent, setIntent] = useState(x.intent ?? "");
  const [kind, setKind] = useState("shot");
  const [hint, setHint] = useState("");
  const [route, setRoute] = useState(s.pages?.[0] ?? "");
  const [title, setTitle] = useState("");
  const [child, setChild] = useState(false);
  useEffect(() => {
    setIntent(x.intent ?? "");
    setHint("");
    setTitle("");
  }, [x.id, x.intent]);
  const expect = rawLine(file, x.line);
  const routes = [...new Set([...(s.pages ?? []), ...s.sources.filter((y) => y.kind === "route").map((y) => y.label)])];
  const needsRoute = kind === "shot" || kind === "clip";

  return (
    <>
      <div className="sv-form">
        <label className="sv-field">
          <span>这一节要回答读者的什么问题</span>
          <textarea rows={2} value={intent} placeholder="一句话，具体到这个话题" onChange={(e) => setIntent(e.target.value)} />
        </label>
        <div className="st-row">
          <Btn size="sm" disabled={intent.trim() === (x.intent ?? "")} onClick={() => planOp(s.path, { op: "intent", section: x.line, intent, expect })}>
            保存意图
          </Btn>
        </div>
      </div>

      <div className="sv-form">
        <span className="sv-form-title">加一个格子</span>
        <div className="sv-kinds" role="radiogroup" aria-label="格子类型">
          {Object.entries(cfg?.slotKinds ?? SLOT_NAME).map(([k, v]) => (
            <button key={k} type="button" role="radio" aria-checked={kind === k} className={cx("sv-chip", kind === k && "is-on")} onClick={() => setKind(k)}>
              {v}
            </button>
          ))}
        </div>
        <input className="sv-input" value={hint} placeholder={needsRoute ? "停在哪一屏、框哪一块，或演示哪个操作" : "画什么关系 / 列哪几列"} onChange={(e) => setHint(e.target.value)} />
        {needsRoute && (
          <select className="sv-input" value={route} aria-label="从哪一屏取" onChange={(e) => setRoute(e.target.value)}>
            <option value="">（不指定哪一屏）</option>
            {routes.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        )}
        <div className="st-row">
          <Btn
            size="sm"
            disabled={!hint.trim()}
            onClick={async () => {
              if (await planOp(s.path, { op: "add-slot", section: x.line, kind, hint, route: needsRoute ? route : null, expect })) setHint("");
            }}
          >
            加上
          </Btn>
        </div>
      </div>

      <div className="sv-form">
        <span className="sv-form-title">在这一节后面加一节</span>
        <input className="sv-input" value={title} placeholder="标题：用读者的话" onChange={(e) => setTitle(e.target.value)} />
        <label className="sv-check">
          <input type="checkbox" checked={child} disabled={x.level >= 4} onChange={(e) => setChild(e.target.checked)} />
          作为它的小节
        </label>
        <div className="st-row">
          <Btn
            size="sm"
            disabled={!title.trim()}
            onClick={async () => {
              if (await planOp(s.path, { op: "add-section", after: x.line, title, level: child ? x.level + 1 : x.level, expect })) setTitle("");
            }}
          >
            加上
          </Btn>
        </div>
      </div>

      <div className="st-row">
        <Btn kind="primary" size="sm" onClick={() => startDemo(s.path, x, { kind: "clip" })}>
          录一段操作放进来
        </Btn>
        <Btn size="sm" onClick={() => startDemo(s.path, x, { kind: "shot" })}>
          拍一张截图放进来
        </Btn>
        {s.type && (
          <Btn size="sm" title={TO_AGENT} onClick={() => copyForAgent(s.path, `按意图写「${x.text}」这一节的正文（第 ${x.line} 行）；格子和截图录屏不动`)}>
            复制给 Agent：写这一节
          </Btn>
        )}
      </div>
    </>
  );
}

function Detail({ sel, s, file, root, cfg, shootRunning, onClose }) {
  const x = sel.item;
  const zoomMedia = (m) => {
    const src = mediaUrl(m, s.loadedAt);
    openLightbox([{ src, video: m.kind === "clip" ? videoOf(src) : null, caption: m.caption || m.key }]);
  };
  const kind =
    sel.type === "media"
      ? x.kind === "clip"
        ? "录屏"
        : "截图"
      : sel.type === "slot"
        ? `待填 · ${SLOT_NAME[x.slot]}`
        : sel.type === "group"
          ? `${BASIS_LABEL[x.kind] || "事实"} · ${x.facts.length} 句`
          : sel.type === "section"
            ? "章节"
            : x.kind === "route"
              ? "原型页面"
              : "需求件套";
  const inSection =
    sel.type === "section"
      ? [
          ...s.materials
            .filter((m) => m.section === x.id)
            .map((m) => ({ id: m.id, line: m.line, open: m.open, planned: m.kind === "slot", label: m.kind === "slot" ? `待填${SLOT_NAME[m.slot]}：${m.hint}` : `${m.kind === "clip" ? "录屏" : "截图"} ${m.key}` })),
          ...s.groups.flatMap((g) => g.facts.filter((f) => f.section === x.id).map((f) => ({ id: f.id, line: f.line, open: f.open, label: `「${f.text.slice(0, 30)}」` }))),
        ].sort((a, b) => a.line - b.line)
      : [];

  return (
    <aside className="sv-detail">
      <header>
        <span className="sv-kind">{kind}</span>
        <Btn kind="ghost" size="sm" onClick={onClose}>
          收起
        </Btn>
      </header>

      {sel.type === "slot" && <SlotDetail x={x} s={s} file={file} />}

      {sel.type === "media" && (
        <>
          {/* 录屏直接放 mp4（能暂停、能拖）；截图点开看原图 */}
          {x.kind === "clip" ? (
            <video key={x.id} className="sv-big" src={videoOf(mediaUrl(x, s.loadedAt))} controls muted loop autoPlay />
          ) : (
            <img className="sv-big is-zoom" src={mediaUrl(x, s.loadedAt)} alt={x.caption || x.key} title="点开看原图" onClick={() => zoomMedia(x)} />
          )}
          <p className="sv-title">{x.caption || x.key}</p>
          <p className="st-help">
            {x.key} · 来自 {x.route || "（没记路由）"}
          </p>
          {x.open && (
            <p className="sv-warn">
              {REF_STATE_LABEL[x.state]}：{x.reason}
            </p>
          )}
          {x.warnings?.length > 0 && <MediaWarnings list={x.warnings} />}
          <div className="st-row">
            <Btn size="sm" onClick={() => zoomMedia(x)}>
              {x.kind === "clip" ? "全屏播放" : "看大图"}
            </Btn>
            <Btn size="sm" onClick={() => openInEditor(file.abs, x.line)}>
              定位到正文
            </Btn>
            <Btn size="sm" disabled={shootRunning} onClick={() => shoot({ keys: [x.key] })}>
              重拍
            </Btn>
          </div>
        </>
      )}

      {sel.type === "group" && (
        <>
          <p className="sv-title">{x.label}</p>
          <p className="st-help">{x.file || x.frs || "人工记录，系统验不了"}</p>
          <ol className="sv-facts">
            {x.facts.map((f) => (
              <li key={f.id} className={cx(f.open && "is-open")}>
                <button type="button" className="sv-line" onClick={() => openInEditor(file.abs, f.line)}>
                  第 {f.line} 行
                </button>
                <span>{f.text}</span>
                {f.open && <em>{f.reason}</em>}
              </li>
            ))}
          </ol>
          {x.file && (
            <div className="st-row">
              <Btn size="sm" title={x.file} onClick={() => openInEditor(`${root}/${x.file}`)}>
                打开这个文件
              </Btn>
            </div>
          )}
        </>
      )}

      {sel.type === "section" && (
        <>
          <p className="sv-title">{x.text}</p>
          <p className="st-help">
            第 {x.line} 行 · {x.refs} 处图与原文{x.open ? `，${x.open} 处要看` : ""}
            {x.slots ? ` · ${x.slots} 个格子待填` : ""}
          </p>
          {inSection.length > 0 && (
            <ul className="sv-facts">
              {inSection.map((i) => (
                <li key={i.id} className={cx(i.open && "is-open", i.planned && "is-planned")}>
                  <button type="button" className="sv-line" onClick={() => openInEditor(file.abs, i.line)}>
                    第 {i.line} 行
                  </button>
                  <span>{i.label}</span>
                </li>
              ))}
            </ul>
          )}
          {x.id !== "s:top" ? (
            <SectionPlan x={x} s={s} file={file} cfg={cfg} />
          ) : (
            <div className="st-row">
              <Btn size="sm" onClick={() => openInEditor(file.abs, x.line)}>
                在编辑器打开
              </Btn>
            </div>
          )}
        </>
      )}

      {sel.type === "source" && (
        <>
          <p className="sv-title">{x.label}</p>
          {x.kind === "route" ? (
            <>
              <p className="st-help">这一屏由下面这些页面文件画出（任何一个改了，用到它的截图录屏就过期了，该重拍）：</p>
              <ul className="sv-files">
                {x.files.slice(0, 14).map((f) => (
                  <li key={f}>{f}</li>
                ))}
                {x.files.length > 14 && <li className="st-muted">…… 还有 {x.files.length - 14} 个</li>}
              </ul>
              <div className="st-row">
                <a className="bk-btn is-sm" href={`/#${x.label}`} target="_blank" rel="noopener noreferrer">
                  打开这一屏
                </a>
              </div>
            </>
          ) : (
            <>
              <p className="st-help">
                {x.key} · {FRS_LABEL[x.status] || x.status}
              </p>
              {x.spec && x.spec.state !== "ok" && <p className="sv-warn">{x.spec.reason}</p>}
              <div className="st-row">
                <Btn size="sm" onClick={() => openInEditor(`${root}/docs/features/${x.key}/FRS.json`)}>
                  打开需求件套
                </Btn>
              </div>
            </>
          )}
        </>
      )}
    </aside>
  );
}

/**
 * 一篇文档的构成：来源 → 素材、事实与待填的格子 → 章节。
 *
 * 画布用 React Flow：能缩放、平移、看小地图，节点可以拖开看清楚——但**位置不存**，
 * 结构就是 md 本身。规划也写回 md：改意图、加删格子、加一节，改的都是正文里的蓝图标记。
 * 上一版画布让人摆节点、连线并存下来，那些位置和连线成了第二份真源。
 */
export function StructureView() {
  const snap = useSnapshot(studioState);
  const s = snap.structure;
  const [sel, setSel] = useState(null);
  const [cfg, setCfg] = useState(null);
  useEffect(() => {
    loadPlanConfig()
      .then(setCfg)
      .catch(() => {});
  }, []);
  useEffect(() => setSel(null), [s?.path]);
  // 选中的节点在重读之后换成新对象（行号可能也变了），按 id 找回来；找不到就收起
  useEffect(() => {
    if (!s) return;
    if (snap.focus) {
      const m = s.materials.find((y) => y.id === snap.focus);
      if (m) setSel({ type: m.kind === "slot" ? "slot" : "media", item: m });
      studioState.focus = null;
      return;
    }
    setSel((cur) => {
      if (!cur) return cur;
      const all = [...s.materials, ...s.sections, ...s.groups, ...s.sources];
      const next = all.find((y) => y.id === cur.item.id);
      return next ? { ...cur, item: next } : null;
    });
  }, [s, snap.focus]);
  if (!s) return <div className="sv-loading">读取中…</div>;

  const pick = (n) => (n ? setSel({ type: n.type, item: n.data.item }) : setSel(null));

  return (
    <div className="sv">
      <div className="sv-flow">
        <TopicBar s={s} cfg={cfg} />
        {/* 换一篇文档整张图重建：两篇里 id 相同的节点（如 s:12）不该复用上一篇量出来的尺寸 */}
        <ReactFlowProvider key={s.path}>
          <Graph s={s} onPick={pick} selectedId={sel?.item.id} />
        </ReactFlowProvider>
      </div>
      {sel && (
        <Detail
          sel={sel}
          s={s}
          file={snap.file ?? {}}
          root={snap.status?.root ?? ""}
          cfg={cfg}
          shootRunning={!!snap.jobs.shoot?.running}
          onClose={() => setSel(null)}
        />
      )}
    </div>
  );
}
