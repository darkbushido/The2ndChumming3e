# Maintainer rulings — November 2026

Log of questions put to the maintainer through the questions session. Format: question, answer, date, source.

## rules-digest (feature/rules-digest)

| # | Question | Answer | Date | Source |
|---|---|---|---|---|
| 1 | Form of the compact rules digest | Generated `.claude/rules-digest.md` + `tools/rules-lookup.mjs` | 2026-11-07 | tooling question, no book |
| 2 | One line in CLAUDE.md pointing at the digest | Yes | 2026-11-07 | tooling question |
| 3 | Add a `/rules` skill wrapping the lookup | Yes | 2026-11-07 | tooling question |

## mods (TODO 276, session mods-276)

| # | Question | Answer (verbatim notes) | Date | Source |
|---|---|---|---|---|
| Q1 | Laser sight with a smartlink | Warn option; "you shouldn't be able to apply both" (only the better, −2, counts) | 2026-11-07 | SR3 p.281, p.112 |
| Q2 | Imaging scope with a smartlink | Warn on install | 2026-11-07 | SR3 p.280; CC p.83; M&M p.34 |
| Q3 | Imaging scope / rangefinder mount | Top or Under | 2026-11-07 | SR3 p.280, p.282; CC p.33, p.82 |
| Q4 | Mount rules by weapon class | Warn on all five (hold-out any; pistol underbarrel; revolver/SMG/shotgun silencers) | 2026-11-07 | SR3 pp.276-277 |
| Q5 | Underbarrel mod on a pistol | Warn; a top-or-under item goes on top | 2026-11-07 | SR3 p.276, p.282 |
| Q6 | Sport rifles with no printed underbarrel | "if SR3 and CC are at odds, CC will usually win. if they are riffles they get the riffle mounts." | 2026-11-07 | SR3 p.277; CC p.75 |
| Q7 | Fore grip limited to SMG / assault rifle / shotgun | Warn outside those three | 2026-11-07 | CC p.34 |
| Q8 | Stock on a shotgun | Refused, like rifles: "the book is clear 'Rifles and shotguns may not have this modification'" | 2026-11-07 | CC p.34 |
| Q9 | Two integral accessories on one mount | Keep, no warning | 2026-11-07 | SR3 p.280 |
| Q10 | Internal smartgun price | "if its listed as an included accessory its assumed to be included in the price. the other places you listed are clearly for after market or new design. if they are adding a smartlink-1 the price goes up by 100% if they are adding a smartlink-2 the price goes up by 150%" | 2026-11-07 | SR3 p.281-282; M&M p.32 |
| Q11 | Combo imaging scopes | One item, summed price, one mount | 2026-11-07 | CC p.82 |
| Q12 | Magnification beyond Extreme | Keep as is (no shift beyond Extreme) | 2026-11-07 | SR3 p.110 |
| Q13 | Printed bracketed RC | Move to the GM's TN window | 2026-11-07 | SR3 p.280 |

General: maintainer asked that every page be read in the PDF before a question is put to them (2026-11-07).
| — | Cyberware mods and Essence (bears on Q14/Q15) | "for cyberware, they all should have some "free essence" for mods. if the installed mods fit in that then they are cleanly included. if they have put more mods then fit thats additional essence loss." | 2026-11-07 | M&M p.36 (capacity table) |

Queue: remaining mods questions moved to the back, after every other session (maintainer, 2026-11-07).

## shop (TODO 284/285, session shop-cart)

| # | Question | Answer | Date | Source |
|---|---|---|---|---|
| cart | Availability for a cart bought through a contact | One Etiquette Test against the slowest item, one haggle on the total (answered directly to shop-cart, recorded here) | 2026-11-07 | SR3 p.272 (PDF 274) |

## matrix (native Matrix Defragged turn flow, session hacking-module)

