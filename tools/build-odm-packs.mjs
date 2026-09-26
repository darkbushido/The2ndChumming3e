/**
 * Build the Orthodox (core SR3, Chapter 8) Matrix packs from `rawdata/ODM-*.json`.
 *
 *   node tools/build-odm-packs.mjs              # write this checkout's packs/
 *   node tools/build-odm-packs.mjs --install    # write the Foundry install's packs/ (Foundry CLOSED)
 *   node tools/build-odm-packs.mjs --dry        # report, write nothing
 *
 * ⚠ **Why this exists.** `sr3e-odm-cyberdecks` and `sr3e-odm-programs` were dropped in `f457d3c`
 * because they shipped EMPTY — the populate macros were never run — and the Orthodox deck and
 * program pickers have had nothing to list since. This rebuilds them from the rawdata with a
 * committed tool, like every other pack source (TODO 12), instead of an in-Foundry macro.
 *
 * ⚠ **Core book only, verified against the PDF.** The rawdata mixes sources: 8 of its 18 decks are
 * core (`sr3.304`), 4 are Cyberpunk 2020 conversions (`cp`, fan content — archived by policy), 1 is
 * `cd.130` (no such book code) and 5 are the Matrix sourcebook's "maxed-out" examples (`mat.???`, a
 * book deliberately not registered). Of 54 programs, 22 are the core utilities (pp.220-222), 23 are
 * the Matrix sourcebook's and 4 (the Erosion variants) are in neither PDF. Only the core rows ship;
 * the rest stay in rawdata for whoever registers those books. `CORE_DECKS` / `CORE_PROGRAMS` below
 * are the book's own numbers (stats p.207, availability and cost p.304; multipliers pp.220-222), and
 * the tool REFUSES to write if the rawdata disagrees with them.
 *
 * ⚠ **The packs carry `matrixRuleset: 'orthodox'`** — `SR3ESourceBooks.rulesetAllows` hides them
 * unless the world plays the Orthodox Matrix (the maintainer, 2026-09-14).
 *
 * ⚠ **Book and page (TODO 117)** — `bookPage`, which both item models declare since the book-pages
 * merge: a deck cites its stats and its price (`sr3.207,sr3.304`), a utility its own page. The item
 * sheet shows it as "SR3 p.207 · SR3 p.304".
 *
 * ⚠ **Refreshes `packs-src/` itself** after writing the repo (TODO 12: the JSON source is the truth);
 *   `--install` writes only the install.
 *
 * ⚠ **Ids are DERIVED** (`idFor`), so a re-run rewrites the same keys, and keys the build no longer
 * produces are deleted — the database never accumulates orphans.
 */
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ClassicLevel } from 'classic-level';
import { extractPack } from './lib/pack-source.mjs';
import { itemIcon } from '../scripts/data/item-icons.mjs';

const ROOT    = join(dirname(fileURLToPath(import.meta.url)), '..');
const INSTALL = process.env.SR3E_INSTALL
  ?? join(process.env.LOCALAPPDATA ?? '', 'FoundryVTT', 'Data', 'systems', 'The2ndChumming3e');

export const DECK_PACK    = 'sr3e-sr3-odm-cyberdecks';
export const PROGRAM_PACK = 'sr3e-sr3-odm-programs';
const DECK_IMG    = itemIcon({ type: 'cyberdeck' });   // the friendly Matrix icons (scripts/data/item-icons.mjs)

