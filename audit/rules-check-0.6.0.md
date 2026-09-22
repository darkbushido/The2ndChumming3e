# Rules check v0.6.0 — code vs `guides/`, PDFs as authority (TODO 121)

**Status: first pass, not exhaustive. Read this before trusting it as a release gate.**

This is the first TODO 121 rules-check record. Per CLAUDE.md this is meant to be a person
comparing the code's rules against `guides/`, with the PDFs in
`C:\Users\lance\Documents\Shadowrun 3rd Edition PDFs` as the authority, quoting every
difference with its printed page, and taking it to the maintainer rather than deciding it
alone. That is what this file is — Claude, working through it directly with the maintainer
(Lance) in the loop, not a script and not a rubber stamp.

**What was actually covered:** the three rule-bearing pages under `guides/rules/`
(`combat.md`, `grenades.md`, `reloading.md`) were read in full and cross-checked against the
game rules documented in the root `CLAUDE.md` (itself already PDF-cited for most of what it
claims), with three specific PDF page pulls to settle points that looked uncertain. That
surfaced three real divergences, below.

**What was NOT covered in this pass:** `guides/magic/*`, `guides/street/*`, `guides/hiring/*`
were not checked line-by-line against the PDFs this round. Nor was a systematic sweep of the
other ~19 non-core source books CLAUDE.md's *"Every version bump"* rule calls for — this pass
worked from the guides site's own scope (which is itself a curated subset, mostly core-book
rules) rather than the full library. That is real remaining work, not implied to be done.

---

## Finding 1 — Grenade blast damage is never success-staged · SR3 p.119

**The book (quoted, SR3 p.119, Core Rules):**

> "Compare the target's successes against those from the attacker's Success Test. If the
> attacker rolled more successes, the Damage Level of the blast increases one level for every
> two successes over the target's success total. If the target rolls more successes, the
> Damage Level of the blast is reduced one level for every two successes over the attacker's
> success total."

**The code:** per `CLAUDE.md`'s own AoE/grenade section — *"Per-target power = base −
distance... Damage is base power − distance, never success-staged (successes only tighten
scatter)."* Confirmed against `SR3EActor._postWaveCard`'s `state.isAoE` branch: the thrower's
Throwing/Launch successes are spent entirely on reducing scatter distance; the soak card each
caught target gets is a plain Power-minus-armour resistance test with no comparison against
the thrower's successes, and no staging up or down from that comparison.

**Divergence:** RAW stages grenade damage the same way a ranged or melee attack does — net
successes between attacker and defender shift the Damage Level up or down, one step per two
net successes. The system implements only the distance-based Power falloff and (for confined
spaces) the chunky salsa Power-combining rule; the entire success-staging half of the RAW
resolution is absent. This is not flagged anywhere in the root `CLAUDE.md` as a deliberate
🔴 divergence — it reads as a settled design choice that was never written down as one, or an
oversight. It also was not one of the five dimensions the existing `audit/combat-audit.md`
covered (ranged, damage/staging, melee, pools/defence, action economy) — grenades were never
audited as their own dimension there.

**Not decided here.** This is exactly the kind of divergence CLAUDE.md says becomes a bug fix
before release, once verified — and it is now verified. Whether to implement the staging
comparison, or to formally mark it 🔴 DIVERGES FROM RAW with a TODO if the simplification is
intentional (e.g. for AoE UX reasons — there's no single "defender" to compare against when
multiple targets are caught at different distances), is the maintainer's call.

---

## Finding 2 — Spellcasting's own Rule of One (+2 Drain TN) is not implemented · SR3 p.182

**The book (quoted, SR3 p.182, Core Rules):**

> "If there are no successes, the spell fails and there is no effect. If the results are all
> ones (see Rule Of One, p. 38), the spell fails and the target number for the Drain
> Resistance Test is increased by +2. Note any successes from this test."

**The code:** `SR3EActor.isRuleOfOne` computes the all-1s condition and the roll-wave payload
carries `glitch` for display, but nothing in the spellcasting flow (`state.isSpellRoll` branch
of `_postWaveCard`, or the `drainPayload` built there, or `_postDrainCard`) reads it. The
drain TN is built purely from `parseDrainFormula(drainStr, force, damageLevel)` plus
`sustainTN`; an all-1s Sorcery Test costs nothing extra on the Drain side.

