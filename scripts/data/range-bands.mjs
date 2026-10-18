/**
 * Which Strength a Strength-scaled range uses, and the minimum range of a weapon · pure.
 *
 * SR3 p.110: *"the bow's Strength Minimum is used to determine the distance."* SR3 p.118: *"A crossbow's
 * Strength Minimum Rating determines its range."* and *"Throwing weapons have no Strength Minimum Rating;
 * the thrower's Strength Attribute determines range and damage."* So a bow or crossbow reads the WEAPON's
 * Strength Minimum; thrown weapons (and slings, which the book does not give a minimum) keep the thrower's.
 */
export const MIN_STRENGTH_CATEGORIES = new Set(['Bow', 'LCB', 'MCB', 'HCB']);

/** The fixed Strength Minimum of each crossbow type · SR3 p.118 table (3 / 4 / 5). A bow has no fixed one. */
export const CROSSBOW_STR_MIN = { LCB: 3, MCB: 4, HCB: 5 };

/** Minimum range in metres · SR3 p.111, the asterisk on the Weapon Range Table: "Minimum Range" given under Short. */
export const MINIMUM_RANGE = { GrLn: 5, MisLn: 20 };

/**
 * Heavy Weapons for recoil · SR3 p.111: "Light, Medium, Heavy Machine Guns and all Assault Cannons" double
 * uncompensated recoil. MinG (the Cannon Companion minigun) is not named; it has always doubled here and stays.
 */
export const HEAVY_CATEGORIES = new Set(['LMG', 'MMG', 'HMG', 'MinG', 'ACan']);

export const RangeBands = {
  isHeavyWeapon: category => HEAVY_CATEGORIES.has(category ?? ''),

  /**
   * The Strength the range multipliers use. A bow/crossbow → the weapon's Strength Minimum (a crossbow with none
   * entered falls to its type's fixed minimum); anything else, or a bow with no minimum entered → the attacker's.
   */
  rangeStrength(category, weaponStrMin, attackerStr) {
    const own = Math.floor(Number(weaponStrMin));
    if (MIN_STRENGTH_CATEGORIES.has(category)) {
      if (own > 0) return own;
      if (CROSSBOW_STR_MIN[category]) return CROSSBOW_STR_MIN[category];
    }
    return Math.max(1, Number(attackerStr) || 1);
  },

  /** Minimum range (m) for a weapon category, or 0 when it has none. A weapon's own `minRange` wins when given. */
  minimumRange(category, own = 0) {
    const n = Number(own);
    if (n > 0) return n;
    return MINIMUM_RANGE[category] ?? 0;
  },

  /** A warning line when `metres` is closer than the weapon's minimum range, else ''. Warns, never refuses. */
  minimumRangeWarning(category, metres, own = 0) {
    const min = this.minimumRange(category, own);
    const d = (metres === null || metres === undefined || metres === '') ? NaN : Number(metres);
    if (!min || !Number.isFinite(d) || d >= min) return '';
    return `Minimum range: this weapon cannot be fired at targets closer than ${min} m (SR3 p.111); the target is ${Math.round(d * 10) / 10} m away.`;
  },
};
