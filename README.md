# specstory-skill

An [OpenClaw](https://github.com/kdmonroe/openclaw-deploy-2) skill for querying AI coding sessions via the [SpecStory Cloud](https://specstory.com) API.

## Features

- **Search** across all coding sessions with full-text search and relevance ranking
- **Browse** sessions filtered by project, tool, model, branch, date range, or tags
- **Digest** daily/weekly work summaries grouped by project and tool
- **Detail** view of individual session conversations and metadata

## Supported Tools

Works with any tool captured by SpecStory: Claude Code, Gemini CLI, Cursor, GitHub Copilot, Codex CLI, and more.

## Installation

1. Get your API key from [SpecStory Cloud Settings](https://cloud.specstory.com/settings/api-keys)

2. Copy to your OpenClaw skills directory:
   ```bash
   git clone https://github.com/kdmonroe/specstory-skill.git ~/.openclaw/skills/specstory
   ```

3. Set the API key in your OpenClaw config or environment:
   ```bash
   export SPECSTORY_API_KEY="your-key"
   ```

## Usage

See [SKILL.md](SKILL.md) for full command reference.

```bash
# Search sessions
node scripts/search.mjs "authentication"

# Daily digest
node scripts/digest.mjs

# Browse by project
node scripts/sessions.mjs --project "my-app"
```

## License

MIT
