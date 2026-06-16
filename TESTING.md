# SR3E System Testing Guide

Verify each feature by checking the **in → out** numbers against what the chat card shows.

---

## 1. Dice / Rule of Six

### Basic roll
**Setup:** Any attribute or skill roll.
- Roll **4 dice vs TN 4** → expect 0–4 successes; any die showing 4, 5, or 6 is a success. - Passed

### Explosion
- Any die showing **6** → an explosion button appears.
- Click it → that die rolls again. If the running total ≥ TN it's a success, button disappears. - Passed 
- If running total < TN and the new roll is 6 again → button reappears, keep exploding. - Passed

### Glitch - 
- Roll a pool of **6 dice vs TN 4**; arrange for 4+ dice to show 1s 
- **In:** 4 ones out of 6 dice → **Out:** glitch warning shown (⚠ 4 ones > half pool). - Passed

### Critical Glitch
- **In:** All dice show 1s, 0 successes → **Out:** critical glitch warning shown. - Passed
---
Reporting of 1s omitted with Physical dice mode - triggers nothing, GM convenience only, unnessesary work for the player to report in system

## 2. Wound Modifier

Each track (stun and physical) contributes its own modifier — both sum to give the total wound mod.

| Boxes filled (per track) | Wound level | Mod per track |
|---|---|---|
| 0 | — | 0 |
| 1–2 | Light | −1 |
| 3–5 | Moderate | −2 |
| 6–9 | Serious | −3 |
| 10 | Deadly | *unconscious* |
- Passed

**Effect:** wound mod is a TN penalty applied to all rolls, and reduces initiative base.
**Example:** 3 stun boxes → TN +2 on all rolls, initiative −2.

**Unconscious:** When either track reaches 10 boxes, the Wound Mod field displays `unconscious` instead of a number.

-Passed 

**adding/removing wounds updates overflow automatically. - passed

**Tests:**
- Fill **1 stun box** → wound mod reads **−1**.
- Fill **3 stun boxes** on a character with Combat Pool 5 → Combat Pool reads **3**.
- Fill **6 physical boxes** → wound mod from physical track is **−3**.
- Fill **10 stun boxes** → Wound Mod field reads `unconscious`.

- TN modifier passed
- Initiative modifier passed
---

## 3. Derived Pools

### Combat Pool - passed
Formula: `⌊(QUI + INT + WIL) / 2⌋ + modifier`

| QUI | INT | WIL | Expected Pool |
|---|---|---|---|
| 4 | 3 | 3 | 5 |
| 6 | 5 | 4 | 7 |
| 3 | 2 | 2 | 3 |


### Spell Pool (Awakened only) - passed
Formula: `⌊(INT + WIL + MAG) / 3⌋`

| INT | WIL | MAG | Expected Pool |
|---|---|---|---|
| 5 | 4 | 6 | 5 |
| 4 | 3 | 4 | 3 |

- Non-Awakened actors (MAG 0): field should be **hidden**.


### Astral Pool (Awakened only) - passed
Formula: `⌊(INT + CHA + WIL) / 2⌋`

| INT | CHA | WIL | Expected Pool |
|---|---|---|---|
| 6 | 4 | 5 | 7 |
| 4 | 3 | 3 | 5 |


### Hacking Pool - passed
Formula: `⌊(INT + MPCP) / 3⌋` where MPCP comes from the equipped cyberdeck. Hidden if no cyberdeck is equipped.

| INT | MPCP | Expected Pool |
|---|---|---|
| 6 | 6 | 4 |
| 5 | 8 | 4 |
| 4 | 0 | 1 |
---

## 4. Initiative

### Physical (default) - passed
Formula: `REA + woundMod` base + `initiativeDice d6` (wired reflexes add to REA and grant extra dice)
**In:** REA 4, no wounds, no cyber → **Out:** rolls `4 + 1d6`, result 5–10.

### Astral Projection - passed
Formula: `INT + 20` base + `1d6`
**In:** INT 5 → **Out:** rolls `25 + 1d6`, result 26–31.

### Matrix TRM / AR / VR-Cold - passed
Formula: `REA + woundMod` base + `1d6` (wired reflexes apply to REA; dice **forced to 1** regardless of cyber; Response does NOT apply)

**In:** REA 5 (includes wired reflex bonus), no wounds → base `5`, dice `1d6` → result 6–11.

### Matrix VR-Hot - passed
Formula: `(reaction.base + woundMod + Response×2)` base + `(1 + Response)d6` (wired reflexes **excluded** from base; Response replaces them)

**In:** base REA 4 (no cyber), Response 3 → base `4 + 6 = 10`, dice `4d6` → result 14–34.


### VCR (Vehicle — jumped-in rigger) - passed
Formula: `Rigger REA + VCR level + woundMod` base + `(1 + VCR)d6`

**In:** REA 5, VCR 2 → base `7`, dice `3d6` → result 10–25.

### RCD (Vehicle — remote control) - failed - passed
Formula: `Rigger REA + woundMod` base + `1d6`

**In:** REA 5 → **Out:** `5 + 1d6`, result 6–11.

### Auto / Pilot (Vehicle — no rigger) - passed
Formula: `Pilot rating` base + `2d6`

**In:** Pilot 4 → **Out:** `4 + 2d6`, result 6–16.

### Shift-click (physical dice mode) - passed but not all situations tested
Any initiative button → shift-click → dialog asks for result → enter manually, posts card with that value.

### SR3 pass mode - passed
After everyone acts: all initiatives drop by 10. Combatants with initiative ≤ 0 are done. Continue until none left, then GM prompted to re-roll.

### SR2 flat queue mode - passed
Full action list built upfront (init, init−10, init−20 …). Walk top to bottom.

### Pre-start initiative lock
Before **Begin Encounter**, the per-combatant init roll icons are dimmed and unclickable (incl. shift-click) — initiative is rolled only via the Begin Encounter dialog. After combat starts they work again.
- **In:** add combatants, don't start → clicking a bolt does nothing. Begin Encounter (auto-roll) → inits set. After start → bolt rolls/re-rolls normally.

### Action Tracker (GM, active combatant card)
On the active combatant's card: **Complex** (full width) + two **Simple** buttons.
- **In:** click **Complex** → advances to next actor (like the arrow).
- **In:** click first **Simple** → Complex greys out, first Simple highlights; click it again → undo (Complex re-enabled).
- **In:** click second **Simple** → advances to next actor.
- State resets when the turn/round changes (also via the normal arrow).

---

## 5. Ranged Combat

Full flow: click weapon → target dialog → dodge declaration → attack roll → dodge roll (if declared) → soak card → soak roll → assign damage button.

### drag and drop weapon sections - passed
Move preferred weapon types to the top of the weapons tab - passed


### Attack dice - passed 
**In:** Pistols skill 5, TN 4 → **Out:** 5 dice chat card vs TN 4.

### Firing modes - passed

| Mode | Rounds | Power mod | Level mod |
|---|---|---|---|
| SS | 0 (no recoil) | 0 | 0 | - warns if fired more than once in a phase
| SA | 1 | 0 | 0 | - 
| BF | 3 | +3 | +1 stage |
| FA (3 rds) | 3 | +3 | +1 stage |
| FA (6 rds) | 6 | +6 | +2 stages |
| FA (9 rds) | 9 | +9 | +3 stages |

**BF example:** Weapon `9M` → BF → damage becomes `12S`.

### Recoil (SA / BF / FA) - passed
`totalComp = actor recoilCompensation (Cyber tab) + weapon recoilMod ("Recoil Comp" on the item)`
Both are editable inline in the fire-mode dialog and persist on confirm.

