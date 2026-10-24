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
 * **Then the maintainer widened it to ALL gear** (2026-10-24: *"We shouldn't have any [N] gear — the point is
 * to move the level into the gear's doc"*): every rated item in every Item pack is ONE document, its levels in
 * the table, picked from the item sheet's Level dropdown or the 🛒 Buy gear dialog. "Chemical Seal Rating [10]"
 * is "Chemical Seal"; "Bug Scanner Lv [3]" is "Bug Scanner". The kinds — `kindOf`:
 *
 * | kind | which items |
 * |---|---|
 * | `vehicle` | every `vehiclemod` |
 * | `cyberlimb` | cyberware of category `Cyberlimb Mods` (the copies built INTO a limb, TODO 255) |
 * | `cyberware` | every other cyberware (Bodyware, Headware, Rigger…) |
 * | `weapon` | gear of category `Firearms Accessories` |
 * | `gear` | every other gear |
 * | `bioware` · `medical` · `ammunition` · `vehicleweapon` | those item types (tracker rounds, the AM-56 lure launcher) |
 *
 * The same name can be two kinds — the Hydraulic Jack is both Bodyware and a Cyberlimb Mod — and the table
 * keeps them apart (`cyberware|Hydraulic Jack`, `cyberlimb|Hydraulic Jack`).
 *
 * Pure — no Foundry.
 */
import { MOD_RATING_TABLE, COLLAPSED_SOURCES } from './mod-rating-table.mjs';

/**
 * A level written into a name: `[3]`, `Rating [3]`, `Lvl [3]`, `Lv [3]`, glued (`Bod[3]`) or spaced, with the
 * one upstream stray after it (`Protocol Emulation Module [10]  1`). Only a BRACKET counts — a bare
 * trailing number is a model ("Ares Predator 2").
 */
const LEVEL = /^(.*?)\s*(?:\b(?:Rating|Lvl|Lv)\s*)?\[(\d+)\](?:\s+\d+)?\s*$/;

/**
 * The same level written WITHOUT a bracket — "Medkit Rating 6", "Alpha Hospital Rating 3" (the upstream generator
 * writes both). Only a trailing "Rating N" / "Lvl N" / "Lv N": "Appropriate Utilities at Rating 4-8" is a range, and
 * a bare trailing number ("Ares Predator 2") is a model.
 */
const BARE = /^(.*?)\s+(?:Rating|Lvl|Lv)\s+(\d+)\s*$/;

/** `Compendium.The2ndChumming3e.<pack>.Item.<id>` — the system's own packs only. */
const SOURCE = /^Compendium\.The2ndChumming3e\.([^.]+)\.Item\.([A-Za-z0-9_-]+)$/;

export const ModRatings = {
  /** The item's kind (see the table above) for a rated type, else null. */
  kindOf(item) {
    const s = item?.system ?? {};
    switch (item?.type) {
      case 'vehiclemod': return 'vehicle';
      case 'cyberware': return s.cyberwareCategory === 'Cyberlimb Mods' ? 'cyberlimb' : 'cyberware';
      case 'gear': return s.category === 'Firearms Accessories' ? 'weapon' : 'gear';
      case 'bioware': return 'bioware';
      case 'medical': return 'medical';
      case 'ammunition': return 'ammunition';
      case 'vehicleweapon': return 'vehicleweapon';
      default: return null;
    }
  },

  /** `{ stem, rating }` for a name carrying a level, else null. Spaces in the stem are tidied. */
  splitName(name) {
    const m = LEVEL.exec(String(name ?? '')) ?? BARE.exec(String(name ?? ''));
    if (!m || !m[1].trim()) return null;
    return { stem: m[1].replace(/\s+/g, ' ').trim(), rating: Number(m[2]) };
  },

  /**
   * The update that takes a mod's level out of its name, or null. The rating field is filled from the
   * name only while it is blank (or already agrees) — a GM who typed a different rating keeps theirs,
   * and the name's stale level simply goes.
   *
   * ⚠ This RENAMES, which a fill-blanks migration never does — and argues for it: it touches only the
   * rated item types, only a name ending in a bracketed level, and the level is kept, in the field.
   */
  renameDelta(item) {
    if (!ModRatings.kindOf(item)) return null;
    const split = ModRatings.splitName(item.name);
    if (!split) return null;
    const delta = { name: split.stem };
    const r = item.system?.rating;
    // Medical's rating is a string field (some Biotech rows are signed modifiers).
    if (r === undefined || r === null || r === '' || Number(r) === 0) delta['system.rating'] = item.type === 'medical' ? String(split.rating) : split.rating;
    return delta;
  },

  /**
   * What a rename leaves unsaid: a name's level that DISAGREES with a rating someone typed. The rating
   * wins (a GM's houserule) and the name's stale level goes — this is the line the migration logs.
   */
  renameConflict(item) {
    const split = ModRatings.kindOf(item) ? ModRatings.splitName(item.name) : null;
    const r = Number(item?.system?.rating);
    return split && r > 0 && r !== split.rating
      ? `${item.name}: the name says ${split.rating}, the rating field says ${r} — keeping ${r}` : null;
  },

  /**
   * A copy linked to a level document the collapse DELETED → the document that kept its family:
   * `Compendium.The2ndChumming3e.<pack>.Item.<id>`, or null when its source is not one of those (or was
   * never deleted). `table` is `COLLAPSED_SOURCES`: pack → { deleted id → kept id }.
   */
  repointSource(item, table = COLLAPSED_SOURCES) {
    const m = SOURCE.exec(String(item?._stats?.compendiumSource ?? ''));
    const kept = m && table[m[1]]?.[m[2]];
    return kept ? `Compendium.The2ndChumming3e.${m[1]}.Item.${kept}` : null;
  },

  /**
   * The whole 0.7.1 update for an owned copy: the rename, and its dead compendium link repointed.
   *
   * ⚠ The repoint OVERWRITES `_stats.compendiumSource`, and argues for it: it only fires on a link to a
   * document that NO LONGER EXISTS, so nothing anyone chose can be there — the one thing it replaces is
   * a dead address. Idempotent: the kept document is never in the deleted table.
   */
  migrateDelta(item) {
    const delta = ModRatings.renameDelta(item) ?? {};
    const to = ModRatings.repointSource(item);
    if (to) delta['_stats.compendiumSource'] = to;
    return Object.keys(delta).length ? delta : null;
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

  /**
   * A plain copy of an item's data (`item.toObject()`) with a level applied — the rating and that level's
   * printed fields. 🛒 Buy gear uses it so the bought item has the picked level's numbers. A level the
   * books do not print changes only the rating. Pure: `data` is not touched.
   */
  withLevel(data, rating, table = MOD_RATING_TABLE) {
    const out = { ...data, system: { ...(data?.system ?? {}) } };
    for (const [path, value] of Object.entries(ModRatings.ratingChange(data, rating, table))) out.system[path.slice('system.'.length)] = value;
    if (data?.type === 'medical') out.system.rating = String(rating);
    return out;
  },
};
