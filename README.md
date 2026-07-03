# specstory-skill

A portable **[Agent Skill](https://agentskills.io)** for querying your AI coding
session history. **Local-first** — it parses `.specstory/history` markdown directly,
so it works with **zero configuration and no API key** — with an optional
**`--cloud`** layer that hits the [SpecStory Cloud](https://specstory.com) GraphQL
API for cross-machine reach.

Works with any tool [SpecStory](https://specstory.com) captures: Claude Code,
Cursor, Codex CLI, Gemini CLI, Droid, GitHub Copilot, and more.

## What it does

| Command | Purpose |
|---------|---------|
| `recap.mjs` | **"What was I last working on?"** — most-recent session per project, with a structured recap (repo, stack, files touched, intent, outcome). |
| `digest.mjs` | Work digest grouped by repo over a time window (`--hours`/`--week`). `--json` for cron/automation. |
| `sessions.mjs` | Browse/filter sessions (project, tool, model, branch, tag, date). |
| `search.mjs` | Full-text search across sessions. Local: match-count ranked. Cloud: relevance ranked with excerpts. |
| `session-detail.mjs` | One session's metadata + raw content, or `--recap` for the structured view. |
| `projects.mjs` | List projects with session counts + last activity. |
| `introspect.mjs` | Dump the Cloud GraphQL schema (maintenance; cloud-only). |

Every command is **local-first by default** and accepts `--local` / `--cloud` to
force a backend, and `--root <dir>` to scan many repos at once.

## Install

### As a Claude Code plugin (recommended)

```text
/plugin marketplace add kdmonroe/specstory-skill
/plugin install specstory
```

Commands surface as `/specstory:recap`, `/specstory:digest`, etc.

### As a standalone skill (Claude Code / Cursor / Codex — cross-tool)

```bash
# via the Agent Skills CLI (auto-detects + symlinks into your tools)
npx skills add kdmonroe/specstory-skill

# or manually
git clone https://github.com/kdmonroe/specstory-skill.git
cp -r specstory-skill/skills/specstory ~/.claude/skills/specstory
```

### For OpenClaw / Hermes

Copy `skills/specstory` into your agent's skills directory. Runtime hints live in
the namespaced `metadata.openclaw` / `metadata.hermes` SKILL.md fields.

## Usage

```bash
cd skills/specstory

# Local (no key): what was I working on, across every repo under ~/code?
node scripts/recap.mjs --root ~/code

# This week's digest for the current project
node scripts/digest.mjs --week

# Search past sessions
node scripts/search.mjs "authentication" --root ~/code

# Cloud (cross-machine) — needs auth, see below
node scripts/digest.mjs --cloud --week --json
```

### Cloud auth (only for `--cloud`)

```bash
export SPECSTORY_API_KEY="your-key"   # https://cloud.specstory.com/settings/api-keys
```

If you use the SpecStory CLI, a short-lived JWT is read automatically from
`~/.specstory/cli/auth.json` (refreshed by `specstory login`), so `--cloud`
often works without a permanent key.

## Requirements

- Node.js >= 18 (no dependencies — standard library only).
- Local mode: a project containing `.specstory/history` (written by the
  [SpecStory CLI](https://github.com/specstoryai/getspecstory)).

## Documentation

- [skills/specstory/SKILL.md](skills/specstory/SKILL.md) — the skill definition + command reference.
- [specs.md](specs.md) — full specification (data model, backends, behavior).
- [skills/specstory/references/ARCHITECTURE.md](skills/specstory/references/ARCHITECTURE.md) — how every file fits together.
- [skills/specstory/references/cloud-api.md](skills/specstory/references/cloud-api.md) — SpecStory Cloud GraphQL reference.

## License

[Apache-2.0](LICENSE) — aligned with SpecStory's own
[official agent-skills](https://github.com/specstoryai/agent-skills). Community
project, not affiliated with SpecStory. See [NOTICE](NOTICE).
