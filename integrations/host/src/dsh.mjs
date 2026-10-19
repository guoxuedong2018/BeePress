import { readContext, readOpenReviews, readStatus } from "./project.mjs";

export const name = "beepress";
export const inject = ["tools"];

const rootParameter = {
  type: "string",
  description: "Bee Press workspace root. Defaults to the dsh working directory.",
};

function jsonTool({ name, description, parameters = {}, execute }) {
  return {
    name,
    description,
    parameters: {
      type: "object",
      properties: { root: rootParameter, ...parameters },
      additionalProperties: false,
    },
    output: {
      schema: { type: "string" },
      render: (_args, value) => [{ type: "text", text: value }],
    },
    async execute(args, exec) {
      return JSON.stringify(await execute(args, exec), null, 2);
    },
  };
}

export function apply(ctx, config = {}) {
  const fallbackRoot = config.root || undefined;

  ctx.tools.register(
    jsonTool({
      name: "beepress_status",
      description:
        "Inspect a Bee Press workspace: content pages, open review comments, feature specs, prototype dev script and publish configuration.",
      execute: (args) => readStatus(args.root || fallbackRoot),
    }),
  );

  ctx.tools.register(
    jsonTool({
      name: "beepress_context",
      description:
        "Read Bee Press content context from docs/kb. Use topic to narrow pages and limit to bound the result.",
      parameters: {
        topic: { type: "string", description: "Optional topic or path fragment." },
        limit: { type: "integer", minimum: 1, maximum: 20, description: "Maximum pages to return." },
      },
      execute: (args) => readContext(args.root || fallbackRoot, { topic: args.topic, limit: args.limit }),
    }),
  );

  ctx.tools.register(
    jsonTool({
      name: "beepress_review_open",
      description: "List unresolved prototype review comments from docs/reviews, including anchors and reply counts.",
      execute: (args) => readOpenReviews(args.root || fallbackRoot),
    }),
  );
}
