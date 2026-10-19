import { useEffect, useState } from "react";
import { useSnapshot } from "valtio";

import { cx } from "../core/ui";
import { closeLightbox, studioState } from "./store";
import "./MediaLightbox.less";

/** 只有位置尺寸走内联；框的颜色在样式表里 */
const box = (b) => ({ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%` });

/**
 * 全屏预览。截图、录屏在审阅台哪里都能点开看原图。
 *
 * 多张时（写的时候 / 现在）用左右方向键来回切：同一位置反复闪两版，
 * 比并排两张缩略图更容易看出哪里变了。
 */
export function MediaLightbox() {
  const snap = useSnapshot(studioState);
  const lb = snap.lightbox;
  const [actual, setActual] = useState(false);

  useEffect(() => {
    setActual(false);
    if (!lb) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") closeLightbox();
      const n = studioState.lightbox?.items.length ?? 0;
      if (n > 1 && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        studioState.lightbox.index = (studioState.lightbox.index + (e.key === "ArrowRight" ? 1 : n - 1)) % n;
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [!!lb]);

  if (!lb) return null;
  const cur = lb.items[lb.index] ?? {};
  const onMask = (e) => e.target === e.currentTarget && closeLightbox();

  return (
    <div className="lb" data-review-ui role="dialog" aria-label="预览" onClick={onMask}>
      <header className="lb-bar">
        {lb.items.length > 1 && (
          <div className="lb-tabs" role="tablist">
            {lb.items.map((it, i) => (
              <button key={i} type="button" role="tab" aria-selected={i === lb.index} className={cx(i === lb.index && "is-on")} onClick={() => (studioState.lightbox.index = i)}>
                {it.label || `第 ${i + 1} 张`}
              </button>
            ))}
          </div>
        )}
        <span className="lb-caption">{cur.caption}</span>
        {lb.items.length > 1 && <span className="lb-hint">← → 来回切，差别一眼就能看出来</span>}
        {!cur.video && (
          <button type="button" className="lb-btn" onClick={() => setActual(!actual)}>
            {actual ? "适应窗口" : "原始大小"}
          </button>
        )}
        <a className="lb-btn" href={cur.video || cur.src} target="_blank" rel="noopener noreferrer">
          新窗口打开
        </a>
        <button type="button" className="lb-btn" onClick={closeLightbox}>
          关闭（Esc）
        </button>
      </header>

      <div className={cx("lb-stage", actual && "is-actual")} onClick={onMask}>
        {/* 录屏放 mp4：能暂停、能拖进度条，动图做不到 */}
        {cur.video ? (
          <video key={cur.video} className="lb-video" src={cur.video} controls autoPlay loop />
        ) : (
          <div className="lb-shot" onClick={() => setActual(!actual)}>
            <img src={cur.src} alt={cur.caption || ""} />
            {(cur.regions ?? []).map((b, i) => (
              <i key={i} className="lb-region" style={box(b)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
