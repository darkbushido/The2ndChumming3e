/**
 * Which picture an item shows · asked for 2026-09-26: *"I just want to get away from the foundry extra
 * white icons."*
 *
 * - **Gear, ammunition and medical** get a drawn icon (`styles/icons/`, drawn by
 *   `tools/build-item-icons.mjs`) by category, and ammunition by what it is: loose rounds or a
 *   magazine, for the class of gun it is stated for (SR3 p.279).
 * - **Every other type** gets its painted texture (`TYPE_ART`) instead of a Foundry core icon.
 *
 * Used by `tools/apply-item-icons.mjs` (the packs), the pack generators, and `sr3e.js` (the type
 * defaults, and the ammunition icon following `gunClass` once a gun states it).
 *
 * ⚠ **Only a stock picture is ever replaced** (`isStockImage`): one a GM or player chose is theirs.
 */
import { AmmoStock } from './ammo-stock.mjs';

const SYS = 'systems/The2ndChumming3e/styles';
export const ICON_DIR = `${SYS}/icons`;
const tex = name => `${SYS}/textures/${name}.webp`;
const icon = name => `${ICON_DIR}/${name}.svg`;

/** The painted picture of each type that has one. Gear, ammunition and medical are drawn instead. */
export const TYPE_ART = {
  firearm: tex('firearmsdefault'), melee: tex('melee-default'), projectile: tex('projectile-weapons-default'),
  thrown: tex('thrown-weapons-default'), armor: tex('armour-default'), drug: tex('drugs-default'),
  skill: tex('skills-default'), spell: tex('spells-default'), cyberware: tex('cyberware-default'),
  bioware: tex('bioware-default'), adeptpower: tex('adept-default'), vehiclemod: tex('vehicles-default'),
  vehicleweapon: tex('vehicle-weapons-default'), program: tex('programs-default'), cyberdeck: tex('cyberdeck-default'),
};

/** The generator's gear categories (`tools/build-default-gear.mjs` CATEGORY_TYPE) → icon. */
export const GEAR_ICONS = {
  'Firearms Accessories': 'gear-scope',
  'Surveillance and Security': 'gear-camera',
  'Stuff With Ratings': 'gear-scanner',
  'SOTA Gear': 'gear-scanner',
  'Chips': 'gear-chip',
  'Credstick': 'gear-credstick',
  'Lifestyle Extras': 'gear-commlink',
  'Miscellaneous Components': 'gear-cable',
  'S+S Vision Enhancers': 'gear-goggles',
  'Explosives': 'gear-explosive',
  'Magical Equipment': 'gear-focus',
  'Ritual Sorcery Materials': 'gear-ritual',
  'Ammunition': 'ammo-mag',   // "Spare Clip" — an empty magazine, filed as gear
};

/** Gun class (`AmmoStock.GUN_CLASSES` keys) → the round it takes. Missing → the generic box or magazine. */
export const ROUND_OF_CLASS = {
  HOPist: 'pistol', LPist: 'pistol', HPist: 'pistol', SMG: 'smg', ShtG: 'shotgun',
  SptR: 'rifle', Snip: 'rifle', AsRf: 'rifle', LMG: 'rifle', MMG: 'rifle', HMG: 'rifle', MinG: 'rifle', ACan: 'rifle',
};

/** Ammunition that is not a bullet, by what it is. First match wins. */
function specialAmmo(name, sys, gunClass) {
  const mech = String(sys?.loadMechanism ?? '').toLowerCase();
  if (mech === 'arrow') return 'ammo-arrows';
  if (mech === 'bolt') return 'ammo-bolts';
  if (mech === 'm' || gunClass === 'GrLn') return 'ammo-minigrenade';
  if (mech === 'belt' || /\bbelt\b/i.test(name)) return 'ammo-belt';
  if (gunClass === 'Tasr' || /\bdarts?\b/i.test(name)) return 'ammo-dart';
  if (gunClass === 'MisLn' || /\b(rocket|missile)s?\b/i.test(name)) return 'ammo-rocket';
  if (/\bmortar\b/i.test(name)) return 'ammo-mortar';
  if (/\bmines?\b/i.test(name)) return 'ammo-mine';
  return null;
}

/**
 * The drawn icon for a gear, ammunition or medical item, else null (the type has none).
 * @param {{type: string, name?: string, system?: object}} item
 */
export function itemIcon(item) {
  const { type, name = '', system: sys = {} } = item ?? {};
  if (type === 'gear') return icon(GEAR_ICONS[sys.category] ?? 'gear-case');
  if (type === 'medical') {
    if (/\bpatch\b/i.test(name)) return icon('medical-patch');
    if (/\b(hospital|clinic|docwagon)\b/i.test(name)) return icon('medical-clinic');
    return icon('medical-medkit');
  }
  if (type === 'ammunition') {
    const gunClass = AmmoStock.gunClass(sys.gunClass);
    const special = specialAmmo(name, sys, gunClass);
    if (special) return icon(special);
    const form = AmmoStock.unit(sys) === 'reloads' ? 'mag' : 'rounds';
    const round = ROUND_OF_CLASS[gunClass];
    return icon(round ? `ammo-${form}-${round}` : `ammo-${form}`);
  }
  return null;
}

/** The picture an item of this type should show when it has no picture of its own. */
export const defaultImage = item => itemIcon(item) ?? TYPE_ART[item?.type] ?? null;

/**
 * Is this picture one the system put there — blank, a Foundry core icon, a type texture or one of
 * the drawn icons — and so free to replace? Anything else was chosen by someone.
 */
export function isStockImage(img) {
  const s = String(img ?? '').trim();
  if (!s) return true;
  if (s.startsWith('icons/svg/')) return true;
  if (s.startsWith(`${ICON_DIR}/`)) return true;
  return Object.values(TYPE_ART).includes(s) || s === tex('medical-default');
}

/**
 * The picture to switch this item to, or null to leave it: a stock picture that is not (or no longer)
 * the one its type, category and gun class call for. Ammunition that a gun states a class for
 * (`reload` stamps `gunClass`) moves from the generic box or magazine to that round's icon this way.
 */
export function restockImage(item) {
  if (!item?.type || !isStockImage(item.img)) return null;
  const want = defaultImage(item);
  return want && want !== item.img ? want : null;
}

/** Every icon file `itemIcon` can name, for the test that they are all drawn. */
export function allIconNames() {
  const names = new Set(['gear-case', 'medical-patch', 'medical-clinic', 'medical-medkit', 'ammo-arrows', 'ammo-bolts',
    'ammo-minigrenade', 'ammo-belt', 'ammo-dart', 'ammo-rocket', 'ammo-mortar', 'ammo-mine', 'ammo-mag', 'ammo-rounds',
    ...Object.values(GEAR_ICONS)]);
  for (const r of new Set(Object.values(ROUND_OF_CLASS))) { names.add(`ammo-mag-${r}`); names.add(`ammo-rounds-${r}`); }
  return [...names];
}
