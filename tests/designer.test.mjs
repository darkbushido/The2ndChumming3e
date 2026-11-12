/**
 * The web gear designer · TODO 298 (docs/web-designer-proposal.md): the design codec, the one assemble path the page and
 * Foundry share, the stats-only catalogue (an allow-list — nothing else may reach a public page), and the Foundry wiring.
 */
import { readFileSync } from 'node:fs';
import { GearDesign, LIMITS } from '../scripts/data/gear-design.mjs';
import { VehicleDesign } from '../scripts/data/vehicle-design.mjs';
import { VehicleDesignActor } from '../scripts/data/vehicle-design-actor.mjs';
import { catalogue, publicDoc, moduleClosure, ratingTable, FIELDS, RATING_FIELDS, designerCss } from '../tools/build-designer.mjs';

export const name = 'designer';
const src = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

export async function run(t) {
  const cat = catalogue();
  const items = cat.items;
  const lookup = ref => items[ref] ?? null;
  const find = (kind, re) => Object.keys(items).find(r => items[r].kind === kind && re.test(items[r].name));

  /* ── The catalogue: stats only ─────────────────────────────────────────────── */
  t.ok('the catalogue has firearms, accessories and ammo', ['firearm', 'mod', 'ammo'].every(k => Object.values(items).some(i => i.kind === k)));
  const leaks = [];
  for (const [ref, it] of Object.entries(items)) {
    for (const k of Object.keys(it)) if (!['kind', ...FIELDS.top, 'img', 'system', 'flags'].includes(k)) leaks.push(`${ref}.${k}`);
    for (const k of Object.keys(it.system)) if (!FIELDS[it.kind].includes(k)) leaks.push(`${ref}.system.${k}`);
    for (const m of it.system.installed ?? []) for (const k of Object.keys(m.system)) if (!FIELDS.mod.includes(k)) leaks.push(`${ref} installed .${k}`);
  }
  t.eq('no field outside the allow-list reaches the page', leaks.slice(0, 5), []);
  t.ok('an icon is only a path into the page’s own icons/ folder', Object.values(items).every(i => i.img === undefined || /^icons\/[\w-]+\.(svg|webp|png)$/.test(i.img)));
  t.ok('no description or notes text anywhere in the catalogue', !/"(description|notes)"/.test(JSON.stringify(cat)));
  t.ok('the build never reads SR-OCR', !/readFileSync\([^)]*SR-OCR|join\([^)]*'SR-OCR'/.test(src('tools/build-designer.mjs')));
  t.eq('a mod whose mount is only in its description still publishes it', publicDoc({ _id: 'x', name: 'Silencer (Weapon)', type: 'gear',
    system: { modFor: 'weapon', description: '<p><strong>Mount:</strong> Barrel</p>', cost: 500 } }).system, { cost: 500, modFor: 'weapon', mount: 'Barrel' });
  const table = await ratingTable();
  t.ok('the published rating table holds only weapon, ammunition and vehicle-mod rows', Object.keys(table).every(k => /^(weapon|ammunition|vehicle)\|/.test(k)));
  t.ok('…and only stat fields', Object.values(table).every(lv => Object.values(lv).every(row => Object.keys(row).every(f => RATING_FIELDS.includes(f)))));

  const css = designerCss();
  t.ok('the page gets the window’s colour tokens and the vd-* block', css.includes('--sr-bg') && css.includes('.vd-wizard'));
  const b = src('tools/build-designer.mjs');
  t.ok('the build ships both wizard views', b.includes("moduleClosure('vehicle-designer-view.mjs')") && b.includes("moduleClosure('weapon-designer-view.mjs')"));
  const app = src('designer/app.js');
  t.ok('the page renders the shared wizards, not its own markup', app.includes('WeaponDesignerView.html(') && app.includes('VehicleDesignerView.html('));
  t.ok('the Foundry window renders the same vehicle view', src('scripts/SR3EVehicleDesigner.js').includes('VehicleDesignerView.html('));
  const allMods = [...new Set([...moduleClosure(), ...moduleClosure('vehicle-designer-view.mjs'), ...moduleClosure('weapon-designer-view.mjs')])];
  t.eq('no wizard module touches a Foundry global', allMods.filter(f => /(?<![.\w])(?:game|foundry|ui|Hooks|CONFIG)\.\w/.test(src(`scripts/data/${f}`).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''))), []);

  /* ── One shared core, no Foundry in it ─────────────────────────────────────── */
  const mods = moduleClosure();
  t.ok('the page runs gear-design.mjs and what it imports', mods[0] === 'gear-design.mjs' && mods.includes('item-mods.mjs'));
  const foundryish = mods.filter(f => /\b(?:game|foundry|ui|Hooks|CONFIG)\.\w/.test(src(`scripts/data/${f}`).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')));
  t.eq('no shared module touches a Foundry global', foundryish, []);

  /* ── The codec ─────────────────────────────────────────────────────────────── */
  const pred = find('firearm', /^Ares Predator$/), silencer = find('mod', /^Silencer/), smart = find('mod', /^Smartgun, internal/);
  const ammo = Object.keys(items).find(r => items[r].kind === 'ammo' && items[r].system.rounds > 0 && items[r].system.cost > 0 && !items[r].system.reloads);
  const d = { ...GearDesign.blank('0.8.0'), name: 'Test gun', base: pred, mods: [{ ref: silencer }, { ref: smart }], ammo: [{ ref: ammo, qty: 3 }] };
  const payload = await GearDesign.encode(d);
  t.ok('the payload is URL-safe', /^[A-Za-z0-9_-]+$/.test(payload));
  t.eq('a link round-trips', (await GearDesign.parse(`https://x.github.io/designer/v0.8.0/#d=${payload}`)).design.mods, d.mods);
  t.eq('the bare payload too', (await GearDesign.parse(payload)).design.base, pred);
  t.eq('the JSON file too', (await GearDesign.parse(JSON.stringify(d))).design.ammo, d.ammo);
  let threw = false;
  try { await GearDesign.parse('hello world'); } catch { threw = true; }
  t.ok('text that is no design at all cannot be read', threw);

  /* ── Untrusted input is clamped, never trusted ─────────────────────────────── */
  const n = GearDesign.normalise({ format: 'sr3e-design', schema: 1, kind: 'weapon', base: '../../etc', name: '<b>x</b>',
    mods: [...Array(20)].map(() => ({ ref: silencer, rating: 999 })), ammo: [{ ref: ammo, qty: -5 }, { ref: 'bad ref' }], claimed: { cost: 'cheap' } });
  t.is('a malformed base is dropped', n.design.base, '');
  t.is('the name loses markup', n.design.name, 'bx/b');
  t.is('mods are capped', n.design.mods.length, LIMITS.mods);
  t.is('a rating is clamped', n.design.mods[0].rating, LIMITS.rating);
  t.is('a quantity is at least 1', n.design.ammo[0].qty, 1);
  t.is('a malformed ammo ref is skipped', n.design.ammo.length, 1);
  t.eq('a non-number claim is dropped', n.design.claimed, {});
  t.ok('…and every problem is said', n.warnings.length >= 3, n.warnings.join(' | '));

  /* ── assemble: the system's rules, recomputed ──────────────────────────────── */
  let k = 0;
  const r = await GearDesign.assemble(d, lookup, { newId: () => `id${++k}` });
  const base = items[pred].system, a = items[ammo].system;
  t.is('the weapon is renamed', r.weapon.name, 'Test gun');
  t.is('both mods are installed inside it', r.weapon.system.installed.filter(m => !m.flags?.The2ndChumming3e?.integral).length, 2);
  t.is('an internal smartgun added later costs the gun\'s price (SR3 p.281)', r.weapon.system.installed.find(m => /^Smartgun/.test(m.name)).system.cost, base.cost);
  t.is('the total is base + mods + ammo', r.totals.cost, base.cost + items[silencer].system.cost + base.cost + a.cost * 3);
  t.ok('the smartgun reaches the gun', r.totals.smartgun);
  t.is('the silencer holds the barrel', r.totals.mounts.Barrel, items[silencer].name);
  t.is('3 boxes are one stockpile of 3× the rounds', r.ammo[0].data.system.rounds, a.rounds * 3);
  t.is('the page’s lookup data is not changed by assembling', items[pred].system.installed?.length ?? 0, base.installed?.length ?? 0);

  const rifle = Object.keys(items).find(x => items[x].kind === 'firearm' && items[x].system.category === 'SptR');
  const stock = find('mod', /^Stock/);
  t.ok('fixture: a sport rifle and a stock exist', rifle && stock);
  const s = await GearDesign.assemble({ ...GearDesign.blank(), base: rifle, mods: [{ ref: stock }] }, lookup);
  t.is('a stock on a rifle is the one refusal — left out', (s.weapon.system.installed ?? []).filter(m => /^Stock/.test(m.name)).length, 0);
  t.ok('…with a warning citing SR3 p.277', s.warnings.some(w => /p\.277/.test(w)));
  const u = await GearDesign.assemble({ ...GearDesign.blank(), base: pred, mods: [{ ref: 'sr3e-sr3-gear/nope' }] }, lookup);
  t.eq('an unknown reference is reported and skipped', u.unknown, ['sr3e-sr3-gear/nope']);
  t.ok('…and warned', u.warnings.some(w => /not found/.test(w)));

  /* ── mismatches: recompute, warn, import ───────────────────────────────────── */
  const mm = GearDesign.mismatches({ ...d, system: '0.7.0', claimed: { cost: 1, rc: 0 } }, r.totals, '0.8.0');
  t.ok('a version difference is warned', mm.some(w => /0\.7\.0/.test(w)));
  t.ok('a cheaper claimed price is warned; the recomputed one is imported', mm.some(w => /says 1¥/.test(w)));
  t.eq('nothing to say when they agree', GearDesign.mismatches({ ...d, claimed: { cost: r.totals.cost, rc: r.totals.rc } }, r.totals, '0.8.0'), []);
  t.is('a reference becomes a compendium UUID', GearDesign.uuidOf('sr3e-sr3-gear/abc'), 'Compendium.The2ndChumming3e.sr3e-sr3-gear.Item.abc');

  /* ── Foundry wiring (source level) ─────────────────────────────────────────── */
  const imp = src('scripts/SR3EDesignImport.js'), main = src('scripts/sr3e.js');
  t.ok('the importer waits with DialogV2.wait and wires through render', /DialogV2\.wait\(/.test(imp) && /render: \(_event, dialog\) => wire\(/.test(imp));
  t.ok('it runs the shared assemble, not its own', /GearDesign\.assemble\(/.test(imp) && /GearDesign\.mismatches\(/.test(imp));
  t.ok('targets are live owned actors', /game\.sr3e\.isLiveActor\(a\)/.test(imp) && /a\.isOwner/.test(imp));
  t.ok('the Items directory has the button', /renderItemDirectory[\s\S]{0,400}SR3EDesignImport\.open\(\)/.test(main));
  t.ok('the managed macro is registered', main.includes("'scripts/macros/import-gear-design.js'") && src('scripts/macros/import-gear-design.js').includes('SR3EDesignImport.open()'));

  /* ── Vehicles (R3R, the in-Foundry designer's rules, TODO 287/297) ─────────── */
  const anti = find('vmod', /^Anti-Theft System/);
  t.ok('fixture: the catalogue has vehicle mods with design figures', anti && items[anti].system.designCost != null);
  const veh = GearDesign.normalise({ format: 'sr3e-design', schema: 1, kind: 'vehicle', name: 'Getaway',
    vehicle: { chassis: 'sedan', plant: 'G:Sedan', improve: { speed: 10, bogus: 5, accel: -3 }, smartMaterials: 'yes',
      options: [{ id: 'fuel', level: 2, dp: 1 }, { id: 'nope' }], markUpExtra: 9, vehicleClass: 'warship' },
    mods: [{ ref: anti, rating: 5 }], claimed: { dp: 1, cost: 100 } });
  const v = veh.design.vehicle;
  t.is('a vehicle design keeps its kind', veh.design.kind, 'vehicle');
  t.eq('only the known improvements, as clamped numbers', v.improve, { speed: 10 });
  t.is('smart materials only when exactly true', v.smartMaterials, false);
  t.eq('unknown options are skipped; known ones keep their inputs', v.options.map(o => [o.id, o.level]), [['fuel', 2]]);
  t.eq('…and a hand-typed figure in the link is NOT read', [v.options[0].dp, v.options[0].cf, v.options[0].load], ['', '', '']);
  t.ok('…with a warning saying so', veh.warnings.some(w => /hand-typed figure/.test(w)));
  t.is('the prototype mark-up is capped at 3 (R3R p.113)', v.markUpExtra, 3);
  t.is('an unknown class falls back to standard', v.vehicleClass, 'standard');
  t.is('an unknown chassis is left blank', GearDesign.normaliseVehicle({ chassis: 'deathstar' }).chassis, '');
  t.is('an unknown plant is left blank', GearDesign.normaliseVehicle({ chassis: 'sedan', plant: 'X:Warp' }).plant, '');
  t.is('a bare plant code is kept', GearDesign.normaliseVehicle({ chassis: 'sedan', plant: 'G' }).plant, 'G');

  const va = await GearDesign.assembleVehicle(veh.design, lookup);
  const ctx = GearDesign.vehicleCtx(v);
  const want = VehicleDesign.evaluate({ ...v, mods: [{ ...VehicleDesignActor.modRow(items[anti], { ...ctx, level: 5 }) }] });
  t.is('the Design Points are the in-Foundry designer’s for the same choices', va.totals.dp, want.dp.total);
  t.is('…and so is the price', va.totals.cost, want.price);
  t.is('the mod carries its compendium uuid, for the designer’s Create', va.designer.mods[0].uuid, GearDesign.uuidOf(anti));
  t.is('…and the level picked', va.designer.mods[0].level, 5);
  t.ok('a claimed DP that differs is warned', GearDesign.mismatches(veh.design, va.totals, '0.8.0').some(w => /Design Points/.test(w)));
  const bad = await GearDesign.assembleVehicle({ ...veh.design, mods: [{ ref: pred }, { ref: 'sr3e-r3-vehicle-mods/nope' }] }, lookup);
  t.ok('a weapon in a vehicle’s mod list is skipped with a warning', bad.designer.mods.length === 0 && bad.warnings.some(w => /not a vehicle modification/.test(w)));
  t.eq('…an unknown one reported', bad.unknown, ['sr3e-r3-vehicle-mods/nope']);
  const round = await GearDesign.parse(await GearDesign.encode(veh.design));
  t.eq('a vehicle link round-trips', round.design.vehicle, v);

  const vd = src('scripts/SR3EVehicleDesigner.js');
  t.ok('an imported vehicle opens the Vehicle Designer filled in — its Create is the one create path', imp.includes('SR3EVehicleDesigner.open(null, { design: prepared.result.designer })') && vd.includes('options.design ?? null'));
  t.ok('the importer prices vehicles with the shared assembleVehicle', imp.includes('GearDesign.assembleVehicle('));
}
