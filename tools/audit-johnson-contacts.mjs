/**
 * Audit all 62 Little Black Book contacts against the printed book · TODO 84
 *
 * Two of the 62 shipped with real data-entry errors, and **they were exactly the two whose
 * notes were incomplete** — Metroplex Guardsman was effectively unentered (metatype `elf`,
 * every attribute at the generator's default of 3), and Dock Worker had Willpower and Charisma
 * transposed. That is not a coincidence: both were entered hastily. This checks the other 60.
 *
 * It compares the **generator** — `scripts/macros/populate-mr-johnsons-contacts.js`, the source
 * of truth the pack is built from — against the stat blocks extracted from the PDF.
 *
 * ⚠ **REPORTS, NEVER WRITES.** The generator makes deliberate judgement calls that a mismatch
 * cannot be distinguished from an error: effective values over parentheticals, cyberware
 * consolidated onto one item sized to hit the printed Essence, Reaction left to the system's
 * own derivation except where the book names a known reflex booster. A human decides.
 *
 * ⚠ **The column order is `B Q S I W C`** — Intelligence and Willpower BEFORE Charisma. That
 * is precisely the Dock Worker slip, and the mistake a hand-transcriber repeats.
 *
 * ⚠ **Awakened contacts carry an extra column**: `B Q S I W C E M R PR` rather than
 * `B Q S I W C E R PR`. 9 of the 62. Parsing the wrong header shifts everything after Essence.
 *
 * ⚠ **A value may carry a parenthetical** — `6 (7)`, `5 (9)`, `10 (11)` — which is one logical
 * column spanning two whitespace-separated tokens. The book prints the natural value first and
 * the augmented value in brackets; the generator's stated convention is to use the AUGMENTED
 * one. Both are reported so a mismatch can be read either way.
 *
 *   node tools/audit-johnson-contacts.mjs                 # report
 *   node tools/audit-johnson-contacts.mjs --all           # include matching records
 *
 * Requires `pdftotext` (ships with Git for Windows) and the PDF in the maintainer's library.
 * Override the location with SR3E_PDF_DIR.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE   = dirname(fileURLToPath(import.meta.url));
const SHOW_OK = process.argv.includes('--all');
const PDF_DIR = process.env.SR3E_PDF_DIR
  ?? join(process.env.USERPROFILE ?? '', 'Documents', 'Shadowrun 3rd Edition PDFs');
const PDF = join(PDF_DIR, "Shadowrun 3e - Mr. Johnson's Little Black Book {FPR25003 }.pdf");

if (!existsSync(PDF)) {
  console.error(`ERROR: cannot find the PDF at\n  ${PDF}\nSet SR3E_PDF_DIR to its folder.`);
  process.exit(1);
}

/* ── The book ──────────────────────────────────────────────────────────────────────────── */

