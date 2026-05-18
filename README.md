# Claude Code Skill: Statsig → LaunchDarkly SDK Migration

A Claude Code skill that automates migrating from the Statsig SDK to LaunchDarkly. Covers JavaScript, TypeScript, React, and Node.js SDKs. Handles feature gates, dynamic configs, contexts, and observability. Preserves experiments (which have no 1:1 LaunchDarkly mapping).

> **What's new in this release**
> - **Now a Claude Code skill.** Canonical source of truth is `skills/statsig-to-launchdarkly-migrator/SKILL.md` with progressive-disclosure references and helper scripts. The file at `.claude/agents/statsig-to-launchdarkly-sdk-migrator.md` is a thin compatibility shim for users who installed the older agent — it just points at the skill.
> - **Live SDK version resolution.** A `scripts/resolve-versions.mjs` helper runs `npm view` for every LaunchDarkly package before the skill writes any imports or `package.json` edits. This kills the stale-Node-SDK problem (agentic tools routinely import `launchdarkly-node-server-sdk@5.x` from training data — the current package is `@launchdarkly/node-server-sdk`).
> - **`ldcli` + `.env` key flow.** Helper scripts install `ldcli` (if missing), accept the LaunchDarkly Client-Side ID on stdin (never via Claude's transcript), and refuse to write `.env` if it isn't gitignored.
> - **Two eval harnesses.** Static assertions (10 rules over source code + a package.json version check) and an LLM-as-judge runner that scores migrations on a five-dimension rubric. The newest rule, `trackArgOrder`, catches the Statsig→LD argument-order swap in event logging (`logEvent(name, value, meta)` → `track(name, data, metricValue)`).

## Repository layout

```
.
├── skills/statsig-to-launchdarkly-migrator/
│   ├── SKILL.md                       # canonical skill (start here)
│   ├── references/                    # deep-dive docs loaded on demand
│   │   ├── sdk-key-setup.md
│   │   ├── version-floors.md
│   │   ├── experiments.md
│   │   ├── flag-evaluation.md
│   │   ├── context-migration.md
│   │   ├── observability.md
│   │   └── report-format.md
│   ├── scripts/                       # helper executables the skill calls
│   │   ├── resolve-versions.mjs       # npm view for every LD package
│   │   ├── install-ldcli.mjs          # detect / install ldcli
│   │   └── write-env.mjs              # write LD key to .env safely
│   └── evals/
│       ├── static/                    # CI-able regex/AST assertions
│       └── judge/                     # LLM-as-judge rubric + runner
├── .claude/agents/
│   └── statsig-to-launchdarkly-sdk-migrator.md   # legacy compat shim (points at the skill)
├── tests/                             # example Statsig apps to migrate
├── README.md
└── LICENSE
```

## What the skill does

1. **Inventory** every Statsig SDK call (`checkGate`, `getConfig`, `useGateValue`, `useExperiment`, …).
2. **Resolve current SDK versions** via live `npm view`. Refuses to write imports until this completes.
3. **Pull the LaunchDarkly Client-Side ID via `ldcli`** and write it to `.env` (never to Claude's transcript).
4. **Translate** imports, initialization, contexts, flag evaluations, and observability.
5. **Half-implement-then-test**: create flags off-by-default in the LD test env, deploy, verify via LD Live Events, flip flags, then repeat in prod.
6. **Generate `migration-summary.json`** with resolved SDK versions, migrated flags, blocked-by-experiment flags, and a verification checklist.

## Quick install (Claude Code)

The skill needs to live in your project (or under `~/.claude/skills/`) so Claude Code can load it and the helper scripts.

```bash
# Clone (recommended — gives you the helper scripts and evals)
git clone https://github.com/yeutterg/claude-statsig-to-launchdarkly-sdk-migrator.git
cd claude-statsig-to-launchdarkly-sdk-migrator

# Or install just the skill globally for any project:
mkdir -p ~/.claude/skills/
cp -R skills/statsig-to-launchdarkly-migrator ~/.claude/skills/
```

To use the skill against your own project, copy `skills/statsig-to-launchdarkly-migrator/` into your project root (or symlink it from `~/.claude/skills/`).

> Legacy compat: if you previously installed the agent file at `~/.claude/agents/statsig-to-launchdarkly-sdk-migrator.md`, it still works — it now just points at the canonical skill. New installs should use the skill path above.

## Usage

In Claude Code, say something like:

> "Migrate this codebase from Statsig to LaunchDarkly."

Claude will load the skill and run the seven phases in order. The skill is intentionally noisy at the boundaries (inventory tables, version table, verification checklist) so you can spot mistakes early.

## Key migration patterns (summary — full canonical patterns in [SKILL.md](skills/statsig-to-launchdarkly-migrator/SKILL.md))

### Imports

```javascript
// Statsig → LaunchDarkly
require('statsig-js')                       // → require('launchdarkly-js-client-sdk')
import statsig from 'statsig-js'            // → import { initialize } from 'launchdarkly-js-client-sdk'
import { StatsigProvider } from '@statsig/react-bindings'
                                            // → import { asyncWithLDProvider, useFlags } from 'launchdarkly-react-client-sdk'
import { StatsigClient } from 'statsig-node'
                                            // → import { init } from '@launchdarkly/node-server-sdk'
```

The Node SDK call-out matters: the current package is the scoped `@launchdarkly/node-server-sdk`. The unscoped `launchdarkly-node-server-sdk` is the most common stale-training-data artifact and the static evals fail on it.

### Initialization

```javascript
const client = initialize(
  process.env.LD_CLIENT_SIDE_ID,   // never a literal
  context,
);
await client.waitForInitialization(5);
```

### Flag evaluation

```javascript
client.variation('gate_name', false)                              // boolean — fallback false
client.jsonVariation('cfg', { title: 'Default', limit: 10 })      // JSON — full fallback object
const flags = useFlags(); flags.gateName                          // React — auto camelCase
```

### Context

```javascript
{ kind: 'user', key: 'user-123', email: '…', _meta: { privateAttributes: ['ssn'] } }
```

### SDK-specific flag naming

| SDK | Auto camelCase | Example |
| --- | --- | --- |
| React | Yes (default) | `admin_panel_access` → `flags.adminPanelAccess` |
| JavaScript / Node / Python / Go / Java / iOS / Android | No | `admin_panel_access` stays as-is |

## What's NOT migrated

- **Experiments** (`getExperiment`, `useExperiment`, `useLayer`) — preserved; Statsig SDK stays alongside LaunchDarkly
- Feature gates that are *part of* an experiment — blocked, reported in summary
- Complex targeting rules — recreated manually in the LD dashboard
- Statsig session replay parameters with no LD equivalent (`maxSessionDurationMs`, `recordConsoleErrors`) — logged as `lost_features`

## Running the evals

```bash
# Static evals (fast, deterministic, CI-able)
node skills/statsig-to-launchdarkly-migrator/evals/static/run.mjs              # bundled fixtures
node skills/statsig-to-launchdarkly-migrator/evals/static/run.mjs --input ./   # your migration output
node skills/statsig-to-launchdarkly-migrator/evals/static/self-test.mjs        # assertion library meta-test

# LLM-as-judge evals (slower, uses claude CLI; run before releasing skill changes)
node skills/statsig-to-launchdarkly-migrator/evals/judge/run.mjs
node skills/statsig-to-launchdarkly-migrator/evals/judge/run.mjs --input ./ --out judge-results.json
```

Eval rules and rubric are documented in `skills/statsig-to-launchdarkly-migrator/evals/README.md`.

## Requirements

- LaunchDarkly JavaScript SDK 3.7.0+ for observability plugins (the skill enforces this automatically via live version lookup)
- `node` 18+ to run helper scripts and evals
- `ldcli` for the SDK key flow — the skill detects and installs if missing
- Claude Code for skill invocation; for the judge eval, the `claude` CLI must be on PATH

## Support

- Issues: https://github.com/yeutterg/claude-statsig-to-launchdarkly-sdk-migrator/issues
- LaunchDarkly JS SDK docs: https://launchdarkly.com/docs/sdk/client-side/javascript
- LaunchDarkly React SDK docs: https://launchdarkly.com/docs/sdk/client-side/react/react-web
- LaunchDarkly Node SDK docs: https://launchdarkly.com/docs/sdk/server-side/node-js
- `ldcli`: https://github.com/launchdarkly/ldcli
- Statsig JS SDK docs: https://docs.statsig.com/client/javascript-sdk/

## License

[MIT License](LICENSE)
