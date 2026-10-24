import { Purchasing } from './data/purchasing.mjs';
import { GearSearch } from './data/gear-search.mjs';
import { ModRatings } from './data/mod-ratings.mjs';

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

  /**
   * The compendiums a character can shop in: Item packs that hold a buyable type, and that the GM's
   * source-book filter lets through (TODO 154). ⚠ Presentation only, like everywhere else the filter
   * is used: a book switched off hides its gear from the search and warns on a drop from it, and
   * nothing is unloaded.
   */
  gearPacks() {
    const sysId = game.system.id;
    return (game.packs?.contents ?? [...(game.packs ?? [])]).filter(p => {
      if (p.documentName !== 'Item') return false;
      const types = p.metadata?.flags?.[sysId]?.itemTypes;
      if (!Array.isArray(types) || !types.some(t => SR3EPurchase.BUYABLE.includes(t))) return false;
      return game.sr3e?.SR3ESourceBooks?.packAllowed(p) ?? true;
    });
  },

  /** Every buyable item's index row from the allowed gear packs — indexes, never full documents. */
  async loadGearIndex() {
    const out = [];
    for (const pack of SR3EPurchase.gearPacks()) {
      try {
        const idx = await pack.getIndex({ fields: GearSearch.INDEX_FIELDS });
        for (const row of idx) out.push(GearSearch.fromIndex(row, pack));
      } catch (err) { console.warn(`SR3E | Could not index pack ${pack.collection}:`, err); }
    }
    return out.filter(e => GearSearch.isBuyable(e.type, SR3EPurchase.BUYABLE));
  },

  /**
   * An item dropped on the dialog → the fields it fills in, or null (a non-Item drop, with a warning).
   * The search respects the book filter; a DROP only warns about a switched-off book or a non-buyable type
   * and still fills (ruled 2026-10-17).
   */
  async resolveDrop(data) {
    const drop = GearSearch.parseDrop(data);
    if (!drop.ok) { ui.notifications.warn(drop.why); return null; }
    const dropped = await fromUuid(drop.uuid).catch(() => null);
    if (!dropped || dropped.documentName !== 'Item') { ui.notifications.warn('That is not an item this dialog can find.'); return null; }
    const pack = dropped.pack ? game.packs.get(dropped.pack) : null;
    // Ruled 2026-10-17: a switched-off book or a non-buyable type WARNS and still fills the form.
    const packAllowed = !pack || (game.sr3e?.SR3ESourceBooks?.packAllowed(pack) ?? true);
    for (const w of GearSearch.dropWarnings({ name: dropped.name, type: dropped.type, packAllowed }, SR3EPurchase.BUYABLE)) ui.notifications.warn(w);
    // ⚠ The plain name — no "[N]" (TODO 261). The dialog offers the item's levels when the table has them.
    const entry = { ...GearSearch.fields(dropped), name: dropped.name, type: dropped.type, uuid: dropped.uuid,
      levels: ModRatings.levelsOf(dropped), rating: Number(dropped.system?.rating) || null };
    return GearSearch.atLevel(entry, GearSearch.startLevel(entry));
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
    let   type  = item?.type ?? 'gear';   // a search hit or a drop changes it
    let   picked = null;                  // the item the search or a drop chose, over the row's
    // A rated item is one document with its levels in a table (TODO 261): bought at a level, default the lowest.
    const rowEntry = item ? { ...GearSearch.fields(item), levels: ModRatings.levelsOf(item), rating: Number(item.system?.rating) || null } : null;
    let   levelEntry = rowEntry?.levels ? rowEntry : null;
    let   level = levelEntry ? GearSearch.startLevel(levelEntry) : null;
    const levelOptions = e => Object.keys(e?.levels ?? {}).map(Number).sort((a, b) => a - b)
      .map(l => `<option value="${l}"${l === level ? ' selected' : ''}>${l}</option>`).join('');

    const cons = SR3EPurchase.contacts(actor);
    const conOpts = cons.length
      ? cons.map(c => {
        const aff = Purchasing.affinity(c.archetype, type);
        const mark = aff.rating === 'good' ? ' ✓' : aff.rating === 'poor' ? ' ⚠' : '';
        return `<option value="${c.id}" data-affinity="${aff.rating}">${esc(c.name)}${c.archetype ? ` — ${esc(c.archetype)}` : ''} (Connection ${c.connection})${mark}</option>`;
      }).join('')
      : '<option value="">— no contacts on this character —</option>';

    const etiquette = SR3EPurchase.etiquetteDice(actor);

    // An empty medkit is refilled here, by buying Medkit Supplies (TODO 139, SR3 p.304) — never from the healing card.
    const H = game.sr3e.SR3EHealing;
    const empty = item ? [] : H.emptyMedkits(actor.items);
    const supplies = H.MEDKIT_SUPPLIES;
    const suppliesAvail = Purchasing.parseAvailability(supplies.availability);

    const availNote = (always, unknown) => (always ? '<strong>This item is "Always" available — no test needed.</strong>'
      : unknown ? '<strong style="color:var(--sr-amber)">This item has no Availability code — the GM sets one.</strong>' : '');

    let result = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: `${actor.name}: buy ${item ? item.name : 'gear'} (${Purchasing.PAGE})` },
      content: `
        <p style="font-size:11px;color:var(--sr-muted);margin:0 0 6px">
          An <strong>Etiquette Test</strong> against the item's Availability finds a source (SR3 p.272).
          Successes divide the base time. <span id="sr-buy-avail-note">${availNote(avail.always, avail.unknown && !avail.always)}</span>
        </p>
        ${empty.length ? `<p style="font-size:11px;color:var(--sr-amber);margin:0 0 6px">
          🧰 Out of supplies: ${empty.map(i => esc(i.name)).join(', ')}.
          <button type="button" id="sr-buy-supplies" class="btn-sm">Buy ${esc(supplies.name)}</button></p>` : ''}
        <label id="sr-buy-level-row" style="display:${levelEntry ? 'block' : 'none'};margin-bottom:6px">Level
          <select id="sr-buy-level" style="width:80px">${levelEntry ? levelOptions(levelEntry) : ''}</select>
          <span style="font-size:11px;color:var(--sr-muted)"> — each level has its own price and availability</span>
        </label>
        <div id="sr-buy-find" style="margin-bottom:6px">
          <label style="display:block">🔎 Search the gear compendiums
            <input type="text" id="sr-buy-search" placeholder="e.g. Ares Predator, medkit, flak jacket…" autocomplete="off" style="width:100%"/>
          </label>
          <div id="sr-buy-hits" style="max-height:140px;overflow-y:auto;font-size:12px"></div>
          <div style="font-size:11px;color:var(--sr-muted)">…or drag an item from a compendium onto this window.</div>
        </div>
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
              itemUuid: picked?.uuid || item?.uuid || '',
              level: el.querySelector('#sr-buy-level-row')?.style.display === 'none' ? null : (Number(el.querySelector('#sr-buy-level')?.value) || null),
            };
            if (result.level && !/\]\s*$/.test(result.name)) result.name = `${result.name} [${result.level}]`;
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
        // ── Find the item: search the allowed gear packs' indexes, or drop one (TODO 154) ──
        const set = (id, v) => { const f = el.querySelector(id); if (f) f.value = v; };
        const levelRow = el.querySelector('#sr-buy-level-row');
        const levelSel = el.querySelector('#sr-buy-level');
        const showLevels = f => {
          levelEntry = f?.levels ? f : null;
          level = levelEntry ? (f.level ?? GearSearch.startLevel(levelEntry)) : null;
          if (levelRow) levelRow.style.display = levelEntry ? 'block' : 'none';
          if (levelSel) levelSel.innerHTML = levelEntry ? levelOptions(levelEntry) : '';
        };
        const take = f => {
          picked = f; type = f.type;
          showLevels(f);
          set('#sr-buy-name', f.name); set('#sr-buy-tn', f.tn); set('#sr-buy-time', f.time);
          set('#sr-buy-unit', f.unit); set('#sr-buy-cost', f.cost); set('#sr-buy-index', f.index);
          const note = el.querySelector('#sr-buy-avail-note');
          if (note) note.innerHTML = availNote(f.always, f.unknown);
          sync();   // re-reads the contact's affinity for the new type
        };
        const search = el.querySelector('#sr-buy-search');
        const hitsEl = el.querySelector('#sr-buy-hits');
        let gearIndex = null;   // a promise, started on the first keystroke
        let hits = [];
        const drawHits = async () => {
          const q = search?.value ?? '';
          if (!GearSearch.tokens(q).length) { hits = []; hitsEl.innerHTML = ''; return; }
          if (!gearIndex) hitsEl.textContent = 'Reading the compendiums…';
          gearIndex ??= SR3EPurchase.loadGearIndex();   // one load, shared by every keystroke
          const index = await gearIndex;
          if ((search?.value ?? '') !== q) return;   // typed on while the index loaded
          hits = GearSearch.search(index, q, { types: SR3EPurchase.BUYABLE });
          hitsEl.innerHTML = hits.length
            ? hits.map((h, i) => `<button type="button" class="sr-buy-hit" data-i="${i}" style="display:block;width:100%;text-align:left;margin:1px 0">
                ${esc(h.name)} <span style="color:var(--sr-muted)">· ${esc(h.type)}${h.availability ? ` · ${esc(h.availability)}` : ''}${h.bookPage ? ` · ${esc(h.bookPage)}` : ''}</span></button>`).join('')
            : '<em style="color:var(--sr-muted)">Nothing in the allowed books matches.</em>';
        };
        search?.addEventListener('input', drawHits);
        // Enter in the filter must not press the dialog's default button (Find a source) — it takes the top hit.
        search?.addEventListener('keydown', ev => {
          if (ev.key !== 'Enter') return;
          ev.preventDefault();
          if (hits[0]) take(GearSearch.atLevel(hits[0], GearSearch.startLevel(hits[0])));
        });
        hitsEl?.addEventListener('click', ev => {
          ev.preventDefault();
          const h = hits[Number(ev.target.closest?.('.sr-buy-hit')?.dataset.i)];
          if (h) take(GearSearch.atLevel(h, GearSearch.startLevel(h)));
        });
        el.addEventListener('dragover', ev => ev.preventDefault());
        el.addEventListener('drop', async ev => {
          ev.preventDefault();
          ev.stopPropagation();
          const f = await SR3EPurchase.resolveDrop(foundry.applications.ux.TextEditor.implementation.getDragEventData(ev));
          if (f) take(f);
        });

        con?.addEventListener('change', sync);
        // Picking a level brings that level's price, availability and Street Index (TODO 261).
        levelSel?.addEventListener('change', () => {
          if (!levelEntry) return;
          level = Number(levelSel.value) || null;
          const f = GearSearch.atLevel(levelEntry, level);
          set('#sr-buy-tn', f.tn); set('#sr-buy-time', f.time); set('#sr-buy-unit', f.unit);
          set('#sr-buy-cost', f.cost); set('#sr-buy-index', f.index);
          const note = el.querySelector('#sr-buy-avail-note');
          if (note) note.innerHTML = availNote(f.always, f.unknown);
          sync();
        });
        el.querySelector('#sr-buy-supplies')?.addEventListener('click', ev => {
          ev.preventDefault();
          picked = null;   // supplies refill a medkit; they are not a catalogue item
          showLevels(null);
          set('#sr-buy-name', supplies.name);
          set('#sr-buy-tn', suppliesAvail.tn);
          set('#sr-buy-time', suppliesAvail.time);
          set('#sr-buy-unit', suppliesAvail.unit);
          set('#sr-buy-cost', supplies.cost);
          set('#sr-buy-index', supplies.streetIndex);
          sync();
        });
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
    // Medkit Supplies refill the first empty medkit rather than landing on the sheet (TODO 139, SR3 p.304).
    const H = game.sr3e.SR3EHealing;
    const refill = H.isMedkitSupplies(payload.name) ? H.emptyMedkits(actor.items)[0] : null;
    if (refill) {
      await refill.unsetFlag('The2ndChumming3e', 'suppliesOut');
      added = ` — ${refill.name} is restocked`;
    } else if (payload.itemUuid) {
      const src = await fromUuid(payload.itemUuid).catch(() => null);
      if (src) {
        let data = src.toObject();
        delete data._id;
        // The picked level's rating and printed numbers; the price paid is the deal's, not the table's.
        if (payload.level) data = ModRatings.withLevel(data, payload.level);
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
