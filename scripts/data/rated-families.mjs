/**
 * A rated item is ONE document — the pure rule that collapses a family of per-level documents · TODO 260.
 *
 * The maintainer, 2026-10-24: *"We shouldn't have any [N] gear — the point is to move the level into the gear's
 * doc"* — all gear, one document per item, like Vehicle Armor already was. The packs shipped one document per
 * level ("Chemical Seal Rating [1]" … "[10]", "Wired Reflexes [1]" … "[3]"). A **family** is the documents of
 * one pack that are the same type and the same item apart from their level: same `ModRatings.keyOf` — kind
 * and plain name, with the trailing " [N]" (or " Rating [N]", " Lvl [N]", " Lv [N]") taken off — within one pack.
 * Families already renamed (several documents with the same plain name that differ only in `system.rating`)
 * are families too.
 *
 * `planCollapse` says what one family becomes:
 *   - the **lowest level's document is kept**, its `_id` unchanged (so every owned copy that already links to it
 *     keeps its link), named for the item and carrying `system.rating` = that level;
 *   - **every field that differs between the levels** goes into the level table (`levels`: level → fields), which
 *     the item sheet's Level dropdown and the 🛒 Buy gear dialog read (`MOD_RATING_TABLE`, generated);
 *   - the other documents are deleted — `deleted` — and a copy that linked to one is repointed (`COLLAPSED_SOURCES`);
 *   - a level printed TWICE with different numbers is not guessed at: the extra row is kept as `unplaced`, for a
 *     person to check against the book (the second document is still deleted — its numbers are in the record);
 *   - a sibling with NO level at all (the generator's "Cost 2500 x Rating" row beside the six rated ones) is
 *     `folded` into the family: the levels say everything it did.
 *
 * ⚠ **Rule of the family**: only a group with TWO or more rated documents collapses. A lone "Wired Reflexes [2]"
 * is renamed and keeps its rating, but has no choice to offer.
 *
 * Pure — no Foundry, no files. `tools/build-mod-ratings.mjs` and `tools/build-default-gear.mjs` run it over packs.
 */
import { ModRatings } from './mod-ratings.mjs';

/** Fields that are bookkeeping, not a level's printed numbers — never part of a table row. */
export const NOT_PRINTED = new Set(['rating', 'srcgName', 'grade', 'costBase', 'essenceCostBase', 'bioIndexBase', 'availabilityBase',
  'quantity', 'equipped', 'worn']);

/** The level a document is at: its `system.rating`, else the one in its name; 0 for neither. */
export const levelOf = doc => {
  const r = Number(doc?.system?.rating);
  return r > 0 ? r : (ModRatings.splitName(doc?.name)?.rating ?? 0);
};

/** A document's printed numbers — its `system` without the bookkeeping. */
export const printed = doc => Object.fromEntries(Object.entries(doc?.system ?? {}).filter(([k]) => !NOT_PRINTED.has(k)));

const same = (a, b) => JSON.stringify(Object.entries(a).sort(([x], [y]) => x.localeCompare(y)))
  === JSON.stringify(Object.entries(b).sort(([x], [y]) => x.localeCompare(y)));

/** A missing field's stand-in at a level: what its type says ('' for text, 0 for a number). */
const blankLike = values => (values.some(v => typeof v === 'string') ? '' : values.some(v => typeof v === 'number') ? 0 : null);

