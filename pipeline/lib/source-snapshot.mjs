/**
 * 抓图时的源码快照
 * ------------------------------------------------------------------
 * 「上游变过了」这个提醒，只说了变没变，没说**变了什么**——于是「照旧还是改字」
 * 只能拍脑袋。要摆出差异，就得有个可比的基线。
 *
 * ## 为什么不直接用 git
 *
 * 原型工程里大量文件可能还没入库（未跟踪或已改未提交）。
 * `git diff` 对未跟踪文件一个字都给不出来，而那恰恰常常是正在迭代、最该看的那个：
 * 某次页面改版把 Prompt 从「基本信息」挪进「高级配置」，`create.vue`
 * 当时就是未跟踪状态。只靠 git 的话，这个功能在最需要它的场合恰好失灵。
 *
 * 所以基线自己存：抓图时把这条路由牵涉的源码各存一份，**按内容哈希去重**——
 * 78 张图共享那几个组件文件，落盘的是几个 blob 而不是几百份拷贝。
 *
 * ## 为什么不入库
 *
 * `docs/kb/_sources/` 走 gitignore：它是本地缓存，不是事实。丢了的代价只是
 * 「这次看不到 diff」，重抓一次就有了；而把源码副本提交进仓库，等于同一份代码
 * 存两遍，且会随迭代无限长大。
 *
 * ## 差异怎么算
 *
 * 交给 `git diff --no-index`——统一差异格式的实现细节不值得自己写一遍，
 * 而 git 本来就是这条链上的依赖。
 * 它对两个任意路径都能比，不要求在仓库里。
 */

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { KB_DIR } from "./paths.mjs";

const STORE = path.join(KB_DIR, "_sources");
const sha = (s) => createHash("sha1").update(s).digest("hex").slice(0, 12);

/**
 * 存一份快照，返回 `{ 文件相对路径: 内容哈希 }`。
 * 内容没变过的文件不会重复落盘。
 */
export async function snapshotSources(repoRoot, files) {
  const out = {};
  await fs.mkdir(STORE, { recursive: true });
  for (const rel of files ?? []) {
    const text = await fs.readFile(path.join(repoRoot, rel), "utf8").catch(() => null);
    if (text === null) continue;
    const hash = sha(text);
    const blob = path.join(STORE, `${hash}.snap`);
    try {
      await fs.access(blob);
    } catch {
      await fs.writeFile(blob, text, "utf8");
    }
    out[rel] = hash;
  }
  return out;
}

/** 这些文件现在的内容哈希，与快照同一算法，可直接逐文件比对 */
export async function currentHashes(repoRoot, files) {
  const out = {};
  for (const rel of files ?? []) {
    const text = await fs.readFile(path.join(repoRoot, rel), "utf8").catch(() => null);
    if (text !== null) out[rel] = sha(text);
  }
  return out;
}

function git(args, cwd) {
  return new Promise((resolve) => {
    const p = spawn("git", args, { cwd, stdio: ["ignore", "pipe", "ignore"] });
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    // `--no-index` 有差异时退出码是 1，那是「有差异」不是「出错」，一律按输出算
    p.on("exit", () => resolve(out));
    p.on("error", () => resolve(""));
  });
}

/**
 * 快照与现在的差异。
 *
 * @returns [{ file, status: "changed"|"same"|"gone"|"nobase", diff }]
 */
export async function diffSince(repoRoot, snapshot) {
  const results = [];
  const tmp = path.join(os.tmpdir(), "kb-source-diff");
  await fs.mkdir(tmp, { recursive: true });

  for (const [rel, hash] of Object.entries(snapshot ?? {})) {
    const blob = path.join(STORE, `${hash}.snap`);
    const before = await fs.readFile(blob, "utf8").catch(() => null);
    const after = await fs.readFile(path.join(repoRoot, rel), "utf8").catch(() => null);

    if (before === null) {
      results.push({ file: rel, status: "nobase", diff: "" });
      continue;
    }
    if (after === null) {
      results.push({ file: rel, status: "gone", diff: "" });
      continue;
    }
    if (before === after) {
      results.push({ file: rel, status: "same", diff: "" });
      continue;
    }

    // 文件名带进临时路径，diff 头里才看得出是哪个文件
    const base = path.basename(rel);
    const a = path.join(tmp, `抓图时-${base}`);
    const b = path.join(tmp, `现在-${base}`);
    await fs.writeFile(a, before, "utf8");
    await fs.writeFile(b, after, "utf8");
    const diff = await git(["diff", "--no-index", "--no-color", "-U2", "--", a, b], tmp);
    results.push({ file: rel, status: "changed", diff: trimDiff(diff) });
  }

  // 变了的排前面——面板里不用滚到底去找
  const order = { changed: 0, gone: 1, nobase: 2, same: 3 };
  return results.sort((x, y) => order[x.status] - order[y.status] || x.file.localeCompare(y.file));
}

/** 去掉 diff 头四行（两个临时路径的 a/b 行），它们只会暴露 /tmp 路径、没有信息量 */
function trimDiff(diff) {
  const lines = diff.split("\n");
  const at = lines.findIndex((l) => l.startsWith("@@"));
  return (at > 0 ? lines.slice(at) : lines).join("\n").trim();
}
