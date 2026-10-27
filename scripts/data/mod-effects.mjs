/**
 * What the shipped mods change — `system.modifiers` (and `system.hardened`) filled from one table · TODO 276. Pure.
 *
 * Keyed `type|base name` (`ModRatings.baseName`: the "(Weapon)"/"(Armor)" tag and any level dropped). Read by
 * `tools/fill-mod-effects.mjs` (the packs) and the 0.9.0 migration (owned copies) — both FILL BLANKS: an item whose
 * `modifiers` already hold anything, or that is already hardened, is left alone, so a GM's edit survives.
 *
 * Values are book data. `perRating`: the value is per point of the item's rating, which for these RC accessories IS the
 * printed RC (Gas Vent II is rating 2, SR3 p.282) and for the armour modifications the points bought (CC p.52).
 * ⚠ Left out on purpose — not yet ruled, or not yet a target (TODO 276 open questions): Bipod / Tripod (deployed only —
 * the "deployed" toggle is not built), imaging scopes (magnification), smart goggles (a goggles-smartgun pair, −1, SR3
 * p.112), the Gyro Mount (its own rules, TODO 18).
 */
import { ModRatings } from './mod-ratings.mjs';

const per = (target, value = 1) => [{ target, value, perRating: true }];
const on  = target => [{ target, value: 1, perRating: false }];

export const MOD_EFFECTS = {
  // Recoil compensation — SR3 p.281-282, CC p.34. The rating is the RC.
  'gear|Gas Vent I':              per('rc'),
  'gear|Gas Vent II':             per('rc'),
  'gear|Gas Vent III':            per('rc'),
  'gear|Gas Vent IV':             per('rc'),
  'gear|Shock Pads (RC':          per('rc'),
  'gear|Fore Grip':               per('rc'),
  'gear|Hip Pad Bracing System':  per('rc'),
  'gear|Under Barrel Weight':     per('rc'),
  'gear|Stock (Rigid':            per('rc'),
  // Smartgun systems, external — SR3 p.281-282; the Smartlink-2 modification, M&M p.32.
  'gear|Smartlink level I':       on('smartgun'),
  'gear|Smartlink level II':      on('smartgun'),
  // Laser sights — SR3 p.281; extended range CC p.35; low-power CC p.82.
  'gear|Laser Sight':             on('laserSight'),
  'gear|Laser Sight (Extended)':  on('laserSight'),
  'gear|Laser Sight, Low-Power':  on('laserSight'),

  // Armour modifications — CC pp.52-53: rating points.
  'gear|Chemical Seal':           per('resistChemical'),
  'gear|Fire Resistance':         per('resistFire'),
  'gear|Insulation':              per('resistCold'),
  'gear|Nonconductive':           per('resistElectric'),
  'gear|Thermal Dampening':       per('thermalMasking'),
  'gear|Gel Packs (See Rules)':   on('gelPacks'),
  // Helmet vision options — SR3 p.284, CC p.51. Goggles / helmets count as cybernetic/electronic vision (the maintainer).
  'armor|Thermo Vision':          on('thermo'),
  'armor|Low-light Vision':       on('lowLight'),
};

/** Hardened armour — the Cannon Companion's military armour and helmet (CC p.51). */
export const HARDENED_ARMOR = ['Light Military Armor', 'Medium Military Armor', 'Heavy Military Armor', 'Military Helmet'];

export const ModEffects = {
  MOD_EFFECTS, HARDENED_ARMOR,

  key(item) {
    return `${item?.type}|${ModRatings.baseName(item?.name)}`;
  },

  /**
   * What to fill on this item: `{ 'system.modifiers': [...], 'system.hardened': true }`, or null when there is nothing —
   * not in the table, or already filled (any modifier present; already hardened). Never overwrites.
   */
  fillDelta(item) {
    const out = {};
    const effects = MOD_EFFECTS[ModEffects.key(item)];
    const mods = item?.system?.modifiers;
    if (effects && !(Array.isArray(mods) && mods.length)) out['system.modifiers'] = effects.map(m => ({ ...m }));
    if (item?.type === 'armor' && HARDENED_ARMOR.includes(ModRatings.baseName(item?.name)) && item?.system?.hardened !== true) {
      out['system.hardened'] = true;
    }
    return Object.keys(out).length ? out : null;
  },
};
