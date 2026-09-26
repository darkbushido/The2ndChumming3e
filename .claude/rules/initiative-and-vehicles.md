---
paths:
  - "scripts/documents/SR3ECombat.js"
  - "scripts/SR3EActionLedger.js"
  - "scripts/SR3EVehicleChase.js"
  - "scripts/sheets/SR3EVehicleSheet.js"
  - "scripts/data/action-economy.mjs"
  - "scripts/data/ready-weapon.mjs"
  - "scripts/data/hands.mjs"
  - "scripts/data/weapon-accessories.mjs"
  - "scripts/data/quick-strike.mjs"
  - "scripts/data/rigging.mjs"
  - "tests/rigging.test.mjs"
  - "tests/initiative.test.mjs"
  - "tests/action-economy.test.mjs"
  - "tests/ready-weapon.test.mjs"
  - "tests/hands.test.mjs"
  - "tests/gyro.test.mjs"
  - "tests/gm-tools.test.mjs"
---
# Initiative, action economy, GM tools, vehicles and chases

### Initiative  · *SR3 p.103-104*
Two modes (game setting):
- **SR3**: pass-based. Everyone acts once per pass in init order; −10 after each pass; repeat until all ≤ 0.
- **SR2**: flat queue of every slot (init, init−10, …) sorted descending.
Both end the round and prompt the GM to re-roll.

- **Shift-click** any initiative button (sheet bolt, tracker d20) → physical-dice dialog for typing the result.
- **Pre-start lock**: before `combat.started` the tracker's per-combatant roll icons are dimmed and
  `pointer-events:none`; initiative is rolled only through "Begin Encounter".

**Initiative formulas by mode:**
- Default: `Reaction + woundMod` + `initiativeDice`d6 (wired reflexes apply)
- TRM / AR / VR-Cold: meat-world initiative, own dice (MDF p.10 — see matrix rules); Response does NOT apply
- VR-Hot: `reaction.base + woundMod + Response×2` + `(1 + Response)`d6 (no cyber bonuses)
- Astral Projection: `Intelligence + 20` + 1d6
- Physical / Dual Natured: default

