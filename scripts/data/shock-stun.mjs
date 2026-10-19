/**
 * Shock weapons stun the target · SR3 p.124-125. Pure — no Foundry.
 *
 * > "Shock weapons include melee-combat stun batons and ranged-combat tasers. Both work on a similar principle,
 * > relying on a contact discharge of electricity rather than kinetic energy. Each causes Stun damage, and
 * > combat with a stun baton (melee) or taser gun (ranged) is handled according to the normal rules for that
 * > type of weapon.
 * > A successful hit by a stun weapon stuns the target for a number of Combat Turns equal to the Power of the
 * > attack, minus one-half (round down) any impact armor worn, and also minus the successes generated from a
 * > Body or Willpower Test (whichever is greater) made against a Target Number 4. This state of disorientation
 * > imposes an additional +2 target modifier to all tests for as long as it lasts.
 * > Impact armor protects against shock weapons, but its rating is halved (rounding down)."   — SR3 p.124-125
 *
 * The Shock Glove (p.275-276) "deliver[s] an extra 7S Stun (see Shock Weapons, p. 124)", so its shock is the
 * EXTRA Damage Code (`extra-damage.mjs`); the fist is not a shock.
 *
 * ⚠ The stun condition deals no damage of its own (the maintainer, 2026-10-18): the damage is the weapon's Stun
 * code through the ordinary Damage Resistance Test. This module only works out how long the disorientation lasts
 * and what it costs. Nothing is applied by itself — the target's card offers "Mark stunned".
 *
 * ⚠ **Which Power:** the Power of the shock code AS PRINTED on the weapon (7 for the Shock Glove, 6 for the Stun
 * Baton, 10 for the Defiance Super Shock), after any edit the GM made to the code — not the staged Power.
 */

export const STUN_PAGE   = 'SR3 p.124-125';
export const STUN_TN     = 4;                 // the Body / Willpower Test's Target Number
export const STUN_MOD    = 2;                 // "+2 target modifier to all tests"
export const STUN_STATUS = 'sr3e-stunned';    // the token status effect

export const ShockStun = {
  /**
   * Is this weapon a shock weapon? The `shock` flag (set in the packs on stun batons, tasers and the Shock Glove);
   * a firearm of category Taser (Tasr) always is, flag or not — a hand-made taser or a cybergun taser needs no tick.
   * @param {object} weaponOrSystem  an item, or its `system`
   */
  isShock(weaponOrSystem) {
    const s = weaponOrSystem?.system ?? weaponOrSystem;
    return s?.shock === true || s?.category === 'Tasr';
  },

  /**
   * The shock code of a weapon's MAIN attack, or '' when the main attack is not the shock. A glove's shock is its
   * extra code (the fist is not), so a weapon with an `extraDamage` returns ''; its extra payload names its own code.
   * @param {object} weaponOrSystem
   * @param {string} [rawDamage]  the code as fired (a GM may have edited it); defaults to the weapon's `damage`
   */
  mainCode(weaponOrSystem, rawDamage) {
    const s = weaponOrSystem?.system ?? weaponOrSystem;
    if (!ShockStun.isShock(s)) return '';
    if (String(s?.extraDamage ?? '').trim()) return '';
    return String(rawDamage || s?.damage || '').trim();
  },

  /**
   * The Power printed in a Damage Code: "7S Stun" → 7, "+7S Stun" → 7. A code with no leading number ("(STR)S")
   * has none printed, so the caller falls back to the Power it resolved. Null when there is nothing to read.
   */
  printedPower(code) {
    const m = String(code ?? '').match(/^\s*\+?\s*(\d+)/);
    return m ? parseInt(m[1], 10) : null;
  },

  /** Impact armour against a shock weapon counts at half, rounded down (p.124). */
  halfImpact(impact) {
    return Math.floor(Math.max(0, Number(impact) || 0) / 2);
  },

  /**
   * The Body or Willpower Test's dice — "whichever is greater".
   * @returns {{ dice:number, attr:'body'|'willpower' }}
   */
  resistDice(body, willpower) {
    const b = Math.max(0, Math.trunc(Number(body) || 0));
    const w = Math.max(0, Math.trunc(Number(willpower) || 0));
    return w > b ? { dice: w, attr: 'willpower' } : { dice: b, attr: 'body' };
  },

  /**
   * Combat Turns stunned: Power − one-half (round down) of the Impact armour worn − the test's successes, never
   * below 0 (0 = not stunned).
   * @param {{ power:number, impact?:number, successes?:number }} o  `impact` is the FULL Impact rating (halved here)
   */
  duration({ power, impact = 0, successes = 0 } = {}) {
    const p = Math.max(0, Math.trunc(Number(power) || 0));
    const s = Math.max(0, Math.trunc(Number(successes) || 0));
    return Math.max(0, p - ShockStun.halfImpact(impact) - s);
  },

  /** One Combat Turn has passed: the stun counts down by one, to a floor of 0. */
  countDown(turns) {
    return Math.max(0, Math.trunc(Number(turns) || 0) - 1);
  },

  /** The additional target modifier while stunned: +2 on all tests (p.125). */
  tnMod(stunned) {
    return stunned ? STUN_MOD : 0;
  },

  /** "Stunned +2 (3 Combat Turns)", for a TN breakdown. */
  note(turns) {
    const t = Math.max(0, Math.trunc(Number(turns) || 0));
    return `Stunned +${STUN_MOD}${t ? ` (${t} Combat Turn${t === 1 ? '' : 's'})` : ''}`;
  },
};