- **SS/SA/FA cumulative:** `max(0, roundsBeforeThisShot − totalComp) × heavyMult`. **In:** fired 3 rounds previously, totalComp 2 → TN penalty **+1**.
- **BF stacks:** `max(0, (roundsBeforeThisShot + 3) − totalComp) × heavyMult` — **+3 first burst, +6 second** (BF counts its own 3 rounds). **In:** totalComp 0, first burst → **+3**; fire a second burst (roundsBefore now 3) → **+6**.
- **Heavy weapons** (LMG/MMG/HMG/MinG) double the uncompensated recoil.
- `roundsFiredThisPhase` resets at the start of each combat phase (and via the ↺ Reset button).

### FA multi-target TN penalty - passed

| Target number | TN penalty |
|---|---|
| 1st | 0 |
| 2nd | +2 |
| 3rd | +4 |
| 4th | +6 |
| 5th+ | +8 |

### Ammunition — stockpile / magazine model - passed

World setting **Track Ammunition** (Configure Settings → System) gates all counting (off by default).

**Stockpile (gear/ammo tabs):** ammo items are a reservoir. Each has Ammo Type, Loading Mechanism (c/m/cy/b/d/sb/internal), and Rounds in Stock. The tab shows Type / Load / Stock

**Magazine (weapons tab):** each firearm shows its capacity, a loaded badge (type + `loaded/magSize` when tracking), and a ↻ **Reload** button. Magazine size is parsed from the gun's capacity string (`15(c)` → 15).

**Reload:** ↻ → prompts compatible stockpiles (matched by loading mechanism; with rounds, when tracking on) → loads up to magazine size, subtracts from the stockpile, **discards any rounds left in the old mag** (full swap). Tracking off → only sets the loaded type, no stock math.

**Firing** uses whatever is loaded — no per-shot picker. When tracking on, the magazine decrements (1 SS/SA, 3 BF, N FA + walking-fire waste) and warns (never blocks) when empty.

**Loading-mechanism filter:** a clip-fed gun (`(c)`) only offers clip-mechanism ammo on reload. **In:** gun `15(c)`, stockpiles of clip-APDS and belt-FMJ → only clip-APDS is offered.

**Type effects (applied automatically from the loaded type):**

| Type | Effect | When |
|---|---|---|
| Regular | none | — |
| Explosive | Power +1 | attack |
| EX Explosive | Power +2 | attack |
| Gel | Power −2, damage → Stun | attack |
| APDS | target ballistic halved (round down) | soak card |
| Flechette | unarmoured → level +1; armoured → effective armour ×2 (incl. vehicle) | soak card |
| Tracer | FA-only; tracer rounds raise Level not Power (5M ×10 rds → 12D); −1 TN/3 rds shown as a manual note | attack |
| Anti-Vehicle | bypasses the vehicle Power÷2 reduction | attack |

**Examples:**
- Explosive on `5M` → `6M`. EX on `5M` → `7M`.
- Gel on `9M` → `7M Stun`.
- APDS vs ballistic 6 → soak card shows ballistic **3**, gold note "APDS — ballistic armour halved".
- Flechette vs unarmoured target → soak card incoming level raised one (e.g. `9M` → `9S`). Vs armour 5 → effective armour **10**.
- Tracer FA 10 rounds on `5M` → `12D` (not 15D), gold-noted tracer TN bonus.
- Anti-Vehicle vs vehicle → no Power÷2 applied (no manual checkbox needed on character firearms).

**Vehicle-mounted weapons** keep their own AV-munition checkbox in the 🚗 dialog (no clip system).

### Bows & crossbows — nocked arrows / bolts

Bows and crossbows draw from the same **Ammunition** stockpile as guns, but hold **one** nocked round (capacity 1). Loading mechanism: **bows ↔ Arrow, crossbows ↔ Bolt** (auto-matched by weapon category; slings never deplete). No special arrow/bolt types yet (always Regular). Gated by **Track Ammunition** like firearms.

**Setup:** Add an Ammunition item, set Loading Mechanism = **Arrow** (or **Bolt**), Stock = e.g. 10. Add a Bow (or LCB/MCB/HCB crossbow) on the Projectiles section.

- **Projectiles section (tracking on):** shows a **Nocked** column (Arrow/Bolt when loaded, red "empty" when not) + ↻ Reload. Tracking off → no Nocked column, fires freely (old behaviour).
- **Reload:** ↻ on the bow → offers only **Arrow** stock (crossbow → only **Bolt**). Loads 1, stock 10 → **9**, Nocked shows "Arrow". **In:** bow with arrow stock 10 → reload → stock 9, nocked Arrow.
- **Fire:** looses the nocked round → `loadedRounds` 1 → 0, info "no arrow nocked — reload". **In:** fire the bow → Nocked shows red "empty", dice icon faded.
- **Empty = inoperable:** with no arrow nocked (tracking on), the dice icon is disabled and `rollWeapon` warns "has no arrow nocked — reload"; ↻ stays active. **In:** empty bow → click dice → warning, no roll.
- **Mechanism filter:** a bow offers only Arrow stock, never Bolt (and vice-versa). **In:** actor with both Arrow and Bolt stock, fire a crossbow → reload lists only Bolt.
- **Slings (SL) & uncategorised:** never deplete — no Nocked column entry, always operable.
- **Tracking off:** bows/crossbows fire freely with no counting (reload only sets the type, which is always Regular).
- **Canvas picker:** a bow with no nocked round (tracking on) is **not** listed as ready; nock one → it appears.

### Empty weapons are inoperable (tracking on) - passed
When **Track Ammunition** is on, an empty weapon's dice icon is faded and cannot be rolled; the Reload button stays active.
- **In:** firearm with `loadedRounds 0` → dice icon disabled; clicking does nothing; ↻ Reload still works. After reload → dice icon active.
- **In:** thrown weapon with quantity 0 → dice icon disabled.
- **In:** bow/crossbow with no nocked round → dice icon disabled; ↻ Reload still works.
- Tracking **off** → all weapons always operable (no fading).

### Range (firearms, bows/crossbows, thrown) - passed
Needs both combatants as tokens on a scene whose grid distance is in **metres**.
- **Auto-measure:** target a token (T tool), fire → roll dialog shows a **Range** dropdown pre-set to the measured band, with "measured Nm". TN pre-fills to base + range mod (Short +0 / Medium +1 / Long +2 / Extreme +5).
  - **In:** firearm vs target 37m, Assault Rifle (`50/150/350/550`) → Short, TN 4. At 200m → Long, TN 6. At 600m → "beyond Extreme" warning, TN 9.
- **Override:** change the dropdown → TN recomputes live; or edit the TN field directly. **In:** auto says Long (TN 6); GM picks Medium → TN becomes 5.
- **Strength-scaled (bows/thrown):** bands = STR × multiplier. **In:** STR 5 Bow (`1/10/30/60`) → bands 5/50/150/300m; target 40m → Medium.
- **Per-weapon override:** item sheet "Range Override" = "5/15/30/50" wins over the category table.
- **No tokens / no scale:** no dropdown; set TN manually (unchanged behaviour).

### Attacking from the canvas - passed
- **Token HUD:** select an owned token → 🎯 button → weapon picker lists *ready* weapons (firearm w/ ammo, equipped melee, thrown w/ qty, bow/crossbow w/ nocked round, slings) → fires the normal flow. One ready weapon → fires immediately. **In:** runner with loaded pistol + equipped sword → picker shows both.
- **Hotbar drag:** drag a weapon row from the sheet to the hotbar → "Fire: \<weapon\>" macro created → click fires it. ⚠ Script macros only run for users granted script-macro permission; the Token HUD works for everyone.


