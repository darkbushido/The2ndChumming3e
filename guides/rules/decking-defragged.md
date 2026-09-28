---
title: Decking (Matrix Defragged)
parent: Rules
nav_order: 6
---

# Decking (Matrix Defragged)
{: .no_toc }

This table plays **Matrix Defragged v2**, a fan-made replacement for the core rulebook's Matrix
chapter (SR3 p.199–232). It isn't an official Shadowrun supplement — it's a fan rewrite by
Brinoceros, built to run faster at the table — but it's cited here the same way as any other
sourcebook: `*(MDF p.NN)*`, printed page.

This system can run either ruleset — Defragged or the core rulebook's own Matrix chapter,
"Orthodox SR3" — as a per-world setting. If your table runs Orthodox instead, see
[Decking (SR3 core)](../decking/). The two rulesets don't mix; this page covers Defragged only.

1. TOC
{:toc}

---

## The Matrix in three ideas

- Every Matrix-capable device — a host, a cyberdeck, a commlink, a maglock — has a **System
  Rating**. That number is the TN for anyone trying to act against it. *(MDF p.12)*
- Every such device also sits at a **Security Tier**: a colour and a **Security Threshold**
  number that measures how hard it is to actually get past. System Rating plus Security Tier is
  a device's **Sys/Sec**. *(MDF p.12)*
- **Hacking** boils down to one test: roll against the System Rating, then check whether you
  cleared the Threshold. Fall short, and the system logs a point against you — **Overwatch**.
  *(MDF p.23)*

### Security Tiers *(MDF p.11–12)*

| Tier | Threshold | What typically runs at this level |
| :--- | :---: | :--- |
| Ivory | 0 | No Matrix security at all — toys, minor devices |
| Blue | 1 | Low security — public comm booths, bus ticket kiosks, news services, libraries |
| Green | 2 | Average security — small shops, petty criminal outfits, the public Matrix |
| Orange | 3 | Challenging security — sensitive data at mid-size businesses and corp offices |
| Red | 4 | Threatening security — classified sites agencies will kill to protect |
| Black | 5 | Dangerous security — top military, corporate, or government projects |
| Ultraviolet | 6 | Deadly security — the Sixth World's greatest secrets |

A cyberdeck's own tier comes from its Firewall Rating, not from a GM assignment. *(MDF p.12)*

---

## Getting on the Matrix

### User Modes *(MDF p.10)*

How you jack in changes your Initiative and what damage can reach your real body:

| Mode | Initiative | If your icon overloads |
| :--- | :--- | :--- |
| **Tortoise Terminal (TRM)** | Meat-world Initiative; no Response, but Hacking Pool still works | Immune to biofeedback |
| **Augmented Reality (AR)** | Meat-world Initiative; no Response, but Hacking Pool still works | Immune to biofeedback |
| **VR-Cold** | Meat-world Initiative; no Response, but Hacking Pool still works | Stun damage |
| **VR-Hot** | Its own **Matrix Initiative**, boosted by Response | Physical damage |

Tortoise adds **+2 TN** to every Matrix test and cybercombat roll. Only VR-Hot gets true Matrix
Initiative and benefits from Response — the other three run on whatever Initiative dice you'd
roll in the meat world, full stop. *(MDF p.10)*

### Skills *(MDF p.11)*

Four Intelligence-linked skills cover the Matrix: **Computer** (legitimate use — logons, moving
around, ordinary prompts; defaults from Electronics), **Hacking** (illegal or scrutinized action,
opposed by the target's Sys/Sec; defaults from Computer), **Cybercombat** (fighting other icons;
defaults from Computer), and **Programming** (writing or fixing utilities, skillsofts and agents;
defaults from Computer).

### Hacking Pool *(MDF p.11)*

**Hacking Pool = Intelligence + ⌊MPCP ÷ 3⌋.** It behaves like any other dice pool (SR3 p.43):
refreshes each Combat Turn, and you split it freely across Hacking, Cybercombat, or whatever else
you're rolling in the Matrix that turn.

### Response *(MDF p.14)*

**Response** on a deck is the Matrix's version of wired reflexes: each point adds **+2 Reaction**
and **+1D6 Matrix Initiative**, but only while you're running **VR-Hot**. A deck's Response can't
exceed **⌊MPCP ÷ 3⌋** (minimum 1).

