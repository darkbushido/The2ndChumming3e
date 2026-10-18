/**
 * Vehicle armour is hardened · pure. SR3 p.132: *"Vehicle armor is hardened armor, meaning that it can
 * deflect all damage from weapons with a Power (modified by the vehicle's Body, but not by burst or
 * autofire) equal to or less than the Armor Rating."* p.149: *"If a weapon's reduced Power (unaugmented by
 * burst or full-auto fire rates) does not exceed the armor's rating, the weapons fire does no damage to the
 * vehicle."* Above the Armor Rating it reduces the Power like ordinary armour (the soak TN).
 *
 * ⚠ The comparison uses the Power BEFORE the burst/full-auto bonus. The soak card used the staged Power, which
 * includes that bonus, so an Uzi III burst (6M, +3) against Armor 3 read 9 → 4 > 3 and "did damage";
 * the book's 6 → 3 ≤ 3 is "a bunch of sparks" (found in the 0.7.0 rules check, vehicles.md #11).
 *
 * The attack hands over `hardenedPower` on its damage base: the vehicle-reduced Power of the weapon's own
 * code, with the fire-mode bonus taken back off (`unaugmentedPower`). Anything that does not set it (a
 * grenade, a spell, a collision) has no burst to exclude, so the staged Power stands in.
 */
export const VehicleArmor = {
  /** The weapon's Power with the burst / full-auto bonus taken back off. Never below 0. */
  unaugmentedPower(power, modeBonus = 0) {
    return Math.max(0, (Number(power) || 0) - Math.max(0, Number(modeBonus) || 0));
  },

  /** The Power the hardened-armour test compares: the carried unaugmented figure, else the staged one. */
  comparedPower(stagedPower, hardenedPower) {
    const h = Number(hardenedPower);
    return Number.isFinite(h) && hardenedPower !== null && hardenedPower !== undefined && hardenedPower !== ''
      ? h : (Number(stagedPower) || 0);
  },

  /** True when the armour deflects the attack outright: Power equal to or less than the Armor Rating. */
  deflects(comparedPower, armor) {
    return (Number(comparedPower) || 0) <= (Number(armor) || 0);
  },
};
