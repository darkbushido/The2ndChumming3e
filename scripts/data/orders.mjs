/**
 * Orders not yet delivered, and recoveries not yet finished · TODO 288
 *
 * Pure rules — no Foundry. `SR3EOrders.js` keeps the state in a world setting the GM writes.
 *
 * The maintainer's request (2026-11-07): between missions gear arrives at once; IN SESSION it takes time,
 * and the same toggle governs healing. Settled design (grilled rounds 1–2, confirmed by the maintainer):
 *  - One world toggle, GM-only: ⏱ Downtime (instant, as before) / ⏱ In session (time passes).
 *  - In session a CONTACT purchase is ordered, not paid (SR3 p.273: payment happens at pickup — "the
 *    contact bringing the gear and the character the nuyen"); a STORE purchase stays instant.
 *  - The GM's 📦 Deliver charges and creates; a buyer short of cash is warned, never refused.
 *  - Natural healing (the Healing Table, p.127, and Stun rest, p.126) is started, then finished by the GM.
 *    First aid and magic stay instant (pp.129, 194).
 *  - New damage during a recovery: warn ("wounds changed"), the GM still applies.
 *  - Cancel is GM-only; it notes the contact's Availability may rise next time (p.273) — said, not applied.
 *  - Flipping to Downtime offers to deliver/finish what is waiting, each ticked; nothing without Confirm.
 */

export const MODES = Object.freeze({ downtime: 'downtime', session: 'session' });

export const Orders = {
  MODES,

  /** The empty state the setting starts with. */
  empty() { return { orders: [], recoveries: [] }; },

  /** A stored value of any shape (an older or hand-edited world) read as a state. */
  normalize(state) {
    return {
      orders: Array.isArray(state?.orders) ? state.orders : [],
      recoveries: Array.isArray(state?.recoveries) ? state.recoveries : [],
    };
  },

  /** Does this mode make things wait? Anything but 'session' is Downtime (the old behaviour). */
  waits(mode) { return mode === MODES.session; },

  /** The note everyone sees on the Buy gear dialog and the healing cards (Q11). */
  modeLabel(mode) {
    return Orders.waits(mode) ? '⏱ In session — contact orders and natural healing take time'
                              : '⏱ Downtime — gear and healing are instant';
  },

  /**
   * What a purchase card's money button does: 'order' (📝 Place order, nothing paid) or 'pay' (💴 as before).
   * Only a contact purchase in session waits; the store is instant (Q2 — p.272 times only the contact route).
   */
  payMode(mode, { store = false } = {}) {
    return Orders.waits(mode) && !store ? 'order' : 'pay';
  },

  /** Add an order. Idempotent by id — a re-delivered query adds nothing. */
  place(state, order) {
    const s = Orders.normalize(state);
    if (!order?.id || s.orders.some(o => o.id === order.id)) return s;
    return { ...s, orders: [...s.orders, { ...order }] };
  },

  /** Add a recovery. Idempotent by id. */
  startRecovery(state, rec) {
    const s = Orders.normalize(state);
    if (!rec?.id || s.recoveries.some(r => r.id === rec.id)) return s;
    return { ...s, recoveries: [...s.recoveries, { ...rec }] };
  },

  /** Take one order or recovery out (delivered, finished or cancelled). */
  remove(state, kind, id) {
    const s = Orders.normalize(state);
    const key = kind === 'recovery' ? 'recoveries' : 'orders';
    return { ...s, [key]: s[key].filter(x => x.id !== id) };
  },

  find(state, kind, id) {
    const s = Orders.normalize(state);
    return (kind === 'recovery' ? s.recoveries : s.orders).find(x => x.id === id) ?? null;
  },

  /** One buyer's open orders (`refs`: the actor's id and/or token uuid) — the read-only "On order" list on their Gear tab. */
  forBuyer(state, refs) {
    const want = new Set([refs].flat().filter(Boolean));
    return Orders.normalize(state).orders.filter(o => want.has(o.buyerId));
  },

  /**
   * 📦 Deliver: what the buyer pays and is left with. Short of cash is a WARNING (p.273 — the GM decides),
   * and nuyen never goes below zero, as 💴 Pay already does.
   */
  settle(price, have) {
    const p = Math.max(0, Number(price) || 0), h = Number(have) || 0;
    return { price: p, short: p > h, after: Math.max(0, h - p) };
  },

  /** The wounds a recovery is checked against. */
  snapshot(wounds = {}) {
    return { physical: Number(wounds.physical) || 0, overflow: Number(wounds.overflow) || 0, stun: Number(wounds.stun) || 0 };
  },

  /**
   * Have the wounds moved since the recovery started (Q10)? Only the track this recovery heals counts:
   * a Physical recovery is unaffected by Stun, and a Stun rest by Physical.
   */
  changed(rec, now) {
    const a = Orders.snapshot(rec?.from), b = Orders.snapshot(now);
    return rec?.kind === 'eraseStun' ? a.stun !== b.stun : (a.physical !== b.physical || a.overflow !== b.overflow);
  },

  /** Flipping to Downtime: what to offer (Q8). Empty → no dialog. */
  downtimeOffer(state) {
    const s = Orders.normalize(state);
    return { orders: s.orders.length, recoveries: s.recoveries.length, any: s.orders.length + s.recoveries.length > 0 };
  },

  /** The Availability warning a cancel carries — words only (p.273). */
  CANCEL_NOTE: 'The deal is off. The GM may raise this contact\'s Availability for the next purchase (SR3 p.273) — not applied.',
};
