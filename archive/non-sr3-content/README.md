# Archived non-SR3 compendium content

1,703 documents removed from the system's compendium packs, held here until they
have a book to belong to. Nothing is lost — every document is stored whole,
including its original LevelDB key, so it can be restored exactly.

## Why

The system ships **no sourcebook content it cannot turn off**. Every book's
content lives in its own pack, `packs/sr3e-<book>-<type>` (`sr3e-mm-cyberware`,
`sr3e-r3-vehicles`, …), declared in `system.json` with
`flags.The2ndChumming3e.book` and toggled by the GM through **Configure Settings
→ System → Configure Source Books**. Everything here is the remainder: material
whose source had no book code, and so would otherwise sit in the system's packs
where it cannot be turned off.

> **Superseded plan.** An earlier version of this file described one *module* per
> book at `modules/sr3e-book-<code>/`. That is not what was built — there is no
> `modules/` directory, and no module was ever shipped. Books are per-book packs
> inside the system, gated by `SOURCE_BOOKS` in `scripts/config.js`.

## What is here

One JSON file per **original** source pack — the monolithic `sr3e-cyberware`,
`sr3e-firearms` and so on, as they existed before the split. Each file is an
array of `{ _key, bucket, doc }`: the original LevelDB key, the bucket the
document was classified into, and the untouched document.

| Bucket | Docs | Source codes |
|---|---:|---|
| `fan` | 1,219 | ray 658 · cb1 198 · cp 114 · cb4 61 · cb3 59 · cb2 51 · nagee 43 (+1 malformed, see Caveats) · pw 18 · bjf 9 · adh 2 · cus 1 · *blank* 4 |
| `sr2` | 441 | sr2 328 · ct 43 · ssc 31 · st 27 · fof 5 · cs 3 · gm2 1 · r2 1 · pna 1 · *blank* 1 |
| `sr2-fan` | 41 | n/sl 41 (NERPS: ShadowLore) |
| `unknown` | 2 | *no bookPage* — see Caveats |

By original pack, split by bucket:

| Pack | fan | sr2 | sr2-fan | unknown | Total |
|---|---:|---:|---:|---:|---:|
| firearms | 703 | 180 | — | 2 | 885 |
| cyberware | 267 | 107 | 41 | — | 415 |
| armor | 60 | 65 | — | — | 125 |
| melee | 60 | 41 | — | — | 101 |
| bioware | 76 | 1 | — | — | 77 |
| drugs | 44 | 3 | — | — | 47 |
| projectiles | 5 | 15 | — | — | 20 |
| vehicle-mods | — | 17 | — | — | 17 |
| vehicle-weapons | — | 10 | — | — | 10 |
| adept-powers | 2 | 2 | — | — | 4 |
| vehicles | 2 | — | — | — | 2 |
| **Total** | **1,219** | **441** | **41** | **2** | **1,703** |

## Status — what has already been restored

⚠ **These files still hold everything, including documents that now also ship in
the system.** Re-importing a bucket blind will duplicate them. Inventory `packs/`
before restoring anything.

**The `sr2` bucket has been split into per-book packs** (the `sr2-edition` work).
435 of its 441 documents now ship as `sr3e-sr2-*`, `sr3e-ct-*`, `sr3e-ssc-*`,
`sr3e-st-*`, `sr3e-fof-*` and `sr3e-pna-bioware`, with matching codes registered
in `SOURCE_BOOKS`.

Six documents in that bucket did **not** make it, because their codes have no
entry in `SOURCE_BOOKS` and no pack:

| Code | Docs | Book |
|---|---:|---|
| `cs` | 3 | Corporate Security |
| `gm2` | 1 | *unidentified* |
| `r2` | 1 | Rigger 2 |
| *no bookPage* | 1 | unclassified |

**`fan`, `sr2-fan` and `unknown` are entirely un-restored** — 1,262 documents with
no pack and no book code.

