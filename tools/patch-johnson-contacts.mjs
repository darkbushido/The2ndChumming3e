/**
 * Lift Professional Rating and Karma Pool out of prose and into fields · TODO 83
 *
 * All 62 actors in `sr3e-mr-johnsons-contacts` ship their real numbers in `system.notes`:
 *
 *   > Mr. Johnson's Little Black Book, p.53. PR 3. Karma Pool 6.
 *
 * `system.karmaPool` exists and was never written; `professionalRating` did not exist until
 * now. This writes both. **The prose is kept** — it is the source citation, and p.53 is where
 * a GM looks the NPC up.
 *
 * ⚠ **Foundry must be CLOSED.** A LevelDB allows one writer and Foundry holds the lock while a
 * world is open. Fails loudly rather than corrupting anything.
 *
 * ⚠ **Idempotent.** Re-running writes nothing once the fields match, so it is safe to run again
 * if you are unsure whether it took.
 *
 * ⚠ **TWO COPIES OF EVERY PACK, and Foundry reads the other one.** `scripts/`, `styles/` and
 * `lang/` in the install are junctions into this checkout; **`packs/` is not**. Patching the
 * repo fixes what ships and changes nothing in the running game.
 *
 * ⚠ **`npm run sync:install` will NOT carry this over.** It syncs `system.json` only and
 * *deliberately* never copies packs — they are LevelDB databases Foundry writes to, and
 * overwriting one would clobber world state. Its "packs: 82, unchanged" line compares the
 * manifest's declared pack NAMES, not their contents, so it reports success while the
 * installed pack still holds the old data. **Run this tool twice — once plain, once with
 * `--install`.**
 *
 *   node tools/patch-johnson-contacts.mjs           # the repo pack (what ships)
 *   node tools/patch-johnson-contacts.mjs --install  # the installed pack
 *   node tools/patch-johnson-contacts.mjs --check    # report only, write nothing
 */
import { ClassicLevel } from 'classic-level';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseJohnsonNotes, isJohnsonNote } from '../scripts/data/johnson-notes.mjs';

const HERE    = dirname(fileURLToPath(import.meta.url));
const INSTALL = process.env.SR3E_INSTALL
  ?? join(process.env.LOCALAPPDATA ?? '', 'FoundryVTT', 'Data', 'systems', 'The2ndChumming3e');
const PACK = process.argv.includes('--install')
  ? join(INSTALL, 'packs', 'sr3e-mr-johnsons-contacts')
  : join(HERE, '..', 'packs', 'sr3e-mr-johnsons-contacts');
const CHECK = process.argv.includes('--check');

/**
 * Values the SHIPPED NOTES omit and the SOURCE BOOK gives.
 *
 * Two of the 62 transcriptions are incomplete. Both were read back off the PDF, where the stat
 * block puts PR as the ninth attribute column and the Karma Pool under "Dice Pools":
 *
 *   Metroplex Guardsman, p.63 — `B Q S I W C E R PR / 4 4 5 3 4 2 4.3 3 3`,
 *                               `Dice Pools: Combat 5, Karma 2`
 *   Dock Worker,         p.67 — `10 (11) 4 10 3 3 2 6 3 2`, `Dice Pools: Combat 5, Karma 2`
 *
 * ⚠ **The NOTE is rewritten too, not just the fields.** Leaving the prose incomplete would
 * make the pack disagree with itself, and the next person to read it would re-derive this
 * same gap. The rewrite only ever ADDS the missing sentences; it never edits what is there.
 *
 * ⚠ **Keyed by name, applied only where the value is genuinely absent.** If a future pack
 * rebuild transcribes these correctly, the parsed value wins and this map does nothing.
 */
const SOURCE_CORRECTIONS = {
  'Metroplex Guardsman': { professionalRating: 3, karmaPool: 2 },
  'Dock Worker':         { professionalRating: 2, karmaPool: 2 },
};

console.log(`Pack:  ${PACK}`);
console.log(CHECK ? 'Mode:  --check (nothing will be written)\n' : 'Mode:  apply\n');

const db = new ClassicLevel(PACK, { valueEncoding: 'json' });
try {
  await db.open();
} catch (err) {
  if (/LOCK|lock/i.test(String(err?.message))) {
    console.error('ERROR: the pack is locked — close Foundry and try again.');
    process.exit(1);
  }
  throw err;
}

