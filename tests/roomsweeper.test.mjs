/**
 * The Remington Roomsweeper follows the shotgun rules · SR3 p.277, p.278 (rules check 0.7.0, weapons.md #65/#195).
 *
 *   "Remington Roomsweeper: The short-barreled Roomsweeper heavy shotgun … (The weapon uses heavy-pistol
 *    ranges, but shotgun rules; see Shotguns, p. 117 of Combat.) It can be loaded with normal rounds instead
 *    of shotgun rounds, in which case the weapon does 9M damage."                              — SR3 p.277
 *   Firearms table p.278: Conceal 6, 8 (m), SA, 9S(f).
 *
 * `system.shotgunRules` makes a firearm follow them while its category (HPist) keeps the ranges and skill.
 * Its code 9S(f) is the SHOT code; normal rounds are 9M.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { Shotgun } = await import('../scripts/data/shotgun.mjs');
const { AmmoStock } = await import('../scripts/data/ammo-stock.mjs');
const { SR3EItem } = await import('../scripts/documents/SR3EItem.js');
const { guessGearModifiers } = await import('../scripts/SR3ECombatModifiers.js');

export const name = 'roomsweeper';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  const room = (extra = {}) => ({ type: 'firearm', system: {
    category: 'HPist', damage: '9S(f)', shotgunRules: true, loadedAmmoType: 'regular', equippedAmmoId: '', ...extra } });

  /* ── the flag, and ShtG implied ───────────────────────────────────────────── */
  t.ok('a ShtG follows the shotgun rules with no flag', Shotgun.usesRules({ system: { category: 'ShtG' } }));
  t.ok('a Roomsweeper (HPist + shotgunRules) does', Shotgun.usesRules(room()));
  t.ok('an ordinary heavy pistol does not', !Shotgun.usesRules({ system: { category: 'HPist', damage: '9M' } }));
  t.ok('…and a flag left false does not', !Shotgun.usesRules({ system: { category: 'HPist', shotgunRules: false } }));

  /* ── shot by default at the printed 9S(f); normal rounds 9M ──────────────── */
  t.is('nothing loaded: the table\'s code 9S(f)', Shotgun.damageCode(room().system), '9S(f)');
  t.ok('…and it throws shot (choke, spread)', Shotgun.firesShot(room()));
  t.ok('shot loaded: 9S(f), shot', Shotgun.firesShot(room({ loadedAmmoType: 'shot' })) && Shotgun.damageCode(room({ loadedAmmoType: 'shot' }).system) === '9S(f)');
  const normal = room({ loadedAmmoType: 'regular', equippedAmmoId: 'abc' });
  t.is('normal rounds loaded: 9M ("in which case the weapon does 9M damage")', Shotgun.damageCode(normal.system), '9M');
  t.ok('…and it does not spread', !Shotgun.firesShot(normal));
  t.ok('…but it is still a shotgun-rules weapon (recoil, gear)', Shotgun.usesRules(normal));
  t.is('a plain ShtG\'s slug code is untouched', Shotgun.damageCode({ category: 'ShtG', damage: '10S', loadedAmmoType: 'regular', equippedAmmoId: 'x' }), '10S');
  t.is('a ShtG with an (f) code is untouched (not the non-ShtG case)', Shotgun.damageCode({ category: 'ShtG', shotgunRules: true, damage: '10D(f)', equippedAmmoId: 'x' }), '10D(f)');
  t.is('an ordinary 9S(f) Slivergun (no flag) is untouched', Shotgun.damageCode({ category: 'HPist', damage: '9S(f)', equippedAmmoId: 'x' }), '9S(f)');
  t.is('stun survives the drop', Shotgun.damageCode({ category: 'HPist', shotgunRules: true, damage: '9S(f) Stun', equippedAmmoId: 'x' }), '9M Stun');
  t.ok('a plain ShtG with shot loaded still spreads', Shotgun.firesShot({ system: { category: 'ShtG', loadedAmmoType: 'shot' } }));
  t.ok('…and with slugs it does not', !Shotgun.firesShot({ system: { category: 'ShtG', loadedAmmoType: 'regular' } }));

  /* ── the flechette rules and the ammunition it takes ──────────────────────── */
  t.is('shot / nothing loaded: the (f) code, armour rule only', SR3EItem.flechetteAmmo(room().system, 'regular'), 'flechette-coded');
  t.is('shot loaded: the same', SR3EItem.flechetteAmmo(room({ loadedAmmoType: 'shot' }).system, 'shot'), 'flechette-coded');
  t.is('normal rounds: no flechette rules at all', SR3EItem.flechetteAmmo(normal.system, 'regular'), 'regular');
  const ok = ty => SR3EItem.weaponAcceptsAmmoType(room().system, ty);
  t.ok('it takes normal rounds and shotgun rounds', ok('regular') && ok('shot'));
  t.ok('…and nothing else (gel, APDS, explosive)', ['gel', 'apds', 'explosive', 'flechette'].every(x => !ok(x)));
  t.ok('a plain heavy pistol is unaffected', SR3EItem.weaponAcceptsAmmoType({ category: 'HPist', damage: '9M' }, 'gel'));

  /* ── the ammunition class: heavy pistol rounds AND shotgun ammunition ─────── */
  t.eq('its classes are HPist and ShtG', AmmoStock.gunClasses(room().system), ['HPist', 'ShtG']);
  t.eq('a plain heavy pistol: HPist only', AmmoStock.gunClasses({ category: 'HPist' }), ['HPist']);
  t.eq('a ShtG: ShtG only', AmmoStock.gunClasses({ category: 'ShtG' }), ['ShtG']);
  const fits = (box) => AmmoStock.fits(box, 'm', AmmoStock.gunClasses(room().system));
  t.ok('a box of shotgun ammunition fits ("Shotguns, whether pistols or rifles, can share ammo")', fits({ gunClass: 'ShtG', loadMechanism: 'm', ammoType: 'shot' }));
  t.ok('…so does a box of heavy-pistol rounds (normal rounds)', fits({ gunClass: 'HPist', loadMechanism: 'm' }));
  t.ok('…a box with no class yet', fits({ gunClass: '', loadMechanism: 'm' }));
  t.ok('…but not rifle rounds', !fits({ gunClass: 'AsRf', loadMechanism: 'm' }));
  t.is('shot in it is stamped shotgun ammunition', AmmoStock.classForType(room().system, 'shot'), 'ShtG');
  t.is('normal rounds are stamped heavy pistol', AmmoStock.classForType(room().system, 'regular'), 'HPist');

  /* ── gear rules: "Shotguns get no benefits from smart goggles or laser sights" ── */
  const shooter = { items: [{ type: 'gear', name: 'Smart Goggles' }] };
  const lased = { ...room(), system: { ...room().system, laserSight: true } };
  t.ok('a Roomsweeper gets no laser-sight benefit', !guessGearModifiers(shooter, lased).laserSight);
  const pistol = { type: 'firearm', system: { category: 'HPist', damage: '9M', laserSight: true } };
  t.ok('…an ordinary heavy pistol still does', guessGearModifiers(shooter, pistol).laserSight);

  /* ── the pack, and the item sheet ─────────────────────────────────────────── */
  const dir = new URL('../packs-src/sr3e-sr3-firearms/', import.meta.url);
  const f = readdirSync(dir).find(n => n.endsWith('.sr3e-firearm-0132.json'));
  const doc = JSON.parse(readFileSync(new URL(f, dir), 'utf8')).doc;
  t.eq('the Roomsweeper is HPist (heavy-pistol ranges, Pistols), 9S(f), SA, 8(m), Conceal 6 (p.278)',
    [doc.system.category, doc.system.skill, doc.system.damage, doc.system.mode, doc.system.ammunition, doc.system.concealability],
    ['HPist', 'Pistols', '9S(f)', 'SA', '8(m)', '6']);
  t.ok('…and carries the shotgun-rules flag', doc.system.shotgunRules === true);

  const src = read('scripts/documents/SR3EItem.js');
  t.ok('rollWeapon fires the code Shotgun.damageCode gives', /let rawDamage = Shotgun\.damageCode\(this\.system\)/.test(src));
  t.ok('the isShotgun check (choke, double BF recoil) reads usesRules', /const isShotgun = Shotgun\.usesRules\(this\.system\)/.test(src));
  t.ok('the reload list reads the gun\'s classes, not one', /AmmoStock\.fits\(i\.system, gunMech, gunClasses\)/.test(src));
  t.ok('the gear guesses read usesRules', /const shotgun = Shotgun\.usesRules\(weapon\)/.test(read('scripts/SR3ECombatModifiers.js')));
  t.ok('FirearmData declares shotgunRules (default false)', /shotgunRules:\s+new BooleanField\(\{ initial: false \}\)/.test(read('scripts/data/ItemDataModels.js')));
  t.ok('the item sheet has the checkbox', /_check\('Shotgun rules[^']*', 'shotgunRules'/.test(read('scripts/sheets/SR3EItemSheet.js')));
  t.ok('TESTING.md says the data-model field needs a full restart', /shotgunRules/.test(read('TESTING.md')));
}
