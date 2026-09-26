#!/usr/bin/env node
/**
 * Draw the Matrix icons in `styles/icons/matrix/<scheme>/` — every icon twice, once per scheme, so a GM
 * can mark a system hostile or friendly by picking the file (asked for 2026-09-26).
 *
 *   node tools/build-matrix-icons.mjs           write styles/icons/matrix/**.svg
 *   node tools/build-matrix-icons.mjs --check   exit 1 if a file would change — changes nothing
 *
 * Same look as the gear icons (`tools/build-item-icons.mjs`, the battlemaps' Shadowplan style), with the
 * scheme carried by colour AND shape, so it reads for colour-blind players too:
 *   hostile  — red neon, a chamfered (octagonal) frame, like the maps' security overlay
 *   friendly — cyan neon, a rounded frame
 * The icon list follows Matrix Defragged v2: personas, hosts and their six node types, every IC, every
 * utility program (plus a generic `program`). Every glyph is drawn here.
 *
 * ⚠ The SVGs are build output — change a glyph here and re-run; `tests/item-icons.test.mjs` checks drift.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { FILTERS, GRID, BODY, RIM, HOLE, lit, line, hole } from './build-item-icons.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const OUT = join(ROOT, 'styles', 'icons', 'matrix');

export const SCHEMES = {
  hostile:  { neon: '#ff3030', frame: 'M26 4 H102 L124 26 V102 L102 124 H26 L4 102 V26 Z' },
  friendly: { neon: '#3ad6ff', frame: 'M16 4 H112 Q124 4 124 16 V112 Q124 124 112 124 H16 Q4 124 4 112 V16 Q4 4 16 4 Z' },
};

function svg({ neon, frame }, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
<defs>
${FILTERS}
<clipPath id="plate"><path d="${frame}"/></clipPath>
</defs>
<g clip-path="url(#plate)"><rect width="128" height="128" fill="#1b1c1f"/><path d="${GRID}" stroke="#fff" stroke-opacity="0.045" stroke-width="1"/></g>
<path d="${frame}" fill="none" stroke="#3a3b40" stroke-width="5" filter="url(#shadow)"/>
<path d="${frame}" fill="none" stroke="${neon}" stroke-width="2" filter="url(#neon)"/>
<g filter="url(#shadow)" fill="${BODY}" stroke="${RIM}" stroke-width="2" stroke-linejoin="round">
${body(neon).trim()}
</g>
</svg>
`;
}

/* ── The icons: name → (neon) => markup ─────────────────────────────────────────────────────── */

/** A glowing plus sign centred on (x, y), arm `a`. */
const plus = (n, x, y, a = 12, w = 8) => `<path d="M${x - w / 2} ${y - a} H${x + w / 2} V${y - w / 2} H${x + a} V${y + w / 2} H${x + w / 2} V${y + a} H${x - w / 2} V${y + w / 2} H${x - a} V${y - w / 2} H${x - w / 2} Z" ${lit(n)}/>`;
/** A padlock; `open` swings the shackle up and aside. */
const padlock = (n, open) => `
<path d="${open ? 'M44 58 V40 Q44 20 64 20 Q84 20 84 40 V44' : 'M44 58 V42 Q44 22 64 22 Q84 22 84 42 V58'}" fill="none" stroke="${RIM}" stroke-width="10"/>
<path d="${open ? 'M44 58 V40 Q44 20 64 20 Q84 20 84 40 V44' : 'M44 58 V42 Q44 22 64 22 Q84 22 84 42 V58'}" fill="none" stroke="${BODY}" stroke-width="5"/>
<rect x="30" y="56" width="68" height="52" rx="6"/>
<circle cx="64" cy="76" r="7" ${lit(n)}/><rect x="61" y="80" width="6" height="16" rx="2" ${lit(n)}/>`;
/** A shield outline. */
const SHIELD = 'M64 14 L104 28 V60 Q104 96 64 114 Q24 96 24 60 V28 Z';
/** A head-and-shoulders persona. */
const bust = `<path d="M24 112 Q24 78 64 76 Q104 78 104 112 Z"/><circle cx="64" cy="48" r="24"/>`;

