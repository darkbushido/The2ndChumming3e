# Release notes

What changed, for the people running games with it. Newest first.

## 0.8.0 — 2026-10-25

Rated gear is one item now. A Medkit, a Signal Locator or an ECCM is a single compendium entry with a **Level** dropdown, and an owned copy's name follows the level ("Medkit [5]"). Every mod says what it is a mod *for* — "Chemical Seal (Armor)", "Gas Vent IV (Weapon)", "Anti-Theft System (Vehicle)" — and the vehicle, cyberlimb and armour mods were checked against the books. Wounds and statuses on one unlinked NPC token no longer land on every copy of that NPC. The initiative tracker, Full Defense and multi-opponent melee behave as the table expects after the 2026-10-23 play session. A grenade's NPCs resist in one GM click. Vehicles and drones get drawn top-down token art. And a GM can turn a Little Black Book contact into a person with a name and a face.

### Before you upgrade

- **Fully restart Foundry** after updating, not just refresh the browser. Vehicle mods, armour, ammunition and vehicle weapons gained a Level field; gear, cyberware, armour and vehicle mods gained a "Mod for" field; vehicle weapons have an item sheet for the first time.
- **A world migration renames the items your characters already own** (run once, by the GM's client, on the first load):
  - A level moves out of the name into the Level field, and the name follows it: "ECCM [3]" stays "ECCM [3]" with Level 3; "Chemical Seal Rating [4]" becomes "Chemical Seal (Armor) [4]"; "+Signal Locator 7" becomes "Signal Locator (Armor) [7]". A Level you typed yourself is kept.
  - Mods get their "(Armor)", "(Weapon)", "(Cyberlimb)" or "(Vehicle)" tag and the matching "Mod for".
  - Values this release corrects against the book (listed below) change **only while an owned copy still holds the old shipped value** — anything a GM edited is left alone.
  - Grenades on old sheets that read as "in hand" are put away (they arrived drawn before Ready Weapon).
  - Vehicles still showing the stock picture or a 1 × 1 token get the new drawn art and their size; a picture you chose is kept.
- **About 1,400 per-level compendium entries are gone** (one entry per item now). An owned copy keeps its stats; where it still linked to a deleted entry, the migration points the link at the remaining one.
- **Helmet options changed.** There is one **Helmet/Wrist Transceiver (Armor)** — the *Cannon Companion*'s, 250¥ × Rating (CC p.51) — and the SR3 armour pack no longer carries a transceiver or Low-Light Vision (SR3 p.284 lists neither; Low-Light is CC p.51). Electronic and Optical Magnification are now "Electronic Magnification (Armor)" and "Optical Magnification (Armor)" at Level 3 (SR3 p.284, CC p.51). There is one Thermographic option, "Thermo Vision (Armor)". Owned copies are renamed to match.
- **System macros refresh themselves.** On the GM's load, a system macro whose stored text differs from the shipped one is updated — the SR3E Chrome Threat Generator first among them. **A GM's edit to a *system* macro is overwritten**; copy it under another name to keep it. Macros you wrote yourself are never touched.
- **Check your sidebar NPCs once.** Before this release a wound or status on one unlinked token landed on its sidebar NPC, and every token dragged from it afterwards started hurt or prone. The GM tool **🧹 Reset shared NPCs** (Rollable Tables sidebar) lists the NPCs that carry any — nothing ticked — and clears what you tick.
- **The Token HUD's status list is shorter**: 13 of Foundry's 34 core statuses, the ones Shadowrun uses. Show the others again under System settings → **Configure Status Effects**. A token that already carries a hidden status still shows it, so you can clear it.

### Rules that now resolve differently

**Combat**

- **Several melee opponents are one Complex Action** (SR3 p.122: *"Characters may attack more than one opponent with a Complex Action"*). Each further opponent was charged another Complex Action; the +2 TN per further opponent was already prefilled. The melee card now says how to attack another opponent, and that it is part of the same action.
- **The melee GM window picks up Prone** (SR3 p.123, "Opponent prone −2"): its "who is down" row is preselected from the fighters' Prone status, a token's own included, and both fighters can be down at once.
- **Full Defense ends at the next round** whichever control advances it — the tracker's Next Round button skipped the round upkeep, so Full Defense carried over.
- **Tied initiative is listed in acting order** (Reaction, then a dice-off), not Foundry's id order.
- **A player can end their own turn.** Foundry refused them; the request now goes through the GM, for the acting combatant's owner only.
- **Unconscious combatants get no turns from the next round.** They stay on the tracker and act again once they are no longer down; knocked out mid-round, they keep that round's actions.
- **Removing a combatant mid-round no longer breaks the tracker** (someone acting twice, or the top row getting an extra turn).
- **Wounds, statuses and targets land on the token** — Assign the wound, Mark prone, Mark stunned, Knockdown, area spells and the auto-defeated marker all reach the one unlinked token, not its sidebar NPC and every other copy. Player characters are unchanged.

**Astral combat**

- **An astrally perceiving character fights with their Combat Pool** (SR3 p.174: *"Astrally perceiving characters and other dual beings use their normal physical Attributes, skills and Combat Pool in astral combat"*). The astral combat card offered everyone the Astral Combat Pool; it now offers it only to a character set to **Astral Plane** (projecting) or a spirit in astral form, and charges whichever pool it offered.
- **Astral damage follows the Astral Damage Codes Table** (SR3 p.176). A projecting character still deals (Charisma)M, plus a weapon focus's damage when armed; an astrally perceiving character or other dual being now deals **(Strength)M**, or its weapon's own damage when armed; a spirit deals **(Force)M**. Before, everyone dealt Charisma. The damage stays editable on the card.

**Grenades**

- **One GM button resists every NPC in a blast** — and every GM-side drone — onto one summary card. Player characters, ordinary vehicles and player-rigged drones still get their own cards.
- **The blast marker clears itself** once everyone caught has fully resisted (every 💥 rolled) or the GM has ✕'d them in the ⏳ panel.

**Gear, levels and prices**

- **Every rated item is one entry with a Level dropdown.** Picking a level brings that level's printed cost, availability, Street Index, Essence, CF, load and description; graded cyberware and bioware keep their grade (an Alpha cost stays doubled). A houserule level can still be typed. 🛒 Buy gear shows one row per item with a Level picker; the Street Index no longer resets to 1 when you change the level.
- **Vehicle mods checked against *Rigger 3* (pp.126–150)** — changed from what shipped:
  - **Vehicle Armor** is one mod, levels 1–11: 1,250¥, Body² × 5 kg and 8 hours per point, B/R (rating ÷ 3), Handling +1 per 6 points (R3 p.131). Levels 7, 9, 10 and 11 cost too much (now 8,750 / 11,250 / 12,500 / 13,750¥); a stray second "level 11" is gone.
  - **Concealed Armor** level 9 consumes 27 CF, not 37 (R3 p.132: 3 CF per point).
  - **Ablative Armor** level 2 is 12/14 days (R3 p.131).
  - **Power Amplifier** CF rounds up: 1, 1, 2, 2, 3… (R3 p.147).
- **Cyberware checked against *Man & Machine***:
  - **Remote Control ECCM** levels 5 and 6 cost 175,000¥ and 210,000¥ (M&M p.25: Rating × 35,000¥).
  - **RC Encryption Module** is legal code 8P-W and goes to level 10 (M&M pp.24–25).
  - **Cyberlimb body plating**: Ballistic and Impact are Legal, Ablative is 4P-Q (M&M p.37).
  - **Hydraulic Jacks** add to *jump* distance, not running distance (M&M p.29).
  - **Radio Receiver** has a level 5 (5,000¥, 10 frequencies; SR3 p.297–298).
  - Twelve built-into-a-cyberlimb entries had book errors — the DNI, the built-in smartgun link, the tracking mount, four legality codes, a fingertip compartment, Smartlink II (Internal), a duplicate decryption module (SR3 p.303, M&M pp.32–41).
  - **Cyberweapons built into a cyberlimb** — spurs, blades, razors, cyberguns — now get their attack.
- **Weapon accessories**: the Sawed-Off Barrel is 64¥ (CC p.80, p.83); the Rangefinder is top-mounted (CC p.33); the low-power laser sight is one *Cannon Companion* customisation, 800¥ (CC p.82); "Extended Clip (" is named "Extended Clip" (CC p.81).

### New

- **Meet the contact** (GM only): on a contact that points at a Little Black Book archetype, the dice icon on its row offers a real-world name — sometimes a street name — and, if a portrait module is installed, a face. The book's metatype is an example; change it in the dialog (the stats stay the book's, with a warning). Nothing is applied until you pick it, and a picture someone chose is never replaced. The system works with no portrait module.
- **Drawn token art for every vehicle and drone** — cars, bikes, trucks, boats, ships, subs, hovercraft, airships, aircraft and drones, top-down, front facing south, sized to the vehicle; Lone Star and DocWagon have their liveries.
- **NPC buttons are violet** on the eight two-corner cards (melee, astral, contested, cybercombat, MIJI, the three Orthodox Matrix cards), so the GM can tell the NPC's side from the player's.
- **"Mod for"** on every mod's item sheet — what it attaches to. Attaching mods to armour, weapons and vehicles is the next step; nothing enforces it yet.

