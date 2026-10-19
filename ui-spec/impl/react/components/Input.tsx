import * as React from 'react';
import { cn } from '../lib/cn';

/**
 * Input — 规范 §3.3 / §6
 * 高 32px / rounded-lg(8px) / surface-3 / border-default
 * 聚焦使用自定义焦点环（A11Y-07），不使用系统默认 outline
 *
 * 关键约束：
 * - 移动端字号不得小于 16px，防止 iOS 聚焦缩放（TYP-08）
 */

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** 错误态：边框转 danger，并配合 aria-invalid */
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'h-8 w-full rounded-lg border bg-surface-3 px-3',
        // 移动端保底 16px（TYP-08）
        'text-body text-primary max-sm:text-[16px]',
        'placeholder:text-tertiary',
        'transition-[box-shadow,border-color] duration-fast ease-out',
        'focus-visible:border-transparent focus-visible:outline-none focus-visible:shadow-focus',
        'disabled:cursor-not-allowed disabled:opacity-45',
        invalid ? 'border-danger' : 'border-default',
        className
      )}
      {...props}
    />
  )
);

Input.displayName = 'Input';

/** 表单字段容器：标签 + 控件 + 提示/错误 */
export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-footnote font-medium text-primary">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-footnote text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-footnote text-tertiary">{hint}</p>
      ) : null}
    </div>
  );
}
