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
 * **A stored rating above 0 wins** — it is the editable field, and a GM who changes a Medkit [6]
 * to 4 means 4. Otherwise the name is read. Checked against every shipped pack: no item stores a
 * rating that disagrees with its name, so the order changes nothing already correct.
 *
 * The functions live on `ItemRating` and the named exports call through it, so
 * `tests/mutants.mjs` can reinstate a shipped bug by replacing one (ES exports are read-only).
 */
export const ItemRating = {
  /**
   * The rating written in a name: `[6]`, `Rating 6`, `(Rating 8)`, `Rating [3]`.
   * ⚠ **A bare trailing number is NOT a rating** — `Predator 2` is a gun's model, not Rating 2 —
   * and a bracket must hold ONLY digits: `[Initiate Grade 2]` is a Metamagic note.
   * @returns {number|null}
   */
  ratingFromName(name) {
    const s = String(name ?? '');
    const m = /\[\s*(\d+)\s*\]/.exec(s) ?? /\brating\s*\[?\s*(\d+)/i.exec(s);
    return m ? Number(m[1]) : null;
  },

  /** The item's rating: the stored field when above 0, else the name, else 0. */
  itemRating(item) {
    const stored = Number(item?.system?.rating);
    if (Number.isFinite(stored) && stored > 0) return stored;
    return ItemRating.ratingFromName(item?.name) ?? 0;
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
export const itemRating     = item => ItemRating.itemRating(item);
export const vcrLevel       = item => ItemRating.vcrLevel(item);
