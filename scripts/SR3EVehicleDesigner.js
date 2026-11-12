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
 * Second pass (the maintainer's feedback, 2026-11-08): a drawing and a one-liner per kind of chassis
 * (`data/chassis-catalog.mjs`); towed chassis take no plant; tuning laid out start + added = result (max), every control
 * with a tooltip; once-per-vehicle mods can't be added twice; rated mods show their maximum level; the cart says why it warns.
 * Warn, never refuse: an over-maximum or an unpriced mod is a warning, and Create still works.
 */
import { CHASSIS, CATEGORIES, PLANTS } from './data/vehicle-design-tables.mjs';
import { VehicleDesign, CLASSES, RATES, SMART } from './data/vehicle-design.mjs';
import { VehicleDesignActor, FLAG, SOURCE_FLAG, TOW_FLAG, MAX_TRAILERS } from './data/vehicle-design-actor.mjs';
import { DesignOptions, SHOPS } from './data/design-options.mjs';
import { DesignerArt, tokenImage } from './data/designer-art.mjs';
import { TokenScale } from './data/token-scale.mjs';
import { ModCatalog, SHELVES } from './data/mod-catalog.mjs';
import { ChassisCatalog } from './data/chassis-catalog.mjs';
import { VehicleMounts } from './data/vehicle-mounts.mjs';

const SCOPE = 'The2ndChumming3e';
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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
  static open(actor = null, options = {}) {
    const app = new SR3EVehicleDesigner(actor, options);
    app.render(true);
    return app;
  }

  constructor(actor = null, options = {}) {
    super(options);
    this.actor = actor?.type === 'vehicle' ? actor : null;
    // Designing the vehicle that tows this trailer (`towing`), or a trailer for this tractor (`towedBy`): the new vehicle
    // is linked when it is created (the maintainer, 2026-11-09: a tractor and up to five trailers, R3R p.193).
    this.towing = options.towing ?? null;
    this.towedBy = options.towedBy ?? null;
    const stored = this.actor?.getFlag(SCOPE, FLAG);
    this.design = foundry.utils.mergeObject(blankDesign(), stored ? foundry.utils.deepClone(stored) : {});
    if (!this.design.name) this.design.name = this.actor?.name ?? '';
    this._modIndex = null;
    this.step = stored ? 5 : 1;   // a stored design reopens on its summary (the maintainer, 2026-11-08)
    this.ui = {};
  }

  get title() {
    if (this.actor) return `🛠 Design — ${this.actor.name}`;
    if (this.towing) return `🛠 Vehicle Designer — tow vehicle for ${this.towing.name}`;
    return this.towedBy ? `🛠 Vehicle Designer — a trailer for ${this.towedBy.name}` : '🛠 Vehicle Designer';
  }

  /** Every vehicle mod in the packs, with its design figures — loaded once per window. */
  async _mods() {
    if (this._modIndex) return this._modIndex;
    const out = [];
    for (const pack of game.packs.filter(p => p.documentName === 'Item')) {
      const idx = await pack.getIndex({ fields: ['type', 'system.rating', 'system.designCost', 'system.designCf',
        'system.designLoad', 'system.cfCost', 'system.load', 'system.bookPage'] });
      // Only books the GM has turned on are offered (the maintainer, 2026-11-09: "they shouldnt be there if i cant view the
      // book"); every copy is still kept so a saved design finds its mods.
      const allowed = game.sr3e?.SR3ESourceBooks?.packAllowed(pack) ?? true;
      for (const e of idx) if (e.type === 'vehiclemod') out.push({ ...e, uuid: e.uuid ?? `Compendium.${pack.collection}.Item.${e._id}`, allowed });
    }
    // One entry per name — the same mod in two books' packs is offered once (VehicleDesignActor.pickList).
    this._modAll = out;   // every copy, so a design saved before the de-duplication still finds its uuid
    return (this._modIndex = VehicleDesignActor.pickList(out.filter(e => e.allowed)));
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

    const towed = ch && ChassisCatalog.card(ch.id).towed;
    const STEPS = [[1, 'Chassis', ch?.name], [2, 'Power plant', towed ? 'Towed' : d.plant ? (PLANTS[VehicleDesign.plantRow(d.plant)?.plant ?? d.plant]?.name) : null],
      [3, 'Design options', d.options.length ? `${d.options.length} picked` : null], [4, 'Mods', d.mods.length ? `${d.mods.length} in cart` : null],
      [5, this.actor ? 'Price & save' : 'Price & create', null]];
    const tabs = STEPS.map(([n, label, sub]) => `<button type="button" class="vd-step ${n === step ? 'active' : ''} ${n < step ? 'done' : ''}" data-step="${n}" ${n > 1 && !ch ? 'disabled' : ''}>
      <span class="vd-step-n">${n}</span><span class="vd-step-text"><span class="vd-step-label">${esc(label)}</span>${sub ? `<small>${esc(sub)}</small>` : ''}</span></button>`).join('');

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
          : `${this._towButton(ch)}<button type="button" class="vd-save vd-next" ${ch ? '' : 'disabled'}>${this.actor ? '💾 Offer changes to the vehicle' : '🚗 Create vehicle'}</button>`}
      </footer>`;
    return div;
  }

  /**
   * A created trailer offers to design its tow vehicle (the maintainer, 2026-11-09: truck and trailer as a linked pair);
   * once linked, the trailer and its tow name each other.
   */
  _towButton(ch) {
    if (!this.actor || !ch) return '';
    const link = this.actor.getFlag(SCOPE, TOW_FLAG);
    if (ChassisCatalog.card(ch.id).towed) {
      if (link?.role === 'trailer' && link.other?.name) return `<span class="vd-dim vd-tow-link">Towed by <b>${esc(link.other.name)}</b></span>`;
      return `<button type="button" class="vd-tow" title="Open a new design for the vehicle that pulls this one; the two are linked when it is created.">🚚 Design its tow vehicle</button>`;
    }
    // A tractor: add trailers, up to five (R3R p.193) — ground vehicles and boats only (the maintainer, 2026-11-09).
    if (!ChassisCatalog.canTow(ch)) return '';
    const n = VehicleDesignActor.trailersOf(link).length;
    return `<button type="button" class="vd-add-trailer" ${n >= MAX_TRAILERS ? 'disabled' : ''} title="Open a new design for a trailer this vehicle pulls; it is linked when created. Up to ${MAX_TRAILERS} (R3R p.193).">🚛 Add a trailer (${n}/${MAX_TRAILERS})</button>`;
  }

  /**
   * A tractor's trailers on the price step: each with a Hitched tick, and whether its Load covers what is hitched (house
   * rule, the maintainer 2026-11-09: build one tractor and five trailers, hitch all of them cross-country or one or two
   * for the city). A trailer's Load is read from its own stored design.
   */
  _trailersPanel(r) {
    const list = VehicleDesignActor.trailersOf(this.actor?.getFlag(SCOPE, TOW_FLAG));
    if (!list.length) return '';
    const rows = list.map(t => {
      const a = globalThis.fromUuidSync?.(t.uuid);
      const des = a?.getFlag?.(SCOPE, FLAG);
      const load = des ? VehicleDesign.evaluate(des).load?.total ?? 0 : 0;
      return { ...t, load, gone: !a };
    });
    const p = VehicleDesignActor.pull(r.load?.total ?? null, rows);
    const line = t => `<label class="vd-trailer"><input type="checkbox" class="vd-hitch" data-uuid="${esc(t.uuid)}" ${t.hitched ? 'checked' : ''} ${t.gone ? 'disabled' : ''}/>
      <b>${esc(t.name)}</b> <span class="vd-dim">${t.gone ? '(deleted)' : `Load ${t.load.toLocaleString()} kg`}</span></label>`;
    return `<fieldset class="vd-trailers"><legend>Trailers — tick the ones hitched (up to ${MAX_TRAILERS}, R3R p.193)</legend>
      ${rows.map(line).join('')}
      <div class="vd-hint">${p.count} hitched, carrying up to ${p.pulled.toLocaleString()} kg · this vehicle's Load ${esc((r.load?.total ?? 0).toLocaleString())} kg</div>
      ${p.warning ? `<div class="vd-amber">⚠ ${esc(p.warning)}</div>` : ''}
    </fieldset>`;
  }

  /** The pinned result bar — the design's stats and price, always at the top (the maintainer, 2026-11-08). */
  _resultBar(r) {
    const s = r.stats ?? {};
    const ch = r.chassis;
    const chip = (label, v, cls = '') => `<div class="vd-chip ${cls}"><span>${label}</span><b>${esc(v ?? '—')}</b></div>`;
    const over = (used, total) => (used != null && total != null && used > total ? 'vd-over' : '');
    const warn = (r.warnings ?? []).length;
    return `<header class="vd-result">
      <div class="vd-result-art">${ch ? DesignerArt.picture(ChassisCatalog.card(ch.id).art, ch.category, ch.drone) : DesignerArt.chassis('car')}</div>
      <div class="vd-result-main">
        <input type="text" class="vd-name" data-path="name" value="${esc(this.design.name)}" placeholder="${esc(ch?.name ?? 'Name your vehicle')}"/>
        <div class="vd-chips">
          ${chip('Handling', s.handling != null ? `${s.handling}/${s.handlingOffRoad}` : null)}${chip('Speed', s.speed)}${chip('Accel', s.accel)}
          ${chip('Body', ch?.body)}${chip('Armor', ch?.armor)}${chip('Sig', s.sig)}
          ${chip('CF', r.cf?.total != null ? `${r.cf.used}/${r.cf.total}` : null, over(r.cf?.used, r.cf?.total))}
          ${chip('Load', r.load?.total != null ? `${r.load.used}/${r.load.total}` : null, over(r.load?.used, r.load?.total))}
          ${chip('Design Pts', r.dp?.total)}${chip('Cost', r.cost != null ? `${r.cost.toLocaleString()}¥` : null, 'vd-cost')}
        </div>
        <div class="vd-chips vd-chips-book" title="The second stat line, as the books print it (R3R p.169)">
          ${chip('Seating', s.seating)}${chip('Entry', s.entry)}
          ${chip('Fuel', s.fuel != null ? `${s.fuel.toLocaleString()} ${s.fuelUnit ?? ''}`.trim() : null)}
          ${chip('Econ', s.economy != null ? `${s.economy} km/${({ liters: 'l', PF: 'PF', bars: 'bar' })[s.fuelUnit] ?? s.fuelUnit}` : null)}
          ${chip('Range', s.range != null ? `${s.range.toLocaleString()} km` : null)}
          ${chip('S/B', s.sb)}${chip('L/T', s.lt)}${chip('Chassis', ch?.name)}
          ${chip('SI', r.streetIndex)}${chip('Avail', r.availability?.text)}
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
    const cards = list.map(c => {
      const card = ChassisCatalog.card(c.id);
      return `<button type="button" class="vd-card ${c.id === d.chassis ? 'picked' : ''}" data-chassis="${c.id}" title="${esc(card.blurb)}">
      <div class="vd-card-art">${DesignerArt.picture(card.art, c.category, c.drone, ChassisCatalog.scale(c.id, CHASSIS))}</div>
      <div class="vd-card-name">${esc(c.name)}${card.towed ? ' <span class="vd-badge">Towed</span>' : ''}</div>
      <div class="vd-blurb">${esc(card.blurb)}</div>
      <div class="vd-card-stats">
        <span>Body <b>${esc(c.body)}</b></span><span>Armor <b>${esc(c.armor ?? '—')}</b></span>
        <span>Handling <b>${esc(c.handling)}</b></span><span>CF <b>${esc(c.cf)}</b></span>
        <span>Seats <b>${esc(c.seating ?? '—')}</b></span><span>Pts <b>${esc(c.dp)}</b></span>
      </div>
      <div class="vd-card-page">${esc(c.page)}</div></button>`;
    }).join('');
    return `<div class="vd-row">
        <div class="vd-toggle"><button type="button" data-drones="0" class="${drones ? '' : 'active'}">Vehicles</button><button type="button" data-drones="1" class="${drones ? 'active' : ''}">Drones</button></div>
      </div>
      <div class="vd-types">${chips}</div>
      <div class="vd-grid">${cards || '<p class="vd-empty">No chassis of this type.</p>'}</div>`;
  }

  /** Step 2 — the plants this chassis offers, as cards; then tuning (improvements, smart materials). */
  _stepPlant(d, ch, r) {
    const info = ChassisCatalog.card(ch.id);
    if (info.towed) {
      // R3R p.109: trailers take no power plant; a barge is towed by a boat, a rail car pulled by a locomotive.
      const load = /Load [\d,.]+ ?kg( \([^)]*\))?/.exec(String(ch.features ?? ''))?.[0] ?? null;
      return `<div class="vd-towed"><div class="vd-towed-art">${DesignerArt.picture(info.art, ch.category, ch.drone)}</div><div>
        <h3>Towed — no power plant</h3><p>${esc(info.blurb)}</p>
        ${load ? `<p><b>${esc(load)}</b> <span class="vd-dim">(${esc(ch.page)})</span></p>` : ''}
        <p class="vd-dim">It moves at whatever pulls it — its Speed and Acceleration are the tow's. Its Load and Cargo can still be raised below.</p></div></div>
        ${this._tuning(d, ch, r)}`;
    }
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
    return `<div class="vd-grid">${cards || '<p class="vd-empty">The tables list no power plant for this chassis.</p>'}</div>
      ${d.plant ? this._tuning(d, ch, r) : ''}`;
  }

  /**
   * Tuning, laid out in full (the maintainer, 2026-11-08: "shouldn't be compacted… describe the maxima"): each line is
   * start + added = result, against its maximum for this chassis and plant, amber past it; every control carries a tooltip
   * saying what it changes, what it costs, and its range here (R3R pp.115-118).
   */
  _tuning(d, ch, r) {
    const s = r.stats ?? {};
    const imp = d.improve ?? {};
    const n = x => Number(x) || 0;
    const [onRoad, offRoad] = String(ch.handling ?? '').split('/').map(x => parseInt(x, 10));
    const smartH = d.smartMaterials ? SMART.handling : 0;
    const input = (path, val, tip) => `<input type="number" data-path="${path}" value="${esc(val ?? 0)}" min="0" style="width:60px" title="${esc(tip)}"/>`;
    const lines = [
      ['handling', 'Handling (on-road)', onRoad + smartH, s.handling, Number.isFinite(onRoad) ? VehicleDesign.handlingFloor(onRoad) : null, '−', 'low',
        `Lowers on-road Handling — lower is better. ${RATES.handling} points a point; no better than half the chassis' ${onRoad} (R3R p.115).`],
      ['handlingOffRoad', 'Handling (off-road)', offRoad + smartH, s.handlingOffRoad, Number.isFinite(offRoad) ? VehicleDesign.handlingFloor(offRoad) : null, '−', 'low',
        `Lowers off-road Handling — lower is better. ${RATES.handling} points a point; no better than half the chassis' ${offRoad} (R3R p.115).`],
      ['speed', 'Speed', s.speed == null ? null : s.speed - n(imp.speed), s.speed, s.speedMax, '+', 'high',
        `Raises Speed. ${RATES.speed} points a point; up to the plant's maximum ${s.speedMax ?? '—'} here (R3R p.115).`],
      ['accel', 'Acceleration', s.accel == null ? null : s.accel - n(imp.accel), s.accel, s.accelMax, '+', 'high',
        `Raises Acceleration. ${RATES.accel} points a point; up to the plant's maximum ${s.accelMax ?? '—'} here (R3R p.115).`],
      ['load', 'Load (kg)', r.load?.total == null ? null : r.load.total - n(imp.load) - n(d.freed?.load), r.load?.total, r.load?.max, '+', 'high',
        `Raises Load. ${RATES.loadPerPoint} kg a point (1 on a Body 0 vehicle); up to ${r.load?.max ?? '—'} kg here (R3R p.116).`],
      ['cargo', 'Cargo (CF)', r.cf?.total == null ? null : r.cf.total - n(imp.cargo) - n(d.freed?.cf), r.cf?.total, r.cf?.max, '+', 'high',
        `Raises Cargo Factor. ${RATES.cargoPerPoint * 25} points per 5 CF; up to the chassis' ${r.cf?.max ?? '—'} CF (R3R p.115).`],
      ['economySteps', 'Economy (+5% steps)', null, s.economy, null, '+', 'high',
        `Each step adds 5% to the plant's Economy (km per unit of fuel), ${RATES.economyStep} points a step; up to the plant's maximum (R3R p.115).`],
      ['signature', 'Signature', s.sig == null ? null : s.sig - n(imp.signature), s.sig, null, '+', 'high',
        `Raises Signature — harder to detect. Costs (levels)⁴ × ${RATES.signature} points (R3R p.116).`],
    ];
    // A towed chassis has no plant: only its Load and Cargo can be raised, from its own printed figures (R3R p.204).
    const towed = ChassisCatalog.card(ch.id).towed;
    const rows = (towed ? lines.filter(([k]) => k === 'load' || k === 'cargo') : lines).map(([k, label, start, result, max, sign, better, tip]) => {
      const over = result != null && max != null && (better === 'low' ? result < max : result > max);
      return `<tr class="${over ? 'vd-over-row' : ''}" title="${esc(tip)}">
        <th>${esc(label)}</th><td>${esc(start ?? '—')}</td><td>${sign} ${input(`improve.${k}`, imp[k], tip)}</td>
        <td>= <b>${esc(result ?? '—')}</b></td><td class="vd-dim">${max != null ? `${better === 'low' ? 'best' : 'max'} ${esc(max)}` : ''}${over ? ' ⚠' : ''}</td></tr>`;
    }).join('');
    const smartTip = `Smart materials (R3R p.118): ${SMART.dp} points. Handling ${SMART.handling}; maximum Speed, Acceleration and Load × ${SMART.factor}; Street Index +${SMART.streetIndex}.`;
    const freedTip = what => `${what} freed by taking seats out — free (R3R p.104). Type what the removed seats gave.`;
    return `<fieldset class="vd-tune"><legend>Tune it — improvements past the ${towed ? 'chassis\'' : 'plant\'s'} starting figures (R3R pp.115-118)</legend>
      <table class="vd-tune-table"><tr><th></th><th>Start</th><th>Added</th><th>Result</th><th>Limit</th></tr>${rows}</table>
      <div class="vd-row">
        <label title="${esc(smartTip)}"><input type="checkbox" data-path="smartMaterials" ${d.smartMaterials ? 'checked' : ''}/> Smart materials (p.118)</label>
        <label title="${esc(freedTip('CF'))}">Freed CF ${input('freed.cf', d.freed?.cf, freedTip('CF'))}</label>
        <label title="${esc(freedTip('Load'))}">Freed Load ${input('freed.load', d.freed?.load, freedTip('Load'))}</label></div>
    </fieldset>`;
  }

  /** The fit context for a chassis and the current plant — what `misfit` reads. */
  _fitCtx(ch) {
    const plant = VehicleDesign.plantRow(this.design.plant)?.plant ?? (this.design.plant || null);
    const body = VehicleDesign.bodyOf(ch);
    // Sealed to go under: an Amphibious Package in the cart, or an EnviroSeal row (R3R pp.116, 132, 149).
    const watertight = (this.design.mods ?? []).some(m => /Amphibious|EnviroSeal/i.test(m.name ?? ''))
      || (this.design.options ?? []).some(o => /EnviroSeal/i.test(o.name ?? ''));
    return { category: ch.category, chassisId: ch.id, body, hull: body, hasHull: /H/.test(String(ch.body)), maxCf: VehicleDesign.cell(ch.maxCf, body),
      plantCode: plant, plant, drone: !!ch.drone, watertight,
      // A Hybrid Engine or an electric Auxiliary Engine counts as an electric drive (SunCell, R3R p.126).
      electric: ModCatalog.electricExtra(this.design.options ?? [], id => VehicleDesign.plantRow(id)?.plant ?? null) };
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
      // The auxiliary engine's plant: a dropdown of this chassis' Power Plant Table rows (the maintainer, 2026-11-09).
      const auxPick = k => `<label>Power plant <select data-path="options.${i}.${k}"><option value="">Same as the main plant</option>${
        Object.keys(PLANTS).flatMap(code => VehicleDesign.plantsFor(ch.id, code)).map(pl => `<option value="${esc(pl.id)}" ${x[k] === pl.id ? 'selected' : ''}>${
          esc(PLANTS[pl.plant]?.name ?? pl.plant)} — ${esc(VehicleDesign.cell(pl.dp, VehicleDesign.bodyOf(ch)) ?? pl.dp)} pts</option>`).join('')}</select></label>`;
      // A Work Shop's or Facility's kind: a dropdown with each kind's price (the maintainer, 2026-11-09).
      const shopPick = (k, which) => `<label>${which === 'shop' ? 'Kind of shop' : 'Kind of facility'} <select data-path="options.${i}.${k}"><option value="">—</option>${
        Object.entries(SHOPS).map(([id, s]) => `<option value="${id}" ${x[k] === id ? 'selected' : ''}>${esc(s.name)} — ${s[which].toLocaleString()}¥</option>`).join('')}</select></label>`;
      const pickers = { auxPlant: auxPick, shop: k => shopPick(k, 'shop'), facility: k => shopPick(k, 'facility') };
      const hiddenInput = k => (k === 'points' && ['aux-engine', 'workshop', 'facility'].includes(o.id)) || (k === 'kind' && o.id === 'facility');
      const inputs = o.inputs.filter(([k]) => !hiddenInput(k)).map(([k, label]) => pickers[k] ? pickers[k](k) : `<label>${esc(label)} <input type="${k === 'kind' ? 'text' : 'number'}" data-path="options.${i}.${k}" ${k === 'kind' ? '' : 'data-blank="1"'} value="${esc(x[k])}" style="width:${k === 'kind' ? 90 : 56}px"/></label>`).join(' ');
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
          ${DesignOptions.limit(o.id, c) ? `<div class="vd-dim">${esc(DesignOptions.limit(o.id, c))}</div>` : ''}
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
    // In the cart by name, so the same mod from another book's pack counts too.
    // Exact name, so a Pop-Up or Anti-Air variant is its own mod (the maintainer, 2026-11-09).
    const inCart = m => d.mods.filter(x => x.uuid === m.uuid || ModCatalog.sameMod(x.name, m.name)).length;
    const ctx = this._ctx();
    const cards = shown.map(({ m, card, why }) => {
      const row = VehicleDesignActor.modRow(m, { ...ctx, level: m.system?.rating ?? 1 });
      const n = inCart(m);
      const stacks = ModCatalog.stacks(m.name);
      const max = ModCatalog.maxLevel(m);
      const after = ModCatalog.aftermarket(m.name);
      const add = !n ? '<button type="button" data-add-mod="' + esc(m.uuid) + '">+ Add</button>'
        : stacks ? `<button type="button" data-add-mod="${esc(m.uuid)}" title="This vehicle can carry more than one">+ Another (${n})</button>`
          : `<span class="vd-in-cart" title="One per vehicle — raise its level in the cart instead">✓ In cart</span>`;
      return `<div class="vd-card vd-mod ${why ? 'vd-misfit' : ''} ${n ? 'picked' : ''}">
        <div class="vd-mod-head"><span class="vd-mod-icon">${DesignerArt.shelf(card.shelf)}</span>
          <div class="vd-card-name" title="${esc(ModCatalog.names(m.name).full)}">${esc(ModCatalog.names(m.name).short)}</div></div>
        <div class="vd-blurb">${esc(card.blurb || 'See the book page.')}</div>
        ${why ? `<div class="vd-amber">⚠ ${esc(why)}</div>` : ''}
        <div class="vd-card-stats"><span>Pts <b>${after ? 0 : row.unpriced ? '?' : esc(row.dp)}</b></span><span>CF <b>${esc(row.cf)}</b></span><span>Load <b>${esc(row.load)}</b></span>
          ${ModCatalog.rated(m) ? `<span class="vd-dim">${max ? `levels 1-${max}` : 'levels'}</span>` : ''}</div>
        ${after ? '<div class="vd-dim">Aftermarket — fitted after the build, no design cost.</div>' : ''}
        ${VehicleMounts.turretHolds(m) ? `<div class="vd-turret-holds">🎯 ${esc(VehicleMounts.turretHolds(m))}</div>` : ''}
        <div class="vd-card-foot"><span class="vd-card-page">${esc(m.system?.bookPage ?? '')}</span>${add}</div></div>`;
    }).join('');
    const hidden = rows.length - visible.length;
    const cart = d.mods.map((x, i) => {
      const src = this._modAll?.find(m => m.uuid === x.uuid) ?? null;
      const rated = src ? ModCatalog.rated(src) : x.level != null && x.level !== 1;
      const max = src ? ModCatalog.maxLevel(src) : null;
      const why = this._cartWarning(x, max);
      return `<div class="vd-cart-item ${why ? 'vd-cart-warn' : ''}">
      <span class="vd-cart-name" title="${esc(ModCatalog.names(x.name).full)}">${esc(ModCatalog.names(x.name).short)}</span>
      ${rated ? `<label title="${esc(max ? `Levels 1 to ${max} (the book's maximum)` : 'The book sets no maximum level')}">Lv <input type="number" data-path="mods.${i}.level" value="${esc(x.level ?? 1)}" min="1" ${max ? `max="${max}"` : ''} style="width:44px"/>${max ? `<span class="vd-dim">/${max}</span>` : ''}</label>` : ''}
      <label title="Design Points — type to override">Pts <input type="number" data-path="mods.${i}.dp" value="${esc(x.dp)}" step="any" style="width:60px"/></label>
      <span class="vd-dim">CF ${esc(x.cf)} · ${esc(x.load)} kg</span>
      <button type="button" data-remove="mods.${i}" title="Remove">✕</button>
      ${why ? `<div class="vd-amber vd-cart-why">⚠ ${esc(why)}</div>` : ''}
      ${ModCatalog.aftermarket(x.name) ? '<div class="vd-dim vd-cart-why">Aftermarket — no design cost; buy it separately.</div>' : ''}</div>`;
    }).join('');
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
        ${r.availability?.why ? `<div class="vd-hint vd-avail-why">Availability: ${esc(r.availability.why)}${
          (r.dp?.lines ?? []).length ? ` — biggest costs: ${[...r.dp.lines].sort((a, b) => b.points - a.points).slice(0, 3).map(l => `${esc(l.label)} (${l.points.toLocaleString()} pts)`).join(', ')}` : ''}</div>` : ''}
      </fieldset>
      <fieldset><legend>Design Points, line by line</legend>
        ${(r.dp?.lines ?? []).map(l => `<div class="vd-line"><span>${esc(l.label)}</span><b>${l.points}</b><span class="vd-dim">${esc(l.page ?? '')}</span></div>`).join('')}
        <div class="vd-line vd-total"><span>Total</span><b>${esc(r.dp?.total ?? 0)}</b></div>
      </fieldset>
      ${this._trailersPanel(r)}
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
      if (!ModCatalog.stacks(m.name) && this.design.mods.some(x => ModCatalog.sameMod(x.name, m.name))) return;
      const row = VehicleDesignActor.modRow(m, this._ctx());
      // An aftermarket mod has no design figures: 0 points and a note, not a warning (the maintainer, 2026-11-08).
      if (ModCatalog.aftermarket(m.name)) Object.assign(row, { dp: 0, unpriced: false });
      this.design.mods.push({ ...row, uuid: m.uuid, level: ModCatalog.rated(m) ? (m.system?.rating ?? 1) : null });
      this.render();
    });
    el.querySelector('.vd-all-options')?.addEventListener('change', e => { this.ui.allOptions = e.target.checked; this.render(); });
    el.querySelector('.vd-all-mods')?.addEventListener('change', e => { this.ui.allMods = e.target.checked; this.render(); });
    const search = el.querySelector('.vd-search');
    search?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); this.ui.q = search.value; this.render(); } });
    search?.addEventListener('change', () => { this.ui.q = search.value; this.render(); });
    el.querySelector('.vd-save')?.addEventListener('click', () => this._save());
    el.querySelector('.vd-tow')?.addEventListener('click', () => SR3EVehicleDesigner.open(null, { towing: this.actor }));
    el.querySelector('.vd-add-trailer')?.addEventListener('click', () => SR3EVehicleDesigner.open(null, { towedBy: this.actor }));
    el.querySelectorAll('.vd-hitch').forEach(box => box.addEventListener('change', async () => {
      await this.actor.update(VehicleDesignActor.hitch(SCOPE, this.actor.getFlag(SCOPE, TOW_FLAG), box.dataset.uuid, box.checked));
      this.render();
    }));
  }

  /** Re-price a picked mod from its design figures after its level, the chassis or the plant changed. */
  _repriceMod(i) {
    const m = this.design.mods[i];
    const src = m?.uuid ? this._modAll?.find(x => x.uuid === m.uuid) : null;
    if (!src) return;
    const row = VehicleDesignActor.modRow(src, { ...this._ctx(), level: m.level ?? 1 });
    if (ModCatalog.aftermarket(src.name)) Object.assign(row, { dp: 0, unpriced: false });
    Object.assign(m, { dp: row.dp, cf: row.cf, load: row.load, unpriced: row.unpriced });
  }

  /** Why a cart line warns, in words (the maintainer, 2026-11-08: the ⚠ "without the reason"), or null. */
  _cartWarning(x, max) {
    if (x.unpriced) return 'No design cost printed for this mod — type its points (R3R p.112)';
    if (max && Number(x.level) > max) return `Level ${x.level} is over the book's maximum of ${max}`;
    return null;
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
    // A brand-new actor: its picture and token are the chassis' top-down icon (never set on an existing vehicle).
    const art = ChassisCatalog.card(result.chassis.id)?.art;
    const icon = tokenImage(art);
    const pic = icon ? { img: icon, 'prototypeToken.texture.src': icon } : {};
    // Its real footprint in metres: each token placed is scaled to that scene's grid (TokenScale, the maintainer 2026-11-10).
    const fp = TokenScale.forArt(art);
    if (fp) Object.assign(pic, { [`flags.${SCOPE}.sizeM`]: fp, 'prototypeToken.width': fp[0], 'prototypeToken.height': fp[1] });
    await created.update({ ...VehicleDesignActor.update(values), ...pic, [`flags.${SCOPE}.${FLAG}`]: design });
    await this._embedMods(created, VehicleDesignActor.missingMods(design.mods, []));
    if (this.towing) {
      // The new tow vehicle and its trailer, each naming the other.
      const link = VehicleDesignActor.towLink(SCOPE, this.towing, created, null);
      await created.update(link.tow);
      if (this.towing.isOwner) await this.towing.update(link.trailer);
      else ui.notifications.warn(`${created.name} was created, but you cannot edit ${this.towing.name} to record the link.`);
    }
    if (this.towedBy) {
      // A new trailer for this tractor: added to its list, up to five (R3R p.193).
      const link = VehicleDesignActor.towLink(SCOPE, created, this.towedBy, this.towedBy.getFlag(SCOPE, TOW_FLAG));
      if (link.full) ui.notifications.warn(`${this.towedBy.name} already pulls ${MAX_TRAILERS} trailers — ${created.name} was created unlinked.`);
      else {
        await created.update(link.trailer);
        if (this.towedBy.isOwner) await this.towedBy.update(link.tow);
        else ui.notifications.warn(`${created.name} was created, but you cannot edit ${this.towedBy.name} to record the link.`);
      }
    }
    this.actor = created;
    if (created.isOwner) created.sheet.render(true);
    this.render();
  }
}
