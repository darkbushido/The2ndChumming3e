/**
 * R3R *Vehicle Design* — `scripts/data/vehicle-design.mjs` and its tables · TODO 287, slice 1.
 *
 * The fixtures are the book's two worked examples (R3R pp.109-114): Steffi's Light Strike Vehicle and Rich's Brickyard
 * Beauty. Where the book's own arithmetic disagrees with its itemised steps, the test follows the steps and says so.
 */
import { CHASSIS, POWER_PLANTS, PLANTS, NOTES } from '../scripts/data/vehicle-design-tables.mjs';
import { VehicleDesign as V, RATES, CLASSES } from '../scripts/data/vehicle-design.mjs';

export const name = 'vehicle-design';

const lsv = (extra = {}) => V.evaluate({
  chassis: 'sand-buggy', plant: 'G', improve: { handlingOffRoad: 1, accel: 2, cargo: 2, load: 30 },
  mods: [{ name: 'Roll Bars', dp: 0 }, { name: 'Electronics Port', dp: 10 }, { name: 'Ring Mount', dp: 10, cf: 1, load: 15 }, { name: 'Pintle Mount', dp: 1 }],
  vehicleClass: 'security', ...extra,
});
const brickyard = (extra = {}) => V.evaluate({
  chassis: 'sports-car', plant: 'G', smartMaterials: true, improve: { accel: 11, speed: 151, handling: 1 },
  freed: { cf: 6, load: 100 },
  mods: [{ name: 'Nitrous Oxide Injectors 6', dp: 330, cf: 1.5, load: 15 }, { name: 'Rigger Adaptation', dp: 35 },
    { name: 'Sensors 1', dp: 75, cf: 1, load: 10 }, { name: 'Crash Cage', dp: 40, load: 10 }],
  markUpExtra: 0.5, vehicleClass: 'luxury', ...extra,
});

