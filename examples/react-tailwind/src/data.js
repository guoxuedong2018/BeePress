export const METRICS = [
  { id: "throughput", label: "Runs this week", value: "1,284", delta: "+18.2%", trend: "up", points: [18, 24, 20, 31, 28, 39, 44, 41, 52, 58, 61, 72] },
  { id: "quality", label: "Retrieval quality", value: "94.7", delta: "+2.1", trend: "up", points: [52, 55, 53, 58, 61, 60, 64, 68, 71, 70, 74, 78] },
  { id: "latency", label: "p95 latency", value: "312ms", delta: "-41ms", trend: "down", points: [72, 68, 70, 64, 61, 58, 55, 52, 48, 44, 42, 39] },
];

export const EXPERIMENTS = [
  { id: "exp-042", name: "Retrieval quality · hybrid rerank", owner: "Ada Chen", status: "running", updated: "2 min ago", samples: 1284, score: 94.7, tag: "rerank-v3" },
  { id: "exp-041", name: "Long-context summarization", owner: "Milo Park", status: "review", updated: "18 min ago", samples: 860, score: 91.2, tag: "ctx-128k" },
  { id: "exp-040", name: "Tool-call reliability", owner: "Jun Ito", status: "passed", updated: "1 hr ago", samples: 2048, score: 98.4, tag: "tools-v2" },
  { id: "exp-039", name: "Structured extraction", owner: "Ada Chen", status: "failed", updated: "3 hr ago", samples: 512, score: 78.9, tag: "schema-v1" },
  { id: "exp-038", name: "Citation faithfulness", owner: "Noor Ali", status: "passed", updated: "Yesterday", samples: 1660, score: 96.1, tag: "cite-v4" },
];

export const ACTIVITY = [
  { id: "a1", who: "Ada", action: "promoted", target: "rerank-v3 to candidate", when: "4 min ago", state: "success" },
  { id: "a2", who: "Milo", action: "left 3 comments on", target: "exp-041 review", when: "12 min ago", state: "info" },
  { id: "a3", who: "Pipeline", action: "refreshed", target: "7 golden screenshots", when: "26 min ago", state: "success" },
  { id: "a4", who: "Jun", action: "flagged", target: "schema drift in exp-039", when: "1 hr ago", state: "warning" },
];

export const THREADS = [
  {
    id: "t1",
    number: 1,
    author: "Ada",
    time: "2 min",
    body: "The score column is the first thing people compare. Keep it monospaced and right-aligned.",
    resolved: false,
    tone: "accent",
  },
  {
    id: "t2",
    number: 2,
    author: "Milo",
    time: "8 min",
    body: "This empty state needs a next step, not just a label. Add “Create experiment”.",
    resolved: false,
    tone: "warning",
  },
  {
    id: "t3",
    number: 3,
    author: "Jun",
    time: "21 min",
    body: "Filter and search should share one row below 720px; the toolbar is too tall now.",
    resolved: true,
    tone: "success",
  },
];

export const COMMANDS = [
  { id: "new", label: "New experiment", hint: "⌘ N", section: "Create" },
  { id: "run", label: "Run selected experiment", hint: "⌘ ↵", section: "Actions" },
  { id: "review", label: "Open review queue", hint: "G R", section: "Navigate" },
  { id: "experiments", label: "Go to experiments", hint: "G E", section: "Navigate" },
  { id: "overview", label: "Go to overview", hint: "G O", section: "Navigate" },
  { id: "theme", label: "Toggle dark mode", hint: "⌘ ⇧ L", section: "Preferences" },
];
