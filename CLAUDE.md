# CLAUDE.md — Shadowrun 3rd Edition Foundry VTT System

Read this fully before touching code. **Subsystem rules live in `.claude/rules/*.md`** (index below) and load
automatically when you touch their files — but `SR3EActor.js`, `SR3EItem.js`, `sr3e.js`, `config.js` and the
actor sheet touch everything, so **read the matching rules file yourself before changing a subsystem there.** Older citations of
"CLAUDE.md, *Some section*" (code comments, TODOs, audits) now mean that heading in `.claude/rules/`.

---

## What this is

An unofficial Foundry VTT **v14** system for **Shadowrun 3rd Edition** (`system.json` compatibility "14";
developed against build **14.365.0**). Built with **ApplicationV2** — zero Handlebars; all sheet HTML is
JavaScript template literals.

## Testing — read `TESTING.md` before saying a check "needs the maintainer"

**Every change gets tests** (the maintainer's standing rule): a unit test for a rule, a source-level check for
sheet/dialog code that can't be imported without Foundry, a mutant in `tests/mutants.mjs` for a rules bug that
shipped, and a step in the branch's Foundry checklist for anything only a live client can show.

**The agent CAN test in a live Foundry.** The in-app Browser pane reaches `http://localhost:30000`; world
`test-shadowrun` is a **test world** with passwordless users (join as **mcp-api** or **Player2/3** — the
maintainer holds Gamemaster), and `javascript_tool` drives `game.sr3e.*`. Full steps are in **`TESTING.md`**,
*Agent-driven live checks*.

**Simulated combat — a GM and two players — is `npx playwright test`** (Player2 attacks, Player3 defends,
mcp-api is GM). Release those seats first. TESTING.md → *Simulated combat*.

```bash
node tests/run.mjs      # unit + source-level suites (no Foundry)
node tests/mutate.mjs   # every mutant must be killed
npm run test:e2e        # Playwright, two real clients (Foundry running)
```

## Versions and branches — the maintainer's rules

- **`major.minor.patch`.** Bug fix → **patch**; new feature → **minor**; **1.0.0** ("feature complete") is the maintainer's call.
- **Features on a branch; only bug fixes on `main`.** A reported defect is a fix; a request is a feature, even
  in the same message — split them.
- A migration needs `system.json` bumped in the same commit (see *World migrations*).
- Never `git push` unless asked — the maintainer publishes.
- **Every version bump: check the code's rules against `guides/`** (TODO 121). ⚠ **The PDFs are the source**,
  not the guide and not the code. Every difference is verified against the PDF (quoted, printed page) and/or
  taken to the maintainer — never settled by picking a side. A verified code divergence is fixed before release.

## Verifying a build — `npm run preflight`

One command, one verdict (also the `verify-build` skill, `.claude/skills/verify-build/SKILL.md`).

```bash
npm run preflight                          # eslint, suites, mutants, TODO, packs, manifest, guides
npm run preflight -- --fast                # skip mutants, guides, e2e
npm run preflight -- --e2e                 # …and Playwright — Foundry must be RUNNING
npm run preflight -- --version v0.6.0 --e2e   # …and version, release:check, notes, rules record, clean tree
```

⚠ **It changes NOTHING** (`tests/preflight.test.mjs` asserts it only reads files and runs `git status
--porcelain`). The writers are separate:

```bash
npm run version:bump -- 0.6.0     # or: patch / minor (no `major` keyword, deliberately)
npm run release:notes -- 0.6.0 --write
```

- ⚠ `bump-version.mjs` rewrites **one line** — never round-trip `system.json` through `JSON.parse`/`stringify`
  (it reformats ~1900 lines of pack declarations).
- ⚠ `release-notes.mjs` produces a **draft** from commit subjects. Notes are for a GM: any change to how a rule
  resolves is stated plainly **with its book and printed page**.
- ⚠ `npm run lint` must stay green. Fix lint at the source (scoped disables with a reason), never repo-wide.

### ⚠ The one gate that must never be faked — TODO 121
`--version` checks that **`audit/rules-check-<version>.md` exists** — meaning a person compared the rules against
`guides/` with the PDFs as authority and took every difference to the maintainer. **If it's missing, say so and
stop — never write the file to make the gate green.** Both `tools/preflight.mjs` and the skill say this, and
`tests/preflight.test.mjs` asserts they still do.

## Releases — a tag builds the zip and the guides  · TODO 127

```bash
npm run release:check -- v0.6.0   # tag matches system.json, every loaded path ships — changes nothing
npm run release:stage -- v0.6.0   # stage into dist/ (ignored) to inspect
git tag v0.6.0 && git push origin v0.6.0   # the maintainer's — the release itself
```

A pushed `v*.*.*` tag runs `.github/workflows/release.yml`:
- **The system** — `tools/release.mjs` stages `RELEASE_FILES` (`system.json scripts styles lang packs LICENSE
  README.md`) and stamps the copy's URLs (`tools/lib/manifest-urls.mjs`): `download` pinned to the tag,
  `manifest` at `releases/latest`. A specific version installs from `…/releases/download/v0.6.0/system.json`.
- **The guides** (`guides/`, Jekyll) build to **gh-pages** as `v0.6.0/` (frozen) and `latest/`;
  `tools/guides-versions.mjs` rewrites the index and root redirect.
- ⚠ It **refuses a tag that doesn't match `system.json`** — bump first.
- ⚠ A new top-level folder the system loads must be added to `RELEASE_FILES` (`tests/release.test.mjs`).
- ⚠ The committed `system.json` names a **branch** (below); never commit release URLs.
- Guide pages: edit in `guides/` (its own CLAUDE.md has the rules); preview `bundle exec jekyll serve` there,
  then `node tools/linkcheck.mjs`.

## TODOs — `TODO.md` is open work, `TODO-DONE.md` the record

- `TODO.md` holds only open items under `###` group headings; finished ones live in `TODO-DONE.md`, in number order.
- **Numbers are permanent** — cited by code, tests and commits. Never reuse or renumber; new items take the next number.
- **Finishing:** put ✅ in the heading with the closing commit, then `npm run todo:archive` (moves it, rewrites
  links, regenerates the Contents table — **never edit that table by hand**). `npm run todo:check` is read-only.
- Done means ✅ in the heading. A remainder ("still open") must become a new numbered item.
- `tests/todo-archive.test.mjs` enforces all of this.

## Branch manifest URLs — `npm run manifest:branch`

`system.json`'s `url` / `manifest` / `download` name a **branch**, so a playtest branch must point at itself.

```bash
npm run manifest:branch          # stamp to the current branch (once per branch you push out; commit it)
npm run manifest:check           # exit 1 if stale — changes nothing
```

`tools/manifest-branch.mjs` rewrites three lines (never the parsed document) and reads the repo slug from the
existing `url`.

- ⚠ **Merging into main must not drag a branch's URLs along** — `.githooks/post-merge` re-stamps to the current
  branch after any merge and leaves the file dirty with a notice (it never commits: a fast-forward has no commit to
  amend). A `.gitattributes` merge driver **doesn't work** here: git only runs it when both sides changed the file.
- `.githooks/post-checkout` only warns.
- **Hooks need one-time setup**: `npm run setup:hooks` (`core.hooksPath` is local config). `.gitattributes`
  pins `.githooks/**` to `eol=lf` — CRLF breaks the shebang silently.

## Design ethos — read this first

- **Minimal guardrails.** The GM is trusted; players are adults. The system presents information and dice; humans decide.
- **No automation of outcomes.** Damage is never applied automatically; the system announces and the GM clicks wound boxes.
- **All stats are manually editable.** Houserules and edge cases must never fight the system.
- **No jQuery.** Native DOM only (`querySelector`, `addEventListener`). Never `.find()`, `.val()`, `.on()`.
- **No Handlebars.** Markup lives in `_renderHTML()` as template literals.
- **Warn, never refuse; offer, never apply** — the pattern every flow below follows.

---

## Foundry v14 API patterns — critical knowledge

### Dialogs
Always `DialogV2`, never `Dialog`. To wait for input use `DialogV2.wait()`, not `.render(true)` (doesn't block).

```js
let result = null;
await foundry.applications.api.DialogV2.wait({
  window: { title: 'My Dialog' },
  content: `<input type="number" id="my-input" value="4"/>`,
  buttons: [
    {
      label: 'Confirm', action: 'confirm', default: true,
      callback: (_e, _b, dialog) => { result = parseInt(dialog.element.querySelector('#my-input')?.value); }
    },
    { label: 'Cancel', action: 'cancel' },
  ],
  // Per-dialog DOM wiring — live filters, row clicks, live TN recomputation.
  render: (_event, dialog) => wireDialog(dialog, dialog.element),
});
```

- **Wire interactive dialogs through `wait()`'s `render` option** (`dialog.mjs:420-422` in 14.365.0 adds it as a
  render listener). **Never `Hooks.on('renderDialogV2', …)`** — it's global, so two dialogs in flight cross-wire.
  `tests/dialog-wiring.test.mjs` fails on the hook and on a `const wireX` no `render` option calls. Shape:
  `const wireDialog = (app, html) => { … }`.
- `wait` defaults `rejectClose: false`: Esc/✕ **resolves**. Hold the result in a variable only Confirm assigns.
- In filter inputs, `preventDefault()` on Enter so it doesn't trigger the default button.
- Never inline `oninput=`/`onclick=` with `document.querySelector` — wire through the element.

### Compendium packs — how they are ACTUALLY changed

| | |
|---|---|
| **`packs-src/<pack>/`** | **The source of truth.** One JSON file per document, `{ _key, doc, embedded }` (exact LevelDB key and value; an actor's items in its file). `tools/lib/pack-source.mjs`. |
| **`packs/<pack>/`** (LevelDB) | **Build output**, committed because Foundry installs from the branch zip. `npm run packs:build` compiles changed packs. |
| The install | `npm run packs:install` — one-way copy from `packs-src` (Foundry CLOSED). Never link the install to the checkout. |
| Upstream data | Vendored `rawdata/SRCG-*` (`rawdata/SRCG-README.md`); `tools/build-default-gear.mjs` and `tools/build-odm-packs.mjs` generate from it. |

- ⚠ **Pack merge conflict**: merge the JSON in `packs-src/`, then `npm run packs:build` — never hand-pick LevelDB files.
- ⚠ Tools that write LevelDB refresh `packs-src` themselves (`extractPack`); any other writer must be followed by
  `npm run packs:extract`. `tests/pack-sources.test.mjs` fails on drift and proves the build reproduces every
  pack. `npm run packs:src:check` is the read-only comparison.
- `tests/macros.test.mjs` fails if anything names a deleted `populate-*.js` macro.

**Editing a pack with a tool** — read `tools/check-packs.mjs`, `tools/patch-johnson-stats.mjs`,
`tools/import-johnson-gear.mjs` first.

```js
import { ClassicLevel } from 'classic-level';
const db = new ClassicLevel(packPath, { valueEncoding: 'json' });
await db.open();                       // throws if Foundry holds the lock
for await (const [key, doc] of db.iterator()) { /* … */ }
await db.put(key, doc);
await db.close();
```

- ⚠ **Foundry must be CLOSED even to READ** (one process per LevelDB). Report a lock as "close Foundry".
- ⚠ **Reading the checkout's packs must go through a copy** (`tools/lib/pack-copy.mjs`) — opening a LevelDB
  rewrites its log/MANIFEST even for a read. `tests/pack-churn.test.mjs` enforces it.
- ⚠ **Two copies of every pack; Foundry reads the install's.** `scripts/`, `styles/`, `lang/` are junctions into
  the checkout; `packs/` and `system.json` are NOT (`npm run sync:install` never copies packs). **Run every pack
  tool twice** — plain and `--install`.
- ⚠ **Index against the REPO's packs, never the install's** (it carries 22 undeclared pre-split packs; UUIDs into
  them are dead for everyone else). **Diff the two copies afterwards.**
- ⚠ **Keys are structural**: `!items!<id>` · `!actors!<id>` · `!actors.items!<actorId>.<itemId>` · `!folders!<id>`.
  An embedded item needs its own key **and** its id in the actor's `items` array. Sweeps must cover Actor packs too.
- ⚠ **Derive ids, never randomise** (`idFor()` in `patch-johnson-stats.mjs`) — re-runs must reuse keys.
- ⚠ Verify with `npm run packs:check:repo`.

**In-Foundry creation (reference only — not how packs are maintained):** `Item.createDocuments(items, { pack })`
imports 0 items; the working call is a temporary world document + `pack.importDocument(tmp)` + `tmp.delete()`
inside `pack.configure({ locked: false/true })` (`Actor.create` for actor packs). Such documents carry full
scaffolding (`_stats`, `ownership`, `sort`, `folder`) — the signature `check-packs.mjs` uses to spot install drift.

### Pack integrity — `npm run packs:check`

```bash
npm run packs:check                     # the local install
npm run packs:check:repo                # this checkout's packs/
node tools/check-packs.mjs <path>       # any other install
npm run packs:fix                       # remove SAFE duplicates only
```

Read-only by default; exits 1 on a fault. Checks null/missing `_id`s, key/`_id` disagreement, duplicate `_id`s,
manifest packs missing on disk. Undeclared packs on disk are information. Also reports (information) blank/`???`
`system.bookPage` and pages naming another book — one reader, `scripts/data/book-page.mjs` (`BookPage.*`,
`CODE_ALIASES` maps upstream `sta2` → `sota2`); pages filled from `tools/data/book-pages.json` by
`tools/fill-book-pages.mjs`; `tests/book-page.test.mjs` ratchets the missing count.
- Malformed `!items!null` records are **install drift** (from running macros against a live install), not repo faults.
- ⚠ **`--fix` deletes only what it can PROVE redundant**: a malformed record with a byte-identical properly-keyed
  twin in the same pack, comparing without `prototypeToken`/scaffolding, against **any** identical twin (names repeat).

### World migrations — `scripts/SR3EMigrations.js`

⚠ **Foundry EMBEDS items, it doesn't link them** — a pack fix changes nothing for owned copies. So a pack
correction needs **both** the pack change and a migration.
- **Adding one:** append to `MIGRATIONS` with the introducing version and **bump `system.json` in the same
  commit** — a migration numbered above the stamped version re-runs every load (`tests/migrations.test.mjs`).
- **Fill blanks, never overwrite** (`_fillBlank`; `0` and `''` count as unset, so target specific items).
  Overwriting hooks (`fixItem`, `fixActor`) must argue their case at the call site.
- **Idempotent.** A failed run leaves the stamp so the next load retries.
- ⚠ **Three populations**: world actors, world items, and **unlinked token actors on every scene**.
- Compendium packs are **not** migrated (fix the pack file).
- Changed **setting defaults** go in `SR3EMigrations.DEFAULT_CHANGES` (Foundry stores only set values).
- Gated to `game.users.activeGM`. `game.sr3e.SR3EMigrations.force()` re-runs everything (safe by rule 1).

### Filtering actors for dialog dropdowns

| Question | Rule |
|---|---|
| No templates — **always** | `game.sr3e.isLiveActor(a)` — never a bare `getFlag('isTemplate')` |
| About what is happening NOW (a blast, a target, a medic)? | `game.sr3e.sceneFirst(list)` (`scripts/data/actor-scope.mjs`) — scene tokens, else everyone |
| The party only? | `game.sr3e.SR3EQuery.isPlayerCharacter(a)` |

```js
const actorOpts = game.sr3e.sceneFirst(game.actors
  .filter(a => (a.type === 'character' || a.type === 'npc') && game.sr3e.isLiveActor(a)))
  .map(a => `<option value="${a.id}">${a.name}</option>`)
  .join('');
```

Rosters (pilot, passengers, agent operator, chase, healing patient) stay world-wide on purpose.
⚠ `tests/actor-lists.test.mjs` ratchets every `game.actors` list — use `isLiveActor` or name it there with a
reason. The template flag is set by `preCreateActor` in `sr3e.js` whenever `_stats.compendiumSource` is set.

### ApplicationV2 sheet form handling — critical

Every sheet **must** declare `tag: 'form'` and `form.submitOnChange: true`, or edits are silently lost:

```js
static DEFAULT_OPTIONS = {
  tag: 'form',
  form: { submitOnChange: true, closeOnSubmit: false },
  // … classes, position, actions
};
```

- The application element **is** the `<form>` — never wrap content in `<form>`; use `<div class="sr3e-inner">`.
- `DocumentSheetV2`'s built-in submit calls `document.update()`; no custom handler needed.
- `_activateListeners` does **not** exist on these classes. Post-render wiring goes in `_onRender(context, options)`.

### Chat message hooks
Use `renderChatMessageHTML` (native `HTMLElement`), never the deprecated `renderChatMessage`.

### One-shot button guard — critical for all action buttons

`renderChatMessageHTML` fires for **both** the pop-up notification and the chat log, so a button can be clicked
twice. Every action button uses the module-scoped `_usedButtons` Set in `sr3e.js`, keyed `messageId|class|index`:

```js
Hooks.on('renderChatMessageHTML', (message, html, _data) => {
  const mid = message.id;
  html.querySelectorAll('.my-btn').forEach((btn, i) => {
    if (!_checkBtn(btn, mid, 'mybtn', i)) return;   // disable if already used
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      if (!_claimBtn(btn, mid, 'mybtn', i)) return;  // bail if race-clicked
      // handle click
    });
  });
});
```

`idx` disambiguates several same-class buttons on one card. The Set resets on reload, intentionally.

⚠ **Every chat-card button must ALSO be permission-gated at render time** — the guards stop double clicks, not
wrong-person clicks. Helpers in `sr3e.js`: `_mine(p)` (any owner or GM — for buttons that post onward),
`_isDecider(p)` (exactly one user — for buttons that **roll**), `_mineId(id)` / `_isDeciderId(id)`,
`_mineAny(...ids)`, `_payload(btn)`, `_denyBtn(btn, why)`.
⚠ `_payloadActorId` resolves only `actorId → icActorId → vehicleActorId → wardActorId → targetActorId`; any other
key (`deckerActorId`, `conjurerActorId`, `passengerActorId`, `targetVehicleId`, `defenderActorId`, `atkActorId`,
`intruderRiggerId`) **fails closed to GM-only** unless passed explicitly. `attackerActorId` is excluded on purpose.

### Actor system data — most important gotcha

`prepareDerivedData` must initialise fields **in place**:

```js
// WRONG — disconnected object, writes are lost
const attr = sys.attributes ?? {};
// CORRECT
if (!sys.attributes) sys.attributes = {};
const attr = sys.attributes;
```

### Cross-module references
`SR3EActor` ↔ `SR3EItem` would be circular. Register classes on `game.sr3e` in `sr3e.js` and reference them at
runtime (`game.sr3e.SR3EActor.someStaticMethod(ctx)`).

### Data models — no template.json
Defaults are `TypeDataModel` subclasses in `scripts/data/` (`ActorDataModels.js`, `ItemDataModels.js`); never
recreate `template.json`. A new persisted field: add it to the model; declare a new type in `system.json` →
`documentTypes`; guard reads with `?? default` for existing documents; **full Foundry restart** (not F5).
TypeDataModels **drop undeclared keys**.

```js
static defineSchema() {
  const { StringField, NumberField } = foundry.data.fields;
  return {
    myField: new StringField({ initial: '' }),
    myNumber: new NumberField({ integer: true, initial: 0, min: 0 }),
  };
}
```

### Foundry integrations
- **Token bars**: `preCreateActor` defaults character/npc tokens to `bar1=wounds.physical`, `bar2=wounds.stun`,
  `OWNER_HOVER` (new actors only).
- **Status effects**: `sr3e-sustaining/-fulldefense/-dumpshock/-astral/-dual/-vr` appended to
  `CONFIG.statusEffects`. The `updateActor` hook (active GM only) toggles them from `astralMode`,
  `matrixUserMode`, `fullDefense`, `sustainedSpells`, and marks **defeated/unconscious** when a track is full,
  **dead** when physical is full and overflow ≥ Body. Reversible.
- **Drops** (TODO 97): items ride core `ActorSheetV2` handling; `SR3EActorSheet._onDrop`/`_onDropDocument` warn on
  damaged pack entries; `_onDropActor` deploys/links a vehicle via `sr3e.actor.create` / `sr3e.vehicle.link`,
  taking the id from the drag data's uuid.
- **Enrichers**: Biography/Notes render enriched (`_bioField`, `_enrichBioFields` in `_onRender`) with an ✎ Edit toggle.

---

## File structure

```
system.json                ← manifest + documentTypes
lang/en.json · styles/sr3e.css (all styles, CSS custom properties)
guides/                    ← the SR3 Table Reference site (Jekyll) — NOT shipped in the zip
packs/ · packs-src/        ← 102 compendium packs (build output · source of truth)
archive/non-sr3-content/   ← documents split out of the packs, held for future modules
rawdata/                   ← source data, not loaded by Foundry (ODM-* = Orthodox SR3 Matrix; MDF-* = Matrix
                             Defragged — never touch MDF files for Orthodox work, or vice versa)
.claude/rules/             ← subsystem rules, path-scoped (index below)
scripts/
  sr3e.js                  ← entry: models, classes, hooks, chat button handlers
  config.js                ← SR3E constants and registries
  SR3E*.js                 ← feature modules (MIJI, Healing, Drugs, Purchase, Stress, VehicleChase, Clocks, …)
  data/                    ← TypeDataModels + pure rule modules (*.mjs — testable without Foundry)
  documents/               ← SR3EActor, SR3EItem, SR3ECombat, SR3ESpiritSummoning, SR3EWard
  sheets/                  ← ApplicationV2 sheets (actor, item, vehicle, host/IC ×2 rulesets, agent, ward)
  macros/                  ← world Macro bodies (importer, chrome threat, contacts data parsed by tools)
```

**Put rules in a pure module under `scripts/data/`** (or a static on `SR3EActor`) — sheets can't be imported
without Foundry, so nothing on them can be unit-tested or mutated.

---

## SR3 rules — citations, and where each subsystem's rules live

> **Citation convention.** Rules carry their source as *· SR3 p.NN* — the **printed** page of the core rulebook.
> `Shadowrun 3e - Core Rules {FAN25000}.pdf`: **PDF page = book page + 2**. The maintainer's library (32 books,
> `C:\Users\lance\Documents\Shadowrun 3rd Edition PDFs`) has a real text layer: `pdftotext -layout -f N -l N`,
> no OCR. Two-column pages merge columns per line — crop with `-x 0 -W 308` then `-x 308 -W 320` (mediabox
> ~616×795pt). Verify stats and pages there rather than guessing.
>
> **🔴 DIVERGES FROM RAW** marks a rule implemented differently from the book, with the book's wording and the
> tracking TODO. Delete the marker only when the code is fixed — and check the book, not the doc.
> Sections with no citation are **not audited**; absence of a flag is not evidence of correctness.
>
> **Audited so far:** Rule of Six/One · Defaulting · Damage staging · Combat Pool · pool refresh · initiative −10 ·
> dodge resolution · Spell Pool · astral Initiative · all 117 adept powers (`audit/adept-powers-audit.md`) · every
> lookup table (`tests/tables.test.mjs`) · Matrix Defragged v2 (`audit/matrix-defragged-audit.md`).

| Rules file (`.claude/rules/`) | Covers |
|---|---|
| `dice-and-defaulting.md` | Rule of Six/One, 💥 explosions, opposed ⏳ cards, `rollOpposedPair`/`rollThen`, Default Table |
| `initiative-and-vehicles.md` | Initiative modes & formulas, action ledger, Ready Weapon, hands, gyro, GM tools, Driving/Crash Test, chases |
| `ranged-combat.md` | Ranged flow, GM TN window, visibility, dodge (TN + resolution), armour & layering, fire modes, recoil, shotguns, ammunition, range, canvas attacks, grenades/AoE |
| `melee-combat.md` | Melee flow, GM melee window, reach, tie to attacker, Full Defense, Charging |
| `combat-resolution.md` | Damage staging (past Deadly), called shots, knockdown, Combat Pool refresh |
| `magic.md` | Astral state, sustained spells, Spell Pool, spellcasting, elemental spells, Drain, Spell Defense, conjuring |
| `adept-powers.md` | Power channels, Attribute Boost, Improved Ability/Reflexes, Missile Parry, Quick Strike, direct-effect powers |
| `essence-and-cyberware.md` | Essence & the Essence hole, cyberzombies, `Mods` parsing, skill bonus channels, triggered ware, Stress, cybersystem damage, item ratings, grades, move-by-wire, attribute sources |
| `karma-and-economy.md` | Karma award/spend, the ledger, buying gear, encumbrance |
| `drugs-and-healing.md` | Drugs (addiction, tolerance, effects), guided healing |
| `matrix.md` | The two Matrix rulesets, Orthodox fields/packs, Matrix Defragged rules, IC, host sheet |
| `electronic-warfare.md` | Flux/Footprint/ECM/ECCM, Signal Monitor, MIJI, infiltration, Drone Comprehension, IVIS |
| `source-books.md` | Book codes, pack filtering, default-book gear, the archive, the `mat` decision |

---

## Actor data model

### Key system fields (character/npc)
```
system.attributes.<attr>.base / .value     ← body quickness strength intelligence willpower charisma magic
system.attributes.reaction.value / .reactionBonus / .diceBonus / .override
system.attributes.essence.value     ← DERIVED (see essence-and-cyberware.md)
system.attributes.essence.base      ← persisted starting Essence (6)
system.attributes.essence.lost      ← persisted PERMANENT loss, nullable; accumulates on install
system.wounds.stun / .physical      ← { value, max }
system.woundMod                     ← derived (negative)
system.derived.combatPool / .availableCombatPool
system.derived.spellPool / .availableSpellPool   ← null if not Awakened
system.derived.initiative / .initiativeDice
system.combatPoolSpent / .spellPoolSpent          ← persisted pool usage
system.equippedArmor / .equippedMelee             ← item ID strings (armour now uses the item `worn` flag)
system.karma / .totalKarma / .karmaPool / .ledger
system.astralMode                  ← '' | 'physical' | 'dual' | 'astral'
system.matrixUserMode              ← '' | 'TRM' | 'AR' | 'VR-Cold' | 'VR-Hot'
system.recoilCompensation / .roundsFiredThisPhase / .targetsThisPhase
```

### Item types and key fields
- `firearm`: `damage` ("9M"), `category` (weapon code), `mode` ("SA/BF/FA"), `ammunition` (capacity "15(c)"),
  `recoilMod`, `smartgun`/`laserSight` (nullable), `rangeOverride` ("5/15/30/50"), `loadedAmmoType`/`loadedRounds`,
  `ready`, `hands`, `choke`
- `melee`: `damage`, `reach`, `category`
- `projectile` / `thrown`: `damage`, `category`, `quantity` (thrown consume it; bows/crossbows nock via `loadedAmmoType`/`loadedRounds`)
- `ammunition`: `ammoType` (key into `SR3E.ammoTypes`), `loadMechanism`, `rounds`/`reloads`/`roundsPerReload`/`countedIn` — rules live in config
- `armor`: `ballistic`, `impact`, `worn`
- `skill`: `rating`, `linkedAttribute`, `specialisations` (`level` = bonus over base)
- `spell`: `force` (learned Force, nullable — caps the cast; SR3 p.178), `type` (Mana/Physical — **damage track
  only**), `target` (**resist attribute AND cast TN**, via `SR3EItem._parseSpellTarget`), `category` (Combat or
  Elemental = damaging; Elemental resolves as a ranged attack), `drain` ("(DL+1)"), `range` (`(A)` = area),
  `duration`. **No damage code** — Power = Force, level chosen at cast.
- `drug`: `addiction` ("4M+3P"), `tolerance`, `edge` ("5/50"; legacy `effect`), `fixFactor`, `damage`, `speed`,
  `vector`, `legality`, `availability`, `cost`, `streetIndex`, `bookPage`
- gear/cyberware/bioware/medical: `rating` — read only through `itemRating()` (see essence-and-cyberware.md)

### Weapon category codes → skills
```
HOPist/LPist/MPist/HPist/VHP → Pistols
MaPist/SMG → SMG
Carb/AsRf/SptR/Snip/LCarb → Rifles
LMG/MMG/HMG/MinG → LMG
ShtG → Shotguns
GrLn → Grenade Launchers
EDG → Edged Weapons
CLB → Clubs
POL → Pole Arms/Staff
WHP → Whips/Flails
CYB/UNA → Unarmed Combat
```

---

## Key methods reference

### SR3EActor
- `rollPool(pool, tn, label, options)` — entry point for skill/attribute rolls (adds wound, sustaining/drugs, signal mods unless skipped)
- `_rollWave(count, tn, isFirstWave, prevDice, explodeIdx)` — one wave; **only the 💥 handler may call it with `false`**
- `_postWaveCard(state)` — posts a wave card; final-wave branches for every flow
- `handleExplosionClick(payloadJson)` — static, 💥 buttons
- `rollOpposedPair(kind, ctx, atk, def)` / `rollThen(actor, pool, tn, {label, followUp})` — static, explosion-safe sequencing
- `spendCombatPool(amount)` etc. — route through `sr3e.pool.spend`; **return what was actually deducted**
- `_postSoakCard(payload)` / `postSoakCard(actorId, payload)` / `handleSoakRollClick(btn)`
- `postMeleeCard(ctx)` / `handleMeleeRoll(btn)` — melee boxing card
- `_rollDodge(targetActor, dodgeDice, dodgeContext)` — static
- `rollInitiative(options)` — `options.physicalDice` prompts for manual entry

### SR3EItem
- `rollWeapon(tn, options)` — ranged attack flow
- `rollMelee()` → `rollMeleeAttack(actor, atkWeapon)` — static, shared for real items and the synthetic `_unarmedWeapon()`
- `_buildMeleePoolInfo(actor, weapon)` — unarmed uses the **highest** of Unarmed Combat and every `MA:` skill
- `promptDefaultChoice(actor, opts)` / `defaultTiers(actor, opts)` — the Default Table
- `reload()`, `_promptFireMode`, `_parseLoadMechanism`, `_parseMagazineSize`, `_promptReloadChoice`
- `_getRangeBands`, `_rangeBandForDistance`, `_measureDistance`, `_acquireCanvasTarget`, `_tokensAdjacent`
- `parseDamageCode(code)` → `{ power, level, isStun }`; `stageDamage(base, net, { meleeRules })`
- `_getEquippedMelee(actor)`, `_promptTarget(attacker)`

### SR3ECombat
- `_nextTurnSR3()` / `_nextTurnSR2()` — pass-based / flat-queue advancement
- `_endOfTurnReset()` — pool/recoil/Full Defense refresh each Combat Turn
- `endCombat()` — silently refreshes pools, clears Spell Defense / `tempMagicLoss`

---

## CSS custom properties
```css
--sr-bg, --sr-surface, --sr-card   ← background layers
--sr-border, --sr-border-hi        ← borders
--sr-text, --sr-muted, --sr-dim    ← text colours
--sr-accent                        ← blue, primary interactive colour
--sr-gold                          ← #c8a040, karma/explosion/soak
--sr-green, --sr-green-bg          ← success/dodge success
--sr-red, --sr-red-bg              ← failure/damage/melee
--sr-amber, --sr-amber-bg          ← warnings/defaulting
--r, --r-lg                        ← border radius tokens
```

---

## GM-routed writes and creating documents

Foundry runs authoritative writes on `game.users.activeGM`. Players write other actors through GM query
verbs (`sr3e.actor.set`, `sr3e.pool.spend`, …), queued per actor.

**`sr3e.actor.create`** (TODO 71) — `Actor.create` needs `ACTOR_CREATE`, which base Players lack. The verb
takes a compendium entry, a blank vehicle, or **an existing actor to copy**, and grants the requester `OWNER`;
**`sr3e.vehicle.link`** attaches a vehicle to a driver with ownership. One verb for all creation because the
ownership grant is what gets forgotten (the actor appears, then refuses to roll).
- ⚠ **Delete `_stats` when copying** (it carries `compendiumSource`, which re-flags the copy as a template);
  the flag is also cleared after creation.
- `tests/gm-writes.test.mjs` is a source-level invariant.

### ⚠ A stale GM CLIENT breaks GM-routed fixes invisibly
The active GM is usually a tab open for hours; editing a file doesn't change what it loaded, so a correct fix
silently fails on the one client that executes it. `game.sr3e.loadedAt` records each client's load time; the
read-only query `sr3e.debug.loadedAt` exposes it, and the e2e preflight fails with "reload <user>'s tab"
(including when the GM can't answer at all).

## Two-corner cards — each side edits only its own half

Eight opposed cards (melee · astral · contested · cybercombat · MIJI · three Orthodox Matrix) share **one**
handler in `sr3e.js`, found by `[data-twocorner="<kind>"]` and dispatched via the `_RESOLVERS` table. Each
corner declares `data-corner-role` / `-owner` / `-label`; `SR3EActor.cornerActions()` renders the per-corner
`.sr-corner-submit-btn` and one `.sr-corner-resolve-btn`.

- **Both corners visible everywhere; only your own editable.** The lock sets `readOnly` on inputs **and**
  `disabled` on `<select>`s — keep both branches (`readOnly` does nothing to a dropdown).
- **The submission that completes the set resolves.** `sr3e.card.mark` is append-only and GM-serialised, so
  exactly one client sees the ledger fill.
- **`.sr-corner-resolve-btn` (GM-only) is the AFK escape**: unanswered corners fall to the card's defaults.
- ⚠ **`_cornerDrafts` keeps unsubmitted edits** (keyed `messageId|role`, restored into your own unacted corner):
  the other side's submission re-renders the card from its payload. Don't remove it as redundant.
- **A setup dialog configures ONE side.** The initiator names the opponent only; the opponent's pool source,
  dice and TN live in **their** corner (`SR3EActor.contestedSourceOptions`). `tests/e2e/contested.spec.mjs`
  asserts `#opp-source`/`#opp-pool`/`#opp-tn`/`#opp-damage` are absent from the dialog.
- ⚠ **Charge BOTH corners, not just roll them** — use the pool helpers (they route via `sr3e.pool.spend`, work on
  a non-owning client, and return what was deducted — roll that, not what was typed).

## What is NOT yet implemented

The open work lives in `TODO.md`. Larger gaps: Take Aim across phases and two-gun actions (#48/#49 remainders);
bioware Stress side effects and Stress repair; Legality/permits; the Matrix Condition Monitor on the host sheet;
Overwatch's crash trigger and Trigger Steps (TODO 128).

---

## Known issues / watch out for

- 🔴 **`node --check` is USELESS here — use `npx eslint <file>`.** For an ES module in a `.js` file it exits 0 on
  real syntax errors. `tests/syntax.test.mjs` parses every `scripts/` file with ESLint's parser. Treat any
  "syntax OK" from `node --check` on `scripts/**/*.js` as meaningless.
- **Don't pass `-c core.autocrlf=false` to git.** Line endings are pinned in `.gitattributes` (`* text=auto
  eol=lf`); the override makes git report phantom local changes and refuse merges.
- **`system.json` or data-model changes need a full Foundry restart**; JS/CSS hot-reload.
- TypeDataModel defaults apply only to **new** documents — guard reads with `?? default`.
- `DialogV2.render(true)` doesn't await input — use `DialogV2.wait()`.
- **Explosion payloads must carry every field the final wave reads.** `_postWaveCard` rebuilds roll state into
  the 💥 payload by hand at three sites; a missing field is silently `undefined` and its branch never runs.
  **`tests/explosion-carry.test.mjs`** diffs `state.X` reads against the carry — add a new field to the carry or
  to its `EXEMPT`/`NESTED` maps with a reason. ⚠ Play-testing won't find these: a 6 only explodes at **TN ≥ 7**.
- `renderCombatTracker` fires on every render — guard DOM insertions with a class check
  (`if (!el.querySelector('.sr3e-chase-btn'))`).
