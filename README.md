# The 2nd Chumming (3e): Shadowrun 3rd Edition — Foundry VTT System
Unofficial Foundry VTT **v14** system for **Shadowrun 3rd Edition** and Matrix Defragged. 

## Installation
Under 'Game Systems', click Install System and paste the URL below into the Manifest URL field. This will install the system and associated compendiums.

```
https://raw.githubusercontent.com/darkbushido/The2ndChumming3e/refs/heads/main/system.json
```

Create a new world, select **The 2nd Chumming** as your system.

> Requires Foundry **v14** (`compatibility.minimum` and `verified` are both `14`).

## What to expect
- This is not a fully automated Foundry system, it will prompt, poke and nudge you, it will track wounds and modifiers, it will deal with initiative, it will reduce your - book-keeping and it will make it much easier to do the horrible bits like car chases and tracking a character's carry load. It is designed to show you what it is doing at - each stage so if you are looking to learn or brush up, this may help but you will need to know the basics. 
- Everything is editable at every stage, if you want to change the attribute, skill or TN used, you can.
- It definitely won't help you build your character but you can import one that you have made at Null Sheen dot com — see the Nullsheen importer section below.
- **Multiplayer-aware:** decisions are made by the player they belong to. Your dodge prompt opens on *your* screen, not the attacker's, and on a two-corner card each side edits only its own half.
---

## For developers

```bash
npm test                 # 15 dependency-free suites, no Foundry required
npm run lint             # ESLint
npm run setup:hooks      # once per clone — enables the branch-manifest git hooks
npm run manifest:branch  # stamp system.json's URLs to the current branch
```

⚠ **`node --check` is useless on this codebase.** Every file under `scripts/` is an ES module in a
`.js` file, and for those Node exits 0 on genuine syntax errors, printing nothing. Use ESLint.
---

## Dice rolling — Rule of Six & Rule of One
All rolls use SR3e success-counting (d6 ≥ TN = success).
- **Exploding dice** require an extra click — getting 15 successes in one click is boring and kills one of the most exciting moments in SR. Click to roll it again and add to its running total.
- **Rule of One** fires only when **every** die rolled comes up 1 (SR3 p.38: *"If ALL the dice rolled for a test come up 1s…"*). It is an automatic zero-success failure, and what follows is the GM's call — the book says *"the gamemaster determines whatever tone is appropriate."*
- There is **no second "critical glitch" tier**, and no threshold at *half* the pool — that is SR4's glitch rule, and at 3 dice it fires about twenty times more often than SR3 intends.
- Rolls prompt for TN and optional combat pool allocation before rolling.
---

## Physical Dice Support
- Shift-Clicking on dice icons / roll buttons will ask you to enter the number of successes; perfect if somone wants to use real dice. 

## Initiative tracking
- **SR3 mode** (default): Pass-based. Everyone acts once per pass in init order; subtract 10 after each pass. Repeat until all initiatives ≤ 0.
- **SR2 mode**: Flat queue. All action slots pre-built and sorted descending. Walk the queue top to bottom. (change in the setgting menu).
- Wounds automatically modify initiative rolls.
- Reaction is manually editable on the actor sheet to reflect cyberware, drugs, etc.
- Initiative results can be manually adjusted in the combat tracker for situational bonuses/penalties.
---

## Magic Users 
- Select the school, type, element or totem to hide/show relevant section in the magic tab. For totem users, advantages/disadvantages will be shown in the magic notes field.
- Spell dispelling button for quick dispell actions.
- Spell casting direct automatically triggers auto-filled drain tests.
- AoE spells allow multiple targets to resist damage. 
- Conjuring automatically triggers auto-filled drain tests and notes number of acts owed to the conjurer. 
Correct damage is reported.
---

## Astral state
- Astral state is tracked in the magic tab, initiative modifiers automatically applied.
- Weapon focus can be applied to any melee weapon toggled active/inactive for when you need to stay unseen.
- Astral combat button automatically uses the correct skills and report damage.
- Assensing button allow for quick assensing tests. 
---

## Physical Adepts
- Import skills from the Adept compendium. They come complete with notes and modified stats are tracked alongside your base stats so it is simple to know what you are looking at. 


## Riggers
- Select VCR, RCB and Autopilot control for your vehicles and drones, automatically modifying initiative and attacks.
- Add and use weapons with the appropriate skills selected automatically.
- Driving test button allows for quick vehicle maneuver tests.
- Chase Scene works out maneuver scores from km/h speeds and vehicle stats - no more km per combat turn. 
- Chase scene calculates TNs and dice pools for accel/dec, position etc - no more handwaving getaway chases.
---

