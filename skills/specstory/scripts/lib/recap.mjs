// Pure function: parse a SpecStory session's markdownContent into a structured recap.
// No I/O. Every field optional. Never throws.

const STACK_MARKERS = [
  { match: /\b(package\.json|tsconfig\.json|node_modules)\b/i, signal: "node" },
  { match: /\b(pyproject\.toml|requirements\.txt|setup\.py|Pipfile|uv\.lock)\b/i, signal: "python" },
  { match: /\b(Cargo\.toml|Cargo\.lock)\b/i, signal: "rust" },
  { match: /\bgo\.mod\b/, signal: "go" },
  { match: /\b(Gemfile|\.gemspec)\b/i, signal: "ruby" },
  { match: /\bcomposer\.json\b/, signal: "php" },
  { match: /\b(Dockerfile|docker-compose\.ya?ml)\b/i, signal: "docker" },
  { match: /\brailway\.(json|toml)\b/i, signal: "railway" },
  { match: /\b(\.github\/workflows|\.gitlab-ci)\b/i, signal: "ci" },
  { match: /\bterraform\b|\.tf\b/i, signal: "terraform" },
  { match: /\bnext\.config\.[jt]s\b/i, signal: "nextjs" },
  { match: /\bvite\.config\.[jt]s\b/i, signal: "vite" },
  { match: /\b(arcpy|\.aprx|\.gdb)\b/i, signal: "arcpy" },
];

const EXT_TO_LANG = {
  py: "python", pyi: "python", ipynb: "python",
  js: "javascript", mjs: "javascript", cjs: "javascript", jsx: "javascript",
  ts: "typescript", tsx: "typescript",
  rs: "rust", go: "go", java: "java", kt: "kotlin", swift: "swift",
  rb: "ruby", php: "php", cs: "csharp", cpp: "cpp", c: "c", h: "c",
  sh: "shell", bash: "shell", zsh: "shell", fish: "shell",
  yml: "yaml", yaml: "yaml", toml: "toml", json: "json",
  md: "markdown", html: "html", css: "css", scss: "scss",
  sql: "sql", graphql: "graphql", proto: "proto",
  dockerfile: "dockerfile",
};

const TRIVIAL_BASH = /^(ls|cd|pwd|cat|head|tail|echo|which|env|true|false|clear)\b/;

export function recapFromMarkdown(md, metadata = {}) {
  const recap = {
    repo: extractRepo(md, metadata),
    stack: extractStack(md),
    activity: extractActivity(md),
    intent: extractIntent(md),
    outcome: extractOutcome(md),
    summary: metadata.summary || null,
  };
  return recap;
}

function extractRepo(md, metadata) {
  const repo = {
    workingDir: null,
    name: null,
    owner: null,
    branch: null,
    remotes: [],
    recentCommits: [],
  };

  // 1. Branch from metadata first (authoritative), fall back to stdout patterns.
  if (Array.isArray(metadata.gitBranches) && metadata.gitBranches.length) {
    repo.branch = metadata.gitBranches[0];
  } else {
    const m = md.match(/(?:^|\n)(?:Current branch|On branch):?\s+(\S+)/i)
      || md.match(/\n\*\s+([a-zA-Z0-9_./-]+)\n/);
    if (m) repo.branch = m[1];
  }

  // 2. Working dir: most common path prefix in file_path arguments.
  // Prefer real laptop paths (/Users/, /home/) over container/tmp paths.
  const pathHits = [
    ...md.matchAll(/`((?:\/[^`\s]+)+)`/g),
  ].map((m) => m[1]).filter((p) => p.startsWith("/") && !p.includes("://"));
  if (pathHits.length) {
    repo.workingDir = mostCommonPrefix(pathHits);
  }

  // 3. Owner/repo from github URLs (pair stays together — never mix with workingDir basename).
  const remoteMatches = [
    ...md.matchAll(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?(?=[)\s"'`/]|$)/g),
  ];
  const counts = new Map();
  for (const m of remoteMatches) {
    const key = `${m[1]}/${m[2]}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  // Default name to workingDir basename — most reliable signal of what's being worked on.
  const wdBase = repo.workingDir?.split("/").filter(Boolean).pop();
  if (wdBase) repo.name = wdBase;

  if (counts.size) {
    // A github URL "wins" as the canonical repo only if its name matches workingDir
    // basename (signals it's the actual working repo, not a researched/cited URL).
    const matched = wdBase
      ? [...counts.entries()].filter(([k]) => k.endsWith(`/${wdBase}`))
      : [];
    if (matched.length) {
      const [topKey, count] = matched.sort((a, b) => b[1] - a[1])[0];
      const [owner, name] = topKey.split("/");
      repo.owner = owner;
      repo.name = name;
    }
    // All github URLs (including cited ones) go in remotes for informational context.
    repo.remotes = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k]) => k);
  }

  // 4. Recent commits from `git log` output (best-effort).
  const commitLines = [
    ...md.matchAll(/\n([a-f0-9]{7,12})\s+([^\n]+)/g),
  ].slice(0, 5).map((m) => `${m[1]} ${m[2]}`.slice(0, 100));
  if (commitLines.length) repo.recentCommits = commitLines;

  // Strip empty fields.
  for (const k of Object.keys(repo)) {
    if (repo[k] === null || (Array.isArray(repo[k]) && repo[k].length === 0)) {
      delete repo[k];
    }
  }
  return Object.keys(repo).length ? repo : null;
}

function extractStack(md) {
  const langs = new Map();
  const signals = new Set();

  // Languages from file extensions in `paths`.
  for (const m of md.matchAll(/`[^`]*\.([a-zA-Z]{1,8})`/g)) {
    const ext = m[1].toLowerCase();
    const lang = EXT_TO_LANG[ext];
    if (lang) langs.set(lang, (langs.get(lang) || 0) + 1);
  }
  // Dockerfile / Makefile (no extension) — name match.
  for (const m of md.matchAll(/`[^`]*\/(Dockerfile|Makefile)\b/g)) {
    const lang = m[1].toLowerCase();
    langs.set(lang, (langs.get(lang) || 0) + 1);
  }

  // Stack markers (file presence, framework signals).
  for (const { match, signal } of STACK_MARKERS) {
    if (match.test(md)) signals.add(signal);
  }

  const out = {};
  if (langs.size) {
    out.languages = [...langs.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([l]) => l);
  }
  if (signals.size) out.signals = [...signals];
  return Object.keys(out).length ? out : null;
}

