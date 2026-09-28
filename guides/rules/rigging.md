---
title: Rigging
parent: Rules
nav_order: 8
---

# Rigging: rules and how to do it in the system
{: .no_toc }

Vehicles, drones, jacking in and vehicle combat — the rules from the core
book, and how a player actually runs them at this table.

1. TOC
{:toc}

---

## Part 1: the rules

### Vehicle Attributes  *(SR3 p.130–133)*

Vehicles have their own Attribute Ratings, the way characters have
Attributes. The ones that come up at the table:

- **Handling** — how easy the vehicle is to control. Confusingly, a
  *higher* Handling is *worse*: it's the base target number for Driving
  Tests.
- **Speed** and **Acceleration** — top safe speed (meters per Combat Turn)
  and how fast that speed can change on a successful Driving Test. Pushing
  past 1.5× Speed, or braking too hard, gets punished elsewhere in these
  rules.
- **Body** and **Armor** — how much punishment the vehicle takes before it
  won't take any more, and how much of an incoming hit's Power gets
  stopped outright or reduced. Vehicle armor is hardened: it blocks a hit
  completely if that hit's Power (after the mass reduction below) doesn't
  clear the rating.
- **Signature** — the target number sensors and missiles need to lock the
  vehicle; ordinary gunfire aimed by eye ignores it.
- **Autonav** — the onboard autopilot's rating. It helps outside combat and
  gets in the way during it (see the vehicle-combat actions below).
- **Pilot** — a drone's own decision-making rating, used in place of a
  skill when nobody is driving it.
- **Sensor** — the vehicle's Perception dice, and a small boost to Gunnery.
- A handful of others (Cargo Factor, Load, Seating, Entry Points) are
  bookkeeping rather than dice.

### Riggers, jacking in, and Control Pool  *(SR3 p.44, p.130, p.140, p.301)*

A **rigger** carries a **Vehicle Control Rig (VCR)**, cyberware that lets
them drive a suitably wired vehicle through a neural link instead of a
wheel or yoke. Jacked in this way, a rigger gets several things an
ordinary driver doesn't:

- **A better Initiative.** Each VCR level is worth **+2 Reaction and one
  extra Initiative die** while rigging *(SR3 p.301)*. This is a
  replacement, not a stack: wired reflexes, boosted reflexes, and magical
  or adept increases to Reaction or Initiative **do not apply** for a
  rigger determining Initiative this way *(SR3 p.140)*.
- **A Control Pool.** This works like Combat Pool or Spell Pool but is
  spent only on tests to control the rigged vehicle: driving, dodging
  incoming fire, and resisting collision damage. Its size is simply the
  rigger's own Reaction plus twice their VCR level — nothing else adds to
  it — and any single test can only draw as many Control Pool dice as it
  has base skill dice *(SR3 p.44)*. **No VCR means no Control Pool at
  all**, even for a rigger driving a vehicle they aren't currently jacked
  into.
- **An easier default.** A VCR lets its user default to Reaction for any
  Vehicle Skill test at only **+2** to the target number, instead of the
  usual +4 for defaulting to an unrelated attribute *(SR3 p.301)*.
- Riggers can alternatively jack into a **remote control deck** to run
  drones from a distance instead of riding in them. Left with no driver at
  all, a drone falls back on its own **Pilot Rating** in place of a skill.

### The Driving Test  *(SR3 p.134)*

Ordinary vehicle handling — a difficult maneuver, not vehicle combat — is a
**Complex Action**: the appropriate Vehicle Skill against a base target
number equal to the vehicle's Handling. An active autonav adds dice equal
to its own rating outside combat; a jacked-in rigger can add Control Pool
dice (up to their skill rating) instead of the autonav bonus, on top of
reducing the target number by their VCR level.

#### Driving Test Modifiers Table  *(SR3 p.134)*

