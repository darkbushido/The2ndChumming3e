/**
 * Cross-check `SR3ESkills`' specialisation lists against the printed books · TODO 90
 *
 * `SR3ESkills` ships **345 specialisations across 99 skills**, and it lives in one of the three
 * SYSTEM packs — content every table gets, that no source-book toggle can hide. It came from
 * the upstream Shadowrun Character Generator's data, and **nothing has ever compared it to a
 * printed page.** Two audits of similarly-sourced data on 2026-09-01 (TODO 84, TODO 89) found
 * defect rates of 85% and 79%, so "it came from the generator" is not evidence of correctness.
 *
 * Five books give skills a `Specializations:` line — Core Rules (45), Cannon Companion (15),
 * Magic in the Shadows (5), Rigger 3 (4) and Man & Machine (1).
 *
 * ⚠ **REPORTS, NEVER WRITES.**
 *
 * ⚠ **A book entry reads one of two ways**, and conflating them produces nonsense:
 *   - **enumerated** — `Specializations: Alertness, Hiding, Sneaking, Theft`
 *   - **open-ended** — `Specializations: By specific weapon type.`, which `SR3ESkills` encodes
 *     with a trailing `->` (`weapon->`, `implant->`). An open-ended skill having "extra"
 *     specialisations is not a defect; it is the point.
 *
 * ⚠ **A book listing MORE than we ship is the finding that matters.** An extra on our side may
 * be another book's addition; a missing one is a specialisation a player cannot pick.
 *
 *   node tools/audit-skill-specialisations.mjs
 *   node tools/audit-skill-specialisations.mjs --all     # include matching skills
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE    = dirname(fileURLToPath(import.meta.url));
const SHOW_OK = process.argv.includes('--all');
const PDF_DIR = process.env.SR3E_PDF_DIR
  ?? join(process.env.USERPROFILE ?? '', 'Documents', 'Shadowrun 3rd Edition PDFs');
if (!existsSync(PDF_DIR)) {
  console.error(`ERROR: no PDF folder at\n  ${PDF_DIR}\nSet SR3E_PDF_DIR.`);
  process.exit(1);
}

/* ── The books ─────────────────────────────────────────────────────────────────────────── */

