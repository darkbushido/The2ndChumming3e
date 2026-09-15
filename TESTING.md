# SR3E System Testing Guide

Verify each feature by checking the **in → out** numbers against what the chat card shows.

## Automated coverage — read this before walking anything by hand

Two suites, and they cover different things. Neither replaces the other.

```bash
npm test          # 16 suites, ~380 assertions. No browser, no server, seconds.
npm run test:e2e  # 20 tests / 12 files, two real clients + a GM. Needs Foundry running.
npm run test:mutate  # proves the unit suites can FAIL. Seconds, no browser.
```

### `npm run test:mutate` — because a green suite proves nothing on its own

A passing test is only evidence if you know it would have gone red had the rule been wrong,
and twice in one session that did not hold here. Two ways a test quietly stops testing:

- **Vacuous arrangement** — the setup neutered the assertion. A decker with no cyberdeck has
  a `null` Hacking Pool, `?? 0` turns every field into 0, and every "charged correctly"
  assertion passes against zeros.
- **Non-discriminating fixture** — the old and new rules agree on the numbers chosen. Had the
  complementary-dice test used Flux 4 against skill 6, capped and uncapped both give 4.

`tests/mutants.mjs` holds **bugs this project actually shipped**. Each is reinstated in turn
and its suite must go **red**:

| Mutant | The bug it restores |
|---|---|
| `complementary-capped` | `min(Flux, skill)` — a cap in neither book |
| `recoil-fa-ignores-own-rounds` | full auto counting only prior rounds |
| `recoil-double-before-compensating` | doubling heavy recoil before compensation |
| `essence-high-water-mark` | `max(lost, installed)` — blocks a GM correction |
| `dodge-tie-goes-to-defender` | `>=` instead of `>` |
| `glitch-sr4-threshold` | `ones > pool/2` — SR4's rule, not SR3's |
| `stage-power-past-deadly` | melee staging applied outside melee |

⚠ **Read it the right way round: a suite FAILING is the pass condition.** Output says
"killed" and "SURVIVED", never "passed". A **survivor means the TEST is wrong**, not the code
— that rule is not actually covered.

**Add a mutant whenever you fix a rules bug.** It costs four lines and turns the fix into a
permanent tripwire.

⚠ It cannot cover the **e2e** specs — mutating live Foundry code is slow and awkward. There
the discipline stays manual: run a new spec against the OLD behaviour, confirm it fails, and
record the observed value in the comment ("Before the fix this read 5.8").

### ⚠ The e2e suite tests whatever Foundry is SERVING, not what you just wrote

Foundry serves from its own data directory. On this machine `scripts/`, `styles/` and `lang/`
under `%LOCALAPPDATA%\FoundryVTT\Data\systems\The2ndChumming3e` are **NTFS junctions** back to
this checkout, so a save is live in the next page load — no build, no copy step.

A junction is not in the repo and is easily lost: a system reinstall, a fresh clone, another
machine. When it is lost, **nothing announces it** — the suite just starts testing the data
directory's copy, and a full run passed against the previous session's code exactly once
before this note existed. `preflight()` in `tests/e2e/fixtures.mjs` now byte-compares the two
executable scripts before joining and refuses to run on a mismatch, printing the re-link
command. To recreate it by hand (no elevation needed):

```bash
cmd //c mklink //J "$LOCALAPPDATA\\FoundryVTT\\Data\\systems\\The2ndChumming3e\\scripts" "$PWD\\scripts"
```

**Do not junction the whole system directory.** `packs/` holds live LevelDB that Foundry
compacts and rewrites while running, and the install also carries 22 pre-split packs the repo
does not — pointing it at the committed copy would swap real compendium data.

**`npm test`** covers the rules: staging, Rule of One, dodge resolution, defaulting tiers,
corner TN, combat and melee modifiers, initiative, source books. If a section below restates
one of those, trust the suite over a manual walk — the manual "- passed" markers are what let
an SR4 glitch rule sit here wrongly for months.

**`npm run test:e2e`** covers what unit tests structurally cannot: behaviour that only exists
when two people are looking at the same card. §6 melee, §11 spellcasting's permission split,
§16 astral, §35 MIJI, plus contested, cybercombat and the three Orthodox Matrix cards — all
eight two-corner cards are now driven by two real clients. The bug that motivated it —
submitted values silently dropped, so resolution used whichever client happened to resolve —
was invisible to a green `npm test`, as were every one of the defects these specs then found:
an opponent's dice chosen by the initiator, a defender's Hacking Pool never charged, an
Orthodox decker offered no pool at all, and the GM spending a player's pool for them.

⚠ **A stale GM browser makes correct fixes look broken.** Foundry runs every authoritative
write on `game.users.activeGM`, so a tab left open from before your edit executes the OLD
code on everyone's behalf — the caller just sees a wrong number. The preflight now compares
that client's `sr3e.debug.loadedAt` against the files and refuses to run, naming whose tab to
reload. If a pool assertion fails for no reason you can see, this is why.

Note the janitor account is an *assistant* GM, which is **not** `activeGM` — so while the real
Gamemaster is logged in, the writes happen in their browser. Either reload that tab, or log
out and run:

```bash
FOUNDRY_JANITOR=Gamemaster npm run test:e2e
```

⚠ **Neither judges whether anything is USABLE.** Layout, legibility, whether a read-only
corner looks disabled, whether a dialog makes sense — those need a human, and the sections
below are still the checklist for them.

⚠ **`- passed` markers below are historical.** They record a build nobody can identify now.
Treat a section as verified only if it says AUTOMATED, or if you have just walked it.

### Agent-driven live checks — the Browser pane (no maintainer needed)

Added 2026-09-13, because this method was **lost once to a context compaction**: the next
session concluded it could not test in Foundry and asked the maintainer to do it. It can. Most
of the manual checklist below — and a branch's Foundry checklist (e.g. TODO 93) — can be walked
by the agent in the in-app **Browser pane** (`mcp__Claude_Browser__*`), driving `game.sr3e.*`
with `javascript_tool` exactly the way `tests/e2e/foundry.mjs` does.

