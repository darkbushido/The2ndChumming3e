/**
 * Regenerate the 62 contacts' skill lists from the book · TODO 88 / 89
 *
 * `audit-johnson-skills.mjs` found **49 of 62 contacts wrong, 130 differences across six
 * distinct kinds** — whole lists on the wrong contact, two skills merged into one, sibling
 * skills read as specialisations, specialisations dropped or attached to the wrong skill, wrong
 * ratings, and 55 skills simply absent. Correcting 130 differences by hand across six error
 * classes is more work and less reliable than re-extracting from a source that has proved
 * machine-readable at every level.
 *
 * So this REPLACES every `skill(...)` call in the generator with what the book prints.
 *
 * ⚠ **It touches ONLY `skill(...)` calls.** `gear`, `armor`, `cyberware`, `bioware`, `spell`,
 * `ammo` and `adeptpower` entries are left exactly where they are — those are TODO 86's problem
 * and a different extraction. A contact's item list keeps its non-skill entries in order.
 *
 * ⚠ **The book does not give a LINKED ATTRIBUTE**, which `skill()` needs. It is resolved from
 * `SR3ESkills` by name, then from whatever the generator already used for that name, then a
 * tier default. Anything that falls all the way through is REPORTED — a silently guessed
 * attribute would change which pool a skill rolls.
 *
 * ⚠ **Specialisations are written as the book's printed text** (`'Decking 8, Hardware 9'`),
 * because `skill()` parses that into `{name, level}` with `level = printed − base`. Writing
 * pre-parsed levels here would put the same rule in two places.
 *
 *   node tools/regen-johnson-skills.mjs --check    # report, write nothing
 *   node tools/regen-johnson-skills.mjs            # rewrite the generator
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseGenerator } from './lib/johnson-generator.mjs';

const HERE  = dirname(fileURLToPath(import.meta.url));
const CHECK = process.argv.includes('--check');
const PDF_DIR = process.env.SR3E_PDF_DIR
  ?? join(process.env.USERPROFILE ?? '', 'Documents', 'Shadowrun 3rd Edition PDFs');
const PDF = join(PDF_DIR, "Shadowrun 3e - Mr. Johnson's Little Black Book {FPR25003 }.pdf");
if (!existsSync(PDF)) { console.error(`ERROR: no PDF at\n  ${PDF}`); process.exit(1); }

const lines = execFileSync('pdftotext', ['-raw', '-f', '37', '-l', '68', PDF, '-'],
  { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).split(/\r?\n/);

/* ⚠ **A bare `Skills:` is a section header whose first word the layout DROPPED.**
 * Joygirl (p.51) renders as "…Unarmed Combat 2" / "Skills: Bunraku Parlors 3, …" —
 * the word "Knowledge" is not in the extracted text at all. Without this the whole
 * knowledge list merges into the active one and produces a skill named
 * "Unarmed Combat 2 Skills: Bunraku Parlors". No real skill is called "Skills". */
