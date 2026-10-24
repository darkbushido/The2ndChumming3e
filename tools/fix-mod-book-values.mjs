#!/usr/bin/env node
/**
 * Mod values corrected against the books, in the hand-kept packs — TODO 261.
 *
 *   node tools/fix-mod-book-values.mjs           correct packs-src, then run:
 *                                                node tools/build-mod-ratings.mjs && npm run packs:build
 *   node tools/fix-mod-book-values.mjs --check   exit 1 if anything would change — changes nothing
 *
 * The rule is `ModBookFixes` (`scripts/data/mod-book-fixes.mjs`, shared with the 0.7.1 migration that
 * corrects owned copies): a field is rewritten only while it still holds the value we shipped, so a re-run
 * is a no-op. Every entry carries its book and page. Reads and writes `packs-src` only (never LevelDB).
 *
 * ⚠ It does NOT add documents. RC Encryption Module "is available in ratings of 1 through 10" (M&M p.24), and the
 * Rigger implant's packs print 1-8: levels 9 and 10 are rows of the level table (`tools/data/extra-levels.json`),
 * not documents — every rated item is one document now (TODO 261).
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readSourceDir, writeSourceDir } from './lib/pack-source.mjs';
import { ModBookFixes } from '../scripts/data/mod-book-fixes.mjs';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'packs-src');

/** The packs these documents live in; Remote Control ECCM is also embedded on an example character. */
export const PACKS = ['sr3e-r3-vehicle-mods', 'sr3e-mm-cyberware', 'sr3e-example-characters'];

/** Run over one pack's entries (a Map key → doc); returns the number of changes. Pure on its input. */
export function fixEntries(entries, pack) {
  let n = 0;
  for (const [key, doc] of entries) {
    if (!key.startsWith('!items!') && !/^![a-z]+\.items!/.test(key)) continue;
    const delta = ModBookFixes.fixItem(doc);
    if (!delta) continue;
    for (const [path, v] of Object.entries(delta)) doc.system[path.slice('system.'.length)] = v;
    n++;
  }
  void pack;
  return n;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const check = process.argv.includes('--check');
  let total = 0;
  for (const pack of PACKS) {
    const entries = readSourceDir(join(SRC, pack));
    const n = fixEntries(entries, pack);
    if (!n) continue;
    total += n;
    if (!check) writeSourceDir(join(SRC, pack), entries);
    console.log(`${check ? 'would change' : 'changed'} ${n} in ${pack}`);
  }
  console.log(total ? (check ? `${total} change(s) pending` : `${total} change(s) — now run: node tools/build-mod-ratings.mjs && npm run packs:build`) : 'nothing to change');
  process.exit(check && total ? 1 : 0);
}
