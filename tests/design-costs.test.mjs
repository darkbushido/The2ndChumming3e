/**
 * A vehicle mod's design figures — `scripts/data/design-costs.mjs` · TODO 287 (the maintainer: "Add designCost field now").
 * Fixtures are R3R's own figures: Nitrous Oxide 55 points per level (p.126), CMCs banded per level (p.128), ECM by rating
 * (p.144), RAM (levels)³ × 50 (p.134), Brickyard's Nitrous 6 = 330 (p.113).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { DesignCosts as D, DESIGN_COSTS } from '../scripts/data/design-costs.mjs';

export const name = 'design-costs';

export async function run(t) {
  t.eq('flat', D.points('35'), 35);
  t.eq('per level — Brickyard Nitrous 6 is 330', D.points('55 per level', { level: 6 }), 330);
  t.eq('per seat', D.points('30 per seat', { level: 4 }), 120);
  t.eq('chassis fraction per level', D.points('Chassis x 0.25 per level', { chassis: 100, level: 2 }), 50);
  t.eq('chassis unknown → null', D.points('Chassis x 0.25'), null);
  t.eq('plant fraction', D.points('Plant x 0.75 per level', { plant: 40, level: 1 }), 30);
  t.eq('N x Body', D.points('25 x Body', { body: 3 }), 75);
  t.eq('Body² × N per level (load)', D.points('Body^2 x 5kg per level', { body: 3, level: 2 }), 90);
  t.eq('rating table', D.points('Rating 1: 100, 2: 200, 3: 300', { level: 3 }), 300);
  t.eq('rating past the table → null', D.points('Rating 1: 5, 2: 10', { level: 5 }), null);
  t.eq('banded per level — CMC 4 is 4 × 75', D.points('Per level 1-3: 35, 4-6: 75, 7-9: 150', { level: 4 }), 300);
  t.eq('open band — anti-theft 10', D.points('Per level 3-6: 4, 7-9: 10, 10+: 50', { level: 10 }), 500);
  t.eq('RAM cubes the levels', D.points('(levels)^3 x 50', { level: 3 }), 1350);
  t.eq('rating multiple', D.points('Rating x 50', { level: 4 }), 200);
  t.eq('pilot multiple', D.points('Pilot x 50', { pilot: 3 }), 150);
  t.eq('unparseable → null (the GM types it)', D.points('16+8/noisemaker'), null);
  t.eq('blank → null', D.points(''), null);

  const nitrous = { type: 'vehiclemod', name: 'Nitrous Oxide Injectors (Vehicle)', system: { bookPage: 'r3.126', designCost: '' } };
  t.eq('fills blanks', D.fillDelta(nitrous), { 'system.designCost': '55 per level', 'system.designCf': '1.5', 'system.designLoad': '15kg' });
  t.eq('never overwrites', D.fillDelta({ ...nitrous, system: { ...nitrous.system, designCost: '60', designCf: '2', designLoad: '9' } }), null);
  t.eq('wrong page → nothing', D.fillDelta({ ...nitrous, system: { bookPage: 'r3.999' } }), null);
  t.eq('not a vehicle mod → nothing', D.fillDelta({ ...nitrous, type: 'gear' }), null);
  const amph = cf => D.rowFor({ type: 'vehiclemod', name: 'Amphibious Package (Vehicle)', system: { bookPage: 'r3.149', cfCost: cf } })?.[3];
  t.eq('amphibious levels told apart by CF', [amph('0'), amph('2'), amph('4')], ['25', '80', '200']);

  t.eq('rows are unique by name+page+discriminator',
    DESIGN_COSTS.map(r => JSON.stringify(r.slice(0, 3))).filter((x, i, a) => a.indexOf(x) !== i), []);
  // Every row names a document that ships, and every shipped match carries its figures (the packs are filled).
  const docs = [];
  for (const p of readdirSync(new URL('../packs-src/', import.meta.url)))
    for (const f of readdirSync(new URL(`../packs-src/${p}/`, import.meta.url)))
      if (f.endsWith('.json')) docs.push(JSON.parse(readFileSync(new URL(`../packs-src/${p}/${f}`, import.meta.url), 'utf8')).doc);
  const mods = docs.filter(d => d?.type === 'vehiclemod');
  t.eq('every row matches a shipped mod', DESIGN_COSTS.filter(r => !mods.some(d => D.rowFor(d) === r)).map(r => r[0]), []);
  t.eq('the packs are filled (run tools/fill-design-costs.mjs)', mods.filter(d => D.fillDelta(d)).map(d => d.name), []);
}
