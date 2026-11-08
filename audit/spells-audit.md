# Spell audit — TODO 123

**Audited 2026-11-08.** Every spell in the five spell packs (244) against its printed entry, and the casting
rules the code applies against SR3 pp.178-200. **The PDFs are the source** — not the guides, not the code,
not the upstream SRCG data the packs were generated from (`rawdata/SRCG-SR3-Spells.json`).

## Method

- **The data.** Each pack spell was dumped (name, type, target, range, duration, drain, category, damage
  track, Force, book page) and compared field by field with the entry's `Type · Target · Duration · Drain`
  line and its text.
  - **SR3** (96 spells, pp.191-198): `pdftotext -layout`, columns cropped (PDF page = printed + 2). The core
    book prints 76 entries; the pack expands Increase/Decrease (Cybered) Attribute into one spell per
    Attribute, which accounts for the other 20.
  - **Magic in the Shadows** (99, pp.140-148; PDF = printed + 1): the PDF's text layer is OCR, so every
    disagreement was confirmed on a rendered page image (pp.140, 141, 143, 147), and p.145 — which has no
    text layer at all — was read from its image.
  - **Target: Wastelands** (7; PDF = printed + 1): image-only, read from rendered pages 111, 119, 124, 130.
  - **tss** (40, a fan publication) — **no copy in the library; unverified.**
  - **State of the Art 2063** (2, `sta2.33`) — image-only; printed p.33 is a full-page illustration and the
    two entries were not found beside it. **Unverified.** A maintainer with the book can settle the page.
- **Range.** The core book prints no range per entry: range follows the category (Combat and Illusion line of
  sight, Detection and Health touch, pp.181-197) and the text ("Death Touch requires the caster to touch the
  target"; Ram — "the caster must touch the target"). MitS and TWL ranges were read from the text and, in TWL,
  the printed `Range:` field. The `(A)` marker was checked against "is an area spell" / "area-effect" in the text.
- **Target suffixes** `(R)`, `(V)`, `(T)`, `(RC)` are the upstream data's notation (resisted, voluntary…),
  stripped by `SpellTarget.resolve`; the base Target was compared.
- **Drain codes.** `tests/spell-audit.test.mjs` asserts `parseDrainFormula` reads **every** shipped code (it
  does — 42 distinct codes, none unparsed).

## Findings — data (fixed)

All fixed in `packs-src` by `tools/fix-spell-book-values.mjs` and on owned copies by the 0.9.0 migration, both
through `SpellBookFixes` (`scripts/data/spell-book-fixes.mjs`): a field changes only while it holds exactly the
old shipped value, gated on the spell's book page.

| Spell | Was | Book | Page |
|---|---|---|---|
| Mass Blindness | Type Mana | **Type P** | MitS p.143 |
| Fashion | Drain +1(L) | **+1(M)** | MitS p.147 |
| Diagnose | Duration Sustained | **Duration I** | MitS p.141 |
| Ram (Object) | Range LOS | **touch** — "the caster must touch the target" | MitS p.140 |
| Steam, Smoke Cloud | track blank → Physical | **Stun** — "inflicting Stun damage" | MitS p.145 |
| Thunderbolt, Thunderclap | track blank → Physical | **Stun** — "In addition to causing Stun damage" | MitS p.145 |
| Waterbolt, Splash | track blank → Physical | **Stun** — "causing Stun damage" | TWL p.124 |
| Splash | Range LOS | **area** — "an area effect version of Waterbolt" | TWL p.124 |
| Radiation Barrier | Range LOS | **area** — "an area-effect version of Radiation Shield" | TWL p.111 |
| Personal Thermostat | Range LOS | **Range: P** | TWL p.119 |
| Alter Pressure | page twl.131 | **p.130** | TWL p.130 |
| Clout | track blank, no attack (below) | **Stun**, a ranged attack | SR3 p.197 |
| Astral Barrior, Hot Potatoe, Limited Physical Barrior, Spirit Barrior | misspelt | Astral Barrier, Hot Potato, Limited Physical Barrier, Spirit Barrier | SR3 p.198; MitS pp.143, 147, 148 |

**Categories — relabelled to the book's Manipulation subtypes** (the maintainer, 2026-11-08: *"Relabel to the
book"*). The packs filed the book's **Telekinetic** manipulations (SR3 p.197; MitS pp.145-146) as
`Transformation`, and the book's **Transformation** and **Control** manipulations (SR3 pp.196, 198; MitS
pp.144-148; TWL) as `Manipulation`. Now `Control` / `Telekinetic` / `Transformation`, with `Elemental` as before.
The tss pack keeps its labels (no source). `SR3E.spellCategories` lists all of them, `Manipulation` kept for
spells with no recorded subtype. Only `Combat` and `Elemental` change how a spell resolves, so the relabel
changes no roll.

**Embedded copies** — the archetypes and Mr. Johnson's contacts carry their spells with a Force suffix
("Manaball (F5)"); the tool and the migration match the spell's own name and keep the suffix through a rename.

## Findings — rules and code