## Deckers
- **Two Matrix rulesets**, chosen in Configure Settings → System → **Matrix Ruleset** (changing it needs a full Foundry restart):
  - **Matrix Defragged** (default) — the community supplement, described below.
  - **Orthodox SR3** — the core rulebook's Chapter 8 decking rules, with its own host/IC sheets, MPCP-based deck stats and a Matrix Condition Monitor.
- Track slot damage.
- Attack using programs.
- Drag/drop and eject programs with automatic updates to memory.
- When making a new program, the program size will be automatically reported. 
- Full compendium of programs. Just add the rating and drag it to your deck.
- 4 matrix modes are selectable. Hot VR mode modifies initiative rolls. 
- Degradable programs are tracked.
---

## Ranged combat
- Attacks show appropriate damage code and TN, target rolls auto-completed resistance tests. 
- **The defender declares their dodge *after* seeing the attack's successes** — that is RAW (p.112 step 4), and it is what makes dodge-vs-soak a real decision: pool spent dodging is gone from the Damage Resistance Test.
- **The dodge prompt opens on the defender's own screen**, not the attacker's. Same for spell defence and defaulting choices.
- A **tie goes to the attacker** — a clean miss needs dodge successes to *exceed* the attack's. Failed dodges are not wasted: their successes carry into the soak.
- If hit, the defender rolls auto-completed soak test, with Body dice and Combat Pool as **separate** fields — pool dice are charged, Body dice are not.
- **GM target-number window:** on a player's attack the GM gets the p.112 modifier checkboxes (cover, movement, visibility, smartlink…) grouped Target / Attacker / Conditions / Gear, summing live into an editable TN. Controlled by the **GM sets the Target Number** setting: *Player attacks only* (default), *Always*, or *Off*.
- AoE weapons allow multiple targets to resist damage. 
- Correct damage is reported.
- **Blast templates:** firing an AoE weapon (grenade etc.) on a scene lets you drop a blast circle on the map — everyone inside becomes a target with their distance from the epicentre worked out automatically (add walls for confined-space "Chunky Salsa" rebounds). Off-map, pick targets from a list as before.
- **Range** (firearms, bows/crossbows and thrown weapons): if the attacker and target are tokens on a scene set to metres, the system measures the distance and pre-fills the range band (Short/Medium/Long/Extreme) and its TN. Firearms use fixed range tables by category; bows and thrown weapons scale off the attacker's Strength. The band is an editable dropdown in the roll dialog — override it any time (e.g. a token wasn't moved). No tokens / no scale → set the range manually as before. Per-weapon range overrides are available on the item sheet.
---

## Attacking from the canvas
You don't have to open the character sheet to fire:
- **Token HUD:** select your token and click the 🎯 crosshair button. A picker lists your *ready* weapons (firearms with ammo loaded, equipped melee, thrown with quantity, bows) and fires the one you choose. Works for every player.
- **Hotbar macros:** drag a weapon from the sheet onto the macro hotbar to create a one-click "Fire: \<weapon\>" macro.
- Combined with target selection (the **T** tool) this gives a fast loop: *target the enemy → click your token → Attack → fire,* with range auto-measured.

> ⚠ **Hotbar weapon macros are script macros.** Foundry only lets a player *run* script macros if the GM has granted that player the **"Use File Browser / script macro"** permission (Game Settings → Configure Permissions → *Use JavaScript / Create Macro*). It's off for the basic Player role by default. The **Token HUD** attack button has no such restriction and works for all players — use that if you don't want to grant script-macro rights.
---

## Tokens & conditions
- **Wound bars on tokens:** new character/NPC tokens show Physical and Stun as bars that fill as damage is taken — condition at a glance without opening the sheet. (Existing actors: set their prototype-token bars once.)
- **Status icons:** Astral / Dual-Natured / VR (jacked-in) / Full Defense icons appear and clear automatically as you toggle those states; plus manual conditions (Sustaining a Spell, Dumpshocked) in the token HUD.
- **Auto KO/dead:** when a combatant fills a wound track they're marked defeated (and shown unconscious); physical overflow past Body shows the dead overlay. Heal them and it clears.
- **Rich text:** character Background/Notes support `@`-links to actors/items and inline `[[/r ]]` rolls — they display as clickable links; click **✎ Edit** to change the text.
---

