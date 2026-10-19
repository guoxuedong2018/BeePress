# Deploy skill review · new-environment detection and guidance

This note reviews the Harness skill `deploy-prototype` (the `SKILL.md` + `deploy.mjs`
pair) and asks two questions:

1. When the skill runs in a **new environment** (new machine, new project, new
   network, non-interactive agent session), does it detect that fact?
2. What guidance should the human see before a prototype is published?

The original skill is intentionally thin: the `SKILL.md` holds the judgement and
the script holds the deterministic steps. That split is good. The gaps are all in
the script's **preflight and target validation**, not in the deployment command
itself.

---

## 1. What triggers the skill

The skill description includes phrases such as 「发一版」「推送到远程」「部署原型」
「发布到私有环境」「给别人看」「拿个链接」「deploy」. In a new environment the skill will
still be *selected* by the harness for those phrases; selection is semantic and
does not depend on the local machine.

The first real gate is `deploy.mjs`:

| Step | Check | New-environment outcome |
|---|---|---|
| 1 | `deploy-auth` exists | Stops with install instructions if absent |
| 2 | `deploy-auth whoami` contains `Email` | Stops with an SSO login instruction |
| 3 | `web/.static-site-deploy.json` exists | Stops and asks for full deploy parameters |
| 4 | `npm run build` succeeds | Stops with the build tail; some failures are host-specific |
| 5 | artifact scan | Catches a known list of dev leaks |
| 6 | `npx -y --registry https://registry.example.com @scope/hosting-cli@latest deploy` | Fails outside the internal network / registry |
| 7 | `verify(domain)` fetches the deployed index | Returns a warning rather than a hard failure |

So the script **does** stop in most new environments, but it stops by *failing at
a dependency* rather than by recognising “this is a new environment”. The
distinction matters for the user experience:

- A failure at step 1 or 2 is actionable, because the script prints the next step.
- A failure at step 3 is ambiguous: “new machine” and “new project” look the same.
- A failure at step 6 (registry/network) is a raw CLI error unless the caller
  recognises it.
- A copied binding file (step 3 passes) is the dangerous case: the script will
  happily deploy to the **wrong project**.

## 2. Failure / detection matrix

| Environment | Login | Binding | Registry | Result | Detection quality |
|---|---|---|---|---|---|
| Fresh machine, same project | missing | missing | reachable | Stops at login | Good (explicit message) |
| Fresh machine, same project | ok | missing | reachable | Stops at binding | Partial (does not say “same project, rebuild binding”) |
| Fresh machine, new project | ok | missing | reachable | Stops at binding | Partial (docs say “do not register”, but the script does not distinguish intent) |
| Copied binding from another project | ok | present, wrong project | reachable | **Deploys to the wrong project** | None |
| Public / off-VPN | ok | present | unreachable | Raw npx/registry error | Weak |
| Agent session without a terminal | missing or no session | any | any | Stops at login | Good |
| Dirty worktree | ok | present | reachable | Deploys uncommitted code | None |
| Stale build | ok | present | reachable | `npm run build` rebuilds | Good |
| Real data accidentally bundled | ok | present | reachable | Only known patterns are scanned | Partial |

## 3. Gaps worth fixing

### 3.1 No explicit environment state

Add a `doctor` / `preflight` subcommand that prints a single state and the next
action:

```text
state: new-environment
  ✓ node 18+
  ✓ npm
  ✗ deploy CLI (install: …)
  ✗ SSO session (run: deploy-auth login)
  ✗ project binding (this project has never been deployed here)
  → next: install CLI, log in, then run `deploy.mjs --project-id <id> --project-name "<name>" --dir ./dist`
```

States should be: `new-environment`, `bound`, `binding-mismatch`, `offline`,
`build-failed`, `artifact-unsafe`, `ready`. A machine-readable `--json` output
makes this usable from an agent.

### 3.2 Binding is not validated against the current project

`.static-site-deploy.json` should include and verify:

