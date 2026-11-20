/**
 * A weapon designer in the 🛠 Vehicle Designer's style — type chips, gun cards, accessory shelves and a cart, ammo, price ·
 * TODO 298. Pure: no Foundry. The web gear designer's Weapon tab runs it; a Foundry window could run the same markup later.
 *
 * The maintainer, 2026-11-12: "the same kind of chassis selection for the different types of weapons". It reuses the
 * vehicle designer's classes (`vd-*`, styles/sr3e.css) so the two look alike. Every figure comes from `GearDesign.assemble`
 * (the system's own weapon-mod rules), handed in as `view.r`:
 *
 *   view = { design (a GearDesign weapon design), ui, step, items ({ ref: catalogue doc }), r (assemble's result),
 *            img(ref) → url | '', finish() → html (step 4's buttons) }
 */
import { ItemMods } from './item-mods.mjs';
import { ModRatings } from './mod-ratings.mjs';
import { GearDesign } from './gear-design.mjs';
import { WeaponCatalog, GROUPS } from './weapon-catalog.mjs';
import { WeaponArt } from './weapon-art.mjs';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const yen = n => `${Math.round(Number(n) || 0).toLocaleString()}¥`;

/** The weapon types — step 1's chips (TODO 300: firearms and melee, by skill group). */
export const GUN_TYPES = GROUPS;
/** Accessory shelves: the three mounts (SR3 p.280), then everything that takes none. */
export const MOD_SHELVES = [['Top', 'Top mount'], ['Barrel', 'Barrel'], ['Under', 'Underbarrel'], ['', 'No mount']];
export const STEPS = [[1, 'Weapon'], [2, 'Accessories'], [3, 'Ammunition'], [4, 'Price']];
const PAGE = 60;   // cards shown at once

