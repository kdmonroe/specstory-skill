const API_URL = "https://cloud.specstory.com/api/v1/graphql";

export async function gql(query, variables = {}) {
  const apiKey = (process.env.SPECSTORY_API_KEY ?? "").trim();
  if (!apiKey) {
    console.error("Missing SPECSTORY_API_KEY");
    process.exit(1);
  }

  const resp = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
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
    throw new Error(
      `GraphQL errors: ${data.errors.map((e) => e.message).join(", ")}`,
    );
  }

  return data.data;
}

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
  return d.toISOString().slice(0, 16).replace("T", " ");
}

export function formatDuration(startedAt, endedAt) {
  if (!startedAt || !endedAt) return "—";
  const ms = new Date(endedAt) - new Date(startedAt);
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h${m}m` : `${h}h`;
}