### Dodge (binary) - passed
Defender commits dice → after attack rolls → dodge card appears.
- Dodge hits **≥** attack hits → **complete miss**, no damage proceeds.
- Dodge hits **<** attack hits → **full staged damage** proceeds (net hits do NOT reduce staging).

### Soak TN - passed
Formula: `max(2, Damage Power − Armor)`

| Power | Armor (Ballistic) | Soak TN |
|---|---|---|
| 9 | 5 | 4 |
| 6 | 0 | 6 |
| 4 | 8 | 2 (min) |

### Damage staging (after soak) - passed
Every 2 soak hits = 1 stage down (D→S→M→L). Below L = fully soaked.

**In:** `9S` damage, 4 soak hits → staged down 2 → `9L`. 6 soak hits → `9L` → fully soaked.

### Assign Damage button - passed
After soak resolves → **🩸 Assign X to [Name]** button. Click → wound track updates, button disables.

Boxes applied per level:
| Level | Boxes |
|---|---|
| L | 1 |
| M | 3 |
| S | 6 |
| D | 10 |

---

## 6. Melee Combat - passed

Click melee weapon → target dialog → boxing card appears for both sides simultaneously.

### Adjacency (warn only)
Melee reaches **adjacent squares only**. If both attacker and target are tokens on a scene and the target isn't in an adjacent square, a warning posts ("…Nm away — out of reach for a melee attack") but the attack **still proceeds**. Reach affects TN, not range.
- **In:** attacker and target on neighbouring squares → no warning. Target several squares away → warning, boxing card still appears. Off a scene / no tokens → no warning.

### TN formula
`4 − own reach + woundMod`

**In:** Attacker reach 1 → TN `4 − 1 = 3`. Reach 0 → TN 4.

### Defender auto-selects weapon
1. Equipped melee item (equippedMelee field)
2. First unarmed/cyber item found
3. Bare hands: STR + M damage

### Net hits → staging
Winner hits − loser hits = net successes → stage up base damage.

**In:** Attacker 3 hits, defender 1 hit → net 2 → base weapon `6M` stages up 1 → `6S`.

### Loser soak
Loser gets Resist Damage button → soak card for their Body dice vs TN power − armor. Same soak/assign flow as ranged.

---

## 7. Unarmed Combat - passed

A built-in **Unarmed Combat** entry is always available — it's not a real item (uneditable).
- **Where:** top of the Weapons tab's **Cyber & Unarmed** section (a row with a dice icon), and in the canvas Token-HUD attack picker.
- **Damage:** `(STR)M Stun`. **In:** STR 4 → `4M Stun`.
- **Pool / skill choice:** Unarmed Combat and Martial Arts (`MA:`-prefixed, e.g. `MA:Karate`) skills are interchangeable — use the **highest-rated** among them; if none exist, the **interactive Default dialog** opens (see §9).
- Runs the normal melee flow (target → adjacency warn → boxing card → soak).
- **In:** `Unarmed Combat 4` only → boxing card uses **Unarmed Combat 4**, TN 4.
- **In:** `Unarmed Combat 4` and `MA:Karate 6` → boxing card uses **MA:Karate 6** (highest), TN 4, **not** defaulting.
- **In:** no Unarmed Combat and no MA skill → Default dialog pops; choose Attribute → Strength 4 → boxing card shows **STR 4 dice, TN 8 (4+4), Pool max 0**. Choosing Skill/Spec uses ½ rating, +2/+3 TN, pool allowed.
- **In:** both attacker and defender lack a skill → **both** get the dialog (attacker first, then defender).
- **In:** Token HUD attack picker lists "Unarmed Combat" alongside ready weapons → choosing it runs the unarmed attack.
- The defender's bare-hands fallback is also `(STR)M Stun` (aligned).

---

## 8. AoE / Grenades (RAW scatter-first) - passed 

Needs a scene with tokens. Flow: **nominate** the blast point (drag the template, Confirm) → **roll to throw** → scatter **relocates** the blast → re-detect who's caught → soak.
- **In:** throw a grenade, place the template, set grenade type → throw TN auto-fills from the Grenade Range Table for that type (Standard/Aero = STR-scaled, Launcher = fixed); changing the type updates the TN.
- **In:** roll the throw. Scatter = (1d6 standard / 2d6 aero / 3d6 launcher) − **2m per success** (4m aero/launcher). The chat reports direction (relative to throw: 1 overthrow … 4 short) + distance; a result template appears where it landed.
- **In:** **0 successes → grenade does NOT vanish** — it scatters the full rolled distance, lands somewhere, and hits whoever's in range there (possibly no one, possibly the thrower).
- **In:** scatter carries the blast onto a bystander / the thrower → they get a soak card; the nominated target may be missed entirely. (This is intended — grenades are deadly.)
- Per-target power = base damage − distance from the (scattered) epicentre. Damage is **not** staged up by successes.
- **Confined Space (Chunky Salsa):** tick the box → after the throw + scatter, the Chunky Salsa GUI opens seeded with whoever was caught; draw walls / drag positions → it returns each target's code into the soak cards.

### Blast power at distance - passed
`Power at target = weapon power − distance in metres` (from the scattered epicentre).

**In:** Grenade power 12, target 4m from where it landed → effective power **8**.

### Blast power at distance
`Power at target = weapon power − distance in metres`

**In:** Grenade power 12, target 4m away → effective power **8**.

Multiple walls/reflections: additional power penalty applied per path. All wave hits on a target are summed.

Each target gets their own Resist Damage button → soak flow runs per-target.

### Thrown-weapon quantity (tracking on) - passed
Thrown weapons / grenades (`thrown` type, or `projectile` with a thrown category) carry a **Quantity** and are decremented 1 per throw. Bows/crossbows are never consumed. The weapons-tab thrown section shows `×qty` (amber ≤2, red at 0).

- **In:** grenade quantity 3 → throw it → quantity **2**, card resolves as normal.
- **In:** quantity 1 → throw → quantity **0**, "last one" warning, dice icon now disabled.


---

## 9. Skill Rolls

### With skill rating
Pool = skill rating (wound mod adds to TN, not pool)

**In:** Pistols 5, no wounds → 5 dice.

### Specialisation bonus - passed 
Pool = skill rating + 2 (when spec applies)

**In:** Pistols 5, specialisation "Ares Predator", firing an Ares Predator → **7 dice**.

### Defaulting (no skill) — interactive SR3 Default Table - passed
When a roll has **no appropriate skill**, a dialog pops asking how to default. Three tiers:

| Default to | TN modifier | Dice pool | Pool dice |
|---|---|---|---|
| Specialization | +3 | ½ underlying skill **base** rating (round down) | allowed |
| Skill | +2 | ½ chosen skill rating (round down) | allowed |
| Attribute | +4 | full attribute value | **not allowed** |

- The conditional dropdown lists **all** the actor's active skills / specialisations (the GM judges
  relevance) and every attribute. Live preview shows resulting dice / TN mod / pool-allowed.
- **Cancel** aborts the whole action.

**In:** untrained skill → roll → choose **Attribute → Intelligence 4** → pool **4**, TN +4, no pool
dice. Roll label includes `Defaulting → Intelligence 4, TN +4 (no pool)`.
**In:** choose **Skill → Pistols 5** → pool **2** (⌊5/2⌋), TN +2, may add combat pool.
**In:** choose **Specialization → Pistols (Ares) base 5** → pool **2** (⌊5/2⌋), TN +3, may add pool.

---

## 10. Attribute Rolls - passed

Click attribute die on Bio/Attributes tab → rolls pool equal to attribute value vs chosen TN.

**In:** Body 5, TN 4 → 5 dice chat card.

---

## 11. Spellcasting

