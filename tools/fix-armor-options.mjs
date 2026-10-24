#!/usr/bin/env node
/**
 * The SR3 armour options the maintainer settled against the books, 2026-10-24 · TODO 266. Idempotent.
 *
 *   node tools/fix-armor-options.mjs [--check] [--only transceiver|vision|magnification|thermographic]   then: node tools/build-mod-ratings.mjs && npm run packs:build
 *
 *   transceiver — ONE Helmet/Wrist Transceiver, the Cannon Companion's. SR3 p.284: "Communications: Helmet or Wrist
 *     Transceiver (2,500¥)"; Cannon Companion p.51: "Helmet or Wrist Transceiver (250¥ x Rating)". The sr3e-sr3-armor
 *     document goes, the sr3e-cc-armor one is renamed "Helmet/Wrist Transceiver (Armor)" (still levelled, 250¥ x Rating).
 *     The gear "Transceiver" / "Micro-Transceiver" (SR3 p.290) are different items and are not touched.
 *   vision — SR3 p.284 prints "Helmet Vision Enhancement: Electronic Magnification 3 (900¥), Optical Magnification 3
 *     (1,200¥), Thermographic (700¥), Ultrasound (1,000¥) and Smartgoggles (3,000¥)": no Low-Light (Cannon Companion
 *     p.51 only — the cc-armor copy stays) and the two "Mag 38" typo rows duplicate the two Magnification 3 documents.
 *   magnification — magnification is a RATING, not part of the name (the maintainer): "Electronic Magnification (Armor)" and
 *     "Optical Magnification (Armor)", `system.rating` 3, in both packs (SR3 p.284 and Cannon Companion p.51 print only
 *     "Electronic Magnification 3 (900¥)", "Optical Magnification 3 (1,200¥)"). The Cannon Companion pack's two duplicates
 *     ("Electric Vision Mag 3", "Optical Vision Mag 3") are removed.
 *   thermographic — ONE Thermographic helmet option (SR3 p.284 / Cannon Companion p.51: 700¥). The maintainer, 2026-10-24: "there
 *     can be only one and it will be Thermo Vision" — the generated "Therm Vision (Armor)" (ce8f1144b1d5cd50) goes, the
 *     hand-kept "Thermo Vision (Armor)" (sr3e-armor-0176) stays.
 *
 * Each removed document is recorded in `tools/data/collapsed-mods.json` with the document that replaces it
 * (`keep`, `keepPack`), so `COLLAPSED_SOURCES` repoints a copy linked to it (`ModRatings.repointSource`).
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readSourceDir, writeSourceDir } from './lib/pack-source.mjs';
import { readDoc, writeDoc } from './lib/collapsed-mods.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'packs-src');
const SR3 = 'sr3e-sr3-armor', CC = 'sr3e-cc-armor';
const BY = 'fix-armor-options';
const HELMET = 'Helmet/Wrist Transceiver (Armor)';

/** Documents removed, by step: `{ pack, id, name, key, keep, keepPack }`. */
export const REMOVALS = {
  magnification: [
    { pack: CC, id: 'c6012ca9ce44ab83', name: 'Electric Vision Mag 3 (Armor)', key: 'armor|Electric Vision Mag 3', keep: 'sr3e-armor-0172', keepPack: CC },
    { pack: CC, id: 'bed77e28caee56ae', name: 'Optical Vision Mag 3 (Armor)', key: 'armor|Optical Vision Mag 3', keep: 'sr3e-armor-0173', keepPack: CC },
  ],
  vision: [
    { pack: SR3, id: 'sr3e-armor-0245', name: 'Low-light Vision (Armor)', key: 'armor|Low-light Vision', keep: 'sr3e-armor-0175', keepPack: CC },
    { pack: SR3, id: 'f49a41875c21af8d', name: 'Elec. Vis. Mag 38 (Armor)', key: 'armor|Elec. Vis. Mag 38', keep: 'sr3e-armor-0242', keepPack: SR3 },
    { pack: SR3, id: '5f7e478c061e9a1c', name: 'Optical Vis. Mag 38 (Armor)', key: 'armor|Optical Vis. Mag 38', keep: 'sr3e-armor-0243', keepPack: SR3 },
  ],
  thermographic: [
    { pack: CC, id: 'ce8f1144b1d5cd50', name: 'Therm Vision (Armor)', key: 'armor|Therm Vision', keep: 'sr3e-armor-0176', keepPack: CC },
  ],
};

