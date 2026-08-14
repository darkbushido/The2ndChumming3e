# TODO

Durable backing store for the work list. Same principle as `audit/combat-audit.md`:
**this file is the progress**, not a cache. The in-session task list is ephemeral —
update this file when items change, and rebuild the task list from here.

Every file:line citation below was verified against the code at time of writing
(2026-08-04 onward; branches `Shadowfork` then `socket-combat`). Verify before
relying on any of them.

**Numbers are stable identifiers, not an order.** They are referenced from other
entries here, from ~30 commit messages and from CLAUDE.md, so they are never
reassigned — a completed item keeps its number and stays in place, marked ✅ with
the commit that closed it. Grouping below is by *kind of work*; read the group
headings, not the numbers.

Sequencing: **#4 and #8 before #1**; **#12 blocks #1 and #23**. Everything else is
independent.

## Contents

| Group | Items |
|---|---|
| 🔵 In progress | 2 |
| 🟢 Socket combat — follow-ups | *(24 complete — see Done)* |
| 🔴 Confirmed bugs, still open | 54 *(1 of 3 fixed; the other two are design calls)* |
| 📕 Rules not implemented | 3 · 4 · 10 · 30 · 38 · 39 · 40 · 41 · 47 · 48 · 49 · 51 · 52 · 53 |
| 📦 Content gaps | 9 · 11 · 19 · 23 |
| 🔧 Tooling & infrastructure | 7 · 12 · 18 · 20 · 36 |
| 🧹 Housekeeping | 1 · 6 · 8 |
| ✅ Done — kept for the record | **5** · 13 · **14** · 15 · 16 · 17 · 21 · 22 · **24** · **37** · **43** · 25 · 26 · 27 · 28 · 29 · 31 · 32 · 33 · 34 · 35 · 42 · 44 · 45 · 46 · 50 |
| 📌 Notes & parked | combat-audit questions · known drift · ODM/MDF |

### 🔵 In progress

## 2. Rebuild combat on sockets with player-initiated flow

Foundry sockets so each participant sees the right window on their own screen:

