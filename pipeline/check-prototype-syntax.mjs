#!/usr/bin/env node
// 只读检查 Vue 2.7 项目 src/ 下的 JS 与 Vue 脚本语法，不执行产品代码。
// 不替代模板编译、模块依赖解析、浏览器主路径与视觉验证。
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

import { WEB_DIR } from './lib/paths.mjs';

const webRoot = path.resolve(process.argv[2] || WEB_DIR);
const src = path.join(webRoot, 'src');
let failures = 0;
let checked = 0;
let compiler;

function fail(file, message) {
  failures += 1;
  console.error(`✗ ${path.relative(webRoot, file)}\n${message}`);
}

function checkJs(file, source, label = '', lang = 'js') {
  if (!['js', 'javascript'].includes(lang)) {
    fail(file, `${label} 的 ${lang} 需要对应解析器，本检查未验证，不能当成通过。`);
    return;
  }
  checked += 1;
  const result = spawnSync(process.execPath, ['--check', '--input-type=module'], {
    input: source, encoding: 'utf8', maxBuffer: 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    fail(file, `${label}\n${result.error?.message || result.stderr}`.trim());
  }
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const file = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) { await walk(file); continue; }
    if (!entry.isFile()) continue;
    if (/\.(?:js|mjs)$/.test(file)) {
      checkJs(file, await readFile(file, 'utf8'));
    } else if (file.endsWith('.vue')) {
      try {
        compiler ||= createRequire(path.join(webRoot, 'package.json'))('vue/compiler-sfc');
        const source = await readFile(file, 'utf8');
        const descriptor = compiler.parse({ source, filename: file });
        for (const error of descriptor.errors || []) fail(file, String(error));
        for (const [kind, block] of [['script', descriptor.script], ['script setup', descriptor.scriptSetup]]) {
          if (!block) continue;
          if (block.src || block.attrs?.src) {
            fail(file, `${kind} 使用外部 src；需单独验证外部脚本。`);
            continue;
          }
          const line = source.slice(0, block.start).split('\n').length;
          checkJs(file, block.content, `<${kind}> 起始于源码第 ${line} 行；以下行号相对该脚本`, block.lang || block.attrs?.lang || 'js');
        }
      } catch (error) {
        fail(file, `无法解析 Vue 2.7 SFC：${error.message}`);
      }
    }
  }
}

try {
  if (!(await stat(src)).isDirectory()) throw new Error(`${src} 不是目录`);
  await walk(src);
  if (checked === 0 && failures === 0) throw new Error('没有检查到任何脚本，不能判为通过');
  console.log(`脚本语法检查：${checked} 个脚本，${failures} 处失败。`);
  console.log('此结果不证明模板、导入、业务闭环或视觉质量通过。');
  process.exitCode = failures ? 1 : 0;
} catch (error) {
  console.error(error.message);
  process.exitCode = 2;
}
