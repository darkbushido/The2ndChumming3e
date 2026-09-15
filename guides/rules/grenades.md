---
title: Grenades
parent: Rules
nav_order: 3
---

# Grenades
{: .no_toc }

Throwing or launching a grenade, where it lands, when it goes off, and what
the blast does. All rules are from the core rulebook, *(SR3 p.118–119)*.

1. TOC
{:toc}

{: .fixed }
> Original gist: "Grenade Throwing Rules Reference".
> - The range table was invented. Grenades have **their own** range table,
>   with base TNs **4 / 5 / 8 / 9**, not 4 / 5 / 6 / 9, and bands of STR × 3 /
>   5 / 10 / 20 for a standard grenade.
> - Scatter is **1D6 m** (standard), **2D6 m** (aerodynamic) or **3D6 m**
>   (launcher). Each success removes **2 m** (standard) or **4 m**
>   (aerodynamic and launcher), not 2D6 m less 1 m per success.
> - Grenades go off in **your next Combat Phase**, not at the end of the
>   Combat Turn. There are no fuse types in the core rules.
> - Offensive grenades are **10S, −1 Power per meter**. Defensive grenades
>   are **10S, −1 per half meter**. Concussion grenades are **12M Stun, −1
>   per meter**. There is no "12D HE".
> - All blast damage is resisted with **Impact** armor.
> - The chunky salsa effect adds the **combined Power** of each pass of the
>   wave. It is not a series of separate damage rolls.

---

## 1. Hitting the target  *(SR3 p.118)*

1. **Pick the target point.**
2. **Make the attack test** with **Throwing Weapons** for a thrown grenade,
   or **Launch Weapons** for a grenade launcher. *(SR3 p.86)* Throwing
   Weapons is linked to Strength and defaults to Strength. You may add
   Combat Pool dice. *(SR3 p.86, p.118)*
3. **Base TN** comes from the Grenade Range Table below. Apply the usual
   ranged combat modifiers (see [Actions & Combat](../combat/)).
   *(SR3 p.118)*

### Grenade Range Table  *(SR3 p.119)*

| Type | Short (TN 4) | Medium (TN 5) | Long (TN 8) | Extreme (TN 9) | Scatter |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Standard | 0 – STR × 3 | to STR × 5 | to STR × 10 | to STR × 20 | 1D6 m |
| Aerodynamic | 0 – STR × 3 | to STR × 5 | to STR × 20 | to STR × 30 | 2D6 m |
| Grenade launcher | 5 – 50 m | 51 – 100 m | 101 – 150 m | 151 – 300 m | 3D6 m |

Launcher minigrenades don't arm until they've traveled about **5 meters**.
Disabling that safety takes an Electronics B/R (6) Test and 5 minutes.
*(SR3 p.118)*

## 2. Scatter  *(SR3 p.119)*

Every grenade scatters to some degree.

- **Direction**: roll **1D6** and read the Scatter Diagram. The arrow points
  in the direction of the throw. **1** means the grenade carried on past the
  target, **4** means it bounced back toward the thrower.
- **Distance**: roll the dice from the Scatter column, then subtract **2 m
  per success** for a standard grenade, or **4 m per success** for an
  aerodynamic grenade or launcher.
- At **0 or less**, the grenade goes off exactly on target. Otherwise it goes
  off the remaining distance away in the rolled direction.

## 3. When it goes off  *(SR3 p.119)*

A grenade goes off in the **next Combat Phase of the character who threw or
fired it**.

- If they have no more Combat Phases this turn, it goes off at the **end of
  the next Initiative Pass**.
- If it was thrown in the **last** Initiative Pass of the turn, it goes off
  at the **end of that Combat Turn**.

## 4. The blast  *(SR3 p.119)*

### Grenade Damage Table  *(SR3 p.119)*

| Type | Damage Code | Power reduction |
| :--- | :---: | :--- |
| Offensive | 10S | −1 per meter |
| Defensive | 10S | −1 per **half** meter |
| Concussion | 12M Stun | −1 per meter |

Each target resists with **Body** plus any Combat Pool dice, against TN =
**Power at their distance − Impact armor**. Compare their successes with the
thrower's: every 2 more for the thrower stage the damage **up** one level,
and every 2 more for the target stage it **down** one level. *(SR3 p.119)*

The book's own example: a target 3 m from an **offensive** grenade faces
**7S** (10 − 3). A target 3 m from a **defensive** grenade faces **4S**
(10 − 6). At 6 m, the defensive grenade does nothing. *(SR3 p.119)*

**Anti-personnel (AP) grenades** are offensive or defensive grenades with
heavy fragmentation. Their damage uses the **flechette** rules. *(SR3 p.119,
p.116)*

**Optional rule, grenade damage**: instead of staging with the thrower's
successes, roll dice equal to half the grenade's Power (round up) against
TN 4, and stage up with those successes. *(SR3 p.119)*

## 5. Barriers and confined spaces  *(SR3 p.119)*

**Blast against a barrier**: compare the blast's remaining Power with
**twice** the Barrier Rating and use the Barrier Effect Table (p.124). If
the barrier falls, the blast carries on with its Power reduced by the
original Barrier Rating. If it holds, the blast may be channeled.

**Blast in a confined space** (the "chunky salsa" effect):

1. Check whether the walls held, using the barrier rules above. If they
   didn't, resolve the blast normally.
2. If they held, the shock wave **reflects** back the way it came.
3. Anyone the rebounding wave still reaches is hit again. The Power of that
   second hit is the **combined Power of both waves**. For example, 6 on the
   way out and 2 on the rebound makes an effective Power of **8**.
4. In a small, solid room the wave can rebound off every wall, and the
   effective Power climbs far above the grenade's own.
