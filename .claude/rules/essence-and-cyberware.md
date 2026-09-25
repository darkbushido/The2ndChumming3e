---
paths:
  - "scripts/SR3EMods.js"
  - "scripts/SR3EStress.js"
  - "scripts/data/essence-holes.mjs"
  - "scripts/data/cyberzombie.mjs"
  - "scripts/data/stress.mjs"
  - "scripts/data/cyber-slots.mjs"
  - "scripts/data/item-rating.mjs"
  - "scripts/data/gear-ratings.mjs"
  - "scripts/data/rating-name.mjs"
  - "scripts/data/move-by-wire.mjs"
  - "scripts/data/srcg-bonuses.js"
  - "scripts/data/cyberware-names.js"
  - "scripts/data/skill-rules.mjs"
  - "tools/build-mods-bonuses.mjs"
  - "tools/build-gear-ratings.mjs"
  - "tools/patch-name-ratings.mjs"
  - "tests/essence*.test.mjs"
  - "tests/cyberzombie.test.mjs"
  - "tests/stress.test.mjs"
  - "tests/cyber-slots.test.mjs"
  - "tests/item-rating.test.mjs"
  - "tests/move-by-wire.test.mjs"
  - "tests/mods-parser.test.mjs"
  - "tests/skill-bonus.test.mjs"
  - "tests/skill-category-bonus.test.mjs"
  - "tests/attribute-sources.test.mjs"
  - "tests/implant-armor.test.mjs"
  - "tests/cyberware-names.test.mjs"
---
# Essence, cyberware and bioware

### Essence is permanent  · *M&M p.147*

`essence.value` is **derived** every `prepareDerivedData`. The persisted number is **`essence.lost`**, nullable:

| `lost` | Meaning | Essence |
|---|---|---|
| `null` | nothing recorded | `base − installedCyberwareCost` |
| a number (incl. `0`) | authoritative | `base − lost` |

> "Cyberware that is removed **does not restore the character's lost Essence**." — *M&M p.147*
> (SR3 core p.60 only covers install.)

- ⚠ **A recorded number wins outright — never `max`ed against installed hardware**, so a GM can correct
  a mistaken install. Permanence means removal doesn't refund *by itself*, not that the GM is overruled.
- ⚠ **`lost` ACCUMULATES on install**: `lost = max(lost, installedBefore) + cost`. The `max` only seeds
  actors saved before the field existed. A running max of what's fitted would let removed chrome
  "cover" new chrome.
- ⚠ **No delete hook, deliberately** — anything on delete could only lower the mark. One `createItem`
  hook, active GM only.
- Bio Index capacity (`essence + 3`) and effective Magic (`essence − totalBioIndex / 2`) hang off Essence.
- **Sheet:** the Essence box writes the derived field; `SR3EActor._preUpdate` translates that into `lost`.
  Beneath it, `lost` itself is editable (placeholder = installed total); **↺** resets it to `null`, never `0`.

**The Essence hole** (TODO 53, `scripts/data/essence-holes.mjs`): one pooled number, `system.essenceHole`.
Removing cyberware adds its graded cost — ⚠ **never touching `essence.lost`** — and an implant with
`essenceSlot` ticked fills it down at install (M&M p.150's opt-in Essence Slot surgery option, +2
Threshold; stated, not enforced). ⚠ A partly filled hole keeps its remainder. The GM edits it for
bookkeeping only; nothing else regains Essence. Player writes are dropped (`stripPlayerEssenceWrites`).
⚠ **Not the Essence *slots* of M&M p.127** (installed cyberware; see *Cybersystem damage*).

**Near the edge** (TODO 103, `SR3EActor.essenceState`): below 1 is legal (SR3 p.55) → **amber**; 0 or less
is death → **red**. Shown, never enforced. ⚠ Below 1 needs no drugs — that's cybermancy (M&M p.50, p.54).

### Cyberzombies · *M&M pp.50-59* — TODO 111

