#!/usr/bin/env node
// search.mjs — full-text search across sessions.
// Local: case-insensitive substring scan over .specstory/history markdown.
// Cloud: SpecStory Cloud relevance-ranked search with matching excerpts.

import { parseArgs, formatDate } from "./lib/common.mjs";
import { BACKEND_FLAGS, chooseBackend } from "./lib/backend.mjs";
import { listLocalSessions } from "./lib/local.mjs";
import { cloudSearch } from "./lib/cloud.mjs";

const flags = parseArgs(process.argv, {
  ...BACKEND_FLAGS,
  project: "",
  limit: 10,
});

const query = flags._positional[0];
if (flags._help || !query) {
  console.error(`Usage: search.mjs "query" [options]
  --project "name"  Filter by project name
  --since "date"    Sessions after date (cloud)
  --until "date"    Sessions before date (cloud)
  --limit N         Max results (default: 10)
  --root "dir"      Scan all projects under dir (local)
  --cloud | --local Force a backend (default: auto, local-first)`);
  process.exit(2);
}

const backend = chooseBackend(flags);
if (backend === "none") {
  console.error("No data source: no local .specstory/history and no cloud auth. See --help.");
  process.exit(1);
}

const results =
  backend === "local" ? searchLocal(query, flags) : await searchCloud(query, flags);

console.log(`## Search: "${query}" (${results.length} results)  _(source: ${backend})_\n`);
if (!results.length) {
  console.log("No matching sessions found.");
  process.exit(0);
}

results.forEach((r, i) => {
  const tool = r.tool || "Unknown";
  const rank = r.rank != null ? ` (rank: ${r.rank.toFixed(2)})` : "";
  console.log(`${i + 1}. **${r.name}**${rank}`);
  console.log(`   ${r.project} | ${tool} | ${formatDate(r.createdAt)}`);
  if (r.summary) console.log(`   Summary: ${r.summary}`);
  if (r.excerpt) console.log(`   …${r.excerpt}…`);
  console.log();
});

function searchLocal(q, flags) {
  const needle = q.toLowerCase();
  const sessions = listLocalSessions({
    root: flags.root || "",
    cwd: process.cwd(),
    withContent: true,
  });
  const hits = [];
  for (const s of sessions) {
    if (flags.project && !(s.projectName || "").toLowerCase().includes(flags.project.toLowerCase())) continue;
    const md = s.markdownContent || "";
    const idx = md.toLowerCase().indexOf(needle);
    if (idx === -1) continue;
    const count = md.toLowerCase().split(needle).length - 1;
    const start = Math.max(0, idx - 80);
    const excerpt = md.slice(start, idx + needle.length + 160).replace(/\s+/g, " ").trim();
    hits.push({
      name: s.name,
      project: s.projectName,
      tool: s.metadata.agentName || s.metadata.clientName,
      createdAt: s.createdAt,
      summary: null,
      excerpt,
      rank: count, // local "rank" = match count
    });
  }
  hits.sort((a, b) => b.rank - a.rank || new Date(b.createdAt) - new Date(a.createdAt));
  return hits.slice(0, flags.limit || 10);
}

async function searchCloud(q, flags) {
  const filters = {};
  if (flags.since) filters.startDate = flags.since;
  if (flags.until) filters.endDate = flags.until;
  const { results } = await cloudSearch({ query: q, filters, limit: flags.limit || 10 });
  return results
    .filter((r) => !flags.project || (r.projectName || "").toLowerCase().includes(flags.project.toLowerCase()))
    .map((r) => ({
      name: r.name,
      project: r.projectName,
      tool: r.metadata.agentName || r.metadata.clientName,
      createdAt: r.createdAt,
      summary: r.metadata.summary,
      excerpt: r.matchingExchanges?.[0]?.content?.replace(/\s+/g, " ").slice(0, 240),
      rank: r.rank,
    }));
}
