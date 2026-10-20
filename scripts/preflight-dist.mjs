#!/usr/bin/env node
/**
 * Pre-deploy artifact scan.
 *
 * Publishing a prototype is an outbound action. This script catches the
 * mistakes that are cheap to detect and expensive to discover after a link
 * has been shared:
 *
 *   - dev-only toolkit endpoints or source anchors left in the bundle
 *   - absolute home paths / localhost URLs
 *   - source maps
 *   - common credentials and private keys
 *   - review data paths
 *   - caller-supplied deny patterns (internal domains, project names, …)
 *
 * Usage:
 *   node scripts/preflight-dist.mjs --dir dist
 *   node scripts/preflight-dist.mjs --dir dist --deny "corp\\.example\\.com"
 *   node scripts/preflight-dist.mjs --dir dist --json
 */
import { readdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const args = { dir: null, json: false, denies: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const [flag, inline] = argv[i].split("=");
    const take = () => inline ?? argv[++i];
    if (flag === "--dir") args.dir = take();
    else if (flag === "--json") args.json = true;
    else if (flag === "--deny") args.denies.push(take());
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const dist = path.resolve(args.dir || path.join(process.env.BEEPRESS_WEB_DIR || process.env.BUILDER_KIT_WEB_DIR || ROOT, "dist"));
const EXT = new Set([".js", ".mjs", ".css", ".html", ".json", ".map", ".txt"]);

const RULES = [
  { id: "dev-endpoint-review", re: /\/__proto_review\b/, why: "review middleware endpoint" },
  { id: "dev-endpoint-studio", re: /\/__builder_studio\b/, why: "content studio endpoint" },
  { id: "dev-endpoint-editor", re: /\/__open-in-editor\b/, why: "open-in-editor endpoint" },
  { id: "source-anchor", re: /data-loc\s*=/, why: "dev source coordinates" },
  { id: "review-ui", re: /data-review-ui\b/, why: "review UI root" },
  { id: "review-data", re: /docs\/reviews\b/, why: "review data path" },
  { id: "home-path", re: new RegExp(escapeRe(os.homedir())), why: "absolute home path" },
  { id: "users-path", re: /(?:\/Users\/|[A-Za-z]:\\+Users\\+)/, why: "absolute user path" },
  { id: "localhost", re: /(?:localhost|127\.0\.0\.1)(?::\d+)?/, why: "local-only URL" },
  { id: "sourcemap", re: /sourceMappingURL=/, why: "source map reference" },
  { id: "private-key", re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, why: "private key" },
  { id: "aws-key", re: /\bAKIA[0-9A-Z]{16}\b/, why: "AWS access key" },
  { id: "github-token", re: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/, why: "GitHub token" },
  { id: "slack-token", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/, why: "Slack token" },
  { id: "generic-secret", re: /\b(?:api[_-]?key|secret|token|password)\b\s*[:=]\s*["'`][^"'`]{8,}["'`]/i, why: "possible credential" },
];

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

for (const [i, deny] of args.denies.entries()) {
  try {
    RULES.push({ id: `deny-${i + 1}`, re: new RegExp(deny), why: `--deny ${deny}` });
  } catch (error) {
    console.error(`Invalid --deny regex: ${deny} (${error.message})`);
    process.exit(2);
  }
}

async function walk(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(file, out);
    else if (EXT.has(path.extname(entry.name))) out.push(file);
  }
  return out;
}

let files;
try {
  files = await walk(dist);
} catch (error) {
  console.error(`Cannot read artifact directory ${dist}: ${error.message}`);
  process.exit(2);
}

const findings = [];
for (const file of files) {
  const text = await readFile(file, "utf8").catch(() => "");
  const lines = text.split("\n");
  for (const rule of RULES) {
    for (let i = 0; i < lines.length; i += 1) {
      if (!rule.re.test(lines[i])) continue;
      const snippet = lines[i].length > 160 ? `${lines[i].slice(0, 160)}…` : lines[i];
      findings.push({
        rule: rule.id,
        reason: rule.why,
        file: path.relative(dist, file),
        line: i + 1,
        snippet: rule.id.includes("key") || rule.id.includes("token") || rule.id === "generic-secret"
          ? "[redacted]"
          : snippet,
      });
      break;
    }
  }
}

if (args.json) {
  console.log(JSON.stringify({ dir: dist, files: files.length, findings }, null, 2));
} else if (findings.length === 0) {
  console.log(`✓ ${files.length} artifact files scanned; nothing suspicious found.`);
} else {
  console.error(`✗ ${findings.length} finding(s) in ${files.length} artifact files:`);
  for (const f of findings) console.error(`  [${f.rule}] ${f.file}:${f.line} — ${f.reason}\n    ${f.snippet}`);
  console.error("\nDo not publish this artifact until the findings are removed or explicitly accepted.");
}

process.exit(findings.length === 0 ? 0 : 1);
