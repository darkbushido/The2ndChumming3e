# CLAUDE.md — Shadowrun 3rd Edition Foundry VTT System

This file gives Claude Code the context it needs to work on this project effectively.
Read it fully before touching any code.

---

## What this is

An unofficial Foundry VTT **v14** system for **Shadowrun 3rd Edition**.
`system.json` declares `compatibility.minimum` / `verified` = **"14"**; developed against build
**14.365.0**. (This file previously said v13 throughout — corrected 2026-08-05.)
Built with **ApplicationV2** — zero Handlebars template files.
All sheet HTML is rendered directly from JavaScript using tagged template literals.

---

## Branch manifest URLs — `npm run manifest:branch`

The three fields at the bottom of `system.json` (`url` / `manifest` / `download`) name a
**branch**. Foundry installs from them, so a playtest branch is only installable if its own copy
points at itself rather than at `main`.

```bash
npm run manifest:branch          # stamp to the current branch
npm run manifest:check           # exit 1 if stale — changes nothing
```

**Run it once when setting up a branch to push out, and commit the change.** After that the branch
is self-consistent and checkouts are clean.

`tools/manifest-branch.mjs` rewrites **three lines**, never the parsed document — round-tripping
`system.json` through `JSON.parse`/`stringify` would reformat ~1900 lines of pack declarations into
one unreviewable diff. The repo slug is read back out of the existing `url` rather than hardcoded,
so a rename or a fork does not keep publishing the old owner's manifest.

### ⚠ Merging a branch into main must NOT drag its URLs along

Handled by **`.githooks/post-merge`**, which re-stamps to the branch you are *on* after any merge.

**A `.gitattributes` merge driver does not work here** — and this is the trap. A custom driver only
runs when git has to merge the file's *content*, i.e. when **both** sides changed it. If `main`
never touched `system.json` since the merge base, git resolves trivially by taking the branch's
version wholesale and never consults the driver. That is the **common** case: the playtest branch
stamps its URLs, main does not. A merge driver would miss precisely the merge it was installed for.

The hook deliberately **does not commit** — a fast-forward merge creates no new commit, so an
automatic `--amend` would rewrite a commit that came from the other branch. It leaves the file
dirty with a loud notice instead.

`.githooks/post-checkout` is **warn-only** by design: stamping there would leave the tree dirty
after every checkout of a branch that was never set up for distribution.

**Hooks need one-time local setup** — `core.hooksPath` lives in `.git/config`, which is not
committed, so a fresh clone has no hooks until:

```bash
npm run setup:hooks
```

`.gitattributes` pins `.githooks/**` to `eol=lf`; with CRLF, `sh` fails on the carriage return in
the shebang and the hooks silently do nothing.

## Design ethos — read this first

- **Minimal guardrails.** The GM is trusted. Players are adults. The system presents the right information and dice but humans make all narrative decisions.
- **No automation of outcomes.** Damage is never applied automatically. The system announces what happened and the GM clicks wound boxes manually.
- **All stats are manually editable.** Edge cases, houserules, and situational modifiers should always be achievable without fighting the system.
- **No jQuery.** This is Foundry v14 — use native DOM throughout (`querySelector`, `addEventListener`, `querySelectorAll`). Never use `.find()`, `.val()`, `.on()`.
- **No Handlebars.** All markup lives in `_renderHTML()` as template literals.

---

## Foundry v14 API patterns — critical knowledge

