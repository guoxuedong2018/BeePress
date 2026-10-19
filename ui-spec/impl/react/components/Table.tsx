import * as React from 'react';
import { cn } from '../lib/cn';

/**
 * Table — 规范 §6.7
 * 表头 bg surface-0 / 行分隔 border-subtle / 单元格 padding 12×16
 * 数字列必须右对齐 + tabular-nums（TYP-03）
 *
 * 关键约束：
 * - 单元格内禁止再套卡片边框（LAY-05）
 * - 超过 200 行必须虚拟化（EDGE-09）
 */

export function TableWrap({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'overflow-x-auto rounded-panel border border-subtle bg-surface-2 shadow-sm',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function Table({
  className,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={cn('w-full border-collapse text-body', className)}
      {...props}
    />
  );
}

export function THead({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn('bg-surface-0', className)} {...props} />
  );
}

export function TH({
  className,
  numeric,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <th
      scope="col"
      className={cn(
        'border-b border-subtle px-4 py-3 text-left text-footnote font-semibold text-secondary whitespace-nowrap',
        numeric && 'text-right tnum',
        className
      )}
      {...props}
    />
  );
}

export function TBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={className} {...props} />;
}

export function TR({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        'border-b border-subtle last:border-b-0 transition-colors duration-fast ease-out hover:bg-surface-0',
        className
      )}
      {...props}
    />
  );
}

export function TD({
  className,
  numeric,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <td
      className={cn(
        'px-4 py-3 align-top text-body text-primary',
        numeric && 'text-right tnum',
        className
      )}
      {...props}
    />
  );
}
