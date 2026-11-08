/**
 * The design options catalogue — `scripts/data/design-options.mjs` and its effects in `VehicleDesign.evaluate` · TODO 287,
 * slice 3. Figures from R3R pp.115-121. Rulings (2026-11-08): permanent effects apply; an input per row with the book's
 * suggestion filling a "GM's discretion" figure; restrictions warn.
 */
import { VehicleDesign as V } from '../scripts/data/vehicle-design.mjs';
import { DesignOptions as O, storageCost, amenitiesCost } from '../scripts/data/design-options.mjs';

export const name = 'design-options';

const opt = (id, extra = {}) => ({ ...O.newRow(id), ...extra });
const ev = (chassis, plant, options, extra = {}) => V.evaluate({ chassis, plant, options, ...extra });
const line = (r, label) => r.dp.lines.find(l => l.label === label)?.points;

export async function run(t) {
  t.ok('every option has a page and its three formulas', O.OPTIONS.every(o => /^R3R p\.\d/.test(o.page) && ['dp', 'cf', 'load'].every(k => typeof o[k] === 'function')));
  t.eq('ids are unique', new Set(O.OPTIONS.map(o => o.id)).size, O.OPTIONS.length);
  t.eq('newRow fills the default inputs and leaves the figures blank', O.newRow('airlock'), { id: 'airlock', name: 'Airlock', page: 'R3R p.116', dp: '', cf: '', load: '', persons: 1 });
  t.is('an unknown id has no row', O.newRow('nope'), null);

  // Fixed figures (p.116-118).
  const sub = ev('attack-submarine', 'N', [opt('airlock', { persons: 2 })]);
  t.eq('Airlock: 500 points, 40 + 40 a person CF, 1,000 kg (p.116)', [line(sub, 'Airlock'), sub.options[0].cf, sub.options[0].load], [500, 120, 1000]);
  t.ok('Airlock on a sub: no warning', !sub.warnings.some(w => w.startsWith('Airlock')));
  t.ok('Airlock on a car warns, still priced', ev('sand-buggy', 'G', [opt('airlock')]).warnings.some(w => /Airlock: .*submarines/.test(w)));

  // Body formulas.
  const ballast = ev('sand-buggy', 'G', [opt('ballast')]).options[0];   // Body 2
  t.eq('Ballast tanks: Body² × 10 points, × 2 CF, × 25 kg (p.116)', [ballast.dp, ballast.cf, ballast.load], [40, 8, 100]);
  const tail = ev('jet-fighter', 'JET', [opt('tailhook')]).options[0];
  t.eq('Tailhook: 10% of chassis points, 1 CF per 2 Body (up), Body × 125 kg (p.119)',
    [tail.dp, tail.cf, tail.load], [Math.round(V.chassis('jet-fighter').dp * 0.1), 4, 875]);

  // Hull Factor = 100 × Hull² (p.114; Hull 5 → 2,500).
  const jet = ev('attack-submarine', 'N', [opt('waterjet')]).options[0];
  t.eq('Ducted waterjet: 5,000 × Hull Factor, 4 × CF, 3 × kg (p.116; Hull 5 → Hull Factor 2,500)', [jet.dp, jet.cf, jet.load], [12500000, 10000, 7500]);
  t.eq('Auxiliary engine on a hull: (Hull + Hull Factor) × 2 CF (p.116)', ev('attack-submarine', 'N', [opt('aux-engine')]).options[0].cf, 5010);
  t.eq('Flight deck on a hull: length × Hull Factor (p.119)', ev('attack-submarine', 'N', [opt('flight-deck', { metres: 10 })]).options[0].dp, 25000);
  t.eq('…and Body for a vehicle without a Hull rating', ev('sand-buggy', 'G', [opt('flight-deck', { metres: 10 })]).options[0].dp, 20);
  t.ok('EMD drive on a non-nuclear plant warns', ev('attack-submarine', 'D', [opt('emd')]).warnings.some(w => /nuclear/.test(w)));

  // Inputs per row; GM's figure wins.
  const store = ev('sand-buggy', 'G', [opt('storage', { space: 2 })]).options[0];
  t.eq('Special storage 2 CF: 3 points, 10% CF rounded up, 1 kg per 10 CF (p.118)', [store.dp, store.cf, store.load], [3, 1, 0.2]);
  t.eq('storage bands 1-9 / 10-99 / 100-999 / 1,000+', [storageCost(9), storageCost(10), storageCost(999), storageCost(1000)], [3, 6, 9, 12]);
  const mach = ev('sand-buggy', 'G', [opt('machinery')]).options[0];
  t.eq('Special machinery suggests Body × 2 CF and 25 kg a CF (p.118)', [mach.dp, mach.cf, mach.load], [0, 4, 100]);
  t.eq('the GM\'s typed figure wins over the computed one', ev('sand-buggy', 'G', [opt('machinery', { dp: 40, space: 3 })]).options[0].dp, 40);
  t.is('…and its suggestion stays on the row as computed', ev('sand-buggy', 'G', [opt('machinery', { space: 3 })]).options[0].load, 75);
  t.eq('Living amenities: basic 40 a person, improved 50 + 40, high 100 + 40, partial half one person (p.120)',
    [amenitiesCost('basic', 2), amenitiesCost('improved', 2), amenitiesCost('high', 1), amenitiesCost('high', 0, 1)], [80, 130, 140, 70]);

  // Robots.
  const robot = ev('crawler-medium-tracked', 'E', [opt('robot-pilot', { level: 3 }), opt('neural', { level: 2 }), opt('fuzzy', { level: 1 })]);
  t.eq('Robotic pilot 3: 3³ × 50 = 1,350; neural 3² × 25 × 2 = 450; fuzzy 3 × 100 = 300 (p.120-121)',
    robot.options.map(o => o.dp), [1350, 450, 300]);
  t.ok('a robot option without the robotic pilot warns', ev('crawler-medium-tracked', 'E', [opt('reflexes')]).warnings.some(w => /Robotic-Pilot/.test(w)));
  t.ok('Structural Agility without drive-by-wire warns', ev('sand-buggy', 'G', [opt('agility')]).warnings.some(w => /drive-by-wire/.test(w)));
  t.ok('…and not with it', !ev('sand-buggy', 'G', [opt('agility')], { mods: [{ name: 'Drive-by-Wire', dp: 0 }] }).warnings.some(w => /drive-by-wire/.test(w)));

  // Permanent effects (the maintainer, 2026-11-08: "Apply the permanent ones").
  const base = ev('sand-buggy', 'G', []);
  const hyb = ev('sand-buggy', 'G', [opt('hybrid')]);
  t.eq('Hybrid: Acceleration −2, Signature +1, Economy ×2 (p.117)',
    [hyb.stats.accel, hyb.stats.accelMax, hyb.stats.sig, hyb.stats.economy], [base.stats.accel - 2, base.stats.accelMax - 2, base.stats.sig + 1, base.stats.economy * 2]);
  t.eq('Hybrid: 25% of the plant\'s points, 6 CF, half the starting Load (p.117)', [hyb.options[0].dp, hyb.options[0].cf, hyb.options[0].load], [5, 6, 20]);
  const boat = ev('speedboat', 'G', []);
  const fin = ev('speedboat', 'G', [opt('fin')]);
  t.eq('Fin drive: Speed and Acceleration, start and max, +25% rounded to the nearest (p.117; the maintainer)',
    [fin.stats.speed, fin.stats.speedMax, fin.stats.accel, fin.stats.accelMax],
    [boat.stats.speed, boat.stats.speedMax, boat.stats.accel, boat.stats.accelMax].map(v => Math.round(v * 1.25)));
  t.eq('Fin drive: Street Index +1, Availability +4 (p.117)', [fin.streetIndex, fin.availability.tn], [boat.streetIndex + 1, V.availability(fin.cost).tn + 4]);
  t.ok('Fin drive with smart materials warns', ev('speedboat', 'G', [opt('fin')], { smartMaterials: true }).warnings.some(w => /smart materials/.test(w)));
  const nm = ev('sand-buggy', 'G', [opt('no-manual')]);
  t.eq('Removed manual controls: 50 points, CF +2, Load +10 (p.118)', [line(nm, 'Removed Manual Controls'), nm.cf.total - base.cf.total, nm.load.total - base.load.total], [50, 2, 10]);
  const setup = ev('crawler-medium-tracked', 'E', [opt('setup', { level: 1 })]);
  t.eq('Setup/Breakdown: Body × 5 + Body × 5 a minute; CF maximum halved (p.118)',
    [setup.options[0].dp, setup.cf.max], [20, Math.floor(V.cell(V.chassis('crawler-medium-tracked').maxCf, 2) / 2)]);
  t.ok('Setup/Breakdown past half the base time warns', ev('crawler-medium-tracked', 'E', [opt('setup', { level: 4 })]).warnings.some(w => /no faster/.test(w)));

  t.is("a ship's Hull rating reads as its Body", V.bodyOf(V.chassis('attack-submarine')), 5);

  // Old typed rows still work.
  const typed = ev('sand-buggy', 'G', [{ name: 'Custom', dp: 12, cf: 1, load: 5 }]);
  t.eq('a typed row passes through as typed', [line(typed, 'Custom'), typed.cf.used, typed.load.used], [12, 1, 5]);
  t.ok('options count against CF', ev('sand-buggy', 'G', [opt('ballast')]).warnings.some(w => /CF of/.test(w)));
}