| Condition | Target number modifier |
| :--- | :---: |
| Unfamiliar vehicle | +1 |
| Non-stressful situation | −1 |
| Stressful situation | GM discretion |
| Large vehicle of type | +2 |
| Very large vehicle of type | +3 |
| Weather: bad | +2 |
| Weather: terrible | +4 |
| Terrain: open | −1 |
| Terrain: normal | 0 |
| Terrain: restricted | +1 |
| Terrain: tight | +3 |
| Action performed during combat | +2 |
| Non-rigger driving using a datajack | −1 |
| Rigger in control | −VCR Rating |

### Driving without rigging  *(SR3 p.130, p.134)*
{: #driving-without-rigging }

Most drivers at the table aren't riggers at all — a street samurai taking
the wheel, a face on a motorcycle. Nothing above changes for them except
that the rigger-only pieces simply don't apply:

- They still make an ordinary Driving Test — Vehicle Skill against the
  vehicle's Handling — and still get an active autonav's dice outside
  combat. They never have a **Control Pool** to add on top, because that
  pool only exists for someone jacked into a VCR.
- With no Vehicle Skill at all, they use the **same Default Table**
  everyone else defaults from: typically falling back on Reaction at the
  ordinary **+4** target-number penalty for defaulting to an unrelated
  attribute. The VCR's +2 discount above is specific to a rigger with that
  cyberware and doesn't extend to anyone else.
- Driving through a **datajack without a VCR** — or a VCR-equipped rigger
  driving a vehicle that isn't itself wired for rigger control — gets a
  small **−1** break on the target number (the datajack row on the table
  above), but still earns no Control Pool.
- Their **Initiative** is rolled the ordinary way for their character, with
  none of a rigger's VCR bonus, whether or not they happen to be driving
  that turn.
- **Crash Tests, ramming, and the driver/passenger collision-damage rules**
  below apply to them exactly the same as to a rigger. The only things
  rigging adds there are Control Pool dice to soften the hit and the
  separate p.145 rigger-feedback damage — neither of which touches someone
  driving by hand.

### Vehicle combat and the Maneuver Score  *(SR3 p.138–144)*

Once a chase or a fight turns into an actual vehicle-combat scene, the
book layers on a **Maneuver Score**: a number rebuilt every Combat Turn
from the vehicle's type (nimble vehicles like motorcycles score well,
lumbering ones like heavy trucks score poorly), the terrain, roughly how
fast the vehicle is going, and **Driver Points** — an **Open Test** (every
6 is rerolled and added, as many times as it keeps coming up) using the
Vehicle Skill, plus any Control Pool dice the rigger allocates for it.

Each driver then picks one Complex Action per turn from a short list, each
with its own modifier table:

- **Accelerating or braking** — a Driving Test against Handling; success
  changes speed by Acceleration times the successes rolled.
- **Positioning** — banks successes as a bonus to *next* turn's Maneuver
  Score, buying a better tactical spot.
- **Ramming** — see below.
- **Hiding** — breaking contact with a pursuer, whose successes make it
  harder for the follower to relocate the hider next turn.
- **Relocating** — the pursuer's answer to a vehicle that just hid.
- Or simply doing something that isn't driving — firing a personal weapon,
  working the electronics, and so on — as an ordinary action instead.

#### Accelerating/Braking Target Modifiers Table  *(SR3 p.141)*

| Condition | Modifier |
| :--- | :---: |
| Own Maneuver Score exceeds opponent's by 10 or less | −2 |
| Own Maneuver Score exceeds opponent's by more than 10 | −4 |
| Opponent's Maneuver Score exceeds own by 10 or less | +2 |
| Opponent's Maneuver Score exceeds own by more than 10 | +4 |
| Fleeing more than one vehicle | +1 per additional vehicle |
| Vehicle exceeds its Speed Rating | +1 |
| Autonav active | + Autonav Rating |
| Terrain: open / normal / restricted / tight | −1 / 0 / +1 / +3 |
| Driver has a VCR implant | −(VCR Rating × 2) |

