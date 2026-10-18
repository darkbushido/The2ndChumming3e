/**
 * Aircraft stall speed — scripts/data/stall-speed.mjs, the `stallSpeed` field, the aircraft packs and the migration
 * (rules check 0.7.0, vehicles.md #8, #42, #43, #50).
 *
 *   "Fixed-wing aircraft have two Speed Ratings. The higher number is its maximum safe speed; the lower represents the
 *    aircraft's stall speed, the minimum speed it must maintain to keep flying."                    — SR3 p.132
 *   Rigger 3 Revised, Running Out of Gas: "the pilot must make a Crash Test when the vehicle's speed falls below its
 *    Stall Speed Rating"; a thunderbird's stall speed applies only at 75 m or higher.
 *
 * The model had ONE speed and the packs stored the LOWER number in it (Cessna C750 135, GMC Banshee 250), so the chase's
 * "exceeds the Speed Rating" test treated the stall speed as the maximum safe speed.
 *
 * ⚠ Calls go through `PackFixes070.x(…)` / `StallSpeed.x(…)`, never a destructured copy, so the mutants can bite.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { StallSpeed } from '../scripts/data/stall-speed.mjs';
import { PackFixes070, AIRCRAFT_STALL } from '../scripts/data/pack-corrections-0-7-0.mjs';

export const name = 'aircraft-stall';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = rel => readFileSync(join(ROOT, rel), 'utf8');

/** Every vehicle document in packs-src. */
function vehicles() {
  const out = [];
  const src = join(ROOT, 'packs-src');
  for (const pack of readdirSync(src)) {
    for (const f of readdirSync(join(src, pack))) {
      if (!f.endsWith('.json')) continue;
      const raw = readFileSync(join(src, pack, f), 'utf8');
      if (!raw.includes('"type": "vehicle"')) continue;
      out.push(JSON.parse(raw).doc);
    }
  }
  return out;
}

