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

  /* ==== The Dodge Test TARGET NUMBER — SR3EActor.dodgeTN, SR3 p.113 ====
   *
   *   "The base target number for this test is 4. The following modifiers apply:
   *    • +1 per 3 rounds fired from a burst-fire or full-auto weapon.
   *    • +1 per meter of shotgun spread at the target's position (see Shotguns, p. 117).
   *    • + Damage Modifiers (p. 126)."
   *
   * All three were missing — `_rollDodge` hardcoded 4 — so dodging a ten-round burst was
   * exactly as easy as dodging one pistol shot, and a wounded defender dodged as though
   * unhurt. That last one is not an inference: the book works it in the example below.
   */
  const tn = opts => SR3EActor.dodgeTN(opts);

  t.is('an unmodified dodge is the base 4', tn(), 4);
  t.is('an empty options object is also 4', tn({}), 4);

  /* ---- +1 per 3 rounds, and it is per THREE, not per round ---- */
  t.is('a single shot adds nothing',                tn({ burstRounds: 1 }), 4);
  t.is('two rounds is still under the threshold',   tn({ burstRounds: 2 }), 4);
  t.is('a three-round burst is +1',                 tn({ burstRounds: 3 }), 5);
  t.is('five rounds is still +1 — it rounds DOWN',  tn({ burstRounds: 5 }), 5);
  t.is('six rounds is +2',                          tn({ burstRounds: 6 }), 6);
  t.is('a ten-round full-auto burst is +3',         tn({ burstRounds: 10 }), 7);
  // ⚠ The same phrase "per 3 rounds" drives the DAMAGE LEVEL on the attack side
  // (level +⌊rounds/3⌋). Two different rules sharing a phrase; this one is the dodge TN.
  t.is('a two-round short burst adds nothing here either', tn({ burstRounds: 2 }), 4);

  /* ---- Shotgun spread, +1 per metre ---- */
  t.is('no spread, no modifier',      tn({ shotgunSpread: 0 }), 4);
  t.is('three metres of spread is +3', tn({ shotgunSpread: 3 }), 7);

  /* ---- The wound modifier, and its SIGN ----
   *
   * ⚠ `system.woundMod` is NEGATIVE across this codebase (`Math.min(0, …)`), so it is
   * SUBTRACTED. A positive value passed here would make wounded characters HARDER to hit —
   * a sign flip that looks perfectly reasonable on screen and is caught only by arithmetic.
   */
  t.is('an unwounded defender is unmodified',   tn({ woundMod: 0 }), 4);
  t.is('a Light wound is +1',                   tn({ woundMod: -1 }), 5);
  t.is('a Serious wound is +3',                 tn({ woundMod: -3 }), 7);
  t.is('a positive woundMod cannot LOWER the TN — the sign guard holds',
    tn({ woundMod: 2 }), 4);

  /* ---- Snot's dodge, worked in the book — SR3 p.113 ----
   *
   *   "Snot first decides to attempt a Dodge Test. He rolls his 5 Combat Pool dice against
   *    a Target Number 5 (4, plus one from the Light wound he took earlier)."
   *
   * Liam is firing an Ares Predator — a single shot, no burst, no spread. The entire
   * modifier is the wound, which is the one the old code could never have applied.
   */
  t.is("Snot dodges Liam's Predator at TN 5, not 4",
    tn({ burstRounds: 0, shotgunSpread: 0, woundMod: -1 }), 5);

  /* ---- All three at once, since they are independent and cumulative ---- */
  t.is('a wounded defender dodging a six-round burst through shot spread stacks all three',
    tn({ burstRounds: 6, shotgunSpread: 2, woundMod: -2 }), 10);

  /* ---- Shape ---- */
  t.is('junk reads as no modifier rather than NaN',
    tn({ burstRounds: 'x', shotgunSpread: null, woundMod: undefined }), 4);
  t.is('a negative round count cannot lower the TN', tn({ burstRounds: -9 }), 4);
  t.is('a negative spread cannot lower the TN',      tn({ shotgunSpread: -9 }), 4);
  t.is('fractional rounds truncate rather than drifting',
    tn({ burstRounds: 3.9 }), 5);

  /* ---- The breakdown shown to the defender must match the arithmetic ---- */
  const parts = o2 => SR3EActor.dodgeTNParts(o2);
  t.is('a plain 4 has nothing to explain', parts().length, 0);
  t.ok('the burst part names the round count, so the defender can check it',
    /\+?3 burst \(9 rounds\)/.test(parts({ burstRounds: 9 }).join(' ')));
  t.ok('the wound part is shown as a POSITIVE penalty, matching what the TN did',
    /\+2 wound/.test(parts({ woundMod: -2 }).join(' ')));
  t.is('every contributing modifier gets a fragment',
    parts({ burstRounds: 3, shotgunSpread: 1, woundMod: -1 }).length, 3);
  // The parts are a second implementation of the same sum, so they are checked against it.
  for (const o3 of [{ burstRounds: 3 }, { woundMod: -2 }, { shotgunSpread: 4 },
                    { burstRounds: 7, shotgunSpread: 2, woundMod: -3 }]) {
    const summed = parts(o3).reduce((a, frag) => a + parseInt(frag.match(/\+(\d+)/)[1]), 4);
    t.is(`the breakdown sums to the TN it explains (${JSON.stringify(o3)})`, summed, tn(o3));
  }


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
