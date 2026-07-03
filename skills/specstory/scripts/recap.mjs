#!/usr/bin/env node
// recap.mjs — "What was I last working on?" Per-project most-recent session(s)
// with a structured recap (repo, stack, files touched, intent, outcome).
// Local-first; works with zero API key against .specstory/history.

import { parseArgs, formatDate, formatDuration, isLikelyIdle } from "./lib/common.mjs";
import { BACKEND_FLAGS, getSessions } from "./lib/backend.mjs";
import { recapFromMarkdown, renderRecapMarkdown } from "./lib/recap.mjs";
import { readContent } from "./lib/local.mjs";

const flags = parseArgs(process.argv, {
  ...BACKEND_FLAGS,
  limit: 0, // 0 = no cap; default shows most-recent per project
  per: 1, // sessions to show per project
  json: false,
});

if (flags._help) {
  console.error(`Usage: recap.mjs [options]
  --root "dir"     Scan all projects under dir (default: nearest .specstory/history)
  --per N          Most-recent sessions per project (default: 1)
  --since "date"   Only sessions after date (ISO 8601)
  --until "date"   Only sessions before date
  --limit N        Cap total projects/sessions considered
  --cloud          Force SpecStory Cloud backend
  --local          Force local backend
  --json           Emit structured JSON`);
  process.exit(2);
}

const { backend, sessions } = await getSessions(flags, { withContent: false });

// Group by project, newest first, keep top --per per project.
const byProject = new Map();
for (const s of sessions) {
  if (!byProject.has(s.projectName)) byProject.set(s.projectName, []);
  byProject.get(s.projectName).push(s);
}

const projects = [...byProject.entries()].map(([name, list]) => {
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return { name, sessions: list.slice(0, Math.max(1, flags.per)) };
});
// Order projects by their most-recent activity.
projects.sort(
  (a, b) => new Date(b.sessions[0].createdAt) - new Date(a.sessions[0].createdAt),
);

// Attach recap from markdown (local: read file; cloud: fetch content lazily skipped — use summary).
for (const p of projects) {
  for (const s of p.sessions) {
    const md = s.markdownContent || (s.filePath ? readContent(s.filePath) : null);
    s.recap = md ? recapFromMarkdown(md, s.metadata) : null;
  }
}

if (flags.json) {
  console.log(
    JSON.stringify(
      {
        backend,
        generatedFrom: flags.root || "cwd",
        projects: projects.map((p) => ({
          project: p.name,
          sessions: p.sessions.map((s) => ({
            sessionId: s.sessionId,
            name: s.name,
            createdAt: s.createdAt,
            startedAt: s.startedAt,
            endedAt: s.endedAt,
            duration: formatDuration(s.startedAt, s.endedAt),
            likelyIdle: isLikelyIdle(s.startedAt, s.endedAt),
            tool: s.metadata.agentName || s.metadata.clientName || null,
            models: s.metadata.llmModels,
            recap: s.recap,
          })),
        })),
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

// Markdown output.
console.log(`## What you were last working on  _(source: ${backend})_\n`);
if (!projects.length) {
  console.log("No sessions found.");
  process.exit(0);
}

for (const p of projects) {
  console.log(`### ${p.name}`);
  for (const s of p.sessions) {
    const dur = formatDuration(s.startedAt, s.endedAt);
    const idle = isLikelyIdle(s.startedAt, s.endedAt) ? " ⚠️ idle?" : "";
    const tool = s.metadata.agentName || s.metadata.clientName || "—";
    const models = s.metadata.llmModels?.join(", ") || "—";
    console.log(`- **${s.name}** — ${formatDate(s.createdAt)} (${dur}${idle}) · ${tool} · ${models}`);
    if (s.recap) {
      const inner = renderRecapMarkdown(s.recap)
        .split("\n")
        .filter(Boolean)
        .map((l) => "  " + l)
        .join("\n");
      if (inner) console.log(inner);
    }
  }
  console.log();
}
