import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * 类名合并工具。
 * - clsx：处理条件类名
 * - twMerge：后写的同类 Tailwind 类覆盖先写的（避免 style 冲突）
 *
 * `text-body` / `text-prose` 等是自定义字号，而 `text-primary` 是颜色。
 * 未注册字号组时 twMerge 会把两者当成同一组，静默丢掉字号。
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: ['caption', 'footnote', 'body', 'body-lg', 'prose', 'heading', 'title', 'display'],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
