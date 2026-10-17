/**
 * 🛒 Buy gear: finding the item · TODO 154 (requested in the trial session, 2026-09-23). Pure: no Foundry.
 *
 * The Buy gear dialog (TODO 82) can be opened with no item. Two ways to name one:
 *   - **search** the gear compendiums by name, off the packs' INDEXES (never a full document load);
 *   - **drag** an item from a compendium onto the dialog.
 * Either way the fields the dialog already has (Availability TN and time, cost, Street Index) are
 * filled from the item — and stay editable, because p.272 calls Availability a guideline.
 *
 * ⚠ **Both paths respect the source-book filter** (`SR3ESourceBooks.packAllowed`). This file only
 * matches and ranks what the caller has already filtered; the caller (`SR3EPurchase`) does the
 * filtering, and `tests/gear-search.test.mjs` pins that both paths call it.
 *
 * ⚠ **Warn, never refuse** for the match itself: an empty search lists nothing rather than everything
 * (a few thousand rows is not a list), and a drop that is not gear is explained, not silently ignored.
 */
import { Purchasing } from './purchasing.mjs';

/** The index fields the search reads — `pack.getIndex({ fields })`. */
export const INDEX_FIELDS = ['system.availability', 'system.cost', 'system.streetIndex', 'system.bookPage'];

/** At most this many hits are drawn. */
export const MAX_HITS = 40;

const fold = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const GearSearch = {
  INDEX_FIELDS,
  MAX_HITS,

  /** The words of a query, lowercase and accent-free; blank for a blank query. */
  tokens(query) {
    return fold(query).split(/[^a-z0-9.+\-/]+/).filter(Boolean);
  },

  /** Does the item's name contain EVERY word of the query? A blank query matches nothing. */
  matches(entry, query) {
    const words = GearSearch.tokens(query);
    if (!words.length) return false;
    const name = fold(entry?.name);
    return words.every(w => name.includes(w));
  },

  /**
   * How well a name fits, lower is better: 0 the whole name, 1 starts with the query, 2 a word starts
   * with it, 3 contains it. Ties fall back to name order in `search`.
   */
  rank(entry, query) {
    const name = fold(entry?.name);
    const q = GearSearch.tokens(query).join(' ');
    if (name === q) return 0;
    if (name.startsWith(q)) return 1;
    if (new RegExp(`(^|[^a-z0-9])${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(name)) return 2;
    return 3;
  },

  /**
   * Entries `{ name, type, uuid, … }` that fit the query, best first, only the `types` a character can
   * buy. `types` omitted means no type filter.
   */
  search(entries, query, { types = null, limit = MAX_HITS } = {}) {
    return (entries ?? [])
      .filter(e => (!types || types.includes(e.type)) && GearSearch.matches(e, query))
      .map(e => ({ e, r: GearSearch.rank(e, query) }))
      .sort((a, b) => a.r - b.r || String(a.e.name).localeCompare(String(b.e.name)))
      .slice(0, limit)
      .map(x => x.e);
  },

  /** One pack-index row → a search entry. `index` is what `pack.getIndex({ fields: INDEX_FIELDS })` holds. */
  fromIndex(row, pack) {
    const sys = row?.system ?? {};
    return {
      name: row?.name ?? '',
      type: row?.type ?? '',
      uuid: row?.uuid ?? (pack?.collection && row?._id ? `Compendium.${pack.collection}.Item.${row._id}` : ''),
      pack: pack?.collection ?? '',
      packLabel: pack?.metadata?.label ?? pack?.title ?? '',
      availability: sys.availability ?? '',
      cost: sys.cost ?? 0,
      streetIndex: sys.streetIndex ?? 1,
      bookPage: sys.bookPage ?? '',
    };
  },

  /** The dialog fields an entry (or an item) fills in, in the dialog's own terms. */
  fields(entry) {
    const avail = Purchasing.parseAvailability(entry?.availability ?? entry?.system?.availability ?? '');
    return {
      name: entry?.name ?? '',
      type: entry?.type ?? 'gear',
      tn: avail.tn || 4,
      time: avail.time || 1,
      unit: avail.unit || 'day',
      cost: Number(entry?.cost ?? entry?.system?.cost) || 0,
      index: Number(entry?.streetIndex ?? entry?.system?.streetIndex) || 1,
      uuid: entry?.uuid ?? '',
      always: !!avail.always,
      unknown: !!avail.unknown && !avail.always,
    };
  },

  /**
   * What a drop onto the dialog is: `{ ok, uuid }` for an Item, else `{ ok: false, why }`. The caller
   * resolves the uuid and applies the book filter and the buyable types.
   */
  parseDrop(data) {
    if (!data || typeof data !== 'object') return { ok: false, why: 'Nothing was dropped.' };
    if (data.type !== 'Item') return { ok: false, why: 'Only an item can be dropped here.' };
    const uuid = String(data.uuid ?? '');
    return uuid ? { ok: true, uuid } : { ok: false, why: 'That item has no address to look it up by.' };
  },

  /** Is this item type one a character can shop for? */
  isBuyable(type, buyable) { return (buyable ?? []).includes(type); },
};
