import { useEffect, useState } from "react";
import { useSnapshot } from "valtio";

import { Btn, cx } from "../core/ui";
import { ContentMenu, todoOf } from "./ContentMenu";
import { DemoRecorder } from "./DemoRecorder";
import { FileView } from "./FileView";
import { MediaLightbox } from "./MediaLightbox";
import { PublishButton } from "./PublishButton";
import { closeStudio, createTopic, dismissNotice, loadPlanConfig, notify, refresh, shoot, studioState } from "./store";
import "./StudioRoot.less";

/**
 * 按话题新建一页：先想清楚这篇回答读者什么问题、属于哪一类、讲的是哪几屏，
 * 再按话题类型的模板排出骨架。建好停在构成上。
 */
function NewTopic({ dirs }) {
  const [cfg, setCfg] = useState(null);
  const [topic, setTopic] = useState("");
  const [type, setType] = useState("howto");
  const [pages, setPages] = useState(() => window.location.hash.replace(/^#/, "").split("?")[0] || "");
  const [file, setFile] = useState("");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    loadPlanConfig()
      .then(setCfg)
      .catch((e) => notify(e.message, "error"));
  }, []);
  const submit = async () => {
    setSaving(true);
    try {
      await createTopic({ path: file.trim(), type, topic: topic.trim(), pages, title: title.trim() });
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setSaving(false);
    }
  };
  const ready = topic.trim() && /^[\w-]+\/[\w-]+\.md$/.test(file.trim());

  return (
    <div className="st-pane st-new">
      <header className="st-pane-head">
        <h3>按话题新建一页</h3>
      </header>
      <p className="st-help">一篇文档讲一个话题。先说清它回答读者什么问题、是哪一类，结构跟着话题走：想「做成一件事」和想「弄明白一个概念」，要的是两种文档。</p>
      <label className="st-field">
        <span>话题：这篇要回答读者的什么问题</span>
        <textarea rows={2} value={topic} placeholder="例：导入任务失败时怎么看原因、怎么重试" onChange={(e) => setTopic(e.target.value)} />
      </label>
      <div className="st-field">
        <span>话题类型</span>
        <div className="st-types" role="radiogroup" aria-label="话题类型">
          {Object.entries(cfg?.types ?? {}).map(([k, t]) => (
            <button key={k} type="button" role="radio" aria-checked={type === k} className={cx("st-type", type === k && "is-on")} onClick={() => setType(k)}>
              <strong>{t.label}</strong>
              <span>读者{t.reader}</span>
              <em>{t.sections.join(" → ")}</em>
            </button>
          ))}
        </div>
      </div>
      <label className="st-field">
        <span>讲的是哪几屏（路由，逗号隔开）</span>
        <input value={pages} placeholder="/infer-task-new, /infer-task-new/detail" onChange={(e) => setPages(e.target.value)} />
      </label>
      <label className="st-field">
        <span>放在哪（docs/kb 下的相对路径）</span>
        <input value={file} list="st-new-dirs" placeholder="evaluation/infer-task-troubleshoot.md" onChange={(e) => setFile(e.target.value)} />
        <datalist id="st-new-dirs">
          {dirs.map((d) => (
            <option key={d} value={`${d}/`} />
          ))}
        </datalist>
      </label>
      <label className="st-field">
        <span>标题（不填就用话题）</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <div className="st-row">
        <Btn kind="primary" disabled={!ready || saving} onClick={submit}>
          建好并排骨架
        </Btn>
      </div>
    </div>
  );
}

/**
 * 操作结果冒在底部：顶栏放不下长句，冒在那还会把按钮挤来挤去。
 * 播报区一直在（读屏软件只播报已存在区域里的变化），有内容才显形
 */
function Toast() {
  const { notice } = useSnapshot(studioState);
  return (
    <div className="st-toast-dock" role="status" aria-live="polite">
      {notice && (
        <div key={notice.id} className={cx("st-toast", `is-${notice.kind}`)}>
          <span>{notice.text}</span>
          <button type="button" className="st-toast-x" aria-label="关掉提示" onClick={dismissNotice}>
            ×
          </button>
        </div>
      )}
    </div>
  );
}

