# Text-layer check — R3R figures re-verified against page images (2026-11-08)

**Why:** the 3rd Edition library's text layers are not all reliable. A survey (24 sampled pages per book, scored by how many
words also appear in other books and by mixed-case garbage like "rActOr") finds **one badly garbled book: Rigger 3 Revised**
(41 mixed-case tokens per 1,000 words; superscripts come out as "!"). Every other book with a text layer scores OK or
SUSPECT. SUSPECT means proper names ("DocWagon") lowered the score, not garbling. The full table is in
`SR-OCR/text-layer-survey.md`, which is local only and never committed.

**Method:** R3R printed pp.100-210 were rendered at 300 dpi (Poppler `pdftoppm`, PDF page = printed + 2) and OCR'd with
Tesseract 5. Tesseract **also** drops the superscripts ("100 x Hull"), so every formula with an exponent, and every
flagged table cell, was read from the page image itself. The OCR, images and crops live in `SR-OCR/R3R/` (never committed).
Table digits: every chassis row (pp.202-205, 116 rows) and Power Plant row (pp.194-201, 331 rows) was diffed against the OCR,
and each flagged row was read from the image.

| Page | Figure (code) | Old figure | Image figure | Verdict |
|---|---|---|---|---|
| p.114 | Hull Factor | plain Hull rating ("not defined in R3R") | "(100 x Hull²)" | Divergent — **fixed on `claude/vehicle-design-3`** (277bf30a, TODO 287) |
| p.116 | Ducted Waterjet DP / CF / Load | 5,000 / 4 / 3 × Hull | × Hull Factor | Fixed there |
| p.117 | EMD drive DP / CF / Load | 50,000 / 6 / 4 × Hull | × Hull Factor | Fixed there |
| p.116 | Auxiliary Engine CF | (Hull + Hull) × 2 | "(Hull + Hull Factor) x 2"; (Body + 1) × 2 | Fixed there |
| p.115 | Depth Enhancement Load | Hull × Hull × 2 per 10 m | "Hull Factor x (Body or Hull rating) x 2 kg" | Fixed there |
| p.119 | Flight Deck DP, catapult DP/CF/Load | × Hull | × "Body or Hull Factor" | Fixed there |
| p.119 | Angled deck Load | metres × 20 | 20 × (Deck Length + Hull Factor) for ships | Fixed there |
| p.115 | Extra entry points max | ⌈Body ÷ 2⌉, Hull × 2 | same | OK |
| p.115-116 | Accel 25, Speed 2, Handling 25, Economy 5/5%, Cargo 1/0.2 CF | same | same | OK |
| p.116 | Signature | levels⁴ × 200 | "(Levels of improvement)⁴ x 200" | OK |
| p.116 | Ballast DP / CF / Load | Body² × 10 / 2 / 25 | same (²) | OK |
| p.117 | Fin Drive +25% rounding: rounding fixed on `claude/vehicle-design-3` · DP, CF | Body² × 100, Body − 1 | same | OK |
| p.117 | Hybrid: 25% plant, 6 CF, half Load | same | same | OK |
| p.118 | Hydrofoil 50/8; STOL 250, VSTOL 400; Manual 50; Smart 100 | same | same | OK |
| p.118 | Setup/Breakdown | Body × 5, + Body × 5 a minute | same | OK |
| p.118 | Special Storage 3/6/9/12; 10% CF; 1 kg per 10 CF | same | same | OK |
| p.119 | Structural Agility Body × 150/level; Tailhook 10%, ⌈Body/2⌉ CF, Body × 125 kg | same | same | OK |
| p.120 | Fuzzy Logic, Multi-Object: Adaptation × 100/level | same | same | OK |
| p.120 | Neural Network | Pilot² × 25/level | "Pilot rating² x 25" | OK |
| p.121 | Robotic Pilot | Pilot³ × 50 | "Pilot Rating³ x 50" | OK |
| p.121 | Robotic Reflexes 100/level | same | same | OK |
| p.202-205 | Chassis table (116 rows) | — | — | OK (flagged rows were OCR noise; ATV 595 confirmed) |
| p.194-201 | Power Plant table (331 rows) | — | — | OK (spot-read: EC Anthroform, EC Mini-blimp, N carriers) |
| p.112-114 | Brickyard example totals (1,402; 210,300¥; 214,950¥) | as in TODO 287's notes | same | OK — the book's own arithmetic, already noted |

**Consequence (the maintainer, 2026-11-08: "Book: 100 × Hull²"):** Hull Factor is large. A Hull 5 attack submarine's
waterjet costs 12.5 million Design Points. The fix itself is on `claude/vehicle-design-3`; this branch
changes no designer code.

