---
paths:
  - "scripts/data/portraits.mjs"
  - "scripts/data/names.mjs"
  - "scripts/SR3EMeetContact.js"
  - "tests/portraits.test.mjs"
---

# Portraits and names — "Meet the contact" · TODO 262

## ⚠ The system never depends on a portrait module

- **No `requires`, no hard-coded module id.** A portrait source is *any active module* whose manifest carries:

  ```json
  "flags": { "The2ndChumming3e": { "portraits": { "index": "portraits/index.json", "schema": 1 } } }
  ```

  `Portraits.sources(game.modules)` finds them; with none, the face grid hides and names still work.
  `tests/portraits.test.mjs` fails if system code names a particular portrait module.
- A source may be private. Nothing from one is ever copied into this (public) repo: no images, no index, no paths.
- `recommends` may name a portrait module only once that module is public — the maintainer's call.

## The index contract (schema 1)

```
{ schema: 1, generated, count,
  jobs:       { "<job>": "<group>" },                       // civilian | kids | law_security | underworld
  archetypes: { "<actor name>": { job, exact, ages?: [...] } },   // Little Black Book name → portrait job
  entries:    [ { path, metatype, base, gender, age, minor, lifestyle, job, group, ethnicity } ] }
```

- `path` is relative to the module folder; the image URL is `modules/<module id>/<path>`.
- `base` is one of the system's metatypes (`human elf dwarf ork troll other`); `metatype` may be a variant (`fomori`).
- `exact: false` marks a stand-in job until that archetype has portraits of its own; the module switches it, and only
  NEW meetings pick that up — NPCs already made keep their faces.
- The module's builder refuses orphans and unapproved models; this side only checks shape (`Portraits.validate`) and
  drops bad entries, so a broken module never breaks the system.

## Rules the dialog follows

- **Offer, never apply.** Nothing assigns a portrait on its own. A picture someone chose (`!Portraits.isStockImg`) is
  never replaced; a stock one (mystery man) may be *preselected*, never saved without Confirm.
- **The book's metatype is an example, not a rule** (the maintainer, 2026-10-24). The GM may change it; the stat block
  stays the book's, so the dialog warns ("stats are the book's troll") and does not refuse.
- **Minors only when asked for** — `candidates` never returns a minor for an adult contact.
- **The chosen metatype filters the grid.** Fall back only within the race: exact → base/variant → same job group →
  same metatype. ⚠ No tier may cross metatypes — a "same job, any metatype" tier filled thin grids with other races
  (2026-10-25); the `portraits-job-tier-crosses-metatype` mutant guards it.
- **`sr3e.actor.create` applies `name` to every branch** (pack source, copy, blank vehicle) and to `prototypeToken.name`.
- Names: `Names.generate({ ethnicity, gender, metatype, group })` — `ethnicity` from the chosen portrait so the name
  fits the face; first and last name from the same heritage sub-pool; street-name chance by job group.
