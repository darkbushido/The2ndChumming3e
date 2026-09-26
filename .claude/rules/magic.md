---
paths:
  - "scripts/documents/SR3ESpiritSummoning.js"
  - "scripts/documents/SR3EWard.js"
  - "scripts/sheets/SR3EWardSheet.js"
  - "scripts/data/sustaining.mjs"
  - "tests/sustained-spells.test.mjs"
  - "tests/spell-defense.test.mjs"
  - "tests/elemental-spells.test.mjs"
  - "tests/spirit-flags.test.mjs"
  - "tests/magic-attribute.test.mjs"
  - "tests/astral-soak.test.mjs"
  - "tests/spell-damage.test.mjs"
  - "tests/e2e/spellcasting.spec.mjs"
  - "tests/e2e/astral-two-corner.spec.mjs"
---
# Magic — astral state, sustaining, Spell Pool, spellcasting, conjuring

### Astral state  · *SR3 p.41, p.62*
`system.astralMode`, toggled on the Magic tab (one at a time; clicking the active one clears it):
`''` none · `'physical'` (grey badge) · `'dual'` (amber "Dual Nat.") · `'astral'` (purple; **INT + 20 + 1d6** initiative).

### Sustained spells  · *SR3 p.178, p.180, p.183*
> "+2 target modifier per sustained spell applied to all tests, including Drain Resistance Tests (but not
> normal Damage Resistance Tests). You can simultaneously sustain a number of spells equal to your Sorcery rating." — p.178

`system.sustainedSpells` — `[{ id, name, force, spellItemId, target, focus }]`. Rule in
`scripts/data/sustaining.mjs`; `SR3EActor.sustainingTN(actor)` reads it. (`SR3EActor.standingTN` =
sustaining + drugs is what "all tests" sites add — see drugs.)

