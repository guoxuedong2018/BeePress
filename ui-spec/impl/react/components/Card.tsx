import * as React from 'react';
import { cn } from '../lib/cn';

/**
 * Card — 规范 §6.2
 * 圆角 panel(10px) / surface-2 / 1px border-subtle / shadow-sm
 * 悬停：上浮 1.5px + shadow-md
 *
 * 关键约束：
 * - 内部禁止再放带边框的子卡片（LAY-05 / LAY-07）
 * - 内部按钮必须用 ghost 变体
 */

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 关闭悬停抬升，用于纯展示型容器 */
  static?: boolean;
  /** 紧凑内边距 12px（默认 16px） */
  compact?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, static: isStatic, compact, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-panel border border-subtle bg-surface-2 shadow-sm',
        compact ? 'p-3' : 'p-4',
        !isStatic &&
          'transition-[transform,box-shadow,border-color] duration-base ease-out hover:-translate-y-[1.5px] hover:border-default hover:shadow-md',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

Card.displayName = 'Card';

/** 卡片标题：t-heading 语义 + balance 换行（TYP-04） */
export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        'text-heading font-semibold text-primary wrap-balance',
        className
      )}
      {...props}
    />
  );
}

/** 卡片描述：t-body + secondary */
export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('mt-2 text-body text-secondary wrap-pretty', className)}
      {...props}
    />
  );
}
