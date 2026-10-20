import { addReview, readContext, readOpenReviews, readPublishPlan, readStatus, resolveReview } from "./project.mjs";
import { runKit } from "./kit.mjs";

function pageRef(page) {
  const rel = String(page || "").replace(/^\/+/, "");
  if (!rel || rel.includes("\0") || rel.split("/").includes("..") || !rel.endsWith(".md")) {
    throw new Error("page 必须是 docs/kb 下的 .md 相对路径，例如 guide/intro.md");
  }
  return rel;
}

function summarizeStatus(data) {
  return {
    summary: data.summary,
    review: (data.review || []).map((file) => ({
      path: file.path,
      title: file.title,
      open: file.open,
      reviewedAt: file.reviewedAt,
      refs: (file.refs || [])
        .filter((ref) => ref.state !== "ok" && !ref.unverified)
        .map((ref) => ({ id: ref.id, type: ref.type, line: ref.line, state: ref.state, reason: ref.reason })),
    })),
    following: (data.following || []).map((file) => ({ path: file.path, title: file.title, open: file.open })),
    backlog: (data.backlog || []).map((file) => ({ path: file.path, title: file.title })),
    planning: (data.planning || []).map((file) => ({ path: file.path, title: file.title, unfilled: file.unfilled })),
  };
}

/**
 * The Bee Press domain service. Keeping workspace access here lets tools,
 * HTTP routes, and future UI packages share one contract instead of each
 * reading docs/kb directly.
 */
export function createBeePressService() {
  return {
    name: "beepress",

    status(root) {
      return readStatus(root);
    },

    context(root, options) {
      return readContext(root, options);
    },

    reviews(root) {
      return readOpenReviews(root);
    },

    addReview(root, options) {
      return addReview(root, options);
    },

    resolveReview(root, options) {
      return resolveReview(root, options);
    },

    async contentStatus(root) {
      const result = await runKit(root, ["kb", "status", "--json"]);
      const data = JSON.parse(result.stdout);
      return {
        root: result.root,
        lock: "docs/kb/_lock.json",
        ...summarizeStatus(data),
      };
    },

    async contentConfirm(root, { page, refs = [] } = {}) {
      const rel = pageRef(page);
      const ids = (Array.isArray(refs) ? refs : [refs]).filter(Boolean).map(String);
      const result = await runKit(root, ["kb", "ack", rel, ...ids]);
      return {
        ok: true,
        page: rel,
        refs: ids,
        root: result.root,
        output: result.stdout.trim(),
      };
    },

    publishPlan(root) {
      return readPublishPlan(root);
    },

    async captureMedia(root, { kind = "shot", only = [] } = {}) {
      const keys = (Array.isArray(only) ? only : [only]).filter(Boolean).map(String);
      const command = kind === "clip" ? "record-kb-clips" : "capture-kb-shots";
      if (!["shot", "clip"].includes(kind)) throw new Error("kind 必须是 shot 或 clip");
      const args = [command];
      for (const key of keys) args.push("--only", key);
      const result = await runKit(root, args, { timeout: 15 * 60_000 });
      return {
        ok: true,
        kind,
        keys,
        root: result.root,
        output: result.stdout.trim(),
      };
    },
  };
}