Combat spells are a single **opposed (resisted) test** — like melee, not like a ranged attack + soak.
Full flow: Cast → Force **+ Damage Level** dialog → Target selection (**no dodge**) → Magic Pool allocation → **Sorcery vs TN = the spell's Target attribute** (e.g. target Willpower) → per-target **Resist Spell** (that same attribute vs **TN = Force**) → **net stages the damage** → Assign Damage. Caster also gets a Drain button. **There is NO soak step after the resist.**

### Force + Damage Level dialog
For a **damaging** spell (item Damage non-empty) the cast dialog has a **Damage level** dropdown (Light/Moderate/Serious/Deadly), defaulting to the spell item's level. The chosen level sets the base damage `(Force)(level)` for the target **and** the caster's drain level. Non-damaging spells (Heal, Detect…) show no dropdown.

**In:** Manabolt (item Damage `S`) → dropdown defaults **Serious (S)**; pick **Moderate (M)** → base `(F)M`, drain level M.

### Damage track follows spell Type (Mana = Stun, Physical = Physical)
The target's damage track is **not** read from the Damage text — it's the spell `Type`: **Mana → Stun**, **Physical → Physical**. (Drain track is separate: Stun, or Physical if Force > Magic.)

**In:** Manaball (Type Mana) `5S`, net 5 → **6D Stun**. A Physical spell at the same numbers → **6D Physical**.

### Sorcery pool
Skill rating + committed magic pool dice.

**In:** Sorcery 5, 2 magic pool committed → **7 dice**.

### Cast TN = the spell's Target attribute (NOT Force)
The caster rolls Sorcery vs **TN = the target's attribute named in the spell's Target field**. Codes: `W`→Willpower, `B`→Body, `I`→Intelligence, `Q`→Quickness, `F`→Force, or a fixed number. The **Force** is the TN for the *resistance* roll, not the cast.

**In:** Manaball (Target W), target Willpower 2 → cast **TN 2**. Same spell vs Willpower 5 → cast TN 5.

### Target-code parsing (suffixes stripped, no errors)
Any `(R)/(T)/(RC)/(V)/(DT)` suffix is descriptive — it's stripped before parsing, so the base code drives both the cast TN and the resist attribute. `OR`/blank/unknown → Mana=Willpower, Physical=Body.

**In:** Target `W(R)` → Willpower (same as `W`). `B(T)` → Body. `I` → Intelligence. `Q` → Quickness. `4(V)` → fixed TN **4** (resist defaults to Willpower). `F` → cast TN = Force. None of these throw or fall back wrongly.

### Force vs Magic (drain Stun/Physical)
- Force ≤ **Magic attribute** → drain is **Stun**.
- Force > **Magic attribute** → drain is **Physical** (warning shown in Force dialog). SR3 RAW — Magic, not Sorcery.

**In:** Magic 5, Force 5 → Stun. Magic 5, Force 6 → Physical. (Sorcery rating is irrelevant here.)

### Drain TN from the drain code
The spell's **Drain** code sets the resist TN: `F`→Force, then the math is evaluated (min 2). Include a level letter (L/M/S/D) or it defaults to S.

**In:** drain `(F/2+1)M`, Force 4 → TN `4/2+1 = 3`, level M. Drain `(F/2)S`, Force 6 → TN 3, level S.

