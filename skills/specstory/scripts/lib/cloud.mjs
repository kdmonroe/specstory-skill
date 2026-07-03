// Cloud backend: SpecStory Cloud GraphQL API.
// Auth resolution order: SPECSTORY_API_KEY env > short-lived JWT from the
// SpecStory CLI auth file (~/.specstory/cli/auth.json). The GraphQL endpoint
// accepts the JWT as a Bearer token interchangeably with permanent API keys,
// so `specstory login` users get keyless cloud access for ~30 min at a time.

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const API_URL = "https://cloud.specstory.com/api/v1/graphql";

export function resolveToken() {
  const fromEnv = (process.env.SPECSTORY_API_KEY ?? "").trim();
  if (fromEnv) return fromEnv;
  try {
    const p = path.join(os.homedir(), ".specstory", "cli", "auth.json");
    const j = JSON.parse(fs.readFileSync(p, "utf8"));
    const tok = j?.cloud_access?.token || j?.token || "";
    return String(tok).trim();
  } catch {
    return "";
  }
}

export function hasCloudAuth() {
  return resolveToken().length > 0;
}

export async function gql(query, variables = {}) {
  const token = resolveToken();
  if (!token) {
    console.error(
      "No SpecStory cloud auth. Set SPECSTORY_API_KEY " +
        "(https://cloud.specstory.com/settings/api-keys) or run `specstory login`.",
    );
    process.exit(1);
  }

  const resp = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (resp.status === 429) {
    const retryAfter = Number(resp.headers.get("Retry-After") || "5");
    console.error(`Rate limited. Retrying in ${retryAfter}s...`);
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return gql(query, variables);
  }

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`SpecStory API error (${resp.status}): ${text}`);
  }

  const data = await resp.json();
  if (data.errors?.length) {
    throw new Error(`GraphQL errors: ${data.errors.map((e) => e.message).join(", ")}`);
  }
  return data.data;
}

// --- High-level: return sessions in the normalized shape (see local.mjs) ---
//
// API quirks this works around:
//   1. `sessions(filters)` returns 0 for end-user tokens — use searchSessions.
//   2. searchSessions ignores stop-words — seed with real words.
//   3. The startDate/endDate filter is loose server-side — filter client-side too.
//   4. searchSessions caps each query at ~100 — broaden with a few seed words.
const SEED_QUERIES = ["session", "code", "update", "fix"];

export async function cloudListSessions({ filters = {}, limit = 50, withContent = false } = {}) {
  const contentField = withContent ? "markdownContent" : "";
  const seen = new Map();
  for (const q of SEED_QUERIES) {
    const data = await gql(
      `query($query: String!, $filters: SessionFilters, $limit: Int) {
        searchSessions(query: $query, filters: $filters, limit: $limit) {
          results {
            sessionId projectId name userTitle ${contentField}
            createdAt updatedAt startedAt endedAt
            metadata { clientName clientVersion agentName llmModels gitBranches tags summary }
            project { id name }
          }
        }
      }`,
      { query: q, filters, limit },
    );
    for (const r of data.searchSessions.results) {
      if (!seen.has(r.sessionId)) seen.set(r.sessionId, normalize(r));
    }
  }
  return [...seen.values()];
}

export async function cloudSearch({ query, filters = {}, limit = 10 }) {
  const data = await gql(
    `query($query: String!, $filters: SessionFilters, $limit: Int) {
      searchSessions(query: $query, filters: $filters, limit: $limit) {
        total
        results {
          sessionId projectId name rank createdAt
          metadata { clientName agentName llmModels gitBranches summary }
          matchingExchanges { content orderNumber }
          project { id name }
        }
      }
    }`,
    { query, filters, limit },
  );
  return {
    total: data.searchSessions.total,
    results: data.searchSessions.results.map((r) => ({
      ...normalize(r),
      rank: r.rank,
      matchingExchanges: r.matchingExchanges || [],
    })),
  };
}

function normalize(r) {
  return {
    source: "cloud",
    sessionId: r.sessionId,
    projectId: r.projectId,
    projectName: r.project?.name ?? null,
    name: r.name,
    userTitle: r.userTitle ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    startedAt: r.startedAt,
    endedAt: r.endedAt,
    markdownContent: r.markdownContent ?? null,
    filePath: null,
    metadata: {
      clientName: r.metadata?.clientName ?? null,
      agentName: r.metadata?.agentName ?? null,
      llmModels: r.metadata?.llmModels ?? [],
      gitBranches: r.metadata?.gitBranches ?? [],
      tags: r.metadata?.tags ?? [],
      summary: r.metadata?.summary ?? null,
    },
  };
}
