/**
 * The Rule of One — SR3EActor.isRuleOfOne.
 *
 * The system used to apply SR4's glitch rule under an SR3 name: a "glitch" when more
 * than half the pool showed 1s, and a "critical glitch" when that coincided with zero
 * successes. Neither tier is in SR3. The book (p.38) has a single, far rarer trigger:
 *
 *   "If ALL the dice rolled for a test come up 1s, it means that the character has
 *    made a disastrous mistake… The gamemaster determines whatever tone is appropriate."
 *
 * The gap is not academic. Under the old threshold a 3-die pool tripped on two 1s —
 * something like a 1-in-9 shot — where RAW needs all three, about 1-in-216. Players
 * were being told they had botched roughly twenty times more often than the book says.
 */
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');

export const name = 'rule-of-one';

export async function run(t) {
  const r = (ones, pool) => SR3EActor.isRuleOfOne(ones, pool);

  /* ---- It fires only on a clean sweep ---- */
  t.is('all three dice are 1s',            r(3, 3), true);
  t.is('a single die showing 1',           r(1, 1), true);
  t.is('one die short of a sweep',         r(2, 3), false);
  t.is('all but one in a large pool',      r(11, 12), false);
  t.is('no 1s at all',                     r(0, 6), false);

  /* ---- The observed regression, kept as the case that found it ---- */
  // A dodge of 5, 1, 1 at TN 4 was reported as a glitch: 2 ones in a pool of 3 cleared
  // SR4's "more than half" bar. Under RAW the 5 succeeds, so the pool is not swept and
  // nothing unusual has happened at all.
  t.is('dodge of 5,1,1 is NOT a Rule of One', r(2, 3), false);

  /* ---- The old half-pool threshold is gone, at every pool size ---- */
  // Anything that merely passes "more than half" must now be false; only ones === pool
  // may be true. Walking the sizes catches a partial revert that fixes one call site.
  for (let pool = 1; pool <= 12; pool++) {
    const half = Math.floor(pool / 2);
    for (let ones = 0; ones <= pool; ones++) {
      const expected = ones === pool;
      if (r(ones, pool) !== expected) {
        t.ok(`pool ${pool} with ${ones} ones`, false,
          `expected ${expected}, got ${r(ones, pool)}`);
      }
      // Assert explicitly on the band the old rule got wrong: over half, under all.
      if (ones > half && ones < pool) {
        t.is(`pool ${pool}, ${ones} ones — over half but not all`, r(ones, pool), false);
      }
    }
  }

  /* ---- Degenerate input must not read as a disaster ---- */
  // An empty pool trivially satisfies "every die is a 1" and would have reported a
  // botch on a roll that never happened.
  t.is('an empty pool is not a Rule of One', r(0, 0), false);
}
