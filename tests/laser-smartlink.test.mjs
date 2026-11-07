/**
 * Also the stock guns with no underbarrel mount (SR3 pp.278-279; "SR3 is right … so warn", 2026-11-07).
 *
 * A laser sight and a smartlink system never both — SR3 p.281, "Laser sights may not be used with a smartlink system".
 * The maintainer, 2026-11-07 (mods ruling Q1): "ok, go with the warn option but you shouldn't be able to apply both".
 *
 * So: installing one beside the other warns (never refuses); the GM's TN window unticks the other row when one is ticked
 * (`exclusiveGear`); the pre-tick guess offers only the smart row; and `sumModifiers` counts only the better one if a
 * caller hands it both.
 */
import { readFileSync } from 'node:fs';

const { guessGearModifiers, sumModifiers, exclusiveGear, SMART_ROWS } = await import('../scripts/SR3ECombatModifiers.js');
const { WeaponAccessories } = await import('../scripts/data/weapon-accessories.mjs');

export const name = 'laser-smartlink';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  /* ── The TN window: never both ─────────────────────────────────────────────── */
  t.eq('ticking the laser sight unticks every smartlink-system row', exclusiveGear('laserSight'), ['smartlink', 'smartlinkShot', 'smartGoggles']);
  t.eq('…and ticking a smart row unticks the laser', SMART_ROWS.map(exclusiveGear), [['laserSight'], ['laserSight'], ['laserSight']]);
  t.eq('any other row unticks nothing', exclusiveGear('targetRunning'), []);
  t.is('both handed to the sum: only the smartlink\'s −2 counts', sumModifiers({ smartlink: true, laserSight: true }), -2);
  t.is('…with smart goggles: −1, not −2', sumModifiers({ smartGoggles: true, laserSight: true }), -1);
  t.is('a laser alone still counts −1', sumModifiers({ laserSight: true }), -1);
  const src = read('scripts/documents/SR3EItem.js');
  t.ok('the GM window wires exclusiveGear to its gear boxes', /exclusiveGear\(c\.dataset\.key\)/.test(src) && /other\.checked = false/.test(src));

  /* ── The pre-tick guess ────────────────────────────────────────────────────── */
  const gun = extra => ({ type: 'firearm', name: 'Gun', system: { category: 'HPist', loadedAmmoType: 'regular', ...extra } });
  const linked = { items: [{ type: 'cyberware', name: 'Smartlink' }] };
  const both = guessGearModifiers(linked, gun({ smartgun: true, laserSight: true }));
  t.eq('a smartgun with a laser, a smartlinked shooter: the smartlink is guessed, the laser is not', [both.smartlink, both.laserSight], [true, false]);
  const goggles = guessGearModifiers({ items: [{ type: 'gear', name: 'Smart Goggles' }] }, gun({ smartgun: true, laserSight: true }));
  t.eq('…smart goggles likewise', [goggles.smartGoggles, goggles.laserSight], [true, false]);
  t.ok('a smartgun with a laser and NO receptor: the laser is guessed (the smartgun is dead weight, p.281)',
    guessGearModifiers({ items: [] }, gun({ smartgun: true, laserSight: true })).laserSight);

  /* ── Installing: warned, never refused ─────────────────────────────────────── */
  const laser = { name: 'Laser Sight (Weapon)', system: { modifiers: [{ target: 'laserSight', value: 1 }] } };
  const smart = { name: 'Smartgun, external (Weapon)', system: { modifiers: [{ target: 'smartgun', value: 1 }] } };
  t.is('a laser into a smartgun warns, citing p.281', WeaponAccessories.installWarnings(gun({ smartgun: true }), laser).filter(w => /p\.281/.test(w)).length, 1);
  t.is('a smartgun into a gun with a laser warns', WeaponAccessories.installWarnings(gun({ laserSight: true }), smart).length, 1);
  t.is('…a laser into a plain gun says nothing', WeaponAccessories.installWarnings(gun({ smartgun: false, laserSight: false }), laser).length, 0);

  /* ── No underbarrel on the Remington 750 / 950 and the Defiance T-250 (SR3 pp.278-279; the maintainer, 2026-11-07) ─ */
  const bipod = { name: 'Bipod (Weapon)', system: { mount: 'Under', modifiers: [] } };
  const scope = { name: 'Imaging Scope (Weapon)', system: { mount: 'Top', modifiers: [] } };
  const ls    = { ...laser, system: { ...laser.system, mount: 'Top/Under' } };
  const named = (n, installed = []) => ({ type: 'firearm', name: n, system: { category: 'SptR', installed } });
  const under = (g, m) => WeaponAccessories.installWarnings(g, m).filter(w => /no underbarrel mount/.test(w)).length;
  t.eq('a bipod on the Remington 750, the 950 (Weapon) and the T-250 warns', ['Remington 750', 'Remington 950 (Weapon)', 'Defiance T-250'].map(n => under(named(n), bipod)), [1, 1, 1]);
  t.is('…a top-mount scope does not', under(named('Remington 750'), scope), 0);
  t.is('…a top-or-under laser goes on top: nothing to say', under(named('Remington 750'), ls), 0);
  t.is('…but with the top taken it would go under: warned', under(named('Remington 750', [{ _id: 'a', ...scope }]), ls), 1);
  t.is('any other rifle takes its bipod unwarned', under(named('Ruger 100'), bipod), 0);
  t.ok('the install path asks for these warnings', /WeaponAccessories\.installWarnings\(host/.test(read('scripts/SR3EItemMods.js')));
  t.ok('…and never refuses on them (ItemMods.blocked is the stock-on-a-rifle refusal only)', !/laser/i.test(read('scripts/data/item-mods.mjs').match(/blocked\([\s\S]{0,600}/)?.[0] ?? ''));
}
