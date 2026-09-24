/**
 * Death from Physical overflow — SR3EActor.deadFromOverflow, SR3 p.125 (TODO 166).
 *
 *   "Instant death occurs only if damage overflows the Physical column by more than the
 *    character's Body Rating."
 *
 * The status hook and the sheet both tested `overflow >= body` until the 0.6.1 rules check, so a
 * Body 4 character carrying exactly 4 boxes of overflow was marked dead with one box to spare.
 */
import { readFileSync } from 'node:fs';
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');

export const name = 'overflow-death';

const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  const dead = (o, b) => SR3EActor.deadFromOverflow(o, b);
  t.is('overflow below Body → alive', dead(3, 4), false);
  t.is('overflow EQUAL to Body → still alive ("by more than", p.125)', dead(4, 4), false);
  t.is('one box past Body → dead', dead(5, 4), true);
  t.is('no overflow → alive', dead(0, 4), false);
  t.is('no Body recorded → never dead (nothing to compare)', dead(9, 0), false);
  t.is('junk input → alive, no throw', dead(undefined, undefined), false);

  t.ok('the status hook uses the rule, not its own comparison',
    /dead\s*= physFull && game\.sr3e\.SR3EActor\.deadFromOverflow\(/.test(read('scripts/sr3e.js')));
  t.ok('the sheet\'s ☠ DEAD uses the rule, not its own comparison',
    /isDead\s*= game\.sr3e\.SR3EActor\.deadFromOverflow\(/.test(read('scripts/sheets/SR3EActorSheet.js')));
  t.ok('no `overflow >= body` comparison is left in either file',
    !/overflow[\w?.]*\s*(\?\?\s*0\)\s*)?>=\s*body/i.test(read('scripts/sr3e.js'))
    && !/overflowVal\s*>=\s*body/.test(read('scripts/sheets/SR3EActorSheet.js')));
}
