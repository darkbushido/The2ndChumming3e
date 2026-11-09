/**
 * Design → vehicle actor — `scripts/data/vehicle-design-actor.mjs`, and the designer window's wiring · TODO 287, slice 2.
 * Rulings (2026-11-07): the design lives on the vehicle; re-saving OFFERS the changed stats; three entry points.
 */
import { readFileSync } from 'node:fs';
import { VehicleDesign as V } from '../scripts/data/vehicle-design.mjs';
import { VehicleDesignActor as A, FLAG } from '../scripts/data/vehicle-design-actor.mjs';

export const name = 'vehicle-design-actor';
const src = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

export async function run(t) {
  // Steffi's Light Strike Vehicle (R3R pp.109-113) — security class.
  const lsv = V.evaluate({ chassis: 'sand-buggy', plant: 'G', improve: { handlingOffRoad: 1, accel: 2, cargo: 2, load: 30 },
    mods: [{ name: 'Ring Mount', dp: 10, cf: 1, load: 15 }], vehicleClass: 'security' });
  const v = A.values(lsv);
  t.eq('type from the chassis category', v.vehicleType, 'car');
  t.eq('cost and availability carried', [v.cost, v.availability], [lsv.cost, lsv.availability.text]);
  t.eq('handling carried', [v.handling, v.handlingOffRoad], [lsv.stats.handling, lsv.stats.handlingOffRoad]);
  t.ok('no null or NaN values', Object.values(v).every(x => x != null && !(typeof x === 'number' && Number.isNaN(x))));
  t.eq('no chassis → nothing', A.values({ chassis: null }), {});

  const u = A.update({ speed: 120, cost: 5000 });
  t.eq('attributes write base AND value', [u['system.attributes.speed.base'], u['system.attributes.speed.value']], [120, 120]);
  t.eq('plain fields write system.<field>', u['system.cost'], 5000);

  const actor = { system: { cost: 5000, attributes: { speed: { value: 100 }, accel: { value: 9 } } } };
  const rows = A.changes(actor, { speed: 120, accel: 9, cost: 6000 });
  t.eq('changes list only what differs, old → new', rows.map(r => [r.field, r.from, r.to]), [['speed', 100, 120], ['cost', 5000, 6000]]);
  t.eq('only ticked rows are written (offer, never apply)', A.accepted(rows, new Set(['cost'])), { 'system.cost': 6000 });

  const nitrous = { name: 'Nitrous', system: { rating: 6, designCost: '55 per level', designCf: '1.5', designLoad: '15kg', cfCost: '2' } };
  t.eq('a mod is priced by its DESIGN figures — Brickyard Nitrous 6 (R3R p.113)', A.modRow(nitrous), { name: 'Nitrous', dp: 330, cf: 1.5, load: 15, unpriced: false, source: '55 per level' });
  t.eq('CF falls back to the customization figure', A.modRow({ name: 'X', system: { designCost: '10', cfCost: '2' } }).cf, 2);
  t.eq('no design cost → unpriced, 0 points (the GM types it)', A.modRow({ name: 'Y', system: {} }).unpriced, true);
  t.eq('chassis-relative mod needs the chassis', A.modRow({ name: 'Gyro', system: { designCost: 'Chassis x 0.25' } }, { chassis: 100 }).dp, 25);

  // The window (source-level — it needs Foundry).
  const w = src('scripts/SR3EVehicleDesigner.js');
  t.ok('Create goes through sr3e.actor.create', w.includes("asGM('sr3e.actor.create'"));
  t.ok('the design is stored on the vehicle', w.includes('flags.${SCOPE}.${FLAG}') && FLAG === 'design');
  t.ok('re-save offers the changes through DialogV2.wait', /changes\(this\.actor\.toObject\(\)/.test(w) && w.includes('DialogV2.wait'));
  t.ok('no global renderDialogV2 hook', !w.includes("Hooks.on('renderDialogV2'"));
  const main = src('scripts/sr3e.js');
  t.ok('Actors directory header button', main.includes("Hooks.on('renderActorDirectory'") && main.includes('SR3EVehicleDesigner.open()'));
  t.ok('the macro is a managed world macro', main.includes("'scripts/macros/vehicle-designer.js'") && src('scripts/macros/vehicle-designer.js').includes('SR3EVehicleDesigner.open()'));
  t.ok('the vehicle sheet has a Design button', src('scripts/sheets/SR3EVehicleSheet.js').includes('data-action="openDesign"'));

  // Mods on the vehicle (slice 3; the maintainer, 2026-11-08: "Offer new ones, never remove").
  const U1 = 'Compendium.x.Item.nitro', U2 = 'Compendium.x.Item.ring';
  const picked = [{ name: 'Nitrous', uuid: U1, level: 6 }, { name: 'Ring Mount', uuid: U2 }, { name: 'Ring Mount', uuid: U2 }, { name: 'Typed', dp: 5 }];
  t.eq('Create embeds every picked mod with a document (typed rows have none)', A.missingMods(picked, []).map(m => m.name), ['Nitrous', 'Ring Mount', 'Ring Mount']);
  const carried = [{ type: 'vehiclemod', name: 'Nitrous', _stats: { compendiumSource: U1 } }, { type: 'vehiclemod', name: 'Ring Mount' }, { type: 'firearm', name: 'Ring Mount' }];
  t.eq('re-save offers only what the vehicle lacks — counted, by source or name', A.missingMods(picked, carried).map(m => m.name), ['Ring Mount']);
  t.eq('a mod the vehicle carries but the design dropped is never offered for removal', A.missingMods([], carried), []);
  t.eq('the embedded copy takes the design\'s level and drops its id',
    A.modItemData({ _id: 'abc', name: 'Nitrous', system: { rating: 1, cfCost: '1' } }, { level: 6 }), { name: 'Nitrous', system: { rating: 6, cfCost: '1' } });
  t.eq('an unrated mod keeps no rating', A.modItemData({ name: 'Ring', system: { rating: null } }, { level: 3 }).system.rating, null);
  t.ok('Create and re-save embed through _embedMods', (w.match(/_embedMods\(/g) ?? []).length >= 3 && w.includes("createEmbeddedDocuments('Item'"));
  t.ok('the re-save dialog offers new mods ticked, never a removal', w.includes('missingMods(design.mods, this.actor.items') && !/deleteEmbeddedDocuments/.test(w));
  t.eq('one carried item covers ONE design copy — two Ring Mounts, one left → one offered (§82 live, 2026-11-08)',
    A.missingMods([{ name: 'Ring', uuid: U2 }, { name: 'Ring', uuid: U2 }], [{ type: 'vehiclemod', name: 'Ring', flags: { The2ndChumming3e: { designSource: U2 } } }]).length, 1);
  t.eq('the designSource flag counts as the source', A.missingMods([{ name: 'Nitrous', uuid: U1 }],
    [{ type: 'vehiclemod', name: 'Nitrous', flags: { The2ndChumming3e: { designSource: U1 } } }]), []);
  t.ok("_embedMods never writes _stats (a player's create carrying it is dropped, §82 2026-11-08)", !/_stats/.test(w.slice(w.indexOf('async _embedMods'))) && w.includes('SOURCE_FLAG}`, m.uuid'));
  t.ok('_embedMods warns when fewer items were made than sent', /made\?\.length \?\? 0\) < docs\.length/.test(w));
  t.ok('the window lists the design options catalogue', w.includes('DesignOptions.OPTIONS') && w.includes('DesignOptions.newRow'));

  // The mod list offers each name once (the user, 2026-11-08: "datajack port shows up twice").
  const e = (uuid, name, bookPage, designCost = '') => ({ uuid, name, system: { bookPage, designCost } });
  const list = A.pickList([e('a', 'Datajack Port (Vehicle)', 'sr3.306,r3.128'), e('b', 'Datajack Port (Vehicle)', 'r3.128', '25'),
    e('c', 'Pintle Mount (Vehicle)', 'sr3.312', '1'), e('d', 'Pintle Mount (Vehicle)', 'sr3.312,r3.138', '1'), e('f', 'Ablative Armor (Vehicle)', 'r3.131')]);
  t.eq('one entry per name, sorted', list.map(x => x.name), ['Ablative Armor (Vehicle)', 'Datajack Port (Vehicle)', 'Pintle Mount (Vehicle)']);
  t.eq('…the copy with design figures, else the R3R one', list.map(x => x.uuid), ['f', 'b', 'd']);

  // A mod with printed levels is embedded at the design's level, with that level's numbers (Amphibious Package, R3R p.149).
  const amph = { name: 'Amphibious Package (Vehicle)', type: 'vehiclemod', _id: 'x', system: { rating: 1, cost: 2500, cfCost: '0' } };
  const lv3 = A.modItemData(amph, { level: 3 });
  t.eq('amphibious at level 3: rating 3, 15,000¥, CF 4', [lv3.system.rating, lv3.system.cost, lv3.system.cfCost], [3, 15000, '4']);
  t.is('…the source is untouched', amph.system.cost, 2500);

}
