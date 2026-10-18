/**
 * Vehicle Control Rig and Control Pool — scripts/data/rigging.mjs, TODO 167 (rules check 0.6.1).
 *
 *   "Each level adds +2 to the user's Reaction and +1D6 Initiative dice while rigging." — SR3 p.301
 *   "A rigger's Control Pool is equal to the character's Reaction, modified only by his or her
 *    vehicle control rig … The maximum number of Control Pool dice that a character can add to any
 *    control-related test is equal to the base number of skill dice involved in the test. Only
 *    characters with a Vehicle Control Rig … can use a Control Pool."                  — SR3 p.44
 *   "The cops driving the Lone Star Cruisers are not rigged, so they get no Control Pool dice." — p.141
 *
 * Every rigging path added the VCR level ONCE; the chase and the Driving Test used the Vehicle Skill
 * as the pool itself, and the chase gave it to unrigged drivers too.
 */
import { readFileSync } from 'node:fs';
import { Rigging } from '../scripts/data/rigging.mjs';

export const name = 'rigging';

const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  t.is('VCR 2 on Reaction 5 → Reaction 9 (+2 per level)', Rigging.vcrReaction(5, 2), 9);
  t.is('VCR 3 → 4 initiative dice', Rigging.vcrInitiativeDice(3), 4);
  t.is('no VCR → 1 die', Rigging.vcrInitiativeDice(0), 1);

  // p.141's Rigger X has 7 Control Pool dice: e.g. Reaction 5 and a VCR 1.
  t.is('Control Pool = Reaction 5 + 2 × VCR 1 = 7 (Rigger X, p.141)', Rigging.controlPool(5, 1), 7);
  t.is('no VCR, no Control Pool (p.44, p.141)', Rigging.controlPool(6, 0), 0);
  t.is('one test takes at most the skill dice: 7 available, Car 5 → 5', Rigging.controlPoolDice(7, 5), 5);
  t.is('…and no more than is left: 3 available, Car 5 → 3', Rigging.controlPoolDice(3, 5), 3);
  t.is('junk → 0, no throw', Rigging.controlPoolDice(undefined, null), 0);

  const actor = read('scripts/documents/SR3EActor.js');
  t.is('both VCR initiative paths use the rule (never `+ vcrLevel` once)',
    (actor.match(/Rigging\.vcrReaction\(reactionBase, vcrLevel\)/g) ?? []).length, 2);
  t.ok('…and no path adds the level once any more', !/reactionBase \+ (wm \+ )?vcrLevel/.test(actor));
  t.ok('the derived data carries the Control Pool', /controlPool:\s*Rigging\.controlPool\(attr\.reaction\?\.base/.test(actor));

  const item = read('scripts/documents/SR3EItem.js');
  t.ok('gunnery: Control Pool dice from the rule, capped at the Gunnery dice',
    /controlPoolMax = Rigging\.controlPoolDice\(Rigging\.controlPool\(reactionBase, vcrLevel\), pool\)/.test(item));

  const sheet = read('scripts/sheets/SR3EVehicleSheet.js');
  t.ok('Driving/Crash Test: the rigger adds Control Pool dice, not the skill again',
    /crashPool = skillDice \+ autonav \+ cpDice/.test(sheet) && /usingVCR \? cpDice/.test(sheet)
    && !/usingVCR \? skillRating/.test(sheet));

  const chase = read('scripts/SR3EVehicleChase.js');
  t.ok('chase: no Control Pool without an active VCR', /if \(!vcr\) return 0;/.test(chase));
  t.ok('chase: VCR initiative from the rule', /Rigging\.vcrReaction\(actor\.system\.attributes\?\.reaction\?\.base/.test(chase)
    && !/derived\?\.initiative \?\? 0\) \+ vcrLevel/.test(chase));

  /* ── Drones from a remote-control deck · SR3 p.154 ─────────────────────────────────────────────
   * "Success Tests for drones in secondary mode are made with the drones' Pilot Ratings rather than
   *  the rigger's Skill or Attribute Ratings. Combat or Control Pool dice may not be added"
   * "Even though he is in captain's chair mode, Rigger X receives his usual Initiative bonus"
   * RCD rolled the rigger's skills for the drone and dropped the VCR Initiative (2026-10-12). */
  t.is('jumped in (VCR): the rigger rolls', Rigging.droneTestRoller('vcr', true), 'rigger');
  t.is("captain's chair / secondary (RCD): the drone's Pilot rolls", Rigging.droneTestRoller('rcd', true), 'pilot');
  t.is('no rigger: the Pilot rolls', Rigging.droneTestRoller('vcr', false), 'pilot');
  /* Combat Pool on drone gunnery · SR3 p.154 "The rigger may use Combat and Control Pool dice", p.152
   * "Combat Pool dice may be added to this test", p.157 "…only with the primary drone".
   * 0.7.0 rules check: the vehicle-weapon dialog offered Control Pool only. */
  t.is('jumped in: the rigger may add all their Combat Pool', Rigging.gunneryCombatPool('rigger', 6), 6);
  t.is('secondary drone / captain chair (Pilot rolls): no Combat Pool (p.157)', Rigging.gunneryCombatPool('pilot', 6), 0);
  t.is('defaulting to an attribute: capped by the Default Table', Rigging.gunneryCombatPool('rigger', 6, { defaulting: true, poolCap: 2 }), 2);
  t.is('a cap does not apply when the skill is not defaulted', Rigging.gunneryCombatPool('rigger', 6, { poolCap: 2 }), 6);
  t.is('nothing left, nothing offered', Rigging.gunneryCombatPool('rigger', 0), 0);
  t.ok('gunnery: only the jumped-in rigger is offered it, and it is charged through the pool helper',
    /Rigging\.gunneryCombatPool\(roller,/.test(item) && /await pilotActor\.spendCombatPool\(/.test(item)
    && /pool \+ weaponOpts\.controlPool \+ combatDice/.test(item));
  t.ok('VCR mode: VCR Initiative', Rigging.usesVcrInitiative('vcr', 2));
  t.ok('RCD with a VCR keeps the VCR Initiative (Rigger X, p.154)', Rigging.usesVcrInitiative('rcd', 2));
  t.ok('RCD with only a datajack and a deck: ordinary Initiative', !Rigging.usesVcrInitiative('rcd', 0));
  t.ok('Auto: no rigger Initiative', !Rigging.usesVcrInitiative('', 3));

  t.ok("the rigger's Initiative reads the rule, for a vehicle in RCD as well as VCR",
    /Rigging\.usesVcrInitiative\(vcrVehicle\.system\.controlMode, vcrLevel\)/.test(actor)
    && /riggedVehicles\.find\(a => a\.system\?\.controlMode === 'rcd'\)/.test(actor));
  t.ok('…and so does a vehicle rolling for its rigger', /Rigging\.usesVcrInitiative\(controlMode, vcrLevel\)/.test(actor));
  t.ok("…and only a jumped-in drone's Simsense jam counts", (actor.match(/jumpedIn \? SR3EActor\._vehicleSimsenseMod/g) ?? []).length === 2);
  t.ok('gunnery: only a jumped-in rigger rolls their Gunnery', /if \(pilotActor && roller === 'rigger'\)/.test(item)
    && /Rigging\.droneTestRoller\(controlMode, !!pilotActor\)/.test(item));
  t.ok('Driving Test: an RCD drone rolls its Pilot, on itself', /Rigging\.droneTestRoller\(sys\.controlMode/.test(sheet)
    && /skillDice   = pilotRating;/.test(sheet) && (sheet.match(/await tester\.rollPool\(/g) ?? []).length === 2);
}
