---
title: Decking (SR3 core)
parent: Rules
nav_order: 7
---

# Decking (SR3 core)
{: .no_toc }

This page covers the **core rulebook's own Matrix chapter** (SR3 p.199–232), plus the hot/cold
ASIST rules from the *Matrix* sourcebook. This system calls this ruleset **"Orthodox SR3 Matrix"**
to distinguish it from **Matrix Defragged**, a fan-made simplified ruleset this table can run
instead — see [Decking (Matrix Defragged)](../decking-defragged/) if that's what your GM chose.
The two rulesets are mechanically incompatible; this page only covers Orthodox.

1. TOC
{:toc}

---

## The pieces

A decker's **cyberdeck** defines everything about their persona in the Matrix. Its central
number is the **MPCP Rating** — think of it as the deck's overall processing muscle. Three times
the MPCP Rating is the total the decker can spread across four **persona programs**: **Bod**,
**Evasion**, **Masking**, and **Sensor**, none of which can individually exceed the MPCP itself.
These four act as the persona's "attributes" whenever something in the Matrix tests against the
decker directly. *(SR3 p.206)*

A deck also carries **Hardening**, which blunts damage from the nastiest IC; **Active** and
**Storage Memory**, which limit how many utility programs can run at once versus just be carried;
an **I/O Speed** for moving data; and **Response Increase**, the Matrix's answer to wired
reflexes — each point adds +2 to Reaction and +1D6 to Matrix Initiative. A deck supports at most
3 points, and no more than its MPCP ÷ 4 (round down), so a deck of MPCP 3 or less can't run any.
*(SR3 p.206–207)*

Most ordinary Matrix users aren't running a full cyberdeck at all — they're on a **cyberterminal**
("tortoise" in decker slang), a cheaper, weaker rig capped at a low MPCP. The upside: tortoise
users can't be hurt by black IC or Dumpshock. *(SR3 p.207–208)*

### Hacking Pool *(SR3 p.207)*

**Hacking Pool = ⌊(Intelligence + deck MPCP) ÷ 3⌋.** It works like any other dice pool and can
help almost any Matrix test — logons, attacks, defenses, maneuvers — but it can't be spent
resisting damage from gray or black IC; only Karma Pool or the decker's own enhancements help
there.

### Matrix Initiative *(SR3 p.209, p.223)*

Outside combat, a decker's number of actions per turn comes from their Reaction divided by 10
(rounded up), plus one extra action per bonus Initiative die from Response Increase. In
cybercombat, it works like ordinary SR3 Initiative: base Reaction plus 1D6, with each point of
Response Increase adding +2 Reaction and another die. Reflex boosts that only affect the physical
body — wired reflexes, magic, vehicle rigs — don't carry over into the Matrix. Staying in live
voice or text contact with the outside world while decking costs a die of Initiative.

---

## Hosts, grids, and getting in

Every host or grid carries an overall **Security Rating** — a colour code plus a number — and
five **subsystem ratings**: **Access**, **Control**, **Index**, **Files**, and **Slave**. Each
subsystem is the TN for a specific kind of illegitimate action against it: getting in at all uses
Access, kicking a user off or reprogramming something uses Control, searching for data uses
Index, reading or writing files uses Files, and operating a connected physical device (a camera, a
maglock) uses Slave. *(SR3 p.205–206)*

The colour code — **Blue** (barely any security), **Green** (average), **Orange** (a system worth
protecting), or **Red** (the kind that shoots first) — gives a rough sense of what to expect
before a decker even rolls anything, and unofficially there's a level above Red that deckers call
"Ultra-Violet." *(SR3 p.205)*

A **System Test** is always a Success Contest: the decker's Computer skill (plus any Hacking Pool
committed) against the relevant subsystem rating, opposed by the host's own Security Value rolled
against the decker's **Detection Factor** — the average of their Masking Rating and any Sleaze
utility they're running (or half their Masking if they aren't). Whoever nets more successes wins;
a tie goes to the decker. *(SR3 p.207, p.209–210)*

Getting from grid to host works through **System Access Nodes**, and hosts can be arranged in
different topologies — a simple open connection straight off a public grid, tiered behind a
gatekeeper host, linked host-to-host, or tucked away on a private corporate grid entirely — which
mostly changes what a decker has to fight through to reach the target. *(SR3 p.203–204)*

---

## Security tally, alerts, and the Security Sheaf *(SR3 p.210–211)*

Every success the host scores against a decker — win or lose the contest — adds to that decker's
running **security tally** on that system, for as long as they stay logged on. A **security
sheaf** is the GM's plan for what that tally triggers: a list of thresholds ("trigger steps"),
each one arming some mix of IC and raising the system's **alert status**.

