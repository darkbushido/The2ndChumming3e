---
paths:
  - "scripts/data/karma-uses.mjs"
  - "scripts/data/concealment.mjs"
  - "scripts/SR3EConcealment.js"
  - "tests/concealment.test.mjs"
  - "tests/karma-uses.test.mjs"
  - "scripts/SR3EPurchase.js"
  - "scripts/data/ledger.mjs"
  - "scripts/data/funds.mjs"
  - "scripts/data/gm-only-fields.mjs"
  - "tests/funds.test.mjs"
  - "tests/gm-only-fields.test.mjs"
  - "scripts/data/purchasing.mjs"
  - "scripts/data/carried-load.mjs"
  - "tests/karma.test.mjs"
  - "tests/ledger.test.mjs"
  - "tests/purchasing.test.mjs"
  - "tests/carried-load.test.mjs"
---
# Karma, the ledger, buying gear, encumbrance

### Karma & advancement  · *SR3 p.242-246* (the section opens on p.242; p.243 is art)

| Field | Is | Changes when |
|---|---|---|
| `system.totalKarma` | career odometer | only grows |
| `system.karma` | **Good Karma** — the advancement currency | awards add, purchases subtract |
| `system.karmaPool` | the Karma Pool's **size** · p.246 | awards raise it; **burning** lowers it, for ever |
| `system.karmaPoolSpent` | Karma Pool **spent** since the GM's refresh | spending raises it; the GM's 🍀 Refresh zeroes it |
| `system.powerPointsBought` | adept Power Points bought with Good Karma, on top of Magic · p.168 | the Spend calculator |

Karma Pool shows on the **Attributes** tab (left / size, like Combat Pool); Good/Total Karma on **Bio → Resources**.
- ⚠ **Karma Pool, Good Karma and Total Karma are typeable by the GM only** (TODO 218, `data/gm-only-fields.mjs`).
  A **render-time** lock: the inputs are `readonly disabled` and **unnamed** for a player, `_prepareSubmitData`
  strips the keys (Foundry hands it the *expanded* form), and `_onFieldChange` refuses them. Spending (roll options,
  the Spend calculator, GM-routed verbs) writes through `actor.update` and is untouched. A new GM-only sheet field
  goes in `GmOnlyFields.FIELDS`. Mutants `karma-lock-strips-flat-keys-only`, `karma-lock-only-karma-pool`.

### The Karma Pool in play  · *SR3 p.246-248* — TODO 216 and the audit of 2026-10-11
Rules `scripts/data/karma-uses.mjs` (`KarmaPool`, pure); actor side `spendKarmaPool` / `burnKarmaPool` /
`refreshKarmaPool`, `karmaRollRow` / `readKarmaRollRow`, `_postKarmaHoldCard`, `handleKarmaHold` on `SR3EActor`.
⚠ **Until 2026-10-11 none of it worked**: the dialogs' "Use Karma Pool" box was read by nothing, the one
re-roll function was never called, and a spend lowered the pool's size so the point never came back.
- ⚠ **Spent ≠ burned.** Spend (re-roll, extra dice, avoid a disaster) → `karmaPoolSpent`, back on a refresh.
  Burn (buy successes, Hooper-Nelson) → `karmaPool` drops for ever. Mutant `karma-spend-lowers-the-pool`.
- ⚠ **It does not refresh with the other pools** — "Reset All Pools" and the Combat Turn leave it alone.
  The GM refreshes: 🍀 on the sheet, or **🍀 Refresh Karma Pools** (GM tools; PCs, unticked, "All").
