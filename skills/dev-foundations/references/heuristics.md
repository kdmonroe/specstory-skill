# Selection Heuristics — how to pick the 3 study targets

Apply in order. When rules conflict, the earlier rule wins.

1. **Evidence or it doesn't count.** Every target must cite a specific
   session, file, or commit from *this week's* data. If you can't name where
   the concept appeared, it's not a candidate — no aspirational topics.

2. **Idle sessions: discount duration, keep content.** `likelyIdle` flags
   wall-clock time, not substance — a 26-hour "session" with 100 edits is real
   work with a broken clock. Treat its duration as zero when weighing hours,
   but its files, activity, and intent remain valid evidence for rule 1.
   Zero-minute stubs with null recaps are noise; drop them entirely.

3. **Exactly 3, shaped 1+2.** One **sharpen-a-strength** (the area with the
   *most* evidence this week — take them deeper where momentum already is) and
   two **close-a-gap** (areas where the week's code shows a junior/senior
   delta per the foundations map).

4. **No repeats within 3 weeks.** Check the last 3 study logs (or the memory
   lines). A topic covered in that window is off the table — pick the
   next-best candidate. Exception: a target the user *started but didn't
   finish* may be re-offered **once**, explicitly framed as a continuation
   with a smaller scope.

5. **Feedback adjusts depth, not direction.** "Too hard" → same concept
   family, more concrete angle (trace your own code rather than read theory).
   "Too easy" → same family, more fundamental angle (internals, proofs,
   design trade-offs). "More like this" → weight that concept family up in
   rule 3's ranking for 2 weeks.

6. **One concrete artifact per target.** Each target names exactly one study
   artifact — a specific chapter, paper, official doc section, or a ≤2h
   exercise against the user's own code ("EXPLAIN your actual query",
   "complexity-annotate your actual function"). An exercise may embed one
   primary-source pointer ("trace X, with the asyncio docs open") and still
   count as one artifact. Never bare "read about X". Prefer primary sources
   and exercises over videos.

7. **Senior benchmark stated, sourced honestly.** Each target's "senior
   depth" line comes from the foundations map's expectation, phrased as an
   interview-grade bar ("a senior candidate would be expected to…"). These
   are curated from public leveling rubrics and engineering blogs — don't
   attribute them to any specific company.

8. **Size for one week.** The three targets together should fit in 2–4 hours
   of study. If a target can't be honestly scoped that small, narrow the
   angle until it can.
