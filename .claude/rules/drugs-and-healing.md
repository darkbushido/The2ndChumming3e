---
paths:
  - "scripts/SR3EDrugs.js"
  - "scripts/SR3EHealing.js"
  - "scripts/data/drug-rules.mjs"
  - "tools/fix-mm-drugs.mjs"
  - "rawdata/MM-Drugs.json"
  - "tests/drug-*.test.mjs"
  - "tests/healing.test.mjs"
  - "tests/e2e/healing.spec.mjs"
---
# Drugs and healing

### Drugs  · *M&M pp.105-110, 117-123* — TODO 124
Rules `scripts/data/drug-rules.mjs` (`DrugRules`, tested on the book's Cram example); cards/writes
`scripts/SR3EDrugs.js`; state `system.substances`, one record per `DrugRules.drugKey(name)`.
💊 on a drug row → dose card + a roll card per test → `rollPool` with `drugContext` (carried at all three 💥
sites) → result card whose buttons **offer** consequences (`.sr-drug-roll-btn` `_isDeciderId`,
`.sr-drug-act-btn` `_mineId`). The Gear tab's **Substance use** block advances the record (wears off, crash
over, stretch a fix, monthly test, kick it, no fix, a day passes, clear).

| Rule | Where |
|---|---|
| First dose: a test per addiction type vs the **base** rating — Willpower (M), Body (P), **unaugmented**, a dwarf +2 Body dice on P | `takeDose` · p.108 |
| Every Edge doses (**total** doses; pre-Edge until addicted, post after): Addiction and Tolerance +1, retest the modified rating | `takeDose` · p.108 |
| Failed: addicted, rating → base + 1 | `addictionResult` · p.108 |
| Tolerance: Body vs Tolerance **after it wears off**; no successes = tolerant | `toleranceResult` · p.109 |
| Kick: Willpower vs current +1 (M) / +3 (P) / +4 (both — the higher rating, editable) | `kickTN` · pp.109-110 |
| Withdrawal −1 every 2 days, forced −1 a day, to the base; then rest (Addiction Rating) days | `passDay` · p.110 |
| Standing TN: withdrawal +2, forced +3, recovery +1 (concentration ×2); forced = a Moderate Stun wound's modifier | `withdrawalPenalty` · p.110 |
| A dose in withdrawal, recovery or after kicking re-addicts, +1 | `takeDose` · p.110 |

- **Effects registry `DRUG_EFFECTS`** (by name, a page each: Jazz, Kamikaze, Cram, Novacoke, Bliss, Nitro, Zen,
  Psyche, Deepweed; notes for ACTH, Burn, Long Haul). Applied in `_prepareCharacter` **beside the Attribute
  Boost, before Reaction and the pools** (p.119). Drug Reaction adds to whichever p.169 package won; drug pain
  resistance takes the **larger** with the adept power.
- ⚠ **Durations are minutes/hours**, not Combat Turns — stated; ⏳ Wears off is a button. Crash and drug
  damage use the soak card with **`noArmor`**.
- ⚠ **`SR3EActor.standingTN(actor)` = sustaining + drugs**; every "all tests" site adds it (`sustainingTN`
  stays sustain-only); `rollPool` labels it `standingNote`; dodge prompts pass a separate `drugs:` term.
  `tests/drug-wiring.test.mjs` ratchets it.
- ⚠ **`edge` is its own field**; legacy `effect` (upstream's name for Edge) is still read by
  `DrugRules.drugEdge` — no migration. `tools/fix-mm-drugs.mjs` builds the M&M pack from
  `rawdata/MM-Drugs.json` (pp.122, 157-158). `build-default-gear` writes `edge`/`damage`.
- Not modelled: overdose (p.107), exposure/weapon delivery (p.106), the concentration half of the withdrawal
  TN (stated), tolerance decay.

### Guided healing  · *SR3 pp.125-129, 178, 193-194, 304-305; M&M pp.95, 136, 138* — TODO 115
`scripts/SR3EHealing.js`, from 🩹 **Healing** (sheet wound area, GM tools). Step menu → form → **roll card**
(`.sr-heal-roll-btn`, editable `.sr-heal-pool`/`.sr-heal-tn`, gated `_isDeciderId(rollerId)`) → **result
card** whose `.sr-heal-act-btn` buttons offer each consequence (`_mineId(ownerId)`). **Nothing applies
until clicked.**
- Rolls via `rollPool` with `healingContext`; the final wave calls `SR3EHealing.onRolled` (carried at all
  three explosion sites — Deadly first aid is TN 10). `skipWoundMod` on the patient's Body tests.
- ⚠ **Dice and TN are the GM's, read-only to players** (`SR3EHealing.wireCard`). A GM edit is **saved on the
  message** (flag `healRoll`) because the roll usually runs on the player's client. `rollFromCard` reads the
  boxes only for a GM; others roll the saved numbers, else the posted ones.
- ⚠ Chat number boxes need `.sr-roll-card input[type="number"]`'s colours (Foundry's `#222` is invisible on dark cards).
- ⚠ **A medic treats someone else's character.** `patientsFor`: your characters, every other player's, anyone
  visible (not hidden NPCs). Roll-produced buttons carry **`byId`**, gated `_mineAny(ownerId, byId)`. Changes
  go through **`applyToPatient`**: owner writes directly, anyone else sends the INTENT to the GM
  (`sr3e.heal.apply` → `_applyOp` in the actor's queue) — never a box count (wounds are accumulators
  `sr3e.actor.set` refuses). Money, Attribute and Magic loss stay the patient's.
- **⏱ Time boxes** (`_timeBox`, `_roadHtml`, `recoveryRoad`, `formatTurns`; a Combat Turn is 3 s, p.39) lead
  every card; the menu shows the Healing Table road.
- **`act()` returning `false` = cancelled**: `sr3e.js` hands the one-shot button back.
- ⚠ **Per-injury record = actor flag `healing`** `{stabilized, magicHealed, timeMultiplier, baseMultiplier}`,
  **cleared whenever Physical reaches 0** (by *Lower* or *Heal these boxes*). `magicHealed` blocks further
  Heal/Treat **and** first aid for these injuries (p.129, p.194).
- Rapid Healing (SR3 p.170): the `healing` situation adds to the patient's Body tests (`healingSituationDice`).
- ⚠ **Equipment ratings via `itemRating()`**; `findEquipment` takes the **best** usable item, skips storage.
- ⚠ **Medkit** (M&M p.136/138): no Biotech → its rating **is** the skill; with Biotech → **complementary dice**
  (not p.97's 2:1). `suppliesOut` (a 1 on 1D6, p.304) hides it until restocked (50¥). "Medkit Supplies" isn't a medkit.
- ⚠ **Spell Pool on a Heal card is spent on ROLL**, on the caster's client.
- Equipment detected by name (`SR3EHealing.EQUIPMENT`): stabilization unit (auto-stabilise, −2 on healing tests),
  trauma patch, antidote patch (rating in dice on stabilization). Pre-ticked, GM can untick.
- No successes on a stage → `null` — the card says it's the GM's call.
- Costs: Medical Costs Table + lifestyle (monthly ÷ 30); hospital/ICU meets the minimum lifestyle.
  **Charge** confirms before deducting `system.nuyen`.
