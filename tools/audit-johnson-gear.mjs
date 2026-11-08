#!/usr/bin/env node
/**
 * Audit the 62 Little Black Book contacts' GEAR, CYBERWARE and SPELLS against the printed book · TODO 84
 *
 * `audit-johnson-contacts.mjs` checks the stat block and `audit-johnson-skills.mjs` the skill lists; nothing
 * compared what the contacts CARRY. This reads each contact's `Gear:`, `Cyberware:` and `Spells:` lines
 * (pp.36-67) and the items the shipped pack embeds on that contact (`packs-src/sr3e-mr-johnsons-contacts`),
 * and lists, per contact and section, what the book names that the pack does not carry ("missing") and what
 * the pack carries that the book does not name ("extra").
 *
 * ⚠ **REPORTS, NEVER WRITES.** Matching a book phrase ("goggles with low light and thermographic vision") to a
 *   compendium name ("Goggles, Low-Light") is fuzzy: implants and spells go through the shared aliases
 *   (`tools/lib/johnson-aliases.mjs`), everything else through a shared significant word. A hit in this
 *   report is a thing for a person to read against the page, not an error.
 * ⚠ Reads `packs-src` only (JSON) — never a LevelDB — and the PDF through `pdftotext -raw`.
 *
 *   node tools/audit-johnson-gear.mjs                  # every contact with a difference
 *   node tools/audit-johnson-gear.mjs --all            # include the clean ones
 *   SR3E_PDF_DIR=<folder> node tools/audit-johnson-gear.mjs
 *
 * Exits 1 while any difference is listed.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { resolveImplant, resolveMod, resolveSpell } from './lib/johnson-aliases.mjs';

const HERE    = dirname(fileURLToPath(import.meta.url));
const SHOW_OK = process.argv.includes('--all');
const PDF_DIR = process.env.SR3E_PDF_DIR
  ?? join(process.env.USERPROFILE ?? '', 'Documents', 'Github', 'Shadowrun 3rd Edition PDFs');
const PDF = join(PDF_DIR, "Shadowrun 3e - Mr. Johnson's Little Black Book {FPR25003 }.pdf");

/* ── The book ─────────────────────────────────────────────────────────────────────────── */

const STOP = /^(Knowledge Skills|Language Skills|Active Skills|Skills:|Cyberware|Bioware|Gear\s*:|Spells|Powers|Metatype|INIT|Dice Pools|Notes|Hooks?:|Interaction|Commentary|Vehicle|Contacts)/i;
// `Gear :` (a space before the colon, p.53) and `Cyberware (all Alphaware):` / `Cyberware [alphaware]:` both occur.
const SECTION = /^(Gear|Cyberware|Bioware|Spells)\s*(?:[([][^)\]]*[)\]])?\s*:(.*)$/i;

