/**
 * Buy or build a modded item — the quote · TODO 283. Every host type on the shared prices.
 */
import { ModdedBuy } from '../scripts/data/modded-buy.mjs';
import { readFileSync } from 'node:fs';

export const name = 'modded-buy';

export async function run(t) {
  let n = 0;
  const newId = () => `id${++n}`;

  /* ── A gun: fixed mods, a host-priced internal smartgun, the slowest part ── */
  const predator = { name: 'Ares Predator', type: 'firearm', system: { category: 'HPist', cost: 450, availability: '3/24 hrs', streetIndex: 0.75 } };
  const vent = { name: 'Gas Vent II', type: 'gear', system: { cost: 450, availability: '4/48 hrs', mount: 'Barrel' } };
  const smart = { name: 'Internal Smartgun System', type: 'gear', system: { cost: 0, availability: '6/4 days' } };
  const q = ModdedBuy.quote(predator, [{ data: vent, ref: 'u:vent' }, { data: smart, ref: 'u:smart' }], { newId });
  t.is('a gun quote is a weapon', q.kind, 'weapon');
  t.is('the internal smartgun is priced from the gun (100% of ¥450, SR3 p.281)', q.lines[2].cost, 450);
  t.is('…and says so', q.lines[2].basis, 'host');
  t.is('a printed mod is fixed', q.lines[1].basis, 'fixed');
  t.is('the total is the host plus every mod', q.total, 1350);
  t.is('the slowest part sets the TN', q.slowest.tn, 6);
  t.is('…and the time (4 days beats 48 hours)', `${q.slowest.time} ${q.slowest.unit}`, '4 day');
  t.is('the mods are installed in the built gun', q.built.system.installed.length, 2);
  t.is('…the host-priced cost goes in with them', q.built.system.installed[1].system.cost, 450);
  t.is('the original data is not touched', smart.system.cost, 0);

  /* ── The one refusal: a stock on a rifle is left out, with a warning ── */
  const rifle = { name: 'Ruger 100', type: 'firearm', system: { category: 'SptR', cost: 1300, availability: '4/48 hrs' } };
  const stock = { name: 'Stock (Rigid)', type: 'gear', system: { cost: 100 } };
  const r = ModdedBuy.quote(rifle, [{ data: stock }], { newId });
  t.is('a stock on a rifle is not in the total', r.total, 1300);
  t.ok('…and a warning says why', r.warnings.some(w => /rifle has its own stock/.test(w)));

  /* ── Warn, never refuse: a mount taken twice is still quoted ── */
  const twice = ModdedBuy.quote(predator, [{ data: vent }, { data: { ...vent, name: 'Silencer' } }], { newId });
  t.is('two barrel mods both count', twice.total, 450 + 450 + 450);
  t.ok('…with a mount warning', twice.warnings.some(w => /barrel mount already holds/i.test(w)));

  /* ── A vehicle: a mod priced from the vehicle (R3R p.129) ── */
  const car = { name: 'Eurocar Westwind', type: 'vehicle', system: { cost: 100000, vehicleType: 'car', availability: '8/14 days', attributes: { body: { base: 3 } } } };
  const dbw = { name: 'Drive-by-Wire System', type: 'vehiclemod', system: { cost: 0, rating: 2 } };
  const v = ModdedBuy.quote(car, [{ data: dbw, level: 2 }], { newId });
  t.is('a vehicle quote is a vehicle', v.kind, 'vehicle');
  t.is('drive-by-wire 2 is 25% of the price a level: ¥50,000', v.lines[1].cost, 50000);
  t.is('…worked out from the host', v.lines[1].basis, 'host');
  t.is('the total', v.total, 150000);
  t.is('a vehicle is not built with installed mods (they embed)', v.built.system.installed, undefined);
  t.is('a mod for a vehicle must be a vehiclemod', ModdedBuy.offerable('vehicle', vent), false);

  /* ── Armour: Gel Packs multiply the base, the code is the armour's rule (CC pp.52-53) ── */
  const vest = { name: 'Armor Vest', type: 'armor', system: { cost: 200, availability: '2/36 hrs' } };
  const gel = { name: 'Gel Packs', type: 'gear', system: { cost: 0, availability: 'x2/x4', modifiers: [{ target: 'gelPacks', value: 1 }] } };
  const a = ModdedBuy.quote(vest, [{ data: gel }], { newId });
  t.is('gel packs: the base ×5', a.total, 1000);
  t.is('…and the armour\'s Availability ×2/×4', a.slowest.code, '4/144hrs');

  /* ── A cyberlimb: a device built in is ×4 with Man & Machine off (SR3 p.303) ── */
  const arm = { name: 'Cyberarm', type: 'cyberware', system: { cyberwareCategory: 'Cyberlimbs', cost: 75000, availability: '4/4 days' } };
  const radio = { name: 'Radio', type: 'gear', system: { cost: 100, availability: '2/24 hrs' } };
  t.is('×4 with Man & Machine off', ModdedBuy.quote(arm, [{ data: radio }], { mmOn: false, newId }).lines[1].cost, 400);
  t.is('its normal price with it on', ModdedBuy.quote(arm, [{ data: radio }], { mmOn: true, newId }).lines[1].cost, 100);

  /* ── The cart line ── */
  const line = ModdedBuy.cartLine(q, { hostUuid: 'u:pred' });
  t.is('one line, named for the host and its mods', line.name, 'Ares Predator (+2 mods)');
  t.is('…priced at the total', line.cost, 1350);
  t.is('…at the slowest TN', line.tn, 6);
  t.is('…carrying each mod\'s reference and quoted price', JSON.stringify(line.modded.mods.map(m => [m.itemUuid, m.cost])), '[["u:vent",450],["u:smart",450]]');
  t.is('a blocked mod has no reference on the line', ModdedBuy.cartLine(r, { hostUuid: 'x' }).modded.mods.length, 0);

  /* ── Source checks: the dialog ── */
  const src = readFileSync(new URL('../scripts/SR3EModdedBuy.js', import.meta.url), 'utf8');
  t.ok('the dialog is a DialogV2.wait', /DialogV2\.wait\(/.test(src));
  t.ok('…wired through its render option', /render:\s*\(_e(?:vent)?,\s*dialog\)\s*=>\s*wire/.test(src));
  t.ok('…never the global hook', !/renderDialogV2/.test(src));
  t.ok('Buy goes through the 🛒 flow with the line in its cart', /SR3EPurchase\.open\([^)]*lines:/.test(src));
  t.ok('Add without paying exists', /add without paying/i.test(src));
  const pur = readFileSync(new URL('../scripts/SR3EPurchase.js', import.meta.url), 'utf8');
  t.ok('💴 Pay builds a modded line through SR3EModdedBuy', /line\.modded/.test(pur) && /SR3EModdedBuy\.materialise/.test(pur));
  const sheet = readFileSync(new URL('../scripts/sheets/SR3EActorSheet.js', import.meta.url), 'utf8');
  t.ok('the sheet has the 🔧 button beside 🛒', /data-action="buildModded"/.test(sheet));
}