export async function run(t) {
  /* ── the rule ─────────────────────────────────────────────────────────────────── */
  t.is('stall speed is read as stored', StallSpeed.of({ stallSpeed: 135 }), 135);
  t.is('…0 when the vehicle has none, or the document is old',
    [StallSpeed.of({}), StallSpeed.of({ stallSpeed: 0 }), StallSpeed.of(undefined)].join(), '0,0,0');
  t.ok('135 m/turn on a 135 stall speed is flying (not below it)', !StallSpeed.below(135, 135));
  t.ok('100 m/turn on a 135 stall speed is below it', StallSpeed.below(100, 135));
  t.ok('a parked aircraft (speed 0) is not stalled', !StallSpeed.below(0, 135));
  t.ok('a vehicle with no stall speed never stalls', !StallSpeed.below(10, 0));
  t.ok('the warning names the vehicle, the speeds and the book',
    /Cessna.*100 m\/turn.*135 m\/turn.*SR3 p\.132/.test(StallSpeed.note('Cessna', 100, 135)));

  /* ── the packs: speed is the maximum, stallSpeed the minimum ──────────────────── */
  const all = vehicles();
  const find = (n, page) => all.find(d => d.name === n && (!page || d.system.bookPage === page));
  const cargo = find('Cessna C750(Cargo)');
  t.is('Cessna C750: Speed 135/340 on p.310 — max 340', cargo.system.attributes.speed.base, 340);
  t.is('…value too', cargo.system.attributes.speed.value, 340);
  t.is('…stall 135', cargo.system.stallSpeed, 135);
  const ban = find('GMC Banshee');
  t.is('GMC Banshee: 250/1,000 on p.311 — max 1000', ban.system.attributes.speed.base, 1000);
  t.is('…stall 250', ban.system.stallSpeed, 250);
  const pax = find('Cessna C750(Passenger)');
  t.is('the passenger Cessna matches', `${pax.system.attributes.speed.base}/${pax.system.stallSpeed}`, '340/135');

  // Every aircraft row in the table is in the packs with the stored pair, and no other vehicle claims a stall speed.
  for (const [n, stall, max, page] of AIRCRAFT_STALL) {
    const d = find(n, page);
    t.ok(`${n}: in the packs`, !!d);
    if (!d) continue;
    t.is(`${n}: stall ${stall}, max ${max}`,
      `${d.system.stallSpeed}/${d.system.attributes.speed.base}/${d.system.attributes.speed.value}`, `${stall}/${max}/${max}`);
    t.ok(`${n}: the notes still carry the book's "${stall}(${max})" pair`,
      new RegExp(`Alt-mode Speed/Accel: ${stall}\\(${max}\\)/`).test(d.system.notes));
  }
  const claimed = all.filter(d => (d.system.stallSpeed ?? 0) > 0).length;
  t.is('only the table\'s aircraft carry a stall speed', claimed, AIRCRAFT_STALL.length);

  /* ── the migration ────────────────────────────────────────────────────────────── */
  const old = { name: 'Cessna C750(Cargo)', type: 'vehicle',
    system: { stallSpeed: 0, bookPage: 'sr3.310,r3.180', attributes: { speed: { value: 135, base: 135 } } } };
  const d = PackFixes070.fixActor(old);
  t.is('an owned Cessna still at the shipped 135 becomes max 340 …',
    [d?.['system.attributes.speed.value'], d?.['system.attributes.speed.base']].join(), '340,340');
  t.is('…with stall speed 135', d?.['system.stallSpeed'], 135);
  const done = { ...old, system: { ...old.system, stallSpeed: 135, attributes: { speed: { value: 340, base: 340 } } } };
  t.is('already corrected: nothing to do (idempotent)', PackFixes070.fixActor(done), null);
  const edited = { ...old, system: { ...old.system, attributes: { speed: { value: 200, base: 200 } } } };
  const de = PackFixes070.fixActor(edited);
  t.ok('a GM-edited Speed (200) is left alone', !('system.attributes.speed.base' in (de ?? {})));
  t.is('…but the blank stall speed is still filled', de?.['system.stallSpeed'], 135);
  const kept = PackFixes070.fixActor({ ...old, system: { ...old.system, stallSpeed: 90 } });
  t.is('a stall speed the GM already typed is kept', kept?.['system.stallSpeed'], undefined);
  // The one-letter names are pinned by their book page.
  const lone = { name: 'A', type: 'vehicle',
    system: { stallSpeed: 0, bookPage: 'r3.192', attributes: { speed: { value: 200, base: 200 } } } };
  t.is('"A" on r3.192 migrates', PackFixes070.fixActor(lone)?.['system.attributes.speed.base'], 1000);
  t.is('…a different "A" (another page) is not touched',
    PackFixes070.fixActor({ ...lone, system: { ...lone.system, bookPage: '' } }), null);
  t.is('a ship is never touched', PackFixes070.fixActor({ name: 'Cunard Princess Victoria Liner', type: 'vehicle',
    system: { stallSpeed: 0, attributes: { speed: { value: 50, base: 50 } } } }), null);

  /* ── the wiring ───────────────────────────────────────────────────────────────── */
  t.ok('the vehicle model has a stallSpeed field, default 0',
    /stallSpeed:\s+new NumberField\(\{ integer: true, initial: 0, min: 0 \}\)/.test(read('scripts/data/ActorDataModels.js')));
  t.ok('the vehicle sheet shows an editable Stall Speed beside Speed',
    /_stat\('speed',\s+'Speed'\)\}\s+<div class="attr-block"[^>]*>\s+<span class="attr-label">Stall Speed<\/span>[\s\S]{0,200}name="system\.stallSpeed"/
      .test(read('scripts/sheets/SR3EVehicleSheet.js')));
  const chase = read('scripts/SR3EVehicleChase.js');
  const stallFn = chase.slice(chase.indexOf('async _checkStall'), chase.indexOf('_getParticipantInfo(pid) {'));
  t.ok('the chase checks the stall speed once the speed field is committed',
    /-speed`\)\?\.addEventListener\('change', \(\) => this\._checkStall\(p\)\)/.test(chase));
  t.ok('…warns once and OFFERS the Crash Test (never rolls it)',
    /StallSpeed\.below\(p\.speed, stall\)/.test(stallFn) && /sr-crash-open-btn" data-vehicle-id/.test(stallFn) && !/runCrash\(/.test(stallFn));
  const coll = read('scripts/SR3ECollision.js');
  t.ok('a Braking Test that leaves an aircraft below its stall speed offers the Crash Test too',
    /StallSpeed\.below\(b\.speedAfter, cc\.stallSpeed\)/.test(coll) && /stallSpeed:\s+StallSpeed\.of\(sys\)/.test(coll));
}
