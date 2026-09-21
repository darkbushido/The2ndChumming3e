/**
 * Buying gear — Availability, Street Index and the deal · SR3 pp.272-273 (TODO 82).
 *
 * ⚠ **Cheshire's monofilament whip (p.272-273) is the fixture, start to finish.** The book works
 * the whole flow on one item — the target number bought down, the days and Street Index that costs,
 * the base time, the successes dividing it, the asking price and the haggle — and every one of
 * those steps has a plausible wrong reading that her numbers rule out. A change that still lands on
 * 38 days, 19 days, 12,600¥ and 10,080¥ is almost certainly right.
 */
import { Purchasing, REDUCTION, NEGOTIATION_STEP } from '../scripts/data/purchasing.mjs';

export const name = 'purchasing';

export async function run(t) {
  const P = Purchasing;

  /* ── The Availability code is TWO numbers · p.272 ─────────────────────────── */
  const whip = P.parseAvailability('24/14 days');
  t.eq('"24/14 days" is TN 24 and a base time of 14 days', [whip.tn, whip.time, whip.unit], [24, 14, 'day']);
  t.eq('hours are kept as hours', (a => [a.tn, a.time, a.unit])(P.parseAvailability('2/36 hrs')), [2, 36, 'hour']);
  t.ok('"Always" needs no test at all', P.parseAvailability('Always').always);
  t.ok('…and is not confused with a missing code', !P.parseAvailability('').always && P.parseAvailability('').unknown);
  t.ok('an unparseable code says so rather than reading as 0/0', P.parseAvailability('see GM').unknown);

  /* ── Buying the target number down · p.272 ────────────────────────────────── */
  // "She decides to wait long enough to cut the Availability Target Number in half, to 12. That
  //  means she'll be waiting 24 extra days (2 x 12 = 24) … the base time for acquiring it is now
  //  38 days (24 + 14 = 38) and the Street Index is up to 4.2 (12 x .1 = 1.2, 1.2 + 3 = 4.2)."
  const cut = P.reduceAvailability(whip, 3, 12);
  t.is('TN 24 bought down by 12 is 12', cut.tn, 12);
  t.is('…costing 24 extra days (2 per point)', cut.extraDays, 24);
  t.is('…and taking the Street Index from 3 to 4.2', cut.streetIndex, 4.2);
  // ⚠ The days are added to the BASE TIME, which the successes then divide. Reducing the final
  //   time instead, or charging the 2 days once, both give a different answer than the book's 19.
  t.is('…so the base time becomes 38 days, not 14', cut.baseTime, 38);
  t.eq('no reduction changes nothing', (r => [r.tn, r.baseTime, r.streetIndex])(P.reduceAvailability(whip, 3, 0)), [24, 14, 3]);
  t.is('…and the TN cannot be bought below 0', P.reduceAvailability(whip, 3, 99).tn, 0);
  t.eq('the cost per point is the book\'s', [REDUCTION.daysPerPoint, REDUCTION.streetIndexPerPoint], [2, 0.1]);

  /* ── Successes divide the time · p.272 ────────────────────────────────────── */
  // "he'll have it in 19 days (38 days ÷ 2 successes)"
  const got = P.acquisitionTime(cut.baseTime, 2);
  t.is('2 successes on a 38-day base is 19 days', got.time, 19);
  t.ok('…and that is a find', got.found);
  // ⚠ "Halfway through this period, face-to-face negotiations … take place" — the price is settled
  //   at the halfway mark, not on delivery, which is the hook the whole scene hangs on.
  t.is('…with the meet at the halfway mark, day 9.5', got.halfway, 9.5);
  const none = P.acquisitionTime(38, 0);
  t.ok('no successes is no source, not an infinite wait', !none.found && none.time === null);

  /* ── The asking price · p.273 ─────────────────────────────────────────────── */
  // "The base cost of a monofilament whip is 3,000¥ … a revised Street Index of 4.2. That makes
  //  the cost a whopping 12,600¥."
  t.is('3,000¥ at Street Index 4.2 is 12,600¥', P.askingPrice(3000, 4.2).total, 12600);
  t.is('…at the ordinary index 3 it would be 9,000¥', P.askingPrice(3000, 3).total, 9000);
  t.is('a missing index is 1, not 0 — never free', P.askingPrice(3000, 0).total, 3000);
  // Racial modifications · p.272: "up the price 10 percent … For troll-modified gear, 25 percent."
  t.is('dwarf-modified gear is +10%', P.askingPrice(1000, 1, { metatype: 'Dwarf' }).total, 1100);
  t.is('troll-modified is +25%', P.askingPrice(1000, 1, { metatype: 'troll' }).total, 1250);
  t.is('a human pays the list price', P.askingPrice(1000, 1, { metatype: 'Human' }).total, 1000);

  /* ── The haggle · p.273 ───────────────────────────────────────────────────── */
  // "Cheshire rolls 4 more successes than Tony. She charms the mobster down 20 percent for a final
  //  price of 10,080¥."
  const deal = P.negotiate(12600, 6, 2);
  t.eq('4 net successes to the buyer is 20% off', [deal.net, deal.percent], [4, 0.2]);
  t.is('…12,600¥ becomes 10,080¥', deal.price, 10080);
  t.ok('…and it went the buyer\'s way', deal.toBuyer);
  // The book's other worked figure: "if the player rolls 4 successes and the contact only 2 …
  //  knock the price down by 10 percent."
  t.is('2 net is 10% off', P.negotiate(1000, 4, 2).price, 900);
  // ⚠ Signed: "If the player loses, the gamemaster can either raise the price or demand the extra
  //   percentage up front" — losing COSTS, it is not merely a failure to save.
  const lost = P.negotiate(1000, 1, 4);
  t.eq('losing by 3 puts the price UP 15%', [lost.net, lost.price, lost.toBuyer], [-3, 1150, false]);
  t.is('a tie moves nothing', P.negotiate(1000, 2, 2).price, 1000);
  t.is('the step is 5% (p.273)', NEGOTIATION_STEP, 0.05);

  /* ── Which contact · p.272 ────────────────────────────────────────────────── */
  // "Talismongers, for example, are an ideal contact for magical items, but not very good at
  //  acquiring weapons."
  t.is('a talismonger is poor for a gun', P.affinity('Talismonger', 'firearm').rating, 'poor');
  t.is('…and good for a focus', P.affinity('Talismonger', 'focus').rating, 'good');
  t.is('a fixer is the usual middleman', P.affinity('Fixer', 'gear').rating, 'good');
  t.is('a street doc for \'ware', P.affinity('Street Doc', 'cyberware').rating, 'good');
  // ⚠ A HINT, never a gate — an archetype the table has never heard of is not refused.
  t.is('an unknown archetype has no opinion', P.affinity('Talislegger', 'firearm').rating, 'unknown');
  t.is('…and neither does a blank one', P.affinity('', 'gear').rating, 'unknown');

  /* ── Display ──────────────────────────────────────────────────────────────── */
  t.is('19 days reads plainly', P.formatTime(19, 'day'), '19 days');
  t.is('…and a half day is kept', P.formatTime(9.5, 'day'), '9.5 days');
  t.is('one is singular', P.formatTime(1, 'day'), '1 day');
  t.is('no time at all is an em dash', P.formatTime(null), '—');
}
