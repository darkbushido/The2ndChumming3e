/**
 * Shotgun shot, choke and spread · SR3 p.117, p.113 (TODO 57). The book's own worked figures first.
 */
import { readFileSync } from 'node:fs';
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { Shotgun, CHOKE_MIN, CHOKE_MAX, CHOKE_DEFAULT } = await import('../scripts/data/shotgun.mjs');
const { guessGearModifiers, mvpModifierGroups } = await import('../scripts/SR3ECombatModifiers.js');

export const name = 'shotgun';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  const S = Shotgun;

  /* ── p.117's worked paths ──────────────────────────────────────────────────── */
  t.eq('choke 2: 1 m wide to 2 m, 2 m to 4 m, 3 m to 6 m', [1, 2, 3, 4, 5, 6].map(d => S.width(d, 2)), [1, 1, 2, 2, 3, 3]);
  t.eq('choke 5: 1 m to 5 m, 2 to 10, 3 to 15, 4 to 20', [5, 10, 15, 20].map(d => S.width(d, 5)), [1, 2, 3, 4]);
  t.is('…just past the choke distance it widens', S.width(5.5, 5), 2);
  t.is('point blank is 1 m wide and has not spread', S.spreads(0, 5), 0);
  // The p.117 spread example as drawn in CLAUDE.md, choke 3: 0-3 m 1 m wide, 3-6 m 2 m, 6-9 m 3 m.
  t.eq('choke 3 (the diagram): widths at 2, 3, 4, 6, 7, 9 m', [2, 3, 4, 6, 7, 9].map(d => S.width(d, 3)), [1, 1, 2, 2, 3, 3]);
  t.eq('…Power / attacker TN at 3, 6, 9 m: none, −1, −2', [3, 6, 9].map(d => S.effects(S.spreads(d, 3)).power), [-0, -1, -2]);
  t.ok('…the diagram is in CLAUDE.md', /SHOTGUN SPREAD EXAMPLE, choke 3/.test(read('CLAUDE.md')));
  t.eq('"a shot on a choke setting of 2 would be -2 Power/-2 target number at the six-meter point"',
    [S.effects(S.spreads(6, 2)).power, S.effects(S.spreads(6, 2)).tn], [-2, -2]);
  t.eq('"a choke setting 5 shot would be -2/-2 at fifteen meters"', [S.effects(S.spreads(15, 5)).power, S.effects(S.spreads(15, 5)).tn], [-2, -2]);
  t.eq('"…and then -3/-3 at twenty meters"', [S.effects(S.spreads(20, 5)).power, S.effects(S.spreads(20, 5)).tn], [-3, -3]);
  t.is('the defender\'s Dodge TN rises by the spreads (p.113)', S.effects(3).dodge, 3);
  t.is('…and nothing at point blank — the spreads, not the 1 m width', S.effects(S.spreads(1, 5)).dodge, 0);

  /* ── The choke setting ─────────────────────────────────────────────────────── */
  t.eq('choke runs 2 to 10', [CHOKE_MIN, CHOKE_MAX], [2, 10]);
  t.eq('clamped to it', [S.choke(1), S.choke(12), S.choke(7)], [2, 10, 7]);
  t.is('blank is the default 5 (the book\'s example)', S.choke(null), CHOKE_DEFAULT);
  t.is('…and 5 it is', CHOKE_DEFAULT, 5);

  /* ── Shot, not slugs ───────────────────────────────────────────────────────── */
  const gun = (category, loadedAmmoType, extra = {}) => ({ type: 'firearm', system: { category, loadedAmmoType, ...extra } });
  t.ok('a shotgun with shot loaded throws shot', S.firesShot(gun('ShtG', 'shot')));
  t.ok('…with slugs (regular) it does not spread', !S.firesShot(gun('ShtG', 'regular')));
  t.ok('…and a rifle never does', !S.firesShot(gun('AsRf', 'shot')));
  t.is('shot uses the flechette rules on the Damage Code (p.117)', SR3E.ammoTypes.shot?.armorEffect, 'flechette');
  t.ok('…and is shotgun ammunition', SR3E.ammoTypes.shot?.shotgunOnly === true);

  /* ── p.117's gear rules for shotguns ───────────────────────────────────────── */
  const shooter = { items: [{ type: 'cyberware', name: 'Smartlink' }, { type: 'gear', name: 'Smart Goggles' }] };
  const g = w => guessGearModifiers(shooter, w);
  t.eq('a smartgun shotgun firing shot: smartlink −1, not −2', [g(gun('ShtG', 'shot', { smartgun: true })).smartlinkShot, g(gun('ShtG', 'shot', { smartgun: true })).smartlink], [true, false]);
  t.eq('…firing slugs: the ordinary −2', [g(gun('ShtG', 'regular', { smartgun: true })).smartlink, g(gun('ShtG', 'regular', { smartgun: true })).smartlinkShot], [true, false]);
  t.ok('"Shotguns get no benefits from smart goggles"', !guessGearModifiers({ items: [{ type: 'gear', name: 'Smart Goggles' }] }, gun('ShtG', 'regular', { smartgun: true })).smartGoggles);
  t.ok('"…or laser sights"', !g(gun('ShtG', 'regular', { laserSight: true })).laserSight);
  t.ok('a pistol still gets its laser', g(gun('HPist', 'regular', { laserSight: true })).laserSight);
  const row = mvpModifierGroups().flatMap(x => x.rows).find(m => m.key === 'smartlinkShot');
  t.eq('the GM window has the −1 row, in Gear', [row?.mod, row?.group], [-1, 'gear']);

  /* ── The wiring, source-level ─────────────────────────────────────────────── */
  const item = read('scripts/documents/SR3EItem.js');
  t.ok('rollWeapon derives the spread from the measured distance and the choke',
    /measured \? Shotgun\.spreads\(rangeInfo\.distance, choke\) : \(fireModeResult\?\.shotgunSpread \?\? 0\)/.test(item));
  t.ok('…takes the spreads off Power', /rawDamage = `\$\{p\.power \+ shot\.power\}/.test(item));
  t.ok('…and off the attacker\'s TN', /sustainTN \+ \(shot\?\.tn \?\? 0\)/.test(item));
  t.ok('…and hands them to the Dodge TN', /fireModeResult\.shotgunSpread = shot\.dodge/.test(item));
  t.ok('Power 0 is "ineffective" — the attack stops', /Power is gone — ineffective \(SR3 p\.117\)/.test(item));
  t.ok('the fire dialog sets the choke and remembers it', /id="sr-shot-choke"/.test(item) && /'system\.choke': choke/.test(item));
  t.ok('FirearmData declares the choke 2-10', /choke:\s+new NumberField\(\{ integer: true, nullable: true, initial: null, min: 2, max: 10 \}\)/.test(read('scripts/data/ItemDataModels.js')));
}