| # | Question | Answer | Date | Source |
|---|---|---|---|---|
| Q1 | Next slice: Security Sheaf Trigger Steps or the host-run turn loop | "Sheaf first" | 2026-11-07 | MDF p.23 |
| Q2 | Rulesets: both from the start or Defragged first | "Both from the start" | 2026-11-07 | MDF p.23 (Sheaf) vs Orthodox Security Tally |
| G5 | Triggered IC enters the tracker on GM click, −10/phase editable | Yes | 2026-11-07 | MDF p.23, pp.39, 42 |
| G1 | Count Matrix actions per pass, warn only | Yes | 2026-11-07 | MDF p.8 ("All Matrix actions are complex actions") |
| G2 | Only VR-Hot gets Matrix-initiative turns | Yes | 2026-11-07 | MDF p.10 |
| G3 | Matrix actions panel on the character sheet | Yes | 2026-11-07 | MDF p.8 (prompts) |
| G4 | IC turn: prompt card, GM clicks | Yes | 2026-11-07 | MDF p.26 |
| Q3 | Crash trigger: GM click only, no auto-suggest at 10 boxes | Keep GM click only | 2026-11-07 | MDF p.26, p.23 |
| Q4 | HoloSuite minigames | Cosmetic only, or park | 2026-11-07 | design choice |

## rules-digest round 2

| # | Question | Answer | Date | Source |
|---|---|---|---|---|
| 4 | 128 citations with no book named | Leave "?", follow-up TODO to name each book (checked against its PDF) | 2026-11-07 | repo measurement |
| 5 | Slim CLAUDE.md | Yes, its own TODO and branch; maintainer approves cuts | 2026-11-07 | repo measurement |
| 6 | Drift guard | Test only, no pre-commit hook | 2026-11-07 | — |

### shop — order delivery and the time toggle (grill round 1; numbered 288 by the shop session, clashes with rules-digest's 288)

| # | Question | Answer | Date | Source |
|---|---|---|---|---|
| Q1 | Time toggle scope | One world toggle, GM-only | 2026-11-07 | design |
| Q2 | Which purchases wait in session | Contact purchases wait; store purchases instant | 2026-11-07 | SR3 p.272-273 |
| Q3 | When money is paid | At delivery, by the book | 2026-11-07 | SR3 p.273 ("payment in full is expected at delivery") |
| Q4 | How time passing is decided | GM judges now; Foundry world time as a later option | 2026-11-07 | design |
| Q5 | Where open orders show | GM Orders window + read-only "On order" on the Gear tab | 2026-11-07 | design |
| Q6 | Toggle and healing | In session: pending recovery in the same window, GM clicks Recovered; first aid/spells instant | 2026-11-07 | SR3 p.127, p.129 |

### mods, continued

| # | Question | Answer | Date | Source |
|---|---|---|---|---|
| Q15 | Grade capacity cut | Book figures: −10% alpha, −20% beta, −25% delta, nearest .25 | 2026-11-07 | M&M p.36 |
| Q16 | Blank M&M prices | Fill: Cyberskates 1,000¥ (retractable 2,500¥), DNI 4,500¥, DNI Adaptation ×150%; p.36 table has no cost column | 2026-11-07 | M&M p.39 (PDF 41) |
| Q17 | Re-armed built-in weapon loses GM edits | Accept for now | 2026-11-07 | design |
| Q18 | Armour rules shown, not applied | Reminders; GM applies | 2026-11-07 | CC pp.51-53; SR3 p.284 |
| Q19 | Turbocharging Speed cap | Keep the warning | 2026-11-07 | R3R p.126 |
| Q20 | Does seating include the driver | Yes; passengers = seating − 1 | 2026-11-07 | SR3 p.133; R3R p.124 |
| Q21 | TODO 283 scope | One dialog for all hosts | 2026-11-07 | design |
| Q22 | TODOs 256/259 markings | Cheap parts only: chips, description line, `mount` field, the two smartgun items | 2026-11-07 | design |
| Q14 | Limb removal: built-ins' Essence joins the hole | Closed by the free-Essence ruling: only Essence actually paid joins the hole | 2026-11-07 | M&M p.147, p.35 |

### Corrections and later notes

