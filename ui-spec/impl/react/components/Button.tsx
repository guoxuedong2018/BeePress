import * as React from 'react';
import { cn } from '../lib/cn';

/**
 * Button — 规范 §6.1
 * 4 级尺寸 × 5 变体 × 4 态
 *
 * 关键约束：
 * - 尺寸/内边距/圆角严格按 roleMap，不得自行组合
 * - 按压反馈统一 active:scale-[0.98] + 120ms（INT-04）
 * - 位于带边框容器内部时，必须改用 ghost 变体（LAY-05）
 */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: 'h-6 px-2 text-caption rounded-md gap-1',
  sm: 'h-7 px-2.5 text-footnote rounded-lg gap-1.5',
  md: 'h-8 px-3 text-body rounded-lg gap-1.5',
  lg: 'h-10 px-4 text-body-lg rounded-xl gap-2',
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-on-accent border-0 hover:bg-accent-hover active:bg-accent-active',
  secondary:
    'bg-surface-2 text-primary border border-default hover:bg-surface-hover',
  ghost:
    'bg-transparent text-secondary border-0 hover:bg-surface-hover hover:text-primary',
  outline:
    'bg-transparent text-primary border border-strong hover:bg-surface-hover',
  danger:
    'bg-danger text-inverse border-0 hover:opacity-90 active:opacity-100',
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** 仅图标按钮必须提供，用于无障碍（A11Y-03） */
  iconOnly?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'secondary', size = 'md', iconOnly, children, ...props },
    ref
  ) => (
    <button
      ref={ref}
      aria-label={iconOnly ? props['aria-label'] : undefined}
      className={cn(
        // 基础
        'inline-flex select-none items-center justify-center whitespace-nowrap font-medium',
        // 四态：focus-visible 使用自定义焦点环（A11Y-07）
        'transition-[background-color,color,transform,box-shadow] duration-fast ease-out',
        'focus-visible:outline-none focus-visible:shadow-focus',
        // 按压（INT-04）
        'active:scale-[0.98]',
        // 禁用
        'disabled:pointer-events-none disabled:opacity-45',
        SIZE_CLASSES[size],
        VARIANT_CLASSES[variant],
        iconOnly && 'aspect-square px-0',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);

Button.displayName = 'Button';
