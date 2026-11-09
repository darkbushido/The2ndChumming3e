/**
 * Vehicle weapon mounts — `scripts/data/vehicle-mounts.mjs` and the fire dialog's mount recoil · TODO 234.
 *
 * Rigger 3 Revised p.135 (a hardpoint 2 points, a firmpoint 1, the total no more than Body; heavy weapons and vehicle weapons on
 * hardpoints), p.136 (fixed mounts halve recoil before RC and cancel the heavy double; external mounts Signature −1; conversion
 * kits), p.138 (pintle: a firmpoint, RC 2), p.139 (ring: a hardpoint, RC 6), p.140-141 (turrets: the Weapon Values Table,
 * Signature −1 each, pop-up 1 lower). The maintainer, 2026-10-27: Signature shown, never changed; halving rounds down.
 *
 * ⚠ Calls go through `VehicleMounts.x(…)` / `SR3EItem.recoilTN(…)`, never a destructured copy, so the mutants can bite.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { installGlobals, installGame } from './helpers/foundry.mjs';
import { VehicleMounts, TURRETS } from '../scripts/data/vehicle-mounts.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EItem } = await import('../scripts/documents/SR3EItem.js');

export const name = 'vehicle-mounts';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

const mod = (id, name) => ({ id, name, type: 'vehiclemod', system: {} });
const gun = (id, name, category, mountId = '') => ({ id, name, type: 'firearm', system: { category, mountId } });
const vw = (id, name, weaponType, mountId = '') => ({ id, name, type: 'vehicleweapon', system: { weaponType, mountId } });
const car = (body = 4) => ({ system: { attributes: { body: { base: body, value: body } } } });

export async function run(t) {
  /* ── What a mount is ──────────────────────────────────────────────────────── */
  const k = n => VehicleMounts.kindOf(mod('x', n));
  t.eq('hardpoints 2 points, firmpoints 1 (p.135); both fixed, halving recoil (p.136)',
    ['External Hardpoint (Vehicle)', 'Internal Firmpoint (Vehicle)'].map(n => [k(n).kind, k(n).points, k(n).slot, k(n).external, k(n).halve]),
    [['fixed', 2, 'hardpoint', true, true], ['fixed', 1, 'firmpoint', false, true]]);
  t.eq('a pintle is a firmpoint, RC 2 (p.138); a ring a hardpoint, RC 6 (p.139)',
    [k('Pintle Mount (Vehicle)'), k('Ring Mount(Door Mount) (Vehicle)')].map(x => [x.kind, x.points, x.rc, x.halve]), [['pintle', 1, 2, false], ['ring', 2, 6, false]]);
  t.eq('turrets: the Weapon Values Table (p.140)', Object.entries(TURRETS).map(([s, x]) => [s, x.points, x.weaponValue]),
    [['micro', 1, 1], ['mini', 2, 2], ['small', 4, 3], ['medium', 6, 6], ['large', 8, 8], ['xl', 10, 10]]);
  t.eq('…read from the pack names, the misspelt "Extra-larget" and "Ex-Large" included',
    ['Mini-Turret (Vehicle)', 'Remote Small Turret(Anti-Air) (Vehicle)', 'Extra-larget Turret (Vehicle)', 'Remote Ex-Large Turret (Vehicle)'].map(n => [k(n).size, k(n).remote]),
    [['mini', false], ['small', true], ['xl', false], ['xl', true]]);
  t.eq('a pop-up turret is 1 Weapon Value lower; a pop-up micro-turret stays 1 (p.141)',
    [k('Medium Turret(Pop-Up) (Vehicle)').weaponValue, k('Remote Micro Turret(Pop-Up) (Vehicle)').weaponValue], [5, 1]);
  t.eq('missile mounts and other mods are not weapon mounts', [k('External Missile Mount (Vehicle)'), k('ECM (Vehicle)')], [null, null]);

  /* ── Every shipped mount is read ──────────────────────────────────────────── */
  const names = new Set();
  const src = new URL('../packs-src/', import.meta.url);
  for (const pack of readdirSync(src)) {
    const dir = new URL(`${pack}/`, src);
    if (!statSync(dir).isDirectory()) continue;
    for (const f of readdirSync(dir)) {
      const j = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
      for (const d of [j.doc, ...Object.values(j.embedded ?? {}).flat()]) {
        if (d?.type === 'vehiclemod' && /turret|hardpoint|firmpoint|pintle|ring mount/i.test(d.name)) names.add(d.name);
      }
    }
  }
  t.eq('every shipped turret, hard/firmpoint, pintle and ring mount is a mount', [...names].filter(n => !k(n)), []);
  t.is('…all 35 shipped names (so the sweep is not empty)', names.size, 35);

  /* ── Weapon Values and hardpoints ─────────────────────────────────────────── */
  t.eq('Weapon Values (p.140): SMG 1, LMG 1.5, MMG 2, assault cannon 3; Vanquisher 2.5; pistols not in the table',
    [gun('', 'X', 'SMG'), gun('', 'X', 'LMG'), gun('', 'X', 'MMG'), gun('', 'X', 'ACan'), gun('', 'GE Vanquisher', 'MinG'), gun('', 'X', 'HPist')].map(w => VehicleMounts.weaponValue(w)),
    [1, 1.5, 2, 3, 2.5, null]);
  t.eq('…vehicle weapons by type, railguns by name', [vw('', 'X', 'Autocannon'), vw('', 'Light Railgun', 'Railgun'), vw('', 'Heavy Railgun', 'Railgun'), vw('', 'X', 'Lure Launcher')].map(w => VehicleMounts.weaponValue(w)),
    [3, 5, 10, null]);
  t.eq('the Vanquisher and Vengeance as the packs carry them — vehicle weapons typed HMG and MMG — are 2.5 (p.140)',
    [vw('', 'Ares Vanquisher Minigun', 'HMG'), vw('', 'Ares Vengeance Minigun', 'MMG'), vw('', 'X', 'HMG')].map(w => VehicleMounts.weaponValue(w)), [2.5, 2.5, 2]);
  t.eq('hardpoints for MMG and larger and every vehicle weapon; LMGs and small arms may use firmpoints (p.135)',
    [gun('', 'X', 'MMG'), gun('', 'X', 'ACan'), vw('', 'X', 'Autocannon'), gun('', 'X', 'LMG'), gun('', 'X', 'AsRf')].map(w => VehicleMounts.needsHardpoint(w)),
    [true, true, true, false, false]);

  /* ── The vehicle's mounts ─────────────────────────────────────────────────── */
  const items = [mod('hp', 'External Hardpoint (Vehicle)'), mod('fp', 'Internal Firmpoint (Vehicle)'), mod('tu', 'Small Turret (Vehicle)'),
    gun('g1', 'Ingram Valiant', 'LMG', 'fp'), gun('g2', 'Ultimax MMG', 'MMG', 'tu'), vw('v1', 'Vanquisher Autocannon', 'Autocannon', 'tu')];
  const s = VehicleMounts.summary(car(4), items);
  t.eq('points: 2 + 1 + 4 against Body 4 — 3 over (p.135)', [s.points.used, s.points.of, s.points.over], [7, 4, 3]);
  t.ok('…warned, citing the page', s.warnings.some(w => /take 7 points .* Body is 4 — 3 over \(R3R p\.135\)/.test(w)));
  t.eq('the turret carries MMG 2 + autocannon 3 = 5 of its 3 — warned (p.140)', s.mounts.find(m => m.id === 'tu').weaponValueUsed, 5);
  t.ok('…', s.warnings.some(w => /Small Turret \(Vehicle\) carries Weapon Value 5; it takes 3/.test(w)));
  t.ok('a personal firearm on a fixed mount or turret is reminded of the conversion kit (p.136)',
    s.notes.some(n => /Ultimax MMG on Small Turret.*conversion kit/.test(n)) && s.notes.some(n => /Ingram Valiant on Internal Firmpoint.*conversion kit/.test(n)));
  t.eq('Signature: external mounts −1 once, the turret −1 (applied by vehicle-mods.mjs — SR3 p.307)', s.signature.reduction, 2);
  t.ok('…and the internal mount\'s −1 while its weapon is out, as a note', s.signature.notes.some(n => /internal mount's weapon is out/.test(n)));
  const heavyOnFirm = VehicleMounts.summary(car(6), [mod('fp', 'External Firmpoint (Vehicle)'), gun('g', 'Ultimax MMG', 'MMG', 'fp')]);
  t.ok('a heavy weapon on a firmpoint is warned (p.135)', heavyOnFirm.warnings.some(w => /Ultimax MMG is on External Firmpoint.*need a hardpoint/.test(w)));
  const ring = VehicleMounts.summary(car(6), [mod('r', 'Ring Mount (Vehicle)'), vw('v', 'Autocannon', 'Autocannon', 'r'), gun('g', 'Ultimax', 'MMG', 'r')]);
  t.eq('a ring takes a man-portable MMG, not a vehicle weapon (p.139); no conversion kit for it',
    [ring.warnings.filter(w => /ring mount takes/.test(w)).length, ring.notes.filter(n => /conversion kit/.test(n)).length], [1, 0]);
  const pop = VehicleMounts.summary(car(6), [mod('p', 'Mini-Turret(Pop-Up) (Vehicle)')]);
  t.eq('a pop-up turret costs no Signature while concealed — a note instead', [pop.signature.reduction, pop.signature.notes.some(n => /pop-up/.test(n))], [0, true]);
  const orphan = VehicleMounts.summary(car(6), [gun('g', 'Lost Gun', 'LMG', 'gone'), mod('fp', 'External Firmpoint (Vehicle)')]);
  t.ok('a weapon naming a mount no longer there is warned', orphan.warnings.some(w => /Lost Gun names a mount that is not on this vehicle/.test(w)));
  t.eq('a vehicle with no mounts has nothing to say', (({ points, warnings, notes }) => [points.used, warnings, notes])(VehicleMounts.summary(car(4), [gun('g', 'X', 'SMG')])), [0, [], []]);

  /* ── Recoil on a mount ────────────────────────────────────────────────────── */
  t.eq('fixed and turret: halve; pintle RC 2; ring RC 6; unmounted: nothing',
    [['hp', 'External Hardpoint (Vehicle)'], ['tu', 'Mini-Turret (Vehicle)'], ['pi', 'Pintle Mount (Vehicle)'], ['ri', 'Ring Mount (Vehicle)']]
      .map(([id, n]) => VehicleMounts.recoilFor([mod(id, n)], gun('g', 'G', 'LMG', id))).map(r => [r.halve, r.rc]),
    [[true, 0], [true, 0], [false, 2], [false, 6]]);
  t.is('…', VehicleMounts.recoilFor([mod('hp', 'External Hardpoint (Vehicle)')], gun('g', 'G', 'LMG')), null);

  const r = o => SR3EItem.recoilTN(o);
  t.is('an MMG firing 10 rounds, comp 6, on foot: (10 − 6) × 2 = 8 (SR3 p.111)', r({ mode: 'FA', roundsThisShot: 10, totalComp: 6, isHeavy: true }), 8);
  t.is('…on a fixed mount: ⌊10 ÷ 2⌋ − 6 = 0, the double cancelled (R3R p.136)', r({ mode: 'FA', roundsThisShot: 10, totalComp: 6, isHeavy: true, halve: true }), 0);
  t.is('…a burst on a turret, no comp: ⌊3 ÷ 2⌋ = 1 — rounded down (the maintainer)', r({ mode: 'BF', totalComp: 0, halve: true }), 1);
  t.is('…a heavy burst halved: 1, not 2', r({ mode: 'BF', totalComp: 0, isHeavy: true, halve: true }), 1);
  t.is('…a shotgun burst keeps its own double (only the heavy one is cancelled)', r({ mode: 'BF', totalComp: 0, isShotgun: true, halve: true }), 2);

  /* ── The fire dialog and the sheet (source-level) ─────────────────────────── */
  const item = read('scripts/documents/SR3EItem.js');
  t.ok('the fire dialog asks the vehicle for the gun\'s mount', /actor\.type === 'vehicle' \? VehicleMounts\.recoilFor\(actor\.items, weapon\) : null/.test(item));
  t.ok('…passes halve to every recoil it computes', /totalComp, isHeavy, isShotgun, halve \}\)/.test(item)
    && (item.match(/halve: !!fireModeResult\.halve/g) ?? []).length === 2);
  t.ok('…adds the mount\'s RC from its own box, into both totals', /aComp \+ wComp \+ mComp/.test(item)
    && (item.match(/\+ \(fireModeResult\.mountComp \?\? 0\)/g) ?? []).length === 2);
  t.ok('…never writes the mount\'s RC back to the gun or the vehicle', !/update\(\{[^}]*mountComp/.test(item));
  const sheet = read('scripts/sheets/SR3EVehicleSheet.js');
  t.ok('the Weapons tab picks each weapon\'s mount, writing system.mountId', /_mountPicker\(actor, w\)/.test(sheet) && /update\(\{ 'system\.mountId': sel\.value \}\)/.test(sheet));
  t.ok('the Mods tab shows the mounts through VehicleMounts.summary', /VehicleMounts\.summary\(actor, actor\.items\)/.test(sheet));
  t.ok('…the Signature applied to the rolls, never written into the typed Sig', /Applied to the vehicle's Signature/.test(sheet) && !/'system\.attributes\.sig/.test(sheet.slice(sheet.indexOf('_mountsSummary'))));
  const models = read('scripts/data/ItemDataModels.js');
  t.is('mountId on firearms and vehicle weapons', (models.match(/mountId: +new StringField\(\{ initial: '', blank: true \}\)/g) ?? []).length, 2);
}
