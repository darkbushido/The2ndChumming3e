---
paths:
  - "scripts/SR3ESourceBooks.js"
  - "scripts/SR3ECompendiumDirectory.js"
  - "packs-src/**"
  - "archive/**"
  - "rawdata/SRCG-*"
  - "tools/build-default-gear.mjs"
  - "tools/archive-fan-content.mjs"
  - "tools/fill-book-pages.mjs"
  - "tests/source-books.test.mjs"
  - "tests/fan-content.test.mjs"
  - "tests/default-gear.test.mjs"
  - "tests/book-page.test.mjs"
---
# Source books & compendium filtering

One pack per source book, `sr3e-<book>-<type>`, each declaring `flags.The2ndChumming3e.book` in `system.json`.
Packs without the flag are system content (exactly three: `sr3e-skills`, `sr3e-example-characters`,
`sr3e-mr-johnsons-contacts`). **79 packs ship**, all SR3 or system.

### ⚠ SR2 is PARKED — 25 packs in `archive/sr2/` (TODO 158)
The maintainer: *"we will be adding sr2 stuff back in the future but I need sr3 working now without confusion."*
Every pack of `sr2 ct ssc st fof pna` is out of `system.json` and `packs/`; sources and exact declarations are in
`archive/sr2/` with a restore procedure (`archive/sr2/README.md`). Counts below that include SR2 are pre-parking.
- The books stay in `SOURCE_BOOKS` and `EDITIONS.SR2` stays. **`PLAYABLE_EDITIONS`** (`config.js`, `['SR3']`) is
  what the Edition setting offers; `SR3ESourceBooks.edition` falls back to SR3 for a stored SR2.
- `tools/build-default-gear.mjs` skips non-playable editions, so re-running it doesn't resurrect SR2 packs.
- ⚠ Worlds keep their own copies of SR2 items characters hold.

`SOURCE_BOOKS` in `config.js` is the registry (codes + default-on); the GM picks books in **Configure Settings →
System → Configure Source Books** (`SR3ESourceBooksConfig`). Codes are the **`BookPage` prefix** of the upstream
generator's gear data (`mm.064`, `sr3.304`) — not its `Books.json`.

| | Codes |
|---|---|
| SR2, on by default | `sr2` (core) `ct` `ssc` `st` `fof` `pna` |
| SR3, on by default | `sr3` (core) `cc` `mm` `mits` `r3` `matrix-defragged` |
| Off by default | `sota` `sota2` `tal` `twl` `fra` `ger` `ssg` `tss` (tss is a fan publication) |

`tests/default-gear.test.mjs` pins the default-on set against `SOURCE_BOOKS`.

Packs per book: `sr3` 15 · `sr2` 11 · `mm` 9 · `tss` 9 · `cc` 7 · `sota2` 7 · `matrix-defragged` 5 · `twl` 5 ·
`fof` 4 · `fra` 4 · `r3` 4 · `ssc` 4 · `mits` 3 · `sota` 3 · `st` 3 · `ct` 2 · `ger` 1 · `pna` 1 · `ssg` 1 · `tal` 1

### How filtering works
`SR3ESourceBooks.packAllowed(pack)` is the single predicate, used in exactly two places:
- `SR3ECompendiumDirectory._preparePackContext` sets core's `hidden` flag per sidebar pack (registered as
  `CONFIG.ui.compendium`) and collapses emptied folders. **Never prune DOM on a render hook.**
- `SR3EItem._packsForType(type)` — item pickers. `{ ignoreBookFilter: true }` for migrations/integrity checks.
- **Nothing is unloaded** — a presentation filter; owned content stays.
- **Fail-visible**: no `book` flag or an unknown code → visible.
- **The filter only reaches packs.** Skills hardcoded in `SR3ESkills` can't be hidden; a code with no packs
  renders an **empty checkbox**.
- Optional *rules* ride the same toggle: `SR3ESourceBooks.optionalRuleAllowed(code)`.
- Matrix-ruleset packs also pass `SR3ESourceBooks.rulesetAllows` (see matrix rules).

### Default-book gear — `tools/build-default-gear.mjs`  (TODO 91/92)
2,926 gear/ammunition/medical/drug/armour documents in 25 packs, **generated** from `rawdata/SRCG-*-Gear.json`
for every default-on book (`audit/default-books-gear-audit.md`).
- **Never hand-edit a document flagged `generatedBy: build-default-gear`** — the test rebuilds the plan and
  fails on any difference. Change the builder or data and re-run (repo, then `--install`).
- It skips a name the book already ships under any gear-like type; re-runs replace only its own docs (derived ids).
- ⚠ Upstream prices loose ammo **per round**; SR3 p.281 is *"Per 10 Shots"* — a `… Rnds` row becomes a box of 10.
- ⚠ Weapons, cyberware, bioware and vehicles are **out of scope**; arrows and bolts are in, as ammunition.

### The archive — `archive/non-sr3-content/`
The system ships **no sourcebook content it cannot turn off**; what had no book is parked, not deleted. One JSON
file per *original* pack, each `[{ _key, bucket, doc }]` — restore by writing back under the same key.

| Bucket | Docs | Contents |
|---|---:|---|
| `fan` | 1,219 | ray · cb1-4 · cp · nagee · pw · bjf · adh |
| `sr2` | 441 | **already restored** into the `sr2`/`ct`/`ssc`/`st`/`fof`/`pna` packs |
| `sr2-fan` | 41 | NERPS: ShadowLore |
| `unknown` | 2 | two MP7 entries whose `bookPage` holds an accessory list, not a source |
| `pw` | 121 | moved out of the SR2 packs by `tools/archive-fan-content.mjs`, in `sr3e-sr2-firearms.json`, `-armor`, `-melee`, `-projectiles` |

- ⚠ **Only PROVABLE fan content moves** — its own `bookPage` cites a fan code. Blank or `???` is **unknown, not
  fan**, and stays (`tests/fan-content.test.mjs` ratchets both). New waves bucket by the fan **code**, not `fan`.
- ⚠ **`archive/non-sr3-content/README.md` is stale** (wrong counts, predates the SR2 restore). **Re-importing a
  bucket blind duplicates documents** — inventory what ships first.
- Chromebooks (`cb1-4`) and Cyberpunk 2020 (`cp`) are fan conversions — they stay archived.
- ⚠ **`pw` has no `SOURCE_BOOKS` entry, deliberately** (empty checkbox). Restoring it needs its own pack **and**
  an off-by-default registry entry in the same commit; the test keeps them in step.

### The Matrix sourcebook (`mat`) — audited, deliberately not registered
`Shadowrun 3e - Matrix.pdf` adds skills (pp.22-27; much already in `SR3ESkills`, unattributed and unhideable),
no spells, and gear (pp.52-103) none of which is imported. Register `mat` only once something carries it.
Keep the three Matrix sources distinct: **`sr3`** = core Ch. 8 (ODM-\* rawdata), **`mat`** = this sourcebook,
**`matrix-defragged`** = the community ruleset (MDF-\* rawdata).
