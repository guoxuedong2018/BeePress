import { useEffect, useRef, useState } from "react";
import { useSnapshot } from "valtio";

import { cx } from "../core/ui";
import { actionable, captionFor, installFinder, labelOf, regionSelectorFor, selectorFor } from "./demo-capture";
import { beginRecording, cancelDemo, finishRecording, loadDemoConfig, notify, openDemoResult, pollJob, saveDemo, studioState, submitDemo } from "./store";
import "./DemoRecorder.less";

const STAGES = { clip: ["记下步骤", "录制", "放进正文", "核对"], shot: ["记下步骤", "截图", "放进正文", "核对"] };
const NOUN = { clip: "录屏", shot: "截图" };

/**
 * 示范录制条：浮在原型上。
 *
 * 人在原型里照平时那样点一遍，这里把每次点击记成录屏脚本的一步（选择器 + 字幕），
 * 输入框里敲的字并进前一步。核对完一键交给 dev 服务：写配方、录、放进那一节。
 *
 * 不在这里录视频：示范时人会犹豫、会点错，录下来的节奏没法用。示范只负责「点了什么」，
 * 成片由录屏脚本按统一的节奏重放出来——和手写配方录出来的一样稳。
 *
 * 截图同一条路：操作到要拍的那一屏，框出截图范围（不框就是整屏），由截图脚本重放这几步再拍。
 */
