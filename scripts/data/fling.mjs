/**
 * Fling — a ranged attack with different rolls · SR3 p.197 (rules check 0.7.0; the maintainer: "it's a
 * ranged attack with different rolls"). **Pure — no Foundry.**
 *
 * > "This spell psychokinetically hurls a single object of no more than (Magic Attribute) kilograms at a
 * > designated target with a Strength equal to the spell's Force. The caster must touch the item to be
 * > thrown. Treat the Sorcery Test as a normal Ranged Combat Test for the purposes of the item hitting the
 * > target. Throwing weapons propelled by this spell use their normal range based on the spell's effective
 * > Strength."
 *
 * So the Sorcery Test is the attack (its TN is the ranged base TN by range band, p.112), the target may dodge
 * (p.113) and then resists the object's damage with a Damage Resistance Test — there is no Spell Resistance
 * Test, as for the Elemental spells (p.183). Two things the book leaves open are the GM's call and are stated
 * as such on the card:
 *   - **Damage.** A thrown weapon does its own Damage Code at Strength = Force ("the thrower's Strength
 *     Attribute determines range and damage", p.117 — here the spell's Force). Any other object has no printed
 *     damage: the caster names a code in the cast dialog; blank falls to Force L, flagged for the GM.
 *   - **Range of an ordinary object.** Only throwing weapons have a range table (p.111: Thrown Knife STR /
 *     ×2 / ×3 / ×5, Shuriken STR / ×2 / ×5 / ×7); an ordinary object is given the band the caster / GM names.
 */

/** The weapon categories whose range scales with Strength, kept in `SR3E.weaponRangeMultipliers`. */
export const Fling = {
  /** Only a `thrown` item is a throwing weapon (a bow, crossbow or sling is not thrown by hand). */
  isThrowingWeapon(item) {
    return item?.type === 'thrown';
  },

  /** A stand-in "actor" whose Strength is the spell's Force — what `parseDamageCode` reads for (STR)L. */
  forceActor(force) {
    return { system: { attributes: { strength: { value: Math.max(0, Math.trunc(Number(force) || 0)) } } } };
  },

  /** Band maxima in metres: Strength (= Force) × the category's multipliers, p.111. `null` when none are given. */
  bands(multipliers, force) {
    if (!Array.isArray(multipliers) || multipliers.length < 4) return null;
    const f = Math.max(1, Math.trunc(Number(force) || 0));
    return multipliers.slice(0, 4).map(m => f * m);
  },

  /** The band key a distance falls in (beyond Extreme is still Extreme — a warning, never a refusal). */
  bandForDistance(bands, metres) {
    const d = Number(metres);
    if (!Array.isArray(bands) || !Number.isFinite(d)) return null;
    const keys = ['short', 'medium', 'long', 'extreme'];
    const i = bands.findIndex(max => d <= max);
    return keys[i === -1 ? 3 : i];
  },

  /**
   * The damage of the flung object. `parse` is `SR3EItem.parseDamageCode`; `weaponCode` the thrown weapon's own
   * code (or null for another object); `typedCode` what the caster entered for another object.
   * → `{ base: {power, level, isStun}, raw, source, gmCall }`.
   */
  damage({ weaponCode = null, typedCode = '', force = 1, parse }) {
    const f = Math.max(1, Math.trunc(Number(force) || 0));
    const fmt = b => `${b.power}${b.level}${b.isStun ? ' Stun' : ''}`;
    const isWeapon = !!String(weaponCode ?? '').trim();
    const code = String(isWeapon ? weaponCode : typedCode ?? '').trim();
    const parsed = code && parse ? parse(code, Fling.forceActor(f)) : null;
    if (parsed) {
      return { base: parsed, raw: fmt(parsed), gmCall: !isWeapon,
        source: isWeapon ? `the thrown weapon's own Damage Code at Strength ${f} (= Force)` : `the Damage Code entered for the object — the GM's call` };
    }
    const base = { power: f, level: 'L', isStun: false };
    return { base, raw: fmt(base), gmCall: true,
      source: `no readable Damage Code for the object — Force ${f} Light as a placeholder, the GM's call` };
  },
};
