/**
 * The "Essence hole" and its Essence Slot surgery option · *M&M p.150* (TODO 53). Pure — no Foundry.
 *
 * > **Essence Slot (Implant, +2 Threshold)** — "If the character previously had cyberware removed, a new
 * > implant with this option can be installed within the 'Essence hole' left behind by the earlier
 * > implant. In other words, the old implant's Essence Cost can be subtracted from the new implant's
 * > Essence Cost."
 *
 * ⚠ **Removing cyberware still refunds NOTHING** (M&M p.147, TODO 5). A hole is a *record* of what was
 * removed, never a change to `essence.lost`: the Essence stays spent until a surgeon fits something into
 * the hole, and the option costs +2 on the surgery Threshold.
 * ⚠ **The discount is OPT-IN, per implant** — `system.essenceSlot` on the cyberware, ticked before it is
 * installed. Applying it by default would hand every character a free, permanent Essence Slot on every
 * implant, which is exactly what TODO 5 refused to do.
 * ⚠ **One hole per implant, consumed whole.** The new implant occupies the hole; what is left over is
 * NOT lent to the next implant, or a 2.0 hole would quietly discount four 0.5 implants. M&M does not say
 * either way — **a question for the maintainer**, and `fill` is the one place to change it.
 * ⚠ **`pick` takes the smallest hole that covers the cost**, so a big hole is not burned on a cheap
 * implant while a snug one sits unused; with none big enough it takes the largest, for the best discount
 * available.
 *
 * There is no surgery flow (no Thresholds, no Stress — TODO 109), so the +2 Threshold is **stated, never
 * enforced**: `THRESHOLD_MOD` is here so the sheet and any later surgery rules read one number.
 */
export const PAGE = 'M&M p.150';
export const THRESHOLD_MOD = 2;

/** Essence rounds to 2dp everywhere in this system (M&M p.45's "round all numbers up" is per item). */
const r2 = n => parseFloat((Number(n) || 0).toFixed(2));

export const EssenceHoles = {
  PAGE,
  THRESHOLD_MOD,

  /** The holes on an actor's system data, newest last. Always an array. */
  list(sys) {
    return Array.isArray(sys?.essenceHoles) ? sys.essenceHoles : [];
  },

  /** Every hole's Essence added up — what the character could still reclaim by surgery. */
  total(holes) {
    return r2(EssenceHoles.list({ essenceHoles: holes }).reduce((a, h) => a + (Number(h?.amount) || 0), 0));
  },

  /**
   * The holes with one more recorded. A removal worth nothing (0 or less) records nothing.
   * @param {Array} holes
   * @param {{name?:string, amount:number, at?:number, grade?:string}} hole
   */
  record(holes, { name = '', amount = 0, at = Date.now(), grade = '' } = {}) {
    const a = r2(amount);
    if (!(a > 0)) return EssenceHoles.list({ essenceHoles: holes });
    return [...EssenceHoles.list({ essenceHoles: holes }),
            { id: `${at}-${Math.round(a * 100)}`, name: String(name ?? ''), amount: a, at, grade: String(grade ?? '') }];
  },

  /** Which hole to fill with an implant costing `cost` — the index, or -1 when there is none. */
  pick(holes, cost) {
    const list = EssenceHoles.list({ essenceHoles: holes });
    if (!list.length) return -1;
    const c = r2(cost);
    let best = -1;
    for (let i = 0; i < list.length; i++) {
      const a = Number(list[i]?.amount) || 0;
      if (a < c) continue;                                   // too small to cover it
      if (best < 0 || a < (Number(list[best]?.amount) || 0)) best = i;   // the snuggest fit
    }
    if (best >= 0) return best;
    // Nothing covers it: take the largest, for the biggest discount going.
    let big = 0;
    for (let i = 1; i < list.length; i++) {
      if ((Number(list[i]?.amount) || 0) > (Number(list[big]?.amount) || 0)) big = i;
    }
    return (Number(list[big]?.amount) || 0) > 0 ? big : -1;
  },

  /**
   * Fit an implant costing `cost` into a hole.
   * @returns {{discount:number, charge:number, holes:Array, used:object|null, wasted:number}}
   *   `charge` — the Essence this implant actually costs; `wasted` — hole left unused and discarded.
   */
  fill(holes, cost) {
    const list = EssenceHoles.list({ essenceHoles: holes });
    const c    = r2(cost);
    const i    = EssenceHoles.pick(list, c);
    if (i < 0 || !(c > 0)) return { discount: 0, charge: c, holes: list, used: null, wasted: 0 };
    const hole     = list[i];
    const amount   = r2(hole.amount);
    const discount = r2(Math.min(amount, c));
    return {
      discount,
      charge: r2(c - discount),
      holes:  list.filter((_, j) => j !== i),   // consumed whole — see the warning above
      used:   hole,
      wasted: r2(amount - discount),
    };
  },
};
