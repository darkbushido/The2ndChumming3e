/**
 * Store how many hands every shipped weapon takes · TODO 49.
 *
 *   node tools/fill-weapon-hands.mjs          # fill blanks in packs-src, rebuild the changed packs
 *   node tools/fill-weapon-hands.mjs --check  # report only; exit 1 if anything would change
 *
 * The maintainer's decision (2026-09-15): weapons get a `hands` field filled from their category and
 * editable per weapon — SR3 has no table of which weapons are two-handed. The default is
 * `Hands.defaultHands` (scripts/data/hands.mjs); this writes it into every weapon item in the item
 * packs so the value is visible and editable on the item, not just implied.
 * ⚠ **Fills blanks only** — a value someone set (0, 1 or 2) is never overwritten, so re-running is safe.
 * ⚠ **Item packs only.** Weapons embedded in actor packs (contacts, examples) read the same default
 * when the field is blank, so they behave identically without touching those packs.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSourceDir, writeSourceDir, rebuildPack } from './lib/pack-source.mjs';
import { Hands } from '../scripts/data/hands.mjs';

const REPO  = join(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const TYPES = ['firearm', 'melee', 'projectile', 'thrown'];
const manifest = JSON.parse(readFileSync(join(REPO, 'system.json'), 'utf8'));
const packs = manifest.packs.filter(p => p.type === 'Item'
  && (p.flags?.The2ndChumming3e?.itemTypes ?? []).some(t => TYPES.includes(t))).map(p => p.name);

let filled = 0, changedPacks = 0;
const tally = { 0: 0, 1: 0, 2: 0 };
for (const pack of packs) {
  const dir = join(REPO, 'packs-src', pack);
  if (!existsSync(dir)) continue;
  const entries = readSourceDir(dir);
  let changed = 0;
  for (const [key, doc] of entries) {
    if (!key.startsWith('!items!') || !TYPES.includes(doc?.type)) continue;
    const cur = doc.system?.hands;
    if (cur !== null && cur !== undefined && cur !== '') continue;
    const h = Hands.defaultHands(doc.type, doc.system?.category);
    doc.system = { ...doc.system, hands: h };
    tally[h]++;
    changed++;
  }
  if (!changed) continue;
  filled += changed; changedPacks++;
  console.log(`  ${pack}: ${changed}`);
  if (!check) { writeSourceDir(dir, entries); await rebuildPack(REPO, pack); }
}
console.log(`\n${filled} weapon(s) in ${changedPacks} pack(s) ${check ? 'would get' : 'got'} a hands value — `
  + `${tally[1]} one-handed, ${tally[2]} two-handed, ${tally[0]} none (the body's own).`);
process.exit(check && filled ? 1 : 0);
