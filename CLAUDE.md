# CLAUDE.md — Shadowrun 3rd Edition Foundry VTT System

This file gives Claude Code the context it needs to work on this project effectively.
Read it fully before touching any code.

---

## What this is

An unofficial Foundry VTT v13 system for **Shadowrun 3rd Edition**.
Built with **ApplicationV2** — zero Handlebars template files.
All sheet HTML is rendered directly from JavaScript using tagged template literals.

---

## Design ethos — read this first

- **Minimal guardrails.** The GM is trusted. Players are adults. The system presents the right information and dice but humans make all narrative decisions.
- **No automation of outcomes.** Damage is never applied automatically. The system announces what happened and the GM clicks wound boxes manually.
- **All stats are manually editable.** Edge cases, houserules, and situational modifiers should always be achievable without fighting the system.
- **No jQuery.** This is Foundry v13 — use native DOM throughout (`querySelector`, `addEventListener`, `querySelectorAll`). Never use `.find()`, `.val()`, `.on()`.
- **No Handlebars.** All markup lives in `_renderHTML()` as template literals.

---

## Foundry v13 API patterns — critical knowledge

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

**`DialogV2.wait()` does NOT call its `render` option.** To wire up event listeners inside a
`DialogV2` dialog (live filter inputs, row-click selection, etc.), use the `renderDialogV2`
Foundry hook instead. Guard with an element check so the hook only fires for your dialog,
then immediately remove it.

```js
let hookId = Hooks.on('renderDialogV2', (app, html) => {
  if (!html.querySelector?.('#my-filter')) return; // not our dialog
  Hooks.off('renderDialogV2', hookId);

  const filterInput = html.querySelector('#my-filter');
  const rows        = html.querySelectorAll('.my-row');

  // Live filter
  filterInput.addEventListener('input', () => {
    const q = filterInput.value.toLowerCase();
    rows.forEach(row => { row.style.display = row.dataset.name.includes(q) ? '' : 'none'; });
  });

  // Prevent Enter in filter triggering the default button
  filterInput.addEventListener('keydown', e => { if (e.key === 'Enter') e.preventDefault(); });

  // Row selection — store chosen value; optionally auto-submit
  rows.forEach(row => {
    row.addEventListener('click', () => {
      rows.forEach(r => r.style.background = '');
      row.style.background = 'color-mix(in srgb,var(--sr-accent) 20%,transparent)';
      html.querySelector('#my-hidden').value = row.dataset.value;
    });
  });

  filterInput.focus();
});

await foundry.applications.api.DialogV2.wait({ ... });
```

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

`_activateListeners` does **not** exist in the Foundry v13 parent chain — do not call it.
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
These are the source for `sr3e-cyberdecks`, `sr3e-programs`, `sr3e-ic`, and related packs.
**Do not touch MDF files when working on Orthodox SR3 Matrix features** — they are a completely
separate ruleset with different schemas and different game mechanics.

---

## SR3 rules implemented so far

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
  reintroduce it: at 3 dice it trips about twenty times more often than RAW.
- A single 1 is only *that die* failing — *"the test can still succeed as long as other dice
  succeed"* — so it needs no special handling beyond comparing against the TN
- Initiative never explodes interactively — resolved silently as a sum

### Defaulting (SR3 Default Table) — interactive

When an actor lacks the skill for a test, an **interactive dialog** asks how to default
(`SR3EItem.promptDefaultChoice(actor, opts)` → `{ mode, pool, tnMod, allowPool, label }`,
or `null` if cancelled). The three tiers from the SR3 Default Table:

| Default to | TN modifier | Dice pool | Extra pool dice |
|------------|-------------|-----------|-----------------|
| Specialization | **+3** | ½ the underlying skill's **base** rating (round down) | allowed |
| Skill          | **+2** | ½ the chosen skill's rating (round down)              | allowed |
| Attribute      | **+4** | full attribute value                                 | **not allowed** |

- "½ rating" **rounds down** (`Math.floor`). The dialog lists **all** of the actor's active
  skills / specialisations (the GM judges relevance — minimal guardrails) plus every attribute.
- A cancelled dialog **aborts** the whole action (returns `null`; callers bail).
- The TN modifier is **baked into the TN** at each call site (e.g. `tn + def.tnMod`); the old
  `rollPool` `options.defaulting` flag has been removed.
- "No pool dice" is enforced per-flow: combat/spell/hacking/control pool is offered only when
  `def.allowPool` (i.e. never for the Attribute tier).

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

### Initiative
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

### Astral state (Awakened characters)
Toggled on the Magic tab. Stored as `system.astralMode` (persisted):
- `''` — no state set (default)
- `'physical'` — explicitly Physical Plane (grey badge in combat tracker)
- `'dual'` — Dual Natured (amber "Dual Nat." badge)
- `'astral'` — Astral Projection (purple "Astral" badge); uses INT+20+1d6 initiative

Only one state active at a time; clicking the active button deactivates it.

