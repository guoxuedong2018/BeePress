/**
 * Compatibility shim.
 *
 * The docs-cli protocol now lives in `pipeline/destinations/docs-cli.mjs`; new
 * code should load a destination through `pipeline/lib/publish-gateway.mjs`.
 * This file stays so existing integrations that imported the old module keep
 * working.
 */
export * from "../destinations/docs-cli.mjs";
