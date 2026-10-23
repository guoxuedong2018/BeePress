# BuilderHarness desktop shell

A thin Electron wrapper around an **upstream** DeepSeek Harness profile. It
does not fork the kernel: the shell starts `dsh --profile <name>`, waits for
the printed local URL, and loads it in a native window. Upstream plugin,
model and update support stays intact.

The first screen is a BuilderHarness product entry, not a chat box:

1. **Drop or pick a project** — a folder or `package.json`; read-only import.
2. **Ask the Agent to find one** — the command opens a directory picker as an
   explicit grant, then scans for project manifests and classifies the stack.
3. **Create a new project** — FRS/knowledge-base scaffold plus a React +
   Tailwind Vite starter.
4. **Confirm the production baseline** — preset stack, UI spec, existing
   project conventions, or analyze a live URL for frameworks and style tokens.
5. **Use the tool hub** — requirements, prototype, review, content and publish
   are first-class cards. The DSH workspace is optional.

After project selection and baseline confirmation, the shell shows a **project workbench**: FRS count, prototype
dev script, open reviews, content pages and publish configuration. The
“enter project workspace” action then starts dsh in that workspace, adds it as
a dsh workspace and opens a session. The dsh sidebar brand is replaced with
BuilderHarness; the rest of the upstream chat, model and plugin UI remains
available.

## Install and test locally

```bash
# 1. Install the BuilderHarness bundle into a dsh profile (default: web)
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
[builderharness-desktop] profile=web dsh=/Users/.../.npm-global/bin/dsh project=/path/to/project
[builderharness-desktop] loading http://127.0.0.1:<port>/?token=...
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
`BUILDERHARNESS_DSH_BIN=/absolute/path/to/dsh`.

For windowless verification, skip Electron and use the Web UI:

```bash
BUILDERHARNESS_KIT_ROOT="$PWD" dsh web --no-open --port 3080
curl "http://127.0.0.1:3080/builderharness/api/state?root=$PWD&token=..."
```

Environment:

| Variable | Default | Purpose |
| :-- | :-- | :-- |
| `BUILDERHARNESS_DSH_PROFILE` | `web` | dsh profile to boot |
| `BUILDERHARNESS_DSH_BIN` | `dsh` | dsh executable |
| `BUILDERHARNESS_KIT_ROOT` | repository root | where the bundle finds the `builderharness` CLI |

For a branded distribution, publish a small profile package that depends on
`@builderharness/dsh-bundle` and the upstream `web` bundles, then change the default
profile name. This keeps the desktop shell and the BuilderHarness domain bundle
separate from the upstream runtime, so upstream upgrades remain a version bump
rather than a merge.


## macOS package

`electron-builder` configuration lives in `package.json`; `npm run dist:mac`
produces unsigned DMG/ZIP artifacts in `release/`. The build includes the
BuilderHarness CLI/scaffold under `Resources/builderharness`, so project creation and
`kb-*` actions work after packaging.

For a signed/notarized build, provide the usual Apple credentials on the
build machine:

```bash
export CSC_LINK=/path/to/developer-id.p12
export CSC_KEY_PASSWORD=...
export APPLE_ID=...
export APPLE_APP_SPECIFIC_PASSWORD=...
export APPLE_TEAM_ID=...
npm run dist:mac
```

Signing and notarization are intentionally not faked: without those
credentials the binary is a local/unsigned build.
