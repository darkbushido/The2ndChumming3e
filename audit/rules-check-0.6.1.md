# Rules check v0.6.1 — code vs `guides/`, PDFs as authority (TODO 121)

**Status: COMPLETE — all 1225 units of 23 guide pages resolved, and every quote and code location re-verified by `tools/rules-ledger.mjs check`.**

Generated from `audit/rules-ledger-0.6.1.json`. Regenerate; do not hand-edit. A complete record proves the ledger is
fully evidenced — it does not prove the evidence was read correctly. Every `diverges` and every `unverifiable`
below is the maintainer's to decide.

| Verdict | Units |
| :--- | ---: |
| match | 478 |
| diverges | 26 |
| guide-differs | 3 |
| not-implemented | 167 |
| unverifiable | 145 |
| no-rule-claim | 406 |
| unchecked | 0 |

## Code diverges from the book (26)

### hiring/street-samurai.md#12

Guide: | Smartlink | .5 | 2,500¥ |

> "smartlink (.5). Assigning all his cyberware to Essence slots" — Shadowrun 3e - Man and Machine Cyberware {FASA7126}.pdf, printed p.127

Code: `packs-src/sr3e-sr3-cyberware/smartlink.sr3e-cyberware-0846.json:10`

The guide (and Man & Machine's own Essence-slot example, which lists 'a smartlink (.5)') gives the smartlink .5 Essence; the shipped pack item has 0.25. The core Bodyware table's Essence column cannot be lined up with its rows in the text layer (the layout view puts '.2' beside the Smartlink row), so the printed value on p.302 should be read from the page image. The 2,500¥ cost matches.

### magic/spellcasting.md#31

Guide: - **Area spells**: the base radius is your **Magic in meters**, and it hits

> "Area spells affect all valid targets within the radius of effect, friend and foe alike (including the caster)" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.181
> "every die withheld from the Sorcery Test increases the radius by 1 meter" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.181

Code: `scripts/documents/SR3EItem.js:4655`, `scripts/documents/SR3EItem.js:4441`

Two differences. (1) The book: area spells 'affect all valid targets within the radius of effect, friend and foe alike (including the caster)'. The code auto-detects the targets in the radius but excludes the caster (SR3EItem.js `_actorsInRadius`: `a.id === caster.id → continue`). (2) The radius is a free number field defaulting to Magic; withholding Sorcery dice (2 per metre smaller, 1 per metre wider) is not tied to it — no dice are withheld or spent to change the radius.

### magic/spellcasting.md#60

Guide: - **Area spells:** roll once and compare the dice against **each** target's

> "Successes are counted separately for each target, and a separate Resistance Test is made for each target" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.182

Code: `scripts/documents/SR3EItem.js:4576`

The book rolls once and counts successes separately against each target's own target number, with a separate Resistance Test each. The code takes the target number from the PRIMARY (first) target only (`primaryTarget = targetActors[0]`, SR3EItem.js:4577) and applies the one success count to every target.

### magic/spellcasting.md#66

Guide: - **No modifiers apply** unless the spell says so. That includes the

> "No target modifiers apply to this test except where specifically noted" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.183
> "applied to all tests, including Drain Resistance Tests (but not normal Damage Resistance Tests)" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.178

Code: `scripts/documents/SR3EActor.js:9684`

The book (p.183): 'No target modifiers apply to this test except where specifically noted'. The code skips the WOUND modifier (skipWoundMod: true) but adds the +2-per-sustained-spell modifier to the resist test — the maintainer's ruling of 2026-09-14, reading p.178's 'all tests' over p.183. The guide says no modifiers apply. Flagged so the ruling and the guide can be made consistent.

### magic/spellcasting.md#84

Guide: | Manabolt / Manaball | Mana | Willpower | (Damage Level) / (Damage Level +1) | Physical |

> "Manabolt and Manaball channel destructive magical power into the target, doing physical damage" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.191
> "Drain: (Damage Level) Manaball" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.191

Code: `scripts/documents/SR3EItem.js:4590`, `packs-src/sr3e-sr3-spells/manaball.sr3e-spell-0004.json:13`

Drain codes match (packs). The DAMAGE TRACK does not: the book says Manabolt and Manaball 'channel destructive magical power into the target, doing physical damage' although they are mana spells. The code derives the track from the spell type — `isStun = spellType !== 'Physical'` (SR3EItem.js:4595) — so every mana spell, Manabolt and Manaball included, deals STUN in this system. The pack items carry an empty `damage` field, so nothing overrides it. Same for Death Touch (#86).

### magic/spellcasting.md#86

Guide: | Death Touch | Mana | Willpower | (Damage Level −1) | Physical, by touch |

> "(Damage Level -1) Death Touch requires the caster to touch the target" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.191

Code: `scripts/documents/SR3EItem.js:4590`, `packs-src/sr3e-sr3-spells/death-touch.sr3e-spell-0001.json:13`

Drain code matches (pack). The book says Death Touch 'does physical damage'; it is a mana spell, so the code (`isStun = spellType !== 'Physical'`) makes it Stun. See #84.

### magic/spellcasting.md#102

Guide: - If a modifier would push the Drain Level **above Deadly**, add **+2 Drain

> "add +2 to the Drain Power instead for each level above Deadly" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.191

Code: `scripts/documents/SR3EItem.js:4175`

The book: 'If a modifier would raise the Drain Level above Deadly, add +2 to the Drain Power instead for each level above Deadly.' `parseDrainFormula` clamps the level at Deadly (`Math.min(3, idx + mod)`) and adds nothing to the Power, so e.g. Fireball's +1(Damage Level +2) cast at Serious drains at Deadly with no extra +2 Power.

### magic/spellcasting.md#137

Guide: 5. **Effect.** 4 − 1 = **3 net successes**. Two of them stage Serious up to

> "For any spells that damage the target, stage up the Damage Level for every 2 net successes" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.183
> "Manabolt and Manaball channel destructive magical power into the target, doing physical damage" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.191

Code: `scripts/documents/SR3EItem.js:4590`

The arithmetic (4 − 1 = 3 net, two stage Serious to Deadly, the odd success is discarded) matches. The outcome does not: the example ends 'a Deadly Physical wound' because the book makes Manabolt physical, while the code deals Manabolt as Stun (see #84).

### rules/combat.md#50

Guide: 5. **Determine the outcome**: compare the attacker's successes with the

> "compare the successes rolled by the attacker and the target" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.113
> "The successes of the participants are usually compared, and the character with the higher net successes wins" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.114
> "His 2 net successes (2 more than Snot) are enough to increase the Damage Level by one" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.114

Code: `scripts/documents/SR3EActor.js:3233`, `scripts/documents/SR3EActor.js:4094`

The book compares NET successes: p.113 'compare the successes rolled by the attacker and the target' and its worked example stages once for Liam's 2 net successes. The code does not net them. It stages UP by the attacker's raw successes (SR3EItem.stageDamage(state.damageBase, successes), SR3EActor.js:3233) and then stages DOWN separately by the defender's soak + carried dodge successes (floor(total/2), SR3EActor.js:4098). floor(A/2) − floor(D/2) is not floor((A−D)/2): attacker 2 vs defender 1 should be base damage (net 1) but the code stages up one level; attacker 4 vs 1 should stage up once (net 3) but the code stages up twice. p.114 also has a paragraph describing each side staging on its own successes ('usually compared'), so the code follows one reading of the book; the worked example follows the other. The maintainer's call which governs.

### rules/combat.md#51

Guide:    - Attacker ahead: stage the Damage Level **up** one step (L → M → S → D)

> "The base damage increases by one Damage Level for every two successes the attacker rolls over the target's total" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.113

Code: `scripts/documents/SR3EActor.js:3233`

Same finding as #50: 'one step per 2 successes over the defender's total' is a net comparison; the code stages up by 2-per-level of the attacker's RAW successes before the defender's total is known.

### rules/combat.md#52

Guide:    - Defender ahead: stage it **down** one step per 2 successes over the

> "the target can stage down the weapon's base Damage Level by one for every two successes the target rolls over the attacker's total" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.113

Code: `scripts/documents/SR3EActor.js:4094`, `scripts/documents/SR3EActor.js:3599`

Same finding as #50: the defender stages down by floor(total/2) of ITS OWN successes, not by 2 per success over the attacker's.

### rules/combat.md#53

Guide:    - Tie: base damage.

> "If the attacker's successes equal the target's, the weapon does its base Damage Level" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.113

Code: `scripts/documents/SR3EItem.js:1038`, `scripts/documents/SR3EActor.js:4094`

A tie is base damage in the book. In the code a tie is base damage only while staging up does not hit the Deadly cap: attacker and defender both at 6 successes against a 9M attack stage up to 9D (surplus discarded) and then down three levels to Light instead of staying Moderate. Same root as #50.

### rules/combat.md#124

Guide: - **Physical past 10 boxes**: you can survive overflow up to your **Body**

> "Instant death occurs only if damage overflows the Physical column by more than the character's Body Rating" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.125
> "takes an additional box of damage every (Body Rating) in Combat Turns" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.126

Code: `scripts/sr3e.js:1988`, `scripts/sheets/SR3EActorSheet.js:607`

Two differences. (1) Death: the book says instant death occurs only if Physical overflows 'by MORE than the character's Body Rating' (a character can take 10 + Body and one more point kills), so overflow equal to Body is survivable. The code flags the character dead at overflow >= Body (sr3e.js:1988 `dead = physFull && overflow >= body`; the sheet's isDead is the same test). (2) The extra box every (Body) Combat Turns while in overflow is not applied by the system (SR3EHealing mentions it as a note only).

### rules/combat.md#152

Guide: - **Vehicle Control Rig**: each level gives +2 Reaction and **+1D6**

> "Each level adds +2 to the user's Reaction and +1D6 Initiative dice while rigging" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.301

Code: `scripts/documents/SR3EActor.js:10028`, `scripts/documents/SR3EActor.js:9910`

The book: each VCR level adds +2 to Reaction and +1D6 Initiative dice while rigging. The code gives +1 Reaction per level (base = Reaction base + vcrLevel) with 1 + vcrLevel dice — the dice are right, the Reaction is half what it should be. Both the rigger's own initiative and the jumped-in drone's initiative do this (SR3EActor.js, `vcrLevel` at the two 'VCR' branches).

### rules/combat.md#153

Guide: - **Control Pool** = Reaction as modified by the VCR. *(SR3 p.44)* It only

> "A rigger's Control Pool is equal to the character's Reaction, modified only by his or her vehicle control rig" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.44
> "the vehicle is adapted for rigger control" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.134

Code: `scripts/documents/SR3EItem.js:1744`, `scripts/documents/SR3EActor.js:2243`

The book: a rigger's Control Pool equals the character's Reaction, modified only by the VCR. The code treats Control Pool as the Vehicle Skill rating (comment at SR3EActor.js:2243, and the Driving Test uses the skill), and the gunnery flow sizes it as Reaction base + VCR level (SR3EItem.js:1744) — neither matches, and the second adds only +1 per level. The 'only works in a vehicle adapted for rigger control' condition is not modelled (no adaptation field).

### rules/combat.md#155

Guide: - **Gunnery**: mounted weapons use the Gunnery skill and the ordinary

> "The player rolls a number of dice equal to the character's Gunnery Skill plus half the vehicle's Sensor Rating (round down)" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.152
> "all standard ranged combat rules apply" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.151

Code: `scripts/documents/SR3EItem.js:1801`

First half matches (manual gunnery uses the Gunnery skill and the ordinary ranged rules, p.151). Sensor-enhanced gunnery does not: the book rolls Gunnery + half the Sensor Rating (round down) as DICE and uses the target's Signature as the TN. The code instead subtracts the Sensor Rating (or the VCR level when jacked in) from the target's Signature as a TN reduction (SR3EItem.js:1800-1802) and adds no Sensor dice.

### rules/combat.md#156

Guide: - **Shooting a vehicle**: halve the weapon's Power and drop its Damage Level

> "Weapons that do Light Damage cannot affect the vehicle unless the attacker uses special ammunition" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.149
> "The Power of the AV munitions is reduced by half the Armor Rating" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.149

Code: `scripts/documents/SR3EItem.js:1484`, `scripts/documents/SR3EItem.js:1483`

Three differences. (1) The book halves Power 'round down'; the code rounds UP (Math.ceil(power / 2), SR3EItem.js:1483 and 1772). (2) 'Weapons that do Light Damage cannot affect the vehicle' — the code's level table maps L to L, so Light damage still goes through. (3) Anti-vehicle munitions subtract only half the armour (rounded down) from the Power; the code only skips the halving/level drop for AV and does not halve the armour.

### rules/grenades.md#31

Guide: Each target resists with **Body** plus any Combat Pool dice, against TN =

> "If the attacker rolled more successes, the Damage Level of the blast increases one level for every two successes over the target's success total" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.119

Code: `scripts/documents/SR3EActor.js:3187`

The resistance test (Body + Combat Pool vs adjusted Power − Impact) matches. The staging does not follow the book's net comparison ('one level for every two successes over the target's success total'): the code stages UP by the thrower's raw successes first (SR3EActor.js:3187, stageDamage(..., successes)) and lets the soak card stage DOWN by the target's own successes, so floor(A/2) − floor(D/2) replaces floor((A−D)/2). Same root as combat.md #50; the code comment claims this 'gives exactly the book's net comparison', which holds only when both halve evenly.

### rules/healing.md#29

Guide: - **Physical** past 10 boxes: you can survive overflow up to your **Body**

> "Instant death occurs only if damage overflows the Physical column by more than the character's Body Rating" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.125

Code: `scripts/sr3e.js:1988`, `scripts/SR3EHealing.js:466`

The extra box every (Body) Combat Turns is shown on the healing card (SR3EHealing.js:466) but not applied. And, as combat.md #124 records, the code marks a character dead at overflow >= Body (sr3e.js:1988) whereas the book, and this guide line, kill only when overflow EXCEEDS Body ('Past Body in overflow, you're dead').

### rules/reloading.md#22

Guide: | | Complex Action | Load **(Quickness × 2)** rounds into a belt |

> "Insert (Quickness Insert (Quickness Use speed loader Insert belt. Insert (Quickness" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.280

Code: `scripts/data/ammo-stock.mjs:154`, `scripts/data/ammo-stock.mjs:15`

The book's last row is 'Insert (Quickness × 2) rounds into belt' (the trailing '× 2) rounds into belt' prints in the facing column, so the text layer splits it). The code loads a belt's loose rounds at the same rate as everything else — Quickness rounds per Complex Action (`each = Math.max(1, whole(quickness))` for any mechanism but a break action) — and its own table comment says 'insert (Quickness) rounds'. A belt therefore takes twice the actions the book gives.

