/**
 * "Modify a book vehicle" — a printed vehicle plus aftermarket mods, in the 🛠 Vehicle Designer's look · TODO 298. Pure: no
 * Foundry. The maintainer, 2026-11-12: "both should have a way to modify something from the book" → "Book stats + aftermarket
 * mods": pick one of the packs' vehicles, add R3R mods at their printed nuyen price, CF and Load — no Design Points.
 *
 * Every figure comes from `GearDesign.assembleBookVehicle` (the system's own `VehicleMods` rules), handed in as `view.r`:
 *
 *   view = { design (a GearDesign vehicle design with `base`), ui, step, items ({ ref: catalogue doc }), r,
 *            img(ref) → url | '', finish() → html (step 3's buttons) }
 */
import { ModCatalog, SHELVES } from './mod-catalog.mjs';
import { ModRatings } from './mod-ratings.mjs';
import { DesignerArt } from './designer-art.mjs';
import { GearDesign } from './gear-design.mjs';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const yen = n => `${Math.round(Number(n) || 0).toLocaleString()}¥`;
const stat = (v, k) => v?.system?.attributes?.[k]?.base ?? v?.system?.attributes?.[k]?.value;

/** The vehicle types — step 1's chips, in this order; anything else falls under its own name. */
export const VEHICLE_TYPES = [['car', 'Cars & trucks'], ['motorcycle', 'Bikes'], ['military', 'Military'], ['boat', 'Boats'],
  ['ship', 'Ships'], ['submarine', 'Submarines'], ['hovercraft', 'Hovercraft'], ['helicopter', 'Helicopters'],
  ['fixedwing', 'Fixed-wing'], ['airship', 'Airships'], ['drone', 'Drones']];
export const STEPS = [[1, 'Vehicle'], [2, 'Modifications'], [3, 'Price']];
/** The stats the result bar and the price step show, as [key, label]. Handling is a TN: lower is better. */
export const STATS = [['handling', 'Handling'], ['speed', 'Speed'], ['accel', 'Accel'], ['body', 'Body'], ['armor', 'Armor'],
  ['sig', 'Sig'], ['autonav', 'Autonav'], ['pilot', 'Pilot'], ['sensor', 'Sensor'], ['cargo', 'Cargo'], ['load', 'Load']];
const PAGE = 60;

