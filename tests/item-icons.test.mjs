/**
 * Item pictures — `scripts/data/item-icons.mjs`, the icons `tools/build-item-icons.mjs` draws, and the
 * packs `tools/apply-item-icons.mjs` points at them. Asked for 2026-09-26: *"I just want to get away
 * from the foundry extra white icons."*
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CLIP_ROUND_BY_SIZE, FIREARM_ICON_OF, AMMO_TYPE_COLOR, BULLET_ICONS, ammoVariant,
  itemIcon, defaultImage, isStockImage, restockImage, allIconNames, TYPE_ART, ICON_DIR,
  actorIcon, restockActorImage, MATRIX_ICONS, MATRIX_SCHEMES, matrixIcon,
} from '../scripts/data/item-icons.mjs';
import { render, OUT } from '../tools/build-item-icons.mjs';
import * as Matrix from '../tools/build-matrix-icons.mjs';

export const name = 'item-icons';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const I = n => `${ICON_DIR}/${n}.svg`;
const ammo = (system, name = 'Regular Rnds') => itemIcon({ type: 'ammunition', name, system });

export async function run(t) {
  /* ── Gear and medical ──────────────────────────────────────────────────────────── */
  t.is('gear by category: a credstick', itemIcon({ type: 'gear', system: { category: 'Credstick' } }), I('gear-credstick'));
  t.is('gear with no known category is the case', itemIcon({ type: 'gear', system: {} }), I('gear-case'));
  t.is('a slap patch', itemIcon({ type: 'medical', name: 'Trauma Patch' }), I('medical-patch'));
  t.is('a hospital', itemIcon({ type: 'medical', name: 'Alpha Hospital Rating 3' }), I('medical-clinic'));
  t.is('a medkit', itemIcon({ type: 'medical', name: 'Medkit Rating 3' }), I('medical-medkit'));

  /* ── Ammunition: magazine or loose, and the class of gun (SR3 p.279) ──────────── */
  t.is('a box of rounds with no class', ammo({ loadMechanism: 'c', countedIn: 'rounds' }), I('ammo-rounds'));
  t.is('a clip counted in reloads is a magazine', ammo({ loadMechanism: 'c', countedIn: 'reloads' }, '10-Rnd Clip (Gel)'), I('ammo-mag'));
  t.is('…for a heavy pistol', ammo({ loadMechanism: 'c', countedIn: 'reloads', gunClass: 'HPist' }), I('ammo-mag-pistol'));
  t.is('rounds for an SMG', ammo({ loadMechanism: 'c', countedIn: 'rounds', gunClass: 'SMG' }), I('ammo-rounds-smg'));
  t.is('rounds for an assault rifle', ammo({ countedIn: 'rounds', gunClass: 'AsRf' }), I('ammo-rounds-rifle'));
  t.is('a carbine\'s class alias is an assault rifle', ammo({ countedIn: 'rounds', gunClass: 'Carb' }), I('ammo-rounds-rifle'));
  t.is('shotgun shells', ammo({ countedIn: 'rounds', gunClass: 'ShtG' }), I('ammo-rounds-shotgun'));
  t.is('a cylinder counted in reloads is a magazine too', ammo({ loadMechanism: 'cy', countedIn: 'reloads', gunClass: 'LPist' }), I('ammo-mag-pistol'));
  t.is('a tube is loose whatever it says', ammo({ loadMechanism: 'm', countedIn: 'reloads' }, 'Offensive HE Mini-grenade'), I('ammo-minigrenade'));
  t.is('arrows', ammo({ loadMechanism: 'arrow' }, 'Arrows'), I('ammo-arrows'));
  t.is('bolts', ammo({ loadMechanism: 'bolt' }, 'Bolts'), I('ammo-bolts'));
  t.is('darts by name', ammo({ loadMechanism: 'c' }, 'Dart, Narcoject'), I('ammo-dart'));
  t.is('a belt by name', ammo({ loadMechanism: 'c' }, 'Assault Cannon Belt (100)'), I('ammo-belt'));
  t.is('a mortar round', ammo({ loadMechanism: 'c' }, 'HE Mortar Round B'), I('ammo-mortar'));
  t.is('a mine', ammo({ loadMechanism: 'c' }, 'Anti-Vehicle Mine'), I('ammo-mine'));

  /* ── Firearms: one silhouette per weapon class (TODO 181) ─────────────────────── */
  const gun = category => itemIcon({ type: 'firearm', name: 'X', system: { category } });
  t.is('a hold-out pistol', gun('HOPist'), I('firearm-pistol-holdout'));
  t.is('a heavy pistol', gun('HPist'), I('firearm-pistol-heavy'));
  t.eq('a very heavy pistol and a gyrojet share the heavy pistol', [gun('VHP'), gun('GJPist')], [I('firearm-pistol-heavy'), I('firearm-pistol-heavy')]);
  t.eq('an SMG is not a machine pistol', [gun('SMG'), gun('MaPist')], [I('firearm-smg'), I('firearm-machine-pistol')]);
  t.eq('a sniper rifle and a sporting rifle differ', [gun('Snip'), gun('SptR')], [I('firearm-sniper-rifle'), I('firearm-sporting-rifle')]);
  t.eq('a mortar and a launcher share the launcher', [gun('MrTr'), gun('MisLn')], [I('firearm-missile-launcher'), I('firearm-missile-launcher')]);
  t.is('a category with no silhouette gets none from itemIcon', gun('ZZZ'), null);
  t.is('a firearm on the old texture is restocked', restockImage({ type: 'firearm', name: 'Predator', img: TYPE_ART.firearm, system: { category: 'HPist' } }), I('firearm-pistol-heavy'));
  t.is('…one someone chose is left alone', restockImage({ type: 'firearm', name: 'Predator', img: 'worlds/test/predator.webp', system: { category: 'HPist' } }), null);
  const shippedCategories = new Set();
  for (const pack of readdirSync(join(ROOT, 'packs-src')).filter(p => p.endsWith('-firearms'))) {
    for (const f of readdirSync(join(ROOT, 'packs-src', pack))) {
      const d = JSON.parse(readFileSync(join(ROOT, 'packs-src', pack, f), 'utf8')).doc;
      if (d?.type === 'firearm' && d.system?.category) shippedCategories.add(d.system.category);
    }
  }
  t.eq('every shipped firearm category has a silhouette', [...shippedCategories].filter(c => !FIREARM_ICON_OF[c]), []);

  /* ── Ammunition: a colour per type (TODO 178) and clip art by size ────────────── */
  t.is('regular ammunition is the plain icon', ammo({ countedIn: 'rounds', ammoType: 'regular' }), I('ammo-rounds'));
  t.is('gel rounds are tinted', ammo({ countedIn: 'rounds', ammoType: 'gel' }), I('ammo-rounds-gel'));
  t.is('…on top of the class art', ammo({ loadMechanism: 'c', countedIn: 'reloads', gunClass: 'HPist', ammoType: 'apds' }), I('ammo-mag-pistol-apds'));
  t.is('an arrow is never tinted', ammo({ loadMechanism: 'arrow', ammoType: 'explosive' }, 'Arrows'), I('ammo-arrows'));
  t.is('a mini-grenade is never tinted', ammo({ loadMechanism: 'm', ammoType: 'explosive' }, 'HE Mini-grenade'), I('ammo-minigrenade'));
  t.is('an unknown type is the plain icon', ammo({ countedIn: 'rounds', ammoType: 'mystery' }), I('ammo-rounds'));
  t.eq('all eight non-regular types have a colour', Object.keys(AMMO_TYPE_COLOR).sort(),
    ['antiVehicle', 'apds', 'exExplosive', 'explosive', 'flechette', 'gel', 'shot', 'tracer']);
  t.eq('every type colour is distinct', new Set(Object.values(AMMO_TYPE_COLOR)).size, Object.keys(AMMO_TYPE_COLOR).length);
  t.is('ammoVariant leaves a non-bullet alone', ammoVariant('ammo-belt', 'gel'), 'ammo-belt');
  const base = Object.fromEntries(render().map(i => [i.file, i.text]));
  const swapped = BULLET_ICONS.every(b => Object.entries(AMMO_TYPE_COLOR).every(([type, c]) => base[`${ammoVariant(b, type)}.svg`]?.replaceAll(c, '#ff962d') === base[`${b}.svg`]));
  t.ok('each tinted variant is its plain icon with only the orange swapped', swapped);

  t.is('a 16-round clip is a pistol magazine', ammo({ loadMechanism: 'c', countedIn: 'reloads' }, '16-Rnd Clip (Regular)'), I('ammo-mag-pistol'));
  t.is('a 14-round clip is a rifle magazine, in its type colour', ammo({ loadMechanism: 'c', countedIn: 'reloads', ammoType: 'gel' }, '14-Rnd Clip (Gel)'), I('ammo-mag-rifle-gel'));
  t.is('a 28-round clip is an SMG magazine', ammo({ loadMechanism: 'c', countedIn: 'reloads' }, '28-Rnd Clip (Regular)'), I('ammo-mag-smg'));
  t.is('a 15-round clip fits several kinds of gun, so it stays generic', ammo({ loadMechanism: 'c', countedIn: 'reloads' }, '15-Rnd Clip (Regular)'), I('ammo-mag'));
  t.is('a class a gun stated beats the size', ammo({ loadMechanism: 'c', countedIn: 'reloads', gunClass: 'ShtG' }, '16-Rnd Clip (Regular)'), I('ammo-mag-shotgun'));
  t.is('loose rounds take nothing from a clip size', ammo({ loadMechanism: 'c', countedIn: 'rounds' }, '16-Rnd Clip (Regular)'), I('ammo-rounds'));
  // Re-derive the size table from the shipped firearm tables: a size may name a kind only if EVERY gun taking it is that kind.
  const KIND = { HOPist: 'pistol', LPist: 'pistol', MPist: 'pistol', HPist: 'pistol', VHP: 'pistol', MaPist: 'smg', SMG: 'smg',
    SptR: 'rifle', Snip: 'rifle', Carb: 'rifle', LCarb: 'rifle', AsRf: 'rifle', LMG: 'rifle', MMG: 'rifle', HMG: 'rifle', MinG: 'rifle' };
  const kindsBySize = {};
  for (const pack of readdirSync(join(ROOT, 'packs-src')).filter(p => p.endsWith('-firearms'))) {
    for (const f of readdirSync(join(ROOT, 'packs-src', pack))) {
      const d = JSON.parse(readFileSync(join(ROOT, 'packs-src', pack, f), 'utf8')).doc;
      const m = d?.type === 'firearm' && /^(\d+)\s*\(c\)/i.exec(String(d.system?.ammunition ?? ''));
      if (m) (kindsBySize[m[1]] ??= new Set()).add(KIND[d.system.category] ?? `other:${d.system.category}`);
    }
  }
  t.eq('every clip size given art is taken ONLY by guns of that kind',
    Object.entries(CLIP_ROUND_BY_SIZE).filter(([size, kind]) => ![...(kindsBySize[size] ?? [])].every(k => k === kind) || !kindsBySize[size]), []);

  /* ── Melee, projectile, thrown and vehicle weapons: one icon per kind (TODO 182) ─── */
  const weapon = (type, name, system) => itemIcon({ type, name, system });
  const meleeCases = { EDG: 'melee-edged', CLB: 'melee-club', POL: 'melee-pole', WHP: 'melee-whip', CYB: 'melee-cyber', UNA: 'melee-unarmed' };
  for (const [cat, icon] of Object.entries(meleeCases)) t.is(`melee ${cat}`, weapon('melee', 'X', { category: cat }), I(icon));
  t.is('a chainsaw is read from its name', weapon('melee', 'Chainsaw', { category: 'other' }), I('melee-chainsaw'));
  t.is('a hand razor is a cyber weapon by name', weapon('melee', 'H.Razor', { category: 'other' }), I('melee-cyber'));
  t.is('a pipe is a club by name', weapon('melee', 'Pipe', { category: 'other' }), I('melee-club'));
  t.is('a telescoping staff is a pole arm by name', weapon('melee', 'ACB Harmony Telescoping Staff', { category: 'other' }), I('melee-pole'));
  t.is('a butterfly knife of no category is edged', weapon('melee', 'Black Whistle Butterfly Knife', { category: 'other' }), I('melee-edged'));
  t.is('a category beats the name', weapon('melee', 'Chainsaw', { category: 'EDG' }), I('melee-edged'));
  t.eq('every crossbow is one icon', ['LCB', 'MCB', 'HCB'].map(c => weapon('projectile', 'X', { category: c })), Array(3).fill(I('projectile-crossbow')));
  t.is('a bow', weapon('projectile', 'Ranger-X Bow', { category: 'Bow' }), I('projectile-bow'));
  t.is('a throwing knife', weapon('projectile', 'Throwing Knife', { category: 'TK' }), I('thrown-knife'));
  t.is('a grenade', weapon('projectile', 'Smoke Grenade', { category: 'GR' }), I('thrown-grenade'));
  t.is('a shuriken is filed under "SH" and read by name', weapon('projectile', 'Shuriken', { category: 'SH' }), I('thrown-shuriken'));
  t.is('…and a sling shot under the same code is a sling', weapon('projectile', 'Sling Shot', { category: 'SH' }), I('projectile-sling'));
  t.is('a net has no category and is read by name', weapon('projectile', 'Net', { category: 'other' }), I('thrown-net'));
  t.is('a thrown-type grenade by name', weapon('thrown', 'Flash-Pak', {}), I('thrown-grenade'));
  t.is('a thrown weapon nothing names keeps its texture', weapon('thrown', 'Mystery Lump', {}), null);
  t.is('an autocannon is a cannon', weapon('vehicleweapon', 'X', { weaponType: 'Autocannon' }), I('vehicle-weapon-cannon'));
  t.is('a vehicle minigun is a mounted gun', weapon('vehicleweapon', 'X', { weaponType: 'HMG' }), I('vehicle-weapon-gun'));
  t.is('a missile', weapon('vehicleweapon', 'X', { weaponType: 'Missile' }), I('vehicle-weapon-missile'));
  t.is('a lure launcher', weapon('vehicleweapon', 'X', { weaponType: 'Lure Launcher' }), I('vehicle-weapon-launcher'));
  t.is('a laser is cyan', weapon('vehicleweapon', 'X', { weaponType: 'LASER' }), I('vehicle-weapon-laser'));
  t.is('a mechanical tentacle is an arm', weapon('vehicleweapon', 'X', { weaponType: 'Mechanical Tentacle' }), I('vehicle-weapon-arm'));
  t.is('an unlisted type falls back to the name', weapon('vehicleweapon', 'Sabre Missile Pod', { weaponType: '' }), I('vehicle-weapon-missile'));
  t.is('a melee weapon on the old texture is restocked', restockImage({ type: 'melee', name: 'Katana', img: TYPE_ART.melee, system: { category: 'EDG' } }), I('melee-edged'));
  t.is('…one someone chose is left alone', restockImage({ type: 'melee', name: 'Katana', img: 'worlds/test/katana.webp', system: { category: 'EDG' } }), null);
  // Every shipped weapon gets a drawn icon, never the painted texture (a category nobody drew must fail here).
  const undrawn = [];
  for (const pack of readdirSync(join(ROOT, 'packs-src'))) {
    for (const f of readdirSync(join(ROOT, 'packs-src', pack))) {
      const d = JSON.parse(readFileSync(join(ROOT, 'packs-src', pack, f), 'utf8')).doc;
      if (['melee', 'projectile', 'thrown', 'vehicleweapon'].includes(d?.type) && !itemIcon(d)) undrawn.push(`${d.type}: ${d.name}`);
    }
  }
  t.eq('every shipped melee, projectile, thrown and vehicle weapon has a drawn icon', undrawn, []);

  /* ── Every other type: its painted texture, never a Foundry core icon ─────────── */
  t.is('a skill shows the skills texture', defaultImage({ type: 'skill' }), TYPE_ART.skill);
  t.is('a firearm of a category with no silhouette keeps the firearms texture', defaultImage({ type: 'firearm', system: { category: 'ZZZ' } }), TYPE_ART.firearm);
  t.is('a type with no art has no default', defaultImage({ type: 'contact' }), null);
  t.ok('no type falls back to a Foundry core icon', Object.values(TYPE_ART).every(p => !p.startsWith('icons/')));

  /* ── Armour: a garment by name (TODO 179) ──────────────────────────────────────── */
  const arm = name => itemIcon({ type: 'armor', name, system: {} });
  const armCases = {
    'Secure Long Coat': 'armor-coat', 'Lined Coat': 'armor-coat', 'Armor Vest': 'armor-vest', 'Secure Ultra-Vest': 'armor-vest',
    'Armor Jacket': 'armor-jacket', 'Camo Jacket (Snow)': 'armor-jacket', 'Armante "Executive Suite" Tux': 'armor-jacket',
    'Camo Full Suit (Urban)': 'armor-suit', 'Victory "Industrious" Coverall': 'armor-suit', 'Real Leather Pants': 'armor-pants',
    'Zoe "Futura" Slacks': 'armor-pants', 'Form-fitting Shirt': 'armor-shirt', 'Ordinary Clothing': 'armor-shirt',
    'Heavy Military Armor': 'armor-plate', 'Diving Armor': 'armor-plate', 'Military Helmet': 'armor-helmet',
    'Victory "Industrious" Hardhat': 'armor-helmet', 'Riot Shield, Small': 'armor-shield', 'Geck Tape Gloves': 'armor-gloves',
    'Forearm Guards': 'armor-gloves', 'Armante "Starlight" Dress': 'armor-dress', 'Armante "Ancien" Shawl': 'armor-dress',
    '+Signal Locator 3': 'armor-accessory', '+Respirator': 'armor-accessory', '+Low-light Vision': 'gear-goggles',
    'Shark Chain': 'armor-accessory', 'Something Unheard Of': 'armor-jacket',
  };
  for (const [n, icon] of Object.entries(armCases)) t.is(`armour "${n}"`, arm(n), I(icon));
  t.is('the old armour texture is replaced by a garment', restockImage({ type: 'armor', name: 'Armor Vest', img: TYPE_ART.armor, system: {} }), I('armor-vest'));
  t.is('a chosen armour picture is left alone', restockImage({ type: 'armor', name: 'Armor Vest', img: 'worlds/test/mine.webp', system: {} }), null);
  const armorNames = new Set();
  for (const pack of readdirSync(join(ROOT, 'packs-src'))) for (const f of readdirSync(join(ROOT, 'packs-src', pack))) {
    const d = JSON.parse(readFileSync(join(ROOT, 'packs-src', pack, f), 'utf8'));
    if (d.doc?.type === 'armor' && d._key.startsWith('!items!')) armorNames.add(d.doc.name);
  }
  t.eq('every shipped armour has a garment icon (not a texture)', [...armorNames].filter(n => !arm(n)), []);

  /* ── Only a stock picture is ever replaced ────────────────────────────────────── */
  t.ok('Foundry\'s item bag is stock', isStockImage('icons/svg/item-bag.svg'));
  t.ok('none is stock', isStockImage(''));
  t.ok('a drawn icon is stock', isStockImage(I('ammo-rounds')));
  t.ok('the old medical texture is stock', isStockImage('systems/The2ndChumming3e/styles/textures/medical-default.webp'));
  t.ok('a picture someone chose is not', !isStockImage('worlds/test/my-gun.webp'));
  t.is('a chosen picture is left alone', restockImage({ type: 'gear', img: 'worlds/test/deck.webp', system: {} }), null);
  t.is('an item already right is left alone', restockImage({ type: 'skill', img: TYPE_ART.skill }), null);
  t.is('ammunition follows the class a gun stamps on it',
    restockImage({ type: 'ammunition', img: I('ammo-rounds'), name: 'Regular Rnds', system: { countedIn: 'rounds', gunClass: 'SMG' } }),
    I('ammo-rounds-smg'));

  /* ── The drawn icons ──────────────────────────────────────────────────────────── */
  const drawn = new Set(render().map(i => i.file.replace(/\.svg$/, '')));
  const missing = allIconNames().filter(n => !drawn.has(n));
  t.eq('every icon the mapping can name is drawn', missing, []);
  const stale = render().filter(({ file, text }) => !existsSync(join(OUT, file)) || readFileSync(join(OUT, file), 'utf8') !== text).map(i => i.file);
  t.eq('styles/icons matches the builder (run: node tools/build-item-icons.mjs)', stale, []);
  const extra = readdirSync(OUT).filter(f => f.endsWith('.svg') && !drawn.has(f.replace(/\.svg$/, '')));
  t.eq('no icon in styles/icons that the builder does not draw', extra, []);
  t.ok('icons reference nothing outside themselves (an <img> cannot load it)',
    render().every(({ text }) => !/(href|url\()\s*=?\s*["']?(?!#)(https?:|\/|\.)/.test(text.replace(/xmlns="[^"]+"/, ''))));

  /* ── Matrix: drawn twice, hostile and friendly (asked for 2026-09-26) ──────────── */
  const M = (n, s) => matrixIcon(n, s);
  t.eq('the builder draws exactly the Matrix icons the mapping knows', Object.keys(Matrix.ICONS).sort(), [...MATRIX_ICONS].sort());
  t.eq('…in both schemes', Object.keys(Matrix.SCHEMES), MATRIX_SCHEMES);
  const mStale = Matrix.render().filter(({ file, text }) => !existsSync(join(Matrix.OUT, file)) || readFileSync(join(Matrix.OUT, file), 'utf8') !== text).map(i => i.file);
  t.eq('styles/icons/matrix matches the builder (run: node tools/build-matrix-icons.mjs)', mStale, []);
  const mExtra = MATRIX_SCHEMES.flatMap(s => readdirSync(join(Matrix.OUT, s)).filter(f => !Matrix.render().some(i => i.file === `${s}/${f}`)));
  t.eq('no Matrix icon on disk that the builder does not draw', mExtra, []);
  t.is('a program by name, friendly', itemIcon({ type: 'program', name: 'Read/Write' }), M('program-read-write', 'friendly'));
  t.is('an Orthodox rating in brackets is dropped', itemIcon({ type: 'program', name: 'Attack (Deadly)' }), M('program-attack', 'friendly'));
  t.is('an Orthodox utility with no icon uses its MDF twin', itemIcon({ type: 'program', name: 'Spoof' }), M('program-sleaze', 'friendly'));
  t.is('an unknown program is the generic one', itemIcon({ type: 'program', name: 'Homebrew' }), M('program', 'friendly'));
  t.is('a cyberdeck', itemIcon({ type: 'cyberdeck', name: 'Fuchi Cyber-7' }), M('cyberdeck', 'friendly'));
  t.is('IC by its type, hostile', actorIcon({ type: 'ic', name: 'Killer IC', system: { icType: 'Killer' } }), M('ic-killer', 'hostile'));
  t.is('a passive IC by its name, not its type', actorIcon({ type: 'ic', name: 'Alert (Passive)', system: { icType: 'Scrambler' } }), M('ic-alert', 'hostile'));
  t.is('a host, hostile', actorIcon({ type: 'host', name: 'Downtown Public MetroGrid' }), M('host', 'hostile'));
  t.is('an agent, friendly', actorIcon({ type: 'agent', name: 'Bloodhound' }), M('persona-agent', 'friendly'));
  t.is('a character has no Matrix icon', actorIcon({ type: 'character' }), null);
  t.ok('a Matrix icon is never stock — the scheme is the GM\'s mark', !isStockImage(M('ic-killer', 'friendly')));
  t.is('an IC the GM marked friendly stays friendly', restockActorImage({ type: 'ic', name: 'Killer', system: { icType: 'Killer' }, img: M('ic-killer', 'friendly') }), null);
  t.is('an IC on the old texture gets its icon', restockActorImage({ type: 'ic', name: 'Killer', system: { icType: 'Killer' },
    img: 'systems/The2ndChumming3e/styles/textures/agent-default.webp' }), M('ic-killer', 'hostile'));

  /* ── The packs ────────────────────────────────────────────────────────────────── */
  const behind = [];
  const src = join(ROOT, 'packs-src');
  for (const pack of readdirSync(src)) {
    for (const f of readdirSync(join(src, pack)).filter(f => f.endsWith('.json'))) {
      const g = JSON.parse(readFileSync(join(src, pack, f), 'utf8'));
      const items = [[g._key, g.doc], ...Object.entries(g.embedded ?? {})].filter(([k]) => /^!(items|[a-z]+\.items)!/.test(k));
      for (const [, doc] of items) if (restockImage(doc)) behind.push(`${pack}: ${doc.name}`);
      if (g._key.startsWith('!actors!') && restockActorImage(g.doc)) behind.push(`${pack}: ${g.doc.name}`);
    }
  }
  t.eq('every shipped item carries its picture (run: node tools/apply-item-icons.mjs)', behind.slice(0, 5), []);

  /* ── The Foundry side (source-level: sr3e.js cannot be imported without Foundry) ── */
  const main = readFileSync(join(ROOT, 'scripts', 'sr3e.js'), 'utf8');
  t.ok('a new item gets its picture on create', /Hooks\.on\('preCreateItem'[\s\S]{0,120}restockImage\(document\)/.test(main));
  t.ok('an IC, host or agent gets its Matrix icon on create', /Hooks\.on\('preCreateActor'[\s\S]{0,120}restockActorImage\(document\)/.test(main));
  t.ok('ammunition\'s picture follows an update to its class', /Hooks\.on\('preUpdateItem'[\s\S]{0,300}restockImage\(/.test(main));
}
