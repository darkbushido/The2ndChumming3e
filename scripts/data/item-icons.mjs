/**
 * Which picture an item shows · asked for 2026-09-26: *"I just want to get away from the foundry extra
 * white icons."*
 *
 * - **Firearms** get a silhouette per weapon class (`FIREARM_ICON_OF`, TODO 181); an unknown category keeps the
 *   painted firearms texture. **Ammunition bullets** are tinted by ammunition type (`AMMO_TYPE_COLOR`, TODO 178).
 * - **Armour** gets a garment by name (jacket, vest, coat, suit, helmet, shield … accessories a module).
 * - **Gear, ammunition and medical** get a drawn icon (`styles/icons/`, drawn by
 *   `tools/build-item-icons.mjs`) by category, and ammunition by what it is: loose rounds or a
 *   magazine, for the class of gun it is stated for (SR3 p.279).
 * - **Matrix** programs and cyberdecks, and IC, host and agent actors, get a Matrix icon
 *   (`styles/icons/matrix/<scheme>/`, `tools/build-matrix-icons.mjs`) by name or IC type. Each icon comes
 *   in two schemes, **hostile** (red, octagonal) and **friendly** (cyan, rounded), so a GM marks a
 *   system by picking the file. IC and hosts start hostile; programs, decks and agents friendly.
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
  vehicleweapon: tex('vehicle-weapons-default'),
};
/** Retired defaults: stock, so they may be replaced. */
const OLD_ART = ['medical-default', 'programs-default', 'cyberdeck-default', 'agent-default', 'data-host-default'].map(tex);

/* ── Matrix ─────────────────────────────────────────────────────────────────────────────────── */

export const MATRIX_DIR = `${ICON_DIR}/matrix`;
export const MATRIX_SCHEMES = ['hostile', 'friendly'];
/** Every Matrix icon `tools/build-matrix-icons.mjs` draws (the test holds the two lists together). */
export const MATRIX_ICONS = new Set([
  'persona-decker', 'persona-security-decker', 'persona-agent', 'cyberdeck', 'paydata',
  'host', 'grid', 'node-san', 'node-spu', 'node-datastore', 'node-slave', 'node-cpu', 'node-io',
  'ic-aris', 'ic-authenticator', 'ic-looper', 'ic-mr-medkit', 'ic-scrambler', 'ic-blaster', 'ic-crippler',
  'ic-dataworm', 'ic-gemini', 'ic-hydra', 'ic-sparky', 'ic-tar-baby', 'ic-tracker', 'ic-killer', 'ic-ripper',
  'ic-alert', 'ic-barrier', 'ic-databomb', 'ic-encryption', 'ic-system-sweep',
  'program', 'program-analyze', 'program-armor', 'program-attack', 'program-baby-monitor',
  'program-biofeedback-filtering', 'program-browse', 'program-decrypt', 'program-encrypt', 'program-evasion',
  'program-exploit', 'program-jackpot', 'program-jamboree', 'program-kill-switch', 'program-lock-on',
  'program-medic', 'program-mirrors', 'program-read-write', 'program-redirect', 'program-saboteur',
  'program-shield', 'program-signal-booster', 'program-sleaze', 'program-slow', 'program-smoke-screen',
  'program-snoop', 'program-suppression', 'program-passcode', 'program-dewormer', 'program-nexus', 'program-shadownet',
]);
/** Orthodox SR3 utilities (pp.220-222) with no icon of their own → the MDF utility that does the same job. */
const PROGRAM_ALIASES = {
  'black-hammer': 'attack', killjoy: 'attack', cloak: 'sleaze', deception: 'sleaze', spoof: 'sleaze',
  relocate: 'redirect', track: 'lock-on', scanner: 'analyze', commlink: 'signal-booster',
};
export const matrixIcon = (name, scheme) => `${MATRIX_DIR}/${scheme}/${name}.svg`;
/** "Alert (Passive)", "Attack (Deadly)" → "alert", "attack". */
const slug = s => String(s ?? '').replace(/\(.*?\)/g, '').toLowerCase().normalize('NFKD')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function programIcon(name) {
  const s = slug(name);
  const key = `program-${PROGRAM_ALIASES[s] ?? s}`;
  return MATRIX_ICONS.has(key) ? key : 'program';
}

/**
 * The Matrix icon for an IC, host or agent ACTOR, else null. IC by its name first (the passive IC
 * carry another type — "Alert (Passive)" is a Scrambler), then its `icType`.
 * @param {{type: string, name?: string, system?: object}} actor
 */