export const WeaponDesignerView = {
  /** The type a firearm category falls under. */
  typeOf(category) {
    return WeaponCatalog.groupOf({ type: 'firearm', system: { category } });
  },

  /** The chip a catalogue weapon sits under (melee by its item type). */
  groupOf(item) { return WeaponCatalog.groupOf(item); },

  /** The shelf an accessory sits on — its first mount, '' for none. */
  shelfOf(mod) {
    return ItemMods.mountsOf(mod)[0] ?? '';
  },

  html(view) {
    const { design: d, r } = view;
    const base = view.items[d.base] ?? null;
    const step = base ? view.step : 1;
    const subs = { 1: base?.name, 2: d.mods.length ? `${d.mods.length} in cart` : null, 3: d.ammo.length ? `${d.ammo.length} picked` : null };
    const tabs = STEPS.map(([n, label]) => `<button type="button" class="vd-step ${n === step ? 'active' : ''} ${n < step ? 'done' : ''}" data-wstep="${n}" ${n > 1 && !base ? 'disabled' : ''}>
      <span class="vd-step-n">${n}</span><span class="vd-step-text"><span class="vd-step-label">${esc(label)}</span>${subs[n] ? `<small>${esc(subs[n])}</small>` : ''}</span></button>`).join('');
    const body = step === 1 ? W.stepGun(view) : step === 2 ? W.stepMods(view) : step === 3 ? W.stepAmmo(view) : W.stepPrice(view);
    return `${W.resultBar(view, base, r)}
      <nav class="vd-steps">${tabs}</nav>
      <section class="vd-body">${body}</section>
      <footer class="vd-foot">
        <button type="button" class="vd-nav" data-wstep="${step - 1}" ${step === 1 ? 'disabled' : ''}>◀ Back</button>
        ${step < 4 ? `<button type="button" class="vd-nav vd-next" data-wstep="${step + 1}" ${base ? '' : 'disabled'}>Next ▶</button>` : (view.finish?.() ?? '')}
      </footer>`;
  },

  /** The pinned bar: the gun's picture, its name, and what the build comes to. */
  resultBar(view, base, r) {
    const s = base?.system ?? {};
    const t = r?.totals ?? {};
    const chip = (label, v, cls = '') => `<div class="vd-chip ${cls}"><span>${label}</span><b>${esc(v ?? '—')}</b></div>`;
    const warn = (r?.warnings ?? []).length;
    const pic = base ? WeaponArt.picture(base.name, W.groupOf(base)) : '';
    return `<header class="vd-result">
      <div class="vd-result-art">${pic}</div>
      <div class="vd-result-main">
        <input type="text" class="vd-name" data-wpath="name" value="${esc(view.design.name)}" placeholder="${esc(base?.name ?? 'Pick a weapon')}" maxlength="${GearDesign.LIMITS.name}"/>
        <div class="vd-chips">
          ${chip('Damage', s.damage)}${chip('Mode', s.mode)}${chip('Ammo', s.ammunition)}${chip('Conceal', s.concealability)}
          ${chip('RC mods', base ? t.rc : null)}${chip('Smartgun', base ? (t.smartgun ? 'yes' : 'no') : null)}${chip('Laser', base ? (t.laserSight ? 'yes' : 'no') : null)}
          ${chip('Cost', base ? yen(t.cost) : null, 'vd-cost')}
        </div>
        <div class="vd-chips vd-chips-book">
          ${chip('Category', s.category)}${chip('Avail', s.availability)}${chip('SI', s.streetIndex)}${chip('Legality', s.legality)}
          ${['Top', 'Barrel', 'Under'].map(m => chip(m, t.mounts?.[m] ? String(t.mounts[m]).replace(/\s*\(Weapon\)/, '') : base ? 'free' : null)).join('')}
          ${warn ? `<div class="vd-chip vd-warn" title="${esc(r.warnings.join('\n'))}"><span>⚠</span><b>${warn}</b></div>` : ''}
        </div>
      </div>
    </header>`;
  },

  /** Step 1 — weapon types as chips with silhouettes, then that type's weapons as picture cards. */
  stepGun(view) {
    const guns = Object.entries(view.items).filter(([, i]) => i.kind === 'firearm' || i.kind === 'melee');
    const cur = view.items[view.design.base];
    const type = view.ui.type ?? (cur ? W.groupOf(cur) : 'pistol');
    const types = GUN_TYPES.filter(([id]) => guns.some(([, g]) => W.groupOf(g) === id));
    const chips = types.map(([id, label]) => {
      const n = guns.filter(([, g]) => W.groupOf(g) === id).length;
      return `<button type="button" class="vd-type ${id === type ? 'active' : ''}" data-wtype="${id}">
        ${WeaponArt.group(id)}<span>${esc(label)} <small>${n}</small></span></button>`;
    }).join('');
    const list = guns.filter(([, g]) => W.groupOf(g) === type).sort(([, a], [, b]) => a.name.localeCompare(b.name));
    const cards = list.map(([ref, g]) => {
      const s = g.system;
      const built = (s.installed ?? []).map(m => m.name.replace(/\s*\(Weapon\)/, '')).join(', ');
      const stats = g.kind === 'melee'
        ? `<span>Dmg <b>${esc(s.damage)}</b></span><span>Reach <b>${esc(s.reach ?? '0')}</b></span><span>Conc <b>${esc(s.concealability)}</b></span>`
        : `<span>Dmg <b>${esc(s.damage)}</b></span><span>Mode <b>${esc(s.mode)}</b></span><span>Ammo <b>${esc(s.ammunition)}</b></span><span>Conc <b>${esc(s.concealability)}</b></span>`;
      return `<button type="button" class="vd-card ${ref === view.design.base ? 'picked' : ''}" data-wbase="${esc(ref)}">
        <div class="vd-card-art">${WeaponArt.picture(g.name, W.groupOf(g))}</div>
        <div class="vd-card-name">${esc(g.name)}</div>
        <div class="vd-blurb">${esc(WeaponCatalog.blurb(g))}</div>
        ${built ? `<div class="vd-blurb">Built in: ${esc(built)}</div>` : ''}
        <div class="vd-card-stats">${stats}<span>¥ <b>${esc(Number(s.cost || 0).toLocaleString())}</b></span></div>
        <div class="vd-card-page">${esc(s.bookPage)}</div></button>`;
    }).join('');
    return `<div class="vd-types">${chips}</div><div class="vd-grid">${cards || '<p class="vd-empty">No weapons of this type.</p>'}</div>`;
  },

  /** Step 2 — accessory shelves by mount, search, cards, and the cart (with levels and where each one sits). */
  stepMods(view) {
    const { design: d, r } = view;
    const q = (view.ui.q ?? '').toLowerCase();
    const shelf = view.ui.shelf ?? 'Top';
    const all = !!view.ui.allMods;
    const host = r?.weapon ?? view.items[d.base] ?? null;
    const inCart = ref => d.mods.filter(x => x.ref === ref).length;
    // Why each one doesn't fit the weapon as built so far — hidden unless asked, never refused (TODO 300).
    const rows = Object.entries(view.items).filter(([, i]) => i.kind === 'mod')
      .map(([ref, m]) => [ref, m, inCart(ref) ? null : WeaponCatalog.misfit(host, m)]);
    const visible = rows.filter(([, , why]) => all || !why);
    const hidden = rows.length - visible.length;
    const count = id => visible.filter(([, m]) => W.shelfOf(m) === id).length;
    const tabs = MOD_SHELVES.map(([id, label]) => `<button type="button" class="vd-shelf ${id === shelf && !q ? 'active' : ''}" data-wshelf="${esc(id)}" title="${esc(label)}">
      ${WeaponArt.shelf(id)}<span>${esc(label)}</span><small>${count(id)}</small></button>`).join('');
    const shown = visible.filter(([, m]) => (q ? m.name.toLowerCase().includes(q) : W.shelfOf(m) === shelf)).sort(([, a], [, b]) => a.name.localeCompare(b.name));
    const cards = shown.slice(0, PAGE).map(([ref, m, why]) => {
      const n = inCart(ref);
      const levels = ModRatings.levelsOf(m);
      return `<div class="vd-card vd-mod ${why ? 'vd-misfit' : ''} ${n ? 'picked' : ''}">
        <div class="vd-mod-head"><span class="vd-mod-icon">${WeaponArt.shelf(W.shelfOf(m))}</span>
          <div class="vd-card-name">${esc(m.name.replace(/\s*\(Weapon\)/, ''))}</div></div>
        ${why ? `<div class="vd-amber">⚠ ${esc(why)}</div>` : ''}
        <div class="vd-card-stats"><span>Mount <b>${esc(m.system.mount || '—')}</b></span><span>¥ <b>${esc(Number(m.system.cost || 0).toLocaleString())}</b></span>
          ${levels ? `<span class="vd-dim">levels ${esc(Object.keys(levels).join(', '))}</span>` : ''}</div>
        <div class="vd-card-foot"><span class="vd-card-page">${esc(m.system.bookPage ?? '')}</span>
          ${n ? '<span class="vd-in-cart">✓ In cart</span>' : `<button type="button" data-wadd-mod="${esc(ref)}">+ Add</button>`}</div></div>`;
    }).join('');
    const installed = (r?.weapon?.system?.installed ?? []).filter(m => m.flags?.The2ndChumming3e?.integral !== true);
    const placed = ItemMods.assignMounts(r?.weapon?.system?.installed ?? []);
    const cart = d.mods.map((x, i) => {
      const m = view.items[x.ref];
      const levels = m && ModRatings.levelsOf(m);
      const got = installed.find(e => e.name === m?.name);
      const where = got ? placed.find(p => p.id === got._id) : null;
      const sit = where?.mount ? `on ${where.mount}` : where?.wants ? `⚠ ${where.wants} taken` : '';
      return `<div class="vd-cart-item ${where?.wants ? 'vd-cart-warn' : ''}">
        <span class="vd-cart-name">${esc((m?.name ?? x.ref).replace(/\s*\(Weapon\)/, ''))}</span>
        ${levels ? `<label>Lv <select data-wmod-level="${i}">${Object.keys(levels).map(l => `<option value="${l}" ${Number(l) === x.rating ? 'selected' : ''}>${l}</option>`).join('')}</select></label>` : ''}
        <span class="vd-dim">${esc(sit)} · ${got ? yen(got.system?.cost) : '—'}</span>
        <button type="button" data-wremove="mods.${i}" title="Remove">✕</button></div>`;
    }).join('');
    const more = shown.length > PAGE ? `<p class="vd-dim">${shown.length - PAGE} more — search to narrow.</p>` : '';
    return `<div class="vd-shop">
      <div class="vd-shop-main">
        <div class="vd-row"><input type="search" class="vd-wsearch" placeholder="Search every accessory…" value="${esc(view.ui.q ?? '')}"/>
          <label class="vd-switch"><input type="checkbox" class="vd-wall-mods" ${all ? 'checked' : ''}/> Show the ones that don't fit${hidden ? ` (${hidden} hidden)` : ''}</label></div>
        <nav class="vd-shelves">${tabs}</nav>
        <div class="vd-grid vd-grid-sm">${cards || '<p class="vd-empty">Nothing on this shelf.</p>'}</div>${more}
      </div>
      <aside class="vd-cart"><h4>🛒 Cart <small>${d.mods.length}</small></h4>${cart || '<p class="vd-empty">Add accessories from the shelves.</p>'}</aside>
    </div>`;
  },

  /** Step 3 — ammunition: search, cards, and how many of each. */
  stepAmmo(view) {
    const d = view.design;
    const q = (view.ui.aq ?? '').toLowerCase();
    const ammo = Object.entries(view.items).filter(([, i]) => i.kind === 'ammo' && (!q || i.name.toLowerCase().includes(q)))
      .sort(([, a], [, b]) => a.name.localeCompare(b.name));
    const cards = ammo.slice(0, PAGE).map(([ref, a]) => {
      const picked = d.ammo.some(x => x.ref === ref);
      return `<div class="vd-card vd-mod ${picked ? 'picked' : ''}">
        <div class="vd-card-name">${esc(a.name)}</div>
        <div class="vd-card-stats"><span>Dmg <b>${esc(a.system.damage ?? '—')}</b></span><span>Rounds <b>${esc(a.system.rounds ?? '—')}</b></span>
          <span>¥ <b>${esc(Number(a.system.cost || 0).toLocaleString())}</b></span></div>
        <div class="vd-card-foot"><span class="vd-card-page">${esc(a.system.bookPage ?? '')}</span>
          ${picked ? '<span class="vd-in-cart">✓ Picked</span>' : `<button type="button" data-wadd-ammo="${esc(ref)}">+ Add</button>`}</div></div>`;
    }).join('');
    const cart = d.ammo.map((x, i) => `<div class="vd-cart-item"><span class="vd-cart-name">${esc(view.items[x.ref]?.name ?? x.ref)}</span>
      <label>× <input type="number" min="1" max="${GearDesign.LIMITS.qty}" value="${x.qty}" data-wammo-qty="${i}" style="width:52px"/></label>
      <button type="button" data-wremove="ammo.${i}" title="Remove">✕</button></div>`).join('');
    const more = ammo.length > PAGE ? `<p class="vd-dim">${ammo.length - PAGE} more — search to narrow (try the gun's calibre or "APDS").</p>` : '';
    return `<div class="vd-shop">
      <div class="vd-shop-main">
        <div class="vd-row"><input type="search" class="vd-asearch" placeholder="Search ammunition…" value="${esc(view.ui.aq ?? '')}"/></div>
        <div class="vd-grid vd-grid-sm">${cards || '<p class="vd-empty">No ammunition matches.</p>'}</div>${more}
      </div>
      <aside class="vd-cart"><h4>🛒 Ammo <small>${d.ammo.length}</small></h4>${cart || '<p class="vd-empty">Optional.</p>'}</aside>
    </div>`;
  },

  /** Step 4 — the bill, line by line, and every warning. */
  stepPrice(view) {
    const { design: d, r } = view;
    const base = view.items[d.base];
    const lines = [[base?.name, base?.system?.cost, base?.system?.bookPage]];
    for (const m of (r?.weapon?.system?.installed ?? []).filter(x => x.flags?.The2ndChumming3e?.integral !== true)) lines.push([m.name, m.system?.cost, m.system?.bookPage]);
    for (const a of r?.ammo ?? []) lines.push([`${a.data.name} × ${a.qty}`, a.data.system?.cost, a.data.system?.bookPage]);
    const row = ([label, cost, page]) => `<div class="vd-line"><span>${esc(label)}</span><b>${yen(cost)}</b><span class="vd-dim">${esc(page ?? '')}</span></div>`;
    return `<div class="vd-price">
      <fieldset><legend>The bill</legend>${lines.map(row).join('')}
        <div class="vd-line vd-total"><span>Total</span><b>${yen(r?.totals?.cost)}</b></div></fieldset>
      ${(r?.warnings ?? []).length ? `<fieldset><legend>Warnings — the import still works</legend>${r.warnings.map(w => `<div class="vd-amber">⚠ ${esc(w)}</div>`).join('')}</fieldset>` : ''}
    </div>`;
  },

  /** Wire the wizard in `el`; `render()` recomputes and redraws. */
  wire(el, view, { render }) {
    const d = view.design;
    const on = (sel, fn, ev = 'click') => el.querySelectorAll(sel).forEach(b => b.addEventListener(ev, () => fn(b)));
    on('[data-wstep]', b => { view.step = Number(b.dataset.wstep); render(); });
    on('[data-wtype]', b => { view.ui.type = b.dataset.wtype; render(); });
    on('[data-wbase]', b => { d.base = b.dataset.wbase; view.step = 2; render(); });
    on('[data-wshelf]', b => { view.ui.shelf = b.dataset.wshelf; view.ui.q = ''; render(); });
    on('[data-wadd-mod]', b => {
      const levels = ModRatings.levelsOf(view.items[b.dataset.waddMod]);
      d.mods.push(levels ? { ref: b.dataset.waddMod, rating: Number(Object.keys(levels)[0]) } : { ref: b.dataset.waddMod });
      render();
    });
    on('[data-wadd-ammo]', b => { d.ammo.push({ ref: b.dataset.waddAmmo, qty: 1 }); render(); });
    on('[data-wremove]', b => { const [k, i] = b.dataset.wremove.split('.'); d[k].splice(Number(i), 1); render(); });
    on('[data-wmod-level]', b => { d.mods[b.dataset.wmodLevel].rating = Number(b.value); render(); }, 'change');
    on('[data-wammo-qty]', b => { d.ammo[b.dataset.wammoQty].qty = Math.max(1, Math.min(GearDesign.LIMITS.qty, Number(b.value) || 1)); render(); }, 'change');
    on('[data-wpath="name"]', b => { d.name = b.value; render(); }, 'change');
    const search = (sel, key) => {
      const s = el.querySelector(sel);
      s?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); view.ui[key] = s.value; render(); } });
      s?.addEventListener('change', () => { view.ui[key] = s.value; render(); });
    };
    el.querySelector('.vd-wall-mods')?.addEventListener('change', e => { view.ui.allMods = e.target.checked; render(); });
    search('.vd-wsearch', 'q');
    search('.vd-asearch', 'aq');
  },
};

const W = WeaponDesignerView;
