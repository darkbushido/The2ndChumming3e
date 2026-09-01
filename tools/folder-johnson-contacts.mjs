/**
 * Group the 62 Little Black Book contacts into the book's own sections · TODO 83
 *
 * The pack ships as a flat, alphabetical list of 62 archetypes with **0 in a folder**, which is
 * a poor thing to browse. The book already groups them, and its groupings are meaningful — a
 * GM looking for muscle wants *Who Watches the Watchmen?*, not to scroll past Antiquities
 * Dealers.
 *
 * Section membership is derived from the PDF, not typed out here: each contact belongs to the
 * last ALL-CAPS section heading printed above its stat block.
 *
 * ⚠ **Foundry must be CLOSED.** A LevelDB allows one writer.
 *
 * ⚠ **Idempotent** — a second run reports 0 changes. Folder ids are derived from the section
 * name rather than randomised, so re-running cannot create a duplicate set.
 *
 * ⚠ **TWO COPIES OF EVERY PACK.** `npm run sync:install` never copies packs. Run this twice:
 * once plain, once with `--install`.
 *
 *   node tools/folder-johnson-contacts.mjs --check
 *   node tools/folder-johnson-contacts.mjs
 *   node tools/folder-johnson-contacts.mjs --install
 *
 * ── How Foundry v14 stores compendium folders ────────────────────────────────────────────
 *
 * Verified against the installed build rather than guessed:
 * `dist/database/backend/compendium-folder.mjs` gives the folder class
 * `collectionName = "folders"` and `sublevel = this._db.sublevels.folders`, and
 * `server-compendium.mjs` pushes `"folders"` into `_getSublevelNames()`. So folders are
 * ordinary records in the same LevelDB under a **`!folders!<id>`** key, and a document joins
 * one through its own `folder` field.
 *
 * ⚠ **A folder's `type` must equal the pack's document type**, or Foundry throws on load:
 * *"Attempted to create a Folder for X Documents in a compendium that only allows for Y"*
 * (`dist/database/documents/folder.mjs`). This is an **Actor** pack.
 */
import { ClassicLevel } from 'classic-level';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';

const HERE    = dirname(fileURLToPath(import.meta.url));
const INSTALL = process.env.SR3E_INSTALL
  ?? join(process.env.LOCALAPPDATA ?? '', 'FoundryVTT', 'Data', 'systems', 'The2ndChumming3e');
const PACK = process.argv.includes('--install')
  ? join(INSTALL, 'packs', 'sr3e-mr-johnsons-contacts')
  : join(HERE, '..', 'packs', 'sr3e-mr-johnsons-contacts');
const CHECK = process.argv.includes('--check');

const PDF_DIR = process.env.SR3E_PDF_DIR
  ?? join(process.env.USERPROFILE ?? '', 'Documents', 'Shadowrun 3rd Edition PDFs');
const PDF = join(PDF_DIR, "Shadowrun 3e - Mr. Johnson's Little Black Book {FPR25003 }.pdf");
if (!existsSync(PDF)) {
  console.error(`ERROR: cannot find the PDF at\n  ${PDF}\nSet SR3E_PDF_DIR to its folder.`);
  process.exit(1);
}

/* ── Which section is each contact in? ─────────────────────────────────────────────────── */