export function actorIcon(actor) {
  const { type, name = '', system: sys = {} } = actor ?? {};
  if (type === 'host') return matrixIcon('host', 'hostile');
  if (type === 'agent') return matrixIcon('persona-agent', 'friendly');
  if (type !== 'ic') return null;
  const key = [slug(name), slug(sys.icType)].map(s => `ic-${s}`).find(k => MATRIX_ICONS.has(k)) ?? 'ic-scrambler';
  return matrixIcon(key, 'hostile');
}

/** The Matrix icon to switch this actor to, or null to leave it (the actor twin of `restockImage`). */
export function restockActorImage(actor) {
  if (!isStockImage(actor?.img)) return null;
  const want = actorIcon(actor);
  return want && want !== actor.img ? want : null;
}

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

/**
 * A pre-filled clip is named by its size only ("15-Rnd Clip (Gel)") and no shipped one states a class, so
 * its art comes from the size — **only where every gun in the shipped firearm tables that takes that size is
 * one kind** (`tests/item-icons.test.mjs` re-derives this from `packs-src`). The rest stay generic until a
 * gun states its class on load; a guess would sometimes be wrong (a 16-round clip fits light AND heavy pistols).
 * ⚠ Display only. It is NOT `gunClass`, which is a rules field: ammunition with a class loads only into guns
 * of that class (SR3 p.279, TODO 173), and these kinds are far coarser than the classes.
 */
export const CLIP_ROUND_BY_SIZE = { 4: 'pistol', 11: 'pistol', 16: 'pistol', 18: 'pistol', 25: 'pistol', 14: 'rifle', 38: 'rifle', 42: 'rifle', 28: 'smg', 60: 'smg' };
const clipRound = name => CLIP_ROUND_BY_SIZE[/^(\d+)-Rnd Clip/i.exec(String(name ?? ''))?.[1]] ?? null;

/**
 * The colour of a bullet's glowing part by ammunition type (TODO 178) — regular stays the base orange.
 * Only bullets are tinted: an arrow, a mini-grenade or a mine is what it is, whatever its type.
 */
export const AMMO_TYPE_COLOR = {
  explosive: '#ff4d4d', exExplosive: '#ff4dd2', gel: '#6ec6ff', apds: '#f2f2f2',
  flechette: '#ffe14d', tracer: '#5dff7a', antiVehicle: '#b58bff', shot: '#b5793d',
};
/** The bullet icons that come in a colour per type. */
export const BULLET_ICONS = [
  'ammo-rounds', 'ammo-rounds-pistol', 'ammo-rounds-smg', 'ammo-rounds-rifle', 'ammo-rounds-shotgun',
  'ammo-mag', 'ammo-mag-pistol', 'ammo-mag-smg', 'ammo-mag-rifle', 'ammo-mag-shotgun',
];
/** The file name of `base` for this ammunition type: `ammo-mag-pistol` → `ammo-mag-pistol-gel`. */
export const ammoVariant = (base, type) => (AMMO_TYPE_COLOR[type] && BULLET_ICONS.includes(base) ? `${base}-${type}` : base);

/** Weapon `category` code (CLAUDE.md, *Weapon category codes*) → its silhouette, drawn in `tools/build-item-icons.mjs`. */
export const FIREARM_ICON_OF = {
  HOPist: 'firearm-pistol-holdout', LPist: 'firearm-pistol-light', MPist: 'firearm-pistol-light',
  HPist: 'firearm-pistol-heavy', VHP: 'firearm-pistol-heavy', GJPist: 'firearm-pistol-heavy',
  MaPist: 'firearm-machine-pistol', SMG: 'firearm-smg',
  AsRf: 'firearm-assault-rifle', Carb: 'firearm-assault-rifle', LCarb: 'firearm-assault-rifle',
  SptR: 'firearm-sporting-rifle', Snip: 'firearm-sniper-rifle', ShtG: 'firearm-shotgun',
  LMG: 'firearm-lmg', MMG: 'firearm-heavy-mg', HMG: 'firearm-heavy-mg', MinG: 'firearm-minigun', ACan: 'firearm-assault-cannon',
  GrLn: 'firearm-grenade-launcher',
  MisLn: 'firearm-missile-launcher', BlsTa: 'firearm-missile-launcher', GATGM: 'firearm-missile-launcher',
  VJMP: 'firearm-missile-launcher', MrTr: 'firearm-missile-launcher',
  Las: 'firearm-laser-rifle', Tasr: 'firearm-taser', Flthr: 'firearm-flamethrower', BG: 'firearm-dart-gun', SpGn: 'firearm-dart-gun',
};

