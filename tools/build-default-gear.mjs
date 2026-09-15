/**
 * Build the default-on books' non-weapon, non-cyberware gear into per-book packs · TODO 91/92.
 *
 * Requested 2026-09-14: *"audit the non weapon, non cyberware/bioware gear in the shipped packs and
 * make sure everything in the default books are included."* Until this, eight declared item types
 * shipped **no documents at all** (TODO 91) — gear, ammunition and medical among them — so a table
 * could not drag a medkit, a clip of APDS or a bug scanner off a compendium.
 *
 * Reads the VENDORED generator data (`rawdata/SRCG-SR3-Gear.json`, `rawdata/SRCG-SR2-Gear.json` —
 * see `rawdata/SRCG-README.md`) and writes, per default-on book:
 *
 * | Upstream category | Item type | Pack |
 * |---|---|---|
 * | surveillance, vision, electronics, lifestyle extras, chips, credsticks, explosives, magical, accessories, "stuff with ratings" | `gear` | `sr3e-<book>-gear` |
 * | Biotech | `medical` | `sr3e-<book>-medical` |
 * | Ammunition — `N-Rnd Clip (Type)` → one pre-filled clip; `… Rnds` → a box of 10 | `ammunition` | `sr3e-<book>-ammunition` |
 * | Drugs, Chemicals, Toxins | `drug` | the book's drugs pack |
 * | Clothing and Armor | `armor` | the book's armor pack |
 *
 * ⚠ **SR3 books from the SR3 file, SR2 books from the SR2 file.** The SR3 file repeats SR2 rows with
 * `sr2.???` pages; the SR2 file has the real ones.
 * ⚠ **Only what the book does not already ship.** A name the book's pack of that type already holds
 * is skipped — the shipped armor and drugs keep their own data.
 * ⚠ **Out of scope** (the maintainer): weapons, grenades, cyberware, bioware (and nanoware), vehicles
 * and vehicle gear. Counted in the report, never written.
 * ⚠ **Owned documents only.** Everything written carries `flags.The2ndChumming3e.generatedBy`, and a
 * re-run replaces exactly those — ids are derived (`idFor`), so nothing is orphaned or duplicated.
 * ⚠ **Foundry must be CLOSED** for `--install`; run it plain for the repo, then `--install`.
 *
 *   node tools/build-default-gear.mjs --report   # what would be written, per book — writes nothing
 *   node tools/build-default-gear.mjs            # write the repo packs + system.json
 *   node tools/build-default-gear.mjs --install  # write the install's packs + system.json
 */
import { ClassicLevel } from 'classic-level';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { copyPacks } from './lib/pack-copy.mjs';
import { readSourceDir, writeSourceDir, rebuildPack } from './lib/pack-source.mjs';
import { AmmoStock } from '../scripts/data/ammo-stock.mjs';
// The system's own rating reader — the name, then GEAR_RATINGS — so a generated item agrees with
// `itemRating`, migration 0.5.2 and `tools/patch-name-ratings.mjs`, which would otherwise fill it later.
import { knownRating } from '../scripts/data/item-rating.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');
export const GENERATOR = 'build-default-gear';

/** Default-on books per edition — `SOURCE_BOOKS` with `enabled: true` (asserted by a test). */
export const EDITION_BOOKS = {
  SR3: ['sr3', 'cc', 'mm', 'mits', 'r3', 'matrix-defragged'],
  SR2: ['sr2', 'ct', 'ssc', 'st', 'fof', 'pna'],
};
const SOURCES = [
  { edition: 'SR3', file: 'rawdata/SRCG-SR3-Gear.json' },
  { edition: 'SR2', file: 'rawdata/SRCG-SR2-Gear.json' },
];