### Logon and getting around *(MDF p.8, p.15)*

Pick your User Mode, then log on to your local grid — or jack straight into a host through a
physical port. While you're loose in the open Matrix (not yet inside a host), tests use the local
grid's own Sys/Sec numbers as a stand-in host. A few examples:

| Regional grid | System Rating | Security Tier |
| :--- | :---: | :--- |
| Aztlan | 8 | Orange (3) |
| California Free State | 6 | Green (2) |
| CAS | 6 | Green (3) |
| Québec | 6 | Green (2) |
| Tir Tairngire | 7 | Orange (3) |
| Tsimshian | 8 | Orange (3) |
| UCAS | 6 | Green (2) |

*(MDF p.15 — a partial list; the book covers every North American and several overseas grids.)*

### Nodes and their prompts

Once inside a host, five kinds of node exist, and each offers its own set of prompts. *(MDF p.8,
p.16–21)* A handful of prompts work anywhere (**General**), listed separately below.

| Node | Represents | Icon shape |
| :--- | :--- | :--- |
| **System Access Node (SAN)** | The host's public front door | Rectangle |
| **Central Processing Unit (CPU)** | Sysop-level control: the Security Sheaf, passcodes, the system map, pathways | Double-walled hexagon (has its own barrier) |
| **Data Store (DS)** | Files, records, and archives | Square |
| **Slave Node (SN)** | Controls real-world devices — cameras, maglocks, subscribed drones/vehicles | Circle |
| **Sub-Processing Unit (SPU)** | Task routing and scheduling — user lists, project data | Hexagon |

A legitimate passcode lets you use a node's prompts as an ordinary Computer test. Without one,
you need a mark on that node — usually gained through the **Access Node** prompt with Hacking —
before its other prompts open up, unless the node is public. Getting caught doing something you
shouldn't (an ✗ below) costs a point of Overwatch; some successful prompts also hand you a mark
(✓) on top of whatever else they do.

**General prompts** (any node, any zone):

| Prompt | Test | Adds Overwatch on failure | Grants a mark |
| :--- | :--- | :---: | :---: |
| Access Node | Passcode, or Hacking vs Sys/Sec | ✗ | ✓ |
| Attack an Icon | Cybercombat vs Cybercombat | | |
| Boot Utility | Computer vs Utility Rating | | |
| Configure Protections | Computer vs System Rating | | |
| Crack Protections | Passcode/Hacking vs Sys/Sec of the protection | | |
| Jam Signal | Computer vs System Rating | | |
| Jump Grid/Host | Computer vs System Rating | | |
| Logon to System | Computer vs System Rating | | |
| Repair an Icon | Computer vs System Rating | | |
| Scrub Datastream | Hacking vs Sys/Sec | ✗ | |
| Search and Render | Computer vs System Rating | | |
| Send Transmission | Computer vs System Rating | | |
| Terminate Session | Computer vs 4 (Willpower vs 10 if Link-Locked) | | |
| Toggle Visibility | Computer vs System Rating | | |

**CPU prompts:**

| Prompt | Test | Adds Overwatch on failure |
| :--- | :--- | :---: |
| Configure I/O Ports and Pathways | Passcode/Hacking vs Sys/Sec | ✗ |
| Configure Passcodes | Passcode/Hacking vs Sys/Sec | ✗ |
| Configure Security Sheaf | Passcode/Hacking vs Sys/Sec | ✗ |
| Reboot Node | Passcode/Hacking vs Sys/Sec | |

**Data Store prompts:**

| Prompt | Test | Adds Overwatch on failure |
| :--- | :--- | :---: |
| Access Datafile | Computer vs System Rating | |
| Duplicate/Download Datafile | Passcode/Hacking vs Sys/Sec | ✗ |
| Edit/Upload Datafile | Passcode/Hacking vs Sys/Sec | ✗ |
| Index Data Store | Computer vs System Rating | |
| Siphon Paydata | Hacking vs Sys/Sec | ✗ |

**Slave Node prompts:**

