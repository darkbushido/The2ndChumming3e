/**
 * A firearm's built-in smartgun system and laser sight · TODO 18. Pure — no Foundry.
 *
 * `system.smartgun` / `system.laserSight` are nullable booleans: true/false is the answer (the shipped
 * packs store it — `tools/fill-weapon-accessories.mjs`), null means nobody recorded one, and the
 * free-text `accessories` is read instead, so a world item copied before the fields existed still works.
 *
 * ⚠ **The text is read per ITEM in the list, not as one string.** The old guess was `/laser/` over the
 * whole field, which ticked a laser sight for the Ballista's *Laser Designator* (a missile guide) and
 * the Ares Sonic Beam Rifle's *"use battery back from MP Laser III"*. A token counts as a laser sight
 * only when it IS one: "Laser Sight", "Laser sight", "High-power Laser Sight", "Dual Laser sight", or a
 * bare "Laser" (the Ruger Thunderbolt's entry).
 */
const LASER_SIGHT = /^(?:[\w-]+\s+)?laser(?:\s+sight)?$/i;
const SMARTGUN    = /\bsmart/i;

export const WeaponAccessories = {
  /** The accessories text as its separate items. */
  tokens(text) {
    return String(text ?? '').split(/[,;&]/).map(s => s.trim()).filter(Boolean);
  },

  /** What the free text says: `{ smartgun, laserSight }`. */
  fromText(text) {
    const t = WeaponAccessories.tokens(text);
    return { smartgun: t.some(s => SMARTGUN.test(s)), laserSight: t.some(s => LASER_SIGHT.test(s)) };
  },

  /** The weapon's answer for `field` ('smartgun' | 'laserSight') — the stored boolean wins, else the text. */
  flag(weapon, field) {
    const v = weapon?.system?.[field];
    if (v === true || v === false) return v;
    return !!WeaponAccessories.fromText(weapon?.system?.accessories)[field];
  },
};
