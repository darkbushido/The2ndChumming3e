/**
 * Copy `system.json` into the installed Foundry system directory.
 *
 * ⚠ **Why this exists.** `scripts/`, `styles/` and `lang/` in the install are junctions into
 * this checkout, so code edits are live. **`system.json` is a real file** — a copy — and
 * `packs/` is a real directory. So every version bump or manifest change silently leaves the
 * install a version behind, and Foundry keeps reporting the old number with no error anywhere.
 * That drift bit twice on 2026-08-20 before this script existed.
 *
 * ⚠ **`packs/` is deliberately NOT synced.** It is not a junction on purpose: the installed
 * packs are LevelDB databases that Foundry writes to, and copying over them would clobber a
 * live world's compendium state. Pack corrections go through their own tooling
 * (`tools/patch-enhanced-articulation.mjs`), with Foundry closed.
 *
 * ⚠ **Refuses to run when the pack declarations differ.** The installed `system.json` must
 * describe the packs that are actually in the install's `packs/` directory. If the repo has
 * added, removed or renamed a pack, copying the manifest alone would leave Foundry declaring
 * compendiums that do not exist — so the mismatch is reported rather than written. Pass
 * `--force` if you know the packs are being handled separately.
 *
 *   npm run sync:install            # copy, after checking
 *   npm run sync:install -- --check # report the difference, write nothing
 *   npm run sync:install -- --force # copy even if pack declarations differ
 *
 * Set SR3E_INSTALL to override the destination.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE  = dirname(fileURLToPath(import.meta.url));
const REPO  = join(HERE, '..');
const CHECK = process.argv.includes('--check');
const FORCE = process.argv.includes('--force');

const INSTALL = process.env.SR3E_INSTALL
  ?? join(process.env.LOCALAPPDATA ?? '', 'FoundryVTT', 'Data', 'systems', 'The2ndChumming3e');

const src = join(REPO, 'system.json');
const dst = join(INSTALL, 'system.json');

if (!existsSync(dst)) {
  console.error(`\nNo installed manifest at ${dst}`);
  console.error('Set SR3E_INSTALL to your Foundry system directory.\n');
  process.exit(2);
}

const srcText = readFileSync(src, 'utf8');
const dstText = readFileSync(dst, 'utf8');

if (srcText === dstText) {
  console.log(`system.json already in sync (${JSON.parse(srcText).version}).`);
  process.exit(0);
}

const a = JSON.parse(dstText);   // installed
const b = JSON.parse(srcText);   // repo

console.log(`version:  installed ${a.version}  ->  repo ${b.version}`);

// Pack declarations must still match what is on disk in the install.
const names = m => new Set((m.packs ?? []).map(p => p.name));
const A = names(a), B = names(b);
const gone  = [...A].filter(n => !B.has(n));
const added = [...B].filter(n => !A.has(n));

if (gone.length || added.length) {
  console.log(`packs:    ${A.size} installed, ${B.size} in repo`);
  if (gone.length)  console.log(`  removed by this sync: ${gone.join(', ')}`);
  if (added.length) console.log(`  newly declared:       ${added.join(', ')}`);
  if (!FORCE) {
    console.error('\nRefusing to sync: the manifest would declare packs that may not exist in');
    console.error(`${join(INSTALL, 'packs')}.`);
    console.error('Re-run with --force if the pack directories are being handled separately.\n');
    process.exit(1);
  }
  console.log('  --force: syncing anyway');
} else {
  console.log(`packs:    ${B.size}, unchanged`);
}

if (CHECK) {
  console.log('\n--check: nothing written.');
  process.exit(1);
}

writeFileSync(dst, srcText);
console.log(`\nWrote ${dst}`);
console.log('Restart Foundry — manifest changes are not picked up by F5.');
