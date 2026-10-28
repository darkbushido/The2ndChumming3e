#!/usr/bin/env node
/**
 * Fill what the shipped mods change — `system.modifiers` and armour's `system.hardened` — in `packs-src/` · TODO 276
 *
 * The table is `MOD_EFFECTS` / `HARDENED_ARMOR` in `scripts/data/mod-effects.mjs`; the same table fills owned copies
 * through the 0.9.0 migration. Every Item and Actor pack, embedded items included.
 *
 *   node tools/fill-mod-effects.mjs           edit packs-src, then `npm run packs:build`
 *   node tools/fill-mod-effects.mjs --check   report only, exit 1 if anything is left to fill — changes nothing
 *
 * ⚠ Fills blanks only (`ModEffects.fillDelta`): an entry whose modifiers already hold anything, or already hardened,
 *   is left alone. Idempotent.
 */
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdirSync } from 'node:fs';
import { readSourceDir, writeSourceDir } from './lib/pack-source.mjs';
import { ModEffects } from '../scripts/data/mod-effects.mjs';
import { setPath } from '../scripts/data/cyberlimb-mods.mjs';

const ROOT  = join(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');

let pending = 0;
for (const pack of readdirSync(join(ROOT, 'packs-src'))) {
  const dir = join(ROOT, 'packs-src', pack);
  const entries = readSourceDir(dir);
  let changed = 0;
  for (const [key, doc] of entries) {
    if (!/^!(items|actors\.items)!/.test(key)) continue;
    const delta = ModEffects.fillDelta(doc);
    if (!delta) continue;
    pending++;
    console.log(`${check ? '·' : '✓'} ${pack}: ${doc.name} — ${Object.keys(delta).join(', ')}`);
    if (check) continue;
    doc.system ??= {};
    for (const [path, value] of Object.entries(delta)) setPath(doc, path, value);
    changed++;
  }
  if (!check && changed) {
    const r = writeSourceDir(dir, entries);
    console.log(`  ${pack}: ${r.written} written, ${r.removed} removed`);
  }
}
console.log(`${pending} item(s) ${check ? 'to fill' : 'filled'}${!check && pending ? ' — now run: npm run packs:build' : ''}`);
if (check && pending) process.exitCode = 1;
