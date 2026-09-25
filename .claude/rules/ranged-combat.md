---
paths:
  - "scripts/SR3ECombatModifiers.js"
  - "scripts/data/shotgun.mjs"
  - "scripts/data/ammo-stock.mjs"
  - "scripts/data/phase-targets.mjs"
  - "scripts/data/blast.mjs"
  - "tests/net-staging.test.mjs"
  - "tests/flechette-weapons.test.mjs"
  - "tests/grenade-skill.test.mjs"
  - "tests/vehicle-targets.test.mjs"
  - "scripts/data/weapon-accessories.mjs"
  - "tests/combat-modifiers.test.mjs"
  - "tests/dodge-resolution.test.mjs"
  - "tests/shotgun.test.mjs"
  - "tests/fire-modes.test.mjs"
  - "tests/ammo-stock.test.mjs"
  - "tests/armor-layering.test.mjs"
  - "tests/implant-armor.test.mjs"
  - "tests/phase-targets.test.mjs"
  - "tests/targeting.test.mjs"
  - "tests/vision.test.mjs"
  - "tests/aoe-throw-tn.test.mjs"
  - "tests/attack-negotiate.test.mjs"
  - "tests/soak-payload.test.mjs"
  - "tests/tables.test.mjs"
  - "tests/e2e/ranged.spec.mjs"
---
# Ranged combat, firearms, ammunition, range, grenades

### Ranged combat flow  · *SR3 p.109-114*
1. Attacker clicks a weapon; target dialog (single actor).
2. (Firearms) loaded ammo type read from the weapon — no per-shot picker. Explosive/EX/Gel mods applied now.
3. (Firearms) fire-mode dialog: SS/SA/BF/FA, recoil preview, editable compensation.
4. Roll options: damage code, editable **range** dropdown (auto-measured), TN breakdown (recoil, wound,
   multi-target, tracer note). **TN is read-only whenever a GM window will open** (`gmApprovesTN`).
5. **GM's TN window** (`_promptGMAttackWindow`): p.112 checkboxes summed live into an editable TN (shown
   clamped at 2). Rows grouped Target / Attacker / Conditions / Gear via each `SR3E_RANGED_MODIFIERS`
   entry's `group`, consumed by `mvpModifierGroups()`. Gear rows are the system's **guesses**
   (`guessGearModifiers`), captioned as such. Empty groups dropped; ⚠ unknown/missing `group` falls into a
   trailing **Other** bucket, never vanishes (`tests/combat-modifiers.test.mjs`).
   - **GM situational modifier** (Conditions): a signed number. ⚠ `value: true`, so `sumModifiers` reads it
     **before** its falsy guard (it may be negative or 0). Number only; cards carry static wording.
     ⚠ Melee's version carries a **side** (`atk`/`def`/`both`); unknown side → attacker.
   - **Visibility** (p.112): **two dropdowns** — condition × vision in use — via
     `visibilityModifier(condition, visionKey)`. Two axes, five valid states. ⚠ The slash reads
     **cybernetic first, natural second** (p.111): cyber vision is the worse. Low-Light ≠ Thermographic.
     ⚠ The `visibility` row is `mod: null, value: true` — **0 is a real answer** (thermo in Mist).
   - **Vision pre-selected** (TODO 36): `bestVisionKey(detectVision(attacker), condition)`; follows the
     condition until the GM touches the dropdown (programmatic `.value =` fires no `change`). Melee has one
     vision dropdown **per fighter** (`visibilityVisionAtk`/`Def`, fallback `visibilityVision`).
   - **👁 Vision reminder** (TODO 99, `detectVision`/`visionReminder` in `SR3ECombatModifiers.js`).
     ⚠ Replaced eyes lose racial vision (p.299) — only an actual replacement item or **Cat's Eyes** counts.
     ⚠ **Cat's Eyes are NATURAL** (M&M p.64). ⚠ Thermosense Organs are not vision (M&M p.75).