/** Upstream category → item type. Anything absent is out of scope (weapons, vehicles, …). */
export const CATEGORY_TYPE = {
  'Ammunition': 'ammunition', 'Firearms Accessories': 'gear', 'Clothing and Armor': 'armor',
  'S+S Vision Enhancers': 'gear', 'Surveillance and Security': 'gear', 'SOTA Gear': 'gear',
  'Biotech': 'medical', 'Lifestyle Extras': 'gear', 'Ritual Sorcery Materials': 'gear',
  'Magical Equipment': 'gear', 'Chips': 'gear', 'Stuff With Ratings': 'gear', 'Drugs': 'drug',
  'Chemicals': 'drug', 'Toxins': 'drug', 'Credstick': 'gear', 'Miscellaneous Components': 'gear',
  'Explosives': 'gear',
};
const PACK_SUFFIX = { gear: 'gear', medical: 'medical', ammunition: 'ammunition', drug: 'drugs', armor: 'armor' };
const FOLDER = { gear: 'Gear', medical: 'Medical', ammunition: 'Ammunition', drug: 'Drugs & Toxins', armor: 'Armor' };
const IMG = {
  gear: 'icons/svg/chest.svg', ammunition: 'icons/svg/skull.svg',
  medical: 'systems/The2ndChumming3e/styles/textures/medical-default.webp',
  drug: 'systems/The2ndChumming3e/styles/textures/drugs-default.webp',
  armor: 'systems/The2ndChumming3e/styles/textures/armour-default.webp',
};

/* ── Pure helpers (tested) ────────────────────────────────────────────────────────────────── */

// Upstream spelling slips, each checked against the book's own text (2026-09-14): CC prints
// "Grapple Gun" and "Liquid Breathing Apparatus"; M&M "Hospital", "Witch's Moss" and "Novacoke".
const NAME_FIXES = [[/\bHosptial\b/g, 'Hospital'], [/\bApparartus\b/g, 'Apparatus'], [/\bGrappel\b/g, 'Grapple'], [/\bDiplay\b/g, 'Display'],
  [/\bWitchs Moss\b/g, "Witch's Moss"], [/\bNovocoke\b/g, 'Novacoke']];
/** The generator's "specify" (`->`) and credstick (`>>`) markers off a name, spaces tidied, slips fixed. */
export const cleanName = s => NAME_FIXES.reduce((n, [re, to]) => n.replace(re, to),
  String(s ?? '').replace(/\s*(->|>>)\s*$/, '').replace(/\s+/g, ' ').trim());
