# Vue 适配指南

> **前提**：本规范的**核心是框架无关的**。令牌层（`tokens.css` / `tokens.json`）是纯 CSS 变量与 JSON，Vue 项目可以**原样使用**。
> 需要适配的只有组件层——因为 React 的 children / hooks / portal 在 Vue 里有不同的对应物。

---

## 1. 什么可以原样复用

| 资产 | 能否复用 | 说明 |
| :-- | :-- | :-- |
| `tokens.css` | ✅ 完全复用 | 纯 CSS 变量，与框架无关 |
| `tokens.json` | ✅ 完全复用 | 纯数据，可喂给任何生成器 |
| `tailwind.config.js` | ✅ 基本复用 | 仅 `content` 路径需改成 `./src/**/*.{vue,ts}` |
| `UI-SPEC.md` | ✅ 完全复用 | 规则描述的是设计决策，不含框架 |
| `AGENT-RULES.md` | ✅ 完全复用 | 同上 |
| `SELF-CHECK.md` | ⚠️ 微调 | grep 的 `--include` 要加 `*.vue` |
| `impl/react/*` | ❌ 需重写 | 组件与 hooks 需按 Vue 惯用法重写 |

**关键判断**：不要试图做跨框架组件库。那会让两边都变得别扭。正确做法是**共享令牌与规范，各自实现组件**。

---

## 2. 概念映射表

| React | Vue 3 | 备注 |
| :-- | :-- | :-- |
| `children` | `<slot />` | 具名插槽对应多个 children |
| `render prop` | 作用域插槽 `<slot :item="item" />` | |
| `useState` | `ref` / `reactive` | |
| `useEffect` | `onMounted` / `watchEffect` | 清理函数放 `onBeforeUnmount` |
| `useMemo` | `computed` | |
| `useCallback` | 普通函数（无需包裹） | |
| `useRef<HTMLDivElement>` | `ref<HTMLDivElement>()` 或 `useTemplateRef()` | |
| `useId()` | `useId()`（Vue 3.5+）或自增计数器 | |
| `forwardRef` | 默认支持，配合 `defineExpose` | |
| `createPortal` | `<Teleport to="body">` | |
| `className` | `class` | |
| `onClick` | `@click` | |
| `{...props}` | `v-bind="$attrs"` + `inheritAttrs: false` | |
| `React.FC<Props>` | `<script setup lang="ts">` + `defineProps<Props>()` | |

---

## 3. 配置调整

```js
// tailwind.config.js —— 只需改 content
module.exports = {
  content: [
    './index.html',
    './src/**/*.{vue,ts,js}',
  ],
  // theme / plugins 与 React 版完全一致
};
```

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
});
```

---

## 4. 组件改写示例

### 4.1 Button.vue

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
type Size = 'xs' | 'sm' | 'md' | 'lg';

const props = withDefaults(
  defineProps<{
    variant?: Variant;
    size?: Size;
    iconOnly?: boolean;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
  }>(),
  { variant: 'secondary', size: 'md', type: 'button' }
);

const SIZE_CLASSES: Record<Size, string> = {
  xs: 'h-6 px-2 text-caption rounded-md gap-1',
  sm: 'h-7 px-2.5 text-footnote rounded-lg gap-1.5',
  md: 'h-8 px-3 text-body rounded-lg gap-1.5',
  lg: 'h-10 px-4 text-body-lg rounded-xl gap-2',
};

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent border-0 hover:bg-accent-hover active:bg-accent-active',
  secondary: 'bg-surface-2 text-primary border border-default hover:bg-surface-hover',
  ghost: 'bg-transparent text-secondary border-0 hover:bg-surface-hover hover:text-primary',
  outline: 'bg-transparent text-primary border border-strong hover:bg-surface-hover',
  danger: 'bg-danger text-white border-0 hover:opacity-90',
};

const classes = computed(() =>
  cn(
    'inline-flex select-none items-center justify-center whitespace-nowrap font-medium',
    'transition-[background-color,color,transform,box-shadow] duration-fast ease-out',
    'focus-visible:outline-none focus-visible:shadow-focus active:scale-[0.98]',
    'disabled:pointer-events-none disabled:opacity-45',
    SIZE_CLASSES[props.size],
    VARIANT_CLASSES[props.variant],
    props.iconOnly && 'aspect-square px-0'
  )
);
</script>

<template>
  <button :type="type" :disabled="disabled" :class="classes">
    <slot />
  </button>
</template>
```

