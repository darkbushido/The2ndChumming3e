/**
 * Audit the 62 Little Black Book contacts' SKILL LISTS against the printed book · TODO 89
 *
 * `audit-johnson-contacts.mjs` checks the stat-block row and the Dice Pools line — **attributes
 * only**. Skills, gear and cyberware were never compared to the book at all, and the first time
 * anyone looked, `Dock Worker` turned out to be carrying **City Services Worker's entire skill
 * list**. That is a different class of error from a wrong value: it is the wrong record. This
 * checks the other 61.
 *
 * ⚠ **REPORTS, NEVER WRITES.** Same discipline as the attribute audit, for the same reason: the
 * generator makes deliberate choices a mismatch cannot be told apart from an error — bracketed
 * placeholder names, `[Vehicle] B/R` style stand-ins, and skills split or merged on purpose.
 *
 *   node tools/audit-johnson-skills.mjs                 # every contact that differs
 *   node tools/audit-johnson-skills.mjs --all           # include the clean ones
 *   node tools/audit-johnson-skills.mjs "Dock Worker"   # just these
 *
 * ── Parsing the book ─────────────────────────────────────────────────────────────────────
 *
 * ⚠ **Commas separate skills, EXCEPT inside brackets.** `Etiquette 3 (Police 5, Street 4)` is
 * one skill with two specialisations, and `[Specialty Skill (Electrical Systems, Sewers,
 * etc.)] 5` is one skill whose NAME contains three. Splitting on every comma shreds both.
 *
 * ⚠ **A page footer can land mid-list** — `39 Mr. Johnson's Little Black Book` appears inline
 * once the columns are serialised, and would otherwise be read as a skill called "39 Mr".
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseGenerator } from './lib/johnson-generator.mjs';

const HERE    = dirname(fileURLToPath(import.meta.url));
const SHOW_OK = process.argv.includes('--all');
const ONLY    = new Set(process.argv.slice(2).filter(a => !a.startsWith('--')));
const PDF_DIR = process.env.SR3E_PDF_DIR
  ?? join(process.env.USERPROFILE ?? '', 'Documents', 'Shadowrun 3rd Edition PDFs');
const PDF = join(PDF_DIR, "Shadowrun 3e - Mr. Johnson's Little Black Book {FPR25003 }.pdf");
if (!existsSync(PDF)) {
  console.error(`ERROR: cannot find the PDF at\n  ${PDF}\nSet SR3E_PDF_DIR to its folder.`);
  process.exit(1);
}

const lines = execFileSync('pdftotext', ['-raw', '-f', '37', '-l', '68', PDF, '-'],
  { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).split(/\r?\n/);

/** Sections that END a skill list. */
/* ⚠ **A bare `Skills:` is a section header whose first word the layout DROPPED.**
 * Joygirl (p.51) renders as "…Unarmed Combat 2" / "Skills: Bunraku Parlors 3, …" —
 * the word "Knowledge" is not in the extracted text at all. Without this the whole
 * knowledge list merges into the active one and produces a skill named
 * "Unarmed Combat 2 Skills: Bunraku Parlors". No real skill is called "Skills". */
const ORPHAN_HEAD = /^Skills:/i;
const STOP = /^(Knowledge Skills|Language Skills|Active Skills|Cyberware|Bioware|Gear|Spells|Powers|Metatype|INIT|Dice Pools|Notes|Hook|Interaction|Commentary|Vehicle)/i;