const ORPHAN_HEAD = /^Skills:/i;
const STOP = /^(Knowledge Skills|Language Skills|Active Skills|Cyberware|Bioware|Gear|Spells|Powers|Metatype|INIT|Dice Pools|Notes|Hook|Interaction|Commentary|Vehicle)/i;
const defoot = (t) => t.replace(/\s*\d{1,3}\s+Mr\.?\s*Johnson'?s Little Black Book\s*/gi, ' ');

/** Split on commas OUTSIDE both () and []. */
function splitTop(text) {
  const out = []; let depth = 0, cur = '';
  for (const ch of text) {
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map(x => x.trim()).filter(Boolean);
}

/** `Etiquette 3 (Police 5, Street 4)` → `{ name, rating, spec }`, spec as printed. */
function parseEntry(text) {
  const m = /^(.*?)\s+(\d+)\s*(?:\(([^()]*(?:\([^()]*\)[^()]*)*)\))?\s*$/.exec(text.trim());
  if (!m) return null;
  return { name: m[1].trim(), rating: Number(m[2]), spec: (m[3] ?? '').trim() };
}

/* ── What the book gives each contact ──────────────────────────────────────────────────── */

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
    /* ⚠ **A COLUMN BREAK CAN SPLIT THE NEXT SECTION'S HEADER.** Joygirl (p.51) reads
     * "…Unarmed Combat 2 Knowledge" / "Skills: Bunraku Parlors 3, …" — the word "Knowledge"
     * ends one line and "Skills:" begins the next, so neither half matches a `^Knowledge
     * Skills` test and the whole knowledge list merges into the active one. It produced a
     * skill literally named "Unarmed Combat 2 Skills: Bunraku Parlors". */
    if (/\b(Knowledge|Language|Active)\s*$/.test(text)
        && /^Skills:/i.test(lines[j].trim())) {
      text = text.replace(/\b(Knowledge|Language|Active)\s*$/, '');
      break;
    }
    text += ' ' + lines[j];
  }
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
  book.set(name.toUpperCase(), (book.get(name.toUpperCase()) ?? []).concat(list));
}

/* ── Linked attributes ─────────────────────────────────────────────────────────────────── */

const { SR3E } = await import(
  `file://${join(HERE, '..', 'scripts', 'config.js').replace(/\\/g, '/')}`);

const ACTIVE_CATS = new Set(['Combat skills', 'Physical skills', 'Social skills',
  'Technical skills', 'Vehicle skills', 'Magical skills', 'Build/Repair skills']);

/** name → { active: attr, other: attr } from SR3ESkills. */
const attrByName = new Map();
for (const [cat, list] of Object.entries(SR3E.skills ?? {})) {
  for (const s of list) {
    const k = String(s.name).toLowerCase();
    const slot = ACTIVE_CATS.has(cat) ? 'active' : 'other';
    const e = attrByName.get(k) ?? {};
    e[slot] ??= s.linkedAttribute;
    attrByName.set(k, e);
  }
}

const src = readFileSync(join(HERE, '..', 'scripts', 'macros',
  'populate-mr-johnsons-contacts.js'), 'utf8');
const gen = parseGenerator(src);

/** What the generator already used for a name, anywhere. Its own prior choice beats a guess. */
const attrFromGenerator = new Map();
for (const g of gen.values()) {
  for (const s of g.skills) {
    const k = s.name.toLowerCase();
    if (!attrFromGenerator.has(k)) attrFromGenerator.set(k, s.attr);
  }
}

const unresolved = [];
function linkedAttr(name, tier, contact) {
  const k = name.toLowerCase();
  const bare = k.replace(/\s*b\/r\s*$/, '').trim();
  if (tier === 'language') return 'intelligence';
  const e = attrByName.get(k) ?? attrByName.get(bare);
  if (e) {
    const a = tier === 'active' ? (e.active ?? e.other) : (e.other ?? e.active);
    if (a) return a;
  }
  if (attrFromGenerator.has(k)) return attrFromGenerator.get(k);
  /* ⚠ Reported, never silently defaulted — the linked attribute decides which pool a skill
   * rolls, so a wrong guess is a rules error rather than cosmetic. Knowledge skills are
   * Intelligence by the generator's own convention, which is safe; an unresolved ACTIVE skill
   * is not. */
  if (tier !== 'active') return 'intelligence';
  unresolved.push(`${contact}: ${name} (active) — no linked attribute found, used quickness`);
  return 'quickness';
}

/* ── Rewrite ───────────────────────────────────────────────────────────────────────────── */

const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

const edits = [];
let changed = 0, missing = [];

