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
Packs without the flag are system content (exactly four: `sr3e-skills`, `sr3e-example-characters`,
`sr3e-mr-johnsons-contacts`, and the GM-only journal `sr3e-gm-sixth-world`). **82 packs ship**, all SR3 or system (the core book's sample characters, `sr3e-sr3-archetypes`, carry `book: sr3`, the core book, which is never switchable).

### The GM-only journal — `sr3e-gm-sixth-world` (2026-10-11)
The public guide's World pages (`guides/world/`) stop at **October 2059**, the maintainer's campaign date; what
the core book and *New Seattle* say happens after is in this JournalEntry pack, declared **`PLAYER: NONE`,
`TRUSTED: NONE`** in a "GM Only" sidebar folder. Built by `tools/build-gm-sixth-world.mjs` (our own words,
printed pages, derived ids) → `npm run packs:build`. `tests/gm-sixth-world.test.mjs` pins the ownership, the
source/builder parity, and that no World page names a later event.
- ⚠ **Hidden, not secret** (verified live): `PLAYER: NONE` keeps it out of a player's sidebar, but a player can
  still read it with `pack.getDocument()` in the console — and it's in the public repo and zip. The maintainer
  chose this over a private module, knowingly.

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
| SR3, on by default | `sr3` (core) `cc` `mm` `mits` `r3` `mat` `matrix-defragged` |
| Off by default | `sota` `sota2` `tal` `twl` `fra` `ger` `ssg` `tss` (tss is a fan publication) |

`tests/default-gear.test.mjs` pins the default-on set against `SOURCE_BOOKS`.

Packs per book: `sr3` 16 · `sr2` 11 · `mm` 9 · `tss` 9 · `cc` 7 · `sota2` 7 · `matrix-defragged` 5 · `twl` 5 ·
`fof` 4 · `fra` 4 · `r3` 4 · `ssc` 4 · `mits` 3 · `sota` 3 · `st` 3 · `ct` 2 · `ger` 1 · `pna` 1 · `ssg` 1 · `tal` 1

### The core book's sample characters — `sr3e-sr3-archetypes` (TODO 274)
**16** Actor documents — the book prints sixteen (SR3 p.64), not fifteen; the Weapons Specialist is p.80 — from the
character pages (pp.65-80) and record sheets (pp.326-329). **Generated** by `tools/build-core-archetypes.mjs` from
`tools/data/core-archetypes.mjs` (never hand-edit the pack source; `tests/core-archetypes.test.mjs` rebuilds the plan).
- ⚠ **Attributes are the book's NATURAL number**; the parenthesised figure is what the cyberware, adept-power and troll-hide
  bonuses add up to. Entering the augmented figure as the base would count the chrome twice. **Race is the book's, never
  converted** (SR3 p.56 is a rule applied on top by whoever plays it as another race).
- Items are the shipped ones, rated through `ModRatings.withLevel`; a name the packs lack becomes a typed generic item
  (reported by `--check`). Firearms are loaded and spare ammunition follows; vehicles and drones are gear items, not actors.
- ⚠ **Essence is entered as printed** (`essence.lost`). `node tools/build-core-archetypes.mjs --check` audits it against the
  graded cyberware (p.62's rule: a replacement holds .5 of mods free): 14 of 16 reproduce exactly; the Street Samurai
  (−.08) and Drone Rigger (−.04) do not, and the suite names them.
- ⚠ Book inconsistency, kept: Street Samurai Strength prints 5 (7) but Strength Enhancement 3 is +3.
- Book-gated (`book: sr3`), in the sidebar under Reference → Sample Characters. Read/Write is a separate language skill.

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

### The Matrix sourcebook (`mat`) — a default book since 2026-10-27
`Shadowrun 3e - Matrix.pdf` adds skills (pp.22-27; much already in `SR3ESkills`, unattributed and unhideable),
no spells, and gear (pp.52-103). The maintainer's ruling (2026-10-27): **it is a default book**, because Matrix Defragged
sends GMs to its Cyberdeck System Add-ons and Miscellaneous Components (Matrix pp.167-169). Its one pack, `sr3e-mat-gear`,
is generated: the Miscellaneous Component Table (p.169, **with** a Legality column) is filed upstream under core
`sr3.302` (the bodyware page), so `tools/build-default-gear.mjs` re-tags those rows to `mat.169`
(`retagMatrixComponents`; the cyberware rows sharing the page — hand blade, razors, spur — stay out).
Keep the three Matrix sources distinct: **`sr3`** = core Ch. 8 (ODM-\* rawdata), **`mat`** = this sourcebook,
**`matrix-defragged`** = the community ruleset (MDF-\* rawdata).
