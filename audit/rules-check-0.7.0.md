# Rules check v0.7.0 — code vs `guides/`, PDFs as authority (TODO 121)

**Status: COMPLETE — all 2974 units of 38 guide pages resolved, and every quote and code location re-verified by `tools/rules-ledger.mjs check`.**

Book text: the OCR text (Shadowrun-OCR). 315 quote(s) matched word by word only (tables in the OCR layout run across rows); `check` lists them as LOOSE.

Generated from `audit/rules-ledger-0.7.0.json`. Regenerate; do not hand-edit. A complete record proves the ledger is
fully evidenced — it does not prove the evidence was read correctly. Every `diverges` and every `unverifiable`
below is the maintainer's to decide.

| Verdict | Units |
| :--- | ---: |
| match | 1379 |
| diverges | 19 |
| guide-differs | 0 |
| not-implemented | 453 |
| unverifiable | 262 |
| no-rule-claim | 861 |
| unchecked | 0 |

## Code diverges from the book (19)

### magic/physical-adepts.md#15

Guide: Every full point of Essence lost, or fraction of one, costs a point of

> "the Magic attribute, one point for every full point of Essence, or" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.160
> "If the total is less than or equal to your Magic Attribute, it drops" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.160
> "A roll of 2 always indicates the loss of a Magic point." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.160

Code: `scripts/documents/SR3EActor.js:2505`, `scripts/data/magic-loss.mjs:16`, `scripts/SR3EHealing.js:189`

Essence: effective Magic is capped at floor(Essence), so Essence 5.8 with Magic 5 loses a point only below 5 - matches. Fixed in 0.7.0 (7d191b2b): "A roll of 2 always indicates the loss of a Magic point" is now coded (MagicLoss.lost). STILL OPEN: the Magic Loss check exists only in the guided healing flow (Deadly wound, untreated Awakened patient); drugs, disruption in astral combat and totem-path failures call for a check in the book (p.160) but the code never rolls one.

### magic/physical-adepts.md#74

Guide: Subtract the level from your damage **before** looking up the injury

> "Pain Resistance works equally on both the" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.170
> "Pain Resistance also allows you to resist pain from torture," — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.170

Code: `scripts/documents/SR3EActor.js:7723`, `scripts/documents/SR3EActor.js:2304`

Wound-modifier offset on both Condition Monitors is coded (boxes stay). The book's second use - "The level is subtracted from your target numbers to resist pain" (torture, painful disease, interrogation) - has no code; painResistance is read only for the wound lookup.

### magic/spellcasting.md#51

Guide: To affect an object at all, the spell's **Force must be at least half its

> "The Force of the spell must be equal to or greater than half the Object Resistance, rounded down, for it to affect an object" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.182
> "Consult the Object Resistance Table for examples of objects and materials" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.182

Code: `scripts/data/spell-target.mjs:128`, `scripts/data/spell-target.mjs:201`

Force must be at least half the Object Resistance, rounded down: coded (objectMinForce) and warned on the cast card, not refused (0.7.0, 742bb050). NOT coded: "Vehicles add Body and half armor to object resistance before dividing in half" - for a vehicle target the code halves the bare table row and only prints a reminder that the vehicle adds Body and half Armor. The cast TN is likewise the bare row.

### rules/drones.md#12

Guide: | **Primary drone** | The rigger **jumps in**: controls it as if jacked directly into it. Only **one** at a time. | The rigger's skills, plus **Combat and Control Pool**, and every rigger bonus. |

> "A rigger may operate only one drone in his or her network in primary mode." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.154
> "The rigger may use Combat and Control Pool dice when making tests for the drone" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.154

Code: `scripts/data/rigging.mjs:64`, `scripts/documents/SR3EItem.js:1790`, `scripts/data/rigging.mjs:78`, `scripts/sheets/SR3EActorSheet.js:5179`

