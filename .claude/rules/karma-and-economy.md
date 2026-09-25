---
paths:
  - "scripts/SR3EPurchase.js"
  - "scripts/data/ledger.mjs"
  - "scripts/data/purchasing.mjs"
  - "scripts/data/carried-load.mjs"
  - "tests/karma.test.mjs"
  - "tests/ledger.test.mjs"
  - "tests/purchasing.test.mjs"
  - "tests/carried-load.test.mjs"
---
# Karma, the ledger, buying gear, encumbrance

### Karma & advancement  · *SR3 p.244-246*

| Field | Is | Changes when |
|---|---|---|
| `system.totalKarma` | career odometer | only grows |
| `system.karma` | **Good Karma** — the advancement currency | awards add, purchases subtract |
| `system.karmaPool` | a **dice pool**: rerolls, buying off Rule of One, Hand of God · p.246 | refreshes per scene (GM's call); burned points never return |

Karma Pool shows on the **Attributes** tab; Good/Total Karma on **Bio → Resources**.

**Awarding** — **Award Karma…** (GM, Bio → Resources, one character) and **🎖 Session Rewards** (GM, Rollable
Tables: karma, nuyen, a gear note to ticked PCs) both go through `SR3EActor.karmaAward(totalKarma, amount, metatype)`.
- The Pool point goes **instead of** Good Karma, not as well.
- ⚠ **Humans: every TENTH karma; others every twentieth** (p.246) — `karmaPoolDivisor`, case-insensitive on
  free-text `system.metatype`; missing metatype → 20.
- ⚠ When auditing a feature, check that something actually **calls** the function and that sibling tools use it.
- Everyone starts with **1 Karma Pool**. Migration `0.4.5.7` (via `fixActor`) is deliberately **not**
  metatype-aware — pinned to `⌊total / 20⌋ + 1`, matching only Pools exactly equal to the old formula's.

**Spending** (`_onSpendKarmaCalculator`) lists every affordable purchase: attributes, skill increases, new
skills, new specialisations, specialisation increases. Pure statics on `SR3EActor` (the sheet can't be
imported without Foundry): `karmaSkillCost`, `karmaSpecCost`, `karmaNewSkillCost`, `karmaAttributeCost`,
`karmaAttributeMaximum`, `karmaMaxSpecialisations`, `karmaSpecTargetRating`, `karmaAward`,
`karmaPoolForTotal`. `tests/karma.test.mjs` + a mutant per rule.

**Skill Improvement Cost Table** (p.245) — × the **new** rating, **round fractions DOWN**:

| New rating is… | Base: Active | Base: Knowledge/Language | Specialisation (both) |
|---|---:|---:|---:|
| ≤ the linked Attribute | 1.5 | 1 | .5 |
| ≤ 2× the linked Attribute | 2 | 1.5 | 1 |
| > 2× the linked Attribute | 2.5 | 2 | 1.5 |

- **New skill: flat 1 karma**, any type (`karmaNewSkillCost()` takes no arguments on purpose).
- **Attributes**: 2 × new rating; **3×** above the Racial Modified Limit (p.244).
- **Max specialisations = the linked ATTRIBUTE rating** (not the skill's).
- ⚠ Specialisations cost the same for active and knowledge skills — `_specCost` ignoring `isActive` is correct.
- ⚠ **A new specialisation is bought at base +1, an existing one raised from there** (Brick, p.245).
  `specialisations[].level` is the **bonus**.
- ⚠ **Chargen gap is 2** (SR3 p.57: spec = base+1, base −1), which is why `SkillData.migrateData` uses 2
  for legacy strings. It's a **start, not a ceiling** — `level: 4` is legitimate; never clamp. The item
  sheet's dropdown only offers Lv1/Lv2 (TODO 88).
- ⚠ **`_isActiveSkill` must delegate to `skillTypeForCategory`** (Martial Arts is active). One classifier.
- ⚠ **Test with fractional and divergent cases** — every book example lands on integers and has
  skill/attribute one apart, so `ceil` vs `floor` and skill- vs attribute-gated caps both pass them.

### The ledger  · TODO 79
`scripts/data/ledger.mjs`. `system.ledger`: `{ when, kind: 'karma'|'nuyen'|'pool', delta, from, to, reason, by }`,
under **📒 Ledger** on the Bio tab.
- ⚠ **Derived from the WRITE** in `SR3EActor.recordLedger` (called by `_preUpdate`), **never from call sites**.
  `tests/ledger.test.mjs` ratchets writers that bypass `actor.update`.
- ⚠ **Rides along in the same update** (no second write, no GM relay), in the caller's spelling (flat or nested).
- ⚠ **A record, not a gate**: unexplained edits are logged with an empty reason. Explain with `options.ledgerReason`.
- ⚠ Delta 0 is not an entry (forms re-send unchanged fields).
- ⚠ **Append-only for players, compared by CONTENT** (`Ledger.reconcile`). Mutant `ledger-rewrite-checks-length-only`.
- ⚠ Capped at `MAX_ENTRIES` (500), oldest trimmed. A write to the ledger itself is never described.

### Buying gear  · *SR3 pp.272-273* — TODO 82
Rules `scripts/data/purchasing.mjs` (pure); flow `scripts/SR3EPurchase.js` (**🛒 Buy gear…**, Bio tab):
pick item + contact, optionally buy the TN down → 🎲 Etiquette vs Availability (`rollThen` → `onSourced`) →
card: delivery N, meet at N/2, price → 🤝 Negotiate (`rollOpposedPair` → `onNegotiated`) → 💴 Pay & receive.
- ⚠ **Availability `24/14 days` = TN 24 + base time 14 days.** Successes **divide the time**, never lower the TN.
- ⚠ Buying the TN down: **2 days and +0.1 Street Index per point**, before the roll, **added to the BASE
  time** (Cheshire: 14 + 24 = 38 → 19 days on 2 successes). Mutant `availability-reduction-shortens-the-wait`.
- ⚠ **Losing the haggle costs**: Negotiation vs their Intelligence, **5% per net success, signed**. Mutant
  `negotiation-loss-is-merely-no-discount`.
- ⚠ The contact is a **hint** (`SOURCE_AFFINITY`; amber for a poor source, never blocked).
- ⚠ **Nothing written until 💴** — then one `actor.update` with `ledgerReason`.
- ⚠ Every number editable (p.272: a guideline). Dwarf-sized gear **+10%**, troll **+25%** (from `system.metatype`).
- Not modelled: Legality/permits (p.273), the Etiquette specialisation. `tests/purchasing.test.mjs` pins
  Cheshire: 38 days, 19 days, ¥12,600, ¥10,080.

### Carried load and Encumbrance  · *SR3 p.274* — TODO 126
`scripts/data/carried-load.mjs`. **⚖ Carried N kg** on the Gear tab from every item not in storage;
installed cyber/bioware weigh nothing; stacks × `quantity`; ammo × rounds/reloads.
⚠ **Optional in the book** — shown, never enforced.

| Load | Effect |
|---|---|
| up to **Strength × 5** kg | no appreciable effect |
| × 10 | **Light** Stun wound after (Body) Combat Turns, then a box every turn |
| × 15 | **Moderate**; cannot run, movement halved |
| × 20 | **Serious**; cannot run, movement quartered |
| heavier | passes out from exertion |

⚠ Each bound is **"up to"** (exactly × 5 is free). Movement penalties stated, not modelled; the Stun is the GM's.
