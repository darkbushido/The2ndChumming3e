/**
 * Shotgun shot, choke and spread · SR3 p.117 (TODO 57). Pure — no Foundry.
 *
 * > "The shotgun user can set his weapon's choke at anywhere from 2 to 10 … For every number of meters
 * > equal to the choke setting that the shot travels, it will spread one meter." At choke 5: a one-meter
 * > path for five meters, two meters to ten, three to fifteen, four to twenty.
 * > "Every time a shot round increases its spread, it loses 1 point of power. Every time the shot spreads,
 * > subtract -1 from the attacker's target number … a choke setting 5 shot would be -2/-2 at fifteen
 * > meters, and then -3/-3 at twenty meters. When the Power reaches 0, the shot is considered ineffective."
 * > "+1 per meter of shotgun spread at the target's position" — the Dodge Test, p.113.
 *
 * ⚠ **Width is `ceil(d / choke)`, at least 1; the spreads are width − 1.** The path starts 1 m wide and
 * has not spread at all — at exactly the choke distance it is still 1 m.
 * ⚠ **The Dodge modifier counts SPREADS, not the width** — the reading this system already used for the
 * declared spread (TODO 57): a point-blank shot that has not spread adds nothing. p.113's "per meter of
 * shotgun spread" could be read as the width; that is a question for the maintainer, and the dialog's
 * spread box stays editable.
 * ⚠ **Only SHOT rounds spread.** *"The shotguns described in the Street Gear section fire slug rounds"*;
 * shot is an ammunition type (`shot`, flechette rules on the weapon's Damage Code).
 */
export const CHOKE_MIN = 2, CHOKE_MAX = 10, CHOKE_DEFAULT = 5;

export const Shotgun = {
  /** A choke setting, clamped to the book's 2-10; blank or junk → the default. */
  choke(v) {
    const n = Math.round(Number(v));
    if (!Number.isFinite(n) || v === null || v === '' || v === undefined) return CHOKE_DEFAULT;
    return Math.min(CHOKE_MAX, Math.max(CHOKE_MIN, n));
  },

  /** How wide the shot is `metres` out, in metres (at least 1). */
  width(metres, choke) {
    const d = Math.max(0, Number(metres) || 0);
    return Math.max(1, Math.ceil(d / Shotgun.choke(choke)));
  },

  /** How many times it has spread by then — the count every effect reads. */
  spreads(metres, choke) {
    return Shotgun.width(metres, choke) - 1;
  },

  /** Every p.117 effect of `spreads`: Power and the attacker's TN each −1 per spread, the Dodge TN +1. */
  effects(spreads) {
    const s = Math.max(0, Math.floor(Number(spreads) || 0));
    return { spreads: s, power: -s, tn: -s, dodge: s };
  },

  /** Does this weapon throw shot? A shotgun (ShtG) with shot loaded. */
  firesShot(weapon) {
    return weapon?.system?.category === 'ShtG' && weapon?.system?.loadedAmmoType === 'shot';
  },
};
