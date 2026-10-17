/**
 * Limited spells · SR3 p.180-181 — TODO 223. **Pure — no Foundry.**
 *
 * > "A limit may either reduce the Force of a spell for purposes of Drain, or reduce the Karma cost and
 * > difficulty to learn the spell, by its modifier. The player chooses which when the spell is learned.
 * > The reduction in Force for Drain purposes also affects whether or not the caster suffers stun or
 * > physical Drain damage." — p.180
 * > "There are two limits a caster may place on a spell: fetish and exclusive. A spell can have both a
 * > fetish and an exclusive modifier, but they must be separate in purpose." — p.180
 * > "Fetish (-1 modifier): … Without the fetish touching his body, the magician cannot cast the limited
 * > spell." · "Exclusive (-2 modifier): … making casting and sustaining the spell an Exclusive Action
 * > (see Exclusive Actions, p. 160)." — p.180-181
 *
 * The book's example: Grandfather Bones, Magic 6, learns Fireball at Force 8 with the exclusive limit
 * taken off Drain: "he subtracts 2 from the Force before determining whether or not the Drain does
 * physical damage and before factoring in the spell's Drain Modifier."
 *
 * A spell records, for each limit, WHERE it was taken: `''` (no such limit), `'drain'` or `'learning'`.
 * `system.limitFetish` / `system.limitExclusive`. Blank is the default, so existing spells are unlimited.
 */

export const LIMITS = {
  fetish:    { modifier: 1, field: 'limitFetish',    label: 'Fetish' },
  exclusive: { modifier: 2, field: 'limitExclusive', label: 'Exclusive' },
};

const SIDES = ['drain', 'learning'];

/** Where a limit was taken: `'drain'`, `'learning'`, or `''` (the spell does not carry it). */
function side(spell, key) {
  const v = String(spell?.system?.[LIMITS[key].field] ?? '').trim().toLowerCase();
  return SIDES.includes(v) ? v : '';
}

/** Sum of the modifiers of the limits taken on `which` (`'drain'` or `'learning'`). */
function total(spell, which) {
  return Object.keys(LIMITS).reduce((n, key) => n + (side(spell, key) === which ? LIMITS[key].modifier : 0), 0);
}

export const SpellLimits = {
  LIMITS,
  side,

  /** What the Karma cost and difficulty to learn drop by. */
  learningReduction(spell) { return total(spell, 'learning'); },

  /** What the Force drops by for Drain purposes. */
  drainReduction(spell) { return total(spell, 'drain'); },

  /**
   * The Force the spell DRAINS as — the cast Force less the limits taken off Drain, never below 0.
   * It feeds the Drain Power (half of it), the Drain Level's Force and the Force-versus-Magic test
   * for Stun or Physical (p.180). The spell's own Force (damage Power, resistance TN) is untouched.
   */
  drainForce(force, spell) {
    const f = Math.max(0, Math.floor(Number(force) || 0));
    return Math.max(0, f - SpellLimits.drainReduction(spell));
  },

  /** Does this spell carry a limit at all? */
  isLimited(spell) { return Object.keys(LIMITS).some(k => side(spell, k) !== ''); },

  /**
   * Cast-time reminders, as plain strings. Warned, never refused — the GM decides whether the fetish is
   * to hand (p.180), and an Exclusive Action is the table's to police (p.160).
   */
  castWarnings(spell) {
    const out = [];
    if (side(spell, 'fetish') !== '')    out.push('Fetish-limited: the fetish must be touching the caster to cast it (SR3 p.180).');
    if (side(spell, 'exclusive') !== '') out.push('Exclusive-limited: casting and sustaining it is an Exclusive Action (SR3 p.180-181, Exclusive Actions p.160).');
    return out;
  },

  /** One line for the cast card: what was taken off Drain. Empty when nothing was. */
  drainNote(force, spell) {
    const cut = SpellLimits.drainReduction(spell);
    if (!cut) return '';
    return `Limit −${cut}: drains as Force ${SpellLimits.drainForce(force, spell)} (cast at ${force}) (SR3 p.180).`;
  },

  /** A short label for a lists: "fetish −1 (Drain), exclusive −2 (learning)". Empty when unlimited. */
  describe(spell) {
    return Object.entries(LIMITS)
      .filter(([k]) => side(spell, k) !== '')
      .map(([k, v]) => `${k} −${v.modifier} (${side(spell, k) === 'drain' ? 'Drain' : 'learning'})`)
      .join(', ');
  },
};
