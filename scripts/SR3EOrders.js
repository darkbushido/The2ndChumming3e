/**
 * ⏱ Downtime / In session, 📦 Orders and ⏳ recoveries · TODO 288
 *
 * Rules live in `data/orders.mjs`. This file keeps the state in two WORLD settings only the GM writes:
 *  - `timeMode`     'downtime' | 'session' — the toggle (GM tools → ⏱).
 *  - `pendingWaits` { orders: [...], recoveries: [...] } — what is waiting on time.
 * Players reach the state through GM query verbs (`sr3e.orders.place`, `sr3e.orders.recover`), like every
 * other GM-routed write; the GM's 📦 Orders window delivers, cancels and finishes.
 *
 * Warn, never refuse; offer, never apply: nothing is charged, created or healed without a GM click.
 */
import { Orders, MODES } from './data/orders.mjs';
import { Purchasing } from './data/purchasing.mjs';
import { Cart } from './data/cart.mjs';
import { actorFrom, actorRef } from './data/actor-ref.mjs';

const NS = 'The2ndChumming3e';
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const yen = n => `¥${(Number(n) || 0).toLocaleString('en-US')}`;
const today = () => new Date().toISOString().slice(0, 10);

export class SR3EOrders extends foundry.applications.api.ApplicationV2 {

  static DEFAULT_OPTIONS = {
    id:       'sr3e-orders',
    classes:  ['sr3e', 'sr3e-orders-app'],
    tag:      'div',
    window:   { title: '📦 Orders and recoveries', resizable: true },
    position: { width: 520, height: 520 },
  };

  static instance = null;

  /* ── settings and verbs ─────────────────────────────────────────────────────────────── */

  static registerSettings() {
    game.settings.register(NS, 'timeMode', {
      scope: 'world', config: false, type: String, default: MODES.downtime,
      onChange: () => SR3EOrders.refresh(),
    });
    game.settings.register(NS, 'pendingWaits', {
      scope: 'world', config: false, type: Object, default: Orders.empty(),
      onChange: () => SR3EOrders.refresh(),
    });
  }

  /** In `init`, with the other verbs — a fast click during load must find a listener. */
  static registerQueries() {
    const Q = () => game.sr3e.SR3EQuery;
    const Queue = () => game.sr3e.SR3EQueue;
    // 📝 A buyer (or the GM) places an order. The GM checks the requester owns the buyer.
    CONFIG.queries['sr3e.orders.place'] = async ({ rid, order, _requesterId }) => Q().once(rid, () =>
      Queue().run('sr3e:orders', async () => {
        Q().assertActiveGM();
        const buyer = actorFrom(order?.buyerId);
        if (!buyer) throw new Error('SR3E | orders.place: unknown buyer');
        const who = game.users.get(_requesterId);
        if (who && !who.isGM && !buyer.testUserPermission(who, 'OWNER')) throw new Error('SR3E | orders.place: not your character');
        await SR3EOrders._write(s => Orders.place(s, order));
        return { ok: true };
      }));
    // ⏳ A patient's owner or their medic starts a recovery.
    CONFIG.queries['sr3e.orders.recover'] = async ({ rid, rec }) => Q().once(rid, () =>
      Queue().run('sr3e:orders', async () => {
        Q().assertActiveGM();
        await SR3EOrders._write(s => Orders.startRecovery(s, rec));
        return { ok: true };
      }));
  }

  static mode() { return game.settings.get(NS, 'timeMode') ?? MODES.downtime; }
  static waits() { return Orders.waits(SR3EOrders.mode()); }
  static state() { return Orders.normalize(game.settings.get(NS, 'pendingWaits')); }
  static async _write(fn) { await game.settings.set(NS, 'pendingWaits', fn(SR3EOrders.state())); }

  /** Re-render whatever shows the mode or the waits: this window, the GM tools, open actor sheets. */
  static refresh() {
    if (SR3EOrders.instance?.rendered) SR3EOrders.instance.render();
    ui.tables?.render?.();
    for (const app of foundry.applications.instances?.values?.() ?? []) {
      if (app.document?.documentName === 'Actor' && app.rendered) app.render();
    }
  }

  /* ── the toggle ─────────────────────────────────────────────────────────────────────── */