## 0.7.0 — 2026-10-17

The Karma Pool works at last, and Good Karma buys what the book says it can. Vehicles can hit people, cars and walls. Smoke, gas and flash grenades fill the room they land in. Spells cast on a willing friend no longer need to hit them. The sheet gets a Ledger tab, a ± Funds button and a Combat Pool breakdown. And the guides gain six new pages.

This release also carries everything the 0.7.0 rules check found: every guide page was compared against the books and the code, and about seventy rules and item stats now follow the book — spell target numbers, shock weapons, bow ranges, firing modes, recoil compensation, aircraft speeds, the initiate's Astral Pool and more. They are listed below with their pages.

### Before you upgrade

- **Fully restart Foundry** after updating, not just refresh the browser. Spells have two new fields (their fetish and exclusive limits), characters have new Karma Pool, Power Point, Initiate Astral Pool and stun fields, weapons have new fields (shotgun rules, an extra damage code, a shock flag, the bracketed recoil compensation), vehicles have a Stall Speed, and there is a new compendium pack.
- **A world migration corrects owned copies of the items fixed below** — weapon damage and reach, recoil compensation, firing modes, vehicle and drone stats, the DocWagon Paramedic's medkit. It changes a value only while it still holds the old shipped one, so anything a GM edited is left alone.
- **An "Imaging Scope" already on a character stays as it is.** The pack now has a Low-Light and a Thermographic scope (SR3 p.282), and the system can't tell which one an old item meant: swap it by hand.
- **Aircraft speeds changed.** An airplane's Speed is now its maximum safe speed, and its stall speed has its own field (SR3 p.132). Aircraft already in a world are updated if their Speed is still the old (stall) figure.
- **Check each character's Karma Pool.** Before this release, spending a point of Karma Pool lowered the pool itself, so spent points never came back (SR3 p.246 says they return). The pool's size now stays put and a separate count tracks what is spent. No migration can tell a spent point from a burned one, so a character who spent Karma Pool in an older version may show a pool that is too small. Type the right size into the sheet as GM. As a guide, a character starts with 1 and gains 1 for every 10 Karma earned (human) or 20 (anyone else) (SR3 p.244).
- **The gas grenade is now "Gas Grenade (Neuro-Stun VIII)"**, and its mini-grenade likewise. Grenades already on a character keep the old "VII" name; the gas card says which toxin it is either way.

