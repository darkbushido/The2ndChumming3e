# Rules check v0.6.3 — code vs `guides/`, PDFs as authority (TODO 121)

**Status: COMPLETE — all 1756 units of 26 guide pages resolved, and every quote and code location re-verified by `tools/rules-ledger.mjs check`.**

Book text: the OCR text (Shadowrun-OCR). 208 quote(s) matched word by word only (tables in the OCR layout run across rows); `check` lists them as LOOSE.

Generated from `audit/rules-ledger-0.6.3.json`. Regenerate; do not hand-edit. A complete record proves the ledger is
fully evidenced — it does not prove the evidence was read correctly. Every `diverges` and every `unverifiable`
below is the maintainer's to decide.

| Verdict | Units |
| :--- | ---: |
| match | 843 |
| diverges | 1 |
| guide-differs | 0 |
| not-implemented | 243 |
| unverifiable | 134 |
| no-rule-claim | 535 |
| unchecked | 0 |

## Code diverges from the book (1)

### rules/reloading.md#34

Guide: The book doesn't say what happens to the rounds left in a removed clip.

> "They hold the maximum rounds available for the weapon, and are not interchangeable from weapon to weapon even within the same class" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.281

Code: `packs-src/sr3e-sr3-gear/spare-clip.27d3735181b12497.json:21`, `scripts/data/ammo-stock.mjs:152`

The 5¥ cost matches (a generic 'Spare Clip' gear item at cost 5), but it is not functionally linked to the reload system — nothing ties it to a specific gun's capacity. The 'not interchangeable from weapon to weapon even within the same class' restriction is not modelled: AmmoStock.fits() matches any reload of the same loading mechanism to any gun taking that mechanism, deliberately (see #35's house-rule note, which documents this as the table's simplification). Ruled a HOUSE RULE for now by the maintainer, 2026-09-28; to be fixed properly as TODO 203.


## Real rules the code does not implement (243)

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

Searched: `/magnetic anomaly|MAD detector|weapon detection/` — no matches.

Rating 1-4 hand-held and 4-9 architectural MAD detectors, rolling the rating against the weapon's Concealability (printed p.237); the weapon-detection rules are not implemented.

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

### magic/spellcasting.md#71

Guide: - They can protect up to **their Sorcery rating** in subjects, all within

> "within a distance equal to the caster's Magic Attribute x 100 meters, can be protected" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.183
> "A character can protect a maximum number of subjects equal to their Sorcery Skill Rating" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.183

Searched: `/protected subjects?|protectedIds|subjects? protected|Magic Attribute x 100/` — no matches.

A mage's Spell Defense pool is one total for the Combat Turn. Who is protected, the Sorcery-rating limit on subjects, the Magic × 100 m range and the same-plane condition are not recorded; every defender with a pool is offered a Counterspelling roll against any spell.

### magic/spellcasting.md#79

Guide: - **No resistance roll** (an object, or a willing subject): all the caster's

> "When casting spells against non-resisting targets (which are generally non-living targets) one success always insures some degree of effect" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.183

Searched: `/willing|non-resisting|nonResisting/` — no matches.

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

### magic/spellcasting.md#116

Guide: - A **limited spell** (fetish −1, exclusive −2) can lower the Force *for

> "A limit may either reduce the Force of a spell for purposes of Drain" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.180

Searched: `/fetishLimit|exclusiveLimit|limitedSpell|limited spell|drainForce/` — no matches.

### magic/spellcasting.md#123

Guide: | **Permanent (P)** | Must be sustained for a base time, then becomes permanent. Sorcery successes can be spent dividing that time instead of on the effect. |

> "Divide the base time by the number of successes allocated to determine how long the spell has to be sustained" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.178

Searched: `/permanentBase|Permanent Spell Base Time|divide the base time/` — no matches.

The Permanent Spell Base Time table exists only inside the healing flow (SR3EHealing.js:72); a permanent spell cast through the Sorcery flow gets no base time, and successes cannot be allocated to divide it.

### magic/spellcasting.md#129

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

### rules/rigging.md#20

Guide: - **An easier default.** A VCR lets its user default to Reaction for any

> "to default to Reaction for any Vehicle Skill at a +2 modifier, as" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.301

Searched: `/vcrDefault|defaultVCR|VCR.{0,40}\+2 modifier/` — no matches.

The guide itself says this is not modelled (TODO 106).

