---
name: specstory
description: Search, browse, and summarize AI coding sessions from SpecStory Cloud across all projects and tools.
homepage: https://specstory.com
metadata:
  {
    "openclaw":
      {
        "emoji": "\ud83d\udcdc",
        "primaryEnv": "SPECSTORY_API_KEY",
        "requires": { "bins": ["node"], "env": ["SPECSTORY_API_KEY"] },
      },
  }
---

# SpecStory

Search, browse, and summarize your AI coding sessions across all projects and tools via SpecStory Cloud.

## Setup

Get your API key from https://cloud.specstory.com/settings/api-keys

```bash
export SPECSTORY_API_KEY="your-api-key"
```

## Quick Commands

```bash
# List projects
node {baseDir}/scripts/projects.mjs

# Browse recent sessions
node {baseDir}/scripts/sessions.mjs
node {baseDir}/scripts/sessions.mjs --project "openclaw"
node {baseDir}/scripts/sessions.mjs --tool "Claude Code"
node {baseDir}/scripts/sessions.mjs --since "2026-03-01" --until "2026-03-10"

# Search across all sessions
node {baseDir}/scripts/search.mjs "authentication middleware"
node {baseDir}/scripts/search.mjs "database migration" --project "my-app"
node {baseDir}/scripts/search.mjs "error handling" --since "2026-03-01"

# Get session details
node {baseDir}/scripts/session-detail.mjs <session-id> [project-id]
node {baseDir}/scripts/session-detail.mjs <session-id> --summary

# Generate work digest
node {baseDir}/scripts/digest.mjs                    # Last 24 hours
node {baseDir}/scripts/digest.mjs --hours 48         # Custom window
node {baseDir}/scripts/digest.mjs --week             # Last 7 days
node {baseDir}/scripts/digest.mjs --since "2026-03-10" --until "2026-03-11"
```

## Common Workflows

### Morning Digest

Generate a summary of yesterday's work across all tools and projects:

```bash
node {baseDir}/scripts/digest.mjs
```

### What Was I Working On?

Search by project, tool, or date range:

```bash
node {baseDir}/scripts/sessions.mjs --project "openclaw" --since "2026-03-10"
```

### Cross-Tool Context

Find sessions related to a topic across all tools:

```bash
node {baseDir}/scripts/search.mjs "tailscale networking"
```

### Session Deep Dive

After finding a session via search, get full details:

```bash
node {baseDir}/scripts/session-detail.mjs <session-id>
```

## Automated Daily Digest (Cron)

Set up AM and PM digests via the cron manager:

- **Morning review (9 AM):** `0 14 * * *` (UTC) — reviews yesterday's work
- **Evening capture (6 PM):** `0 23 * * *` (UTC) — captures today's sessions

Ask the agent: "Set up a daily SpecStory digest at 9am and 6pm"

## Filter Reference

### sessions.mjs

| Flag | Description | Example |
|------|-------------|---------|
| `--project` | Filter by project name (substring) | `--project "openclaw"` |
| `--tool` | Filter by client name | `--tool "specstory-cli"` |
| `--agent` | Filter by agent name | `--agent "Claude Code"` |
| `--model` | Filter by LLM model | `--model "claude-sonnet"` |
| `--branch` | Filter by git branch | `--branch "main"` |
| `--tag` | Filter by tag | `--tag "bugfix"` |
| `--since` | Sessions after date | `--since "2026-03-01"` |
| `--until` | Sessions before date | `--until "2026-03-10"` |
| `--limit` | Max results (default: 20) | `--limit 50` |

### search.mjs

| Flag | Description | Example |
|------|-------------|---------|
| `--project` | Filter by project name | `--project "my-app"` |
| `--tool` | Filter by client name | `--tool "specstory-cli"` |
| `--agent` | Filter by agent name | `--agent "Gemini CLI"` |
| `--since` | Sessions after date | `--since "2026-03-01"` |
| `--until` | Sessions before date | `--until "2026-03-10"` |
| `--limit` | Max results (default: 10) | `--limit 20` |

## Notes

- Uses SpecStory Cloud GraphQL API (`cloud.specstory.com/api/v1/graphql`)
- Rate limits: 500 queries/hour (auto-retry on 429)
- Sessions must be synced to SpecStory Cloud first (`specstory sync`)
- Search is full-text with relevance ranking
- Metadata includes: tool/agent name, LLM models, git branches, tags, AI-generated summaries