export const BookVehicleView = {
  /** Levels a mod can be bought at: its printed levels, else 1…its book maximum when it is rated, else none. */
  levels(mod) {
    const printed = ModRatings.levelsOf(mod);
    if (printed) return Object.keys(printed).map(Number);
    if (!ModCatalog.rated(mod)) return null;
    const max = ModCatalog.maxLevel(mod) ?? 6;
    return Array.from({ length: max }, (_, i) => i + 1);
  },

  html(view) {
    const { design: d } = view;
    const base = view.items[d.base] ?? null;
    const step = base ? view.step : 1;
    const subs = { 1: base?.name, 2: d.mods.length ? `${d.mods.length} in cart` : null };
    const tabs = STEPS.map(([n, label]) => `<button type="button" class="vd-step ${n === step ? 'active' : ''} ${n < step ? 'done' : ''}" data-bstep="${n}" ${n > 1 && !base ? 'disabled' : ''}>
      <span class="vd-step-n">${n}</span><span class="vd-step-text"><span class="vd-step-label">${esc(label)}</span>${subs[n] ? `<small>${esc(subs[n])}</small>` : ''}</span></button>`).join('');
    const body = step === 1 ? B.stepVehicle(view) : step === 2 ? B.stepMods(view) : B.stepPrice(view);
    return `${B.resultBar(view, base)}
      <nav class="vd-steps">${tabs}</nav>
      <section class="vd-body">${body}</section>
      <footer class="vd-foot">
        <button type="button" class="vd-nav" data-bstep="${step - 1}" ${step === 1 ? 'disabled' : ''}>◀ Back</button>
        ${step < 3 ? `<button type="button" class="vd-nav vd-next" data-bstep="${step + 1}" ${base ? '' : 'disabled'}>Next ▶</button>` : (view.finish?.() ?? '')}
      </footer>`;
  },

  /** The pinned bar: picture, name, the stats with the mods applied (book figure on hover), and the price. */
  resultBar(view, base) {
    const r = view.r;
    const eff = r?.effective?.stats ?? {};
    const chip = (label, v, cls = '', title = '') => `<div class="vd-chip ${cls}" ${title ? `title="${esc(title)}"` : ''}><span>${label}</span><b>${esc(v ?? '—')}</b></div>`;
    const stats = STATS.map(([k, label]) => {
      const e = eff[k];
      const v = e ? e.value : stat(base, k);
      const changed = e && e.value !== e.own;
      return chip(label, base ? v : null, changed ? 'vd-changed' : '', changed ? `Book ${e.own} → ${e.value}` : '');
    }).join('');
    const warn = (r?.warnings ?? []).length;
    const pic = base && view.img(view.design.base) ? `<img src="${esc(view.img(view.design.base))}" alt="" style="width:100%;height:100%;object-fit:contain"/>` : '';
    return `<header class="vd-result">
      <div class="vd-result-art">${pic}</div>
      <div class="vd-result-main">
        <input type="text" class="vd-name" data-bpath="name" value="${esc(view.design.name)}" placeholder="${esc(base?.name ?? 'Pick a vehicle')}" maxlength="${GearDesign.LIMITS.name}"/>
        <div class="vd-chips">${stats}${chip('Cost', base ? yen(r?.totals?.cost) : null, 'vd-cost')}</div>
        <div class="vd-chips vd-chips-book">
          ${chip('Type', base?.system?.vehicleType)}${chip('Seats', base?.system?.seating)}${chip('Avail', base?.system?.availability)}
          ${chip('SI', base?.system?.streetIndex)}${chip('Mods CF', base ? r?.totals?.cf : null)}${chip('Mods Load', base ? r?.totals?.load : null)}
          ${warn ? `<div class="vd-chip vd-warn" title="${esc(r.warnings.join('\n'))}"><span>⚠</span><b>${warn}</b></div>` : ''}
        </div>
      </div>
    </header>`;
  },

  /** Step 1 — vehicle types as chips, then that type's vehicles as cards. */
  stepVehicle(view) {
    const all = Object.entries(view.items).filter(([, i]) => i.kind === 'vehicle');
    const typeOf = v => v.system?.vehicleType || 'other';
    const cur = view.items[view.design.base];
    const types = [...VEHICLE_TYPES, ...[...new Set(all.map(([, v]) => typeOf(v)))].filter(t => !VEHICLE_TYPES.some(([id]) => id === t)).map(t => [t, t])]
      .filter(([id]) => all.some(([, v]) => typeOf(v) === id));
    const type = view.ui.btype ?? (cur ? typeOf(cur) : types[0]?.[0]);
    const q = (view.ui.bq ?? '').toLowerCase();
    const chips = types.map(([id, label]) => {
      const of = all.filter(([, v]) => typeOf(v) === id);
      const icon = of.find(([ref]) => view.img(ref))?.[0];
      return `<button type="button" class="vd-type ${id === type && !q ? 'active' : ''}" data-btype="${esc(id)}">
        ${icon ? `<img src="${esc(view.img(icon))}" alt="" style="width:48px;height:48px;object-fit:contain"/>` : ''}<span>${esc(label)} <small>${of.length}</small></span></button>`;
    }).join('');
    const list = all.filter(([, v]) => (q ? v.name.toLowerCase().includes(q) : typeOf(v) === type)).sort(([, a], [, b]) => a.name.localeCompare(b.name));
    const cards = list.slice(0, PAGE).map(([ref, v]) => `<button type="button" class="vd-card ${ref === view.design.base ? 'picked' : ''}" data-bbase="${esc(ref)}">
        <div class="vd-card-art">${view.img(ref) ? `<img src="${esc(view.img(ref))}" alt="" style="max-width:80%;max-height:80%"/>` : ''}</div>
        <div class="vd-card-name">${esc(v.name)}</div>
        <div class="vd-card-stats">
          <span>Hand <b>${esc(stat(v, 'handling'))}</b></span><span>Spd <b>${esc(stat(v, 'speed'))}</b></span><span>Body <b>${esc(stat(v, 'body'))}</b></span>
          <span>Armor <b>${esc(stat(v, 'armor'))}</b></span><span>¥ <b>${esc(Number(v.system?.cost || 0).toLocaleString())}</b></span>
        </div>
        <div class="vd-card-page">${esc(v.system?.bookPage)}</div></button>`).join('');
    const more = list.length > PAGE ? `<p class="vd-dim">${list.length - PAGE} more — search to narrow.</p>` : '';
    return `<div class="vd-row"><input type="search" class="vd-bsearch" placeholder="Search every vehicle…" value="${esc(view.ui.bq ?? '')}"/></div>
      <div class="vd-types">${chips}</div><div class="vd-grid">${cards || '<p class="vd-empty">No vehicles match.</p>'}</div>${more}`;
  },

  /** Step 2 — the R3R mod shelves, search, cards at their printed price, and the cart with levels and prices. */
  stepMods(view) {
    const { design: d, r } = view;
    const q = (view.ui.mq ?? '').toLowerCase();
    const shelf = view.ui.mshelf ?? 'engine';
    const mods = Object.entries(view.items).filter(([, i]) => i.kind === 'vmod').map(([ref, m]) => ({ ref, m, card: ModCatalog.card(m.name) }));
    const count = id => mods.filter(x => x.card.shelf === id).length;
    const tabs = Object.entries(SHELVES).map(([id, label]) => `<button type="button" class="vd-shelf ${id === shelf && !q ? 'active' : ''}" data-bshelf="${id}" title="${esc(label)}">
      ${DesignerArt.shelf(id)}<span>${esc(label)}</span><small>${count(id)}</small></button>`).join('');
    const shown = mods.filter(x => (q ? `${x.m.name} ${x.card.blurb ?? ''}`.toLowerCase().includes(q) : x.card.shelf === shelf))
      .sort((a, b) => a.m.name.localeCompare(b.m.name));
    const inCart = ref => d.mods.some(x => x.ref === ref);
    const cards = shown.slice(0, PAGE).map(({ ref, m, card }) => {
      const s = m.system ?? {};
      const price = Number(s.cost) > 0 ? yen(s.cost) : 'priced from the vehicle';
      return `<div class="vd-card vd-mod ${inCart(ref) ? 'picked' : ''}">
        <div class="vd-card-name">${esc(m.name.replace(/\s*\(Vehicle\)/, ''))}</div>
        ${card.blurb ? `<div class="vd-blurb">${esc(card.blurb)}</div>` : ''}
        <div class="vd-card-stats"><span>¥ <b>${esc(price)}</b></span><span>CF <b>${esc(s.cfCost ?? '—')}</b></span><span>Load <b>${esc(s.load ?? '—')}</b></span></div>
        <div class="vd-card-foot"><span class="vd-card-page">${esc(s.bookPage ?? '')}</span>
          ${inCart(ref) && !ModCatalog.stacks(m.name) ? '<span class="vd-in-cart">✓ In cart</span>' : `<button type="button" data-badd="${esc(ref)}">+ Add</button>`}</div></div>`;
    }).join('');
    const priced = r?.mods ?? [];
    const cart = d.mods.map((x, i) => {
      const m = view.items[x.ref];
      const levels = m && B.levels(m);
      const got = priced.find(p => p.name === m?.name || ModCatalog.sameMod(p.name, m?.name));
      return `<div class="vd-cart-item">
        <span class="vd-cart-name">${esc((m?.name ?? x.ref).replace(/\s*\(Vehicle\)/, ''))}</span>
        ${levels ? `<label>Lv <select data-blevel="${i}">${levels.map(l => `<option value="${l}" ${l === x.rating ? 'selected' : ''}>${l}</option>`).join('')}</select></label>` : ''}
        <span class="vd-dim">${got ? yen(got.system?.cost) : '—'}</span>
        <button type="button" data-bremove="${i}" title="Remove">✕</button></div>`;
    }).join('');
    const more = shown.length > PAGE ? `<p class="vd-dim">${shown.length - PAGE} more — search to narrow.</p>` : '';
    return `<div class="vd-shop">
      <div class="vd-shop-main">
        <div class="vd-row"><input type="search" class="vd-msearch" placeholder="Search every modification…" value="${esc(view.ui.mq ?? '')}"/></div>
        <nav class="vd-shelves">${tabs}</nav>
        <div class="vd-grid vd-grid-sm">${cards || '<p class="vd-empty">Nothing on this shelf.</p>'}</div>${more}
      </div>
      <aside class="vd-cart"><h4>🛒 Cart <small>${d.mods.length}</small></h4>${cart || '<p class="vd-empty">Add modifications from the shelves.</p>'}</aside>
    </div>`;
  },

  /** Step 3 — the bill, the stats book → modified, CF and Load the mods take, and every warning. */
  stepPrice(view) {
    const { design: d, r } = view;
    const base = view.items[d.base];
    const lines = [[base?.name, base?.system?.cost, base?.system?.bookPage], ...(r?.mods ?? []).map(m => [m.name, m.system?.cost, m.system?.bookPage])];
    const row = ([label, cost, page]) => `<div class="vd-line"><span>${esc(label)}</span><b>${yen(cost)}</b><span class="vd-dim">${esc(page ?? '')}</span></div>`;
    const eff = r?.effective?.stats ?? {};
    const changes = Object.entries(eff).filter(([, e]) => e.value !== e.own)
      .map(([k, e]) => `<div class="vd-line"><span>${esc(STATS.find(([id]) => id === k)?.[1] ?? k)}</span><b>${e.own} → ${e.value}</b>
        <span class="vd-dim">${esc(e.from.map(f => `${f.name} ${f.change}`).join(', '))}</span></div>`).join('');
    const notes = (r?.effective?.notes ?? []).map(n => `<div class="vd-dim">${esc(n)}</div>`).join('');
    return `<div class="vd-price">
      <fieldset><legend>The bill</legend>${lines.map(row).join('')}
        <div class="vd-line vd-total"><span>Total</span><b>${yen(r?.totals?.cost)}</b></div></fieldset>
      <fieldset><legend>What the mods change</legend>${changes || '<p class="vd-dim">No stat changes.</p>'}${notes}
        <div class="vd-line"><span>CF / Load the mods take</span><b>${r?.totals?.cf ?? 0} / ${r?.totals?.load ?? 0}</b></div></fieldset>
      ${(r?.warnings ?? []).length ? `<fieldset><legend>Warnings — the import still works</legend>${r.warnings.map(w => `<div class="vd-amber">⚠ ${esc(w)}</div>`).join('')}</fieldset>` : ''}
    </div>`;
  },

  /** Wire the wizard in `el`; `render()` recomputes and redraws. */
  wire(el, view, { render }) {
    const d = view.design;
    const on = (sel, fn, ev = 'click') => el.querySelectorAll(sel).forEach(b => b.addEventListener(ev, () => fn(b)));
    on('[data-bstep]', b => { view.step = Number(b.dataset.bstep); render(); });
    on('[data-btype]', b => { view.ui.btype = b.dataset.btype; view.ui.bq = ''; render(); });
    on('[data-bbase]', b => { d.base = b.dataset.bbase; view.step = 2; render(); });
    on('[data-bshelf]', b => { view.ui.mshelf = b.dataset.bshelf; view.ui.mq = ''; render(); });
    on('[data-badd]', b => {
      const levels = B.levels(view.items[b.dataset.badd]);
      d.mods.push(levels ? { ref: b.dataset.badd, rating: levels[0] } : { ref: b.dataset.badd });
      render();
    });
    on('[data-bremove]', b => { d.mods.splice(Number(b.dataset.bremove), 1); render(); });
    on('[data-blevel]', b => { d.mods[b.dataset.blevel].rating = Number(b.value); render(); }, 'change');
    on('[data-bpath="name"]', b => { d.name = b.value; render(); }, 'change');
    const search = (sel, key) => {
      const s = el.querySelector(sel);
      s?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); view.ui[key] = s.value; render(); } });
      s?.addEventListener('change', () => { view.ui[key] = s.value; render(); });
    };
    search('.vd-bsearch', 'bq');
    search('.vd-msearch', 'mq');
  },
};

const B = BookVehicleView;
