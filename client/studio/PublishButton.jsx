import { useEffect, useRef, useState } from "react";
import { useSnapshot } from "valtio";

import { Btn, cx } from "../core/ui";
import { pollPublish, publishConfig, publishNow, publishPlan, studioState } from "./store";
import "./PublishButton.less";

/**
 * 发布到宿主配置的目标端。
 *
 * **为什么挂在顶栏而不在某一页上.** docs/kb 下的 md 是真源；发布是把整个真源推成目标端的
 * 一个渲染视图，按页比对、没变的跳过，不属于哪一页。
 *
 * **为什么先算计划再确认.** 发布是外发。按仓库约定这类动作要人明确点头，而「点头」
 * 得有依据——所以确认框里摆的是 `--dry-run` 的真实结果（哪几页会变、哪几页内容没变会跳过），
 * 不是一句「确定要发布吗」。
 *
 * **为什么不在前端等它跑完.** 一次全量十几分钟，比任何合理的请求超时都长。服务端跑成
 * 后台任务，这里只轮询；关掉弹窗甚至关掉审阅台都不影响它跑完，回来还能看到进度。
 */
const hhmm = (iso) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export function PublishButton() {
  const snap = useSnapshot(studioState);
  const [shown, setShown] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [plan, setPlan] = useState("");
  const [planToken, setPlanToken] = useState("");
  const [destination, setDestination] = useState(null);
  /** 打开时上一次正式发布的结局：没发完的话，计划上方说一句这次会接着发 */
  const [lastRun, setLastRun] = useState(null);
  const logRef = useRef(null);
  const dialogRef = useRef(null);
  const restoreFocusRef = useRef(null);

  const job = snap.publish;
  const targetLabel = destination?.label || "发布目标";
  const unconfigured = destination?.configured === false;
  // 算计划也占同一个任务槽（dry-run），它在跑不算「发布中」
  const running = !!job?.running && !job.dryRun;
  // 正式发布跑完、而且这次打开没在重算计划，才进「看结果」态。
  // 从前跑完一次之后再点按钮只会重开上次的结果，没有任何办法再发（2026-10-08 一次中断后卡在旧结果上）
  const done = !planning && !!job && !job.running && !job.dryRun && !!job.finishedAt;
  // dry-run 的末行形如「新建 2，更新 23，跳过 6」，计数为 0 的档不打印
  const hasChanges = /(新建|更新)\s*[1-9]/.test(plan);
  const planFailed = !!job && job.dryRun && !job.running && job.code !== null && job.code !== 0 && !!job.finishedAt;

  let summary = "";
  if (done) {
    const tail = (job.output || "").split("\n").map((l) => l.trim()).filter(Boolean).pop();
    const failedLine = (job.output || "").match(/✗ (\d+) 页没发出去/);
    summary =
      job.code === 0 ? tail || "发布完成。" :
      failedLine ? `有 ${failedLine[1]} 页没发出去，原因列在下面。再点一次发布只补这几页，发出去的会跳过。` :
      `发布中断（退出码 ${job.code}），下面是最后的输出。重跑一次会跳过已经发出去的页。`;
  } else if (planFailed) {
    summary = `发布计划没算出来（退出码 ${job.code}），原因见下面。`;
  } else if (plan) {
    // 「没有改动」要说成一句人话，不留给读者从「跳过 29」自己反推
    summary = hasChanges ? `下面这些页与${targetLabel}不一致，确认后会被覆盖；没列出来的是内容没变、会跳过的。` : `这次没有要发布的改动——仓库里的每一页都和${targetLabel}一致。`;
  }

  // 目标端由宿主配置，套件只展示它的名称，不假设是云文档
  useEffect(() => {
    publishConfig().then(setDestination).catch(() => {});
  }, []);

  // 审阅台重开时若还有发布在跑，按钮要立刻显示「发布中」而不是等人点进来
  useEffect(() => {
    pollPublish();
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [job?.output]);

  useEffect(() => {
    if (!shown) return undefined;
    restoreFocusRef.current = document.activeElement;
    const panel = dialogRef.current;
    const focusables = () =>
      [...(panel?.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [])];
    focusables()[0]?.focus({ preventScroll: true });
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setShown(false);
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      restoreFocusRef.current?.focus?.();
    };
  }, [shown]);

  const open = async () => {
    setShown(true);
    if (running) return;
    if (destination?.configured === false) return;
    // 每次点开都重算：上次的结果留一句话，不挡着这一次
    if (done) setLastRun({ ok: job.code === 0, at: job.finishedAt });
    setPlanning(true);
    setPlanToken("");
    try {
      const j = await publishPlan();
      setPlan(j.output || "");
      setPlanToken(j.code === 0 ? j.confirmToken || "" : "");
    } catch (e) {
      setPlan(`算不出计划：${e.message}`);
    } finally {
      setPlanning(false);
    }
  };

  const confirm = async () => {
    const was = plan;
    const token = planToken;
    setPlan("");
    setPlanToken("");
    try {
      await publishNow(token);
    } catch (e) {
      setPlan(`${was}\n\n没有开始发布：${e.message}`);
    }
  };

  return (
    <div className="pb">
      <Btn
        className={cx(running && "is-running")}
        disabled={unconfigured}
        title={unconfigured ? destination.description : running ? "发布进行中，点开看进度" : `先列出这次会新建、更新${targetLabel}里的哪几篇，你确认了才发`}
        onClick={open}
      >
        {running ? "发布中…" : unconfigured ? "发布（未配置）" : "发布"}
      </Btn>

      {shown && (
        <div className="pb-mask" onClick={(e) => e.target === e.currentTarget && setShown(false)}>
          <div ref={dialogRef} className="pb-dialog" role="dialog" aria-modal="true" aria-label="发布" tabIndex={-1}>
            <header className="pb-head">
              <strong>{running ? "正在发布" : done ? "发布结束" : "发布"}</strong>
              <Btn kind="ghost" size="sm" onClick={() => setShown(false)}>
                关闭
              </Btn>
            </header>

            {/* 确认前：先把这一次会动哪些页摆出来。发布是外发动作，不该点一下就走 */}
            {!running && !done ? (
              planning ? (
                <p className="st-muted">正在算这次会动哪些页…</p>
              ) : (
                <>
                  {lastRun && !lastRun.ok && (
                    <p className="pb-warn">上次发布（{hhmm(lastRun.at)}）没发完，下面列的就是还没发出去的页，确认后接着发。</p>
                  )}
                  {destination?.configured === false && (
                    <p className="pb-warn">发布目标还没配置：{destination.description}</p>
                  )}
                  <p className="pb-lead">{summary}</p>
                  <pre className="pb-log">{plan}</pre>
                  <p className="pb-warn">
                    这一步把内容推到{targetLabel}，是<strong>外发</strong>。确认之前先想清楚这批内容的密级与分享范围——
                    目标端已经建过，这次沿用它现有的分享设置，不会改权限。
                  </p>
                  <p className="st-muted">仓库里的 Markdown 是真源，{targetLabel}只是它的渲染视图；在目标端直接改正文，下次发布会被覆盖。</p>
                </>
              )
            ) : (
              // 跑起来之后：只剩看进度。关掉审阅台也不影响它跑完
              <>
                <p className="pb-lead">{running ? "十几分钟，可以关掉这个框去干别的，回来再看。" : summary}</p>
                <pre ref={logRef} className="pb-log is-tall">
                  {job?.output || "（还没有输出）"}
                </pre>
              </>
            )}

            <footer className="pb-foot">
              <Btn onClick={() => setShown(false)}>{running || done ? "关闭" : "取消"}</Btn>
              {!running && !done && (
                <Btn kind="primary" disabled={planning || unconfigured || planFailed || !hasChanges || !planToken} onClick={confirm}>
                  {unconfigured ? "目标未配置" : planFailed ? "计划失败" : hasChanges ? "确认发布" : "没有要发布的改动"}
                </Btn>
              )}
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
