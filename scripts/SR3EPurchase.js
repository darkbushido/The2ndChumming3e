import { Purchasing } from './data/purchasing.mjs';

/**
 * Buying gear — the flow · *SR3 pp.272-273* (TODO 82).
 *
 * Rules: `scripts/data/purchasing.mjs`. This file is the dialogs, the rolls and the cards.
 *
 * The shape is the combat one, as the TODO asked: a dialog gathers the modifiers, a roll happens,
 * a chat card says what happened and the decision stays with the people at the table.
 *
 *   🛒 Buy gear…  →  pick the item and the contact, buy the TN down if you want
 *                 →  🎲 Etiquette vs Availability   (`rollThen` → `onSourced`)
 *                 →  a card: found in N days, the meet is at N/2, asking price
 *                 →  🤝 Negotiate  (a Success Contest, both sides)
 *                 →  a card with the final price and 💴 Pay & receive
 *
 * ⚠ **Nothing is applied until someone clicks.** The item is not created and the nuyen not
 * deducted until 💴 Pay & receive, exactly as damage is never auto-applied. A deal that falls
 * through — *"If the buyer cannot or will not pay the resulting price, the deal is off"* (p.273) —
 * is simply a card nobody presses.
 *
 * ⚠ **The Availability TN is EDITABLE.** p.272: *"This code is intended as a guideline for the
 * gamemaster, who should adjust the listed value based on the particular campaign and situation."*
 * So is every other number on the way through.
 *
 * ⚠ **The contact is a hint, not a gate.** The book names talismongers as poor for weapons and
 * leaves the rest to the GM, so an unsuitable contact is shown in amber and allowed.
 *
 * ⚠ **The payment goes through `actor.update` with a `ledgerReason`**, so TODO 79 records it —
 * a purchase is the single best reason to want a nuyen audit trail.
 */
