---
title: Actions & Combat
parent: Rules
nav_order: 1
---

# Actions & Combat
{: .no_toc }

How a Combat Phase works, how ranged and melee attacks resolve, the
modifier tables, wounds, and short summaries of spellcasting, decking and
vehicle combat.

1. TOC
{:toc}

{: .fixed }
> Original gist: "Complete Actions & Combat System Guide".
> - You get **one Free Action in every Combat Phase**, including other
>   characters' phases, not one per Initiative Pass.
> - "Take Cover" is not an SR3 action. "Suppressive fire" does not exist in
>   the core rules.
> - Nearly every value in the modifiers table was wrong: partial cover is
>   **+4**, target running is **+2**, and the visibility values come from a
>   two-axis table.
> - Damage staging is **net**: attacker successes are compared with the
>   defender's Dodge + Damage Resistance successes. The dodge doesn't reduce
>   the attacker's successes directly.
> - SR3 has a **Spell Pool**, not a Magic Pool. Drain TN is Force ÷ 2 plus a
>   modifier; there is no minimum-2 rule of its own.
> - Matrix: there is no "Access Node" action and no "Response Index". Hacking
>   Pool **cannot** be used to resist black IC.
> - Vehicles: "VCTR" is not an SR3 term. A crash test comes from **Serious**
>   damage in one attack, not Moderate, and the TN is Handling.

---

## The Combat Turn

- **Dice pools refresh at the start of every Combat Turn.** Unused pool
  dice don't carry over. Karma Pool is the exception. *(SR3 p.104)*
- Everyone acts in Initiative order in the first **Initiative Pass**. After
  each pass, subtract 10 from every Initiative Score. A character at 0 or
  less is done for the turn. *(SR3 p.104)*
- Wound modifiers reduce Initiative immediately. *(SR3 p.104, p.126)*

## Action economy  *(SR3 p.104–108)*

In your **Combat Phase** you take **either two Simple Actions or one
Complex Action**. *(SR3 p.104)*

Separately, you may take **one Free Action during any character's Combat
Phase**, including your own. You can't take one before your first Combat
Phase of the first Initiative Pass. Free Actions taken in someone else's
phase resolve last in that phase. *(SR3 p.105)* A Free Action can also be
taken in place of a Simple Action. *(SR3 p.105)*

### Free Actions  *(SR3 p.105)*

Activate cyberware · call a shot · change a **smartgun's** fire mode ·
deactivate a focus · delay an action · drop an object · drop prone · drop a
sustained spell · eject a smartgun clip · gesture · observe (no Perception
Test) · speak a word or short phrase · allocate Spell Defense dice.

### Simple Actions  *(SR3 p.105–107)*

| Action | Notes |
| :--- | :--- |
| **Fire Weapon** | One shot in single-shot, semi-auto or burst-fire mode. A single-shot weapon fires only once per Combat Phase. With a gun in each hand, one Simple Action fires each once. *(p.106)* |
| **Change Gun Mode** | A Simple Action for an ordinary gun; a Free Action for a smartgun with smartlink. *(p.106)* |
| **Change Position** | Stand up or lie down. Wounded characters make a Willpower (2) Test to stand. *(p.106)* |
| **Insert Clip / Remove Clip** | One Simple Action each. *(p.106–107)* |
| **Ready Weapon** | Draw a weapon, or nock an arrow. Small throwing weapons: ready ½ Quickness of them per action. *(p.107)* |
| **Take Aim** | −1 TN per action, cumulative. Maximum ½ the skill. Lost if you take any other action. *(p.107)* |
| **Throw Weapon** | Throws a ready throwing weapon. *(p.107)* |
| **Observe in Detail** | A Perception Test. *(p.106)* |
| **Quick Draw** | Draw and fire a pistol with a Reaction (4) Test; +2 without a proper holster. *(p.107)* |
| **Shift Perception** | Switch to or from astral perception. *(p.107)* |
| Also | Activate focus · call a nature spirit on standby · command a spirit · pick up / put down an object · use a simple object. *(p.105–107)* |

### Complex Actions  *(SR3 p.107–108)*

A Complex Action uses your whole phase. You may still take a Free Action,
but no Simple Actions. *(SR3 p.107)*