export const normName  = s => cleanName(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** The book a `BookPage` names first (`sr2.281,fof.51` → `sr2`); `sta2` is the registry's `sota2`. */
export function bookOf(bookPage) {
  const code = String(bookPage ?? '').split(/[.,]/)[0].trim().toLowerCase();
  return code === 'sta2' ? 'sota2' : code;
}

/** A number out of a table cell: `"1,000"` → 1000, `".85"` → 0.85, `"-"` → 0; `"25-2500"` → 25. */
export function cellNumber(v) {
  const m = /-?\d[\d,]*\.?\d*|\.\d+/.exec(String(v ?? '').replace(/,(?=\d{3})/g, ''));
  return m ? Number(m[0].replace(/,/g, '')) : 0;
}

/** Deterministic 16-character id — a re-run reuses it (see patch-johnson-stats.mjs). */
export function idFor(text) {
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    h1 = Math.imul(h1 ^ text.charCodeAt(i), 16777619) >>> 0;
    h2 = Math.imul(h2 + text.charCodeAt(i), 2246822519) >>> 0;
  }
  return (h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')).slice(0, 16);
}

/**
 * An ammunition type from a loose-round name — the book's OWN names only ("APDS Rnds", "AV Assault
 * Cannon Rnds"); null for anything else. A word match was too loose: "Anti-Personnel Flechette" is
 * a minigrenade and "High Explosive AP" an SR2 round, and neither follows the SR3 rules for its word.
 */
export function ammoTypeFromWords(name) {
  const m = /^(regular|apds|explosive|ex explosive|flechette|gel|tracer|av)\b(?: assault cannon)? (?:rnds|rounds|belt)\b/i.exec(cleanName(name));
  return m ? { regular: 'regular', apds: 'apds', explosive: 'explosive', 'ex explosive': 'exExplosive',
    flechette: 'flechette', gel: 'gel', tracer: 'tracer', av: 'antiVehicle' }[m[1].toLowerCase()] : null;
}

const extras = (r, skip) => Object.entries(r)
  .filter(([k, v]) => !skip.includes(k) && !['Name', 'BookPage', 'attributes', 'entries'].includes(k) && v !== '' && v !== '-' && typeof v !== 'object')
  .map(([k, v]) => `<strong>${k.replace(/:$/, '')}:</strong> ${v}`).join('<br>');

/** One upstream row → the document to write, or null when out of scope. Pure. */
export function docFor(row, category, edition) {
  // Arrows and bolts are AMMUNITION the generator files under "Bow and crossbow" — the nocked-ammo
  // flow matches them by the `arrow` / `bolt` mechanism (TODO 91). The bows themselves stay out.
  const missile = category === 'Bow and crossbow' && /\b(arrows?|bolts?)\s*$/i.exec(cleanName(row.Name));
  const type0 = missile ? 'ammunition' : CATEGORY_TYPE[category];
  if (!type0) return null;
  const name = cleanName(row.Name);
  if (!name) return null;
  const book = bookOf(row.BookPage);
  if (!EDITION_BOOKS[edition].includes(book)) return null;
  const type = type0 === 'ammunition' && /^spare clip/i.test(name) ? 'gear' : type0;
  const base = {
    _id: idFor(`${GENERATOR}|${book}|${type}|${normName(name)}`), name, type, img: IMG[type],
    effects: [], folder: null, flags: { The2ndChumming3e: { generatedBy: GENERATOR, upstreamCategory: category } },
  };
  // `cost` is an INTEGER field on every item type — a fractional book price (".5") would fail
  // validation on import, so it is rounded and the book's figure kept in the notes.
  // A price by formula ("Rating×200", "25000+(Rating×5000)") has no single number: cost 0, formula in the notes.
  const byFormula = /rating/i.test(String(row.Cost ?? ''));
  const rawCost = byFormula ? 0 : cellNumber(row.Cost), cost = Math.round(rawCost), bookPage = String(row.BookPage ?? '');
  const common = { availability: String(row.Availability ?? ''), streetIndex: String(row['Street Index'] ?? ''), bookPage };
  const costNote = byFormula ? `<p>Cost ${row.Cost}¥ — by rating; set the cost for the rating bought.</p>`
    : /\d\s*-\s*\d/.test(String(row.Cost ?? '')) ? `<p>Cost ${row.Cost}¥ (a range — the book's).</p>`
    : rawCost !== cost ? `<p>Cost ${row.Cost}¥ in the book.</p>` : '';

  if (type === 'gear') {
    const ratingCol = /^\d+$/.test(String(row.Rating ?? '')) ? Number(row.Rating) : null;
    const rating = (ratingCol && ratingCol > 0 ? ratingCol : null) ?? knownRating(name);
    const more = extras(row, ['Concealability', 'Rating', 'Weight', 'Availability', 'Cost', 'Street Index']);
    return { ...base, book, system: { quantity: 1, category, concealability: String(row.Concealability ?? ''), rating: rating ?? null,
      cost, weight: cellNumber(row.Weight), ...common, description: `${costNote}${more ? `<p>${more}</p>` : ''}` } };
  }
  if (type === 'medical') {
    const rating = String(row.Rating ?? '').trim();
    return { ...base, book, system: { category, rating: rating && rating !== '-' ? rating : String(knownRating(name) ?? ''),
      weight: String(row.Weight ?? ''), cost, ...common, notes: costNote } };
  }
  if (type === 'drug') {
    const more = extras(row, ['Addiction', 'Tolerance', 'Edge', 'Speed', 'Vector', 'Availability', 'Cost', 'Street Index', 'Damage']);
    return { ...base, book, system: { category: category === 'Drugs' ? '' : category, addiction: String(row.Addiction ?? ''),
      tolerance: String(row.Tolerance ?? ''), effect: String(row.Edge ?? row.Damage ?? ''), speed: String(row.Speed ?? ''),
      vector: String(row.Vector ?? ''), cost, ...common, notes: `${costNote}${more ? `<p>${more}</p>` : ''}` } };
  }
  if (type === 'armor') {
    return { ...base, book, system: { concealability: String(row.Concealability ?? ''), ballistic: Math.round(cellNumber(row.Ballistic)),
      impact: Math.round(cellNumber(row.Impact)), weight: cellNumber(row.Weight), cost, ...common, notes: costNote } };
  }
  // Ammunition — the loading mechanism is the clip's (`c`); a GM changes it for a cylinder or tube.
  const clip = /^(\d+)\s*-?\s*rnd\s+clip\s*\(([^)]*)\)?/i.exec(name);
  const damage = String(row.Damage ?? '');
  if (missile) {
    // "10 Bolts" is ten at the listed price; a bare "Arrows" row is the book's price for ONE (SR3 p.276).
    const n = Number(/^(\d+)\s/.exec(name)?.[1] ?? 1);
    return { ...base, book, system: { concealability: String(row.Concealability ?? ''), damage, ammoType: 'regular',
      loadMechanism: /bolt/i.test(missile[1]) ? 'bolt' : 'arrow', countedIn: 'rounds', rounds: n, reloads: 0, roundsPerReload: 0,
      weight: cellNumber(row.Weight), cost, ...common, notes: costNote } };
  }
  if (clip) {
    const ammoType = AmmoStock.typeFromLabel(clip[2]);
    const note = ammoType ? '' : `<p>${clip[2].trim()} rounds — a type this system does not model; its rules are the GM's (${bookPage}).</p>`;
    return { ...base, book, system: { concealability: String(row.Concealability ?? ''), damage, ammoType: ammoType ?? 'regular',
      loadMechanism: 'c', countedIn: 'reloads', reloads: 1, roundsPerReload: Number(clip[1]), rounds: 0,
      weight: cellNumber(row.Weight), cost, ...common, notes: note } };
  }
  // Loose rounds. The core table is "Ammunition, Per 10 Shots" (SR3 p.281) and the generator divides
  // it down to ONE round (APDS 7¥ = 70¥ per 10), so a bare "… Rnds" row becomes a box of 10 at the
  // book's per-10 price. A row naming its count ("(10)", "Belt (100)") is that many; anything else —
  // a dart, a tracker round, Big D — is one, at the listed price.
  const count = /\((\d+)\)/.exec(name);
  const perRound = !count && !byFormula && /\b(rnds|rounds)\s*$/i.test(name);
  const rounds = count ? Number(count[1]) : perRound ? 10 : 1;
  const ammoType = ammoTypeFromWords(name);
  return { ...base, book, system: { concealability: String(row.Concealability ?? ''), damage, ammoType: ammoType ?? 'regular',
    loadMechanism: 'c', countedIn: 'rounds', rounds, reloads: 0, roundsPerReload: 0,
    weight: Math.round(cellNumber(row.Weight) * (perRound ? rounds : 1) * 1000) / 1000,
    cost: perRound ? Math.round(rawCost * rounds) : cost, ...common,
    notes: `${perRound ? `<p>A box of ${rounds}. The generator lists these per round (${row.Cost}¥ each); the book prices ammunition per 10 shots.</p>` : ''}`
      + costNote
      + `${ammoType ? '' : '<p>Not one of the types this system models, or a combination of them — its rules are the GM\'s.</p>'}`
      + '<p>Loading mechanism set to clip (c); change it for a cylinder, tube or belt.</p>' } };
}