export const ICONS = {
  /* Personas and what they carry */
  'persona-decker': n => `${bust}
<rect x="42" y="42" width="44" height="10" rx="4" ${lit(n)}/>
<path d="M86 56 Q108 64 104 88" ${line(n, 3)}/>`,
  'persona-security-decker': n => `
<path d="M64 8 V120 M8 64 H120 M24 24 L104 104 M104 24 L24 104" stroke="${RIM}" stroke-width="1.5" opacity="0.6"/>
<circle cx="64" cy="64" r="50" fill="none" stroke="${RIM}" stroke-width="1.5" opacity="0.6"/>
<circle cx="64" cy="64" r="32" fill="none" stroke="${RIM}" stroke-width="1.5" opacity="0.6"/>
<path d="M36 112 Q36 86 64 84 Q92 86 92 112 Z"/><circle cx="64" cy="60" r="18"/>
<rect x="48" y="55" width="12" height="8" rx="2" ${lit(n)}/><rect x="68" y="55" width="12" height="8" rx="2" ${lit(n)}/>`,
  'persona-agent': n => `
<rect x="30" y="34" width="68" height="60" rx="12"/>
<rect x="60" y="16" width="8" height="18"/><circle cx="64" cy="14" r="6" ${lit(n)}/>
<rect x="42" y="52" width="16" height="12" rx="3" ${lit(n)}/><rect x="70" y="52" width="16" height="12" rx="3" ${lit(n)}/>
<rect x="46" y="74" width="36" height="8" rx="2" ${hole}/>
<rect x="20" y="52" width="10" height="24" rx="3"/><rect x="98" y="52" width="10" height="24" rx="3"/>
<rect x="44" y="94" width="40" height="18" rx="3"/>`,
  'cyberdeck': n => `
<path d="M14 70 L28 44 H100 L114 70 Z"/>
<rect x="14" y="70" width="100" height="26" rx="4"/>
${[34, 50, 66, 82].map(x => `<rect x="${x}" y="52" width="12" height="6" rx="1" ${hole}/>`).join('')}
<rect x="30" y="78" width="44" height="8" rx="2" ${lit(n)}/>
<circle cx="94" cy="82" r="5" ${lit(n)}/>
<path d="M114 84 Q122 96 110 108" fill="none" stroke="${RIM}" stroke-width="4"/>`,
  'paydata': n => `
<path d="M32 16 H78 L100 38 V112 H32 Z"/>
<path d="M78 16 V38 H100" fill="none" stroke="${RIM}" stroke-width="2"/>
${[50, 62, 74, 86].map((y, i) => `<rect x="44" y="${y}" width="${[44, 36, 44, 28][i]}" height="5" rx="2" ${i === 1 ? lit(n) : hole}/>`).join('')}
<path d="M64 98 L72 106 L64 114 L56 106 Z" ${lit(n)}/>`,

  /* Hosts, the grid, and the six node types (MDF: SAN SPU DS SN CPU I/O) */
  'host': n => `
${[24, 54, 84].map(y => `<rect x="26" y="${y}" width="76" height="24" rx="3"/>
<rect x="34" y="${y + 9}" width="30" height="6" rx="2" ${hole}/>
<circle cx="84" cy="${y + 12}" r="4" ${lit(n)}/>`).join('')}`,
  'grid': n => `
<path d="M8 92 L36 50 H92 L120 92 Z"/>
<path d="M36 50 L8 92 M50 50 L38 92 M64 50 V92 M78 50 L90 92 M92 50 L120 92 M28 62 H100 M20 76 H108" ${line(n, 1.5)}/>
${[[40, 22], [64, 14], [88, 24]].map(([x, y]) => `<rect x="${x - 7}" y="${y}" width="14" height="${50 - y}" rx="2"/>`).join('')}`,
  'node-san': n => `
<path d="M24 112 V48 Q24 18 64 18 Q104 18 104 48 V112 H84 V52 Q84 38 64 38 Q44 38 44 52 V112 Z"/>
<path d="M50 112 V56 Q50 44 64 44 Q78 44 78 56 V112" ${line(n, 3)}/>
<rect x="56" y="70" width="16" height="8" rx="2" ${lit(n)}/>`,
  'node-spu': n => `
${[[64, 20], [104, 64], [64, 108], [24, 64]].map(([x, y]) => `<path d="M64 64 L${x} ${y}" stroke="${RIM}" stroke-width="5"/><circle cx="${x}" cy="${y}" r="9"/>`).join('')}
<path d="M64 38 L86 51 V77 L64 90 L42 77 V51 Z"/>
<path d="M64 50 L76 57 V71 L64 78 L52 71 V57 Z" ${lit(n)}/>`,
  'node-datastore': n => `
<path d="M28 34 V94 Q28 108 64 108 Q100 108 100 94 V34 Z"/>
<ellipse cx="64" cy="34" rx="36" ry="12"/>
<path d="M28 58 Q28 70 64 70 Q100 70 100 58 M28 80 Q28 92 64 92 Q100 92 100 80" ${line(n, 3)}/>`,
  'node-slave': n => `
<path d="${Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; const b = a + Math.PI / 8; return `${i ? 'L' : 'M'}${(64 + 44 * Math.cos(a)).toFixed(1)} ${(64 + 44 * Math.sin(a)).toFixed(1)} L${(64 + 34 * Math.cos(b)).toFixed(1)} ${(64 + 34 * Math.sin(b)).toFixed(1)}`; }).join(' ')} Z"/>
<circle cx="64" cy="64" r="18" ${hole}/>
<circle cx="64" cy="64" r="10" ${lit(n)}/>`,
  'node-cpu': n => `
<path d="M64 14 L106 38 V90 L64 114 L22 90 V38 Z"/>
<path d="M64 32 L90 47 V81 L64 96 L38 81 V47 Z" ${hole}/>
<path d="M64 44 L80 53 V75 L64 84 L48 75 V53 Z" ${lit(n)}/>`,
  'node-io': n => `
<path d="M64 16 L112 104 H16 Z"/>
<path d="M44 90 V60 M36 68 L44 58 L52 68 M84 60 V90 M76 82 L84 92 L92 82" ${line(n, 4)}/>`,

  /* IC — White */
  'ic-aris': n => `
<path d="M40 96 V60 Q40 34 64 34 Q88 34 88 60 V96 Z"/>
<rect x="30" y="96" width="68" height="14" rx="3"/>
<path d="M50 90 V62 Q50 46 64 46 Q78 46 78 62 V90 Z" ${lit(n)}/>
<path d="M28 34 L18 24 M100 34 L110 24 M64 22 V10" ${line(n, 4)}/>`,
  'ic-authenticator': n => `
<rect x="16" y="30" width="96" height="68" rx="8"/>
<circle cx="44" cy="58" r="12"/><path d="M26 88 Q28 72 44 72 Q60 72 62 88 Z"/>
<rect x="70" y="48" width="30" height="6" rx="2" ${lit(n)}/>
<rect x="70" y="62" width="24" height="5" rx="2" ${hole}/><rect x="70" y="74" width="28" height="5" rx="2" ${hole}/>`,
  'ic-looper': n => `
<path d="M64 64 C52 44 18 44 18 64 C18 84 52 84 64 64 C76 44 110 44 110 64 C110 84 76 84 64 64 Z" fill="none" stroke="${RIM}" stroke-width="16"/>
<path d="M64 64 C52 44 18 44 18 64 C18 84 52 84 64 64 C76 44 110 44 110 64 C110 84 76 84 64 64 Z" ${line(n, 5)}/>`,
  'ic-mr-medkit': n => `
<rect x="18" y="40" width="92" height="64" rx="8"/>
<path d="M48 40 V30 H80 V40" fill="none" stroke="${RIM}" stroke-width="6"/>
${plus(n, 64, 72, 16, 12)}
<rect x="24" y="48" width="10" height="6" rx="2" ${hole}/>`,
  'ic-scrambler': n => `
${[[22, 22, 0], [66, 22, 1], [22, 66, 1], [66, 66, 0]].map(([x, y, on]) => `<rect x="${x}" y="${y}" width="40" height="40" rx="4" transform="rotate(${on ? 8 : -6} ${x + 20} ${y + 20})"/>
${on ? `<path d="M${x + 10} ${y + 20} H${x + 30} M${x + 20} ${y + 10} V${y + 30}" ${line(n, 4)}/>` : `<rect x="${x + 12}" y="${y + 16}" width="16" height="8" rx="2" ${hole}/>`}`).join('')}`,

  /* IC — Gray */
  'ic-blaster': n => `
<path d="M64 10 L74 44 L108 30 L86 60 L118 76 L80 80 L88 116 L64 90 L40 116 L48 80 L10 76 L42 60 L20 30 L54 44 Z"/>
<circle cx="64" cy="66" r="16" ${lit(n)}/>`,
  'ic-crippler': n => `
<g transform="rotate(-35 64 64)">
<path d="M20 56 Q10 46 20 40 Q28 34 34 44 H58 L62 54 L56 60 L62 66 L58 74 H34 Q28 84 20 78 Q10 72 20 62 Z"/>
<path d="M108 56 Q118 46 108 40 Q100 34 94 44 H72 L66 52 L72 60 L66 68 L72 74 H94 Q100 84 108 78 Q118 72 108 62 Z"/>
</g>
<path d="M58 30 L66 50 L58 60 L68 78 L60 98" ${line(n, 4)}/>`,
  'ic-dataworm': n => `
${[[28, 84, 14], [44, 70, 15], [62, 62, 16], [80, 58, 16], [96, 48, 17]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}
<circle cx="100" cy="44" r="5" ${lit(n)}/>
<path d="M22 100 L14 110 M34 98 L30 112" stroke="${RIM}" stroke-width="3"/>
<path d="M36 84 Q62 58 96 48" ${line(n, 2)}/>`,
  'ic-gemini': n => `
<circle cx="44" cy="54" r="22"/><path d="M14 108 Q14 80 44 78 Q74 80 74 108 Z"/>
<circle cx="84" cy="54" r="22"/><path d="M54 108 Q54 80 84 78 Q114 80 114 108 Z"/>
<rect x="32" y="50" width="24" height="7" rx="3" ${lit(n)}/><rect x="72" y="50" width="24" height="7" rx="3" ${lit(n)}/>`,
  'ic-hydra': n => `
<path d="M40 112 Q34 76 22 56 M64 112 V40 M88 112 Q94 76 106 56" fill="none" stroke="${RIM}" stroke-width="14" stroke-linecap="round"/>
<path d="M40 112 Q34 76 22 56 M64 112 V40 M88 112 Q94 76 106 56" fill="none" stroke="${BODY}" stroke-width="10" stroke-linecap="round"/>
${[[22, 46], [64, 28], [106, 46]].map(([x, y]) => `<path d="M${x - 12} ${y + 6} Q${x - 12} ${y - 10} ${x} ${y - 10} Q${x + 14} ${y - 10} ${x + 16} ${y + 4} L${x + 4} ${y + 10} Z"/><circle cx="${x + 4}" cy="${y - 2}" r="3" ${lit(n)}/>`).join('')}`,
  'ic-sparky': n => `
<path d="M72 10 L30 70 H58 L48 118 L98 52 H68 Z"/>
<path d="M68 26 L42 64 H64 L58 94" ${line(n, 4)}/>`,
  'ic-tar-baby': n => `
<path d="M20 48 Q20 20 64 20 Q108 20 108 48 V70 Q108 78 102 78 Q98 100 92 78 Q86 96 80 78 Q74 112 66 78 Q60 90 54 78 Q46 104 40 78 Q34 88 28 78 Q20 78 20 70 Z"/>
<ellipse cx="50" cy="48" rx="7" ry="9" ${lit(n)}/><ellipse cx="78" cy="48" rx="7" ry="9" ${lit(n)}/>`,
  'ic-tracker': n => `
<circle cx="64" cy="64" r="40" fill="none" stroke="${RIM}" stroke-width="8"/>
<circle cx="64" cy="64" r="40" fill="none" stroke="${BODY}" stroke-width="4"/>
<path d="M64 14 V38 M64 90 V114 M14 64 H38 M90 64 H114" stroke="${RIM}" stroke-width="6"/>
<circle cx="64" cy="64" r="14" ${lit(n)}/>
<circle cx="64" cy="64" r="5" ${hole}/>`,

  /* IC — Black: physical damage */
  'ic-killer': n => `
<path d="M64 18 Q100 18 100 56 Q100 76 88 82 V100 H40 V82 Q28 76 28 56 Q28 18 64 18 Z"/>
<path d="M40 50 H58 L54 64 H42 Z M88 50 H70 L74 64 H86 Z" ${lit(n)}/>
<path d="M64 68 L58 80 H70 Z" ${hole}/>
${[48, 58, 70, 80].map(x => `<rect x="${x - 2}" y="92" width="4" height="10" ${hole}/>`).join('')}`,
  'ic-ripper': n => `
<path d="M22 108 Q30 60 54 20 Q44 64 42 108 Z M50 108 Q58 58 82 16 Q72 62 70 108 Z M78 108 Q86 64 108 28 Q98 68 98 108 Z"/>
<path d="M40 100 Q44 70 52 44 M68 100 Q72 66 80 38 M96 100 Q98 72 104 50" ${line(n, 3)}/>`,

  /* IC — passive (MDF's sheaf options) */
  'ic-alert': n => `
<path d="M34 88 V60 Q34 30 64 28 Q94 30 94 60 V88 L104 98 H24 Z"/>
<circle cx="64" cy="106" r="9" ${lit(n)}/>
<rect x="58" y="18" width="12" height="12" rx="3"/>
<path d="M20 44 Q14 58 20 72 M108 44 Q114 58 108 72" ${line(n, 4)}/>`,
  'ic-barrier': n => `
${[[16, 30, 46], [66, 30, 46], [16, 58, 22], [42, 58, 46], [92, 58, 22], [16, 86, 46], [66, 86, 46]].map(([x, y, w]) => `<rect x="${x}" y="${y}" width="${w}" height="24" rx="2"/>`).join('')}
<path d="M16 56 H112 M16 84 H112" ${line(n, 2)}/>`,
  'ic-databomb': n => `
<circle cx="58" cy="72" r="38"/>
<rect x="72" y="28" width="20" height="16" rx="3" transform="rotate(40 82 36)"/>
<path d="M90 28 Q100 14 112 20" fill="none" stroke="${RIM}" stroke-width="4"/>
<circle cx="112" cy="18" r="6" ${lit(n)}/>
<path d="M40 62 L48 70 L40 78 M56 80 H72" ${line(n, 4)}/>`,
  'ic-encryption': n => padlock(n, false),
  'ic-system-sweep': n => `
<circle cx="64" cy="64" r="48"/>
<circle cx="64" cy="64" r="32" fill="none" stroke="${HOLE}" stroke-width="2"/>
<circle cx="64" cy="64" r="16" fill="none" stroke="${HOLE}" stroke-width="2"/>
<path d="M64 64 L64 16 A48 48 0 0 1 106 40 Z" ${lit(n)} opacity="0.55"/>
<path d="M64 64 L106 40" ${line(n, 3)}/>
<circle cx="84" cy="80" r="4" ${lit(n)}/>`,

  /* Programs — the 30 MDF utilities */
  'program': n => `
<rect x="14" y="24" width="100" height="80" rx="6"/>
<rect x="14" y="24" width="100" height="14" rx="6"/>
${[24, 34, 44].map(x => `<circle cx="${x}" cy="31" r="3" ${hole}/>`).join('')}
<path d="M46 56 L32 70 L46 84 M82 56 L96 70 L82 84 M70 52 L58 88" ${line(n, 4)}/>`,
  'program-analyze': n => `
<circle cx="54" cy="54" r="30"/><circle cx="54" cy="54" r="20" ${hole}/>
<path d="M40 58 L48 50 L56 60 L66 44" ${line(n, 3)}/>
<path d="M76 76 L106 106" stroke="${RIM}" stroke-width="14" stroke-linecap="round"/>`,
  'program-armor': n => `
<path d="${SHIELD}"/>
<path d="M34 46 H94 M34 64 H94 M38 82 H90" ${line(n, 4)}/>`,
  'program-attack': n => `
<g transform="rotate(-45 64 64)">
<path d="M40 58 H100 L116 64 L100 70 H40 Z" ${lit(n)}/>
<rect x="32" y="48" width="8" height="32" rx="2"/>
<rect x="10" y="58" width="22" height="12" rx="4"/>
</g>`,
  'program-baby-monitor': n => `
<rect x="18" y="28" width="92" height="64" rx="8"/>
<rect x="28" y="38" width="72" height="44" rx="3" ${hole}/>
<path d="M32 62 H48 L54 48 L62 76 L70 56 L76 62 H96" ${line(n, 3)}/>
<rect x="48" y="92" width="32" height="8"/><rect x="36" y="100" width="56" height="8" rx="2"/>`,
  'program-biofeedback-filtering': n => `
<path d="M64 108 L22 64 Q10 50 18 36 Q30 18 50 26 Q58 30 64 40 Q70 30 78 26 Q98 18 110 36 Q118 50 106 64 Z"/>
<path d="M24 62 H46 L54 46 L64 78 L72 58 H104" ${line(n, 3)}/>`,
  'program-browse': n => `
<rect x="20" y="20" width="72" height="88" rx="6"/>
${[36, 52, 68].map(y => `<rect x="30" y="${y}" width="52" height="8" rx="2" ${hole}/>`).join('')}
<circle cx="84" cy="80" r="18" fill="${BODY}"/><circle cx="84" cy="80" r="10" ${lit(n)}/>
<path d="M97 93 L112 108" stroke="${RIM}" stroke-width="8" stroke-linecap="round"/>`,
  'program-decrypt': n => padlock(n, true),
  'program-encrypt': n => padlock(n, false),
  'program-evasion': n => `
<rect x="18" y="52" width="30" height="30" rx="6" opacity="0.5"/>
<rect x="44" y="40" width="30" height="30" rx="6" opacity="0.75"/>
<rect x="74" y="28" width="32" height="32" rx="6"/>
<path d="M20 106 L44 86 L60 98 L100 72" ${line(n, 4)}/>
<path d="M88 70 L102 70 L100 84" ${line(n, 4)}/>`,
  'program-exploit': n => `
<rect x="16" y="54" width="96" height="46" rx="4"/>
<path d="M60 54 L66 72 L58 84 L64 100" fill="none" stroke="${HOLE}" stroke-width="4"/>
<g transform="rotate(35 64 50)"><rect x="58" y="6" width="12" height="62" rx="3"/><path d="M58 68 H70 L64 84 Z" ${lit(n)}/></g>`,
  'program-jackpot': n => `
${[[26, 86], [48, 72], [70, 58]].map(([x, y]) => `<rect x="${x}" y="${y}" width="32" height="32" rx="6" transform="rotate(-10 ${x + 16} ${y + 16})"/>`).join('')}
<circle cx="80" cy="68" r="4" ${lit(n)}/><circle cx="92" cy="80" r="4" ${lit(n)}/><circle cx="56" cy="84" r="4" ${lit(n)}/>
<path d="M96 20 L100 32 L112 34 L102 42 L106 54 L96 46 L86 54 L90 42 L80 34 L92 32 Z" ${lit(n)}/>`,
  'program-jamboree': n => `
${[34, 64, 94].map(x => `<rect x="${x - 10}" y="72" width="20" height="36" rx="3"/>`).join('')}
<path d="M34 64 V20 M64 64 V20 M94 64 V20 M24 32 L34 20 L44 32 M54 32 L64 20 L74 32 M84 32 L94 20 L104 32" ${line(n, 4)}/>`,
  'program-kill-switch': n => `
<circle cx="64" cy="66" r="44"/>
<path d="M44 44 A30 30 0 1 0 84 44" ${line(n, 7)}/>
<path d="M64 26 V64" ${line(n, 7)}/>`,
  'program-lock-on': n => `
<path d="M20 44 V20 H44 M84 20 H108 V44 M108 84 V108 H84 M44 108 H20 V84" fill="none" stroke="${RIM}" stroke-width="8"/>
<path d="M64 38 L90 64 L64 90 L38 64 Z" ${lit(n)}/>
<circle cx="64" cy="64" r="6" ${hole}/>`,
  'program-medic': n => `
<circle cx="64" cy="64" r="46"/>
${plus(n, 64, 64, 26, 16)}`,
  'program-mirrors': n => `
<path d="M64 14 L100 64 L64 114 L28 64 Z" opacity="0.5" transform="translate(-22 0)"/>
<path d="M64 14 L100 64 L64 114 L28 64 Z" opacity="0.5" transform="translate(22 0)"/>
<path d="M64 14 L100 64 L64 114 L28 64 Z"/>
<path d="M64 30 L88 64 L64 98" ${line(n, 3)}/>`,
  'program-read-write': n => `
<path d="M24 16 H70 L90 36 V112 H24 Z"/>
${[44, 58, 72].map(y => `<rect x="34" y="${y}" width="40" height="6" rx="2" ${hole}/>`).join('')}
<g transform="rotate(40 94 70)"><rect x="86" y="36" width="16" height="64" rx="3"/><path d="M86 100 H102 L94 116 Z" ${lit(n)}/></g>`,
  'program-redirect': n => `
<rect x="14" y="54" width="36" height="20" rx="4"/>
<path d="M50 64 Q70 64 76 40 H98 M50 64 Q70 64 76 88 H98" ${line(n, 5)}/>
<path d="M92 30 L106 40 L92 50 M92 78 L106 88 L92 98" ${line(n, 5)}/>`,
  'program-saboteur': n => `
<path d="${Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; const b = a + Math.PI / 8; return `${i ? 'L' : 'M'}${(52 + 36 * Math.cos(a)).toFixed(1)} ${(64 + 36 * Math.sin(a)).toFixed(1)} L${(52 + 27 * Math.cos(b)).toFixed(1)} ${(64 + 27 * Math.sin(b)).toFixed(1)}`; }).join(' ')} Z"/>
<circle cx="52" cy="64" r="12" ${hole}/>
<g transform="rotate(-45 84 64)"><rect x="78" y="20" width="12" height="70" rx="3"/><path d="M72 20 Q72 8 84 8 Q96 8 96 20 L90 26 H78 Z"/></g>
<path d="M40 40 L64 88" ${line(n, 4)}/>`,
  'program-shield': n => `
<path d="${SHIELD}"/>
<path d="M64 30 L90 40 V62 Q90 88 64 100 Q38 88 38 62 V40 Z" ${lit(n)} opacity="0.85"/>`,
  'program-signal-booster': n => `
<path d="M64 52 L44 112 H56 L64 84 L72 112 H84 Z"/>
<circle cx="64" cy="46" r="9" ${lit(n)}/>
<path d="M44 26 Q30 46 44 66 M84 26 Q98 46 84 66 M30 14 Q8 46 30 78 M98 14 Q120 46 98 78" ${line(n, 4)}/>`,
  'program-sleaze': n => `
<path d="M16 50 Q16 34 34 34 H94 Q112 34 112 50 V58 Q112 80 88 80 Q72 80 64 64 Q56 80 40 80 Q16 80 16 58 Z"/>
<ellipse cx="40" cy="56" rx="12" ry="8" ${lit(n)}/>
<ellipse cx="88" cy="56" rx="12" ry="8" ${lit(n)}/>
<path d="M40 98 H88" ${line(n, 3)}/>`,
  'program-slow': n => `
<path d="M34 14 H94 V24 Q94 48 70 64 Q94 80 94 104 V114 H34 V104 Q34 80 58 64 Q34 48 34 24 V14 Z"/>
<path d="M46 30 H82 Q78 46 64 56 Q50 46 46 30 Z M50 104 Q54 86 64 80 Q74 86 78 104 Z" ${lit(n)}/>`,
  'program-smoke-screen': n => `
<path d="M20 92 Q8 92 10 78 Q12 64 28 66 Q26 44 48 44 Q60 26 80 36 Q100 34 102 54 Q120 56 118 74 Q118 92 100 92 Z"/>
<path d="M28 78 Q44 70 60 78 Q76 86 94 76 M40 60 Q54 54 70 60" ${line(n, 3)}/>`,
  'program-snoop': n => `
<path d="M46 106 Q30 106 34 88 Q38 72 40 60 Q36 22 70 20 Q100 20 100 50 Q100 70 84 78 Q76 84 76 94 Q74 110 58 108 Z"/>
<path d="M52 56 Q54 36 70 36 Q86 38 84 54 Q82 64 72 66" fill="none" stroke="${HOLE}" stroke-width="5"/>
<path d="M108 34 Q118 52 108 70 M18 40 Q10 56 18 72" ${line(n, 4)}/>`,
  'program-suppression': n => `
<path d="M20 50 H40 L66 26 V102 L40 78 H20 Z"/>
<path d="M82 46 L110 82 M110 46 L82 82" ${line(n, 6)}/>`,
  'program-passcode': n => `
<rect x="28" y="14" width="72" height="100" rx="8"/>
<rect x="38" y="24" width="52" height="16" rx="2" ${lit(n)}/>
${[0, 1, 2].flatMap(r => [0, 1, 2].map(c => `<rect x="${40 + c * 18}" y="${50 + r * 18}" width="12" height="12" rx="2" ${hole}/>`)).join('')}
<rect x="58" y="104" width="12" height="4" rx="1" ${hole}/>`,
  'program-dewormer': n => `
${[[30, 88, 12], [44, 76, 13], [60, 70, 14], [76, 66, 14], [92, 58, 15]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}
<path d="M24 24 L104 104 M104 24 L24 104" ${line(n, 7)}/>`,
  'program-nexus': n => `
${[[64, 24], [104, 50], [90, 100], [38, 100], [24, 50]].map(([x, y]) => `<path d="M64 64 L${x} ${y}" ${line(n, 3)}/>`).join('')}
${[[64, 24], [104, 50], [90, 100], [38, 100], [24, 50]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="11"/>`).join('')}
<circle cx="64" cy="64" r="16"/><circle cx="64" cy="64" r="7" ${lit(n)}/>`,
  'program-shadownet': n => `