6. Attacker allocates Combat Pool — that dialog is the 🎲 Roll trigger. Attack rolls (interactive).
7. On the final wave the **defender declares a defence knowing the attack's successes**; dodge TN 4.
8. Dodge result via `SR3EActor.dodgeOutcome` (below). A failed dodge's successes join the target's total.
9. Soak card: editable Body pool, TN (Power − armour), armour type dropdown (ballistic; impact for melee).
   APDS/Flechette applied from the carried `ammoType` (editable, gold note).
10. Soak roll: the attacker's successes against the target's total (soak + carried dodge), 2 per level either way
    from the **base** code (`netStagedDamage`, p.113); below L = fully soaked. **The GM applies damage manually.**

#### ⚠ The defender declares AFTER the attack roll — RAW (p.113 steps 3-5)
The book's order: attacker's Success Test → *then* the target decides to dodge (Liam/Snot example). The
choice is dodge-vs-soak: pool spent dodging is gone from the soak. **Never prompt the defender before the roll.**
- `sr3e.attack.negotiate` handles **only** the GM's TN window and writes nothing. No negotiate/commit
  two-phase, no pending registry.
- `SR3EActor.handleDodgeDeclare` (`.sr-dodge-declare-btn`): relays `sr3e.dodge.declare` to the defender's
  decider with `attackSuccesses`, spends pool through the GM, rolls the dodge — or goes to the soak card on 0.
- Full Defense is read (`_fullDefenseDice`) but only consumed there.

#### ⚠ Resolving the Dodge Test  · *SR3 p.113*
> "If the number of successes obtained on the Dodge Test are **more than** the Attacker achieved … the attack
> is completely dodged … **Even if you don't dodge completely, the successes still count and are added to the
> Damage Resistance Successes**."
1. **A tie is a HIT** (strict *more than* / *exceeds*).
2. **A failed dodge's successes carry** into the soak (`carriedSuccesses` on the payload; the soak card shows
   the parts, `5 hits (3 soak + 2 dodge)`).
3. **The damage stages by the NET of the two totals** (p.113, TODO 165): *"one Damage Level for every two
   successes the attacker rolls over the target's total"*, and down for the target's surplus; equal = base.
   `SR3EActor.netStagedDamage(base, attack, target)`; the soak payload carries `net: { attackHits, basePower,
   baseLevel }` (ranged, grenade, vehicle, elemental spell — **not melee**, which nets on p.122 then soaks).
   ⚠ Never stage up and down separately (floor(A/2) − floor(D/2) is wrong). The attack card's staged code is only
   an "if unresisted" preview. Worked: 3 hits on 9M, dodge 2 (hits, carried), Body 3 → 5 vs 3 → **9L**.
Both in `SR3EActor.dodgeOutcome(dodgeHits, attackHits)` → `{cleanMiss, carried}`
(`tests/dodge-resolution.test.mjs`, including the tie — never relax to `>=`).

#### The Dodge Test target number  · *SR3 p.113*
`SR3EActor.dodgeTN({ burstRounds, shotgunSpread, woundMod })` (+ `dodgeTNParts()` for the shown breakdown):
base **4**, **+1 per 3 rounds** (BF/FA), **+1 per shotgun spread**, **+ the defender's wound modifier**
(worked in the book). The dodge path bypasses `rollPool`, so it adds the wound itself.
- ⚠ **`woundMod` is NEGATIVE and is SUBTRACTED** (mutant covers adding it).
- ⚠ **Burst rounds = rounds aimed at THIS target**, not `roundsExpended` (walking waste excluded).
The declaration dialog shows the TN and breakdown.

#### Armour on the soak
- **Worn + implant** — `SR3EActor.armorRatings(actor)`, the one answer for soak, Falling Damage and the
  Body+armour picker (TODO 75). Implant armour (`SR3EActor.implantArmor`) is **cumulative**: Bone Lacing
  (SR3 p.300), Ceramic/Kevlar lacing (M&M p.27), Dermal Sheath (M&M p.28), Orthoskin (M&M p.68).
  ⚠ Read from the item's **`mods`** (`+1IMP`, `+1BAL`); nullable `bonusImpact`/`bonusBallistic` override
  (`null` = from mods, a number incl. 0 wins). ⚠ `IMP`/`BAL` are deliberately not in `SRCG_BONUSES`.
  ⚠ Plastic Bone Lacing gives **no** armour (p.303 table). ⚠ Encumbrance reads worn armour only.
