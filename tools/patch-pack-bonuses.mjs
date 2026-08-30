/**
 * Write the derived `Mods` bonuses into the shipped cyberware and bioware packs.  · TODO 8
 *
 * The other half of the same fix. `SR3EMigrations` handles items already embedded on actors;
 * this handles the compendium entries, so anything dragged in from now on arrives correct.
 * Both read the same generated map, `scripts/data/srcg-bonuses.js`.
 *
 * ⚠ **THERE ARE TWO COPIES OF EVERY PACK, AND FOUNDRY READS THE OTHER ONE.** `scripts/`,
 * `styles/` and `lang/` in the install are junctions into this checkout; **`packs/` is not** —
 * it is a real directory Foundry writes to, because these are LevelDB databases carrying world
 * state. Patching the repo copy alone fixes what ships and changes nothing in the running game.
 * That mistake cost an hour on 2026-08-20, so this prints which pack it is touching.
 *
 * ⚠ **Foundry must be CLOSED** — a LevelDB allows one writer.
 * ⚠ **Fills blanks only.** A pack entry someone has already given a value keeps it, matching
 *    the migration's rule. `--force` overrides.
 *
 *   node tools/patch-pack-bonuses.mjs --check      # report, write nothing
 *   node tools/patch-pack-bonuses.mjs              # patch the repo packs (what ships)
 *   node tools/patch-pack-bonuses.mjs --install    # patch the installed packs (what you play)
 */
import { ClassicLevel } from 'classic-level';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { SRCG_BONUSES } from '../scripts/data/srcg-bonuses.js';

const HERE    = dirname(fileURLToPath(import.meta.url));
const CHECK   = process.argv.includes('--check');
const FORCE   = process.argv.includes('--force');
const INSTALL = process.argv.includes('--install');

const ROOT = INSTALL
  ? (process.env.SR3E_INSTALL
     ?? join(process.env.LOCALAPPDATA ?? '', 'FoundryVTT', 'Data', 'systems', 'The2ndChumming3e'))
  : join(HERE, '..');

const PACKS_DIR = join(ROOT, 'packs');
if (!existsSync(PACKS_DIR)) {
  console.error(`\nNo packs directory at ${PACKS_DIR}\n`);
  process.exit(2);
}

/**
 * Every cyberware / bioware / adept-power pack the MANIFEST declares.
 *
 * ⚠ Filtered by `system.json`, not by what is on disk. The install still carries
 * `sr3e-bioware` and `sr3e-cyberware` — the OLD monolithic packs from before the
 * per-book split. They are undeclared, so Foundry never loads them, and patching them
 * reports 253 matches instead of 111 while changing nothing anyone can see.
 *
 * ⚠ **Adept-power packs were added 2026-08-29 (TODO 59).** All 117 shipped powers had every
 * bonus field at zero, because the generator never read `AdeptPowers.json`. Four packs join
 * here: sr3, mits, sota2, tss.
 */
const declared = new Set(
  (JSON.parse(readFileSync(join(ROOT, 'system.json'), 'utf8')).packs ?? []).map(x => x.name));

const onDisk = readdirSync(PACKS_DIR)
  .filter(d => /-(cyberware|bioware|adept-powers)$/.test(d)).sort();
const packs  = onDisk.filter(d => declared.has(d));
const stale  = onDisk.filter(d => !declared.has(d));

console.log(`Root:  ${ROOT}`);
console.log(`Packs: ${packs.length} — ${packs.join(', ')}`);
if (stale.length) console.log(`Skipped ${stale.length} undeclared pack(s) from the pre-split layout: ${stale.join(', ')}`);
console.log('');

const BONUS_FIELDS = ['bonusBod', 'bonusQui', 'bonusStr', 'bonusCha',
                      'bonusInt', 'bonusWil', 'bonusRea', 'bonusInitDice'];

let matched = 0, written = 0, skipped = 0;
const unmatchedNames = new Set(Object.keys(SRCG_BONUSES));

for (const packName of packs) {
  const path = join(PACKS_DIR, packName);
  const db = new ClassicLevel(path, { valueEncoding: 'json' });
  try {
    await db.open();
  } catch (err) {
    console.error(`\nCould not open ${path}`);
    console.error('Is Foundry still running? A LevelDB allows only one writer.\n');
    console.error(String(err.message ?? err));
    process.exit(2);
  }

  let packWrote = 0;
  for await (const [key, doc] of db.iterator()) {
    const want = SRCG_BONUSES[doc?.name];
    if (!want) continue;
    // ⚠ `type` is a guard, not a field. The map spans three item types keyed by name alone,
    // so a shared name would otherwise write one type's bonuses onto another's document.
    if (want.type && doc.type !== want.type) continue;
    matched++;
    unmatchedNames.delete(doc.name);

    const sys = doc.system ?? (doc.system = {});
    const delta = [];
    for (const field of BONUS_FIELDS) {
      if (!(field in want)) continue;
      const current = sys[field];
      const unset = current === undefined || current === null || current === 0;
      if (!unset && !FORCE) { skipped++; continue; }
      if (current === want[field]) continue;
      delta.push(`${field} ${current ?? '(unset)'} -> ${want[field]}`);
      if (!CHECK) sys[field] = want[field];
    }
    if (!delta.length) continue;

    console.log(`  ${packName}  ${doc.name}`);
    console.log(`      ${delta.join(', ')}`);
    if (!CHECK) { await db.put(key, doc); packWrote++; }
    written++;
  }

  await db.close();
  if (packWrote) console.log(`  → ${packName}: ${packWrote} document(s) written\n`);
}

console.log(`\nmatched ${matched} pack document(s) against ${Object.keys(SRCG_BONUSES).length} known items`);
console.log(`${CHECK ? 'would write' : 'wrote'} ${written}`);
if (skipped) console.log(`${skipped} field(s) left alone — already had a value (use --force to overwrite)`);

// ⚠ Names are the only join key, so a rename upstream or in the pack shows up here rather
// than silently doing nothing. Reported, not swallowed.
if (unmatchedNames.size) {
  console.log(`\n${unmatchedNames.size} known item(s) matched NO pack document — renamed, or from a book not shipped:`);
  [...unmatchedNames].sort().slice(0, 20).forEach(n => console.log('  ' + n));
  if (unmatchedNames.size > 20) console.log(`  … and ${unmatchedNames.size - 20} more`);
}

if (!CHECK && written) console.log('\nRestart Foundry (not F5) — these are data-model-backed fields.');
