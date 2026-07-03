// Shared, backend-agnostic helpers: arg parsing, date/duration formatting, path utils.
// No I/O beyond os.homedir(). Node >=18 built-ins only.

import os from "node:os";
import path from "node:path";

export function parseArgs(argv, flags = {}) {
  const args = argv.slice(2);
  const result = { _positional: [] };

  for (const [key, def] of Object.entries(flags)) {
    result[key] = def;
  }

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "-h" || a === "--help") {
      result._help = true;
      continue;
    }
    if (a.startsWith("--")) {
      const key = a.slice(2);
      if (key in flags) {
        if (typeof flags[key] === "boolean") {
          result[key] = true;
        } else if (typeof flags[key] === "number") {
          result[key] = Number(args[++i]);
        } else {
          result[key] = args[++i];
        }
      } else {
        console.error(`Unknown flag: ${a}`);
        process.exit(2);
      }
    } else {
      result._positional.push(a);
    }
  }

  return result;
}

export function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d)) return "—";
  return d.toISOString().slice(0, 16).replace("T", " ");
}

export function formatDuration(startedAt, endedAt) {
  if (!startedAt || !endedAt) return "—";
  const ms = new Date(endedAt) - new Date(startedAt);
  if (isNaN(ms) || ms < 0) return "—";
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h${m}m` : `${h}h`;
}

// Sessions left open and idle in a terminal agent inflate endedAt far past the
// last real activity. Flag spans longer than this so digests/recaps can warn.
export const IDLE_SESSION_HOURS = 12;

export function isLikelyIdle(startedAt, endedAt) {
  if (!startedAt || !endedAt) return false;
  const hrs = (new Date(endedAt) - new Date(startedAt)) / 3_600_000;
  return hrs > IDLE_SESSION_HOURS;
}

export function expandHome(p) {
  if (!p) return p;
  if (p === "~") return os.homedir();
  if (p.startsWith("~/")) return path.join(os.homedir(), p.slice(2));
  return p;
}