### rules/reloading.md#34

Guide: The rules don't throw away the rounds left in a removed clip. **Spare clips**

> "They hold the maximum rounds available for the weapon, and are not interchangeable from weapon to weapon even within the same class" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.281

Code: `scripts/data/ammo-stock.mjs:21`, `scripts/data/ammo-stock.mjs:132`

Two differences. (1) 'The rules don't throw away the rounds left in a removed clip' is not in the book (the reloading passage says nothing about leftover rounds), and the code does the opposite by the maintainer's ruling (TODO 114): swapping in a pre-filled reload loses the rounds left in the old one (ammo-stock.mjs header, lines 20-21; `discarded` in reloadPlan). (2) The Spare Clips rule — 5¥ each, unloaded, holds the weapon's maximum, 'not interchangeable from weapon to weapon even within the same class' — is not modelled: reloads fit by loading mechanism, not by weapon (`AmmoStock.fits`).

### rules/reloading.md#43

Guide: - Loading rounds into a belt is a Complex Action per **(Quickness × 2)**

> "Insert (Quickness Insert (Quickness Use speed loader Insert belt. Insert (Quickness" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.280

Code: `scripts/data/ammo-stock.mjs:154`, `scripts/data/ammo-stock.mjs:15`

The book's last row is 'Insert (Quickness × 2) rounds into belt' (the trailing '× 2) rounds into belt' prints in the facing column, so the text layer splits it). The code loads a belt's loose rounds at the same rate as everything else — Quickness rounds per Complex Action (`each = Math.max(1, whole(quickness))` for any mechanism but a break action) — and its own table comment says 'insert (Quickness) rounds'. A belt therefore takes twice the actions the book gives.

