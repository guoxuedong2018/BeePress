/**
 * 套件自己的几个基础件：按钮、标签、图标。
 *
 * 不用宿主的组件库（iView）：套件要能挂到任何原型上，宿主换成别的组件库它也得照常跑。
 * 外观对齐宿主的设计 token（样式表里的 @color-*，由宿主注入），暗色主题跟着变。
 */
import "./ui.less";

export const cx = (...xs) => xs.flat().filter(Boolean).join(" ");

export function Btn({ kind, size, className, children, ...rest }) {
  return (
    <button type="button" className={cx("bk-btn", kind && `is-${kind}`, size && `is-${size}`, className)} {...rest}>
      {children}
    </button>
  );
}

export function Tag({ tone, className, children, ...rest }) {
  return (
    <span className={cx("bk-tag", tone && `is-${tone}`, className)} {...rest}>
      {children}
    </span>
  );
}

/** 线性图标。只收套件用得到的几个，笔画跟着文字颜色走 */
const PATHS = {
  chat: "M4 5h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z",
  list: "M7 6h10M7 10h10M7 14h10M3.5 6h.01M3.5 10h.01M3.5 14h.01",
  warn: "M10 3l8 14H2L10 3zM10 8v4M10 14.5v.01",
  open: "M11 3h6v6M17 3l-8 8M15 11v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5",
  locate: "M10 2v3M10 15v3M2 10h3M15 10h3M10 14a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  reply: "M8 5L3 10l5 5M3 10h9a5 5 0 0 1 5 5v1",
  check: "M4 10l4 4 8-8",
  refresh: "M16 10a6 6 0 1 1-2-4.5M16 3v4h-4",
  trash: "M4 6h12M8 6V4h4v2M6 6l1 11h6l1-11",
  close: "M5 5l10 10M15 5L5 15",
  doc: "M6 2h6l4 4v12H6zM12 2v4h4M8 10h6M8 13h6",
};

export function Icon({ name, size = 14, className }) {
  return (
    <svg className={cx("bk-icon", className)} width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <path d={PATHS[name]} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
