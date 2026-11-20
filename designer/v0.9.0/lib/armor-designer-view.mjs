/**
 * An armour designer in the 🛠 Vehicle Designer's style — type chips, armour cards, a mods shop with a cart, price ·
 * TODO 305. Pure: no Foundry. The web gear designer's 🛡 Armour tab runs it.
 *
 * The maintainer, 2026-11-19 (grilling): four chips by name (clothing, body armour, helmets, shields); two shelves — the
 * Cannon Companion modifications (CC pp.52-53, gel packs among them) and the SR3 p.284 helmet options; one of each mod in
 * the cart, its level changed there. Every figure comes from `GearDesign.assembleArmor` (armor-mods.mjs), handed in as
 * `view.r`; its warnings show on the page — never a refusal.
 *
 *   view = { design (a GearDesign armour design), ui, step, items ({ ref: catalogue doc }), r (assembleArmor's result),
 *            img(ref) → url | '', finish() → html (step 3's buttons) }
 */
import { ModRatings } from './mod-ratings.mjs';
import { GearDesign } from './gear-design.mjs';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const yen = n => `${Math.round(Number(n) || 0).toLocaleString()}¥`;
const plain = n => String(n ?? '').replace(/\s*\(Armor\)/i, '');

/** Step 1's chips, in order. */
export const ARMOR_TYPES = [['clothing', 'Clothing'], ['body', 'Body armour'], ['helmet', 'Helmets'], ['shield', 'Shields']];
/** Step 2's shelves: the CC modifications (gear items), the SR3 p.284 helmet options (armour items). */
export const ARMOR_SHELVES = [['mod', 'Modifications (CC)'], ['option', 'Helmet options']];
export const STEPS = [[1, 'Armour'], [2, 'Modifications'], [3, 'Price']];
const PAGE = 60;

const CLOTHING = /\b(cloth|clothing|shirt|slacks|tux|suit|coat|duster|dress|jumpsuit|gown|shawl|skirt|blouse|lined|gloves?|parka|cloak|robe|uniform|outfit)\b/i;
const BODY = /\b(jacket|vest|plate|body\s*armou?r|military|security|form-?fitting|full|camo|riot|chain|bodysuit|null suit|diving|helmet\s*&)/i;

