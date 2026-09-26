#!/usr/bin/env node
/**
 * Draw the item icons in `styles/icons/` — one SVG per gear category, ammunition kind and medical kind.
 *
 *   node tools/build-item-icons.mjs           write styles/icons/*.svg
 *   node tools/build-item-icons.mjs --check   exit 1 if a file would change — changes nothing
 *
 * Asked for 2026-09-26: get the compendium away from Foundry's white core icons (chest, item bag,
 * skull). The look is the battlemaps' "Shadowplan" style, which the maintainer picked: a charcoal plate
 * with a faint 1 m grid, flat dark-grey shapes with a lighter rim, and colour ONLY from glowing neon
 * lines — orange for ammunition and money, cyan for electronics, green for medical, purple for magic.
 * Every glyph is drawn here; nothing is copied from the reference product.
 *
 * ⚠ The SVGs are the build output — change a glyph here and re-run, never hand-edit a file.
 *   `tests/item-icons.test.mjs` fails when they drift or when `scripts/data/item-icons.mjs` names an
 *   icon this file does not draw.
 * ⚠ The neon filter is in user space: a filter sized to its element's box drops a straight line
 *   (a zero-height box). Filters and text only, no fonts or external references: Foundry shows these through `<img>`,
 *   which cannot load anything else.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { AMMO_TYPE_COLOR, BULLET_ICONS, ammoVariant } from '../scripts/data/item-icons.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const OUT = join(ROOT, 'styles', 'icons');

/* ── The style ─────────────────────────────────────────────────────────────────────────────── */

export const NEON = { ammo: '#ff962d', money: '#ff962d', tech: '#78f0ff', magic: '#c38bff', medical: '#5dffa0', boom: '#ff962d', armor: '#8fb4ff', melee: '#ff5d6c' };
export const BODY = '#35363b', RIM = '#64656a', HOLE = '#131416';
export const GRID = Array.from({ length: 7 }, (_, i) => 16 * (i + 1)).map(p => `M${p} 0V128M0 ${p}H128`).join('');

/** The two filters every icon uses: the `neon` glow and the drop `shadow` shapes cast. */
export const FILTERS = `<filter id="neon" filterUnits="userSpaceOnUse" x="-16" y="-16" width="160" height="160"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#000" flood-opacity="0.8"/></filter>`;

/** Glowing parts: `n` is the group's neon colour. */
export const lit  = n => `fill="${n}" stroke="none" filter="url(#neon)"`;
export const line = (n, w = 4) => `fill="none" stroke="${n}" stroke-width="${w}" stroke-linecap="round" filter="url(#neon)"`;
export const hole = `fill="${HOLE}" stroke="none"`;
/** A small lowercase caption, as the battlemaps label rooms. */
const caption = text => `<text x="64" y="118" text-anchor="middle" font-family="Bahnschrift, 'Segoe UI', Arial, sans-serif" font-size="12" fill="#9a9ba0" stroke="none" letter-spacing="0.5">${text}</text>`;