### rules/reloading.md#58

Guide: **Ammo is shared by gun class**, using the categories on the Weapon Range

> "each kind of gun can trade ammo with another of its class" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.279
> "Shotguns, whether pistols or rifles, can share ammo" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.279

Code: `scripts/data/ammo-stock.mjs:134`

The book: each kind of gun trades ammunition only with its own class (all light pistols, all assault rifles…), with shotguns sharing across pistol and rifle. The code lets loose rounds fit ANY firearm — `AmmoStock.fits` matches only the loading mechanism, and its comment states 'Loose rounds fit every firearm' as a deliberate choice because every shipped box of rounds is marked (c). Nothing checks the gun class.

### street/cyberware-grades.md#4

Guide: {: .fixed }

> "Beta Delta Used -40% (x .6) 4 -50% (x .5) 8 By grade .5 +5/x 1.5 +9/x 3 Standard" — Shadowrun 3e - Man and Machine Cyberware {FASA7126}.pdf, printed p.45
> "used cyberware begins with 1D6" — Shadowrun 3e - Man and Machine Cyberware {FASA7126}.pdf, printed p.124

Code: `scripts/documents/SR3EActor.js:8777`, `scripts/data/stress.mjs:95`

Composite errata callout; the code differs in two of its claims. (1) 'Used deltaware can be installed as betaware' — `gradedEssenceCost` strips the word 'used' and reads a Used Delta as delta (×.5), not beta (×.6). (2) 'Used implants come with 1D3 permanent Stress Points' (M&M p.45) — the Stress code starts used cyberware with 1D6 ÷ 2 rounded down (stress.mjs `pointsFromDie`), following M&M p.124's own wording ('1D6 ÷ 2'), so the book itself is inconsistent between p.45 and p.124. Also: 'betaware isn't available to starting characters' is not enforced. The other claims (beta ×.6, used at half price, +5/×1.5 and +9/×3 availability, removal gives no Essence back) are implemented.

### street/cyberware-grades.md#26

Guide: - **Used deltaware can't be bought.** If you acquire some anyway, it's

> "Used deltaware cannot be purchased, but if you can otherwise acquire it, you can have it installed as if it were betaware" — Shadowrun 3e - Man and Machine Cyberware {FASA7126}.pdf, printed p.11

Code: `scripts/documents/SR3EActor.js:8777`

The book: 'Used deltaware cannot be purchased, but if you can otherwise acquire it, you can have it installed as if it were betaware.' The code strips 'used' from a grade and reads a Used Delta as delta (Essence ×.5), not as beta (×.6).

### street/cyberware-grades.md#29

Guide: - **Each used item comes with 1D3 permanent Stress Points.** They can never

> "Each used cyberware item comes with 1D3 permanent Stress Points" — Shadowrun 3e - Man and Machine Cyberware {FASA7126}.pdf, printed p.45
> "used cyberware begins with 1D6" — Shadowrun 3e - Man and Machine Cyberware {FASA7126}.pdf, printed p.124

Code: `scripts/data/stress.mjs:95`

M&M p.45 says each used implant comes with 1D3 permanent Stress Points; M&M p.124 says used cyberware begins with 1D6 ÷ 2 permanent Stress Points. The code follows p.124 and rounds down (1D6 ÷ 2 → 0, 1, 1, 2, 2, 3), so a roll of 1 gives none and the spread differs from a flat 1D3. The book contradicts itself; the guide states the p.45 form.


## The guide differs from the book (3)

### rules/combat.md#4

Guide: {: .fixed }

> "engage the security forces with some suppressive fire" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.156
> "perform the Locate Access Node operation" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.210

Composite errata callout. Most claims are checked in their own sections below. Two are qualified by the PDF: (a) 'suppressive fire does not exist in the core rules' — the phrase appears in the core rulebook's rigger example (printed p.156) as something a drone controller decides to do, though it is not a defined action or modifier; (b) 'there is no Access Node action' — the Matrix chapter lists a 'Locate Access Node' operation (printed p.210). The maintainer should confirm what the callout meant to rule out.

### rules/grenades.md#16

Guide: ## 2. Scatter  *(SR3 p.119)*

> "Because all grenades scatter to some degree" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.118

Citation only: the guide heads this section (SR3 p.119); the scatter procedure (direction, distance, reduction per success) is on printed p.118. The scatter DICE are in the Grenade Range Table on p.119. The rules stated match.

### rules/grenades.md#21

Guide: ## 3. When it goes off  *(SR3 p.119)*

> "All grenades go off in the next Combat Phase of the character making the grenade attack" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.118

Citation only: the timing rules are on printed p.118 (the guide says p.119). The rules stated match the book.


