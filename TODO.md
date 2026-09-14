# TODO

Open work for the SR3 Table Reference. Rules for adding content are in `CLAUDE.md`: cite the
printed page, verify against the PDF, and put non-book material in a `.house` box.

## Content

1. **Ammunition effects page.** `rules/reloading.md` covers loading and buying ammo, and
   points to *Ammunition* (SR3 p.116) for what each round does: APDS, explosive and EX,
   flechette, gel, tracer. Write that page. The Foundry repo's CLAUDE.md records two traps
   worth re-checking against the book: flechette uses **max(Impact × 2, Ballistic)**, and
   gel knockdown uses the full Power.
2. **Firearm accessories.** SR3 p.280–281: mounts, recoil compensation, gas vents,
   smartguns, silencers versus sound suppressors, and imaging scopes.
3. **Full decking page.** `rules/combat.md` has only a summary of the core Matrix rules
   (SR3 p.199–232). The *Matrix* sourcebook (hot/cold ASIST p.18, and more) is barely used.
4. **Full rigging page.** Also only a summary. *Rigger 3 Revised* has a poor text layer, so
   check every figure against the page itself.
5. **Surgery and chrome maintenance.** *Man & Machine* p.135 onward: surgery procedures,
   thresholds, Stress. The cyberware grades page links here in prose only.
6. **Called shots, Full Defense and knockdown** could each go on the combat page. All have
   SR3 citations in the Foundry repo's CLAUDE.md to start from.

## Accuracy follow-ups

7. **Bleeding at exactly Deadly (10 boxes).** The book says overflowed characters lose a box
   every (Body) Combat Turns (SR3 p.126), and first aid on a Deadly wound "stops" that
   (SR3 p.129). Whether a character at exactly 10 boxes, with no overflow, is also losing
   boxes isn't stated outright. `rules/healing.md` step 0 describes overflow only. Decide
   whether to say more.
8. **When the permanent-damage roll happens.** SR3 p.127 triggers it on the Deadly wound,
   but a trauma patch adds +2, which implies the roll comes after stabilizing. The healing
   page puts it at step 4 on that reading.
9. **Shadowrun Companion** is image-only. Only p.99–101 (payment, run types) have been read.
   Check any other use against the scans (`tools/pdf-jpegs.mjs`).
10. ***Corporate Download*** isn't in the PDF library. If it's added, check the Face page
    against it.

## Site

11. **Link the old gists to the new pages.** Add a line at the top of each of the 15 gists
    pointing to its corrected page. This edits public content, so wait for the go-ahead.
12. **Check the theme on a phone and when scrolled.** Screenshots were only possible at
    the top of each page in the preview pane; mobile layout hasn't been checked.
13. **Contrast check** for muted text (`$sw-muted` on obsidian) and the gold table headers.
14. **Search results include hidden corrections.** Just the Docs indexes the whole page,
    so a search can land on a correction box that's hidden. Probably fine; revisit if it
    confuses readers.