### Rules that now resolve differently

**Karma**

- **The Karma Pool can be spent on rolls** (SR3 p.246–248). Every roll dialog has a 🍀 row: buy extra dice, use the Hooper-Nelson rule (p.248), or **hold for Karma**, which stops the final wave on a 🍀 card so you can re-roll failures, avoid a disaster, or buy successes before anything resolves. Before, the "Use Karma Pool" box did nothing at all. Spent points come back when the GM refreshes the pool (a sheet button and a GM tool); burned points are gone for good.
- **Good Karma buys what the core book says it can:** adept Power Points at 20 each (p.168), a new spell at the Force you choose (p.180–181), and bonding a focus (p.190). Going over the specialisation ceiling (p.84) warns.
- **Karma Pool, Good Karma and Total Karma can be typed only by the GM.** Players still spend their Karma Pool on rolls and buy things with Good Karma.
- **The GM can undo a Karma purchase** with ↺ on its 📒 Ledger line. The Karma comes back and the purchase is reverted.
- **The Attribute Maximum rounds up**, as the Racial Attribute Limit Table prints it (SR3 p.244–245): a troll's Body maximum is 17, not 16. Spend Karma warned "past max" a point early.
- **A specialisation keeps its own rating when the skill rises** (SR3 p.245: *"Specializations do not automatically increase when the base skill increases"*). Before, raising Pistols raised every Pistols specialisation with it. When the skill catches up to a specialisation, the specialisation's bonus is 0. Specialisations can now go past base + 2, up to twice the base skill (p.84).

**Magic**

- **A spell limit comes off Drain *or* the learning cost, and the player chooses** (SR3 p.180–181). When you learn a spell, choose for a fetish (−1) and for an exclusive limit (−2) whether it lowers the Karma cost or the Force for Drain. Taken off Drain, the lower Force also decides whether Drain is Stun or Physical. The spell still casts at its real Force. Before, a limit always came off Drain.
- **A non-damaging spell cast on a willing subject needs no Spell Resistance Test** (SR3 p.183: *"unless the target of the spell is willing"*). After choosing targets, a dialog asks who is willing; the caster, party members and friendly tokens start ticked. A willing subject gets every Sorcery success. A **combat** spell may be cast on a willing target too, but nobody starts ticked; **elemental** spells are always resisted, because their resistance is a Damage Resistance Test (p.183). A vehicle or other non-living target gets no Resist button. **Ruled:** the Sorcery TN is still the subject's attribute.
- **Spell target numbers follow each spell's entry** (SR3 pp.182–197). Before, about twenty spells read a flat 10 or the target's Willpower or Body.
  - **Heal, Treat, Decrease Attribute:** 10 − the target's Essence (p.193–194).
  - **Detection spells:** 4 in sight, 6 out of sight, 10 on another plane, + Force behind an astral barrier — chosen in the cast dialog (p.192).
  - **Spells on objects and vehicles** (Analyze Device and others): the Object Resistance Table, 3 / 5 / 8 / 10 (p.182).
  - **Antidote, Detox, Cure Disease:** the toxin's Strength or the disease's Power, asked in the dialog.
  - **Increase Attribute, Increase Reaction, Increase Reflexes:** the target's rating in the Attribute or Reaction (p.193–194).
  - **Stabilize:** 4 + the minutes since the Deadly wound, asked (p.194).
  - A spell whose Target the system can't read falls back to Willpower or Body and the card says to check it. Every TN stays editable.