### Melee combat
- Select your target and complete a contested roll. Loser completes an auto-completed soak roll, and the correct damage is reported.
- **Each side edits only its own corner.** The card shows both fighters, but your opponent's dice, TN and damage are read-only to you — and there is no shared "Roll!" button. Each side presses **Submit**, and whichever submission is last resolves the exchange. That makes it impossible for one player to roll for both.
- The GM keeps a **Resolve now** override, since an absent player would otherwise stall the exchange indefinitely.
- Reach is a target-number modifier, not a range gate: a defender with a shorter weapon still defends normally. Attacking from beyond melee range **warns rather than blocks**.
- The same two-corner flow is used by astral combat, contested tests, both cybercombat rulesets, MIJI electronic warfare, and the Orthodox System Test and IC Attack cards.
---

## Vehicles
- Vehicle actors track all standard SR3 attributes (Handling, Speed, Accel, Body, Armour, Sig, Autonav, Pilot, Sensor, Cargo, Load).
- Damage track is a single box (Condition Monitor derived from Body).
- Weapons can be added to vehicles.
- Characters can be linked to vehicles; VCR/rigger mode tracked per-actor.
- VCR mode modifies initiative rolls and gives pilot +8 penalty to physical rolls. 
---

## Armour
- Equip one armour item via the actor sheet. Only the equipped piece contributes to soak (helmets do not stack at present). 
- Armour type (Ballistic/Impact) is selectable at soak time.
---

## Storage
- Players can leave what they don't want to carry in storage, it is always clear who has what on them and what was lost when the player's base was robbed. 
- Weight is tracked so leave anything you don't need in storage by clicking on the home icon.
---

## Compendiums
Compendiums for weapons, spells, cyberware, bioware, adept powers, melee, armour and matrix programs are bundled with the system — **82 packs, one per source book per item type**, named `sr3e-<book>-<type>` (e.g. `sr3e-mm-cyberware`, `sr3e-r3-vehicles`). Three packs are system content with no book of their own: `sr3e-skills`, `sr3e-example-characters`, `sr3e-mr-johnsons-contacts`.

### Source books — turn off what you don't own
**Configure Settings → System → Configure Source Books** lists every book the packs come from and lets the GM switch each one on or off. Hidden books disappear from the compendium sidebar *and* stop offering their gear in the item pickers, so a table playing core-only never sees Cannon Companion cyberware in a dropdown.

- **On by default:** the SR2 line (`sr2`, `ct`, `ssc`, `st`, `fof`, `pna`) and the SR3 line (`sr3`, `cc`, `mm`, `mits`, `r3`, `sota`, `sota2`, `tal`, `twl`, `matrix-defragged`).
- **Off by default:** `fra`, `ger`, `ssg`, and `tss` (a fan publication).
- **Nothing is unloaded** — this is a presentation filter, so a character already holding gear from a hidden book keeps it.
- **Fails visible:** a pack with no book flag, or a book code the setting has never seen, defaults to *shown*. Adding a pack can never silently hide it.

⚠ Skills are hardcoded rather than packed, so no book toggle can hide them.
---

### Compendium picker
When you click an **Add** button on an actor sheet (e.g. **+ Add Firearm**, **+ Add Spell**), the system automatically searches every Item compendium pack belonging to this system for entries of that item type. If any are found, a searchable picker dialog appears — type to filter, select an item, and click **Add** to import it directly onto the actor with all fields pre-filled. A **— Create blank —** option is always available at the bottom if you want to start from scratch.

**Adding a new pack:** Declare it in `system.json` as a `"type": "Item"` pack, list the item type(s) it contains, and name the source book it came from. The picker and the source-book filter both read these flags — no code changes needed, but a full Foundry restart is required after editing `system.json`.

```json
{
  "name": "sr3e-cc-armor",
  "label": "Armor (Cannon Companion)",
  "path": "packs/sr3e-cc-armor",
  "type": "Item",
  "system": "The2ndChumming3e",
  "flags": { "The2ndChumming3e": { "itemTypes": ["armor"], "book": "cc" } }
}
```

**Pack naming convention:** `sr3e-<book>-<type>`. The book codes match the `BookPage` prefixes in the upstream character generator's gear data, so a future re-import lines up. A pack with **no** `book` flag is treated as system content and is always visible.

⚠ `path` points at a **directory** (LevelDB), not a `.db` file — NeDB `.db` packs are a v12-and-earlier format.

**Still missing:** `sr3e-ammunition` — the ammunition *code* is complete (types, loading mechanisms, magazines, reloads) but no pack ships the items yet, so **+ Add Ammunition** creates a blank. The Orthodox Matrix packs (`sr3e-odm-cyberdecks`, `sr3e-odm-programs`) are likewise undeclared, so the Orthodox deck/program pickers have nothing to read.

### Editing compendium packs

**The committed LevelDB under `packs/` is the source of truth.** There is no `src/packs/` JSON
tree — an earlier version of this README described one, along with a long unpack/repack command
list naming packs that no longer exist. Both were removed when the packs were split per source
book.