/* ── The build ────────────────────────────────────────────────────────────────────────────── */

function rowsByCategory(file) {
  const data = JSON.parse(readFileSync(join(REPO, file), 'utf8'));
  const out = [];
  for (const [category, v] of Object.entries(data)) {
    const walk = o => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') {
      if (typeof o.Name === 'string') out.push({ row: o, category });
      for (const x of Object.values(o)) if (x && typeof x === 'object') walk(x); } };
    walk(v);
  }
  return out;
}

const VARIANT_FIELDS = ['Rating', 'Cost', 'Weight', 'Concealability', 'Damage', 'Ballistic', 'Impact', 'Availability'];
/** A cell's value with the generator's three spellings of "nothing" (`-`, `''`, absent) made one. */
const cell = v => { const s = String(v ?? '').trim(); return /^(-|—|n\/?a)$/i.test(s) ? '' : s; };
const rowSignature = r => JSON.stringify(Object.entries(r)
  .filter(([k, v]) => k !== 'Name' && k !== 'BookPage' && cell(v) !== '').map(([k, v]) => [k, cell(v)]).sort());

/**
 * Rows sharing a book, type and name. Exact repeats (the generator lists some items under two
 * headings, or once with its `->` marker) collapse to one; rows that really differ — Gyro Mount
 * at Rating 5 and 6, Big D by the round and by the box — are ALL kept, told apart by the first
 * field whose values are all different. Returns `[{ row, variant }]`; `variant` is `''` for a
 * lone row, else e.g. `'Rating 5'` / `'Cost 200¥'` / `'variant 2'`. Pure.
 */
