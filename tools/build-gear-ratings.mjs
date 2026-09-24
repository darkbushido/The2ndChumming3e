/**
 * Vendor the ratings of gear that is rated in a COLUMN, not in its name.
 *
 * Reported in play, 2026-09-14 ("do we have reliable ratings for all gear? — medkits for one"):
 * upstream's `Gear.json` rates 287 items only in its `Rating` column — *Basic Medkit* 3,
 * *Stabilization Unit* 2 and its *Deluxe* 6 among them — and a plain *Medkit* is rating 3 by the
 * book (SR3 p.304). `itemRating()` read the stored field and then the NAME, so any such item typed
 * by hand, or imported before the 0.5.2 importer kept `Rating`, read as **0** — a medkit giving
 * the healing flow no dice.
 *
 * Writes `scripts/data/gear-ratings.mjs`: normalised name → rating, for the upstream names that
 * carry no rating in the name. ⚠ **A name upstream rates DIFFERENTLY in different entries is left
 * out** (Gyro Mount 5/6/7, Imaging Scope 1/2/3) — a name alone cannot say which, and a wrong
 * rating is worse than none. `BOOK_ADDITIONS` holds entries read from the PDFs, each cited.
 *
 * Vendored like `srcg-bonuses.js`: an upstream change becomes a reviewable diff, and the table is
 * readable inside Foundry (the migration, the healing flow), where there is no filesystem.
 *
 *   node tools/build-gear-ratings.mjs            # write the table
 *   node tools/build-gear-ratings.mjs --report   # print it, write nothing
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseRatingFromName as ratingFromName } from '../scripts/data/rating-name.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const UP   = process.env.SRCG_DATA
  ?? join(process.env.USERPROFILE ?? '', 'Documents', 'Shadowrun-Character-Generator', 'src', 'data', 'SR3');

/** Read from the PDFs, not upstream — each with its citation. */
const BOOK_ADDITIONS = {
  medkit: { rating: 3, source: 'SR3 p.304 — the Biotech table lists "Medkit 3"; its expert system is "Biotech 3"' },
};

export const normName = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const rows = [];
const walk = o => {
  if (Array.isArray(o)) o.forEach(walk);
  else if (o && typeof o === 'object') {
    if (typeof o.Name === 'string') rows.push(o);
    for (const v of Object.values(o)) if (v && typeof v === 'object') walk(v);
  }
};
walk(JSON.parse(readFileSync(join(UP, 'Gear.json'), 'utf8')));

const seen = new Map();
for (const r of rows) {
  const rating = String(r.Rating ?? '');
  if (!/^\d+$/.test(rating) || Number(rating) <= 0) continue;
  if (ratingFromName(r.Name) !== null) continue;          // the name already says it
  const k = normName(r.Name);
  (seen.get(k) ?? seen.set(k, { ratings: new Set(), book: r.BookPage ?? '' }).get(k)).ratings.add(Number(rating));
}
const table = {}; const ambiguous = [];
for (const [k, v] of [...seen].sort((a, b) => a[0].localeCompare(b[0]))) {
  if (v.ratings.size === 1) table[k] = [...v.ratings][0];
  else ambiguous.push(`${k} (${[...v.ratings].join('/')})`);
}
for (const [k, v] of Object.entries(BOOK_ADDITIONS)) table[k] = v.rating;

if (process.argv.includes('--report')) {
  console.log(`${Object.keys(table).length} names; ${ambiguous.length} left out as ambiguous: ${ambiguous.join(', ')}`);
  process.exit(0);
}

const out = `/**
 * Ratings of gear rated in the generator's \`Rating\` COLUMN rather than in its name.
 * **GENERATED — do not edit by hand.**  \`node tools/build-gear-ratings.mjs\`
 *
 * Normalised name (lower case, punctuation to spaces) → rating. Read by \`itemRating()\` after the
 * stored field and the name, so a plain *Medkit* is 3 (SR3 p.304) rather than 0.
 *
 * Left out as ambiguous (upstream rates the same name differently): ${ambiguous.join(', ') || 'none'}.
 * From the books, not upstream: ${Object.entries(BOOK_ADDITIONS).map(([k, v]) => `${k} — ${v.source}`).join('; ')}.
 */
export const GEAR_RATINGS = ${JSON.stringify(table, null, 2)};
`;
writeFileSync(join(HERE, '..', 'scripts', 'data', 'gear-ratings.mjs'), out);
console.log(`wrote ${Object.keys(table).length} names (${ambiguous.length} ambiguous left out)`);
