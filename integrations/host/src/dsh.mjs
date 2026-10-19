import { addReview, readContext, readOpenReviews, readStatus, resolveReview } from "./project.mjs";

export const name = "beepress";
export const inject = ["tools", "workingDirectory"];

const rootParameter = {
  type: "string",
  description: "Bee Press workspace root. Defaults to the session working directory.",
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

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

export function apply(ctx, config = {}) {
  const fallbackRoot = config.root || undefined;

  async function resolveToolRoot(args, exec) {
    if (args.root) return args.root;
    if (exec?.agent && ctx.workingDirectory) {
      try {
        return await ctx.workingDirectory.ensure(exec.agent, exec.signal);
      } catch {
        // Fall through to the configured root when the session directory is unavailable.
      }
    }
    return fallbackRoot;
  }

  ctx.tools.register(
    jsonTool({
      name: "beepress_status",
      description:
        "Inspect a Bee Press workspace: content pages, open review comments, feature specs, prototype dev script and publish configuration.",
      execute: async (args, exec) => readStatus(await resolveToolRoot(args, exec)),
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
      execute: async (args, exec) =>
        readContext(await resolveToolRoot(args, exec), { topic: args.topic, limit: args.limit }),
    }),
  );

  ctx.tools.register(
    jsonTool({
      name: "beepress_review_open",
      description: "List unresolved prototype review comments from docs/reviews, including anchors and reply counts.",
      execute: async (args, exec) => readOpenReviews(await resolveToolRoot(args, exec)),
    }),
  );

  ctx.tools.register(
    jsonTool({
      name: "beepress_review_add",
      description: "Add an open prototype review comment. Use this for source-grounded feedback that should survive in docs/reviews.",
      parameters: {
        frs: { type: "string", description: "Feature/region key; defaults to APP_SHELL." },
        route: { type: "string", description: "Prototype route the comment belongs to." },
        body: { type: "string", description: "The review comment." },
        author: { type: "string", description: "Comment author; defaults to Bee Press Agent." },
        anchor: { type: "string", description: "Optional source location, e.g. src/App.jsx:42:3." },
      },
      execute: async (args, exec) =>
        addReview(await resolveToolRoot(args, exec), {
          frs: args.frs,
          route: args.route,
          body: args.body,
          author: args.author,
          anchor: args.anchor,
        }),
    }),
  );

  ctx.tools.register(
    jsonTool({
      name: "beepress_review_resolve",
      description: "Resolve a prototype review comment by id, optionally appending a resolution note.",
      parameters: {
        id: { type: "string", description: "Review comment id." },
        note: { type: "string", description: "Optional resolution note." },
        author: { type: "string", description: "Resolver name; defaults to Bee Press Agent." },
      },
      execute: async (args, exec) =>
        resolveReview(await resolveToolRoot(args, exec), {
          id: args.id,
          note: args.note,
          author: args.author,
        }),
    }),
  );

  if (typeof ctx.inject === "function") {
    ctx.inject(["webServer"], (webCtx) => {
      webCtx.effect(
        () =>
          webCtx.webServer.register({
            kind: "exact",
            path: "/beepress/api/state",
            async handler(req, res) {
              res.setHeader("cache-control", "no-store");
              if (req.method !== "GET") {
                res.statusCode = 405;
                res.end("Method Not Allowed");
                return;
              }
              try {
                const url = new URL(req.url || "/", "http://127.0.0.1");
                const root = url.searchParams.get("root") || undefined;
                const [status, reviews] = await Promise.all([readStatus(root), readOpenReviews(root)]);
                res.statusCode = 200;
                res.setHeader("content-type", "application/json; charset=utf-8");
                res.end(JSON.stringify({ status, reviews }, null, 2));
              } catch (error) {
                res.statusCode = 500;
                res.setHeader("content-type", "application/json; charset=utf-8");
                res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
              }
            },
          }),
        "beepress: http state",
      );
      webCtx.effect(
        () =>
          webCtx.webServer.register({
            kind: "exact",
            path: "/beepress/api/review/resolve",
            async handler(req, res) {
              res.setHeader("cache-control", "no-store");
              if (req.method !== "POST") {
                res.statusCode = 405;
                res.end("Method Not Allowed");
                return;
              }
              try {
                const body = await readBody(req);
                const result = await resolveReview(body.root, {
                  id: body.id,
                  note: body.note,
                  author: body.author,
                });
                res.statusCode = 200;
                res.setHeader("content-type", "application/json; charset=utf-8");
                res.end(JSON.stringify({ ok: true, ...result }, null, 2));
              } catch (error) {
                res.statusCode = 400;
                res.setHeader("content-type", "application/json; charset=utf-8");
                res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
              }
            },
          }),
        "beepress: http review resolve",
      );
    });
  }
}
