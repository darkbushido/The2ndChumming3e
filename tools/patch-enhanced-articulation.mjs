/**
 * One-off: give Enhanced Articulation its category-bonus fields.  · *M&M p.66*
 *
 * The item ships in `sr3e-mm-bioware` with empty bonus fields, so TODO 10's checkbox has
 * nothing to offer until they are filled in. Populating the packs properly is TODO 8; this
 * patches the single item so the feature is usable now.
 *
 * ⚠ **Foundry must be CLOSED.** A LevelDB pack allows one writer, and Foundry holds the lock
 * while a world is open. The script fails loudly rather than corrupting anything.
 *
 * ⚠ It is **idempotent** — re-running changes nothing once the fields are set, so it is safe
 * to run again if you are unsure whether it took.
 *
 *   node tools/patch-enhanced-articulation.mjs           # apply
 *   node tools/patch-enhanced-articulation.mjs --check   # report only, write nothing
 */
import { ClassicLevel } from 'classic-level';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * ⚠ **THERE ARE TWO COPIES OF EVERY PACK, AND FOUNDRY READS THE OTHER ONE.**
 *
 * `scripts/`, `styles/` and `lang/` in the Foundry install are junctions into this checkout,
 * so code edits are live. **`packs/` is NOT** — it is a real directory that Foundry writes to,
 * deliberately, because these are LevelDB databases carrying world state. Patching the repo's
 * copy therefore fixes what ships and changes nothing in the running game, which is exactly
 * the mistake made on 2026-08-20: the pack was corrected, Foundry was restarted, and the item
 * still had empty fields because the running game never saw it.
 *
 *   --install   patch the installed pack (what your Foundry actually reads)
 *   (default)   patch the repo pack (what ships to everyone else)
 *
 * Both usually need doing: the repo copy so the fix is released, the install copy so it works
 * here. Set SR3E_INSTALL to override the install location.
 */
const INSTALL = process.env.SR3E_INSTALL
  ?? join(process.env.LOCALAPPDATA ?? '', 'FoundryVTT', 'Data', 'systems', 'The2ndChumming3e');
const PACK = process.argv.includes('--install')
  ? join(INSTALL, 'packs', 'sr3e-mm-bioware')
  : join(HERE, '..', 'packs', 'sr3e-mm-bioware');
const NAME = 'Enhanced Articulation';
const CHECK = process.argv.includes('--check');

/**
 * The five categories, verbatim from `ACTIVE_SKILL_CATEGORIES`.
 *
 * ⚠ Comma-separated, and commas ONLY — "Build/Repair skills" contains a slash, and a parser
 * that split on that too would tear the category in half.
 */
const CATEGORIES = [
  'Combat skills', 'Physical skills', 'Technical skills',
  'Build/Repair skills', 'Vehicle skills',
].join(', ');

const DESCRIPTION =
  '<p>Joint-surface coating, relubrication and tendon augmentation for fluid muscle and joint action.</p>'
  + '<p><strong>+1 die</strong> on any Success Test involving <strong>Combat, Physical, Technical and '
  + 'Build/Repair</strong> skills, and on <strong>physical use of Vehicle skills</strong> — driving via '
  + 'datajack or piloting a submarine does not qualify. Tick the bonus on the Roll Skill dialog; the '
  + 'Vehicle case is left to your judgement.</p>'
  + '<p><strong>+1 Reaction</strong>, with no effect on rigging or decking and no effect on the Control '
  + 'Pool — apply by hand.</p>';

console.log(`Pack: ${PACK}`);
const db = new ClassicLevel(PACK, { valueEncoding: 'json' });

try {
  await db.open();
} catch (err) {
  console.error(`\nCould not open ${PACK}`);
  console.error('Is Foundry still running? A LevelDB pack allows only one writer.\n');
  console.error(String(err.message ?? err));
  process.exit(2);
}

let found = 0, changed = 0;

for await (const [key, doc] of db.iterator()) {
  if (doc?.name !== NAME) continue;
  found++;

  const sys = doc.system ?? (doc.system = {});
  const before = {
    cat:  sys.improvedSkillCategory ?? '',
    dice: sys.improvedSkillDice ?? 0,
    desc: sys.description ?? '',
  };

  const after = { cat: CATEGORIES, dice: 1, desc: DESCRIPTION };
  const same  = before.cat === after.cat && before.dice === after.dice && before.desc === after.desc;

  console.log(`\n${key}`);
  console.log(`  improvedSkillCategory: ${before.cat === '' ? '(empty)' : before.cat}`);
  console.log(`                      -> ${after.cat}`);
  console.log(`  improvedSkillDice:     ${before.dice} -> ${after.dice}`);
  console.log(`  description:           ${before.desc === after.desc ? 'unchanged' : 'rewritten (the old text was not from M&M)'}`);

  if (same) { console.log('  already correct — nothing to do'); continue; }
  if (CHECK) { console.log('  --check: not written'); continue; }

  sys.improvedSkillCategory = after.cat;
  sys.improvedSkillDice     = after.dice;
  sys.description           = after.desc;
  // ⚠ improvedSkillName is left ALONE. That channel is auto-applied at every roll path; the
  // category channel is the opt-in one, and conflating them would make the die unconditional.
  // bonusRea is likewise untouched — see the description's last line and TODO 30.
  await db.put(key, doc);
  changed++;
  console.log('  written');
}

await db.close();

if (!found) {
  console.error(`\nNo item named "${NAME}" in ${PACK} — nothing was changed.`);
  process.exit(1);
}

console.log(`\n${found} matching item(s); ${changed} written.`);
if (!CHECK && changed) console.log('Restart Foundry (not F5) — this is a data-model-backed field.');
