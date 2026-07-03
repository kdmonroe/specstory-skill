#!/usr/bin/env node
// digest.mjs — work digest grouped by repo, with structured recaps.
// Local-first; --cloud for SpecStory Cloud. --json for cron/automation.

import { parseArgs, formatDate, formatDuration, isLikelyIdle } from "./lib/common.mjs";
import { BACKEND_FLAGS, getSessions } from "./lib/backend.mjs";
import { recapFromMarkdown, renderRecapMarkdown } from "./lib/recap.mjs";
import { readContent } from "./lib/local.mjs";

const flags = parseArgs(process.argv, {
  ...BACKEND_FLAGS,
  hours: 24,
  week: false,
  limit: 50,
  json: false,
});

if (flags._help) {
  console.error(`Usage: digest.mjs [options]
  --hours N         Time window in hours (default: 24)
  --week            Last 7 days
  --since "date"    Start date (ISO 8601) — overrides --hours/--week
  --until "date"    End date (ISO 8601)
  --limit N         Max sessions (default: 50)
  --json            Emit structured digest as JSON (always includes recap)
  --root "dir"      Scan all projects under dir (local)
  --cloud | --local Force a backend (default: auto, local-first)`);
  process.exit(2);
}

// Resolve the time window into since/until so both backends share it.
const now = Date.now();
const userSince = flags.since; // explicit --since (before defaulting)
if (!flags.since) {
  const ms = flags.week ? 7 * 24 * 3600_000 : flags.hours * 3600_000;
  flags.since = new Date(now - ms).toISOString();
}
if (!flags.until) flags.until = new Date(now).toISOString();
const windowLabel = userSince
  ? `${formatDate(flags.since)} to ${formatDate(flags.until)}`
  : flags.week
    ? "Last 7 Days"
    : `Last ${flags.hours}h`;

const { backend, sessions } = await getSessions(flags, { withContent: true });

for (const s of sessions) {
  const md = s.markdownContent || (s.filePath ? readContent(s.filePath) : null);
  s.recap = md ? recapFromMarkdown(md, s.metadata) : null;
}

if (flags.json) emitJson();
else emitMarkdown();

function repoKey(s) {
  const r = s.recap?.repo;
  if (r?.owner && r?.name) return `${r.owner}/${r.name}`;
  if (r?.name) return r.name;
  return s.projectName || s.projectId;
}

function groupByRepo() {
  const g = new Map();
  for (const s of sessions) {
    const k = repoKey(s);
    if (!g.has(k)) g.set(k, []);
    g.get(k).push(s);
  }
  return g;
}

function sessionMins(s) {
  if (!s.startedAt || !s.endedAt) return 0;
  const m = (new Date(s.endedAt) - new Date(s.startedAt)) / 60000;
  return isNaN(m) || m < 0 ? 0 : m;
}

function totals() {
  let mins = 0;
  const models = new Map(), tools = new Map(), branches = new Set();
  for (const s of sessions) {
    mins += sessionMins(s);
    const t = s.metadata.agentName || s.metadata.clientName || "Unknown";
    tools.set(t, (tools.get(t) || 0) + 1);
    for (const m of s.metadata.llmModels || []) models.set(m, (models.get(m) || 0) + 1);
    for (const b of s.metadata.gitBranches || []) branches.add(b);
  }
  return { mins, models, tools, branches };
}

function emitJson() {
  const grouped = groupByRepo();
  const t = totals();
  console.log(JSON.stringify({
    backend,
    window: { startDate: flags.since, endDate: flags.until, label: windowLabel },
    totals: { sessions: sessions.length, hours: +(t.mins / 60).toFixed(2) },
    repos: [...grouped.entries()].map(([key, list]) => ({
      key,
      sessionCount: list.length,
      sessions: list.map((s) => ({
        sessionId: s.sessionId,
        projectName: s.projectName,
        name: s.name,
        createdAt: s.createdAt,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        duration: formatDuration(s.startedAt, s.endedAt),
        likelyIdle: isLikelyIdle(s.startedAt, s.endedAt),
        tool: s.metadata.agentName || s.metadata.clientName || null,
        models: s.metadata.llmModels,
        branches: s.metadata.gitBranches,
        tags: s.metadata.tags,
        summary: s.metadata.summary,
        recap: s.recap,
      })),
    })),
  }, null, 2));
}

function emitMarkdown() {
  console.log(`## Work Digest: ${windowLabel}  _(source: ${backend})_\n`);
  if (!sessions.length) {
    console.log("No sessions found in this time window.");
    return;
  }
  const t = totals();
  const grouped = groupByRepo();
  console.log(`**Summary:** ${sessions.length} sessions across ${grouped.size} repos, ~${(t.mins / 60).toFixed(1)}h total\n`);
  console.log("---\n");

  for (const [key, list] of grouped) {
    const mins = list.reduce((a, s) => a + sessionMins(s), 0);
    const dur = mins >= 60 ? `${(mins / 60).toFixed(1)}h` : `${Math.round(mins)}min`;
    console.log(`### ${key} (${list.length} sessions, ${dur})\n`);
    for (const s of list) {
      const d = formatDuration(s.startedAt, s.endedAt);
      const idle = isLikelyIdle(s.startedAt, s.endedAt) ? " ⚠️ idle?" : "";
      const tool = s.metadata.agentName || s.metadata.clientName || "—";
      const models = s.metadata.llmModels?.join(", ") || "—";
      const summary = s.metadata.summary ? ` — ${s.metadata.summary}` : "";
      console.log(`- ${s.name} (${d}${idle}) · ${tool} · ${models}${summary}`);
      if (s.recap) {
        const inner = renderRecapMarkdown(s.recap).split("\n").filter(Boolean).map((l) => "  " + l).join("\n");
        if (inner) console.log(inner);
      }
    }
    console.log();
  }

  console.log("---\n");
  if (t.models.size) console.log(`**Models used:** ${[...t.models.entries()].sort((a, b) => b[1] - a[1]).map(([m, c]) => `${m} (${c})`).join(", ")}`);
  if (t.tools.size) console.log(`**Tools used:** ${[...t.tools.entries()].sort((a, b) => b[1] - a[1]).map(([m, c]) => `${m} (${c})`).join(", ")}`);
  if (t.branches.size) console.log(`**Branches touched:** ${[...t.branches].join(", ")}`);
}