The **Chromebooks** (`cb1`–`cb4`, 369 docs) and **Cyberpunk 2020** (`cp`, 114) are
fan *conversions*, not official second-edition products, so they stay here with
the rest of the fan material rather than joining the SR2 books. See the comment
above `SOURCE_BOOKS` in `scripts/config.js`.

`tss` (The Shadowrun Supplemental) is the working precedent for restoring a fan
book: registered in `SOURCE_BOOKS` with `fan: true`, `enabled: false`, and
shipping nine packs.

## Restoring

Each entry carries the key it was stored under, so restoring is a direct write
back into the matching pack:

```js
// pseudo
for (const { _key, doc } of JSON.parse(readFileSync('sr3e-cyberware.json'))) {
  await db.put(_key, doc);
}
```

Restoring a book takes three things, not just the write:

1. **A pack per content type** — `packs/sr3e-<code>-<type>`, filtered from these
   files by the document's `bookPage` prefix.
2. **A `system.json` declaration** carrying `flags.The2ndChumming3e.book`. A pack
   with no book flag defaults to *visible* — fail-visible by design, so a missing
   flag ships the content permanently on.
3. **A `SOURCE_BOOKS` entry** in `scripts/config.js` so the GM can toggle it. A
   code with no packs behind it renders as an empty checkbox.

Codes come from the `BookPage` prefix in the upstream Shadowrun Character
Generator's gear data, not from its `Books.json` (which carries no codes).

## Caveats

- The `unknown` pair are corrupt `bookPage` values (`"Underbarrel Grip, Rail Mount"`),
  not a real source. Worth fixing rather than restoring as-is.
- `ray` (Raygun's Firearms, 658 docs) is by far the largest single source here —
  more than half the fan bucket, and larger than any book the system currently
  ships. It likely deserves its own book code rather than being lumped in.
- `cus` (1 doc) is "Custom Gear" — a generator-side catch-all, not a publication.
- **One malformed NAGEE reference.** `Eyes,Ultrasound #1` (in `sr3e-cyberware.json`)
  carries `bookPage: "NAGEE4-72"` — dash-separated and upper-case, where every other
  NAGEE entry uses `nagee.NN`. It is correctly bucketed as `fan`, but any code that
  derives the source by splitting `bookPage` on `.` will read it as having no source.
  Normalise it to `nagee.72` when restoring that book.

### Five field-shifted firearms

The last five entries in `sr3e-firearms.json` carry extra keys — `recoveredSource`,
`recoveredFrom` and `note`. Every column in those records is displaced by roughly
three positions, so `bookPage` came out blank and the real source landed elsewhere.
They are the five blank-`bookPage` documents in the table above — **four in `fan`,
plus Taser II in `sr2`**, since the classifier had nothing to read and fell back
differently for each:

| Entry | Real source | Found in |
|---|---|---|
| Excalibur Nightstick (Tasr) | `cb1.2` | `streetIndex` |
| Taser II (Tasr) | `sr2.???` | `streetIndex` |
| Fab Nationale GL 40mmLV | `ray.000` | `accessories` |
| Zastava grenade launcher | `ray.000` | `accessories` |
| Arasaka WXA Comp.Aim.Wpn (LMG) | `cb1.6` | `streetIndex` |

They stayed in the system through the first archive pass only because the classifier
reads `bookPage`, which was empty. The damage, mode and cost fields are displaced too
— Arasaka WXA reads `damage: "30000"`, which is its cost — so these records are not
usable until repaired. Archived unrepaired; repair before restoring them.

Taser II is the one already sitting in the `sr2` bucket, and is also the single
blank-`bookPage` document counted among the six that bucket never restored. Its
recovered source `sr2.???` puts it in an already-restored book — so once repaired it
belongs in `sr3e-sr2-firearms`, not with the fan material. Excalibur Nightstick and
Arasaka WXA recover to `cb1`, which is Chromebook fan-conversion content and stays
archived.