### Resist Spell = opposed, net stages the damage (NO soak)
Target rolls the **same attribute named in the spell's Target field** (the resist reuses the same parser as the cast, so it always matches — W→Willpower, B→Body, I→Intelligence, Q→Quickness) — **attribute only, no pool** — vs **TN = Force**. **Net = caster successes − resister successes**:
- net ≤ 0 → **"Spell resisted — no effect"** (no Assign button).
- net ≥ 1 → base damage (Power = Force, the spell's level) staged up by net (every 2 net = +1 level) → **Assign Damage** button. No further soak card.

### Worked example (Manaball, Target W, Force 6)
Caster Sorcery 4 / Willpower 4; target Street Sam Willpower 2; base level Moderate (M).
1. **Cast:** Sorcery 4 vs **TN = target Willpower 2** → say **3 successes**.
2. **Resist:** target Willpower **2** dice vs **TN = Force 6** → say **1 success**.
3. **Net = 3 − 1 = 2** → +1 stage → **M → Serious (S)** → Assign **6S** (no armour, no soak).
4. **Drain:** (Damage Level +1 = S), Drain Power = Force÷2 = **3** → caster Willpower 4 vs TN 3 stages it down (unchanged step — works as before).

### 0 successes (cast)
Spell fails — no Resist buttons — but the Drain button still appears.

### Area spells (AoE) — canvas template + auto-detect

Set the spell's **Range** to an `(A)` value (`LOS (A)` or `Touch (A)`) — there is **no AoE checkbox**; the `(A)` in the Range code is what makes it area-effect. On cast:
- The **Force dialog** also shows an **Area radius (m)** input, defaulting to the caster's **Magic** attribute (editable).
- Then a purple circle follows the cursor → **left-click** places it, **right-click/Esc** cancels.
- **Every live actor inside the radius (except the caster & vehicles) is auto-targeted** — no checkbox list. **No scatter, no falloff**: each caught target resists at full Force (normal per-target staging).
- A purple **Region** area marker is drawn for **all players**; the result card has a 🧹 **Clear** button (warning-free).
- Empty area → casts anyway, drain still applies.
- **Off a scene** → falls back to the old manual checkbox target list.

**In:** Magic 6 caster, AoE spell → Force dialog radius pre-fills **6**; place over 3 tokens → 3 Resist Spell buttons + 1 Drain button + purple area marker + Clear button.
**In:** place over empty ground → "no targets in the 6m area — casting anyway", only the Drain button + marker.

### Casting from the canvas (🎯 Token-HUD)

Combat/damaging spells (those with a damage code) on an **Awakened** actor appear in the 🎯 attack picker alongside weapons; choosing one runs the normal cast flow. Utility/health spells (no damage code) and mundane actors are excluded.

**In:** mage with Manabolt `8M` + a pistol → 🎯 picker lists both; pick Manabolt → Force dialog opens. **In:** mage with only Heal (no damage) → 🎯 does not list it.

---

## 12. Drain

After spellcasting, Resist Drain button on caster.

### Drain code = two modifiers; ½F and the damage level are the implicit base
- **Power → resist TN** = ⌊Force/2⌋ + the **number outside the brackets** (½F is implicit; default +0).
- **Level** = the cast **Damage Level** + the **number inside the brackets** (`(+1)` or `(DL+1)`/`(Damage Level +1)` = +1 stage; `(DL)`/`()` = +0; `(DL-1)` = −1).

| Drain code | Force | cast level | TN | Drain level |
|---|---|---|---|---|
| `(DL+1)` | 6 | S | 3 | **D** (S +1) |
| `(DL+1)` | 6 | M | 3 | **S** (M +1) |
| `(DL)` | 6 | M | 3 | M |
| `(DL-1)` | 6 | S | 3 | M |
| `+1` (power mod) | 6 | S | **4** (½F+1) | S |
| `+1(+1)` | 6 | S | 4 | D |
| `(F/2+1)S` (legacy F-formula) | 6 | M | 4 | M |
| `(F/2)S` (Heal, non-damaging) | 6 | — | 3 | S |

**In:** Manaball drain `(DL+1)`, cast at **Force 6 Serious** → **3D** (TN ⌊6/2⌋=3, level Serious+1=Deadly), resisted with Willpower — **Stun** (or Physical if Force > Magic). No more "Could not parse drain formula" error.

Pool: Willpower + committed Magic Pool dice.

### Drain staging from resist hits
Every 2 hits = 1 stage down (S→M→M→L→fully resisted).

### Assign Drain button
**⚡ Assign [level] [Stun/Physical] drain to [Caster]** → applies boxes to correct track, disables.

---

## 13. Dispelling

Roll Sorcery (+ Dispelling spec bonus if applicable) + optional spell pool vs TN = Force of target spell.

**In:** Sorcery 5, spec bonus, Force 6 → **7 dice vs TN 6**.

Each 2 net hits over defender's Sorcery roll = 1 stage of Force reduction (not yet fully wired into effects, but roll + drain resolve).

Dispeller resists drain as normal.

---

## 14. Conjuring

Conjuring skill roll vs TN (user-specified, typically Force of spirit).
Spirit resists with Force dice vs TN = Conjuring rating.
Net caster successes = services rendered.

**In:** Conjuring 6 vs TN Force 4 → 6 dice. Spirit rolls 4 dice vs TN 6.
Caster 3 hits, spirit 1 hit → **2 net services**.

Drain applies. Force > Conjuring → Physical drain.

---

## 15. Assensing

Intelligence roll vs TN (entered in dialog).

**In:** INT 5, TN 4 → 5 dice vs TN 4.

Aura Reading complementary roll button appears on result card — rolls Assensing skill after first Assensing roll.

---

## 16. Astral Combat

Both combatants must be in astral space or dual-natured. Click Roll button on astral boxing card.

### Attack / defence dice
Sorcery skill (+ 2 if Astral Combat spec), or **defaulting** (interactive — see §9, linked attribute = Willpower).

**In:** Sorcery 5, no spec → **5 dice**, TN 4. No Sorcery → the Default dialog opens; **both sides**
are prompted (attacker first, defender second) when both lack Sorcery. Choosing Attribute → WIL 4
gives **4 dice**, TN **8** (4 + 4), astral pool **0**.

### TN: 4 (both sides)

### Damage
Unarmed: Charisma + M Stun
Armed (focus): Charisma + weapon focus damage code

**In:** CHA 4 → bare astral damage `4M Stun`.

### Net hits → staging
Same as physical melee — every 2 net hits = +1 stage.

### Soak
Loser rolls Willpower vs TN = winner's Charisma.

**In:** Winner CHA 5 → soak TN **5**.

---

## 17. Astral Modes (Awakened characters only)

Set on the Magic tab. Only one active at a time; clicking active button deactivates.

| Mode | Badge in tracker | Initiative formula |
|---|---|---|
| Physical Plane | Grey "Physical" | Normal |
| Dual Natured | Amber "Dual Nat." | Normal |
| Astral Projection | Purple "Astral" | INT + 20 + 1d6 |

- Clicking Astral Projection on a character with INT 5 → initiative card shows base **25 + 1d6**.

---

## 18. Matrix

### User modes (Matrix tab)

| Mode | Initiative formula | Notes |
|---|---|---|
| Tortoise (TRM) | REA + woundMod + 1d6 | +2 TN to all Matrix actions; wired reflexes apply |
| AR | REA + woundMod + 1d6 | Wired reflexes apply |
| VR-Cold | REA + woundMod + 1d6 | Wired reflexes apply; dumpshock = Stun |
| VR-Hot | (REA_base + woundMod + Response×2) + (1+Response)d6 | Wired reflexes excluded; Response replaces them; dumpshock = Physical |

### Hacking pool
Formula: `⌊(INT + MPCP) / 3⌋` — displayed on sheet when cyberdeck is equipped.

| INT | MPCP | Expected Pool |
|---|---|---|
| 6 | 6 | 4 |
| 5 | 9 | 4 |

### IC wound track
IC soak roll result → **💻 Assign [power][level] Matrix to [IC name]** button → updates IC `system.woundValue`.

IC wound max = `rating × 2`. Hitting max = destroyed.

---

## 19. Matrix Combat — Cybercombat (Decker attacks IC/Agent)

**Prerequisites:** Decker must be connected to a host (User Mode button → host selection dialog). IC must be deployed from a host sheet. Both must share the same `activeHostId`.

Flow: Cybercombat button on decker sheet → **target dialog** (lists all actors on same host) → **boxing card** posts with both sides editable → GM clicks **Roll!** → both wave cards posted → result card.

### Boxing card layout

Both attacker (Decker) and defender (IC/Agent) shown side-by-side. Each corner has editable:
- **Skill** dice (pre-filled from skill rating; if no Cybercombat skill, the **interactive Default dialog** opens first — see §9 — and pre-fills the chosen pool)
- **Pool** (hacking pool, 0 to available; 0 for IC/Agent side; **0** when defaulting to an attribute)
- **TN** (pre-filled 4, + MCM penalty for decker, + the chosen default TN modifier)
- **Damage** code (editable text)

Firewall and soak pool shown read-only in each corner for reference.

### TN is always 4

**In:** Decker cybercombat skill 5, TN pre-filled **4** → **Out:** boxing card shows 4 in TN field.

### Decker damage code

| Condition | Damage code |
|---|---|
| Has Attack/Offensive category program | `${currentRating or rating}S` |
| No such program (fallback) | `${deck.MPCP}L` |

**In:** Attack utility Rating 5 → damage `5S` pre-filled. No attack utility, MPCP 8 → damage `8L`.

### MCM penalty pre-applied to decker TN

| MCM boxes | TN penalty |
|---|---|
| 0–2 | 0 |
| 3–5 | +1 |
| 6–7 | +2 |
| 8+ | +3 |

**In:** 6 deck damage boxes → decker corner TN pre-filled **6** (4+2).

### Tri-state outcome (result card after Roll!)

**Attacker (decker) more hits:**
- Net hits staged into decker's damage code
- **Out:** IC/Agent gets **💻 IC Name: Resist Matrix Damage (Rating N)** button
- Soak TN = `max(2, Power − IC Firewall)` where IC Firewall = host's Security Threshold

**Defender (IC/Agent) more hits:**
- Net hits staged into defender's damage code
- **Out:** Decker gets **🛡 Decker Name: Resist Matrix Damage (MPCP N)** button
- Soak TN = `max(2, Power − Decker Firewall)` where Decker Firewall = own deck's Firewall attribute

**Tie:**
- **Out:** "Tie! X vs X — no damage dealt."

### Net hit staging

| damage code | Net hits | Staged result |
|---|---|---|
| 6S | 0 net | 6S (unchanged) |
| 6S | 2 net | 6D |
| 6L | 4 net | 6S |

### Soak pool — IC soaks with IC Rating (not System Rating)

**In:** IC Rating 5, soak TN 4 (Power 6, host threshold 2) → **Out:** soak card pre-filled pool **5**, TN **4**.

### Soak pool — Decker soaks with MPCP

**In:** Decker MPCP 8, soak TN 3 (Power 5, Firewall 2) → **Out:** soak card pre-filled pool **8**, TN **3**.

### Hacking pool

Decker allocates hacking pool dice in the boxing card Pool field. Spent on Roll! click.

**In:** Hacking pool 4, enter 2 in Pool field → pool reads **2** after roll.

---

## 20. Matrix Combat — IC/Agent attacks Decker

**Prerequisites:** IC must be deployed from the host sheet (sets `deployed: true` and `activeHostId`). Agent must be added to the host's Active Agents (sets `activeHostId`). Decker must be connected to the same host. Target list = all actors sharing the same `activeHostId`.

Flow: IC/Agent Attack button → **target dialog** (host-based list) → **boxing card** posts with both sides editable → GM clicks **Roll!** → result card.

### Boxing card — IC/Agent side

- Skill = IC/Agent `rating` dice, TN 4
- Hacking Pool = 0 (IC/agents don't have hacking pool)
- Damage = IC's `system.damage` field or `${rating}S` fallback

### IC damage code

| IC has `system.damage` set | Damage used |
|---|---|
| Yes (e.g. `6M`) | `6M` |
| No | `${icRating}S` (e.g. Rating 5 → `5S`) |

### Agent attack flow (auto-selects best program)

Agent's Attack button → target dialog → boxing card. Agent's attack program is **auto-selected** as the highest-rating Attack/Offensive program from the operator's deck. Damage code pre-filled in the boxing card and editable by GM.

**In:** Agent with operator whose deck has "Attack" (Rating 4) → boxing card damage pre-filled `4S`. GM can edit before rolling.

### IC deployment flow

Host sheet → Security Sheaf tab → Trigger Step → **⚔ Deploy** button (or Stocked IC → **⚔ Deploy to Encounter**) → IC added to combat + `deployed: true` + `activeHostId` set → IC now appears in matrix target lists.

IC sheet shows **⚔ Deployed** badge and host name. **✕ Clear** button resets deployment for reuse.

**In:** Agent with no Attack programs on operator's deck → dialog skipped, damage falls back to `${agentRating}L`.

**In:** Agent with no operator linked → damage falls back to `${agentRating}L`.

### Boxing card — Decker side (defender)

- Skill = decker's Cybercombat (or the interactive Default dialog — see §9 — when no skill)
- Hacking Pool = available hacking pool (0 to max; **0** when defaulting to an attribute)
- TN = 4 + MCM penalty + chosen default TN modifier
- Damage = decker's own attack program or MPCP-L (for counter-attack)

### Firewall reference

| Side | Firewall source (soak TN reduction) |
|---|---|
| IC | Host's Security Threshold |
| Agent | Operator's cyberdeck Firewall attribute |
| Decker | Own cyberdeck Firewall attribute |

### Tri-state outcome (same result card as §19)

- Attacker (IC/Agent) more hits → decker soaks with MPCP
- Defender (decker) more hits → IC/agent soaks (IC: System Rating; agent: Rating)
- Tie → no damage

---

## 21. Matrix Combat — Program Degradation (Agents)

### Setup

- Operator actor with cyberdeck equipped
- Deck has an Attack program with `degradable: true`, `rating: 3`, `currentRating: 0` (initial — means "use base rating")
- Agent actor with `operatorActorId` set to operator

### Effective rating rule

| `currentRating` | Effective rating used |
|---|---|
| 0 (never degraded) | `rating` (base) |
| > 0 | `currentRating` |

### On each use — decrement

After agent attack roll resolves (regardless of hit count):
- If program is Degradable, `currentRating` decrements by 1
- Amber chat card: **💻 Program Degraded — [Name]: Rating 3 → 2 (on [Operator]'s deck)**
- Both decker and agents using the same deck now see effective rating **2**

**In:** Attack (Degradable, Rating 3, currentRating 0) used → **Out:** currentRating set to **2**, degradation card posted.

### Use sequence

| Use # | currentRating before | Effective rating | currentRating after |
|---|---|---|---|
| 1st | 0 | 3 | 2 |
| 2nd | 2 | 2 | 1 |
| 3rd | 1 | 1 | crash |

### Crash at Rating 1

When effective rating = 1 and the program is used:
- Program item **deleted** from operator's items
- Red chat card: **💻 Program Crash — [Name]: Rating 1 degraded to 0, removed from [Operator]'s deck**
- Program no longer appears in Attack Utility dialog for any agent

**In:** Attack (Degradable, currentRating 1) used → **Out:** item deleted, crash card posted, agent attack falls back to `${agentRating}L` on next attack.

---

## 22. Matrix — Firewall as Armor (Summary)

| Actor type | Firewall source | Soak pool |
|---|---|---|
| Decker (character/NPC) | Own cyberdeck `firewall.base` | MPCP (`mpcp.base`) |
| IC | Host's `securityTierThreshold` (IC lives on a host) | IC `systemRating` |
| Agent | Operator's cyberdeck `firewall.base` (agent lives on a deck) | Agent `rating` |

Soak TN = `max(2, stagedPower − Firewall)`.

**In:** Staged power 8, Firewall 3 → TN **5**. Staged power 4, Firewall 6 → TN **2** (min).

---

## 23. Matrix — Hacking Action (3-step threshold check)

Flow: Hacking Action button → host / TN / threshold / pool dialog → roll → threshold check.

**Defaulting:** with no Hacking/Computer skill the **interactive Default dialog** (see §9) opens
before the action dialog; the chosen pool / TN modifier / pool-allowed are then baked into the
dialog. Applies to the Hacking Action, node-prompt, and program-roll dialogs alike.

### Security Tiers

| Tier | Threshold | Description |
|---|---|---|
| Ivory | 0 | No security |
| Blue | 1 | Low security |
| Green | 2 | Standard |
| Orange | 3 | Challenging |
| Red | 4 | Threatening |
| Black | 5 | Dangerous |
| Ultraviolet | 6 | Deadly |

### Threshold check

- successes ≥ Security Threshold → action proceeds (chat card shows success)
- successes < Security Threshold → action fails + Overwatch +1

**In:** Hacking 5, TN 6, threshold 2. Roll 3 successes → threshold met, action proceeds. Roll 1 success → fail, Overwatch increments.

### Overwatch track

Each failed threshold check increments the host's `system.overwatchCurrent`.

**In:** Overwatch at 3, fail → reads **4**. At 9, fail → reads **10** and Convergence triggers.

### Convergence

Overwatch 10 → red **⚠ CONVERGENCE** card posts:
- Dumpshock attack on decker: Power = host System Rating
- Damage type: Stun (VR-Cold) or Physical (VR-Hot)
- Soak card posted with Body dice

**In:** Host System Rating 8, decker in VR-Hot → Convergence posts `8M Physical`, Body soak card.

---

## 24. Matrix — Dumpshock

Manual trigger via dumpshock button (or auto from Convergence).

| Decker mode | Damage type |
|---|---|
| VR-Cold | Stun |
| VR-Hot | Physical |

Power = host System Rating (selected in dialog or set automatically from Convergence).

**In:** System Rating 6, VR-Cold → `6M Stun` soak card. VR-Hot → `6M Physical` soak card.

Soak: Body dice vs TN = Power (no armor reduction for dumpshock).

---

## 25. Vehicles

### Damage track
All vehicles have a fixed **10-box** damage track regardless of Body. DESTROYED badge appears when all 10 are filled.

**In:** Vehicle with Body 2 → track still shows **10 boxes**.

### Vehicle initiative
Confirm the correct formula fires based on `vcrMode` / `controlledBy` fields on the vehicle actor.

| Mode | Expected formula |
|---|---|
| VCR (jumped-in) | Rigger REA + VCR level, (1+VCR)d6 |
| RCD (remote) | Rigger REA, 1d6 |
| Auto (no pilot) | Pilot rating, 2d6 |

### Mode sync — actor sheet and vehicle sheet must agree
Mode is stored on the vehicle actor (`system.vcrMode`, `system.controlledBy`). Both sheets read from and write to the same data.

- Set VCR on the actor sheet vehicle tab → open vehicle sheet → VCR button is highlighted.
- Set RCD on the vehicle sheet → switch back to actor sheet → RCD button is highlighted.
- Activating VCR on one vehicle in a multi-vehicle list → all other vehicles switch to RCD automatically.
- Entering VR-Cold or VR-Hot on the actor → any vehicle in VCR mode drops to RCD automatically.

### Link Existing
`+ Link Existing` dialog only shows in-world vehicle actors. Compendium-imported templates (isTemplate flag) must **not** appear.

### Create & Link
`+ Create & Link` dialog has a **Source** dropdown:
- First option "-- Create blank --" → shows name input → creates a new blank vehicle actor.
- Subsequent options are compendium entries (sr3e-vehicles, sr3e-drones, etc.) grouped by pack → creates a world actor from that entry with isTemplate cleared.

In both cases the new actor is linked to the rigger and opens its sheet.

### Vehicle soak TN
Formula: `Damage Power` (no armor reduction for vehicles).

**In:** Power 9 → soak TN **9**.

### Assign Damage (vehicle)
**🩸 Assign [code] to [VehicleName]** → updates `system.damage.value`. Capped at **10**.

### Vehicle targeting TN
Formula: `max(2, Signature − Sensor rating)` (or − VCR level if jumped in).

**In:** Target Sig 4, Sensor 2 → TN **2**. Sig 4, Sensor 6 → TN **2** (min).

---

## 26. Pool Refresh

### Combat pool
End combat → GM prompted "Refresh all combat pools?" → Yes clears `combatPoolSpent` on all combatants.

Mid-combat: manually via actor sheet Reset Pools button.

### Pool spending during combat
- Dodge: chosen dice deducted immediately from available combat pool.
- Attack: chosen dice deducted.
- Available = Derived pool − spent. Should never go below 0.

**Test:** Combat pool 5, spend 3 on attack → available reads **2**. Try spending 4 more → capped at **2** actually spent.

---

## 27. Damage Overflow

Physical track full (10 boxes) → additional physical damage goes to overflow. Overflow track visible on character sheet. - Passed

Stun track full → overflow goes to physical track. - Passed

When overflow matches or exceeds body attribute show 'dead' - Passed
---

## Foundry integrations (tokens / statuses / enrichers)

### Token wound bars
Newly-created character/npc tokens show Physical (bar1) and Stun (bar2) as bars that **fill as damage rises**, visible to owners on hover.
- **In:** create a new character, drop a token → hover shows two bars. Tick 3 physical boxes → physical bar ~30% filled. (Existing pre-update actors need their prototype token bars set manually.)

### Status icons
- **Auto-synced:** toggling Astral Projection / Dual-Natured (magic tab), VR-Cold/Hot (matrix tab), or Full Defense sets the matching token status icon automatically; clearing removes it. **In:** set Astral → token shows the aura icon; switch to Physical → icon gone.
- **Manual:** the token HUD status palette includes Sustaining a Spell, Full Defense, Dumpshocked (GM toggles).

### Auto-defeated
- **In:** fill a combatant's physical or stun track → in combat, the combatant is marked **defeated** (skull in tracker) and the token gets the unconscious icon. Heal below full → defeated clears.
- **In:** physical full AND overflow ≥ Body → token shows the **dead** overlay.

### Text enrichers (Biography / Notes)
The Bio tab shows Background/Notes as read-only **enriched** text — `@UUID[...]` links and inline `[[/r ...]]` rolls render and are clickable. Click **✎ Edit** to reveal the textarea; saving re-renders back to enriched.
- **In:** put `@UUID[Actor.xxx]{Mr. J}` in Background → displays as a clickable link, not raw text.

---

## GM tools — Rollable Tables tab
Chase Scene, Driving Test, Session Rewards, Chunky Salsa, Barrier Damage, Falling Damage and Escape Artist buttons now live on the **Rollable Tables** sidebar tab (not the combat tracker). Chase Scene + Driving Test show for all players; the rest are GM-only.
- **In:** open Rollable Tables tab → buttons appear below the header. **Driving Test** → prompts for vehicle + driver, then the usual driving-test dialog.
- **In:** Driving Test with a driver who has **no matching vehicle skill** → the **interactive Default dialog** opens (see §9, linked attribute = Reaction). Choosing Attribute bakes +4 into the base TN and disables the Control Pool; choosing Skill/Spec uses ½ rating, +2/+3 TN, Control Pool enabled.

> Note: the §28/§29 references to "combat tracker sidebar" below are historical — these buttons moved to the Rollable Tables tab.

## 28. Escape Artist

Triggered via the **🔓 Escape Artist** button (Rollable Tables tab, GM only).

### Pool

| Situation | Pool |
|---|---|
| Athletics skill, no spec | Athletics rating |
| Athletics + Escape Artist spec | Athletics rating + 2 |
| No Athletics (defaulting) | interactive Default dialog — see §9 (linked attribute = Body) |

### Restraint TN table

| Restraint | TN |
|---|---|
| Ropes | 4 |
| Handcuffs | 6 |
| Straitjacket | 8 |
| Containment Manacles | 10 |

TN modifier field in dialog: positive values reduce TN (e.g. Pain Resistance levels). Effective TN is clamped to minimum 2.

### Success

**In:** Athletics 5 (Escape Artist spec), Handcuffs (TN 6), no modifier → **7 dice vs TN 6**.

1 success → escaped in **30 min** (5 × 6 ÷ 1). 3 successes → **10 min** (30 ÷ 3, rounded up).

### Failure

0 successes → chat card reads "Cannot try again for **30 minutes**" (5 × 6).

### Defaulting

**In:** No Athletics → preview shows "defaulting — choose at roll". On 🎲, the Default dialog
opens (linked attribute = Body). Choose Attribute → Body 4 → pool **4**, Ropes effective TN
**8** (4 + 4). Choosing Skill/Spec uses ½ rating, +2/+3 TN.

### Pain Resistance modifier

**In:** Handcuffs TN 6, adept with 3 levels Pain Resistance → TN modifier +3 → effective TN **3**.

---

## 29. Falling Damage


Triggered via the **🪂 Falling Damage** button (Rollable Tables tab, GM only).

### Damage calculation

| Distance | Power (dist÷2) | Level |
|---|---|---|
| 1–2 m | 1 | L |
| 3–6 m | 2–3 | M |
| 7–20 m | 4–10 | S |
| 21+ m | 11+ | D |

Impact armour reduces Power by `⌊Impact÷2⌋` before the Athletics test.

**In:** 10 m fall, Impact armour 4 → Power `5 − 2 = 3`, Level S → base damage code **3S**.

### Athletics test

Pool = Athletics rating; if no Athletics skill, the **interactive Default dialog** opens (see §9).
TN = distance in metres (+ chosen default TN modifier). Each success reduces Power by 1.

**In:** Athletics 4, distance 10 → 4 dice vs TN 10.

**In:** No Athletics → Default dialog → Attribute Body 4 → pool **4** vs TN **14** (10 + 4).

### Athletics negates all damage

**In:** Power 2 after armour, Athletics roll 3 successes → Power reduced to 0 → chat card reads "Athletics negates all damage", no soak card posted.

### Soak card

After the Athletics roll, a standard Resist Damage soak card posts for the faller using Impact armour (not Ballistic).

**In:** Final power 3S → soak card shows TN = `max(2, 3 − Impact)`, Body dice editable.

### No armour → armour reduction 0

**In:** 6 m fall, no armour → Power 3, no reduction → base 3M → soak card posts for 3M.

---

## 30. Matrix — Node Tracking (Character / NPC Sheet)

The Matrix tab shows a node-tracking section when the actor is connected to a host (`activeHostId` is set).

### Current node selector

A dropdown lists all nodes on the active host. Selecting one stores `system.currentMatrixNode`.

**In:** Decker connected to a host with nodes SAN, SPU, DS → dropdown shows those three → select DS → `currentMatrixNode` saved.

### Mark chips

Each mark is stored as a node ID. Chips display the node's abbreviation in green.

- **+ Mark** button → dialog lists all host nodes → select one → chip appears.
- **✕** on a chip → removes that mark.

**In:** Decker has no marks → add mark on SPU → green "SPU" chip appears.
**In:** Remove that chip → chip disappears, `matrixMarks` array is empty.

### Auto-mark on Access Node success

When a Hacking Action roll succeeds AND the prompt has `grantsAccess: true` (the Access Node prompt), a mark is automatically added for the current node.

**In:** Decker in SPU, clicks "Access Node" Use button, rolls enough hits to meet Security Threshold → green "✓ Mark Granted — SPU" card posts + SPU chip appears on sheet.

### Requires-mark prompt

If a node prompt has `requiresMark: true` and the decker has no mark on that node, a confirmation dialog appears before the roll.

**In:** Decker in DS with no mark, clicks "Duplicate / Download" Use button → dialog asks "This action requires a mark on this node. Proceed anyway?" → Cancel aborts roll, OK proceeds.

### Link Lock

Checkbox stored as `system.linkLocked`. No automated effect yet — GM reference flag.

---

## 31. Matrix — Node Prompts (Use Buttons)

Each node on a host has a `prompts[]` array. When a decker is in that node, the prompts list is shown on the Matrix tab.

### Prompt badges

- **OW↑** badge (amber) = `overwatchOnFail: true` — a failed threshold check increments Overwatch.
- **+mark** badge (green) = `grantsAccess: true` — a successful Access Node roll auto-marks the node.

### Use button — Hacking prompt (`overwatchOnFail: true`)

Fires `rollPool` with `isHackingActionRoll: true`. Standard hacking flow: threshold check, overwatch on fail, auto-mark if `grantsAccess`.

**In:** Decker clicks Use on "Duplicate / Download" (DS node, `overwatchOnFail: true`) → dialog to set TN and hacking pool dice → Hacking skill + pool dice rolled vs TN → threshold checked against host Security Threshold.

### Use button — Computer prompt (`overwatchOnFail: false`)

Fires plain `rollPool` with no hacking context. No threshold check, no overwatch.

**In:** Decker clicks Use on "Host Services" (SAN node, `overwatchOnFail: false`) → dialog → Computer skill + pool dice rolled → success count shown, no security check.

### Dim prompt (requires mark, no mark held)

Prompts with `requiresMark: true` are dimmed (opacity 0.55) when the decker holds no mark on the current node. Still clickable but shows confirmation dialog first.

**In:** Decker in DS, no mark, "Access Datafile" prompt (requiresMark) → appears dim → clicking shows confirmation before roll fires.

---

## 32. Matrix — Security Sheaf Automation

When a hacking action fails the Security Threshold check, Overwatch increments. If the host has a Trigger Step whose `step` number matches the new Overwatch count, a **GM-only** whisper card appears.

### Sheaf prompt card

Card shows:
- Step description (if set)
- IC assigned to that step (names)
- Three buttons: **📢 Public**, **🔇 Silent**, **✗ No**

**In:** Decker fails hack on a Green (threshold 2) host. Overwatch was 6, now 7. Trigger Step 7 has description "Killer deployed" with Killer IC assigned → whisper card appears for GM only. Players see only the amber "⚠ Overwatch: 7/10" card.

### Public activation

Clicks **📢 Public**:
1. A visible chat card posts to all players: step number, description, IC names.
2. Each regular IC in the step is deployed to the active encounter (`game.combat`) and its `system.deployed` and `system.activeHostId` are set. `system.currentMatrixNode` is set from the IC's stocked entry `nodeId`.
3. Any Alert IC (actor `icType` starts with "alert") sets `system.alertCount` on the host instead of joining the encounter. Alert (Passive) → alertCount 1; Alert (Active) → alertCount 2.
4. The trigger step's `triggered` checkbox is checked.
5. All three buttons disable (one-shot guard).

**In:** Step 7 has Killer IC + Alert (Active) → click Public → Killer appears in encounter, host alertCount set to 2, step 7 checked triggered, public chat posted.

### Silent activation

Clicks **🔇 Silent**:
- Same deploy logic as Public (IC deployed, alert set, step triggered).
- **No** public chat card. A GM-only whisper confirmation posts instead.

**In:** Step 7 → click Silent → Killer deployed, alertCount 2, step triggered, GM sees "🔇 Sheaf level 7 activated silently." Players see nothing additional.

### No activation

Clicks **✗ No**:
- Nothing happens beyond the already-posted Overwatch increment card.
- All three buttons disable.

### Already-triggered step

If the matching trigger step is already `triggered: true`, no whisper card is posted.

**In:** Step 7 triggered in a previous turn → Overwatch reaches 7 again (impossible in normal play, but resetting overwatch manually) → no sheaf prompt appears.

### Alert IC in Active Presence tab

Alert IC that are "deployed" via the sheaf (or Deploy button) appear in the host sheet's **Active Presence → Active Agents / IC** section with "⚔ Deployed" badge, same as regular IC.

---

## 33. Host Sheet — Stocked IC Improvements

### Node assignment dropdown

Each stocked IC row has a node dropdown (pulls from host's `nodes[]`). Selecting a node stores `nodeId` on the stocked IC entry.

**In:** Stocked IC list has Killer → select "CPU" from its dropdown → on next deploy, Killer's `system.currentMatrixNode` is set to the CPU node ID.

### Deployed indicator

Each row shows `⚔` (gold) when the IC actor has `system.deployed: true`, `·` (dim) otherwise. Updates when the host sheet re-renders.

**In:** Deploy Killer from the sheaf prompt → host sheet re-renders → Killer row shows gold ⚔.

### Deploy to Encounter applies node

When IC is deployed (via sheaf prompt or ⚔ Deploy button), if its stocked entry has a `nodeId` set, `system.currentMatrixNode` is set on the IC actor automatically.

**In:** Killer stocked with node = CPU → deploy → Killer actor `system.currentMatrixNode` = CPU node ID.

### Hide All toggle — Stocked IC

👁 button in the Stocked IC section header. If any IC are visible → hides all. If all hidden → reveals all.

**In:** 4 IC visible → click 👁 → all show blur. Click again → all revealed.

### Hide All toggle — Trigger Steps

Same 👁 button in the Trigger Steps section header, same toggle logic.

**In:** 10 steps, 3 triggered (visible) → click 👁 → all blurred. Click again → all revealed.

---

## 34. Host Sheet — Operational Changes

### GM-only visibility

Non-GM users who attempt to open a host sheet see: *"Host sheets are visible to Game Masters only."* and the sheet does not open.

**In:** Player double-clicks a host actor → warning notification, no sheet appears.

### Overwatch + Alerts inline

The Alerts section has been merged into the Overwatch section header row. Alert label (Passive / Active Alert (+2 TN) / Full Alert (+4 TN)) appears to the right of the OW count, with − and + buttons.

**In:** alertCount 0 → right side shows grey "Passive" badge. alertCount 1 → amber "Active Alert (+2 TN)". alertCount 2 → red "Full Alert (+4 TN)".

Alert description (no alert / active / full text) appears below the OW track, replacing the old static OW description.

### Scroll position preserved

Clicking the 👁 eye toggle (hide/show individual or all) no longer jumps the Security Sheaf tab back to the top. Scroll position is preserved across re-renders.

---

## Quick Sanity Numbers

Use these as fast checks with a fresh character (QUI 4, INT 3, WIL 3, STR 3, BOD 4, REA 4, MAG 0):

| Stat | Expected |
|---|---|
| Combat Pool | 5 |
| Initiative base | 4 (+ 1d6) |
| 3 stun boxes wound mod | −2 (TN +2 on all rolls) |
| Combat pool (unchanged by wounds) | 5 |
| Defaulting (INT 3, Attribute tier) | 3 dice, +4 TN, no pool (via Default dialog) |
| Soak TN (power 9, ballistic 4) | 5 |
| BF on `9M` weapon | `12S` |
| Staging: `6M` + 4 net hits | `6D` |
