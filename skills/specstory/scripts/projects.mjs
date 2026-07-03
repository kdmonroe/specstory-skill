#!/usr/bin/env node
// projects.mjs — list projects with session counts + last activity.
// Local: enumerate .specstory/history dirs. Cloud: projects query (+ search fallback).

import { parseArgs, formatDate } from "./lib/common.mjs";
import { chooseBackend, BACKEND_FLAGS } from "./lib/backend.mjs";
import { listLocalSessions } from "./lib/local.mjs";
import { gql } from "./lib/cloud.mjs";

const flags = parseArgs(process.argv, { ...BACKEND_FLAGS, limit: 100 });

if (flags._help) {
  console.error(`Usage: projects.mjs [options]
  --root "dir"      Root to scan (local; default: nearest .specstory/history upward)
  --limit N         Max projects (default: 100)
  --cloud | --local Force a backend (default: auto, local-first)`);
  process.exit(2);
}

const backend = chooseBackend(flags);
if (backend === "none") {
  console.error("No data source: no local .specstory/history and no cloud auth. See --help.");
  process.exit(1);
}

if (backend === "local") localProjects();
else await cloudProjects();

function localProjects() {
  const sessions = listLocalSessions({ root: flags.root || "", cwd: process.cwd(), withContent: false });
  const map = new Map();
  for (const s of sessions) {
    const cur = map.get(s.projectName) || { count: 0, last: null };
    cur.count++;
    if (!cur.last || new Date(s.createdAt) > new Date(cur.last)) cur.last = s.createdAt;
    map.set(s.projectName, cur);
  }
  const rows = [...map.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => new Date(b.last) - new Date(a.last))
    .slice(0, flags.limit);
  console.log(`## Projects (${rows.length})  _(source: local)_\n`);
  console.log("| Project | Sessions | Last Activity |");
  console.log("|---------|----------|---------------|");
  for (const r of rows) console.log(`| ${r.name} | ${r.count} | ${formatDate(r.last)} |`);
}

async function cloudProjects() {
  const data = await gql(`{ projects { id name sessionCount lastUpdated } }`);
  let projects = data.projects || [];
  if (!projects.length) {
    const sd = await gql(`{ searchSessions(query: "session", limit: 100) { results { project { id name } } } }`);
    const m = new Map();
    for (const r of sd.searchSessions.results) if (r.project && !m.has(r.project.id)) m.set(r.project.id, r.project.name);
    console.log(`## Projects (discovered via search, ${m.size})  _(source: cloud)_\n`);
    console.log("| Project | ID |");
    console.log("|---------|-----|");
    for (const [id, name] of m) console.log(`| ${name} | ${id} |`);
    return;
  }
  console.log(`## Projects (${projects.length})  _(source: cloud)_\n`);
  console.log("| Project | Sessions | Last Updated |");
  console.log("|---------|----------|--------------|");
  for (const p of projects.slice(0, flags.limit)) console.log(`| ${p.name} | ${p.sessionCount} | ${formatDate(p.lastUpdated)} |`);
}