#### Positioning Modifiers Table  *(SR3 p.142–143)*

| Condition | Modifier |
| :--- | :---: |
| Vehicle exceeds its Speed Rating | +1 |
| Autonav active | + Autonav Rating |
| Terrain: open / normal / restricted / tight | −1 / 0 / +1 / +3 |
| Driver has a VCR implant | −(VCR Rating × 2) |

#### Ramming Modifiers Table  *(SR3 p.143)*

| Condition | Modifier |
| :--- | :---: |
| Ramming vehicle's Maneuver Score exceeds target's by 10 or less | −2 |
| Ramming vehicle's Maneuver Score exceeds target's by more than 10 | −4 |
| Target's Maneuver Score exceeds ramming vehicle's by 10 or less | +2 |
| Target's Maneuver Score exceeds ramming vehicle's by more than 10 | +4 |
| Vehicle exceeds its Speed Rating | +1 |
| Autonav active | + (Autonav Rating + 2) |
| Terrain: open / normal / restricted / tight | −1 / 0 / +1 / +2 |
| Driver has a VCR implant | −(VCR Rating × 2) |

#### Hiding Target Modifiers Table  *(SR3 p.144)*

| Condition | Modifier |
| :--- | :---: |
| Hiding vehicle's Maneuver Score exceeds opponent's by 10 or less | −2 |
| Hiding vehicle's Maneuver Score exceeds opponent's by more than 10 | −4 |
| Opponent's Maneuver Score exceeds hiding vehicle's by 10 or less | +3 |
| Opponent's Maneuver Score exceeds hiding vehicle's by more than 10 | +6 |
| Vehicle exceeds its Speed Rating | +2 |
| Autonav active | + Autonav Rating |
| Escaping more than one vehicle | +1 per additional vehicle |
| Terrain: open / normal / restricted / tight | +4 / +2 / 0 / −2 |
| Driver has a VCR implant | −(VCR Rating × 2) |

A successful Hiding Test also earns an **Escape Bonus** equal to its
successes, added to Driver Points each turn until the pursuer relocates
the hider (a **Relocating Test** — a Sensor or Perception Test against the
hider's Signature, made harder by the hider's own Hiding successes and by
a similar set of Maneuver Score and terrain modifiers, in reverse).

Vehicle armor is **hardened**: a hit whose Power (after the vehicle-mass
halving below) doesn't exceed the Armor Rating does nothing at all;
otherwise Armor reduces Power like ordinary armor.

### Shooting a vehicle, and shooting from one  *(SR3 p.149)*

A vehicle's size works in its favour against gunfire: an attack aimed at
the vehicle itself has its Power halved and its Damage Level dropped a
step **before** the vehicle's own Armor is applied, and a weapon too weak
to do more than Light damage can't scratch a vehicle at all without
special ammunition. Anti-vehicle ammunition skips that halving, and only
loses half the Armor Rating rather than the whole thing.

The vehicle resists with Body dice plus any Control Pool a jacked-in
rigger can add (capped at their skill), against the reduced Power. A
rigger may dodge instead of soaking, spending Control Pool against
Handling in place of Combat Pool.

Shooting **passengers** inside the vehicle is harder than shooting the
vehicle itself: the shot loses Power equal to whichever of the vehicle's
Armor or Body is higher, and if that wipes the Power out entirely nobody
inside can be hurt by it. Passengers only get half their usual Combat Pool
for Dodge or resistance, and a rigger who is jacked in — their attention
is in the vehicle, not their own body — can't dodge at all and takes a
target-number penalty on their own resistance roll.

### Vehicle damage, Crash Tests, and ramming  *(SR3 p.145–148)*

Vehicles only track physical damage, staged Light through Destroyed the
same way a character stages Light through Deadly, each level adding its
own target-number penalty, Initiative penalty and Speed reduction.

#### Vehicle Damage Modifiers Table  *(SR3 p.147)*

