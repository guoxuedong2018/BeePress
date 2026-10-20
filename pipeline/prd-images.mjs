#!/usr/bin/env node
/**
 * 截图上传结果 → imageId 映射
 * ------------------------------------------------------------------
 * `word +append-image` 的 data.appendedImages[] 与命令行 --image 的出现顺序一一对应，
 * 只回 imageId、不回文件名。这里按 shots.json 的 order 把两边对齐，顺带做两件事：
 *
 *   1. 拼出可以直接粘给 CLI 的 --image 参数串（避免手敲顺序错位，图跑到别的功能点上）
 *   2. 校验每个 imageId 以本文档 docId 结尾——服务端不校验 imageId 存在性，
 *      截断值照样写入成功并返回 ok，只有渲染时才暴露成一张挂图
 *
 * 用法：
 *   # 第一步：列出 --image 参数（按 shots.json 的 order）
 *   npx beepress prd-images <KEY> --args
 *
 *   # 第二步：把 append-image 的 JSON 输出存盘后对齐
 *   npx beepress prd-images <KEY> --from append.json --doc-id fcXXXX
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PRD_DIR, REPO_ROOT } from "./lib/paths.mjs";

/**
 * 按截图顺序把追图换回的 imageId 对上 key，并校验每个都以本文档 docId 结尾。
 * @returns { [shotKey]: imageId }；数量对不上或有可疑的值就抛错，一张都不用
 */
export function alignImages(order, imageIds, docId) {
  if (imageIds.length !== order.length) {
    throw new Error(`数量对不上：追了 ${imageIds.length} 张，配方里有 ${order.length} 张。顺序一旦错位，图会挂到别的功能点上，必须重追。`);
  }
  const map = {};
  const bad = [];
  order.forEach((key, index) => {
    const imageId = imageIds[index];
    if (!imageId) bad.push(`${key}：没有 imageId`);
    else if (docId && !imageId.endsWith(docId)) bad.push(`${key}：imageId 不以 ${docId} 结尾，疑似被截断`);
    map[key] = imageId;
  });
  if (bad.length) throw new Error(`imageId 校验未通过（服务端不校验存在性，错值会静默写入、渲染时才挂）：\n${bad.map((b) => `  ✗ ${b}`).join("\n")}`);
  return map;
}

function parseArgs(argv) {
  const args = { key: null, from: null, docId: null, listArgs: false };
  for (let i = 0; i < argv.length; i += 1) {
    const [flag, inline] = argv[i].split("=");
    const take = () => inline ?? argv[++i];
    if (flag === "--from") args.from = take();
    else if (flag === "--doc-id") args.docId = take();
    else if (flag === "--args") args.listArgs = true;
    else if (flag === "--help" || flag === "-h") args.help = true;
    else if (!flag.startsWith("-")) args.key = flag;
  }
  return args;
}

/** append-image 的输出可能带 CLI envelope，也可能是裸 result */
function appendedImages(payload) {
  const candidates = [payload?.data?.appendedImages, payload?.appendedImages, payload?.data?.result?.appendedImages];
  const found = candidates.find(Array.isArray);
  if (!found) throw new Error("输出里找不到 data.appendedImages[]，确认命令是否成功");
  return found;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.key) {
    console.log(
      [
        "用法: npx beepress prd-images <FEATURE_KEY> [选项]",
        "",
        "  --args              按 shots.json 的 order 打印 --image 参数串",
        "  --from <文件>       word +append-image 的 JSON 输出",
        "  --doc-id <docId>    用于校验 imageId 是否以本文档 docId 结尾",
      ].join("\n"),
    );
    process.exitCode = args.help ? 0 : 1;
    return;
  }

  const outDir = path.join(PRD_DIR, args.key);
  const shots = JSON.parse(await fs.readFile(path.join(outDir, "shots.json"), "utf8"));

  if (args.listArgs) {
    const missing = [];
    for (const file of shots.files) {
      await fs.access(file).catch(() => missing.push(path.relative(REPO_ROOT, file)));
    }
    if (missing.length > 0) {
      console.error(`缺 ${missing.length} 张截图，先跑 capture-shots.mjs：`);
      for (const f of missing) console.error(`  ${f}`);
      process.exitCode = 1;
      return;
    }
    console.log(shots.files.map((f) => `--image "${f}"`).join(" "));
    return;
  }

  if (!args.from) {
    console.error("要么给 --args 列参数，要么给 --from 对齐结果。");
    process.exitCode = 1;
    return;
  }

  const payload = JSON.parse(await fs.readFile(path.resolve(REPO_ROOT, args.from), "utf8"));
  let map;
  try {
    map = alignImages(shots.order, appendedImages(payload).map((x) => x?.imageId), args.docId);
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
    return;
  }

  const file = path.join(outDir, "images.json");
  await fs.writeFile(file, `${JSON.stringify(map, null, 2)}\n`, "utf8");
  console.log(`已对齐 ${shots.order.length} 张 → ${path.relative(REPO_ROOT, file)}`);
  console.log("");
  console.log(`重新导出带图版本：npx beepress export-frs-prd ${args.key} --images docs/prd/${args.key}/images.json`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