// Stat blocks run p.36-67; this book's PDF page = book page + 1.
let raw;
try {
  raw = execFileSync('pdftotext', ['-raw', '-f', '37', '-l', '68', PDF, '-'],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
} catch {
  console.error('ERROR: `pdftotext` is not on PATH. It ships with Git for Windows.');
  process.exit(1);
}

const lines = raw.split(/\r?\n/);

/**
 * Split a value row into logical columns, folding `6 (7)` into one.
 *
 * ⚠ Returns BOTH readings. The book prints natural-then-augmented; the generator uses the
 * augmented one, so a mismatch that resolves under the other reading is a convention question
 * rather than a transcription error, and the report must be able to say so.
 */
function splitRow(text) {
  const toks = text.trim().split(/\s+/);
  const natural = [], augmented = [];
  for (let i = 0; i < toks.length; i++) {
    const m = /^\((\d+(?:\.\d+)?)\)$/.exec(toks[i]);
    if (m && natural.length) { augmented[augmented.length - 1] = Number(m[1]); continue; }
    const n = Number(toks[i]);
    if (!Number.isFinite(n)) return null;
    natural.push(n); augmented.push(n);
  }
  return { natural, augmented };
}

const book = [];
for (let i = 0; i < lines.length; i++) {
  const hdr = /^B Q S I W C E (M )?R PR$/.exec(lines[i].trim());
  if (!hdr) continue;
  const awakened = !!hdr[1];
  const cols = splitRow(lines[i + 1] ?? '');
  if (!cols) continue;

  const want = awakened ? 10 : 9;
  if (cols.natural.length !== want) {
    console.error(`⚠ column count ${cols.natural.length} (expected ${want}) near line ${i + 1}: `
      + `"${lines[i + 1]}" — SKIPPED, this record is not audited`);
    continue;
  }

  // Metatype sits on the line above the header; the ALL-CAPS name is the nearest heading above.
  const meta = /^Metatype:\s*(.+)$/.exec((lines[i - 1] ?? '').trim());
  let name = null;
  for (let j = i - 2; j > i - 60 && j >= 0; j--) {
    const t = lines[j].trim();
    if (/^[A-Z][A-Z0-9'!., \-/&]{2,}$/.test(t) && /[A-Z]{3}/.test(t)) { name = t; break; }
  }

  const [body, quickness, strength, intelligence, willpower, charisma] = cols.augmented;
  const essence = cols.augmented[6];
  const pr      = cols.augmented[cols.augmented.length - 1];

  // "Dice Pools: Combat 5, Karma 3" — the Karma Pool.
  let karma = null;
  for (let j = i + 2; j < i + 6 && j < lines.length; j++) {
    const m = /Dice Pools:.*?Karma\s+(\d+)/i.exec(lines[j] ?? '');
    if (m) { karma = Number(m[1]); break; }
  }

  const reaction = cols.augmented[cols.augmented.length - 2];
  const magic    = awakened ? cols.augmented[7] : 0;   // the M column, Awakened only
  book.push({ name, metatype: (meta?.[1] ?? '').toLowerCase().trim(), awakened,
              body, quickness, strength, intelligence, willpower, charisma, essence, pr, karma,
              reaction, magic, natural: cols.natural, line: i + 1 });
}

/* ── The generator ─────────────────────────────────────────────────────────────────────── */

const src = readFileSync(join(HERE, '..', 'scripts', 'macros',
  'populate-mr-johnsons-contacts.js'), 'utf8');

const gen = new Map();
// baseActor('Name', page, { … }) — the object runs to the matching close, so take everything
// up to the `})` that ends the call and pull simple `key: value` pairs out of it.
for (const m of src.matchAll(/baseActor\(\s*'([^']+)'\s*,\s*(\d+)\s*,\s*\{([\s\S]*?)\}\s*\)/g)) {
  const [, name, page, bodyText] = m;
  const num = (k) => {
    const v = new RegExp(`\\b${k}\\s*:\\s*(-?\\d+(?:\\.\\d+)?|null)`).exec(bodyText);
    return !v || v[1] === 'null' ? null : Number(v[1]);
  };
  const str = (k) => (new RegExp(`\\b${k}\\s*:\\s*'([^']*)'`).exec(bodyText) ?? [])[1] ?? null;
  gen.set(name.toUpperCase(), {
    name, page: Number(page), metatype: str('metatype') ?? 'human',
    // ⚠ These defaults MUST match `baseActor`'s own, or an omitted attribute reads as a
    // mismatch. That is how the Metroplex Guardsman stub hid: every value was the default.
    body: num('body') ?? 3, quickness: num('quickness') ?? 3, strength: num('strength') ?? 3,
    intelligence: num('intelligence') ?? 3, willpower: num('willpower') ?? 3,
    charisma: num('charisma') ?? 3, essence: num('essence') ?? 6, magic: num('magic') ?? 0,
    pr: num('pr'), karma: num('karma'),
  });
}

/* ── Compare ───────────────────────────────────────────────────────────────────────────── */

const ATTRS = ['body', 'quickness', 'strength', 'intelligence', 'willpower', 'charisma'];
const IDX   = { body: 0, quickness: 1, strength: 2, intelligence: 3, willpower: 4, charisma: 5 };

let clean = 0;
const problems = [], unmatched = [];

/* ── The systematic finding ──────────────────────────────────────────────────────────────
 *
 * ⚠ **The generator did not make 50 separate typos. It read one column heading wrong.**
 *
 * The book prints `B Q S I W C`. SR3's own character sheet orders attributes
 * `B Q S C I W` — physical, then Charisma first among the mental three. Whoever entered this
 * data used the sheet's order against the book's row, so the book's Intelligence landed in
 * `charisma`, its Willpower in `intelligence`, and its Charisma in `willpower`.
 *
 * The tally below is the evidence. Physical attributes, where B Q S is unambiguous, almost
 * always agree; the three mental ones almost never do — and 38 of 60 records match ONLY under
 * this rotation.
 */
const rotation = { only: [], both: [], exactOnly: [], neither: [] };

for (const b of book) {
  const g = b.name ? gen.get(b.name.toUpperCase()) : null;
  if (!g) { unmatched.push(`${b.name ?? '(name not found)'}  (book line ${b.line})`); continue; }

  // Which reading of the three mental columns does this record support?
  const isExact = g.intelligence === b.intelligence && g.willpower === b.willpower
                  && g.charisma === b.charisma;
  const isRot   = g.charisma === b.intelligence && g.intelligence === b.willpower
                  && g.willpower === b.charisma;
  const bucket  = (isExact && isRot) ? 'both' : isExact ? 'exactOnly' : isRot ? 'only' : 'neither';

  /* ⚠ **What the rotation actually breaks is DERIVED**, which is why it is worth quantifying
   * rather than just counting. Intelligence feeds Reaction and the Combat Pool; Willpower feeds
   * the Combat Pool and every Drain and resistance test; both feed the Spell Pool. A wrong
   * Charisma is "only" wrong on social tests — but several of these contacts (Talent Scout,
   * High Stakes Negotiator, Simsense Star) are defined by their Charisma and nothing else. */
  const d = (q, i, w, m) => ({
    rea: Math.floor((q + i) / 2),
    cp:  Math.floor((q + i + w) / 2),
    sp:  b.awakened ? Math.floor((i + w + (m ?? 0)) / 3) : null,
  });
  const dB = d(b.quickness, b.intelligence, b.willpower, b.magic);
  const dG = d(g.quickness, g.intelligence, g.willpower, g.magic);

  rotation[bucket].push(bucket === 'only'
    ? { name: g.name, page: g.page,
        book: `${b.intelligence} ${b.willpower} ${b.charisma}`,
        gen:  `${g.intelligence} ${g.willpower} ${g.charisma}`,
        rea: dB.rea !== dG.rea ? `${dG.rea}->${dB.rea}` : '',
        cp:  dB.cp  !== dG.cp  ? `${dG.cp}->${dB.cp}`   : '',
        sp:  dB.sp !== null && dB.sp !== dG.sp ? `${dG.sp}->${dB.sp}` : '' }
    : `${g.name} (p.${g.page})`
      + (bucket === 'neither'
          ? ` — book I${b.intelligence} W${b.willpower} C${b.charisma}`
            + ` | generator I${g.intelligence} W${g.willpower} C${g.charisma}`
          : ''));

  const bad = [];
  if (g.metatype !== b.metatype) bad.push(`metatype: generator ${g.metatype}, book ${b.metatype}`);

  for (const a of ATTRS) {
    if (g[a] === b[a]) continue;
    // ⚠ A parenthetical resolves either way — report which reading would agree.
    const nat = b.natural[IDX[a]];
    bad.push(g[a] === nat
      ? `${a}: generator ${g[a]}, book ${b[a]} — matches the NATURAL value ${nat}, `
        + 'so this is the parenthetical convention, not an error'
      : `${a}: generator ${g[a]}, book ${b[a]}`);
  }
  if (g.essence !== b.essence) bad.push(`essence: generator ${g.essence}, book ${b.essence}`);
  if (g.pr !== b.pr)           bad.push(`PR: generator ${g.pr ?? '(none)'}, book ${b.pr}`);
  if (g.karma !== b.karma)     bad.push(`Karma Pool: generator ${g.karma ?? '(none)'}, book ${b.karma ?? '(none)'}`);
  if (b.awakened && !g.magic)  bad.push('the book marks this contact AWAKENED (an M column) but the generator sets no Magic');

  /* ── Independent corroboration ────────────────────────────────────────────────────────
   *
   * ⚠ **The book PRINTS Reaction, and SR3 derives it: `floor((Quickness + Intelligence) / 2)`.**
   * So Intelligence can be checked without trusting either transcription. Reaction may be
   * RAISED by wired or boosted reflexes, so the test is `printed >= derived` — a derived value
   * ABOVE the printed one is impossible, and convicts that reading.
   *
   * ⚠ **This exists because the first run reported 52 of 61 records differing**, which is far
   * more likely to mean the auditor is misaligned than that the data is wrong. It is not:
   * 58 of 61 book rows satisfy the check under the header's literal `B Q S I W C` order and
   * only 53 under SR3's character-sheet order `B Q S C I W`. Rather than rest on that
   * aggregate, every difference below carries its own verdict.
   */
  if (g.intelligence !== b.intelligence && Number.isFinite(b.reaction)) {
    const dBook = Math.floor((b.quickness + b.intelligence) / 2);
    const dGen  = Math.floor((g.quickness + g.intelligence) / 2);
    const okBook = b.reaction >= dBook, okGen = b.reaction >= dGen;
    if (okBook && !okGen) {
      bad.push(`  -> the BOOK is right: printed Reaction ${b.reaction} is impossible from the `
        + `generator's Intelligence (would need >= ${dGen})`);
    } else if (okGen && !okBook) {
      bad.push(`  -> the GENERATOR is right: printed Reaction ${b.reaction} is impossible from `
        + `the book reading (would need >= ${dBook})`);
    } else {
      bad.push(`  -> Reaction cannot decide (printed ${b.reaction}; book implies >= ${dBook}, `
        + `generator >= ${dGen})`);
    }
  }

  if (bad.length) problems.push({ name: g.name, page: g.page, bad });
  else { clean++; if (SHOW_OK) console.log(`  ok  ${g.name} (p.${g.page})`); }
}

console.log('\n── Mental-attribute column order ─────────────────────────────────────────────');
console.log('The book prints `B Q S I W C`. SR3\'s character sheet orders them `B Q S C I W`.');
console.log('If the entry was made against the sheet\'s order, the book\'s I/W/C values land in');
console.log('charisma/intelligence/willpower — a rotation, not a scatter of typos.\n');
console.log(`  match ONLY under the rotation:            ${rotation.only.length}`);
console.log(`  match exactly (book order):               ${rotation.exactOnly.length}`);
console.log(`  all three equal, so undecidable:          ${rotation.both.length}`);
console.log(`  match neither — look at these by hand:    ${rotation.neither.length}`);
if (rotation.only.length) {
  console.log(`\nThe ${rotation.only.length} that match ONLY under the rotation. `
    + 'REA/CP/SP show what the derived value currently IS -> what it SHOULD be:\n');
  const H = 'Contact'.padEnd(34) + 'pg'.padStart(4) + '   '
          + 'book I W C'.padEnd(12) + 'gen I W C'.padEnd(12)
          + 'REA'.padStart(9) + 'CP'.padStart(8) + 'SP'.padStart(7);
  console.log(H);
  console.log('-'.repeat(H.length));
  for (const r of rotation.only) {
    console.log(r.name.padEnd(34) + String(r.page).padStart(4) + '   '
      + r.book.padEnd(12) + r.gen.padEnd(12)
      + (r.rea || '=').padStart(9) + (r.cp || '=').padStart(8) + (r.sp || '').padStart(7));
  }
  const n = (k) => rotation.only.filter(r => r[k]).length;
  console.log(`\n  Reaction    wrong on ${n('rea')} of ${rotation.only.length}`);
  console.log(`  Combat Pool wrong on ${n('cp')} of ${rotation.only.length}`);
  console.log(`  Spell Pool  wrong on ${n('sp')} of the Awakened among them`);
  console.log('\n  ⚠ A blank REA/CP means the two readings happen to derive the same number —');
  console.log('    the stored Intelligence/Willpower are still wrong, and any test rolling');
  console.log('    them directly (Drain, resistance, social) still uses the wrong value.');
}

if (rotation.neither.length) {
  console.log('\nNeither reading fits — these need a human:');
  rotation.neither.forEach(r => console.log(`  ${r}`));
}

console.log(`\nBook stat blocks parsed: ${book.length}`);
console.log(`Generator entries:       ${gen.size}`);
console.log(`Matching:                ${clean}`);
console.log(`With differences:        ${problems.length}`);

if (unmatched.length) {
  console.log(`\n⚠ Book blocks with no generator entry (${unmatched.length}) — a heading the `
    + 'name-finder could not read, or a genuinely missing contact:');
  unmatched.forEach(u => console.log(`  ${u}`));
}

if (problems.length) {
  /* Tally the verdicts, so the headline is not merely a count of differences. */
  const verdict = { book: 0, generator: 0, undecided: 0 };
  for (const pr of problems) for (const line of pr.bad) {
    if (line.includes('the BOOK is right')) verdict.book++;
    else if (line.includes('the GENERATOR is right')) verdict.generator++;
    else if (line.includes('cannot decide')) verdict.undecided++;
  }
  if (verdict.book || verdict.generator || verdict.undecided) {
    console.log("\nIntelligence disagreements, judged against the book's printed Reaction:");
    console.log(`  book is right:       ${verdict.book}`);
    console.log(`  generator is right:  ${verdict.generator}`);
    console.log(`  undecidable:         ${verdict.undecided}`);
  }
  console.log('\n── Differences ──────────────────────────────────────────────────────────────');
  console.log('⚠ NOT all of these are errors. The generator deliberately uses augmented values,');
  console.log('  consolidates cyberware to hit the printed Essence, and leaves Reaction to the');
  console.log('  system except where the book names a known booster. Read each one.\n');
  for (const p of problems) {
    console.log(`${p.name} (p.${p.page})`);
    p.bad.forEach(b => console.log(`    ${b}`));
  }
}
process.exit(problems.length ? 1 : 0);
