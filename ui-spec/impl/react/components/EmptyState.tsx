import * as React from 'react';
import { cn } from '../lib/cn';

/**
 * EmptyState — 规范 §6.8 / INT-09
 *
 * 强制要求：必须包含「说明 + 下一步动作」。
 * 只有「暂无数据」的空状态一律视为缺陷。
 */

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  /** 主行动按钮（必填，最多 1 个 primary） */
  action?: React.ReactNode;
  /** 次级行动（可选） */
  secondaryAction?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon = '◇',
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-8 py-12 text-center',
        className
      )}
    >
      <div
        aria-hidden="true"
        className="mb-4 text-2xl leading-none text-tertiary opacity-70"
      >
        {icon}
      </div>

      <h3 className="text-title font-semibold text-primary wrap-balance">{title}</h3>

      {description && (
        <p className="mt-2 max-w-[360px] text-body text-secondary wrap-pretty">
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className="mt-6 flex items-center gap-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