- **Fling is a ranged attack** (SR3 p.197: *"Treat the Sorcery Test as a normal Ranged Combat Test"*). The target dodges, then resists the object's damage on **Impact** armour — no Spell Resistance Test. A thrown weapon uses its own damage and range at Strength = Force; any other object's damage is the GM's call.
- **Initiates have an Initiate Astral Pool** of dice equal to their grade, and a projecting initiate adds the grade to astral Initiative (*Magic in the Shadows* p.58). The pool is offered in astral combat (Sorcery included), on Assensing, and on other rolls while astral, but not on Magical Skill Tests — Sorcery, Conjuring, Aura Reading, Centering. It refreshes with the other pools. The core **Astral Combat Pool** (SR3 p.174) is unchanged.
- **Every adept power is checked against Magic** (SR3 p.168), fixed-level powers like Improved Reflexes 3 included. It warns, as before.
- **On a Magic Loss check, a roll of 2 always loses a point** (SR3 p.160).

**Combat**

- **A second Initiative Pass is a new Combat Phase.** The action tracker now resets for it. Before, it still showed the first pass's actions.
- **A grenade is thrown, never fired** (SR3 p.86). A grenade with a blank category, or "(AP)" in its name, asked for a firearm skill.
- **Smoke, gas and flash grenades act on what is inside their cloud** (SR3 p.112, p.249–250, p.283).
  - **The cloud stops at the scene's walls.** It used to be a circle through everything.
  - **Smoke:** a shooter or target inside it gets the p.112 Visibility Table row offered in the GM's TN window: Heavy Smoke/Fog/Rain for ordinary smoke (**ruled** — the book doesn't name a row), Thermal Smoke for infra-red smoke.
  - **Gas:** each token in the cloud gets a card to resist Neuro-Stun VIII, 6S Stun, with Body and no armour (p.250). The card states the +2 disorientation and the repeat test at +4 (p.249).
  - **Flash-Pak:** the GM ticks who was facing it, and each gets +4 (+2 with flare compensation) and the strobe's +2 (p.283).
  - The GM can shorten or lengthen a cloud a Combat Turn at a time for wind.
- **Shock weapons stun** (SR3 p.124–125) — stun batons, tasers, the Shock Glove and the M&M Shock Hand. After the hit is soaked, the target is offered **Resist the stun**: Body or Willpower (the higher) against TN 4. The stun lasts the attack's Power, minus half the Impact armour (rounded down), minus those successes, in Combat Turns; **⚡ Mark stunned** applies it. While stunned the character takes **+2 on every test**, Damage Resistance included, and the count drops each Combat Turn. Impact armour counts at half against a shock weapon.
- **The Shock Glove** does (STR − 1)M Stun **and** an extra 7S Stun, resisted separately and staged by the same net successes (SR3 p.276). Before, it was 7S Stun alone.

**Weapons**

- **Bows and crossbows take their range from the weapon's Strength Minimum** (SR3 p.110, p.118), not the archer's Strength.
- **Assault cannons** have their range bands and double their uncompensated recoil, as Heavy Weapons (SR3 p.111). Before, they had no range bands.
- **A grenade or missile launcher fired under its minimum range** (5 m / 20 m) warns (SR3 p.111).
- **APDS is ordinary ammunition against vehicles and drones** (SR3 p.116). It halved a vehicle's armour.
- **An explosive round misfires on a Rule of One** (SR3 p.116): the shot misses, and the shooter is offered a card to resist the weapon's normal damage, without Combat Pool.
- **Firing modes follow the Firing Mode Table** (SR3 p.117) where it disagrees with the Firearms tables — **ruled**: the Defiance Super Shock SS, the Ares Viper Slivergun SA, the AK-97 SMG/Carbine, HK227, Ingram Smartgun and Uzi III SA/BF, the Ingram Valiant FA.
- **Recoil compensation from the Firearms tables now counts** (SR3 pp.276–279). No shipped weapon carried any before: the HK227, Ingram Smartgun, Ranger Arms SM-3 and FN HAR have 2, the Ingram Valiant 3. A figure in parentheses — a folding stock, a tripod — counts when you tick **"integral accessories in use"** in the fire dialog, and replaces the plain figure.
- **The Remington Roomsweeper follows the shotgun rules** (SR3 p.277): the Shotguns skill, heavy-pistol ranges, choke and spread with shot at 9S(f), or normal rounds for 9M.
- **Melee weapons fixed to the book** (SR3 pp.275–276): the Sap is (STR + 2)M Stun, the Monofilament Whip has Reach 2, the Combat Axe and its Thrusting Point are Pole Arms/Staffs (**ruled**) and the point is Concealability 12, the Standard Bow at Strength Minimum 3 does 5M, and the Heavy Crossbow does 6S.

