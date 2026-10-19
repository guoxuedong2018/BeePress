import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 类名合并工具。
 * - clsx：处理条件类名
 * - twMerge：后写的同类 Tailwind 类覆盖先写的（避免 style 冲突）
 *
 * 依赖：clsx、tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