/** Armour by what it is, from its name. First match wins; the "+" accessories are modules. */
const ARMOR_KINDS = [
  [/helmet|hardhat/i, 'armor-helmet'], [/shield/i, 'armor-shield'], [/glove|guards?\b/i, 'armor-gloves'],
  [/goggle|vision|vis\. mag|heads up/i, 'gear-goggles'], [/^\+|chain|melters|liners|olfactory/i, 'armor-accessory'],
  [/dress|gown|shawl|cultural/i, 'armor-dress'], [/slacks|pants/i, 'armor-pants'], [/coat\b/i, 'armor-coat'],
  [/vest/i, 'armor-vest'], [/tux/i, 'armor-jacket'],
  [/\bsuit\b|coverall|jumpsuit|bodysuit|fatigues/i, 'armor-suit'],
  [/shirt|sweater|clothing/i, 'armor-shirt'], [/jacket|\bjack\b|blazer|\bj\./i, 'armor-jacket'],
  [/armou?r|winter/i, 'armor-plate'],
];
const armorIcon = name => ARMOR_KINDS.find(([re]) => re.test(name))?.[1] ?? 'armor-jacket';

/** Melee `category` (CLAUDE.md, *Weapon category codes*) → its icon (TODO 182). */
export const MELEE_ICON_OF = {
  EDG: 'melee-edged', CLB: 'melee-club', POL: 'melee-pole', WHP: 'melee-whip', CYB: 'melee-cyber', UNA: 'melee-unarmed',
};
/** A melee weapon with no known category ("other") is read from its name; first match wins. */
const MELEE_BY_NAME = [
  [/chainsaw/i, 'melee-chainsaw'], [/razor|hand blade|spur|claw|fangs?|horn/i, 'melee-cyber'],
  [/staff|pole|spear|halberd|glaive|naginata/i, 'melee-pole'], [/pipe|bat\b|club|baton|mace|hammer|stick/i, 'melee-club'],
  [/whip|chain|flail|morning star/i, 'melee-whip'], [/glove|knuckle|fist/i, 'melee-unarmed'],
];
const meleeIcon = (name, category) => MELEE_ICON_OF[category] ?? MELEE_BY_NAME.find(([re]) => re.test(name))?.[1] ?? 'melee-edged';

/** Projectile `category` → its icon. Every crossbow is one icon; grenades and knives are thrown. */
export const PROJECTILE_ICON_OF = {
  Bow: 'projectile-bow', LCB: 'projectile-crossbow', MCB: 'projectile-crossbow', HCB: 'projectile-crossbow',
  SL: 'projectile-sling', TK: 'thrown-knife', GR: 'thrown-grenade', Ctrp: 'thrown-caltrops',
};
/** A projectile or thrown weapon the category does not settle (a shuriken is filed under "SH"), by name. */
const THROWN_BY_NAME = [
  [/shuriken/i, 'thrown-shuriken'], [/caltrop/i, 'thrown-caltrops'], [/\bnet\b/i, 'thrown-net'],
  [/grenade|flash-pak|smoke/i, 'thrown-grenade'], [/knife|knives|knifes|dagger/i, 'thrown-knife'],
  [/crossbow/i, 'projectile-crossbow'], [/sling/i, 'projectile-sling'], [/\bbow\b/i, 'projectile-bow'],
];
const thrownIcon = (name, category) => PROJECTILE_ICON_OF[category] ?? THROWN_BY_NAME.find(([re]) => re.test(name))?.[1] ?? null;

