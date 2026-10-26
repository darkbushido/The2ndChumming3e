#!/usr/bin/env node
/**
 * Fill the books' Legality Codes into the hand-kept packs · SR3 p.273 (2026-10-25).
 *
 *   node tools/fill-legality.mjs           write system.legality into packs-src (blank fields only), then: npm run packs:build
 *   node tools/fill-legality.mjs --check   exit 1 if a document would change — changes nothing
 *
 * The codes are `scripts/data/legality-table.mjs`; the rule is `tools/lib/legality-fill.mjs`. ⚠ The generated
 * documents (`generatedBy: build-default-gear`) are the generator's — it fills them itself, and this tool only reports
 * one still blank ("re-run tools/build-default-gear.mjs"). Embedded items on pack actors are not touched.
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readSourceDir, writeSourceDir } from './lib/pack-source.mjs';
import { fillLegality, codeFor } from './lib/legality-fill.mjs';
import { LEGALITY } from '../scripts/data/legality-table.mjs';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'packs-src');
const isGenerated = doc => doc?.flags?.The2ndChumming3e?.generatedBy === 'build-default-gear';

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const check = process.argv.includes('--check');
  let changed = 0, stale = 0, missing = 0;
  for (const pack of Object.keys(LEGALITY).sort()) {
    const entries = readSourceDir(join(SRC, pack));
    let n = 0;
    for (const id of Object.keys(LEGALITY[pack])) {
      const doc = entries.get(`!items!${id}`);
      if (!doc) { missing++; console.log(`⚠ ${pack}: ${id} is not in the pack — the table names a document that has gone`); continue; }
      const probe = structuredClone(doc);
      if (!fillLegality(pack, probe)) continue;
      if (isGenerated(doc)) { stale++; console.log(`generated, still blank: ${pack} ${doc.name} — re-run tools/build-default-gear.mjs`); continue; }
      if (check) console.log(`would fill  ${pack}: ${doc.name} → ${codeFor(pack, id)}`);
      else fillLegality(pack, doc);
      n++;
    }
    if (n && !check) writeSourceDir(join(SRC, pack), entries);
    changed += n;
  }
  console.log(`${changed} document(s) ${check ? 'would be filled' : 'filled'}${stale ? `, ${stale} generated still blank` : ''}${missing ? `, ${missing} missing` : ''}`);
  if (changed && !check) console.log('now run: npm run packs:build');
  process.exit(check && (changed || stale || missing) ? 1 : missing ? 1 : 0);
}