| Prompt | Test | Adds Overwatch on failure |
| :--- | :--- | :---: |
| Control Device | Computer (or another applicable skill) vs System Rating | |
| Index Subscribed Devices | Computer vs System Rating | |
| Spoof Datastream | Hacking vs Sys/Sec | ✗ |
| Tap Datastream | Hacking vs Sys/Sec | ✗ |

**SPU prompts:**

| Prompt | Test | Adds Overwatch on failure |
| :--- | :--- | :---: |
| Index Users and Scheduling | Computer vs System Rating | |
| System Map | Computer vs System Rating | |

A CPU is additionally shielded by its own **barrier icon**, rated equal to the CPU itself — you
can't falsify a mark there without crashing that barrier in cybercombat first, unless you're
running a Sleaze utility rated high enough to pass through it. *(MDF p.18)*

---

## Hacking *(MDF p.23)*

1. **Roll it.** Hacking skill plus any Hacking Pool you commit, against **TN = the host's System
   Rating**.
2. **Check the Threshold.** Meet or beat the host's Security Threshold and you succeed — a tied
   result favours the hacker. Come up short, and it's a failure.
3. **What happens.** Success on a legitimate or falsified logon gets you a mark on that node,
   opening its prompts. Failure adds a point to your **Overwatch** on that host (below).

### What changes the TN *(MDF p.14)*

| Condition | TN modifier |
| :--- | :---: |
| Hardlined via a datajack or trodes | −2 |
| Operating from a Tortoise Terminal | +2 |
| Maintaining real-time contact with people outside the Matrix | +1 |
| Circumstantial — Matrix noise, jamming, defensive utilities, cover, wound penalties | ±1–4 |

### Overwatch and the Security Sheaf *(MDF p.23–24)*

Every host tracks **Overwatch** on its own 10-box **Security Sheaf**. You gain a point for
failing a Hacking Test, or for crashing an icon without running the Suppression utility to cover
your tracks. **Filling the tenth box is Convergence** (below).

The GM plans out **Trigger Steps** ahead of time — specific Overwatch totals where IC or an
alert kicks in. A triggered IC joins initiative at the top of the next Combat Phase, losing
Initiative for any phase that's already gone by. Here's the book's own example layout for a
System Rating 6 / Green host, to show how a sheaf is typically built:

| Overwatch box | What fires |
| :---: | :--- |
| 1 | System Sweep |
| 2 | Authenticator (Rating 4) |
| 3 | Alert |
| 5 | Barrier (Rating 6), Tracker (Rating 4) |
| 6 | System Sweep |
| 7 | Alert, Killer (Rating 6) |
| 9 | Data Worm (Rating 6) |
| 10 | Convergence |

*(MDF p.23)* — every host's actual sheaf is the GM's own design; this is just one example of how
dense and varied it can get.

A decker who crashes an enemy icon while running the **Suppression** utility can degrade it
instead of taking the usual Overwatch hit for the crash. *(MDF p.26)*

{: .note }
> The book gives hosts two ways to gain Overwatch and a full sheaf of scripted Trigger Steps with
> Suppression as the counter-play. This system currently only automates the first trigger — a
> failed Hacking Test. See *Doing it in The 2nd Chumming*, below, for what's automated today.

### Convergence *(MDF p.23–24)*

