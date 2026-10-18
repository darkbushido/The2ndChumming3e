/**
 * Explosive-round misfire · pure. SR3 p.116: *"Explosive rounds will misfire whenever all the dice rolled for the
 * attack test come up 1."* The book's consequence: the shooter is attacked with the weapon's NORMAL damage, resisted
 * without Combat Pool, and the shot misses. The system offers the card; the shooter/GM clicks (no automation).
 */
export const EXPLOSIVE_AMMO = new Set(['explosive', 'exExplosive']);

export const Misfire = {
  /** Does this attack roll misfire? Every die a 1 (the Rule of One flag) with explosive or EX explosive loaded. */
  applies({ ammoType, glitch, isMelee = false } = {}) {
    return glitch === true && !isMelee && EXPLOSIVE_AMMO.has(String(ammoType ?? ''));
  },

  /**
   * The soak-button payload for the shooter's resisting the misfire: normal damage (the weapon's own code, none of the
   * explosive Power bonus and no fire-mode staging), normal ammunition against their armour, no Combat Pool.
   * @param {object} o  { shooterId, weaponItemId, parsed: {power, level, isStun}, code }
   */
  payload({ shooterId, weaponItemId = null, parsed, code }) {
    if (!parsed || !shooterId) return null;
    return {
      attackerActorId: shooterId,
      targetActorId:   shooterId,
      weaponItemId,
      ammoType:        null,
      isMelee:         false,
      stagedPower:     parsed.power,
      stagedLevel:     parsed.level,
      isStun:          !!parsed.isStun,
      rawDamage:       code,
      noPools:         true,
      noPoolsNote:     'Explosive round misfired: no Combat Pool dice on this test (SR3 p.116)',
    };
  },
};
