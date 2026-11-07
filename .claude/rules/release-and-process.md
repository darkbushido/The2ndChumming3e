---
paths:
  - "tools/**"
  - "system.json"
  - ".github/**"
  - "audit/**"
---

# Release and process — preflight, releases, branch manifest URLs

Moved out of `CLAUDE.md` (TODO 291, approved by the maintainer 2026-11-07). `CLAUDE.md` keeps a short ⚠ summary.

## Verifying a build — `npm run preflight`

One command, one verdict (also the `verify-build` skill, `.claude/skills/verify-build/SKILL.md`). The whole release
train — take stock, version, preflight, rules check, notes, bump, hand-back — is **`/release`**
(`.claude/skills/release/SKILL.md`), resumable across sessions.

```bash
npm run preflight                          # eslint, suites, mutants, TODO, packs, manifest, guides
npm run preflight -- --fast                # skip mutants, guides, e2e
npm run preflight -- --e2e                 # …and Playwright — Foundry must be RUNNING
npm run preflight -- --version v0.6.0 --e2e   # …and version, release:check, notes, rules record, clean tree
```

⚠ **It changes NOTHING** (`tests/preflight.test.mjs` asserts it only reads files and runs `git status
--porcelain`). The writers are separate:

```bash
npm run version:bump -- 0.6.0     # or: patch / minor (no `major` keyword, deliberately)
npm run release:notes -- 0.6.0 --write
```

- ⚠ `bump-version.mjs` rewrites **one line** — never round-trip `system.json` through `JSON.parse`/`stringify`
  (it reformats ~1900 lines of pack declarations).
- ⚠ `release-notes.mjs` produces a **draft** from commit subjects. Notes are for a GM: any change to how a rule
  resolves is stated plainly **with its book and printed page**.
- ⚠ `npm run lint` must stay green. Fix lint at the source (scoped disables with a reason), never repo-wide.

### ⚠ The one gate that must never be faked — TODO 121
`--version` checks that **`audit/rules-check-<version>.md` exists** — meaning a person compared the rules against
`guides/` with the PDFs as authority and took every difference to the maintainer. **If it's missing, say so and
stop — never write the file to make the gate green.** Both `tools/preflight.mjs` and the skill say this, and
`tests/preflight.test.mjs` asserts they still do.

## Releases — a tag builds the zip and the guides  · TODO 127

```bash
npm run release:check -- v0.6.0   # tag matches system.json, every loaded path ships — changes nothing
npm run release:stage -- v0.6.0   # stage into dist/ (ignored) to inspect
git tag v0.6.0 && git push origin v0.6.0   # the maintainer's — the release itself
```

A pushed `v*.*.*` tag runs `.github/workflows/release.yml`:
- **The system** — `tools/release.mjs` stages `RELEASE_FILES` (`system.json scripts styles lang packs LICENSE
  README.md`) and stamps the copy's URLs (`tools/lib/manifest-urls.mjs`): `download` pinned to the tag,
  `manifest` at `releases/latest`. A specific version installs from `…/releases/download/v0.6.0/system.json`.
- **The guides** (`guides/`, Jekyll) build to **gh-pages** as `v0.6.0/` (frozen) and `latest/`;
  `tools/guides-versions.mjs` rewrites the index and root redirect.
- ⚠ It **refuses a tag that doesn't match `system.json`** — bump first.
- ⚠ A new top-level folder the system loads must be added to `RELEASE_FILES` (`tests/release.test.mjs`).
- ⚠ The committed `system.json` names a **branch** (below); never commit release URLs.
- Guide pages: edit in `guides/` (its own CLAUDE.md has the rules); preview `bundle exec jekyll serve` there,
  then `node tools/linkcheck.mjs`.

## Branch manifest URLs — `npm run manifest:branch`

`system.json`'s `url` / `manifest` / `download` name a **branch**, so a playtest branch must point at itself.

```bash
npm run manifest:branch          # stamp to the current branch (once per branch you push out; commit it)
npm run manifest:check           # exit 1 if stale — changes nothing
```

`tools/manifest-branch.mjs` rewrites three lines (never the parsed document) and reads the repo slug from the
existing `url`.

- ⚠ **Merging into main must not drag a branch's URLs along** — `.githooks/post-merge` re-stamps to the current
  branch after any merge and leaves the file dirty with a notice (it never commits: a fast-forward has no commit to
  amend). A `.gitattributes` merge driver **doesn't work** here: git only runs it when both sides changed the file.
- `.githooks/post-checkout` only warns.
- **Hooks need one-time setup**: `npm run setup:hooks` (`core.hooksPath` is local config). `.gitattributes`
  pins `.githooks/**` to `eol=lf` — CRLF breaks the shebang silently.
