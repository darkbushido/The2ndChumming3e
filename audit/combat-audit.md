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
| 1 | Ranged combat | **done** — 1 defect (gel armour) | `rollWeapon` end to end: base TN and every modifier, range bands and measurement, recoil accumulation / compensation / heavy doubling, fire modes SS-SA-BF-FA, ammo effects, called shots, multi-target |
| 2 | Damage, staging, soak | **done** — no defects | `parseDamageCode` / `stageDamage`, soak card path, armour ballistic vs impact, APDS halving, flechette doubling, wound track, overflow, stun-to-physical |
| 3 | Melee combat | **done** — 1 defect (reach) | `rollMeleeAttack` / `_buildMeleePoolInfo` / `handleMeleeRoll`: opposed test, reach on both sides, defender weapon fallback, staging by net successes, ties, called shots |
| 4 | Pools and defence | **done** — 1 defect (pool refresh), 1 doc drift | Combat Pool derivation and wound mod, spend/track/refresh timing (SR3 refreshes per Combat Turn — check the boundary now rounds auto-advance), dodge commitment, Full Defense |
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

### 1. Ranged combat — recoil and fire modes (partial)

**No defects found in this part.** Verified against SR3 core, recoil table and the
burst/full-auto damage passages.

| Rule | Book | Code | Verdict |
|---|---|---|---|
| Burst fire recoil, +3 per burst in the phase | recoil table | `recoilForMode`, `(rounds + 3) - totalComp` — `SR3EItem.js:2208` | correct |
| Heavy weapons double uncompensated recoil | recoil table | `multForMode`, `SR3EItem.js:2201` | correct |
| Shotguns double it in burst only | SR3 p.111 | same, gated on `mode === 'BF'` | correct |
| Burst fire damage: Power +3 **and** Damage Level +1 | burst-fire section | `power += 3; lvlIdx + 1` — `SR3EItem.js:826` | correct |
| Full auto: Power +1 per round, Level +1 per 3 full rounds, cap Deadly | full-auto section | `power += rds; lvlIdx + floor(rds/3)`, `Math.min(3, …)` — `SR3EItem.js:829` | correct |
| Recoil counts rounds fired *before* this shot, so the first bullet incurs none | recoil rules | `roundsBefore`, `SR3EItem.js:2197` | correct |

The book's worked example — a four-round full-auto burst from an 8M assault rifle
producing 12S — reproduces exactly through `SR3EItem.js:829` (8+4 Power, M +1 stage).
That is a strong check: it exercises Power accumulation, level staging and the
rounds-to-stages division together.

Tracer handling is a deliberate deviation worth knowing about rather than a defect: with
tracer ammo the code adds `rds - floor(rds/3)` to Power instead of `rds`, on the reasoning
that tracer rounds raise Damage Level but not Power. That is a house interpretation — the
full-auto rule as written adds Power per round without excepting tracers. Left alone under
the minimal-guardrails ethos, but flagged since it silently changes a damage code.

### 1. Ranged combat — ammunition, called shots, multi-target

#### DEFECT: gel rounds soak against Ballistic armour instead of Impact — `wrong-result`

`SR3EActor.js:3931` picks the armour rating with
`const defaultArmor = isMelee ? impact : ballistic;`
A gel round is a ranged attack, so `isMelee` is false and the target soaks with **Ballistic**.
The rulebook's gel-round entry is explicit that Impact armour applies rather than Ballistic,
alongside the Power −2 and the switch to Stun.

Ballistic is usually the higher of the two on armour, so the target soaks better than it
should and gel rounds land softer than the rules intend — quietly, with nothing on the card
indicating the wrong track was used.

`config.js:786` has `gel: { powerMod: -2, isStun: true }` — the Power and Stun halves are
right; there is no `armorEffect` for gel, and nothing anywhere else switches the rating
(only `apds` and `flechette` are handled, `SR3EActor.js:3913`).

Mitigating: the soak card's armour dropdown is editable, so a GM who knows the rule can
switch it. That makes this less severe than a hard miscalculation, but the default is wrong
and silent, which is the failure mode this audit is looking for.

**Fix shape:** give gel an `armorEffect: 'gel'` in config and branch on it where APDS and
flechette already are, so the choice is expressed in one place with the other ammo rules.

#### Verified correct

