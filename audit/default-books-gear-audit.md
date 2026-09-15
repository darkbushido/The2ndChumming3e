# Default-on books — non-weapon gear audit

**Run 2026-09-14**, on branch `feature/default-books-gear`. Asked for by the maintainer:
*"audit the non weapon, non cyberware/bioware gear in the shipped packs and make sure everything in
the default books are included."* Continues [TODO 91](../TODO.md#91) (core gear that ships nowhere)
and [TODO 92](../TODO.md#92) (repeat for the other default-on books).

**Result: 2,926 documents added across 25 packs** (20 new; the cc, fof, sr2 and sr3 armour packs and the mm drugs pack extended),
built by a committed tool from vendored source data, with a test that fails if the packs and the
source ever disagree.

---

## 1. Scope

| In | Out (the maintainer, 2026-09-14) |
|---|---|
| gear · ammunition (incl. arrows and bolts) · medical · drugs/chemicals/toxins · armour and clothing | firearms · melee · bows/crossbows · grenades and rockets · cyberware · bioware · nanoware · vehicles and vehicle gear · lifestyles |

**Default-on books** (`SOURCE_BOOKS` with `enabled: true` — asserted by `tests/default-gear.test.mjs`):
SR3 `sr3` `cc` `mm` `mits` `r3` `matrix-defragged` · SR2 `sr2` `ct` `ssc` `st` `fof` `pna`.

⚠ **CLAUDE.md's Source-books table was wrong** — it listed `sota` `sota2` `tal` `twl` as on by
default. `config.js` has them **off**. Corrected in the same commit.

## 2. Method

1. **Source:** the Shadowrun Character Generator's gear data, vendored as
   `rawdata/SRCG-SR3-Gear.json` / `SRCG-SR2-Gear.json` (provenance: `rawdata/SRCG-README.md`).
   Its `BookPage` prefix is where this system's book codes come from, so routing is exact.
2. **SR3 books from the SR3 file, SR2 books from the SR2 file.** The SR3 file repeats SR2 rows with
   `sr2.???` pages; the SR2 file carries the real ones.
3. **Skip what already ships** — a name the book already has under any gear-like type
   (gear/ammunition/medical/drug/armour). Cyberware is *not* gear-like: an implanted subvocal
   microphone and a strap-on one are two items, and both ship.
4. **Build** with `tools/build-default-gear.mjs` (repo, then `--install`). Deterministic ids;
   every document flagged `generatedBy: build-default-gear`; a re-run replaces exactly those.
5. **Spot-check against the PDFs** for every book the library holds (§5).

## 3. Per book

| Book | Added | Already shipped (kept as is) | New packs |
|---|---|---|---|
| `sr3` | gear 1,014 · ammunition 189 · medical 34 · drugs 7 · armour 2 | armour 71 · gear 1 (Respirator, as armour) | gear · ammunition · medical · drugs |
| `cc` | ammunition 219 · gear 171 · armour 12 | armour 80 | gear · ammunition |
| `mm` | medical 92 · gear 20 · ammunition 6 · drugs 4 | drugs 30 · armour 1 | gear · ammunition · medical |
| `mits` | gear 21 (ritual materials, magical equipment) | — | gear |
| `sr2` | gear 661 · ammunition 199 · medical 68 · drugs 44 · armour 16 | armour 9 | gear · ammunition · medical · drugs |
| `fof` | gear 59 · ammunition 47 · armour 9 | armour 4 | gear · ammunition |
| `ssc` | armour 8 · gear 5 · ammunition 1 | — | gear · ammunition · armour |
| `st` | medical 18 | medical 3 (Doom, Gamma-Anthrax, Myco-Protein — already drugs) | medical |
| `r3` `ct` `pna` `matrix-defragged` | **nothing in scope upstream** | — | — |

**The four empty books.** Upstream has no in-scope rows for them: R3's rigger kit is all vehicle
gear (out of scope), CT's single row is a melee weapon, and PnA and Matrix Defragged carry no gear
tables. Nothing was missed by the builder; if these books print gear, the *source* lacks it (§6).

## 4. What the builder does with the generator's rows

| Upstream shape | Becomes |
|---|---|
| `15-Rnd Clip (APDS)` | **one pre-filled reload** — `countedIn: reloads`, 1 × 15, typed from the name (TODO 114) |
| `APDS Rnds` (priced per round) | **a box of 10 at the book's per-10 price** — SR3 p.281 heads the table *"Ammunition, Per 10 Shots"*, and the generator divides it down (APDS 7¥ = 70¥ per 10, verified) |
| `Tracer Rnds (10)`, `Assault Cannon Belt (100)` | that many |
| darts, tracker rounds, Big D, mortar rounds, minigrenades | one, at the listed price |
| `Arrows`, `10 Bolts` (filed under "Bow and crossbow") | ammunition with the `arrow` / `bolt` mechanism, so the nocked-ammo flow finds them |
| `Spare Clip` | **gear** — it is empty (SR3 p.281: *"5¥ per clip, unloaded"*) |
| ammo type | **only the book's own names** (`Regular/APDS/Explosive/EX Explosive/Flechette/Gel/Tracer/AV`); a word match typed "Anti-Personnel Flechette" (a minigrenade) as flechette |
| gear rating | the Rating column, else `knownRating` (the name, then `GEAR_RATINGS`), else **null** — TODO 118 |
| price by formula (`Rating×200`) | cost 0, the formula in the description |
| fractional price (`2.5`) | rounded — `cost` is an integer field and `.5` fails validation — with the book's figure in the notes |
| same name, different rows (97) | **all kept**: a gear rating shows as `Gyro Mount [5]` / `[6]`; otherwise the name says what differs, `Big D (Cost 200¥)` |
| exact repeats (59) | collapsed — the generator lists some items under two headings |
| one drug printed in two tables (15) | **merged** — M&M gives ACTH's addiction under Drugs and its vector under Chemicals; a cell they disagree on is kept, with its page, as *Also listed* |
| six upstream spelling slips | corrected **after checking the book's text**: Hosptial → Hospital, Witchs → Witch's Moss, Novocoke → Novacoke (M&M), Apparartus → Apparatus, Grappel → Grapple (CC), Diplay → Display |

## 5. PDF spot-check

Every generated name, searched for in the book's own text layer (`pdftotext -layout`); a name counts
as found when it, or every word of it, appears. Clip combinations (`N-Rnd Clip`) are the generator's
arithmetic, not book entries, and are excluded.

| Book | Found | The misses are |
|---|---:|---|
| SR3 core | 909 / 1,150 | the generator's **synthesised configurations**: SkillSoft Jukebox at every size × port count (≈140), Pocket/Table-Top/Wrist Computers at every memory size, Telecoms, Virtual Instructors, Dataline Tap levels; the `Rnds` abbreviation; plus ~15 abbreviated names (`HighQuality Full-X Dir-X Rec`, `Touchpad w/Trackball Adapter`) |
| Cannon Companion | 267 / 323 | `Rnds` abbreviation, rating-expanded rows (`STS (Beacon) Rating [3]`), abbreviated armour names (`Victory "Wild Hunt" Lgt Armor`) |
| Man & Machine | 151 / 153 | after the merge and corrections above: `Novocoke` (since corrected to the book's *Novacoke*) and `Laes`, which the text layer does not yield under any spelling tried |
| Magic in the Shadows | 21 / 21 | — |
| SR2, CT, SSC, ST, FoF, PnA | **not checkable** | not in the PDF library |

**No phantom items were found** — every miss inspected is a spelling, an abbreviation or a
generated combination of a real entry, not an item the book does not print. Stats were **not**
diffed row by row against the tables (that is TODO 92's method and remains open for these packs).

## 6. Open — for the maintainer

1. **Synthesised combinations.** Upstream expands formula entries into one row per option: about
   140 SkillSoft Jukeboxes, ~40 computers by memory size, 20 Virtual Instructors. They are faithful
   to the generator and each is a real purchasable configuration, but they crowd the compendium.
   Keep, or collapse each family to one item with its formula in the notes?
2. **SR2 names that are truncated upstream** — `Tr` (FoF ammunition, fof.51), `Anti-Tank`,
   `Smoke`, `Concussion`, `Defensive`, `Offensive` (FoF/SR2 grenade-launcher rounds that lost the
   heading they sat under). Shipped as upstream names them; FoF is not in the library to check.
3. **Stat audit.** Names are spot-checked; numbers are the generator's. A row-by-row stat diff
   against the printed tables (TODO 92's method) is still to do for these packs.
4. **Books with gear upstream lacks.** If R3, PnA or Matrix Defragged print in-scope gear, the
   source has none of it; adding it means transcribing from the PDF.

## 7. Verification

- `tests/default-gear.test.mjs` — 67 assertions: every conversion rule above, the default-book
  list against `SOURCE_BOOKS`, every pack declared with its book flag, no duplicate ids, the
  schema/sheet fields the packs fill, and **a sweep that rebuilds the plan and compares it with the
  shipped packs document by document** (read through `tools/lib/pack-copy.mjs`).
- `npm run packs:check:repo` — 102 packs, 7,664 documents, no problems.
- Full suite 52/52 · mutants 99/99.
- **Not yet done:** `--install` (Foundry was running) and a live look in Foundry — TESTING.md.