**Vehicle initiative** (`system.vcrMode`, `system.controlledBy`):
- VCR (jumped in): rigger's `reaction.base + 2 × vcrLevel + woundMod` + `(1 + vcrLevel)`d6 —
  `Rigging.vcrReaction` / `vcrInitiativeDice`, SR3 p.301 (*"Each level adds +2 to the user's Reaction and +1D6
  Initiative dice"*); wired reflexes and magic don't apply (p.140). ⚠ **+2, not +1**, on every path incl. the
  chase (TODO 167). ⚠ There is no verified flat "−2 TN per VCR level on skill tests" (TODO 106).
- RCD (remote): rigger's `Reaction + woundMod` + `initiativeDice`d6
- Auto (no pilot): `Pilot rating` + 2d6
- VCR is exclusive: activating it sets the rigger's other linked vehicles to Auto (editable after).

### Action economy — the action ledger  · *SR3 pp.105-108* — TODO 48
Rules: `scripts/data/action-economy.mjs` (`ActionEconomy`, `ACTIONS` with a page each). Storage/UI:
`scripts/SR3EActionLedger.js`. A **combatant flag** keyed `round|turn` (needs no clearing), written by
the GM via **`sr3e.action.charge`**.
- A phase holds **two Simple or one Complex, plus one Free**. Over-spending is flagged ⚠, **never refused**.
- **Flows charge themselves** (`SR3EActionLedger.charge`, only in that actor's phase): firearm by fire
  mode (SS/SA/BF Simple, FA Complex), Throw Weapon, melee (attacker only), spells, vehicle weapons,
  skills, nature-spirit summoning, reloads per the Ammo Reloading Table.
  ⚠ **Nothing reactive is charged** (dodge, soak, resistance, initiative). ⚠ **Auto-mark, never
  auto-advance**: only the GM's Complex / second Simple ends a turn.
- Pips for everyone on the active row; GM buttons: Complex (ends turn), Simple (toggle), Simple (ends turn), **↺ Undo**.
- ⚠ **Undo restores what the action SPENT.** Each flow calls `SR3EActionLedger.begin(actor)` first (before
  any dialog) to snapshot pool spent, recoil count, Karma Pool, every weapon/ammo item's rounds and
  quantity. ↺ lists every changed value and every card posted since, each untickable, then restores,
  deletes and frees the slot.
- **Ready Weapon** (TODO 47, p.107): `system.ready` on firearm/melee/projectile/thrown (initial true),
  rules in `ready-weapon.mjs`. ✋ toggles it (readying charges a Simple). `SR3EItem._ensureReady` at the top
  of `rollWeapon`/`rollMeleeAttack`: Ready / Quick Draw (Concealability 4+ firearms, Reaction (4) +2
  unholstered via `rollThen` → `_quickDrawRolled` → 🎯 Fire card → `rollWeapon({ quickDrawn: true })`,
  uncharged) / Attack anyway. ⚠ Warns, never refuses. Fists and cyber-melee are always ready.
  ⚠ **New weapons arrive put away** (TODO 135/136): the field's initial stays true for old sheets, but a
  `preCreateItem` hook sets `ready: false` on any weapon created on a character/NPC (`putAwayOnCreate`;
  not body weapons, `hands: 0` cyberguns or vehicles) and takes new armour off (`worn: false`).
- **Hands** (TODO 49, p.112): `system.hands` (0-2, blank = `Hands.defaultHands(type, category)`; packs
  store it via `tools/fill-weapon-hands.mjs`), `system.extraHands` on actors. In hand = ready.
  ⚠ **p.112 is a class whitelist** — only pistol/SMG classes dual-wield (`DUAL_WIELD_CATEGORIES`).
  `guessGearModifiers` guesses `secondFirearm` (+2) and withdraws smartlink/goggles/laser (*"negates"*).
- **Accessories and the gyro** (TODO 18, p.113, p.282):
  - `smartgun`/`laserSight` on firearms (nullable; blank reads `accessories`), via `WeaponAccessories.flag`;
    packs store them (`tools/fill-weapon-accessories.mjs`). ⚠ Read per item — a designator or laser weapon is not a laser sight.
  - Worn *Gyro Mount* gear: `SR3EActor.gyroMount` / `gyroRating`.
  - ⚠ **Full rating on EACH of recoil and movement** (the maintainer's ruling, CC p.34). `gyroOnRecoil`
    in `rollWeapon`; the rating goes to the GM window as `gyroLeft`, where `gyroOffset` takes it off the
    ticked movement rows. Mutant `gyro-shared-allowance` guards against p.113's shared allowance.
  - Costs: +1/+1 armour in `armorRatings`, +4 melee TN (`gyroMeleeTN`), half Combat Pool
    (`derived.combatPoolBeforeGyro` keeps the full figure).
- Not yet: Take Aim across phases; one Simple for two guns, recoil crossover.

### GM tools — Rollable Tables sidebar
Chase Scene, Driving Test, Session Rewards, Chunky Salsa, Barrier Damage, Falling Damage, Escape Artist
live on the Rollable Tables tab (`renderRollTableDirectory`). Chase and Driving Test are for all; the
rest GM-only. Driving Test from there (`SR3EVehicleSheet.promptVehicleDrivingTest` → `runDrivingTest`)
asks for vehicle + driver.

⚠ **Multi-actor lists start UNTICKED** (TODO 96) — Session Rewards (with **All**) and Chunky Salsa,
except Chunky Salsa opened by the grenade flow with `opts.actorIds` (the actors the blast caught).

**🎲 Success Test** (TODO 73): character sheet, any pool vs any TN, via `_promptRollOptions`' `custom`
mode and `rollPool`, never `Roll.create`.

### Driving Test  · *SR3 p.134* — `runDrivingTest`
Base TN = vehicle **Handling**; TN dropdowns: unfamiliar +1, stress, size +2/+3, weather +2/+4, terrain
−1/0/+1/+3, combat +2, datajack −1, **VCR −VCR Rating**. ⚠ **Not ×2** (p.134, worked p.135); the ×2
belongs to the vehicle-combat tables (pp.141-146).
Pool (auto, editable): Vehicle Skill **+ Autonav (out of combat only)**; a jacked-in rigger ("Using VCR")
adds Control Pool dice **instead of** Autonav — `min(Control Pool, Vehicle Skill)`. Recomputed live. No skill → Default dialog.

**Control Pool — SR3 p.44** (TODO 167, `scripts/data/rigging.mjs`, `derived.controlPool`): **Reaction (unaugmented)
+ 2 × VCR**, **0 without a VCR**; one test takes at most its skill dice. ⚠ **The pool is not the skill** — the
skill is the per-test cap (p.44, p.134, p.147); unrigged drivers get none (p.141). "Adapted for rigger control"
(p.134) is not modelled.
1 success = manoeuvre succeeds; 0 → GM calls a Crash Test.

**💥 Crash** (TODO 74) — `SR3EVehicleSheet.runCrash(vehicle)`, from the Stats tab, the Vehicle Tools HUD
menu, and a 💥 on a failed Driving Test (`crashOnFailVehicleId`). Speed asked in km/h, converted by
`SR3EActor.crashDamageFromKmh` (÷ 1.2 → m/turn). The Crash Test **is** `runDrivingTest` in crash mode
(p.147), using the **Crash Test Modifiers Table** (p.148): vehicle damage, terrain −1/0/+2/+4, speed vs
driver Reaction (`SR3EActor.crashSpeedModifier`), no VCR row; a rigger adds Control Pool dice (up to the
skill). ⚠ One damage builder, `_buildCrashDamageHtml` (GM's Power/Level as ctx overrides).
Occupants come from **`VehicleData.passengerActorIds`** (the Chase Scene seeds from it). **Occupants**
(p.147, crash and ramming) resist the Power the vehicle faced at the level it *actually took* — nobody
rolls if it took none — after asking for **impact armour** (−Power; prefilled from `armorRatings`) and a
**seat belt** (−1 level): `SR3EActor.collisionPassengerDamage`, pinned to the book's cops, 15S → **12M at TN 12**.

### Chase quarry & auto-distance  (`SR3EVehicleChase.js`)
Exactly one participant is the **Quarry** (checkbox; its distance is 0, box faded). Other distances are
relative: **positive = behind, negative = ahead**. `speed` is metres/Combat Turn (km/h ÷ 1.2); on
`_nextTurn` each pursuer gets `newDist = oldDist − (pursuerSpeed − quarrySpeed)` and the card reports
closing/opening. No quarry → the card says distances weren't updated. State is in-memory (`isQuarry`).