| Damage Level | Target number modifier | Initiative penalty | Speed reduction |
| :--- | :---: | :---: | :---: |
| Light | +1 | −1 | none |
| Moderate | +2 | −2 | 25% |
| Serious | +3 | −3 | 50% |

A vehicle that reaches **Destroyed** is no longer operable. *(SR3 p.149)*

The Power of a crash or a ram is the relevant speed, in meters per Combat
Turn, divided by ten and rounded up.

#### Impact Damage Levels Table  *(SR3 p.147)*

| Vehicle speed (m/turn) | Damage Level |
| :--- | :---: |
| 1–20 | Light |
| 21–60 | Moderate |
| 61–200 | Serious |
| 201+ | Destroyed |

A **Crash Test** — a Driving Test against Handling — comes up whenever a
vehicle takes Serious damage in one hit, gets rammed and hurt by it,
bottoms out its Condition Monitor, or brakes far harder than its
Acceleration allows. Both the autonav bonus and Control Pool dice can help
here. Failing it means the vehicle stops dead and has to resist the
impact on top of whatever caused the crash in the first place.

#### Crash Test Modifiers Table  *(SR3 p.148)*

| Condition | Modifier |
| :--- | :---: |
| Driver wounded | + the wound's damage modifier |
| Vehicle already damaged | + the vehicle's own damage modifier |
| Terrain: open / normal / restricted / tight | −1 / 0 / +2 / +4 |
| Speed less than driver's Reaction × 20 | 0 |
| Speed less than Reaction × 30 | +1 |
| Speed less than Reaction × 40 | +2 |
| Speed more than Reaction × 40 | +4 |

**Ramming**: the ramming vehicle rolls a Ramming Test (Driving Skill
against Handling, modified by the table above). On a success, **both**
vehicles resist a collision at a Power equal to their speed difference ÷
10, rounded up, at the Damage Level the Impact table gives that speed
difference. The rammer's own successes on the Ramming Test reduce the
**Power of the collision** — for the rammer's own resistance roll only —
by their vehicle's Body Rating times those successes, floored so the
resulting target number never drops below 2. The **target's** Damage Code
is untouched by that reduction. Either side that ends up taking damage
from the collision then owes its own Crash Test.

**Everyone aboard shares the hit.** Whenever the vehicle takes damage —
crash, ram, or gunfire — the driver and every passenger resist the same
Power the vehicle faced, but at whatever Level the vehicle actually ended
up taking after its own soak, not the raw Level before that. A seat belt
knocks that Level down one further step, and only impact armor (never
Ballistic) counts against it.

**A jacked-in rigger takes a second, separate hit.** Beyond what their
body feels as a passenger, the neural feedback of a Serious hit to "their"
vehicle forces a Willpower-resisted Physical Damage Resistance Test — no
Combat or Control Pool allowed — against a fixed 6M; if the vehicle is
destroyed outright, that becomes 6S *(SR3 p.145)*.

### Dump shock for a rigger  *(SR3 p.156)*

Getting forcibly kicked out of a rigged connection hits a rigger harder
than the equivalent shock hits a decker, because the VCR link runs deeper
into the nervous system. There are two distinct triggers, and vehicle
**destruction is not one of them** — that case is the fixed 6S Physical
hit above, from p.145:

- **Dumped from a remote-control network**: resist a Stun Damage
  Resistance Test with Willpower, at a Power equal to **the deck's own
  Rating + 4**. On top of that, the rigger suffers ten Combat Turns of
  disorientation, adding **+2** to every Success Test they make during
  that window.
- **Involuntarily jacked out of a vehicle, other than by its
  destruction** (forced out some other way, mid-scene): resist a flat
  **5S** Stun instead, plus the same ten turns of disorientation.

The disorientation can be shortened: a Willpower Test against target
number 4, then divide **30 by the successes (round up)** for the number of
seconds disoriented, then divide that by **3 (round up)** for how many
Combat Turns the effect actually lasts.

