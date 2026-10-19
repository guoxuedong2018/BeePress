import * as React from 'react';
import { cn } from '../lib/cn';

/**
 * Composer — 规范 §6.4
 * 圆角 composer(20px) / surface-3 / 双环投影 / 最小 88px 最大 384px
 *
 * 必须满足（EDGE-01）：
 * 中文 / 日文 / 韩文输入法合成态按 Enter 确认候选词时，绝不触发提交。
 */

const MAX_HEIGHT = 384;
const MIN_HEIGHT = 88;
const MIN_TEXTAREA = 44;

export interface ComposerProps {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** 左侧附加操作（如「添加内容」） */
  leading?: React.ReactNode;
  /** 右侧发送按钮之前的操作（如模型选择） */
  trailing?: React.ReactNode;
  className?: string;
  /** 输入框的可访问名称；默认「Message input」 */
  'aria-label'?: string;
}

export function Composer({
  value,
  onValueChange,
  onSubmit,
  placeholder = '描述你想要的界面…',
  disabled,
  leading,
  trailing,
  className,
  'aria-label': ariaLabel = 'Message input',
}: ComposerProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  /** 自适应高度：44px 起步，384px 封顶，超出内部滚动 */
  const resize = React.useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const next = Math.min(Math.max(el.scrollHeight, MIN_TEXTAREA), MAX_HEIGHT);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT ? 'auto' : 'hidden';
  }, []);

  React.useEffect(() => {
    resize();
  }, [value, resize]);

  const submit = React.useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
  }, [value, disabled, onSubmit]);

  const onKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // EDGE-01：合成态守卫 —— 中文候选词确认不得提交
      if (e.nativeEvent.isComposing || e.keyCode === 229) return;

      // Enter 提交 / Shift+Enter 换行 / Cmd(Ctrl)+Enter 也提交
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    },
    [submit]
  );

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div
      className={cn(
        // 外壳三态投影由 .composer-shell 统一提供（tokens.css）
        'composer-shell w-full p-4',
        className
      )}
      style={{ minHeight: MIN_HEIGHT }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel}
        disabled={disabled}
        rows={1}
        className={cn(
          // 焦点样式由父级 .composer-shell:focus-within 承担（A6 的等价补偿）
          'w-full resize-none border-0 bg-transparent px-2 outline-none',
          // body-lg 15px / 22px，移动端保底 16px（TYP-08）
          'text-body-lg text-primary max-sm:text-[16px]',
          'placeholder:text-tertiary',
          'disabled:cursor-not-allowed disabled:opacity-45'
        )}
        style={{ height: MIN_TEXTAREA }}
      />

      <div className="mt-3 flex items-center justify-between border-t border-subtle pt-3">
        <div className="flex items-center gap-1">{leading}</div>
        <div className="flex items-center gap-2">
          {trailing}
          <button
            type="button"
            onClick={submit}
            disabled={!canSend}
            aria-label="发送"
            className={cn(
              'flex size-8 items-center justify-center rounded-lg',
              'bg-accent text-on-accent transition-[background-color,transform] duration-fast ease-out',
              'hover:bg-accent-hover active:scale-[0.98]',
              'focus-visible:shadow-focus focus-visible:outline-none',
              'disabled:pointer-events-none disabled:opacity-35'
            )}
          >
            <svg
              viewBox="0 0 16 16"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M8 13V3M4 7l4-4 4 4" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
