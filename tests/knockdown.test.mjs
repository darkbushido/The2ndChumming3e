/**
 * Knockdown — SR3EActor.knockdownOutcome / knockdownTN.  · *SR3 p.124, p.116*
 *
 *   "Characters struck in ranged or melee combat may be knocked back or possibly down by the
 *    blow. When struck, the character must make a Body Test. Against ranged attacks, the target
 *    is equal to one-half the Power of the attack, rounding down. Against melee attacks, the
 *    target number is the opponent's Strength…
 *
 *    If the character rolls no successes, he falls down (prone). If he rolls successes, but
 *    does not generate enough for his wound level, the character remains standing but takes a
 *    step or two away from the direction of the attack (approximately one meter)… If for some
 *    reason he cannot step backward (for example, he is up against a wall), he fights at a +2
 *    modifier to his target numbers until he is able to move away. Characters who take a
 *    Deadly wound are always knocked down."
 *
 * Knockdown Table — minimum successes to stay standing: L 2 · M 3 · S 4 · D "NA".
 *
 * ⚠ TODO 41 warned this table might be scrambled by the same column-merge that mangles the
 * Visibility Table. Checked on 2026-08-20: it extracts cleanly, AND the prose confirms it
 * independently — "a character who has taken a Moderate wound must roll at least 3 successes".
 * The warning did not apply and has been retired.
 */
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');

export const name = 'knockdown';

export async function run(t) {
  const o  = (level, successes) => SR3EActor.knockdownOutcome({ level, successes });
  const tn = opts => SR3EActor.knockdownTN(opts);

  /* ==== The table, straight across ==== */
  const need = lvl => SR3EActor.knockdownOutcome({ level: lvl, tested: false }).needed;
  t.is('Light needs 2',    need('L'), 2);
  t.is('Moderate needs 3', need('M'), 3);
  t.is('Serious needs 4',  need('S'), 4);
  t.is('Deadly has no number at all — the table prints NA, not 5', need('D'), null);

  /* ==== The book's worked case ====
   * "a character who has taken a Moderate wound must roll at least 3 successes in his or her
   *  Body Test to remain standing. With 1 or 2 successes, the character staggers or stumbles
   *  one meter away from the attack."
   */
  t.ok('Moderate with 3 successes stays standing', o('M', 3).standing);
  t.ok('…and is not staggered',                    !o('M', 3).staggered);
  t.ok('Moderate with 2 staggers',                 o('M', 2).staggered);
  t.ok('Moderate with 1 staggers',                 o('M', 1).staggered);
  t.ok('…and neither is knocked down',             !o('M', 2).knockedDown && !o('M', 1).knockedDown);

  /* ==== Zero successes is always prone, at every level ==== */
  // "If the character rolls no successes, he falls down (prone)." Not "fewer than needed" —
  // zero specifically, which is why staggering needs `successes > 0` and not just `< needed`.
  for (const lvl of ['L', 'M', 'S']) {
    t.ok(`${lvl}: no successes means prone`, o(lvl, 0).knockedDown);
    t.ok(`${lvl}: no successes is NOT merely staggered`, !o(lvl, 0).staggered);
  }

  /* ==== Deadly skips the test entirely ==== */
  //
  // ⚠ Not "needs an impossible roll" — there is no test. The distinction is invisible today
  // and stops being invisible the moment anything grants a bonus to the Body Test: comparing
  // against a very high threshold would eventually let someone pass a test the book says
  // cannot be taken.
  t.ok('Deadly is knocked down',                    o('D', 0).knockedDown);
  t.ok('…and is flagged automatic, not merely failed', o('D', 0).automatic);
  t.ok('Deadly with 6 successes is STILL knocked down', o('D', 6).knockedDown);
  t.ok('…still automatic',                             o('D', 6).automatic);
  t.ok('…and never counts as standing',                !o('D', 99).standing);

  /* ==== Boundaries ==== */
  t.ok('exactly the needed number stands (Serious, 4)', o('S', 4).standing);
  t.ok('one short staggers (Serious, 3)',               o('S', 3).staggered);
  t.ok('well over stands (Light, 9)',                   o('L', 9).standing);

  /* ==== Shape ==== */
  t.ok('an unknown level is not a knockdown',  !o('X', 0).knockedDown);
  t.ok('…and reports standing',                o('X', 0).standing);
  t.ok('no level at all is safe',              !SR3EActor.knockdownOutcome({}).knockedDown);
  t.ok('lowercase levels are accepted',        o('m', 3).standing);
  t.ok('negative successes read as none',      o('L', -4).knockedDown);
  t.ok('junk successes read as none',          o('L', 'x').knockedDown);
  t.ok('untested reports no outcome yet',
    !SR3EActor.knockdownOutcome({ level: 'S', tested: false }).knockedDown);

  /* ==== Target numbers ==== */
  //
  // ⚠ Ranged halves the attack's POWER — not the soak TN. The soak rolls against Power minus
  // armour; knockdown ignores armour entirely.
  t.is('ranged: 9 Power halves to 4 (rounding down)', tn({ power: 9 }), 4);
  t.is('ranged: 10 Power halves to 5',                tn({ power: 10 }), 5);
  t.is('ranged: 8 Power halves to 4',                 tn({ power: 8 }), 4);
  t.is('the floor of 2 holds for feeble attacks',     tn({ power: 1 }), 2);
  t.is('…and for zero',                               tn({ power: 0 }), 2);

  // ⚠ Melee uses the opponent's STRENGTH ATTRIBUTE, not the weapon's damage code — even
  // though melee damage is usually written as (STR)M and the two often coincide.
  t.is('melee: TN is the attacker Strength', tn({ isMelee: true, strength: 6 }), 6);
  t.is('…not halved',                        tn({ isMelee: true, strength: 9 }), 9);
  t.is('…and ignores Power entirely',        tn({ isMelee: true, strength: 5, power: 20 }), 5);
  t.is('melee floors at 2 as well',          tn({ isMelee: true, strength: 1 }), 2);

  // ⚠ Gel rounds: "the target number for the Body Test to resist knockdown is against the
  // FULL Power of the attack" (p.116). Gel is easier to soak but far likelier to floor you —
  // which is the entire point of the round.
  t.is('gel: full Power, not half',        tn({ power: 9, ammoType: 'gel' }), 9);
  t.is('…the same Power halves without it', tn({ power: 9, ammoType: 'regular' }), 4);
  t.is('gel in melee is still Strength — the exception is a ranged-ammunition rule',
    tn({ isMelee: true, strength: 4, power: 9, ammoType: 'gel' }), 4);

  t.is('no arguments does not throw', tn(), 2);
  t.is('junk power reads as 0',       tn({ power: 'x' }), 2);
}
