# Adept powers audit — SR3 rules vs implementation

Companion to `audit/combat-audit.md`, same principle: **this file is the finding**, not a cache.

Audited 2026-08-29 on branch `adept-powers-audit`, against the packs and code at `3f23908`.
Every claim below was checked against the shipped pack data, the source in `scripts/`, and the
printed rules — citations are to the **book page**, not the PDF page.

## Sources

| Book | Code | Powers shipped | Text |
|---|---|---:|---|
| Shadowrun, Third Edition | `sr3` | 42 | p.168–171 |
| Magic in the Shadows | `mits` | 26 | p.149–151 |
| State of the Art 2064 | `sota2` | 40 | p.64–68 |
| The Shadowrun Supplemental (fan) | `tss` | 9 | *off by default* |
| | | **117** | |

> **STATUS 2026-08-31 — ALL of 59-70 are FIXED, and so is Missile Parry (TODO 77).**
> The two powers this audit filed as "correctly inert" but flagged for a second look have
> both been resolved: **Missile Parry** is implemented, and **Quick Strike** is documented as
> TODO 78 with the reason it cannot be an initiative bonus. Nothing else in the 117 is
> outstanding.
>
> **STATUS 2026-08-30 — ALL of 59-70 are FIXED.** The findings below are preserved exactly as
> written, because they are the record of what was wrong and why; `TODO.md` carries what each
> fix actually did. Two things the audit did not know, both found while implementing:
>
> - **A levelled power's `bonus*` is per level and was never multiplied**, so Improved Physical
>   Attribute 3 would have granted +1 the moment the data landed.
> - **Nineteen powers carry their level in the NAME** with `hasLevels: false` — `Combat Sense
>   +3`, `Kinesics Level 3` — so every one of them resolved as level 1. `adeptPowerLevel`
>   exists for that, and only for effects: Power Point cost still reads `system.level`.

## The headline

> **117 adept powers ship. Not one of them does anything.**

Every power in every pack has all nine `bonus*` fields at `0` and `improvedSkillName` empty.
Verified by iterating the four LevelDB packs directly:

```
powers=117  with a mods string=14  with ANY bonus field set=0  with improvedSkillName set=0
```

The runtime channels exist and are correct — `SR3EActor._prepareCharacter` reads
`bonusBod/Qui/Str/Cha/Int/Wil/Mag/Rea/InitDice`, `improvedSkillName` and
`improvedSkillCategory` off every `adeptpower` item (`SR3EActor.js:1673-1695`), gated on
`magicType === 'Adept'`. **The data never arrives.** An adept sheet is a list of names and
Power Point costs.

### Why the data never arrives — two independent breaks

**1. The generator never reads the adept file.** `tools/build-mods-bonuses.mjs:35` declares its
inputs as exactly:

```js
const FILES = { 'Cyberware.json': 'cyberware', 'Bioware.json': 'bioware' };
```

Upstream ships `AdeptPowers.json` alongside those two. It is not listed, so
`scripts/data/srcg-bonuses.js` — 142 items — contains no adept power, and
`tools/patch-pack-bonuses.mjs` has nothing to write into the adept packs. This is a gap in
TODO 8, not a decision: nothing in the tool or its comments says adept powers were considered
and excluded.

**2. `mods` is dropped at load anyway.** 14 powers *do* carry an upstream `mods` string, and 10
of them parse cleanly through `SR3EMods.parseMods` into bonuses the runtime would apply:

| Power | `mods` | parses to |
|---|---|---|
| Imp. Reflexes Level 1 / 2 / 3 | `+2RCT,+1INI` … | `bonusRea` 2/4/6, `bonusInitDice` 1/2/3 |
| Imp. Physical Attr. (BOD/QCK/STR) | `+1BOD` etc. | `bonusBod` / `bonusQui` / `bonusStr` = 1 |
| …&gt;RACMOD variants ×3 | `+1RBOD` etc. | same (racial prefix collapsed) |
| Combat Sense +1 / +2 / +3 | `+1CPL` … | **unmapped** — no Combat Pool field exists |
| Mystic Armor* | `+1IMP` | **unmapped** — no impact-armour field exists |
| Magical Power(Path:Magician)* | `+1MAG` | **unmapped** — `MAG` is not in the attribute map |

