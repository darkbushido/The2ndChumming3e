# Rules check v0.6.0 — code vs `guides/`, PDFs as authority (TODO 121)

**Status: second pass, still not exhaustive. Read this before trusting it as a release gate.**

This is the TODO 121 rules-check record. Per CLAUDE.md this is meant to be a person
comparing the code's rules against `guides/`, with the PDFs in
`C:\Users\lance\Documents\Shadowrun 3rd Edition PDFs` as the authority, quoting every
difference with its printed page, and taking it to the maintainer rather than deciding it
alone. That is what this file is — Claude, working through it directly with the maintainer
(Lance) in the loop, not a script and not a rubber stamp.

**Pass 1** covered the three rule-bearing pages under `guides/rules/` (`combat.md`,
`grenades.md`, `reloading.md`), found Findings 1-3 below, and all three were fixed the same
day (`4356d8a2`). **Pass 2** read `guides/magic/spellcasting.md` in full against SR3 pp.178-183
and found Finding 4. **Pass 3** spot-checked the Astral combat section of
`guides/magic/awakened-primer.md` against the code's own astral-combat and astral-soak
functions and found Finding 5 — the rest of that page (spellcasting summary, conjuring, ritual
sorcery, foci, astral perception/projection, and the world-lore section) was read but not
cross-checked line-by-line the way the Astral combat section was.

**What was NOT covered yet:** `guides/street/*`, `guides/hiring/*` were not checked at all. Nor
was a systematic sweep of the other ~19 non-core source books CLAUDE.md's *"Every version
bump"* rule calls for — this has worked from the guides site's own scope (itself a curated
subset, mostly core-book rules) rather than the full library. That is real remaining work, not
implied to be done.

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

---

## Finding 4 — Elemental Manipulation spells are cast through the wrong resolution path entirely · SR3 p.183, p.196

**The book (quoted, SR3 p.183, Core Rules):**

> "Elemental Manipulation Spells: Elemental spells are treated like normal ranged attacks (see
> p. 109) using Sorcery as the Ranged Combat Skill. Spell Pool dice may be added as normal.
> They have a base Target Number of 4, regardless of range, as long as the caster can see the
> target. Cover, visibility, injury and sustaining modifiers apply. **These spells can be
> dodged** (see p. 113)."
>
> "...For elemental spells, the Resistance Test is actually a **Damage Resistance Test**, as
> described under Ranged Combat (see p. 109). **The Combat Pool may be used to resist elemental
> spells.**"
>
> "...Elemental spells, unless completely dodged, strike their target. The Damage Level is
> staged up by every 2 successes the caster made on the Ranged Combat Test. The target stages
> down with a Damage Resistance Test... Even if the damage is staged down to nothing, the
> spell's secondary effect may cause harm (see Elemental Manipulations, p. 196)."

SR3 splits damaging spells into two mechanically distinct families: **Combat spells**
(Manabolt, Powerbolt, Stunbolt and their Ball versions — direct-effect, bypass armor, resisted
by a plain Spell Resistance Test, never dodged) and **Elemental Manipulation spells** (Fireball,
Lightning Bolt, Ball Lightning, Acid Stream, and others — real fire/lightning/acid that follows
the *ranged combat* rules: dodgeable, resisted with Body + Combat Pool as a Damage Resistance
Test, and Impact armor protects at half rating rounded down, p.196).

**The code:** every damaging spell — combat or elemental — goes through one path
(`SR3EItem.js`'s cast flow → `SR3EActor._postWaveCard`'s `state.isSpellRoll` branch →
`_postSpellSoakCard` → `handleSpellResistRoll`), which is built for the Combat-spell case only:

- **No dodge is ever offered for a spell.** `_postWaveCard`'s spellcasting comment states this
  as the rule for spells in general (*"no dodge — combat spells are resisted, not dodged"*),
  which is correct for Manabolt/Powerbolt/Stunbolt but wrong for the elemental family, which
  RAW explicitly allows to be dodged.
- **Resistance never reads Body + Combat Pool, and armor is never consulted.** The target
  resists with whatever `SR3EItem._parseSpellTarget` resolves from the spell's `target` field,
  attribute-only, no pool — the Combat-spell rule (p.183, "Spell Resistance Test"), not the
  elemental one (p.183, "the Resistance Test is actually a Damage Resistance Test").