| Where | How |
|---|---|
| `rollPool` | added unless `skipSustainMod` — **its own opt-out**, not `skipWoundMod` |
| Ranged roll options · sheet attribute/skill dialogs | pre-applied in the TN beside the wound, then `skipSustainMod` |
| Melee (GM window base TNs) · astral · both dodge prompts | beside `woundTN`, each fighter's own |
| Contested · cybercombat · Orthodox · MIJI/EW · knockdown · vehicle weapons | beside `woundTN` — ⚠ **also on defences p.125 spares the wound** (cybercombat defender, IC defence, Missile Parry) |
| Drain Resistance | yes — a spell's own Drain counts what was held **at casting** (`spellContext.sustainTN`), never itself |
| Damage Resistance (soak) | **never** |
| Spell Resistance Test | **yes** (the maintainer's ruling: p.178 over p.183). Wounds still skip it |

- ⚠ **One modifier, stated three times** (p.178, p.180, p.183) — never +4 on Drain.
- ⚠ A **focus**-held spell costs nothing and doesn't count against the limit. The limit is shown, never enforced.
- Start: **🔒 Sustain** on the cast card (`_mine`) for a Sustained/Permanent spell that took effect, or
  *+ Sustain a spell* on the Magic tab — **never automatic**. Stop: ✕.
- **Taking damage** (`preUpdateActor` on the changing client): a card with 🎲 **Keep** per
  concentration-held spell, Sorcery vs Force + injury modifiers via `rollPool`. Nothing drops by itself.
- Not modelled: Exclusive actions forcing a drop; Permanent spells' base time.

### Spell Pool  · *SR3 p.43*
⌊(INT + WIL + MAG) / 3⌋ (effective Magic); `spellPoolSpent`, manual `spellPoolMod`; null/hidden when Magic = 0.
Sheet shows available / total.

### Spellcasting flow
1. Cast → Force dialog, **capped at the spell's learned `force`** (SR3 p.178; ⚠ null = not recorded, caps
   nothing; clamp on read, not just `max=`). Note if Force > Magic. **Combat and Elemental**
   (`SR3EItem.spellChoosesDamageLevel`) add a **Damage Level** dropdown (default the item's, else M), driving
   both the target's damage and the Drain level. **AoE** = Range contains `(A)` (no separate flag): base radius
   Magic metres, widened +1 m / narrowed −1 m per 2 by **withheld Sorcery dice** (not rolled) —
   `SR3EItem.spellAreaRadius`, SR3 p.181 (TODO 171).
2. Targeting — **Single**: target dialog. **AoE**: `_placeBlastTemplate` → `_actorsInRadius` auto-picks every
   live non-vehicle actor **including the caster** (*"friend and foe alike (including the caster)"*, p.181; no
   scatter/falloff); purple Region marker (`_drawBlastArea`) with
   🧹. Off-canvas → `_promptTargetsMulti`. Empty area still casts (Drain applies).
3. Spell Pool dialog.
4. **Cast**: Sorcery + Spell Pool vs **the spell's Target attribute** on the target —
   `SR3EItem._parseSpellTarget` (the single parser for cast TN and resist): `W` `B` `I` `Q`; `F` = Force as TN;
   number = fixed TN; blank/`OR`/unknown → Mana=Willpower, Physical=Body. `(R)/(T)/(RC)/(V)/(DT)` suffixes
   stripped. ⚠ **Several targets: one roll, each against its own TN** (p.182) — dice roll at the **hardest** TN
   and `SR3EActor.hitsAgainst` counts them per target; a target the dice didn't reach gets no Resist button;
   Spell Defense reduces each count.
5. Final wave: 0 successes → fails, Drain still posted. Else each target gets **Resist Spell**
   (`SR3EActor._spellResistButton`, caster's successes + base damage; not pre-staged); caster gets
   **Resist Drain**. Damage track: **Physical unless a stun spell** (`SR3EItem.spellDealsStun`, p.191, TODO 169). The card shows the TN's source (`spellContext.tnSource`) and the cast's staging. Anyone
   with Spell Defense → a **Counterspelling** card first (`_postSpellResistOrDoneCard`).
6. **Resist Spell** (`_postSpellSoakCard` → `handleSpellResistRoll`): the Target attribute only, no pool, vs
   **TN = Force**. Net = caster − resister (`isSpellResist` in `_postWaveCard`): ≤ 0 no effect, else
   `stageDamage(base, net)` → **Assign Damage**. **No separate soak.**
7. **Drain**, Willpower — `SR3EItem.parseDrainFormula(drainStr, force, damageLevel)`:
   - **TN** = ⌊Force/2⌋ + the modifier **outside** the brackets (½F implicit).
   - **Level** = nominated level + the modifier **inside** (`(DL+1)`/`(+1)` = +1; `(DL)`/`()` = 0; `(DL-1)` = −1).
     Manaball `(DL+1)`, F6, Serious → **3D**. Legacy explicit `F` formulas (`(F/2+1)S`) are the TN.
     Past Deadly, the surplus adds Power (p.191, TODO 170).
   - **Physical if Force > Magic** (effective `SR3EActor.magicAttribute`, not Sorcery) **or astrally
     projecting** (p.183) — `SR3EActor.drainIsPhysical(force, attr, { astral })`; astral half is casting only.
   - ⚠ Resisted with **effective** Willpower (Charisma for conjuring) — `SR3EActor.drainResistRating`.
   - ⚠ **Sorcery Rule of One: +2 Drain TN** (p.182), carried as `castGlitch`, added in `_postDrainCard`,
     **cumulative** with sustaining. The Detection-spell "GM lies" consequence is the GM's.

**Elemental Manipulation** · *SR3 p.183, p.196*: dodged like ranged attacks. `_spellResistButton` checks
`sc.isElemental` (`SR3EItem.isElementalSpell(category)`) and posts the **ranged `.sr-dodge-declare-btn`**
(staged by the caster's successes); dodge, carry and soak are the gunshot's. The soak halves **Impact** only
(`SR3EActor.elementalImpact`, round down) — ⚠ Mystic Armor is halved with it. ⚠ **Every target in an area
elemental spell dodges** (the maintainer; MITS p.56). ⚠ `_soakButtonHtml` lists its fields — `elemental` is
one. Secondary effects stated, never applied.
- **Cover and visibility** (p.183, TODO 131): the cast opens the ranged GM window through
  `sr3e.spell.negotiate` (same `gmApprovesTN` rule) after targets, **before the Spell Pool**. Rows are
  `spellModifierGroups()` — no Gear; an **area** cast also drops Target (p.182: behind a wall still gets
  cooked), so its visibility is the caster's view of the centre. ⚠ Range is never a row (*"regardless of
  range"*); ⚠ **touch range never asks** (p.182, `SR3EItem.spellTakesGMWindow`). The GM's difference moves
  `tn` and every `targetTNs` entry alike; wounds and sustaining stay `rollPool`'s.

**Spell Defense is declared per mage, on that mage's client.** `rollInitiative()` ends with
`SR3EActor.promptSpellDefenseDeclaration(combatants)`: one `sr3e.spelldefense.declare` per Sorcery-capable
actor to `SR3EQuery.deciderFor(actor)`; the handler opens `promptSpellDefenseFor`, commits
(`commitSpellDefense` → `sr3e.actor.set`, `spendSpellPool` → `sr3e.pool.spend`) and posts a summary.
- ⚠ **Deliberately NOT awaited as a set** — round start must never block on an AFK mage. No `await Promise.all`.
- ⚠ Never go back to one shared card where the GM commits everyone's Spell Pool.
- `tests/spell-defense.test.mjs`.

### Conjuring  (`SR3ESpiritSummoning.js`)
1. `openSummonDialog`: spirit type, Force, **hold-back dice** (0 … Conjuring−1, for the Drain). Live preview of
   Drain level and Stun/Physical.
2. **Conjuring Test** (`rollPool`, `isConjuringRoll`): Conjuring − held back vs **TN = Force**; each success =
   one service; 0 → no spirit.
3. **Drain — always, even on failure**: level from Force vs Charisma (`_conjuringDrainLevel`: ≤½C L, ≤C M,
   ≤1.5C S, else D), TN = Force, resisted with **Charisma + held-back dice** (`_postDrainCard`,
   `resistAttr:'charisma'`, `bonusDice`). Physical if Force > Magic.
4. `confirmSummoning` creates the spirit with *successes* services; added to the tracker **only if a combat is
   already started** — summoning never starts combat.