/** Vehicle weapon `weaponType` → its icon: a mounted gun, a cannon, a missile, a launcher, a laser or an arm. */
export const VEHICLE_WEAPON_ICON_OF = {
  LMG: 'vehicle-weapon-gun', MMG: 'vehicle-weapon-gun', HMG: 'vehicle-weapon-gun',
  Autocannon: 'vehicle-weapon-cannon', Railgun: 'vehicle-weapon-cannon', Shotgun: 'vehicle-weapon-cannon',
  'Light Naval Gun': 'vehicle-weapon-cannon', 'Medium Naval Gun': 'vehicle-weapon-cannon',
  Missile: 'vehicle-weapon-missile',
  'Lure Launcher': 'vehicle-weapon-launcher', 'Piranha Launcher': 'vehicle-weapon-launcher',
  'Hydrostatic Pulse Bafflers': 'vehicle-weapon-launcher', Ship: 'vehicle-weapon-launcher',
  LASER: 'vehicle-weapon-laser', 'Mechanical Tentacle': 'vehicle-weapon-arm',
};
const VEHICLE_WEAPON_BY_NAME = [
  [/laser/i, 'vehicle-weapon-laser'], [/missile|rocket|torpedo/i, 'vehicle-weapon-missile'], [/launcher|harpoon/i, 'vehicle-weapon-launcher'],
  [/cannon|railgun|naval|gun\b/i, 'vehicle-weapon-cannon'],
];
const vehicleWeaponIcon = (name, weaponType) => VEHICLE_WEAPON_ICON_OF[weaponType] ?? VEHICLE_WEAPON_BY_NAME.find(([re]) => re.test(name))?.[1] ?? null;

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
  if (type === 'armor') return icon(armorIcon(name));
  if (type === 'medical') {
    if (/\bpatch\b/i.test(name)) return icon('medical-patch');
    if (/\b(hospital|clinic|docwagon)\b/i.test(name)) return icon('medical-clinic');
    return icon('medical-medkit');
  }
  if (type === 'program') return matrixIcon(programIcon(name), 'friendly');
  if (type === 'cyberdeck') return matrixIcon('cyberdeck', 'friendly');
  if (type === 'ammunition') {
    const gunClass = AmmoStock.gunClass(sys.gunClass);
    const special = specialAmmo(name, sys, gunClass);
    if (special) return icon(special);
    const form = AmmoStock.unit(sys) === 'reloads' ? 'mag' : 'rounds';
    const round = ROUND_OF_CLASS[gunClass] ?? (form === 'mag' ? clipRound(name) : null);
    return icon(ammoVariant(round ? `ammo-${form}-${round}` : `ammo-${form}`, sys.ammoType));
  }
  if (type === 'firearm') return FIREARM_ICON_OF[sys.category] ? icon(FIREARM_ICON_OF[sys.category]) : null;
  if (type === 'melee') return icon(meleeIcon(name, sys.category));
  if (type === 'projectile' || type === 'thrown') { const kind = thrownIcon(name, sys.category); return kind ? icon(kind) : null; }
  if (type === 'vehicleweapon') { const kind = vehicleWeaponIcon(name, sys.weaponType); return kind ? icon(kind) : null; }
  return null;
}

/** The picture an item of this type should show when it has no picture of its own. */
export const defaultImage = item => itemIcon(item) ?? TYPE_ART[item?.type] ?? null;

/**
 * Is this picture one the system put there — blank, a Foundry core icon, a type texture or one of
 * the drawn gear icons — and so free to replace? Anything else was chosen by someone.
 */
export function isStockImage(img) {
  const s = String(img ?? '').trim();
  if (!s) return true;
  if (s.startsWith('icons/svg/')) return true;
  // ⚠ A Matrix icon is never stock: which glyph and which scheme (hostile / friendly) is the GM's call,
  // and a re-run of the pack tool must not flip a marked system back.
  if (s.startsWith(`${MATRIX_DIR}/`)) return false;
  if (s.startsWith(`${ICON_DIR}/`)) return true;
  return Object.values(TYPE_ART).includes(s) || OLD_ART.includes(s);
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
    'ammo-minigrenade', 'ammo-belt', 'ammo-dart', 'ammo-rocket', 'ammo-mortar', 'ammo-mine', 'ammo-mag', 'ammo-rounds', 'gear-goggles',
    ...ARMOR_KINDS.map(([, n]) => n), 'armor-jacket',
    ...Object.values(GEAR_ICONS)]);
  for (const r of new Set([...Object.values(ROUND_OF_CLASS), ...Object.values(CLIP_ROUND_BY_SIZE)])) { names.add(`ammo-mag-${r}`); names.add(`ammo-rounds-${r}`); }
  for (const n of Object.values(FIREARM_ICON_OF)) names.add(n);
  for (const n of [...Object.values(MELEE_ICON_OF), ...MELEE_BY_NAME.map(([, n]) => n), 'melee-edged',
    ...Object.values(PROJECTILE_ICON_OF), ...THROWN_BY_NAME.map(([, n]) => n),
    ...Object.values(VEHICLE_WEAPON_ICON_OF), ...VEHICLE_WEAPON_BY_NAME.map(([, n]) => n)]) names.add(n);
  for (const base of BULLET_ICONS) for (const type of Object.keys(AMMO_TYPE_COLOR)) names.add(ammoVariant(base, type));
  return [...names];
}
