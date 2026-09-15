# SR3 core rulebook — gear audit

**Run 2026-09-02** against `Shadowrun 3e - Core Rules {FAN25000}.pdf` (real text layer, no OCR)
and all 82 shipped packs. Book pages are **printed** pages; PDF page = book page + 2.

Started because [TODO 86](../TODO.md#86) found a Little Black Book contact carrying a **flash-pak**
that matched nothing in any pack. The question was whether that was one gap or a class of them.
It is a class.

---

## 1. What was validated — and it is clean

### Firearms — 32 of 32, exact · *SR3 p.278-279*

`sr3e-sr3-firearms` holds exactly the 32 weapons the book prints, and **every concealability,
ammunition capacity, firing mode and damage code matches the printed table**. No omissions, no
extras, no transcription drift.

Spot values, book → pack: Ares Predator `5 / 15(c) / SA / 9M` · Ranger Arms SM-3
`-- / 6(m) / SA / 14S` · Vigorous Assault Cannon `-- / 20(c)-Belt / SS / 18D` · Ares Antioch
`6(-3) / 6(m) / SS / grenade`.

Only the **names** drift, never the numbers: `Enfield AS7` (book *AS-7*),
`Rmngton Roomsweeper ShG`, `Ingram Smartgun Mod. 20t`. That is [TODO 87](../TODO-DONE.md#87), and it is
the reason `Predator 2` on a contact matches nothing.

### Melee — every book entry present · *SR3 p.274*

All 16 of the Personal Weapons table are in `sr3e-sr3-melee`. The pack also carries cyber-implant
weapons (hand razors, spurs, hand blades) which are correctly duplicated from the cyberware pack,
and one entry — **Pipe** — that is not in the core table.

`Unarmed` is absent **by design**: `SR3EItem._unarmedWeapon()` synthesises it.

### Projectiles — present and correctly encoded · *SR3 p.275*

Bows, all three crossbows, throwing knife and shuriken all ship.

⚠ **The eleven "Standard Bow" entries are NOT duplicates** — they are the Strength-Minimum
variants, damage `3M` through `14M`, exactly as `100¥ × Str. Min.` implies. Same for `Ranger-X Bow`
and `Sling Shot` in the CC pack. **I nearly filed this as a defect**; the shared name makes them
indistinguishable in a picker, which is a usability issue, not a data one.

---

## 2. One real defect, found and fixed

### `Gunnery` was being rolled for hand-carried weapons · *SR3 p.91*

`SR3EItem`'s weapon-category map sent **`ACan`** (assault cannons) and **`MisLn`** (missile
launchers) to **Gunnery (Intelligence)**. The book scopes that skill to vehicles and nothing else:

> "Gunnery Skill governs the use of all **vehicle-mounted** weapons, whether in mounts, pintles
> or turrets."

Both replacements are scoped by the book with an explicit vehicle exclusion, which is the evidence
that a shouldered launcher is not a Gunnery weapon:

- **Heavy Weapons (Strength)** — *"anything larger than an assault rifle, including large weapons
  when they are mounted on tripods, pintles, gyro-mounts or in fixed emplacements (**but not
  in/on vehicles**)"* → `ACan`
- **Launch Weapons (Intelligence)** — *"any device that fires a missile, rocket, or other
  explosive projectile (such as grenades), including mortars (**but not in or on vehicles**)"* →
  `MisLn`

**10 shipped items were affected** — 2 `ACan` and 8 `MisLn`, across `sr3`, `cc`, `sr2` and
`sota2`. A runner shouldering the Vigorous Assault Cannon rolled the **wrong skill on the wrong
attribute**.

⚠ **Why it survived:** the *vehicle* path is a different flow (`rollVehicleWeapon`) and was always
correct, so Gunnery genuinely is the right answer one layer over. `GrLn` was already right, which
made the neighbouring rows look considered.

Fixed, and pinned in `tests/tables.test.mjs` — the assertion is the general one (**no**
character-weapon category may name Gunnery), not just the two rows, plus a check that every skill
the map names exists in `SR3ESkills` at all.

---

## 3. The structural gap — eight declared item types ship nothing

`system.json` declares 22 Item types. Counting every document in all 82 packs:

| Type | Documents |
|---|---:|
| cyberware | 795 |
| firearm | 343 |
| armor | 259 |
| spell | 244 |
| melee | 107 |
| projectile | 67 |
| drug | 48 |
| **`ammunition`** | **0** |
| **`gear`** | **0** |
| **`thrown`** | **0** |
| **`medical`** | **0** |
| **`contact`** | **0** |
| **`quality`** | **0** |
| **`complex_form`** | **0** |
| **`summoning`** | **0** |

**No book in the system ships a gear, ammunition or electronics pack.** Every pack is one of
`adept-powers · armor · bioware · cyberware · drones · drugs · firearms · melee · projectiles ·
spells · vehicle-mods · vehicle-weapons · vehicles`. That is the whole reason a flash-pak has
nowhere to live.

### 3a. ⚠ `ammunition` = 0 — **already known as TODO 23, and this audit rediscovered it**

⚠ **Recorded on 2026-08-05, *found in play*, a month before this sweep ran.** This audit reached
it independently and first wrote it up as a new finding, which it is not. [TODO 23](../TODO-DONE.md#23)
is the authority and is more complete — it inventories the implementation piece by piece, notes
that it is **not a regression** (the pre-split monolithic packs had none either, the archive holds
zero, and there is no upstream source data), and names a blocker this audit missed:
**[TODO 12](../TODO-DONE.md#12-write-a-committed-pack-rebuild-script-and-vendor-its-sources) — the
populate macros were retired, so the repo cannot currently build a pack at all.**

What is genuinely new below: arrows and bolts share the gap, it did not ship mis-typed, and
`ammunition` is one of *eight* empty declared types rather than a lone omission.

**To be exact about what is and is not missing**, because these are three different layers and
only the third is empty:

| Layer | State |
|---|---|
| **The books** | Ammunition is fully printed — SR3 core p.279, and Cannon Companion carries a whole chapter of it. **Nothing is missing from the books.** |
| **This system's rules** | Implemented. `SR3E.ammoTypes` covers `regular` `explosive` `exExplosive` `gel` `apds` `flechette` `tracer` `antiVehicle`; `ammoLoadMechanisms` covers `c` `m` `cy` `b` `d` `sb` `internal` `arrow` `bolt`; `AmmunitionData` is a real TypeDataModel. |
| **The shipped compendium packs** | **Zero documents of `type: "ammunition"`.** This is the gap. |

Searched by NAME under every type as well, in case ammunition shipped mis-typed: 31 hits, none of
them ammunition — weapons named for the round they fire (`9mm Flechette SMG`, `Flechette Gun`), a
French vehicle decoy (`Lure Ammo AM-56`), and spells (`Manabolt`, `Stunbolt`).

So the claim is narrow: **nothing ships that a player can drag onto a sheet to represent owning
rounds.**

The system has a **full two-layer ammunition implementation**: `SR3E.ammoTypes` with the real
rules (APDS halves ballistic, flechette's `max(Impact × 2, Ballistic)`, gel −2 Power and Stun,
explosive/EX Power bonuses, tracer), `loadMechanism` matching, stockpile-and-magazine tracking,
`SR3EItem.reload()`, and a `trackAmmo` world setting gating all of it.

**There is not one ammunition item in any pack to reload from**, and `SR3EItem.reload()` filters
`actor.items` for `type === 'ammunition'` matching the gun's load mechanism — finding none, it
warns *"No compatible ammo in stock"* and stops. So with `trackAmmo` on, **every firearm in the
system is unreloadable** until a GM hand-authors ammunition items in their own world.

The rules to resolve APDS are all there; there is no APDS to load.

The same is true of **arrows and bolts**, which the nocked-ammo flow matches by `arrow`/`bolt`
loading mechanism — the book prints both rows and neither ships.

### 3b. ⚠ Weapon accessories are mechanically live and entirely absent · *SR3 p.281*

The system already models what these do — `recoilMod` on the weapon, actor `recoilCompensation`,
smartlink's −2 TN, laser sight's −1. None of the items exist: **silencer, sound suppresser,
smartgun (internal/external), smart goggles, laser sight, gas vent II/III, shock pads, tripod,
bipod, imaging scopes, ultrasound sight/goggles, spare clips**.

### 3c. ⚠ The `sr3` pack has no grenades at all · *SR3 p.280*

The AoE/scatter flow is fully built — cursor-aimed blast point, scatter dice, epicentre
relocation, per-target falloff, Chunky Salsa. Grenades **do** ship (15 in `sr3e-sr2-projectiles`,
6 in `sr3e-cc-projectiles`, typed `projectile` with category `GR`, which
`SR3E.thrownCategories` accepts), **but none in `sr3e-sr3-projectiles`**.

So a table running **core only** — the default configuration — has nothing to throw. Core's own
offensive/defensive HE and AP grenades, concussion, smoke, thermal smoke, gas and flash-pak are
all missing.

### 3d. General gear — roughly 120-130 real items

Extracted from the Street Gear chapter's tables and matched against every pack: **42 of ~200
extracted names already ship** (armor rows, cyberdecks in `sr3e-mdf-cyberdecks`, a few cyberware
entries), leaving ~156, of which perhaps 30 are my extractor's column fragments rather than real
items.

Absent whole sections: **Electronics** (p.288) · **Communications** (p.290) ·
**Surveillance & countermeasures** (p.292) · **Security devices** (p.293) ·
**Survival gear** (p.295) · **Biotech & medical** (p.304) · **Skillsofts & chips** (p.296).

---

## 4. Checked and disconfirmed — do not re-file these

- **`sr3e-sr3-drones` and `sr3e-sr3-vehicles` are not empty.** They hold 6 and 23 documents. They
  are **Actor** packs, so a sweep counting only `!items!` keys reports zero. I made exactly that
  mistake mid-audit.
- **The repeated bow/sling names are Strength-Minimum variants**, not duplicate records.
- **`Tasr`, `Las`, `Net`, `NtGn`, `Flthr`, `MulWea` all resolve** to skills that exist.
  `Spray Weapons` is not in the core rulebook (0 occurrences) but is a real skill in `SR3ESkills`
  from Cannon Companion, so those map correctly.
- **CLAUDE.md's weapon-category table is abridged, not wrong.** It omits the special-weapon rows;
  the map in `SR3EItem.js` is the complete one.

---

## 5. What this does not cover

Cyberware (248 in the `sr3` pack alone), armor ratings, spells (96) and adept powers were **not**
stat-validated here — only their presence was considered. Adept powers already have their own
full audit in `adept-powers-audit.md`.

The other default-on books are untouched. See [TODO 91](../TODO.md#91).
