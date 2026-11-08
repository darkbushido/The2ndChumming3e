#!/usr/bin/env node
/**
 * Spell values corrected against the books, in every pack — TODO 123 (`audit/spells-audit.md`).
 *
 *   node tools/fix-spell-book-values.mjs           correct packs-src, then run: npm run packs:build
 *   node tools/fix-spell-book-values.mjs --check   exit 1 if anything would change — changes nothing
 *
 * The rule is `SpellBookFixes` (`scripts/data/spell-book-fixes.mjs`, shared with the 0.9.0 migration that
 * corrects owned copies): a field is rewritten only while it still holds the value we shipped, so a re-run
 * is a no-op. Every entry carries its book and page. Sweeps every pack — spells embedded on actors too —
 * and reads and writes `packs-src` only (never LevelDB).
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readdirSync } from 'node:fs';
import { readSourceDir, writeSourceDir } from './lib/pack-source.mjs';
import { SpellBookFixes } from '../scripts/data/spell-book-fixes.mjs';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'packs-src');

/** Run over one pack's entries (a Map key → doc); returns the number of documents changed. */
export function fixEntries(entries) {
  let n = 0;
  for (const [key, doc] of entries) {
    if (!key.startsWith('!items!') && !/^![a-z]+\.items!/.test(key)) continue;
    const delta = SpellBookFixes.fixItem(doc);
    if (!delta) continue;
    SpellBookFixes.apply(doc, delta);
    n++;
  }
  return n;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const check = process.argv.includes('--check');
  let total = 0;
  for (const pack of readdirSync(SRC, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name)) {
    const entries = readSourceDir(join(SRC, pack));
    const n = fixEntries(entries);
    if (!n) continue;
    total += n;
    if (!check) writeSourceDir(join(SRC, pack), entries);
    console.log(`${check ? 'would change' : 'changed'} ${n} in ${pack}`);
  }
  console.log(total ? (check ? `${total} change(s) pending` : `${total} change(s) — now run: npm run packs:build`) : 'nothing to change');
  process.exit(check && total ? 1 : 0);
}