But `AdeptPowerData` (`scripts/data/ItemDataModels.js:376`) declares **no `mods` field** — only
`CyberwareData` and `BiowareData` do (`:245`, `:296`). A TypeDataModel drops keys it does not
declare, so the string is discarded the moment Foundry loads the item. Even a hand-patched pack
would lose it.

⚠ **`+1MAG` being unmapped is correct and should stay that way.** `SR3EMods.js` deliberately
excludes `MAG`; Magical Power (MITS p.22) grants a magician's *path*, not a Magic attribute
point, and writing `bonusMag` would inflate Spell Pool and effective Magic.

## What IS implemented

Short list, and worth stating plainly so the audit is not read as "nothing works".

| Rule | Where | Verdict |
|---|---|---|
| **Power Points = Magic Attribute**, spend tracked and warned when over | `SR3EActorSheet.js:2283-2308` | ✅ correct. Uses `magic.value` (effective), which is right — *"An adept who loses Magic also loses a corresponding amount of powers"* (p.168). Warn-only, per the project ethos. |
| Levelled powers cost `powerCost × level` | `SR3EActorSheet.js:2284` | ✅ correct |
| Bonuses apply only to actual adepts | `SR3EActor.js:1615`, `:1675` | ✅ correct — `isAdept` gate |
| Shipped Power Point **costs** | all 42 SR3 entries | ✅ every one matches the book, including the Killing Hands .5/1/2/4 ladder, Improved Reflexes 2/3/5, Combat Sense 1/2/3 |
| Improved Ability → dice on a named skill | `SR3EActor.js:1691`, consumed at `SR3EItem.js:363` | ⚠ channel correct, **uncapped** — see 60 |
| Improved Physical Attribute → attribute | `SR3EActor.js:1700-1704` | ⚠ channel correct, **no data** |

**Nothing else.** Grepping every power name across `scripts/` returns only two hits outside the
populate macros, and both are false positives: "Pain Resistance" appears as tooltip text in the
Escape Artist dialog (`sr3e.js:1210`), and "Blind Fighting" is a *martial-arts maneuver* in
`config.js`, unrelated to the MITS power of the same name.

## Rules that are implemented incorrectly

Each of these is a live defect, not a gap. Numbered to match the TODO entries.

### 60 · Improved Ability has no cap · *SR3 p.169*

> "You cannot have more additional dice than your base skill rating or your Magic Attribute,
> whichever is less. For example, an adept with Pistols 4 and Magic 5 cannot have more than 4
> Improved Ability (Pistols) dice."

`SR3EActor.js:1691` adds the power's level with no clamp of any kind:

```js
_addSkillDice(s.improvedSkillName, s.hasLevels ? (s.level ?? 1) : 1, …);
```

**This one is already reaching the table.** It is how a character with Improved Ability at a
level above their skill rating rolls dice the rules forbid.

### 61 · Defaulting to an improved skill gives the wrong number, twice · *SR3 p.169*

> "If you are defaulting to the improved skill, only half (round down) of the Improved Ability
> dice may be used."

Two paths, neither right:

- `SR3EItem.defaultTiers` (`:525-556`) builds every tier from `s.system.rating` alone. The SR3
  Default Table's **Skill** tier is exactly the book's "defaulting to the improved skill", and
  it contributes **no** Improved Ability dice at all — not half, none.
- `SR3EItem.js:410` — `const bonusDice = isDefault ? 0 : …`. This path is *attribute*-defaulting,
  where 0 is defensible, but it hard-codes the answer rather than expressing the rule.

### 62 · Improved Ability's category channel is not RAW · *SR3 p.169*

`SR3EActor.js:1693` reads `improvedSkillCategory` off adept powers and feeds the opt-in category
bonus. For Improved Ability that is a misreading with a very plausible cause: the powers ship
named `Imp Abl Combat Skl*->` and `Imp Abl Phys Skl*->`, which reads like a scope. It is not —
the book's **Improved Ability Costs Table** uses the category only to set *cost per die*
(Physical .25, Combat .5), and the power itself applies to *"a specific Active Skill"*. The
trailing `->` is the upstream generator's marker for "name the skill here".

