#!/usr/bin/env node
/**
 * Build the Legwork success-table template into packs-src/sr3e-legwork-tables · TODO 268.
 *
 * SR3 p.253: *"Most published adventures include a Legwork section that contains success tables listing
 * information available to the runners"*, and a runner who rolls more than one success learns every level
 * below it too. The GM copies this RollTable into the world once per mystery, writes what each success count
 * reveals, and sets the target number in the description; the 🔎 Legwork tool (Rollable Tables tab) reads a
 * world RollTable and shows every row up to the successes rolled (`scripts/data/legwork.mjs`, `revealed`).
 *
 * ⚠ Each row's RANGE is the success count that reveals it (`[3, 30]` = 3 or more), not a die result.
 * ⚠ The table's TN is read from "Target Number: N" in its description (`Legwork.tableTN`) — a GM can edit
 *   the description in Foundry's table sheet, and cannot edit flags there.
 * ⚠ Ids are DERIVED from names (the repo rule: re-runs reuse keys). Run, then `npm run packs:build`
 *   (and `packs:install` with Foundry closed).
 *
 *   node tools/build-legwork-tables.mjs
 */
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rmSync } from 'node:fs';
import { writeSourceDir } from './lib/pack-source.mjs';
import { idFor } from './build-gm-sixth-world.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const PACK = 'sr3e-legwork-tables';

/** The tables, each with its rows. `low`/`high` = the success counts that reveal the row. */
export const TABLES = [
  {
    name: 'Legwork success table (template)',
    description: `<p><strong>Target Number: 4</strong> — change the number to the adventure's, if it gives one.</p>
<p>Copy this table into the world for each mystery (right-click → Import, or drag it to the Rollable Tables tab),
rename it, and write what the runners learn at each success count. Rows are <strong>cumulative</strong>: a runner
who rolls 3 successes learns rows 1, 2 and 3 <em>(SR3 p.253)</em>. Each row's range is the success count that
reveals it; add a 0 row for what a failure turns up, or a 4 and 5 row for more, by editing the ranges.</p>
<p>The 🔎 Legwork tool on the Rollable Tables tab rolls the test and shows the rows reached, with the contact's fee
<em>(SR3 p.253-254)</em>.</p>`,
    rows: [
      { low: 1, high: 1,  name: '1 success',     text: '<p>[What any contact on the street has heard — the rumour, the obvious.]</p>' },
      { low: 2, high: 2,  name: '2 successes',   text: '<p>[A real lead — a name, a place, who else is asking.]</p>' },
      { low: 3, high: 30, name: '3+ successes',  text: '<p>[The good stuff — what the contact would only tell a friend.]</p>' },
    ],
  },
];

/** The tables and their rows as pack entries (key → value), ids derived from names. */
export function entries() {
  const now = 1793000000000;   // fixed, so a re-run writes identical files
  const stats = { coreVersion: '14.365', systemId: 'The2ndChumming3e', systemVersion: '0.8.0',
    createdTime: now, modifiedTime: now, lastModifiedBy: null, compendiumSource: null, duplicateSource: null, exportSource: null };
  const out = new Map();
  TABLES.forEach((tbl, ti) => {
    const tid = idFor(`${PACK}:table:${tbl.name}`);
    const rowIds = tbl.rows.map(r => idFor(`${PACK}:${tbl.name}:row:${r.name}`));
    out.set(`!tables!${tid}`, {
      _id: tid, name: tbl.name, img: 'icons/svg/book.svg', description: tbl.description.trim(), results: rowIds,
      formula: '', replacement: true, displayRoll: true, folder: null, sort: ti * 100000,
      ownership: { default: 0 }, flags: { The2ndChumming3e: { legworkTemplate: true } }, _stats: stats,
    });
    tbl.rows.forEach((r, i) => {
      out.set(`!tables.results!${tid}.${rowIds[i]}`, {
        _id: rowIds[i], type: 'text', name: r.name, img: null, description: r.text, weight: 1,
        range: [r.low, r.high], drawn: false, flags: {}, _stats: stats,
      });
    });
  });
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dir = join(ROOT, 'packs-src', PACK);
  rmSync(dir, { recursive: true, force: true });
  const r = writeSourceDir(dir, entries());
  console.log(`${PACK}: ${r.written} written`);
}
