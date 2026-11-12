/**
 * The Vehicle Designer as a shop · TODO 297 — the mod catalogue (`scripts/data/mod-catalog.mjs`), the line art
 * (`designer-art.mjs`), the options' fit rules (`DesignOptions.misfit`) and the wizard's wiring.
 * The maintainer, 2026-11-08: a five-step wizard under a pinned result bar; silhouettes; options and mods that don't fit
 * hidden behind a "show all" switch; mod cards by shelf with our own one-liners; a stored design reopens on step 5.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { ModCatalog as M, MODS, SHELVES } from '../scripts/data/mod-catalog.mjs';
import { DesignerArt as A, tokenImage } from '../scripts/data/designer-art.mjs';
import { DesignOptions as O } from '../scripts/data/design-options.mjs';
import { CATEGORIES, PLANTS, CHASSIS } from '../scripts/data/vehicle-design-tables.mjs';
import { ChassisCatalog as C, CHASSIS_INFO, TOWED } from '../scripts/data/chassis-catalog.mjs';
import { VehicleDesign } from '../scripts/data/vehicle-design.mjs';

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
  // Setup/Breakdown Time: drones of Body 3 or less, other vehicles Body 2 or less (R3R p.118).
  t.ok('no Setup/Breakdown on a Body 4 trailer — the reason says why', /Body 2 or less.*Body 4.*R3R p\.118/.test(opt('setup', { category: 'special', body: 4 }) ?? ''));
  t.is('…a Body 2 vehicle takes it', opt('setup', { category: 'car', body: 2 }), null);
  t.is('…a Body 3 drone takes it', opt('setup', { category: 'car', body: 3, drone: true }), null);
  t.ok('…a Body 3 car does not', !!opt('setup', { category: 'car', body: 3 }));
  t.ok('…nor a Body 4 drone', !!opt('setup', { category: 'car', body: 4, drone: true }));
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
  // Second pass (the maintainer, 2026-11-08) — chassis drawings and one-liners.
  t.eq('every chassis has a drawing and a one-liner', CHASSIS.filter(c => !C.card(c.id).art || !C.card(c.id).blurb).map(c => c.id), []);
  t.eq('no catalogue row for a chassis that is gone', Object.keys(CHASSIS_INFO).filter(id => !CHASSIS.some(c => c.id === id)), []);
  t.eq('every drawing named exists', [...new Set(Object.values(CHASSIS_INFO).map(v => v[0]))].filter(a => !A.keys.art.includes(a)), []);
  t.ok('one-liners are short', Object.values(CHASSIS_INFO).every(([, b]) => b.length <= 90));
  const artOf = id => C.card(id).art;
  t.ok('each bike has its own drawing', new Set(['racing-cycle', 'chopper', 'offroad-bike', 'scooter', 'atv'].map(artOf)).size === 5);
  t.ok('a barge is not drawn as a truck', artOf('barge') === 'barge' && /stroke-dasharray/.test(A.vehicle('barge', 'special')));
  t.ok('family members share a drawing, the bigger one drawn bigger',
    artOf('caterpillar-heavy') === artOf('caterpillar-miniature') && C.scale('caterpillar-miniature', CHASSIS) < C.scale('caterpillar-heavy', CHASSIS));
  t.is('a one-of-a-kind drawing is full size', C.scale('barge', CHASSIS), 1);
  t.ok('a scaled drawing is wrapped in a transform', /scale\(0\.6\)/.test(A.vehicle('caterpillar', 'car', false, 0.6)));
  // Towed chassis (R3R p.109): every one has no power plant in the tables, and every plant-less chassis is towed.
  const plantless = CHASSIS.filter(c => !Object.keys(PLANTS).some(code => VehicleDesign.plantsFor(c.id, code).length)).map(c => c.id).sort();
  t.eq('the towed chassis are exactly those with no plant', [...TOWED].sort(), plantless);

  // Option fit: sealed to go under (the maintainer, 2026-11-08); Ballast Tanks not on boats (R3R p.116).
  t.ok('Depth Enhancement: subs, or a sealed vehicle', !!opt('depth', { category: 'bike' }) && !opt('depth', { category: 'sub' }) && !opt('depth', { category: 'bike', watertight: true }));
  t.ok('Ballast Tanks need a sealed vehicle', !!opt('ballast', { category: 'car' }) && !opt('ballast', { category: 'car', watertight: true }));
  t.ok('Ballast Tanks are not for boats, ships or subs', ['boat', 'ship', 'sub'].every(k => !!opt('ballast', { category: k, watertight: true })));
  t.is('Extra Entry Points says its limit', O.limit('entry', { body: 3 }), 'Up to 2 for this chassis');
  t.is('a hulled vessel: Hull x 2 entry points', O.limit('entry', { body: 4, hull: 4, hasHull: true }), 'Up to 8 for this chassis');

  // Mods: stacking, levels, aftermarket.
  t.ok('mounts, turrets, seats and kits stack', ['Small Turret (Vehicle)', 'External Hardpoint (Vehicle)', 'Bucket Seat (Vehicle)', 'LMG Customization Kit (Vehicle)'].every(n => M.stacks(n)));
  t.ok('a turbocharger, nitrous or datajack is once per vehicle', ['Turbocharging/Superconductive Drive (Vehicle)', 'Nitrous Oxide Injectors (Vehicle)', 'Datajack Port (Vehicle)'].every(n => !M.stacks(n)));
  const mod = (name, rating, designCost = '') => ({ name, system: { rating, designCost } });
  t.is('the book max: Nitrous 6 (R3R p.126)', M.maxLevel(mod('Nitrous Oxide Injectors (Vehicle)', 1, '55 per level')), 6);
  t.is('max read from the level list: Autonav 4', M.maxLevel(mod('Autonavigation System (Vehicle)', 1, 'Rating 1: 5, 2: 10, 3: 50, 4: 150')), 4);
  t.is('an open-ended band has no max', M.maxLevel(mod('Anti-Theft System (Vehicle)', 3, 'Per level 3-6: 4, 7-9: 10, 10+: 50')), null);
  t.is('an unrated mod has no level', M.maxLevel(mod('Datajack Port (Vehicle)', null, '25')), null);
  t.ok('only a rated mod is rated', M.rated(mod('x', 1)) && !M.rated(mod('x', null)));
  t.ok('Ablative Armor is aftermarket — not a design option (R3R p.131)', M.aftermarket('Ablative Armor (Vehicle)'));
  t.ok('a Pop-Up turret is not the Anti-Air one', !M.sameMod('Mini-Turret(Pop-Up) (Vehicle)', 'Mini-Turret(Anti-Air) (Vehicle)'));
  t.ok('…the same mod from another pack matches', M.sameMod('Mini-Turret(Pop-Up) (Vehicle)', 'Mini-Turret(Pop-Up)'));
  t.ok('the shop counts the cart by exact name', w.includes('ModCatalog.sameMod(x.name, m.name)') && !/inCart = [^\n]*keyOf/.test(w)
    && !/mods\.some\(x => ModCatalog\.keyOf/.test(w));
  {
    // SunCell (R3R p.126): an electric plant, a Hybrid Engine or an electric Auxiliary Engine (the maintainer, 2026-11-09).
    const sun = c => M.misfit('SunCell Power (Vehicle)', { category: 'car', ...c });
    t.is('SunCell fits an electric car', sun({ plant: 'E' }), null);
    t.ok('…not a gasoline one alone', !!sun({ plant: 'G' }));
    t.is('…a gasoline car with an electric drive besides takes it', sun({ plant: 'G', electric: true }), null);
    t.ok('…never a bike', !!sun({ category: 'bike', plant: 'E' }));
    const plantOf = id => ({ e1: 'E', g1: 'G' })[id] ?? null;
    t.ok('a Hybrid Engine is an electric drive', M.electricExtra([{ id: 'hybrid' }], plantOf));
    t.ok('…so is an Auxiliary Engine on an electric plant', M.electricExtra([{ id: 'aux-engine', auxPlant: 'e1' }], plantOf));
    t.ok('…not one on a gasoline plant', !M.electricExtra([{ id: 'aux-engine', auxPlant: 'g1' }], plantOf));
    t.ok('the designer passes it to the fit check', w.includes('electric: ModCatalog.electricExtra(this.design.options ?? []'));
  }
  t.ok('the result bar carries the book’s second stat line', ['Seating', 'Entry', 'Fuel', 'Econ', 'Range', 'S/B', 'L/T', 'Chassis', 'SI', 'Avail'].every(l => w.includes(`chip('${l}'`)));
  t.is('a shortened name has its full form for the mouse-over', M.names('Rem-Contr. Intr. Bod (Vehicle)').full, 'Remote-Control Interface Body');
  t.is('…a plain name is its own full form', M.names('Turbocharging (Vehicle)').full, 'Turbocharging');
  t.ok('…shop cards and cart rows carry it as a title', (w.match(/title="\$\{esc\(ModCatalog\.names\(/g) ?? []).length >= 2);
  t.ok('the morphing plate is aftermarket, a turret is not', M.aftermarket('Morphing License Plate (Vehicle)') && !M.aftermarket('Small Turret (Vehicle)'));

  // The window (source-level).
  const css = readFileSync(new URL('../styles/sr3e.css', import.meta.url), 'utf8');
  t.ok('the designer brightens its muted and dim text', /\.sr3e-vehicle-designer \{ --sr-muted: #cfc8ba; --sr-dim: #a8a194; \}/.test(css));
  t.ok('the auxiliary engine picks its plant from a dropdown', /pickers = \{ auxPlant: auxPick,/.test(w) && w.includes('<select data-path="options.${i}.${k}">'));
  t.ok('the work shop and facility pick their kind from a dropdown', /shop: k => shopPick\(k, 'shop'\), facility: k => shopPick\(k, 'facility'\)/.test(w));
  // Who pulls trailers: ground vehicles and boats (the maintainer, 2026-11-09).
  const CC = C;
  const chOf = id => CHASSIS.find(c => c.id === id);
  t.eq('cars, bikes, hovercraft, boats, ships and locomotives pull trailers',
    ['sedan', 'atv', 'hovercraft-light', 'speedboat', 'freighter', 'locomotive-bulk'].filter(id => !chOf(id) || !CC.canTow(chOf(id))), []);
  t.eq('…aircraft, subs, walkers and trailers do not',
    ['jet-fighter', 'attack-submarine', 'walker-large', 'zeppelin', 'trailer-53ft'].filter(id => !chOf(id) || CC.canTow(chOf(id))), []);
  t.ok('…the Add a trailer button asks it', /if \(!ChassisCatalog\.canTow\(ch\)\) return '';[\s\S]{0,120}vd-add-trailer|if \(!ChassisCatalog\.canTow\(ch\)\) return '';/.test(w));
  t.ok('the price step explains Availability and names the biggest costs', w.includes('Availability: ${esc(r.availability.why)}') && w.includes('biggest costs:'));
  {
    const css = readFileSync(new URL('../styles/sr3e.css', import.meta.url), 'utf8');
    t.ok('a card that does not fit looks different — greyed, amber edge, a badge', /\.vd-card\.vd-misfit \{[^}]*grayscale[^}]*--sr-amber/.test(css) && css.includes(`.vd-card.vd-misfit::before { content: "Doesn't fit"`));
  }
  t.ok('the mod shop offers only the books the GM turned on', w.includes('game.sr3e?.SR3ESourceBooks?.packAllowed(pack)') && w.includes('pickList(out.filter(e => e.allowed))'));
  t.ok('chassis cards show the catalogue picture', /DesignerArt\.picture\(card\.art/.test(w));

  // Pictures (the maintainer, 2026-11-08: anime style, transparent background), generated on the maintainer's ComfyUI.
  const pics = new URL('../styles/vehicles/', import.meta.url);
  const files = readdirSync(pics).filter(f => f !== 'top');
  t.eq('every drawing has its picture', A.keys.art.filter(a => !files.includes(`${a}.webp`)), []);
  t.eq('no stray picture', files.filter(f => !A.keys.art.includes(f.replace(/\.webp$/, ''))), []);
  t.eq('pictures stay small (under 80 KB)', files.filter(f => statSync(new URL(f, pics)).size > 80 * 1024), []);
  // Top-down token icons (the maintainer, 2026-11-08: "render it top down so we can use it as an icon", no shadows).
  const tops = new URL('../styles/vehicles/top/', import.meta.url);
  const topFiles = readdirSync(tops);
  t.eq('every drawing has its top-down icon', A.keys.art.filter(a => !topFiles.includes(`${a}.webp`)), []);
  t.eq('no stray icon', topFiles.filter(f => !A.keys.art.includes(f.replace(/\.webp$/, ''))), []);
  t.eq('icons stay small (under 40 KB)', topFiles.filter(f => statSync(new URL(f, tops)).size > 40 * 1024), []);
  t.is('a new design takes its chassis icon', tokenImage('sedan'), 'systems/The2ndChumming3e/styles/vehicles/top/sedan.webp');
  t.is('…an unknown art id has none', tokenImage('nope'), null);
  t.ok('the icon is the new actor img and token', /img: icon, 'prototypeToken\.texture\.src': icon/.test(w));
  t.ok('a picture is an img from the system folder', /<img src="systems\/The2ndChumming3e\/styles\/vehicles\/barge\.webp"/.test(A.picture('barge', 'special')));
  t.ok('…a smaller family member is drawn smaller', /max-width:60%/.test(A.picture('caterpillar', 'car', false, 0.6)));
  t.ok('…an unknown art id falls back to the line drawing', A.picture('nope', 'car').startsWith('<svg'));
  t.ok('a towed chassis skips the plant cards', /info\.towed[\s\S]{0,400}Towed — no power plant/.test(w));
  t.ok('tuning lays out start, added, result and limit', /<th>Start<\/th><th>Added<\/th><th>Result<\/th><th>Limit<\/th>/.test(w));
  t.ok('every tuning row has a tooltip', w.includes('<tr class="${over ? \'vd-over-row\' : \'\'}" title="${esc(tip)}">'));
  t.ok('a once-per-vehicle mod is not added twice', /!ModCatalog\.stacks\(m\.name\) && this\.design\.mods\.some/.test(w));
  t.ok('the Level box is only for rated mods, capped at the max', /\$\{rated \? `<label[\s\S]{0,200}max="\$\{max\}"/.test(w));
  t.ok('the cart says why it warns', w.includes('vd-cart-why">⚠ ${esc(why)}'));
  t.ok('an aftermarket mod prices at 0 points', w.includes('aftermarket(m.name)) Object.assign(row, { dp: 0, unpriced: false })'));
}
