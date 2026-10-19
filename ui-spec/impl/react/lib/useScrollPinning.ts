import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * EDGE-02 — 流式输出防抢夺滚动
 * ---------------------------------------------------------------------------
 * 痛点：AI 逐字输出时，用户向上翻看历史，会被源源不断的内容强制拉回底部。
 * 解法：用户手势优先 + 150ms 冷却窗口 + 40px 底部容差。
 *
 * 用法：
 *   const { containerRef, isPinned, showJump, scrollToBottom } =
 *     useScrollPinning([streamingText]);
 *
 *   <div ref={containerRef} className="scroll-fade overflow-y-auto">…</div>
 */

const COOLDOWN_MS = 150;
const BOTTOM_TOLERANCE_PX = 40;
const JUMP_THRESHOLD_PX = 120;

export function useScrollPinning(deps: unknown[] = []) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPinned, setIsPinned] = useState(true);
  const [showJump, setShowJump] = useState(false);

  const lastUserInputAt = useRef(0);
  const programmaticScroll = useRef(false);

  /** 任何物理输入都立刻释放图钉锁定 */
  const markUserInput = useCallback(() => {
    lastUserInputAt.current = performance.now();
    setIsPinned(false);
  }, []);

  const handleScroll = useCallback(() => {
    if (programmaticScroll.current) {
      programmaticScroll.current = false;
      return;
    }
    const el = containerRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    setIsPinned(distance <= BOTTOM_TOLERANCE_PX);
    setShowJump(distance > JUMP_THRESHOLD_PX);
  }, []);

  const scrollToBottom = useCallback((smooth = false) => {
    const el = containerRef.current;
    if (!el) return;
    programmaticScroll.current = true;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto',
    });
    // 已经在底部时不会触发 scroll 事件，不能把标记留给下一次用户滚动。
    requestAnimationFrame(() => {
      programmaticScroll.current = false;
    });
    setIsPinned(true);
    setShowJump(false);
  }, []);

  /** 监听用户物理输入：滚轮、触摸、按键、点按 */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const opts = { passive: true } as AddEventListenerOptions;
    el.addEventListener('wheel', markUserInput, opts);
    el.addEventListener('touchstart', markUserInput, opts);
    el.addEventListener('touchmove', markUserInput, opts);
    el.addEventListener('keydown', markUserInput, opts);
    el.addEventListener('mousedown', markUserInput, opts);

    return () => {
      el.removeEventListener('wheel', markUserInput);
      el.removeEventListener('touchstart', markUserInput);
      el.removeEventListener('touchmove', markUserInput);
      el.removeEventListener('keydown', markUserInput);
      el.removeEventListener('mousedown', markUserInput);
    };
  }, [markUserInput]);

  /** 内容变化时：冷却窗口外、且处于锁定态，才自动跟随 */
  useEffect(() => {
    if (performance.now() - lastUserInputAt.current <= COOLDOWN_MS) return;
    if (isPinned) scrollToBottom(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return {
    containerRef,
    isPinned,
    showJump,
    markUserInput,
    handleScroll,
    scrollToBottom,
  };
}
