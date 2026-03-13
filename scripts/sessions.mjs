#!/usr/bin/env node

import { gql, parseArgs, formatDate, formatDuration } from "./_graphql.mjs";

const flags = parseArgs(process.argv, {
  project: "",
  tool: "",
  agent: "",
  model: "",
  branch: "",
  tag: "",
  since: "",
  until: "",
  limit: 20,
});

if (flags._help) {
  console.error(`Usage: sessions.mjs [options]
  --project "name"    Filter by project name (substring)
  --tool "name"       Filter by client/tool name
  --agent "name"      Filter by agent name
  --model "model"     Filter by LLM model
  --branch "branch"   Filter by git branch
  --tag "tag"         Filter by tag
  --since "date"      Sessions after date (ISO 8601)
  --until "date"      Sessions before date (ISO 8601)
  --limit N           Max results (default: 20)`);
  process.exit(2);
}

// Build filters object
const filters = {};
if (flags.tool) filters.clientName = flags.tool;
if (flags.agent) filters.agentName = flags.agent;
if (flags.model) filters.llmModels = [flags.model];
if (flags.branch) filters.gitBranches = [flags.branch];
if (flags.tag) filters.tags = [flags.tag];
if (flags.since) filters.startDate = flags.since;
if (flags.until) filters.endDate = flags.until;

const hasFilters = Object.keys(filters).length > 0;

// Use searchSessions as primary endpoint (sessions list may be empty due to sync state)
// If no text filter, use a broad search term
const searchQuery = flags.project || "session";

const query = `query($query: String!, $filters: SessionFilters, $limit: Int) {
  searchSessions(query: $query, filters: $filters, limit: $limit) {
    total
    results {
      sessionId
      projectId
      name
      rank
      createdAt
      updatedAt
      startedAt
      endedAt
      metadata {
        clientName
        agentName
        llmModels
        gitBranches
        tags
        summary
      }
      project { id name }
    }
  }
}`;

const data = await gql(query, {
  query: searchQuery,
  filters: hasFilters ? filters : undefined,
  limit: flags.limit,
});

const results = data.searchSessions.results;

// Post-filter by project name if specified (since search uses it as text query)
const filtered = flags.project
  ? results.filter((r) =>
      r.project?.name?.toLowerCase().includes(flags.project.toLowerCase()),
    )
  : results;

if (filtered.length === 0) {
  console.log("No sessions found matching filters.");
  process.exit(0);
}

// Group by project
const byProject = new Map();
for (const s of filtered) {
  const pName = s.project?.name ?? "Unknown Project";
  if (!byProject.has(pName)) byProject.set(pName, []);
  byProject.get(pName).push(s);
}

console.log(
  `## Sessions (${filtered.length} of ${data.searchSessions.total} total)\n`,
);

for (const [projectName, sessions] of byProject) {
  console.log(`### ${projectName}\n`);
  for (const s of sessions) {
    const meta = s.metadata;
    const duration = formatDuration(s.startedAt, s.endedAt);
    const tool = meta.agentName || meta.clientName || "Unknown";
    const models = meta.llmModels?.join(", ") || "—";
    const branches = meta.gitBranches?.join(", ") || "—";
    const tags = meta.tags?.length ? ` | Tags: ${meta.tags.join(", ")}` : "";
    const summary = meta.summary ? `\n  ${meta.summary}` : "";

    console.log(
      `- **${s.name}** (${formatDate(s.createdAt)}, ${duration})`,
    );
    console.log(
      `  ${tool} (${models}) | Branch: ${branches}${tags}${summary}`,
    );
    console.log();
  }
}
