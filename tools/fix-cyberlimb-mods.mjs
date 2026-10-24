/**
 * Apply the Cyberlimb Mods book corrections to `packs-src/` · TODO 255
 *
 * The list, with each field's old value and its book and page, is `PACK_CORRECTIONS` in
 * `scripts/data/cyberlimb-mods.mjs`; the audit is `audit/cyberlimb-mods-audit.md`.
 *
 * Edits the SOURCE only — `packs-src/` is the source of truth. Afterwards:
 *
 *   npm run packs:build      compile the changed packs
 *   npm run packs:install    copy to the Foundry install (Foundry CLOSED)
 *
 * ⚠ Idempotent: a field is changed only while it holds the old value (`was`); one already at the book
 * value is left alone, and a field holding anything else is reported, never overwritten.
 *
 *   node tools/fix-cyberlimb-mods.mjs --check   report only, exit 1 if anything is left to fix
 *   node tools/fix-cyberlimb-mods.mjs
 */
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSourceDir, writeSourceDir } from './lib/pack-source.mjs';
import { PACK_CORRECTIONS, getPath, setPath } from '../scripts/data/cyberlimb-mods.mjs';
import { COLLAPSED_SOURCES } from '../scripts/data/mod-rating-table.mjs';

const ROOT  = join(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');

let pending = 0, unexpected = 0;
const byPack = new Map();
for (const c of PACK_CORRECTIONS) byPack.set(c.pack, [...(byPack.get(c.pack) ?? []), c]);

for (const [pack, list] of byPack) {
  const dir     = join(ROOT, 'packs-src', pack);
  const entries = readSourceDir(dir);
  let changed = 0;
  for (const c of list) {
    const doc = entries.get(`!items!${c.id}`);
    // A level document the collapse deleted (TODO 260): its correction is in the family's kept document / the table.
    if (!doc && COLLAPSED_SOURCES[pack]?.[c.id]) { console.log(`· ${pack}/${c.id}: collapsed into ${COLLAPSED_SOURCES[pack][c.id]}`); continue; }
    if (!doc) { console.log(`✗ ${pack}/${c.id}: not in the pack`); unexpected++; continue; }
    for (const [path, value] of Object.entries(c.set)) {
      const now = getPath(doc, path);
      if (now === value) continue;
      if (now !== c.was[path]) {
        console.log(`⚠ ${doc.name} (${c.id}) ${path} is ${JSON.stringify(now)} — neither the old value nor the book's; left alone`);
        unexpected++;
        continue;
      }
      console.log(`${check ? '·' : '✓'} ${doc.name} (${c.id}) ${path}: ${JSON.stringify(now)} → ${JSON.stringify(value)}  (${c.source})`);
      pending++;
      if (!check) { setPath(doc, path, value); changed++; }
    }
  }
  if (!check && changed) {
    const r = writeSourceDir(dir, entries);
    console.log(`  ${pack}: ${r.written} written, ${r.removed} removed`);
  }
}

console.log(`${pending} field(s) ${check ? 'to fix' : 'fixed'}, ${unexpected} unexpected`);
if (unexpected || (check && pending)) process.exitCode = 1;