- **The Damage Level dropdown at cast time is gated on `category === 'Combat'`**
  (`SR3EItem.js` ~line 4275: `const isCombat = (this.system.category ?? '') === 'Combat'`).
  Checked against the shipped packs: Fireball, Acid Stream, Ball Lightning and Lightning Bolt
  (`packs-src/sr3e-sr3-spells/`) all store `category: 'Elemental'`, not `'Combat'` — so
  `isCombat` is `false` for every one of them, the dropdown never renders, and
  `_parseSpellDamageLevel(this.system.damage)` silently defaults to **`'M'` (Moderate)** because
  their `damage` field is empty (`''`) on every one checked. **A caster cannot choose the
  Damage Level of a Fireball at all — it is hardcoded to Moderate on every cast**, contradicting
  Step 1 of the spellcasting sequence (*"Damage Level, for combat **and elemental** spells...
  You choose L, M, S or D when you cast"*, p.191, carried in the guide's own Step 1 table).
- **The cast TN is, by accident, correct.** Every elemental spell's `target` field is stored as
  `4(RC)`, and `_parseSpellTarget` strips the `(RC)` suffix and reads the bare `4` as a fixed
  numeric TN — which happens to match RAW's *"base Target Number of 4, regardless of range"*.
  But the same numeric-target branch also sets `resistAttr: 'willpower'` as a fallback (there is
  no attribute letter to parse out of `"4"`), so the target resists with **Willpower**, not
  **Body + Combat Pool** as RAW requires for this spell family, regardless of the spell's own
  `type: 'Physical'`.

**Scope:** 19 documents across the packs carry `category: 'Elemental'`; a quick check of four
(Fireball, Acid Stream, Ball Lightning, Lightning Bolt) all show the identical shape
(`target: '4(RC)'`, `damage: ''`), so this is very likely systemic to the whole family, not a
one-off. Not checked: whether any elemental spell stores a non-empty `damage` field that would
partially route around the hardcoded-Moderate issue, or whether all 19 documents are genuinely
spells (a couple of the matches were NPC contact entries mentioning "elemental" in prose, not
spell items, and weren't followed up).

**Not decided here.** This reads as a real implementation gap — elemental spells were folded
into the ordinary spell-resist path without the p.183 special case for their whole family — but
it's a bigger piece of work than Findings 1-3 (a dodge step, a Combat-Pool-and-armor resistance
branch, and fixing the category gate all need to agree on which spells route where) and belongs
to the maintainer to scope and version appropriately, not to be patched inline here.

**RESOLVED 2026-09-22 — fixed on `main` as a bug fix** (the maintainer: *"ok do it"*). Re-verified
against the PDF first: SR3 p.183's three elemental sub-rules and p.196's half Impact and *"The caster
chooses the spell's Base Damage Level"* read exactly as quoted above. The scope question resolved to
**17** elemental spells: `sr3` 6 · `mits` 6 · `tss` 3 · `twl` 2, every one with `damage: ''`, plus the
Laser on the Artificer/Enchanter contact.

| Part | Fix |
|---|---|
| Damage Level | `SR3EItem.spellChoosesDamageLevel` — Combat **or Elemental**; the drain level follows it |
| Dodge | `_spellResistButton` posts the ranged `.sr-dodge-declare-btn` for an elemental spell, staged by the caster's successes (ranged rule, Deadly caps). Both places that post spell buttons go through it, so counterspelling still comes off first |
| Resistance | the ordinary soak card — Body + Combat Pool, carried dodge successes |
| Armour | `SR3EActor.elementalImpact`: **Impact at half, rounded down**, never Ballistic |
| Secondary effects | stated on the cast card (none at Light, +4 / +2 / +0 Object Resistance), never applied |

**Maintainer's rulings, 2026-09-22:**
- **An area elemental spell is dodged by every target in it.** MITS p.56: *"Area spells affect all
  targets within the radius of the spell's effect"*. SR3 p.182's *"in the same way as a physical
  explosion or grenade"* is read as being about **who is caught** — the next sentences are *"Targets
  with complete visual cover can still be affected. Targets hidden behind a wall within the radius of
  a Fireball spell will still get cooked"* — not as removing p.183's *"These spells can be dodged."*
- **Mystic Armor is halved with worn Impact** — p.170 makes it Impact armour, cumulative with worn.

**Found while checking:** no book in the library works a Fireball's dodge or soak through. The one
worked Fireball **Drain** is MITS p.87 (*"Force 4 and base Moderate Damage, for a Drain of 3D"*; 4D
at a surged Force 7), now asserted against the shipped `+1(DL+2)`. The Quick Start Rules' Lightning Bolt
(p.34: *"Target Number: Target's Body"*, *"Armor is ineffective"*, a fixed 4S) is a simplified
introduction that contradicts the core book, and was **not** followed.

**Left over — TODO [131](../TODO.md#131):** p.183's *"Cover, visibility … modifiers apply"*. Injury and
sustaining already reach the cast through `rollPool`; cover and visibility need the GM's TN window
on an elemental cast.

`tests/elemental-spells.test.mjs` pins it (39 assertions) and four mutants are killed. **Live-tested**
in `test-shadowrun`: a Force 6 Flamethrower cast at Serious by a temporary mage (deleted afterwards)
against Windage (armour 5/3): 3 hits staged 6S → 6D, the dodge-or-take-it choice appeared, a 2-die dodge
failed and carried 1 hit, and the soak card showed TN **5** (6 − ⌊3 ÷ 2⌋) on Impact. 5 soak + 1 dodge
= 6 hits, which staged it down to 6L.

---

## Finding 5 — Mystic Armor never applies to astral combat, despite the code's own comment quoting the rule that it should · SR3 p.170

**The book (quoted — already present in the codebase's own comment at
`SR3EActor.js:8230-8232`, sourced to SR3 p.170):**

> "Each level provides you with 1 point of Impact Armor, cumulative with any worn Impact
> Armor. Mystic Armor does not provide Ballistic Armor. **Mystic Armor also protects against
> damage done in astral combat.**"

**The code:** `mysticArmor` (`this.system.derived?.mysticArmor`) is added to `impact` inside
`_postSoakCard` (the ordinary ranged/melee soak path, `SR3EActor.js` ~line 8242) — but
**astral combat has its own, separate soak function, `_postAstralSoakCard`**
(`SR3EActor.js` ~line 8571), and it computes its TN as:

```js
const soakTN = Math.max(2, stagedPower ?? winnerCha);
```

No armor of any kind is read there — not worn armor (correctly, since *"worn armor is useless"*
on the astral per `guides/magic/awakened-primer.md` and p.172/175), but also not Mystic Armor,
which the book explicitly carves out as the one exception. The astral resist box is labelled
*"Willpower / Astral Body"* with no armor line at all.

**Divergence:** an adept who bought Mystic Armor gets its Impact bonus in every soak *except*
the one place the book calls it out by name. This isn't a case of missing PDF verification —
the quote proving it's wrong is already sitting in the file, four lines above a different
function that never gets called from the astral path. Grepping for `mysticArmor` in
`SR3EActor.js` turns up exactly one consumer (`_postSoakCard`); `_postAstralSoakCard` never
references it.

**Not decided here**, per the same process as the others, but this one needs less verification
work than most — the citation is already committed. Likely a one-line fix (add
`mysticArmor` to the astral TN calculation the same way `_postSoakCard` does), but that's the
maintainer's to make, not mine to slip in as part of an audit.

**RESOLVED 2026-09-22 — fixed on `main` as a bug fix** (the maintainer: *"fix finding 5 as well"*).
Re-verified against the PDF: p.170 as quoted, plus two passages that settle *how* it applies:

> "natural armor--like that of a troll, or an adept with the Mystic Armor power--helps protect you."
> — SR3 p.172
>
> "Dual beings with natural physical armor gain the benefits of their armor in astral combat; the
> Power of the attack is reduced by the target's natural armor. Physical armor worn by a character
> has no effect in astral combat." — SR3 p.175

`SR3EActor.astralSoakTN({ power, mysticArmor })` = Power − Mystic Armor, floored at 2, and the astral
soak card names it. A troll's natural armour is **not** a second deduction: SR3's troll Dermal Armor is
*"+1 Body"* (p.56), already in the attribute. `tests/astral-soak.test.mjs` (7 assertions) and the mutant
`mystic-armor-left-out-of-astral` pin it. **Live-tested**: an adept with the shipped Mystic Armor at
level 2, hit by an astral 5M, got TN **3**. (The first live attempt derived 0 because the test actor
lacked `magicType: 'Adept'`, which the adept-power loop requires — setup, not a bug.)

**Noticed, not fixed — TODO [132](../TODO.md#132):** the same p.175 sentence begins *"The Damage
Resistance Test is resolved using Willpower or Force for astral beings, or **Body for dual beings**"*,
and p.174 counts *"Astrally perceiving characters and other dual beings"* together. The astral soak card
always offers Willpower. Brought to the maintainer rather than decided here.

---

## Coverage notes for the next pass

- `guides/magic/awakened-primer.md`: only its Astral combat section was cross-checked (Pass 3,
  Finding 5). The rest — spellcasting summary, conjuring, ritual sorcery, foci, astral
  perception/projection, world lore — was read, not checked line by line.
- `guides/street/*` (SINs, gear & fencing, cyberware grades) and `guides/hiring/*` were not
  checked at all in any pass.
- The wider *"every version bump, check against sr3-guides"* rule in the root CLAUDE.md talks
  about checking the full 20+ book library, not just the guides site's curated ~9 rules pages.
  This has only worked from what `guides/` itself covers.
