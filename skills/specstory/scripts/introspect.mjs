#!/usr/bin/env node
// introspect.mjs — dump the SpecStory Cloud GraphQL schema to lib/schema.json
// and print the interesting types. Cloud-only (requires auth). Use this when the
// API evolves to confirm field names before editing queries in lib/cloud.mjs.

import { gql } from "./lib/cloud.mjs";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(__dirname, "lib", "schema.json");

const data = await gql(`{
  __schema {
    queryType { name }
    types {
      name kind description
      fields {
        name description
        args { name type { name kind ofType { name kind } } }
        type { name kind ofType { name kind ofType { name kind ofType { name kind } } } }
      }
      inputFields { name type { name kind ofType { name kind ofType { name kind } } } }
    }
  }
}`);

writeFileSync(OUTPUT, JSON.stringify(data.__schema, null, 2));

const interesting = new Set([
  "Query", "Session", "SessionDetail", "SessionConnection", "SessionEdge",
  "PageInfo", "SessionMetadata", "SearchResult", "SearchSessionsResult",
  "SearchResultItem", "Project", "Exchange", "MatchingExchange", "SessionFilters",
]);

console.log(`Schema saved to ${OUTPUT}\n`);
console.log("=== Interesting types ===\n");

for (const t of data.__schema.types) {
  if (!interesting.has(t.name)) continue;
  console.log(`## ${t.name} (${t.kind})`);
  if (t.description) console.log(`   ${t.description}`);
  const fields = t.fields || t.inputFields || [];
  for (const f of fields) {
    const args = f.args?.length
      ? `(${f.args.map((a) => `${a.name}: ${renderType(a.type)}`).join(", ")})`
      : "";
    console.log(`  - ${f.name}${args}: ${renderType(f.type)}`);
    if (f.description) console.log(`      // ${f.description}`);
  }
  console.log();
}

function renderType(t) {
  if (!t) return "?";
  if (t.kind === "NON_NULL") return `${renderType(t.ofType)}!`;
  if (t.kind === "LIST") return `[${renderType(t.ofType)}]`;
  return t.name || t.kind;
}
