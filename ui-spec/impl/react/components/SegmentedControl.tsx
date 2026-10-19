import * as React from 'react';
import { cn } from '../lib/cn';

/**
 * SegmentedControl — 规范 §2.2
 * 999px 全圆角轨道 / 2px 内边距 / 指示器纯几何定位 / 120ms snap
 *
 * 关键约束：
 * - 轨道 padding 严格 2px，指示器用 calc 精确等分
 * - 组件内部使用容器查询，窄容器自动折叠为图标（EDGE-05 / EDGE-06）
 * - 键盘：roving tabindex，方向键切换（A11Y-02）
 */

export interface SegmentedItem {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface SegmentedControlProps {
  items: SegmentedItem[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  'aria-label'?: string;
}

export function SegmentedControl({
  items,
  value,
  onValueChange,
  className,
  ...rest
}: SegmentedControlProps) {
  const activeIndex = Math.max(
    0,
    items.findIndex((i) => i.value === value)
  );
  const count = items.length;
  const refs = React.useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    let next = index;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % count;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (index - 1 + count) % count;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = count - 1;
    else return;

    e.preventDefault();
    onValueChange(items[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={rest['aria-label']}
      className={cn(
        '@container relative inline-flex h-8 items-center rounded-pill bg-surface-active p-0.5',
        className
      )}
    >
      {/* 滑动指示器：纯几何定位，不用 JS 测量 */}
      <span
        aria-hidden="true"
        className="absolute top-0.5 bottom-0.5 rounded-pill bg-surface-2 shadow-sm"
        style={{
          left: `calc(2px + ${activeIndex} * (100% - 4px) / ${count})`,
          width: `calc((100% - 4px) / ${count})`,
          transition: 'left 120ms cubic-bezier(0.32,0.72,0,1), width 120ms cubic-bezier(0.32,0.72,0,1)',
        }}
      />

      {items.map((item, i) => {
        const active = i === activeIndex;
        return (
          <button
            key={item.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onValueChange(item.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'relative z-10 flex h-full flex-1 items-center justify-center gap-1.5 px-3',
              'rounded-pill text-footnote whitespace-nowrap transition-colors duration-fast ease-out',
              'focus-visible:shadow-focus focus-visible:outline-none',
              active ? 'font-medium text-primary' : 'text-secondary hover:text-primary'
            )}
          >
            {item.icon && <span aria-hidden="true">{item.icon}</span>}
            {/* 窄容器下隐藏文字，只留图标（EDGE-06） */}
            <span className="@max-[254px]:hidden">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
