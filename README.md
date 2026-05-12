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
| Create flags | Reads Statsig gates via API → creates equivalent LD flags | Flag migration CLI *(coming soon)* |
| Migrate metrics | Reads Statsig metrics via API → creates LD metrics | [statsig-metric-importer-cli](https://github.com/launchdarkly-labs/statsig-metric-importer-cli) |

## Before You Start

Set your credentials in your shell **before** starting Claude Code. Claude inherits your shell environment, so the tools pick these up automatically — no copy-pasting keys into the agent.

```bash
read -rs STATSIG_CONSOLE_KEY && export STATSIG_CONSOLE_KEY
read -rs LD_API_KEY && export LD_API_KEY
```

Input is hidden as you type. The values are never written to disk, shell history, or process listings.

**Which credentials you need:**

| Path | Required |
|------|---------|
| SDK code | `LD_CLIENT_ID` (client-side) or `LD_SDK_KEY` (server-side) — inserted into your code |
| Create flags | `LD_API_KEY` + `STATSIG_CONSOLE_KEY` |
| Migrate metrics | `LD_API_KEY` + `STATSIG_CONSOLE_KEY` |

Where to find them:
- **LD_API_KEY**: LaunchDarkly → Account Settings → Authorization → Personal tokens
- **LD_CLIENT_ID / LD_SDK_KEY**: LaunchDarkly → Account Settings → Projects → [your project] → [your environment]
- **STATSIG_CONSOLE_KEY**: Statsig Console → Project Settings → Keys & Environments

## How the Agent Works

When you paste the starter prompt, Claude:

1. Asks which path(s) you need — SDK code, flags, metrics, or all three
2. **SDK code**: Delegates to the migration subagent in `.claude/agents/`. It scans your codebase, transforms Statsig SDK calls to LaunchDarkly equivalents, and outputs `migration-summary.json` with all flag keys found
3. **Create flags**: Runs the flag migration CLI against your Statsig project, creating equivalent boolean/JSON flags in LaunchDarkly. If you also ran SDK migration, it cross-references `migration-summary.json` to ensure keys match your code
4. **Migrate metrics**: Clones and builds `statsig-metric-importer-cli`, then runs it against your Statsig project

> **Note on flag key consistency**: If you run both SDK migration and flag creation, always run SDK migration first. It produces `migration-summary.json` with the exact flag keys used in your transformed code — the flag creation step uses these to ensure LD flags match what your code expects.

## Installation

The SDK migration subagent needs to be installed to your local Claude agents directory:

```bash
mkdir -p ~/.claude/agents/
curl -o ~/.claude/agents/statsig-to-launchdarkly-sdk-migrator.md \
  https://raw.githubusercontent.com/launchdarkly-labs/statsig-to-ld-agent/main/.claude/agents/statsig-to-launchdarkly-sdk-migrator.md
```

The metrics and flag migration CLIs are cloned and built automatically by the agent when needed.

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
