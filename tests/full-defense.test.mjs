/**
 * Full Defense, and the melee tie — SR3EActor.fullDefenseOutcome / meleeOutcome.
 *
 * Two rules from the same passage, both of which the system had wrong in ways that looked
 * entirely reasonable on screen.
 *
 *   1. **A MELEE TIE GOES TO THE ATTACKER.** p.122 step 3: "The character who rolls the most
 *      successes has hit his or her opponent. A tie goes in favor of the attacker." The system
 *      announced "🤝 Tie! — no damage dealt", deleting a whole attack. Note the direction: the
 *      ranged Dodge Test has the SAME strictness trap pinned in `dodge-resolution.test.mjs`,
 *      and melee had it pointing the other way.
 *
 *   2. **FULL DEFENSE IS TWO STAGES, AND ITS DODGE SUBTRACTS FROM STAGING.** p.124: "subtract
 *      the Dodge successes from the attacker's and apply any remaining successes to staging
 *      up the Damage Level." That is the OPPOSITE of the ordinary Dodge Test (p.113), whose
 *      successes "are added to the Damage Resistance Successes" and explicitly do not reduce
 *      staging. Two dodges, two arithmetics — reusing `dodgeOutcome` for Full Defense would
 *      silently make the posture worse than not adopting it.
 */
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');

export const name = 'full-defense';

export async function run(t) {
  const mo = (a, d) => SR3EActor.meleeOutcome(a, d);
  const fd = o => SR3EActor.fullDefenseOutcome(o);

  /* ==== 1. The melee tie — SR3 p.122 step 3 ==== */
  t.ok('the attacker winning outright is a hit',        mo(4, 2).winnerIsAtk);
  t.is('…with net 2',                                    mo(4, 2).net, 2);
  t.ok('the defender winning outright is a hit for them', !mo(2, 4).winnerIsAtk);
  t.is('…with net 2',                                    mo(2, 4).net, 2);

  // THE RULE. A tie is not "no damage" — it is an attacker hit with nothing to stage.
  t.ok('a tie goes to the ATTACKER',        mo(3, 3).winnerIsAtk);
  t.is('and its net is 0, so nothing stages', mo(3, 3).net, 0);
  t.ok('and it reports itself as a tie, so the card can say why', mo(3, 3).tie);
  t.ok('0 vs 0 is still an attacker hit — both whiffed, the attacker still connects',
    mo(0, 0).winnerIsAtk);
  t.is('…for base damage',                   mo(0, 0).net, 0);

  t.ok('junk reads as 0 rather than NaN',    mo(undefined, null).winnerIsAtk);
  t.is('negatives cannot invent successes',  mo(-5, -2).net, 0);

  /* ==== 2. Full Defense, stage 1 — the pool-free skill compare ==== */
  t.ok('the defender beating the attacker BLOCKS the attack', fd({ attackHits: 3, skillHits: 4 }).blocked);
  t.is('a blocked attack has no net',                          fd({ attackHits: 3, skillHits: 4 }).net, 0);

  // ⚠ Strict, and it points the OPPOSITE way to the clean-miss test below. A tie on the
  // skill test is NOT a block: net 0, base damage, and the dodge is still offered.
  t.ok('a TIE on the skill test does not block', !fd({ attackHits: 3, skillHits: 3 }).blocked);
  t.is('…it is net 0 — base damage, nothing staged', fd({ attackHits: 3, skillHits: 3 }).net, 0);
  t.is('the attacker ahead by 3 has net 3', fd({ attackHits: 5, skillHits: 2 }).net, 3);

  /* ==== 3. The defender NEVER deals damage ==== */
  // "Characters who choose this option do not do any damage to their opponent, EVEN IF they
  // achieve more successes on their Combat Skill Test."
  t.ok('winning the skill test outright still deals no damage',
    fd({ attackHits: 1, skillHits: 6 }).dealsDamage === false);
  t.ok('and neither does anything else',
    fd({ attackHits: 6, skillHits: 1, dodgeHits: 3 }).dealsDamage === false);

  /* ==== 4. Stage 2 — the Dodge Test, Combat Pool dice only ==== */
  // "A clean miss occurs if the target's successes from Combat Pool dice alone EXCEED the
  // attacker's net successes." Strict — matching, not beating, is not a miss.
  t.ok('dodging above the net is a clean miss',  fd({ attackHits: 5, skillHits: 1, dodgeHits: 5 }).cleanMiss);
  t.ok('dodging EQUAL to the net is NOT a miss', !fd({ attackHits: 5, skillHits: 1, dodgeHits: 4 }).cleanMiss);
  t.is('a clean miss leaves nothing to stage',   fd({ attackHits: 5, skillHits: 1, dodgeHits: 5 }).remaining, 0);
  t.ok('a blocked attack is never also a clean miss', !fd({ attackHits: 2, skillHits: 5, dodgeHits: 9 }).cleanMiss);

  /* ==== 5. THE TRAP: the dodge SUBTRACTS from staging ==== */
  //
  // Attacker 6, defender's pool-free skill test 1 → net 5. The defender then dodges 3.
  //   Full Defense (p.124): 5 − 3 = 2 remain → ONE level of staging.
  //   Ordinary dodge (p.113): staging would still come from the full 5 → TWO levels, with
  //   the 3 successes moving to the Damage Resistance Test instead.
  // Same numbers, different answers. That difference is the whole reason these are separate
  // functions, and the reason `dodgeOutcome` must never be reused here.
  const trap = fd({ attackHits: 6, skillHits: 1, dodgeHits: 3 });
  t.is('net before the dodge is 5',                        trap.net, 5);
  t.is('the dodge comes OFF the net, leaving 2 to stage',  trap.remaining, 2);
  t.ok('and it was not a clean miss',                      !trap.cleanMiss);

  // The ordinary dodge, on the same numbers, deliberately disagrees — asserted so that anyone
  // "unifying" the two functions has to delete a test that explains why they differ.
  const ordinary = SR3EActor.dodgeOutcome(3, 6);
  t.ok('the ordinary dodge is not a clean miss on these numbers either', !ordinary.cleanMiss);
  t.is('but it CARRIES its 3 successes to the soak instead of cancelling net',
    ordinary.carried, 3);

  /* ==== 6. Shape ==== */
  t.is('no arguments at all does not throw', fd().net, 0);
  t.ok('no arguments is not a block',        !fd().blocked);
  t.is('a dodge with no attack leaves nothing', fd({ dodgeHits: 4 }).remaining, 0);
  t.is('negative hits cannot invent net',    fd({ attackHits: -3, skillHits: -1 }).net, 0);
  t.is('fractional hits truncate',           fd({ attackHits: 5.9, skillHits: 1 }).net, 4);
  t.is('a huge dodge cannot drive remaining below zero',
    fd({ attackHits: 4, skillHits: 0, dodgeHits: 99 }).remaining, 0);
}
