/**
 * What Karma buys — the Karma Pool in play, and Good Karma between runs.  · *SR3 p.244-246*
 * Pure: no Foundry. The costing statics for attributes and skills predate this file and stay on
 * `SR3EActor` (`karmaSkillCost` & co.); this holds everything the audit of 2026-10-11 found missing.
 *
 * ── THE KARMA POOL (p.246) ───────────────────────────────────────────────────────────────────
 *
 * > "Since Karma Pool reflects the mystical nature of luck, it does not refresh every Combat Turn
 * > like other dice pools. Instead Karma Pools refresh on an abstract basis, determined by the
 * > gamemaster." — p.246
 * > "the rules are calling for a character to permanently give up or lose a point (or points) of
 * > Karma Pool. Subtract it, for it is gone forever; burned Karma Pool dice do not refresh." — p.246
 *
 * So the pool is a SIZE (`system.karmaPool`) and a count SPENT since the last refresh
 * (`system.karmaPoolSpent`), exactly like Combat Pool. **Spending** raises the count and comes back
 * on a refresh; **burning** lowers the size and never comes back. Until this file the sheet had one
 * number that a spend lowered, so a spent point was gone for good — a burn by another name.
 *
 * ⚠ **Over-spending is reported, never refused** (the ethos). `spend` and `burn` return `over`
 * when the pool could not cover it; the caller warns and the GM decides.
 *
 * Every use the book lists, and its price:
 *
 * | Use (p.246)               | Price                                   | Spent or burned |
 * |---------------------------|-----------------------------------------|-----------------|
 * | Re-roll failures          | 1, then 2 more, then 3 more… per re-roll | spent           |
 * | Avoid a disaster          | 1 — the Rule of One becomes a failure   | spent           |
 * | Open Test re-roll         | 1, then 2 more… per die                 | spent           |
 * | Buy additional dice       | 1, then 2 more… per die, ≤ base dice     | spent           |
 * | Buy successes             | 1 per success, needs one rolled          | **burned**      |
 * | Hooper-Nelson (p.248)     | 1 per point of TN, TN 12+, not below 8   | **burned**      |
 *
 * ── GOOD KARMA (p.168, p.180, p.190, p.84) ──────────────────────────────────────────────────
 *
 * Power Points (20 each), learning a spell (Karma = Force), bonding a focus (the Focus Bonding
 * Table) and the specialisation ceiling (twice the base skill). Initiation, quickening, magical
 * groups, allies and the rest of Magic in the Shadows are TODO 219.
 */

const int = n => (Number.isFinite(Number(n)) ? Math.trunc(Number(n)) : 0);
const pos = n => Math.max(0, int(n));

/** 1 + 2 + … + n: the running total of an incrementally priced purchase (p.246). */
const triangle = n => { const k = pos(n); return (k * (k + 1)) / 2; };

export const KarmaPool = {
  PAGE: 'SR3 p.246',

  /** The pool's size, its spent count, and what is left. Missing fields read as a fresh pool. */
  state(sys) {
    const size  = pos(sys?.karmaPool);
    const spent = pos(sys?.karmaPoolSpent);
    return { size, spent, available: Math.max(0, size - spent) };
  },

  available(sys) { return KarmaPool.state(sys).available; },

  /**
   * Spend `n` (comes back on a refresh). Returns the fields to write and whether it was more than
   * the pool had — recorded anyway, never refused.
   */
  spend(sys, n) {
    const { spent, available } = KarmaPool.state(sys);
    const k = pos(n);
    return { update: { karmaPoolSpent: spent + k }, over: k > available };
  },

  /**
   * Burn `n` (gone for ever, p.246). The size drops; what was spent stays spent, so the available
   * figure drops by the same amount. ⚠ Floored at 0 — a burn cannot make the pool negative.
   */
  burn(sys, n) {
    const { size, available } = KarmaPool.state(sys);
    const k = pos(n);
    return { update: { karmaPool: Math.max(0, size - k) }, over: k > available };
  },

  /** The GM's refresh: everything spent comes back; burned points do not, because they left the size. */
  refresh() { return { karmaPoolSpent: 0 }; },

  /**
   * The price of the NEXT re-roll of the same test: 1 for the first, 2 more for the second, 3 more
   * for the third (p.246, *"It costs 1 Karma Pool die to re-roll failures once, 2 Karma Pool dice
   * (for a total of 3) to re-roll failures again"*). `done` is how many re-rolls the test has had.
   */
  rerollCost(done) { return pos(done) + 1; },

  /** Total for `n` re-rolls of one test: 1, 3, 6, 10… */
  rerollTotal(n) { return triangle(n); },

  /**
   * Buying additional dice (p.246): *"spend 1 point of Karma to buy an additional die … up to a
   * maximum of however many skill, Attribute or rating dice he is currently using (not including
   * dice from other pools) … (2 more Karma Pool for a second die, 3 more Karma Pool for a third,
   * and so on)"*. Returns the price of `n` dice and the ceiling they are measured against.
   */
  extraDiceCost(n) { return triangle(n); },
  extraDiceCap(baseDice) { return pos(baseDice); },

  /** Open Test (p.246): re-rolling 1 die costs 1, 2 dice 3, 3 dice 6 — the same triangle, per die. */
  openTestRerollCost(dice) { return triangle(dice); },

  /** Avoiding a disaster (p.246): 1 point, and only on a roll where every die is a 1. */
  AVOID_DISASTER_COST: 1,

  /** Buying successes (p.246): 1 point BURNED per success, and only if one was rolled. */
  canBuySuccesses(successesRolled) { return pos(successesRolled) >= 1; },
  buySuccessesCost(n) { return pos(n); },

  /**
   * What the Karma Pool may do with a finished roll. ⚠ On a Rule of One the only use is avoiding
   * the disaster: *"A player may not spend additional Karma to re-roll failed dice on an 'oops'
   * roll"* (p.246). Successes cannot be re-rolled (*"Once a dice comes up as a success, it may not
   * be re-rolled"*), so a roll with no failures has nothing to re-roll. An averted disaster stays an
   * "oops" roll: it is now a plain failure, and still may not be re-rolled.
   */
  options({ successes, failures, glitch, disasterAverted = false }) {
    const oops = !!glitch || !!disasterAverted;
    return {
      reroll:        !oops && pos(failures) > 0,
      avoidDisaster: !!glitch && !disasterAverted,
      buySuccesses:  !oops && KarmaPool.canBuySuccesses(successes),
    };
  },

  /**
   * The Hooper-Nelson rule (p.248), a GM's option: burn Karma Pool to lower *"a spectacularly
   * difficult"* target number, one point per point. *"We recommend that this rule not be used unless
   * the Target Number is 12 or higher. The lowest a target number can be reduced to using this option
   * is 8."* Returns the new TN and what that actually burns (never below 8, never above the ask).
   * `recommended` is false under TN 12 — reported, not refused, because it is the GM's rule to bend.
   */
  hooperNelson(tn, burn) {
    const t = int(tn);
    const want = pos(burn);
    const room = Math.max(0, t - 8);
    const used = Math.min(want, room);
    return { tn: t - used, burned: used, recommended: t >= 12 };
  },
};