- **Layering — SR3 p.285** (TODO 112). Worn = item `worn` flag (`SR3EActor.wornArmorItems`; legacy
  `system.equippedArmor` still counts; stored items never). `SR3EActor.layeredArmor`: **best piece + half the
  next** per type, a third body piece adds nothing; **helmets and shields add in full**
  (`SR3E.armorAccessories`).
  ⚠ **Armour costs Combat Pool dice, not Quickness**: −1 die per 2 full points over Quickness, off the
  full ratings, **rounded up** (Twitch, 3 over, loses 2). Never lower Quickness itself.
  **Layering** (2+ body pieces) adds +(worn Ballistic − Quickness) TN to Quickness tests and linked skills
  (`derived.armorQuicknessTN`); coat + helmet is not layering. Movement reduction not modelled.

### Firearms — fire modes, recoil  · *SR3 pp.111, 115-116*
**Fire modes** (`SR3EItem._promptFireMode`, weapon `mode` e.g. "SA/BF/FA"):
- SS: no recoil accumulation; warns if already fired this phase.
- SA: +1 round to the phase counter; cumulative recoil.
- BF: Power +3, level +1; recoil +3/+6/+9 per burst.
- FA: 3–10 rounds; Power +rounds, level +⌊rounds/3⌋.

**Recoil** (`SR3EItem.recoilTN`, pure) = `max(0, (roundsBefore + ownRounds) − totalComp) × mult`.
- ⚠ **BF and FA count their OWN rounds; SS/SA don't** (p.115) — theirs penalise the next shot.
- ⚠ **Comp comes off BEFORE the multiplier** — MMG, 10 rounds, 6 comp = (10−6)×2 = **+8**.
  All three worked examples in `tests/fire-modes.test.mjs`.
- `totalComp = actor.system.recoilCompensation + weapon.system.recoilMod` (both editable in the fire dialog,
  persisted; actor comp on the Cyber tab). Heavy weapons (LMG/MMG/HMG/MinG) double; shotguns double in
  **BF only** (p.111). `roundsFiredThisPhase` resets each phase (`SR3EActor.resetRecoil`).

**Short bursts** (`SR3EItem.resolveBurst`, p.115): 3+ rounds normal; **2 rounds = +2 Power, level
unchanged, +2 recoil**; **1 round = single-shot mode**. Only with `trackAmmo`; `rollWeapon` recomputes recoil
after checking the clip.

**Per-phase caps** (`SR3EItem.phaseFireWarning`): SS 1 · SA 2 · BF 2 bursts · FA 10 rounds. A proxy from
`roundsFiredThisPhase`; warns, never blocks.