export function variantsOf(rows) {
  const unique = [];
  for (const r of rows) if (!unique.some(u => rowSignature(u) === rowSignature(r))) unique.push(r);
  if (unique.length === 1) return [{ row: unique[0], variant: '' }];
  const fields = [...VARIANT_FIELDS, ...new Set(unique.flatMap(Object.keys))].filter(f => f !== 'Name' && f !== 'BookPage');
  const field = fields.find(f => new Set(unique.map(r => cell(r[f]))).size === unique.length);
  return unique.map((row, i) => ({ row,
    variant: !field ? `variant ${i + 1}`
      : !cell(row[field]) ? `no ${field.replace(/:$/, '').toLowerCase()}`
      : `${field.replace(/:$/, '')} ${cell(row[field])}${field === 'Cost' ? '¥' : ''}` }));
}

/**
 * One drug the book prints in two TABLES — M&M gives ACTH's addiction and tolerance under Drugs and
 * its speed and vector under Chemicals — is one item, not two variants. Each cell comes from the
 * first table that fills it; a cell the tables disagree on is kept, with its page, as "Also listed".
 * Pure.
 */
export function mergeListings(rows) {
  const merged = { ...rows[0] };
  const also = [];
  for (const r of rows.slice(1)) {
    for (const [k, v] of Object.entries(r)) {
      if (k === 'Name' || k === 'BookPage' || !cell(v)) continue;
      if (!cell(merged[k])) merged[k] = v;
      else if (cell(merged[k]).replace(/\s+/g, '') !== cell(v).replace(/\s+/g, '')) also.push(`${k} ${cell(v)} (${r.BookPage})`);
    }
  }
  if (also.length) merged['Also listed'] = also.join('; ');
  return merged;
}