- TODO numbers on main (coordinator): 287 vehicle design · 288 order delivery · 289 rules digest · 290 book names on citations · 291 slim CLAUDE.md.
- Mods Q6 superseded: the maintainer told the mods session directly, "SR3 is right Remington 750 and 950 should not take them. so warn." (SR3 pp.278-279). That later answer is the ruling; "CC usually wins" stays as a general rule.
- Mods Q14 resolved by the free-Essence ruling: the real page is M&M p.147 (Remove Cyberware); M&M p.35 says most limb equipment costs no Essence. Only Essence actually paid joins the hole.

## vehicle design (TODO 287)

| # | Question | Answer | Date | Source |
|---|---|---|---|---|
| G1 | Mod Design Point cost | Add `designCost` field now (not the recommendation) | 2026-11-07 | R3R p.112, p.116 |
| G2 | Options catalogue in slice 2 | Typed rows now, catalogue as slice 3 | 2026-11-07 | R3R pp.114-121 |
| G3 | Where a design lives | On the vehicle; re-save offers changes | 2026-11-07 | design |
| G4 | Where the window opens | Directory button, macro, and vehicle sheet | 2026-11-07 | design |
| Q2 | Availability class modifiers | Apply as p.113 states | 2026-11-07 | R3R p.113 |
| Q3 | Minimum "2/24" | "a day is 24hrs, the base is 2/24hours so a 2/2 days should be 2/48hrs. you cannot mod it lower then 2/24hrs." | 2026-11-07 | R3R p.113 |

| Q4 | Smart-materials rounding | Nearest, .5 up | 2026-11-07 | R3R p.118, p.111 |
| Q5 | Table discrepancies | Keep printed figures | 2026-11-07 | R3R pp.196-202 |

## matrix, continued

| # | Question | Answer | Date | Source |
|---|---|---|---|---|
| Q5b | How the −10 Initiative reaches a triggered IC | Offer on the card; GM edits | 2026-11-07 | MDF p.23 |
| Q6 | 9 sheaf rows + Convergence as 10th box | Keep as is | 2026-11-07 | MDF p.23 |

## shop, order delivery round 2 (TODO 288)

| # | Question | Answer | Date | Source |
|---|---|---|---|---|
| Q7 | Who cancels an open order | GM only (not the recommendation) | 2026-11-07 | SR3 p.273 |
| Q8 | Flip to Downtime with orders open | Ticked offer dialog | 2026-11-07 | design |
| Q9 | Medical bill during recovery | Separate, unchanged | 2026-11-07 | SR3 p.128 |
| Q10 | New damage during a recovery | Amber warning, GM decides | 2026-11-07 | SR3 p.127 |
| Q11 | Who sees the toggle | Everyone; only the GM flips it | 2026-11-07 | design |

## mods, last item

| # | Question | Answer | Date | Source |
|---|---|---|---|---|
| Q23 | Overflow Essence; free capacity for other hosts | Overflow costs the mod's printed Essence; only limbs, skulls, torsos, eyes, ears get free capacity | 2026-11-07 | M&M p.35, p.147; SR3 p.299 |

All collected questions answered and routed (2026-11-07).

## Later questions (2026-11-07)

| Session | # | Question | Answer | Source |
|---|---|---|---|---|
| shop | 288 | Confirm nine-point design summary | Yes, build it | todo-288-design-summary.md |
| rules-digest | 290-1 | Astral soak citation | SR3 p.176 (p.175 is art) | Core PDF 178 |
| rules-digest | 290-2 | Open Test citation | SR3 p.39 | Core PDF 41 |
| rules-digest | 290-3 | Triggered-ware citation | M&M p.63-65 | M&M PDF 65-67 |
| rules-digest | 290-4 | Electrical damage citation | M&M p.127 | M&M PDF 129 |
| rules-digest | 290-5 | Firing Through citation | SR3 p.124-125 | Core PDF 126-127 |
| rules-digest | 290-6 | Touch range citation | SR3 p.183 | Core PDF 185 |
