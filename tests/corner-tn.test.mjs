/**
 * Two-corner card target numbers — SR3EActor.cornerTN.
 *
 * Every boxing-style card (melee, astral, contested, MIJI, Defragged cybercombat and the
 * three Orthodox Matrix ones) resolves each corner's TN the same way: what the user typed,
 * else the value computed when the card was built, else the SR3 base of 4 — floored at 2.
 *
 * It used to be written inline in eight handlers with TWO different behaviours, which is
 * the whole reason it now lives in one function:
 *
 *   - melee, astral and Defragged cybercombat fell back to a HARDCODED 4, silently
 *     discarding the reach differential, the defaulting penalty and the called-shot +4
 *     that ctxTN carries.
 *   - the other five fell back to ctxTN with no final guard, so a missing field gave
 *     Math.max(2, undefined) === NaN — a target number no die can ever meet.
 *
 * Neither could fire while the inputs always exist. Both go live the moment a corner is
 * rendered read-only, which is exactly what TODO #24 does next.
 */
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');

export const name = 'corner-tn';

export async function run(t) {
  const tn = (raw, ctx, floor) => SR3EActor.cornerTN(raw, ctx, floor);

  /* ---- precedence: typed value wins ---- */
  t.is('a typed value wins over the computed one', tn('7', 4), 7);
  t.is('numbers work as well as strings',          tn(7, 4), 7);
  t.is('a typed value survives trailing text',     tn('7 ', 4), 7);

  /* ---- the computed value is the fallback, NOT a bare 4 ----
   * The regression this exists to stop. ctxTN carries the reach differential, the
   * defaulting penalty and the called-shot +4; falling back past it to 4 throws all
   * three away without a word.
   */
  t.is('a missing input falls back to the computed TN',  tn(undefined, 9), 9);
  t.is('an empty input falls back to the computed TN',   tn('', 9), 9);
  t.is('unparseable input falls back to the computed TN', tn('abc', 9), 9);
  t.is('and NOT to a bare 4',                             tn(undefined, 9) === 4, false);

  // Concretely: a staff-wielder facing an unarmed opponent, defaulting, with a called
  // shot declared. ctx.atkTN already folds all of that in; a bare 4 would erase it.
  t.is('a computed TN carrying reach/defaulting/called-shot survives', tn(undefined, 8), 8);

  /* ---- last resort, and never NaN ----
   * The other half of the old split: five cards had no final guard, so a missing ctx
   * field produced Math.max(2, undefined) === NaN, which fails every die silently.
   */
  t.is('neither source available falls back to 4',   tn(undefined, undefined), 4);
  t.is('an explicit floor is honoured',              tn(undefined, undefined, 6), 6);
  t.ok('the result is never NaN',                    Number.isFinite(tn(undefined, undefined)));
  t.ok('not even with nonsense on both sides',       Number.isFinite(tn('xyz', null)));
  t.ok('nor with null input and null ctx',           Number.isFinite(tn(null, null)));

  /* ---- SR3 p.112: "No target number can ever be less than 2." ---- */
  t.is('a typed 1 is floored to 2',        tn('1', 9), 2);
  t.is('a negative typed value is floored', tn('-5', 9), 2);
  t.is('a low computed TN is floored too',  tn(undefined, 1), 2);
  t.is('an explicit low floor is floored',  tn(undefined, undefined, 1), 2);

  /* ---- a typed 0 falls THROUGH to the computed value ----
   * Pinned, not endorsed. `0` is falsy, so it behaves as "nothing typed" rather than as
   * "the lowest possible TN". A GM typing 0 most likely means the latter. This is
   * existing behaviour preserved deliberately through the extraction — if it is ever
   * changed, it should be a decision with this test updated to match, not a silent
   * side effect of tidying the expression.
   */
  t.is('a typed 0 defers to the computed TN', tn('0', 9), 9);
  t.is('and to the floor when there is none', tn('0', undefined), 4);
}