### Autonav and Pilot for drones  *(SR3 p.132–133, p.157)*

A driverless drone substitutes its own **Pilot Rating** for whatever skill
or attribute the test would otherwise use. Giving it anything more
specific than a standing order is a **Drone Comprehension** test: the
Pilot Rating rolled against a target number the GM sets by how complicated
the instruction is — one success gets it followed, more successes buy the
drone some leeway in how it's carried out *(SR3 p.157)*.

Electronic warfare against a rigger or their drones — jamming, signal
degradation, intrusion and the rest — is a large enough topic that it gets
summarised on the Decking page rather than repeated here; see
[Decking](../decking-defragged/) and, for what this system actually
implements, Part 2 below.

---

## Part 2: doing it in The 2nd Chumming (Foundry)

The system never applies vehicle damage automatically, same as everywhere
else: it rolls dice, stages damage, and posts a button — the GM clicks the
wound boxes. Not everyone behind the wheel is rigging, either — see
[Driving without rigging, in Foundry](#driving-without-rigging-in-foundry)
below for the ordinary case.

### Getting a vehicle onto a character's sheet

A vehicle is its own **actor**, with its own sheet (Stats / Weapons / Mods
/ Electronic Warfare / Notes tabs). To give a character a vehicle:

- **Drag the vehicle actor onto the character sheet.** Dragging a
  compendium vehicle **deploys a working copy** and sets that character as
  its driver; dragging an existing world vehicle **links** it to that
  character instead. Both routes run through the GM so the character ends
  up with **owner** permission on the new or linked vehicle actor, whether
  or not a Player has permission to create actors directly.
- Or, on the character sheet's **Vehicles** tab, click **+ Add Vehicle**,
  which opens the same dialog with three sources: link an existing world
  vehicle, create a blank one, or pull one from a compendium.
- The Vehicles tab lists every vehicle whose pilot is this character, with
  its Handling/Speed/Body/Armor/Pilot/Sensor at a glance, a link to open
  its sheet, and per-vehicle **VCR / RCD / Auto** mode buttons plus a ✕ to
  unlink it (the vehicle itself isn't deleted — it can be added back).
- On the vehicle's own sheet, the **Pilot** dropdown sets who drives it,
  and **Passengers** (add/remove tags in the header) tracks who else is
  aboard — this is the roster a crash or ram reaches, without needing a
  Chase Scene open.

### Jacking in: VCR / RCD / Auto

Each vehicle has one of three control modes, toggled from either the
vehicle sheet's header or the character sheet's Vehicles tab:

- **VCR** — the pilot is jacked in with a Vehicle Control Rig. The system
  reads the rigger's own VCR item (a cyberware item with "VCR" or "vehicle
  control rig" in its name) for its level, and uses Reaction (base,
  unaugmented) plus twice that level for both Initiative and Control Pool
  — wired reflexes and magical Reaction boosts are excluded, matching the
  book. **VCR is exclusive**: setting one vehicle to VCR automatically
  drops any other vehicle that character was VCR-driving to RCD, and turns
  off VR Matrix modes on the character (VCR and VR can't both be active).
- **RCD** — remote control deck: the rigger's plain Reaction and normal
  Initiative dice, no VCR bonus, and no Control Pool.
- **Auto** — nobody is piloting; the vehicle rolls its own Initiative from
  its Pilot Rating, and clearing this mode also clears the vehicle's
  pilot.

A vehicle in VCR or RCD mode copies its rigger's Initiative for Combat
Turn ordering rather than rolling its own.

{: .note }
> The book's VCR-specific default reduction (Reaction at +2 instead of the
> usual +4, above) isn't modeled: the Default Table a driver with no
> Vehicle Skill sees is the same generic one used everywhere else in the
> system, with no VCR-aware discount. This is tracked in the codebase as
> TODO 106.

### Driving without rigging, in Foundry
{: #driving-without-rigging-in-foundry }

A character with no VCR item at all — the ordinary case — still uses the
same 🚗 Driving Test dialog described just below. The "Using VCR" option
in it only shows up once the system finds VCR cyberware on the driver;
without one, the pool simply builds as Vehicle Skill plus Autonav, with no
Control Pool line at all, since the underlying Control Pool calculation
returns zero for anyone without a VCR rating. The vehicle's control-mode
button is normally left on **RCD** for this case: mechanically, "no VCR
bonus" is one path whether the driver is remote-piloting a drone or simply
sitting behind the wheel, so the same Reaction-based Initiative and pool
math cover both, and the mode buttons are shared between them. Defaulting
with no matching Vehicle Skill opens the same Default Table dialog
described in the note above — it always offers the ordinary +4-to-an-
attribute default, with no special case for a rigger's +2.

### Driving Tests and Crash Tests

- **🚗 Driving Test**, from the vehicle sheet's Stats tab (only shown once
  a pilot is set) or the **Rollable Tables** sidebar tab (available to
  everyone, not just the GM), asks for the vehicle and driver, then builds
  the pool automatically: Vehicle Skill plus Autonav normally, or Vehicle
  Skill plus Control Pool dice (capped at the skill) once "Using VCR" is
  selected for a jacked-in rigger. The target number starts at Handling
  and offers the standard dropdowns — unfamiliar, stressful, size,
  weather, terrain, combat, datajack, and the VCR reduction. No Vehicle
  Skill on the driver opens the Default Table dialog instead of refusing
  the roll.
- **💥 Crash**, from the same Stats tab menu (or the Vehicle Tools HUD on a
  token, or the 💥 button offered after a failed Driving Test), gives two
  ways in: rolling the Crash Test as the driver, so a failure posts the
  crash automatically, or posting crash damage directly for when the
  accident has already happened and there's no test left to make. Either
  way it ends at the same damage builder: speed (asked in km/h and
  converted to meters per Combat Turn for the table), a Power and Level
  that follow the vehicle's speed until the GM edits them by hand, and a
  checklist of who's aboard (seeded from the vehicle's pilot/passenger
  roster) to resist afterward.
