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
| 🔵 In progress | **93** — awaiting a Foundry test, branch `fix/racial-mods` |
| 🟢 Socket combat — follow-ups | *(24 complete — see Done)* |
| 🔴 Confirmed bugs, still open | **73** · **74** · **91** *(**71** · **72** · **80** · **81** · **88** · **89** done)* |
| 📕 Rules not implemented | 47 · 48 · 49 · 53 · 57 · **75** · **76** *(**3** · **4** · **30** done)* |
| 🧙 Adept powers — see `audit/adept-powers-audit.md` | **78** *(**59**-**70**, **77** done)* |
| 📦 Content gaps | 9 · 11 · 19 · 23 · 55 · **79** · **82** · **85** · **86** *(gear stubs only)* · **90** · **92** *(**83** · **84** · **87** done)* |
| 🔧 Tooling & infrastructure | 7 · 12 · 18 · 20 · 36 · 56 |
| 🧹 Housekeeping | 1 · 6 |
| ✅ Done — kept for the record | **2** · **5** · **8** · **10** · 13 · **40** · **41** · **58** · **14** · **38** · **39** · **51** · **52** · 15 · 16 · 17 · 21 · 22 · **24** · **37** · **43** · 25 · 26 · 27 · 28 · 29 · 31 · 32 · 33 · 34 · 35 · 42 · 44 · 45 · 46 · 50 |
| 📌 Notes & parked | combat-audit questions · known drift · ODM/MDF |

### 🔵 In progress

## 2. ✅ Rebuild combat on sockets with player-initiated flow — **DONE 2026-08-19**

Foundry sockets so each participant sees the right window on their own screen:

