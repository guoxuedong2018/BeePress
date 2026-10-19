import { useEffect, useRef, useState } from "react";
import { useSnapshot } from "valtio";

import { cx } from "../core/ui";
import { openFile, openInEditor, selectOther, studioState } from "./store";
import "./ContentMenu.less";

const dirOf = (p) => (p.includes("/") ? p.split("/")[0] : "");
const day = (iso) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}-${d.getDate()}`;
};

/** 这一篇里有没有要人处理的：变了的引用、还空着的格子。迭代中的页收口前不算 */
export const todoOf = (f) => (f.iterating ? 0 : (f.open || 0) + (f.unfilled || 0));

function Item({ f, on, root, onPick }) {
  const tags = [
    f.iterating && "迭代中",
    f.docStatus === "待撰写" && "待撰写",
    f.unfilled > 0 && `${f.unfilled} 个格子待填`,
    !f.publish && "不发布",
    `${day(f.updatedAt)} 改过`,
  ].filter(Boolean);
  const todo = todoOf(f);
  // 角标是两样加起来的；打开那篇后「要看的」只算引用，格子在「构成」里填，所以拆开说
  const todoTip = [f.open && `${f.open} 处要看`, f.unfilled && `${f.unfilled} 个格子待填`].filter(Boolean).join("，");
  return (
    <div className={cx("cm-item", on && "is-on")}>
      <button type="button" className="cm-item-main" onClick={onPick}>
        <span className="cm-item-title">{f.title}</span>
        <span className="cm-item-meta">{tags.join(" · ")}</span>
      </button>
      {todo > 0 && (
        <span className="cm-badge" title={todoTip}>
          {todo}
        </span>
      )}
      <button type="button" className="cm-item-act" title={`docs/kb/${f.path}`} onClick={() => openInEditor(`${root}/docs/kb/${f.path}`)}>
        在编辑器打开
      </button>
    </div>
  );
}

/**
 * 顶栏的内容清单：生产出来的每一篇，按知识库大纲分组。点开是个浮窗，能搜、只看要处理的、按话题新建一页。
 */
export function ContentMenu() {
  const snap = useSnapshot(studioState);
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState("all");
  const [q, setQ] = useState("");
  const rootRef = useRef(null);
  const searchRef = useRef(null);
  const s = snap.status;
  const files = s?.files ?? [];
  const todo = files.filter((f) => todoOf(f) > 0);
  const sel = snap.selected;
  const current = sel?.kind === "file" ? files.find((f) => f.path === sel.id) : null;

  useEffect(() => {
    if (!open) return undefined;
    searchRef.current?.focus();
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown, true);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown, true);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const kw = q.trim().toLowerCase();
  const shown = (scope === "todo" ? todo : files).filter((f) => !kw || f.title.toLowerCase().includes(kw) || f.path.toLowerCase().includes(kw) || String(f.topic ?? "").toLowerCase().includes(kw));
  const pick = (fn) => {
    fn();
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="cm">
      <button type="button" className={cx("cm-btn", open && "is-open")} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(!open)}>
        <span className="cm-btn-title">{current ? current.title : sel?.kind === "new-topic" ? "按话题新建一页" : "选一篇内容"}</span>
        <span className="cm-btn-sum">
          {files.length} 篇{todo.length ? ` · ${todo.length} 篇要处理` : ""}
        </span>
        <span className="cm-caret" aria-hidden="true">
          ▾
        </span>
      </button>

      {open && s && (
        <div className="cm-pop" role="dialog" aria-label="内容清单">
          <div className="cm-tools">
            <input ref={searchRef} className="cm-search" value={q} placeholder="搜标题、路径或话题" onChange={(e) => setQ(e.target.value)} />
            <div className="cm-scope" role="radiogroup" aria-label="显示哪些">
              {[
                ["all", `全部 ${files.length}`],
                ["todo", `要处理 ${todo.length}`],
              ].map(([k, label]) => (
                <button key={k} type="button" role="radio" aria-checked={scope === k} className={cx("cm-scope-btn", scope === k && "is-on")} onClick={() => setScope(k)}>
                  {label}
                </button>
              ))}
            </div>
            {snap.persistent && (
              <button type="button" className="cm-new" onClick={() => pick(() => selectOther("new-topic", "new"))}>
                + 按话题新建一页
              </button>
            )}
          </div>

          <div className="cm-list">
            {s.groups.map((g) => {
              const list = shown.filter((f) => dirOf(f.path) === g.dir);
              if (!list.length) return null;
              // 模块总览（根目录是 README）排在本组第一个，不发布的页排最后
              const rank = (f) => (/(^|\/)(overview|README)\.md$/.test(f.path) ? 0 : f.publish ? 1 : 2);
              list.sort((a, b) => rank(a) - rank(b));
              return (
                <section key={g.dir || "root"} className="cm-group">
                  <h4>
                    {g.label} <span>{list.length}</span>
                  </h4>
                  {list.map((f) => (
                    <Item key={f.path} f={f} root={s.root} on={current?.path === f.path} onPick={() => pick(() => openFile(f.path))} />
                  ))}
                </section>
              );
            })}
            {!shown.length && <p className="cm-empty">{scope === "todo" && !kw ? "每一篇都处理完了：图与原文都确认过，格子都填了。" : "没有对得上的篇目，换个词试试。"}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
