/**
 * Tool UI Spec — Tailwind 配置
 * ---------------------------------------------------------------------------
 * 本文件从 tokens.json 派生，是「单一事实源」原则的体现。
 * 不要在此手写颜色/圆角/间距值 —— 改 tokens.json，配置自动跟随。
 *
 * 若只拷贝 impl/react 到业务项目，请把下面的 require 路径改成你项目里
 * tokens.json 的实际位置（建议放在 src/styles/tokens.json）。
 */

const tokens = require('../../tokens.json');

const { radius, typography, motion } = tokens;

/** fontSize: [size, { lineHeight }]，字重由组件显式指定，避免覆盖冲突 */
const fontSize = Object.fromEntries(
  Object.entries(typography.scale).map(([k, v]) => [
    k,
    [v.size, { lineHeight: v.lineHeight }],
  ])
);

/**
 * spacing 不覆盖。
 * Tailwind 原生 spacing 本身就是 4px 网格（1 单位 = 4px），已满足 TOK-05：
 *   p-0.5=2px  p-1=4px  p-1.5=6px  p-2=8px  p-2.5=10px  p-3=12px
 *   p-3.5=14px p-4=16px p-5=20px   p-6=24px p-7=28px    p-8=32px
 *   p-9=36px   p-10=40px p-11=44px p-12=48px p-16=64px
 * 覆盖反而会引入两套编号，制造歧义。
 */

module.exports = {
  // 令牌以 CSS 变量驱动，绝大多数组件无需 dark: 变体
  // 仅在极少数需要「深色专属行为」时才用 dark: 前缀
  darkMode: ['class', '[data-theme="dark"]'],

  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],

  theme: {
    extend: {
      /* ---------- 颜色：全部指向 CSS 变量，主题切换零成本 ---------- */
      colors: {
        surface: {
          0: 'var(--surface-0)',
          1: 'var(--surface-1)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
          sunken: 'var(--surface-sunken)',
          hover: 'var(--surface-hover)',
          active: 'var(--surface-active)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          active: 'var(--accent-active)',
          subtle: 'var(--accent-subtle)',
          ring: 'var(--accent-ring)',
        },
        success: { DEFAULT: 'var(--success)', subtle: 'var(--success-subtle)' },
        warning: { DEFAULT: 'var(--warning)', subtle: 'var(--warning-subtle)' },
        danger: { DEFAULT: 'var(--danger)', subtle: 'var(--danger-subtle)' },
        info: { DEFAULT: 'var(--info)', subtle: 'var(--info-subtle)' },
        'code-bg': 'var(--code-bg)',
        'code-text': 'var(--code-text)',
        'code-text-muted': 'var(--code-text-muted)',
        'code-border': 'var(--code-border)',
        overlay: 'var(--overlay)',
      },

      /* ---------- 文本色：text-primary / text-secondary / text-tertiary ---------- */
      textColor: {
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        tertiary: 'var(--text-tertiary)',
        disabled: 'var(--text-disabled)',
        inverse: 'var(--text-inverse)',
        'on-accent': 'var(--text-on-accent)',
      },

      /* ---------- 边框色：border-subtle / border-default / border-strong ---------- */
      borderColor: {
        subtle: 'var(--border-subtle)',
        default: 'var(--border-default)',
        strong: 'var(--border-strong)',
        focus: 'var(--border-focus)',
      },

      /* ---------- 圆角：按角色语义 ---------- */
      borderRadius: {
        xs: radius.xs,
        sm: radius.sm,
        md: radius.md,
        lg: radius.lg,
        panel: radius.panel,
        xl: radius.xl,
        '2xl': radius['2xl'],
        bubble: radius.bubble,
        composer: radius.composer,
        pill: radius.pill,
      },

      spacing: {
        px: '1px',
      },

      fontSize,

      fontFamily: {
        sans: ['var(--font-sans)'],
        serif: ['var(--font-serif)'],
        mono: ['var(--font-mono)'],
      },

      /* ---------- 阴影：双层复合 ---------- */
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        popover: 'var(--shadow-popover)',
        focus: 'var(--focus-shadow)',
      },

      /* ---------- 动效刻度 ---------- */
      transitionDuration: {
        instant: motion.duration.instant,
        fast: motion.duration.fast,
        base: motion.duration.base,
        sheet: motion.duration.sheet,
        slow: motion.duration.slow,
      },
      transitionTimingFunction: {
        out: motion.easing.out,
        snap: motion.easing.snap,
        overshoot: motion.easing.overshoot,
      },

      /* ---------- 版心 ---------- */
      maxWidth: {
        content: '720px',
        prose: '760px',
      },

      /* ---------- 容器查询命名（组件内部必须用 @container） ---------- */
      containers: {
        compact: '320px',
        narrow: '384px',
        medium: '480px',
        wide: '576px',
        full: '821px',
      },
    },
  },

  plugins: [
    // 组件内部响应式必须用容器查询，因此需要官方 container queries 插件
    require('@tailwindcss/container-queries'),
  ],
};
