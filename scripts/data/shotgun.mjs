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
 *
 * SR3 p.117 — SHOTGUN SPREAD EXAMPLE, choke 3  (each # row is 1 m of width; it widens ½ m each side)
 *
 *               0 m        3 m        6 m        9 m
 *                |          |          |##########|
 *                |          |##########|##########|
 *    [gun] >=====|##########|##########|##########|
 *                |          |##########|##########|
 *                |          |          |##########|
 *
 *    width           1 m        2 m        3 m
 *    spreads          0          1          2
 *    Power            —         −1         −2
 *    attacker TN      —         −1         −2      ← easier to hit…
 *    target Dodge TN  —         +1         +2      ← …and harder to dodge, but less damage
 *
 *    Everyone inside the cone is a valid target; each gets +1 Damage Resistance die per
 *    other target in front of them. At Power 0 the shot is ineffective.
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

  /**
   * Does this weapon follow the shotgun rules (choke, spread, shotgun ammunition, double recoil in BF)?
   * A shotgun (category ShtG) always does; so does any firearm ticked `shotgunRules` — the Remington
   * Roomsweeper, which keeps heavy-pistol ranges and the Pistols skill (category HPist) but, SR3 p.277:
   * "The weapon uses heavy-pistol ranges, but shotgun rules; see Shotguns, p. 117 of Combat."
   */
  usesRules(weaponOrSystem) {
    const s = weaponOrSystem?.system ?? weaponOrSystem;
    return s?.category === 'ShtG' || s?.shotgunRules === true;
  },

  /**
   * The category code that picks the SKILL (and its default attribute) — not the ranges. A shotgun-rules weapon
   * uses the Shotguns skill whatever its category says: the Roomsweeper "uses heavy-pistol ranges, but shotgun
   * rules" (SR3 p.277) and the maintainer rules it a shotgun for the skill too (2026-10-18), while its HPist
   * category still gives the heavy-pistol range bands. Everything else keeps its own category.
   */
  skillCode(system) {
    return Shotgun.usesRules(system) ? 'ShtG' : (system?.category || null);
  },

  /**
   * Is a shotgun-rules weapon of another category (the Roomsweeper) firing NORMAL rounds? SR3 p.277: it
   * "can be loaded with normal rounds instead of shotgun rounds, in which case the weapon does 9M damage."
   *
   * ⚠ Its Damage Code, 9S(f), is the SHOT code (the Firearms table prints it, and `(f)` says the flechette
   * level is already in it). It fires shot unless an ordinary ammunition item is loaded: a gun with nothing
   * loaded (`equippedAmmoId` blank) stays on the table's code, `loadedAmmoType` 'shot' is shot, and
   * 'regular' with an ammunition item loaded is normal rounds. A plain ShtG is never this case (its code is
   * the slug code already).
   */
  firesNormalRounds(system) {
    return system?.shotgunRules === true && system?.category !== 'ShtG'
      && /\(f\)/i.test(String(system?.damage ?? ''))
      && (system?.loadedAmmoType ?? 'regular') === 'regular'
      && !!system?.equippedAmmoId;
  },

  /**
   * The Damage Code to fire with: the weapon's own, except normal rounds in a shotgun-rules weapon, which
   * drop the flechette level the `(f)` code carries — 9S(f) → 9M (SR3 p.277; the Defiance T-250's short barrel
   * prints "9S(f) or 9M" the same way, p.279). Anything else is returned untouched.
   */
  damageCode(system) {
    const code = String(system?.damage ?? '');
    if (!Shotgun.firesNormalRounds(system)) return code;
    const m = code.match(/^\s*(\d+)\s*([LMSD])\s*\(f\)\s*(.*)$/i);
    if (!m) return code;
    const STAGES = ['L', 'M', 'S', 'D'];
    const lvl = STAGES[Math.max(0, STAGES.indexOf(m[2].toUpperCase()) - 1)];
    return `${m[1]}${lvl}${m[3] ? ' ' + m[3] : ''}`;
  },

  /** Does this weapon throw shot? A shotgun-rules weapon with shot loaded — or a Roomsweeper-type on its default. */
  firesShot(weapon) {
    const s = weapon?.system;
    if (!Shotgun.usesRules(s)) return false;
    if (s.loadedAmmoType === 'shot') return true;
    // The default of a non-ShtG shotgun-rules weapon with an (f) code: shot, until normal rounds are loaded.
    return s.category !== 'ShtG' && /\(f\)/i.test(String(s.damage ?? ''))
      && (s.loadedAmmoType ?? 'regular') === 'regular' && !s.equippedAmmoId;
  },
};
