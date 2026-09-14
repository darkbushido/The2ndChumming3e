/**
 * An item's rating — ONE answer for gear, cyberware, bioware and medical items.
 *
 * ⚠ **The rating usually lives in the NAME, not the field.** The upstream generator names rated
 * gear `Antidote Patch [5]` / `Medkit Rating 6`, and every shipped pack inherited that: 537 of the
 * 540 bracketed cyberware entries store `system.rating: 0`, all 72 bracketed bioware do, and gear
 * had no `rating` field at all until 0.5.2 (the importer threw the generator's Rating away). So
 * reading `system.rating` alone gave **0** — a Vehicle Control Rig [2] from the compendium added
 * nothing to a rigger's initiative or Driving Test (reported with medkits, 2026-09-13).
 *
 * **The FIELD is the rating, and no value means no rating** (the maintainer, 2026-09-14: *"I would
 * prefer that it were in a column where nil means no rating"*). `system.rating` is nullable on
 * **gear** — weapons, cyberware and bioware are out of scope for now (TODO 122); their field still
 * defaults to 0, which reads through the legacy row below exactly as before:
 *
 * | `system.rating` | reads as |
 * |---|---|
 * | a number above 0 | that rating — a GM who changes a Medkit [6] to 4 means 4 |
 * | `null` | **no rating** — the name is NOT consulted |
 * | `0` or missing | **legacy** (the old default, before the field was filled) → the name, then
 * |   | `GEAR_RATINGS` — gear rated only in the generator's Rating column (plain *Medkit* 3, SR3 p.304) |
 *
 * The legacy row is how the migration and `tools/patch-name-ratings.mjs` FILL the field; after
 * that nothing reads a name. Checked against every shipped pack: no item stores a rating that
 * disagrees with its name.
 *
 * The functions live on `ItemRating` and the named exports call through it, so
 * `tests/mutants.mjs` can reinstate a shipped bug by replacing one (ES exports are read-only).
 */
import { GEAR_RATINGS } from './gear-ratings.mjs';
import { parseRatingFromName } from './rating-name.mjs';

/** Lower case, punctuation to spaces — the key `GEAR_RATINGS` is written with. */
const normName = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export const ItemRating = {
  /**
   * The rating written in a name: `[6]`, `Rating 6`, `(Rating 8)`, `Rating [3]`.
   * ⚠ **A bare trailing number is NOT a rating** — `Predator 2` is a gun's model, not Rating 2 —
   * and a bracket must hold ONLY digits: `[Initiate Grade 2]` is a Metamagic note. A RANGE is not
   * a rating either: a contact's "Appropriate Utilities at Rating 4-8" is the GM's pick.
   * @returns {number|null}
   */
  ratingFromName(name) {
    return parseRatingFromName(name);
  },

  /**
   * The rating a name implies, for FILLING an empty field: the name's own `[N]` / `Rating N`, else
   * the generator's Rating column for a name that carries none (`GEAR_RATINGS`). Null for neither.
   */
  knownRating(name) {
    return ItemRating.ratingFromName(name) ?? GEAR_RATINGS[normName(name)] ?? null;
  },

  /** The item's rating (0 = none). See the table above: a number wins, null is none, 0/missing is legacy. */
  itemRating(item) {
    const raw = item?.system?.rating;
    if (raw === null) return 0;                                   // explicitly no rating
    const stored = Number(raw);
    if (Number.isFinite(stored) && stored > 0) return stored;
    return ItemRating.knownRating(item?.name) ?? 0;              // legacy 0 / missing / ''
  },

  /**
   * What a NEW item's rating should be set to, or `undefined` to leave it (the `preCreateItem`
   * hook). Gear only; only when the creator gave none — absent, or the legacy 0. An explicit null
   * (a shipped unrated item) stays null, and so does a number.
   */
  ratingOnCreate(type, given, name) {
    // ⚠ GEAR only — the maintainer, 2026-09-14: weapons, cyberware and bioware are out of scope
    // (TODO 122). Their field still defaults to 0 and is read with the name, as before.
    if (type !== 'gear') return undefined;
    if (given === null || Number(given) > 0) return undefined;
    return ItemRating.knownRating(name) ?? null;
  },

  /**
   * The name an item is SHOWN with: its name, plus `[N]` when it has a rating the name does not
   * already carry. Lets a name be stored plainly ("Wired Reflexes") with the rating in the field
   * and still read "Wired Reflexes [2]" — and never doubles one ("Wired Reflexes [2] [2]").
   */
  displayName(item) {
    const name = String(item?.name ?? '');
    if (!['gear', 'medical'].includes(item?.type)) return name;       // gear only for now (TODO 122)
    const r = ItemRating.itemRating(item);
    return r > 0 && ItemRating.ratingFromName(name) === null ? `${name} [${r}]` : name;
  },

  /**
   * A Vehicle Control Rig's level. A rig that exists is at least level 1 — the old reads fell to
   * 0 on the shipped `rating: 0` and gave a jacked-in rigger no VCR at all.
   */
  vcrLevel(item) {
    return item ? (ItemRating.itemRating(item) || 1) : 0;
  },
};

export const ratingFromName = name => ItemRating.ratingFromName(name);
export const knownRating    = name => ItemRating.knownRating(name);
export const ratingOnCreate = (type, given, name) => ItemRating.ratingOnCreate(type, given, name);
export const displayName    = item => ItemRating.displayName(item);
export const itemRating     = item => ItemRating.itemRating(item);
export const vcrLevel       = item => ItemRating.vcrLevel(item);
