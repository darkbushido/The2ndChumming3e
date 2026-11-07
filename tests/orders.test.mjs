/**
 * ⏱ Downtime / In session, 📦 orders and ⏳ recoveries · TODO 288 (SR3 pp.126-129, 272-273).
 * The design the maintainer confirmed 2026-11-07 (grilled in two rounds).
 */
import { Orders, MODES } from '../scripts/data/orders.mjs';
import { readFileSync } from 'node:fs';

export const name = 'orders';

export async function run(t) {
  const src = f => readFileSync(new URL(`../scripts/${f}`, import.meta.url), 'utf8');

  /* ── the toggle ── */
  t.is('In session makes things wait', Orders.waits(MODES.session), true);
  t.is('Downtime does not', Orders.waits(MODES.downtime), false);
  t.is('an unset mode is Downtime (the old behaviour)', Orders.waits(undefined), false);
  t.ok('everyone sees which mode it is', /In session/.test(Orders.modeLabel('session')) && /Downtime/.test(Orders.modeLabel('downtime')));

  /* ── which purchases wait (Q2: contact only, p.272) ── */
  t.is('a contact purchase in session is ordered', Orders.payMode('session', { store: false }), 'order');
  t.is('a store purchase in session is paid at once', Orders.payMode('session', { store: true }), 'pay');
  t.is('a contact purchase in Downtime is paid at once', Orders.payMode('downtime', { store: false }), 'pay');

  /* ── the state ── */
  const o = { id: 'o1', buyerId: 'A1', name: '4 × 10-Rnd Clip', price: 155 };
  let s = Orders.place(Orders.empty(), o);
  t.is('placing adds the order', s.orders.length, 1);
  t.is('placing it again (a re-delivered query) adds nothing', Orders.place(s, o).orders.length, 1);
  t.is('an order with no id is not stored', Orders.place(s, { name: 'x' }).orders.length, 1);
  t.is('the buyer sees it on their Gear tab', Orders.forBuyer(s, ['A1']).length, 1);
  t.is('…by token uuid or id', Orders.forBuyer(s, 'A1').length, 1);
  t.is('…and nobody else does', Orders.forBuyer(s, ['B2']).length, 0);
  t.is('find returns it', Orders.find(s, 'order', 'o1')?.price, 155);
  t.is('delivering or cancelling removes it', Orders.remove(s, 'order', 'o1').orders.length, 0);
  t.is('a broken stored value reads as empty', Orders.normalize(null).orders.length + Orders.normalize({ orders: 5 }).recoveries.length, 0);

  /* ── 📦 Deliver: payment in full at delivery, warned when short (p.273) ── */
  t.eq('a buyer who can pay', Orders.settle(155, 1000), { price: 155, short: false, after: 845 });
  t.eq('a buyer who cannot is warned, and nuyen stops at 0', Orders.settle(155, 100), { price: 155, short: true, after: 0 });

  /* ── ⏳ recoveries and new damage (Q10) ── */
  const rec = { id: 'r1', kind: 'lower', from: { physical: 6, overflow: 0, stun: 2 } };
  s = Orders.startRecovery(s, rec);
  t.is('a recovery is stored', s.recoveries.length, 1);
  t.is('…once', Orders.startRecovery(s, rec).recoveries.length, 1);
  t.is('unchanged wounds: no warning', Orders.changed(rec, { physical: 6, overflow: 0, stun: 2 }), false);
  t.is('new Physical damage warns a Physical recovery', Orders.changed(rec, { physical: 8, overflow: 0, stun: 2 }), true);
  t.is('…Stun does not', Orders.changed(rec, { physical: 6, overflow: 0, stun: 5 }), false);
  t.is('a Stun rest is warned by Stun only', Orders.changed({ kind: 'eraseStun', from: { stun: 3 } }, { physical: 9, stun: 4 }), true);

  /* ── flipping to Downtime (Q8) ── */
  t.eq('the offer counts what waits', Orders.downtimeOffer(s), { orders: 1, recoveries: 1, any: true });
  t.is('nothing waiting → no dialog', Orders.downtimeOffer(Orders.empty()).any, false);
  t.ok('a cancel says Availability may rise, not that it does (p.273)', /may raise/.test(Orders.CANCEL_NOTE) && /not applied/.test(Orders.CANCEL_NOTE));

  /* ── source level: the Foundry side keeps the settled design ── */
  const ord = src('SR3EOrders.js'), pur = src('SR3EPurchase.js'), heal = src('SR3EHealing.js'), main = src('sr3e.js');
  t.ok('deliver, cancel and finish are GM-only', (ord.match(/if \(!game\.user\.isGM\) return false;/g) ?? []).length >= 4);
  t.ok('players place orders through a GM verb', /CONFIG\.queries\['sr3e\.orders\.place'\]/.test(ord) && /asGM\('sr3e\.orders\.place'/.test(ord));
  t.ok('…which checks the requester owns the buyer', /testUserPermission\(who, 'OWNER'\)/.test(ord));
  t.ok('the flip to Downtime offers, ticked, and does nothing on Esc', /class="sr-ord-pick"[\s\S]*checked/.test(ord) && /let picked = null/.test(ord));
  t.ok('a short buyer is warned at delivery, never refused', /st\.short \?/.test(ord) && /payment in full is expected at delivery/.test(ord));
  t.ok('changed wounds are warned at ✅ Recovered', /Wounds changed since it started/.test(ord));
  t.ok('💴 Pay and 📦 Deliver share one writer', /async receive\(actor, payload, price/.test(pur) && /SR3EPurchase\.receive\(/.test(ord) && /await SR3EPurchase\.receive\(actor, payload, price\)/.test(pur));
  t.ok('contact cards ask payMode with store false; the store card has no order path', /payMode\(game\.sr3e\.SR3EOrders\.mode\(\), \{ store: false \}\)/.test(pur));
  t.ok('the pay button places the order when the card says so', /pl\.order\s*\?\s*await SR3EOrders\.placeOrder/.test(main));
  t.ok('GM tools carry the toggle and the Orders window', /sr3e-timemode-btn/.test(main) && /sr3e-orders-btn/.test(main));
  t.ok('refresh relabels the GM tools buttons (the hook returns early once they exist — live check 2026-11-07)',
    /static refresh\(\) \{[\s\S]*?SR3EOrders\.relabelTools\(\)/.test(ord) && /querySelectorAll\('\.sr3e-timemode-btn'\)/.test(ord)
    && /querySelectorAll\('\.sr3e-orders-btn'\)/.test(ord));
  t.ok('…and the hook takes its labels from the same place', /mk\('sr3e-timemode-btn', SR3EOrders\.toolLabels\(\)\.mode/.test(main)
    && /mk\('sr3e-orders-btn',\s*SR3EOrders\.toolLabels\(\)\.orders/.test(main));
  t.ok('the Buy gear dialog shows the mode', /class="sr-buy-mode"/.test(pur));
  t.ok('natural healing (stage, Stun rest) is timed in session', /timed\(lower, 'lower'/.test(heal) && /'eraseStun', H\.formatHours/.test(heal));
  t.ok('first aid and magic are not timed', !/timed\(\{ act: 'heal-boxes'/.test(heal) && /actions\.push\(lower\)/.test(heal));
  t.ok('the Gear tab lists what is on order', /onOrderHtml\?\.\(actor\)/.test(src('sheets/SR3EActorSheet.js')));
}
