/**
 * The Vehicle Designer as a shop · TODO 297 — the mod catalogue (`scripts/data/mod-catalog.mjs`), the line art
 * (`designer-art.mjs`), the options' fit rules (`DesignOptions.misfit`) and the wizard's wiring.
 * The maintainer, 2026-11-08: a five-step wizard under a pinned result bar; silhouettes; options and mods that don't fit
 * hidden behind a "show all" switch; mod cards by shelf with our own one-liners; a stored design reopens on step 5.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { ModCatalog as M, MODS, SHELVES } from '../scripts/data/mod-catalog.mjs';
import { DesignerArt as A } from '../scripts/data/designer-art.mjs';
import { DesignOptions as O } from '../scripts/data/design-options.mjs';
import { CATEGORIES, PLANTS } from '../scripts/data/vehicle-design-tables.mjs';

export const name = 'vehicle-designer-shop';
const src = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

export async function run(t) {
  // Every vehicle mod the packs ship has a shelf and a one-liner.
  const mods = [];
  for (const p of readdirSync(new URL('../packs-src/', import.meta.url)))
    for (const f of readdirSync(new URL(`../packs-src/${p}/`, import.meta.url)))
      if (f.endsWith('.json')) {
        const d = JSON.parse(readFileSync(new URL(`../packs-src/${p}/${f}`, import.meta.url), 'utf8')).doc;
        if (d?.type === 'vehiclemod') mods.push(d.name);
      }
  t.ok('the packs ship vehicle mods', mods.length > 100);
  t.eq('every shipped mod has a one-liner', mods.filter(n => !M.card(n).blurb).sort(), []);
  t.eq('every catalogue entry is on a shelf the shop has', Object.entries(MODS).filter(([, m]) => !SHELVES[m.shelf]).map(([k]) => k), []);
  t.eq('every catalogue entry names a shipped mod (no stale rows)',
    Object.keys(MODS).filter(k => !mods.some(n => M.keyOf(n) === k)), []);
  t.ok('one-liners are short — a card, not a page', Object.values(MODS).every(m => m.blurb.length <= 110));

  t.is('a turret variant reads its base entry', M.keyOf('Small Turret(Anti-Air) (Vehicle)'), 'Small Turret');
  t.ok('…and says what the variant adds', /Anti-air/.test(M.card('Small Turret(Anti-Air) (Vehicle)').blurb));
  t.is('a pop-up turret is a pop-up', M.card('Mini-Turret(Pop-Up) (Vehicle)').variant, 'Pop-Up');

  // Fit rules (R3R pp.126-155): hidden behind the switch, never refused.
  const car = { category: 'car', body: 3, plant: 'G', drone: false };
  const bike = { category: 'bike', body: 2, plant: 'G', drone: false };
  t.ok('Bike Gyro on a car does not fit', !!M.misfit('Bike Gyro-Stabilization Gear (Vehicle)', car));
  t.is('…on a bike it does', M.misfit('Bike Gyro-Stabilization Gear (Vehicle)', bike), null);
  t.ok('sidecars are for motorcycles', !!M.misfit('Large Sidecar (Vehicle)', car) && !M.misfit('Large Sidecar (Vehicle)', bike));
  t.ok('Amphibious Package is for ground vehicles', !!M.misfit('Amphibious Package (Vehicle)', { category: 'boat', body: 3 }) && !M.misfit('Amphibious Package (Vehicle)', car));
  t.ok('Nitrous needs gasoline or diesel', !!M.misfit('Nitrous Oxide Injectors (Vehicle)', { ...car, plant: 'E' }) && !M.misfit('Nitrous Oxide Injectors (Vehicle)', car));
  t.ok('a Body 0 vehicle takes no armour', !!M.misfit('Vehicle Armor (Vehicle)', { ...car, body: 0 }));
  t.ok('Smart Armor needs Body 4', !!M.misfit('Smart Armor System (Vehicle)', car) && !M.misfit('Smart Armor System (Vehicle)', { ...car, body: 4 }));
  t.ok('a drone needs no remote-control interface', !!M.misfit('Rem-Contr. Intr. Bod (Vehicle)', { ...car, drone: true }));
  t.ok('Datajack Port on a bike points at the motorcycle one', !!M.misfit('Datajack Port (Vehicle)', bike) && !M.misfit('Datajack Port(Motorcycles) (Vehicle)', bike));
  t.is('a mod with no restriction always fits', M.misfit('Roll Bars (Vehicle)', bike), null);

  const opt = (id, c) => O.misfit(id, c);
  // Flight Deck: the book's limit (R3R p.119) — "really stupid but possible" on a bike (the maintainer, 2026-11-08).
  t.is('Flight Deck on a Body 2 bike fits — a Body 0 micro UAV can land on it', opt('flight-deck', { category: 'bike', body: 2 }), null);
  t.ok('…a Body 0 vehicle\'s deck takes nothing', !!opt('flight-deck', { category: 'car', body: 0 }));
  t.is('…on a Hull-rated ship it fits', opt('flight-deck', { category: 'ship', body: 8, hasHull: true }), null);
  t.ok('robot options are for drones', !!opt('robot-pilot', { category: 'car' }) && !opt('robot-pilot', { category: 'car', drone: true }));
  t.ok('STOL is for fixed-wing aircraft', !!opt('stol', { category: 'rotor' }) && !opt('stol', { category: 'fixedwing' }));
  t.ok('an EMD drive needs a nuclear sub', !!opt('emd', { category: 'sub', plantCode: 'D' }) && !opt('emd', { category: 'sub', plantCode: 'N' }));
  // Living Amenities, Work Shop, Facility: hidden by their CF, with the shortfall as the reason (the maintainer, 2026-11-08).
  t.eq('no bike holds a work shop — the reason says why', opt('workshop', { category: 'bike', maxCf: 15 }), 'Needs at least 52 CF — this chassis holds at most 17');
  t.ok('…nor amenities or a facility', !!opt('amenities', { maxCf: 15 }) && !!opt('facility', { maxCf: 15 }));
  t.is('…a big enough chassis takes them, whatever its type', opt('workshop', { category: 'car', maxCf: 60 }), null);
  t.ok('the designer passes the chassis maximum CF', /maxCf: VehicleDesign\.cell\(ch\.maxCf, body\)/.test(src('scripts/SR3EVehicleDesigner.js')));
  t.is('an unrestricted option always fits', opt('storage', { category: 'bike' }), null);

  // Art: every chassis type, plant and shelf has its own drawing.
  t.eq('a silhouette for every chassis type', Object.keys(CATEGORIES).filter(k => !A.keys.chassis.includes(k)), []);
  t.eq('an icon for every power plant', Object.keys(PLANTS).filter(k => !A.keys.plant.includes(k)), []);
  t.eq('an icon for every shelf', Object.keys(SHELVES).filter(k => !A.keys.shelf.includes(k)), []);
  t.ok('art is inline SVG in currentColor', /^<svg[^>]*stroke="currentColor"/.test(A.chassis('car')) && A.plant('N').endsWith('</svg>'));
  t.ok('a drone carries the antenna badge', A.chassis('car', true).length > A.chassis('car').length);

  // The wizard's wiring (source-level: the window needs Foundry).
  const w = src('scripts/SR3EVehicleDesigner.js');
  t.ok('the result bar renders above the steps', w.indexOf('${this._resultBar(r)}') < w.indexOf('<nav class="vd-steps">'));
  t.ok('five steps: chassis, plant, options, mods, price',
    ['_stepChassis', '_stepPlant', '_stepOptions', '_stepMods', '_stepPrice'].every(f => w.includes(`${f}(`)));
  t.ok('a stored design reopens on step 5', /this\.step = stored \? 5 : 1/.test(w));
  t.ok('options that don\'t fit are hidden unless the switch is on', /misfit\(o\.id, c\)[\s\S]{0,80}if \(why && !all\)/.test(w));
  t.ok('mods that don\'t fit are hidden unless the switch is on', /filter\(x => all \|\| !x\.why\)/.test(w));
  t.ok('mod cards show the one-liner', /card\.blurb/.test(w));
  t.ok('picking a chassis moves on to the power plant', /data-chassis[\s\S]{0,600}this\.step = 2/.test(w));
  t.ok('no jQuery in the designer', !/\$\(|\.on\('|\.val\(/.test(w));
  t.ok('the styles live in sr3e.css', src('styles/sr3e.css').includes('.vd-result {'));
}