Two workflows are actually in use:

**1. Edit in Foundry (simplest, and what icon/typo fixes use).**
Compendiums → right-click the pack → unlock → edit entries → lock again. Foundry writes straight
to the LevelDB directory; commit `packs/<pack-name>/` as normal.

**2. `fvtt package` for anything bulk or scriptable.**
```
npm install -g @foundryvtt/foundryvtt-cli

fvtt package unpack -n sr3e-cc-armor --in packs --out /tmp/sr3e-cc-armor
#   ...edit the JSON/YAML...
fvtt package pack   -n sr3e-cc-armor --in /tmp/sr3e-cc-armor --out packs
```
Keep each entry's `_id` stable — that is its identity; filenames are for your convenience only.

⚠ **`.gitattributes` marks `packs/**` binary on purpose.** A few LevelDB internals (`CURRENT`,
`LOG`, `MANIFEST-*`) are pure ASCII, so git would otherwise "helpfully" rewrite their line
endings on a Windows checkout — which is fatal for `CURRENT`, as LevelDB then looks for a
manifest file whose name ends in a carriage return and the pack simply fails to open.

⚠ **The `populate-*.js` macros in `scripts/macros/` are mostly stale.** Most target the old
monolithic pack names (`sr3e-cyberware`, `sr3e-firearms`) which no longer exist, and fail at
`game.packs.get()` returning undefined. They were never used for the book split — that was done
by direct LevelDB manipulation. Treat them as reference for their inline data, not as a pipeline.

### Macro pack — currently missing

`sr3e-macros` is **not declared and its directory is gone**, so the macros it used to deliver
(including the Nullsheen importer below) have no in-system delivery mechanism. The sources still
live in `scripts/macros/`; import one manually as a script macro if you need it.

---
## Nullsheen importer

