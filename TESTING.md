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

### Glitch
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

### Recoil (SA / BF / FA)
`totalComp = actor recoilCompensation (Cyber tab) + weapon recoilMod ("Recoil Comp" on the item)`
Both are editable inline in the fire-mode dialog and persist on confirm.

- **SS/SA/FA cumulative:** `max(0, roundsBeforeThisShot − totalComp) × heavyMult`. **In:** fired 3 rounds previously, totalComp 2 → TN penalty **+1**.
- **BF stacks:** `max(0, (roundsBeforeThisShot + 3) − totalComp) × heavyMult` — **+3 first burst, +6 second, +9 third** (BF counts its own 3 rounds). **In:** totalComp 0, first burst → **+3**; fire a second burst (roundsBefore now 3) → **+6**.
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

### Ammunition — stockpile / magazine model

World setting **Track Ammunition** (Configure Settings → System) gates all counting (off by default).

**Stockpile (gear/ammo tabs):** ammo items are a reservoir. Each has Ammo Type, Loading Mechanism (c/m/cy/b/d/sb/internal), and Rounds in Stock. The tab shows Type / Load / Stock — no reload here.

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

### Empty weapons are inoperable (tracking on)
When **Track Ammunition** is on, an empty weapon's dice icon is faded + struck-through and cannot be rolled; the Reload button stays active.
- **In:** firearm with `loadedRounds 0` → dice icon disabled; clicking does nothing; ↻ Reload still works. After reload → dice icon active.
- **In:** thrown weapon with quantity 0 → dice icon disabled.
- Tracking **off** → all weapons always operable (no fading).


### Dodge (binary)
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

## 6. Melee Combat 

Click melee weapon → target dialog → boxing card appears for both sides simultaneously.

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

## 7. Unarmed Combat

Works identically to melee. If no melee weapon equipped, bare hands fallback:
- Damage: `STR + M` (Moderate stun)
- Skill: Unarmed Combat (linked to linked attribute)

**In:** STR 4 → bare hands damage `4M Stun`.

---

## 8. AoE / Grenades

Click grenade/projectile weapon → target selection (multi-select) → each target at a distance gets power reduced.

### Blast power at distance
`Power at target = weapon power − distance in metres`

**In:** Grenade power 12, target 4m away → effective power **8**.

Multiple walls/reflections: additional power penalty applied per path. All wave hits on a target are summed.

Each target gets their own Resist Damage button → soak flow runs per-target.

### Thrown-weapon quantity (tracking on)
Thrown weapons / grenades (`thrown` type, or `projectile` with a thrown category) carry a **Quantity** and are decremented 1 per throw. Bows/crossbows are never consumed. The weapons-tab thrown section shows `×qty` (amber ≤2, red at 0).

- **In:** grenade quantity 3 → throw it → quantity **2**, card resolves as normal.
- **In:** quantity 1 → throw → quantity **0**, "last one" warning, dice icon now disabled.
- **In:** bow fired → quantity unchanged (bows aren't consumables).

---

## 9. Skill Rolls

### With skill rating
Pool = skill rating (wound mod adds to TN, not pool)

**In:** Pistols 5, no wounds → 5 dice.

### Specialisation bonus
Pool = skill rating + 2 (when spec applies)

**In:** Pistols 5, specialisation "Ares Predator", firing an Ares Predator → **7 dice**.

### Defaulting (no skill, using attribute)
Pool = `max(1, Attribute − 2)` (no TN penalty, just smaller pool)

**In:** Linked attribute INT 4, no skill → defaulting pool **2**.

---

## 10. Attribute Rolls

Click attribute die on Bio/Attributes tab → rolls pool equal to attribute value vs chosen TN.

**In:** Body 5, TN 4 → 5 dice chat card.

---

## 11. Spellcasting

Full flow: Cast button on spell → Force dialog → Target selection → Magic Pool allocation → Sorcery roll → spell result → Resist Spell button (per target) → Drain button (caster).

### Sorcery pool
Skill rating + committed magic pool dice.

**In:** Sorcery 5, 2 magic pool committed → **7 dice**.

### Force vs Sorcery
- Force ≤ Sorcery → drain is **Stun**.
- Force > Sorcery → drain is **Physical** (warning shown in Force dialog).

### Damage staging from successes
Base = Force + damage level. Every 2 successes = +1 stage.

**In:** Force 6, spell level S (base = 6S), 4 successes → 2 stage-ups → **6D Physical** (or Stun, depending on spell type).

### 0 successes
Spell fizzles — no damage card — but drain button still appears.

### Target resist (Mana spell)
Willpower dice vs TN = Force.

**In:** Willpower 4, Force 6 → 4 dice vs TN 6.

### Target resist (Physical spell)
Body dice vs TN = Force.

---

## 12. Drain

After spellcasting, Resist Drain button on caster.

### Drain formula parsing

| Drain string | Force | TN | Level |
|---|---|---|---|
| `(F/2)S` | 6 | 3 | S |
| `(F/2)S` | 5 | 2 (min) | S |
| `(F/2+1)M` | 8 | 5 | M |
| `(F-2)S` | 7 | 5 | S |

Pool: Willpower + committed Magic Pool dice, TN = derived from formula above (min 2).

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
Sorcery skill (+ 2 if Astral Combat spec), or default: max(1, Willpower − 2).

**In:** Sorcery 5, no spec → **5 dice**. No Sorcery, WIL 4 → defaulting **2 dice**.

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
- **Skill** dice (pre-filled from skill rating or defaulting)
- **Pool** (hacking pool, 0 to available; 0 for IC/Agent side)
- **TN** (pre-filled 4, + MCM penalty for decker)
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

- Skill = decker's Cybercombat (or INT−2 defaulting)
- Hacking Pool = available hacking pool (0 to max)
- TN = 4 + MCM penalty
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

## 28. Escape Artist

Triggered via the **🔓 Escape Artist** button in the combat tracker sidebar (GM only).

### Pool

| Situation | Pool |
|---|---|
| Athletics skill, no spec | Athletics rating |
| Athletics + Escape Artist spec | Athletics rating + 2 |
| No Athletics (defaulting) | max(1, Body − 2) |

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

**In:** No Athletics, Body 4 → pool **2** (max(1, 4−2)), Ropes TN 4 → 2 dice vs TN 4.

### Pain Resistance modifier

**In:** Handcuffs TN 6, adept with 3 levels Pain Resistance → TN modifier +3 → effective TN **3**.

---

## 29. Falling Damage


Triggered via the **🪂 Falling Damage** button in the combat tracker sidebar (GM only).

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

Pool = Athletics rating; if no Athletics skill, defaults to `max(1, Body − 2)`.
TN = distance in metres. Each success reduces Power by 1.

**In:** Athletics 4, distance 10 → 4 dice vs TN 10.

**In:** No Athletics, Body 4 → defaulting pool 2 vs TN 10.

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
| Defaulting pool (INT 3) | 1 |
| Soak TN (power 9, ballistic 4) | 5 |
| BF on `9M` weapon | `12S` |
| Staging: `6M` + 4 net hits | `6D` |