**Walking fire** (`SR3EItem.roundsExpended`, p.116), FA only: 1 round wasted per metre between targets,
smartguns none (`SR3EItem.walkingWaste`; the dialog's Smartgun tick is pre-set from `smartgun`).
`roundsExpended = rounds + roundsWasted` feeds the phase cap, recoil and magazine. ⚠ **Not damage** —
`fireModeDamage` uses `rounds`. ⚠ Each burst ≥ 3, so three targets a metre apart = 11 rounds (illegal without a smartgun).

**Multiple targets** (`SR3EItem.multiTargetTN`, p.111): **+2 per additional target that Combat Phase, in
EVERY fire mode** — ⚠ not a full-auto rule (only the example is FA). Counts targets, not shots. The dialog
prefills the ordinal and walking metres from `system.targetsThisPhase` (TODO 56.2, `phase-targets.mjs`,
keyed `round|turn`; `resetRecoil` writes the full empty record, never `{}` — ObjectField updates merge;
snapshotted for ↺). ⚠ `multiTarget` has no `mvp` flag, so only the fire dialog supplies it.

### Shotgun shot, choke and spread  · *SR3 p.117* — TODO 57
`scripts/data/shotgun.mjs`. Ammo type `shot`: flechette rules on the gun's code, shotguns only. Choke 2-10
set in the fire dialog, remembered as `system.choke` (blank = 5). Width `ceil(d / choke)` (≥ 1); each
**spread** (width − 1) is −1 Power, −1 attacker TN, +1 Dodge TN; Power 0 = ineffective. No distance →
the typed spreads stand in.

```
SR3 p.117 — SHOTGUN SPREAD EXAMPLE, choke 3  (each # row is 1 m of width; it widens ½ m each side)

              0 m        3 m        6 m        9 m
               |          |          |##########|
               |          |##########|##########|
   [gun] >=====|##########|##########|##########|
               |          |##########|##########|
               |          |          |##########|

   width           1 m        2 m        3 m
   spreads          0          1          2
   Power            —         −1         −2
   attacker TN      —         −1         −2      ← easier to hit…
   target Dodge TN  —         +1         +2      ← …and harder to dodge, but less damage
```
- ⚠ The Dodge modifier counts **spreads, not width** — p.113's "per meter of spread" is the maintainer's to confirm.
- Smartlink is worth **−1** with shot (`smartlinkShot`); nothing from goggles or laser sights.
- Not modelled (stated on the card): the cone as a template (everyone inside is a target), +1 Damage
  Resistance die per other target in front.

### Ammunition  · *SR3 p.280, p.116*
- **Stockpile**: ammo items are a reservoir (`ammoType`, `loadMechanism`, count). Type rules live in
  `SR3E.ammoTypes`, not on the item.
- **Ammo Reloading Table** (TODO 114), all in `scripts/data/ammo-stock.mjs` (`AmmoStock`, on `game.sr3e`):

  | Mechanism | Stock | Reloading | Takes |
  |---|---|---|---|
  | clip `c`, drum `d`, cylinder `cy`, belt `belt` | **either** — the item's `countedIn` | a **reload** is swapped; **the old one's rounds are lost** | clip: 2 Simple; speed loader, belt: 1 Complex |
  | | | or **loose rounds** by hand, topping up | 1 Complex per (Quickness) rounds — **(Quickness × 2) into a belt** (TODO 173) |
  | internal magazine `m`, break action `b`, `sb`, `internal`, arrow, bolt | **rounds** only | topped up | 1 Complex per (Quickness) rounds; **2** for break action |

  `reloads` of `roundsPerReload` each (0 = fills the gun). ⚠ **A reload is used up whole.** ⚠ **Round by
  round never loses a round** — a different type loaded by hand unloads the old rounds back to loose stock
  or a new *"… rounds (unloaded)"* item (`SR3EItem._returnRounds`). ⚠ Action cost shown, never enforced.
  ⚠ Never from storage. ⚠ The importer reads `N-Rnd Clip (Type)` as reloads fitted to the character's gun
  (`mechanismFor`).
- **Stacks and storage** (TODO 113): moving a stack >1 asks how many; splits and merges into an identical
  stack (`SR3EActor.stackKey`, strict). Pure rule `SR3EActor.planStackMove`.
- **Magazine**: `loadedAmmoType` + `loadedRounds`; size parsed from capacity (`15(c)` → 15). ↻ Reload
  (`SR3EItem.reload`) prompts compatible stock (`AmmoStock.fits`: ⚠ **loose rounds fit any firearm OF THEIR
  CLASS** — SR3 p.279, TODO 173: `system.gunClass` on ammunition is a Weapon Range Table category
  (`AmmoStock.gunClass` folds MaPist/MPist → LPist, VHP → HPist, Carb/LCarb → AsRf); **blank = not stated**, fits
  anything, and the first gun to load from it stamps its class; a reload only its mechanism; arrows/bolts only
  their bow/crossbow; a flechette weapon takes nothing else) and applies `AmmoStock.reloadPlan`,
  reporting losses and cost (`reloadActions`). `trackAmmo` off → only sets the type.
- **Firing** decrements `loadedRounds` when tracking (warns when empty).
- **Type rules**: Explosive +1 / EX +2 Power; Gel −2 Power + Stun; Shot (above). APDS halves ballistic.
  Flechette: unarmoured → level +1; armoured → **`max(Impact × 2, Ballistic)`** (`SR3EActor.flechetteArmor`).
  ⚠ **Double IMPACT only** (p.116). ⚠ *"Dermal armor negates the Damage Level increase"* —
  `SR3EActor.flechetteRaisesLevel` via `dermalArmorSources`: troll hide, Dermal Plating, Dermal Sheath
  (`SR3E.dermalArmorImplants`). ⚠ Orthoskin is not dermal armour.
  **A weapon or grenade can carry the flechette rules itself** (TODO 156): the `flechette` checkbox on
  firearm/projectile/thrown, or `(f)` after its Damage Code (p.116). `SR3EItem.flechetteAmmo`: `(f)` →
  `flechette-coded` (level already in the code, armour rule only); a ticked plain code (core AP grenades, p.119) →
  `flechette`. ⚠ **A flechette weapon takes NO other ammunition** (`SR3EItem.weaponAcceptsAmmoType`, TODO 161).
  Open: whether dermal armour takes an `(f)` code's level back.
  Anti-Vehicle sets `weaponOpts.avMunition` (bypasses vehicle Power/2; the vehicle's soak card halves its armour
  instead, p.149). Tracer: FA only, raises Level not Power, TN bonus is a manual note.
- **Shooting a vehicle** — `SR3EItem.vehicleTargetDamage` (p.149, TODO 168): Power ÷ 2 **round down**, level −1,
  **Light has no effect**. **Sensor-enhanced gunnery** adds ⌊Sensor ÷ 2⌋ **dice** against the target's Signature
  (p.152) — never a TN reduction.
- **Mechanisms** `SR3E.ammoLoadMechanisms`, parsed by `SR3EItem._parseLoadMechanism`. ⚠ **`b` = BREAK
  ACTION, `m` = INTERNAL magazine** (p.280); belt feed is `belt`.
- ⚠ **Weight is PER ROUND** (per reload for a clip) — TODO 126.
- **`trackAmmo`** (world setting) gates all counting — **on** for new worlds. ⚠ Pre-0.6 worlds that never set
  it stay **off** via `SR3EMigrations.DEFAULT_CHANGES` (Foundry stores only set values). Any other changed
  setting default goes there too.
- **Bows & crossbows** (`projectile`, `SR3E.nockedAmmoByCategory`, `SR3EItem._usesNockedAmmo`): a magazine
  of 1; bows ↔ `arrow`, crossbows ↔ `bolt` (from the category: `_weaponLoadMechanism`/`_weaponMagazineSize`).
  Reload nocks one; firing spends it. Nocked column + ↻ only with `trackAmmo`. Slings never deplete.
- **Thrown/grenades** (`SR3EItem._isConsumable`): `quantity` −1 per use (`_consumeThrown`) when tracking.
- **Empty = inoperable** (tracking on): `rollWeapon` bails; the roll icon is faded/struck
  (`rollDisabled`, `SR3EActorSheet._weaponOutOfAmmo`); Reload stays active.
- **Vehicle-mounted weapons** keep their own AV checkbox in the 🚗 dialog; no clip/reload.

### Range  · *SR3 p.111*
Every band and multiplier is pinned in `tests/tables.test.mjs`. Single-target `rollWeapon` path only.
- **Distance**: `SR3EItem._measureDistance(aToken, tToken)` via `canvas.grid.measurePath` (metres).
  Attacker = `actor.getActiveTokens()[0]`; target = the single canvas target, else the chosen actor's first
  token. `SR3EItem._acquireCanvasTarget()` skips the actor dialog, else `_promptTarget`.
- **Bands**: `SR3EItem._getRangeBands(actor)` → `rangeOverride` ("5/15/30/50") → `SR3E.weaponRanges[category]`
  → `SR3E.weaponRangeMultipliers[category]` × effective STR.
- **Classify**: `SR3EItem._rangeBandForDistance` → `{idx,label,tnMod,beyond}`; `SR3E.rangeTN` = `[0,1,2,5]`
  (4/5/6/9). Beyond Extreme warns, still allows.
  ⚠ **GRENADES use `SR3E.grenadeRangeTN` = `[0,1,4,5]`** (p.119 heads 4/5/8/9; Long is 8).
- Range is **not** pre-baked into `extraTNMod`; it's passed as `rangeInfo` to `_promptWeaponRollOptions`
  as an editable dropdown recomputing the TN live. The TN field is authoritative on confirm.

### Attacking from the canvas
Both paths fire ready weapons via `_sr3eReadyWeapons` (loaded firearms, equipped melee, thrown with
quantity, nocked bows, slings, and damaging spells for Awakened actors):
- **Token HUD** (`renderTokenHUD`): 🎯 on owned tokens → `_sr3eQuickAttack(actor)` → `_sr3eFireWeapon`
  dispatching `rollMelee`/`rollWeapon`/`rollSpell`. Works for all players.
- **Hotbar drag** (`hotbarDrop`, draggable `.weapon-section .item-row`): a "Fire: <weapon>" script macro.
  ⚠ Script macros need script-macro permission (off for base Players).

### AoE / grenade flow — scatter first  · *SR3 p.119*
Requires a scene.
1. **Nominate** — `_placeBlastTemplate`: a **PIXI.Graphics circle** on `canvas.interface` following the
   cursor (left-click detonates, right-click/Esc cancels). Records `aoeCenter` + thrower centre.
   ⚠ No MeasuredTemplate (deprecated in v14, merged into Region).
2. **Roll options** — `_promptWeaponRollOptionsAoE(rawDamage, actor, {throwDistance})`: grenade type
   (Standard/Aero/Launcher), damage code, auto range TN (`SR3E.grenadeTypes[type].rangeMult × STR` or
   `rangeFixed`), Confined Space. No targets here.
3. **Throw** (`rollPool`) carries `aoeCenter / aoeRadius / aoeThrowerCenter / grenadeType / aoeChunky`.
4. **Resolution** (`_postWaveCard`, the `state.isAoE && state.aoeCenter` branch, **before** the
   `successes===0` check — a grenade always detonates): scatter `scatterDice`d6 − `successes × scatterReduction`
   along the throw axis (dir 1 over, 4 short); re-detects every token in range **including the thrower**;
   marker = **Region** (`visibility: ALWAYS`), fallback a local PIXI circle (`game.sr3e._blastMarkers`); 🧹
   Clear removes either. Per-target Power = base − distance × the grenade's own falloff (`system.blast`,
   `scripts/data/blast.mjs`: Offensive −1/m, Defensive −1/.5 m, p.119, TODO 150; blank = −1/m), or the Chunky Salsa GUI
   (`game.sr3e.openChunkySalsa({...returnOnly})`) when confined. A soak card per caught token.
