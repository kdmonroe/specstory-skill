# Output Templates

Two artifacts every week: (A) the chat/Telegram briefing, (B) the study-log
note. The note's checkbox lines are **parsed by automation** — reproduce them
exactly as shown (`- [ ] ` markers, heading names).

## A. Briefing (Telegram / chat)

Keep it scannable on a phone: short lines, no nested bullets deeper than one
level, bold sparingly. Total length ~40 lines max.

```
📚 CS Foundations — Week of <Mon DD>

🪞 Last Week
<One of:
 • "First week — no study log yet. Clean slate."
 • "You studied <N>/3 targets. <One-line acknowledgment of feedback boxes/notes,
    quoted briefly if free-text was left.> <How it shaped this week's picks.>">

🧭 Your Week in Code
- <language/stack> — <N> sessions, ~<hours>h (<repo names>)
- Patterns surfaced: <2–4 patterns>

🎯 Target 1 — <Concept> (sharpen a strength)
Where: <file/commit/session from this week>
Under the hood: <2-3 sentence explanation of the foundation beneath their code>
Senior depth: <the expectation bar, one sentence>
Study: <ONE artifact — chapter/doc/exercise, with link if real> (~<time>)

🎯 Target 2 — <Concept> (close a gap)
<same shape>

🎯 Target 3 — <Concept> (close a gap)
<same shape>

📝 Study log: <vault note URL, when a note was created>

Reply here with reactions or questions — "more like this", "too deep",
whatever. I fold it into next week.
```

Rules:
- Exactly 3 targets, labeled with their role from heuristics rule 3.
- Every "Where:" must name a real file/commit/session; no placeholders.
- "Week of <Mon DD>" = the Monday of the week the digest window *ends* in (the
  window itself is a rolling 7 days).
- Sessions/hours in 🧭 are **recomputed** from non-idle, deduped, non-empty
  sessions (SKILL.md step 1) — never the digest's raw `totals`.
- Only include links you are confident exist (official docs, well-known
  books/papers). Otherwise describe the artifact ("SQLite EXPLAIN QUERY PLAN
  docs") without a URL.
- Omit the `📝 Study log:` line when no note was created (e.g. interactive
  runs on platforms without a note location).
- The closing reply-ask is mandatory. The "🪞 Last Week" section is mandatory —
  first-week phrasing when no log exists; never invent history.

## B. Study-log note (weekly, Markdown)

Filename: `CS Foundations - YYYY-MM-DD.md` (the briefing date). Platform docs
(e.g. platform-hermes.md) say where it lives and how to write it.

```markdown
---
date: YYYY-MM-DD
week: YYYY-Www
tags:
  - cs-foundations
topics:
  - <concept-1-slug>
  - <concept-2-slug>
  - <concept-3-slug>
---

# CS Foundations — Week of <Mon DD, YYYY>

## Target 1: <Concept>
- [ ] Studied

**Role:** sharpen a strength
**Where it showed up:** <file/commit/session>
**Under the hood:** <the explanation from the briefing>
**Senior depth:** <the bar>
**Study artifact:** <the one artifact> (~<time>)

## Target 2: <Concept>
- [ ] Studied
<same fields, role: close a gap>

## Target 3: <Concept>
- [ ] Studied
<same fields, role: close a gap>

## Feedback
- [ ] Too easy
- [ ] Too hard
- [ ] More like this

Notes:
```

Parsing contract (automation reads next week's state from this file):
- Each `## Target N:` section's first list line is its completion checkbox —
  `- [x] Studied` means completed.
- The `## Feedback` section contains exactly the three checkboxes above plus a
  `Notes:` line; everything after `Notes:` to end-of-file is free-text feedback.
- Do not rename headings, reorder the checkboxes, or add other `- [ ]` lines
  inside these sections.