| Rule | Book | Code | Verdict |
|---|---|---|---|
| Called shot, +4 TN | modifiers table | `_promptWeaponRollOptions` called-shot handling | correct |
| APDS halves Ballistic, rounding down | APDS entry | `Math.floor(ballistic / 2)` — `SR3EActor.js:3914` | correct |
| Flechette: raises level unarmoured, doubles effective armour otherwise | flechette entry | `SR3EActor.js:3917-3930` | correct in shape |
| Explosive +1 Power, EX Explosive +2 | ammo entries | `config.js` ammoTypes | correct |
| Gel: Power −2 and Stun | gel entry | `config.js:786` | correct (armour is the broken part) |

#### Observed, not a defect

**Multiple targets (+2 per additional target in the phase)** is surfaced as a note in the
fire dialog rather than folded into the TN — the dialog shows "+recoil + multi-target (see
below)" (`SR3EItem.js:2233`). Under the minimal-guardrails ethos this is a legitimate
choice: the GM applies it to the editable TN. Recorded so it is not mistaken for an
oversight later.

**Range bands** are covered by `tests/damage-codes.test.mjs` (band classification and the
beyond-Extreme flag) and were re-verified there rather than re-audited here.

### 2. Damage, staging and soak (partial)

**No defects found in this part**, beyond the gel-armour issue already recorded above —
which lives in this same code path and is the reason to read the two sections together.

| Rule | Code | Verdict |
|---|---|---|
| Soak target number = Power − armour, floor of 2 | `Math.max(2, stagedPower - defaultArmor)` — `SR3EActor.js:3934` | correct |
| Two soak successes stage the damage down one level | `Math.floor(successes / 2)` — `SR3EActor.js:3251` | correct |
| Wound modifiers from the stun and physical tracks are cumulative | `-(_trackMod(stun) + _trackMod(phys))` — `SR3EActor.js:64` | correct |
| Wound modifier tiers: +1 Light, +2 Moderate, +3 Serious | `_trackMod`: `>=6 ? 3 : >=3 ? 2 : >=1 ? 1 : 0` | correct for the reachable range |

`stimBonus` offsets the wound modifier but is clamped with `Math.min(0, …)`, so stimulants
can cancel a penalty and never become a bonus. That is the right shape.

#### Observed, defensible: no Deadly (+4) wound tier

`_trackMod` tops out at +3 for six or more boxes, so the +4 associated with a full track is
never produced. In practice a filled condition monitor incapacitates the character — the
`updateActor` hook in `sr3e.js` sets `defeated` and the unconscious or dead overlay — so an
actor who would qualify for +4 is not rolling anything. The missing tier therefore has no
reachable effect. Recorded because the omission looks like an oversight when reading
`_trackMod` in isolation, and because it would become a real defect if the incapacitation
rule were ever relaxed.

### 2. Damage — overflow, cascade and write-back

**No defects.** The overflow chain is implemented and matches the rules.

| Rule | Code | Verdict |
|---|---|---|
| Stun damage beyond a full stun track cascades into physical | `SR3EActorSheet.js:3005-3010` | correct |
| Physical damage beyond a full physical track goes to overflow | `SR3EActorSheet.js:3013-3015` | correct |
| Cascaded stun that also fills physical continues into overflow | same block, `spill` recomputed between the two steps | correct |
| Death when the physical track is full and overflow reaches Body | `sr3e.js:1877`, mirrored for display at `SR3EActorSheet.js:505` | correct |

The `spill` variable is recomputed between the stun-to-physical step and the overflow step,
so a single large stun hit can traverse all three stages in one application. That is the
case most implementations get wrong.

Overflow is also directly editable on the sheet (`SR3EActorSheet.js:535`), and damage is
applied by the GM through the wound-track controls rather than automatically — both
consistent with the design ethos, so neither is a defect.

#### Structural note: the cascade lives in the sheet, not the document

The stun-to-physical and overflow logic sits in the actor **sheet**'s wound-box handler.
Any future code path that writes `system.wounds.*` without going through that handler will
skip the cascade — damage would stop at a full track instead of spilling. Nothing does that
today, and with manual application it may never matter. Worth knowing before any automated
damage application is added, at which point this logic should move onto `SR3EActor`.

**Dimension 2 complete.**

### 3. Melee combat

#### DEFECT: reach is applied as an absolute bonus to both sides, not as a differential — `wrong-result`

`SR3EItem.js:235-236` builds the two target numbers as:

```js
atkTN: Math.max(2, 4 - atkReach + …)
defTN: Math.max(2, 4 - defReach + …)
```

Each combatant subtracts their **own** Reach rating from their **own** target number,
independently and simultaneously.

The rule is a *differential*: take the difference between the two Reach ratings, and only
the fighter with the longer reach applies it — as either a bonus to their own test or a
penalty to the opponent's, at that fighter's choice. One benefit, to one side, sized by the
gap.

**When it goes wrong:** whenever both combatants have non-zero reach.

