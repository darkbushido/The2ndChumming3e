# Upstream data defects — for filing issues

Defects found in data this project **inherited**, not in code this project wrote. Kept so they
can be reported to whichever repo owns them, and so a future re-import does not silently
reintroduce a fix made only here.

## ⚠ There are TWO upstreams and they own different things

| Repo | Owns | Reaches us as |
|---|---|---|
| **`williamdiffey/The2ndChumming3e`** | the `scripts/macros/populate-*.js` compendium populators | the shipped packs, built by running those macros |
| **`criticalfault/Shadowrun-Character-Generator`** | `src/data/SR3/*.json` gear and skill data | `rawdata/*.json` → `SR3ESkills`, the gear packs, and `SRCG_BONUSES` |

⚠ **Check which one owns a defect before filing.** The Little Black Book contacts come from
the *populator*; the skill and gear tables come from the *character generator*. They are
different projects with different maintainers.

⚠ **Every entry below was verified against the printed page**, not taken from a tool's report.
Three separate false-positive classes were produced by the audit tooling on 2026-09-01 alone —
see the note at the end.

---

## `williamdiffey/The2ndChumming3e` — `populate-mr-johnsons-contacts.js`

Source: *Mr. Johnson's Little Black Book*, contacts on pp.36–67.

### 1. Mental attributes rotated one column — ~50 of 62 contacts

The book prints `B Q S I W C`. SR3's character sheet orders attributes `B Q S C I W`, with
**Charisma first** among the mental three. The data was entered against the sheet's order, so
every value landed one slot out:

| The book's… | went into |
|---|---|
| Intelligence | `charisma` |
| Willpower | `intelligence` |
| Charisma | `willpower` |

**Evidence.** The book prints Reaction, Combat Pool and Spell Pool, all of which SR3 *derives*
from these attributes. Under the book's literal column order the derivations reproduce the
printed values for 58 of 61 records; under the sheet order, 53. Per record, where the
arithmetic can decide, the book's reading wins **28 to 0**.

*Example — Corp Bodyguard, p.48:* printed `5 7 (8) 6 (7) 5 3 5 1.76 6 (12) 4`, so I5 W3 C5.
The entry has I3 W5 C5. The book's own `Dice Pools: Combat 8` needs `⌊(8+5+3)/2⌋ = 8`, which
only works with I5 W3.

### 2. Skill lists — 49 of 62 contacts wrong, 130 differences

Verified with `tools/audit-johnson-skills.mjs`, report in `audit/johnson-skills-audit.txt`.
Six distinct kinds:

- **A whole skill list on the wrong contact.** `Dock Worker` (p.67) carries `City Services
  Worker`'s skills — Computer, Electronics, Etiquette, Pistols, Card Games, Disco,
  Firefighting — and none of its own. The book gives it `Athletics 3, Car 2 (Forklift 4),
  Intimidation 3, Unarmed Combat 3`.
- **Two skills merged into one.** `Shark Lawyer` (p.55): the book gives `Interrogation 6,
  Intimidation 4 (Verbal 6)`; the entry has `Interrogation 4 (Verbal 6)` — one skill's name
  with the other's rating and specialisation, and Intimidation gone.
- **A sibling skill read as a specialisation.** `Car 6, Car B/R 3` became `Car 6 (Car B/R 3)`.
  Also `Bike or Car`, `Electronics`, and — worst — `Squatter` (p.52), where the book gives
  `Car B/R 2, Electronics B/R 2` and the entry **invented** a plain Car 2 and Electronics 2 to
  hang the specialisations off.
- **Specialisations on the wrong skill** — a `Pistols` carrying `Sneaking 5, Hiding 6`.
- **Specialisations dropped** — `Bookie` (p.55) `Etiquette 2 (Street 4, Gambling 5)` kept only
  Street; `Stealth (Alertness 4, Sneaking 4)` kept only Sneaking.
- **Plain wrong ratings**, both directions, and **55 skills simply absent**.

### 3. Specialisation ratings stored as display text

Specialisations were passed through as the book's printed text — `'Magic 6'`,
`'Decking 8, Hardware 9'` — so the rating ended up inside the name and several
specialisations collapsed into one. 131 affected.

⚠ Not strictly a data error in the source *book* reading, but it makes the data unusable
without re-parsing.

### 4. `wired()` gives half the Reaction — *SR3 p.300*

```js
function wired(n) { return { reactionBonus: n, diceBonus: n }; }
```

> "Each level adds **+2** to the user's Reaction and gives +1D6 Initiative die."

So `wired(3)` should be +6 Reaction. The comment above it claims "real SR3 formulas". Only
`Gunsmith` uses it, so the blast radius is one record.

### 5. `karmaPool` never written — a `??` default-parameter bug

```js
karmaPool = 0,                        // the default
karmaPool: karmaPool ?? karma ?? 0,   // 0 is not nullish, so `karma` never gets through
```

Every one of the 62 shipped with an empty Karma Pool while its own note stated the number.

### 6. Two records effectively unentered

- **Metroplex Guardsman** (p.63) — metatype `elf` where the book says **Dwarf**, and every
  attribute left at the function's default of 3 against the book's `4 4 5 3 4 2`, Essence 4.3.
- **Dock Worker** (p.67) — Willpower and Charisma transposed, no Karma Pool in its note, *and*
  the wrong skill list (above). Three independent defects on one contact.

---

## `criticalfault/Shadowrun-Character-Generator` — skill data

Reaches us via `rawdata/ActiveSkills.json` → `SR3ESkills`.

### 7. Four skills missing specialisations the books list

Verified page by page with `tools/audit-skill-specialisations.mjs`.

| Skill | Citation | The book prints | The data has |
|---|---|---|---|
| Vectored Thrust Aircraft | *SR3 p.89* | `By specific vehicle type, Remote Operations` | nothing |
| Spray Weapons | *CC p.105* | `Firehose, Flame-thrower, Spray` | an open marker only |
| Talismongering | *MITS p.29* | `Alchemy … and Artificing` | nothing |
| Spell Design | *MITS p.29* | `Spell Category` | nothing |

⚠ **This data is otherwise in GOOD shape** — 46 of 56 skills that the books give a
`Specializations:` line match exactly. Unlike the populator above, it should not be assumed
faulty. Worth saying in any issue.

⚠ `Spray Weapons (Firehose)` is *used* by the Little Black Book's Firefighter, so a
specialisation the content relies on cannot be picked.

---

## Already reported upstream

- **`Mods` vs `Notes`** — the SRCG maintainer confirmed `Mods` is authoritative and `Notes` is
  a flattened view that sometimes disagrees (their issue #199). Recorded in CLAUDE.md.

---

## ⚠ Before filing any of this

**Verify against the printed page first.** The audit tooling built on 2026-09-01 produced
**three separate false-positive classes** in a single day:

1. **Skill names collide across categories.** `SR3ESkills` lists `Stealth` under *Physical
   skills* with four specialisations and under *Background knowledge* with none — both correct.
   Keying by name alone let the empty one win, and 44 skills reported as broken when 11 were.
2. **An open-ended marker still carries a name.** `Spell Category->` means "Spell Category, and
   pick which one". Filtering `->` entries out of a comparison reported a specialisation we
   ship as missing.
3. **PDF furniture bleeds into wrapped lines** — running heads (`Third Edition`), watermarks
   (`Gavin Lowry (order #24266)`) and page footers land mid-list and parse as data. A watermark
   truncating a book line made our *correct* `Leadership (Morale)` look like an invention.

Of six "genuine gaps" first reported for the skill data, **three were false** and a fourth named
the wrong specialisations. The four in the table above are what survived reading the pages.