/** Strip the running page footer, which serialises into the middle of a list. */
const defoot = t => t.replace(/\s*\d{1,3}\s+Mr\.?\s*Johnson'?s Little Black Book\s*/gi, ' ');

/** Split on commas OUTSIDE () and []. */
export function splitTop(text) {
  const out = [];
  let depth = 0, cur = '';
  for (const ch of text) {
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map(x => x.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

/** `Contact name → { gear: [], cyberware: [], spells: [] }` from the raw page text. Pure. */
export function readBook(lines) {
  const book = new Map();
  for (let i = 0; i < lines.length; i++) {
    const head = SECTION.exec(lines[i].trim());
    if (!head) continue;
    let text = head[2];
    for (let j = i + 1; j < i + 12 && j < lines.length; j++) {
      if (STOP.test(lines[j].trim())) break;
      // A hyphen at a line end is the layout's word break ("palm-" / "top computer").
      text = /-$/.test(text.trim()) ? text.trim().slice(0, -1) + lines[j].trim() : `${text} ${lines[j]}`;
    }
    // Whose list? The nearest preceding stat-block header identifies the contact.
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
    const kind = { gear: 'gear', cyberware: 'cyberware', bioware: 'cyberware', spells: 'spells' }[head[1].toLowerCase()];
    const rec = book.get(name.toUpperCase()) ?? { gear: [], cyberware: [], spells: [] };
    rec[kind].push(...splitTop(defoot(text)));
    book.set(name.toUpperCase(), rec);
  }
  return book;
}

/* ── Matching ─────────────────────────────────────────────────────────────────────────── */

const STOPWORDS = new Set(['with', 'and', 'the', 'for', 'various', 'rating', 'standard', 'issue', 'kit', 'set', 'pair',
  'light', 'heavy', 'small', 'large', 'model', 'from', 'type', 'some', 'assorted']);
const words = s => String(s).toLowerCase().replace(/\[[^\]]*\]/g, ' ').match(/[a-z][a-z0-9-]{3,}/g)?.filter(w => !STOPWORDS.has(w)) ?? [];
const norm = s => String(s).toLowerCase().replace(/\s*\(f\d+\)$/, '').replace(/[^a-z0-9]+/g, '');

/** The pack names a book phrase may stand for (aliases first, then itself). Pure. */
export function candidates(phrase, kind) {
  const bare = phrase.replace(/\s*\[[^\]]*\]/g, '').trim();
  if (kind === 'spells') {
    const s = bare.replace(/\s+\d+$/, '').replace(/\s*\(force \d+\)$/i, '');
    return [resolveSpell(s), s].filter(Boolean);
  }
  if (kind === 'cyberware') {
    const m = /^(.*?)\s*\((.*)\)$/.exec(bare);
    const host = m ? m[1] : bare, mods = m ? splitTop(m[2]) : [];
    const ear = /ear/i.test(host);
    return [resolveImplant(host, mods), host, ...mods.map(x => resolveMod(x, ear ? 'ear' : 'eye')), ...mods].filter(Boolean);
  }
  return [bare];
}

/** Does one pack item answer for this book phrase? Exact (aliased) name, else a shared significant word. */
export function matches(phrase, kind, itemName) {
  const c = candidates(phrase, kind);
  if (c.some(x => norm(x) === norm(itemName))) return true;
  if (kind === 'spells') return false;   // spells are named exactly or not at all
  const iw = new Set(words(itemName));
  return c.some(x => words(x).some(w => iw.has(w) || [...iw].some(v => v.startsWith(w.slice(0, 5)) && w.length >= 5)));
}

const KIND_OF = t => (t === 'spell' ? 'spells' : (t === 'cyberware' || t === 'bioware') ? 'cyberware' : t === 'skill' ? null : 'gear');

/** Compare one contact. `items` = `[{ type, name }]`. Pure. */
export function compare(bookRec, items) {
  const out = {};
  for (const kind of ['gear', 'cyberware', 'spells']) {
    const pack = items.filter(i => KIND_OF(i.type) === kind);
    const missing = (bookRec?.[kind] ?? []).filter(p => !pack.some(i => matches(p, kind, i.name)));
    const extra = pack.filter(i => !(bookRec?.[kind] ?? []).some(p => matches(p, kind, i.name))).map(i => i.name);
    // A spell present on both sides must carry the book's Force ("Analyze Truth 4" ↔ "Analyze Truth (F4)").
    const force = [];
    if (kind === 'spells') {
      for (const p of bookRec?.[kind] ?? []) {
        const bf = /\s(\d+)$/.exec(p.trim())?.[1];
        const item = pack.find(i => matches(p, kind, i.name));
        const pf = /\(F(\d+)\)\s*$/.exec(item?.name ?? '')?.[1] ?? item?.force;
        if (item && bf && pf && Number(bf) !== Number(pf)) force.push(`${p} — the pack has ${item.name}`);
      }
    }
    if (missing.length || extra.length || force.length) out[kind] = { missing, extra, force };
  }
  return out;
}

/* ── Run ──────────────────────────────────────────────────────────────────────────────── */

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (!existsSync(PDF)) {
    console.error(`ERROR: cannot find the PDF at\n  ${PDF}\nSet SR3E_PDF_DIR to its folder.`);
    process.exit(1);
  }
  const lines = execFileSync('pdftotext', ['-raw', '-f', '37', '-l', '68', PDF, '-'],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).split(/\r?\n/);
  const book = readBook(lines);

  const dir = join(HERE, '..', 'packs-src', 'sr3e-mr-johnsons-contacts');
  const contacts = [];
  for (const f of readdirSync(dir)) {
    const j = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    if (j.doc?.type !== 'npc' && j.doc?.type !== 'character') continue;
    contacts.push({ name: j.doc.name, items: Object.values(j.embedded ?? {}).flat().map(d => ({ type: d.type, name: d.name, force: d.system?.force })) });
  }
  contacts.sort((a, b) => a.name.localeCompare(b.name));

  let clean = 0, differ = 0, unread = [];
  const report = [];
  for (const c of contacts) {
    const rec = book.get(c.name.toUpperCase());
    if (!rec) { unread.push(c.name); continue; }
    const diff = compare(rec, c.items);
    if (!Object.keys(diff).length) { clean++; if (SHOW_OK) report.push(`${c.name}: clean`); continue; }
    differ++;
    report.push(`\n${c.name}`);
    for (const [kind, d] of Object.entries(diff)) {
      for (const m of d.missing) report.push(`  ${kind.padEnd(9)} missing  ${m}`);
      for (const x of d.extra)   report.push(`  ${kind.padEnd(9)} extra    ${x}`);
      for (const f of d.force ?? []) report.push(`  ${kind.padEnd(9)} force    ${f}`);
    }
  }
  console.log(`Contacts compared: ${contacts.length - unread.length}\n  clean:            ${clean}\n  with differences: ${differ}`);
  if (unread.length) console.log(`  no gear/cyberware/spell lines found in the book for: ${unread.join(', ')}`);
  console.log(report.join('\n'));
  process.exit(differ ? 1 : 0);
}