- Sword (reach 1) vs staff (reach 2). Rules: difference 1, staff wielder alone benefits.
  Code: sword TN 3, staff TN 2 — both improved.
- Two staffs (reach 2 each). Rules: difference 0, nobody benefits, both roll against 4.
  Code: **both roll against 2** — dramatically easier for both sides.

The differential between the two TNs happens to come out right, which is why this survives
casual play. What is wrong is the absolute level: both sides hit far more often than they
should, so armed melee is markedly bloodier than the rules intend, and the error grows with
the reach of the weapons involved.

It is only correct by accident in the common case of an armed fighter against an unarmed
one, because unarmed reach is 0 — which is likely why it has not been noticed.

Also unimplemented: the rules give the longer-reach fighter a *choice* of where to apply
the modifier. The code has no such prompt.

**Fix shape:** compute `diff = atkReach - defReach` once; apply `-diff` to the longer-reach
side's TN (or `+diff` to the other side's, if the choice is offered), and leave the shorter-
reach side at the base 4. Both TNs are already editable on the boxing card, so a GM can
correct it by hand today — but as with the gel finding, the default is silently wrong.

#### Verified correct

| Rule | Code | Verdict |
|---|---|---|
| Opposed test: both sides roll, most successes wins | `SR3EActor.js:3700` | correct |
| A tie deals no damage | `SR3EActor.js:3696` | correct |
| Winner's own weapon damage code is used | `SR3EActor.js:3707-3708` | correct |
| Damage stages up by **net** successes | `net`, `SR3EActor.js:3713` | correct |
| Minimum target number of 2 | `Math.max(2, …)` on both TNs | correct |
| Either side may default, each prompted separately | `_applyMeleeDefault`, `SR3EItem.js:199` | correct |
| Called-shot modifier folds into the attacker's TN only | `calledShot.tnMod` in `atkTN` | correct |

**Dimension 3 complete.**

### 4. Pools and defence

#### DEFECT: dice pools never refresh between rounds — `wrong-result`, highest severity so far

The rulebook is explicit that a pool refreshes at the beginning of the next Combat Turn.
`refreshCombatPool` is called from exactly **one** place in the system:
`SR3ECombat.js:394`, inside `endCombat`. `_newRound` does not refresh anything.

So Combat Pool spent in round 1 stays spent for the rest of the fight. A character who
commits five dice to a dodge in the first round fights rounds two, three and four without
them, and only gets them back when the encounter ends.

**This is a regression from the initiative rework, and the same shape as the recoil bug.**
Before that change every completed round called `endCombat()`, which refreshed the pools —
so the correct behaviour was happening for the wrong reason. Making rounds continue removed
the only thing that was refreshing them. Recoil was the visible half of this; the pools are
the half that was missed.

Severity is higher than the earlier findings because there is no editable field standing
between the player and the wrong number. Gel armour and melee reach both land in a box a GM
can override; an exhausted Combat Pool simply is not there, and the effect compounds every
round — combat gets progressively and silently more lethal the longer it runs.

Affects Combat Pool, and by the same route Spell Pool, Astral Pool and Hacking Pool: all
four are refreshed together in that one `endCombat` block, and nowhere else.

**Fix shape:** refresh in `_newRound`, alongside the `resetRecoil` loop that is already
there for exactly this reason. `endCombat` should keep its own refresh — that one is about
leaving the actor clean after the fight, not about turn structure. Worth checking whether
the GM prompt currently attached to the `endCombat` refresh should appear at round
boundaries too, or whether per-round refresh should simply be automatic (RAW says it is).

#### Verified correct

| Rule | Code | Verdict |
|---|---|---|
| Combat Pool = (Quickness + Intelligence + Willpower) / 2, rounded down | `SR3EActor.js` ~1722 | correct |
| Available pool = derived total minus spent, floored at 0 | `Math.max(0, combatPool - combatPoolSpent)` | correct |
| Spending accumulates rather than overwriting | `SR3EActor.js:4080` | correct |
| Wound modifier reduces the pool | folded via `woundMod` in the derivation | correct |

#### CLAUDE.md drift: Full Defense is documented as unimplemented

CLAUDE.md's "What is NOT yet implemented" lists Full Defense as deferred. It is largely
wired: data model fields (`fullDefense`, `fullDefensePool`), a toggle at
`SR3EActor.js:4131`, consumption in the dodge path at `SR3EItem.js:1924`, and a clear on
combat end at `SR3ECombat.js:396`. The documentation should be corrected; whether the
implementation is *complete* against the rules was not established here and is worth its
own pass.

**Dimension 4 complete.**

---
