#!/usr/bin/env node
// sessions.mjs — browse sessions, grouped by project. Local-first; --cloud for SpecStory Cloud.

import { parseArgs, formatDate, formatDuration, isLikelyIdle } from "./lib/common.mjs";
import { BACKEND_FLAGS, getSessions } from "./lib/backend.mjs";

const flags = parseArgs(process.argv, {
  ...BACKEND_FLAGS,
  project: "",
  tool: "",
  model: "",
  branch: "",
  tag: "",
  limit: 20,
});

if (flags._help) {
  console.error(`Usage: sessions.mjs [options]
  --project "name"  Filter by project name (substring)
  --tool "name"     Filter by client/agent name (substring)
  --model "model"   Filter by LLM model (substring)
  --branch "branch" Filter by git branch (substring)
  --tag "tag"       Filter by tag (cloud only)
  --since "date"    Sessions after date (ISO 8601)
  --until "date"    Sessions before date
  --limit N         Max results (default: 20)
  --root "dir"      Scan all projects under dir (local)
  --cloud | --local Force a backend (default: auto, local-first)`);
  process.exit(2);
}

let { backend, sessions } = await getSessions(flags, { withContent: false });

const sub = (hay, needle) => (hay || "").toLowerCase().includes(needle.toLowerCase());
sessions = sessions.filter((s) => {
  if (flags.project && !sub(s.projectName, flags.project)) return false;
  if (flags.tool && !sub(s.metadata.agentName || s.metadata.clientName, flags.tool)) return false;
  if (flags.model && !(s.metadata.llmModels || []).some((m) => sub(m, flags.model))) return false;
  if (flags.branch && !(s.metadata.gitBranches || []).some((b) => sub(b, flags.branch))) return false;
  if (flags.tag && !(s.metadata.tags || []).some((t) => sub(t, flags.tag))) return false;
  return true;
});

if (sessions.length === 0) {
  console.log(`No sessions found matching filters _(source: ${backend})_.`);
  process.exit(0);
}

const byProject = new Map();
for (const s of sessions) {
  const p = s.projectName || "Unknown Project";
  if (!byProject.has(p)) byProject.set(p, []);
  byProject.get(p).push(s);
}

console.log(`## Sessions (${sessions.length})  _(source: ${backend})_\n`);
for (const [projectName, list] of byProject) {
  console.log(`### ${projectName}\n`);
  for (const s of list) {
    const dur = formatDuration(s.startedAt, s.endedAt);
    const idle = isLikelyIdle(s.startedAt, s.endedAt) ? " ⚠️ idle?" : "";
    const tool = s.metadata.agentName || s.metadata.clientName || "Unknown";
    const models = s.metadata.llmModels?.join(", ") || "—";
    const branches = s.metadata.gitBranches?.join(", ") || "—";
    const tags = s.metadata.tags?.length ? ` | Tags: ${s.metadata.tags.join(", ")}` : "";
    const summary = s.metadata.summary ? `\n  ${s.metadata.summary}` : "";
    console.log(`- **${s.name}** (${formatDate(s.createdAt)}, ${dur}${idle})`);
    console.log(`  ${tool} (${models}) | Branch: ${branches}${tags}${summary}`);
    console.log();
  }
}
