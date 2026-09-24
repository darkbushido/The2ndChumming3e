# Release notes

What changed, for the people running games with it. Newest first.

## 0.6.1 — 2026-09-24

A bug-fix release: grenades and thrown weapons, a few broken skill choices, a tidy-up of the shipped packs, and every place the 0.6.1 rules check found the code disagreeing with the books.

### Before you upgrade

- **Fully restart Foundry** after updating, not just refresh the browser: spells and ammunition have new fields.

### Rules that now resolve differently

**Damage**

- **Damage stages by the net of both sides' successes** (SR3 p.113). The attacker's successes are compared with the target's total (Damage Resistance plus any carried from a failed dodge): one level up per two the attacker is ahead, one level down per two the target is ahead, base damage on a tie. It used to stage up on the attacker's successes and down on the target's separately, so 2 against 1 came out a level too high, and a tie on a Deadly-capped attack dropped to Light. This applies to guns, grenades (p.119), attacks on vehicles and elemental spells. Melee is unchanged (p.122).
- **A character dies when Physical overflow is more than their Body**, not when it equals it (SR3 p.125).

**Magic**

- **Combat spells do Physical damage unless they are stun spells** (SR3 p.191). Manabolt, Manaball and Death Touch are mana spells, but they do Physical damage; Stunbolt, Stunball and Stun Touch do Stun. Mana or Physical decides what a spell can affect, not which track it damages. A spell's new **Damage track** field can override this.
- **Drain past Deadly adds Power** (SR3 p.191): each level a modifier would add above Deadly is +2 Drain Power instead. A Fireball cast at Serious drains Deadly with +2 Power.
- **Area spells** (SR3 p.181–182): the caster is caught in their own area. The radius is Magic metres, +1 metre for each Sorcery die withheld or −1 metre for every 2; withheld dice are not rolled. One Sorcery Test is counted against **each target's own** target number (it used to use the first target's for everyone).

**Vehicles and riggers**

- **A Vehicle Control Rig gives +2 Reaction per level** (SR3 p.301), not +1, on every rigging initiative, including the Chase Scene. A jacked-in driver in a chase rolls unaugmented Reaction, not their wired reflexes (p.140).
- **Control Pool = Reaction + 2 × VCR** (SR3 p.44), and a test takes at most its skill dice. Drivers without a VCR have no Control Pool, in chases too (p.141). The Driving Test, the Crash Test and the chase used the Vehicle Skill as the pool.
- **Shooting a vehicle** (SR3 p.149): Power is halved **rounding down**; Light damage has no effect (a warning, not a refusal); anti-vehicle rounds halve the vehicle's armour instead. The resist card says when the Power doesn't exceed the armour.
- **Sensor-enhanced gunnery** (SR3 p.152) adds half the Sensor Rating as **dice** against the target's Signature. The Sensor (or VCR) no longer comes off the target number.

**Gear**

- **Ammunition is shared by gun class** (SR3 p.279). A box of rounds takes the class of the first gun loaded from it, and after that it only goes into guns of that class. Shotguns share across pistols and rifles. The class shows on the ammunition item and can be edited.
- **Loose rounds go into a belt at (Quickness × 2)** a Complex Action (SR3 p.280).
- **Used deltaware installs as betaware** (M&M p.11): ×.6 Essence. **Used cyberware carries 1D3 permanent Stress** (M&M p.45; p.124 says 1D6 ÷ 2, and the maintainer chose p.45).

**Other**

- **Grenades roll Throwing Weapons**, not a firearm skill (SR3 p.86). **Bows, crossbows and slings roll Projectile Weapons** (SR3 p.86). A character's dice for these attacks may change.
- **A grenade's blast loses Power at its own rate** — Offensive −1 per metre, Defensive −1 per half metre (SR3 p.119, p.283). The Chunky Salsa calculator uses the same rate.
- **Flechette** (SR3 p.116, p.119): a weapon or grenade can carry the flechette rules itself — a checkbox on the item, or an `(f)` after its Damage Code, which is now read. A flechette weapon takes no other ammunition.
- **Gas, smoke and flash grenades** now land and mark their area instead of refusing to throw (SR3 p.283). They deal no damage; the card says how to use the area.

### Content

- The SR3 core grenades are now in `sr3e-sr3-projectiles`, and the core explosives carry the Explosives Table's Blast and Legal columns (SR3 p.283).
- **The SR2 compendium packs are no longer shipped** (25 packs, parked in `archive/sr2`) until they are fixed. Characters already holding SR2 items keep them; only the compendium entries are gone, and the Edition setting offers SR3 only.
- Broken `_id: null` entries left in packs by older builds are removed on load (GM only, only when a good copy exists).

### Fixes

- Buy gear: the haggle no longer fails when rolling the negotiation.
- Compendium search no longer breaks on index entries with no uuid.
- The pause-screen logo no longer 404s on Linux.

## 0.6.0 — 2026-09-23

