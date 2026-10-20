# Bee Press desktop shell

A thin Electron wrapper around an **upstream** DeepSeek Harness profile. It
does not fork the kernel: the shell starts `dsh --profile <name>`, waits for
the printed local URL, and loads it in a native window. Upstream plugin,
model and update support stays intact.

The first screen is a Bee Press launcher, not a chat box:

1. **Import an existing project** — pick a directory with `package.json`,
   `docs/` or `beepress.config.*`.
2. **Create a new project** — choose a parent directory and name; the shell
   copies the FRS/knowledge-base scaffold and creates a blank knowledge-base
   outline.
3. **Recent projects** — open the last workspace without going through the
   picker again.

After selection the shell starts dsh in that workspace, adds it as a dsh
workspace and opens a session. The dsh sidebar brand is replaced with Bee
Press; the rest of the upstream chat, model and plugin UI remains available.

## Install and test locally

```bash
# 1. Install the Bee Press bundle into a dsh profile (default: web)
node integrations/desktop/install-profile.mjs web

# 2. Install the shell's Electron dependency
cd integrations/desktop
npm install

# 3. Run: starts its own dsh on an ephemeral port, then opens the window
npm start
```

A successful start first opens the launcher window. After choosing a project,
the log prints:

```text
[beepress-desktop] profile=web dsh=/Users/.../.npm-global/bin/dsh project=/path/to/project
[beepress-desktop] loading http://127.0.0.1:<port>/?token=...
```

The shell does not need a separate `dsh web` process; an existing `dsh` on
3080 can stay running. It starts the profile in a child process and closes it
when the app quits.

If npm blocks Electron's postinstall (npm 12 can do this), approve/rebuild it:

```bash
npm install-scripts approve electron
npm rebuild electron
```

If the binary is still missing on macOS, the cached zip can be extracted
manually:

```bash
cd integrations/desktop
unzip -oq ~/Library/Caches/electron/*/*.zip -d node_modules/electron/dist
printf 'Electron.app/Contents/MacOS/Electron' > node_modules/electron/path.txt
```

If the app shows a startup dialog, check `dsh` resolution:
`~/.npm-global/bin/dsh`, `/opt/homebrew/bin/dsh`, `/usr/local/bin/dsh`, or set
`BEEPRESS_DSH_BIN=/absolute/path/to/dsh`.

For windowless verification, skip Electron and use the Web UI:

```bash
BEEPRESS_KIT_ROOT="$PWD" dsh web --no-open --port 3080
curl "http://127.0.0.1:3080/beepress/api/state?root=$PWD&token=..."
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
