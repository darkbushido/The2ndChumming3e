/**
 * Vehicle armour is hardened — scripts/data/vehicle-armor.mjs (rules check 0.7.0, vehicles.md #11).
 *
 *   "Vehicle armor is hardened armor, meaning that it can deflect all damage from weapons with a Power
 *    (modified by the vehicle's Body, but not by burst or autofire) equal to or less than the Armor
 *    Rating. For example, if a vehicle has Armor Rating 3, no weapon with a Power Rating of 6 or lower
 *    can penetrate it; firing at the vehicle with a Uzi III (6M Damage) gets you a bunch of sparks." — SR3 p.132
 *   "If a weapon's reduced Power (unaugmented by burst or full-auto fire rates) does not exceed the
 *    armor's rating, the weapons fire does no damage to the vehicle."                              — SR3 p.149
 *
 * The soak card compared the STAGED Power, which carries the burst bonus: a Uzi III burst (6M +3 = 9, halved
 * to 4) beat Armor 3, where the book's 6 halves to 3 and is deflected.
 */
import { readFileSync } from 'node:fs';
import { VehicleArmor } from '../scripts/data/vehicle-armor.mjs';

export const name = 'vehicle-armor';

const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  // The book's Uzi III against Armor 3, single shot: 6 → 3 (p.149 halves) → deflected.
  t.ok('Uzi III 6M, Armor 3: the reduced Power 3 does not exceed 3 — deflected', VehicleArmor.deflects(3, 3));
  t.ok('…Power 4 against Armor 3 is not deflected', !VehicleArmor.deflects(4, 3));
  t.ok('Armor 0 never deflects a Power that does damage', !VehicleArmor.deflects(1, 0));

  // A burst adds +3 Power (p.115): 9, halved 4. The comparison ignores it: the unaugmented 6 halves to 3.
  t.is('the burst bonus comes back off: 9 − 3 = 6', VehicleArmor.unaugmentedPower(9, 3), 6);
  t.is('…never below 0', VehicleArmor.unaugmentedPower(2, 5), 0);
  t.is('no bonus, no change', VehicleArmor.unaugmentedPower(6), 6);
  t.is('the carried unaugmented figure is compared, not the staged one (burst 4 vs 3)',
    VehicleArmor.comparedPower(4, 3), 3);
  t.ok('→ the burst is deflected by Armor 3', VehicleArmor.deflects(VehicleArmor.comparedPower(4, 3), 3));
  t.is('without a carried figure (grenade, collision) the staged Power stands in', VehicleArmor.comparedPower(5, undefined), 5);
  t.is('…also for null and the empty string', [VehicleArmor.comparedPower(5, null), VehicleArmor.comparedPower(5, '')].join(), '5,5');
  t.is('a carried 0 is a real figure', VehicleArmor.comparedPower(5, 0), 0);

  // Source-level: the attack hands the figure over, the soak card reads it.
  const item  = read('scripts/documents/SR3EItem.js');
  const actor = read('scripts/documents/SR3EActor.js');
  t.ok('rollWeapon: remembers the fire-mode Power bonus', /modePowerBonus = staged\.power - parsed\.power/.test(item));
  t.ok('rollWeapon: puts the unaugmented, vehicle-reduced Power on the damage base',
    /damageBase = \{ \.\.\.vd\.damage, hardenedPower \}/.test(item) && /VehicleArmor\.unaugmentedPower\(/.test(item));
  t.ok('the no-dodge soak payload carries it', /hardenedPower:\s+state\.damageBase\?\.hardenedPower/.test(actor));
  t.ok('the soak card compares the carried Power, through the pure rule',
    /VehicleArmor\.comparedPower\(stagedPower, payload\.hardenedPower\)/.test(actor)
    && /VehicleArmor\.deflects\(hardPower, defaultArmor\)/.test(actor) && !/stagedPower <= defaultArmor/.test(actor));
}