## Real rules the code does not implement (167)

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

### hiring/infiltrator.md#11

Guide: - **Weapon detection**: MAD scanners are rated **1–4** hand-held and **4–9**

> "it makes a Rating (Concealability) Success Test" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.237
> "typically has a rating of 1 to 4 for hand-held models and 4 to 9 for architectural versions" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.237

Searched: `/magnetic anomaly|MAD detector|weapon detection/` — no matches.

Rating 1-4 hand-held and 4-9 architectural MAD detectors, rolling the rating against the weapon's Concealability (printed p.237); the weapon-detection rules are not implemented.

### hiring/infiltrator.md#12

Guide: - **Cyberware scanners** are rated **3–9**, against TN **3**, or **6** for

> "Cyberware scanning systems generally are rated between 3 and 9" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.237
> "The target number for typical cyberware is 3, for alphaware it is 6" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.237

Searched: `/cyberware scan|scanner rating|cyberwareScan/` — no matches.

### hiring/rigger.md#3

Guide: {: .fixed }

> "SHOTGUNS Defiance T-250 Enfield AS-7" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.278
> "the controlling rigger must make a Damage Resistance Test against 6M Physical damage" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.145

Searched: `/rigger damage|riggerDamage|damage transfers to the rigger|transfer(s|red)? to the rigger/` — no matches.

Errata callout. The Defiance T-250 is listed among the shotguns (printed p.278) and 'Ares Duelist' / 'Fly-Spy' appear nowhere in the core text; both agree. The rigger-damage rule (6M at Serious, 6S when destroyed, resisted with Willpower, printed p.145) is not implemented. The Scenario C figure checks: 5,000 × 4 × 1.5 = 30,000.

### hiring/rigger.md#9

Guide: - **Their body.** A jumped-in rigger resists **6M** Physical when the vehicle

> "the controlling rigger must make a Damage Resistance Test against 6M Physical damage" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.145
> "Neither Combat nor Control Pool dice can be used for this test" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.145

Searched: `/rigger damage|riggerDamage|damage transfers to the rigger|transfer(s|red)? to the rigger/` — no matches.

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

Only weapon foci are modelled (an isFocus / focusActive flag on melee items, used by astral combat). Spell, spirit, power and sustaining foci, and bonding with Karma, are not.

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

### magic/spellcasting.md#43

Guide: | An object | The **Object Resistance Table**, below |

> "The Force of the spell must be equal to or greater than half the Object Resistance, rounded down, for it to affect an object" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.182
> "Consult the Object Resistance Table for examples of objects and materials" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.182

Searched: `/low-?tech|highly processed|Object Resistance Table|objectResistance/` — no matches.

Spells can only be aimed at actors (never an object), so the Object Resistance Table — and the rule that Force must be at least half the Object Resistance, with vehicles adding Body and half armour — has nowhere to apply.

### magic/spellcasting.md#45

Guide: #### Object Resistance Table  *(SR3 p.182)*

> "The Force of the spell must be equal to or greater than half the Object Resistance, rounded down, for it to affect an object" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.182
> "Consult the Object Resistance Table for examples of objects and materials" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.182

Searched: `/low-?tech|highly processed|Object Resistance Table|objectResistance/` — no matches.

Spells can only be aimed at actors (never an object), so the Object Resistance Table — and the rule that Force must be at least half the Object Resistance, with vehicles adding Body and half armour — has nowhere to apply.

### magic/spellcasting.md#47

Guide: | Natural objects: trees, soil, unprocessed water | 3 |

> "The Force of the spell must be equal to or greater than half the Object Resistance, rounded down, for it to affect an object" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.182
> "Consult the Object Resistance Table for examples of objects and materials" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.182

Searched: `/low-?tech|highly processed|Object Resistance Table|objectResistance/` — no matches.

Spells can only be aimed at actors (never an object), so the Object Resistance Table — and the rule that Force must be at least half the Object Resistance, with vehicles adding Body and half armour — has nowhere to apply.

### magic/spellcasting.md#48

Guide: | Low-tech manufactured: brick, leather, simple plastics | 5 |

> "The Force of the spell must be equal to or greater than half the Object Resistance, rounded down, for it to affect an object" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.182
> "Consult the Object Resistance Table for examples of objects and materials" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.182

Searched: `/low-?tech|highly processed|Object Resistance Table|objectResistance/` — no matches.

Spells can only be aimed at actors (never an object), so the Object Resistance Table — and the rule that Force must be at least half the Object Resistance, with vehicles adding Body and half armour — has nowhere to apply.

### magic/spellcasting.md#49

Guide: | High-tech manufactured: advanced plastics, alloys, electronics | 8 |

> "The Force of the spell must be equal to or greater than half the Object Resistance, rounded down, for it to affect an object" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.182
> "Consult the Object Resistance Table for examples of objects and materials" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.182

Searched: `/low-?tech|highly processed|Object Resistance Table|objectResistance/` — no matches.

Spells can only be aimed at actors (never an object), so the Object Resistance Table — and the rule that Force must be at least half the Object Resistance, with vehicles adding Body and half armour — has nowhere to apply.

### magic/spellcasting.md#50

Guide: | Highly processed: computers, complex toxic waste | 10+ |

> "The Force of the spell must be equal to or greater than half the Object Resistance, rounded down, for it to affect an object" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.182
> "Consult the Object Resistance Table for examples of objects and materials" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.182

Searched: `/low-?tech|highly processed|Object Resistance Table|objectResistance/` — no matches.

Spells can only be aimed at actors (never an object), so the Object Resistance Table — and the rule that Force must be at least half the Object Resistance, with vehicles adding Body and half armour — has nowhere to apply.

### magic/spellcasting.md#51

Guide: To affect an object at all, the spell's **Force must be at least half its

> "The Force of the spell must be equal to or greater than half the Object Resistance, rounded down, for it to affect an object" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.182
> "Consult the Object Resistance Table for examples of objects and materials" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.182

Searched: `/low-?tech|highly processed|Object Resistance Table|objectResistance/` — no matches.

Spells can only be aimed at actors (never an object), so the Object Resistance Table — and the rule that Force must be at least half the Object Resistance, with vehicles adding Body and half armour — has nowhere to apply.

### magic/spellcasting.md#53

Guide: - **Cover and visibility**, as for Perception.

> "the target number of the spell increases" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.182

Searched: `/cover.*visibility.*spell|spell.*(cover|visibility) modif/` — no matches.

### magic/spellcasting.md#56

Guide: - **An astral barrier** you're casting across, such as a ward, hermetic

> "An astral barrier--such as a hermetic circle, shamanic lodge or ward--adds its Force to the target number of any spells cast across its boundaries" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.183

Searched: `/barrier[^\n]*(adds?|\+) ?(its )?Force|cast across|across its boundar/` — no matches.

### magic/spellcasting.md#61

Guide: - **Detection spells:** the GM rolls in secret. On all 1s, the GM gives you

> "On a roll of all ones, the gamemaster lies, giving the caster or target misleading or false information" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.182

Searched: `/gamemaster lies|false information/` — no matches.

### magic/spellcasting.md#65

