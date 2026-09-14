/**
 * The rating written in an item's name — `[6]`, `Rating 6`, `(Rating 8)`, `Rating [3]` · TODO 118.
 *
 * Kept apart from `item-rating.mjs` so `tools/build-gear-ratings.mjs` can use it without importing
 * the table it is building. `ItemRating.ratingFromName` calls this; read that file for the rules.
 *
 * ⚠ **A bare trailing number is NOT a rating** — `Predator 2` is a gun's model, not Rating 2 — and
 * a bracket must hold ONLY digits: `[Initiate Grade 2]` is a Metamagic note. A RANGE is not a
 * rating either: a contact's "Appropriate Utilities at Rating 4-8" is the GM's pick.
 * @returns {number|null}
 */
export function parseRatingFromName(name) {
  const s = String(name ?? '');
  const m = /\[\s*(\d+)\s*\]/.exec(s) ?? /\brating\s*\[?\s*(\d+)\b(?!\s*[-–]\s*\d)/i.exec(s);
  return m ? Number(m[1]) : null;
}
