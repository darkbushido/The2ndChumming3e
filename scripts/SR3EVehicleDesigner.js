/**
 * 🛠 Vehicle Designer — build a vehicle or drone from a chassis and Design Points (R3R pp.109-121) · TODO 287, slice 2
 *
 * The rules are `scripts/data/vehicle-design.mjs` (the calculator) and `vehicle-design-actor.mjs` (design → vehicle); this
 * window only gathers the choices and shows the result. The maintainer's rulings (2026-11-07):
 *  - its own window, anyone may open it; Create goes through `sr3e.actor.create` (a player gets OWNER of the vehicle);
 *  - "compute, GM edits" — every stat stays editable on the vehicle sheet afterwards;
 *  - the design is stored on the vehicle (`flags.The2ndChumming3e.design`); the vehicle sheet's 🛠 Design button reopens it,
 *    and re-saving OFFERS the changed stats (old → new, each ticked) instead of writing over hand edits;
 *  - design options come from the catalogue (`data/design-options.mjs`, slice 3, 2026-11-08): each row has its inputs and
 *    computed figures, a typed figure overrides; typed rows (name, points, CF, Load) still work for anything else;
 *  - picked mods are embedded on Create; a re-save OFFERS the ones the vehicle lacks, and never removes one;
 *  - opened from the Actors directory header, the "SR3E Vehicle Designer" macro, and the vehicle sheet.
 * TODO 297 (the maintainer, 2026-11-08: "more of a shopping workflow"): a five-step wizard under a pinned result bar —
 * chassis cards by type (silhouettes, `data/designer-art.mjs`), power plant cards, the design options that fit
 * (`DesignOptions.misfit`), a mod shop by shelf with our own one-liners (`data/mod-catalog.mjs`) and a cart, then price.
 * What doesn't fit is hidden behind a "show all" switch, never refused. A stored design reopens on step 5.
 * Warn, never refuse: an over-maximum or an unpriced mod is a warning, and Create still works.
 */
import { CHASSIS, CATEGORIES, PLANTS } from './data/vehicle-design-tables.mjs';
import { VehicleDesign, CLASSES } from './data/vehicle-design.mjs';
import { VehicleDesignActor, FLAG, SOURCE_FLAG } from './data/vehicle-design-actor.mjs';
import { DesignOptions } from './data/design-options.mjs';
import { DesignerArt } from './data/designer-art.mjs';
import { ModCatalog, SHELVES } from './data/mod-catalog.mjs';

const SCOPE = 'The2ndChumming3e';
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const IMPROVE = [
  ['handling', 'Handling −'], ['handlingOffRoad', 'Off-road Handling −'], ['speed', 'Speed +'], ['accel', 'Acceleration +'],
  ['economySteps', 'Economy (+5% steps)'], ['cargo', 'Cargo + CF'], ['load', 'Load + kg'], ['signature', 'Signature +'],
];

const blankDesign = () => ({
  name: '', chassis: '', plant: '', improve: {}, freed: { cf: 0, load: 0 }, smartMaterials: false,
  options: [], mods: [], markUpExtra: 0, vehicleClass: 'standard', streetIndexExtra: 0, extraNuyen: 0,
});

