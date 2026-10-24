/**
 * Mod values corrected against the books — TODO 261 (the maintainer: "fix all to the book", 2026-10-24).
 *
 * The maintainer checked the mod level tables against the rulebook PDFs and approved these corrections.
 * ONE list, read by two callers:
 *
 *   - `tools/fix-mod-book-values.mjs` corrects the hand-kept pack documents in `packs-src` with it;
 *   - the 0.7.1 migration (`scripts/SR3EMigrations.js`) corrects the copies worlds already own
 *     (world actors, world items, unlinked token actors) through `ModBookFixes.fixItem`.
 *
 * Each entry is `{ kind, name, rating, field, from, to, source }`:
 *   - `kind` / `name` — the table key (`ModRatings.keyOf`): `vehicle` mods, `cyberlimb` mods, `cyberware` (Bodyware, Rigger…);
 *   - `rating` — the level (`system.rating`), or null for every level of the mod;
 *   - `from` → `to` — the field is rewritten ONLY while it still holds `from`, the value we shipped.
 *
 * ⚠ **The `from` guard IS the houserule protection** (`CLAUDE.md`, "World migrations": fill blanks, never
 * overwrite a decision): a GM who edited the cost or the legality of an owned mod holds some other value,
 * so it is left alone. A value that still equals what we shipped is not anyone's choice, only our error.
 * It also makes the pass idempotent — once corrected, nothing equals `from`.
 *
 * Pure — no Foundry.
 */
import { ModRatings } from './mod-ratings.mjs';

const E = (kind, name, rating, field, from, to, source) => ({ kind, name, rating, field, from, to, source });

const R3 = 'R3', MM = 'M&M';

/** Vehicle Armor — R3 p.131: "1,250¥ per Armor point", "Armor value x 8 hrs", "Target Number: Desired Armor rating ÷ 3". */
const VEHICLE_ARMOR = [
  E('vehicle', 'Vehicle Armor', 7, 'cost', 9750, 8750, `${R3} p.131: 1,250¥ per Armor point`),
  E('vehicle', 'Vehicle Armor', 9, 'cost', 12500, 11250, `${R3} p.131: 1,250¥ per Armor point`),
  E('vehicle', 'Vehicle Armor', 10, 'cost', 13750, 12500, `${R3} p.131: 1,250¥ per Armor point`),
  E('vehicle', 'Vehicle Armor', 11, 'cost', 15000, 13750, `${R3} p.131: 1,250¥ per Armor point`),
  E('vehicle', 'Vehicle Armor', 11, 'installTime', '88 hrs/Vehicle B/R(5)', '88 hrs/Vehicle B/R(4)', `${R3} p.131: Target Number = desired Armor rating ÷ 3`),
];

/** Concealed Armor 9 — R3 p.132: "CF Consumed: 3 CF per Armor Point". */
const CONCEALED = [E('vehicle', 'Concealed Armor', 9, 'cfCost', '37', '27', `${R3} p.132: 3 CF per Armor Point`)];

/** Ablative Armor 2 — R3 p.131: "Level 2: 12/14 days (2)". */
const ABLATIVE = [E('vehicle', 'Ablative Armor', 2, 'availability', '12/12days', '12/14days', `${R3} p.131: Level 2: 12/14 days`)];

/** Power Amplifier — R3 p.147: "CF Consumed: 0.5 CF per rating (round up)" → ceil(rating / 2). Only the odd ratings were unrounded. */
const AMPLIFIER = [1, 3, 5, 7, 9].map(r =>
  E('vehicle', 'Power Amplifier', r, 'cfCost', String(r / 2), String(Math.ceil(r / 2)), `${R3} p.147: 0.5 CF per rating (round up)`));

/** Remote Control ECCM 5 and 6 — M&M p.25: "Ratings 4–6 ... Rating x 35,000¥". */
const ECCM = [
  E('cyberlimb', 'Remote Control ECCM', 5, 'cost', 210000, 175000, `${MM} p.25: Rating x 35,000¥`),
  E('cyberlimb', 'Remote Control ECCM', 6, 'cost', 280000, 210000, `${MM} p.25: Rating x 35,000¥`),
];

/** Hydraulic Jack — M&M p.29: "adds rating x 20 percent to his maximum jump distance" (not running distance). Both the Cyberlimb Mod and the Bodyware implant. */
const JACK = ['cyberlimb', 'cyberware'].flatMap(kind => [1, 2, 3, 4, 5].map(r => E(kind, 'Hydraulic Jack', r, 'description',
  `+${r} die to Athletics (Running, Jumping) tests, +${r * 20}% running distance, -${r} Power level to falls`,
  `+${r} die to Athletics (Running, Jumping) tests, +${r * 20}% jump distance, -${r} Power level to falls`,
  `${MM} p.29: rating x 20 percent to maximum jump distance`)));

/** RC Encryption Module — M&M p.25: legality 8P-W at every level (the Cyberlimb Mod and the Rigger implant alike). */
const RCEM = ['cyberlimb', 'cyberware'].flatMap(kind => [1, 2, 3, 4, 5, 6, 7, 8].map(r =>
  E(kind, 'RC Encryption Module', r, 'legalCode', '4P-W', '8P-W', `${MM} p.25: 8P-W`)));

/** Cyberlimb body plating — M&M p.37 table: ballistic and impact plating are Legal; ablative is 4P-Q. */
const PLATING = [
  E('cyberlimb', 'Armor: Ballistic', null, 'legalCode', '3-N', 'Legal', `${MM} p.37 table`),
  E('cyberlimb', 'Armor: Impact', null, 'legalCode', '3-N', 'Legal', `${MM} p.37 table`),
  E('cyberlimb', 'Armor: Ablative', null, 'legalCode', '3-N', '4P-Q', `${MM} p.37 table`),
];

export const ModBookFixes = {
  FIXES: [...VEHICLE_ARMOR, ...CONCEALED, ...ABLATIVE, ...AMPLIFIER, ...ECCM, ...JACK, ...RCEM, ...PLATING],

  /** The fixes that apply to an item: its kind and plain name match, and so does its level (null = any). */
  matching(item) {
    const key = ModRatings.keyOf(item);
    if (!key) return [];
    const rating = Number(item.system?.rating) || ModRatings.splitName(item.name)?.rating || 0;
    return ModBookFixes.FIXES.filter(f => key === `${f.kind}|${f.name}` && (f.rating === null || f.rating === rating));
  },

  /**
   * The update that corrects an owned (or pack) mod: `{ 'system.<field>': to }` for each field still holding
   * the value we shipped, or null. Never overwrites any other value (see the module note).
   */
  fixItem(item) {
    const delta = {};
    for (const f of ModBookFixes.matching(item)) {
      const now = item.system?.[f.field];
      if (now !== undefined && now !== null && String(now) === String(f.from)) delta[`system.${f.field}`] = f.to;
    }
    return Object.keys(delta).length ? delta : null;
  },
};
