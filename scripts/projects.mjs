#!/usr/bin/env node

import { gql, parseArgs, formatDate } from "./_graphql.mjs";

const flags = parseArgs(process.argv, { limit: 50 });

if (flags._help) {
  console.error('Usage: projects.mjs [--limit 50]');
  process.exit(2);
}

// Projects endpoint may return empty if not fully synced.
// Fall back to discovering projects via searchSessions.
const data = await gql(`{ projects { id name icon color sessionCount lastUpdated } }`);

const projects = data.projects;

if (projects.length > 0) {
  console.log(`## Projects (${projects.length})\n`);
  console.log("| Project | Sessions | Last Updated |");
  console.log("|---------|----------|--------------|");
  for (const p of projects.slice(0, flags.limit)) {
    console.log(`| ${p.name} | ${p.sessionCount} | ${formatDate(p.lastUpdated)} |`);
  }
} else {
  // Fallback: discover projects from search results
  console.log("## Projects (discovered via search)\n");
  console.log("*Note: Projects list empty — discovering from session data.*\n");

  const searchData = await gql(`{
    searchSessions(query: "the", limit: 100) {
      results {
        project { id name }
      }
    }
  }`);

  const projectMap = new Map();
  for (const r of searchData.searchSessions.results) {
    if (r.project && !projectMap.has(r.project.id)) {
      projectMap.set(r.project.id, r.project.name);
    }
  }

  if (projectMap.size === 0) {
    console.log("No projects found. Ensure sessions are synced to SpecStory Cloud.");
  } else {
    console.log("| Project | ID |");
    console.log("|---------|-----|");
    for (const [id, name] of projectMap) {
      console.log(`| ${name} | ${id} |`);
    }
  }
}
