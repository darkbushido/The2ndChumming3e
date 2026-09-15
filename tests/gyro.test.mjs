/**
 * Gyro stabilization and structured weapon accessories · SR3 p.113, p.282 (TODO 18).
 *
 * > "The total recoil and movement modifiers are reduced by -1 for every point of gyro-stabilization
 * > the system provides … cumulative with recoil compensation." — p.113
 * > Gyro systems add +4 to the wearer's melee target numbers and only allow half the Combat Pool;
 * > they provide an additional point of impact and ballistic armor. — p.282
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');
const { gyroOffset, guessGearModifiers, GYRO_MOVEMENT_KEYS } = await import('../scripts/SR3ECombatModifiers.js');
const { WeaponAccessories } = await import('../scripts/data/weapon-accessories.mjs');
const { readSourceDir } = await import('../tools/lib/pack-source.mjs');

export const name = 'gyro';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  const A = SR3EActor;
  const gear = (name, extra = {}) => ({ type: 'gear', name, system: { rating: null, ...extra.system }, flags: extra.flags ?? {} });
  const actor = items => ({ type: 'character', items, system: {} });

  /* ── Which item is a gyro ──────────────────────────────────────────────────── */
  t.ok('a Gyro Mount gear item is worn', !!A.gyroMount(actor([gear('Gyro Mount', { system: { rating: 6 } })])));
  t.ok('…the SR2 names too', !!A.gyroMount(actor([gear('SumnerTech Gyro-Mount 1S')])));
  t.ok('the FN-AAL Gyrojet pistol is not a gyro', !A.gyroMount(actor([{ type: 'firearm', name: 'FN-AAL Gyrojet Pistol', system: {} }])));
  t.ok('Gyrojet rockets are not a gyro', !A.gyroMount(actor([gear('Gyrojet Rockets (Stand.)(10)')])));
  t.ok('a gyro in storage is not worn', !A.gyroMount(actor([gear('Gyro Mount', { flags: { The2ndChumming3e: { stored: true } } })])));
  t.is('its rating is the stored one (deluxe 6)', A.gyroRating(actor([gear('Gyro Mount', { system: { rating: 6 } })])), 6);
  t.is('an unrated harness is a standard 5', A.gyroRating(actor([gear('Gyro Mount')])), 5);
  t.is('no harness, no rating', A.gyroRating(actor([])), 0);

  /* ── p.113: one allowance against the TOTAL of recoil and movement ─────────── */
  t.eq('recoil first: 5 against +3 recoil leaves 2', A.gyroOnRecoil(5, 3), { recoil: 0, used: 3, left: 2 });
  t.eq('more recoil than gyro: +8 against 5 leaves +3', A.gyroOnRecoil(5, 8), { recoil: 3, used: 5, left: 0 });
  t.eq('no recoil: the whole rating is left for movement', A.gyroOnRecoil(6, 0), { recoil: 0, used: 0, left: 6 });
  t.eq('no gyro: nothing changes', A.gyroOnRecoil(0, 4), { recoil: 4, used: 0, left: 0 });
  t.is('what is left offsets running (+4) — 2 of it', gyroOffset({ atkRunning: true }, 2), 2);
  t.is('…never more than the movement ticked: walking +1 against 5', gyroOffset({ atkWalking: true }, 5), 1);
  t.is('…and nothing when no movement is ticked', gyroOffset({ darkness: true }, 5), 0);
  t.is('…or no gyro is left', gyroOffset({ atkRunning: true }, 0), 0);
  t.eq('the movement rows are the attacker\'s four', GYRO_MOVEMENT_KEYS, ['atkRunning', 'atkRunningDiff', 'atkWalking', 'atkWalkingDiff']);
  // The discriminating case: rating 5, recoil +3, running +4. "Rating on each" would give 0 + 0;
  // p.113's total gives 7 − 5 = 2.
  const r = A.gyroOnRecoil(5, 3);
  t.is('p.113 total: recoil +3 and running +4 against 5 leaves +2 in all', r.recoil + 4 - gyroOffset({ atkRunning: true }, r.left), 2);

  /* ── p.282: the harness's costs ────────────────────────────────────────────── */
  t.is('+4 to the wearer\'s melee TNs', A.gyroMeleeTN(actor([gear('Gyro Mount')])), 4);
  t.is('…none without one', A.gyroMeleeTN(actor([])), 0);
  const armour = A.armorRatings(actor([gear('Gyro Mount')]));
  t.eq('+1 impact and ballistic armour', [armour.ballistic, armour.impact, armour.gyro], [1, 1, 1]);
  t.eq('…none without one', [A.armorRatings(actor([])).ballistic, A.armorRatings(actor([])).gyro], [0, 0]);

  /* ── Structured accessories ────────────────────────────────────────────────── */
  const W = WeaponAccessories;
  t.eq('"Smartlink, Laser Sight"', W.fromText('Smartlink, Laser Sight'), { smartgun: true, laserSight: true });
  t.eq('"Smartlink-2"', W.fromText('Smartlink-2'), { smartgun: true, laserSight: false });
  t.eq('a laser designator is not a sight', W.fromText('Laser Designator'), { smartgun: false, laserSight: false });
  t.eq('…nor a laser weapon\'s battery note', W.fromText('use battery back from MP Laser III, shotgun ranges'), { smartgun: false, laserSight: false });
  t.ok('"High-power Laser Sight" is', W.fromText('High-power Laser Sight').laserSight);
  t.ok('"Dual Laser sight & Low Light Mag:(2) Scope" is', W.fromText('Dual Laser sight & Low Light Mag:(2) Scope').laserSight);
  t.ok('the Ruger Thunderbolt\'s bare "Laser" is', W.fromText('Laser, special recoil, damage code is for Burst').laserSight);
  const gun = sys => ({ type: 'firearm', system: { category: 'HPist', ...sys } });
  t.ok('a stored false wins over the text', !W.flag(gun({ smartgun: false, accessories: 'Smartlink' }), 'smartgun'));
  t.ok('a stored true wins over empty text', W.flag(gun({ laserSight: true, accessories: '' }), 'laserSight'));
  t.ok('blank reads the text', W.flag(gun({ smartgun: null, accessories: 'Smartlink' }), 'smartgun'));

  const shooter = { items: [{ type: 'cyberware', name: 'Smartlink' }] };
  t.ok('the GM window guesses a smartlink from the field', guessGearModifiers(shooter, gun({ smartgun: true })).smartlink);
  t.ok('…not when the field says no, whatever the text', !guessGearModifiers(shooter, gun({ smartgun: false, accessories: 'Smartlink' })).smartlink);
  t.ok('…and a laser designator ticks no laser sight', !guessGearModifiers(shooter, gun({ accessories: 'Laser Designator' })).laserSight);

  /* ── The shipped packs store both fields ───────────────────────────────────── */
  const root = new URL('../packs-src/', import.meta.url);
  let guns = 0, blank = 0, disagree = 0, smart = 0, laser = 0;
  for (const p of readdirSync(root)) {
    const dir = new URL(`${p}/`, root);
    if (!statSync(dir).isDirectory()) continue;
    for (const [key, doc] of readSourceDir(dir.pathname.replace(/^\/([A-Za-z]:)/, '$1'))) {
      if (!key.startsWith('!items!') || doc?.type !== 'firearm') continue;
      guns++;
      const s = doc.system ?? {};
      if (typeof s.smartgun !== 'boolean' || typeof s.laserSight !== 'boolean') { blank++; continue; }
      const f = W.fromText(s.accessories);
      if (f.smartgun !== s.smartgun || f.laserSight !== s.laserSight) disagree++;
      if (s.smartgun) smart++;
      if (s.laserSight) laser++;
    }
  }
  t.ok(`every shipped firearm stores smartgun and laserSight (${guns} guns)`, guns > 300 && blank === 0);
  t.is('…and each agrees with its accessories text (run tools/fill-weapon-accessories.mjs)', disagree, 0);
  t.ok(`…59 smartguns and 56 laser sights (${smart}/${laser})`, smart === 59 && laser === 56);

  /* ── The wiring, source-level (needs Foundry to run) ──────────────────────── */
  const item = read('scripts/documents/SR3EItem.js'), act = read('scripts/documents/SR3EActor.js');
  t.ok('rollWeapon spends the gyro on recoil before the TN', /gyroOnRecoil\(game\.sr3e\.SR3EActor\.gyroRating\(actor\)/.test(item)
    && /const recoilTNMod\s+= gyro\.recoil;/.test(item));
  t.ok('…and hands what is left to the GM window', /gyroLeft:\s+gyro\.left/.test(item));
  t.ok('the GM window subtracts it from the ticked movement', /clampTN\(baseTN \+ sumModifiers\(state\) - gyroOff\)/.test(item));
  t.ok('melee adds +4 to each fighter wearing one', /A\.woundTN\(actor\) \+ A\.gyroMeleeTN\(actor\)/.test(item)
    && /A\.woundTN\(targetActor\) \+ A\.gyroMeleeTN\(targetActor\)/.test(item));
  t.ok('the Combat Pool is halved while one is worn, rounded down', /combatPool\s+= gyroWorn \? Math\.floor\(combatPoolFull \/ 2\) : combatPoolFull/.test(act));
  t.ok('FirearmData declares both fields nullable', /smartgun:\s+new BooleanField\(\{ nullable: true, initial: null \}\)/.test(read('scripts/data/ItemDataModels.js'))
    && /laserSight:\s+new BooleanField\(\{ nullable: true, initial: null \}\)/.test(read('scripts/data/ItemDataModels.js')));
}