export async function run(t) {
  /* ── The tables (R3R pp.194-205) ──────────────────────────────────────────── */
  const ids = new Set(CHASSIS.map(c => c.id));
  t.is('every chassis id is unique', ids.size, CHASSIS.length);
  t.eq('every Power Plant row names chassis that exist', POWER_PLANTS.flatMap(p => p.chassis.filter(c => !ids.has(c))), []);
  t.eq('every Power Plant row id is unique', POWER_PLANTS.map(p => p.id).filter((x, i, a) => a.indexOf(x) !== i), []);
  t.ok('every row names a known plant', POWER_PLANTS.every(p => PLANTS[p.plant]));
  const used = new Set(POWER_PLANTS.flatMap(p => p.chassis));
  t.eq('only the unpowered chassis (trailers, barge, rail cars) have no plant', [...ids].filter(i => !used.has(i)).sort(),
    ['barge', 'rail-car-freight', 'rail-car-long-passenger', 'rail-car-short-passenger', 'trailer-20ft', 'trailer-40ft', 'trailer-53ft', 'trailer-heavy-axle', 'trailer-light-axle']);
  t.ok('drones and vehicles share the table (the maintainer, 2026-11-07)', CHASSIS.some(c => c.drone) && CHASSIS.some(c => !c.drone));
  t.ok('every row carries its printed page', [...CHASSIS, ...POWER_PLANTS].every(r => /^R3R p\.\d+$/.test(r.page)));
  const sb = V.chassis('sand-buggy');
  t.eq('Sand buggy as the example reads it (p.109): Handling 4/4, Body 2, Armor 0, CF 4 of 35, 40 points, Mark-Up 0.40',
    [sb.handling, sb.body, sb.armor, sb.cf, sb.maxCf, sb.dp, sb.markUp], ['4/4', 2, 0, 4, 35, 40, 0.40]);
  const g = V.plantsFor('sand-buggy', 'G')[0];
  t.eq('…its gasoline engine (p.111): Speed 90 (120), Accel 6 (9), Load 40 (400), Sig 3, Economy 8 (12), 20 points',
    [g.speed, g.speedMax, g.accel, g.accelMax, g.load, g.loadMax, g.sig, g.econ, g.econMax, g.dp], [90, 120, 6, 9, 40, 400, 3, 8, 12, 20]);
  const sc = V.plantsFor('sports-car', 'G')[0];
  t.eq('Sports car gasoline (p.111): Speed 160 (270), Accel 10 (18), Load 40 (260), Sig 2, Economy 6 (10), 70 points',
    [sc.speed, sc.speedMax, sc.accel, sc.accelMax, sc.load, sc.loadMax, sc.sig, sc.econ, sc.econMax, sc.dp], [160, 270, 10, 18, 40, 260, 2, 6, 10, 70]);
  t.eq('Sports car chassis: 125 points, Mark-Up 1.0 (p.109, p.114)', [V.chassis('sports-car').dp, V.chassis('sports-car').markUp], [125, 1.0]);
  t.ok('the book discrepancies found while transcribing are recorded for the maintainer', NOTES.length >= 4);

  /* ── Reading a cell ───────────────────────────────────────────────────────── */
  t.eq('Body formulas', [V.cell('5xB', 2), V.cell('50-(5xB)', 3), V.cell('10+(20xB)', 1), V.cell('1.2÷B', 3), V.cell('5+(35xB)', 2)], [10, 35, 30, 0.4, 75]);
  t.eq('pairs keep the first figure: submarine surface/submerged, a ship\'s "25 (15)", Signature "6/4"', [V.cell('30/25'), V.cell('25 (15)'), V.cell('6/4'), V.cell('(10-B)/(8-B)', 2)], [30, 25, 6, 8]);
  t.eq('an aircraft pair is stall/Speed (p.116)', [V.cell('20/60', 0, { speedPair: true }), V.stall('20/60'), V.cell('20xB/80', 2, { speedPair: true }), V.stall('20xB/80', 2)], [60, 20, 80, 40]);
  t.eq('blank and unreadable are null, never 0', [V.cell(null), V.cell(''), V.cell('2+'), V.cell('abc'), V.cell('—')], [null, null, null, null, null]);
  t.eq('Handling "4/8" and a single figure', [V.handling('4/8'), V.handling(5), V.handling(null)], [{ on: 4, off: 8 }, { on: 5, off: 5 }, null]);

  /* ── The rates (R3R p.115-116) ────────────────────────────────────────────── */
  t.eq('Acceleration 25 a point (the OCR reads "2.5"; the page and both examples say 25), Speed 2, Handling 25', [RATES.accel, RATES.speed, RATES.handling], [25, 2, 25]);
  t.eq('Handling improves to half the chassis\' figure, rounded UP (p.115)', [V.handlingFloor(4), V.handlingFloor(8), V.handlingFloor(3), V.handlingFloor(5)], [2, 4, 2, 3]);
  t.eq('Cargo 1 point per 0.2 CF; Load 1 per 10 kg, 1 per kg at Body 0', [V.cargoCost(2), V.cargoCost(0.5), V.loadCost(30, 2), V.loadCost(30, 0), V.loadCost(25, 1)], [10, 3, 3, 30, 3]);
  t.eq('Signature (levels)⁴ × 200 (p.116)', [V.signatureCost(1), V.signatureCost(2), V.signatureCost(0)], [200, 3200, 0]);
  t.eq('smart materials raise a maximum 15%, to the nearest (p.118: 270 → 311, 18 → 21, 260 → 299)', [V.smartMax(270), V.smartMax(18), V.smartMax(260)], [311, 21, 299]);

  /* ── Final cost (R3R p.113) ───────────────────────────────────────────────── */
  t.is('Design Points × Mark-Up × 100: 169 × 0.40 → 6,760¥ (the example)', V.cost(169, 0.40), 6760);
  t.is('…with the GM\'s +0.5 for a one-off: 1,402 × 1.5 → 210,300¥ (the example)', V.cost(1402, 1.0, 0.5), 210300);
  t.eq('Availability = cost ÷ 20,000 rounded UP, the same in days; the floor is 2/24 hrs (the maintainer, 2026-11-07)', [V.availability(6760).text, V.availability(30000).text, V.availability(210300).text, V.availability(40001).tn], ['2/24 hrs', '2/2 days', '11/11 days', 3]);
  t.eq('…in hours: 2/2 days is 2/48 hrs, never under 24', [V.availability(30000).hours, V.availability(0).hours], [48, 24]);
  t.eq('…+4 luxury, +6 security, +10 military, to both the number and the days (the maintainer, 2026-11-07)', ['luxury', 'security', 'military'].map(c => V.availability(6760, c).text), ['6/5 days', '8/7 days', '12/11 days']);
  t.eq('…over 30 is out of reach', [V.availability(620000).outOfReach, V.availability(580000).outOfReach], [true, false]);
  t.eq('Street Index by class (standard 1, luxury 2, security 2, military 3)', Object.values(CLASSES).map(c => c.streetIndex), [1, 2, 2, 3]);

  /* ── The Light Strike Vehicle (pp.109-113) ────────────────────────────────── */
  const a = lsv();
  t.is('LSV: 40 + 20 + 25 + 50 + 10 + 3 = 148, + mods 21 = 169 points (the book prints the mods as "11" but adds 21)', a.dp.total, 169);
  t.eq('LSV: off-road Handling 4 → 3, Accel 8, Speed 90', [a.stats.handling, a.stats.handlingOffRoad, a.stats.accel, a.stats.speed], [4, 3, 8, 90]);
  t.is('LSV: Cargo 4 + 2 − the ring mount\'s 1 = 5 (the example)', a.stats.cargo, 5);
  t.eq('LSV: 6,760¥, Street Index 2 (security), 13,520¥ (the example)', [a.cost, a.streetIndex, a.price], [6760, 2, 13520]);
  t.eq('LSV: no warnings', a.warnings, []);
  t.is('LSV as standard: Availability 2/24 hrs — the floor (the book prints 2/2 days)', lsv({ vehicleClass: 'standard' }).availability.text, '2/24 hrs');

  /* ── The Brickyard Beauty (pp.111-114) ────────────────────────────────────── */
  const b = brickyard();
  t.is('Brickyard: 125 + 70 + 100 + 275 + 302 + 25 = 897, + mods 480 = 1,377 (the book says 1,401/1,402 — its steps add to 1,377)', b.dp.total, 1377);
  t.eq('Brickyard: Speed 311, Accel 21 — the smart-materials maxima, so no warning', [b.stats.speed, b.stats.speedMax, b.stats.accel, b.stats.accelMax, b.warnings], [311, 311, 21, 21, []]);
  t.eq('Brickyard: Handling 4 −1 (smart) −1 (bought) = 2, off-road 8 −1 = 7', [b.stats.handling, b.stats.handlingOffRoad], [2, 7]);
  t.is('Brickyard: Cargo 3 + 6 freed − 2.5 = 6.5 (the example\'s stat block)', b.stats.cargo, 6.5);
  t.is('Brickyard: Load maximum 299 with smart materials (the example)', b.load.max, 299);
  t.is('Brickyard: Street Index luxury 2 + smart materials 1 = 3 (the example)', b.streetIndex, 3);
  t.is('Brickyard: Mark-Up 1.0 + 0.5', b.markUp, 1.5);

  /* ── Warn, never refuse ───────────────────────────────────────────────────── */
  const over = V.evaluate({ chassis: 'sand-buggy', plant: 'G', improve: { accel: 5, handling: 3, cargo: 40 } });
  t.ok('over the plant\'s Acceleration maximum is warned, and still computed', over.stats.accel === 11 && over.warnings.some(w => /Acceleration 11 is over the maximum 9/.test(w)));
  t.ok('Handling below half the chassis\' figure is warned', over.warnings.some(w => /Handling 1 is below/.test(w)));
  t.ok('Cargo over the chassis maximum is warned', over.warnings.some(w => /Cargo 44 CF is over the chassis maximum 35/.test(w)));
  const full = V.evaluate({ chassis: 'sports-car', plant: 'G', mods: [{ name: 'Big', dp: 1, cf: 5, load: 50 }] });
  t.ok('mods past the CF and Load are warned (p.111)', full.warnings.some(w => /take 5 CF of 3/.test(w)) && full.warnings.some(w => /take 50 kg of 40 kg/.test(w)));
  const jet = V.evaluate({ chassis: 'atv', plant: 'JET:Sports Car' });
  t.ok('a plant the chassis is not listed under is warned, not refused (p.110)', jet.warnings.some(w => /not listed for All-Terrain Vehicle/.test(w)) && jet.dp.total > 0);
  t.ok('a plant code with no row for the chassis is warned', V.evaluate({ chassis: 'atv', plant: 'N' }).warnings.some(w => /No Nuclear row/.test(w)));
  t.ok('a Mark-Up modifier outside 0-3 is warned', V.evaluate({ chassis: 'sedan', plant: 'G', markUpExtra: 5 }).warnings.some(w => /Mark-Up modifier of 5/.test(w)));
  t.eq('no chassis: nothing computed, one warning', V.evaluate({}).warnings.length, 1);

  /* ── Drones, Body formulas and aircraft ───────────────────────────────────── */
  const crawler = V.evaluate({ chassis: 'crawler-medium-tracked', plant: 'G' });
  t.eq('a Body 2 tracked crawler on gasoline: Load 5×B = 10, Sig 6−B = 4, 5+(20×B) = 45 points + 120 chassis', [crawler.stats.load, crawler.stats.sig, crawler.dp.total], [10, 4, 165]);
  const uav = V.evaluate({ chassis: 'uav-fixed-small', plant: 'G', improve: { speed: 10 } });
  t.eq('a small fixed-wing UAV on gasoline: stall 20, Speed 50 + 10, max 150', [uav.stats.stall, uav.stats.speed, uav.stats.speedMax], [20, 60, 150]);
  const sub = V.evaluate({ chassis: 'minisub-light', plant: 'D' });
  t.eq('a submarine keeps no stall speed', sub.stats.stall, null);
}
