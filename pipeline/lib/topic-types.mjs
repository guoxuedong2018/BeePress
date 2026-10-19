/**
 * 话题类型与结构模板
 * ------------------------------------------------------------------
 * 一篇文档讲一个话题。录屏、截图、流程图、文字都是为了把这个话题讲给读者听，
 * 所以**结构跟着话题走**：读者想「做成一件事」和想「弄明白一个概念」，要的是两种文档。
 *
 * 分类参考 Diátaxis（操作指南 / 概念解释 / 参考 / 教程），按这个平台的实际话题收成五类。
 * 模板是**起点**，不是格式：Agent 提议蓝图时按话题增删、改名、拆合，人在构成视图里再调。
 *
 * 每一节带两样东西，都会写进 md 成为蓝图：
 *   intent  这一节要回答读者的什么问题（<!--intent …-->）
 *   slots   建议用什么讲（<!--slot 录屏 …-->）；规则、取值写表格，空间位置配截图，
 *           因果动作配录屏，对象关系和状态流转配流程图
 */

export const SLOT_KINDS = {
  shot: "截图",
  clip: "录屏",
  diagram: "流程图",
  table: "表格",
};

export const TOPIC_TYPES = {
  howto: {
    label: "操作指南",
    reader: "想做成一件事",
    sections: [
      { title: "什么时候用这篇", intent: "不用这个功能会卡在哪、用了解决什么——先立问题再给工具", slots: [] },
      { title: "开始之前", intent: "没有这些，照着走到第一步就会卡住：权限、前置对象、要准备的文件", slots: [{ kind: "table", hint: "前置条件与说明" }] },
      { title: "操作步骤", intent: "一步一个小节，标题就是动作；每步说清填什么、会被什么拦住", slots: [{ kind: "shot", hint: "每一步停在的那一屏" }, { kind: "clip", hint: "最容易做错的那一步的操作过程" }] },
      { title: "怎么确认成了", intent: "做完去哪看、看到什么算对", slots: [{ kind: "shot", hint: "成功后的结果页" }] },
      { title: "常见问题", intent: "真实会被问到的，不是补充说明", slots: [] },
    ],
  },
  concept: {
    label: "概念解释",
    reader: "想弄明白它是什么、为什么这样",
    sections: [
      { title: "为什么要先理解这个", intent: "不懂这层会在哪里踩坑", slots: [] },
      { title: "它是什么", intent: "一句话定义，再讲清边界：它不是什么", slots: [] },
      { title: "它和谁有关系", intent: "上下游对象、数据从哪来到哪去", slots: [{ kind: "diagram", hint: "对象关系或数据流向" }] },
      { title: "它会经历哪些状态", intent: "状态怎么流转、谁触发、每个状态下能做什么", slots: [{ kind: "diagram", hint: "状态流转" }] },
    ],
  },
  reference: {
    label: "规则参考",
    reader: "想查某条规则、某个取值",
    sections: [
      { title: "这张表管什么", intent: "适用范围：哪些页面、哪些对象", slots: [] },
      { title: "规则一览", intent: "逐条列清，读者按条目查，不按叙述读", slots: [{ kind: "table", hint: "规则 / 取值 / 例外" }] },
      { title: "容易误解的几条", intent: "直觉和实际不一样的地方，配一张图说明", slots: [{ kind: "shot", hint: "最容易被误解的那一处" }] },
    ],
  },
  troubleshoot: {
    label: "排障",
    reader: "遇到问题了，想知道为什么、怎么办",
    sections: [
      { title: "你看到的是什么", intent: "现象长什么样，让读者先确认说的就是自己遇到的", slots: [{ kind: "shot", hint: "出问题时的那一屏" }] },
      { title: "为什么会这样", intent: "常见原因，按出现频率排，每条说清怎么判断是不是它", slots: [{ kind: "table", hint: "原因 / 怎么判断" }] },
      { title: "怎么解决", intent: "按原因给办法；能在平台上自助的给操作步骤", slots: [{ kind: "clip", hint: "自助处理的操作过程" }] },
      { title: "解决不了找谁", intent: "什么情况要升级、带上哪些信息", slots: [] },
    ],
  },
  overview: {
    label: "模块概述",
    reader: "第一次进这个模块，想知道它管什么",
    sections: [
      { title: "这个模块解决什么", intent: "两三句，从使用者的麻烦切入", slots: [] },
      { title: "常用任务", intent: "链到本模块下的操作页，按使用频率排", slots: [] },
      { title: "和其他模块的关系", intent: "上下游是谁、数据从哪来到哪去", slots: [{ kind: "diagram", hint: "模块上下游" }] },
      { title: "常见问题", intent: "模块级的疑问，具体操作的问题放各自的操作页", slots: [] },
    ],
  },
};

/** 模板 → md 骨架：标题 + 意图 + 格子，没有正文 */
export function skeletonOf(type, { routes = [] } = {}) {
  const t = TOPIC_TYPES[type];
  if (!t) throw new Error(`不认识的话题类型：${type}（可选 ${Object.keys(TOPIC_TYPES).join(" / ")}）`);
  const at = routes[0] ? ` @${routes[0]}` : "";
  return t.sections
    .map((s) => [`## ${s.title}`, "", `<!--intent ${s.intent}-->`, ...s.slots.map((x) => `\n<!--slot ${x.kind}${x.kind === "shot" || x.kind === "clip" ? at : ""} ${x.hint}-->`), ""].join("\n"))
    .join("\n");
}
