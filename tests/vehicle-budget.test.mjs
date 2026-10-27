/**
 * A vehicle's mods against its Cargo (CF) and Load — `scripts/data/vehicle-budget.mjs` · TODO 265, step c's first slice.
 *
 * Rigger 3 Revised p.124 (no vehicle can exceed its Cargo or Load; 1.5 CF per passenger seat scraped at +1 crash Power),
 * p.131-133 (armour figures per Armor point), p.136 (a mount's Load leaves out its weapon). Warn, never refuse.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { VehicleBudget, PER_POINT } from '../scripts/data/vehicle-budget.mjs';

export const name = 'vehicle-budget';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

const car = (attrs = {}, seating = 4) => ({ system: { seating, attributes: {
  body: { base: 5, value: 5 }, armor: { base: 2, value: 2 }, cargo: { base: 10, value: 10 }, load: { base: 500, value: 500 }, ...attrs } } });
const mod = (name, cfCost, load, rating = null) => ({ name, type: 'vehiclemod', system: { cfCost, load, rating } });

export async function run(t) {
  /* ── Reading the printed figures ──────────────────────────────────────────── */
  t.eq('CF: numbers, a decimal, blank is 0 (p.124: none listed, none taken)', ['0', '2', '1.5', '', undefined].map(x => VehicleBudget.cf(x)), [0, 2, 1.5, 0, 0]);
  t.is('Smart Armor\'s "3*Armor": 3 per point of the VEHICLE\'s Armor (p.133)', VehicleBudget.cf('3*Armor', { armor: 4 }), 12);
  t.eq('…anything else is unread, not 0', [VehicleBudget.cf('Upgrade'), VehicleBudget.cf('As allocated')], [null, null]);
  t.eq('Load: "15kg", a bare number is kg (the conversion kits\' "0.5")', ['15kg', '100kg', '0.5', '1', '', '0kg'].map(x => VehicleBudget.load(x)), [15, 100, 0.5, 1, 0, 0]);
  t.eq('…Body formulas, both spellings', [VehicleBudget.load('Body*100kg', { body: 5 }), VehicleBudget.load('100kg x Body', { body: 5 }), VehicleBudget.load('Body^2*5kg', { body: 5 }), VehicleBudget.load('Body*50kg', { body: 4 })], [500, 500, 125, 200]);
  t.eq('…a mount\'s "10kg+Weapon" counts its 10 kg and says the weapon is extra', [VehicleBudget.load('10kg+Weapon'), VehicleBudget.weaponExtra('10kg+Weapon')], [10, true]);
  t.is('…"weight of the missiles" is unread', VehicleBudget.load('weight of the missiles'), null);

  /* ── Per point (R3R p.131-132) ────────────────────────────────────────────── */
  const v = car();
  t.eq('Vehicle Armor 3 on a Body 5: Load 3 × 125 kg (Body² × 5), no CF', [VehicleBudget.of(mod('Vehicle Armor (Vehicle)', '0', 'Body^2*5kg', 3), v.system).load, VehicleBudget.of(mod('Vehicle Armor (Vehicle)', '0', 'Body^2*5kg', 3), v.system).cf], [375, 0]);
  t.eq('Concealed Armor 2: 3 CF and 125 kg a point', (({ cf, load }) => [cf, load])(VehicleBudget.of(mod('Concealed Armor (Vehicle)', '3', 'Body^2*5kg', 2), v.system)), [6, 250]);
  t.is('Ablative Armor\'s Body × 100 kg is for the mod, not per level (p.131)', VehicleBudget.of(mod('Ablative Armor (Vehicle)', '0', 'Body*100kg', 3), v.system).load, 500);
  t.is('a rated mod outside the table is not multiplied (ECM 4: its 5 kg)', VehicleBudget.of(mod('ECM (Vehicle)', '1', '5kg', 4), v.system).load, 5);
  t.eq('the per-point table is the book\'s two', Object.keys(PER_POINT), ['Vehicle Armor', 'Concealed Armor']);

  /* ── The budget ───────────────────────────────────────────────────────────── */
  const fits = VehicleBudget.summary(car(), [mod('ECM (Vehicle)', '1', '5kg', 2), mod('Crash Cages (Vehicle)', '2', '25kg')]);
  t.eq('used / available', [fits.cf.used, fits.cf.of, fits.load.used, fits.load.of], [3, 10, 30, 500]);
  t.eq('…under: no warning', fits.warnings, []);
  const full = VehicleBudget.summary(car(), [mod('Bench Seat (Vehicle)', '6', '100kg'), mod('Bucket Seat (Vehicle)', '6', '100kg')]);
  t.is('over Cargo: warned, with how much', full.cf.over, 2);
  t.ok('…citing the book and offering the passenger room (3 seats → 4 CF, +1 crash Power)',
    full.warnings.some(w => /12 CF; the vehicle has 10 — 2 over \(R3R p\.124/.test(w) && /up to 4 CF \(1\.5 a seat, 3 seats\) at \+1 Power to crash damage/.test(w)));
  t.eq('the passenger seats leave the driver\'s out; a drone has none', [VehicleBudget.passengerSeats(4), VehicleBudget.passengerSeats(1), VehicleBudget.passengerSeats(0)], [3, 0, 0]);
  const heavy = VehicleBudget.summary(car({ load: { base: 100, value: 100 } }), [mod('Bench Seat (Vehicle)', '0', '100kg'), mod('ED (Vehicle)', '0', '10kg')]);
  t.ok('over Load: warned', heavy.load.over === 10 && heavy.warnings.some(w => /110 kg; the vehicle's Load is 100 kg — 10 kg over/.test(w)));
  const odd = VehicleBudget.summary(car(), [mod('Internal Missile Mount (Vehicle)', '5', 'weight of the missiles'), mod('External Hardpoint (Vehicle)', '2', '10kg+Weapon')]);
  t.eq('an unread figure is named, the rest still counted', [odd.unread, odd.cf.used, odd.load.used], [['Internal Missile Mount (Vehicle)'], 7, 10]);
  t.ok('…and a mount reminds the GM its weapon weighs extra (R3R p.136)', odd.warnings.some(w => /leaves out the weapon/.test(w)));
  t.eq('the vehicle\'s CURRENT Cargo is the budget (the GM\'s figure)', VehicleBudget.summary(car({ cargo: { base: 10, value: 4 } }), [mod('X', '5', '')]).cf.over, 1);

  /* ── Every shipped mod is read ────────────────────────────────────────────── */
  const unread = [];
  const src = new URL('../packs-src/', import.meta.url);
  for (const pack of readdirSync(src)) {
    const dir = new URL(`${pack}/`, src);
    if (!statSync(dir).isDirectory()) continue;
    for (const f of readdirSync(dir)) {
      const j = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
      for (const d of [j.doc, ...Object.values(j.embedded ?? {}).flat()]) {
        if (d?.type !== 'vehiclemod') continue;
        const r = VehicleBudget.of(d, car().system);
        if (r.cf == null || r.load == null) unread.push(d.name);
      }
    }
  }
  t.eq('only the figures no number can stand for are unread', [...new Set(unread)].sort(),
    ['External Missile Mount (Vehicle)', 'Internal Missile Mount (Vehicle)', 'VAUBAN Missile A.T. (Vehicle)', 'VAUBAN Vehicle A.T. (Vehicle)']);

  /* ── The sheet (source-level) ─────────────────────────────────────────────── */
  const sheet = read('scripts/sheets/SR3EVehicleSheet.js');
  t.ok('the Mods tab totals through VehicleBudget', /const budget = VehicleBudget\.summary\(actor, mods\);/.test(sheet));
  t.ok('…shows CF and Load, marked when over', /CF \$\{budget\.cf\.used\} \/ \$\{budget\.cf\.of\}/.test(sheet) && /Load \$\{budget\.load\.used\} \/ \$\{budget\.load\.of\} kg/.test(sheet) && /sr-budget-over/.test(sheet));
  t.ok('…and its warnings, never a refusal', /budget\.warnings\.map\(w => `<p class="sr-budget-warn">/.test(sheet));
}
