/**
 * Tool UI Spec — 动效预设
 * ---------------------------------------------------------------------------
 * MOT-01：动效必须来自 4 套预设之一，禁止手写任意 stiffness / damping。
 *
 * 参数与 tokens.json → motion.springs 一一对应。
 * 阻尼比 ζ = c / (2·√(m·k))，决定运动性格：
 *   ζ < 1 欠阻尼（会回弹）  ζ = 1 临界阻尼  ζ > 1 过阻尼（绝对稳定）
 */

export const SPRING_SNAPPY = {
  type: 'spring',
  stiffness: 600,
  damping: 30,
  mass: 0.6,
} as const;
// ζ ≈ 0.79 · 超调 1.8% · 收敛 220ms
// 用于：按钮点击、Tab / 分段切换、微交互

export const SPRING_BOUNCY = {
  type: 'spring',
  stiffness: 400,
  damping: 25,
  mass: 0.8,
} as const;
// ζ ≈ 0.61 · 超调 8.8% · 收敛 380ms
// 用于：开关、徽章入场、成功反馈

export const SPRING_GENTLE = {
  type: 'spring',
  stiffness: 220,
  damping: 24,
  mass: 1.0,
} as const;
// ζ ≈ 0.81 · 超调 1.5% · 收敛 480ms
// 用于：弹窗、折叠展开、气泡进入、分栏复位

export const SPRING_HEAVY_SNAP = {
  type: 'spring',
  stiffness: 1200,
  damping: 80,
  mass: 0.1,
} as const;
// ζ ≈ 1.83 · 零超调 · 收敛 140ms
// 用于：拖拽落点、边缘吸附、抽屉关闭

/** 时长刻度（毫秒），与 CSS 变量保持一致 */
export const DURATION = {
  instant: 60,
  fast: 120,
  base: 200,
  sheet: 300,
  slow: 450,
} as const;

/** 缓动曲线 */
export const EASE = {
  out: [0.165, 0.84, 0.44, 1] as const,
  snap: [0.32, 0.72, 0, 1] as const,
  overshoot: [0.34, 1.3, 0.64, 1] as const,
};

/** 常用过渡片段：只动 transform / opacity，绝不动 layout 属性（MOT-05） */
export const TRANSITION_FAST = {
  duration: DURATION.fast / 1000,
  ease: EASE.out,
};

export const TRANSITION_BASE = {
  duration: DURATION.base / 1000,
  ease: EASE.out,
};

/** 按压反馈：全站统一 scale(0.98) + 120ms（INT-04） */
export const PRESS_FEEDBACK = {
  whileTap: { scale: 0.98 },
  transition: SPRING_SNAPPY,
};