- ✅ Players can initiate combat (currently attacker-sheet driven, assumes one client)
- ✅ **Dodge window on the target's screen**, not the attacker's
- ✅ **GM window to set TN, with checkboxes for combat modifiers** (not a typed field) — built
  for **ranged** ([#29](#29)), then for melee and contested ([#37](#37))

**Status 2026-08-13 — the socket layer itself is finished.** `SR3EQuery` (ask / asGM / deciderFor
/ once), the per-actor `SR3EQueue`, the append-only `card.mark` ledger, and the generic
two-corner block now carry every opposed test in the system: **all eight cards** are converted
and driven by two real clients ([#24](#24)). Defaulting, dodge declaration and Spell Defense
each ask their own owner.

**Closed 2026-08-19.** The two remaining dependencies landed: [#37](#37) (the melee/contested
GM TN window) and [#43](#43) (resist cards spending pool dice free). Merged to `main` and
released as **0.4.5.3**.

⚠ **One thing under this heading was deliberately NOT done**, and stays undone rather than
being quietly dropped: the **`_corner` duplication** from [#24](#24) — now **nine** local
definitions, not the eight recorded, and further diverged. Left because the per-card
differences are real and the behaviour is pinned by e2e rather than by shared code. If it is
ever unified, those specs are what will catch a regression.

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

## 3. ✅ Implement the Pain Editor — **DONE 2026-08-31, with TODO 30**

**Data-present, mechanics-absent.** In the `sr3e-mm-bioware` pack; `scripts/` has zero hits
for "pain editor".

Implementation point is derived `system.woundMod` in `prepareDerivedData` and everything
downstream — TN penalties on every `rollPool`, Combat Pool derivation, initiative base.
Check M&M for exact behaviour incl. interaction with overflow/unconsciousness thresholds,
and whether boxes still track normally while the penalty is ignored. Keep the resulting
wound modifier GM-overridable.

### What landed

Built as part of [#30](#30)'s triggered-augmentation mechanism, since the editor is one of the
two shipped items that needed it. All three of the rule's clauses (M&M p.71):

1. **+1 Willpower, −1 Intelligence** while engaged — applied in `_prepareCharacter`.
2. **Stun wound modifiers ignored.** ⚠ The modifier is RECOMPUTED from the physical track, not
   zeroed — *"Penalties from Physical damage are applied, but without the player's
   knowledge."* Zeroing would make it total immunity. The boxes themselves are untouched, so
   the track still records everything.
3. **No Stun knockout** — the auto-defeated hook drops `stunFull` from `down` while engaged.
   A full PHYSICAL track still drops them, per *"he might fall unconscious if he reaches or
   surpasses Deadly Physical damage."*

Plus the concealment the rule asks for: behind the `painEditorHidesWounds` world setting (off
by default), the player's own sheet shows `?` and the GM sees the truth.

⚠ **The three clauses are one item and should move together.** Two live in the derivation and
one in the `updateActor` hook in `sr3e.js`; a change to any should check the others.

⚠ **Not modelled:** the +4 TN to tactile Perception, and the Biotech (4) Test the character can
make to learn their own condition. Both are stated on the item for the GM.

## 4. ✅ Move-by-wire — **DONE 2026-08-31**

**The shipped data was already right; the derivation was not.** This entry's original table was
copied from `scripts/macros/populate-cyberware.js`, a legacy macro the packs no longer use, and
it disagreed with the book on Quickness, on initiative dice, on Essence, and by omitting Rating
4 entirely. What actually ships in `sr3e-mm-cyberware` matches M&M p.60 exactly:

| Rating | Essence | QUI | REA | Init dice | Athletics / Stealth |
|---|---|---|---|---|---|
| Move-by-Wire [1] | 2.5 | +1 | +2 | +1D6 | +1 |
| Move-by-Wire [2] | 4 | +2 | +4 | +2D6 | +2 |
| Move-by-Wire [3] | 5.5 | +3 | +6 | +3D6 | +3 |
| Move-by-Wire [4] | 7 | +4 | +8 | +4D6 | +4 |

⚠ **Do not re-derive this from the populate macro.** It was corrected by [#8](#8)'s `Mods`
parsing (`+1QCK,+2RCT,+1INI` and so on), and the macro was never updated to match. All four rows
are now asserted in `tests/adept-powers.test.mjs` so the claim is falsifiable rather than a note.

### The Quickness bonus does not reach Reaction

> "The Quickness bonus does not count when calculating the character's **Reaction** Attribute."

It did. `bonusQui` lands in the attribute loop, which runs before Reaction derives, so a
move-by-wire [4] was quietly buying **+2 Reaction on top of its +8** — and then feeding those
into initiative, dodge and every Reaction Test.

⚠ **This is the same constraint as the Adrenal Pump's ([#30](#30)) and it needed a DIFFERENT
fix.** The pump is activated, so it could be applied *after* the Reaction derivation and the
ordering satisfied the rule for free. Move-by-wire is a passive implant applied with everything
else, before Reaction exists — so the excluded portion is accumulated into
`cyberBonus.quiNotForReaction` and subtracted at the derivation instead. Registry:
`SR3E.quicknessNotForReaction`.

⚠ **Reaction only — the Combat Pool is NOT excluded.** The book carves out Reaction and stops
there, and the pool is ⌊(QUI + INT + WIL) / 2⌋, so the boosted Quickness genuinely does move it.
The old entry asked whether that was intended: it is. Asserted, so the exclusion is not later
"tidied" into a general one.

⚠ **The carve-out is move-by-wire's, not Quickness cyberware at large** — muscle augmentation's
Quickness feeds Reaction normally. Same shape as Enhanced Articulation's rigging/decking
exclusion ([#30](#30)), which is that *bonus*, not cyberware generally.

### Athletics and Stealth dice

> "+N dice for Athletics and Stealth Tests"

Not implemented at all. Now fed into `skillBonusDice` — the always-applies channel, since the
book scopes them to two named skills rather than to a situation — via a new
`SR3E.augmentationSkillDice` table.

⚠ **A table rather than the `improvedSkillName` field**, because that field holds a single name
and this is one item granting dice to two skills.

⚠ **Two skills, not a category.** `Athletics` and `Stealth` are both Physical skills; using
`improvedSkillCategory` would hand the dice to every Physical skill the character owns.

### The incompatibility is reported, never enforced

> "This system is **not compatible** with any other Reaction- or Initiative-enhancing cyber- or
> bioware."

`derived.reactionExclusiveConflict` names the exclusive implant and what it clashes with; the
Cyber tab renders a warning. Both bonuses stay applied.

⚠ **Contrast `SR3EActor.reflexBonus`, which DOES pick a winner.** There the conflict is between
an adept power and technology, and leaving both applied would produce a total the rules forbid
outright. Here both sides are cyberware the character paid Essence for, the book does not say
which loses, and a GM who allowed the combination should not have it silently undone. Registry:
`SR3E.reactionExclusive`.

⚠ **Rating 3 and 4 force extra actions** — *"the character must take one extra Complex Action"*.
Not implemented; it belongs with the action economy in [#48](#48), which is where the system
would have to model actions at all.

## 10. ✅ Category-wide skill bonuses — **DONE 2026-08-20**

**Enhanced Articulation** (M&M p.66) grants `+1 Reaction` (covered by #8) **and 1 extra die
to Combat, Physical, Technical and Build/Repair skill tests** — currently inexpressible.

⚠ **This item recorded FOUR categories and the book gives FIVE.** M&M p.66 continues: *"The
bonus **also applies to physical use of Vehicle Skills** — driving a car via datajack or
piloting a submarine does not qualify for the bonus."* All five exist verbatim in
`ACTIVE_SKILL_CATEGORIES`, so the mapping is still exact — and the suite asserts that, because
a category renamed in `config.js` would otherwise stop matching in silence.

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

### Built differently from the shape sketched above — and better

The original plan expanded a category into member skill names inside `skillBonusDice`. **That
map is auto-applied at every roll path**, and its own doc comment says consumers must trust it.
A category bonus cannot make that promise, because of the Vehicle clause: *"physical use"* is a
judgement about what the character is doing, not something derivable from the sheet. Driving
the same car with your hands or through a datajack is the same skill, the same actor and the
same sheet — and only one earns the die.

**So the maintainer's design was taken instead: a CHECKBOX on the Roll Skill dialog**, shown
only when the actor has a qualifying item and the selected skill's category matches. The player
opts in per roll, which is precisely the granularity the rule needs, and the Vehicle case stops
being a problem the code has to guess at.

- `improvedSkillCategory` (comma-separated) on `CyberwareData`, `BiowareData`, `AdeptPowerData`,
  reusing the existing `improvedSkillDice` for the amount.
- `derived.skillCategoryBonuses` — a **separate list**, deliberately not the auto-applied map,
  so `skillBonusDice` keeps meaning "always applies".
- `SR3EActor.skillCategoryBonus(bonuses, category)` and `parseSkillCategories(raw)`, both pure.
- The checkbox **disables rather than vanishing** when you switch to a skill it does not cover,
  matching how the specialisation tick already behaves, and the whole row is omitted for actors
  with no category bonus at all.

⚠ **Vehicle skills start UNTICKED, everything else ticked.** Rigging is the exception the book
calls out, so it is the one case the player opts *into* rather than out of.

⚠ **Commas only when parsing.** `Build/Repair skills` contains a slash; splitting on it too
tears the category in half and it then matches nothing, silently. Mutant:
`category-bonus-splits-on-slash-too`.

### The two roll paths were unified on the way

`SR3EItemSheet._onRoll` called `item.rollSkill()` with **no arguments at all** — no TN, no pool,
no dialog — so rolling a skill from its own item sheet used a hardcoded TN 4 and could offer
neither the specialisation tick nor the Karma Pool. Two buttons for the same skill behaved
differently depending on which sheet was open. Both now go through
`SR3EActorSheet._promptSkillRollOptions`. An unowned item (world or compendium) still falls
through to the plain roll, which is the case `rollSkill` already warns about.

Also collapsed the dialog's two near-identical inline recompute handlers into one. They had
already drifted apart, and that is exactly how the new bonus would have ended up applied by the
specialisation tick but not by the skill dropdown.

**Left to [#8](#8):** the Enhanced Articulation item still ships with empty bonus fields, so a
GM types the categories in until #8 populates them. This opens the channel; #8 fills it.
**Left to [#30](#30):** the same power's `+1 Reaction`, which has *"no effect on rigging or
decking and does not affect the Control Pool"* — conditional in a different way again.

⚠ Data model changes need a full Foundry restart, not F5.

---

## 30. ✅ Support conditional and scoped cyber/bioware modifiers — **DONE 2026-08-31**

**Rewritten 2026-08-31.** The original entry described five shapes and no mechanism for any of
them. Three of the five now have one — built for the adept powers ([#59](#59)-[#70](#70)) and
deliberately source-agnostic — so most of this is no longer a design problem. What is left is
smaller and sharper than it was, and the two genuinely undesigned shapes are named at the bottom.

Sibling of [#10](#10), which covers *category-wide* skill bonuses only, and of [#8](#8), which
ships *unconditional* attribute bonuses from the upstream `Mods` field.

### Why these entries are invisible to #8

**14 upstream entries carry modifiers that only apply sometimes.** They sit in `Notes` prose with
an empty `Mods`, and `tools/build-mods-bonuses.mjs` reads `Mods`, so it skips every one.

⚠ Probably **not** an upstream data bug. The pattern is uniform enough that `Mods` looks
deliberately reserved for unconditional passive modifiers, with everything conditional left as
prose. So the data has to be authored here, not imported.

### ⚠ Only THREE of them ship — checked against the packs, 2026-08-31

| Entry | Pack | `mods` |
|---|---|---|
| Adrenal Pump [1](trig) / [2](trig) | `sr3e-mm-bioware` | empty |
| Pain Editor | `sr3e-mm-bioware` | empty |
| Nephritic Screen | `sr3e-mm-bioware` | empty |

**Nitrogen Binder, Corvette CyberLegs, Extending Legs, Magnetic Cyberlimb, Transparent Skin and
the Confusion Pheromones are in no shipped pack.** PACESETTER is `cb1.28`, archived fan content
(`archive/non-sr3-content/sr3e-bioware.json`).

That reorders the whole item. Shapes 3, 4 and 5 exist only for gear nobody can currently add to a
character, so building machinery for them is speculative — **Shape 2 plus one entry of Shape 1 is
the entire live surface.** Re-check this table before starting; a book toggle or a restore from
`archive/` changes the answer.

### What already exists to hang them on

| Channel | Shape it carries | Read with |
|---|---|---|
| `derived.skillBonusDice` | one named skill, always applies | `SR3EItem._skillBonusDice` |
| `derived.skillCategoryBonuses` | a skill CATEGORY, opt-in per roll | `SR3EActor.skillCategoryBonus` |
| `derived.situationalBonuses` | a **situation** — dice, TN or pool | `SR3EActor.situationalBonus` |
| `system.attributeBoost` + `SR3EActor.tickAttributeBoosts` | **activated, levelled, expiring** state | derived in `_prepareCharacter` |

Seventeen situations are registered in `SR3E.adeptSituations`: `toxin` `perception` `spellResist`
`detectionSpell` `healing` `counterattack` `mindControl` `surprise` `knockdown` `temperature`
`illusion` `jumping` `escapeArtist` `stabilization` `dodge` `social` `detectLying`.

⚠ **None of these channels is adept-specific.** They are keyed by skill, category or situation —
never by where the bonus came from. That was deliberate, and it is why this item shrank.

### Shape 1 — Situational · **mechanism exists, this is data entry**

| Entry | Effect | Situation |
|---|---|---|
| Nephritic Screen | `+1BOD` vs pathogens and toxins | `toxin` |
| Nitrogen Binder | `+2BOD` vs nitrogen narcosis | `toxin` |
| PACESETTER hearts | `+1BOD,+1QCK` **in Athletics** | *needs a new key* |
| Magnetic Cyberlimb | `+4STR` to hold on to items | *needs a new key* |

Nephritic Screen vs toxins is the same shape as Body Control vs toxins, which already works.
The other two need a situation key each — `athletics` and `grip` — which is one line apiece in
`adeptSituations` plus a checkbox where no flow can know.

⚠ **PACESETTER is `cb1.28`** — archived fan content that does not ship (see
`archive/non-sr3-content/`). Do not add a situation key for an item nobody has.

### Shape 2 — Triggered / toggled · **mechanism exists, and is stronger than this needs**

| Entry | Effect |
|---|---|
| Adrenal Pump [1]/[2] | `+1QCK,+2STR,+1WIL,+2RCT` while triggered |
| Pain Editor | `+1WIL,-1INT` while engaged |

⚠ **The original entry proposed `focusActive` — a plain on/off flag — and that is now the wrong
model.** Attribute Boost needed activate → levelled effect → expiring duration → Drain, and
`system.attributeBoost` with the `updateCombat` round tick is that machinery. Adrenal Pump is a
strictly simpler case of it: a duration with no activation test and no Drain.

⚠ **Adrenal Pump is not a toggle, it is a duration**, which is why the flag model fails: a GM who
forgets to switch it off leaves a character permanently boosted, and that is exactly the bug
`tickAttributeBoosts` exists to prevent. Pain Editor genuinely *is* a toggle — it stays engaged
until switched off — so the two want different halves of the same mechanism.

⚠ **Pain Editor carries a PENALTY** (`-1INT`). The bonus fields on cyber/bioware dropped their
`min: 0` in [#8](#8) precisely so negatives survive; whatever carries this must not re-introduce a
floor. `AdeptPowerData` keeps its floor, deliberately — do not copy that model here.

Both ship in `mm` and are live content, unlike PACESETTER.

### Shape 3 — Movement-only Quickness · **needs a small new channel**

Corvette CyberLegs Basic/Advanced (`+3QCK for mov.`), Extending Legs Unit (`+1QCK for walking
speed`). A situation key would work mechanically, but movement is not a Test — nothing rolls it —
so `situationalBonuses` would carry a bonus no flow ever reads. It wants a derived
`movementQuickness` that the movement display consumes, and nothing else.

⚠ It must NOT reach Reaction or Combat Pool. Both derive from Quickness, and a character who
sprints faster does not dodge better.

### Shape 4 — Affects bystanders · **UNDESIGNED, and the hard one**

Tailored Revolutionary Pheromones (Confusion) 1/2 — `-1INT,-1RCT for anyone within 1 meter`.

Every channel above modifies **the actor who owns the item**. This modifies *other actors, by
proximity*, which none of them can express and no existing derivation looks for. It needs a
notion of "auras from nearby actors" evaluated at roll time against canvas positions, and that is
a real design, not a data entry.

⚠ Do not bolt this onto `situationalBonuses`. That map is read off the rolling actor's own
derived data; making it mean "or somebody standing near you" would break every existing consumer.

### Shape 5 — Cosmetic / conditional · **reference-only is correct**

Transparent Skin (`-2CHA if face transparent`). GM-adjudicated. An item carrying only its
description is the right implementation, exactly as ~40 adept powers are.

### ✅ Enhanced Articulation's Reaction must not reach rigging or decking — **DONE 2026-08-31**

M&M p.66. `cyberBonus.rea` is one flat number that flows into VCR and Matrix initiative alike.
Splitting it is independent of everything above and is the smallest real fix in this entry.

⚠ Its Combat Pool caveat needs nothing — the pool derives from QUI+INT+WIL and never reads
Reaction.

⚠ **`reflexBonus` already resolves a Reaction/Initiative conflict** ([#64](#64)) and is the one
place both the Reaction derivation and `initiativeDice` read. Any split of `cyberBonus.rea` has to
go through it, or the two will disagree again — which is the exact failure that function was
written to prevent.

**Narrower than this entry assumed.** Four initiative paths were checked; only two applied the
bonus at all:

| Mode | Reads | EA applied? |
|---|---|---|
| VCR, jumped in | `reaction.base` | no — already excluded |
| **RCD, remote rigging** | `reaction.value` | **yes — fixed** |
| Orthodox Matrix | `reaction.base` | no |
| VR-Hot | `reaction.base` | no |
| **TRM / AR / VR-Cold** | `derived.initiative` | **yes — fixed** |

`derived.reactionNoRigDeck` now carries Reaction with the exempt bonuses removed, and those two
sites read it. `SR3E.reactionNotForRigOrDeck` is a name-matched list rather than an item flag —
a flag would be a data-model change with a migration and a restart, to express one rule about
one shipped item.

⚠ **The exclusion is that BONUS, not cyberware at large.** Wired reflexes apply to decking
perfectly well; the carve-out is Enhanced Articulation's alone. That is why the fix subtracts a
tracked portion rather than switching those paths to `reaction.base`.

⚠ **It only subtracts when the CYBER package actually landed.** `reflexBonus` picks one package
or the other, so when an adept's Improved Reflexes wins, `cyberBonus.rea` was never applied and
subtracting its exempt portion would remove a point the character never had. A mutant pins that
interaction.

### Suggested order

1. **Enhanced Articulation's Reaction split** — smallest, independent, and a live rules error.
2. **Shape 2** (Adrenal Pump, Pain Editor) — the machinery exists; this is wiring plus a sheet control.
3. **Shape 1** for the two shipping entries — data plus at most one new situation key.
4. **Shape 3** — a small derived value with one consumer.
5. **Shape 4** — design first, and only if the Pheromones are ever restored from `archive/`.

⚠ Steps 3-5 cover gear that does not ship. Doing 1 and 2 finishes everything a character can
actually own today; the rest is worth doing only when the content arrives with it.

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

### Re-confirmed by the core gear audit, 2026-09-02 — see [#91](#91)

`audit/sr3-core-gear-audit.md` reached this independently and adds three things: **arrows and
bolts** are the same gap (the nocked-ammo flow matches them by loading mechanism, and a bow can
never be re-nocked without them); ammunition did **not** ship mis-typed under some other item
type (checked by name across all 82 packs); and `ammunition` is one of **eight** declared Item
types with zero documents, so this is the sharpest case of a wider pattern rather than an
isolated omission.

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

## 51. ✅ Short Bursts — **DONE 2026-08-14**, with the per-phase caps

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
was never noticed. See [#55](#55) for the decision to flip that default, and what has to be
modelled first.

### What was built

`SR3EItem.resolveBurst(available)` is the pure classifier, and it returns a MODE as well as a
count, because the one-round case stops being a burst:

| rounds left | mode | Power | Level | recoil |
|---|---|---|---|---|
| 3+ | BF | +3 | +1 | +3 |
| 2 | BF (short) | **+2** | **unchanged** | **+2** |
| 1 | **SS** | — | — | SS rules |
| `null` (not tracking) | BF | +3 | +1 | +3 |

⚠ **A short burst is not a weaker burst.** +2 Power with the level UNCHANGED is the whole
rule, and "+2 and +1 level" is the obvious mis-reading — it makes a two-round burst hit harder
than the book allows. Pinned by the `short-burst-raises-level` mutant.

⚠ **The one-round case changes the MODE.** Resolving it as a feeble burst would still apply
burst recoil and a burst damage bonus. Pinned by `one-round-burst-stays-a-burst`.

`rollWeapon` re-computes recoil after consulting the clip, because the dialog priced a FULL
burst before anyone knew the magazine was nearly out, and warns the player which case they got.

### Per-phase firing caps (in scope, and previously absent)

`SR3EItem.phaseFireWarning(mode, roundsBefore, roundsThisShot)`. Only SS ever warned:

| Mode | Cap | Source |
|---|---|---|
| SS | 1 shot | p.114 |
| SA | 2 shots | p.115 |
| BF | 2 bursts | p.115 |
| FA | 10 rounds | p.116 |

⚠ **It is a PROXY and says so in its doc comment.** The real caps are stated in Actions —
Simple per shot or burst, Complex for full auto — and this system does not model the action
economy at all. All that exists is `roundsFiredThisPhase`, so a phase mixing modes drifts: a
3-round burst then an SA shot reads as 4 rounds and trips the SA cap early. It therefore
WARNS and never blocks. If action accounting ever lands, this is where to make it exact.

## 52. ✅ The Dodge Test had no modifiers at all — **DONE 2026-08-19**

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

⚠ **It was not one modifier but three**, and the third is the one that bites in every fight:

> "The base target number for this test is 4. The following modifiers apply:
>  • +1 per 3 rounds fired from a burst-fire or full-auto weapon.
>  • +1 per meter of shotgun spread at the target's position (see Shotguns, p. 117).
>  • **+ Damage Modifiers (p. 126).**"

The wound modifier is not an inference from that last line — the book **works it in the
example**: *"He rolls his 5 Combat Pool dice against a Target Number 5 (4, plus one from the
Light wound he took earlier)."* A single pistol shot at a lightly-wounded defender was already
being resolved wrong, so this was never a full-auto corner case.

**Why the wound modifier in particular was missing** is structural, and worth recording:
`rollPool` is what folds `woundMod` into a TN, and the dodge path does not go through it —
`_rollDodge` calls `_rollWave` directly, and `_rollWave` takes the TN as given. Nothing was
"forgotten"; the one place that applies wounds was never on this path.

### What was built

`SR3EActor.dodgeTN({ burstRounds, shotgunSpread, woundMod })`, pure, with `dodgeTNParts()`
beside it producing the breakdown shown to the player. The parts are a second implementation
of the same sum, so the suite checks them **against** it rather than against literals.

⚠ **`woundMod` is NEGATIVE**, matching `system.woundMod` everywhere else (`Math.min(0, …)`),
and is SUBTRACTED. A sign flip here makes wounded characters *harder* to hit and looks
entirely reasonable on screen — it has its own mutant.

⚠ **Burst rounds are the rounds aimed at THIS target, not `roundsExpended`.** Walking-fire
waste counts for recoil, the phase cap and the magazine, but it travels *between* targets and
is not volume of fire this defender is dodging. Same call as damage, opposite call to recoil.

**The defender now sees the TN before choosing.** The declaration dialog shows it with its
breakdown, because the trade is dodge-versus-soak and a TN of 9 makes spending pool there a
much worse bet than a 4 — the dialog previously showed the attack's successes but never the
number the dodge would be rolled against.

**Shotgun spread is declared, not derived** — choke is not modelled at all. See [#57](#57).

### Found while wiring it: `ammoType` was lost on every exploding roll

The explosion carry payload in `_postWaveCard` rebuilds the roll state field by field, and
`ammoType` **was not in it**, while the final wave reads `state.ammoType` to carry APDS and
Flechette into the soak. Any attack whose dice exploded — most of them — silently dropped the
ammunition's armour effects. Fixed in the same commit; it is the same carry chain the two new
dodge fields ride, and adding them without noticing would have reproduced it.

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

## 54. ✅ Three EW divergences from Rigger 3 — **ALL FIXED 2026-08-14**

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
> any successes allocated** from his test to infiltrate the network."  — *R3 p.36*

`system.infiltration.intrusionFactor` is initialised to 0 and `openInfiltration` writes only
the allocated successes (`SR3EMIJI.js:494`). Trixie's factor starts at **6** — her skill —
and rises to 8; ours would start at 0 and reach 2.

**This one mattered in play.** `detectInfiltration` rolls the defender's EW against the
Intrusion Factor as the target number, so an intruder was far easier to spot than RAW allows —
TN 2 instead of TN 8 in Trixie's case.

`openInfiltration` now stores `skill.rating + alloc.factor`. The allocation dialog and the
result card both show the split (`6 skill + 2 allocated`) so the baseline is visible rather
than mysterious, and `tests/ew-skill.test.mjs` pins Trixie's 6 and the 8 it becomes.

### ✅ 2. Flux complementary dice were granted to the Infiltration Test — **FIXED 2026-08-14**

R3 grants them **only for the MIJI Test**: *"The Intruder's flux rating may be used as
complementary skill dice for **this part of the test**"*, and the defender rolls "with
complementary skill dice equal to his Flux rating". The infiltration text grants none, and
Trixie confirms it: Flux 8, EW 6, and she rolls **6** dice, not 6 + Flux.

`openInfiltration` added `_complementary(flux, skill.rating)` anyway, roughly doubling the
pool — and since these successes buy channels, time reduction AND Intrusion Factor, it
inflated all three at once. It compounded with 54.1: a bigger success pool feeds a bigger
factor.

The term is gone; infiltration now rolls the EW skill alone. Flux is no longer read there at
all. R3 does use Flux for RANGE ("the range of an electronic device depends on its Flux
Rating"), but this flow has never checked range and still does not — that stays a GM call.

### ✅ 3. `_complementary` capped at min(Flux, skill) — **FIXED 2026-08-14**

R3 says complementary dice **equal to the Flux rating**, with no cap. And SR3's actual
Complementary Skills mechanic (p.97) is not bonus dice at all:

> "the player can roll dice for the Knowledge Skill **against the same target number**…
> **Every 2 successes** rolled on the Knowledge Skill Test count as an additional success
> toward the Active Skill's Success Test. At least one success must have been scored with
> the Active Skill."

Three candidate readings existed — R3's flat "+Flux dice", SR3's 2:1 second test, and our
capped `min(Flux, skill)`. **The maintainer chose R3's**, 2026-08-14.

`_complementaryDice(rating)` now returns the full rating. R3 states the quantity three times
and never bounds it by the primary skill, and the third site is one this task had missed:

| Site | R3 |
|---|---|
| MIJI intruder | "The Intruder's flux rating may be used as complementary skill dice" (p.37) |
| MIJI defender | "with complementary skill dice equal to his Flux rating" (p.37) |
| **ECCM regeneration** | "may use Electronics (Electronic Warfare) skill dice as complementary dice for this test" (**p.40**) |

The cap bit hardest on the riggers it should least — a specialist with Flux 8 and EW 4 got 4
of their 8 dice. Trixie is on Flux 8.

⚠ SR3 p.97's mechanic (a separate test at 2 successes → 1) is NOT what this is, and switching
to it later would be a different shape — a second roll — not a tweak to this number. Pinned
in `tests/ew-skill.test.mjs`.

## 55. Default `trackAmmo` ON — and the ammunition model it needs first

Decided 2026-08-14. `trackAmmo` currently defaults **off**, so the whole magazine/reload
layer is dormant for a new world, and rules that depend on it ([#51](#51) short bursts) can
never fire. It should be on by default.

⚠ **Flipping the default is one line; the reason it is not done yet is what it exposes.**
With tracking off, nobody notices that ammunition is modelled thinly.

### What needs deciding before the flip

- **Ammo types.** `SR3E.ammoTypes` holds the rules (APDS, explosive, EX, gel, flechette,
  tracer, anti-vehicle), and firearms carry `loadedAmmoType`, but the **stockpile is one
  undifferentiated `rounds` count per ammo item**. A runner carrying regular, APDS and
  explosive for the same gun has three items and no notion of which is in the clip beyond a
  single string. Reloading picks a stockpile by loading mechanism, not by what the player
  wants loaded.
- **Weight / encumbrance.** Ammunition has none. There is no weight field on the ammo item
  and no carried-load calculation anywhere in the system, so "how much can this character
  actually carry" cannot be answered — which is half the point of tracking ammo at all.
- **Bows and crossbows** already nock a single arrow/bolt with no types at all (always
  `regular`), so arrowheads would need the same treatment.

### Sequencing

Turning tracking on before the model is right would make every table meet the thin parts at
once — empty-clip bails, reload prompts that cannot express "load the APDS" — and the likely
outcome is that people turn it straight back off.

So: **model first, default second.** [#23](#23) (ship an ammunition compendium) is the other
half of this — the code is complete and the content is missing.

## 12. Write a committed pack rebuild script and vendor its sources — *keystone; blocks #1*

**The repo cannot currently rebuild its own pack structure.** The book split used throwaway
scratchpad scripts never committed (`3437608`, `39f8946` touched only `system.json`,
`packs/`, `archive/`, tests), so the **`bookPage`-prefix → per-book-pack routing exists
nowhere in git**. The populate macros wouldn't help — they target the old monolithic packs.
This gap predates the retire decision.

**Live risk — corrected 2026-08-20 after re-reading the thread.** The version above said
*"issue #199 is open… if they normalise the `Mods` encoding"*. **That is wrong on both counts:**
the issue is **CLOSED**, withdrawn by us on 2026-07-30 once the maintainer explained the
encoding, and he gave **no indication of normalising anything** — he described the codes as
deliberate and specific: *"it's all in there for -something-, but it's all specific
unfortunately."*

**The actual risk is worse, and it is present rather than hypothetical.** criticalfault posted
**two different maps from two different parts of his own codebase**, and they disagree:

| | backend map (comment 1) | Magic Panel map (comment 4) |
|---|---|---|
| Racial Body / Str / Qui | `ROD` `RTR` `RCK` | `RBOD` `RSTR` `RQCK` |
| Racial Intelligence | `RNT` | — absent |
| Natural Reaction / Init | `NCT` `NNI` | — absent |
| Combat Pool | — absent | `CPL` |

Both encodings **already coexist in the data**: `Bioware.json` uses the 3-letter form,
`AdeptPowers.json` the 4-letter. So an importer must handle both on day one, and there is no
single authoritative map to copy — the format's own author maps it differently in different
panels.

That makes vendoring **more** valuable, not less, but for a different reason than recorded:
not *"upstream might change it"* but *"it is already inconsistent and undocumented, and a
pinned snapshot plus a committed map is the only way to make it tractable."*

⚠ **`Mods` is also overloaded with non-attribute flags**, confirmed by the maintainer:
`STG` (Suprathyroid Gland) and `MNE` (Mnemonic Enhancer) alter **karma spending**, `DGX`
(Digestive Expansion) alters **lifestyle cost**. With `DJK` `PCL` `PCA` `AST` `MUL` `MAG`,
none appear in either map. A map stage that treats every `Mods` token as an attribute bonus
invents phantom attributes for all of them. [#8](#8) carries the filter list.

**Step 1 — vendor.** `rawdata/` pins `ActiveSkills`, `Armor`, `LanguageSkills`, `MDF-*`,
`ODM-*` but **none** of the generator JSON the 11 v2 macros fetch live (Cyberware, Bioware,
Firearms, Spells, Vehicles, Drones, AdeptPowers, Programs, VehicleMods, VehicleWeapons).
Snapshot them (suggest `SRCG-` prefix). Upstream change then = reviewable diff.

**Step 2 — the script.** `read vendored JSON → map → route by bookPage → per-book packs`.

- *Map*: recover field translations from the v2 macros **before deleting them** —
  `EssCost`→`essenceCost`, the `(CategoryCode)` suffix parse, weapon-category→skill,
  damage codes, art. The 82 shipped packs are worked examples to verify against.
  **Two hard requirements from issue #199, both non-obvious:**
  1. **Accept BOTH racial encodings** — 3-letter (`ROD` `RTR` `RCK` `RNT` `NCT` `NNI`
     `XOD` `XCK` `XTR`) and 4-letter (`RBOD` `RSTR` `RQCK`). They coexist in the data today,
     split by file, and neither of the maintainer's own two maps covers both.
  2. **Filter the non-attribute flags** or they become phantom attributes: `STG` `MNE` `DGX`
     `DJK` `PCL` `PCA` `MUL` `AST` `MAG` `CPL`. These encode karma-spending and lifestyle
     effects, not bonuses. A parse that assumes every token is an attribute is wrong for all
     of them — see [#8](#8) for the confirmed list.
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

## 41. ✅ Knockdown — **DONE 2026-08-20**

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

✅ **Checked 2026-08-20 — the table is fine and that warning is retired.** p.124 extracts cleanly,
and the prose confirms it independently: *"a character who has taken a **Moderate** wound must roll
at least **3** successes."* The transcription above was correct.

⚠ **Gel rounds are an explicit exception**: *"against weapons firing gel rounds the target number for
the Body Test to resist knockdown is against the **full** Power of the attack"* (p.116) — not half.
The system already models gel's armour exception via `armorEffect: 'gel'`, so this belongs beside it.

### The two open questions, answered

**Which wound level — the ambiguity is real, and the answer is "this attack, editable".**
p.124 pulls both ways in adjacent sentences: *"how severely damaged the character is"* and
*"does not generate enough for **his wound level**"* read as the character's cumulative
condition, while *"has taken a Moderate wound"* and *"Characters who **take** a Deadly wound"*
read as this blow. They agree only for an unhurt target.

The per-attack reading wins here for a **system-specific** reason rather than a textual one:
this system never applies damage automatically, so when the knockdown card is built the new
wound is not on the sheet yet, and a cumulative figure would ignore the very hit that caused
the test. The threshold is therefore **editable**, and the dialog shows the target's current
wound level and what a cumulative reading would require — so a table reading it the other way
changes one number rather than fighting the system. *(Decision: the maintainer, 2026-08-20.)*

**Who rolls it, and when — the target, on the soak result card.** `.sr-knockdown-btn` sits
beside Assign Damage and is gated with `_isDecider`, because it rolls. Everything it needs was
already in the soak payload: `stagedPower`, `isMelee`, `ammoType`, `attackerActorId`. No button
is offered when the damage is completely soaked — no wound, no wound level, no test.

### What was built

- `SR3EActor.knockdownOutcome({ level, successes })` — pure. Returns `automatic` /
  `knockedDown` / `staggered` / `standing` and the `needed` threshold.
- `SR3EActor.knockdownTN({ power, strength, isMelee, ammoType })` — pure.
- A result card carrying a **🔻 Mark prone** button (`prone` is a core Foundry status, so no
  custom effect was needed), gated with `_mine` rather than `_isDecider`: it only toggles a
  status, and a GM doing it for a player is the ordinary case.

⚠ **Deadly SKIPS the test; it is not a hard test.** The table prints NA, not 5. The distinction
is invisible today and stops being invisible the moment anything grants a bonus to the Body
Test. Mutant: `deadly-knockdown-is-just-a-hard-test`.

⚠ **ZERO successes is specifically the prone case**, not "fewer than needed" — so staggering
requires `successes > 0`. Folding the two together means nobody ever hits the floor. Mutant:
`knockdown-zero-successes-only-staggers`.

⚠ **Ranged halves the attack's POWER, not the soak TN.** The soak rolls against Power minus
armour; knockdown ignores armour completely.

⚠ **Melee uses the opponent's STRENGTH ATTRIBUTE**, not the weapon's damage code — easy to
conflate, since melee damage is usually written as (STR)M.

⚠ **Gel rounds resist against the FULL Power** (p.116), so the round that is easiest to soak
is the hardest to stay upright against — which is the point of it. Mutant:
`knockdown-gel-rounds-halve-like-everything-else`.

**Not modelled:** the *"+2 modifier to his target numbers until he is able to move away"* clause
for a staggered character with a wall behind them. Whether they can step back is a positional
judgement the system cannot make, so the result card states the rule and the GM applies it —
now easy, via [#58](#58)'s situational modifier.

### What depended on it — both now unblocked

- [#40](#40) Charging's failure branch — *"Quickness (5) Test or fall prone"*, or *"+2 instead"*
  to an existing Knockdown Test. That clause now has something to modify.
- [#37](#37)'s `prone` melee modifier (−2 to the opponent) can now become true: the knockdown
  result card sets the core `prone` status.

## 39. ✅ Full Defense — **DONE 2026-08-19**, and it was worse than half-built

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

### What was built

`SR3EActor.fullDefenseOutcome({ attackHits, skillHits, dodgeHits })` is the whole rule, pure,
returning `{ blocked, net, cleanMiss, remaining, dealsDamage }` — `dealsDamage` is a constant
`false`, because the book says so twice and a field that can only be false is clearer than a
comment nobody reads.

- **Stage 1 is pool-free.** `handleMeleeRoll` zeroes the defender's Combat Pool allocation and
  says why. It **zeroes rather than rejects**: the pool is not forbidden, it is reserved for
  stage 2, where *"only Combat Pool dice may be used"*.
- **Stage 2 is a new card.** `.sr-fd-dodge-btn` → `handleFullDefenseDodge`, gated with
  `_isDecider` (it rolls, so exactly one user owns it), Combat Pool only, TN from the
  defender's own melee TN so the Melee Modifiers Table applies as p.124 requires.
- **The defender deals no damage**, including on an outright win.

⚠ **THE SECOND-STAGE DODGE SUBTRACTS FROM STAGING. The ordinary one does not.** p.124:
*"subtract the Dodge successes from the attacker's and apply any remaining successes to staging
up the Damage Level."* p.113: the successes *"are added to the Damage Resistance Successes"* and
staging still comes from the attacker's raw total. Same word, two arithmetics. `dodgeOutcome`
and `fullDefenseOutcome` are separate functions for exactly this reason, and
`tests/full-defense.test.mjs` asserts both answers on the SAME numbers so that unifying them
means deleting a test that explains why they differ.

⚠ **Both comparisons are strict and point in OPPOSITE directions.** The block needs the
defender to have *more*; the clean miss needs the dodge to *exceed* the net. A tie on the skill
test is therefore not a block — net 0, base damage, and the dodge is still offered. Both have
mutants.

### Found in the same passage: the melee TIE was resolved backwards

p.122 step 3: *"The character who rolls the most successes has hit his or her opponent.
**A tie goes in favor of the attacker.**"*

`_postMeleeResult` announced "🤝 Tie! — no damage dealt" and returned. RAW is an attacker
hit with net 0: base Damage Level, defender resists. Now `SR3EActor.meleeOutcome`, and the
staging gate moved from `net > 0` to unconditional — gating on `> 0` would have posted no soak
button and deleted the attack a second way.

⚠ This is the same strictness trap as the ranged Dodge Test tie already pinned in
`dodge-resolution.test.mjs`, pointing the other way. Two tie rules, both wrong, in opposite
directions, neither found by play.

### Ranged Full Defense is a system extension, not RAW

Full Defense is a **melee** construct: p.108 Interception forces the passer into it, p.121
whips reference it, p.123 defines it in melee terms. Nothing in the ranged rules mentions it —
the p.113 Dodge Test already spends Combat Pool freely without it.

The pre-existing behaviour on the ranged path (a reserved pool auto-declared as dodge dice) is
therefore **kept and documented as an extension**, not RAW. Removing it would take away
something tables are using, and it is harmless — it only pre-fills a declaration the defender
would otherwise type. Worth a deliberate decision if it ever conflicts.

## 40. ✅ Charging Attack — **DONE 2026-08-21**, and the book gate is set

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

### ✅ The precedent, decided

**Optional rules ride the existing per-book toggle.** `SR3ESourceBooks.optionalRuleAllowed(code)`
is the entry point, and it is a thin named wrapper over `isAllowed` — which turned out to be
general already, so the "new capability" this item feared cost almost nothing. `skillOffered`
(martial arts, 2026-08-20) was the first rule-adjacent use; this is the first mechanical one.

**Why not a separate settings list.** A table that has not enabled Cannon Companion has already
said it is not playing with Cannon Companion. Asking again in a second list is the same question
twice, and the two answers can disagree. The cost is granularity — you cannot take Charging
without the rest of CC — and that is the right trade while the number of optional rules is
small. **If it stops being small, `optionalRuleAllowed` is the single function to change.**

### Notes for implementation

- **+1 Power, not a TN change** — it is a damage modifier, unlike almost everything else on the
  melee surface.
- **Movement continuity spans passes**, so it cannot be derived from a single action; it needs
  either token-movement tracking or an honest declaration. Given the minimal-guardrails ethos, a
  checkbox the attacker ticks is probably right.
- The failure branch wants **Knockdown** — implemented since [#41](#41), so the `+2 instead`
  clause now has something real to modify.

### What was built

`SR3EActor.chargingFailure({ attackFailed, knockdownRequired })` and `chargingPowerBonus()`,
both pure. The declaration is a checkbox in the attacker's called-shot dialog, rendered only
when `cc` is in play.

⚠ **"INSTEAD" IS EXCLUSIVE, and it is why this is a function rather than two inline
conditions.** A charger who ate a counter-attack does **not** roll Quickness as well — their
existing Knockdown Test simply gets harder. Running both punishes one failure twice, and is
exactly what an "apply all consequences" implementation would do. Mutant:
`charging-failure-does-both-tests`.

⚠ **+1 POWER, not a target number.** Nearly every other melee option moves a TN. Power doubles
as the Damage Resistance TN, so the +1 makes the wound both likelier and worse. Mutant:
`charging-bonus-is-a-target-number`.

⚠ **The +2 lands on the CHARGER's Knockdown Test** — the one they make because the *defender*
hurt *them* — carried through the soak payload as `knockdownTNMod`.

**Movement continuity is declared, not measured**, as this item predicted. The book wants 2+
metres of *continuous* movement across passes, which no single action can evidence; the dialog
says so rather than pretending to know.

## 38. ✅ Multiple targets — **DONE 2026-08-19**, both halves

**Raised in play 2026-08-10.**

> ⚠ **This item was re-discovered and half-fixed on 2026-08-19 without noticing it was already
> here**, which is worth recording as a process failure rather than quietly tidying away: the
> ranged fix went in as commit `4368847` and its rationale was re-derived from scratch. The
> ranged half below is now done; **the melee half and the pool-allocation clause were never
> touched** and are the reason this item stays open. [#56](#56) was also filed that day and
> overlaps the "why it is not simply a checkbox" section — see the cross-reference there.

### ✅ Ranged — done (`4368847`, `376faa8`)

Lifted the target ordinal out of the FA-only section of the fire dialog so every mode asks for
it, behind the pure `SR3EItem.multiTargetTN(ordinal)`. Cited to **p.111**, whose rule sentence
is unrestricted — *"If a character is attacking multiple targets within a single Combat Phase,
he adds a +2 modifier per additional target"* — with full auto appearing only in the example
that follows. p.116's restatement sits under FULL-AUTO MODE because **walking the fire** is the
full-auto part, not the +2.

### ✅ Melee — done, and the second clause was a bigger bug than this item described

**The +2 already existed.** `#gmm-multi` in the melee GM window feeds `sumMeleeModifiers`,
which does `atk += 2 * extra`, and `tests/melee-modifiers.test.mjs` already asserted it. It
arrived with [#37](#37)'s melee TN window and this item was simply never updated. Reachable in
both `gmApprovesTN` modes: with the window off, the corner's own TN field is editable.

**The clause that WAS broken** is the one that reads like a note:

> "Dice from the Combat Pool must be allocated separately for each attack."

The clamp inside `spendCombatPool` is what enforces it — a second attack can only draw on
what the first left behind — and **every call site discarded the return value**, building the
dice from the REQUEST. Ask for 4 with 2 left and you spend 2 and roll 4, silently, every phase.

⚠ CLAUDE.md had already documented this exact bug in cybercombat (*"built its dice from the raw
input while clamping the spend"*), which is the best possible evidence that a prose warning does
not hold this line. So the guard came first: `tests/pool-spend.test.mjs` scans for any
`spend*Pool(` whose return is discarded, and separately checks the four helpers still RETURN the
deduction — without that second check the first rule is vacuous.

**Ten sites, six found by hand and four by the guard:** both melee corners, both astral corners,
three Matrix roll paths, plus Spell Defense commitment (which reserved dice it never paid for
and rolled them later in the turn), Dispelling, the grenade/AoE Combat Pool, and spellcasting's
Spell Pool. All now roll the grant and warn when it is short.

⚠ **Not hypothetical on this branch.** The prompt clamps to the pool as read when the dialog is
built; between that and the spend another client can spend from the same pool. Multi-client
concurrency is the whole reason [#2](#2) exists.

### The original text, for the record

The +2-per-additional-target penalty was computed in exactly one place, inside a Full Auto
branch of the fire-mode dialog:

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

⚠ **The ranged fix did NOT solve this** — it asks the player for the ordinal rather than deriving
it, which is [#56.2](#56). Both items describe the same missing per-phase memory; #56.2 owns the
derivation work, this one owns the rules still unapplied.

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

## 8. ✅ Ship cyberware/bioware with their bonuses pre-filled — **DONE 2026-08-21**

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

---

## What was built

**`scripts/SR3EMods.js`** — `parseMods(str)` → `{ bonuses, flags, unmapped, unparsed }`, pure.
**Every token lands in exactly one bucket; nothing is silently discarded.** That is the design
rule, because this data has already lost information once and a parser that quietly ignores
what it does not understand loses it again.

Verified across all **1,298** upstream entries: **186** carry `Mods`, **zero** tokens unparsed.

| Bucket | What goes there |
|---|---|
| `bonuses` | the 8 SR3E `bonus*` fields, racial/natural collapsed to plain |
| `flags` | `STG` `MNE` `DGX` `DJK` `PCL` `PCA` `MUL` `AST` — karma/lifestyle/equipment, **not** modifiers |
| `unmapped` | `IMP`/`BAL` armour, `TAS`/`HAC`/`CPL` pools, `VCT`/`VNI`/`VCR` rigger — real, but no field exists |
| `unparsed` | anything else, named so it can be chased |

**`tools/build-mods-bonuses.mjs`** → generates `scripts/data/srcg-bonuses.js`, **142 items**.
Vendored deliberately: the populate macros fetch upstream JSON *live from GitHub*, so an
upstream change is currently invisible ([#12](#12)). A committed map makes it a reviewable
diff — and lets the migration read it inside Foundry, where there is no filesystem.

**Both halves are patched from the one map:**
- `tools/patch-pack-bonuses.mjs` — the compendium, so new drags arrive correct.
  **111 of 142 matched**; the other 31 are simply not in the shipped packs (one is a rename,
  "Hydraulic Ram" vs "Hydraulic Jack"). ⚠ **Reported, never fuzzy-matched** — assigning
  bonuses to a guessed item is worse than assigning none.
- A migration at `0.4.5.5` — items already embedded on actors, which the pack fix cannot reach.

### ⚠ The schema was asserting something false

Every `bonus*` field was `min: 0`. Three entries carry a **penalty** — BIODYNE "Enable"
Cyberlimbs (`-1RCT`) and Grade Subdermal Armor [8]/[9] (`+3BOD,-1RCT`) — which the floor
silently stored as **0**, so the items looked as though they had no penalty at all. The floor
was removed from the 8 cyberware and 8 bioware fields.

⚠ **This currently changes no shipped document**: all three negative items are among the 31 not
in the packs. It was still necessary — the schema was wrong, the migration will apply them to
any actor who owns one, and a GM can now type a penalty by hand.

⚠ **`AdeptPowerData` deliberately KEEPS its floor**, `bonusMag` included. Nothing in the data
produces a negative adept bonus, and negative Magic feeds Spell Pool and Essence-derived Magic
in ways not worth opening speculatively.

### ⚠ Enhanced Articulation's +1 Reaction is now applied

Reversing the call made on 2026-08-20, when it was left unset because M&M says the bonus has
*"no effect on rigging or decking and does not affect the Control Pool"*. It comes from `+1NCT`
like every other item, so the base bonus is right and the conditional exception stays
unmodelled under [#30](#30) — consistent with how all 142 are treated.

### Still out of scope

**14 entries have `Mods: ""` with modifiers only in `Notes`** (9 in Bioware) — Adrenal Pump,
Nephritic Screen, Nitrogen Binder. Most are conditional (`+2BOD` only when resisting nitrogen
narcosis), which is exactly [#30](#30). A `Mods`-only parse skips them by design, not by
accident.

Armour values, weapon-damage strings and category-wide skill bonuses still need judgement —
the last of those is [#10](#10), already done.
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

---

<a id="56"></a>
## 56. Full auto still asks the player for what the system could work out

Raised 2026-08-18, alongside the walking-fire fix. Both numbers that make a multi-target
full-auto attack correct are typed in by hand, and each has a source of truth already sitting
in the code that nothing consults.

### 56.1 Smartguns waste no rounds — and the system cannot tell

*SR3 p.116*, flatly: **"Smartguns never waste rounds."**

Not a discount — the round is simply never fired. A smartgun slews to the next target without
spending anything crossing the gap, so the saving lands on all three of the things
`roundsExpended` feeds: the magazine, recoil, and the 10-round phase budget. It is the
difference between Able's three targets at a metre costing **11 rounds** (illegal, over the
cap) and **9** (fine).

Today the player has to know to leave "metres to previous target" at 0. Nothing in the dialog
even hints at it.

⚠ **Blocked on [#18](#18), and not worth faking around.** Smartgun detection is the
free-text `accessories` StringField guess in `guessGearModifiers` — good enough to
pre-tick an overridable TN checkbox the GM is looking at, nowhere near good enough to
silently zero a player's ammunition. A wrong guess here is invisible and costs rounds.

**Interim, cheap, honest:** a one-line note under the metres field — *"Smartguns waste no
rounds (p.116) — leave at 0."* Costs nothing and does not pretend to know.

**Once #18 lands:** default the field to 0 and disable it when a smartgun is detected, with
the reason shown. Still overridable — minimal guardrails.

### 56.2 Nothing remembers who you already shot at this phase

⚠ **[#38](#38) raised this first, on 2026-08-10**, under "Why it is not simply add a checkbox".
This section is the same gap seen from the other end: #38 owns the multi-target rules still
unapplied (melee, and per-attack pool allocation), this owns deriving the two dialog inputs.

Two controls in the fire dialog are manual for the same missing reason:

| Control | Asks for | Could be derived from |
|---|---|---|
| "Which target this Combat Phase?" | the ordinal, driving +2 each (SR3 p.111) | the set of targets fired at this phase |
| "Metres to previous target" | walking-fire waste | `_measureDistance` between this target's token and the previous one |

`_measureDistance` already exists and already runs — it is what classifies the range band on
every shot. What is missing is a per-phase record of **which actors have been engaged**, in
order. `roundsFiredThisPhase` counts rounds and nothing else, so each `rollWeapon` call is
blind to the ones before it.

A `system.targetsThisPhase` array (actor ids, in order, cleared by `resetRecoil` alongside
`roundsFiredThisPhase`) would let both fields prefill:
- ordinal = index of this target in the list + 1, or `length + 1` for a new one
- metres = measured distance from the previous entry's token

⚠ **Prefill, do not enforce.** The ordinal counts **targets, not shots** — a second burst at
someone already shot is still their ordinal, not a new one — and that is exactly the sort of
judgement a GM overrides. Both fields stay editable.

⚠ **The failure mode today is silent under-reporting**, not cheating: a player forgets they
already shot at Brian and leaves the ordinal at 1, and the attack is simply 2 points easier
than it should be. Nothing warns, because nothing knows.

### Not in scope here

The magazine arithmetic is correct and was correct before the walking-fire fix — each
declaration spends only its own rounds plus its own waste. This item is about the two inputs
to that arithmetic being hand-entered, not about the arithmetic.

---

<a id="57"></a>
## 57. Shotgun choke and spread are not modelled — *SR3 p.117*

Split out of [#52](#52), which needed the spread as an input and found nothing to read it from.

A shotgun firing shot rounds throws a cone. The user sets a **choke** from 2 to 10, and *"for
every number of meters equal to the choke setting that the shot travels, it will spread one
meter"*. So the width at distance *d* is `ceil(d / choke)` metres, and the number of times it
has spread is that minus one.

Three separate effects hang off that count, and **the system implements none of them**:

| Effect | Rule |
|---|---|
| Power | −1 per spread — *"Every time a shot round increases its spread, it loses 1 point of power"* |
| Attacker's TN | −1 per spread — *"Every time the shot spreads, subtract -1 from the attacker's target number"* |
| Defender's Dodge TN | **+1 per metre of spread** (p.113) — the only one currently reachable, and only by hand |

The book's own worked line pins the arithmetic: at choke 5 it is **−2/−2 at fifteen metres**
(width 3, so two spreads) and **−3/−3 at twenty** (width 4). Also: *"Everything and everyone
within the area of spread is considered a valid target"*, so a full implementation is a cone
template, not a number.

**What exists today** is a "Shot spread at the target (m)" field in the fire dialog, shown only
for `ShtG`, defaulting to 0, feeding `dodgeTN`. That makes the p.113 modifier reachable without
pretending to model choke. The attacker knows their choke and their range; p.117 has the table.

⚠ **The dodge modifier is +1 per METRE OF SPREAD, which is the width minus one** — the amount
by which the cone has widened, matching the attacker's −1 per spread. Reading it as the raw
width would penalise a point-blank shotgun that has not spread at all.

**To finish it:** a `choke` NumberField (2–10) on the firearm — a data-model change, so a full
Foundry restart — plus a shot-vs-slug distinction (shot rounds use the flechette rules, so
`ammoType` is close but not the same question), and then all three effects derive from the
range that `_measureDistance` already computes on every shot.

---

<a id="58"></a>
## 58. ✅ A free situational row in the GM windows — **DONE 2026-08-20**

**Requested 2026-08-20.** Every row in the GM's TN window is a rule transcribed from a table.
There is no way to apply *"you are shooting through a doorway at someone leaning out of a
moving van"* — the GM either abandons the window and types a raw TN, or silently mis-uses a
row that means something else.

Both are bad in the same way: **the window stops being a record of why the number is what it
is.** That record is the reason the window exists rather than a plain input.

### What was built

⚠ **Scope narrowed during the work, on the requester's call:** the box takes **only the
number**. Downstream cards carry **static wording** — "GM situational modifier +2" — and the
table asks the GM why. That removed the free-text plumbing entirely: no reason field through
the negotiate queries, no explosion-carry field, and no HTML sanitisation problem, which the
original write-up had flagged as the three hazards.

One row, in **both** windows:

| | Ranged (`SR3E_RANGED_MODIFIERS`) | Melee (`SR3E_MELEE_MODIFIERS`) |
|---|---|---|
| control | signed number | signed number **+ a side** |
| summed by | `sumModifiers` `value: true` branch | `sumMeleeModifiers` situational branch |
| shown on | the attack card label and TN breakdown | the boxing card header |

⚠ **Melee is not the same control.** `sumMeleeModifiers` returns an `{atk, def}` **pair of
deltas**, not a finished number, and most p.123 rows move both at once in opposite directions.
A situational row therefore needs a side — attacker, defender, or both — in the shape of the
existing `side` / `sideOpposed` kinds. A single number silently applied to the attacker would
be wrong half the time.

### Where it plugs in

- A new row **kind**, alongside the existing `mod` / `per` / `select`+`value` (ranged) and
  `diff` / `perAtk` / `side` / `sideOpposed` / `visibility` (melee). Rendered by `renderRow` in
  `_promptGMAttackWindow` and its melee twin.
- `sumModifiers` already handles rows that carry their own resolved number — the `value: true`
  branch, read **before** the falsy guard because 0 is a real answer. A situational row is the
  same shape, so it should reuse that branch rather than adding a third summing path.
- Group: **Conditions** for ranged. It is a judgement, not a guess from gear, so it must not
  land in the `gear` group, which is captioned as things the system inferred.

### It is reported separately from the TN, and that is the point

The GM window already returned a finished `tn` with the situational amount inside it. That is
enough to ROLL correctly and not enough to SAY anything, so the amount is returned alongside
`adjudicated` as its own field and carried through `sr3e.attack.negotiate` /
`sr3e.melee.negotiate`. Otherwise the table just sees an unexplained 6.

⚠ **The ranged row is signed and may be 0**, unlike every other row in that table, so it is
summed through the `value: true` branch — which `sumModifiers` reads **before** its falsy
guard. Routing it through the ordinary `mod` path would silently drop every negative and every
deliberate zero.

⚠ **Melee's unknown-side fallback is the attacker, not nothing.** A number the GM
deliberately typed going nowhere is worse than one landing on the likelier side, and a silently
ignored modifier is invisible on screen.

### A harness hole found while writing its mutant

The melee side rule cannot have a mutant: this harness patches a **static on a class**, and
`sumMeleeModifiers` is a plain module export, which ESM makes read-only. Ten assertions cover
it instead.

Writing the mutant anyway exposed a real bug in the tooling. `tests/run.mjs`'s parent process
collapsed a child's **exit 2** (harness error) into **exit 1** (test failure), so
`tests/mutate.mjs` never saw a harness error — its `broken` branch could not fire, and a
mutant that had **never run at all** was reported as *killed*, with "0 assertions caught it"
as the only visible clue. Both ends are now guarded: `run.mjs` propagates 2, and `mutate.mjs`
independently rejects any kill with zero failing assertions.

### Deliberately not

- **Not a modifier library.** No saved presets, no per-world list of house modifiers. One row,
  typed each time — the whole point is the cases the tables do not cover.
- **Not a replacement for the typed-TN escape.** With `gmApprovesTN` off there is no window at
  all and the TN field stays editable; that path is unaffected.

---

# 🧙 Adept powers

Opened 2026-08-29 from a full audit of all 117 shipped powers — **`audit/adept-powers-audit.md`**
carries the evidence, the per-power inventory and the book citations. Read it before starting any
of these; the entries below are the actionable summary, not the finding.

**Sequencing: 59 is the root cause and must come first — but 63 and 64 must land WITH it, not
after.** Filling the pack data turns two currently-latent rules violations live on the next world
load. Everything else is independent.

<a id="59"></a>
## 59. ✅ Every adept power ships mechanically inert — **DONE 2026-08-29**

**117 powers across 4 packs. Zero have any bonus field set. Zero name a skill.**

```
powers=117  with a mods string=14  with ANY bonus field set=0  with improvedSkillName set=0
```

The runtime is fine — `SR3EActor._prepareCharacter` (`:1673-1695`) reads the nine `bonus*`
fields, `improvedSkillName` and `improvedSkillCategory` off every `adeptpower`, correctly gated
on `magicType === 'Adept'`. **The data never arrives.** Two independent breaks:

1. **`tools/build-mods-bonuses.mjs:35`** declares `FILES = { 'Cyberware.json': …, 'Bioware.json': … }`.
   Upstream ships **`AdeptPowers.json`** beside them and it is simply not listed, so
   `scripts/data/srcg-bonuses.js` holds no adept power and `patch-pack-bonuses.mjs` has nothing
   to write. A gap in [#8](#8), not a decision — nothing in the tool says adept powers were
   considered.
2. **`AdeptPowerData` has no `mods` field** (`ItemDataModels.js:376`; only Cyberware `:245` and
   Bioware `:296` declare one). 14 powers *do* carry a `mods` string in the pack, 10 of which
   parse cleanly, but a TypeDataModel drops undeclared keys — so the string is discarded at load.
   Hand-patching the pack alone would achieve nothing.

**Fix:** add `AdeptPowers.json` to the generator, regenerate, extend `patch-pack-bonuses.mjs` to
the four adept packs, and add a migration for worlds already holding copies (Foundry embeds
items — a pack fix reaches nobody who already owns one).

⚠ **Do NOT fill `bonusStr`/`bonusQui`/`bonusBod` for Attribute Boost** — see [#63](#63). It is
the one power where the obvious channel produces a rule that is *worse* than leaving it inert.

⚠ **Landing this alone makes [#64](#64) live** — Improved Reflexes will start stacking with
wired reflexes the moment the data exists.

⚠ `+1MAG` on Magical Power stays unmapped, deliberately. It grants a magician's *path*
(MITS p.22), not a Magic point; `bonusMag` would inflate Spell Pool and effective Magic.

<a id="60"></a>
## 60. ✅ Improved Ability has no cap — *SR3 p.169* — **DONE 2026-08-29**

> "You cannot have more additional dice than your base skill rating or your Magic Attribute,
> whichever is less. For example, an adept with Pistols 4 and Magic 5 cannot have more than 4
> Improved Ability (Pistols) dice."

`SR3EActor.js:1691` applies the level with no clamp:

```js
_addSkillDice(s.improvedSkillName, s.hasLevels ? (s.level ?? 1) : 1, …);
```

**The only entry here already reaching the table**, because `improvedSkillName` is the one field
a GM fills in by hand. A pure clamp — `Math.min(level, skillRating, magic)` — and the smallest
piece of real work in this group.

⚠ The cap is against the **base skill rating**, not the rating plus specialisation, and against
**Magic**, so it moves when Essence or Bio Index move.

<a id="61"></a>
## 61. ✅ Defaulting to an improved skill gives the wrong number, twice — *SR3 p.169* — **DONE 2026-08-30**

> "If you are defaulting to the improved skill, only half (round down) of the Improved Ability
> dice may be used."

- `SR3EItem.defaultTiers` (`:525-556`) builds every tier from `s.system.rating` alone. The
  Default Table's **Skill** tier *is* the book's "defaulting to the improved skill" — and it
  contributes **no** Improved Ability dice at all. Not half. None.
- `SR3EItem.js:410` — `const bonusDice = isDefault ? 0 : …`. That path is *attribute*-defaulting
  where 0 is defensible, but it hard-codes an answer instead of expressing the rule, so the two
  cases cannot be told apart.

Depends on [#60](#60): halve the capped number, not the raw level.

<a id="62"></a>
## 62. ✅ Improved Ability's category channel is not RAW — *SR3 p.169* — **DONE 2026-08-30**

`SR3EActor.js:1693` feeds `improvedSkillCategory` from adept powers into the opt-in category
bonus. For Improved Ability that is wrong, and the packs actively invite the mistake: the entries
are named `Imp Abl Combat Skl*->` and `Imp Abl Phys Skl*->`, which reads like a scope.

It is not. The **Improved Ability Costs Table** uses the category only to set *cost per die*
(Physical .25, Combat .5); the power applies to *"a specific Active Skill"*. The trailing `->` is
the upstream generator's marker for **"name the skill here"**.

Left alone, `Imp Abl Combat Skl` with category `Combat skills` buys dice across *every* combat
skill for half a Power Point.

⚠ **Do not remove the channel** — it is right for genuinely category-wide powers (Kinesics,
Nimble Fingers). The fix is to stop Improved Ability using it, and to make the naming say so.

<a id="63"></a>
## 63. ✅ Attribute Boost — unimplemented, and the obvious fix is a trap — **DONE 2026-08-29**

Four stages, none of which exist:

1. **Activate** — Magic Test, TN = ½ the **base (unaugmented)** rating, round **up**. No successes → no boost.
2. **Effect** — attribute + the power's level. Ceiling of **2× Racial Modified Limit**.
3. **Duration** — Combat Turns equal to the **successes**.
4. **Expiry** — a **Drain Resistance Test**. TN = ½ the **boosted** value (round up); Willpower
   dice; every 2 successes drops the Drain Level by one; damage is **Stun**.

   | Boosted rating is | Drain Level |
   |---|---|
   | ≤ Racial Modified Limit | L |
   | up to Racial Attribute Maximum | M |
   | up to 2× Racial Modified Limit | S |

> "Attribute Boost is not compatible with any artificial (cyberware) enhancements, nor
> spell-based increases. It is compatible with the Improved Physical Attribute power."

⚠ **Filling `bonusStr` under [#59](#59) would be worse than leaving it inert** — a permanent,
always-on, untested, undrained boost that stacks with the cyberware it is expressly incompatible
with.

⚠ **Reported from play 2026-08-29**: an actor's `Attribute Boost(STR)*` had `improvedSkillName`
hand-set, contributing **+4 dice to Unarmed Combat**. That is the wrong channel under any
reading — Attribute Boost grants no skill dice. The shipped pack entry has it empty; the edit was
local. Worth a migration that clears `improvedSkillName` on Attribute Boost items specifically.

**Shape:** this is the spellcasting pattern (test → duration → drain), not a checkbox. It needs a
triggered, expiring, levelled state — which is also what [#30](#30) needs for Adrenal Pump and
Pain Editor, so the two should share a mechanism.

<a id="64"></a>
## 64. ✅ Improved Reflexes stacks with wired reflexes — *SR3 p.169* — **DONE 2026-08-29**

> "The maximum level of Improved Reflexes is 3, and the increase **cannot be combined with
> technological or other magical increases** to Reaction or Initiative."

Both derivations sum the two sources unconditionally:

- `SR3EActor.js:1733-1734` — `… + adeptBonus.rea + cyberBonus.rea`
- `SR3EActor.js:1830` — `1 + … + cyberBonus.initDice + adeptBonus.initDice`

Latent only because no adept power carries data. **[#59](#59) makes it live**, so they ship
together or 59 introduces a regression.

The level ≤ 3 cap is also unenforced — a special case of [#65](#65), but stated in the power's
own text, so worth its own assertion.

⚠ "Cannot be combined" needs a decision the book does not make for us: refuse, or take the
better of the two? Project ethos says **warn, take one, stay editable** — never silently sum.

<a id="65"></a>
## 65. ✅ No power may exceed Magic in levels — *SR3 p.168* — **DONE 2026-08-30**

> "An adept cannot have more levels in a power than the adept's Magic Attribute."

The sheet already computes the **total** Power Point spend and flags it red past Magic
(`SR3EActorSheet.js:2283-2308`) — correct, and warn-only per the ethos. The **per-power level**
is never checked, so Magic 4 with Improved Ability 6 passes silently whenever the points fit.

Same treatment as the existing budget warning: a red note, not a block.

<a id="66"></a>
## 66. ✅ Combat Sense contributes nothing — *SR3 p.169* — **DONE 2026-08-30**

Two effects, both absent.

- **Combat Pool dice.** `SR3EActor.js:1787` derives `combatPoolBase + (sys.combatPoolMod ?? 0)` —
  no adept term. There is no `bonusCombatPool` field for the pack's `+1CPL`/`+2CPL`/`+3CPL` to
  map to, which is why `SR3EMods` reports `CPL` as unmapped rather than dropping it.
- **Usable Pool dice for the Reaction Test in surprise** (p.109) — ¼ / ½ / Full by level. No hook;
  surprise is not modelled.

The first half is a data-model change plus one term. The second belongs with surprise.

<a id="67"></a>
## 67. ✅ Killing Hands never changes a punch — *SR3 p.170* — **DONE 2026-08-30**

`SR3EItem._unarmedWeapon()` returns `(STR)M Stun` unconditionally. RAW:

- The adept **declares** its use with the Unarmed Combat attack — so it is a per-attack choice,
  not a passive, and *"you may do normal stun damage, or physical damage as purchased"*.
- Damage Level comes from the purchased tier: L / M / S / D (cost .5 / 1 / 2 / 4).
- It **bypasses Immunity to Normal Weapons** — *"Their defensive bonuses do not count against
  Killing Hands"*.
- It works in **astral combat** if the adept also has Astral Perception and is using it.

Natural home: the same declaration point as the called-shot dialog on the melee path.

<a id="68"></a>
## 68. ✅ Mystic Armor adds no armour — *SR3 p.170* — **DONE 2026-08-30**

Each level is **1 point of Impact armour, cumulative with worn Impact armour**, and *"Mystic
Armor also protects against damage done in astral combat"*. It grants **no Ballistic**.

Today the soak card reads `impact` off the equipped armour item alone, and astral combat has no
armour term at all. The pack's `+1IMP` is parsed and reported unmapped for exactly this reason.

⚠ Also read [#69](#69) — both want the actor to expose a derived "armour from powers", and doing
them separately will produce two.

<a id="69"></a>
## 69. ✅ Pain Resistance does not reduce injury modifiers — *SR3 p.170* — **DONE 2026-08-30**

> "Subtract your level of Pain Resistance from your current damage before determining your injury
> modifiers."

The book's own example: 3 levels means no modifier at all for Light or Moderate; at 4 boxes the
adept is at +1, not +3. *"Pain Resistance works equally on both the Physical and Stun Condition
Monitors."*

`sys.woundMod` is derived straight from the wound tracks with no offset. This is arithmetic the
system already performs — the narrow fix is one subtraction before the threshold lookup.

⚠ **Reduce the damage used for the LOOKUP, not the wound track.** Touching the track would
un-fill boxes the GM ticked and change how far the character is from unconscious.

The power's other half — level subtracted from TNs to resist torture, disease and interrogation —
is GM-adjudicated and correctly left alone.

<a id="70"></a>
## 70. ✅ The long tail: dice-granting powers with no test to attach to — **DONE 2026-08-30**

~19 powers whose entire rule is "+N dice to test X". None are wired. Full table with book
citations in `audit/adept-powers-audit.md`; the shape matters more than the list:

| Power | Book | Scope of the dice |
|---|---|---|
| Body Control | SR3 p.169 | Resistance Tests vs toxins/disease |
| Enhanced Perception | SR3 p.169 | Perception Tests — ⚠ capped at min(Intelligence, Magic) |
| Magic Resistance | SR3 p.170 | Spell Resistance Tests |
| Rapid Healing | SR3 p.170 | Body for Healing, and crippling-injury tests |
| Counterstrike | MITS p.149 | **counterattacks only** |
| Sixth Sense | MITS p.151 | Reaction Tests **for Surprise only** |
| Spell Shroud | MITS p.151 | Spell Resistance vs **detection spells only** |
| Iron Will · True Sight · Temperature Tolerance · Rooting | MITS p.150-151 | mind control · illusion · temperature · knockdown |
| Resilience | SOTA2 p.67 | stabilization, permanent damage, wound effects |
| Side Step | SOTA2 p.67 | +1 Combat Pool **for Dodge / Full Dodge only** |
| Penetrating Strike 1-3 | SOTA2 p.67 | −1 target Impact armour per level, **damage only** |
| Kinesics 1-3 | SOTA2 p.66 | −1 TN social, +1 die Charisma, +2 to detect-lying |
| Great Leap · Flexibility · Freefall · Sprint | MITS p.150, SOTA2 p.68 | jumping · Escape Artist · falling · running |

⚠ **The scope is the work, not the arithmetic.** `skillBonusDice` promises "always applies" and
cannot express "counterattacks only" or "Surprise only"; that promise is why
`skillCategoryBonuses` had to exist as a separate opt-in channel ([#10](#10)). A third channel —
or a per-power *situation tag* consumed by the dialog that already asks about category bonuses —
is the actual design question. Do not solve it by widening `skillBonusDice`.

**Not in scope here:** the ~40 powers that are correctly inert because they are narrative or
GM-adjudicated (the twelve Improved Senses, Traceless Walk, Suspended State, Multi-Tasking, the
nine TSS powers, …). Two borderline cases worth a second look if this ever lands: **Missile
Parry** (SR3 p.170) is a fully specified opposed test, and **Quick Strike** (MITS p.151) reorders
initiative.

---

## What landed on 2026-08-29 — 59, 60, 63, 64

Released as **0.4.5.6**. Migration `0.4.5.6` carries it to worlds already in play.

**59 — the pipeline.** `build-mods-bonuses.mjs` now reads `AdeptPowers.json`; `AdeptPowerData`
declares `mods` (a TypeDataModel drops undeclared keys, so patching the packs alone could never
have worked); `patch-pack-bonuses.mjs` covers the four adept packs. **9 powers gained real
data** — Improved Physical Attribute ×6 and Improved Reflexes ×3. `SRCG_BONUSES` grew 142 → 151
and each entry now carries a **`type` guard**, because one map keyed by name now spans three
item types.

⚠ **A defect found while doing it, not in the original audit:** the derived data never
multiplied a levelled power's bonus by its level. Upstream stores `+1STR` on Improved Physical
Attribute meaning *per level*, so the power would have granted +1 at level 3 the moment the data
landed. `_prepareCharacter` multiplies when `hasLevels`.

**60 — the cap.** `SR3EActor.improvedAbilityDice` = `min(level, base skill rating, Magic)`.
Resolved in a second pass after Magic is derived, since effective Magic depends on Essence and
Bio Index. A capped power still reports its full level, with the cap noted in the breakdown.

**63 — Attribute Boost.** All four stages: Magic Test at TN ½ the base rating → boost by the
power's level, ceiling 2× Racial Modified Limit → duration in Combat Turns equal to the
successes, counted down by the `updateCombat` round hook → Drain Resistance Test at TN ½ the
**boosted** value, Willpower, always Stun. State lives in `system.attributeBoost`, never in a
`bonus*` field, and `_prepareCharacter` has an explicit guard so a future edit cannot make it
passive. `SR3E.racialLimits` (p.245) was added for the Drain table and grades nothing else.

**64 — non-stacking.** `SR3EActor.reflexBonus` returns one package, never a sum, chosen on
Initiative dice then Reaction, ties to the adept. Resolved **once** and read by both the
Reaction derivation and `initiativeDice`. The sheet says what was dropped.

**Also fixed, reported in play while this was being built:** the item sheet rendered *"Improves
Skill"* on all 117 powers, which is how an `Attribute Boost(STR)` came to grant +4 bogus dice to
Unarmed Combat. Fields are now offered by `SR3E.adeptPowerKind`, and the migration **clears**
the field on Attribute Boost items — the first corrective migration in the file, via a new
`fixItem` hook that is deliberately harder to reach for than the fill-blanks path.

**Coverage:** `tests/adept-powers.test.mjs`, 117 assertions — including every cell of the
Racial Attribute Limit Table, which was reconstructed from a PDF whose row labels extract one
line out of alignment. 7 new mutants, all killed; 34/34 overall.

⚠ **Still open on Improved Ability:** [#61](#61) (the defaulting half) and [#62](#62) (the
category channel). Neither was touched.

---

<a id="71"></a>
## 71. ✅ Players cannot add a vehicle to their character sheet — **DONE 2026-09-01**

**Reported from play 2026-08-30.** The Vehicles tab offers **+ Create & Assign**
(`SR3EActorSheet.js:2466`), the dialog opens, the player picks a drone, presses Create — and
nothing happens except a Foundry permission error.

### Why

`SR3EActorSheet._onCreateLinkVehicle` (`:3667`) creates a **world Actor** on the clicking
client:

```js
newActor = await Actor.implementation.create(data);
…
await newActor.update({ 'system.driverActorId': this.actor.id });
```

Creating a world Actor requires the **`ACTOR_CREATE`** permission, which the base Player role
does **not** have in Foundry. So the whole flow is GM-only in practice, while the button is
rendered unconditionally — there is no `game.user.isGM` gate anywhere on that path.

The `update()` on the next line has the same problem from the other direction: even where
creation succeeds, the player does not own the new actor.

⚠ **This is the one place in the system that writes without going through the GM.** Every other
authoritative write relays through `SR3EQuery.asGM` precisely because a player's client may not
have permission — pools, damage, card state, Essence. This path predates that layer and was
never brought across.

### It is not just "create" — there is no way to link an EXISTING vehicle either

The dialog offers *"Create blank"* or *"copy from a compendium"*. It cannot attach a vehicle
that already exists, so a GM who has built the team's Bulldog cannot hand it to the rigger from
the character sheet at all.

**The workaround, and why it is not obvious:** the link lives on the VEHICLE. The vehicle
sheet has a driver dropdown (`SR3EVehicleSheet.js:162`, `name="system.driverActorId"`), so a GM
opens the vehicle and picks the character there. Nothing on the character sheet says so, which
is why this reads as broken rather than as inverted.

### Fix

Three parts, and the first two are the actual bug:

1. **Relay the creation through the GM** — a `sr3e.vehicle.create` verb alongside the existing
   ones in `SR3EQuery`, taking `{ driverActorId, source }` and returning the new actor's id.
   The GM is already the authority for every other write; this is the same shape.
2. **Grant the player ownership** of the created vehicle, or it appears on their sheet and
   refuses to roll. `ownership: { [game.user.id]: OWNER }` at create time.
3. **Offer "link an existing vehicle"** beside the two create options — a dropdown of vehicles
   the user can see. That alone would have made the reported case work, since the GM had
   already made the vehicle.

⚠ **Do not "fix" this by hiding the button from players.** The Vehicles tab is a rigger's main
surface, and a player who cannot attach their own drone has to ask the GM for every change. The
ethos is that players drive their own sheet; the GM is the write authority, not the operator.

⚠ Check the **Matrix tab's rigger EW block** and the Token-HUD vehicle tools for the same
assumption while in there — they read `driverActorId` (`:1489`, `:2416`, `:3447`, `:3493`) but
do not create, so they are probably fine.

---

### What landed — 0.4.5.10

All three parts, plus **two more sites of the same bug that nobody had reported**.

1. **`sr3e.actor.create`** — a GM-relayed intent verb taking one of three sources: a compendium
   entry, a blank vehicle, or **an existing actor to copy**. It grants the requester `OWNER`.
2. **`sr3e.vehicle.link`** — attaches an existing vehicle to a driver and grants ownership.
3. **The dialog offers existing world vehicles**, filtered against the `isTemplate` flag and
   against vehicles this character already drives. Relabelled "+ Add Vehicle", since "Create &
   Assign" no longer describes it.

⚠ **The verb is `actor.create`, not `vehicle.create`, and that matters.** `tests/gm-writes.test.mjs`
— written to pin the reported fix — immediately failed on **two "deploy template" buttons**,
one on the character sheet and one on the vehicle sheet, both calling `Actor.create` directly.
Neither had been reported, because a template is usually GM-owned so a player rarely reaches
one. A vehicle-shaped verb would have left both behind.

⚠ **One verb rather than three, because the ownership grant is the half that gets forgotten** —
and its failure mode is the reported bug's twin: the actor is created, appears on the player's
sheet, and refuses to roll.

⚠ **`_stats` is deleted when copying an actor.** It carries `compendiumSource`, which is what
`preCreateActor` reads to set `isTemplate` — copy it and every deployed template is a template
again. The flag is also cleared *after* creation, because that hook runs on the GM's client and
wins the race against the payload.

⚠ **The dialog's inline `onchange="document.getElementById(…)"` is gone**, replaced by
`DialogV2.wait`'s `render` option. Inline handlers reaching for `document` do not work in the
ApplicationV2 rendering context (CLAUDE.md), so it was a live failure, not style.

⚠ **`tests/gm-writes.test.mjs` is a SOURCE-level invariant**, like `explosion-carry` and
`pool-spend`. Reproducing this behaviourally needs a live world, two connected clients and a
non-GM user; the defect is a shape in the source, so the source is what is checked.

---

<a id="72"></a>
## 72. ✅ Reaction has no roll button — **DONE 2026-08-31**

**Reported from play 2026-08-30.** Every other attribute carries a d6 icon; Reaction does not,
so a player asked for a Reaction Test has nothing to click.

### It is a UI gap, not a missing feature

`SR3EActorSheet._onRollAttr` **already has a `reaction` branch** — it reads
`attributes.reaction.value` and falls back to `floor((QUI + INT) / 2)` when the derived value is
missing. Somebody wrote it deliberately. What is missing is the affordance:

- The attribute grid iterates `coreAttrs` (`SR3EActorSheet.js:642`), which is exactly the six
  bought attributes: Body, Quickness, Strength, Charisma, Intelligence, Willpower.
- Reaction is rendered **separately** below it (`:686-700`) as a derived block, because it has a
  different shape — a derived base, a manual bonus input, and adept/cyber contributions.
- That separate block never got the `<i class="fas fa-dice-d6 rollable" data-action="rollAttr">`
  the six grid entries get.

**Fix:** add the icon to the Reaction block with `data-attr="reaction"`. The action is already
registered (`:27`) and the handler already branches on it, so this is one element.

⚠ **Reaction Tests are real and reachable.** Surprise (p.108) and Missile Parry (p.170) are both
Reaction Tests, and the Chase and Driving flows lean on Reaction throughout. This is not a
theoretical attribute.

⚠ While in there: check whether **Essence and Magic** have the same gap. They are also rendered
outside `coreAttrs`, and Magic at least is rolled — Attribute Boost's activation is a Magic Test.

### What landed

The icon, with `data-attr="reaction"`. One element, as expected.

**Magic got one too.** Magic Tests are real — Attribute Boost's activation is one (p.168) — and
`_onRollAttr`'s generic branch already reads `magic.value`. Shown only to the Awakened, since a
Magic of 0 rolls nothing.

⚠ **Essence deliberately did NOT.** It is a resource that is spent and derived, never rolled; an
icon there would be an affordance for a test that does not exist.

⚠ **A pre-existing markup bug turned up next door.** Every attribute icon in the `coreAttrs` grid
rendered as `title="Shift-Click to use Phys. Dice" Body"></i>` — the display name interpolated
outside any attribute, leaving a stray attribute and an orphan quote on all six. Fixed to a real
`title`; it now reads "Roll Body — Shift-Click for physical dice".

⚠ **And a trap worth recording:** the explanatory HTML comment first written beside the new icon
used backticks around identifiers. It sits INSIDE a template literal, where a backtick ends the
string — it broke the parse immediately. No backticks in markup comments.

<a id="73"></a>
## 73. No way to roll dice for something the system does not model — **CONFIRMED**

**Reported from play 2026-08-30**, alongside [#72](#72). A player cannot simply roll a pool
against a target number.

### What exists, and why none of it covers this

- **Foundry's `/r 5d6`** works for everyone, and produces a **sum**. SR3 is a success-counting
  system with the Rule of Six, so the number it prints is meaningless here — the one thing a
  player must not do is read it as a result.
- **Every roll path in the system is anchored to a thing**: an attribute icon, a skill row, a
  weapon, a spell. `rollPool(pool, tn, label, options)` is perfectly general, but nothing
  reaches it without a document to hang off.
- **The GM tools on the Rollable Tables tab** are the closest thing, and are either
  situation-specific (Chase, Driving Test) or GM-only (Chunky Salsa, Barrier, Falling).

So a GM who says *"roll 6 dice against a 4"* — for a houserule, a knowledge question, an
improvised stunt, anything off-sheet — leaves the player with no correct way to do it.

### Fix

A **generic Success Test** dialog: pool, TN, an optional label, and the usual pool-dice offer,
straight into `rollPool`. It should be available to players on their own sheet, since that is
who needs it.

⚠ **It must go through `rollPool`, not `Roll.create`.** The whole point is that the result is a
success count with the Rule of Six, exploding interactively like every other roll in the system.
A second, simpler roll path that prints a different-looking card would be worse than nothing —
players would not know which of the two to trust.

⚠ **Reuse `_promptRollOptions`** (`SR3EActorSheet.js:3791`) rather than writing a third dialog:
it already handles the pool offer, the TN, physical dice and the wound modifier. This wants an
entry point, not new machinery.

⚠ Consider an **Open Test** mode while designing the dialog — no TN, report the highest die.
SR3 uses them (the Chase Scene already is one), and they have the same "no document to hang
off" problem.

---

<a id="74"></a>
## 74. A crash can only be reached from a Chase Scene — **CONFIRMED**

**Reported from play 2026-08-30:** *"they were in a car accident and I need to handle the
player damage to everyone in the car plus the damage to the car itself."*

### The flow already exists, in full

`SR3EActor._buildCrashDamageHtml` (`SR3EActor.js:3557`) does exactly what was asked:

- Computes the crash damage from speed — Power `ceil(km-per-turn / 10)`, Level L/M/S/D at the
  21 / 61 / 201 thresholds
- Posts a **vehicle** soak button against the vehicle's Body
- Posts a **per-passenger resist button** for the driver *and every passenger*
  (`sr-ram-passenger-resist-btn` → `handleRamPassengerResist`), each carrying that actor's own
  Body and the crash TN

Nothing about it is missing or wrong. It is simply **unreachable**.

### The one door into it

`isCrashRoll: true` is set in exactly one place in the codebase —
`SR3EVehicleChase.js:1529`, the Chase Scene's Crash Test action. To get a crash resolved you
must therefore:

1. have a **Chase Scene** open,
2. have the vehicle **registered as a participant** in it,
3. have every passenger **added to that participant**, because the roster lives on the chase
   (`p.passengerActorIds`), and
4. trigger the crash through the chase's own action dialog.

A car accident that is not a chase — a rigger fumbling a Driving Test, a bomb, a patch of ice,
someone driving into a wall — has no route to any of it. `runDrivingTest` even tells the GM
*"0 successes → GM Crash Test"* and then offers nothing to click.

### The deeper half: nobody knows who is in the car

⚠ **`VehicleData` has `driverActorId` and `seating`, but no passenger roster.** The only list of
who is aboard is `passengerActorIds` on a **chase participant** — a transient object that exists
while a Chase Scene is open and is gone afterwards.

So even a standalone crash dialog would have to ask "who is in the car?" every time, and the
answer would not persist. Ramming has the same problem for the same reason.

### Fix

1. **A passenger roster on the vehicle** — `system.passengerActorIds`, edited on the vehicle
   sheet next to the existing driver dropdown, capped for display by `seating`. A data-model
   change, so a full Foundry restart.
2. **A Crash Test that stands alone** — on the vehicle sheet beside Driving Test, and on the
   Vehicle Tools Token-HUD menu. It should take speed (defaulting to the vehicle's current),
   let the GM adjust Power and Level, and call the SAME `_buildCrashDamageHtml`.
3. **Point `runDrivingTest` at it**, so *"0 successes → GM Crash Test"* becomes a button rather
   than an instruction.
4. **Have the Chase Scene read the vehicle's roster** as its default when a participant is
   added, so the two lists stop being independent.

⚠ **Do not write a second damage builder.** `_buildCrashDamageHtml` is the rule; a standalone
crash needs an entry point and a passenger list, not new arithmetic. Two implementations of the
speed-to-damage table would drift, and the one behind the Chase Scene is the one nobody would
notice going wrong.

⚠ **Check the speed unit at the new call site.** `speedKmct` is metres-per-Combat-Turn stored as
`km/h ÷ 1.2` (see the Chase section in CLAUDE.md), and the damage table reads it directly. A
dialog that collects plain km/h and passes it through would overstate every crash by ~20%.

---

<a id="75"></a>
## 75. Dermal armour negates flechette's damage-level increase — *SR3 p.116*

**Found during the table sweep, 2026-08-30**, while fixing the flechette armour rule
([tables.test.mjs](../tests/tables.test.mjs)). Recorded then in `flechetteArmor`'s doc comment
but never given a number.

> "Against unarmored targets, flechette rounds increase their Damage Codes by one level…
> **Dermal armor negates the Damage Level increase of flechette ammunition.**"

`_postSoakCard` stages the level up whenever `max(ballistic, impact) <= 0`. A character whose
only protection is **dermal armour or a dermal sheath** is unarmoured by that test — worn armour
is 0 — so they take the increase the book explicitly spares them.

### Why it is not a one-line fix

⚠ **Dermal armour is not tracked apart from other Impact sources.** It ships as cyberware and
bioware whose `Mods` carry `IMP`, which `SR3EMods` reports as **unmapped** — there is no
`bonusImpact` field for it to land in, so the system does not know a character has any. The same
gap blocks Mystic Armor's Impact from stacking with worn armour, which is why that one is applied
at the soak card from `derived.mysticArmor` rather than from an armour field.

So this needs the armour channel that `IMP`/`BAL` have been waiting for since [#8](#8):

1. `bonusImpact` / `bonusBallistic` on `CyberwareData` and `BiowareData` — a data-model change,
   so a full Foundry restart.
2. Teach `SR3EMods` to map `IMP` and `BAL` instead of reporting them unmapped, and regenerate
   `srcg-bonuses.js`. **23 entries** report `IMP` or `BAL` as unmapped, so this is not one
   item. (The generator's overall "unmapped" figure is larger — it also counts TAS/HAC/CPL and
   the rigger codes, which are a different gap.)
3. Track dermal sources separately from worn armour, because only they negate the increase —
   a summed "total impact" cannot answer the question.
4. `_postSoakCard`: skip the level increase when dermal armour is present.

⚠ Step 3 is the real design. Everything else is plumbing.

⚠ Getting steps 1-2 wrong would make **every** armour-granting implant apply twice, since
Mystic Armor and Penetrating Strike already adjust Impact at the soak card. Check
`SR3EActor._postSoakCard` before adding a second source.

<a id="76"></a>
## 76. The Wound Table has no flow to attach to — *SR3 p.126*

Verified during the table sweep and left untested for the honest reason that **nothing reads
it**. Recorded so it is not re-discovered.

> "Have each physically damaged character make a Body Test against a target number set by his
> or her overall wound level as noted on the **Wound Table**."

| Wound Level | Target Number |
|---|---|
| Light | 2 |
| Moderate | 4 |
| Serious | 6 |

⚠ **"Use only the character's natural Body Rating; cyberware offers no benefits for this test."**
So it reads `body.base`, not `body.value` — the one place in the system where that distinction is
stated outright rather than inferred. Rapid Healing's dice ([#70](#70)) ride the `healing`
situation and DO apply, since the power is magic rather than cyberware.

⚠ **Physical only.** *"Stun damage can only be recovered by taking the night off and sleeping
in."* A healing flow that offers to heal Stun is offering something the rules do not have.

⚠ **A test taken in combat costs the character their entire next Combat Turn** — *"If they do it
during Combat they lose their entire next Combat Turn"* — which is the only reason the timing
matters mechanically rather than narratively.

### What it would take

A Healing Test flow: pick the track, read the level, roll `body.base` + any `healing` situational
dice against the Wound Table TN, and divide the successes into the base time from the Healing
Table. The modifiers on p.127 (Awakened patient +2, bad conditions +1, terrible +3, the Body
Attribute band −0/−1/−2/−3, no medkit +4) belong with it, and none of them are implemented
either.

⚠ **Do not add the table to `SR3E` before there is a consumer.** An unused table is a claim
nobody checks — which is exactly what this sweep found everywhere else.

---

<a id="77"></a>
## 77. ✅ Missile Parry — *SR3 p.170* — **DONE 2026-08-31**

The last genuinely unclaimed adept power. [#70](#70) filed it under "correctly inert" and then
flagged it for a second look, which was the right instinct: it is a **fully specified opposed
test**, not narrative colour, and it was the only one of the 117 in that category.

> "You can catch slow-moving missile weapons such as arrows, thrown knives, or shuriken out of
> the air. Make a Reaction Test (plus any Combat Pool dice you choose to allocate to the test)
> against a Target Number of 10, minus the base target number for the range of incoming attack…
> To successfully grab the missile weapon out of the air, you must generate more successes with
> your Reaction Test than the attacker achieved on the Attack Test. Ties go to the attacker.
> Using Missile Parry is a Free Action."

Offered as a third option in the defence declaration the defender already sees at step 4 of the
ranged sequence — beside "no dodge" and "dodge with N dice", and only when they hold the power
and the incoming weapon is catchable.

### The four things that are easy to get wrong

⚠ **The book's own worked example contradicts the table it cites, and the table wins.** The
example reads *"against an arrow coming from long range, the target number is 2 (10 − 8, the
base Target Number for long range)"*. Long range on the **Weapon Range Table** (p.111) is **6**,
not 8 — **8 is the Grenade Range Table's** long column (p.119), and a grenade is not something
you catch. The same sentence's short-range half (10 − 4 = 6) agrees with both tables, so only
the long figure is astray, and **Bow, Thrown Knife and Shuriken — the exact weapons this power
names — are rows in the Weapon Range Table**. The rule sentence governs; the example is an
erratum. Implemented as `10 − the attack's own base range TN` (TN 4 at long range), shown with
its derivation and **editable**, so a table that prefers the printed 2 can use it.

⚠ **It rolls REACTION, with pool as an optional extra** — the opposite way round from a dodge,
which is pool dice only. So **zero pool is a valid parry**, not a declination, and the handler
has a separate branch rather than sharing the dodge path's `dice > 0` gate.

⚠ **A failed parry carries NOTHING into the soak.** This is the one place it differs from
`dodgeOutcome`, and the difference is not an oversight. p.113's carry rule — *"the successes
still count and are added to the Damage Resistance Successes"* — is specific to the **Dodge
Test**; this is a **Reaction Test**, and its text says only what counts as catching the missile.
Reusing `dodgeOutcome` would invent a partial credit the power was never given, which matters
because both draw on the same Combat Pool. Asserted side by side on the same numbers.

⚠ **"Slow-moving" is the whole scope, and it excludes firearms.** `canMissileParry` allows the
`projectile` and `thrown` item types only. Offering it on bullets turns a 1-point power into a
general anti-ranged defence. Grenades are `thrown` but never reach the declaration — the AoE
path resolves by scatter and posts soak cards directly — which is structural rather than
checked, and worth knowing if that flow is ever reworked.

⚠ **Ties go to the attacker**, stated outright, same trap as `dodgeOutcome` and `meleeOutcome`.

**Not modelled:** it is a **Free Action**, which the system cannot spend or account for
([#48](#48)). The result card says so instead. And the range band had to be threaded from the
attacker's roll-options dialog through to the defender — a new `rangeBandIdx` on the roll state,
which means it is also in the **explosion carry** (`tests/explosion-carry.test.mjs` caught it
being missing on the first attempt, as designed).

Covered by `tests/adept-powers.test.mjs` (26 assertions) and 3 mutants.

<a id="78"></a>
## 78. Quick Strike acts first in a pass — *MITS p.151*

The other borderline power from [#70](#70)'s "correctly inert" list, and the one that genuinely
is not inert-by-nature: it has a hard mechanical effect on turn order. **Cost 3, no levels.**

> "This power allows the adept to **act first in one Initiative Pass per Combat Turn**. This
> action uses up the adept's action for that Initiative Pass. This power **cannot be used
> during an Initiative Pass when the adept does not have an action**. The adept's **Initiative
> Score is not affected**. The adept must be **unwounded** to use this ability."

### Why it is not [#77](#77)-shaped

⚠ **"The adept's Initiative Score is not affected."** So it cannot be modelled as an initiative
bonus, which is the obvious cheap implementation and would be wrong in two visible ways: the
tracker would show a number the character does not have, and the effect would persist across
**every** pass instead of the one the player picks. It is a **turn-order override**, scoped to a
single pass, chosen by the player at the moment they use it.

⚠ **"Uses up the adept's action for that Initiative Pass"** and **"cannot be used during an
Initiative Pass when the adept does not have an action"** are both action-economy statements,
and the system does not model actions ([#48](#48)). `SR3ECombat` does know about passes — both
`_nextTurnSR3` and `_nextTurnSR2` walk them — so *which* pass is answerable; whether the adept
still has an action in it is not.

⚠ **"Must be unwounded" is ambiguous in a way that matters.** It plainly is not "no wound
modifier", or a single box of Stun would qualify and the restriction would be nearly free. Read
literally it means **no damage at all on either track**, which is much harsher and is probably
intended — this is a 3-point power. Whichever is chosen it should be **stated on the card**, not
silently enforced, and the check reads the tracks directly rather than `woundMod`.

⚠ **Once per Combat Turn** needs state that survives passes but not the turn — the same
lifetime as `roundsFiredThisPhase` and the Full Defense flag, both cleared by
`SR3ECombat._endOfTurnReset()`. That is the hook to use; do not invent a second reset path.

### What it would take

1. A capability flag off the name, exactly like [#77](#77)'s (`_directPowerKind` → `quickStrike`).
2. A per-Combat-Turn `quickStrikeUsed` flag, cleared in `_endOfTurnReset()`.
3. A button on the combat tracker's active-pass card, GM- or owner-gated, that moves the adept
   to the front of the current pass **without touching `combatant.initiative`** — which is the
   whole design problem, since Foundry orders by that field. Likely a sort override or a
   temporary flag consumed by `_nextTurnSR3` / `_nextTurnSR2`, not an initiative write.
4. Refuse (or warn) when wounded, and say which reading of "unwounded" is being applied.

⚠ **Step 3 is the work; steps 1-2 are twenty minutes.** Do not start this before [#48](#48)
unless the intent is to ship the ordering half and leave the action cost to the GM — which is
defensible under the ethos, but should be a decision rather than a discovery.

<a id="79"></a>
## 79. No ledger for karma or nuyen — *low priority*

**Raised 2026-08-31.** There is no record of what a character has earned or spent, only current
totals — `system.karmaPool` and the nuyen field are numbers a player edits in place. So a GM
cannot answer "where did that 40 karma go?", and a player who mistypes has nothing to restore
from.

⚠ **This is not the same item as karma SPENDING**, which — contrary to what this entry and
CLAUDE.md both said when first written — **is implemented**. `_onSpendKarmaCalculator`
(`SR3EActorSheet.js`) buys attributes, skills and specialisations at the p.245 costs; its
defects were [#80](#80). This entry is the **audit trail**, a separate want: the calculator
writes new totals and leaves no record of what was bought.

⚠ **AWARDING is a different story, and this entry used to overstate it too.** `_onAwardKarma`
is correct but **unreachable** — nothing renders its button — so the only reachable award path
is the Session Rewards tool, which writes to the wrong field entirely. See [#81](#81); a ledger
should be built on top of a working award path, not before one.

Shape, roughly: an append-only array of `{ when, kind: 'karma'|'nuyen', delta, reason, by }` on
the actor, a compact table on the sheet, and a **+/− with a reason field** replacing bare
in-place editing of the totals. The Session Rewards tool (Rollable Tables sidebar) is the
obvious first writer — **once [#81](#81) has made it write to the right fields**.

⚠ **Keep the totals editable.** The ethos is that a GM is never fighting the system; a ledger
that becomes the only way to change a number is a guardrail, not a record. Log an unexplained
adjustment as an entry with an empty reason rather than blocking it.

⚠ Append-only and GM-relayed, like `sr3e.card.mark` — a player must be able to see their own
history without being able to rewrite it.

<a id="80"></a>
## 80. ✅ Karma advancement — seven defects — **DONE 2026-08-31**

**Reported from play 2026-08-31:** *"karma spending seems to be implemented, there isn't
anything for a new skill but you can increase them."* Correct on both halves — and the reason
this entry exists rather than a one-line fix is that auditing the button against p.244–245
turned up **six more**, none of them reportable from play because every one of them is invisible
without the book open.

⚠ **This corrects TODO.md and CLAUDE.md, which both said karma spending was unimplemented.** It
is implemented; `_onAwardKarma` and `_onSpendKarmaCalculator` in `SR3EActorSheet.js` have been
there all along. Do not re-file this as "build advancement".

---

### Spend Karma button

**1 — No way to learn a new skill** · *p.245* — *the reported half*

> "**LEARNING NEW SKILLS.** New skills can be purchased at a skill rating of 1, by paying a cost
> of **1 in Good Karma**. New skills only cost 1, whether they are Active, Knowledge, or
> Language Skills. To raise the skill beyond Rating 1, follow the skill improvement rules above."

⚠ **This defect is ENTANGLED with defect 2, and the order of fixing matters.** The loop opens
with `if (rating === 0) continue;`, so deleting that line looks like the whole job — and against
the code as shipped it was wrong, because `_skillCost(1, attr, true)` returned `ceil(1 × 1.5)`
= **2**. Once the rounding is corrected it returns `floor(1.5)` = **1**, which matches the flat
rate for any attribute of 1 or more. So fixing this alone would have overcharged every new
active skill; fixing both makes the two agree.

⚠ **They agree by coincidence, which is not a reason to drop the flat rate.** The rule reads
neither the attribute nor the skill type, and the cost table does; they diverge at an attribute
of 0 (the table's third row charges 2). `karmaNewSkillCost()` therefore takes no arguments —
any signature accepting a rating or a type would invite someone to use them.

⚠ **And the item has to exist first.** A rating-0 skill only reaches the calculator if somebody
already created it. Learning a *genuinely* new skill means creating one — so this also wants a
picker over `SR3ESkills`, not just an extra row.

**2 — Costs round the wrong way** · *p.245* — **overcharges roughly half of all purchases**

> "Multiply the number given on the table by the new rating (**round fractions down**) to
> determine the cost in Good Karma."

`_skillCost` and `_specCost` both end in `Math.ceil`. It should be `Math.floor`.

| Purchase | Book | Code |
|---|---:|---:|
| Active skill → 3, at or below the attribute (3 × 1.5) | **4** | 5 |
| Active skill → 5, at or below the attribute (5 × 1.5) | **7** | 8 |
| Active skill → 3, above 2× the attribute (3 × 2.5) | **7** | 8 |
| Specialisation → 5, at or below the attribute (5 × .5) | **2** | 3 |
| Specialisation → 7, above 2× the attribute (7 × 1.5) | **10** | 11 |

⚠ **The book's own three worked examples cannot catch this**, which is why it survived: Brick's
Sneaking at 6 (6 × .5 = 3), his raise to 7 (7 × 1 = 7) and Iris's Beretta 101T at 6 (6 × 1 = 6)
all land on integers, where `ceil` and `floor` agree. A test written from the examples alone
passes against the wrong function — so write the fractional cases explicitly.

**3 — The specialisation cap reads the wrong rating** · *p.245*

> "There may be more than one specialization to a base skill, up to a maximum number of
> specializations equal to the base skill's **Linked Attribute Rating**."

The code gates on `specs.length < rating` — the **skill** rating. It should be the linked
attribute's. The two diverge both ways: Stealth 2 / Quickness 6 is allowed 2 where the book
allows 6, and Stealth 6 / Quickness 3 is allowed 6 where the book allows 3.

⚠ Brick, the book's example, has Stealth 5 and Quickness 6 — one apart, so the example reads
correctly under either rule. Same shape as defect 2.

**4 — Specialisations are hard-capped at level 2, and the book has no cap** · *p.245*

> "To improve the specialization beyond that, follow the rules above as normal."

The improve row is offered only when `(sp.level ?? 1) < 2`, and the handler hard-writes
`level: 2`. Since `level` is the **bonus** over the base skill, that stops every specialisation
at base + 2 permanently. Nothing in the rules stops it; the sentence above says the opposite.

**5 — Attributes above the Racial Modified Limit cost 3×, not 2×** · *p.244*

> "To improve an Attribute above the Racial Modified Limit has a cost equal to **3x the rating
> to which the Attribute is being raised**… A character's Attribute Maximum is equal to their
> Racial Modified Limit times 1.5."

The calculator always charges `2 × new rating`. Above the racial limit that is a third off.

⚠ **The data already exists** — `SR3E.racialLimits` (p.245) was added for Attribute Boost's
Drain table ([#63](#63)) and grades nothing else today. This is the second consumer it was
always going to need.

⚠ **Cost, not cap.** Under the ethos the calculator should still *offer* the purchase past the
Racial Modified Limit and past the Attribute Maximum — charge the right price and say which side
of the line the character is on. Refusing the buy is a guardrail; charging 2× for a 3× purchase
is a rules bug.

---

### `_onAwardKarma` — found while verifying the above

⚠ **Both of these were fixed in the function, which turned out not to be enough:** the button
that would call it is never rendered. Discovered 2026-09-01 and tracked as [#81](#81) — so on
0.4.5.7 the corrections below are real but no one can reach them.

**6 — The twentieth point is awarded twice** · *p.244*

> "Shetani, an elf character, has a **Total Karma of 62**, **Good Karma of 10**, and **Karma
> Pool of 4**… Every twentieth point has been added to the Karma Pool (each character starts
> with 1 Karma Pool) and **the rest (59)** has gone to Good Karma."

62 total → 3 points to the Pool (the 20th, 40th and 60th) → **59** to Good Karma. The pool point
comes **instead of** the Good Karma point, not in addition to it.

`_onAwardKarma` computes `poolGained` correctly but then writes `'system.karma': karma + amount`
— the **full** award. So a character receives both, gaining one extra Good Karma per 20 earned.
Shetani would come out with 62 Good Karma where the book gives 59.

**7 — Every character starts with 1 Karma Pool, and the field initialises to 0** · *p.244*

> "(each character starts with 1 Karma Pool)"

`ActorDataModels.js:120` has `karmaPool: new NumberField({ integer: true, initial: 0, min: 0 })`.
Shetani's 4 is `1 + floor(62 / 20)`; with an initial of 0 he reaches 3.

⚠ **This one is a data-model change** — a full Foundry restart, and existing actors keep their
stored 0, so it needs a migration to be worth anything. Fill-blanks will not do it: 0 is the
schema default and indistinguishable from a GM who set it deliberately. This is the rare case
that wants either a `fixItem`-style corrective migration (see `0.4.5.6`) or simply leaving
existing characters alone and documenting it.

---

### What is correct, and should not be "fixed" while in there

Verified line by line against the Skill Improvement Cost Table:

- The three base-skill multipliers (1.5 / 2 / 2.5 active, 1 / 1.5 / 2 knowledge) — exact.
- The three specialisation multipliers (.5 / 1 / 1.5) — exact, and correctly **identical for
  active and knowledge skills**, which reads like an oversight in `_specCost` and is not one.
- A new specialisation costs the base skill's rating **+1**, an existing one **+2** — matching
  *"buy the specialization at rating 1 point higher than your base skill"* and Brick's 6-then-7.
- Attribute increases at 2× the new rating, **below** the racial limit.
- `poolGained` as a delta across the whole award, so one large award grants every point it
  crosses rather than only one.
- `_isActiveSkill` delegating to `skillTypeForCategory` — load-bearing, see its comment.

---

### What landed

All seven fixed, released as **0.4.5.7**. The costing rules moved to `SR3EActor` as pure statics
(`karmaSkillCost`, `karmaSpecCost`, `karmaNewSkillCost`, `karmaAttributeCost`,
`karmaAttributeMaximum`, `karmaMaxSpecialisations`, `karmaSpecTargetRating`, `karmaAward`,
`karmaPoolForTotal`) so they could be tested and mutated at all — the sheet cannot be imported
without Foundry. `SR3EActorSheet._skillCost` / `_specCost` remain as delegating names.

**Coverage:** `tests/karma.test.mjs`, 70 assertions, and **7 mutants — one per defect**, each
reproducing the state the system actually shipped in. 55/55 killed.

⚠ **`fixActor` is a new migration hook**, the third, and only the second thing in that file that
can overwrite. Migration `0.4.5.7` cannot fill a blank, because 0 is both "never touched" and a
value a GM may have chosen — so it matches a Pool equal to **exactly** what the old formula
produced (`⌊total / 20⌋`) and leaves everything else alone. `tests/migrations.test.mjs` asserts
both directions of hand-adjustment are declined, plus idempotency.

⚠ **Defect 1 turned out to be entangled with defect 2** in a way the audit did not see: against
the shipped `Math.ceil`, deleting the rating-0 guard would have charged 2 for a new active
skill; with the rounding corrected the table returns 1 and agrees with the flat rate. Fixing
either alone is wrong in one direction or the other. They agree only by coincidence — at an
attribute of 0 the table charges 2 — so `karmaNewSkillCost()` stays argument-free.

⚠ **Not a rules defect and deliberately NOT fixed:** the spend path reads `karma` before the
dialog opens and writes back `karma - chosenCost`, an **absolute**, so a GM award landing while
the dialog is open is clobbered. Everything else authoritative relays a **delta** through the GM
for exactly this reason (`sr3e.damage.apply` says so at its definition). Left alone because it
is a concurrency change touching the same write path as [#79](#79)'s ledger, and the two should
land together rather than the second rewriting the first.

<a id="81"></a>
## 81. ✅ No reachable way to award Good Karma — **DONE 2026-09-01**

**Found 2026-09-01**, answering "is there a way as the GM to award karma to all the current
players?". The answer is that there are two award paths and **neither one works**: one cannot be
clicked, and the other writes to the wrong field. So on 0.4.5.7 nothing in the system adds Good
Karma to a character, and every point a GM has awarded has landed in the Karma Pool.

⚠ **This is what [#80](#80) could not see.** That audit read `_onAwardKarma` and checked its
arithmetic against p.244, which is genuinely wrong in two ways and is now fixed. It never asked
whether anything *calls* it, and it never looked at the multi-character tool a GM actually uses
at the end of a session. Auditing a function is not auditing a feature.

### 1 — `_onAwardKarma` is registered but never rendered

`SR3EActorSheet.js:92` registers `awardKarma: SR3EActorSheet._onAwardKarma` in `DEFAULT_OPTIONS.actions`, and the handler is complete and (since 0.4.5.7) correct. **No element anywhere carries
`data-action="awardKarma"`.** The only two references in the entire codebase are that
registration line and the dialog's own window title.

The Bio tab's Resources block renders the Karma field and a **Spend Karma…** button beside it;
the Award button was simply never added next to them.

### 2 — Session Rewards awards karma into the Karma Pool

`_openSessionRewardDialog` (`sr3e.js`) is the tool this question was really about: Rollable
Tables sidebar → **🎖 Session Rewards**, GM-only, a checkbox list of every live PC, a karma
amount, a nuyen amount and a gear/notes line. It is the right shape and the only reachable way
to award anything. Its karma write is:

```js
if (karma) updates['system.karmaPool'] = (actor.system.karmaPool ?? 0) + karma;
```

`system.karmaPool` is the **luck dice pool** (p.246), not `system.karma` (spendable Good Karma)
and not `system.totalKarma` (the career total that drives the Pool). So a 5-karma session award:

- hands every player **5 extra Karma Pool dice** — a resource SR3 grows by *one* point per
  twenty career karma, and which rerolls failures and buys off the Rule of One;
- leaves **nothing** spendable, so Spend Karma… still shows 0 available;
- never moves `totalKarma`, so the Pool never grows the way it should either.

⚠ **The nuyen half is correct** and needs no change.

⚠ **The dialog's own preview line shows the confusion**: ``(${a.system.karmaPool ?? 0} karma |
¥…)`` labels the Pool as "karma". That is almost certainly where the mix-up started, and it is
why the bug is invisible from the dialog itself.

### 3 — Humans accrue Karma Pool at DOUBLE rate · *SR3 p.246*

> "**One-twentieth (one-tenth for humans)** of all Karma earned goes into the character's Karma
> Pool (every twentieth/tenth point earned)."

`SR3EActor.karmaAward` uses a flat 20 for everyone. This is the classic SR3 human metatype
advantage and it is missing entirely.

⚠ **[#80](#80)'s tests could not catch it**, for the third time in this family: the only worked
example on p.244 is **Shetani, an elf**, so every assertion pinned to the book is pinned to the
twentieth-point case. The human rule appears two pages later, in the Karma Pool chapter rather
than the advancement one.

⚠ `karmaAward(totalKarma, amount)` takes no metatype, so this is a signature change, and
`karmaPoolForTotal` needs the same divisor or the migration in `0.4.5.7` will disagree with it
for humans.

### The fix

One pass, because all three touch the same function:

1. Render the Award Karma button in the Bio tab's Resources block, beside Spend Karma….
2. Route `_openSessionRewardDialog`'s karma write through `SR3EActor.karmaAward()` — the same
   pure rule the sheet button uses — writing `system.karma`, `system.totalKarma` and
   `system.karmaPool`. Fix the preview line to show Good Karma.
3. Give `karmaAward` and `karmaPoolForTotal` the metatype, defaulting to the twentieth so a
   missing one cannot silently double anybody's Pool.

⚠ **Existing characters will need a manual correction and the system cannot do it for them.**
Karma awarded so far went into the Pool and was never recorded in `totalKarma`, so there is no
record of what was earned — nothing to migrate from. Say so in the release note rather than
attempting a heuristic.

⚠ **Do not fold [#79](#79)'s ledger into this.** The ledger wants a delta-based, GM-relayed
write on the same path; this is a correctness fix that should land first and small.

---

### What landed — 0.4.5.9

1. **The Award Karma button is rendered**, in the Bio tab's Resources block beside Spend
   Karma…. **GM-only**, matching Session Rewards: the Good Karma *field* stays owner-editable
   under the usual ethos, but a button captioned "Award" also writes `totalKarma` and the Pool,
   which a player should not be doing to their own sheet silently.
2. **Session Rewards routes through `SR3EActor.karmaAward()`**, the same pure rule the sheet
   button uses, writing `system.karma` / `system.totalKarma` / `system.karmaPool`. Its preview
   line now reads Good Karma rather than the Pool, and the chat card names anyone whose award
   crossed a Pool threshold — that point did *not* reach their Good Karma and the difference is
   otherwise invisible.
3. **`karmaPoolDivisor(metatype)`** — 10 for humans, 20 otherwise, matched case-insensitively
   because `system.metatype` is free text on the sheet ("Species"). `karmaAward` and
   `karmaPoolForTotal` both take it. An unknown or missing metatype gives **20**: the actor
   field defaults to `'human'` so real characters are right, and the conservative default
   protects a call site that forgets to pass one.

**Also fixed while in there:** Total Karma moved out of the **Reputation** block, where it had
been sitting beside Street Cred and Notoriety, and now renders next to Good Karma under
Resources. The Karma field is labelled **Good Karma**. That grouping is why this bug survived —
the field Session Rewards wrongly wrote to lives on a different tab from the two it should have.

⚠ **Migration `0.4.5.7` was deliberately NOT made metatype-aware**, and it no longer calls
`karmaPoolForTotal` at all — it is pinned to `⌊total / 20⌋ + 1`, the arithmetic the old code
used. It corrects the *starting point* on characters already in play and must keep meaning only
that; following the new divisor would turn a documented +1 into a silent 3 → 7 jump for humans,
computed from a `totalKarma` this very entry shows was never reliably written.

⚠ **Existing characters still need a manual correction**, exactly as predicted above: karma
awarded before this went into the Pool and never touched `totalKarma`, so there is no record to
migrate from. A GM should set Good Karma, Total Karma and the Pool by hand once.

**Coverage:** 18 new assertions in `tests/karma.test.mjs` (88 total) and a mutant reproducing
the flat-twentieth bug. 56/56 mutants.

<a id="82"></a>
## 82. Buying gear needs a flow, like combat has — *Availability, SR3 p.284-286*

**Raised 2026-09-01.** Gear is acquired by hand today: a GM decides, a player edits `nuyen` and
drags an item on. SR3 has actual rules for this and none of them are implemented.

The shape wanted is the combat one — a dialog that gathers the modifiers, a roll, a chat card
that says what happened and leaves the decision to the GM.

### What the rules are

Every gear item already ships the two fields this needs: **`availability`** (e.g. `8/14 days`)
and **`streetIndex`**, alongside `cost`. Nothing reads either. An Availability Test is an
opposed/threshold test against the availability rating, with the time code setting how long it
takes, and the Street Index multiplying price outside normal channels.

⚠ **Read the book before designing.** Availability, Street Index and the legality codes
interact, and the numbers are already sitting in the packs — so this is mostly a matter of
consuming data that is present rather than authoring any.

### Contacts are the interesting half

The player's **contacts** should modify this — a Fixer is not an Armourer is not a Talismonger,
and a Level 3 contact is not a Level 1. The contact type gates *what* they can source, the
level/quality gates *how well*. That is the part with no obvious existing model in the system
and the part worth designing first.

⚠ **Check what `contact` items actually carry** before assuming a level or type field exists.

⚠ **Related: [#79](#79)'s ledger.** A purchase is the single best reason to want a nuyen audit
trail, and a buy flow is its most natural writer. Neither blocks the other, but if the ledger
lands first this should write to it rather than editing `system.nuyen` in place.

<a id="83"></a>
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

⚠ **Sequencing with [#82](#82).** Both are about contacts. If gear-buying is going to read
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
[#82](#82): if PR is a connection rating, it and `contact.connection` may be the same number.

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
([#82](#82)), an action economy ([#48](#48)), a karma/nuyen ledger ([#79](#79)), character
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
([#64](#64)) — but the enhancer's own entry says outright that it stacks. Do not "fix" a
character who has both.

**2 — 🔴 `SR3E.quicknessNotForReaction` lists only move-by-wire.** Muscle Replacement carries
the identical carve-out in identical words — *"this change does not affect Reaction"* — so
without a second entry every user gains Reaction they are not entitled to. One line in
`config.js`; the [#4](#4) machinery does the rest.

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
    carefully documented ([#5](#5)), but the change is additive and testable;
  - store pre-discounted `essenceCost` per item and leave grade as a label — no engine change,
    but the number on the item then disagrees with the book's printed cost for that implant,
    and salvage would have to un-discount it to say what the part is worth.

**4 — ✅ The conversion — FIRST PASS DONE 2026-09-03 (`tools/import-johnson-gear.mjs`).**

**37 stubs converted across 22 of the 62 contacts**, exact-name matches only. A Corporate
Security Guard's `Browning Max-Power` is now a `firearm` carrying `9M / SA / HPist` instead of an
inert `gear` stub with no damage code — **the GM can roll it**. `gear` fell 270 → 233; firearm
0 → 19, melee 0 → 9, armor 30 → 37, cyberdeck 0 → 2. Each converted item carries a real
`_stats.compendiumSource`, which is what "does their gear link back to the compendium" asked for.

⚠ **NOT blocked on [#12](#12-write-a-committed-pack-rebuild-script-and-vendor-its-sources)**, as
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

**4b — The remainder: REPLACE THE STUBS WITH REAL IMPORTS.**

⚠ **Nothing links, so there is no link to fix.** Checked 2026-09-01: of the **1,152 embedded
items** across the 62 contacts, **zero** carry `_stats.compendiumSource` or
`flags.core.sourceId`. Every one was fabricated inline by the generator's own `skill()` /
`gear()` / `cyberware()` helpers. A stub is not a mis-pointed reference to a pack entry — it is
a different shape entirely, so the job is **delete the stub, create from the pack entry**, not
re-point anything.

That is more work than relinking and a better outcome: an item created from a compendium entry
arrives carrying `compendiumSource`, its `bookPage` citation ([#87](#87)), its
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
| adeptpower | 5 | 0 | inert, like every adept power was before [#59](#59) |
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
   abbreviate (`Muscle Replac.`, `Reaction Enhance`), which is [#87](#87) and which already
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

⚠ **[#87](#87) blocks part of this.** `Predator 2` matches nothing; the packs ship
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

**So the order of work is: [#87](#87) first (names), then split the compound stubs, then the 49
type corrections, then match — with every stem match read by a human.** The 92 exact matches are
the only part safe to automate.

**The 192 unmatched split four ways**, and only the first is an import at all:

| Bucket | Fix |
|---|---|
| named item, wrong/abbreviated name | [#87](#87), then match |
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
## 87. ✅ Cyberware names are abbreviated — **DONE 2026-09-03** (5 left, see below)

**Raised 2026-09-01.** `Muscle Replac. [1]`, `Reaction Enhance [2]`, `Eyes, Vis Mag Ele[1]`,
`Obv.Cyb.Arm Semi.natCov.`, `Str Enh [3] (Pair)`. **~170 of 845** cyberware items carry a
contracted name rather than the book's.

⚠ **This is not only cosmetic — it has already caused a false finding.** Searching for
`^muscle replacement` and `^reaction enhancer` returned nothing, and both were reported in
[#86](#86) as *"in no pack at all"* and needing to be created. They ship, correctly, under the
abbreviations. Anything matching cyberware by name must search a **stem**.

### Citations are NOT part of this — they are nearly done

**809 of 845 have a `bookPage`** (`sr3.304`, `ct.31`, `mm.064`), and the item sheet already
renders it as *"Book / Page"*. Every item in a real cyberware pack has one.

⚠ **This claim was WRONG and is corrected here (2026-09-03).** It said the only 36 without a
citation were the contacts' embedded stubs and that [#86](#86)'s conversion would replace them,
so no separate work was needed. **[#86](#86)'s conversion deliberately EXCLUDES cyberware** —
converting a `gear` stub named `Radio` into 0.75-Essence headware would charge Essence the
book's printed figure excludes. So those stubs were never going to be fixed by it, and they
still carry no `bookPage`.

The count is also larger than 36 once measured on the shipped pack: **39 cyber/bioware documents
across the 62 contacts, and every one of them is inert** — zero bonus fields, so a contact whose
sheet says *Boosted Reflexes 1* gains no initiative die.

⚠ **And they are not items — they are LISTS.** One document reads
`Cybereyes (Opticam), Data Compactor 2, Datajack, Headware Memory [300 Mp], Headware Radio`:
five implants with a single summed `essenceCost`. No name match can ever resolve that, which is
why it sits in [#86](#86)'s "compound list" bucket and needs splitting before anything else.

**809 of 845 real pack cyberware items do carry a `bookPage`**, so the original point stands for
the packs — it is only the contacts' embedded stubs that lack citations, and they need [#86](#86)
finished, not this task.

### Renaming is riskier than it looks

⚠ **NAMES ARE KEYS.** `SRCG_BONUSES` (`scripts/data/srcg-bonuses.js`) is keyed by item name;
`improvedSkillName` matches a skill by name; and `SR3E.quicknessNotForReaction` and
`SR3E.reactionExclusive` match cyberware by name. A rename silently breaks every one, and the
failure is invisible — a bonus simply stops applying.

⚠ **Foundry EMBEDS items.** Every character already holding `Muscle Replac. [1]` keeps that
name. A pack rename reaches nobody without a migration covering world actors, world items and
**unlinked token actors on every scene**.

⚠ **It diverges from upstream, permanently.** This data comes from the Shadowrun Character
Generator, and the `BookPage` codes were deliberately kept *"so a future re-import lines up"*
(CLAUDE.md, Source books). Renaming gives that up. Worth an explicit decision, not a side
effect — a re-import would then need a name map anyway.

### ✅ Done — and the "cheaper alternative" was rejected on the ask

**210 items renamed across both pack copies**, covering 102 of the 107 abbreviated stems.
`Muscle Replac. [1]` → `Muscle Replacement [1]`, `Eyes, Vis Mag Ele[1]` →
`Eyes, Vision Magnification, Electronic[1]`, `Str Enh [3] (Pair)` →
`Strength Enhancement [3] (Pair)`.

The `aka`-field alternative was rejected because it *"does not improve what a player SEES"*,
and what a player sees was the ask. **But its safety argument was kept** — the upstream string
lives on in `system.srcgName`, so this is a rename *plus* the field, not one instead of the other.

⚠ **`srcgName` is the whole safety mechanism, and the failure it prevents is SILENT.**
`SRCG_BONUSES` is keyed by the **upstream** name and is **generated** by
`tools/build-mods-bonuses.mjs` from upstream data — so a bare rename would leave **43 of its
151 entries** unable to match ever again, re-broken on every regeneration. Among them: **all
four Muscle Replacement grades**, whose Quickness carve-out was wired only two days earlier.
Nothing would have errored; the bonus would simply have stopped existing.
`_patchItemsByName` now keys on `item.system.srcgName || item.name`.

⚠ **The regex registries needed no change and that is by design.**
`SR3E.quicknessNotForReaction` is `/^muscle\s*replac/i`, which matches the abbreviation *and*
the expansion — so it covers both a migrated world and one still holding old embedded copies.
This is the "search a stem, never a full name" rule paying off; `tests/cyberware-names.test.mjs`
asserts the stem still matches both spellings so nobody tightens it later.

⚠ **Migration `0.4.5.13` is corrective — it overwrites `name`.** Justified because a name is
pack data rather than a GM's setting, and because the map is a closed list of 107 upstream
strings: an item a GM actually named cannot match one. Idempotent on the presence of `srcgName`.

⚠ **Every expansion was read off the printed page**, located by each item's own `bookPage`.
Two would have been guessed wrong: `Eye, Laser Mic.` is a **Microphone**, not a microscope
(M&M p.14), and `Nano-Bio sys.` is a **Nano-biomonitor**, not a "nano-bio system" (M&M p.91).

### ⚠ 5 items deliberately NOT renamed — Cybertechnology is not in the PDF library

`Syn. Cyb Arm/Leg Sem.natCov.` · `Pair.Obv.Cyb.Arm Sem.natCov.` · `Pair.Obv.Cyb.Leg Sem.natCov.`
· `Pair Syn.Cyb.Arm Sem.natCov.` · `Pair Syn Cyb Leg Sem.natCov.` — all `ct.30`, plus
`Eyes, L 1shot Flash P.rload` (`ct.21`) and `Body Enhance` (`ct.31`).

They are expandable **by eye** — "Obvious Cyberarm, Semi-natural Covering" is obviously what is
meant — but not **verifiably**, and a plausible invention printed as the book's wording is worse
than a visible abbreviation. Add `Shadowrun 3e - Cybertechnology` to the library and they take
ten minutes.

### The original plan, for reference

1. Build the map from the books — 170 canonical names. The `bookPage` on each item says exactly
   which page to read, so this is mechanical rather than guesswork.
2. Update every name-keyed registry in the same commit, and regenerate `srcg-bonuses.js`.
3. Migration for the three populations, keyed old-name → new-name.
4. Patch both pack copies (`packs/` and the install — `sync:install` never copies packs).

⚠ **A cheaper alternative that solves the search problem without renaming anything:** add an
`aka` / `bookName` field carrying the full name, leave `name` alone. Registries and searches
read it, upstream alignment survives, no migration is needed for existing characters. It does
not improve what a player SEES in the compendium, which is the part of the ask this would not
address.

<a id="88"></a>
## 88. ✅ Little Black Book specialisations roll the wrong dice — **DONE 2026-09-01**

**Found 2026-09-01** while checking whether a contact can take an opposed roll against a player.
**131 of the 741** skills on the 62 contacts carry a specialisation, and every one of them is
malformed. `system.specialisations[].level` is the **BONUS over the base skill**, so a
specialised roll uses `rating + level`.

| | Count |
|---|---:|
| specialisations in the pack | **131** |
| …carrying `level: 2` | **131** (all of them) |
| …at the SR3 chargen gap of +2, and so correct | 55 |
| **wrong rating** | **45** — from −2 to +5 |
| **several specialisations collapsed into ONE** | **31** |
| **rating baked into the displayed name** | **131** |

Examples, printed book value against what the pack rolls:

```
Instruction 5 (Magic 6)          rolls 7   book 6    +1
Etiquette 4 (Corporate 8)        rolls 6   book 8    −2
Conjuring 5 (Summoning 8)        rolls 7   book 8    −1
Car 6 (Car B/R 3)                rolls 8   book 3    +5
Computer 5 (Decking 8, Hardware 9)   one spec named "Decking 8, Hardware 9"
Stealth 3 (Sneaking 5, Theft 6)      one spec named "Sneaking 5, Theft 6"
```

### ✅ The `level: 2` is CORRECT, and it is not a guess — *SR3 p.57*

⚠ **Corrected 2026-09-01 by the maintainer.** This entry first called the 2 "a guess written as
though it were data". It is not. It is exactly what SR3 character creation produces:

> "To calculate the rating of a specialization and its related base skill, first buy the base
> skill. Specializing gives you a rating in the specialization equal to the base skill **rating
> +1**. You then **subtract one from the base skill rating**, because your character's focus on
> the specialization means that he or she has not focused as much on the rest of the base skill."

Edged Weapons 6, specialise in Katanas → **Katanas 7, Edged Weapons 5**. The gap is **2**, by
construction, for every specialisation taken at character creation.

`SkillData.migrateData` (`scripts/data/ItemDataModels.js`) converts a legacy `specialisation`
STRING into the modern array with that gap:

```js
source.specialisations = [{ name: source.specialisation, level: 2 }];
```

⚠ **So the default is principled and should stay.** A legacy skill whose specialisation rating
was never recorded almost certainly came from chargen, where the answer is 2.

⚠ **And the 55 "correct by luck" above are NOT luck** — they are contacts whose printed
specialisation happens to sit at the chargen gap, which is the common case. Roughly 55% of the
single-specialisation entries follow it.

### Why it is still wrong HERE

⚠ **A gap larger than 2 is LEGAL, not an error — these are characters who advanced.** The
chargen gap of 2 is where a specialisation *starts*; p.245 then lets it be raised with karma
with no ceiling (*"To improve the specialization beyond that, follow the rules above as
normal"*), and each raise widens the gap by one. So `Etiquette 4 (Corporate 8)` is a chargen
specialisation raised twice more, `Conjuring 5 (Summoning 8)` raised once. Nothing about them
is arbitrary or errata.

⚠ **So the BOOK is right and the STORED level is wrong** — we flattened every one of them to
the chargen default. **45 of 100** single-spec entries have a gap other than 2, every one of
them reachable in play.

⚠ **This settles the shape of the fix:** derive `level = printed specialisation rating − base
rating` and store it. A gap of 3, 4 or more is data to preserve, **not** a value to clamp or
treat as suspicious.

⚠ **Their strings are the BOOK'S DISPLAY TEXT**, not specialisation names. `"Magic 6"` is a name
plus a rating; `"Decking 8, Hardware 9"` is two specialisations. `migrateData` cannot know that
and dutifully stores the whole string as one name — which is why all 131 display a number stuck
on the end regardless of whether the rating is right.

⚠ **`Car 6 (Car B/R 3)` is a different mis-parse and the worst single case.** The book prints
`Car 5, Car B/R 3` as two SIBLING SKILLS; the data entry read the second as a parenthetical
specialisation of the first. Car Build/Repair is its own skill, and the contact now rolls it at
8 instead of 3 — while having no Car B/R skill at all.

### What it breaks

Any specialised roll by a contact: the skill dialog offers the specialisation, and
`SR3EItem.defaultTiers` and the roll paths read `rating + level`. **45 of 131 roll the wrong
number of dice**, and all 131 display a name with a number stuck on the end.

⚠ **The 55 that are right are right by ACCIDENT** — the book's specialisation happens to be
base + 2. Nothing protects them; a base rating corrected by [#84](#84) silently moves them.

### Fix

The data is the problem, not the machinery. In `populate-mr-johnsons-contacts.js`:

1. Give `skill()` a structured specialisation — `[{ name, rating }]` — and derive
   `level = rating − base` at build time rather than defaulting it.
2. Split the 31 multi-spec strings into separate entries.
3. Rescue the sibling skills wrongly absorbed as specialisations (at least Car B/R).
4. Regenerate, then patch both pack copies — `sync:install` never copies packs.

⚠ **Do NOT clamp the derived level at 2.** See above: a wider gap is a character who spent
karma, and clamping would silently delete advancement the book recorded.

### ✅ Partly done 2026-09-01

**The generator now DERIVES the level** rather than storing the book's display text raw.
`skill()` parses its `specialisation` argument — `'Magic 6'`, `'Decking 8, Hardware 9'` — into
`{name, level}` entries with `level = printed − base`, splitting on commas. The call sites are
untouched, so they still read like the page they were copied from. The raw string is kept for
provenance.

**Four sibling-skill absorptions rescued**, all verified against the printed page:

| Contact | Was | The book prints |
|---|---|---|
| Taxi Driver p.67 | `Car 6 (Car B/R 3)` | `Car 6, Car B/R 3` |
| Highway Patrol p.62 | `Bike or Car 6 (Bike or Car B/R 3)` | `Bike or Car 6, Bike or Car B/R 3` |
| Squatter p.52 | `Car 2 (B/R 2)`, `Electronics 2 (B/R 2)` | `Car B/R 2, Electronics B/R 2` — **no plain Car or Electronics** |
| City Services Worker p.67 | `Electronics 3 (Electronics B/R 4)` | `Electronics 3, Electronics B/R 4` |

⚠ Squatter had **two skills invented that the book does not grant** — a plain Car and a plain
Electronics, created only to hang "B/R 2" off as a specialisation.

**The Lv2 cap is gone** — the item sheet's level dropdown now offers 1..max(4, current+1), so a
specialisation at level 3+ displays and can be set.

**`CHARGEN_SPEC_GAP` has one owner**, `scripts/data/skill-rules.mjs`, replacing three inline
copies of `level: 2`. ⚠ It lives in a **dependency-free** module rather than `ItemDataModels`,
which calls `foundry.data.fields` at load — importing that for one number broke
`tests/ew-skill.test.mjs` immediately.

### ✅ Landed in the packs too

`patch-johnson-stats.mjs --skills` rebuilds every contact's skill documents from the generator
— **62 contacts, 773 skills, 125 carrying specialisations, both pack copies, 0 dangling item
references**, `packs:check` clean.

Spot-checked against the page: *Shark Lawyer*'s `Etiquette 3 (Legal 6, Political 5)` now stores
`Legal level 3` and `Political level 2`, i.e. 3+3 and 3+2 — the derived bonuses, not the flat
chargen 2.

⚠ **Item ids are DERIVED from contact + skill name, not random.** A re-run must reuse the same
`!actors.items!` keys; random ids would orphan the previous documents inside the database.

⚠ **The actor's `items` array and the item documents must move together.** Writing one without
the other leaves an actor pointing at ids that no longer exist — checked explicitly, 0 dangling.

⚠ **A GM who already dragged a contact into a world keeps their stale copy.** Foundry embeds.
No migration was written: these are NPC reference sheets rather than system data, and
re-dragging is the ordinary fix.

### ~~🔴 Blocked on a UI bug — the level dropdown stops at Lv2~~ ✅ FIXED

`SR3EItemSheet.js:590-591` offers exactly two options:

```html
<option value="1">Lv1 (${rating + 1} dice)</option>
<option value="2">Lv2 (${rating + 2} dice)</option>
```

So a specialisation at level 3+ — which [#80](#80) already made the karma calculator produce,
and which this fix will write for 45 contacts — **cannot be displayed or set on the item
sheet**, and renders with neither option selected. A GM opening the skill sees a blank
dropdown and, changing anything else, silently writes it back down to 1 or 2.

⚠ This is the last remnant of the level-2 cap [#80](#80) removed from the costing side. Fix
this **before** writing levels above 2 into the packs, or the data will look broken the first
time anyone opens one of those skills.

⚠ **The `level: 2` constant is DUPLICATED in two consumers** —
`SR3EActorSheet.js:980` and `SR3EMIJI.js:78` both carry their own inline copy of
`migrateData`'s legacy-string conversion. They are defensive, for documents not yet migrated,
but the chargen gap now lives in three places. Collapse them to one helper when this is touched.

⚠ **DO NOT TOUCH `SkillData.migrateData`.** Its 2 is the SR3 chargen gap (p.57) and is right
for the legacy data it exists to convert. It produces wrong numbers *here* only because these
inputs are book display text rather than specialisation names. Changing it to 1 — or deriving
it — would silently re-rate every legacy specialisation in every existing world to fix a
problem that lives in this pack's data.

⚠ **Do not "fix" this by parsing the trailing number out of the name at ROLL time.** That would
make the display right and leave the stored data wrong, and every other consumer — the karma
calculator's specialisation costs ([#80](#80)), defaulting, the sheet — would still read the
bad `level`.

<a id="89"></a>
## 89. ✅ Contacts' skill lists — regenerated from the book — **DONE 2026-09-01**

**Found 2026-09-01** while splitting sibling skills for [#88](#88). This is not a specialisation
problem and is worse than one.

`Dock Worker` (p.67) ships with:

```
Athletics 3 (Climbing 4), Car 2, Computer 2, Electronics 3 (Electronics B/R 4),
Etiquette 3, Pistols 2, Unarmed Combat 2
```

The book gives:

```
Athletics 3, Car 2 (Forklift 4), Intimidation 3, Unarmed Combat 3
```

**Not one skill matches.** What it has is very nearly **City Services Worker's** list — the
contact three entries later on the same page — differing only in Athletics.

⚠ **So a whole skill block was duplicated onto the wrong contact.** That is a different class of
error from anything [#84](#84) or [#88](#88) found: those were wrong VALUES on the right record.
This is the wrong record.

⚠ **Dock Worker was already one of the two hastily-entered records** — it shipped with no Karma
Pool in its note and with Willpower and Charisma transposed ([#83](#83), [#84](#84)). Three
independent defects on one contact is a strong hint that its whole entry was rushed, and its
gear, cyberware and knowledge skills have **not** been checked.

### What this implies for the other 61

⚠ **[#84](#84) audited ATTRIBUTES only** — the stat-block row and the Dice Pools line. Skills,
gear and cyberware were never compared to the book at all. This is the first evidence that the
skill lists need their own pass, and there is no reason to assume Dock Worker is the only one.

### Audited 2026-09-01 — `tools/audit-johnson-skills.mjs`

Report checked in at **`audit/johnson-skills-audit.txt`**. Reports, never writes.

## 🔴 49 OF 62 CONTACTS HAVE THE WRONG SKILLS — 130 differences

| | |
|---|---:|
| contacts compared | 62 |
| **clean** | **13** |
| **with differences** | **49** |
| skills the book gives and the generator lacks | **55** |
| skills the generator has and the book does not | **26** |
| wrong ratings | **31** |
| wrong or missing specialisations | **18** |

⚠ **The tool was checked before these numbers were believed.** A first run of the attribute
audit reported 52 of 61 differing and that turned out to be one systematic cause, so three
records were verified by hand against the page here before reporting: **Taxi Driver comes out
clean**, and **Bookie** and **Shark Lawyer** are both genuinely wrong. Only **2 of the 130**
differences involve the bracketed placeholder names the generator uses deliberately, so
false positives from that source are negligible.

### The errors are not one kind

**Whole lists on the wrong contact.** `Dock Worker` carries `City Services Worker`'s skills —
Computer, Electronics, Etiquette, Pistols, Card Games, Disco, Firefighting — and is missing
Intimidation. Not one skill of its own survives.

**Two skills merged into one.** `Shark Lawyer`: the book gives `Interrogation 6, Intimidation 4
(Verbal 6)`. The generator has `Interrogation 4 (Verbal 6)` — Interrogation's name with
Intimidation's rating and specialisation, and Intimidation gone.

**Specialisations on the wrong skill.** One contact's `Pistols` carries *Sneaking 5, Hiding 6* —
those are Stealth's.

**Specialisations silently dropped.** `Bookie`'s `Etiquette 2 (Street 4, Gambling 5)` kept only
Street; `Stealth (Alertness 4, Sneaking 4)` kept only Sneaking.

**Plain wrong ratings**, in both directions — `Security Systems 5` for the book's 7,
`Cybertechnology 3` for 5, `Local Bars 4` for 5.

**Whole skills missing** — 55 of them, e.g. `Bookie`'s Psychology 3.

### What this means

⚠ **[#84](#84)'s green result covered attributes ONLY**, and this is the cost of reading it more
broadly. The stat rows are now right; the skill lists were never checked until now.

⚠ **Gear, cyberware, spells and knowledge-skill lists are STILL unaudited.** Given a 79% failure
rate on skills, assuming the rest is sound would be unwarranted. [#86](#86)'s conversion will
surface the cyberware half as a side effect, since a stub that does not match any pack entry has
to be reported.

### ✅ Regenerated rather than patched — `tools/regen-johnson-skills.mjs`

130 differences across six kinds, several needing a judgement about which of two skills a rating
belongs to, is not a `--fix` flag. **So the skill lists were re-extracted from the book instead**
— every `skill(...)` call in the generator replaced with what the page prints.

**Result: 62 of 62 contacts now match the book**, from 13 clean and 130 differences.

Hand-verified on the three worst records:
- *Dock Worker* — `Athletics 3, Car 2 (Forklift 4), Intimidation 3, Unarmed Combat 3`, its own
  list back rather than City Services Worker's.
- *Shark Lawyer* — `Interrogation 6, Intimidation 4 (Verbal 6)`, the merge undone.
- *Bookie* — `Etiquette 2 (Street 4, Gambling 5)` and `Psychology 3` restored.

⚠ **It replaces ONLY `skill(...)` calls.** Gear, armour, cyberware, spells and adept powers are
left exactly where they are — those are [#86](#86), a different extraction.

⚠ **The book does not print a LINKED ATTRIBUTE**, which `skill()` needs. It is resolved from
`SR3ESkills`, then from whatever the generator already used for that name, then a tier default —
and anything falling all the way through is REPORTED, because the linked attribute decides which
pool a skill rolls. Nothing fell through on the final run.

### ⚠ Four PDF faults it had to survive, each of which produced plausible garbage

1. **A section header can lose its first word entirely.** Joygirl (p.51) extracts as
   `…Unarmed Combat 2` / `Skills: Bunraku Parlors 3, …` — the word "Knowledge" is simply not in
   the text. Untreated, the whole knowledge list merged into the active one and produced a skill
   named *"Unarmed Combat 2 Skills: Bunraku Parlors"*. A bare `Skills:` is now both a terminator
   and a knowledge header, and is reported when it happens.
2. **The book's heading and the generator's name differ** — "CORPORATE SECURITY" vs "Corporate
   Security Guard", "GHOUL" vs "Ghoul (Human Ghoul)". Anchored prefix match.
3. **`Charge's Habits`** — a real skill with an apostrophe. The shared parser's
   `'([^']*)'` could not read `'Charge\'s Habits'` back and reported it missing from a file that
   plainly contained it. Fixed to handle escapes.
4. **Page footers land mid-list** and parse as a skill called "39 Mr".

⚠ **Do not fix Dock Worker in isolation** — or any single record found by accident. That
produces exactly the false confidence [#84](#84) exists to avoid.

<a id="90"></a>
## 90. ✅ `SR3ESkills`' specialisations, cross-checked against the books — **MOSTLY CLEAN**

**Run 2026-09-01** — `tools/audit-skill-specialisations.mjs`, report at
`audit/skill-specialisations-audit.txt`.

`SR3ESkills` ships **345 specialisations across 99 skills** and lives in a SYSTEM pack, so it
reaches every table and no source-book toggle can hide it. It came from the upstream character
generator and had never been compared to a printed page. Given [#84](#84) and [#89](#89) found
85% and 79% defect rates in similarly-sourced data, the expectation going in was poor.

**It is fine.** Five books give skills a `Specializations:` line — Core (45), Cannon Companion
(15), MITS (5), Rigger 3 (4), M&M (1). Of the 56 that match a skill we ship:

| | |
|---|---:|
| **clean** | **46** |
| with differences | 10 |
| …**verified genuine gaps** | **4** |
| …false positives and PDF prose bleed | 6 |

⚠ **This is the audit that came back GOOD**, and that is worth recording as loudly as the two
that did not. The Little Black Book's problems are that book's transcription, not a property of
everything the upstream generator produced.

### The genuine gaps — VERIFIED against the printed page, 2026-09-01

⚠ **The tool's first list of six was checked page by page and THREE were false positives.** Only
these four survive. Every line below was read off the PDF, not taken from the report.

| Skill | Citation | The book prints | We ship |
|---|---|---|---|
| **Vectored Thrust Aircraft** | *SR3 p.89* | `By specific vehicle type, Remote Operations` | nothing, and no `->` marker |
| **Spray Weapons** | *CC p.105* | `Firehose, Flame-thrower, Spray` | `weapon->` only |
| **Talismongering** | *MITS p.29* | `Alchemy (the refinement of magical materials) and Artificing (manufacturing foci)` | nothing |
| **Spell Design** | *MITS p.29* | `Spell Category` | nothing |

⚠ **`Spray Weapons` gives THREE, not the two the tool reported** — it stopped at `Spray` because
a section heading followed on the same line. Read the page, not the report.

⚠ **`Talismongering`'s report was wrong about WHAT is missing** — it said "Analysis, Gathering";
the book says **Alchemy and Artificing**. The gap is real, the contents were not. Note we ship
Alchemy and Artificing under **Enchanting**, so check whether MITS treats these as one skill or
two before adding them.

### The three false positives, and why each fooled the tool

| Skill | Citation | Why it was not a gap |
|---|---|---|
| **Sorcery** | *SR3 p.87* | We ship `Spell Category->`. The tool filtered every `->` entry out of the comparison, so a specialisation we DO offer read as missing. |
| **Etiquette** | *SR3 p.87* | *"Etiquette is a wide-open skill… Examples include…"* — the entry is prose, and the tool split the examples into fake specialisations. |
| **Unarmed Combat** | *SR3 p.86* | The book says `…or by body part (fists, head butts, kicks)`; we ENUMERATE Fists, Head, Kicks. Ours is the better data, and it reported as both missing and extra. |
| **Leadership** | *SR3 p.87* | The book gives `…Tactics, Morale`. A watermark — `Gavin Lowry (order #24266)` — ran onto the line and truncated the book side, so our correct `Morale` read as an EXTRA. |

⚠ **`Spray Weapons (Firehose)` is used by shipped content** — the Little Black Book's
Firefighter has it — so a specialisation the system's own packs rely on is not in the list a
player can choose from.

### ⚠ The first run said 44 differences. It was wrong, and the reason matters

**A skill NAME appears in several categories, and only one carries the specialisations.**
`SR3ESkills` lists `Stealth` under *Physical skills* with all four of the book's
specialisations, **and** under *Background knowledge* with none — the latter correctly, since a
knowledge skill about stealth has no list. Keying by name alone let the empty duplicate
overwrite the real entry, and the tool reported all four as missing.

The tool now **unions** the specialisations across every category a name appears in, which
answers the only question being asked: can a player pick this anywhere?

⚠ **Anything reading `SR3ESkills` by name alone has this bug.** The duplicates are real data,
not an error — worth checking wherever a skill is looked up by name.

### What is left is mostly the PDF, not the data

`MISSING Third Edition`, `MISSING as described on p. 160`, `MISSING or by body part (fists` —
running heads and prose tails bleeding into a wrapped `Specializations:` line. Not worth
chasing; the entries above were confirmed by reading them.

⚠ **The 9 EXTRAs are probably right.** `Biotech (Magical Health)`, `Enchanting (Alchemy,
Artificing)`, `Unarmed Combat (Fists, Head)` — later books add specialisations, and the tool
only reports an extra where it judged the book's list closed, which it can misjudge.


<a id="91"></a>

## 91. Core gear that ships nowhere — eight item types with zero documents

**Found by `audit/sr3-core-gear-audit.md` (2026-09-02),** which started from [#86](#86)'s
flash-pak and asked whether that was one gap or a class. It is a class.

`system.json` declares 22 Item types. **Eight have zero documents across all 82 packs**:
`ammunition` · `gear` · `thrown` · `medical` · `contact` · `quality` · `complex_form` ·
`summoning`. No book in the system ships a gear, ammunition or electronics pack — every pack is
one of `adept-powers · armor · bioware · cyberware · drones · drugs · firearms · melee ·
projectiles · spells · vehicle-mods · vehicle-weapons · vehicles`.

### ⚠ `ammunition` — **already tracked as [#23](#23), a month before this audit**

⚠ **This audit REDISCOVERED [#23](#23) and first wrote it up as new.** That entry dates from
**2026-08-05** and was *found in play*, which is a better warrant than a sweep. It is also more
complete: it inventories every piece of the implementation, records that this is **not a
regression** (the old monolithic packs on `main` had no ammunition either, the archive holds
zero, and there is no source data in `rawdata/` or upstream), and it names a blocker this audit
missed — **[#12](#12-write-a-committed-pack-rebuild-script-and-vendor-its-sources), because the
populate macros were retired and there is currently no supported way to build a pack at all.**

**Read [#23](#23) for the ammunition work.** Only the items below are new here.

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

**What this audit adds to [#23](#23):**
- **Arrows and bolts are the same gap.** The nocked-ammo flow matches them by `arrow`/`bolt`
  loading mechanism and the book prints both rows; neither ships, so a bow can never be re-nocked.
  [#23](#23) lists the 8 firearm types and does not mention these.
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

Electronics (p.288) · Communications (p.290) · Surveillance & countermeasures (p.292) ·
Security devices (p.293) · Survival gear (p.295) · Biotech & medical (p.304) ·
Skillsofts & chips (p.296). Of ~200 names extracted, 42 already ship somewhere — armor rows,
the cyberdecks in `sr3e-mdf-cyberdecks`, a few cyberware entries.

### Order of work

⚠ **Nothing here can start until [#12](#12-write-a-committed-pack-rebuild-script-and-vendor-its-sources)
is resolved.** The populate macros were retired and the per-book routing exists nowhere in git, so
**the repo cannot currently build a pack at all** — and [#23](#23) already names itself as the
first task to actually need that decision. An earlier draft of this entry recommended
"ammunition first, it is only nine rows"; nine rows you have no committed way to build is not a
starting point. **#12 is the starting point.**

After that: **ammunition** ([#23](#23) — finished mechanics sitting idle, and it unblocks
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

⚠ **Names are abbreviated in the packs** ([#87](#87)), so match on a stem and confirm by stat.
`Muscle Replacement` ships as `Muscle Replac. [1..4]`.

**Do `cc` first.** Cannon Companion is the weapons-and-gear book, it is on by default, and it is
where the accessories [#91](#91) wants most likely already exist in print.

<a id="93"></a>

## 93. 🧪 Test in Foundry: racial modifiers, troll dermal armor, Species lock — branch `fix/racial-mods`

**Written 2026-09-11 and not yet run anywhere but the unit tests** (38/38). The maintainer does
not run Foundry locally, so this waits for a hosted test. Reported in play: a troll allocated
B5 Q5 S4 C2 I3 W2 imported at those numbers instead of B10 Q4 S8 C0 I1 W2.

### Before testing

1. `npm run manifest:branch` and commit, if the test server installs from this branch.
2. **In the test world, DELETE the "Import Nullsheen 3e Character json" macro, then reload.**
   The system copies that macro into a world once and never refreshes it, so the old version
   stays in any world that already has it. It is recreated from the fixed file on the next load.
3. A reload (F5) is enough — no data-model change on this branch.

### Checks

- [ ] **Import the reported troll.** Expect Body 10, Quickness 4, Strength 8, Charisma 0,
      Intelligence 1, Willpower 2, and two notifications: one listing the modifiers applied,
      and a **permanent** warning that Charisma is below 1.
- [ ] **Import one other metahuman** (elf, dwarf or ork) and compare against the generator's
      own sheet, which shows allocation + race as its total.
- [ ] **Import a human.** Nothing changes, no racial notification.
- [ ] **The troll's Body shows `10 + 1 (11)`** on the Attributes tab, the +1 tooltip reading
      *Troll dermal armor*. Soak a hit — the Body dice should be 11.
- [ ] **A shipped troll** (Dock Worker) dragged from Mr. Johnson's Contacts shows **10 (11)**.
- [ ] **Species as a PLAYER:** a greyed dropdown showing the race; cannot be changed. Edit some
      other Bio field and confirm Species is still the same afterwards.
- [ ] **Species as the GM:** a working dropdown. An actor whose stored value is not one of the
      five (e.g. typed "Hobgoblin" before this change) shows it as *(unrecognised)* and keeps it
      when another field is edited.
- [ ] **Attribute Boost on a troll** (if an adept troll is to hand) — the dermal +1 must not
      count as a technological increase that blocks the boost.

### Known, not fixed here

- Characters **already imported** before this branch keep their human-rated attributes. There
  is no way to tell an allocation from a finished rating after the fact, so there is no
  migration: re-import, or add the Racial Modifications Table (SR3 p.56) by hand.
- Dermal armor counts for healing, which p.281 says it should not — same gap as Dermal Plating.
- The other racial traits are not modelled: a troll's +1 Reach, vision types, a dwarf's +2 Body
  against disease and toxins.

<a id="94"></a>

## 94. GM-initiated attack shows no GM difficulty modifiers — **reported in play 2026-09-11**

**Observation only — not investigated** (reported mid-combat). When the GM initiates an attack,
the GM difficulty-modifier window does not appear.

⚠ **Triage: probably [#50](#50)'s by-design behaviour, not a new defect.** `gmApprovesTN`
defaults to `'player'`, which skips the GM window when the *requester is a GM*. The fix in play
is Configure Settings → **"Always, including GM attacks"**.

**Confirm after the session:** what `gmApprovesTN` was set to. If it was already "Always", this is
new — note whether the attack was ranged or melee, and whether the attacker was an NPC or a PC.
If it was the default, close this as a duplicate and consider whether the default is wrong for
this table.

<a id="95"></a>

## 95. Wilderness Survival shows up as a knowledge skill — **reported in play 2026-09-11**

**Observation only — not investigated** (reported mid-combat). Wilderness Survival appears among
the character's **knowledge** skills rather than the active skills.

**Triage: new** — no existing entry mentions it.

**To check after the session:** where the character's copy came from (the character-generator
import, the `sr3e-skills` pack, or added by hand), what its `category` / `skillType` fields say,
and whether SR3 core treats it as an active skill.

<a id="96"></a>

## 96. Rollable Tables GM tools pre-check every actor — **reported in play 2026-09-11**

**Observation only — not investigated** (reported mid-combat). The GM tools on the Rollable
Tables sidebar open with **every actor already checked** in their target lists. They should
start with **nothing checked**, so the GM opts actors in rather than having to untick everyone
who isn't involved.

**Triage: new** — no existing entry. The only related note is #81's description of Session
Rewards as "a checkbox list of every live PC", which records the list, not the default.

**To check after the session:** which tools have a multi-actor checkbox list (Session Rewards,
Chunky Salsa, Barrier Damage, …) and whether any should keep a pre-checked default. Session
Rewards is the arguable case, since a reward usually goes to the whole party.

<a id="97"></a>

## 97. Cannot drag equipment from a compendium onto a character sheet — **reported in play 2026-09-11**

**Observation only — not investigated** (reported mid-combat). Dragging equipment from a
compendium onto a character sheet does not add it.

**Triage: new** — no existing entry covers dropping items on the character sheet.

**To check after the session:** which item types fail (all equipment, or only some); whether the
drop fails silently or raises an error in the console; whether it fails for the GM, a player,
or both; and whether dragging from the sidebar Items directory behaves differently from a
compendium.
