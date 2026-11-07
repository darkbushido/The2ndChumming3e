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
 *
 * **An installed mod switches it on** (TODO 276): a Smartgun, external or a laser sight in `system.installed` whose
 * modifiers set `smartgun` / `laserSight`. A mod never switches a built-in one off.
 */
import { ItemMods } from './item-mods.mjs';

const LASER_SIGHT = /^(?:[\w-]+\s+)?laser(?:\s+sight)?$/i;
/**
 * Stock guns the core book prints without an underbarrel mount — SR3 p.278, the Remington 750 and 950: "Neither weapon can take
 * underbarrel-mounted accessories"; p.279, the Defiance T-250: "It has no underbarrel mount." The maintainer, 2026-11-07: "SR3 is
 * right … so warn" (over CC p.75's frames). Read from the name, so owned and renamed copies ("Remington 950 (Weapon)") match.
 */
const NO_UNDERBARREL = /\b(?:remington\s+[79]50|defiance\s+t-?250)\b/i;
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

  /** The weapon's answer for `field` ('smartgun' | 'laserSight') — an installed mod, else the stored boolean, else the text. */
  flag(weapon, field) {
    if (ItemMods.value(weapon, field) > 0) return true;
    const v = weapon?.system?.[field];
    if (v === true || v === false) return v;
    return !!WeaponAccessories.fromText(weapon?.system?.accessories)[field];
  },

  /**
   * Installing `mod` into `weapon`: an underbarrel mod on a gun printed without the mount (`noUnderbarrel`); a laser sight with a smartgun system, either way round — SR3 p.281, "Laser sights may not
   * be used with a smartlink system". The maintainer, 2026-11-07: warn, and only the better counts (the GM's TN window never
   * applies both, `SR3ECombatModifiers.exclusiveGear`). Strings; empty when there is nothing to say. Never a refusal.
   */
  installWarnings(weapon, mod) {
    const sets = t => (mod?.system?.modifiers ?? []).some(m => m?.target === t && Number(m?.value ?? 1) !== 0);
    const clash = (sets('laserSight') && WeaponAccessories.flag(weapon, 'smartgun'))
      || (sets('smartgun') && WeaponAccessories.flag(weapon, 'laserSight'));
    const out = clash ? [`${weapon?.name ?? 'This gun'} would have a laser sight and a smartgun system: they can't be used together (SR3 p.281) — only the smartlink's −2 counts.`] : [];
    if (WeaponAccessories.noUnderbarrel(weapon)) {
      const placed = ItemMods.assignMounts([...ItemMods.installed(weapon), mod]).at(-1);
      if (placed?.mount === 'Under' || placed?.wants === 'Under') out.push(`${weapon.name} has no underbarrel mount (SR3 pp.278-279) — ${mod?.name ?? 'this mod'} would go underbarrel.`);
    }
    return out;
  },

  /** A stock gun the core book prints with no underbarrel mount (`NO_UNDERBARREL`) — warned, never refused. */
  noUnderbarrel(weapon) {
    return NO_UNDERBARREL.test(String(weapon?.name ?? ''));
  },
};