`system.cybermancy = { is, cds, treatments, cancer }`; rules in `scripts/data/cyberzombie.mjs`.
- ⚠ **The ONE case where Essence may be ≤ 0**: `essenceValue` keeps the negative only with the flag, the
  sheet's floor opens, and `essenceState` returns `cyberzombie` not `dead` — CDS is graded below zero.
- **CDS** (p.59): the GM's periodic Willpower Test (⚰ CDS check, Cyber tab). 6 months/TN 3 at 0 to −0.50
  … every 2 months/TN 8 from −3.51, *"+1 … for every additional -0.5"* — ⚠ match that open-ended row
  separately. Failure: can't initiate action, +4 Perception / +3 all else, dies in 3 + Willpower weeks.
  Stated, not applied.
- ⚠ **Treatment is inverted, not a typo**: Spell Resistance (8), *"if the test succeeds … the character
  dies"*; −1 per repeat, min 2. Recovery: a week, −1 day per success on Willpower (6).
- **Cancer** (p.59), once at the operation: 2D6 under 2 × |Essence| → cancer in 10D6 months, fatal in
  4 + 1D6 weeks. Body/symbiote modifiers are *"at the gamemaster's discretion"*.
- Scheduling (every N months) is not modelled.

### Cyberware/bioware bonuses — the `Mods` field