Guide: - Any **living** target that isn't **willing** makes a **Spell Resistance

> "Living targets may always make a Spell Resistance Test against spells, unless the target of the spell is willing" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.183

Searched: `/willing/` — no matches.

A resistance test is offered to every live target; the exception for a willing target ('unless the target of the spell is willing') is not modelled.

### magic/spellcasting.md#70

Guide: - They can protect up to **their Sorcery rating** in subjects, all within

> "within a distance equal to the caster's Magic Attribute x 100 meters, can be protected" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.183
> "A character can protect a maximum number of subjects equal to their Sorcery Skill Rating" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.183

Searched: `/protected subjects?|protectedIds|subjects? protected|Magic Attribute x 100/` — no matches.

A mage's Spell Defense pool is one total for the Combat Turn. Who is protected, the Sorcery-rating limit on subjects, the Magic × 100 m range and the same-plane condition are not recorded; every defender with a pool is offered a Counterspelling roll against any spell.

### magic/spellcasting.md#78

Guide: - **No resistance roll** (an object, or a willing subject): all the caster's

> "When casting spells against non-resisting targets (which are generally non-living targets) one success always insures some degree of effect" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.183

Searched: `/willing|non-resisting|nonResisting/` — no matches.

### magic/spellcasting.md#94

Guide: Glass and walls **do** block elemental spells, which have to break through

> "it is impeded by physical obstructions like glass and other barriers" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.182
> "Targets hidden behind a wall within the radius of a Fireball spell will still get cooked" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.182

Searched: `/impeded by|firing through barriers|glass[^\n]*(block|stop)/` — no matches.

Elemental spells are not blocked by glass or walls in the code: nothing checks obstructions. (Everyone the area picks up is a target, which happens to match the 'hidden targets still get hit' half.)

### magic/spellcasting.md#107

Guide: | Each extra spell cast in the same action | +2 *(p.181)* |

> "The caster receives a +2 target number modifier for each extra spell to the Drain Resistance Test for all of the spells" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.181

Searched: `/extra spell|extraSpells|splitSorcery|multiple spells|several spells/` — no matches.

### magic/spellcasting.md#115

Guide: - A **limited spell** (fetish −1, exclusive −2) can lower the Force *for

> "A limit may either reduce the Force of a spell for purposes of Drain" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.180

Searched: `/fetishLimit|exclusiveLimit|limitedSpell|limited spell|drainForce/` — no matches.

### magic/spellcasting.md#122

Guide: | **Permanent (P)** | Must be sustained for a base time, then becomes permanent. Sorcery successes can be spent dividing that time instead of on the effect. |

> "Divide the base time by the number of successes allocated to determine how long the spell has to be sustained" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.178

Searched: `/permanentBase|Permanent Spell Base Time|divide the base time/` — no matches.

The Permanent Spell Base Time table exists only inside the healing flow (SR3EHealing.js:72); a permanent spell cast through the Sorcery flow gets no base time, and successes cannot be allocated to divide it.

### magic/spellcasting.md#128

Guide: - An **Exclusive Action** means dropping every sustained spell first.

> "a character must drop any sustained spells" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.178

Searched: `/exclusive action|Exclusive Action/` — no matches.

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

Searched: `/low-?tech|highly processed|Object Resistance Table|objectResistance/` — no matches.

Implemented from this unit: the Sorcery Test against the target's Willpower (mana) or Body (physical), and the all-ones glitch adding +2 to the Drain TN (SR3EActor.js:9730). Not implemented: (1) the Object Resistance Table — there is no way to target an object and no object target numbers (natural 3, low-tech 5, high-tech 8, processed 10+); (2) the cap 'no more Spell Pool dice than Sorcery dice allocated' — the prompt offers everything available (SR3EItem.js:4548-4568, `_promptMagicPool(actor, availMagic)`).

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

### rules/combat.md#157

Guide: - **Vehicle Damage Resistance**: vehicle Body plus Control Pool dice up to

> "plus any available Control Pool dice up to the character's Driving Skill Rating" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.149
> "Riggers may attempt to dodge any ranged combat attack using Control Pool instead of Combat Pool dice" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.149

Searched: `/riggers? (may|can) dodge|controlPool[^\n]*(dodge|soak)|(dodge|soak)[^\n]*controlPool/` — no matches.

