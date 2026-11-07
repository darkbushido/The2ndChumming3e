/**
 * Buying more than one — Quantity (TODO 284) and the cart (TODO 285) · SR3 pp.272-273.
 * Fixture: the maintainer's Ares Thunderer clip, ¥31 list (2026-10-28), bought by a troll.
 */
import { Cart } from '../scripts/data/cart.mjs';
import { Purchasing } from '../scripts/data/purchasing.mjs';
import { readFileSync } from 'node:fs';

export const name = 'cart';

export async function run(t) {
  const clip = { name: '10-Rnd Clip', cost: 31, quantity: 4, index: 1, tn: 2, time: 24, unit: 'hour' };

  /* ── Quantity ── */
  t.is('a typed quantity is whole', Cart.qty('3.7'), 3);
  t.is('…and at least one', Cart.qty(0), 1);
  t.is('…blank is one', Cart.qty(''), 1);
  t.is('the label names the count', Cart.label('10-Rnd Clip', 4), '4 × 10-Rnd Clip');
  t.is('…and one is the bare name', Cart.label('Medkit', 1), 'Medkit');

  /* ── Price: quantity × unit, surcharge on the TOTAL, rounded once (p.272) ── */
  t.is('four ¥31 clips list at ¥124', Cart.storePrice([clip]).total, 124);
  t.is('a troll pays +25% on the total: ¥155 (not 4 × ¥39 = ¥156)', Cart.storePrice([clip], { metatype: 'Troll' }).total, 155);
  t.is('a dwarf +10%: ¥136', Cart.storePrice([clip], { metatype: 'dwarf' }).total, 136);
  t.is('a cart of one is exactly the single-item price',
    Cart.askingPrice([{ cost: 12000, quantity: 1, index: 3 }], { reduce: 12 }).total,
    Purchasing.askingPrice(12000, 4.2).total);
  t.is('Cheshire\'s whip × 2 through a contact, bought down 12: ¥100,800',
    Cart.askingPrice([{ cost: 12000, quantity: 2, index: 3 }], { reduce: 12 }).total, 100800);
  t.is('each line keeps its own Street Index',
    Cart.askingPrice([{ cost: 100, quantity: 2, index: 2 }, { cost: 50, quantity: 1, index: 3 }]).total, 550);
  t.is('…and the bought-down +0.1 applies to each line',
    Cart.askingPrice([{ cost: 100, quantity: 1, index: 2 }, { cost: 100, quantity: 1, index: 1 }], { reduce: 2 }).total, 340);

  /* ── One Etiquette Test against the slowest line (ruled 2026-11-07) ── */
  const lot = [clip, { name: 'Flak', tn: 8, time: 2, unit: 'day' }, { name: 'Gun', tn: 3, time: 36, unit: 'hour' }];
  t.eq('the highest TN and the longest base time, in its own unit', Cart.slowest(lot), { tn: 8, time: 2, unit: 'day' });
  t.eq('the longest time need not be the highest TN',
    Cart.slowest([{ tn: 9, time: 12, unit: 'hour' }, { tn: 4, time: 1, unit: 'week' }]), { tn: 9, time: 1, unit: 'week' });

  /* ── Delivery stacks ── */
  const box = { type: 'ammunition', system: { loadMechanism: 'c', countedIn: 'reloads', reloads: 1, roundsPerReload: 10 } };
  const d = Cart.deliver(box, 4);
  t.is('four clips land as ONE item…', d.length, 1);
  t.is('…with 4 reloads', d[0].system.reloads, 4);
  t.is('loose rounds land as one item with N × its rounds',
    Cart.deliver({ type: 'ammunition', system: { rounds: 10 } }, 3)[0].system.rounds, 30);
  t.is('a stackable item is one stack', Cart.deliver({ type: 'gear', system: { quantity: 1 } }, 5)[0].system.quantity, 5);
  t.is('…an empty quantity counts as one each', Cart.deliver({ type: 'thrown', system: { quantity: 0 } }, 3)[0].system.quantity, 3);
  t.is('anything else is N copies', Cart.deliver({ type: 'firearm', system: {} }, 2).length, 2);
  t.ok('…which are separate objects', (c => c[0].system !== c[1].system)(Cart.deliver({ type: 'firearm', system: {} }, 2)));
  t.ok('one is left untouched', Cart.deliver(box, 1)[0] === box);

  /* ── Old cards still pay ── */
  t.eq('a pre-284 payload is a cart of one', Cart.linesOf({ name: 'X', itemUuid: 'u' }).map(l => [l.name, l.quantity, l.itemUuid]), [['X', 1, 'u']]);
  t.is('the summary reads the lot', Cart.summary([clip, { name: 'Medkit', quantity: 1 }]), '4 × 10-Rnd Clip, Medkit');

  /* ── Source-level: the flow goes through the cart ── */
  const src = readFileSync(new URL('../scripts/SR3EPurchase.js', import.meta.url), 'utf8');
  t.ok('Pay delivers through Cart.deliver', /Cart\.deliver\(/.test(src));
  t.ok('the dialog has a Quantity field', /id="sr-buy-qty"/.test(src));
  t.ok('the dialog can add to a cart', /id="sr-buy-add"/.test(src));
  t.ok('the store price is the cart\'s', /Cart\.storePrice\(/.test(src));
  t.ok('the contact rolls once against the slowest line', /Cart\.slowest\(/.test(src));
  t.ok('the asking price is the cart\'s', /Cart\.askingPrice\(/.test(src));
}
