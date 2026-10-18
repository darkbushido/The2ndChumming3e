/**
 * Explosive-round misfire · SR3 p.116: "Explosive rounds will misfire whenever all the dice rolled for the attack
 * test come up 1." The shooter is attacked with the weapon's normal damage, resisted without Combat Pool.
 */
import { readFileSync } from 'node:fs';
const { Misfire } = await import('../scripts/data/misfire.mjs');

export const name = 'misfire';

export async function run(t) {
  t.ok('explosive + every die a 1 misfires', Misfire.applies({ ammoType: 'explosive', glitch: true }));
  t.ok('EX explosive follows "all other standard explosive rounds rules"', Misfire.applies({ ammoType: 'exExplosive', glitch: true }));
  t.ok('explosive without a Rule of One does not', !Misfire.applies({ ammoType: 'explosive', glitch: false }));
  t.ok('ordinary ammunition on a Rule of One does not misfire', !Misfire.applies({ ammoType: 'apds', glitch: true }) && !Misfire.applies({ ammoType: null, glitch: true }));
  t.ok('a melee roll never does', !Misfire.applies({ ammoType: 'explosive', glitch: true, isMelee: true }));

  const p = Misfire.payload({ shooterId: 'A1', weaponItemId: 'W1', parsed: { power: 9, level: 'M', isStun: false }, code: '9M' });
  t.eq('the shooter resists the weapon\'s normal code, as the shooter, on normal ammo, without pool',
    [p.targetActorId, p.stagedPower, p.stagedLevel, p.ammoType, p.noPools, p.rawDamage], ['A1', 9, 'M', null, true, '9M']);
  t.is('no code, no card', Misfire.payload({ shooterId: 'A1', parsed: null, code: '' }), null);

  const src = readFileSync(new URL('../scripts/documents/SR3EActor.js', import.meta.url), 'utf8');
  t.ok('the 0-hit weapon branch offers the misfire from the Rule-of-One flag', /Misfire\.applies\(\{ ammoType: state\.ammoType, glitch/.test(src));
  t.ok('the soak card carries and shows the no-pool note', /noPoolsNote:\s+payload\.noPoolsNote/.test(src) && /payload\.noPoolsNote \?\? /.test(src));
}
