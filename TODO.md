# TODO

Durable backing store for the work list. Same principle as `audit/combat-audit.md`:
**this file is the progress**, not a cache. The in-session task list is ephemeral —
update this file when items change, and rebuild the task list from here.

Every file:line citation below was verified against the code at time of writing
(2026-08-04, branch `Shadowfork`). Verify before relying on any of them.

Sequencing: **#4 and #8 before #1.** Everything else is independent.

---

## 1. Audit and remove dead code — *investigated 2026-08-04; blocked by #4, #8 for deletion only*

**Root cause: the book split renamed every content pack from `sr3e-<type>` to
`sr3e-<book>-<type>`, and no macro was updated.** 24 of 27 macros in `scripts/macros/`
target a pack that no longer exists and fail at `game.packs.get()` returning undefined.

Nothing under `scripts/` is unreferenced at file level — the loaded code is clean. All the
rot is in `scripts/macros/` plus two root build scripts.

### DECISION (2026-08-04): retire the populate pipeline, don't repair it

**Retiring costs nothing — the macros were already superseded, not merely broken.**

The book split did not use them. `3437608` and `39f8946` touched only `system.json`,
`packs/`, `archive/` and tests; **no migration script was ever committed**. The split was
done by direct LevelDB manipulation from throwaway scratchpad scripts — which is why
`archive/non-sr3-content/*.json` carries raw `_key` values and the README's restore snippet
is `db.put(_key, doc)`.

So a more capable pipeline already exists and is what actually gets used:

1. **Direct LevelDB / `fvtt package`** — LevelDB ↔ YAML/JSON. Scriptable, diffable, needs no
   live world. This is what performed the split.
2. **Edit in Foundry** — unlock pack → edit → lock. Writes to LevelDB, commits to git.
   Already the documented workflow for icons.

Compendium content kept working through the split because it is **static data in committed
LevelDB files** — Foundry reads packs from the `system.json` declarations and the files on
disk at load. The macros are authoring-time only, with no runtime role, so their breakage
has no user-facing effect at all.

Packs ship as committed LevelDB in git and are the source of truth. Population was a
one-time bootstrap.

**This does not relax the harvest requirement below** — retiring the *code* still destroys
the *data* in the seven inline-data macros unless it is extracted first. Sequence stays:
harvest → delete.

⚠ CLAUDE.md's "Compendium population — correct pattern" section documents the temp-doc →
`importDocument` → delete workflow as core. Update or remove it when this lands, or the docs
will describe a pipeline that no longer exists.

### Delete now — cannot run, nothing to lose

- **`build-cyberdeck-pack.mjs`** — three independent reasons: input
  `rawdata/cyberdecksDF.json` **missing**, output pack `sr3e-cyberdecks` **missing**, and
  it writes NeDB `.db`, which exists nowhere in `packs/` (v13 uses LevelDB directories).
- **`build-armor-pack.mjs`** — input `rawdata/Armor.json` survives, but output
  `packs/sr3e-armor` is gone and it writes the same obsolete format.

### Safe to delete — carry NO data

The 11 `populate-*-v2.js` (all except `populate-skills-v2.js`) are thin 80–86 line
fetch-and-map loaders. They hold no data: each `fetch()`es live JSON from
`raw.githubusercontent.com/criticalfault/Shadowrun-Character-Generator/main/src/data/SR3/*.json`
at run time. Deleting them loses only mapping logic.

⚠ **But that mapping logic is the working reference for #8.** It is the existing
fetch → map → `pack.importDocument` pipeline, and #8 has to rewrite exactly that (to parse
`Mods` rather than `Notes`). Do #8 first, or keep one as a template.

⚠ They fetch from **`criticalfault/`** — upstream, not the `darkbushido/` fork.

### Must harvest before deleting — hand-authored inline data

These do not fetch. Their data exists only inside them:

