---
paths:
  - "scripts/SR3EMIJI.js"
  - "scripts/sheets/SR3EVehicleSheet.js"
  - "tests/ew-skill.test.mjs"
  - "tests/e2e/miji.spec.mjs"
---
# Electronic Warfare — Flux / Footprint / ECM / ECCM / MIJI  · *R3 p.36-40, 96, 137-138, 144-145; SR3 p.157*

**Stats:**
- **Rigger** `system.ew`: `deckRating`, `fluxRating`, `protocolModule` (Matrix tab, "Rigger — Electronic
  Warfare"). The Electronics (EW) specialisation drives every roll.
- **Vehicle** `system.ew`: `ecm`, `eccm`, `fluxRating`, `footprint`; `system.signalMonitor.{command,simsense,system}`
  (0-10); `system.infiltration` (`intruderActorId`, `turnsRemaining`, `intrusionFactor`, per-channel booleans).
  All on the vehicle sheet's EW tab.

**Complementary dice** = the **full rating, uncapped**, as extra pool dice (`_complementaryDice`) — R3's
reading (the maintainer's call), ⚠ **not** SR3 p.97's 2:1 Complementary Skills test. ⚠ Granted to the **MIJI
Test and ECCM regeneration only**; Infiltration rolls EW alone (p.37, Trixie: 6 dice on Flux 8).

**Footprint** = `round((riggerDeckFlux + vehFlux + ECM) / 10)`; ↻ Recalc writes it. Targeting the vehicle's Sig: TN = Sig − Footprint.

**Signal Monitor** (`_signalChannel`/`_signalTier`): 10 boxes per channel, an **Infil** toggle (`signalInfil`
→ `system.infiltration.<channel>`) and ±1 (`signalDamage`). **Faded and locked until infiltrated**
(`.signal-faded`, guards in `_onSignalBox`/`_onSignalDamage`). MIJI `applyDegradation` sets the breach flag.
Tiers (`SR3E.electronicWarfare.degradationTiers`): 1-3 +1, 4-6 +2, 7-9 +3, 10 = channel lost.

**Degradation effects** (p.145):
- **Simsense on a VCR-jacked rigger = wound-equivalent, automatic.** `SR3EActor._jackedSignalMod` (the drone
  with `controlMode==='vcr'`) adds the tier to **every** `rollPool` (opt-out `skipSignalMod`) and subtracts it
  from VCR initiative in both `rollInitiative` sites. Helpers `_signalTierMod`/`_vehicleSimsenseMod`. Simsense
  10 → a Dumpshock pointer.
- **Gunnery**: `_promptVehicleWeaponRollOptions`'s Shot type (Direct / Manual = Simsense / Indirect = System)
  folds the channel tier into the TN live (`render` on `#vw-shottype`); shown only when degraded.
- **Reference-only**: Command (Drone Comprehension, IVIS), Simsense perception, System smartlink-cancel —
  shown in the EW tab's **Active Degradation Modifiers** (`_degradationReadout`, `appliesTo`) and on MIJI cards.

**MIJI** (`scripts/SR3EMIJI.js`, on `game.sr3e`): a two-corner opposed card. `openAttackDialog(targetVehicle)`
(⚡ MIJI Attack) picks intruder vehicle, operation, channel; `SR3E.electronicWarfare.operations` maps
operation → channels and the **defender TN** stat (`ecm` for Jamming, else `protocolModule`). Intruder TN =
defender deck rating. Both get Flux dice. `postMIJICard` → `.sr-miji-roll-btn` → `handleMIJIRoll` via
`SR3EActor.rollOpposedPair('miji', …)` → intruder win posts `.sr-miji-degradation-btn` → `applyDegradation`.
One-shot guards on both.
- **Corner ownership goes through `vehicle.system.driverActorId`.** No driver → owner `null` → **GM-only, by
  design**; never widen the gate. The defender is the rigger if any, else the vehicle (`ctx.defenderName`).
- ⚠ **`_pickEwSkill` is a RANKING**: EW specialisation → plain `Electronics` → any loose match, highest rating
  breaking ties (three skills contain "electronic"; the spec's `level` is a bonus). `tests/ew-skill.test.mjs`,
  `tests/e2e/miji.spec.mjs`.

**Infiltration** (`openInfiltration`): EW vs TN 6 − (intruder Protocol − target Deck). Successes split three
ways (p.37): channels (1 each), time (`Math.ceil(10/time)`), Intrusion Factor; over-allocation trimmed
Factor-then-Time; unspent allowed. Writes `system.infiltration`. `detectInfiltration`: defender EW vs
Intrusion Factor. `updateCombat` (GM) decrements `turnsRemaining`; manual −1 on the tab.

**ECCM repair** (`openECCMRepair(vehicle, channel)`): ECCM + EW dice vs attacker ECM/Protocol + 3; each success
removes a box. **Reduce Footprint** (`reduceFootprint`): EW vs Footprint + 4; each success −1 vehicle Flux
(retry +2 by hand). Sheet actions: `signalBox/signalInfil/signalDamage/recalcFootprint/mijiAttack/infiltrate/
detectInfiltration/advanceInfiltration/eccmRepair/reduceFootprint`.

**Drone Comprehension** (SR3 p.157, `SR3EVehicleSheet.runDroneComprehension(vehicle)`): Pilot Rating dice, no pool,
vs GM TN (4; complex 8+), +2 secondary drone, + Command degradation (prefilled). `vehicle.rollPool`;
0 none · 1 literal · 2+ leeway. From 📡 on the Stats tab and the Vehicle Tools HUD.

**IVIS** (R3 p.96, `SR3EMIJI.openIVIS(rigger)`), a rigger test: Small Unit Tactics (Vehicle Tactics) vs TN 5
(+ System degradation). Hits split between announced Comprehension bonus dice and the **IVIS Pool**
(`system.ew.ivisPool {value,max}`, −1 / Clear on the Matrix tab, refreshed to max each round by
`updateCombat`). From 📶 IVIS Test and a Token-HUD button on tokens with that skill. Actions `ivisTest/ivisSpend/ivisClear`.

**Vehicle Tools HUD** (`_sr3eVehicleToolMenu`, sr3e.js): one satellite-dish button on owned vehicle tokens
opening a picker; add tools to `_sr3eVehicleTools`.