/* ── Good Karma ────────────────────────────────────────────────────────────────────────────── */

/**
 * The Focus Bonding Table (SR3 p.190). `perForce` × Force; a weapon focus is (3 + Reach) × Force.
 * Keys are matched against the item's name — foci ship as plain gear named for their type
 * ("Power Focus (Rating 1)", "Specific Spell Focus (Invisibility)") and as melee weapons flagged
 * `isFocus`. ⚠ Order matters: "Spell Category" must be tried before "Spell".
 */
export const FOCUS_BONDING = [
  { key: 'expendable', label: 'Expendable Spell Focus', perForce: 0, re: /expendable/i },
  { key: 'category',   label: 'Spell Category Focus',   perForce: 3, re: /spell\s*category|category\s*focus/i },
  { key: 'specific',   label: 'Specific Spell Focus',   perForce: 1, re: /specific\s*spell|spell\s*focus/i },
  { key: 'spirit',     label: 'Spirit Focus',           perForce: 2, re: /spirit\s*focus/i },
  { key: 'power',      label: 'Power Focus',            perForce: 5, re: /power\s*focus/i },
  { key: 'sustaining', label: 'Sustaining Focus',       perForce: 1, re: /sustaining/i },
  { key: 'weapon',     label: 'Weapon Focus',           perForce: null, re: /weapon\s*focus/i },
];

/** A Force written in a focus's name: "(Rating 2)", "Weapon Focus 2", "Force 3". Null when none. */
function forceFromName(name) {
  const m = String(name ?? '').match(/(?:rating|force|focus)\s*[:(]?\s*(\d+)/i);
  return m ? int(m[1]) : null;
}

export const GoodKarma = {
  /** Adept Power Points bought in play (p.168): *"at a cost of 20 Good Karma Points per Power Point"*. */
  POWER_POINT_COST: 20,
  powerPointCost(n = 1) { return pos(n) * 20; },

  /**
   * Learning a spell (p.180): *"Learning spells also costs Good Karma … equal to the desired Force."*
   * A limit (fetish, exclusive — p.181) may instead *"reduce the Karma cost and difficulty to learn the
   * spell, by its modifier"*: Fireball at Force 8 with the −2 limit costs 6. Never below 0.
   */
  spellCost(force, limitModifier = 0) {
    return Math.max(0, pos(force) - pos(limitModifier));
  },

  /**
   * Which row of the Focus Bonding Table a focus is, from its type and name. Null = not a focus we
   * can price (the GM types the cost). A melee item flagged `isFocus` is a weapon focus whatever its name.
   */
  focusType(item) {
    if (!item) return null;
    if (item.type === 'melee') return item.system?.isFocus ? FOCUS_BONDING.find(f => f.key === 'weapon') : null;
    const name = String(item.name ?? '');
    if (!/focus|foci/i.test(name)) return null;
    return FOCUS_BONDING.find(f => f.re.test(name)) ?? null;
  },

  /** A focus's Force: the item's rating if it has one, else the number in its name. Null when neither. */
  focusForce(item, rating = null) {
    const r = int(rating);
    if (r > 0) return r;
    return forceFromName(item?.name);
  },

  /**
   * The Karma to bond a focus (p.190). `reach` only matters for a weapon focus: *"(3 + Weapon Reach)
   * x Force"*. Null when the type or Force is unknown — the caller asks rather than guessing.
   */
  bondingCost(typeKey, force, reach = 0) {
    const f = int(force);
    if (!(f > 0)) return null;
    const row = FOCUS_BONDING.find(r => r.key === typeKey);
    if (!row) return null;
    if (row.key === 'weapon') return (3 + pos(reach)) * f;
    return row.perForce * f;
  },

  /**
   * The ceiling on a specialisation (p.84, p.245): *"A specialization rating may not be more than
   * twice its base skill rating (with the exception of base skills of 1 with specializations of 3)"*.
   * ⚠ Reported, never refused — `over` is a warning on the purchase row.
   */
  specCeiling(baseRating) {
    const b = pos(baseRating);
    return b === 1 ? 3 : 2 * b;
  },
  specOverCeiling(baseRating, newSpecRating) {
    return pos(newSpecRating) > GoodKarma.specCeiling(baseRating);
  },
};