- **Ramming and collisions** post the same occupant-resistance chain: after
  the vehicle's own soak roll, the driver and every passenger get a
  resist-collision-damage button, which opens a small dialog asking for
  their Body dice, their impact armor (pre-filled from worn and implanted
  armor), and whether they were belted in, and shows the resulting
  Power/Level/target number live before they roll. If the vehicle itself
  took no damage, the card says so and nobody rolls.

### Dump shock, and rigger damage from a destroyed vehicle

- **⚡ Dump Shock** is a button in the character sheet's *Rigger —
  Electronic Warfare* panel (and beside the Matrix tools when in VR). Its
  dialog asks what the character was dumped from: the Matrix (a decker),
  a **remote-control network**, which uses the RC deck Rating from the
  panel, or a **vehicle** they were jacked out of. The rigger cases post
  the book's Power, **(Rating + 4)S** or **5S** Stun. The resist card rolls
  **Willpower**, with no armor. The card also states the ten turns of
  **+2** disorientation and offers the **Willpower (4) Test** that
  shortens it; that roll's result card says how many Combat Turns it lasts.
- **Rigger damage is offered automatically.** When a vehicle a rigger is
  jacked into (VCR mode) reaches **Serious**, a card offers the rigger the
  **6M** Physical resistance, and when it is **Destroyed**, **6S**. The
  roll is Willpower with no Combat or Control Pool and no armor. Nothing
  is applied: the rigger rolls, and the wound goes on only when someone
  clicks 🩸 Assign.

### The Chase Scene (combat tracker)

