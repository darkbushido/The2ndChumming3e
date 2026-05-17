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
Reporting of 1s omitted with Physical dice mode - triggers nothing, GM convenience only.

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

**Tests:**
- Fill **1 stun box** → wound mod reads **−1**.
- Fill **3 stun boxes** on a character with Combat Pool 5 → Combat Pool reads **3**.
- Fill **6 physical boxes** → wound mod from physical track is **−3**.
- Fill **10 stun boxes** → Wound Mod field reads `unconscious`.

- TN modifier passed
- Initiative modifier passed
---

## 3. Derived Pools

### Combat Pool
Formula: `⌊(QUI + INT + WIL) / 2⌋ + modifier`

| QUI | INT | WIL | Expected Pool |
|---|---|---|---|
| 4 | 3 | 3 | 5 |
| 6 | 5 | 4 | 7 |
| 3 | 2 | 2 | 3 |
- Passed

### Spell Pool (Awakened only)
Formula: `⌊(INT + WIL + MAG) / 3⌋`

| INT | WIL | MAG | Expected Pool |
|---|---|---|---|
| 5 | 4 | 6 | 5 |
| 4 | 3 | 4 | 3 |

- Non-Awakened actors (MAG 0): field should be **hidden**.
-Passed

### Astral Pool (Awakened only)
Formula: `⌊(INT + CHA + WIL) / 2⌋`

| INT | CHA | WIL | Expected Pool |
|---|---|---|---|
| 6 | 4 | 5 | 7 |
| 4 | 3 | 3 | 5 |
-Passed

### Hacking Pool
Formula: `⌊(INT + MPCP) / 3⌋` where MPCP comes from the equipped cyberdeck. Hidden if no cyberdeck is equipped.

| INT | MPCP | Expected Pool |
|---|---|---|
| 6 | 6 | 4 |
| 5 | 8 | 4 |
| 4 | 0 | 1 |
- Passed
---

## 4. Initiative

### Physical (default)
Formula: `REA - woundMod` base + `1d6`

**In:** REA 4, no wounds → **Out:** rolls `4 + 1d6`, result 5–10.

### Astral Projection
Formula: `INT + 20` base + `1d6`

**In:** INT 5 → **Out:** rolls `25 + 1d6`, result 26–31.

### Matrix VR-Hot / VR-Cold
Formula: `REA + (Response × 2)` base + `(1 + Response)d6`

**In:** REA 4, Response 3 → base `4 + 6 = 10`, dice `4d6` → result 14–34.

### VCR (Vehicle — jumped-in rigger)
Formula: `Rigger REA + VCR level + woundMod` base + `(1 + VCR)d6`

**In:** REA 5, VCR 2 → base `7`, dice `3d6` → result 10–25.

### RCD (Vehicle — remote control)
Formula: `Rigger REA + woundMod` base + `1d6`

**In:** REA 5 → **Out:** `5 + 1d6`, result 6–11.

### Auto / Pilot (Vehicle — no rigger)
Formula: `Pilot rating` base + `2d6`

**In:** Pilot 4 → **Out:** `4 + 2d6`, result 6–16.

### Shift-click (physical dice mode)
Any initiative button → shift-click → dialog asks for result → enter manually, posts card with that value.

### SR3 pass mode
After everyone acts: all initiatives drop by 10. Combatants with initiative ≤ 0 are done. Continue until none left, then GM prompted to re-roll.

### SR2 flat queue mode
Full action list built upfront (init, init−10, init−20 …). Walk top to bottom.

---

## 5. Ranged Combat

Full flow: click weapon → target dialog → dodge declaration → attack roll → dodge roll (if declared) → soak card → soak roll → assign damage button.

### Attack dice
**In:** Pistols skill 5, TN 4 → **Out:** 5 dice chat card vs TN 4.

### Firing modes

