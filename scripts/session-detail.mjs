#!/usr/bin/env node

import { gql, parseArgs, formatDate, formatDuration } from "./_graphql.mjs";

const flags = parseArgs(process.argv, {
  summary: false,
});

const sessionId = flags._positional[0];
const projectId = flags._positional[1];

if (flags._help || !sessionId) {
  console.error(`Usage: session-detail.mjs <session-id> [project-id] [options]
  --summary    Show only metadata, no content

If project-id is not provided, searches for the session by ID.`);
  process.exit(2);
}

// If we have both IDs, try direct fetch first
if (projectId) {
  const data = await gql(
    `query($projectId: String!, $sessionId: String!) {
      session(projectId: $projectId, sessionId: $sessionId) {
        id projectId name markdownContent markdownSize
        createdAt updatedAt startedAt endedAt
        metadata { clientName clientVersion agentName llmModels gitBranches tags summary }
      }
    }`,
    { projectId, sessionId },
  );

  if (data.session) {
    printSession(data.session, flags.summary);
    process.exit(0);
  }
}

// Fallback: search for the session by name/ID
const searchData = await gql(
  `query($query: String!) {
    searchSessions(query: $query, limit: 5) {
      results {
        sessionId projectId name createdAt updatedAt startedAt endedAt
        metadata { clientName clientVersion agentName llmModels gitBranches tags summary }
        matchingExchanges { content orderNumber }
        project { name }
      }
    }
  }`,
  { query: sessionId },
);

const match = searchData.searchSessions.results.find(
  (r) => r.sessionId === sessionId,
);

if (!match) {
  // Try the first result if only one came back
  if (searchData.searchSessions.results.length === 1) {
    printSearchResult(searchData.searchSessions.results[0], flags.summary);
  } else if (searchData.searchSessions.results.length > 0) {
    console.log(`Session "${sessionId}" not found directly. Did you mean:\n`);
    for (const r of searchData.searchSessions.results) {
      console.log(`- ${r.name} (${r.sessionId})`);
      console.log(`  Project: ${r.project?.name}, ${formatDate(r.createdAt)}`);
    }
  } else {
    console.error(`Session "${sessionId}" not found.`);
    process.exit(1);
  }
} else {
  printSearchResult(match, flags.summary);
}

function printSession(s, summaryOnly) {
  const meta = s.metadata;
  console.log(`## ${s.name}\n`);
  console.log(`| Field | Value |`);
  console.log(`|-------|-------|`);
  console.log(`| ID | ${s.id} |`);
  console.log(`| Project | ${s.projectId} |`);
  console.log(`| Tool | ${meta.agentName || meta.clientName || "—"} |`);
  console.log(`| Models | ${meta.llmModels?.join(", ") || "—"} |`);
  console.log(`| Branches | ${meta.gitBranches?.join(", ") || "—"} |`);
  console.log(`| Tags | ${meta.tags?.join(", ") || "—"} |`);
  console.log(`| Created | ${formatDate(s.createdAt)} |`);
  console.log(`| Duration | ${formatDuration(s.startedAt, s.endedAt)} |`);
  console.log(`| Size | ${(s.markdownSize / 1024).toFixed(1)} KB |`);
  if (meta.summary) console.log(`| Summary | ${meta.summary} |`);
  console.log();

  if (!summaryOnly && s.markdownContent) {
    console.log("---\n");
    console.log(s.markdownContent);
  }
}

function printSearchResult(r, summaryOnly) {
  const meta = r.metadata;
  console.log(`## ${r.name}\n`);
  console.log(`| Field | Value |`);
  console.log(`|-------|-------|`);
  console.log(`| Session ID | ${r.sessionId} |`);
  console.log(`| Project | ${r.project?.name || r.projectId} |`);
  console.log(`| Tool | ${meta.agentName || meta.clientName || "—"} |`);
  console.log(`| Models | ${meta.llmModels?.join(", ") || "—"} |`);
  console.log(`| Branches | ${meta.gitBranches?.join(", ") || "—"} |`);
  console.log(`| Tags | ${meta.tags?.join(", ") || "—"} |`);
  console.log(`| Created | ${formatDate(r.createdAt)} |`);
  console.log(`| Duration | ${formatDuration(r.startedAt, r.endedAt)} |`);
  if (meta.summary) console.log(`| Summary | ${meta.summary} |`);
  console.log();

  if (!summaryOnly && r.matchingExchanges?.length > 0) {
    console.log("---\n");
    console.log("### Conversation Excerpts\n");
    for (const ex of r.matchingExchanges.slice(0, 10)) {
      console.log(`**Exchange #${ex.orderNumber}:**`);
      console.log(ex.content.slice(0, 2000));
      if (ex.content.length > 2000) console.log("...(truncated)");
      console.log();
    }
  }
}