/** Every document to write, grouped by pack, plus what was skipped and why. */
export async function plan(manifest, shippedNames) {
  const packFor = (book, type) => {
    const hit = manifest.packs.find(p => p.flags?.The2ndChumming3e?.book === book && (p.flags?.The2ndChumming3e?.itemTypes ?? []).includes(type));
    return hit?.name ?? `sr3e-${book === 'matrix-defragged' ? 'mdf' : book}-${PACK_SUFFIX[type]}`;
  };
  const byPack = new Map();
  const report = { written: {}, alreadyShipped: {}, shippedAsOtherType: [], repeatedUpstream: {}, variants: [], outOfScope: {} };
  const bump = (m, k) => { m[k] = (m[k] ?? 0) + 1; };
  const groups = new Map();                    // book|type|name → { rows, category, edition }
  for (const { edition, file } of SOURCES) {
    for (const { row, category } of rowsByCategory(file)) {
      const book = bookOf(row.BookPage);
      if (!EDITION_BOOKS[edition].includes(book)) continue;
      const doc = docFor(row, category, edition);
      if (!doc) { bump(report.outOfScope, `${book} · ${category}`); continue; }
      const key = `${book}|${doc.type}|${normName(doc.name)}`;
      const g = groups.get(key) ?? groups.set(key, { rows: [], edition }).get(key);
      g.rows.push({ row, category });
    }
  }
  for (const [key, { rows, edition }] of groups) {
    if (key.split('|')[1] === 'drug' && rows.length > 1) {
      const merged = mergeListings(rows.map(r => r.row));
      rows.splice(0, rows.length, { row: merged, category: rows[0].category }, ...Array(rows.length - 1).fill({ row: merged, category: rows[0].category }));
    }
    const variants = variantsOf(rows.map(r => r.row));
    report.repeatedUpstream[key.split('|').slice(0, 2).join(' ')] ??= 0;
    report.repeatedUpstream[key.split('|').slice(0, 2).join(' ')] += rows.length - variants.length;
    for (const { row, variant } of variants) {
      const category = rows.find(r => r.row === row).category;
      const doc = docFor(row, category, edition);
      const pack = packFor(doc.book, doc.type);
      // Already in this book as ANY gear-like type — Respirator is armour, Shadowtech's Doom a drug.
      // Cyberware is not gear-like: an implanted subvocal mic and a strap-on one are two items.
      const shippedAs = manifest.packs.filter(p => p.flags?.The2ndChumming3e?.book === doc.book
        && (p.flags?.The2ndChumming3e?.itemTypes ?? []).some(t => t in PACK_SUFFIX) && shippedNames.get(p.name)?.has(normName(doc.name)));
      if (shippedAs.length) {
        bump(report.alreadyShipped, `${doc.book} ${doc.type}`);
        if (!shippedAs.some(p => p.name === pack)) report.shippedAsOtherType.push(`${doc.book} ${doc.type}: ${doc.name} — in ${shippedAs.map(p => p.name).join(', ')}`);
        continue;
      }
      if (variant) {
        // A gear rating is shown by the rating column (`displayName` → "Gyro Mount [5]"); anything
        // else says what tells the rows apart, in the name, so the compendium lists both.
        // The unrated row of a rated family ("Imaging Scope" beside Imaging Scope [1]-[3]) keeps the plain name.
        const ratingOnly = doc.type === 'gear' && ((/^Rating \d+$/.test(variant) && doc.system.rating != null) || variant === 'no rating');
        if (!ratingOnly) doc.name = `${doc.name} (${variant})`;
        doc._id = idFor(`${GENERATOR}|${key}|${variant}`);
        report.variants.push(`${doc.book} ${doc.type}: ${doc.name}${ratingOnly ? ` [${doc.system.rating}]` : ''}`);
      }
      const { book, ...clean } = doc;
      (byPack.get(pack) ?? byPack.set(pack, { book, type: doc.type, docs: [] }).get(pack)).docs.push(clean);
      bump(report.written, `${book} ${doc.type}`);
    }
  }
  for (const [k, v] of Object.entries(report.repeatedUpstream)) if (!v) delete report.repeatedUpstream[k];
  return { byPack, report };
}

/** Add the packs (with their book flag) and their sidebar folders to system.json. */
export function declarePacks(manifest, byPack) {
  const bookLabel = book => manifest.packs.find(p => p.flags?.The2ndChumming3e?.book === book)?.label ?? book;
  const wg = manifest.packFolders.find(f => f.name === 'Weapons & Gear');
  for (const [name, { book, type }] of byPack) {
    if (!manifest.packs.some(p => p.name === name)) {
      manifest.packs.push({ name, label: bookLabel(book), path: `packs/${name}`, type: 'Item', system: 'The2ndChumming3e',
        ownership: { PLAYER: 'OBSERVER', ASSISTANT: 'OWNER' }, flags: { The2ndChumming3e: { itemTypes: [type], book } } });
    }
    let folder = wg.folders.find(f => f.name === FOLDER[type]);
    if (!folder) { folder = { name: FOLDER[type], sorting: 'a', packs: [] }; wg.folders.push(folder); }
    if (!folder.packs.includes(name)) { folder.packs.push(name); folder.packs.sort(); }
  }
  return manifest;
}

