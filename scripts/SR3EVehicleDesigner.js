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
 * Warn, never refuse: an over-maximum or an unpriced mod is a warning, and Create still works.
 */
import { CHASSIS, CATEGORIES, PLANTS } from './data/vehicle-design-tables.mjs';
import { VehicleDesign, CLASSES } from './data/vehicle-design.mjs';
import { VehicleDesignActor, FLAG, SOURCE_FLAG } from './data/vehicle-design-actor.mjs';
import { DesignOptions } from './data/design-options.mjs';

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
    position: { width: 760, height: 720 },
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
    const mods = await this._mods();
    const div = document.createElement('div');
    div.className = 'sr3e-inner';
    div.style.cssText = 'display:flex;flex-direction:column;gap:6px;overflow:auto;height:100%;padding:6px;';

    const chOpts = Object.entries(CATEGORIES).map(([cat, label]) => `<optgroup label="${esc(label)}">${CHASSIS
      .filter(c => c.category === cat)
      .map(c => `<option value="${c.id}" ${c.id === d.chassis ? 'selected' : ''}>${esc(c.name)}${c.drone ? ' (drone)' : ''} — ${c.dp} pts</option>`)
      .join('')}</optgroup>`).join('');
    const plants = d.chassis ? Object.keys(PLANTS).flatMap(code => VehicleDesign.plantsFor(d.chassis, code)) : [];
    const plOpts = plants.map(p => `<option value="${esc(p.id)}" ${p.id === d.plant || p.plant === d.plant ? 'selected' : ''}>${esc(PLANTS[p.plant]?.name ?? p.plant)} ${esc(p.label)}</option>`).join('');
    const num = (path, v, w = 60, step = 1) => `<input type="number" data-path="${path}" value="${esc(v ?? 0)}" step="${step}" style="width:${w}px"/>`;

    const priced = r.options ?? [];
    const optHtml = (x, i) => {
      const p = priced[i] ?? {};
      const o = DesignOptions.get(x.id);
      if (!o) return rowHtml('options', x, i);
      const fig = (k, w) => `<input type="number" data-path="options.${i}.${k}" data-blank="1" value="${esc(x[k])}" placeholder="${esc(p.computed?.[k] ?? '')}" step="any" style="width:${w}px" title="Blank = the computed figure"/>`;
      const inputs = o.inputs.map(([k, label]) => `<label style="white-space:nowrap">${esc(label)} <input type="${k === 'kind' ? 'text' : 'number'}" data-path="options.${i}.${k}" ${k === 'kind' ? '' : 'data-blank="1"'} value="${esc(x[k])}" style="width:${k === 'kind' ? 90 : 56}px"/></label>`).join(' ');
      return `<tr><td title="${esc(o.page)}">${esc(o.name)}${p.note ? ` <span title="${esc(p.note)}">ⓘ</span>` : ''}<div>${inputs}</div></td>
        <td>${fig('dp', 70)}</td><td>${fig('cf', 50)}</td><td>${fig('load', 60)}</td>
        <td><button type="button" data-remove="options.${i}" title="Remove">✕</button></td></tr>`;
    };
    const groups = [...new Set(DesignOptions.OPTIONS.map(o => o.group))];
    const catOpts = groups.map(g => `<optgroup label="${esc(g)}">${DesignOptions.OPTIONS.filter(o => o.group === g)
      .map(o => `<option value="${o.id}">${esc(o.name)} (${esc(o.page)})</option>`).join('')}</optgroup>`).join('');

    const rowHtml = (kind, x, i) => `<tr>
      <td><input type="text" data-path="${kind}.${i}.name" value="${esc(x.name)}"/></td>
      ${kind === 'mods' ? `<td>${num(`${kind}.${i}.level`, x.level ?? 1, 44)}</td>` : ''}
      <td>${num(`${kind}.${i}.dp`, x.dp, 70, 'any')}${x.unpriced ? ' <span title="No design cost printed — type it (R3R p.112)">⚠</span>' : ''}</td>
      <td>${num(`${kind}.${i}.cf`, x.cf, 50, 'any')}</td><td>${num(`${kind}.${i}.load`, x.load, 60, 'any')}</td>
      <td><button type="button" data-remove="${kind}.${i}" title="Remove">✕</button></td></tr>`;

    const s = r.stats ?? {};
    const stat = (label, v) => `<div><span style="color:var(--sr-muted)">${label}</span> <b>${esc(v ?? '—')}</b></div>`;
    div.innerHTML = `
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
        <label>Name <input type="text" data-path="name" value="${esc(d.name)}" style="width:180px"/></label>
        <label>Chassis <select data-path="chassis"><option value="">— pick —</option>${chOpts}</select></label>
        <label>Power plant <select data-path="plant"><option value="">— pick —</option>${plOpts}</select></label>
      </div>
      <fieldset><legend>Improvements (R3R pp.115-116)</legend>
        <div style="display:flex;gap:8px;flex-wrap:wrap">${IMPROVE.map(([k, l]) => `<label>${l} ${num(`improve.${k}`, d.improve?.[k])}</label>`).join('')}
        <label><input type="checkbox" data-path="smartMaterials" ${d.smartMaterials ? 'checked' : ''}/> Smart materials (p.118)</label>
        <label>Freed CF ${num('freed.cf', d.freed?.cf)}</label><label>Freed Load ${num('freed.load', d.freed?.load)}</label></div>
      </fieldset>
      <fieldset><legend>Design options (R3R pp.115-121)</legend>
        <table><tr><th>Option</th><th>Points</th><th>CF</th><th>Load</th><th></th></tr>${(d.options ?? []).map((x, i) => optHtml(x, i)).join('')}</table>
        <select class="vd-opt-pick"><option value="">— add a design option —</option>${catOpts}</select>
        <button type="button" data-add="options" title="A row you price yourself">+ Typed row</button>
      </fieldset>
      <fieldset><legend>Vehicle mods at their Design Point cost (R3R p.112)</legend>
        <table><tr><th>Name</th><th>Level</th><th>Points</th><th>CF</th><th>Load</th><th></th></tr>${(d.mods ?? []).map((x, i) => rowHtml('mods', x, i)).join('')}</table>
        <input type="text" class="vd-mod-filter" placeholder="Filter mods…" style="width:160px"/>
        <select class="vd-mod-pick" style="max-width:340px"><option value="">— add a mod —</option>${mods.map(m =>
          `<option value="${esc(m.uuid)}" title="${esc(m.system?.bookPage ?? '')}">${esc(m.name)}${m.system?.bookPage ? ` [${esc(m.system.bookPage)}]` : ''}${m.system?.designCost ? ` — ${esc(m.system.designCost)}` : ' — (type points)'}</option>`).join('')}</select>
      </fieldset>
      <fieldset><legend>Price (R3R p.113)</legend>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
        <label>Class <select data-path="vehicleClass">${Object.keys(CLASSES).map(k => `<option value="${k}" ${k === d.vehicleClass ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
        <label>Mark-Up + ${num('markUpExtra', d.markUpExtra, 60, 'any')}</label>
        <label>Street Index + ${num('streetIndexExtra', d.streetIndexExtra, 60, 'any')}</label>
        <label>Extra ¥ ${num('extraNuyen', d.extraNuyen, 90)}</label></div>
      </fieldset>
      <fieldset><legend>Result</legend>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:2px 10px">
          ${stat('Handling', s.handling != null ? `${s.handling}/${s.handlingOffRoad}` : null)}${stat('Speed', s.speed)}${stat('Accel', s.accel)}
          ${stat('Body', r.chassis?.body)}${stat('Armor', r.chassis?.armor)}${stat('Signature', s.sig)}
          ${stat('Cargo', r.cf ? `${s.cargo} (of ${r.cf.total})` : null)}${stat('Load', r.load?.total != null ? `${s.load} (of ${r.load.total})` : null)}
          ${stat('Design Points', r.dp?.total)}${stat('Cost', r.cost != null ? `${r.cost.toLocaleString()}¥` : null)}
          ${stat('Street Index', r.streetIndex)}${stat('Availability', r.availability?.text)}
        </div>
        <details><summary>Points, line by line</summary>${(r.dp?.lines ?? []).map(l => `<div>${esc(l.label)} — ${l.points} <span style="color:var(--sr-dim)">${esc(l.page ?? '')}</span></div>`).join('')}</details>
        ${(r.warnings ?? []).map(w => `<div style="color:var(--sr-amber)">⚠ ${esc(w)}</div>`).join('')}
      </fieldset>
      <div style="display:flex;gap:6px;justify-content:flex-end">
        <button type="button" class="vd-save" ${r.chassis ? '' : 'disabled'}>${this.actor ? '💾 Offer changes to the vehicle' : '🚗 Create vehicle'}</button>
      </div>`;
    return div;
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
    const filter = el.querySelector('.vd-mod-filter');
    const pick = el.querySelector('.vd-mod-pick');
    filter?.addEventListener('input', () => {
      const q = filter.value.toLowerCase();
      for (const o of pick.options) if (o.value) o.hidden = !o.textContent.toLowerCase().includes(q);
    });
    filter?.addEventListener('keydown', e => { if (e.key === 'Enter') e.preventDefault(); });
    pick?.addEventListener('change', () => {
      const m = this._modIndex?.find(x => x.uuid === pick.value);
      if (!m) return;
      const row = VehicleDesignActor.modRow(m, this._ctx());
      this.design.mods.push({ ...row, uuid: m.uuid, level: m.system?.rating ?? 1 });
      this.render();
    });
    el.querySelector('.vd-opt-pick')?.addEventListener('change', e => {
      const row = DesignOptions.newRow(e.target.value);
      if (!row) return;
      this.design.options.push(row);
      this.render();
    });
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
