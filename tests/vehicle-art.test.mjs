/**
 * Vehicle and drone token art (every vehicle type) — `tools/build-vehicle-art.mjs`, its reviewed name → archetype map
 * (`tools/data/vehicle-archetypes.json`), and the pack entries it points at the art (TODO 257).
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ARCHETYPES, PAINTS, PALETTES, IMG_DIR, OUT, isInScope, readMap, artFor, paintFor, renderAll, renderSvg,
  inScopeEntries, applyArt, hashName, pxPerMetre, outlineFor,
  renderArtMap, ART_MAP_FILE,
} from '../tools/build-vehicle-art.mjs';
import { VehicleArt, isStock } from '../scripts/data/vehicle-art.mjs';

export const name = 'vehicle-art';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export async function run(t) {
  /* ── Scope ─────────────────────────────────────────────────────────────────────────────── */
  t.ok('every vehicles pack is in scope — road, water and air', isInScope('sr3e-sr3-vehicles') && isInScope('sr3e-r3-vehicles'));
  t.ok('every drones pack is in scope', isInScope('sr3e-ssg-drones'));
  t.ok('a vehicle-mods or vehicle-weapons pack is not', !isInScope('sr3e-sr3-vehicle-mods') && !isInScope('sr3e-r3-vehicle-weapons'));

  const entries = inScopeEntries();
  t.ok(`the scope finds every vehicle and drone (${entries.length})`, entries.length >= 260);
  t.eq('…of every vehicleType the packs use', [...new Set(entries.map(e => e.doc.system?.vehicleType))].sort(),
    ['airship', 'boat', 'car', 'drone', 'fixedwing', 'helicopter', 'hovercraft', 'military', 'motorcycle', 'ship', 'submarine']);
  const names = entries.map(e => e.doc.name);
  t.eq('in-scope names are unique (the map is keyed by name)', names.filter((n, i) => names.indexOf(n) !== i), []);

  /* ── The map ───────────────────────────────────────────────────────────────────────────── */
  const map = readMap();
  t.eq('every in-scope entry has an archetype', names.filter(n => !map[n]), []);
  t.eq('the map names nothing that is not in scope', Object.keys(map).filter(n => !names.includes(n)), []);
  t.eq('every mapped archetype exists', Object.entries(map).filter(([, v]) => !ARCHETYPES[v.archetype]).map(([k]) => k), []);
  t.eq('every named paint exists', Object.entries(map).filter(([, v]) => v.paint && !PAINTS[v.paint]).map(([k]) => k), []);
  t.eq('every palette names real paints', Object.values(PALETTES).flat().filter(p => !PAINTS[p]), []);
  t.eq('every archetype is used by some vehicle', Object.keys(ARCHETYPES).filter(a => !Object.values(map).some(v => v.archetype === a)), []);
  t.is('Lone Star vehicles wear Lone Star blue', paintFor('Lone Star Ford Americar', map['Lone Star Ford Americar']), 'lonestar');

  /* ── Paint by hash: stable and spread ──────────────────────────────────────────────────── */
  t.is('the hash is FNV-1a (stable across machines)', hashName('a'), 0xe40c292c);
  t.is('the same name always gets the same paint', paintFor('Ford Americar', { archetype: 'sedan' }), paintFor('Ford Americar', { archetype: 'sedan' }));
  const civ = new Set(names.filter(n => ARCHETYPES[map[n].archetype].palette === 'civilian' && !map[n].paint).map(n => paintFor(n, map[n])));
  t.ok(`civilian vehicles get a spread of paints (${civ.size})`, civ.size >= 6);

  /* ── Token sizes: real metres in 1 m squares ───────────────────────────────────────────── */
  for (const [a, { size: [w, l] }] of Object.entries(ARCHETYPES)) {
    const step = [w, l].every(v => v > 0 && Number.isInteger(v * 2));
    t.ok(`${a}: ${w} × ${l} m, positive and on Foundry's ½ step`, step);
  }
  const range = (a, lo, hi) => ARCHETYPES[a].size.every(v => v >= lo && v <= hi);
  t.ok('cars are 1.5–3 m wide and 3–13 m long', ['compact', 'sedan', 'sports', 'racer', 'limo', 'suv', 'jeep', 'pickup', 'van', 'boxvan', 'bus', 'truck']
    .every(a => ARCHETYPES[a].size[0] >= 1.5 && ARCHETYPES[a].size[0] <= 3 && ARCHETYPES[a].size[1] >= 3 && ARCHETYPES[a].size[1] <= 13));
  t.ok('a car is longer than it is wide', ['compact', 'sedan', 'limo', 'bus'].every(a => ARCHETYPES[a].size[1] > ARCHETYPES[a].size[0]));
  t.ok('bikes are 1 m wide and at most 3 m long', ['scooter', 'sportbike', 'cruiser', 'snowmobile'].every(a => range(a, 1, 3) && ARCHETYPES[a].size[0] === 1));
  t.ok('military vehicles stay under 4 × 11 m', ['apc', 'armored-truck', 'tracked-apc', 'tank'].every(a => ARCHETYPES[a].size[0] <= 4 && ARCHETYPES[a].size[1] <= 11));
  t.ok('drones are ½–3 m', ['rotor', 'helidrone', 'fixedwing', 'ductfan', 'ground', 'combat-rover', 'tracked-drone', 'crawler', 'micro', 'anthro', 'sentry'].every(a => range(a, 0.5, 3)));
  t.ok('helicopters are as wide as their rotor, 8–16 m', ['heli-light', 'helicopter', 'gunship', 'heli-heavy'].every(a => ARCHETYPES[a].size[0] >= 8 && ARCHETYPES[a].size[0] <= 16));
  t.ok('boats under 25 m, ships under 400 m', ['jetski', 'speedboat', 'patrol-boat', 'yacht', 'minisub', 'sdv'].every(a => ARCHETYPES[a].size[1] <= 25)
    && ['submarine', 'warship', 'carrier', 'liner', 'freighter'].every(a => ARCHETYPES[a].size[1] <= 400));
  t.ok('a wide aircraft is wider than its fuselage is long only when it has wings', ['ultralight', 'light-plane', 'transport', 'tiltrotor'].every(a => ARCHETYPES[a].size[0] > ARCHETYPES[a].size[1] * 0.9));
  t.ok('the outline thickens on big hulls so it survives a coarse texture', outlineFor([2, 5]) === 3 && outlineFor([75, 330]) > 50);
  t.ok('a texture never passes 4096 px a side', Object.values(ARCHETYPES).every(a => Math.max(...a.size) * pxPerMetre(a.size) <= 4096));

  /* ── The pack entries point at the art ─────────────────────────────────────────────────── */
  const wrong = [];
  for (const { pack, doc } of entries) {
    const art = artFor(doc.name, map[doc.name]);
    const tok = doc.prototypeToken ?? {};
    if (doc.img !== art.img || tok.texture?.src !== art.img || tok.width !== art.width || tok.height !== art.height) wrong.push(`${pack}: ${doc.name}`);
    if (!existsSync(join(ROOT, doc.img.replace('systems/The2ndChumming3e/', '')))) wrong.push(`${doc.name}: ${doc.img} missing`);
  }
  t.eq('every in-scope entry has its SVG as img and token, sized width × length in metres', wrong, []);

  /* ── The SVGs are build output ─────────────────────────────────────────────────────────── */
  const files = renderAll(map);
  const onDisk = existsSync(OUT) ? readdirSync(OUT) : [];
  t.eq('no SVG has drifted from the generator', [...files].filter(([f, text]) => !existsSync(join(OUT, f)) || readFileSync(join(OUT, f), 'utf8') !== text).map(([f]) => f), []);
  t.eq('no orphaned SVG in styles/textures/vehicles/', onDisk.filter(f => !files.has(f)), []);
  const bad = [...files].filter(([, s]) => /<image|href=|<script|@import|url\(|<text/i.test(s)).map(([f]) => f);
  t.eq('the art is self-contained: no images, links, scripts or text', bad, []);
  const sedan = renderSvg('sedan', 'red');
  t.ok('the viewBox is the footprint in centimetres', sedan.includes('viewBox="0 0 200 500"'));
  t.ok('…drawn at 200 px a metre', sedan.includes('width="400" height="1000"'));
  t.ok('the background is transparent (no full-size backdrop rect)', !/<rect x="0" y="0" width="200" height="500"/.test(sedan));
  t.ok('the head lamps are at the SOUTH end (front faces rotation 0)', (() => {
    const ys = [...sedan.matchAll(/<rect x="[\d.]+" y="([\d.]+)"[^>]*fill="#fff1bf"/g)].map(m => +m[1]);
    return ys.length === 2 && ys.every(y => y > 450);
  })());
  t.is('every image path is under the vehicles texture folder', IMG_DIR, 'systems/The2ndChumming3e/styles/textures/vehicles');

  /* ── Applying is safe ──────────────────────────────────────────────────────────────────── */
  const art = { img: `${IMG_DIR}/sedan-red.svg`, width: 2, height: 5 };
  const stock = { img: 'systems/The2ndChumming3e/styles/textures/vehicles-default.webp' };
  t.ok('a stock picture is replaced', applyArt(stock, art) && stock.img === art.img && stock.prototypeToken.height === 5);
  t.ok('…and again changes nothing', !applyArt(stock, art));
  const chosen = { img: 'worlds/test/my-van.webp' };
  t.ok('a picture someone chose is left alone', !applyArt(chosen, art) && chosen.img === 'worlds/test/my-van.webp' && !chosen.prototypeToken);
  const keepTok = { img: stock.img, prototypeToken: { actorLink: true, texture: { tint: '#ffffff' } } };
  applyArt(keepTok, art);
  t.ok('other token settings survive', keepTok.prototypeToken.actorLink === true && keepTok.prototypeToken.texture.tint === '#ffffff');

  /* ── The world migration (0.7.1): owned vehicles, not drones ───────────────────────────── */
  t.ok('the runtime table matches the reviewed map', readFileSync(ART_MAP_FILE, 'utf8') === renderArtMap(map));
  const OLD = 'systems/The2ndChumming3e/styles/textures/vehicles-default.webp';
  const sedanArt = VehicleArt.artFor('Ford Americar');
  t.ok('a mapped vehicle has art', sedanArt?.img === artFor('Ford Americar', map['Ford Americar']).img && sedanArt.width === 2 && sedanArt.height === 5);
  const owned = { type: 'vehicle', name: 'Ford Americar', img: OLD, system: { vehicleType: 'car' },
    prototypeToken: { width: 1, height: 1, texture: { src: 'icons/svg/mystery-man.svg' } } };
  t.eq('an owned vehicle on the old texture gets the picture, the token art and its size', VehicleArt.fixActor(owned),
    { img: sedanArt.img, 'prototypeToken.texture.src': sedanArt.img, 'prototypeToken.width': 2, 'prototypeToken.height': 5 });
  const done = { ...owned, img: sedanArt.img, prototypeToken: { width: 2, height: 5, texture: { src: sedanArt.img } } };
  t.is('…and a second run changes nothing', VehicleArt.fixActor(done), null);
  t.is('a picture someone chose is left alone', VehicleArt.fixActor({ ...done, img: 'worlds/x/americar.webp' }), null);
  t.eq('a token a GM sized keeps its size, but still gets the art',
    VehicleArt.fixActor({ ...owned, prototypeToken: { width: 3, height: 3, texture: { src: OLD } } }),
    { img: sedanArt.img, 'prototypeToken.texture.src': sedanArt.img });
  t.eq('a chosen token texture keeps the token whole',
    VehicleArt.fixActor({ ...owned, prototypeToken: { width: 1, height: 1, texture: { src: 'worlds/x/tok.webp' } } }), { img: sedanArt.img });
  t.eq('an unlinked token\'s actor gets the picture only', VehicleArt.fixActor({ ...owned, isToken: true }), { img: sedanArt.img });
  t.is('a drone is not migrated (vehicles only — the maintainer, 2026-10-24)',
    VehicleArt.fixActor({ type: 'vehicle', name: 'GM-Nissan Doberman', img: 'systems/The2ndChumming3e/styles/textures/drone-default.webp', system: { vehicleType: 'drone' } }), null);
  t.is('a renamed vehicle is left alone', VehicleArt.fixActor({ ...owned, name: 'My Americar' }), null);
  t.is('a character is never touched', VehicleArt.fixActor({ ...owned, type: 'character' }), null);
  t.ok('a prototype token with nothing stored reads as the 1 × 1 default', VehicleArt.fixActor({ ...owned, prototypeToken: undefined })?.['prototypeToken.height'] === 5);
  t.ok('stock means blank, mystery man, the old textures or ours', [undefined, '', 'icons/svg/mystery-man.svg', OLD, sedanArt.img].every(isStock) && !isStock('worlds/x/y.webp'));
  const mig = readFileSync(join(ROOT, 'scripts', 'SR3EMigrations.js'), 'utf8');
  t.ok('the 0.7.1 migration runs VehicleArt.fixActor', /version: '0\.7\.1'[\s\S]{0,3000}fixActor: VehicleArt\.fixActor/.test(mig));
}