let patched = 0, already = 0, skipped = 0, noCitation = 0;
const partial = [], recovered = [];

/** Add a sentence inside the note's existing markup, without disturbing what is there. */
function _appendSentence(html, sentence) {
  const s = String(html ?? '');
  return /<\/p>\s*$/i.test(s)
    ? s.replace(/<\/p>\s*$/i, ` ${sentence}</p>`)
    : `${s} ${sentence}`.trim();
}

for await (const [key, doc] of db.iterator()) {
  // ⚠ Actor documents only. Embedded items live under `!actors.items!` keys in the same
  // database, and they carry notes of their own that must never be scanned for this.
  if (!String(key).startsWith('!actors!') || String(key).includes('.items')) continue;
  if (!doc || typeof doc !== 'object') continue;

  const notes = doc.system?.notes ?? '';
  if (!isJohnsonNote(notes)) { noCitation++; continue; }

  const parsed = parseJohnsonNotes(notes);
  const page   = parsed.page;
  const fix    = SOURCE_CORRECTIONS[doc.name] ?? {};

  // The book's value fills a gap in the transcription; a transcribed value always wins.
  const professionalRating = parsed.professionalRating ?? fix.professionalRating;
  const karmaPool          = parsed.karmaPool          ?? fix.karmaPool;

  let notesOut = notes;
  if (parsed.professionalRating === undefined && fix.professionalRating !== undefined) {
    notesOut = _appendSentence(notesOut, `PR ${fix.professionalRating}.`);
    recovered.push(`${doc.name} — PR ${fix.professionalRating} (from the book)`);
  }
  if (parsed.karmaPool === undefined && fix.karmaPool !== undefined) {
    notesOut = _appendSentence(notesOut, `Karma Pool ${fix.karmaPool}.`);
    recovered.push(`${doc.name} — Karma Pool ${fix.karmaPool} (from the book)`);
  }

  if (professionalRating === undefined || karmaPool === undefined) {
    partial.push(`${doc.name} (p.${page ?? '?'}) — `
      + `${professionalRating === undefined ? 'no PR' : `PR ${professionalRating}`}, `
      + `${karmaPool === undefined ? 'no Karma Pool' : `Karma Pool ${karmaPool}`}`);
  }

  const changes = {};
  if (notesOut !== notes) changes.notes = notesOut;
  // ⚠ Only what the book actually states. An absent value is left at the schema default
  // rather than written as 0 — a stored 0 is indistinguishable from a deliberate one.
  if (professionalRating !== undefined && doc.system.professionalRating !== professionalRating) {
    changes.professionalRating = professionalRating;
  }
  if (karmaPool !== undefined && doc.system.karmaPool !== karmaPool) {
    changes.karmaPool = karmaPool;
  }

  if (!Object.keys(changes).length) {
    if (professionalRating === undefined && karmaPool === undefined) skipped++;
    else already++;
    continue;
  }

  console.log(`  ${doc.name.padEnd(38)} `
    + Object.entries(changes)
        .map(([k, v]) => k === 'notes' ? 'notes(completed)' : `${k}=${v}`).join('  '));
  patched++;
  if (CHECK) continue;

  doc.system = { ...doc.system, ...changes };
  await db.put(key, doc);
}

await db.close();

console.log(`\n${CHECK ? 'Would patch' : 'Patched'}: ${patched}`);
console.log(`Already correct:      ${already}`);
console.log(`Nothing to take:      ${skipped}`);
console.log(`Not a Book citation:  ${noCitation}`);
if (recovered.length) {
  console.log('\n✔ Recovered from the source PDF, where the shipped note was incomplete '
    + `(${recovered.length}):`);
  recovered.forEach(r => console.log(`  ${r}`));
}
if (partial.length) {
  console.log(`\n⚠ Incomplete in the source book (${partial.length}) — the fields the book does `
    + 'not state are left at their defaults:');
  partial.forEach(p => console.log(`  ${p}`));
}
if (!CHECK && patched && !process.argv.includes('--install')) {
  // ⚠ NOT sync:install — it never copies packs. See the header.
  console.log('\nNow run the same command with --install to patch the pack Foundry reads.');
}