| Mode | Rounds | Power mod | Level mod |
|---|---|---|---|
| SS | 0 (no recoil) | 0 | 0 |
| SA | 1 | 0 | 0 |
| BF | 3 | +3 | +1 stage |
| FA (3 rds) | 3 | +3 | +1 stage |
| FA (6 rds) | 6 | +6 | +2 stages |
| FA (9 rds) | 9 | +9 | +3 stages |

**BF example:** Weapon `9M` → BF → damage becomes `12S`.

### Recoil (SA / BF / FA)
`Recoil TN penalty = rounds fired this phase − recoil compensation`

**In:** Fired 3 rounds previously, compensation 2 → TN penalty **+1**.

### FA multi-target TN penalty

| Target number | TN penalty |
|---|---|
| 1st | 0 |
| 2nd | +2 |
| 3rd | +4 |
| 4th | +6 |
| 5th+ | +8 |

### Dodge (binary)
Defender commits dice → after attack rolls → dodge card appears.
- Dodge hits **≥** attack hits → **complete miss**, no damage proceeds.
- Dodge hits **<** attack hits → **full staged damage** proceeds (net hits do NOT reduce staging).

### Soak TN
Formula: `max(2, Damage Power − Armor)`

| Power | Armor (Ballistic) | Soak TN |
|---|---|---|
| 9 | 5 | 4 |
| 6 | 0 | 6 |
| 4 | 8 | 2 (min) |

### Damage staging (after soak)
Every 2 soak hits = 1 stage down (D→S→M→L). Below L = fully soaked.

**In:** `9S` damage, 4 soak hits → staged down 2 → `9L`. 6 soak hits → `9L` → fully soaked.

### Assign Damage button
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

| Mode | Initiative | Notes |
|---|---|---|
| Tortoise (TRM) | Physical | +2 TN to all Matrix actions |
| AR | Physical | Standard |
| VR-Cold | Matrix formula | Dumpshock = Stun |
| VR-Hot | Matrix formula | All damage Physical |

### Hacking pool shown on sheet
`⌊INT / 2⌋ + hackingBonus` — hackingBonus field manually set to `⌊MPCP / 3⌋`.

### IC wound track
IC soak roll result → **💻 Assign [power][level] Matrix to [IC name]** button → updates IC `system.woundValue`.

IC wound max = `rating × 2`. Hitting max = destroyed.

---

## 19. Vehicles

### Vehicle initiative
Confirm the correct formula fires based on `vcrMode` / `controlledBy` fields on the vehicle actor.

| Mode | Expected formula |
|---|---|
| VCR (jumped-in) | Rigger REA + VCR level, (1+VCR)d6 |
| RCD (remote) | Rigger REA, 1d6 |
| Auto (no pilot) | Pilot rating, 2d6 |

### Vehicle soak TN
Formula: `Damage Power` (no armor reduction for vehicles).

**In:** Power 9 → soak TN **9**.

### Assign Damage (vehicle)
**🩸 Assign [code] to [VehicleName]** → updates `system.damage.value`. Max = `Body × 2`.

### Vehicle targeting TN
Formula: `max(2, Signature − Sensor rating)` (or − VCR level if jumped in).

**In:** Target Sig 4, Sensor 2 → TN **2**. Sig 4, Sensor 6 → TN **2** (min).

---

## 20. Pool Refresh

### Combat pool
End combat → GM prompted "Refresh all combat pools?" → Yes clears `combatPoolSpent` on all combatants.

Mid-combat: manually via actor sheet Reset Pools button.

### Pool spending during combat
- Dodge: chosen dice deducted immediately from available combat pool.
- Attack: chosen dice deducted.
- Available = Derived pool − spent. Should never go below 0.

**Test:** Combat pool 5, spend 3 on attack → available reads **2**. Try spending 4 more → capped at **2** actually spent.

---

## 21. Damage Overflow

Physical track full (10 boxes) → additional physical damage goes to overflow. Overflow track visible on character sheet. - Passed

Stun track full → overflow goes to physical track. - Passed

When overflow matches or exceeds body attribute show 'dead' - Passed
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