The first version published as a GitHub Release. Earlier versions were installed straight from
the `main` branch. These notes cover what changed **since 0.5.1**. Changes that alter how a rule
resolves give the book and printed page, so a table in the middle of a campaign can see which
numbers moved and why.

### Before you upgrade

- **Back up your world**, then **fully restart Foundry** after updating. A browser refresh is not
  enough, because new data fields were added.
- **Some changes are applied automatically** the first time a GM loads the world. They only fill
  in blanks; a value you typed yourself is kept.
  - An item whose rating was only in its name (`Medkit [6]`, `Wired Reflexes [2]`) gets that
    number in its Rating field, where you can now see and change it.
  - Pre-filled clips and speed loaders that showed 0 rounds and could not be loaded are converted
    into a count of reloads.
- **Ammunition tracking** is now on by default, but only for **new** worlds. An existing world
  keeps its current setting, so no one's guns suddenly read empty. Turn it on under
  *Configure Settings → System* whenever you're ready.
- **121 fan-made items were removed from the SR2 compendiums**, mostly firearms. They carried a
  fan publication's page reference and could not be hidden by the source-book toggles. Characters
  who already own one keep it; the compendium just no longer offers them.
- **Only the GM can change Essence**, including the "Essence lost" box. Players see the numbers
  read-only.
- **Spells now record the Force they were learned at** (see *Magic* below). No existing spell has
  it filled in yet, so they cast uncapped until you enter it on the spell.
- **Installing a specific version:** paste
  `https://github.com/darkbushido/The2ndChumming3e/releases/download/v0.6.0/system.json` into
  Foundry. An install from the latest release will see future updates as usual.

### Rules that now resolve differently

These change results at the table. Each one was checked against the book.

**Combat**
- **Grenades stage up by the thrower's successes** (SR3 p.119). The thrower's successes used to
  only tighten the scatter, so a perfect throw hit no harder than a poor one. Now every two
  successes over the target's raise the Damage Level by one. Power is unchanged.
- **Wounds now raise target numbers everywhere they should** (SR3 p.125). Before, several tests
  ignored the wound modifier:
  - both fighters in melee and astral combat (p.123, p.174)
  - grenade throws
  - contested rolls
  - cybercombat and the Orthodox Matrix tests
  - the rigger's electronic-warfare tests (MIJI, infiltration, ECCM, Footprint, IVIS)
  - vehicle weapons, which used to remove dice instead of raising the TN
  - Knockdown
- **Every 6 that should explode now waits for you to roll it.** MIJI, the Orthodox Matrix cards,
  fooling a ward and banishing used to roll their extra dice silently. In any opposed roll, the
  result now waits until **both** sides have finished exploding, so a 💥 can change who wins.
- **A gyro mount's full rating counts against recoil *and* against movement modifiers**. It used
  to be one allowance shared between the two. This follows the Max-Gyro's wording (Cannon
  Companion p.34) and is the maintainer's ruling.

**Magic**
- **Elemental Manipulation spells are dodged and soaked like ranged attacks** (SR3 p.183, p.196).
  This covers spells such as Fireball, Lightning Bolt and Acid Stream.
  - Targets may dodge, then soak with Body and Combat Pool.
  - Impact armour counts at half its rating, and Mystic Armor is halved with it.
  - Before, they went through the Spell Resistance test that is meant for Combat spells.
- **A cast that rolls all 1s adds +2 to the caster's Drain target number** (SR3 p.182). This is on
  top of any penalty for spells being sustained.
- **You can't cast a spell at a higher Force than you learned it at** (SR3 p.178). The cast dialog
  starts at the learned Force; casting lower is still allowed.
- **Sustaining a spell costs +2 per spell on every test**, including Drain and Spell Resistance.
  The one exception is Damage Resistance (SR3 p.178). Sustained spells are listed on the Magic tab.
  A spell held by a focus costs nothing.
- **Drain is always Physical while astrally projecting**, whatever the Force (SR3 p.183).
- **Drain is resisted with *current* Willpower**, so bonuses such as a Pain Editor or an Adrenal
  Pump now count.
- **Magic rating uses its current value everywhere.** Summoning, dispelling, banishing and wards
  used the unmodified rating, so the same caster could take Stun Drain in one flow and Physical in
  another. Essence loss now lowers Magic in all of them.
- **Mystic Armor protects in astral combat** (SR3 p.170, p.175). It reduces the attack's Power
  there. Worn physical armour still does nothing on the astral plane.

**Matrix (Matrix Defragged)**
- **Dumpshock is Serious damage**, not Moderate (MDF p.27).
- **Only VR-Hot uses Matrix Initiative** (MDF p.10). A decker in Tortoise, AR or VR-Cold rolls
  their own meat-world initiative dice, so wired reflexes count again. They were forced to one die.

**Gear and cyberware**
- **Ratings stored in an item's name are now read.** A compendium Vehicle Control Rig added
  nothing to a rigger's initiative or Driving Test, and a plain Medkit gave no dice, because both
  read their rating as 0. A plain Medkit is Rating 3 (SR3 p.304).
