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
  body: 4, armor: 2, handling: 4, handlingOffRoad: 5, pilot: 1, autonav: 1, sensor: 2, ...a }).map(([k, v]) => [k, { base: v, value: v }])) } });
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
  t.eq('a mount, a seat, a firearm: nothing', Object.values(fx(car(), [mod('Small Turret (Vehicle)'), mod('Bench Seat (Vehicle)'), { name: 'Sensors (Vehicle)', type: 'gear', system: { rating: 9 } }]))
    .map(s => s.from.length), [0, 0, 0, 0, 0, 0, 0, 0]);
  t.eq('the typed figure is untouched (it is the base)', fx(car(), [mod('Vehicle Armor (Vehicle)', 6)]).armor.own, 2);
  t.eq('derivedPaths: every stat, attributes to `value`, ECM / ECCM to `derived.ew`',
    VehicleMods.derivedPaths(car(), [mod('Vehicle Armor (Vehicle)', 1)]),
    { 'attributes.armor.value': 3, 'attributes.handling.value': 4, 'attributes.handlingOffRoad.value': 5, 'attributes.pilot.value': 1,
      'attributes.autonav.value': 1, 'attributes.sensor.value': 2, 'derived.ew.ecm': 0, 'derived.ew.eccm': 0 });

  /* ── vehicleStat: what a roll reads ───────────────────────────────────────── */
  const prepared = car({ armor: 2 });
  prepared.system.attributes.armor.value = 5;
  prepared.system.derived = { ew: { ecm: 3 } };
  t.eq('the prepared figure for a modded stat; ECM from derived', [vehicleStat(prepared, 'armor'), vehicleStat(prepared, 'ecm')], [5, 3]);
  const stale = car({ body: 6, speed: 90 });
  stale.system.attributes.body.value = 4;   // a stored value the sheet never updates
  stale.system.attributes.speed.value = 10;
  t.eq('…any other stat is its typed base, never a stale stored value', [vehicleStat(stale, 'body'), vehicleStat(stale, 'speed')], [6, 90]);
  t.is('…no vehicle: 0', vehicleStat(undefined, 'pilot'), 0);

  /* ── The packs carry every name ───────────────────────────────────────────── */
  const names = ['r3', 'sr3', 'sota2'].flatMap(b => { try { return readdirNames(`packs-src/sr3e-${b}-vehicle-mods`); } catch { return []; } });
  t.eq('every EFFECTS name is a shipped mod', Object.keys(EFFECTS).filter(n => !names.includes(n)), []);

  /* ── Source-level: the readers go through vehicleStat ─────────────────────── */
  const files = ['scripts/documents/SR3EActor.js', 'scripts/documents/SR3EItem.js', 'scripts/sheets/SR3EVehicleSheet.js', 'scripts/SR3EVehicleChase.js', 'scripts/SR3EMIJI.js'];
  const bare = files.flatMap(f => read(f).split('\n').map((l, i) => [f, i + 1, l])
    .filter(([, , l]) => /attributes\?\.(armor|pilot|sensor|autonav|handling|handlingOffRoad)\?\.base|\bew\?\.(ecm|eccm)\b|\bew\.(ecm|eccm)\s*\?\?/.test(l)))
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
