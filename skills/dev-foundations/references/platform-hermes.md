# Platform: Hermes (Railway deployment)

Hermes-specific mechanics for the weekly `📚 CS Foundations Weekly` cron. On
other platforms, ignore this file.

## Context injection

The cron injects SCRIPT OUTPUT from `scripts/fetch-dev-context.py`
(hermes-deploy repo). It contains, in order, separated by `---`:

1. **GitHub Dev Activity** — commits/events, last 7 days.
2. **SpecStory Session Recap** — `digest.mjs --week --json --cloud` rendered
   per repo with recaps (intent, stack, tools, files).
3. **`[Last Week's Study Log]`** — completion checkboxes + feedback parsed from
   the previous vault note, or `(No previous study log found — first week)`.
4. **Sessions Calendar** — pomodoro/focus blocks for the week.

Treat this blob as the sole data source (SKILL.md step 1). Any section may be
degraded to an `( … unavailable: reason)` line — work with what's present.

## Study-log vault note

The vault is the GitHub repo `kdmonroe/general-icloud`. Weekly note path:

```
icloud_git/02 - Areas/👨🏽‍💻 Professional Development/📚 CS Foundations/CS Foundations - YYYY-MM-DD.md
```

(`YYYY-MM-DD` = today's date, America/New_York.) Create it via the GitHub
Contents API with the `HERMES_GH_PAT` token (fall back to reading it from
`/data/.hermes/.env`). Path segments contain spaces and emoji, so
**percent-encode each segment** — unencoded URLs fail in `urllib`.

Write the note with a `python3` heredoc (content per output-template.md §B):

```python
import base64, json, os, urllib.parse, urllib.request

token = os.environ.get("HERMES_GH_PAT", "")
if not token:
    with open("/data/.hermes/.env") as f:
        for line in f:
            if line.startswith("HERMES_GH_PAT="):
                token = line.split("=", 1)[1].strip()

path = "icloud_git/02 - Areas/👨🏽‍💻 Professional Development/📚 CS Foundations/CS Foundations - 2026-07-05.md"
encoded = "/".join(urllib.parse.quote(seg) for seg in path.split("/"))
url = f"https://api.github.com/repos/kdmonroe/general-icloud/contents/{encoded}"

content = """<the full note markdown>"""

payload = json.dumps({
    "message": "chore: CS Foundations study log 2026-07-05",
    "content": base64.b64encode(content.encode()).decode(),
}).encode()
req = urllib.request.Request(url, data=payload, method="PUT", headers={
    "Authorization": f"token {token}",
    "Accept": "application/vnd.github.v3+json",
    "Content-Type": "application/json",
})
print(json.loads(urllib.request.urlopen(req, timeout=15).read())["content"]["html_url"])
```

Include the printed `html_url` in the briefing's `📝 Study log:` line. If the
PUT fails (409 exists / auth / network), say so in one line and deliver the
briefing anyway — the note is supplementary, never fatal.

## Memory line

After delivering, save exactly one memory line so repeat-avoidance works even
if vault reads fail:

```
cs-foundations: <YYYY-MM-DD> — topics: <slug1>, <slug2>, <slug3>; completed <N>/3 last week; feedback: <one phrase or "none">
```

## Feedback loop

The user replies on Telegram conversationally — no action needed at cron time
beyond the mandatory closing reply-ask. Checkbox edits in the vault note are
picked up automatically by next week's fetch script.