**Rigging**

- **Drones run from a rigger's deck (RCD) follow SR3 p.154.** The rigger keeps their VCR Initiative in the captain's chair, and a drone's gunnery and Driving tests roll its own Pilot Rating, with no pools. Before, the rigger rolled ordinary Initiative and the drones rolled the rigger's skills.
- **💥 Collision: a vehicle can hit a person, another vehicle or a barrier** (SR3 p.142–148), on purpose (a Ramming Test) or by accident (a Braking Test first, then whatever speed is left). It opens from the vehicle sheet, the Vehicle Tools menu, the Chase Scene and the 💥 Crash tool.
  - **A pedestrian** takes Power = speed ÷ 10 at one level higher than the Impact Damage Levels Table, and resists with Combat Pool and impact armour; the vehicle resists one level lower (p.148). They also make a Knockdown Test (p.124) — **ruled**, the book gives none for collisions; the TN is half the Power, as for a ranged attack.
  - **Another vehicle** uses the ramming rule (p.143). For an accident, **ruled**: the same formula without the rammer's Body × successes.
  - **A barrier** stops the vehicle at up to Barrier Rating × 20 m/turn; any faster and it breaks through (p.148).
  - A vehicle damaged in a collision is offered a Crash Test (p.143, p.147).
- **A jumped-in rigger can add Combat Pool to vehicle gunnery** (SR3 p.152, p.154, p.157). Only Control Pool was offered. A drone run from the deck still gets no pools.
- **Vehicle armour is hardened against the attack's own Power** (SR3 p.132, p.149): the burst or full-auto bonus no longer counts when deciding whether the armour stops a hit completely.
- **Aircraft have a stall speed** (SR3 p.132). Speed is the maximum safe speed; dropping below the stall speed in a chase or a braking test warns and offers a Crash Test (Rigger 3), never applied. 29 aircraft carry both numbers.

### Item and vehicle data

