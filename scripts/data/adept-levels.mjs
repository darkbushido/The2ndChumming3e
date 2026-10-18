/**
 * How many LEVELS an adept has in a power, for the Magic cap · SR3 p.168. Pure — no Foundry.
 *
 * > "An adept cannot have more levels in a power than the adept's Magic Attribute. For example, an adept with
 * > Magic 4 cannot have more than 4 points worth of powers, none of which can have more than four levels."
 *
 * ⚠ A power's level lives in two places. A levelled power (`hasLevels`) keeps it in `system.level`. A fixed-level
 * power — Improved Reflexes Level 3, Combat Sense +2, Kinesics Level 3, Delay Damage 2, Flexibility 2 — is a
 * separate item with the level in the NAME and `level: 1`. The first cut of the cap read `system.level` only
 * when `hasLevels` was true, so a fixed-level item was never checked: Improved Reflexes Level 3 on a Magic 2
 * adept raised no warning (0.7.0 rules check). The same reading as `adeptPowerLevel` in config.js, with one
 * exclusion: "Imp. Sense: Vision Mag 3" ends in a MAGNIFICATION, not a level.
 */
export const AdeptLevels = {
  /** The level of one power item. Always at least 1. */
  levelOf(name, system = {}) {
    if (system?.hasLevels) return Math.max(1, Math.trunc(Number(system.level) || 1));
    const n = String(name ?? '');
    if (/\bMag\s*\d+\s*$/i.test(n)) return 1;
    const m = /(?:\s|\+)(\d+)\s*$/.exec(n);
    return m ? Math.max(1, Number(m[1])) : 1;
  },

  /** The powers whose level is above `magic`, as `{ name, level }` — warn only, never refuse. */
  overMagic(powers, magic) {
    const cap = Number(magic) || 0;
    const out = [];
    for (const p of powers ?? []) {
      const level = AdeptLevels.levelOf(p?.name, p?.system);
      if (level > cap) out.push({ name: p.name, level });
    }
    return out;
  },
};
