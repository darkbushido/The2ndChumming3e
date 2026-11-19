import { ModdedBuy } from './data/modded-buy.mjs';
import { GearSearch } from './data/gear-search.mjs';
import { ModRatings } from './data/mod-ratings.mjs';
import { Legality } from './data/legality.mjs';
import { actorRef } from './data/actor-ref.mjs';

/**
 * 🔧 Buy or build a modded item — the Foundry side · TODO 283. The rules are scripts/data/modded-buy.mjs.
 *
 * Scope ruled 2026-11-19 (the maintainer): the button sits beside 🛒 Buy gear on the character sheet; the host and its
 * mods are picked by search or drop; **Buy** puts the whole thing into 🛒 as ONE cart line (store or contact, Etiquette
 * against the slowest part, haggling, 💴 Pay — SR3 pp.272-273), and 💴 Pay builds it (`materialise`); vehicles too.
 * **Add without paying** builds it straight onto the sheet, no nuyen moved.
 *
 * Nothing is created until one of those. Every price is the quote's; warnings never stop either button.
 */
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const yen = n => `¥${Math.round(Number(n) || 0).toLocaleString('en-US')}`;
const HOST_TYPES = ['firearm', 'melee', 'armor', 'cyberware'];
const BASIS = { fixed: 'printed', level: 'at its level', host: 'from the host', 'built-in': 'built in (SR3 p.303)', unpriced: 'no price' };