Fixed in part in 0.7.0 (f9784e58): a jumped-in rigger can now add Combat Pool dice (charged through spendCombatPool) to drone gunnery, as SR3 p.154 / p.152 give, alongside Control Pool. STILL OPEN: the one-primary-drone limit is enforced only on the actor sheet path (the vehicle sheet's VCR button does not enforce it).

### rules/drones.md#66

Guide: While jumped in, the rigger can only fire weapons on the primary drone, and

> "Riggers operating through a cybernetic link can use their Combat Pool dice only with the primary drone." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.157

Code: `scripts/data/rigging.mjs:78`, `scripts/data/rigging.mjs:64`, `scripts/documents/SR3EItem.js:1790`

Fixed in part in 0.7.0 (f9784e58): Combat Pool goes only to the rigger who rolls as a jumped-in rigger (droneTestRoller = rigger); a secondary or Pilot-rolled drone gets none (SR3 p.157). STILL OPEN: "can only fire weapons on the primary drone" is not enforced (a warn-never-refuse system).

### rules/reloading.md#34

Guide: The book doesn't say what happens to the rounds left in a removed clip.

> "They hold the maximum rounds available for the weapon, and are not interchangeable from weapon to weapon even within the same class" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.281

Code: `packs-src/sr3e-sr3-gear/spare-clip.27d3735181b12497.json:21`, `scripts/data/ammo-stock.mjs:152`

The 5¥ cost matches (a generic 'Spare Clip' gear item at cost 5), but it is not functionally linked to the reload system — nothing ties it to a specific gun's capacity. The 'not interchangeable from weapon to weapon even within the same class' restriction is not modelled: AmmoStock.fits() matches any reload of the same loading mechanism to any gun taking that mechanism, deliberately (see #35's house-rule note, which documents this as the table's simplification). Ruled a HOUSE RULE for now by the maintainer, 2026-09-28; to be fixed properly as TODO 203.

### rules/vehicles.md#7

Guide: | **Handling** | The base TN for Driving Tests, so **lower is better**. Most ground vehicles show two: **on road / off road**, as in 3/8. |

> "The Handling Rating functions as the base target number for all Driving Tests that use a Vehicle Skill" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.130
> "higher the rating, the more difficult a vehicle is to control" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.130
> "the first represents the vehicle's Handling on a road, the second its Handling in off-road terrain" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.130

Code: `scripts/sheets/SR3EVehicleSheet.js:1117`, `scripts/SR3EVehicleChase.js:846`, `scripts/data/ActorDataModels.js:521`

Book (p.130): Handling is the base TN for every Driving Test; most ground vehicles have two ratings, the second used "in off-road terrain", and a ground vehicle off-road also halves its Speed. Code: the compendium vehicles carry both numbers (`handling`, `handlingOffRoad`) and the guide row is right, but every Driving Test, chase action and Crash Test reads only `handling.base` (SR3EVehicleSheet.js:1110, SR3EVehicleChase.js:817); `handlingOffRoad` is read nowhere in scripts/ (only declared in the data model and the character importer). So the off-road Handling is never used as the base TN, and the off-road Speed halving is not applied either.

### rules/weapons.md#65

Guide: - **Guns of one class share ammunition**: every light pistol can use any

> "kind of gun can trade ammo with another of its class." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.279
> "Shotguns, whether pistols or rifles, can share ammo." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.279

Code: `scripts/data/ammo-stock.mjs:61`, `scripts/data/ammo-stock.mjs:66`, `scripts/data/ammo-stock.mjs:168`

Class sharing is implemented (AmmoStock.classFits, keyed on the weapon's category). But "shotguns, whether pistols or rifles, can share ammo": the class list labels ShtG "Shotgun (pistol or rifle)" and CLASS_ALIASES folds MPist/MaPist/VHP/LCarb/Carb, yet nothing folds a shotgun pistol into ShtG. The shipped Remington Roomsweeper (the book's shotgun pistol) is category HPist, so it counts as a heavy pistol and would not take shotgun ammunition stamped ShtG.

### rules/weapons.md#94

Guide: | **APDS** | **Halves** (round down) armor's Ballistic rating and Barrier Ratings. Normal ammo against vehicles and drones. |

> "APDS halves (round down) the Ballistic Rating of armor or the Barrier Rating of an object in any attack." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.116
> "normal ammunition against vehicles and drones." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.116

Code: `scripts/config.js:1544`, `scripts/documents/SR3EActor.js:9558`, `scripts/data/apds.mjs:8`

Fixed in part in 0.7.0 (43cb7395): APDS is now treated as normal ammunition against vehicles and drones (Apds.resolve), and still halves a person's Ballistic rating (round down). STILL OPEN: the Barrier Rating is never halved - the weapon flow has no barrier handling (TODO 209).

### rules/weapons.md#95

Guide: | **Explosive** | **+1 Power**. Through a barrier: TN is twice the Barrier Rating, and the barrier takes damage as if at half. **Misfires** when every die rolls a 1: the shooter is hit by the weapon's normal damage, resisted without Combat Pool. |

> "Increase the Power Rating of any attack made with explosive rounds by 1." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.116
> "use twice the mate- rial's normal Barrier Rating as the target number for the attack; however, the barrier itself takes damage from a successful attack as if it had half its normal Barrier Rating." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.116
> "Explosive rounds will misfire whenever all the dice rolled for the attack test come up 1." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.116

Code: `scripts/config.js:1541`, `scripts/data/misfire.mjs:10`, `scripts/documents/SR3EActor.js:3766`

Fixed in part in 0.7.0 (20a9a236): +1 Power was already coded; the misfire is now coded - when every die is a 1 the shot misses and the shooter is offered the weapon's normal damage, resisted without Combat Pool (Misfire). STILL OPEN: the barrier rules (TN twice the Barrier Rating, the barrier taking damage as at half) - TODO 209.

### rules/weapons.md#96

Guide: | **EX Explosive** | **+2 Power**, otherwise as explosive. |

> "EX Explosive rounds adds +2 to the power of the weapon." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.116
> "It follows all other standard explosive rounds rules." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.116

Code: `scripts/config.js:1542`, `scripts/data/misfire.mjs:10`

+2 Power is coded and the misfire rule is inherited (0.7.0, 20a9a236). STILL OPEN: the barrier rules (TODO 209).

### rules/weapons.md#97

Guide: | **Flechette** | **+1 Damage Level** against unarmored targets. Against armor, use **double Impact or Ballistic, whichever is higher**. Double Barrier Ratings and vehicle armor. Dermal armor cancels the level increase. |

> "Against unarmored targets, flechette rounds increase their Damage Codes by one level." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.116
> "Armor Rating, use either double its Impact Armor Rating or its normal Ballistic Armor Rating, whichever is higher. Double the Barrier Rating of any barriers fired at or through" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.116
> "Dermal armor negates the Damage Level increase of flechette ammunition." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.116

Code: `scripts/documents/SR3EActor.js:8119`, `scripts/documents/SR3EActor.js:5427`, `scripts/documents/SR3EActor.js:8135`

Implemented: +1 level against the unarmoured, the double-Impact-or-Ballistic armour rule (a vehicle's Armor is both, so it doubles), dermal armour negating the increase. Not implemented: doubling Barrier Ratings (no barrier handling in the weapon flow). (Tracked as TODO 209.)

### rules/weapons.md#169

Guide: | Ares Viper Slivergun | 6 | 30 (c) | SA/BF | 9S(f) | — | 600¥ | 6P-E |

> "Ares Viper Slivergun 6 30 (c) SA/BF 9S(f)" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.278
> "Ares Predator 5 15 (c) SA 9M 2.25 3/24 hrs 450� .5 6P-E -- Ares Viper Slivergun 6 30 (c) SA/BF 9S(f) 2 3/48 hrs 600� 1 6P-E --" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.278

Code: `packs-src/sr3e-sr3-firearms/ares-viper-slivergun.sr3e-firearm-0077.json:12`, `packs-src/sr3e-sr3-firearms/ares-viper-slivergun.sr3e-firearm-0077.json:13`, `packs-src/sr3e-sr3-firearms/ares-viper-slivergun.sr3e-firearm-0077.json:14`, `packs-src/sr3e-sr3-firearms/ares-viper-slivergun.sr3e-firearm-0077.json:15`, `packs-src/sr3e-sr3-firearms/ares-viper-slivergun.sr3e-firearm-0077.json:19`

The maintainer ruled (0.7.0, 05768a3a) that the Firing Mode Table (p.117) wins over the Firearms tables, so the pack now carries the table's mode. The Firearms table (p.278-279) row prints SA/BF for the Ares Viper Slivergun (pack SA); the pack now carries the Firing Mode Table's mode, so it differs from this weapon row.

### rules/weapons.md#174

Guide: | Defiance Super Shock | 4 | 4 (m) | SA | 10S Stun | — | 1,000¥ | 6P-E |

> "Defiance Super Shock 4 4 (m) SA 10S Stun 2" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.278
> "Special Weapons Defiance Super Shock 4 4 (m) SA 10S Stun 2 5/24 hrs 1,000� 1 6P-E --" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.278

Code: `packs-src/sr3e-sr3-firearms/defiance-super-shock.sr3e-firearm-0642.json:12`, `packs-src/sr3e-sr3-firearms/defiance-super-shock.sr3e-firearm-0642.json:13`, `packs-src/sr3e-sr3-firearms/defiance-super-shock.sr3e-firearm-0642.json:14`, `packs-src/sr3e-sr3-firearms/defiance-super-shock.sr3e-firearm-0642.json:15`, `packs-src/sr3e-sr3-firearms/defiance-super-shock.sr3e-firearm-0642.json:18`

The maintainer ruled (0.7.0, 05768a3a) that the Firing Mode Table (p.117) wins over the Firearms tables, so the pack now carries the table's mode. The Firearms table (p.278-279) row prints SA for the Defiance Super Shock (pack SS, the Taser mode); the pack now carries the Firing Mode Table's mode, so it differs from this weapon row.

### rules/weapons.md#176

Guide: | AK-97 SMG/Carbine | 4 | 30 (c) | SA/BF/FA | 6M | (1) | 800¥ | 4-G |

> "AK-97 SMG/Carbine 4 30 (c) SA/BF/FA 6M" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.278
> "SUBMACHINE GUNS AK-97 SMG/Carbine 4 30 (c) SA/BF/FA 6M 4 5/3 days 800� 1 4-G (1)" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.278

Code: `packs-src/sr3e-sr3-firearms/ak-97-smg-carbine.sr3e-firearm-0656.json:12`, `packs-src/sr3e-sr3-firearms/ak-97-smg-carbine.sr3e-firearm-0656.json:13`, `packs-src/sr3e-sr3-firearms/ak-97-smg-carbine.sr3e-firearm-0656.json:14`, `packs-src/sr3e-sr3-firearms/ak-97-smg-carbine.sr3e-firearm-0656.json:15`, `packs-src/sr3e-sr3-firearms/ak-97-smg-carbine.sr3e-firearm-0656.json:18`

The maintainer ruled (0.7.0, 05768a3a) that the Firing Mode Table (p.117) wins over the Firearms tables, so the pack now carries the table's mode. The Firearms table (p.278-279) row prints SA/BF/FA for the AK-97 SMG/Carbine (pack SA/BF); the pack now carries the Firing Mode Table's mode, so it differs from this weapon row.

### rules/weapons.md#177

Guide: | Heckler & Koch HK227 | 4 | 28 (c) | SA/BF/FA | 7M | 2(3) | 1,500¥ | 4-G |

> "Heckler & Koch HK227 4 28 (c) SA/BF/FA 7M" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.278
> "AK-97 SMG/Carbine 4 30 (c) SA/BF/FA 6M 4 5/3 days 800� 1 4-G (1) Heckler & Koch HK227 4 28 (c) SA/BF/FA 7M 4 4/24 hrs 1,500� .75 4-G 2(3)" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.278

Code: `packs-src/sr3e-sr3-firearms/heckler-koch-hk227.sr3e-firearm-0683.json:12`, `packs-src/sr3e-sr3-firearms/heckler-koch-hk227.sr3e-firearm-0683.json:13`, `packs-src/sr3e-sr3-firearms/heckler-koch-hk227.sr3e-firearm-0683.json:14`, `packs-src/sr3e-sr3-firearms/heckler-koch-hk227.sr3e-firearm-0683.json:15`, `packs-src/sr3e-sr3-firearms/heckler-koch-hk227.sr3e-firearm-0683.json:18`

The maintainer ruled (0.7.0, 05768a3a) that the Firing Mode Table (p.117) wins over the Firearms tables, so the pack now carries the table's mode. The Firearms table (p.278-279) row prints SA/BF/FA for the HK227 (pack SA/BF); the pack now carries the Firing Mode Table's mode, so it differs from this weapon row.

### rules/weapons.md#179

Guide: | Ingram Smartgun | 5 | 32 (c) | BF/FA | 7M | 2(3) | 950¥ | 4-G |

> "Ingram Smartgun 5 32 (c) BF/FA 7M" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.278
> "HK227-S 5 28 (c) SA/BF 7M 3 10/7 days 1,200� 2 3-G (1) Ingram Smartgun 5 32 (c) BF/FA 7M 3 4/24 hrs 950� 1 4-G 2(3)" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.278

Code: `packs-src/sr3e-sr3-firearms/ingram-smartgun-mod-20t.sr3e-firearm-0688.json:12`, `packs-src/sr3e-sr3-firearms/ingram-smartgun-mod-20t.sr3e-firearm-0688.json:13`, `packs-src/sr3e-sr3-firearms/ingram-smartgun-mod-20t.sr3e-firearm-0688.json:14`, `packs-src/sr3e-sr3-firearms/ingram-smartgun-mod-20t.sr3e-firearm-0688.json:15`, `packs-src/sr3e-sr3-firearms/ingram-smartgun-mod-20t.sr3e-firearm-0688.json:18`

The maintainer ruled (0.7.0, 05768a3a) that the Firing Mode Table (p.117) wins over the Firearms tables, so the pack now carries the table's mode. The Firearms table (p.278-279) row prints BF/FA for the Ingram Smartgun (pack SA/BF); the pack now carries the Firing Mode Table's mode, so it differs from this weapon row.

### rules/weapons.md#180

Guide: | Uzi III | 5 | 24 (c) | BF | 6M | (1) | 600¥ | 4-G |

> "Uzi III 5 24 (c) BF 6M RIFLES 3 5 (m) SA 7S" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.278
> "Ingram Smartgun 5 32 (c) BF/FA 7M 3 4/24 hrs 950� 1 4-G 2(3) Uzi III 5 24 (c) BF 6M 2 4/24 hrs 600� .75 4-G (1)" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.278

Code: `packs-src/sr3e-sr3-firearms/uzi-iii.sr3e-firearm-0704.json:12`, `packs-src/sr3e-sr3-firearms/uzi-iii.sr3e-firearm-0704.json:13`, `packs-src/sr3e-sr3-firearms/uzi-iii.sr3e-firearm-0704.json:14`, `packs-src/sr3e-sr3-firearms/uzi-iii.sr3e-firearm-0704.json:15`, `packs-src/sr3e-sr3-firearms/uzi-iii.sr3e-firearm-0704.json:18`

The maintainer ruled (0.7.0, 05768a3a) that the Firing Mode Table (p.117) wins over the Firearms tables, so the pack now carries the table's mode. The Firearms table (p.278-279) row prints BF for the Uzi III (pack SA/BF); the pack now carries the Firing Mode Table's mode, so it differs from this weapon row.

### rules/weapons.md#201

Guide: | Ingram Valiant LMG | 50 (c)/Belt | BF/FA | 7S | 3 | 1,500¥ | 1-H |

> "Ingram Valiant -- 50 (c)/Belt BF/FA 7S 9 6/5 days 1,500� 2 1-H 3" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.279

Code: `packs-src/sr3e-sr3-firearms/ingram-valiant.sr3e-firearm-1134.json:13`, `packs-src/sr3e-sr3-firearms/ingram-valiant.sr3e-firearm-1134.json:14`, `packs-src/sr3e-sr3-firearms/ingram-valiant.sr3e-firearm-1134.json:15`, `packs-src/sr3e-sr3-firearms/ingram-valiant.sr3e-firearm-1134.json:18`

The maintainer ruled (0.7.0, 05768a3a) that the Firing Mode Table (p.117) wins over the Firearms tables, so the pack now carries the table's mode. The Firearms table (p.278-279) row prints BF/FA for the Ingram Valiant LMG (pack FA); the pack now carries the Firing Mode Table's mode, so it differs from this weapon row.


## Real rules the code does not implement (453)

### hiring/combat-mage.md#3

Guide: {: .fixed }

> "The summoning ritual also requires special ritual materials, available from a talismonger for approximately" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.186

Searched: `/focus addiction|focusAddiction|[Cc]onjuring [Mm]aterials/` — no matches.

Errata callout. Focus addiction is a real MitS rule (printed p.45; the page's footer number is missing from its text layer so it cannot be recorded as evidence) and elemental conjuring materials cost about Force × 1,000¥ (SR3 p.186); neither is implemented. The Scenario C figure checks: 8,000 × 3 × 2 = 48,000.

### hiring/combat-mage.md#9

Guide: | **Ward maintenance** | about **100¥ an hour per magician** | SR3 p.174 |

> "They generally charge around 100 nuyen an hour (per magician)" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.174

Searched: `/ward maintenance|maintain(s|ing)? wards|100 nuyen an hour/` — no matches.

### hiring/combat-mage.md#10

Guide: | **Elemental conjuring materials** | **Force × 1,000¥** | SR3 p.186; MitS p.169 |

> "The summoning ritual also requires special ritual materials, available from a talismonger for approximately" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.186

Searched: `/[Cc]onjuring [Mm]aterials|ritual materials/` — no matches.

### hiring/decker.md#3

Guide: {: .fixed }

> "Green (average security), Orange (significant security), and Red (high security)" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.205
> "the decker must spend a Complex Action and make a successful Willpower (Black IC Rating) Test to jack out" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.230

Searched: `/label:\s*'Tar Pit'|tar_pit|lethal black|non-lethal black/` — no matches.

Errata callout. Security codes Blue/Green/Orange/Red plus unofficial 'UV' (printed p.205) is implemented for the Orthodox host sheet; blaster, sparky and tar pit are gray IC and black IC hurts the decker (pp.227-230) is not (the Orthodox IC sheet has no Tar Pit type and no black-IC handling — see rules/combat.md #146, #147).

### hiring/decker.md#10

Guide: - **Gray IC** (blaster, ripper, sparky, tar pit) damages the **deck** and

> "Gray IC programs attack a decker's cyberdeck and utilities" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.228

Searched: `/label:\s*'Tar Pit'|tar_pit|lethal black|non-lethal black/` — no matches.

### hiring/decker.md#11

Guide: - **Lethal black IC** damages the **decker**, at (IC Rating) **Moderate** on

> "the decker must spend a Complex Action and make a successful Willpower (Black IC Rating) Test to jack out" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.230
> "(IC Rating) Moderate for Blue and Green systems, (IC Rating) Serious for Orange and Red ones" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.230

Searched: `/lethal black|non-lethal black/` — no matches.

### hiring/face.md#8

Guide: | **Fencing** | the face's Negotiation moves the price **5% per net success** | SR3 p.238 |

> "Whichever side wins the Negotiation Test alters the price paid in his or her favor by 5 percent per extra success" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238

Searched: `/Finding a Fence|fenceBankroll|fencingFlow|Hustle It Along/` — no matches.

### hiring/face.md#10

Guide: A face earns their fee at the **Negotiation** table. Each net success is

> "Whichever side wins the Negotiation Test alters the price paid in his or her favor by 5 percent per extra success" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238

Searched: `/Finding a Fence|fenceBankroll|fencingFlow|Hustle It Along/` — no matches.

Fence deals are not built; buying-gear negotiation is (see #9). Mr. Johnson opening low is MJLBB p.20-21 guidance.

### hiring/face.md#13

Guide: | Fake ID, Rating 4 | 16,000¥ | SR3 p.239 |

> "Availability Rating/24 hours Rating/72 hours Rating/14 days Rating/30 days Street Index 1 1 1 1" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.239

Searched: `/credstick|criminal SIN|forged (credstick|ID)|fake SIN/` — no matches.

Rating 4: 4 × 4 × 1,000 = 16,000¥; Rating 6 (5-8 tier): 6 × 5,000 = 30,000¥ — arithmetic checks against the table; fake IDs are not modelled.

### hiring/face.md#14

Guide: | Fake ID, Rating 6 | 30,000¥ | SR3 p.239 |

> "Availability Rating/24 hours Rating/72 hours Rating/14 days Rating/30 days Street Index 1 1 1 1" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.239

Searched: `/credstick|criminal SIN|forged (credstick|ID)|fake SIN/` — no matches.

Rating 4: 4 × 4 × 1,000 = 16,000¥; Rating 6 (5-8 tier): 6 × 5,000 = 30,000¥ — arithmetic checks against the table; fake IDs are not modelled.

### hiring/face.md#15

Guide: | Permit (possess / possess and transport) | 5% / 10% of the item's price; needs a valid SIN | SR3 p.274 |

> "The price for a permit to possess is usually 5 percent of the item's price 10 percent for a permit to possess and transport" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.274

Searched: `/permit (test|cost)|Etiquette[^\n]*permit|possess and transport/` — no matches.

### hiring/index.md#11

Guide: ### Baseline Shadowrun Payment Table  *(SRComp p.100)*

> "BASELINE SHADOWRUN PAYMENT TABLE" — Shadowrun 3e - Shadowrun Companion {FASA7905} [no-text].pdf, printed p.100

Searched: `/bottom-line fee|baseline.{0,12}payment|Smuggling Run/` — no matches.

The Baseline Shadowrun Payment Table heading. Shadowrun Companion, printed p.100 (PDF p.101 of the scan). The scan is image-only and the OCR loses the shaded fee column, so the heading is the OCR evidence; the 13 rows and fees were read from the page images (SR-OCR/supplements, Shadowrun Companion - Payment and Reward) and the maintainer confirmed them against the book on 2026-09-26. The system has no payment table, so the guide states a book rule the code does not implement.

### hiring/index.md#13

Guide: | Assassination | 5,000¥ |

> "BASELINE SHADOWRUN PAYMENT TABLE" — Shadowrun 3e - Shadowrun Companion {FASA7905} [no-text].pdf, printed p.100

Searched: `/bottom-line fee|baseline.{0,12}payment|Smuggling Run/` — no matches.

Assassination 5,000¥ — a row of the Baseline Shadowrun Payment Table. Shadowrun Companion, printed p.100 (PDF p.101 of the scan). The scan is image-only and the OCR loses the shaded fee column, so the heading is the OCR evidence; the 13 rows and fees were read from the page images (SR-OCR/supplements, Shadowrun Companion - Payment and Reward) and the maintainer confirmed them against the book on 2026-09-26. The system has no payment table, so the guide states a book rule the code does not implement.

### hiring/index.md#51

Guide: | Ward maintenance (freelance or firm) | about 100¥ an hour, per magician | SR3 p.174 |

> "They generally charge around 100 nuyen an hour (per magician)" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.174

Searched: `/ward maintenance|maintain(s|ing)? wards|100 nuyen an hour/` — no matches.

### hiring/index.md#52

Guide: | Elemental conjuring materials | Force × 1,000¥ | SR3 p.186; MitS p.169 |

> "The summoning ritual also requires special ritual materials, available from a talismonger for approximately" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.186

Searched: `/[Cc]onjuring [Mm]aterials|ritual materials/` — no matches.

Elemental conjuring materials cost Force × 1,000¥ (SR3 p.186, and the Magical Gear Table on MitS p.169); conjuring materials are not tracked or priced in the system.

### hiring/index.md#56

Guide: | Fake ID, Rating 1–4 | Rating × Rating × 1,000¥ | SR3 p.239 |

> "Availability Rating/24 hours Rating/72 hours Rating/14 days Rating/30 days Street Index 1 1 1 1" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.239

Searched: `/credstick|criminal SIN|forged (credstick|ID)|fake SIN/` — no matches.

### hiring/index.md#71

Guide: | [Combat Mage](combat-mage/) | Security: 200¥ a day; destruction or assassination: 5,000¥ |

> "BASELINE SHADOWRUN PAYMENT TABLE" — Shadowrun 3e - Shadowrun Companion {FASA7905} [no-text].pdf, printed p.100

Searched: `/bottom-line fee|baseline.{0,12}payment|Smuggling Run/` — no matches.

Pairs Combat Mage with the Companion's Security 200¥/day and destruction/assassination 5,000¥ rows; the figures match the table, the pairing itself is the guide's judgement. Shadowrun Companion, printed p.100 (PDF p.101 of the scan). The scan is image-only and the OCR loses the shaded fee column, so the heading is the OCR evidence; the 13 rows and fees were read from the page images (SR-OCR/supplements, Shadowrun Companion - Payment and Reward) and the maintainer confirmed them against the book on 2026-09-26. The system has no payment table, so the guide states a book rule the code does not implement.

### hiring/index.md#73

Guide: | [Physical Adept](physical-adept/) | Bodyguard: 200¥ a day; assassination: 5,000¥ |

> "BASELINE SHADOWRUN PAYMENT TABLE" — Shadowrun 3e - Shadowrun Companion {FASA7905} [no-text].pdf, printed p.100

Searched: `/bottom-line fee|baseline.{0,12}payment|Smuggling Run/` — no matches.

Pairs Physical Adept with the Companion's Bodyguard 200¥/day and assassination 5,000¥ rows; the figures match the table, the pairing itself is the guide's judgement. Shadowrun Companion, printed p.100 (PDF p.101 of the scan). The scan is image-only and the OCR loses the shaded fee column, so the heading is the OCR evidence; the 13 rows and fees were read from the page images (SR-OCR/supplements, Shadowrun Companion - Payment and Reward) and the maintainer confirmed them against the book on 2026-09-26. The system has no payment table, so the guide states a book rule the code does not implement.

### hiring/infiltrator.md#11

Guide: - **Weapon detection**: MAD scanners are rated **1–4** hand-held and **4–9**

> "it makes a Rating (Concealability) Success Test" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.237
> "typically has a rating of 1 to 4 for hand-held models and 4 to 9 for architectural versions" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.237

Searched: `/MAD detector|MAD scanner|magnetic anomaly/` — no matches.

Rating 1-4 hand-held and 4-9 architectural MAD detectors, rolling the rating against the weapon's Concealability (printed p.237); the weapon-detection rules are not implemented. 0.7.0: TODO 195 added manual detection (a Perception Test against Concealability, scripts/data/concealment.mjs), not the MAD scanner's Rating (Concealability) Success Test.

### hiring/infiltrator.md#12

Guide: - **Cyberware scanners** are rated **3–9**, against TN **3**, or **6** for

> "Cyberware scanning systems generally are rated between 3 and 9" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.237
> "The target number for typical cyberware is 3, for alphaware it is 6" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.237

Searched: `/cyberware scan|scanner rating|cyberwareScan/` — no matches.

### hiring/shaman.md#3

Guide: {: .fixed }

> "There are four classes of nature spirits" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.266
> "Nature spirits vanish at sunrise and sunset, no matter what" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.186

Searched: `/sunrise|sunset/` — no matches.

Errata callout. Nature spirits come in four classes (Man, Land, Sky, Waters — printed p.266), can be summoned only in the spirit's domain (p.184) and vanish at sunrise and sunset (p.186), one service per Conjuring success (p.186). The system has some of the spirit types but does not enforce the domain or the sunrise/sunset limit (see magic/awakened-primer.md #21, #23). The Scenario C figure checks: 8,000 × 3 × (1 + .5 + 1) = 60,000.

### hiring/shaman.md#8

Guide: | **Ward maintenance** | about **100¥ an hour per magician** | SR3 p.174 |

> "They generally charge around 100 nuyen an hour (per magician)" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.174

Searched: `/ward maintenance|maintain(s|ing)? wards|100 nuyen an hour/` — no matches.

### hiring/shaman.md#11

Guide: - **No domain, no spirit.** A shaman inside a building can only summon a

> "A shaman cannot summon a spirit outside the spirit's domain" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.184

Searched: `/outside (the |its )?domain|not in (the |its )?domain|inDomain|currentDomain/` — no matches.

### hiring/shaman.md#13

Guide: - Nature spirits **disappear at sunrise and sunset**, taking their unused

> "Nature spirits vanish at sunrise and sunset, no matter what" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.186

Searched: `/sunrise|sunset/` — no matches.

### magic/awakened-primer.md#10

Guide: - **Casting** is a Complex Action: roll **Sorcery** plus up to as many

> "No more Spell Pool dice can be used than the number of Sorcery dice allocated to the test" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.180

Searched: `/magicDice\s*=\s*Math\.min\([^\n]*sorcery|min\([^\n]*sorceryDice[^\n]*availMagic/` — no matches.

Same two gaps as magic/spellcasting.md #7 and #43: the Spell Pool cap ('no more pool dice than Sorcery dice') and the Object Resistance Table are not implemented. Casting itself is a Complex Action and the Willpower/Body target numbers are.

### magic/awakened-primer.md#18

Guide: - You need a **conjuring library** and a **hermetic circle**, each rated at

> "The mage needs a Conjuring library and a hermetic circle of the correct type, both with ratings at least equal to the Force of the elemental to be summoned" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.186
> "The elemental also needs a source from which to materialize" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.186

Searched: `/[Cc]onjuring library|hermetic circle|ritual materials/` — no matches.

Summoning an elemental is a single Conjuring roll; the conjuring library, hermetic circle, ritual materials (≈1,000¥ × Force) and the material source are not tracked.

### magic/awakened-primer.md#19

Guide: - The elemental needs something to form from: a bonfire, a pool of water,

> "The mage needs a Conjuring library and a hermetic circle of the correct type, both with ratings at least equal to the Force of the elemental to be summoned" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.186
> "The elemental also needs a source from which to materialize" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.186

Searched: `/[Cc]onjuring library|hermetic circle|ritual materials/` — no matches.

Summoning an elemental is a single Conjuring roll; the conjuring library, hermetic circle, ritual materials (≈1,000¥ × Force) and the material source are not tracked.

### magic/awakened-primer.md#20

Guide: - An elemental can give five services: **Aid Sorcery, Aid Study, Spell

> "There are five types of services an elemental can perform: Aid Sorcery, Aid Study, Spell Sustaining, Physical Service, and Remote Service" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.187

Searched: `/Aid Sorcery|aidSorcery|Aid Study|Remote Service/` — no matches.

A summoned elemental is bound for a number of services, but the five service types (Aid Sorcery by element, Aid Study, Spell Sustaining, Physical Service, Remote Service) are not implemented.

### magic/awakened-primer.md#21

Guide: **Shamans summon nature spirits**, and only inside the spirit's **domain**.

> "A shaman can summon a nature spirit only in the spirit's" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.184

Searched: `/outside (the |its )?domain|not in (the |its )?domain|inDomain|currentDomain/` — no matches.

Nature spirit types carry a `domain` label shown in the summon dialog, but nothing requires the shaman to be in that domain.

### magic/awakened-primer.md#23

Guide: - Nature spirits **vanish at sunrise and sunset**, and any unused services

> "Nature spirits vanish at sunrise and sunset, no matter what" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.186

Searched: `/sunrise|sunset/` — no matches.

### magic/awakened-primer.md#26

Guide:   - **Spirits of Man**: city, field, hearth

> "Spirits of Man (city, field, hearth)" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.266

Searched: `/label:\s*'Hearth Spirit'|hearth_spirit/` — no matches.

City and Field spirits exist; there is no Hearth spirit.

### magic/awakened-primer.md#27

Guide:   - **Spirits of the Land**: desert, forest, mountain, prairie

> "Spirits of the Land (forest, mountain, desert, prairie)" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.266

Searched: `/label:\s*'Prairie Spirit'|prairie_spirit/` — no matches.

Desert, Forest and Mountain spirits exist; there is no Prairie spirit.

### magic/awakened-primer.md#28

Guide:   - **Spirits of the Sky**: mist, storm, wind

> "Wind Spirit Wind spirits appear as light swirling clouds" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.267

Searched: `/label:\s*'(Mist|Storm) Spirit'|mist_spirit|storm_spirit/` — no matches.

Only the Wind spirit exists; there are no Mist or Storm spirits.

### magic/awakened-primer.md#29

Guide:   - **Spirits of the Waters**: lake, river, sea, swamp

> "Spirits of the Waters (sea, lake, river, swamp)" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.266

Searched: `/label:\s*'(Lake|Sea) Spirit'|lake_spirit|sea_spirit/` — no matches.

River and Swamp spirits exist; there are no Lake or Sea spirits.

### magic/awakened-primer.md#31

Guide: ### Ritual sorcery  *(MitS p.34–36)*

> "the ritual team must create a link to the target using a material link" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.37

Searched: `/Ritual Pool|ritual team|Linking Test|ritualSorcery/` — no matches.

Ritual sorcery (a team casting one spell as a ritual, with a Ritual Pool, leader, spotter, Targeting/Linking/Sending Tests and material links) is not implemented anywhere in the system; only the 'Ritual Sorcery' skill specialisation name exists in config. The rules are on MitS printed pp.34-37 (the PDF is offset by one; the first page of the section, printed p.34, has no printed page number in its text layer, so the material-link passage on p.37 is the quote recorded).

### magic/awakened-primer.md#32

Guide: - A team of magicians can cast one spell together. It builds over hours, but

> "the ritual team must create a link to the target using a material link" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.37

Searched: `/Ritual Pool|ritual team|Linking Test|ritualSorcery/` — no matches.

Ritual sorcery (a team casting one spell as a ritual, with a Ritual Pool, leader, spotter, Targeting/Linking/Sending Tests and material links) is not implemented anywhere in the system; only the 'Ritual Sorcery' skill specialisation name exists in config. The rules are on MitS printed pp.34-37 (the PDF is offset by one; the first page of the section, printed p.34, has no printed page number in its text layer, so the material-link passage on p.37 is the quote recorded).

### magic/awakened-primer.md#33

Guide: - The team can have at most as many members as **the lowest Sorcery rating**

> "the ritual team must create a link to the target using a material link" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.37

Searched: `/Ritual Pool|ritual team|Linking Test|ritualSorcery/` — no matches.

Ritual sorcery (a team casting one spell as a ritual, with a Ritual Pool, leader, spotter, Targeting/Linking/Sending Tests and material links) is not implemented anywhere in the system; only the 'Ritual Sorcery' skill specialisation name exists in config. The rules are on MitS printed pp.34-37 (the PDF is offset by one; the first page of the section, printed p.34, has no printed page number in its text layer, so the material-link passage on p.37 is the quote recorded).

### magic/awakened-primer.md#34

Guide: - You need a hermetic circle or shamanic lodge rated at least the spell's

> "the ritual team must create a link to the target using a material link" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.37

Searched: `/Ritual Pool|ritual team|Linking Test|ritualSorcery/` — no matches.

Ritual sorcery (a team casting one spell as a ritual, with a Ritual Pool, leader, spotter, Targeting/Linking/Sending Tests and material links) is not implemented anywhere in the system; only the 'Ritual Sorcery' skill specialisation name exists in config. The rules are on MitS printed pp.34-37 (the PDF is offset by one; the first page of the section, printed p.34, has no printed page number in its text layer, so the material-link passage on p.37 is the quote recorded).

### magic/awakened-primer.md#35

Guide: - To reach a distant target you need a **material link**: a piece of the

> "the ritual team must create a link to the target using a material link" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.37

Searched: `/Ritual Pool|ritual team|Linking Test|ritualSorcery/` — no matches.

Ritual sorcery (a team casting one spell as a ritual, with a Ritual Pool, leader, spotter, Targeting/Linking/Sending Tests and material links) is not implemented anywhere in the system; only the 'Ritual Sorcery' skill specialisation name exists in config. The rules are on MitS printed pp.34-37 (the PDF is offset by one; the first page of the section, printed p.34, has no printed page number in its text layer, so the material-link passage on p.37 is the quote recorded).

### magic/awakened-primer.md#36

Guide: - **Elemental manipulation spells can't be cast as ritual sorcery.**

> "the ritual team must create a link to the target using a material link" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.37

Searched: `/Ritual Pool|ritual team|Linking Test|ritualSorcery/` — no matches.

Ritual sorcery (a team casting one spell as a ritual, with a Ritual Pool, leader, spotter, Targeting/Linking/Sending Tests and material links) is not implemented anywhere in the system; only the 'Ritual Sorcery' skill specialisation name exists in config. The rules are on MitS printed pp.34-37 (the PDF is offset by one; the first page of the section, printed p.34, has no printed page number in its text layer, so the material-link passage on p.37 is the quote recorded).

### magic/awakened-primer.md#37

Guide: ### Foci  *(SR3 p.189–191; MitS p.169)*

> "There are five basic types of foci: Spell Foci, which aid Sorcery; Spirit Foci, which aid Conjuring; Power Foci" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.189

Searched: `/spellFocus|powerFocus|spiritFocus|sustainingFocus|focusBond|bondKarma/` — no matches.

Only weapon foci are modelled (an isFocus / focusActive flag on melee items, used by astral combat). Spell, spirit, power and sustaining foci, and bonding with Karma, are not.

### magic/awakened-primer.md#38

Guide: Foci are bonded with Karma. The core types are **spell foci** (one specific

> "There are five basic types of foci: Spell Foci, which aid Sorcery; Spirit Foci, which aid Conjuring; Power Foci" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.189

Searched: `/spellFocus|powerFocus|spiritFocus|sustainingFocus|focusBond|bondKarma/` — no matches.

Weapon foci are modelled (an isFocus / focusActive flag on melee items, used by astral combat). 0.7.0: bonding any focus with Karma is now priced and charged (GoodKarma.focusType / bondingCost, scripts/data/karma-uses.mjs:184-210, the Focus Bonding Table p.190; bonded = flag `bonded`). What spell, spirit, power and sustaining foci DO once bonded (their dice and sustaining) is still not modelled.

### magic/awakened-primer.md#44

Guide: - Doing ordinary, non-magical tasks while perceiving (shooting, driving)

> "you suffer a +2 target number modifier" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.172

Searched: `/astral perception[^\n]*\+ ?2|mundane[^\n]*astral/` — no matches.

### magic/awakened-primer.md#46

Guide: - Leaving your body and returning are each an **Exclusive Complex Action**.

> "To use astral projection, spend an Exclusive Complex Action to leave your body and project onto the astral plane" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.172

Searched: `/astralProjection|Astral Projection.*Complex|project.*complex/` — no matches.

Astral projection is a mode toggle on the Magic tab; leaving and returning are not charged as Exclusive Complex Actions (same gap as combat.md #36).

### magic/awakened-primer.md#47

Guide: - **Your body loses 1 Essence per hour** you're away. At 0 Essence you die.

> "Your physical body loses 1 point of Essence at the end of every hour you are astrally projecting" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.173

Searched: `/Essence[^\n]*per hour|hour[^\n]*astrally projecting|astral[^\n]*hours? away/` — no matches.

### magic/awakened-primer.md#48

Guide: - Normal movement is **Intelligence × 4 m per turn**. Fast movement is up to

> "Normal movement is (Intelligence x 4) in" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.173
> "Your astral form can move up to a number of kilometers equal to your Magic Attribute in a single turn" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.173

Searched: `/astral[^\n]*(movement|Movement)[^\n]*Intelligence|Magic[^\n]*kilomet/` — no matches.

### magic/awakened-primer.md#49

Guide: - Solid earth blocks astral forms, which is why secure sites are often built

> "The earth is solid on the astral plane, just as it is in the physical world" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.173

Searched: `/solid on the astral|astral[^\n]*(underground|solid earth)/` — no matches.

### magic/awakened-primer.md#53

Guide: | Quickness | **Intelligence** |

> "Astral Quickness equals Intelligence" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.173

Searched: `/astral[^\n]*[Qq]uickness/` — no matches.

Astral Quickness (= Intelligence) has no use in the system: there is no astral dodge or movement roll.

### magic/initiation.md#2

Guide: How an Awakened character climbs the grades of initiation: what it costs,

> "Initiation sharpens the natural Awakened sensitivity to magic and purifies the spirit" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.57

Searched: `/initiation(Cost|Karma)|karma.{0,40}initiation|initiation.{0,40}karma|ordeal|gradeCost|canInitiate/` — no matches.

The system only records the grade: a number on the Magic tab (scripts/data/ActorDataModels.js:203 `initiateGrade`, SR3EActorSheet.js:2814). Nothing gates, costs or runs initiation.

### magic/initiation.md#5

Guide: ## Who can initiate  *(MitS p.57–58)*

> "Only Awakened characters (full magicians, aspected magicians and adepts)are capable of initiating" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.57

Searched: `/initiation(Cost|Karma)|karma.{0,40}initiation|initiation.{0,40}karma|ordeal|gradeCost|canInitiate/` — no matches.

The system only records the grade: a number on the Magic tab (scripts/data/ActorDataModels.js:203 `initiateGrade`, SR3EActorSheet.js:2814). Nothing gates, costs or runs initiation.

### magic/initiation.md#6

Guide: Only the Awakened: **full magicians, aspected magicians and adepts**. A

> "Only Awakened characters (full magicians, aspected magicians and adepts)are capable of initiating" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.57
> "A character can initiate on his own or as a member of a magical group" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.57
> "At the end of a character's first initiation, they are a Grade 1 initiate" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58

Searched: `/initiation(Cost|Karma)|karma.{0,40}initiation|initiation.{0,40}karma|ordeal|gradeCost|canInitiate/` — no matches.

The system only records the grade: a number on the Magic tab (scripts/data/ActorDataModels.js:203 `initiateGrade`, SR3EActorSheet.js:2814). Nothing gates, costs or runs initiation.

### magic/initiation.md#7

Guide: The gamemaster decides when a character can initiate, and some time should

> "should elapse between the character acquiring the required" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58
> "Characters may have to diligently study, practice and perform rituals" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.57

Searched: `/initiation(Cost|Karma)|karma.{0,40}initiation|initiation.{0,40}karma|ordeal|gradeCost|canInitiate/` — no matches.

Game-master discretion. The system leaves it to the table (it automates nothing here).

### magic/initiation.md#12

Guide: - A full magician's **first** initiation opens the **metaplanes** of astral

> "Upon a character's first initiation, full magicians receive access to the metaplanes of astral space" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58

Searched: `/metaplane/`, `/metaplane/`, `/(open|enter|access|reach)w*[^
]{0,30}metaplane/` — no matches.

No metaplane or astral-quest content exists in the code (the word appears once, in a comment in initiate-astral.mjs).

### magic/initiation.md#15

Guide: | **Learn a metamagical technique** | +1 | One technique you qualify for. [Below](#metamagic). |

> "The first option is to raise the initiate's Magic Attribute and learn a metamagical technique" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58

Searched: `/learnTechnique|techniquesKnown|knownTechniques|system.metamagic/` — no matches.

Magic is raised by hand; no metamagic is tracked or learned.

### magic/initiation.md#16

Guide: | **Alter your astral signature** | +1 | A Magic Test against **6 + the new grade**, with no dice but Karma. Two or more successes change it. Each failure adds +1 to later attempts. |

> "Make a Magic Test against Target Number 6 plus the new grade" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58
> "No dice other than Karma can be added to this test" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58
> "A minimum of 2 successes means the character has altered his signature" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58

Searched: `/alter.{0,25}signature|signature.{0,25}alter|changeSignature/` — no matches.

Astral signatures are read (assensing) but never altered.

### magic/initiation.md#17

Guide: | **Shed a geas** | none | One geas comes off a Magic point you already have, so that point works without it. [Geasa](#geasa). |

> "The third option is to shed a geas" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58
> "options for initiating is to drop a geas, replacing the lost Magic" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.33

Searched: `/\bgeas/` — no matches.

No geasa exist in the code.

### magic/initiation.md#20

Guide: > **The book's example** *(MitS p.58)*: Bandi, Magic 8, initiates to Grade

> "she rolls her Magic 8 against a Target Number 9 (6 plus Grade 3)" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58
> "She rolls only 1 success and so fails to alter her signature" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58

Searched: `/alter.{0,25}signature|signature.{0,25}alter|changeSignature/` — no matches.

The example's arithmetic matches the book (TN 6 + 3 = 9, 1 success is short of 2, next TN one higher); the mechanic is not coded.

### magic/initiation.md#22

Guide: ## The Karma cost  *(MitS p.58)*

> "Initiation costs Karma. To determine the basic Karma cost of an" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58

Searched: `/initiation(Cost|Karma)|karma.{0,40}initiation|initiation.{0,40}karma|ordeal|gradeCost|canInitiate/` — no matches.

### magic/initiation.md#23

Guide: **Base cost = 5 + the grade you're initiating to.** Multiply by the

> "initiation, add 5 to the desired grade" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58
> "ate cost multiplier from the lnitiation Cost Table (round down)" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58

Searched: `/initiation(Cost|Karma)|karma.{0,40}initiation|initiation.{0,40}karma|ordeal|gradeCost|canInitiate/` — no matches.

The Initiation Cost Table on MitS p.58 is an image with no text layer (read on the rendered page: Self-initiation Base Cost x 3, with ordeal x 2.5, Group initiation x 2, with ordeal x 1.5; Base Cost = 5 + desired grade); its multipliers are quoted here from the book's worked example. The guide matches. No cost is computed anywhere in the code.

### magic/initiation.md#24

Guide: | Initiation Cost Table *(MitS p.58)* | Cost |

> "initiation, add 5 to the desired grade" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58
> "Eli must pay (5 + 1, the desired grade) x 3, or 18 Karma" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58
> "he pays 7 x 2.5, or 17 Karma" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58
> "only 12 Karma for his Grade 1 initiation (5 + 1 = 6, 6 x 2" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58
> "or 9 (6 x 1.5) if he under-" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58

Searched: `/initiation(Cost|Karma)|karma.{0,40}initiation|initiation.{0,40}karma|ordeal|gradeCost|canInitiate/` — no matches.

The Initiation Cost Table on MitS p.58 is an image with no text layer (read on the rendered page: Self-initiation Base Cost x 3, with ordeal x 2.5, Group initiation x 2, with ordeal x 1.5; Base Cost = 5 + desired grade); its multipliers are quoted here from the book's worked example. The guide matches. No cost is computed anywhere in the code.

### magic/initiation.md#25

Guide: | Self-initiation | Base Cost × 3 |

> "Eli must pay (5 + 1, the desired grade) x 3, or 18 Karma" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58

Searched: `/initiation(Cost|Karma)|karma.{0,40}initiation|initiation.{0,40}karma|ordeal|gradeCost|canInitiate/` — no matches.

The Initiation Cost Table on MitS p.58 is an image with no text layer (read on the rendered page: Self-initiation Base Cost x 3, with ordeal x 2.5, Group initiation x 2, with ordeal x 1.5; Base Cost = 5 + desired grade); its multipliers are quoted here from the book's worked example. The guide matches. No cost is computed anywhere in the code.

### magic/initiation.md#26

Guide: | Self-initiation with an ordeal | Base Cost × 2.5 |

> "he pays 7 x 2.5, or 17 Karma" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58
> "If he undergoes an ordeal, this cost is reduced to 15 Karma" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58

Searched: `/initiation(Cost|Karma)|karma.{0,40}initiation|initiation.{0,40}karma|ordeal|gradeCost|canInitiate/` — no matches.

The Initiation Cost Table on MitS p.58 is an image with no text layer (read on the rendered page: Self-initiation Base Cost x 3, with ordeal x 2.5, Group initiation x 2, with ordeal x 1.5; Base Cost = 5 + desired grade); its multipliers are quoted here from the book's worked example. The guide matches. No cost is computed anywhere in the code.

### magic/initiation.md#27

Guide: | Group initiation | Base Cost × 2 |

> "only 12 Karma for his Grade 1 initiation (5 + 1 = 6, 6 x 2" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58

Searched: `/initiation(Cost|Karma)|karma.{0,40}initiation|initiation.{0,40}karma|ordeal|gradeCost|canInitiate/` — no matches.

The Initiation Cost Table on MitS p.58 is an image with no text layer (read on the rendered page: Self-initiation Base Cost x 3, with ordeal x 2.5, Group initiation x 2, with ordeal x 1.5; Base Cost = 5 + desired grade); its multipliers are quoted here from the book's worked example. The guide matches. No cost is computed anywhere in the code.

### magic/initiation.md#28

Guide: | Group initiation with an ordeal | Base Cost × 1.5 |

> "or 9 (6 x 1.5) if he under-" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58

Searched: `/initiation(Cost|Karma)|karma.{0,40}initiation|initiation.{0,40}karma|ordeal|gradeCost|canInitiate/` — no matches.

The Initiation Cost Table on MitS p.58 is an image with no text layer (read on the rendered page: Self-initiation Base Cost x 3, with ordeal x 2.5, Group initiation x 2, with ordeal x 1.5; Base Cost = 5 + desired grade); its multipliers are quoted here from the book's worked example. The guide matches. No cost is computed anywhere in the code.

### magic/initiation.md#31

Guide: | 1 | 6 | 18 | 15 | 12 | 9 |

> "initiation, add 5 to the desired grade" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58
> "Eli must pay (5 + 1, the desired grade) x 3, or 18 Karma" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58
> "he pays 7 x 2.5, or 17 Karma" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58
> "only 12 Karma for his Grade 1 initiation (5 + 1 = 6, 6 x 2" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58
> "or 9 (6 x 1.5) if he under-" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58

Searched: `/initiation(Cost|Karma)|karma.{0,40}initiation|initiation.{0,40}karma|ordeal|gradeCost|canInitiate/` — no matches.

Row checked: base 5 + grade; x3, x2.5 and x1.5 rounded down, x2. The Initiation Cost Table on MitS p.58 is an image with no text layer (read on the rendered page: Self-initiation Base Cost x 3, with ordeal x 2.5, Group initiation x 2, with ordeal x 1.5; Base Cost = 5 + desired grade); its multipliers are quoted here from the book's worked example. The guide matches. No cost is computed anywhere in the code.

### magic/initiation.md#32

Guide: | 2 | 7 | 21 | 17 | 14 | 10 |

> "initiation, add 5 to the desired grade" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58
> "Eli must pay (5 + 1, the desired grade) x 3, or 18 Karma" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58
> "he pays 7 x 2.5, or 17 Karma" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58
> "only 12 Karma for his Grade 1 initiation (5 + 1 = 6, 6 x 2" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58
> "or 9 (6 x 1.5) if he under-" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58

Searched: `/initiation(Cost|Karma)|karma.{0,40}initiation|initiation.{0,40}karma|ordeal|gradeCost|canInitiate/` — no matches.

Row checked: base 5 + grade; x3, x2.5 and x1.5 rounded down, x2. The Initiation Cost Table on MitS p.58 is an image with no text layer (read on the rendered page: Self-initiation Base Cost x 3, with ordeal x 2.5, Group initiation x 2, with ordeal x 1.5; Base Cost = 5 + desired grade); its multipliers are quoted here from the book's worked example. The guide matches. No cost is computed anywhere in the code.

### magic/initiation.md#33

Guide: | 3 | 8 | 24 | 20 | 16 | 12 |

> "initiation, add 5 to the desired grade" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58
> "Eli must pay (5 + 1, the desired grade) x 3, or 18 Karma" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58
> "he pays 7 x 2.5, or 17 Karma" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58
> "only 12 Karma for his Grade 1 initiation (5 + 1 = 6, 6 x 2" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58
> "or 9 (6 x 1.5) if he under-" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58

Searched: `/initiation(Cost|Karma)|karma.{0,40}initiation|initiation.{0,40}karma|ordeal|gradeCost|canInitiate/` — no matches.

Row checked: base 5 + grade; x3, x2.5 and x1.5 rounded down, x2. The Initiation Cost Table on MitS p.58 is an image with no text layer (read on the rendered page: Self-initiation Base Cost x 3, with ordeal x 2.5, Group initiation x 2, with ordeal x 1.5; Base Cost = 5 + desired grade); its multipliers are quoted here from the book's worked example. The guide matches. No cost is computed anywhere in the code.

### magic/initiation.md#34

Guide: | 4 | 9 | 27 | 22 | 18 | 13 |

> "initiation, add 5 to the desired grade" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58
> "Eli must pay (5 + 1, the desired grade) x 3, or 18 Karma" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58
> "he pays 7 x 2.5, or 17 Karma" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58
> "only 12 Karma for his Grade 1 initiation (5 + 1 = 6, 6 x 2" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58
> "or 9 (6 x 1.5) if he under-" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58

Searched: `/initiation(Cost|Karma)|karma.{0,40}initiation|initiation.{0,40}karma|ordeal|gradeCost|canInitiate/` — no matches.

Row checked: base 5 + grade; x3, x2.5 and x1.5 rounded down, x2. The Initiation Cost Table on MitS p.58 is an image with no text layer (read on the rendered page: Self-initiation Base Cost x 3, with ordeal x 2.5, Group initiation x 2, with ordeal x 1.5; Base Cost = 5 + desired grade); its multipliers are quoted here from the book's worked example. The guide matches. No cost is computed anywhere in the code.

### magic/initiation.md#35

Guide: | 5 | 10 | 30 | 25 | 20 | 15 |

> "initiation, add 5 to the desired grade" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58
> "Eli must pay (5 + 1, the desired grade) x 3, or 18 Karma" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58
> "he pays 7 x 2.5, or 17 Karma" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58
> "only 12 Karma for his Grade 1 initiation (5 + 1 = 6, 6 x 2" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58
> "or 9 (6 x 1.5) if he under-" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58

Searched: `/initiation(Cost|Karma)|karma.{0,40}initiation|initiation.{0,40}karma|ordeal|gradeCost|canInitiate/` — no matches.

Row checked: base 5 + grade; x3, x2.5 and x1.5 rounded down, x2. The Initiation Cost Table on MitS p.58 is an image with no text layer (read on the rendered page: Self-initiation Base Cost x 3, with ordeal x 2.5, Group initiation x 2, with ordeal x 1.5; Base Cost = 5 + desired grade); its multipliers are quoted here from the book's worked example. The guide matches. No cost is computed anywhere in the code.

### magic/initiation.md#36

Guide: | 6 | 11 | 33 | 27 | 22 | 16 |

> "initiation, add 5 to the desired grade" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58
> "Eli must pay (5 + 1, the desired grade) x 3, or 18 Karma" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58
> "he pays 7 x 2.5, or 17 Karma" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58
> "only 12 Karma for his Grade 1 initiation (5 + 1 = 6, 6 x 2" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58
> "or 9 (6 x 1.5) if he under-" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58

Searched: `/initiation(Cost|Karma)|karma.{0,40}initiation|initiation.{0,40}karma|ordeal|gradeCost|canInitiate/` — no matches.

Row checked: base 5 + grade; x3, x2.5 and x1.5 rounded down, x2. The Initiation Cost Table on MitS p.58 is an image with no text layer (read on the rendered page: Self-initiation Base Cost x 3, with ordeal x 2.5, Group initiation x 2, with ordeal x 1.5; Base Cost = 5 + desired grade); its multipliers are quoted here from the book's worked example. The guide matches. No cost is computed anywhere in the code.

### magic/initiation.md#37

Guide: > **The book's example** *(MitS p.58)*: Eli, an owl shaman, initiates

> "If he accepts another ordeal, he pays 7 x 2.5, or 17 Karma" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58
> "Eli must pay (5 + 1, the desired grade) x 3, or 18 Karma" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58
> "he would pay only 12 Karma for his Grade 1 initiation" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58

Searched: `/initiation(Cost|Karma)|karma.{0,40}initiation|initiation.{0,40}karma|ordeal|gradeCost|canInitiate/` — no matches.

The guide's example matches the book's Eli example (18/15, 21/17, group 12/9 and 14/10).

### magic/initiation.md#39

Guide: ## Ordeals  *(MitS p.58–61)*

> "by 0.5. The Karma cost reduction represents the character's" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.60
> "The character must choose an ordeal before undergoing initiation." — Shadowrun 3e - Magic in the Shadows.pdf, printed p.60
> "An ordeal can only be repeated with the gamemaster's permission" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.60
> "he does not need to repay the initiation Karma cost when attempting the ordeal again" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.60

Searched: `/ordeal|asceticism/` — no matches.

### magic/initiation.md#40

Guide: An ordeal is a test of the candidate. It lowers the cost multiplier by

> "by 0.5. The Karma cost reduction represents the character's" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.60
> "The character must choose an ordeal before undergoing initiation." — Shadowrun 3e - Magic in the Shadows.pdf, printed p.60
> "An ordeal can only be repeated with the gamemaster's permission" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.60
> "he does not need to repay the initiation Karma cost when attempting the ordeal again" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.60

Searched: `/ordeal|asceticism/` — no matches.

### magic/initiation.md#42

Guide: | **Astral quest** | A quest on the metaplanes with a rating of **twice the grade**. Shamans go to their totem's metaplane, mages to each of the four elemental metaplanes. You must be able to project. After a failure, a Willpower Test against the grade sets the preparation time: 10 days divided by the successes. |

> "The rating of the astral quest is twice the desired grade of initiation." — Shadowrun 3e - Magic in the Shadows.pdf, printed p.60
> "Divide the base time of 10 days by the successes" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.60

Searched: `/ordeal|asceticism/` — no matches.

### magic/initiation.md#43

Guide: | **Asceticism** | Permanently give up **1 point of a Physical Attribute**'s unaugmented rating, and 1 point of its racial modified limit. Not an Attribute at 1. Taken again, it must be a different Attribute first. |

> "must permanently give up 1 point from a physical Attribute" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.60
> "reduce a different physical Attribute before he can reduce a" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.60

Searched: `/ordeal|asceticism/` — no matches.

### magic/initiation.md#44

Guide: | **Deed** | A task fitting the character's path, group, totem or code, agreed with the GM, or a run that fits. **You give up that run's Karma award.** It can be saved, but only for the next initiation. |

> "simply turns down the Karma award for the run and the ordeal is accomplished" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.60
> "be used for the character's next initiation, however, and cannot be saved beyond that grade" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.60

Searched: `/ordeal|asceticism/` — no matches.

### magic/initiation.md#45

Guide: | **Familiar** | Magicians who can summon allies only. Summon an **ally spirit** that costs at least the initiation's Karma (with the ordeal). It costs no Magic Point, but if it's ever banished, freed or destroyed you check for Magic loss. |

> "amount of Karma equal to the Karma cost of the initiation with an ordeal" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.60
> "The ally conjured for this ordeal does not cost a Magic Point" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.60

Searched: `/ordeal|asceticism/` — no matches.

### magic/initiation.md#46

Guide: | **Geas** | Take a geas on the new grade's Magic Point; an adept can put it on the new Power Point. It can never be removed. |

> "A geas taken as an ordeal cannot be removed." — Shadowrun 3e - Magic in the Shadows.pdf, printed p.60
> "Adepts may take this ordeal by applying a geas to the Power Point gained from the initiation" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.60

Searched: `/ordeal|asceticism/` — no matches.

### magic/initiation.md#47

Guide: | **Meditation** | Pass three tests: Charisma against your Strength, Intelligence against your Quickness, Willpower against your Body. Each takes grade × 4 days, divided by its successes. Fail one and the cycle starts again. +2 to all three on a Squatter or Street lifestyle, unless you're in the wilderness with Wilderness Survival 4+. |

> "A CharismaTest against a target number equal to Strength." — Shadowrun 3e - Magic in the Shadows.pdf, printed p.61
> "Each test has a base time of (desired grade x 4) in days." — Shadowrun 3e - Magic in the Shadows.pdf, printed p.61
> "meditative tests if the character's lifestyle is Squatter or Street" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.61
> "Wilderness Survival Skill of rating 4 or greater" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.61

Searched: `/ordeal|asceticism/` — no matches.

### magic/initiation.md#48

Guide: | **Oath** | Swear to obey a magical group's rules. For group members only, and only the first oath counts. |

> "a character swears several oaths in his career, only the first qualifies as an ordeal" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.61
> "available only to members of such groups" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.61

Searched: `/ordeal|asceticism/` — no matches.

### magic/initiation.md#49

Guide: | **Thesis** | Write or make a formula of all your magical knowledge, as a spell formula of rating 6, 30 days base time. Anyone with a copy has a material link to you, and if every copy is destroyed you lose a Magic Point. |

> "with a Rating of 6, using the character's" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.61
> "the author immediately loses a Magic Point" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.61

Searched: `/ordeal|asceticism/` — no matches.

### magic/initiation.md#51

Guide: ## Magical groups  *(MitS p.61–65)*

> "Magical groups form because even the Awakened are social animals" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.61

Searched: `/magical.?group|stricture|magicalLink|avatar/`, `/magical.?group|stricture|magicalLink|avatar/`, `/magical.?group|stricture|magicalLink|avatar/` — no matches.

### magic/initiation.md#52

Guide: Orders, covens, lodges and circles. What makes one magical is a **magical

> "must have a magical linlt. This is a connection to the forces of magic, a connection to a spirit avatar" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.62

Searched: `/magical.?group|stricture|magicalLink|avatar/`, `/magical.?group|stricture|magicalLink|avatar/`, `/magical.?group|stricture|magicalLink|avatar/` — no matches.

### magic/initiation.md#53

Guide: - **Kinds** *(MitS p.62)*: **initiatory** (magical study first),

> "An initiatory group pursues magical ltnowledge and the development of the individual members" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.62
> "A dedicated group has a specific religious or moral bias" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.62
> "A conspiratorialgroup is dedicated to a specific goal" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.62

Searched: `/magical.?group|stricture|magicalLink|avatar/`, `/magical.?group|stricture|magicalLink|avatar/`, `/magical.?group|stricture|magicalLink|avatar/` — no matches.

### magic/initiation.md#54

Guide: - **Joining** costs **3 Karma and the first month's dues**, which other

> "joining a magical group costs 3 Karma and the first month's dues" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.65
> "Another member or members can put up the Karma or the money" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.65

Searched: `/magical.?group|stricture|magicalLink|avatar/`, `/magical.?group|stricture|magicalLink|avatar/`, `/magical.?group|stricture|magicalLink|avatar/` — no matches.

### magic/initiation.md#55

Guide: - **Founding** one needs two or more Awakened, each paying the 3 Karma.

> "Founding a magical group requires two or more" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.65
> "The target number for the Magical Linlt Test is 12, with the following modifiers" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.65
> "additional dice for each test at a cost of 3 Karma per die" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.65

Searched: `/magical.?group|stricture|magicalLink|avatar/`, `/magical.?group|stricture|magicalLink|avatar/`, `/magical.?group|stricture|magicalLink|avatar/` — no matches.

### magic/initiation.md#56

Guide: - **Leaving** a group you swore an oath to means a check for **Magic loss**

> "loses membership in any group to which he has sworn an oath, he must check for Magic loss" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.62

Searched: `/magical.?group|stricture|magicalLink|avatar/`, `/magical.?group|stricture|magicalLink|avatar/`, `/magical.?group|stricture|magicalLink|avatar/` — no matches.

### magic/initiation.md#57

Guide: ### Strictures  *(MitS p.62–63)*

> "Groups have strictures, which are rules tied to the group's magic" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.62

Searched: `/magical.?group|stricture|magicalLink|avatar/`, `/magical.?group|stricture|magicalLink|avatar/`, `/magical.?group|stricture|magicalLink|avatar/` — no matches.

### magic/initiation.md#58

Guide: A group's rules, tied to its magic. Most have three or four that bind each

> "Most groups have three or four such strictures." — Shadowrun 3e - Magic in the Shadows.pdf, printed p.63

Searched: `/magical.?group|stricture|magicalLink|avatar/`, `/magical.?group|stricture|magicalLink|avatar/`, `/magical.?group|stricture|magicalLink|avatar/` — no matches.

### magic/initiation.md#59

Guide: > Attendance · Belief · Deed · Exclusive Membership · Exclusive Ritual ·

> "Members of this group must talte a geas if they lose a" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.63
> "reduce all Karma Awards to a member of this group by -1" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.63

Searched: `/magical.?group|stricture|magicalLink|avatar/`, `/magical.?group|stricture|magicalLink|avatar/`, `/magical.?group|stricture|magicalLink|avatar/` — no matches.

### magic/initiation.md#60

Guide: **Group strictures**, such as **Limited Membership** or **Oath** (every

> "Only the group as a whole can break a group stricture" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.63
> "All members must, in their first initiation with the group, accept the oath ordeal" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.63

Searched: `/magical.?group|stricture|magicalLink|avatar/`, `/magical.?group|stricture|magicalLink|avatar/`, `/magical.?group|stricture|magicalLink|avatar/` — no matches.

### magic/initiation.md#61

Guide: **Breaking a stricture** leaves marks in your aura that fellow members can

> "The target number is twice the initiate grade the character is trying to" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.62
> "If the character fails the test, the group must expel him or lose their magical linlt" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.62

Searched: `/magical.?group|stricture|magicalLink|avatar/`, `/magical.?group|stricture|magicalLink|avatar/`, `/magical.?group|stricture|magicalLink|avatar/` — no matches.

### magic/initiation.md#63

Guide: ## Metamagic  *(MitS p.69–79)*

> "Metamagic controls how magic is used, Initiates can learn" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.69

Searched: `/learnTechnique|techniquesKnown|knownTechniques|system.metamagic/` — no matches.

### magic/initiation.md#65

Guide: | **Anchoring** | p.70 | Store a live spell in an anchoring focus, set off by a trigger. |

> "an anchoring focus and set certain conditions, called triggers, by which the spell may be set off" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.70

Searched: `/anchoringFocus|anchoring focus|anchor(ed)?Spell/` — no matches.

### magic/initiation.md#66

Guide: | **Centering** | p.72 | Use a creative skill to add successes, resist Drain, or cancel penalties. [Below](#centering). |

> "Centering can reduce Drain or reduce penalties affecting magical target numbers" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.72

Searched: `/centering.{0,20}(test|dice|success|drain)|creative.?skill/` — no matches.

Only the Centering skill itself exists (config.js:88); the technique is not implemented.

### magic/initiation.md#67

Guide: | **Cleansing** | p.74 | Clear temporary background count, once its cause is gone. |

> "Cleansing is used to clear away temporary bacltground count" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.74

Searched: `/cleansing|backgroundCount/` — no matches.

### magic/initiation.md#68

Guide: | **Divining** | p.74 | Read omens for insight into future events. |

> "Divining allows an initiate to gain insight into future events concerning a specific subject" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.74

Searched: `/divination (test|table)|divining (test|dice)|predictionSkill/` — no matches.

Only the Divining skill name exists (config.js:90).

### magic/initiation.md#69

Guide: | **Invoking** | p.75 | Summon great form spirits. |

> "Invoking allows initiates to summon particularly power- ful spirits known as great form" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.75

Searched: `/great.?form|invoking/`, `/great.?form|invoking/`, `/great.?form|invoking/` — no matches.

### magic/initiation.md#70

Guide: | **Masking** | p.76 | Disguise your aura, and see through others' disguises. |

> "Masking hides the true nature of an initiate's aura, pre- senting a less powerful astral presence" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.76

Searched: `/aura.?mask|deliberate.?mask|masking (test|dice)|mask(ed)?Aura/` — no matches.

No aura masking. The only Masking use is the ward 'Fool This Ward' test (SR3EWard.js:291-310), which is a different mechanic.

### magic/initiation.md#71

Guide: | **Possessing** | p.76 | Your astral form enters and controls a living being. |

> "This technique allows an astrally projecting initiate to take control of another being's body for a period of time" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.76

Searched: `/possessing|astralPossession|possess(ion)?(Test|Host)/` — no matches.

### magic/initiation.md#72

Guide: | **Quickening** | p.77 | Make a sustained spell permanent without a sustaining focus. |

> "can malte any sustained spell permanent with- out need for a sustaining focus" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.77

Searched: `/quickenedSpell|quickeningTime|quickening (test|time)|isQuickened/` — no matches.

### magic/initiation.md#73

Guide: | **Reflecting** | p.78 | Spell defense that can turn a spell back on its caster. |

> "Reflecting allows an initiate to reflect a spell back at the caster." — Shadowrun 3e - Magic in the Shadows.pdf, printed p.78

Searched: `/reflecting|reflectDice|spellReflect|reflectedSpell/` — no matches.

### magic/initiation.md#74

Guide: | **Shielding** | p.79 | A stronger form of spell defense. |

> "Shielding is an initiated version of spell defense" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.79

Searched: `/shielding|shieldDice|spellShield/`, `/shielding|shieldDice|spellShield/`, `/shielding|shieldDice|spellShield/` — no matches.

### magic/initiation.md#75

Guide: ### Learning a technique  *(MitS p.69–70)*

> "a character can attempt: to learn one metamagical technique, provided he meets the requirements to use it" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.69

Searched: `/learnTechnique|techniquesKnown|knownTechniques|system.metamagic/` — no matches.

### magic/initiation.md#76

Guide: One technique per grade, and only one you can use: conjurers and adepts

> "A conjurer or an adept cannot, for example, learn" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.69
> "Adepts can only learn the techniques of Centering, Divining and Masking." — Shadowrun 3e - Magic in the Shadows.pdf, printed p.69

Searched: `/learnTechnique|techniquesKnown|knownTechniques|system.metamagic/` — no matches.

### magic/initiation.md#78

Guide: | **Another initiate** of equal or higher grade who knows it | Magic, TN **8 − the teacher's grade** | 14 days ÷ successes. Free within a group; otherwise usually **grade × 1,000¥ a day**. |

> "ceed in a Magic Test with a Target Number of 8 minus the teacher's grade" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.70
> "Divide the base time of 14 days by the num- ber of successes to determine how long it taltes" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.70
> "Magical groups generally teach metamagic to their mem- bers free of charge" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.70
> "per day to teach a technique" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.70

Searched: `/learnTechnique|techniquesKnown|knownTechniques|system.metamagic/` — no matches.

### magic/initiation.md#79

Guide: | **An astral quest** | The quest, rated by the number of techniques you already know (TN at least 2) | Days equal to the quest rating. |

> "The Quest Rating is equal to the number of metamagical techniques the character knows" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.70
> "The quest takes a number of days equal to the Quest Rating to complete" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.70

Searched: `/learnTechnique|techniquesKnown|knownTechniques|system.metamagic/` — no matches.

### magic/initiation.md#80

Guide: | **A free spirit** | As from an initiate, with Spirit Energy for grade | Karma, at least its Spirit Energy. Invoking costs double. |

> "may teach them as metamagical techniques in the same manner as an initiate, using Spirit Energy in place of grade" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.70
> "Any free spirit can teach Invoking, but they usually charge extra" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.70
> "with a minimum Karma cost equal to their Spirit Energy" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.70

Searched: `/learnTechnique|techniquesKnown|knownTechniques|system.metamagic/` — no matches.

### magic/initiation.md#81

Guide: Fail the test and you can try that technique again only at your next grade,

> "If the character fails the test, they cannot learn that technique without first" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.69
> "if they fail on the third try, they may not try again" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.69
> "If the result of any of these tests is all Is, the character may not ever learn that technique" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.69

Searched: `/learnTechnique|techniquesKnown|knownTechniques|system.metamagic/` — no matches.

### magic/initiation.md#82

Guide: ### Centering  *(MitS p.72–74)*

> "Centering Skill is an Active Magical Skill (p. 85, SIU) that is linked to Willpower" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.72

Searched: `/centering.{0,20}(test|dice|success|drain)|creative.?skill/` — no matches.

The Centering skill exists (config.js:88, Willpower) but nothing uses it.

### magic/initiation.md#83

Guide: Centering uses two skills: **Centering**, an Active Magical Skill linked to

> "Centering Skill is an Active Magical Skill (p. 85, SIU) that is linked to Willpower" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.72
> "can never be raised higher than the rating of the creative skill" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.72
> "A creative sltill can never be chip-based." — Shadowrun 3e - Magic in the Shadows.pdf, printed p.73
> "only one of the benefits of centering (increased success, resist Drain, or reduce penalties) during any phase" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.73

Searched: `/centering.{0,20}(test|dice|success|drain)|creative.?skill/` — no matches.

The skill is on the skill list (scripts/config.js:88, linked to Willpower, as the book says); no part of the technique is coded.

### magic/initiation.md#84

Guide: - **For success**: same TN as the magical test. Every 2 successes add a

> "cesses generated on the Centering Test count as an additional success on the Magical" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.73
> "the initiate must use astral perception" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.73

Searched: `/centering.{0,20}(test|dice|success|drain)|creative.?skill/` — no matches.

### magic/initiation.md#85

Guide: - **Against Drain**: TN = the Drain Power. Every 2 successes count as one

> "intended. Every 2 successes from this test count as 1 success in the Drain Resistance Test" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.73

Searched: `/centering.{0,20}(test|dice|success|drain)|creative.?skill/` — no matches.

### magic/initiation.md#86

Guide: - **Against penalties**: TN = the magical test's full TN **minus your

> "adding all applicable modifiers and subtracting the initiate's" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.73
> "Every 2 successes cancel out 1 point of modifiers to the Magical Sltill Test target number; centering cannot reduce the base target number" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.73

Searched: `/centering.{0,20}(test|dice|success|drain)|creative.?skill/` — no matches.

### magic/initiation.md#87

Guide: **Adept centering** *(MitS p.73–74)*. An adept who learns Centering applies

> "An adept who learns centering begins with the ability to apply it to Athletics and Stealth." — Shadowrun 3e - Magic in the Shadows.pdf, printed p.74
> "Adepts can center against any Drain caused by any use of" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.74
> "adepts do not require astral perception to use centering for success" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.74

Searched: `/centering.{0,20}(test|dice|success|drain)|creative.?skill/` — no matches.

### magic/initiation.md#88

Guide: > **The book's example** *(MitS p.73)*: Beaumains, a Grade 4 initiate,

> "Beaumains, a Grade 4 initiate, is tossing a Powerbolt" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.73
> "(the actual target number o f 9, minus his grade), he scores 2 successes" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.73
> "Sorcery Test against a Target Number o f 8 (9 - 1)" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.73

Searched: `/centering.{0,20}(test|dice|success|drain)|creative.?skill/` — no matches.

The guide's example matches the book (TN 9, centering TN 9 - 4 = 5, 2 successes cancel 1 point, cast at TN 8).

### magic/initiation.md#90

Guide: ## Geasa  *(MitS p.30–33)*

> "The game rules define a geas as a restriction a magician accepts as a way o f holding on to a Magic Point" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.31

Searched: `/\bgeas/` — no matches.

### magic/initiation.md#91

Guide: When a character **loses a point of Magic**, they can take a **geas**, a

> "he now has a rating of 5; taking a geas allows the character to continue casting spells and so on as if he still had a Magic Rating of 6" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.31

Searched: `/\bgeas/` — no matches.

### magic/initiation.md#92

Guide: - Decide **when the point is lost**. Turn the geas down then and you can't

> "When a character loses a Magic Point, they must choose whether to accept a geas." — Shadowrun 3e - Magic in the Shadows.pdf, printed p.32
> "they may not offset that specific Magic loss with a geas at a later time" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.32

Searched: `/\bgeas/` — no matches.

### magic/initiation.md#93

Guide: - At most **unaugmented Willpower** geasa. At Magic 0 nothing helps: the

> "The maximum number of geasa a character can take is equal to his unaugmented Willpower Attribute" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.33
> "they immediately become a mundane-no geasa can offset that." — Shadowrun 3e - Magic in the Shadows.pdf, printed p.33

Searched: `/\bgeas/` — no matches.

### magic/initiation.md#94

Guide: - A geas only offsets lost points; it never adds Magic.

> "Geasa can only be talten to offset lost Magic Points; they may not be talten to gain more Magic." — Shadowrun 3e - Magic in the Shadows.pdf, printed p.31

Searched: `/\bgeas/` — no matches.

### magic/initiation.md#95

Guide: - **Break any one** and you lose **all** the points your geasa cover, and

> "temporarily must function without any of the Magic Points off- set by geasa" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.33
> "must add + 1 to the target numbers of all Magical Skill Tests for each geas he possesses" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.33
> "Tests for astral combat, assensing and similar actions are not subject to geasa." — Shadowrun 3e - Magic in the Shadows.pdf, printed p.33

Searched: `/\bgeas/` — no matches.

### magic/initiation.md#96

Guide: - Initiation can shed one geas per grade, instead of gaining Magic.

> "a character can shed only one geas per grade" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.58
> "options for initiating is to drop a geas, replacing the lost Magic" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.33

Searched: `/\bgeas/` — no matches.

### magic/initiation.md#97

Guide: **Standard geasa** *(MitS p.32)*: Condition (unwounded, astrally

> "You must specify a personal condition to" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.32
> "You specify a domain in which your magic works" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.32
> "Fasting Geas: if the character eats or drinks or accepts any nourishment other than water" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.32
> "geas restricts shamans to performing only that magic that provides a Totem Advantage" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.32
> "Talisman Geas: The character must use a specific item," — Shadowrun 3e - Magic in the Shadows.pdf, printed p.32

Searched: `/\bgeas/` — no matches.

### magic/initiation.md#98

Guide: > **The book's example** *(MitS p.33)*: Rikki Ratboy, Magic 6, loses a

> "Riklti Ratboy (Magic 6) gets shot up bad on a run and" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.33
> "by 2, down to 4, and he suffers a +2 modifier to all magical tests" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.33

Searched: `/\bgeas/` — no matches.

The guide's example matches the book (gesture, then domain; both broken: Magic 6 to 4 and +2 to all magical tests).

### magic/physical-adepts.md#6

Guide: Adepts follow **the somatic way**. They don't cast spells or conjure

> "cannot astrally project, and cannot use astral perception unless it is" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.168
> "they can use Sorcery in astral combat; see p. 174" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.168

Searched: `/hasAstralPerception|canPerceiveAstrally|adeptAstral/`, `/magicType.{0,25}Adept.{0,60}(cast|conjur|project)/` — no matches.

The Adept magic type exists, but nothing in the code stops an adept casting, conjuring or perceiving astrally, nor treats Astral Perception as the only way in (the system warns, it does not refuse).

### magic/physical-adepts.md#7

Guide: - **At character creation** an adept takes **Magic at Priority B**, the

> "Adept/Aspected Magician 27 40 400,000" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.54
> "Full Magician 30 50 1,000,000" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.54

Searched: `/spellPoints|magicPriority/` — no matches.

The Master Character Creation Table row for Priority B is Adept/Aspected Magician (full magician is A). Character creation by Priority is not part of the system; magic type is picked on the Magic tab.

### magic/physical-adepts.md#8

Guide: - Adepts get **no Spell Points**. They can buy weapon foci with nuyen, but

> "Adepts can purchase weapon foci, but cannot bond them until they have enough Karma" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.55
> "Because adepts do not use spells, they get no Spell Points" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.55

Searched: `/spellPoints/` — no matches.

Spell Points do not exist in the system; foci are bonded with Karma (GK.bondingCost) on the Spend Karma calculator.

### magic/physical-adepts.md#11

Guide: - Each power costs Power Points. **Once spent they're gone, and the choice

> "Power Points, once spent, are gone. The adept's choice of powers is permanent." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.168

Searched: `/permanentPowers|lockPowers|powersLocked/` — no matches.

Powers can be added and removed freely on the sheet; permanence is left to the table. The Power Points used/total count is shown (SR3EActorSheet.js:2970).

### magic/physical-adepts.md#16

Guide: **An adept who loses a point of Magic loses a point's worth of powers.**

> "so an adept who loses a Magic point" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.168
> "If a character's Magic Attribute ever drops to 0, he "burns" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.160

Searched: `/burn(s|ed)?.?out|burnout/` — no matches.

No powers are removed on Magic loss (the sheet only warns when the Power Point total exceeds Magic) and nothing marks a burnout at Magic 0.

### magic/physical-adepts.md#20

Guide: | **Astral Perception** | 2 | Normal astral perception (p.171). Never projection. |

> "Adepts with this power follow all the normal rules for astral perception" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.168

Searched: `/hasAstralPerception|canPerceiveAstrally|adeptAstral/` — no matches.

Cost 2 is in the pack; no code reads the power (no Astral Perception gating anywhere).

### magic/physical-adepts.md#28

Guide: | **Improved Sense** | .25 per improvement | A sense the race doesn't have: low-light, thermographic, high- or low-frequency hearing, direction sense, improved scent or taste, flare compensation, sound dampening. Anything cyberware provides except radio and similar technology. No package deals. |

> "Improvements include Low-Light or Thermo-" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.169
> "Unlike cyberware, there are no package deals on cost." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.170

Searched: `/improvedSense/` — no matches.

The fourteen Improved Sense items ship at .25 each, but none has an effect in the code (descriptions only).

### magic/physical-adepts.md#35

Guide: | **Suspended State** | 1 | A meditative state that slows metabolism and bleeding: Willpower (4) Test, with injury modifiers, read like the Hibernate spell (p.194). Switches on by itself if the adept falls unconscious from a Deadly physical wound. |

> "To use Suspended State, roll your Willpower against a target number of 4" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.171
> "the power automatically activates." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.171

Searched: `/suspendedState|hibernate/`, `/suspendedState|hibernate/`, `/suspendedState|hibernate/` — no matches.

Cost 1 is in the pack; nothing resolves the power.

### magic/physical-adepts.md#78

Guide: | **Blind Fighting** | .5 | The visibility modifier for blind fire or full darkness becomes +4. |

> "function more effectively without sight. Blind fighting reduces" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.149

Searched: `/blindFighting|adept.{0,30}blind fighting/` — no matches.

Cost .5 is in the pack; no code applies the +4 visibility.

### magic/physical-adepts.md#80

Guide: | **Delay Damage** | 1 (obvious) or 2 (silent) | An unarmed hit's damage is held in the target's aura and lands at a time the adept chooses, within 24 hours. The adept sustains it at +2 to all tests. |

> "The delay damage power allows an adept to inflict dam-" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.149

Searched: `/delayDamage|delayedDamage/` — no matches.

Costs 1 / 2 are in the pack (two items); the delayed-damage mechanic is not coded.

### magic/physical-adepts.md#81

Guide: | **Distance Strike** | 2 | An unarmed attack at range, up to Magic in meters. The target defends as against a ranged attack. |

> "This power allows an adept to "transmit" an unarmed" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.149

Searched: `/distance.?strike/` — no matches.

Cost 2 is in the pack; not coded.

### magic/physical-adepts.md#82

Guide: | **Empathic Sense** | .5 | Perception (4) Test to read the emotions of people the adept can see, using the Assensing Table. |

> "Empathic sense grants a limited form of magical aware-" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.150

Searched: `/empathic.?sense/` — no matches.

Cost .5 is in the pack; not coded.

### magic/physical-adepts.md#84

Guide: | **Freefall** | .25 per level | Fall 2 meters per level without injury. |

> "For each level of freefall, an adept can fall a distance of 2" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.150

Searched: `/freefallLevel|adeptFreefall|cushion/` — no matches.

Cost .25 per level is in the pack; the 2 m per level is only a sheet note (config.js freefall note).

### magic/physical-adepts.md#87

Guide: | **Magic Sense** | .5 | Sense magic within Magic × 5 meters, read with the Detection Spell Table. |

> "The magic sense power allows an adept to sense magical" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.150

Searched: `/magic.?sense/` — no matches.

Cost .5 is in the pack; not coded.

### magic/physical-adepts.md#88

Guide: | **Missile Mastery** | 1 | Pens and credsticks become thrown weapons, (Strength ÷ 2, round down)L. +2 Power to real throwing weapons. |

> "An adept with missile mastery has such a highly devel-" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.150

Searched: `/missile.?mastery/` — no matches.

Cost 1 is in the pack; not coded.

### magic/physical-adepts.md#89

Guide: | **Nerve Strike** | 1 | An unarmed attack at TN 4 + the target's Impact armor. Every 2 net successes cost the target 1 Quickness instead of doing damage. |

> "Nerve strilte allows an adept to inflict damage that affects" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.150

Searched: `/nerve.?strike/` — no matches.

Cost 1 is in the pack; not coded.

### magic/physical-adepts.md#90

Guide: | **Quick Draw** | .5 | The pistol quick-draw rule (SR3 p.107) for any weapon, with a Reaction (4) Test. |

> "The quiclt draw power allows an adept to use the quiclt-" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.151

Searched: `/quick.?draw.{0,40}adept|adept.{0,40}quick.?draw/` — no matches.

Cost .5 is in the pack; the pistol quick-draw rule exists (ready-weapon.mjs) but nothing lets the power extend it to other weapons.

### magic/physical-adepts.md#94

Guide: | **Smashing Blow** | 1 | Unarmed Combat (4) Test; add the successes to Strength and compare with the Barrier Rating (SR3 p.124). |

> "The adept makes an Unarmed Combat Test against a Target" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.151

Searched: `/smashing.?blow/` — no matches.

Cost 1 is in the pack; not coded (the Barrier Damage tool exists but is separate).

### magic/physical-adepts.md#97

Guide: | **Traceless Walk** | .5 | Leave no tracks on snow, sand or paper, make no footstep noise (+4 to hearing Perception), and don't trip pressure sensors. |

> "An adept with the traceless wallt power can move over" — Shadowrun 3e - Magic in the Shadows.pdf, printed p.151

Searched: `/tracelessWalk/` — no matches.

Cost .5 is in the pack; not coded.

### magic/spellcasting.md#7

Guide: | **Caster** | **Sorcery** + Spell Pool (no more pool dice than Sorcery dice) | The target's attribute, or the spell's listed TN | Step 3 |

> "No more Spell Pool dice can be used than the number of Sorcery dice allocated to the test" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.180

Searched: `/magicDice\s*=\s*Math\.min\([^\n]*sorcery|min\([^\n]*sorceryDice[^\n]*availMagic/` — no matches.

Sorcery + Spell Pool against the target's attribute is implemented; the cap 'no more Spell Pool dice than Sorcery dice' is not — `_promptMagicPool(actor, availMagic)` offers everything available (SR3EItem.js:4548-4568).

### magic/spellcasting.md#11

Guide: | **GM** | Rolls the Sorcery Test **secretly** for detection spells | | Step 3 |

> "the gamemaster, not the player, rolls the dice. The gamemaster rolls secretly" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.182

Searched: `/rolls? secretly|secret roll|gmRoll|gm rolls the dice/` — no matches.

### magic/spellcasting.md#28

Guide: - **How many Sorcery dice** go into this spell, and how many **Spell Pool**

> "No more Spell Pool dice can be used than the number of Sorcery dice allocated to the test" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.180

Searched: `/magicDice\s*=\s*Math\.min\([^\n]*sorcery|min\([^\n]*sorceryDice[^\n]*availMagic/` — no matches.

### magic/spellcasting.md#29

Guide: - **More than one spell?** You can split Sorcery and Spell Pool dice to cast

> "The caster receives a +2 target number modifier for each extra spell to the Drain Resistance Test for all of the spells" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.181

Searched: `/extra spell|extraSpells|splitSorcery|multiple spells|several spells/` — no matches.

The system casts one spell per Complex Action. Splitting Sorcery and Spell Pool dice across several spells, the Sorcery-rating limit on how many, and the +2 Drain TN per extra spell do not exist.

### magic/spellcasting.md#33

Guide: - You must **see** the target, and be **on the same plane** (physical or

> "An opaque barrier prevents the caster from seeing the target" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.182
> "prevents the caster from casting spells on that target" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.181

Searched: `/lineOfSight|hasLineOfSight|canSee\(|opaque/` — no matches.

Line of sight, plane, glass and opaque barriers are the GM's call: targets are picked from a list or found by radius, with no sight or barrier check.

### magic/spellcasting.md#34

Guide: - **Glass** doesn't stop most spells, because the effect happens at the

> "An opaque barrier prevents the caster from seeing the target" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.182
> "prevents the caster from casting spells on that target" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.181

Searched: `/lineOfSight|hasLineOfSight|canSee\(|opaque/` — no matches.

Line of sight, plane, glass and opaque barriers are the GM's call: targets are picked from a list or found by radius, with no sight or barrier check.

### magic/spellcasting.md#35

Guide: - **Touch-range spells** skip cover and visibility modifiers, but you must

> "One net success is sufficient for the caster to touch the target" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.178
> "Spells with a range of touch are not subject to cover or visibility modifiers" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.183

Searched: `/touch[^\n]*unarmed|unarmed[^\n]*touch|touch attack/` — no matches.

### magic/spellcasting.md#36

Guide: - **From the astral**, you can only cast **mana** spells, and only at astral

> "Astral targets (including dual beings) can only be affected by mana spells" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.182

Searched: `/astral targets? (can|may) only|only mana spells/` — no matches.

### magic/spellcasting.md#56

Guide: - **An astral barrier** you're casting across, such as a ward, hermetic

> "An astral barrier--such as a hermetic circle, shamanic lodge or ward--adds its Force to the target number of any spells cast across its boundaries" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.183

Searched: `/cast across|across its boundar|(ward|circle|lodge)\w*Force|barrierForce/` — no matches.

An astral barrier's Force is added only for the Detection spells (a checkbox on the cast dialog, SpellTarget.detectionTN). The general rule - a ward, hermetic circle or lodge adds its Force to the TN of any spell cast across it - is not coded.

### magic/spellcasting.md#61

Guide: - **Detection spells:** the GM rolls in secret. On all 1s, the GM gives you

> "On a roll of all ones, the gamemaster lies, giving the caster or target misleading or false information" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.182

Searched: `/gamemaster lies|false information/` — no matches.

### magic/spellcasting.md#71

Guide: - They can protect up to **their Sorcery rating** in subjects, all within

> "within a distance equal to the caster's Magic Attribute x 100 meters, can be protected" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.183
> "A character can protect a maximum number of subjects equal to their Sorcery Skill Rating" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.183

Searched: `/protected subjects?|protectedIds|subjects? protected|Magic Attribute x 100/` — no matches.

A mage's Spell Defense pool is one total for the Combat Turn. Who is protected, the Sorcery-rating limit on subjects, the Magic × 100 m range and the same-plane condition are not recorded; every defender with a pool is offered a Counterspelling roll against any spell.

### magic/spellcasting.md#95

Guide: Glass and walls **do** block elemental spells, which have to break through

> "it is impeded by physical obstructions like glass and other barriers" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.182
> "Targets hidden behind a wall within the radius of a Fireball spell will still get cooked" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.182

Searched: `/impeded by|firing through barriers|glass[^\n]*(block|stop)/` — no matches.

Elemental spells are not blocked by glass or walls in the code: nothing checks obstructions. (Everyone the area picks up is a target, which happens to match the 'hidden targets still get hit' half.)

### magic/spellcasting.md#108

Guide: | Each extra spell cast in the same action | +2 *(p.181)* |

> "The caster receives a +2 target number modifier for each extra spell to the Drain Resistance Test for all of the spells" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.181

Searched: `/extra spell|extraSpells|splitSorcery|multiple spells|several spells/` — no matches.

### magic/spellcasting.md#123

Guide: | **Permanent (P)** | Must be sustained for a base time, then becomes permanent. Sorcery successes can be spent dividing that time instead of on the effect. |

> "Divide the base time by the number of successes allocated to determine how long the spell has to be sustained" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.178

Searched: `/permanentBase|Permanent Spell Base Time|divide the base time/` — no matches.

The Permanent Spell Base Time table exists only inside the healing flow (SR3EHealing.js:72); a permanent spell cast through the Sorcery flow gets no base time, and successes cannot be allocated to divide it.

### magic/spellcasting.md#129

Guide: - An **Exclusive Action** means dropping every sustained spell first.

> "a character must drop any sustained spells" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.178

Searched: `/must drop (any|every|all) sustained|dropAllSustained|exclusiveDrop/` — no matches.

Still absent: nothing drops sustained spells when an Exclusive Action is taken. 0.7.0's spell-limit warning (spell-limits.mjs castWarnings) names casting an exclusive-limited spell as an Exclusive Action but does not drop or mention sustained spells; dropSustained is the sheet's manual one-spell drop.

### magic/spells.md#8

Guide: | **Type** | **M** (mana) or **P** (physical) | Physical spells affect physical properties, and **only they affect non-living objects**. Mana spells affect minds, spirits, life force and magic, and **only they affect astral forms** *(SR3 p.178)*. |

> "Physical spells affect the physical properties of a target." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.178
> "Only physical spells affect non-living objects." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.178
> "mana spells affect astral forms" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.178

Searched: `/only physical spells|mana spells? (can|cannot|only)|physical spells? (can|cannot|only)|spellType[^\n]{0,40}(isAstral|astralMode)/` — no matches.

The Type is recorded on every spell, but the cast flow never tests it against the target: nothing stops a Mana spell reaching a non-living target or a Physical spell reaching an astral form. (Since 0.7.0 a spell aimed at a vehicle uses the Object Resistance Table, but the Type is still not checked.)

### magic/spells.md#12

Guide: **Range.** Most spells are **line of sight**: if the caster can see the

> "One net success is sufficient for the caster to touch the target" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.178
> "Area spells affect all valid targets within the radius of effect, friend and foe alike (including th" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.181

Searched: `/touch[^\n]*unarmed|unarmed[^\n]*touch|touch attack/` — no matches.

Line of sight, area radius = Magic (spellAreaRadius, SR3EItem.js:4993) and the caster being hit are coded. The touch rule - an Unarmed Combat attack at -1 TN, one net success - is not: touch spells are only exempted from the cover/visibility window.

### magic/spells.md#15

Guide: ### Permanent spells  *(SR3 p.178)*

> "Permanent spells must be maintained for a specified period" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.178

Searched: `/permanentBase|Permanent Spell Base Time|divide the base time/` — no matches.

The base-time table exists only inside the guided healing flow (SR3EHealing.js:74); a permanent spell cast through the Sorcery flow gets no base time and its successes cannot be allocated to divide it.

### magic/spells.md#16

Guide: A permanent spell must be sustained for a base time, set by its Drain

> "The caster of a permanent spell has the option of allocating" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.178
> "Divide the base time by the number of successes allocated" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.178

Searched: `/permanentBase|Permanent Spell Base Time|divide the base time/` — no matches.

The base-time table exists only inside the guided healing flow (SR3EHealing.js:74); a permanent spell cast through the Sorcery flow gets no base time and its successes cannot be allocated to divide it.

### magic/spells.md#18

Guide: | Light | 5 Turns |

> "5 Turns modifier, since the caster only needs to touch 10 Turns the target. One net success is sufficient 15 Turns for the caster to touch the target. 20 Turns" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.178

Searched: `/permanentBase|Permanent Spell Base Time|divide the base time/` — no matches.

The base-time table exists only inside the guided healing flow (SR3EHealing.js:74); a permanent spell cast through the Sorcery flow gets no base time and its successes cannot be allocated to divide it. Row values (Light 5, Moderate 10, Serious 15, Deadly 20 Combat Turns) match the book table (read by order; the OCR splits the level names from the times) and the constant.

### magic/spells.md#19

Guide: | Moderate | 10 Turns |

> "5 Turns modifier, since the caster only needs to touch 10 Turns the target. One net success is sufficient 15 Turns for the caster to touch the target. 20 Turns" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.178

Searched: `/permanentBase|Permanent Spell Base Time|divide the base time/` — no matches.

The base-time table exists only inside the guided healing flow (SR3EHealing.js:74); a permanent spell cast through the Sorcery flow gets no base time and its successes cannot be allocated to divide it. Row values (Light 5, Moderate 10, Serious 15, Deadly 20 Combat Turns) match the book table (read by order; the OCR splits the level names from the times) and the constant.

### magic/spells.md#20

Guide: | Serious | 15 Turns |

> "5 Turns modifier, since the caster only needs to touch 10 Turns the target. One net success is sufficient 15 Turns for the caster to touch the target. 20 Turns" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.178

Searched: `/permanentBase|Permanent Spell Base Time|divide the base time/` — no matches.

The base-time table exists only inside the guided healing flow (SR3EHealing.js:74); a permanent spell cast through the Sorcery flow gets no base time and its successes cannot be allocated to divide it. Row values (Light 5, Moderate 10, Serious 15, Deadly 20 Combat Turns) match the book table (read by order; the OCR splits the level names from the times) and the constant.

### magic/spells.md#21

Guide: | Deadly | 20 Turns |

> "5 Turns modifier, since the caster only needs to touch 10 Turns the target. One net success is sufficient 15 Turns for the caster to touch the target. 20 Turns" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.178

Searched: `/permanentBase|Permanent Spell Base Time|divide the base time/` — no matches.

The base-time table exists only inside the guided healing flow (SR3EHealing.js:74); a permanent spell cast through the Sorcery flow gets no base time and its successes cannot be allocated to divide it. Row values (Light 5, Moderate 10, Serious 15, Deadly 20 Combat Turns) match the book table (read by order; the OCR splits the level names from the times) and the constant.

### magic/spells.md#23

Guide: ## Starting spells: Spell Points  *(SR3 p.55, p.60)*

> "As starting characters, full magicians receive 25 Spell Points." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.54

Searched: `/spellPoints/` — no matches.

Spell Points and character creation are not modelled.

### magic/spells.md#24

Guide: - A starting **full magician** gets **25 Spell Points**; an **aspected

> "As starting characters, full magicians receive 25 Spell Points." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.54
> "All aspected magicians start off with 35 Spell Points." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.55
> "Because adepts do not use spells, they get no Spell Points." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.55

Searched: `/spellPoints/` — no matches.

### magic/spells.md#25

Guide: - A spell costs **1 Spell Point per point of Force**.

> "Spell Points are used to purchase spells, at a rate of 1 Spell Point" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.54

Searched: `/spellPoints/` — no matches.

### magic/spells.md#26

Guide: - Spell Points can also bond foci, at 1 Spell Point per point of Karma, and

> "Players can also spend Spell Points to begin the game with" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.55
> "(again, at a rate of 1 Spell Point per point of Karma)" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.55

Searched: `/spellPoints/` — no matches.

### magic/spells.md#27

Guide: - More Spell Points cost **25,000¥ each**, up to **50** in all, and only at

> "per point, up to a maximum of 50 Spell Points" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.55
> "Spell Points cannot be sold back for the nuyen." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.55

Searched: `/spellPoints/` — no matches.

### magic/spells.md#28

Guide: - No starting spell, focus or spirit can be above **Force 6**.

> "Starting full magicians may not have any spells, foci or spirits higher than Force 6." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.55

Searched: `/spellPoints/` — no matches.

### magic/spells.md#31

Guide: You learn from a **teacher** or a **spell formula**, of your own tradition.

> "You can only learn a spell from a teacher or formula of the same tradition you follow." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.180

Searched: `/sameTradition|tradition.{0,30}teacher/` — no matches.

### magic/spells.md#32

Guide: | **Where you study** | A shaman needs a **lodge**, a mage a **Sorcery library**, rated at least the desired Force. |

> "must study in a shamanic lodge with a rating at least equal to the desired Force of the spell" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.180
> "The mage needs a Sorcery library with a rating at least equal to the desired Force of the spell." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.180

Searched: `/sorcery library|shamanic lodge/`, `/sorcery library|shamanic lodge/`, `/sorcery library|shamanic lodge/` — no matches.

### magic/spells.md#33

Guide: | **A teacher** | Typically **1,000¥ × the Force**, plus living expenses. They can teach up to the Force they know. With the Instruction skill, every 2 successes on an Instruction (4) Test add a die to your test. |

> "a typical price is 1,000 nuyen times the spell's desired Force, plus living expenses" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.180
> "Each 2 successes from this test add an additional die to the student's Sorcery Test to learn the spell." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.180

Searched: `/instructionTest|Instruction \(4\)|teacher/` — no matches.

### magic/spells.md#34

Guide: | **A formula** | Bought from a talismonger. For a spell with variable Drain, price it at its highest Drain. |

> "A formula is the published version of a spell, available for" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.180
> "use the highest applicable Drain to determine the cost of the spell's formula" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.180

Searched: `/spell.?formula/` — no matches.

### magic/spells.md#35

Guide: | **The test** | **Sorcery**, with Magic Background as a Complementary Skill, against **twice the desired Force**. Shamans get totem modifiers; injury and sustaining modifiers apply. |

> "requires a Sorcery Test; the Magic Background Skill can be used as a Complementary Skill for this test. The target number is twice the desired Force of the spell." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.180

Searched: `/learnSpellTest|learning test|twice the desired force/` — no matches.

The guide (units 172-173) says the test is the GM's to run; the code has no learning roll.

### magic/spells.md#36

Guide: | **The time** | **Days equal to the Force, divided by the successes**; at least one day. |

> "Learning a spell requires a number of days equal to the desired Force. Divide this time by the number of successes. The minimum time is one day." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.180

Searched: `/learnSpellTest|learning test|daysToLearn/` — no matches.

### magic/spells.md#38

Guide: | **Failure** | No successes wastes days equal to the Force. Failed study costs no Karma, but the teacher still expects to be paid. |

> "A failed attempt wastes a number of days equal to the desired Force. Failed study does not cost Karma, but teachers still expect to be paid." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.180

Searched: `/learnSpellTest|learning test|daysToLearn/` — no matches.

### magic/spells.md#40

Guide: ### Spell formula prices  *(SR3 p.305)*

> "Force/24 hrs Force x 50� 2 Force/48 hrs Force/72 hrs Force x 100� 2 Force/7 days Force x 500� 2 Force x 1,000� 2" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.305

Searched: `/spell.?formula/` — no matches.

Spell formula prices are not modelled (spells are items; no formula purchase).

### magic/spells.md#42

Guide: | L | Force / 24 hrs | Force × 50¥ | 2 |

> "Force/24 hrs Force x 50� 2 Force/48 hrs Force/72 hrs Force x 100� 2 Force/7 days Force x 500� 2 Force x 1,000� 2" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.305

Searched: `/spell.?formula/` — no matches.

Spell Formulas table: L Force/24 hrs Force x 50, M Force/48 hrs Force x 100, S Force/72 hrs Force x 500, D Force/7 days Force x 1,000, street index 2 (rows paired with the Drain levels by order; the OCR splits them). The guide matches. No formula price anywhere in the code.

### magic/spells.md#43

Guide: | M | Force / 48 hrs | Force × 100¥ | 2 |

> "Force/24 hrs Force x 50� 2 Force/48 hrs Force/72 hrs Force x 100� 2 Force/7 days Force x 500� 2 Force x 1,000� 2" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.305

Searched: `/spell.?formula/` — no matches.

Spell Formulas table: L Force/24 hrs Force x 50, M Force/48 hrs Force x 100, S Force/72 hrs Force x 500, D Force/7 days Force x 1,000, street index 2 (rows paired with the Drain levels by order; the OCR splits them). The guide matches. No formula price anywhere in the code.

### magic/spells.md#44

Guide: | S | Force / 72 hrs | Force × 500¥ | 2 |

> "Force/24 hrs Force x 50� 2 Force/48 hrs Force/72 hrs Force x 100� 2 Force/7 days Force x 500� 2 Force x 1,000� 2" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.305

Searched: `/spell.?formula/` — no matches.

Spell Formulas table: L Force/24 hrs Force x 50, M Force/48 hrs Force x 100, S Force/72 hrs Force x 500, D Force/7 days Force x 1,000, street index 2 (rows paired with the Drain levels by order; the OCR splits them). The guide matches. No formula price anywhere in the code.

### magic/spells.md#45

Guide: | D | Force / 7 days | Force × 1,000¥ | 2 |

> "Force/24 hrs Force x 50� 2 Force/48 hrs Force/72 hrs Force x 100� 2 Force/7 days Force x 500� 2 Force x 1,000� 2" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.305

Searched: `/spell.?formula/` — no matches.

Spell Formulas table: L Force/24 hrs Force x 50, M Force/48 hrs Force x 100, S Force/72 hrs Force x 500, D Force/7 days Force x 1,000, street index 2 (rows paired with the Drain levels by order; the OCR splits them). The guide matches. No formula price anywhere in the code.

### magic/spells.md#46

Guide: **Worked example.** A mage learns **Manabolt at Force 5** from a formula.

> "Force/24 hrs Force x 50� 2 Force/48 hrs Force/72 hrs Force x 100� 2 Force/7 days Force x 500� 2 Force x 1,000� 2" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.305
> "The target number is twice the desired Force of the spell." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.180

Searched: `/spell.?formula/` — no matches.

Example re-computed: Manabolt priced at D = 5 x 1,000 = 5,000 Y, availability 5 / 7 days, library 5, TN 5 x 2 = 10, 5 / 1 = 5 days, 5 Karma - all consistent with the book. Only the Karma (5) is coded.

### magic/spells.md#68

Guide: The sense reaches **Force × the caster's Magic** in meters. The caster must

> "multiply the spell's Force by the caster's Magic Attribute for the distance in meters" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.192
> "The subject must be touched by the caster to receive the spell." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.192

Searched: `/detectionRange|senseRange/` — no matches.

The range of the new sense is not computed; the cast flow has no detection-specific handling.

### magic/spells.md#88

Guide: | Successes | Detection Spell Results *(SR3 p.192)* |

> "DETECTION SPELL RESULTS Successes Results" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.192

Searched: `/detectionResults|Only general knowledge|minor parts are (inaccurate|obscure)/` — no matches.

The Detection Spell Results table (successes -> information given) is not coded; only the Detection Target Number table is (0.7.0, 742bb050).

### magic/spells.md#89

Guide: | 1 | Only general knowledge, no details. |

> "1 Only general knowledge, no details." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.192

Searched: `/detectionResults|Only general knowledge|minor parts are (inaccurate|obscure)/` — no matches.

The Detection Spell Results table (successes -> information given) is not coded; only the Detection Target Number table is (0.7.0, 742bb050).

### magic/spells.md#90

Guide: | 2 | Detailed information, but some minor parts are inaccurate. |

> "2 Detailed information, but some minor parts are inaccurate." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.192

Searched: `/detectionResults|Only general knowledge|minor parts are (inaccurate|obscure)/` — no matches.

The Detection Spell Results table (successes -> information given) is not coded; only the Detection Target Number table is (0.7.0, 742bb050).

### magic/spells.md#91

Guide: | 3 | All details are accurate, but minor parts are obscure or missing. |

> "3 All details are accurate, but minor parts are obscure or missing." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.192

Searched: `/detectionResults|Only general knowledge|minor parts are (inaccurate|obscure)/` — no matches.

The Detection Spell Results table (successes -> information given) is not coded; only the Detection Target Number table is (0.7.0, 742bb050).

### magic/spells.md#92

Guide: | 4 | Accurate and detailed information. |

> "4 Accurate and detailed information." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.192

Searched: `/detectionResults|Only general knowledge|minor parts are (inaccurate|obscure)/` — no matches.

The Detection Spell Results table (successes -> information given) is not coded; only the Detection Target Number table is (0.7.0, 742bb050).

### magic/spells.md#117

Guide: Illusions can't do lasting harm. **Mana** illusions fool minds, not

> "If the observer generates equal or more successes in a Resistance Test, then the observer determines" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.195
> "Mana illusions are resisted by Willpower, while physical illusions are resisted by Intelligence." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.195
> "All indirect illusions are resisted by Intelligence." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.195

Searched: `/seeThrough|illusionResist|illusion(Test|Success)/` — no matches.

The pack carries W or I as each illusion's target so the resisting attribute follows from the spell record, but the rule that equal or more successes sees through the illusion has no code: an illusion is cast and resisted like any other spell and nothing marks it penetrated.

### magic/spells.md#134

Guide: Many have a **Threshold**: after the Resistance Test, the caster needs at

> "Many manipulation spells have a Threshold; this is" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.196
> "a number of successes required for the spell to function." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.196

Searched: `/spellThreshold|manipulationThreshold/` — no matches.

Thresholds are not coded.

### magic/spells.md#135

Guide: **Control manipulations** are resisted by Willpower, with a Threshold of

> "Control manipulations affect the actions and the thoughts" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.196
> "and have a Threshold equal to half the target's Willpower (round down)." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.196

Searched: `/spellThreshold|manipulationThreshold/` — no matches.

Thresholds are not coded.

### rules/combat.md#19

Guide: | **Change Position** | Stand up or lie down. Wounded characters make a Willpower (2) Test to stand. *(p.106)* |

> "he must make a Willpower (2) Test to stand up" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.106

Searched: `/stand up|standUp|changePosition|Change Position/` — no matches.

### rules/combat.md#26

Guide: | **Shift Perception** | Switch to or from astral perception. *(p.107)* |

> "A Simple Action allows a magician to shift perception" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.107

Searched: `/shiftPerception|Shift Perception/` — no matches.

### rules/combat.md#36

Guide: | **Astral Projection** | Leaving or returning to your body. *(p.107)* |

> "Returning to his physical body also takes a Complex Action" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.107

Searched: `/astralProjection|Astral Projection.*Complex|project.*complex/` — no matches.

### rules/combat.md#40

Guide: **Movement doesn't use an action.** Walking rate is Quickness in meters

> "maximumRunning rate is equal to Quickness times his running modifier" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.108

Searched: `/walkingRate|runningRate|Walking Rate|Running Rate|runMult|movementRate/` — no matches.

Movement rates (walking = Quickness, running = Quickness × 3, dwarf × 2) are not computed anywhere; only the resulting TN modifiers exist as GM-ticked rows in the attack window.

### rules/combat.md#86

Guide: | Laser sight (to 50 m; defeated by mist, smoke, fog or rain) | −1 |

> "Laser sights are only effective out to 50 meters from the weapon; mist, light or heavy smoke, fog or rain all counteract them" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.112

Searched: `/laser[^\n]*(50\s*m|mist|fog|smoke)/` — no matches.

The -1 exists as a laser-sight row, but the two qualifiers in this row are not modelled: the 50 m limit and the mist / smoke / fog / rain cancellation. The row is a checkbox pre-ticked from the weapon's laserSight flag.

### rules/combat.md#130

Guide: 2. **Sorcery Test**: Sorcery dice plus up to an equal number of **Spell

> "No more Spell Pool dice can be added to the test than the Sorcery dice allocated" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.182
> "Consult the Object Resistance Table for examples of objects and materials" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.182

Searched: `/magicDice\s*=\s*Math\.min\([^\n]*sorcery|min\([^\n]*sorceryDice[^\n]*availMagic/` — no matches.

Implemented from this unit: the Sorcery Test against the target's Willpower (mana) or Body (physical), the Object Resistance Table for a vehicle or Analyze Device target (0.7.0, 742bb050), and the all-ones glitch adding +2 to the Drain TN. Not implemented: the cap "no more Spell Pool dice than Sorcery dice allocated" - the prompt offers everything available (SR3EItem.js _promptMagicPool). Loose objects cannot be targeted.

### rules/combat.md#139

Guide: - **Hacking Pool** = (Intelligence + MPCP) ÷ 3, rounded down. You can add at

> "Hacking Pool dice cannot be used in Body or Willpower Tests to resist the effects of gray or black ice" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.44
> "Hacking Pool also may not be used with Etiquette (Matrix) Tests" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.44
> "The maximum number of Hacking Pool dice that can be added to any test is equal to the base number of skill dice in use" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.44

Searched: `/black IC|gray IC|lethal black|Etiquette \(Matrix\)/` — no matches.

The formula is implemented (SR3EActor.js:2304, and the Orthodox equivalent). Not implemented: (1) the cap 'the maximum number of Hacking Pool dice that can be added to any test is equal to the base number of skill dice' — the pool prompts offer everything available (only defaulting caps it); (2) the prohibition on Hacking Pool for Body / Willpower resistance against gray or black IC (no IC damage resistance flow exists for the Orthodox ruleset); (3) the prohibition on Etiquette (Matrix) tests.

### rules/combat.md#146

Guide:   - **Gray** attacks your deck and utilities: blaster, ripper, sparky, tar

> "Gray IC programs attack a decker's cyberdeck and utilities" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.228
> "The reactive IC known as tar pit IC operates and attacks in" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.229

Searched: `/Tar Pit|tar pit|tarPit/` — no matches.

Tar pit is a gray IC in the book (printed p.229) but the Orthodox IC sheet's type list has no 'Tar Pit' (Probe, Trace, Blaster, Crippler, Tar Baby, Scramble, Killer, Ripper, Marker, Sparky). Blaster, ripper and sparky are present.

### rules/combat.md#147

Guide:   - **Black** attacks **you**. Against lethal black IC you resist with

> "the decker must spend a Complex Action and make a successful Willpower (Black IC Rating) Test to jack out" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.230
> "Hardening reduces the Power of the damage for these Resistance Tests" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.230
> "The Hacking Pool may not be used for this test, though Karma Pool dice may be" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.230

Searched: `/orthodoxDeck\??\.hardening|lethal black|non-lethal black|Black IC Rating/` — no matches.

No black-IC handling exists in the Orthodox flow: no lethal/non-lethal distinction, no Body resistance reduced by Hardening (the Hardening field is on the sheet but read by no roll), no Hacking Pool prohibition, and no jack-out Complex Action with a Willpower (IC Rating) Test after a black-IC hit.

### rules/combat.md#148

Guide: - **Tortoises** (cyberterminals) can't be hurt by black IC or dump shock.

> "tortoise users cannot be hurt by black IC or dump shock" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.208

Searched: `/tortoise[^\n]*(immune|cannot be hurt)|immune[^\n]*(dump|tortoise)/` — no matches.

Tortoise (TRM) is a Matrix mode that affects initiative and TN in the Defragged ruleset, but no code makes a tortoise immune to black IC or dumpshock.

### rules/combat.md#158

Guide: - **Vehicle Damage Resistance**: vehicle Body plus Control Pool dice up to

> "plus any available Control Pool dice up to the character's Driving Skill Rating" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.149
> "Riggers may attempt to dodge any ranged combat attack using Control Pool instead of Combat Pool dice" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.149

Searched: `/riggers? (may|can) dodge|controlPool[^\n]*(dodge|soak)|(dodge|soak)[^\n]*controlPool/` — no matches.

A vehicle target rolls no Control Pool dice on its Damage Resistance Test (the soak card's pool is forced to 0 for vehicles, SR3EActor.js:8300) and vehicles never dodge, so a rigger's Control Pool dodge against Handling does not exist.

### rules/decking-defragged.md#29

Guide: Tortoise adds **+2 TN** to every Matrix test and cybercombat roll. Only VR-Hot gets true Matrix

> "Tortoise users add +2 to the TN for all tests to" — Shadowrun 3e - The Matrix Defragged v2.pdf, printed p.10

Searched: `/TRM.{0,80}\+ ?2|tortoiseTN|tnModifier/` — no matches.

User-mode Initiative is modelled (SR3EActor.js:10508); the Tortoise +2 TN is only a description in config (CF matrixUserModes.tnModifier), never added to a roll.

### rules/decking-defragged.md#31

Guide: Four Intelligence-linked skills cover the Matrix: **Computer** (legitimate use — logons, moving

> "This skill is essential to any character who needs" — Shadowrun 3e - The Matrix Defragged v2.pdf, printed p.11
> "opposed by the host's Sys/Sec rating. Failing to" — Shadowrun 3e - The Matrix Defragged v2.pdf, printed p.11

Searched: `/Default: Electronics|defaultsFrom|defaultFrom/` — no matches.

The four skills exist, linked to Intelligence (config.js:153-156); the MDF default chain (Computer from Electronics, the rest from Computer) is not encoded — defaulting runs the generic Default Table.

### rules/decking-defragged.md#35

Guide: **Response** on a deck is the Matrix's version of wired reflexes: each point adds **+2 Reaction**

> "Response cannot exceed the deck's MPCP rating/3" — Shadowrun 3e - The Matrix Defragged v2.pdf, printed p.14
> "available to the decker while operating in VR-Hot" — Shadowrun 3e - The Matrix Defragged v2.pdf, printed p.14

Searched: `/responseMax|response.{0,40}Math\.floor|maxResponse/` — no matches.

Response adds +2 Reaction and +1D6 only in VR-Hot (SR3EActor.js, the VR-Hot initiative branch); the cap of ⌊MPCP ÷ 3⌋ (minimum 1) is not checked — the deck item takes any Response.

### rules/decking-defragged.md#39

Guide: | Aztlan | 8 | Orange (3) |

> "RTG SYS/SEC TABLE Aztlan 8 Orange (3)" — Shadowrun 3e - The Matrix Defragged v2.pdf, printed p.15

Searched: `/Aztlan|Tsimshian|California Free State/` — no matches.

The RTG Sys/Sec Table is not shipped; the GM enters a grid as a host actor.

### rules/decking-defragged.md#40

Guide: | California Free State | 6 | Green (2) |

> "California Free State 6 Green (2)" — Shadowrun 3e - The Matrix Defragged v2.pdf, printed p.15

Searched: `/Aztlan|Tsimshian|California Free State/` — no matches.

The RTG Sys/Sec Table is not shipped; the GM enters a grid as a host actor.

### rules/decking-defragged.md#41

Guide: | CAS | 6 | Green (2) |

> "RTG SYS/SEC TABLE CAS 6 Green (2)" — Shadowrun 3e - The Matrix Defragged v2.pdf, printed p.15

Searched: `/Aztlan|Tsimshian|California Free State/` — no matches.

Guide corrected in 0.6.3 (e06c95f7); it was guide-differs in this check. The RTG table is not shipped; the GM enters a grid as a host actor.

### rules/decking-defragged.md#42

Guide: | Québec | 6 | Green (2) |

> "RTG SYS/SEC TABLE RTG SYSTEM RATING" — Shadowrun 3e - The Matrix Defragged v2.pdf, printed p.15

Searched: `/Aztlan|Tsimshian|California Free State/` — no matches.

The RTG Sys/Sec Table is not shipped; the GM enters a grid as a host actor. Québec 6 / Green (2) read from the page image (the OCR drops the accent line).

### rules/decking-defragged.md#43

Guide: | Tir Tairngire | 7 | Orange (3) |

> "SYSTEM SECURITY RATING TIER" — Shadowrun 3e - The Matrix Defragged v2.pdf, printed p.15

Searched: `/Aztlan|Tsimshian|California Free State/` — no matches.

The RTG Sys/Sec Table is not shipped; the GM enters a grid as a host actor. Tir Tairngire 7 / Orange (3) read from the page image.

### rules/decking-defragged.md#44

Guide: | Tsimshian | 8 | Orange (3) |

> "RTG SYSTEM SECURITY RATING TIER" — Shadowrun 3e - The Matrix Defragged v2.pdf, printed p.15

Searched: `/Aztlan|Tsimshian|California Free State/` — no matches.

The RTG Sys/Sec Table is not shipped; the GM enters a grid as a host actor. Tsimshian 8 / Orange (3) read from the page image.

### rules/decking-defragged.md#45

Guide: | UCAS | 6 | Green (2) |

> "Aztlan 8 Orange (3) California Free State 6 Green (2)" — Shadowrun 3e - The Matrix Defragged v2.pdf, printed p.15

Searched: `/Aztlan|Tsimshian|California Free State/` — no matches.

The RTG Sys/Sec Table is not shipped; the GM enters a grid as a host actor. UCAS 6 / Green (2) read from the page image.

### rules/decking-defragged.md#46

Guide: *(MDF p.15 — a partial list; the book covers every North American and several overseas grids.)*

> "Aztlan 8 Orange (3) California Free State 6 Green (2)" — Shadowrun 3e - The Matrix Defragged v2.pdf, printed p.15

Searched: `/Aztlan|Tsimshian|California Free State/` — no matches.

Citation for the table above.

### rules/decking-defragged.md#60

Guide: | Boot Utility | Computer vs Utility Rating | | |

> "This prompt allows the user to load or overwrite a" — Shadowrun 3e - The Matrix Defragged v2.pdf, printed p.16

Searched: `/Crack Protections|Scrub Datastream|Jam Signal|Toggle Visibility|Search and Render/` — no matches.

Programs are loaded into slots by drag and drop, with no roll; the Boot Utility test is not modelled.

### rules/decking-defragged.md#61

Guide: | Configure Protections | Computer vs System Rating | | |

> "This prompt targets an icon (usually a datafile or" — Shadowrun 3e - The Matrix Defragged v2.pdf, printed p.16

Searched: `/Crack Protections|Scrub Datastream|Jam Signal|Toggle Visibility|Search and Render/` — no matches.

The general prompts other than Access Node are not in the system's prompt list (SR3EHostSheet.js); cybercombat has its own button.

### rules/decking-defragged.md#62

Guide: | Crack Protections | Passcode/Hacking vs Sys/Sec of the protection | ✗ | |

> "disable a Databomb, respectively. Failing this test" — Shadowrun 3e - The Matrix Defragged v2.pdf, printed p.16

Searched: `/Crack Protections|Scrub Datastream|Jam Signal|Toggle Visibility|Search and Render/` — no matches.

Guide corrected in 0.6.3 (e06c95f7); it was guide-differs in this check. The prompt is not in the system's list.

### rules/decking-defragged.md#63

Guide: | Jam Signal | Computer vs System Rating | | |

> "This prompt targets a Visible icon, filling its PAN" — Shadowrun 3e - The Matrix Defragged v2.pdf, printed p.16

Searched: `/Crack Protections|Scrub Datastream|Jam Signal|Toggle Visibility|Search and Render/` — no matches.

The general prompts other than Access Node are not in the system's prompt list (SR3EHostSheet.js); cybercombat has its own button.

### rules/decking-defragged.md#64

Guide: | Jump Grid/Host | Computer vs System Rating | | |

> "This prompt allows the user to jump from their" — Shadowrun 3e - The Matrix Defragged v2.pdf, printed p.16

Searched: `/Crack Protections|Scrub Datastream|Jam Signal|Toggle Visibility|Search and Render/` — no matches.

The general prompts other than Access Node are not in the system's prompt list (SR3EHostSheet.js); cybercombat has its own button.

### rules/decking-defragged.md#65

Guide: | Logon to System | Computer vs System Rating | | |

> "This prompt connects users to their Regional" — Shadowrun 3e - The Matrix Defragged v2.pdf, printed p.17

Searched: `/Crack Protections|Scrub Datastream|Jam Signal|Toggle Visibility|Search and Render/` — no matches.

Logging on is the User Mode button and host choice, with no roll.

### rules/decking-defragged.md#66

Guide: | Repair an Icon | Computer vs System Rating | | |

> "This prompt repairs Overload Damage dealt to a" — Shadowrun 3e - The Matrix Defragged v2.pdf, printed p.17

Searched: `/Crack Protections|Scrub Datastream|Jam Signal|Toggle Visibility|Search and Render/` — no matches.

The general prompts other than Access Node are not in the system's prompt list (SR3EHostSheet.js); cybercombat has its own button.

### rules/decking-defragged.md#67

Guide: | Scrub Datastream | Hacking vs Sys/Sec | ✗ | |

> "This prompt allows the user to clean up the digital" — Shadowrun 3e - The Matrix Defragged v2.pdf, printed p.17

Searched: `/Crack Protections|Scrub Datastream|Jam Signal|Toggle Visibility|Search and Render/` — no matches.

The general prompts other than Access Node are not in the system's prompt list (SR3EHostSheet.js); cybercombat has its own button.

### rules/decking-defragged.md#68

Guide: | Search and Render | Computer vs System Rating | | |

> "This prompt allows the user to inspect their virtual" — Shadowrun 3e - The Matrix Defragged v2.pdf, printed p.17

Searched: `/Crack Protections|Scrub Datastream|Jam Signal|Toggle Visibility|Search and Render/` — no matches.

The general prompts other than Access Node are not in the system's prompt list (SR3EHostSheet.js); cybercombat has its own button.

### rules/decking-defragged.md#69

Guide: | Send Transmission | Computer vs System Rating | | |

> "This prompt allows the user to transmit and/" — Shadowrun 3e - The Matrix Defragged v2.pdf, printed p.17

Searched: `/Crack Protections|Scrub Datastream|Jam Signal|Toggle Visibility|Search and Render/` — no matches.

The general prompts other than Access Node are not in the system's prompt list (SR3EHostSheet.js); cybercombat has its own button.

### rules/decking-defragged.md#70

Guide: | Terminate Session | Computer vs 4 (Willpower vs 10 if Link-Locked) | | |

> "A single success on a basic Computer test is all that's" — Shadowrun 3e - The Matrix Defragged v2.pdf, printed p.17

Searched: `/Crack Protections|Scrub Datastream|Jam Signal|Toggle Visibility|Search and Render/` — no matches.

The general prompts other than Access Node are not in the system's prompt list (SR3EHostSheet.js); cybercombat has its own button.

### rules/decking-defragged.md#71

Guide: | Toggle Visibility | Computer vs System Rating | | |

> "Utilizing this prompt allows the user to toggle" — Shadowrun 3e - The Matrix Defragged v2.pdf, printed p.17

Searched: `/Crack Protections|Scrub Datastream|Jam Signal|Toggle Visibility|Search and Render/` — no matches.

The general prompts other than Access Node are not in the system's prompt list (SR3EHostSheet.js); cybercombat has its own button.

### rules/decking-defragged.md#103

Guide: | Hardlined via a datajack or trodes | −2 |

> "Hardlined via a datajack or trodes -2" — Shadowrun 3e - The Matrix Defragged v2.pdf, printed p.15

Searched: `/hardline|Hardlined|datajack.{0,30}-2/` — no matches.

The Sys/Sec modifiers are typed into the TN by hand; none is applied automatically.

### rules/decking-defragged.md#104

Guide: | Operating from a Tortoise Terminal | +2 |

> "Operating in a Tortoise Terminal +2" — Shadowrun 3e - The Matrix Defragged v2.pdf, printed p.15

Searched: `/TRM.{0,80}\+ ?2|tortoiseTN|tnModifier/` — no matches.

See #29.

### rules/decking-defragged.md#105

Guide: | Maintaining real-time contact with people outside the Matrix | +1 |

> "Maintaining real-time communication with meat world associates +1" — Shadowrun 3e - The Matrix Defragged v2.pdf, printed p.15

Searched: `/realTime|meatWorldContact|real-time/` — no matches.

Not applied automatically.

### rules/decking-defragged.md#120

Guide: A decker who crashes an enemy icon while running the **Suppression** utility can degrade it

> "in an active utility slot, may degrade 1 point of the" — Shadowrun 3e - The Matrix Defragged v2.pdf, printed p.26

Searched: `/suppression|Suppression/` — no matches.

The Suppression utility ships as a program item; nothing in the rules code reads it (TODO 128).

### rules/decking-defragged.md#121

Guide: {: .note }

> "Crashing an icon without Suppressing it" — Shadowrun 3e - The Matrix Defragged v2.pdf, printed p.23

Searched: `/suppression|Suppression/` — no matches.

The guide's note says the same.

### rules/decking-defragged.md#140

Guide: - You're also rattled for the next 10 minutes — everything you do carries a **+2 TN** penalty

> "The user applies a +2 to all target" — Shadowrun 3e - The Matrix Defragged v2.pdf, printed p.27
> "numbers for the next 10 minutes. In" — Shadowrun 3e - The Matrix Defragged v2.pdf, printed p.27

Searched: `/next 10 minutes|dumpshockDisorient|mdfDisorient/` — no matches.

The Defragged dump shock card states no +2 for ten minutes (the rigger card states its own p.156 disorientation).

### rules/decking-defragged.md#210

Guide: {: .note }

> "Crashing an icon without Suppressing it" — Shadowrun 3e - The Matrix Defragged v2.pdf, printed p.23

Searched: `/suppression|Suppression/` — no matches.

The guide's note says the same (TODO 128).

### rules/decking.md#8

Guide: Most ordinary Matrix users aren't running a full cyberdeck at all — they're on a **cyberterminal**

> "positive side, tortoise users cannot be hurt by black IC or dump" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.208

Searched: `/orthodox.{0,40}(tortoise|cyberterminal)|cyberterminal.{0,40}dump ?shock/` — no matches.

The Orthodox ruleset has no cyberterminal mode; the dump shock and IC cards do not exempt a tortoise user.

### rules/decking.md#12

Guide: Outside combat, a decker's number of actions per turn comes from their Reaction divided by 10

> "Initiative. Instead, divide the decker's Reaction Attribute (aug-" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.209
> "enhancements that increase the Reaction Attribute of a deck-" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.223

Searched: `/nonCombatActions|actionsPerTurn|Reaction.{0,30}/ ?10/` — no matches.

Cybercombat Initiative is implemented (base Reaction + 2 per Response Increase, 1 + Response dice, physical boosts excluded: SR3EActor.js:10549). The non-combat action count (Reaction ÷ 10, round up) and the −1D6 for talking to the physical world are not.

### rules/decking.md#27

Guide: | Analyze Host | Control | Analyze | Complex |

> "Analyze Host Test: Control Utility: Analyze Action: Complex" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.215

Searched: `/Analyze Host|Locate Access Node|Graceful Logoff|Logon to LTG|Decrypt Slave/` — no matches.

The System Test offers the five subsystems and a free-text action name; the book's per-operation list (which subsystem, which utility, which action) is not encoded — the player picks the subsystem and adjusts the TN for the utility.

### rules/decking.md#28

Guide: | Analyze IC | Control | Analyze | Free |

> "Analyze IC Test: Control Utility: Analyze Action: Free" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.215

Searched: `/Analyze Host|Locate Access Node|Graceful Logoff|Logon to LTG|Decrypt Slave/` — no matches.

The System Test offers the five subsystems and a free-text action name; the book's per-operation list (which subsystem, which utility, which action) is not encoded — the player picks the subsystem and adjusts the TN for the utility.

### rules/decking.md#29

Guide: | Analyze Icon | Control | Analyze | Free |

> "Analyze Icon Test: Control Utility: Analyze Action: Free" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.215

Searched: `/Analyze Host|Locate Access Node|Graceful Logoff|Logon to LTG|Decrypt Slave/` — no matches.

The System Test offers the five subsystems and a free-text action name; the book's per-operation list (which subsystem, which utility, which action) is not encoded — the player picks the subsystem and adjusts the TN for the utility.

### rules/decking.md#30

Guide: | Analyze Security | Control | Analyze | Simple |

> "Analyze Security Test: Control Utility: Analyze Action: Simple" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.215

Searched: `/Analyze Host|Locate Access Node|Graceful Logoff|Logon to LTG|Decrypt Slave/` — no matches.

The System Test offers the five subsystems and a free-text action name; the book's per-operation list (which subsystem, which utility, which action) is not encoded — the player picks the subsystem and adjusts the TN for the utility.

### rules/decking.md#31

Guide: | Analyze Subsystem | Targeted subsystem | Analyze | Simple |

> "Analyze Subsystem Test: Targeted Subsystem Utility: Analyze Action: Simple" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.215

Searched: `/Analyze Host|Locate Access Node|Graceful Logoff|Logon to LTG|Decrypt Slave/` — no matches.

The System Test offers the five subsystems and a free-text action name; the book's per-operation list (which subsystem, which utility, which action) is not encoded — the player picks the subsystem and adjusts the TN for the utility.

### rules/decking.md#32

Guide: | Control Slave | Slave | Spoof | Complex |

> "Control Slave Test: Slave Utility: Spoof Action: Complex" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.215

Searched: `/Analyze Host|Locate Access Node|Graceful Logoff|Logon to LTG|Decrypt Slave/` — no matches.

The System Test offers the five subsystems and a free-text action name; the book's per-operation list (which subsystem, which utility, which action) is not encoded — the player picks the subsystem and adjusts the TN for the utility.

### rules/decking.md#33

Guide: | Decrypt Access | Access | Decrypt | Simple |

> "Decrypt Access Test: Access Utility: Decrypt Action: Simple" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.216

Searched: `/Analyze Host|Locate Access Node|Graceful Logoff|Logon to LTG|Decrypt Slave/` — no matches.

The System Test offers the five subsystems and a free-text action name; the book's per-operation list (which subsystem, which utility, which action) is not encoded — the player picks the subsystem and adjusts the TN for the utility.

### rules/decking.md#34

Guide: | Decrypt File | Files | Decrypt | Simple |

> "Decrypt File Test: Files Utility: Decrypt Action: Simple" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.216

Searched: `/Analyze Host|Locate Access Node|Graceful Logoff|Logon to LTG|Decrypt Slave/` — no matches.

The System Test offers the five subsystems and a free-text action name; the book's per-operation list (which subsystem, which utility, which action) is not encoded — the player picks the subsystem and adjusts the TN for the utility.

### rules/decking.md#35

Guide: | Decrypt Slave | Slave | Decrypt | Simple |

> "Decrypt Slave Test: Slave Utility: Decrypt Action: Simple" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.216

Searched: `/Analyze Host|Locate Access Node|Graceful Logoff|Logon to LTG|Decrypt Slave/` — no matches.

The System Test offers the five subsystems and a free-text action name; the book's per-operation list (which subsystem, which utility, which action) is not encoded — the player picks the subsystem and adjusts the TN for the utility.

### rules/decking.md#36

Guide: | Download Data | Files | Read/Write | Simple |

> "Download Data Test: Files Utility: Read/Write Action: Simple" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.216

Searched: `/Analyze Host|Locate Access Node|Graceful Logoff|Logon to LTG|Decrypt Slave/` — no matches.

The System Test offers the five subsystems and a free-text action name; the book's per-operation list (which subsystem, which utility, which action) is not encoded — the player picks the subsystem and adjusts the TN for the utility.

### rules/decking.md#37

Guide: | Edit File | Files | Read/Write | Simple |

> "Edit File Test: Files Utility: Read/Write Action: Simple" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.216

Searched: `/Analyze Host|Locate Access Node|Graceful Logoff|Logon to LTG|Decrypt Slave/` — no matches.

The System Test offers the five subsystems and a free-text action name; the book's per-operation list (which subsystem, which utility, which action) is not encoded — the player picks the subsystem and adjusts the TN for the utility.

### rules/decking.md#38

Guide: | Edit Slave | Slave | Spoof | Complex |

> "Edit Slave Test: Slave Utilities: Spoof Action: Complex" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.216

Searched: `/Analyze Host|Locate Access Node|Graceful Logoff|Logon to LTG|Decrypt Slave/` — no matches.

The System Test offers the five subsystems and a free-text action name; the book's per-operation list (which subsystem, which utility, which action) is not encoded — the player picks the subsystem and adjusts the TN for the utility.

### rules/decking.md#39

Guide: | Graceful Logoff | Access | Deception | Complex |

> "Graceful Logoff Test: Access Utility: Deception Action: Complex" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.217

Searched: `/Analyze Host|Locate Access Node|Graceful Logoff|Logon to LTG|Decrypt Slave/` — no matches.

The System Test offers the five subsystems and a free-text action name; the book's per-operation list (which subsystem, which utility, which action) is not encoded — the player picks the subsystem and adjusts the TN for the utility.

### rules/decking.md#40

Guide: | Locate Access Node | Index | Browse | Complex |

> "Locate Access Node Test: Index Utility: Browse Action: Complex" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.217

Searched: `/Analyze Host|Locate Access Node|Graceful Logoff|Logon to LTG|Decrypt Slave/` — no matches.

The System Test offers the five subsystems and a free-text action name; the book's per-operation list (which subsystem, which utility, which action) is not encoded — the player picks the subsystem and adjusts the TN for the utility.

### rules/decking.md#41

Guide: | Locate Decker | Index | Scanner | Complex |

> "Locate Decker Test: Index Utility: Scanner Action: Complex" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.217

Searched: `/Analyze Host|Locate Access Node|Graceful Logoff|Logon to LTG|Decrypt Slave/` — no matches.

The System Test offers the five subsystems and a free-text action name; the book's per-operation list (which subsystem, which utility, which action) is not encoded — the player picks the subsystem and adjusts the TN for the utility.

### rules/decking.md#42

Guide: | Locate File | Index | Browse | Complex |

> "Locate File Test: Index Utility: Browse Action: Complex" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.217

Searched: `/Analyze Host|Locate Access Node|Graceful Logoff|Logon to LTG|Decrypt Slave/` — no matches.

The System Test offers the five subsystems and a free-text action name; the book's per-operation list (which subsystem, which utility, which action) is not encoded — the player picks the subsystem and adjusts the TN for the utility.

### rules/decking.md#43

Guide: | Locate IC | Index | Analyze | Complex |

> "Locate IC Test: Index Utility: Analyze Action: Complex" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.217

Searched: `/Analyze Host|Locate Access Node|Graceful Logoff|Logon to LTG|Decrypt Slave/` — no matches.

The System Test offers the five subsystems and a free-text action name; the book's per-operation list (which subsystem, which utility, which action) is not encoded — the player picks the subsystem and adjusts the TN for the utility.

### rules/decking.md#44

Guide: | Locate Slave | Index | Browse | Complex |

> "Locate Slave Test: Index Utility: Browse Action: Complex" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.217

Searched: `/Analyze Host|Locate Access Node|Graceful Logoff|Logon to LTG|Decrypt Slave/` — no matches.

The System Test offers the five subsystems and a free-text action name; the book's per-operation list (which subsystem, which utility, which action) is not encoded — the player picks the subsystem and adjusts the TN for the utility.

### rules/decking.md#45

Guide: | Logon to Host | Access | Deception | Complex |

> "Test: Access Utility: Deception Action: Complex" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.217

Searched: `/Analyze Host|Locate Access Node|Graceful Logoff|Logon to LTG|Decrypt Slave/` — no matches.

The System Test offers the five subsystems and a free-text action name; the book's per-operation list (which subsystem, which utility, which action) is not encoded — the player picks the subsystem and adjusts the TN for the utility.

### rules/decking.md#46

Guide: | Logon to LTG | Access | Deception | Complex |

> "Test: Access Utility: Deception Action: Complex" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.218

Searched: `/Analyze Host|Locate Access Node|Graceful Logoff|Logon to LTG|Decrypt Slave/` — no matches.

The System Test offers the five subsystems and a free-text action name; the book's per-operation list (which subsystem, which utility, which action) is not encoded — the player picks the subsystem and adjusts the TN for the utility.

### rules/decking.md#47

Guide: | Logon to RTG | Access | Deception | Complex |

> "Test: Access Utility: Deception Action: Complex" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.218

Searched: `/Analyze Host|Locate Access Node|Graceful Logoff|Logon to LTG|Decrypt Slave/` — no matches.

The System Test offers the five subsystems and a free-text action name; the book's per-operation list (which subsystem, which utility, which action) is not encoded — the player picks the subsystem and adjusts the TN for the utility.

### rules/decking.md#48

Guide: | Make Comcall | Files | Commlink | Complex |

> "Make Comcall Test: Files Utility: Commlink Action: Complex" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.218

Searched: `/Analyze Host|Locate Access Node|Graceful Logoff|Logon to LTG|Decrypt Slave/` — no matches.

The System Test offers the five subsystems and a free-text action name; the book's per-operation list (which subsystem, which utility, which action) is not encoded — the player picks the subsystem and adjusts the TN for the utility.

### rules/decking.md#49

Guide: | Monitor Slave | Slave | Spoof | Simple |

> "Monitor Slave Test: Slave Utility: Spoof Action: Simple" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.218

Searched: `/Analyze Host|Locate Access Node|Graceful Logoff|Logon to LTG|Decrypt Slave/` — no matches.

The System Test offers the five subsystems and a free-text action name; the book's per-operation list (which subsystem, which utility, which action) is not encoded — the player picks the subsystem and adjusts the TN for the utility.

### rules/decking.md#50

Guide: | Null Operation | Control | Deception | Complex |

> "Null Operation Test: Control Utility: Deception Action: Complex" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.218

Searched: `/Analyze Host|Locate Access Node|Graceful Logoff|Logon to LTG|Decrypt Slave/` — no matches.

The System Test offers the five subsystems and a free-text action name; the book's per-operation list (which subsystem, which utility, which action) is not encoded — the player picks the subsystem and adjusts the TN for the utility.

### rules/decking.md#51

Guide: | Swap Memory | — | — | Simple |

> "Swap Memory Test: None Utility: None Action: Simple" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.219

Searched: `/Analyze Host|Locate Access Node|Graceful Logoff|Logon to LTG|Decrypt Slave/` — no matches.

The System Test offers the five subsystems and a free-text action name; the book's per-operation list (which subsystem, which utility, which action) is not encoded — the player picks the subsystem and adjusts the TN for the utility.

### rules/decking.md#52

Guide: | Tap Comcall | (special) | Commlink | Complex |

> "Tap Comcall Test: Special Utility: Commlink Action: Complex" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.219

Searched: `/Analyze Host|Locate Access Node|Graceful Logoff|Logon to LTG|Decrypt Slave/` — no matches.

The System Test offers the five subsystems and a free-text action name; the book's per-operation list (which subsystem, which utility, which action) is not encoded — the player picks the subsystem and adjusts the TN for the utility.

### rules/decking.md#53

Guide: | Upload Data | Files | Read/Write | Simple |

> "Upload Data Test: Files Utility: Read/Write Action: Simple" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.219

Searched: `/Analyze Host|Locate Access Node|Graceful Logoff|Logon to LTG|Decrypt Slave/` — no matches.

The System Test offers the five subsystems and a free-text action name; the book's per-operation list (which subsystem, which utility, which action) is not encoded — the player picks the subsystem and adjusts the TN for the utility.

### rules/decking.md#54

Guide: A few in words: **Logon to Host/LTG/RTG** get you into a host or grid and start your security

> "A decker may have to repeat an interrogation operation" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.214
> "Action to maintain the operation each Initiative Pass. If he fails" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.215
> "Matrix or jacks out without performing a" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.227

Searched: `/Analyze Host|Locate Access Node|Graceful Logoff|Logon to LTG|Decrypt Slave/` — no matches.

Interrogations, ongoing and monitored operations are described correctly; none is tracked by the system (see the operations note on #27).

### rules/decking.md#68

Guide: - **Simsense overload**: getting hit by white or gray IC can bleed a little Stun damage into the

> "gray IC, the decker's physical" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.226
> "If the Willpower Test fails, the decker" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.227

Searched: `/simsenseOverload|overloadTN|Simsense Overload/` — no matches.

No simsense overload test is offered after white or gray IC damage.

### rules/decking.md#76

Guide: | **Black** | The decker's real body, directly and legally | Lethal and non-lethal black IC |

> "Non-lethal black IC functions in the same manner as lethal" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.230

Searched: `/lethalBlack|blackIC|black IC|Black IC/` — no matches.

Guide corrected in 0.6.3 (e06c95f7); it was guide-differs in this check. Black IC is not modelled (TODO 176).

### rules/decking.md#84

Guide: Facing lethal black IC means resisting with **Body** (Hardening helps; Hacking Pool doesn't —

> "Hacking Pool dice cannot be used in Body or Willpower" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.207

Searched: `/lethalBlack|blackIC|black IC|Black IC/` — no matches.

Black IC — the Body resistance, Hardening, and the Willpower jack-out test — is not modelled in the rules code (TODO 176); only a skill name and a Hardening tooltip mention it.

### rules/decking.md#92

Guide: Tortoise (cyberterminal) users are entirely immune to black IC and Dumpshock, which is part of why

> "positive side, tortoise users cannot be hurt by black IC or dump" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.208

Searched: `/orthodox.{0,40}(tortoise|cyberterminal)|cyberterminal.{0,40}dump ?shock/` — no matches.

### rules/decking.md#101

Guide: Also worth knowing: getting hit by white or gray IC risks a little simsense bleed-through even

> "gray IC, the decker's physical" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.226
> "Deadly damage crashes automatically and" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.227

Searched: `/simsenseOverload|overloadTN|Simsense Overload/` — no matches.

No simsense overload test; the Deadly-crashes-the-icon part is in the Condition Monitor (a full track dumps the decker).

### rules/decking.md#103

Guide: ## Hot and Cold ASIST *(Matrix p.18)*

> "Treat lethal black IC as non-lethal black IC (p. 230, SR3) for" — Shadowrun 3e - Matrix.pdf, printed p.18

Searched: `/hotAsist|coldAsist|hot ASIST|cold ASIST/` — no matches.

Hot and cold ASIST are not modelled in the Orthodox ruleset.

### rules/decking.md#105

Guide: - **Cold ASIST** is the standard, legal interface — the kind that ships on cyberterminals and most

> "Treat lethal black IC as non-lethal black IC (p. 230, SR3) for" — Shadowrun 3e - Matrix.pdf, printed p.18
> "taking lethal damage from black IC, because the interface can-" — Shadowrun 3e - Matrix.pdf, printed p.18

Searched: `/hotAsist|coldAsist|hot ASIST|cold ASIST/` — no matches.

### rules/decking.md#106

Guide: - **Hot ASIST** cranks that ceiling off. It's what actually lets a decker take advantage of

> "allows the user to take advantage of Response Increase." — Shadowrun 3e - Matrix.pdf, printed p.18
> "ASlST interfaces are also illegal, and so the user risks legal" — Shadowrun 3e - Matrix.pdf, printed p.18

Searched: `/hotAsist|coldAsist|hot ASIST|cold ASIST/` — no matches.

The code gives every Orthodox decker Response Increase and Hacking Pool regardless of interface.

### rules/decking.md#112

Guide: On a character or NPC's **Matrix** tab under the Orthodox ruleset, your cyberdeck's stats live

> "exceed the MPCP Rating, and the maximum value for utility" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.206

Searched: `/Exceeds MPCP \(|single persona|persona program exceeds|> mccp\b/` — no matches.

The sheet warns when the persona total exceeds MPCP × 3 (SR3EActorSheet.js:2236) but not when one program exceeds MPCP, which the guide says it does. Hacking Pool, Detection Factor and Matrix Initiative are computed as the book says.

### rules/decking.md#122

Guide: {: .note }

> "For every point of Hardening, reduce the Power of any" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.206

Searched: `/hardening/` — no matches.

Only the data model and the sheet carry Hardening; no roll reads it. The guide says so itself.

### rules/drones.md#7

Guide: - A drone must be **adapted for rigger control**. Drones that can't carry

> "transmit data to and from a rigger remote-control network. In" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.306
> "Adapting a vehicle in this manner gives the" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.306

Searched: `/remote.control interface/`, `/adapted for rigger/` — no matches.

The system has no adaptation check: a vehicle of any kind can be given a driver and a control mode, with no remote-control interface, Pilot 1 or Sensor 1 required. (Manual grep of packs-src: no "Remote Control Interface" vehicle mod item exists; the drone actors only name it in notes. The script search can only scan .js/.mjs, so the pack half is not machine-proven.)

### rules/drones.md#8

Guide: - It needs a datajack system only if a rigger means to jack into it

> "A drone must be adapted for rigger control (however, it" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.154

Searched: `/datajack (port|system)/`, `/adapted for rigger/` — no matches.

No vehicle datajack system or "adapted for rigger control" requirement is modelled (the Driving Test only has a "Non-Rigger w/ Datajack" TN row).

### rules/drones.md#21

Guide: ### Subscriber lists  *(SR3 p.156)*

> "An RC deck's subscriber list is a file that enables the deck" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.156

Searched: `/subscriber|affiliat/` — no matches.

### rules/drones.md#22

Guide: - The deck only talks to drones on its **subscriber list**, which keeps

> "on an RC deck's subscriber list can connect with the deck." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.156

Searched: `/subscriber|affiliat/` — no matches.

### rules/drones.md#23

Guide: - The list holds **twice the deck's rating** in drones; the deck can

> "A subscriber list can contain a number of drones equal to" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.156
> "twice the RC deck's rating. However, a deck can actively con-" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.156

Searched: `/subscriber|affiliat/` — no matches.

### rules/drones.md#24

Guide: - A drone under the deck's control is **affiliated**; the rigger can see

> "Any drone that is under the direct control of an RC" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.156
> "A non-affiliated drone is operating independently of the RC" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.156

Searched: `/subscriber|affiliat/` — no matches.

### rules/drones.md#25

Guide: - **Affiliating or disaffiliating** a drone is a **Simple Action**, so

> "Affiliating or disaffiliating a drone requires a Simple Action." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.156
> "A drone may not act during the Combat Turn in" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.156

Searched: `/subscriber|affiliat/` — no matches.

### rules/drones.md#26

Guide: > **The book's example** *(SR3 p.156)*: Josie's Rating 4 deck holds up to 8

> "up to eight drones, but the deck enables Josie to actively" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.156
> "disaffiliating her surveillance drone in favor of a GPV. She" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.156

Searched: `/subscriber|affiliat/` — no matches.

The guide example agrees with the book (Rating 4 deck, 8 on the list, 4 active, 6 listed and 4 affiliated, two Simple Actions to swap).

### rules/drones.md#27

Guide: ### Range  *(SR3 p.136–137)*

> "Flux Rating and Range The range for any electronic trans-" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.137

Searched: `/\.fluxRange/` — no matches.

The Flux-to-range table is carried as data (config.js electronicWarfare.fluxRange) but nothing reads it: no range is ever computed or checked.

### rules/drones.md#28

Guide: An RC deck has a **Flux Rating of 2**, a range of 2 km all around it.

> "remote-control deck (Flux 2), a" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.137
> "determining the modified Flux Rating, round the result down to" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.137

Searched: `/\.fluxRange/`, `/nearest half/` — no matches.

No default Flux 2 for a remote-control deck (the rigger sheet Flux field starts at 0), no modified-Flux calculation and no round-down-to-half step.

### rules/drones.md#40

Guide: | 10+ | (2 × Flux) + 10 km |

> "10+ (2 x Flux) + 10 km ated by a standard Flux Rating. The modi-" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.137

Searched: `/2 ?\* ?\w*flux|flux\w* ?\* ?2/`, `/\.fluxRange/` — no matches.

The 10+ formula appears only in a comment beside the fluxRange array; no code computes it.

### rules/drones.md#41

Guide: | Situational Range Modifiers *(SR3 p.137)* | Modifier |

> "than 4 Flux Points at any one High elevation +4" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.137

Searched: `/high elevation|electrical storm|encryption in use/`, `/\.fluxRange/` — no matches.

### rules/drones.md#42

Guide: | High elevation (unbroken line of sight to the receiver) | +4 |

> "than 4 Flux Points at any one High elevation +4" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.137

Searched: `/high elevation|electrical storm|encryption in use|humid air/`, `/\.fluxRange/` — no matches.

### rules/drones.md#43

Guide: | ECCM in use | −(ECCM rating ÷ 2) |

> "time, and it cannot boost any ECCM in use -Rating of transmitter/2" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.137

Searched: `/high elevation|electrical storm|encryption in use|humid air/`, `/\.fluxRange/` — no matches.

The table prints "-Rating of transmitter/2"; the table key says "subtract half the ECCM Level" (SR3 p.137). The guide follows the key. Either way, nothing in the code applies it.

### rules/drones.md#44

Guide: | Electrical storm | −2 |

> "single system by more than 2 Electrical storm -2" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.137

Searched: `/high elevation|electrical storm|encryption in use|humid air/`, `/\.fluxRange/` — no matches.

### rules/drones.md#45

Guide: | Encryption in use | −0.5 |

> "points. For example, Josie could Encryption in use -0.5" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.137

Searched: `/high elevation|electrical storm|encryption in use|humid air/`, `/\.fluxRange/` — no matches.

### rules/drones.md#46

Guide: | Humid air | −0.5 |

> "use the van to provide a 2-point Humid air -0.5" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.137

Searched: `/high elevation|electrical storm|encryption in use|humid air/`, `/\.fluxRange/` — no matches.

### rules/drones.md#47

Guide: | Urban environment | −1 |

> "boost to the remote-control Urban environment -1" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.137

Searched: `/high elevation|electrical storm|encryption in use|humid air/`, `/\.fluxRange/` — no matches.

### rules/drones.md#48

Guide: > **The book's example** *(SR3 p.137–138)*: Josie's deck has a signal

> "her deck transmitter is 8, calculated as follows." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.138
> "This effective Flux Rating gives Josie's Dalmatian an 8-" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.138

Searched: `/\.fluxRange/` — no matches.

The guide's arithmetic agrees with the book (6 + 4 - 0.5 - 1.5 = 8, Flux 8 = 20 km on the Flux Range Table); the system just has no calculator for it.

### rules/drones.md#51

Guide: ## A rigger's actions with a deck  *(SR3 p.156–157)*

> "The following list describes actions a rigger can perform" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.156

Searched: `/Activate/Deactivate Sensors|Perform the Same Free Action|Return to Captain/` — no matches.

No drone-action list: only "Fire a Weapon System" (Complex, row 62) and the generic Observe in Detail (Simple) are charged by the action ledger; every other row below is not modelled.

### rules/drones.md#53

Guide: | Turn one drone's sensors, or its ECM/ECCM, on or off (from the next Combat Turn) | ✓ | | |

> "Activate/Deactivate Sensors: A rigger may activate or deactivate sensors for a single drone." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.156

Searched: `/Activate/Deactivate Sensors|activateSensors|toggleSensors/` — no matches.

### rules/drones.md#54

Guide: | Arm or disarm one drone's weapon system (one armed at a time) | ✓ | | |

> "Arm/Disarm a Weapon System: A rigger may order a single drone to arm or disarm one of its weapon systems." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.157

Searched: `/Arm/Disarm|armWeapon|disarmWeapon/` — no matches.

### rules/drones.md#55

Guide: | Call up one drone's status report | ✓ | | |

> "Call Up a Status Report: A rigger may monitor the posi-" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.157

Searched: `/Status Report|statusReport/` — no matches.

### rules/drones.md#56

Guide: | Observe casually through one drone | ✓ | | |

> "Observe: A rigger may casually observe through one" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.157

Searched: `/casually observe|observeThrough/` — no matches.

### rules/drones.md#57

Guide: | Delay an action, or speak a word | ✓ | | |

> "Delay Action: Riggers can delay actions per standard" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.157
> "Speak a Word: Riggers may take this action per standard" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.157

Searched: `/speak a word|delay action|delayAction/` — no matches.

### rules/drones.md#58

Guide: | Affiliate or disaffiliate a drone | | ✓ | |

> "Affiliate/Disaffiliate a Drone: A rigger may add or drop" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.157

Searched: `/Affiliate/Disaffiliate|affiliat/` — no matches.

### rules/drones.md#60

Guide: | Do the same Free Action on several drones at once (captain's chair) | | ✓ | |

> "Perform the Same Free Action on Multiple Drones: A" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.157

Searched: `/Perform the Same Free Action/` — no matches.

### rules/drones.md#61

Guide: | Jump into a primary drone, or return to the captain's chair | | ✓ | |

> "Jump into a Primary Drone: A rigger takes direct control" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.157
> "Return to Captain's Chair: A rigger stops maintaining" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.157

Searched: `/jumpInto|Jump into a Primary|Return to Captain/`, `/charge\([^)]*(setVcr|setRcd|vcrMode)/` — no matches.

Switching VCR / RCD / Auto is a sheet button (setVcrMode, setRcdMode) that charges no Simple Action.

### rules/drones.md#63

Guide: | Issue a command to a drone or a group | | | ✓ |

> "Issue a Command: A rigger may issue a command to a" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.157

Searched: `/charge\([^)]*(ompreh|ommand)|issue ?command/` — no matches.

### rules/drones.md#64

Guide: | Observe through a secondary drone while jumped in | | | ✓ |

> "Observe through a Secondary Drone: When directly" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.157

Searched: `/observeSecondary|Observe through a Secondary/` — no matches.

### rules/drones.md#65

Guide: | Operate a jumped-in drone: accelerate, brake, position, ram or hide | | | ✓ |

> "Operate a Drone: While jumped into a drone, the rigger" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.157

Searched: `/charge\([^)]*(driv|brak|accel|ramm)/` — no matches.

The Driving Test rolls for a jumped-in drone (VCR rolls the rigger's skill and Control Pool), but it is not charged as a Complex Action.

### rules/drones.md#68

Guide: - An order is a **Complex Action**, declared with the rigger's own actions.

> "Issuing a command to a drone requires one" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.157
> "A rigger can issue only one command to a single drone," — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.157

Searched: `/issue ?command|issueCommand|groupCommand|identical command/`, `/charge\([^)]*ompreh/` — no matches.

The 📡 Drone Comprehension button just rolls the test; it charges no Complex Action and has no one-drone / identical-group rule.

### rules/drones.md#73

Guide: | Difficulty Number Table *(SR3 p.92)* | TN |

> "Except for predetermined target Simple 2" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.92

Searched: `/Nearly Impossible|Strenuous/` — no matches.

The Difficulty Number Table is not in the code: the GM types the TN. The guide row agrees with the book.

### rules/drones.md#74

Guide: | Simple | 2 |

> "Except for predetermined target Simple 2" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.92

Searched: `/Nearly Impossible|Strenuous/` — no matches.

The Difficulty Number Table is not in the code: the GM types the TN. The guide row agrees with the book.

### rules/drones.md#75

Guide: | Routine | 3 |

> "numbers, like the ones for combat, the Routine 3" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.92

Searched: `/Nearly Impossible|Strenuous/` — no matches.

The Difficulty Number Table is not in the code: the GM types the TN. The guide row agrees with the book.

### rules/drones.md#76

Guide: | Average | 4 |

> "gamemaster is solely responsible for Average 4" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.92

Searched: `/Nearly Impossible|Strenuous/` — no matches.

The Difficulty Number Table is not in the code: the GM types the TN. The guide row agrees with the book.

### rules/drones.md#77

Guide: | Challenging | 5 |

> "determining target numbers. Challenging 5" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.92

Searched: `/Nearly Impossible|Strenuous/` — no matches.

The Difficulty Number Table is not in the code: the GM types the TN. The guide row agrees with the book.

### rules/drones.md#78

Guide: | Difficult | 6–7 |

> "Gamemasters should use the Difficulty Difficult 6-7" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.92

Searched: `/Nearly Impossible|Strenuous/` — no matches.

The Difficulty Number Table is not in the code: the GM types the TN. The guide row agrees with the book.

### rules/drones.md#79

Guide: | Strenuous | 8 |

> "Number Table as a guide when determin- Strenuous 8" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.92

Searched: `/Nearly Impossible|Strenuous/` — no matches.

The Difficulty Number Table is not in the code: the GM types the TN. The guide row agrees with the book.

### rules/drones.md#80

Guide: | Extreme | 9 |

> "ing target numbers on the fly. Extreme 9" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.92

Searched: `/Nearly Impossible|Strenuous/` — no matches.

The Difficulty Number Table is not in the code: the GM types the TN. The guide row agrees with the book.

### rules/drones.md#81

Guide: | Nearly Impossible | 10+ |

> "Not all tests are created equal, and Nearly Impossible 10+" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.92

Searched: `/Nearly Impossible|Strenuous/` — no matches.

The Difficulty Number Table is not in the code: the GM types the TN. The guide row agrees with the book.

### rules/drones.md#82

Guide: **Sensors** *(SR3 p.136)*: a drone making a Passive Sensor Test rolls its

> "Tests. When making a Passive Sensor Test, use the drone's Pilot" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.136

Searched: `/passive sensor|passiveSensor|active sensor|activeSensor/` — no matches.

There are no Passive or Active Sensor Tests in the code; only the Sensor-Enhanced Gunnery bonus (half the Sensor Rating as dice) uses the Sensor Rating.

### rules/drones.md#96

Guide: | Remote Control ECCM, Ratings 1–3 | Rating × 7,500¥ |

> "Ratings 1-3 1.5 Rating x 7,500" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.306

Searched: `/Remote Control ECCM/` — no matches.

No SR3 p.306 "Remote Control ECCM" gear item is shipped. Manual grep of packs-src: the only items of that name are the Man & Machine p.23 cranial variants (sr3e-mm-cyberware, e.g. Rating 1 = 15,000, Rating 10 = 900,000), priced from M&M's own table, not from the p.306 rate. (The script search can only scan .js/.mjs, so the pack side is not machine-proven.)

### rules/drones.md#97

Guide: | Remote Control ECCM, Ratings 4–6 | Rating × 15,000¥ |

> "Ratings 4-6 2 Rating x 15,000" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.306

Searched: `/Remote Control ECCM/` — no matches.

No SR3 p.306 "Remote Control ECCM" gear item is shipped. Manual grep of packs-src: the only items of that name are the Man & Machine p.23 cranial variants (sr3e-mm-cyberware, e.g. Rating 1 = 15,000, Rating 10 = 900,000), priced from M&M's own table, not from the p.306 rate. (The script search can only scan .js/.mjs, so the pack side is not machine-proven.)

### rules/drones.md#98

Guide: | Remote Control ECCM, Ratings 7–9 | Rating × 35,000¥ |

> "Ratings 7-9 2.5 Rating x 35,000" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.306

Searched: `/Remote Control ECCM/` — no matches.

No SR3 p.306 "Remote Control ECCM" gear item is shipped. Manual grep of packs-src: the only items of that name are the Man & Machine p.23 cranial variants (sr3e-mm-cyberware, e.g. Rating 1 = 15,000, Rating 10 = 900,000), priced from M&M's own table, not from the p.306 rate. (The script search can only scan .js/.mjs, so the pack side is not machine-proven.)

### rules/drones.md#99

Guide: | Remote Control ECCM, Rating 10 | 500,000¥ |

> "Rating 10 2.5 Hitcher Jacks 0 500,000" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.306

Searched: `/Remote Control ECCM/` — no matches.

No SR3 p.306 "Remote Control ECCM" gear item is shipped. Manual grep of packs-src: the only items of that name are the Man & Machine p.23 cranial variants (sr3e-mm-cyberware, e.g. Rating 1 = 15,000, Rating 10 = 900,000), priced from M&M's own table, not from the p.306 rate. (The script search can only scan .js/.mjs, so the pack side is not machine-proven.)

### rules/grenades.md#15

Guide: Launcher minigrenades don't arm until they've traveled about **5 meters**.

> "do not actually arm until they have traveled about that distance" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.118
> "Electronics B/R (6) Test and a base time of five minutes" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.118

Searched: `/B/R \(6\)|disabl\w* (the )?safety|safety.*disabl/` — no matches.

Half of this is now stated (TODO 163): a launcher shot under 5 m shows a warning in the roll dialog (MiniGrenade.arms, SR3EItem.js:2487) and, by the system design, never enforces it. The Electronics B/R (6) Test to disable the safety is still not modelled.

### rules/grenades.md#22

Guide: A grenade goes off in the **next Combat Phase of the character who threw or

> "the grenade will detonate at the end of the next Initiative Pass" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.118
> "the grenade will detonate at the end of that Combat Turn" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.118

Searched: `/grenade[^\n]*(next Combat Phase|next Initiative Pass|end of the Combat Turn)/` — no matches.

A grenade's blast is resolved immediately when the throw's dice are final; nothing delays the detonation to the thrower's next Combat Phase, the end of the next Initiative Pass, or the end of the Combat Turn. The GM has to sequence it.

### rules/grenades.md#23

Guide: - If they have no more Combat Phases this turn, it goes off at the **end of

> "the grenade will detonate at the end of the next Initiative Pass" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.118
> "the grenade will detonate at the end of that Combat Turn" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.118

Searched: `/grenade[^\n]*(next Combat Phase|next Initiative Pass|end of the Combat Turn)/` — no matches.

A grenade's blast is resolved immediately when the throw's dice are final; nothing delays the detonation to the thrower's next Combat Phase, the end of the next Initiative Pass, or the end of the Combat Turn. The GM has to sequence it.

### rules/grenades.md#24

Guide: - If it was thrown in the **last** Initiative Pass of the turn, it goes off

> "the grenade will detonate at the end of the next Initiative Pass" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.118
> "the grenade will detonate at the end of that Combat Turn" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.118

Searched: `/grenade[^\n]*(next Combat Phase|next Initiative Pass|end of the Combat Turn)/` — no matches.

A grenade's blast is resolved immediately when the throw's dice are final; nothing delays the detonation to the thrower's next Combat Phase, the end of the next Initiative Pass, or the end of the Combat Turn. The GM has to sequence it.

### rules/grenades.md#34

Guide: **Optional rule, grenade damage**: instead of staging with the thrower's

> "the gamemaster rolls a number of dice equal to half the grenade/explosive's Power (round up) against a Target Number 4" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.119

Searched: `/optionalGrenade|grenadeDamageOptional|optional grenade/` — no matches.

Deliberately not built: SR3EActor.js carries a comment saying so (the standard rule is implemented).

### rules/grenades.md#38

Guide: 1. Check whether the walls held, using the barrier rules above. If they

> "the gamemaster must first determine whether any barriers (usually walls) stood firm against the explosion" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.119

Searched: `/\bwallRating\b|\bwall\.br\b|\bwall\.barrier|\bwall\.rating/` — no matches.

The Chunky Salsa tool takes the walls the GM draws as holding; it does not test them against the Barrier Rules first.

### rules/karma.md#13

Guide: Each surviving member of the team gets Karma for staying alive, for succeeding at the mission and

> "Each surviving member of a team gets Karma for staying alive, succeeding at a mission, and for the degree of danger in the mission" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.242
> "He also makes individual awards to characters whose actions deserve them" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.244

Searched: `/staying alive/`, `/surviving member/`, `/degree of danger/` — no matches.

The system has no team/mission award; Award Karma and Session Rewards take whatever number the GM types.

### rules/karma.md#14

Guide: | For | Award *(SR3 p.244)* |

> "Karma is awarded to characters who personally advance the story or the overall gaming enjoyment in some way" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.244
> "He also makes individual awards to characters whose actions deserve them" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.244

Searched: `/karma award (table|criteria|guideline)/`, `/award.{0,20}criteria/` — no matches.

Header row of the award table; no award table exists in the code (the GM types a number). Rows resolved individually below.

### rules/karma.md#15

Guide: | Good roleplaying (mostly stayed in character) | 1; excellent roleplaying 2 |

> "Good roleplaying: Award 1 Karma Point to players who mostly stayed in character. Excellent roleplaying is worth 2" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.244

Searched: `/excellent roleplaying/`, `/good roleplaying/` — no matches.

### rules/karma.md#16

Guide: | Guts — brave, effective fighting (not stupidly brave) | 1; particularly heroic 2 |

> "Guts: Brave and/or effective fighters should get a point of Karma, two if they are particularly heroic" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.244

Searched: `/particularly heroic/`, `/karma.{0,30}\bguts\b/`, `/\bguts\b.{0,30}karma/` — no matches.

### rules/karma.md#17

Guide: | Smarts — a clever plan, a solved clue, a good scam, knowing when to run | at least 1 |

> "Smarts: Players whose characters come up with a clever strategy, solve a puzzling clue or pull off a good scam should get at least 1 point of Karma" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.244

Searched: `/karma.{0,30}smarts/`, `/smarts.{0,30}karma/` — no matches.

### rules/karma.md#18

Guide: | Motivation — driving the story forward | 1 |

> "Motivation: Players whose characters really drive the storyline forward" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.244

Searched: `/karma.{0,30}motivation/`, `/motivation.{0,30}karma/` — no matches.

### rules/karma.md#19

Guide: | Right place, right time — the vital skill, not known in advance to be needed | 1 |

> "Right place/right time: Characters who are in the right place, with the right skill to do some necessary job, should get 1 point of Karma" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.244
> "don't award Karma just for making good dice rolls" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.244

Searched: `/right place.{0,12}right time/` — no matches.

### rules/karma.md#20

Guide: | Surprise — a strategy that foils the gamemaster's plans | 1 |

> "Surprise: A surprising and effective strategy is worth a Karma Point to the player who comes up with it" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.244

Searched: `/karma.{0,40}surprise/`, `/surprise.{0,40}karma/` — no matches.

### rules/karma.md#21

Guide: | Humour and drama, in character | 1 |

> "Humor and drama: A player who paralyzes the entire gaming group with laughter while acting in character should get 1 Karma Point" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.244

Searched: `/humou?r and drama/` — no matches.

### rules/karma.md#22

Guide: An amazing run might earn one character 10 or 12 Karma. More than 12 for a single adventure is

> "that character might earn up to 10 or 12 Karma Points. A Karma award greater than 12 points for a single adventure, however, is highly unlikely" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.244
> "don't award Karma just for making good dice rolls" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.244

Searched: `/highly unlikely/`, `/more than 12 karma/`, `/karma.{0,30}over 12/` — no matches.

No ceiling or warning on a single award; the GM may type any number.

### rules/karma.md#25

Guide: Good Karma is spent **between adventures** *(SR3 p.244)*. The gamemaster can also require training

> "Players can use Good Karma between adventures to improve a character" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.244
> "Gamemasters should not allow characters to simply spend large amounts of Karma" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.245

Searched: `/between adventures/`, `/karma.{0,60}(teacher|training time|instructor)/`, `/(teacher|training time|instructor).{0,60}karma/` — no matches.

The Spend Karma calculator works at any time; no training time, teacher or Skill Test is asked for or checked (the system never refuses, by design).

### rules/karma.md#71

Guide: | **Open Test re-roll** | 1 for one die, 2 more for a second (3 in all), 3 more for a third (6)… | spent |

> "to re-roll 2 dice costs 2 more Karma Pool points (a total of 3), to re-roll 3 dice costs 3 more Karma Pool (a total of 6)" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.246

Searched: `/KarmaPool\.openTestRerollCost/` — no matches.

KarmaPool.openTestRerollCost (karma-uses.mjs:101) computes the 1/3/6 price but nothing calls it: Open Tests are not rolled with a Karma re-roll (the guide's last paragraph says so).

### rules/karma.md#74

Guide: | **Extended actions** — Karma Pool committed when a long task begins *(SR3 p.246, 248; gamemaster's option)* | as committed; the pool doesn't refresh until the task is done | spent |

> "refresh until the action is completed" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.248
> "Gamemasters may also allow player characters to use" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.248

Searched: `/extended.{0,60}karma pool/`, `/karma pool.{0,60}extended/` — no matches.

No extended-action commitment: Karma Pool for a long task is spent like any other spend and the pool does not stay locked until the task ends (the GM refreshes by hand).

### rules/reloading.md#48

Guide: - A character below a crossbow's **Strength Minimum** needs **one extra Ready

> "he must spend one additional Ready Weapon action reloading the crossbow for each point of Strength he is below the minimum" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.118

Searched: `/crossbow[^\n]*(additional|extra) Ready|Strength Minimum[^\n]*Ready Weapon/` — no matches.

### rules/reloading.md#71

Guide: Ammunition is Concealability 8 (assault-cannon rounds and taser darts 3), and

> "*-1 Concealability per extra 10 rounds of ammo" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.281
> "**Belted ammo: add rounds/100 to Availability" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.281

Searched: `/extra 10 rounds|rounds ?/ ?100|per extra 10/` — no matches.

The base Concealability (8; 3 for assault-cannon rounds and taser darts) is stored on each pack item. The '−1 Concealability per extra 10 rounds' and the 'add rounds/100 to Availability for belted ammo' adjustments are not computed anywhere.

### rules/rigging.md#21

Guide: - **An easier default.** A VCR lets its user default to Reaction for any

> "to default to Reaction for any Vehicle Skill at a +2 modifier, as" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.301

Searched: `/vcrDefault|defaultVCR|VCR.{0,40}\+2 modifier/` — no matches.

The guide itself says this is not modelled (TODO 106).

### rules/rigging.md#45

Guide: - Driving through a **datajack without a VCR** — or a VCR-equipped rigger

> "have a vehicle control rig. The modifier also applies if a rigger" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.134
> "is driving a vehicle not adapted for rigger control. If a vehicle" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.134

Searched: `/riggerAdapted|adaptedForRigger|rigger-adapted|adapted for rigger/` — no matches.

The datajack −1 row is offered only to a driver with no VCR (SR3EVehicleSheet.js:1107); a vehicle's adaptation for rigger control is not modelled, so a VCR rigger in an unadapted vehicle cannot take it (TODO 176 remainder, p.134).

### rules/rigging.md#95

Guide: A successful Hiding Test also earns an **Escape Bonus** equal to its

> "other vehicles and also receives an Escape Bonus equal to the" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.144
> "the other vehicle relocates the hiding vehicle (see Relocating)" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.144

Searched: `/escapeBonus|Escape Bonus|escape bonus/` — no matches.

The Relocating Test is implemented (its TN takes the Hiding successes, SR3EVehicleChase.js:1839); the Escape Bonus added to the hider's Driver Points each turn is not.

### rules/rigging.md#99

Guide: The vehicle resists with Body dice plus any Control Pool a jacked-in

> "combat attack using Control Pool instead of Combat Pool dice" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.149
> "vehicle's Body Rating, plus any available Control Pool dice up" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.149

Searched: `/controlPoolDodge|dodgeWithControl|Control Pool instead of Combat Pool/` — no matches.

The vehicle resists with Body dice (the soak card); adding Control Pool to that roll, and a rigger's Control Pool dodge against Handling, are not modelled (TODO 176 remainder, p.149).

### rules/rigging.md#100

Guide: Shooting **passengers** inside the vehicle is harder than shooting the

> "the vehicle's Armor or Body Rating, whichever is higher, from" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.149
> "Pool dice (round down) for Dodge or Damage Resistance Tests." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.149
> "+3 target number modifier to his Damage Resistance Tests. (A" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.149

Searched: `/shootPassenger|passengerShot|armorOrBody|halfCombatPool/` — no matches.

### rules/rigging.md#152

Guide: {: .note }

> "to default to Reaction for any Vehicle Skill at a +2 modifier, as opposed to the usual +4" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.301

Searched: `/vcrDefault|defaultVCR|VCR.{0,40}\+2 modifier/` — no matches.

The guide states this itself (TODO 106).

### rules/vehicles.md#9

Guide: | **Accel** | How much each success on a Driving Test can add to Speed in a chase. |

> "increases the vehicle's Speed by its Acceleration Rating" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.132

Searched: `/accel\w*\s*\*\s*successes/`, `/successes\s*\*\s*accel/`, `/speed\s*\+=\s*.{0,40}accel/` — no matches.

Accel is stored and shown, and the Collision tool's Braking Test uses it to slow a vehicle (Acceleration x successes, and the x4 deceleration limit; scripts/data/collisions.mjs `braking`), but the chase's Accel / Brake action only rolls the Driving Test: a success does not add Acceleration to the vehicle's Speed (the Speed in the chase is typed in by hand).

### rules/vehicles.md#10

Guide: | **Body** | Toughness. It also sets the number of weapon mounts. |

> "A vehicle's Body Rating represents its mass and measures how much punishment it can take" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.132
> "A vehicle's Body Rating also indicates how many weapons can be mounted on it" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.132

Searched: `/hardpoint/`, `/firmpoint/` — no matches.

Body as toughness is used throughout (damage track, soak, ramming, collisions: e.g. SR3EVehicleChase.js:531, SR3ECollision.js:69), but nothing counts weapon mounts against Body: no hardpoint or firmpoint appears anywhere in scripts/.

### rules/vehicles.md#58

Guide: | **Datajack port** | 2,500¥ (5,000¥ for a bike) | Drive by datajack: +1 Reaction for Vehicle Tests and vehicle combat. Not enough for a VCR. Uses 1 Cargo Factor and 15 kg of Load. |

> "VCR to interface with the vehicle, but it does add +1 to the driver's Reaction for Vehicle Tests and vehicle combat" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.306
> "A datajack port costs 2,500¥ (5,000¥ for motorcycles), and consumes 1 Cargo Factor and 15kg Load" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.306

Searched: `/\+1.{0,40}reaction.{0,60}vehicle (tests|combat)/`, `/reaction.{0,60}datajack port/` — no matches.

The datajack port item exists in the vehicle-mods pack with the book's numbers (cost 2,500 / 5,000 for motorcycles, CF 1, load 15kg: packs-src/sr3e-sr3-vehicle-mods/datajack-port*.json). The EFFECT, +1 to the driver's Reaction for Vehicle Tests and vehicle combat, is not modelled: the only datajack rule in the code is the Driving Test's -1 TN "Non-Rigger w/ Datajack" row (SR3EVehicleSheet.js:1141-1146, the p.134 table), which is a different rule.

### rules/vehicles.md#59

Guide: | **Remote-control interface** ("Remote Control Gear") | 2,500¥ × Body | Lets the vehicle join a rigger's remote-control network as a drone, with a **Pilot Rating of 1**. Needs Sensor 1 or more. Uses no cargo space. |

> "remote-control interface, the vehicle must have a Sensor Rating of 1 or higher" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.306
> "but consumes no cargo space" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.306

Searched: `/remote.control (interface|gear)/`, `/rem.contr.{0,8}intr/` — no matches.

The 2,500¥ x Body item exists in the vehicle-mods pack (Rem-Contr. Intr. Bod[1]..[9]: 2,500 to 22,500, CF 0, packs-src/sr3e-sr3-vehicle-mods/rem-contr-intr-bod-*.json), matching the book. Its effect (the vehicle becomes a drone with Pilot Rating 1; Sensor 1+ required) is not modelled: the item is never read in scripts/, and a vehicle's Pilot is whatever is typed on its sheet.

### rules/vehicles.md#64

Guide: - **Hardpoints** carry heavy and vehicle weapons (MMGs and larger);

> "Heavy and vehicular weapons (MMGs and larger) must be mounted on hardpoints; smaller arms (LMGs, assault rifles and smaller) may be mounted on firmpoints" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.307

Searched: `/hardpoint/`, `/firmpoint/` — no matches.

No hardpoint/firmpoint concept: any weapon item can be added to any vehicle's Weapons tab.

### rules/vehicles.md#65

Guide: - A vehicle's **Body** sets how many it has: a hardpoint takes 2 points of

> "Each hardpoint is worth 2 points of Body, and each firmpoint counts for 1 point" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.307

Searched: `/hardpoint/`, `/firmpoint/` — no matches.

Nothing counts mounts against Body; the Body 4 example (2 hardpoints, or a hardpoint and 2 firmpoints, or 4 firmpoints) cannot be checked by the system.

### rules/vehicles.md#66

Guide: - **Firmpoints** are fixed mounts or pintle mounts; **hardpoints** are

> "Firmpoints can be a fixed mount or a pintle mount. Hardpoints can be a fixed mount or a turret." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.307

Searched: `/hardpoint/`, `/firmpoint/` — no matches.

The fixed mount, pintle mount and turret exist as gear items; the rule that firmpoints take only fixed/pintle and hardpoints only fixed/turret is not modelled.

### rules/vehicles.md#67

Guide: - **Fixed mounts** fire in a fixed arc, usually forward or back, and

> "Fixed mounts reduce recoil modifiers by half (negating the double recoil modifier of heavy weapons)" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.307
> "Side-firing fixed mounts add their recoil to the vehicle's Handling Rating when fired; the driver must also make a Crash Test" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.307
> "External fixed mounts reduce the vehicle's Signature by 1" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.307

Searched: `/hardpoint/`, `/firmpoint/`, `/side.firing/` — no matches.

None of the four effects (recoil halved, side-firing Handling and Crash Test, Signature -1, the rigger firing a fixed mount) is modelled; mounts are plain gear items.

### rules/weapons.md#13

Guide: | **Legal** | The Legality Code, like **6P-E** *(SR3 p.274)*. |

> "The second part of the Legality Code lists the restriction" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.273
> "If an item's Legality Code features a "P," a permit" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.274

Searched: `/class FirearmData(?:(?!export class)[\s\S])*legal/` — no matches.

No firearm carries a Legality Code: the firearm data model has no legal field, and the melee/projectile models hold only a legal true/false. The weapon packs store no code like 6P-E. (Legality Codes as a whole are also recorded as not modelled on street/gear-and-fencing.md.)

### rules/weapons.md#14

Guide: Firearms take standard or **caseless** ammunition, but not both. Every

> "can fire either type of ammunition, but not both interchange- ably." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.276
> "digital ammunition counter is standard equipment." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.276

Searched: `/caseless/`, `/ammo(unition)? counter/` — no matches.

Caseless versus standard ammunition is not a thing in the system (one ammo stream per gun), and there is no "digital ammo counter" item feature; the Track Ammunition setting counts rounds without modelling the counter.

### rules/weapons.md#64

Guide: - **Magnifying scopes** move the range one column left per point of rating,

> "These systems change a weapon's range category by a number equal to the device's rating." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.110
> "could not reduce the range category to less than short range." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.110

Searched: `/(shift|move)s?\b.{0,30}(range|column)s?\b.{0,40}(left|rating)/` — no matches.

Image magnification appears only as a row in the GM's situational modifier list ("Image magnification: Special", SR3ECombatModifiers.js imageMag, null, not rendered); the range band is never shifted by a scope's rating.

### rules/weapons.md#101

Guide: ### Rockets and missiles  *(SR3 p.281)*

> "High-Explosive Rockets/Missiles (HER/HEM): These projec-" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.280
> "Rocket/Missiles Intelligence Damage Blast" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.281

Searched: `/(anti-?(personnel|vehicle)|high-?explosive) (rocket|missile)/` — no matches.

No SR3 rocket or missile item exists. Manual grep of packs-src: the SR3 ammunition pack has grenades and mini-grenades but no AP/AV/HE rockets or missiles (only Cannon Companion gyrojet rockets and vehicle-weapon missiles). The script search can only scan .js/.mjs, so the pack side is not machine-proven.

### rules/weapons.md#103

Guide: | Anti-Personnel rocket | NA | 16D | −1/.5m |

> "Rockets Anti-Personnel NA 16D -1/.5m" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.281

Searched: `/(anti-?(personnel|vehicle)|high-?explosive) (rocket|missile)/` — no matches.

The row is right (checked against the book table: Intelligence, 16D, Blast as the guide prints them) but no such rocket or missile item ships; see the section heading.

### rules/weapons.md#104

Guide: | Anti-Vehicle rocket | NA | 16D | −8/m |

> "Anti-Vehicle NA 16D -8/m 3 8/14 days" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.281

Searched: `/(anti-?(personnel|vehicle)|high-?explosive) (rocket|missile)/` — no matches.

The row is right (checked against the book table: Intelligence, 16D, Blast as the guide prints them) but no such rocket or missile item ships; see the section heading.

### rules/weapons.md#105

Guide: | High-Explosive rocket | NA | 16D | −1/m |

> "High-Explosive NA 16D -1/m" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.281

Searched: `/(anti-?(personnel|vehicle)|high-?explosive) (rocket|missile)/` — no matches.

The row is right (checked against the book table: Intelligence, 16D, Blast as the guide prints them) but no such rocket or missile item ships; see the section heading.

### rules/weapons.md#106

Guide: | Anti-Personnel missile | 3 | 16D | −1/.5m |

> "Missiles Anti-Personnel Anti-Vehicle 3 16D -1/.5m" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.281

Searched: `/(anti-?(personnel|vehicle)|high-?explosive) (rocket|missile)/` — no matches.

The row is right (checked against the book table: Intelligence, 16D, Blast as the guide prints them) but no such rocket or missile item ships; see the section heading.

### rules/weapons.md#107

Guide: | Anti-Vehicle missile | 4 | 16D | −8/m |

> "High-Explosive 4 16D -8/m" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.281

Searched: `/(anti-?(personnel|vehicle)|high-?explosive) (rocket|missile)/` — no matches.

The row is right (checked against the book table: Intelligence, 16D, Blast as the guide prints them) but no such rocket or missile item ships; see the section heading.

### rules/weapons.md#108

Guide: | High-Explosive missile | 3 | 16D | −1/m |

> "High-Explosive 3 16D -1/m" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.281

Searched: `/(anti-?(personnel|vehicle)|high-?explosive) (rocket|missile)/` — no matches.

The row is right (checked against the book table: Intelligence, 16D, Blast as the guide prints them) but no such rocket or missile item ships; see the section heading.

### rules/weapons.md#109

Guide: A missile's Intelligence is its targeting circuitry *(SR3 p.279)*.

> "The Intelligence rating listed on the table represents the missile's targeting and control circuits" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.279

Searched: `/missile.{0,40}intelligence/`, `/targeting (and control )?circuit/` — no matches.

No missile Intelligence is modelled.

### rules/weapons.md#141

Guide: - **Monofilament whip**: if the attack misses only because the defender's

> "occurs, make a separate Whip Test against a Target Number 6. If the test yields no successes, the whip strikes the attacker." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.275
> "whip, but its rating is halved (round down). Barrier Ratings are doubled against a monowhip." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.275

Searched: `/whip test|monowhip|monofilament.{0,60}(impact|barrier)/` — no matches.

No special rule for the monofilament whip exists: no Whip Test risk when an attack misses on Combat Pool successes or more 1s than successes, no halving of Impact armour, no doubled Barrier Rating. It is only a melee weapon with a 10S code.

### rules/weapons.md#142

Guide: - **Whip**: damage is reduced by **twice** the Impact armor. It can snare

> "armored targets, damage from bullwhips is reduced by twice the Impact Armor Rating." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.276
> "nent instead of doing damage--each net success on the Attack" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.276

Searched: `/bullwhip|snare|entangl/` — no matches.

A whip is an ordinary melee weapon: armour is not doubled against it and there is no snare action.

### rules/weapons.md#143

Guide: - **Shock glove**: 8 charges, then an hour to recharge *(SR3 p.276)*. Shock

> "charged 8 times before requiring a 1-hour recharge." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.276
> "A successful hit by a stun weapon stuns the tar-" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.124

Searched: `/chargesLeft|charges? (left|remaining)/` — no matches.

The p.124 stun is implemented in 0.7.0 (d2d88b58, scripts/data/shock-stun.mjs: Power minus half Impact minus the Body or Willpower successes, +2 to all tests while it lasts). Still not modelled: the glove's 8 charges and the 1-hour recharge.

### rules/weapons.md#154

Guide: **Strength Minimum** *(SR3 p.117–118)*: an archer below a bow's minimum

> "suffer an additional +1 modifier to their target numbers per point below the mini- mum;" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.117
> "he must spend one additional Ready Weapon action reloading the crossbow for each point of Strength he is below the minimum" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.118

Searched: `/strMin[^\n]*(TN|tn|penalt|below|short)/`, `/crossbow[^\n]*(additional|extra) Ready|Strength Minimum[^\n]*Ready Weapon/` — no matches.

Neither penalty exists: no +1 TN per point below a bow's Strength Minimum and no extra Ready Weapon per point for a crossbow (strMin is only displayed). A bow being bought at a chosen Strength Minimum is true of the pack (twelve bows, 100 x Str Min). (reloading.md#48 records the crossbow half.)

### rules/weapons.md#194

Guide: - **Revolvers** can't take silencers or sound suppressors; **hold-outs**

> "Revolvers cannot use silencers or sound" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.276
> "SMGs cannot use silencers, but can use sound suppressers." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.277
> "silencers or sound suppressers. Rifles include the following:" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.277

Searched: `/silencer.{0,40}revolver|revolver.{0,40}silencer/`, `/hold-?out.{0,40}accessor/` — no matches.

Accessory compatibility (no silencer on a revolver or shotgun, no accessories on a hold-out, no silencer on an SMG) is not enforced or even stored: accessories are free gear items and a free-text list on the weapon.

### rules/weapons.md#198

Guide: - **Ranger Arms SM-3**: breaks down into a briefcase. Carried and used in a

> "chance on a roll of 2D6 that the weapon will suffer a +2 target" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.279
> "assembling the gun takes three Complex Actions." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.278

Searched: `/loss of alignment|SM-?3 (alignment|briefcase)/` — no matches.

The Ranger Arms SM-3 is an ordinary rifle: no disassembly actions and no loss-of-alignment chance.

### rules/weapons.md#207

Guide: The Antioch fires mini-grenades only; as an underbarrel accessory it can't

> "These weapons fire only mini-grenades." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.279
> "it cannot be removed, and modifies Concealability by -3." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.279

Searched: `/antioch/` — no matches.

Mini-grenade-only is not enforced and nothing treats the Antioch as an underbarrel accessory that cannot be removed (the pack stores Concealability as the text "6(-3)").

### rules/weapons.md#210

Guide: A firearm has **top**, **barrel** and **underbarrel** mounts, one accessory

> "accessory can be attached to a particular mount." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.280
> "Standard pistols can mount one barrel- and one top-mount-" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.276
> "SMGs can accept one top-mounting, one barrel-mounting, and one underbarrel-mount-" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.277

Searched: `/underbarrel|barrel.?mount|top.?mount/`, `/mount slot/` — no matches.

Mounts are not modelled: accessories are separate gear items (the mount is a line of description text) and nothing limits a firearm to one accessory per top/barrel/underbarrel mount or by weapon class.

### rules/weapons.md#229

Guide: | Smartgun, internal | — | — | — | +100% | Built in; doubles the gun's cost if added later. |

> "Ultrasound Goggles Top/under -1 .25 6/36 hrs +100% Weapon 4P-N" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.282

Searched: `/doubles? (the )?(weapon|gun)/` — no matches.

No Smartgun, internal item or cost doubling exists; firearms carry a built-in smartgun as a true/false flag (system.smartgun) with no pricing.

### rules/weapons.md#233

Guide: - Imaging scopes can't be used with a smartlink *(SR3 p.280)*.

> "only be top-mounted, may not be used with smartlink systems," — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.280

Searched: `/incompatible with (a )?smartlink|(scope|imaging).{0,40}(may not|cannot) (be )?used? with (a )?smartlink/` — no matches.

No code stops or warns about an imaging scope together with a smartlink.

### street/cyberware-grades.md#20

Guide: - Most shadow clinics can supply basic, alpha and often beta.

> "Betaware is not available to starting characters" — Shadowrun 3e - Man and Machine Cyberware {FASA7126}.pdf, printed p.45

Searched: `/not available to starting|starting characters?[^\n]*(beta|delta)/` — no matches.

The grade multipliers are on the item sheet; the rule that betaware is not available to starting characters, and clinic availability, are not enforced.

### street/cyberware-grades.md#21

Guide: ### Matching grades  *(M&M p.45)*

> "Accessories to a device that is alpha-, beta- or delta-grade must also be of the same grade" — Shadowrun 3e - Man and Machine Cyberware {FASA7126}.pdf, printed p.45

Searched: `/same grade|grade mismatch|matchGrade/` — no matches.

### street/cyberware-grades.md#22

Guide: Accessories for an alpha, beta or delta device must be the **same grade**.

> "Accessories to a device that is alpha-, beta- or delta-grade must also be of the same grade" — Shadowrun 3e - Man and Machine Cyberware {FASA7126}.pdf, printed p.45

Searched: `/same grade|grade mismatch|matchGrade/` — no matches.

### street/cyberware-grades.md#43

Guide: - The implant takes **1D6 ÷ 2 Stress** coming out. If the procedure fails,

> "Removing cyberware incurs permanent damage to the implant" — Shadowrun 3e - Man and Machine Cyberware {FASA7126}.pdf, printed p.147
> "If this procedure fails, the cyberware is not removed, it suffers 1D6" — Shadowrun 3e - Man and Machine Cyberware {FASA7126}.pdf, printed p.147

Searched: `/removalStress|stress on removal|removal stress/` — no matches.

Removal is just deleting the item: the 1D6 ÷ 2 Stress from the removal and the failed-procedure Stress Test are not applied.

### street/cyberware-grades.md#47

Guide: *Man & Machine* has no separate resale rule for used implants, so sell them

> "The base price for most loot is 30 percent of its actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238
> "If the team won, the payment price will not rise above 50 percent of the actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238

Searched: `/Finding a Fence|fenceBankroll|fencingFlow|Hustle It Along/` — no matches.

Resale of harvested chrome goes through the fencing rules, which are not built (see gear-and-fencing.md #43-70). The example arithmetic checks: 2,500 + 11,500 = 14,000; 30% = 4,200; 10% = 1,400; 50% = 7,000.

### street/cyberware-grades.md#48

Guide: **Example.** A dead samurai's **smartlink** (2,500¥) and **retractable

> "The base price for most loot is 30 percent of its actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238
> "If the team won, the payment price will not rise above 50 percent of the actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238

Searched: `/Finding a Fence|fenceBankroll|fencingFlow|Hustle It Along/` — no matches.

Resale of harvested chrome goes through the fencing rules, which are not built (see gear-and-fencing.md #43-70). The example arithmetic checks: 2,500 + 11,500 = 14,000; 30% = 4,200; 10% = 1,400; 50% = 7,000.

### street/cyberware-grades.md#50

Guide: ## Being scanned  *(SR3 p.237)*

> "Cyberware scanning systems generally are rated between 3 and 9" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.237
> "The target number for typical cyberware is 3, for alphaware it is 6" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.237

Searched: `/cyberware scan|scanner rating|cyberwareScan/` — no matches.

### street/cyberware-grades.md#51

Guide: Cyberware scanners are usually rated **3–9**. The scanner rolls its rating

> "Cyberware scanning systems generally are rated between 3 and 9" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.237
> "The target number for typical cyberware is 3, for alphaware it is 6" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.237

Searched: `/cyberware scan|scanner rating|cyberwareScan/` — no matches.

### street/gear-and-fencing.md#4

Guide: {: .fixed }

> "Whichever side wins the Negotiation Test alters the price paid in his or her favor by 5 percent per extra success" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238
> "If the fence won, the payment price will not drop below 10 percent of the actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238

Searched: `/Finding a Fence|fenceBankroll|fencingFlow|Hustle It Along/` — no matches.

Composite errata callout. What is implemented (Availability as TN / base time, successes dividing the time, −1 TN for 2 days and +0.1 Street Index, negotiation at 5% per net success) is checked at #9, #16-20. Not implemented: Legality Codes (the 6P-E notation is not stored on any pack item) and fencing, whose 30% base, 5% per net success, 10% floor and 50% ceiling are at #43-70. The 'Ares Predator III is not in the core rulebook' claim is true (no such entry in the text).

### street/gear-and-fencing.md#8

Guide: | **Concealability** | TN for Perception Tests to spot it. Searches use half. |

> "Searches have a target number of half the regular Concealability Rating (rounding down)" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.270

Searched: `/searches have|half the regular Concealability|concealabilityTN|searchTN/` — no matches.

### street/gear-and-fencing.md#12

Guide: | **Legality** | Restriction level, permit availability, and category. |

> "Legality represents whether or not it is illegal to own the item, carry or transport it, what restriction category it falls into, and whether or not permits for the item are available" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.272

Searched: `/Local Fines|restriction level|enforcement area/` — no matches.

A legality text field exists on a few item types (drugs, one other), but Legality Codes are not stored on weapons and gear and nothing interprets them.

### street/gear-and-fencing.md#13

Guide: At character creation, no gear may have a Device Rating above **6** or an

> "no character may start the game with a piece of gear whose Availability is greater than 8" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.270

Searched: `/Availability (is )?greater than 8|deviceRating\s*[<>]=?\s*6|maxStartingAvail/` — no matches.

The dwarf +10% / troll +25% surcharge is implemented (purchasing.mjs RACIAL_SURCHARGE). The character-creation limits (Device Rating at most 6, Availability at most 8) are not enforced.

### street/gear-and-fencing.md#20

Guide: 5. **Pick up.** If you won't pay, the deal is off, and the GM may raise the

> "gamemasters can adjust the Availability target number upward the next time the character searches for something through that contact" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.273

Searched: `/stingy|raise the Availability|contact.*Availability.*next time|contactPenalty/` — no matches.

The deal being off if you won't pay is a card nobody presses (nothing is charged until 💴). Raising the Availability TN for that contact next time is not tracked.

### street/gear-and-fencing.md#29

Guide: ## Legality Codes  *(SR3 p.273–274)*

> "The first number of this two-part code represents the severity of restriction; the lower the number, the higher the restriction level" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.273
> "Any additional successes indicate that the officer will press the issue" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.273

Searched: `/Local Fines|restriction level|enforcement area/` — no matches.

Legality Codes and the Local Fines and Punishment Table are not modelled: nothing interprets a code, rolls a Security / Police Procedures test, applies enforcement modifiers, or lists fines.

### street/gear-and-fencing.md#31

Guide: - **6** is the **restriction level**. The lower the number, the more tightly

> "The first number of this two-part code represents the severity of restriction; the lower the number, the higher the restriction level" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.273
> "Any additional successes indicate that the officer will press the issue" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.273

Searched: `/Local Fines|restriction level|enforcement area/` — no matches.

Legality Codes and the Local Fines and Punishment Table are not modelled: nothing interprets a code, rolls a Security / Police Procedures test, applies enforcement modifiers, or lists fines.

### street/gear-and-fencing.md#32

Guide: - **P** means a **permit is available**. See

> "The first number of this two-part code represents the severity of restriction; the lower the number, the higher the restriction level" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.273
> "Any additional successes indicate that the officer will press the issue" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.273

Searched: `/Local Fines|restriction level|enforcement area/` — no matches.

Legality Codes and the Local Fines and Punishment Table are not modelled: nothing interprets a code, rolls a Security / Police Procedures test, applies enforcement modifiers, or lists fines.

### street/gear-and-fencing.md#33

Guide: - **E** is the **category** on the Local Fines and Punishment Table.

> "The first number of this two-part code represents the severity of restriction; the lower the number, the higher the restriction level" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.273
> "Any additional successes indicate that the officer will press the issue" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.273

Searched: `/Local Fines|restriction level|enforcement area/` — no matches.

Legality Codes and the Local Fines and Punishment Table are not modelled: nothing interprets a code, rolls a Security / Police Procedures test, applies enforcement modifiers, or lists fines.

### street/gear-and-fencing.md#34

Guide: Legal items have no code. They can be bought over the counter, but only in

> "The first number of this two-part code represents the severity of restriction; the lower the number, the higher the restriction level" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.273
> "Any additional successes indicate that the officer will press the issue" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.273

Searched: `/Local Fines|restriction level|enforcement area/` — no matches.

Legality Codes and the Local Fines and Punishment Table are not modelled: nothing interprets a code, rolls a Security / Police Procedures test, applies enforcement modifiers, or lists fines.

### street/gear-and-fencing.md#35

Guide: ### Categories  *(SR3 p.274)*

> "The first number of this two-part code represents the severity of restriction; the lower the number, the higher the restriction level" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.273
> "Any additional successes indicate that the officer will press the issue" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.273

Searched: `/Local Fines|restriction level|enforcement area/` — no matches.

Legality Codes and the Local Fines and Punishment Table are not modelled: nothing interprets a code, rolls a Security / Police Procedures test, applies enforcement modifiers, or lists fines.

### street/gear-and-fencing.md#36

Guide: | **A** Small blade | **F** Rifle | **L** Military armor | **S** Class D Matrix (unregistered decks and software) |

> "The first number of this two-part code represents the severity of restriction; the lower the number, the higher the restriction level" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.273
> "Any additional successes indicate that the officer will press the issue" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.273

Searched: `/Local Fines|restriction level|enforcement area/` — no matches.

Legality Codes and the Local Fines and Punishment Table are not modelled: nothing interprets a code, rolls a Security / Police Procedures test, applies enforcement modifiers, or lists fines.

### street/gear-and-fencing.md#37

Guide: | **B** Large blade | **G** Automatic weapon | **M** Military ammunition | **T** Class E Magic (unregistered spells, spirits, foci) |

> "The first number of this two-part code represents the severity of restriction; the lower the number, the higher the restriction level" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.273
> "Any additional successes indicate that the officer will press the issue" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.273

Searched: `/Local Fines|restriction level|enforcement area/` — no matches.

Legality Codes and the Local Fines and Punishment Table are not modelled: nothing interprets a code, rolls a Security / Police Procedures test, applies enforcement modifiers, or lists fines.

### street/gear-and-fencing.md#38

Guide: | **C** Blunt weapon | **H** Heavy weapon | **N** Class A cyberware (paralegal) | **U / V / W** Class A / B / C equipment |

> "The first number of this two-part code represents the severity of restriction; the lower the number, the higher the restriction level" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.273
> "Any additional successes indicate that the officer will press the issue" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.273

Searched: `/Local Fines|restriction level|enforcement area/` — no matches.

Legality Codes and the Local Fines and Punishment Table are not modelled: nothing interprets a code, rolls a Security / Police Procedures test, applies enforcement modifiers, or lists fines.

### street/gear-and-fencing.md#39

Guide: | **D** Projectile | **J** Explosives | **Q** Class B cyberware (security grade) | **X / Y / Z** Class A / B / C controlled substances |

> "The first number of this two-part code represents the severity of restriction; the lower the number, the higher the restriction level" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.273
> "Any additional successes indicate that the officer will press the issue" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.273

Searched: `/Local Fines|restriction level|enforcement area/` — no matches.

Legality Codes and the Local Fines and Punishment Table are not modelled: nothing interprets a code, rolls a Security / Police Procedures test, applies enforcement modifiers, or lists fines.

### street/gear-and-fencing.md#40

Guide: | **E** Pistol | **K** Military weapon | **R** Class C cyberware (military grade) | |

> "The first number of this two-part code represents the severity of restriction; the lower the number, the higher the restriction level" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.273
> "Any additional successes indicate that the officer will press the issue" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.273

Searched: `/Local Fines|restriction level|enforcement area/` — no matches.

Legality Codes and the Local Fines and Punishment Table are not modelled: nothing interprets a code, rolls a Security / Police Procedures test, applies enforcement modifiers, or lists fines.

### street/gear-and-fencing.md#41

Guide: The table also lists fines and prison terms for **possession, transport,

> "The first number of this two-part code represents the severity of restriction; the lower the number, the higher the restriction level" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.273
> "Any additional successes indicate that the officer will press the issue" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.273

Searched: `/Local Fines|restriction level|enforcement area/` — no matches.

Legality Codes and the Local Fines and Punishment Table are not modelled: nothing interprets a code, rolls a Security / Police Procedures test, applies enforcement modifiers, or lists fines.

### street/gear-and-fencing.md#43

Guide: ## Fencing the loot  *(SR3 p.237–238)*

> "If a shadowrunning team has a prearranged deal for disposing of loot, then the following rules do not apply" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.237

Searched: `/Finding a Fence|fenceBankroll|fencingFlow|Hustle It Along/` — no matches.

### street/gear-and-fencing.md#44

Guide: If the job came with an agreed way to dispose of the loot, these rules don't

> "Finding a fence requires a successful Etiquette (Street) Test. The Base Target Number is 4" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.237
> "The base price for most loot is 30 percent of its actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238
> "If the team won, the payment price will not rise above 50 percent of the actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238

Searched: `/Finding a Fence|fenceBankroll|fencingFlow|Hustle It Along/` — no matches.

The whole fencing procedure (Finding a Fence test at TN 4 with its modifiers, hustling and financing the fence, the meet at 30% ± 5% per net success within 10%-50%) is not built; only the Fences skill exists.

### street/gear-and-fencing.md#45

Guide: ### 1. Find a fence  *(SR3 p.237)*

> "Finding a fence requires a successful Etiquette (Street) Test. The Base Target Number is 4" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.237
> "The base price for most loot is 30 percent of its actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238
> "If the team won, the payment price will not rise above 50 percent of the actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238

Searched: `/Finding a Fence|fenceBankroll|fencingFlow|Hustle It Along/` — no matches.

The whole fencing procedure (Finding a Fence test at TN 4 with its modifiers, hustling and financing the fence, the meet at 30% ± 5% per net success within 10%-50%) is not built; only the Fences skill exists.

### street/gear-and-fencing.md#46

Guide: Make an **Etiquette (Street) Test** against **TN 4**, modified as below. A

> "Finding a fence requires a successful Etiquette (Street) Test. The Base Target Number is 4" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.237
> "The base price for most loot is 30 percent of its actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238
> "If the team won, the payment price will not rise above 50 percent of the actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238

Searched: `/Finding a Fence|fenceBankroll|fencingFlow|Hustle It Along/` — no matches.

The whole fencing procedure (Finding a Fence test at TN 4 with its modifiers, hustling and financing the fence, the meet at 30% ± 5% per net success within 10%-50%) is not built; only the Fences skill exists.

### street/gear-and-fencing.md#47

Guide: #### Finding a Fence Table  *(SR3 p.238)*

> "Finding a fence requires a successful Etiquette (Street) Test. The Base Target Number is 4" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.237
> "The base price for most loot is 30 percent of its actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238
> "If the team won, the payment price will not rise above 50 percent of the actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238

Searched: `/Finding a Fence|fenceBankroll|fencingFlow|Hustle It Along/` — no matches.

The whole fencing procedure (Finding a Fence test at TN 4 with its modifiers, hustling and financing the fence, the meet at 30% ± 5% per net success within 10%-50%) is not built; only the Fences skill exists.

### street/gear-and-fencing.md#49

Guide: | Using a regular contact | −1 |

> "Finding a fence requires a successful Etiquette (Street) Test. The Base Target Number is 4" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.237
> "The base price for most loot is 30 percent of its actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238
> "If the team won, the payment price will not rise above 50 percent of the actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238

Searched: `/Finding a Fence|fenceBankroll|fencingFlow|Hustle It Along/` — no matches.

The whole fencing procedure (Finding a Fence test at TN 4 with its modifiers, hustling and financing the fence, the meet at 30% ± 5% per net success within 10%-50%) is not built; only the Fences skill exists.

### street/gear-and-fencing.md#50

Guide: | Disposing of standard gear | −1 |

> "Finding a fence requires a successful Etiquette (Street) Test. The Base Target Number is 4" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.237
> "The base price for most loot is 30 percent of its actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238
> "If the team won, the payment price will not rise above 50 percent of the actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238

Searched: `/Finding a Fence|fenceBankroll|fencingFlow|Hustle It Along/` — no matches.

The whole fencing procedure (Finding a Fence test at TN 4 with its modifiers, hustling and financing the fence, the meet at 30% ± 5% per net success within 10%-50%) is not built; only the Fences skill exists.

### street/gear-and-fencing.md#51

Guide: | Disposing of hi-tech or other important loot | +1 |

> "Finding a fence requires a successful Etiquette (Street) Test. The Base Target Number is 4" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.237
> "The base price for most loot is 30 percent of its actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238
> "If the team won, the payment price will not rise above 50 percent of the actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238

Searched: `/Finding a Fence|fenceBankroll|fencingFlow|Hustle It Along/` — no matches.

The whole fencing procedure (Finding a Fence test at TN 4 with its modifiers, hustling and financing the fence, the meet at 30% ± 5% per net success within 10%-50%) is not built; only the Fences skill exists.

### street/gear-and-fencing.md#52

Guide: | Disposing of hot loot | +3 |

> "Finding a fence requires a successful Etiquette (Street) Test. The Base Target Number is 4" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.237
> "The base price for most loot is 30 percent of its actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238
> "If the team won, the payment price will not rise above 50 percent of the actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238

Searched: `/Finding a Fence|fenceBankroll|fencingFlow|Hustle It Along/` — no matches.

The whole fencing procedure (Finding a Fence test at TN 4 with its modifiers, hustling and financing the fence, the meet at 30% ± 5% per net success within 10%-50%) is not built; only the Fences skill exists.

### street/gear-and-fencing.md#53

Guide: | Being sought by the police | +1 |

> "Finding a fence requires a successful Etiquette (Street) Test. The Base Target Number is 4" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.237
> "The base price for most loot is 30 percent of its actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238
> "If the team won, the payment price will not rise above 50 percent of the actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238

Searched: `/Finding a Fence|fenceBankroll|fencingFlow|Hustle It Along/` — no matches.

The whole fencing procedure (Finding a Fence test at TN 4 with its modifiers, hustling and financing the fence, the meet at 30% ± 5% per net success within 10%-50%) is not built; only the Fences skill exists.

### street/gear-and-fencing.md#54

Guide: | Being sought by a corp or organized crime | +2 |

> "Finding a fence requires a successful Etiquette (Street) Test. The Base Target Number is 4" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.237
> "The base price for most loot is 30 percent of its actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238
> "If the team won, the payment price will not rise above 50 percent of the actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238

Searched: `/Finding a Fence|fenceBankroll|fencingFlow|Hustle It Along/` — no matches.

The whole fencing procedure (Finding a Fence test at TN 4 with its modifiers, hustling and financing the fence, the meet at 30% ± 5% per net success within 10%-50%) is not built; only the Fences skill exists.

### street/gear-and-fencing.md#55

Guide: | Magical loot (foci, spell formulae and so on) | +2 |

> "Finding a fence requires a successful Etiquette (Street) Test. The Base Target Number is 4" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.237
> "The base price for most loot is 30 percent of its actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238
> "If the team won, the payment price will not rise above 50 percent of the actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238

Searched: `/Finding a Fence|fenceBankroll|fencingFlow|Hustle It Along/` — no matches.

The whole fencing procedure (Finding a Fence test at TN 4 with its modifiers, hustling and financing the fence, the meet at 30% ± 5% per net success within 10%-50%) is not built; only the Fences skill exists.

### street/gear-and-fencing.md#56

Guide: Fences prefer, in this order: **standard gear** (weapons, armor, vehicles,

> "Finding a fence requires a successful Etiquette (Street) Test. The Base Target Number is 4" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.237
> "The base price for most loot is 30 percent of its actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238
> "If the team won, the payment price will not rise above 50 percent of the actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238

Searched: `/Finding a Fence|fenceBankroll|fencingFlow|Hustle It Along/` — no matches.

The whole fencing procedure (Finding a Fence test at TN 4 with its modifiers, hustling and financing the fence, the meet at 30% ± 5% per net success within 10%-50%) is not built; only the Fences skill exists.

### street/gear-and-fencing.md#57

Guide: ### 2. Spend your successes  *(SR3 p.237–238)*

> "Finding a fence requires a successful Etiquette (Street) Test. The Base Target Number is 4" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.237
> "The base price for most loot is 30 percent of its actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238
> "If the team won, the payment price will not rise above 50 percent of the actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238

Searched: `/Finding a Fence|fenceBankroll|fencingFlow|Hustle It Along/` — no matches.

The whole fencing procedure (Finding a Fence test at TN 4 with its modifiers, hustling and financing the fence, the meet at 30% ± 5% per net success within 10%-50%) is not built; only the Fences skill exists.

### street/gear-and-fencing.md#58

Guide: You can split them between two uses:

> "Finding a fence requires a successful Etiquette (Street) Test. The Base Target Number is 4" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.237
> "The base price for most loot is 30 percent of its actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238
> "If the team won, the payment price will not rise above 50 percent of the actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238

Searched: `/Finding a Fence|fenceBankroll|fencingFlow|Hustle It Along/` — no matches.

The whole fencing procedure (Finding a Fence test at TN 4 with its modifiers, hustling and financing the fence, the meet at 30% ± 5% per net success within 10%-50%) is not built; only the Fences skill exists.

### street/gear-and-fencing.md#59

Guide: - **Hurry it along**: finding a fence takes a base **10 days**, and each

> "Finding a fence requires a successful Etiquette (Street) Test. The Base Target Number is 4" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.237
> "The base price for most loot is 30 percent of its actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238
> "If the team won, the payment price will not rise above 50 percent of the actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238

Searched: `/Finding a Fence|fenceBankroll|fencingFlow|Hustle It Along/` — no matches.

The whole fencing procedure (Finding a Fence test at TN 4 with its modifiers, hustling and financing the fence, the meet at 30% ± 5% per net success within 10%-50%) is not built; only the Fences skill exists.

### street/gear-and-fencing.md#60

Guide: - **Finance the fence**: the GM secretly rolls **2D6 × 100,000¥** and

> "Finding a fence requires a successful Etiquette (Street) Test. The Base Target Number is 4" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.237
> "The base price for most loot is 30 percent of its actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238
> "If the team won, the payment price will not rise above 50 percent of the actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238

Searched: `/Finding a Fence|fenceBankroll|fencingFlow|Hustle It Along/` — no matches.

The whole fencing procedure (Finding a Fence test at TN 4 with its modifiers, hustling and financing the fence, the meet at 30% ± 5% per net success within 10%-50%) is not built; only the Fences skill exists.

### street/gear-and-fencing.md#61

Guide: ### 3. The meet  *(SR3 p.238)*

> "Finding a fence requires a successful Etiquette (Street) Test. The Base Target Number is 4" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.237
> "The base price for most loot is 30 percent of its actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238
> "If the team won, the payment price will not rise above 50 percent of the actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238

Searched: `/Finding a Fence|fenceBankroll|fencingFlow|Hustle It Along/` — no matches.

The whole fencing procedure (Finding a Fence test at TN 4 with its modifiers, hustling and financing the fence, the meet at 30% ± 5% per net success within 10%-50%) is not built; only the Fences skill exists.

### street/gear-and-fencing.md#62

Guide: - One character and the fence each roll **Negotiation against the other's

> "Finding a fence requires a successful Etiquette (Street) Test. The Base Target Number is 4" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.237
> "The base price for most loot is 30 percent of its actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238
> "If the team won, the payment price will not rise above 50 percent of the actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238

Searched: `/Finding a Fence|fenceBankroll|fencingFlow|Hustle It Along/` — no matches.

The whole fencing procedure (Finding a Fence test at TN 4 with its modifiers, hustling and financing the fence, the meet at 30% ± 5% per net success within 10%-50%) is not built; only the Fences skill exists.

### street/gear-and-fencing.md#63

Guide: - The **base price is 30%** of the item's listed value. The winner shifts it

> "Finding a fence requires a successful Etiquette (Street) Test. The Base Target Number is 4" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.237
> "The base price for most loot is 30 percent of its actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238
> "If the team won, the payment price will not rise above 50 percent of the actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238

Searched: `/Finding a Fence|fenceBankroll|fencingFlow|Hustle It Along/` — no matches.

The whole fencing procedure (Finding a Fence test at TN 4 with its modifiers, hustling and financing the fence, the meet at 30% ± 5% per net success within 10%-50%) is not built; only the Fences skill exists.

### street/gear-and-fencing.md#64

Guide: - **The fence can't push it below 10%, and the team can't push it above

> "Finding a fence requires a successful Etiquette (Street) Test. The Base Target Number is 4" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.237
> "The base price for most loot is 30 percent of its actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238
> "If the team won, the payment price will not rise above 50 percent of the actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238

Searched: `/Finding a Fence|fenceBankroll|fencingFlow|Hustle It Along/` — no matches.

The whole fencing procedure (Finding a Fence test at TN 4 with its modifiers, hustling and financing the fence, the meet at 30% ± 5% per net success within 10%-50%) is not built; only the Fences skill exists.

### street/gear-and-fencing.md#65

Guide: - The fence will bring muscle. If the former owners are hunting the loot,

> "Finding a fence requires a successful Etiquette (Street) Test. The Base Target Number is 4" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.237
> "The base price for most loot is 30 percent of its actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238
> "If the team won, the payment price will not rise above 50 percent of the actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238

Searched: `/Finding a Fence|fenceBankroll|fencingFlow|Hustle It Along/` — no matches.

The whole fencing procedure (Finding a Fence test at TN 4 with its modifiers, hustling and financing the fence, the meet at 30% ± 5% per net success within 10%-50%) is not built; only the Fences skill exists.

### street/gear-and-fencing.md#66

Guide: ### Example: five HK227 SMGs

> "If the team won, the payment price will not rise above 50 percent of the actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238

Searched: `/Finding a Fence|fenceBankroll|fencingFlow|Hustle It Along/` — no matches.

Worked example of the unbuilt fencing procedure. Arithmetic checks: 5 × 1,500 = 7,500; 30% = 2,250; +15% = 45% = 3,375; capped at 50% = 3,750. (The HK227 in the pack is priced 1,500¥.)

### street/gear-and-fencing.md#67

Guide: - The **Heckler & Koch HK227** costs **1,500¥** each, so five are worth

> "If the team won, the payment price will not rise above 50 percent of the actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238

Searched: `/Finding a Fence|fenceBankroll|fencingFlow|Hustle It Along/` — no matches.

Worked example of the unbuilt fencing procedure. Arithmetic checks: 5 × 1,500 = 7,500; 30% = 2,250; +15% = 45% = 3,375; capped at 50% = 3,750. (The HK227 in the pack is priced 1,500¥.)

### street/gear-and-fencing.md#68

Guide: - The fence's base offer is 30%, which is **2,250¥**.

> "If the team won, the payment price will not rise above 50 percent of the actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238

Searched: `/Finding a Fence|fenceBankroll|fencingFlow|Hustle It Along/` — no matches.

Worked example of the unbuilt fencing procedure. Arithmetic checks: 5 × 1,500 = 7,500; 30% = 2,250; +15% = 45% = 3,375; capped at 50% = 3,750. (The HK227 in the pack is priced 1,500¥.)

### street/gear-and-fencing.md#69

Guide: - The team's face wins by 3 successes: +15%, for 45%, or **3,375¥**.

> "If the team won, the payment price will not rise above 50 percent of the actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238

Searched: `/Finding a Fence|fenceBankroll|fencingFlow|Hustle It Along/` — no matches.

Worked example of the unbuilt fencing procedure. Arithmetic checks: 5 × 1,500 = 7,500; 30% = 2,250; +15% = 45% = 3,375; capped at 50% = 3,750. (The HK227 in the pack is priced 1,500¥.)

### street/gear-and-fencing.md#70

Guide: - Winning by 5 would reach 55%, but the ceiling holds it at **50%**, which is

> "If the team won, the payment price will not rise above 50 percent of the actual value" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238

Searched: `/Finding a Fence|fenceBankroll|fencingFlow|Hustle It Along/` — no matches.

Worked example of the unbuilt fencing procedure. Arithmetic checks: 5 × 1,500 = 7,500; 30% = 2,250; +15% = 45% = 3,375; capped at 50% = 3,750. (The HK227 in the pack is priced 1,500¥.)

### street/sins.md#4

Guide: {: .fixed }

> "Availability Rating/24 hours Rating/72 hours Rating/14 days Rating/30 days Street Index 1 1 1 1" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.239
> "The actual numbers that compose a SIN are generated by a complex formula from several pieces of personal data" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.238
> "If using a fake ID (see p. 239) to purchase a permit, the ID must beat a Rating 6 verification system in an Opposed Test" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.274

Searched: `/credstick|criminal SIN|forged (credstick|ID)|fake SIN/` — no matches.

Composite errata callout. Checked against the book: a forged credstick's price is Rating × Rating × 1,000¥ at ratings 1-4 (p.239) and rises after that; SIN numbers are generated from personal data (p.238); Force 3+ magic is regulated with permits (MitS p.11); Class E Magic covers unregistered spells, spirits and foci (p.274); permits need a valid SIN and a fake must beat a Rating 6 system (p.274). The '30-40% of the population is SINless' claim is an absence claim I did not search for. None of this is modelled in the system.

### street/sins.md#22

Guide: | Standard | 1–5,000¥ | Passcode |

> "ID Required Passcode Fingerprint Voiceprint Retinal Scan Cellular scan" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.239

Searched: `/credstick|criminal SIN|forged (credstick|ID)|fake SIN/` — no matches.

Credsticks (transaction limits and the ID each needs) are not modelled; the system only has a nuyen number.

### street/sins.md#23

Guide: | Silver | 1–20,000¥ | Fingerprint |

> "ID Required Passcode Fingerprint Voiceprint Retinal Scan Cellular scan" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.239

Searched: `/credstick|criminal SIN|forged (credstick|ID)|fake SIN/` — no matches.

Credsticks (transaction limits and the ID each needs) are not modelled; the system only has a nuyen number.

### street/sins.md#24

Guide: | Gold | 1–200,000¥ | Voiceprint |

> "ID Required Passcode Fingerprint Voiceprint Retinal Scan Cellular scan" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.239

Searched: `/credstick|criminal SIN|forged (credstick|ID)|fake SIN/` — no matches.

Credsticks (transaction limits and the ID each needs) are not modelled; the system only has a nuyen number.

### street/sins.md#25

Guide: | Platinum | 1–1,000,000¥ | Retinal scan |

> "ID Required Passcode Fingerprint Voiceprint Retinal Scan Cellular scan" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.239

Searched: `/credstick|criminal SIN|forged (credstick|ID)|fake SIN/` — no matches.

Credsticks (transaction limits and the ID each needs) are not modelled; the system only has a nuyen number.

### street/sins.md#26

Guide: | Ebony | Unlimited | Cellular scan |

> "ID Required Passcode Fingerprint Voiceprint Retinal Scan Cellular scan" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.239

Searched: `/credstick|criminal SIN|forged (credstick|ID)|fake SIN/` — no matches.

Credsticks (transaction limits and the ID each needs) are not modelled; the system only has a nuyen number.

### street/sins.md#27

Guide: A **certified credstick** is registered to no one. It's worth what's loaded

> "Similar to a cash or bearer bond, a certified credstick is not registered to a specific person" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.239

Searched: `/credstick|criminal SIN|forged (credstick|ID)|fake SIN/` — no matches.

### street/sins.md#29

Guide: ## Fake IDs: forging credsticks  *(SR3 p.239)*

> "half the cost of creating the credstick must be paid to the fixer in advance" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.239

Searched: `/credstick|criminal SIN|forged (credstick|ID)|fake SIN/` — no matches.

### street/sins.md#30

Guide: Faking an identity means inserting a believable credit history into

> "half the cost of creating the credstick must be paid to the fixer in advance" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.239

Searched: `/credstick|criminal SIN|forged (credstick|ID)|fake SIN/` — no matches.

### street/sins.md#31

Guide: ### Creating a Credstick Table  *(SR3 p.239)*

> "Availability Rating/24 hours Rating/72 hours Rating/14 days Rating/30 days Street Index 1 1 1 1" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.239
> "At least Stick Rating 1-4 5-8 9-12 13+" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.239

Searched: `/credstick|criminal SIN|forged (credstick|ID)|fake SIN/` — no matches.

The Creating a Credstick Table (1-4: Rating × Rating × 1,000¥, Rating/24 hours; 5-8: Rating × 5,000¥, /72 hours; 9-12: Rating × 10,000¥, /14 days; 13+: Rating × 50,000¥, /30 days; Street Index 1) has no counterpart. The example arithmetic checks: 4×4×1,000 = 16,000; 6×5,000 = 30,000; 10×10,000 = 100,000.

### street/sins.md#33

Guide: | 1–4 | Rating × Rating × 1,000¥ | Rating / 24 hours | 1 |

> "Availability Rating/24 hours Rating/72 hours Rating/14 days Rating/30 days Street Index 1 1 1 1" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.239
> "At least Stick Rating 1-4 5-8 9-12 13+" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.239

Searched: `/credstick|criminal SIN|forged (credstick|ID)|fake SIN/` — no matches.

The Creating a Credstick Table (1-4: Rating × Rating × 1,000¥, Rating/24 hours; 5-8: Rating × 5,000¥, /72 hours; 9-12: Rating × 10,000¥, /14 days; 13+: Rating × 50,000¥, /30 days; Street Index 1) has no counterpart. The example arithmetic checks: 4×4×1,000 = 16,000; 6×5,000 = 30,000; 10×10,000 = 100,000.

### street/sins.md#34

Guide: | 5–8 | Rating × 5,000¥ | Rating / 72 hours | 1 |

> "Availability Rating/24 hours Rating/72 hours Rating/14 days Rating/30 days Street Index 1 1 1 1" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.239
> "At least Stick Rating 1-4 5-8 9-12 13+" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.239

Searched: `/credstick|criminal SIN|forged (credstick|ID)|fake SIN/` — no matches.

The Creating a Credstick Table (1-4: Rating × Rating × 1,000¥, Rating/24 hours; 5-8: Rating × 5,000¥, /72 hours; 9-12: Rating × 10,000¥, /14 days; 13+: Rating × 50,000¥, /30 days; Street Index 1) has no counterpart. The example arithmetic checks: 4×4×1,000 = 16,000; 6×5,000 = 30,000; 10×10,000 = 100,000.

### street/sins.md#35

Guide: | 9–12 | Rating × 10,000¥ | Rating / 14 days | 1 |

> "Availability Rating/24 hours Rating/72 hours Rating/14 days Rating/30 days Street Index 1 1 1 1" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.239
> "At least Stick Rating 1-4 5-8 9-12 13+" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.239

Searched: `/credstick|criminal SIN|forged (credstick|ID)|fake SIN/` — no matches.

The Creating a Credstick Table (1-4: Rating × Rating × 1,000¥, Rating/24 hours; 5-8: Rating × 5,000¥, /72 hours; 9-12: Rating × 10,000¥, /14 days; 13+: Rating × 50,000¥, /30 days; Street Index 1) has no counterpart. The example arithmetic checks: 4×4×1,000 = 16,000; 6×5,000 = 30,000; 10×10,000 = 100,000.

### street/sins.md#36

Guide: | 13+ | Rating × 50,000¥ | Rating / 30 days | 1 |

> "Availability Rating/24 hours Rating/72 hours Rating/14 days Rating/30 days Street Index 1 1 1 1" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.239
> "At least Stick Rating 1-4 5-8 9-12 13+" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.239

Searched: `/credstick|criminal SIN|forged (credstick|ID)|fake SIN/` — no matches.

The Creating a Credstick Table (1-4: Rating × Rating × 1,000¥, Rating/24 hours; 5-8: Rating × 5,000¥, /72 hours; 9-12: Rating × 10,000¥, /14 days; 13+: Rating × 50,000¥, /30 days; Street Index 1) has no counterpart. The example arithmetic checks: 4×4×1,000 = 16,000; 6×5,000 = 30,000; 10×10,000 = 100,000.

### street/sins.md#37

Guide: For example, a Rating 4 ID costs **16,000¥**, a Rating 6 costs **30,000¥**,

> "Availability Rating/24 hours Rating/72 hours Rating/14 days Rating/30 days Street Index 1 1 1 1" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.239
> "At least Stick Rating 1-4 5-8 9-12 13+" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.239

Searched: `/credstick|criminal SIN|forged (credstick|ID)|fake SIN/` — no matches.

The Creating a Credstick Table (1-4: Rating × Rating × 1,000¥, Rating/24 hours; 5-8: Rating × 5,000¥, /72 hours; 9-12: Rating × 10,000¥, /14 days; 13+: Rating × 50,000¥, /30 days; Street Index 1) has no counterpart. The example arithmetic checks: 4×4×1,000 = 16,000; 6×5,000 = 30,000; 10×10,000 = 100,000.

### street/sins.md#38

Guide: **Using a fake**: make an **Opposed Test** of the stick's rating against

> "pitting their fake credstick's rating against the rating of the verification system. The side achieving the most successes wins" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.239

Searched: `/credstick|criminal SIN|forged (credstick|ID)|fake SIN/` — no matches.

### street/sins.md#39

Guide: ## Permits and licenses  *(SR3 p.273–274)*

> "the character must make an Etiquette Test against the Availability of the item, +2" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.274
> "The price for a permit to possess is usually 5 percent of the item's price 10 percent for a permit to possess and transport" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.274
> "Apply a -2 modifier to the Availability of an item when a character possesses an appropriate permit" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.274

Searched: `/permit (test|cost)|Etiquette[^\n]*permit|possess and transport/` — no matches.

Permits are not modelled (purchasing.mjs states this): no permit test, cost, criminal-SIN exclusion or -2 Availability with a permit.

### street/sins.md#40

Guide: - Gear whose Legality Code includes a **"P"** can be legally permitted.

> "the character must make an Etiquette Test against the Availability of the item, +2" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.274
> "The price for a permit to possess is usually 5 percent of the item's price 10 percent for a permit to possess and transport" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.274
> "Apply a -2 modifier to the Availability of an item when a character possesses an appropriate permit" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.274

Searched: `/permit (test|cost)|Etiquette[^\n]*permit|possess and transport/` — no matches.

Permits are not modelled (purchasing.mjs states this): no permit test, cost, criminal-SIN exclusion or -2 Availability with a permit.

### street/sins.md#41

Guide: - Test **Etiquette against the item's Availability + 2**. The base time is

> "the character must make an Etiquette Test against the Availability of the item, +2" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.274
> "The price for a permit to possess is usually 5 percent of the item's price 10 percent for a permit to possess and transport" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.274
> "Apply a -2 modifier to the Availability of an item when a character possesses an appropriate permit" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.274

Searched: `/permit (test|cost)|Etiquette[^\n]*permit|possess and transport/` — no matches.

Permits are not modelled (purchasing.mjs states this): no permit test, cost, criminal-SIN exclusion or -2 Availability with a permit.

### street/sins.md#42

Guide: - A permit to **possess** usually costs **5%** of the item's price. A permit

> "the character must make an Etiquette Test against the Availability of the item, +2" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.274
> "The price for a permit to possess is usually 5 percent of the item's price 10 percent for a permit to possess and transport" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.274
> "Apply a -2 modifier to the Availability of an item when a character possesses an appropriate permit" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.274

Searched: `/permit (test|cost)|Etiquette[^\n]*permit|possess and transport/` — no matches.

Permits are not modelled (purchasing.mjs states this): no permit test, cost, criminal-SIN exclusion or -2 Availability with a permit.

### street/sins.md#43

Guide: - **Criminal-SIN holders and the SINless can't get permits.** Applying with

> "the character must make an Etiquette Test against the Availability of the item, +2" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.274
> "The price for a permit to possess is usually 5 percent of the item's price 10 percent for a permit to possess and transport" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.274
> "Apply a -2 modifier to the Availability of an item when a character possesses an appropriate permit" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.274

Searched: `/permit (test|cost)|Etiquette[^\n]*permit|possess and transport/` — no matches.

Permits are not modelled (purchasing.mjs states this): no permit test, cost, criminal-SIN exclusion or -2 Availability with a permit.

### street/sins.md#44

Guide: - Holding the right permit gives **−2 to the item's Availability** when

> "the character must make an Etiquette Test against the Availability of the item, +2" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.274
> "The price for a permit to possess is usually 5 percent of the item's price 10 percent for a permit to possess and transport" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.274
> "Apply a -2 modifier to the Availability of an item when a character possesses an appropriate permit" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.274

Searched: `/permit (test|cost)|Etiquette[^\n]*permit|possess and transport/` — no matches.

Permits are not modelled (purchasing.mjs states this): no permit test, cost, criminal-SIN exclusion or -2 Availability with a permit.

### street/sins.md#47

Guide: - On the Local Fines and Punishment Table, **(T) Class E Magic** covers

> "Class E Magic refers to unregistered spells, spirits, and foci" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.274

Searched: `/Local Fines|restriction level|enforcement area/` — no matches.


## Could not be verified (262)

- **hiring/combat-mage.md#6** — Baseline Shadowrun Payment Table, Shadowrun Companion printed p.100 (PDF page 101 of the {FASA7905} scan) — the table sits on a grey shaded panel with no OCR text layer, so pdftotext finds nothing. Read from the rendered page image: the Security Duty row is 200¥/day, agreeing with this unit.
- **hiring/combat-mage.md#7** — Shadowrun Companion p.100 / p.101 baseline payment row. The PDF has no text layer and the SR-OCR text is too garbled to confirm the figure; the same figures are checked as a group on hiring/index.md. No code counterpart.
- **hiring/combat-mage.md#8** — Shadowrun Companion p.100 / p.101 baseline payment row. The PDF has no text layer and the SR-OCR text is too garbled to confirm the figure; the same figures are checked as a group on hiring/index.md. No code counterpart.
- **hiring/combat-mage.md#14** — Astral damage appearing on the physical body and disruption forcing a Magic Loss check are on printed p.175, an image-only page (no text layer). Read via the SR-OCR dump: 'The physical body manifests any damage inflicted on the astral form' and 'A character who is disrupted in astral combat must immediately check for Magic Loss (p. 160)' — the guide agrees. The Magic Loss check for disruption is not implemented.
- **hiring/combat-mage.md#15** — Legal background with no code counterpart. Checked against MitS printed p.11: Force 3+ magic is regulated in the UCAS and CAS, and a felony committed with magic is treated as premeditated; the guide agrees.
- **hiring/combat-mage.md#38** — House-rule text (hazard pay percentages and worked-example arithmetic): the guide marks it as not from any SR3 book, so there is nothing in the PDFs to check it against. The arithmetic was checked and is consistent.
- **hiring/combat-medic.md#9** — Baseline Shadowrun Payment Table, Shadowrun Companion printed p.100 — no text layer; the same Security Duty 200¥/day row is recorded as unverifiable on hiring/combat-mage.md#6 and checked as a group on hiring/index.md. No code counterpart.
- **hiring/combat-medic.md#44** — House-rule worked example (not from any SR3 book): 1,500 + 2 × 500 = 2,500 checks, and the 500¥ trauma patch is the book price (SR3 p.304); the 200¥/day security-duty comparison is SRComp p.100, which has no text layer.
- **hiring/combat-medic.md#45** — House-rule worked example (not from any SR3 book): 4,000 × 2 × 2 = 16,000 plus 3 × 500 = 1,500 is 17,500 — checks; nothing in the PDFs to compare the rates against.
- **hiring/decker.md#6** — Baseline Shadowrun Payment Table, Shadowrun Companion printed p.100 (PDF page 101 of the {FASA7905} scan) — image-only table, no text layer. Read from the page image: the Hacking row is 1,000¥ x Host's Security Value, agreeing with this unit.
- **hiring/decker.md#7** — Baseline Shadowrun Payment Table, Shadowrun Companion printed p.100 (PDF page 101 of the {FASA7905} scan) — image-only table, no text layer. Read from the page image: the Datasteal row is 20% value of data, agreeing with this unit.
- **hiring/decker.md#8** — Baseline Shadowrun Payment Table, Shadowrun Companion printed p.100 (PDF page 101 of the {FASA7905} scan) — image-only table, no text layer. Read from the page image: the Encryption/Decryption row is 200¥ per MP, agreeing with this unit.
- **hiring/decker.md#35** — House-rule text (hazard pay percentages and worked-example arithmetic): the guide marks it as not from any SR3 book, so there is nothing in the PDFs to check it against. The arithmetic was checked and is consistent.
- **hiring/decker.md#42** — House-rule text (hazard pay percentages and worked-example arithmetic): the guide marks it as not from any SR3 book, so there is nothing in the PDFs to check it against. The arithmetic was checked and is consistent.
- **hiring/face.md#3** — Composite errata callout. Commanding Voice (SOTA64 p.64-65) and Kinesics (p.66) exist and 'Authoritative Voice' is absent from the core text; a Rating 4 fake ID costs 16,000¥ and Rating 6 costs 30,000¥ by the Creating a Credstick Table (p.239, agrees); Corporate Download is not in the library. Fake IDs are not modelled in the system.
- **hiring/face.md#6** — Baseline Shadowrun Payment Table, Shadowrun Companion printed p.100 (PDF page 101 of the {FASA7905} scan) — image-only table, no text layer. Read from the page image: the Investigation row is 200¥/day, agreeing with this unit.
- **hiring/face.md#7** — Shadowrun Companion p.100 / p.101 baseline payment row. The PDF has no text layer and the SR-OCR text is too garbled to confirm the figure; the same figures are checked as a group on hiring/index.md. No code counterpart.
- **hiring/face.md#16** — Tailored pheromones (M&M printed p.71) — bioware entry; a reference item with no mechanical hook beyond its listed Bio Index and cost.
- **hiring/face.md#32** — House-rule text (hazard pay percentages and worked-example arithmetic): the guide marks it as not from any SR3 book, so there is nothing in the PDFs to check it against. The arithmetic was checked and is consistent.
- **hiring/index.md#4** — Errata callout. Checked against the book: the core rulebook has no section called 'Spells, Contacts, and Services' (searched the whole text layer). 'No SR3 book prices specialists by skill rating' is an absence claim across the library that I did not exhaustively search; the Baseline Shadowrun Payment Table is in the Shadowrun Companion, whose PDF has no text layer.
- **hiring/index.md#7** — Shadowrun Companion pp.99-100 (Setting the fee, the Baseline Shadowrun Payment Table and how to use it). The PDF is 'no-text' and the SR-OCR dump of it is too garbled to confirm individual figures (it does show the table's rows, the '200¥/day' bodyguard line and the amoral-campaign and windfall passages). No code counterpart.
- **hiring/index.md#8** — Shadowrun Companion pp.99-100 (Setting the fee, the Baseline Shadowrun Payment Table and how to use it). The PDF is 'no-text' and the SR-OCR dump of it is too garbled to confirm individual figures (it does show the table's rows, the '200¥/day' bodyguard line and the amoral-campaign and windfall passages). No code counterpart.
- **hiring/index.md#9** — Shadowrun Companion pp.99-100 (Setting the fee, the Baseline Shadowrun Payment Table and how to use it). The PDF is 'no-text' and the SR-OCR dump of it is too garbled to confirm individual figures (it does show the table's rows, the '200¥/day' bodyguard line and the amoral-campaign and windfall passages). No code counterpart.
- **hiring/index.md#10** — Shadowrun Companion pp.99-100 (Setting the fee, the Baseline Shadowrun Payment Table and how to use it). The PDF is 'no-text' and the SR-OCR dump of it is too garbled to confirm individual figures (it does show the table's rows, the '200¥/day' bodyguard line and the amoral-campaign and windfall passages). No code counterpart.
- **hiring/index.md#14** — Baseline Shadowrun Payment Table, Shadowrun Companion printed p.100 (PDF page 101 of the {FASA7905} scan) — image-only table, no text layer. Read from the page image: the Bodyguard/Security Duty row is 200¥/day, agreeing with this unit.
- **hiring/index.md#15** — Shadowrun Companion pp.99-100 (Setting the fee, the Baseline Shadowrun Payment Table and how to use it). The PDF is 'no-text' and the SR-OCR dump of it is too garbled to confirm individual figures (it does show the table's rows, the '200¥/day' bodyguard line and the amoral-campaign and windfall passages). No code counterpart.
- **hiring/index.md#16** — Baseline Shadowrun Payment Table, Shadowrun Companion printed p.100 (PDF page 101 of the {FASA7905} scan) — image-only table, no text layer. Read from the page image: the Courier Run row is 1,000¥, agreeing with this unit.
- **hiring/index.md#17** — Baseline Shadowrun Payment Table, Shadowrun Companion printed p.100 (PDF page 101 of the {FASA7905} scan) — image-only table, no text layer. Read from the page image: the Datasteal row is 20% value of data, agreeing with this unit.
- **hiring/index.md#18** — Shadowrun Companion pp.99-100 (Setting the fee, the Baseline Shadowrun Payment Table and how to use it). The PDF is 'no-text' and the SR-OCR dump of it is too garbled to confirm individual figures (it does show the table's rows, the '200¥/day' bodyguard line and the amoral-campaign and windfall passages). No code counterpart.
- **hiring/index.md#19** — Shadowrun Companion pp.99-100 (Setting the fee, the Baseline Shadowrun Payment Table and how to use it). The PDF is 'no-text' and the SR-OCR dump of it is too garbled to confirm individual figures (it does show the table's rows, the '200¥/day' bodyguard line and the amoral-campaign and windfall passages). No code counterpart.
- **hiring/index.md#20** — Shadowrun Companion pp.99-100 (Setting the fee, the Baseline Shadowrun Payment Table and how to use it). The PDF is 'no-text' and the SR-OCR dump of it is too garbled to confirm individual figures (it does show the table's rows, the '200¥/day' bodyguard line and the amoral-campaign and windfall passages). No code counterpart.
- **hiring/index.md#21** — Baseline Shadowrun Payment Table, Shadowrun Companion printed p.100 (PDF page 101 of the {FASA7905} scan) — image-only table, no text layer. Read from the page image: the Encryption/Decryption row is 200¥ per MP, agreeing with this unit.
- **hiring/index.md#22** — Shadowrun Companion pp.99-100 (Setting the fee, the Baseline Shadowrun Payment Table and how to use it). The PDF is 'no-text' and the SR-OCR dump of it is too garbled to confirm individual figures (it does show the table's rows, the '200¥/day' bodyguard line and the amoral-campaign and windfall passages). No code counterpart.
- **hiring/index.md#23** — Baseline Shadowrun Payment Table, Shadowrun Companion printed p.100 (PDF page 101 of the {FASA7905} scan) — image-only table, no text layer. Read from the page image: the Hacking row is 1,000¥ x Host's Security Value, agreeing with this unit.
- **hiring/index.md#24** — Baseline Shadowrun Payment Table, Shadowrun Companion printed p.100 (PDF page 101 of the {FASA7905} scan) — image-only table, no text layer. Read from the page image: the Investigation row is 200¥/day, agreeing with this unit.
- **hiring/index.md#25** — Baseline Shadowrun Payment Table, Shadowrun Companion printed p.100 (PDF page 101 of the {FASA7905} scan) — image-only table, no text layer. Read from the page image: the Smuggling Run row is 5,000¥, agreeing with this unit.
- **hiring/index.md#26** — Shadowrun Companion pp.99-100 (Setting the fee, the Baseline Shadowrun Payment Table and how to use it). The PDF is 'no-text' and the SR-OCR dump of it is too garbled to confirm individual figures (it does show the table's rows, the '200¥/day' bodyguard line and the amoral-campaign and windfall passages). No code counterpart.
- **hiring/index.md#27** — Shadowrun Companion pp.99-100 (Setting the fee, the Baseline Shadowrun Payment Table and how to use it). The PDF is 'no-text' and the SR-OCR dump of it is too garbled to confirm individual figures (it does show the table's rows, the '200¥/day' bodyguard line and the amoral-campaign and windfall passages). No code counterpart.
- **hiring/index.md#28** — Shadowrun Companion pp.99-100 (Setting the fee, the Baseline Shadowrun Payment Table and how to use it). The PDF is 'no-text' and the SR-OCR dump of it is too garbled to confirm individual figures (it does show the table's rows, the '200¥/day' bodyguard line and the amoral-campaign and windfall passages). No code counterpart.
- **hiring/index.md#29** — Shadowrun Companion pp.99-100 (Setting the fee, the Baseline Shadowrun Payment Table and how to use it). The PDF is 'no-text' and the SR-OCR dump of it is too garbled to confirm individual figures (it does show the table's rows, the '200¥/day' bodyguard line and the amoral-campaign and windfall passages). No code counterpart.
- **hiring/index.md#30** — Shadowrun Companion pp.99-100 (Setting the fee, the Baseline Shadowrun Payment Table and how to use it). The PDF is 'no-text' and the SR-OCR dump of it is too garbled to confirm individual figures (it does show the table's rows, the '200¥/day' bodyguard line and the amoral-campaign and windfall passages). No code counterpart.
- **hiring/index.md#31** — Shadowrun Companion pp.99-100 (Setting the fee, the Baseline Shadowrun Payment Table and how to use it). The PDF is 'no-text' and the SR-OCR dump of it is too garbled to confirm individual figures (it does show the table's rows, the '200¥/day' bodyguard line and the amoral-campaign and windfall passages). No code counterpart.
- **hiring/index.md#32** — Shadowrun Companion pp.99-100 (Setting the fee, the Baseline Shadowrun Payment Table and how to use it). The PDF is 'no-text' and the SR-OCR dump of it is too garbled to confirm individual figures (it does show the table's rows, the '200¥/day' bodyguard line and the amoral-campaign and windfall passages). No code counterpart.
- **hiring/index.md#33** — Game-master guidance about how Mr. Johnson pays (MJLBB printed pp.20-21); no code counterpart. Read against the book: a budget he won't exceed, an initial lowball, expenses covered if asked, up-front pay never above half and rarely above a third, and gear worth up to 25% over budget all appear in the text. Whether 'the more information and support Johnson provides, the less he'll pay' is stated as such was not confirmed.
- **hiring/index.md#34** — Game-master guidance about how Mr. Johnson pays (MJLBB printed pp.20-21); no code counterpart. Read against the book: a budget he won't exceed, an initial lowball, expenses covered if asked, up-front pay never above half and rarely above a third, and gear worth up to 25% over budget all appear in the text. Whether 'the more information and support Johnson provides, the less he'll pay' is stated as such was not confirmed.
- **hiring/index.md#35** — Game-master guidance about how Mr. Johnson pays (MJLBB printed pp.20-21); no code counterpart. Read against the book: a budget he won't exceed, an initial lowball, expenses covered if asked, up-front pay never above half and rarely above a third, and gear worth up to 25% over budget all appear in the text. Whether 'the more information and support Johnson provides, the less he'll pay' is stated as such was not confirmed.
- **hiring/index.md#36** — Game-master guidance about how Mr. Johnson pays (MJLBB printed pp.20-21); no code counterpart. Read against the book: a budget he won't exceed, an initial lowball, expenses covered if asked, up-front pay never above half and rarely above a third, and gear worth up to 25% over budget all appear in the text. Whether 'the more information and support Johnson provides, the less he'll pay' is stated as such was not confirmed.
- **hiring/index.md#37** — Game-master guidance about how Mr. Johnson pays (MJLBB printed pp.20-21); no code counterpart. Read against the book: a budget he won't exceed, an initial lowball, expenses covered if asked, up-front pay never above half and rarely above a third, and gear worth up to 25% over budget all appear in the text. Whether 'the more information and support Johnson provides, the less he'll pay' is stated as such was not confirmed.
- **hiring/index.md#38** — Game-master guidance about how Mr. Johnson pays (MJLBB printed pp.20-21); no code counterpart. Read against the book: a budget he won't exceed, an initial lowball, expenses covered if asked, up-front pay never above half and rarely above a third, and gear worth up to 25% over budget all appear in the text. Whether 'the more information and support Johnson provides, the less he'll pay' is stated as such was not confirmed.
- **hiring/index.md#48** — The guide's own inference from the Companion's rule (one month's lifestyle plus gear): 1,000¥ at Low, 10,000¥ at High. The arithmetic follows the lifestyle table; the rule it applies is in the Shadowrun Companion (no text layer).
- **hiring/index.md#53** — Renting an enchanting shop costs 100 nuyen a day plus materials (MitS printed p.40) — read in the text layer and it agrees, but the page footer number is missing so the ledger cannot record the printed page. Enchanting shops are not modelled.
- **hiring/index.md#63** — House-rule text (hazard pay percentages and worked-example arithmetic): the guide marks it as not from any SR3 book, so there is nothing in the PDFs to check it against. The arithmetic was checked and is consistent.
- **hiring/index.md#65** — Guide's own suggestion (fixers' 10-30% finder's fee, 'an equal share' for top freelancers); the books set no percentage. The Companion guidance that the fee is per runner is on SRComp p.99 (no text layer).
- **hiring/index.md#66** — Guide's own suggestion (fixers' 10-30% finder's fee, 'an equal share' for top freelancers); the books set no percentage. The Companion guidance that the fee is per runner is on SRComp p.99 (no text layer).
- **hiring/index.md#69** — Pairs each specialist with the 'nearest Companion baseline' — Shadowrun Companion p.100 figures (no text layer); the pairing itself is the guide's judgement.
- **hiring/index.md#70** — Pairs each specialist with the 'nearest Companion baseline' — Shadowrun Companion p.100 figures (no text layer); the pairing itself is the guide's judgement.
- **hiring/index.md#72** — Pairs each specialist with the 'nearest Companion baseline' — Shadowrun Companion p.100 figures (no text layer); the pairing itself is the guide's judgement.
- **hiring/index.md#74** — Pairs each specialist with the 'nearest Companion baseline' — Shadowrun Companion p.100 figures (no text layer); the pairing itself is the guide's judgement.
- **hiring/index.md#75** — Pairs each specialist with the 'nearest Companion baseline' — Shadowrun Companion p.100 figures (no text layer); the pairing itself is the guide's judgement.
- **hiring/index.md#76** — Pairs each specialist with the 'nearest Companion baseline' — Shadowrun Companion p.100 figures (no text layer); the pairing itself is the guide's judgement.
- **hiring/infiltrator.md#3** — Composite errata callout: 'Spurlock & Sprawl' (not a Shadowrun book; absent from the core text), Neural Silence gear (absent), muscle replacement (SR3 p.302, present), ruthenium polymers (M&M, present in the dermal sheath entry), and the Scenario C figure (12,000 × 4 × 1.5 = 72,000) all check; nothing here is modelled.
- **hiring/infiltrator.md#6** — Shadowrun Companion p.100 / p.101 baseline payment row. The PDF has no text layer and the SR-OCR text is too garbled to confirm the figure; the same figures are checked as a group on hiring/index.md. No code counterpart.
- **hiring/infiltrator.md#7** — Shadowrun Companion p.100 / p.101 baseline payment row. The PDF has no text layer and the SR-OCR text is too garbled to confirm the figure; the same figures are checked as a group on hiring/index.md. No code counterpart.
- **hiring/infiltrator.md#8** — Shadowrun Companion p.100 / p.101 baseline payment row. The PDF has no text layer and the SR-OCR text is too garbled to confirm the figure; the same figures are checked as a group on hiring/index.md. No code counterpart.
- **hiring/infiltrator.md#9** — Shadowrun Companion p.100 / p.101 baseline payment row. The PDF has no text layer and the SR-OCR text is too garbled to confirm the figure; the same figures are checked as a group on hiring/index.md. No code counterpart.
- **hiring/infiltrator.md#13** — Astral security background (printed p.237: bound patrolling spirits, wards and dual-natured watch animals); the guide agrees. No mechanical counterpart beyond the ward actor.
- **hiring/infiltrator.md#29** — House-rule text (hazard pay percentages and worked-example arithmetic): the guide marks it as not from any SR3 book, so there is nothing in the PDFs to check it against. The arithmetic was checked and is consistent.
- **hiring/infiltrator.md#36** — House-rule text (hazard pay percentages and worked-example arithmetic): the guide marks it as not from any SR3 book, so there is nothing in the PDFs to check it against. The arithmetic was checked and is consistent.
- **hiring/physical-adept.md#3** — Composite errata callout. Improved Reflexes (levels 1-3) not combining with technological or magical boosts (SR3 p.169) is implemented (SR3EActor.reflexBonus); initiative passes dropping 10 a pass (p.104) is implemented; Traceless Walk (MitS p.151), Melanin Control (SOTA64 p.67) and Wall Running (SOTA64 p.68) exist at the cited pages; 'Invisibility' and 'Silence' are spells, not adept powers, in the core rulebook. The Scenario C figure checks: 18,000 × 4 × 1.5 = 108,000.
- **hiring/physical-adept.md#6** — Baseline Shadowrun Payment Table, Shadowrun Companion printed p.100 (PDF page 101 of the {FASA7905} scan) — image-only table, no text layer. Read from the page image: the Bodyguard/Security Duty row is 200¥/day, agreeing with this unit.
- **hiring/physical-adept.md#7** — Shadowrun Companion p.100 / p.101 baseline payment row. The PDF has no text layer and the SR-OCR text is too garbled to confirm the figure; the same figures are checked as a group on hiring/index.md. No code counterpart.
- **hiring/physical-adept.md#8** — Shadowrun Companion p.100 / p.101 baseline payment row. The PDF has no text layer and the SR-OCR text is too garbled to confirm the figure; the same figures are checked as a group on hiring/index.md. No code counterpart.
- **hiring/physical-adept.md#14** — Astral Perception as an adept power (SR3 p.169): the power lets an adept perceive the astral, and the system has the astral-perception mode, but no mechanic hangs on the power item itself.
- **hiring/physical-adept.md#15** — Adept powers from other books (Traceless Walk and Missile Mastery, MitS printed pp.150-151; Wall Running, Melanin Control and Kinesics, SOTA64 pp.66-68). I confirmed each power exists at those pages; these powers are reference-only entries in the system (no mechanical channel).
- **hiring/physical-adept.md#16** — Adept powers from other books (Traceless Walk and Missile Mastery, MitS printed pp.150-151; Wall Running, Melanin Control and Kinesics, SOTA64 pp.66-68). I confirmed each power exists at those pages; these powers are reference-only entries in the system (no mechanical channel).
- **hiring/physical-adept.md#17** — Adept powers from other books (Traceless Walk and Missile Mastery, MitS printed pp.150-151; Wall Running, Melanin Control and Kinesics, SOTA64 pp.66-68). I confirmed each power exists at those pages; these powers are reference-only entries in the system (no mechanical channel).
- **hiring/physical-adept.md#18** — Weapon foci and Killing Hands working on the astral (SR3 pp.174-175): a weapon focus against astral opponents is on printed p.172 and 'An adept with astral perception can use the Killing Hands power to full effect on the astral plane' is on p.175 (image-only page, read via SR-OCR). The astral combat flow lets a focus wielder fight; 'spirit hunter' pay is table talk.
- **hiring/physical-adept.md#35** — House-rule text (hazard pay percentages and worked-example arithmetic): the guide marks it as not from any SR3 book, so there is nothing in the PDFs to check it against. The arithmetic was checked and is consistent.
- **hiring/physical-adept.md#40** — House-rule text (hazard pay percentages and worked-example arithmetic): the guide marks it as not from any SR3 book, so there is nothing in the PDFs to check it against. The arithmetic was checked and is consistent.
- **hiring/rigger.md#6** — Shadowrun Companion p.100 / p.101 baseline payment row. The PDF has no text layer and the SR-OCR text is too garbled to confirm the figure; the same figures are checked as a group on hiring/index.md. No code counterpart.
- **hiring/rigger.md#7** — Shadowrun Companion p.100 / p.101 baseline payment row. The PDF has no text layer and the SR-OCR text is too garbled to confirm the figure; the same figures are checked as a group on hiring/index.md. No code counterpart.
- **hiring/rigger.md#38** — House-rule text (hazard pay percentages and worked-example arithmetic): the guide marks it as not from any SR3 book, so there is nothing in the PDFs to check it against. The arithmetic was checked and is consistent.
- **hiring/shaman.md#6** — Baseline Shadowrun Payment Table, Shadowrun Companion printed p.100 (PDF page 101 of the {FASA7905} scan) — image-only table, no text layer. Read from the page image: the Investigation row is 200¥/day, agreeing with this unit.
- **hiring/shaman.md#7** — Baseline Shadowrun Payment Table, Shadowrun Companion printed p.100 (PDF page 101 of the {FASA7905} scan) — image-only table, no text layer. Read from the page image: the Security Duty row is 200¥/day, agreeing with this unit.
- **hiring/shaman.md#9** — Shamanic lodge materials cost (Rating × Rating) × 1,000¥ on the Magical Gear Table, MitS printed p.169 — I read the table in the text layer (Shamanic Lodge Materials: (Rating x Rating) x 1,000Y), but the page's footer number is not in the text so the ledger cannot record the printed page. Not modelled in the system.
- **hiring/shaman.md#12** — Totem modifiers (printed pp.163-165): the rule that a totem gives bonus dice for some spells and spirits and penalties for others is in the text, and Bear favours health spells and forest spirits on p.160 ('a shamanist of Bear can only cast health spells and summon forest spirits') and on the Bear entry; the system holds the totem list only as descriptive text and applies no modifiers.
- **hiring/shaman.md#36** — House-rule text (hazard pay percentages and worked-example arithmetic): the guide marks it as not from any SR3 book, so there is nothing in the PDFs to check it against. The arithmetic was checked and is consistent.
- **hiring/street-samurai.md#6** — Baseline Shadowrun Payment Table, Shadowrun Companion printed p.100 (PDF page 101 of the {FASA7905} scan) — image-only table, no text layer. Read from the page image: the Bodyguard/Security Duty row is 200¥/day, agreeing with this unit.
- **hiring/street-samurai.md#7** — Shadowrun Companion p.100 / p.101 baseline payment row. The PDF has no text layer and the SR-OCR text is too garbled to confirm the figure; the same figures are checked as a group on hiring/index.md. No code counterpart.
- **hiring/street-samurai.md#8** — Shadowrun Companion p.100 / p.101 baseline payment row. The PDF has no text layer and the SR-OCR text is too garbled to confirm the figure; the same figures are checked as a group on hiring/index.md. No code counterpart.
- **hiring/street-samurai.md#9** — Shadowrun Companion p.100 / p.101 baseline payment row. The PDF has no text layer and the SR-OCR text is too garbled to confirm the figure; the same figures are checked as a group on hiring/index.md. No code counterpart.
- **hiring/street-samurai.md#33** — House-rule text (hazard pay percentages and worked-example arithmetic): the guide marks it as not from any SR3 book, so there is nothing in the PDFs to check it against. The arithmetic was checked and is consistent.
- **hiring/street-samurai.md#39** — House-rule text (hazard pay percentages and worked-example arithmetic): the guide marks it as not from any SR3 book, so there is nothing in the PDFs to check it against. The arithmetic was checked and is consistent.
- **hiring/street-samurai.md#40** — House-rule text (hazard pay percentages and worked-example arithmetic): the guide marks it as not from any SR3 book, so there is nothing in the PDFs to check it against. The arithmetic was checked and is consistent.
- **index.md#3** — Statement about how the guide was produced (gists checked against the rulebooks, each rule carrying a citation) — method, not a game rule.
- **magic/awakened-primer.md#59** — The Astral Damage Codes Table is on printed p.175, an image-only page in the PDF (no text layer). Read through the SR-OCR text dump instead: Unarmed (Charisma)M, Armed (Charisma) + Weapon Focus damage, Spirit/Focus/Barrier (Force)M — the guide agrees, and the code deals unarmed `${cha}M` and armed `${cha + focus power}` (SR3EActor.js rollAstralCombat). Spirit/focus/barrier (Force)M damage was not traced in the code.
- **magic/awakened-primer.md#61** — Printed p.175 (astral damage: attacker's choice of Stun or Physical; wounds appear on the physical body; if the astral form dies the body dies) is an image-only page in the PDF. Read via the SR-OCR dump: the guide agrees. The code applies astral damage through the normal condition-monitor buttons, choosing the track from the attack's stun flag; nothing links the astral form's death to the body.
- **magic/awakened-primer.md#66** — World lore, no code counterpart. Checked against the book: the Ryumyo appeared near Mount Fuji on 24 December 2011 (printed p.25 and p.269); the guide agrees.
- **magic/awakened-primer.md#69** — World lore / law, no code counterpart. Checked against MitS printed p.11: spells, spirits and foci of Force 3 or higher are legally regulated in the UCAS and CAS, with permits available. The 'killing with magic is treated as premeditated' clause was not searched for.
- **magic/awakened-primer.md#71** — World lore (geography), no code counterpart. 'Meaning the Land of Promise ... Tir Tairngire takes up most of the former state of Oregon, along with portions of Washington and California' is on printed p.321 (pdf p.323); the name and founding in 2035 is on printed p.30 (pdf p.32).
- **magic/awakened-primer.md#72** — World lore, no code counterpart. Council of Princes, High Prince Lugh Surehand and the dragon Lofwyr's seat agree with printed p.30 and p.321; the Council being 'all-elven at first' is on p.30.
- **magic/awakened-primer.md#73** — An absence claim about the core rulebook: a search of the whole text layer finds no mention of immortal elves, so it agrees; nothing in code to check.
- **magic/awakened-primer.md#75** — World lore, no code counterpart. Corporate extraterritoriality is on printed p.22 (the Shiawase Decision) and agrees.
- **magic/awakened-primer.md#76** — World lore, no code counterpart. SINs (introduced by the UCAS in 2036; residents without one are 'probationary citizens' with few civil rights) are on printed p.238 and agree; 'harder to trace' is the guide's gloss.
- **magic/physical-adepts.md#64** — Book p.169: Improved Ability dice carry over equally to the skill's specializations. The dice are kept per skill name in derived.skillBonusDice; I did not trace a specialization roll path to confirm the dice reach it.
- **magic/spells.md#52** — Book p.180: a spell can have both a fetish and an exclusive modifier "but they must be separate in purpose" (and an unlimited version is learned as a separate spell). The code lets each limit be assigned to the drain or learning side independently (spell-limits.mjs side()); I could not tell what "separate in purpose" requires, so I cannot say whether the code honours it.
- **rules/combat.md#27** — A list of six unrelated actions (activate focus, call nature spirit, command a spirit, pick up/put down, use simple object). Each is a one-line Simple Action in the book (printed pp.105-107) and none is modelled beyond the generic 'Simple Action' mark; not itemised per action.
- **rules/combat.md#39** — Four Complex magic actions (banish, call elemental, control spirit, erase astral signature). Book lists them on printed p.107; none is charged or modelled individually (only the generic Complex mark exists).
- **rules/combat.md#149** — Matrix sourcebook p.18 (cold vs hot ASIST) — I read it in the text layer (PDF page 19, footer OCR reads "1s"), and a search of scripts/ finds no ASIST modelling, so the rule is not implemented; but the ledger cannot verify a printed page number from that OCR footer, so it cannot be recorded as not-implemented. The Matrix sourcebook is deliberately not a registered source book (CLAUDE.md).
- **rules/karma.md#64** — A claim about Magic in the Shadows (initiation, quickening, allies, magical groups cost Good Karma), outside the core-rulebook passages this page cites. Not read page-by-page here; the OCR of MitS does show Karma costs for initiation and magical-group membership. The code side is absent by the source's own note (TODO 219).
- **rules/vehicles.md#52** — Books differ; ruled. SR3 p.311 prints Cost 331,000¥; Rigger 3 Revised prints the DocWagon Osprey II at 935,000¥ (read by the maintainer, 2026-10-18; the OCR text garbles it as "93S.000¥", so it cannot be quoted as evidence here). The maintainer ruled the Rigger 3 figure: the pack's 935,000¥ stays.
- **rules/vehicles.md#60** — Books differ; ruled. The maintainer, 2026-10-18: use Rigger 3 Revised's numbers, which the pack already carries. SR3 p.306 says rigger adaptation costs 2,500¥; Rigger 3 Revised printed p.130 (PDF 132, read from the page image — the OCR is too garbled to quote) gives "Parts Cost: 2,800¥", the pack's figure. Nothing in scripts/ reads the item (a VCR rigger can rig any vehicle; see TODO 231).
- **rules/vehicles.md#74** — Books differ; ruled. The maintainer, 2026-10-18: use Rigger 3 Revised's numbers, which the pack already carries. SR3 p.312 prints Small Turret CF 7; Rigger 3 Revised printed p.141 (PDF 143, page image) prints Design Specifications CF 7 and Customization Specifications CF 8 — the pack's 8 is the customisation figure, for fitting a turret to an existing vehicle.
- **rules/vehicles.md#75** — Books differ; ruled. The maintainer, 2026-10-18: use Rigger 3 Revised's numbers, which the pack already carries. SR3 p.312 prints Mini-turret CF 6; Rigger 3 Revised printed p.141 (PDF 143, page image): Design Specifications CF 6, Customization Specifications CF 7 — the pack's 7.
- **rules/weapons.md#18** — The book never says which skill governs a machine pistol: SR3 p.86 gives Submachine Guns "lightweight semi-automatic and automatic guns fired from the shoulder or hip" and Pistols "all types of hand-held firearms", and p.278 lists the Ceska Black Scorpion under PISTOLS (Machine Pistols) while describing it as combining "light pistol concealability and submachine gun rates of fire". The code maps MaPist to Submachine Guns (SR3EItem.WEAPON_SKILL_MAP). Neither reading is the book's; the maintainer's call.
- **sources.md#4** — Table of abbreviations (SR3 is the core rulebook, etc.); labels, no rule.
- **sources.md#19** — Absence claim (no SR3 book prices specialists by skill rating) plus a Companion citation (SRComp p.100, no text layer).
- **sources.md#21** — Statements about the library used for checking (Corporate Download is not in it; some gear in the original gists is in no book) — no game rule; not checkable against the PDFs.
- **sources.md#22** — Statements about the library used for checking (Corporate Download is not in it; some gear in the original gists is in no book) — no game rule; not checkable against the PDFs.
- **sources.md#26** — Terminology-replacement table. Read against the books: SR3 has the Spell Pool (p.44) not a Magic Pool; ritual sorcery uses a material link (MitS printed p.37, not pp.34-36 — the 'Material Link' passage is on p.37); Legality Codes like 6P-E (p.273); security codes Blue/Green/Orange/Red with 'UV' slang (p.205); Drain written +1(M) (p.162); Improved Reflexes is an adept power (p.169) and Increase Reflexes a spell (p.194). All agree except the material-link page range.
- **sources.md#27** — Terminology-replacement table row (meta-documentation of the guide's own corrections, not a claim about the system's code). Checked against the book: MitS's ritual sorcery section names 'Material Link' as the term, printed p.37 (pdf p.38), agreeing with the guide's citation. No code implements ritual sorcery's targeting link, so there is nothing to compare it against.
- **sources.md#28** — Terminology-replacement table. Read against the books: SR3 has the Spell Pool (p.44) not a Magic Pool; ritual sorcery uses a material link (MitS printed p.37, not pp.34-36 — the 'Material Link' passage is on p.37); Legality Codes like 6P-E (p.273); security codes Blue/Green/Orange/Red with 'UV' slang (p.205); Drain written +1(M) (p.162); Improved Reflexes is an adept power (p.169) and Increase Reflexes a spell (p.194). All agree except the material-link page range.
- **sources.md#29** — Terminology-replacement table. Read against the books: SR3 has the Spell Pool (p.44) not a Magic Pool; ritual sorcery uses a material link (MitS printed p.37, not pp.34-36 — the 'Material Link' passage is on p.37); Legality Codes like 6P-E (p.273); security codes Blue/Green/Orange/Red with 'UV' slang (p.205); Drain written +1(M) (p.162); Improved Reflexes is an adept power (p.169) and Increase Reflexes a spell (p.194). All agree except the material-link page range.
- **sources.md#30** — Terminology-replacement table. Read against the books: SR3 has the Spell Pool (p.44) not a Magic Pool; ritual sorcery uses a material link (MitS printed p.37, not pp.34-36 — the 'Material Link' passage is on p.37); Legality Codes like 6P-E (p.273); security codes Blue/Green/Orange/Red with 'UV' slang (p.205); Drain written +1(M) (p.162); Improved Reflexes is an adept power (p.169) and Increase Reflexes a spell (p.194). All agree except the material-link page range.
- **sources.md#31** — Terminology-replacement table. Read against the books: SR3 has the Spell Pool (p.44) not a Magic Pool; ritual sorcery uses a material link (MitS printed p.37, not pp.34-36 — the 'Material Link' passage is on p.37); Legality Codes like 6P-E (p.273); security codes Blue/Green/Orange/Red with 'UV' slang (p.205); Drain written +1(M) (p.162); Improved Reflexes is an adept power (p.169) and Increase Reflexes a spell (p.194). All agree except the material-link page range.
- **street/cyberware-grades.md#39** — Interpretive note that 'used' is half the price of the same grade new. The item sheet's Used grade is half the BASE price at basic Essence; a used alpha or beta has to be set by hand (the Essence total does read the text 'Used Alpha' as alpha).
- **street/cyberware-grades.md#45** — Pointer to the surgery procedures (M&M p.135 onward), which the system does not model; no separate rule stated in this unit.
- **street/gear-and-fencing.md#25** — The Ares Predator's row in the Heavy Pistols table (9M, SA, 450¥, Availability 3/24 hrs, Street Index .5, Legality 6P-E) cannot be read row by row from the text layer — the table columns come out as separate lists. The shipped pack matches the guide (packs-src/sr3e-sr3-firearms/ares-predator: 9M, SA, 3/24hrs, 450, .5); the Legality Code is not stored on the item.
- **street/sins.md#6** — Section heading citing SR3 pp.238-239, over background text about SINs and credsticks with no mechanical counterpart in the system.
- **street/sins.md#7** — Background / lore about SINs and credsticks (printed pp.238-239); no code counterpart. Read against the book: the guide agrees (UCAS SINs from 2036, probationary citizens, birth registration, corporate SINs, personal-data formula, arrest and criminal SINs, what a SIN is needed for, character-creation choice, credsticks as ID and credit card).
- **street/sins.md#8** — Background / lore about SINs and credsticks (printed pp.238-239); no code counterpart. Read against the book: the guide agrees (UCAS SINs from 2036, probationary citizens, birth registration, corporate SINs, personal-data formula, arrest and criminal SINs, what a SIN is needed for, character-creation choice, credsticks as ID and credit card).
- **street/sins.md#9** — Background / lore about SINs and credsticks (printed pp.238-239); no code counterpart. Read against the book: the guide agrees (UCAS SINs from 2036, probationary citizens, birth registration, corporate SINs, personal-data formula, arrest and criminal SINs, what a SIN is needed for, character-creation choice, credsticks as ID and credit card).
- **street/sins.md#10** — Background / lore about SINs and credsticks (printed pp.238-239); no code counterpart. Read against the book: the guide agrees (UCAS SINs from 2036, probationary citizens, birth registration, corporate SINs, personal-data formula, arrest and criminal SINs, what a SIN is needed for, character-creation choice, credsticks as ID and credit card).
- **street/sins.md#11** — Section heading citing SR3 pp.238-239, over background text about SINs and credsticks with no mechanical counterpart in the system.
- **street/sins.md#12** — Background / lore about SINs and credsticks (printed pp.238-239); no code counterpart. Read against the book: the guide agrees (UCAS SINs from 2036, probationary citizens, birth registration, corporate SINs, personal-data formula, arrest and criminal SINs, what a SIN is needed for, character-creation choice, credsticks as ID and credit card).
- **street/sins.md#13** — Background text (printed p.273): legal purchases leave credit trails, inventory and possibly surveillance footage, and sellers hand records to the police. The guide agrees; no code counterpart.
- **street/sins.md#14** — Section heading citing SR3 pp.238-239, over background text about SINs and credsticks with no mechanical counterpart in the system.
- **street/sins.md#15** — Background / lore about SINs and credsticks (printed pp.238-239); no code counterpart. Read against the book: the guide agrees (UCAS SINs from 2036, probationary citizens, birth registration, corporate SINs, personal-data formula, arrest and criminal SINs, what a SIN is needed for, character-creation choice, credsticks as ID and credit card).
- **street/sins.md#16** — Background / lore about SINs and credsticks (printed pp.238-239); no code counterpart. Read against the book: the guide agrees (UCAS SINs from 2036, probationary citizens, birth registration, corporate SINs, personal-data formula, arrest and criminal SINs, what a SIN is needed for, character-creation choice, credsticks as ID and credit card).
- **street/sins.md#17** — Background / lore about SINs and credsticks (printed pp.238-239); no code counterpart. Read against the book: the guide agrees (UCAS SINs from 2036, probationary citizens, birth registration, corporate SINs, personal-data formula, arrest and criminal SINs, what a SIN is needed for, character-creation choice, credsticks as ID and credit card).
- **street/sins.md#18** — Background / lore about SINs and credsticks (printed pp.238-239); no code counterpart. Read against the book: the guide agrees (UCAS SINs from 2036, probationary citizens, birth registration, corporate SINs, personal-data formula, arrest and criminal SINs, what a SIN is needed for, character-creation choice, credsticks as ID and credit card).
- **street/sins.md#19** — Section heading citing SR3 pp.238-239, over background text about SINs and credsticks with no mechanical counterpart in the system.
- **street/sins.md#20** — Background / lore about SINs and credsticks (printed pp.238-239); no code counterpart. Read against the book: the guide agrees (UCAS SINs from 2036, probationary citizens, birth registration, corporate SINs, personal-data formula, arrest and criminal SINs, what a SIN is needed for, character-creation choice, credsticks as ID and credit card).
- **street/sins.md#46** — Legal background with no code counterpart. Checked against MitS printed p.11: Force 3 or higher magic is regulated in the UCAS and CAS with permits available, and a felony committed with magic is always premeditated. The guide agrees.
- **street/sins.md#48** — Legal background with no code counterpart. Checked against MitS printed p.11: reading astral signatures has the same status as fingerprinting or DNA testing in forensic science. The guide agrees.
- **world/index.md#4** — Setting fact, no code counterpart; checked against SR3 p.35 and NS p.104: agrees. The latest dated events are 2060 (SR3 p.35, the Corporate Court and Fuchi; NS p.104, a post of 28 September 2060); fixed 2026-10-18 from "2060-61", as neither book reaches 2061. The later events are in the GM-only journal (packs-src/sr3e-gm-sixth-world).
- **world/index.md#16** — Setting fact, no code counterpart; checked against SR3 p.22 (heading: "And So It Came to Pass ..." section on the Seretech and Shiawase decisions): agrees. The page opens its account of "two Supreme Court rulings, made in 1999 and 2001".
- **world/index.md#21** — Setting fact, no code counterpart; checked against SR3 p.8: agrees. Quotes "a law unto themselves", the nuyen as global monetary standard, and "When the megacorps want a job done but don't want to dirty their hands, they need a shadowrun".
- **world/index.md#25** — Setting fact, no code counterpart; checked against SR3 p.31 (Show Me the Money, 2032-2033): agrees. Quotes "The Corporate Court takes over Global Financial Services. It moves GFS to the Zurich-Orbital Habitat and renames it the Zurich-Orbital Gemeinschaft Bank"; the 2020 entry says GFS replaced the World Bank.
- **world/index.md#26** — Setting fact, no code counterpart; checked against SR3 p.31 (2048 entry): agrees. Operation Reciprocity, the Veracruz Settlement (Aztlan-citizen major shareholders of "foreign" subsidiaries) and the Panama Canal as a Pan-Corporate Zone under the Corporate Court all match.
- **world/index.md#27** — Setting fact, no code counterpart; checked against SR3 p.31 (Yamatetsu, Big Seven to Big Eight, 2041-42) and SR3 p.35 (Flight 1118, 2059; David Hague; Wuxing): agrees. The book dates Flight 1118 and the Hague seat to 2059, so this is not a later-event problem.
- **world/index.md#32** — Setting fact, no code counterpart; checked against MJLBB p.17 and p.18: agrees. p.17: "Corporate Johnsons are the most common by far", "his funding comes from secret accounts earmarked for black ops"; p.18: "the corp will deny all knowledge and simply replace him".
- **world/index.md#33** — Setting fact, no code counterpart; checked against SR3 pp.34-35: agrees. Fuchi and Renraku are the corp war of the moment; "Lanier's transfer in 2058 was just the beginning of trouble for Renraku and Fuchi".
- **world/index.md#38** — Setting fact, no code counterpart; checked against SR3 p.35: agrees. Big Eight "do their best to quash the smaller corps"; "with much resulting business for shadowrunners"; "Lucien Cross, CAT's chief exec, survived three assassination attempts in 2058 alone".
- **world/index.md#39** — Setting fact, no code counterpart; checked against NS p.95 (Shiawase infighting), NS p.88 (Telestrian family infighting), SR3 p.35 and NS p.96 (Yamatetsu traditionalists vs the new ork chairman): agrees.
- **world/index.md#40** — Setting fact, no code counterpart; checked against NS p.83 (United Corporate Council): agrees.
- **world/index.md#43** — Setting fact, deliberate for the campaign date. NS pp.92-93 says Mitsuhama "In the past" called on the Seattle yakuza, before their secession; New Seattle dates the secession only by its 2060 posts. The maintainer's GM-only journal (packs-src/sr3e-gm-sixth-world/the-sixth-world-after-october-2059-gm-only.*.json, "The yakuza break with Japan") places it after October 2059, the date these pages describe, so the guide's present tense is right for that date (checked 2026-10-18).
- **world/index.md#44** — Setting fact, no code counterpart; checked against NS p.102: agrees. "The sokaiya use traditional yakuza business methods such as stock buys paired with blackmail to exert influence on various corporations and so divert money to yakuza operations."
- **world/index.md#45** — Setting fact, no code counterpart; checked against NS p.96: agrees. Wuxing "the driving force behind the Pacific Prosperity Group"; PPG formed against Japanese dominance (NS p.81); a runner bets "Triad operations will be targeted at rival corporate interests in the metroplex, especially Mitsuhama" - the guide correctly says "runners claim".
- **world/index.md#47** — Setting fact, no code counterpart; checked against NS p.76: agrees. Power grid (Shiawase/Gaeatronics), databases (Renraku), telecomm (Pacific Rim Communications), grid-guide traffic (Mitsuhama) and policing (Lone Star) are all corporate contracts.
- **world/index.md#48** — Setting fact, no code counterpart; checked against NS p.84 (Gaeatronics "Owned and operated by the Salish-Shidhe Council") and NS pp.87-88 (Telestrian: "The Council of Princes owns 5 percent of the company", a runner's post): agrees.
- **world/index.md#49** — Setting fact, no code counterpart; checked against NS p.81 and p.90 (Aztechnology barred from California and Tir Tairngire; interests there "controlled by a complex maze of shells and holding companies. The strings ... get pulled from Seattle") and NS p.95 (Saeder-Krupp banned from Tir Tairngire and California; "corporate watchers" in Seattle): agrees. Nuance: the shells are described for Aztechnology; Saeder-Krupp is described as using watchers.
- **world/index.md#50** — Setting fact, no code counterpart; checked against SR3 p.30 (Have Yourself a Free City sidebar): agrees. New York "got rebuilt by the corps in exchange for certain concessions that left the tycoons effectively running the place"; Los Angeles: "various mouthpiece leaders have been dancing to corporate hymns".
- **world/index.md#52** — Setting fact, no code counterpart; checked against NS p.79 (Humanis quietly funds Alamos 20,000 and other terrorist groups), NS p.80 (ORC leaders "slide information and resources" to pro-Awakened terror groups - a runner's post) and NS pp.83-84 (Kenneth Brackhaven, nephew of Karl Brackhaven; contributed to at least six district mayors' campaigns): agrees. The book words the last as "contributed to the campaigns"; the guide says "paid for".
- **world/index.md#54** — Setting fact, no code counterpart; checked against SR3 p.31: agrees. "in 2037 made the startling announcement that he owned 63 percent of Saeder-Krupp stock ... name himself president and CEO".
- **world/index.md#55** — Setting fact, no code counterpart; checked against SR3 p.34: agrees. "The will was a master stroke of manipulation from beyond the grave"; Draco Foundation set up to administer all bequests; assassinated on the night of his inauguration.
- **world/index.md#56** — Setting fact, no code counterpart; checked against NS p.104: agrees. A runner's post: "the elaborate chess game Lung and Ryumyo seem to be playing along the Pacific Rim"; the guide correctly labels it rumor.
- **world/index.md#60** — Setting fact, no code counterpart; checked against MJLBB pp.17-18 (Types of Johnsons): agrees.
- **world/index.md#61** — Setting fact, deliberate for the campaign date. Fuchi, its factions and Novatech are dated 2059 (SR3 p.35); the Mafia succession is open in October 2059 because the GM-only journal (packs-src/sr3e-gm-sixth-world/the-sixth-world-after-october-2059-gm-only.*.json) places Bigio's appointment after it; Humanis vs the Empowerment Coalition is undated (NS pp.79-81). Agrees with the campaign date.
- **world/index.md#62** — Setting fact, no code counterpart; checked against NS p.93 (Mitsuhama "makes examples of runners who double-cross them") and NS p.91 (Cross Corp: "a Seraphim agent corners you in a dark alley ... you'll be doing them a little favor now and again"): agrees.
- **world/megacorporations.md#4** — Setting fact, no code counterpart; checked against NS pp.89-96 (the "Megacorporations" section runs Ares to Yamatetsu) and NS p.2 ("the world of 2060"): agrees. Security descriptions in those entries are Shadowland posts, as the note says. The Renraku lockdown (NS p.29-30) is dated December 2059, after the page date, and this page does not mention it.
- **world/megacorporations.md#6** — Setting fact, no code counterpart; checked against SR3 pp.31-35 ("Show Me the Money" and "Corporate Machinations"): agrees.
- **world/megacorporations.md#7** — Setting fact, no code counterpart; checked against SR3 p.31: agrees. Damien Knight's 2033 "Nanosecond Buyout" gave him "22 percent of Ares"; Knight and CEO Leonard Aurelius "loathed each other on sight".
- **world/megacorporations.md#8** — Setting fact, no code counterpart; checked against SR3 p.31: agrees. In May 2034 Matrix Systems of Boston's founders died; Villiers (already a 49-percent holder) "bought the company for pennies" and used the research data to buy his way into Fuchi. Nuance: the book calls it a "two-horse corp", not a failed one.
- **world/megacorporations.md#9** — Setting fact, no code counterpart; checked against SR3 p.31: agrees. "in 2037 made the startling announcement that he owned 63 percent of Saeder-Krupp stock (the backbone of the BMW corporate empire)" and renamed BMW the Saeder-Krupp Corporation.
- **world/megacorporations.md#10** — Setting fact, no code counterpart; checked against SR3 p.31: agrees. Yamatetsu did not break into the "Big Seven" until 2041 and "had carved out its niche by 2042, turning the Big Seven into the Big Eight".
- **world/megacorporations.md#11** — Setting fact, no code counterpart; checked against SR3 p.31 (2048 entry): agrees.
- **world/megacorporations.md#12** — Setting fact, no code counterpart; checked against SR3 pp.34-35: agrees. Lanier 2058, Fuchi's three factions, Villiers's Novatech, Yamatetsu's chairman dying in 2059 with shares to his ork son Yuri, the move to Vladivostok, and Wuxing taking the Court seat are all dated 2058-59 in the book.
- **world/megacorporations.md#16** — Setting fact, no code counterpart; checked against NS pp.89-90: agrees. Detroit HQ; "number-one gun supplier to Weapons World"; Knight Errant and trucking/air freight subsidiaries; "negotiated some lucrative sub-contracts with Federated-Boeing".
- **world/megacorporations.md#17** — Setting fact, no code counterpart; checked against NS p.90: agrees. President/CEO Juan Atzcapotzalco; Home Office Tenochtitlan; Seattle is the headquarters of the Northwestern Division; "an important beachhead for Aztechnology in North America".
- **world/megacorporations.md#18** — Setting fact, no code counterpart; checked against SR3 p.35 and NS p.94: agrees. The Fuchi (now Novatech) compound "consists of seven skyscrapers, each of a different height, around an eighth central building" (NS p.94); Fuchi's three factions are SR3 p.34-35. The seven-towers sentence is the NS page, not SR3 p.35.
- **world/megacorporations.md#19** — Setting fact, no code counterpart; checked against NS p.92 (Toshiro Mitsuhama, Kyoto, six black-and-silver skyscrapers on Lake Washington) and NS p.76 (the grid-guide contract): agrees since the 0.7.0 citation fix (68d39066).
- **world/megacorporations.md#20** — Setting fact, no code counterpart; checked against NS p.30 and NS p.94: agrees. NS p.30: the arcology can "provide for all the daily needs of its nearly 100,000 inhabitants"; NS p.94: President/CEO Inazo Aneki (the book adds "on indefinite leave; interim CEO Haruhiko Nakada", a 2060 detail the guide omits).
- **world/megacorporations.md#21** — Setting fact, no code counterpart; checked against NS pp.94-95: agrees. Rhine-Ruhr Megaplex, German Alliance; Seattle Division "None (officially)"; small factories owned by S-K subsidiaries; "corporate watchers chosen by Lofwyr".
- **world/megacorporations.md#22** — Setting fact, no code counterpart; checked against NS p.95: agrees. Tadashi Shiawase, Osaka; "Twin towers of steel and mirrored glass" in Tacoma; fusion plant "near glow city in Redmond"; "public-works contract with the metroplex government".
- **world/megacorporations.md#23** — BOOKS DIFFER on who "runs" Yamatetsu: NS p.96 lists "President/CEO: Saru Iwano" and calls Yuri the "new ork chairman"; SR3 p.35 says the chairman Tadamako Shibanokuji's shares reverted to his ork son Yuri and that Yamatetsu relocated to Vladivostok rather than depose him. The guide's "Run by: Yuri Shibanokuji" follows SR3 p.35; the NS CEO name is not given. Vladivostok HQ and "Hiring metahumans in Seattle" (NS p.96) agree.
- **world/megacorporations.md#26** — Setting fact, no code counterpart; checked against SR3 p.35 and NS p.96: agrees. President/CEO Wu Lung-Wei, Hong Kong Free Enterprise Enclave; Court seat after David Hague's death; "hiring aggressively in the metroplex".
- **world/megacorporations.md#27** — Setting fact, no code counterpart; checked against SR3 p.35 and NS pp.90-91: agrees. Lucien Cross, Montreal (Republic of Quebec); "interested in expanding into the UCAS market"; Cross Advanced Electronics, Cross Plaza, Everett.
- **world/megacorporations.md#28** — Setting fact, no code counterpart; checked against NS pp.91-92: agrees. Director Nadja Daviar; HQ Federal District of Columbia, UCAS; "taking up five floors of a building in the University District"; the office covers the Pacific Northwest "including Tir Tairngire".
- **world/megacorporations.md#29** — Setting fact, no code counterpart; checked against NS pp.89-90 (Ares Macrotechnology): agrees.
- **world/megacorporations.md#30** — Setting fact, no code counterpart; checked against NS p.91 (Aurelius sold his Ares stock and backed "Damien Knight's other worst enemy"; his son Nicholas runs Cross Advanced Electronics) and NS pp.77 and 89-90: agrees. Also read: Ares execs are ex-military, Knight Errant guards the Ares Building, Ares Arms uses KE to test prototypes (NS p.77), Ares is "something of an ally" of Federated-Boeing.
- **world/megacorporations.md#31** — Setting fact, no code counterpart; checked against NS p.81 and p.90 (Aztechnology): agrees.
- **world/megacorporations.md#32** — Setting fact, no code counterpart; checked against NS pp.81 and 90: agrees. Banned from California and Tir Tairngire with interests there run by "a complex maze of shells and holding companies"; "At least one battalion of Aztlan troops"; watcher spirits then guard elementals; blood-magic rumours; Matrix host linked to the Tenochtitlan PLTG; Aztlan/Seattle relations "cool but cordial".
- **world/megacorporations.md#33** — Setting fact, no code counterpart; checked against SR3 p.35 and NS pp.90-91 (Cross Applied Technologies): agrees.
- **world/megacorporations.md#34** — Setting fact, no code counterpart; checked against SR3 p.35 and NS pp.90-91: agrees. Three assassination attempts in 2058 alone (SR3 p.35); the Seraphim black-ops division; "Cross Corp prefers to take intruders alive"; trace-heavy ice and a later visit from a Seraphim agent; a fixer seen visiting the Draco Foundation (NS pp.91).
- **world/megacorporations.md#36** — Setting fact, no code counterpart; checked against SR3 p.34 and NS pp.83, 91-92: agrees. Dunkelzahn's will provided for the Draco Foundation, "with Daviar as chairman of the board"; Sassinian is "a Salish-area sasquatch"; the Council of Princes refused an office; "The Draco Foundation is a big-big-big employer of shadowrunners"; a Draco Foundation member of the UCC (Morgan Gallagher).
- **world/megacorporations.md#37** — Setting fact, no code counterpart; checked against SR3 pp.34-35 (Fuchi): agrees.
- **world/megacorporations.md#39** — Setting fact, no code counterpart; checked against NS pp.92-93 (Mitsuhama): agrees.
- **world/megacorporations.md#40** — Setting fact, deliberate for the campaign date. NS pp.92-93 says Mitsuhama "In the past" called on the Seattle yakuza, before their secession; New Seattle dates the secession only by its 2060 posts. The maintainer's GM-only journal (packs-src/sr3e-gm-sixth-world/the-sixth-world-after-october-2059-gm-only.*.json, "The yakuza break with Japan") places it after October 2059, the date these pages describe, so the guide's present tense is right for that date (checked 2026-10-18).
- **world/megacorporations.md#41** — Setting fact, no code counterpart; checked against SR3 pp.34-35 (Renraku): agrees.
- **world/megacorporations.md#42** — Setting fact, no code counterpart; checked against SR3 pp.34-35 and NS p.30: agrees. Lanier's 2058 seat and Renraku's advances "just months after Lanier joined the board" (SR3 p.34); mid-2059 charges dropped, Lanier sold his Renraku stock to the Zurich-Orbital Bank (SR3 p.35); the arcology holds "nearly 100,000 inhabitants" (NS p.30). The December 2059 lockdown is not mentioned, correctly for October 2059.
- **world/megacorporations.md#43** — Setting fact, no code counterpart; checked against SR3 p.31 and NS pp.94-95 (Saeder-Krupp): agrees.
- **world/megacorporations.md#45** — Setting fact, no code counterpart; checked against NS p.76 and pp.95-96 (Shiawase): agrees.
- **world/megacorporations.md#46** — Setting fact, no code counterpart; checked against SR3 p.22 and NS pp.76, 95-97: agrees. The Shiawase decision followed a botched attack on a Shiawase, Inc. nuclear plant (SR3 p.22); Shiawase Atomics maintains the grid and wants the generating contract (NS p.76); intelligence network "more often than not the corp knows about it"; net-guns and knockout gas; ice is "trace and maybe some deck-burning drek" (NS p.95-96).
- **world/megacorporations.md#47** — Setting fact, no code counterpart; checked against SR3 p.35 and NS p.81, p.96 (Wuxing): agrees.
- **world/megacorporations.md#48** — Setting fact, no code counterpart; checked against SR3 p.35 and NS pp.81, 96: agrees. A "mom-and-pop corp jumped up to the big time" by Dunkelzahn's cash; Hague's Court seat; PPG formed "to break the Japanese economic stranglehold on the Pac Rim"; not endeared to the Japanacorps; Federated-Boeing "also a member of the PPG"; a runner predicts Triad action on Wuxing's behalf.
- **world/megacorporations.md#49** — Setting fact, no code counterpart; checked against SR3 p.35 and NS p.96 (Yamatetsu): agrees.
- **world/megacorporations.md#50** — Setting fact, no code counterpart; checked against SR3 p.35 and NS p.96: agrees. Chairman Tadamako Shibanokuji died in 2059, shares reverted to his ork son Yuri, HQ moved to Vladivostok (SR3 p.35); "Yamatetsu has no friends among the Japanacorps" (NS p.96).
- **world/megacorporations.md#52** — Setting fact, no code counterpart; checked against NS pp.83-89 (Seattle's local corporations): agrees.
- **world/megacorporations.md#53** — Setting fact, no code counterpart; checked against NS p.83: agrees. "Seattle's local corps employ a higher percentage of the metroplex's population ... they have a home-field advantage in Seattle".
- **world/megacorporations.md#55** — Setting fact, no code counterpart; checked against NS p.84 and p.96: agrees. Federated-Boeing is "the largest employer in the metroplex"; "Both megacorps have tried to buy out FB at various points and failed"; Wuxing note: FB is "also a member of the PPG".
- **world/megacorporations.md#56** — Setting fact, no code counterpart; checked against NS pp.83-84: agrees. Brackhaven Investments is the umbrella company for Kenneth Brackhaven; contributions "covers the entire spectrum from Technocrat to One World partyites"; his uncle Karl Brackhaven is president of the Seattle Humanis chapter.
- **world/megacorporations.md#57** — Setting fact, no code counterpart; checked against NS pp.84-85: agrees. Owned and operated by the Salish-Shidhe Council; a runner says it is "covertly supporting eco-terrorist attacks on competing operations".
- **world/megacorporations.md#58** — Setting fact, no code counterpart; checked against NS p.87: agrees. "PRC runs the Seattle LTG".
- **world/megacorporations.md#59** — Setting fact, no code counterpart; checked against NS pp.87-88: agrees. "The largest and most aggressive conglomerate in Tir Tairngire"; "The Council of Princes owns 5 percent of the company" (a runner's post).
- **world/megacorporations.md#60** — Setting fact, no code counterpart; checked against NS p.85 and p.88: agrees. Universal Omnitech bought Ingersoll and Berkley in 2057; competition with Telestrian in biotech.
- **world/megacorporations.md#61** — Setting fact, no code counterpart; checked against NS p.88: agrees. Headquarters Dallas, Texas, CAS; "UniOil's chief of security was a dragon (yes, a dragon) named Haesslich" - a runner's post (FastJack).
- **world/megacorporations.md#62** — Setting fact, no code counterpart; checked against NS p.84 (Dassurn) and NS p.86 (Microdeck, "more runs in the works"): the guide now says only those two are known to hire runners, which agrees (0.7.0, 68d39066).
- **world/politics-and-security.md#6** — Setting fact, no code counterpart; checked against SR3 p.28 and NS p.76: agrees. SR3 p.28: "Lone Star took over law enforcement in the Seattle Metroplex in 2025, after the Seattle Police Department had the bad judgment to go on strike. The governor declared the strike illegal, fired them all and hired the cop corp"; NS p.76: "the law in Seattle has become a business like any other".
- **world/politics-and-security.md#8** — Setting fact, no code counterpart; checked against NS p.76 and p.78: agrees. Lone Star, HQ Austin, Texas, is "the official provider of policing to the Seattle metroplex"; p.78: "Lone Star has authority over all other security corps in the metroplex".
- **world/politics-and-security.md#9** — Setting fact, no code counterpart; checked against NS p.77: agrees. Knight Errant: Detroit, "The brainchild and pet project of Ares CEO Damien Knight", "Seattle's second-largest security provider", training academy in Renton, KE personnel "considered elite" against Lone Star's "beat cops".
- **world/politics-and-security.md#10** — Setting fact, no code counterpart; checked against NS p.78: agrees. "At least twenty different private security providers operate in Seattle ... Eagle Security, Hard Corps, Inc. and Wolverine Security"; the other corps "can only take action on a customer's site, and keep a perp from escaping until Lone Star shows up".
- **world/politics-and-security.md#11** — Setting fact, no code counterpart; checked against NS p.76: agrees. Knight Errant "would love to get hold of that big, juicy city contract"; Sioux-based Eagle Security "wouldn't mind getting it either", but "it's hard to imagine the government trusting a NAN-based corp".
- **world/politics-and-security.md#12** — Setting fact, no code counterpart; checked against NS p.76: agrees. "he recently re-established the Shadowriders, a covert black-ops division of Lone Star Seattle"; Marrs "has saps in place to take the fall if necessary".
- **world/politics-and-security.md#13** — Setting fact, no code counterpart; checked against NS p.77: agrees. The "Dips" (Department of Magical Investigation, DPI) investigate "all crimes involving magic", read crime scenes astrally, and "Lone Star controls the licensing and certification of magicians in Seattle".
- **world/politics-and-security.md#14** — Setting fact, no code counterpart; checked against NS p.78 (the military: the Metroplex Guard): agrees.
- **world/politics-and-security.md#15** — Setting fact, no code counterpart; checked against NS p.78: agrees. The Guard "has a lot of leeway in choosing who gets in ... resulted in a 'weeding out' of metahumans"; "It's an open secret that the Humanis Policlub recruits from the Metroplex Guard, and a few officers and senior NCOs also hold key positions in Humanis". The Joint Task Force Seattle material on the same page follows the Renraku lockdown (December 2059) and the guide correctly leaves it out.
- **world/politics-and-security.md#18** — Setting fact, no code counterpart; checked against NS p.79: agrees. "Policlubs fall into three broad camps: anti-Awakened/anti-metahuman, pro-metahuman, and generally pro-civil rights and liberties"; two types, "political/fraternal organizations and terrorist groups"; "A third type of group does exist, but in such a shadowy and unsubstantiated way that they are generally dismissed as rumors" (the Human Nation).
- **world/politics-and-security.md#20** — Setting fact, no code counterpart; checked against SR3 p.28 and NS pp.79-80: agrees. SR3 p.28: "the founding of the Humanis Policlub ... in 2023"; NS p.79: Leader Karl Brackhaven; "they quietly fund such associations as Alamos 20,000, the Hand of Five and other terrorist groups"; "Humanis draws in members and quietly diverts the most violent and virulent to Alamos 20K and their ilk"; treats metahumanity "as a disease rather than a natural state of being".
- **world/politics-and-security.md#21** — Setting fact, no code counterpart; checked against NS p.80: agrees. Leader Jasper Squashright; "grassroots metahuman-rights organization, mostly devoted to the cause of orks"; a runner says ORC "have a pretty decent war chest" and pays well; another says ORC bigwigs "slide information and resources" to pro-Awakened groups "like the Sons of Sauron and the Children of the Sixth World" - runners' posts, as the guide says.
- **world/politics-and-security.md#22** — Setting fact, no code counterpart; checked against NS p.80: agrees. Leader Libby Chalmers; the Timmons Memorial Fund from Dunkelzahn's will; the Coalition "has been helping groups like ORC and Mothers of Metahumans"; a runner says Chalmers "is more than willing to spend Coalition money on shadowrunners".
- **world/politics-and-security.md#23** — Setting fact, no code counterpart; checked against NS p.83-84: Kenneth Brackhaven, Karl's nephew, heads Brackhaven Investments (UCC seat Norman Jones) and contributed to the campaigns of at least six district mayors: agrees since the 0.7.0 wording fix (68d39066).
- **world/politics-and-security.md#24** — Setting fact, no code counterpart; checked against NS p.79: agrees. The Human Nation is named as the example of the rumoured third kind of group, and the sentence "Humanis operates as a front organization for anti-Awakened terrorist groups like Alamos 20,000, Human Nation, the Hand of Five and others" starts at the foot of p.79 and ends at the top of p.80. The guide's "NS p.80 then lists it" is accurate for the second half of that sentence.
- **world/politics-and-security.md#27** — Setting fact, no code counterpart; checked against NS p.80 and SR3 p.27: agrees. NS p.80: "In 2042, the UCAS granted Seattle the right to send its own representatives to any nations considered vital to its survival"; SR3 p.27: the Treaty of Denver provided "the maintenance of cities like Seattle as extraterritorial extensions of various governments".
- **world/politics-and-security.md#28** — Setting fact, no code counterpart; checked against NS p.81 (Foreign Relations: Aztlan, California Free State, Japanese Imperial State, Korea, Native American Nations, Tir Tairngire): agrees.
- **world/politics-and-security.md#29** — Setting fact, no code counterpart; checked against NS p.81: agrees. "Aztlan/Seattle relations are currently cool but cordial"; Seattle is Aztechnology's major West Coast market; Aztlan tested its clout by "trying to dock a warship in Everett".
- **world/politics-and-security.md#30** — Setting fact, no code counterpart; checked against NS p.81: agrees. Relations "are split"; the CFS "sees Seattle as a potential economic and military ally against the Tir"; a runner says California uses Seattle "as a staging ground for intel ops in Tir Tairngire".
- **world/politics-and-security.md#31** — Setting fact, no code counterpart; checked against NS p.81: agrees. The Pacific Prosperity Group "has reduced Japan's influence in Seattle".
- **world/politics-and-security.md#32** — Setting fact, no code counterpart; checked against NS p.81: agrees. Seattle's ties with Korea have grown; "Wuxing, Inc., the PPG's driving force, has already set up corporate offices in the metroplex".
- **world/politics-and-security.md#33** — Setting fact, no code counterpart; checked against NS p.81: agrees. UCAS troops in Seattle "awakened old hostilities"; "some in the NAN would like to take over Seattle".
- **world/politics-and-security.md#34** — Setting fact, no code counterpart; checked against NS p.81: agrees. "Relations between Land of Promise and Seattle ... have been strained since Dunkelzahn's assassination"; the Tir "needs its trade agreements with Seattle, which is its pipeline to the rest of the world, and also its pressure valve for Tir dissidents".
- **world/politics-and-security.md#35** — Setting fact, no code counterpart; checked against SR3 pp.27-30 (history of the nations): agrees.
- **world/politics-and-security.md#36** — Setting fact, no code counterpart; checked against SR3 pp.27-30: agrees. p.27: the Treaty of Denver "acknowledged the sovereignty of the NAN over most of western North America"; p.30: the CAS broke away "A year later" than 2033 (2034), Tir na nOg (Christmas Day 2034), Tir Tairngire (2035), the Council of Princes admitted the dragon Lofwyr; Greater San Francisco under "a council of Japanese megacorps".
- **world/underworld.md#4** — Setting fact, no code counterpart; checked against NS pp.97-106: agrees. The Mafia section is an intercepted report from consigliere "Uncle Al" Cavalieri to Rowena O'Malley (NS p.97-98); the Seoulpa section is "from Lone Star's secret files" (NS p.104). The latest dated post in the section is 28 September 2060.
- **world/underworld.md#7** — Setting fact, no code counterpart; checked against SR3 p.8, NS p.82, MJLBB p.18: agrees. SR3 p.8: "The Mafia, Yakuza and other crime syndicates have grown explosively as their networks provide anything that people will buy"; NS p.82: Seattle's "status as an island of UCAS law in the middle of NAN territory, so close to the route across the strait to Russia" makes it a smuggling hub; MJLBB p.18: a street Johnson's "funding and resources are probably far less than a corporate Johnson's" but the group can offer "protection, illegal services or extra bodies".
- **world/underworld.md#9** — Setting fact, no code counterpart; checked against SR3 p.35 and NS pp.97-101 (the Mafia-yakuza war): agrees.
- **world/underworld.md#11** — Setting fact, no code counterpart; checked against SR3 p.35 and NS p.97: agrees. SR3 p.35: "2030: Mafia-Yakuza war breaks out in Seattle when the leaders of both syndicates are assassinated. After many deaths, the worn-out organizations call a truce."; NS p.97: "The deaths of Don O'Malley and the yakuza oyabun ... finally brought about a cease-fire in 2031."
- **world/underworld.md#12** — Setting fact, no code counterpart; checked against SR3 p.35: agrees. "2032: The oyabun of the Yakuza in Chiba, Japan sends Korean bosses to Seattle to rebuild" the organizations.
- **world/underworld.md#13** — Setting fact, no code counterpart; checked against SR3 p.35 and NS pp.101, 104: agrees. SR3 p.35 dates the purge of the Korean bosses 2042; NS p.101 "In 2043, yakuza assassins purged Seattle of its Korean bosses"; NS p.104 has Kyu surviving "the yakuza purge of Koreans from their ranks in 2044" - the guide's disagreement note is accurate.
- **world/underworld.md#14** — Setting fact, no code counterpart; checked against SR3 p.35: agrees. "2044: Hanzo Shotozumi is appointed head of the Seattle Yakuza. His strong-arm tactics spark renewed hostilities between the Yaks and the Mafia. Don James O'Malley comes out of retirement". (NS p.101 puts Shotozumi's appointment right after the 2043 purge; the guide cites SR3.)
- **world/underworld.md#15** — Setting fact, no code counterpart; checked against SR3 p.35 and NS p.97: agrees. SR3 p.35: "2058: Don O'Malley is shot dead outside his Seattle home, spawning an all-out Mob war as Mafia, Yakuza, Triads and Rings go at each other's throats"; NS p.97: shot "on New Year's Day, 2058" by "an assassin working for the organization known as Chimera".
- **world/underworld.md#16** — Setting fact, no code counterpart; checked against NS p.101 and NS p.97: agrees. NS p.101: "After O'Malley was killed in 2058, the yakuza seized large segments of Seattle's criminal markets in the resulting confusion" (the book names 2058 only); NS p.97: "The Commissione put Don Leo 'the Lion' McCaskill of Milwaukee in charge of the situation". The same page then says the Commissione "appointed Maurice 'Butcher' Bigio" capo - undated; see underworld#19.
- **world/underworld.md#18** — Setting fact, no code counterpart; checked against NS pp.97-100 (the Mafia): agrees.
- **world/underworld.md#19** — Setting fact, deliberate for the campaign date. NS p.97 reports the Commissione appointing Bigio capo of Seattle, in posts dated September 2060 with no date for the appointment. The GM-only journal (packs-src/sr3e-gm-sixth-world/the-sixth-world-after-october-2059-gm-only.*.json, "The Mafia: Bigio becomes capo") places it after October 2059, so the guide's "who will be capo … is the question of the moment" is right for that date. The guide's cite for "arranged O'Malley's death" should include NS p.98.
- **world/underworld.md#24** — Setting fact, no code counterpart; checked against NS pp.97-100 and MJLBB pp.53-54: agrees. MJLBB p.54, the ambitious Mafia lieutenant: runners are "a resource for getting jobs done without the rest of the Family knowing about it". The "fight the yakuza first and each other second" summary is the guide's own reading of NS pp.97-100.
- **world/underworld.md#26** — Setting fact, no code counterpart; checked against NS pp.100-102 (the yakuza): agrees.
- **world/underworld.md#27** — Setting fact, no code counterpart; checked against NS p.101: agrees. The yakuza arrived with the Japanese corporations; Watada chose Shotozumi to "rebuild a traditional and loyal yakuza organization"; "The growth of the yakuza over the years made them the most powerful syndicate in the Pacific Northwest" - the book attributes this to their long growth and adds that they seized markets after O'Malley's death in 2058, so the guide's "Since O'Malley's death" compresses it. The guide does not mention that Shotozumi then split from the Watada-rengo (the Shotozumi-rengo), which the book also states.
- **world/underworld.md#32** — Setting fact, deliberate for the campaign date. NS pp.92-93 says Mitsuhama "In the past" called on the Seattle yakuza, before their secession; New Seattle dates the secession only by its 2060 posts. The maintainer's GM-only journal (packs-src/sr3e-gm-sixth-world/the-sixth-world-after-october-2059-gm-only.*.json, "The yakuza break with Japan") places it after October 2059, the date these pages describe, so the guide's present tense is right for that date (checked 2026-10-18).
- **world/underworld.md#34** — Setting fact, no code counterpart; checked against NS pp.102-104 (the Triads): agrees.
- **world/underworld.md#35** — Setting fact, no code counterpart; checked against NS p.102 and MJLBB p.54: agrees. NS p.102: Chinese syndicates "control Hong Kong and most of mainland China", "overshadowed by the yakuza and the Mafia in Seattle", PPG "opening trade to Hong Kong", "make most of their money in smuggling"; the Yellow Lotus recruits "metahumans barred from joining other criminal gangs"; MJLBB p.54: "the Triads are more enlightened than most other organized crime groups regarding the membership of women and metahumans".
- **world/underworld.md#41** — Setting fact, no code counterpart; checked against NS pp.104-106 (the Seoulpa Rings): agrees.
- **world/underworld.md#52** — Setting fact, no code counterpart; checked against NS p.103 and p.106: agrees. The Eighty-Eights "forged an alliance with the Tigers" (NS p.103); the Ancients, "an all-elf go-gang", control "smuggling from Salem and Portland into Seattle" (NS p.106); the gang write-ups begin on p.106 ("TOP GANGS").

## Matches (1379)

Each carries its quote and code location in the ledger; not repeated here.

