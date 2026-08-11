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
| 🟢 Socket combat — follow-ups | 21 · 24 · 27 |
| 🔴 Confirmed bugs, still open | 5 · 14 · 25 |
| 📕 Rules not implemented | 3 · 4 · 10 · 30 |
| 📦 Content gaps | 9 · 11 · 19 · 23 |
| 🔧 Tooling & infrastructure | 7 · 12 · 18 · 20 |
| 🧹 Housekeeping | 1 · 6 · 8 |
| ✅ Done — kept for the record | 13 · 15 · 16 · 17 · 22 · 26 · 28 · 29 · 31 · 32 · 33 · 34 · 35 |
| 📌 Notes & parked | combat-audit questions · known drift · ODM/MDF |

### 🔵 In progress

## 2. Rebuild combat on sockets with player-initiated flow

Foundry sockets so each participant sees the right window on their own screen:

- Players can initiate combat (currently attacker-sheet driven, assumes one client)
- **Dodge window on the target's screen**, not the attacker's
- **GM window to set TN, with checkboxes for combat modifiers** (not a typed field)

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

## 33. ✅ Staging past Deadly adds Power — **not an SR3 rule** — **CONFIRMED**

**✅ DONE — `e751e85`.** Fixed on the `sr3-rules-corrections` branch (`a79d9c1`), merged into
`main` separately from this branch's own history. Kept for the record; this file is the
progress, not a queue.

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
- **Five independent copies of the formula**, all in `SR3EActor.js`: `rollPool`, `_rollDodge`, and
  three more in the drain/soak/resist paths. Fix once in a shared helper — the way `dodgeOutcome`
  now holds the dodge rules — not five times.
- **Test it.** Pure arithmetic, no Foundry dependency, so it belongs beside
  `tests/dodge-resolution.test.mjs`.

## 21. Fold the attacker's roll-options into one screen

Socket Stage 3 shipped the GM's TN window but skipped the attacker-side consolidation, so the
table pays **+1 click** rather than the plan's neutral budget.

Since then the flow improved — the GM now sets the TN *first*, and Combat Pool moved onto the
attacker's screen — so the remaining work is smaller than originally scoped: fold **called shot**,
**take aim** and **karma** into `_promptFireMode`, which the attacker already sees, and delete
`_promptWeaponRollOptions` from the ranged path
([SR3EItem.js](scripts/documents/SR3EItem.js)). Weapons with no fire-mode dialog (SS-only firearms,
bows, thrown) fold the same fields into `_promptCalledShot` instead.

Target: attacker **2 clicks** (fire dialog → roll), GM 1, defender 1.

⚠ Click count is exactly what got the previous attempt (`0c45bc5`) reverted after play-testing,
so this is not cosmetic. `gmApprovesTN: 'off'` remains the escape hatch meanwhile.

## 24. Revise melee onto the socket layer — each side edits only its own corner

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

**Same problem, same fix, elsewhere:** `handleAstralRoll` (`SR3EActor.js:~5450`) and the
cybercombat card (`~:460`) share the both-corners-one-client shape and should be done in the same
pass or they become the next report.

## 27. Audit every chat-card button for who may click it

**6 of ~29 are gated.** The rest are actionable by anyone who can see the card, which is the
whole table — combat cards are public by design and that part is wanted.

Gated so far: `.sr-soak-btn`, `.sr-dodge-declare-btn`, `.sr-dodge-roll-btn`, `.sr-soak-roll-btn`,
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

## 14. Fix the wrong flag scope on spirits — **CONFIRMED**, 5 sites

Five calls use the scope string `'sr3e'`, but the system id is **`The2ndChumming3e`**:

| Site | Call |
|---|---|
| `SR3EActor.js:2500` | `spirit?.setFlag('sr3e', 'force', newForce)` |
| `SR3EActor.js:5149` | `a.getFlag('sr3e', 'isSpirit')` |
| `SR3EActor.js:5159` | `s.getFlag('sr3e', 'force')` |
| `SR3EActor.js:5177` | `spirit.getFlag('sr3e', 'force')` |
| `SR3EActor.js:5178` | `spirit.getFlag('sr3e', 'conjurerId')` |

Foundry validates the scope on **write**, so the banishing path at 2500 fails; the reads
return undefined and silently fall back to their `??` defaults. Net effect: spirit Force,
the spirit list and summoner identification do not work as intended.

Check what `SR3ESpiritSummoning.js` writes when it creates a spirit before fixing — if it
already writes under the correct scope, these five are simply reading the wrong place, and
the fix is one-directional. Do **not** fix this inside the socket diff.

## 25. Delete the duplicate `_onRender` in `SR3EHostSheetOrthodox` — **CONFIRMED**

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

## 20. Migrate ~58 `renderDialogV2` hook sites to `DialogV2.wait`'s `render` option

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
  `SR3EHostSheetOrthodox.js:83` (notes enrichment, IC assignment drag-drop).
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