So `Imp Abl Combat Skl` set to category `Combat skills` would grant dice across every combat
skill for half a Power Point. The channel is fine for genuinely category-wide powers (Kinesics,
Nimble Fingers); it must not be used for Improved Ability.

### 63 · Attribute Boost is a permanent attribute bonus, or nothing · *SR3 p.168–169*

The power is four stages and **none exist**:

1. **Activate** — Magic Test, TN = ½ the *base (unaugmented)* rating, round up. No successes, no boost.
2. **Effect** — attribute +level. Capped at 2× Racial Modified Limit.
3. **Duration** — Combat Turns equal to the successes.
4. **Expiry** — a **Drain Resistance Test**: TN = ½ the *boosted* value (round up), Willpower
   dice, every 2 successes drops the Drain Level one, damage is **Stun**. Level from the
   Attribute Boost Drain Table (≤ Racial Modified Limit → L; up to Racial Maximum → M; up to 2×
   Racial Modified Limit → S).

> "Attribute Boost is not compatible with any artificial (cyberware) enhancements, nor
> spell-based increases. It is compatible with the Improved Physical Attribute power."

⚠ **The only channel available today is the wrong one.** Filling `bonusStr` would make the boost
**permanent and always-on** — no test, no duration, no drain, and stacking with the cyberware it
is expressly incompatible with. That is worse than leaving it inert, and it is what a naive fix
for 59 would do. Found in play: an actor carrying `Attribute Boost(STR)*` with
`improvedSkillName` hand-set was contributing **+4 dice to Unarmed Combat** — the wrong channel
entirely, since Attribute Boost grants no skill dice under any reading.

### 64 · Improved Reflexes stacks with wired reflexes · *SR3 p.169*

> "The maximum level of Improved Reflexes is 3, and the increase **cannot be combined with
> technological or other magical increases** to Reaction or Initiative."

Both derivations sum the two sources unconditionally:

- `SR3EActor.js:1733-1734` — `… + adeptBonus.rea + cyberBonus.rea`
- `SR3EActor.js:1830` — `1 + … + cyberBonus.initDice + adeptBonus.initDice`

**Latent today** (no adept data), **live the moment 59 lands** — which is the argument for fixing
them together. The max-level-3 cap is also unenforced.

### 65 · No power may exceed Magic in levels · *SR3 p.168*

> "An adept cannot have more levels in a power than the adept's Magic Attribute."

The sheet checks the **total** Power Point spend against Magic and flags it red, but never the
**per-power level**. Magic 4 with Improved Ability 6 passes silently if the points fit.

### 66 · Combat Sense contributes nothing · *SR3 p.169*

Two effects, both missing. Combat Pool is derived at `SR3EActor.js:1787` as
`combatPoolBase + (sys.combatPoolMod ?? 0)` — no adept term, and no `bonusCombatPool` field
exists for `+1CPL` to map to. The second effect — spending ¼ / ½ / all of Combat Pool on the
**Reaction Test in surprise situations** (p.109) — has no hook either.

### 67 · Killing Hands never changes a punch · *SR3 p.170*

`SR3EItem._unarmedWeapon()` returns `(STR)M Stun` unconditionally. Killing Hands should offer,
**declared with the attack**, physical damage at the purchased level (L/M/S/D) — and it bypasses
Immunity to Normal Weapons, and works in astral combat when the adept is astrally perceiving.

### 68 · Mystic Armor adds no armour · *SR3 p.170*

Each level is 1 point of **Impact** armour, cumulative with worn impact, and it *"also protects
against damage done in astral combat"*. The soak card reads `impact` off the equipped armour item
only; astral combat has no armour term at all.

### 69 · Pain Resistance does not reduce injury modifiers · *SR3 p.170*

> "Subtract your level of Pain Resistance from your current damage before determining your injury
> modifiers."

`sys.woundMod` is derived from the raw wound tracks with no adept offset. The second clause —
level subtracted from target numbers to resist pain, torture, disease — has no hook, which is
fine (GM-adjudicated), but the wound-modifier offset is arithmetic the system already does.

