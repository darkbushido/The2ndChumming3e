/**
 * 🛒 Buy ammo from the gun · SR3 pp.279-281 (requested 2026-10-25).
 *
 * "its difficult to buy the right ammo, there should be a way on the guns description to buy its specific ammo" —
 * and "yes stamp it": the box bought that way carries the gun's class. The fit is `reload()`'s own rule
 * (`AmmoStock.fits`, `weaponAcceptsAmmoType`, the launcher's mini-grenades) plus, for shopping, the clip's size.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AmmoShop, AMMO_INDEX_FIELDS, WEAPON_SPECIFIC } from '../scripts/data/ammo-shop.mjs';
import { GearSearch, INDEX_FIELDS } from '../scripts/data/gear-search.mjs';
import { readSourceDir } from '../tools/lib/pack-source.mjs';

export const name = 'ammo-shop';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(ROOT, p), 'utf8');

export async function run(t) {
  const ammo = ['sr3', 'cc', 'mm'].flatMap(b => [...readSourceDir(join(ROOT, 'packs-src', `sr3e-${b}-ammunition`)).values()])
    .filter(d => d.type === 'ammunition');
  const shop = crit => ammo.filter(d => AmmoShop.fits(d.system, crit, d.name)).map(d => d.name);

  /* ── An Ares Predator: 15(c), heavy pistol · SR3 p.276 ─────────────────────── */
  const predator = AmmoShop.criteria({ name: 'Ares Predator', system: { category: 'HPist' }, mech: 'c', magSize: 15 });
  const forPredator = shop(predator);
  t.ok('the Predator is offered its own 15-round clips', ['15-Rnd Clip (Regular)', '15-Rnd Clip (APDS)', '15-Rnd Clip (Gel)'].every(n => forPredator.includes(n)));
  t.ok('…and the loose rounds of every type (they fit any gun of their class, p.279)', ['Regular Rnds', 'APDS Rnds', 'Gel Rnds'].every(n => forPredator.includes(n)));
  t.ok('…but no clip of another size (a 10-round clip is not this gun\'s magazine)', !forPredator.some(n => /^(?!15-)\d+-Rnd Clip/.test(n)));
  t.ok('…no arrows or bolts (another mechanism)', !forPredator.some(n => /Arrows|Bolts/.test(n)));
  t.ok('…no mini-grenades (a launcher\'s, stated for the GrLn class)', !forPredator.some(n => /Mini-grenade/.test(n)));
  t.ok('…and none of the rounds made for one other weapon — Assault Cannon shells, darts, mortar rounds, mines',
    !forPredator.some(n => /Assault Cannon|^Dart,|Mortar|Mine\b|Gyrojet|Taser/.test(n)));
  t.ok('the list is far shorter than the packs', forPredator.length < ammo.length / 4, `${forPredator.length} of ${ammo.length}`);

  // A weapon-specific box IS offered to its own weapon.
  t.ok('a dart pistol is offered the darts', shop(AmmoShop.criteria({ name: 'Parashield Dart Pistol', system: { category: 'LPist' }, mech: 'c', magSize: 5 })).includes('Dart, Narcoject'));
  t.ok('an assault cannon its shells', shop(AmmoShop.criteria({ name: 'Panther Assault Cannon', system: { category: 'AsCn' }, mech: 'c', magSize: 20 })).includes('Assault Cannon Rnds'));
  t.ok('every weapon-specific rule names a book row and a weapon', WEAPON_SPECIFIC.every(w => w.box instanceof RegExp && w.gun instanceof RegExp));

  // The types a gun takes, and the launcher's grenades.
  const flechetteGun = AmmoShop.criteria({ name: 'Ingram Valiant', system: { category: 'LMG' }, mech: 'c', magSize: 15, accepts: ty => ty === 'regular' });
  t.ok('a gun that takes only regular rounds is not offered APDS', !shop(flechetteGun).includes('APDS Rnds') && shop(flechetteGun).includes('Regular Rnds'));
  const launcher = AmmoShop.criteria({ name: 'Ares Antioch', system: { category: 'GrLn' }, mech: 'm', magSize: 8, launcher: true });
  const forLauncher = shop(launcher);
  t.ok('a grenade launcher is offered only mini-grenades (p.279)', forLauncher.length > 0 && forLauncher.every(n => /Mini-grenade/.test(n)));

  /* ── The stamp ("yes stamp it") ────────────────────────────────────────────── */
  t.is('a box with no class is stamped with the gun\'s', AmmoShop.stamp({ gunClass: '' }, predator), 'HPist');
  t.is('…a box that states its class keeps it', AmmoShop.stamp({ gunClass: 'GrLn' }, predator), null);
  t.is('…and a bow (no firearm class) stamps nothing', AmmoShop.stamp({}, AmmoShop.criteria({ name: 'Bow', mech: 'arrow', magSize: 1, firearm: false })), null);
  t.ok('the dialog line says what the gun takes', /15-round \(c\), HPist class/.test(AmmoShop.describe('Ares Predator', predator)));

  /* ── The search, the dialog, the sheet, the payment (source-level: they need Foundry) ── */
  t.ok('the search index carries the ammunition fields', AMMO_INDEX_FIELDS.every(f => INDEX_FIELDS.includes(f)));
  t.eq('…and an ammunition entry its system subset', GearSearch.fromIndex({ name: 'Gel Rnds', type: 'ammunition',
    system: { ammoType: 'gel', loadMechanism: 'c' } }, null).ammo?.ammoType, 'gel');
  t.is('…a non-ammunition entry none', GearSearch.fromIndex({ name: 'Katana', type: 'melee', system: {} }, null).ammo, null);

  const flow = read('scripts/SR3EPurchase.js');
  t.ok('Buy gear takes forWeapon', /async open\(actor, item = null, \{ forWeapon = null \} = \{\}\)/.test(flow));
  t.ok('…reads the gun exactly as reload() does', /_weaponLoadMechanism\?\.\(\)/.test(flow) && /_weaponMagazineSize\?\.\(\)/.test(flow)
    && /weaponAcceptsAmmoType\(gun\?\.system/.test(flow) && /MiniGrenade\.isLauncher\(gun\.system\)/.test(flow));
  t.ok('…lists only what fits', /all\.filter\(e => e\.type === 'ammunition' && AmmoShop\.fits\(e\.ammo \?\? \{\}, crit, e\.name\)\)/.test(flow));
  t.ok('…straight away, with no search typed', /if \(crit\) drawHits\(\);/.test(flow));
  t.ok('the class rides to 💴 on both paths (store and contact)', /gunClass: crit\?\.gunClass/.test(flow) && /store: true, gunClass: result\.gunClass/.test(flow));
  t.ok('💴 stamps the box while it states no class', /AmmoShop\.stamp\(data\.system, \{ gunClass: payload\.gunClass \}\)/.test(flow));
  const sheet = read('scripts/sheets/SR3EItemSheet.js');
  t.ok('the weapon sheet has 🛒 Buy ammo', /buyAmmo:\s+SR3EItemSheet\._onBuyAmmo/.test(sheet) && /data-action="buyAmmo"/.test(sheet));
  t.ok('…on a firearm or a nocking bow, owned, on an actor', /it\.type === 'firearm' \|\| \(it\.type === 'projectile' && it\._usesNockedAmmo\?\.\(\)\)/.test(sheet)
    && /!it\.actor \|\| !it\.isOwner/.test(sheet));
  t.ok('…which opens Buy gear for that weapon', /SR3EPurchase\.open\(actor, null, \{ forWeapon: this\.item \}\)/.test(sheet));
}