Upstream (`criticalfault/Shadowrun-Character-Generator`) encodes effects as `+2RCT,+1INI,`.
`scripts/SR3EMods.js` parses it; `tools/build-mods-bonuses.mjs` generates `scripts/data/srcg-bonuses.js`
(**generated — never hand-edit**), feeding both the pack patcher and the world migration.
- ⚠ **Parse `Mods`, never `Notes`** (upstream issue #199).
- ⚠ **Two racial encodings coexist**: `ROD` `RTR` `RCK` `RNT` `NCT` `NNI` `XOD` (Bioware) and `RBOD`
  `RSTR` `RQCK` (AdeptPowers). Both collapse to the plain attribute; no racial maxima.
- ⚠ **Most codes are NOT attributes**: `STG` `MNE` `DGX` (karma/lifestyle), `DJK` `PCL` `PCA` `MUL` `AST`
  (equipment flags); `IMP`/`BAL`, `TAS`/`HAC`/`CPL`, `VCT`/`VNI`/`VCR` have no SR3E field. Every token lands
  in `bonuses`, `flags`, `unmapped` or `unparsed` — nothing discarded.
- ⚠ **Cyberware/bioware `bonus*` fields have NO `min`** (three entries are penalties like `-1RCT`).
  AdeptPowerData keeps its floor deliberately.

### Skill bonus dice — two channels, NOT interchangeable

| | `derived.skillBonusDice` | `derived.skillCategoryBonuses` |
|---|---|---|
| keyed by | skill **name** | skill **category** |
| applied | **automatically**, every roll path | **opt-in** checkbox on the Roll Skill dialog |
| read via | `SR3EItem._skillBonusDice` | `SR3EActor.skillCategoryBonus` |
| fed by | `improvedSkillName` + `improvedSkillDice` | `improvedSkillCategory` (comma-separated) + `improvedSkillDice` |

- ⚠ **Don't fold the second into the first.** Enhanced Articulation (M&M p.66) covers *"physical use of
  Vehicle Skills"* but not *"driving a car via datajack"* — same skill, different act. Hence the per-roll
  checkbox in `SR3EActorSheet._promptSkillRollOptions`.
- ⚠ **FIVE categories** (don't miss Vehicle). ⚠ **`Martial Arts` counts as `Combat skills`**
  (`SKILL_CATEGORY_COUNTS_AS`, CC p.87) — one-way, on the category, a bonus covering both pays once.
- ⚠ Vehicle skills start **unticked**, everything else ticked.
- ⚠ **Split the category field on COMMAS only** — `Build/Repair skills` has a slash.
- The sheet skill row and the skill item sheet's roll button share one dialog.

### Triggered cyber/bioware  · *M&M p.63, p.71* — TODO 30

`SR3E.triggeredAugmentations` classifies them; `system.augmentations` (keyed by item id) holds state.

| | Kind | Effect |
|---|---|---|
| Adrenal Pump [1]/[2] | **duration** | +1 QCK / +2 STR / +1 WIL / +2 REA **per level** |
| Pain Editor | **toggle** | +1 WIL, −1 INT, Stun wound modifiers ignored |

- ⚠ **Adrenal Pump is a DURATION** (1D6 Combat Turns per level), counted down on the `updateCombat` round
  hook beside `tickAttributeBoosts`. On expiry: Body Test vs **(turns it ran)D Stun**, Power from
  `rolledTurns` recorded at activation. ⚠ Goes through the soak card with **`noArmor`**, using
  `stagedPower`/`stagedLevel` (`tests/soak-payload.test.mjs`).
- ⚠ **WHERE the bonuses apply is the rule** (p.63: Quickness not to Reaction, Reaction not to Control Pool,
  Quickness and Willpower to Combat Pool): applied **after** Reaction derivation, **before** the pools.
  Moving the block breaks a clause. `tests/adept-powers.test.mjs` uses QUI 4 / INT 5 because the orderings differ there.
- ⚠ **Pain Editor recomputes the wound modifier from the PHYSICAL track** — it does not zero it.
- **Damage Compensators** (M&M p.71, TODO 116), passive: `SR3EActor.damageCompensatorLevel(items)`
  (highest, via `itemRating`) comes off both tracks before the injury lookup; takes the **larger** with Pain
  Resistance (M&M p.78, *"incompatible"*). `painEditorHidesWounds` also hides compensated characters.
  Their Stress effects aren't modelled.
- **Nephritic Screen** rides `situationalBonuses` key `toxin`, like Body Control; a dwarf's racial +2 (SR3
  p.56, `SR3E.racialSituational`) joins them. Offered on the attribute-roll dialog as one unticked
  checkbox while Body is selected (`SR3EActor.toxinResistanceOffer`, TODO 98) — never added to `body.value`.

### Stress on implants and Attributes  · *M&M pp.124-131* — TODO 109

Rules `scripts/data/stress.mjs` (pure); dialog/card `scripts/SR3EStress.js`. Fields: `stress` on cyberware
(starts 0) and bioware (**starts 1**), `integrity` (cyberlimb Integrity Enhancement), `system.attributeStress`.

| | |
|---|---|
| Stress Level | 1-2 Light · 3-5 Moderate · 6-9 Serious · **10+ Deadly = automatic failure** |
| Stress Test dice | cyberware Basic 1 / Alpha 2 / Beta 3 / Delta 5 · bioware Cosmetic 1 / Basic 2 / Cultured 4 · an Attribute **half its unaugmented rating** |
| Target number | **the current total** − a cyberlimb's Integrity Rating + a bioware Attribute boost |
| A wound effect | **1D6 ÷ 2** Stress, then the test |

- ⚠ **TN is the NEW total** (p.126's example). ⚠ **One success avoids failure** — a check, not graded.
- ⚠ **The 1D6 ÷ 2 must NOT go through `rollPool`** — no Rule of Six. It rounds **down** (M&M is silent;
  the maintainer's to settle).
- ⚠ **Nothing automatic**: ⚙ Apply Stress is GM-only; the soak card never reaches in.
- Not built: Stress Maintenance/repair (p.130-131), bioware malfunction thresholds, Fragile/Rugged (p.148).

### Cybersystem damage — Essence slots and the Wound Effect Table  · *M&M pp.126-129* — TODO 129

Rules `scripts/data/cyber-slots.mjs` (pure). 🎲 **Wound effects…** (Cyber tab, GM-only) → a card naming
what each effect hit → ⚙ **Apply Stress — <implant>** (TODO 109's dialog, pre-filled).

| Step | Rule |
|---|---|
| How many effects | Damage Resistance Test read as a Success Test: **boxes − the highest die** · p.127 |
| What kind | 1D6: **1-2 cybersystem · 3-4 bioware · 5-6 organic** · p.127 |
| Which system | 1D6 against the **six Essence slots**, one per point of Essence · p.127 |
| Bioware | same procedure with **Bio Index slots** · p.128 |
| The Stress | 1D6 ÷ 2 and a Stress Test (TODO 109) · p.127 |

- ⚠ **Count = MARGIN OF FAILURE, not successes** (1,1,2,2,3 vs 6 boxes = 3). Mutant `wound-effects-count-successes`.
- ⚠ **A partly filled slot is a CHANCE** (p.128); `hitChance` = filled fraction. Mutant `half-slot-is-a-certain-hit`.
- ⚠ **Ignore, never re-roll** an effect on an empty slot or a type the character lacks.
- ⚠ **Never pick within a slot** — `systemHit` returns candidates with shares (sum 1, for the optional 1D10); the GM chooses.
- ⚠ **Slots hold GRADED Essence** (alphaware VCR = 2.4).
- ⚠ **Electrical damage skips the Wound Effect Table** (p.129): straight to system affected, plus 1D6 each where 1-2 hits another implant.
- ⚠ **Cyberzombies wrap** to slot 1 and can damage two systems at once (`system.cybermancy.is`).
- ⚠ `assignSlots` is pinned to Leggy's printed slots (p.127); the reaction enhancers' "Essence Cost .6"
  is the pair's combined cost.
- ⚠ **Offered, never automatic** — `tests/cyber-slots.test.mjs` asserts `SR3EActor.js` never calls it.
- Not built: Cyberware Failure Table (p.128), bioware Stress side effects.

### Item ratings — one reader  · TODO 118, 122

`scripts/data/item-rating.mjs`: `itemRating(item)`, `vcrLevel(item)` (≥ 1 for a rig that exists),
`ratingFromName(name)`, `displayName(item)`. **Never read `system.rating` directly on gear, cyberware,
bioware or medical items** (`tests/item-rating.test.mjs` checks).

- **The field is the rating; `null` means NO rating** (gear/medical/cyberware/bioware; `GearData.rating`
  nullable, initial null). A number is the rating; `null` = none (name not consulted); `0`/missing =
  **legacy** → the name's `[N]` / `Rating N`, then `GEAR_RATINGS`.
- ⚠ The rating often lives only in the NAME (`Wired Reflexes [2]`, `Vehicle Control Rig [1]`).
- ⚠ Not ratings: a bare trailing number ("Predator 2"), a non-digit bracket ("[Initiate Grade 2]"), a range ("Rating 4-8").
- `preCreateItem` (`ratingOnCreate`) fills a new gear item's field. The sheet's Rating box is blank with
  the name's rating as placeholder. Migration 0.5.2 / `tools/patch-name-ratings.mjs` fill from names and
  turn unfillable legacy `0`s into `null` (a test sweeps the packs).
- ⚠ **`GEAR_RATINGS`** (`gear-ratings.mjs`, **generated** by `tools/build-gear-ratings.mjs`): 253 gear
  names rated only in the generator's Rating column (Basic Medkit 3, Medkit 3 from SR3 p.304…). Names
  rated inconsistently upstream (Gyro Mount 5/6/7) are left out.
- `displayName` shows `Medkit [3]` and never doubles a bracket.
- ⚠ **Weapons have NO rating field, by design** — none of 517 weapons carries one; the test asserts the
  four weapon models stay without it.
- ⚠ Implant `0` and `null` read the same number, so TODO 122 needed no migration (asserted). If that
  ever stops holding, a migration is owed.
- ⚠ `medical` ratings are **strings** (`"+2"` Biotech) — excluded from the null conversion.

### Cyberware grades  · *M&M p.45* — TODO 86

`SR3EActor.gradedEssenceCost(cost, grade)` applies before `installedEssenceCost` sums. Registry
`SR3E.cyberwareGradeEssence`.

| Grade | Essence | Cost | Availability |
|---|---|---|---|
| Alpha | **× .8** | 2 | Standard |
| Beta | **× .6** | 4 | +5 / × 1.5 |
| Delta | **× .5** | 8 | +9 / × 3 |
| Used | **by grade** | .5 | Standard |

- Only the Essence multiplier is used here (cost/availability belong to purchasing).
- ⚠ **Round UP, per item, to 2dp** — never the total. ⚠ **Strip float noise first** (0.2 × 0.8 → 0.16, not 0.17).
- ⚠ **Grade the BASE once — `SR3EActor.baseEssenceCost(item)`** (TODO 101): the contacts pack stores the
  base in `essenceCost`; the item sheet and importer (`importedCyberwareCosts`) store the graded figure
  with the base in `essenceCostBase`. A stored base wins.
- ⚠ **The .01 floor is on the REDUCTION** — base 0 stays 0.
- ⚠ **Unknown grade = FULL Essence** (Cultured/Exotic, typos). Over-refunds can't be taken back.
- ⚠ **"Used" modifies a grade** — stripped; `'Used Alpha'` = alpha, bare `'Used'` = basic.
- ⚠ Bioware never reaches this (charged against Bio Index).
- ⚠ `SR3E.cyberwareGrades` is just the dropdown's name list — not the multiplier map.
- ⚠ Keep `CyberwareData.grade` — salvage value depends on it; never collapse into a pre-multiplied number.

### Move-by-wire  · *M&M p.60*

Pack data is correct and asserted: rating N → **+N QUI, +2N REA, +N initiative dice, +N Athletics/Stealth dice**, ratings 1-4.
- ⚠ **Its Quickness is excluded from Reaction and nothing else** — it does raise Combat Pool. Both halves asserted.
- Passive, so unlike the Adrenal Pump it can't be fixed by ordering: the exempt part accumulates in
  `cyberBonus.quiNotForReaction` and is subtracted at derivation. Registry `SR3E.quicknessNotForReaction`
  — **named implants**; **Muscle Replacement** shares it (same wording), Muscle Augmentation doesn't.
- ⚠ **Packs ABBREVIATE names** — `Muscle Replac. [1..4]`, `Reaction Enhance [1..6]`. **Match a stem, never a full name.**
- ⚠ The incompatibility with other reaction enhancers is **reported, never enforced**
  (`derived.reactionExclusiveConflict`, registry `SR3E.reactionExclusive`) — unlike `reflexBonus`.
- Rating 3/4's forced extra Complex Action is not modelled.
- **Side effects** (TODO 110, `scripts/data/move-by-wire.mjs`): automatic Stress, 1 point every
  6/4/2/1 months at ratings 1-4 to Quickness and Reaction (shown; applied via ⚙ Apply Stress). **TLE-x**: each
  time the system takes Stress, unaugmented Willpower (rating × 2), offered on the Stress card;
  `system.tlex = { has, surgeries }`, max two brain surgeries (Correct Failure, base TN 8). ⚠ The GM-judged
  penalties (−1 Charisma socially; +2 Perception / −2 Init / −1D6 Reaction when crucial) are stated, never
  applied. CCSS not modelled.

### Enhanced Articulation's Reaction stops at rigging and decking  · *M&M p.66*

`derived.reactionNoRigDeck` = Reaction minus the exempt bonuses; read only by **remote-control rigging** and
**TRM/AR/VR-Cold decking** (VCR, VR-Hot and Orthodox read `reaction.base` anyway).
- ⚠ **Only that bonus** — wired reflexes still apply to decking; don't switch these paths to `reaction.base`.
- ⚠ Subtract only when the **cyber** package actually landed (`reflexBonus` may have picked the adept one).

### Where an attribute's modifiers come from — `derived.attributeSources` · TODO 100

`_prepareCharacter` records each bonus **as it is applied** — `{ label, amount, kind, note }` per attribute
plus `initiativeDice`; the Attributes tab shows them on hover (`SR3EActor.attributeBreakdown`,
`attributeSourceSum`). Kinds `cyber` `bio` `adept` `racial` `boost` `triggered`; `note` = didn't apply.
- ⚠ **base + sources = the value every roll uses** (`tests/attribute-sources.test.mjs`). A new bonus must
  be recorded with `_source(…)` beside its arithmetic.
- ⚠ The sheet's bracketed total is `attr[key].value`, never a sum it computes.
