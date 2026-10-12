---
title: Drones
parent: Rules
nav_order: 8.6
---

# Drones
{: .no_toc }

Running unmanned vehicles from a remote-control deck: jumping into one
drone or sitting in the captain's chair, the network and its subscriber
list, the actions a rigger can take, giving a drone orders, and the
drones in the core rulebook. Driving and vehicle combat are on
[Rigging](../rigging/), and vehicle statistics on [Vehicles](../vehicles/).
From the core rulebook *(SR3 p.136–137, p.154–157, p.306, p.311–312)*.

1. TOC
{:toc}

---

## What makes a drone  *(SR3 p.154, p.306)*

A drone is any unmanned vehicle that can be run over a rigger network,
from a matchbox-sized car to a modified sports car. What sets it apart is
its **Pilot Rating**: its own self-piloting system, which lets it act on
its own to a limited degree.

- A drone must be **adapted for rigger control**. Drones that can't carry
  passengers usually come adapted. A passenger vehicle needs a
  **remote-control interface**, 2,500¥ × Body, which gives it a **Pilot
  Rating of 1** and needs Sensor 1 or more *(SR3 p.306)*.
- It needs a datajack system only if a rigger means to jack into it
  physically.

## Jumped in, or the captain's chair  *(SR3 p.154)*

Every drone affiliated with the rigger's deck runs in one of two modes, and
the rigger runs the whole network in one of two ways.

| | How it works | Dice |
| :--- | :--- | :--- |
| **Primary drone** | The rigger **jumps in**: controls it as if jacked directly into it. Only **one** at a time. | The rigger's skills, plus **Combat and Control Pool**, and every rigger bonus. |
| **Secondary drones** | Everything else on the network. | The drone's **Pilot Rating** in place of skill or Attribute. **No pools.** |
| **Captain's chair** | The rigger jumps into none and supervises them all from the deck's master control. | Every drone is secondary: Pilot Ratings, no pools. |

- **While jumped in**, the rigger sees through the primary drone. Glancing
  through a secondary drone's sensors takes a **Complex Action**, and
  orders to secondary drones take **+2** on their Comprehension Tests.
- The **captain's chair** is the only way to run drones **without a VCR**:
  a character with a datajack and a remote-control deck can do it.

> **The book's example** *(SR3 p.154)*: Rigger X is in the captain's chair
> with three drones when a security transport closes in. He still gets his
> usual Initiative bonus, but if he orders the drones to attack, none of
> them gets any of his pool dice, and all roll their Pilot Ratings. He
> jumps into the roto-drone, the closest: now he can use his Control and
> Combat Pools for it. Looking through another drone costs a Complex
> Action, and ordering the Doberman to attack gives it +2 on its
> Comprehension Test.

---

## The remote-control network  *(SR3 p.154–156)*

A **remote-control (RC) deck** is the control station, and drones connect
to it by radio on three channels: **command** (movement, actions and
information), **simsense** (sight, sound and simsense) and **system**
(network integrity and drone status).

### Subscriber lists  *(SR3 p.156)*

- The deck only talks to drones on its **subscriber list**, which keeps
  intruders out.
- The list holds **twice the deck's rating** in drones; the deck can
  **actively control** as many as **its rating**.
- A drone under the deck's control is **affiliated**; the rigger can see
  through and command it, and it can talk to the other affiliated drones.
  A **non-affiliated** drone acts on its own, cut off from the network.
- **Affiliating or disaffiliating** a drone is a **Simple Action**, so
  swapping one drone for another takes two Simple Actions or one Complex
  Action. A drone can't act in the Combat Turn it's affiliated.

> **The book's example** *(SR3 p.156)*: Josie's Rating 4 deck holds up to 8
> drones on its list but controls 4 at once. She has 6 listed and 4
> affiliated. To bring in a ground patrol vehicle she spends one Simple
> Action dropping her surveillance drone and another adding the GPV, which
> can act from her next Combat Turn.

### Range  *(SR3 p.136–137)*

An RC deck has a **Flux Rating of 2**, a range of 2 km all around it.
Situational modifiers change the Flux Rating before the range is read; the
modified rating is rounded down to the nearest half.

| Flux Range Table *(SR3 p.137)* | Range |
| :---: | :--- |
| 0 | 250 meters |
| 1 | 1 km |
| 2 | 2 km |
| 3 | 4 km |
| 4 | 6 km |
| 5 | 9 km |
| 6 | 12 km |
| 7 | 16 km |
| 8 | 20 km |
| 9 | 25 km |
| 10+ | (2 × Flux) + 10 km |

| Situational Range Modifiers *(SR3 p.137)* | Modifier |
| :--- | :---: |
| High elevation (unbroken line of sight to the receiver) | +4 |
| ECCM in use | −(ECCM rating ÷ 2) |
| Electrical storm | −2 |
| Encryption in use | −0.5 |
| Humid air | −0.5 |
| Urban environment | −1 |

> **The book's example** *(SR3 p.137–138)*: Josie's deck has a signal
> amplifier, Flux 6. On a garage roof (+4), with encryption (−0.5) and
> ECCM 3 (−1.5), its effective Flux is 6 + 4 − 0.5 − 1.5 = **8**: 20 km.

Jamming, ECM and ECCM against the network are electronic warfare, covered
with decking: see [Decking](../decking-defragged/).

---

## A rigger's actions with a deck  *(SR3 p.156–157)*

