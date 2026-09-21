---
name: verify-build
description: Verify this Foundry system builds and passes everything before a release — tests, mutants, packs, guides, e2e, version, release notes. Use when asked to verify the build, run the release checks, check the release is ready, bump the version, or draft release notes. Runs one script and reports its verdict; changes nothing on its own.
---

# Verify the build

Everything mechanical is in **one script**. Your job is to run it, read the verdict, and report it
faithfully — not to reimplement any of its checks or to work around a failure.

```bash
npm run preflight
```

Add flags as the task needs:

| Flag | What it adds | Cost |
|---|---|---|
| *(none)* | eslint, unit + source suites, mutants, TODO.md, packs, manifest, guides | ~5 min |
| `-- --fast` | skips mutants, guides and e2e | ~1 min |
| `-- --e2e` | the Playwright suite — **Foundry must be running** | ~10 min |
| `-- --version v0.6.0` | version, release:check, release notes, rules-check record, clean tree | seconds |

A full pre-release run:

```bash
npm run preflight -- --version v0.6.0 --e2e
```

## Rules

1. **Report what happened, exactly.** If a gate fails, say which one and paste the lines the script
   printed under it. Do not summarise a failure as a success, and do not describe a gate you skipped
   as passing. The script prints `PASS`/`FAIL` per gate and a count at the end — that is the answer.
2. **Never work around a failing gate.** Do not edit a test to make it pass, do not add a file just
   to satisfy a check, do not pass `--fast` to get past something slow that failed. Fix the cause or
   report it.
3. **Change nothing else.** The script writes nothing. `npm run version:bump` and
   `npm run release:notes -- --write` are the only writers here, and you run them only when asked.
4. **Never `git push`, and never `git tag`.** The maintainer publishes. This is absolute.
5. **Do not perform the TODO 121 rules check.** See below.

## The one gate you must not fake — TODO 121

`--version` checks that `audit/rules-check-<version>.md` **exists**. That record is supposed to mean
a person compared the code's rules against `guides/`, **with the PDFs in
`C:\Users\lance\Documents\Shadowrun 3rd Edition PDFs` as the authority**, quoted every difference
with its printed page, and took it to the maintainer rather than deciding it.

If that file is missing, **say so and stop**. Do not create it, and do not do a quick version of the
audit to unblock the gate. A record claiming a check that never happened is worse than a missing
one, because the next person trusts it. This is a reading task with a human in the loop; it is
explicitly out of scope for this skill.

## If e2e fails

- **"nothing answering on http://localhost:30000"** — Foundry is not running or the world is not
  loaded. Ask for it to be started; do not try to start it yourself.
- **Tests that die in milliseconds** — usually the clients had not joined yet, not a code fault.
  Re-run the failing spec alone before reporting it: `npx playwright test tests/e2e/<name>.spec.mjs`.
- **"already connected"** — a seat is held. The suite needs **Player2, Player3 and mcp-api**; a
  Browser-pane session often holds mcp-api. Report that rather than switching users.

## Bumping the version

Only when asked, and only after preflight is green:

```bash
npm run version:bump -- 0.6.0      # or: patch (a bug fix) / minor (a feature)
npm run release:notes -- 0.6.0 --write
```

Then re-run `npm run preflight -- --version v0.6.0 --e2e`, and **hand it back to the maintainer to
tag and push**. The generated release notes are a draft from commit subjects: say plainly that they
need rewriting for a GM rather than presenting them as finished.
