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
├── system.json                   ← Foundry manifest + documentTypes declaration
├── lang/en.json                  ← Localisation strings
├── styles/sr3e.css               ← All styles, CSS custom properties
└── scripts/
    ├── sr3e.js                   ← Entry point: registers models, classes, hooks, button handlers
    ├── config.js                 ← SR3E constants
    ├── data/
    │   ├── ActorDataModels.js    ← TypeDataModel subclasses: CharacterData, NpcData, VehicleData
    │   └── ItemDataModels.js     ← TypeDataModel subclasses: all item types
    ├── documents/
    │   ├── SR3EActor.js          ← Actor: derived data, all roll/combat methods
    │   ├── SR3EItem.js           ← Item: skill/weapon/melee roll methods
    │   └── SR3ECombat.js         ← Combat: SR2/SR3 initiative, endCombat pool refresh
    └── sheets/
        ├── SR3EActorSheet.js     ← ApplicationV2 actor sheet
        └── SR3EItemSheet.js      ← ApplicationV2 item sheet
```

---

## SR3 rules implemented so far

### Dice rolling — Rule of Six
- All rolls are d6 success-counting (result ≥ TN = success)
- Any die showing 6 explodes — player clicks a button to roll that die again, adding to its total
- A die stops exploding when its running total ≥ TN (success, no more rolling needed)
- Glitch: more than half the original pool shows 1s (only first wave counts for glitch)
- Critical glitch: glitch AND zero successes
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
  `rollPool` `options.defaulting` flag is no longer set by any path (left in place, inert).
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

**Recoil** = `max(0, roundsBeforeThisShot − totalComp) × heavyMult` (BF adds its own +3 first). `totalComp = actor.system.recoilCompensation + weapon.system.recoilMod`, both editable inline in the fire dialog and persisted on confirm. Heavy weapons (LMG/MMG/HMG/MinG) double uncompensated recoil. Actor comp is edited on the **Cyber tab**; weapon comp ("Recoil Comp") on the firearm item. `roundsFiredThisPhase` resets each combat phase (`SR3EActor.resetRecoil`).

**Ammunition** — two-layer model (see also the ammo-architecture memory):
- *Stockpile*: ammo items are a reservoir (gear/ammo tabs show "Stock"). Fields: `ammoType`, `loadMechanism`, `rounds` (total owned). Rules live in `SR3E.ammoTypes` config, NOT on the item.
- *Magazine*: each firearm tracks `loadedAmmoType` + `loadedRounds`; magazine size is parsed from its capacity string (`15(c)` → 15). The weapons-tab ammo cell shows the capacity, a loaded badge, and a ↻ **Reload** button (`SR3EItem.reload`).
- *Reload*: prompts a compatible stockpile (matched by loading mechanism), full-swaps the magazine (leftovers discarded), and subtracts from the stockpile. When `trackAmmo` is off it only sets the loaded type (no stock math).
- *Firing* uses whatever is loaded; decrements `loadedRounds` when `trackAmmo` is on (warns, never blocks, when empty).
- *Type rules*: Explosive +1 / EX +2 power; Gel −2 power + Stun (attack time). APDS halves ballistic; Flechette unarmoured → level +1, armoured → effective armour ×2 (soak time, via `ammoType` carried into `_postSoakCard`). Anti-Vehicle sets `weaponOpts.avMunition` to bypass the vehicle Power/2. Tracer: FA-only, tracer rounds raise Level not Power, TN bonus shown as a manual note.
- *Loading mechanisms*: c/m/cy/b/d/sb/internal (`SR3E.ammoLoadMechanisms`); parsed from the gun's capacity string by `SR3EItem._parseLoadMechanism`.
- *Setting*: world setting `trackAmmo` (off by default) gates all counting/depletion.

**Thrown weapons / grenades** (`thrown` type, and `projectile` type with a thrown category — `SR3EItem._isConsumable`): carry a `quantity` and are decremented 1 per use (`_consumeThrown`) when `trackAmmo` is on. The weapons-tab thrown section shows `×qty`. Bows/crossbows are never consumed.

**Empty = inoperable** (when `trackAmmo` is on): `rollWeapon` bails at the top if a firearm has `loadedRounds ≤ 0` or a consumable has `quantity ≤ 0`. The roll dice icon is rendered faded + struck-through (`_itemControls` `rollDisabled`, gated by `SR3EActorSheet._weaponOutOfAmmo` for firearms / inline for thrown). The Reload button stays active so you can refill.

**Vehicle-mounted weapons** keep their own AV-munition checkbox in the `🚗` firing dialog — they do **not** use the clip/reload system (built for vehicle-vs-vehicle). Character firearm dialogs no longer have a manual AV checkbox (driven by Anti-Vehicle ammo type).

### Range (firearms, bows/crossbows, thrown)
Auto-measured from tokens when available, otherwise manual. Applies to `firearm`/`projectile`/`thrown` in the single-target `rollWeapon` path (AoE/grenades use the scatter flow instead).
- **Distance**: `SR3EItem._measureDistance(aToken, tToken)` via `canvas.grid.measurePath` (scene units assumed **metres**). Attacker token = `actor.getActiveTokens()[0]`. Target token = the single canvas target (`game.user.targets`) if present, else the chosen actor's first token. Target acquisition: `SR3EItem._acquireCanvasTarget()` (one canvas target → skips the actor dialog), else `_promptTarget`.
- **Bands**: `SR3EItem._getRangeBands(actor)` → weapon `rangeOverride` ("5/15/30/50") → fixed metre table `SR3E.weaponRanges[category]` (firearms) → Strength-scaled `SR3E.weaponRangeMultipliers[category]` × effective STR (bows/thrown).
- **Classify**: `SR3EItem._rangeBandForDistance(bands, metres)` → `{idx,label,tnMod,beyond}`. TN modifier from `SR3E.rangeTN` = `[0,1,2,5]` (Short 4 / Medium 5 / Long 6 / Extreme 9). Beyond Extreme warns but still allows.
- **Override at fire time**: range is NOT pre-baked into `extraTNMod`; it's passed to `_promptWeaponRollOptions` as `rangeInfo` and rendered as an editable **Range dropdown** (pre-set to the measured band, shows measured metres). Changing it recomputes the TN live via a `renderDialogV2` hook guarded by `#sr-range`. The TN field stays the authoritative value on confirm.

