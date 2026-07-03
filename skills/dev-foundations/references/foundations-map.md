# Foundations Map — session signals → senior expectation → deep-dive angle

How to use: scan the week's digest (stacks, signals, tool activity, intents,
files touched) for the *session signals* below. Every area with real evidence
is a candidate; record the specific session/file that evidences it. The
*senior expectation* is the benchmark for the gap statement; the *deep-dive
angle* seeds the study target.

## 1. Data structures

- **Session signals:** hand-rolled dicts/maps for lookup or dedup; nested
  lists; sets for membership; building trees/graphs implicitly (file trees,
  dependency edges, DOM manipulation); queue-like task lists; LRU-ish caching.
- **Senior expectation:** chooses structures by access pattern and growth, not
  habit; can state why a hash map beats a sorted array here (and when it
  doesn't); knows the constants hiding behind O(1) (hashing, resizing, cache
  locality).
- **Deep-dive angle:** take one structure you used implicitly this week and
  study its internals — collision strategy, load factor, amortized resizing —
  then re-read your code and predict its behavior at 100× the data.

## 2. Algorithms & complexity

- **Session signals:** sorting + filtering pipelines; nested loops over
  collections; recursion; dedup passes; "it got slow" intents; topological or
  dependency ordering; diffing two lists; ranking/scoring results.
- **Senior expectation:** sizes the input before choosing the approach; spots
  accidental O(n²) in code review; can derive complexity of their own code
  without running it; knows when brute force is correct engineering.
- **Deep-dive angle:** complexity-annotate one real function you wrote this
  week, line by line; find the dominating term; design (not necessarily build)
  the next-tier approach.

## 3. Operating systems & processes

- **Session signals:** subprocess/spawn calls; shell pipelines; signals and
  timeouts; multiprocessing/threading; file descriptors; cron/daemons; Docker
  entrypoints; "the process hung" debugging; environment-variable plumbing.
- **Senior expectation:** models processes vs threads vs the event loop
  correctly; knows what a zombie process is and why `terminate()` differs from
  `kill()`; reasons about what happens to children when a parent dies; treats
  timeouts and process groups as first-class design.
- **Deep-dive angle:** trace one real subprocess call from this week through
  fork/exec, stdio inheritance, and exit-status collection; explain what would
  leak if it timed out.

## 4. Networking & protocols

- **Session signals:** HTTP clients, REST/GraphQL calls; retries and backoff;
  429/5xx handling; webhooks; websockets; auth headers/JWTs; DNS or TLS
  debugging; long-polling bots.
- **Senior expectation:** thinks in connections, not just requests — keep-alive,
  pooling, timeouts at each layer; designs idempotent retries; can read a TLS
  handshake failure; knows what the token in that Authorization header actually
  asserts and for how long.
- **Deep-dive angle:** take one API integration from this week and diagram its
  full request lifecycle (DNS → TCP/TLS → HTTP → app), marking every place it
  can fail and what your code does at each.

## 5. Databases & storage

- **Session signals:** SQL/ORM queries; SQLite files; migrations; JSON blobs on
  disk as a "database"; indexing or "query is slow" intents; FTS/search;
  GeoPackage/GDB work; cache files.
- **Senior expectation:** reads query plans; knows why the index wasn't used;
  reasons about transactions and isolation when two writers collide; chooses
  storage by consistency and access pattern, not familiarity.
- **Deep-dive angle:** EXPLAIN one real query you ran this week (or design the
  index for the lookup your JSON-on-disk code is faking) and study the
  underlying B-tree/LSM structure that makes it fast.

## 6. Distributed systems

- **Session signals:** cron jobs coordinating over shared state; multiple
  services/containers; queues; webhooks between systems; sync pipelines
  (vault sync, cross-repo copy); "it ran twice" or "they're out of sync" bugs;
  rate limits.
- **Senior expectation:** assumes partial failure; designs idempotency and
  at-least-once semantics deliberately; knows the difference between a retry
  and a duplicate; reaches for logical clocks/versions before timestamps.
- **Deep-dive angle:** pick one cross-system flow you built this week and
  answer: what happens if each hop fires twice, never, or late? Study the
  named concept (idempotency keys, outbox pattern, eventual consistency) that
  fixes the worst case.

## 7. Security

- **Session signals:** API keys/tokens in env vars; OAuth flows; secrets in
  config; input from users or webhooks; permissions/scopes; CORS; sandboxing;
  anything that writes user-supplied strings into shells, SQL, or HTML.
- **Senior expectation:** thinks in trust boundaries; least-privilege tokens by
  default; knows injection classes cold (shell, SQL, XSS) and spots them in
  their own glue code; rotates and scopes credentials.
- **Deep-dive angle:** threat-model one script from this week: list every
  input, every secret it can read, and what an attacker controlling each input
  could do; fix the one that scares you.

## 8. Testing & verification

- **Session signals:** test files touched (or conspicuously absent); "fix the
  flaky test" intents; manual verify loops in sessions; mocks; CI runs;
  assertion-free scripts that "worked when I ran it".
- **Senior expectation:** tests behavior at boundaries, not lines; knows what
  property-based, integration, and contract tests each buy; designs code so
  the important part is testable without the network.
- **Deep-dive angle:** take the least-tested thing you shipped this week and
  write the three tests that would have caught its most likely failure —
  study whichever seam (dependency injection, fakes, golden files) that forces.

## 9. Software design & architecture

- **Session signals:** refactors; "extract shared helper" intents; layering
  (CLI vs lib, backend selectors); plugin/skill packaging; config vs code
  decisions; state machines; event-driven flows; API/contract design.
- **Senior expectation:** optimizes for change: names the axis of variation
  and isolates it; keeps pure logic separate from I/O; writes contracts
  (schemas, interfaces) before implementations; can say what each abstraction
  costs.
- **Deep-dive angle:** diagram the dependency direction of one module you
  changed this week; find the import that points the wrong way; study the
  principle (dependency inversion, ports-and-adapters, cohesion metrics) that
  names the fix.

## 10. Language & runtime internals

- **Session signals:** async/await; event-loop debugging; generators;
  closures capturing loop variables; GC/memory issues; pickling errors;
  ESM/CJS module wrangling; type-system fights; performance profiling.
- **Senior expectation:** has a mechanical model of the runtime — knows what
  the event loop does with that await, why the closure captured the last
  value, what pickling actually serializes; reads the spec/source when the
  docs run out.
- **Deep-dive angle:** take one runtime surprise from this week's sessions and
  chase it to the mechanism: event-loop phases, scope chains, GIL, module
  resolution order — until you can predict the behavior of a variant before
  running it.