- repository identity (remote URL or a stable project key);
- the expected project id;
- the last deployed commit and build hash;
- the target environment (for example `preview` / `staging` / `production`).

Before deploying, compare the current repo/project with the binding. Refuse on a
mismatch unless `--allow-binding-mismatch` is explicit.

### 3.3 No confirmation gate inside the script

The `SKILL.md` correctly says a human must confirm. The script itself does not
prompt, so an agent that decides to call it can publish without a second gate.
Require one of:

```bash
deploy.mjs --yes              # explicit human confirmation
deploy.mjs --dry-run          # build + scan only
```

and refuse a real deploy when stdin is not a TTY and `--yes` is absent.

### 3.4 Artifact scan is a known-list scan, not a secret scan

The current scan looks for `data-loc`, the two dev endpoints, the home
directory, a blob bucket and one snapshot file. It does not look for:

- API keys, bearer tokens, private keys;
- internal domains or project names;
- e-mail addresses / phone numbers / personal names;
- source maps;
- `.env*` values;
- `localhost` URLs;
- review JSON accidentally copied into `dist`.

Use [`scripts/preflight-dist.mjs`](../scripts/preflight-dist.mjs):

```bash
node scripts/preflight-dist.mjs --dir web/dist
node scripts/preflight-dist.mjs --dir web/dist --deny "corp\\.example\\.com"
```

It exits non-zero on findings and prints file/line/reason. It is intentionally
generic and can sit in front of any hosting platform.

### 3.5 `@latest` is a supply-chain and reproducibility risk

`npx -y --registry https://registry.example.com @scope/hosting-cli@latest` resolves at run
time. Pin a version (or an integrity hash) in the binding, and fail with a clear
message if the pinned version is unavailable.

### 3.6 Verification only checks the index

`verify()` fetches `/` and compares the entry script. For a hash-routed SPA,
deep links are never checked. Use the router's route list (or a small route
manifest in the project) and verify:

- the index returns 200;
- the entry hash matches this build;
- each route resolves in the no-fallback static server;
- access control returns the expected redirect for an anonymous visitor.

### 3.7 No data-classification gate

The skill says “confirm the classification and sharing scope”, which is right.
Make it executable with a checklist in the command output:

```text
Before sharing the link, confirm:
  [ ] all data is synthetic or approved for the target audience
  [ ] the access-control group is correct
  [ ] a second person can open the pinned URL
  [ ] the pinned URL (not the “latest” URL) is the one sent for review
```

## 4. Recommended user guidance

### First deployment in a new environment

1. Install the platform CLI and log in **in the user's own terminal** (SSO cannot
   be delegated to an agent).
2. Decide whether this is a **new project** or the **same project on a new
   machine**. Do not copy `.static-site-deploy.json` between the two.
3. First deploy must pass explicit `--project-id` and `--project-name`; a missing
   binding is not permission to register a new project.
4. After the first deploy, set the access-control group. The project owner being
   able to open the URL proves nothing; ask a second person to test it.
5. Use the **pinned** URL for review collection and the **latest** URL only for
   long-lived documentation links.

### Every deployment

1. Run the artifact preflight before deploy:
   ```bash
   npm run build
   node scripts/preflight-dist.mjs --dir dist
   ```
2. Prefer `--dry-run` first; inspect the scan and the build tail.
3. Do not deploy from a dirty worktree unless that is intentional; record the
   commit hash in the deployment notes.
4. Keep the router in hash mode and do **not** set a Vite `base` for the
   no-fallback static host.
5. Never expose the dev server. Use a production build (`vite preview` or a
   no-fallback static server) for external viewers; the dev server exposes
   comment persistence and source coordinates.

### If a new environment is detected

Stop and ask the user one of three questions:

- “Same project on a new machine?” → rebuild the binding with full parameters.
- “New project?” → register it deliberately, then set access control.
- “Just want a temporary share?” → use a production preview, not the deploy
  platform.