/** Pack name → the normalised names it ships that this tool did NOT write. `dir` must be a COPY. */
export async function shippedNamesIn(dir, manifest) {
  const shippedNames = new Map();
  for (const p of manifest.packs) {
    if (!existsSync(join(dir, p.name))) continue;
    const db = new ClassicLevel(join(dir, p.name), { valueEncoding: 'json' }); await db.open();
    const names = new Set();
    for await (const [k, d] of db.iterator()) {
      if (/^!items!/.test(k) && d?.name && d?.flags?.The2ndChumming3e?.generatedBy !== GENERATOR) names.add(normName(d.name));
    }
    await db.close(); shippedNames.set(p.name, names);
  }
  return shippedNames;
}

async function main() {
  const REPORT = process.argv.includes('--report');
  const ROOT = process.argv.includes('--install')
    ? (process.env.SR3E_INSTALL ?? join(process.env.LOCALAPPDATA ?? '', 'FoundryVTT', 'Data', 'systems', 'The2ndChumming3e'))
    : REPO;
  const manifestPath = join(ROOT, 'system.json');
  const text = readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(text);
  if (JSON.stringify(manifest, null, 2) + '\n' !== text) {
    console.error(`${manifestPath} is not canonical JSON (JSON.stringify(…, 2)) — refusing to rewrite it.`);
    process.exit(2);
  }

  // What each declared pack already holds — read from a COPY of the repo (no churn).
  const copy = copyPacks(join(REPO, 'packs'));
  let shippedNames;
  try { shippedNames = await shippedNamesIn(copy.dir, manifest); } finally { copy.cleanup(); }

  const { byPack, report } = await plan(manifest, shippedNames);
  const total = Object.values(report.written).reduce((a, b) => a + b, 0);
  console.log(`${total} documents into ${byPack.size} packs.`);
  for (const [k, v] of Object.entries(report)) console.log(`  ${k}:`, Array.isArray(v) ? `${v.length}\n    ${v.join('\n    ')}` : JSON.stringify(Object.fromEntries(Object.entries(v).sort())));
  if (REPORT) return;

  /* The REPO: write the documents into `packs-src/` (the source of truth, TODO 12), then rebuild only
   * the packs whose content actually changed — the old path rewrote all 25 packs' LevelDB files on
   * every run, content-identical, which is what made the 2026-09-14 merges painful. */
  if (ROOT === REPO) {
    let rebuilt = 0;
    for (const [name, { docs }] of byPack) {
      const srcDir  = join(REPO, 'packs-src', name);
      const entries = existsSync(srcDir) ? readSourceDir(srcDir) : new Map();
      const want = new Map(docs.map(d => [`!items!${d._id}`, d]));
      for (const [k, d] of [...entries]) {                    // drop our own documents no longer produced
        if (/^!items!/.test(k) && d?.flags?.The2ndChumming3e?.generatedBy === GENERATOR && !want.has(k)) entries.delete(k);
      }
      for (const [k, d] of want) entries.set(k, d);
      writeSourceDir(srcDir, entries);
      if (await rebuildPack(REPO, name)) { rebuilt++; console.log(`  rebuilt ${name}: ${docs.length}`); }
    }
    console.log(`  ${rebuilt} of ${byPack.size} packs changed`);
    writeFileSync(manifestPath, JSON.stringify(declarePacks(manifest, byPack), null, 2) + '\n');
    console.log(`declared in ${manifestPath}`);
    return;
  }

  // The INSTALL: written directly, as before — a one-way copy (Foundry CLOSED).
  for (const [name, { docs }] of byPack) {
    const db = new ClassicLevel(join(ROOT, 'packs', name), { valueEncoding: 'json' });
    try { await db.open(); } catch (err) { console.error(`${name}: could not open — close Foundry.\n${err.message}`); process.exit(2); }
    const want = new Map(docs.map(d => [`!items!${d._id}`, d]));
    for await (const [k, d] of db.iterator()) {            // drop our own documents no longer produced
      if (/^!items!/.test(k) && d?.flags?.The2ndChumming3e?.generatedBy === GENERATOR && !want.has(k)) await db.del(k);
    }
    for (const [k, d] of want) await db.put(k, d);
    await db.close();
    console.log(`  wrote ${name}: ${docs.length}`);
  }
  writeFileSync(manifestPath, JSON.stringify(declarePacks(manifest, byPack), null, 2) + '\n');
  console.log(`declared in ${manifestPath}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
