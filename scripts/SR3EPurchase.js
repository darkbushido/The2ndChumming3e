import { Purchasing } from './data/purchasing.mjs';
import { GearSearch } from './data/gear-search.mjs';
import { actorFrom } from './data/actor-ref.mjs';
import { ModRatings } from './data/mod-ratings.mjs';
import { Legality } from './data/legality.mjs';
import { AmmoShop } from './data/ammo-shop.mjs';
import { MiniGrenade } from './data/mini-grenade.mjs';
import { Cart } from './data/cart.mjs';
import { Orders } from './data/orders.mjs';

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

  /** Is this book on? A level printed only in a switched-off book is not offered (Gas Vent IV, CC p.35 — 2026-10-27). */
  bookAllowed(code) {
    return game.sr3e?.SR3ESourceBooks?.optionalRuleAllowed?.(code) ?? true;
  },

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
        for (const row of idx) out.push(GearSearch.fromIndex(row, pack, { bookAllowed: SR3EPurchase.bookAllowed }));
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
      levels: ModRatings.levelsFor(dropped, SR3EPurchase.bookAllowed), levelUnit: ModRatings.unitOf(dropped), rating: Number(dropped.system?.rating) || null,
      // What a gun's 🛒 Buy ammo checks the drop against (`AmmoShop.dropWarning`) — the search's index carries the same.
      ammo: dropped.type === 'ammunition' ? { ...dropped.system } : null };
    return { ...GearSearch.atLevel(entry, GearSearch.startLevel(entry)), ammo: entry.ammo };
  },

  /**
   * What a gun loads, for 🛒 Buy ammo (`AmmoShop.criteria`) — read off the item exactly as `reload()` reads it.
   */
  ammoCriteria(gun) {
    const firearm = gun?.type === 'firearm';
    return AmmoShop.criteria({
      system: gun?.system ?? {},
      name: gun?.name ?? '',
      mech: gun?._weaponLoadMechanism?.() ?? '',
      magSize: gun?._weaponMagazineSize?.() ?? 0,
      launcher: firearm && MiniGrenade.isLauncher(gun.system),
      accepts: t => game.sr3e.SR3EItem.weaponAcceptsAmmoType(gun?.system ?? {}, t),
      firearm,
    });
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
   * @param {{forWeapon?: Item}} [opts] `forWeapon` — 🛒 Buy ammo from a gun's sheet (2026-10-25): the search lists only
   *   the ammunition that gun loads (`AmmoShop.fits`, the rule `reload()` uses) and the box bought is stamped with
   *   the gun's class
   */
  async open(actor, item = null, { forWeapon = null } = {}) {
    if (!actor) return;
    const gun = forWeapon;
    const crit = gun ? SR3EPurchase.ammoCriteria(gun) : null;
    const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    const avail = Purchasing.parseAvailability(item?.system?.availability ?? '');
    const index = Number(item?.system?.streetIndex) || 1;
    const cost  = Number(item?.system?.cost) || 0;
    let   type  = item?.type ?? 'gear';   // a search hit or a drop changes it
    let   picked = null;                  // the item the search or a drop chose, over the row's
    let   misfit = false;                 // a drop on a gun's 🛒 Buy ammo that the gun cannot load — not stamped
    // A rated item is one document with its levels in a table (TODO 261): bought at a level, default the lowest.
    const rowEntry = item ? { ...GearSearch.fields(item), levels: ModRatings.levelsFor(item, SR3EPurchase.bookAllowed), levelUnit: ModRatings.unitOf(item), rating: Number(item.system?.rating) || null } : null;
    let   levelEntry = rowEntry?.levels ? rowEntry : null;
    let   level = levelEntry ? GearSearch.startLevel(levelEntry) : null;
    // Legal gear needs no contact (SR3 p.273): the dialog opens on "at the store" for a Legal or "Always" item, and
    // through a contact otherwise — either way both are offered (reported 2026-10-25; warn, never refuse).
    const startLegal = rowEntry ? (Legality.of(item) || '') : '';
    let   storeMode = Legality.storeByDefault(startLegal) || avail.always;
    let   howTouched = false;   // once the buyer picks, a search or a drop no longer flips it
    const levelOptions = e => Object.keys(e?.levels ?? {}).map(Number).sort((a, b) => a - b)
      .map(l => `<option value="${l}"${l === level ? ' selected' : ''}>${l}${e?.levelUnit ? ` ${e.levelUnit}` : ''}</option>`).join('');

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

    // The cart (TODO 285): lines added with ➕, each { name, cost (of ONE), quantity, index, tn, time, unit, … }.
    const cart = [];
    const readLine = el => {
      const n = id => Number(el.querySelector(id)?.value) || 0;
      const lvl = el.querySelector('#sr-buy-level-row')?.style.display === 'none' ? null : (Number(el.querySelector('#sr-buy-level')?.value) || null);
      let name = el.querySelector('#sr-buy-name')?.value?.trim() || 'gear';
      if (lvl && !/\]\s*$/.test(name)) name = `${name} [${lvl}]`;
      return { name, cost: n('#sr-buy-cost'), quantity: Cart.qty(n('#sr-buy-qty')), index: n('#sr-buy-index') || 1,
        tn: n('#sr-buy-tn'), time: n('#sr-buy-time'), unit: el.querySelector('#sr-buy-unit')?.value || 'day',
        itemUuid: picked?.uuid || item?.uuid || '', level: lvl, gunClass: crit && !misfit ? crit.gunClass : '',
        legality: el.querySelector('#sr-buy-legality')?.value?.trim() ?? '' };
    };

    let result = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: `${actor.name}: buy ${gun ? `ammunition for ${gun.name}` : item ? item.name : 'gear'} (${Purchasing.PAGE})` },
      content: `
        <div style="display:flex;flex-direction:column;gap:2px;margin-bottom:6px;font-size:12px">
          <label><input type="radio" name="sr-buy-how" value="store"${storeMode ? ' checked' : ''}/>
            🏪 <strong>At the store</strong> — list price, no roll, no contact (SR3 p.273)</label>
          <label><input type="radio" name="sr-buy-how" value="contact"${storeMode ? '' : ' checked'}/>
            🤝 <strong>Through a contact</strong> — Etiquette vs Availability, Street Index, and a haggle for a discount (pp.272-273)</label>
        </div>
        <label style="display:block;margin-bottom:2px">Legality
          <input type="text" id="sr-buy-legality" value="${esc(startLegal)}" placeholder="—" style="width:110px"/>
        </label>
        <div id="sr-buy-legal-note" style="font-size:11px;color:var(--sr-muted);margin-bottom:6px"></div>
        <p class="sr-buy-contact-only" style="font-size:11px;color:var(--sr-muted);margin:0 0 6px">
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
        ${crit ? `<p id="sr-buy-forgun" style="font-size:12px;margin:0 0 6px">${esc(AmmoShop.describe(gun.name, crit))}
          <span style="color:var(--sr-muted);font-size:11px">— only what it loads is listed; the box is stamped for it.</span></p>` : ''}
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
        <div class="sr-buy-contact-only" style="display:flex;gap:6px;margin-bottom:6px">
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
          <label style="flex:0 0 70px">Quantity
            <input type="number" id="sr-buy-qty" value="1" min="1" max="${Cart.MAX_QUANTITY}" style="width:100%"/>
          </label>
          <label class="sr-buy-contact-only" style="flex:1">Street Index
            <input type="number" id="sr-buy-index" value="${index}" min="0" step="0.1" style="width:100%"/>
          </label>
        </div>
        <div style="margin-bottom:6px">
          <button type="button" id="sr-buy-add" class="btn-sm">➕ Add to cart</button>
          <span style="font-size:11px;color:var(--sr-muted)"> — gather several items for one card and one 💴 Pay (TODO 285)</span>
          <div id="sr-buy-cart" style="font-size:12px"></div>
        </div>
        <div class="sr-buy-mode" style="font-size:11px;color:var(--sr-muted);margin-bottom:6px">${Orders.modeLabel(game.sr3e.SR3EOrders.mode())}
          — a store sale is instant either way (TODO 288).</div>
        <div class="sr-buy-contact-only">
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
        </div>
        <div id="sr-buy-preview" style="font-size:11px;color:var(--sr-gold)"></div>`,
      buttons: [
        { label: storeMode ? 'Buy at the store' : 'Find a source', action: 'ok', default: true,
          callback: (_e, _b, dlg) => {
            const el = dlg.element;
            const n = id => Number(el.querySelector(id)?.value) || 0;
            const here = readLine(el);
            // The form's own item joins the cart when it is named (or when it is the only thing being bought).
            const lines = [...cart, ...(here.name !== 'gear' || !cart.length ? [here] : [])];
            result = {
              lines,
              name: el.querySelector('#sr-buy-name')?.value || 'gear',
              tn: n('#sr-buy-tn'), time: n('#sr-buy-time'),
              unit: el.querySelector('#sr-buy-unit')?.value || 'day',
              cost: n('#sr-buy-cost'), index: n('#sr-buy-index') || 1,
              dice: n('#sr-buy-dice'), reduce: n('#sr-buy-reduce'),
              contactId: el.querySelector('#sr-buy-contact')?.value || '',
              itemUuid: picked?.uuid || item?.uuid || '',
              level: el.querySelector('#sr-buy-level-row')?.style.display === 'none' ? null : (Number(el.querySelector('#sr-buy-level')?.value) || null),
              how: storeMode ? 'store' : 'contact',
              legality: el.querySelector('#sr-buy-legality')?.value?.trim() ?? '',
              // stamped on the box (`AmmoShop.stamp`) — bought from the gun, unless a drop it cannot load
              gunClass: crit && !misfit ? crit.gunClass : '',
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
        const legalIn = el.querySelector('#sr-buy-legality');
        const legalNote = el.querySelector('#sr-buy-legal-note');
        const okBtn = el.querySelector('button[data-action="ok"]');
        const cartEl = el.querySelector('#sr-buy-cart');
        const showHow = () => {
          for (const x of el.querySelectorAll('.sr-buy-contact-only')) x.style.display = storeMode ? 'none' : '';
          for (const r of el.querySelectorAll('input[name="sr-buy-how"]')) r.checked = r.value === (storeMode ? 'store' : 'contact');
          if (okBtn) okBtn.textContent = storeMode ? 'Buy at the store' : 'Find a source';
        };
        const sync = () => {
          if (legalNote) {
            const k = Legality.classify(legalIn?.value);
            legalNote.textContent = Legality.note(legalIn?.value);
            // Warn, never refuse: a restricted item can still be bought at the store — the GM rules on the permit.
            legalNote.style.color = storeMode && k.status !== 'legal' ? 'var(--sr-amber)' : 'var(--sr-muted)';
          }
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
          const lot = [...cart, readLine(el)];
          const slow = Cart.slowest(lot);
          const lotCut = Purchasing.reduceAvailability(slow, 1, n('#sr-buy-reduce'));
          const ask = Cart.askingPrice(lot, { reduce: n('#sr-buy-reduce'), metatype: actor.system?.metatype });
          if (cartEl) {
            cartEl.innerHTML = cart.map((l, i) => `<div>🛒 ${esc(Cart.label(l.name, l.quantity))} · ¥${(l.cost * l.quantity).toLocaleString('en-US')}
              <a class="sr-buy-cart-x" data-i="${i}" title="Remove">✕</a></div>`).join('')
              + (cart.length ? '<div style="color:var(--sr-muted);font-size:11px">…plus the item in the form, if named. Through a contact: one Etiquette Test against the slowest item.</div>' : '');
          }
          if (pre && storeMode) {
            const list = Cart.storePrice(lot, { metatype: actor.system?.metatype });
            pre.textContent = `List price ¥${list.total.toLocaleString('en-US')}`
              + (list.surcharge ? ` (includes +${Math.round(list.surchargeRate * 100)}% ${actor.system?.metatype})` : '')
              + ' · paid in full at delivery (p.273)';
          } else if (pre) {
            pre.textContent = `TN ${lotCut.tn} · base time ${Purchasing.formatTime(lotCut.baseTime, slow.unit)}`
              + (cart.length ? '' : ` · Street Index ${cut.streetIndex}`) + ` · asking ¥${ask.total.toLocaleString('en-US')}`
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
          picked = f; type = f.type; misfit = false;   // a drop re-checks after this
          showLevels(f);
          if (legalIn) legalIn.value = f.legality ?? '';
          if (!howTouched) { storeMode = Legality.storeByDefault(f.legality) || !!f.always; showHow(); }
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
          // For a gun, the list shows at once — everything it loads — and typing narrows it.
          if (!crit && !GearSearch.tokens(q).length) { hits = []; hitsEl.innerHTML = ''; return; }
          if (!gearIndex) hitsEl.textContent = 'Reading the compendiums…';
          gearIndex ??= SR3EPurchase.loadGearIndex();   // one load, shared by every keystroke
          const all = await gearIndex;
          if ((search?.value ?? '') !== q) return;   // typed on while the index loaded
          const index = crit ? all.filter(e => e.type === 'ammunition' && AmmoShop.fits(e.ammo ?? {}, crit, e.name)) : all;
          hits = crit && !GearSearch.tokens(q).length
            ? [...index].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
            : GearSearch.search(index, q, { types: SR3EPurchase.BUYABLE });
          hitsEl.innerHTML = hits.length
            ? hits.map((h, i) => `<button type="button" class="sr-buy-hit" data-i="${i}" style="display:block;width:100%;text-align:left;margin:1px 0">
                ${esc(h.name)} <span style="color:var(--sr-muted)">· ${esc(h.type)}${h.availability ? ` · ${esc(h.availability)}` : ''}${h.bookPage ? ` · ${esc(h.bookPage)}` : ''}</span></button>`).join('')
            : `<em style="color:var(--sr-muted)">${crit ? `Nothing in the allowed books loads into ${esc(gun.name)}${GearSearch.tokens(q).length ? ' and matches' : ''}.` : 'Nothing in the allowed books matches.'}</em>`;
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
          if (!f) return;
          take(f);
          const warn = crit && f.type === 'ammunition' ? AmmoShop.dropWarning(f.ammo, crit, f.name, gun.name) : null;
          misfit = !!warn;
          if (warn) ui.notifications.warn(warn);
        });

        con?.addEventListener('change', sync);
        el.querySelector('#sr-buy-add')?.addEventListener('click', ev => {
          ev.preventDefault();
          const l = readLine(el);
          if (l.name === 'gear' && !l.cost) { ui.notifications.warn('Pick or name an item first.'); return; }
          cart.push(l);
          picked = null; showLevels(null);
          set('#sr-buy-name', ''); set('#sr-buy-qty', 1); set('#sr-buy-cost', 0);
          sync();
        });
        cartEl?.addEventListener('click', ev => {
          const x = ev.target.closest?.('.sr-buy-cart-x');
          if (!x) return;
          ev.preventDefault();
          cart.splice(Number(x.dataset.i), 1);
          sync();
        });
        // Picking a level brings that level's price, availability and Street Index (TODO 261).
        levelSel?.addEventListener('change', () => {
          if (!levelEntry) return;
          level = Number(levelSel.value) || null;
          const f = GearSearch.atLevel(levelEntry, level);
          set('#sr-buy-tn', f.tn); set('#sr-buy-time', f.time); set('#sr-buy-unit', f.unit);
          set('#sr-buy-cost', f.cost); set('#sr-buy-index', f.index);
          if (legalIn && f.legality) legalIn.value = f.legality;   // a level can carry its own code
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
        for (const r of el.querySelectorAll('input[name="sr-buy-how"]')) {
          r.addEventListener('change', () => { storeMode = r.value === 'store' && r.checked; howTouched = true; showHow(); sync(); });
        }
        for (const id of ['#sr-buy-qty', '#sr-buy-name', '#sr-buy-tn', '#sr-buy-time', '#sr-buy-cost', '#sr-buy-index', '#sr-buy-reduce', '#sr-buy-unit', '#sr-buy-legality']) {
          el.querySelector(id)?.addEventListener('input', sync);
          el.querySelector(id)?.addEventListener('change', sync);
        }
        showHow();
        sync();
        if (crit) drawHits();   // a gun's ammunition is listed straight away
      },
    });
    if (!result) return;

    // 🏪 At the store (SR3 p.273): no roll — straight to a card with the list price and 💴 Pay.
    if (result.how === 'store') return SR3EPurchase.atStore(actor, result);

    // One Etiquette Test against the slowest item in the lot (ruled 2026-11-07, TODO 285).
    const slow = Cart.slowest(result.lines);
    const cut = Purchasing.reduceAvailability(slow, 1, result.reduce);
    const name = Cart.summary(result.lines);
    const ctx = { ...result, ...cut, unit: slow.unit, name, buyerId: actor.id };

    // ⚠ Through `rollThen`, so the 6s are a 💥 click and the result waits for them — Availability
    //   target numbers routinely exceed 6, which is exactly when explosions matter.
    await game.sr3e.SR3EActor.rollThen(actor, result.dice, Math.max(2, cut.tn),
      { label: `🛒 Etiquette — sourcing ${name}`, skipWoundMod: false,
        followUp: { kind: 'purchaseSourced', ctx } });
  },

  /**
   * 🏪 Bought at the store · SR3 p.273, Making Legal Purchases: the list price (no Street Index), no Etiquette Test,
   * no contact, *"Payment in full is expected at delivery"*, and the purchase is on record. A card with 💴 Pay —
   * nothing is written until it is pressed, exactly like a contact's deal. A restricted item is allowed and said so.
   */
  async atStore(actor, result) {
    const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const lines = Cart.linesOf(result);
    const list = Cart.storePrice(lines, { metatype: actor.system?.metatype });
    const name = Cart.summary(lines);
    // The first restricted code in the lot is the one the card warns about (warn, never refuse).
    const legality = lines.map(l => l.legality).find(c => c && Legality.classify(c).status !== 'legal') ?? lines[0]?.legality ?? '';
    const k = Legality.classify(legality);
    const payload = JSON.stringify({ buyerId: actor.id, name, price: list.total, lines, store: true }).replace(/'/g, '&#39;');
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="sr-roll-card">
        <div class="sr-roll-header">🏪 At the store — ${esc(name)}</div>
        <div class="sr-roll-meta">List price <strong>¥${list.total.toLocaleString('en-US')}</strong>${
          list.surcharge ? ` (¥${list.base.toLocaleString('en-US')}, +${Math.round(list.surchargeRate * 100)}% ${esc(actor.system?.metatype)})` : ''}
          — no contact, no Etiquette Test, paid in full at delivery (${Legality.PAGE}).</div>
        <div class="sr-roll-meta"${k.status === 'legal' ? '' : ' style="color:var(--sr-amber)"'}>${esc(Legality.note(legality))}</div>
        <div class="sr-roll-meta" style="color:var(--sr-muted);font-size:11px">A legal purchase leaves a record — a credit
          trail, inventory, perhaps video — under the buyer's SIN (${Legality.PAGE}).</div>
        <div class="sr-soak-action">
          <button class="sr-buy-pay-btn" data-payload='${payload}'>💴 Pay ¥${list.total.toLocaleString('en-US')} &amp; receive</button>
        </div>
      </div>`,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
    });
  },

  /** The Etiquette Test has resolved · p.272. */
  async onSourced(ctx, res) {
    const actor = actorFrom(ctx.buyerId);
    if (!actor) return;
    const got = Purchasing.acquisitionTime(ctx.baseTime, res?.successes ?? 0);
    const lines = Cart.linesOf(ctx);
    const ask = Cart.askingPrice(lines, { reduce: ctx.reducedBy, metatype: actor.system?.metatype });
    const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const siOf = l => Math.round(((Number(l.index) || 1) + (ctx.reducedBy || 0) * Purchasing.REDUCTION.streetIndexPerPoint) * 10) / 10;
    const priced = lines.map(l => `${esc(Cart.label(l.name, l.quantity))} ¥${(Number(l.cost) * Cart.qty(l.quantity)).toLocaleString('en-US')} × Street Index ${siOf(l)}`).join('; ');

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

    const order = Orders.payMode(game.sr3e.SR3EOrders.mode(), { store: false }) === 'order';
    const payload = JSON.stringify({ ...ctx, price: ask.total, successes: res?.successes ?? 0, order })
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
          (${priced}${
            ask.surcharge ? `, +${Math.round(ask.surchargeRate * 100)}% ${esc(actor.system?.metatype)}` : ''})</div>
        <div class="sr-soak-action">
          <button class="sr-buy-negotiate-btn" data-payload='${payload}'>🤝 Negotiate the price</button>
          ${SR3EPurchase.moneyButton(payload, ask.total, order)}
        </div>
        <div class="sr-roll-meta" style="color:var(--sr-muted);font-size:11px">${Orders.modeLabel(game.sr3e.SR3EOrders.mode())}</div>
      </div>`,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
    });
  },

  /**
   * 🤝 — the Success Contest over price · p.273. Both sides roll; the GM sets the source's.
   * `claim` records the haggle on the card once the dialog is confirmed (false = someone got there first).
   * @returns {Promise<boolean>} false when nothing happened, so the button is handed back
   */
  async negotiate(payload, { claim = async () => true } = {}) {
    const actor = actorFrom(payload?.buyerId);
    if (!actor) return false;
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
    if (!opts) return false;
    if (!(await claim())) { ui.notifications.warn(`${payload.name}: the price has already been haggled.`); return false; }

    await game.sr3e.SR3EActor.rollOpposedPair('purchase',
      { ...payload, ...opts },
      // ⚠ `rollOpposedPair` takes each side as `{ actor, pool, tn, label, name? }` — an ACTOR, not an id. This
      // passed `actorId`, so the first roll threw "Cannot read properties of undefined (reading '_rollWave')".
      // The source is not an actor: the buyer's rolls its dice (any actor's `_rollWave` will do) and `name` labels it.
      { actor, pool: opts.dice, tn: Math.max(2, opts.tn), label: `🤝 ${actor.name} haggles` },
      { actor, pool: opts.them, tn: Math.max(2, opts.theirTn), label: '🤝 The source holds out', name: 'The source' });
    return true;
  },

  /** Both haggles have landed (explosions included) · p.273. */
  async onNegotiated(ctx, atk, def) {
    const actor = actorFrom(ctx.buyerId);
    if (!actor) return;
    // Each side arrives as its dice array (`postOpposedResult`), so count the successes — see `Purchasing.hits`.
    const mine = Purchasing.hits(atk), theirs = Purchasing.hits(def);
    const deal = Purchasing.negotiate(ctx.price, mine, theirs);
    const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const order = Orders.payMode(game.sr3e.SR3EOrders.mode(), { store: !!ctx.store }) === 'order';
    const payload = JSON.stringify({ ...ctx, price: deal.price, order }).replace(/'/g, '&#39;');

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="sr-roll-card">
        <div class="sr-roll-header">🤝 ${esc(ctx.name)} — ${deal.net === 0 ? 'no movement'
          : deal.toBuyer ? `${Math.round(deal.percent * 100)}% off` : `${Math.round(deal.percent * 100)}% more`}</div>
        <div class="sr-roll-meta">${mine} vs ${theirs} —
          net ${deal.net} to the ${deal.toBuyer ? 'buyer' : deal.net === 0 ? 'nobody' : 'source'} (5% each, SR3 p.273)</div>
        <div class="sr-roll-meta">¥${Number(ctx.price).toLocaleString('en-US')} →
          <strong>¥${deal.price.toLocaleString('en-US')}</strong></div>
        ${!deal.toBuyer && deal.net !== 0 ? `<div class="sr-roll-meta" style="color:var(--sr-muted);font-size:11px">
          The GM may instead demand the extra up front as a down payment (p.273).</div>` : ''}
        <div class="sr-soak-action">
          ${SR3EPurchase.moneyButton(payload, deal.price, order)}
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
   * ⚠ `claim` records the payment on the card AFTER the confirm and BEFORE anything is written, so a
   *   cancelled confirm leaves the card payable and a second client (the GM's) cannot pay it again.
   * @returns {Promise<boolean>} false when nothing was paid, so the button is handed back
   */
  async pay(payload, { claim = async () => true } = {}) {
    const actor = actorFrom(payload?.buyerId);
    if (!actor) return false;
    const price = Math.max(0, Number(payload.price) || 0);
    const have  = Number(actor.system?.nuyen) || 0;

    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: `Pay for ${payload.name}` },
      content: `<p>Deduct <strong>¥${price.toLocaleString('en-US')}</strong> from
        ${actor.name}'s ¥${have.toLocaleString('en-US')}?</p>
        ${price > have ? '<p style="color:var(--sr-red)">They cannot cover it — the deal is off unless the GM says otherwise (p.273).</p>' : ''}
        ${Cart.linesOf(payload).some(l => l.itemUuid) ? '<p style="font-size:11px;color:var(--sr-muted)">A copy of the item will be added to the sheet.</p>' : ''}`,
    });
    if (!ok) return false;
    if (!(await claim())) { ui.notifications.warn(`${payload.name} has already been paid for.`); return false; }

    await SR3EPurchase.receive(actor, payload, price);
    return true;
  },

  /**
   * 💴 / 📦 — the money button: 💴 Pay as before, or 📝 Place order when the card was posted in session
   * (TODO 288, SR3 p.273 — the nuyen changes hands at delivery). Same class, so the same guards and claim.
   */
  moneyButton(payload, price, order) {
    const p = Number(price).toLocaleString('en-US');
    return order
      ? `<button class="sr-buy-pay-btn" data-payload='${payload}'>📝 Place order — ¥${p} due at delivery</button>`
      : `<button class="sr-buy-pay-btn" data-payload='${payload}'>💴 Pay ¥${p} &amp; receive</button>`;
  },

  /**
   * Charge and create — the ONE writer, shared by 💴 Pay and the GM's 📦 Deliver (TODO 288).
   * ⚠ Through `actor.update` with a `ledgerReason`, so TODO 79 records the purchase.
   */
  async receive(actor, payload, price, prefix = '') {
    const have = Number(actor.system?.nuyen) || 0;
    await actor.update({ 'system.nuyen': Math.max(0, have - price) },
      { ledgerReason: `${prefix ? 'Delivered' : 'Bought'} ${payload.name}` });

    let added = '';
    const H = game.sr3e.SR3EHealing;
    const toCreate = [];
    for (const line of Cart.linesOf(payload)) {
      // Medkit Supplies refill empty medkits rather than landing on the sheet (TODO 139, SR3 p.304) — one per unit.
      if (H.isMedkitSupplies(line.name)) {
        const empties = H.emptyMedkits(actor.items).slice(0, Cart.qty(line.quantity));
        for (const kit of empties) await kit.unsetFlag('The2ndChumming3e', 'suppliesOut');
        if (empties.length) { added += ` — ${empties.map(k => k.name).join(', ')} restocked`; continue; }
      }
      if (!line.itemUuid) continue;
      const src = await fromUuid(line.itemUuid).catch(() => null);
      if (!src) continue;
      let data = src.toObject();
      delete data._id;
      // The picked level's rating and printed numbers; the price paid is the deal's, not the table's.
      if (line.level) data = ModRatings.withLevel(data, line.level);
      // Bought from a gun's sheet: the box is stamped with that gun's class, while it states none (SR3 p.279).
      const cls = data.type === 'ammunition' ? AmmoShop.stamp(data.system, { gunClass: line.gunClass }) : null;
      if (cls) data.system = { ...data.system, gunClass: cls };
      // N of one thing stacks: one box of N reloads, one stack, or N copies (TODO 284).
      toCreate.push(...Cart.deliver(data, line.quantity));
    }
    if (toCreate.length) {
      await actor.createEmbeddedDocuments('Item', toCreate);
      added += ' and added to the sheet';
    }
    const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="sr-roll-card"><div class="sr-roll-result">${esc(prefix)}💴 ${esc(actor.name)} paid
        ¥${price.toLocaleString('en-US')} for ${esc(payload.name)}${added}.
        Nuyen ¥${have.toLocaleString('en-US')} → ¥${Math.max(0, have - price).toLocaleString('en-US')}.</div></div>`,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
    });
    return true;
  },
};
