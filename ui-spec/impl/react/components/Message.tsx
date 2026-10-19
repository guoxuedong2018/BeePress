import * as React from 'react';
import { cn } from '../lib/cn';

/**
 * Message — 规范 §6.5
 *
 * 用户消息：右对齐 / bg accent-subtle / radius bubble(18px) / padding 16×10
 * 助手消息：左对齐 / 无背景 / 无边框 / max-width 720px（LAY-05）
 *
 * 这是「单闭合边框」原则最典型的应用：
 * 助手回复绝不允许加气泡背景或边框，它直接浮在画布上。
 */

export interface MessageProps {
  role: 'user' | 'assistant';
  children: React.ReactNode;
  /** 元信息：时间、模型名等，用 caption + tertiary + 等宽数字 */
  meta?: string;
  className?: string;
}

export function Message({ role, children, meta, className }: MessageProps) {
  const isUser = role === 'user';

  return (
    <div
      className={cn(
        'flex w-full flex-col',
        isUser ? 'items-end' : 'items-start',
        className
      )}
    >
      <div
        className={cn(
          isUser
            ? 'max-w-[70%] rounded-bubble bg-accent-subtle px-4 py-2.5 text-body text-primary'
            : 'max-w-content text-body text-primary wrap-pretty'
        )}
      >
        {children}
      </div>

      {meta && (
        <span className="mt-2 text-caption text-tertiary tnum">{meta}</span>
      )}
    </div>
  );
}

/**
 * MessageActions — 消息底部操作栏
 * 悬停才显示，纯 ghost，不占布局高度
 */
export function MessageActions({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'mt-2 flex items-center gap-1',
        'opacity-0 transition-opacity duration-fast ease-out',
        'group-hover:opacity-100 focus-within:opacity-100'
      )}
    >
      {children}
    </div>
  );
}