At 10 boxes of Overwatch, the decker's connection gets traced back to their real body. The GM can
respond with any mix of: dumping the decker (triggering Dumpshock, below), leaking pieces of
their session to the authorities (what their icon looked like, their handle, their gear, and
roughly where they're jacked in from), and sending a physical security response their way.

---

## Cybercombat *(MDF p.26)*

Any icon can attack any other icon it can see sharing the same node or zone. Attacking
automatically reveals your own icon if it wasn't visible already.

1. **Attacker rolls** Cybercombat plus Hacking Pool against a **base TN of 4**, adjusted for
   circumstances.
2. **Defender rolls** the same way, same base TN.
3. **Compare successes.** Whoever has more hits their target — **a tie favours the defender**.
4. **Stage the damage.** The winner's Damage Level rises one step for every two net successes;
   past Deadly, extra net successes add to Power instead.
5. **Resist.** The target rolls its **System Rating (or MPCP)** against a TN equal to the
   **attack's Power minus its own Security Threshold or Firewall** — those numbers work as
   armour here. Every two successes drops the Damage Level by one. Utilities like Armor,
   Biofeedback Filtering, and Shield can chip in too.

An icon's own **Matrix Condition Monitor** is 10 boxes; filling it crashes the icon and — for a
persona — dumps its user. Damage that overflows the user's Matrix CM becomes real **Biofeedback**
damage, Stun or Physical depending on their User Mode, the same split as Dumpshock below.
*(MDF p.26)*

As it fills, the Matrix Condition Monitor penalises the icon's tests the same way a character's
wounds do: **+1 TN** from the 1st box, **+2** from the 3rd, **+3** from the 6th, and **+4** at the
10th. *(MDF p.12)*

Two more Matrix hazards worth knowing: a decker can permanently or temporarily disable a
real-world Matrix device by finding its icon and crashing it in cybercombat, and an aggressive
icon can **Link-Lock** a target so it can't go hidden and needs a Willpower test just to log off
cleanly — failing that test causes Dumpshock. *(MDF p.27)*

---

## Dumpshock *(MDF p.27)*

Getting yanked off the Matrix without a clean logoff hits you with Dumpshock:

- You immediately resist **Serious** biofeedback damage, with **Power equal to the System Rating
  of whatever dumped you**.
- Tortoise and AR users don't feel it at all. **VR-Cold** takes it as Stun; **VR-Hot** takes it as
  Physical.
- You're also rattled for the next 10 minutes — everything you do carries a **+2 TN** penalty
  until it wears off.

---

## IC and Agents *(MDF p.24, p.36)*

IC (and Agents, which work the same way mechanically) come in three grades:

- **White** — nuisance-tier defenses. Can't do more than Moderate damage to an icon, and can't
  touch a decker's real body at all. Every host can field it.
- **Gray** — full cybercombat capability, and can permanently damage a decker's actual deck (burn
  MPCP or utility slots). Still can't reach the decker's body directly. Needs the host's
  Mainframe Support module.
- **Black** — the only grade that can hurt the decker's real body directly, and it's legally
  allowed to. Also needs Mainframe Support.

A sample of named agents from the book, by grade *(MDF p.34)*:

| Grade | Examples |
| :--- | :--- |
| White | ARis, Authenticator, Crippler, Gemini, Looper, Mr. Medkit, Scrambler, Tracker |
| Gray | Blaster, Dataworm, Hydra, Killer, Tar Baby |
| Black | Ripper, Sparky |

**Initiative** for IC and Agents comes from the *host's* Security Tier, not their own stats:

| Host Security Tier | Initiative |
| :--- | :--- |
| Ivory | Agent's Rating |
| Blue | 1D6 + Agent's Rating |
| Green | 2D6 + Agent's Rating |
| Orange | 3D6 + Agent's Rating |
| Red and above | 4D6 + Agent's Rating |

*(MDF p.36)* Their **Firewall equals their host's Security Threshold** — there's no separate IC
stat for it. Agents automatically know Computer and Cybercombat at their own Rating and share
their host's memory and active utilities.

---

## Utilities *(MDF p.29–32)*

Utilities load into a deck's numbered utility slots, and most either lower a target number for
the user or raise one for whoever's targeting them; **degradable** utilities lose a point of
rating every time they're actually used, and eventually need reloading.