| | |
|---|---|
| Server | `http://localhost:30000` — the maintainer's Foundry desktop app (v14) |
| World | **`test-shadowrun`** — the ONLY world on this machine, and a **test world, not a campaign** (New Runner, Troll Street Dealer, SWAT Team Member, Bruce Lee… are test actors). Changing it is fine in a development session; clean up afterwards. |
| Users | **Gamemaster** (the maintainer's seat — usually connected), **Player2**, **Player3**, **mcp-api** (Assistant GM, for automation). **All passwordless.** |

**1 — Is a world up?** Navigate the pane to `http://localhost:30000`. If it shows the setup screen:

```js
await fetch('/setup', { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'launchWorld', world: 'test-shadowrun' }) }).then(r => r.text());
```

**2 — Join.** On `/join` (the form is built by JS — wait until `select[name="userid"]` exists):

```js
const sel = document.querySelector('select[name="userid"]');
sel.value = [...sel.options].find(o => o.textContent.trim() === 'mcp-api').value;
sel.dispatchEvent(new Event('change', { bubbles: true }));
[...document.querySelectorAll('button')].find(b => /join game/i.test(b.textContent)).click();
```

Then wait for `game.ready`. Navigating to `/join` again logs out (to switch user).
⚠ **One session per user** — the maintainer is usually on Gamemaster, so join as **mcp-api** (GM
rights) or **Player2/Player3** (a player's view). Never try to take a connected seat.
⚠ **Never type a password.** These accounts have none. If one ever gets a password, stop and ask.

**3 — Drive the API, read state from `game`.** The rules from `tests/e2e/foundry.mjs` apply:
drive `game.sr3e.*` rather than the WebGL canvas; **do not await a flow that opens a dialog**
(fire it, then find `.application.dialog` in the DOM, fill it and click its button); scope chat
selectors to `#chat` (every message renders twice); assert on `game.*` / `game.messages`; use a
`computer` screenshot only for visual questions (colour, layout, a blank dropdown). Delete the
chat messages and documents you created and restore fields you changed.

**4 — Stale code.** Scripts are junctioned (above), so F5 in the pane loads your edit — but
authoritative writes run on **`game.users.activeGM`**, usually the maintainer's tab. Compare its
`sr3e.debug.loadedAt` with the files' mtime; if it is older, GM-routed results are from old code.
Say so in the results rather than reporting a false failure.

**What still needs a human (or Playwright):** a **full Foundry restart** after a data-model
change (the agent cannot restart the desktop app); anything behind a password. Two clients at
once — a GM plus players, i.e. **simulated combat** — is the next section, and the agent runs it.

### Simulated combat — GM + two players, by the agent (Playwright)

Added 2026-09-13 for the same reason as the section above: it had been done in several sessions
and the *how* was not written down anywhere a fresh session would look. **"Simulate a combat" =
run the e2e suite.** Each spec opens one real Chromium context per user and plays a full exchange
with each person deciding their own part:

| Client | Seat | Plays |
|---|---|---|
| `player2` | **Player2** | the attacker (owns the attacking PC) |
| `player3` | **Player3** | the defender (owns the target PC) |
| `janitor` | **mcp-api** (Assistant GM), or `FOUNDRY_JANITOR=Gamemaster` | the GM: TN window, resolve-now, cleanup |

**Before running — who may be connected.** Foundry refuses a second session for a connected user.
Check `Invoke-RestMethod http://localhost:30000/api/status` → `users` is the connected count.
- **The Browser pane must NOT be holding mcp-api** (or Player2/3). Close it or navigate it to `/join`
  first — the pane from the section above is the usual culprit.
- If the maintainer is on **Gamemaster**, their tab is `activeGM` and runs every authoritative
  write; the preflight refuses to start if that tab is older than the working tree ("reload
  Gamemaster's tab"). With **nobody** connected, the Playwright mcp-api client becomes activeGM
  on fresh code — the simplest case, and how the 2026-09-13 run was done.

```bash
npx playwright test                                   # every spec, ~18 tests, a few minutes
npx playwright test tests/e2e/ranged.spec.mjs         # one exchange
npx playwright test --headed tests/e2e/melee-two-corner.spec.mjs   # watch the three windows
```

From the agent: run it with `run_in_background`, redirecting output to a scratchpad file
(`$env:FORCE_COLOR='0'; npx playwright test *> ...\e2e-run.txt` in PowerShell), and read the
file when notified — the list reporter prints one line per test, and the error details only at
the END of the run (a run you stop early shows bare `x` lines). A failure leaves a trace
(`test-results/…/trace.zip`, open with `npx playwright show-trace`). A full run took **8.7 min**
for 18 tests on 2026-09-13, all passing.

⚠ **A test that fails in milliseconds failed in the fixture, not in play** — the three clients
never joined (a seat still held, Foundry not ready). Re-run that spec alone before touching code;
on 2026-09-13 five such failures all passed after a reboot.

**What one run plays out** (`tests/e2e/*.spec.mjs`):

| Spec | The combat |
|---|---|
| `ranged` | attacker fires → **GM sets the TN** in the modifier window → attacker rolls → **defender declares a dodge after seeing the hits** → soak; each pays their own Combat Pool |
| `melee-two-corner` | boxing card, each fighter submits their own corner, the last submission resolves |
| `astral-two-corner` | the same between two mages |
| `contested` | each side picks its own pool source; the GM can resolve with a side outstanding |
| `spellcasting` | caster and target each roll only their own half |
| `cybercombat`, `orthodox-matrix` | decker vs IC; both sides charged for the Hacking Pool they submit |
| `miji` | rigger vs rigger; an unmanned drone's corner falls to the GM |
| `player-sheet` | the sheet from **Player2's** seat: Species locked, Essence warning colours as the GM changes it, a Matrix skill priced as active in the karma dialog |
| `healing` | **Player2's** medic treats **Player3's** character: picked as patient, Dice/TN read-only to the player and the GM's saved numbers rolled, the time box on the result, and *Lower* pressed by the medic with the GM making the write (`sr3e.heal.apply`). ⚠ Needs a GM tab loaded after this change — see *stale GM*. **Passed 2026-09-13** (1.5 min). ⚠ The `foundryvtt` MCP connector can hold the mcp-api seat — if the janitor cannot join, check the join page for who is connected |
| `essence`, `migrations` | GM-only checks that ride the same harness |

**To simulate something the specs do not cover**, write a new spec rather than driving three
tabs by hand: copy `ranged.spec.mjs`, keep its `arrangeActor` / `createTestActor` setup and its
teardown, and use the helpers in `tests/e2e/foundry.mjs` — `fireAndForget` (never await a flow
that opens a dialog), `selectTarget` (the target dialog pre-selects the FIRST actor — always
pick by name), `answerDialog` / `answerDialogIfPresent`, `newestCardId` + `cardIn` (scope every
card by message id; stale cards exist), `clickNewestChatButton` (dispatch in-page, never
`locator.click()` on a card). Tests **mutate the world**: arrange, then put back
(`resetPools`, `deleteActors`, `sweepTestActors('__TEST')`).

⚠ The Browser pane (one user) and Playwright (three users) cannot both hold mcp-api — do the
pane checks first, release the seat, then run the suite, or the reverse.

**MCP servers** (`foundry-mcp` / `foundryvtt`, with the `foundry-mcp-bridge` module) have been
used to read world state. They are optional and often disconnected; their credentials live in the
MCP configuration (`~/.claude.json`), **never in this repository**.

**Record results** in the branch's Foundry checklist (TODO 93 on `fix/racial-mods`): tick each
step with the date and what was seen; log a new failure as its own TODO, observation only.

⚠ **Opening a LevelDB rewrites its log and MANIFEST files, even to read.** Foundry opens the
*install's* copy, not the checkout's; the churn in `packs/` came from our own tests and checks, which
now read a temporary copy (`tools/lib/pack-copy.mjs`, enforced by `tests/pack-churn.test.mjs`).
If `git status` ever shows pack files you did not mean to change, the content is almost certainly
identical — verify, then `git checkout -- packs && git clean -f packs`.

---

## 1. Dice / Rule of Six - passed

### Basic roll
**Setup:** Any attribute or skill roll.
- Roll **4 dice vs TN 4** → expect 0–4 successes; any die showing 4, 5, or 6 is a success. - Passed

### Explosion - passed
- Any die showing **6** → an explosion button appears.
- Click it → all dice roll again. If the running total ≥ TN it's a success, button disappears. - Passed 
- If running total < TN and the new roll is 6 again → button reappears, keep exploding. - Passed

### Rule of One - **RETEST REQUIRED**

⚠ **The two tests that used to live here asserted SR4's glitch rule and have been removed.**
They passed against behaviour that was wrong: a "glitch" on *more than half* the pool showing 1s,
and a "critical glitch" tier on top of it. SR3 has neither. Both were fixed in code (TODO 32), so
these cases must be re-run against the correct rule.

**The rule** (SR3 p.38): *"If ALL the dice rolled for a test come up 1s, it means that the
character has made a disastrous mistake."* One sweep, no second tier — a sweep is already an
automatic zero-success failure, so a "critical" tier could only relabel the same event. What
follows is GM adjudication: *"The gamemaster determines whatever tone is appropriate."*

- **In:** 4 ones out of 6 dice → **Out:** *no* Rule of One warning. Just a poor roll.
- **In:** 3 dice, all showing 1 → **Out:** Rule of One warning shown.
- **In:** 1 die showing 1 → **Out:** warning shown (a pool of one that comes up 1 is all of it).
- **In:** 5 dice, four 1s and one success → **Out:** no warning, and the success still counts.

⚠ The 4-of-6 case is the one that matters — it is what the old rule flagged, and at 3 dice the
half-pool threshold fires roughly **twenty times** more often than RAW. Covered by
`tests/rule-of-one.test.mjs`, but confirm the chat card agrees.
---
Reporting of 1s omitted with Physical dice mode - triggers nothing, GM convenience only, unnessesary work for the player to report in system

## 2. Wound Modifier - Passed

Each track (stun and physical) contributes its own modifier — both sum to give the total wound mod.

| Boxes filled (per track) | Wound level | Mod per track |
|---|---|---|
| 0 | — | 0 |
| 1–2 | Light | −1 |
| 3–5 | Moderate | −2 |
| 6–9 | Serious | −3 |
| 10 | Deadly | *unconscious* |
- Passed

**Effect:** wound mod is a TN penalty applied to all rolls, and reduces initiative base.
**Example:** 3 stun boxes → TN +2 on all rolls, initiative −2.

**Unconscious:** When either track reaches 10 boxes, the Wound Mod field displays `unconscious` instead of a number.

-Passed 

**adding/removing wounds updates overflow automatically. - passed

**Tests:**
- Fill **1 stun box** → wound mod reads **−1**.
- Fill **3 stun boxes** on a character with Combat Pool 5 → Combat Pool reads **3**.
- Fill **6 physical boxes** → wound mod from physical track is **−3**.
- Fill **10 stun boxes** → Wound Mod field reads `unconscious`.

- TN modifier passed
- Initiative modifier passed
---

## 3. Derived Pools - Passed

### Combat Pool - passed
Formula: `⌊(QUI + INT + WIL) / 2⌋ + modifier`

| QUI | INT | WIL | Expected Pool |
|---|---|---|---|
| 4 | 3 | 3 | 5 |
| 6 | 5 | 4 | 7 |
| 3 | 2 | 2 | 3 |


### Spell Pool (Awakened only) - passed
Formula: `⌊(INT + WIL + MAG) / 3⌋`

| INT | WIL | MAG | Expected Pool |
|---|---|---|---|
| 5 | 4 | 6 | 5 |
| 4 | 3 | 4 | 3 |

- Non-Awakened actors (MAG 0): field should be **hidden**.


### Astral Pool (Awakened only) - passed
Formula: `⌊(INT + CHA + WIL) / 2⌋`

| INT | CHA | WIL | Expected Pool |
|---|---|---|---|
| 6 | 4 | 5 | 7 |
| 4 | 3 | 3 | 5 |


### Hacking Pool - passed
Formula: `⌊(INT + MPCP) / 3⌋` where MPCP comes from the equipped cyberdeck. Hidden if no cyberdeck is equipped.

| INT | MPCP | Expected Pool |
|---|---|---|
| 6 | 6 | 4 |
| 5 | 8 | 4 |
| 4 | 0 | 1 |
---

## 4. Initiative - Passed

### Physical (default) - passed
Formula: `REA + woundMod` base + `initiativeDice d6` (wired reflexes add to REA and grant extra dice)
**In:** REA 4, no wounds, no cyber → **Out:** rolls `4 + 1d6`, result 5–10.

### Astral Projection - passed
Formula: `INT + 20` base + `1d6`
**In:** INT 5 → **Out:** rolls `25 + 1d6`, result 26–31.

### Matrix TRM / AR / VR-Cold - passed
Formula: `REA + woundMod` base + `1d6` (wired reflexes apply to REA; dice **forced to 1** regardless of cyber; Response does NOT apply)

**In:** REA 5 (includes wired reflex bonus), no wounds → base `5`, dice `1d6` → result 6–11.

### Matrix VR-Hot - passed
Formula: `(reaction.base + woundMod + Response×2)` base + `(1 + Response)d6` (wired reflexes **excluded** from base; Response replaces them)

**In:** base REA 4 (no cyber), Response 3 → base `4 + 6 = 10`, dice `4d6` → result 14–34.


### VCR (Vehicle — jumped-in rigger) - passed
Formula: `Rigger REA + VCR level + woundMod` base + `(1 + VCR)d6`

**In:** REA 5, VCR 2 → base `7`, dice `3d6` → result 10–25.

### RCD (Vehicle — remote control) - failed - passed
Formula: `Rigger REA + woundMod` base + `1d6`

**In:** REA 5 → **Out:** `5 + 1d6`, result 6–11.

### Auto / Pilot (Vehicle — no rigger) - passed
Formula: `Pilot rating` base + `2d6`

**In:** Pilot 4 → **Out:** `4 + 2d6`, result 6–16.

### Shift-click (physical dice mode) - passed but not all situations tested
Any initiative button → shift-click → dialog asks for result → enter manually, posts card with that value.

### SR3 pass mode - passed
After everyone acts: all initiatives drop by 10. Combatants with initiative ≤ 0 are done. Continue until none left, then GM prompted to re-roll.

### SR2 flat queue mode - passed
Full action list built upfront (init, init−10, init−20 …). Walk top to bottom.

### Pre-start initiative lock
Before **Begin Encounter**, the per-combatant init roll icons are dimmed and unclickable (incl. shift-click) — initiative is rolled only via the Begin Encounter dialog. After combat starts they work again.
- **In:** add combatants, don't start → clicking a bolt does nothing. Begin Encounter (auto-roll) → inits set. After start → bolt rolls/re-rolls normally.

### Action Tracker (GM, active combatant card)
On the active combatant's card: **Complex** (full width) + two **Simple** buttons.
- **In:** click **Complex** → advances to next actor (like the arrow).
- **In:** click first **Simple** → Complex greys out, first Simple highlights; click it again → undo (Complex re-enabled).
- **In:** click second **Simple** → advances to next actor.
- State resets when the turn/round changes (also via the normal arrow).

---

## Gear ratings in the field — TODO 118 (0.5.2) — needs a live pass

Data-model change (gear's `rating` is nullable): **full Foundry restart** first.
- [ ] A new gear item named *Medkit* (no bracket) → its sheet's Rating box shows **3**, and the gear tab reads *Medkit [3]*.
- [ ] *Medkit [6]* created by hand → Rating 6; the gear tab reads *Medkit [6]* (not doubled).
- [ ] Clearing the Rating box on a gear item → blank stays blank (no rating); healing no longer finds a rating on it.
- [ ] *Stabilization Unit* → 2; the healing Stabilize form pre-ticks it.
- [ ] `game.sr3e.SR3EMigrations.force()` on a world gear item with rating 0 and a name with none → rating becomes blank (null).
- [ ] Cyberware is unchanged: *Wired Reflexes [2]* dragged from the pack still gives its bonus and shows no suffix.

## Book and page — TODO 117 (`feature/book-pages`)

Data-model change: **full Foundry restart** first. **Walked by the agent 2026-09-14** (Browser pane, mcp-api, after a restart on a local branch merging main + both 0.6 features):
- [x] Compendium sheets show the Book / Page box with the citation beneath: *Physics* SR3 p.90 · *Analyze* Matrix Defragged p.30 · *Fuchi Cyber-6* Matrix Defragged p.35 · *Wired Reflexes [1]* SR3 p.302 — one box each.
- [x] A quality (a layout that never had the field) gets the box; typing `sr3.312,r3.172` saves and shows *SR3 p.312 · R3 p.172*.
- [x] A Little Black Book contact's Bio tab (as GM): `lbb.59` with *Little Black Book p.59*.
- [ ] …as a player, shown only when set.
- [x] A skill added to a character from the pack keeps `sr3.90`.
- ⚠ Looking pack entries up by name in the install can land on its **null-`_id` duplicate** (install drift, `npm run packs:fix`) — filter `x._id`.

---

## Default-book gear — TODO 91/92, branch `feature/default-books-gear` — needs a live pass

First, **with Foundry closed**: `node tools/build-default-gear.mjs --install` (writes the install's
packs and `system.json`), then `npm run packs:check`. New packs and a data-model change (gear
`category` / `concealability`) → **full restart**.
- [ ] The Compendium sidebar shows *Weapons & Gear → Gear / Ammunition / Medical* folders, one pack per book, labelled with the book's name.
- [ ] Configure Source Books → untick Cannon Companion → `sr3e-cc-gear` and `sr3e-cc-ammunition` disappear; re-tick → back.
- [ ] Drag *Medkit* (Shadowrun 3rd → Medical) onto a character → the 🩹 Healing flow finds it.
- [ ] Drag *15-Rnd Clip (APDS)* onto a character with an Ares Predator, tracking on → ↻ Reload offers it as one reload of 15, and the gun loads 15 APDS.
- [ ] Drag *APDS Rnds* → it is 10 rounds at 70¥; reloading a break-action or internal-magazine gun from it tops up round by round.
- [ ] Drag *Arrows* onto a bow-user → ↻ Reload on the bow nocks one.
- [ ] Open *Gyro Mount* (SR3 gear) → two entries, reading *Gyro Mount [5]* and *[6]*; the sheet shows Category *Firearms Accessories*, the Rating field filled.
- [ ] Open *ACTH* (Man & Machine drugs) → one item carrying tolerance **and** vector, with *Also listed* in its notes.
- [ ] Nothing already shipped was duplicated — search *Armor Jacket* in Shadowrun 3rd: one result.

---

## Dialog wiring — TODO 20 (0.5.2) — needs a live pass

Eighteen dialogs moved from the global `renderDialogV2` hook to their own `render` option. For
each, open it and change the one control that recomputes something; the live value must follow.
Then open the same dialog **twice at once** where that is possible — both copies must work.
- [x] Defaulting — **two open at once**, each followed only its own dropdown (Quickness 4 / Strength 5 → Willpower 6 / Body 2). 2026-09-13.
- [ ] Vehicle weapon, Gunnery shot type (a degraded channel): Sig TN follows the shot type.
- [x] Grenade roll options: at 60 m, Standard / Aerodynamic / Launcher → TN 9 / 8 / 5. 2026-09-13.
- [x] Called shot: "Specific sub-target" shows the sub-target row. 2026-09-13.
- [x] Fire Mode: FA shows its section; the recoil preview follows rounds and compensation. 2026-09-13.
- [ ] Ward attack: Sorcery / Spirit shows the extra row.
- [ ] Browse Orthodox Cyberdecks, Browse Orthodox Programs (Orthodox ruleset). *(Browse Skills 419 → 4 on "pistol", the compendium picker 132 → 18 on "ares" ✓ 2026-09-13)*
- [x] Drone Comprehension: the TN readout follows TN. 2026-09-13.
- [x] Chunky Salsa (the canvas draws), Barrier Damage, Falling Damage, Escape Artist (each readout recomputes). 2026-09-13.
- [ ] MIJI Infiltration allocation counter; IVIS split counter. *(IVIS setup TN readout ✓ 2026-09-13)*

---

## Attribute hover explanations — TODO 100 (`feature/modifier-tooltips`)

**Walked by the agent 2026-09-14** (Browser pane, mcp-api) on a troll with Muscle Replac. [2], a running Adrenal Pump [1], a Pain Editor and Wired Reflexes [1]:
- [x] Quickness: green **2** hovers *+2 Muscle Replac. [2]*; amber **1** hovers the pump *— 3 Combat Turns left (M&M p.63)*; the total reads **(7)**, the real value, and hovers Base 4 + both.
- [x] Body's dermal armor chip reads *Troll dermal armor (SR3 p.56)*, total (4).
- [x] Pain Editor: amber **− 1** on Intelligence, total (3).
- [x] Initiative dice chip names *Wired Reflexes [1]*.
- [x] Reaction hovers *(Quickness 4 + Intelligence 4) ÷ 2 = 4*, Wired Reflexes +2, the pump +2, and Muscle Replacement's Quickness as *does not count toward Reaction (M&M p.60)*. ⚠ Found live: it first printed the FINAL Quickness 7 / Intelligence 3, which did not add up — fixed with `derived.reactionInputs`.
- [ ] An adept with Improved Physical Attribute 3: the gold chip names the power *and its level*.
- [ ] An active Attribute Boost shows as an amber chip with its turns left.
- [ ] Wired Reflexes and Improved Reflexes both: the dropped one listed as *not applied (SR3 p.169)* (unit-tested).
- [ ] Layered armour: the Quickness *+N TN* chip names the pieces worn.

---

## 5. Ranged Combat — **PARTLY AUTOMATED** (`npm run test:e2e`)

Full flow: click weapon → target dialog → **GM's TN window** → roll options (TN, range,
called shot, Combat Pool) → attack roll → **defender declares** → dodge roll → Resist Damage
→ soak card → soak roll → assign damage button.

⚠ **That order was wrong here until 2026-08-13.** This section used to read "target dialog →
dodge declaration → attack roll", which is the pre-fix sequence. SR3 resolves the Dodge Test
at step 4, *after* counting the attacker's successes at step 3 — the defender must see the
hits before choosing between dodging and saving the pool for the Damage Resistance Test. The
code was fixed 2026-08-05; this file kept describing the old flow for another week.

### ✅ Covered by `tests/e2e/ranged.spec.mjs` — three clients

- **The GM's TN window opens on the GM and NOT on the attacker**, and the attacker's own TN
  field is read-only once a GM has adjudicated. The negative is the valuable half: a GM
  testing alone passes every gate themselves.
- **The declaration comes AFTER the roll and comes TO the defender.** The card states the
  incoming hits; the declare button auto-clicks on the decider's client, so the dialog opens
  on the defender and never on the attacker, whose button is refused outright.
- **Each side pays its own pool** — attacker for attack dice, defender for dodge dice and
  again for soak dice, on three separate spends across two actors.
- **`.sr-soak-btn` vs `.sr-soak-roll-btn`** carry deliberately different gates: the first only
  posts a card onward (`_mine`, any owner), the second rolls (`_isDecider`, exactly one).

⚠ **Not covered, still needs a human:** fire modes beyond SS (BF/FA recoil accumulation),
ammunition types and depletion, called shots, range-band TN changes, and grenade/AoE scatter.
The spec deliberately holds every TN at or below 6 so no die can explode — real play does not.

### drag and drop weapon sections - passed
Move preferred weapon types to the top of the weapons tab - passed


### Attack dice - passed 
**In:** Pistols skill 5, TN 4 → **Out:** 5 dice chat card vs TN 4.

### Firing modes - passed

| Mode | Rounds | Power mod | Level mod |
|---|---|---|---|
| SS | 0 (no recoil) | 0 | 0 | - warns if fired more than once in a phase
| SA | 1 | 0 | 0 | - 
| BF | 3 | +3 | +1 stage |
| FA (3 rds) | 3 | +3 | +1 stage |
| FA (6 rds) | 6 | +6 | +2 stages |
| FA (9 rds) | 9 | +9 | +3 stages |

**BF example:** Weapon `9M` → BF → damage becomes `12S`.

### Recoil (SA / BF / FA) - passed
`totalComp = actor recoilCompensation (Cyber tab) + weapon recoilMod ("Recoil Comp" on the item)`
Both are editable inline in the fire-mode dialog and persist on confirm.

- **SS/SA/FA cumulative:** `max(0, roundsBeforeThisShot − totalComp) × heavyMult`. **In:** fired 3 rounds previously, totalComp 2 → TN penalty **+1**.
- **BF stacks:** `max(0, (roundsBeforeThisShot + 3) − totalComp) × heavyMult` — **+3 first burst, +6 second** (BF counts its own 3 rounds). **In:** totalComp 0, first burst → **+3**; fire a second burst (roundsBefore now 3) → **+6**.
- **Heavy weapons** (LMG/MMG/HMG/MinG) double the uncompensated recoil.
- **Shotgun in Burst Fire** doubles uncompensated recoil (SR3 p.111) — NEW 2026-07-07, verify:
  - **In:** shotgun (ShtG) with SA/BF modes, no compensation, first shot of the phase → fire-mode
    dialog shows BF recoil preview **+6** (not +3); SA preview stays +0/+1. A second BF burst in
    the same phase previews **+12**. The dialog shows an amber "⚠ Shotgun: 2× uncompensated
    recoil in Burst Fire" note.
  - **In:** same shotgun with total comp 3 → BF preview +0 first burst ((3+0−3)×2), +6 second.
  - **In:** non-shotgun SA/BF weapon (e.g. SMG) → BF preview still +3 (unchanged).
- `roundsFiredThisPhase` resets at the start of each combat phase (and via the ↺ Reset button).

### FA multi-target TN penalty - passed

| Target number | TN penalty |
|---|---|
| 1st | 0 |
| 2nd | +2 |
| 3rd | +4 |
| 4th | +6 |
| 5th+ | +8 |

### Ammunition — stockpile / magazine model - passed

World setting **Track Ammunition** (Configure Settings → System) gates all counting (off by default).

**Stockpile (gear/ammo tabs):** ammo items are a reservoir. Each has Ammo Type, Loading Mechanism (c/m/cy/b/d/sb/internal), and its stock — loose rounds or reloads. The tab shows Type / Load / Stock

**Magazine (weapons tab):** each firearm shows its capacity, a loaded badge (type + `loaded/magSize` when tracking), and a ↻ **Reload** button. Magazine size is parsed from the gun's capacity string (`15(c)` → 15).

**Reload:** ↻ → prompts compatible stockpiles (matched by loading mechanism; with rounds, when tracking on) → loads up to magazine size, subtracts from the stockpile, **discards any rounds left in the old mag** (full swap). Tracking off → only sets the loaded type, no stock math.

**Firing** uses whatever is loaded — no per-shot picker. When tracking on, the magazine decrements (1 SS/SA, 3 BF, N FA + walking-fire waste) and warns (never blocks) when empty.

**Rounds or reloads — the Ammo Reloading Table (TODO 114, 0.5.2).** Tracking on. **Walked by the agent 2026-09-13**, Browser pane as mcp-api:
- [x] Migration via `force()`: *7-round cy reload ×6* (0 rounds) on an actor with a `7(cy)` revolver → 6 reloads of 7, `cy`; *10-Rnd Clip (Explosive) ×2* → 2 reloads of 10, Explosive; a *Box* of 42 untouched.
- [x] Ammo tab reads **6 reloads of 7**; the reload dialog offers "6 reloads of 7", shows *In the gun now: 3/7*; after the swap: 7/7, **3 unfired rounds lost**, one speed loader used, *Complex Action to use a speed loader (SR3 p.280)*.
- [x] A 10-round clip into an 8(c) gun loads 8, names the mismatch, uses the whole clip.
- [x] Loose rounds into an 8(c) gun holding 2: the dialog asks how many (default 6 = full, *2 Complex Actions* at Quickness 4); 3 chosen → 5/8, *1 Complex Action to insert 3 rounds into the clip*, box 34 → 31.
- [x] Item sheet: clip ammo offers *Loose rounds / Pre-filled clips*; internal-magazine (`m`) shells show Rounds only, even with `countedIn: reloads` stored.
- [x] Storage: a stack of 5 reloads asks "of 5"; storing 2 leaves 3 out, 2 stored — and the **stored stack is no longer offered** by the reload dialog (it was; fixed).
- [x] Round by round never loses a round (2026-09-14): a 6(m) shotgun holding 4 regular, loaded with gel shells → 6 gel, and the 4 regular **unloaded** into a new *Regular rounds (unloaded)* item; loading regular back → the 3 gel shells returned to the existing gel item (6 → 9).
- [ ] Import the troll fixture in a live world (covered end-to-end by `tests/importer.test.mjs`).

**Loading-mechanism filter:** a clip-fed gun (`(c)`) only offers clip-mechanism ammo on reload. **In:** gun `15(c)`, stockpiles of clip-APDS and belt-FMJ → only clip-APDS is offered.

**Type effects (applied automatically from the loaded type):**

| Type | Effect | When |
|---|---|---|
| Regular | none | — |
| Explosive | Power +1 | attack |
| EX Explosive | Power +2 | attack |
| Gel | Power −2, damage → Stun | attack |
| APDS | target ballistic halved (round down) | soak card |
| Flechette | unarmoured → level +1; armoured → effective armour ×2 (incl. vehicle) | soak card |
| Tracer | FA-only; tracer rounds raise Level not Power (5M ×10 rds → 12D); −1 TN/3 rds shown as a manual note | attack |
| Anti-Vehicle | bypasses the vehicle Power÷2 reduction | attack |

**Examples:**
- Explosive on `5M` → `6M`. EX on `5M` → `7M`.
- Gel on `9M` → `7M Stun`.
- APDS vs ballistic 6 → soak card shows ballistic **3**, gold note "APDS — ballistic armour halved".
- Flechette vs unarmoured target → soak card incoming level raised one (e.g. `9M` → `9S`). Vs armour 5 → effective armour **10**.
- Tracer FA 10 rounds on `5M` → `12D` (not 15D), gold-noted tracer TN bonus.
- Anti-Vehicle vs vehicle → no Power÷2 applied (no manual checkbox needed on character firearms).

**Vehicle-mounted weapons** keep their own AV-munition checkbox in the 🚗 dialog (no clip system).

### Bows & crossbows — nocked arrows / bolts

Bows and crossbows draw from the same **Ammunition** stockpile as guns, but hold **one** nocked round (capacity 1). Loading mechanism: **bows ↔ Arrow, crossbows ↔ Bolt** (auto-matched by weapon category; slings never deplete). No special arrow/bolt types yet (always Regular). Gated by **Track Ammunition** like firearms.

**Setup:** Add an Ammunition item, set Loading Mechanism = **Arrow** (or **Bolt**), Stock = e.g. 10. Add a Bow (or LCB/MCB/HCB crossbow) on the Projectiles section.

- **Projectiles section (tracking on):** shows a **Nocked** column (Arrow/Bolt when loaded, red "empty" when not) + ↻ Reload. Tracking off → no Nocked column, fires freely (old behaviour).
- **Reload:** ↻ on the bow → offers only **Arrow** stock (crossbow → only **Bolt**). Loads 1, stock 10 → **9**, Nocked shows "Arrow". **In:** bow with arrow stock 10 → reload → stock 9, nocked Arrow.
- **Fire:** looses the nocked round → `loadedRounds` 1 → 0, info "no arrow nocked — reload". **In:** fire the bow → Nocked shows red "empty", dice icon faded.
- **Empty = inoperable:** with no arrow nocked (tracking on), the dice icon is disabled and `rollWeapon` warns "has no arrow nocked — reload"; ↻ stays active. **In:** empty bow → click dice → warning, no roll.
- **Mechanism filter:** a bow offers only Arrow stock, never Bolt (and vice-versa). **In:** actor with both Arrow and Bolt stock, fire a crossbow → reload lists only Bolt.
- **Slings (SL) & uncategorised:** never deplete — no Nocked column entry, always operable.
- **Tracking off:** bows/crossbows fire freely with no counting (reload only sets the type, which is always Regular).
- **Canvas picker:** a bow with no nocked round (tracking on) is **not** listed as ready; nock one → it appears.

### Empty weapons are inoperable (tracking on) - passed
When **Track Ammunition** is on, an empty weapon's dice icon is faded and cannot be rolled; the Reload button stays active.
- **In:** firearm with `loadedRounds 0` → dice icon disabled; clicking does nothing; ↻ Reload still works. After reload → dice icon active.
- **In:** thrown weapon with quantity 0 → dice icon disabled.
- **In:** bow/crossbow with no nocked round → dice icon disabled; ↻ Reload still works.
- Tracking **off** → all weapons always operable (no fading).

### Range (firearms, bows/crossbows, thrown) - passed
Needs both combatants as tokens on a scene whose grid distance is in **metres**.
- **Auto-measure:** target a token (T tool), fire → roll dialog shows a **Range** dropdown pre-set to the measured band, with "measured Nm". TN pre-fills to base + range mod (Short +0 / Medium +1 / Long +2 / Extreme +5).
  - **In:** firearm vs target 37m, Assault Rifle (`50/150/350/550`) → Short, TN 4. At 200m → Long, TN 6. At 600m → "beyond Extreme" warning, TN 9.
- **Override:** change the dropdown → TN recomputes live; or edit the TN field directly. **In:** auto says Long (TN 6); GM picks Medium → TN becomes 5.
- **Strength-scaled (bows/thrown):** bands = STR × multiplier. **In:** STR 5 Bow (`1/10/30/60`) → bands 5/50/150/300m; target 40m → Medium.
- **Per-weapon override:** item sheet "Range Override" = "5/15/30/50" wins over the category table.
- **No tokens / no scale:** no dropdown; set TN manually (unchanged behaviour).

### Attacking from the canvas - passed
- **Token HUD:** select an owned token → 🎯 button → weapon picker lists *ready* weapons (firearm w/ ammo, equipped melee, thrown w/ qty, bow/crossbow w/ nocked round, slings) → fires the normal flow. One ready weapon → fires immediately. **In:** runner with loaded pistol + equipped sword → picker shows both.
- **Hotbar drag:** drag a weapon row from the sheet to the hotbar → "Fire: \<weapon\>" macro created → click fires it. ⚠ Script macros only run for users granted script-macro permission; the Token HUD works for everyone.


### Dodge - **RETEST REQUIRED (ordering and tie rule both changed)**

⚠ The version here asserted two things that are wrong, and it passed against both.

**Ordering.** The defender now declares **after** seeing the attack's successes (SR3 p.112 step 4;
the book's own worked example has Snot decide only once Liam has rolled 5). The prompt opens on the
**defender's** client, not the attacker's. Committing blind was not a simplification — it deleted
the dodge-vs-soak trade the rule exists to create, since pool spent dodging is gone from the
Damage Resistance Test.

**Ties.** A clean miss requires dodge successes to **exceed** the attack's — *"more than"*,
*"exceeds"*, both strict. Equal successes is a **hit**. The old `≥` is the single most likely thing
to get "helpfully" relaxed back.

**Failed dodges are not wasted.** Their successes carry into the soak and stage damage down at the
usual 2-per-level. Staging *up* is unaffected: dodge hits never cancel attack hits.

- **In:** attack 3 hits, dodge 2 → **Out:** hit. Soak card shows the 2 carried, e.g. `5 hits
  (3 soak + 2 dodge)`.
- **In:** attack 3 hits, dodge 3 → **Out:** **hit** (tie goes to the attacker), 3 carried to soak.
- **In:** attack 3 hits, dodge 4 → **Out:** clean miss.

Pinned by `tests/dodge-resolution.test.mjs`, including the tie.

### Soak card — Body and Combat Pool are separate fields
The card offers **Body dice** (free) and **Combat Pool** (charged, capped at what is available).
When the pool is empty it says so in amber rather than silently offering nothing — which is the
p.113 trade made visible, since a defender who burned pool dodging arrives here with less.
- **In:** spend 2 pool on the soak → **Out:** that actor's Combat Pool drops by 2 on the sheet.
- **In:** dodge with all your pool, fail, then soak → **Out:** soak card shows **0 left**.

### Soak TN - passed
Formula: `max(2, Damage Power − Armor)`

| Power | Armor (Ballistic) | Soak TN |
|---|---|---|
| 9 | 5 | 4 |
| 6 | 0 | 6 |
| 4 | 8 | 2 (min) |

### Damage staging (after soak) - passed
Every 2 soak hits = 1 stage down (D→S→M→L). Below L = fully soaked.

**In:** `9S` damage, 4 soak hits → staged down 2 → `9L`. 6 soak hits → `9L` → fully soaked.

### Assign Damage button - passed
After soak resolves → **🩸 Assign \<Level\> \<Stun/Physical\> Wound to [Name]** button (e.g. "Assign Serious Stun Wound to Dave Decker"). The **Power number is dropped** (it doesn't change wound severity — only the level does), and "Wound" is used instead of "damage" for clarity. Click → wound track updates (boxes from L/M/S/D = 1/3/6/10), button disables. This wording is shared across **all** combat cards (ranged, melee, spell, drain, matrix/IC, vehicle).

Boxes applied per level:
| Level | Boxes |
|---|---|
| L | 1 |
| M | 3 |
| S | 6 |
| D | 10 |

---

## 6. Melee Combat - **AUTOMATED** (`npm run test:e2e`)

Click melee weapon → target dialog → two-corner card appears for both sides simultaneously.

### ✅ Covered by `tests/e2e/melee-two-corner.spec.mjs`

Two real clients — Player2 attacking, Player3 defending — driving actual browsers against a
running Foundry. Player-vs-player rather than GM-vs-NPC on purpose: the GM is the decider for
every actor and sees every corner unlocked, so a GM-side test **cannot** exercise the thing
that was broken.

What it asserts, so this section need not be walked by hand:

- Each player's own Submit is enabled and the opponent's is disabled — checked on **both**
  clients, since "my button works" is only half the guarantee.
- Each player sees the other's inputs `readonly`.
- One submission does **not** resolve: the ledger records the attacker, the defender's slot
  stays empty, and the progress strip appears **on the other client**.
- The last submission resolves.
- **Each side is charged exactly what that side submitted** — attacker 2 pool, defender 0.
  This is the assertion the suite exists for: under the bug found in play, both corners came
  from whichever client happened to resolve.

⚠ **Still walk this by hand for anything the assertions do not describe** — layout, whether
the read-only corner *looks* disabled, whether the strip is legible. Automation proves the
values are right; it says nothing about whether the card is usable.

### ⚠ There is no longer a shared "Roll!" button — retest every card that had one

This applies to **all eight** two-corner cards: melee, astral, contested, both cybercombat
rulesets, MIJI, and the Orthodox System Test / IC Attack. Anything below that says *"GM clicks
Roll!"* or *"both sides editable"* describes the old behaviour.

**What to verify, with two clients logged in (a GM and a player):**

- Each side sees **its own corner editable** and the **opponent's read-only** and dimmed, with a
  tooltip explaining why. The GM sees *both* unlocked — that is intended, since the GM is the
  decider for every actor and must be able to submit an NPC's corner.
- Each side gets its **own Submit button**; the other side's is disabled for you.
- A progress strip appears after the first submission — `✓ <name> · waiting for <other>` — and it
  appears **on every client**, not just the one that clicked.
- **The last submission resolves the exchange.** Neither side can roll for both.
- Your submitted numbers are the ones used: put pool dice in your corner and confirm that actor —
  and only that actor — is charged for them.
- The GM's **Resolve now** override resolves with card defaults for anyone outstanding.

⚠ **Verified in play for melee only** (2026-08-12, GM + Player2). The other seven share the
mechanism but have not been exercised live — and the bug found during that session (submitted
values silently dropped, resolution falling back to the clicking client's DOM) was invisible to
the test suite, so a green `npm test` is not evidence here.

### Adjacency (warn only)
Melee reaches **adjacent squares only**. If both attacker and target are tokens on a scene and the target isn't in an adjacent square, a warning posts ("…Nm away — out of reach for a melee attack") but the attack **still proceeds**. Reach affects TN, not range.
- **In:** attacker and target on neighbouring squares → no warning. Target several squares away → warning, boxing card still appears. Off a scene / no tokens → no warning.

### TN formula
`4 − own reach + woundMod`

**In:** Attacker reach 1 → TN `4 − 1 = 3`. Reach 0 → TN 4.

### Defender auto-selects weapon
1. Equipped melee item (equippedMelee field)
2. First unarmed/cyber item found
3. Bare hands: STR + M damage

⚠ **That fall-through is silent, and it caused a two-day misdiagnosis.** A character carrying a
pole arm who never pressed **Equip** defends bare-handed at reach 0, and the only place it used to
surface was mid-combat as an unexpected defaulting prompt. Two things now make it visible — verify
both:

- The Melee section of the sheet states **"Defends with: X (Reach N)"**, turning **amber** with a
  prompt to press Equip when armed melee weapons are owned but none is equipped. A character with
  no melee weapons at all stays quiet — that one is simply correct.
- The defaulting prompt names **the weapon and the skill it needs**, e.g. *"Bare Hands needs
  Unarmed Combat / Martial Arts, which X does not have"*. It reads the requirement from the same
  lookup that failed, so the wording cannot drift from the rule.
- **In:** actor owns a Katana, nothing equipped → sheet shows amber "Defends with: Bare Hands";
  incoming melee prompts *"Bare Hands needs…"*, not *"has no Unarmed Combat"*.
- **In:** actor owns cyber spurs, nothing equipped → **quiet** (spurs are a real answer).

### Net hits → staging
Winner hits − loser hits = net successes → stage up base damage.

**In:** Attacker 3 hits, defender 1 hit → net 2 → base weapon `6M` stages up 1 → `6S`.

### Loser soak
Loser gets Resist Damage button → soak card for their Body dice vs TN power − armor. Same soak/assign flow as ranged.

---

## 7. Unarmed Combat - passed

A built-in **Unarmed Combat** entry is always available — it's not a real item (uneditable).
- **Where:** top of the Weapons tab's **Cyber & Unarmed** section (a row with a dice icon), and in the canvas Token-HUD attack picker.
- **Damage:** `(STR)M Stun`. **In:** STR 4 → `4M Stun`.
- **Pool / skill choice:** Unarmed Combat and Martial Arts (`MA:`-prefixed, e.g. `MA:Karate`) skills are interchangeable — use the **highest-rated** among them; if none exist, the **interactive Default dialog** opens (see §9).
- Runs the normal melee flow (target → adjacency warn → boxing card → soak).
- **In:** `Unarmed Combat 4` only → boxing card uses **Unarmed Combat 4**, TN 4.
- **In:** `Unarmed Combat 4` and `MA:Karate 6` → boxing card uses **MA:Karate 6** (highest), TN 4, **not** defaulting.
- **In:** no Unarmed Combat and no MA skill → Default dialog pops; choose Attribute → Strength 4 → boxing card shows **STR 4 dice, TN 8 (4+4), Pool max 0**. Choosing Skill/Spec uses ½ rating, +2/+3 TN, pool allowed.
- **In:** both attacker and defender lack a skill → **both** get the dialog (attacker first, then defender).
- **In:** Token HUD attack picker lists "Unarmed Combat" alongside ready weapons → choosing it runs the unarmed attack.
- The defender's bare-hands fallback is also `(STR)M Stun` (aligned).

---

## 8. AoE / Grenades (RAW scatter-first) - passed 

Needs a scene with tokens. Flow: **nominate** the blast point (drag the template, Confirm) → **roll to throw** → scatter **relocates** the blast → re-detect who's caught → soak.
- **In:** throw a grenade, place the template, set grenade type → throw TN auto-fills from the Grenade Range Table for that type (Standard/Aero = STR-scaled, Launcher = fixed); changing the type updates the TN.
- **In:** roll the throw. Scatter = (1d6 standard / 2d6 aero / 3d6 launcher) − **2m per success** (4m aero/launcher). The chat reports direction (relative to throw: 1 overthrow … 4 short) + distance; a result template appears where it landed.
- **In:** **0 successes → grenade does NOT vanish** — it scatters the full rolled distance, lands somewhere, and hits whoever's in range there (possibly no one, possibly the thrower).
- **In:** scatter carries the blast onto a bystander / the thrower → they get a soak card; the nominated target may be missed entirely. (This is intended — grenades are deadly.)
- Per-target power = base damage − distance from the (scattered) epicentre. Damage is **not** staged up by successes.
- **Confined Space (Chunky Salsa):** tick the box → after the throw + scatter, the Chunky Salsa GUI opens seeded with whoever was caught; draw walls / drag positions → it returns each target's code into the soak cards.

### The thrower's wounds — FIXED 2026-09-14 (0.5.2)
The throw rolls with `skipWoundMod` (the single-target path's convention: the roll-options TN
already holds the wound), but the grenade dialog built its TN as 4 + range alone, so a wounded
thrower never paid the wound modifier (SR3 p.126). Layered armour (p.285) was missing the same way.
`SR3EItem.throwPreTN` now feeds the dialog; `tests/aoe-throw-tn.test.mjs` + the
`grenade-throw-ignores-wounds` mutant.
**Walked by the agent 2026-09-14** (mcp-api, the dialog opened directly — the pane draws no canvas):
a Moderate wound at 12 m starts at **TN 6** (4 + 2, Short), says *"Wound +2 (pre-applied)"*, and keeps
the +2 when the grenade type changes.
- [ ] A real throw on a drawn canvas by a wounded character: the dialog's TN includes the wound, and the throw card rolls at that TN (not +2 again).

### Blast power at distance - passed
`Power at target = weapon power − distance in metres` (from the scattered epicentre).

**In:** Grenade power 12, target 4m from where it landed → effective power **8**.

### Blast power at distance
`Power at target = weapon power − distance in metres`

**In:** Grenade power 12, target 4m away → effective power **8**.

Multiple walls/reflections: additional power penalty applied per path. All wave hits on a target are summed.

Each target gets their own Resist Damage button → soak flow runs per-target.

### Thrown-weapon quantity (tracking on) - passed
Thrown weapons / grenades (`thrown` type, or `projectile` with a thrown category) carry a **Quantity** and are decremented 1 per throw. Bows/crossbows are never consumed. The weapons-tab thrown section shows `×qty` (amber ≤2, red at 0).

- **In:** grenade quantity 3 → throw it → quantity **2**, card resolves as normal.
- **In:** quantity 1 → throw → quantity **0**, "last one" warning, dice icon now disabled.


---

## 9. Skill Rolls

### With skill rating
Pool = skill rating (wound mod adds to TN, not pool)

**In:** Pistols 5, no wounds → 5 dice.

### Specialisation bonus - passed 
Pool = skill rating + 2 (when spec applies)

**In:** Pistols 5, specialisation "Ares Predator", firing an Ares Predator → **7 dice**.

### Defaulting (no skill) — interactive SR3 Default Table - passed
When a roll has **no appropriate skill**, a dialog pops asking how to default. Three tiers:

| Default to | TN modifier | Dice pool | Pool dice |
|---|---|---|---|
| Specialization | +3 | ½ underlying skill **base** rating (round down) | allowed |
| Skill | +2 | ½ chosen skill rating (round down) | allowed |
| Attribute | +4 | full attribute value | **not allowed** |

- The conditional dropdown lists **all** the actor's active skills / specialisations (the GM judges
  relevance) and every attribute. Live preview shows resulting dice / TN mod / pool-allowed.
- **Cancel** aborts the whole action.

**In:** untrained skill → roll → choose **Attribute → Intelligence 4** → pool **4**, TN +4, no pool
dice. Roll label includes `Defaulting → Intelligence 4, TN +4 (no pool)`.
**In:** choose **Skill → Pistols 5** → pool **2** (⌊5/2⌋), TN +2, may add combat pool.
**In:** choose **Specialization → Pistols (Ares) base 5** → pool **2** (⌊5/2⌋), TN +3, may add pool.

---

## 10. Attribute Rolls - passed

Click attribute die on Bio/Attributes tab → rolls pool equal to attribute value vs chosen TN.

**In:** Body 5, TN 4 → 5 dice chat card.

---

## 11. Spellcasting — **PARTLY AUTOMATED** (`npm run test:e2e`)

### ✅ Who may click what — `tests/e2e/spellcasting.spec.mjs`

The result card carries buttons belonging to **two different people**, and the spec proves
each is refused to the other across two real clients:

| Button | Belongs to | Asserted refused to |
|---|---|---|
| **Resist Spell** (`.sr-spell-soak-btn`) | the target's owner | the **caster** |
| **Resist Drain** (`.sr-drain-btn`) | the caster's owner | the **target** |

⚠ **This cannot be checked from one seat.** The GM passes both gates, and a lone player sees
only their own half and would report it working. The negative assertions are the guarantee —
and they are what silently regresses when a gate is loosened for an unrelated complaint,
which is how [#27]'s original defect survived so long.

It also asserts Spell Pool is charged to the caster and that the target spends nothing.

**Still walk by hand:** the rules maths below — Force, drain codes, staging, the resist
attribute — plus anything about how the cards read.

Combat spells are a single **opposed (resisted) test** — like melee, not like a ranged attack + soak.
Full flow: Cast → Force **+ Damage Level** dialog → Target selection (**no dodge**) → Magic Pool allocation → **Sorcery vs TN = the spell's Target attribute** (e.g. target Willpower) → per-target **Resist Spell** (that same attribute vs **TN = Force**) → **net stages the damage** → Assign Damage. Caster also gets a Drain button. **There is NO soak step after the resist.**

### Force + Damage Level dialog
Spells have **no damage code** — power = Force, and the level is chosen at cast. For a **Combat-category** spell the cast dialog shows a **Damage level** dropdown (Light/Moderate/Serious/Deadly, default Moderate). The chosen level sets the base damage `(Force)(level)` for the target **and** the caster's drain level. Non-Combat spells (Heal, Detect…) show no dropdown.

**In:** Manabolt (Combat) → dropdown defaults **Moderate**; pick **Serious** → base `(F)S`, drain level S. The spell item sheet has **no Damage Code field**, and a spell is only flagged "incomplete" if its **Drain** is blank.

### Damage track follows spell Type (Mana = Stun, Physical = Physical)
The target's damage track is **not** read from the Damage text — it's the spell `Type`: **Mana → Stun**, **Physical → Physical**. (Drain track is separate: Stun, or Physical if Force > Magic.)

**In:** Manaball (Type Mana) `5S`, net 5 → **6D Stun**. A Physical spell at the same numbers → **6D Physical**.

### Sorcery pool
Skill rating + committed magic pool dice.

**In:** Sorcery 5, 2 magic pool committed → **7 dice**.

### Cast result card shows TN source + staging
The caster's result card reads: **"🔮 <Spell> (<base>) cast — N successes vs TN X (Target's Attribute)"** then **"N hits stages up ×K. base → staged"** (the cast's own staging, K = ⌊hits/2⌋; the target's resistance then reduces it via net).

**In:** Manaball (5M) vs Dave Decker, 4 hits, TN 3 → "🔮 Manaball (5M) cast — 4 successes vs TN 3 (Dave Decker's Willpower)" / "4 hits stages up ×2. 5M → 5D". With 1 hit → "1 hit — no stage up. 5M".

### Cast TN = the spell's Target attribute (NOT Force)
The caster rolls Sorcery vs **TN = the target's attribute named in the spell's Target field**. Codes: `W`→Willpower, `B`→Body, `I`→Intelligence, `Q`→Quickness, `F`→Force, or a fixed number. The **Force** is the TN for the *resistance* roll, not the cast.

**In:** Manaball (Target W), target Willpower 2 → cast **TN 2**. Same spell vs Willpower 5 → cast TN 5.

### Target-code parsing (suffixes stripped, no errors)
Any `(R)/(T)/(RC)/(V)/(DT)` suffix is descriptive — it's stripped before parsing, so the base code drives both the cast TN and the resist attribute. `OR`/blank/unknown → Mana=Willpower, Physical=Body.

**In:** Target `W(R)` → Willpower (same as `W`). `B(T)` → Body. `I` → Intelligence. `Q` → Quickness. `4(V)` → fixed TN **4** (resist defaults to Willpower). `F` → cast TN = Force. None of these throw or fall back wrongly.

### Force vs Magic (drain Stun/Physical)
- Force ≤ **Magic attribute** → drain is **Stun**.
- Force > **Magic attribute** → drain is **Physical** (warning shown in Force dialog). SR3 RAW — Magic, not Sorcery.

**In:** Magic 5, Force 5 → Stun. Magic 5, Force 6 → Physical. (Sorcery rating is irrelevant here.)

### Drain TN from the drain code
The spell's **Drain** code sets the resist TN: `F`→Force, then the math is evaluated (min 2). Include a level letter (L/M/S/D) or it defaults to S.

**In:** drain `(F/2+1)M`, Force 4 → TN `4/2+1 = 3`, level M. Drain `(F/2)S`, Force 6 → TN 3, level S.

### Resist Spell = opposed, net stages the damage (NO soak)
Target rolls the **same attribute named in the spell's Target field** (the resist reuses the same parser as the cast, so it always matches — W→Willpower, B→Body, I→Intelligence, Q→Quickness) — **attribute only, no pool** — vs **TN = Force**. **Net = caster successes − resister successes**:
- net ≤ 0 → **"Spell resisted — no effect"** (no Assign button).
- net ≥ 1 → base damage (Power = Force, the spell's level) staged up by net (every 2 net = +1 level) → **Assign Damage** button. No further soak card.

### Worked example (Manaball, Target W, Force 6)
Caster Sorcery 4 / Willpower 4; target Street Sam Willpower 2; base level Moderate (M).
1. **Cast:** Sorcery 4 vs **TN = target Willpower 2** → say **3 successes**.
2. **Resist:** target Willpower **2** dice vs **TN = Force 6** → say **1 success**.
3. **Net = 3 − 1 = 2** → +1 stage → **M → Serious (S)** → **Assign Serious Stun Wound** (Mana spell; no armour, no soak).
4. **Drain:** (Damage Level +1 = S), Drain Power = Force÷2 = **3** → caster Willpower 4 vs TN 3 stages it down (unchanged step — works as before).

### 0 successes (cast)
Spell fails — no Resist buttons — but the Drain button still appears.

### Area spells (AoE) — canvas template + auto-detect

Set the spell's **Range** to an `(A)` value (`LOS (A)` or `Touch (A)`) — there is **no AoE checkbox**; the `(A)` in the Range code is what makes it area-effect. On cast:
- The **Force dialog** also shows an **Area radius (m)** input, defaulting to the caster's **Magic** attribute (editable).
- Then a purple circle follows the cursor → **left-click** places it, **right-click/Esc** cancels.
- **Every live actor inside the radius (except the caster & vehicles) is auto-targeted** — no checkbox list. **No scatter, no falloff**: each caught target resists at full Force (normal per-target staging).
- A purple **Region** area marker is drawn for **all players**; the result card has a 🧹 **Clear** button (warning-free).
- Empty area → casts anyway, drain still applies.
- **Off a scene** → falls back to the old manual checkbox target list.

**In:** Magic 6 caster, AoE spell → Force dialog radius pre-fills **6**; place over 3 tokens → 3 Resist Spell buttons + 1 Drain button + purple area marker + Clear button.
**In:** place over empty ground → "no targets in the 6m area — casting anyway", only the Drain button + marker.

### Casting from the canvas (🎯 Token-HUD)

Combat/damaging spells (those with a damage code) on an **Awakened** actor appear in the 🎯 attack picker alongside weapons; choosing one runs the normal cast flow. Utility/health spells (no damage code) and mundane actors are excluded.

**In:** mage with Manabolt `8M` + a pistol → 🎯 picker lists both; pick Manabolt → Force dialog opens. **In:** mage with only Heal (no damage) → 🎯 does not list it.

---

## 12. Drain

After spellcasting, Resist Drain button on caster.

### Drain code = two modifiers; ½F and the damage level are the implicit base
- **Power → resist TN** = ⌊Force/2⌋ + the **number outside the brackets** (½F is implicit; default +0).
- **Level** = the cast **Damage Level** + the **number inside the brackets** (`(+1)` or `(DL+1)`/`(Damage Level +1)` = +1 stage; `(DL)`/`()` = +0; `(DL-1)` = −1).

| Drain code | Force | cast level | TN | Drain level |
|---|---|---|---|---|
| `(DL+1)` | 6 | S | 3 | **D** (S +1) |
| `(DL+1)` | 6 | M | 3 | **S** (M +1) |
| `(DL)` | 6 | M | 3 | M |
| `(DL-1)` | 6 | S | 3 | M |
| `+1` (power mod) | 6 | S | **4** (½F+1) | S |
| `+1(+1)` | 6 | S | 4 | D |
| `(F/2+1)S` (legacy F-formula) | 6 | M | 4 | M |
| `(F/2)S` (Heal, non-damaging) | 6 | — | 3 | S |

**In:** Manaball drain `(DL+1)`, cast at **Force 6 Serious** → **3D** (TN ⌊6/2⌋=3, level Serious+1=Deadly), resisted with Willpower — **Stun** (or Physical if Force > Magic). No more "Could not parse drain formula" error.

Pool: Willpower + committed Magic Pool dice.

### Drain staging from resist hits
Every 2 hits = 1 stage down (S→M→M→L→fully resisted).

### Assign Drain button
**⚡ Assign \<Level\> \<Stun/Physical\> Wound to [Caster]** → applies boxes to correct track, disables.

### Sustained spells — `feature/sustained-spells` (0.6.0) · SR3 p.178

*"+2 target modifier per sustained spell applied to all tests, including Drain Resistance Tests (but
not normal Damage Resistance Tests)"*, up to the Sorcery rating. `tests/sustained-spells.test.mjs` (53
assertions) + two mutants. ⚠ **Data-model change** — `system.sustainedSpells` on characters and NPCs;
the live world picked it up on reload, but restart Foundry fully if an actor shows no field.

**Walked by the agent 2026-09-14** (mcp-api, a disposable `__TEST Sustainer`, Sorcery 4, deleted
after): two spells held, one ticked *focus* → **+2** (the focus costs nothing), the token shows
*Sustaining*; the Magic tab lists both with *1 / 4 (Sorcery) · +2 TN*; a 4-die roll at TN 4 went at
**6**, labelled *(sustaining +2)*; adding 2 Stun posted *took damage while sustaining* with **one** 🎲
Keep (the focus-held spell is not tested); 🔒 on a cast card added a third (+4); a Force 6 `(F/2)` Drain
card pre-filled **TN 7** (3 + 4, said on the card); dropping all cleared the status.
- [ ] Cast a Sustained spell (Armor) for real → the result card offers **🔒 Sustain**; an Instant one (Manabolt) does not; the Resist Drain that follows is NOT raised by the spell just sustained.
- [ ] Player-seat: a player sees 🔒 and 🎲 Keep enabled for their own caster, disabled on someone else's.
- [ ] Sustaining one spell: the melee GM window shows *"… sustaining +2"*, a dodge prompt's TN includes it, and a **soak card's TN does not** change.
- [ ] A target sustaining one spell resists a combat spell → the resist card's TN is Force **+2** (the maintainer's ruling, 2026-09-14).
- [ ] A decker sustaining one spell: cybercombat corner +2 whether attacking or defending; a rigger's MIJI corner and EW tests +2.
- [ ] Sustain more than the Sorcery rating → an amber warning on the Magic tab and a notification; nothing is refused.

---

## 13. Dispelling

Roll Sorcery (+ Dispelling spec bonus if applicable) + optional spell pool vs TN = Force of target spell.

**In:** Sorcery 5, spec bonus, Force 6 → **7 dice vs TN 6**.

Each 2 net hits over defender's Sorcery roll = 1 stage of Force reduction (not yet fully wired into effects, but roll + drain resolve).

Dispeller resists drain as normal.

---

## 14. Conjuring / Summoning

SR3 RAW. Summon dialog (Magic tab): pick spirit + Force + **Hold back dice** (0…Conjuring−1, saved for the Drain Resist). The dialog previews the drain level (Force-vs-Charisma) and Stun/Physical, with a totem/foci reminder.

### Step 2 — Conjuring Test (straight success test)
Pool = **Conjuring skill − held-back**, TN = **Force**. **Each success = one service** (no spirit-resistance roll). 0 successes → "Conjuring failed — no spirit appears (Drain still applies)".

**In:** Conjuring 6, hold back 2, Force 4 → roll **4 dice vs TN 4**. 3 successes → **3 services**, "Confirm Summoning" button (creates the spirit, adds to combat).

### Step 3 — Drain Resistance
Always, even on failure. **Level from the Force-vs-Charisma table** (F ≤ ½C Light, ≤ C Moderate, ≤ 1.5C Serious, else Deadly). **TN = Force.** Pool = **Charisma + held-back dice** (no Willpower; totem/foci added by GM via the editable field). **Physical if Force > Magic, else Stun.**

**In:** Force 4 vs Charisma 4 → Moderate; held back 2 → drain pool = Charisma 4 + 2 = 6, TN 4. Force 4 vs Magic 5 → **Stun**. Force 7 vs Charisma 4 → Deadly.

### Step 4 — Result
"✅ ... successfully summoned a \<Spirit\> (Force F). It is bound for X services."

---

## 15. Assensing

Intelligence roll vs TN (entered in dialog).

**In:** INT 5, TN 4 → 5 dice vs TN 4.

Aura Reading complementary roll button appears on result card — rolls Assensing skill after first Assensing roll.

---

## 16. Astral Combat — **AUTOMATED** (`npm run test:e2e`)

Both combatants must be in astral space or dual-natured. Each side submits its own corner on the astral card; the last submission resolves. See the ⚠ note in §6.

### ✅ Covered by `tests/e2e/astral-two-corner.spec.mjs`

Two real clients, two purpose-built mages (created and deleted by the spec, so no existing
character is touched). Same assertions as §6's melee spec — own corner editable, opponent's
read-only, one submission does not resolve, the last one does — plus the one that is specific
to astral: it must charge the **Astral** pool, not Combat. A card wired to the wrong helper
would still resolve and still look right on screen.

### Attack / defence dice
Sorcery skill (+ 2 if Astral Combat spec), or **defaulting** (interactive — see §9, linked attribute = Willpower).

**In:** Sorcery 5, no spec → **5 dice**, TN 4. No Sorcery → the Default dialog opens; **both sides**
are prompted (attacker first, defender second) when both lack Sorcery. Choosing Attribute → WIL 4
gives **4 dice**, TN **8** (4 + 4), astral pool **0**.

### TN: 4 (both sides)

### Damage
Unarmed: Charisma + M Stun
Armed (focus): Charisma + weapon focus damage code

**In:** CHA 4 → bare astral damage `4M Stun`.

### Net hits → staging
Same as physical melee — every 2 net hits = +1 stage.

### Soak
Loser rolls Willpower vs TN = winner's Charisma.

**In:** Winner CHA 5 → soak TN **5**.

---

## 17. Astral Modes (Awakened characters only)

Set on the Magic tab. Only one active at a time; clicking active button deactivates.

| Mode | Badge in tracker | Initiative formula |
|---|---|---|
| Physical Plane | Grey "Physical" | Normal |
| Dual Natured | Amber "Dual Nat." | Normal |
| Astral Projection | Purple "Astral" | INT + 20 + 1d6 |

- Clicking Astral Projection on a character with INT 5 → initiative card shows base **25 + 1d6**.

---

## 18. Matrix

### Orthodox packs, shown by ruleset — `feature/orthodox-packs` · 2026-09-14
`sr3e-sr3-odm-cyberdecks` (8 decks, SR3 p.207/304) and `sr3e-sr3-odm-programs` (22 utilities,
pp.220-222), built by `tools/build-odm-packs.mjs` and shown only under the Orthodox Matrix ruleset;
the Defragged decks and programs only under Defragged. `tests/odm-packs.test.mjs`,
`tests/source-books.test.mjs`. Written to the install and the manifest synced on 2026-09-14 —
**restart Foundry fully** before walking these.
- [ ] Matrix Ruleset = Defragged → the Compendium sidebar's Matrix → Cyberdecks folder shows only the Defragged pack; Orthodox packs absent.
- [ ] Switch to Orthodox (reload) → the folder shows *Cyberdecks (Orthodox)* and *Programs (Orthodox)*, not the Defragged ones.
- [ ] Orthodox, a decker's Matrix tab → pick a cyberdeck → the 8 stock decks; pick Fairlight Excalibur → MPCP 12, Hardening 6, 3000/5000 Mp, I/O 600, Response 3 fill in.
- [ ] Orthodox → add a program → the 22 utilities, Attack at four levels; Track shows multiplier 8.
- [ ] Open *Fairlight Excalibur* from the pack → the Book / Page box reads *SR3 p.207 · SR3 p.304*; *Track* reads *SR3 p.221*.

### User modes (Matrix tab)

| Mode | Initiative formula | Notes |
|---|---|---|
| Tortoise (TRM) | REA + woundMod + 1d6 | +2 TN to all Matrix actions; wired reflexes apply |
| AR | REA + woundMod + 1d6 | Wired reflexes apply |
| VR-Cold | REA + woundMod + 1d6 | Wired reflexes apply; dumpshock = Stun |
| VR-Hot | (REA_base + woundMod + Response×2) + (1+Response)d6 | Wired reflexes excluded; Response replaces them; dumpshock = Physical |

### Hacking pool
Formula: `⌊(INT + MPCP) / 3⌋` — displayed on sheet when cyberdeck is equipped.

| INT | MPCP | Expected Pool |
|---|---|---|
| 6 | 6 | 4 |
| 5 | 9 | 4 |

### IC wound track
IC soak roll result → **💉 Assign \<Level\> Matrix Wound to [IC name]** button → updates IC `system.woundValue`.

IC wound max = `rating × 2`. Hitting max = destroyed.

---

## 19. Matrix Combat — Cybercombat (Decker attacks IC/Agent)

**Prerequisites:** Decker must be connected to a host (User Mode button → host selection dialog). IC must be deployed from a host sheet. Both must share the same `activeHostId`.

Flow: Cybercombat button on decker sheet → **target dialog** (lists all actors on same host) → **two-corner card** posts → each side submits its own corner, last submission resolves → both wave cards posted → result card. See the ⚠ note in §6.

### Boxing card layout

Both attacker (Decker) and defender (IC/Agent) shown side-by-side. Each corner is editable **only by that side** (the GM sees both) and has:
- **Skill** dice (pre-filled from skill rating; if no Cybercombat skill, the **interactive Default dialog** opens first — see §9 — and pre-fills the chosen pool)
- **Pool** (hacking pool, 0 to available; 0 for IC/Agent side; **0** when defaulting to an attribute)
- **TN** (pre-filled 4, + MCM penalty for decker, + the chosen default TN modifier)
- **Damage** code (editable text)

Firewall and soak pool shown read-only in each corner for reference.

### TN is always 4

**In:** Decker cybercombat skill 5, TN pre-filled **4** → **Out:** boxing card shows 4 in TN field.

### Decker damage code

| Condition | Damage code |
|---|---|
| Has Attack/Offensive category program | `${currentRating or rating}S` |
| No such program (fallback) | `${deck.MPCP}L` |

**In:** Attack utility Rating 5 → damage `5S` pre-filled. No attack utility, MPCP 8 → damage `8L`.

### MCM penalty pre-applied to decker TN

| MCM boxes | TN penalty |
|---|---|
| 0–2 | 0 |
| 3–5 | +1 |
| 6–7 | +2 |
| 8+ | +3 |

**In:** 6 deck damage boxes → decker corner TN pre-filled **6** (4+2).

### Tri-state outcome (result card after the exchange resolves)

**Attacker (decker) more hits:**
- Net hits staged into decker's damage code
- **Out:** IC/Agent gets **💻 IC Name: Resist Matrix Damage (Rating N)** button
- Soak TN = `max(2, Power − IC Firewall)` where IC Firewall = host's Security Threshold

**Defender (IC/Agent) more hits:**
- Net hits staged into defender's damage code
- **Out:** Decker gets **🛡 Decker Name: Resist Matrix Damage (MPCP N)** button
- Soak TN = `max(2, Power − Decker Firewall)` where Decker Firewall = own deck's Firewall attribute

**Tie:**
- **Out:** "Tie! X vs X — no damage dealt."

### Net hit staging

| damage code | Net hits | Staged result |
|---|---|---|
| 6S | 0 net | 6S (unchanged) |
| 6S | 2 net | 6D |
| 6L | 4 net | 6S |

### Soak pool — IC soaks with IC Rating (not System Rating)

**In:** IC Rating 5, soak TN 4 (Power 6, host threshold 2) → **Out:** soak card pre-filled pool **5**, TN **4**.

### Soak pool — Decker soaks with MPCP

**In:** Decker MPCP 8, soak TN 3 (Power 5, Firewall 2) → **Out:** soak card pre-filled pool **8**, TN **3**.

### Hacking pool

Decker allocates hacking pool dice in their own corner's Pool field. Spent when the exchange resolves.

**In:** Hacking pool 4, enter 2 in Pool field → pool reads **2** after roll.

---

## 20. Matrix Combat — IC/Agent attacks Decker

**Prerequisites:** IC must be deployed from the host sheet (sets `deployed: true` and `activeHostId`). Agent must be added to the host's Active Agents (sets `activeHostId`). Decker must be connected to the same host. Target list = all actors sharing the same `activeHostId`.

Flow: IC/Agent Attack button → **target dialog** (host-based list) → **two-corner card** posts → each side submits its own corner, last submission resolves → result card. See the ⚠ note in §6.

### Boxing card — IC/Agent side

- Skill = IC/Agent `rating` dice, TN 4
- Hacking Pool = 0 (IC/agents don't have hacking pool)
- Damage = IC's `system.damage` field or `${rating}S` fallback

### IC damage code

| IC has `system.damage` set | Damage used |
|---|---|
| Yes (e.g. `6M`) | `6M` |
| No | `${icRating}S` (e.g. Rating 5 → `5S`) |

### Agent attack flow (auto-selects best program)

Agent's Attack button → target dialog → boxing card. Agent's attack program is **auto-selected** as the highest-rating Attack/Offensive program from the operator's deck. Damage code pre-filled in the boxing card and editable by GM.

**In:** Agent with operator whose deck has "Attack" (Rating 4) → boxing card damage pre-filled `4S`. GM can edit before rolling.

### IC deployment flow

Host sheet → Security Sheaf tab → Trigger Step → **⚔ Deploy** button (or Stocked IC → **⚔ Deploy to Encounter**) → IC added to combat + `deployed: true` + `activeHostId` set → IC now appears in matrix target lists.

IC sheet shows **⚔ Deployed** badge and host name. **✕ Clear** button resets deployment for reuse.

**In:** Agent with no Attack programs on operator's deck → dialog skipped, damage falls back to `${agentRating}L`.

**In:** Agent with no operator linked → damage falls back to `${agentRating}L`.

### Boxing card — Decker side (defender)

- Skill = decker's Cybercombat (or the interactive Default dialog — see §9 — when no skill)
- Hacking Pool = available hacking pool (0 to max; **0** when defaulting to an attribute)
- TN = 4 + MCM penalty + chosen default TN modifier
- Damage = decker's own attack program or MPCP-L (for counter-attack)

### Firewall reference

| Side | Firewall source (soak TN reduction) |
|---|---|
| IC | Host's Security Threshold |
| Agent | Operator's cyberdeck Firewall attribute |
| Decker | Own cyberdeck Firewall attribute |

### Tri-state outcome (same result card as §19)

- Attacker (IC/Agent) more hits → decker soaks with MPCP
- Defender (decker) more hits → IC/agent soaks (IC: System Rating; agent: Rating)
- Tie → no damage

---

## 21. Matrix Combat — Program Degradation (Agents)

### Setup

- Operator actor with cyberdeck equipped
- Deck has an Attack program with `degradable: true`, `rating: 3`, `currentRating: 0` (initial — means "use base rating")
- Agent actor with `operatorActorId` set to operator

### Effective rating rule

| `currentRating` | Effective rating used |
|---|---|
| 0 (never degraded) | `rating` (base) |
| > 0 | `currentRating` |

### On each use — decrement

After agent attack roll resolves (regardless of hit count):
- If program is Degradable, `currentRating` decrements by 1
- Amber chat card: **💻 Program Degraded — [Name]: Rating 3 → 2 (on [Operator]'s deck)**
- Both decker and agents using the same deck now see effective rating **2**

**In:** Attack (Degradable, Rating 3, currentRating 0) used → **Out:** currentRating set to **2**, degradation card posted.

### Use sequence

| Use # | currentRating before | Effective rating | currentRating after |
|---|---|---|---|
| 1st | 0 | 3 | 2 |
| 2nd | 2 | 2 | 1 |
| 3rd | 1 | 1 | crash |

### Crash at Rating 1

When effective rating = 1 and the program is used:
- Program item **deleted** from operator's items
- Red chat card: **💻 Program Crash — [Name]: Rating 1 degraded to 0, removed from [Operator]'s deck**
- Program no longer appears in Attack Utility dialog for any agent

**In:** Attack (Degradable, currentRating 1) used → **Out:** item deleted, crash card posted, agent attack falls back to `${agentRating}L` on next attack.

---

## 22. Matrix — Firewall as Armor (Summary)

| Actor type | Firewall source | Soak pool |
|---|---|---|
| Decker (character/NPC) | Own cyberdeck `firewall.base` | MPCP (`mpcp.base`) |
| IC | Host's `securityTierThreshold` (IC lives on a host) | IC `systemRating` |
| Agent | Operator's cyberdeck `firewall.base` (agent lives on a deck) | Agent `rating` |

Soak TN = `max(2, stagedPower − Firewall)`.

**In:** Staged power 8, Firewall 3 → TN **5**. Staged power 4, Firewall 6 → TN **2** (min).

---

## 23. Matrix — Hacking Action (3-step threshold check)

Flow: Hacking Action button → host / TN / threshold / pool dialog → roll → threshold check.

**Defaulting:** with no Hacking/Computer skill the **interactive Default dialog** (see §9) opens
before the action dialog; the chosen pool / TN modifier / pool-allowed are then baked into the
dialog. Applies to the Hacking Action, node-prompt, and program-roll dialogs alike.

### Security Tiers

| Tier | Threshold | Description |
|---|---|---|
| Ivory | 0 | No security |
| Blue | 1 | Low security |
| Green | 2 | Standard |
| Orange | 3 | Challenging |
| Red | 4 | Threatening |
| Black | 5 | Dangerous |
| Ultraviolet | 6 | Deadly |

### Threshold check

- successes ≥ Security Threshold → action proceeds (chat card shows success)
- successes < Security Threshold → action fails + Overwatch +1

**In:** Hacking 5, TN 6, threshold 2. Roll 3 successes → threshold met, action proceeds. Roll 1 success → fail, Overwatch increments.

### Overwatch track

Each failed threshold check increments the host's `system.overwatchCurrent`.

**In:** Overwatch at 3, fail → reads **4**. At 9, fail → reads **10** and Convergence triggers.

### Convergence

Overwatch 10 → red **⚠ CONVERGENCE** card posts:
- Dumpshock attack on decker: Power = host System Rating
- Damage type: Stun (VR-Cold) or Physical (VR-Hot)
- Soak card posted with Body dice

**In:** Host System Rating 8, decker in VR-Hot → Convergence posts `8M Physical`, Body soak card.

---

## 24. Matrix — Dumpshock

Manual trigger via dumpshock button (or auto from Convergence).

| Decker mode | Damage type |
|---|---|
| VR-Cold | Stun |
| VR-Hot | Physical |

Power = host System Rating (selected in dialog or set automatically from Convergence).

**In:** System Rating 6, VR-Cold → `6M Stun` soak card. VR-Hot → `6M Physical` soak card.

Soak: Body dice vs TN = Power (no armor reduction for dumpshock).

---

## 25. Vehicles

### Damage track
All vehicles have a fixed **10-box** damage track regardless of Body. DESTROYED badge appears when all 10 are filled.

**In:** Vehicle with Body 2 → track still shows **10 boxes**.

### Vehicle initiative
Confirm the correct formula fires based on `vcrMode` / `controlledBy` fields on the vehicle actor.

| Mode | Expected formula |
|---|---|
| VCR (jumped-in) | Rigger REA + VCR level, (1+VCR)d6 |
| RCD (remote) | Rigger REA, 1d6 |
| Auto (no pilot) | Pilot rating, 2d6 |

### Mode sync — actor sheet and vehicle sheet must agree
Mode is stored on the vehicle actor (`system.vcrMode`, `system.controlledBy`). Both sheets read from and write to the same data.

- Set VCR on the actor sheet vehicle tab → open vehicle sheet → VCR button is highlighted.
- Set RCD on the vehicle sheet → switch back to actor sheet → RCD button is highlighted.
- Activating VCR on one vehicle in a multi-vehicle list → all other vehicles switch to RCD automatically.
- Entering VR-Cold or VR-Hot on the actor → any vehicle in VCR mode drops to RCD automatically.

### Link Existing
`+ Link Existing` dialog only shows in-world vehicle actors. Compendium-imported templates (isTemplate flag) must **not** appear.

### Create & Link
`+ Create & Link` dialog has a **Source** dropdown:
- First option "-- Create blank --" → shows name input → creates a new blank vehicle actor.
- Subsequent options are compendium entries (sr3e-vehicles, sr3e-drones, etc.) grouped by pack → creates a world actor from that entry with isTemplate cleared.

In both cases the new actor is linked to the rigger and opens its sheet.

### Vehicle soak TN
Formula: `Damage Power` (no armor reduction for vehicles).

**In:** Power 9 → soak TN **9**.

### Assign Damage (vehicle)
**🩸 Assign \<Level\> Wound to [VehicleName]** → updates `system.damage.value`. Capped at **10**.

### Vehicle targeting TN
Formula: `max(2, Signature − Sensor rating)` (or − VCR level if jumped in).

**In:** Target Sig 4, Sensor 2 → TN **2**. Sig 4, Sensor 6 → TN **2** (min).

### Chase — quarry & auto-distance
Open **🚗 Chase Scene** (Rollable Tables tab). Add 2+ participants with vehicles + speeds.
- Tick **Quarry** on one → its Distance box fades/locks (distance 0) and the checkbox clears on any
  other vehicle (exactly one quarry).
- Set quarry Speed 250 km/h, a pursuer Speed 275 km/h, pursuer Distance 350 → **Next Turn** →
  pursuer closes by the speed difference; chat card reports e.g. "… → Xm behind (closing)".
- Quarry faster than a pursuer → that pursuer's distance grows (opening); distance passing 0 → flips
  to "Xm ahead". No quarry set → card notes distances weren't auto-updated.

| Check | Expected |
|---|---|
| Tick Quarry on B while A is quarry | A unticks; only B is quarry |
| Quarry box | faded/disabled, distance 0 |
| Pursuer faster, Next Turn | distance decreases (closing), reported on card |
| Quarry faster, Next Turn | distance increases (opening) |
| Sign convention | + = behind, − = ahead |

---

## 26. Pool Refresh

### Combat pool
End combat → GM prompted "Refresh all combat pools?" → Yes clears `combatPoolSpent` on all combatants.

Mid-combat: manually via actor sheet Reset Pools button.

### Pool spending during combat
- Dodge: chosen dice deducted immediately from available combat pool.
- Attack: chosen dice deducted.
- Available = Derived pool − spent. Should never go below 0.

**Test:** Combat pool 5, spend 3 on attack → available reads **2**. Try spending 4 more → capped at **2** actually spent.

---

## 27. Damage Overflow

Physical track full (10 boxes) → additional physical damage goes to overflow. Overflow track visible on character sheet. - Passed

Stun track full → overflow goes to physical track. - Passed

When overflow matches or exceeds body attribute show 'dead' - Passed
---

## Foundry integrations (tokens / statuses / enrichers)

### Token wound bars
Newly-created character/npc tokens show Physical (bar1) and Stun (bar2) as bars that **fill as damage rises**, visible to owners on hover.
- **In:** create a new character, drop a token → hover shows two bars. Tick 3 physical boxes → physical bar ~30% filled. (Existing pre-update actors need their prototype token bars set manually.)

### Status icons
- **Auto-synced:** toggling Astral Projection / Dual-Natured (magic tab), VR-Cold/Hot (matrix tab), or Full Defense sets the matching token status icon automatically; clearing removes it. **In:** set Astral → token shows the aura icon; switch to Physical → icon gone.
- **Manual:** the token HUD status palette includes Sustaining a Spell, Full Defense, Dumpshocked (GM toggles).

### Auto-defeated
- **In:** fill a combatant's physical or stun track → in combat, the combatant is marked **defeated** (skull in tracker) and the token gets the unconscious icon. Heal below full → defeated clears.
- **In:** physical full AND overflow ≥ Body → token shows the **dead** overlay.

### Text enrichers (Biography / Notes)
The Bio tab shows Background/Notes as read-only **enriched** text — `@UUID[...]` links and inline `[[/r ...]]` rolls render and are clickable. Click **✎ Edit** to reveal the textarea; saving re-renders back to enriched.
- **In:** put `@UUID[Actor.xxx]{Mr. J}` in Background → displays as a clickable link, not raw text.

---

## GM tools — Rollable Tables tab
Chase Scene, Driving Test, Threat Clocks, Session Rewards, Chunky Salsa, Barrier Damage, Falling Damage and Escape Artist buttons now live on the **Rollable Tables** sidebar tab (not the combat tracker). Chase Scene, Driving Test & Threat Clocks show for all players; the rest are GM-only.
- **In:** open Rollable Tables tab → buttons appear below the header. **Driving Test** → prompts for vehicle + driver, then the usual driving-test dialog. Same dialog opens from each vehicle sheet's Driving Test button.

### Threat Clocks
- **In:** GM clicks **🕐 Threat Clocks** → **+ Add Clock** → a new 6-segment clock appears (default
  color cycles through a small palette). Click wedge 3 → fills to 3/6; click **+** → 4/6; click **−**
  → 3/6. Edit the name field, change Segments to 8 (box re-renders an 8-wedge dial, fill clamps to
  the new max), pick a color, tick **Visible to players**.
- **In:** a player opens the same **🕐 Threat Clocks** button → sees only the one clock marked
  visible, read-only (no wedge clicks, no +/− steppers), showing "4 / 8". A second hidden clock the
  GM also created does not appear in the player's view at all.
- **In:** with two clients open (GM + player), GM clicks a wedge → the player's already-open Threat
  Clocks window updates immediately without needing to reopen it (world-setting sync via the
  `updateSetting` hook).
- **In:** GM clicks 🗑 on a clock → it's removed from both the GM and player views on next render.

### Driving Test pool & TN (SR3 p.134)
Base **TN = Handling**; TN modifiers via dropdowns (unfamiliar +1, stress, size +2/+3, weather +2/+4, terrain −1/0/+1/+3, combat +2, datajack −1, **VCR −2×rating**). The dice **pool** auto-composes (and is editable):
- **Vehicle Skill + Autonav** out of combat.
- **Action During Combat** selected → Autonav drops (pool = Skill), TN +2.
- Driver with a VCR, **Using VCR** selected → Autonav dropped, **Control Pool = Vehicle Skill** added, TN −2×VCR.

**In:** Skill 4 / Autonav 2, no VCR, not combat → pool **6**, TN = Handling. Tick combat → pool **4**, TN +2. VCR 1 driver picks Using VCR → pool = **4 + 4 (skill)**, Autonav gone, TN −2.
- **In:** driver with **no matching vehicle skill** → the **interactive Default dialog** opens (§9, linked attribute = Reaction); the chosen pool/TN-mod flow through (Attribute = +4 TN; Skill/Spec = ½ rating, +2/+3 TN).

> Note: the §28/§29 references to "combat tracker sidebar" below are historical — these buttons moved to the Rollable Tables tab.

## 28. Escape Artist

Triggered via the **🔓 Escape Artist** button (Rollable Tables tab, GM only).

### Pool

| Situation | Pool |
|---|---|
| Athletics skill, no spec | Athletics rating |
| Athletics + Escape Artist spec | Athletics rating + 2 |
| No Athletics (defaulting) | interactive Default dialog — see §9 (linked attribute = Body) |

### Restraint TN table

| Restraint | TN |
|---|---|
| Ropes | 4 |
| Handcuffs | 6 |
| Straitjacket | 8 |
| Containment Manacles | 10 |

TN modifier field in dialog: positive values reduce TN (e.g. Pain Resistance levels). Effective TN is clamped to minimum 2.

### Success

**In:** Athletics 5 (Escape Artist spec), Handcuffs (TN 6), no modifier → **7 dice vs TN 6**.

1 success → escaped in **30 min** (5 × 6 ÷ 1). 3 successes → **10 min** (30 ÷ 3, rounded up).

### Failure

0 successes → chat card reads "Cannot try again for **30 minutes**" (5 × 6).

### Defaulting

**In:** No Athletics → preview shows "defaulting — choose at roll". On 🎲, the Default dialog
opens (linked attribute = Body). Choose Attribute → Body 4 → pool **4**, Ropes effective TN
**8** (4 + 4). Choosing Skill/Spec uses ½ rating, +2/+3 TN.

### Pain Resistance modifier

**In:** Handcuffs TN 6, adept with 3 levels Pain Resistance → TN modifier +3 → effective TN **3**.

---

## 29. Falling Damage


Triggered via the **🪂 Falling Damage** button (Rollable Tables tab, GM only).

### Damage calculation

| Distance | Power (dist÷2) | Level |
|---|---|---|
| 1–2 m | 1 | L |
| 3–6 m | 2–3 | M |
| 7–20 m | 4–10 | S |
| 21+ m | 11+ | D |

Impact armour reduces Power by `⌊Impact÷2⌋` before the Athletics test.

**In:** 10 m fall, Impact armour 4 → Power `5 − 2 = 3`, Level S → base damage code **3S**.

### Athletics test

Pool = Athletics rating; if no Athletics skill, the **interactive Default dialog** opens (see §9).
TN = distance in metres (+ chosen default TN modifier). Each success reduces Power by 1.

**In:** Athletics 4, distance 10 → 4 dice vs TN 10.

**In:** No Athletics → Default dialog → Attribute Body 4 → pool **4** vs TN **14** (10 + 4).

### Athletics negates all damage

**In:** Power 2 after armour, Athletics roll 3 successes → Power reduced to 0 → chat card reads "Athletics negates all damage", no soak card posted.

### Soak card

After the Athletics roll, a standard Resist Damage soak card posts for the faller using Impact armour (not Ballistic).

**In:** Final power 3S → soak card shows TN = `max(2, 3 − Impact)`, Body dice editable.

### No armour → armour reduction 0

**In:** 6 m fall, no armour → Power 3, no reduction → base 3M → soak card posts for 3M.

---

## 30. Matrix — Node Tracking (Character / NPC Sheet)

The Matrix tab shows a node-tracking section when the actor is connected to a host (`activeHostId` is set).

### Current node selector

A dropdown lists all nodes on the active host. Selecting one stores `system.currentMatrixNode`.

**In:** Decker connected to a host with nodes SAN, SPU, DS → dropdown shows those three → select DS → `currentMatrixNode` saved.

### Mark chips

Each mark is stored as a node ID. Chips display the node's abbreviation in green.

- **+ Mark** button → dialog lists all host nodes → select one → chip appears.
- **✕** on a chip → removes that mark.

**In:** Decker has no marks → add mark on SPU → green "SPU" chip appears.
**In:** Remove that chip → chip disappears, `matrixMarks` array is empty.

### Auto-mark on Access Node success

When a Hacking Action roll succeeds AND the prompt has `grantsAccess: true` (the Access Node prompt), a mark is automatically added for the current node.

**In:** Decker in SPU, clicks "Access Node" Use button, rolls enough hits to meet Security Threshold → green "✓ Mark Granted — SPU" card posts + SPU chip appears on sheet.

### Requires-mark prompt

If a node prompt has `requiresMark: true` and the decker has no mark on that node, a confirmation dialog appears before the roll.

**In:** Decker in DS with no mark, clicks "Duplicate / Download" Use button → dialog asks "This action requires a mark on this node. Proceed anyway?" → Cancel aborts roll, OK proceeds.

### Link Lock

Checkbox stored as `system.linkLocked`. No automated effect yet — GM reference flag.

---

## 31. Matrix — Node Prompts (Use Buttons)

Each node on a host has a `prompts[]` array. When a decker is in that node, the prompts list is shown on the Matrix tab.

### Prompt badges

- **OW↑** badge (amber) = `overwatchOnFail: true` — a failed threshold check increments Overwatch.
- **+mark** badge (green) = `grantsAccess: true` — a successful Access Node roll auto-marks the node.

### Use button — Hacking prompt (`overwatchOnFail: true`)

Fires `rollPool` with `isHackingActionRoll: true`. Standard hacking flow: threshold check, overwatch on fail, auto-mark if `grantsAccess`.

**In:** Decker clicks Use on "Duplicate / Download" (DS node, `overwatchOnFail: true`) → dialog to set TN and hacking pool dice → Hacking skill + pool dice rolled vs TN → threshold checked against host Security Threshold.

### Use button — Computer prompt (`overwatchOnFail: false`)

Fires plain `rollPool` with no hacking context. No threshold check, no overwatch.

**In:** Decker clicks Use on "Host Services" (SAN node, `overwatchOnFail: false`) → dialog → Computer skill + pool dice rolled → success count shown, no security check.

### Dim prompt (requires mark, no mark held)

Prompts with `requiresMark: true` are dimmed (opacity 0.55) when the decker holds no mark on the current node. Still clickable but shows confirmation dialog first.

**In:** Decker in DS, no mark, "Access Datafile" prompt (requiresMark) → appears dim → clicking shows confirmation before roll fires.

---

## 32. Matrix — Security Sheaf Automation

When a hacking action fails the Security Threshold check, Overwatch increments. If the host has a Trigger Step whose `step` number matches the new Overwatch count, a **GM-only** whisper card appears.

### Sheaf prompt card

Card shows:
- Step description (if set)
- IC assigned to that step (names)
- Three buttons: **📢 Public**, **🔇 Silent**, **✗ No**

**In:** Decker fails hack on a Green (threshold 2) host. Overwatch was 6, now 7. Trigger Step 7 has description "Killer deployed" with Killer IC assigned → whisper card appears for GM only. Players see only the amber "⚠ Overwatch: 7/10" card.

### Public activation

Clicks **📢 Public**:
1. A visible chat card posts to all players: step number, description, IC names.
2. Each regular IC in the step is deployed to the active encounter (`game.combat`) and its `system.deployed` and `system.activeHostId` are set. `system.currentMatrixNode` is set from the IC's stocked entry `nodeId`.
3. Any Alert IC (actor `icType` starts with "alert") sets `system.alertCount` on the host instead of joining the encounter. Alert (Passive) → alertCount 1; Alert (Active) → alertCount 2.
4. The trigger step's `triggered` checkbox is checked.
5. All three buttons disable (one-shot guard).

**In:** Step 7 has Killer IC + Alert (Active) → click Public → Killer appears in encounter, host alertCount set to 2, step 7 checked triggered, public chat posted.

### Silent activation

Clicks **🔇 Silent**:
- Same deploy logic as Public (IC deployed, alert set, step triggered).
- **No** public chat card. A GM-only whisper confirmation posts instead.

**In:** Step 7 → click Silent → Killer deployed, alertCount 2, step triggered, GM sees "🔇 Sheaf level 7 activated silently." Players see nothing additional.

### No activation

Clicks **✗ No**:
- Nothing happens beyond the already-posted Overwatch increment card.
- All three buttons disable.

### Already-triggered step

If the matching trigger step is already `triggered: true`, no whisper card is posted.

**In:** Step 7 triggered in a previous turn → Overwatch reaches 7 again (impossible in normal play, but resetting overwatch manually) → no sheaf prompt appears.

### Alert IC in Active Presence tab

Alert IC that are "deployed" via the sheaf (or Deploy button) appear in the host sheet's **Active Presence → Active Agents / IC** section with "⚔ Deployed" badge, same as regular IC.

---

## 33. Host Sheet — Stocked IC Improvements

### Node assignment dropdown

Each stocked IC row has a node dropdown (pulls from host's `nodes[]`). Selecting a node stores `nodeId` on the stocked IC entry.

**In:** Stocked IC list has Killer → select "CPU" from its dropdown → on next deploy, Killer's `system.currentMatrixNode` is set to the CPU node ID.

### Deployed indicator

Each row shows `⚔` (gold) when the IC actor has `system.deployed: true`, `·` (dim) otherwise. Updates when the host sheet re-renders.

**In:** Deploy Killer from the sheaf prompt → host sheet re-renders → Killer row shows gold ⚔.

### Deploy to Encounter applies node

When IC is deployed (via sheaf prompt or ⚔ Deploy button), if its stocked entry has a `nodeId` set, `system.currentMatrixNode` is set on the IC actor automatically.

**In:** Killer stocked with node = CPU → deploy → Killer actor `system.currentMatrixNode` = CPU node ID.

### Hide All toggle — Stocked IC

👁 button in the Stocked IC section header. If any IC are visible → hides all. If all hidden → reveals all.

**In:** 4 IC visible → click 👁 → all show blur. Click again → all revealed.

### Hide All toggle — Trigger Steps

Same 👁 button in the Trigger Steps section header, same toggle logic.

**In:** 10 steps, 3 triggered (visible) → click 👁 → all blurred. Click again → all revealed.

---

## 34. Host Sheet — Operational Changes

### GM-only visibility

Non-GM users who attempt to open a host sheet see: *"Host sheets are visible to Game Masters only."* and the sheet does not open.

**In:** Player double-clicks a host actor → warning notification, no sheet appears.

### Overwatch + Alerts inline

The Alerts section has been merged into the Overwatch section header row. Alert label (Passive / Active Alert (+2 TN) / Full Alert (+4 TN)) appears to the right of the OW count, with − and + buttons.

**In:** alertCount 0 → right side shows grey "Passive" badge. alertCount 1 → amber "Active Alert (+2 TN)". alertCount 2 → red "Full Alert (+4 TN)".

Alert description (no alert / active / full text) appears below the OW track, replacing the old static OW description.

### Scroll position preserved

Clicking the 👁 eye toggle (hide/show individual or all) no longer jumps the Security Sheaf tab back to the top. Scroll position is preserved across re-renders.

---

## 35. Electronic Warfare — Flux / Footprint / ECM / ECCM / MIJI

**Adds data-model fields → needs a full Foundry restart, not just F5.** Subsections below cover the
core MIJI loop, the degradation modifiers, the Drone Comprehension Test and the IVIS Test.

### ✅ Step 3 (the MIJI contest) is AUTOMATED — `tests/e2e/miji.spec.mjs`

Two clients plus a GM. Covered there, so do not re-walk it by hand:

- **Both pools derive from their OWN rigger.** Intruder Electronics 5 (Electronic Warfare +2)
  + min(Flux 2, 7) = **9** dice; defender Electronics 3, no specialisation, + min(Flux 1, 3)
  = **4**. Deliberately different, so a card built from one rigger twice fails.
- **The TNs cross over** — intruder TN = *defender's* deck rating; Jamming's defender TN =
  *intruder vehicle's* ECM. Swapping them is invisible on screen but reverses the odds.
- **Corner ownership travels through `driverActorId`.** Each rigger's own submit button is
  enabled and the other's disabled, on both clients, with the far corner's inputs read-only.
- **An unmanned drone's corner is GM-only** (fail-closed), and the GM can complete the
  exchange on its behalf.
- **The result card credits the riggers**, who actually rolled — not the vehicle names.

`tests/ew-skill.test.mjs` pins the skill-selection rule underneath it: `Electronics B/R` and
`Electronic Intelligence` also contain "electronic", so which skill supplies the dice must not
depend on the order the sheet was built in, and the Electronic Warfare specialisation bonus
must be counted. Both were wrong until 2026-08-13.

⚠ Still needs a human: whether the card is legible, whether a locked corner *looks* locked,
and every other subsection below.

Two riggers, each with an Electronics skill specialised in *Electronic Warfare*, each linked as the driver of a vehicle.
On each rigger's **Matrix tab → Rigger — Electronic Warfare**: set Deck, Flux, Protocol Module.
On each vehicle's **Electronic Warfare tab**: set ECM, ECCM, Flux.

1. **Footprint** — Intruder deck Flux 8, vehicle Flux 6, ECM 0 → derived Footprint shows
   `⌊(8+6+0)/10⌉ = 1`. Click **↻ Recalc** → the Footprint field becomes 1. The Sig note reads
   `TN = Sig − 1`.
2. **Signal Monitor** — each channel starts **locked** (boxes + ±1 faded). Click **Infil** on
   Command → it highlights and the controls unlock. **+1** raises degradation a box (tier shows
   +1 Light → +2 Moderate at 4 → +3 Serious at 7 → Channel Lost at 10); **−1** lowers it; clicking
   a box still sets it directly. Click **Infil** again → controls re-lock but the value is kept.
   Reload the page → values + breach state persist. (Infil stays in sync with the Infiltration
   panel's breached/clear tags.)
3. **MIJI contest** — on the **defender** vehicle's EW tab click **⚡ MIJI Attack** → pick the
   intruder vehicle, **Jamming**, channel **Command**. Card shows intruder dice = EW skill +
   `min(Flux,skill)` complementary, TN = defender deck rating; defender TN = **intruder ECM**
   (switch operation to Intrusion → defender TN flips to **intruder Protocol Module** and the
   channel list narrows to System). Click **⚡ Roll MIJI Test** → both sides roll; if the intruder
   nets >0, an **Apply N degradation** button fills the chosen channel (re-click is blocked); a
   defender win posts "channel holds".
4. **Infiltration** — **📡 Attempt Infiltration** → pick intruder → rolls EW vs `6 − (Protocol −
   Deck)`; the allocation dialog lets you freely split successes **three ways** — channels (1 each),
   **time reduction** (10 ÷ spent) and **Intrusion Factor**, each its own input with a live
   spent/remaining counter. E.g. 6 successes: System (1) + 2 on time + 3 on Factor → infiltrate in
   `⌈10/2⌉ = 5` turns, Intrusion Factor 3, 0 unspent. Vehicle
   `infiltration` shows the intruder, breached channels, Factor, and the reduced turn count.
   Advancing a **combat round** decrements Turns left (GM client); the **−1** button does so
   manually. **🔍 Detect Infiltration** rolls defender EW vs Intrusion Factor.
5. **ECCM repair** — with Command at 6 boxes, click **🛡 ECCM: Command** → rolls ECCM + EW comp vs
   (attacker ECM/Protocol + 3); each success removes a box; chat shows the new total.
6. **Reduce Footprint** — **📉 Reduce Footprint** rolls EW vs (Footprint + 4); each success lowers
   vehicle Flux by 1 and recomputes Footprint.

| Check | Expected |
|---|---|
| Footprint, deckFlux 8 + vehFlux 6 + ECM 0 | 1 |
| Channel before Infil | boxes + ±1 faded/locked |
| Channel after Infil | controls unlock; MIJI also auto-sets Infil |
| Signal box 8 filled (infiltrated) | +3 Serious |
| Signal box 10 filled | Channel Lost |
| Jamming defender TN | intruder ECM |
| Intrusion / Meaconing / Interference defender TN | intruder Protocol Module |
| Intruder TN (all ops) | defender deck rating |
| MIJI net successes (intruder wins) | degradation boxes added to channel |
| Infiltration TN | 6 − (Protocol − Deck), min 2 |
| Infiltration time, 2 successes on time | ⌈10/2⌉ = 5 turns |
| Infiltration time, 5 / 10 on time | 2 turns / 1 turn |
| Complementary dice | min(Flux, skill rating) |

### Degradation effects (modifiers from filled channels)

7. **Simsense = wound-equivalent (auto).** Link a rigger as a vehicle's driver, set the vehicle
   `controlMode` to **VCR** (jumped in). Fill the vehicle's **Simsense** channel to 5 boxes
   (Moderate, +2). Now roll any skill/attribute test on that rigger → the TN is **+2** (shown in the
   roll card's modifier line, same place as wounds). Roll the rigger's (or the vehicle's) Initiative
   → base is **−2** with a "Simsense jam (2)" note. Heal Simsense to 0 → penalties vanish.
8. **Gunnery shot type.** With the vehicle's **System** channel at 7 (Serious, +3), fire a vehicle
   weapon → the dialog shows a **Shot type** select; choosing **Indirect fire (System +3)** raises
   the TN by 3 (editable); **Manual gunnery** uses the Simsense tier; **Direct** adds nothing.
9. **Channel lost.** Fill Simsense to 10 → the degradation card flags **Channel Lost** and posts a
   **Dumpshock** pointer naming the jacked rigger.
10. **Readout.** The vehicle EW tab shows an **Active Degradation Modifiers** panel listing each
    degraded channel's +N and which tests it hits (Command → Drone Comprehension/IVIS; System →
    Indirect-fire/Smartlink-cancel), with "(auto-applied)" on Simsense when a VCR rigger is jacked.

| Check | Expected |
|---|---|
| VCR rigger, Simsense 5 (Mod) → any roll | TN +2 (like wounds) |
| VCR rigger, Simsense 5 → initiative | base −2 ("Simsense jam") |
| Vehicle weapon, System 7, Indirect fire | TN +3 (editable) |
| Simsense 10 reached | Channel Lost + Dumpshock pointer |
| Simsense healed to 0 | no penalty on rolls/init |

### Drone Comprehension Test (SR3 p.157)

11. Open a vehicle → Stats tab → **📡 Drone Comprehension** (also via the vehicle token's
    satellite-dish **Vehicle Tools** HUD button → pick the tool; the same menu also offers Driving
    Test). Dialog pre-fills **Pilot dice** = Pilot Rating, **Base TN** 4, and
    **Command degradation** from the vehicle's Command channel. Tick **secondary drone (+2)** and
    watch Final TN update live. **Roll** → interactive Pilot-vs-TN card with the "0 = no
    comprehension · 1 = literal · 2+ = leeway" footer. Everything in the dialog is editable.

| Check | Expected |
|---|---|
| Default pool / TN | Pilot Rating / 4 |
| Secondary-drone tick | +2 to Final TN |
| Command channel at 5 boxes | degradation pre-fills +2 |

### IVIS Test (BattleTac, R3 p.96)

12. On a **rigger** with a Small Unit Tactics (or Vehicle Tactics) skill: Matrix tab → EW block →
    **📶 IVIS Test** (also a tower-broadcast button on that character's token HUD). Setup dialog
    pre-fills Small Unit Tactics dice + **TN 5** (+ editable System-degradation). **Roll** → on
    success, the split dialog allocates hits between **Comprehension bonus dice** and **IVIS Pool**
    (live spent/remaining). Confirm → the EW block shows **IVIS Pool value / max**; **−1** spends,
    **Clear** expires it. Advance a **combat round** → the pool refreshes to max.

| Check | Expected |
|---|---|
| IVIS dice / TN default | Small Unit Tactics rating / 5 |
| 4 successes → 1 comp + 3 pool | EW block shows IVIS Pool 3 / 3 |
| −1 button | pool 3 → 2 |
| New combat round | pool refreshes 2 → 3 (max) |
| Clear | pool 0 / 0 |
| Token HUD broadcast button | only on chars with Small Unit/Vehicle Tactics |

---

## 36. Wards (astral barriers, SR3 Core p.174 / MitS p.88-89)

### Casting
On an Awakened actor's Magic tab → **🛡 Cast Ward**: set Force, Ward Type, Area Radius (m), and an
optional **Permanent** checkbox. Confirm rolls **Magic Attribute dice vs TN = Force** (Rule of Six).

- **In:** Magic 6, default Force 6 → **6 dice vs TN 6**. 3 successes (not Permanent) → card reads
  "ward holds for **3 weeks**" and shows **🛡 Place Ward on Canvas**. 0 successes → "Ward fails to
  form — no successes." either way a **⚡ Resist Ward Drain** button appears.
- **In:** click **⚡ Resist Ward Drain** → drain card shows **TN = Force** (6 in the example above,
  *not* halved), level **L**, track **Stun** — confirm this stays Stun even if Force > Magic (RAW:
  ward drain is never physical, unlike spell drain).
- **In:** click **🛡 Place Ward on Canvas** → cursor shows the aiming circle at the chosen radius;
  left-click drops it → a new **ward** Actor + Token appears at that point, and a silvery-grey
  boundary Region is drawn around it. Open the new actor's sheet — confirm Force/maxForce match
  what was cast, Creator shows the caster's name, and the box track has **Force** boxes (0 filled).

### Attacking (breaking)
Ward sheet → **⚔ Attack This Ward**: pick an attacker + mode (unarmed astral / weapon focus /
offensive sorcery / spirit).

- **In:** declaring the attack immediately posts a whisper card "⚠ \<ward\> attacked!" to the **GM
  and the ward's creator** — confirm this appears *before* any dice are rolled, and that a player
  with no ownership of the creator's actor does **not** see it.
- **In:** Unarmed mode on an attacker with Magic 5 → damage code defaults to **5M Stun**, editable.
  Attacker rolls Sorcery (+2 if Astral Combat spec) vs **TN = ward's current Force**. 4 successes →
  staged to **5D Stun** (2 successes per stage). A **🛡 \<ward\> Resists** button appears.
- **In:** click **🛡 Resists** → ward rolls **Force dice vs TN = attacker's Magic**, reducing the
  staged level by 1 per 2 soak successes (same loop as a normal soak). Staged to nothing → "Ward
  holds — attacker bounced back!" (no damage, must win another contest). Otherwise the surviving
  level converts to boxes via the system's standard **L=1 / M=3 / S=6 / D=10** table and an
  **Assign Damage** button appears.
- **In:** assign damage that fills the box track completely → `system.damage === maxForce` →
  `system.force` derives to **0** and a "💀 \<ward\> destroyed" card posts to the GM. The ward is
  **not** auto-deleted — confirm **🧹 Dispel Ward** on its sheet still works (with a confirm prompt)
  and that it also removes the boundary marker.

### Fooling (Masking metamagic)
Ward sheet → **🌫 Fool This Ward**: pick an Initiate (their Grade is shown in the dropdown).

- **In:** Grade 3 attacker vs a Force 5 ward → attacker rolls **6 dice (2×3) vs TN 5**; ward rolls
  **5 dice vs TN 3**. More successes wins; a tie favors the ward. Confirm **no GM/creator whisper is
  posted** for this flow (unlike Attack, above) — Fooling is meant to be quiet.
- **In:** Grade 0 attacker → a warning toast appears ("no Initiate Grade — proceeding anyway") but
  the roll still happens (minimal-guardrails — GM may rule it auto-fails narratively).

### Initiate Grade field
- **In:** Magic tab → Magic Identity block → **Initiate Grade** number input, default **0**, only
  visible on Awakened actors (hidden entirely when Magic attribute is 0).

---

## Quick Sanity Numbers

Use these as fast checks with a fresh character (QUI 4, INT 3, WIL 3, STR 3, BOD 4, REA 4, MAG 0):

| Stat | Expected |
|---|---|
| Combat Pool | 5 |
| Initiative base | 4 (+ 1d6) |
| 3 stun boxes wound mod | −2 (TN +2 on all rolls) |
| Combat pool (unchanged by wounds) | 5 |
| Defaulting (INT 3, Attribute tier) | 3 dice, +4 TN, no pool (via Default dialog) |
| Soak TN (power 9, ballistic 4) | 5 |
| BF on `9M` weapon | `12S` |
| Staging: `6M` + 4 net hits | `6D` |

---

## 37. Visual / Theme refresh (Blade Runner-inspired)

Mostly visual checks — reload Foundry (CSS/JS hot-reload; no `system.json` styling change needed)
and look, rather than roll dice.

- **In:** Foundry sidebar — the **Chat** tab icon is a walkie-talkie, the **Combat** tab icon is a
  gun (not the default speech-bubble/crossed-swords). If either still shows a default Font Awesome
  icon (or, notably, a hearing-aid icon on Combat), the `::before` content codepoint regressed —
  check `#sidebar-tabs .fa-comments`/`.fa-swords` in `styles/sr3e.css`.
- **In:** any sheet header, tab label, or chat-card header renders in the condensed **Teko** font;
  body text/inputs render in **Quantico**. If both still look like the system-default sans-serif,
  the Google Fonts `@import` likely failed (no internet access from the Foundry client is the most
  common cause — confirm by checking the Network tab for a blocked `fonts.googleapis.com` request).
- **In:** sheets/dialogs/chat cards show a near-black/cream base with a blue accent (Blade Runner's
  actual UI palette) — not the navy/cyan scheme from before this refresh, and not the brighter neon
  magenta/teal scheme from partway through this refresh (both superseded).
- **In:** a roll/soak chat card with `styles/textures/sr-card-bg.webp` present shows the texture
  blended under the card content (55%-opacity dark scrim over the image); with no file at that path
  the card just shows its flat background color — no broken-image icon either way.
- **In:** roll dice — success = neon blue, fail = grey, a rolled 1 = red, a pending "6" awaiting an
  explosion reroll = solid neon blue with a **black** number (no `★` glyph on it). The "💥 Roll
  explosions" button is also neon blue, not gold.
- **In:** hovering a dice-roll icon (e.g. an attribute's roll icon) turns it **red**, not green/teal.
- **In:** Rollable Tables GM-tools row buttons and the Actors-directory "Create Actor"/"Create
  Folder" buttons/search box show the blue-accent bordered style, not Foundry's default tan.
- **In:** folder rows in any sidebar directory show as an **outline** in the folder's chosen color
  (not a solid color fill).

---

## 38. Orthodox SR3 Matrix

**Prerequisites:** Switch Configure Settings → System → Matrix Ruleset to **Orthodox SR3** and do a
full Foundry restart (not just F5). The two compendiums ship built (`sr3e-sr3-odm-cyberdecks`,
`sr3e-sr3-odm-programs`, from `tools/build-odm-packs.mjs`) and appear only under this ruleset —
confirm both are listed and populated; there is no macro to run.

### Settings warning

**In:** Configure Settings → System → scroll to Matrix Ruleset → a red bold line reads
*"⚠ Changing Matrix rules midgame could break your game."* should appear beneath the dropdown.

### Cyberdeck picker

**In:** Open a character sheet → Matrix tab → **📦 Browse Cyberdecks** → picker opens showing a
filter box and a grid (Model / MPCP / Act.Mem / I/O / Hard. / Resp+ / Cost). Type "nova" → only
Novatech decks remain. Click **Novatech Slimcase-10** → confirm → actor `system.orthodoxDeck`:
`mpcp: 10`, `activeMemory: 2000`, `storageMemory: 2500`, `ioSpeed: 480`, `hardening: 5`,
`responseIncrease: 2`.

| Field on actor | Expected value |
|---|---|
| MPCP | 10 |
| Active Memory | 2000 |
| I/O Speed | 480 |
| Hardening | 5 |
| Response Increase | 2 |

### Program picker + memory tracking

**In:** Matrix tab → **+ Browse Programs** → picker opens (Program / Category / Mult / Mem@1 / Mem@4
columns). Filter "attack" → only Attack-category programs show. Click **Attack-S** → confirm → a
`program` item "Attack-S" appears in the Loaded Programs list with Category "Attack", Rating 0, Mem
shown as `×4` (size formula: Rating² × 4).

**Edit rating:** click the Rating input for Attack-S, type **3**, press Tab/blur → `system.rating`
updates to 3; size column now shows `36 Mp` (3² × 4). Editing triggers `updateEmbeddedDocuments`,
not the form submit — confirm the sheet re-renders showing the new value.

**Memory bar:** Active Memory = 2000 (from Slimcase-10 above). Add Attack-S (r3, 36 Mp) + Armor (r4,
48 Mp, ×3) + Browse (r5, 25 Mp, ×1) → total 109 Mp — bar shows "109 / 2000 Mp used" in dim text.
Edit Attack-S rating to 20 (400 × 4 = 1600 Mp) → total exceeds 2000 → bar turns **red** and reads
"OVER CAPACITY".

**Duplicate block:** try to add Attack-S a second time → `ui.notifications.warn` fires "Attack-S is
already in your programs — update its rating directly.", no second item created.

**Delete:** item controls on each row; delete Attack-S → it disappears from the list.

### Hacking Pool formula

Formula: `⌊(Intelligence + MPCP) / 3⌋`

| INT | MPCP | Expected HP |
|---|---|---|
| 6 | 10 | 5 |
| 5 | 6 | 3 |
| 4 | 0 | 1 |

**In:** Set MPCP to 6 on an INT 5 character → Matrix tab shows Hacking Pool **3** (shown as
`available / total`). Spend 1 → shows `2 / 3`.

### Matrix Condition Monitor (decker)

**In:** Matrix tab (MPCP > 0) shows a 10-box CM track. Click box 3 → boxes 1–3 fill; TN penalty
readout shows **+1**. Click box 6 → shows **+2**. Click box 8 → shows **+3**. Click the box again
to toggle off (works like the wound track).

**L/M/S/D buttons:** click **M** (3 boxes) on a fresh track → boxes 1–3 fill. Click **S** → boxes
1–6 fill. The **Crashed!** badge appears only when all 10 are filled.

**TN penalty table:**

| CM boxes filled | Penalty |
|---|---|
| 0–2 | 0 |
| 3–5 | +1 |
| 6–7 | +2 |
| 8–9 | +3 |
| 10 | Crashed |

### IC → Decker attack

**Prerequisites:** Orthodox host sheet with Security Code and Security Value set; IC actor (type
`ic`) deployed to the host (activeHostId set); decker connected to same host.

**In:** IC sheet → **⚔ Roll Attack** → target dropdown shows the connected decker. Select them →
two-corner card posts with IC stats on one side (Rating dice, TN 4, damage code) and Decker on the
other (Cybercombat skill dice, editable HP, TN 4 + CM penalty). Each side submits its own corner
and the last submission rolls both. See the ⚠ note in §6.

**If IC wins (more hits):** net hits stage the IC's damage code upwards (every 2 net = +1 level).
Result card shows a **💻 Assign X Matrix CM damage** button. Clicking it → decker's `orthodoxMatrixCM.value`
increases by the box count (L=1 / M=3 / S=6 / D=10), capped at 10. CM track on sheet updates.

**Dumpshock at 10:** when the CM assignment hits 10 boxes, a dumpshock soak card auto-posts for
the decker (Power = host Security Value; Stun if VR-Cold/TRM/AR, Physical if VR-Hot).

**If decker wins (more hits):** result shows the net success count; GM resolves as IC damage (no
automatic IC wound assignment currently — GM adjudicates IC destruction).

**Tie:** "Tie! N vs N — no damage." result, no assign buttons.

### Settings — red warning in Configure Settings

**In:** Go to Configure Settings → System → the Matrix Ruleset dropdown should have a bold red
warning beneath it: *"⚠ Changing Matrix rules midgame could break your game."* — confirm it appears
and is not cut off or hidden by surrounding elements.

---

# Code-review findings — 2026-07-04 (statuses updated 2026-07-07)

Suspected bugs found by static code review. Each entry: what the code does, where, what should
happen, and how to reproduce. Tick each one passed/confirmed and the fix can go in.

## F1. `isLiveActor` infinite recursion (compendium-imported actors) — FIXED 2026-07-07

`scripts/sr3e.js:77-81` — the compendium-source branch called `game.sr3e.isLiveActor(a)`,
but line 83 assigns *this same function* to `game.sr3e.isLiveActor`, so it recursed forever
(RangeError: Maximum call stack size exceeded) for any actor with `_stats.compendiumSource`.
Called from most selection dialogs and the actor sheet header (`appearsInUI`), so sheets of
compendium-imported actors crashed on render.

**Fix applied (user-approved):** the branch now tests the flag —
`a.getFlag('The2ndChumming3e', 'isTemplate') === false` (hidden unless explicitly marked live;
"Mark as Live" sets the flag to explicit `false`).

**Verify:** import an actor from any compendium (e.g. Mr. Johnson's Contacts) → open its sheet →
renders normally. "Mark as Live"/"Mark as Template" toggles show/hide it in targeting dialogs.

## F2. Actor lists wider than they should be — FIXED 2026-09-14 (0.5.2)

Widened in play: *"they also show up on the rewards rollable table and a few other things they
probably shouldn't"* and *"chunky salsa lists everything, not just the actors on the scene."*
Three rules now, one per question a list answers — `tests/actor-lists.test.mjs` pins each site and
**ratchets**: every `game.actors` list in `scripts/` must use one, or be a named internal lookup.

| Rule | Lists |
|---|---|
| **No templates** — `game.sr3e.isLiveActor` (one rule; five sites used a bare `isTemplate` flag, which lets an unflagged compendium import through) | Barrier Damage · both IC pickers (deploying puts the stocked actor itself into combat) · Orthodox host pickers · Driving Test · MIJI vehicles · vehicle link · ward dialogs · matrix targets |
| **The party** — `SR3EQuery.isPlayerCharacter` | **Session Rewards** — it listed every live character, the GM's Chrome Threats and contacts included |
| **The scene** — `sceneFirst` (`scripts/data/actor-scope.mjs`): tokens on the drawn canvas, else the viewed/active scene's token documents, else everyone (theatre of the mind) | **Chunky Salsa** (unless the grenade flow passed its own list) · Barrier Damage · Falling Damage · Escape Artist · contested roll (plus the actor it was opened from; it also offered hosts, IC and vehicles) · healing medic and casters · ward attack / fool · the target pickers (which already worked this way — now the shared rule) |
| **Narrower** | Orthodox IC attack → the deckers on its host (`orthodoxRunState.currentHostId`), else every live character |

⚠ **Rosters stay world-wide on purpose** — pilot/passengers, agent operator, chase, Driving Test,
and the healing *patient* picker (downtime care is off the map).

**Walked by the agent 2026-09-14** (mcp-api): Session Rewards lists only SWAT Team Member and
Troll Street Dealer (was five); `sceneFirst` against *Test Map*'s tokens gives its four and drops
Windage; the empty active scene falls back to everyone.
- [x] **Automated — `tests/e2e/actor-lists.spec.mjs`** (the GM's Playwright client draws the canvas the
  agent's pane cannot): a disposable actor with a token on the active scene is offered by 💥 Chunky
  Salsa, and every live character with no token there is not. Passing 2026-09-14.
- [ ] Falling Damage / Escape Artist / Barrier Damage the same (same `sceneFirst` call; not automated).

## F3. Melee boxing-card TNs omit the wound modifier — FIXED 2026-09-14 (0.5.2)

The Melee Modifiers Table (SR3 p.123) has *"Character is wounded — Damage Modifier (see p. 126)"*;
astral combat *"uses the same rules as Melee Combat"* (p.174). Both boxing cards roll through
`_rollWave`, which never adds `woundMod` — and `SR3ECombatModifiers.js` said `rollPool` did. Each
fighter's own wounds now go into their own TN (`SR3EActor.woundTN`), melee and astral, and the GM
window's note says so. `tests/melee-wounds.test.mjs` + a mutant.
- [x] **Automated — `tests/e2e/melee-wounds.spec.mjs`**: Player2's attacker with 3 Stun boxes (−2)
  attacks Player3's troll; the GM window on the GM's client starts the attacker **+2** over an unhurt
  baseline run, the defender's TN does not move, and the note reads *"… wounded +2"*. Passing 2026-09-14.
- [ ] The same from 🌀 astral combat (same `woundTN`; not automated).

## F4. Melee / cybercombat / contested results ignore explosion waves (TN > 6 only) — FIXED 2026-09-14 (0.5.2)

At TN 7+ (defaulting +4, a called shot +4, a System Rating of 7) the result card was posted off
the FIRST wave, so 💥 changed the dice and never the winner (the Rule of Six, SR3 p.38). Melee,
astral, contested and cybercombat now open a **⏳ card** when either side has dice to explode; its
message flag holds both sides' dice, each side's 💥 payload carries a reference to it, and a side's
final wave reports its dice to the GM (`sr3e.opposed.settle`), who serialises the writes and posts
the real result once both are in. **Not an in-memory map** as first proposed: the two sides usually
explode on different clients, so only a shared record can see both. **⚔ Resolve with the dice as
they stand (GM)** is the AFK escape. Nothing to explode → the result posts at once, as before.
`tests/opposed-explosions.test.mjs` drives it end to end through the registered handler; a mutant.

**Walked by the agent 2026-09-14** (mcp-api, a contested roll at TN 8 through real wave cards and 💥
buttons): the ⏳ card held; the attacker's two 6s exploded to 12/11, the defender's to 10; the result
(2 vs 1) posted once, **below** both wave-1 cards. The first run put it above the deciding wave —
the settle now runs after the wave card is posted.
- [ ] A real melee exchange with a called shot (TN 8) between two players: roll the 💥 on both cards → one result, after the last explosion.

**MIJI and the other silent resolvers — FIXED 2026-09-14 (0.5.2).** The maintainer: *"all explosions
should be interactive, we should wait for dice explosions to finish before queing up other things."*
Every roll that looped `_rollWave` itself now goes through `SR3EActor.rollOpposedPair` (the ⏳ card)
or `SR3EActor.rollThen` (one roll, then its next step on the final wave):

| Was silent | Now |
|---|---|
| MIJI contest · Orthodox System Test · Orthodox IC attack · Orthodox cybercombat · fooling a ward | `rollOpposedPair` — the result waits for both sides |
| MIJI infiltration (allocation dialog) · detect infiltration · ECCM repair · reduce footprint · IVIS (split dialog) | `rollThen` — the dialog / result waits |
| A spirit resisting banishment | its own wave card when it explodes; the outcome posts after |
| Chase Scene Driver Points (an Open Test, p.40) | a 💥 per wave of 6s, for the user who rolled; Driver Points land after the last |

Nothing to explode → exactly as before, no extra cards. `tests/interactive-explosions.test.mjs` (58
assertions, through the real registry and settle handler) + the `next-step-before-the-explosions` mutant.

**Walked by the agent 2026-09-14** (mcp-api): Reduce Footprint at TN 8 through `rollThen` — one wave
card with a 💥, Flux untouched; the click exploded the 6 to 10, then the result card posted below it
(Flux 20 → 19, restored after). A MIJI pair at TN 8 — the ⏳ card and a 💥 card for the intruder only;
the click (6 → 7), then the MIJI result once, below it.
- [ ] Infiltration with a rigger at TN 7+ (Protocol below the target's Deck): the allocation dialog opens only after the last 💥.
- [ ] Chase Scene: roll Driver Points until a 6 comes up → the card offers 💥, the chase shows the points only after the last wave, and another player's copy of the card shows the button disabled.

**Found during the live check — old 💥 buttons re-roll after a reload.** The one-shot guard
(`_usedButtons`) is in memory and resets on reload by design, so after an F5 an old wave card's 💥
can be clicked again and posts a new wave for a roll long since resolved. It cannot change an opposed
result any more (a resolved ⏳ card ignores it), but it does for a plain roll's own card.
**FIXED 2026-09-14 (0.5.2):** a 💥 click is claimed on the message through `sr3e.card.mark` (append-only,
GM-serialised) before it rolls; a claimed 💥 renders *"💥 Explosions rolled"* on every client and after
any reload, and a second click — the owner and the GM at once, say — stops. The Chase Scene's 💥 too,
which checks its window is open before claiming. GM unreachable → it rolls anyway.
`tests/interactive-explosions.test.mjs`.
- [ ] Roll at TN 8 until a 💥 appears → click it → F5 → the old card's 💥 shows *Explosions rolled*, disabled.
- [ ] The actor's owner and the GM click the same 💥 together → one wave posts, not two.

## F5. Drain track (Stun vs Physical) inconsistent between casting and dispelling — FIXED 2026-09-14 (0.5.2)

The book says **Magic Attribute** every time — casting (*"If the Force of the spell is greater than
the caster's Magic Attribute, the Drain causes physical damage"*, SR3 p.183), dispelling, summoning,
and a ward's maximum Force — and Essence loss lowers that attribute (*"a magician with an Essence
Rating of 4.5 has a Magic Rating of 4"*). That is `magic.value`. Casting read it; these read
`magic.base`, all now `SR3EActor.magicAttribute`:

- **Drain track** — dispelling, conjuring (all three uses), and the Drain card's "Force > Magic" warning.
- **Banishing** — the spirit resisted against base Magic.
- **Spell Pool** — `spendSpellPool`, `rollDispel` and the casting flow each recounted it from base
  INT/WIL/Magic, so a caster whose Magic had dropped could spend dice the sheet did not show. One
  formula now, `SR3EActor.spellPoolFor`, which the derivation uses too.
- **Wards** (default/max Force, an attacker's Magic damage and resist TN) and the contested roll's
  *Magic* source.

⚠ **Kept on `base` by design:** the "is this character Awakened?" gates, adept power-level caps
(documented at the call site), and permanent Magic loss (a write). `tests/magic-attribute.test.mjs`
ratchets every other read; two mutants.

**Checked live 2026-09-14:** *Bruce Lee* in the test world is the repro — base 6, effective 5; a
Force 6 dispel now takes Physical Drain as a Force 6 cast does, and `spellPoolFor` equals the sheet's
Spell Pool for every actor.

## F7. Wound modifiers missing from the tests that roll outside `rollPool` — FIXED 2026-09-14 (0.5.2)

SR3 p.125: *"The Injury Modifier is a universal target number modifier that applies to nearly all
Success Tests the injured character may attempt, except those for resisting or avoiding damage."*
`rollPool` adds it; these roll through `_rollWave` and never did. Each TN is pre-filled (and stays
editable):

| Test | Now takes the wound |
|---|---|
| Contested roll | both sides — the initiator's TN follows the actor picked, the opponent's corner starts with theirs |
| Cybercombat (Defragged) · Orthodox cybercombat | the **attacker**; the defence avoids damage |
| Orthodox System Test | the decker |
| MIJI contest | both riggers |
| Infiltration · detect · ECCM repair · reduce footprint · IVIS | the rigger |
| Knockdown Test | the target — **the maintainer's ruling**, though its threshold also scales with the wound (p.124) |
| Vehicle weapons | the gunner — they were taking the wounds off the **dice pool**, from the raw boxes (so Pain Resistance, compensators and the Pain Editor were ignored); now a TN, from `woundMod` |

⚠ **Left alone on purpose:** **Missile Parry** avoids damage (excluded by p.125, and not the dodge,
whose own example works the wound in, p.113). `tests/wound-modifiers.test.mjs` + the
`cybercombat-attack-ignores-wounds` mutant.
- [ ] Give a decker 3 Stun boxes → Cybercombat → their corner starts at TN 6, the defender's at 4.
- [ ] Contested roll from a wounded actor's sheet → the TN box starts at 4 + the wound; pick another actor and it follows.
- [ ] MIJI with a wounded intruder rigger → the intruder corner's TN is the deck rating + the wound.
- [ ] A wounded rigger fires a vehicle weapon → the pool is NOT reduced; the card's TN is +the wound and its label says so.
- [ ] Knockdown on a wounded target → the TN box includes their wound, and the dialog says so.

## F6. Wrong range-TN fallback array — FIXED 2026-09-14 (0.5.2)

`SR3EItem._rangeBandForDistance` fell back to `[0, 1, 2, 3]` and `tn[3] ?? 3` — Extreme at TN 7,
not 9 (SR3 p.111). Both now **5**; inert unless `SR3E.rangeTN` is undefined. Pinned in
`tests/tables.test.mjs` with the config table removed.

## 39. Drugs — addiction, tolerance, withdrawal (TODO 124, `feature/drug-rules`)

**Prerequisites:** a **full Foundry restart** (new `substances` actor field and new drug item fields),
then `npm run packs:install` with Foundry closed so the rebuilt M&M drug pack reaches the install.

- [ ] Compendium → M&M drugs: **one** Jazz, Kamikaze, Psyche, Long Haul, ACTH, Anabolic Steroids; no
      "CS" or "Neurostun"; Kamikaze reads **5P**; CS/Tear Gas reads Speed *1 Combat Turn*.
- [ ] Drag **Cram** onto a character → Gear tab → **💊** → a dose card (Dose 1, +1 Reaction, +1D6
      Initiative for 12 − Body hours) and a roll card *Willpower (4)* with the **unaugmented** dice.
      The Attributes tab: Reaction up by 1 with a live chip naming Cram; Initiative dice +1.
- [ ] A player rolls it; with 0 successes the result card offers **✔ Mark addicted** → the record reads
      Addiction 5M• and *addicted*. The GM can change Dice/TN on the roll card; a player cannot.
- [ ] **⏳ Wears off** → the crash card (Moderate Stun for the same duration), the tolerance roll card
      *Body (2)*; the Reaction chip is gone; Stun modifiers show as Moderate while crashing; **✔ Crash
      over** clears them.
- [ ] Take Cram four more times → on the 5th dose the dose card says *Edge reached* and a Willpower (5)
      card appears (only if not already addicted).
- [ ] Addicted: **⛓ No fix** → *Forced withdrawal +3*; every roll card label reads *Drugs +3*; the
      Stun modifier is Moderate with an empty Stun track. **⏭ A day passes** lowers the rating by 1.
- [ ] **🎲 Kick it** → Willpower vs current + 1; success offers **✔ Begin withdrawal** (+2); a dose
      taken during withdrawal says *Relapse* and raises the rating by 1.
- [ ] **Jazz** → Quickness +2 (and Reaction with it); wears off → a **🩸 Resist 8L Stun** button → the
      soak card shows *armour does not apply*.
- [ ] A second player cannot press another character's ✔ buttons or 🎲 (greyed with a reason).

## 40. The action ledger (TODO 48, `feature/action-economy`)

**Prerequisites:** the branch's code live in the install (the install's `scripts/` is a junction to the
MAIN checkout, so merge first or point it at the branch), then F5. A combat with two PCs, started.

- [ ] The active combatant's row shows pips (one wide Complex, two Simple, one small Free) to **every**
      user; the GM also sees Complex / Simple / Simple / ↺.
- [ ] On their phase a player fires a pistol **SA** → one Simple pip fills; a second SA → both; a
      third → ⚠ and a GM warning, recorded not refused. The turn does **not** advance by itself.
- [ ] Full auto → the Complex pip, not a Simple. A skill roll, a spell, a melee attack → Complex.
- [ ] The defender's dodge, soak and spell resistance fill **nothing** on the defender.
- [ ] An actor who is not the active combatant rolls → nothing is charged.
- [ ] ↺ (GM): pick the SA shot → the dialog lists `combatPoolSpent`, `roundsFiredThisPhase`, the gun's
      `loadedRounds` and the chat cards since, all ticked → **↩ Undo** puts them back, deletes the
      cards and frees the pip. Untick one row → that value is left alone.
- [ ] Reload: a clip swap fills both Simples; loose rounds a Complex each; nocking an arrow one Simple.
- [ ] F5 on any client keeps the pips (they are a combatant flag); the next combatant's phase starts empty.
- [ ] **Ready (TODO 47):** a weapon row's ✋ puts it away (grey) and readies it (green); readying fills
      a Simple pip on the character's phase, putting away does not.
- [ ] Fire a put-away pistol → the dialog offers Ready / ⚡ Quick Draw / Attack anyway. Quick Draw rolls
      Reaction vs 4 (6 with the holster box unticked); a success posts 🎯 Fire, which attacks without a
      second charge; a failure says it cannot fire this phase. A rifle (Concealability < 4) offers no
      Quick Draw. A put-away sword gets the same dialog without it; fists never ask.
- [ ] **Hands (TODO 49):** the Weapons tab says "✋ In hand: N of 2 hands — …"; ready a rifle and a
      pistol → amber and a warning; the GM's extra-hands box set to 1 → it clears. A weapon's item
      sheet shows its Hands (a compendium rifle 2, a pistol 1).
- [ ] Two ready pistols, fire one → the GM window's Gear group pre-ticks "Using a second firearm +2" and
      does NOT tick smartlink/laser; holster the second → neither. Two assault rifles → never ticked.
- [ ] After merging, `npm run packs:install` (Foundry closed) so the install's weapons carry `hands`.
- [ ] **Gyro (TODO 18):**
  - [ ] Give a character a compendium *Gyro Mount* (sr3 gear, rating 5). The Combat Pool halves, rounded
        down. The soak card's armour rises by 1/1.
  - [ ] Fire SA twice (+1 recoil on the second shot). The breakdown says "Gyro −1 of recoil (4 left for
        movement)".
  - [ ] In the GM window, tick "Attacker running". The TN does not rise (4 offset), and the gyro note
        says so.
  - [ ] Put the gyro in storage. All of the above goes away.
  - [ ] Melee with the gyro worn: the GM window's base TN for that fighter is 4 higher.
- [ ] **Accessories (TODO 18):**
  - [ ] A compendium Ares Predator shows smartgun/laser as the packs store them.
  - [ ] Fire a smartgun with Smartlink cyberware: −2 is pre-ticked.
  - [ ] The Ballista (Laser Designator) never pre-ticks a laser sight.
  - [ ] After merging, run `npm run packs:install` (Foundry closed), then restart Foundry fully: the data
        model changed.
