/**
 * The "Essence hole" and its Essence Slot surgery option · *M&M p.150* (TODO 53). Pure — no Foundry.
 *
 * > **Essence Slot (Implant, +2 Threshold)** — "If the character previously had cyberware removed, a new
 * > implant with this option can be installed within the 'Essence hole' left behind by the earlier
 * > implant. In other words, the old implant's Essence Cost can be subtracted from the new implant's
 * > Essence Cost."
 *
 * ⚠ **One pooled number, not a list of removed implants** — the maintainer, 2026-09-16: *"we don't need to
 * track what implant was removed, they just have an essence hole."* Removing a 3.0 implant makes a 3.0
 * hole; fitting a 2.0 implant into it leaves a **1.0 hole**, which keeps being tracked until it is used up.
 * Nothing in M&M needs the removed implant remembered — the Essence *slots* on p.127 are for choosing
 * which INSTALLED implant a wound hits, a different thing.
 * ⚠ **Removing cyberware still refunds NOTHING** (M&M p.147, TODO 5). The hole is a record of what could
 * be reclaimed by surgery, never a change to `essence.lost`.
 * ⚠ **The discount is opt-in, per implant** — `system.essenceSlot` on the cyberware, ticked before it is
 * installed. Applying it by default would hand every character a free Essence Slot on every implant.
 * ⚠ **The GM edits the hole directly** (the sheet's number box) — for player error and bookkeeping, and
 *   nothing else. There is no way to regain Essence (the maintainer, 2026-09-16): nothing but an Essence
 *   Slot implant fills the hole.
 *
 * There is no surgery flow (no Thresholds — TODO 109 built Stress, not surgery), so the +2 Threshold is
 * **stated, never enforced**.
 */
export const PAGE = 'M&M p.150';
export const THRESHOLD_MOD = 2;

/** Essence rounds to 2dp everywhere in this system. */
const r2 = n => Math.max(0, parseFloat((Number(n) || 0).toFixed(2)));

export const EssenceHoles = {
  PAGE,
  THRESHOLD_MOD,

  /** The hole on an actor's system data, in Essence. Always a number, never negative. */
  of(sys) {
    return r2(sys?.essenceHole);
  },

  /** The hole after removing an implant that cost `amount` Essence. */
  add(hole, amount) {
    return r2(r2(hole) + r2(amount));
  },

  /**
   * Fit an implant costing `cost` into the hole.
   * @returns {{discount:number, charge:number, hole:number}}
   *   `charge` — the Essence this implant still costs; `hole` — what is left of the hole afterwards.
   */
  fill(hole, cost) {
    const h = r2(hole), c = r2(cost);
    const discount = r2(Math.min(h, c));
    return { discount, charge: r2(c - discount), hole: r2(h - discount) };
  },
};
