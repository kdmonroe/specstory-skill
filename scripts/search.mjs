#!/usr/bin/env node

import { gql, parseArgs, formatDate } from "./_graphql.mjs";

const flags = parseArgs(process.argv, {
  project: "",
  tool: "",
  agent: "",
  since: "",
  until: "",
  limit: 10,
});

const searchQuery = flags._positional[0];

if (flags._help || !searchQuery) {
  console.error(`Usage: search.mjs "query" [options]
  --project "name"    Filter by project name
  --tool "name"       Filter by client/tool
  --agent "name"      Filter by agent name
  --since "date"      Sessions after date
  --until "date"      Sessions before date
  --limit N           Max results (default: 10)`);
  process.exit(2);
}

const filters = {};
if (flags.tool) filters.clientName = flags.tool;
if (flags.agent) filters.agentName = flags.agent;
if (flags.since) filters.startDate = flags.since;
if (flags.until) filters.endDate = flags.until;

const hasFilters = Object.keys(filters).length > 0;

const query = `query($query: String!, $filters: SessionFilters, $limit: Int) {
  searchSessions(query: $query, filters: $filters, limit: $limit) {
    total
    results {
      sessionId
      projectId
      name
      rank
      createdAt
      metadata {
        clientName
        agentName
        llmModels
        gitBranches
        summary
      }
      matchingExchanges {
        content
        orderNumber
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

// Post-filter by project name
const filtered = flags.project
  ? results.filter((r) =>
      r.project?.name?.toLowerCase().includes(flags.project.toLowerCase()),
    )
  : results;

console.log(
  `## Search: "${searchQuery}" (${filtered.length} of ${data.searchSessions.total} results)\n`,
);

if (filtered.length === 0) {
  console.log("No matching sessions found.");
  process.exit(0);
}

for (let i = 0; i < filtered.length; i++) {
  const r = filtered[i];
  const meta = r.metadata;
  const tool = meta.agentName || meta.clientName || "Unknown";
  const project = r.project?.name || "Unknown";
  const summary = meta.summary || "";

  console.log(`${i + 1}. **${r.name}** (rank: ${r.rank.toFixed(2)})`);
  console.log(
    `   ${project} | ${tool} | ${formatDate(r.createdAt)}`,
  );
  if (summary) {
    console.log(`   Summary: ${summary}`);
  }

  // Show first matching exchange excerpt
  if (r.matchingExchanges?.length > 0) {
    const excerpt = r.matchingExchanges[0].content
      .replace(/\n/g, " ")
      .slice(0, 300);
    console.log(`   ...${excerpt}${r.matchingExchanges[0].content.length > 300 ? "..." : ""}`);
  }
  console.log();
}