function extractActivity(md) {
  // Tool counts. Anchor to the actual tool-use tag so we don't pick up regex
  // patterns or example code that contains the data-tool-name=… string.
  const toolCounts = {};
  for (const m of md.matchAll(/<tool-use\s+data-tool-type="[^"]*"\s+data-tool-name="([^"]+)"/g)) {
    const name = m[1];
    toolCounts[name] = (toolCounts[name] || 0) + 1;
  }

  // Files touched: paths from Read/Write/Edit blocks + "The file X has been" success messages.
  const files = new Set();
  // Pattern A: ` `/path/to/file.ext`  ` after Read/Write summary lines.
  for (const m of md.matchAll(
    /<summary>Tool use: \*\*(?:Read|Write|Edit|Glob)\*\*<\/summary>\s*\n?\s*`([^`\n]+)`/g,
  )) {
    if (m[1].includes("/") || m[1].includes(".")) files.add(m[1]);
  }
  // Pattern B: Edit/Write success message in result body.
  for (const m of md.matchAll(
    /The file (\S+?) has been (?:updated|created|written|saved)/g,
  )) {
    files.add(m[1]);
  }

  // Top bash commands (skip trivial).
  const bashCmds = [];
  for (const m of md.matchAll(
    /<summary>Tool use: \*\*Bash\*\*<\/summary>\s*\n\s*`([^`\n]+)`/g,
  )) {
    const cmd = m[1].trim();
    if (cmd && !TRIVIAL_BASH.test(cmd)) bashCmds.push(cmd);
  }
  // Dedupe while preserving order, then keep top 10.
  const seen = new Set();
  const topCommands = [];
  for (const c of bashCmds) {
    const key = c.slice(0, 80);
    if (!seen.has(key)) {
      seen.add(key);
      topCommands.push(c.length > 200 ? c.slice(0, 200) + "…" : c);
    }
    if (topCommands.length >= 10) break;
  }

  const out = {};
  if (Object.keys(toolCounts).length) out.toolCounts = toolCounts;
  if (files.size) out.filesTouched = [...files].slice(0, 30);
  if (topCommands.length) out.topCommands = topCommands;
  return Object.keys(out).length ? out : null;
}

function extractIntent(md) {
  // First _**User (...)**_ block.
  const m = md.match(/_\*\*User \([^)]+\)\*\*_\s*\n+([\s\S]*?)\n---/);
  if (!m) return null;
  return cleanText(m[1]).slice(0, 500) || null;
}

