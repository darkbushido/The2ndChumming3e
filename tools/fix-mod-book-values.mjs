#!/usr/bin/env node
/**
 * Mod values corrected against the books, in the hand-kept packs — TODO 260.
 *
 *   node tools/fix-mod-book-values.mjs           correct packs-src, then run:
 *                                                node tools/build-mod-ratings.mjs && npm run packs:build
 *   node tools/fix-mod-book-values.mjs --check   exit 1 if anything would change — changes nothing
 *
 * The rule is `ModBookFixes` (`scripts/data/mod-book-fixes.mjs`, shared with the 0.7.1 migration that
 * corrects owned copies): a field is rewritten only while it still holds the value we shipped, so a re-run
 * is a no-op. Every entry carries its book and page. Reads and writes `packs-src` only (never LevelDB).
 *
 * Also adds RC Encryption Module levels 9 and 10 (M&M p.24: "available in ratings of 1 through 10"), copied
 * from level 8. Their ids are DERIVED (`idFor`), never random, so a re-run reuses them.
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readSourceDir, writeSourceDir } from './lib/pack-source.mjs';
import { ModBookFixes } from '../scripts/data/mod-book-fixes.mjs';
import { idFor } from './build-default-gear.mjs';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'packs-src');

/** The packs these documents live in; Remote Control ECCM is also embedded on an example character. */
export const PACKS = ['sr3e-r3-vehicle-mods', 'sr3e-mm-cyberware', 'sr3e-example-characters'];

/** M&M p.24: RC Encryption Module "available in ratings of 1 through 10"; level n costs n x 10,000¥, n/n days. */
const RCEM_EXTRA = [9, 10].map(r => ({ rating: r, cost: r * 10000, availability: `${r}/${r} days` }));

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
  if (pack !== 'sr3e-mm-cyberware') return n;
  const rcem = [...entries].filter(([k, d]) => k.startsWith('!items!') && d.name === 'RC Encryption Module'
    && d.type === 'cyberware' && d.system?.cyberwareCategory === 'Cyberlimb Mods');
  const eight = rcem.find(([, d]) => d.system.rating === 8)?.[1];
  if (!eight) return n;
  for (const x of RCEM_EXTRA) {
    if (rcem.some(([, d]) => d.system.rating === x.rating)) continue;
    const _id = idFor(`fix-mod-book-values|RC Encryption Module|${x.rating}`);
    const doc = structuredClone(eight);
    doc._id = _id;
    Object.assign(doc.system, { rating: x.rating, cost: x.cost, availability: x.availability });
    entries.set(`!items!${_id}`, doc);
    n++;
  }
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