export class SR3EVehicleDesigner extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    classes:  ['sr3e', 'sr3e-vehicle-designer'],
    tag:      'div',
    window:   { title: '🛠 Vehicle Designer', resizable: true },
    position: { width: 940, height: 760 },
  };

  /** Open a fresh design, or — with a vehicle — that vehicle's stored design (re-saving offers the changes). */
  static open(actor = null) {
    const app = new SR3EVehicleDesigner(actor);
    app.render(true);
    return app;
  }

  constructor(actor = null, options = {}) {
    super(options);
    this.actor = actor?.type === 'vehicle' ? actor : null;
    const stored = this.actor?.getFlag(SCOPE, FLAG);
    this.design = foundry.utils.mergeObject(blankDesign(), stored ? foundry.utils.deepClone(stored) : {});
    if (!this.design.name) this.design.name = this.actor?.name ?? '';
    this._modIndex = null;
    this.step = stored ? 5 : 1;   // a stored design reopens on its summary (the maintainer, 2026-11-08)
    this.ui = {};
  }

  get title() { return this.actor ? `🛠 Design — ${this.actor.name}` : '🛠 Vehicle Designer'; }

  /** Every vehicle mod in the packs, with its design figures — loaded once per window. */
  async _mods() {
    if (this._modIndex) return this._modIndex;
    const out = [];
    for (const pack of game.packs.filter(p => p.documentName === 'Item')) {
      const idx = await pack.getIndex({ fields: ['type', 'system.rating', 'system.designCost', 'system.designCf',
        'system.designLoad', 'system.cfCost', 'system.load', 'system.bookPage'] });
      for (const e of idx) if (e.type === 'vehiclemod') out.push({ ...e, uuid: e.uuid ?? `Compendium.${pack.collection}.Item.${e._id}` });
    }
    // One entry per name — the same mod in two books' packs is offered once (VehicleDesignActor.pickList).
    this._modAll = out;   // every copy, so a design saved before the de-duplication still finds its uuid
    return (this._modIndex = VehicleDesignActor.pickList(out));
  }

  _ctx() {
    const ch = VehicleDesign.chassis(this.design.chassis);
    const body = ch ? VehicleDesign.cell(ch.body, 0) : 0;
    const plant = VehicleDesign.plantRow(this.design.plant) ?? (ch ? VehicleDesign.plantsFor(ch.id, this.design.plant)[0] : null);
    return { body, chassis: ch?.dp ?? null, plant: plant ? VehicleDesign.cell(plant.dp, body) : null, pilot: null };
  }

  async _renderHTML() {
    const d = this.design;
    const r = VehicleDesign.evaluate(d);
    const ch = r.chassis ?? null;
    const step = ch ? this.step : 1;
    const div = document.createElement('div');
    div.className = 'sr3e-inner vd-wizard';

    const STEPS = [[1, 'Chassis', ch?.name], [2, 'Power plant', d.plant ? (PLANTS[VehicleDesign.plantRow(d.plant)?.plant ?? d.plant]?.name) : null],
      [3, 'Design options', d.options.length ? `${d.options.length} picked` : null], [4, 'Mods', d.mods.length ? `${d.mods.length} in cart` : null],
      [5, this.actor ? 'Price & save' : 'Price & create', null]];
    const tabs = STEPS.map(([n, label, sub]) => `<button type="button" class="vd-step ${n === step ? 'active' : ''}" data-step="${n}" ${n > 1 && !ch ? 'disabled' : ''}>
      <span class="vd-step-n">${n}</span> ${esc(label)}${sub ? `<small>${esc(sub)}</small>` : ''}</button>`).join('');

    let body = '';
    if (step === 1) body = this._stepChassis(d);
    else if (step === 2) body = this._stepPlant(d, ch, r);
    else if (step === 3) body = this._stepOptions(d, ch, r);
    else if (step === 4) body = this._stepMods(d, ch, await this._mods());
    else body = this._stepPrice(d, r);

    div.innerHTML = `
      ${this._resultBar(r)}
      <nav class="vd-steps">${tabs}</nav>
      <section class="vd-body">${body}</section>
      <footer class="vd-foot">
        <button type="button" class="vd-nav" data-step="${step - 1}" ${step === 1 ? 'disabled' : ''}>◀ Back</button>
        ${step < 5
          ? `<button type="button" class="vd-nav vd-next" data-step="${step + 1}" ${ch ? '' : 'disabled'}>Next ▶</button>`
          : `<button type="button" class="vd-save vd-next" ${ch ? '' : 'disabled'}>${this.actor ? '💾 Offer changes to the vehicle' : '🚗 Create vehicle'}</button>`}
      </footer>`;
    return div;
  }

  /** The pinned result bar — the design's stats and price, always at the top (the maintainer, 2026-11-08). */
  _resultBar(r) {
    const s = r.stats ?? {};
    const ch = r.chassis;
    const chip = (label, v, cls = '') => `<div class="vd-chip ${cls}"><span>${label}</span><b>${esc(v ?? '—')}</b></div>`;
    const over = (used, total) => (used != null && total != null && used > total ? 'vd-over' : '');
    const warn = (r.warnings ?? []).length;
    return `<header class="vd-result">
      <div class="vd-result-art">${ch ? DesignerArt.chassis(ch.category, ch.drone) : DesignerArt.chassis('car')}</div>
      <div class="vd-result-main">
        <input type="text" class="vd-name" data-path="name" value="${esc(this.design.name)}" placeholder="${esc(ch?.name ?? 'Name your vehicle')}"/>
        <div class="vd-chips">
          ${chip('Handling', s.handling != null ? `${s.handling}/${s.handlingOffRoad}` : null)}${chip('Speed', s.speed)}${chip('Accel', s.accel)}
          ${chip('Body', ch?.body)}${chip('Armor', ch?.armor)}${chip('Sig', s.sig)}
          ${chip('CF', r.cf?.total != null ? `${r.cf.used}/${r.cf.total}` : null, over(r.cf?.used, r.cf?.total))}
          ${chip('Load', r.load?.total != null ? `${r.load.used}/${r.load.total}` : null, over(r.load?.used, r.load?.total))}
          ${chip('Design Pts', r.dp?.total)}${chip('Cost', r.cost != null ? `${r.cost.toLocaleString()}¥` : null, 'vd-cost')}
          ${warn ? `<div class="vd-chip vd-warn" title="${esc(r.warnings.join('\n'))}"><span>⚠</span><b>${warn}</b></div>` : ''}
        </div>
      </div>
    </header>`;
  }

  /** Step 1 — type chips with silhouettes, then the chassis of that type as cards. */
  _stepChassis(d) {
    const cur = VehicleDesign.chassis(d.chassis);
    const cat = this.ui.cat ?? cur?.category ?? 'car';
    const drones = this.ui.drones ?? (cur ? cur.drone : false);
    const cats = Object.entries(CATEGORIES).filter(([k]) => CHASSIS.some(c => c.category === k && c.drone === drones));
    const chips = cats.map(([k, label]) => `<button type="button" class="vd-type ${k === cat ? 'active' : ''}" data-cat="${k}">
      ${DesignerArt.chassis(k, drones)}<span>${esc(label)}</span></button>`).join('');
    const list = CHASSIS.filter(c => c.category === cat && c.drone === drones);
    const cards = list.map(c => `<button type="button" class="vd-card ${c.id === d.chassis ? 'picked' : ''}" data-chassis="${c.id}">
      <div class="vd-card-art">${DesignerArt.chassis(c.category, c.drone)}</div>
      <div class="vd-card-name">${esc(c.name)}</div>
      <div class="vd-card-stats">
        <span>Body <b>${esc(c.body)}</b></span><span>Armor <b>${esc(c.armor ?? '—')}</b></span>
        <span>Handling <b>${esc(c.handling)}</b></span><span>CF <b>${esc(c.cf)}</b></span>
        <span>Seats <b>${esc(c.seating ?? '—')}</b></span><span>Pts <b>${esc(c.dp)}</b></span>
      </div>
      <div class="vd-card-page">${esc(c.page)}</div></button>`).join('');
    return `<div class="vd-row">
        <div class="vd-toggle"><button type="button" data-drones="0" class="${drones ? '' : 'active'}">Vehicles</button><button type="button" data-drones="1" class="${drones ? 'active' : ''}">Drones</button></div>
      </div>
      <div class="vd-types">${chips}</div>
      <div class="vd-grid">${cards || '<p class="vd-empty">No chassis of this type.</p>'}</div>`;
  }

  /** Step 2 — the plants this chassis offers, as cards; then tuning (improvements, smart materials). */
  _stepPlant(d, ch, r) {
    const rows = Object.keys(PLANTS).flatMap(code => VehicleDesign.plantsFor(ch.id, code));
    const body = VehicleDesign.bodyOf(ch);
    const v = x => VehicleDesign.cell(x, body);
    const curId = VehicleDesign.plantRow(d.plant)?.id ?? rows.find(p => p.plant === d.plant)?.id;
    const cards = rows.map(p => `<button type="button" class="vd-card ${p.id === curId ? 'picked' : ''}" data-plant="${esc(p.id)}">
      <div class="vd-card-art vd-plant-art">${DesignerArt.plant(p.plant)}</div>
      <div class="vd-card-name">${esc(PLANTS[p.plant]?.name ?? p.plant)}</div>
      <div class="vd-card-stats">
        <span>Speed <b>${esc(v(p.speed) ?? p.speed)}</b></span><span>Accel <b>${esc(v(p.accel) ?? p.accel)}</b></span>
        <span>Load <b>${esc(v(p.load) ?? p.load)}</b></span><span>Economy <b>${esc(v(p.econ) ?? p.econ ?? '—')}</b></span>
        <span>Sig <b>${esc(p.sig)}</b></span><span>Pts <b>${esc(v(p.dp) ?? p.dp)}</b></span>
      </div>
      <div class="vd-card-page">${esc(p.page)}</div></button>`).join('');
    const num = (path, val, w = 56) => `<input type="number" data-path="${path}" value="${esc(val ?? 0)}" style="width:${w}px"/>`;
    return `<div class="vd-grid">${cards || '<p class="vd-empty">The tables list no power plant for this chassis.</p>'}</div>
      ${d.plant ? `<details class="vd-tune" ${Object.values(d.improve ?? {}).some(Boolean) || d.smartMaterials ? 'open' : ''}>
        <summary>Tune it — improvements past the plant's starting figures (R3R pp.115-116)</summary>
        <div class="vd-tune-row">${IMPROVE.map(([k, l]) => `<label>${l} ${num(`improve.${k}`, d.improve?.[k])}</label>`).join('')}
          <label><input type="checkbox" data-path="smartMaterials" ${d.smartMaterials ? 'checked' : ''}/> Smart materials (p.118)</label>
          <label>Freed CF ${num('freed.cf', d.freed?.cf)}</label><label>Freed Load ${num('freed.load', d.freed?.load)}</label></div>
        ${r.stats ? `<div class="vd-hint">Speed ${r.stats.speed} of ${r.stats.speedMax} · Accel ${r.stats.accel} of ${r.stats.accelMax} · Load ${r.stats.load}</div>` : ''}
      </details>` : ''}`;
  }

  /** The fit context for a chassis and the current plant — what `misfit` reads. */
  _fitCtx(ch) {
    const plant = VehicleDesign.plantRow(this.design.plant)?.plant ?? (this.design.plant || null);
    const body = VehicleDesign.bodyOf(ch);
    return { category: ch.category, chassisId: ch.id, body, hasHull: /H/.test(String(ch.body)), maxCf: VehicleDesign.cell(ch.maxCf, body),
      plantCode: plant, plant, drone: !!ch.drone };
  }

  /** Step 3 — the options that fit, as cards; the picked ones as editable rows. */
  _stepOptions(d, ch, r) {
    const c = this._fitCtx(ch);
    const all = this.ui.allOptions;
    const priced = r.options ?? [];
    const picked = (d.options ?? []).map((x, i) => {
      const o = DesignOptions.get(x.id);
      const p = priced[i] ?? {};
      if (!o) return `<tr><td><input type="text" data-path="options.${i}.name" value="${esc(x.name)}"/></td>
        <td><input type="number" data-path="options.${i}.dp" value="${esc(x.dp)}" step="any" style="width:70px"/></td>
        <td><input type="number" data-path="options.${i}.cf" value="${esc(x.cf)}" step="any" style="width:50px"/></td>
        <td><input type="number" data-path="options.${i}.load" value="${esc(x.load)}" step="any" style="width:60px"/></td>
        <td><button type="button" data-remove="options.${i}" title="Remove">✕</button></td></tr>`;
      const fig = (k, w) => `<input type="number" data-path="options.${i}.${k}" data-blank="1" value="${esc(x[k])}" placeholder="${esc(p.computed?.[k] ?? '')}" step="any" style="width:${w}px" title="Blank = the computed figure"/>`;
      const inputs = o.inputs.map(([k, label]) => `<label>${esc(label)} <input type="${k === 'kind' ? 'text' : 'number'}" data-path="options.${i}.${k}" ${k === 'kind' ? '' : 'data-blank="1"'} value="${esc(x[k])}" style="width:${k === 'kind' ? 90 : 56}px"/></label>`).join(' ');
      return `<tr><td><b>${esc(o.name)}</b> <span class="vd-dim">${esc(o.page)}</span>${p.note ? `<div class="vd-dim">${esc(p.note)}</div>` : ''}<div>${inputs}</div>
        ${(p.warnings ?? []).map(w => `<div class="vd-amber">⚠ ${esc(w)}</div>`).join('')}</td>
        <td>${fig('dp', 70)}</td><td>${fig('cf', 50)}</td><td>${fig('load', 60)}</td>
        <td><button type="button" data-remove="options.${i}" title="Remove">✕</button></td></tr>`;
    }).join('');
    const groups = [...new Set(DesignOptions.OPTIONS.map(o => o.group))];
    let hidden = 0;
    const cards = groups.map(g => {
      const items = DesignOptions.OPTIONS.filter(o => o.group === g).map(o => {
        const why = DesignOptions.misfit(o.id, c);
        if (why && !all) { hidden++; return ''; }
        return `<div class="vd-card vd-opt ${why ? 'vd-misfit' : ''}">
          <div class="vd-card-name">${esc(o.name)}</div>
          ${o.note ? `<div class="vd-blurb">${esc(o.note)}</div>` : ''}
          ${why ? `<div class="vd-amber">⚠ ${esc(why)}</div>` : ''}
          <div class="vd-card-foot"><span class="vd-card-page">${esc(o.page)}</span><button type="button" data-add-option="${o.id}">+ Add</button></div></div>`;
      }).join('');
      return items ? `<h4 class="vd-group">${esc(g)}</h4><div class="vd-grid vd-grid-sm">${items}</div>` : '';
    }).join('');
    return `${picked ? `<table class="vd-picked"><tr><th>Picked</th><th>Points</th><th>CF</th><th>Load</th><th></th></tr>${picked}</table>` : '<p class="vd-empty">No design options yet — they are optional.</p>'}
      <div class="vd-row"><label class="vd-switch"><input type="checkbox" class="vd-all-options" ${all ? 'checked' : ''}/> Show options that don't fit${hidden ? ` (${hidden} hidden)` : ''}</label>
        <button type="button" data-add="options" title="A row you price yourself">+ Typed row</button></div>
      ${cards}`;
  }

  /** Step 4 — the mod shop: shelf tabs with icons, search, cards with what each does, and the cart. */
  _stepMods(d, ch, mods) {
    const c = this._fitCtx(ch);
    const all = this.ui.allMods;
    const q = (this.ui.q ?? '').toLowerCase();
    const shelf = this.ui.shelf ?? 'engine';
    const rows = mods.map(m => ({ m, card: ModCatalog.card(m.name), why: ModCatalog.misfit(m.name, c) }));
    const visible = rows.filter(x => all || !x.why);
    const count = id => visible.filter(x => x.card.shelf === id).length;
    const tabs = Object.entries(SHELVES).map(([id, label]) => `<button type="button" class="vd-shelf ${id === shelf && !q ? 'active' : ''}" data-shelf="${id}" title="${esc(label)}">
      ${DesignerArt.shelf(id)}<span>${esc(label)}</span><small>${count(id)}</small></button>`).join('');
    const shown = visible.filter(x => (q ? `${x.m.name} ${x.card.blurb}`.toLowerCase().includes(q) : x.card.shelf === shelf));
    const inCart = uuid => d.mods.filter(x => x.uuid === uuid).length;
    const ctx = this._ctx();
    const cards = shown.map(({ m, card, why }) => {
      const row = VehicleDesignActor.modRow(m, { ...ctx, level: m.system?.rating ?? 1 });
      const n = inCart(m.uuid);
      return `<div class="vd-card vd-mod ${why ? 'vd-misfit' : ''} ${n ? 'picked' : ''}">
        <div class="vd-mod-head"><span class="vd-mod-icon">${DesignerArt.shelf(card.shelf)}</span>
          <div class="vd-card-name">${esc(String(m.name).replace(/\s*\(Vehicle\)$/, ''))}</div></div>
        <div class="vd-blurb">${esc(card.blurb || 'See the book page.')}</div>
        ${why ? `<div class="vd-amber">⚠ ${esc(why)}</div>` : ''}
        <div class="vd-card-stats"><span>Pts <b>${row.unpriced ? '?' : esc(row.dp)}</b></span><span>CF <b>${esc(row.cf)}</b></span><span>Load <b>${esc(row.load)}</b></span>
          ${m.system?.rating != null ? '<span class="vd-dim">rated</span>' : ''}</div>
        <div class="vd-card-foot"><span class="vd-card-page">${esc(m.system?.bookPage ?? '')}</span>
          <button type="button" data-add-mod="${esc(m.uuid)}">${n ? `+ Another (${n})` : '+ Add'}</button></div></div>`;
    }).join('');
    const hidden = rows.length - visible.length;
    const cart = d.mods.map((x, i) => `<div class="vd-cart-item">
      <span class="vd-cart-name">${esc(String(x.name).replace(/\s*\(Vehicle\)$/, ''))}${x.unpriced ? ' <span class="vd-amber" title="No design cost printed — type the points (R3R p.112)">⚠</span>' : ''}</span>
      <label>Lv <input type="number" data-path="mods.${i}.level" value="${esc(x.level ?? 1)}" min="1" style="width:44px"/></label>
      <label>Pts <input type="number" data-path="mods.${i}.dp" value="${esc(x.dp)}" step="any" style="width:60px"/></label>
      <span class="vd-dim">CF ${esc(x.cf)} · ${esc(x.load)} kg</span>
      <button type="button" data-remove="mods.${i}" title="Remove">✕</button></div>`).join('');
    return `<div class="vd-shop">
      <div class="vd-shop-main">
        <div class="vd-row"><input type="search" class="vd-search" placeholder="Search every mod…" value="${esc(this.ui.q ?? '')}"/>
          <label class="vd-switch"><input type="checkbox" class="vd-all-mods" ${all ? 'checked' : ''}/> Show mods that don't fit${hidden ? ` (${hidden} hidden)` : ''}</label></div>
        <nav class="vd-shelves">${tabs}</nav>
        <div class="vd-grid vd-grid-sm">${cards || '<p class="vd-empty">Nothing here for this vehicle.</p>'}</div>
      </div>
      <aside class="vd-cart"><h4>🛒 Cart <small>${d.mods.length}</small></h4>${cart || '<p class="vd-empty">Add mods from the shelves.</p>'}</aside>
    </div>`;
  }

  /** Step 5 — class and price adjustments, the points line by line, every warning, and Create / Offer. */
  _stepPrice(d, r) {
    const num = (path, v, w = 70, step = 1) => `<input type="number" data-path="${path}" value="${esc(v ?? 0)}" step="${step}" style="width:${w}px"/>`;
    return `<div class="vd-price">
      <fieldset><legend>Price (R3R p.113)</legend>
        <label>Class <select data-path="vehicleClass">${Object.keys(CLASSES).map(k => `<option value="${k}" ${k === d.vehicleClass ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
        <label>Mark-Up + ${num('markUpExtra', d.markUpExtra, 60, 'any')}</label>
        <label>Street Index + ${num('streetIndexExtra', d.streetIndexExtra, 60, 'any')}</label>
        <label>Extra ¥ ${num('extraNuyen', d.extraNuyen, 90)}</label>
        <div class="vd-hint">Street Index ${esc(r.streetIndex ?? '—')} · Availability ${esc(r.availability?.text ?? '—')}</div>
      </fieldset>
      <fieldset><legend>Design Points, line by line</legend>
        ${(r.dp?.lines ?? []).map(l => `<div class="vd-line"><span>${esc(l.label)}</span><b>${l.points}</b><span class="vd-dim">${esc(l.page ?? '')}</span></div>`).join('')}
        <div class="vd-line vd-total"><span>Total</span><b>${esc(r.dp?.total ?? 0)}</b></div>
      </fieldset>
      ${(r.warnings ?? []).length ? `<fieldset><legend>Warnings — Create still works</legend>${r.warnings.map(w => `<div class="vd-amber">⚠ ${esc(w)}</div>`).join('')}</fieldset>` : ''}
    </div>`;
  }

  _replaceHTML(result, content) { content.replaceChildren(result); }

  _onRender() {
    const el = this.element;
    el.querySelectorAll('[data-path]').forEach(input => input.addEventListener('change', () => {
      const path = input.dataset.path;
      let v = input.type === 'checkbox' ? input.checked : input.value;
      // A catalogue figure or input left blank means "the computed / suggested one", not 0.
      if (input.type === 'number') v = input.dataset.blank && input.value === '' ? '' : Number(v) || 0;
      foundry.utils.setProperty(this.design, path, v);
      if (path === 'chassis') this.design.plant = '';
      if (/^mods\.\d+\.level$/.test(path)) this._repriceMod(Number(path.split('.')[1]));
      if (path === 'chassis' || path === 'plant') this.design.mods.forEach((_m, i) => this._repriceMod(i));
      this.render();
    }));
    el.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => {
      this.design[b.dataset.add].push({ name: '', dp: 0, cf: 0, load: 0 });
      this.render();
    }));
    el.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => {
      const [kind, i] = b.dataset.remove.split('.');
      this.design[kind].splice(Number(i), 1);
      this.render();
    }));
    const on = (sel, fn) => el.querySelectorAll(sel).forEach(b => b.addEventListener('click', () => fn(b)));
    on('[data-step]', b => { this.step = Number(b.dataset.step); this.render(); });
    on('[data-cat]', b => { this.ui.cat = b.dataset.cat; this.render(); });
    on('[data-drones]', b => { this.ui.drones = b.dataset.drones === '1'; this.ui.cat = null; this.render(); });
    on('[data-chassis]', b => {
      if (this.design.chassis !== b.dataset.chassis) { this.design.chassis = b.dataset.chassis; this.design.plant = ''; }
      const plants = Object.keys(PLANTS).flatMap(code => VehicleDesign.plantsFor(b.dataset.chassis, code));
      if (plants.length === 1) this.design.plant = plants[0].id;   // one choice: take it
      this.design.mods.forEach((_m, i) => this._repriceMod(i));
      this.step = 2;
      this.render();
    });
    on('[data-plant]', b => { this.design.plant = b.dataset.plant; this.design.mods.forEach((_m, i) => this._repriceMod(i)); this.render(); });
    on('[data-add-option]', b => { const row = DesignOptions.newRow(b.dataset.addOption); if (row) this.design.options.push(row); this.render(); });
    on('[data-shelf]', b => { this.ui.shelf = b.dataset.shelf; this.ui.q = ''; this.render(); });
    on('[data-add-mod]', b => {
      const m = this._modIndex?.find(x => x.uuid === b.dataset.addMod);
      if (!m) return;
      const row = VehicleDesignActor.modRow(m, this._ctx());
      this.design.mods.push({ ...row, uuid: m.uuid, level: m.system?.rating ?? 1 });
      this.render();
    });
    el.querySelector('.vd-all-options')?.addEventListener('change', e => { this.ui.allOptions = e.target.checked; this.render(); });
    el.querySelector('.vd-all-mods')?.addEventListener('change', e => { this.ui.allMods = e.target.checked; this.render(); });
    const search = el.querySelector('.vd-search');
    search?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); this.ui.q = search.value; this.render(); } });
    search?.addEventListener('change', () => { this.ui.q = search.value; this.render(); });
    el.querySelector('.vd-save')?.addEventListener('click', () => this._save());
  }

  /** Re-price a picked mod from its design figures after its level, the chassis or the plant changed. */
  _repriceMod(i) {
    const m = this.design.mods[i];
    const src = m?.uuid ? this._modAll?.find(x => x.uuid === m.uuid) : null;
    if (!src) return;
    const row = VehicleDesignActor.modRow(src, { ...this._ctx(), level: m.level ?? 1 });
    Object.assign(m, { dp: row.dp, cf: row.cf, load: row.load, unpriced: row.unpriced });
  }

  async _save() {
    const result = VehicleDesign.evaluate(this.design);
    if (!result.chassis) return;
    const values = VehicleDesignActor.values(result);
    const design = foundry.utils.deepClone(this.design);
    if (!this.actor) return this._create(values, design, result);

    // Re-save: OFFER the changes, each ticked (the maintainer, 2026-11-07) — never write over a hand edit unasked.
    const rows = VehicleDesignActor.changes(this.actor.toObject(), values);
    const newMods = VehicleDesignActor.missingMods(design.mods, this.actor.items.map(i => i.toObject()));
    let ticked = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: `Design changes — ${this.actor.name}` },
      content: (rows.length
        ? `<p>Tick the stats to take from the design:</p><table>${rows.map(x => `<tr><td><input type="checkbox" name="${x.field}" checked/></td>
            <td>${esc(x.label)}</td><td>${esc(x.from)}</td><td>→</td><td><b>${esc(x.to)}</b></td></tr>`).join('')}</table>`
        : '<p>The stats already match the design. The design itself will be saved.</p>')
        + (newMods.length
          ? `<p>Mods in the design the vehicle does not carry — tick to add (none is ever removed):</p><table>${newMods.map((m, i) =>
            `<tr><td><input type="checkbox" name="mod:${i}" checked/></td><td>${esc(m.name)}${m.level != null ? ` ${esc(m.level)}` : ''}</td></tr>`).join('')}</table>`
          : ''),
      buttons: [
        { label: 'Apply ticked', action: 'ok', default: true, callback: (_e, _b, dlg) => {
          ticked = new Set([...dlg.element.querySelectorAll('input[type=checkbox]:checked')].map(c => c.name));
        } },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    if (!ticked) return;
    await this.actor.update({ ...VehicleDesignActor.accepted(rows, ticked), [`flags.${SCOPE}.${FLAG}`]: design });
    const added = await this._embedMods(this.actor, newMods.filter((_m, i) => ticked.has(`mod:${i}`)));
    const stats = [...ticked].filter(k => !k.startsWith('mod:')).length;
    ui.notifications.info(`${this.actor.name}: ${stats} stat(s) taken from the design, ${added} mod(s) added.`);
  }

  /** Copy the picked mods onto the vehicle from their compendium documents, at the design's level. Returns how many. */
  async _embedMods(actor, mods) {
    const docs = [];
    for (const m of mods) {
      const src = m.uuid ? await fromUuid(m.uuid).catch(() => null) : null;
      if (!src) { ui.notifications.warn(`${m.name}: its compendium entry is gone — add it on the sheet.`); continue; }
      const data = VehicleDesignActor.modItemData(src.toObject(), m);
      // The source goes in our own flag: a player's embedded create carrying the core compendium-source stat is silently
      // dropped (seen live, §82, 2026-11-08), so never write that stat here.
      foundry.utils.setProperty(data, `flags.${SCOPE}.${SOURCE_FLAG}`, m.uuid);
      docs.push(data);
    }
    const made = docs.length ? await actor.createEmbeddedDocuments('Item', docs) : [];
    if ((made?.length ?? 0) < docs.length) {
      ui.notifications.warn(`${actor.name}: only ${made?.length ?? 0} of ${docs.length} mod(s) were added — drop the rest on the sheet.`);
    }
    return made?.length ?? 0;
  }

  async _create(values, design, result) {
    const name = String(design.name || result.chassis.name).trim();
    let created;
    try {
      const res = await game.sr3e.SR3EQuery.asGM('sr3e.actor.create', { name });
      created = res?.uuid ? await fromUuid(res.uuid) : null;
    } catch (err) {
      console.error('SR3E | vehicle design create failed:', err);
      ui.notifications.error('Could not create the vehicle — is a GM connected?');
      return;
    }
    if (!created) return;
    await created.update({ ...VehicleDesignActor.update(values), [`flags.${SCOPE}.${FLAG}`]: design });
    await this._embedMods(created, VehicleDesignActor.missingMods(design.mods, []));
    this.actor = created;
    if (created.isOwner) created.sheet.render(true);
    this.render();
  }
}