const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
const check = process.argv.includes('--check');
let changed = 0;
const say = s => { changed++; console.log(`${check ? 'would: ' : ''}${s}`); };
const doc = readDoc();

if (!only || only === 'transceiver') {
  // The cc document is renamed.
  const cc = readSourceDir(join(SRC, CC));
  const keep = cc.get('!items!sr3e-armor-0201');
  if (keep && keep.name !== HELMET) {
    say(`${CC}: rename "${keep.name}" → "${HELMET}"`);
    if (!check) { keep.name = HELMET; writeSourceDir(join(SRC, CC), cc); }
  }
  // The sr3 document goes (the plain gear "Transceiver" is type gear and not in this pack).
  const sr3 = readSourceDir(join(SRC, SR3));
  for (const [k, d] of [...sr3]) {
    if (k.startsWith('!items!') && d.type === 'armor' && /^Transceiver \(Armor\)$/.test(d.name)) {
      say(`${SR3}: delete ${d.name} (${d._id})`);
      if (!check) { sr3.delete(k); writeSourceDir(join(SRC, SR3), sr3); }
    }
  }
  // The records: the family keeps its table key under the new name; the sr3 one points into the cc pack.
  const NEW = 'armor|Helmet/Wrist Transceiver';
  const ccRec = doc.families['armor|Transceiver'];
  if (ccRec) { say(`record armor|Transceiver → ${NEW}`); doc.families[NEW] = ccRec; delete doc.families['armor|Transceiver']; }
  const srRec = doc.families['armor|Transceiver@sr3e-sr3-armor'];
  if (srRec) {
    say(`record armor|Transceiver@${SR3} → ${NEW}@${SR3} (removed, replaced by ${CC}/sr3e-armor-0201)`);
    const gone = srRec.keep;
    doc.families[`${NEW}@${SR3}`] = { pack: SR3, by: BY, keep: 'sr3e-armor-0201', levels: {}, deleted: [...new Set([...srRec.deleted, gone])].sort(), keepPack: CC, removed: true };
    delete doc.families['armor|Transceiver@sr3e-sr3-armor'];
  }
}

/** The kept documents, renamed for the item with the magnification as its rating. */
const MAGNIFICATION = [
  { pack: SR3, id: 'sr3e-armor-0242', name: 'Electronic Magnification (Armor)' },
  { pack: SR3, id: 'sr3e-armor-0243', name: 'Optical Magnification (Armor)' },
  { pack: CC, id: 'sr3e-armor-0172', name: 'Electronic Magnification (Armor)' },
  { pack: CC, id: 'sr3e-armor-0173', name: 'Optical Magnification (Armor)' },
];

for (const step of ['vision', 'magnification', 'thermographic']) {
  if (only && only !== step) continue;
  const packs = new Map();
  const entries = pack => packs.get(pack) ?? packs.set(pack, readSourceDir(join(SRC, pack))).get(pack);
  if (step === 'magnification') {
    for (const r of MAGNIFICATION) {
      const d = entries(r.pack).get(`!items!${r.id}`);
      if (d && (d.name !== r.name || d.system.rating !== 3)) {
        say(`${r.pack}: ${d.name} → ${r.name}, rating 3`);
        d.name = r.name; d.system.rating = 3;
      }
    }
  }
  for (const r of REMOVALS[step]) {
    if (entries(r.pack).has(`!items!${r.id}`)) {
      say(`${r.pack}: delete ${r.name} (${r.id})`);
      entries(r.pack).delete(`!items!${r.id}`);
    }
    const id = `${r.key}@${r.pack}`;
    if (!doc.families[id]) {
      say(`record ${id} → ${r.keepPack}/${r.keep}`);
      doc.families[id] = { pack: r.pack, by: BY, keep: r.keep, levels: {}, deleted: [r.id], keepPack: r.keepPack, removed: true };
    }
  }
  if (!check) for (const [pack, e] of packs) writeSourceDir(join(SRC, pack), e);
}

if (!check && changed) writeDoc(doc, join(ROOT, 'tools', 'data', 'collapsed-mods.json'));
console.log(changed ? `${changed} change(s) — now run: node tools/build-mod-ratings.mjs && npm run packs:build` : 'nothing to do');
process.exit(check && changed ? 1 : 0);