export const ArmorDesignerView = {
  /** The chip an armour sits under — by its name (the packs carry no armour category). Body armour wins over clothing. */
  typeOf(item) {
    const n = String(item?.name ?? '');
    if (/\bshield\b/i.test(n)) return 'shield';
    if (/\bhelmet\b/i.test(n)) return 'helmet';
    if (/\b(jacket|vest|plate|military|security|form-?fitting|chain)\b/i.test(n) && !/\bshirt\b/i.test(n)) return 'body';
    if (CLOTHING.test(n)) return 'clothing';
    return BODY.test(n) ? 'body' : 'clothing';
  },

  /** The shelf a catalogue mod sits on. */
  shelfOf(mod) { return mod?.type === 'armor' ? 'option' : 'mod'; },

  html(view) {
    const { design: d, r } = view;
    const base = view.items[d.base] ?? null;
    const step = base ? view.step : 1;
    const subs = { 1: base?.name, 2: d.mods.length ? `${d.mods.length} in cart` : null };
    const tabs = STEPS.map(([n, label]) => `<button type="button" class="vd-step ${n === step ? 'active' : ''} ${n < step ? 'done' : ''}" data-astep="${n}" ${n > 1 && !base ? 'disabled' : ''}>
      <span class="vd-step-n">${n}</span><span class="vd-step-text"><span class="vd-step-label">${esc(label)}</span>${subs[n] ? `<small>${esc(subs[n])}</small>` : ''}</span></button>`).join('');
    const body = step === 1 ? A.stepArmor(view) : step === 2 ? A.stepMods(view) : A.stepPrice(view);
    return `${A.resultBar(view, base, r)}
      <nav class="vd-steps">${tabs}</nav>
      <section class="vd-body">${body}</section>
      <footer class="vd-foot">
        <button type="button" class="vd-nav" data-astep="${step - 1}" ${step === 1 ? 'disabled' : ''}>◀ Back</button>
        ${step < 3 ? `<button type="button" class="vd-nav vd-next" data-astep="${step + 1}" ${base ? '' : 'disabled'}>Next ▶</button>` : (view.finish?.() ?? '')}
      </footer>`;
  },

  /** The armour's picture: its pack icon, else the type's emoji. */
  pic(view, ref, item) {
    const src = view.img?.(ref);
    return src ? `<img src="${esc(src)}" alt="" loading="lazy"/>` : `<span class="vd-emoji">${{ helmet: '⛑', shield: '🛡', body: '🦺', clothing: '🧥' }[A.typeOf(item)]}</span>`;
  },

  /** The pinned bar: the armour, its name, and what the build comes to. */
  resultBar(view, base, r) {
    const s = base?.system ?? {};
    const t = r?.totals ?? {};
    const chip = (label, v, cls = '') => `<div class="vd-chip ${cls}"><span>${label}</span><b>${esc(v ?? '—')}</b></div>`;
    const changed = (label, now, was) => chip(label, now, base && String(now) !== String(was) ? 'vd-changed' : '');
    const warn = (r?.warnings ?? []).length;
    const prot = (t.protections ?? []).map(p => `${p.short ?? p.label} ${p.value}`).join(', ');
    return `<header class="vd-result">
      <div class="vd-result-art">${base ? A.pic(view, view.design.base, base) : ''}</div>
      <div class="vd-result-main">
        <input type="text" class="vd-name" data-apath="name" value="${esc(view.design.name)}" placeholder="${esc(base?.name ?? 'Pick an armour')}" maxlength="${GearDesign.LIMITS.name}"/>
        <div class="vd-chips">
          ${chip('Ballistic', base ? t.ballistic : null)}${chip('Impact', base ? t.impact : null)}
          ${changed('Conceal', base ? (t.conceal ?? s.concealability) : null, s.concealability)}
          ${changed('Weight', base ? t.weight : null, s.weight)}
          ${chip('Hardened', base ? (t.hardened ? (t.gel ? 'gel packs' : 'yes') : 'no') : null)}
          ${chip('Cost', base ? yen(t.cost) : null, 'vd-cost')}
        </div>
        <div class="vd-chips vd-chips-book">
          ${changed('Avail', base ? (t.availability ?? s.availability) : null, s.availability)}${changed('SI', base ? (t.streetIndex ?? s.streetIndex) : null, s.streetIndex)}
          ${chip('Legality', s.legality)}${chip('Mod points', base ? `${t.points}/${t.caps?.total}` : null)}
          ${prot ? chip('Protects', prot) : ''}
          ${warn ? `<div class="vd-chip vd-warn" title="${esc(r.warnings.join('\n'))}"><span>⚠</span><b>${warn}</b></div>` : ''}
        </div>
      </div>
    </header>`;
  },

  /** Step 1 — the four chips, then that type's armour as picture cards. */
  stepArmor(view) {
    const all = Object.entries(view.items).filter(([, i]) => i.kind === 'armor');
    const cur = view.items[view.design.base];
    const type = view.ui.type ?? (cur ? A.typeOf(cur) : 'body');
    const q = (view.ui.q ?? '').toLowerCase();
    const chips = ARMOR_TYPES.map(([id, label]) => `<button type="button" class="vd-type ${id === type && !q ? 'active' : ''}" data-atype="${id}">
      <span>${esc(label)} <small>${all.filter(([, a]) => A.typeOf(a) === id).length}</small></span></button>`).join('');
    const list = all.filter(([, a]) => (q ? a.name.toLowerCase().includes(q) : A.typeOf(a) === type)).sort(([, a], [, b]) => a.name.localeCompare(b.name));
    const cards = list.slice(0, PAGE).map(([ref, a]) => {
      const s = a.system;
      return `<button type="button" class="vd-card ${ref === view.design.base ? 'picked' : ''}" data-abase="${esc(ref)}">
        <div class="vd-card-art">${A.pic(view, ref, a)}</div>
        <div class="vd-card-name">${esc(a.name)}</div>
        <div class="vd-card-stats"><span>B/I <b>${esc(s.ballistic ?? 0)}/${esc(s.impact ?? 0)}</b></span><span>Conc <b>${esc(s.concealability ?? '—')}</b></span>
          <span>kg <b>${esc(s.weight ?? '—')}</b></span><span>¥ <b>${esc(Number(s.cost || 0).toLocaleString())}</b></span></div>
        <div class="vd-card-page">${esc(s.bookPage)}</div></button>`;
    }).join('');
    const more = list.length > PAGE ? `<p class="vd-dim">${list.length - PAGE} more — search to narrow.</p>` : '';
    return `<div class="vd-row"><input type="search" class="vd-asearch-armor" placeholder="Search every armour…" value="${esc(view.ui.q ?? '')}"/></div>
      <div class="vd-types">${chips}</div><div class="vd-grid">${cards || '<p class="vd-empty">No armour of this type.</p>'}</div>${more}`;
  },

  /** Step 2 — the two shelves, search, cards, and the cart with levels. One of each mod (the maintainer). */
  stepMods(view) {
    const { design: d, r } = view;
    const q = (view.ui.mq ?? '').toLowerCase();
    const shelf = view.ui.shelf ?? 'mod';
    const mods = Object.entries(view.items).filter(([, i]) => i.kind === 'amod');
    const inCart = ref => d.mods.some(x => x.ref === ref);
    const tabs = ARMOR_SHELVES.map(([id, label]) => `<button type="button" class="vd-shelf ${id === shelf && !q ? 'active' : ''}" data-ashelf="${id}">
      <span>${esc(label)}</span><small>${mods.filter(([, m]) => A.shelfOf(m) === id).length}</small></button>`).join('');
    const shown = mods.filter(([, m]) => (q ? m.name.toLowerCase().includes(q) : A.shelfOf(m) === shelf)).sort(([, a], [, b]) => a.name.localeCompare(b.name));
    const cards = shown.slice(0, PAGE).map(([ref, m]) => {
      const levels = ModRatings.levelsOf(m);
      const n = inCart(ref);
      return `<div class="vd-card vd-mod ${n ? 'picked' : ''}">
        <div class="vd-card-name">${esc(plain(m.name))}</div>
        <div class="vd-card-stats"><span>¥ <b>${esc(String(m.system.cost ?? '—'))}</b></span><span>Avail <b>${esc(m.system.availability ?? '—')}</b></span>
          ${levels ? `<span class="vd-dim">levels ${esc(Object.keys(levels)[0])}–${esc(Object.keys(levels).at(-1))}</span>` : ''}</div>
        <div class="vd-card-foot"><span class="vd-card-page">${esc(m.system.bookPage ?? '')}</span>
          ${n ? '<span class="vd-in-cart">✓ In cart</span>' : `<button type="button" data-aadd-mod="${esc(ref)}">+ Add</button>`}</div></div>`;
    }).join('');
    const installed = r?.armor?.system?.installed ?? [];
    const cart = d.mods.map((x, i) => {
      const m = view.items[x.ref];
      const levels = m && ModRatings.levelsOf(m);
      const got = installed[i];
      return `<div class="vd-cart-item">
        <span class="vd-cart-name">${esc(plain(m?.name ?? x.ref))}</span>
        ${levels ? `<label>Lv <select data-amod-level="${i}">${Object.keys(levels).map(l => `<option value="${l}" ${Number(l) === x.rating ? 'selected' : ''}>${l}</option>`).join('')}</select></label>` : ''}
        <span class="vd-dim">${got ? (/gel/i.test(got.name) ? '×5 armour price' : yen(got.system?.cost)) : '—'}</span>
        <button type="button" data-aremove="${i}" title="Remove">✕</button></div>`;
    }).join('');
    const warns = (r?.warnings ?? []).map(w => `<div class="vd-amber">⚠ ${esc(w)}</div>`).join('');
    return `<div class="vd-shop">
      <div class="vd-shop-main">
        <div class="vd-row"><input type="search" class="vd-msearch" placeholder="Search every modification…" value="${esc(view.ui.mq ?? '')}"/></div>
        <nav class="vd-shelves">${tabs}</nav>
        <div class="vd-grid vd-grid-sm">${cards || '<p class="vd-empty">Nothing on this shelf.</p>'}</div>
      </div>
      <aside class="vd-cart"><h4>🛒 Cart <small>${d.mods.length}</small></h4>${cart || '<p class="vd-empty">Add modifications from the shelves.</p>'}
        <p class="vd-dim">Mod points ${r?.totals?.points ?? 0} of ${r?.totals?.caps?.total ?? 0}; one mod at most ${r?.totals?.caps?.single ?? 0} (CC p.52).</p>${warns}</aside>
    </div>`;
  },

  /** Step 3 — the bill and every warning. */
  stepPrice(view) {
    const { design: d, r } = view;
    const base = view.items[d.base];
    const t = r?.totals ?? {};
    const gel = (r?.armor?.system?.installed ?? []).find(m => /gel/i.test(m.name));
    const lines = [[base?.name, base?.system?.cost, base?.system?.bookPage]];
    if (gel) lines.push([`${plain(gel.name)} — the armour's price ×5 in all`, num(base?.system?.cost) * 4, gel.system?.bookPage]);
    for (const m of (r?.armor?.system?.installed ?? []).filter(x => x !== gel)) lines.push([`${plain(m.name)}${m.system?.rating ? ` ${m.system.rating}` : ''}`, m.system?.cost, m.system?.bookPage]);
    const row = ([label, cost, page]) => `<div class="vd-line"><span>${esc(label)}</span><b>${yen(cost)}</b><span class="vd-dim">${esc(page ?? '')}</span></div>`;
    const prot = (t.protections ?? []).map(p => `<div class="vd-line"><span>${esc(p.label)}</span><b>${esc(p.value)}</b></div>`).join('');
    return `<div class="vd-price">
      <fieldset><legend>The bill</legend>${lines.map(row).join('')}
        <div class="vd-line vd-total"><span>Total</span><b>${yen(t.cost)}</b></div></fieldset>
      <fieldset><legend>As built</legend>
        <div class="vd-line"><span>Ballistic / Impact</span><b>${esc(t.ballistic)}/${esc(t.impact)}${t.hardened ? ' hardened' : ''}</b></div>
        <div class="vd-line"><span>Concealability</span><b>${esc(t.conceal ?? '—')}</b></div>
        <div class="vd-line"><span>Weight</span><b>${esc(t.weight)} kg</b></div>
        <div class="vd-line"><span>Availability</span><b>${esc(t.availability ?? '—')}</b></div>
        <div class="vd-line"><span>Street Index</span><b>${esc(t.streetIndex ?? '—')}</b></div>${prot}</fieldset>
      ${(r?.warnings ?? []).length ? `<fieldset><legend>Warnings — the import still works</legend>${r.warnings.map(w => `<div class="vd-amber">⚠ ${esc(w)}</div>`).join('')}</fieldset>` : ''}
    </div>`;
  },

  /** Wire the wizard in `el`; `render()` recomputes and redraws. */
  wire(el, view, { render }) {
    const d = view.design;
    const on = (sel, fn, ev = 'click') => el.querySelectorAll(sel).forEach(b => b.addEventListener(ev, () => fn(b)));
    on('[data-astep]', b => { view.step = Number(b.dataset.astep); render(); });
    on('[data-atype]', b => { view.ui.type = b.dataset.atype; view.ui.q = ''; render(); });
    on('[data-abase]', b => { d.base = b.dataset.abase; view.step = 2; render(); });
    on('[data-ashelf]', b => { view.ui.shelf = b.dataset.ashelf; view.ui.mq = ''; render(); });
    on('[data-aadd-mod]', b => {
      const ref = b.dataset.aaddMod;
      if (d.mods.some(x => x.ref === ref)) return;   // one of each — its level changes in the cart
      const levels = ModRatings.levelsOf(view.items[ref]);
      d.mods.push(levels ? { ref, rating: Number(Object.keys(levels)[0]) } : { ref });
      render();
    });
    on('[data-aremove]', b => { d.mods.splice(Number(b.dataset.aremove), 1); render(); });
    on('[data-amod-level]', b => { d.mods[b.dataset.amodLevel].rating = Number(b.value); render(); }, 'change');
    on('[data-apath="name"]', b => { d.name = b.value; render(); }, 'change');
    const search = (sel, key) => {
      const s = el.querySelector(sel);
      s?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); view.ui[key] = s.value; render(); } });
      s?.addEventListener('change', () => { view.ui[key] = s.value; render(); });
    };
    search('.vd-asearch-armor', 'q');
    search('.vd-msearch', 'mq');
  },
};

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const A = ArmorDesignerView;