### Attacking from the canvas
Two entry points besides the sheet (both fire ready weapons via `_sr3eReadyWeapons`: firearms with ammo loaded when tracking, equipped melee, thrown w/ quantity, bows):
- **Token HUD** (`renderTokenHUD` hook, sr3e.js): adds a 🎯 crosshair button on owned character/npc tokens → `_sr3eQuickAttack(actor)` opens a weapon picker (or fires directly if only one ready) → `_sr3eFireWeapon` dispatches `rollMelee`/`rollWeapon`. Works for all players (system code, not a macro).
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
- *(Dead/unused after this rework: `_promptTargetsAoE`, `_tokensInBlast`, and the old `aoeTargetIds`-gated branch in `_postWaveCard` — left in place but never reached. Spell AoE still uses its own manual target dialog.)*

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

### Damage staging
Power (number) + Level (L/M/S/D) + optional Stun flag
- Each 2 net successes = +1 stage (L→M→S→D)
- Once at D, each additional 2 successes = +1 power
- Stun damage goes to stun track; physical to physical track
- GM applies manually

### Combat pool
- Derived: ⌊(QUI + INT + WIL) / 2⌋ + wound modifier
- Tracked via `combatPoolSpent` on actor system
- Available = derived − spent
- Spent when allocated to attack, dodge, or melee
- Refreshed at end of combat (GM prompted: "Refresh all combat pools?")

### Magic pool (Awakened characters only)
- Derived: ⌊(INT + WIL + MAG) / 2⌋ + wound modifier
- Tracked via `magicPoolSpent` on actor system
- Available = derived − spent
- Spent when allocated to spellcasting
- Null / hidden for non-Awakened actors (Magic attribute = 0)

### Spellcasting flow
1. Caster clicks "Cast" on a spell row (magic tab)
2. Choose Force dialog — note shown if Force > Sorcery (drain becomes Physical)
3. Select targets dialog — checkboxes, shows Essence or Body TN per target
4. Allocate Magic Pool dice dialog (if any available)
5. Roll Sorcery + Magic Pool dice vs TN = target Essence (Mana spells) or Body (Physical spells)
6. Rule of Six applies throughout
7. On final wave (allDone):
   - 0 successes: spell fizzles — no damage, but drain button still posted
   - 1+ successes: stage damage up (base = Force + level, every 2 hits = +1 stage)
   - Each target gets a "Resist Spell" button
   - Caster always gets a "Resist Drain" button
8. Target resist: Willpower (Mana) or Body (Physical) dice, TN = Force, stage down
9. Drain resist: Willpower dice, TN from parsed drain formula (min 2), stage down
   - Remaining drain = Stun if Force ≤ Sorcery, Physical if Force > Sorcery
- Sheet displays as "available / total"

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
system.derived.magicPool           ← derived ⌊(INT+WIL+MAG)/2⌋+wm, null if not Awakened
system.derived.availableMagicPool  ← derived (magicPool − magicPoolSpent), null if not Awakened
system.derived.initiative          ← derived (reaction + woundMod)
system.derived.initiativeDice      ← derived
system.combatPoolSpent             ← persisted, tracks pool usage mid-combat
system.magicPoolSpent              ← persisted, tracks magic pool usage mid-combat
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
- `projectile` / `thrown`: `damage`, `category`, `quantity` (thrown weapons are consumed on use; bows are not — see Firearms section). `projectile`/`thrown` use Strength-scaled range bands.
- `ammunition`: `ammoType` (key into `SR3E.ammoTypes`), `loadMechanism` (c/m/cy/b/d/sb/internal), `rounds` (stockpile total) + descriptive fields. NO power/armour data fields — rules are in config
- `armor`: `ballistic` (number), `impact` (number)
- `skill`: `rating`, `linkedAttribute`, `specialisation`
- `spell`: `type` ("Mana"/"Physical"), `damage` (level letter e.g. "S" — power = Force at cast time), `drain` (formula string e.g. "(F/2)S"), `category`, `range`, `duration`

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
- `reload()` — firearm: prompt a compatible stockpile, full-swap the magazine, subtract from stock
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

## What is NOT yet implemented
- Spirit summoning (SR3ESpiritSummoning.js exists but is not wired in)
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