/** Strip the running page footer, which serialises into the middle of a list. */
const defoot = (t) => t.replace(/\s*\d{1,3}\s+Mr\.?\s*Johnson'?s Little Black Book\s*/gi, ' ');

/** Split on commas that are OUTSIDE both () and []. */
function splitTop(text) {
  const out = [];
  let depth = 0, cur = '';
  for (const ch of text) {
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map(x => x.trim()).filter(Boolean);
}

/** `Etiquette 3 (Police 5, Street 4)` → `{ name, rating, specs: [{name, rating}] }` */
function parseEntry(text) {
  const t = text.trim();
  // The specialisation bracket is the LAST (...) group, and only when what precedes it ends
  // in a rating — otherwise the brackets are part of the name.
  const m = /^(.*?)\s+(\d+)\s*(?:\(([^()]*(?:\([^()]*\)[^()]*)*)\))?\s*$/.exec(t);
  if (!m) return null;
  const specs = (m[3] ? splitTop(m[3]) : []).map(sp => {
    const s = /^(.*?)\s+(\d+)$/.exec(sp.trim());
    return s ? { name: s[1].trim(), rating: Number(s[2]) } : { name: sp.trim(), rating: null };
  });
  return { name: m[1].trim(), rating: Number(m[2]), specs };
}

/** Every skill the book gives a contact, keyed by UPPER-CASE contact name. */
const orphanHeads = [];
const book = new Map();
for (let i = 0; i < lines.length; i++) {
  /* An orphaned `Skills:` both ends the previous section and starts one. It is read as
   * KNOWLEDGE — far and away the commonest of the three — and reported, because the
   * alternative is losing the contact's knowledge skills silently. */
  const orphan = ORPHAN_HEAD.test(lines[i].trim())
    && !/^(Active|Knowledge|Language)/i.test(lines[i].trim());
  const head = orphan
    ? ['', 'Knowledge', lines[i].trim().replace(/^Skills:/i, '')]
    : /^(Active|Knowledge|Language) Skills:(.*)$/i.exec(lines[i].trim());
  if (!head) continue;
  if (orphan) orphanHeads.push(lines[i].trim().slice(0, 48));

  let text = head[2];
  for (let j = i + 1; j < i + 12 && j < lines.length; j++) {
    if (STOP.test(lines[j].trim()) || ORPHAN_HEAD.test(lines[j].trim())) break;
    text += ' ' + lines[j];
  }

  // Whose list is this? The nearest preceding stat-block header identifies the contact.
  let name = null;
  for (let j = i - 1; j > i - 80 && j >= 0; j--) {
    if (!/^B Q S I W C E (M )?R PR$/.test(lines[j].trim())) continue;
    for (let k = j - 2; k > j - 60 && k >= 0; k--) {
      const t = lines[k].trim();
      if (/^[A-Z][A-Z0-9'!., \-/&]{2,}$/.test(t) && /[A-Z]{3}/.test(t)) { name = t; break; }
    }
    break;
  }
  if (!name) continue;

  const tier = head[1].toLowerCase() === 'active' ? 'active'
             : head[1].toLowerCase() === 'language' ? 'language' : 'knowledge';
  const list = splitTop(defoot(text)).map(parseEntry).filter(Boolean).map(e => ({ ...e, tier }));
  const prev = book.get(name.toUpperCase()) ?? [];
  book.set(name.toUpperCase(), prev.concat(list));
}

const gen = parseGenerator(readFileSync(
  join(HERE, '..', 'scripts', 'macros', 'populate-mr-johnsons-contacts.js'), 'utf8'));

/* ── Compare ───────────────────────────────────────────────────────────────────────────── */

/** ⚠ Names are compared loosely: case, punctuation and whitespace are noise here. */
const key = (n) => String(n).toLowerCase().replace(/[^a-z0-9/]+/g, '');

let clean = 0;
const problems = [];

for (const [upper, g] of gen) {
  if (ONLY.size && !ONLY.has(g.name)) continue;
  /* ⚠ The book's heading and the generator's name are not always identical — "CORPORATE
   * SECURITY" vs "Corporate Security Guard", "GHOUL" vs "Ghoul (Human Ghoul)". Anchored,
   * one-directional prefix match, so "Corp Decker" cannot match a heading containing "Corp". */
  let b = book.get(upper);
  if (!b) {
    for (const [heading, list] of book) {
      if (upper.startsWith(heading + ' ') || upper.startsWith(heading + ' (')) { b = list; break; }
    }
  }
  if (!b) { problems.push({ name: g.name, page: g.page, bad: ['no skill list found in the book — check the heading'] }); continue; }

  const bMap = new Map(b.map(e => [key(e.name), e]));
  const gMap = new Map(g.skills.map(e => [key(e.name), e]));
  const bad = [];

  for (const [k, be] of bMap) {
    const ge = gMap.get(k);
    if (!ge) { bad.push(`MISSING   ${be.name} ${be.rating}${be.specs.length ? ` (${be.specs.map(s => `${s.name} ${s.rating}`).join(', ')})` : ''}`); continue; }
    if (ge.rating !== be.rating) bad.push(`RATING    ${be.name}: generator ${ge.rating}, book ${be.rating}`);
    const gs = (ge.spec || '').trim();
    const bs = be.specs.map(s => `${s.name} ${s.rating}`).join(', ');
    if (key(gs) !== key(bs)) {
      bad.push(`SPEC      ${be.name}: generator "${gs || '—'}", book "${bs || '—'}"`);
    }
  }
  for (const [k, ge] of gMap) {
    if (!bMap.has(k)) bad.push(`EXTRA     ${ge.name} ${ge.rating} — not in the book's list`);
  }

  if (bad.length) problems.push({ name: g.name, page: g.page, bad });
  else { clean++; if (SHOW_OK) console.log(`  ok  ${g.name} (p.${g.page})`); }
}

console.log(`\nContacts compared: ${clean + problems.length}`);
console.log(`  clean:            ${clean}`);
console.log(`  with differences: ${problems.length}`);

if (problems.length) {
  console.log('\n⚠ NOT all of these are errors. The generator uses bracketed placeholder names');
  console.log('  ("[Vehicle] B/R", "[Relevant Specialty]") where the book does the same, and a');
  console.log('  loose name match can still miss a legitimate rewording. Read each one.\n');
  const order = { MISSING: 0, EXTRA: 1, RATING: 2, SPEC: 3 };
  for (const p of problems) {
    console.log(`${p.name} (p.${p.page})  — ${p.bad.length} difference(s)`);
    p.bad.slice().sort((a, z) => (order[a.split(' ')[0]] ?? 9) - (order[z.split(' ')[0]] ?? 9))
      .forEach(x => console.log(`    ${x}`));
  }
}
process.exit(problems.length ? 1 : 0);
