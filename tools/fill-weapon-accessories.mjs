/**
 * Store every shipped firearm's smartgun system and laser sight · TODO 18.
 *
 *   node tools/fill-weapon-accessories.mjs          # fill blanks in packs-src, rebuild the changed packs
 *   node tools/fill-weapon-accessories.mjs --check  # report only; exit 1 if anything would change
 *
 * Reads the free-text `accessories` with `WeaponAccessories.fromText` (scripts/data/weapon-accessories.mjs)
 * and writes `smartgun` / `laserSight` as true or false, so the GM window's gear guesses read a field
 * rather than a regex. Same shape as fill-weapon-hands.mjs.
 * ⚠ **Fills blanks only** — a stored true/false is never overwritten, so re-running is safe.
 * ⚠ **Item packs only.** Guns embedded in actor packs keep a blank field and read the same text.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSourceDir, writeSourceDir, rebuildPack } from './lib/pack-source.mjs';
import { WeaponAccessories } from '../scripts/data/weapon-accessories.mjs';

const REPO  = join(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const FIELDS = ['smartgun', 'laserSight'];
const manifest = JSON.parse(readFileSync(join(REPO, 'system.json'), 'utf8'));
const packs = manifest.packs.filter(p => p.type === 'Item'
  && (p.flags?.The2ndChumming3e?.itemTypes ?? []).includes('firearm')).map(p => p.name);

let filled = 0, changedPacks = 0;
const tally = { smartgun: 0, laserSight: 0 };
for (const pack of packs) {
  const dir = join(REPO, 'packs-src', pack);
  if (!existsSync(dir)) continue;
  const entries = readSourceDir(dir);
  let changed = 0;
  for (const [key, doc] of entries) {
    if (!key.startsWith('!items!') || doc?.type !== 'firearm') continue;
    const found = WeaponAccessories.fromText(doc.system?.accessories);
    let touched = false;
    for (const f of FIELDS) {
      const cur = doc.system?.[f];
      if (cur === true || cur === false) continue;
      doc.system = { ...doc.system, [f]: found[f] };
      if (found[f]) tally[f]++;
      touched = true;
    }
    if (touched) changed++;
  }
  if (!changed) continue;
  filled += changed; changedPacks++;
  console.log(`  ${pack}: ${changed}`);
  if (!check) { writeSourceDir(dir, entries); await rebuildPack(REPO, pack); }
}
console.log(`\n${filled} firearm(s) in ${changedPacks} pack(s) ${check ? 'would get' : 'got'} smartgun/laser values — `
  + `${tally.smartgun} smartgun, ${tally.laserSight} laser sight.`);
process.exit(check && filled ? 1 : 0);