## 5. Suggested `SKILL.md` additions

```markdown
## Environment gate (run first)

Run `node .../deploy.mjs --doctor` before any deployment.

- `state: new-environment` → stop and show the onboarding checklist.
- `state: binding-mismatch` → stop; never deploy to a binding that belongs to
  another repository or project.
- `state: offline` → stop; explain that the internal registry is unreachable.
- `state: artifact-unsafe` → print the preflight findings and stop.

## Confirmation

A real deploy requires `--yes`. `--dry-run` is the default for agents that are
not certain the human has confirmed.
```

## 6. Isolated end-to-end test

The review above is reproducible without touching the hosting platform. The
script [`scripts/test-deploy-skill-e2e.mjs`](../scripts/test-deploy-skill-e2e.mjs)
copies the real `deploy.mjs` and the paths module into a throwaway project, then
replaces every external dependency:

| Real dependency | Test double |
|---|---|
| `deploy-auth` | temp executable: prints an `Email:` line only when `E2E_LOGIN=ok` |
| internal npm registry / hosting CLI | temp `npx` that logs its args and returns fake URLs |
| deployed site (`fetch`) | preloaded fetch patch that returns a matching or stale index |
| `web/` app | tiny build script that emits clean output or deliberate leaks |
| user home | temp directory, so the home-path scan has a stable value |

Run it from this repository:

```bash
npm run test:deploy-skill
# or point at another copy of the skill:
DEPLOY_SKILL=/path/to/deploy.mjs npm run test:deploy-skill
```

Verified results (all scenarios passed against the Harness skill as written):

| # | Scenario | Observed result | Detection quality |
|---|---|---|---|
| A | new machine, no binding, no CLI | stops at **missing binding** before mentioning the CLI | Weak: the first message hides the real install step |
| B | binding present, CLI absent | stops with the `deploy-auth` install command | Good |
| C | binding present, CLI not logged in | stops with the `login` instruction | Good |
| D | logged in, no binding | stops with the “first deploy / new machine” message | Partial: cannot distinguish new machine from new project |
| E | `--dry-run`, no binding, no login | builds and scans cleanly, exits 0 | Good |
| F | clean deploy | prints latest URL, pinned URL and next action | Good |
| G | deploy CLI arguments | only `deploy --dir ./dist`; no project id / repo identity | Confirms the mismatch risk |
| H | leaky artifact (`data-loc`, `/__proto_review`) | stops before the CLI runs | Good for known patterns |
| I | registry unreachable | stops with the raw CLI error | Weak: no `offline` state |
| J | stale online index | exits 0 with “线上首页还不是这次的构建” | Partial: warning only, no hard failure |
| K | copied binding from another project | **deploys successfully, no mismatch error** | None |
| L | copied binding, CLI arguments | no project id or binding comparison reaches the CLI | None |

The two most important findings are reproduced, not just reasoned about:

1. **The first gate is the binding file, not the environment.** A fresh machine
   with no CLI and no binding sees “本机没有部署绑定” and may start creating a
   binding before it discovers that the CLI is missing.
2. **A copied binding is accepted.** The script only reads `domain` from the
   binding after the deploy, for verification. It never checks the current
   repository or passes a project id to the CLI, so a binding copied from another
   project can publish this project's build into that project.

The test is intentionally outside `npm run check`: it needs an external skill
path and is a review aid, not a package test. It exits 2 with instructions when
the skill cannot be found.

## 7. Bottom line

The skill is **safe by accident, not safe by design** in a new environment:

- missing CLI / missing login → it stops, with good guidance;
- missing binding → it stops, but cannot tell “new machine” from “new project”;
- copied binding → it can deploy to the wrong project;
- off-network → it fails with a raw registry error;
- real data / secrets → the scan is incomplete.

Adding an explicit environment state, binding validation, a confirmation gate,
a pinned CLI version and a real preflight scan turns those accidental stops into
predictable, explainable behaviour.
