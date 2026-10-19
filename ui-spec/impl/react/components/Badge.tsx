import * as React from 'react';
import { cn } from '../lib/cn';

/**
 * Badge — 状态徽标
 *
 * 关键约束（COL-02 / COL-04）：
 * 状态绝不能只靠颜色传达，必须搭配图标或文字。
 * 因此本组件强制要求 icon，缺省时使用语义化符号兜底。
 */

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const TONE_CLASSES: Record<BadgeTone, string> = {
  success: 'bg-success-subtle text-success',
  warning: 'bg-warning-subtle text-warning',
  danger: 'bg-danger-subtle text-danger',
  info: 'bg-info-subtle text-info',
  neutral: 'bg-surface-active text-secondary',
};

const DEFAULT_ICON: Record<BadgeTone, string> = {
  success: '✓',
  warning: '⚠',
  danger: '✕',
  info: 'ℹ',
  neutral: '•',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  /** 显式图标；不传则使用该 tone 的默认符号 */
  icon?: React.ReactNode;
}

export function Badge({
  tone = 'neutral',
  icon,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill px-2 py-0.5',
        'text-caption font-medium whitespace-nowrap',
        TONE_CLASSES[tone],
        className
      )}
      {...props}
    >
      <span aria-hidden="true" className="text-[1.1em] leading-none">
        {icon ?? DEFAULT_ICON[tone]}
      </span>
      {children}
    </span>
  );
}
