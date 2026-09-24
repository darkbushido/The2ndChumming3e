/**
 * Shooting at vehicles, and sensor-enhanced gunnery — TODO 168 (rules check 0.6.1).
 *
 *   "the weapon's Power is reduced by half (round down) and the Damage Level is reduced by one (D to
 *    S, S to M, and M to L) … Weapons that do Light Damage cannot affect the vehicle unless the
 *    attacker uses special ammunition. … anti-vehicle munitions … do not. … The Power of the AV
 *    munitions is reduced by half the Armor Rating (round down the Armor Rating …)"      — SR3 p.149
 *   "rolls a number of dice equal to the character's Gunnery Skill plus half the vehicle's Sensor
 *    Rating (round down) … The test target number is equal to the target's Signature"   — SR3 p.152
 *
 * The code rounded the halved Power UP, let Light damage through at Light, never halved the armour
 * for AV rounds, and took the Sensor (or the VCR) off the gunnery TN instead of adding Sensor dice.
 */
import { readFileSync } from 'node:fs';
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EItem } = await import('../scripts/documents/SR3EItem.js');

export const name = 'vehicle-targets';

const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const code = (power, level) => ({ power, level, isStun: false });
const hit  = (power, level, av) => {
  const r = SR3EItem.vehicleTargetDamage(code(power, level), { av });
  return [r.damage.power, r.damage.level, r.noEffect];
};

export async function run(t) {
  t.eq('9M → 4L: Power halved ROUND DOWN, level −1', hit(9, 'M'), [4, 'L', false]);
  t.eq('10S → 5M', hit(10, 'S'), [5, 'M', false]);
  t.eq('11D → 5S', hit(11, 'D'), [5, 'S', false]);
  t.eq('6L → no effect (Light damage cannot affect a vehicle)', hit(6, 'L')[2], true);
  t.eq('an AV munition keeps its code: 12S stays 12S', hit(12, 'S', true), [12, 'S', false]);
  t.eq('…and so does an AV Light', hit(8, 'L', true), [8, 'L', false]);

  // Steeler (p.153): Gunnery 4 and a Sensor 3 → 5 dice.
  t.is('Sensor 3 → +1 die (3 ÷ 2 = 1.5, round down) — Steeler, p.153', SR3EItem.sensorGunneryDice(3), 1);
  t.is('Sensor 4 → +2', SR3EItem.sensorGunneryDice(4), 2);
  t.is('no Sensor → +0, no throw', SR3EItem.sensorGunneryDice(undefined), 0);

  const item = read('scripts/documents/SR3EItem.js');
  t.is('both attack paths use the rule', (item.match(/SR3EItem\.vehicleTargetDamage\(damageBase/g) ?? []).length, 2);
  t.ok('no Math.ceil halving of Power is left', !/Math\.ceil\(damageBase\.power \/ 2\)/.test(item));
  t.ok('the gunnery TN is the Signature — neither Sensor nor VCR comes off it',
    /const defaultTN\s*= Math\.max\(2, baseSig\);/.test(item) && !/baseSig - tnReduction/.test(item));
  t.ok('the Sensor dice reach the pool', /pool \+ weaponOpts\.controlPool \+ \(weaponOpts\.sensorDice \?\? 0\)/.test(item));
  t.ok('an AV munition on a vehicle weapon reaches the soak card', /if \(weaponOpts\.avMunition\) options\.ammoType = 'antiVehicle'/.test(item));

  const actor = read('scripts/documents/SR3EActor.js');
  t.ok('the vehicle soak card halves armour, round down, for AV',
    /armorEffect === 'antiVehicle' && this\.type === 'vehicle'\)[\s\S]{0,300}ballistic = Math\.floor\(ballistic \/ 2\)/.test(actor));
  t.ok('…and says when the Power does not exceed the armour', /stagedPower <= defaultArmor/.test(actor));
}