Systems start with **no alert**. Enough tally reaches a **passive alert**, which typically starts
throwing proactive IC at the decker and adds **+2 to every subsystem rating**; enough more reaches
an **active alert**, tightening things further. How dense the trigger steps are, and how much
tally each one takes, is entirely the GM's call — a high-security system stacks its triggers close
together, a relaxed one spreads them out.

---

## System operations *(SR3 p.214–219)*

Deckers act on a host through **system operations** — named commands with their own test,
utility, and action type. Every one of them is really the same System Test underneath (Computer
skill against a subsystem, opposed by the host's Security Value against your Detection Factor);
the operation just tells you which subsystem to use and how big an action it costs.

| Operation | Subsystem tested | Helpful utility | Action |
| :--- | :--- | :--- | :--- |
| Analyze Host | Control | Analyze | Complex |
| Analyze IC | Control | Analyze | Free |
| Analyze Icon | Control | Analyze | Free |
| Analyze Security | Control | Analyze | Simple |
| Analyze Subsystem | Targeted subsystem | Analyze | Simple |
| Control Slave | Slave | Spoof | Complex |
| Decrypt Access | Access | Decrypt | Simple |
| Decrypt File | Files | Decrypt | Simple |
| Decrypt Slave | Slave | Decrypt | Simple |
| Download Data | Files | Read/Write | Simple |
| Edit File | Files | Read/Write | Simple |
| Edit Slave | Slave | Spoof | Complex |
| Graceful Logoff | Access | Deception | Complex |
| Locate Access Node | Index | Browse | Complex |
| Locate Decker | Index | Scanner | Complex |
| Locate File | Index | Browse | Complex |
| Locate IC | Index | Analyze | Complex |
| Locate Slave | Index | Browse | Complex |
| Logon to Host | Access | Deception | Complex |
| Logon to LTG | Access | Deception | Complex |
| Logon to RTG | Access | Deception | Complex |
| Make Comcall | Files | Commlink | Complex |
| Monitor Slave | Slave | Spoof | Simple |
| Null Operation | Control | Deception | Complex |
| Swap Memory | — | — | Simple |
| Tap Comcall | (special) | Commlink | Complex |
| Upload Data | Files | Read/Write | Simple |

A few in words: **Logon to Host/LTG/RTG** get you into a host or grid and start your security
tally there. **Locate** operations are "interrogations" — you can repeat them, narrowing your
search each time, to track down a file, a slave device, another decker, or IC. **Download/Upload
Data** and **Swap Memory** move data or programs and take real time to finish, running in the
background once started. **Control Slave**, **Edit Slave**, **Monitor Slave**, **Make Comcall**,
and **Tap Comcall** are "monitored" operations — you spend a Free Action every Initiative Pass to
keep them going, or they abort. **Graceful Logoff** is the clean way out, avoiding Dump Shock and
wiping your tracks; jacking out any other way risks it.

---

## Cybercombat *(SR3 p.222–224)*

Cybercombat runs on the same bones as ordinary SR3 combat — roll Initiative, then act in order —
just compressed into 3-second Combat Turns like everywhere else. A few Matrix-specific wrinkles:

- **An icon has to be visible or located before you can attack it.** Attacking automatically
  makes your own icon visible unless you pull off a maneuver to hide it.
- **Attacks are Simple Actions**, rolled with an offensive utility program (plus any Hacking Pool)
  against a target number set by whether the target is Legitimate or an Intruder and by the
  host's security code:

  | Host security code | TN to hit an Intruding icon | TN to hit a Legitimate icon |
  | :--- | :---: | :---: |
  | Blue | 6 | 3 |
  | Green | 5 | 4 |
  | Orange | 4 | 5 |
  | Red | 3 | 6 |

  A hotter host makes its own defenders easier to hit and intruders harder — the numbers flip
  depending which side of the law your target is on. *(SR3 p.224)*
- **Net successes stage damage** exactly like a firearm hit: two successes per step up for the
  attacker, two per step down for the defender's resistance roll (made with the icon's Bod Rating,
  or the host's Security Value for an IC program).
- **Icons only have one condition track** — no separate Stun — and filling all 10 boxes crashes
  the icon. For a decker's persona, that means getting dumped from the Matrix (and risking
  Dumpshock, below); it doesn't disconnect them if black IC did it — it just makes frying their
  brain that much easier.
- **Simsense overload**: getting hit by white or gray IC can bleed a little Stun damage into the
  decker's real body through the ASIST link. A failed Willpower test against a TN set by how badly
  the icon was hurt means a light Stun wound.

Utility programs round the picture out on both sides: things like Armor (soaks incoming damage),
Cloak and Lock-On (help or hurt evasive maneuvers), and Medic (patches an icon back up) all work
by adding or subtracting their own rating from the relevant roll — check each utility's own
write-up for the exact math.

---