### Ranged combat flow
1. Attacker clicks weapon on sheet
2. Target selection dialog (radio buttons, single actor)
3. (Firearms) Loaded ammo type is read from the weapon — no per-shot ammo picker. Power/level/stun mods (Explosive/EX/Gel) applied now; see **Firearms** section
4. (Firearms) Fire-mode dialog: SS/SA/BF/FA, recoil preview, editable compensation (see **Firearms**)
5. Roll-options dialog: TN, damage code, editable **range** dropdown (auto-measured from tokens; see Range section), TN-modifier breakdown (recoil, wound, multi-target, tracer note)
6. Defender declares: no dodge OR dodge with X combat pool dice (committed immediately, pool spent)
7. Attacker allocates combat pool to attack
8. Attack rolls (interactive Rule of Six)
9. On final wave: if dodge committed → "Roll to dodge" button appears; if no dodge → soak card auto-posts
10. Dodge roll (interactive Rule of Six, TN 4)
11. Dodge result: **binary** — dodge hits ≥ attack hits = complete miss; otherwise full hit lands
12. Dodge does NOT reduce staging. Net hits are irrelevant to damage. Full staged damage proceeds to soak.
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

**Recoil** = `max(0, roundsBeforeThisShot − totalComp) × heavyMult` (BF adds its own +3 first). `totalComp = actor.system.recoilCompensation + weapon.system.recoilMod`, both editable inline in the fire dialog and persisted on confirm. Heavy weapons (LMG/MMG/HMG/MinG) double uncompensated recoil; shotguns (ShtG) double it in **BF mode only** (SR3 p.111). Actor comp is edited on the **Cyber tab**; weapon comp ("Recoil Comp") on the firearm item. `roundsFiredThisPhase` resets each combat phase (`SR3EActor.resetRecoil`).

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

### Melee combat flow
1. Attacker clicks melee weapon on sheet
2. Target selection dialog. **Adjacency:** if both are tokens and the target isn't in an adjacent square (`SR3EItem._tokensAdjacent` via `canvas.grid.getOffset`), `rollMelee` **warns but proceeds** (minimal-guardrails). Reach affects TN only, not range.
3. Defender auto-uses equipped melee weapon (equippedMelee field), falls back to unarmed/cyber item, then bare hands (STR + M)
4. Boxing card shows both sides: skill name/rating, weapon, damage code, reach, skill dice, editable combat pool (0 default), editable TN
5. TN = 4 − reach (your own reach reduces your TN) + wound modifier
6. Both roll simultaneously when GM clicks Roll
7. Compare: winner = most successes. Tie = no damage.
8. Winner's weapon damage code stages up by net successes (winner hits − loser hits)
9. Loser gets Resist Damage button → soak flow as above

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
- **Deadly is the ceiling.** Surplus successes are discarded: *"Deadly damage is the
  highest level of damage possible"* (p.113). There is no rule converting them to Power,
  and inventing one is not cosmetic — **Power is the Damage Resistance TN**, so a phantom
  point makes the soak harder *and* the wound worse. A 9M weapon rolling 6 successes is
  **9D**, not 10D.
- Stun damage goes to stun track; physical to physical track
- GM applies manually

### Combat pool
- Derived: ⌊(QUI + INT + WIL) / 2⌋ + wound modifier
- Tracked via `combatPoolSpent` on actor system
- Available = derived − spent
- Spent when allocated to attack, dodge, or melee
- Refreshed at end of combat (GM prompted: "Refresh all combat pools?")

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
system.attributes.essence.value
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
- `endCombat()` — override, prompts pool refresh before ending

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
  track), Cyberdeck picker (from `sr3e-odm-cyberdecks`), Program picker (from `sr3e-odm-programs`).
  Hacking Pool = `⌊(INT + MPCP) / 3⌋` via `system.orthodoxDeck.mpcp`.

**Key data model fields for Orthodox SR3 (on `CharacterData` / `NpcData`):**
- `system.orthodoxDeck.{ mpcp, activeMemory, storageMemory, hardening, responseIncrease, ioPeed }` — persisted
- `system.orthodoxRunState.{ hostId, hostName, securityCode, securityValue, securityTally, personaBod, personaEvasion, personaMasking, personaSensor }` — current run state
- `system.orthodoxMatrixCM.value` — Matrix Condition Monitor boxes (0–10); crash at 10 → dumpshock

**Compendiums (Orthodox only):**
- `sr3e-odm-cyberdecks` — populated from `rawdata/ODM-Cyberdeck.json` via `populate-odm-cyberdecks.js`
- `sr3e-odm-programs` — populated from `rawdata/ODM-Programs.json` via `populate-odm-programs.js`
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

**Complementary dice** = `min(Flux, skillRating)` extra pool dice (no special mechanic).
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

## What is NOT yet implemented
- Full Defense (melee/ranged defensive posture — deferred)
- Vehicle sheets
- Matrix/hacking combat rolls (host sheet is GM reference/tracking only for now)
- Magic combat (spellcasting rolls exist, combat application not wired)
- Karma spending in character advancement
- Pool refresh prompts for astral/hacking pools (only combat pool currently)

---

## Known issues / watch out for
- **`system.json` changes require a full Foundry restart** — a browser reload is not enough. JS/CSS changes hot-reload; manifest/data-model changes do not.
- `prepareDerivedData` must initialise missing fields in-place: `if (!sys.x) sys.x = {}` not `const x = sys.x ?? {}`
- TypeDataModel defaults only apply to **newly created** documents — always guard reads with `?? defaultValue` for existing actors
- Circular import between SR3EActor and SR3EItem is broken via `game.sr3e` registry
- `DialogV2.render(true)` does NOT await user input — always use `DialogV2.wait()`
- Chat button handlers must use `renderChatMessageHTML` hook (v13), not `renderChatMessage`
- Explosion button payloads must carry all context fields forward through every wave or final-wave logic loses context
- `renderCombatTracker` fires on every render — guard any DOM insertions with a class check to avoid duplicates (e.g. `if (!el.querySelector('.sr3e-chase-btn'))`)