export const RatedFamilies = {
  /**
   * Group documents into families. `items` is `[[key, doc], …]` (a pack's top-level item entries); returns
   * `Map<tableKey, [{ key, doc, level }]>`, in the order met. A document of an unrated type is left out.
   */
  group(items) {
    const fams = new Map();
    for (const [key, doc] of items) {
      const tableKey = ModRatings.keyOf(doc);
      if (!tableKey) continue;
      (fams.get(tableKey) ?? fams.set(tableKey, []).get(tableKey)).push({ key, doc, level: levelOf(doc) });
    }
    return fams;
  },

  /** Does this group collapse? Two or more rated documents. */
  collapses(members) {
    return members.filter(m => m.level > 0).length >= 2;
  },

  /**
   * The per-level table of a set of documents: `{ level: { field: value } }` keeping only the fields that DIFFER
   * between levels. `unplaced` lists a level printed twice with different numbers (the first, by key, is placed),
   * `duplicates` one printed twice with the same numbers. Pure.
   */
  levels(members) {
    const placed = new Map(), unplaced = [], duplicates = [];
    for (const m of [...members].filter(x => x.level > 0).sort((a, b) => a.level - b.level || String(a.key).localeCompare(String(b.key)))) {
      const had = placed.get(m.level);
      if (!had) { placed.set(m.level, m); continue; }
      if (same(printed(had.doc), printed(m.doc))) duplicates.push(m.key);
      else unplaced.push({ id: String(m.key).replace(/^!items!/, ''), name: m.doc.name, rating: m.level, row: printed(m.doc),
        why: 'printed at a level another document already has, with different numbers — check the book' });
    }
    const all = [...placed.values()].map(m => printed(m.doc));
    const fields = new Set();
    for (const k of new Set(all.flatMap(s => Object.keys(s)))) {
      if (new Set(all.map(s => JSON.stringify(s[k] ?? null))).size > 1) fields.add(k);
    }
    const levels = {};
    for (const [lvl, m] of placed) {
      levels[lvl] = Object.fromEntries([...fields].sort().map(k => {
        const v = printed(m.doc)[k];
        return [k, v ?? blankLike(all.map(s => s[k]))];
      }));
    }
    return { levels, unplaced, duplicates, placed };
  },

  /**
   * What one family becomes, or null when it does not collapse. `keep` is the member whose document stays,
   * `deleted` every other key, `folded` the unrated siblings among them. Does not touch the documents.
   */
  plan(members) {
    if (!RatedFamilies.collapses(members)) return null;
    const { levels, unplaced, duplicates, placed } = RatedFamilies.levels(members);
    const keep = [...placed.values()][0];
    const folded = members.filter(m => !(m.level > 0)).map(m => m.key);
    const deleted = members.filter(m => m !== keep).map(m => m.key);
    return { keep, levels, unplaced, duplicates, folded, deleted, count: members.length };
  },

  /**
   * The kept document, made plain: named for the item, `system.rating` its lowest level (a string field keeps its
   * type). Mutates and returns it.
   */
  applyKeep(doc, level) {
    const split = ModRatings.splitName(doc.name);
    if (split) doc.name = split.stem;
    doc.system ??= {};
    if (!(Number(doc.system.rating) > 0)) doc.system.rating = doc.type === 'medical' ? String(level) : level;
    return doc;
  },

  /**
   * Collapse every family in a pack's entries (a Map key → doc), mutating it: the other documents are removed,
   * the kept one made plain. `skip(doc)` leaves a document alone (a generated one, say). Returns the families:
   * `{ key, keep, levels, unplaced, deleted, folded, duplicates }` with `keep` and `deleted` as bare ids.
   */
  collapseEntries(entries, { skip = () => false } = {}) {
    const bare = k => String(k).replace(/^!items!/, '');
    const items = [...entries].filter(([k, d]) => k.startsWith('!items!') && !skip(d));
    const out = [];
    for (const [key, members] of RatedFamilies.group(items)) {
      const plan = RatedFamilies.plan(members);
      if (!plan) continue;
      for (const k of plan.deleted) entries.delete(k);
      RatedFamilies.applyKeep(plan.keep.doc, plan.keep.level);
      out.push({ key, keep: bare(plan.keep.key), levels: plan.levels, unplaced: plan.unplaced,
        deleted: plan.deleted.map(bare), folded: plan.folded.map(bare), duplicates: plan.duplicates.map(bare) });
    }
    return out;
  },

  /**
   * Merge level rows into a table, key by key: levels already there win (the first pack to print a level), and
   * a level printed twice with different numbers is returned in `conflicts`. Pure on `into`'s own rows.
   */
  merge(into, key, levels) {
    const conflicts = [];
    const row = into[key] ??= {};
    for (const [lvl, fields] of Object.entries(levels)) {
      if (!row[lvl]) { row[lvl] = fields; continue; }
      if (JSON.stringify(row[lvl]) !== JSON.stringify(fields)) conflicts.push(`${key} [${lvl}]`);
    }
    return conflicts;
  },
};
