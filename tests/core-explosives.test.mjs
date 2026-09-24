/**
 * The core book's explosives carry the table's Blast and Legal columns — TODO 160.
 *
 * SR3 p.283, "Commercial Explosives, Per Kilo":
 *
 *   Commercial            6   3    –3/m   1   6/48 hrs   60¥   1  4P–J
 *   Plastic, Compound IV  6   6    –6/m   1   8/48 hrs   80¥   1  4–J
 *   Plastic, Compound XII 6   12   –12/m  1   10/48 hrs  200¥  2  3–J
 *   Accessories: Radio Detonator 8 · .25 · 4/48 hrs · 250¥ · 2 · 6–J     Timer 6 · .5 · 4/48 hrs · 100¥ · 2 · 6–J
 *
 * The rows already shipped (as gear, from the generator's data) with their numbers right and the
 * Blast and Legal columns missing. Those now ride in the description. ⚠ Only the core SR3 book: the
 * SR2 pack has same-named accessories that must not be told they are on SR3 p.283.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { BOOK_TEXT } from '../tools/build-default-gear.mjs';

export const name = 'core-explosives';

const dir = rel => new URL(`../packs-src/${rel}/`, import.meta.url);
const load = (pack, name) => {
  const f = readdirSync(dir(pack)).find(f => f.endsWith('.json') && JSON.parse(readFileSync(new URL(f, dir(pack)), 'utf8')).doc?.name === name);
  return f ? JSON.parse(readFileSync(new URL(f, dir(pack)), 'utf8')).doc : null;
};

export async function run(t) {
  const rows = [
    // name, rating, cost, weight, avail, index, blast, legal
    ['Commercial Explosive B', 3, 60, 1, '6/48hrs', '1', '–3/m', '4P–J'],
    ['Plastic Compound IV', 6, 80, 1, '8/48hrs', '1', '–6/m', '4–J'],
    ['Plastic Compound XII', 12, 200, 1, '10/48hrs', '2', '–12/m', '3–J'],
  ];
  for (const [n, rating, cost, weight, avail, index, blast, legal] of rows) {
    const d = load('sr3e-sr3-gear', n);
    t.ok(`${n} ships`, !!d);
    if (!d) continue;
    const s = d.system;
    t.eq(`${n}: the printed row`, [s.rating, s.cost, s.weight, s.availability, s.streetIndex, s.bookPage], [rating, cost, weight, avail, index, 'sr3.283']);
    t.ok(`${n}: the description states Blast ${blast}`, s.description.includes(`Blast ${blast}`));
    t.ok(`${n}: …and Legality ${legal}`, s.description.includes(`Legality ${legal}`));
    t.ok(`${n}: …and the (Rating)D per kilogram Damage Code`, s.description.includes('(Rating)D per kilogram'));
  }
  for (const [n, legal] of [['Radio Detonator', '6–J'], ['Timer', '6–J']]) {
    t.ok(`${n} (SR3) states Legality ${legal}`, load('sr3e-sr3-gear', n)?.system.description.includes(`Legality ${legal}`));
  }
  // The SR2 packs are parked (archive/sr2/), so the same-named SR2 accessories cannot be checked in data —
  // check the rule that keeps SR3 p.283 text off them for when they return.
  t.ok('the SR3 book text is applied to the core SR3 book only, never to a same-named SR2 row',
    /book === 'sr3' \? \(BOOK_TEXT\[name\] \?\? ''\) : ''/.test(readFileSync(new URL('../tools/build-default-gear.mjs', import.meta.url), 'utf8')));
  t.is('the text table covers exactly the five p.283 rows', Object.keys(BOOK_TEXT).length, 5);
}