- ✅ Players can initiate combat (currently attacker-sheet driven, assumes one client)
- ✅ **Dodge window on the target's screen**, not the attacker's
- ⏳ **GM window to set TN, with checkboxes for combat modifiers** (not a typed field) — built
  for **ranged** ([#29](#29)); melee and contested still have no GM TN step, which is [#37](#37)

**Status 2026-08-13 — the socket layer itself is finished.** `SR3EQuery` (ask / asGM / deciderFor
/ once), the per-actor `SR3EQueue`, the append-only `card.mark` ledger, and the generic
two-corner block now carry every opposed test in the system: **all eight cards** are converted
and driven by two real clients ([#24](#24)). Defaulting, dodge declaration and Spell Defense
each ask their own owner.

What is left under this heading is **not** socket work:

- **[#37](#37)** — the GM TN window for melee/contested. The remaining bullet above.
- **[#43](#43)** — the sibling resist cards still spend pool dice free.
- The **`_corner` duplication** noted in [#24](#24) — eight local definitions, now divergent.

### The live bug this fixes

`SR3EItem._promptDodgeDeclaration` runs on the **attacker's** client and calls
`targetActor.spendCombatPool()`, which needs UPDATE permission on the target. It
**silently fails** for PC-vs-PC attacks and GM-owned NPCs — no error, the pool just never
spends. This is the concrete reason the task exists; the routing change is how it gets fixed.

### Decided

- **Transport is sockets, not chat messages.** A chat-card hand-off was built and
  play-tested, then reverted (`6006a78`) as worse to use than the blocking dialog it
  replaced — it added two clicks and two chat entries per attack. Do not rebuild it. The
  binding constraint on any design here: **it must not add clicks.**
- **Defender has no connected owner → fall back to the GM.**
- `"socket": true` is **already set** (`system.json:6`). No manifest change, no restart
  needed to start emitting.

### Approach — socket-driven remote dialog

The attacker emits a `dodge-request` carrying a correlation ID; the **defender's** client
opens the same `DialogV2` it opens today; the answer returns as `dodge-response`. The
attacker sees a non-blocking "waiting for X…" with a GM override and a timeout. Zero added
clicks — the defender's click is one they'd have made anyway, and nothing touches chat.

Needs a new `SR3ESocket.js`: correlation IDs, a pending-promise registry, timeout handling,
and the GM fallback above. The same layer then carries the **GM TN window**, so the dodge
window and the GM window share one build. The modifier checkboxes themselves are ordinary
client-side dialog work — free of the socket layer.

*Proposed, not ratified:* a cheap precursor — leave the attacker's dialog exactly as it is
and send only the `spendCombatPool` **write** to `game.users.activeGM` (the primitive the
`updateActor` hook already gates on). ~30 lines, zero UX change, fixes the bug above without
waiting on the full build.

Touches `SR3EItem.rollWeapon`, `SR3EActor.postMeleeCard`, `_promptDodgeDeclaration`, and
the chat-card handlers in `sr3e.js`. Keep the ethos: no automation of outcomes, all values
editable. `_checkBtn`/`_claimBtn` one-shot guards still apply — socket messages land on
multiple clients.

### ✅ DESIGN COMPLETE — see [audit/socket-combat-plan.md](audit/socket-combat-plan.md)

Resumed 2026-08-05; all 15 agents finished. Winner **"One Hop, Three Windows"** — *unanimous,
3/3 judges*. Adversarial pass raised **32 breaks, 8 fatal**; §5 of the plan maps each to a
handling. Start at **Stage 0**, which is four small prerequisite commits.

**The brief's premise was wrong, and it was mine.** I told the designers "Foundry sockets are
fire-and-forget broadcast, there is no built-in request/response." **False since v13.** Verified
by hand against the installed build (**Foundry 14.365.0**):

| Capability | Location |
|---|---|
| `User#query(name, data, {timeout})` | `client/documents/user.mjs:289` |
| Fast-fail on disconnect (no hang) | `:306` `throw new Error('User [x] is not active')` |
| Correlation id minted by core | `:308` `foundry.utils.randomID()` |
| `User.queryMany` | `:335` |
| `CONFIG.queries` + system-prefix convention | `client/config.mjs:2964`, doc at `:2961` |
| `DialogV2.query(user, type, config)` | `client/applications/api/dialog.mjs:443` |
| Loopback short-circuit already in core | `:449` `if (user.isSelf) return this[type](config)` |
| Players may query the GM by default | `common/constants.mjs:1409` `defaultRole: USER_ROLES.PLAYER` |

So **`SR3ESocket.js` is not built.** `scripts/SR3EQuery.js` (~180 lines) wraps `CONFIG.queries`
instead. Caveat the plan catches: `DialogV2.query` forwards config as JSON and its docstring
says *"Callback options are not supported"* (`dialog.mjs:435`), so the dodge window cannot use
it directly — it needs live recompute and a close handle. Register our own query and build the
dialog locally on the defender's client.

**Second fatal cluster, independent of the above:** relaying `.update(changes)` ships
**absolutes**, so two clients both read `combatPoolSpent: 0`, both compute `0+3`, both send `3`
— six dice declared, three charged. Affects 15 call sites incl. `SR3EActor.js:3610-3611` (melee
spends *both* corners from whoever clicked) and all four `handleAssignDamage` branches. Fix:
relay **intent** (`{actorId, pool:'combat', n:3}`) and let the GM re-enter the clamp locally.

**Stages:** 0 prerequisites (~2h) → 1 transport + single writer (~½d, **zero UI change**, fixes
`SR3EItem.js:919`) → 2 dodge window on the defender (~1d) → 3 GM TN window (~1.5d). Click budget
after: **attacker 5→3, defender 0→1, GM 0→1, chat unchanged.**

**Open question the plan wants answered before Stage 3:** the Visibility Table's slash notation
— should the GM window render a computed number, or the verbatim string plus a typed TN?

<details><summary>Superseded — partial run of 2026-08-04</summary>

### Design state — 2026-08-04, PARTIAL

A design workflow produced a pipeline map (179 findings) and **three independent designs**.
The **judge, adversarial-verify and synthesis phases never ran** — all seven agents died on a
session limit. So there is **no scored winner and no adversarial pass**. Any "winner" or
"0 breaks found" in the raw output is an artefact of those phases not running, not a result.

| Design | Click math | Shape |
|---|---|---|
| **1. Thin RPC** (`SR3ESocket.js`) | attacker 6→5, defender 0→1‑3, **GM +1**, chat +0 | Generic correlated request/response + GM-pinned writes; combat verbs in a separate file. Most reusable. |
| **2. Exchange Ledger** | player‑vs‑NPC **5→5**; PC‑vs‑PC 5→6‑7 | World-setting state machine; GM is sole writer because Foundry refuses non-GM `settings.set`. Survives refresh. Self-flagged hazard: opening a modal from an `updateSetting` hook. |
| **3. One Hop, Three Windows** | **8→8 neutral; attacker 8→3** | Scoped to single-target ranged. Merges the TN window *into* the dodge window when the GM is both, so the GM is never asked twice. |

1 and 3 propose the **same** `scripts/SR3ESocket.js` primitive — they are not rivals. 3 is
roughly "1, scoped down, plus the merge optimisation."

**Unratified recommendation (mine, unverified):** build 3's shape on 1's generic primitive.
3 wins on the criterion that killed the last attempt — the attacker goes 8 clicks → 3 and the
table nets zero — while 1's primitive lets melee and spells reuse the transport later.

**Accepted cost:** requirement 3 is **+1 GM click per player attack**. "The GM gets a window"
is a click by definition. Design 3 caps it at one, never two. Put it behind a
`combatGMWindow`-style world setting so a play-test rejection is a toggle, not a revert.

**Resume handle** — replays the 8 finished agents from cache, re-runs only the 7 that failed:

```
Workflow({ scriptPath: "<session>/workflows/scripts/socket-combat-design-wf_d9545118-374.js",
           resumeFromRunId: "wf_d9545118-374" })
```

Full per-agent returns: `<session>/subagents/workflows/wf_d9545118-374/journal.jsonl`.

</details>


---

### 🟢 Socket combat — follow-ups

## 35. ✅ Round 1 never refreshes dice pools — **CONFIRMED**

**✅ DONE.** `startCombat()` now calls `_endOfTurnReset()`, and the Begin Encounter flow calls it
once more *before* `rollInitiative()`. Kept for the record; this file is the progress, not a queue.

The ⚠ below turned out to be real, and more specific than it guessed: `rollInitiative()` ends by
posting the **Spell Defense declaration card**, which caps its Spell Pool input at
`availableSpellPool` *as computed when the card is built*. Refreshing only inside `startCombat()`
would have left a mage who arrived with a depleted pool staring at a stale, too-low cap — unable to
declare dice they now had. No allocation was ever at risk of being wiped (the spend happens later,
on Commit), but the cap would have lied. Hence the extra call ahead of the roll, which also puts
round 1 in the same order as `_newRound()` and as RAW p.104.

`_endOfTurnReset()` is now dirty-checked so the overlapping call sites are free — each helper wrote
unconditionally, and each write fires the `updateActor` hook behind status icons and auto-defeated.

Covered in `tests/initiative.test.mjs`: `startCombat` refreshes before building the queue (asserted
as the exact sequence — an `indexOf(a) < indexOf(b)` form passes trivially at `-1 < 0` when the
reset is missing, which is precisely the regression), an already-clean actor is never written to
across two calls, and each field is guarded independently.

Raised in play 2026-08-05 ("the end of combat pool refresh may be a bug"). It is — but not in the
way it looks. The `endCombat()` refresh isn't redundant; it is **silently load-bearing**, because
the *first* Combat Turn has no refresh of its own.

`SR3ECombat._endOfTurnReset()` — which refreshes combat / spell / astral / hacking pools, resets
recoil and clears Full Defense — has **exactly one caller**: `_newRound()`. `startCombat()`
(`:124`) calls `super.startCombat()` and `rebuildQueue()` and nothing else.

| Moment | Pools refreshed? |
|---|---|
| Combat starts — **round 1** | ❌ **no** |
| Rounds 2, 3, 4 … (`_newRound`) | ✅ yes |
| Combat ends (`endCombat`) | ✅ yes |

So round 1 inherits whatever pool state was lying around, and the end-of-combat refresh is what
makes the *next* fight usually start clean.

### Where that shows

- **Combat ends without `endCombat()`** — tracker deleted, or the GM declines the refresh prompt —
  and the next fight opens with depleted pools.
- **Pool spent outside a running combat** (ambush dodge, a spell) is not restored until a round
  *two* happens.
- Recoil (`roundsFiredThisPhase`) and a stale Full Defense flag ride along on the same reset, so
  both leak into round 1 as well.

### RAW

*"At the start of each Combat Turn, all dice pools refresh to their original, full value"*, and the
Combat Turn Sequence (**p.104**) makes **"1. All Dice Pools Refresh"** the *first* step — before
initiative is determined. Round 1 is a Combat Turn like any other.

### Fix

Call `_endOfTurnReset()` from `startCombat()`, after `super.startCombat()` and before
`rebuildQueue()`. That makes the `endCombat()` refresh genuinely redundant — keep it as a
convenience, but it should no longer be the thing holding this together.

⚠ Check the ordering against the initiative flow: "Begin Encounter" rolls initiative through its
own dialog (`sr3e.js:1467`), so make sure the refresh lands **before** any pool is offered for a
first-round action, not after.

## 34. ✅ Defaulting rolls half the dice it should — **CONFIRMED**, three errors in one table

**✅ DONE — `e751e85`.** Fixed on the `sr3-rules-corrections` branch (`766389f`), merged into
`main` separately from this branch's own history. Kept for the record; this file is the
progress, not a queue.

Found auditing CLAUDE.md against RAW, 2026-08-05. The **Dice Pool** column of the Default Table was
read as *the dice you roll*. It is the **cap on pool dice**; you roll the full rating.

### The book

```
DEFAULT TABLE
Default To:       Target Number Modifier   Dice Pool
Specialization              +3             = to 1/2 specialization's base skill
Skill                       +2             = to 1/2 base skill being used
Attribute                   +4             No pool dice allowed
```

> **Skill → Skill:** "roll a number of dice equal to **your rating in the default skill**.
> Defaulting increases the target number by 2. If the default skill can be augmented with a dice
> pool, the maximum number of **pool dice** allowed is equal to half your rating in that skill."
>
> **Skill → Specialization:** "roll a number of dice equal to **the specialization's rating**.
> Defaulting increases the target number by 3. …the maximum number of **pool dice** allowed is equal
> to half the character's rating in the specialization's **related base skill**."
>
> **Skill → Attribute:** "roll a number of dice equal to the rating of the default Attribute…
> Players cannot use pool dice."

The book's worked examples pin it: Ratchet, **Shotgun 5**, defaulting to an assault rifle, "is
rolling **5 dice** (his rating in the default skill), plus **up to 2 dice** from his Combat Pool".
And with **Edged Weapons 4 (Sword 6)**, defaulting to a club via the sword specialization, he "is
rolling **6 dice** for the sword specialization, and can use **up to 2** dice from his Combat Pool
(half of Edged Weapons 4)".

### What the system does

`SR3EItem.promptDefaultChoice` — `data-dice="${half(r)}"` for both the skill and specialization
rows:

| | RAW | System |
|---|---|---|
| Skill → Skill | full default skill rating | **½** the rating |
| Skill → Specialization | full **specialization** rating | **½ the base skill** |
| Skill → Attribute | full attribute ✅ | full attribute ✅ |
| Pool cap | ½ the relevant skill | **not implemented — full pool offered** |

Ratchet's two cases become **2 dice** instead of 5, and **2** instead of 6.

### Both directions at once

The errors do not cancel — they compound in opposite directions. A defaulting character rolls
roughly **half the skill dice** they should while being allowed to pour in **more Combat Pool** than
the rules permit. The specialization tier is worst: RAW makes it *better* than the skill tier
(a Sword 6 spec beats an Edged Weapons 4 base) at the cost of a stiffer TN, and the system inverts
that into the weakest option.

### Fix

1. `data-dice` = the **full** rating for skill and specialization tiers.
2. Return a `maxPool` alongside `allowPool`, and enforce it where pool is offered — `rollWeapon`
   currently passes `availableCombatPool` uncapped.
3. Correct the CLAUDE.md table, which states the same three errors.
4. Test with the book's own examples — Shotgun 5 → 5 dice / 2 pool, Edged Weapons 4 (Sword 6) →
   6 dice / 2 pool. Pure arithmetic, belongs beside `tests/dodge-resolution.test.mjs`.

⚠ **Scope:** `promptDefaultChoice` feeds every defaulting flow — skills, ranged, melee, astral,
cybercombat, vehicle, Falling, Escape Artist, Driving. One fix, wide blast radius, so test broadly.

## 33. ✅ Staging past Deadly adds Power — **an SR3 rule, but MELEE-ONLY** — **CONFIRMED**

**✅ DONE — `e751e85`, then CORRECTED 2026-08-10.** Fixed on the `sr3-rules-corrections` branch
(`a79d9c1`), merged into `main`. Kept for the record; this file is the progress, not a queue.

### 🔴 The original diagnosis was half wrong — "not an SR3 rule" IS an SR3 rule

Found while answering a question about melee modifiers. **SR3 gives two different answers past
Deadly and both are RAW** — a general rule with a melee-specific exception:

- **General (p.113)** — *"On the other end of the spectrum, Deadly damage is the highest level of
  damage possible."* Surplus discarded. Correct for the reported case, a **firearm**.
- **Melee (p.122, step 4)** — *"If the Damage Level has been increased to Deadly, extra successes
  can be used to stage the Power Rating up. For every two successes the Power Rating increases by
  one."*

Specific beats general, so **Power-staging past Deadly is real — for melee**. This entry originally
asserted the book contained no such rule. It does; it is just scoped.

**Astral counts as melee**: *"Astral combat uses the same rules as Melee Combat"* (**p.174**).
Matrix and contested tests do not — nothing makes them melee.

### What was actually broken, and for how long

Melee **never called `stageDamage`** — `_postMeleeResult` carried its own inline copy of the staging
loop, Power bump included. So capping `stageDamage` left melee accidentally correct and broke
**astral combat**, which does use it. The duplication hid the error in both directions at once: it
protected the code that needed the exception and disguised the code that lost it.

Now one implementation with an explicit flag —
`stageDamage(base, net, { meleeRules: true })` — and melee's inline duplicate is gone. `_postAstralResult`
passes the flag; the ranged, Matrix and contested paths do not.

`tests/damage-codes.test.mjs` pins **both** rules side by side, including the same input resolving
to `6D` ranged and `8D` melee, because they are one flag apart and either direction is wrong at the
table.

Found in play 2026-08-05: a Colt Manhunter (**9M**) with **6 successes** reported **10D**.

### The book

> "If the weapon damage is staged below Light (the level is already at L and at least two more
> successes remain to be used for staging), then no damage is done. **On the other end of the
> spectrum, Deadly damage is the highest level of damage possible.**" — *Staging*

**Deadly is the ceiling.** Successes beyond the ones that reach D are simply spent. There is no
rule converting them into Power.

### The code

[`SR3EItem.stageDamage`](scripts/documents/SR3EItem.js) — `:648-650`:

```js
} else {
  // Already at D — each pair of remaining successes adds 1 to power
  power++;
}
```

The observed roll walks it exactly: 9M → S (2 successes) → D (4) → 2 spare → `power++` → 10D.
RAW is **9D**, surplus discarded.

### Why it matters more than one point of Power

**Power is the soak target number.** `soakTN = max(2, stagedPower − armour)`. So every phantom
point makes the Damage Resistance Test harder *and* the wound worse, and it compounds with the
number of successes — exactly the rolls that were already going badly for the defender.

### Fix

Cap at `D` and drop the `else` branch. Then extend `tests/damage-codes.test.mjs`, which already
covers `stageDamage`, with the boundary: **9M + 6 → 9D**, and 9M + 20 → still 9D.

⚠ Check the same assumption elsewhere before fixing only this: the melee boxing card, the spell
resist path and the Chunky Salsa calculator all stage damage, and any of them may re-implement the
same invented rule rather than calling `stageDamage`.

## 32. ✅ Audit glitch / critical glitch — **the threshold is an SR4 rule**

**✅ DONE — `e751e85`.** Fixed on the `sr3-rules-corrections` branch (`69f62ec`), merged into
`main` separately from this branch's own history. Kept for the record; this file is the
progress, not a queue.

Prompted by play 2026-08-05: a dodge showed a glitch banner and nobody could tell whether it had
done anything. **It hadn't** — and it probably should not have said "glitch" in the first place.

### What SR3 actually says (core, *Rule of One*)

> "Any time a die roll result comes up 1 in a test, that die is an automatic failure, no matter
> what the target number. But the test can still succeed as long as other dice succeed.
>
> If **ALL** the dice rolled for a test come up 1s, it means that the character has made a
> disastrous mistake. The result may be humorous, embarrassing, or deadly. **The gamemaster
> determines** whatever tone is appropriate… Individual rules may also have particular results when
> the Rule of One is applied."

So SR3 has **one** condition — *every* die shows 1 — and its consequence is **GM adjudication**,
not a mechanical penalty.

### What the system does

```js
const glitch         = ones > Math.floor(pool / 2);   // "more than half" — SR4
const criticalGlitch = glitch && successes === 0;     // SR4's two-tier model
```

Two problems:

1. **Wrong threshold, wildly.** More than half is SR4's glitch rule; RAW needs every die.

   **The observed case, 2026-08-05** — a dodge of **`5, 1, 1` against TN 4**:

   | Die | vs TN 4 | |
   |---|---|---|
   | 5 | ≥ 4 | ✅ success |
   | 1 | — | ❌ failure |
   | 1 | — | ❌ failure |

   | | |
   |---|---|
   | System | `ones (2) > Math.floor(3/2) = 1` → **true** → "⚠ Glitch" |
   | SR3 RAW | Rule of One needs `1, 1, 1` → **not a Rule of One event at all** |

   Under SR3 that is simply 1 success on 3 dice, and the book's own sentence covers it: *"the test
   can still succeed as long as other dice succeed."* It showed the plain banner rather than
   CRITICAL only because of that single success — the other half of the same imported SR4 model.
2. **The two-tier glitch / critical-glitch model is SR4 vocabulary.** SR3 has no "critical glitch".
   There is one condition and the GM decides what it means.

### Purely cosmetic today

`glitch` is computed, carried in the roll state and rendered as a banner. **Nothing reads it.**
That part is arguably right — GM adjudication is exactly what this project's ethos wants, and
automating a consequence would be wrong. The banner just needs to fire on the correct condition and
say something the GM can act on.

### Also worth checking in the same pass

- **Does the Rule of One interact with the Rule of Six correctly?** "That die is an automatic
  failure, no matter what the target number" — but an exploding 6 that re-rolls a 1 gives a running
  total of 7. Is that die a success at TN 7, or a failure? Decide it, and write it down.
- **CLAUDE.md says "only first wave counts for glitch"** — check that against the all-1s rule, where
  re-rolls make "the dice rolled for a test" ambiguous.
- ~~**Five independent copies of the formula**~~ — `SR3EActor.isRuleOfOne` is that shared helper.

  ⚠ **But this task was marked ✅ while FOUR resolvers still had the SR4 threshold inline**
  (`ones > Math.floor(pool / 2)`) — melee, astral, contested and cybercombat, two lines each.
  They were only found on 2026-08-13 while covering the two-corner cards in [#24](#24), because
  nothing reads `glitch` and a wrong banner changes no number. All eight lines now call
  `isRuleOfOne`.

  **The lesson is about the tick, not the rule:** "extracted a helper" is not "every caller
  uses it", and a cosmetic-only field gives you no feedback when they do not. `grep` for the
  formula, not for the helper.
- **Test it.** Pure arithmetic, no Foundry dependency, so it belongs beside
  `tests/dodge-resolution.test.mjs`.

## 21. ✅ Fold the attacker's roll-options into one screen — **target met**

**✅ MET — target reached by `54e9698` and `8fcaed8`, not by the consolidation described below.**
Kept for the record; this file is the progress, not a queue.

The stated target was *"attacker **2 clicks** (fire dialog → roll), GM 1, defender 1."* Measured
against the code 2026-08-10, the ranged path is:

| Weapon | Attacker dialogs |
|---|---|
| Firearm with a fire mode, token targeted | **2** — `_promptFireMode`, then `_promptWeaponRollOptions` |
| SS-only firearm · bow · crossbow · thrown | **1** — roll options only |
| *(any of the above with no canvas target)* | +1 for `_promptTarget` |

`_promptWeaponRollOptions`' confirm button is labelled **`🎲 Roll`** and *is* the roll trigger, so
that dialog is not an extra step before rolling — it is the roll. Two of the three original
complaints were fixed on the way: Combat Pool moved onto that screen (`8fcaed8`) and the attacker
rolls their own dice rather than watching the GM click (`54e9698`).

### What was left, and why it was not done

The task carried two budgets that stopped agreeing once the flow changed:

- **"attacker 2 clicks"** — met, and beaten for non-firearms.
- **"the table pays +1 click"** — a *total-across-participants* budget. The GM's window is a new
  click that consolidating the attacker's two dialogs into one was meant to offset. By that reading
  there is still one dialog to fold.

The remaining win is **one dialog, firearms only** — bows, thrown and SS-only weapons gain nothing,
since they already show a single screen. Weighed against a real refactor of a working flow, and
against the ⚠ below, that is not obviously worth spending. Deliberately not done.

⚠ Click count is exactly what got the previous attempt (`0c45bc5`) reverted after play-testing, so
any further change here wants **table evidence, not a spec**. `gmApprovesTN` is the lever meanwhile:
`'off'` removes the GM window entirely, `'player'` (default) skips it when the GM attacks with their
own NPCs.

### Successor, if the table still feels it

**Fold `_promptFireMode` into `_promptWeaponRollOptions` for firearms** — one screen carrying fire
mode, recoil comp, range, called shot, take aim, karma, pool and the roll. Scope is firearms alone;
every other weapon is already there.

Do it only with a measured before/after from play, and only after [#24](#24) settles — melee will
copy whichever attacker-side shape wins, and it should copy a verified one.

## 24. ✅ Revise the two-corner cards onto the socket layer — **ALL EIGHT DONE 2026-08-13**

### ✅ Melee — the decided flow is built

- **No shared Roll! button.** `.sr-melee-roll-btn` is **deleted**, replaced by one
  `.sr-melee-submit-btn` per side. The race is now structurally impossible rather than gated:
  there is no button for one player to reach first. *(This also closes [#27](#27)'s last
  deliberately-ungated button — it was retired rather than guarded, the stronger fix.)*
- **Each side edits only its own corner.** The opponent's inputs render **read-only** on every
  client, and your own lock once submitted. Read-only rather than hidden, so the shared view of
  the matchup — the reason this stayed one card — survives.
- **The last submission resolves.** Values ride in the `acted` message flag from [#42](#42),
  extended to carry a `data` payload per role, so resolution reads each side's numbers from
  what *that side* submitted rather than from whichever browser clicked.
- **GM "Resolve now"** submits nothing and simply resolves, so an outstanding side falls through
  to the card's defaults. Needed because an AFK player would otherwise stall the exchange
  forever, and unlike the dodge relay there is no blocking dialog to time out.

⚠ **Exactly one submission may observe the pair completing.** The resolver is whoever gets
`already:false` *and* finds both roles present. Since `card.mark` is append-only and
GM-serialised, two near-simultaneous clicks cannot both resolve. Pinned in
`tests/card-acted.test.mjs` along with per-role data isolation and the duplicate-click case.

⚠ **The DOM fallback in `handleMeleeRoll` is deliberate and ordered.** Submitted values first,
card DOM second — a GM forcing resolution for an absent player genuinely has no submission to
read, and falling through to the defaults is the intended behaviour there.

**Deferred from this pass, on purpose:**
- **The GM TN step** (flow step 2) — that window is [#37](#37), which has the melee modifier
  table. Building a second TN surface here first would just be thrown away.
- **`gmApprovesTN` mirroring** for melee — belongs with the GM step above.
- **Full Defense** — already excluded by the maintainer; see the note below.

### ✅ All eight cards converted and driven live

Melee · Astral · Contested · MIJI · Cybercombat · the three Orthodox. They share **one**
generic handler in `sr3e.js`, found by `[data-twocorner]` and dispatched through the
`_RESOLVERS` table. Each is exercised by two real Playwright clients (12 e2e tests).

**Every card verified live turned up defects a green `npm test` could not see.** Recording
them here because the pattern is the point: these are not typos, they are what a single-client
walkthrough structurally cannot detect.

| Card | Found |
|---|---|
| Contested | The setup dialog set the **opponent's** pool source, dice, TN and damage — a player choosing how another player fights. Their pool source is now a dropdown in their own corner. |
| MIJI | `_ewSkill` was `find(name.includes('electronic'))`, but **three** SR3 skills match, so **item order** decided a rigger's EW dice; the **Electronic Warfare specialisation bonus was ignored** entirely. Now a ranking (`_pickEwSkill`), pinned in `tests/ew-skill.test.mjs`. |
| Cybercombat | The **defender's Hacking Pool was never charged** — free dice every exchange, for ever. Over-allocation rolled dice it did not pay for. The write was a bare `actor.update`, which fails on a client that does not own that side. |
| Orthodox ×3 | Two of the three dialogs read the **Defragged** pool, which is `null` for an Orthodox decker, so every one of them was offered **0 Hacking Pool**; `spendHackingPool` clamped against it too. |
| Orthodox IC attack | The IC's dialog carried "Decker defense dice" and "Decker HP allocation" and **committed the spend before the decker had seen the card** — the GM spending a player's Hacking Pool, which does not return until pools refresh. The worst instance of this task's whole premise. |

Two harness defects came out of the same work:

- **Unsubmitted corner edits were silently discarded.** The other side submitting writes the
  `acted` flag → the message updates → Foundry rebuilds the card from its payload. So dialling
  in your dice and waiting reverted you to the defaults and you submitted numbers you never
  chose. `_cornerDrafts` holds your own unacted corner across re-renders. **Affects all eight.**
- **Four resolvers still used the SR4 glitch threshold** (`ones > pool/2`) rather than the
  existing `isRuleOfOne` — see [#32](#32), which was marked done while these survived.

⚠ **The `_corner` duplication was NOT consolidated.** Eight local definitions remain, and they
have now diverged further (ICIA grew an optional Hacking Pool row). Left deliberately: the
per-card differences are real, and the behaviour is pinned by e2e rather than by shared code.
If it is unified later, the specs are what will catch a regression.

**Requested 2026-08-05 after play-testing the ranged flow.** Stages 1–3 routed *ranged* combat;
melee was Stage 4 and explicitly deferred. It is now the most obviously wrong surface in the game.

**What is wrong.** The boxing card carries **both** corners, and `SR3EActor.handleMeleeRoll`
reads every field off whichever client clicked:

```js
const atkCombatPool = parseInt(card.querySelector('.sr-melee-atk-pool')?.value) || 0;
const defCombatPool = parseInt(card.querySelector('.sr-melee-def-pool')?.value) || 0;   // ← the OPPONENT's
const atkTN = …'.sr-melee-atk-tn'…;  const defTN = …'.sr-melee-def-tn'…;                // ← both
const atkRawDamage = …'.sr-melee-atk-damage'…; const defRawDamage = …'.sr-melee-def-damage'…;
```

So the attacker sets the defender's **combat pool, TN and damage code**, then rolls for them. And
`.sr-melee-roll-btn` (`sr3e.js:2120`) carries **no decider gate** — only `_checkBtn`/`_claimBtn` —
so any observer with the card can roll the whole exchange. Stage 1 fixed the *permission* on the
two cross-actor pool writes (`SR3EActor.js:3610-3611`); it never touched *who decides*.

**The machinery already exists.** `SR3EQuery.ask`, `deciderFor`, the withdraw/dialog registry and
the two-phase negotiate/commit split were all built in Stages 1–3 and generalise directly.

### ✅ FLOW DECIDED — 2026-08-10, by the maintainer

1. **Attacker initiates** → the two-corner card posts.
2. **GM sets the target number** — their own control on the card.
3. **Each side edits only their own corner**; the opponent's is read-only to them.
4. **Each side clicks Submit. Whoever is last triggers the resolution.**

This keeps the shared view of the matchup — which splitting into per-side cards would lose — and
makes the race **structurally impossible** rather than merely gated: there is no roll button for
one player to reach first.

**Three consequences, settled:**

- **Submissions route through the GM.** A player cannot write to a chat message they did not author,
  so "who has submitted" cannot live in the card's DOM — it would be per-client and diverge. It goes
  in **message flags, written by the GM** via a `sr3e.melee.submit` query, same GM-authoritative
  pattern as every other write on this branch.
- **Three inputs, not two** — GM TN, attacker, defender; the *last of the three* resolves. Since the
  GM step can therefore stall an exchange, mirror `gmApprovesTN`: `'off'` skips it entirely,
  `'player'` skips it when the GM fights with their own NPCs.
- **An AFK player stalls it forever**, so the GM needs a **"resolve now"** that submits defaults for
  anyone outstanding. Same reaper rule as dodge, but manual — there is no blocking dialog to time out.

⚠ **Full Defense is explicitly OUT of scope here** (maintainer, 2026-08-10). Accepted cost: RAW gives
a Full Defense defender no Combat Pool in the skill test and pool only in the second-stage dodge
([#39](#39)), so the defender's corner **will need revisiting** when that lands. Known, not overlooked.

**Shape to follow — the ranged flow, not a new invention:**

1. `sr3e.melee.declare` → the defender's decider, on their own screen: pool dice, their TN, their
   damage code. Same reaper rule as dodge — unreachable or AFK yields the defaults and the exchange
   proceeds; a defender must not be able to veto by cancelling.
2. Attacker's corner stays local, as today.
3. Gate `.sr-melee-roll-btn` with `_isDecider` (it rolls, so it needs the single-user predicate,
   not the broader `_mine`).
4. Render each corner's inputs **read-only for the other side**, so the card stops *looking*
   editable to someone who cannot legitimately change it.
5. Keep negotiate/commit split — nothing is spent until both corners are in.

⚠ Also revisit `postMeleeCard`: it currently builds one card for both corners. Either it keeps
doing that with per-side read-only rendering, or it splits — decide before writing code, because
the choice drives everything else.

### ⚠ Scope is EIGHT cards, not one — widened 2026-08-10 after the [#27](#27) sweep

Melee is the worst and the most visible, but the both-corners-one-client shape was copied across the
codebase. Doing melee alone leaves seven identical bugs behind, and each becomes the next play
report:

| Card | Roll button | Builder |
|---|---|---|
| Melee boxing | `.sr-melee-roll-btn` | `postMeleeCard` |
| Astral combat | `.sr-astral-roll-btn` | `postAstralCard` |
| Contested test | `.sr-contested-roll-btn` | `postContestedCard` |
| MIJI | `.sr-miji-roll-btn` | `postMIJICard` (`SR3EMIJI.js`) |
| Cybercombat (Defragged) | `.sr-cc-roll-btn` | `postCybercombatCard` |
| Orthodox System Test | `.sr-ost-roll-btn` | *(reuses the melee layout)* |
| Orthodox Cybercombat | `.sr-occ-roll-btn` | *(reuses the melee layout)* |
| Orthodox IC Attack | `.sr-icia-roll-btn` | *(reuses the melee layout)* |

They are not merely similar — the three Orthodox Matrix cards emit the melee layout classes verbatim
(`sr-melee-boxing`, `sr-melee-vs`, `sr-miji-corner`), and CLAUDE.md describes MIJI's card as *"cloned
from the melee boxing card"*. **This is one bug with eight copies.**

⚠ **Correction to an earlier note here: there is NO shared `_corner` to fix once.** There are
**eight separate local definitions** — `SR3EActor.js:403` (cybercombat) · `:3551` (melee) · `:5726`
(astral) · `:6322` (contested) · `:6760` `:6964` `:7125` (the three Orthodox) · `SR3EMIJI.js:174`.
Unifying them is a **prerequisite refactor**, not a free consequence of fixing melee.

**The three Orthodox ones are byte-identical** — same signature `(name, skill, dice, tn, tnLabel,
dcls, tcls)` and the same body, differing only in the surrounding header and speaker alias.
Deduping those three is pure win with no behaviour change, and takes 8 cards down to 6 shapes.

### ✅ The TN fallback is fixed — do not re-introduce it

`handleMeleeRoll` read TN as `parseInt(...) || 4`, falling back to a **hardcoded 4** rather than the
computed `ctx.atkTN` — which is where the **reach differential, the defaulting penalty and the
called-shot +4** all live. Astral and Defragged cybercombat had the same line. Five of the eight
cards already did it correctly (`|| ctx.atkTN`), so it was an oversight, not a convention.

It never fired, because the input always exists today — **but the moment a corner is rendered
read-only or conditionally, every one of those modifiers silently vanishes and the exchange
resolves at TN 4.** That is squarely in this task's path, which is why it was fixed first, ahead of
any rendering change.

**Now one pure function, `SR3EActor.cornerTN(raw, ctxTN, floor = 4)`, used by all 16 reads across
the 8 cards.** The inline versions had split into two wrong behaviours, and the extraction fixes
both at once:

| Old behaviour | Cards | Failure |
|---|---|---|
| `\|\| 4` | melee · astral · Defragged cybercombat | discards reach / defaulting / called-shot |
| `\|\| ctxTN` with no guard | contested · MIJI · the 3 Orthodox | `Math.max(2, undefined)` = **NaN**, fails every die |

⚠ A typed **0** falls *through* to `ctxTN` rather than to the floor of 2, because `0` is falsy. That
is pre-existing behaviour, **pinned by a test rather than changed** — a GM typing 0 most likely
means "as low as possible", so revisit it as a decision, not as a tidy-up.

Covered by `tests/corner-tn.test.mjs` (19 assertions: precedence, the p.112 floor of 2, the
never-NaN guarantee, and the typed-0 case). The *handlers* remain untested — they need a live
chat-card DOM plus actors, which the harness does not stub — but the rule they all share no longer
does. Left alone deliberately: the two `dlg.element` reads at `SR3EActor.js:6954` and `:7115` are
setup dialogs that **produce** `ctx.atkTN`, not consumers of it.

### Enabler worth knowing before starting

`postMeleeCard` stringifies the **whole `ctx`** into the payload, and the handler already falls back
to it for skill dice and damage codes. So the opponent's corner does **not** need new transport —
read *your* corner from the DOM and take theirs from `ctx`. That makes the single-card option
materially cheaper than splitting, and is the recommended shape.

All seven non-melee buttons are already permission-gated ([#27](#27)), so the exposure is reduced but
the structure is untouched: each still lets one client edit the other side's pool, TN and damage.
`_mineAny` on the two-corner cards is explicitly a stopgap this task is meant to retire.

## 27. ✅ Audit every chat-card button for who may click it — **one left, by design**

**✅ DONE — 33 of 34 gated.** The only ungated button is `.sr-melee-roll-btn`, deliberately left
for [#24](#24), which deletes it rather than guarding it. Kept for the record; this file is the
progress, not a queue.

### ⚠ This task's own inventory was wrong — verify lists, don't trust them

It was first marked done at "27 of 28" against **the list written below**, which was incomplete.
Sweeping every `-btn` class actually emitted in card HTML against the handlers in `sr3e.js` found
**six more ungated**, none of them named below:

`.sr-cc-roll-btn` · `.sr-matrix-ic-resist-roll-btn` · `.sr-matrix-decker-resist-btn` ·
`.sr-matrix-decker-resist-roll-btn` · `.sr3e-place-ward-btn` · `.sr3e-ward-resist-btn`

The last two were missed originally because the inventory enumerated the `sr-` prefix and these use
**`sr3e-`**. So "6 of ~31" was never the real denominator. The sweep that gets it right:

```bash
for c in $(grep -rhoE 'class="sr[0-9a-z-]*-btn"' scripts/*.js scripts/documents/*.js \
           | grep -oE 'sr[0-9a-z-]*-btn' | sort -u); do
  ln=$(grep -n "querySelectorAll('\.$c')" scripts/sr3e.js | head -1 | cut -d: -f1)
  [ -z "$ln" ] && { echo "NO HANDLER  .$c"; continue; }
  n=$(sed -n "${ln},$((ln+10))p" scripts/sr3e.js | grep -cE "_denyBtn|_mine|_isDecider")
  [ "$n" = "0" ] && echo "UNGATED  .$c"
done
```

### What the audit actually found

The ⚠ below was right, and it was the whole job. **11 of the 21 buttons named an actor under a key
`_payloadActorId` does not resolve** — `deckerActorId` (×3), `conjurerActorId`, `passengerActorId`,
`targetVehicleId`, `defenderActorId`, `atkActorId`/`oppActorId`, `intruderRiggerId`/
`defenderRiggerId`, and `attackerActorId`/`defenderActorId`. Gating those with plain `_mine` would
have failed closed and quietly made each one **GM-only** — a worse bug than the one being fixed,
and invisible to whoever shipped it.

So `_mineId(id)` / `_isDeciderId(id)` were added, taking the id explicitly. Widening
`_payloadActorId` to swallow every key was rejected: it would drag `attackerActorId` in through the
back door on cards carrying both, and an attacker must never inherit rights over their target's card.

### Two-corner cards are only half-fixed — and there are **eight**, not three

Every one of these carries **both** participants' editable inputs with a single button rolling the
whole exchange. Gating narrows *who* may click; it does not make each side edit only its own corner.
Full list, since the count kept growing as it was checked properly:

| Card | Button | Gate now |
|---|---|---|
| Melee boxing | `.sr-melee-roll-btn` | **ungated** — [#24](#24) deletes it |
| Astral combat | `.sr-astral-roll-btn` | `_mineAny` |
| Contested test | `.sr-contested-roll-btn` | `_mineAny` |
| MIJI | `.sr-miji-roll-btn` | `_mineAny` |
| Cybercombat (Defragged) | `.sr-cc-roll-btn` | `_mineAny` |
| Orthodox System Test | `.sr-ost-roll-btn` | `_isDeciderId(decker)` |
| Orthodox Cybercombat | `.sr-occ-roll-btn` | `_isDeciderId(decker)` |
| Orthodox IC Attack | `.sr-icia-roll-btn` | `_isDecider` → IC |

The three Orthodox Matrix cards give themselves away in the markup — they reuse the melee layout
classes verbatim (`sr-melee-boxing`, `sr-melee-vs`, `sr-miji-corner`), so they are the same card with
different labels. MIJI's own card is described in CLAUDE.md as *"cloned from the melee boxing card"*.
The flaw spread by copy-paste, which is why finding one meant finding eight.

**[#24](#24) should take all eight**, not just melee — its scope note has been widened to say so.

### ⚠ Landmine found on the way — `node --check` proves nothing here

The 21 gates were inserted by script, and 11 of the deny messages contained an unescaped apostrophe
(`the decker's owner`). **`node --check scripts/sr3e.js` exited 0 on the broken file.** Every file
under `scripts/` is an ES module in a `.js` file, and for those Node re-parses as ESM and silently
stops reporting syntax errors. ESLint caught it instantly. See the entry now at the top of
CLAUDE.md's *Known issues*.

Previously gated: `.sr-soak-btn`, `.sr-dodge-declare-btn`, `.sr-dodge-roll-btn`, `.sr-soak-roll-btn`,
`.sr-explode-btn`, `.sr-assign-damage-btn`.

Two of the original ~31 are gone rather than gated: [#28](#28) deleted the Spell Defense
declaration card, taking `.sr-sd-declare-commit-btn` and `.sr-sd-declare-skip-btn` with it. Worth
remembering as a pattern — moving a decision onto the deciding player's own client removes the
button instead of guarding it, which is the stronger fix where the flow allows it.

**The predicates already exist** (`sr3e.js`), so each remaining button is roughly a line:

| Helper | Use for |
|---|---|
| `_mine(p)` | buttons that post a card onward — any owner, or a GM |
| `_isDecider(p)` | buttons that **roll** — exactly one user, via `SR3EQuery.deciderFor` |
| `_denyBtn(btn, why)` | dims and explains on hover, instead of silently doing nothing |
| `_payloadActorId(p)` | resolves whichever actor key the payload carries |

Ungated, roughly by risk:

- **Rolls someone else's dice:** `.sr-melee-roll-btn` (rolls *both* corners — see
  [#24](#24)), `.sr-spell-resist-roll-btn`, `.sr-drain-roll-btn`, `.sr-astral-roll-btn`,
  `.sr-astral-soak-roll-btn`, `.sr-contested-roll-btn`, `.sr-icia-roll-btn`, `.sr-ost-roll-btn`,
  `.sr-occ-roll-btn`, `.sr-miji-roll-btn`, `.sr-ram-passenger-resist-btn`
- **Writes state:** `.sr-icia-assign-btn`, `.sr-miji-degradation-btn`, `.sr-summon-confirm-btn`
- **Posts a card:** `.sr-spell-soak-btn`, `.sr-drain-btn`, `.sr-astral-soak-btn`,
  `.sr-spell-defense-btn`, `.sr-spell-defense-proceed-btn`, `.sr-aura-reading-btn`,
  `.sr-ram-vehicle-soak-btn`, `.sr-matrix-ic-resist-btn`

⚠ **Check each payload's actor key before assuming.** `_payloadActorId`'s precedence is
`actorId → icActorId → vehicleActorId → wardActorId → targetActorId`, and it is load-bearing:
a wave payload carries *both* `actorId` (roller) and `targetActorId`, and `attackerActorId` is
excluded on purpose so an attacker never inherits rights over their target's card. A button whose
payload names its actor some other way will fail closed and only the GM will be able to click it.

## 28. ✅ Spell Defense is declared for everyone, on the GM's screen

**✅ DONE.** Declaring is now a per-mage `DialogV2` on that mage's own client, fanned out as
`sr3e.spelldefense.declare` to `SR3EQuery.deciderFor(actor)`. Kept for the record; this file is the
progress, not a queue.

Two notes for anyone revisiting it:

- It was a **public chat card**, not a dialog as described below — which made it slightly worse
  than written, since any player could click Commit for the whole table, not just the GM.
- The asks are **deliberately not awaited as a set**. Point 3 below ("never block round start on a
  human") is not satisfied by the reaper rule alone: `ask`'s fallback covers an *unreachable*
  decider, but an **active-but-AFK** one would still hold the round for the full timeout if the
  caller awaited. Firing them in parallel without awaiting keeps the old card's non-blocking
  behaviour and changes only who decides.

`handleSpellDefenseDeclareCommit`, the two chat-button handlers and the whole
`.sr-sd-declare-*` CSS block are gone with it. Covered by `tests/spell-defense.test.mjs`.

⚠ Citation drift, now corrected: `promptSpellDefenseDeclaration` was cited below at
`SR3EActor.js:4533`; it was actually at `:4555` by the time this was implemented.

**Found in play 2026-08-05.** Starting a round pops a magic window on the GM that decides for the
players' mages too.

`SR3ECombat.js:115` calls `SR3EActor.promptSpellDefenseDeclaration(combatants)`
([`SR3EActor.js:4533`](scripts/documents/SR3EActor.js)), which builds **one dialog with a row per
Sorcery-capable actor** and opens it on whichever client advanced the round — in practice the GM.
So the GM allocates every player mage's Sorcery and Spell Pool dice for the round.

This is exactly the dodge bug in a different costume, and it is arguably worse: Spell Defense
commits **Spell Pool** for the whole round, so a bad guess costs the player their spellcasting, not
just one exchange.

**Fix — reuse the ranged pattern, don't invent one:**

1. Split the single multi-row dialog into a per-actor declaration.
2. Relay each to `SR3EQuery.deciderFor(actor)` via `SR3EQuery.ask`, in parallel — they are
   independent, and serialising them makes round start drag once there are two mages.
3. Same reaper rule as dodge: an unreachable or AFK mage declares **nothing** and the round
   proceeds. Never block round start on a human.
4. The GM keeps a view of the results — they need to know what was committed.

The *write* is already correct: `commitSpellDefense` routes through the GM (socket Stage 1), so
this is purely about who makes the decision, not who performs it.

## 29. ✅ Group the modifiers in the GM's TN window

**✅ DONE.** `group` added to every `SR3E_RANGED_MODIFIERS` row — including the `auto` and deferred
ones, so promoting a row to `mvp` needs no other change — plus `SR3E_MODIFIER_GROUPS` for order and
headings, and `mvpModifierGroups()` to bucket them. The dialog renders headings with
`grid-column:1/-1` so a group always starts a fresh line. Kept for the record; this file is the
progress, not a queue.

A fourth group, **Conditions**, was added beyond the three below: visibility and blind fire are
neither Target nor Attacker nor Gear. Visibility now renders in it (two dropdowns — condition and
vision type — resolving against the Visibility Table); blind fire is still deferred. Empty groups
are dropped rather than shown as a bare heading, so the group would vanish again if both went.

Made **fail-visible** on the way: a row whose `group` is missing or unrecognised lands in a trailing
**Other** bucket instead of disappearing. Silently dropping it would remove a modifier the GM is
meant to adjudicate, and a typo in a `group` string is exactly the kind of thing nobody notices
until a shot resolves wrong. `tests/combat-modifiers.test.mjs` asserts that, that grouping never
loses or duplicates a row, and that every row in the table declares a group that actually exists.

Requested from play 2026-08-05 — the window reads as a flat list of unrelated checkboxes.

`_promptGMAttackWindow` renders `mvpModifiers()` in table order, which is the *book's* order, not a
useful one. Group by what the GM is actually looking at when they tick it:

| Group | Rows |
|---|---|
| **Target** | Partial cover · Target running · Target stationary |
| **Attacker** | Attacker running |
| **Gear** *(pre-ticked from the weapon and cyberware)* | Smartlink · Smart goggles · Laser sight |

Gear especially wants separating: those three are **guesses the system made**, not judgements the
GM is being asked for, and they currently sit indistinguishable among rows that are.

Add a `group` field to `SR3E_RANGED_MODIFIERS` rather than hard-coding the layout in the dialog, so
the deferred rows ([#18](#18), visibility, blind fire, multiple targets, walking) drop into place
when they land instead of forcing a re-sort.

Keep the two-column grid — group headers span both columns.


---

### 🔴 Confirmed bugs, still open

## 50. ✅ Ranged attack: no GM TN window, and the TN is read-only — **FIXED**

**Found in play 2026-08-12, fixed the same day.** Two symptoms, and only one was a bug.

**The missing window was correct behaviour.** The `gmApprovesTN` world setting defaults to
`'player'`, which skips the GM window when the *requester is a GM* — so GM-vs-NPC costs the GM
nothing. Set it to **"Always, including GM attacks"** to get the p.112 modifier checkboxes when
running NPC against NPC, which is what was actually being asked for.

**The read-only TN was the bug, and it was a truthiness trap.** The caller decided whether to lock
the attacker's field with:

```js
gmSetTN: gmTNDelta !== 0 || negotiation?.mods       // ← `mods` is {} on the skip path
```

The skip path returns `{ tn: ctx.baseTN, mods: {} }`, and **`{}` is truthy**, so `gmSetTN` was true
on every attack where no GM had looked at anything. `gmTNDelta` was 0 (the TN passed through
untouched), so the lock fired purely on the empty object. Result: a target number that could not be
set by any route — the field was read-only and no window opened to replace it.

**Fix:** the handler now returns an explicit `adjudicated` boolean — `false` on both skip paths
(`off`, and `player` + GM requester), `true` once the window has run — and the caller keys the lock
on that instead of on the payload's shape. A GM who opens the window and changes nothing still
counts as having adjudicated: *"I looked, 4 is right"* is a decision.

Covered by `tests/attack-negotiate.test.mjs`, which pins the exact shape that lied — asserting both
that `mods` is truthy **and** that `adjudicated` is false in the same breath, so removing `mods` from
the payload cannot quietly reintroduce the trap.

### The original report, kept for the record

**Setup:** GM logged in to the Foundry app, both combatants GM-owned NPCs — a SWAT team member
attacking a troll street dealer. New combat started, GM directed the attack. **Ranged.**

**Symptom, two halves:**

1. The **GM TN window never opened** ([#29](#29)'s window, which shipped on this branch).
2. The **TN field in the roll-options dialog was not editable**, so there was no way to set a target
   number by any route.

⚠ **The second half is what makes it a dead end rather than a missing feature.** The roll-options TN
is deliberately read-only *whenever a GM window is expected to open* (`gmApprovesTN`, CLAUDE.md
"Ranged combat flow" step 5). Those two behaviours are supposed to be two sides of one decision, so
when the window does not appear the lock has nothing to hand off to and the GM is left with a number
they cannot change.

Requested alongside it: *"it would be nice if I got the options in the TN window here"* — i.e. the
p.112 modifier checkboxes, which is what the window is for.

**Not the same as [#37](#37)** — that is melee having no GM window at all, by construction. This is
the ranged path, where the window exists and did not appear.

Context worth preserving for whoever picks this up, **as facts rather than as a diagnosis**: the
attacking user *was* the GM, and both actors were GM-owned. Whether either of those matters is
unknown — the earlier report of a missing TN window (2026-08-10) was **melee**, player-vs-player,
and is a different case.

## 46. ✅ No usable way to equip a melee weapon — **FIXED 2026-08-12**

The reported symptom was never reproducible and the code trace below found no path that
renders a melee row without the control. So the fix targets the two things that were
genuinely wrong, rather than a rendering bug that does not exist:

**1. The control did not read as a control.** Unequipped, it was one more grey glyph in a row
of four to six (home, dice, fist, edit, trash, plus Focus?/Active? on an Awakened sheet), with
nothing marking the single control that decides how the character fights. It is now a
**labelled `btn-xs` button** — `Equip` / `✦ Equipped` — matching the Focus?/Active? buttons
already in that same row. The equipped state is stated in words instead of a colour shift that
means nothing until you have seen both states side by side.

**2. The bare-hands fall-through was silent.** `_getEquippedMelee` goes equipped item → first
CYB/UNA item → synthesised Bare Hands without a word, so a character carrying a pole arm who
never pressed Equip defended bare-handed at reach 0 — and the only place that surfaced was
mid-combat, as a defaulting prompt nobody expected. The Melee section now states **"Defends
with: X (Reach N)"**, and turns **amber with a prompt to press Equip** when armed melee weapons
are owned but none is equipped.

⚠ The amber warning is deliberately keyed on *owning armed melee while equipping nothing*, not
on defending bare-handed. A character with no melee weapons at all fighting bare-handed is
simply correct and must not be nagged about it. Branch logic verified across all four cases:
equipped, owned-but-unequipped (warns), nothing owned (quiet), and cyber-implant fallback
(quiet — spurs are a real answer).

**Not addressed, and still true:** nothing tells you when an item is the wrong *type*. A pole
arm saved as `gear` never enters `melees`, so it shows no row at all and the new line simply
reports Bare Hands without complaint. Detecting that would mean guessing which non-melee items
"look like" weapons, which is speculative enough to want its own decision.

### The original report and code trace

**Found in play 2026-08-10.** Logged from the table; **not investigated** — record only.

The equip control (a `fa-hand-rock` fist icon, `data-action="equipMelee"`, on each melee row of the
Weapons tab) **was reported as not showing**, and the weapon was consequently **never equipped**.

**This is the root of [#45](#45)**, and possibly [#44](#44). With `system.equippedMelee` unset,
`SR3EItem._getEquippedMelee` falls through — equipped item → first cyber/unarmed item → synthesised
**Bare Hands** `(STR)M Stun`, reach 0, category `UNA`. A pole-arm carrier therefore fights bare-handed
with an Unarmed Combat skill lookup, and every downstream symptom follows from that.

**Not yet established:** whether the icon is genuinely absent, or present but unnoticed — unequipped
it carries no colour, so it sits among the edit/delete icons looking identical to them. The handler
and action registration both exist (`SR3EActorSheet.js:39`, `:2974`, `:2582`), and `_meleeControls`
is called from all three melee sections, so nothing obvious explains an absence.

**Settles it in one line, in-world:**

```javascript
game.actors.getName("NAME").items
  .filter(i => i.type === "melee")
  .forEach(i => console.log(i.name, "| category:", i.system.category || "(blank)"));
```

Empty output → the weapon is not item type `melee` and never reaches a melee section, so the missing
icon is a symptom rather than the fault. Output present → the icon is rendering and this is a
visibility/discoverability problem.

⚠ **Worth fixing regardless of cause, because the failure is silent.** Falling back to bare hands
without a word is defensible for a character who genuinely has none; doing it to someone carrying a
pole arm is not. And [#24](#24) makes the corners read-only, at which point a wrong default weapon
becomes uncorrectable mid-exchange.

### Code traced 2026-08-11 — there is NO path that renders a melee row without the icon

`melees` is `type === 'melee' && !_stored(i)` (`SR3EActorSheet.js:945`), split three ways —
`armedMelee` (`EDG`/`CLB`/**`POL`**/`WHP`), `unarmedCyber` (`CYB`/`UNA`), and `uncategorisedMelee`,
which has its own amber "set category in item sheet" header. **All three call `_meleeControls`**, and
the fist at `:2582` is unconditional inside it. Pole arms are in `ARMED_CATS`, so they are not a
special case.

The glyph resolves too: Foundry ships **Font Awesome Pro 7.2.0**, which defines
`.fa-hand-rock{--fa:"\f255"}` as an alias for `hand-back-fist`. A stale FA5 icon name was the obvious
suspect and it is not the cause.

So the row itself was absent, or the icon was present and unrecognised. Three candidates, in order:

1. **The item is not type `melee`** — never enters `melees` at all.
2. **The item is in storage** — `_stored(i)` removes it from the Weapons tab entirely.
3. **It rendered and was not spotted.** The *unequipped* fist carries no colour, sitting among four
   to six similar grey icons (home, dice, fist, edit, trash — plus Focus?/Active? on an Awakened
   sheet). Nothing distinguishes the one control that changes how the character fights.

⚠ **Still unconfirmed** — the reporting world was a production system, and the test case no longer
exists to re-check. Do not close this from the code trace alone; that is exactly the reasoning that
produced [#45](#45)'s wrong first diagnosis. But do not assume a rendering bug either.

**The generalisable fault, whichever way it lands:** *nothing tells you when an item is the wrong
type.* A pole arm saved as `gear` is silently not a weapon — it appears on a tab, looks owned, and
never reaches any combat path.

## 45. ✅ Defender is asked to default despite having the skill AND the weapon — **FIXED 2026-08-12**

The prompt itself was **correct** — the weapon was not equipped ([#46](#46), now fixed), so the
lookup had fallen through to Bare Hands, which genuinely has no Unarmed Combat. Both remaining
items are resolved:

**The hardcoded message — fixed.** `_applyMeleeDefault` said *"has no Unarmed Combat / Martial Arts
skill"* whatever was being wielded. It now names **the weapon and the skill that weapon actually
needs**:

> *Bare Hands needs Unarmed Combat / Martial Arts, which Dave does not have — choose how to default:*

⚠ **This is the message that would have diagnosed #46 on sight.** A player holding a pole arm reads
"Bare Hands needs…" and instantly knows the weapon is not equipped; the old wording instead implied
the *skill lookup* was broken, and sent two days of investigation in the wrong direction.

**The wording cannot drift from the rule.** `_buildMeleePoolInfo` — the function that actually
performs the lookup — now returns `requiredSkill` and `unarmedContext`, and the message reads those
rather than re-deriving them. This matters for `CYB`: it maps to *Cyber Implant Combat* but the
lookup **also accepts any `MA:` skill**, so a message keyed on the skill name alone would omit the
martial arts that would have satisfied it. Verified: a character with only *MA: Karate* wielding
spurs gets **no prompt at all**, and when the prompt does fire for spurs it names Martial Arts as
accepted.

**Ordering — was never wrong.** The adjacency check runs at `rollMeleeAttack`'s line 182, *before*
the defaulting at 198. It warns rather than blocking, which [#44](#44) settled as intended, so a
prompt appearing on an out-of-range attack is the documented behaviour and not a sequencing fault.

### The original report

- **The hardcoded message.** `_applyMeleeDefault` passes a fixed *"has no Unarmed Combat / Martial
  Arts skill"* string regardless of the weapon's actual skill. It happened to be accurate this time,
  which is exactly why it is dangerous — it will name the wrong skill for an armed defaulter and
  make every case look like an unarmed one, masking faults like #46.
- **Ordering.** The prompt fired **even with the attacker out of melee range**, so defaulting is
  resolved before or independently of the adjacency check. Related to [#44](#44).

**Originally observed:**
- Defender has **Pole Arms 6** and a pole arm **in inventory** (believed equipped; it was not)
- On an incoming melee attack, the **SR3 Default Table opens for them**, saying they have
  *"no Unarmed Combat / Martial Arts skill"*
- It appears **even when the attacker is out of melee range**

**Three separate things may be wrong here — establish which before fixing any:**

1. **Wrong skill sought.** The defender's equipped weapon is category `POL`, which maps to
   *Pole Arms/Staff* in `WEAPON_SKILL_MAP` — not Unarmed Combat. Either the weapon is not being
   found and the fallback to bare hands (`UNA`) is selecting the unarmed skill, or the lookup is
   ignoring the weapon.
2. **The message is hardcoded regardless.** `_applyMeleeDefault` in `rollMeleeAttack` passes a
   fixed *"has no Unarmed Combat / Martial Arts skill"* string, so even a correct defaulting prompt
   for a pole-arm user would name the wrong skill. That much is cosmetic, but it **masks** cause 1
   by making every case look like an unarmed case.
3. **Ordering.** The prompt fires even when the attacker is out of range, so defaulting is being
   resolved before or independently of the adjacency check — see [#44](#44), which reports the
   range check behaving unexpectedly in the same session.

⚠ **Likely shares a root with the unresolved equip-melee question** (the fist icon reportedly not
showing on the Weapons tab). If `system.equippedMelee` is never set, `_getEquippedMelee` falls
through to cyberware and then to bare hands — which would produce exactly this symptom, an unarmed
skill lookup for a character holding a pole arm. **Check that first**; it may collapse this,
[#44](#44) and the icon report into one cause.

## 44. ✅ Melee reach/range — **NOT A BUG, it warns rather than blocks**

**Reported then resolved in the same session, 2026-08-10.**

Re-tested deliberately at **6 m with a reach-3 pole arm**: the system posts
*"PlayerN is 6m away — out of reach for a melee attack"* **and the attack proceeds anyway.** The
first report — a pole arm *"not able to reach"* at distance 2 — was the warning being read as a
rejection. Working as designed:

> "**Adjacency:** if both are tokens and the target isn't in an adjacent square
> (`SR3EItem._tokensAdjacent` via `canvas.grid.getOffset`), `rollMelee` **warns but proceeds**
> (minimal-guardrails). Reach affects TN only, not range." — CLAUDE.md

Both halves check out: the guardrail is advisory, and **reach does not extend melee range** — it is
a target-number differential. SR3 melee assumes engaged combatants, so a reach-3 weapon does not let
you strike from 6 m; it makes you harder to reach *while* engaged.

**Left open as a design question, not a defect:** whether the warning should say something better
than "out of reach" — the phrasing implies a block that does not happen, which is what caused the
misread. Something like *"6m away — not adjacent; attacking anyway"* would describe what the system
actually does.

**Why it looks wrong rather than merely surprising** — two documented behaviours it appears to
contradict, both worth re-checking before assuming a fix:

1. *"Reach affects TN only, not range"* (CLAUDE.md, melee flow). Reach is a target-number
   differential; it is not supposed to extend how far you can strike. So a reach-2 weapon failing
   at distance 2 may be the **adjacency** check firing, not reach.
2. *"`rollMelee` **warns but proceeds**"* — the adjacency check (`SR3EItem._tokensAdjacent`, via
   `canvas.grid.getOffset`) is explicitly minimal-guardrails: it should surface a warning and let
   the attack happen anyway. *"Was not able to reach"* suggests something **blocked**, which would
   be a departure from that.

**To establish when picking this up:** whether the attack was blocked or merely warned; what
`canvas.grid.measurePath` actually returns for that token pair; whether grid units are metres and
what one square is meant to represent; and whether reach should modify the adjacency threshold at
all (SR3 melee assumes engaged combatants — a pole arm's reach is a TN edge, not a second square).

## 43. ✅ Resist cards spend pool dice for free — **DONE 2026-08-13**

**Fixed 2026-08-12 for the damage soak card** (`_postSoakCard` / `handleSoakRollClick`):

- **Two fields, not one.** `sr-soak-body` (free) and `sr-soak-cp` (charged), because a single
  merged number made it impossible to tell which dice needed paying for.
- **The pool is shown**, capped at what is available, and when it is empty the card says so in
  amber rather than silently offering nothing. That is the p.113 trade becoming visible: a
  defender who burned pool on a failed dodge arrives at the soak with less.
- **Charged through `spendCombatPool`**, so a player without UPDATE on their own actor still lands
  the write on the GM.
- **Charged AFTER the roll is certain.** The physical-dice path is cancellable, and spending first
  would bill an actor for a roll that never happened. A shortfall (concurrent spend between the
  local clamp and the write) warns rather than silently rolling dice the actor does not have.
- The result label now reads `(4 Body + 2 Combat Pool)` so the split is legible afterwards.
- `.sr-soak-roll-btn` was already `_isDecider`-gated, which matters more now that it writes.

### ✅ Cybercombat's defender — fixed 2026-08-13

Found while covering the card in [#24](#24), and it was the worst case of this fault in the
system: the defender's Hacking Pool was **never charged at all**, so a defending decker drew
free pool dice every exchange indefinitely. Both sides now go through `spendHackingPool`,
which routes via the GM, queues per actor, and **returns what was actually deducted** — and
that is what gets rolled, so over-allocation can no longer buy dice either.

⚠ `spendHackingPool` itself clamped against `availableHackingPool`, which is `null` for an
Orthodox decker — so every Orthodox spend silently clamped to 0. It now falls back across
both derivations. A spend returning 0 looks exactly like choosing to spend nothing, which is
why this survived so long.

### ✅ The siblings — audited 2026-08-13, and the audit changed the answer

This task told the next person to *"audit the rule before copying the fix into each"*. Doing
that found the task's own premise was wrong, and that three of the five listed fields were
never bugs.

**🔴 The premise was wrong: SR3 DOES allow Spell Pool against Drain.** p.43, in consecutive
sentences:

> "Dice from the Spell Pool can be used to augment Spell Success Tests and **Drain
> Resistance Tests** in spellcasting (p. 183), Dispelling (p. 184), and for Spell Defense
> (p. 183). Dice from the Spell Pool **cannot** be used to augment **Conjuring** or any
> other magic-related tests."

and, a few lines later:

> "There is **no limit** to the number of dice a character may draw from the Spell Pool for
> the Drain Resistance Test."

That last line lifts the usual per-test pool cap; it does **not** mean a caster can spend
dice they do not have. So `sr-drain-spell-pool` is legitimate and stays.

**What was actually broken: over-allocation.** `handleDrainRollClick` built the dice from the
raw input while clamping only the spend, so typing 99 rolled 99 and paid whatever was left.
The input's `max` is a browser hint enforced for spinner clicks, not a gate. Now the roll is
built from what `spendSpellPool` **returned**, and a shortfall warns rather than silently
rolling dice nobody paid for — the same defect, and the same fix, as the cybercombat
defender's Hacking Pool.

**Conjuring drain is now correct by RULE, not by accident.** The conjuring payload happens
not to set `spellPoolForDrain`, so the field was already absent — but adding that field later
would have quietly granted dice the book forbids. `_postDrainCard` now refuses it outright
when `resistAttr === 'charisma'`.

**The other three were never pool bugs.** `sr-astral-soak-pool` (Willpower / Astral Body),
`sr-matrix-resist-pool` (the entity's own rating) and `sr-matrix-decker-resist-pool` (deck
MPCP) are **attribute** fields. Attributes cost nothing, and every stat in this system is
editable by design — that is the ethos, not an oversight. `sr-drain-pool` is Willpower, same
thing. Listing them here conflated "a number you can edit" with "a limited resource you must
pay for"; only the second is this task.

Verified live in `tests/e2e/spellcasting.spec.mjs`, which now rolls the drain asking for 99
dice and asserts the caster is charged exactly what remained and ends on an empty pool.

### 📌 Noticed while auditing — NOT fixed

**Astral damage resistance offers no Astral Pool.** Combat Pool augments the physical Damage
Resistance Test (p.113's worked example turns on Snot having none left), and the Astral
Combat Pool is described as "similar to the Combat Pool" for astral combat. By analogy the
astral soak card should offer it and charge it. That is a **missing option**, not dice being
given away, so it is out of scope here — but it is the one place a pool arguably *should*
appear and does not.

### The original report

**Found in play 2026-08-10.** The soak card offers one field and never charges for it:

```html
Resist Pool (Body ${body} + bonuses):
<input type="number" class="sr-soak-pool" value="${body}" min="1" max="30"/>
```

`handleSoakRollClick` reads `.sr-soak-pool` and rolls it. **`spendCombatPool` is never called** on
that path. So a player can type any number up to 30 and roll it, every time, at no cost — Combat
Pool on a soak is currently unlimited.

**The pool is legitimately usable here**, which is why the field exists — core **p.44**:

> "Combat Pool dice can affect a Ranged Combat or Melee Combat result. Whenever a character takes
> damage from a ranged or melee attack, he or she can allocate dice to either dodge the attack or
> **'soak up' the damage**."

The rule is right; the accounting is missing.

### Three parts to this

1. **A separate Combat Pool box.** Today Body and pool are one number, so nothing can tell which
   dice are free and which must be charged. Body dice are not spent; pool dice are.
2. **Show what is available** — the card gives no indication the actor even *has* a pool, let alone
   how much is left after a dodge.
3. **Actually spend it**, routed through the GM like every other write
   (`spendCombatPool` → `sr3e.pool.spend`).

⚠ **The dodge interaction is the point of the rule, and it is currently invisible.** Pool spent
dodging is gone from the soak — p.113's worked example turns on exactly this: Snot burns all five
dice dodging, fails, and then has *"no dice remaining in his Combat Pool with which to increase his
odds of survival."* [#26](#26) already carries dodge successes into the soak; the card must also show
the **reduced** pool, or the trade the rule exists to create is invisible at the table.

⚠ Cap the input at what is actually available once it is charged, or the first over-allocation will
silently roll dice the actor does not have.

**Check the sibling cards in the same pass** — `sr-astral-soak-pool`, `sr-drain-pool`,
`sr-matrix-resist-pool` and `sr-matrix-decker-resist-pool` share this shape and were written the same
way. `sr-drain-spell-pool` likewise for Spell Pool.

## 42. ✅ Chat cards carry no shared state — **PRIMITIVE BUILT 2026-08-12**

`sr3e.card.mark` (SR3EQuery) writes an `acted` flag on the **message**, GM-side. Flags are
document data, so Foundry syncs them and re-renders the card on every client — which is the
whole point: the GM no longer has to infer "has anyone answered?" from whether a downstream
card appeared.

**Client side** (`sr3e.js`): `_markActed(messageId, role, label)` routes the write,
`_actedOn(message)` reads the ledger, and `_renderActedStrip(message, html, roles)` draws a
`✓ Snot · waiting for target` strip **and disables any button whose role is already claimed on
every client** — without that second half the strip would say one thing while the buttons
allowed another.

**Wired to** the dodge-declare and soak-roll cards, the two places a human is actually being
waited on. The dodge mark is written **before** the dialog opens, because the interval that
needed exposing is exactly the one where somebody is deciding how much pool to burn.

⚠ **`_usedButtons` is NOT replaced and must not be.** It stops one browser double-firing when
the pop-up and the chat log render the same card, which synced state cannot do — the two
renders share a client. The mechanisms are complementary; deleting either reintroduces a
distinct bug.

⚠ **The ledger is append-only.** A second claim on a role returns the first untouched. This is
load-bearing for [#24](#24)'s "last one to submit triggers the roll": that flow is only
well-defined if who-was-first is immutable. Pinned in `tests/card-acted.test.mjs`, along with
role independence (marking the defender must not disturb the attacker), the non-GM refusal, and
errors for unknown message / missing role.

**Not done — deliberately.** Not retrofitted onto the other ~30 button classes: each mark costs
a document write, and most cards have nobody to wait for. [#24](#24) is the consumer that will
extend the role list to two corners; [#48](#48) should reuse this same
state-on-a-synced-document approach rather than inventing a second one.

### The original report

**Found in play 2026-08-10:** *"cards in the chat log don't look like anyone has done it to the GM."*

Correct, and by construction. Both mechanisms that mark a button as used are **per client**:

```js
const _usedButtons = new Set();   // sr3e.js:1962 — module-scoped, "clears on page reload"
btn.disabled    = true;           // DOM mutation, on the clicking client only
btn.textContent = '⏳ Rolling…';
```

A player clicks; the button greys out **on their screen**. Every other client — including the GM's —
still shows the card untouched, with live buttons. The card carries **zero shared state**.

That is deliberate for the double-click guard, which only ever needs to stop *one* client
double-firing (see the one-shot guard section in CLAUDE.md). It was never meant to communicate.
The consequence is that the GM only learns something happened when a *downstream* card posts — the
dodge roll, the soak — and until then cannot distinguish "still thinking" from "already answered".

### ⚠ This blocks [#24](#24)'s decided flow

The agreed melee flow is *"both players enter their choices, the last one to hit submit triggers the
roll."* There is no "last one" without knowing who is already in, so #24 **cannot be built on the
current card**. Same missing primitive, and #24 forces it.

### Fix shape

Submission/acted state in **message flags**, written by the GM via a query — flags are document
data, so Foundry syncs them and re-renders the card on every client. A `✓ Attacker ready · waiting
for defender` strip then shows for the whole table.

- **Does not replace `_usedButtons`.** That still guards the pop-up/chat-log double-render locally,
  which flags cannot do — the two renders share a client.
- **Costs a document write per click.** Fine at melee's cadence; do **not** retrofit it onto every
  button in the system.
- Worth generalising past melee — a "who has acted" strip is equally useful on soak and resist
  cards, which is why this is its own task rather than a sub-part of #24.

## 5. ✅ Make essence loss permanent when cyberware is removed — **DONE 2026-08-14**

**The rule is in Man & Machine, not core** — worth knowing, because a core-only search comes
up empty and reads as "the book never says this". **M&M p.147**, REMOVE CYBERWARE:

> "Cyberware that is removed **does not restore the character’s lost Essence**. Removing
> cyberware incurs permanent damage to the implant (1D6 ÷ 2 Stress)."

Core only ever says the cost applies "when the cyberware is installed" (p.60) and never
addresses removal at all.

⚠ An earlier draft of this entry cited **SR3 p.90**. That is the Skills chapter and says
nothing about Essence — the number was carried forward unchecked. Verify page citations
against the PDF; this file is read as an authority.

`attributes.essence.lost` is a persisted, permanent record of Essence spent; the derived
value is `base − max(lost, installed)`.

**The `max` is a migration device, not the rule.** An actor saved before this field existed
arrives with `lost: 0` and its fitted hardware alone still reads correctly — which is why
this needed no migration script. Once anything is installed, the hook seeds the mark.

### 🔴 A high-water mark is NOT the right model, and only e2e caught it

The obvious implementation — store `max(lost, currentlyInstalled)` — passes every arithmetic
test and is still wrong. Rip out 2.0 of wired reflexes, fit 0.5 of cybereyes: the max is
still 2.0, so **the new chrome costs nothing**. Installing always deepens the loss, whatever
came out before it.

The rule is therefore an ACCUMULATOR:

```
lost = max(lost, installedBeforeThisItem) + thisCost
```

The `max` term seeds an un-migrated actor from what they are already carrying; the `+ cost`
is the actual rule. Caught by `tests/e2e/essence.spec.mjs` on a real world, after the unit
suite was green — the arithmetic was never what broke.

### ⚠ There is deliberately NO delete hook

Removal must not touch the mark. Anything running on delete could only lower it, which is
precisely the refund this task exists to prevent. The single hook is on `createItem`.

*(An earlier draft used `preDeleteItem` to record the mark before removal. It works, but it
is redundant once installs accumulate — and a hook that fires on delete is a standing
invitation for someone to later "fix" it into lowering the mark.)*

### The manual control now actually works — and its one limit

The sheet has always shown an editable Essence box bound to `system.attributes.essence.value`.
That field is DERIVED and rewritten every `prepareDerivedData`, so a GM's correction reverted
with no error whatsoever. `SR3EActor._preUpdate` now rewrites a direct write to `value` as the
`lost` it implies, so the box does what it looks like it does.

⚠ **A GM cannot claim MORE Essence than the installed hardware allows** — the derivation
floors on `max(lost, installed)`, so 3.0 of fitted chrome holds Essence at 3 however high the
box is set. That floor is what keeps pre-fix actors reading correctly, and it is not worth
trading away: alphaware and betaware express their discount in the item's `essenceCost`, not
by overriding the total.

### Blast radius, now contained

Bio Index capacity (`essence + 3`) and effective Magic (`essence − totalBioIndex / 2`) both
hang off this value, so the old refund silently inflated a character's Magic and their
bioware headroom — install, uninstall, come out ahead.

`scripts/macros/import-sr3-character.js` sets `lost: 0` explicitly and relies on the seeding
`max`, so an imported character reads correctly the moment they arrive.

Covered by `tests/essence.test.mjs` (20 assertions on the pure derivation, including that
bioware is excluded and that floating-point costs round cleanly) and `tests/e2e/essence.spec.mjs`
(the ratchet, the remove-then-reinstall case, and the manual control).

## 14. ✅ Fix the wrong flag scope on spirits — **DONE 2026-08-14**

**Seven sites, not five, and the diagnosis was wrong.**

`sr3e` is not a valid flag scope. Foundry accepts only `core`, `world`, `game.system.id` and
active module ids (`client/data/client-backend.mjs` → `getFlagScopes`), and this system's id
is `The2ndChumming3e`.

### 🔴 This task said the reads fail silently. They THROW.

The original note read: *"the reads return undefined and silently fall back to their `??`
defaults."* Checking the engine rather than the note:

```js
getFlag(scope, key) {                                     // document.mjs:947
  const scopes = this.constructor.database.getFlagScopes();
  if ( !scopes.includes(scope) ) throw new Error(`Flag scope "${scope}" is not valid…`);
```

`getFlag` validates identically to `setFlag` (`:975`). So the spirit list and the banishing
dialog were **broken outright**, not quietly degraded — a worse symptom than recorded, and
the reason to read the source instead of trusting the summary.

### Why it survived: the two directions differ

- A **raw create payload** (`{ flags: { sr3e: {…} } }`) is **not** scope-validated. Spirits
  were created with their data in an unreachable namespace, with no error anywhere.
- **`getFlag` / `setFlag` throw.** Every subsequent read blew up.

The two extra sites the task missed are exactly those raw payloads, in
`SR3ESpiritSummoning._createSpiritActor` and the combatant update beside it.

### 🔴 A third bug, unrecorded: services never decreased

`services` was READ from the raw path `flags.sr3e.services` and WRITTEN with
`setFlag(SYSTEM, 'services')`. Both operations succeed — on different keys. So spending a
service wrote a decremented value somewhere nothing ever read, the original count stood, and
**a spirit never ran out of services and never departed.** Only visible in play, over several
uses, which is why no audit caught it.

### The fix

Everything normalised to `The2ndChumming3e` — both raw payloads and all five calls.

Reads go through `SR3ESpiritSummoning._spiritFlag(actor, key)`, which prefers the system
scope and falls back to the legacy **raw path** for spirits summoned before the fix. The
fallback deliberately does not use `getFlag`, because `getFlag` throws on the very scope it
is rescuing — `tests/spirit-flags.test.mjs` asserts that with a stub that enforces Foundry's
real contract, so "simplifying" the fallback fails the suite instead of the session.

It uses `??`, not `||`: services legitimately reach 0 — precisely when a spirit should depart
— and `||` would fall through to a stale legacy count and keep it bound.

The compatibility branch is safe to delete once no pre-fix spirits can plausibly remain.

## 25. ✅ Delete the duplicate `_onRender` in `SR3EHostSheetOrthodox` — **FIXED 2026-08-12**

The dead stub at `:82` is gone; the working definition survives as the class's only `_onRender`.
Its TODO comment was **merged rather than discarded**, and deliberately placed at the **top** of
the surviving method — above `if (!table) return;`. That guard fires on any host with no trigger
table, so notes-enrichment or drag-drop code written below it would have silently not run on
exactly those sheets: the same class of failure as the duplicate itself, one layer down.

This was the **last ESLint error in the project** — `npx eslint scripts tests tools` now exits 0.

### The original report

Sibling of [#16](#16-delete-the-duplicate-refreshastralpool), and the more dangerous of the two.

`SR3EHostSheetOrthodox.js:82` and `:458` both define `_onRender(_context, _options)`. The second
wins, so **:82 is dead**:

```js
// :82 — dead
_onRender(_context, _options) {
  // TODO: enrich notes field, wire drag-drop for IC assignment
}

// :458 — the one that actually runs
_onRender(_context, _options) {
  // Save trigger step edits on blur/change
  const table = this.element?.querySelector('#ost-trigger-table');
  ...
```

Unlike `refreshAstralPool`, whose twins are byte-identical and therefore harmless, these bodies
**differ** — the sheet behaves correctly only by accident of ordering. Reorder them and the
trigger-table wiring silently stops working.

Worse, the dead one is a **TODO stub**, already listed under *Other known drift* as
`SR3EHostSheetOrthodox.js:83` (notes enrichment, IC assignment drag-drop). Anyone acting on that
TODO writes code into a method that never runs, with no error to explain it.

Fix: merge the stub's comment into the surviving `_onRender` at :458 and delete :82. Do it before
that drift item is picked up, not after.

---


---

### 📕 Rules not implemented

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

## 30. Support conditional and scoped cyber/bioware modifiers

Sibling of [#10](#10-support-category-wide-skill-bonuses-enhanced-articulation), which covers
*category-wide* skill bonuses only (`improvedSkillCategory`). Conditional modifiers are a
different shape and are not covered by it or by [#8](#8-ship-cyberwarebioware-with-their-bonuses-pre-filled).

**14 upstream entries carry modifiers that only apply sometimes**, which is why they sit in `Notes`
prose with an empty `Mods` — #8 reads `Mods`, so it will skip every one of them. They fall into
distinct shapes needing distinct mechanisms:

| Shape | Examples |
|---|---|
| **Triggered / toggled state** | Adrenal Pump [1]/[2] (`+1QCK,+2STR,+1WIL,+2RCT` while triggered); Pain Editor (`+1WIL,-1INT` while engaged) |
| **Situational — specific tests only** | Nephritic Screen (`+1BOD` vs pathogens/toxins); Nitrogen Binder (`+2BOD` vs nitrogen narcosis); PACESETTER hearts (`+1BOD,+1QCK` *in Athletics*); Magnetic Cyberlimb (`+4STR` to hold items) |
| **Movement-only Quickness** | Corvette CyberLegs Basic/Advanced (`+3QCK for mov.`); Extending Legs Unit (`+1QCK for walking speed`) |
| **Affects bystanders, not the wearer** | Tailored Revolutionary Pheromones (Confusion) 1/2 — `-1INT,-1RCT for anyone within 1 meter` |
| **Cosmetic / conditional** | Transparent Skin (`-2CHA if face transparent`) |

Also unexpressible and belonging here: **Enhanced Articulation's `+1 Reaction` must not apply to
rigging or decking** (M&M p.66). `cyberBonus.rea` is one flat number that currently flows into VCR
and Matrix initiative alike. Its Combat Pool caveat needs nothing — pool derives from QUI+INT+WIL
and never reads Reaction.

The toggled group resembles the existing `focusActive` pattern on melee weapons. Worth designing
alongside #10 rather than separately — both want scoped modifiers instead of one flat number per
attribute.

⚠ Probably **not** an upstream data bug. The pattern is uniform enough that `Mods` looks
deliberately reserved for unconditional passive modifiers, with everything else left as prose.

---


---

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
([#2](#2-rebuild-combat-on-sockets-with-player-initiated-flow)). A journal table that silently
disagrees with the code is worse than no journal table. Either generate the journal **from** the
config constants, or cross-check every figure against them and note the single source of truth.

Pack should be system content (**no** `flags.The2ndChumming3e.book`, like `sr3e-skills`) so no book
toggle can hide the GM's reference material — and remember a new pack in `system.json` needs a full
Foundry restart, not an F5.

---

## 23. Ship an ammunition compendium — **found in play 2026-08-05**

**The code is complete; there is simply no content.** Verified:

| Piece | State |
|---|---|
| `ammunition` in `system.json` → `documentTypes.Item` | ✅ present |
| `AmmunitionData` model (`ItemDataModels.js:127`) | ✅ full schema |
| `CONFIG.Item.dataModels.ammunition` (`sr3e.js:107`) | ✅ registered |
| "+ Add Ammunition" buttons (`SR3EActorSheet.js:1323`, `:2069`) | ✅ present |
| `SR3E.ammoTypes` rules (8 types) + `ammoLoadMechanisms` (9) | ✅ in `config.js` |
| **Any ammunition item, anywhere** | ❌ **zero** |

**Not a regression — it never existed.** `main`'s 24 monolithic packs had none either, the
archive holds **0** ammunition documents, and there is no source data in `rawdata/` or the
upstream character generator. Of 82 packs across 20 books, not one is ammunition.

The practical effect is what got reported: to use ammo at all, someone must hand-create an item
and fill in `ammoType`, `loadMechanism`, `rounds`, `cost`, `availability`, `streetIndex` and
`bookPage` — **per type, per gun class** — before `reload()` has any stockpile to match against.
Everything downstream (magazine tracking, APDS/flechette armour effects, the `trackAmmo` setting)
is dead until that content exists.

### What the pack needs

8 types from `SR3E.ammoTypes`: Regular · Explosive · EX Explosive · Gel · APDS · Flechette ·
Tracer · Anti-Vehicle. Load mechanism matters because `reload()` matches on it, so a Belt entry is
distinct from a Clip entry.

Pricing is core p.281, *Ammunition, Per 10 Shots*. ⚠ **That table extracts badly** — the two-column
merge offsets the stat rows against their labels, exactly like the Visibility Table, so crop per
column (`pdftotext -x -y -W -H`, mediabox ~616×795pt, **book page = PDF page − 2**) rather than
reading the merged dump. One figure is safe from prose: *"Standard ammo costs 20¥ for 10 rounds."*

### ⚠ Blocked on [#12](#12-write-a-committed-pack-rebuild-script-and-vendor-its-sources)

The populate macros were **retired**, so there is currently no supported way to build a pack. This
is the first task to actually need that decision, and it should not be resolved by quietly
resurrecting a one-off macro.


---

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
defects in [#24](#24)'s table was invisible to a fully green `npm test`.

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

⚠ Still no coverage for the **ranged** flow end-to-end (fire mode → recoil → dodge → soak), which
is the most-played path in the system and the one with the most moving parts.

## 51. Short Bursts are not implemented — *SR3 p.115*

Found 2026-08-13 while verifying the fire-mode rules against the book for
`tests/fire-modes.test.mjs`. The rule is printed directly under BURST-FIRE MODE:

> "If a burst ends up being a round short because of insufficient ammunition in the clip,
> the Power Rating increases by **+2**, but the Damage Level does **not** increase. A **+2**
> recoil modifier also applies. If a burst consists of only **one** round due to insufficient
> ammunition, resolve it as a **single-shot** attack."

So a 2-round burst is a distinct case, not "a burst that happens to fire two". Nothing in
`_promptFireMode` or `rollWeapon` knows about it: a BF shot always applies +3 Power / +1 level
and counts 3 rounds, whatever the magazine holds.

**Only reachable with `trackAmmo` ON**, which is off by default — which is presumably why it
has never been noticed. Wire it where `loadedRounds` is checked, and give `fireModeDamage` a
`shortBurst` branch (+2 Power, level unchanged) plus `recoilTN` its +2.

## 52. The full-auto Dodge Test modifier is missing — *SR3 p.113*

Also found 2026-08-13, in the DODGE TEST section:

> "The base target number for this test is 4. The following modifiers apply:
> **+1 per 3 rounds fired from a burst-fire or full-auto weapon.**"

`SR3EActor._rollDodge` hardcodes `const DODGE_TN = 4` with no modifiers at all, so dodging a
10-round burst is exactly as easy as dodging a single pistol shot.

⚠ **Do not confuse this with the damage rule.** "+1 per 3 rounds" appears in the book as a
DODGE target-number modifier; the damage side is separate and already implemented (BF: Power
+3 / level +1; FA: Power +rounds, level +⌊rounds/3⌋). This file previously risked conflating
them — the damage-level increase and the dodge penalty are different rules that share a
phrase.

The rounds are already known at that point: the attack's `fireModeResult.rounds` would need
carrying into `dodgeContext`, which already ferries `attackSuccesses` and the staged damage.

## 53. The "Essence hole" surgery option is not modelled — *M&M p.150*

Found 2026-08-14, when the essence work in [#5](#5) was challenged on sourcing and the
answer turned out to be in Man & Machine rather than core.

Removing cyberware never refunds Essence (**M&M p.147**, and [#5](#5) implements that). But
M&M also gives a way to reuse the gap, as an **optional surgery modifier**:

> **Essence Slot (Implant, +2 Threshold)** — "If the character previously had cyberware
> removed, a new implant with this option can be installed within the 'Essence hole' left
> behind by the earlier implant. In other words, the old implant's Essence Cost can be
> subtracted from the new implant's Essence Cost."

⚠ **It is opt-in and it costs something** — +2 to the surgery Threshold, chosen per
procedure. It is NOT what happens by default when you swap chrome, which is exactly why
[#5](#5) accumulates on install rather than storing `max(lost, installed)`: that model would
grant every character a free, permanent Essence Slot on every implant they ever fit.

**Why it is not built.** The system has no surgery flow at all — no procedures, no
Thresholds, no Stress. The Essence Slot option is one line in a table that only means
anything inside that framework, and modelling it alone would be modelling the discount
without the cost.

**How a GM applies it today, and it is genuinely fine:** reduce the new implant's
`essenceCost` by the old one's before installing, or correct the Essence box afterwards
(`_preUpdate` translates that into `essence.lost`, so it sticks). Both are one edit.

**If it is ever built**, it belongs with the rest of the surgery rules (Stress, Thresholds,
procedure options) rather than as a special case bolted onto the install hook — and it needs
to track WHICH hole is being filled, since a 0.5 implant cannot borrow 2.0 of hole and then
lend the remainder to the next one for free.

## 54. Three EW divergences from Rigger 3 — found by audit, **not fixed**

Found 2026-08-14 when the [#24](#24) MIJI skill fix was challenged on sourcing. Verifying it
against R3 confirmed the fix (see below) and turned up three **pre-existing** divergences in
code nobody had asked about. Recorded rather than fixed, because two of them may be
deliberate and the third changes play balance.

**R3's worked example is the yardstick throughout** (R3 p.37, "Trixie"):

> "Trixie has a remote-control deck with a **Rating 6 protocol-emulation module** and a
> **Flux Rating 8**… Trixie has an **Electronics Skill 4, with an Electronic Warfare
> specialization of 6**. She rolls **6 dice** against a Target Number 6. This target number
> is reduced by 3 (her protocol-emulation module rating of 6 minus the network's deck rating
> of 3) to 3. Her test yields 4 successes. Trixie decides to use 2 of those successes to
> **increase her Intrusion Factor from 6 to 8**. Trixie uses her remaining 2 successes to
> infiltrate two channels."

### ✅ What the audit CONFIRMED

`_pickEwSkill` is right, and Trixie proves it number-for-number: **Electronics 4 with an EW
specialisation rolls 6 dice**, which is what the fix produces and what the old
`find(name.includes('electronic'))` did not. R3 names **Electronics (Electronic Warfare)**
explicitly for infiltration, for the MIJI Test on both sides, and for detection — and uses
**Electronics (Control Systems)** for the frequency switchover, so the book distinguishes
specialisations precisely where the old substring match could not.

Also confirmed against R3: intruder TN = targeted deck rating; defender TN = the intruder's
protocol-emulation module, or **ECM rating when jamming**; net successes = boxes of signal
degradation; infiltration TN 6 modified by (protocol − deck); base time 10 Combat Turns.

### ✅ 1. Intrusion Factor omitted the EW skill baseline — **FIXED 2026-08-14**

> "A rigger's Intrusion Factor is equal to his **Electronics (Electronic Warfare) skill plus
> any successes allocated** from his test to infiltrate the network."  — *R3 p.37*

`system.infiltration.intrusionFactor` is initialised to 0 and `openInfiltration` writes only
the allocated successes (`SR3EMIJI.js:494`). Trixie's factor starts at **6** — her skill —
and rises to 8; ours would start at 0 and reach 2.

**This one mattered in play.** `detectInfiltration` rolls the defender's EW against the
Intrusion Factor as the target number, so an intruder was far easier to spot than RAW allows —
TN 2 instead of TN 8 in Trixie's case.

`openInfiltration` now stores `skill.rating + alloc.factor`. The allocation dialog and the
result card both show the split (`6 skill + 2 allocated`) so the baseline is visible rather
than mysterious, and `tests/ew-skill.test.mjs` pins Trixie's 6 and the 8 it becomes.

### 🟠 2. Flux complementary dice are granted to the Infiltration Test

R3 grants them **only for the MIJI Test**: *"The Intruder's flux rating may be used as
complementary skill dice for **this part of the test**"*, and the defender rolls "with
complementary skill dice equal to his Flux rating". The infiltration text grants none, and
Trixie confirms it: Flux 8, EW 6, and she rolls **6** dice, not 6 + Flux.

`openInfiltration` adds `_complementary(flux, skill.rating)` anyway (`SR3EMIJI.js:402`).

### 🟠 3. `_complementary` caps at min(Flux, skill), which is in neither book

R3 says complementary dice **equal to the Flux rating**, with no cap. And SR3's actual
Complementary Skills mechanic (p.97) is not bonus dice at all:

> "the player can roll dice for the Knowledge Skill **against the same target number**…
> **Every 2 successes** rolled on the Knowledge Skill Test count as an additional success
> toward the Active Skill's Success Test. At least one success must have been scored with
> the Active Skill."

So there are three candidate readings — R3's flat "+Flux dice", SR3's 2:1 second test, and
our capped `min(Flux, skill)`. CLAUDE.md documents the cap as a deliberate simplification
("no special mechanic"), so **decide this before changing it**; it is a design call, not
obviously a bug. Note it interacts with the skill fix: raising Trixie's EW from 4 to 6 also
raises her cap from 4 to 6, so she now gets 6 of her 8 Flux dice instead of 4.

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

## 18. Structured gear data for weapon-accessory TN modifiers

Four SR3 p.112 modifiers depend on gear the system **cannot currently detect** — verified 2026-08-05:

| Modifier | Mod | Why it can't be detected |
|---|---|---|
| Smartlink (with smartgun) | −2 | 'Smartgun Link' exists as cyberware in a populate macro, but nothing reads it |
| Smart goggles (with smartgun) | −1 | no vision-gear flag anywhere |
| Laser sight | −1 | **zero** references in `scripts/` |
| Gyro stabilization | *varies* | **zero** references in `scripts/` |

Root cause: `accessories` on a firearm is a free-text `StringField`
([ItemDataModels.js:119](scripts/data/ItemDataModels.js)) — there is nothing structured to query.
**Same underlying gap as [#8](#8-ship-cyberwarebioware-with-their-bonuses-pre-filled)**: gear carries
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
([#29](#29)) — Attacker running **+4**, running difficult **+6**, walking **+1**, walking difficult
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

## 49. Nothing models hands — what is held, and how many can be held

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

## 48. The GM hand-charges every action — most of them are knowable

**Asked 2026-08-11:** *"right now the GM decides if a player does a simple or complex action. Some of
these should auto apply. Is that possible?"* **Yes**, and for most combat actions the answer is not
even ambiguous — SR3 states the cost per action, and the system already knows which action was taken
because it is the thing that opened the dialog.

### What exists (`sr3e.js:1596-1645`, `_actionTracker` at `:1966`)

Three buttons on the active combatant's card: **Complex** (advances the turn), **Simple** (toggles,
marking one of the two used), **Simple** (advances the turn). State is
`const _actionTracker = new Map()` — **module-scoped, in-memory, on the GM's client only**, cleared
by the `updateCombat` hook on any turn or round change.

### ⚠ The blocker is the same one as [#42](#42), not the rules

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

## 47. Ready Weapon is unmodelled — you can attack with a weapon you never drew

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
wave things through — see the minimal-guardrails ethos in CLAUDE.md, and [#44](#44), where the same
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

### Sequencing — blocked by [#46](#46), and not merely inconvenienced by it

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

## 41. Knockdown — nothing implements it, and two other rules already depend on it

**Requested 2026-08-10** while scoping charging. Core **p.124**. Not implemented anywhere; the only
mentions in the codebase are the `prone` status effect and [#37](#37)'s melee modifier, neither of
which is produced by anything.

> "Characters struck in ranged or melee combat may be knocked back or possibly down by the blow.
> When struck, the character must make a **Body Test**. Against ranged attacks, the target is equal
> to **one-half the Power** of the attack, rounding down. Against melee attacks, the target number is
> the **opponent's Strength**…
>
> If the character rolls **no successes, he falls down (prone)**. If he rolls successes, but does not
> generate enough for his wound level, the character **remains standing but takes a step or two away
> from the direction of the attack** (approximately one meter). … If for some reason he cannot step
> backward (for example, he is up against a wall), he fights at a **+2 modifier to his target
> numbers** until he is able to move away. Characters who take a **Deadly wound are always knocked
> down**."

**Knockdown Table (p.124)** — minimum successes to stay standing:

| Wound Level | Successes needed |
|---|---|
| Light | 2 |
| Moderate | 3 |
| Serious | 4 |
| Deadly | **always knocked down** |

⚠ The printed table extracts one row out of alignment — the same column-merge that scrambles the
Visibility Table. The prose pins it: *"a character who has taken a **Moderate** wound must roll at
least **3** successes."* Verify against the page before trusting any transcription, including this one.

⚠ **Gel rounds are an explicit exception**: *"against weapons firing gel rounds the target number for
the Body Test to resist knockdown is against the **full** Power of the attack"* (p.116) — not half.
The system already models gel's armour exception via `armorEffect: 'gel'`, so this belongs beside it.

### Two open questions before implementing

- **Which wound level?** *"how severely damaged the character is"* and *"has taken a Moderate wound"*
  read as the wound from **this** attack, but could mean the character's **current** total wound
  level. They differ constantly in play. Decide deliberately.
- **Who rolls it, and when?** It happens after damage resolves, so it is a third stage after the
  soak — which is another chat card, another click, and lands on whichever card shape [#24](#24)
  settles.

### What depends on it

- [#40](#40) Charging's failure branch — *"Quickness (5) Test or fall prone"*, or *"+2 instead"* to
  an existing Knockdown Test. Without Knockdown, that clause has nothing to modify.
- [#37](#37)'s `prone` melee modifier (−2 to the opponent) has no way to become true today.

## 39. Full Defense is half-built — RAW is a TWO-STAGE defence

**Requested 2026-08-10.** CLAUDE.md lists Full Defense under *"not yet implemented"*, but that is
not quite true — a simplified version ships and is doing the wrong thing quietly, which is worse
than nothing being there.

**What exists:** `system.fullDefense` / `system.fullDefensePool`
([ActorDataModels.js:36-37](scripts/data/ActorDataModels.js)), `SR3EActor._fullDefenseDice`,
`_announceFullDefense`, `clearFullDefense`, the `sr3e-fulldefense` status icon, and a clear at every
turn boundary via `_endOfTurnReset`. `handleDodgeDeclare` reads the reserved pool and uses it as a
**pre-committed dodge allocation**.

**What RAW says (p.123)** — it is not a reserved dodge pool at all:

> "Attacked characters may choose to only defend themselves. Characters who choose this option **do
> not do any damage to their opponent**, even if they achieve more successes…
>
> A character on Full Defense still makes a Combat Skill Test, but they **may not add any Combat
> Pool dice** to the test. Compare the successes… If the defender has achieved more successes, the
> attack has been blocked. Otherwise, note the attacker's net successes.
>
> The defender may **at this point make a Dodge Test**… **Only Combat Pool dice may be used for this
> test.** The target number is 4, and any applicable modifiers from the Melee [Modifiers Table]…"

So the shape is:

1. **Skill test, no pool** — the defender rolls their Combat Skill alone.
2. Defender wins → **blocked**, exchange over.
3. Otherwise → **a second, separate Dodge Test**, TN 4, **pool dice only**, plus melee modifiers.
4. **The defender deals no damage regardless** — even winning the skill test.

Three gaps against what ships: the pool-free skill stage does not exist, the second-stage dodge is
conflated with the first, and **nothing enforces "does no damage"** — a Full Defense defender who
wins the melee exchange currently damages the attacker, which RAW forbids outright.

⚠ Check whether Full Defense applies to **ranged** too before wiring. p.123 is written in a melee
context, but it is cross-referenced from the ranged side (p.109) and from movement (*"the defending
character is assumed to be in Full Defense"*). The current code only reaches it via the dodge path.

Sequence after [#24](#24) — the two-stage structure has to live wherever the melee exchange ends up.

## 40. Charging Attack — Cannon Companion, and the first rule that needs a BOOK GATE

**Requested 2026-08-10.** Not in the core rulebook. **Cannon Companion p.86**:

> "A running start can increase the effectiveness of an attack. If a character moved **2 or more
> meters** to attack his target, he gains a **+1 bonus to the Power** of the attack. While the
> character need not have moved 2+ meters in the Initiative Pass in which he is attacking, the
> character must have been **continuously moving (without interruption)** in any previous passes as
> well as in the pass in which the charging attack is made.
>
> If a character **fails** a charging attack (the defender wins or dodges), the character must make
> a **Quickness (5) Test or fall prone**. If the character must already make a Knockdown Test
> because the defender inflicted damage, modify that target number by **+2 instead**.
>
> **Only attacking characters may use this option.**"

### ⚠ This is the first RULE that should respect the source-book filter

`SR3ESourceBooks` currently gates **compendium content only** — packs in the sidebar and item
pickers. No *rule* is conditioned on a book being enabled. Charging is `cc` content, so a table not
playing Cannon Companion should not be offered it.

That is a new capability, and worth deciding deliberately rather than by accident: either
`SR3ESourceBooks.bookEnabled('cc')` becomes readable from combat code, or optional rules get their
own setting. **Whichever is chosen will set the precedent for every later sourcebook rule**, so
decide it here rather than in the fourth one.

### Notes for implementation

- **+1 Power, not a TN change** — it is a damage modifier, unlike almost everything else on the
  melee surface.
- **Movement continuity spans passes**, so it cannot be derived from a single action; it needs
  either token-movement tracking or an honest declaration. Given the minimal-guardrails ethos, a
  checkbox the attacker ticks is probably right.
- The failure branch wants **Knockdown**, which is also not implemented — check before assuming the
  `+2 instead` clause has anything to modify.

## 38. Multiple targets is Full-Auto-only — the rule is per Combat Phase

**Raised in play 2026-08-10.** The +2-per-additional-target penalty is computed in exactly one
place, inside a Full Auto branch of the fire-mode dialog
([SR3EItem.js:2811-2816](scripts/documents/SR3EItem.js)):

```js
if (mode === 'FA') {
  const targetNum = parseInt(el.querySelector('#fa-target-num')?.value) || 1;
  if (targetNum > 1) additionalTNPenalty = (targetNum - 1) * 2;
}
```

**The book scopes it to the Combat Phase, not the fire mode.** p.112: *"Multiple targets — +2 per
additional target **that Combat Phase**."* So SS, SA and BF all qualify: fire single-shot at one
target and single-shot at another in the same phase, and the second shot takes +2. Today it takes
nothing, and there is no manual route either — `multiTarget` is in `SR3E_RANGED_MODIFIERS` but
without `mvp: true`, so it never renders as a GM checkbox.

**Melee has its own, also missing.** p.123: *"Character attacking multiple targets +2/target"*, and
p.122 spells out the mechanics — *"Characters may attack more than one opponent with a Complex
Action… The target number for each attack increases by +2 per additional target struck in that
Combat Phase… **Dice from the Combat Pool must be allocated separately for each attack.**"* That
last clause is a second, separate gap: nothing enforces per-attack pool allocation.

### Why it is not simply "add a checkbox"

The penalty is **cumulative across a Combat Phase**, so something has to remember how many distinct
targets an actor has engaged this phase — the same shape as `roundsFiredThisPhase`, which already
exists for recoil and is already reset at every phase boundary by `_endOfTurnReset`. Reuse that
lifecycle rather than inventing a second one; a per-phase counter that resets on a different clock
than recoil will drift out of step and be very hard to spot.

⚠ Do **not** fix this by making the existing FA field non-FA. It counts targets *for one burst*;
the general rule counts targets *across the phase*. They are different quantities that happen to
share a modifier.

Sequence after [#37](#37) — both want a home in a melee/ranged GM surface, and this one needs the
per-phase counter that #37's window would display.

## 37. ✅ Melee has its own modifiers table — **DONE 2026-08-13**

**✅ Both halves built.** `SR3EItem._promptGMMeleeWindow` renders `SR3E_MELEE_MODIFIERS`
through `meleeModifierGroups()`, relayed by `sr3e.melee.negotiate` so it opens on the GM
rather than on whoever swung. Governed by the same `gmApprovesTN` setting as the ranged
window — including the `player` mode that skips it for GM-vs-GM NPCs — and it returns
`adjudicated` explicitly rather than letting a truthy-but-empty payload be mistaken for a
decision, which was the [#50](#50) trap.

Melee resolves **two** target numbers where ranged resolves one, and most p.123 rows move
both at once in opposite directions, so `sumMeleeModifiers` hands back an `{atk, def}` pair
of **deltas**. The base TNs already carry reach, defaulting tiers and any called shot;
returning finished numbers would silently discard all three.

**And the reach election exists at last.** It renders in the LONGER-REACH fighter's own
corner (`sr-melee-atk-reach` / `sr-melee-def-reach`), never in the GM window — that was the
whole point, and putting it there would have repeated exactly the mistake the contested
rework removed. Electing "onto the opponent" raises both TNs by N, so the gap is unchanged
and only who faces the harder number moves.

⚠ **The two branches are NOT equivalent at the TN floor**, and that is RAW rather than a
bug: no target number may drop below 2, so a bonus that would take you under it is lost
while the same points pushed onto the opponent are not. Against a soft target the election
is a real edge — which is precisely why the book hands the choice to the player rather than
resolving it in the rules.

Covered by `tests/melee-gm-window.test.mjs` (grouping, the melee visibility halving, and the
election including the floor asymmetry) on top of the existing `melee-modifiers.test.mjs`,
and driven live by `tests/e2e/melee-two-corner.spec.mjs`, which now asserts the window opens
on the GM and **not** on the attacker.

**Still open, deliberately:**

- **Troll natural Reach 1** (p.121) is not folded in. The differential is computed from
  `weapon.system.reach` alone, so a troll with a club reads as Reach 1 rather than 2. It
  needs a metatype lookup, which is the same lookup [#36](#36) wants for vision — worth
  doing together.
- **Contested rolls still have no GM window.** They are not a melee exchange and have no
  modifier table of their own; giving them one needs a decision about what it would
  *contain*, not a copy of this.


**Asked in play 2026-08-10: "do melee fights get modifiers the GM needs to worry about?"** Yes.
Melee has a separate table (**p.123**) and the GM currently has no surface for it — the TN window
([#29](#29)) is wired to `SR3E_RANGED_MODIFIERS` and only opens on the ranged path.

| Situation | Modifier | Wired? |
|---|---|---|
| Called Shot | +4 | ✅ `_promptCalledShot` |
| Character's weapon has longer Reach\* | −1 per point | ⚠ differential applied, but the **choice** is not offered — see below |
| Character's weapon has inferior Reach\* | +1 per point | ⚠ same |
| Character is wounded | Damage Modifier (p.126) | ✅ folded in by `rollPool` |
| **Character has friends in the melee** | **−1 per friend, max −4** | ❌ |
| **Opponent has friends in the melee** | **+1 per friend, max +4** | ❌ |
| **Character has superior position** | **−1** | ❌ |
| **Opponent prone** | **−2** | ❌ |
| **Attacking multiple targets** | **+2 per target** | ❌ |
| **Visibility impaired** | Visibility Table **at HALF value**, rounded down — **except Full Darkness** | ❌ |

\* *Only one of these may be applied, to attacker or defender* — the differential is implemented, but
which side it lands on is **not a system decision to make**; see below.

### ⚠ Reach is a CHOICE the longer-reach fighter makes, and we make it for them

Raised 2026-08-11, from the question *"what happens when the defender doesn't have the reach to hit
back?"* — the answer being that they defend normally, because reach never gates participation.
**p.122 step 2** has the defender roll unconditionally: *"Roll the defender's base Combat Skill dice,
augmented by dice from his Combat Pool, against a base Target Number 4."* No weapon requirement, no
reach precondition. Reach only moves a target number. That part we have right.

What we do **not** have is the election. **p.121**:

> "Calculate the **difference** between the Reach Ratings of opponents. The character with the longer
> (higher) Reach **can choose** to apply this number as either a **negative target number modifier to
> his attack test** OR as a **positive modifier to his opponent's target number**."

The book gives the reason the two are not equivalent: *"beat the opponent's defenses"* versus *"make
himself harder to hit."* Same magnitude, different target — offence or defence. Against a
low-skill/high-pool opponent you want the +N on them; when you need the hit, you want the −N on you.

We hardcode the first branch, permanently, for both sides:

```js
atkTN: Math.max(2, 4 + Math.min(0, defReach - atkReach) + …)
defTN: Math.max(2, 4 + Math.min(0, atkReach - defReach) + …)
```

The `Math.min(0, …)` is what makes it a bonus-only-to-the-longer-side reading. It is one of the two
legal applications, so nothing is *wrong* today — the option is simply unavailable.

**Why it becomes urgent under [#24](#24).** Today both TNs are editable on the boxing card, so a GM
who wants the other branch can just type it. #24 makes the corners read-only. The workaround dies
with it, and the choice has to move into this window or it is lost outright.

**Shape:** a reach row that appears only when the differential is non-zero, naming the fighter who
holds it and offering the two applications — *−N to my TN* / *+N to theirs*. Belongs to whoever has
the longer reach, not to the GM, so on a two-corner card it renders in **that fighter's** corner.
Trolls have natural Reach 1 cumulative with weapon reach (p.121) — check the differential is computed
from the total, not the weapon field alone.

### ✅ The data layer is built — `SR3E_MELEE_MODIFIERS` + `sumMeleeModifiers`

Modifiers resolve to an `{atk, def}` **pair**, not a single number, because melee has **two** target
numbers and most rows land on both sides at once. Covered by `tests/melee-modifiers.test.mjs`.
Still to do: the GM window itself, and wiring it into the melee flow.

**Friends in melee is the big one, and it IS symmetric** — settled by discussion 2026-08-10 after
being challenged and re-checked against the book. The greater side gets −1 per surplus friend
(max −4); the lesser side gets +1 per surplus friend the opponent has (max +4). Equal magnitude,
opposite signs.

The brutality is **emergent, not in the numbers**: in a 3-on-1, each of the three rolls at −2 *and
gets their own attack*, while the lone fighter defends three separate times at +2. The modifier is
symmetric; the number of exchanges is not. A maxed ±4 separates the two target numbers by **8**.

⚠ **The prose and the table disagree once a cap binds, and the prose wins here.** p.122 says −1 per
friend *"more than their opponents have"* — a **differential**. The p.123 table says
*"−1/**Friend** (max −4)"* and *"+1/Friend (max +4)"* — **absolute counts**, capped separately. They
agree until someone has more than four friends: at 6-vs-5 the differential gives ∓1 while the table's
two capped rows cancel to **0**. Implemented as the differential; do not "fix" it to match the table
without deciding that deliberately.

⚠ **Visibility cannot reuse the ranged control as-is.** p.123: apply the Visibility Table *"at half
their value, rounding down, except for Full Darkness"*. So `visibilityModifier()` needs a halving
mode — `Math.floor(v / 2)` with Full Darkness passed through at full value.

**Shape:** a `SR3E_MELEE_MODIFIERS` table beside the ranged one, reusing `mvpModifierGroups`'s
`group` mechanism, surfaced from the melee flow. Sequence it **after [#24](#24)** — that task decides
whether the boxing card stays one card or splits, and a GM modifier surface has to attach to
whichever wins.

## 36. Detect which vision an attacker actually has

The Visibility Table renders in the GM's TN window ([#29](#29)) as two dropdowns — condition, and
which vision the attacker is using — with **nothing pre-selected**. The second dropdown is
information the system could largely work out for itself.

### What is already derivable

**Metatype is a real stored field** (`ActorDataModels.js:82` / `:176`, `StringField`, initial
`'human'`), and core **p.40** assigns natural vision explicitly:

| Metatype | Natural vision |
|---|---|
| Human | none |
| Elf | Low-Light — *"They also have low-light vision"* |
| Ork | Low-Light — *"They too have low-light vision"* |
| Dwarf | Thermographic — *"They also have thermographic vision"* |
| Troll | Thermographic — *"They too have thermographic vision"* |

So natural vision is a lookup, not a guess.

### ⚠ Cybereyes REMOVE natural vision — the rule that makes this non-obvious

Core **p.299**, Cybereyes:

> "If a metahuman has his or her eyes cybernetically replaced, he or she **loses natural vision
> enhancements such as low light or thermographic vision**, but can have such features installed in
> the new eyes."

The eyes are gone. A naive "take the best vision available" detector gets this exactly backwards —
it would keep handing an elf with cybereyes their natural low-light, which they no longer have.

And because the slash reads **cybernetic first, natural second** (p.111), cyber vision is the
**worse** of the two. So cybereyes are a genuine mechanical *downgrade* for an elf, ork, dwarf or
troll who had natural enhancement: same feature, worse column. In Minimal Light an elf reads +2
naturally and **+4** through cybereyes with low-light installed. That is a real, checkable
consequence any detector must reproduce rather than smooth over.

### Open question — retinal modification

The same paragraph offers *"Retinal modification, rather than eye replacement"* as an alternative.
It modifies the natural eye rather than replacing it, so it presumably preserves natural vision —
but a retinal low-light enhancement is still an *electronic* enhancement, and the slash rule splits
on *"cybernetic or electronic vision"* versus *"natural vision"*. Whether a retinal mod reads as the
cyber or the natural column is genuinely unclear. **Do not resolve it silently** — surface it, or
keep the dropdown overridable so the GM decides.

### Blocked on the same gap as [#18](#18)

Vision gear exists only as item **names** — `'Cybereyes'`, `'Low-Light Vision'`,
`'Thermographic Vision'` in `populate-cyberware.js`, plus goggles as free-text gear — with **zero**
references anywhere in `scripts/`. Detecting it today means name-matching, exactly like
`guessGearModifiers` does for smartlink. Metatype half is solid; the cyberware half needs the
structured fields #18 is about, or it is another guess.

**Suggested shape:** a derived `system.derived.vision` — `{ natural, cyber: [], effective }` — so
every consumer reads one resolved answer rather than each re-deriving it. Then pre-select the GM
window's vision dropdown from it, still freely overridable.

## 20. Migrate ~58 `renderDialogV2` hook sites to `DialogV2.wait`'s `render` option

**Two down, 2026-08-13**, both while covering their cards in [#24](#24):

- **`SR3EMIJI.openAttackDialog`** — migrated to the per-dialog `render` option. Its hook drove
  the operation→channel list, so cross-wiring two open dialogs would leave the channel list
  silently not matching the operation, letting a rigger jam a channel the operation cannot reach.
- **`rollOrthodoxICAttack`** — the hook was **deleted outright** rather than migrated. It existed
  only to mirror the target decker's Cybercombat rating and Hacking Pool into fields the IC should
  never have had; those fields are gone, so nothing needed wiring.

⚠ Worth noting for the remaining ~56: the second one was **removable, not portable**. Check what
each hook is actually for before mechanically converting it — some are wiring for a control that
should not exist.

CLAUDE.md claimed **"`DialogV2.wait()` does NOT call its `render` option"** and sent everyone to the
global `renderDialogV2` hook. **That was false.** Corrected in Stage 0d; verified against the
installed build (Foundry **14.365.0**):

```js
// resources/app/client/applications/api/dialog.mjs:405, :420-422
static async wait({rejectClose=false, close, render, renderOptions={}, ...config}={}) {
  ...
  if ( typeof render === "function" ) {
    dialog.addEventListener("render", event => render(event, dialog));
  }
```

Core's own docs at `dialog.mjs:154` say *"you must still use the `render` option to attach
listeners."* **~58 references across 8 files** still use the hook: `SR3EActor.js`, `SR3EItem.js`,
`SR3EWard.js`, `SR3EActorSheet.js`, `SR3EItemSheet.js`, `SR3EVehicleSheet.js`, `sr3e.js`,
`SR3EMIJI.js`.

**Why this is more than tidiness.** `Hooks.on('renderDialogV2', …)` is **global**. With two dialogs
of the same kind in flight, both hooks register before either renders — so dialog A gets wired
**twice** (the second time with B's closure variables) and dialog B gets **no wiring at all**. The
symptom is a checkbox or dropdown that silently stops recomputing, which is near-impossible to
reproduce on demand. A per-dialog `render` callback cannot cross-wire.

Latent today because dialogs are almost always sequential. **Socket Stage 3 makes concurrent dialogs
normal** — the GM can have two attack windows open at once. Stage 3's `_promptGMAttackWindow` is
already specified to use `render`; this task is about the pre-existing sites.

Migrate incrementally, highest-risk first (anything that can plausibly be open twice). Pattern:
drop the `Hooks.on`/`Hooks.off` dance and the element-check guard for
`render: (_event, dialog) => { const html = dialog.element; … }`.


---

### 🧹 Housekeeping

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


---

### ✅ Done — kept for the record

## 13. ✅ Fix `_promptCombatPool` — three defects in one dialog — **CONFIRMED**

**✅ DONE — `f2cdcf6`.** Kept for the record; this file is the progress, not a queue.


`SR3EItem._promptCombatPool` ([SR3EItem.js:2834](scripts/documents/SR3EItem.js)) is the only
combat prompt that does **not** use `DialogV2.wait()`. It hand-rolls
`new foundry.applications.api.DialogV2({...}).render(true)` inside a `new Promise`, which
CLAUDE.md explicitly forbids. Three separate defects:

1. **Cancel resolves `0`, not `null`** (line 2855) — so cancelling does not abort the attack,
   it fires it with no pool dice. Every other prompt in the flow returns null-on-cancel and its
   caller bails.
2. **No `close` handler** — dismissing with Escape or the ✕ never resolves the promise at all,
   so `rollWeapon` awaits forever and the attack is stuck with no error.
3. **Contradicts the documented pattern**, so it cannot be dropped into a uniform
   await-a-reply wrapper. Blocks the melee defender's pool window in a later socket stage.

Verified by reading 2834-2859. Fix: convert to `DialogV2.wait()`, return `null` on cancel and
on close, and make the caller bail — matching `_promptDodgeDeclaration`'s contract.

⚠ **Two call sites, not one.** `SR3EItem.js:969` (single-target) **and `:744` (AoE)**. Both guard
with `if (combatDice > 0)`, and `null > 0` is `false` — so switching the return to `null` without
fixing *both* silently rolls the grenade with no pool instead of aborting. Update them in the
same commit. (`DialogV2.wait` defaults `rejectClose: false` and resolves `null` on dismissal, so
the conversion genuinely fixes the hang.)

## 15. ✅ Settle the Foundry version: manifest says 14, CLAUDE.md says 13

**✅ DONE — `145483b`.** Kept for the record; this file is the progress, not a queue.


`system.json:8-9` declares `"minimum": "14", "verified": "14"`. CLAUDE.md is titled for **v13**
and documents v13 patterns throughout, and the archived notes reason about "v14 deprecated the
MeasuredTemplate document" as a *future* concern. One of the two is stale.

Worth settling before the socket work leans on it: `game.socket.on/emit` is stable across both,
but nothing in this repo has ever exercised it, and the v13/v14 question also governs whether
the ApplicationV2 and Region patterns in CLAUDE.md are still current guidance.

## 16. ✅ Delete the duplicate `refreshAstralPool` — **CONFIRMED**

**✅ DONE — `77cedf1`.** Kept for the record; this file is the progress, not a queue.


`SR3EActor.js:4128` and `SR3EActor.js:4196` define `refreshAstralPool()` twice with byte-identical
bodies (`await this.update({ 'system.astralPoolSpent': 0 })`). In a JS class the second wins, so
4128 is dead. Delete one. Socket Stage 1 touches both lines, so clear it first or the work edits
dead code.

## 17. ✅ Fix `handleAssignDamage`'s lying button — **CONFIRMED**

**✅ DONE — `3abd54f`.** Kept for the record; this file is the progress, not a queue.


`SR3EActor.js:4040-4042` sets `btn.textContent = '✓ Damage Applied'` **before** `JSON.parse` and
before four `if (!x) return` bailouts. When the actor lookup fails the card claims damage was
applied and nothing was written. Move the label after the successful write.

## 22. ✅ Add a linter — **the project has none, and it has already cost us**

**✅ DONE — `49e35ac`.** Kept for the record; this file is the progress, not a queue.


`package.json` has `"scripts": {"test": "node tests/run.mjs"}`, **no devDependencies**, and no
ESLint config anywhere. The only static check available is `node --check`, which is a *syntax*
check and nothing more.

**This is not hypothetical.** Socket Stage 3 shipped `baseNote: modBreakdown ?? null` in
`rollWeapon` ([SR3EItem.js](scripts/documents/SR3EItem.js)). `modBreakdown` is a **parameter of a
different function** (`_promptWeaponRollOptions`); in `rollWeapon` it is undeclared. ES modules are
always strict mode, so that is a `ReferenceError` — and `??` does not save you, because the throw
happens on *reading* the undeclared binding. It would have crashed **every ranged attack**.
`node --check` passed it. `npm test` passed it. It was caught by reading the code.

`no-undef` alone would have caught it, for free, instantly.

**Minimum viable setup:**

```
npm i -D eslint
npx eslint --init      # ESM, browser env
```

Then in `eslint.config.js` declare Foundry's globals — `game`, `ui`, `CONFIG`, `CONST`, `Hooks`,
`foundry`, `canvas`, `ChatMessage`, `Actor`, `Item`, `fromUuid`, `fromUuidSync`, `TextEditor`,
`PIXI`, `Roll` — or every one of them reads as `no-undef` and the signal drowns.

Rules worth having on day one, in rough order of value here:

| Rule | Why, for this codebase |
|---|---|
| `no-undef` | the bug above |
| `no-unused-vars` | would have flagged the duplicate `refreshAstralPool` (#16) |
| `no-dupe-class-members` | **exactly** the duplicate-method bug in #16 |
| `require-atomic-updates` | the read-modify-write races Stage 1 exists to fix |
| `no-await-in-loop` (warn) | the pack/populate scripts |

Add `"lint": "eslint scripts"` to `scripts`, and wire it into `npm test` so it runs with the suite.

⚠ **Expect a large first run.** ~12,000 lines were written without a linter, so budget for a
triage pass and consider starting with only the rules above rather than a full recommended set —
a wall of 500 style warnings gets ignored, and the correctness rules are what matter.

## 26. ✅ Dodge resolution is wrong in two places — **CONFIRMED against the book**

**✅ DONE — `1eb9f50`.** Kept for the record; this file is the progress, not a queue.


Reported from play 2026-08-05 ("not sure the dodge math is working"). It isn't. Both defects sit
in the same block, `SR3EActor.js:2890-2909`:

```js
const netHits = dp.attackSuccesses - successes;
if (netHits <= 0) { /* ✅ Dodge Successful! No damage taken. */ }
else { /* ❌ Dodge Failed — full hit, "dodge doesn't reduce staging" */ }
```

### A. Ties go to the wrong side — off by one

`netHits <= 0` means the dodge wins on a **tie**. The book says the opposite, in both places it
states the rule:

> "A clean miss occurs if the number of successes from the target's Combat Pool dice **exceeds**
> the attacker's successes." — numbered sequence, step 4
>
> "If the number of successes obtained on the Dodge Test are **more than** the Attacker achieved on
> his Attack Test, then the attack is completely dodged." — Dodge Test

**Exceeds / more than.** A tie is a HIT. The condition should be `successes > dp.attackSuccesses`
for a clean miss, i.e. `netHits < 0`.

### B. Partial dodge successes are thrown away

The `else` branch discards the dodge entirely — 2 successes against 3 attack successes buys the
defender nothing. The book continues immediately:

> "**Even if you don't dodge completely, the successes still count and are added to the Damage
> Resistance Successes** to determine the final outcome."

So a failed dodge is not a wasted dodge: its successes carry into the Damage Resistance Test and
stage the damage down at the usual 2-per-level. Discarding them makes partial dodging worthless
and quietly punishes anyone who dodges with too few dice.

⚠ Note what does **not** change: staging *up* still uses the attacker's raw successes. Dodge
successes are added to the **resistance** side, they do not cancel attack successes. CLAUDE.md's
"Dodge does NOT reduce staging. Net hits are irrelevant to damage" is right about staging and
wrong about the successes being irrelevant.

### Why this matters more now

The socket work put the dodge decision after the attack roll ([#25](#25)), so the defender now
chooses dodge-vs-soak with the numbers in front of them. Both bugs distort exactly that choice —
A makes dodging look better than it is at parity, B makes it look worse than it is below parity.

### Fix

1. Flip the tie: clean miss only on `dodgeSuccesses > attackSuccesses`.
2. Carry the dodge successes into the soak card as pre-counted resistance successes, and show them
   on it so the player can see they were credited.
3. Correct CLAUDE.md's ranged-combat flow, steps 11–12.
4. Add tests — this is pure arithmetic with no Foundry dependency, so it belongs in `tests/`
   alongside the damage-code parsers ([#7](#7-expand-test-coverage-for-combat-initiative-and-pools)).

## 31. ✅ Move the dodge declaration after the attack roll

**✅ DONE — `d67ee9f`.** Kept for the record; this file is the progress, not a queue.

RAW has the defender decide at **step 4**, after the attacker's Success Test — so they choose
dodge-vs-soak knowing what they must beat, rather than committing blind. The system asked first and
rolled second.

Removed machinery rather than adding it: with no defender-pool reservation during negotiation,
`sr3e.attack.commit`, `_pending`, `_reapPending`, `sr3eReapPendingFor` and the `userConnected`
reaper all became unnecessary and were deleted. `sr3e.attack.negotiate` now only reads a target
number and writes nothing.

See CLAUDE.md → *"The defender declares AFTER the attack roll"* for the rule text and the worked
example.


---

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
  the **surviving** `_onRender` (was `:83`, in the dead twin deleted by [#25](#25)). ⚠ Add that
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