function extractOutcome(md) {
  // Last User block + last Agent text block (excluding tool-use).
  const userBlocks = [...md.matchAll(/_\*\*User \([^)]+\)\*\*_\s*\n+([\s\S]*?)(?=\n---|\n_\*\*(?:User|Agent))/g)];
  const lastUser = userBlocks.length ? cleanText(userBlocks[userBlocks.length - 1][1]).slice(0, 300) : null;

  // Last agent block that isn't just a tool-use wrapper.
  const agentBlocks = [...md.matchAll(/_\*\*Agent \([^)]+\)\*\*_\s*\n+([\s\S]*?)(?=\n---|\n_\*\*(?:User|Agent))/g)];
  let lastAgent = null;
  for (let i = agentBlocks.length - 1; i >= 0; i--) {
    const text = cleanText(agentBlocks[i][1]);
    if (text && text.length > 30) { lastAgent = text.slice(0, 400); break; }
  }

  if (!lastUser && !lastAgent) return null;
  return { lastUser, lastAgent };
}

function cleanText(s) {
  return s
    .replace(/<tool-use[\s\S]*?<\/tool-use>/g, "")
    .replace(/<details>[\s\S]*?<\/details>/g, "")
    .replace(/<summary>[\s\S]*?<\/summary>/g, "")
    .replace(/<command-name>[\s\S]*?<\/command-name>/g, "")
    .replace(/<command-message>[\s\S]*?<\/command-message>/g, "")
    .replace(/<command-args>[\s\S]*?<\/command-args>/g, "")
    .replace(/<local-command-stdout>[\s\S]*?<\/local-command-stdout>/g, "")
    .replace(/<local-command-caveat>[\s\S]*?<\/local-command-caveat>/g, "")
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, "")
    .replace(/_\*\*(?:Agent|User) \([^)]+\)\*\*_/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function mostCommonPrefix(paths) {
  // Find the deepest directory prefix that contains a meaningful share of paths.
  // Container/tmp paths (/data, /tmp, /var, /opt, /private/tmp) are deprioritized:
  // a laptop CWD under /Users/ or /home/ is almost always the "real" working dir,
  // even when the session also touches /data/.hermes/ via railway ssh.
  const isReal = (p) => /^\/(Users|home)\//.test(p);
  const realPaths = paths.filter(isReal);
  const pool = realPaths.length >= 3 ? realPaths : paths;

  const prefixCounts = new Map();
  for (const p of pool) {
    const parts = p.split("/").filter(Boolean);
    let acc = "";
    for (const part of parts.slice(0, -1)) {
      acc += "/" + part;
      prefixCounts.set(acc, (prefixCounts.get(acc) || 0) + 1);
    }
  }
  if (!prefixCounts.size) return null;
  const threshold = Math.max(2, Math.floor(pool.length * 0.3));
  const candidates = [...prefixCounts.entries()]
    .filter(([_, c]) => c >= threshold)
    .sort((a, b) => b[0].length - a[0].length || b[1] - a[1]);
  return candidates.length ? candidates[0][0] : null;
}

// Render a recap as compact markdown for human/Sonnet consumption.
export function renderRecapMarkdown(recap) {
  const lines = [];
  if (recap.repo) {
    const r = recap.repo;
    const repoLabel = r.owner && r.name ? `${r.owner}/${r.name}` : r.name || "—";
    lines.push(`**Repo:** ${repoLabel}${r.branch ? ` @ ${r.branch}` : ""}`);
    if (r.workingDir) lines.push(`  Working dir: \`${r.workingDir}\``);
    if (r.recentCommits?.length) {
      lines.push(`  Recent commits:`);
      for (const c of r.recentCommits) lines.push(`    - ${c}`);
    }
  }
  if (recap.stack) {
    const parts = [];
    if (recap.stack.languages) parts.push(`languages: ${recap.stack.languages.join(", ")}`);
    if (recap.stack.signals) parts.push(`signals: ${recap.stack.signals.join(", ")}`);
    lines.push(`**Stack:** ${parts.join(" | ")}`);
  }
  if (recap.activity) {
    const a = recap.activity;
    if (a.toolCounts) {
      const tc = Object.entries(a.toolCounts)
        .sort((x, y) => y[1] - x[1])
        .map(([t, c]) => `${t}:${c}`)
        .join(" ");
      lines.push(`**Tools:** ${tc}`);
    }
    if (a.filesTouched?.length) {
      lines.push(`**Files (${a.filesTouched.length}):** ${a.filesTouched.slice(0, 8).join(", ")}${a.filesTouched.length > 8 ? ", …" : ""}`);
    }
    if (a.topCommands?.length) {
      lines.push(`**Bash (${a.topCommands.length}):**`);
      for (const c of a.topCommands.slice(0, 5)) lines.push(`  - \`${c}\``);
    }
  }
  if (recap.intent) lines.push(`**Intent:** ${recap.intent}`);
  if (recap.outcome) {
    if (recap.outcome.lastUser) lines.push(`**Last user msg:** ${recap.outcome.lastUser}`);
    if (recap.outcome.lastAgent) lines.push(`**Last agent reply:** ${recap.outcome.lastAgent}`);
  }
  return lines.join("\n");
}
