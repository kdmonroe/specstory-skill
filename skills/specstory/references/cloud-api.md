# SpecStory Cloud GraphQL reference

Endpoint: `https://cloud.specstory.com/api/v1/graphql`
Auth: `Authorization: Bearer <token>` where `<token>` is either a permanent
`SPECSTORY_API_KEY` or a short-lived JWT from `~/.specstory/cli/auth.json`
(`.cloud_access.token`). Rate limit: ~500 queries/hour (auto-retry on HTTP 429).

This reference is loaded on demand by the skill. To regenerate the full schema:
`node scripts/introspect.mjs` (writes `scripts/lib/schema.json`).

## Operations used by this skill

### `searchSessions(query, filters, limit)`

Primary listing + search endpoint. Used by `sessions`, `search`, `digest`
(the plain `sessions(filters)` listing returns 0 for end-user tokens, so we
always go through search).

```graphql
query($query: String!, $filters: SessionFilters, $limit: Int) {
  searchSessions(query: $query, filters: $filters, limit: $limit) {
    total
    results {
      sessionId projectId name userTitle rank
      markdownContent            # only requested when a recap is needed
      createdAt updatedAt startedAt endedAt
      metadata {
        clientName clientVersion agentName
        llmModels gitBranches tags summary
      }
      matchingExchanges { content orderNumber }   # search excerpts
      project { id name }
    }
  }
}
```

### `session(projectId, sessionId)`

Direct fetch of one session including `markdownContent`. Used by
`session-detail` when both ids are known; falls back to `searchSessions`.

### `projects`

```graphql
{ projects { id name icon color sessionCount lastUpdated } }
```

May be empty for some tokens; `projects.mjs` falls back to discovering projects
from `searchSessions` results.

## `SessionFilters` input

| Field | Type | Notes |
|-------|------|-------|
| `clientName` | String | tool/client substring |
| `agentName` | String | agent substring |
| `llmModels` | [String] | model match |
| `gitBranches` | [String] | branch match |
| `tags` | [String] | tag match |
| `startDate` | String (ISO 8601) | **loose server-side** — also filtered client-side |
| `endDate` | String (ISO 8601) | same |

## Known API quirks (why the code looks the way it does)

1. `sessions(filters)` listing returns 0 for end-user tokens → use `searchSessions`.
2. `searchSessions` ignores stop-words ("the", "a") → seed with real words
   (`session`, `code`, `update`, `fix`) and merge by `sessionId`.
3. `startDate`/`endDate` filtering is loose server-side → re-filter client-side.
4. Each `searchSessions` query caps at ~100 results → broaden via several seeds.
5. An **expired JWT** surfaces as a GraphQL `Unexpected error` (not a clean HTTP
   401). If `--cloud` suddenly errors, re-run `specstory login` or set a
   permanent `SPECSTORY_API_KEY`.
