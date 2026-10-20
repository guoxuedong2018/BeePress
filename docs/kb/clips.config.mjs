/**
 * 知识库录屏配方（宿主项目）
 * ------------------------------------------------------------------
 * 由 `npx beepress record-kb-clips` 消费，产物落 docs/kb/media/<页面>/。
 * 每段同时生成 MP4、GIF 和 SRT。
 *
 * 示例：
 *   export const CLIPS = {
 *     "getting-started/create": {
 *       route: "/create",
 *       caption: "创建一个任务",
 *       setup: [{ settle: 900 }],
 *       cursorStart: { x: 240, y: 240 },
 *       gif: { width: 900, fps: 10 },
 *       segments: [{ name: "结论", say: "点击新建", timeline: [{ hold: 1200 }] }],
 *     },
 *   };
 */
export const CLIPS = {};
