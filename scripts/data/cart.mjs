/**
 * Buying more than one — a Quantity (TODO 284) and a cart of several lines (TODO 285) · SR3 pp.272-273. Pure.
 *
 * The maintainer bought one 10-round clip for an Ares Thunderer and had no way to buy several (2026-10-28,
 * "quantity now, cart later"). A purchase is now a list of LINES, each `{ name, cost, quantity, index, tn, time,
 * unit, … }` with `cost` the price of ONE; the old single-item purchase is a cart of one line.
 *
 * ⚠ **The racial surcharge is on the TOTAL, rounded once.** SR3 p.272 — *"For troll-modified gear, increase the
 *   price 25 percent"* — says nothing of rounding, and nuyen are whole. Rounding each unit (or each line) first
 *   drifts: four ¥31 clips for a troll are ¥155, not 4 × ¥39 = ¥156.
 * ⚠ **Street Index is per line** (each item has its own, p.273) and the bought-down +0.1 per point applies to each.
 * ⚠ **Through a contact, ONE Etiquette Test against the SLOWEST line** — the highest target number, and the longest
 *   base time, which its successes divide (ruled by the maintainer 2026-11-07; the book's p.272 is written for one
 *   item). The same item × N is one item: one test, as TODO 284 asked.
 * ⚠ **One haggle on the total** (ruled 2026-11-07) — `Purchasing.negotiate` on the cart's price, unchanged.
 * ⚠ **Delivery stacks** (`deliver`): a box counted in reloads lands as ONE item with N × its reloads, loose rounds as
 *   one item with N × its rounds, anything with a `quantity` as one stack, anything else as N copies.
 */
import { Purchasing, REDUCTION } from './purchasing.mjs';
import { AmmoStock } from './ammo-stock.mjs';

const num = n => (Number.isFinite(Number(n)) ? Number(n) : 0);
const si = n => Math.round(num(n) * 10) / 10;

/** Hours in each Availability time unit — to find the slowest line when units differ. */
export const UNIT_HOURS = { hour: 1, day: 24, week: 168, month: 720 };

/** No cart holds more than this many of one thing — a typo guard, not a rule (the GM can buy twice). */
export const MAX_QUANTITY = 999;

export const Cart = {
  UNIT_HOURS, MAX_QUANTITY,

  /** A typed quantity → a whole number, at least 1. */
  qty(n) {
    const q = Math.floor(num(n));
    return Math.min(MAX_QUANTITY, Math.max(1, q));
  },

  /** "4 × 10-Rnd Clip" — or the bare name for one. */
  label(name, quantity) {
    const q = Cart.qty(quantity);
    return q > 1 ? `${q} × ${name}` : String(name ?? '');
  },

  /** The whole cart in one line of text (card headers, the ledger reason). */
  summary(lines = []) {
    return lines.map(l => Cart.label(l.name, l.quantity)).join(', ');
  },

  /** A card payload's lines — older cards (before TODO 284) carried one item and no `lines`. */
  linesOf(payload = {}) {
    if (Array.isArray(payload?.lines) && payload.lines.length) return payload.lines;
    return [{ name: payload?.name ?? 'gear', cost: payload?.cost ?? 0, quantity: 1, index: payload?.index ?? 1,
      itemUuid: payload?.itemUuid ?? '', level: payload?.level ?? null, gunClass: payload?.gunClass ?? '' }];
  },

  /** List cost of the lot, before Street Index or surcharge: Σ unit cost × quantity. */
  listCost(lines = []) {
    return lines.reduce((s, l) => s + num(l.cost) * Cart.qty(l.quantity), 0);
  },

  /** 🏪 At the store · p.273 — the list price of the lot, the surcharge on the total. */
  storePrice(lines = [], { metatype = '' } = {}) {
    return Purchasing.storePrice(Cart.listCost(lines), { metatype });
  },

  /**
   * 🤝 The asking price of the lot · p.273 — Σ cost × quantity × (its Street Index + 0.1 per point bought down),
   * then the surcharge on the total, rounded once.
   */
  askingPrice(lines = [], { reduce = 0, metatype = '' } = {}) {
    const extra = Math.max(0, Math.floor(num(reduce))) * REDUCTION.streetIndexPerPoint;
    const base = lines.reduce((s, l) => s + num(l.cost) * Cart.qty(l.quantity) * si((num(l.index) || 1) + extra), 0);
    return Purchasing.askingPrice(base, 1, { metatype });
  },

  /**
   * The ONE Etiquette Test for the lot (ruled 2026-11-07): the highest target number, and the longest base time in
   * its own unit. Lines with no code (TN 0 / time 0) do not lower it.
   * @returns {{tn:number, time:number, unit:string}}
   */
  slowest(lines = []) {
    let tn = 0, best = null;
    for (const l of lines) {
      tn = Math.max(tn, num(l.tn));
      const unit = UNIT_HOURS[l.unit] ? l.unit : 'day';
      const hours = num(l.time) * UNIT_HOURS[unit];
      if (!best || hours > best.hours) best = { hours, time: num(l.time), unit };
    }
    return { tn, time: best?.time ?? 0, unit: best?.unit ?? 'day' };
  },

  /**
   * What 💴 Pay puts on the sheet for N of one item: an array of item data (the caller creates them).
   * @param {object} data an item's `toObject()` (no `_id`)
   */
  deliver(data, quantity) {
    const q = Cart.qty(quantity);
    if (q === 1 || !data) return data ? [data] : [];
    const sys = { ...(data.system ?? {}) };
    if (data.type === 'ammunition') {
      const st = AmmoStock.stock(sys);
      if (st.unit === 'reloads') sys.reloads = Math.max(1, st.count) * q;
      else sys.rounds = st.count * q;
      return [{ ...data, system: sys }];
    }
    if ('quantity' in sys) {
      sys.quantity = Math.max(1, Math.floor(num(sys.quantity))) * q;
      return [{ ...data, system: sys }];
    }
    return Array.from({ length: q }, () => ({ ...data, system: { ...sys } }));
  },
};
