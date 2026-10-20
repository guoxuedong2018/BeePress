/**
 * Publish destination loader
 * ------------------------------------------------------------------
 * The publishing workflow (planning, state, retries, review UI) belongs to
 * beepress. The destination belongs to the host: a docs service, an internal
 * wiki, a CMS, or anything else with an adapter.
 *
 * Pick an adapter with:
 *
 *   BEEPRESS_PUBLISH_GATEWAY=./tools/my-publish-gateway.mjs
 *   BEEPRESS_PUBLISH_GATEWAY=@acme/beepress-publish
 *
 * The value may be a package name, a `file:` URL, or a path relative to the
 * host project root. Publishing is opt-in: without a destination the core
 * still supports review, content status, screenshots and clips, but cannot
 * publish. `BEEPRESS_DOCS_CLI` is kept as a compatibility switch for the
 * bundled `docs-cli` reference adapter. See `docs/publishing.md`.
 */
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { REPO_ROOT } from "./paths.mjs";

const DEFAULT_GATEWAY = "docs-cli";

/** Operations the knowledge-base publishing flow needs from every destination. */
export const CORE_METHODS = ["createDoc", "writeDoc", "fetchOutline", "updateJsonml", "buildPageUrl"];

/** Extra operations used by the optional PRD pipeline. */
export const PRD_METHODS = [...CORE_METHODS, "createBlankDoc", "appendImages", "fetchJsonml"];

let cached = null;
let cachedSpec = null;

function gatewaySpec() {
  const value = (
    process.env.BEEPRESS_PUBLISH_GATEWAY ||
    process.env.BEEPRESS_PUBLISH_GATEWAY ||
    process.env.BEEPRESS_PUBLISH_DESTINATION ||
    process.env.BUILDER_KIT_PUBLISH_DESTINATION ||
    ""
  ).trim();
  if (value) return value;
  // Backwards compatibility: the old docs-cli switch is an explicit opt-in.
  return process.env.BEEPRESS_DOCS_CLI || process.env.BEEPRESS_DOCS_CLI ? DEFAULT_GATEWAY : "";
}

async function importGateway(spec) {
  if (spec === DEFAULT_GATEWAY) return import("../destinations/docs-cli.mjs");
  if (spec.startsWith("file:")) return import(spec);
  if (spec.startsWith(".") || path.isAbsolute(spec)) {
    return import(pathToFileURL(path.resolve(REPO_ROOT, spec)).href);
  }
  // Resolve bare package names from the host project, not from beepress.
  try {
    const hostRequire = createRequire(path.join(REPO_ROOT, "package.json"));
    return import(pathToFileURL(hostRequire.resolve(spec)).href);
  } catch {
    return import(spec);
  }
}

function validate(gateway, spec, methods) {
  const missing = methods.filter((name) => typeof gateway?.[name] !== "function");
  if (missing.length) {
    throw new Error(
      `发布目标 ${spec} 缺少 ${missing.join("、")}；接口见 docs/publishing.md`,
    );
  }
  return gateway;
}

/**
 * Load and validate the configured destination adapter.
 * @param {{ methods?: string[] }} [options]
 */
export async function loadPublishGateway({ methods = CORE_METHODS } = {}) {
  const spec = gatewaySpec();
  if (!spec) {
    throw new Error(
      "未配置发布目标：设置 BEEPRESS_PUBLISH_GATEWAY（兼容 BUILDER_KIT_PUBLISH_GATEWAY）指向宿主的发布适配器；" +
        "使用内置参考适配器时设为 docs-cli，改完重启 dev server。接口见 docs/publishing.zh-CN.md",
    );
  }
  if (!cached || cachedSpec !== spec) {
    let mod;
    try {
      mod = await importGateway(spec);
    } catch (error) {
      throw new Error(`加载发布目标 ${spec} 失败：${error.message}`);
    }
    cached = mod.default ?? mod.publishGateway ?? mod;
    cachedSpec = spec;
  }
  return validate(cached, spec, methods);
}

/** Clear the loader cache (tests and long-lived hosts that change configuration). */
export function resetPublishGateway() {
  cached = null;
  cachedSpec = null;
}

/** Destination metadata with safe defaults for adapters that don't provide it. */
export function publishDestinationInfo(gateway) {
  const destination = gateway?.destination ?? {};
  return {
    id: destination.id ?? gateway?.name ?? "custom",
    label: destination.label ?? "发布目标",
    description: destination.description ?? "",
    capabilities: Array.isArray(destination.capabilities) ? destination.capabilities : [],
  };
}
