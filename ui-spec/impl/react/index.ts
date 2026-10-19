/**
 * Tool UI Spec — React 参考实现入口
 * ---------------------------------------------------------------------------
 * 所有组件严格遵循 UI-SPEC.md，令牌来自 tokens.css。
 *
 * 依赖：
 *   react / react-dom            ^18
 *   tailwindcss                  ^3.4
 *   @tailwindcss/container-queries
 *   clsx / tailwind-merge
 *   framer-motion（可选，用于 SPRING_* 预设）
 */

/* ---------- 工具与预设 ---------- */
export { cn } from './lib/cn';
export {
  SPRING_SNAPPY,
  SPRING_BOUNCY,
  SPRING_GENTLE,
  SPRING_HEAVY_SNAP,
  DURATION,
  EASE,
  TRANSITION_FAST,
  TRANSITION_BASE,
  PRESS_FEEDBACK,
} from './lib/motion';
export { useScrollPinning } from './lib/useScrollPinning';

/* ---------- 原子控件 ---------- */
export { Button } from './components/Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './components/Button';

export { Input, Field } from './components/Input';
export type { InputProps } from './components/Input';

export { Badge } from './components/Badge';
export type { BadgeProps, BadgeTone } from './components/Badge';

export { Card, CardTitle, CardDescription } from './components/Card';
export type { CardProps } from './components/Card';

export { SegmentedControl } from './components/SegmentedControl';
export type { SegmentedControlProps, SegmentedItem } from './components/SegmentedControl';

/* ---------- 复合组件 ---------- */
export { Dialog } from './components/Dialog';
export type { DialogProps } from './components/Dialog';

export { Composer } from './components/Composer';
export type { ComposerProps } from './components/Composer';

export { Message, MessageActions } from './components/Message';
export type { MessageProps } from './components/Message';

export { CodeBlock } from './components/CodeBlock';
export type { CodeBlockProps } from './components/CodeBlock';

export { EmptyState } from './components/EmptyState';
export type { EmptyStateProps } from './components/EmptyState';

export { TableWrap, Table, THead, TH, TBody, TR, TD } from './components/Table';