/** Stock Cyberdeck Types — SR3 p.207 (stats) and p.304 (availability, cost). */
export const CORE_DECKS = {
  'Allegiance Sigma':     { mpcp: 3,  hardening: 1, memory: 200,  storage: 500,  io: 100, response: 0, cost: 14000,   avail: '4/7days' },
  'Sony CTY-360-D':       { mpcp: 5,  hardening: 3, memory: 300,  storage: 600,  io: 200, response: 1, cost: 70000,   avail: '4/7days' },
  'Novatech Hyperdeck-6': { mpcp: 6,  hardening: 4, memory: 500,  storage: 1000, io: 240, response: 1, cost: 125000,  avail: '4/7days' },
  'CMT Avatar':           { mpcp: 7,  hardening: 4, memory: 700,  storage: 1400, io: 300, response: 1, cost: 250000,  avail: '6/7days' },
  'Renraku Kraftwerk-8':  { mpcp: 8,  hardening: 4, memory: 1000, storage: 2000, io: 360, response: 2, cost: 400000,  avail: '10/7days' },
  'Transys Highlander':   { mpcp: 9,  hardening: 4, memory: 1500, storage: 2500, io: 400, response: 2, cost: 600000,  avail: '14/7days' },
  'Novatech Slimcase-10': { mpcp: 10, hardening: 5, memory: 2000, storage: 2500, io: 480, response: 2, cost: 960000,  avail: '18/7days' },
  'Fairlight Excalibur':  { mpcp: 12, hardening: 6, memory: 3000, storage: 5000, io: 600, response: 3, cost: 1500000, avail: '22/7days' },
};

/** The core utilities — SR3 pp.220-222, each with its printed "Multiplier". */
export const CORE_PROGRAMS = {
  'Analyze':      { mult: 3,  cat: 'utility', page: 220 },
  'Browse':       { mult: 1,  cat: 'utility', page: 220 },
  'Commlink':     { mult: 1,  cat: 'utility', page: 220 },
  'Deception':    { mult: 2,  cat: 'utility', page: 220 },
  'Decrypt':      { mult: 1,  cat: 'utility', page: 220 },
  'Read/Write':   { mult: 2,  cat: 'utility', page: 220 },
  'Relocate':     { mult: 2,  cat: 'utility', page: 220 },
  'Scanner':      { mult: 3,  cat: 'utility', page: 220 },
  'Spoof':        { mult: 3,  cat: 'utility', page: 220 },
  'Sleaze':       { mult: 3,  cat: 'utility', page: 221 },
  'Track':        { mult: 8,  cat: 'utility', page: 221 },
  'Attack-L':     { mult: 2,  cat: 'attack',  page: 221, label: 'Attack (Light)' },
  'Attack-M':     { mult: 3,  cat: 'attack',  page: 221, label: 'Attack (Moderate)' },
  'Attack-S':     { mult: 4,  cat: 'attack',  page: 221, label: 'Attack (Serious)' },
  'Attack-D':     { mult: 5,  cat: 'attack',  page: 221, label: 'Attack (Deadly)' },
  'Black Hammer': { mult: 20, cat: 'attack',  page: 221 },
  'Killjoy':      { mult: 10, cat: 'attack',  page: 221 },
  'Slow':         { mult: 4,  cat: 'attack',  page: 222 },
  'Armor':        { mult: 3,  cat: 'defense', page: 222 },
  'Cloak':        { mult: 3,  cat: 'defense', page: 222 },
  'Lock-On':      { mult: 3,  cat: 'defense', page: 222 },
  'Medic':        { mult: 4,  cat: 'defense', page: 222 },
};

const CAT_LABEL = { utility: 'Operational utility', attack: 'Offensive utility', defense: 'Defensive utility' };

/** A stable 16-hex id from a string — same scheme as `tools/patch-johnson-stats.mjs`. */
export function idFor(text) {
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    h1 = Math.imul(h1 ^ text.charCodeAt(i), 16777619) >>> 0;
    h2 = Math.imul(h2 + text.charCodeAt(i), 2246822519) >>> 0;
  }
  return (h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')).slice(0, 16);
}

const int = v => parseInt(v) || 0;