- **Before the roll** — the 🍀 row in all four roll dialogs (attribute, skill, weapon, AoE throw) → `rollPool`:
  extra dice cost 1, 3, 6… capped at the skill/attribute dice **without other pools** (the weapon flows pass
  `karmaDiceCap`, the pool before Combat Pool); Hooper-Nelson (p.248, GM's option) burns 1 per TN point,
  never below 8, warned under TN 12.
- **After the roll** — "Hold the roll for Karma" ticked: the final wave stops on a 🍀 card **before the
  result block** (that block posts dodge/soak cards and draws blast markers — re-running it would post them
  twice). Re-roll failures (1, then 2 more, then 3 more — mutant `karma-reroll-flat-price`; successes never
  re-rolled), avoid a disaster (Rule of One only, and that roll may not be re-rolled — mutant
  `karma-reroll-an-oops-roll`), buy successes (burned; needs one rolled; a `karma: true` die, total 99).
  ✔ Done resolves via `_postWaveCard({ ...state, karmaHold: false })`.
  - The roll state rides on the **message flag** `karmaHold`, not a payload; `karmaHold`/`karmaRerolls`/
    `karmaDisasterAverted` are in the 💥 carry so a re-rolled 6 explodes and comes back to the hold.
  - The buttons are `_isDeciderId` (the roller), claimed once on the message (`karmahold`), and
    `sr-karma-done-btn` is a ⏳ step.
- Not modelled: Karma on opposed rolls (melee, astral, contested — they roll through `_rollWave`), on
  rolls with no dialog (soak, Drain), on physical dice; Open Test re-rolls (`openTestRerollCost` is ready);
  Extended actions (p.248). NPCs have no pool field (TODO 83), so nothing is offered to them.

**Awarding** — **Award Karma…** (GM, Bio → Resources, one character) and **🎖 Session Rewards** (GM, Rollable
Tables: karma, nuyen, a gear note to ticked PCs) both go through `SR3EActor.karmaAward(totalKarma, amount, metatype)`.
- The Pool point goes **instead of** Good Karma, not as well.
- ⚠ **Humans: every TENTH karma; others every twentieth** (p.246) — `karmaPoolDivisor`, case-insensitive on
  free-text `system.metatype`; missing metatype → 20.
- ⚠ When auditing a feature, check that something actually **calls** the function and that sibling tools use it.
- Everyone starts with **1 Karma Pool**. Migration `0.4.5.7` (via `fixActor`) is deliberately **not**
  metatype-aware — pinned to `⌊total / 20⌋ + 1`, matching only Pools exactly equal to the old formula's.

**Spending** (`_onSpendKarmaCalculator`) lists every affordable purchase: attributes, skill increases, new
skills, new specialisations, specialisation increases, and under **Magic**: an adept's Power Point (20, p.168),
learning a spell at a Force (Karma = Force, less the limits taken off the **cost** — each of fetish/exclusive is
taken off the cost OR off Drain, recorded on the spell, p.180-181, TODO 223 — asked in a sub-dialog), and
bonding a focus (Focus Bonding Table, p.190 — `GoodKarma.focusType`/`focusForce`/`bondingCost`; foci are gear
named for their type, bonded = flag `bonded`; weapon foci are melee `isFocus`, bonded = `focusActive`).
⚠ A specialisation over **twice the base** (3 on a base of 1, p.84) is **warned**, not refused.
- **↺ Undo (TODO 212, GM).** Every purchase passes `ledgerRevert` (`{ actor, items, deleteItems }`) with its
  karma write; `recordLedger` puts it on the Good Karma line. The ↺ lists the refund and each change as
  untickable rows, refunds as a NEW line ("↺ Undid: …") and marks the original `reverted`.
  `tests/karma-uses.test.mjs` asserts every karma-spending write in the calculator carries one.
  ⚠ **Foundry expands dotted keys in update OPTIONS** — the record arrives nested; `Ledger.revertPlan`
  flattens it back to field paths (`Ledger.flatten`; arrays stay whole values). Found live, 2026-10-11.
- ⚠ **A weapon focus has no rating** (weapons carry none), so its Force is usually unknown: the row is
  offered at Force 1's price with "Force ? — asked next", and the Force is asked before charging.
- Magic in the Shadows' Good Karma uses (initiation, groups, quickening, anchoring, allies, spirits) are TODO 219.

Pure statics on `SR3EActor` (the sheet can't be imported without Foundry): `karmaSkillCost`, `karmaSpecCost`,
`karmaNewSkillCost`, `karmaAttributeCost`, `karmaAttributeMaximum`, `karmaMaxSpecialisations`,
`karmaSpecTargetRating`, `karmaAward`, `karmaPoolForTotal`. `tests/karma.test.mjs` + a mutant per rule.
The rest are on `GoodKarma` / `KarmaPool` in `scripts/data/karma-uses.mjs`; e2e `tests/e2e/karma.spec.mjs`.

**Importing from the Character Generator** (TODO 217): its `karma` is Good Karma EARNED — the import takes
`karma − karmaSpent`, sets `totalKarma` from the `log` of `addKarma` awards (else earned + pool points), takes
`karmaPool − karmaPoolBurned`, and brings `purchasedPowerPoints` across. Without Total Karma the next award
re-crossed the pool threshold from 0 and granted points twice.

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
  sheet's dropdown offers Lv0 upward, past the current value.
- ⚠ **A specialisation keeps its OWN rating when the base rises** (p.245, rules-check 0.7.0): `preUpdateItem` in
  `sr3e.js` calls `SkillRules.specsAfterRatingChange` (`data/skill-rules.mjs`), lowering every `level` by the rise (a fall
  raises it). Floors at **0** when the base catches up (book silent; spec kept, rolls as the base). Rating 0 (unlearned) is
  skipped, and an update that carries `system.specialisations` itself (Undo, item sheet) is left as written. The schema has
  **no max** on `level` (it was 2). Mutants `spec-rises-with-the-base`, `spec-bonus-goes-negative`.
- ⚠ `karmaAttributeMaximum` IS `racialMax` (rounds half up: 7→11, 9→14, 11→17); mutant `karma-attr-maximum-floors`.
- ⚠ **`_isActiveSkill` must delegate to `skillTypeForCategory`** (Martial Arts is active). One classifier.
- ⚠ **Test with fractional and divergent cases** — every book example lands on integers and has
  skill/attribute one apart, so `ceil` vs `floor` and skill- vs attribute-gated caps both pass them.

### The ledger  · TODO 79
`scripts/data/ledger.mjs`. `system.ledger`: `{ when, kind: 'karma'|'total'|'nuyen'|'pool'|'poolSpent', delta, from, to,
reason, by, revert?, reverted? }`, on the **📒 Ledger** tab (every entry; From → To, By; GM-only ✕) with the latest
`BIO_LEDGER_ROWS` (8) on the Bio tab (TODO 153). Labels by `specForKind(kind)`.
- ⚠ **The GM's ✕ removes history, never the totals**, through `Ledger.without`, which returns null when the entry at
  that index is not the one the sheet drew (a stale click). Mutant `ledger-delete-ignores-a-stale-row`.
- ⚠ **Derived from the WRITE** in `SR3EActor.recordLedger` (called by `_preUpdate`), **never from call sites**.
  `tests/ledger.test.mjs` ratchets writers that bypass `actor.update`.
- ⚠ **Rides along in the same update** (no second write, no GM relay), in the caller's spelling (flat or nested).
- ⚠ **A record, not a gate**: unexplained edits are logged with an empty reason. Explain with `options.ledgerReason`.
- ⚠ Delta 0 is not an entry (forms re-send unchanged fields).
- ⚠ **Append-only for players, compared by CONTENT** (`Ledger.reconcile`). Mutant `ledger-rewrite-checks-length-only`.
- ⚠ Capped at `MAX_ENTRIES` (500), oldest trimmed. A write to the ledger itself is never described.
- ⚠ **A copy starts with an empty ledger** (TODO 193): Foundry's Duplicate copies `system.ledger`, so the copy
  showed the source's history as its own. `Ledger.inherited` (`_stats.duplicateSource`) in `preCreateActor`,
  and the `sr3e.actor.create` copy branch clears it itself (it deletes `_stats`). A **compendium import keeps**
  its history. Mutant `ledger-duplicate-inherits-history`.
- 🔴 **Array defaults are FACTORIES — `initial: () => []`, never `initial: []`** (TODO 197). A literal is one
  array shared by every document created without the field, and Foundry commits updates into it in place: one
  character's ledger entry appeared on every character without one, and was saved for real on their next write.
  `tests/ledger.test.mjs` fails on any literal array/object default in the data models.


### ± Funds and giving money  · TODO 192
`scripts/data/funds.mjs` (`Funds`, pure) · the **± Funds…** button beside Nuyen (`_onAdjustFunds`) · verb `sr3e.money.give`.
- **± adds or takes away** an amount with an optional reason (`ledgerReason`, so the 📒 reads it; empty → "By hand").
  **Give** pays another LIVE **player character** (`Funds.recipients` with `SR3EQuery.isPlayerCharacter` — world-wide, not the scene).
- ⚠ **± warns, never refuses; a GIFT is blocked** (ruled 2026-10-17 by the maintainer). `system.nuyen` floors at 0, so a
  Take away above the balance is flagged and stops at 0. A **gift** more than the payer has, negative, zero or
  fractional (`Funds.validateGift`) is BLOCKED: the dialog's Confirm is disabled with the reason and the verb throws. A gift
  is only between two player characters (`Funds.giftParties`; the verb rejects an NPC either side). What the recipient gets
  is exactly what left the payer. Mutants `funds-gift-creates-nuyen`, `funds-gift-pays-what-you-have`,
  `funds-gift-negative-allowed`, `funds-gift-fraction-floored`, `funds-gift-to-non-player`,
  `funds-recipients-include-non-players`, `funds-subtract-goes-negative`, `funds-short-is-silent`.
- ⚠ **A gift is ONE GM verb that writes BOTH characters** — a player cannot write another's actor, and a
  credit-only verb would let anyone mint nuyen. The GM checks the requester OWNS the payer (`Funds.mayPayFrom`),
  works from LIVE balances, debits then credits (putting the debit back if the credit fails), and the giver's
  name is `ledgerBy` on both lines ("Gave to X" / "Received from X"). Serialised under the single key
  `sr3e:money` — per-actor keys would deadlock A→B with B→A. A whispered 💴 chat line tells the owners and GM.

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
- **Finding the item (TODO 154, `scripts/data/gear-search.mjs`)**: a 🔎 search over the gear packs' **indexes**
  (`pack.getIndex({ fields })`, never `getDocuments`) and a drop onto the dialog fill the same fields through one
  `take()`. ⚠ **Both go through `SR3ESourceBooks.packAllowed`** (`gearPacks()` / `resolveDrop`); a book switched
  off is not searched, but a **drop** from one (or of a non-buyable type) now only **warns and still fills the form**
  (`GearSearch.dropWarnings`, ruled 2026-10-17); a non-Item drop fills nothing. Enter in the box is `preventDefault`ed. Mutants `gear-search-*`.
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

### 👁 Concealment — what a character carries that shows  · *SR3 p.45, p.231-232, p.236-237, p.270* — TODO 195
`SR3EConcealment.open(actor)` (`scripts/SR3EConcealment.js`; GM-only — the Rollable Tables sidebar and a button on a
character's Attributes tab). Rules and the heuristic: `scripts/data/concealment.mjs` (pure).
- **Concealability is the TARGET NUMBER of the Perception Test to notice the item** (p.45, p.231, p.270), so a **lower**
  number is easier to spot: the list sorts **least concealed first** — in-hand weapons and obvious chrome (no test), then
  ascending, the GM's-call rows, the unrated last.
- **Shown:** weapons (`firearm`/`melee`/`projectile`/`thrown`, not fists, not stored): in hand (`ready`) = plain sight, no
  test; stowed = its Concealability; an implanted weapon (`CYB`/`hands: 0`) is listed as the weapon. **Worn** armour only
  (`SR3EActor.wornArmorItems`). **Implants** only when category and name mark an outward part (`classifyImplant`): obvious
  cyberlimbs/cyberskull/torso/Kid Stealth and cyberears (no test); **synthetic** limbs (**8**, p.303; +3 under clothing,
  p.301) and an Induction Datajack (**10**, M&M p.21) are disguised; cybereyes and a plain datajack are the GM's call.
- **A search's target number is the FULL Concealability plus the Physical Search Modifiers Table** · p.237 *"make a standard
  Perception Test against the Concealability … Apply the modifiers in the Physical Search Modifiers Table"* (table p.236).
  **Ruled 2026-10-17 by the maintainer:** p.270's "half the regular Concealability Rating (rounding down)" for searches is
  NOT used. Two modes (`NOTICE`, `SEARCH_FULL`). A 6-10 minute strip search finds the weapon, no roll.
- The roll is `rollPool` + `FOLLOW_UPS.concealPerception`, which reads the Perception Success Table (p.232). Nothing is
  written back to an item; typed Concealability numbers affect that card only.
