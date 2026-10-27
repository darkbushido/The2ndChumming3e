#!/usr/bin/env node
/**
 * A firearm's printed accessories as installed mods, marked integral, in `packs-src/` · TODO 276 (step b)
 *
 * The rules are `scripts/data/integral-mods.mjs` (the maintainer's rulings of 2026-10-27: shown, never counted; the text kept;
 * clear matches only). The same module fills owned copies through the 0.9.0 migration. Every Item and Actor pack, embedded
 * items included (the archetypes' and contacts' guns).
 *
 *   node tools/fill-integral-mods.mjs           edit packs-src, then `npm run packs:build`
 *   node tools/fill-integral-mods.mjs --check   report only, exit 1 if anything is left to fill — changes nothing
 *
 * ⚠ Fills blanks only (`IntegralMods.fillDelta`): a gun already holding an integral mod, or marked done, is left alone. Idempotent.
 */
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdirSync } from 'node:fs';
import { readSourceDir, writeSourceDir } from './lib/pack-source.mjs';
import { IntegralMods } from '../scripts/data/integral-mods.mjs';
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
    const delta = IntegralMods.fillDelta(doc);
    if (!delta) continue;
    pending++;
    console.log(`${check ? '·' : '✓'} ${pack}: ${doc.name} — ${delta['system.installed'].filter(m => IntegralMods.isIntegral(m)).map(m => m.name).join(', ')}`);
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
console.log(`${pending} gun(s) ${check ? 'to fill' : 'filled'}${!check && pending ? ' — now run: npm run packs:build' : ''}`);
if (check && pending) process.exitCode = 1;
