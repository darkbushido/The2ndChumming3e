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
import { VehicleDesign } from './data/vehicle-design.mjs';
import { VehicleDesignActor, FLAG, SOURCE_FLAG, TOW_FLAG, MAX_TRAILERS } from './data/vehicle-design-actor.mjs';
import { tokenImage } from './data/designer-art.mjs';
import { TokenScale } from './data/token-scale.mjs';
import { ChassisCatalog } from './data/chassis-catalog.mjs';
import { VehicleDesignerView, blankDesign } from './data/vehicle-designer-view.mjs';

const SCOPE = 'The2ndChumming3e';
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));


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
    // `options.design`: a design brought in from the web designer (TODO 298, SR3EDesignImport) — opened on its summary, and
    // Create makes the vehicle exactly as a design made here would be (sr3e.actor.create: a player owns it).
    const stored = this.actor?.getFlag(SCOPE, FLAG) ?? options.design ?? null;
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

  /** What the shared view (`data/vehicle-designer-view.mjs`, TODO 298) needs from this window. */
  get view() {
    return Object.assign(this._view ??= {}, {
      design: this.design, ui: this.ui, step: this.step, mods: this._modIndex ?? [], modAll: this._modAll ?? [],
      isActor: !!this.actor,
      towButton: ch => this._towButton(ch),
      trailersPanel: r => this._trailersPanel(r),
      finish: ch => `${this._towButton(ch)}<button type="button" class="vd-save vd-next" ${ch ? '' : 'disabled'}>${this.actor ? '💾 Offer changes to the vehicle' : '🚗 Create vehicle'}</button>`,
    });
  }

  async _renderHTML() {
    if (this.step === 4) await this._mods();
    const div = document.createElement('div');
    div.className = 'sr3e-inner vd-wizard';
    div.innerHTML = VehicleDesignerView.html(this.view);
    return div;
  }

  _replaceHTML(result, content) { content.replaceChildren(result); }

  _onRender() {
    const el = this.element;
    const view = this.view;
    VehicleDesignerView.wire(el, view, {
      // The view changes the step on its own object; carry it back before redrawing.
      render: () => { this.step = view.step; this.render(); },
      load: () => this._mods(),
    });
    el.querySelector('.vd-save')?.addEventListener('click', () => this._save());
    el.querySelector('.vd-tow')?.addEventListener('click', () => SR3EVehicleDesigner.open(null, { towing: this.actor }));
    el.querySelector('.vd-add-trailer')?.addEventListener('click', () => SR3EVehicleDesigner.open(null, { towedBy: this.actor }));
    el.querySelectorAll('.vd-hitch').forEach(box => box.addEventListener('change', async () => {
      await this.actor.update(VehicleDesignActor.hitch(SCOPE, this.actor.getFlag(SCOPE, TOW_FLAG), box.dataset.uuid, box.checked));
      this.render();
    }));
  }

  /** Re-price a picked mod after its level, the chassis or the plant changed — the shared view's rule. */
  _repriceMod(i) { VehicleDesignerView.repriceMod(this.view, i); }

  /** Why a cart line warns, in words — the shared view's. */
  _cartWarning(x, max) { return VehicleDesignerView.cartWarning(this.view, x, max); }

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
