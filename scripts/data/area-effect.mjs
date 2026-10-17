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

  /** The marker colour: grey for smoke, rose for infra-red smoke, green for gas, white for a flash, amber otherwise. */
  color(name) {
    return AreaEffect.look(AreaEffect.kind(name))?.color ?? '#c8a040';
  },

  /**
   * What sort of cloud a grenade leaves, from its name: `'irsmoke'`, `'smoke'`, `'gas'`, `'flash'` or `''`.
   * Infra-red smoke is its own kind — *"Infra-red smoke contains hot particles that obscure thermographic
   * vision"* (SR3 p.283) — and so is the non-core Thermal Smoke.
   */
  kind(name) {
    const n = String(name ?? '');
    if (/smoke/i.test(n)) return /\bIR\b|infra|thermal/i.test(n) ? 'irsmoke' : 'smoke';
    if (/gas|neuro|nerve/i.test(n)) return 'gas';
    if (/flash/i.test(n)) return 'flash';
    return '';
  },

  /**
   * How a cloud looks on the map (TODO 164, item 2). Foundry v14's Region has a colour but no texture, so the
   * look is the Region (its coloured outline, and the shape clipped to the walls) plus a pattern-filled
   * Drawing laid under it, textured by a small SVG the system ships in `styles/regions/`. Opacity differs by
   * kind: smoke is dense, gas is a thin tinted haze, a flash is a bright wash.
   */
  look(kind) {
    const base = 'systems/The2ndChumming3e/styles/regions';
    return ({
      smoke:   { color: '#8a9099', fillAlpha: 0.6,  texture: `${base}/smoke.svg` },
      irsmoke: { color: '#a0646a', fillAlpha: 0.6,  texture: `${base}/irsmoke.svg` },
      gas:     { color: '#6fbf73', fillAlpha: 0.45, texture: `${base}/gas.svg` },
      flash:   { color: '#f5f5dc', fillAlpha: 0.55, texture: `${base}/flash.svg` },
    })[kind] ?? null;
  },

  /**
   * The Visibility Table row (SR3 p.112) to OFFER the GM's TN window when someone stands in a cloud of this
   * kind. Ordinary smoke → *Heavy Smoke/Fog/Rain* (a grenade's cloud is dense; the book does not say which
   * row, so it is an editable offer), infra-red smoke → *Thermal Smoke*. Gas and a flash change no row.
   */
  visibilityCondition(kind) {
    return ({ smoke: 'Heavy Smoke/Fog/Rain', irsmoke: 'Thermal Smoke' })[kind] ?? null;
  },

  /**
   * Of the clouds the fighters stand in, the row to offer: the one with the HIGHEST modifier for the viewer
   * (`modOf(condition)` — the caller's Visibility Table lookup for the viewer's best vision), ties to the
   * first. Null when none of them obscures vision.
   */
  pickCondition(kinds, modOf) {
    let best = null, bestMod = -Infinity;
    for (const c of [...new Set((kinds ?? []).map(k => AreaEffect.visibilityCondition(k)).filter(Boolean))]) {
      const m = Number(modOf?.(c)) || 0;
      if (m > bestMod) { best = c; bestMod = m; }
    }
    return best;
  },

  /**
   * Wind · SR3 p.283: *"lasts for 2 Combat Turns (less in windy areas, at the gamemaster's discretion)"*.
   * Move the end round of a cloud by `delta` Combat Turns. `ended` when no turns remain at `round`.
   * Returns `{ expires, remaining, ended }`; a cloud with no end round (null) is given one from `round`.
   */
  shiftExpiry(expires, delta, round) {
    const d = Math.trunc(Number(delta) || 0);
    if (!Number.isFinite(round)) return { expires: Number.isFinite(expires) ? expires : null, remaining: null, ended: false };
    const start = Number.isFinite(expires) ? expires : round;
    const next  = start + d;
    return { expires: next, remaining: Math.max(0, next - round), ended: next <= round };
  },

  /** Combat Turns a cloud has left at `round`; null when it has no end round. */
  remaining(expires, round) {
    return Number.isFinite(expires) && Number.isFinite(round) ? Math.max(0, expires - round) : null;
  },

  /** A cloud's Region name with its remaining Combat Turns. */
  label(name, remaining) {
    return remaining == null ? String(name) : `${name} (${remaining} Combat Turn${remaining === 1 ? '' : 's'} left)`;
  },

  /**
   * The toxin a gas grenade releases · SR3 p.250, p.283. The core book's Neuro-Stun entry is **VIII**
   * (*"Damage: 6S Stun · Speed: End of the following Combat Turn"*, p.250), and p.283's grenade text names
   * VIII — but p.283's Explosives Table row and our grenade item say **VII**, which the book never gives
   * statistics for. We resolve with VIII's numbers, say so, and let the GM change the Power.
   */
  gasToxin(itemName) {
    const m = /neuro-?\s*stun\s+(VIII|VII|IX|X)\b/i.exec(String(itemName ?? ''));
    const labelled = m ? m[1].toUpperCase() : '';
    return {
      name: 'Neuro-Stun VIII', damage: '6S', speed: 'the end of the following Combat Turn',
      disorientation: 2, labelled,
      discrepancy: labelled && labelled !== 'VIII'
        ? `This grenade is labelled Neuro-Stun ${labelled} (SR3 p.283's table row), but p.283's own text and the toxin entry on p.250 are Neuro-Stun VIII — the only one the core book gives numbers for. The card uses VIII's 6S; change the Power if your table rules otherwise.`
        : '',
    };
  },

  /**
   * Flash-Pak · SR3 p.283: *"Anyone facing a flash-pak receives a +4 target number modifier (+2 if the target
   * has flare compensation). The pak also negates modifiers from poor or no lighting, but imposes its own +2
   * modifier because of the strobing flashes."* → what a token that was facing it carries.
   */
  flashMods(flareCompensation) {
    const facing = flareCompensation ? 2 : 4;
    return { facing, strobe: 2, total: facing + 2, flare: !!flareCompensation };
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