The 🚗 Chase Scene tool, opened from the Rollable Tables sidebar tab (open
to every player, not just the GM), implements the book's vehicle-combat
maneuver system rather than standing in for it with something simpler: it
tracks each participant's vehicle type, terrain and speed, computes their
Maneuver Score, and offers dedicated action buttons for Accel/Brake,
Positioning, Ramming, Hiding and Relocating, each opening a dialog with
the relevant modifiers pre-filled and live target-number and pool math.
One participant can be flagged **Quarry** — everyone else's distance is
then tracked relative to it (positive behind, negative ahead), and at the
end of each turn the tool updates every pursuer's distance from the speed
difference automatically, reporting who's closing and who's falling
behind. Driver Points get the same reroll-on-6 handling as every other
open-ended roll in the system.

### Drones and remote control

A vehicle actor typed as a drone works the same way as any other vehicle —
Pilot dropdown, VCR/RCD/Auto modes — except its natural state is Auto,
running on its own Pilot Rating. **📡 Drone Comprehension** (Stats tab, or
the Vehicle Tools HUD) rolls Pilot Rating dice, no pool, against a GM-set
target number, with any Command-channel electronic-warfare degradation
folded in automatically. Zero successes means the drone does nothing
useful; one gets the order followed literally; two or more gives it some
leeway.

### Electronic warfare, briefly

Jamming, Flux/Footprint, ECM/ECCM, MIJI attacks and signal degradation on
a rigger or their drones live on the vehicle sheet's Electronic Warfare
tab and the ⚡ MIJI Attack / 📶 IVIS Test tools; they aren't repeated here.
Ask the GM what's actually running at your table, or see
[Decking](../decking-defragged/) for the related Matrix rules.

---

## Worked example: a ramming attempt

Dex is jacked into his **step-van** (Handling 4, Body 8) with Car Skill 5
and a Rating-2 VCR, chasing a **patrol car** (Handling 4, Body 3) driven by
an unrigged cop with Car Skill 4. Dex's van is doing 96 meters a turn to
the patrol car's 60. For this Combat Turn, assume Dex's Maneuver Score
came out to 42 against the patrol car's 28 — a gap of more than 10 in
Dex's favor.

1. **Control Pool.** Reaction 5 plus twice his VCR level (2) gives Dex a
   Control Pool of 9 dice, though any one test can only draw up to his 5
   Car Skill dice from it.
2. **The Ramming Test.** Base target number is his van's Handling, 4. His
   Maneuver Score beats the patrol car's by more than 10 (−4); terrain is
   normal (0); his VCR knocks off a further 2 × his Rating 2 (−4). Total
   modifier −8 against a base of 4 gives a target number of −4, floored at
   the rule's minimum of 2. He rolls his 5 Car Skill dice (no Control Pool
   needed at this target number) and gets 3 successes: the ram connects.
3. **Working out the Power.** The two vehicles are 36 meters a turn apart
   in speed; divided by ten and rounded up, that's a Power of 4, landing
   as Moderate on the Impact Damage Levels Table (21–60 m/turn).
4. **Dex's own resistance.** Because he was the one ramming, his 3
   Ramming successes reduce the **Power** of the collision for his own
   resistance test by his Body (8) times those successes — 24 points,
   which would take Power below zero, so his target number floors at 2.
   Rolling Body 8 (plus Control Pool if he wanted it, though he doesn't
   need it here) against target number 2, his van shrugs the impact off.
5. **The patrol car's resistance** isn't reduced by anything Dex rolled:
   it faces the full Moderate hit at Power 4, resisting with its own Body
   3 dice (no VCR, so no Control Pool for the cop) against target number
   4. Say the gamemaster rolls 1 success — not enough to stage a Moderate
   hit down a level, which needs 2 — so the car takes the Moderate wound
   outright, and because it took damage from a ram, its driver now owes a
   Crash Test.
6. **The cop.** Riding in the car that just got hit, the driver resists
   the same Power at the same Level the car ended up taking — Moderate at
   Power 4 — reduced further by whatever impact armor he's wearing and by
   a seat belt if he has one buckled.