| Action | Notes |
| :--- | :--- |
| **Fire Automatic Weapon** | Full-auto fire. *(p.107)* |
| **Fire Mounted or Vehicle Weapon** | *(p.108)* |
| **Melee / Unarmed Attack** | May attack several targets in reach with one action. *(p.108)* |
| **Cast Spell** | *(p.107)* |
| **Summon Nature Spirit** | *(p.108)* |
| **Astral Projection** | Leaving or returning to your body. *(p.107)* |
| **Reload Firearm** | Weapons without clips. *(p.108)* |
| **Use Skill / Use Complex Object** | First aid, operating a cyberdeck or vehicle, and so on. *(p.108)* |
| Also | Banish spirit · call elemental · control spirit · erase astral signature. *(p.107)* |

**Movement doesn't use an action.** Walking rate is Quickness in meters
per Combat Turn. Running rate is Quickness × 3 for humans, elves, orks and
trolls, and × 2 for dwarfs. Both are divided evenly across the turn's
Initiative Passes. *(SR3 p.108)*

---

## Ranged combat  *(SR3 p.109–114)*

```
Attack Test ─▶ Dodge Test (optional) ─▶ Damage Resistance Test ─▶ Compare & stage
```

1. **Base target number from range**: Short **4**, Medium **5**, Long **6**,
   Extreme **9**, using the band for your weapon on the Weapon Range Table.
   *(SR3 p.111)* Apply the modifiers below.
2. **Attack Test**: the ranged combat skill plus any Combat Pool dice.
   Count successes. No successes means a miss. *(SR3 p.113)*
