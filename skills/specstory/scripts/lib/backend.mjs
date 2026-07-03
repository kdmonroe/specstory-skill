// Backend dispatcher: choose local (.specstory/history) or cloud (GraphQL) and
// return sessions in one normalized shape. Local-first by default.
//
// Selection:
//   --cloud            force cloud
//   --local            force local
//   (neither / auto)   local if history is discoverable, else cloud if auth exists
//
// Common flags expected on the parsed args object:
//   cloud (bool), local (bool), root (str), since (str), until (str), limit (num)

import { listLocalSessions, localHistoryAvailable } from "./local.mjs";
import { cloudListSessions, hasCloudAuth } from "./cloud.mjs";

export function chooseBackend(flags) {
  if (flags.cloud) return "cloud";
  if (flags.local) return "local";
  if (localHistoryAvailable({ root: flags.root || "", cwd: process.cwd() })) return "local";
  if (hasCloudAuth()) return "cloud";
  return "none";
}

// Returns { backend, sessions } where sessions are normalized + window-filtered + sorted.
export async function getSessions(flags, { withContent = false } = {}) {
  const backend = chooseBackend(flags);

  if (backend === "none") {
    console.error(
      "No data source available.\n" +
        "  • Local: no .specstory/history found (run inside a project that uses the " +
        "SpecStory CLI, or pass --root <dir>).\n" +
        "  • Cloud: no SPECSTORY_API_KEY and no `specstory login` session. Pass --cloud after setting one up.",
    );
    process.exit(1);
  }

  let sessions;
  if (backend === "local") {
    sessions = listLocalSessions({
      root: flags.root || "",
      cwd: process.cwd(),
      withContent,
    });
  } else {
    const filters = {};
    if (flags.since) filters.startDate = flags.since;
    if (flags.until) filters.endDate = flags.until;
    sessions = await cloudListSessions({
      filters,
      limit: flags.limit || 50,
      withContent,
    });
  }

  sessions = applyWindow(sessions, flags);
  sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (flags.limit && flags.limit > 0) sessions = sessions.slice(0, flags.limit);
  return { backend, sessions };
}

function applyWindow(sessions, flags) {
  const start = flags.since ? new Date(flags.since) : null;
  const end = flags.until ? new Date(flags.until) : null;
  return sessions.filter((s) => {
    const ts = new Date(s.createdAt);
    if (isNaN(ts)) return true;
    if (start && ts < start) return false;
    if (end && ts > end) return false;
    return true;
  });
}

// Standard backend-selection flags to merge into a command's parseArgs defaults.
export const BACKEND_FLAGS = {
  cloud: false,
  local: false,
  root: "",
  since: "",
  until: "",
};