export function DemoRecorder() {
  const snap = useSnapshot(studioState, { sync: true });
  const d = snap.demo;
  const [caption, setCaption] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [marks, setMarks] = useState(false);
  const [picking, setPicking] = useState(false);
  const [box, setBox] = useState(null);
  // 元素 → 它对应的那一步（记在真实 proxy 上）。只在录制期间有意义，不进状态
  const els = useRef(new Map());
  const pickingRef = useRef(false);
  const cand = useRef({ base: null, el: null, stack: [] });
  pickingRef.current = picking;

  const phase = d?.phase;
  const kind = d?.kind === "shot" ? "shot" : "clip";

  // 录制期间：捕获阶段监听按下与输入
  useEffect(() => {
    if (phase !== "recording") return undefined;
    let alive = true;
    els.current = new Map();

    /** 捕获阶段、按下的那一刻就记：点完之后元素可能已经没了（下拉项、关闭按钮） */
    const onDown = (e) => {
      if (e.button !== 0 || !window.__protoFind || pickingRef.current) return;
      if (e.target.closest("[data-review-ui]")) return;
      const el = actionable(e.target);
      const sel = selectorFor(el);
      if (!sel) return notify("这一下没记上：点的地方找不回来，换个位置点", "error");
      const steps = studioState.demo.steps;
      steps.push({ ...sel, caption: captionFor(el), auto: true, initial: "value" in el ? el.value : "", type: null, clear: false });
      els.current.set(el, steps.length - 1);
      saveDemo();
    };
    /** 敲的字并进点中这个输入框的那一步，只留最后的值——录屏里会一个字一个字敲出来 */
    const onInput = (e) => {
      const el = e.target;
      if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) || /checkbox|radio|file/.test(el.type)) return;
      if (el.closest("[data-review-ui]")) return;
      const steps = studioState.demo.steps;
      let i = els.current.get(el);
      if (i == null || !steps[i]) {
        const sel = selectorFor(el);
        if (!sel) return;
        steps.push({ ...sel, caption: captionFor(el), auto: true, initial: "", type: null, clear: false });
        i = steps.length - 1;
        els.current.set(el, i);
      }
      const step = steps[i];
      step.type = el.value;
      step.clear = !!step.initial;
      if (step.auto) {
        const l = labelOf(el);
        step.caption = l ? `在「${l}」里输入「${el.value}」` : `输入「${el.value}」`;
      }
      saveDemo();
    };

    loadDemoConfig()
      .then((cfg) => {
        if (!alive) return;
        installFinder(cfg);
      })
      .catch((e) => notify(`拿不到录制配置：${e.message}`, "error"));
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("input", onInput, true);
    return () => {
      alive = false;
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("input", onInput, true);
    };
  }, [phase]);

  /**
   * 框截图范围：悬停高亮一块，↑ 扩到外层、↓ 缩回，点一下选定。
   * 这期间的按下、点击一律拦在捕获阶段，不让原型收到——框选不是操作
   */
  useEffect(() => {
    if (!picking) return undefined;
    // 上一轮框选的候选要清掉：鼠标还停在同一个元素上时，不清就不会再高亮
    cand.current = { base: null, el: null, stack: [] };
    const ours = (e) => e.target.closest?.("[data-review-ui]");
    const show = (el) => {
      cand.current.el = el;
      const r = el.getBoundingClientRect();
      setBox({ x: r.left, y: r.top, w: r.width, h: r.height });
    };
    const onMove = (e) => {
      if (ours(e) || cand.current.base === e.target) return;
      cand.current = { base: e.target, el: null, stack: [] };
      show(e.target);
    };
    const block = (e) => {
      if (ours(e)) return;
      e.preventDefault();
      e.stopPropagation();
    };
    const stop = () => {
      setPicking(false);
      setBox(null);
    };
    const onPick = (e) => {
      if (ours(e)) return;
      block(e);
      const el = cand.current.el;
      if (!el) return;
      const sel = regionSelectorFor(el);
      if (!sel) return notify("这一块找不回来，按 ↑ 扩到外层再点", "error");
      const r = el.getBoundingClientRect();
      studioState.demo.clip = { ...sel, size: `${Math.round(r.width)}×${Math.round(r.height)}` };
      saveDemo();
      stop();
    };
    const onKey = (e) => {
      const c = cand.current;
      if (e.key === "Escape") stop();
      else if (e.key === "ArrowUp" && c.el?.parentElement && c.el.parentElement !== document.body) {
        e.preventDefault();
        c.stack.push(c.el);
        show(c.el.parentElement);
      } else if (e.key === "ArrowDown" && c.stack.length) {
        e.preventDefault();
        show(c.stack.pop());
      }
    };
    const DOWN = ["pointerdown", "mousedown", "pointerup", "mouseup"];
    document.addEventListener("mousemove", onMove, true);
    for (const t of DOWN) document.addEventListener(t, block, true);
    document.addEventListener("click", onPick, true);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousemove", onMove, true);
      for (const t of DOWN) document.removeEventListener(t, block, true);
      document.removeEventListener("click", onPick, true);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [picking]);

  useEffect(() => {
    if (phase === "review" && !caption) setCaption(studioState.demo.section.text);
    if (phase === "running") pollJob("clip");
  }, [phase]);

  if (!d) return null;

  const job = snap.jobs.clip;
  const running = !job || job.running;
  const ok = !!job && !job.running && job.code === 0;
  const stages = STAGES[kind];
  const stageMatches = [...String(job?.output ?? "").matchAll(/▸ (\d)\/4/g)];
  const stage = stageMatches.length ? Number(stageMatches[stageMatches.length - 1][1]) - 1 : -1;
  const tail = String(job?.output ?? "").trim().split("\n").slice(-8).join("\n") || "排队中…";
  const stageClass = (i) => {
    if (!running && !ok && i === stage) return "is-failed";
    if (i < stage || (ok && i <= stage)) return "is-done";
    if (i === stage) return "is-now";
    return "";
  };
  const last = d.steps[d.steps.length - 1];

  const redo = () => {
    studioState.demo.phase = "arming";
    studioState.demo.steps = [];
    saveDemo();
  };
  const submit = async () => {
    setSubmitting(true);
    try {
      await submitDemo({ caption: caption.trim() || d.slot?.hint || d.section.text, marks });
    } catch {
      // 提示已经给了
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    {/* 框选时的高亮。放在 .dr 外面：.dr 有 transform，里面的 fixed 会以它为参照。
        只有位置尺寸走内联，框的颜色在样式表里；不接事件，免得挡住下面的元素 */}
    {picking && box && <i className="dr-pick" data-review-ui style={{ left: box.x, top: box.y, width: box.w, height: box.h }} aria-hidden="true" />}
    <div className="dr" data-review-ui>
      {d.phase === "arming" && (
        <div className="dr-bar">
          <span className="dr-dot" />
          <div className="dr-text">
            <strong>
              {kind === "shot" ? "拍一张截图" : "录一段操作"}，放进「{d.section.text}」{d.slot ? `的格子：${d.slot.hint}` : ""}
            </strong>
            <span>
              先去到起点页面，再点「开始」。页面会刷新一下，从刚打开的样子开始记{kind === "shot" ? "；操作到要拍的那一屏，框出范围" : ""}。
            </span>
          </div>
          <button type="button" className="dr-btn is-primary" onClick={beginRecording}>
            开始
          </button>
          <button type="button" className="dr-btn" onClick={cancelDemo}>
            取消
          </button>
        </div>
      )}

      {d.phase === "recording" && (
        <div className="dr-bar">
          <span className="dr-dot is-rec" />
          <div className="dr-text">
            <strong>
              {kind === "shot" ? "操作到要拍的那一屏" : "录制中"} · 已记 {d.steps.length} 步
              {kind === "shot" && ` · ${d.clip ? `范围 ${d.clip.size}` : "整屏"}`}
            </strong>
            <span>{picking ? "悬停选一块，↑ 扩到外层、↓ 缩回，点一下选定；Esc 退出" : last ? last.caption : "照平时那样操作。这条录制条上的点击不会被记下"}</span>
          </div>
          {kind === "shot" && (
            <button type="button" className={cx("dr-btn", picking && "is-on")} onClick={() => setPicking(!picking)}>
              {picking ? "退出框选" : d.clip ? "重新框范围" : "框出截图范围"}
            </button>
          )}
          <button
            type="button"
            className="dr-btn"
            disabled={!d.steps.length}
            onClick={() => {
              studioState.demo.steps.pop();
              saveDemo();
            }}
          >
            撤销上一步
          </button>
          <button type="button" className="dr-btn is-primary" disabled={(kind === "clip" && !d.steps.length) || picking} onClick={finishRecording}>
            完成
          </button>
          <button type="button" className="dr-btn" onClick={cancelDemo}>
            取消
          </button>
        </div>
      )}

      {d.phase === "review" && (
        <div className="dr-panel" role="dialog" aria-label="核对录制步骤">
          <header className="dr-head">
            <strong>核对一下再{kind === "shot" ? "拍" : "录"}</strong>
            <span className="dr-muted">
              放进 {d.page}「{d.section.text}」{d.slot ? "的格子" : ""} · 从 {d.route} 开始
            </span>
          </header>
          <label className="dr-field">
            <span>{kind === "shot" ? "这张图说明什么（图片说明）" : "这段录屏讲什么（开头的字幕，也是图片说明）"}</span>
            <input value={caption} className="dr-input" onChange={(e) => setCaption(e.target.value)} />
          </label>
          <ol className="dr-steps">
            {d.steps.map((s, i) => (
              <li key={i}>
                <input
                  value={s.caption}
                  className="dr-input"
                  aria-label={`第 ${i + 1} 步的字幕`}
                  onChange={(e) => {
                    const step = studioState.demo.steps[i];
                    step.caption = e.target.value;
                    step.auto = false;
                    saveDemo();
                  }}
                />
                <code className={cx(s.fragile && "is-fragile")} title={s.fragile ? "按页面结构定位，原型改版后容易找不到，最好改个能按文字找的步骤" : "重拍时按这个找元素"}>
                  {s.selector}
                </code>
                {s.type != null && <span className="dr-typed">输入「{s.type}」</span>}
                <button
                  type="button"
                  className="dr-x"
                  onClick={() => {
                    studioState.demo.steps.splice(i, 1);
                    saveDemo();
                  }}
                >
                  删除
                </button>
              </li>
            ))}
          </ol>
          {kind === "shot" && (
            <>
              <p className="dr-muted">
                截图范围：{d.clip ? <code className={cx(d.clip.fragile && "is-fragile")}>{d.clip.selector}</code> : "整屏"}
                {d.clip && ` · ${d.clip.size}`}
                {!d.steps.length && " · 没有操作步骤，拍的是这一屏刚打开的样子"}
              </p>
              <label className="dr-check">
                <input type="checkbox" checked={marks} onChange={(e) => setMarks(e.target.checked)} />
                在输入过的控件上压序号角标
              </label>
            </>
          )}
          <footer className="dr-foot">
            <button type="button" className="dr-btn" onClick={redo}>
              重新示范
            </button>
            <button type="button" className="dr-btn" onClick={cancelDemo}>
              取消
            </button>
            <button type="button" className="dr-btn is-primary" disabled={(kind === "clip" && !d.steps.length) || submitting} onClick={submit}>
              {kind === "shot" ? "开始拍" : "开始录"}
            </button>
          </footer>
        </div>
      )}

      {d.phase === "running" && (
        <div className="dr-panel" role="dialog" aria-label="录制进度">
          <header className="dr-head">
            <strong>{running ? (kind === "shot" ? "正在拍…" : "正在录…") : ok ? (kind === "shot" ? "拍好了" : "录好了") : kind === "shot" ? "没拍成" : "没录成"}</strong>
            <span className="dr-muted">
              {d.page}「{d.section.text}」
            </span>
          </header>
          <ol className="dr-progress">
            {stages.map((name, i) => (
              <li key={name} className={stageClass(i)}>
                {name}
              </li>
            ))}
          </ol>
          <pre className="dr-log">{tail}</pre>
          <footer className="dr-foot">
            {running ? (
              <span className="dr-muted">一两分钟。关掉这个框不影响它跑完</span>
            ) : (
              <>
                {!ok && (
                  <button type="button" className="dr-btn" onClick={redo}>
                    重新示范
                  </button>
                )}
                <button type="button" className="dr-btn" onClick={cancelDemo}>
                  关闭
                </button>
                {ok && (
                  <button type="button" className="dr-btn is-primary" onClick={openDemoResult}>
                    回审阅台看结果
                  </button>
                )}
              </>
            )}
          </footer>
        </div>
      )}
    </div>
    </>
  );
}
