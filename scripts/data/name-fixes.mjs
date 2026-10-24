/**
 * Pack names corrected against the books, for the copies worlds already own · TODO 266.
 *
 * ModFor.migrateDelta (the 0.8.0 migration) calls `fixedName` first, so the rest of the migration (the level moved out
 * of the name into the rating, the mod tag, the dead-link repoint) runs on the corrected name.
 *
 *   - **Extended Clip** — Cannon Companion p.81 prints "Extended Clip" (DP +2/round added); the upstream data row was
 *     truncated to "Extended Clip (", and the generated gear shipped as "Extended Clip ( (Weapon)".
 *   - **Helmet/Wrist Transceiver** — SR3 p.284 prints "Helmet or Wrist Transceiver (2,500¥)", Cannon Companion p.51
 *     "Helmet or Wrist Transceiver (250¥ x Rating)". The maintainer (2026-10-24) kept ONE armour option, the Cannon
 *     Companion's, named for what it is: "Helmet/Wrist Transceiver (Armor)", still levelled. The gear "Transceiver" and
 *     "Micro-Transceiver" on SR3 p.290 are different items (type gear), never touched.
 *   - **Electronic / Optical Magnification** — SR3 p.284 and Cannon Companion p.51 print "Electronic Magnification 3
 *     (900¥)" and "Optical Magnification 3 (1,200¥)": magnification is a RATING, not part of the name (the maintainer,
 *     2026-10-24). The packs said "Elec. Vis. Mag 3", "Electric Vision Mag 3", "Optical Vis. Mag 3", "Optical Vision
 *     Mag 3" and two typo rows "… Mag 38"; every one reads "Electronic Magnification (Armor) [3]" now, the 3 in the rating.
 *     ⚠ Magnification is NOT a bare-number level elsewhere ("Smart Goggles 1" is a model) — this rule names these two items only.
 *   - **Thermo Vision** — SR3 p.284 / Cannon Companion p.51 print one "Thermographic (700¥)". The pack had it twice, the
 *     generated "Therm Vision (Armor)" and the hand-kept "Thermo Vision (Armor)"; the maintainer (2026-10-24): "there can
 *     be only one and it will be Thermo Vision". "Therm Vision", "+Therm Vision" and "Therm Vision (Armor)" (a level kept
 *     if present) read "Thermo Vision (Armor)" now. "Thermo Vision" itself and any other name are untouched.
 *
 * ⚠ **These RENAME, and argue for it:** only the exact old pack names (with their level and tag), only of the right
 * item TYPE (gear / armour); the level is kept in the name when it had one (the magnification's is always 3). A name a
 * GM typed himself ("My Transceiver", "Transceiver Mk II") does not match and is left alone. The rating itself is
 * filled only while blank (`ModRatings.renameDelta`). Idempotent: a corrected name yields null. Pure — no Foundry.
 */
import { ModRatings } from './mod-ratings.mjs';

export const EXTENDED_CLIP = 'Extended Clip (Weapon)';
export const HELMET_TRANSCEIVER = 'Helmet/Wrist Transceiver (Armor)';
export const ELECTRONIC_MAGNIFICATION = 'Electronic Magnification (Armor)';
export const OPTICAL_MAGNIFICATION = 'Optical Magnification (Armor)';
export const THERMO_VISION = 'Thermo Vision (Armor)';

/** "Extended Clip (" / "Extended Clip ( (Weapon)" with an optional " [N]". */
const BROKEN_CLIP = /^Extended Clip \((?: \(Weapon\))?(?:\s*\[(\d+)\])?\s*$/;

/** The old magnification names (plain, untagged): Elec. Vis. / Electric Vision, Optical Vis. / Optical Vision, "Mag 3" or the typo "Mag 38". */
const ELECTRONIC_MAG = /^(?:Elec\.?|Electric)\s+(?:Vis\.?|Vision)\s+Mag\s+3\d?$/i;
const OPTICAL_MAG = /^Optical\s+(?:Vis\.?|Vision)\s+Mag\s+3\d?$/i;

export const NameFixes = {
  /** The corrected name for an owned item, or null when it needs none. */
  fixedName(item) {
    const name = String(item?.name ?? '').replace(/\s+/g, ' ').trim();
    if (item?.type === 'gear') {
      const m = BROKEN_CLIP.exec(name);
      return m ? `${EXTENDED_CLIP}${m[1] ? ` [${m[1]}]` : ''}` : null;
    }
    if (item?.type === 'armor') {
      // baseName: the leading "+", the level and the tag come off, so the 0.7.0 and 0.8.0 spellings are one.
      const base = ModRatings.baseName(name);
      if (base === 'Transceiver') {
        const rating = ModRatings.splitName(name)?.rating;
        return `${HELMET_TRANSCEIVER}${rating ? ` [${rating}]` : ''}`;
      }
      if (base === 'Therm Vision') {
        const rating = ModRatings.splitName(name)?.rating;
        return `${THERMO_VISION}${rating ? ` [${rating}]` : ''}`;
      }
      if (ELECTRONIC_MAG.test(base)) return `${ELECTRONIC_MAGNIFICATION} [3]`;
      if (OPTICAL_MAG.test(base)) return `${OPTICAL_MAGNIFICATION} [3]`;
    }
    return null;
  },
};
