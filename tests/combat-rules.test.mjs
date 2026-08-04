/**
 * Two rules the implementation got wrong, both found by the combat audit and both
 * pre-existing rather than regressions.
 *
 *  - Gel rounds are resisted with Impact armour, not Ballistic.
 *  - Reach is a differential: only the longer-reach fighter benefits, by the gap.
 *
 * Both were silent. Gel landed in an editable field the GM could override if they knew;
 * reach came out accidentally correct against unarmed opponents, whose reach is 0, which
 * is the commonest matchup and almost certainly why it survived.
 */
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });

export const name = 'combat-rules';

/**
 * Which armour rating resists an attack, mirroring the selection in
 * SR3EActor._postSoakCard. Kept in step with the source by asserting the CONFIG that
 * drives it below, so a change to the ammo table is caught even though the branch itself
 * is reproduced here (the real one sits mid-way through a long card-building method).
 */
const armorFor = (ammoType, isMelee = false) => {
  const rules = SR3E.ammoTypes[ammoType] ?? {};
  return (isMelee || rules.armorEffect === 'gel') ? 'impact' : 'ballistic';
};

/** Melee target numbers, mirroring the reach handling in SR3EItem.rollMeleeAttack. */
const meleeTNs = (atkReach, defReach, { atkMod = 0, defMod = 0, calledShot = 0 } = {}) => ({
  atk: Math.max(2, 4 + Math.min(0, defReach - atkReach) + atkMod + calledShot),
  def: Math.max(2, 4 + Math.min(0, atkReach - defReach) + defMod),
});

export async function run(t) {
  /* ---- gel rounds use Impact armour ---- */
  t.is('gel is declared with an armour effect in config',
    SR3E.ammoTypes.gel?.armorEffect, 'gel');
  t.is('gel keeps its Power penalty', SR3E.ammoTypes.gel?.powerMod, -2);
  t.is('gel still deals Stun', SR3E.ammoTypes.gel?.isStun, true);

  t.is('gel rounds resist with Impact', armorFor('gel'), 'impact');
  t.is('ordinary rounds still resist with Ballistic', armorFor('regular'), 'ballistic');
  t.is('APDS still resists with Ballistic — it halves that rating, it does not switch it',
    armorFor('apds'), 'ballistic');
  t.is('flechette still resists with Ballistic', armorFor('flechette'), 'ballistic');
  t.is('melee still resists with Impact', armorFor('regular', true), 'impact');
  t.is('gel thrown in melee is still Impact', armorFor('gel', true), 'impact');

  /* ---- reach is a differential ---- */
  // The bug: each side used to subtract its own reach, so both improved at once.
  t.eq('equal reach benefits nobody — two staffs both roll against the base 4',
    meleeTNs(2, 2), { atk: 4, def: 4 });
  t.eq('no reach on either side leaves both at 4',
    meleeTNs(0, 0), { atk: 4, def: 4 });

  t.eq('the longer-reach attacker alone benefits, by the gap',
    meleeTNs(2, 1), { atk: 3, def: 4 });
  t.eq('the longer-reach defender alone benefits',
    meleeTNs(1, 2), { atk: 4, def: 3 });
  t.eq('a two-point advantage is worth two',
    meleeTNs(3, 1), { atk: 2, def: 4 });

  // The case that was accidentally right before, and must stay right.
  t.eq('armed against unarmed still gives the armed fighter the edge',
    meleeTNs(1, 0), { atk: 3, def: 4 });
  t.eq('unarmed against armed still penalises nobody but grants nothing',
    meleeTNs(0, 2), { atk: 4, def: 2 });

  /* ---- the floor and the other modifiers still work ---- */
  t.ok('the target number never drops below 2',
    meleeTNs(9, 0).atk === 2, `got ${meleeTNs(9, 0).atk}`);
  t.is('a called shot raises only the attacker',
    meleeTNs(0, 0, { calledShot: 4 }).atk, 8);
  t.is('a called shot leaves the defender alone',
    meleeTNs(0, 0, { calledShot: 4 }).def, 4);
  t.is('a defaulting penalty stacks on top of reach',
    meleeTNs(2, 1, { atkMod: 2 }).atk, 5);
  t.is('each side gets only its own defaulting penalty',
    meleeTNs(2, 1, { atkMod: 2 }).def, 4);
}