- ⚠ **The throw's successes STAGE THE LEVEL** (p.119): each soak nets the two (`netStagedDamage`); the grenade
  card's staged level is a preview. ⚠ **POWER is never staged** (it's also the soak TN).
- ⚠ **Walls** (TODO 149, `SR3EActor._wallBetween` — movement-wall `testCollision`, so an open door isn't a wall):
  a grenade aimed behind a wall drops **just short of it**; one scattering into a wall stops there (`Blast.stopShort`,
  ¼ m on the thrower's side). A token with a wall between it and the blast is **not caught**; the card lists it with
  the Power reaching the wall and gives the GM **🧱 the wall fell** (`sr-blast-wall-btn`), which asks the Barrier
  Rating and posts resist cards at **Power − Barrier Rating** (p.119). Whether it falls (Power vs **twice** the
  rating, p.124) is the GM's; tooltip and dialog show both p.124 tables (`SR3EActor.barrierTablesHtml`, from
  `SR3E.barrierRatings`/`barrierEffects`, shared with Barrier Damage). ⚠ The marker still draws its full circle.
  p.119's optional half-Power roll is not implemented.
- `_openChunkySalsaCalculator(opts)` posts soak cards itself unless `returnOnly`.
- **Shared blast marker**: `SR3EActor._drawBlastArea(center, radiusM, {name,color})` → `{regionId, markerId}`
  and `SR3EActor._clearBlastButton(...)` — used by grenades and **spell AoE** (purple; no scatter or falloff,
  `SR3EItem._actorsInRadius` picks targets at cast; each resists at full Force).
