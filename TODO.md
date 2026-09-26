# TODO

Durable backing store for the work list. Same principle as `audit/combat-audit.md`:
**this file is the progress**, not a cache. The in-session task list is ephemeral —
update this file when items change, and rebuild the task list from here.

Every file:line citation below was verified against the code at time of writing
(2026-08-04 onward; branches `Shadowfork` then `socket-combat`). Verify before
relying on any of them.

**Numbers are stable identifiers, not an order.** They are referenced from other
entries here, from ~30 commit messages and from CLAUDE.md, so they are never
reassigned. **This file holds only open work.** When an item is finished, put ✅ in its
heading with the commit that closed it and run `npm run todo:archive`: it moves to
[TODO-DONE.md](TODO-DONE.md) with its number, links to it are rewritten, and the Contents
table below is regenerated — do not edit the table by hand. Grouping is by *kind of work*
(the `###` headings); a new item goes under its group.

## Work order for 0.6 — set by the maintainer, 2026-09-15

The maintainer's order: finish the action economy, then #18, then the rest **easiest first** (the order
below is the agent's estimate). Built on `feature/action-economy` in the worktree
`The2ndChumming3e-work` unless noted; nothing is merged without the maintainer.

| # | Item | State / why it sits here |
|---|---|---|
| [48](#48) | The action ledger | ✅ built — `c03025c5`; Take Aim across phases still open inside it |
| [47](#47) | Ready Weapon, an equip control for firearms, Quick Draw | ✅ built — two-gun Quick Draw waits on #49 |
| [49](#49) | Hands | ✅ built — dual-wield billing, recoil crossover and matched razors still open inside it |
| [18](#18) | Structured weapon-accessory data (smartlink, smart goggles, laser) + gyro | ✅ built — `smartgun`/`laserSight` fields; gyro on recoil, then movement |
| [23](TODO-DONE.md#23) | Ammunition compendium | ✅ closed — 661 docs, all 8 types; found and fixed loose rounds not loading non-clip guns (`c8e04eff`, main) |
| [55](TODO-DONE.md#55) | `trackAmmo` on by default | ✅ — new worlds on; existing worlds pinned off; weight raised as #126 |
| [57](TODO-DONE.md#57) | Shotgun choke and spread (p.117) | ✅ — shot ammo type, choke on the gun, spread from the range |
| [56.1](TODO-DONE.md#56) | Smartguns waste no rounds (p.116) | ✅ `74372f9d` |
| [56.2](TODO-DONE.md#56) | Remember who you shot at this phase | ✅ — prefills the ordinal and the walking metres |
| [78](TODO-DONE.md#78) | Quick Strike acts first in a pass (MITS p.151) | ✅ — ⚡ on the tracker row; a queue move, no initiative write |
| [38](TODO-DONE.md#38) | Multiple targets — the leftovers (melee, per-attack pool) | ✅ — both were already done (the archive's intro was stale); the melee count is now prefilled from #56.2's record |

**All of the above is merged to `main` (`783025cc`) and awaits the live check in TESTING.md §40** — 47, 48,
49 and 18 (and 124) stay open until it is done.

### The rest of 0.6 — added by the maintainer, 2026-09-15

| # | Item | Status |
|---|---|---|
| [119](TODO-DONE.md#119) | Audit *The Matrix Defragged v2* | ✅ — 8 confirmed, 3 doc fixes, 2 code fixes, 1 unreadable table; remainders → #128 |
| [126](TODO-DONE.md#126) | Ammunition weight and a carried load | ✅ — per-round weights; ⚖ Carried on the Gear tab with the p.274 tiers |
| [53](TODO-DONE.md#53) | The "Essence hole" surgery option — *M&M p.150* | ✅ — removal records a hole; an implant ticked Essence Slot spends it |
| [109](TODO-DONE.md#109) | Cyberware, bioware and Attribute Stress — *M&M pp.124-131* | ✅ — Stress Points, Levels and the Stress Test; ⚙ Apply Stress on the Cyber tab |
| [110](TODO-DONE.md#110) | Move-by-wire's TLE-x | ✅ — the Automatic Stress Table, the Willpower test, and the flag with its two surgeries |
| [111](TODO-DONE.md#111) | Chronic Dissociation Syndrome — cyberzombies | ✅ — Essence below 0, the CDS table, and the GM's check |
| [79](TODO-DONE.md#79) | A ledger for karma and nuyen | nice to have |
| [82](TODO-DONE.md#82) | A flow for buying gear — *Availability, SR3 pp.284-286* | nice to have |
| [7](#7) | More test coverage for combat, initiative and pools | nice to have |
| [127](#127) | Tagged releases, with the guides versioned beside them | in 0.6 — built on `feature/release-pipeline` |

**Built 2026-09-16 on `feature/0-6-rules`** (branched from `main` at `5e26b2b1`, not merged): 53, 126,
119, 109, 110, 111 — in that order, each with tests, docs and its own commit. What is left of 0.6 is the
three nice-to-haves (79, 82, 7) and the release tasks below.

### Release tasks — before `system.json` becomes 0.6.0

1. **[121](#121) — check the code's rules against *sr3-guides*.** It is the maintainer's standing rule for
   every version bump, and it is **part of this release**. Run it after the last code change, so the audit
   covers what actually ships. The PDFs are the authority, and every difference goes to the maintainer.
2. The live checks in TESTING.md §40 are done, and 47, 48, 49, 18 and 124 are archived.
3. **Only then bump `system.json` to 0.6.0** — the maintainer: *"don't bump the version to 0.6 until we are
   ready to push it up"*. Nothing is pushed unless the maintainer asks.
4. **[127](#127) — the first tagged release.** Tag `v0.6.0` and push it; set Pages to the `gh-pages` branch;
   hand the players the new guides URL.

## Contents

**44 open.** 132 done — see [TODO-DONE.md](TODO-DONE.md).

| Group | Open |
|---|---|
| 🔵 In progress | [93](#93) 🧪 Test in Foundry — everything on branch `fix/racial-mods` |
| 🔴 Confirmed bugs, still open | [135](#135) Characters should start with nothing equipped<br>[136](#136) A character who started with grenades always seems to have one equipped<br>[137](#137) The damage chat card assigns damage again after the player already assigned it through the popup<br>[138](#138) The healing button moves when a character is unconscious or damaged<br>[139](#139) A medkit can be restocked in combat — restocking should happen when shopping<br>[140](#140) The resist card's soak-hits section looks clickable — it should be greyed out<br>[141](#141) The second Simple Action does not flag and end the turn<br>[151](#151) Cyber weapons don't show up in the weapons list, and cannot be used in combat<br>[152](#152) Undoing an action only works on the second try<br>[161](#161) Flechette weapons — the two things the book does not settle<br>[163](#163) Launcher grenades and mini-grenades do not carry a blast<br>[164](#164) Non-damaging area grenades: how to show and use their area<br>[176](#176) Rules check 0.6.1 — Rules the guides state that the code does not implement |
| 📕 Rules not implemented | [47](#47) Ready Weapon is unmodelled — you can attack with a weapon you never drew<br>[48](#48) The GM hand-charges every action — most of them are knowable<br>[49](#49) Nothing models hands — what is held, and how many can be held |
| 🪄 Spells & drugs | [123](#123) Audit every shipped spell and the casting rules<br>[124](#124) Drug rules — addiction, tolerance and effects<br>[131](#131) Cover and visibility on elemental spells<br>[132](#132) Astral damage: dual beings resist with Body, not Willpower |
| 🖥 Matrix | [120](#120) A Matrix Defragged adapter for HoloSuite Hacking (fork)<br>[128](#128) Overwatch's crash trigger, Suppression, and the Security Sheaf's Trigger Steps<br>[130](#130) Store implant names plainly, with the rating only in the field |
| 📦 Content gaps | [9](#9) Re-add the archived fan books and conversions<br>[11](#11) Restore the sr3e-macros pack (and the character importer's delivery)<br>[19](#19) Convert the SR3 GM Screen into a compendium — as data, not page images<br>[83](#83) Mr Johnson's Little Black Book<br>[84](#84) Audit all 62 Little Black Book contacts against the book — *p.36-67*<br>[85](#85) Review `devdrawdiy/sr3e` for functionality we lack<br>[86](#86) The Little Black Book contacts' cyberware does nothing<br>[91](#91) Core gear that ships nowhere — eight item types with zero documents<br>[92](#92) Repeat the gear audit for the other default-on books<br>[104](#104) Art for the vehicles<br>[117](#117) Every shipped document must carry a book and page<br>[125](#125) Evaluate shadowrun2e.com as a source for 2nd-edition gear |
| 🔧 Tooling & infrastructure | [7](#7) Expand test coverage for combat, initiative and pools<br>[18](#18) Structured gear data for weapon-accessory TN modifiers<br>[105](#105) Tie vehicle passengers to the Rideable module<br>[121](#121) Check the code's rules against *sr3-guides* on every version bump<br>[127](#127) Tagged releases, with the guides versioned beside them |
| 🧹 Housekeeping | [6](#6) Open upstream bugs and PRs for the pushed non-Shadowfork branches |
| 🗂 Unsorted | [153](#153) Give the 📒 Ledger its own tab on the character sheet<br>[154](#154) 🛒 Buy gear: search the compendium, or drag an item in |
| 📌 Notes & parked | combat-audit questions · known drift · ODM/MDF |

### 🔵 In progress

## 93. 🧪 Test in Foundry — everything on branch `fix/racial-mods`

**Status 2026-09-13:** first pass done by the maintainer; most of the second pass walked by the
agent in the Browser pane and Playwright (see each line). Still open: a real non-troll export,
ramming passengers with a staged-down soak (dice-dependent; unit-tested), an adept troll's
Attribute Boost (no such actor in the test world). Unit tests 43/43, mutants 69/69, e2e 19/19.

**Simulated combat (e2e, `npx playwright test`) — ✅ 18/18 passed, 2026-09-13 (8.7 min)**, run by
the agent with nobody else connected (Player2 attacking, Player3 defending, mcp-api as GM): ranged,
melee, astral, contested ×2, spellcasting, cybercombat ×2, MIJI ×2, Orthodox Matrix ×3, essence ×2,
migrations ×3. A first attempt earlier that morning showed 5 failures (astral, contested ×2,
cybercombat ×2), each dying in 3 ms–7 s — before the clients had joined, so not a code fault; the
run was stopped for a reboot and all five passed afterwards, alone and in the full run. The branch started as the racial-
modifier fix reported in play (a troll allocated B5 Q5 S4 C2 I3 W2 imported at those numbers
instead of B10 Q4 S8 C0 I1 W2) and grew to cover TODO 36, 73, 74, 75, 94, 96, 98 and 99.

### Before testing

1. ⚠ **Restart Foundry fully** (not F5) — TODO 75 added two item fields (`bonusImpact`,
   `bonusBallistic`) and TODO 74 a vehicle field (`passengerActorIds`); data-model changes are
   not hot-reloaded.
2. **Delete the "Import Nullsheen 3e Character json" macro, then reload.** The system copies it
   into a world once and never refreshes it; it is recreated from the fixed file on next load.
3. Only if a server installs from this branch: `npm run manifest:branch` and commit.

### First pass — what only Foundry can catch

These exercise new data fields, rewired dialogs and new chat buttons — the parts the unit tests
cannot reach. If time is short, do these.

- [x] **Import the reported troll** — Body `10 + 1 (11)` ✅ (2026-09-13). Quickness 4 shown as
      **4 − 1**: armour encumbrance, expected, but unexplained on the sheet → [#100](TODO-DONE.md#100).
      Strength 8, Charisma 0, Intelligence 1, Willpower 2, Magic 0, Reaction 2 ✅.
      ⚠ **Essence: imported 5.12 (correct); ↺ moved it to 5.29** — the import counts the alpha
      grade twice → [#101](TODO-DONE.md#101).
      Body 10, Quickness 4, Strength 8, Charisma 0, Intelligence 1,
      Willpower 2; a notification listing the modifiers, and a **permanent** warning that
      Charisma is below 1. Attributes tab: Body reads `10 + 1 (11)` (*Troll dermal armor*).
- [x] ✅ **Every attribute roll** — dropdown follows the attribute (troll: Strength 8, Body 11),
      2026-09-13. Dwarf checkbox not yet seen (no dwarf to hand). ⚠ After the run: dermal armor's
      *"works against any attack… does not aid in healing"* is **SR3 p.283**, not p.281 as cited in
      `config.js` (`racialDermalArmor`), CLAUDE.md and this file — ✅ corrected 2026-09-13.
      Original step: **Every attribute roll** (any character, not just a dwarf): click an attribute's roll icon,
      change the dropdown to another attribute → the pool follows it. The dropdown was rewired.
      On a **dwarf**, Body shows an **unticked** *Resisting disease or toxin: +2* box; tick → +2,
      switch off Body → it greys out.
- [x] ✅ **🎲 Success Test** — passes, 2026-09-13. Charisma 0 rolled as 3 / 1 dice → [#102](TODO-DONE.md#102), fixed.
- [x] ✅ Charisma block red, its roll shows 0 dice, Magic 0 not red (2026-09-13); Essence colour → [#103](TODO-DONE.md#103). **After reloading for #102:** the troll's **Charisma** block is **red** with ⚠, and its roll
      dialog shows **0** dice (rolling says *dice pool is 0*); Magic 0 shows 0 but is **not** red.
      Original step: **🎲 Success Test** (Attributes tab): type "Climb the fence", 6 dice, TN 4 → the card is
      titled *Climb the fence* and counts successes.
- [x] ✅ **GM window (TODO 94)** — 2026-09-13: Troll Street Dealer (NPC) shot New Runner (PC) → window
      opened ✅. Troll Street Dealer shot a SWAT Team Member (NPC vs NPC) → **window also opened**,
      where the default should skip it. Maintainer is fine with it. Not investigated — first check
      whether the setting is on *Always*, or either NPC has an explicit player Owner; if neither,
      it is a bug in `SR3EQuery.isPlayerCharacter`/`gmWindowOpens`.
      Original step: **GM window (TODO 94):** as the GM, attack a **player's** character → the modifier window
      opens. GM NPC against GM NPC → it does not. (Setting: *GM sets the Target Number* on its
      default, *Whenever a player's character is involved*.)
- [x] ✅ **Implant armour** — 2026-09-13: block shows, total B 3 / I 2; Impact override 0 → drops, cleared → back to B 3 / I 2 (the nullable field clears to empty, not 0). Original step: **Implant armour:** Armor Vest (2B/1I) + *Bone Lace, Titanium*. Armor tab → an *Implant
      Armour* block, total **B 3 / I 2**; shoot them → the soak card uses 3 Ballistic and names
      the lacing. On the lacing's sheet, type **0** in *Implant Armour → Impact* → the total drops
      to I 1; **clear the box** → back to 2. (Clearing must store "empty", not 0.)
- [x] ✅ **💥 Crash** — 2026-09-13: the damage flow works, and Cancel on the passenger dialog leaves
      the button usable. ⚠ **Layout bug (fix after the run):** in the Crash dialog the *Speed at
      impact (km/h)* label wraps onto a second line while *Power* and *Level* do not, so the three
      input boxes sit at different heights. ✅ Fixed 2026-09-13: label shortened to *Speed (km/h)*
      (full wording in its tooltip) and the row bottom-aligned.
      Original step: **💥 Crash:** vehicle sheet → add two passengers under Pilot → 💥 Crash → 50 km/h reads
      *42 m per Combat Turn → 5M*, everyone aboard ticked → **Post crash damage** → roll the
      vehicle soak → resist buttons for driver and passengers. Click one: a dialog with Body,
      Impact armour and *Seat belt*; Cancel leaves the button working; roll → *Assign Wound*
      names that passenger.
- [x] ✅ **Failed Driving Test** → a *💥 Crash* button on the card (2026-09-13). A successful one shows none — not yet seen.
- [x] ✅ **Troll Reach** — the melee card reads *Reach 2 (troll +1)* (2026-09-13). The Weapons tab shows
      the club's own Reach 1 — expected (natural Reach is the character's, not the weapon's); a
      combined display is a TODO 100 candidate. Reach is a TN modifier only (SR3 p.121), not a
      distance — a target 2 m away gets the adjacency warning. ✅ Melee GM window shows two vision
      dropdowns, one per fighter (2026-09-13). **First pass complete.**
      Original step: **Melee GM window, troll with a club vs unarmed human:** the troll's corner reads *Reach 2
      (troll +1)*; the GM window has **two** vision dropdowns, the troll's on *Thermographic
      (natural)*; Full Darkness → *visibility halves to +2 / +8*.

### Second pass

- [ ] Import an elf, dwarf or ork and compare with the generator's own sheet; import a human →
      no racial notification. *Covered by unit tests since 2026-09-13* (`importer.test.mjs` runs
      the real macro: the troll allocation re-imported as Dwarf/Elf/Ork/Troll with `raceBonuses`
      stripped matches the p.56 table; Human gets no notification; an unknown race warns). Still
      worth one real export per metatype, since the fixture is a troll's.
- [x] ✅ Mr. Johnson's *Dock Worker* (troll) shows Body **10 (11)** — agent live check, 2026-09-13,
      read from the pack document (base 10, value 11).
- [x] ✅ 2026-09-13: a temporary *Computer 4* (category *Matrix skills*) renders under **Active
      Skills** (Browser pane, on Ploder, removed after), and in `player-sheet.spec.mjs` the karma
      dialog prices Computer 4 → 5 at INT 4 at **10** — active ×2; as knowledge it would be 7.
      Original step:
      A decker's **Computer / Hacking / Cybercombat** now sit in the **Active** skills section,
      and the karma dialog prices raising them at the active rate.
- [x] ✅ Both halves, 2026-09-13. GM (Browser pane, throwaway character): *hobgoblin* shows as
      **hobgoblin (unrecognised)** in a working dropdown; editing another field keeps it. Player
      (`tests/e2e/player-sheet.spec.mjs`, Player2's own client): the dropdown is **disabled**, carries
      **no field name** (so the form cannot submit it), and shows *hobgoblin (unrecognised)*.
      Original step:
      **Species:** a player sees a greyed dropdown they cannot change; the GM gets a working one,
      and a stored "Hobgoblin" shows as *(unrecognised)* and survives editing another field.
- [ ] Unarmed troll vs human with a club: no reach election (1 vs 1). *Unit-covered*
      (`racial.test.mjs`: difference 0), and the card renders the election only when
      `reachDiff > 0`; not run live.
- [x] ✅ **Flechette** — agent live check, 2026-09-13 (`_postSoakCard` with `ammoType: 'flechette'`,
      armour briefly unequipped, restored after): Troll Street Dealer stays **8M** with *no level
      increase: dermal armor negates it (troll dermal armor)*; SWAT Team Member (ork) raised to
      **8S**. Dermal Plating / Orthoskin halves not run live (unit-tested in `racial.test.mjs`,
      `implant-armor.test.mjs`). Original step:
      **Flechette** at an unarmoured troll, and at an unarmoured human with Dermal Plating → *no
      level increase: dermal armor negates it*; the same shot at a plain unarmoured human raises
      the level. A human with only *Orthoskin[3]* → *Flechette vs armour — effective armour 4*.
- [~] ✅ Troll half — agent live check, 2026-09-13 (`_promptGMAttackWindow` opened directly for Troll
      Street Dealer): opens on **Thermographic (natural)** with *👁 Troll Street Dealer (troll):
      Thermographic (natural)*; Thermal Smoke → **Normal**; condition cleared → back to
      Thermographic; Low-Light picked by hand, then Thermal Smoke → **stays Low-Light**. The elf
      with replacement eyes not run live (unit-tested in `vision.test.mjs`). Original step:
      **Ranged vision:** the troll shoots (as a player) → the vision dropdown opens on
      *Thermographic (natural)* with a 👁 line; pick Thermal Smoke → it switches to Normal; pick
      one by hand → it stays. An elf with `Eyes, Cyber Replacement` + `Eyes, Low-Light` →
      *Low-Light (cybernetic) … racial low-light lost*.
- [x] ✅ **Crash Test** — agent live check, 2026-09-13: crash-mode dialog titled *Crash Test — Toyota
      Elite*; with the pool set to 1 and TN 30 it rolled 0 successes and posted *💥 CRASH! … Impact
      at 50 km/h (42.0 m per Combat Turn) → 5M Physical* with the vehicle soak button. Soak rolled 1
      hit (5M unchanged) → driver and both passengers offered **5M before belt and armour**. Messages
      deleted; nothing written to the vehicle. Original step:
      **Crash Test** from the 💥 dialog → the Driving Test dialog titled *Crash Test*; 0 successes
      posts the crash.
- [ ] **Ramming passengers:** if the rammed vehicle's soak staged the damage down, the passengers'
      buttons show the lower level; if it soaked it all, no buttons and a note saying so.
- [x] ✅ **Chase Scene** — agent live check, 2026-09-13: + Add Vehicle, pick Toyota Elite → Bruce Lee
      and SWAT Team Member listed, matching the vehicle's roster. Original step:
      **Chase Scene:** pick the vehicle for a participant → its passengers are already listed.
- [x] ✅ **TODO 101** — Essence working as expected after re-import (maintainer, 2026-09-13). Original step: **TODO 101, re-import:** delete the import macro, reload, re-import the troll → Essence **5.12**;
      press **↺** → it **stays 5.12** (was 5.29). The CyGun Shotgun's sheet shows 0.88 (base 1.1), Alpha.
- [x] ✅ **TODO 108** — agent live check, 2026-09-13: the election keeps *+2 to their TN* through a
      blur and a re-render, and resolution rolled TN 5 / TN 6 (both +2). See [#108](TODO-DONE.md#108).
- [x] ✅ **TODO 107** — vehicles can be removed with the ✕ (maintainer, 2026-09-13).
- [x] ✅ **TODO 106** — agent live check, 2026-09-13: Ploder given a temporary VCR rating 2, Toyota
      Elite → Driving Test offers *Using VCR (−2 TN, SR3 p.134)* (was −4); crash mode is titled
      *Crash Test*, has *Terrain (Crash Test)* Open −1 / Normal 0 / Restricted +2 / Tight +4, a
      *Vehicle speed (SR3 p.148)* row (+0/+1/+2/+4) and **no** VCR row. VCR removed after.
      Original step: **TODO 106:** Driving Test *Using VCR* reads **−(VCR Rating)**; the 💥 Crash Test dialog shows
      *Terrain (Crash Test)* (+2/+4) and a *Vehicle speed* row, no VCR row.
- [x] ✅ **Session Rewards / Chunky Salsa** — agent live check, 2026-09-13. Session Rewards: 4 rows,
      0 ticked, *All* ticks all 4; Award with nobody ticked (5 karma typed) warns *no characters
      were ticked* and no karma changes. Chunky Salsa from the sidebar: 4 rows, 0 ticked; Post with
      nobody ticked warns, posts nothing. Opened as the grenade flow does (`actorIds`, `returnOnly`)
      → its actor **ticked**. Original step:
      **Session Rewards / Chunky Salsa** open with nobody ticked; *All* ticks everyone; awarding
      with nobody ticked warns. A grenade in a confined space still opens Chunky Salsa with the
      caught actors ticked.
- [ ] Attribute Boost on an adept troll (if one is to hand) — the dermal +1 must not block it.

### Known, not fixed here

- Characters **already imported** before this branch keep their human-rated attributes. There
  is no way to tell an allocation from a finished rating after the fact, so there is no
  migration: re-import, or add the Racial Modifications Table (SR3 p.56) by hand.
- Dermal armor must not count for healing (p.283). There is no healing flow yet; the one
  planned in [#76](TODO-DONE.md#76) reads `body.base`, which never carries the dermal point. A Body roll
  from the sheet does include it.
- Implant armour ([#75](TODO-DONE.md#75)) ignores M&M p.33's reduction for characters with three or more cyber
  replacements, and cyberlimb body plating — the GM adjusts via the item's override boxes.
- Vision is detected by item NAME ([#99](TODO-DONE.md#99), [#36](TODO-DONE.md#36)) — the [#18](#18) gap — so it is a
  pre-selection the GM can change, never a locked value. Worn goggles are not detected.

<a id="94"></a>

### 🔴 Confirmed bugs, still open

## 135. Characters should start with nothing equipped

## 136. A character who started with grenades always seems to have one equipped

## 137. The damage chat card assigns damage again after the player already assigned it through the popup

## 138. The healing button moves when a character is unconscious or damaged

## 139. A medkit can be restocked in combat — restocking should happen when shopping

## 140. The resist card's soak-hits section looks clickable — it should be greyed out

## 141. The second Simple Action does not flag and end the turn

## 151. Cyber weapons don't show up in the weapons list, and cannot be used in combat

## 152. Undoing an action only works on the second try

The GM's ↺ Undo on the action ledger ([#48](#48)) has to be pressed twice before it takes effect.

## 161. Flechette weapons — the two things the book does not settle

1. **Dermal armour and an `(f)` code.** p.116: *"Dermal armor negates the Damage Level increase of flechette ammunition."* An `(f)` code has that increase
   baked in, so it is unclear whether dermal armour should take a level back. Today the card only says so and leaves it to the GM.
2. ~~A flechette weapon firing other ammunition.~~ **Ruled 2026-09-24 (`a810e8d7`), the maintainer: a flechette weapon cannot load other ammunition types.** The reload list offers a weapon carrying the flechette rules only ordinary rounds.

Also not covered: `(f)` on `ammunition` items (Anti-Personnel HRR Grenade, AP Mortar Round B, the AP minigrenades, Directional A-P Mine) and on the
`vehicleweapon` Flechette Gun — they are not weapons carrying the box, and their loaded type is handled by ammunition rules.

**Still open:** item 1 — the maintainer is reading the flechette rules (SR3 p.116) before ruling on dermal armour.

## 163. Launcher grenades and mini-grenades do not carry a blast

SR3 p.283's *Mini-grenade* row (Conceal 8, Weight .1, Availability *+2/by grenade*, Cost *x2*, Street Index *+1*, Damage and Blast *by grenade*) describes a grenade for a launcher as a modifier on
the ordinary one. Grenades fired from a launcher are `ammunition` items with no `blast` field, so they always fall off at −1/m — a Defensive mini-grenade is wrong. Needs the launcher's loaded
grenade to say Offensive or Defensive (`system.blast` on `ammunition`), and the mini-grenade rows built from p.283 with their arithmetic stated.

## 164. Non-damaging area grenades: how to show and use their area

Follow-up to [#155](TODO-DONE.md#155), which lands gas, smoke and flash grenades and marks a coloured Region that ends with its Combat Turns. What it does **not** do yet, and what has to be decided:

1. **The marker has not been seen.** It was checked only as far as the chat card; the Region itself and its two-round expiry need a scene with a canvas. A live step: throw a smoke grenade, see the grey region, advance two
   rounds, see it go, and try the 🧹 button. It also needs a look at how it reads on a busy map — opacity, the label, and whether a Region shows to players who cannot see that spot.
2. **A better graphic** than a flat coloured circle: a smoke texture or animated fill, and a different look for infra-red smoke, gas and a flash. Regions can carry a texture; nothing chooses one yet.
3. **Visibility modifiers for smoke.** The card only says *"apply the visibility modifiers"*. The table (SR3 p.112) depends on the vision the viewer uses — normal, low-light, thermographic — and the marker could offer
   the number to the GM's TN window when an attacker or target stands inside it. Infra-red smoke is the case that changes the row for thermographic vision. Needs the tokens inside the region tested against the attack, which the ranged
   flow does not do today.
4. **Gas.** *"The gas cloud affects everything within a 10-meter radius"* — Neuro-Stun VII is a toxin (SR3 p.250 names VIII, p.283's row says VII; see the note on the item). Offering each token inside a resistance card, as
   the drugs flow does for a dose, is the obvious shape, and would need the Neuro-Stun rules read first.
5. **Flash-Pak** has no area at all: *"Anyone facing a flash-pak"* is a facing rule. It could mark a cone or ask the GM to tick who is looking; today it only states +4 (+2 with flare compensation) and +2 from the strobe.
6. **Wind** — *"less in windy areas, at the gamemaster's discretion"* — is stated on the card and not modelled; the expiry is a fixed 2 Combat Turns. A GM cannot shorten one except by clearing the marker.
7. **Thermal Smoke** and the other non-core no-damage grenades (the 2nd-edition ones are parked in `archive/sr2/`) would use the same two fields once their packs return.

## 176. Rules check 0.6.1 — Rules the guides state that the code does not implement

The full list is in `audit/rules-check-0.6.1.md` (167 units, "Real rules the code does not implement"). Grouped:

- **Magic:** ritual sorcery (MitS pp.34-37); spell, spirit, power and sustaining foci; elemental services and
  library / circle / materials; the Object Resistance Table; several spells in one action (+2 Drain each); the
  Spell Pool cap (no more than Sorcery dice) and Hacking Pool cap; Spell Defense subjects and range; limited
  spells (fetish / exclusive); permanent-spell base time in the Sorcery flow; willing targets; detection spells
  rolled by the GM; touch-range spells; astral projection as an Exclusive Complex Action, 1 Essence per hour,
  astral movement; nature-spirit domain and sunrise/sunset; missing spirit types (Hearth, Prairie, Mist, Storm,
  Lake, Sea).
- **Matrix:** black IC (lethal / non-lethal, Hardening, jack-out), Tar Pit IC, tortoise immunity, cold / hot ASIST,
  Hacking Pool restrictions.
- **Combat:** movement rates, the Change Position test, Shift Perception, laser-sight range and weather, rigger
  damage (6M / 6S), grenade timing (next Combat Phase), minigrenade arming, chunky-salsa wall strength, the optional
  grenade damage rule, crossbow Strength Minimum.
- **Street:** Legality Codes and the Local Fines table, permits, SINs and credsticks, fake IDs, fencing,
  Concealability searches, weapon and cyberware scanners, belt / extra-round ammunition price adjustments,
  matching cyberware grades, removal Stress, betaware unavailable to starting characters.

- **Remainders from the 0.6.1 fixes (2026-09-24):** vehicles adapted for rigger control (SR3 p.134, from #167);
  a rigger's Control Pool dodge against Handling and Control Pool dice on a vehicle's Damage Resistance Test
  (p.149, from #168); spare clips that fit one gun only (p.281, from #173).

Each needs its own item if the maintainer wants it built; several (SINs, fencing, permits, credsticks) are a small
feature set on their own. They are features, so they are built on branches, not in a 0.6.x bug-fix release.

### 📕 Rules not implemented

## 47. Ready Weapon is unmodelled — you can attack with a weapon you never drew

> **Built 2026-09-15 on `feature/action-economy`** (0.6; not merged). `ready` on every weapon (initial
> true, so nothing already on a sheet stops fighting); a ✋ toggle on each weapon row (readying charges
> Ready Weapon, putting away is free); firing or swinging an unready weapon offers **Ready**, **Quick
> Draw** (Concealability 4+ firearms: Reaction (4), +2 unholstered, one success draws and fires in one
> Simple Action, a card's 🎯 Fire) or **Attack anyway** — never refuses. Rules: `scripts/data/ready-weapon.mjs`.
> **Still open here:** quick-drawing two guns at once (+2 each) waits on #49's hands; readying a batch
> of throwing weapons is shown in the tooltip (½ Quickness) but the stack is one item. TESTING.md §40.

**Reported 2026-08-11:** *"you shouldn't be able to attack with a weapon you don't have equipped."*
Correct, and RAW says so outright. Core **p.107**, Simple Actions:

> "A character may ready a weapon by spending a **Simple Action**. The weapon may be a firearm,
> melee weapon, throwing weapon, ranged weapon, or mounted or vehicular weapon. Readying entails
> drawing a firearm from a holster, drawing a throwing or melee weapon from a sheath, picking up
> any kind of weapon, nocking an arrow in a bow or crossbow, or generally preparing any kind of
> weapon for use. **A weapon must be ready before it can be used.**"

So *ready* is a **Simple Action**, and it is a precondition, not a formality.

### ⚠ A hard block would be wrong — Quick Draw is RAW's answer to "I haven't drawn it yet"

Also **p.107**: a pistol-sized weapon (Concealability 4 or greater) can be drawn **and fired** in a
single **Quick Draw** action, gated on a **Reaction (4) Test** — 1 success clears the weapon, **+2**
to the test if it is not in a proper holster, and a further **+2 each** when quick-drawing two
weapons. "Not ready" is therefore a legal state to attack from, at a price. Refusing the attack
outright would delete a rule rather than enforce one, and it would also take the GM's ability to
wave things through — see the minimal-guardrails ethos in CLAUDE.md, and [#44](TODO-DONE.md#44), where the same
question about melee range was settled as **warn, do not block**.

### What the system models today

**Only bows and crossbows are right.** `_usesNockedAmmo` gives them a magazine of one that Reload
nocks and firing spends, which is exactly the book's own wording for them — Fire Weapon requires a
bow *"previously made ready using the Simple Action of Ready Weapon"*.

**Melee has the field but not the gate.** `system.equippedMelee` exists and `_getEquippedMelee`
reads it, but nothing stops `rollMelee` on an unequipped weapon; the field only decides which weapon
*defends*.

**Firearms and thrown have no concept of ready at all.** A holstered pistol fires identically to one
already in hand.

⚠ **Confirmed from the sheet, 2026-08-11:** *"I see a way to equip a melee weapon, but I don't see a
way to equip a firearm."* Correct, and it is an asymmetry in two places at once:

- **Data model** (`ActorDataModels.js:97-100`, `:179-181`) declares `equippedArmor`,
  `equippedMelee` and `equippedCyberdeck` — and **no `equippedFirearm`**. The pattern is established
  for three other slots; guns are the omission.
- **Sheet**: melee rows render `_meleeControls` (fist icon, `equipMelee`); firearm rows render
  `_itemControls(w.id, true, 'rollWeapon', …)` (`SR3EActorSheet.js:976`), which has **no equip
  affordance at all**.

So this is visible as a UI inconsistency *before* any action economy exists, and a player noticing
"why can I equip my sword but not my gun" is noticing the same hole this task is about. Fixing #47
means adding the field and the control, not just the check.

### Sequencing — blocked by [#46](TODO-DONE.md#46), and not merely inconvenienced by it

While the `equipMelee` control is invisible, **nothing can be equipped**. Enforcing readiness on top
of that would not gate melee, it would abolish it. #46 first, always.

### Shape

- A `ready` boolean on weapon items, defaulting **true** for anything already in an actor's hands at
  migration time — a world full of characters who suddenly cannot fight is a worse bug than the one
  being fixed.
- `rollWeapon` / `rollMeleeAttack` warn when firing something unready, offering **Ready** (Simple
  Action) or, for Concealability ≥ 4, **Quick Draw** with its Reaction (4) Test.
- The Action Tracker already models Simple vs Complex per turn, so Ready has somewhere to charge to.
- Throwing weapons ready in **batches**: one action readies ½ Quickness (round down) of them.

## 48. The GM hand-charges every action — most of them are knowable

> **Built 2026-09-15 on `feature/action-economy`** (0.6; not merged). See CLAUDE.md → *Action Tracker /
> the action ledger*: combatant-flag ledger, self-charging flows, pips for everyone, and the GM's
> ↺ undo that also puts back what the action spent (ammo, pool dice, recoil) and deletes its cards
> (the maintainer, 2026-09-15). **Still open here:** Take Aim as cross-phase state (below); dual
> wield billing one Simple for two guns waits on #49. Live check: TESTING.md §40.

**Asked 2026-08-11:** *"right now the GM decides if a player does a simple or complex action. Some of
these should auto apply. Is that possible?"* **Yes**, and for most combat actions the answer is not
even ambiguous — SR3 states the cost per action, and the system already knows which action was taken
because it is the thing that opened the dialog.

### What exists (`sr3e.js:1596-1645`, `_actionTracker` at `:1966`)

Three buttons on the active combatant's card: **Complex** (advances the turn), **Simple** (toggles,
marking one of the two used), **Simple** (advances the turn). State is
`const _actionTracker = new Map()` — **module-scoped, in-memory, on the GM's client only**, cleared
by the `updateCombat` hook on any turn or round change.

### ⚠ The blocker is the same one as [#42](TODO-DONE.md#42), not the rules

A player rolling on their own client cannot charge an action, because the ledger is a `Map` in the
GM's browser. Two consequences, and the second is the real one:

1. The write has to travel — but that path exists: `SR3EQuery.asGM`, the same route pool spending
   already takes.
2. **The `Map` is the wrong home.** In-memory GM-local state cannot be shown to the player whose
   turn it is, and dies on reload. This wants a **combatant flag** — GM-written, synced to every
   client, survives refresh. Doing #42 and this against one shared-state design is much cheaper
   than doing them twice.

### The mapping is unambiguous (core **p.107-108**)

| System entry point | Action | Cost |
|---|---|---|
| `rollWeapon` (firearm — **SS / SA / BF**) | Fire Weapon | **Simple** |
| `rollWeapon` (firearm — **FA**) | Fire Automatic Weapon (**p.108**) | **Complex** |
| `rollWeapon` (thrown) | Throw Weapon | **Simple** |
| `reload()` — clip weapons | Insert Clip | **Simple** |
| `reload()` — non-clip weapons | Reload Firearm (**p.108**) | **Complex** |
| Ready / nock ([#47](#47)) | Ready Weapon | **Simple** |
| Quick Draw ([#47](#47)) | Quick Draw | **Simple** |
| Take Aim (already in the called-shot dialog as −1 TN/point) | Take Aim | **Simple** each |
| `rollMeleeAttack` | Melee/Unarmed Attack (**p.108**) | **Complex** |
| `rollSpell` | Cast Spell | **Complex** |
| `rollVehicleWeapon` | Fire Mounted or Vehicle Weapon (**p.108**) | **Complex** |
| Summoning (`SR3ESpiritSummoning`) | Summon Nature Spirit (**p.108**) | **Complex** |
| `rollSkill`, Drone Comprehension, Driving Test | Use Skill (**p.108**) | **Complex** |

⚠ **Fire mode decides the action type, so the charge cannot be read off "an attack happened".**
Full auto is a *different entry* in the book (Fire Automatic Weapon, Complex) from the one covering
SS/SA/BF (Fire Weapon, Simple). The system already knows the mode — `_promptFireMode` returns it —
so this is a lookup, not a judgement, but a naive "attack = Simple" would let a full-auto burst cost
half what it should.

⚠ **Two guns are still ONE Simple Action.** p.107: *"If a character has one weapon in each hand, he
may fire once with each weapon by expending one Simple Action"* (Using a Second Firearm, p.112). A
per-`rollWeapon` charge would bill twice.

### ⚠ Take Aim is not an action here — it is a number the player promises they earned

**Raised 2026-08-11:** *"right now there isn't an aim action, we just trust that it was counted when
choosing an attack action."* Exactly right, and aiming is the worst case for that trust because RAW
makes it fragile in three ways the TN field cannot express.

What the system has (`SR3EItem.js:1952`): a `#sr-aim` number input folded into the TN as −1 per
point. **The cap is already correct** — `_maxAim` is ½ base skill or specialisation rounded down,
cited to p.107 and enforced on confirm. What is missing is everything else:

**1. No action is spent.** Each Take Aim is a Simple Action; three points of aim is three Simple
Actions, i.e. more than one Combat Phase's worth. Nothing charges them.

**2. Aim is STATEFUL ACROSS TURNS, and the dialog is not.** p.107: *"Take Aim actions may be
extended over multiple Combat Phases and Initiative Passes, even from Combat Turn to Combat Turn."*
So aim points are a property of the *character over time*, not of the attack dialog — they need to
live on the actor and be spent by the shot, which is a bigger change than charging an action.

**3. Two invalidation rules, neither modelled, and both easy to violate by accident:**

> "Take Aim actions are cumulative, but **the benefits are lost if the character takes any other kind
> of action, including a Free Action** at any time."

> "Characters who are aiming over multiple Combat Phases **may not use dice pool dice for any reason**
> without losing the [benefit]."

The second is the sharper one: a player who aims across phases and then spends **Combat Pool** on the
shot — which the attack dialog offers them, unprompted, every time — has silently lost the aim they
paid for. Nothing warns.

Also note Take Aim requires a **ready** weapon, tying it to [#47](#47).

This may deserve its own entry once #47 and the ledger exist; it is recorded here because it is the
same trust-the-player gap, and because the cross-turn state has to live wherever the action ledger
lives.

### ⚠ What must NEVER be auto-charged

**Everything reactive.** Dodge, Full Defense, Damage Resistance and Spell Resistance are not the
defender's action and cost them nothing from their own phase — charging them would silently halve
every defender's turn. Initiative is not an action either. The rule of thumb: **charge the actor who
opened the dialog, never the one answering it.**

### ⚠ Auto-MARK, do not auto-ADVANCE

The current Complex and second-Simple buttons both call `combat.nextTurn()`. Auto-charging must not
inherit that: a player's roll silently ending their own turn — before they have readied, aimed, or
taken their second Simple — is a far worse failure than under-counting. Mark the action as spent,
leave `nextTurn()` on the GM's click.

Two rules that make the count non-trivial and argue the same way: **SS weapons may be fired only
once per Combat Phase** (already warned in `_promptFireMode`), while SA can legitimately fire twice
as two Simple Actions.

### Players must be able to SEE what they have spent

**Requested 2026-08-11:** *"it would also be nice if the player were able to see some kind of
indicator that they have used a simple action or both of them."*

Today they cannot see anything. The whole block is behind
`if (game.user.isGM && combat?.started && combat.combatant)` (`sr3e.js:1586`) — not just the
buttons, the entire tracker. A player has no way to know whether they have one Simple left, and
under [#47](#47) and auto-charging they will be spending them on things (readying, aiming) that are
easy to lose track of.

**This falls out of the combatant-flag ledger almost for free.** Combatant flags sync to every
client, so once the state stops being a GM-local `Map` the only work left is rendering it
unprivileged. The change is therefore to **split display from control**, not to duplicate the
widget: read-only pips for everyone, buttons only for the GM.

- **Pips, not buttons** — ○○ / ●○ / ●● for the two Simples, and a single wider pip for the Complex,
  greyed once a Simple is spent (it is already mutually exclusive in the current logic).
- **On the active combatant's row**, since the ledger is cleared on every turn change and means
  nothing for anyone else.
- **Visible to all players, not just the owner.** Action economy is public at a physical table —
  everyone can see you fire twice. Hiding it from the rest of the table would be a house rule, and
  a confusing one during a melee where two players are trading.
- The GM keeps the three clickable buttons in the same slot, so nothing is lost.

### On the ethos

CLAUDE.md's *"no automation of outcomes"* is about damage and narrative — the GM clicks wound boxes.
Action economy is **bookkeeping**, not an outcome, so tracking it does not cross that line. But
*"all stats are manually editable"* still applies: every auto-charge must be reversible by the GM
with one click, and the existing three buttons stay as the manual path.

## 49. Nothing models hands — what is held, and how many can be held

> **Built 2026-09-15 on `feature/action-economy`** (0.6; not merged). `hands` on every weapon (0-2,
> blank = the category default — the maintainer's decision), filled into all 517 shipped weapons by
> `tools/fill-weapon-hands.mjs`; `extraHands` on the actor (the GM's box). "In hand" = readied (#47):
> the Weapons tab says what is held and warns when it is more than the hands. **p.112's second gun is a
> guess in the GM's TN window** — the row now renders (it had no `mvp` flag), pre-ticked when a second
> ready pistol/SMG-class gun is in hand, withdrawing the smartlink / goggles / laser guesses. Rules:
> `scripts/data/hands.mjs`. TESTING.md §40.
> **Still open here:** firing both guns for ONE Simple Action (each shot is charged; the GM ↺s one),
> uncompensated recoil crossing to the other gun, matched hand razors/spurs +½ Strength (p.121), quick-
> drawing two (+2 each), and folding `equippedMelee` into the hand slots.

**Requested 2026-08-11:** *"a person has two hands (unless there is a cyberware option to add more)
and you can have two one-handed weapons equipped or a two-handed weapon equipped."* Nothing in the
system tracks this. `equippedMelee` is a single `StringField`, there is no `equippedFirearm` at all
([#47](#47)), and no weapon knows whether it needs one hand or two.

### ⚠ SR3 does not model hands — it models a WHITELIST, and the difference matters

The instinct "two hands, so two one-handed weapons" is a reasonable abstraction, but it is **not**
what the book says. **p.112**, Using a Second Firearm:

> "Characters can use two **pistol- or SMG-class weapons**, one in each hand. Doing so, however,
> imposes a **+2 target modifier to each weapon** and **negates any target number reductions from
> smartlinks, smart goggles or laser sights**. Additionally, **any uncompensated recoil modifiers
> applicable to one weapon also apply to the other weapon**."

So the constraint is the weapon *class*, not the hand count. A troll has two hands and still may not
dual-wield assault rifles. Building this as a pure hand-slot system would quietly permit that — the
class whitelist has to be a separate gate, not an emergent property of having two free slots.

### What the book gives us, and what the system has

| Rule | Source | State |
|---|---|---|
| Dual wield restricted to **pistol/SMG class** | p.112 | ❌ nothing checks |
| **+2 TN to each weapon** | p.112 | ⚠ exists as a GM checkbox only — `secondFirearm`, `SR3ECombatModifiers.js:57` |
| **Negates smartlink / smart goggles / laser sight** reductions | p.112 | ❌ |
| **Uncompensated recoil crosses over** to the other weapon | p.112 | ❌ |
| Firing both = **one Simple Action** | p.107 | ❌ — noted in [#48](#48) so it is not double-billed |
| Quick-drawing two = **+2 each** to the Reaction (4) Test | p.107 | ❌ — deferred, see below |
| Matched hand razors/spurs (one per hand) add **+½ Strength** to Power | p.121 | ❌ |

That last row is the one that shows hands are already load-bearing elsewhere: the book's own example
has Logan's paired spurs take 6M to **9M** purely because he has one in each arm. Any hand model has
to reach cyberware, not just carried weapons.

**The smartlink negation is blocked by [#18](#18).** Smartlink and laser sights are currently
*guessed* from free-text gear (`guessGearModifiers`), so there is no reliable flag to negate. This
row cannot be done properly until accessories are structured data.

### Shape

- **Hand count is a derived actor field, not the constant 2.** The request explicitly anticipates
  cyberware changing it, and core has no extra-limb rules — so it must be data-driven from the start
  rather than hardcoded and later unpicked. Default 2.
- **Slots supersede `equippedMelee`/`equippedFirearm`** rather than sitting beside them, or the two
  will disagree. Fold this together with #47 rather than shipping a second equip concept.
- ⚠ **There is no two-handed flag in SR3, and deriving one is a judgement call, not a lookup.**
  Rifles, shotguns, LMG-and-heavier, pole arms and bows are all obviously two-handed, but the book
  never says so in a table — it only ever states the *positive* case for pistols and SMGs. Adding a
  `hands` field to the weapon model is honest; inferring it from `category` is a guess that will be
  wrong at the edges (a heavy pistol fired two-handed, a one-handed crossbow).
- **Quick Draw is explicitly out of scope** — *"we will need some way for someone to quick draw a
  one-handed weapon if the need arises but that's a problem for another day."* It is specified in
  #47 (p.107, Reaction (4) Test, +2 unholstered, +2 each for two weapons); do not build it here.

### 🪄 Spells & drugs

## 123. Audit every shipped spell and the casting rules — **requested 2026-09-14**

**Request (maintainer):** *"add a todo for a spell audit."* Raised while fixing F5 (Drain read the
wrong Magic in three flows) and alongside the maintainer's *"we probably need a spell casting
helper just like the healing helper"* — the audit comes first, so the helper is built on verified
rules.

**Scope — two halves, the same method as `audit/adept-powers-audit.md`:**

1. **The data — 244 spells in five packs:** `sr3e-sr3-spells` 96 · `sr3e-mits-spells` 99 ·
   `sr3e-tss-spells` 40 · `sr3e-twl-spells` 7 · `sr3e-sota2-spells` 2. For each: type (Mana/Physical),
   target, range and the `(A)` area marker, duration, **drain code**, category, and book/page, against
   the printed spell entry. `parseDrainFormula` must parse every shipped drain code — list any it
   cannot, and any spell whose drain parses to something other than the book.
2. **The rules the code applies** — each checked against the PDF, quoted with its printed page:
   Force and the Physical/Stun Drain line (p.183, now `SR3EActor.magicAttribute`), the Drain
   Resistance Test (p.183: *"the caster's Willpower dice, plus any Spell Pool dice"*, TN ⌊Force ÷ 2⌋
   + the Drain Modifier), the Spell Pool cap (*"No more Spell Pool dice can be used than the number
   of Sorcery dice allocated"*, p.180), target numbers and resistance (p.182-183), area spells,
   counterspelling/Spell Defense, dispelling, and astral casting (*"All spells cast while astrally
   projecting cause physical damage, regardless of Force"*, p.183).

**Leads found while writing this — verify, don't assume:**
- ✅ **Sustained spells — BUILT on `feature/sustained-spells`** (2026-09-14; CLAUDE.md → *Sustained
  spells*). p.178's +2 per spell on all tests (Drain included, Damage Resistance not; p.180 and p.183
  are the same modifier restated), the Sorcery limit (shown), the damage test to keep one. **The Spell
  Resistance Test takes it — the maintainer's ruling, 2026-09-14**, reading p.178's "all tests" over
  p.183's *"No target modifiers apply to this test except where specifically noted"*.
- ✅ **The astral clause — FIXED 2026-09-14** (`SR3EActor.drainIsPhysical`): casting while projecting
  is Physical Drain at any Force (p.183), and the Force dialog says so.
- ✅ **Drain resistance read base Willpower — FIXED 2026-09-14** (`SR3EActor.drainResistRating`):
  the effective Willpower (Charisma for conjuring), so a Pain Editor's or Adrenal Pump's +1 counts.
- **Increase Attribute spells** (SR3 p.194 — Physical *or* Mental, +1 per 2 successes up to Force, not
  on cybered Attributes) have no effect path; a GM edits the attribute by hand.

**Deliverable:** `audit/spells-audit.md` (per-spell table + rules checklist), pack fixes through a
committed tool, a TODO per verified code divergence (bug fixes on `main`), and a proposed step list
for the spellcasting helper for the maintainer to review before anything is built.

<a id="131"></a>

## 124. Drug rules — addiction, tolerance and effects — **built 2026-09-15 on `feature/drug-rules`**

> **Built** (0.6 feature, not yet merged). See CLAUDE.md → *Drugs*. Addiction, tolerance, Edge,
> fixes, the monthly test, kicking, withdrawal/forced/recovery and relapse (M&M pp.108-110); effects
> and crashes for the drugs whose text gives numbers (pp.117-123); a standing TN that rides with
> sustaining everywhere; the M&M drug pack rebuilt as one item per drug. Live check: TESTING.md §39.
>
> **For the maintainer — the book disagrees with itself or is silent:**
> 1. **Voluntary withdrawal's example vs its rule (p.110).** The rule drops the rating 1 per two
>    days *to the base*; the example gives Twitch (13, base 4) *"26 days (2 x 13)"*. The rule is
>    implemented (18 days); the forced example (14 − 4 = 10) agrees with it.
> 2. **Kicking with two addictions (p.109).** "+4 if both" names one Addiction Rating; Jazz has two
>    (4M/5P). The higher is used; the card's TN is editable.
> 3. **Withdrawal's "+2 to all his target numbers" (p.110)** is given sustaining's scope — every test
>    but Damage Resistance. The book does not say whether the soak takes it.
> 4. **Drug pain resistance with the adept power** takes the larger, not the sum (unstated).
> 5. **Cram's crash, "Moderate Stun damage for an equivalent duration" (p.122)**, is modelled as a
>    Moderate wound's modifier that ends with the crash, not boxes ticked on the track.
> 6. **Addiction tests take no wound or sustaining modifier** — the TN is the rating p.108 names.
> 7. **Pack corrections made from the book** (reported by `tools/fix-mm-drugs.mjs`): Kamikaze 4P → 5P
>    (the M&M item carried SR2's rating), CS Speed/Vector un-swapped, nine availabilities that were
>    another column's value, Novocoke → Novacoke.

**Request (maintainer):** *"add … another for drug implementation."*

**Today:** `drug` is a **reference-only** item type (`DrugData`: category, addiction, tolerance,
effect, speed, vector, availability, cost, street index, notes). 48 drugs ship in four packs
(`sr3e-mm-drugs` 40 · `sr3e-st-drugs` 3 · `sr3e-tal-drugs` 3 · `sr3e-sota-drugs` 2), plus the
default-book gear branch's `sr3e-sr2-drugs` / `sr3e-sr3-drugs` and M&M's merged listings. The actor
sheet lists drugs; **nothing rolls or applies anything.**

**What the books define — audit first, quoting each page:**
- **Effects** with game numbers, e.g. M&M: Kamikaze (+1 Quickness, +2 Strength, +1 Willpower, +1D6
  Initiative, p.119), Zen (+1 Willpower, −2 Reaction, p.122), Deepweed (+1 Willpower, p.123), Laés
  (a Body (6) Test against memory loss); SR3 core's toxins and compounds.
- **Onset (Speed), duration, and the crash** after it wears off.
- **Addiction and Tolerance** — the Addiction ratings (`2M`, `4M+3P`, `5M/5P` — Mental/Physical)
  and the tests they drive.
- **Toxin resistance** — already partly modelled: the `toxin` situational bonus (Body Control,
  Nephritic Screen, a dwarf's +2) on the attribute-roll dialog (TODO 98).

**Shape it would take** (a feature — a branch, the minor version): a "💊 Take" action on a drug item
that applies its effects as a timed boost (the Adrenal Pump's `augmentations` pattern: rolled
duration, counted down on the round hook, a crash card on expiry), a resistance/addiction roll card
in the healing helper's style, and the effects as data on the item rather than parsed from prose.
Effects offered and applied only on a click — nothing automatic, per the design ethos.

<a id="132"></a>

## 131. Cover and visibility on elemental spells — **left over from rules-check 0.6.0 Finding 4, 2026-09-22**

**The book, SR3 p.183:** *"Elemental spells are treated like normal ranged attacks … They have a base
Target Number of 4, regardless of range, as long as the caster can see the target. Cover, visibility,
injury and sustaining modifiers apply."*

Finding 4's fix routed elemental spells through the ranged dodge and soak. Injury and sustaining
modifiers reach the Sorcery Test already (`rollPool`), but **cover and visibility do not**: the cast
never opens the GM's TN window (`SR3EItem._promptGMAttackWindow`), so a Flamethrower through Thermal
Smoke is cast at a flat 4. Wanted: open that window for an elemental cast — its Target, Attacker and
Conditions groups, not the Gear guesses (a smartlink does nothing for a spell) — on the same
`gmApprovesTN` rule as ranged, and fold the result into the cast TN. ⚠ **Range stays out**:
*"regardless of range"*. ⚠ An **area** elemental spell does not need line of sight to a target behind
a wall (p.182: *"Targets hidden behind a wall … will still get cooked"*), so for area casts the
visibility row applies to the caster's view of the centre, not to each target.

Also noticed, not fixed: `SR3EActor._spellSoakButtonHtml` and the `dp.isSpellSoak` branch after a
failed dodge are **dead** — nothing sets `isSpellSoak`. They are a leftover spell-dodge route that led
back to a Willpower resist; remove them once #131 is done, so nobody revives them for elemental spells.

<a id="124"></a>

## 132. Astral damage: dual beings resist with Body, not Willpower — **found fixing rules-check 0.6.0 Finding 5, 2026-09-22**

**The book, SR3 p.175:** *"The Damage Resistance Test is resolved using Willpower or Force for astral
beings, or Body for dual beings."* p.174 puts *"Astrally perceiving characters and other dual beings"*
in one class, using *"their normal physical Attributes, skills and Combat Pool in astral combat"*.

**The code:** `_postAstralSoakCard` always offers **Willpower** (*"Willpower / Astral Body"*) — right for
a projecting character or a spirit, wrong for anyone astrally perceiving or dual-natured. The pool is
editable, so a GM can correct it by hand, which is why it has not bitten.

**For the maintainer:** is `system.astralMode` (`'dual'` vs `'astral'`) the right switch, and what should
an actor with no mode set default to? p.174 also gives dual beings their **Combat Pool** in astral combat;
check whether the astral soak card should offer it.

<a id="131"></a>

### 🖥 Matrix

## 120. A Matrix Defragged adapter for HoloSuite Hacking (fork) — **requested 2026-09-13**

**Request (maintainer):** work on a possible fork of
[Thuurvdv/HoloSuite](https://github.com/Thuurvdv/HoloSuite) — specifically `holosuite-hacking` —
to work with Matrix Defragged.

**What it is** (read 2026-09-13): a Foundry module in a multi-module repo, `holosuite-hacking`
v1.2.0, Foundry **12–14 verified**, requires `holosuite-core`, built with Vite (`src/` →
`dist/main.js`). The GM launches a hacking challenge; the player accepts, rolls a skill check, then
plays a timed puzzle whose difficulty scales with the roll. Native roll integration for D&D 5e, PF2e,
SF2e, CoC7 and Cyberpunk RED; any other system falls back to custom dice or chat rolling. A public
API — `configureHack()` / `runConfiguredHack()` — stores portable skill identifiers.

**License:** `holosuite-hacking` is **GPL-3.0** — a fork may be published, and must stay GPL-3.0
with modification notices. ⚠ The repo is **three-tier**: some modules are LGPL-3.0, some **PolyForm
Noncommercial** (no redistribution); check `holosuite-core`'s own license before forking it too.

**Shape to decide first:** (a) a fork adding a *Matrix Defragged* adapter next to the five native
ones, or (b) no fork — a small bridge in this system that calls its public API. (b) avoids carrying
a GPL fork and survives upstream updates; (a) is needed only if the adapter contract cannot express
Defragged's rolls. Defragged-specific parts to map: the Hacking Pool, the Security Threshold (fail →
Overwatch +1 — `SR3EHostSheet`'s track), System Rating as TN, and node prompts as the challenge.
Depends on [#119](TODO-DONE.md#119) for which rules are right.

<a id="121"></a>

## 128. Overwatch's crash trigger, Suppression, and the Security Sheaf's Trigger Steps

Raised 2026-09-16 as the remainder of [#119](TODO-DONE.md#119), all three from *The Matrix Defragged v2*.

**1. Overwatch has two triggers; we implement one** (MDF p.22):

> "Overwatch is tracked on the Security Sheaf of the grid or host system in which a decker prompts an
> action leading to any of the following conditions: **Failing a test using the Hacking skill** ·
> **Crashing an icon without Suppressing it**."

`SR3EActor._incrementOverwatch` is called from the two failed-test paths and nowhere else, so crashing
an icon in cybercombat is currently free.

**2. The Suppression utility is the way out of it** (MDF p.26):

> "Deckers who crash an icon while running Suppression in an active utility slot, may degrade 1 point
> of the utility's rating, to avoid accruing Overwatch when their actions result in the crash of an
> enemy icon."

It is in the book's program list and in the MDF program pack; no code reads it. Note the cost — the
utility **degrades by a point**, so this is a choice, not a free pass.

**3. The Security Sheaf is more than a 10-box track** (MDF p.22-23): ten **Trigger Steps**, each able
to hold IC that the host deploys when Overwatch reaches it — *"Triggered IC activate (rolling into
initiative) at the top of the next Combat Phase (-10 from an IC's Initiative for each phase that has
already transpired)"*. The book prints a worked sheaf (System Sweep, Authenticator-(4), Alert,
Barrier-(6) + Tracker-(4), Killer-(6), Data Worm-(6), Convergence). The host sheet has the track and
the Convergence box, and nothing to stock.

⚠ **Stocking is bounded by memory** — *"so long as the total Mp size of the assigned resources are
less than the host's available Memory (generally System Rating x500Mp)"*, and Gray/Black IC need the
Mainframe Support module. Any implementation should report that, not enforce it.

**Shape:** the crash trigger and Suppression are small and self-contained — do them first. The sheaf
is a host-sheet feature (a list of steps, each with IC and a rating) and is worth its own pass.

## 130. Store implant names plainly, with the rating only in the field

Raised 2026-09-21 as the remainder of [#122](TODO-DONE.md#122), which made the **field** authoritative but left
every shipped name as `Wired Reflexes [2]`. The maintainer's original ask has two halves; this is the
second: *"is there a way to get the name 'Wired Reflexes' with a rating '2' to display as 'Wired
Reflexes [2]'"* — yes, `displayName(item)` already does it, and it now covers cyberware and bioware.
So the machinery is in place and this is the rename itself.

**Why it was not done with #122:** the rename is the risky half, and none of the risk is in the
rename. Before a single name changes, every **name-keyed** lookup has to be found and moved to a stem
or to `srcgName` (the upstream identity field cyberware already carries):

- `SRCG_BONUSES` — keyed **with brackets**, and `tests/cyberware-names.test.mjs` shows 43 entries
  already renamed once; a second rename without it silently drops every bonus on those implants.
- the registries in `config.js` — `triggeredAugmentations`, `quicknessNotForReaction`,
  `reactionExclusive`, `augmentationSkillDice`. CLAUDE.md already warns these must match a **stem**,
  never a full name, and the move-by-wire note records getting this wrong once.
- migrations that match by name, and the healing `EQUIPMENT` regexes.
- **compendium pickers**: add `system.rating` to `CONFIG.Item.compendiumIndexFields` and append
  ` [N]` where entries are drawn, or the picker shows five identical *Wired Reflexes*.
- `displayName` at every sheet row and chat card that prints these names.

Then the rename itself: the packs (derived ids, repo **and** `--install`), and a migration for the
embedded copies in worlds already in play — Foundry embeds items, so a pack rename reaches nobody
who already owns one.

⚠ **A rename is not reversible by a fill-blanks migration**, which is what every other migration
here is. Worth a plan and the maintainer's go-ahead before starting, not a drive-by.

### 📦 Content gaps

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

## 11. Restore the sr3e-macros pack (and the character importer's delivery)

> ⚠ **Checked 2026-09-14 — lower stakes than this entry says.** The pack only ever listed ONE macro
> (the Nullsheen importer, `populate-macros.js`), and the install's leftover `sr3e-macros` holds **0**
> documents (as do both `sr3e-odm-*`). The importer is **not** undelivered: the `ready` hook in
> `scripts/sr3e.js` creates it in the GM's macro library on first load, with the Chrome Threat
> Generator and two populate macros. Restoring the pack would only add a compendium copy.
> **Update (TODO 1):** `populate-macros.js` is deleted, and the two populate macros are no longer
> created. If a compendium copy is ever wanted, add `sr3e-macros` to `packs-src/` — not a macro.

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

## 19. Convert the SR3 GM Screen into a compendium — as data, not page images

Put the reference tables a GM needs at the table into a Foundry compendium, **rebuilt as real
content — no embedded page scans.** Journal pages with proper HTML tables: searchable, linkable
by `@UUID`, enrichable, themable with the system's CSS custom properties, and legible on any
screen size. A screenshot of a PDF page is none of those things.

**Source the content from the Core Rules, not the GM Screen.** `Shadowrun 3e - GM Screen.pdf`
(kept at the PDF library root, deliberately — it holds the rules a GM needs to run) has **no text
layer**, so nothing can be extracted from it. But the screen is only a *curated selection* of core
rulebook tables, and `Shadowrun 3e - Core Rules {FAN25000}.pdf` **does** have a clean text layer.
So:

1. Read the GM Screen visually to determine **which** tables belong on it.
2. Pull each table's **content** from the Core Rules text layer via `pdftotext -layout`
   (crop per column, `-x -y -W -H`; mediabox ~616×795pt; **book page = PDF page − 2**).

That avoids OCR entirely and gives accurate figures rather than best-guess character recognition.

⚠ **Do not duplicate what `config.js` already owns.** Several of these tables are already encoded —
`SR3E.rangeTN`, `SR3E.weaponRanges`, `SR3E.ammoTypes`, and `SR3E.electronicWarfare.degradationTiers`,
with `SR3E_RANGED_MODIFIERS` / `SR3E_VISIBILITY_TABLE` arriving in socket Stage 3
([#2](TODO-DONE.md#2-rebuild-combat-on-sockets-with-player-initiated-flow)). A journal table that silently
disagrees with the code is worse than no journal table. Either generate the journal **from** the
config constants, or cross-check every figure against them and note the single source of truth.

Pack should be system content (**no** `flags.The2ndChumming3e.book`, like `sr3e-skills`) so no book
toggle can hide the GM's reference material — and remember a new pack in `system.json` needs a full
Foundry restart, not an F5.

---

## 83. Mr Johnson's Little Black Book

**Raised 2026-09-01, and named as the next thing to work on.**

`sr3e-mr-johnsons-contacts` is one of exactly **three system packs** — the packs with no `book`
flag, which no source-book toggle can hide (the other two are `sr3e-skills` and
`sr3e-example-characters`). So the content ships to every table by design.

⚠ **Inventory the pack before designing anything.** What it holds, what item type those
documents are, and which fields are populated determines whether this is a UI on top of
existing data or a data job first.

⚠ **Establish what "set up" means here** — the request as recorded is a direction, not a spec.
Worth settling before building: is this a GM-facing directory of Johnsons and their jobs, a
player-facing contact list, or the run-generation surface a Johnson implies?

⚠ **Sequencing with [#82](TODO-DONE.md#82).** Both are about contacts. If gear-buying is going to read
contact type and level, the contact data model wants to be settled once, by whichever of these
lands first, rather than twice.

---

### Inventory, 2026-09-01

**62 actors**, all type `character`, carrying **1,152 embedded items** between them — 741
skills, 270 gear, 67 spells, 36 cyberware, 30 armor, 5 adept powers, 3 bioware. Averaging ~19
each, from *Metroplex Guardsman* (7) to *Talislegger* (34). They are **archetypes, not named
individuals**: Bookie, Fence, Shark Lawyer, Yakuza Elder, Troll Street Dealer.

Attributes fully populated on all 62; **9 are Awakened**; 3 carry a Reaction dice bonus.
Metatypes: 25 human, 11 each elf/ork/dwarf, 4 troll. **0/62 have a biography, an image or a
folder** — every one is `mystery-man.svg`.

⚠ The pack ships `PLAYER: OBSERVER`, so **players can already browse all 62 stat blocks**, gear
and cyberware included. Fine for a contact directory; worth revisiting if their capabilities
should be hidden.

⚠ **The book is much broader than the pack.** Stat blocks are only p.36-67; p.5-35 is run
structure — Types of Johnsons, Negotiation and Payment, Legwork, Contacts, Getting Paid,
Reputation, Downtime. None of that is represented anywhere.

### What landed — 0.4.5.11

**All the structured data was trapped in `notes` as prose**, one shape across all 62:

> `Mr. Johnson's Little Black Book, p.53. PR 3. Karma Pool 6.`

So a Karma Pool the system **has a field for** was never written to it, and **Professional
Rating** — a real SR3 NPC stat — had nowhere to go at all.

1. **`professionalRating`** added to `CharacterData` and `NpcData`.
2. **`scripts/data/johnson-notes.mjs`** — `parseJohnsonNotes` / `isJohnsonNote`, pure and
   **Foundry-free**, because three consumers need it and only one runs inside Foundry.
3. **`tools/patch-johnson-contacts.mjs`** — patched all **62**, idempotent, Foundry closed.
4. **Migration `0.4.5.11`** via `fixActor`, because *Foundry embeds and does not link*: anyone
   who already dragged one of these into a world holds a stale copy a pack fix never reaches.
5. **`contact.archetypeUuid`** joins the two halves — a contact item can now point at a statted
   archetype, with a 📖 to open the stat block. The free-text `archetype` is kept and is filled
   only when blank.

⚠ **Two records were incomplete AND THE BOOK HAS BOTH.** *Metroplex Guardsman* shipped with a
page and nothing else, *Dock Worker* with no Karma Pool. Read back off the PDF, where the stat
block puts PR as the ninth attribute column and the Pool under *"Dice Pools: Combat X, Karma Y"*:
Guardsman **PR 3, Karma Pool 2**; Dock Worker **Karma Pool 2**. The tool completes the note as
well as the fields, so the pack no longer disagrees with itself.

⚠ **The parser makes every field independently optional, and that is what caught them.** A
parser requiring all three would have silently skipped both — and "60 of 62 patched" is the kind
of number nobody questions.

⚠ **`isJohnsonNote` is the gate, not parseability.** The parser will find a "Karma Pool 6" in
anyone's notes; only the citation makes it this book's data.

⚠ **The migration's Karma Pool rule is a judgement call, documented at the call site.** It fills
at 0 (the pre-0.4.5.7 default) and 1 (the current one) but never above — several contacts
legitimately have a Pool of 1, so 1 cannot be distinguished from a GM's choice. Above 1 can only
be a chosen value.

### The generator explains all of it — 2026-09-01

**The pack is built by `scripts/macros/populate-mr-johnsons-contacts.js`**, which this repo has
had all along (all 27 `populate-*` macros are present and match upstream bar two we modified).
Reading it settles what the inventory could only infer:

⚠ **The data was STRUCTURED the whole time.** Each contact is declared
`baseActor('Yakuza Elder', 53, { metatype: 'human', pr: 3, karma: 10, … })` and a `cite(page,
pr, karma)` helper *stringifies* it into the note. The prose parsed above is a rendering of
real arguments — not a transcription somebody typed.

⚠ **The Karma Pool gap is a `??` default-parameter bug**, and it is worth remembering:

```js
karmaPool = 0,                        // ← the default
karmaPool: karmaPool ?? karma ?? 0,   // ← 0 is NOT nullish, so karma NEVER reaches the field
```

Every one of the 62 shipped with an empty Karma Pool while its own note stated the number.
`null` is the default now.

⚠ **PR had nowhere to go, and the generator says so in its header** — *"has no equivalent
system field; it's recorded verbatim in notes"*. It writes `professionalRating` now.

⚠ **Both files had to be fixed.** The macro so a re-populate does not reintroduce the bugs, and
the pack because re-running the macro rebuilds all 62 inside Foundry — far bigger than
correcting records in place.

⚠ It also calls PR the *"Professional/Connection Rating"*, which is a live question for
[#82](TODO-DONE.md#82): if PR is a connection rating, it and `contact.connection` may be the same number.

<a id="84"></a>

## 84. Audit all 62 Little Black Book contacts against the book — *p.36-67*

**Raised 2026-09-01, while fixing [#83](#83).** Two of the 62 carried real data-entry errors,
and **they were exactly the two whose notes were incomplete**. That is not a coincidence — both
were entered hastily — and it is the reason to suspect the other 60.

| Record | Shipped | The book (p.63 / p.67) |
|---|---|---|
| Metroplex Guardsman | `elf`, every attribute **3**, Essence 6, no PR, no Karma Pool | **Dwarf**, `B Q S I W C E R PR = 4 4 5 3 4 2 4.3 3 3`, Karma Pool 2 |
| Dock Worker | W2 C3 | **W3 C2** — transposed |

Both are corrected in the generator and in both copies of the pack. **The other 60 are
unverified.**

### Why it is worth doing, and cheap

The book's stat block is rigidly formatted and machine-readable — `pdftotext -raw` gives:

```
Metatype: Ork
B Q S I W C E R PR
5 4 6 3 3 3 6 3 2
INIT: 3 + 1D6
Dice Pools: Combat 5, Karma 3
```

⚠ **The column order is `B Q S I W C`** — Intelligence and Willpower before Charisma. That is
what the Dock Worker slip was, and it is the error a hand-transcriber makes repeatedly.

⚠ **Body may carry a parenthetical** (`10 (11)`), which shifts every following token. Any
parser must handle it or it will mis-assign the whole row.

So: extract all 62 rows, compare against `baseActor(...)` in the generator, report mismatches.
A one-off tool, the same shape as `tools/patch-johnson-contacts.mjs`.

⚠ **Report, do not auto-apply.** The generator makes deliberate judgement calls — effective
values over parentheticals, consolidated cyberware sized to hit the printed Essence — so a
mismatch is not automatically an error. A human decides.

⚠ **Dock Worker's Body `10 (11)` is a live example**: the file's convention says use the
effective value, but its Essence is 6, so nothing pays for the +1 and the source is unclear.
Left at 10 rather than guessed.

---

### Audited 2026-09-01 — `tools/audit-johnson-contacts.mjs`

Report checked in at **`audit/johnson-contacts-audit.txt`**. Regenerate with
`node tools/audit-johnson-contacts.mjs`; exits 1 while differences remain.

## 🔴 THE GENERATOR DID NOT MAKE FIFTY TYPOS. IT READ ONE COLUMN HEADING WRONG.

**The book prints `B Q S I W C`. SR3's own character sheet orders attributes `B Q S C I W`** —
physical three, then **Charisma first** among the mental three. Whoever entered this data used
the sheet's order against the book's row, so every value landed one slot out:

| The book's… | went into the generator's… |
|---|---|
| Intelligence | `charisma` |
| Willpower | `intelligence` |
| Charisma | `willpower` |

| Reading | Records |
|---|---:|
| match **only under the rotation** | **38** |
| match exactly (book order) | 5 |
| all three equal, undecidable | 6 |
| match neither — need a human | 11 |

⚠ **The physical attributes are the control.** Across all 61 blocks the differences are
charisma 38, willpower 37, intelligence 24 — against body 5, quickness 5, strength 6. `B Q S`
is unambiguous in both orderings and duly agrees; the three that reorder are the three that
break. That asymmetry is the finding.

⚠ **Independently corroborated by the book's own printed Reaction.** SR3 derives
`Reaction = ⌊(Quickness + Intelligence) / 2⌋`, and the book prints Reaction, so Intelligence can
be checked without trusting either transcription. Reflexes only ever RAISE Reaction, so a
derived value *above* the printed one is impossible. Under the header's literal `B Q S I W C`
the check holds for **58 of 61** rows; under the sheet order, 53. Where a specific record's
Intelligence is disputed the tool prints the verdict per record — the book wins 4 to 1.

### What to do about it

### ✅ Applied 2026-09-01 — the generator now matches the book

The maintainer read the printed pages against the tool's extraction and confirmed they agree;
**that review is what authorised the write.** `--fix` then corrected **52 records**:

- **50** for the mental-attribute rotation, plus Karma Pool, PR, metatype and Essence where
  those differed.
- **2 physical-attribute errors the rotation does not explain** — *Freedom Fighter* strength 3
  (the function's default; the book gives 5) and *Yakuza Elder* strength 3 where the book gives
  2. Neither matched either reading of the parentheticals, which is what marked them out.

Audit now: **51 matching, 9 differing — and every one of the 9 is the parenthetical convention**,
deliberately left for [#86](#86).

⚠ **`--fix` never touches Body/Quickness/Strength where the generator holds the book's NATURAL
value.** That is the convention question, not an error: setting the augmented figure now and
modelling implants later ([#86](#86)) would double-count. Where a physical value matches
*neither* reading it IS corrected — to the natural figure, so the file stays internally
consistent rather than making one record the odd one out.

⚠ **Three parser faults were found by records that looked like data errors and were not.** Each
would have sent a reviewer hunting a discrepancy that did not exist:
- the **Dice Pools line WRAPS**, and the continuation is often where Karma sits;
- the book writes it **both** as `Karma 3` inline and `Karma Pool 4` on a continuation;
- `Combat` matched inside **`Astral Combat`** — equal on the record that exposed it, which is
  exactly how that survives.

⚠ **Talislegger (p.60) has no Dice Pools line at all**, running straight from INIT to Active
Skills. Its Karma Pool is somebody's judgement, not a transcription, and the audit no longer
reports the book's silence as a difference.

### The packs — `tools/patch-johnson-stats.mjs`

The generator is the source of truth, but the shipped packs are built by **running the macro
inside Foundry**, and `npm run sync:install` never copies packs. So a generator fix reaches
nobody on its own.

`patch-johnson-stats.mjs` applies the generator's attributes, metatype, Essence, Magic, PR and
Karma Pool to the pack in place — narrower than a rebuild, reversible, and it disturbs nothing
else in the documents. **50 records changed in each of the two copies; a re-run reports 0.**

⚠ **It parses the generator with the SHARED parser**, `tools/lib/johnson-generator.mjs`. That
module exists because the same parser was written three times during this audit and **two were
wrong** — both silently read every record as `baseActor`'s defaults (I3 W3 C3, karma null) and
produced confident, wrong tables. The audit was switched onto it too, and the report verified
byte-identical afterwards.

⚠ **`karmaPool` and `professionalRating` are written only where the generator states one.** A
`null` must never blank a value recovered from the notes by [#83](#83)'s patcher.

⚠ **Both `base` and `value` are written on each attribute.** `value` is recomputed on load, but
`baseActor`'s own `attr()` helper sets them equal and a pack document disagreeing with itself is
confusing to read raw. **Essence is the exception** — its persisted `base` stays 6 and only
`value` moves, per the Essence rules in CLAUDE.md.

⚠ **Run it TWICE** — once plain for `packs/`, once with `--install` for the copy Foundry reads.

⚠ **NOT auto-applied without review, and the tool still defaults to reporting.** 38 records want a mechanical rotation,
5 are already right, 6 are unknowable from the numbers alone, and **11 fit neither reading** —
so a blanket transform would corrupt 22 of 60. The 11 are listed in the report and want eyes.

⚠ **Both files must move together**, exactly as in [#83](#83): the generator
(`scripts/macros/populate-mr-johnsons-contacts.js`) so a re-populate is correct, and **both
copies of the pack** — `packs/` and the install — because re-running the macro rebuilds all 62
inside Foundry. `npm run sync:install` does **not** carry packs.

⚠ **Nine contacts are Awakened** and carry an extra `M` column (`B Q S I W C E M R PR`).
Anything that touches these rows must read the header, not assume nine columns.

⚠ **Attributes are only what has been checked.** Skills, gear, cyberware and spells are not
audited; the tool compares the stat-block row and the Karma Pool line only.

<a id="85"></a>

## 85. Review `devdrawdiy/sr3e` for functionality we lack

**Raised 2026-09-01.** <https://github.com/devdrawdiy/sr3e> — an independent Shadowrun 3rd
Edition Foundry system. Read it to find **functionality we are missing**, and write that up.

⚠ **NO CODE MOVES FROM THAT REPO. The maintainer's instruction, 2026-09-01.** The deliverable
is a documented list of capability gaps — features, flows, rules coverage — not a port, not a
patch, not a "borrowed" helper. If something there is worth having, it gets designed and built
here from the rules.

⚠ **A different project, not our upstream.** Ours forked from `williamdiffey/The2ndChumming3e`
(still the `upstream` remote). This is a separate lineage, so expect different data shapes,
different Foundry-version assumptions and different rules interpretations — a disagreement is
as likely to be *their* reading as a gap in ours. Note which, when writing it up.

Worth looking for specifically, since these are our known holes: a gear-acquisition flow
([#82](TODO-DONE.md#82)), an action economy ([#48](#48)), a karma/nuyen ledger ([#79](TODO-DONE.md#79)), character
generation, and anything covering the run structure in Mr Johnson's Little Black Book p.5-35
([#83](#83)).

### Still open

- ✅ **Foldered by the book's own sections, 2026-09-01** — `tools/folder-johnson-contacts.mjs`.
  Ten folders, all 62 filed, both pack copies, `packs:check` clean.

  ⚠ **How v14 stores compendium folders was VERIFIED against the installed build**, not guessed:
  `dist/database/backend/compendium-folder.mjs` gives the folder class `collectionName =
  "folders"` and `sublevel = this._db.sublevels.folders`, so they are ordinary records under a
  **`!folders!<id>`** key in the same LevelDB, and a document joins one via its own `folder`
  field. A folder's **`type` must equal the pack's document type** (`Actor` here) or Foundry
  throws on load.

  ⚠ **Folder ids are derived from the section name, not random.** A random id would create a
  second duplicate set on every run and orphan the first — tedious to clean out of a LevelDB.

  ⚠ **The pack's names and the book's headings do not always match.** The book prints
  "CORPORATE SECURITY" and "GHOUL"; the pack has "Corporate Security Guard" and "Ghoul (Human
  Ghoul)". A heading that PREFIXES the pack name is accepted — one-directional and anchored at
  the start, because a loose substring match would file "Corp Decker" and "Corp Scientist"
  under whatever heading contained "Corp".

  Sections, in printed order: Who Watches the Watchmen? · The Show Must Go On · By Any Means
  Necessary · Here Come the Suits · Down and Dirty · Crime, Inc: The Underworld · Sinless in
  Seattle · Workin' the Mojo · To Serve and Protect · Essential Services: Workers.

- **The 62 still have no images.** A directory of `mystery-man.svg` is a poor browse.
  AI-generated token/portrait art is being looked into — **not a today problem** (noted
  2026-09-01). Whatever generates them, the pack write is the same shape as
  `tools/patch-johnson-contacts.mjs`: set `img` and `prototypeToken.texture.src`, both copies
  of the pack, Foundry closed.
- **`NpcData` has no karma fields at all** — no `karma`, `totalKarma` or `karmaPool`. An NPC
  needing a Karma Pool must be a `character`, which is exactly what these 62 are.
- **Nothing yet consumes `professionalRating`.** It is *displayed* — an editable field in the
  Bio tab's Personal Information block, and a read-only gold **PR n** badge in the sheet header
  when it is set — but no roll or flow reads it.
  ⚠ **Two places, one input.** The badge is deliberately read-only: a second element carrying
  `name="system.professionalRating"` would give the form two fields with the same name, which
  makes `FormDataExtended` return an array and silently breaks the save. Same trap as Recoil
  Compensation, which is shown on two tabs and carries the `name` on only one.
  ⚠ The field shows when PR > 0 **or** the viewer is a GM — both conditions are needed, not
  alternatives: hiding at 0 keeps a meaningless "PR 0" off every player's sheet, and hiding it
  from the GM would leave no way to set it in the first place.
- **The run-structure half of the book** (p.5-35) is untouched, and is probably what "the little
  black book" most evokes.

<a id="86"></a>

## 86. The Little Black Book contacts' cyberware does nothing

**Found 2026-09-01, going through [#84](#84) record by record.** Every implant a contact owns is
consolidated into **one item that is a name and an Essence cost**, with every bonus field at
zero. Corp Bodyguard's reads, in full:

```
"Cybereyes (Display Link, Flare Compensation, Low Light), Muscle Replacement 1,
 Reaction Enhancers 2, Wired Reflexes 2 w/Reflex Trigger"
 essenceCost=4.24  bonusQui=0  bonusStr=0  bonusRea=0  bonusInitDice=0
```

So she is missing **+1 Quickness, +1 Strength, +6 Reaction and +2D6 Initiative**. The generator's
header describes the workaround — cyberware *"consolidated onto a single item … sized so the
derived Essence matches the book's printed E column exactly"* — and it does hit 1.76. It just
leaves the character weaker than the book everywhere else.

### The engine is fine. This is content.

⚠ **Everything needed already works**, which is what makes this worth doing rather than
designing: `CyberwareData` carries `bonusBod/Qui/Str/Cha/Int/Wil/Rea/InitDice`,
`_prepareCharacter` applies them (`attr.value = base + cyberBonus + adeptBonus`), `bonusRea` and
`bonusInitDice` reach the Reaction derivation, and Essence already sums `essenceCost` across
installed items.

⚠ **Wired and Boosted Reflexes already ship CORRECTLY** in `sr3e-sr3-cyberware` — `Wired
Reflexes [1] rea=2 d6=1`, `[2] rea=4 d6=2`, `[3] rea=6 d6=3`, exactly SR3's +2 Reaction and +1D6
per level. Only the *generator's* `wired()` helper is wrong (see below).

### Four gaps, and the third needs a decision before anything starts

**1 — ~~Muscle Replacement and Reaction Enhancers are in no pack at all.~~ ✅ FALSE — they ship,
and correctly.** Corrected 2026-09-01 after the maintainer questioned the claim.

```
Muscle Replac. [1..4]    ess 1/2/3/4   qui +N  str +N    mods "+NQCK,+NSTR,"
Reaction Enhance [1..6]  ess 0.3 × N   rea +N            mods "+NRCT,"
```

Both are in `sr3e-sr3-cyberware` with every bonus field populated, matching SR3 exactly —
*"Add the rating of the muscle replacement to Strength and Quickness"* and *"each increases the
user's Reaction Attribute by 1"*.

⚠ **The search was wrong, not the pack.** It was anchored on the BOOK'S spelling —
`/^muscle replacement/i`, `/^reaction enhancer/i` — and the pack ABBREVIATES: `Muscle Replac.`
and `Reaction Enhance`. A prefix search on `muscle` or `reaction` finds both at once. Any future
"is this implant missing?" question should search a stem, never a full name.

⚠ **Everything Corp Bodyguard needs already exists**: `Eyes, Cyber Replacement` + `Eyes, Disp
Link` + `Eyes, Flare Comp` + `Eyes, Low-Light`, `Muscle Replac. [1]`, `Reaction Enhance [2]`,
`Wired Reflexes [2]`, `Reflex Trig`. Their standard Essence sums to the 5.3 that × .8 gives the
shipped 4.24 — so the conversion is assembly from existing parts, not authoring.

⚠ **`Muscle Augmentation` is a DIFFERENT implant** (M&M bioware, +Strength only) and is not a
substitute.

⚠ **Reaction Enhancers are the stated EXCEPTION to non-stacking.** Wired and Boosted Reflexes do
not combine with each other, and the adept's Improved Reflexes combines with neither
([#64](TODO-DONE.md#64)) — but the enhancer's own entry says outright that it stacks. Do not "fix" a
character who has both.

**2 — 🔴 `SR3E.quicknessNotForReaction` lists only move-by-wire.** Muscle Replacement carries
the identical carve-out in identical words — *"this change does not affect Reaction"* — so
without a second entry every user gains Reaction they are not entitled to. One line in
`config.js`; the [#4](TODO-DONE.md#4) machinery does the rest.

⚠ **This is now the ONLY live defect on this item**, and it is worse than it looked: the shipped
`Muscle Replac.` items really do grant `+N` Quickness, so the bug is reachable today by anyone
who drags one onto a character — it does not wait for the conversion.

**3 — ✅ GRADE MULTIPLIER IMPLEMENTED 2026-09-01.** `SR3EActor.gradedEssenceCost` applies the
M&M p.45 table before `installedEssenceCost` sums, so pack items can carry the book's own
STANDARD costs and `grade` does the work. Rounded up per item to 2dp; unknown grades cost full
Essence; bioware never reaches it. `tests/essence.test.mjs` + 2 mutants. **The remaining
blocker on this item is gap 4, the conversion itself.**

⚠ **KEEP `CyberwareData.grade`. Maintainer's instruction, 2026-09-01.** It is not dead weight
even while unread: a player looting a dead opponent's chrome needs to know whether it is
standard, alpha or beta — that changes what it is worth and what it costs in Essence to fit.
**So this wants a way to REPORT the grade, not just a multiplier**, and any future salvage flow
is its first real consumer.

⚠ **The book DOES state the grade** — on the `Cyberware:` line, in four different formats across
the 62: `Cyberware:` (31, standard), `Cyberware (all Alphaware):`, `Cyberware (All Alphaware):`,
`Cyberware [alphaware]:`, and `Cyberware (all betware):` — the last a typo for betaware. So the
data is there to parse; only 4 of 62 are non-standard.

⚠ **SR3 p.296:** *"reduce the Essence Cost of the cyberware by 20 percent (round up) and
multiply the Cost of the item by 2."* Core carries standard and alpha only; beta and delta are
M&M. The generator's author already applied it — Corp Bodyguard's stub is `4.24`, exactly
`5.3 × 0.8`.

 `_installedCyberwareCost` sums
`essenceCost` raw; there is no Alphaware/Betaware/Deltaware multiplier anywhere in `config.js`
or `SR3EActor`. Corp Bodyguard's implants
are *"all Alphaware"*, so splitting her stub into real items pulled from `sr3e-sr3-cyberware` —
which carry STANDARD costs — would land her Essence at 6 − 5.3 = 0.7 instead of the printed
1.76. Two ways, and the first is preferred:

  - **implement the multiplier** in the Essence derivation. ~5 lines, it is RAW, it makes
    `grade` mean something system-wide rather than only here, and pack items can then carry the
    book's own standard costs. It touches the Essence derivation, which is load-bearing and
    carefully documented ([#5](TODO-DONE.md#5)), but the change is additive and testable;
  - store pre-discounted `essenceCost` per item and leave grade as a label — no engine change,
    but the number on the item then disagrees with the book's printed cost for that implant,
    and salvage would have to un-discount it to say what the part is worth.

**4 — ✅ The conversion — FIRST PASS DONE 2026-09-03 (`tools/import-johnson-gear.mjs`).**

**37 stubs converted across 22 of the 62 contacts**, exact-name matches only. A Corporate
Security Guard's `Browning Max-Power` is now a `firearm` carrying `9M / SA / HPist` instead of an
inert `gear` stub with no damage code — **the GM can roll it**. `gear` fell 270 → 233; firearm
0 → 19, melee 0 → 9, armor 30 → 37, cyberdeck 0 → 2. Each converted item carries a real
`_stats.compendiumSource`, which is what "does their gear link back to the compendium" asked for.

⚠ **NOT blocked on [#12](TODO-DONE.md#12-write-a-committed-pack-rebuild-script-and-vendor-its-sources)**, as
was assumed. #12 blocks *creating new packs*; this patches embedded documents inside a pack that
already exists, exactly as the skills pass did.

⚠ **Exact matches only — the stem tier is deliberately absent**, for the `Club Drugs of
Choice` → `Club` and `Flash-pak` → `Flash` reasons above.

⚠ **Three target types are refused by design**, each for a different reason:
- **`skill`** — a live false match: the *Mercenary* carries a `gear` "Desert Wars" **and** a
  knowledge skill "Desert Wars 4". Converting would duplicate it.
- **`cyberware`/`bioware`** — Essence is permanent and the book prints it. Seven stub names match
  cyberware with an Essence cost (`Radio` 0.75, `Biomonitor` 0.3, `Datajack` 0.2), but the Taxi
  Driver's radio is on the book's **Gear** line, not its **Cyberware** line. Converting would
  charge Essence the printed figure excludes, contradicting [#84](#84).
- **`spell`/`adeptpower`** — nothing on a gear line is either.

⚠ **Two faults were made on the first run and caught by diffing the two pack copies.** Both are
now guarded in the tool, and both are the kind nothing else would have surfaced:
1. **The index must read the REPO's packs even when writing the install's.** The install carries
   22 unshipped pre-split packs; indexing them converted `Switchblade` in one copy only, and
   stamped `compendiumSource` UUIDs naming `sr3e-firearms` — **dead links for every user but
   this machine**.
2. **Keep the CONTACT's name, not the pack's.** Taking the pack's name turned
   `Light Security Armor [helmeted 7/6, unhelmeted 6/4]` into plain `Light Security Armor`,
   colliding with the 7/6 entry already on that sheet — two identical names, helmeted
   indistinguishable from unhelmeted.

**173 gear stubs still unmatched**, in the four buckets below. Original analysis follows.

**4a — ✅ SECOND PASS DONE 2026-09-14 (on `feature/default-books-gear`, with TODO 91's packs).**
**13 more converted** — `gear`/`medical` are now allowed targets: Survival Kit ×2, Binoculars,
Jackstopper, Wrist Phone, Gunsmith Shop, BTL-modified Simdeck, low-light/thermo Goggles, and five
medkits. Rules added to the tool, each pinned by `tests/johnson-gear-import.test.mjs`:
- **SR2 packs are never targets** — the Little Black Book is an SR3 book.
- **The contact's own rating wins** (`Medkit [Rating 5]` → M&M's *Medkit Rating 5*, rating 5); a
  bracket's words count as part of the name.
- **One reviewed alias**: plain `Medkit` → *Basic Medkit* (the pack's name for SR3 p.304's medkit).
- **Rated variants without a rating are reported, not guessed.**
- The index reads through a copy (a `--check` had churned 582 pack files), and a converted item's
  `compendiumSource` makes a second run a no-op (gear → gear keeps the type).

**For the maintainer:**
1. ✅ **The three `Helmet`s — RESOLVED 2026-09-14** (the maintainer: "use the security helmet").
   `tools/relink-johnson-helmets.mjs` links them to the SR3 *Security Helmet* (p.284), **all three at
   2/1** — the maintainer's ruling. The Freedom Fighter prints 2/1 (p.46; the first pass had flattened
   it to 1/1); Highway Patrol and SWAT Team Member print 1/1 (p.62), but **no SR3 helmet is 1/1**
   (Security Helmet +1/+2, CC's Rapid Transit +0/+2 and Military +2/+3; every 1/1 helmet is SR2). ⚠ Actors a world already
   imported keep their old embedded copy — Foundry embeds, it does not link.
2. **Rated variants with no rating on the contact's line**: *Micro-transceiver* (Ork Nation Organizer,
   Earnest Muckraker) and *Micro-recorder* (Earnest Muckraker) — the SR3 packs ship ratings 1-10.
3. **160 distinct stubs still unmatched** — compound lists, categories (*Club Drugs of Choice*), and
   gear no pack carries (*Flash-pak*). These need a human reading each line, per the rules above.
4. The install's 13 new links point at TODO 91's packs, which reach the install with its
   `build-default-gear --install` step.

**4b — The remainder: REPLACE THE STUBS WITH REAL IMPORTS.**

⚠ **Nothing links, so there is no link to fix.** Checked 2026-09-01: of the **1,152 embedded
items** across the 62 contacts, **zero** carry `_stats.compendiumSource` or
`flags.core.sourceId`. Every one was fabricated inline by the generator's own `skill()` /
`gear()` / `cyberware()` helpers. A stub is not a mis-pointed reference to a pack entry — it is
a different shape entirely, so the job is **delete the stub, create from the pack entry**, not
re-point anything.

That is more work than relinking and a better outcome: an item created from a compendium entry
arrives carrying `compendiumSource`, its `bookPage` citation ([#87](TODO-DONE.md#87)), its
`cyberwareCategory`, `cost`, `availability`, `legalCode` — and, for cyberware, the bonus fields
that make it *do* something.

⚠ **THE PROBLEM IS WIDER THAN CYBERWARE.** The same is true of every embedded type:

| Type | Count | Linked | State |
|---|---:|---:|---|
| skill | 741 | 0 | **fine as-is** — skills are per-character ratings, not pack references |
| gear | 270 | 0 | generic `gear()` entries; no stats |
| spell | 67 | 0 | name + Force in the name; no drain, range or target |
| cyberware | 36 | 0 | one consolidated stub per contact, all bonuses 0 |
| armor | 30 | 0 | ballistic/impact only where the book bracketed them |
| adeptpower | 5 | 0 | inert, like every adept power was before [#59](TODO-DONE.md#59) |
| bioware | 3 | 0 | as cyberware |

⚠ **The generator says so itself**, and it was a reasonable call at the time: *"Most Gear-line
items (weapons, vehicles, electronics) are recorded as generic `gear()` entries rather than
statted firearm/melee/armor items, since the book doesn't give damage codes for them and
fabricating SR3 canon stats risked errors."* So a contact's **Ares Predator is a name with no
damage code** — it cannot be fired. Importing the real `sr3e-sr3-firearms` entry fixes that
without fabricating anything, because the stats come from the book's own gear tables rather
than from this book.

⚠ **The 741 skills must be LEFT ALONE.** A skill is a rating on that character, not a reference
to a shared object; they are correctly inline and correctly formed (checked: 0 malformed).
"Relink everything" would be wrong here.

### Shape of the work

1. Parse each stub's name — they are lists (*"Cybereyes (Display Link, Flare Compensation, Low
   Light), Muscle Replacement 1, Reaction Enhancers 2, Wired Reflexes 2 w/Reflex Trigger"*).
2. Match each part to a pack entry. ⚠ **Search a STEM, never a full name** — the packs
   abbreviate (`Muscle Replac.`, `Reaction Enhance`), which is [#87](TODO-DONE.md#87) and which already
   produced one false "these do not exist" finding.
3. Create the real items, delete the stub, and let the grade multiplier ([#86](#86) gap 3, now
   implemented) put Essence back where the book has it.
4. **Report, do not auto-apply** — same discipline as [#84](#84). A name that matches nothing
   must be listed, not guessed at.

⚠ **Verify against the printed Essence.** Corp Bodyguard's parts sum to **5.3** standard, and
`5.3 × .8` alphaware is the **4.24** her stub already carries — so the total is a checkable
invariant per contact, not a leap of faith. Any contact whose parts do not reconcile has a
part that was matched wrong.

⚠ **Some stub names are malformed and cannot be parsed blindly.** At least one has unbalanced
brackets — *"Bone Lacing (Plastic), Cybereyes (Thermographic, Flare Compensation, Muscle
Replacement 2, Smartlink 2, Wired Reflexes 2)"* — where the closing bracket sits after
`Wired Reflexes 2` rather than after the eye mods, so a naive split on commas-outside-brackets
yields one item instead of five. These are the records the report must surface for a human.

⚠ **Still the largest piece of [#86](#86), and it is NOT "matching and importing".** That was
this entry's own claim and it was measured on 2026-09-01 against every shipped pack. It is wrong.

**411 non-skill embedded items, 319 distinct name+type pairs.** Indexing all 2,075 distinct item
names across the other 81 packs and matching by normalised name:

| | |
|---|---:|
| exact name match in a pack | **92** |
| stem match (one name is a prefix of the other) | 35 |
| **no match at all** | **192** |

So **60% of the stubs name nothing that ships**, and a mechanical pass would silently drop them.

⚠ **AND THE STEM MATCHES ARE DANGEROUS — a naive conversion is worse than doing nothing.**
Verified by hand:
- **`Club Drugs of Choice` → `Club` (`sr3e-sr3-melee`).** Club Hopper, p.43 — the book's gear
  line ends *"autograph book, club drugs of choice"*. It is **`Drugs, Type: Club`**, so the right
  answer is the `drug` item type; the stem match would hand the contact a bludgeon instead.
- **`Flash-pak` → the spell `Flash` (`sr3e-mits-spells`).** Corp Bodyguard, p.48. A flash-pak is
  ordinary SR3 core gear (p.288: four quartz-halogen micro-flashes, **+4 TN to anyone facing it**,
  +2 with flare compensation, and it negates poor-lighting modifiers at the cost of its own +2).
  The stem rule matched it to a spell purely because `flash pak` begins with `flash`.

⚠ **In BOTH cases the correct answer is "nothing in the packs fits", and the matcher returned a
confident wrong one by a different mechanism each time** — which is the argument against
automating the stem tier at all, not an argument for two more special cases.
- **`Pocket Secretary` → `Pocket Secretary (Basic)`, typed `cyberware`.** It appears on **15
  contacts**, the single most common stub, and a pocket secretary is a handheld. Whether that is
  a mis-typed pack entry or a genuine headware variant has to be read, not guessed.

⚠ **49 of the matches would CHANGE THE DOCUMENT TYPE**, which is the useful half: everything
in the generator is typed `gear`, so `Browning Max-Power` and `Ares Crusader` are gear rather than
`firearm`, `Stun Baton` rather than `melee`. **That is why a contact cannot fire a gun** — more
directly than the cyberware complaint this entry opens with.

⚠ **[#87](TODO-DONE.md#87) blocks part of this.** `Predator 2` matches nothing; the packs ship
`Ares Predator`, `Ares Predator II` and `Ares Predator III`. The abbreviation problem runs in both
directions and an exact-name pass cannot see through it.

⚠ **Some unmatched stubs name a CATEGORY, not an item**, and no amount of matching will fix
them. `Club Drugs of Choice` is the clearest: it says *what kind* of drug, for the GM to fill in.
Nothing suitable ships either — the four drug packs hold 48 entries, categorised Pharmaceutical
Compounds (26), Stimulants (9), Magical Compounds (7) and one each of Depressants, Hallucinogens
and Narcotics; **there are no Designer Drugs at all**. These convert to a correctly-**typed**
placeholder, which is still a real gain over a `gear` stub: a `drug` document reaches the drug
fields and the GM knows what to replace it with.

⚠ **A stub can also be real gear the system simply does not carry.** The flash-pak above is in
the core rulebook with a mechanical effect, and ships in **no** pack — the only Flash-pak entries
anywhere are two cybereye variants in `sr3e-ct-cyberware`, which are a different item. Authoring
these is a fourth bucket, separate from matching.

⚠ **Many unmatched stubs are LISTS, not items** — `Cybereyes (Opticam), Data Compactor 2,
Datajack, Headware Memory [300 Mp], Headware Radio` is one document holding five implants. These
have to be split before anything can match them.

**So the order of work is: [#87](TODO-DONE.md#87) first (names), then split the compound stubs, then the 49
type corrections, then match — with every stem match read by a human.** The 92 exact matches are
the only part safe to automate.

**The 192 unmatched split four ways**, and only the first is an import at all:

| Bucket | Fix |
|---|---|
| named item, wrong/abbreviated name | [#87](TODO-DONE.md#87), then match |
| compound list in one stub | split, then match |
| names a **category** (`Club Drugs of Choice`) | correct the **type**, leave as a GM placeholder |
| real gear the packs do not carry (`Flash-pak`) | author the pack entry |

### ✅ Also found here — `wired()` in the generator was wrong — **FIXED 2026-09-01**

```js
function wired(n)   { return { reactionBonus: n, diceBonus: n }; }
```

SR3 p.300: *"Each level adds **+2** to the user's Reaction and gives +1D6 Initiative die."* So
this delivered **half** the Reaction, under a comment claiming "real SR3 formulas".

**The book proves it on the one record that uses this.** Gunsmith (p.58) prints
`B4 Q4 S4 I4 W4 C3 E3`, **`R 4 (6)`** and **`INIT: 6 + 2D6`**. Unaugmented Reaction is
(4 + 4) / 2 = 4, so the printed augmented 6 is **+2**, and the second die is **+1**. Wired
Reflexes 1 exactly.

Fixed to `reactionBonus: n * 2`, and `patch-johnson-stats.mjs` now carries reflex bonuses into the
packs — **1 record changed, 61 already correct**, in both copies. `tools/lib/johnson-generator.mjs`
reads the `wired()` / `boosted()` **call** rather than a literal, since the numbers are computed by
those helpers and would otherwise have to be kept in step by hand.

⚠ `boosted(n)` returning `reactionBonus: 0` is **right** — Boosted Reflexes give initiative dice
and (at higher levels) some Reaction, and the shipped pack items carry the real numbers.

<a id="87"></a>

## 91. Core gear that ships nowhere — eight item types with zero documents

> ✅ **Gear, ammunition (arrows and bolts included) and medical — DONE 2026-09-14** on branch
> `feature/default-books-gear`, for **every default-on book**, not just core: 2,926 documents in 25
> packs, generated by `tools/build-default-gear.mjs` from vendored generator data, pinned by
> `tests/default-gear.test.mjs`. Full account: `audit/default-books-gear-audit.md`. This also
> answers [#12](TODO-DONE.md#12-write-a-committed-pack-rebuild-script-and-vendor-its-sources) for this content —
> a committed builder over committed sources — and [#23](TODO-DONE.md#23)'s missing ammunition.
>
> **Still open from this entry:** core **grenades** (weapons — out of scope by the maintainer's
> ruling, 2026-09-14) and the `thrown` · `contact` · `quality` · `complex_form` · `summoning`
> types. **For the maintainer:** the four decisions in §6 of the audit (synthesised combinations,
> truncated SR2 names, a stat audit, books upstream lacks).

**Found by `audit/sr3-core-gear-audit.md` (2026-09-02),** which started from [#86](#86)'s
flash-pak and asked whether that was one gap or a class. It is a class.

`system.json` declares 22 Item types. **Eight have zero documents across all 82 packs**:
`ammunition` · `gear` · `thrown` · `medical` · `contact` · `quality` · `complex_form` ·
`summoning`. No book in the system ships a gear, ammunition or electronics pack — every pack is
one of `adept-powers · armor · bioware · cyberware · drones · drugs · firearms · melee ·
projectiles · spells · vehicle-mods · vehicle-weapons · vehicles`.

### ⚠ `ammunition` — **already tracked as [#23](TODO-DONE.md#23), a month before this audit**

⚠ **This audit REDISCOVERED [#23](TODO-DONE.md#23) and first wrote it up as new.** That entry dates from
**2026-08-05** and was *found in play*, which is a better warrant than a sweep. It is also more
complete: it inventories every piece of the implementation, records that this is **not a
regression** (the old monolithic packs on `main` had no ammunition either, the archive holds
zero, and there is no source data in `rawdata/` or upstream), and it names a blocker this audit
missed — **[#12](TODO-DONE.md#12-write-a-committed-pack-rebuild-script-and-vendor-its-sources), because the
populate macros were retired and there is currently no supported way to build a pack at all.**

**Read [#23](TODO-DONE.md#23) for the ammunition work.** Only the items below are new here.

⚠ **This is a PACK gap, not a book gap and not a rules gap** — three layers, and only the third
is empty. The **books** print ammunition in full (SR3 core p.279; Cannon Companion devotes a
chapter to it). The **rules** are implemented. What does not exist is a **compendium document a
player can drag onto a sheet**, and a search by name under every item type confirms it did not
merely ship mis-typed.

`SR3E.ammoTypes` carries the real rules — APDS halving ballistic, flechette's
`max(Impact × 2, Ballistic)`, gel's −2 Power and Stun, explosive/EX Power bonuses, tracer — beside
`loadMechanism` matching, stockpile-and-magazine tracking, `SR3EItem.reload()` and a `trackAmmo`
world setting gating all of it. **Not one ammunition item ships in any pack.** `SR3EItem.reload()`
filters `actor.items` for `type === 'ammunition'`, finds none, warns *"No compatible ammo in
stock"* and stops — so with `trackAmmo` on **every firearm in the system is unreloadable** until
a GM hand-authors the items.

**What this audit adds to [#23](TODO-DONE.md#23):**
- **Arrows and bolts are the same gap.** The nocked-ammo flow matches them by `arrow`/`bolt`
  loading mechanism and the book prints both rows; neither ships, so a bow can never be re-nocked.
  [#23](TODO-DONE.md#23) lists the 8 firearm types and does not mention these.
- **Confirmed it did not merely ship MIS-TYPED.** Searched by name under every item type: 31
  hits, none of them ammunition — weapons named for the round they fire (`9mm Flechette SMG`,
  `Flechette Gun`), a French vehicle decoy (`Lure Ammo AM-56`), and spells.

⚠ **Arrows and bolts are the same story** — the nocked-ammo flow matches them by `arrow`/`bolt`
loading mechanism, and the book prints both rows. Neither ships, so a bow can never be re-nocked
with `trackAmmo` on.

### ⚠ The `sr3` pack has no grenades, and core-only is the DEFAULT configuration

**Reported in play 2026-09-11:** *"grenades are all showing the second edition version. I don't see any 3rd edition grenades."* — exactly this gap, seen at the table.

The AoE flow is fully built — cursor-aimed blast point, scatter, epicentre relocation, per-target
falloff, Chunky Salsa. Grenades do ship (15 in `sr3e-sr2-projectiles`, 6 in
`sr3e-cc-projectiles`, typed `projectile`/`GR`, which `SR3E.thrownCategories` accepts) —
**but none in `sr3e-sr3-projectiles`**. A table with only the core book enabled has nothing to
throw.

### ⚠ Weapon accessories are mechanically live and entirely absent · *SR3 p.281*

The system already models the effects — `recoilMod`, actor `recoilCompensation`, smartlink −2 TN,
laser sight −1. None of the items exist: silencer, sound suppresser, smartgun (internal and
external), smart goggles, laser sight, gas vent II/III, shock pads, tripod, bipod, imaging scopes,
ultrasound sight/goggles, spare clips.

### The rest — roughly 120-130 items

**Reported in play 2026-09-11:** *"I can't find a medkit in the compendium."* — the `medical` type ships zero documents; Medkit, slap patches and the trauma patch are all in the Biotech & medical section above.

Electronics (p.288) · Communications (p.290) · Surveillance & countermeasures (p.292) ·
Security devices (p.293) · Survival gear (p.295) · Biotech & medical (p.304) ·
Skillsofts & chips (p.296). Of ~200 names extracted, 42 already ship somewhere — armor rows,
the cyberdecks in `sr3e-mdf-cyberdecks`, a few cyberware entries.

### Order of work

⚠ **Nothing here can start until [#12](TODO-DONE.md#12-write-a-committed-pack-rebuild-script-and-vendor-its-sources)
is resolved.** The populate macros were retired and the per-book routing exists nowhere in git, so
**the repo cannot currently build a pack at all** — and [#23](TODO-DONE.md#23) already names itself as the
first task to actually need that decision. An earlier draft of this entry recommended
"ammunition first, it is only nine rows"; nine rows you have no committed way to build is not a
starting point. **#12 is the starting point.**

After that: **ammunition** ([#23](TODO-DONE.md#23) — finished mechanics sitting idle, and it unblocks
`trackAmmo` for every firearm and bow already shipped), then core grenades, then accessories (the
next-most mechanical), then the bulk gear.

⚠ **A new pack per kind, per book** (`sr3e-sr3-ammo`, `sr3e-sr3-gear`, …), following the existing
one-pack-per-book-per-type layout, and each **must declare its `book` flag** or the source-book
filter cannot hide it. Adding a pack requires a **full Foundry restart**, not F5.

⚠ **`sr3e-sr3-drones` and `sr3e-sr3-vehicles` are NOT empty** — 6 and 23 documents. They are
**Actor** packs, so a sweep counting only `!items!` keys reports zero. That mistake was made and
caught during this audit; do not re-file it.

<a id="92"></a>

## 92. Repeat the gear audit for the other default-on books

> ✅ **Non-weapon gear: coverage DONE 2026-09-14** — `audit/default-books-gear-audit.md`. Every
> default-on book's gear, ammunition, medical, drugs and armour is now in a pack; names were
> spot-checked against the PDFs for core, CC, M&M and MitS. **Still open:** the row-by-row STAT diff
> below for those packs, and weapons/cyberware/bioware/vehicles (out of that change's scope).
>
> ⚠ **"Fourteen other books" was wrong** — **eleven** are on by default besides core (`config.js`):
> `cc` `mm` `mits` `r3` `matrix-defragged` and `sr2` `ct` `ssc` `st` `fof` `pna`. `sota`, `sota2`,
> `tal` and `twl` are OFF; the table below still lists them because it predates the correction.

[#91](#91) and `audit/sr3-core-gear-audit.md` cover **`sr3` only**. Fourteen other books are
**on by default** and none has been checked against its printed tables.

| Book | Ships | Not yet audited |
|---|---|---|
| `sr2` | armor · cyberware · firearms · melee · projectiles · vehicle-mods · vehicle-weapons | gear, ammo, electronics |
| `mm` | armor · bioware · cyberware · drugs · firearms · melee | gear, medical |
| `cc` | armor · cyberware · firearms · melee · projectiles | **accessories — CC is the weapons book** |
| `r3` | drones · vehicle-mods · vehicle-weapons · vehicles | rigger gear |
| `mits` | adept-powers · spells | foci, magical gear |
| `sota` / `sota2` | bioware · drugs · vehicles / +adept-powers · armor · drones · firearms · spells · vehicle-mods | gear |
| `twl` | armor · spells · vehicle-mods · vehicle-weapons · vehicles | gear |
| `ct` · `fof` · `pna` · `ssc` · `st` · `tal` | 1-2 packs each | everything else |

### How to run one — the method that worked, and its four traps

1. `pdftotext -layout -f N -l N` the table pages. **Weapon tables extract cleanly**; two-column
   prose pages need per-column cropping (`-x 0 -W 308`, then `-x 308 -W 320`; mediabox ~616×795pt).
2. Dump the pack's own rows and diff **name, then every stat column**.
3. Report; never auto-apply.

⚠ **Count `!actors!` as well as `!items!`.** Drone and vehicle packs are Actor packs.

⚠ **A repeated name is not necessarily a duplicate.** Bows, crossbows and slings ship one record
per Strength-Minimum, all sharing a name.

⚠ **The first weapon in each table section loses its own row** to the section header in a
`-layout` dump — its name and its numbers land on different lines. Check every section's first
entry by hand.

⚠ **Names are abbreviated in the packs** ([#87](TODO-DONE.md#87)), so match on a stem and confirm by stat.
`Muscle Replacement` ships as `Muscle Replac. [1..4]`.

**Do `cc` first.** Cannon Companion is the weapons-and-gear book, it is on by default, and it is
where the accessories [#91](#91) wants most likely already exist in print.

<a id="93"></a>

## 104. Art for the vehicles — **requested during the TODO 93 run, 2026-09-13**

**Request, not started.** The maintainer: *"we need some art for the different vehicles. something
generated matching the style from the books when available."*

Vehicle and drone actors currently carry no art of their own. Wanted: a portrait per vehicle,
generated, in keeping with the look of the sourcebooks' vehicle illustrations.

**To settle before starting:**
- **Which vehicles** — the `sr3`, `r3`, `sota`, `sota2`, `twl`, `tss`, `ssg`, `fra`, `sr2` vehicle and
  drone packs. Count them first (Actor packs — key `!actors!`, see CLAUDE.md), then decide whether
  every entry gets art or one image per chassis type.
- **Original art only.** "Matching the style" should mean the setting's look — era, silhouettes,
  palette — not copying or tracing the books' illustrations, which are FASA/Catalyst's.
- **Where the files live and what they cost the download** — they ship with the system, so check
  total size and format (WebP), and add the `img` paths through the pack tooling (Foundry closed,
  both pack copies — CLAUDE.md, *Compendium population*), which is blocked on TODO 12 for new
  content but not for editing an existing document's `img`.
- **Tokens — decided 2026-09-13: separate top-down tokens.** Each vehicle gets two images: a
  portrait (the actor `img`) and a **top-down** token (`prototypeToken.texture.src`), drawn to
  the vehicle's footprint so it reads on the grid. Vehicle footprints differ a lot (a bike vs a
  bus), so the token also needs a sensible grid width/height per chassis.

<a id="105"></a>

## 117. Every shipped document must carry a book and page — **requested 2026-09-13**

**Request (maintainer):** all gear we ship needs a book and page number. The field is
`system.bookPage`, in the upstream generator's `code.page` form (`sr3.303`, `mm.025`; several
sources comma-separated, `sr3.312,r3.172`, is fine).

**Audit of the repo's packs, 2026-09-13** (a copy of `packs/`, so Foundry's open databases were not
touched): **3,322 documents; 934 lack a usable book/page.**

| Gap | Count | Where |
|---|---:|---|
| No `bookPage` at all | **620** | `sr3e-skills` 438 · `sr3e-mr-johnsons-contacts` 62 · the five `sr3e-mdf-*` packs 116 (cyberdecks 39, programs 30, IC 20, agents 17, hosts 10) · `sr3e-example-characters` 4 |
| Placeholder page `???` | **314** | `sr3e-sr2-firearms` 176 · `-armor` 60 · `-melee` 40 · `-vehicle-mods` 17 · `-projectiles` 10 · `-vehicle-weapons` 10 · `sr3e-mm-drugs` 1 (Kamikaze) |
| Two sources cited | 48 | `sr3e-sr3-vehicles`/`-vehicle-mods`/`-drones`, two SR2 grenades — **valid**, not a gap |

Every other document (2,340) has a clean `code.page`.

**The schema is part of the gap.** `GearData`, `CyberdeckData`, `ProgramData`, `ComplexFormData`,
`QualityData`, `SkillData`, `SummoningData` and `ContactData` have **no `bookPage` field**, so an
item of those types cannot carry one even when someone types it (a TypeDataModel drops undeclared
keys — the lesson of TODO 59). No gear ships today (TODO 91), which is why it did not show up in the
count; it would have the moment it did.

**What it takes:**
1. Add `bookPage` to the types above (**data-model change** → full restart).
2. Fill the placeholders and gaps from the PDF library, which has a text layer for these books:
   SR2 core for the 314 `sr2.???` (the SR2 core PDF is in the library), Mr. Johnson's Little Black
   Book for the 62 contacts, the core rules for skills. The Matrix Defragged packs **can now be
   sourced**: *Shadowrun 3e - The Matrix Defragged v2.pdf* was added to the library on 2026-09-13,
   with a text layer — see [#119](TODO-DONE.md#119).
3. Make it a rule the tooling enforces: `tools/check-packs.mjs` to report any document with an empty
   or `???` `bookPage` (information for now, a fault once the backlog is cleared), so new content
   cannot ship without one.
4. Show it: the item sheet's `bookPage` should read as *"SR3 p.303"*, not the raw code.

⚠ Pack edits need Foundry **closed** and must be run twice (repo + `--install`) — CLAUDE.md,
*Editing an existing pack*.

**Re-surveyed 2026-09-21. The backlog is 200, and every one of them is BLOCKED — this is not
grind-it-out work, and the entry above was wrong about why.**

| Group | Count | Status |
|---|---:|---|
| SR2 gear, `sr2.???` | **154** | 🟡 **Unblocked 2026-09-21** — see below. |
| Matrix Defragged agents (17), hosts (10), Hermes Ikon (1) | **28** | ⛔ Authored for this system — no book to cite. |
| `sr3e-skills` | **18** | ⛔ 15 Area Knowledge examples + 3 whose upstream source is `sr3.XXX`. |

**UNBLOCKED 2026-09-21 — the maintainer has an SR2 library, and there is now a way to read it.**
It lives at `C:\Users\lance\Documents\Shadowrun 2nd Edition PDFs` (35 files) and is almost all
image-only, so `pdftotext` returns nothing. **`tools/ocr-pdf.ps1`** reads them using
`Windows.Data.Pdf` + `Windows.Media.Ocr`, both built into Windows — no install, nothing added to
the repo, ~2 seconds a page. It rebuilds table layout from the OCR word boxes, so stat rows survive:

    Beretta Model 70   SMG      BF/FA     35(c)   6M   3.75   900%      <- 900¥
    Heckler & Koch     SMG   5  SA/BF/FA  20(c)   6M   3.25   850Y      <- 850¥

⚠ **Seven of the 35 already have a text layer** (Grimoire, Magic, Blackhand's Street Weapons, DMZ,
Running Gear, Companion — Beyond the Shadows, NAGNA). Try `pdftotext -layout` first: it is exact
and instant. The rest need OCR.

⚠ **AND THE ITEMS ARE NOT ALL FROM SR2 CORE — this is the new finding.** The names in
`sr3e-sr2-melee` are *Bear-Knife*, *Cane Sword*, *Decapitator battleaxe*, *Gasher battleaxe*,
*Mjolnir warhammer*, *Kendachi Mononaginata*, *Mersch MX-23 Stunlance* … none of which is in SR2
core's Equipment Table (printed p.254, verified by OCR; the Sourcebook Updates table on p.278 is
the other one). They are **Street Samurai Catalog** and similar. So the work is not "read one book",
it is **identify the real source book per item, then cite it** — and several of those documents are
in the wrong pack as well, which is the "names a different book from their pack" case `check-packs`
already reports.

⚠⚠ **AND THEN THE REAL FINDING: the "SR2" packs are mostly FAN CONTENT.** Counting what the
documents that *do* carry a page actually cite:

| Pack | Docs | Missing | What the rest cite |
|---|---:|---:|---|
| `sr3e-sr2-firearms` | 176 | 53 | **`pw` 115**, `ssc` 7, `fof` 1 |
| `sr3e-sr2-armor` | 76 | 49 | `sr2` 23, `fof` 2, `ssc` 1, `pw` 1 |
| `sr3e-sr2-melee` | 40 | 32 | `fof` 3, `pw` 3, `sr2` 1, `ssc` 1 |

**`pw` is a FAN code** — it is one of the eight in `archive/non-sr3-content/`'s `fan` bucket
(ray · cb1-4 · cp · nagee · **pw** · bjf · adh). So 115 of the 176 "SR2 core" firearms are fan
material sitting in a shipping pack, which is the case `check-packs` already reports as *"names a
different book from their pack"* — quantified here for the first time.

⚠ **CORRECTION, same day — the search above was INCOMPLETE and its conclusion was too strong.**
What was actually searched: SR2 core's Equipment Tables (printed pp.254 and 278, read by OCR), the
**Street Samurai Catalog** (all 118 pages OCR'd — 0 of 31 melee names) and **Blackhand's Street
Weapons** (text layer — 5 of 27, and Blackhand's is itself fan, no FASA code). From that I wrote
that the items "are not in the official books". **That does not follow**, because three obvious
candidates were sitting in the same folder unread:

- **Fields of Fire `{FASA7114}`** — SR2's *weapons and combat* sourcebook, and the book code
  `fof` that three of these very documents already cite. This is the first place to look.
- **Street Samurai Catalog (Revised) `{FASA7104a}`** — a second, larger edition; only the
  original `{FASA7104}` was read.
- **Cybertechnology `{FASA7119}`** (`ct`).

So the honest state is: **not yet found, not "not there"**. Do the three above before drawing any
conclusion about fan origin for a given item.

⚠ **What does NOT depend on that search, and stands:** the `pw` counts in the table above. 115 of
176 firearms in a pack named for SR2 core cite a fan code, and that is a fact about the packs
rather than about any book.

**So this is a question for the maintainer before it is work at all:**
1. Should fan content ship in a pack named for SR2 core? The system's stated principle is that it
   *"ships no sourcebook content it cannot turn off"*, and the fan material was meant to be parked
   in `archive/non-sr3-content/` (1,219 documents already are).
2. If it stays, it needs its own book code and pack so the toggle can reach it — at which point the
   page citation is the fan document's, not an SR2 one.
3. Only what is genuinely FASA content is a page-hunting job, and that looks like a **small
   minority** of the 154.

⚠ **Do not "fill in" these pages from an SR2 book.** Most of these items are not in one, so any
page written against them would be a fabricated citation — worse than the blank, because the next
person trusts it.

⚠ **The printed-page offset for SR2 core is PDF − 26** (PDF 260 = printed 234), established from
the footers. Every book needs its own; do not assume.

⚠ **What OCR is good for, measured.** Page numbers, availability codes (`3/72 hrs`, `Always`),
Street Index, damage codes, ammo and fire modes all come through. **Prices do not** — `¥` reads as
`Y`, `%` or worse, and heavily stylised books (*Shadowtech*) mangle body text. Treat it as a
research aid and verify anything that changes a die roll, as the standing rule requires.

⚠ **THE SR2 CORE PDF IS NOT IN THE LIBRARY.** This entry used to say *"SR2 core for the 314
`sr2.???` (the SR2 core PDF is in the library)"*. It is not: the library holds SR3 books only
(core, CC, M&M, MitS, R3, Matrix, MDF, Critters, New Seattle, Mr. Johnson's) plus `Supplements/`,
where almost every file is marked `[no-text]` and extracts nothing — `Shadowtech`, `Shadowrun
Companion` and `Virtual Realities 2.0` among them. So the 154 SR2 weapons, armour, melee, vehicle
mods and projectiles **cannot be sourced from what is here**. Someone has to supply the book, or
the maintainer rules on what to cite.

⚠ **The MDF agents and hosts are not in the Matrix Defragged book at all.** Every one of the 17
agent names (Bloodhound, Warhound, Watchdog, Keystroke, Slowburn …) and all 10 hosts (*Ares Arms —
Retail Storefront*, *Aztechnology — Tenochtitlan Research Subnet* …) was searched for in the PDF
and appears **nowhere**; the agent rawdata (`rawdata/MDF-program-agents.json`) holds *abilities*
(Analyze, Armor, Attack …), not these. They are example content written for this system. They
therefore need a **convention**, not a citation — a way to say "original content, no book" that the
sheet and `check-packs` both understand — and that is the maintainer's call, not a page to hunt.

⚠ **Area Knowledge entries have no page of their own.** 15 of the 18 skills are Seattle districts
(Auburn, Bellevue, Redmond, Puyallup, Tacoma, Council Island, the Seattle Sewers …) — examples of
the Area Knowledge *category*, which the SR3 core index does not list as an entry: the string
"Area Knowledge" does not occur in the book. The nearest real citation is **ABOUT KNOWLEDGE SKILLS,
SR3 p.89** (verified: printed p.89 = PDF p.91), which is where a GM actually looks the rules up.
Using it for all 15 is defensible but it is a **decision about what a citation means**, so it is
left for the maintainer rather than taken here.
⚠ The other three — **Artisan, Forgery, Performance** — are not in the SR3 core PDF either, and
the upstream data itself records their source as the placeholder **`sr3.XXX`**. They are probably
Shadowrun Companion, which is in `Supplements/` as `[no-text]`.

⚠ **Folders are not documents.** A first pass counted 10 more "gaps" in
`sr3e-mr-johnsons-contacts` that are the Little Black Book's chapter names (*By Any Means
Necessary*, *Crime, Inc: The Underworld* …) stored under `!folders!`. They carry no `system` and
cannot hold a page. `tests/book-page.test.mjs` already filters to `!items!` / `!actors!` and is
right to; any new survey must do the same or it will report phantom work.

### The corpus exists now — and it does NOT close this item (2026-09-21)

All **92 books** are OCR'd to text at `C:\Users\lance\Documents\SR-OCR` (8,534 pages, 71 MB,
`2e/` and `3e/` with a `log.txt`). ⚠ **Deliberately outside the repo** — whole-book text is a
copyright surface and must not be committed. Built with `tools/ocr-pdf.ps1`.

**It still does not fill the gap, and here is the evidence, so nobody repeats the attempt.**

**1. The `???` is UPSTREAM'S OWN PLACEHOLDER. Nothing was lost in our import.** Of the 196 names
missing a page, only **61** appear in `rawdata/` with a `BookPage` field at all, and of those
entries **99 are `sr2.???` / `sr3.XXX` / `cp.???`** against **10** with a real page. The
generator never knew these pages either.

**2. Even upstream's ten "real" pages do not survive checking.** Six documents, and most disagree
with themselves — *Bio-Injector* is both `cp.29` and `pw.18`, *Ring Mount* both `fof.46` and
`r3.129`, *Secondary Controls* both `r3.118` and `sr2.264`. The one unambiguous case,
*Convertible Top* → `sr2.264`, was checked against the book: the offset is right (PDF 290 =
printed 264, from the footers) and **the item is not on that page**.

**3. Searching the corpus by name does not work.** Three passes, each tighter than the last:

| Pass | Rule | Result |
|---|---|---|
| 1 | every 4+ char token somewhere on the page | 126/200 — top hits were *adventure modules* |
| 2 | tokens within a 60-char window; common words need a gear-table page | 95/200 — still adventures, and **all 18** Seattle Area Knowledge "skills" matched prose |
| 3 | distinctive name only, on a gear-table page | 42 "strong" — and eyeballing them, mostly still wrong: *Blackout* matched a power cut, *Phoenix* the city, *Ares Scorpion* a "nova scorpion" |

The cause is structural: these names are ordinary English words (*Devil*, *Lance*, *Flail*,
*Morning Star*, *Battle Vest*) scattered through 8,534 pages of prose. Search cannot tell a table
entry from a mention, and a loose match **invents a citation**, which is the one outcome worse than
a blank.

⚠ **So this is not a data-recovery task and should stop being treated as one.** It is a
**provenance decision** for the maintainer, of the kind already framed above: 115 of 176 "SR2 core"
firearms cite the fan code `pw`, *Arasaka Jetsetter Briefcase* is `cp.???` (Cyberpunk 2020), and
the pages were never recorded by anyone. Either the content earns its own book code and pack so the
toggle can reach it, or it belongs in `archive/non-sr3-content/` with the rest of the fan
material — and either way almost none of it gets an SR2 page number.

**What the corpus IS good for**, and why it was still worth building: targeted lookups where a
human knows what they are looking for (it answered the SR2 core offset and the Equipment Table
pages in minutes), and **[#121](#121)**, checking the code's rules against the books each release.

### ✅ The fan content is out of the shipping packs (2026-09-21)

The maintainer's call: *"move the fan content to archive and give it its own code, it's not in
scope for anything I want to do right now."* Done — **121 documents citing `pw`** moved to
`archive/non-sr3-content/` by `tools/archive-fan-content.mjs`, bucketed `pw` so they are
restorable per book. `sr3e-sr2-firearms` goes from 176 documents to 61, and **no shipped document
cites a fan code any more** (`tests/fan-content.test.mjs` ratchets it).

⚠ **The 200 unknowns did NOT move.** A blank or `???` page is *unknown*, not fan — moving those
would be a guess dressed as a cleanup. So the missing-page backlog is **unchanged at 200**; what
changed is that the packs no longer mix fan content in with the official books.

⚠ **`pw` is deliberately NOT in `SOURCE_BOOKS`**: a code with no pack behind it renders an empty
checkbox. If it is ever restored, it needs its own pack and a registry entry in the same commit.

**So steps 1, 3 and 4 of the original plan are DONE** (the schema carries `bookPage` on every type,
`check-packs` reports gaps, the sheet renders *"SR3 p.303"*), and step 2 is what remains. It needs
one of: the SR2 book, a ruling on the Area Knowledge citation, and a convention for authored
content. Until then the ceiling in `tests/book-page.test.mjs` stays at 200 — it is not slipping,
it is at the floor of what is reachable.

**Progress:** `GearData` gained `bookPage` (with `rating`, `availability`, `streetIndex`) in 0.5.2
— [#118](TODO-DONE.md#118) — and the character importer now keeps the export's `BookPage` for plain gear.

### 2026-09-13 — built on `feature/book-pages`: 934 → 200 missing

All four steps done; **734 documents** given a page (repo and install), **200** left.
1. **Schema** — `bookPage` on Skill, Quality, Summoning, ComplexForm, Program, Cyberdeck and Contact
   items and on Character, NPC, IC, Agent and Host actors (data-model change → full restart).
2. **Filled** by `tools/fill-book-pages.mjs` from `tools/data/book-pages.json` — every entry carries
   its name and *why*, so the sourcing can be reviewed line by line:
   - **Skills** 420/438: 316 from the upstream generator's own `source`; knowledge, language and
     B/R skills the core book describes only as a category get that category's section (Knowledge
     p.90, Language p.91, Build/Repair p.85 — each read in the PDF); Program Design Matrix p.25;
     Hacking / Cybercombat / Programming *Matrix Defragged* p.11.
   - **Contacts** 62/62 from their notes' own citation (`lbb.53`); the **example characters** 4/4
     from the Little Black Book's contents page (lbb.38-40). New code **`lbb`**.
   - **Matrix Defragged** 88/116 from the PDF (printed page = PDF page): decks p.35, programs
     pp.28-32, IC entries pp.40-44, passive IC p.25.
   - **SR2 `???`** 160/314 from the upstream SR2 data by name.
3. **`npm run packs:check`** now reports missing pages and pages naming another book (information,
   not yet a fault). **`tests/book-page.test.mjs`** ratchets the shipped count: 200, may only fall.
4. **Shown** as *"SR3 p.303"* under the raw code on every item sheet (`scripts/data/book-page.mjs`,
   `BookPage.format`) — including the seven layouts that never had the field — and on the actor Bio tab.

⚠ **Correction:** step 2 above says *"the SR2 core PDF is in the library"*. **It is not** — 32 SR3
books, no SR2 core. That is why 154 SR2 placeholders stay `???`.

**Still missing (200), and why:**
| | Count | Needs |
|---|---:|---|
| SR2 packs `???` | 154 | the SR2 core PDF (84 are "unknown" even upstream) |
| `sr3e-mdf-agents` | 17 | not in the book — this project's own (commit `6e06863`) |
| `sr3e-mdf-hosts` | 10 | not in the book — "example hosts added" (`b2d8c3e`) |
| Area Knowledge skills | 15 | no page in SR3 core; upstream `sr3.XXX` |
| Artisan, Performance, Forgery | 3 | not in SR3 core; upstream `sr3.XXX` |
| Hermes Ikon | 1 | not in *Matrix Defragged*'s deck table |

**Decision needed — misfiled content** (now visible because it has a page): `packs:check` lists
**141** documents whose page names a different book from their pack. **121 are fan content (`pw`)
and 1 `cp`** sitting in the SR2 core packs, i.e. shipping un-toggleable fan material, which the
archive policy says belongs in `archive/non-sr3-content/`; **21** are SSC, Fields of Fire and
Rigger 2 items in SR2 core packs (SSC and FoF have packs of their own; Rigger 2 has no code); and
**Kamikaze** (`sr3e-mm-drugs`) is SR2. Moving them is a content decision, not a page fix.

What the system writes for content it made itself (the 27 MDF agents and hosts) is also open — a
`sr3e` provenance code, or an exemption in `check-packs`.

<a id="118"></a>

## 125. Evaluate shadowrun2e.com as a source for 2nd-edition gear — **requested 2026-09-15**

**Request (maintainer):** *"evaluate https://www.shadowrun2e.com/index.html for gear. incase we need
something from 2nd edition"*

**What 2nd edition gear the system has today:**
- **The default-on SR2 books** are `sr2` (core), `ct`, `ssc`, `st`, `fof` and `pna`. Their gear is
  generated from the vendored upstream `rawdata/SRCG-SR2-Gear.json` by `tools/build-default-gear.mjs`
  (TODO 91/92). The hand-restored SR2 packs come from the `sr2` archive bucket.
- **No SR2 book is in the PDF library**, so SR2 stats cannot be verified the way the SR3 ones are.
  SR2's Kamikaze (4P, `sr2.246`) came in through upstream, for example.

**Evaluate:**
1. **Coverage.** Which SR2 books and gear categories does the site hold that upstream's
   `SRCG-SR2-Gear.json` lacks, or has blank (Edge, Fix Factor, Speed, Vector — upstream's SR2 drugs
   carry only Addiction and Tolerance)?
2. **Reliability.** Does each entry cite a book and page? Spot-check it against any SR2 stats we can
   verify: SR3's conversions and the M&M rows that restate SR2 items.
3. **Use it as a reference, not a source to copy.** It is a fan site reproducing book data. Use it to
   find gaps and page numbers; ship only what can be attributed to a book and page, per TODO 117.
   Check its terms before scraping anything.
4. **The outcome:** a list of candidate additions per book, each with its page, for the maintainer to
   approve. Nothing is added to the packs without that approval.

### 🔧 Tooling & infrastructure

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

### ✅ The e2e layer now exists — 16 unit suites (~380 assertions) + 12 Playwright tests

`npm run test:e2e` drives two real clients plus a GM. It covers what unit tests structurally
**cannot**: behaviour that only exists when two people look at the same card. Every one of the
defects in [#24](TODO-DONE.md#24)'s table was invisible to a fully green `npm test`.

Three harness facts worth knowing before writing another spec — each cost a wrong diagnosis:

- **Foundry serves from its data directory, not the repo.** `scripts/` `styles/` `lang/` are
  NTFS junctions back to the checkout; the preflight byte-compares what is served and refuses
  to run on drift. A whole run once passed against the *previous session's* code.
- **A stale GM CLIENT breaks GM-routed fixes invisibly.** Every authoritative write runs on
  `game.users.activeGM` — usually a human tab open for hours, already holding the old module.
  The caller just sees a number that stays 0. `game.sr3e.loadedAt` + the `sr3e.debug.loadedAt`
  query let the preflight name whose tab to reload. The janitor is an *assistant* GM and so is
  **not** `activeGM`: with the Gamemaster logged in, writes land in their browser.
- **Specs must ARRANGE determinism, not tolerate randomness.** The spellcasting spec depended
  on a cast succeeding — 6 Sorcery dice at TN 5 fail outright ~9% of the time, and a failed
  cast posts no resist button, so it died on a missing selector about one run in twelve. It had
  been reported green repeatedly before the full suite happened to lose the coin toss.

**Closed 2026-09-21 for the unit half — `tests/pools.test.mjs`.** Of the gaps listed above, the
pool derivations and the reset boundaries were covered; what was NOT covered, anywhere, was
**`endCombat` itself**. `tests/initiative.test.mjs` pins `_endOfTurnReset` and `startCombat`, and
nothing pinned the two clears that belong to the end of a FIGHT rather than a turn: Spell Defense,
and **`tempMagicLoss` — the flag this entry calls "the one whose correct lifetime was never
established"**. It is established now, and verified by deleting the clear and watching the suite
fail. The new suite also pins ⌊(QUI+INT+WIL)/2⌋ and ⌊(INT+WIL+MAG)/3⌋ directly (they were asserted
only incidentally, inside an adept-power test), the floor at 0 on a spent pool, and Spell Pool
being **null** rather than 0 for a mundane.

⚠ It also asserts the two end-of-fight clears are **NOT** in the per-turn reset. Moving
`clearSpellDefense` there would look like tidying and would erase a mage's declaration the moment
the round ticked over — Spell Defense is committed for a whole Combat Turn.

### Still open: the ranged flow end-to-end

⚠ No e2e coverage for **fire mode → recoil → dodge → soak**, the most-played path in the system and
the one with the most moving parts. It is e2e rather than unit work because the dodge declaration
and the soak card live on a different client from the attack. Left open deliberately: writing that
spec needs a running Foundry to verify against, and a spec that has never been run green is worse
than no spec.

## 18. Structured gear data for weapon-accessory TN modifiers

> **Built 2026-09-15 on `feature/action-economy`** (0.6; not merged).
> - **Weapon side:** `smartgun` / `laserSight` on `FirearmData` (nullable; blank reads the text). The
>   shipped packs store them — `tools/fill-weapon-accessories.mjs`, 343 firearms: 59 smartguns, 56 laser
>   sights. One reader, `WeaponAccessories` (`scripts/data/weapon-accessories.mjs`), which reads the text
>   per item. The old `/laser/` guess ticked the Ballista's *Laser Designator* and the Sonic Beam Rifle's
>   battery note as laser sights (mutant `laser-read-over-whole-text`).
> - **Gyro (p.113, p.282):** a worn *Gyro Mount* gear item (not stored). Its rating (standard 5, deluxe 6)
>   comes off recoil first in the fire flow (`SR3EActor.gyroOnRecoil`). What is left offsets the Attacker
>   movement rows the GM ticks (`gyroOffset`). It also gives +1 impact and ballistic armour and +4 to the
>   wearer's melee TNs, and halves the Combat Pool (rounded down).
> - **RULED by the maintainer, 2026-09-15:**
>   - The books mix gyros up with recoil compensators. **Ordinary recoil compensation affects recoil
>     only. A gyro affects both, its full rating on each.**
>   - Cannon Companion p.34 words its Max-Gyro that way: *"provides 7 points of recoil compensation and
>     reduces movement modifiers by 7."*
>   - So recoil never uses up the movement offset, and difficult-terrain running alone is +6.
>   - The GM window's *Gyro N — off movement* is pre-filled with the full rating and stays editable.
>   - The shared-allowance reading it replaced is kept as a mutant (`gyro-shared-allowance`).
> - TESTING.md §40.
> - **Not modelled:**
>   - The actor side still reads item names (smartlink cyberware, smart goggles). That is the pair
>     condition, and the names are reliable.
>   - M&M's *Cyberarm Gyromount* (cyberware; its own rules).
>   - Vehicle gyro gear.

Four SR3 p.112 modifiers depend on gear the system **cannot currently detect** — verified 2026-08-05:

| Modifier | Mod | Why it can't be detected |
|---|---|---|
| Smartlink (with smartgun) | −2 | 'Smartgun Link' exists as cyberware in a populate macro, but nothing reads it |
| Smart goggles (with smartgun) | −1 | no vision-gear flag anywhere |
| Laser sight | −1 | **zero** references in `scripts/` |
| Gyro stabilization | *varies* | **zero** references in `scripts/` |

Root cause: `accessories` on a firearm is a free-text `StringField`
([ItemDataModels.js:119](scripts/data/ItemDataModels.js)) — there is nothing structured to query.
**Same underlying gap as [#8](TODO-DONE.md#8-ship-cyberwarebioware-with-their-bonuses-pre-filled)**: gear carries
descriptive text, not mechanical data. Worth doing these together.

**This is the follow-up to a deliberate shortcut, not a missing feature.** Socket Stage 3 ships these
as checkboxes the GM window **pre-ticks by guessing** — name-matching the actor's cyberware and
substring-matching the weapon's `accessories` string, always GM-overridable. That works and is
shipping; this task replaces the guess with real data, at which point the pre-tick becomes correct
rather than probable.

Two rules constraints any implementation has to respect (both from core p.112):

1. **Smartlink and smart goggles are PAIR conditions, not character properties.** Both read *"with a
   properly equipped smart-weapon"*. A character with smartlink cyberware firing an unmodified pistol
   gets **nothing** — a naive `actor.items.find(smartlink)` check will wrongly hand out −2. Needs a
   smartgun flag on the *weapon* as well as the vision/cyber side.
2. **Gyro stabilization is not a flat modifier, and it is not only about recoil.** It cannot be
   modelled as a number beside the others; it needs a control at fire time and has to interact with
   the existing recoil maths rather than sit next to it. Detail verified against the book
   2026-08-10 — see the sub-section below, which is bigger than this line implies.

### Gyro stabilization — the full picture *(core p.112 and p.280)*

**It cancels MOVEMENT, not just recoil.** Easy to remember as a recoil accessory and miss the other
half. p.112, under *Attacker Running*: *"Movement modifiers can be counteracted by gyro-stabilization
systems."* Those are exactly the rows now grouped under **Attacker** in the GM window
([#29](TODO-DONE.md#29)) — Attacker running **+4**, running difficult **+6**, walking **+1**, walking difficult
**+2**. So gyro has to reach the GM's TN window, not merely the fire dialog's recoil maths.

**Ratings are concrete:** standard **5**, deluxe **6** (p.280) — so `gyroRating` is a real number
with known defaults, not a guess.

⚠ **RAW ambiguity, do not resolve it silently.** The two passages disagree on wording:
- p.112 table: *"Reduces recoil **or** movement modifier"* → reads as a per-shot choice.
- p.280 gear entry: *"neutralizes recoil **and** movement modifiers up to its rating"* → reads as
  one rating-capped allowance covering both.

Whether the rating is a shared pool or applies in full to each is genuinely unclear. Surface it as a
GM-adjustable control rather than hard-coding either reading.

⚠ **The drawbacks are severe and are modelled nowhere.** Implementing only the upside would hand out
a large benefit for free. From p.280, all of it currently missing:
- **+4 to the wearer's target numbers in melee combat**
- **only half their Combat Pool dice** — interacts with every pool path this branch touched
- +1 impact **and** ballistic armour; **not concealable**
- 5 minutes to don; one Complex Action to quick-release; two Complex Actions to attach or remove
  the weapon

**It also bundles smart goggles.** *"Standard military systems also include smart goggles with a
protected cable connection"*, and mounted smartguns still feed through palm induction links — so
gyro detection and constraint 1 above are not independent.

Suggested shape: `smartgunLink` / `laserSight` (booleans) and `gyroRating` (number) on the firearm
model; a vision-gear flag reachable from the actor for goggles; keep `accessories` as the human-readable
description. Then delete the guessing in `SR3ECombatModifiers` and read the fields.

See [audit/socket-combat-plan.md](audit/socket-combat-plan.md) — "Maintainer decisions — 2026-08-05".

## 105. Tie vehicle passengers to the Rideable module — **requested during the TODO 93 run, 2026-09-13**

**Request, not started.** The maintainer plays with the **Rideable** module (tokens riding other
tokens) and wants it tied to the vehicle passenger roster from TODO 74 when it is installed:
*"it would be nice to tie these together if it's installed (passengers in the car bit)."*

**Shape:**
- **Optional, never required.** Declare it under `relationships.recommends` in `system.json` (not
  `requires` — a required module that stops being updated strands the system), and guard every
  use with `game.modules.get('<id>')?.active`. Without it, the roster on the vehicle sheet works
  exactly as now. (Confirm the module's exact id from its `module.json`.)
- **Read, don't fight.** When a token rides a vehicle's token, its actor is aboard. Two places
  that could use it: (a) the 💥 Crash dialog and the Chase Scene pre-fill the aboard list from
  who is riding the vehicle's token; (b) optionally, keep `VehicleData.passengerActorIds` in step
  when riders mount or dismount. (a) is read-only and the safer first step.
- **The driver:** decide whether the first rider, or a rider flagged as pilot, fills
  `driverActorId` — or leave the driver to the sheet.

**First step:** read Rideable's source for how it records riders — a documented API, or token
flags — and which hooks fire on mount/dismount. It is **not installed on the dev machine**
(`%LOCALAPPDATA%/FoundryVTT/Data/modules`), so install it or read it from its repository first.
Pin the tested version range in the `recommends` entry's `compatibility`.

Related: TODO 104 (vehicle art and top-down tokens) — riders sit on the token, so its footprint
matters there too.

<a id="106"></a>

## 121. Check the code's rules against *sr3-guides* on every version bump — **requested 2026-09-14**

**Request (maintainer):** a repeatable task that makes sure our interpretation of the rules in code
matches the rules as explained in `guides/` (sr3-guides, moved into this repo by [#127](#127)) — and it is **part of every
release**: run it on each version bump. **The first run waits until the 0.6 branches (100, 117, and
119) are merged back to `main`** (the maintainer, 2026-09-14: not before).

**What sr3-guides is:** the maintainer's own GitHub Pages site (Jekyll, its own repo), *SR3 Table
Reference*. Every rule on it cites a book and printed page; `{: .fixed }` boxes record corrections to
the Gemini gists it began from, `{: .house }` boxes mark house rules (not in any book). Pages today:
`rules/` combat, grenades, healing, reloading · `street/` cyberware grades, gear and fencing, SINs ·
`magic/` awakened primer · `hiring/` (house rates). `sources.md` holds its abbreviations and method.

**The check, each release:**
1. For each guide page, list its cited rules (a rule + *(BOOK p.N)*), skipping `.house` boxes.
2. Find where the system implements each — CLAUDE.md's section, the pure function, its test.
3. Compare. **Agree** → record it and move on. **Any difference at all** — the code and the guide
   disagree on a number, a reading, a page, or one covers something the other does not — is
   **never settled by picking a side**.
4. ⚠ **The PDFs are the source** (the maintainer, 2026-09-14). Neither the code nor the guide is the
   authority; the book is (`C:\Users\lance\Documents\Shadowrun 3rd Edition PDFs`, real text layer).
   Every difference is **verified against the PDF** — quote the book's sentence and its printed page
   — and/or **brought to the maintainer**. Report each one as: the rule, what the code does, what
   the guide says, what the PDF says (quoted, with page), and which side is wrong. Bring it to the
   maintainer when the PDF does not settle it (ambiguous wording, two passages disagreeing, a book
   not in the library, a `.house` rule the code implements) — do not decide those alone.
5. Record the run: date, version, guide commit, one line per rule with its outcome and the PDF
   quote for every difference, in `audit/guides-crosscheck.md` (created by the first run), so the
   next run diffs against it and only re-reads what changed.
6. A verified divergence in the code becomes a TODO (bug on `main`) before the release goes out; one
   in the guide is reported to the maintainer, whose site it is.

**Make it repeatable:** a `tools/guides-crosscheck.mjs` that extracts the cited rules from the guide
pages into a checklist (rule text, citation, page, `.house`/`.fixed` excluded) and diffs it against
the last run's record — the comparison itself is a reading task, so the tool's job is to make sure
nothing is skipped and nothing unchanged is re-done. Then a step in the release checklist (CLAUDE.md,
*Versions and branches*).

Known overlaps to expect on the first run: reloading (TODO 114, SR3 p.280), healing (TODO 115),
grenades (the Grenade Range Table, SR3 p.119), cyberware grades (TODO 86, M&M p.45), combat (the
ranged sequence, dodge, staging).

<a id="122"></a>

## 127. Tagged releases, with the guides versioned beside them — **requested 2026-09-15, in 0.6**

**Request (maintainer):** move *sr3-guides* into this repo; each release updates the guides to match
how the system handles the rules; build a release zip; let people install a specific version.

**Built on `feature/release-pipeline`:**
- `guides/` — the whole sr3-guides repo, imported with its history (`git subtree add`). Its own
  CLAUDE.md, TODO.md and link checker came with it. Its Pages workflow was dropped: a workflow only
  runs from the repo root.
- `.github/workflows/release.yml`, on a `v*.*.*` tag: `tools/release.mjs` stages an **include list**
  (`system.json scripts styles lang packs LICENSE README.md`) with system.json stamped to the release
  — `download` pinned to the tag, `manifest` at `releases/latest` so updates are still offered — and
  refuses if the tag and `system.json`'s version disagree. A GitHub Release gets `system.json`,
  `system.zip` and `guides.zip`; the guides are built twice (`v0.6.0/`, frozen, and `latest/`) onto
  the **gh-pages** branch, indexed by `tools/guides-versions.mjs` (`versions/`, root → `latest/`).
- The committed system.json keeps naming a branch (`manifest:branch` is unchanged, now on the shared
  `tools/lib/manifest-urls.mjs`). `tests/release.test.mjs`.

**Still to do, at the 0.6 release (the maintainer's):**
1. Settings → Pages → Source: **Deploy from a branch**, `gh-pages`, `/ (root)` — after the first tag
   creates the branch (the setting cannot name a branch that does not exist yet; saving it publishes
   what is there).
2. Bump `system.json` to 0.6.0, merge, push, then `git tag v0.6.0` and `git push origin v0.6.0`.
3. Hand the players the new guides URL (`darkbushido.github.io/The2ndChumming3e/`); archive the old
   `sr3-guides` repo. No redirect (the maintainer).
4. Future guide edits happen in `guides/` here — the old repo takes no more commits.

<a id="123"></a>

### 🧹 Housekeeping

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

### 🗂 Unsorted

## 153. Give the 📒 Ledger its own tab on the character sheet — **requested in the trial session, 2026-09-23**

The karma and nuyen ledger ([#79](TODO-DONE.md#79)) sits at the bottom of the Bio tab today. The
maintainer wants it on a tab of its own. This is a feature, so it goes on a branch.

## 154. 🛒 Buy gear: search the compendium, or drag an item in — **requested in the trial session, 2026-09-23**

Picking the item in the Buy gear dialog ([#82](TODO-DONE.md#82)) should work in two ways: a search
across the gear compendiums, and dragging an item from a compendium onto the dialog. It must
respect the source-book filter (`SR3ESourceBooks.packAllowed`). This is a feature, so it goes on
a branch.

### 📌 Notes & parked

## Open questions carried from the combat audit

`audit/combat-audit.md` — all five dimensions done, every defect fixed and merged. Three
things it explicitly did not resolve:

- Whether Full Defense is *complete* against the rules (`:311`) — "worth its own pass"
- `tempMagicLoss` — the one `endCombat` reset whose correct lifetime was never established (`:352`)
- Delayed actions and mid-round joins (`:371`) — no delay mechanism; an actor added mid-round
  gets no slot until the next round. Called a design question, not a rules defect.

### ✅ RESOLVED — the TN floor of 2 *is* enforced everywhere. No bug.

**Audited 2026-08-05: all 20 `_rollWave` call sites (the only function that rolls dice) and all 34
`rollPool` calls. Every roll path clamps.** The concern below was unfounded.

`rollPool` `SR3EActor.js:1826-1828` · cybercombat `:472-473` · melee `:3598-3599` · astral
`:5436-5437` · contested `:6157-6158` · drain `:4729` · spell resist `:5628` ·
soak `:3942/:1368/:1408` · hacking `:910` · node `:1028` · orthodox silent resolver `:6293` ·
`SR3EWard._resolveRoll:280` · `SR3EMIJI._resolveRoll:47` · dodge is a fixed TN 4.

Both open questions answered:

1. **Ranged path** — yes. `rollWeapon` returns through `actor.rollPool(...)` at five sites, and
   `rollPool` clamps unconditionally.
2. **TN reducers** — yes. Melee bakes reach, defaulting *and* called shot into a single clamp at
   `SR3EItem.js:249`. The VCR's `−2 × rating` is a dropdown feeding a field clamped on read.

**One real consequence, carried into socket Stage 3.** On card-based rolls the clamp is applied at
**read** time, so an input can hold a sub-2 value while the roll uses 2. Nothing displays that way
today (melee also clamps on write), but the GM TN window sums checkboxes into a live field and the
MVP set reaches −4 against a base of 4 — it would render "TN 0" and roll at 2. Recorded as a Stage 3
requirement in [audit/socket-combat-plan.md](audit/socket-combat-plan.md) → "The GM window MUST clamp
its DISPLAYED target number at 2".

<details><summary>Original question, as opened</summary>

**"No target number can ever be less than 2" is a CORE rule**, not a Quick Start simplification.
It appears twice in the core rulebook — once in the general mechanics section and again in the
ranged-combat modifiers text — plus a third "treat a result less than 2 as 2" in the
recoil/movement compensation rules.

The codebase clearly knows this: there are ~15 `Math.max(2, …)` clamps in `SR3EActor.js` (cybercombat
attack/defence TNs `:472-473`, hacking `:910`, node `:1028`, soak `:1368/:1408/:3942`, `rollPool`
`:1827-1828`, melee boxing `:3598-3599`, drain `:4009`, spell resist `:4542`). **But they are applied
per-site, not centrally.**

What I had not yet checked when we stopped:

1. Does the **ranged** attack path clamp? `rollWeapon` bakes range, recoil, called shot and the
   defaulting modifier into `tn` — no clamp observed at the point the TN is finalised.
2. Do the **TN reducers** clamp? Melee is `4 − reach`, the VCR is `−2 × rating` on driving tests,
   and aimed shot is `−1 per Simple Action`. Each can independently push below 2.

**Why it matters for socket Stage 3:** the GM window's checkboxes make stacking negatives trivial —
Target stationary −1, Aimed shot −1, Smartlink −2 is four points off, taking a base TN of 4 to **0**.
Whatever the answer, the GM window must clamp its computed TN at 2, and if the floor turns out to be
missing centrally it is a live rules bug independent of the socket work.

Resume by finishing the grep for TN-reducing sites and checking `rollWeapon`'s final `tn`.

</details>

## Other known drift

- CLAUDE.md "What is NOT yet implemented" (`:1016`) is stale: Full Defense is largely wired
  and now clears at the turn boundary (`30bab18`); vehicle sheets exist.
- `sr3e-odm-cyberdecks` / `sr3e-odm-programs` are undeclared and their directories are gone.
  Blocks all Orthodox Matrix work. Populate macros survive.
- Code TODOs: `SR3EICSheetOrthodox.js:70` (drag-drop host link),
  `SR3EHostSheetOrthodox.js` — notes enrichment and IC-assignment drag-drop, now at the top of
  the **surviving** `_onRender` (was `:83`, in the dead twin deleted by [#25](TODO-DONE.md#25)). ⚠ Add that
  work **above** the `if (!table) return;` guard, or it will not run on a host with no trigger
  table.
- The Matrix sourcebook (`mat`) is deliberately unregistered because nothing existed to carry
  it — but the generator has **112 `mat` gear entries**, so that condition is now met.
  Not yet a task.

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

---

<a id="56"></a>