### 4.2 useScrollPinning.ts（组合式函数）

```ts
import { ref, watch, onMounted, onBeforeUnmount, type Ref } from 'vue';

const COOLDOWN_MS = 150;
const BOTTOM_TOLERANCE_PX = 40;
const JUMP_THRESHOLD_PX = 120;

export function useScrollPinning(
  containerRef: Ref<HTMLElement | null>,
  deps: () => unknown[]
) {
  const isPinned = ref(true);
  const showJump = ref(false);
  let lastUserInputAt = 0;
  let programmatic = false;

  const markUserInput = () => {
    lastUserInputAt = performance.now();
    isPinned.value = false;
  };

  const handleScroll = () => {
    if (programmatic) {
      programmatic = false;
      return;
    }
    const el = containerRef.value;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    isPinned.value = distance <= BOTTOM_TOLERANCE_PX;
    showJump.value = distance > JUMP_THRESHOLD_PX;
  };

  const scrollToBottom = (smooth = false) => {
    const el = containerRef.value;
    if (!el) return;
    programmatic = true;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    isPinned.value = true;
    showJump.value = false;
  };

  const events = ['wheel', 'touchstart', 'touchmove', 'keydown', 'mousedown'] as const;

  onMounted(() => {
    const el = containerRef.value;
    if (!el) return;
    events.forEach((e) => el.addEventListener(e, markUserInput, { passive: true }));
  });

  onBeforeUnmount(() => {
    const el = containerRef.value;
    if (!el) return;
    events.forEach((e) => el.removeEventListener(e, markUserInput));
  });

  watch(
    deps,
    () => {
      if (performance.now() - lastUserInputAt <= COOLDOWN_MS) return;
      if (isPinned.value) scrollToBottom(false);
    },
    { flush: 'post' }
  );

  return { isPinned, showJump, handleScroll, scrollToBottom, markUserInput };
}
```

### 4.3 Composer.vue —— IME 守卫的 Vue 写法

```vue
<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';

const props = defineProps<{ modelValue: string; disabled?: boolean }>();
const emit = defineEmits<{
  'update:modelValue': [value: string];
  submit: [value: string];
}>();

const textarea = ref<HTMLTextAreaElement | null>(null);
const MAX_HEIGHT = 384;

function resize() {
  const el = textarea.value;
  if (!el) return;
  el.style.height = 'auto';
  const next = Math.min(Math.max(el.scrollHeight, 44), MAX_HEIGHT);
  el.style.height = `${next}px`;
  el.style.overflowY = el.scrollHeight > MAX_HEIGHT ? 'auto' : 'hidden';
}

watch(() => props.modelValue, () => nextTick(resize), { immediate: true });

function submit() {
  const v = props.modelValue.trim();
  if (!v || props.disabled) return;
  emit('submit', v);
}

/**
 * EDGE-01：合成态守卫
 * Vue 的 KeyboardEvent 同样有 isComposing，keyCode 229 也适用。
 * 另外建议用 compositionstart/end 维护一个显式标志，覆盖部分旧浏览器。
 */
let composing = false;
const onCompositionStart = () => { composing = true; };
const onCompositionEnd = () => { composing = false; };

function onKeydown(e: KeyboardEvent) {
  if (e.isComposing || composing || e.keyCode === 229) return;
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    submit();
  }
}
</script>

<template>
  <div
    class="w-full rounded-composer bg-surface-3 p-6 transition-shadow duration-fast ease-out
           shadow-[0_4px_20px_rgba(28,27,25,0.035),inset_0_0_0_1px_var(--border-default)]
           focus-within:shadow-[0_4px_24px_rgba(28,27,25,0.08),inset_0_0_0_1px_var(--border-strong)]"
  >
    <textarea
      ref="textarea"
      :value="modelValue"
      :disabled="disabled"
      rows="1"
      placeholder="描述你想要的界面…"
      class="w-full resize-none border-0 bg-transparent px-2 text-body-lg text-primary
             outline-none placeholder:text-tertiary max-sm:text-[16px]"
      style="height: 44px"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      @keydown="onKeydown"
      @compositionstart="onCompositionStart"
      @compositionend="onCompositionEnd"
    />
    <div class="mt-3 flex items-center justify-between border-t border-subtle pt-3">
      <div><slot name="leading" /></div>
      <div class="flex items-center gap-2">
        <slot name="trailing" />
        <button
          type="button"
          aria-label="发送"
          :disabled="!modelValue.trim() || disabled"
          class="flex size-8 items-center justify-center rounded-lg bg-accent text-on-accent
                 transition-[background-color,transform] duration-fast ease-out
                 hover:bg-accent-hover active:scale-[0.98] focus-visible:shadow-focus
                 disabled:pointer-events-none disabled:opacity-35"
          @click="submit"
        >
          ↑
        </button>
      </div>
    </div>
  </div>
</template>
```