for (const g of [...gen.values()].sort((a, z) => a._start - z._start)) {
  /* ⚠ **The pack's name and the book's heading differ for two contacts.** The book prints
   * "CORPORATE SECURITY" and "GHOUL"; the generator calls them "Corporate Security Guard" and
   * "Ghoul (Human Ghoul)". A heading that PREFIXES the generator's name is accepted —
   * one-directional and anchored at the start, so "Corp Decker" cannot match a heading that
   * merely contains "Corp". */
  const upper = g.name.toUpperCase();
  let b = book.get(upper);
  if (!b) {
    for (const [heading, list] of book) {
      if (upper.startsWith(heading + ' ') || upper.startsWith(heading + ' (')) { b = list; break; }
    }
  }
  if (!b || !b.length) { missing.push(g.name); continue; }

  const emitted = b.map(e => {
    const attr = linkedAttr(e.name, e.tier, g.name);
    const args = [q(e.name), String(e.rating), q(attr)];
    if (e.tier !== 'active' || e.spec) args.push(q(e.tier));
    if (e.spec) args.push(q(e.spec));
    return `      skill(${args.join(', ')}),`;
  });

  // Locate this contact's block and its skill() lines.
  const next = [...gen.values()].map(x => x._start).filter(x => x > g._start).sort((a, z) => a - z)[0]
    ?? src.length;
  const block = src.slice(g._end, next);
  const blockLines = block.split('\n');
  const skillIdx = blockLines.map((l, i) => /^\s*skill\(/.test(l) ? i : -1).filter(i => i >= 0);
  if (!skillIdx.length) { missing.push(`${g.name} (no skill() calls to replace)`); continue; }

  const first = skillIdx[0], last = skillIdx[skillIdx.length - 1];
  /* ⚠ The skill calls are contiguous in every record. If a non-skill line ever appears between
   * them this would eat it, so the run is checked rather than assumed. */
  /* ⚠ Comment lines inside the run are DROPPED, not treated as a blocker. Four records carry
   * `//` notes explaining a sibling-skill mis-parse that this regeneration supersedes — keeping
   * them would leave the file describing a bug it no longer has. Anything that is neither a
   * comment nor a `skill(` call still aborts the record, because that would be real content. */
  const gap = blockLines.slice(first, last + 1)
    .filter(l => l.trim() && !/^\s*skill\(/.test(l) && !/^\s*(\/\/|\/\*|\*)/.test(l));
  if (gap.length) { missing.push(`${g.name} (non-skill lines inside the skill run — skipped)`); continue; }

  const before = blockLines.slice(0, first).join('\n');
  const after  = blockLines.slice(last + 1).join('\n');
  edits.push({ start: g._end, end: next, text: [before, ...emitted, after].join('\n'), name: g.name,
               was: skillIdx.length, now: emitted.length });
  changed++;
}

edits.sort((a, z) => z.start - a.start);
let out = src;
for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);

edits.slice().reverse().forEach(e =>
  console.log(`  ${e.name.padEnd(34)} ${String(e.was).padStart(3)} → ${e.now} skills`));

if (orphanHeads.length) {
  console.log(`\n⚠ ${orphanHeads.length} section header(s) lost their first word in the PDF `
    + 'and were read as KNOWLEDGE skills:');
  orphanHeads.forEach(o => console.log(`  ${o}`));
}
console.log(`\n${CHECK ? 'Would rewrite' : 'Rewrote'} ${changed} contact(s).`);
if (missing.length) {
  console.log(`\n⚠ NOT rewritten (${missing.length}) — left exactly as they were:`);
  missing.forEach(m => console.log(`  ${m}`));
}
if (unresolved.length) {
  console.log(`\n⚠ Linked attribute could not be resolved (${unresolved.length}) — these rolled `
    + 'back to a default and want checking:');
  unresolved.forEach(u => console.log(`  ${u}`));
}
if (!CHECK) {
  writeFileSync(join(HERE, '..', 'scripts', 'macros', 'populate-mr-johnsons-contacts.js'), out, 'utf8');
  console.log('\n⚠ The PACKS still hold the old skills — patch them separately.');
}