| Action | Free | Simple | Complex |
| :--- | :---: | :---: | :---: |
| Turn one drone's sensors, or its ECM/ECCM, on or off (from the next Combat Turn) | ✓ | | |
| Arm or disarm one drone's weapon system (one armed at a time) | ✓ | | |
| Call up one drone's status report | ✓ | | |
| Observe casually through one drone | ✓ | | |
| Delay an action, or speak a word | ✓ | | |
| Affiliate or disaffiliate a drone | | ✓ | |
| Observe in detail through one drone | | ✓ | |
| Do the same Free Action on several drones at once (captain's chair) | | ✓ | |
| Jump into a primary drone, or return to the captain's chair | | ✓ | |
| Fire an armed weapon on one drone | | | ✓ |
| Issue a command to a drone or a group | | | ✓ |
| Observe through a secondary drone while jumped in | | | ✓ |
| Operate a jumped-in drone: accelerate, brake, position, ram or hide | | | ✓ |

While jumped in, the rigger can only fire weapons on the primary drone, and
Combat Pool works only with it *(SR3 p.157)*.

## Giving orders: the Comprehension Test  *(SR3 p.157)*

- An order is a **Complex Action**, declared with the rigger's own actions.
  One order goes to one drone, or to a group getting the **identical**
  order, up to as many as the deck controls.
- A jumped-in primary drone needs no orders; it's driven.
- Orders are one sentence: "circle this area", "follow that car". The GM
  rates the order on the Difficulty Number Table to set the TN, and the
  rigger can simplify it first.
- Roll the drone's **Pilot Rating** against that TN. **One success** and it
  understands and carries the order out; more successes give it more
  leeway, to the rigger's benefit.
- Drones the rigger isn't driving roll their Pilot Rating for every test,
  with no dice pools. **Every drone acts in the rigger's Combat Phase,
  after the rigger.**

| Difficulty Number Table *(SR3 p.92)* | TN |
| :--- | :---: |
| Simple | 2 |
| Routine | 3 |
| Average | 4 |
| Challenging | 5 |
| Difficult | 6–7 |
| Strenuous | 8 |
| Extreme | 9 |
| Nearly Impossible | 10+ |

**Sensors** *(SR3 p.136)*: a drone making a Passive Sensor Test rolls its
**Pilot Rating** in place of Intelligence; an Active Sensor Test uses its
Sensor Rating, as any vehicle does.

## Dump shock  *(SR3 p.156)*

Dumped from the network, a rigger is disoriented for ten Combat Turns at +2
to every test, and resists **(RC deck rating + 4)S Stun** with Willpower.
The details are on [Rigging](../rigging/#dump-shock-for-a-rigger).

---

## The core rulebook's drones  *(SR3 p.311–312)*

| Drone | Handling | Speed | Accel | Body | Armor | Sig | Pilot | Sensor | Cargo | Load | Cost |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | ---: |
| GM-Nissan Doberman | 3/5 | 70 | 8 | 2 | 6 | 2 | 2 | 1 | 2.5 | 50 | 25,000¥ |
| GAZ-Niki GNRD-71 BIS Snooper | 4/3 | 75 | 3 | 1 | 0 | 8 | 1 | 1 | 2 | 30 | 8,500¥ |
| Generic surveillance drone | 3 | 70 | 9 | 1 | 0 | 5 | 2 | 1 | 0 | 10 | 8,125¥ |
| MCT-Nissan Roto-drone | 4 | 70 | 6 | 2 | 0 | 4 | 1 | 1 | 4 | 150 | 10,500¥ |
| CyberSpace Designs Dalmatian | 3 | 105 | 8 | 2 | 0 | 6 | 2 | 1 | 3 | 80 | 16,000¥ |

None has Autonav. *Rigger 3* and *State
of the Art 2064* add many more, and the system ships them in its
compendiums.

| Rigger gear *(SR3 p.306)* | Cost |
| :--- | :--- |
| Remote Control Deck | 5,000¥ × Rating |
| Remote Control ECCM, Ratings 1–3 | Rating × 7,500¥ |
| Remote Control ECCM, Ratings 4–6 | Rating × 15,000¥ |
| Remote Control ECCM, Ratings 7–9 | Rating × 35,000¥ |
| Remote Control ECCM, Rating 10 | 500,000¥ |

---

## Doing it in The 2nd Chumming (Foundry)
{: #doing-it-in-the-2nd-chumming-foundry }

A drone is a vehicle actor, from the *Drones* compendiums (*Shadowrun 3rd*,
*Rigger 3*, *State of the Art 2064*). Getting it onto a character and its
control modes are on [Rigging](../rigging/#drones-and-remote-control):

- **Auto**, a drone's natural state, rolls its own Pilot Rating.
- **📡 Drone Comprehension** (the drone's Stats tab, or the Vehicle Tools
  HUD) rolls the Pilot Rating against the TN the GM sets from the table
  above, with any electronic-warfare degradation on the command channel
  added in.
- **VCR** is jumped into the **primary** drone: the rigger rolls their own
  skills, with Combat and Control Pool. VCR is one vehicle at a time per
  character, the same as a primary drone.
- **RCD** is a **secondary** drone, or the **captain's chair**: the drone's
  weapon attacks, Driving Tests and Crash Tests roll its own **Pilot
  Rating**, with no pools. A rigger with a VCR keeps their VCR Initiative,
  as Rigger X does *(SR3 p.154)*; one with only a datajack and a deck rolls
  ordinary Initiative.

{: .note }
> The system doesn't track subscriber lists or affiliation: the GM keeps
> count of how many drones the deck is controlling.