### rules/rigging.md#44

Guide: - Driving through a **datajack without a VCR** — or a VCR-equipped rigger

> "have a vehicle control rig. The modifier also applies if a rigger" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.134
> "is driving a vehicle not adapted for rigger control. If a vehicle" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.134

Searched: `/riggerAdapted|adaptedForRigger|rigger-adapted|adapted for rigger/` — no matches.

The datajack −1 row is offered only to a driver with no VCR (SR3EVehicleSheet.js:1107); a vehicle's adaptation for rigger control is not modelled, so a VCR rigger in an unadapted vehicle cannot take it (TODO 176 remainder, p.134).

### rules/rigging.md#94

Guide: A successful Hiding Test also earns an **Escape Bonus** equal to its

> "other vehicles and also receives an Escape Bonus equal to the" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.144
> "the other vehicle relocates the hiding vehicle (see Relocating)" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.144

Searched: `/escapeBonus|Escape Bonus|escape bonus/` — no matches.

The Relocating Test is implemented (its TN takes the Hiding successes, SR3EVehicleChase.js:1839); the Escape Bonus added to the hider's Driver Points each turn is not.

### rules/rigging.md#98

Guide: The vehicle resists with Body dice plus any Control Pool a jacked-in

> "combat attack using Control Pool instead of Combat Pool dice" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.149
> "vehicle's Body Rating, plus any available Control Pool dice up" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.149

Searched: `/controlPoolDodge|dodgeWithControl|Control Pool instead of Combat Pool/` — no matches.

The vehicle resists with Body dice (the soak card); adding Control Pool to that roll, and a rigger's Control Pool dodge against Handling, are not modelled (TODO 176 remainder, p.149).

### rules/rigging.md#99

Guide: Shooting **passengers** inside the vehicle is harder than shooting the

> "the vehicle's Armor or Body Rating, whichever is higher, from" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.149
> "Pool dice (round down) for Dodge or Damage Resistance Tests." — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.149
> "+3 target number modifier to his Damage Resistance Tests. (A" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.149

Searched: `/shootPassenger|passengerShot|armorOrBody|halfCombatPool/` — no matches.

### rules/rigging.md#151

Guide: {: .note }

> "to default to Reaction for any Vehicle Skill at a +2 modifier, as opposed to the usual +4" — Shadowrun 3e - Core Rules {FAN25000}.pdf, printed p.301

Searched: `/vcrDefault|defaultVCR|VCR.{0,40}\+2 modifier/` — no matches.

The guide states this itself (TODO 106).

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


## Could not be verified (134)

