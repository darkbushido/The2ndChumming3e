/**
 * The Magic Loss check · SR3 p.160: "roll 2D6. If the total is less than or equal to your Magic Attribute, it drops by
 * one point. Otherwise, there is no effect. A roll of 2 always indicates the loss of a Magic point."
 */
import { readFileSync } from 'node:fs';
const { MagicLoss } = await import('../scripts/data/magic-loss.mjs');

export const name = 'magic-loss';

export async function run(t) {
  t.ok('a 2D6 AT Magic loses a point, one above does not', MagicLoss.lost(5, 5) && !MagicLoss.lost(6, 5));
  t.ok('a roll of 2 always loses, even at Magic 1', MagicLoss.lost(2, 1));
  t.ok('…and at Magic 0 (a roll of 2 still loses; nothing else does)', MagicLoss.lost(2, 0) && !MagicLoss.lost(3, 0));
  t.ok('a 3 at Magic 1 is safe', !MagicLoss.lost(3, 1));
  t.ok('a 12 at Magic 6 is safe, at Magic 12 it is not', !MagicLoss.lost(12, 6) && MagicLoss.lost(12, 12));

  const heal = readFileSync(new URL('../scripts/SR3EHealing.js', import.meta.url), 'utf8');
  t.ok('the healing flow routes its Magic Loss check through MagicLoss', /MagicLoss\.lost\(roll, magic\)/.test(heal));
  // Every Magic Loss check goes through the one rule: no other `<= magic` comparison on a 2D6 in the scripts.
  t.ok('the healing flow decides each roll with magicLost', /H\.magicLost\(r, magic\)/.test(heal));
}