  /** GM tools ⏱ — flips the mode. Going to Downtime offers to finish what is waiting (Q8). */
  static async toggle() {
    if (!game.user.isGM) return;
    const next = SR3EOrders.waits() ? MODES.downtime : MODES.session;
    await game.settings.set(NS, 'timeMode', next);
    ui.notifications.info(Orders.modeLabel(next));
    if (next === MODES.downtime && Orders.downtimeOffer(SR3EOrders.state()).any) await SR3EOrders.offerAll();
  }

  /** A ticked list of every wait; Confirm delivers/finishes the ticked ones. Esc does nothing. */
  static async offerAll() {
    const s = SR3EOrders.state();
    const row = (kind, x, text) => `<label style="display:block"><input type="checkbox" class="sr-ord-pick"
      data-kind="${kind}" data-id="${esc(x.id)}" checked/> ${text}</label>`;
    let picked = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: '⏱ Downtime — finish what is waiting?' },
      content: `<p>Deliver ${s.orders.length} order${s.orders.length === 1 ? '' : 's'} and finish
        ${s.recoveries.length} recover${s.recoveries.length === 1 ? 'y' : 'ies'} now? Untick any to keep it waiting.</p>
        ${s.orders.map(o => row('order', o, `📦 ${esc(o.buyerName)}: ${esc(o.name)} — ${yen(o.price)}`)).join('')}
        ${s.recoveries.map(r => row('recovery', r, `⏳ ${esc(r.patientName)}: ${esc(r.label)}`)).join('')}`,
      buttons: [
        { label: 'Confirm', action: 'ok', default: true,
          callback: (_e, _b, dlg) => { picked = [...dlg.element.querySelectorAll('.sr-ord-pick:checked')].map(c => ({ kind: c.dataset.kind, id: c.dataset.id })); } },
        { label: 'Keep them waiting', action: 'cancel' },
      ],
    });
    for (const p of picked ?? []) {
      if (p.kind === 'order') await SR3EOrders.deliver(p.id, { ask: false });
      else await SR3EOrders.finishRecovery(p.id, { ask: false });
    }
  }

  /* ── orders ─────────────────────────────────────────────────────────────────────────── */

  /**
   * 📝 Place order — from a contact purchase card in session. Nothing is paid or created (p.273).
   * `claim` records the click on the card first, as 💴 Pay does.
   */
  static async placeOrder(payload, { claim = async () => true } = {}) {
    const buyer = actorFrom(payload?.buyerId);
    if (!buyer) return false;
    if (!(await claim())) { ui.notifications.warn(`${payload.name} has already been ordered.`); return false; }
    const got = Purchasing.acquisitionTime(payload.baseTime, payload.successes ?? 0);
    const order = {
      id: foundry.utils.randomID(),
      buyerId: payload.buyerId, buyerName: buyer.name,
      name: payload.name, price: Math.max(0, Number(payload.price) || 0),
      lines: Cart.linesOf(payload),
      due: got.found ? Purchasing.formatTime(got.time, payload.unit) : '',
      meet: got.found ? Purchasing.formatTime(got.halfway, payload.unit) : '',
      placedOn: today(),
    };
    await game.sr3e.SR3EQuery.asGM('sr3e.orders.place', { order });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: buyer }),
      content: `<div class="sr-roll-card"><div class="sr-roll-result">📝 ${esc(buyer.name)} ordered ${esc(order.name)} —
        ${yen(order.price)} due at delivery${order.due ? ` in ${esc(order.due)}` : ''} (SR3 p.273). Nothing paid yet;
        the GM delivers it from 📦 Orders.</div></div>`,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
    });
    return true;
  }

  /** 📦 Deliver — GM: charge (warned if short) and create the items, then drop the order. */
  static async deliver(id, { ask = true } = {}) {
    if (!game.user.isGM) return false;
    const order = Orders.find(SR3EOrders.state(), 'order', id);
    if (!order) return false;
    const buyer = actorFrom(order.buyerId);
    if (!buyer) { ui.notifications.warn(`${order.buyerName ?? 'The buyer'} no longer exists — cancel the order instead.`); return false; }
    const st = Orders.settle(order.price, buyer.system?.nuyen);
    if (ask || st.short) {
      const ok = await foundry.applications.api.DialogV2.confirm({
        window: { title: `Deliver ${order.name}` },
        content: `<p>${esc(buyer.name)} pays <strong>${yen(st.price)}</strong> of ${yen(buyer.system?.nuyen)} and receives ${esc(order.name)}.</p>
          ${st.short ? '<p style="color:var(--sr-amber)">⚠ They cannot cover it — payment in full is expected at delivery (SR3 p.273). Deliver anyway? Nuyen stops at 0.</p>' : ''}`,
      });
      if (!ok) return false;
    }
    await SR3EOrders._write(s => Orders.remove(s, 'order', id));
    await game.sr3e.SR3EPurchase.receive(buyer, { ...order, buyerId: order.buyerId }, st.price, '📦 Delivered: ');
    return true;
  }

  /** ✕ Cancel — GM only (ruled 2026-11-07). The deal is off; nothing was paid. */
  static async cancel(id) {
    if (!game.user.isGM) return false;
    const order = Orders.find(SR3EOrders.state(), 'order', id);
    if (!order) return false;
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: `Cancel ${order.name}` },
      content: `<p>Cancel ${esc(order.buyerName)}'s order of ${esc(order.name)}?</p><p style="font-size:11px">${esc(Orders.CANCEL_NOTE)}</p>`,
    });
    if (!ok) return false;
    await SR3EOrders._write(s => Orders.remove(s, 'order', id));
    await ChatMessage.create({ content: `<div class="sr-roll-card"><div class="sr-roll-result">✕ ${esc(order.buyerName)}'s order of
      ${esc(order.name)} is off. ${esc(Orders.CANCEL_NOTE)}</div></div>`, style: CONST.CHAT_MESSAGE_STYLES.OTHER });
    return true;
  }

  /* ── recoveries ─────────────────────────────────────────────────────────────────────── */

  /** ⏳ Start recovery — from a healing card in session. `op` is the healing op ('lower' | 'eraseStun'). */
  static async startRecovery(patient, { kind, label, time }) {
    const s = patient.system?.wounds ?? {};
    const rec = {
      id: foundry.utils.randomID(), patientRef: actorRef(patient), patientName: patient.name, kind,
      label, time: time ?? '', startedOn: today(),
      from: Orders.snapshot({ physical: s.physical?.value, overflow: s.overflow?.value, stun: s.stun?.value }),
    };
    await game.sr3e.SR3EQuery.asGM('sr3e.orders.recover', { rec });
    return ChatMessage.create({ content: `<div class="sr-roll-card"><div class="sr-roll-result">⏳ ${esc(patient.name)}: ${esc(label)}
      ${rec.time ? ` — ${esc(rec.time)}` : ''}. In session this takes time; the GM marks it ✅ Recovered from 📦 Orders.</div></div>` });
  }

  static woundsNow(patient) {
    const w = patient?.system?.wounds ?? {};
    return Orders.snapshot({ physical: w.physical?.value, overflow: w.overflow?.value, stun: w.stun?.value });
  }

  /** ✅ Recovered — GM applies it against LIVE wounds; changed wounds are warned, never refused (Q10). */
  static async finishRecovery(id, { ask = true } = {}) {
    if (!game.user.isGM) return false;
    const rec = Orders.find(SR3EOrders.state(), 'recovery', id);
    if (!rec) return false;
    const patient = actorFrom(rec.patientRef);
    if (!patient) { await SR3EOrders._write(s => Orders.remove(s, 'recovery', id)); return false; }
    const moved = Orders.changed(rec, SR3EOrders.woundsNow(patient));
    if (ask || moved) {
      const ok = await foundry.applications.api.DialogV2.confirm({
        window: { title: `Recovered — ${patient.name}` },
        content: `<p>${esc(rec.label)}?</p>${moved ? '<p style="color:var(--sr-amber)">⚠ Wounds changed since it started — check before applying.</p>' : ''}`,
      });
      if (!ok) return false;
    }
    await SR3EOrders._write(s => Orders.remove(s, 'recovery', id));
    const r = await game.sr3e.SR3EHealing._applyOp(patient, { kind: rec.kind });
    const track = rec.kind === 'eraseStun' ? 'Stun' : 'Physical';
    return ChatMessage.create({ content: `<div class="sr-roll-card"><div class="sr-roll-result">✅ ${esc(patient.name)} recovered:
      ${track} ${r.before} → <strong>${r.after}</strong>.</div></div>` });
  }

  /** ✕ on a recovery — GM drops it, nothing applied. */
  static async dropRecovery(id) {
    if (!game.user.isGM) return false;
    await SR3EOrders._write(s => Orders.remove(s, 'recovery', id));
    return true;
  }

  /* ── the window ─────────────────────────────────────────────────────────────────────── */

  static open() {
    if (!SR3EOrders.instance || SR3EOrders.instance.rendered === false) SR3EOrders.instance = new SR3EOrders();
    SR3EOrders.instance.render(true);
    return SR3EOrders.instance;
  }

  async _renderHTML() {
    const div = document.createElement('div');
    div.style.cssText = 'flex:1;min-height:0;overflow:auto;padding:6px';
    div.innerHTML = SR3EOrders.html(SR3EOrders.state(), SR3EOrders.mode(), game.user.isGM);
    return div;
  }

  _replaceHTML(result, content) {
    content.replaceChildren(result);
    content.addEventListener('click', this._onClick ??= ev => {
      const b = ev.target.closest?.('[data-ord-act]');
      if (!b) return;
      ev.preventDefault();
      const { ordAct, id } = b.dataset;
      ({ deliver: () => SR3EOrders.deliver(id), cancel: () => SR3EOrders.cancel(id),
         recovered: () => SR3EOrders.finishRecovery(id), drop: () => SR3EOrders.dropRecovery(id),
         all: () => SR3EOrders.offerAll(), toggle: () => SR3EOrders.toggle() })[ordAct]?.();
    });
  }

  /** The window's markup. Static so the source-level test can read what it offers. */
  static html(state, mode, isGM) {
    const s = Orders.normalize(state);
    const btn = (act, id, label) => isGM ? `<button type="button" class="btn-sm" data-ord-act="${act}" data-id="${esc(id)}">${label}</button>` : '';
    const orders = s.orders.map(o => `<div class="sr-ord-row" style="border-bottom:1px solid var(--sr-border);padding:4px 0">
        📦 <strong>${esc(o.buyerName)}</strong>: ${esc(o.name)} — ${yen(o.price)}
        <div style="font-size:11px;color:var(--sr-muted)">ordered ${esc(o.placedOn)}${o.due ? ` · delivery in ${esc(o.due)}` : ''}${o.meet ? ` · meet at ${esc(o.meet)}` : ''}</div>
        ${btn('deliver', o.id, '📦 Deliver')} ${btn('cancel', o.id, '✕ Cancel')}</div>`).join('');
    const recs = s.recoveries.map(r => {
      const p = actorFrom(r.patientRef);
      const moved = p && Orders.changed(r, SR3EOrders.woundsNow(p));
      return `<div class="sr-ord-row" style="border-bottom:1px solid var(--sr-border);padding:4px 0">
        ⏳ <strong>${esc(r.patientName)}</strong>: ${esc(r.label)}
        <div style="font-size:11px;color:var(--sr-muted)">started ${esc(r.startedOn)}${r.time ? ` · ${esc(r.time)}` : ''}</div>
        ${moved ? '<div style="font-size:11px;color:var(--sr-amber)">⚠ Wounds changed since it started — check before applying.</div>' : ''}
        ${btn('recovered', r.id, '✅ Recovered')} ${btn('drop', r.id, '✕ Drop')}</div>`;
    }).join('');
    return `<div class="sr-roll-meta">${esc(Orders.modeLabel(mode))} ${isGM ? `<button type="button" class="btn-sm" data-ord-act="toggle">⏱ Switch</button>` : ''}</div>
      <h3>Orders</h3>${orders || '<p style="color:var(--sr-muted)">Nothing on order.</p>'}
      <h3>Recoveries</h3>${recs || '<p style="color:var(--sr-muted)">Nobody is recovering.</p>'}
      ${isGM && (s.orders.length || s.recoveries.length) ? `<p><button type="button" data-ord-act="all">📦 Deliver all / finish all…</button></p>` : ''}`;
  }

  /** The read-only "On order" list on a buyer's Gear tab. '' when nothing is on order. */
  static onOrderHtml(actor) {
    const mine = Orders.forBuyer(SR3EOrders.state(), [actor.id, actorRef(actor)]);
    if (!mine.length) return '';
    return `<div class="sr-on-order" style="margin:6px 0;padding:4px 6px;border:1px dashed var(--sr-border)">
      <div style="font-weight:bold">📦 On order</div>
      ${mine.map(o => `<div style="font-size:12px">${esc(o.name)} — ${yen(o.price)} due at delivery${o.due ? ` · ${esc(o.due)}` : ''} · ordered ${esc(o.placedOn)}</div>`).join('')}
    </div>`;
  }
}
