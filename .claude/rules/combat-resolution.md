---
paths:
  - "tests/knockdown.test.mjs"
  - "tests/damage-codes.test.mjs"
  - "tests/pools.test.mjs"
  - "tests/pool-spend.test.mjs"
  - "tests/wound-modifiers.test.mjs"
  - "tests/combat-rules.test.mjs"
  - "tests/net-staging.test.mjs"
  - "tests/overflow-death.test.mjs"
---
# Knockdown, called shots, damage staging, Combat Pool

### Damage staging  · *SR3 p.113-114*
Power + Level (L/M/S/D) + optional Stun. Each 2 **net** successes = one stage — the attacker's successes against
the target's total, from the base code (`SR3EActor.netStagedDamage`, p.113; see ranged rules). Stun → stun track, else physical. **The GM applies damage manually.**
⚠ **Past Deadly, SR3 gives TWO answers, both RAW, scoped on purpose** — `SR3EItem.stageDamage(base, net, { meleeRules })`:
- **General (default)**: surplus is **discarded** (p.113). 9M + 6 successes = **9D**. (Power is the soak
  TN, so a phantom point would hurt twice.)
- **Melee (`meleeRules: true`)**: every 2 more successes +1 Power (p.122 step 4). Same roll = **10D**.
- **Astral counts as melee** (p.174). Matrix and contested do not.
- ⚠ One implementation only — no inline staging loops (`tests/damage-codes.test.mjs`).

### Called shots  · *SR3 p.114*
All single-target weapons except AoE — firearms **except FA**, bows, thrown, melee. Declared before the
roll: **+4 TN**; **Take Aim** −1 TN per point (a Simple each). Two exclusive options:
- **Stage up**: base level +1 (cap D).
- **Specific sub-target** on a vehicle-sized+ target; the GM adjudicates.
- **Ranged**: in `_promptWeaponRollOptions` (`#sr-called`, `#sr-aim`, sub-target), folded live into the TN;
  stage-up rewrites `damageCode` **before** vehicle Power/2. `rollWeapon` passes `calledShotAllowed = mode !== 'FA'`.
- **Melee**: `SR3EItem._promptCalledShot(actor)` after defaulting; `tnMod` into `atkTN`; `calledShot`/
  `calledShotTarget` in ctx; `handleMeleeRoll` stages up **only when the attacker wins**.
- Not wired: vehicle weapons, spells.

### Knockdown  · *SR3 p.124, p.116*
A third stage after the soak: `.sr-knockdown-btn` (gated `_isDecider`), not offered when fully soaked.
Body test; `SR3EActor.knockdownOutcome` / `knockdownTN`.

| Wound taken | Successes to stay standing |
|---|---|
| Light | 2 |
| Moderate | 3 |
| Serious | 4 |
| **Deadly** | **no test — always knocked down** |

0 successes → **prone**; below threshold → driven back ~1 m; else standing.
- ⚠ Deadly **skips** the test (NA, not 5). ⚠ Zero is specifically prone (staggering needs `successes > 0`).
- ⚠ **TN**: ranged = ⌊attack **Power** ÷ 2⌋ (armour ignored); melee = the opponent's **Strength attribute**;
  gel rounds = the **full** Power (p.116).
- ⚠ The book is ambiguous on which wound level; the threshold defaults from **this attack**, editable,
  with the target's current level shown.
- **🔻 Mark prone** (gated `_mine`). Not modelled: +2 TN for a staggered character who can't step back (stated).

### Combat Pool  · *SR3 p.43; refresh p.104*
- ⌊(QUI + INT + WIL) / 2⌋ + wound modifier; `combatPoolSpent` tracks use; available = derived − spent.
- **Refreshed every Combat Turn** (= a Foundry round) by `SR3ECombat._endOfTurnReset()` — combat, spell,
  astral, hacking pools together, plus recoil and Full Defense. *"Unused pool dice do not carry over."*
  ⚠ Never per-pass or per-combat.
- **Three call sites**: `_newRound()` (rounds 2+), `startCombat()` (round 1 — p.104 step 1), and Begin
  Encounter in `sr3e.js` **before** `rollInitiative()` — ⚠ load-bearing: Spell Defense dialogs cap their
  input at `availableSpellPool` as read when built (`tests/initiative.test.mjs`).
- Every write is **dirty-checked** (each fires `updateActor`).
- `endCombat()` runs the same reset **silently**, then clears `clearSpellDefense` and `tempMagicLoss`.
  ⚠ Don't add a "Refresh pools?" prompt back — round 1 refreshes anyway.