/** The core decks as documents, checked row by row against the book. Throws on any disagreement. */
export function deckDocs(raw) {
  const rows = raw.filter(r => String(r.BookPage ?? '').startsWith('sr3.'));
  const names = rows.map(r => r.Name).sort();
  const want  = Object.keys(CORE_DECKS).sort();
  if (JSON.stringify(names) !== JSON.stringify(want)) {
    throw new Error(`core deck rows differ from the book: rawdata has [${names}], SR3 p.207 has [${want}]`);
  }
  return rows.map(r => {
    const b = CORE_DECKS[r.Name];
    const got = { mpcp: int(r.Persona), hardening: int(r.Hardening), memory: int(r.Memory), storage: int(r.Storage),
      io: int(r['I/O Speed']), response: int(r['Response Increase']), cost: int(r.Cost), avail: String(r.Availability) };
    for (const k of Object.keys(b)) {
      if (got[k] !== b[k]) throw new Error(`${r.Name}: rawdata ${k} ${got[k]} ≠ the book's ${b[k]}`);
    }
    return {
      _id: idFor(`odm-deck:${r.Name}`), name: r.Name, type: 'cyberdeck', img: DECK_IMG,
      system: {
        cost: b.cost, availability: b.avail, streetIndex: int(r['Street Index']), bookPage: 'sr3.207,sr3.304',
        notes: `<p>Stock cyberdeck — SR3 p.207 (stats), p.304 (availability, cost). MPCP ${b.mpcp}, Hardening ${b.hardening}, `
             + `Active Memory ${b.memory} Mp, Storage ${b.storage} Mp, I/O ${b.io} Mp/turn, Response Increase ${b.response}.</p>`
             + `<p>Orthodox Matrix: load it from the Matrix tab's cyberdeck picker.</p>`,
        modules: [{ _odmType: 'orthodox', hardening: b.hardening, storageMemory: b.storage, responseIncrease: b.response }],
        attributes: {
          mpcp:             { base: b.mpcp, value: b.mpcp },
          memory:           { total: b.memory, used: 0, unit: 'Mp' },
          dataTransferRate: { value: b.io, unit: 'Mp per Combat Turn' },
        },
      },
      effects: [],
    };
  });
}

/** The core utilities as documents, checked against the book. Throws on any disagreement. */
export function programDocs(raw) {
  const byName = new Map(raw.map(r => [r.Name, r]));
  return Object.entries(CORE_PROGRAMS).map(([name, b]) => {
    const r = byName.get(name);
    if (!r) throw new Error(`rawdata has no program "${name}" (SR3 p.${b.page})`);
    if (int(r.Multiplyer) !== b.mult) throw new Error(`${name}: rawdata multiplier ${r.Multiplyer} ≠ the book's ${b.mult}`);
    const label = b.label ?? name;
    return {
      _id: idFor(`odm-program:${name}`), name: label, type: 'program', img: itemIcon({ type: 'program', name: label }),
      system: {
        name: label, category: b.cat, multiplier: b.mult, rating: 0, bookPage: `sr3.${b.page}`,
        description: `<p><strong>${CAT_LABEL[b.cat]}</strong> · Multiplier ${b.mult} — size in Mp = Rating² × ${b.mult} `
                   + `(Program Size Table). See SR3 p.${b.page} for what it does.</p>`,
      },
      effects: [],
    };
  });
}

/** Write one pack: put every document, delete any `!items!` key the build no longer produces. */
async function writePack(dir, docs) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const db = new ClassicLevel(dir, { valueEncoding: 'json' });
  try { await db.open(); }
  catch (err) { throw new Error(`cannot open ${dir} — close Foundry first (${err.code ?? err.message})`); }
  const want = new Set(docs.map(d => `!items!${d._id}`));
  const stale = [];
  for await (const key of db.keys()) if (key.startsWith('!items!') && !want.has(key)) stale.push(key);
  for (const key of stale) await db.del(key);
  for (const d of docs) await db.put(`!items!${d._id}`, d);
  await db.close();
  return { written: docs.length, removed: stale.length };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const dry     = process.argv.includes('--dry');
  const install = process.argv.includes('--install');
  const base    = install ? join(INSTALL, 'packs') : join(ROOT, 'packs');
  const decks    = deckDocs(JSON.parse(readFileSync(join(ROOT, 'rawdata/ODM-Cyberdeck.json'), 'utf8')));
  const programs = programDocs(JSON.parse(readFileSync(join(ROOT, 'rawdata/ODM-Programs.json'), 'utf8')));
  console.log(`${decks.length} core decks, ${programs.length} core programs — all match the book.`);
  if (dry) process.exit(0);
  for (const [pack, docs] of [[DECK_PACK, decks], [PROGRAM_PACK, programs]]) {
    const r = await writePack(join(base, pack), docs);
    console.log(`${install ? 'install' : 'repo'} ${pack}: ${r.written} written, ${r.removed} stale removed`);
    if (!install) await extractPack(ROOT, pack);
  }
}
