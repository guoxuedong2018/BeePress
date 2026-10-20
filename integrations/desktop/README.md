# Bee Press desktop shell

A thin Electron wrapper around an **upstream** DeepSeek Harness profile. It
does not fork the kernel: the shell starts `dsh --profile <name>`, waits for
the printed local URL, and loads it in a native window. Upstream plugin,
model and update support stays intact.

## Install

```bash
# 1. Install the Bee Press bundle into a dsh profile (default: web)
node integrations/desktop/install-profile.mjs web

# 2. Install the shell's Electron dependency
cd integrations/desktop && npm install

# 3. Run
npm start
```

Environment:

| Variable | Default | Purpose |
| :-- | :-- | :-- |
| `BEEPRESS_DSH_PROFILE` | `web` | dsh profile to boot |
| `BEEPRESS_DSH_BIN` | `dsh` | dsh executable |
| `BEEPRESS_KIT_ROOT` | repository root | where the bundle finds the `beepress` CLI |

For a branded distribution, publish a small profile package that depends on
`@beepress/dsh-bundle` and the upstream `web` bundles, then change the default
profile name. This keeps the desktop shell and the Bee Press domain bundle
separate from the upstream runtime, so upstream upgrades remain a version bump
rather than a merge.
