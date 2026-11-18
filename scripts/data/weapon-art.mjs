/**
 * Art for the weapon designer's chips, cards and shelves · TODO 300. Pure strings; no Foundry.
 *
 * The maintainer, 2026-11-12 (grill): a picture PER MODEL, generated on the maintainer's ComfyUI in the vehicle pictures'
 * anime style, transparent background, no fringe (`tools/weapon-art-prompts.mjs` writes the batch, `tools/key-art.py` keys
 * it). Until a weapon has its picture — and for gear added later — its card shows its chip's drawn silhouette.
 * Accessory shelves get one drawn icon each (no per-accessory pictures).
 *
 * `PICTURES` lists the slugs with a file in `styles/weapons/`; `tests/weapon-designer-shop.test.mjs` keeps the two equal.
 */

const svg = (body, vb = '0 0 120 60') =>
  `<svg class="vd-art" viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

/** Weapon group (`WeaponCatalog.GROUPS`) → its silhouette (viewBox 120×60). Original line drawings. */
const GROUP = {
  pistol: '<path d="M30 22 L92 22 L92 30 L62 30 L56 50 L42 50 L46 30 L30 30 Z M58 30 Q60 38 54 38"/>',
  smg: '<path d="M16 22 L100 22 L100 30 L66 30 L62 52 L52 52 L54 30 L40 30 L36 40 L24 40 Z M72 30 L70 46 L78 46 L80 30"/>',
  rifle: '<path d="M4 26 L84 24 L116 24 L116 28 L84 30 L60 32 L54 44 L46 44 L48 32 L22 34 L6 40 Z M64 24 L66 18 L80 18 L82 24"/>',
  shotgun: '<path d="M4 28 L32 24 L114 24 L114 30 L60 30 L56 40 L48 40 L50 32 L30 32 L8 40 Z M66 30 L100 30 L100 34 L66 34 Z"/>',
  mg: '<path d="M6 26 L30 22 L112 22 L112 28 L64 28 L60 38 L50 38 L52 30 L30 30 L8 38 Z M80 28 L76 48 M80 28 L88 48 M56 22 L56 14 L70 14 L70 22"/><path d="M40 30 L40 44 L50 44" stroke-width="2"/>',
  launcher: '<path d="M10 20 L110 20 L110 34 L10 34 Z M50 34 L46 48 L56 48 L60 34 M70 20 L72 12 L84 12 L86 20 M110 22 L116 18 M110 32 L116 36"/>',
  melee: '<path d="M14 46 L24 36 M20 50 L10 40 M19 41 L100 10 L104 14 L24 45"/><path d="M28 40 L98 13" stroke-width="1.5"/>',
  other: '<path d="M26 22 L84 22 Q92 22 92 30 L62 30 L56 48 L44 48 L48 30 L26 30 Z"/><path d="M92 26 L100 20 M92 26 L102 26 M92 26 L100 32" stroke-width="2"/>',
};

/** Accessory shelf (a mount, '' for none) → its icon (viewBox 60×60). */
const SHELF = {
  Top: '<rect x="14" y="18" width="32" height="14" rx="4"/><circle cx="22" cy="25" r="4"/><path d="M8 44 L52 44 M24 32 L22 44 M36 32 L38 44"/>',
  Barrel: '<path d="M6 30 L30 30 M30 22 L54 22 L54 38 L30 38 Z"/><path d="M36 22 L36 38 M42 22 L42 38 M48 22 L48 38" stroke-width="1.5"/>',
  Under: '<path d="M8 18 L52 18 M24 18 L22 28 L38 28 L36 18 M30 28 L30 38 M18 46 L30 38 L42 46"/>',
  '': '<circle cx="30" cy="30" r="16"/><path d="M30 18 L30 42 M18 30 L42 30" stroke-width="2"/>',
};

/** File slug of a weapon's picture — its name, lower-case, dashes. */
export const slug = name => String(name ?? '').toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-');

/** Foundry's path to the pictures; the web page sets `WeaponArt.dir = 'weapons'`. */
export const PICTURE_DIR = 'systems/The2ndChumming3e/styles/weapons';
/** Slugs that have a picture in `styles/weapons/<slug>.webp`. Grows as the ComfyUI batch lands. */
export const PICTURES = new Set([
  'ak-47',
  'ares-crusader',
  'ares-hv-mp-lmg',
  'ares-hvar',
  'ares-light-fire-70',
  'ares-mp-laser-iii',
  'ares-redline',
  'ares-tommy-gun',
  'armtech-mgl-12',
  'armtech-mgl-6',
  'baretta-model-70',
  'beretta-model-200st',
  'browning-max-power',
  'browning-ultra-power',
  'cavalier-deputy',
  'cavalier-scout',
  'ceska-vz120',
  'colt-1911',
  'colt-american-l36',
  'colt-asp',
  'colt-cobra-tz-110',
  'colt-cobra-tz-115',
  'colt-cobra-tz-118',
  'colt-m-23',
  'colt-m22a2',
  'colt-m24a3-water-carbine',
  'colt-manhunter',
  'defiance-t-250',
  'eichiro-hatamoto-ii',
  'enfield-as7',
  'executive-action',
  'fa-sb5',
  'fichetti-security-500',
  'fichetti-security-500a',
  'fn-5-7-tss-version',
  'fn-5-7c',
  'fn-aal-gyrojet-pistol',
  'fn-mag-5-mmg',
  'franchi-spas-22',
  'great-dragon-atgm',
  'hammerli-model-610s',
  'heckler-koch-g12a3z',
  'heckler-koch-mp-5-tx',
  'hk-g38-assault',
  'ingram-smartgun-mod-20t',
  'lemat-revolver',
  'm-16a1',
  'morrissey-elite',
  'mossberg-cmdt',
  'neostead-home-defense',
  'nostal-ind-southerner',
  'nova-inf-telcom-taser',
  'savalette-guardian',
  'savalette-guardian-sl2',
  'sck-model-100',
  'semopal-vz88v',
  'shadow-arms-bullpup-ar',
  'steyr-aug-csl-assault',
  'steyr-aug-csl-smg',
  'steyr-tmp',
  'walther-ma-2100',
  'walther-pb-120',
  'yamaha-pulsar',
]);
export const GROUP_IDS = Object.keys(GROUP);
export const SHELF_IDS = Object.keys(SHELF);

export const WeaponArt = {
  dir: PICTURE_DIR,

  /** A group's silhouette (unknown → 'other'). */
  group(id) { return svg(GROUP[id] ?? GROUP.other); },

  /** A shelf's icon (unknown → the no-mount icon). */
  shelf(id) { return svg(SHELF[id] ?? SHELF[''], '0 0 60 60'); },

  /** Foundry path of a weapon's picture, or null when it has none yet. */
  pictureOf(name) { const s = slug(name); return PICTURES.has(s) ? `${PICTURE_DIR}/${s}.webp` : null; },

  /** Card art: the model's picture, else its group's silhouette. */
  picture(name, group) {
    const s = slug(name);
    if (!PICTURES.has(s)) return `<div class="vd-pic vd-pic-line">${this.group(group)}</div>`;
    return `<div class="vd-pic"><img src="${this.dir}/${s}.webp" alt="" loading="lazy" style="max-width:90%;max-height:90%"/></div>`;
  },
};
