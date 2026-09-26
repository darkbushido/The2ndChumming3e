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

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const OUT = join(ROOT, 'styles', 'icons');

/* ── The style ─────────────────────────────────────────────────────────────────────────────── */

const NEON = { ammo: '#ff962d', money: '#ff962d', tech: '#78f0ff', magic: '#c38bff', medical: '#5dffa0', boom: '#ff962d' };
const BODY = '#35363b', RIM = '#64656a', HOLE = '#131416';
const GRID = Array.from({ length: 7 }, (_, i) => 16 * (i + 1)).map(p => `M${p} 0V128M0 ${p}H128`).join('');

/** Glowing parts: `n` is the group's neon colour. */
const lit  = n => `fill="${n}" stroke="none" filter="url(#neon)"`;
const line = (n, w = 4) => `fill="none" stroke="${n}" stroke-width="${w}" stroke-linecap="round" filter="url(#neon)"`;
const hole = `fill="${HOLE}" stroke="none"`;
/** A small lowercase caption, as the battlemaps label rooms. */
const caption = text => `<text x="64" y="118" text-anchor="middle" font-family="Bahnschrift, 'Segoe UI', Arial, sans-serif" font-size="12" fill="#9a9ba0" stroke="none" letter-spacing="0.5">${text}</text>`;

function svg(neon, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
<defs>
<filter id="neon" filterUnits="userSpaceOnUse" x="-16" y="-16" width="160" height="160"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#000" flood-opacity="0.8"/></filter>
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

/** Every icon as `{ file, text }`. */
export function render() {
  return Object.entries(ICONS).map(([name, [neon, body]]) => ({ file: `${name}.svg`, text: svg(neon, body) }));
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
