# Combat system audit — SR3 rules vs implementation

A resumable, sequential audit of the combat system. **One dimension at a time**, findings
appended here after each. Two earlier attempts at a five-way parallel fan-out exhausted the
session token budget and returned nothing, so this is deliberately slow and stateful: this
file IS the progress, not a workflow cache.

## How to continue

Say *"continue the combat audit"*. Then:

1. Read the **Status** table below, take the first `pending` dimension.
2. Audit it — read the code, check the rules in the PDFs, judge against the ethos.
3. Append findings to **Findings**, set that row to `done`, commit.
4. Stop. One dimension per session-chunk keeps it inside a token budget.

Do **not** start a subagent fan-out for this. Five parallel agents burned 723k tokens and
produced nothing; sequential inline work is the whole point of this file.

## Status

| # | Dimension | State | Scope |
|---|-----------|-------|-------|
| 1 | Ranged combat | pending | `rollWeapon` end to end: base TN and every modifier, range bands and measurement, recoil accumulation / compensation / heavy doubling, fire modes SS-SA-BF-FA, ammo effects, called shots, multi-target |
| 2 | Damage, staging, soak | pending | `parseDamageCode` / `stageDamage`, soak card path, armour ballistic vs impact, APDS halving, flechette doubling, wound track, overflow, stun-to-physical |
| 3 | Melee combat | pending | `rollMeleeAttack` / `_buildMeleePoolInfo` / `handleMeleeRoll`: opposed test, reach on both sides, defender weapon fallback, staging by net successes, ties, called shots |
| 4 | Pools and defence | pending | Combat Pool derivation and wound mod, spend/track/refresh timing (SR3 refreshes per Combat Turn — check the boundary now rounds auto-advance), dodge commitment, Full Defense |
| 5 | Action economy | pending | Combat Turn / pass / action structure, Free-Simple-Complex, what the Action Tracker enforces vs displays, per-pass state resets, delayed actions, mid-round joins |

## Method

**Rules source.** The maintainer's PDFs are at `C:\Users\lance\Documents\Shadowrun 3rd
Edition PDFs`. Core book: `Shadowrun 3e - Core Rules {FAN25000}.pdf`; also relevant are
Cannon Companion (weapons/melee), Man and Machine (augmentation), Rigger 3.

They carry a real text layer — **no OCR needed**:

```
pdftotext -layout -f <first> -l <last> "<file>" -
```

Pages are two-column and `-layout` merges the columns on each line; crop a column when a
clean table is needed (`pdftotext -x 0 -y 0 -W 306 -H 795 -layout ...`, mediabox ~616x795pt).
The PDF page number is offset from the printed page — find the offset once, reuse it.

**Cite, do not transcribe.** State the mechanic in your own words with a page reference.
Short factual values (a TN, a modifier, a damage code) are fine; do not paste book prose or
whole tables into this file.

**Judge against the design ethos.** From CLAUDE.md: *minimal guardrails, the GM is trusted,
no automation of outcomes, all stats manually editable.* A **missing automation is usually
not a defect**. What counts as a defect:

- a wrong number or a rule applied backwards
- a modifier that silently never reaches the roll
- a value the GM cannot override
- documentation that disagrees with the code

Rank by whether it produces a **wrong result at the table**, weighted by how often it comes
up in play.

**CLAUDE.md is intent, not truth.** Check it against the code. It is already known stale in
one place — it lists Full Defense as unimplemented when it is largely wired
(`SR3EActor.js` ~4131, `SR3EItem.js` ~1924).

**Don't re-report what tests already pin down.** `tests/` covers damage-code parsing and
staging (`damage-codes.test.mjs`), the initiative queue and tie-breaks (`initiative.test.mjs`),
skill bonus dice, targeting, and source books. Read the relevant suite before auditing a
dimension. If a test encodes a *wrong* rule, that is itself a finding.

## Findings

Newest first. Severity: `wrong-result` > `missing-rule` > `usability` > `cosmetic`.

### Resolved during setup

**Recoil survived the round boundary** — `wrong-result`, fixed in `802c99b`.
`nextTurn` reset recoil on a pass change, but that check sits after the early return into
`_newRound`, and `_newRound` did not reset it. `roundsFiredThisPhase` carried into the next
round, so every later shot took phantom recoil on its TN. A regression from the initiative
rework: previously `_newRoundSR3` called `endCombat()`, so the counter never survived a
round. Now reset at all three real phase boundaries — pass change, new round, end of combat.

*This one was found by the audit brief before the fan-out died, which is the reason to
finish the remaining five dimensions rather than assume the system is clean.*

---

*(no dimension audited yet — start with 1. Ranged combat)*