A vehicle target rolls no Control Pool dice on its Damage Resistance Test (the soak card's pool is forced to 0 for vehicles, SR3EActor.js:8300) and vehicles never dodge, so a rigger's Control Pool dodge against Handling does not exist.

### rules/combat.md#159

Guide: - **Rigger damage**: if the vehicle takes Serious damage, the jacked-in

> "the controlling rigger must make a Damage Resistance Test against 6M Physical damage" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.145
> "Neither Combat nor Control Pool dice can be used for this test" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.145

Searched: `/rigger damage|riggerDamage|damage transfers to the rigger|transfer(s|red)? to the rigger/` — no matches.

### rules/grenades.md#15

Guide: Launcher minigrenades don't arm until they've traveled about **5 meters**.

> "do not actually arm until they have traveled about that distance" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.118
> "Electronics B/R (6) Test and a base time of five minutes" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.118

Searched: `/minigrenade|do not arm|arming distance|disarm.*safety/` — no matches.

Only the launcher's fixed range bands exist; the 5 m arming distance and the Electronics B/R (6) Test to disable the safety are not modelled.

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

### rules/reloading.md#47

Guide: - A character below a crossbow's **Strength Minimum** needs **one extra Ready

> "he must spend one additional Ready Weapon action reloading the crossbow for each point of Strength he is below the minimum" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.118

Searched: `/crossbow[^\n]*(additional|extra) Ready|Strength Minimum[^\n]*Ready Weapon/` — no matches.

### rules/reloading.md#70

Guide: Ammunition is Concealability 8 (assault-cannon rounds and taser darts 3), and

> "*-1 Concealability per extra 10 rounds of ammo" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.281
> "**Belted ammo: add rounds/100 to Availability" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.281

Searched: `/extra 10 rounds|rounds ?/ ?100|per extra 10/` — no matches.

The base Concealability (8; 3 for assault-cannon rounds and taser darts) is stored on each pack item. The '−1 Concealability per extra 10 rounds' and the 'add rounds/100 to Availability for belted ammo' adjustments are not computed anywhere.

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


## Could not be verified (145)

- **hiring/combat-mage.md#6** — Shadowrun Companion p.100 / p.101 baseline payment row. The PDF has no text layer and the SR-OCR text is too garbled to confirm the figure; the same figures are checked as a group on hiring/index.md. No code counterpart.
- **hiring/combat-mage.md#7** — Shadowrun Companion p.100 / p.101 baseline payment row. The PDF has no text layer and the SR-OCR text is too garbled to confirm the figure; the same figures are checked as a group on hiring/index.md. No code counterpart.
- **hiring/combat-mage.md#8** — Shadowrun Companion p.100 / p.101 baseline payment row. The PDF has no text layer and the SR-OCR text is too garbled to confirm the figure; the same figures are checked as a group on hiring/index.md. No code counterpart.
- **hiring/combat-mage.md#14** — Astral damage appearing on the physical body and disruption forcing a Magic Loss check are on printed p.175, an image-only page (no text layer). Read via the SR-OCR dump: 'The physical body manifests any damage inflicted on the astral form' and 'A character who is disrupted in astral combat must immediately check for Magic Loss (p. 160)' — the guide agrees. The Magic Loss check for disruption is not implemented.
- **hiring/combat-mage.md#15** — Legal background with no code counterpart. Checked against MitS printed p.11: Force 3+ magic is regulated in the UCAS and CAS, and a felony committed with magic is treated as premeditated; the guide agrees.
- **hiring/combat-mage.md#38** — House-rule text (hazard pay percentages and worked-example arithmetic): the guide marks it as not from any SR3 book, so there is nothing in the PDFs to check it against. The arithmetic was checked and is consistent.
- **hiring/decker.md#6** — Shadowrun Companion p.100 / p.101 baseline payment row. The PDF has no text layer and the SR-OCR text is too garbled to confirm the figure; the same figures are checked as a group on hiring/index.md. No code counterpart.
- **hiring/decker.md#7** — Shadowrun Companion p.100 / p.101 baseline payment row. The PDF has no text layer and the SR-OCR text is too garbled to confirm the figure; the same figures are checked as a group on hiring/index.md. No code counterpart.
- **hiring/decker.md#8** — Shadowrun Companion p.100 / p.101 baseline payment row. The PDF has no text layer and the SR-OCR text is too garbled to confirm the figure; the same figures are checked as a group on hiring/index.md. No code counterpart.
- **hiring/decker.md#12** — 'Decks are expensive (SR3 p.304)': the deck price table is on the cyberdeck pages; the row-by-row figures are in the next units.
- **hiring/decker.md#14** — Stock cyberdeck prices (Allegiance Sigma 70,000¥, Sony CTY-360-D 125,000¥, Novatech Hyperdeck-6 250,000¥, Renraku Kraftwerk-8 600,000¥, Novatech Slimcase-10 1,500,000¥ — SR3 p.304). The deck table columns cannot be read row by row from the text layer; the shipped Orthodox cyberdeck pack was not compared to the guide's figures in this pass.
- **hiring/decker.md#15** — Stock cyberdeck prices (Allegiance Sigma 70,000¥, Sony CTY-360-D 125,000¥, Novatech Hyperdeck-6 250,000¥, Renraku Kraftwerk-8 600,000¥, Novatech Slimcase-10 1,500,000¥ — SR3 p.304). The deck table columns cannot be read row by row from the text layer; the shipped Orthodox cyberdeck pack was not compared to the guide's figures in this pass.
- **hiring/decker.md#16** — Stock cyberdeck prices (Allegiance Sigma 70,000¥, Sony CTY-360-D 125,000¥, Novatech Hyperdeck-6 250,000¥, Renraku Kraftwerk-8 600,000¥, Novatech Slimcase-10 1,500,000¥ — SR3 p.304). The deck table columns cannot be read row by row from the text layer; the shipped Orthodox cyberdeck pack was not compared to the guide's figures in this pass.
- **hiring/decker.md#17** — Stock cyberdeck prices (Allegiance Sigma 70,000¥, Sony CTY-360-D 125,000¥, Novatech Hyperdeck-6 250,000¥, Renraku Kraftwerk-8 600,000¥, Novatech Slimcase-10 1,500,000¥ — SR3 p.304). The deck table columns cannot be read row by row from the text layer; the shipped Orthodox cyberdeck pack was not compared to the guide's figures in this pass.
- **hiring/decker.md#18** — Stock cyberdeck prices (Allegiance Sigma 70,000¥, Sony CTY-360-D 125,000¥, Novatech Hyperdeck-6 250,000¥, Renraku Kraftwerk-8 600,000¥, Novatech Slimcase-10 1,500,000¥ — SR3 p.304). The deck table columns cannot be read row by row from the text layer; the shipped Orthodox cyberdeck pack was not compared to the guide's figures in this pass.
- **hiring/decker.md#35** — House-rule text (hazard pay percentages and worked-example arithmetic): the guide marks it as not from any SR3 book, so there is nothing in the PDFs to check it against. The arithmetic was checked and is consistent.
- **hiring/decker.md#42** — House-rule text (hazard pay percentages and worked-example arithmetic): the guide marks it as not from any SR3 book, so there is nothing in the PDFs to check it against. The arithmetic was checked and is consistent.
- **hiring/face.md#3** — Composite errata callout. Commanding Voice (SOTA64 p.64-65) and Kinesics (p.66) exist and 'Authoritative Voice' is absent from the core text; a Rating 4 fake ID costs 16,000¥ and Rating 6 costs 30,000¥ by the Creating a Credstick Table (p.239, agrees); Corporate Download is not in the library. Fake IDs are not modelled in the system.
- **hiring/face.md#6** — Shadowrun Companion p.100 / p.101 baseline payment row. The PDF has no text layer and the SR-OCR text is too garbled to confirm the figure; the same figures are checked as a group on hiring/index.md. No code counterpart.
- **hiring/face.md#7** — Shadowrun Companion p.100 / p.101 baseline payment row. The PDF has no text layer and the SR-OCR text is too garbled to confirm the figure; the same figures are checked as a group on hiring/index.md. No code counterpart.
- **hiring/face.md#16** — Tailored pheromones (M&M printed p.71) — bioware entry; a reference item with no mechanical hook beyond its listed Bio Index and cost.
- **hiring/face.md#32** — House-rule text (hazard pay percentages and worked-example arithmetic): the guide marks it as not from any SR3 book, so there is nothing in the PDFs to check it against. The arithmetic was checked and is consistent.
- **hiring/index.md#4** — Errata callout. Checked against the book: the core rulebook has no section called 'Spells, Contacts, and Services' (searched the whole text layer). 'No SR3 book prices specialists by skill rating' is an absence claim across the library that I did not exhaustively search; the Baseline Shadowrun Payment Table is in the Shadowrun Companion, whose PDF has no text layer.
- **hiring/index.md#7** — Shadowrun Companion pp.99-100 (Setting the fee, the Baseline Shadowrun Payment Table and how to use it). The PDF is 'no-text' and the SR-OCR dump of it is too garbled to confirm individual figures (it does show the table's rows, the '200¥/day' bodyguard line and the amoral-campaign and windfall passages). No code counterpart.
- **hiring/index.md#8** — Shadowrun Companion pp.99-100 (Setting the fee, the Baseline Shadowrun Payment Table and how to use it). The PDF is 'no-text' and the SR-OCR dump of it is too garbled to confirm individual figures (it does show the table's rows, the '200¥/day' bodyguard line and the amoral-campaign and windfall passages). No code counterpart.
- **hiring/index.md#9** — Shadowrun Companion pp.99-100 (Setting the fee, the Baseline Shadowrun Payment Table and how to use it). The PDF is 'no-text' and the SR-OCR dump of it is too garbled to confirm individual figures (it does show the table's rows, the '200¥/day' bodyguard line and the amoral-campaign and windfall passages). No code counterpart.
- **hiring/index.md#10** — Shadowrun Companion pp.99-100 (Setting the fee, the Baseline Shadowrun Payment Table and how to use it). The PDF is 'no-text' and the SR-OCR dump of it is too garbled to confirm individual figures (it does show the table's rows, the '200¥/day' bodyguard line and the amoral-campaign and windfall passages). No code counterpart.
- **hiring/index.md#11** — Shadowrun Companion pp.99-100 (Setting the fee, the Baseline Shadowrun Payment Table and how to use it). The PDF is 'no-text' and the SR-OCR dump of it is too garbled to confirm individual figures (it does show the table's rows, the '200¥/day' bodyguard line and the amoral-campaign and windfall passages). No code counterpart.
- **hiring/index.md#13** — Shadowrun Companion pp.99-100 (Setting the fee, the Baseline Shadowrun Payment Table and how to use it). The PDF is 'no-text' and the SR-OCR dump of it is too garbled to confirm individual figures (it does show the table's rows, the '200¥/day' bodyguard line and the amoral-campaign and windfall passages). No code counterpart.
- **hiring/index.md#14** — Shadowrun Companion pp.99-100 (Setting the fee, the Baseline Shadowrun Payment Table and how to use it). The PDF is 'no-text' and the SR-OCR dump of it is too garbled to confirm individual figures (it does show the table's rows, the '200¥/day' bodyguard line and the amoral-campaign and windfall passages). No code counterpart.
- **hiring/index.md#15** — Shadowrun Companion pp.99-100 (Setting the fee, the Baseline Shadowrun Payment Table and how to use it). The PDF is 'no-text' and the SR-OCR dump of it is too garbled to confirm individual figures (it does show the table's rows, the '200¥/day' bodyguard line and the amoral-campaign and windfall passages). No code counterpart.
- **hiring/index.md#16** — Shadowrun Companion pp.99-100 (Setting the fee, the Baseline Shadowrun Payment Table and how to use it). The PDF is 'no-text' and the SR-OCR dump of it is too garbled to confirm individual figures (it does show the table's rows, the '200¥/day' bodyguard line and the amoral-campaign and windfall passages). No code counterpart.
- **hiring/index.md#17** — Shadowrun Companion pp.99-100 (Setting the fee, the Baseline Shadowrun Payment Table and how to use it). The PDF is 'no-text' and the SR-OCR dump of it is too garbled to confirm individual figures (it does show the table's rows, the '200¥/day' bodyguard line and the amoral-campaign and windfall passages). No code counterpart.
- **hiring/index.md#18** — Shadowrun Companion pp.99-100 (Setting the fee, the Baseline Shadowrun Payment Table and how to use it). The PDF is 'no-text' and the SR-OCR dump of it is too garbled to confirm individual figures (it does show the table's rows, the '200¥/day' bodyguard line and the amoral-campaign and windfall passages). No code counterpart.
- **hiring/index.md#19** — Shadowrun Companion pp.99-100 (Setting the fee, the Baseline Shadowrun Payment Table and how to use it). The PDF is 'no-text' and the SR-OCR dump of it is too garbled to confirm individual figures (it does show the table's rows, the '200¥/day' bodyguard line and the amoral-campaign and windfall passages). No code counterpart.
- **hiring/index.md#20** — Shadowrun Companion pp.99-100 (Setting the fee, the Baseline Shadowrun Payment Table and how to use it). The PDF is 'no-text' and the SR-OCR dump of it is too garbled to confirm individual figures (it does show the table's rows, the '200¥/day' bodyguard line and the amoral-campaign and windfall passages). No code counterpart.
- **hiring/index.md#21** — Shadowrun Companion pp.99-100 (Setting the fee, the Baseline Shadowrun Payment Table and how to use it). The PDF is 'no-text' and the SR-OCR dump of it is too garbled to confirm individual figures (it does show the table's rows, the '200¥/day' bodyguard line and the amoral-campaign and windfall passages). No code counterpart.
- **hiring/index.md#22** — Shadowrun Companion pp.99-100 (Setting the fee, the Baseline Shadowrun Payment Table and how to use it). The PDF is 'no-text' and the SR-OCR dump of it is too garbled to confirm individual figures (it does show the table's rows, the '200¥/day' bodyguard line and the amoral-campaign and windfall passages). No code counterpart.
- **hiring/index.md#23** — Shadowrun Companion pp.99-100 (Setting the fee, the Baseline Shadowrun Payment Table and how to use it). The PDF is 'no-text' and the SR-OCR dump of it is too garbled to confirm individual figures (it does show the table's rows, the '200¥/day' bodyguard line and the amoral-campaign and windfall passages). No code counterpart.
- **hiring/index.md#24** — Shadowrun Companion pp.99-100 (Setting the fee, the Baseline Shadowrun Payment Table and how to use it). The PDF is 'no-text' and the SR-OCR dump of it is too garbled to confirm individual figures (it does show the table's rows, the '200¥/day' bodyguard line and the amoral-campaign and windfall passages). No code counterpart.
- **hiring/index.md#25** — Shadowrun Companion pp.99-100 (Setting the fee, the Baseline Shadowrun Payment Table and how to use it). The PDF is 'no-text' and the SR-OCR dump of it is too garbled to confirm individual figures (it does show the table's rows, the '200¥/day' bodyguard line and the amoral-campaign and windfall passages). No code counterpart.
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
- **hiring/index.md#71** — Pairs each specialist with the 'nearest Companion baseline' — Shadowrun Companion p.100 figures (no text layer); the pairing itself is the guide's judgement.
- **hiring/index.md#72** — Pairs each specialist with the 'nearest Companion baseline' — Shadowrun Companion p.100 figures (no text layer); the pairing itself is the guide's judgement.
- **hiring/index.md#73** — Pairs each specialist with the 'nearest Companion baseline' — Shadowrun Companion p.100 figures (no text layer); the pairing itself is the guide's judgement.
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
- **hiring/physical-adept.md#6** — Shadowrun Companion p.100 / p.101 baseline payment row. The PDF has no text layer and the SR-OCR text is too garbled to confirm the figure; the same figures are checked as a group on hiring/index.md. No code counterpart.
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
- **hiring/shaman.md#6** — Shadowrun Companion p.100 / p.101 baseline payment row. The PDF has no text layer and the SR-OCR text is too garbled to confirm the figure; the same figures are checked as a group on hiring/index.md. No code counterpart.
- **hiring/shaman.md#7** — Shadowrun Companion p.100 / p.101 baseline payment row. The PDF has no text layer and the SR-OCR text is too garbled to confirm the figure; the same figures are checked as a group on hiring/index.md. No code counterpart.
- **hiring/shaman.md#9** — Shamanic lodge materials cost (Rating × Rating) × 1,000¥ on the Magical Gear Table, MitS printed p.169 — I read the table in the text layer (Shamanic Lodge Materials: (Rating x Rating) x 1,000Y), but the page's footer number is not in the text so the ledger cannot record the printed page. Not modelled in the system.
- **hiring/shaman.md#12** — Totem modifiers (printed pp.163-165): the rule that a totem gives bonus dice for some spells and spirits and penalties for others is in the text, and Bear favours health spells and forest spirits on p.160 ('a shamanist of Bear can only cast health spells and summon forest spirits') and on the Bear entry; the system holds the totem list only as descriptive text and applies no modifiers.
- **hiring/shaman.md#36** — House-rule text (hazard pay percentages and worked-example arithmetic): the guide marks it as not from any SR3 book, so there is nothing in the PDFs to check it against. The arithmetic was checked and is consistent.
- **hiring/street-samurai.md#6** — Shadowrun Companion p.100 / p.101 baseline payment row. The PDF has no text layer and the SR-OCR text is too garbled to confirm the figure; the same figures are checked as a group on hiring/index.md. No code counterpart.
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
- **magic/awakened-primer.md#67** — World lore / roleplaying text, no code counterpart. Totem modifiers giving bonus dice and penalties are on printed p.163 and agree; the mage description ('a discipline of formulae and elements') is the hermetic-tradition text on printed p.158, not p.163-165.
- **magic/awakened-primer.md#69** — World lore / law, no code counterpart. Checked against MitS printed p.11: spells, spirits and foci of Force 3 or higher are legally regulated in the UCAS and CAS, with permits available. The 'killing with magic is treated as premeditated' clause was not searched for.
- **magic/awakened-primer.md#71** — World lore, no code counterpart. Tir Tairngire's extent (most of former Oregon plus parts of Washington and California) is on printed p.321 and agrees; the 'Land of Promise in Sperethiel' gloss is not on that page (the book gives the translation on p.30; Sperethiel is named as a language elsewhere).
- **magic/awakened-primer.md#72** — World lore, no code counterpart. Council of Princes, High Prince Lugh Surehand and the dragon Lofwyr's seat agree with printed p.30 and p.321; the Council being 'all-elven at first' is on p.30.
- **magic/awakened-primer.md#73** — An absence claim about the core rulebook: a search of the whole text layer finds no mention of immortal elves, so it agrees; nothing in code to check.
- **magic/awakened-primer.md#75** — World lore, no code counterpart. Corporate extraterritoriality is on printed p.22 (the Shiawase Decision) and agrees.
- **magic/awakened-primer.md#76** — World lore, no code counterpart. SINs (introduced by the UCAS in 2036; residents without one are 'probationary citizens' with few civil rights) are on printed p.238 and agree; 'harder to trace' is the guide's gloss.
- **rules/combat.md#27** — A list of six unrelated actions (activate focus, call nature spirit, command a spirit, pick up/put down, use simple object). Each is a one-line Simple Action in the book (printed pp.105-107) and none is modelled beyond the generic 'Simple Action' mark; not itemised per action.
- **rules/combat.md#39** — Four Complex magic actions (banish, call elemental, control spirit, erase astral signature). Book lists them on printed p.107; none is charged or modelled individually (only the generic Complex mark exists).
- **rules/combat.md#149** — Matrix sourcebook p.18 (cold vs hot ASIST) — I read it in the text layer (PDF page 19, footer OCR reads "1s"), and a search of scripts/ finds no ASIST modelling, so the rule is not implemented; but the ledger cannot verify a printed page number from that OCR footer, so it cannot be recorded as not-implemented. The Matrix sourcebook is deliberately not a registered source book (CLAUDE.md).
- **sources.md#4** — Table of abbreviations (SR3 is the core rulebook, etc.); labels, no rule.
- **sources.md#17** — Absence claim (no SR3 book prices specialists by skill rating) plus a Companion citation (SRComp p.100, no text layer).
- **sources.md#19** — Statements about the library used for checking (Corporate Download is not in it; some gear in the original gists is in no book) — no game rule; not checkable against the PDFs.
- **sources.md#20** — Statements about the library used for checking (Corporate Download is not in it; some gear in the original gists is in no book) — no game rule; not checkable against the PDFs.
- **sources.md#24** — Terminology-replacement table. Read against the books: SR3 has the Spell Pool (p.44) not a Magic Pool; ritual sorcery uses a material link (MitS printed p.37, not pp.34-36 — the 'Material Link' passage is on p.37); Legality Codes like 6P-E (p.273); security codes Blue/Green/Orange/Red with 'UV' slang (p.205); Drain written +1(M) (p.162); Improved Reflexes is an adept power (p.169) and Increase Reflexes a spell (p.194). All agree except the material-link page range.
- **sources.md#25** — Terminology-replacement table. Read against the books: SR3 has the Spell Pool (p.44) not a Magic Pool; ritual sorcery uses a material link (MitS printed p.37, not pp.34-36 — the 'Material Link' passage is on p.37); Legality Codes like 6P-E (p.273); security codes Blue/Green/Orange/Red with 'UV' slang (p.205); Drain written +1(M) (p.162); Improved Reflexes is an adept power (p.169) and Increase Reflexes a spell (p.194). All agree except the material-link page range.
- **sources.md#26** — Terminology-replacement table. Read against the books: SR3 has the Spell Pool (p.44) not a Magic Pool; ritual sorcery uses a material link (MitS printed p.37, not pp.34-36 — the 'Material Link' passage is on p.37); Legality Codes like 6P-E (p.273); security codes Blue/Green/Orange/Red with 'UV' slang (p.205); Drain written +1(M) (p.162); Improved Reflexes is an adept power (p.169) and Increase Reflexes a spell (p.194). All agree except the material-link page range.
- **sources.md#27** — Terminology-replacement table. Read against the books: SR3 has the Spell Pool (p.44) not a Magic Pool; ritual sorcery uses a material link (MitS printed p.37, not pp.34-36 — the 'Material Link' passage is on p.37); Legality Codes like 6P-E (p.273); security codes Blue/Green/Orange/Red with 'UV' slang (p.205); Drain written +1(M) (p.162); Improved Reflexes is an adept power (p.169) and Increase Reflexes a spell (p.194). All agree except the material-link page range.
- **sources.md#28** — Terminology-replacement table. Read against the books: SR3 has the Spell Pool (p.44) not a Magic Pool; ritual sorcery uses a material link (MitS printed p.37, not pp.34-36 — the 'Material Link' passage is on p.37); Legality Codes like 6P-E (p.273); security codes Blue/Green/Orange/Red with 'UV' slang (p.205); Drain written +1(M) (p.162); Improved Reflexes is an adept power (p.169) and Increase Reflexes a spell (p.194). All agree except the material-link page range.
- **sources.md#29** — Terminology-replacement table. Read against the books: SR3 has the Spell Pool (p.44) not a Magic Pool; ritual sorcery uses a material link (MitS printed p.37, not pp.34-36 — the 'Material Link' passage is on p.37); Legality Codes like 6P-E (p.273); security codes Blue/Green/Orange/Red with 'UV' slang (p.205); Drain written +1(M) (p.162); Improved Reflexes is an adept power (p.169) and Increase Reflexes a spell (p.194). All agree except the material-link page range.
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

## Matches (478)

Each carries its quote and code location in the ledger; not repeated here.