| File | Lines | Note |
|---|---:|---|
| `populate-mr-johnsons-contacts.js` | 2116 | |
| `populate-cyberware.js` | 350 | **61 `bonus` refs — only hand-authored bonus data in the repo (#8); only home for the Move-by-Wire block (#4)** |
| `populate-bioware.js` | 248 | |
| `populate-agents.js` | 219 | |
| `populate-drugs.js` | 210 | |
| `populate-hosts.js` | 153 | |
| `populate-medical.js` | 152 | |

### Keep — blocked, not dead

`populate-odm-cyberdecks.js`, `populate-odm-programs.js`. Their packs are missing because
they were *dropped*, not renamed. Documented recovery path for Orthodox Matrix.

### Still working — 3

`import-sr3-character.js` (targets no pack), `populate-skills-v2.js` → `sr3e-skills`,
`populate-mr-johnsons-contacts.js` → `sr3e-mr-johnsons-contacts`. The two surviving packs
are exactly the system packs the split didn't touch.

### Image updaters — 4, low value

`update-{firearms,host,projectiles}-images.js` are 25 lines each with a single image path;
`update-all-compendium-images.js` is 48 lines with 20 paths, every one targeting a dead
pack. Trivial to re-derive. Delete unless the path list is wanted.

### ⚠ Functional regression this exposed

`populate-macros.js` targets **`sr3e-macros`, which is missing**. That pack is how
`import-sr3-character.js` reaches users as a clickable macro — so the character importer
currently has no delivery mechanism. Restoring the pack is a fix, not a cleanup.

## 2. Rebuild combat on sockets with player-initiated flow

Foundry sockets so each participant sees the right window on their own screen:

- Players can initiate combat (currently attacker-sheet driven, assumes one client)
- **Dodge window on the target's screen**, not the attacker's
- **GM window to set TN, with checkboxes for combat modifiers** (not a typed field)

Prior art: `origin/player-combat`, single commit `0c45bc5` *"Route dodge declaration to
the defending player instead of the attacker"*, already merged into Shadowfork. Read it
first — decide whether this extends or replaces it.

Touches `SR3EItem.rollWeapon`, `SR3EActor.postMeleeCard`, `_promptDodgeDeclaration`, and
the chat-card handlers in `sr3e.js`. Keep the ethos: no automation of outcomes, all values
editable. `_checkBtn`/`_claimBtn` one-shot guards still apply — socket messages land on
multiple clients.

## 3. Implement the Pain Editor

**Data-present, mechanics-absent.** In the `sr3e-mm-bioware` pack; `scripts/` has zero hits
for "pain editor".

Implementation point is derived `system.woundMod` in `prepareDerivedData` and everything
downstream — TN penalties on every `rollPool`, Combat Pool derivation, initiative base.
Check M&M for exact behaviour incl. interaction with overflow/unconsciousness thresholds,
and whether boxes still track normally while the penalty is ignored. Keep the resulting
wound modifier GM-overridable.

## 4. Review move-by-wire calculations

Exists **only as compendium data**, `scripts/macros/populate-cyberware.js:71-85`. No
dedicated calculation code.

| Level | Essence | bonusQui | bonusRea | bonusInitDice |
|---|---|---|---|---|
| MBW 1 | 3 | +2 | +2 | +2 |
| MBW 2 | 4 | +4 | +4 | +3 |
| MBW 3 | 5 | +6 | +6 | +4 |

- Verify against Man & Machine.
- **Quickness feeds Combat Pool** (⌊(QUI+INT+WIL)/2⌋) — `bonusQui: +6` silently moves the
  pool. Confirm intended and that it flows through `prepareDerivedData`.
- Descriptions claim "Incompatible with wired reflexes or boosted reflexes" but nothing
  enforces or warns. Under minimal-guardrails a warning, not a block.
- Confirm the bonus fields are actually consumed, not decorative.

## 5. Make essence loss permanent when cyberware is removed — **CONFIRMED BUG**

`SR3EActor.js:1683-1692` recomputes Essence every `prepareDerivedData` from **currently
held** cyberware:

```js
let essenceLoss = 0;
for (const item of (this.items ?? [])) {
  if (item.type === 'cyberware') essenceLoss += parseFloat(item.system?.essenceCost ?? 0);
}
attr.essence.value = Math.max(0, parseFloat((6 - essenceLoss).toFixed(2)));
```

Delete the item, the loss vanishes. SR3: Essence loss is permanent.

Blast radius — two derived values hang off it at `SR3EActor.js:1702-1708`:
Bio Index capacity = `essence.value + 3`; effective Magic = `essence.value − (totalBioIndex / 2)`.
So a refund silently inflates Magic and bio-index headroom.

**Fix:** persist the loss as a high-water mark that only ratchets down (the data model
already has `attributes.essence` as a SchemaField with `base`, `ActorDataModels.js:120`).
Keep it manually editable — GMs need it for chargen, imports, houserules.
`scripts/macros/import-sr3-character.js:469-470` currently relies on the re-derivation and
must change in step.

## 6. Open upstream bugs and PRs for the pushed non-Shadowfork branches

Target **upstream** (`williamdiffey/The2ndChumming3e`), not origin (`darkbushido/…`).
`origin/main` is level with `upstream/main`, so each PR is a clean diff.
All four are already merged into Shadowfork locally.

| Branch | Ahead | Content |
|---|---|---|
| `origin/player-combat` | 1 | `0c45bc5` dodge declaration → defending player |
| `origin/initiative-rounds` | 4 | `5985910` initiative as explicit action queue + `tests/initiative.test.mjs` |
| `origin/skill-bonus-dice` | 4 | `7190d20` skill bonus dice on every roll path + `tests/skill-bonus.test.mjs` |
| `origin/spell-self-target` | 4 | `74d0ab4` spells castable on caster + `tests/targeting.test.mjs` |

The three 4-commit branches each carry the same `6962d2c` test-harness commit merged from
the `tests` branch — upstream sees it three times unless it lands once first. Consider
landing the harness alone, then rebasing the rest.

`player-combat` and arguably `spell-self-target` are defect fixes — open a bug describing
the broken behaviour and reference it from the PR. `gh` defaults to origin; confirm the
target repo on every command.

## 7. Expand test coverage for combat, initiative and pools

Existing: `tests/{combat-rules,damage-codes,initiative,skill-bonus,source-books,targeting}.test.mjs`,
run via `tests/run.mjs` with the `tests/helpers/foundry.mjs` stub. Read before adding.

Gaps — every one was a real defect the audit found by hand and no test caught:

- **Pool refresh at the round boundary.** Combat/Spell/Astral/Hacking were refreshed only in
  `endCombat`, staying spent across rounds. Fixed `30bab18`.
- **Recoil reset at all three phase boundaries** (pass, new round, end of combat). Fixed `802c99b`.
- **Full Defense ending at a turn boundary** rather than at end of combat. Fixed `30bab18`.
- **Combat Pool derivation** — ⌊(QUI+INT+WIL)/2⌋, wound mod folded in, available = derived −
  spent floored at 0, spending accumulates rather than overwrites.
- **Spell Pool** ⌊(INT+WIL+MAG)/3⌋ and null-for-non-Awakened.

Common thread: state that used to reset because every round called `endCombat()`, orphaned
when rounds became continuous. `audit/combat-audit.md:338-356` lists the full eight-item
reset block; `tempMagicLoss` is the one whose correct lifetime was never established.

## 8. Ship cyberware/bioware with their bonuses pre-filled

**Plumbing is complete; only structured data is missing.**

- Fields declared: `ItemDataModels.js:250-266` (`bonusBod/Qui/Str/Cha/Int/Wil/Rea/InitDice`,
  `improvedSkillName`/`improvedSkillDice`)
- Summed into `cyberBonus`: `SR3EActor.js:1608-1615`
- Rendered as editable inputs: `SR3EItemSheet.js:638` (cyber), `:851` (bio)

**No shipped pack carries a structured bonus.** ~800 cyberware + ~119 bioware documents
across 14 packs: **zero `bonus*` keys present at all**.

**But the data is there as free text** — 181 hits in the pack LevelDB for `+1RCT,+1INI`,
`+2RCT,+2INI`, `+1QCK,+1STR`. It rode along in a notes field and was never parsed.

Cause: `populate-cyberware-v2.js` (built the shipped packs) has **0** `bonus` references;
legacy `populate-cyberware.js` has **61**. The v2 rewrite dropped them.

### ⚠ Parse `Mods`, NOT `Notes`

Established in `criticalfault/Shadowrun-Character-Generator` issue #199 — the maintainer
confirmed **`Mods` is authoritative and carries strictly more information**. `Notes` is a
flattened human-readable view. An earlier version of this task said to parse `Notes`; that
was wrong.

Source: `C:\Users\lance\Documents\Shadowrun-Character-Generator\src\data\SR3\{Cyberware,Bioware}.json`.

`Mods` uses a **first-letter-replacement** encoding, and there are **two incompatible
schemes**:

- **3-letter** (Bioware): `R` = racial, `N` = natural, `X` = both, replacing letter 1.
  `ROD`=Body `RTR`=Str `RCK`=Qui `RNT`=Int `NCT`=Reaction `NNI`=Init `XOD`/`XCK`/`XTR`=both
- **4-letter** (AdeptPowers): `R` + full code — `RBOD` `RSTR` `RQCK`

The 3-letter scheme is not injective (racial Reaction would be `RCT`, already plain
Reaction — which is why Reaction uses `N`). The 4-letter form is unambiguous.

**`Mods` is overloaded** — it also carries non-attribute feature flags that must be
filtered, or they become phantom attributes: `STG` (Suprathyroid Gland), `MNE` (Mnemonic
Enhancer), `DGX` (Digestive Expansion), `DJK`, `PCL`, `PCA`, `MUL`, `AST`, `CPL` (Combat Pool).

**For SR3E specifically:** no racial-max tracking exists, so `ROD`/`BOD`/`XOD` all collapse
to `bonusBod`. The distinction costs nothing.

**14 entries have `Mods: ""` with modifiers only in `Notes`** (9 in Bioware) — e.g. Adrenal
Pump `+1QCK,+2STR,+1WIL,+2RCT`. A `Mods`-only parse silently drops these. Flag for manual
review; some are conditional (`+2BOD` only vs nitrogen narcosis) and may be excluded on purpose.

Won't parse cleanly, needs judgement: armour values (`+3IMP`,`+3BAL` on Body Plating),
weapon damage strings (`Unarmed = (STR+4)M Stun` on Bone Lace), category-wide skill
bonuses (→ #10), incompatibility prose.

Harvest `populate-cyberware.js` before #1 deletes anything; use it to check the parser.
Keep fields editable — pre-fill defaults, don't lock. M&M PDF available for the leftovers.

## 9. Re-add the archived fan books and conversions

`archive/non-sr3-content/` — 1,703 docs, one JSON per **original** pack, each entry
`{ _key, bucket, doc }`. Its README was rewritten in `6ed41b8` and is now accurate; read it
before starting.

| Bucket | Docs | Status |
|---|---:|---|
| `fan` | 1,219 | un-restored (ray 658 · cb1-4 369 · cp 114 · nagee 44 · pw 18 · bjf 9 · adh 2 · cus 1) |
| `sr2` | 441 | **435 already restored**; 6 orphaned (`cs` 3, `gm2` 1, `r2` 1, blank 1) |
| `sr2-fan` | 41 | un-restored (NERPS: ShadowLore) |
| `unknown` | 2 | corrupt `bookPage`, needs hand classification |

⚠ **Files still hold everything, including what now ships. Re-importing blind duplicates.**

Per book restored: a pack per content type (`packs/sr3e-<code>-<type>`), a `system.json`
declaration with `flags.The2ndChumming3e.book`, and a `SOURCE_BOOKS` entry in `config.js`.
Missing flag ⇒ permanently visible (fail-visible by design). `tss` is the working precedent
(fan: true, enabled: false, nine packs).

Codes come from the `BookPage` prefix in the generator's gear data, **not** its `Books.json`
(which has no codes). Two snags: generator uses `sta2` where `SOURCE_BOOKS` uses `sota2`;
`n/sl` has a slash needing sanitising for a pack name.

Chromebooks (`cb1`-`cb4`) and Cyberpunk 2020 (`cp`) are fan *conversions*, not official SR2 —
they stay archived.

## 10. Support category-wide skill bonuses (Enhanced Articulation)

**Enhanced Articulation** (M&M p.66) grants `+1 Reaction` (covered by #8) **and 1 extra die
to Combat, Physical, Technical and Build/Repair skill tests** — currently inexpressible.

`skillBonusDice` is flat and keyed by **skill name** (`SR3EActor.js:1596-1600`), fed from
`improvedSkillName`/`improvedSkillDice` on three models (`ItemDataModels.js:263-264`,
`:295-296`, `:361`). No category support anywhere — no `improvedSkillCategory`,
`categoryBonus` or `bonusCategory`.

Enumerating member skills by name breaks silently when a skill is added.

**Small fix, because:** the four categories map exactly onto `ACTIVE_SKILL_CATEGORIES`
(`config.js:521-524`) — `'Combat skills'` `'Physical skills'` `'Technical skills'`
`'Build/Repair skills'`. And consumption needs no work: everything reads via
`SR3EItem._skillBonusDice` (`SR3EActor.js:981`, `:5292`, `:5759`, `:5832`;
`SR3EItem.js:112`), so anything in the map reaches every roll path and the sheet for free.

**Shape:** add `improvedSkillCategory` beside `improvedSkillName` on the three models;
expand category → member skills in the map builder at `SR3EActor.js:1596`. Name and
category bonuses should stack. Check adept powers and Encephalon-style bioware for the same
pattern.

⚠ Data model changes need a full Foundry restart, not F5. Guard reads with `?? default`.

---

## Open questions carried from the combat audit

`audit/combat-audit.md` — all five dimensions done, every defect fixed and merged. Three
things it explicitly did not resolve:

- Whether Full Defense is *complete* against the rules (`:311`) — "worth its own pass"
- `tempMagicLoss` — the one `endCombat` reset whose correct lifetime was never established (`:352`)
- Delayed actions and mid-round joins (`:371`) — no delay mechanism; an actor added mid-round
  gets no slot until the next round. Called a design question, not a rules defect.

## Other known drift

- CLAUDE.md "What is NOT yet implemented" (`:1016`) is stale: Full Defense is largely wired
  and now clears at the turn boundary (`30bab18`); vehicle sheets exist.
- `sr3e-odm-cyberdecks` / `sr3e-odm-programs` are undeclared and their directories are gone.
  Blocks all Orthodox Matrix work. Populate macros survive.
- Code TODOs: `SR3EICSheetOrthodox.js:70` (drag-drop host link),
  `SR3EHostSheetOrthodox.js:83` (notes enrichment, IC assignment drag-drop).
- The Matrix sourcebook (`mat`) is deliberately unregistered because nothing existed to carry
  it — but the generator has **112 `mat` gear entries**, so that condition is now met.
  Not yet a task.

## 11. Restore the sr3e-macros pack (and the character importer's delivery)

**Never archived.** `f457d3c` dropped `medical`, `odm-cyberdecks`, `odm-programs` and
`macros` together because each **shipped empty**, waiting on a populate macro never run.
Verified: no Macro-type documents in `archive/non-sr3-content/`; the pack tree at
`f457d3c^` held only LevelDB scaffolding. Nothing to restore *from* — re-declare and
re-populate.

1. Declare `sr3e-macros` in `system.json` (type `Macro`, **no** book flag — system content
   like `sr3e-skills`). Fold under Reference.
2. **Full Foundry restart** — manifest changes are not hot-reloaded.
3. Run `scripts/macros/populate-macros.js`.

**This is a regression, not a tidy-up.** `populate-macros.js` registers exactly one macro —
*"Import Nullsheen 3e Character json"* → `import-sr3-character.js` — so the character
importer currently has **no delivery mechanism to users**, despite being one of only three
macros in the repo that still works. The macro body is fetched from the served system path
at run time, so nothing is duplicated into the pack.

**Related:** `sr3e-medical` was dropped in the same commit for the same reason — same
three-step fix. That makes `populate-medical.js` blocked-not-dead in §1, not deletable.
`sr3e-odm-*` are the third and fourth cases, already tracked.

**Open:** raised as "the macros from Mr. Johnson's Little Black Book", but no MJLBB-specific
macros were found. `sr3e-mr-johnsons-contacts` still ships and is unaffected.

## 12. Write a committed pack rebuild script and vendor its sources — *keystone; blocks #1*

**The repo cannot currently rebuild its own pack structure.** The book split used throwaway
scratchpad scripts never committed (`3437608`, `39f8946` touched only `system.json`,
`packs/`, `archive/`, tests), so the **`bookPage`-prefix → per-book-pack routing exists
nowhere in git**. The populate macros wouldn't help — they target the old monolithic packs.
This gap predates the retire decision.

**Live risk:** issue #199 is open against `criticalfault/Shadowrun-Character-Generator`. If
they normalise the `Mods` encoding (3-letter `ROD`/`NCT` vs 4-letter `RBOD`), every mapping
assumption breaks with no committed tooling to re-derive from.

**Step 1 — vendor.** `rawdata/` pins `ActiveSkills`, `Armor`, `LanguageSkills`, `MDF-*`,
`ODM-*` but **none** of the generator JSON the 11 v2 macros fetch live (Cyberware, Bioware,
Firearms, Spells, Vehicles, Drones, AdeptPowers, Programs, VehicleMods, VehicleWeapons).
Snapshot them (suggest `SRCG-` prefix). Upstream change then = reviewable diff.

**Step 2 — the script.** `read vendored JSON → map → route by bookPage → per-book packs`.

- *Map*: recover field translations from the v2 macros **before deleting them** —
  `EssCost`→`essenceCost`, the `(CategoryCode)` suffix parse, weapon-category→skill,
  damage codes, art. The 82 shipped packs are worked examples to verify against.
- *Route*: prefix → book code → `packs/sr3e-<code>-<type>`. 32 codes known (§9); handle
  `sta2`/`sota2` and the slash in `n/sl`.
- *Write*: `fvtt package`, not in-Foundry macros. This is what actually performed the split.
- Emit the `system.json` declaration + `SOURCE_BOOKS` entry per new book, or it ships
  permanently visible.

**Unblocks:** #8 (the `Mods` parse is this script's map stage) · #9 (book restoration is
this script pointed at `archive/`) · #1 (macros safely deletable once mapping is preserved).

⚠ **Harvest the 7 inline-data macros as part of this.** `populate-cyberware.js`'s 61 bonus
definitions and Move-by-Wire block, `populate-mr-johnsons-contacts.js`'s 2,116 lines — no
rebuild script recovers that from upstream.

⚠ Rewrite CLAUDE.md's "Compendium population — correct pattern" when this lands. It
documents a workflow by which no pack in this repo was actually built.

---

## Parked for a longer discussion: ODM-* and MDF-*

Flagged 2026-08-04 as needing a proper design conversation, not a task yet. State as
established this session, so the discussion starts warm:

**Three distinct Matrix things — conflating them is the easy mistake.**

| | What | Source |
|---|---|---|
| `sr3` | Core rulebook Ch. 8 — "Orthodox" | `rawdata/ODM-*` |
| `mat` | The Matrix sourcebook | **unregistered**; 112 gear entries exist in the generator |
| `matrix-defragged` | Community ruleset | `rawdata/MDF-*` |

**Mutually exclusive at runtime** via the `matrixRuleset` world setting (`'defragged'`
default / `'orthodox'`), which needs a full restart. It swaps sheet classes —
`SR3EHostSheet`/`SR3EICSheet` vs `SR3EHostSheetOrthodox`/`SR3EICSheetOrthodox` — and changes
how the character sheet's Matrix tab renders. `SR3EAgentSheet` is MDF-only.

**Asymmetry is the thing to discuss:**

- **MDF ships and works.** 5 packs (`sr3e-mdf-{agents,cyberdecks,hosts,ic,programs}`), book
  code `matrix-defragged`, enabled by default.
- **ODM is unshippable.** `sr3e-odm-cyberdecks` / `sr3e-odm-programs` are undeclared and
  their directories are gone. Every Orthodox picker has nothing to read. Its populate macros
  survive and read **local `rawdata/`**, so they are self-contained and would work the moment
  the packs are re-declared — unlike the v2 macros, they need no network and no book routing.
- `rawdata/MDF-*` (5 files) have **0** references from `scripts/`; `ODM-Cyberdeck.json` and
  `ODM-Programs.json` have 1 each (their populate macros).

**Questions worth settling:** is Orthodox actually wanted, or is MDF the only supported path?
If wanted, does it become a book-flagged pack pair like everything else, or stay a
ruleset-switched special case? And does `mat` get registered now that content exists to carry
it (CLAUDE.md documents the decision not to, on the grounds nothing existed — that condition
no longer holds).
