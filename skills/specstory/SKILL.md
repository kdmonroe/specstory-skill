---
name: specstory
description: >-
  Search, browse, digest, and recap your AI coding sessions across every tool
  (Claude Code, Cursor, Codex, Gemini CLI, …). Works local-first on
  .specstory/history with no API key, and optionally against SpecStory Cloud.
  Use when the user asks "what was I working on", wants a daily/weekly work
  digest or standup, searches past sessions, or needs a recap of a project's
  recent AI coding activity (repo, stack, files touched, intent, outcome).
license: Apache-2.0
compatibility: >-
  Requires Node.js >=18. Local mode needs a project with a .specstory/history
  directory (written by the SpecStory CLI). Cloud mode (--cloud) needs
  SPECSTORY_API_KEY or an active `specstory login` session.
metadata:
  homepage: "https://specstory.com"
  version: "3.1.0"
  source: "https://github.com/kdmonroe/specstory-skill"
  # Advisory hints for agent runtimes that read namespaced metadata (OpenClaw/Hermes):
  openclaw: '{"primaryEnv":"SPECSTORY_API_KEY","requires":{"bins":["node"]}}'
  hermes: '{"tags":["sessions","coaching","activity","cron"],"category":"productivity","pinned":true}'
allowed-tools: Bash(node:*) Read
---

# SpecStory

Query your AI coding session history — **local-first** (parses `.specstory/history`
markdown directly, zero config, no API key) with an optional **`--cloud`** layer
that hits the SpecStory Cloud GraphQL API for cross-machine reach.

All scripts share a backend selector:

- **default (auto):** use local `.specstory/history` if present, else cloud.
- `--local` — force local.
- `--cloud` — force SpecStory Cloud (needs auth; see Setup).
- `--root <dir>` — local: scan **all** projects under a directory (each repo that
  owns a `.specstory/` is one project). Without `--root`, walks up from the
  current directory to the nearest `.specstory/history`.

## Quick commands

```bash
# "What was I last working on?" — most-recent session per project, with recap
node scripts/recap.mjs --root ~/code

# Work digest (grouped by repo, with structured recaps); --json for automation
node scripts/digest.mjs --week --root ~/code
node scripts/digest.mjs --hours 24 --json

# Browse / filter sessions
node scripts/sessions.mjs --project my-app --limit 20
node scripts/sessions.mjs --tool "Claude Code" --since 2026-05-01

# Full-text search (local: match-count ranked; cloud: relevance ranked)
node scripts/search.mjs "authentication middleware"
node scripts/search.mjs "find dangles" --root ~/code

# One session in detail (raw content, or --recap for the structured view)
node scripts/session-detail.mjs <session-id-or-filename> --recap

# List projects with counts + last activity
node scripts/projects.mjs --root ~/code
```

## Setup (cloud only — local needs nothing)

```bash
export SPECSTORY_API_KEY="your-key"   # https://cloud.specstory.com/settings/api-keys
```

If you use the SpecStory CLI, a short-lived JWT (~30 min, refreshed by
`specstory login`) is read automatically from `~/.specstory/cli/auth.json` when
no `SPECSTORY_API_KEY` is set — so `--cloud` often works without a permanent key.

## What "recap" extracts

Each session's markdown is parsed (no AI call) into: **repo** (owner/name, branch,
working dir, recent commits), **stack** (languages + framework signals), **activity**
(tool-use counts, files touched, notable bash commands), **intent** (first user
prompt), and **outcome** (last user + agent messages). See `scripts/lib/recap.mjs`.

## Notes

- Sessions left open and idle in a terminal agent inflate their `endedAt`; spans
  over 12h are flagged `⚠️ idle?` in `recap`/`digest` so they aren't read as work time.
- For the cloud GraphQL schema and filter reference, see
  [references/cloud-api.md](references/cloud-api.md). Re-introspect with
  `node scripts/introspect.mjs` when the API changes.
- Full architecture: [references/ARCHITECTURE.md](references/ARCHITECTURE.md).