## Intrusion Countermeasures (IC) *(SR3 p.227–230)*

IC comes in three grades:

| Grade | Can reach | Named examples |
| :--- | :--- | :--- |
| **White** | Only the decker's on-line icon — attribute damage, dumping, or scrambled data | Cripplers, Killer, Probe, Scramble, Tar Baby |
| **Gray** | The decker's actual cyberdeck and utilities, permanently, on top of cybercombat | Blaster, Ripper, Sparky, Tar Pit |
| **Black** | The decker's real body, directly and legally | Lethal and non-lethal black IC |

Killer IC's damage stages off its Rating, with the **Damage Level set by the host's own security
code**:

| Host security code | IC Damage Level |
| :--- | :--- |
| Blue | Moderate |
| Green | Moderate |
| Orange | Serious |
| Red | Serious |

*(SR3 p.224)*

Facing lethal black IC means resisting with **Body** (Hardening helps; Hacking Pool doesn't —
only Karma Pool or the decker's own enhancements can help here), and getting free of it after
being hit takes a Complex Action and a Willpower test against the IC's own Rating.

An IC program's own **Initiative** scales with the host's security code, not any stat of its own:

| Host security code | IC Initiative |
| :--- | :--- |
| Blue | 1D6 + IC Rating |
| Green | 2D6 + IC Rating |
| Orange | 3D6 + IC Rating |
| Red | 4D6 + IC Rating |

*(SR3 p.223)*

Tortoise (cyberterminal) users are entirely immune to black IC and Dumpshock, which is part of why
they're the safer — if slower — way to touch the Matrix.

---

## Dump Shock *(SR3 p.227)*

Getting crashed off the Matrix, or jacking out without a clean logoff, risks **Dump Shock**: Stun
damage with **Power equal to the host's Security Value**, and a Damage Level set by the host's
security code:

| Host security code | Dump Shock Damage Level |
| :--- | :--- |
| Blue | Light |
| Green | Moderate |
| Orange | Serious |
| Red | Deadly |

Also worth knowing: getting hit by white or gray IC risks a little simsense bleed-through even
before any of that — a Willpower test against a fairly low TN (2 for Light icon damage, 3 for
Moderate, 5 for Serious) keeps it off, and failing means a single light Stun wound. There's no
TN for Deadly icon damage, because **taking Deadly damage crashes the icon outright** and exposes
its user to Dump Shock instead. *(SR3 p.226–227)*

---

## Hot and Cold ASIST *(Matrix p.18)*

How a decker's cyberdeck talks to their brain matters:

- **Cold ASIST** is the standard, legal interface — the kind that ships on cyberterminals and most
  decks. It caps the intensity of the simsense feed, which means it can't be pushed to lethal
  levels: black IC that would otherwise deal lethal damage is treated as non-lethal against a cold
  ASIST user.
- **Hot ASIST** cranks that ceiling off. It's what actually lets a decker take advantage of
  Response Increase and Hacking Pool in the first place, and it enables an extra speed bonus for
  running fully hands-free ("pure DNI"). The price is that black IC becomes genuinely lethal
  against a hot ASIST user, and — as if that weren't enough — hot ASIST interfaces are illegal in
  their own right.

---

## Doing it in The 2nd Chumming (Foundry)

### Choosing the ruleset

A world setting, **Matrix Ruleset** (in Foundry's Configure Settings), switches between
**"Matrix Defragged v2"** (the default) and **"Orthodox SR3 Matrix"** — this page's rules.
Changing it needs a full Foundry restart, and the GM sees a warning that switching mid-campaign
could break things, so it's a session-zero decision.

### Deck and persona

On a character or NPC's **Matrix** tab under the Orthodox ruleset, your cyberdeck's stats live
directly on your sheet rather than as a separate item: **Model**, **MPCP**, **Hardening**,
**Active/Storage Memory**, **I/O Speed**, and **Response** (Response Increase). A **Browse
Cyberdecks** button opens a picker over the system's cyberdeck compendium and loads a chosen
model's stats onto your sheet in one click. Your four persona programs — **Bod**, **Evasion**,
**Masking**, **Sensor** — are editable fields the sheet checks against your MPCP: it flags a
warning if any single program exceeds MPCP, or if they add up past three times MPCP. A **Sleaze**
rating field and a **Loaded Programs** list (each with its own rating and computed memory cost,
filled from a similar **Browse Programs** picker) round out your utilities. The sheet computes
your **Hacking Pool**, **Detection Factor**, and **Matrix Initiative** for you from these numbers.

### Jacking in and running

A **Log On To Host** control picks which host actor you're connected to (and resets your
security tally and alert level when you log on or off), and separate buttons set the host's
**alert level** — No Alert, Passive Alert, or Active Alert. A **Matrix Condition Monitor** — 10
clickable boxes, plus quick buttons for Light/Moderate/Serious/Deadly damage or healing one box —
tracks your icon's health; filling it triggers Dumpshock automatically: **Stun**, Power equal to
the connected host's Security Value, and a level from its Security Code (see Dump Shock above).

### System Tests and cybercombat

A **System Test** button opens a dialog naming the connected host, your Computer skill and
Hacking Pool, your Detection Factor, and a dropdown to pick which subsystem — **Access, Control,
Index, Files, or Slave** — the action uses; each option shows that subsystem's rating (raised
automatically if the host is on Passive Alert), and you can name the action and adjust the TN for
any utility you're running. Rolling it posts a two-sided chat card — your dice and TN on one side,
the host's Security Value and Detection Factor TN on the other — that resolves as a Success
Contest exactly as described above. Any hits the host scores add straight to your tracked
**security tally**, regardless of who wins the overall contest.

