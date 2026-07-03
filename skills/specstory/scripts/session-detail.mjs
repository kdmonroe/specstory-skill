#!/usr/bin/env node
// session-detail.mjs — show one session's metadata + content/recap.
// Local: match by sessionId (uuid), filename, or name substring.
// Cloud: direct fetch by id, else search fallback.

import { parseArgs, formatDate, formatDuration } from "./lib/common.mjs";
import { chooseBackend, BACKEND_FLAGS } from "./lib/backend.mjs";
import { listLocalSessions } from "./lib/local.mjs";
import { gql } from "./lib/cloud.mjs";
import { recapFromMarkdown, renderRecapMarkdown } from "./lib/recap.mjs";

const flags = parseArgs(process.argv, {
  ...BACKEND_FLAGS,
  summary: false,
  recap: false,
});

const id = flags._positional[0];
if (flags._help || !id) {
  console.error(`Usage: session-detail.mjs <session-id|filename|name> [project-id] [options]
  --summary         Metadata only (no content)
  --recap           Show structured recap instead of raw content
  --root "dir"      Scan all projects under dir (local)
  --cloud | --local Force a backend (default: auto, local-first)`);
  process.exit(2);
}

const backend = chooseBackend(flags);
if (backend === "none") {
  console.error("No data source: no local .specstory/history and no cloud auth. See --help.");
  process.exit(1);
}

if (backend === "local") localDetail(id);
else await cloudDetail(id, flags._positional[1]);

function localDetail(needle) {
  const sessions = listLocalSessions({ root: flags.root || "", cwd: process.cwd(), withContent: true });
  const n = needle.toLowerCase();
  const match =
    sessions.find((s) => s.sessionId === needle) ||
    sessions.find((s) => (s.filePath || "").toLowerCase().includes(n)) ||
    sessions.find((s) => (s.name || "").toLowerCase().includes(n));
  if (!match) {
    console.error(`No local session matching "${needle}".`);
    process.exit(1);
  }
  printMeta(match);
  if (flags.summary) return;
  if (flags.recap) {
    const recap = recapFromMarkdown(match.markdownContent || "", match.metadata);
    console.log("---\n\n### Recap\n");
    console.log(renderRecapMarkdown(recap) || "_(no recap signals)_");
  } else if (match.markdownContent) {
    console.log("---\n");
    console.log(match.markdownContent);
  }
}

async function cloudDetail(sessionId, projectId) {
  let s = null;
  if (projectId) {
    const data = await gql(
      `query($projectId: String!, $sessionId: String!) {
        session(projectId: $projectId, sessionId: $sessionId) {
          sessionId: id projectId name markdownContent
          createdAt updatedAt startedAt endedAt
          metadata { clientName agentName llmModels gitBranches tags summary }
        }
      }`,
      { projectId, sessionId },
    );
    s = data.session;
  }
  if (!s) {
    const data = await gql(
      `query($query: String!) {
        searchSessions(query: $query, limit: 5) {
          results {
            sessionId projectId name markdownContent createdAt updatedAt startedAt endedAt
            metadata { clientName agentName llmModels gitBranches tags summary }
            project { name }
          }
        }
      }`,
      { query: sessionId },
    );
    const results = data.searchSessions.results;
    s = results.find((r) => r.sessionId === sessionId) || (results.length === 1 ? results[0] : null);
    if (!s) {
      console.error(results.length ? `Not found directly. Candidates:\n${results.map((r) => `- ${r.name} (${r.sessionId})`).join("\n")}` : `Session "${sessionId}" not found.`);
      process.exit(1);
    }
    if (s.project) s.projectName = s.project.name;
  }
  printMeta({
    name: s.name,
    sessionId: s.sessionId,
    projectName: s.projectName || s.projectId,
    createdAt: s.createdAt,
    startedAt: s.startedAt,
    endedAt: s.endedAt,
    metadata: s.metadata || {},
  });
  if (flags.summary) return;
  if (flags.recap) {
    console.log("---\n\n### Recap\n");
    console.log(renderRecapMarkdown(recapFromMarkdown(s.markdownContent || "", s.metadata || {})) || "_(no recap signals)_");
  } else if (s.markdownContent) {
    console.log("---\n");
    console.log(s.markdownContent);
  }
}

function printMeta(s) {
  const m = s.metadata || {};
  console.log(`## ${s.name}\n`);
  console.log(`| Field | Value |`);
  console.log(`|-------|-------|`);
  console.log(`| Session ID | ${s.sessionId} |`);
  console.log(`| Project | ${s.projectName || "—"} |`);
  console.log(`| Tool | ${m.agentName || m.clientName || "—"} |`);
  console.log(`| Models | ${m.llmModels?.join(", ") || "—"} |`);
  console.log(`| Branches | ${m.gitBranches?.join(", ") || "—"} |`);
  console.log(`| Tags | ${m.tags?.join(", ") || "—"} |`);
  console.log(`| Created | ${formatDate(s.createdAt)} |`);
  console.log(`| Duration | ${formatDuration(s.startedAt, s.endedAt)} |`);
  if (m.summary) console.log(`| Summary | ${m.summary} |`);
  console.log();
}