### 70 · The long tail: dice-granting powers with no test to attach to

Powers whose whole rule is "+N dice to test X", where X is a test the system models or could.
None are wired. Grouped because they share one shape and one fix:

| Power | Book | Adds dice to |
|---|---|---|
| Body Control | SR3 p.169 | Resistance Tests vs toxins/disease |
| Enhanced Perception | SR3 p.169 | Perception Tests — ⚠ capped at min(Intelligence, Magic) |
| Magic Resistance | SR3 p.170 | Spell Resistance Tests |
| Rapid Healing | SR3 p.170 | Body for Healing Tests, and crippling-injury tests |
| Counterstrike | MITS p.149 | Counterattack Tests in melee, **counterattacks only** |
| Iron Will | MITS p.150 | resisting mind control/alteration |
| Sixth Sense | MITS p.151 | Reaction Tests **for Surprise only** |
| Rooting | MITS p.151 | resisting knockdown/throw/levitation (+2 TN to all the adept's own tests while used) |
| Spell Shroud | MITS p.151 | Spell Resistance vs **detection spells only** |
| Temperature Tolerance | MITS p.151 | resisting temperature effects |
| True Sight | MITS p.151 | Resistance Tests vs illusion |
| Great Leap | MITS p.150 | jumping tests, and +level to Quickness for max distance |
| Flexibility | MITS p.150 | −1 TN per level to Athletics (Escape Artist) |
| Freefall | MITS p.150 | 2m per level of falling ignored |
| Resilience | SOTA2 p.67 | stabilization, permanent-damage and wound-effect tests |
| Side Step | SOTA2 p.67 | +1 Combat Pool die **for Dodge / Full Dodge only** |
| Penetrating Strike 1–3 | SOTA2 p.67 | reduces target Impact armour by level, damage only |
| Kinesics 1–3 | SOTA2 p.66 | −1 TN social, +1 die Charisma tests, +2 to detect-lying tests |
| Sprint | SOTA2 p.68 | +1 Quickness per level for running distance |

⚠ **Most of these are scoped to one kind of test**, and the scope is the hard part, not the
arithmetic. `skillBonusDice` promises "always applies" and cannot express "counterattacks only"
or "Surprise only" — the same reason `skillCategoryBonus` exists as a separate opt-in channel. A
third channel, or a per-power tag, is the real design question behind 70.

### Reference-only by nature — correct as inert items

Not defects. These are GM-adjudicated or narrative, and an item that only carries its description
is the right implementation under the project's minimal-guardrails ethos: Astral Perception
(already served by `astralMode`), the twelve Improved Senses, Suspended State, Traceless Walk,
Magic Sense, Empathic Sense, Blind Fighting, Quick Draw, Missile Mastery, Nerve Strike, Distance
Strike, Delay Damage, Smashing Blow, Multi-Tasking, Wall Running, Living Focus, Melanin Control,
Facial Sculpt, Voice Control, Linguistics, Iron Gut, Iron Lungs, Sustenance, Eidetic Sense
Memory, Three Dimensional Memory, Motion Sense, and the nine TSS powers.

⚠ Two of these are borderline and worth revisiting if 70 ever lands: **Missile Parry**
(SR3 p.170) is a fully specified opposed test — Reaction + Combat Pool vs TN 10 − the attack's
base range TN, ties to the attacker, a Free Action — and **Quick Strike** (MITS p.151) changes
the initiative order.

## Method

- Pack contents read directly from LevelDB, not through Foundry, so the audit sees what ships
  rather than what a world has been edited into.
- Pack fingerprints (`sha1` over sorted `key=value`) taken before and after every read to prove
  the audit changed nothing: `sr3` 42 docs `aa71aed988c7`, `mits` 26 `e56a626f5f01`, `sota2` 40
  `fcfb9af98650`, `tss` 9 `a556bd38fd15`.
- Book text via `pdftotext -layout`; SR3 core has a real text layer, no OCR involved. The MITS
  **Physical Adept Powers Table** (p.163) extracts with a shifted cost column and should not be
  trusted — its Suspended State and Rapid Healing costs disagree with SR3 core, which is
  authoritative for both.
