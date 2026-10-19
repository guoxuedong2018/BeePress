import { proxy } from "valtio";
import { migrateAnchor } from "./anchor";

/**
 * 评审运行时状态
 * ------------------------------------------------------------------
 * 刻意不放进产品的状态树：评审层要能整体剥离，不能和生产代码缠在一起。
 * 用 valtio 的 proxy 承载：直接改字段，读它的组件（useSnapshot）自动重绘。
 *
 * 落盘依赖 vite dev 中间件（server/review-server.js）。构建/预览环境下接口不可用，
 * 会优雅降级为「会话内存」模式（persistent=false），刷新后评论丢失。
 *
 * @typedef {{ author: string, body: string, at: string }} CommentReply
 * @typedef {{
 *   id: string,
 *   frs: string,
 *   route: string,
 *   anchor: import("./anchor").CommentAnchor,
 *   body: string,
 *   author: string,
 *   status: "open" | "resolved",
 *   createdAt: string,
 *   replies: CommentReply[]
 * }} ReviewComment
 */

const API = "/__proto_review";
const AUTHOR_KEY = "proto-review-author";

function readAuthor() {
  try {
    return localStorage.getItem(AUTHOR_KEY) || "PM";
  } catch {
    return "PM";
  }
}

export const reviewState = proxy({
  commentMode: false,
  drawerOpen: false,
  /** @type {ReviewComment[]} */
  comments: [],
  /** 是否已连上 dev 落盘服务 */
  persistent: false,
  /** @type {string | null} */
  activeCommentId: null,
  author: readAuthor(),
  /** 当前路由，由宿主适配层的 router.subscribe 同步进来 */
  route: "/",
});

function genId() {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export async function loadAll() {
  try {
    const r = await fetch(`${API}/all`);
    if (!r.ok) return;
    const j = await r.json();
    // 旧版本落盘的 v1 锚点在这里统一升级，调用方只会看到 v2
    reviewState.comments = (j.comments ?? []).filter(Boolean).map((c) => ({
      ...c,
      anchor: migrateAnchor(c.anchor),
      replies: Array.isArray(c.replies) ? c.replies : [],
    }));
    reviewState.persistent = true;
  } catch {
    reviewState.persistent = false;
  }
}

function apiUpsert(c) {
  fetch(`${API}/upsert`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(c),
  }).catch(() => {});
}

function apiDelete(c) {
  fetch(`${API}/delete`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: c.id, frs: c.frs }),
  }).catch(() => {});
}

export function setRoute(path) {
  if (reviewState.route === path) return;
  reviewState.route = path;
}

export function setAuthor(name) {
  reviewState.author = name;
  try {
    localStorage.setItem(AUTHOR_KEY, name);
  } catch {
    /* localStorage 不可用时忽略 */
  }
}

export function addComment({ frs, anchor, body }) {
  /** @type {ReviewComment} */
  const c = {
    id: genId(),
    frs,
    route: reviewState.route,
    anchor,
    body: body.trim(),
    author: reviewState.author,
    status: "open",
    createdAt: new Date().toISOString(),
    replies: [],
  };
  reviewState.comments.push(c);
  reviewState.activeCommentId = c.id;
  apiUpsert(c);
  return c;
}

export function updateComment(c) {
  const idx = reviewState.comments.findIndex((x) => x.id === c.id);
  if (idx >= 0) reviewState.comments.splice(idx, 1, c);
  apiUpsert(c);
}

export function removeComment(c) {
  reviewState.comments = reviewState.comments.filter((x) => x.id !== c.id);
  apiDelete(c);
}

