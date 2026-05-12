# Statsig → LaunchDarkly Migration Agent

A Claude Code agent that helps developers migrate from Statsig to LaunchDarkly. Covers SDK code, feature flags, and metrics.

## Quick Start

Paste this into Claude Code (or any Claude interface):

```
Read the README at https://github.com/launchdarkly-labs/statsig-to-ld-agent and help me migrate from Statsig to LaunchDarkly.
```

## What Can Be Migrated

| Path | What it does | Tool |
|------|-------------|------|
| SDK code | Rewrites Statsig SDK calls → LaunchDarkly SDK | Subagent in this repo |
| Create flags | Reads Statsig gates via API → creates equivalent LD flags | [statsig-metric-importer-cli](https://github.com/launchdarkly-labs/statsig-metric-importer-cli) |
| Migrate metrics | Reads Statsig metrics via API → creates LD metrics | [statsig-metric-importer-cli](https://github.com/launchdarkly-labs/statsig-metric-importer-cli) |

## Agent Instructions

When invoked via the starter prompt, follow these steps precisely.

### Step 1 — Ask the user what they want to migrate

Ask the user which of the following they want to do. They may select one or more:

- **A. Migrate SDK code** — rewrite Statsig SDK calls in their codebase to LaunchDarkly SDK calls
- **B. Create feature flags in LaunchDarkly** — read their Statsig gates and dynamic configs, create equivalent flags in LD
- **C. Migrate metrics** — read their Statsig metrics, create equivalent metrics in LD

If the user selects multiple paths, execute them in order **A → B → C**. The SDK migration must run before flag creation when both are selected, because the SDK migration produces `migration-summary.json` containing the canonical flag keys that flag creation should match.

### Step 2 — If Path A (SDK code) is selected

Delegate to the SDK migration subagent at `.claude/agents/statsig-to-launchdarkly-sdk-migrator.md`. The subagent will:

- Scan the user's codebase for Statsig SDK calls
- Detect whether they use client-side or server-side SDKs
- Transform imports, initialization, flag evaluations, user contexts, and observability features
- Output `migration-summary.json` with all flag keys found

Ask the user for either their LaunchDarkly **Client-Side ID** (for client-side apps) or **server-side SDK key** (for server-side apps). This value is inserted into their code; it is not used by the agent at runtime.

### Step 3 — If Path B or Path C is selected

Both paths use the same CLI: **[statsig-metric-importer-cli](https://github.com/launchdarkly-labs/statsig-metric-importer-cli)**.

**3a. Ask the user to export their credentials in their shell.** Do NOT ask the user to paste keys into the chat — that would expose them in your context window. Instruct the user to run these commands in their terminal (in the same shell session they'll use to run the CLI):

```bash
read -rs STATSIG_CONSOLE_KEY && export STATSIG_CONSOLE_KEY
read -rs LD_API_KEY && export LD_API_KEY
```

Wait for the user to confirm they've completed this before proceeding.

**3b. Clone and build the CLI** if the user doesn't already have it:

```bash
git clone https://github.com/launchdarkly-labs/statsig-metric-importer-cli
cd statsig-metric-importer-cli
go build ./...
```

If Go is not installed, instruct the user to install it from https://go.dev/dl/ and re-run.

**3c. Run the appropriate command** for the user's selected path(s). See the CLI's README for full flag reference. Confirm the LD project key with the user before running.

### Step 4 — Summarize results

After all selected paths complete, present a clear summary to the user:

- **Path A**: files changed, flag keys discovered, items blocked by experiments
- **Path B**: flags created, flags skipped (already existed), incompatible flags
- **Path C**: metrics converted, metrics skipped, warnings about lost Statsig features
- **Next steps**: manual experiment migration, parallel SDK testing checklist, anything requiring the LD UI

## Credentials Reference

| Path | Required |
|------|---------|
| SDK code (A) | `LD_CLIENT_ID` (client-side) or `LD_SDK_KEY` (server-side) — inserted into code, not exported |
| Create flags (B) | `LD_API_KEY` + `STATSIG_CONSOLE_KEY` — exported in shell before running CLI |
| Migrate metrics (C) | `LD_API_KEY` + `STATSIG_CONSOLE_KEY` — exported in shell before running CLI |

Where to find each key:
- **LD_API_KEY**: LaunchDarkly → Account Settings → Authorization → Personal tokens
- **LD_CLIENT_ID / LD_SDK_KEY**: LaunchDarkly → Account Settings → Projects → [your project] → [your environment]
- **STATSIG_CONSOLE_KEY**: Statsig Console → Project Settings → Keys & Environments

Paths B and C share the same credentials — export once and both will work.

## Installation

The SDK migration subagent needs to be installed to your local Claude agents directory:

```bash
mkdir -p ~/.claude/agents/
curl -o ~/.claude/agents/statsig-to-launchdarkly-sdk-migrator.md \
  https://raw.githubusercontent.com/launchdarkly-labs/statsig-to-ld-agent/master/.claude/agents/statsig-to-launchdarkly-sdk-migrator.md
```

The `statsig-metric-importer-cli` is cloned and built on demand by the agent — no pre-install required.

## Repository Structure

```
.
├── .claude/
│   └── agents/
│       └── statsig-to-launchdarkly-sdk-migrator.md  # SDK migration subagent
├── tests/
│   ├── vanilla-js-app.js                             # Test fixture: plain JS
│   ├── react-app.jsx                                 # Test fixture: React
│   └── typescript-app.ts                             # Test fixture: TypeScript
└── README.md
```

## License

This project is licensed under the [MIT License](LICENSE). Copyright (c) 2025 Greg Yeutter.
