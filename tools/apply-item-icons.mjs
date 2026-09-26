#!/usr/bin/env node
/**
 * Give every shipped item its picture — `scripts/data/item-icons.mjs` decides which.
 *
 *   node tools/apply-item-icons.mjs           edit packs-src, then `npm run packs:build`
 *   node tools/apply-item-icons.mjs --check   exit 1 if any file would change — changes nothing
 *
 * Covers top-level items (`!items!`) and actors' embedded items (`!actors.items!`), in every pack.
 * ⚠ Only a stock picture is replaced (`isStockImage`): a Foundry core icon, a type texture, one of the
 *   drawn icons, or none. Anything else was chosen for that item and stays.
 * ⚠ Goes through `tools/lib/pack-source.mjs`, whose output is deterministic, so an unchanged pack
 *   rewrites to the same bytes.
 */
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readSourceDir, writeSourceDir } from './lib/pack-source.mjs';
import { restockImage } from '../scripts/data/item-icons.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC  = join(ROOT, 'packs-src');

const isItemKey = key => key.startsWith('!items!') || /^![a-z]+\.items!/.test(key);

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const check = process.argv.includes('--check');
  let total = 0;
  for (const pack of readdirSync(SRC).sort()) {
    const entries = readSourceDir(join(SRC, pack));
    let n = 0;
    for (const [key, doc] of entries) {
      if (!isItemKey(key)) continue;
      const img = restockImage(doc);
      if (!img) continue;
      doc.img = img;
      n++;
    }
    if (!n) continue;
    total += n;
    console.log(`${check ? 'would update' : 'updated'}  ${pack}: ${n} item(s)`);
    if (!check) writeSourceDir(join(SRC, pack), entries);
  }
  console.log(total ? (check ? `${total} item(s) to update.` : `${total} item(s) updated — now run: npm run packs:build`) : 'Up to date.');
  process.exit(check && total ? 1 : 0);
}
