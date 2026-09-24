/**
 * The haggle in Buy gear must actually roll — TODO 82 follow-up, from a production console:
 *   Uncaught (in promise) TypeError: Cannot read properties of undefined (reading '_rollWave')
 *     at SR3EActor._firstWave  ← rollOpposedPair  ← SR3EPurchase.negotiate
 *
 * `rollOpposedPair` takes each side as `{ actor, pool, tn, label, name? }`. The purchase flow passed
 * `{ actorId, … }`, so `atk.actor` was undefined and the negotiate button did nothing. Source-level:
 * the flow needs a live world to run, and every OTHER caller already passes `actor`.
 */
import { readFileSync } from 'node:fs';

export const name = 'purchase-negotiate';

export async function run(t) {
  const src = readFileSync(new URL('../scripts/SR3EPurchase.js', import.meta.url), 'utf8');
  const call = src.slice(src.indexOf("rollOpposedPair('purchase'"), src.indexOf("rollOpposedPair('purchase'") + 900);
  t.ok('the haggle passes an actor on the buyer\'s side', /\{ actor, pool: opts\.dice,/.test(call));
  t.ok('…and on the source\'s side, which has no actor of its own', /\{ actor, pool: opts\.them,/.test(call));
  t.ok('…and names the source for the card', /name: 'The source'/.test(call));
  t.ok('neither side is passed as an id, which is what threw', !/actorId: actor\.id, pool/.test(call));

  // Every caller in the system uses the same shape.
  const others = ['scripts/documents/SR3EActor.js', 'scripts/documents/SR3EWard.js', 'scripts/SR3EMIJI.js']
    .map(f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8'));
  t.ok('the other callers already pass `actor:`', others.every(s => /rollOpposedPair\([^)]*\{\s*actor:/s.test(s)));
}
