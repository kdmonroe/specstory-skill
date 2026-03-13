#!/usr/bin/env node

import { gql, parseArgs, formatDate, formatDuration } from "./_graphql.mjs";

const flags = parseArgs(process.argv, {
  hours: 24,
  since: "",
  until: "",
  week: false,
});

if (flags._help) {
  console.error(`Usage: digest.mjs [options]
  --hours N              Time window in hours (default: 24)
  --since "date"         Start date (ISO 8601)
  --until "date"         End date (ISO 8601)
  --week                 Last 7 days`);
  process.exit(2);
}

// Calculate time window
let startDate, endDate;
const now = new Date();

if (flags.since) {
  startDate = flags.since;
  endDate = flags.until || now.toISOString();
} else if (flags.week) {
  startDate = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  endDate = now.toISOString();
} else {
  startDate = new Date(now - flags.hours * 60 * 60 * 1000).toISOString();
  endDate = now.toISOString();
}

const filters = { startDate, endDate };

// Fetch sessions using search (most reliable endpoint)
// Use multiple common terms to cast a wide net
const searchTerms = ["the", "code", "fix", "add", "update", "implement", "error", "test"];
const allResults = new Map();

for (const term of searchTerms) {
  const data = await gql(
    `query($query: String!, $filters: SessionFilters, $limit: Int) {
      searchSessions(query: $query, filters: $filters, limit: $limit) {
        total
        results {
          sessionId
          projectId
          name
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
    }`,
    { query: term, filters, limit: 100 },
  );

  for (const r of data.searchSessions.results) {
    if (!allResults.has(r.sessionId)) {
      allResults.set(r.sessionId, r);
    }
  }
}

const sessions = [...allResults.values()].sort(
  (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
);

// Format header
const windowLabel = flags.week
  ? "Last 7 Days"
  : flags.since
    ? `${formatDate(startDate)} to ${formatDate(endDate)}`
    : `Last ${flags.hours}h`;

console.log(`## Work Digest: ${windowLabel}\n`);

if (sessions.length === 0) {
  console.log("No sessions found in this time window.");
  process.exit(0);
}

// Calculate totals
let totalMins = 0;
const allModels = new Map();
const allTools = new Map();
const allBranches = new Set();

for (const s of sessions) {
  if (s.startedAt && s.endedAt) {
    totalMins += (new Date(s.endedAt) - new Date(s.startedAt)) / 60000;
  }
  const tool = s.metadata.agentName || s.metadata.clientName || "Unknown";
  allTools.set(tool, (allTools.get(tool) || 0) + 1);
  for (const m of s.metadata.llmModels || []) {
    allModels.set(m, (allModels.get(m) || 0) + 1);
  }
  for (const b of s.metadata.gitBranches || []) {
    allBranches.add(b);
  }
}

// Group by project, then by tool
const byProject = new Map();
for (const s of sessions) {
  const pName = s.project?.name ?? "Unknown Project";
  if (!byProject.has(pName)) byProject.set(pName, []);
  byProject.get(pName).push(s);
}

const totalHours = (totalMins / 60).toFixed(1);
console.log(
  `**Summary:** ${sessions.length} sessions across ${byProject.size} projects, ~${totalHours}h total\n`,
);
console.log("---\n");

for (const [projectName, projectSessions] of byProject) {
  let projectMins = 0;
  for (const s of projectSessions) {
    if (s.startedAt && s.endedAt) {
      projectMins += (new Date(s.endedAt) - new Date(s.startedAt)) / 60000;
    }
  }

  const projectTime = formatDuration(
    new Date(Date.now() - projectMins * 60000).toISOString(),
    new Date().toISOString(),
  );

  console.log(
    `### ${projectName} (${projectSessions.length} sessions, ${projectTime})\n`,
  );

  // Group by tool
  const byTool = new Map();
  for (const s of projectSessions) {
    const tool = s.metadata.agentName || s.metadata.clientName || "Unknown";
    if (!byTool.has(tool)) byTool.set(tool, []);
    byTool.get(tool).push(s);
  }

  for (const [tool, toolSessions] of byTool) {
    console.log(`**${tool}** (${toolSessions.length} sessions)`);
    for (const s of toolSessions) {
      const duration = formatDuration(s.startedAt, s.endedAt);
      const models = s.metadata.llmModels?.join(", ") || "—";
      const branches = s.metadata.gitBranches?.join(", ");
      const branchStr = branches ? ` — branch: ${branches}` : "";
      const summary = s.metadata.summary ? ` — ${s.metadata.summary}` : "";
      console.log(
        `- ${s.name} (${duration}) — ${models}${branchStr}${summary}`,
      );
    }
    console.log();
  }
}

// Footer stats
console.log("---\n");
if (allModels.size > 0) {
  const modelStr = [...allModels.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([m, c]) => `${m} (${c})`)
    .join(", ");
  console.log(`**Models used:** ${modelStr}`);
}
if (allTools.size > 0) {
  const toolStr = [...allTools.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([t, c]) => `${t} (${c})`)
    .join(", ");
  console.log(`**Tools used:** ${toolStr}`);
}
if (allBranches.size > 0) {
  console.log(`**Branches touched:** ${[...allBranches].join(", ")}`);
}
