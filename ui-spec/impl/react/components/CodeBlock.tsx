import * as React from 'react';
import { cn } from '../lib/cn';

/**
 * CodeBlock — 规范 §6.6
 * 圆角 xl(12px) / bg #0d0d0c / 头部 36px / 复制 2.5s 后自动淡出
 *
 * 注意：这里不内置语法高亮引擎（体积与栈绑定），
 * 只提供符合规范的容器与交互骨架，高亮由上层注入。
 */

const COPY_RESET_MS = 2500;

export interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

export function CodeBlock({ code, language = 'text', className }: CodeBlockProps) {
  const [copied, setCopied] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), COPY_RESET_MS);
    } catch {
      /* 剪贴板不可用时静默降级，不打断用户 */
    }
  };

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-code-border bg-code-bg',
        className
      )}
    >
      <div className="flex h-9 items-center justify-between border-b border-code-border px-5">
        <span className="font-mono text-caption uppercase tracking-[0.05em] text-code-text-muted">
          {language}
        </span>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? '已复制' : '复制代码'}
          className={cn(
            'rounded-sm px-1.5 py-0.5 text-caption transition-colors duration-fast ease-out',
            'text-code-text-muted hover:bg-white/10 hover:text-code-text',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30'
          )}
        >
          {copied ? '✓ 已复制' : '复制'}
        </button>
      </div>

      <pre className="overflow-x-auto p-5 font-mono text-code text-code-text">
        <code>{code}</code>
      </pre>
    </div>
  );
}