- **DocWagon Paramedic** (contact) carries a Rating 5 medkit (*Mr. Johnson's Little Black Book* p.65), not Rating 3.
- **Generic Surveillance Drone** costs 8,125¥, Street Index 1 (SR3 p.312). A misspelt duplicate "Dalmation" drone is gone; owned copies are renamed to the Dalmatian and given its stats.
- **Hughes WK-2 Stallion** Cargo 72 and **Northrup Wasp** Load 68 (SR3 p.310–311). The **Chrysler-Nissan G12A passenger** variant is added (57,000¥), and both G12As are Availability 3/72 hrs (p.311).
- **Imaging scopes** are two items, Low-Light and Thermographic (SR3 p.282).
- **Ruled — Rigger 3 Revised wins where it reprices vehicle gear:** the DocWagon Osprey II stays at 935,000¥ (the core book says 331,000¥), rigger adaptation at 2,800¥ (core 2,500¥), and the small turret and mini-turret at CF 8 and 7 (core 7 and 6).

### Known differences from the book

- **A pedestrian may dodge a vehicle** (house rule — the book gives no dodge). It is optional and labelled on the card; the dodge must beat the Ramming successes, or 1 in an accident. The GM can change the number or skip the dodge.
- **Spare clips still fit any gun that takes them** (house rule; SR3 p.281 says they don't). TODO 203.
- **Whether a stock or tripod is in use is the shooter's tick**, remembered per gun — the book gives no rule for it. Accessories as mounted items are TODO 235.
- **Not modelled yet** (each has a TODO): shooting a barrier with APDS, explosive or flechette rounds (TODO 209); off-road Handling (227); Pain Resistance against torture (226); the Shock Glove's charges (239); Magic Loss from drugs or astral disruption (236).

### New

- **📒 Ledger tab.** Every Karma and nuyen entry is on its own tab, and Bio shows the latest 8. The GM can delete a line.
- **± Funds** beside Nuyen: add or take away money, with an optional reason for the Ledger, or **give money to another player character**. A gift can't be more than you have, or zero or negative, and both Ledgers record it.
- **Combat Pool breakdown.** Hover the Combat Pool to see where it comes from: base, Combat Sense, the manual modifier, armour (p.285), a gyro halving it (p.282, naming the item), and what is spent.
- **👁 Concealment** (GM). Lists what a character carries that can be seen, least concealed first, and posts it to chat. A 🔍 Perception Test checks against an item's Concealability (p.45, p.231), or for a search against the Concealability plus the Physical Search Modifiers Table (p.236–237).
- **🛒 Buy gear** can search the gear compendiums, or take an item dragged in from one. It respects the source-book filter; an item from a switched-off book is warned about but still filled in.
- **The action tracker reads "Complex or two Simples, + Free"**, which is the rule (p.105, p.107). It was read as three actions.
- **The healing patient list** puts player characters first and hostile NPCs last.
- **A new GM-only compendium, *The Sixth World after October 2059*,** holds what the books place after the campaign's date. It is hidden from players, but anyone can read it from the console or on GitHub.

### Fixes

- **Full Defense** could post its auto-commit card and roll the dodge twice. It now happens once.
- **Typing a Combat Pool total with a gyro worn** stored the wrong modifier: typing 4 on a pool of 5 showed 3.
- **Chunky Salsa** showed Power 10 and S instead of the grenade's own.
- **Healing** couldn't target a downed NPC token.
- **🧹 Clear blast marker** was black on black.
- **The character importer** took Good Karma before spending, re-granted Karma Pool on the next award, brought burned Karma Pool back, and dropped bought Power Points.

### Guides

- New pages: **Physical Adepts, Spells, How to Initiate, Weapons, Vehicles and Drones**, and **Karma**.
- The **World** section — megacorporations, politics and security, the underworld — now describes October 2059, and there is a **combat medic** page.
- Corrections from the rules check: a stabilization unit stabilizes automatically and gives −2 on healing tests (SR3 p.305, it was described as the antidote patch); Ready Weapon is SR3 p.107; only Dassurn and Microdeck are said to hire runners; Brackhaven Investments' seat on the UCC is Norman Jones's; the books run into 2060, not 2061; the initiate's Astral Pool and a limit taken off Drain are now tracked by the system.

## 0.6.3 — 2026-09-28

A bug-fix release: dump shock for riggers and deckers, rigger damage from a wrecked vehicle, natural armour in astral combat, flechette against dermal armour, and the Matrix Defragged IC list.

### Before you upgrade

- **Fully restart Foundry** after updating, not just refresh the browser: characters and NPCs have a new *Natural armor (astral)* field.

### Rules that now resolve differently

**Dump shock**

- **A rigger's dump shock follows the rigger rules** (SR3 p.156). The ⚡ Dumpshock dialog now asks what the character was dumped from. A rigger dumped from a remote-control network resists **(RC deck Rating + 4)S Stun**, and one jacked out of a vehicle resists **5S Stun**. Both are resisted with **Willpower**, with no armour. The card states the **+2 to all Success Tests for ten Combat Turns** of disorientation, and offers the **Willpower (4) Test** that shortens it; its result says how many turns it lasts. There is a new *Dump Shock* button in the character sheet's rigger panel. Before, a rigger was treated as a decker: the Power came from a host, the track from the Matrix mode, and the roll was Body.
- **Every dump shock is resisted with Willpower, and worn armour doesn't count.** Neither SR3 p.227 nor Matrix Defragged p.27 says which attribute resists a decker's dump shock; only the rigger rule does (p.156). **House ruling:** Willpower for deckers too, since it's a mental shock, and no armour, since it comes through the jack. Before, deckers rolled Body, and their worn armour lowered the target number.
- **Orthodox (SR3 core) dump shock uses the book's table** (SR3 p.226–227). It is always **Stun**, the Power is the host's Security Value, and the level comes from the host's Security Code: **Blue Light, Green Moderate, Orange Serious, Red Deadly**. That is the Dump Shock Damage Levels table, not the IC damage table next to it. This applies both when a deck crashes and to the ⚡ Dumpshock button, which the Orthodox Matrix tab now has too. Before, both used the Matrix Defragged rule: always Serious, and Physical in VR-Hot. Matrix Defragged dump shock is unchanged: Serious, Power = System Rating, track by user mode (MDF p.27).

**Rigging**

- **Ramming: the rammer's successes cut its own Power, not its damage level** (SR3 p.143, worked on p.147). The rammer resists the collision's Power minus its vehicle's Body × its Ramming successes, never below 2, at the full Damage Level. The rammed vehicle's damage is not reduced. A Ramming Test with no successes now misses. Before, the rammer's level dropped one step per two successes and its TN stayed at the full Power, so the book's Mach 6 (5 successes) resisted 15L against TN 15 instead of 2S against TN 2.
- **Hiding in Open terrain is +4** (Hiding Target Modifiers Table, SR3 p.144). It was +1.
- **Fleeing several vehicles adds +1 per additional vehicle, with no cap** (SR3 p.142). The Accelerating/Braking dialog now takes a number of vehicles; its dropdown stopped at +2.
- **A rigger takes damage when their vehicle is badly hurt** (SR3 p.145). When a vehicle a rigger is jacked into (VCR) reaches **Serious**, a card offers the rigger **6M Physical**. If it's **destroyed**, the card offers **6S**. The roll is Willpower, with no Combat or Control Pool and no armour. Nothing is applied automatically: the rigger rolls, and the wound goes on when someone clicks 🩸 Assign. Before, nothing offered this roll.

**The Matrix**

- **Matrix Defragged Hacking Pool is Intelligence + MPCP ÷ 3 (round down)** (MDF p.11). The system used SR3 core's (Intelligence + MPCP) ÷ 3, so a decker with Intelligence 4 and MPCP 8 had 4 dice instead of 6. The Orthodox pool is unchanged; SR3 core's formula is right for it.
- **The Matrix Condition Monitor penalises from the first box** (MDF p.12): +1 TN from box 1, +2 from box 3, +3 from box 6, +4 at box 10. It was +1 from box 3, +2 from 6, +3 from 8.
- **Orthodox hosts keep the passive alert's +2 to every subsystem at active alert** (SR3 p.211). It dropped back to +0 at active alert.
- **Reboot Node no longer adds Overwatch when it fails** (MDF p.19). The book gives it no such line.

**Combat and magic**

- **Dermal armour takes a level off an `(f)` weapon** (SR3 p.116: *"Dermal armor negates the Damage Level increase of flechette ammunition"*). A weapon whose Damage Code has the `(f)` note already includes flechette's level increase, so against a target with dermal armour (a troll's hide, dermal plating, a dermal sheath), its damage drops one level, and the card says why. **House ruling:** this is for dermal armour only. An `(f)` weapon against worn armour keeps its code. Before, the card left this to the GM.
- **A dual being's natural armour protects in astral combat** (SR3 p.175: *"the Power of the attack is reduced by the target's natural armor"*). Set a critter's Armor power in the new **Natural armor (astral)** field (Magic tab, Astral). The astral resist card takes it off the Power for a dual being, on top of Mystic Armor, and names it on the card. An actor on the Astral Plane gets no deduction. Worn armour still never counts, and a troll's dermal armour is already in its Body.

### Known differences from the book

- **Spare clips fit any gun that takes them** (house rule). SR3 p.281 says a spare clip holds its weapon's capacity and is *"not interchangeable from weapon to weapon even within the same class"*. The system lets a clip go into any gun with the same loading mechanism. Tracked as TODO 203 to be fixed properly.

### Fixes

- **Matrix Defragged IC sheet:** five agents were listed under the wrong IC grade. They now follow MDF p.34's *Available Agents* table.
- **Dumpshock dialog:** choosing a host now sets the Power. The typed default of 6 used to override it.

## 0.6.2 — 2026-09-26

A bug-fix release, mostly from the 2026-09-23 trial session: ammunition and clips, weapons that start put away, implanted weapons you can actually use, a wound that could be assigned twice, and ↺ Undo on the first press. Two rules now resolve differently: spells take cover and visibility, and dual beings resist astral damage with Body.

### Before you upgrade

- **Fully restart Foundry** after updating, not just refresh the browser: ammunition items have new fields.
- **One change is applied automatically** the first time a GM loads the world: clips that were stored as a count of rounds become clips again (see *Ammunition* below). A count that doesn't divide evenly into clips stays as loose rounds.

### Rules that now resolve differently

- **Spells take cover and visibility** (SR3 p.182: *"If the caster has trouble seeing the target due to cover and visibility modifiers (p. 232), the target number of the spell increases"*; p.183 for elemental spells). Casting a spell now opens the GM's target-number window, the same one a ranged attack uses, after targets are picked and before the Spell Pool is committed. The GM's change applies to the roll and to every target. An elemental area spell has no Target row, because its blast reaches people behind cover (p.182); any other area spell keeps it, because it only affects targets the caster can see. Touch and personal spells never ask (p.182). Before, no spell asked, so a Manabolt at someone behind cover was cast at the plain TN.
- **Dual beings resist astral damage with Body, plus Combat Pool** (SR3 p.174–175: *"Willpower or Force for astral beings, or Body for dual beings"*). The astral resist card used to offer Willpower to everyone. Now only an actor set to **Astral Plane** resists with Willpower (a spirit with its Force). Anyone else caught in astral combat, such as an astrally perceiving mage or a materialized spirit, rolls Body and may add Combat Pool. The pool is still editable on the card.
- **A grenade launcher fires its loaded mini-grenade** (SR3 p.119, p.283). The Damage Code, blast and area now come from the round, so a Defensive mini-grenade falls off at −1 per half metre instead of −1 per metre. A shot also spends a round, which it never did. Under 5 metres, the dialog warns that a mini-grenade doesn't arm (p.118); it is a warning, not a refusal.

### Ammunition

- **Loose rounds are shown as loose.** Rounds taken out of a gun and boxes of rounds used to read as *Removable Clip*, so unloaded rounds looked like they came back as full clips.
- **⏏ Unload** empties a gun into loose rounds. It charges a Remove Clip action (SR3 p.107) for a clip or drum, and nothing where the book names no action.
- **Old clips are converted.** The clip conversion was added to the 0.5.2 migration a few hours after that number was first used, so a world loaded in between was marked as done and never ran it, so its clips were counted as individual rounds and a reload topped the gun up round by round. 0.6.2 runs the conversion again.
- **Eight mini-grenades** ship in *SR3 Ammunition*, built from the Explosives Table's Mini-grenade row (SR3 p.283). A launcher is only offered mini-grenades. Loading a different grenade puts the old rounds back into their own box.

### Fixes

- **New characters start with nothing in hand.** A weapon added to a character or NPC now arrives put away, and new armour arrives not worn. Before, a new character started with every weapon drawn, and a character with grenades always seemed to be holding one. Implanted weapons, cyberguns and vehicle mounts are exempt.
- **Implanted weapons can attack.** Installing a cyberweapon now adds its melee or firearm entry, with cybergun stats from M&M p.41; removing it removes the weapon. Implants installed before this are offered on the Weapons tab. Body weapons appear in the attack picker without being equipped.
- **A wound is assigned once.** The damage card's *Assign the wound* could add the boxes a second time from the GM's copy of the card, or after a reload. The GM now records it on the card, and every copy shows it as spent.
- **↺ Undo works on the first press.** An action that charges twice, like Ready Weapon then Fire, or Remove Clip then Insert Clip, needed two presses to put everything back.
- **The GM's second Simple Action button lights up** once two Simple Actions are taken. Ending the turn stays the GM's click, so ↺ Undo can still reach the phase.
- **Restocking a medkit happens when shopping.** The healing card no longer offers a one-click restock mid-combat. Buy gear lists your empty kits and pre-fills Medkit Supplies (SR3 p.304), and paying refills the first empty kit.
- The 🩹 Healing button stays in place when a character is hurt. The wound text now comes after it.
- The soak result on the resist card is a grey note, so it no longer looks like a button.
- **Guides:** the Decker hiring page listed every stock cyberdeck one price row off. It now matches the book and the shipped deck items (SR3 p.207): Allegiance Sigma 14,000¥ up to Novatech Slimcase-10 960,000¥.

### Modules

- The system now **recommends the Security Cameras module**. It's optional; the README explains what it's for.

### Known differences from the book

- **A dual-natured critter's natural armour** (the Armor power) should reduce the Power of astral attacks (SR3 p.175). There's no field for it yet, so the GM lowers the TN on the card. Tracked as TODO 177.

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

### New at the table

- **⏳ Waiting on…** — the combat tracker lists every combat step still waiting on someone (a soak, a dodge, a Drain, a Knockdown, assigning a wound…) and who owes it. Click a row to jump to its card; the GM can ✕ a step nobody is going to take.
- **A card waiting on you** gets a gold edge and says so, and the chat tab shows how many are waiting on you.
- **Finished cards fold** to their header once every step on them is done and play has moved on (two newer messages below it), so the latest exchange always stays readable. Click the header to open one. Turn it off under Configure Settings → *Collapse finished combat cards*.
- A step already taken stays greyed out after a reload, on every screen.

### Content

- The SR3 core grenades are now in `sr3e-sr3-projectiles`, and the core explosives carry the Explosives Table's Blast and Legal columns (SR3 p.283).
- **The SR2 compendium packs are no longer shipped** (25 packs, parked in `archive/sr2`) until they are fixed. Characters already holding SR2 items keep them; only the compendium entries are gone, and the Edition setting offers SR3 only.
- Broken `_id: null` entries left in packs by older builds are removed on load (GM only, only when a good copy exists).

### Fixes

- **Grenades respect walls** (reported in play). A grenade thrown at a point behind a wall drops at the wall, and scatter stops at a wall; an open door lets it through. Anyone with a wall between them and the blast is **not** caught. The card lists them with the Power that reaches the wall, and gives the GM a **🧱 the wall fell** button: pick the Barrier Rating (the book's tables are in its tooltip) and they resist at Power − Barrier Rating (SR3 p.119, p.124).
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
