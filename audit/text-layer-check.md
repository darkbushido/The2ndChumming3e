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
| p.114 | Hull Factor | plain Hull rating ("not defined in R3R") | "(100 x Hull²)" | **Fixed** — `hullFactor()` |
| p.116 | Ducted Waterjet DP / CF / Load | 5,000 / 4 / 3 × Hull | × Hull Factor | **Fixed** |
| p.117 | EMD drive DP / CF / Load | 50,000 / 6 / 4 × Hull | × Hull Factor | **Fixed** |
| p.116 | Auxiliary Engine CF | (Hull + Hull) × 2 | "(Hull + Hull Factor) x 2"; (Body + 1) × 2 | **Fixed** |
| p.115 | Depth Enhancement Load | Hull × Hull × 2 per 10 m | "Hull Factor x (Body or Hull rating) x 2 kg" | **Fixed** (hulled); Body² × 2 kept for no Hull |
| p.119 | Flight Deck DP, catapult DP/CF/Load | × Hull | × "Body or Hull Factor" | **Fixed** |
| p.119 | Angled deck Load | metres × 20 | 20 × (Deck Length + Hull Factor) for ships | **Fixed** |
| p.115 | Extra entry points max | ⌈Body ÷ 2⌉, Hull × 2 | same | OK |
| p.115-116 | Accel 25, Speed 2, Handling 25, Economy 5/5%, Cargo 1/0.2 CF | same | same | OK |
| p.116 | Signature | levels⁴ × 200 | "(Levels of improvement)⁴ x 200" | OK |
| p.116 | Ballast DP / CF / Load | Body² × 10 / 2 / 25 | same (²) | OK |
| p.117 | Fin Drive DP, CF | Body² × 100, Body − 1 | same | OK |
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
waterjet costs 12.5 million Design Points, so any option priced above its chassis now carries a warning. The GM still
overwrites every row.

**Migration:** none needed. Design options are priced live from the design; no owned item stores a Hull-Factor figure.

**Not yet done:** other books' cited pages. Only R3R scored BAD, so the rest keep their text layers.
