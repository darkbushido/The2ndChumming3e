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
}
