/**
 * Expand abbreviated cyberware/bioware names in the shipped packs · TODO 87
 *
 * `Muscle Replac. [1]` → `Muscle Replacement [1]`, and so on for 107 stems covering 221 items.
 * The upstream name is preserved in `system.srcgName`; see `scripts/data/cyberware-names.js`
 * for why that field exists and why a bare rename would break bonuses.
 *
 *   node tools/rename-cyberware.mjs --check     # report, write nothing
 *   node tools/rename-cyberware.mjs             # the repo packs (what ships)
 *   node tools/rename-cyberware.mjs --install   # the packs Foundry reads
 *
 * ⚠ **Foundry must be CLOSED.** ⚠ **Run it twice** — `sync:install` never copies packs.
 * ⚠ **Idempotent**: `srcgName` is written once and an item that already has one is skipped,
 *   so a second run reports 0 even though the expanded name no longer matches any key.
 */
import { ClassicLevel } from 'classic-level';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readdirSync } from 'node:fs';
import { expandCyberwareName } from '../scripts/data/cyberware-names.js';

const HERE    = dirname(fileURLToPath(import.meta.url));
const REPO    = join(HERE, '..');
const INSTALL = process.env.SR3E_INSTALL
  ?? join(process.env.LOCALAPPDATA ?? '', 'FoundryVTT', 'Data', 'systems', 'The2ndChumming3e');
const ROOT    = process.argv.includes('--install') ? INSTALL : REPO;
const CHECK   = process.argv.includes('--check');
const PACKDIR = join(ROOT, 'packs');

/* ⚠ Only the packs THIS REPO declares. The maintainer's install carries 22 unshipped pre-split
 * monolithic packs; renaming inside those would be work nobody ever sees, and it is how
 * `import-johnson-gear.mjs` first went wrong. */
const SHIPPED = new Set(readdirSync(join(REPO, 'packs')));

console.log(`Packs:  ${PACKDIR}`);
console.log(CHECK ? 'Mode:   --check (nothing will be written)\n' : 'Mode:   apply\n');

let renamed = 0, already = 0;
const samples = [];

for (const p of readdirSync(PACKDIR)) {
  if (!SHIPPED.has(p)) continue;
  const db = new ClassicLevel(join(PACKDIR, p), { valueEncoding: 'json' });
  try { await db.open(); } catch (err) {
    if (/LOCK|lock/i.test(String(err?.message))) {
      console.error('ERROR: a pack is locked — close Foundry and try again.');
      process.exit(1);
    }
    continue;
  }
  const writes = [];
  for await (const [k, v] of db.iterator()) {
    // Embedded items live under `!actors.items!` and must be covered too — the Little Black
    // Book contacts carry 36 cyberware documents of their own.
    const isItem  = String(k).startsWith('!items!');
    const isEmbed = String(k).startsWith('!actors.items!');
    if (!isItem && !isEmbed) continue;
    if (!v?.name || !['cyberware', 'bioware'].includes(v.type)) continue;

    // ⚠ Idempotence: an already-converted item carries `srcgName` and is left alone.
    if (v.system?.srcgName) { already++; continue; }

    const next = expandCyberwareName(v.name);
    if (next === v.name) continue;

    writes.push([k, { ...v, name: next, system: { ...(v.system ?? {}), srcgName: v.name } }]);
    if (samples.length < 15) samples.push(`${v.name}  →  ${next}   [${p}]`);
    renamed++;
  }
  if (!CHECK) for (const [k, v] of writes) await db.put(k, v);
  await db.close();
}

samples.forEach(s => console.log('  ' + s));
console.log(`\n${CHECK ? 'Would rename' : 'Renamed'}: ${renamed}`);
if (already) console.log(`Already carrying srcgName (skipped): ${already}`);
if (!CHECK && renamed && !process.argv.includes('--install')) {
  console.log('\nNow run the same command with --install.');
}