| Utility | Type | What it does |
| :--- | :--- | :--- |
| Analyze | Offensive | Lowers your TN on Search and Render |
| Armor | Operational, degradable | Soaks Overload Damage instead of your Matrix CM |
| Attack | Combat | Deals Overload (or, for the nastiest versions, direct Biofeedback) damage in cybercombat |
| Baby Monitor | Operational, degradable | Lets you check your own Overwatch level via Scrub Datastream |
| Biofeedback Filtering | Operational, degradable | Soaks Biofeedback damage instead of your real condition monitor |
| Browse | Offensive | Lowers your TN on any Index prompt |
| Decrypt | Offensive | Lowers your TN cracking Encryption |
| Encrypt | Operational | Lets you Encrypt a target file or datastream |
| Evasion | Operational, degradable | Lets you go Hidden even while Link-Locked |
| Exploit | Offensive, degradable | Lowers your TN on Access Node |
| Jackpot | Offensive, degradable | Lowers your TN on Siphon Paydata |
| Jamboree | Offensive | Lowers your TN on Jam Signal |
| Kill Switch | Offensive | Lowers your TN disarming a Databomb |
| Lock-On | Offensive, operational | Lowers your TN on Trace Signal; a single success starts a Link-Lock |
| Medic | Offensive, degradable | Lowers your TN repairing another icon's Matrix CM |
| Mirrors | — degradable | Lowers your TN resisting a System Sweep or an agent's Authenticate ability |
| Read/Write | Offensive | Lowers your TN on datafile prompts (Access, Duplicate/Download, Edit/Upload) |
| Redirect | Defensive, degradable | Raises the TN for anyone Trace Signal-ing you |
| Saboteur | Operational | Lets you plant a Databomb on a target |
| Shield | Operational, degradable | Soaks hardware-damaging IC attacks instead of your actual deck |
| Signal Booster | Offensive | Lowers your TN on Send Transmission |
| Sleaze | Operational, degradable | Passes harmlessly through a barrier at or below its rating |
| Slow | Combat | Drains an enemy icon's Initiative instead of dealing damage |
| Smoke Screen | Defensive, degradable | Raises the TN for anyone Search and Render-ing you |
| Snoop | Offensive | Lowers your TN on Tap Datastream or Spoof Datastream |
| Suppression | Operational, degradable | Lets you crash an icon without gaining Overwatch for it |

Beyond programs, two other utility types exist: **passcodes**, which grant automatic, no-roll
marks on whatever they're keyed to, and **protocols**, unusual GM-defined applications (the book
gives a few examples, like one that purges an infiltrating agent or one that buys a convergent
decker extra time before the trace lands).

---

## Doing it in The 2nd Chumming (Foundry)

### Choosing the ruleset