export const SR3EPurchase = {
  /** Item types a character can shop for. Weapons and 'ware included — the GM decides who sources them. */
  BUYABLE: ['gear', 'ammunition', 'medical', 'drug', 'armor', 'firearm', 'melee', 'projectile',
    'thrown', 'cyberware', 'bioware', 'vehiclemod', 'cyberdeck', 'program', 'focus'],

  /** The buyer's Etiquette dice · p.272. Falls back to 0 so the dialog can say "no Etiquette". */
  etiquetteDice(actor) {
    const skill = (actor?.items ?? []).find(i => i.type === 'skill' && /^etiquette$/i.test(i.name));
    return Math.max(0, Number(skill?.system?.rating) || 0);
  },

  /** The buyer's Negotiation dice · p.273. */
  negotiationDice(actor) {
    const skill = (actor?.items ?? []).find(i => i.type === 'skill' && /^negotiat/i.test(i.name));
    return Math.max(0, Number(skill?.system?.rating) || 0);
  },

  /** The character's contacts, with what each is good for. */
  contacts(actor) {
    return (actor?.items ?? []).filter(i => i.type === 'contact').map(i => ({
      id: i.id, name: i.name,
      archetype:  String(i.system?.archetype ?? ''),
      connection: Math.max(1, Number(i.system?.connection) || 1),
      loyalty:    Math.max(1, Number(i.system?.loyalty) || 1),
    }));
  },

  /**
   * 🛒 Buy gear… — the opening dialog.
   * @param {Actor} actor the buyer
   * @param {Item}  [item] a specific item (from its row); otherwise the GM types the details
   */
  async open(actor, item = null) {
    if (!actor) return;
    const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    const avail = Purchasing.parseAvailability(item?.system?.availability ?? '');
    const index = Number(item?.system?.streetIndex) || 1;
    const cost  = Number(item?.system?.cost) || 0;
    const type  = item?.type ?? 'gear';

    const cons = SR3EPurchase.contacts(actor);
    const conOpts = cons.length
      ? cons.map(c => {
        const aff = Purchasing.affinity(c.archetype, type);
        const mark = aff.rating === 'good' ? ' ✓' : aff.rating === 'poor' ? ' ⚠' : '';
        return `<option value="${c.id}" data-affinity="${aff.rating}">${esc(c.name)}${c.archetype ? ` — ${esc(c.archetype)}` : ''} (Connection ${c.connection})${mark}</option>`;
      }).join('')
      : '<option value="">— no contacts on this character —</option>';

    const etiquette = SR3EPurchase.etiquetteDice(actor);

    let result = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: `${actor.name}: buy ${item ? item.name : 'gear'} (${Purchasing.PAGE})` },
      content: `
        <p style="font-size:11px;color:var(--sr-muted);margin:0 0 6px">
          An <strong>Etiquette Test</strong> against the item's Availability finds a source (SR3 p.272).
          Successes divide the base time. ${avail.always ? '<strong>This item is "Always" available — no test needed.</strong>' : ''}
          ${avail.unknown && !avail.always ? '<strong style="color:var(--sr-amber)">This item has no Availability code — the GM sets one.</strong>' : ''}
        </p>
        <label style="display:block;margin-bottom:6px">Item
          <input type="text" id="sr-buy-name" value="${esc(item?.name ?? '')}" style="width:100%"/>
        </label>
        <div style="display:flex;gap:6px;margin-bottom:6px">
          <label style="flex:1">Availability TN
            <input type="number" id="sr-buy-tn" value="${avail.tn || 4}" min="0" max="30" style="width:100%"/>
          </label>
          <label style="flex:1">Base time
            <input type="number" id="sr-buy-time" value="${avail.time || 1}" min="0" step="0.5" style="width:100%"/>
          </label>
          <label style="flex:1">Unit
            <select id="sr-buy-unit" style="width:100%">
              ${['hour', 'day', 'week', 'month'].map(u => `<option value="${u}"${(avail.unit || 'day') === u ? ' selected' : ''}>${u}s</option>`).join('')}
            </select>
          </label>
        </div>
        <div style="display:flex;gap:6px;margin-bottom:6px">
          <label style="flex:1">Base cost (¥)
            <input type="number" id="sr-buy-cost" value="${cost}" min="0" style="width:100%"/>
          </label>
          <label style="flex:1">Street Index
            <input type="number" id="sr-buy-index" value="${index}" min="0" step="0.1" style="width:100%"/>
          </label>
        </div>
        <label style="display:block;margin-bottom:6px">Contact
          <select id="sr-buy-contact" style="width:100%">${conOpts}</select>
        </label>
        <div id="sr-buy-affinity" style="font-size:11px;color:var(--sr-muted);margin-bottom:6px"></div>
        <label style="display:block;margin-bottom:6px">Etiquette dice
          <input type="number" id="sr-buy-dice" value="${etiquette}" min="0" max="50" style="width:60px"/>
          ${etiquette ? '' : '<span style="color:var(--sr-amber);font-size:11px"> — no Etiquette skill; the GM may allow a default</span>'}
        </label>
        <label style="display:block;margin-bottom:6px">
          Wait, to lower the target number by
          <input type="number" id="sr-buy-reduce" value="0" min="0" max="30" style="width:56px"/>
          <span style="font-size:11px;color:var(--sr-muted)">— costs ${Purchasing.REDUCTION.daysPerPoint} days
          and +${Purchasing.REDUCTION.streetIndexPerPoint} Street Index each (p.272)</span>
        </label>
        <div id="sr-buy-preview" style="font-size:11px;color:var(--sr-gold)"></div>`,
      buttons: [
        { label: 'Find a source', action: 'ok', default: true,
          callback: (_e, _b, dlg) => {
            const el = dlg.element;
            const n = id => Number(el.querySelector(id)?.value) || 0;
            result = {
              name: el.querySelector('#sr-buy-name')?.value || 'gear',
              tn: n('#sr-buy-tn'), time: n('#sr-buy-time'),
              unit: el.querySelector('#sr-buy-unit')?.value || 'day',
              cost: n('#sr-buy-cost'), index: n('#sr-buy-index') || 1,
              dice: n('#sr-buy-dice'), reduce: n('#sr-buy-reduce'),
              contactId: el.querySelector('#sr-buy-contact')?.value || '',
              itemUuid: item?.uuid ?? '',
            };
          } },
        { label: 'Cancel', action: 'cancel' },
      ],
      render: (_event, dialog) => {
        const el = dialog.element;
        const con = el.querySelector('#sr-buy-contact');
        const aff = el.querySelector('#sr-buy-affinity');
        const pre = el.querySelector('#sr-buy-preview');
        const sync = () => {
          const chosen = cons.find(c => c.id === con?.value);
          const a = chosen ? Purchasing.affinity(chosen.archetype, type) : { rating: 'unknown', note: '' };
          if (aff) {
            aff.textContent = a.rating === 'poor'
              ? `⚠ A ${chosen.archetype} is a poor source for this — ${a.note}. Allowed; the GM decides.`
              : a.rating === 'good' ? `✓ ${a.note}` : (a.note || 'No particular affinity either way.');
            aff.style.color = a.rating === 'poor' ? 'var(--sr-amber)' : 'var(--sr-muted)';
          }
          const n = id => Number(el.querySelector(id)?.value) || 0;
          const cut = Purchasing.reduceAvailability({ tn: n('#sr-buy-tn'), time: n('#sr-buy-time') },
            n('#sr-buy-index') || 1, n('#sr-buy-reduce'));
          const ask = Purchasing.askingPrice(n('#sr-buy-cost'), cut.streetIndex, { metatype: actor.system?.metatype });
          if (pre) {
            pre.textContent = `TN ${cut.tn} · base time ${Purchasing.formatTime(cut.baseTime, el.querySelector('#sr-buy-unit')?.value)}`
              + ` · Street Index ${cut.streetIndex} · asking ¥${ask.total.toLocaleString('en-US')}`
              + (ask.surcharge ? ` (includes +${Math.round(ask.surchargeRate * 100)}% ${actor.system?.metatype})` : '');
          }
        };
        con?.addEventListener('change', sync);
        for (const id of ['#sr-buy-tn', '#sr-buy-time', '#sr-buy-cost', '#sr-buy-index', '#sr-buy-reduce', '#sr-buy-unit']) {
          el.querySelector(id)?.addEventListener('input', sync);
          el.querySelector(id)?.addEventListener('change', sync);
        }
        sync();
      },
    });
    if (!result) return;

    const cut = Purchasing.reduceAvailability({ tn: result.tn, time: result.time }, result.index, result.reduce);
    const ctx = { ...result, ...cut, buyerId: actor.id };

    // ⚠ Through `rollThen`, so the 6s are a 💥 click and the result waits for them — Availability
    //   target numbers routinely exceed 6, which is exactly when explosions matter.
    await game.sr3e.SR3EActor.rollThen(actor, result.dice, Math.max(2, cut.tn),
      { label: `🛒 Etiquette — sourcing ${result.name}`, skipWoundMod: false,
        followUp: { kind: 'purchaseSourced', ctx } });
  },

  /** The Etiquette Test has resolved · p.272. */
  async onSourced(ctx, res) {
    const actor = game.actors.get(ctx.buyerId);
    if (!actor) return;
    const got = Purchasing.acquisitionTime(ctx.baseTime, res?.successes ?? 0);
    const ask = Purchasing.askingPrice(ctx.cost, ctx.streetIndex, { metatype: actor.system?.metatype });
    const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    if (!got.found) {
      // "the contact cannot (or will not) locate the item on the streets. This doesn't mean the
      //  search is over" — the character can wait it out, which is the reduce field, next time.
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<div class="sr-roll-card">
          <div class="sr-roll-header">🛒 No source — ${esc(ctx.name)}</div>
          <div class="sr-roll-meta">No successes: the contact cannot or will not find it (${Purchasing.PAGE}).</div>
          <div class="sr-roll-meta" style="color:var(--sr-muted);font-size:11px">
            The search is not over — putting the word out that time and nuyen are no object lowers the
            target number by 1 per ${Purchasing.REDUCTION.daysPerPoint} days and
            +${Purchasing.REDUCTION.streetIndexPerPoint} Street Index. Try again with the wait set higher.</div>
        </div>`,
        style: CONST.CHAT_MESSAGE_STYLES.OTHER,
      });
      return;
    }

    const payload = JSON.stringify({ ...ctx, price: ask.total, successes: res?.successes ?? 0 })
      .replace(/'/g, '&#39;');
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="sr-roll-card">
        <div class="sr-roll-header">🛒 Source found — ${esc(ctx.name)}</div>
        <div class="sr-roll-meta">${res?.successes} success${res?.successes === 1 ? '' : 'es'} ·
          delivery in <strong>${Purchasing.formatTime(got.time, ctx.unit)}</strong>
          (${Purchasing.formatTime(ctx.baseTime, ctx.unit)} ÷ ${res?.successes})</div>
        <div class="sr-roll-meta">The meet is halfway, at ${Purchasing.formatTime(got.halfway, ctx.unit)} —
          that is when the price is settled (SR3 p.272).</div>
        <div class="sr-roll-meta">Asking <strong>¥${ask.total.toLocaleString('en-US')}</strong>
          (¥${Number(ctx.cost).toLocaleString('en-US')} × Street Index ${ctx.streetIndex}${
            ask.surcharge ? `, +${Math.round(ask.surchargeRate * 100)}% ${esc(actor.system?.metatype)}` : ''})</div>
        <div class="sr-soak-action">
          <button class="sr-buy-negotiate-btn" data-payload='${payload}'>🤝 Negotiate the price</button>
          <button class="sr-buy-pay-btn" data-payload='${payload}'>💴 Pay ¥${ask.total.toLocaleString('en-US')} &amp; receive</button>
        </div>
      </div>`,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
    });
  },

  /** 🤝 — the Success Contest over price · p.273. Both sides roll; the GM sets the source's. */
  async negotiate(payload) {
    const actor = game.actors.get(payload?.buyerId);
    if (!actor) return;
    const mine = SR3EPurchase.negotiationDice(actor);

    let opts = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: `Negotiate — ${payload.name} (SR3 p.273)` },
      content: `
        <p style="font-size:11px;color:var(--sr-muted);margin:0 0 6px">
          A Success Contest: <strong>Negotiation against the other side's Intelligence</strong>.
          Each net success moves the price 5% (SR3 p.273).
        </p>
        <div style="display:flex;gap:6px">
          <label style="flex:1">Your Negotiation dice
            <input type="number" id="sr-neg-dice" value="${mine}" min="0" max="50" style="width:100%"/>
          </label>
          <label style="flex:1">vs their Intelligence
            <input type="number" id="sr-neg-tn" value="4" min="2" max="20" style="width:100%"/>
          </label>
        </div>
        <div style="display:flex;gap:6px;margin-top:6px">
          <label style="flex:1">Source's Negotiation dice
            <input type="number" id="sr-neg-them" value="4" min="0" max="50" style="width:100%"/>
          </label>
          <label style="flex:1">vs your Intelligence
            <input type="number" id="sr-neg-theirtn" value="${actor.system?.attributes?.intelligence?.value ?? 3}" min="2" max="20" style="width:100%"/>
          </label>
        </div>`,
      buttons: [
        { label: 'Haggle', action: 'ok', default: true,
          callback: (_e, _b, dlg) => {
            const el = dlg.element;
            const n = id => Number(el.querySelector(id)?.value) || 0;
            opts = { dice: n('#sr-neg-dice'), tn: n('#sr-neg-tn'), them: n('#sr-neg-them'), theirTn: n('#sr-neg-theirtn') };
          } },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    if (!opts) return;

    await game.sr3e.SR3EActor.rollOpposedPair('purchase',
      { ...payload, ...opts },
      // ⚠ `rollOpposedPair` takes each side as `{ actor, pool, tn, label, name? }` — an ACTOR, not an id. This
      // passed `actorId`, so the first roll threw "Cannot read properties of undefined (reading '_rollWave')".
      // The source is not an actor: the buyer's rolls its dice (any actor's `_rollWave` will do) and `name` labels it.
      { actor, pool: opts.dice, tn: Math.max(2, opts.tn), label: `🤝 ${actor.name} haggles` },
      { actor, pool: opts.them, tn: Math.max(2, opts.theirTn), label: '🤝 The source holds out', name: 'The source' });
  },

  /** Both haggles have landed (explosions included) · p.273. */
  async onNegotiated(ctx, atk, def) {
    const actor = game.actors.get(ctx.buyerId);
    if (!actor) return;
    const deal = Purchasing.negotiate(ctx.price, atk?.successes ?? 0, def?.successes ?? 0);
    const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const payload = JSON.stringify({ ...ctx, price: deal.price }).replace(/'/g, '&#39;');

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="sr-roll-card">
        <div class="sr-roll-header">🤝 ${esc(ctx.name)} — ${deal.net === 0 ? 'no movement'
          : deal.toBuyer ? `${Math.round(deal.percent * 100)}% off` : `${Math.round(deal.percent * 100)}% more`}</div>
        <div class="sr-roll-meta">${atk?.successes ?? 0} vs ${def?.successes ?? 0} —
          net ${deal.net} to the ${deal.toBuyer ? 'buyer' : deal.net === 0 ? 'nobody' : 'source'} (5% each, SR3 p.273)</div>
        <div class="sr-roll-meta">¥${Number(ctx.price).toLocaleString('en-US')} →
          <strong>¥${deal.price.toLocaleString('en-US')}</strong></div>
        ${!deal.toBuyer && deal.net !== 0 ? `<div class="sr-roll-meta" style="color:var(--sr-muted);font-size:11px">
          The GM may instead demand the extra up front as a down payment (p.273).</div>` : ''}
        <div class="sr-soak-action">
          <button class="sr-buy-pay-btn" data-payload='${payload}'>💴 Pay ¥${deal.price.toLocaleString('en-US')} &amp; receive</button>
        </div>
        <div class="sr-roll-meta" style="color:var(--sr-muted);font-size:11px">
          If the buyer will not pay, the deal is simply off — press nothing (p.273).</div>
      </div>`,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
    });
  },

  /**
   * 💴 — pay and take delivery. The ONLY place anything is written.
   * ⚠ Through `actor.update` with a `ledgerReason`, so TODO 79 records the purchase.
   */
  async pay(payload) {
    const actor = game.actors.get(payload?.buyerId);
    if (!actor) return;
    const price = Math.max(0, Number(payload.price) || 0);
    const have  = Number(actor.system?.nuyen) || 0;

    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: `Pay for ${payload.name}` },
      content: `<p>Deduct <strong>¥${price.toLocaleString('en-US')}</strong> from
        ${actor.name}'s ¥${have.toLocaleString('en-US')}?</p>
        ${price > have ? '<p style="color:var(--sr-red)">They cannot cover it — the deal is off unless the GM says otherwise (p.273).</p>' : ''}
        ${payload.itemUuid ? '<p style="font-size:11px;color:var(--sr-muted)">A copy of the item will be added to the sheet.</p>' : ''}`,
    });
    if (!ok) return;

    await actor.update({ 'system.nuyen': Math.max(0, have - price) },
      { ledgerReason: `Bought ${payload.name}` });

    let added = '';
    if (payload.itemUuid) {
      const src = await fromUuid(payload.itemUuid).catch(() => null);
      if (src) {
        const data = src.toObject();
        delete data._id;
        await actor.createEmbeddedDocuments('Item', [data]);
        added = ' and added to the sheet';
      }
    }
    const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="sr-roll-card"><div class="sr-roll-result">💴 ${esc(actor.name)} paid
        ¥${price.toLocaleString('en-US')} for ${esc(payload.name)}${added}.
        Nuyen ¥${have.toLocaleString('en-US')} → ¥${Math.max(0, have - price).toLocaleString('en-US')}.</div></div>`,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
    });
  },
};