A **Cybercombat** button works the same way against IC deployed on the connected host, posting its
own two-sided card for the exchange.

### IC and the host sheet

A host actor under this ruleset sets its **Security Code** (Blue/Green/Orange/Red/Black) and
**Alert** level (Passive/Active/Shutdown) at the top of its sheet, with its five **subsystem
ratings** and overall **Security Value** editable below. Its IC tab lists IC actors assigned to
it — each with a type drawn from a fixed roster of classic IC names, a Proactive/Reactive toggle,
and a note for which alert level deploys it — and a deploy button that brings assigned IC into the
current encounter. An IC actor's own sheet is mostly just a **Rating**; its attack pool and the
damage it can absorb both draw from its host's Security Value rather than from any stat of its
own, matching the book's treatment of IC as an extension of the host defending it.

### Dumpshock

Beyond the automatic trigger when your Matrix Condition Monitor fills, a **Dumpshock** button on
the Matrix tab lets a GM or player fire it manually for any other reason the story calls for. Its
dialog takes the host's **Security Code** and **Security Value** (filled in from the connected host)
and posts the book's damage: **Stun**, Power equal to the Security Value, and a level from the Dump
Shock Damage Levels table (Blue Light, Green Moderate, Orange Serious, Red Deadly) — the same as the
automatic version. The resist card rolls **Willpower** with no armor (a house ruling: the book names
no attribute). Either way, the system only announces the damage; the GM still applies it.

{: .note }
> Hardening is tracked on the sheet and its tooltip describes the book's effect, but nothing in
> this system's dice-rolling code currently reads that field — it doesn't yet reduce black IC
> damage or raise gray IC's attack TN the way SR3 p.206 describes. Treat it as informational until
> that's wired up.
<!-- UNVERIFIED-CODE: Hardening is stored on the Orthodox cyberdeck data model and shown in the UI
     with a tooltip describing its SR3 p.206 effect, but no code in scripts/documents/SR3EActor.js
     currently reads system.orthodoxDeck.hardening when resolving cybercombat, IC attacks, or
     resistance tests. This is a code gap, not a rules-verification question — reported for the
     maintainer, not something to fix here. -->

---

## Worked example

**Delgado** runs a deck with **MPCP 6**, split **Bod 5 / Evasion 6 / Masking 4 / Sensor 3** (18
points total — right at 3× his MPCP), and Computer 5. His Intelligence is 4, so his **Hacking
Pool** is ⌊(4 + 6) ÷ 3⌋ = **3**. Running a Sleaze-5 utility, his **Detection Factor** is
⌈(4 + 5) ÷ 2⌉ = **5**.

He's hitting a **Green** host with an **Access Rating of 8**, running a Decryption-3 utility to
soften the target number.

1. **Logon.** He rolls Computer 5 plus 2 Hacking Pool dice (saving 1 for later) = 7 dice against a
   TN of 8 − 3 (his Decryption utility) = **5**. He nets 3 successes.
2. **The host resists.** The GM rolls the host's Security Value (say, 6 dice for this Green
   system) against Delgado's Detection Factor of 5, and gets 1 success.
3. **Result.** 3 beats 1, so Delgado logs on cleanly. The host's 1 success still adds to his
   **security tally** on this system — a small price for getting in.
4. **Later**, Delgado trips a Trigger Step and a Killer IC (Rating 6) attacks him in cybercombat.
   Its Attack Test nets 4 successes against his Evasion-based defense of 2 successes — 2 net
   successes, enough to step its damage up one level. Since this is a Green host, Killer IC there
   deals Moderate damage before staging, so Delgado is now facing **Serious** damage, resisted
   with his Bod Rating against the attack's Power.
5. **If that hit had crashed his icon instead**, Delgado would be dumped and would need to resist
   **Dump Shock** — Stun damage at a Power equal to the host's Security Value, with a Damage
   Level set by the host's Green security code.
