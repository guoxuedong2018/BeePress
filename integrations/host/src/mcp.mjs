#!/usr/bin/env node
import { createInterface } from "node:readline";

import { readContext, readOpenReviews, readStatus } from "./project.mjs";

const SERVER_INFO = { name: "bee-press-mcp", version: "0.0.0-spike" };
const PROTOCOL_VERSION = "2024-11-05";

const ROOT_SCHEMA = {
  type: "string",
  description: "Bee Press workspace root. Defaults to BEEPRESS_ROOT or the server working directory.",
};

const TOOLS = [
  {
    name: "beepress_status",
    description:
      "Inspect a Bee Press workspace: content pages, open review comments, feature specs, prototype dev script and publish configuration.",
    inputSchema: {
      type: "object",
      properties: { root: ROOT_SCHEMA },
      additionalProperties: false,
    },
  },
  {
    name: "beepress_context",
    description:
      "Read Bee Press content context from docs/kb. Use topic to narrow pages and limit to bound the result.",
    inputSchema: {
      type: "object",
      properties: {
        root: ROOT_SCHEMA,
        topic: { type: "string", description: "Optional topic or path fragment." },
        limit: { type: "integer", minimum: 1, maximum: 20, description: "Maximum pages to return." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "beepress_review_open",
    description: "List unresolved prototype review comments from docs/reviews, including anchors and reply counts.",
    inputSchema: {
      type: "object",
      properties: { root: ROOT_SCHEMA },
      additionalProperties: false,
    },
  },
];

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function response(id, result) {
  send({ jsonrpc: "2.0", id, result });
}

function error(id, code, message) {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

async function callTool(name, args = {}) {
  const root = args.root || process.env.BEEPRESS_ROOT || process.env.BUILDER_KIT_ROOT || process.cwd();
  if (name === "beepress_status") return readStatus(root);
  if (name === "beepress_context") return readContext(root, { topic: args.topic, limit: args.limit });
  if (name === "beepress_review_open") return readOpenReviews(root);
  throw new Error(`Unknown tool: ${name}`);
}

async function handle(message) {
  if (!message || message.jsonrpc !== "2.0") return;
  const hasId = Object.prototype.hasOwnProperty.call(message, "id");
  const { id, method, params = {} } = message;

  if (method === "initialize") {
    return response(id, {
      protocolVersion: params.protocolVersion || PROTOCOL_VERSION,
      capabilities: { tools: { listChanged: false } },
      serverInfo: SERVER_INFO,
    });
  }

  if (method === "ping") return response(id, {});
  if (method === "tools/list") return response(id, { tools: TOOLS });

  if (method === "tools/call") {
    try {
      const value = await callTool(params.name, params.arguments || {});
      return response(id, { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] });
    } catch (err) {
      return response(id, {
        content: [{ type: "text", text: err instanceof Error ? err.message : String(err) }],
        isError: true,
      });
    }
  }

  if (method?.startsWith("notifications/")) return;
  if (hasId) error(id, -32601, `Method not found: ${method}`);
}

const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
input.on("line", (line) => {
  if (!line.trim()) return;
  let message;
  try {
    message = JSON.parse(line);
  } catch (err) {
    error(null, -32700, `Parse error: ${err instanceof Error ? err.message : String(err)}`);
    return;
  }
  handle(message).catch((err) => {
    if (Object.prototype.hasOwnProperty.call(message, "id")) {
      error(message.id, -32603, err instanceof Error ? err.message : String(err));
    }
  });
});