### 4.4 Dialog.vue —— Teleport + 焦点陷阱

```vue
<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';

const props = defineProps<{
  open: boolean;
  title: string;
  tone?: 'default' | 'danger';
}>();
const emit = defineEmits<{ 'update:open': [value: boolean] }>();

const panel = ref<HTMLDivElement | null>(null);
let restoreFocus: HTMLElement | null = null;

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

watch(
  () => props.open,
  async (open) => {
    if (open) {
      restoreFocus = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';
      await nextTick();
      const items = panel.value?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (items?.length) {
        // 危险操作默认聚焦「取消」（最后一个）
        const target = props.tone === 'danger' ? items[items.length - 1] : items[0];
        target.focus({ preventScroll: true });
      }
    } else {
      document.body.style.overflow = '';
      restoreFocus?.focus({ preventScroll: true });
    }
  }
);

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('update:open', false);
    return;
  }
  if (e.key !== 'Tab' || !panel.value) return;
  const items = [...panel.value.querySelectorAll<HTMLElement>(FOCUSABLE)];
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-6" @keydown="onKeydown">
      <div class="absolute inset-0 bg-overlay backdrop-blur-[8px]" @click="emit('update:open', false)" />
      <div
        ref="panel"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        tabindex="-1"
        class="relative w-full max-w-[448px] rounded-2xl bg-surface-2 p-8 shadow-popover focus:outline-none"
      >
        <h2 class="text-heading font-semibold text-primary wrap-balance">{{ title }}</h2>
        <div class="mt-6"><slot /></div>
        <div class="mt-6 flex justify-end gap-2"><slot name="footer" /></div>
      </div>
    </div>
  </Teleport>
</template>
```

---

## 5. Vue 特有的坑

| 坑 | 说明 | 对策 |
| :-- | :-- | :-- |
| **`v-model` 与合成态** | Vue 在 composition 期间也会触发 `input`，值会实时更新 | 提交只走 `keydown` 守卫，不要监听 `input` 提交 |
| **`class` 合并** | 父组件传的 `class` 会自动合并到根元素 | 与 `cn()` 配合时，把父级 class 放最后 |
| **`$attrs` 透传** | 默认透传到根元素，多层包裹时会落错位置 | `inheritAttrs: false` + 显式 `v-bind="$attrs"` |
| **`useId` 版本** | Vue 3.5 才有 `useId` | 低版本用模块级自增计数器 |
| **`ref` 与 `reactive`** | `reactive` 解构会丢失响应性 | DOM 引用与简单状态一律用 `ref` |
| **`watch` 时机** | 默认在 DOM 更新前触发 | 需要读布局时加 `{ flush: 'post' }` |
| **Teleport 与 SSR** | 服务端渲染时 Teleport 目标不存在 | 用 `<ClientOnly>` 包裹或 `onMounted` 后再渲染 |
| **容器查询** | 需要 `@tailwindcss/container-queries` 插件 | 与 React 版一致，别忘了装 |

---

## 6. 两套实现如何保持一致

这是最大的风险点：React 和 Vue 各写一套，容易漂移。

**三条纪律**：

1. **令牌只有一份** —— `tokens.json` / `tokens.css` 是唯一事实源，两个项目都从它引用，不各存一份。
2. **组件契约写进规范，不写进代码** —— `UI-SPEC.md §6` 的配方是共同标准。改组件前先改规范，两边再同步。
3. **用截图做回归** —— 同一组 Storybook / Histoire 用例，浅深两色截图比对。视觉差异超过阈值即视为漂移。

**建议目录**：

```
packages/
├── tokens/                  # 单一事实源（json + css）
│   ├── tokens.json
│   └── tokens.css
├── ui-react/                # React 实现
│   └── src/components/…
└── ui-vue/                  # Vue 实现
    └── src/components/…
```

两个 `ui-*` 包都 `peerDepend` 同一个 `tokens` 包。这样令牌改动一处，两端同时生效。

---

## 7. 一句话结论

> **规范跨框架，组件不跨框架。**
> 令牌和规则共享，组件各写各的——这比强行做一套"通用组件"要省心得多，也更符合两边的惯用法。