<path d="M16 64 Q64 18 112 64 Q64 110 16 64 Z"/>
${[[40, 60], [64, 48], [88, 60], [64, 80]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" ${lit(n)}/>`).join('')}
<path d="M40 60 L64 48 L88 60 L64 80 Z M40 60 L88 60 M64 48 V80" ${line(n, 1.5)}/>`,
};

/** Every icon in every scheme as `{ file, text }`, `file` relative to OUT. */
export function render() {
  return Object.entries(SCHEMES).flatMap(([scheme, style]) =>
    Object.entries(ICONS).map(([name, body]) => ({ file: `${scheme}/${name}.svg`, text: svg(style, body) })));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const check = process.argv.includes('--check');
  const icons = render();
  let changed = 0;
  for (const { file, text } of icons) {
    const path = join(OUT, file);
    if (existsSync(path) && readFileSync(path, 'utf8') === text) continue;
    changed++;
    console.log(`${check ? 'would write' : 'wrote'}  styles/icons/matrix/${file}`);
    if (!check) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, text); }
  }
  const stale = Object.keys(SCHEMES).flatMap(s => (existsSync(join(OUT, s)) ? readdirSync(join(OUT, s)) : [])
    .filter(f => f.endsWith('.svg') && !icons.some(i => i.file === `${s}/${f}`)).map(f => `${s}/${f}`));
  for (const f of stale) console.log(`not drawn here any more: styles/icons/matrix/${f}`);
  console.log(changed || stale.length ? `${changed} changed, ${stale.length} stale.` : 'Up to date.');
  process.exit(check && (changed || stale.length) ? 1 : 0);
}