- **hiring/combat-mage.md#6** — Baseline Shadowrun Payment Table, Shadowrun Companion printed p.100 (PDF page 101 of the {FASA7905} scan) — the table sits on a grey shaded panel with no OCR text layer, so pdftotext finds nothing. Read from the rendered page image: the Security Duty row is 200¥/day, agreeing with this unit.
- **hiring/combat-mage.md#7** — Shadowrun Companion p.100 / p.101 baseline payment row. The PDF has no text layer and the SR-OCR text is too garbled to confirm the figure; the same figures are checked as a group on hiring/index.md. No code counterpart.
- **hiring/combat-mage.md#8** — Shadowrun Companion p.100 / p.101 baseline payment row. The PDF has no text layer and the SR-OCR text is too garbled to confirm the figure; the same figures are checked as a group on hiring/index.md. No code counterpart.
- **hiring/combat-mage.md#14** — Astral damage appearing on the physical body and disruption forcing a Magic Loss check are on printed p.175, an image-only page (no text layer). Read via the SR-OCR dump: 'The physical body manifests any damage inflicted on the astral form' and 'A character who is disrupted in astral combat must immediately check for Magic Loss (p. 160)' — the guide agrees. The Magic Loss check for disruption is not implemented.
- **hiring/combat-mage.md#15** — Legal background with no code counterpart. Checked against MitS printed p.11: Force 3+ magic is regulated in the UCAS and CAS, and a felony committed with magic is treated as premeditated; the guide agrees.
- **hiring/combat-mage.md#38** — House-rule text (hazard pay percentages and worked-example arithmetic): the guide marks it as not from any SR3 book, so there is nothing in the PDFs to check it against. The arithmetic was checked and is consistent.
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
- **rules/combat.md#27** — A list of six unrelated actions (activate focus, call nature spirit, command a spirit, pick up/put down, use simple object). Each is a one-line Simple Action in the book (printed pp.105-107) and none is modelled beyond the generic 'Simple Action' mark; not itemised per action.
- **rules/combat.md#39** — Four Complex magic actions (banish, call elemental, control spirit, erase astral signature). Book lists them on printed p.107; none is charged or modelled individually (only the generic Complex mark exists).
- **rules/combat.md#149** — Matrix sourcebook p.18 (cold vs hot ASIST) — I read it in the text layer (PDF page 19, footer OCR reads "1s"), and a search of scripts/ finds no ASIST modelling, so the rule is not implemented; but the ledger cannot verify a printed page number from that OCR footer, so it cannot be recorded as not-implemented. The Matrix sourcebook is deliberately not a registered source book (CLAUDE.md).
- **sources.md#4** — Table of abbreviations (SR3 is the core rulebook, etc.); labels, no rule.
- **sources.md#18** — Absence claim (no SR3 book prices specialists by skill rating) plus a Companion citation (SRComp p.100, no text layer).
- **sources.md#20** — Statements about the library used for checking (Corporate Download is not in it; some gear in the original gists is in no book) — no game rule; not checkable against the PDFs.
- **sources.md#21** — Statements about the library used for checking (Corporate Download is not in it; some gear in the original gists is in no book) — no game rule; not checkable against the PDFs.
- **sources.md#25** — Terminology-replacement table. Read against the books: SR3 has the Spell Pool (p.44) not a Magic Pool; ritual sorcery uses a material link (MitS printed p.37, not pp.34-36 — the 'Material Link' passage is on p.37); Legality Codes like 6P-E (p.273); security codes Blue/Green/Orange/Red with 'UV' slang (p.205); Drain written +1(M) (p.162); Improved Reflexes is an adept power (p.169) and Increase Reflexes a spell (p.194). All agree except the material-link page range.
- **sources.md#26** — Terminology-replacement table row (meta-documentation of the guide's own corrections, not a claim about the system's code). Checked against the book: MitS's ritual sorcery section names 'Material Link' as the term, printed p.37 (pdf p.38), agreeing with the guide's citation. No code implements ritual sorcery's targeting link, so there is nothing to compare it against.
- **sources.md#27** — Terminology-replacement table. Read against the books: SR3 has the Spell Pool (p.44) not a Magic Pool; ritual sorcery uses a material link (MitS printed p.37, not pp.34-36 — the 'Material Link' passage is on p.37); Legality Codes like 6P-E (p.273); security codes Blue/Green/Orange/Red with 'UV' slang (p.205); Drain written +1(M) (p.162); Improved Reflexes is an adept power (p.169) and Increase Reflexes a spell (p.194). All agree except the material-link page range.
- **sources.md#28** — Terminology-replacement table. Read against the books: SR3 has the Spell Pool (p.44) not a Magic Pool; ritual sorcery uses a material link (MitS printed p.37, not pp.34-36 — the 'Material Link' passage is on p.37); Legality Codes like 6P-E (p.273); security codes Blue/Green/Orange/Red with 'UV' slang (p.205); Drain written +1(M) (p.162); Improved Reflexes is an adept power (p.169) and Increase Reflexes a spell (p.194). All agree except the material-link page range.
- **sources.md#29** — Terminology-replacement table. Read against the books: SR3 has the Spell Pool (p.44) not a Magic Pool; ritual sorcery uses a material link (MitS printed p.37, not pp.34-36 — the 'Material Link' passage is on p.37); Legality Codes like 6P-E (p.273); security codes Blue/Green/Orange/Red with 'UV' slang (p.205); Drain written +1(M) (p.162); Improved Reflexes is an adept power (p.169) and Increase Reflexes a spell (p.194). All agree except the material-link page range.
- **sources.md#30** — Terminology-replacement table. Read against the books: SR3 has the Spell Pool (p.44) not a Magic Pool; ritual sorcery uses a material link (MitS printed p.37, not pp.34-36 — the 'Material Link' passage is on p.37); Legality Codes like 6P-E (p.273); security codes Blue/Green/Orange/Red with 'UV' slang (p.205); Drain written +1(M) (p.162); Improved Reflexes is an adept power (p.169) and Increase Reflexes a spell (p.194). All agree except the material-link page range.
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

## Matches (843)

Each carries its quote and code location in the ledger; not repeated here.

