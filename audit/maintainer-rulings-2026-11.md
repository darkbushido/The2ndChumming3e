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