3. **Dodge Test (defender's choice)**: **Combat Pool dice only**, against
   TN **4**, plus 1 per 3 rounds of a burst or full-auto attack, plus 1 per
   meter of shotgun spread, plus the defender's wound modifier.
   - Beat the attacker's successes and the attack **misses completely**. A
     tie does not count.
   - Otherwise the dodge successes aren't wasted. They **add to your Damage
     Resistance successes**. *(SR3 p.113)*
4. **Damage Resistance Test**: Body (including dermal armor) plus any
   Combat Pool dice left, against TN = **weapon Power − armor**, minimum 2.
   *(SR3 p.113)*
5. **Determine the outcome**: compare the attacker's successes with the
   defender's total (dodge + resistance). *(SR3 p.113)*
   - Attacker ahead: stage the Damage Level **up** one step (L → M → S → D)
     per **2** successes over the defender's total.
   - Defender ahead: stage it **down** one step per 2 successes over the
     attacker's. Below Light, no damage.
   - Tie: base damage.
   - In ranged combat, staging stops at **Deadly**. Extra successes are
     discarded. *(SR3 p.113)*

### Worked example, from the rulebook  *(SR3 p.113)*

Liam (Pistols 6) fires an Ares Predator (**9M**) and gets **5** successes.
Snot (Body 5, ballistic armor 4, already Lightly wounded) dodges with all 5
Combat Pool dice against TN **5** (4, +1 for his wound) and gets **2**. That's
not enough to dodge, but the 2 count. His Damage Resistance Test is 5 Body
dice against TN **5** (9 − 4) and gets **1**. Snot's total is **3**, Liam's is
5. Liam is 2 ahead, so the damage stages up once to **9S**.

---

## Melee combat  *(SR3 p.120–123)*

Melee is a **Complex Action**. It is an **opposed** test: both sides roll.
*(SR3 p.108, p.122)*

1. **Attacker**: combat skill plus Combat Pool dice against base TN **4**,
   modified. *(SR3 p.122)*
2. **Defender**: the same, also against base TN **4**, modified. *(SR3 p.122)*
3. **Most successes hits. A tie goes to the attacker.** *(SR3 p.122)*
4. The winner stages the damage up one level per **2** successes over the
   loser's. **In melee, once the level reaches Deadly, every 2 further
   successes add +1 Power.** *(SR3 p.122)*
5. The loser rolls **Body** against **Power − Impact armor**. Every 2
   successes reduce the Damage Level by one. *(SR3 p.122)*

**Reach** gives a differential. The fighter with the longer reach may take
the difference as a −TN to their own test **or** a +TN to the opponent's.
*(SR3 p.121)*

---

## Modifier tables

### Ranged Combat Modifiers  *(SR3 p.112)*

| Situation | Modifier |
| :--- | :---: |
| Recoil, semi-automatic | +1 for the second shot that phase |
| Recoil, burst-fire | +3 per burst that phase |
| Recoil, full-auto | +1 per round fired that phase |
| Recoil, heavy weapon | 2 × uncompensated recoil |
| Blind fire | +8 |
| Partial cover | **+4** |
| Multiple targets | +2 per additional target that phase |
| Target running | **+2** |
| Target stationary | −1 |
| Attacker in melee combat | +2 per opponent |
| Attacker walking / on difficult ground | +1 / +2 |
| Attacker running / on difficult ground | +4 / +6 |
| Attacker wounded | Damage Modifiers Table |
| Smartlink with smartgun | −2 |
| Smart goggles with smartgun | −1 |
| Laser sight (to 50 m; defeated by mist, smoke, fog or rain) | −1 |
| Using a second firearm | +2, and no smartlink, goggle or laser bonus |
| Aimed shot | −1 per Simple Action |
| Called shot | +4 |

Recoil compensation reduces only recoil. Gyro-stabilization reduces recoil
and movement modifiers. *(SR3 p.113)*

### Visibility Table  *(SR3 p.112)*

In each vision cell, the first number is for cybernetic vision and the
second for natural vision.

| Condition | Normal | Low-Light | Thermographic |
| :--- | :---: | :---: | :---: |
| Full darkness | +8 | +8/+8 | +4/+2 |
| Minimal light | +6 | +4/+2 | +4/+2 |
| Partial light | +2 | +1/0 | +2/+1 |
| Glare | +2 | +4/+2 | +4/+2 |
| Mist | +2 | +2/0 | 0 |
| Light smoke / fog / rain | +4 | +4/+2 | 0 |
| Heavy smoke / fog / rain | +6 | +6/+4 | +1/0 |
| Thermal smoke | +4 | +4 | +8/+6 |

In melee, visibility modifiers apply at **half value** (rounded down),
except full darkness. *(SR3 p.122)*

### Melee Modifiers  *(SR3 p.123)*

| Situation | Modifier |
| :--- | :---: |
| Called shot | +4 |
| Character has more friends in the melee | −1 per friend, maximum −4 |
| Opponent has more friends in the melee | +1 per friend, maximum +4 |
| Longer reach | −1 per point (or +1 to the opponent) |
| Attacking multiple targets | +2 per additional target |
| Superior position | −1 |
| Opponent prone | −2 |
| Wounded | Damage Modifiers Table |

---

## Wounds and the Condition Monitor  *(SR3 p.125–126)*
{: #wounds-and-the-condition-monitor }

Physical and Stun damage each fill a **10-box** track.

| Boxes filled | Level | Target numbers | Initiative |
| :---: | :--- | :---: | :---: |
| 1 | Light | +1 | −1 |
| 3 | Moderate | +2 | −2 |
| 6 | Serious | +3 | −3 |
| 10 | Deadly | Unconscious | — |

- Use only the **highest** level in each track, but add the Stun and
  Physical modifiers together. *(SR3 p.125–126)*
- The injury modifier applies to nearly every test **except** tests to
  resist or avoid damage. *(SR3 p.126)*
- **Stun past 10 boxes** overflows into the Physical track, and you fall
  unconscious. *(SR3 p.125)*
- **Physical past 10 boxes**: you can survive overflow up to your **Body**
  rating. One box beyond that and you are dead. While in overflow, you take
  another box every (Body) Combat Turns until stabilized. *(SR3 p.125–126)*

---

## Spellcasting and Drain  *(summary)*
{: #spellcasting-and-drain }

The full step-by-step, with Spell Defense, elemental spells and sustaining, is
on [Spellcasting, Resistance & Drain](../../magic/spellcasting/).

Casting a spell is a **Complex Action**. *(SR3 p.107)*

1. **Force**: you can cast a spell at any Force up to the one you learned it
   at, never higher. *(SR3 p.178)*
2. **Sorcery Test**: Sorcery dice plus up to an equal number of **Spell
   Pool** dice. The TN is the target's **Willpower** for mana spells or
   **Body** for physical spells. Objects use the Object Resistance Table:
   natural 3, low-tech 5, high-tech 8, highly processed 10+. *(SR3 p.182)*
   If every die shows 1, the spell fails and Drain TN rises by 2.
   *(SR3 p.182)*
3. **Resistance**: the target resists with the same attribute, and the net
   successes decide the effect.
4. **Drain**: every spell lists a code like `+1(M)`. Drain **Power** (the TN)
   = **Force ÷ 2, rounded down, + the modifier**; **M** is the Damage
   Level. Resist with **Willpower** plus any number of Spell Pool dice.
   Every 2 successes reduce the level one step. *(SR3 p.162, p.44)*
   - Drain is **Stun**, or **Physical** if the Force is higher than your
     Magic, or if you are astrally projecting. *(SR3 p.162)*
   - Each spell you are sustaining adds **+2** to Drain Power. *(SR3 p.162)*
   - Conjuring Drain is resisted with **Charisma**. *(SR3 p.162)*

**Spell Pool** = (Intelligence + Willpower + Magic) ÷ 3, rounded down.
*(SR3 p.44)*

---

## Decking  *(summary)*

- **Hacking Pool** = (Intelligence + MPCP) ÷ 3, rounded down. You can add at
  most your skill dice from it to a test. It **can't** be used on Body or
  Willpower tests against gray or black IC, or on Etiquette (Matrix).
  *(SR3 p.44)*
- **Matrix Initiative**: your persona's Reaction + **1D6**. Each point of
  **Response Increase** adds +2 Reaction and **+1D6**, up to 3 points and no
  more than MPCP ÷ 4. Wired reflexes and other physical boosts don't apply.
  *(SR3 p.207, p.223)*
- Icons get the same Free / Simple / Complex actions. *(SR3 p.223)*
- **System Tests**: you roll Computer against the relevant subsystem rating
  (Access, Control, Index, Files, Slave). The host rolls its Security Value
  against your Detection Factor, and its successes build your **security
  tally**, which triggers alerts and IC. *(SR3 p.209–210)*
- **Security codes**: Blue, Green, Orange, Red. Deckers call the ones off
  the chart "UV". *(SR3 p.205)*
- **IC** *(SR3 p.227–230)*
  - **White** affects only your icon: crippler, killer, probe, scramble,
    tar baby.
  - **Gray** attacks your deck and utilities: blaster, ripper, sparky, tar
    pit.
  - **Black** attacks **you**. Against lethal black IC you resist with
    **Body**, reduced by Hardening. Hacking Pool can't be used; Karma Pool
    can. After black IC hits you, jacking out takes a Complex Action and a
    Willpower (IC Rating) Test. *(SR3 p.230)*
- **Tortoises** (cyberterminals) can't be hurt by black IC or dump shock.
  *(SR3 p.208)*
- *Matrix* adds **cold ASIST**, which treats lethal black IC as non-lethal,
  and **hot ASIST**, which you need for Response Increase and Hacking Pool.
  *(Matrix p.18)*

---

## Vehicle combat & rigging  *(summary)*

- **Vehicle Control Rig**: each level gives +2 Reaction and **+1D6**
  Initiative while rigging. *(SR3 p.301)*
- **Control Pool** = Reaction as modified by the VCR. *(SR3 p.44)* It only
  works in a vehicle adapted for rigger control. *(SR3 p.134)*
- **Driving Tests** use the vehicle's **Handling** as base TN. A jacked-in
  rigger subtracts the VCR rating. Vehicle-combat maneuver tables subtract
  **2 × VCR rating**. *(SR3 p.134, p.142–144)*
- **Gunnery**: mounted weapons use the Gunnery skill and the ordinary
  ranged-combat rules. Sensor-enhanced gunnery adds half the Sensor rating
  in dice. *(SR3 p.151–152)*
- **Shooting a vehicle**: halve the weapon's Power and drop its Damage Level
  one step, then subtract vehicle armor. If what's left doesn't beat the
  armor, no damage. Anti-vehicle munitions skip the halving and subtract
  only half the armor. *(SR3 p.149)*
- **Vehicle Damage Resistance**: vehicle Body plus Control Pool dice up to
  the Driving skill, against the modified Power. Riggers may **dodge** with
  Control Pool against the vehicle's Handling. *(SR3 p.149)*
- **Crash Tests** are required when a vehicle takes **Serious** damage in a
  single attack, reaches Destroyed, takes damage from a ram, or brakes harder
  than Acceleration × 4. The test is a Driving Test against **Handling**.
  *(SR3 p.147)*
- **Rigger damage**: if the vehicle takes Serious damage, the jacked-in
  rigger resists **6M** Physical. If it's destroyed, **6S**. This is resisted
  with **Willpower**, and no pool dice can be used. *(SR3 p.145)*