/** 过期的截图录屏：拍完之后，画它的那几个页面文件改过。几张截图、几段录屏分开说 */
function ReshootButton({ items, running }) {
  if (running)
    return (
      <Btn disabled title="重拍在后台跑，完了会提示">
        重拍中…
      </Btn>
    );
  if (!items.length) return null;
  const clips = items.filter((m) => m.key.startsWith("media/")).length;
  const shots = items.length - clips;
  const parts = [shots && `${shots} 张截图`, clips && `${clips} 段录屏`].filter(Boolean).join("、");
  return (
    <Btn
      title={`${parts}拍完之后页面代码改过，可能已经和界面对不上。\n重拍一遍：画面没变的到此为止，不打扰任何一篇；变了的放进那一篇的「要看的」，等你确认。`}
      onClick={() => shoot({ stale: true })}
    >
      重拍过期的截图录屏（{items.length}）
    </Btn>
  );
}

/**
 * 内容检查台 —— 与评审套件平级的第二个工具层。
 *
 * 两块：顶栏的「内容」下拉是生产出来的全部篇目（按知识库大纲分组，能搜、能只看要处理的、能按话题新建）；
 * 下面是打开的那一篇（审阅 / 构成）。要 Agent 写的活复制成指令，交给 IDE 里的 Agent。
 * 发布到哪个渠道、是新建还是更新，是最后发布时的动作，在右上角。
 */
export function StudioRoot() {
  const snap = useSnapshot(studioState);
  const s = snap.status;
  const sel = snap.selected;
  const shootRunning = !!snap.jobs.shoot?.running;
  const reshootNow = (s?.reshoot ?? []).filter((m) => !m.following);
  const files = s?.files ?? [];
  const todo = files.filter((f) => todoOf(f) > 0);

  return (
    <>
      <DemoRecorder />
      <MediaLightbox />
      {snap.open && (
        <section className="st-surface" data-review-ui role="dialog" aria-label="内容检查">
          <header className="st-bar">
            <span className="st-brand">内容检查</span>
            <span className="st-brand-sub">确认内容仍准确 · 不会自动发布</span>
            {s ? <ContentMenu /> : snap.loading ? <span className="st-muted">读取中…</span> : null}

            <div className="st-bar-right">
              {!snap.persistent && !snap.loading && (
                <span className="st-warn" title="没连上开发服务（cd web && npm run dev）：只能看，确认、修改、重拍都做不了">
                  只读
                </span>
              )}
              {snap.persistent && <ReshootButton items={reshootNow} running={shootRunning} />}
              <Btn kind="ghost" disabled={snap.loading} title="在编辑器里改了 md 或页面代码之后，重新比对每一篇的图与原文" onClick={refresh}>
                {snap.loading ? "检查中…" : "刷新检查"}
              </Btn>
              {snap.persistent && (
                <>
                  <span className="st-bar-sep" aria-hidden="true" />
                  <PublishButton />
                </>
              )}
              <Btn kind="ghost" title="收起审阅台，回到原型（重拍与发布在后台照跑）" onClick={closeStudio}>
                关闭
              </Btn>
            </div>
          </header>

          <div className="st-body">
            <main className="st-main">
              {sel?.kind === "file" ? (
                <FileView />
              ) : sel?.kind === "new-topic" ? (
                <NewTopic dirs={s?.groups.map((g) => g.dir).filter(Boolean) ?? []} />
              ) : snap.loading ? (
                <div className="st-blank">读取中…</div>
              ) : (
                <div className="st-blank">
                  <p>从左上角的篇目下拉打开一篇；{todo.length ? `有 ${todo.length} 篇待检查。` : "每一篇都检查完了。"}</p>
                  <p className="st-muted">打开后先看「待确认」卡片：确认只记录这次检查，不会自动发布。</p>
                </div>
              )}
            </main>
          </div>
          <Toast />
        </section>
      )}
    </>
  );
}
