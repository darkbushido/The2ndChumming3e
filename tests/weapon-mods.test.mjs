/**
 * Weapon mods (Firearms Accessories) — book corrections in the gear builder · TODO 258
 *
 * Audit: `audit/weapon-mods-audit.md`. The accessories are GENERATED (`tools/build-default-gear.mjs`), so
 * the corrections are a table in the builder, `ACCESSORY_FIXES`, applied by `fixAccessories`. This pins the
 * table to the books, and that what ships carries it (`tests/default-gear.test.mjs` separately proves the
 * packs equal a fresh build).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { ACCESSORY_FIXES, fixAccessories } from '../tools/build-default-gear.mjs';
import { ModRatings } from '../scripts/data/mod-ratings.mjs';

export const name = 'weapon-mods';

const accessories = () => {
  const out = [];
  for (const pack of ['sr3e-sr3-gear', 'sr3e-cc-gear', 'sr3e-mm-gear']) {
    const dir = new URL(`../packs-src/${pack}/`, import.meta.url);
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.json')) continue;
      const doc = JSON.parse(readFileSync(new URL(f, dir), 'utf8')).doc;
      if (doc?.system?.category === 'Firearms Accessories') out.push({ pack, ...doc });
    }
  }
  return out;
};

export async function run(t) {
  /* ── The pure fix ─────────────────────────────────────────────────────────────── */
  const rows = [
    { row: { Name: 'Sawed-Off Shotgun Barrel', Cost: '68', BookPage: 'cc.83' }, category: 'Firearms Accessories' },
    { row: { Name: 'Low Power Laser Sight', Cost: '500', BookPage: 'sr3.282,fof.60' }, category: 'Firearms Accessories' },
    { row: { Name: 'Laser Sight (Low Power)', Cost: '500', BookPage: 'sr3.282', Mount: 'Top/Under/Hand' }, category: 'Firearms Accessories' },
    { row: { Name: 'Bipod', Cost: '400', BookPage: 'sr3.282' }, category: 'Firearms Accessories' },
  ];
  const fixed = fixAccessories(rows);
  t.is('the sawed-off barrel is DP +8 × 8 = 64¥ (CC p.80, p.83)', fixed.find(r => r.row.Name === 'Sawed-Off Shotgun Barrel')?.row.Cost, '64');
  t.ok('the SR2 "Low Power Laser Sight" row is dropped', !fixed.some(r => r.row.Name === 'Low Power Laser Sight'));
  const lp = fixed.find(r => r.row.Name === 'Laser Sight, Low-Power')?.row;
  t.is('the low-power laser is the Cannon Companion customisation — cc.82', lp?.BookPage, 'cc.82');
  t.is('…at DP +100 × 8 = 800¥', lp?.Cost, '800');
  t.is('…top or underbarrel, not a hand mount', lp?.Mount, 'Top/Under');
  t.eq('an accessory with no fix is untouched', fixed.find(r => r.row.Name === 'Bipod'), rows[3]);
  t.ok('a fix matches on name AND page — another book\'s Rangefinder is left alone',
    fixAccessories([{ row: { Name: 'Rangefinder', BookPage: 'sota2.10', Mount: 'Top/Under' }, category: 'x' }])[0].row.Mount === 'Top/Under');
  t.ok('every set fix that changes a figure says where it comes from',
    ACCESSORY_FIXES.filter(f => !f.drop && (f.set.Cost || f.set.BookPage)).every(f => /p\.\d+/.test(f.set.Source ?? '')));

  /* ── What ships ───────────────────────────────────────────────────────────────── */
  const acc = accessories();
  // The accessories carry their mod tag ("Gas Vent I (Weapon)", TODO 266) — found by their plain name.
  const one = n => acc.filter(d => ModRatings.baseName(d.name) === n);
  t.is('Sawed-Off Shotgun Barrel ships at 64¥', one('Sawed-Off Shotgun Barrel')[0]?.system.cost, 64);
  t.ok('Rangefinder is Top-mounted (CC p.33)', /Mount:<\/strong> Top(<|$)/.test(one('Rangefinder')[0]?.system.description ?? ''));
  t.is('one low-power laser sight ships', acc.filter(d => /low.?power/i.test(d.name)).length, 1);
  t.is('…in the Cannon Companion gear pack', one('Laser Sight, Low-Power')[0]?.pack, 'sr3e-cc-gear');
  t.is('…at 800¥', one('Laser Sight, Low-Power')[0]?.system.cost, 800);
  t.ok('Smart Shades I cite SR3 p.281, where the sunglasses rule is', one('Smart Shades I (Cost 6000¥)')[0]?.system.bookPage === 'sr3.281');
  t.ok('…and say why the price is double', /double the nuyen/.test(one('Smart Shades I (Cost 6000¥)')[0]?.system.description ?? ''));
  t.ok('Ultrasound Shades say their price is derived, not printed', /Derived; not printed/.test(one('Ultrasound Shades')[0]?.system.description ?? ''));
  // ONE Gas Vent, Level 1-4 (the maintainer, 2026-10-27): its level 1 row still says SR3 does not print it (audit, unresolved).
  t.ok('Gas Vent level 1 says SR3 does not print it', /Not printed in SR3/.test(one('Gas Vent')[0]?.system.description ?? ''));
}