**Divergence:** this is a specific, mechanical spellcasting rule — not the general "GM
adjudicates" Rule of One that the root `CLAUDE.md`'s dice-rolling section correctly documents
elsewhere (*"Its consequence is GM adjudication, not a mechanical penalty"*). p.182 carves out
its own numeric consequence for spellcasting specifically, on top of the general rule, and
it's missing. This one looks like a plain implementation gap rather than a deliberate
omission — nothing in the Spellcasting flow section of `CLAUDE.md` claims it's intentionally
left to the GM the way, say, the Sorcery limit is.

---

## Finding 3 — Spell Force cap ("cast no higher than you learned it") is not tracked or shown · SR3 p.178

**The book (quoted, SR3 p.178, Core Rules):**

> "Spellcasters learn spells at a specific Force. They can cast the spell at a lower Force, if
> desired, but can never cast the spell at a higher Force than they have learned. The minimum
> Force for any spell is 1. Characters who want to increase the Force of a spell must re-learn
> the spell."

**The code:** the spell item data model (`ItemDataModels.js`) has no field for the Force a
spell was learned at. The Cast dialog's Force input (`SR3EItem.js` ~line 4301) is
`min="1" max="99"` with no reference to any per-item ceiling — a spell can be cast at any
Force from 1 to 99 regardless of what the character actually knows.

**Divergence, with a caveat:** unlike Finding 2, this one plausibly fits the system's stated
design ethos — *"Minimal guardrails... all stats are manually editable"* — the same way
several other RAW caps are deliberately shown-not-enforced elsewhere (the Sorcery sustain
limit, karma specialisation caps before 0.4.5.7, etc.). But those other cases are explicitly
flagged with a ⚠ note saying so; this one has no field to even *display* the learned Force,
let alone a note that the cap isn't enforced. So at minimum this is undocumented; at most it's
a genuinely missing field a GM would want (to know what Force a player's spell was learned at,
for chargen/karma bookkeeping under *Learning Spells*, p.180, which is out of scope for this
pass).

---

## Recommendation

Findings 1 and 2 look like real bugs to me — both are clear, unambiguous printed rules with a
concrete, currently-absent mechanical effect, not judgment calls. Finding 3 is lower-confidence
and may be an intentional (if undocumented) design choice consistent with the rest of the
system's "minimal guardrails" philosophy — that one's more a documentation gap than a bug.

**RESOLVED 2026-09-22 — all three are fixed** (`4356d8a2`, on `main` as bug fixes per the
versioning rule). Each was re-verified against the PDF before anything changed, and each carries
its quote at the code site:

| Finding | Fix |
|---|---|
| 1 · grenade staging | the throw's successes now stage the blast's Damage **Level** (never its Power); CLAUDE.md's "never success-staged" line, which stated the wrong behaviour as settled, is corrected, and p.119's optional half-Power variant is named as deliberately not implemented |
| 2 · Sorcery Rule of One | `castGlitch` now reaches `_postDrainCard`, **+2 cumulative with sustaining**; the detection-spell "the gamemaster lies" half is recorded as the GM's, not modelled |
| 3 · learned Force | `SpellData.force` added (**nullable — null is "not recorded", which caps nothing**, because every shipped spell predates the field), recorded on the item sheet, and the cast dialog caps *and clamps on read* |

⚠ **Finding 3 was NOT a minimal-guardrails choice**, as this record allowed it might be. There was
no field at all, so the limit could not be shown, let alone applied. The maintainer's call was to
record the Force, allow casting lower, and cap the control.

`tests/guide-validation.test.mjs` pins all three with the quotes. It also caught a bug in the fix
itself before it shipped: `stageDamage` takes a **parsed** code, and the first attempt passed a
template string, which destructures to undefined and stages from nothing.

None of these were fixed at the time this record was written. Per CLAUDE.md this goes to the maintainer to decide whether
each becomes a bug fix (with its own version bump per the versioning rules) or gets a
documented, deliberate 🔴 DIVERGES FROM RAW marker with a TODO number.

## Coverage notes for the next pass

- `guides/magic/spellcasting.md` and `guides/magic/awakened-primer.md` were not checked this
  round — the two spellcasting findings above came from `guides/rules/combat.md`'s summary
  section and a direct PDF pull, not from those two pages. They should be read in full next.
- `guides/street/*` (SINs, gear & fencing, cyberware grades) and `guides/hiring/*` were not
  checked at all this round.
- The wider *"every version bump, check against sr3-guides"* rule in the root CLAUDE.md talks
  about checking the full 20+ book library, not just the guides site's curated ~9 rules pages.
  This pass only worked from what `guides/` itself covers.
