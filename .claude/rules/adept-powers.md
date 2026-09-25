---
paths:
  - "scripts/data/quick-strike.mjs"
  - "tests/adept-powers.test.mjs"
  - "tests/quick-strike.test.mjs"
  - "tests/astral-soak.test.mjs"
  - "tests/magic-attribute.test.mjs"
  - "audit/adept-powers-audit.md"
---
# Adept powers  · *SR3 p.168-170*

**117 powers across four packs** (`sr3` 42 · `mits` 26 · `sota2` 40 · `tss` 9). Inventory, per-power
classification and citations: **`audit/adept-powers-audit.md`**. Only these channels exist; everything else
is reference-only by design.

| Channel | Powers | Read at |
|---|---|---|
| `bonus*` attribute fields | Improved Physical Attribute, Improved Reflexes | `_prepareCharacter` |
| `improvedSkillName` | **Improved Ability only** | `skillBonusDice` |
| `improvedSkillCategory` | genuinely category-wide powers | `skillCategoryBonuses` |
| `system.attributeBoost` | **Attribute Boost only** — activated, expiring | `_prepareCharacter` |
| `derived.situationalBonuses` | a **situation** (`SR3E.adeptSituations`) | auto where a flow knows it; checkbox otherwise |

- ⚠ **A levelled power's `bonus*` is PER LEVEL** (`hasLevels: true`, e.g. `+1STR` on Improved Physical
  Attribute). Fixed-level powers (Improved Reflexes 1/2/3) are separate items with absolute values.
- ⚠ **`mods` is declared on `AdeptPowerData`** — TypeDataModels drop undeclared keys (TODO 59).
- ⚠ `tools/build-mods-bonuses.mjs` reads three files incl. `AdeptPowers.json`. `SRCG_BONUSES` entries
  carry a **`type` guard**: keyed by name across three item types, so `_patchItemsByName` and the pack
  patcher must skip a type mismatch.
- ⚠ **`adeptPowerLevel` is NOT `system.level`** — 19 powers carry their level in the NAME with
  `hasLevels: false` (`Combat Sense +3`, `Kinesics Level 3`). Effects only: Power Point cost and the Level
  column keep `system.level`.
- ⚠ **Situational channel exists because `skillBonusDice` promises "always applies"** — Counterstrike
  (counterattacks only), Sixth Sense (one Reaction Test type) can't ride it. Never widen `skillBonusDice`.
- ⚠ **Situational bonuses SUM** across powers (Rooting + Enhanced Balance) — unlike `reflexBonus`. Both asserted.

### Attribute Boost is ACTIVATED — never passive  · *p.168-169*
`SR3EActor.openAttributeBoost` → `tickAttributeBoosts` → `_postAttributeBoostDrain`:
1. **Magic Test**, TN = ½ the **base** rating (round up). No successes → no boost.
2. Attribute + level, ceiling **2× Racial Modified Limit**.
3. Lasts **Combat Turns = successes** (per Foundry round, never per pass), counted down on `updateCombat`.
4. On expiry: **Drain**, TN = ½ the **boosted** value (round up), Willpower, 2 successes per level, **always Stun**.
- ⚠ The two TNs read different numbers (base vs boosted) — asserted in `tests/adept-powers.test.mjs`.
- ⚠ **Never fill `bonusStr` for it**; `_prepareCharacter` has an explicit `continue` for `attributeBoost` powers.
- ⚠ **No successes = NO Drain** — the opposite of Conjuring (adjacent branches in `_postWaveCard`).
- ⚠ `SR3E.racialLimits` (p.245) exist **only** to grade this Drain; they cap nothing.

### Improved Ability is capped  · *p.169* — TODO 60, 61
> "You cannot have more additional dice than your base skill rating or your Magic Attribute, whichever is less."
- `SR3EActor.improvedAbilityDice({level, skillRating, magic})` = `min`. Applied **after** Magic is derived
  (needs effective Magic): the adept loop collects `pendingImprovedAbility`, a second pass caps. The
  breakdown shows the full level with the cap noted.
- **Defaulting carries half**: `defaultTiers`' Skill tier adds `floor(bonus / 2)`, after the cap, and halves
  cyber/bio dice on that skill too (the map is source-agnostic by design).

### Improved Reflexes does not stack with technology  · *p.169* — TODO 64
`SR3EActor.reflexBonus` returns **one** package (never a sum) and reports what it dropped. Initiative dice
decide, then Reaction; ties to the adept. ⚠ **Resolved ONCE**, read by both the Reaction derivation and
`initiativeDice` — never derive twice.

### Missile Parry  · *p.170*
A third option in the defence declaration, when the defender has it and the weapon is catchable.
Pure: `SR3EActor.missileParryTN`, `missileParryOutcome`, `canMissileParry`.
- ⚠ **TN = `10 − the attack's base range TN`** (floor 2, editable). The book's "10 − 8 at long range"
  wrongly uses the grenade column; the Weapon Range Table's Long is 6, and the rule sentence governs.
- ⚠ **Rolls REACTION plus optional pool** — zero pool is a valid parry.
- ⚠ **A failed parry carries NOTHING** into the soak — never unify with `dodgeOutcome`.
- ⚠ `projectile` and `thrown` only (no firearms; grenades never reach the declaration).
- ⚠ **Ties go to the attacker.** Free Action cost not modelled (the card says so).

### Quick Strike  · *MITS p.151* — TODO 78
- ⚡ on the adept's tracker row (`SR3ECombat.renderQuickStrike`); moves their pending slot this pass to the
  front of the stored queue (`SR3ECombat.quickStrike`, `scripts/data/quick-strike.mjs`); players go via
  `sr3e.combat.quickStrike`.
- ⚠ **Never an initiative write**. ⚠ The slot is **moved, not copied**. Once per Combat Turn (`quickStrikeRound`).
- "Unwounded" = derived `woundMod` of 0 (the maintainer's ruling; Pain Resistance/Compensators count).
  Confirms rather than refuses.

### Direct-effect powers
| Power | Effect | Where |
|---|---|---|
| Combat Sense | +N **Combat Pool** dice · p.169 | `combatPool` derivation |
| Pain Resistance | level off the damage used for the **injury-modifier lookup** · p.170 | `woundMod`, recomputed in `_prepareCharacter` |
| Mystic Armor | +N **Impact** armour, cumulative · p.170 | soak card; **astral soak** as −N Power (`astralSoakTN`, p.175) |
| Penetrating Strike | −N the **target's** Impact armour · SOTA2 p.67 | soak card, from the payload |
| Killing Hands | replaces unarmed (STR)M Stun with (STR)*level* **Physical** · p.170 | declared in the called-shot dialog |

- ⚠ **Pain Resistance changes the LOOKUP, never the track.**
- ⚠ **Killing Hands REPLACES the level** (never stages it) and is **declared per attack**.
- ⚠ **Mystic Armor goes on BEFORE the ammo rules** (survives Flechette doubling). Counts only for
  `magicType: 'Adept'`.
- ⚠ **Astral soak** (`_postAstralSoakCard`, p.175): worn armour has no effect; `astralSoakTN` takes Mystic
  Armor off the Power and nothing else.

### The item sheet offers fields by POWER KIND
`SR3E.adeptPowerKind(name)` classifies by shipped name (upstream has no type). Offering a control claims it
does something — so no "Improves Skill" on Attribute Boost. Migration `0.4.5.6` clears that field on
Attribute Boost items via `fixItem` (a scoped, justified overwrite).
⚠ `QIC` is an upstream typo for Quickness; `attributeBoostTarget` accepts it beside `QCK`.