If you use [nullsheen.com](https://nullsheen.com) for character generation, you can import the exported JSON directly.

⚠ **The macro pack that used to deliver this is missing**, so it is not currently available from
Compendiums → Tools → Macros. Until that is restored, create a **script macro** in your world and
paste in the contents of `scripts/macros/import-sr3-character.js`, then run it, paste your JSON,
and click Import. (Script macros require the *Create Macro* permission, which is off for the basic
Player role by default — so this is normally a GM job.)

**What gets imported:**
- Attributes, metatype, nuyen, karma
- Skills (active, knowledge, language) with correct skill-group category
- Gear including firearms, melee weapons, armor, ammunition, and drugs
- Weapon mods — Gas Vent systems auto-apply recoil compensation; all other mods are noted on the item
- Cyberware and bioware
- Spells (category, type, range, drain all mapped from Nullsheen codes)
- Adept powers
- Contacts (imported as contact items with loyalty/connection from Level)
- Edges and flaws appended to the actor's Notes field
- Magical tradition name

**Not imported:** Vehicles are their own actor type — grab one from the compendium and modify it. Foci, initiations, and complex forms are not yet handled.

---

## Architecture

```
The2ndChumming3e/
├── system.json                    ← Foundry manifest (v14) + documentTypes + 82 pack declarations
├── lang/en.json                   ← Localisation strings
├── styles/sr3e.css                ← All styles, CSS custom properties
├── packs/                         ← 82 compendium packs (committed LevelDB), sr3e-<book>-<type>
├── archive/non-sr3-content/       ← 1,703 documents split out of the packs, parked for future modules
├── rawdata/                       ← Source JSON used to build compendiums (not loaded by Foundry)
├── tools/manifest-branch.mjs      ← Stamps system.json's url/manifest/download to a branch
├── .githooks/                     ← post-merge / post-checkout (see "Branch manifests" below)
├── tests/                         ← Dependency-free suites: `npm test`
└── scripts/
    ├── sr3e.js                    ← Entry point — models, classes, hooks, chat-button handlers
    ├── config.js                  ← SR3E constants, skill lists, SOURCE_BOOKS registry
    ├── SR3EQuery.js               ← GM-authoritative RPC (core user queries) — the socket layer
    ├── SR3ECombatModifiers.js     ← Ranged + melee modifier tables, visibility resolution
    ├── SR3ESourceBooks.js         ← Which books are in play; the single packAllowed() predicate
    ├── SR3ECompendiumDirectory.js ← Hides packs from disabled books in the sidebar
    ├── SR3EVehicleChase.js        ← Chase scene logic
    ├── SR3EMIJI.js                ← Electronic warfare: MIJI contest, infiltration, IVIS
    ├── SR3EClocks.js              ← GM Threat Clocks (persisted shared state)
    ├── data/                      ← TypeDataModel subclasses (7 actor types, 22 item types)
    ├── documents/                 ← SR3EActor, SR3EItem, SR3ECombat, SR3ESpiritSummoning, SR3EWard
    └── sheets/                    ← Actor, Item, Vehicle, Ward + Host/IC/Agent sheets
                                     (Host and IC have separate Defragged and Orthodox versions)
```

### Multi-client design
Decisions are made by the player they belong to, and **writes are performed by the GM**. Players
cannot update actors or chat messages they do not own, so anything that changes shared state is
relayed through `SR3EQuery` to the connected GM. Dodge declarations, spell defence and defaulting
choices open on the deciding player's own screen; two-corner cards record each side's submission
in a message flag so every client sees who has acted.

### Branch manifests
`system.json`'s `url` / `manifest` / `download` name a **branch**, so a playtest branch is only
installable if its copy points at itself. `npm run manifest:branch` stamps the current branch and
`npm run manifest:check` reports drift. `.githooks/post-merge` re-stamps after a merge so a
branch's URLs are never dragged into `main`; run `npm run setup:hooks` once per clone to enable it.

## Key design decisions

### Technical

| Decision | Reason |
|----------|--------|
| ApplicationV2 (not ActorSheet V1) | Foundry v14 removes V1 sheets; future-proof |
| TypeDataModel for all document types | Replaces deprecated template.json; typed defaults, schema validation |
| No Handlebars templates | Removes compile step; full JS type safety; easier to refactor |
| `data-action` static handlers | AppV2 pattern; clean separation of concerns |
| Single CSS file | Easier to maintain; all custom properties in one place |
| `game.sr3e` runtime registry | Breaks circular imports between SR3EActor and SR3EItem |

### Design philosophy

| Decision | Reason |
|----------|--------|
| Transparent mechanics | VTT is there to remind you what skills to use, how many dice to use, remind you of modifiers to apply and then do those calculations for you if you want. |
| Minimal guard rails | The GM is trusted. Players are adults. Edge cases and houserules should always be achievable without fighting the system. |
| No automation of outcomes | More dramatic, more deliberate, more fun. |
| Manual wound application | Everyone is aware of what happened, processes the results, and plans accordingly. A broken automated system kills a session; a manual one doesn't. |
| Interactive exploding dice | Getting 15 successes in one click is boring. Clicking to explode each die is one of the most exciting moments in SR — it stays manual. |
| Shift-click to bypass digital dice | Physical dice are more fun, VTTs aren't only for the terminally online |
| Matrix Defragged for Matrix | A modern, AR enabling system that keeps enough crunch and gear lust from the original but integrates it with the rest of the game, but mainly it's the system that I like. |


## What is not yet implemented
- **Full Defense** — the RAW two-stage defence is only half-built.
- **Knockdown**, **Charging**, and the multiple-targets rule outside full auto.
- **Ready Weapon as an action** — you can currently attack with a weapon you never drew, and
  firearms have no "equipped" concept at all (melee does).
- **Action economy** — the GM charges Simple/Complex actions by hand; the system knows which
  action was taken but does not spend it, and players cannot see what they have left.
- **Hands** — nothing stops you wielding a two-handed weapon and a pistol at once.
- **Martial arts maneuvers** — the styles and their maneuver lists ship as data, but no maneuver
  is implemented.
- **Ammunition compendium** — the code is complete, the content is missing.
- **Karma spending** in character advancement.

*(Flux and ECM/ECCM for vehicles and drones — previously listed here with "don't hold your
breath" — are now implemented: see `SR3EMIJI.js` for the MIJI contest, infiltration, signal
degradation, ECCM repair and IVIS.)*


## Legal Disclaimer

**Shadowrun** is a registered trademark of The Topps Company, Inc. and/or its subsidiaries. The Shadowrun 3rd Edition rules, setting, and terminology are the intellectual property of The Topps Company, Inc. (currently licensed to Catalyst Game Labs). This project is an unofficial, fan-made Foundry VTT system for personal use and is not affiliated with, endorsed by, or connected to The Topps Company, Inc., Catalyst Game Labs, or any official Shadowrun rights holders. No copyright infringement is intended.

**The Matrix Defragged** is a Shadowrun 3rd Edition Matrix rules supplement available at [DriveThruRPG](https://www.drivethrurpg.com/en/product/481686/the-matrix-defragged). The Matrix rules implementation in this system draws inspiration from this work. All rights to The Matrix Defragged belong to its respective author(s) and publisher. 

All original code, design, and implementation in this system are released under the MIT License.
