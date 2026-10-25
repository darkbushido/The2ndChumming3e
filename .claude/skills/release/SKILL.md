---
name: release
description: Start (or resume) the release train for this system — take stock of main, settle the version with the maintainer, run the full preflight, get the TODO 121 rules check done properly, draft GM-facing release notes, bump the version, and hand back the tag and push. Use when the maintainer says "/release", "start the release", "cut 0.8.0", "get the release train going" or "where is the release at". Takes an optional argument — a version (0.8.0), "patch" or "minor".
---

# Release train

You run the release **from start to hand-back**, stopping for the maintainer at the decisions that are theirs. Each step
below is resumable: start every session with **step 0** and pick up at the first step that is not done. Read `CLAUDE.md`
(*Versions and branches*, *Verifying a build*, *Releases*) and `TESTING.md` first.

The mechanics are **not** re-implemented here — they live in two skills you load and follow:
- **`verify-build`** — `npm run preflight`, the version bump, the release-notes draft.
- **`rules-check`** — the TODO 121 ledger and record.

## Hard rules (they override anything below)

1. **Never `git push` and never `git tag`.** The maintainer publishes. You end by handing them the exact commands.
2. **Do not perform the TODO 121 rules check as a shortcut, and never write `audit/rules-check-<version>.md` yourself.**
   Only `tools/rules-ledger.mjs report` writes it, from a ledger in which every unit was checked against the PDFs
   (`C:\Users\lance\Documents\Github\Shadowrun 3rd Edition PDFs` — the authority, not `guides/` and not the code). A missing
   record means **say so and stop at step 3** — a record claiming a check that never happened is worse than none.
3. **Never work around a failing gate.** No editing a test to pass, no `--fast` past a failure, no file added to satisfy a
   check. Fix the cause (as its own `Fix:` commit, with a test) or report it.
4. **Only step 5 bumps the version.** Nothing else touches `system.json`'s `version`.
5. **Main is shared.** Other sessions stage work there: commit by path (`git commit -- <paths>`), never `git add -A`,
   and never revert or stash a change you did not make — ask.
6. **The maintainer decides:** which branches ship, patch vs minor (1.0.0 is theirs alone), every rules divergence,
   and when to tag. Ask with `AskUserQuestion`, quoting book and printed page for any rules question.

## 0 — Take stock (every session starts here)

Report, briefly:
- `git status --short` on main (whose changes are they? leave others' alone), `git log --oneline <last tag>..main | wc -l`,
  the last tag (`git tag --sort=-v:refname | head -1`) and `system.json`'s `version`.
- Unmerged branches: `git branch --no-merged main` and `git worktree list`. For each, one line: what it is (its TODO),
  whether its live checks were walked. **Ask which ones ship in this release**; merge only those the maintainer names
  (resolve packs through `packs-src` + `npm run packs:build`, never by picking LevelDB files; `npm run manifest:check` after).
- Open items in `TODO.md` that say "Test in Foundry" / "not yet walked" for work already on main — they are release risks.
- Whether `audit/rules-ledger-<version>.json` / `audit/rules-check-<version>.md` exist yet, and the ledger's
  `node tools/rules-ledger.mjs status <version>` if it does.
- Which of steps 1–6 are already done (version bumped? notes written? record present?).

## 1 — Settle the version

From the commits since the last tag: any `Feature:` → **minor**; only `Fix:` → **patch** (CLAUDE.md). If an argument
was given, use it but say if it disagrees with that rule. **Confirm with the maintainer.**
Then check the migrations: `MIGRATIONS` entries in `scripts/SR3EMigrations.js` are numbered by the release they ship in.
If any are numbered for a different version than the one chosen (e.g. `0.7.1` entries in a `0.8.0` release), raise it —
renumbering is their call. `tests/migrations.test.mjs` failing "X is not newer than system.json's Y" is expected
until step 5.

## 2 — Full preflight

Load **`verify-build`** and run `npm run preflight -- --e2e` (Foundry must be running with `test-shadowrun`; Player2,
Player3 and mcp-api must be free — log your Browser pane out first). Report the per-gate verdict exactly. The only
acceptable failure before the bump is the migrations-version one from step 1. Anything else: fix (own commit + test) or
take to the maintainer, then re-run.

## 3 — The TODO 121 rules check

If `audit/rules-check-<version>.md` exists and the maintainer has read it, this step is done. Otherwise load
**`rules-check`** and follow it exactly: `init`, one page at a time, every unit against the PDF, `check` after each page,
commit the ledger as you go. It is long and resumable — say how far it got when a session ends. Every `diverges`,
`guide-differs`, `not-implemented` and `unverifiable` goes to the maintainer; a verified code divergence is fixed before
release (CLAUDE.md), in its own commit, and the ledger re-run. **Do not commit the record until the maintainer has read it.**
If the maintainer says to stop here, stop — do not continue to step 5 without the record.

## 4 — Release notes

`npm run release:notes -- <version> --write` produces a draft from commit subjects. **Rewrite it for a GM**: what changed
at the table, not in the code; any change to how a rule resolves stated plainly **with its book and printed page**;
migrations that change owned items said out loud. Show the maintainer the notes before step 5.

## 5 — Bump

Only now, and only with the maintainer's go: `npm run version:bump -- <version>` (rewrites one line), then
`npm run preflight -- --version v<version> --e2e`. Every gate must pass, including the record and a clean tree.
Commit the bump and notes by path.

## 6 — Hand back

Give the maintainer the verdict and the exact commands, and stop:

```bash
git push origin main
git tag v<version>
git push origin v<version>
```

The tag runs `.github/workflows/release.yml` (zip + guides). Remind them `npm run release:check -- v<version>` is
read-only if they want one more look first.