function svg(neon, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
<defs>
${FILTERS}
</defs>
<rect width="128" height="128" rx="6" fill="#1b1c1f"/>
<path d="${GRID}" stroke="#fff" stroke-opacity="0.045" stroke-width="1"/>
<rect x="3" y="3" width="122" height="122" rx="4" fill="none" stroke="#3a3b40" stroke-width="6" filter="url(#shadow)"/>
<rect x="3" y="3" width="122" height="122" rx="4" fill="none" stroke="#4a4b50" stroke-width="2"/>
<path d="M40 3H88" stroke="${neon}" stroke-width="3" filter="url(#neon)"/>
<g filter="url(#shadow)" fill="${BODY}" stroke="${RIM}" stroke-width="2" stroke-linejoin="round">
${body.trim()}
</g>
</svg>
`;
}

/* ── Ammunition pieces ─────────────────────────────────────────────────────────────────────── */

const A = NEON.ammo;
/** A straight-walled round (pistol, SMG): bullet `bh` tall on a case `ch` tall, bottom at `y`. */
const round = (x, y, w, ch, bh) =>
  `<rect x="${x}" y="${y - ch}" width="${w}" height="${ch}" ${lit(A)}/>
<path d="M${x} ${y - ch} V${y - ch - bh * 0.45} Q${x} ${y - ch - bh} ${x + w / 2} ${y - ch - bh} Q${x + w} ${y - ch - bh} ${x + w} ${y - ch - bh * 0.45} V${y - ch} Z"/>
<rect x="${x - 1}" y="${y - 4}" width="${w + 2}" height="4" ${hole}/>`;
/** A bottlenecked rifle round, bottom at `y`. */
const rifleRound = (x, y) =>
  `<path d="M${x} ${y} V${y - 42} L${x + 4} ${y - 50} V${y - 54} H${x + 12} V${y - 50} L${x + 16} ${y - 42} V${y} Z" ${lit(A)}/>
<path d="M${x + 4} ${y - 54} V${y - 62} Q${x + 8} ${y - 78} ${x + 12} ${y - 62} V${y - 54} Z"/>
<rect x="${x - 1}" y="${y - 4}" width="18" height="4" ${hole}/>`;
/** A shotgun shell: glowing hull, dark brass head, crimp lines. */
const shell = (x, y, w = 20) =>
  `<rect x="${x}" y="${y - 58}" width="${w}" height="46" rx="3" ${lit(A)}/>
<path d="M${x + 3} ${y - 52} H${x + w - 3}" stroke="${HOLE}" stroke-width="2" fill="none"/>
<rect x="${x - 1}" y="${y - 14}" width="${w + 2}" height="14" rx="1"/>`;
/** A box magazine at (x, y) w × h, tilted `tilt`°, with the top round showing. */
const mag = (x, y, w, h, tilt = 0, top = '') =>
  `<g transform="rotate(${tilt} ${x + w / 2} ${y + h / 2})">
<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3"/>
<rect x="${x - 3}" y="${y + h - 8}" width="${w + 6}" height="10" rx="2"/>
${[0.35, 0.55, 0.75].map(f => `<circle cx="${x + w / 2}" cy="${y + h * f}" r="2.5" ${hole}/>`).join('')}
${top || `<path d="M${x + 4} ${y} V${y - 6} Q${x + w / 2} ${y - 18} ${x + w - 4} ${y - 6} V${y} Z" ${lit(A)}/>`}
</g>`;

/* ── The icons ─────────────────────────────────────────────────────────────────────────────── */

export const ICONS = {
  /* Ammunition — loose rounds, by the class of gun they are stated for (SR3 p.279) */
  'ammo-rounds': [A, `
<rect x="22" y="62" width="84" height="38" rx="3"/>
<rect x="18" y="56" width="92" height="10" rx="2"/>
${[30, 48, 66, 84].map(x => `<path d="M${x} 56 V46 Q${x + 7} 30 ${x + 14} 46 V56 Z" ${lit(A)}/>`).join('')}
<rect x="40" y="74" width="48" height="14" rx="2" ${hole}/>
${caption('rounds')}`],
  'ammo-rounds-pistol': [A, `${[34, 57, 80].map(x => round(x, 96, 14, 24, 18)).join('')}${caption('pistol')}`],
  'ammo-rounds-smg':    [A, `${[34, 57, 80].map(x => round(x, 96, 13, 32, 16)).join('')}${caption('smg')}`],
  'ammo-rounds-rifle':  [A, `${[30, 56, 82].map(x => rifleRound(x, 100)).join('')}${caption('rifle')}`],
  'ammo-rounds-shotgun':[A, `${[28, 54, 80].map(x => shell(x, 100)).join('')}${caption('shotgun')}`],

  /* Ammunition — magazines (pre-filled reloads) */
  'ammo-mag':         [A, `${mag(50, 30, 28, 70)}${caption('magazine')}`],
  'ammo-mag-pistol':  [A, `${mag(52, 38, 24, 62, 10)}${caption('pistol')}`],
  'ammo-mag-smg':     [A, `${mag(54, 22, 20, 80)}${caption('smg')}`],
  'ammo-mag-rifle':   [A, `
<path d="M44 26 H70 Q74 66 94 94 L72 106 Q50 70 44 26 Z"/>
<path d="M68 104 L96 90 L100 98 L72 112 Z"/>
${[[56, 46], [62, 64], [71, 82]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.5" ${hole}/>`).join('')}
<path d="M48 26 V20 Q57 6 66 20 V26 Z" ${lit(A)}/>
${caption('rifle')}`],
  'ammo-mag-shotgun': [A, `${mag(44, 36, 40, 64, 0,
    `<rect x="46" y="24" width="36" height="12" rx="3" ${lit(A)}/><rect x="42" y="24" width="8" height="12" rx="1"/>`)}${caption('shotgun')}`],

  /* Ammunition — everything that is not a bullet */
  'ammo-belt': [A, `
<g transform="rotate(-30 64 64)">
${[22, 40, 58, 76, 94].map(x => `<rect x="${x}" y="40" width="12" height="34" ${lit(A)}/><path d="M${x} 40 V32 Q${x + 6} 18 ${x + 12} 32 V40 Z"/><rect x="${x - 3}" y="52" width="18" height="10" rx="2"/>`).join('')}
</g>${caption('belt')}`],
  'ammo-arrows': [A, `
${[0, 16, 32].map(d => `<g transform="translate(${d - 16} ${d - 16}) rotate(-45 64 64)">
<rect x="22" y="62" width="76" height="4"/>
<path d="M98 56 L114 64 L98 72 Z" ${lit(A)}/>
<path d="M22 64 L12 56 H28 L36 64 L28 72 H12 Z"/>
</g>`).join('')}`],
  'ammo-bolts': [A, `
${[-12, 12].map(d => `<g transform="translate(${d} ${-d}) rotate(-45 64 64)">
<rect x="30" y="60" width="58" height="8"/>
<path d="M88 55 L106 64 L88 73 Z" ${lit(A)}/>
<path d="M30 64 L22 54 H36 L40 64 L36 74 H22 Z"/>
</g>`).join('')}`],
  'ammo-minigrenade': [A, `
<rect x="40" y="62" width="48" height="40" rx="3"/>
<rect x="36" y="96" width="56" height="8" rx="2"/>
<path d="M42 62 V52 Q42 26 64 26 Q86 26 86 52 V62 Z" ${lit(A)}/>
<path d="M44 76 H84" stroke="${HOLE}" stroke-width="3"/>`],
  'ammo-dart': [A, `
<g transform="rotate(-45 64 64)">
<rect x="36" y="56" width="44" height="16" rx="3"/>
<rect x="42" y="60" width="26" height="8" rx="2" ${lit(A)}/>
<path d="M80 62 H112 V66 H80 Z"/>
<path d="M36 64 L18 50 V78 Z"/>
</g>`],
  'ammo-rocket': [A, `
<g transform="rotate(-45 64 64)">
<path d="M28 54 H88 Q108 56 114 64 Q108 72 88 74 H28 Z"/>
<path d="M28 54 L16 42 H30 L40 54 Z M28 74 L16 86 H30 L40 74 Z"/>
<path d="M28 58 L10 64 L28 70 Z" ${lit(A)}/>
<rect x="84" y="56" width="4" height="16" ${hole}/>
</g>`],
  'ammo-mortar': [A, `
<path d="M64 14 Q88 30 88 64 Q88 82 76 90 H52 Q40 82 40 64 Q40 30 64 14 Z"/>
<rect x="56" y="90" width="16" height="12"/>
<path d="M50 102 H78 L84 112 H44 Z"/>
<path d="M44 58 H84" ${line(A, 4)}/>`],
  'ammo-mine': [A, `
<ellipse cx="64" cy="80" rx="46" ry="18"/>
<rect x="18" y="62" width="92" height="18"/>
<ellipse cx="64" cy="62" rx="46" ry="18"/>
<ellipse cx="64" cy="60" rx="18" ry="7" ${lit(A)}/>`],

  /* Gear, by the generator's category */
  'gear-case': [NEON.tech, `
<rect x="18" y="42" width="92" height="62" rx="6"/>
<path d="M48 42 V32 H80 V42" fill="none" stroke="${RIM}" stroke-width="6"/>
<path d="M18 70 H110" stroke="${HOLE}" stroke-width="3"/>
<rect x="36" y="64" width="12" height="12" rx="2" ${lit(NEON.tech)}/>
<rect x="80" y="64" width="12" height="12" rx="2" ${lit(NEON.tech)}/>`],
  'gear-scope': [NEON.tech, `
<rect x="26" y="48" width="76" height="18" rx="4"/>
<rect x="14" y="42" width="22" height="30" rx="4"/>
<rect x="92" y="44" width="22" height="26" rx="4"/>
<rect x="56" y="36" width="14" height="12" rx="2"/>
<rect x="42" y="66" width="12" height="16"/><rect x="74" y="66" width="12" height="16"/>
<rect x="30" y="80" width="68" height="8" rx="2"/>
<rect x="110" y="46" width="5" height="22" rx="2" ${lit(NEON.tech)}/>`],
  'gear-camera': [NEON.tech, `
<rect x="26" y="40" width="64" height="30" rx="6" transform="rotate(12 58 55)"/>
<path d="M90 50 L112 42 V76 L88 70 Z" ${lit(NEON.tech)}/>
<rect x="44" y="72" width="8" height="24"/>
<rect x="28" y="94" width="40" height="8" rx="2"/>
<circle cx="42" cy="50" r="4" ${lit('#ee1c1c')}/>`],
  'gear-scanner': [NEON.tech, `
<rect x="36" y="30" width="56" height="84" rx="8"/>
<rect x="44" y="40" width="40" height="30" rx="3" ${lit(NEON.tech)}/>
<path d="M50 58 L58 50 L64 60 L72 46 L78 56" fill="none" stroke="${HOLE}" stroke-width="2.5"/>
${[48, 64, 80].map(x => `<circle cx="${x}" cy="86" r="5" ${hole}/><circle cx="${x}" cy="100" r="5" ${hole}/>`).join('')}
<rect x="74" y="14" width="6" height="16" rx="2"/>`],
  'gear-chip': [NEON.tech, `
<rect x="34" y="34" width="60" height="60" rx="6"/>
<rect x="46" y="46" width="36" height="36" rx="3" ${lit(NEON.tech)}/>
${[42, 54, 66, 78].map(p => `<rect x="${p}" y="22" width="6" height="12"/><rect x="${p}" y="94" width="6" height="12"/><rect x="22" y="${p}" width="12" height="6"/><rect x="94" y="${p}" width="12" height="6"/>`).join('')}`],
  'gear-credstick': [NEON.money, `
<g transform="rotate(-35 64 64)">
<rect x="18" y="52" width="80" height="24" rx="12"/>
<rect x="98" y="58" width="14" height="12" rx="2"/>
<rect x="30" y="60" width="44" height="8" rx="4" ${lit(NEON.money)}/>
</g>`],
  'gear-commlink': [NEON.tech, `
<rect x="38" y="18" width="52" height="92" rx="9"/>
<rect x="45" y="28" width="38" height="50" rx="3" ${lit(NEON.tech)}/>
<circle cx="64" cy="94" r="7" ${hole}/>
<path d="M96 30 q10 10 0 20 M104 24 q16 16 0 32" ${line(NEON.tech)}/>`],
  'gear-goggles': [NEON.tech, `
<path d="M14 58 Q14 42 30 42 H98 Q114 42 114 58 V70 Q114 86 98 86 H80 L70 72 H58 L48 86 H30 Q14 86 14 70 Z"/>
<ellipse cx="38" cy="64" rx="16" ry="13" ${lit(NEON.tech)}/>
<ellipse cx="90" cy="64" rx="16" ry="13" ${lit(NEON.tech)}/>`],
  'gear-cable': [NEON.tech, `
<path d="M30 96 Q14 80 30 64 Q46 48 30 32" fill="none" stroke="${RIM}" stroke-width="8" stroke-linecap="round"/>
<path d="M30 96 Q14 80 30 64 Q46 48 30 32" fill="none" stroke="${BODY}" stroke-width="4" stroke-linecap="round"/>
<path d="M30 96 H62" fill="none" stroke="${RIM}" stroke-width="8"/>
<rect x="60" y="84" width="30" height="24" rx="4"/>
<rect x="90" y="88" width="14" height="16" rx="2" ${lit(NEON.tech)}/>
<rect x="60" y="22" width="44" height="30" rx="4"/>
<rect x="68" y="30" width="28" height="14" rx="2" ${hole}/>
<rect x="72" y="34" width="20" height="6" ${lit(NEON.tech)}/>`],
  'gear-explosive': [NEON.boom, `
<rect x="20" y="52" width="64" height="44" rx="4"/>
<path d="M20 66 H84 M20 82 H84" stroke="${HOLE}" stroke-width="3"/>
<rect x="60" y="32" width="36" height="22" rx="3"/>
<rect x="66" y="38" width="24" height="10" rx="1" ${lit(NEON.boom)}/>
<path d="M96 42 Q112 40 110 60 Q108 80 88 76" ${line(NEON.boom)}/>`],
  'gear-focus': [NEON.magic, `
<circle cx="64" cy="64" r="40" fill="none" stroke="${RIM}" stroke-width="7"/>
<circle cx="64" cy="64" r="40" fill="none" stroke="${BODY}" stroke-width="3"/>
<path d="M64 26 L86 94 L28 52 H100 L42 94 Z" fill="none" stroke="${NEON.magic}" stroke-width="4" stroke-linejoin="round" filter="url(#neon)"/>`],
  'gear-ritual': [NEON.magic, `
<path d="M20 86 H108 Q104 110 64 110 Q24 110 20 86 Z"/>
${[38, 64, 90].map((x, i) => `<rect x="${x - 6}" y="${58 - (i % 2) * 12}" width="12" height="${28 + (i % 2) * 12}" rx="2"/>
<path d="M${x} ${50 - (i % 2) * 12} Q${x - 6} ${42 - (i % 2) * 12} ${x} ${30 - (i % 2) * 12} Q${x + 6} ${42 - (i % 2) * 12} ${x} ${50 - (i % 2) * 12} Z" ${lit(NEON.magic)}/>`).join('')}`],

  /* Armour — a garment per kind, steel-blue neon on the seams; accessories are cyan */
  'armor-jacket': [NEON.armor, `
<path d="M38 26 L54 21 Q64 31 74 21 L90 26 L114 62 L100 72 L90 60 V106 H38 V60 L28 72 L14 62 Z"/>
<path d="M64 30 V106" ${line(NEON.armor, 3)}/>
<rect x="44" y="76" width="14" height="10" rx="2" ${hole}/><rect x="70" y="76" width="14" height="10" rx="2" ${hole}/>
${caption('jacket')}`],
  'armor-coat': [NEON.armor, `
<path d="M46 14 L54 10 L64 18 L74 10 L82 14 L92 26 L100 94 L90 96 L88 56 L100 120 H28 L40 56 L38 96 L28 94 L36 26 Z"/>
<path d="M40 56 L36 28 M88 56 L92 28" stroke="${HOLE}" stroke-width="1.5" fill="none"/>
<path d="M64 22 V120" stroke="${HOLE}" stroke-width="3" fill="none"/>
<path d="M46 14 L54 5 L64 20 L60 34 Z M82 14 L74 5 L64 20 L68 34 Z" fill="${RIM}" stroke="${BODY}" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M64 24 V118" ${line(NEON.armor, 2.5)}/>
${[46, 62, 78].map(y => `<circle cx="58" cy="${y}" r="2.4" ${lit(NEON.armor)}/>`).join('')}
<path d="M29 88 H39 M89 88 H99" ${line(NEON.armor, 4)}/>
<path d="M42 118 L46 84 M86 118 L82 84" stroke="${HOLE}" stroke-width="1.5" fill="none"/>`],
  'armor-vest': [NEON.armor, `
<path d="M40 22 L54 20 Q64 36 74 20 L88 22 L92 44 V106 H36 V44 Z"/>
<rect x="46" y="54" width="36" height="30" rx="3" ${hole}/>
<path d="M40 48 H88 M40 92 H88" ${line(NEON.armor, 3)}/>
${caption('vest')}`],
  'armor-shirt': [NEON.armor, `
<path d="M40 24 L54 20 Q64 32 74 20 L88 24 L112 46 L100 60 L90 50 V102 H38 V50 L28 60 L16 46 Z"/>
<path d="M54 20 Q64 32 74 20" ${line(NEON.armor, 3)}/>
${caption('clothing')}`],
  'armor-pants': [NEON.armor, `
<path d="M38 20 H90 L96 108 H70 L64 54 L58 108 H32 Z"/>
<path d="M38 30 H90" ${line(NEON.armor, 3)}/>
<rect x="43" y="36" width="12" height="10" rx="2" ${hole}/><rect x="73" y="36" width="12" height="10" rx="2" ${hole}/>`],
  'armor-suit': [NEON.armor, `
<path d="M46 16 H82 L112 48 L100 60 L90 50 L94 112 H70 L64 74 L58 112 H34 L38 50 L28 60 L16 48 Z"/>
<path d="M64 20 V70" ${line(NEON.armor, 3)}/>
<path d="M40 52 H88" ${line(NEON.armor, 2)}`],
  'armor-plate': [NEON.armor, `
<path d="M34 34 Q64 14 94 34 L110 52 V68 H92 V108 H36 V68 H18 V52 Z"/>
<rect x="46" y="50" width="36" height="34" rx="4" ${lit(NEON.armor)}/>
<path d="M46 67 H82 M64 50 V84" stroke="${HOLE}" stroke-width="2" fill="none"/>
<path d="M22 56 H40 M88 56 H106" ${line(NEON.armor, 3)}`],
  'armor-dress': [NEON.armor, `
<path d="M50 20 H78 L76 46 L100 108 H28 L52 46 Z"/>
<path d="M52 46 H76" ${line(NEON.armor, 4)}/>
<path d="M64 46 L58 108 M64 46 L70 108" stroke="${RIM}" stroke-width="1.5" fill="none"/>`],
  'armor-helmet': [NEON.armor, `
<path d="M26 78 Q26 30 64 30 Q102 30 102 78 V88 H26 Z"/>
<rect x="34" y="58" width="60" height="16" rx="6" ${hole}/>
<path d="M36 66 H92" ${line(NEON.armor, 3)}/>
<rect x="22" y="84" width="84" height="8" rx="3"/>`],
  'armor-shield': [NEON.armor, `
<path d="M34 22 H94 V78 Q94 104 64 114 Q34 104 34 78 Z"/>
<rect x="46" y="34" width="36" height="16" rx="4" ${hole}/>
<path d="M42 28 H86" ${line(NEON.armor, 3)}/>
<path d="M40 60 V76 Q40 96 64 106" ${line(NEON.armor, 2)}`],
  'armor-gloves': [NEON.armor, `
<rect x="44" y="62" width="40" height="34" rx="6"/>
${[44, 55, 66, 77].map((x, i) => `<rect x="${x}" y="${34 + (i === 1 || i === 2 ? -6 : 0) + (i === 3 ? 6 : 0)}" width="9" height="34" rx="4.5"/>`).join('')}
<path d="M40 64 L28 52 L35 46 L46 58 Z"/>
<rect x="42" y="96" width="44" height="10" rx="2" ${lit(NEON.armor)}/>`],
  'armor-accessory': [NEON.tech, `
<rect x="26" y="34" width="76" height="60" rx="6"/>
<rect x="38" y="46" width="52" height="36" rx="3" ${hole}/>
<path d="M46 56 H82 M46 64 H70 M46 72 H78" ${line(NEON.tech, 3)}/>
${[38, 54, 70, 86].map(x => `<rect x="${x}" y="94" width="6" height="10"/>`).join('')}`],

  /* Medical */
  'medical-medkit': [NEON.medical, `
<rect x="18" y="40" width="92" height="64" rx="8"/>
<path d="M48 40 V30 H80 V40" fill="none" stroke="${RIM}" stroke-width="6"/>
<path d="M58 56 H70 V66 H80 V78 H70 V88 H58 V78 H48 V66 H58 Z" ${lit(NEON.medical)}/>`],
  'medical-patch': [NEON.medical, `
<rect x="28" y="28" width="72" height="72" rx="18" transform="rotate(15 64 64)"/>
<rect x="42" y="42" width="44" height="44" rx="10" transform="rotate(15 64 64)" ${hole}/>
<path d="M58 50 H70 V58 H78 V70 H70 V78 H58 V70 H50 V58 H58 Z" transform="rotate(15 64 64)" ${lit(NEON.medical)}/>`],
  'medical-clinic': [NEON.medical, `
<path d="M18 110 V54 L64 22 L110 54 V110 Z"/>
<rect x="52" y="84" width="24" height="26" ${hole}/>
<path d="M58 44 H70 V54 H80 V66 H70 V76 H58 V66 H48 V54 H58 Z" ${lit(NEON.medical)}/>
${[28, 90].map(x => `<rect x="${x}" y="80" width="10" height="12" ${lit(NEON.tech)}/>`).join('')}`],
};

/* ── Firearms — one silhouette per weapon class (TODO 181) ────────────────────────────────────
 * ORIGINAL drawings. The maintainer's licensed reference sheets were a guide to gun anatomy only —
 * never traced, never committed (Freepik's free licence forbids putting the image in an archive).
 * Every pistol-frame grip leans BACK: its bottom is behind its top (the maintainer's correction).
 * The sporting rifle is tilted, the way a hunting rifle is pictured; the sniper is a level
 * anti-materiel rifle. Keyed by weapon `category` in `scripts/data/item-icons.mjs`. */
const T = NEON.tech, B = NEON.boom;
const dot = (x, y, r = 2) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${HOLE}" stroke="none"/>`;
const rule = (d, w = 2) => `<path d="${d}" stroke="${HOLE}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
const glow = (d, c, w = 2.5) => `<path d="${d}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round" filter="url(#neon)"/>`;
const bare = d => `<path d="${d}" fill="none"/>`;   // a stroked outline only (trigger guards, wire stocks)

/** A semi-auto pistol facing right. The grip leans BACK: its bottom is behind its top. */
const pistol = (s, { len = 0, c = A } = {}) => `<g transform="translate(64 68) scale(${s}) translate(-64 -68)">
<path d="M16 38 H${100 + len} V56 H16 Q12 56 12 52 V42 Q12 38 16 38 Z"/>
<path d="M30 56 H${92 + len} V60 H68 H44 Z"/>
<path d="M44 58 H68 L62 96 Q61 101 55 101 H40 Q34 101 35 95 Z"/>
${bare('M68 58 V67 Q68 73 74 73 H82 V60')}
${rule('M20 44 V50 M25 44 V50 M30 44 V50')}
<rect x="${96 + len}" y="41" width="5" height="9" fill="${HOLE}" stroke="none"/>
<rect x="16" y="34" width="6" height="4"/><rect x="${88 + len}" y="34" width="6" height="4"/>
${glow(`M40 47 H${86 + len}`, c, 2)}
${rule('M37 92 H57', 2)}
</g>`;
const smg = `${bare('M22 46 H8 V60 H22')}
<path d="M20 40 H96 Q100 40 100 44 V56 H20 Z"/>
<rect x="98" y="44" width="20" height="7" rx="1"/>
<path d="M54 56 H76 L74 104 H56 Z"/>${bare('M50 56 V64 Q50 70 56 70')}
<rect x="30" y="35" width="26" height="5"/>
${rule('M60 66 V98 M66 66 V98', 1.5)}${glow('M28 48 H90', A, 2)}`;
const machinePistol = `${pistol(0.95, { len: 4 })}<path d="M70 62 H82 L82 90 H70 Z"/>`;
const assaultRifle = `<path d="M6 52 L34 48 V64 H10 Q6 64 6 60 Z"/>
<path d="M32 44 H86 Q90 44 90 48 V62 H32 Z"/>
<rect x="88" y="47" width="20" height="12" rx="2"/><rect x="106" y="50" width="12" height="6" rx="1"/>
<path d="M50 62 H66 Q68 84 82 98 L72 104 Q52 88 50 62 Z"/>
<path d="M38 62 H50 L45 88 H32 Z"/>${bare('M50 62 V70 Q50 74 44 74')}
<rect x="40" y="38" width="20" height="6"/><rect x="100" y="41" width="4" height="7"/>
${dot(113, 53, 1.8)}${glow('M40 51 H82', A, 2)}`;
/** Hunting-style rifles are drawn level, then tilted so the butt sits low and the muzzle high. */
const tilt = (deg, body) => `<g transform="rotate(${deg} 64 66)">${body}</g>`;
const sportRifle = tilt(-24, `<path d="M4 60 L36 53 Q43 51 50 55 V66 H44 Q40 74 30 76 L8 79 Q4 79 4 75 Z"/>
<path d="M48 60 H88 Q92 60 92 64 Q92 68 88 68 H48 Z"/>
<rect x="44" y="52" width="28" height="10" rx="2"/>
<rect x="88" y="56" width="32" height="5" rx="1"/><rect x="116" y="54" width="6" height="9" rx="1"/>
<path d="M68 57 L72 66" stroke="${RIM}" stroke-width="3" fill="none" stroke-linecap="round"/>${dot(72, 67, 2.2)}
<rect x="44" y="38" width="40" height="9" rx="4"/><path d="M80 35 H92 L96 38 V47 L92 50 H80 Z"/><rect x="40" y="39" width="8" height="7" rx="2"/>
<path d="M54 47 V52 M74 47 V52" stroke="${RIM}" stroke-width="3" fill="none"/>
${bare('M58 66 V72 Q58 76 64 76 H70 V68')}${glow('M94 42.5 v0', A, 5)}${glow('M46 43 H80', A, 1.5)}`);
/** An anti-materiel rifle: long, level, open stock, ventilated shroud, big scope and muzzle brake. */
const sniper = `<path d="M4 46 H12 L40 48 V62 H33 L26 67 Q14 67 10 62 H4 Z"/>${bare('M14 52 L32 54 L26 62 L16 60 Z')}
<rect x="38" y="44" width="44" height="19" rx="2"/>${rule('M44 50 H62', 2)}
<rect x="80" y="46" width="26" height="13" rx="1"/>${[86, 92, 98].map(x => dot(x, 52.5, 2)).join('')}
<rect x="104" y="50" width="12" height="4"/>
<path d="M114 46 H125 V58 H114 Z"/>${rule('M118 48 V56 M122 48 V56', 1.5)}
<rect x="46" y="40" width="42" height="4" rx="1"/>
<rect x="50" y="27" width="36" height="12" rx="5"/><path d="M84 24 H96 L99 27 V39 L96 42 H84 Z"/><rect x="42" y="28" width="10" height="10" rx="2"/>
<path d="M58 39 V44 M76 39 V44" stroke="${RIM}" stroke-width="3.5" fill="none"/>${dot(47, 33, 2.5)}
<path d="M46 63 H60 L54 84 H42 Z"/>${bare('M60 63 V70 Q60 74 54 74')}
<rect x="62" y="63" width="18" height="20" rx="2"/>${rule('M66 68 H76 M66 73 H76 M66 78 H76', 1.5)}
<path d="M92 59 L84 92 M100 59 L110 92" stroke="${RIM}" stroke-width="3" fill="none" stroke-linecap="round"/>
${glow('M96 33 v0', A, 5)}${glow('M44 55 H74', A, 1.8)}`;
const shotgun = `<path d="M4 54 L32 50 H46 V64 H30 L14 82 L4 74 Z"/>
<rect x="44" y="48" width="36" height="14" rx="2"/>
<rect x="78" y="48" width="40" height="7" rx="1"/><rect x="78" y="56" width="36" height="6" rx="1"/>
<rect x="68" y="62" width="30" height="10" rx="4"/>${rule('M74 65 V70 M80 65 V70 M86 65 V70 M92 65 V70', 1.5)}
<path d="M48 62 H58 L54 80 H44 Z"/>${bare('M58 62 V68 Q58 72 64 72')}
${dot(117, 51.5, 1.6)}${glow('M50 55 H74', A, 2)}`;
const lmg = `<path d="M4 50 L30 46 V60 H8 Q4 60 4 56 Z"/>
<rect x="28" y="42" width="54" height="20" rx="3"/>
<rect x="80" y="46" width="32" height="8" rx="1"/><rect x="110" y="44" width="8" height="12" rx="1"/><rect x="60" y="36" width="20" height="6"/>
<path d="M44 62 H56 L52 78 H40 Z"/><rect x="58" y="62" width="22" height="26" rx="3"/>${rule('M62 68 H76 M62 74 H76 M62 80 H76', 1.5)}
<path d="M92 54 L82 90 M98 54 L108 90" stroke="${RIM}" stroke-width="3" fill="none" stroke-linecap="round"/>${glow('M34 50 H74', A, 2)}`;
const heavyMG = `<rect x="12" y="44" width="22" height="10" rx="3"/>
<rect x="32" y="40" width="46" height="24" rx="3"/>
<rect x="76" y="46" width="42" height="8" rx="1"/><rect x="112" y="43" width="6" height="14" rx="1"/>
<rect x="44" y="34" width="20" height="6"/>
<path d="M52 64 L36 102 M60 64 V102 M70 64 L86 102" stroke="${RIM}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
<rect x="72" y="70" width="26" height="22" rx="3"/>${glow('M78 76 H92 M78 82 H92 M78 88 H92', A, 2)}
<path d="M78 64 Q84 68 84 72" stroke="${A}" stroke-width="3" fill="none" filter="url(#neon)"/>`;
const minigun = `<rect x="8" y="42" width="34" height="30" rx="6"/>
${[45, 55, 65].map(y => `<rect x="40" y="${y - 3.5}" width="76" height="7" rx="2.5"/>`).join('')}
<rect x="62" y="40" width="7" height="34"/><rect x="98" y="40" width="7" height="34"/>
<path d="M18 72 L14 96 H30 L34 72 Z"/>${bare('M20 42 V30 H44')}
${[45, 55, 65].map(y => dot(114, y, 2)).join('')}${glow('M72 50 H92', A, 2)}`;
const assaultCannon = `<path d="M4 50 L30 46 V66 H8 Q4 66 4 62 Z"/>
<rect x="28" y="42" width="30" height="28" rx="4"/>
<rect x="56" y="44" width="44" height="24" rx="3"/>
<rect x="98" y="49" width="20" height="14" rx="2"/><rect x="110" y="46" width="8" height="20" rx="1"/>
<circle cx="76" cy="56" r="12"/><circle cx="76" cy="56" r="6" fill="none" stroke="${A}" stroke-width="3" filter="url(#neon)"/>
<path d="M34 70 L28 96 H42 L46 70 Z"/>`;
const grenadeLauncher = `<path d="M4 58 L30 52 V68 H8 Q4 68 4 64 Z"/>
<rect x="28" y="48" width="30" height="20" rx="3"/>
<circle cx="70" cy="60" r="19"/><circle cx="70" cy="60" r="12" fill="none" stroke="${B}" stroke-width="3" filter="url(#neon)"/>${dot(70, 60, 5)}
<rect x="86" y="52" width="32" height="16" rx="3"/>${dot(116, 60, 4)}
<path d="M40 68 L34 92 H46 L50 68 Z"/>`;
const missile = `<rect x="14" y="40" width="80" height="24" rx="5"/>
<rect x="12" y="37" width="12" height="30" rx="3"/>
<path d="M92 42 H108 Q120 52 108 62 H92 Z"/>${glow('M96 52 H112', B, 3)}
<path d="M44 64 L38 90 H50 L56 64 Z"/><rect x="58" y="32" width="16" height="8" rx="2"/>
${glow('M10 48 L2 44 M10 56 L2 60', B, 3)}`;
const laser = `<path d="M6 56 L32 50 H48 V62 H34 L16 78 L6 70 Z"/>
<rect x="46" y="46" width="46" height="18" rx="3"/>
<rect x="90" y="51" width="18" height="8" rx="2"/><circle cx="110" cy="55" r="5"/>${glow('M112 55 H124', T, 3)}
<rect x="52" y="40" width="28" height="6"/>${glow('M54 55 H84', T, 2)}
<path d="M54 64 H64 L60 82 H52 Z"/>`;
const taser = `${pistol(0.88, { c: T })}${glow('M98 42 l14 -8 M98 54 l14 8 M98 48 h18', T, 2.5)}`;
const flamer = `<rect x="10" y="38" width="22" height="54" rx="10"/><rect x="36" y="38" width="22" height="54" rx="10"/>
<path d="M56 52 H72 V62 H56 Z"/><rect x="70" y="54" width="34" height="8" rx="2"/>
<path d="M102 58 Q112 40 124 58 Q112 76 102 58 Z" fill="${B}" stroke="none" filter="url(#neon)" opacity="0.9"/>
<path d="M28 92 L20 106 H34 L40 92 Z"/>`;
const dartGun = `<path d="M6 52 L18 44 V60 Z"/><rect x="18" y="48" width="70" height="8" rx="2"/><rect x="86" y="50" width="30" height="4"/>
<path d="M116 52 l8 -4 v8 z"/><path d="M40 56 H52 L48 80 H40 Z"/>${glow('M118 52 h6', A, 3)}`;

export const FIREARM_ICONS = {
  'firearm-pistol-holdout': [A, `${pistol(0.74)}${caption('hold-out pistol')}`],
  'firearm-pistol-light': [A, `${pistol(0.88)}${caption('light pistol')}`],
  'firearm-pistol-heavy': [A, `${pistol(1.0, { len: 8 })}${caption('heavy pistol')}`],
  'firearm-machine-pistol': [A, `${machinePistol}${caption('machine pistol')}`],
  'firearm-smg': [A, `${smg}${caption('smg')}`],
  'firearm-assault-rifle': [A, `${assaultRifle}${caption('assault rifle')}`],
  'firearm-sporting-rifle': [A, `${sportRifle}${caption('sporting rifle')}`],
  'firearm-sniper-rifle': [A, `${sniper}${caption('sniper rifle')}`],
  'firearm-shotgun': [A, `${shotgun}${caption('shotgun')}`],
  'firearm-lmg': [A, `${lmg}${caption('light mg')}`],
  'firearm-heavy-mg': [A, `${heavyMG}${caption('medium/heavy mg')}`],
  'firearm-minigun': [A, `${minigun}${caption('minigun')}`],
  'firearm-assault-cannon': [A, `${assaultCannon}${caption('assault cannon')}`],
  'firearm-grenade-launcher': [B, `${grenadeLauncher}${caption('grenade launcher')}`],
  'firearm-missile-launcher': [B, `${missile}${caption('missile launcher')}`],
  'firearm-laser-rifle': [T, `${laser}${caption('laser rifle')}`],
  'firearm-taser': [T, `${taser}${caption('taser')}`],
  'firearm-flamethrower': [B, `${flamer}${caption('flamethrower')}`],
  'firearm-dart-gun': [A, `${dartGun}${caption('blowgun / spear gun')}`],
};

/* ── Melee, projectile, thrown and vehicle weapons — one per kind (TODO 182) ────────────────────
 * ORIGINAL drawings, in the firearms' style. Melee glows red, projectile and thrown weapons orange,
 * vehicle weapons orange (cyan for a laser). Blades are drawn level and turned. Keyed by weapon
 * `category` (`weaponType` for vehicle weapons) in `scripts/data/item-icons.mjs`. */
const M = NEON.melee;
/** Shrink a drawing that would run into its caption. */
const fit = (k, body) => `<g transform="translate(64 60) scale(${k}) translate(-64 -60)">${body}</g>`;
const turn = (deg, body) => `<g transform="rotate(${deg} 64 64)">${body}</g>`;
/** A thick stroked limb: a rim under a body colour, as the cables are drawn. */
const limb = (d, w = 8) => `<path d="${d}" fill="none" stroke="${RIM}" stroke-width="${w + 4}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${BODY}" stroke-width="${w}" stroke-linecap="round"/>`;
const spikes = (cx, cy, r, n, len, c) => Array.from({ length: n }, (_, i) => {
  const a = (i / n) * 2 * Math.PI, u = [Math.cos(a), Math.sin(a)], v = [-u[1], u[0]], f = k => k.toFixed(1);
  const b = (m, k) => `${f(cx + u[0] * m + v[0] * k)} ${f(cy + u[1] * m + v[1] * k)}`;
  return `<path d="M${b(r - 2, -5)} L${b(r + len, 0)} L${b(r - 2, 5)} Z" ${lit(c)}/>`;
}).join('');

const dagger = turn(-45, `<path d="M44 57 H100 Q114 60 124 64 Q114 68 100 71 H44 Z"/>
<rect x="38" y="47" width="8" height="34" rx="2"/>
<rect x="12" y="58" width="26" height="12" rx="3"/>${rule('M18 59 V69 M24 59 V69 M30 59 V69', 1.5)}
<circle cx="9" cy="64" r="6"/>${glow('M50 64 H108', M, 2.5)}`);
const club = turn(-40, `<path d="M12 59 H58 L90 50 Q116 50 116 64 Q116 78 90 78 L58 69 H12 Q8 69 8 64 Q8 59 12 59 Z"/>
${rule('M20 60 V68 M28 60 V68 M36 60 V68 M44 60 V68', 1.5)}${glow('M98 52 V76', M, 3)}`);
const pole = turn(-45, `<rect x="4" y="60" width="92" height="8" rx="4"/>${rule('M14 61 V67 M20 61 V67 M26 61 V67', 1.5)}
<rect x="90" y="55" width="7" height="18" rx="2"/><path d="M96 52 L126 64 L96 76 Q102 64 96 52 Z" ${lit(M)}/>`);
const flail = turn(-35, `<rect x="4" y="59" width="36" height="10" rx="4"/>${rule('M12 60 V68 M18 60 V68 M24 60 V68', 1.5)}
${[50, 62, 74].map((x, i) => `<ellipse cx="${x}" cy="64" rx="7" ry="4.5" ${i % 2 ? `transform="rotate(90 ${x} 64)"` : ''}/>`).join('')}
${spikes(100, 64, 14, 8, 9, M)}<circle cx="100" cy="64" r="14"/><circle cx="100" cy="64" r="4" ${hole}/>`);
const fist = `<rect x="40" y="56" width="48" height="40" rx="8"/>
${[0, 1, 2, 3].map(i => `<rect x="${40 + i * 12}" y="${38 + (i === 1 || i === 2 ? -4 : 0)}" width="12" height="30" rx="6"/>`).join('')}
<path d="M42 78 L26 64 L34 56 L46 66 Z"/>
<rect x="40" y="94" width="48" height="12" rx="2"/>${[0, 1, 2, 3].map(i => `<circle cx="${46 + i * 12}" cy="${44 + (i === 1 || i === 2 ? -4 : 0)}" r="2.6" ${lit(M)}/>`).join('')}
${rule('M52 68 V82 M64 68 V82 M76 68 V82', 1.5)}`;
const claws = `<rect x="6" y="44" width="40" height="40" rx="7"/>${rule('M14 54 H38 M14 64 H38 M14 74 H38', 1.5)}
${[44, 64, 84].map(y => `<path d="M46 ${y - 5} Q88 ${y - 6} 122 ${y - 20} Q104 ${y - 2} 94 ${y + 5} H46 Z"/>${glow(`M52 ${y} Q88 ${y - 2} 114 ${y - 15}`, M, 2)}`).join('')}`;
const chainsaw = `<rect x="8" y="50" width="46" height="36" rx="7"/><path d="M8 56 H54" stroke="${HOLE}" stroke-width="2" fill="none"/>
${bare('M20 50 V36 Q20 30 26 30 H42 V50')}<circle cx="38" cy="72" r="6" ${hole}/>
<rect x="50" y="56" width="70" height="20" rx="10"/>
<path d="M58 57 H112 M58 75 H112" fill="none" stroke="${M}" stroke-width="3" stroke-dasharray="4 4" filter="url(#neon)"/>
<rect x="50" y="52" width="10" height="28" rx="2"/>`;

const bow = `${limb('M48 12 Q118 64 48 116', 8)}
<path d="M48 12 L48 116" ${line(A, 2)}/>
<rect x="14" y="62" width="88" height="4" rx="1"/><path d="M14 64 L4 56 H18 Z M14 64 L4 72 H18 Z"/>
<path d="M102 57 L120 64 L102 71 Z" ${lit(A)}/><rect x="42" y="58" width="12" height="12" rx="2"/>`;
const crossbow = `<path d="M18 60 L6 56 Q3 56 3 60 V78 Q3 82 7 80 L18 72 Z"/>
<rect x="14" y="62" width="92" height="12" rx="3"/><rect x="48" y="74" width="5" height="12" rx="2"/>
${limb('M84 22 Q108 64 84 106', 8)}<path d="M84 22 L56 64 L84 106" ${line(A, 2)}/>
<rect x="34" y="57" width="70" height="4" rx="1"/><path d="M104 53 L122 59 L104 65 Z" ${lit(A)}/>
${rule('M22 68 H80', 1.5)}`;
const sling = `${limb('M64 116 V76', 12)}${limb('M64 80 L34 30', 9)}${limb('M64 80 L94 30', 9)}
<path d="M34 30 L64 66 L94 30" ${line(A, 2.5)}/>
<ellipse cx="64" cy="68" rx="11" ry="8"/><circle cx="64" cy="68" r="5" ${lit(A)}/>`;

const knife = turn(-45, `<path d="M30 58 Q62 54 108 64 Q62 74 30 70 Z"/>
<rect x="8" y="60" width="24" height="8" rx="4"/>${rule('M14 61 V67 M20 61 V67 M26 61 V67', 1.5)}
${glow('M38 64 H98', B, 2.5)}`);
const shuriken = `<path d="M64 12 L75 53 L116 64 L75 75 L64 116 L53 75 L12 64 L53 53 Z"/>
<path d="M64 12 L75 53 L116 64 L75 75 L64 116 L53 75 L12 64 L53 53 Z" ${line(B, 2.5)}/>
<circle cx="64" cy="64" r="9" ${hole}/>`;
const grenade = `<ellipse cx="64" cy="76" rx="30" ry="34"/>
${rule('M36 70 H92 M38 86 H90 M64 44 V108 M50 46 V106 M78 46 V106', 1.5)}
<rect x="54" y="30" width="20" height="16" rx="2"/>
<path d="M76 34 H92 Q101 34 101 44 V84" fill="none" stroke="${RIM}" stroke-width="6" stroke-linecap="round"/>
<circle cx="46" cy="30" r="8" ${line(B, 3)}/>`;
const caltrops = `${['M64 70 L64 18', 'M64 70 L20 98', 'M64 70 L108 98', 'M64 70 L64 110'].map(d => limb(d, 8)).join('')}
${[[64, 18], [20, 98], [108, 98], [64, 110]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.5" ${lit(B)}/>`).join('')}
<circle cx="64" cy="70" r="7"/>`;
const net = `<rect x="18" y="24" width="92" height="82" rx="14"/>
${rule('M42 26 V104 M64 26 V104 M86 26 V104 M20 44 H108 M20 64 H108 M20 84 H108', 2.5)}
${[[24, 30], [104, 30], [24, 100], [104, 100]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" ${lit(A)}/>`).join('')}`;

const pedestal = `<path d="M38 112 L46 86 H82 L90 112 Z"/><ellipse cx="64" cy="86" rx="26" ry="6"/>`;
const mountedMg = `${pedestal}
<rect x="26" y="52" width="70" height="20" rx="3"/><rect x="94" y="57" width="30" height="9" rx="1"/><rect x="118" y="54" width="6" height="15" rx="1"/>
<rect x="34" y="72" width="26" height="18" rx="2"/><rect x="40" y="44" width="30" height="8" rx="2"/>
${[0, 1, 2, 3].map(i => `<circle cx="${102 + i * 4}" cy="61.5" r="1.4" ${hole}/>`).join('')}${glow('M32 62 H82', A, 2)}`;
const turretCannon = `<rect x="14" y="94" width="76" height="12" rx="3"/>
<path d="M22 94 L36 58 H78 L92 94 Z"/><rect x="88" y="66" width="30" height="12" rx="2"/><rect x="88" y="62" width="14" height="20" rx="3"/>
<rect x="116" y="63" width="8" height="18" rx="1"/><circle cx="52" cy="76" r="10"/><circle cx="52" cy="76" r="5" ${hole}/>
${glow('M108 63 V81', B, 3)}${glow('M32 66 H70', A, 2)}`;
const vMissile = turn(-30, `<path d="M10 56 H84 Q108 58 120 64 Q108 70 84 72 H10 Z"/>
<path d="M14 56 L4 42 H26 L34 56 Z M14 72 L4 86 H26 L34 72 Z"/>
<rect x="58" y="56" width="5" height="16" ${hole}/><path d="M82 58 Q106 60 116 64 Q106 68 82 70 Z" ${lit(B)}/>
<path d="M10 60 L-4 64 L10 68 Z" ${lit(B)}/>`);
const vLauncher = `<rect x="16" y="34" width="96" height="60" rx="8"/>
${[0, 1, 2].flatMap(c => [0, 1].map(r => `<circle cx="${40 + c * 24}" cy="${52 + r * 24}" r="9" ${hole}/><circle cx="${40 + c * 24}" cy="${52 + r * 24}" r="9" fill="none" stroke="${B}" stroke-width="2.5" filter="url(#neon)"/>`)).join('')}
<rect x="30" y="94" width="68" height="10" rx="2"/>`;
const vLaser = `<rect x="14" y="94" width="56" height="12" rx="3"/><path d="M24 94 L34 58 H70 L76 94 Z"/>
<rect x="68" y="58" width="34" height="26" rx="5"/><circle cx="104" cy="71" r="9" ${lit(T)}/>${glow('M112 71 H126', T, 3)}
${glow('M38 68 H62 M38 76 H62', T, 2)}`;
const vArm = `${limb('M18 106 L44 78 L72 70 L92 46', 10)}
${[[18, 106], [44, 78], [72, 70]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9"/><circle cx="${x}" cy="${y}" r="3" ${hole}/>`).join('')}
<path d="M88 50 L122 14 L114 54 Z" ${lit(M)}/><circle cx="92" cy="46" r="8"/>`;

export const WEAPON_ICONS = {
  'melee-edged': [M, `${dagger}${caption('edged')}`],
  'melee-club': [M, `${club}${caption('club')}`],
  'melee-pole': [M, `${pole}${caption('pole arm')}`],
  'melee-whip': [M, `${flail}${caption('whip / flail')}`],
  'melee-unarmed': [M, `${fist}${caption('unarmed')}`],
  'melee-cyber': [M, `${claws}${caption('cyber weapon')}`],
  'melee-chainsaw': [M, `${chainsaw}${caption('chainsaw')}`],
  'projectile-bow': [A, `${fit(.78, bow)}${caption('bow')}`],
  'projectile-crossbow': [A, `${fit(.86, crossbow)}${caption('crossbow')}`],
  'projectile-sling': [A, `${fit(.78, sling)}${caption('sling')}`],
  'thrown-knife': [B, `${knife}${caption('throwing knife')}`],
  'thrown-shuriken': [B, `${fit(.86, shuriken)}${caption('shuriken')}`],
  'thrown-grenade': [B, `${fit(.88, grenade)}${caption('grenade')}`],
  'thrown-caltrops': [B, `${fit(.86, caltrops)}${caption('caltrops')}`],
  'thrown-net': [A, `${fit(.9, net)}${caption('net')}`],
  'vehicle-weapon-gun': [A, `${fit(.86, mountedMg)}${caption('mounted gun')}`],
  'vehicle-weapon-cannon': [B, `${turretCannon}${caption('cannon')}`],
  'vehicle-weapon-missile': [B, `${fit(.86, vMissile)}${caption('missile')}`],
  'vehicle-weapon-launcher': [B, `${vLauncher}${caption('launcher')}`],
  'vehicle-weapon-laser': [T, `${vLaser}${caption('laser')}`],
  'vehicle-weapon-arm': [M, `${fit(.86, vArm)}${caption('mechanical arm')}`],
};

/** Every icon as `{ file, text }`. */
export function render() {
  const files = Object.entries({ ...ICONS, ...FIREARM_ICONS, ...WEAPON_ICONS }).map(([name, [neon, body]]) => ({ file: `${name}.svg`, text: svg(neon, body) }));
  // Bullets in a colour per ammunition type (TODO 178): the same drawing with its orange swapped.
  for (const base of BULLET_ICONS) {
    for (const [type, color] of Object.entries(AMMO_TYPE_COLOR)) {
      files.push({ file: `${ammoVariant(base, type)}.svg`, text: svg(...ICONS[base]).replaceAll(A, color) });
    }
  }
  return files;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const check = process.argv.includes('--check');
  if (!check) mkdirSync(OUT, { recursive: true });
  const icons = render();
  let changed = 0;
  for (const { file, text } of icons) {
    const path = join(OUT, file);
    if (existsSync(path) && readFileSync(path, 'utf8') === text) continue;
    changed++;
    console.log(`${check ? 'would write' : 'wrote'}  styles/icons/${file}`);
    if (!check) writeFileSync(path, text);
  }
  const stale = existsSync(OUT) ? readdirSync(OUT).filter(f => f.endsWith('.svg') && !icons.some(i => i.file === f)) : [];
  for (const f of stale) console.log(`not drawn here any more: styles/icons/${f}`);
  console.log(changed || stale.length ? `${changed} changed, ${stale.length} stale.` : 'Up to date.');
  process.exit(check && (changed || stale.length) ? 1 : 0);
}