**Migration:** none needed. Design options are priced live from the design; no owned item stores a Hull-Factor figure.

**Not yet done:** other books' cited pages. Only R3R scored BAD, so the rest keep their text layers.

## Pack cross-check, all books (TODO 296, 2026-11-08)

All 12 books were OCR'd: 1,705 pages, Tesseract 5 at 300 dpi, output in `SR-OCR/all/` (never committed). Each pack entry
whose `bookPage` names a book we hold was located on its cited page, and its stat numbers (cost, ammo, availability,
damage, ratings and so on) were checked against the OCR. **Results:**
- 1,267 entries carry numbers; 709 of them were located on the page by name.
- 46 entries had a number that is on the text-layer page but nowhere on the OCR page.
- Each of the 46 was read with `pdftotext -layout`, and the ambiguous ones from the page itself:

| Entry | Flagged | Finding |
|---|---|---|
| CC Cavalier Deputy 300¥, Ares Alpha 42(c)/2,000¥, Light Fire 70 475¥ | OCR missed the row | Layer row matches pack — OK |
| CC parachutes 500/750¥, Compensator and Belt 475¥, Radar Designator | OCR missed the row | Layer row matches pack — OK |
| CC Bo Staff, Katar, Safe Target, Ranger-X Bow, Slingshot | OCR split the table or misread ("SIR Min") | OK |
| MITS Alleviate Allergy "10 − Essence" | OCR read "70" | Layer right — OK |
| MITS adept powers cost 1, CC/MAT skills | the number "1" OCR'd as "|" or "{" | OK |

**Verdict:** no pack value is a text-layer misread in SR3, CC, M&M, MITS, Matrix, MDF, R3R or LBB.
Caveat: 558 entries were not located by name on their page, so they were not checked. The code's own page citations
(`scripts/`, about 280) have not yet been re-read this way.

## Code citations, all books (TODO 296, 2026-11-08)

`scripts/` carries 1,717 book-page citations (SR3, M&M, R3R, CC, MITS, MDF, NS, LBB, MAT). For each one, the numbers in the
code within 3 lines of the citation were checked against the cited page. A number was flagged when it is in the text layer
but missing from the OCR, since that is where a text-layer misread would hide. PDF offsets were measured from the pack hits:
SR3/M&M/R3R/NS +2, CC/MITS/MAT/LBB +1, MDF 0.

There were 93 flags:
- ~78 were noise: the page's own folio, a running-header "6", or a citation's page number.
- The other ~15 were read with `pdftotext -layout`. Examples: SR3 p.303 Built-In Smartgun Link SI 1.5 (OCR "LS"), CC p.34,
  CC pp.53-54, CC p.78, CC pp.116-117, M&M p.108, R3R pp.116-122, R3R p.135, R3R pp.201-205.

Each was either an OCR misread, or the number belonged to an unrelated line ("5R3" for "SR3", "Body x 10.OOO¥").
**No code figure was copied from a text-layer misread.** The R3R formulas were already re-read from the page images in
TODO 293, above.

## The pack entries not located earlier (TODO 296, 2026-11-08)

The locator was rerun with page offsets, matching on both the text layer and the OCR, plus name variants ("Rnds" → "Rounds",
without a parenthesis, the first word). That located 896 of 1,149 entries; the earlier run located 709 of 1,267, and the
total differs because "1" is now excluded as noise. The new flags were read with `pdftotext -layout`:

| Flag | Finding |
|---|---|
| CC Beretta 200ST 750¥, SuperMach 40(c), Grenade Link 750¥, Grapple Gun 500¥, Shock Lock 70¥ | OCR dropped or misread the cell ("A0 (c)"); layer row matches pack — OK |
| CC jumpsuits, Exec. Protector, Mercury, M&M Hook Hand 30¥ | OCR lost the table cells; layer matches — OK |
| MAT touchpads 60¥ | 50¥ + 10¥ adapter, printed as such — OK |

The 253 entries still not located are mostly derived or abbreviated:
- 159 "N-Rnd Clip (type)" entries, whose numbers are computed from the per-round rows checked above.
- CybDeck/CyGun/Eye abbreviations, Zoé/V-Island clothing lines, mortar rounds and the like.

For these, a check against the cited page and its neighbours, with no name match, flagged only generic numbers: clip sizes,
"1.5", "7". **Verdict, TODO 296: no pack value and no code figure in any of the 12 books comes from a text-layer
misread.** R3R's Hull Factor (TODO 293) remains the only one found.