- **Damage Compensators work** (M&M p.71). They ignore that many boxes of damage when working out
  the wound modifier, like the Pain Resistance adept power. If a character has both, the larger
  one applies.
- **Reloading follows the Ammo Reloading Table** (SR3 p.280).
  - Swapping a clip, speed loader or belt loses whatever rounds were left in the old one.
  - Loading loose rounds by hand tops up the gun and never loses a round. Rounds of a different
    type go back into the character's stock.
  - Magazine type `(b)` means break action, not belt.
  - The reload dialog shows what the reload costs in actions.

### New at the table

**Actions and weapons**
- **Action tracking** (SR3 pp.105-108). The combat tracker shows which actions each combatant has
  used this phase, and attacks, spells and reloads mark themselves. Nothing is ever refused. The GM
  can undo an action, which also puts back the ammunition and pool dice it used.
- **Ready Weapon and Quick Draw** (SR3 p.107). A holstered weapon warns before an attack and
  offers a Quick Draw.
- **Hands** (SR3 p.112). Each weapon records how many hands it needs. A second pistol or SMG in
  the other hand applies the +2 for firing two guns.
- **Smartguns, laser sights and gyro mounts** are recorded on each weapon, and the GM's modifier
  window fills in the right rows.
- **Shotgun shot, choke and spread** (SR3 p.117). Set the choke in the fire dialog. Spread lowers
  Power and the attacker's target number, and raises the target's Dodge target number.
- **Smartguns waste no rounds when walking full-auto fire** between targets (SR3 p.116).
- **The system remembers who you shot at this phase** and fills in the +2 per extra target, for
  ranged attacks and melee alike (SR3 p.111, p.122).
- **Quick Strike** (Magic in the Shadows p.151). A ⚡ on the adept's tracker row lets them act
  first in the pass. "Unwounded" means no wound modifier, per the maintainer's ruling.

**Cyberware and Essence**
- **The Essence hole** (M&M p.150). Removing cyberware still refunds nothing, but it leaves a hole.
  An implant installed with the Essence Slot option fills that hole instead of costing new Essence.
- **Stress on implants and Attributes** (M&M pp.124-131). The GM applies it from the Cyber tab and
  it is tested there.
- **Cybersystem damage** (M&M pp.126-129). Rolls on the Wound Effect Table, with each implant
  placed in the character's six Essence slots. The GM decides whether a wound calls for it.
- **Move-by-wire side effects** (M&M p.60). The automatic Stress and the TLE-x brain disorder are
  shown and tracked.
- **Cyberzombies** (M&M pp.50-59). Essence can go below zero for one, and the periodic Chronic
  Dissociation Syndrome check is on the Cyber tab.

**Gear, money and drugs**
- **Buying gear** (SR3 pp.272-273). 🛒 on the Bio tab:
  1. An Etiquette test against the item's Availability.
  2. The delivery time.
  3. A Negotiation test that moves the price up or down.
  4. Payment. Nothing is charged until you press 💴.
- **A ledger of karma and nuyen** on the Bio tab. It records every change, what caused it, and who
  made it. Players can add to it but not rewrite it.
- **Drugs** (M&M pp.105-123). 💊 takes a dose, rolls addiction and tolerance, and applies the
  drug's effects. The *Substance use* block tracks withdrawal and recovery day by day.
- **Carried load** (SR3 p.274). The Gear tab shows the total weight carried and what that means
  under the optional Encumbrance rules. Nothing is enforced. Ammunition weight is per round.
- **Much more gear in the compendiums.** 2,926 items of gear, ammunition, medical supplies and
  drugs across every source book that's on by default, including 661 ammunition entries.
- **Orthodox Matrix cyberdecks and programs** from the core book (SR3 p.207, pp.220-222). They
  appear only when the Matrix ruleset is set to Orthodox.

**Healing**
- **A medic can treat another player's character**, and each card says how long the treatment
  takes.
- **Dice and target number on healing cards are visible to everyone and set by the GM.**
- **Rapid Healing** (SR3 p.170) adds its dice to the patient's healing tests.

**The sheet**
- **Hover over an attribute** to see every modifier that went into it.
- **Items show their book and page** where one is known.
- **Session Rewards lists only player characters**, and scene tools such as Chunky Salsa and
  Falling Damage list only the actors on the current scene. Templates no longer appear in either.
- **Dropping a vehicle or drone onto a character sheet** links it to that character. A drop that
  fails now says so instead of doing nothing.

### Fixes

- The Adrenal Pump's crash card had no Power and an invalid target number.
- A Rating 9 Maglock Passkey shipped as Rating 8.
- Loose rounds can be loaded into any firearm, not only clip-fed ones.
- The 💊 button no longer sits on its own line; the character sheet is slightly wider.

### Also in this release

- **Versioned rules guides.** The SR3 reference site is published alongside each release, with a
  frozen copy for every version.

For the full list of changes, see the
[commit history](https://github.com/darkbushido/The2ndChumming3e/commits/v0.6.0).
