/**
 * Copy each item's rating out of its NAME into `system.rating` · TODO 118.
 *
 * The packs inherited the generator's `Wired Reflexes [2]` naming and store `rating: 0` — 537 of
 * 540 bracketed cyberware, all 72 bracketed bioware. `itemRating()` already reads the name when the
 * field is 0, so play is right either way; this makes the compendium sheet SHOW the number, the
 * same fill that migration 0.5.2 does for items already in a world. The rule is shared:
 * `ratingFromName` from `scripts/data/item-rating.mjs`, so the two can never disagree.
 *
 * Fills blanks only (0, null, '' or missing) — a rating anyone set is kept — so it is idempotent.
 * Covers loose items (`!items!`) and items embedded in actor packs (`!actors.items!`): an embedded
 * item is its own record, and the actor's `items` array only lists ids, so there is one write each.
 *
 * ⚠ **Foundry must be CLOSED**, and it must be run TWICE — once for the repo (what ships), once
 * with `--install` (what the local Foundry reads). See CLAUDE.md, *Editing an existing pack*.
 *
 *   node tools/patch-name-ratings.mjs [--install] [--check]
 */
import { ClassicLevel } from 'classic-level';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { knownRating } from '../scripts/data/item-rating.mjs';
import { copyPacks } from './lib/pack-copy.mjs';

const HERE    = dirname(fileURLToPath(import.meta.url));
const REPO    = join(HERE, '..');
const INSTALL = process.env.SR3E_INSTALL
  ?? join(process.env.LOCALAPPDATA ?? '', 'FoundryVTT', 'Data', 'systems', 'The2ndChumming3e');
const ROOT    = process.argv.includes('--install') ? INSTALL : REPO;
const CHECK   = process.argv.includes('--check');

/** The types whose rating lives in the name. `medical` keeps its rating as a string ("+2" is real). */
export const RATED_TYPES = ['gear', 'cyberware', 'bioware', 'medical'];

/**
 * The new `system.rating` for one item document, or `undefined` when nothing changes. Pure.
 * Fills a blank from the name or the generator's Rating column (`knownRating`); a GEAR item's
 * legacy `0` with nothing to fill it from becomes `null`, "no rating" (the maintainer, 2026-09-14 —
 * gear only; cyberware and bioware keep their 0, TODO 122).
 */
export function ratingPatch(doc) {
  if (!RATED_TYPES.includes(doc?.type)) return undefined;
  const cur = doc.system?.rating;
  if (!(cur === undefined || cur === null || cur === '' || Number(cur) === 0)) return undefined;
  const r = knownRating(doc.name);
  if (r) return doc.type === 'medical' ? String(r) : r;
  // ⚠ A legacy 0 with nothing to fill it from becomes an explicit null — "no rating" — on every
  // type whose field is authoritative (TODO 118 for gear, TODO 122 for cyberware and bioware).
  // `medical` is excluded because its rating is a STRING ("+2" is a real Biotech rating), so it has
  // no null to mean anything, and an explicit null is already the answer and is left alone.
  return ['gear', 'cyberware', 'bioware'].includes(doc.type) && cur !== null ? null : undefined;
}

// Only the packs this system declares — an install may still carry undeclared pre-split packs.
//
// ⚠ The repo is SCANNED FROM A COPY and only the packs that need a write are opened for real:
// opening a LevelDB rewrites its log files even to read, and a sweep that opened all 82 left
// 70 untouched packs "modified" in git (tools/lib/pack-copy.mjs). The install is not in git.
async function main() {
  const packs = JSON.parse(readFileSync(join(REPO, 'system.json'), 'utf8')).packs.map(p => p.name);
  console.log(`${CHECK ? 'Checking' : 'Patching'} ${join(ROOT, 'packs')} — ${packs.length} declared packs`);
  const copy = ROOT === REPO ? copyPacks(join(ROOT, 'packs')) : null;
  const scanRoot = copy ? copy.dir : join(ROOT, 'packs');
  const open = async path => {
    const db = new ClassicLevel(path, { valueEncoding: 'json' });
    try { await db.open(); } catch (err) {
      console.error(`\n${path}: could not open — close Foundry (a LevelDB allows one process).\n${err.message}`);
      copy?.cleanup(); process.exit(2);
    }
    return db;
  };
  let total = 0;
  try {
    for (const name of packs) {
      if (!existsSync(join(scanRoot, name))) continue;
      const scan = await open(join(scanRoot, name));
      const writes = [];
      for await (const [key, doc] of scan.iterator()) {
        if (!/^!(items|actors\.items)!/.test(key)) continue;
        const r = ratingPatch(doc);
        if (r === undefined) continue;
        doc.system.rating = r;
        writes.push([key, doc]);
      }
      if (!writes.length || CHECK || copy) await scan.close();
      if (!writes.length) continue;
      console.log(`  ${name}: ${writes.length}${CHECK ? ' to fill' : ' filled'}  e.g. ${writes[0][1].name} → ${writes[0][1].system.rating}`);
      total += writes.length;
      if (CHECK) continue;
      const db = copy ? await open(join(ROOT, 'packs', name)) : scan;
      for (const [k, d] of writes) await db.put(k, d);
      await db.close();
    }
  } finally { copy?.cleanup(); }
  console.log(`\n${total} item${total === 1 ? '' : 's'} ${CHECK ? 'would be' : 'were'} given the rating from their name.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
