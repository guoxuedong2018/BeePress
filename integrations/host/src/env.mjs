/** Read a `BUILDERHARNESS_*` environment variable. */
export function readEnv(name) {
  return process.env[`BUILDERHARNESS_${name}`] || "";
}
