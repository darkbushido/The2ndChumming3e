/**
 * Rated mods: the level lives in `system.rating`, not the name — TODO 260.
 *
 * The maintainer, 2026-10-24: *"we want to remove the level from all mods and put them as a dropdown
 * inside the mod"* — for cyber, weapon and vehicle mods. The packs shipped one document per level,
 * named for it ("Anti-Theft System [10]", "STS (Beacon) Rating [3]", "Signal Booster [3]"). Now the
 * name is the mod ("Anti-Theft System"), the level is the rating field, and the item sheet offers the
 * levels the books print as a dropdown that brings that level's cost, CF, Essence and the rest with it
 * (`MOD_RATING_TABLE`, generated from the packs by `tools/build-mod-ratings.mjs`). Lists show
 * "Anti-Theft System [10]" through `displayName`.
 *
 * Three kinds — `kindOf`:
 *
 * | kind | which items |
 * |---|---|
 * | `vehicle` | every `vehiclemod` |
 * | `cyberlimb` | cyberware of category `Cyberlimb Mods` (the copies built INTO a limb, TODO 255) |
 * | `weapon` | gear of category `Firearms Accessories` |
 *
 * Pure — no Foundry.
 */
import { MOD_RATING_TABLE } from './mod-rating-table.mjs';

/**
 * A level written into a name: `[3]`, `Rating [3]`, `Lvl [3]`, glued (`Bod[3]`) or spaced, with the
 * one upstream stray after it (`Protocol Emulation Module [10]  1`). Only a BRACKET counts — a bare
 * trailing number is a model ("Ares Predator 2").
 */
const LEVEL = /^(.*?)\s*(?:\b(?:Rating|Lvl)\s*)?\[(\d+)\](?:\s+\d+)?\s*$/;

export const ModRatings = {
  /** `vehicle` | `cyberlimb` | `weapon` for a rated-mod type, else null. */
  kindOf(item) {
    const s = item?.system ?? {};
    if (item?.type === 'vehiclemod') return 'vehicle';
    if (item?.type === 'cyberware' && s.cyberwareCategory === 'Cyberlimb Mods') return 'cyberlimb';
    if (item?.type === 'gear' && s.category === 'Firearms Accessories') return 'weapon';
    return null;
  },

  /** `{ stem, rating }` for a name carrying a level, else null. Spaces in the stem are tidied. */
  splitName(name) {
    const m = LEVEL.exec(String(name ?? ''));
    if (!m || !m[1].trim()) return null;
    return { stem: m[1].replace(/\s+/g, ' ').trim(), rating: Number(m[2]) };
  },

  /**
   * The update that takes a mod's level out of its name, or null. The rating field is filled from the
   * name only while it is blank (or already agrees) — a GM who typed a different rating keeps theirs,
   * and the name's stale level simply goes.
   *
   * ⚠ This RENAMES, which a fill-blanks migration never does — and argues for it: it touches only the
   * three mod kinds, only a name ending in a bracketed level, and the level is kept, in the field.
   */
  renameDelta(item) {
    if (!ModRatings.kindOf(item)) return null;
    const split = ModRatings.splitName(item.name);
    if (!split) return null;
    const delta = { name: split.stem };
    const r = item.system?.rating;
    if (r === undefined || r === null || r === '' || Number(r) === 0) delta['system.rating'] = split.rating;
    return delta;
  },

  /** The table key for an item: kind and plain name. */
  keyOf(item) {
    const kind = ModRatings.kindOf(item);
    if (!kind) return null;
    const name = ModRatings.splitName(item.name)?.stem ?? String(item.name ?? '').replace(/\s+/g, ' ').trim();
    return `${kind}|${name}`;
  },

  /** The levels the books print for this mod, `{ "1": { fields… }, … }`, or null when it has none. */
  levelsOf(item, table = MOD_RATING_TABLE) {
    const key = ModRatings.keyOf(item);
    return (key && table[key]) || null;
  },

  /**
   * The dropdown's options: every printed level, plus the item's own rating when it is not one of them
   * (a GM's houserule stays selectable). `{ value, label, selected }`, lowest first.
   */
  options(item, table = MOD_RATING_TABLE) {
    const levels = ModRatings.levelsOf(item, table);
    if (!levels) return null;
    const current = Number(item.system?.rating) || null;
    const values = new Set(Object.keys(levels).map(Number));
    if (current) values.add(current);
    return [...values].sort((a, b) => a - b).map(v => ({
      value: v, label: levels[v] ? String(v) : `${v} (not in the book)`, selected: v === current,
    }));
  },

  /**
   * The update for picking a level: the rating, and that level's printed fields (cost, CF, Essence,
   * availability… whatever differs between the levels). A level the books do not print changes only
   * the rating. Fields are written under `system.`.
   */
  ratingChange(item, rating, table = MOD_RATING_TABLE) {
    const delta = { 'system.rating': Number(rating) };
    const row = ModRatings.levelsOf(item, table)?.[Number(rating)];
    for (const [field, value] of Object.entries(row ?? {})) delta[`system.${field}`] = value;
    return delta;
  },
};
