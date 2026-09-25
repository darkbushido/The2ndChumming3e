---
paths:
  - "tests/melee-*.test.mjs"
  - "tests/full-defense.test.mjs"
  - "tests/charging.test.mjs"
  - "tests/martial-arts.test.mjs"
  - "tests/corner-tn.test.mjs"
  - "tests/e2e/melee-*.spec.mjs"
  - "tests/e2e/astral-two-corner.spec.mjs"
---
# Melee combat

### Melee combat flow  · *SR3 p.121-123*
1. Attacker clicks a melee weapon; target dialog. Not adjacent (`SR3EItem._tokensAdjacent`) → **warn and
   proceed**. Reach affects the TN only.
2. Defender auto-uses their equipped melee weapon → an unarmed/cyber item → bare hands (STR M).
   **Reach never gates participation** (p.122 step 2).
3. Either side lacking the skill defaults — **on their own client**.
4. Called shot (attacker only).
5. **The GM sets BOTH TNs** — `sr3e.melee.negotiate` → `SR3EItem._promptGMMeleeWindow`.
6. Two-corner boxing card; the last submission resolves (see *Two-corner cards* in CLAUDE.md).
7. Most successes wins; **a tie goes to the attacker** (below). The winner's code stages up by net
   successes; the loser gets Resist Damage → the soak flow.

#### The GM's melee TN window
- **Multiple targets** (p.122, +2 per additional target struck this phase): prefilled from the attacker's
  `system.targetsThisPhase` (shared with the fire dialog); each attack records its target. With no window
  (NPC vs NPC) the flow adds the +2s itself.
- Melee resolves **two** TNs and most p.123 rows move both oppositely, so `sumMeleeModifiers` returns an
  `{atk, def}` **pair of deltas** — never absolutes (the bases already carry reach, defaulting, called shot).
- Opens per `gmApprovesTN` via `SR3EQuery.gmWindowOpens`. Default `player`: opens **whenever a player's
  character is on either side**; skips only NPC vs NPC (TODO 94). ⚠ "A player's character" =
  `SR3EQuery.isPlayerCharacter` (assigned or **explicit** Owner), never `hasPlayerOwner` (default ownership
  would make every goon a PC). `adjudicated` is the only reliable signal a GM looked (TODO 50).
- ⚠ **Visibility halves in melee** (p.123: half, round down, except Full Darkness) — `meleeVisibilityModifier`.

#### ⚠ Reach is a DIFFERENTIAL, and applying it is the fighter's CHOICE  · *p.121*
- **The difference** between reaches; equal reach cancels (two staves both roll vs 4).
- The longer-reach fighter chooses: −N on their own TN, or +N on the opponent's. The election lives in the
  **holder's own corner** (`sr-melee-atk-reach` / `sr-melee-def-reach`), never the GM window.
- Electing "onto the opponent" raises **both** TNs by N (the holder gives back the posted bonus).
- ⚠ **At the TN floor of 2 the branches differ — RAW.** A bonus below 2 is lost; pushed onto the opponent it isn't.
- Trolls: natural Reach 1, cumulative (`SR3EActor.meleeReach` adds `SR3E.racialReach` **per fighter before
  the difference** — troll vs troll still cancels).

### The melee tie goes to the ATTACKER  · *SR3 p.122*
*"A tie goes in favor of the attacker."* Net 0 → base Damage Level, defender resists (`SR3EActor.meleeOutcome`).
⚠ The staging gate is unconditional, **not** `net > 0` — that would post no soak button and delete the attack.

### Full Defense  · *SR3 p.123-124*
A melee posture (p.108 Interception forces it). `SR3EActor.fullDefenseOutcome` (pure) →
`{blocked, net, cleanMiss, remaining, dealsDamage}`.
1. **Skill test, pool-free**: `handleMeleeRoll` **zeroes** (not rejects) the defender's Combat Pool — it's reserved.
2. Defender with **more** successes → blocked (a tie is not).
3. Else `.sr-fd-dodge-btn` → `handleFullDefenseDodge`: Combat Pool dice only, at the defender's melee TN.
4. **The defender deals no damage**, ever.
- ⚠ **This dodge SUBTRACTS from the attacker's net before staging** (p.124); the ordinary dodge *adds* to the
  soak (p.113). Keep `dodgeOutcome` and `fullDefenseOutcome` separate (`tests/full-defense.test.mjs`).
- ⚠ Ranged Full Defense is a deliberate system **extension**, not RAW.

### Charging Attack  · *Cannon Companion p.86* — the source-book rule gate
A checkbox in the attacker's called-shot dialog, shown only when `cc` is enabled.
⚠ **`SR3ESourceBooks.optionalRuleAllowed(code)` is the precedent**: optional rules ride the per-book toggle,
never a second settings list.

| | |
|---|---|
| Charge lands | **+1 Power** (`chargingPowerBonus`) — not a TN |
| Charge fails, no damage | **Quickness (5) Test or prone** |
| Charge fails, damage taken | **+2 to the charger's Knockdown TN — INSTEAD** |

- ⚠ **"Instead" is exclusive** — `SR3EActor.chargingFailure`, with a mutant.
- ⚠ Movement continuity (2+ m across passes) is **declared**, not measured.
