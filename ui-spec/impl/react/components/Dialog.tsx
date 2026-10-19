import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/cn';
import { Button } from './Button';

/**
 * Dialog — 规范 §6.3
 * 圆角 2xl(16px) / surface-2 / shadow-popover / max-w 448px / 遮罩 blur 8px
 *
 * 必须满足（INT-07 / A11Y-04）：
 * - role="dialog" + aria-modal + aria-labelledby
 * - 焦点陷阱：Tab 循环不逃逸
 * - Escape 关闭
 * - 关闭后焦点归还触发源
 * - 危险操作时默认焦点在「取消」
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  /** 底部操作区 */
  footer?: React.ReactNode;
  /** 危险变体：确认按钮用 danger，默认焦点落在取消 */
  tone?: 'default' | 'danger';
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  tone = 'default',
}: DialogProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const descId = React.useId();
  const restoreFocusRef = React.useRef<HTMLElement | null>(null);

  /* 打开：记录触发源 → 聚焦首个可交互元素；关闭：归还焦点 */
  React.useEffect(() => {
    if (!open) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    if (panel) {
      const first = panel.querySelector<HTMLElement>(FOCUSABLE);
      // 危险操作不要默认落在破坏性按钮上：由 footer 标记「取消」为初始焦点
      const target = panel.querySelector<HTMLElement>('[data-autofocus]') ?? first;
      (target ?? panel).focus({ preventScroll: true });
    }

    return () => {
      document.body.style.overflow = prevOverflow;
      restoreFocusRef.current?.focus({ preventScroll: true });
    };
  }, [open]);

  /* 键盘：Escape 关闭 + Tab 循环 */
  const onKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onOpenChange(false);
        return;
      }
      if (e.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onOpenChange]
  );

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      onKeyDown={onKeyDown}
    >
      {/* 遮罩：点击关闭 */}
      <div
        aria-hidden="true"
        onClick={() => onOpenChange(false)}
        className="absolute inset-0 bg-overlay backdrop-blur-[8px] anim-fade-up"
        style={{ animationDuration: 'var(--dur-fast)' }}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          'relative w-full max-w-[448px] rounded-2xl bg-surface-2 p-6 shadow-popover',
          // 容器本身不显示焦点环：焦点始终落在内部可交互元素上（A6 等价补偿）
          'focus:outline-none anim-scale-in'
        )}
        style={{ animationDuration: 'var(--dur-base)' }}
      >
        <h2
          id={titleId}
          className="text-heading font-semibold text-primary wrap-balance"
        >
          {title}
        </h2>
        {description && (
          <p id={descId} className="mt-2 text-body text-secondary wrap-pretty">
            {description}
          </p>
        )}

        {children && <div className="mt-6">{children}</div>}

        <div className="mt-6 flex justify-end gap-2">
          {footer ?? (
            <>
              <Button variant="ghost" data-autofocus onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button
                variant={tone === 'danger' ? 'danger' : 'primary'}
                onClick={() => onOpenChange(false)}
              >
                确认
              </Button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