const lines = execFileSync('pdftotext', ['-raw', '-f', '37', '-l', '68', PDF, '-'],
  { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).split(/\r?\n/);

const isHeading = (t) => /^[A-Z][A-Z0-9'!., \-/&?:]{2,}$/.test(t) && /[A-Z]{3}/.test(t);

/* Walk the text once. An ALL-CAPS line is either a CONTACT NAME (a stat block follows within a
 * page or so) or a SECTION HEADING (none does). Rather than guess, the contact names are taken
 * from the stat blocks themselves and anything else in caps is a section.
 *
 * ⚠ **"IT'S WHO YOU KNOW" is the chapter title, not a section**, and it precedes the first real
 * heading. Contacts before any section would land there; none do, but the guard is kept because
 * a mis-parse would silently file people under the chapter name. */
const contactNames = new Set();
for (let i = 0; i < lines.length; i++) {
  if (!/^B Q S I W C E (M )?R PR$/.test(lines[i].trim())) continue;
  for (let j = i - 2; j > i - 60 && j >= 0; j--) {
    const t = lines[j].trim();
    if (isHeading(t)) { contactNames.add(t); break; }
  }
}

const sectionOf = new Map();     // CONTACT NAME (upper) -> section title
const order     = [];            // section titles, in printed order
let current = null;
for (const raw of lines) {
  const t = raw.trim();
  if (!isHeading(t)) continue;
  if (contactNames.has(t)) {
    if (current) sectionOf.set(t, current);
    continue;
  }
  if (/^IT'S WHO YOU KNOW$/.test(t)) continue;    // chapter title
  current = t;
  if (!order.includes(t)) order.push(t);
}

/**
 * Title Case a printed heading — "DOWN AND DIRTY" reads better than shouting in a sidebar.
 *
 * ⚠ Small joining words stay lowercase unless they open the title, so this reads
 * "Who Watches the Watchmen?" rather than "Who Watches The Watchmen?".
 */
const SMALL = new Set(['a', 'an', 'and', 'the', 'of', 'in', 'on', 'to', 'for', 'or']);
const pretty = (t) => {
  const parts = t.toLowerCase().split(/(\s+)/);
  const lastWord = parts.reduce((acc, w, i) => (/^\s+$/.test(w) || !w) ? acc : i, 0);
  return parts.map((w, i) => {
    if (!w || /^\s+$/.test(w)) return w;
    // ⚠ A small word still capitalises when it OPENS the title, ENDS it ("The Show Must Go On"),
    // or follows a colon ("Crime, Inc: The Underworld"). Lower-casing those reads as a typo.
    const opensClause = i > 0 && /[:?!.]\s*$/.test(parts.slice(0, i).join(''));
    if (i > 0 && i !== lastWord && !opensClause && SMALL.has(w.replace(/[^a-z]/g, ''))) return w;
    return w.replace(/^([a-z])/, (c) => c.toUpperCase());
  }).join('');
};

console.log(`Pack:     ${PACK}`);
console.log(`Sections: ${order.length}`);
order.forEach(o => console.log(`  ${pretty(o)}  (${[...sectionOf.values()].filter(v => v === o).length})`));
console.log(CHECK ? '\nMode: --check (nothing will be written)\n' : '\nMode: apply\n');

/* ── Stable folder ids ─────────────────────────────────────────────────────────────────── */

/* ⚠ Derived from the section name, NOT random. A random id would create a second, duplicate
 * set of folders on every run and leave the previous ones orphaned — the kind of mess that is
 * tedious to clean out of a LevelDB by hand. */
const folderId = (title) =>
  createHash('sha1').update(`sr3e-lbb-${title}`).digest('hex').slice(0, 16);

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

const now = Date.now();
let foldersWritten = 0, moved = 0, already = 0, unplaced = [];

for (const [idx, title] of order.entries()) {
  const _id = folderId(title);
  const key = `!folders!${_id}`;
  const existing = await db.get(key).catch(() => undefined);
  const doc = {
    _id, name: pretty(title),
    // ⚠ Must match the pack's document type or Foundry refuses the folder on load.
    type: 'Actor',
    description: '', folder: null, sorting: 'a',
    // Printed order, not alphabetical — the book's sequence is deliberate.
    sort: (idx + 1) * 100000,
    color: null, flags: {},
    _stats: { compendiumSource: null, duplicateSource: null, coreVersion: '14',
              systemId: 'The2ndChumming3e', systemVersion: null,
              createdTime: now, modifiedTime: now, lastModifiedBy: null },
  };
  if (existing && existing.name === doc.name && existing.type === 'Actor') { already++; continue; }
  console.log(`  + folder  ${doc.name}`);
  foldersWritten++;
  if (!CHECK) await db.put(key, doc);
}

for await (const [key, doc] of db.iterator()) {
  if (!String(key).startsWith('!actors!') || String(key).includes('.items')) continue;
  if (!doc || typeof doc !== 'object') continue;
  /* ⚠ **The pack's name and the book's heading do not always match.** The book prints
   * "CORPORATE SECURITY" and "GHOUL"; the pack calls them "Corporate Security Guard" and
   * "Ghoul (Human Ghoul)". So an exact lookup leaves two contacts unfoldered. A heading that
   * PREFIXES the pack name is accepted as the same contact — deliberately one-directional and
   * anchored at the start, because a loose substring match would file "Corp Decker" and
   * "Corp Scientist" under whichever heading happened to contain "Corp". */
  const upper = String(doc.name ?? '').toUpperCase();
  let title = sectionOf.get(upper);
  if (!title) {
    for (const [heading, section] of sectionOf) {
      if (upper.startsWith(heading + ' ') || upper.startsWith(heading + ' (')) { title = section; break; }
    }
  }
  if (!title) { unplaced.push(doc.name); continue; }
  const want = folderId(title);
  if (doc.folder === want) { already++; continue; }
  console.log(`  → ${String(doc.name).padEnd(34)} ${pretty(title)}`);
  moved++;
  if (CHECK) continue;
  doc.folder = want;
  await db.put(key, doc);
}

await db.close();

console.log(`\n${CHECK ? 'Would create' : 'Created'} ${foldersWritten} folder(s), `
  + `${CHECK ? 'would file' : 'filed'} ${moved} contact(s). Already correct: ${already}.`);
if (unplaced.length) {
  console.log(`\n⚠ No section found (${unplaced.length}) — left unfoldered rather than guessed:`);
  unplaced.forEach(u => console.log(`  ${u}`));
}
if (!CHECK && (foldersWritten || moved) && !process.argv.includes('--install')) {
  console.log('\nNow run the same command with --install for the pack Foundry reads.');
}
