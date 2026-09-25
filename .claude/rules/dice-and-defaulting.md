---
paths:
  - "scripts/data/open-test.mjs"
  - "tests/rule-of-one.test.mjs"
  - "tests/defaulting.test.mjs"
  - "tests/opposed-explosions.test.mjs"
  - "tests/interactive-explosions.test.mjs"
  - "tests/explosion-carry.test.mjs"
---
# Dice rolling and defaulting

### Dice rolling — Rule of Six & Rule of One  · *SR3 p.38-39*
- d6 success-counting: result ≥ TN is a success.
- A 6 explodes. Each wave shows one "💥 Roll explosions (N dice)" button that re-rolls **all** of that
  wave's exploding dice, adding to each die's running total, wave by wave until none are left. A die
  stops exploding once its total ≥ TN.
- **Rule of One** (`SR3EActor.isRuleOfOne`, feeds all five roll paths): fires **only when every die is
  a 1** (p.38). Consequence is **GM adjudication**, no mechanical penalty, no second "critical" tier.
  ⚠ "More than half the dice are 1s" is **SR4's glitch** — do not introduce it.
- A single 1 is just that die failing.
- Initiative never explodes interactively — summed silently.
- ⚠ **Opposed rolls wait for BOTH sides' explosions** — melee, astral, contested, cybercombat.
  `SR3EActor._openOpposed` posts a **⏳ card** whose message flag holds both sides' dice; each wave card
  carries `opposed: {messageId, side}` through its 💥 payload; a side's final wave settles through the GM
  (`sr3e.opposed.settle`, serialised per message), and the side that completes the set posts the result
  (`postOpposedResult`). ⚔ Resolve (GM) settles with the dice as they stand.
  ⚠ **A shared record, not an in-memory map** — the sides explode on different clients.
  ⚠ Settle **after** the wave card is posted, or the result lands above the dice that decided it.
  A new opposed roll must go through `_openOpposed` (`tests/opposed-explosions.test.mjs`).
- ⚠ **EVERY explosion is a 💥 click, and the next step waits for it** (the maintainer). Never loop
  `_rollWave` yourself. Two helpers on `SR3EActor`, neither adds cards when nothing explodes:
  - `rollOpposedPair(kind, ctx, atk, def)` — two rolls compared on the ⏳ card, result by `OPPOSED_RESULTS[kind]`.
  - `rollThen(actor, pool, tn, {label, followUp: {kind, ctx}})` — one roll, then `FOLLOW_UPS[kind](ctx, res)`,
    run by `_postWaveCard` on the final wave, on the rolling client.
  Both registries name `[class on game.sr3e, method]`, so `ctx` must be plain JSON (ids, not actors).
  `tests/interactive-explosions.test.mjs`: the only `_rollWave(…, false, …)` in `scripts/` is the 💥 handler.
  Chase Driver Points (an Open Test, p.40 — every 6 rolls again, no TN) use `scripts/data/open-test.mjs`;
  its 💥 is gated to the roller, since chase state lives in that user's window.

### Defaulting (SR3 Default Table) — interactive  · *SR3 p.84-85*

`SR3EItem.promptDefaultChoice(actor, opts)` → `{ mode, pool, tnMod, allowPool, poolCap, label }`, or
`null` if cancelled (callers abort the whole action). Table, p.85:

| Default To | TN Modifier | Dice Pool |
|---|---|---|
| Specialization | +3 | = to ½ specialization's base skill |
| Skill | +2 | = to ½ base skill being used |
| Attribute | +4 | No pool dice allowed |

⚠ **The "Dice Pool" column caps POOL dice; you roll the FULL rating** (p.84). Worked examples, asserted
in `tests/defaulting.test.mjs`: **Shotgun 5** → assault rifle rolls 5 dice + up to 2 Combat Pool;
**Edged Weapons 4 (Sword)** → rolls the specialization's rating, pool capped at ½ the base skill (2).

- `SR3EItem.defaultTiers(actor, opts)` is the pure rule; the dialog only renders it. One option per
  specialisation (`level` is the bonus, so rating = `base + level`).
- ½ rounds down. The dialog lists **all** active skills/specialisations plus every attribute — the GM judges relevance.
- The TN modifier is baked into the TN at each call site (`tn + def.tnMod`).
- **`poolCap` is the single gate on pool dice**: every flow clamps with `Math.min(available, def.poolCap)`;
  Attribute reports `poolCap: 0`. `allowPool` is only an alias for `poolCap > 0`.

**Wired in:** `SR3EItem.rollSkill`; weapon attacks (single, AoE throw, `rollVehicleWeapon`); **melee**
(`rollMeleeAttack`) and **astral** (`rollAstralCombat`) prompt **both sides**, each patching its
boxing-card `skillDice`/`skillName`/`defaultTnMod`/pool; Matrix (`_buildCCParticipant`, `rollProgram`,
`rollHackingAction`, `rollNodePrompt`); Falling & Escape Artist (sr3e.js); `SR3EVehicleSheet.runDrivingTest`.
**Chase Scene** is an Open Test: the dialog picks the pool, Attribute suppresses Control Pool, and the
+2/+3 TN mods don't apply (GM raises the threshold).
