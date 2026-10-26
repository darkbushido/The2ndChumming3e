/**
 * Damaging a barrier · SR3 p.119, p.124-125. Pure — the 🧱 Barrier Damage tool and the Demolitions roll use it.
 *
 * > "Attacks to break through a barrier (most commonly doors) are resolved in a similar manner to the rules for
 * > Blast against Barriers (p. 119), except that the barrier has twice its normal Barrier Rating against firearm
 * > rounds and other ranged attacks. … Against melee attacks, a barrier has twice its normal Barrier Rating.
 * > Against combat spells, barriers have twice their normal rating. Against elemental manipulation spells, use
 * > the normal Barrier Rating.
 * >     A regular door will break open when its Barrier Rating is reduced to one-half. A security door's rating
 * > must be reduced to 0 before it will break open."                                        — SR3 p.125
 *
 * Blast is twice the rating (p.119); a placed Demolitions charge the normal rating (p.119). "Security doors have
 * twice the rating of the material" (p.124).
 *
 * ⚠ Melee is ×2 for every weapon. The blunt-normal / edged-double split on p.125 belongs to Firing Through —
 * hitting someone on the far side — not to breaking the barrier (the maintainer's ruling, 2026-10-25).
 */
export const Barrier = {
  /** Attack kinds, in the order the tool lists them. `mult` = the Barrier Rating multiplier. */
  ATTACKS: {
    blast:       { mult: 2, label: 'Blast (grenade / explosive)',    page: 'p.119' },
    demolitions: { mult: 1, label: 'Demolitions (placed charge)',    page: 'p.119' },
    ranged:      { mult: 2, label: 'Firearm / other ranged attack',  page: 'p.125' },
    melee:       { mult: 2, label: 'Melee (any weapon or unarmed)',  page: 'p.125' },
    combatSpell: { mult: 2, label: 'Combat spell',                   page: 'p.125' },
    elemental:   { mult: 1, label: 'Elemental manipulation spell',   page: 'p.125' },
  },

  /** Door kinds. `mult` scales the material's rating (p.124). */
  DOORS: {
    '':       { mult: 1, label: 'Not a door' },
    regular:  { mult: 1, label: 'Regular door — opens at half its rating' },
    security: { mult: 2, label: 'Security door (×2 material) — opens at 0' },
  },

  /** Barrier Rating multiplier for an attack kind; an unknown kind uses the normal rating. */
  multiplier(attack) {
    return Barrier.ATTACKS[attack]?.mult ?? 1;
  },

  /** A door's starting rating from its material's (p.124). */
  doorRating(materialBR, door) {
    return (Number(materialBR) || 0) * (Barrier.DOORS[door]?.mult ?? 1);
  },

  /**
   * The Barrier Effect Table (p.124) for `power` against a barrier at `currentBR`.
   * The hole increments count half the barrier's own (unadjusted) rating, as the tool always has.
   * `remainingPower` is a blast's only — "If the barrier falls, the blast continues on, but its Power Level is
   * reduced by the original Barrier Rating" (p.119); a bullet or a fist does not carry on.
   */
  effect(power, currentBR, attack = 'blast') {
    const effectiveBR = currentBR * Barrier.multiplier(attack);
    if (power < effectiveBR / 2) {
      return { result: 'no_effect', effectiveBR, brReduction: 0, holes: 0, remainingPower: null };
    }
    const halfCurrentBR = currentBR / 2;
    const increments    = power <= effectiveBR ? 0
      : halfCurrentBR > 0 ? Math.floor((power - effectiveBR) / halfCurrentBR) : 1;
    // Above the rating but short of one whole increment still meets "equal to or greater than ½" — the
    // barrier loses 1, it is not left untouched.
    if (increments < 1) {
      return { result: 'damage', effectiveBR, brReduction: 1, holes: 0, remainingPower: null };
    }
    const remainPower   = attack === 'blast' ? power - currentBR : null;
    return { result: 'breach', effectiveBR, brReduction: increments, holes: increments * 0.5, remainingPower: remainPower };
  },

  /** The rating at which a door breaks open: half the original for a regular door, 0 for a security door. */
  doorOpensAt(door, originalBR) {
    if (door === 'regular')  return (Number(originalBR) || 0) / 2;
    if (door === 'security') return 0;
    return null;
  },

  /** Whether a door now stands open at `newBR` (p.125). null when the barrier is not a door. */
  doorOpens(door, originalBR, newBR) {
    const at = Barrier.doorOpensAt(door, originalBR);
    return at === null ? null : newBR <= at;
  },
};
