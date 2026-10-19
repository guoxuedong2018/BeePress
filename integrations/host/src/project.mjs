import { promises as fs } from "node:fs";
import path from "node:path";

const MAX_SCAN_FILES = 400;
const MAX_CONTEXT_FILES = 20;
const MAX_EXCERPT = 700;

export function resolveRoot(input) {
  return path.resolve(input || process.env.BEEPRESS_ROOT || process.env.BUILDER_KIT_ROOT || process.cwd());
}

async function statSafe(file) {
  try {
    return await fs.stat(file);
  } catch {
    return null;
  }
}

async function walk(dir, predicate, limit = MAX_SCAN_FILES) {
  const out = [];
  async function visit(current) {
    if (out.length >= limit) return;
    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (out.length >= limit) return;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith(".") && entry.name !== "node_modules") await visit(full);
      } else if (predicate(full, entry.name)) {
        out.push(full);
      }
    }
  }
  await visit(dir);
  return out;
}

function titleOf(text, file) {
  const frontMatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (frontMatter) {
    const title = frontMatter[1].match(/^title:\s*(.+)$/m);
    if (title) return title[1].replace(/^["']|["']$/g, "").trim();
  }
  const heading = text.match(/^#\s+(.+)$/m);
  return heading ? heading[1].trim() : path.basename(file, path.extname(file));
}

function excerptOf(text) {
  const body = text
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return body.slice(0, MAX_EXCERPT);
}

async function readComments(file) {
  const raw = await fs.readFile(file, "utf8");
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.comments)) return parsed.comments;
  throw new Error(`Unrecognized review file: ${file}`);
}

async function reviewSummary(root) {
  const dir = path.join(root, "docs", "reviews");
  const files = (await statSafe(dir)) ? await walk(dir, (_full, name) => name.endsWith(".json")) : [];
  const comments = [];
  const errors = [];
  for (const file of files) {
    try {
      comments.push(...(await readComments(file)).filter(Boolean));
    } catch (error) {
      errors.push({ file: path.relative(root, file), error: error instanceof Error ? error.message : String(error) });
    }
  }
  const open = comments.filter((comment) => comment.status !== "resolved");
  return { files: files.length, comments: comments.length, open: open.length, errors };
}

async function featureSummary(root) {
  const dir = path.join(root, "docs", "features");
  if (!(await statSafe(dir))) return { specs: 0, keys: [] };
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const keys = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (await statSafe(path.join(dir, entry.name, "FRS.json"))) keys.push(entry.name);
  }
  return { specs: keys.length, keys: keys.sort() };
}

export async function readStatus(inputRoot) {
  const root = resolveRoot(inputRoot);
  const kbDir = path.join(root, "docs", "kb");
  const kbFiles = (await statSafe(kbDir)) ? await walk(kbDir, (_full, name) => name.endsWith(".md")) : [];
  const pages = [];
  for (const file of kbFiles.slice(0, MAX_SCAN_FILES)) {
    const text = await fs.readFile(file, "utf8").catch(() => "");
    pages.push({ file: path.relative(kbDir, file), title: titleOf(text, file) });
  }

  let devScript = null;
  const packageFile = path.join(root, "package.json");
  try {
    const pkg = JSON.parse(await fs.readFile(packageFile, "utf8"));
    devScript = pkg.scripts?.dev ?? null;
  } catch {
    // A workspace without a package.json is still inspectable.
  }

  const webDir = (await statSafe(path.join(root, "web"))) ? "web" : ".";
  const gateway = process.env.BUILDER_KIT_PUBLISH_GATEWAY || null;
  const legacyDocsCli = process.env.BUILDER_KIT_DOCS_CLI || null;

  return {
    root,
    docs: {
      kb: { files: pages.length, pages: pages.slice(0, 50) },
      reviews: await reviewSummary(root),
      features: await featureSummary(root),
    },
    prototype: { dir: webDir, devScript },
    publish: {
      configured: Boolean(gateway || legacyDocsCli),
      gateway,
      legacyDocsCli,
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function readContext(inputRoot, { topic = "", limit = 8 } = {}) {
  const root = resolveRoot(inputRoot);
  const kbDir = path.join(root, "docs", "kb");
  const files = (await statSafe(kbDir)) ? await walk(kbDir, (_full, name) => name.endsWith(".md")) : [];
  const needle = String(topic || "").trim().toLowerCase();
  const max = Math.max(1, Math.min(MAX_CONTEXT_FILES, Number(limit) || 8));
  const results = [];

  for (const file of files.sort()) {
    const text = await fs.readFile(file, "utf8").catch(() => "");
    const rel = path.relative(kbDir, file);
    const title = titleOf(text, file);
    const excerpt = excerptOf(text);
    if (needle && !`${rel}\n${title}\n${excerpt}`.toLowerCase().includes(needle)) continue;
    results.push({ file: rel, title, excerpt });
    if (results.length >= max) break;
  }

  return {
    root,
    topic: topic || null,
    files: results,
    outline: (await statSafe(path.join(kbDir, "outline.config.mjs"))) ? "docs/kb/outline.config.mjs" : null,
  };
}

export async function readOpenReviews(inputRoot) {
  const root = resolveRoot(inputRoot);
  const dir = path.join(root, "docs", "reviews");
  const files = (await statSafe(dir)) ? await walk(dir, (_full, name) => name.endsWith(".json")) : [];
  const comments = [];
  const errors = [];
  for (const file of files) {
    try {
      for (const comment of await readComments(file)) {
        if (!comment || comment.status === "resolved") continue;
        comments.push({
          id: comment.id,
          frs: comment.frs ?? null,
          route: comment.route ?? null,
          author: comment.author ?? null,
          body: comment.body ?? "",
          createdAt: comment.createdAt ?? null,
          replies: Array.isArray(comment.replies) ? comment.replies.length : 0,
          anchor: comment.anchor ?? null,
          file: path.relative(root, file),
        });
      }
    } catch (error) {
      errors.push({ file: path.relative(root, file), error: error instanceof Error ? error.message : String(error) });
    }
  }
  comments.sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
  return { root, comments, errors };
}

export function renderJson(value) {
  return [{ type: "text", text: JSON.stringify(value, null, 2) }];
}
