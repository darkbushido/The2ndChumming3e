/**
 * Pack names corrected against the books, for the copies worlds already own · TODO 266.
 *
 * ModFor.migrateDelta (the 0.8.0 migration) calls `fixedName` first, so the rest of the migration (the level moved out
 * of the name, the mod tag, the dead-link repoint) runs on the corrected name.
 *
 *   - **Extended Clip** — Cannon Companion p.81 prints "Extended Clip" (DP +2/round added); the upstream data row was
 *     truncated to "Extended Clip (", and the generated gear shipped as "Extended Clip ( (Weapon)".
 *
 * ⚠ **These RENAME, and argue for it:** only the exact broken or old pack names (with their level and tag), only of
 * the right item TYPE (gear / armour), the level is kept in the name when it had one. A name a GM typed himself
 * ("My Transceiver", "Transceiver Mk II") does not match and is left alone. Pure — no Foundry.
 */
export const EXTENDED_CLIP = 'Extended Clip (Weapon)';

/** "Extended Clip (" / "Extended Clip ( (Weapon)" with an optional " [N]". */
const BROKEN_CLIP = /^Extended Clip \((?: \(Weapon\))?(?:\s*\[(\d+)\])?\s*$/;

export const NameFixes = {
  /** The corrected name for an owned item, or null when it needs none. Idempotent: a corrected name yields null. */
  fixedName(item) {
    const name = String(item?.name ?? '').replace(/\s+/g, ' ').trim();
    if (item?.type === 'gear') {
      const m = BROKEN_CLIP.exec(name);
      return m ? `${EXTENDED_CLIP}${m[1] ? ` [${m[1]}]` : ''}` : null;
    }
    return null;
  },
};