### Dialogs
Always use `DialogV2`, never the old `Dialog`.
To wait for user input, use `DialogV2.wait()` not `.render(true)` (which doesn't block).

```js
let result = null;
await foundry.applications.api.DialogV2.wait({
  window: { title: 'My Dialog' },
  content: `<input type="number" id="my-input" value="4"/>`,
  buttons: [
    {
      label: 'Confirm',
      action: 'confirm',
      default: true,
      callback: (_e, _b, dialog) => {
        result = parseInt(dialog.element.querySelector('#my-input')?.value);
      }
    },
    { label: 'Cancel', action: 'cancel' },
  ],
});
```

### Interactive dialogs — live filtering and DOM wiring

**Use `DialogV2.wait()`'s `render` option.** It is a per-dialog callback invoked on every
render — the correct place to wire live filters, row-click selection and live TN recomputation.

> ⚠ **This section previously claimed `DialogV2.wait()` does NOT call its `render` option, and
> told you to use the `renderDialogV2` hook instead. That was wrong.** Verified against the
> installed build (`resources/app/client/applications/api/dialog.mjs:405`, Foundry 14.365.0):
> `wait` destructures `render` and, at `:420-422`, does
> `if (typeof render === "function") dialog.addEventListener("render", event => render(event, dialog))`.
> Core's own docs at `:154` say *"you must still use the `render` option to attach listeners"*.
> **~58 sites across 8 files still use the old hook pattern** and should migrate — see the
> dedicated TODO task. Do not add new ones.

```js
await foundry.applications.api.DialogV2.wait({
  window:  { title: 'Pick a thing' },
  content: `...`,
  buttons: [ /* … */ ],

  // Per-dialog, scoped to THIS dialog instance. No hook, no guard, no teardown.
  render: (_event, dialog) => {
    const html        = dialog.element;
    const filterInput = html.querySelector('#my-filter');
    const rows        = html.querySelectorAll('.my-row');

    filterInput.addEventListener('input', () => {
      const q = filterInput.value.toLowerCase();
      rows.forEach(row => { row.style.display = row.dataset.name.includes(q) ? '' : 'none'; });
    });

    // Prevent Enter in filter triggering the default button
    filterInput.addEventListener('keydown', e => { if (e.key === 'Enter') e.preventDefault(); });

    rows.forEach(row => {
      row.addEventListener('click', () => {
        rows.forEach(r => r.style.background = '');
        row.style.background = 'color-mix(in srgb,var(--sr-accent) 20%,transparent)';
        html.querySelector('#my-hidden').value = row.dataset.value;
      });
    });

    filterInput.focus();
  },
});
```

**Why this matters beyond tidiness.** `Hooks.on('renderDialogV2', …)` is global. With two dialogs
of the same kind in flight, both hooks are registered before either renders, so the first dialog
gets wired twice — the second time with the *other* dialog's closure variables — and the second
gets no wiring at all. The symptom is a checkbox that silently stops recomputing. A per-dialog
`render` callback cannot cross-wire.

`DialogV2.wait` also defaults `rejectClose: false` (`dialog.mjs:405`), so dismissing with Esc or ✕
**resolves** rather than throwing. Hold your result in a variable that only the Confirm button's
callback assigns, and both Cancel and dismissal fall through as `null`.

Never use inline `oninput=` / `onclick=` attributes with `document.querySelector` — these
fail in the ApplicationV2 rendering context. Always wire through the hook's `html` reference.

### Compendium population — correct pattern

Do **not** use `Item.createDocuments(items, { pack: pack.collection })` — it imports 0 items.

The correct pattern is: create a temporary world document → import into the pack → delete the temp.
Wrap in a macro script (see `scripts/macros/populate-*.js`):

```js
await pack.configure({ locked: false });
let created = 0;
for (const data of MY_DATA) {
  try {
    const tmp = await Item.create(data, { renderSheet: false });
    await pack.importDocument(tmp);
    await tmp.delete();
    created++;
  } catch (err) {
    console.error(`SR3E | Failed to create "${data.name}":`, err);
  }
}
await pack.configure({ locked: true });
ui.notifications.info(`SR3E: ${created} items added.`);
```

For Actor compendiums use `Actor.create(data, { renderSheet: false })` instead of `Item.create`.

### Filtering actors for dialog dropdowns

Actors imported from compendiums are flagged as templates (`flags.The2ndChumming3e.isTemplate`)
so they don't pollute targeting and selection dialogs. **Always** apply this filter when
building an actor option list:

```js
const actorOpts = game.actors
  .filter(a => (a.type === 'character' || a.type === 'npc') && !a.getFlag('The2ndChumming3e', 'isTemplate'))
  .map(a => `<option value="${a.id}">${a.name}</option>`)
  .join('');
```

Add `|| a.type === 'vehicle'` if vehicles are also valid targets. The flag is set
automatically by the `preCreateActor` hook in `sr3e.js` whenever an actor's
`_stats.compendiumSource` is set.

### ApplicationV2 sheet form handling — critical

Every sheet (ActorSheetV2, ItemSheetV2) **must** declare `tag: 'form'` in `DEFAULT_OPTIONS`
and configure `form.submitOnChange: true`. Without `tag: 'form'`, ApplicationV2 never
wires up its change-to-save pipeline, and form edits are silently lost.

```js
static DEFAULT_OPTIONS = {
  tag: 'form',
  form: {
    submitOnChange: true,
    closeOnSubmit:  false,
  },
  // ... classes, position, actions, etc.
};
```

When `tag: 'form'` is set, the **application element itself** is the `<form>`.
Do **not** wrap `_buildSheet` / `_build` content in a `<form>` tag — that creates illegal
nested forms and breaks the framework. Use `<div class="sr3e-inner">` instead.

`DocumentSheetV2` has a built-in submit handler that calls `document.update()`.
You do **not** need a custom `form.handler` for basic persistence.

`_activateListeners` does **not** exist in the ApplicationV2 / DocumentSheetV2 parent chain — do
not call it. (It *does* exist in v14 on unrelated classes — `game.keyboard`, some custom elements —
so a global grep will find hits. None of them are your sheet's base class.)
Use `_onRender(context, options)` for any post-render DOM wiring (e.g. class-based
click/change listeners that can't use `data-action`). `_onRender` is called by the
framework after every render, so listeners re-attach automatically.

### Chat message hooks
Use `renderChatMessageHTML` not `renderChatMessage` (deprecated in v13).
The `html` argument is a native `HTMLElement`, not jQuery.

```js
Hooks.on('renderChatMessageHTML', (_message, html, _data) => {
  html.querySelectorAll('.my-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      // handle click
    });
  });
});
```

### One-shot button guard — critical for all action buttons

`renderChatMessageHTML` fires for **both** the Foundry pop-up notification and the main
chat log when a message is created. Both DOM instances are live simultaneously, so a
user can click a button in the pop-up and then click the same button again in the chat log,
firing the action twice (double-soak, double-assign, etc.).

The fix is a module-scoped `Set` keyed by `messageId|class|index`. Every action button
must use `_checkBtn` at render time and `_claimBtn` inside the click handler.

```js
// sr3e.js — module scope
const _usedButtons = new Set();

function _checkBtn(btn, mid, cls, idx) {
  if (!_usedButtons.has(`${mid}|${cls}|${idx}`)) return true;
  btn.disabled = true;
  return false;
}

function _claimBtn(btn, mid, cls, idx) {
  const key = `${mid}|${cls}|${idx}`;
  if (_usedButtons.has(key)) { btn.disabled = true; return false; }
  _usedButtons.add(key);
  btn.disabled = true;
  return true;
}

// In the hook — capture message.id, not _message
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

- `_checkBtn` at render time handles chat-log re-renders after a click in the pop-up.
- `_claimBtn` in the handler is the primary guard — JS is single-threaded so check+add
  is atomic; no race condition is possible.
- The `idx` parameter disambiguates when multiple buttons of the same class appear on
  one card (e.g. per-target soak buttons, per-passenger resist buttons).
- The Set is in-memory only and resets on page reload — that is intentional.

### Actor system data — most important gotcha

`prepareDerivedData` must always initialise fields in-place on `sys`, never via `??` fallback:

```js
// WRONG — creates a disconnected object, writes are lost
const attr = sys.attributes ?? {};

// CORRECT — always initialise in place so writes persist
if (!sys.attributes) sys.attributes = {};
const attr = sys.attributes;
```

If you read `this.system` from a button click handler and find attributes missing,
it means `prepareDerivedData` ran but `sys.attributes` was undefined so nothing was written.
Calling `this.prepareDerivedData()` before reading will fix this IF the initialisation is in-place.

### Cross-module references
`SR3EActor` imports `SR3EItem` and vice versa would create a circular dependency.
Break cycles by registering classes on `game.sr3e` in `sr3e.js` and referencing them at runtime:

```js
// sr3e.js
game.sr3e = { SR3E, SR3EActor, SR3EItem };

// SR3EItem.js — reference SR3EActor without importing it
await game.sr3e.SR3EActor.someStaticMethod(ctx);
```

### Data models — no template.json

`template.json` has been removed. Default values for all document types are defined as
`TypeDataModel` subclasses in `scripts/data/`. Do **not** recreate `template.json`.

Adding a new persisted field:
1. Add it to the appropriate model in `ActorDataModels.js` or `ItemDataModels.js`
2. If it's a new Actor/Item type, also declare it in `system.json` → `documentTypes`
3. Guard reads with `?? defaultValue` in `prepareDerivedData` for existing documents
4. **Requires a full Foundry restart** (not just F5) — data model changes are not hot-reloaded

```js
// Example field in a TypeDataModel
static defineSchema() {
  const { StringField, NumberField } = foundry.data.fields;
  return {
    myField: new StringField({ initial: '' }),
    myNumber: new NumberField({ integer: true, initial: 0, min: 0 }),
  };
}
```

---

## File structure

```
sr3e/
├── system.json                       ← Foundry manifest + documentTypes declaration
├── lang/en.json                      ← Localisation strings
├── styles/sr3e.css                   ← All styles, CSS custom properties
├── packs/                            ← 82 compendium packs, `sr3e-<book>-<type>` (see Source books)
├── archive/non-sr3-content/          ← 1,703 documents split out of the packs, held for future modules
│   ├── README.md                     ← ⚠ STALE — predates the SR2 restore; see Source books
│   └── sr3e-<pack>.json              ← one file per ORIGINAL pack: [{ _key, bucket, doc }]
├── rawdata/                          ← Source JSON used to populate compendiums (not loaded by Foundry)
│   ├── ODM-Cyberdeck.json            ← Orthodox SR3 cyberdeck stats     ← USE for orthodox compendiums
│   ├── ODM-Programs.json             ← Orthodox SR3 program list         ← USE for orthodox compendiums
│   ├── ODM-ProgrammingRules.js       ← Orthodox SR3 rules reference      ← USE for orthodox compendiums
│   ├── MDF-cyberdecks.json           ← Matrix Defragged cyberdeck data   ← DO NOT touch for ODM work
│   ├── MDF-matrixprograms.json       ← Matrix Defragged program data     ← DO NOT touch for ODM work
│   ├── MDF-IC.json                   ← Matrix Defragged IC data          ← DO NOT touch for ODM work
│   ├── MDF-program-agents.json       ← Matrix Defragged agent data       ← DO NOT touch for ODM work
│   ├── MDF-program-agents-abilities.json ← MDF agent abilities          ← DO NOT touch for ODM work
│   ├── ActiveSkills.json             ← General skills compendium source
│   └── Armor.json                    ← General armor compendium source
└── scripts/
    ├── sr3e.js                       ← Entry point: registers models, classes, hooks, button handlers
    ├── config.js                     ← SR3E constants
    ├── SR3EVehicleChase.js           ← Chase scene logic
    ├── SR3EMIJI.js                   ← Electronic warfare MIJI contest + IVIS
    ├── SR3EClocks.js                 ← GM Threat Clocks (persisted shared state)
    ├── data/
    │   ├── ActorDataModels.js        ← TypeDataModel subclasses: CharacterData, NpcData, VehicleData
    │   └── ItemDataModels.js         ← TypeDataModel subclasses: all item types
    ├── documents/
    │   ├── SR3EActor.js              ← Actor: derived data, all roll/combat methods
    │   ├── SR3EItem.js               ← Item: skill/weapon/melee roll methods
    │   ├── SR3ECombat.js             ← Combat: SR2/SR3 initiative, endCombat pool refresh
    │   ├── SR3ESpiritSummoning.js    ← Conjuring / summoning flow
    │   └── SR3EWard.js               ← Ward (astral barrier) document logic
    ├── sheets/
    │   ├── SR3EActorSheet.js         ← ApplicationV2 character/NPC actor sheet
    │   ├── SR3EItemSheet.js          ← ApplicationV2 item sheet
    │   ├── SR3EVehicleSheet.js       ← Vehicle sheet
    │   ├── SR3EHostSheet.js          ← Host sheet (Matrix Defragged ruleset)
    │   ├── SR3EHostSheetOrthodox.js  ← Host sheet (Orthodox SR3 ruleset)
    │   ├── SR3EICSheet.js            ← IC sheet (Matrix Defragged)
    │   ├── SR3EICSheetOrthodox.js    ← IC sheet (Orthodox SR3)
    │   ├── SR3EAgentSheet.js         ← Agent sheet (Matrix Defragged)
    │   └── SR3EWardSheet.js          ← Ward (astral barrier) sheet
    └── macros/
        ├── populate-odm-cyberdecks.js ← Populates sr3e-odm-cyberdecks pack (Orthodox SR3)
        ├── populate-odm-programs.js   ← Populates sr3e-odm-programs pack (Orthodox SR3)
        └── populate-drugs.js          ← Populates sr3e-drugs pack
```

### rawdata/ file naming convention

**ODM-\*** = **Orthodox Decking Matrix** (SR3 core book rules, Chapter 8).
These are the source files for the `sr3e-odm-cyberdecks` and `sr3e-odm-programs` compendium packs.
Use only ODM files when working on Orthodox SR3 Matrix features.

**MDF-\*** = **Matrix Defragged** (the alternative Matrix ruleset, a community supplement).
These are the source for `sr3e-mdf-cyberdecks`, `sr3e-mdf-programs`, `sr3e-mdf-ic`, and related packs.
**Do not touch MDF files when working on Orthodox SR3 Matrix features** — they are a completely
separate ruleset with different schemas and different game mechanics.

---

## Source books & compendium filtering

Compendium content is **one pack per source book**, named `sr3e-<book>-<type>`
(`sr3e-mm-cyberware`, `sr3e-r3-vehicles`, …). Each pack declares its origin in `system.json`
as `flags.The2ndChumming3e.book`; packs **without** that flag are system content
(exactly three: `sr3e-skills`, `sr3e-example-characters`, `sr3e-mr-johnsons-contacts`).

**82 packs, 20 books, 3 system packs.** This layout is **Shadowfork's** — `main` still carries
the old monolithic packs (27 of them: one `sr3e-cyberware`, one `sr3e-firearms`, …) with no
book flags and no `archive/`. Don't assume a pack name from `main` exists here.

`SOURCE_BOOKS` in `config.js` is the registry of book codes and which start enabled. The GM
picks which are in play via **Configure Settings → System → Configure Source Books**
(`SR3ESourceBooksConfig`).

Codes come from the **`BookPage` prefix** in the upstream Shadowrun Character Generator's gear
data (`src/data/SR3/*.json` — values like `mm.064`, `sr3.304`, `cb1.29`), so a future re-import
lines up. They are *not* from that repo's `Books.json`, which holds only
`{name, loadByDefault, edition}` and carries no codes at all.

| | Codes |
|---|---|
| SR2, on by default | `sr2` (core) `ct` `ssc` `st` `fof` `pna` |
| SR3, on by default | `sr3` (core) `cc` `mm` `mits` `r3` `sota` `sota2` `tal` `twl` `matrix-defragged` |
| Off by default | `fra` `ger` `ssg` `tss` (tss is a fan publication) |

Packs per book, as declared in `system.json`:

`sr3` 11 · `tss` 9 · `sota2` 7 · `sr2` 7 · `mm` 6 · `cc` 5 · `twl` 5 · `matrix-defragged` 5 ·
`fra` 4 · `r3` 4 · `sota` 3 · `ct` 2 · `fof` 2 · `mits` 2 · `st` 2 · `ger` 1 · `pna` 1 ·
`ssc` 1 · `ssg` 1 · `tal` 1

### The book split and the archive

The system ships **no sourcebook content it cannot turn off**. Splitting the monolithic packs
per book left a remainder that had no book to belong to, and it is parked — not deleted — in
`archive/non-sr3-content/`.

**1,703 documents**, one JSON file per *original* pack (`sr3e-cyberware.json`,
`sr3e-firearms.json`, …), each an array of `{ _key, bucket, doc }` — the original LevelDB key,
the classification bucket, and the untouched document. Restoring is a direct write back under
the same key.

| Bucket | Docs | Contents |
|---|---:|---|
| `fan` | 1,219 | ray · cb1-4 · cp · nagee · pw · bjf · adh |
| `sr2` | 441 | **already restored** into the `sr2`/`ct`/`ssc`/`st`/`fof`/`pna` packs |
| `sr2-fan` | 41 | NERPS: ShadowLore |
| `unknown` | 2 | two MP7 entries whose `bookPage` holds an accessory list, not a source |

⚠ **`archive/non-sr3-content/README.md` is stale.** It states 0 documents were left in the
system and does not know the `sr2` bucket has since been split into per-book packs. Its counts
are also off by a few (it says fan 1,215 / sr2 440; the files hold 1,219 / 441). **Re-importing
a bucket blind will duplicate documents** — inventory what already ships first.

The **Chromebooks** (`cb1`-`cb4`) and **Cyberpunk 2020** (`cp`) material is fan *conversion*,
not official 2nd-edition product, so it stays archived with the rest of the fan content rather
than joining the SR2 books — see the comment above `SOURCE_BOOKS` in `config.js`.

**How filtering works** — `SR3ESourceBooks.packAllowed(pack)` is the single predicate, consumed
in exactly two places:
- `SR3ECompendiumDirectory._preparePackContext` sets the `hidden` flag core already renders on
  each sidebar pack entry (registered as `CONFIG.ui.compendium` at init). It also collapses
  folders left with nothing visible — core doesn't do that for its own type filter, but one book
  going dark can empty a whole branch. Overriding `hidden` rides core's own path; **do not**
  prune DOM on a render hook.
- `SR3EItem._packsForType(type)` — so a hidden book stops offering its gear through the item
  pickers. Pass `{ ignoreBookFilter: true }` for migrations and integrity checks that must see
  everything.

**Nothing is unloaded.** Packs stay in `game.packs`, so a character already holding content from
a hidden book keeps it. This is a presentation filter.

**Fail-visible by design:** a pack with no `book` flag, or a book code the setting has never
seen, both default to *visible*. Adding a pack can never silently hide it.

**The filter only reaches packs.** Skills hardcoded in `SR3ESkills` (`config.js`) cannot be
hidden by any book toggle — worth remembering before adding a book code that has no packs
behind it, which would render as an empty checkbox.

### Source PDFs

The maintainer's SR3 PDF library lives at `C:\Users\lance\Documents\Shadowrun 3rd Edition PDFs`
(32 books). They carry a **real text layer** — `pdftotext -layout` (ships with Git for Windows)
extracts them exactly; **no OCR needed**. Two-column pages come out with the columns merged on
each line, so crop per column (`pdftotext -x -y -W -H`, mediabox is ~616×795pt) when a clean
list is needed. Use these to source page references and verify stats rather than guessing.

### The Matrix sourcebook (`mat`) — audited, deliberately not registered

There is **no `mat` code**, and that is a decision rather than an oversight. Audited against
`Shadowrun 3e - Matrix.pdf` (159 pages):

- **Skills — yes.** The book's introduction states it adds new active and knowledge skills. Its
  *The Matrix User* chapter (p. 22–27) covers Active Skills (p. 24), System Familiarity (p. 24),
  Program Design (p. 25), Cyberterminal Design (p. 25), Info Sortilage (p. 25) and other
  knowledge skills (p. 25), plus an Otaku chapter. Named: Computer (Cybernetics / Decking /
  Hardware / Search Operations), Computer Build/Repair, Electronics Build/Repair, and the
  Etiquette (Matrix) and Small Unit Tactics (Matrix) specialisations. **Much of this is already
  in `SR3ESkills`** — the "Matrix skills" and "Otaku skills" categories and the Matrix knowledge
  skills — just unattributed. Being hardcoded, no book toggle can hide it.
- **Spells — no.** 37 magic-term matches across the book, all incidental prose references. No
  spell entries, drain codes or tables.
- **Gear — yes, but none of it is imported.** Cyberterminal Construction (p. 52), Utilities
  (p. 68), Programming (p. 76), System Operations (p. 95), Intrusion Countermeasures (p. 103).

So `mat` becomes worth registering only once something exists to carry it. Keep the three Matrix
sources distinct — conflating them is the easy mistake: **`sr3`** = core rulebook Ch. 8 (the
ODM-\* rawdata), **`mat`** = this sourcebook, **`matrix-defragged`** = the community ruleset
(the MDF-\* rawdata).

---

## SR3 rules implemented so far

> **Citation convention.** Each rules section carries its source as *· SR3 p.NN* — the printed
> page in the **core rulebook**, not the PDF page. (`Shadowrun 3e - Core Rules {FAN25000}.pdf`,
> **PDF page = book page + 2**; it has a real text layer, so `pdftotext -layout -f N -l N` works.
> Two-column pages merge the columns per line and scramble tables — crop per column with
> `-x 0 -W 308` then `-x 308 -W 320`, mediabox ~616×795pt.)
>
> **🔴 DIVERGES FROM RAW** marks a rule the system implements *differently from the book*, with the
> book's own wording and the TODO number tracking the fix. These are deliberate flags, not notes to
> tidy away: without them this file reads as an authority and someone builds to the wrong rule.
> **Delete the marker only when the code is fixed** — and check the book, not this file, when it is.
>
> Sections with no citation have **not been audited** against RAW yet. Absence of a flag is not
> evidence of correctness. Audited so far: Rule of Six/One · Defaulting · Damage staging · Combat
> Pool · pool refresh · initiative −10 · dodge resolution.

### Dice rolling — Rule of Six & Rule of One  · *SR3 p.38-39*
- All rolls are d6 success-counting (result ≥ TN = success)
- Any die showing 6 explodes. Each wave shows a single "💥 Roll explosions (N dice)" button that
  re-rolls **all** of that wave's exploding dice at once (not one click per die), adding to each
  die's running total; this repeats wave-by-wave until none are left
- A die stops exploding when its running total ≥ TN (success, no more rolling needed)
- **Rule of One** (`SR3EActor.isRuleOfOne`, one pure function feeding all five roll paths):
  fires **only when every die rolled comes up 1** — *"If ALL the dice rolled for a test come
  up 1s, it means that the character has made a disastrous mistake"* (p.38). Its consequence
  is **GM adjudication**, not a mechanical penalty: *"The gamemaster determines whatever tone
  is appropriate."* There is **no second "critical" tier** — a sweep is already an automatic
  zero-success failure, so the tier could only ever relabel the same event.
  ⚠ A two-tier rule keyed on *more than half* the pool showing 1s is **SR4's glitch**. Do not
  reintroduce it: at 3 dice it trips about twenty times more often than RAW. Caught 2026-08-05
  when a dodge of `5, 1, 1` at TN 4 wrongly reported a glitch.
- A single 1 is only *that die* failing — *"the test can still succeed as long as other dice
  succeed"* — so it needs no special handling beyond comparing against the TN
- Initiative never explodes interactively — resolved silently as a sum

### Defaulting (SR3 Default Table) — interactive  · *SR3 p.84-85*

When an actor lacks the skill for a test, an **interactive dialog** asks how to default
(`SR3EItem.promptDefaultChoice(actor, opts)` → `{ mode, pool, tnMod, allowPool, poolCap, label }`,
or `null` if cancelled). The table as printed on **p.85**:

| Default To | TN Modifier | Dice Pool |
|---|---|---|
| Specialization | +3 | = to ½ specialization's base skill |
| Skill | +2 | = to ½ base skill being used |
| Attribute | +4 | No pool dice allowed |

⚠ **The "Dice Pool" column is the cap on POOL dice, not the dice you roll.** You roll the
**full** rating — *"roll a number of dice equal to **your rating in the default skill**… the
maximum number of **pool dice** allowed is equal to half your rating in that skill (round
down)"* (p.84). Reading it as the dice to roll halves every defaulted test *and* drops the
cap, so it errs in both directions and the two errors partly mask each other.

The book's worked examples, both asserted in `tests/defaulting.test.mjs`:
- **Shotgun 5** defaulting to an assault rifle → rolls **5 dice**, plus **up to 2** Combat Pool.
- **Edged Weapons 4 (Sword)** → rolls the **specialization's** rating, with pool capped at
  **½ the related base skill** (2), not half the specialization.

- `SR3EItem.defaultTiers(actor, opts)` is the **pure** function holding the rule; the dialog only
  renders it. Specializations come from the `specialisations` array (`level` is the **bonus**, so
  the spec's rating is `base + level`) — **one option per specialisation**, since a skill may
  carry several.
- "½ rating" **rounds down** (`Math.floor`). The dialog lists **all** of the actor's active
  skills / specialisations (the GM judges relevance — minimal guardrails) plus every attribute.
- A cancelled dialog **aborts** the whole action (returns `null`; callers bail).
- The TN modifier is **baked into the TN** at each call site (e.g. `tn + def.tnMod`); the old
  `rollPool` `options.defaulting` flag has been removed.
- **`poolCap` is the single gate on pool dice.** Every flow clamps its offer with
  `Math.min(available, def.poolCap)`; the Attribute tier reports `poolCap: 0`, so the cap alone
  expresses "no pool dice" and `allowPool` is kept only as a convenience alias for `poolCap > 0`.

**Wired in everywhere defaulting can occur:**
- Skill rolls (`SR3EItem.rollSkill`), weapon attacks (single + AoE throw + `rollVehicleWeapon`).
- **Melee** (`rollMeleeAttack`) and **astral** (`rollAstralCombat`): **both sides** are
  prompted (attacker first, then defender) — each defaulter patches its boxing-card `skillDice`
  / `skillName` / `defaultTnMod` / available pool.
- **Matrix**: cybercombat boxing (`_buildCCParticipant`, now async), `rollProgram`,
  `rollHackingAction`, `rollNodePrompt`.
- **GM tools**: Falling & Escape Artist (sr3e.js), Driving Test (`SR3EVehicleSheet.runDrivingTest`).
- **Chase Scene** is an **Open Test** (no TN) — the dialog still chooses the dice pool and the
  Attribute tier suppresses the Control Pool; the +2/+3 TN modifiers don't apply (GM raises the
  threshold by hand).

### Initiative  · *SR3 p.103-104*
Two modes selectable in game settings:
- **SR3 mode**: Pass-based. Everyone acts once per pass in init order. Subtract 10 after each pass. Repeat until all initiatives ≤ 0.
- **SR2 mode**: Flat queue. All action slots pre-built (init, init-10, init-20...) merged and sorted descending. Walk queue top to bottom.
Both modes end combat when the round is complete and prompt GM to re-roll initiative.

**Shift-click** on any initiative roll button (actor sheet bolt or combat tracker d20) opens a
physical dice dialog — shows the formula, lets the user type in the result directly.

**Pre-start lock**: before the encounter begins (`!combat.started`), the per-combatant initiative
roll icons in the tracker are dimmed + `pointer-events:none` (and the shift handler bails) so
initiative is rolled only through the "Begin Encounter" dialog. Re-enabled once combat starts.

**Action Tracker** (GM-only, on the active combatant's card, `renderCombatTracker`): a "Complex"
(full-width) button advances the turn (`combat.nextTurn()`); the first "Simple" button toggles
Complex off (one simple action used, can toggle back); the second "Simple" advances the turn.
Per-turn state is in-memory (`_actionTracker` map), cleared on any `updateCombat` turn/round change.

### GM tools — Rollable Tables sidebar
Chase Scene, Driving Test, Session Rewards, Chunky Salsa, Barrier Damage, Falling Damage and
Escape Artist live on the **Rollable Tables** directory tab (`renderRollTableDirectory` hook), not
the combat tracker. Chase Scene and Driving Test are available to all; the rest are GM-only.
Driving Test (`SR3EVehicleSheet.promptVehicleDrivingTest` → `runDrivingTest`) prompts for a vehicle
+ driver since there's no sheet context.

**Chase quarry & auto-distance** (`SR3EVehicleChase.js`): each participant has a **Quarry** checkbox
next to its Distance box. Exactly one vehicle is the quarry (checking one clears the rest); its
distance is the reference (0) and its box fades. All other distances are **relative to the quarry**:
**positive = behind (pursuing), negative = ahead (blocking)**. Participant `speed` is stored in
metres/Combat-Turn (`km/h ÷ 1.2`), so on **`_nextTurn`** each pursuer's distance updates as
`newDist = oldDist − (pursuerSpeed − quarrySpeed)` (closing when faster, opening when slower) and the
turn chat card reports each pursuer's new "Xm behind/ahead (closing/opening)". No quarry set → the
card notes distances weren't auto-updated. State is in-memory (`isQuarry` on each participant).

**Driving Test (SR3 p.134) — `runDrivingTest`.** Base TN = vehicle **Handling**; modifiers are TN
dropdowns (unfamiliar +1, stress, size +2/+3, weather +2/+4, terrain −1/0/+1/+3, combat +2,
datajack −1, **VCR −2×rating**). Dice **pool** (auto, editable): Vehicle Skill dice **+ Autonav
(only out of combat)**; a **jacked-in rigger ("Using VCR") adds Control Pool = Vehicle Skill
*instead of* Autonav**. Selecting *Action During Combat* or *Using VCR* recomputes the pool live.
No vehicle skill → the SR3 Default dialog. 1 success = manoeuvre succeeds (0 → GM Crash Test).

**Initiative formulas by mode:**
- Default (no Matrix mode): `Reaction + woundMod` base + `initiativeDice` d6 (wired reflexes apply)
- TRM / AR / VR-Cold: `Reaction + woundMod` base + `1d6` (wired reflexes apply to Reaction; dice forced to 1; Response does NOT apply)
- VR-Hot: `(reaction.base + woundMod + Response×2)` base + `(1 + Response)d6` (wired reflexes excluded — uses `reaction.base`, not `reaction.value`; Response replaces cyber bonuses)
- Astral Projection: `Intelligence + 20` base + `1d6`
- Physical Plane / Dual Natured: use default formula

**Vehicle initiative (read from `system.vcrMode` and `system.controlledBy`):**
- VCR (jumped-in): Rigger's `Reaction + vcrLevel + woundMod` base + `(1 + vcrLevel)` d6; TN −2 per VCR level on all skill tests
- RCD (remote): Rigger's `Reaction + woundMod` base + `initiativeDice` d6 (no modifiers)
- Auto (no pilot or pilot not found): `Pilot rating` base + `2d6`
- VCR is exclusive: activating VCR sets all other linked vehicles to Auto (not locked — editable after)

### Essence is permanent  · *M&M p.147*

`essence.value` is **derived** and rewritten every `prepareDerivedData`. The persisted number
is **`essence.lost`**, and it is **nullable** — the null carries meaning:

| `lost` | Meaning | Essence |
|---|---|---|
| `null` | nothing recorded | `base − installedCyberwareCost` |
| a number (incl. `0`) | authoritative | `base − lost` |

⚠ **A recorded number wins outright — it is NOT `max`ed against installed hardware.** The
first design did exactly that, and it silently blocked the case a GM most needs: a player
installs the wrong 2.0 of chrome, it is removed, and the corrected Essence cannot be restored
because the number being corrected *to* sits below what the (now deleted) hardware implied.
Permanence means removal does not refund **by itself** — not that the GM is overruled.

⚠ **`lost` ACCUMULATES on install; it is not a running maximum of what is fitted.** Storing
`max(lost, installed)` passes every arithmetic test and still lets a character rip out 2.0 of
wired reflexes, fit 0.5 of cybereyes, and pay nothing for the new chrome — the removed
hardware keeps "covering" it. The rule is `lost = max(lost, installedBefore) + cost`, where
the `max` term exists only to seed actors saved before the field existed (so no migration
script is needed).

⚠ **There is deliberately NO delete hook.** Removal must never touch the mark; anything
firing on delete could only lower it, which is the refund this prevents. One hook, on
`createItem`, gated to the active GM.

⚠ **Two derived values hang off Essence** — Bio Index capacity (`essence + 3`) and effective
Magic (`essence − totalBioIndex / 2`) — so the old refund silently inflated a character's
Magic and their bioware headroom.

**Two controls on the sheet.** The Essence box writes to the DERIVED field, which used to mean
a GM's correction reverted with no error at all; `SR3EActor._preUpdate` now translates a write
to `value` into the `lost` it implies. Beneath it sits **`lost` itself**, editable, showing the
installed total as its placeholder when unset — so a GM can see and set the number that
actually persists rather than inferring it from a subtraction. The **↺** beside it clears the
override back to `null` (never `0`) so Essence follows installed cyberware again.

⚠ **The rule is in Man & Machine, not core.** SR3 core never states the removal case —
it only says the Essence Cost is "the amount by which the character's Essence is reduced
**when the cyberware is installed**" (p.60). M&M settles it outright, under REMOVE
CYBERWARE:

> "Cyberware that is removed **does not restore the character's lost Essence**. Removing
> cyberware incurs permanent damage to the implant (1D6 ÷ 2 Stress)."  — *M&M p.147*

⚠ **The "Essence hole" is an opt-in SURGERY OPTION, not automatic** — *M&M p.150*:

> "Essence Slot (Implant, +2 Threshold) — If the character previously had cyberware
> removed, a new implant with this option can be installed within the 'Essence hole'
> left behind by the earlier implant. In other words, the old implant's Essence Cost can
> be subtracted from the new implant's Essence Cost."

So accumulating on install is the correct **default**, and the discount exists only when
a surgeon takes that option at +2 Threshold. Storing `max(lost, installed)` instead would
hand every character a free, permanent Essence Slot on every implant. **Not modelled** —
there is no surgery flow to hang it on; a GM applies it by editing the item's
`essenceCost` or the Essence box. See TODO 53.

⚠ Adding this field was a **data-model change**: it needs a full Foundry restart, not F5.

### Astral state (Awakened characters)
Toggled on the Magic tab. Stored as `system.astralMode` (persisted):
- `''` — no state set (default)
- `'physical'` — explicitly Physical Plane (grey badge in combat tracker)
- `'dual'` — Dual Natured (amber "Dual Nat." badge)
- `'astral'` — Astral Projection (purple "Astral" badge); uses INT+20+1d6 initiative

Only one state active at a time; clicking the active button deactivates it.

### Ranged combat flow  · *SR3 p.109-114*
1. Attacker clicks weapon on sheet
2. Target selection dialog (radio buttons, single actor)
3. (Firearms) Loaded ammo type is read from the weapon — no per-shot ammo picker. Power/level/stun mods (Explosive/EX/Gel) applied now; see **Firearms** section
4. (Firearms) Fire-mode dialog: SS/SA/BF/FA, recoil preview, editable compensation (see **Firearms**)
5. Roll-options dialog: damage code, editable **range** dropdown (auto-measured from tokens; see Range section), TN-modifier breakdown (recoil, wound, multi-target, tracer note). **The TN field is read-only whenever a GM window will open** — see `gmApprovesTN` below
6. **GM's TN window** (`_promptGMAttackWindow`): p.112 modifier checkboxes, live-summed into an editable TN, displayed value clamped at 2. Rows are **grouped for reading, not in book order** — Target, Attacker, Conditions, Gear — via a `group` field on each `SR3E_RANGED_MODIFIERS` entry, consumed by `mvpModifierGroups()`. Layout lives on the **data**, so the deferred rows drop into place when they land instead of forcing a re-sort. Gear is last and captioned: those rows are **guesses the system made** from the attacker's kit (`guessGearModifiers`), not judgements the GM is being asked for. Empty groups are dropped; a row with a missing or unknown `group` falls into a trailing **Other** bucket rather than vanishing — a typo there would silently remove a modifier the GM is meant to apply. Covered by `tests/combat-modifiers.test.mjs`.
   - **Visibility** (p.112 table) renders as **two dropdowns** — condition, and which vision the attacker is using — resolved by `visibilityModifier(condition, visionKey)`. Not a dropdown plus a "cybernetic" checkbox: the table has **two axes** (column = vision type, slash within a cell = cybernetic/natural), giving **five** valid states, and a checkbox would also permit the meaningless "Normal + cybernetic". ⚠ The slash reads **cybernetic first, natural second** (p.111), so **cyber vision is the *worse* of the two** — an elf's own eyes beat cybereyes. Low-Light and Thermographic are **not** interchangeable: they differ in 6 of 8 conditions and invert in Thermal Smoke. Nothing is pre-selected — see TODO #36 for deriving it from the attacker.
   - The `visibility` row carries `mod: null` and `value: true`: its state holds the **resolved** number rather than a tick, and `sumModifiers` reads `value` rows **before** its falsy guard, because **0 is a real answer** (thermographic vision in Mist) and must not read as "not set".
7. Attacker allocates combat pool to attack — this dialog is the attacker's **🎲 Roll** trigger
8. Attack rolls (interactive Rule of Six)
9. On final wave: **the defender is asked to declare a defence, knowing the attack's successes** — "N hits incoming. Dodge or take it?"
10. Dodge roll (interactive Rule of Six, TN 4)
11. Dodge result — see the RAW box below. Resolved by `SR3EActor.dodgeOutcome`.
12. Dodge does **not** reduce *staging* — but its successes are not discarded either. See below.

#### ⚠ Resolving the Dodge Test — RAW, and where the code diverges

Two separate questions, easy to conflate. The rulebook answers both in consecutive sentences:

> "If the number of successes obtained on the Dodge Test are **more than** the Attacker achieved on
> his Attack Test, then the attack is completely dodged, and the target takes no damage.
> **Even if you don't dodge completely, the successes still count and are added to the Damage
> Resistance Successes** to determine the final outcome."

and again in the numbered sequence, step 4:

> "A clean miss occurs if the number of successes from the target's Combat Pool dice **exceeds** the
> attacker's successes."

**1 — A tie is a HIT.** Both statements are strict inequalities: *more than*, *exceeds*. Equal
successes means the attack lands. Dodging is not "match the attacker", it is "beat the attacker".

**2 — A failed dodge is not a wasted dodge.** Its successes carry into the Damage Resistance Test
and stage the damage down at the usual 2-per-level, exactly as Body successes do.

**3 — Staging UP is unaffected.** The attacker's raw successes stage the damage; dodge successes are
added to the **resistance** side, they do not cancel attack successes. So "dodge does not reduce
staging" is correct — "net hits are irrelevant" is not.

Worked, to make the three concrete. Attacker 3 successes, defender rolls 2 on the dodge:
staged damage is computed from **3** (not 1), the attack **hits** (2 does not exceed 3), and the
defender carries **2 successes** into the soak before rolling a single Body die.

**Both rules live in one pure function**, `SR3EActor.dodgeOutcome(dodgeHits, attackHits)` →
`{cleanMiss, carried}`, so there is a single place to get them wrong. It has no Foundry dependency
and is covered by `tests/dodge-resolution.test.mjs` — including the tie, which is the case that was
wrong before and the one most likely to be "helpfully" relaxed back to `>=`.

The carried successes ride to the soak as `carriedSuccesses` on the soak payload and are added to
the Damage Resistance roll's own successes. The soak card shows the sum **and its parts**
(`5 hits (3 soak + 2 dodge)`) so a player can see the dodge was credited rather than silently
folded in.

#### ⚠ The defender declares AFTER the attack roll — this is RAW, not a convenience

The core rulebook's numbered ranged sequence is explicit:

> **3. Make Attacker's Success Test** — "Count the successes the attacker rolls."
> **4. Resolve Dodge Test** — "If the target wishes to attempt to dodge an attack, he may use the
> Combat Pool against a Target Number 4… A clean miss occurs if the number of successes from the
> target's Combat Pool dice **exceeds the attacker's successes**."
> **5. Resolve Target's Damage Resistance Test**

The book's worked example follows the same order: Liam rolls 5 successes, and *then* "Snot first
decides to attempt a Dodge Test."

**The decision is dodge-vs-soak, not a blind guess.** Combat Pool spent dodging is gone from the
Damage Resistance Test — in the example Snot burns all 5 dice on the dodge, fails, and then has
"no dice remaining in his Combat Pool with which to increase his odds of survival." Showing the
defender the attack's successes first is what makes that trade a real decision.

**This system had it backwards until 2026-08-05**, asking the defender to commit before the roll.
Do not "restore" the old order: prompting early is not a simplification, it deletes the choice the
rule exists to create.

Consequences in the code, so they are not undone by accident:
- `sr3e.attack.negotiate` handles **only** the GM's TN window. It writes nothing.
- There is **no** negotiate/commit two-phase and no pending registry. Both existed to protect a
  defender-pool reservation that no longer happens.
- `SR3EActor.handleDodgeDeclare` (from `.sr-dodge-declare-btn`) runs step 4: relays
  `sr3e.dodge.declare` to the defender's decider with `attackSuccesses`, spends the pool through
  the GM, then rolls the dodge — or falls through to the soak card on a declaration of 0.
- Full Defense is read (`_fullDefenseDice`) but only consumed at that point, never earlier.
13. Soak card posts for target: editable Body pool, TN (power − armour), armour type dropdown (ballistic default, impact for melee). APDS/Flechette armour effects auto-applied here from the carried `ammoType` (editable; shows a gold note)
14. Soak roll (interactive Rule of Six)
15. Soak result: each 2 soak hits = stage down (D→S→M→L). Below L = completely soaked.
16. GM applies damage manually using wound track buttons.

### Firearms — fire modes, recoil & ammunition
**Fire modes** (`SR3EItem._promptFireMode`, weapon `mode` string e.g. "SA/BF/FA"):
- SS: single shot, no recoil accumulation. Warns if already fired this phase ("SS weapons cannot fire twice").
- SA: +1 round to the phase counter; cumulative recoil.
- BF: Power +3, level +1. **Recoil stacks +3/+6/+9** per burst (counts its own 3 rounds).
- FA: 3–10 rounds; Power +rounds, level +⌊rounds/3⌋; multi-target & walking-fire (wasted rounds) options.

**Recoil** (`SR3EItem.recoilTN`, pure) = `max(0, (roundsBefore + ownRounds) − totalComp) × mult`.

⚠ **BF and FA count their OWN rounds; SS and SA do not.** *"Each round fired imposes a +1
recoil modifier for the entire burst"* (p.115). BF contributes 3, FA contributes the rounds
that burst fires, SS/SA contribute 0 — their shot penalises the *next* one. This was wrong
for FA until 2026-08-13 (it counted only prior rounds), so the book's own Wedge example came
out +0/+2 instead of +2/+6 — understating recoil more the longer a firefight ran.
⚠ **Compensation is subtracted BEFORE the multiplier**: *"2 × uncompensated recoil"*, and
p.111 works it — an MMG firing 10 rounds with 6 comp is **+8**, i.e. (10−6)×2, not 14.
Pinned with all three worked examples in `tests/fire-modes.test.mjs`. `totalComp = actor.system.recoilCompensation + weapon.system.recoilMod`, both editable inline in the fire dialog and persisted on confirm. Heavy weapons (LMG/MMG/HMG/MinG) double uncompensated recoil; shotguns (ShtG) double it in **BF mode only** (SR3 p.111). Actor comp is edited on the **Cyber tab**; weapon comp ("Recoil Comp") on the firearm item. `roundsFiredThisPhase` resets each combat phase (`SR3EActor.resetRecoil`).

**Short bursts** (`SR3EItem.resolveBurst`, pure) · *SR3 p.115* — a burst fired on a nearly
empty clip is three cases, not one: **3+ rounds** = normal burst; **2 rounds** = +2 Power with
the Damage Level **unchanged** and +2 recoil; **1 round** = resolved as **single-shot**, not as
a burst at all. ⚠ "+2 and +1 level" is the mis-reading, and the one-round case changes the
MODE. Only reachable with `trackAmmo` on; `rollWeapon` re-computes recoil after consulting the
clip, since the dialog priced a full burst. See TODO 51/55.

**Per-phase firing caps** (`SR3EItem.phaseFireWarning`) — SS 1 shot · SA 2 shots · BF 2 bursts
· FA 10 rounds. ⚠ A **proxy**: the book states these in Actions and the system does not model
the action economy, so they are inferred from `roundsFiredThisPhase` and a mixed-mode phase
drifts. Warns, never blocks.

**Ammunition** — two-layer model (see also the ammo-architecture memory):
- *Stockpile*: ammo items are a reservoir (gear/ammo tabs show "Stock"). Fields: `ammoType`, `loadMechanism`, `rounds` (total owned). Rules live in `SR3E.ammoTypes` config, NOT on the item.
- *Magazine*: each firearm tracks `loadedAmmoType` + `loadedRounds`; magazine size is parsed from its capacity string (`15(c)` → 15). The weapons-tab ammo cell shows the capacity, a loaded badge, and a ↻ **Reload** button (`SR3EItem.reload`).
- *Reload*: prompts a compatible stockpile (matched by loading mechanism), full-swaps the magazine (leftovers discarded), and subtracts from the stockpile. When `trackAmmo` is off it only sets the loaded type (no stock math).
- *Firing* uses whatever is loaded; decrements `loadedRounds` when `trackAmmo` is on (warns, never blocks, when empty).
- *Type rules*: Explosive +1 / EX +2 power; Gel −2 power + Stun (attack time). APDS halves ballistic; Flechette unarmoured → level +1, armoured → effective armour ×2 (soak time, via `ammoType` carried into `_postSoakCard`). Anti-Vehicle sets `weaponOpts.avMunition` to bypass the vehicle Power/2. Tracer: FA-only, tracer rounds raise Level not Power, TN bonus shown as a manual note.
- *Loading mechanisms*: c/m/cy/b/d/sb/internal + arrow/bolt (`SR3E.ammoLoadMechanisms`); for firearms parsed from the gun's capacity string by `SR3EItem._parseLoadMechanism`.
- *Setting*: world setting `trackAmmo` (off by default) gates all counting/depletion.

**Bows & crossbows — nocked arrows/bolts** (`projectile` type, bow/crossbow categories per `SR3E.nockedAmmoByCategory`; `SR3EItem._usesNockedAmmo`): treated like firearms with a **magazine of 1**. Each draws from the same `ammunition` stockpile, matched by loading mechanism — **bows ↔ `arrow`, crossbows ↔ `bolt`** (the mechanism is inferred from the weapon category, not a capacity string; see `_weaponLoadMechanism` / `_weaponMagazineSize`). Reload nocks one round (subtracts 1 from stock); firing spends it (`loadedRounds` 1→0) so you must re-nock. The weapons-tab projectile section shows a **Nocked** column (Arrow/Bolt or empty) + ↻ Reload, only when `trackAmmo` is on. **Slings (SL) and any non-mapped category never deplete.** No special arrow/bolt types yet (always `regular`).

**Thrown weapons / grenades** (`thrown` type, and `projectile` type with a thrown category — `SR3EItem._isConsumable`): carry a `quantity` and are decremented 1 per use (`_consumeThrown`) when `trackAmmo` is on. The weapons-tab thrown section shows `×qty`.

**Empty = inoperable** (when `trackAmmo` is on): `rollWeapon` bails at the top if a firearm or nocked bow/crossbow has `loadedRounds ≤ 0`, or a consumable has `quantity ≤ 0`. The roll dice icon is rendered faded + struck-through (`_itemControls` `rollDisabled`, gated by `SR3EActorSheet._weaponOutOfAmmo` for firearms & bows / inline for thrown). The Reload button stays active so you can refill.

**Vehicle-mounted weapons** keep their own AV-munition checkbox in the `🚗` firing dialog — they do **not** use the clip/reload system (built for vehicle-vs-vehicle). Character firearm dialogs no longer have a manual AV checkbox (driven by Anti-Vehicle ammo type).

### Range (firearms, bows/crossbows, thrown)
Auto-measured from tokens when available, otherwise manual. Applies to `firearm`/`projectile`/`thrown` in the single-target `rollWeapon` path (AoE/grenades use the scatter flow instead).
- **Distance**: `SR3EItem._measureDistance(aToken, tToken)` via `canvas.grid.measurePath` (scene units assumed **metres**). Attacker token = `actor.getActiveTokens()[0]`. Target token = the single canvas target (`game.user.targets`) if present, else the chosen actor's first token. Target acquisition: `SR3EItem._acquireCanvasTarget()` (one canvas target → skips the actor dialog), else `_promptTarget`.
- **Bands**: `SR3EItem._getRangeBands(actor)` → weapon `rangeOverride` ("5/15/30/50") → fixed metre table `SR3E.weaponRanges[category]` (firearms) → Strength-scaled `SR3E.weaponRangeMultipliers[category]` × effective STR (bows/thrown).
- **Classify**: `SR3EItem._rangeBandForDistance(bands, metres)` → `{idx,label,tnMod,beyond}`. TN modifier from `SR3E.rangeTN` = `[0,1,2,5]` (Short 4 / Medium 5 / Long 6 / Extreme 9). Beyond Extreme warns but still allows.
- **Override at fire time**: range is NOT pre-baked into `extraTNMod`; it's passed to `_promptWeaponRollOptions` as `rangeInfo` and rendered as an editable **Range dropdown** (pre-set to the measured band, shows measured metres). Changing it recomputes the TN live via a `renderDialogV2` hook guarded by `#sr-range`. The TN field stays the authoritative value on confirm.

### Attacking from the canvas
Two entry points besides the sheet (both fire ready weapons via `_sr3eReadyWeapons`: firearms with ammo loaded when tracking, equipped melee, thrown w/ quantity, bows/crossbows with a nocked arrow/bolt when tracking, slings, **and combat/damaging spells — those with a damage code — for Awakened actors**):
- **Token HUD** (`renderTokenHUD` hook, sr3e.js): adds a 🎯 crosshair button on owned character/npc tokens → `_sr3eQuickAttack(actor)` opens a picker (or fires directly if only one ready) → `_sr3eFireWeapon` dispatches `rollMelee`/`rollWeapon`/`rollSpell`. Works for all players (system code, not a macro).
- **Hotbar drag** (`hotbarDrop` hook + draggable `.weapon-section .item-row` emitting `{type:'Item', uuid}`): creates a "Fire: \<weapon\>" **script macro**. ⚠ Script macros only run for users with script-macro permission (off for the base Player role) — the Token HUD path has no such restriction.

### Foundry integrations (tokens / statuses / enrichers)
- **Token wound bars**: `preCreateActor` (sr3e.js) defaults character/npc prototype tokens to `bar1=wounds.physical`, `bar2=wounds.stun` (fill as damage rises), `OWNER_HOVER`. Only affects newly-created actors. Wounds are `{value,max}` so Foundry treats them as trackable.
- **Status effects**: custom SR conditions appended to `CONFIG.statusEffects` (init): `sr3e-sustaining/-fulldefense/-dumpshock/-astral/-dual/-vr` + core (prone/unconscious/dead…). The `updateActor` hook (gated to `game.users.activeGM.isSelf`) auto-toggles `sr3e-astral`/`-dual` from `astralMode`, `sr3e-vr` from `matrixUserMode` (VR-Cold/Hot), `sr3e-fulldefense` from `fullDefense`, via `actor.toggleStatusEffect`.
- **Auto-defeated**: same `updateActor` hook — when a wound track is full → combatant `defeated=true` + `unconscious` overlay; physical full AND overflow ≥ Body → `dead` overlay. Reversible on healing.
- **Text enrichers**: actor Biography/Notes render as read-only enriched HTML (`_bioField` + `_enrichBioFields` in `_onRender`, via `TextEditor.enrichHTML`) with an ✎ Edit toggle revealing the textarea; submit-on-change re-renders back to enriched. Chat-card content is auto-enriched by core. Item/actor edit fields stay plain textareas by design.
- **AoE / grenade flow (RAW scatter-first)**: requires a scene. `rollWeapon` AoE path:
  1. **Nominate** the blast point — `_placeBlastTemplate`: a plain **PIXI.Graphics circle** (added to `canvas.interface`) that follows the cursor — left-click detonates, right-click/Esc cancels, destroyed via PIXI. Records `aoeCenter` (scene coords) + the thrower token centre. *(Foundry v14 deprecated both the MeasuredTemplate **document** and **placeable** — merged into Region — so the aiming preview uses no MeasuredTemplate at all, avoiding every compatibility warning.)*
  2. **Roll options** — `_promptWeaponRollOptionsAoE(rawDamage, actor, {throwDistance})`: grenade type (Standard/Aero/Launcher), damage code, **auto range-TN** by type (`SR3E.grenadeTypes[type].rangeMult × STR` or `rangeFixed`, recomputed on type change), and a Confined-Space tickbox. No targets chosen here.
  3. **Throw roll** (`rollPool`) carries `aoeCenter / aoeRadius / aoeThrowerCenter / grenadeType / aoeChunky` in the roll state.
  4. **Resolution** (`SR3EActor._postWaveCard`, the `state.isAoE && state.aoeCenter` branch — runs **before** the `successes===0` check, so a grenade always detonates): rolls scatter (`scatterDice` d6) − `successes × scatterReduction`; **relocates the epicentre** along the throw axis (dir 1 = overthrow, 4 = short); creates a result template at the landing spot; **re-detects every token in range — including the thrower**; draws a landing marker as a **Region document** (circle shape, `visibility: ALWAYS` — synced & visible to **all players**, deleted warning-free since Region isn't deprecated). If the thrower lacks Region-create permission it falls back to a **local PIXI circle** (tracked in `game.sr3e._blastMarkers`). The chat 🧹 Clear button removes whichever was made (`data-region-id` → region `delete()`; `data-marker-id` → PIXI `destroy()`). Per-target power = base − distance (or the **Chunky Salsa GUI** `game.sr3e.openChunkySalsa({...returnOnly})` when confined). Posts a soak card per caught token. Damage is base power − distance, never success-staged (successes only tighten scatter).
- `_openChunkySalsaCalculator(opts)` posts soak cards itself when called with no `returnOnly` (the Rollable Tables button); returns per-target codes when `returnOnly:true`.
- *(The dead remnants of the pre-scatter rework — `_promptTargetsAoE`, `_tokensInBlast`, the `aoeTargetIds`-gated branch in `_postWaveCard` and its `aoeTargetIds`/`chunkySalsa` payload plumbing, and `rollPool`'s inert `options.defaulting` +4 — have been removed.)*
- **Shared blast-area marker**: `SR3EActor._drawBlastArea(center, radiusM, {name,color})` → `{regionId, markerId}` (Region with `visibility: ALWAYS`, local PIXI fallback) and `SR3EActor._clearBlastButton({regionId,markerId})` build the marker + chat 🧹 Clear button. Used by both grenade resolution and **spell AoE** (purple). Spell AoE has **no scatter/falloff** — `SR3EItem._actorsInRadius(center, radiusM, caster)` auto-detects targets at cast time; each resists at full Force.

### Melee combat flow  · *SR3 p.121-123*
1. Attacker clicks a melee weapon on their sheet.
2. Target selection dialog. **Adjacency:** if both are tokens and the target is not in an
   adjacent square (`SR3EItem._tokensAdjacent`), `rollMelee` **warns but proceeds**
   (minimal guardrails). Reach affects the TN only, never whether the attack is possible.
3. Defender auto-uses their equipped melee weapon, falling back to an unarmed/cyber item,
   then to bare hands (STR + M). **Reach never gates participation** — p.122 step 2 has the
   defender roll unconditionally, so an unarmed defender still defends normally.
4. Either side lacking the skill is prompted to default — **on their own client**.
5. Called shot (attacker only).
6. **The GM sets BOTH target numbers** — `sr3e.melee.negotiate` →
   `SR3EItem._promptGMMeleeWindow`. See below.
7. Two-corner boxing card; each side edits only its own corner and submits. The last
   submission resolves (see **Two-corner cards**).
8. Winner = most successes. **A tie does no damage.** The winner's damage code stages up by
   the net successes; the loser gets a Resist Damage button into the usual soak flow.

#### The GM's melee TN window — separate from the ranged one on purpose

Ranged resolves **one** target number; melee resolves **two**, and most p.123 rows move both
at once in opposite directions — "friends in the melee" is a single fact that helps one
fighter and hurts the other by the same amount. `sumMeleeModifiers` therefore returns an
`{atk, def}` **pair of deltas**, not finished numbers: the base TNs already carry reach,
defaulting tiers and any called shot, and handing back absolutes would silently discard them.

Governed by the same `gmApprovesTN` setting as ranged, including `off` and the `player`
mode that skips the window for GM-vs-GM NPCs. `adjudicated` is the caller's only reliable
signal that a GM actually looked — do not infer it from the payload (TODO 50).

⚠ **Visibility halves in melee.** p.123 applies the Visibility Table *"at half their value,
rounding down, except for Full Darkness"* — `meleeVisibilityModifier`, not the ranged
`visibilityModifier`. An odd +1 therefore becomes 0 rather than persisting.

#### ⚠ Reach is a DIFFERENTIAL, and its application is the fighter's CHOICE

p.121: *"Calculate the **difference** between the Reach Ratings of opponents. The character
with the longer (higher) Reach **can choose** to apply this number as either a negative
target number modifier to his attack test OR as a positive modifier to his opponent's target
number."* The book gives the reason the two are not the same: *"beat the opponent's
defenses"* versus *"make himself harder to hit."*

- **Differential, not an absolute.** Equal reach cancels — two staff-wielders both roll
  against 4, not 2. Each side subtracting its own reach was an old bug: the *gap* came out
  right, which is why it survived play, but the absolute level did not.
- **The election lives in the holder's own corner** (`sr-melee-atk-reach` /
  `sr-melee-def-reach`), rendered only for the fighter who holds the longer reach, so the
  per-corner owner gate already makes it read-only to everyone else. It is **not** in the GM
  window — putting it there would repeat exactly the mistake the contested rework removed.
- Electing "onto the opponent" raises **both** TNs by N: the holder gives back the bonus the
  card was posted with, and the opponent takes the penalty. The gap is unchanged; only who
  is measured against the harder number moves.
- ⚠ **At the TN floor the two branches stop being equivalent, and that is RAW.** No TN may
  fall below 2, so a bonus that would take you under it is simply lost while the same points
  pushed onto the opponent are not. Against a soft target the election is a real edge.
- Trolls have natural Reach 1 cumulative with weapon reach (p.121) — **not yet folded in**;
  the differential is computed from `weapon.system.reach` alone.

### Called shots (SR3 p.114)
Available on **all single-target weapons except AoE/grenades** — firearms (any mode **except Full
Auto**), bows/crossbows, thrown, and melee. Declared before the roll; **+4 TN**, with two
mutually-exclusive options. **Take Aim** folds in as **−1 TN per point** (1 Simple Action each).
- **Stage up damage**: base Damage Level +1 (L→M→S→D, cap D), resolved normally otherwise.
- **Specific sub-target**: a named component on a vehicle-sized+ target (tires, window, fuel tank…);
  normal damage rules, GM adjudicates destruction (usually Moderate+).
- **Ranged**: built into `_promptWeaponRollOptions` (the `#sr-called` select + `#sr-aim` + sub-target
  field). The +4/−aim is **folded live into the TN field** (same `renderDialogV2` hook as the range
  dropdown, now guarded on `#sr-damage`); stage-up rewrites the returned `damageCode` **before** any
  vehicle Power/2. The caller (`rollWeapon`) passes `calledShotAllowed = mode !== 'FA'` and appends a
  🎯 note to the card label.
- **Melee**: a standalone `SR3EItem._promptCalledShot(actor)` dialog (attacker only) runs after
  defaulting; its `tnMod` is baked into `atkTN`, and `calledShot`/`calledShotTarget` ride in the
  boxing-card ctx. `handleMeleeRoll` adds the extra stage **only when the attacker wins**
  (`winnerIsAtk && ctx.calledShot==='stage'`); the card header shows the declaration.
- **Not wired**: vehicle-mounted weapons (`rollVehicleWeapon` uses its own 🚗 dialog) and spells.

### Damage staging  · *SR3 p.113-114*
Power (number) + Level (L/M/S/D) + optional Stun flag
- Each 2 net successes = +1 stage (L→M→S→D) — the same 2-per-level applies to the
  defender staging **down**
- ⚠ **Past Deadly, SR3 gives TWO answers and both are RAW.** A general rule with a
  melee-specific exception — do not "resolve" the conflict, it is scoped on purpose.
  `SR3EItem.stageDamage(base, net, { meleeRules })` is the single implementation.
  - **General — the default.** Surplus successes are **discarded**: *"On the other end of
    the spectrum, Deadly damage is the highest level of damage possible"* (**p.113**).
    **Power is the Damage Resistance TN**, so a phantom point makes the soak harder *and*
    the wound worse. A 9M firearm rolling 6 successes is **9D**, not 10D.
  - **Melee — `meleeRules: true`.** *"If the Damage Level has been increased to Deadly,
    extra successes can be used to stage the Power Rating up. For every two successes the
    Power Rating increases by one"* (**p.122**, step 4). The same 9M/6-success roll is
    **10D** in melee.
  - **Astral counts as melee** — *"Astral combat uses the same rules as Melee Combat"*
    (**p.174**). Matrix and contested tests do **not**.
  - ⚠ Melee used to carry its own inline copy of the staging loop, so capping
    `stageDamage` for the ranged fix left melee accidentally right and broke **astral**.
    The duplicate is gone; both rules are pinned in `tests/damage-codes.test.mjs`.
- Stun damage goes to stun track; physical to physical track
- GM applies manually

### Combat pool  · *SR3 p.43; refresh p.104*
- Derived: ⌊(QUI + INT + WIL) / 2⌋ + wound modifier
- Tracked via `combatPoolSpent` on actor system
- Available = derived − spent
- Spent when allocated to attack, dodge, or melee
- **Refreshed at the start of every Combat Turn** — `SR3ECombat._endOfTurnReset()` refreshes
  combat / spell / astral / hacking pools together (and resets recoil and Full Defense). This
  is RAW:

  > "At the start of each Combat Turn, all dice pools refresh to their original, full value…
  > **Unused pool dice do not carry over** from one Combat Turn to the next."

  A Foundry **round** is an SR3 **Combat Turn** (which contains several Initiative Passes), so
  per-round is the correct granularity. ⚠ Do not "fix" this to per-pass or per-combat — pools
  refreshing once per combat would leave everyone dry after the first turn.
- **Three call sites, and round 1 needs its own.** `_newRound()` covers rounds 2+; `startCombat()`
  covers round 1, because a Combat Turn Sequence (**p.104**) begins with step 1 *"All Dice Pools
  Refresh"* and round 1 is a Combat Turn like any other. The **Begin Encounter** flow
  (`sr3e.js`) calls it once more *before* `rollInitiative()` — that ordering is load-bearing, not
  decorative: `rollInitiative()` ends by opening the Spell Defense declarations, and each one caps
  its Spell Pool input at `availableSpellPool` **as read when the dialog is built**, so refreshing
  afterwards would show a mage a stale cap and block dice they actually have.
  ⚠ `_endOfTurnReset()` had exactly **one** caller for a long time (`_newRound`), which meant
  round 1 silently inherited leftover state and `endCombat()`'s prompt was the only thing keeping
  the *next* fight clean. Covered by `tests/initiative.test.mjs`.
- Every write is **dirty-checked**, so the overlapping calls above cost nothing — each helper
  writes unconditionally and each write fires the `updateActor` hook that drives status icons and
  the auto-defeated logic.
- Also refreshed by `endCombat()`, **silently** — it calls the same `_endOfTurnReset()`, then clears
  the two things that outlive a Combat Turn but not the fight (`clearSpellDefense`, the
  `tempMagicLoss` flag). A tidy-up on the way out, **not** the mechanism that keeps pools topped up
  during a fight.
  ⚠ This used to **ask** ("Refresh all combat pools?"). The prompt was removed 2026-08-11: once
  `startCombat()` gained its own reset, the next fight refreshed at round 1 either way, so declining
  achieved nothing. Do not restore it — it is a question with only one meaningful answer.

### Spell pool (Awakened characters only)
- Derived: ⌊(INT + WIL + MAG) / 3⌋ (effective Magic; SR3 RAW Spell Pool)
- Tracked via `spellPoolSpent` on actor system (manual adjustment via `spellPoolMod`)
- Available = derived − spent
- Spent when allocated to spellcasting
- Null / hidden for non-Awakened actors (Magic attribute = 0)

### Spellcasting flow
1. Caster clicks "Cast" on a spell row (magic tab)
2. Choose Force dialog — note shown if Force > Magic (drain becomes Physical). For damaging spells (item `damage` non-empty) it also has a **Damage Level** dropdown (L/M/S/D, default = the spell item's level); the chosen level drives **both** the target's base damage **and** the caster's drain level. **AoE spells** (Range code contains `(A)`, e.g. `LOS (A)` — there is no separate AoE flag) also show an **Area radius (m)** input (default = caster's **Magic** attribute, editable).
3. Targeting (**no dodge** — combat spells are resisted, not dodged):
   - **Single**: target dialog only.
   - **AoE** (`SR3EItem._placeBlastTemplate` cursor aim → `_actorsInRadius`): nominate the area centre on the canvas; **every live actor (not the caster, not vehicles) inside the radius is auto-detected** as a target — no manual checkbox list, **no scatter, no falloff**. A purple **Region** area marker is drawn for all players (`SR3EActor._drawBlastArea`, local PIXI fallback) with a 🧹 Clear button on the result card. Off-canvas → falls back to the manual checkbox dialog (`_promptTargetsMulti`). Empty area → casts anyway (drain still applies).
4. Allocate Spell Pool dice dialog (if any available)
5. **Casting = SR3 opposed test.** Caster rolls Sorcery + Spell Pool vs **TN = the spell's Target attribute** on the target — `SR3EItem._parseSpellTarget` (the single parser for both cast TN and resist): `W`→Willpower, `B`→Body, `I`→Intelligence, `Q`→Quickness, `F`→Force (the TN, not a target attribute), a number→fixed TN, blank/`OR`/unknown→Mana=Willpower/Physical=Body. **Any `(R)/(T)/(RC)/(V)/(DT)` suffix is stripped and ignored** (so `W(R)`, `4(V)` parse cleanly). For AoE the **primary** target sets the cast TN. Rule of Six throughout.
6. On the caster's final wave (allDone):
   - 0 successes: spell fails (targets auto-resist), no effect — drain still posted.
   - 1+ successes: damage is **not** pre-staged; each target gets a **"Resist Spell"** button carrying the caster's successes + base damage (`SR3EActor._spellResistButton`). Caster always gets a **"Resist Drain"** button. The card shows the **cast TN's source** (`spellContext.tnSource`, e.g. "Dave Decker's Willpower") and the **staging the cast hits produce** (base → staged, before the target's resistance reduces it).
   - If anyone has a Spell Defense pool, a **Counterspelling** card posts first and reduces the caster's successes (`_postSpellResistOrDoneCard` → same Resist Spell buttons).

**Spell Defense is declared per mage, on that mage's own client.** `rollInitiative()` ends by
calling `SR3EActor.promptSpellDefenseDeclaration(combatants)`, which fans one
`sr3e.spelldefense.declare` query out per Sorcery-capable actor to `SR3EQuery.deciderFor(actor)`;
the handler opens `SR3EActor.promptSpellDefenseFor` on that client, commits, and posts a summary
card so the GM can see what was taken.
- ⚠ **The asks are deliberately NOT awaited as a set.** Round start must never block on a human —
  an active-but-AFK mage would otherwise hold the table for the full query timeout. Firing them in
  parallel and letting each resolve on its own preserves the non-blocking behaviour the old shared
  card had. Do not "tidy" this into `await Promise.all(...)`.
- This replaced **one public chat card carrying a row per mage**, where whoever clicked Commit —
  in practice the GM, who advances the round — allocated every player's dice. Worse than the dodge
  equivalent, because Spell Defense commits **Spell Pool for the whole Combat Turn**.
- Unlike `sr3e.dodge.declare` and `sr3e.default.choose`, this handler **does write** — nothing is
  waiting on the answer to fold into a larger exchange. The writes still land on the GM
  (`commitSpellDefense` → `sr3e.actor.set`, `spendSpellPool` → `sr3e.pool.spend`).
- Covered by `tests/spell-defense.test.mjs`, including that each mage is asked on their own
  decider and that a mage who never answers does not block round start.
7. **Resist Spell** (`_postSpellSoakCard` → `handleSpellResistRoll`): target rolls the **spell's Target attribute** — the *same* `SR3EItem._parseSpellTarget` is reused so the resist attribute always matches the cast — **attribute only, no pool** — vs **TN = Force** (interactive). **Net = caster successes − resister successes** (`isSpellResist` branch in `_postWaveCard`): ≤ 0 → no effect; otherwise `stageDamage(base, net)` → **Assign Damage** button. **There is no separate soak** — the resistance test *is* the defence.
8. Drain resist: Willpower dice, two components (`SR3EItem.parseDrainFormula(drainStr, force, damageLevel)`):
   - **Power → TN** = ⌊Force/2⌋ + the **modifier outside the brackets** (the ½F base is implicit, not written; default +0).
   - **Level** = the nominated Damage Level + the **modifier inside the brackets** (`(+1)` or `(DL+1)`/`(Damage Level +1)` both = +1 stage; `(DL)`/`()` = +0; `(DL-1)` = −1).
   - e.g. **Manaball `(DL+1)`** at Force 6 / Serious → TN ⌊6/2⌋=3, level Serious+1 = **Deadly** → "3D".
   - *Legacy:* a code with an explicit `F` formula (e.g. `(F/2+1)S`) uses that as the TN; level = nominated level (or a bare letter for non-damaging spells). Stage down by Willpower successes.
   - Remaining drain = **Stun if Force ≤ Magic, Physical if Force > Magic** (SR3 RAW — the caster's Magic attribute, not Sorcery)
- Sheet displays as "available / total"

### Conjuring / Summoning flow (`SR3ESpiritSummoning.js`)
Wired in (Magic tab → summon). SR3 RAW:
1. **Summon dialog** (`openSummonDialog`): pick spirit type + Force + **Hold back dice** (0…Conjuring−1, saved for the Drain Resist). Live preview shows the drain level (Force-vs-Charisma table) and Stun/Physical. Reminder that totem/foci dice may be added.
2. **Conjuring Test** (`rollPool`, `isConjuringRoll`): pool = **Conjuring skill − held-back**, TN = **Force**. **Each success = one service** (straight success test — no spirit resistance). 0 successes → no spirit (Drain still applies).
3. **Drain** (always, even on failure): **Level from the Force-vs-Charisma table** (`SR3ESpiritSummoning._conjuringDrainLevel`: F≤½C Light, ≤C Moderate, ≤1.5C Serious, else Deadly — computed at cast), **TN = Force**, resisted with **Charisma + held-back dice** (`_postDrainCard` with `resistAttr:'charisma'`, `bonusDice`). Physical if Force > Magic, else Stun.
4. **Result** (`confirmSummoning`): "Confirm Summoning" button creates the spirit actor bound for *successes* services and adds it to the tracker **only if a combat is already running** (`game.combat?.started`) — summoning never starts/activates combat.

---

## Actor data model

### Key system fields (character/npc)
```
system.attributes.body.base / .value
system.attributes.quickness.base / .value
system.attributes.strength.base / .value
system.attributes.intelligence.base / .value
system.attributes.willpower.base / .value
system.attributes.reaction.value / .reactionBonus / .diceBonus / .override
system.attributes.essence.value     ← DERIVED: base − max(lost, installed cyberware)
system.attributes.essence.base      ← persisted starting Essence (6)
system.attributes.essence.lost      ← persisted PERMANENT loss; accumulates on install
system.attributes.magic.base / .value
system.wounds.stun.value / .max
system.wounds.physical.value / .max
system.woundMod                    ← derived, written by prepareDerivedData
system.derived.combatPool          ← derived
system.derived.availableCombatPool ← derived (combatPool − combatPoolSpent)
system.derived.spellPool           ← derived ⌊(INT+WIL+MAG)/3⌋, null if not Awakened
system.derived.availableSpellPool  ← derived (spellPool − spellPoolSpent), null if not Awakened
system.derived.initiative          ← derived (reaction + woundMod)
system.derived.initiativeDice      ← derived
system.combatPoolSpent             ← persisted, tracks pool usage mid-combat
system.spellPoolSpent              ← persisted, tracks spell pool usage mid-combat
system.equippedArmor               ← item ID string
system.equippedMelee               ← item ID string
system.karmaPool                   ← persisted
system.astralMode                  ← persisted: '' | 'physical' | 'dual' | 'astral'
system.matrixUserMode              ← persisted: '' | 'TRM' | 'AR' | 'VR-Cold' | 'VR-Hot'
system.recoilCompensation          ← persisted, cyber/body recoil comp (edited on Cyber tab)
system.roundsFiredThisPhase        ← persisted, recoil accumulator; reset each phase
```

### Item types and key fields
- `firearm`: `damage` (string e.g. "9M"), `category` (weapon code), `mode` (e.g. "SA/BF/FA"), `ammunition` (capacity string e.g. "15(c)"), `recoilMod` (weapon-mounted comp), `rangeOverride` ("S/M/L/E" metres, e.g. "5/15/30/50"), `loadedAmmoType` / `loadedRounds` (current magazine)
- `melee`: `damage` (string e.g. "9M"), `reach` (number), `category` (weapon code)
- `projectile` / `thrown`: `damage`, `category`, `quantity` (thrown weapons consume `quantity`; bows/crossbows instead nock a single arrow/bolt via `loadedAmmoType`/`loadedRounds` — see Bows & crossbows above). `projectile`/`thrown` use Strength-scaled range bands.
- `ammunition`: `ammoType` (key into `SR3E.ammoTypes`), `loadMechanism` (c/m/cy/b/d/sb/internal + arrow/bolt), `rounds` (stockpile total) + descriptive fields. NO power/armour data fields — rules are in config
- `armor`: `ballistic` (number), `impact` (number)
- `skill`: `rating`, `linkedAttribute`, `specialisation`
- `spell`: `type` ("Mana"/"Physical" — sets **only the damage track**: Mana → Stun, Physical → Physical; it does **not** set the resist attribute), `target` (sets the **resist attribute *and* the cast TN** — `W/B/I/Q/F`/number, suffixes stripped — `SR3EItem._parseSpellTarget`), `category` (**Combat = damaging**: shows the cast Damage-Level dropdown), `drain` (drain-Power/TN formula e.g. "(F/2)" or "(DL+1)" — level = nominated Damage Level ± a `DL` token), `range` (Touch/LOS; an **`(A)` suffix = area effect**, no separate flag), `duration`. **No damage code** — spell power = Force and the level is chosen at cast (the `damage` field is hidden/legacy; only `drain` is required for a complete spell).
- `drug`: reference-only item type (no roll/mechanic automation — the system has no drug rules yet). `category` (Pharmaceutical Compounds / Depressants / Designer Drugs / Hallucinogens / Magical Compounds / Narcotics / Stimulants), `addiction` (e.g. "2M", "4M+3P", "5M/5P" — M=Mental, P=Physical, all free text), `tolerance`, `effect`, `speed` (onset time), `vector` (delivery method), `availability`, `cost`, `streetIndex`, `bookPage`, `notes`. Populated via `scripts/macros/populate-drugs.js` into the `sr3e-drugs` compendium pack.

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
- `rollPool(pool, tn, label, options)` — entry point for all skill/attribute rolls
- `_rollWave(count, tn, isFirstWave, prevDice, explodeIdx)` — rolls one wave of dice
- `_postWaveCard(state)` — posts a chat card for a wave result
- `handleExplosionClick(payloadJson)` — static, handles explosion button clicks
- `spendCombatPool(amount)` — spends from available pool, returns actual spent
- `refreshCombatPool()` — resets combatPoolSpent to 0
- `_postSoakCard(payload)` — posts editable soak card for this actor
- `postSoakCard(actorId, payload)` — static wrapper, safe actor lookup
- `handleSoakRollClick(btn)` — static, handles soak roll button
- `postMeleeCard(ctx)` — static, posts boxing card
- `handleMeleeRoll(btn)` — static, rolls both sides and posts result
- `_rollDodge(targetActor, dodgeDice, dodgeContext)` — static, fires dodge roll
- `rollInitiative(options)` — rolls initiative; `options.physicalDice` skips virtual roll and prompts for manual entry

### SR3EItem
- `rollWeapon(tn, options)` — ranged attack flow (reads loaded ammo, fire mode, recoil; decrements magazine)
- `rollMelee()` — instance: melee attack flow → calls `rollMeleeAttack(this.actor, this)`
- `rollMeleeAttack(actor, atkWeapon)` — static: shared melee flow for a real Item OR a synthetic weapon (adjacency warn → boxing card)
- `_unarmedWeapon()` — static: synthetic "Unarmed Combat" attacker weapon ((STR)M Stun, reach 0, UNA). Built-in, not a real item; triggered from the Cyber & Unarmed sheet row (`rollUnarmed` action → `_onRollUnarmed`) and the canvas picker (`_sr3eReadyWeapons` appends it; `_sr3eFireWeapon` routes `_unarmed` items to `rollMeleeAttack`)
- `_buildMeleePoolInfo(actor, weapon)` — static: builds the boxing-card pool info. **Unarmed skill choice:** Unarmed Combat and Martial Arts (`MA:`-prefixed) skills are interchangeable — use the **highest-rated** among Unarmed Combat + all MA skills; default (interactive) only if none exist. The chosen skill's name is shown on the card.
- `promptDefaultChoice(actor, opts)` — static async: the **SR3 Default Table** dialog (specialization +3 / skill +2 / attribute +4). Returns `{ mode, pool, tnMod, allowPool, label }` or `null` (cancelled). `opts = { message, linkedAttr, title }`. See the **Defaulting** section.
- `_tokensAdjacent(aToken, tToken)` — static: true when tokens are in the same/adjacent square (melee range warn)
- `reload()` — firearm **or** nocked bow/crossbow: prompt a compatible stockpile, swap the magazine (capacity 1 for bows), subtract from stock
- `_usesNockedAmmo()` / `_weaponLoadMechanism()` / `_weaponMagazineSize()` — bow/crossbow nocked-ammo helpers (category → arrow/bolt, capacity 1); the latter two also cover firearms
- `_promptFireMode(availableModes, actor, weapon, isHeavy)` — static, fire-mode + editable recoil-comp dialog
- `_parseLoadMechanism(capacityStr)` — static, "15(c)" → 'c'
- `_parseMagazineSize(capacityStr)` — static, "15(c)" → 15
- `_promptReloadChoice(stock, weapon, magSize, trackOn)` — static, reload selection dialog
- `_getRangeBands(actor)` — range bands: override → fixed (firearms) → STR-scaled (bows/thrown)
- `_rangeBandForDistance(bands, metres)` / `_measureDistance(aToken, tToken)` / `_acquireCanvasTarget()` — static, range classification + token distance + canvas target
- `parseDamageCode(code)` — static, returns `{ power, level, isStun }`
- `stageDamage(base, netSuccesses)` — static, returns staged `{ power, level, isStun }`
- `_getEquippedMelee(actor)` — static, finds equipped/fallback melee weapon
- `_promptTarget(attacker)` — static, shows target selection dialog
- `_promptDodgeDeclaration(defender, attackerName, weaponName)` — static, defender commits dodge dice

### SR3ECombat
- `_nextTurnSR3()` — SR3 pass-based initiative advancement
- `_nextTurnSR2()` — SR2 flat queue advancement
- `endCombat()` — override, silently refreshes pools + clears Spell Defense / `tempMagicLoss` before ending

---

## CSS custom properties
```css
--sr-bg, --sr-surface, --sr-card   ← background layers
--sr-border, --sr-border-hi        ← borders
--sr-text, --sr-muted, --sr-dim    ← text colours
--sr-accent                        ← blue, primary interactive colour
--sr-gold                          ← #c8a040, used for karma/explosion/soak
--sr-green, --sr-green-bg          ← success/dodge success
--sr-red, --sr-red-bg              ← failure/damage/melee
--sr-amber, --sr-amber-bg          ← warnings/defaulting
--r, --r-lg                        ← border radius tokens
```

---

## Two-track Matrix system

The system supports two mutually-exclusive Matrix rulesets, toggled via the **`matrixRuleset`** world
setting (Configure Settings → System → Matrix Ruleset). **Changing this requires a full Foundry
restart** (`requiresReload: true`). A red warning is injected into the settings UI by the
`renderSettingsConfig` hook.

| Setting value | Ruleset | Sheet classes registered |
|---------------|---------|--------------------------|
| `'defragged'` (default) | **Matrix Defragged v2** | `SR3EHostSheet`, `SR3EICSheet` |
| `'orthodox'`  | **Orthodox SR3** (core book Ch. 8) | `SR3EHostSheetOrthodox`, `SR3EICSheetOrthodox` |

The character sheet (`SR3EActorSheet`) renders its Matrix tab differently depending on the setting:
- **Defragged** — Hacking Pool (INT+MPCP/3 from equipped cyberdeck item), node tracking, Overwatch.
- **Orthodox** — `system.orthodoxDeck.*` fields (MPCP, Active Memory, Hardening, Response, etc.),
  Loaded Programs list (program items with memory tracking), **Matrix Condition Monitor** (10-box
  track), Cyberdeck picker, Program picker (both read every pack declaring `cyberdeck` / `program`
  items via `SR3EItem._documentsOfType` — see the missing-packs warning below).
  Hacking Pool = `⌊(INT + MPCP) / 3⌋` via `system.orthodoxDeck.mpcp`.

**Key data model fields for Orthodox SR3 (on `CharacterData` / `NpcData`):**
- `system.orthodoxDeck.{ mccp, activeMemory, storageMemory, hardening, responseIncrease, ioPeed }` — persisted
  (⚠ the MPCP field is really named **`mccp`**; the sheet writes the UI's "MPCP" into it)
- `system.orthodoxRunState.{ hostId, hostName, securityCode, securityValue, securityTally, personaBod, personaEvasion, personaMasking, personaSensor }` — current run state
- `system.orthodoxMatrixCM.value` — Matrix Condition Monitor boxes (0–10); crash at 10 → dumpshock

**Compendiums (Orthodox only) — ⚠ currently missing.** `sr3e-odm-cyberdecks` and
`sr3e-odm-programs` are **no longer declared in `system.json` and their pack directories are gone**,
removed during the per-book pack restructure. Everything else on the Orthodox path survives — both
sheet classes, the `matrixRuleset` setting, and `scripts/macros/populate-odm-cyberdecks.js` /
`populate-odm-programs.js` — so the pickers described above have nothing to read from until the
packs are re-declared and re-populated from the ODM-\* rawdata. Fix this before doing any Orthodox
Matrix work.
- Program items store extra fields in `modules[0]` with `_odmType: 'orthodox'` (hardening, storageMemory, responseIncrease) since these don't map to the Defragged `CyberdeckData` schema.

---

## Matrix rules (Matrix Defragged v2)

### System Rating
- All Matrix-enabled devices have a System Rating (range 1–12, can exceed 12)
- Determines the **TN** for any action taken against a host or its assets
- Hosts: assigned by GM. Cyberdecks: equal to MPCP Rating. Other devices: Device Rating.

### Security Tiers
- All Matrix-enabled devices belong to a Security Tier
- Represented by a **colour** (flavour hint to deckers) and a **Security Threshold** (the actual firewall rating)
- Any hack attempt must generate successes **≥ Security Threshold**, or the action fails and the user's **Overwatch increases by 1**
- Cyberdecks determine their tier from their Firewall Rating

| Tier | Threshold | Colour | Description |
|------|-----------|--------|-------------|
| Ivory | 0 | Cream | No security. Toys and minor Matrix devices. |
| Blue | 1 | Blue | Low security. Public access: bus tickets, libraries. |
| Green | 2 | Green | Standard. Shops, petty outfits, public Matrix. |
| Orange | 3 | Orange | Challenging. Mid-size corps, corp offices. |
| Red | 4 | Red | Threatening. Classified info; agencies will kill to protect. |
| Black | 5 | Black | Dangerous. Top military/corporate/government SOTA. |
| Ultraviolet | 6 | Purple | Deadly. The Sixth World's greatest secrets. |

### Hacking Pool
- Formula: `Intelligence + ⌊MPCP / 3⌋` (MPCP = cyberdeck's MPCP Rating)
- Replaces the raw Intelligence roll — always pair with the appropriate skill

### User Modes and their effects
| Mode | Initiative | Biofeedback | Dumpshock |
|------|-----------|-------------|-----------|
| Tortoise (TRM) | Physical | Immune | — |
| AR | Physical | Immune | — |
| VR-Cold | Matrix (Rating + Xd6) | Stun overflow | Stun |
| VR-Hot | Matrix (Rating + Xd6) | Physical | Physical |

- Tortoise mode: +2 TN to all Matrix actions, immune to Biofeedback
- VR-Cold: overflow damage after stun track filled goes to physical; dumpshock = Stun
- VR-Hot: all damage physical; dumpshock = physical; uses Matrix initiative formula

### Hacking procedure (3 steps)
1. **Declare action** — attacker picks a node prompt (e.g. Duplicate/Download on DS)
2. **Check Security Threshold** — roll Hacking vs System Rating; need ≥ Security Threshold successes or: action fails + Overwatch +1
3. **Perform action** — if threshold met, action resolves (may require a second roll per the prompt's test field)

### Overwatch / Convergence
- Track: 10 boxes
- Each failed hack attempt (misses Security Threshold): Overwatch +1
- Box 10 = **Convergence**: Dumpshock attack (Power = System Rating) + GOD/corporate response + possible physical security

### Cybercombat procedure
1. **Attack** — attacker rolls Cybercombat + Hacking Pool dice vs TN = target's System Rating
2. **Defend** — defender rolls Cybercombat (or Firewall dice) vs same TN
3. **Compare** — net successes (attacker hits − defender hits)
4. **Determine damage** — base = IC Rating + level (e.g. "6S"); stage up by net successes (every 2 net = +1 stage)
5. **Resist** — target rolls Body (physical) or System Rating (Matrix entity) vs Power; each 2 soak hits = stage down

### IC / Agent rules
- **Firewall** = host's Security Threshold (not a separate stat on the IC actor)
- IC initiative is tier-based (derived in `_prepareIC`):

| Tier | Initiative formula |
|------|--------------------|
| Ivory | Rating + 0d6 |
| Blue | Rating + 1d6 |
| Green | Rating + 2d6 |
| Orange | Rating + 3d6 |
| Red / Black / Ultraviolet | Rating + 4d6 |

- IC grading (White/Gray/Black) determines lethality; Black IC deal physical damage
- IC act on their own initiative in the Matrix combat tracker (type = `ic` actor)

### Official IC/Agent types (by grading)
- **White**: ARis, Authenticator, Looper, Mr. Medkit, Scrambler
- **Gray**: Blaster, Crippler, Dataworm, Gemini, Hydra, Sparky, Tar Baby, Tracker
- **Black**: Killer, Ripper

### Matrix Condition Monitor
- 10 boxes (same click-to-toggle pattern as physical/stun wound track)
- TN penalties at 3/6/8/10 boxes filled (+1/+2/+3/crash)
- Not yet implemented as a separate track on the host sheet

### Sys/Sec modifiers
| Condition | Modifier |
|-----------|---------|
| Hardlined (physical jackpoint) | −2 |
| Tortoise mode | +2 |
| Using comms only | +1 |

### Host sheet implementation notes (SR3EHostSheet.js)
- `securityTierName` change auto-fills both `securityTierColor` and `securityTierThreshold`
- Overwatch track (10 boxes, gradient green→amber→red→gold) increments on failed hacks
- Box 10 = Convergence (gold border)
- Default topology mirrors the canonical host system map: SAN (top) → SPU (centre) → SN (left) / DS (right) / CPU (bottom); I/O (upper-right) hangs off SAN
- Node shapes: SAN=rectangle, SPU=hexagon, DS=square, **SN=circle**, CPU=doubleHexagon, I/O=triangle

---

## Electronic Warfare — Flux / Footprint / ECM / ECCM / MIJI (R3 p.36-40, 137-138, 144-145)

A parallel-to-combat electronic-warfare layer for riggers. **Hybrid stat placement:**
- **Rigger (character/npc)** `system.ew`: `deckRating`, `fluxRating`, `protocolModule`. Edited on
  the **Matrix tab** ("Rigger — Electronic Warfare" block). Electronics(EW) skill (an Electronics
  specialisation) drives every roll.
- **Vehicle (network hub)** `system.ew`: `ecm`, `eccm`, `fluxRating`, `footprint`; plus
  `system.signalMonitor.{command,simsense,system}` (0-10 each) and `system.infiltration`
  (`intruderActorId`, `turnsRemaining`, `intrusionFactor`, per-channel `command/simsense/system`
  booleans). All on the vehicle sheet's **Electronic Warfare tab**.

**Complementary dice** = the **full rating, uncapped**, added as extra pool dice
(`_complementaryDice`). R3 states the quantity three times and never bounds it by the primary
skill: the MIJI intruder's Flux (p.37), the MIJI defender's Flux (p.37), and the rigger's EW
skill on ECCM regeneration (p.40).
⚠ **Not SR3 p.97's Complementary Skills mechanic**, which is a separate test converting at
2 successes → 1. R3 says "dice", repeatedly, so R3's reading is what is implemented — the
maintainer's call, 2026-08-14. Switching to 2:1 would be a second roll, not a tweak.
⚠ **Granted to the MIJI Test and ECCM regeneration only.** Infiltration rolls the EW skill
alone — R3 scopes the allowance to "this part of the test" (p.37), and its worked example has
Trixie roll 6 dice on Flux 8 (p.36-37).
**Footprint** derived = `round((riggerDeckFlux + vehFlux + ECM) / 10)`; "↻ Recalc" writes it into
the editable field. Targeting the vehicle's Sig uses TN = Sig − Footprint.

**Signal Monitor** (`_signalChannel`/`_signalTier` on the vehicle sheet) is a 10-box track per
channel. Each row has an **Infil** toggle (`signalInfil` → flips `system.infiltration.<channel>`,
the same per-channel breach flag the infiltration roll/panel use) and **+1 / −1** degradation buttons
(`signalDamage`). **Until a channel is infiltrated its boxes and ±1 buttons are faded + locked**
(`.signal-faded`, plus a guard in `_onSignalBox`/`_onSignalDamage`); only Infil is clickable. MIJI
`applyDegradation` sets the breach flag true so a jammed channel never shows as locked. Degradation
tiers (`SR3E.electronicWarfare.degradationTiers`): 1-3 +1, 4-6 +2, 7-9 +3, 10 = channel lost.

**Degradation effects (R3 p.145) — how each tier modifier is applied:**
- **Simsense, VCR-jacked rigger = wound-equivalent (fully automatic).** `SR3EActor._jackedSignalMod`
  finds the drone the rigger is jumped into (`controlMode==='vcr'`, exclusive) and returns its
  Simsense tier as a +N TN penalty. It's folded into **every** `rollPool` (alongside `woundMod`, via
  a new `skipSignalMod` opt-out) and **subtracted from VCR initiative** in both `rollInitiative`
  sites (vehicle's own + the rigger's own). `_signalTierMod`/`_vehicleSimsenseMod` are the shared
  helpers. Simsense full (10) → `applyDegradation` posts a **Dumpshock** pointer for the jacked rigger.
- **Gunnery (vehicle weapons) — auto-prefilled, editable.** `_promptVehicleWeaponRollOptions` adds a
  "Shot type" select (Direct / Manual = Simsense / Indirect = System) that folds the firing vehicle's
  matching channel tier into the TN live (renderDialogV2 hook on `#vw-shottype`); only shown when a
  relevant channel is degraded.
- **Reference-only (no roll path / not modelled):** Command (Drone Comprehension, IVIS), Simsense
  Perception-through-drone, and System Smartlink-cancel. Surfaced via the vehicle EW tab's **Active
  Degradation Modifiers** readout (`_degradationReadout`, using each channel's `appliesTo`) and a
  reminder line on MIJI degradation cards — the GM applies them to those specific tests.

**MIJI** (`scripts/SR3EMIJI.js`, registered on `game.sr3e`): a **chat-card opposed contest**
cloned from the melee boxing card. `openAttackDialog(targetVehicle)` (vehicle EW tab → ⚡ MIJI
Attack) picks intruder vehicle + operation + channel; `SR3E.electronicWarfare.operations` maps each
operation to its allowed channels and the stat that sets the **defender TN** (`ecm` for Jamming,
`protocolModule` otherwise). Intruder TN = defender deck rating. Both sides get Flux complementary
dice. `postMIJICard` → `.sr-miji-roll-btn` → `handleMIJIRoll` resolves both rolls
(`_resolveRoll` loops `_rollWave` for full Rule-of-Six) → net successes; intruder win posts a
`.sr-miji-degradation-btn` → `applyDegradation` fills `signalMonitor[channel]`. Both buttons use the
`_checkBtn`/`_claimBtn` one-shot guards.

**Corner ownership reaches the rigger THROUGH the vehicle** — `vehicle.system.driverActorId`.
The contest is between vehicles, but the corners belong to the two riggers. A vehicle with no
linked driver has an owner of `null`, so its corner **fails closed to GM-only**, which is
correct (there is no player to ask) and deliberate: do not "fix" the greyed-out button by
widening the gate, or an unmanned drone's defence goes to whoever is nearest. The defender is
the rigger when there is one, else the vehicle itself — `postMIJICard` resolves that once and
carries it as `ctx.defenderName`, because the result card used to print the target *vehicle*
unconditionally and so credited an empty drone with its rigger's dice.

⚠ **`_pickEwSkill` is a RANKING, not `find`.** Three SR3 skills contain "electronic" —
`Electronics`, `Electronics B/R`, `Electronic Intelligence` — so the old
`items.find(n => n.includes('electronic'))` let **item order** decide a rigger's EW dice. It
also ignored the **Electronic Warfare specialisation**, which is a specialisation *of*
Electronics and whose `level` is its bonus, so Electronics 4 (EW +2) rolled 4 instead of 6.
Order: EW specialisation → plain `Electronics` → any loose match, highest rating breaking ties.
A loose match still counts (last) so nobody who had dice loses them. Pinned in
`tests/ew-skill.test.mjs`; the live dice totals are asserted in `tests/e2e/miji.spec.mjs`.

**Infiltration** (`openInfiltration`): EW + Flux comp vs TN 6 − (intruder Protocol − target Deck);
a second dialog lets the user freely allocate successes **three ways** (R3 p.37): channels breached
(1 each), **time reduction** (base 10 turns ÷ successes spent → `Math.ceil(10/time)`), and **Intrusion
Factor** — each its own input with a live spent/remaining counter (over-allocation is trimmed
Factor-then-Time on confirm; unspent successes are allowed). Writes `system.infiltration`
(turnsRemaining = the reduced time). `detectInfiltration` rolls the
defender's EW vs Intrusion Factor. The `updateCombat` round hook decrements every vehicle's
`turnsRemaining` (GM client); a manual −1 button is also on the tab.

**ECCM repair** (`openECCMRepair(vehicle, channel)`): ECCM + EW comp vs (attacker ECM/Protocol + 3);
each success removes one degradation box from that channel. **Reduce Footprint** (`reduceFootprint`):
EW vs (Footprint + 4); each success lowers vehicle Flux by 1, Footprint recomputes (retry +2 TN
applied manually). Vehicle-sheet actions: `signalBox/signalInfil/signalDamage/recalcFootprint/
mijiAttack/infiltrate/detectInfiltration/advanceInfiltration/eccmRepair/reduceFootprint`.

**Drone Comprehension Test** (SR3 p.157, `SR3EVehicleSheet.runDroneComprehension(vehicle)`): a
drone understanding a rigger's command. Simple fully-editable dialog — **Pilot Rating dice** (no
pool) vs a GM-set **TN** (default 4; complex orders 8+), with optional **secondary-drone +2** and
the vehicle's **Command-channel degradation** (auto-filled from `signalMonitor.command`, editable).
Rolls via `vehicle.rollPool` with a footer note (0 = no comprehension · 1 = literal · 2+ = leeway).
Not forced into any flow — accessed from the **📡 Drone Comprehension** button on the vehicle Stats
tab (next to Driving Test) and the **Vehicle Tools** Token-HUD button (see below).

**IVIS Test** (BattleTac, R3 p.96, `SR3EMIJI.openIVIS(rigger)`): a **rigger** test (not per-vehicle).
Setup dialog rolls **Small Unit Tactics (Vehicle Tactics)** vs **TN 5** (editable; +System-channel
degradation field). On success a second dialog splits the hits between **Comprehension bonus dice**
(announced — add them to the Drone Comprehension dialog's editable Pilot field) and the **IVIS
Pool**. The pool is a tracked resource on the rigger (`system.ew.ivisPool {value,max}`): shown in the
Matrix-tab EW block with **−1** (spend) and **Clear** (expire) buttons, **auto-refreshed to max each
Combat round** by the `updateCombat` hook. Launched from the **📶 IVIS Test** button in the rigger's
Matrix-tab EW block and a **tower-broadcast Token-HUD** button shown only on character tokens that
have a Small Unit Tactics / Vehicle Tactics skill. Sheet actions: `ivisTest/ivisSpend/ivisClear`.

**Vehicle Tools Token-HUD menu** (`_sr3eVehicleToolMenu` in sr3e.js): owned **vehicle** tokens get a
single satellite-dish HUD button that opens a picker of vehicle tools (currently Driving Test +
Drone Comprehension). Add new entries to the `_sr3eVehicleTools` array — they nest into the one
button so the HUD never sprawls. (`runDrivingTest` warns if the vehicle has no linked driver.)

---

## Two-corner cards — each side edits only its own half

Eight opposed-test cards (melee · astral · contested · cybercombat · MIJI · and the three
Orthodox Matrix ones) share **one** generic handler in `sr3e.js`, found by
`[data-twocorner="<kind>"]` and dispatched through the `_RESOLVERS` name→function table.
Each corner declares `data-corner-role` / `-owner` / `-label`; `SR3EActor.cornerActions()`
renders the per-corner `.sr-corner-submit-btn` and one `.sr-corner-resolve-btn`.

- **Both corners stay visible on every client; only your own is editable.** The lock sets
  `readOnly` on inputs and `disabled` on `<select>`s — two different branches, because
  `readOnly` does nothing to a dropdown. Collapsing them would leave every dropdown on
  every card editable by everyone and **no existing assertion would fail**.
- **Resolution is claimed by the submission that completes the set.** `sr3e.card.mark` is
  append-only and GM-serialised, so exactly one client can observe the ledger becoming
  full — that, not a lock, is what stops two near-simultaneous clicks double-rolling.
- **`.sr-corner-resolve-btn` ("⚔ Resolve now (GM)") is the AFK escape.** GM-only. It
  submits nothing; whoever has not answered falls through to the card's own defaults.
  Without it a card that moved a choice onto a player's client can stall for ever.
- ⚠ **Unsubmitted edits live in `_cornerDrafts`, and they have to.** The other side
  submitting writes the `acted` flag, which updates the message, which makes Foundry
  **rebuild the card from its payload** — throwing away numbers you dialled in while
  waiting. The map is keyed `messageId|role`, restored only into your **own** unacted
  corner, and dropped once that role submits. Do not remove it as redundant state: the
  bug it fixes is silent, and you submit dice you never chose.

### The setup dialog configures ONE side

`SR3EActor.openContestedDialog` sets the initiator's pool source, dice, TN and damage —
and, for the opponent, **only who they are**. Naming an opponent is the same act as
picking a target; choosing their dice is not. Their pool source is a dropdown in **their
own corner** (`SR3EActor.contestedSourceOptions`, built from *their* attributes and
skills), and the owner gate makes it read-only to everyone else.

⚠ This dialog used to set `#opp-source` / `#opp-pool` / `#opp-tn` / `#opp-damage` too, so
whoever clicked ⚔ Contested Roll on their own sheet decided how their opponent played.
`tests/e2e/contested.spec.mjs` asserts those four ids are **absent** from the dialog.

### Matrix cards — the Hacking Pool has TWO derivations

`availableHackingPool` comes from an **equipped cyberdeck ITEM** (Defragged).
`availableOrthodoxHackingPool` comes from **`system.orthodoxDeck.mccp`** on the actor
(Orthodox). An Orthodox decker owns no deck item, so the Defragged value is `null` for them
— and `?? 0` turns that into a silent zero rather than an error.

Three sites read the wrong one: the Orthodox System Test and Orthodox Cybercombat dialogs
offered **0 Hacking Pool to every Orthodox decker**, and `spendHackingPool` clamped every
Orthodox spend to 0, so allocating dice did nothing. Only the IC-attack card had it right,
and that disagreement is what exposed it. Always fall back across both:
`d.availableHackingPool ?? d.availableOrthodoxHackingPool ?? 0`.

### Both corners of an opposed card must be CHARGED, not just rolled

Cybercombat spent the attacker's Hacking Pool and never the defender's, built its dice from
the raw input while clamping the spend, and wrote with a bare `actor.update` — which fails
when resolution runs on a client that does not own that side. Use the pool helpers
(`spendCombatPool` / `spendHackingPool` / …): they route through `sr3e.pool.spend`, are
queued per actor, and **return what was actually deducted** — roll that, not what was typed.

### The Orthodox IC-attack dialog configures ONE side

`rollOrthodoxICAttack` names the target decker and sets the IC's own dice/TN. It used to
carry "Decker defense dice" and "Decker HP allocation" and commit the allocation before the
decker had seen the card — the GM spending a player's Hacking Pool, which does not come back
until pools refresh. The decker's dice and a `sr-icia-def-hp` field live in **their** corner;
the spend happens in `handleOrthodoxICAttackRoll` from what they submitted.
`tests/e2e/orthodox-matrix.spec.mjs` asserts those three ids are absent from the dialog.

### ⚠ A stale GM CLIENT breaks GM-routed fixes invisibly

Foundry runs every authoritative write on `game.users.activeGM` — usually a human's tab that
has been open for hours. Editing a file does not change what that browser already loaded, so
a correct fix applies everywhere except the client that executes it, and the caller just sees
a silently wrong number (a spend returning 0). Serving fresh files does not help.

`game.sr3e.loadedAt` records when each client loaded; the read-only query
`sr3e.debug.loadedAt` exposes it. The e2e preflight compares the active GM's stamp against
the files' mtime and fails with "reload <user>'s tab" — including when the GM cannot answer
at all, which is itself proof the tab predates the query.

## What is NOT yet implemented
- Full Defense (melee/ranged defensive posture — deferred)
- Vehicle sheets
- Matrix/hacking combat rolls (host sheet is GM reference/tracking only for now)
- Magic combat (spellcasting rolls exist, combat application not wired)
- Karma spending in character advancement
- Pool refresh prompts for astral/hacking pools (only combat pool currently)

---

## Known issues / watch out for
- 🔴 **`node --check` is USELESS on this codebase — use `npx eslint <file>` instead.**
  Every file under `scripts/` is an ES module in a `.js` file, and for those `node --check`
  **exits 0 on genuine syntax errors, printing nothing.** Verified 2026-08-10 against Node
  v24.18.0: a two-line `.js` containing `import {a} from './x.js'` plus an unescaped
  apostrophe inside a string passes `node --check` with exit 0, while the identical file
  saved as `.mjs`, or without the `import`, fails correctly. (Node can't parse it as
  CommonJS, re-parses as ESM, and the check silently stops reporting.)
  **This bit for real:** 11 broken string literals in `sr3e.js` passed `node --check` and
  were caught only by ESLint (`Parsing error: Unexpected token s`). Treat any past
  "syntax OK" from `node --check` on a `scripts/**/*.js` file as meaningless.
- **Do NOT pass `-c core.autocrlf=false` to git any more.** It was a workaround for
  Git-for-Windows setting `core.autocrlf=true` in its *system* config; line endings are now
  pinned in `.gitattributes` (`* text=auto eol=lf`) and the working tree matches the objects.
  Forcing the override makes git re-read the tree without the conversion the index was written
  under, so it reports phantom "local changes would be overwritten" on a clean tree and refuses
  to merge or rebase. `node_modules` is also no longer tracked — it never was needed at runtime
  (no bare imports in `scripts/`, no reference from `system.json`).
- **`system.json` changes require a full Foundry restart** — a browser reload is not enough. JS/CSS changes hot-reload; manifest/data-model changes do not.
- `prepareDerivedData` must initialise missing fields in-place: `if (!sys.x) sys.x = {}` not `const x = sys.x ?? {}`
- TypeDataModel defaults only apply to **newly created** documents — always guard reads with `?? defaultValue` for existing actors
- Circular import between SR3EActor and SR3EItem is broken via `game.sr3e` registry
- `DialogV2.render(true)` does NOT await user input — always use `DialogV2.wait()`
- Chat button handlers must use `renderChatMessageHTML` hook (v13), not `renderChatMessage`
- **Every chat-card button must be permission-gated at render time**, not just guarded by
  `_checkBtn`/`_claimBtn` — those stop *double* clicks, not *wrong-person* clicks. Cards are
  public by design, so without a gate any spectator can roll your dice. Helpers in `sr3e.js`:
  `_mine(p)` (any owner or GM — for buttons that post a card onward), `_isDecider(p)` (exactly
  one user — for buttons that **roll**), `_mineId(id)` / `_isDeciderId(id)` (same, for the many
  payloads that name their actor something other than `actorId`), `_mineAny(...ids)` (either
  side of a two-corner card), `_payload(btn)` and `_denyBtn(btn, why)`.
  ⚠ **Check the payload's actor key before gating.** `_payloadActorId` resolves
  `actorId → icActorId → vehicleActorId → wardActorId → targetActorId` **only**; a card using
  `deckerActorId`, `conjurerActorId`, `passengerActorId`, `targetVehicleId`, `defenderActorId`,
  `atkActorId` or `intruderRiggerId` **fails closed and becomes GM-only** unless you pass the id
  explicitly. `attackerActorId` is excluded on purpose — an attacker must never inherit rights
  over their target's card.
- Explosion button payloads must carry all context fields forward through every wave or final-wave logic loses context
- `renderCombatTracker` fires on every render — guard any DOM insertions with a class check to avoid duplicates (e.g. `if (!el.querySelector('.sr3e-chase-btn'))`)