/** `Stealth (Quickness)` — a skill heading. The attribute in brackets is what marks it. */
const HEADING = /^([A-Z][A-Za-z0-9 /'\-&.]{1,40})\s*\(([A-Za-z /]+)\)\s*$/;
/** Lines that end a wrapped `Specializations:` block. */
const STOP = /^(Default:|Specializations?:|[A-Z][A-Za-z0-9 /'\-&.]{1,40}\s*\([A-Za-z /]+\)\s*$)/;

const book = new Map();   // lower-case skill name -> { name, specs[], open, source }

for (const file of readdirSync(PDF_DIR).filter(f => f.toLowerCase().endsWith('.pdf'))) {
  let text;
  try {
    text = execFileSync('pdftotext', ['-raw', join(PDF_DIR, file), '-'],
      { encoding: 'utf8', maxBuffer: 96 * 1024 * 1024 });
  } catch { continue; }
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const m = /^Specializations?:\s*(.*)$/.exec(lines[i].trim());
    if (!m) continue;

    // Gather the wrapped continuation.
    let body = m[1];
    for (let j = i + 1; j < i + 4 && j < lines.length; j++) {
      const t = lines[j].trim();
      if (!t || STOP.test(t)) break;
      body += ' ' + t;
    }

    // Whose entry is this? The nearest `Name (Attribute)` heading above.
    let name = null;
    for (let j = i - 1; j > i - 25 && j >= 0; j--) {
      const h = HEADING.exec(lines[j].trim());
      if (h) { name = h[1].trim(); break; }
    }
    if (!name) continue;

    /* ⚠ Open-ended entries are prose, not a list — "By specific weapon type", "Etiquette is a
     * wide-open skill. Characters…". Detected on the leading words rather than by trying to
     * parse the sentence into items, which would invent specialisations out of English. */
    const open = /^(by\b|characters can\b|.*\bis a wide-open skill\b)/i.test(body.trim())
      // ⚠ A trailing "or by specific sport" makes an entry BOTH enumerated and open-ended:
      // Athletics names six and then invites more.
      || /\bor by specific\b/i.test(body);
    /* ⚠ **"Specializations: None" means NONE.** Eight entries say exactly that, and reading it
     * as a specialisation called "None" reported eight skills as missing one. */
    const none = /^none\.?$/i.test(body.trim());
    const specs = (open && /^(by\b|characters can\b)/i.test(body.trim())) || none ? [] : body
      .replace(/\.$/, '')
      .replace(/\s+or by specific\s+\w+\s*$/i, '')
      .split(/,| or (?=[A-Z])/)
      .map(x => x.trim())
      /* ⚠ An ALL-CAPS section heading can serialise onto the end of the line —
       * "Cybertechnology VEHICLE SKILLS". Trim at the first run of capitals that looks like a
       * heading rather than storing it as part of a specialisation's name. */
      .map(x => x.replace(/\s+[A-Z]{2,}(\s+[A-Z]{2,})*\s*$/, '').trim())
      .filter(x => x && !/^by specific/i.test(x) && x.length < 40);

    const key = name.toLowerCase();
    // First book to define a skill wins; later ones only ADD specialisations.
    if (!book.has(key)) book.set(key, { name, specs: [], open, none: false, source: file });
    const e = book.get(key);
    e.open ||= open;
    e.none ||= none;
    for (const sp of specs) if (!e.specs.some(x => x.toLowerCase() === sp.toLowerCase())) e.specs.push(sp);
  }
}

/* ── What we ship ──────────────────────────────────────────────────────────────────────── */

const { SR3E } = await import(`file://${join(HERE, '..', 'scripts', 'config.js').replace(/\\/g, '/')}`);
/* ⚠ **A SKILL NAME APPEARS IN SEVERAL CATEGORIES, and only one carries the specialisations.**
 * `SR3ESkills` lists `Stealth` under *Physical skills* with all four of the book's
 * specialisations AND under *Background knowledge* with none — the latter correctly, since a
 * knowledge skill about stealth has no specialisation list. Keying by name alone let the empty
 * duplicate overwrite the real entry, and the tool reported all four as missing.
 *
 * The specialisations are UNIONED across every category the name appears in. Preferring one
 * category would need a rule about which, and the union answers the only question being
 * asked: can a player pick this specialisation anywhere? */
const ours = new Map();
for (const [category, list] of Object.entries(SR3E.skills ?? {})) {
  for (const s of list) {
    const key = String(s.name).toLowerCase();
    const prev = ours.get(key) ?? { name: s.name, categories: [], specs: [] };
    prev.categories.push(category);
    for (const sp of (s.specializations ?? [])) {
      if (!prev.specs.some(x => String(x).toLowerCase() === String(sp).toLowerCase())) prev.specs.push(sp);
    }
    ours.set(key, prev);
  }
}

/* ── Compare ───────────────────────────────────────────────────────────────────────────── */

const norm = (x) => String(x).toLowerCase().replace(/->$/, '').replace(/[^a-z0-9]/g, '');

let clean = 0, notOurs = 0;
const problems = [];

for (const [key, b] of [...book].sort((a, z) => a[1].name.localeCompare(z[1].name))) {
  const o = ours.get(key);
  if (!o) { notOurs++; continue; }

  const oSpecs = o.specs.filter(x => !String(x).endsWith('->'));
  const oOpen  = o.specs.some(x => String(x).endsWith('->'));
  const bad = [];

  for (const bs of b.specs) {
    if (!oSpecs.some(x => norm(x) === norm(bs))) bad.push(`MISSING  ${bs}`);
  }
  /* ⚠ Extras are only reported for a CLOSED skill. On an open-ended one the book invites
   * anything, so more of them is correct rather than wrong. */
  if (!b.open && !oOpen) {
    for (const os of oSpecs) {
      if (!b.specs.some(x => norm(x) === norm(os))) bad.push(`EXTRA    ${os}`);
    }
  }
  // ⚠ "Specializations: None" — nothing to offer, so nothing to report.
  if (b.none && !b.specs.length) { clean++; if (SHOW_OK) console.log(`  ok  ${b.name} (book: none)`); continue; }
  if (b.open && !oOpen && oSpecs.length === 0) {
    bad.push(`OPEN     the book says this is open-ended; we offer nothing and no "->" marker`);
  }

  if (bad.length) problems.push({ name: b.name, source: b.source, open: b.open, bad });
  else { clean++; if (SHOW_OK) console.log(`  ok  ${b.name}`); }
}

console.log(`\nSkills with a Specializations line in the books: ${book.size}`);
console.log(`  matched against SR3ESkills:  ${clean + problems.length}`);
console.log(`  not in SR3ESkills at all:    ${notOurs}`);
console.log(`  clean:                       ${clean}`);
console.log(`  with differences:            ${problems.length}`);

if (problems.length) {
  console.log('\n⚠ MISSING means the book lists a specialisation a player cannot pick here.');
  console.log('  EXTRA is only reported for skills the book treats as a CLOSED list.\n');
  for (const p of problems) {
    console.log(`${p.name}${p.open ? '  (book: open-ended)' : ''}  — ${p.source}`);
    p.bad.forEach(x => console.log(`    ${x}`));
  }
}
process.exit(problems.length ? 1 : 0);