| Rule | Book | Code | Verdict |
|---|---|---|---|
| Spell Pool on the Sorcery Test is capped at the Sorcery dice allocated | p.181, p.182 — "No more Spell Pool dice can be added to the test than the Sorcery dice allocated." | `rollSpell` offered the whole available pool | 🔴 **Fixed** — `SpellPoolCap` (after the Spellcasting spec and withheld area dice); mutant `spell-pool-uncapped-on-sorcery` |
| Clout: Stun, a ranged attack, Impact armour | p.197 | no Damage Level, no attack, track read Physical | 🔴 **Fixed** (the maintainer: "Build the Clout path here") — `Clout`, Fling's dodge/soak path with full Impact, Damage Level chosen at cast; mutant `clout-is-not-a-stun-attack` |
| Spell sheet dropdowns keep the stored value | — | a value outside the list (`LOS(A)`, `T/D`, `Elemental`…) was replaced by the list's first option on the next edit of any field | 🔴 **Fixed** — `keepValueOption` in `_sel` |
| Drain TN = ⌊Force ÷ 2⌋ + the Drain Modifier; Willpower + Spell Pool | p.183 | `parseDrainFormula`, `drainResistRating` | ✓ |
| Physical Drain when Force > Magic, or astrally projecting | p.183 | `drainIsPhysical` | ✓ |
| Rule of One on the Sorcery Test: fails, Drain TN +2 | p.182 | `castGlitch` | ✓ |
| Spell Resistance: targeted Attribute vs Force, no modifiers | p.183 | `handleSpellResistRoll` | ✓ (sustaining +2 by the maintainer's 2026-09-14 ruling) |
| Area radius = Magic m, ±1 m per 2 withheld dice | p.181 | `spellAreaRadius` | ✓ |
| Elemental: base TN 4, dodged, Damage Resistance with Combat Pool | p.183, p.196 | elemental path | ✓ |
| Spell Defense: dice vs Force, successes off the cast | p.183 | counterspelling card | ✓ |
| Dispelling: Sorcery + Spell Pool vs Force; each success removes one; Drain as casting | p.185 | `rollDispel` | ✓ for the roll and Drain; the **Threshold** rule (below Threshold ends the spell) is the GM's to read |
| Health spells drain by the wound / toxin / disease level | p.193 ("(Wound Level)", "(Toxin Damage)") | the cast never asks that level, so Heal, Treat, Resist Pain, Antidote, Detox, Cure Disease, Alleviate/Cause Allergy and Awaken drain at the parser's default, **Serious** | 🔴 **Open — follow-up TODO** (not fixed here) |
| Increase Attribute spells | p.194 | no effect path; the GM edits the attribute | unchanged (already in TODO 123's text) |

**Also noted, not changed:** the archetype's "Increase Reaction (F3)" is embedded with every field blank (Type,
Target, Drain…) — a data gap on that one actor, for the follow-up TODO. TWL p.119 prints **Create Water**, which no
pack carries.

## Every spell

Shipped values before this audit: `Type · Target · Range · Duration · Drain · Category`. ✓ = every field matches
the printed entry; 🔧 = corrected (category per the book's subtype).

| Spell | Page | Shipped | Verdict |
|---|---|---|---|
| Acid Stream | sr3.196 | Physical · 4(RC) · LOS · Instant · +1(DL+1) · Elemental | ✓ matches |
| Analyze Device | sr3.192 | Physical · OR · T/D · Sustained · +1(M) · Detection | ✓ matches |
| Analyze Truth | sr3.192 | Mana · W(R) · T/D · Sustained · (L) · Detection | ✓ matches |
| Antidote (TOX LEV) | sr3.193 | Mana · TOX(V) · T · Permanent · (TOX DL) · Health | ✓ matches |
| Armor | sr3.198 | Physical · 6 · LOS · Sustained · +2(M) · Manipulation | 🔧 category → Transformation |
| Astral Barrior | sr3.198 | Mana · 6 · LOS(A) · Sustained · +1(S) · Manipulation | 🔧 category → Transformation; name → Astral Barrier |
| Ball Lightning | sr3.197 | Physical · 4(RC) · LOS(A) · Instant · +1(DL+2) · Elemental | ✓ matches |
| Chaos | sr3.195 | Physical · I(R) · LOS · Sustained · +1(S) · Illusion | ✓ matches |
| Chaotic World | sr3.195 | Physical · I(R) · LOS(A) · Sustained · +1(D) · Illusion | ✓ matches |
| Clairaudience | sr3.192 | Mana · 6(R) · T/D · Sustained · (M) · Detection | ✓ matches |
| Clairvoyance | sr3.192 | Mana · 6(R) · T/D · Sustained · (M) · Detection | ✓ matches |
| Clout | sr3.197 | Physical · 4(RC) · LOS · Instant · (DL) · Transformation | 🔧 damageTrack → Stun; category → Telekinetic |
| Combat Sense | sr3.192 | Mana · 4 · T · Sustained · (S) · Detection | ✓ matches |
| Confusion | sr3.195 | Mana · W(R) · LOS · Sustained · (S) · Illusion | ✓ matches |
| Control Actions | sr3.196 | Mana · W(T) · LOS · Sustained · +1(M) · Manipulation | 🔧 category → Control |
| Control Emotion | sr3.196 | Mana · W(T) · LOS · Sustained · +1(M) · Manipulation | 🔧 category → Control |
| Control Thoughts | sr3.196 | Mana · W(T) · LOS · Sustained · +1(S) · Manipulation | 🔧 category → Control |
| Cure Disease | sr3.193 | Mana · DP(T) · T · Permanent · (DIS DL) · Health | ✓ matches |
| Death Touch | sr3.191 | Mana · W(R) · T · Instant · (DL-1) · Combat | ✓ matches |
| Decrease Attribute (B) | sr3.193 | Mana · 10-E(R) · T · Sustained · +1(S) · Health | ✓ matches |
| Decrease Attribute (C) | sr3.193 | Mana · 10-E(R) · T · Sustained · +1(S) · Health | ✓ matches |
| Decrease Attribute (I) | sr3.193 | Mana · 10-E(R) · T · Sustained · +1(S) · Health | ✓ matches |
| Decrease Attribute (Q) | sr3.193 | Mana · 10-E(R) · T · Sustained · +1(S) · Health | ✓ matches |
| Decrease Attribute (S) | sr3.193 | Mana · 10-E(R) · T · Sustained · +1(S) · Health | ✓ matches |
| Decrease Attribute (W) | sr3.193 | Mana · 10-E(R) · T · Sustained · +1(S) · Health | ✓ matches |
| Decrease Cyber Attribute (B) 1 | sr3.193 | Physical · 10-E(R) · T · Sustained · +2(S) · Health | ✓ matches |
| Decrease Cyber Attribute (C) 1 | sr3.193 | Physical · 10-E(R) · T · Sustained · +2(S) · Health | ✓ matches |
| Decrease Cyber Attribute (I) 1 | sr3.193 | Physical · 10-E(R) · T · Sustained · +2(S) · Health | ✓ matches |
| Decrease Cyber Attribute (Q) 1 | sr3.193 | Physical · 10-E(R) · T · Sustained · +2(S) · Health | ✓ matches |
| Decrease Cyber Attribute (S) 1 | sr3.193 | Physical · 10-E(R) · T · Sustained · +2(S) · Health | ✓ matches |
| Decrease Cyber Attribute (W) 1 | sr3.193 | Physical · 10-E(R) · T · Sustained · +2(S) · Health | ✓ matches |
| Detect Enemies | sr3.192 | Mana · DT(R) · T/A · Sustained · (M) · Detection | ✓ matches |
| Detect Individual | sr3.192 | Mana · DT(R) · T/A · Sustained · (L) · Detection | ✓ matches |
| Detect(Life Form)-> | sr3.193 | Mana · DT(R) · T/A · Sustained · -1(L) · Detection | ✓ matches |
| Detect Life | sr3.192 | Mana · DT(R) · T/A · Sustained · (L) · Detection | ✓ matches |
| Detect Magic | sr3.193 | Mana · DT · T/A · Sustained · (L) · Detection | ✓ matches |
| Detect(Object)-> | sr3.193 | Physical · DT · T/A · Sustained · +1(M) · Detection | ✓ matches |
| Detox | sr3.193 | Mana · TOX(V) · T · Permanent · -2(TOX DL) · Health | ✓ matches |
| Entertainment | sr3.195 | Mana · W(V) · LOS(A) · Sustained · (L) · Illusion | ✓ matches |
| Fireball | sr3.197 | Physical · 4(RC) · LOS(A) · Instant · +1(DL+2) · Elemental | ✓ matches |
| Flamethrower | sr3.197 | Physical · 4(RC) · LOS · Instant · +1(DL+1) · Elemental | ✓ matches |
| Fling | sr3.197 | Physical · See text · T · Instant · +1(M) · Transformation | 🔧 category → Telekinetic |
| Heal | sr3.193 | Mana · 10-E(V) · T · Permanent · (DL) · Health | ✓ matches |
| Healthy Glow | sr3.194 | Mana · 4(V) · T · Permanent · (L) · Health | ✓ matches |
| Hibernate | sr3.194 | Mana · 4(V) · T · Sustained · +1(M) · Health | ✓ matches |
| Ice Sheet | sr3.198 | Physical · 4 · LOS(A) · Instant · +1(S) · Manipulation | 🔧 category → Transformation |
| Ignite | sr3.198 | Physical · 4(T) · LOS · Permanent · +1(D) · Manipulation | 🔧 category → Transformation |
| Improved Invisibility | sr3.195 | Physical · 4(R) · LOS · Sustained · +1(M) · Illusion | ✓ matches |
| Incr. Reflexes +1INI DIE | sr3.194 | Mana · REA(V) · T · Sustained · +1(S) · Health | ✓ matches |
| Incr. Reflexes +2INI DIE | sr3.194 | Mana · REA(V) · T · Sustained · +1(D) · Health | ✓ matches |
| Incr. Reflexes +3INI DIE | sr3.194 | Mana · REA(V) · T · Sustained · +3(D) · Health | ✓ matches |
| Increased Attribute (B) | sr3.194 | Mana · Att(V) · T · Sustained · +1(M) · Health | ✓ matches |
| Increased Attribute (C) | sr3.194 | Mana · Att(V) · T · Sustained · +1(M) · Health | ✓ matches |
| Increased Attribute (I) | sr3.194 | Mana · Att(V) · T · Sustained · +1(M) · Health | ✓ matches |
| Increased Attribute (Q) | sr3.194 | Mana · Att(V) · T · Sustained · +1(M) · Health | ✓ matches |
| Increased Attribute (S) | sr3.194 | Mana · Att(V) · T · Sustained · +1(M) · Health | ✓ matches |
| Increased Attribute (W) | sr3.194 | Mana · Att(V) · T · Sustained · +1(M) · Health | ✓ matches |
| Increased Cyber Attribute (B) 1 | sr3.194 | Physical · Att(V) · T · Sustained · +2(M) · Health | ✓ matches |
| Increased Cyber Attribute (C) 1 | sr3.194 | Physical · Att(V) · T · Sustained · +2(M) · Health | ✓ matches |
| Increased Cyber Attribute (I) 1 | sr3.194 | Physical · Att(V) · T · Sustained · +2(M) · Health | ✓ matches |
| Increased Cyber Attribute (Q) 1 | sr3.194 | Physical · Att(V) · T · Sustained · +2(M) · Health | ✓ matches |
| Increased Cyber Attribute (S) 1 | sr3.194 | Physical · Att(V) · T · Sustained · +2(M) · Health | ✓ matches |
| Increased Cyber Attribute (W) 1 | sr3.194 | Physical · Att(V) · T · Sustained · +2(M) · Health | ✓ matches |
| Increased Reaction | sr3.194 | Mana · Rea(V) · T · Sustained · +1(S) · Health | ✓ matches |
| Influence | sr3.196 | Mana · W(T) · LOS · Permanent · (S) · Manipulation | 🔧 category → Control |
| Invisibility | sr3.195 | Mana · 4(R) · LOS · Sustained · (M) · Illusion | ✓ matches |
| Levitate | sr3.197 | Physical · 4(R) · LOS · Sustained · +2(M) · Transformation | 🔧 category → Telekinetic |
| Light | sr3.198 | Physical · 4 · LOS(A) · Sustained · +2(M) · Manipulation | 🔧 category → Transformation |
| Lightning Bolt | sr3.197 | Physical · 4(RC) · LOS · Instant · +1(DL+1) · Elemental | ✓ matches |
| Magic Fingers | sr3.197 | Physical · 6 · LOS · Sustained · +2(M) · Transformation | 🔧 category → Telekinetic |
| Manaball | sr3.191 | Mana · W(R) · LOS(A) · Instant · (DL+1) · Combat | ✓ matches |
| Manabolt | sr3.191 | Mana · W(R) · LOS · Instant · (DL) · Combat | ✓ matches |
| Mask | sr3.195 | Mana · 4(R) · LOS · Sustained · (M) · Illusion | ✓ matches |
| Mass Confusion | sr3.195 | Mana · W(R) · LOS(A) · Sustained · (D) · Illusion | ✓ matches |
| Mindlink | sr3.193 | Mana · 4(V) · LOS/D · Sustained · (S) · Detection | ✓ matches |
| Mindprobe | sr3.193 | Mana · W(R) · T/D · Sustained · (S) · Detection | ✓ matches |
| Oxygenate | sr3.194 | Physical · 4(V) · T · Sustained · +2(L) · Health | ✓ matches |
| Petrify | sr3.198 | Physical · B(T) · LOS · Sustained · +1(S) · Manipulation | 🔧 category → Transformation |
| Phantasm | sr3.195 | Mana · 4(R) · LOS(A) · Sustained · (D) · Illusion | ✓ matches |
| Physical Barrier | sr3.198 | Physical · 6 · LOS(A) · Sustained · +2(S) · Manipulation | 🔧 category → Transformation |
| Physical Mask | sr3.195 | Physical · 4(R) · LOS · Sustained · +1(M) · Illusion | ✓ matches |
| Poltergeist | sr3.197 | Physical · 4(R) · LOS(A) · Sustained · +1(M) · Transformation | 🔧 category → Telekinetic |
| Powerball | sr3.191 | Physical · B(R) · LOS(A) · Instant · +1(DL+1) · Combat | ✓ matches |
| Powerbolt | sr3.191 | Physical · B(R) · LOS · Instant · +1(DL) · Combat | ✓ matches |
| Prophylaxis | sr3.194 | Mana · 4(V) · T · Sustained · +1(L) · Health | ✓ matches |
| Resist Pain | sr3.194 | Mana · 4(V) · T · Permanent · -2(DL) · Health | ✓ matches |
| Shadow | sr3.198 | Physical · 4 · LOS(A) · Sustained · +2(M) · Manipulation | 🔧 category → Transformation |
| Silence | sr3.196 | Physical · 4(R) · LOS(A) · Sustained · +1(S) · Illusion | ✓ matches |
| Stabilize | sr3.194 | Mana · 4+MIN V · T · Permanent · +1(M) · Health | ✓ matches |
| Stealth | sr3.196 | Physical · 4(R) · LOS · Sustained · +1(M) · Illusion | ✓ matches |
| Stunball | sr3.191 | Mana · W(R) · LOS(A) · Instant · -1(DL+1) · Combat | ✓ matches |
| Stunbolt | sr3.191 | Mana · W(R) · LOS · Instant · -1(DL) · Combat | ✓ matches |
| Toxic Wave | sr3.196 | Physical · 4(RC) · LOS(A) · Instant · +1(DL+2) · Elemental | ✓ matches |
| Treat | sr3.193 | Mana · 10-E(V) · T · Permanent · -1(DL) · Health | ✓ matches |
| Trid Entertainment | sr3.195 | Physical · I(V) · LOS(A) · Sustained · +1(L) · Illusion | ✓ matches |
| Trid Phantasm | sr3.195 | Physical · 4(R) · LOS(A) · Sustained · +1(D) · Illusion | ✓ matches |
| Agony | mits.142 | Mana · W(R) · LOS · Sustained · (M) · Illusion | ✓ matches |
| Alleviate Allergy | mits.141 | Physical · 10-E(V) · T · Sustained · (Al. Level) · Health | ✓ matches |
| Alter Memory | mits.144 | Mana · W(T) · LOS · Permanent · (D) · Manipulation | 🔧 category → Control |
| Alter Temperature | mits.146 | Physical · 4 · LOS(A) · Sustained · +2(M) · Manipulation | 🔧 category → Transformation |
| Analyze Magic | mits.140 | Mana · F(R) · T/D · Sustained · (L) · Detection | ✓ matches |
| Animal(Sense) | mits.140 | Mana · W(R) · T/D · Sustained · (M) · Detection | ✓ matches |
| Animate | mits.145 | Physical · OR · LOS · Sustained · +1(M) · Transformation | 🔧 category → Telekinetic |
| Astral Armor | mits.146 | Mana · 6 · LOS · Sustained · +1(M) · Manipulation | 🔧 category → Transformation |
| Astral Window | mits.140 | Mana · F(R) · T/D · Sustained · (L) · Detection | ✓ matches |
| Awaken | mits.141 | Mana · 4(V) · T · Instant · -2(SDL) · Health | ✓ matches |
| Bind | mits.145 | Physical · Q(R) · LOS · Sustained · +2(M) · Transformation | 🔧 category → Telekinetic |
| Blindness | mits.143 | Physical · I(R) · LOS · Sustained · +1(M) · Illusion | ✓ matches |
| Calm Animal | mits.144 | Mana · W(T) · LOS · Sustained · (M) · Manipulation | 🔧 category → Control |
| Calm Pack | mits.144 | Mana · W(T) · LOS(A) · Sustained · (S) · Manipulation | 🔧 category → Control |
| Camouflage | mits.143 | Mana · 4(R) · LOS · Sustained · (L) · Illusion | ✓ matches |
| Catalog | mits.141 | Physical · 6 · T/A · Sustained · +1(M) · Detection | ✓ matches |
| Catfall | mits.145 | Physical · 4 · LOS · Sustained · +1(M) · Transformation | 🔧 category → Telekinetic |
| Cause Allergy | mits.142 | Physical · 10-E(R) · T · Sustained · +2(AL LEV+1) · Health | ✓ matches |
| Chaff | mits.143 | Physical · OR · LOS · Sustained · (S) · Illusion | ✓ matches |
| Clean(Element)-> | mits.146 | Physical · 6 · LOS(A) · Permanent · +1(S) · Manipulation | 🔧 category → Transformation |
| Compel Truth | mits.144 | Mana · W(T) · LOS · Sustained · +1(M) · Manipulation | 🔧 category → Control |
| Control Animal | mits.144 | Mana · W(T) · LOS · Sustained · (S) · Manipulation | 🔧 category → Control |
| Control Fire | mits.146 | Physical · Pfire · LOS(A) · Sustained · +2(M) · Manipulation | 🔧 category → Transformation |
| Control Pack | mits.144 | Mana · W(T) · LOS(A) · Sustained · (D) · Manipulation | 🔧 category → Control |
| Create Food | mits.147 | Physical · 4 · LOS · Permanent · +1(S) · Manipulation | 🔧 category → Transformation |
| Cripple Limb | mits.142 | Physical · B(T) · T · Sustained · +1(S) · Health | ✓ matches |
| Decrease Cybered Reaction | mits.142 | Physical · 10-E(R) · T · Sustained · +2(D) · Health | ✓ matches |
| Decrease Reaction | mits.142 | Mana · 10-E(R) · T · Sustained · +1(D) · Health | ✓ matches |
| Decreased Reflexes -1INI DIE 1 | mits.142 | Physical · 10-E(R) · T · Sustained · +2(D) · Health | ✓ matches |
| Decreased Reflexes -2INI DIE 1 | mits.142 | Physical · 10-E(R) · T · Sustained · +4(D) · Health | ✓ matches |
| Decreased Reflexes -3INI DIE 1 | mits.142 | Physical · 10-E(R) · T · Sustained · +6(D) · Health | ✓ matches |
| Deflect | mits.145 | Physical · 4 · LOS · Sustained · +2(M) · Transformation | 🔧 category → Telekinetic |
| Diagnose | mits.141 | Mana · W(R) · T/D · Sustained · -1(L) · Detection | 🔧 duration → Instant |
| Double Image | mits.143 | Mana · 4(R) · T · Sustained · (S) · Illusion | ✓ matches |
| Dream | mits.143 | Mana · W(R) · LOS · Sustained · (M) · Illusion | ✓ matches |
| Enhance Aim | mits.141 | Mana · 6(R) · T/D · Sustained · (M) · Detection | ✓ matches |
| Eyes of the Pack | mits.141 | Mana · 6(V) · T/D · Sustained · (M) · Detection | ✓ matches |
| Fashion | mits.147 | Physical · 6 · T · Permanent · +1(L) · Manipulation | 🔧 drain → +1(M); category → Transformation |
| Fast | mits.142 | Mana · 4(V) · T · Permanent · -2(M) · Health | ✓ matches |
| Firewall | mits.147 | Physical · 4 · LOS(A) · Sustained · +2(S) · Manipulation | 🔧 category → Transformation |
| Fix | mits.147 | Physical · OR · T · Permanent · (S) · Manipulation | 🔧 category → Transformation |
| Flak | mits.143 | Physical · OR · LOS(A) · Sustained · (D) · Illusion | ✓ matches |
| Flame Aura | mits.147 | Physical · 4 · LOS(A) · Sustained · +2(M) · Manipulation | 🔧 category → Transformation |
| Flash | mits.143 | Physical · I(R) · LOS(A) · Instant · (S) · Illusion | ✓ matches |
| Foreboding | mits.143 | Mana · 4(R) · LOS(A) · Sustained · (D) · Illusion | ✓ matches |
| Freeze Water | mits.147 | Physical · 4 · LOS(A) · Instant · +1(M) · Manipulation | 🔧 category → Transformation |
| Gecko Crawl | mits.146 | Physical · 4 · LOS · Sustained · +2(M) · Transformation | 🔧 category → Telekinetic |
| Glue Strip | mits.147 | Physical · 4 · LOS(A) · Sustained · +2(S) · Manipulation | 🔧 category → Transformation |
| Glue | mits.147 | Physical · 4 · LOS(A) · Sustained · +2(M) · Manipulation | 🔧 category → Transformation |
| Hot Potatoe | mits.143 | Mana · 4(R) · LOS(A) · Sustained · (M) · Illusion | 🔧 name → Hot Potato |
| Intoxication | mits.142 | Physical · B(T) · T · Permanent · +1(D) · Health | ✓ matches |
| Laser | mits.145 | Physical · 4(RC) · LOS · Instant · +1(DL+1) · Elemental | ✓ matches |
| Limited Armor | mits.147 | Physical · 6 · LOS · Sustained · +2(L) · Manipulation | 🔧 category → Transformation |
| Limited Physical Barrior | mits.147 | Physical · 6 · LOS(A) · Sustained · +2(M) · Manipulation | 🔧 category → Transformation; name → Limited Physical Barrier |
| Lock | mits.146 | Physical · 4 · LOS · Sustained · +2(M) · Transformation | 🔧 category → Telekinetic |
| Makeover | mits.147 | Physical · 6(V) · LOS · Permanent · +1(M) · Manipulation | 🔧 category → Transformation |
| Mana Bind | mits.146 | Mana · Q · LOS · Sustained · +1(M) · Transformation | 🔧 category → Telekinetic |
| Mana Net | mits.146 | Mana · Q · LOS · Sustained · +1(S) · Transformation | 🔧 category → Telekinetic |
| Mana Static | mits.148 | Mana · 4 · LOS(A) · Permanent · (D) · Manipulation | 🔧 category → Transformation |
| Mass Agony | mits.142 | Mana · W(R) · LOS(A) · Sustained · (S) · Illusion | ✓ matches |
| Mass Blindness | mits.143 | Mana · I(R) · LOS(A) · Sustained · +1(S) · Illusion | 🔧 type → Physical |
| Mist | mits.148 | Physical · 4 · LOS(A) · Instant · +1(M) · Manipulation | 🔧 category → Transformation |
| Mob Mind | mits.145 | Mana · W(T) · LOS(A) · Sustained · +1(D) · Manipulation | 🔧 category → Control |
| Mob Mood | mits.145 | Mana · W(T) · LOS(A) · Sustained · +1(S) · Manipulation | 🔧 category → Control |
| Net | mits.145 | Physical · Q(R) · LOS(A) · Sustained · +2(S) · Transformation | 🔧 category → Telekinetic |
| Nightvision | mits.141 | Physical · 6(R) · T/D · Sustained · +1(M) · Detection | ✓ matches |
| Nova | mits.145 | Physical · 4(RC) · LOS(A) · Instant · +1(DL+2) · Elemental | ✓ matches |
| Nutrition | mits.142 | Physical · 4(V) · T · Permanent · +1(M) · Health | ✓ matches |
| Physical Camouflage | mits.143 | Physical · 4(R) · LOS · Sustained · +1(L) · Illusion | ✓ matches |
| Physical Double Image | mits.143 | Physical · 4(R) · T · Sustained · +1(S) · Illusion | ✓ matches |
| Preserve | mits.142 | Physical · 4 · T · Permanent · +1(M) · Health | ✓ matches |
| Ram-> | mits.140 | Physical · OR · LOS · Instant · +1(DL-2) · Combat | 🔧 range → T |
| Redirect | mits.146 | Physical · 4(RC) · LOS · Instant · +1(DL) · Transformation | 🔧 category → Telekinetic |
| Reinforce | mits.148 | Physical · OR · LOS · Sustained · +1(M) · Manipulation | 🔧 category → Transformation |
| Shape Earth | mits.146 | Physical · 4 · LOS(A) · Sustained · +2(M) · Transformation | 🔧 category → Telekinetic |
| Shape Water | mits.146 | Physical · 4 · LOS(A) · Sustained · +2(M) · Transformation | 🔧 category → Telekinetic |
| Shapechange | mits.148 | Physical · B(TV) · LOS · Sustained · +1(M) · Manipulation | 🔧 category → Transformation |
| Shattershield | mits.140 | Mana · F(R) · T · Instant · (M) · Combat | ✓ matches |
| Slaughter(Race/Species)-> | mits.140 | Mana · W(R) · LOS(A) · Instant · +1(D) · Combat | ✓ matches |
| Slay(Race/Species)-> | mits.140 | Mana · W(R) · LOS · Instant · -1(D) · Combat | ✓ matches |
| Smoke Cloud | mits.145 | Physical · 4(RC) · LOS(A) · Instant · (DL+2) · Elemental | 🔧 damageTrack → Stun |
| Spell Shield | mits.148 | Mana · 6 · LOS · Sustained · (M) · Manipulation | 🔧 category → Transformation |
| Spell Wall | mits.148 | Mana · 6 · LOS(A) · Sustained · (S) · Manipulation | 🔧 category → Transformation |
| Spirit Barrior | mits.148 | Mana · 6 · LOS(A) · Sustained · (S) · Manipulation | 🔧 category → Transformation; name → Spirit Barrier |
| Spiritblast | mits.140 | Mana · F(R) · LOS(A) · Instant · -1(DL+1) · Combat | ✓ matches |
| Spiritbolt | mits.140 | Mana · F(R) · LOS · Instant · -1(DL) · Combat | ✓ matches |
| Steam | mits.145 | Physical · 4(RC) · LOS · Instant · (DL+1) · Elemental | 🔧 damageTrack → Stun |
| Stench | mits.143 | Mana · W(R) · LOS(A) · Sustained · (S) · Illusion | ✓ matches |
| Sterilize | mits.148 | Physical · 4 · LOS(A) · Instant · +1(M) · Manipulation | 🔧 category → Transformation |
| Stink | mits.143 | Mana · W(R) · LOS · Sustained · (M) · Illusion | ✓ matches |
| Stuntouch | mits.140 | Mana · W(R) · T · Instant · -1(DL-1) · Combat | ✓ matches |
| Thunderbolt | mits.145 | Physical · 4(RC) · LOS · Instant · (DL+1) · Elemental | 🔧 damageTrack → Stun |
| Thunderclap | mits.145 | Physical · 4(RC) · LOS(A) · Instant · (DL+2) · Elemental | 🔧 damageTrack → Stun |
| Transform | mits.148 | Physical · B(T) · LOS · Sustained · +1(S) · Manipulation | 🔧 category → Transformation |
| Translate | mits.141 | Mana · 4(V) · T/D · Sustained · (M) · Detection | ✓ matches |
| Use(Skill)-> | mits.146 | Physical · 6 · LOS · Sustained · +2(L) · Transformation | 🔧 category → Telekinetic |
| Vehicle Mask | mits.144 | Physical · 4(R) · LOS · Sustained · +1(S) · Illusion | ✓ matches |
| Wind | mits.148 | Physical · 4 · LOS(A) · Sustained · +2(M) · Manipulation | 🔧 category → Transformation |
| Wreck-> | mits.140 | Physical · OR · LOS · Instant · +1(DL-1) · Combat | ✓ matches |
| Berserker Rage | tss.9 | Mana · W(R) · LOS · Sustained · +1(S) · Manipulation | Unverified — no source |
| Blur | tss.9 | Physical · 4(R) · LOS · Sustained · +3(M) · Illusion | Unverified — no source |
| Breeze | tss.18 | Physical · 2 · LOS · Sustained · (L) · Elemental | Unverified — no source |
| Cake Ammunition | tss.9 | Physical · OR · LOS · Instant · +1(S) · Elemental | Unverified — no source |
| Cat Leap | tss.9 | Physical · 4 · P · Instant · +1(M) · Transformation | Unverified — no source |
| Cat's Eye | tss.9 | Physical · 4 · P · Sustained · +2(S) · Detection | Unverified — no source |
| Catnip | tss.9 | Mana · W(R) · LOS · Sustained · +3(M) · Manipulation | Unverified — no source |
| Chasm | tss.9 | Physical · 4(R) · LOS · Sustained · +2(D) · Illusion | Unverified — no source |
| Clean Item | tss.18 | Physical · 2 · T · Permanent · (L) · Manipulation | Unverified — no source |
| Cold Ball | tss.4 | Physical · B(R) · LOS · Instant · +2(S) · Combat | Unverified — no source |
| (Critter) Stampede | tss.9 | Physical · 4(R) · LOS · Sustained · +2(D) · Illusion | Unverified — no source |
| Delusion | tss.9 | Mana · W(R) · LOS · Sustained · +2(D) · Illusion | Unverified — no source |
| Dispel Insect Spirit | tss.9 | Physical · B(R) · LOS · Sustained · (D) · Combat | Unverified — no source |
| Dry Item | tss.18 | Physical · 2 · LOS · Permanent · (L) · Manipulation | Unverified — no source |
| Earth Barrier | tss.4 | Physical · 5 · LOS · Permanent · +2(M) · Manipulation | Unverified — no source |
| Elegy | tss.9 | Physical · 4(R) · L · Sustained · +2(S) · Illusion | Unverified — no source |
| Emotion Paint | tss.12 | Mana · 4 · T · Permanent · (M) · Manipulation | Unverified — no source |
| Fairie Fire | tss.4 | Mana · W(R) · LOS · Sustained · +2(M) · Illusion | Unverified — no source |
| False Shadow | tss.9 | Mana · 4(R) · LOS · Sustained · +1(M) · Illusion | Unverified — no source |
| Flavor | tss.18 | Physical · 2 · T · Instant · (L) · Manipulation | Unverified — no source |
| Freezing Grasp | tss.4 | Physical · B(R) · LOS · Instant · +1(L) · Combat | Unverified — no source |
| Glue Stick | tss.18 | Physical · 2 · T · Sustained · (L) · Manipulation | Unverified — no source |
| Ice Bolt | tss.4 | Physical · 4(RC) · LOS · Instant · +3(S) · Elemental | Unverified — no source |
| Identify | tss.9 | Mana · OR · LOS · Sustained · +1(L) · Detection | Unverified — no source |
| Ignore | tss.9 | Mana · W · LOS · Sustained · +1(M) · Detection | Unverified — no source |
| Improved Voice Mask | tss.9 | Physical · 4(R) · T(V) · Sustained · +3(L) · Illusion | Unverified — no source |
| Inertial Barrier | tss.4 | Physical · 6 · LOS · Sustained · +2(S) · Manipulation | Unverified — no source |
| Mirror | tss.9 | Mana · W(R) · LOS · Sustained · +1(S) · Illusion | Unverified — no source |
| Natural Armor | tss.9 | Physical · 6 · LOS · Sustained · +3(D) · Transformation | Unverified — no source |
| Phantasmal Orchestra | tss.9 | Mana · 4(R) · L · Sustained · +1(S) · Illusion | Unverified — no source |
| Piercing Meow | tss.9 | Physical · W(R) · LOS · Sustained · (S) · Combat | Unverified — no source |
| Prey | tss.9 | Mana · W · LOS · Sustained · -1(S) · Detection | Unverified — no source |
| Private Conversation | tss.9 | Mana · W · T · Sustained · (S) · Detection | Unverified — no source |
| Project Astral Entity | tss.9 | Physical · 4(R) · L · Sustained · +3(M) · Illusion | Unverified — no source |
| Ranged Private Conversation 1 | tss.9 | Mana · W · LOS · Sustained · +1(D) · Detection | Unverified — no source |
| Ritual Cleansing | tss.12 | Mana · 4 · LOS · Permanent · (S) · Manipulation | Unverified — no source |
| Sense Pads | tss.9 | Mana · OR · T · Sustained · (M) · Detection | Unverified — no source |
| Sheath | tss.9 | Physical · * · LOS · Sustained · +1(M) · Illusion | Unverified — no source |
| Soak Item | tss.18 | Physical · 2 · LOS · Instant · (L) · Manipulation | Unverified — no source |
| Zip | tss.18 | Physical · 2 · P · Sustained · (L) · Manipulation | Unverified — no source |
| Alter Pressure | twl.131 | Physical · 4 · LOS(A) · Sustained · +2(S) · Manipulation | 🔧 bookPage → twl.130; category → Transformation |
| Personal Thermostat | twl.119 | Physical · 4 · LOS · Sustained · +2(L) · Manipulation | 🔧 range → P; category → Transformation |
| Radiation Barrier | twl.111 | Physical · 6 · LOS · Sustained · +1(S) · Manipulation | 🔧 range → LOS(A); category → Transformation |
| Radiation Shield | twl.111 | Physical · 6 · LOS · Sustained · +1(M) · Manipulation | 🔧 category → Transformation |
| Shape Snow/Ice | twl.124 | Physical · 4 · LOS · Sustained · +2(M) · Manipulation | 🔧 category → Transformation |
| Splash | twl.124 | Physical · 4(RC) · LOS · Instant · (DL) · Elemental | 🔧 range → LOS(A); damageTrack → Stun |
| Waterbolt | twl.124 | Physical · 4(RC) · LOS · Instant · (DL) · Elemental | 🔧 damageTrack → Stun |
| Sound Barrier | sta2.33 | Physical · 4(R) · LOS · Sustained · +1(M) · Illusion | Unverified — entry not found |
| Word Recognition | sta2.033 | Mana · W · LOS · Sustained · (M) · Detection | Unverified — entry not found |
