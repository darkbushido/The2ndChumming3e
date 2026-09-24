/**
 * Area grenades that deal no damage — gas, smoke, flash · SR3 p.283 (TODO 155). Pure — no Foundry.
 *
 * A grenade with no parseable Damage Code (`--`, `Special`) still detonates: it lands, scatters, and leaves an
 * AREA. The book gives each an effect instead of damage, and the system announces it and marks the ground —
 * nothing is applied (the design ethos: the GM decides what the gas or the dark does to whom):
 *
 * > "Gas Grenades: … The gas cloud affects everything within a 10-meter radius, and lasts for 2 Combat Turns
 * > (less in windy areas, at the gamemaster's discretion)."
 * > "Smoke Grenades: … release a cloud of smoke that fills an area 20 meters in diameter, lasting for 2 Combat
 * > Turns (less in windy areas). Smoke obscures vision, applying visibility modifiers to relevant tests.
 * > Infra-red smoke contains hot particles that obscure thermographic vision."
 * > "Flash-Pak: … Anyone facing a flash-pak receives a +4 target number modifier (+2 if the target has flare
 * > compensation). The pak also negates modifiers from poor or no lighting, but imposes its own +2 modifier
 * > because of the strobing flashes."                                                              — SR3 p.283
 *
 * On the item: `system.areaRadius` (metres, blank = no marked area) and `system.areaEffect` (the card text).
 */
export const AreaEffect = {
  /**
   * The effect a thrown item leaves, or null when it is an ordinary damaging grenade.
   * ⚠ Only when there is NO usable Damage Code: a grenade that hurts keeps the damage flow, even if it also
   * has effect text on it.
   * @param {object} system  the item's `system`
   * @param {object|null} parsedDamage  `SR3EItem.parseDamageCode(system.damage)`
   */
  of(system, parsedDamage) {
    if (parsedDamage) return null;
    const text   = String(system?.areaEffect ?? '').trim();
    const radius = Number(system?.areaRadius);
    if (!text && !(radius > 0)) return null;
    return { text, radius: radius > 0 ? radius : null, turns: AreaEffect.turns(text) };
  },

  /** Combat Turns the effect lasts, read from its text ("lasts for 2 Combat Turns"); null when it says none. */
  turns(text) {
    const m = /(\d+)\s+Combat\s+Turns?/i.exec(String(text ?? ''));
    return m ? Number(m[1]) : null;
  },

  /** The marker colour: grey for smoke, green for gas, white for a flash, amber otherwise. */
  color(name) {
    const n = String(name ?? '');
    if (/smoke/i.test(n)) return '#8a9099';
    if (/gas|neuro|nerve/i.test(n)) return '#6fbf73';
    if (/flash/i.test(n)) return '#f5f5dc';
    return '#c8a040';
  },

  /** The combat round on which a marker laid at `round` ends: it lasts `turns` Combat Turns. Null = never. */
  expiresRound(round, turns) {
    return Number.isFinite(round) && turns > 0 ? round + turns : null;
  },

  /** Has a marker that expires on `expires` run out at `round`? */
  hasExpired(expires, round) {
    return Number.isFinite(expires) && Number.isFinite(round) && round >= expires;
  },
};
