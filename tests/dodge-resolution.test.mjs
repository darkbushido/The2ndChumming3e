/**
 * Dodge Test resolution — SR3EActor.dodgeOutcome.
 *
 * Two rules that the system got wrong for a long time, in opposite directions, so
 * they are pinned here rather than left to a comment:
 *
 *   1. A TIE IS A HIT. The book states the rule twice and both times as a strict
 *      inequality — "exceeds the attacker's successes", "more than the Attacker
 *      achieved". The old code used `netHits <= 0`, handing ties to the defender.
 *   2. A FAILED DODGE STILL COUNTS. "Even if you don't dodge completely, the
 *      successes still count and are added to the Damage Resistance Successes."
 *      The old code discarded them, making a partial dodge worth nothing.
 *
 * Fixing only one of these swings the balance further than either bug alone, which
 * is exactly why both are asserted together.
 */
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');

export const name = 'dodge-resolution';

export async function run(t) {
  const o = (dodge, attack) => SR3EActor.dodgeOutcome(dodge, attack);

  /* ---- Rule 1: a clean miss needs to BEAT the attack, not match it ---- */
  t.ok('dodge above attack is a clean miss',      o(4, 3).cleanMiss === true);
  t.ok('dodge equal to attack is NOT a miss',     o(3, 3).cleanMiss === false);
  t.ok('dodge below attack is NOT a miss',        o(2, 3).cleanMiss === false);
  t.ok('one over is enough',                      o(1, 0).cleanMiss === true);
  t.ok('zero vs zero is a hit, not a miss',       o(0, 0).cleanMiss === false);

  /* ---- Rule 2: a failed dodge carries its successes to the soak ---- */
  t.is('failed dodge carries every success',      o(2, 3).carried, 2);
  t.is('a tie carries its successes too',         o(3, 3).carried, 3);
  t.is('a whiffed dodge carries nothing',         o(0, 4).carried, 0);

  // A clean miss carries nothing because there is no damage left to resist.
  t.is('a clean miss carries nothing',            o(5, 2).carried, 0);

  /* ---- The interaction, stated as a worked case from the rules ---- */
  // Attacker 3, dodge 2: staging comes from the attacker's RAW 3 successes, the
  // attack lands, and the defender still enters the soak holding 2 successes.
  const worked = o(2, 3);
  t.ok('worked case — attack lands',              worked.cleanMiss === false);
  t.is('worked case — 2 successes carried',       worked.carried, 2);

  /* ---- Defensive: the payloads these come from are JSON, so guard the edges ---- */
  t.ok('undefined dodge is treated as zero',      o(undefined, 3).cleanMiss === false);
  t.is('undefined dodge carries zero',            o(undefined, 3).carried, 0);
  t.ok('undefined attack still lets a dodge win', o(1, undefined).cleanMiss === true);
  t.is('negative input is floored at zero',       o(-5, 2).carried, 0);
  t.ok('non-numeric input does not throw',        o('x', 'y').cleanMiss === false);
}
