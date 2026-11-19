/**
 * What each weapon class can take — the maintainer's mods rulings of 2026-11-07 (TODO 276):
 *   Q2 an imaging scope with a smartgun: warn (SR3 p.280, "may not be used with smartlink systems").
 *   Q4 warn on all five class rules (SR3 pp.276-277): hold-outs nothing; pistols no underbarrel; revolvers no silencer or
 *      suppressor; SMGs no silencer; shotguns neither.
 *   Q5 a top-or-under item on a pistol goes on top — warned only when it would have to go under.
 *   Q7 a fore grip outside SMGs, assault rifles and shotguns: warn (CC p.34).
 *   Q8 a stock on a shotgun is refused, like a rifle (CC p.83) — `ItemMods.blocked`, tested in item-mods.
 * Never a refusal except Q8.
 */
const { WeaponAccessories } = await import('../scripts/data/weapon-accessories.mjs');
const { ItemMods } = await import('../scripts/data/item-mods.mjs');
const { WeaponCatalog } = await import('../scripts/data/weapon-catalog.mjs');

export const name = 'weapon-class-mods';

export async function run(t) {
  const gun = (category, extra = {}, installed = []) => ({ type: 'firearm', name: `a ${category}`, system: { category, installed, ...extra } });
  const mod = (n, mount = '', modifiers = []) => ({ _id: n.slice(0, 4), name: `${n} (Weapon)`, type: 'gear', system: { mount, modifiers } });
  const w = (g, m) => WeaponAccessories.installWarnings(g, m);
  const has = (g, m, re) => w(g, m).some(x => re.test(x));

  const silencer = mod('Silencer', 'Barrel'), suppressor = mod('Sound Suppresser', 'Barrel');
  const laser = mod('Laser Sight', 'Top/Under', [{ target: 'laserSight', value: 1 }]);
  const bipod = mod('Bipod', 'Under'), scope = mod('Imaging Scope', 'Top', [{ target: 'magnification', value: 1 }]);
  const grip = mod('Fore Grip', 'Under', [{ target: 'rc', value: 1 }]);
  const smart = mod('Smartgun, external', 'Top/Under', [{ target: 'smartgun', value: 1 }]);

  /* ── Q4 / Q5: the class rules (SR3 pp.276-277) ─────────────────────────────── */
  t.ok('a hold-out takes nothing: warned, quoting p.276', has(gun('HOPist'), laser, /Hold-out pistols cannot mount any accessories.*p\.276/));
  t.ok('a pistol: a bipod would go underbarrel — warned', has(gun('HPist'), bipod, /one barrel and one top mount, no underbarrel/));
  t.ok('…a top-or-under laser goes on top: no warning', !has(gun('HPist'), laser, /no underbarrel/));
  t.ok('…with the top taken it would go under: warned', has(gun('HPist', {}, [scope]), laser, /no underbarrel/));
  t.ok('…the light, medium and very heavy pistols too', ['LPist', 'MPist', 'VHP'].every(c => has(gun(c), bipod, /no underbarrel/)));
  t.ok('…but not a machine pistol (SMG-class)', !has(gun('MaPist'), bipod, /no underbarrel/));
  const revolver = gun('HPist', { ammunition: '6(cy)' });
  t.ok('a revolver ("(cy)"): no silencer', has(revolver, silencer, /Revolvers cannot use silencers/));
  t.ok('…no sound suppressor', has(revolver, suppressor, /Revolvers cannot use silencers or sound suppressers/));
  t.ok('…a clip-fed heavy pistol takes a silencer unwarned', w(gun('HPist', { ammunition: '15(c)' }), silencer).length === 0);
  t.ok('an SMG: no silencer…', has(gun('SMG'), silencer, /SMGs cannot use silencers/));
  t.ok('…but a sound suppressor is fine', w(gun('SMG'), suppressor).length === 0);
  t.ok('a shotgun: neither', has(gun('ShtG'), silencer, /Shotguns cannot mount/) && has(gun('ShtG'), suppressor, /Shotguns cannot mount/));
  t.ok('a rifle takes a silencer unwarned', w(gun('Snip'), silencer).length === 0);

  /* ── Q7: the fore grip (CC p.34) ───────────────────────────────────────────── */
  t.ok('a fore grip on an SMG, assault rifle or shotgun: no warning', ['SMG', 'AsRf', 'ShtG'].every(c => !has(gun(c), grip, /fore grip/i)));
  t.ok('…on a sniper rifle: warned, quoting CC p.34', has(gun('Snip'), grip, /can only be used on submachine guns, assault rifles and shotguns.*CC p\.34/));

  /* ── Q2: an imaging scope with a smartgun (SR3 p.280) ──────────────────────── */
  t.ok('a scope into a smartgun: warned', has(gun('HPist', { smartgun: true }), scope, /imaging scopes may not be used with smartlink systems/));
  t.ok('…a smartgun system into a gun with a scope: warned', has(gun('AsRf', { smartgun: false }, [scope]), smart, /imaging scope and a smartgun/));
  t.ok('…a scope on a plain gun: nothing', w(gun('AsRf', { smartgun: false }), scope).length === 0);

  /* ── Q10: an internal smartgun added after manufacture (SR3 p.281, M&M p.32) ── */
  const predator = { type: 'firearm', name: 'Ares Predator', system: { category: 'HPist', cost: 450 } };
  const price = n => WeaponAccessories.internalSmartgunCost(predator, { name: n, system: {} });
  t.is('a smartlink-1 internal: +100% of the gun', price('Smartgun, internal (Weapon)'), 450);
  t.eq('a smartlink-2 internal: +150%', [price('Smartlink-2 Modification, Internal (Weapon)'), price('Smartlink level II, internal (Weapon)')], [675, 675]);
  t.is('an external smartgun is not priced from the gun', price('Smartlink level I (Weapon)'), null);
  t.is('one printed as the gun\'s accessory is in its price already', WeaponAccessories.internalSmartgunCost(predator,
    { name: 'Smartgun, internal (Weapon)', system: {}, flags: { The2ndChumming3e: { integral: true } } }), null);
  const glue = (await import('node:fs')).readFileSync(new URL('../scripts/SR3EItemMods.js', import.meta.url), 'utf8');
  t.ok('install fills only a blank cost', /internalSmartgunCost\(host, data\)[\s\S]{0,120}!\(Number\(data\.system\?\.cost\) > 0\)/.test(glue));

  /* ── Underbarrel grenade launcher: nothing smaller than an assault rifle (house rule 2026-11-19; SR3 p.277 SMGs) ── */
  const ugl = mod('Underbarrel Grenade Launcher', 'Under');
  const small = /smaller than an assault rifle — no underbarrel grenade launcher/;
  for (const c of ['LPist', 'HPist', 'MaPist', 'SMG', 'ShtG', 'SptR', 'Snip', 'Carb', 'LCarb']) t.ok(`launcher on ${c}: warned`, has(gun(c), ugl, small));
  for (const c of ['AsRf', 'LMG', 'MMG', 'HMG', 'MinG', 'ACan']) t.ok(`launcher on ${c}: fits`, !has(gun(c), ugl, small));
  t.ok('…the Ares Antioch by name too', has(gun('SMG'), mod('Ares Antioch'), small));
  t.ok('…a Grenade Link is not a launcher', !has(gun('SMG'), mod('Grenade Link'), small));
  t.ok('…the designer hides it on an SMG', WeaponCatalog.misfit(gun('SMG'), ugl) !== null && small.test(WeaponCatalog.misfit(gun('SMG'), ugl)));
  t.ok('…and shows it on an assault rifle', WeaponCatalog.misfit(gun('AsRf'), ugl) === null);
  t.ok('…warned, never refused', ItemMods.blocked(gun('SMG'), ugl) === null);

  /* ── Warn, never refuse ────────────────────────────────────────────────────── */
  t.ok('none of these is a refusal', [silencer, suppressor, laser, bipod, grip, scope].every(m => ItemMods.blocked(gun('HOPist', { ammunition: '6(cy)' }), m) === null));
}
