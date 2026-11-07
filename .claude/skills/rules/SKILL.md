---
name: rules
description: Load only the SR3 rules a feature needs — read the generated rules digest, then print the matching sections of .claude/rules/ with their PDF and page. Use when starting a new feature or fix that touches a rule, when asked "/rules <topic>", or before reading whole rules files.
---

# /rules — the cheap way to load the rules (TODO 288)

1. Read `.claude/rules-digest.md` (~3k tokens): one line per rules section — heading, cited pages, the
   modules and tests that own it. Don't read the whole `.claude/rules/*.md` files.
2. For each section you will touch: `node tools/rules-digest.mjs <topic words>` (`npm run rules -- <topic>`).
   It prints just that section (from `.claude/rules/` and `CLAUDE.md`) plus 📖 the PDF and PDF page.
3. **The PDF is the authority.** Open the cited page (`pdftotext -layout -f N -l N`); never copy rulebook text
   beyond a short quote, and never touch `SR-OCR/`.
4. If you change a rules file: `node tools/rules-digest.mjs --write` — `tests/rules-digest.test.mjs` fails otherwise.