A world setting, **Matrix Ruleset** (under Foundry's Configure Settings), switches between
**"Matrix Defragged v2"** (the default, described on this page) and **"Orthodox SR3 Matrix"**.
Changing it needs a full Foundry restart, and the GM sees a warning that switching mid-campaign
could break things — this is a session-zero decision, not a mid-run one.

### Getting on the Matrix

On the **Matrix** tab of a character or NPC sheet:

- **User Mode buttons** — `TRM`, `AR`, `VR-Cold`, `VR-Hot` — set your Matrix mode. Clicking one
  opens an "Enter Matrix" dialog to pick which **host actor** you're connecting to; confirming
  sets both the mode and your active host. Clicking the same mode again disconnects you and
  drops you from that host's roster. Switching into either VR mode while driving a vehicle in
  rigger-control mode automatically kicks the vehicle back to remote control, since the two are
  mutually exclusive.
- **Cyberdecks** are items in your inventory. The Matrix tab lists yours (name, MPCP, Firewall,
  Response) with an **Equip** toggle. The equipped deck shows its full stat block — MPCP,
  Firewall, Response, memory used/total, free utility slots, transfer rate, Flux rating, your
  Hacking Pool bonus, and your Matrix Initiative — plus its own 10-box Matrix condition track.
- **Programs** are also items; drag one onto a numbered utility slot on your deck to load it. A
  slot can be marked **burned** if an attack knocks it out, or ejected to swap the program out.
  Loaded programs are rolled straight from their slot (hold Shift for physical dice).

### Node tracking and prompts

While connected to a host, the Matrix tab shows which node you're in, a **Link-Locked** flag, and
your current marks as removable chips — plus a manual "add a mark" option for anything the GM
rules outside the normal roll. Picking a node lists that node's available prompts, each flagged
for whether failing it raises Overwatch and whether succeeding grants a mark, with a one-click
**Use** button that rolls it.

### Rolling a hacking action

A **Hacking Action** button (visible once you're connected) opens a dialog pre-filled with your
Hacking or Computer rating, your available Hacking Pool, the connected host, a default TN drawn
from the host's System Rating (plus any deck-damage or host-alert penalty already in effect), its
Security Threshold, a field to allocate Hacking Pool dice, and a checkbox — on by default — to
raise Overwatch automatically if you miss the threshold. Rolling it compares your successes to
the threshold exactly as described above; falling short with that box checked posts an Overwatch
warning against the host and bumps its tracked total by one. No Hacking or Computer skill at all
routes you through the system's usual Default Table first.

### Cybercombat

A **Cybercombat** button lets you target anyone sharing your host connection — other connected
deckers, deployed IC, or agents — and posts a two-sided card for the exchange. Each side's own
half shows their skill, available Hacking Pool, TN, and damage code, editable only by that side; a
GM-only resolve button settles things if someone goes AFK. Resolving the card charges each side's
Hacking Pool properly (both attacker and defender, through the same GM-routed pool spend used
elsewhere in this system, so it works correctly even from a non-owning client) and rolls only the
dice actually paid for. A degradable attack program used in the exchange loses a point of rating
each time, and crashes outright once it would drop below 1.

### Dumpshock

A **Dumpshock** button (shown while in either VR mode) is a manual trigger for a GM or player to
use whenever the fiction calls for an abrupt disconnection — a reboot, a cut connection, a power
loss. It opens a small dialog to pick a connected host (which fills in Power from that host's
System Rating) or set Power by hand, then posts a Serious biofeedback announcement — Physical for
VR-Hot, Stun for VR-Cold — with a resist button. As everywhere else in this system, the roll only
announces the damage; the GM still clicks the wound boxes.

### Host sheets, Security Sheaf, and IC

A **host** is its own actor type with a dedicated sheet covering its node layout, its Security
Sheaf, its I/O ports, and its roster of connected users and agents. The Security Sheaf tab sets
the host's Security Tier (which fills in the matching Threshold automatically) and shows its
10-box Overwatch track; the GM can seed a standard set of Trigger Steps, assign specific IC to
each one, and deploy that IC into the current encounter when a step fires. **IC** and **Agent**
actors get their own sheet type, tracking Rating, grade (White/Gray/Black), and their own Matrix
condition track — an Agent additionally names the actor operating it, whose loaded attack program
supplies its damage. Any IC flagged as deployed to a host becomes a valid cybercombat target for
everyone connected there.

{: .note }
> Right now, only the first Overwatch trigger — a failed Hacking Test — raises the tracker
> automatically. Crashing an icon without Suppression, live Trigger Step countdowns, and the
> Suppression utility itself are still manual, GM-adjudicated calls from the Security Sheaf tab
> (tracked as open work, TODO 128).

---

## Worked example

**Voss** decks with Intelligence 4 and a cyberdeck running **MPCP 8, Firewall 4, Response 1**,
and Hacking 5. Her Hacking Pool is Intelligence 4 + ⌊8 ÷ 3⌋ = 4 + 2 = **6**. She's running
**VR-Hot**, so her Matrix Initiative gets the Response bonus: +2 Reaction and one extra die on
top of her usual 1D6.

She jacks into a corporate research host: **System Rating 7, Security Tier Red (Threshold 4)**.

1. **First hack.** She commits 3 Hacking Pool dice to her Hacking 5, rolling 8 dice against
   **TN 7** (the host's System Rating), and gets 5 successes.
2. **Check the Threshold.** 5 is at or above 4, so she succeeds and picks up a mark on the node
   she's targeting. No Overwatch gained.
3. **Second hack, pushing further** in the same Combat Turn, committing her remaining 3 Hacking
   Pool dice: 8 dice against TN 7 nets her only 3 successes this time — short of the Red host's
   Threshold 4. The hack fails, and her **Overwatch** on this host rises from 0 to **1**.
4. **If her Overwatch ever reached 10**, Convergence would follow: the GM might trigger
   Dumpshock at Power 7 (the host's System Rating) — Physical for her, since she's in VR-Hot —
   leak pieces of her session, and send security to her jackpoint.

**If instead an IC engaged her in cybercombat:** say a Gray IC (Rating 5) attacks. Both sides roll
Cybercombat plus Hacking Pool against the base TN 4. If Voss nets 3 successes over the IC's
total, her attack utility's Damage Level steps up once (two successes per step). The IC then
resists with its own Rating against a TN equal to her attack's Power minus its Firewall (its
host's Security Threshold — 4 here), soaking off Damage Levels two successes at a time.
