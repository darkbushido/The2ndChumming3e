/**
 * What a vehicle's mods change — `scripts/data/vehicle-mods.mjs` · TODO 265, step c's last slice.
 *
 * R3R p.131 (Vehicle Armor +1 a level, +1 Handling per 6 added; Ablative +2 a level, Armor no higher than Body), p.132
 * (Concealed Armor, not with standard armor), p.127 (Advanced Drone Pilot, Autonav), p.147 (Sensors), pp.143-145 (ECM, ECCM).
 * The maintainer, 2026-10-27: the mods APPLY, the typed figure stays the base; a rated system gives the HIGHER rating.
 *
 * ⚠ Calls go through `VehicleMods.x(…)`, never a destructured copy, so the mutants can bite.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { VehicleMods, vehicleStat, EFFECTS } from '../scripts/data/vehicle-mods.mjs';

export const name = 'vehicle-mods';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

const car = (a = {}, ew = {}) => ({ system: { ew: { ecm: 0, eccm: 0, ...ew }, attributes: Object.fromEntries(Object.entries({
  body: 4, armor: 2, handling: 4, handlingOffRoad: 5, speed: 100, accel: 10, sig: 4, load: 500, cargo: 10, pilot: 1, autonav: 1, sensor: 2, ...a })
  .map(([k, v]) => [k, { base: v, value: v }])) } });
const typed = (vehicleType, a = {}, extra = {}) => { const v = car(a); Object.assign(v.system, { vehicleType, ...extra }); return v; };
const mod = (name, rating = null) => ({ name, type: 'vehiclemod', system: { rating } });
const fx = (v, items) => VehicleMods.effective(v, items).stats;

export async function run(t) {
  /* ── Armor ────────────────────────────────────────────────────────────────── */
  t.eq('Vehicle Armor 3: Armor 2 → 5, Handling unchanged (p.131)', [fx(car(), [mod('Vehicle Armor (Vehicle)', 3)]).armor.value, fx(car(), [mod('Vehicle Armor (Vehicle)', 3)]).handling.value], [5, 4]);
  const six = fx(car(), [mod('Vehicle Armor (Vehicle)', 6)]);
  t.eq('…6 points added: Handling +1, on- and off-road (a higher Handling is worse)', [six.armor.value, six.handling.value, six.handlingOffRoad.value], [8, 5, 6]);
  t.is('…11 added is still one full 6', fx(car(), [mod('Vehicle Armor (Vehicle)', 11)]).handling.value, 5);
  t.is('…12 is two', fx(car(), [mod('Vehicle Armor (Vehicle)', 12)]).handling.value, 6);
  t.is('Concealed Armor counts the same, its points toward the same 6 (p.132)', fx(car(), [mod('Concealed Armor (Vehicle)', 6)]).handling.value, 5);
  t.ok('…with standard armor: warned, still counted', (r => r.warnings.some(w => /not compatible/.test(w)) && r.stats.armor.value === 2 + 2 + 1)(
    VehicleMods.effective(car(), [mod('Vehicle Armor (Vehicle)', 2), mod('Concealed Armor (Vehicle)', 1)])));
  t.ok('Body 0 carries no vehicle armor: warned', VehicleMods.effective(car({ body: 0 }), [mod('Vehicle Armor (Vehicle)', 1)]).warnings.some(w => /Body 0/.test(w)));
  t.is('a level in the name counts when the rating is blank ("[3]")', fx(car(), [mod('Vehicle Armor (Vehicle) [3]')]).armor.value, 5);

  /* ── Ablative: +2 a level, the Armor raised no higher than Body ─────────── */
  t.is('Ablative 1 on Armor 2, Body 4: → 4', fx(car(), [mod('Ablative Armor (Vehicle)', 1)]).armor.value, 4);
  const abl = VehicleMods.effective(car(), [mod('Ablative Armor (Vehicle)', 3)]);
  t.eq('…level 3 (+6) stops at Body 4, and says so', [abl.stats.armor.value, abl.notes.some(n => /only to the vehicle's Body 4/.test(n))], [4, true]);
  t.is('…an Armor already over Body is never lowered', fx(car({ armor: 6 }), [mod('Ablative Armor (Vehicle)', 2)]).armor.value, 6);
  t.is('…adds no Handling (the per-6 rule is for vehicle and concealed armor)', fx(car({ body: 20 }), [mod('Ablative Armor (Vehicle)', 3)]).handling.value, 4);

  /* ── Rated systems: the higher of the two (the maintainer, 2026-10-27) ──── */
  t.eq('Sensors 5 on a Sensor 2: 5; Autonav 3: 3; Advanced Drone Pilot 4: 4', [
    fx(car(), [mod('Sensors (Vehicle)', 5)]).sensor.value, fx(car(), [mod('Autonavigation System (Vehicle)', 3)]).autonav.value,
    fx(car(), [mod('Advanced Drone Pilot (Vehicle)', 4)]).pilot.value], [5, 3, 4]);
  const low = VehicleMods.effective(car({ sensor: 3 }), [mod('Sensors (Vehicle)', 2)]);
  t.eq('…a lower mod changes nothing, and says so', [low.stats.sensor.value, low.stats.sensor.from, low.notes.length], [3, [], 1]);
  t.eq('ECM / ECCM: from `system.ew`', [fx(car({}, { ecm: 1 }), [mod('ECM (Vehicle)', 3)]).ecm.value, fx(car({}, { eccm: 4 }), [mod('ECCM (Vehicle)', 2)]).eccm.value], [3, 4]);

  /* ── What is not a mod of a number ────────────────────────────────────────── */
  t.ok('a seat, a firearm called "Sensors": nothing', Object.values(fx(car(), [mod('Bench Seat (Vehicle)'), { name: 'Sensors (Vehicle)', type: 'gear', system: { rating: 9 } }]))
    .every(s => s.from.length === 0));
  t.eq('the typed figure is untouched (it is the base)', fx(car(), [mod('Vehicle Armor (Vehicle)', 6)]).armor.own, 2);
  t.eq('derivedPaths: every stat, attributes to `value`, ECM / ECCM to `derived.ew`',
    VehicleMods.derivedPaths(car(), [mod('Vehicle Armor (Vehicle)', 1)]),
    { 'attributes.armor.value': 3, 'attributes.handling.value': 4, 'attributes.handlingOffRoad.value': 5, 'attributes.speed.value': 100,
      'attributes.accel.value': 10, 'attributes.sig.value': 4, 'attributes.load.value': 500, 'attributes.pilot.value': 1,
      'attributes.autonav.value': 1, 'attributes.sensor.value': 2, 'derived.ew.ecm': 0, 'derived.ew.eccm': 0 });

  /* ── Control (R3R pp.129-130) ─────────────────────────────────────────────── */
  const dbw = (r, split = {}) => ({ ...mod('Drive-by-Wire System (Vehicle)', r), system: { rating: r, dbwSplit: split } });
  const w2 = VehicleMods.effective(car(), [dbw(2, { accel: 6, speed: 4 })]);
  t.eq('Drive-by-Wire 2: Handling −2 on- and off-road (ruled 2026-10-27); the split +6% Accel, +4% Speed, once', [w2.stats.handling.value, w2.stats.handlingOffRoad.value, w2.stats.accel.value, w2.stats.speed.value, w2.stats.load.value], [2, 3, 11, 104, 500]);
  t.eq('…the split rounds to the nearest, .5 up (the maintainer, 2026-10-27): 0.6 → 1, 0.3 → 0, 0.5 → 1', [VehicleMods.splitGain(10, 6), VehicleMods.splitGain(10, 3), VehicleMods.splitGain(10, 5)], [1, 0, 1]);
  t.is('…taken after every other change: turbocharging 2 then +10% Speed is 10% of 130 (p.129)', fx(car(), [mod('Turbocharging/Superconductive Drive (Vehicle)', 2), dbw(1, { speed: 10 })]).speed.value, 143);
  t.is('…whichever order the mods are in', fx(car(), [dbw(1, { speed: 10 }), mod('Turbocharging/Superconductive Drive (Vehicle)', 2)]).speed.value, 143);
  t.is('…and is the same at level 3 (not per level)', fx(car(), [dbw(3, { speed: 10 })]).speed.value, 110);
  t.ok('…no split set: a note asks for it', VehicleMods.effective(car(), [dbw(1)]).notes.some(n => /split among Acceleration, Speed and Load/.test(n)));
  t.ok('…over 10%: warned', VehicleMods.effective(car(), [dbw(1, { speed: 8, load: 4 })]).warnings.some(w => /12%/.test(w)));
  t.ok('…level 4: warned (the most is 3)', VehicleMods.effective(car(), [dbw(4)]).warnings.some(w => /the most is 3/.test(w)));
  t.ok('…with improved suspension: warned', VehicleMods.effective(car(), [dbw(1), mod('Improved Suspension (Vehicle)', 1)]).warnings.some(w => /may not be used with drive-by-wire/.test(w)));
  t.eq('Improved Suspension 2: on-road Handling −2 only; a motorcycle’s off-road too', [
    (s => [s.handling.value, s.handlingOffRoad.value])(fx(typed('car'), [mod('Improved Suspension (Vehicle)', 2)])),
    (s => [s.handling.value, s.handlingOffRoad.value])(fx(typed('motorcycle'), [mod('Improved Suspension (Vehicle)', 2)]))], [[2, 5], [2, 3]]);
  t.ok('Improved Control Surfaces on a car: warned (watercraft)', VehicleMods.effective(typed('car'), [mod('Improved Control Surfaces (Vehicle)', 1)]).warnings.some(w => /watercraft/.test(w)));
  const off = fx(car(), [mod('Off-Road Suspension (Vehicle)', 2)]);
  t.eq('Off-Road Suspension 2: off-road −2, on-road +2, Speed −15 once', [off.handlingOffRoad.value, off.handling.value, off.speed.value], [3, 6, 85]);

  /* ── Engine and signature (R3R pp.126, 134-135; SR3 p.307) ────────────────── */
  const turbo = fx(car(), [mod('Turbocharging/Superconductive Drive (Vehicle)', 2)]);
  t.eq('Turbocharging 2: Speed +30, Acceleration +2, Signature −2', [turbo.speed.value, turbo.accel.value, turbo.sig.value], [130, 12, 2]);
  t.ok('…on a helicopter: warned', VehicleMods.effective(typed('helicopter'), [mod('Turbocharging/Superconductive Drive (Vehicle)', 1)]).warnings.some(w => /aircraft/.test(w)));
  t.ok('…past 1.5 × Speed: warned (one level always allowed)', VehicleMods.effective(car({ speed: 40 }), [mod('Turbocharging/Superconductive Drive (Vehicle)', 2)]).warnings.some(w => /1\.5/.test(w))
    && !VehicleMods.effective(car({ speed: 20 }), [mod('Turbocharging/Superconductive Drive (Vehicle)', 1)]).warnings.length);
  t.eq('RAM 3 and Thermal Baffles 2: Signature +5', fx(car(), [mod('Radar-Absorbent Materials (Vehicle)', 3), mod('Thermal Baffles (Vehicle)', 2)]).sig.value, 9);
  t.ok('…RAM 4 warned (the most is 3)', VehicleMods.effective(car(), [mod('Radar-Absorbent Materials (Vehicle)', 4)]).warnings.some(w => /the most is 3/.test(w)));
  const mask = VehicleMods.effective(car(), [mod('Active Thermal Masking (Vehicle)', 1)]);
  t.eq('Active Thermal Masking: shown, not applied — and warned without engine customization', [mask.stats.sig.value, mask.notes.some(n => /while it runs \(55 minutes\)/.test(n)), mask.warnings.some(w => /turbocharging 0/.test(w))], [4, true, true]);
  t.ok('…within the turbocharging’s levels: no warning', !VehicleMods.effective(car(), [mod('Active Thermal Masking (Vehicle)', 1), mod('Turbocharging/Superconductive Drive (Vehicle)', 1)]).warnings.length);
  t.ok('Noisemaker on a car: warned (ships, subs and boats), a note', (r => r.warnings.some(w => /ships, subs and boats/.test(w)) && r.notes.some(n => /\+3/.test(n)))(VehicleMods.effective(typed('car'), [mod('Noisemaker Dispenser (Vehicle)')])));
  const fixedMount = { _id: 'm1', id: 'm1', name: 'External Hardpoint (Vehicle)', type: 'vehiclemod', system: {} };
  const turretMount = { _id: 'm2', id: 'm2', name: 'Small Turret (Vehicle)', type: 'vehiclemod', system: {} };
  t.eq('weapon mounts lower Signature: external fixed −1, each turret −1 (SR3 p.307, R3R p.140; the maintainer, 2026-10-27)',
    fx(car(), [fixedMount, turretMount]).sig.value, 2);

  /* ── Prices worked out on install (the maintainer, 2026-10-27) ─────────────── */
  const priced = typed('car', {}, { cost: 40000 });
  t.eq('drive-by-wire 2: 0.25 × cost a level; turbo 1: 10%; suspension 1: 10%; off-road 1 on a car: 35%',
    [VehicleMods.price(dbw(2), priced), VehicleMods.price(mod('Turbocharging/Superconductive Drive (Vehicle)', 1), priced),
      VehicleMods.price(mod('Improved Suspension (Vehicle)', 1), priced), VehicleMods.price(mod('Off-Road Suspension (Vehicle)', 1), priced)],
    [20000, 4000, 4000, 14000]);
  t.is('RAM: (levels)³ × 25,000¥ — 2 levels 200,000¥', VehicleMods.price(mod('Radar-Absorbent Materials (Vehicle)', 2), priced), 200000);
  t.eq('Thermal Baffles: Body × 5,000¥ a level on a car, × 10,000¥ on a helicopter', [VehicleMods.price(mod('Thermal Baffles (Vehicle)', 2), priced),
    VehicleMods.price(mod('Thermal Baffles (Vehicle)', 1), typed('helicopter', {}, { cost: 1 }))], [40000, 40000]);
  const t1 = mod('Turbocharging/Superconductive Drive (Vehicle)', 2);
  t.eq('Active Thermal Masking: the engine customization × 2, +0.25 a further level', [VehicleMods.price(mod('Active Thermal Masking (Vehicle)', 1), priced, [t1]),
    VehicleMods.price(mod('Active Thermal Masking (Vehicle)', 2), priced, [t1])], [16000, 18000]);
  t.eq('…no vehicle cost, no turbocharging, a drone’s off-road: not priced (the GM prices it)', [VehicleMods.price(dbw(1), car()),
    VehicleMods.price(mod('Active Thermal Masking (Vehicle)', 1), priced), VehicleMods.price(mod('Off-Road Suspension (Vehicle)', 1), typed('drone', {}, { cost: 9 }))], [null, null, null]);
  t.is('…a mod not priced from the vehicle: null', VehicleMods.price(mod('Sensors (Vehicle)', 3), priced), null);
  const hook = read('scripts/sr3e.js');
  t.ok('preCreateItem fills a blank cost on a vehicle from VehicleMods.price', /document\.type !== 'vehiclemod' \|\| Number\(document\.system\?\.cost\) > 0\) return;\s*const price = VehicleMods\.price\(document, vehicle, vehicle\.items\);/.test(hook));

  /* ── vehicleStat: what a roll reads ───────────────────────────────────────── */
  const prepared = car({ armor: 2 });
  prepared.system.attributes.armor.value = 5;
  prepared.system.derived = { ew: { ecm: 3 } };
  t.eq('the prepared figure for a modded stat; ECM from derived', [vehicleStat(prepared, 'armor'), vehicleStat(prepared, 'ecm')], [5, 3]);
  const stale = car({ body: 6, cargo: 12 });
  stale.system.attributes.body.value = 4;   // a stored value the sheet never updates
  stale.system.attributes.cargo.value = 3;
  t.eq('…any other stat is its typed base, never a stale stored value', [vehicleStat(stale, 'body'), vehicleStat(stale, 'cargo')], [6, 12]);
  t.is('…no vehicle: 0', vehicleStat(undefined, 'pilot'), 0);

  /* ── The packs carry every name ───────────────────────────────────────────── */
  const names = ['r3', 'sr3', 'sota2'].flatMap(b => { try { return readdirNames(`packs-src/sr3e-${b}-vehicle-mods`); } catch { return []; } });
  t.eq('every EFFECTS name is a shipped mod', Object.keys(EFFECTS).filter(n => !names.includes(n)), []);

  /* ── Source-level: the readers go through vehicleStat ─────────────────────── */
  const files = ['scripts/documents/SR3EActor.js', 'scripts/documents/SR3EItem.js', 'scripts/sheets/SR3EVehicleSheet.js', 'scripts/SR3EVehicleChase.js', 'scripts/SR3EMIJI.js', 'scripts/SR3ECollision.js'];
  const bare = files.flatMap(f => read(f).split('\n').map((l, i) => [f, i + 1, l])
    .filter(([, , l]) => /attributes\?\.(armor|pilot|sensor|autonav|handling|handlingOffRoad|speed|accel|sig|load)\?\.base|\bew\?\.(ecm|eccm)\b|\bew\.(ecm|eccm)\s*\?\?/.test(l)))
    .map(([f, n]) => `${f}:${n}`);
  t.eq('no roll reads a modded stat\'s typed base (or ECM / ECCM) directly', bare, []);
  t.ok('_prepareVehicle puts the effective figures in value / derived.ew', /_prepareVehicle\(sys, attr\)[\s\S]*?VehicleMods\.effective\(this, this\.items[\s\S]*?attr\[stat\]\.value = r\.value/.test(read('scripts/documents/SR3EActor.js')));
  t.ok('the Stats tab still edits the base', /name="system\.attributes\.\$\{key\}\.base"/.test(read('scripts/sheets/SR3EVehicleSheet.js')));
}

function readdirNames(dir) {
  return readdirSync(new URL(`../${dir}/`, import.meta.url))
    .map(f => JSON.parse(readFileSync(new URL(`../${dir}/${f}`, import.meta.url), 'utf8')).doc.name)
    .map(n => String(n).replace(/\s*\[\d+\]\s*$/, '').replace(/\s*\(Vehicle\)\s*$/i, '').trim());
}