export const SR3EModdedBuy = {
  /** Every vehicle in the Actor packs the source-book filter lets through — index rows only. */
  async vehicleIndex() {
    const out = [];
    for (const pack of game.packs?.contents ?? []) {
      if (pack.documentName !== 'Actor') continue;
      if (!(game.sr3e?.SR3ESourceBooks?.packAllowed(pack) ?? true)) continue;
      try {
        const idx = await pack.getIndex({ fields: ['type', 'system.cost', 'system.availability'] });
        for (const row of idx) if (row.type === 'vehicle') out.push({ name: row.name, type: 'vehicle', uuid: row.uuid ?? `Compendium.${pack.collection}.Actor.${row._id}`, cost: row.system?.cost ?? 0, availability: row.system?.availability ?? '', packLabel: pack.metadata?.label ?? '' });
      } catch (err) { console.warn(`SR3E | Could not index pack ${pack.collection}:`, err); }
    }
    return out;
  },

  /** Is Man & Machine on? (the built-in device price, SR3 p.303) */
  mmOn() {
    return game.sr3e?.SR3ESourceBooks?.optionalRuleAllowed?.('mm') ?? true;
  },

  /** The dialog. `actor` is who it is for. */
  async open(actor) {
    if (!actor) return;
    const P = game.sr3e.SR3EPurchase;
    const [gear, vehicles] = await Promise.all([P.loadGearIndex(), SR3EModdedBuy.vehicleIndex()]);
    const hosts = [...gear.filter(e => HOST_TYPES.includes(e.type)), ...vehicles];
    const state = { host: null, hostUuid: '', mods: [] };   // mods: [{ data, ref, level, levels }]
    let result = null;
    const quote = () => ModdedBuy.quote(state.host, state.mods.map(m => ({ data: m.data, ref: m.ref, level: m.level })), { mmOn: SR3EModdedBuy.mmOn() });

    const setHost = async uuid => {
      const doc = await fromUuid(uuid).catch(() => null);
      if (!doc) { ui.notifications.warn('That could not be found.'); return false; }
      if (!ModdedBuy.kindOf(doc)) ui.notifications.warn(`${doc.name} does not take mods — it is quoted on its own.`);
      state.host = doc.toObject();
      state.hostUuid = doc.uuid;
      state.mods = [];
      return true;
    };
    const addMod = async uuid => {
      const doc = await fromUuid(uuid).catch(() => null);
      if (!doc || doc.documentName !== 'Item') { ui.notifications.warn('Only an item can be a mod.'); return false; }
      const levels = ModRatings.levelsFor(doc, P.bookAllowed);
      const level = levels ? Math.min(...Object.keys(levels).map(Number)) : null;
      state.mods.push({ data: doc.toObject(), ref: doc.uuid, level, levels });
      return true;
    };

    const wireBuild = (dialog, el) => {
      const hostQ = el.querySelector('#sr-mb-host-q'), modQ = el.querySelector('#sr-mb-mod-q');
      const hostHits = el.querySelector('#sr-mb-host-hits'), modHits = el.querySelector('#sr-mb-mod-hits');
      const draw = () => {
        const q = quote();
        el.querySelector('#sr-mb-host').textContent = state.host ? `${state.host.name}${q.kind ? '' : ' (takes no mods)'}` : '— pick a host —';
        el.querySelector('#sr-mb-mods').innerHTML = state.mods.map((m, i) => `<div>🔧 ${esc(m.data.name)}${m.levels
          ? ` <select class="sr-mb-level" data-i="${i}">${Object.keys(m.levels).map(Number).sort((a, b) => a - b).map(l => `<option value="${l}"${l === m.level ? ' selected' : ''}>${l}</option>`).join('')}</select>` : ''}
          <a class="sr-mb-x" data-i="${i}" title="Remove">✕</a></div>`).join('');
        el.querySelector('#sr-mb-breakdown').innerHTML = state.host ? `<table style="width:100%;font-size:12px">
          ${q.lines.map(l => `<tr><td>${l.part === 'host' ? '' : '+ '}${esc(l.name)}</td><td style="color:var(--sr-muted)">${BASIS[l.basis] ?? ''}</td><td>${esc(l.availability)}</td><td style="text-align:right">${yen(l.cost)}</td></tr>`).join('')}
          <tr style="font-weight:bold"><td>Total</td><td></td><td>${esc(q.slowest.code)}</td><td style="text-align:right">${yen(q.total)}</td></tr></table>
          ${q.kind === 'armor' ? '<div style="font-size:11px;color:var(--sr-muted)">Armour: the total and Availability follow the armour mod rules (CC pp.52-53).</div>' : ''}
          ${q.slowest.name ? `<div style="font-size:11px">Sourced against the slowest part: ${esc(q.slowest.name)} (SR3 p.272).</div>` : ''}
          ${q.warnings.map(w => `<div style="color:var(--sr-amber);font-size:11px">⚠ ${esc(w)}</div>`).join('')}` : '';
      };
      const hitList = (box, hits, cls) => { box.innerHTML = hits.map(h => `<div class="${cls}" data-uuid="${esc(h.uuid)}" style="cursor:pointer">${esc(h.name)} <span style="color:var(--sr-muted)">${esc(h.type)} · ${yen(h.cost)}</span></div>`).join(''); };
      const stop = ev => { if (ev.key === 'Enter') ev.preventDefault(); };
      hostQ?.addEventListener('keydown', stop);
      modQ?.addEventListener('keydown', stop);
      hostQ?.addEventListener('input', () => hitList(hostHits, hostQ.value.trim() ? GearSearch.search(hosts, hostQ.value) : [], 'sr-mb-host-hit'));
      modQ?.addEventListener('input', () => {
        const kind = ModdedBuy.kindOf(state.host);
        hitList(modHits, modQ.value.trim() && kind ? GearSearch.search(gear, modQ.value, { limit: 60 }).filter(e => ModdedBuy.offerable(kind, e)).slice(0, 20) : [], 'sr-mb-mod-hit');
      });
      el.addEventListener('click', async ev => {
        const h = ev.target.closest?.('.sr-mb-host-hit'), m = ev.target.closest?.('.sr-mb-mod-hit'), x = ev.target.closest?.('.sr-mb-x');
        if (h && await setHost(h.dataset.uuid)) { hostHits.innerHTML = ''; draw(); }
        else if (m && await addMod(m.dataset.uuid)) draw();
        else if (x) { state.mods.splice(Number(x.dataset.i), 1); draw(); }
      });
      el.addEventListener('change', ev => {
        const s = ev.target.closest?.('.sr-mb-level');
        if (s) { state.mods[Number(s.dataset.i)].level = Number(s.value); draw(); }
      });
      // A drop: the first is the host, every later one a mod (a vehicle drop is always the host).
      el.addEventListener('dragover', ev => ev.preventDefault());
      el.addEventListener('drop', async ev => {
        ev.preventDefault();
        let data;
        try { data = JSON.parse(ev.dataTransfer.getData('text/plain')); } catch { return; }
        if (!data?.uuid) return;
        const ok = (!state.host || data.type === 'Actor') ? await setHost(data.uuid) : await addMod(data.uuid);
        if (ok) draw();
      });
      draw();
    };

    await foundry.applications.api.DialogV2.wait({
      window: { title: `🔧 Buy or build a modded item — ${actor.name}` },
      position: { width: 560 },
      content: `<div class="sr3e-inner" style="display:flex;flex-direction:column;gap:6px">
        <div><strong>Host:</strong> <span id="sr-mb-host"></span></div>
        <input type="text" id="sr-mb-host-q" placeholder="Search guns, armour, cyberware, vehicles… or drop one here"/>
        <div id="sr-mb-host-hits" style="max-height:120px;overflow:auto"></div>
        <div><strong>Mods:</strong></div>
        <div id="sr-mb-mods"></div>
        <input type="text" id="sr-mb-mod-q" placeholder="Search mods for this host… or drop them here"/>
        <div id="sr-mb-mod-hits" style="max-height:120px;overflow:auto"></div>
        <div id="sr-mb-breakdown"></div>
      </div>`,
      buttons: [
        { label: '🛒 Buy…', action: 'buy', default: true, callback: () => { result = 'buy'; } },
        { label: 'Add without paying', action: 'add', callback: () => { result = 'add'; } },
        { label: 'Cancel', action: 'cancel' },
      ],
      render: (_event, dialog) => wireBuild(dialog, dialog.element),
    });
    if (!result || !state.host) return;
    const q = quote();
    const line = ModdedBuy.cartLine(q, { hostUuid: state.hostUuid, legality: Legality.of(state.host) || '' });
    if (result === 'buy') return game.sr3e.SR3EPurchase.open(actor, null, { lines: [line] });
    const made = await SR3EModdedBuy.materialise(actor, line);
    if (made.item) await actor.createEmbeddedDocuments('Item', [made.item]);
    ui.notifications.info(`${line.name} added to ${actor.name} without paying.`);
  },

  /**
   * A modded cart line built again from its references, at the prices quoted. Returns `{ item }` (item data for the
   * caller to create) or `{ vehicle }` (the created vehicle's name — created here, through the GM, mods embedded).
   */
  async materialise(actor, line) {
    const host = await fromUuid(line.itemUuid).catch(() => null);
    if (!host) { ui.notifications.warn(`${line.name}: its host can no longer be found.`); return {}; }
    const mods = [];
    for (const r of line.modded?.mods ?? []) {
      const doc = await fromUuid(r.itemUuid).catch(() => null);
      if (!doc) { ui.notifications.warn(`${line.name}: a mod could not be found — left out.`); continue; }
      let data = doc.toObject();
      if (r.level != null && ModRatings.levelsOf(data)) data = ModRatings.withLevel(data, r.level);
      else if (r.level != null) data.system = { ...data.system, rating: r.level };
      data.system = { ...data.system, cost: Number(r.cost) || 0 };   // the price quoted
      mods.push({ data });
    }
    const q = ModdedBuy.quote(host.toObject(), mods, { mmOn: SR3EModdedBuy.mmOn(), newId: () => foundry.utils.randomID() });
    if (!line.modded?.vehicle) {
      const item = q.built;
      delete item._id;
      return { item };
    }
    let created = null;
    try {
      const source = host.pack ? `${host.pack}|${host.id}` : null;
      const res = await game.sr3e.SR3EQuery.asGM('sr3e.actor.create', source ? { source } : { fromActorId: actorRef(host) });
      created = res?.uuid ? await fromUuid(res.uuid) : null;
    } catch (err) { console.error('SR3E | modded buy: vehicle create failed:', err); }
    if (!created) { ui.notifications.error('Could not create the vehicle — is a GM connected?'); return {}; }
    const data = q.mods.map(m => { const d = foundry.utils.deepClone(m); delete d._id; return d; });
    if (data.length) await created.createEmbeddedDocuments('Item', data);
    await game.sr3e.SR3EQuery.asGM('sr3e.vehicle.link', { vehicleId: actorRef(created), driverActorId: actorRef(actor) }).catch(() => null);
    return { vehicle: created.name };
  },
};
