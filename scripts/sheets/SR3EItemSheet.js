import {
  SR3E,
  SR3ESkills,
  getSkillCategories,
  getSkillsForCategory,
  getLinkedAttributeForCategory,
  getLinkedAttributeForSkill,
  getFullSkillName,
  getSpecializationsForSkill,
  skillTypeForCategory,
} from '../config.js';
import { SPIRIT_TYPES } from '../documents/SR3ESpiritSummoning.js';
import { knownRating } from '../data/item-rating.mjs';
import { ModRatings } from '../data/mod-ratings.mjs';
import { ModFor } from '../data/mod-for.mjs';
import { LEGALITY_TYPES } from '../data/legality.mjs';
import { BookPage } from '../data/book-page.mjs';
import { AmmoStock, GUN_CLASSES } from '../data/ammo-stock.mjs';
import { MiniGrenade } from '../data/mini-grenade.mjs';
import { ItemMods, TARGETS } from '../data/item-mods.mjs';
import { ArmorMods } from '../data/armor-mods.mjs';
import { SR3EItemMods } from '../SR3EItemMods.js';
import { ModRemoval } from '../data/mod-removal.mjs';

/** Where a spell's fetish or exclusive limit was taken · SR3 p.180 (TODO 223). Blank = the spell has no such limit. */
const SPELL_LIMIT_SIDES = [
  { value: '',         label: 'None' },
  { value: 'drain',    label: 'Off the Force for Drain' },
  { value: 'learning', label: 'Off the Karma cost to learn' },
];

export class SR3EItemSheet extends foundry.applications.sheets.ItemSheetV2 {

  static DEFAULT_OPTIONS = {
    classes: ['sr3e', 'sheet', 'item'],
    tag: 'form',
    position: { width: 520, height: 480 },
    window: { resizable: true },
    form: {
      submitOnChange: true,
      closeOnSubmit: false,
    },
    actions: {
      itemRoll:           SR3EItemSheet._onRoll,
      categoryChange:     SR3EItemSheet._onCategoryChange,
      skillChange:        SR3EItemSheet._onSkillChange,
      pickFromCompendium: SR3EItemSheet._onPickFromCompendium,
      buyAmmo:            SR3EItemSheet._onBuyAmmo,
    }
  };

  get title() { return `${this.item.name} [${this._typeLabel()}]`; }

  /** Is this book on? (`SR3ESourceBooks.optionalRuleAllowed` — the levels a switched-off book prints are not offered.) */
  static _bookAllowed(code) {
    return game.sr3e?.SR3ESourceBooks?.optionalRuleAllowed?.(code) ?? true;
  }

  /* A mod opened from its host (TODO 276, `SR3EItemMods.open`) is a temporary item: editable by whoever owns the host, and
   * its form goes straight to its overridden `update`, which writes into the host — never through core's submit, which
   * would try to update a document the server has never seen. */
  get isEditable() {
    const host = this.document._sr3eHost;
    return host ? host.isOwner : super.isEditable;
  }

  async _processSubmitData(event, form, submitData, options) {
    if (this.document._sr3eHost) return this.document.update(submitData);
    return super._processSubmitData(event, form, submitData, options);
  }

  async _renderHTML(_context, _options) {
    const div = document.createElement('div');
    div.style.cssText = 'flex:1;min-height:0;display:flex;flex-direction:column;';
    div.innerHTML = this._build();
    return div;
  }

  _replaceHTML(result, content, _options) {
    content.replaceChildren(result);
  }

  _onRender(_context, _options) {
    this._wireMods(this.element);
    if (!this.isEditable) return;
    const html = this.element;
    html.querySelector('.item-roll')
      ?.addEventListener('click', ev => SR3EItemSheet._onRoll.call(this, ev));
    html.querySelector('.category-select')
      ?.addEventListener('change', ev => SR3EItemSheet._onCategoryChange.call(this, ev));
    html.querySelector('.skill-select')
      ?.addEventListener('change', ev => SR3EItemSheet._onSkillChange.call(this, ev));
    html.querySelector('.grade-select')
      ?.addEventListener('change', ev => SR3EItemSheet._onGradeChange.call(this, ev));
    html.querySelector('.mod-rating-select')
      ?.addEventListener('change', ev => SR3EItemSheet._onModRatingChange.call(this, ev));


    const specAddBtn = html.querySelector('#spec-add-btn');
    if (specAddBtn) {
      specAddBtn.addEventListener('click', async () => {
        const s            = this.item.system;
        const predefined   = getSpecializationsForSkill(s.category, s.skillName);
        const fixedOptions = predefined.filter(opt => !opt.endsWith('->'));
        const existingNames = new Set((s.specialisations ?? []).map(sp => sp.name));
        const available    = fixedOptions.filter(opt => !existingNames.has(opt));

        let specName = null;
        await foundry.applications.api.DialogV2.wait({
          window: { title: `Add Specialisation — ${this.item.name}` },
          content: `
            <div style="padding:8px;display:flex;flex-direction:column;gap:6px">
              ${available.length > 0 ? `
                <label>From list:
                  <select id="spec-select" style="margin-left:8px">
                    <option value="">— or type a custom name below —</option>
                    ${available.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                  </select>
                </label>` : ''}
              <label>${available.length > 0 ? 'Custom:' : 'Name:'}
                <input type="text" id="new-spec-name" style="width:180px;margin-left:8px"
                       ${available.length === 0 ? 'autofocus' : ''}
                       placeholder="${available.length > 0 ? 'Leave blank if selecting above' : 'Specialisation name'}"/>
              </label>
            </div>`,
          buttons: [
            {
              label: 'Add', action: 'add', default: true,
              callback: (_e, _b, dlg) => {
                const sel    = dlg.element.querySelector('#spec-select')?.value?.trim() ?? '';
                const custom = dlg.element.querySelector('#new-spec-name')?.value?.trim() ?? '';
                specName = sel || custom;
              }
            },
            { label: 'Cancel', action: 'cancel' },
          ],
        });
        if (!specName) return;
        const specs = [...(this.item.system.specialisations ?? [])];
        specs.push({ name: specName, level: 1 });
        await this.item.update({ 'system.specialisations': specs });
      });
    }

    html.querySelectorAll('.spec-level-select').forEach(sel => {
      sel.addEventListener('change', async () => {
        const idx = parseInt(sel.dataset.specIdx);
        const specs = [...(this.item.system.specialisations ?? [])];
        if (!specs[idx]) return;
        specs[idx] = { ...specs[idx], level: Math.max(0, parseInt(sel.value) || 0) };
        await this.item.update({ 'system.specialisations': specs });
      });
    });

    html.querySelectorAll('.spec-remove-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const idx = parseInt(btn.dataset.specIdx);
        const specs = [...(this.item.system.specialisations ?? [])];
        const removedName = specs[idx]?.name ?? '';
        specs.splice(idx, 1);
        const updates = { 'system.specialisations': specs };
        if (removedName && this.item.system.specialisation === removedName) updates['system.specialisation'] = '';
        await this.item.update(updates);
      });
    });

    const specModeEl = html.querySelector('#spec-mode');
    if (specModeEl) {
      const hidden   = html.querySelector('#spec-hidden');
      const textWrap = html.querySelector('#spec-text-wrap');
      const textInp  = html.querySelector('#spec-text');
      const dispatch = () => hidden.dispatchEvent(new Event('change', { bubbles: true }));

      specModeEl.addEventListener('change', () => {
        const val = specModeEl.value;
        if (val === 'none') {
          hidden.value = '';
          textWrap.style.display = 'none';
        } else if (val === 'custom') {
          textWrap.style.display = '';
          hidden.value = textInp.value.trim();
        } else {
          hidden.value = val;
          textWrap.style.display = 'none';
        }
        dispatch();
      });

      textInp?.addEventListener('change', () => {
        hidden.value = textInp.value.trim();
        dispatch();
      });
    }
  }

  _build() {
    const item    = this.item;
    const canRoll = ['firearm', 'melee', 'projectile', 'thrown', 'skill'].includes(item.type);
    return `
      <div class="sr3e-inner">
        <header class="item-sheet-header">
          <img class="item-img" src="${item.img}" title="${item.name}"/>
          <div class="item-header-text">
            <input class="item-name-input" type="text" name="name" value="${foundry.utils.escapeHTML(item.name ?? "")}"/>
            <span class="item-type-badge">${this._typeLabel()}</span>
          </div>
          ${this.isEditable && item.type !== 'skill' ? '<button type="button" class="btn-compendium-pick" data-action="pickFromCompendium" title="Fill from compendium">&#128218; Pick from compendium</button>' : ''}
          ${this._buyAmmoButton()}
        </header>
        <div class="item-body">
          ${this._installedIn()}
          ${this._repairBanner()}
          ${this._withBookPage(this._details())}
          ${this._modsSection()}
          ${this._modifiersSection()}
          ${canRoll ? '<button type="button" class="btn-roll item-roll">Roll</button>' : ''}
        </div>
      </div>`;
  }

  /* ── Mods installed inside this item, and what this item changes · TODO 276 ─────────────────────────────── */

  /** A gun whose barrel a failed gas-vent removal destroyed (TODO 277): the reason, and ✔ Repaired for its owner. */
  _repairBanner() {
    const r = ModRemoval.needsRepair(this.document);
    if (!r) return '';
    return `<p class="sr-mod-warn">⚠ ${foundry.utils.escapeHTML(r.reason ?? 'Damaged')} — needs repair.
      ${this.isEditable ? '<a class="sr-mod-repaired" title="Clear it once the gun is repaired">✔ Repaired</a>' : ''}</p>`;
  }

  /** On a mod opened from its host (✎): which item it is installed in. Its edits save into that item. */
  _installedIn() {
    const host = this.document._sr3eHost;
    if (!host) return '';
    return `<p class="sr-mod-host">🔧 Installed in <strong>${foundry.utils.escapeHTML(host.name)}</strong> — changes here save into it.</p>`;
  }

  /**
   * A host's installed mods (`system.installed`): mount, name, what each changes, ✎ open · ⏏ take out · 🗑 delete, and a
   * drop zone. Below, what the mods add up to. Only on a type that holds mods (`ItemMods.HOST_TYPES`).
   */
  _modsSection() {
    const item = this.document;
    if (!ItemMods.isHost(item)) return '';
    const esc = v => foundry.utils.escapeHTML(String(v ?? ''));
    const rows = SR3EItemMods.rows(item);
    const edit = this.isEditable;
    const body = rows.length
      ? rows.map(r => `<div class="sr-mod-row" data-mod-id="${esc(r.id)}">
          <span class="sr-mod-mount" data-tooltip="${r.mount ? `On the ${r.mount.toLowerCase()} mount (SR3 p.280)` : 'No weapon mount'}">${esc(r.mount || '—')}</span>
          <img src="${esc(r.img)}" class="sr-mod-img" alt=""/>
          <a class="sr-mod-name sr-mod-open" title="Open">${esc(r.name)}</a>
          <span class="sr-mod-changes">${esc(r.changes)}</span>
          <a class="sr-mod-open" title="Open its sheet">✎</a>
          ${edit ? `<a class="sr-mod-out" title="Take it out — into the inventory">⏏</a>
          <a class="sr-mod-remove" title="Delete it">🗑</a>` : ''}
        </div>`).join('')
      : '<p class="sr-mod-empty">Nothing installed.</p>';
    const eff = ItemMods.effective(item);
    const summary = Object.keys(eff).map(t => `<span class="sr-mod-chip" data-tooltip="${esc(ItemMods.describe(t, eff[t]))}">${esc(TARGETS[t].combine === 'any' ? TARGETS[t].short : `${TARGETS[t].short} ${eff[t].value}`)}</span>`).join('');
    return `<div class="sr-mods${edit ? ' sr-mods-drop' : ''}">
      <h3 class="sr-mods-title">Installed mods</h3>
      ${body}
      ${summary ? `<div class="sr-mods-summary">From mods and built in: ${summary}</div>` : ''}
      ${item.type === 'armor' ? this._armorWithMods(item) : ''}
      ${edit ? '<p class="sr-mod-hint">Drop a mod here to install it. One accessory per weapon mount (SR3 p.280) — you are warned, never stopped.</p>' : ''}
    </div>`;
  }

  /**
   * Armour with its mods (TODO 276, `ArmorMods`): the numbers the mods change — Concealability, weight, cost, Availability,
   * Street Index, hardened, mod points against the caps (CC p.52) — and anything wrong, in amber. The base fields above
   * stay the armour's own, editable.
   */
  _armorWithMods(item) {
    const esc = v => foundry.utils.escapeHTML(String(v ?? ''));
    const problems = ArmorMods.problems(item);
    if (!ItemMods.installed(item).length && !problems.length) return '';
    const r = ArmorMods.ratings(item), caps = ArmorMods.caps(item), pts = ArmorMods.points(item);
    const conceal = ArmorMods.concealability(item).value;
    const bits = [
      `${r.ballistic}B / ${r.impact}I${ArmorMods.hardened(item) ? ' <strong>hardened</strong>' : ''}`,
      conceal === null ? '' : `Conceal ${conceal}`,
      `${ArmorMods.weight(item)} kg`,
      `${ArmorMods.cost(item).toLocaleString()}¥`,
      ArmorMods.availability(item) ? `Avail ${esc(ArmorMods.availability(item))}` : '',
      ArmorMods.streetIndex(item) === null ? '' : `SI ${ArmorMods.streetIndex(item)}`,
      `mod points ${pts.total} / ${caps.total} (one mod ≤ ${caps.single})`,
    ].filter(Boolean);
    return `<div class="sr-mods-summary" title="With its mods (CC pp.52-54). Gel packs: ×5 price, TN ×2 / time ×4, outside the caps.">With mods: ${bits.join(' · ')}</div>
      ${problems.map(w => `<p class="sr-mod-warn">⚠ ${esc(w)}</p>`).join('')}`;
  }

  /**
   * What this item changes (`system.modifiers`): one row per target and value, from the fixed vocabulary
   * (`ItemMods.TARGETS`). On every type whose model declares the field. The rows have no `name` — the form would save
   * them as an object, not a list — so each change writes the whole list (`_onRender`).
   */
  _modifiersSection() {
    const s = this.document.system;
    if (!s || !Array.isArray(s.modifiers)) return '';
    const edit = this.isEditable;
    const opts = now => Object.entries(TARGETS).map(([k, t]) => `<option value="${k}"${k === now ? ' selected' : ''}>${t.label}</option>`).join('');
    const rows = s.modifiers.map((m, i) => {
      const t = TARGETS[m.target];
      const val = t?.combine === 'any'
        ? `<input type="checkbox" class="sr-modifier-value" data-idx="${i}" ${m.value > 0 ? 'checked' : ''} ${edit ? '' : 'disabled'}/>`
        : `<input type="number" class="sr-modifier-value" data-idx="${i}" value="${Number(m.value) || 0}" style="width:56px" ${edit ? '' : 'disabled'}/>
           <label title="The value is per point of this item's level (Fire Resistance [3] at 1 per level is 3)"><input type="checkbox" class="sr-modifier-per" data-idx="${i}" ${m.perRating ? 'checked' : ''} ${edit ? '' : 'disabled'}/> per level</label>`;
      return `<div class="sr-modifier-row">
        <select class="sr-modifier-target" data-idx="${i}" ${edit ? '' : 'disabled'}>${t ? '' : `<option value="" selected>? ${foundry.utils.escapeHTML(String(m.target ?? ''))}</option>`}${opts(m.target)}</select>
        ${val}
        ${edit ? `<a class="sr-modifier-remove" data-idx="${i}" title="Remove">✕</a>` : ''}
      </div>`;
    }).join('');
    if (!rows && !edit) return '';
    return `<div class="sr-modifiers">
      <h3 class="sr-mods-title" title="What this item adds — to the item it is installed in, or to itself. Cyberware, bioware, carried gear and worn armour pass vision and the like on to the character.">Changes</h3>
      ${rows || '<p class="sr-mod-empty">Changes nothing.</p>'}
      ${edit ? '<a class="sr-modifier-add">+ Add a change</a>' : ''}
    </div>`;
  }

  /** Wire the two sections above. */
  _wireMods(html) {
    const item = this.document;
    const idOf = el => el.closest('[data-mod-id]')?.dataset.modId;
    html.querySelectorAll('.sr-mod-open').forEach(a => a.addEventListener('click', () => SR3EItemMods.open(item, idOf(a))));
    if (!this.isEditable) return;
    html.querySelector('.sr-mod-repaired')?.addEventListener('click', () => SR3EItemMods.repaired(item));
    html.querySelectorAll('.sr-mod-out').forEach(a => a.addEventListener('click', () => SR3EItemMods.uninstall(item, idOf(a))));
    html.querySelectorAll('.sr-mod-remove').forEach(a => a.addEventListener('click', () => SR3EItemMods.remove(item, idOf(a))));
    const zone = html.querySelector('.sr-mods-drop');
    if (zone) {
      zone.addEventListener('dragover', ev => { ev.preventDefault(); zone.classList.add('sr-mods-over'); });
      zone.addEventListener('dragleave', () => zone.classList.remove('sr-mods-over'));
      zone.addEventListener('drop', async ev => {
        ev.preventDefault();
        ev.stopPropagation();
        zone.classList.remove('sr-mods-over');
        const dropped = await SR3EItemMods.droppedItem(ev);
        if (dropped) await SR3EItemMods.install(item, dropped);
      });
    }

    // ⚠ Every field of a row, `perRating` included — a row rebuilt from target and value alone would lose it on any edit.
    const list = () => (item.system.modifiers ?? []).map(m => ({ target: m.target, value: Number(m.value) || 0, perRating: m.perRating === true }));
    const save = mods => item.update({ 'system.modifiers': mods });
    html.querySelector('.sr-modifier-add')?.addEventListener('click', () => save([...list(), { target: 'rc', value: 1 }]));
    html.querySelectorAll('.sr-modifier-remove').forEach(a => a.addEventListener('click', () => {
      const mods = list();
      mods.splice(Number(a.dataset.idx), 1);
      save(mods);
    }));
    // ⚠ stopPropagation: the rows have no `name`, but their change would still submit the whole form first.
    html.querySelectorAll('.sr-modifier-target').forEach(sel => sel.addEventListener('change', ev => {
      ev.stopPropagation();
      const mods = list();
      const target = sel.value;
      const was = mods[Number(sel.dataset.idx)] ?? {};
      mods[Number(sel.dataset.idx)] = TARGETS[target]?.combine === 'any'
        ? { target, value: 1, perRating: false }
        : { target, value: was.value ?? 0, perRating: was.perRating === true };
      save(mods);
    }));
    html.querySelectorAll('.sr-modifier-value').forEach(inp => inp.addEventListener('change', ev => {
      ev.stopPropagation();
      const mods = list();
      const i = Number(inp.dataset.idx);
      if (!mods[i]) return;
      mods[i].value = inp.type === 'checkbox' ? (inp.checked ? 1 : 0) : (Number(inp.value) || 0);
      save(mods);
    }));
    html.querySelectorAll('.sr-modifier-per').forEach(inp => inp.addEventListener('change', ev => {
      ev.stopPropagation();
      const mods = list();
      const i = Number(inp.dataset.idx);
      if (!mods[i]) return;
      mods[i].perRating = inp.checked;
      save(mods);
    }));
  }

  _typeLabel() {
    const labels = {
      melee:        'Melee Weapon',
      projectile:   'Projectile Weapon (Bow/Crossbow)',
      thrown:       'Thrown Weapon',
      firearm:      'Firearm',
      ammunition:   'Ammunition',
      armor:        'Armor',
      gear:         'Gear',
      skill:        'Skill',
      quality:      'Quality',
      cyberware:    'Cyberware',
      bioware:      'Bioware',
      spell:        'Spell',
      complex_form: 'Complex Form',
      summoning:    'Summoning',
      cyberdeck:    'Cyberdeck',
      program:      'Program',
      contact:      'Contact',
      drug:         'Drug / Toxin',
      medical:      'Medical Equipment / Service',
      vehiclemod:   'Vehicle Mod',
    };
    return labels[this.item.type] ?? this.item.type;
  }

  /**
   * The Rating box for items whose rating usually lives in the NAME ("Medkit [6]", "Wired
   * Reflexes [2]" — the shipped packs store 0). With nothing saved the box is blank and shows the
   * name's rating as its placeholder, which is what `itemRating()` uses; typing a number saves it
   * and that number wins. Showing a bare 0 claimed the item had no rating at all.
   */
  /**
   * The Rating box (TODO 118). The field IS the rating and a blank box means NO rating — the
   * maintainer's rule. A name or the generator's table that implies one is offered as a hint; the
   * migration fills it in worlds, so the hint only shows on an item nobody has filled.
   */
  _ratingField(s) {
    const stored = Number(s.rating) > 0 ? Number(s.rating) : null;
    const known  = stored === null ? knownRating(this.document?.name) : null;
    const hint = known !== null
      ? `placeholder="${known}?" title="No rating saved. The name (or the book) suggests ${known} — type it to use it; blank means no rating."`
      : 'placeholder="—" title="Blank = no rating."';
    return this._f('Rating', 'rating', stored ?? '', 'number', `min="0" ${hint}`);
  }

  /**
   * A rated item's level as a dropdown of the levels the books print (TODO 261): picking one sets that
   * level's cost, availability, Essence / Bio Index, description and the rest (`ModRatings.ratingChange`,
   * wired in `_onRender`). Every rated item is ONE document now — gear, cyberware, bioware, medical,
   * vehicle mods — and its levels are this dropdown. An item with no printed levels — or one someone
   * renamed — keeps the plain Rating box. The select has no `name`, so the form never saves the bare
   * number without its level's fields.
   */
  _modRatingField(s) {
    // A level printed only in a book that is off (Gas Vent IV, CC p.35) is not offered — unless it is the one already set.
    const opts = ModRatings.options(this.document, undefined, { bookAllowed: SR3EItemSheet._bookAllowed });
    if (!opts) return this._ratingField(s);
    const none = opts.some(o => o.selected) ? '' : '<option value="" selected>—</option>';
    return `<label class="form-field">
      <span class="field-label">Level</span>
      <select class="mod-rating-select" title="The levels the book prints. Picking one sets its cost and the rest.">
        ${none}${opts.map(o => `<option value="${o.value}"${o.selected ? ' selected' : ''}>${o.label}</option>`).join('')}
      </select>
    </label>`;
  }

  /**
   * Medical, ammunition and vehicle-weapon sheets: the level dropdown where the item has printed levels, else
   * what they had before (medical's free-text Rating — some Biotech rows are signed modifiers — and nothing for
   * the others unless a level is saved).
   */
  _levelField(s, { plain = null } = {}) {
    if (ModRatings.options(this.document)) return this._modRatingField(s);
    if (plain) return plain;
    return Number(s.rating) > 0 ? this._ratingField(s) : '';
  }

  /**
   * "Mod for: Armor" — what this mod is a mod FOR (`system.modFor`, TODO 266). An editable select, like every stat
   * (the GM can always correct it); the name's tag ("Chemical Seal (Armor)") says the same in a list. Shown only on an
   * item that is a mod (set, or by its type / category — `ModFor.of`); a plain item has no such line.
   */
  _modForField(s) {
    const now = s.modFor || ModFor.of(this.document);
    if (!now) return '';
    return `<label class="form-field">
      <span class="field-label">Mod for</span>
      <select name="system.modFor" class="mod-for-select" title="What this mod attaches to: an armour, a weapon, a cyberlimb or a vehicle.">
        ${ModFor.CHOICES.map(v => `<option value="${v}"${v === now ? ' selected' : ''}>${ModFor.LABELS[v]}</option>`).join('')}
      </select>
    </label>`;
  }

  /**
   * Apply a picked level. Graded cyberware and bioware re-apply their grade to the new level's base numbers
   * (the level's printed cost and Essence / Bio Index are the Standard grade's).
   */
  static async _onModRatingChange(ev) {
    const value = Number(ev.currentTarget.value);
    if (!(value > 0)) return;
    const delta = ModRatings.ratingChange(this.item, value);
    const grade = this.item.system.grade ?? 'Standard';
    if ((this.item.type === 'cyberware' || this.item.type === 'bioware') && grade !== 'Standard') {
      Object.assign(delta, { 'system.costBase': 0, [this.item.type === 'bioware' ? 'system.bioIndexBase' : 'system.essenceCostBase']: 0, 'system.availabilityBase': '' });
      await this.item.update(delta);
      return SR3EItemSheet._onGradeChange.call(this, { currentTarget: { value: grade } });
    }
    return this.item.update(delta);
  }

  /**
   * The Legality Code as printed ("Legal", "6P-V", "As Weapon") — editable like every stat (2026-10-25). 🛒 Buy gear
   * reads it to open on "at the store" for a Legal item (SR3 p.273). Only on a type whose model declares it.
   */
  _legalityField(s) {
    if (!LEGALITY_TYPES.includes(this.document.type)) return '';
    return this._f('Legality', 'legality', s.legality ?? '', 'text', 'placeholder="Legal / 6P-V"');
  }

  /**
   * 🛒 Buy ammo — on a gun the character carries (requested 2026-10-25: "there should be a way on the guns description to
   * buy its specific ammo"). Opens 🛒 Buy gear listing only the ammunition this gun loads (`AmmoShop.fits`), and the box
   * bought is stamped with the gun's class. A firearm or a bow/crossbow that nocks, owned, on an actor.
   */
  _buyAmmoButton() {
    const it = this.document;
    const takesAmmo = it.type === 'firearm' || (it.type === 'projectile' && it._usesNockedAmmo?.());
    if (!takesAmmo || !it.actor || !it.isOwner) return '';
    return '<button type="button" class="btn-compendium-pick" data-action="buyAmmo" title="Buy ammunition this weapon loads">🛒 Buy ammo</button>';
  }

  static async _onBuyAmmo(ev) {
    ev?.preventDefault?.();
    const actor = this.item.actor;
    if (!actor) return;
    return game.sr3e.SR3EPurchase.open(actor, null, { forWeapon: this.item });
  }

  _f(label, name, value, type = 'text', extra = '') {
    return `<label class="form-field">
      <span class="field-label">${label}</span>
      <input type="${type}" name="system.${name}" value="${value ?? ''}" ${extra}/>
    </label>`;
  }

  _check(label, name, value) {
    return `<label class="form-field form-field--check">
      <span class="field-label">${label}</span>
      <input type="checkbox" name="system.${name}" ${value ? 'checked' : ''}/>
    </label>`;
  }

  _sel(label, name, value, opts, extraClass = '') {
    const options = opts.map(o => {
      const v = typeof o === 'string' ? o : o.value;
      const l = typeof o === 'string' ? o : o.label;
      return `<option value="${v}" ${value === v ? 'selected' : ''}>${l}</option>`;
    }).join('');
    return `<label class="form-field">
      <span class="field-label">${label}</span>
      <select name="system.${name}" ${extraClass ? `class="${extraClass}"` : ''}>${options}</select>
    </label>`;
  }

  /**
   * Book / Page — the raw code stays editable (`sr3.304`, several comma-separated), and what it
   * means is shown beneath it: "SR3 p.304" (TODO 117). One reader, `BookPage.format`.
   */
  _bookPageField(s) {
    const shown = BookPage.format(s.bookPage);
    const title = 'Book code and page as the generator writes them: sr3.304, mm.64 — several comma-separated';
    return `<label class="form-field">
      <span class="field-label">Book / Page</span>
      <input type="text" name="system.bookPage" value="${s.bookPage ?? ''}" placeholder="sr3.304" title="${title}"/>
      ${shown ? `<span class="sr-bookpage">${shown}</span>` : ''}
    </label>`;
  }

  /**
   * Every type whose data model carries `bookPage` shows it — TODO 117 gave it to skills, qualities,
   * programs, cyberdecks, contacts, summonings and complex forms, whose layouts never had a place
   * for it. A layout that already renders the field is left alone.
   */
  _withBookPage(html) {
    if (!this.item.system || !('bookPage' in this.item.system)) return html;
    if (/name="system\.bookPage"/.test(html)) return html;
    return `${html}<div class="form-grid">${this._bookPageField(this.item.system)}</div>`;
  }

  _notes(value) {
    return `<div class="notes-field">
      <label class="bio-label">Notes</label>
      <textarea name="system.notes" class="bio-text">${value ?? ''}</textarea>
    </div>`;
  }

  _details() {
    const s    = this.item.system;
    const type = this.item.type;

    switch (type) {

      case 'melee':
  return `<div class="form-grid">
    <div class="form-field">
      <span class="field-label">Category</span>
      <select name="system.category">
        <option value="">— Select Category —</option>
        <optgroup label="Armed Melee">
          <option value="EDG" ${s.category === 'EDG' ? 'selected' : ''}>Edged Weapon</option>
          <option value="CLB" ${s.category === 'CLB' ? 'selected' : ''}>Club</option>
          <option value="POL" ${s.category === 'POL' ? 'selected' : ''}>Pole Arm/Staff</option>
          <option value="WHP" ${s.category === 'WHP' ? 'selected' : ''}>Whip/Flail</option>
        </optgroup>
        <optgroup label="Unarmed/Cyber">
          <option value="CYB" ${s.category === 'CYB' ? 'selected' : ''}>Cyber Implant</option>
          <option value="UNA" ${s.category === 'UNA' ? 'selected' : ''}>Unarmed</option>
        </optgroup>
        <option value="other" ${s.category === 'other' ? 'selected' : ''}>Other</option>
      </select>
    </div>
          ${this._f('Concealability', 'concealability', s.concealability)}
          ${this._f('Hands', 'hands', s.hands ?? '', 'number', `min="0" max="2" step="1" placeholder="${game.sr3e.Hands?.defaultHands(type, s.category) ?? ''}" title="Hands it takes — blank = the category's default (TODO 49)"`)}
          ${this._f('Reach', 'reach', s.reach, 'number', 'min="0"')}
          ${this._f('Damage', 'damage', s.damage, 'text', 'placeholder="(STR+2)M"')}
          ${this._f('Extra Damage', 'extraDamage', s.extraDamage ?? '', 'text', 'placeholder="7S Stun" title="A second Damage Code resisted on its own, e.g. the Shock Glove +7S Stun (SR3 p.276). Leave blank for an ordinary weapon."')}
          ${this._f('Weight (kg)', 'weight', s.weight, 'number', 'min="0" step="0.1"')}
          ${this._f('Availability', 'availability', s.availability)}${this._legalityField(s)}
          ${this._f('Cost (¥)', 'cost', s.cost, 'number')}
          ${this._f('Street Index', 'streetIndex', s.streetIndex)}
          ${this._bookPageField(s)}
          ${this._check('Legal', 'legal', s.legal)}
          ${this._check('Shock weapon (p.124-125; a hit stuns the target)', 'shock', s.shock)}
        </div>
        ${this._notes(s.notes)}`;

   case 'projectile':
  return `<div class="form-grid">
    <div class="form-field">
      <span class="field-label">Category</span>
      <select name="system.category">
        <option value="">— Select Category —</option>
        <option value="Bow" ${s.category === 'Bow' ? 'selected' : ''}>Bow</option>
        <option value="LCB" ${s.category === 'LCB' ? 'selected' : ''}>Light Crossbow</option>
        <option value="MCB" ${s.category === 'MCB' ? 'selected' : ''}>Medium Crossbow</option>
        <option value="HCB" ${s.category === 'HCB' ? 'selected' : ''}>Heavy Crossbow</option>
        <option value="SL" ${s.category === 'SL' ? 'selected' : ''}>Sling Launcher</option>
        <option value="other" ${s.category === 'other' ? 'selected' : ''}>Other</option>
      </select>
    </div>
    ${this._f('Concealability', 'concealability', s.concealability)}
          ${this._f('Hands', 'hands', s.hands ?? '', 'number', `min="0" max="2" step="1" placeholder="${game.sr3e.Hands?.defaultHands(type, s.category) ?? ''}" title="Hands it takes — blank = the category's default (TODO 49)"`)}
    ${this._f('Str. Min.', 'strMin', s.strMin, 'text', 'placeholder="3 or -"')}
    ${this._f('Damage', 'damage', s.damage, 'text', 'placeholder="(STR)L or 6M"')}
    ${this._f('Blast falloff', 'blast', s.blast ?? '', 'text', 'placeholder="-1/m" title="Power lost with distance from the blast (SR3 p.119, p.283): -1/m offensive, -1/.5m defensive. Blank = -1/m. Only used when Area of Effect is ticked."')}
    ${this._f('Area radius (m)', 'areaRadius', s.areaRadius ?? '', 'number', 'min="0" step="1" placeholder="10" title="Gas, smoke and flash grenades that deal no damage: the radius of the area they mark (SR3 p.283). Blank = none."')}
    ${this._f('Area effect', 'areaEffect', s.areaEffect ?? '', 'text', 'placeholder="what it does — shown on the card"')}
    ${this._f('Quantity', 'quantity', s.quantity ?? 0, 'number', 'min="0" title="How many you carry. Thrown weapons (not bows) are consumed on use when ammo tracking is enabled."')}
    ${this._f('Weight (kg)', 'weight', s.weight, 'number', 'min="0" step="0.1"')}
    ${this._f('Availability', 'availability', s.availability)}${this._legalityField(s)}
    ${this._f('Cost (¥)', 'cost', s.cost, 'number')}
    ${this._f('Street Index', 'streetIndex', s.streetIndex)}
    ${this._bookPageField(s)}
    ${this._check('Legal', 'legal', s.legal)}
    ${this._check('Area of Effect (AoE)', 'isAoE', s.isAoE)}
    ${this._check('Flechette rules (p.116)', 'flechette', s.flechette || game.sr3e.SR3EItem.parseDamageCode(s.damage)?.flechette === true)}
  </div>
  ${this._notes(s.notes)}`;

      case 'thrown':
  return `<div class="form-grid">
    <div class="form-field">
      <span class="field-label">Category</span>
      <select name="system.category">
        <option value="">— Select Category —</option>
        <option value="TK"   ${s.category === 'TK'   ? 'selected' : ''}>Throwing Knife</option>
        <option value="SH"   ${s.category === 'SH'   ? 'selected' : ''}>Shuriken</option>
        <option value="Ctrp" ${s.category === 'Ctrp' ? 'selected' : ''}>Caltrop</option>
        <option value="GR"   ${s.category === 'GR'   ? 'selected' : ''}>Grenade</option>
        <option value="BOL"  ${s.category === 'BOL'  ? 'selected' : ''}>Bolas</option>
        <option value="Imp"  ${s.category === 'Imp'  ? 'selected' : ''}>Improvised Thrown</option>
        <option value="other" ${s.category === 'other' ? 'selected' : ''}>Other</option>
      </select>
    </div>
    ${this._f('Concealability', 'concealability', s.concealability)}
          ${this._f('Hands', 'hands', s.hands ?? '', 'number', `min="0" max="2" step="1" placeholder="${game.sr3e.Hands?.defaultHands(type, s.category) ?? ''}" title="Hands it takes — blank = the category's default (TODO 49)"`)}
    ${this._f('Str. Min.', 'strMin', s.strMin, 'text', 'placeholder="3 or -"')}
    ${this._f('Damage', 'damage', s.damage, 'text', 'placeholder="(STR)L or 6M"')}
    ${this._f('Blast falloff', 'blast', s.blast ?? '', 'text', 'placeholder="-1/m" title="Power lost with distance from the blast (SR3 p.119, p.283): -1/m offensive, -1/.5m defensive. Blank = -1/m. Only used when Area of Effect is ticked."')}
    ${this._f('Area radius (m)', 'areaRadius', s.areaRadius ?? '', 'number', 'min="0" step="1" placeholder="10" title="Gas, smoke and flash grenades that deal no damage: the radius of the area they mark (SR3 p.283). Blank = none."')}
    ${this._f('Area effect', 'areaEffect', s.areaEffect ?? '', 'text', 'placeholder="what it does — shown on the card"')}
    ${this._f('Quantity', 'quantity', s.quantity ?? 0, 'number', 'min="0" title="How many you carry. Consumed on use when ammo tracking is enabled."')}
    ${this._f('Weight (kg)', 'weight', s.weight, 'number', 'min="0" step="0.1"')}
    ${this._f('Availability', 'availability', s.availability)}${this._legalityField(s)}
    ${this._f('Cost (¥)', 'cost', s.cost, 'number')}
    ${this._f('Street Index', 'streetIndex', s.streetIndex)}
    ${this._bookPageField(s)}
    ${this._check('Legal', 'legal', s.legal)}
    ${this._check('Area of Effect (AoE)', 'isAoE', s.isAoE)}
    ${this._check('Flechette rules (p.116)', 'flechette', s.flechette || game.sr3e.SR3EItem.parseDamageCode(s.damage)?.flechette === true)}
  </div>
  ${this._notes(s.notes)}`;

      case 'firearm':
        return `<div class="form-grid">
         <div class="form-field">
      <span class="field-label">Category</span>
      <select name="system.category">
        <option value="">— Select Category —</option>
        <option value="HOPist" ${s.category === 'HOPist' ? 'selected' : ''}>Hold-Out Pistol</option>
        <option value="LPist" ${s.category === 'LPist' ? 'selected' : ''}>Light Pistol</option>
        <option value="MPist" ${s.category === 'MPist' ? 'selected' : ''}>Medium Pistol</option>
        <option value="HPist" ${s.category === 'HPist' ? 'selected' : ''}>Heavy Pistol</option>
        <option value="VHP" ${s.category === 'VHP' ? 'selected' : ''}>Very Heavy Pistol</option>
        <option value="MaPist" ${s.category === 'MaPist' ? 'selected' : ''}>Machine Pistol</option>
        <option value="SMG" ${s.category === 'SMG' ? 'selected' : ''}>SMG</option>
        <option value="Carb" ${s.category === 'Carb' ? 'selected' : ''}>Carbine</option>
        <option value="AsRf" ${s.category === 'AsRf' ? 'selected' : ''}>Assault Rifle</option>
        <option value="SptR" ${s.category === 'SptR' ? 'selected' : ''}>Sport Rifle</option>
        <option value="Snip" ${s.category === 'Snip' ? 'selected' : ''}>Sniper Rifle</option>
        <option value="LMG" ${s.category === 'LMG' ? 'selected' : ''}>LMG</option>
        <option value="MMG" ${s.category === 'MMG' ? 'selected' : ''}>MMG</option>
        <option value="HMG" ${s.category === 'HMG' ? 'selected' : ''}>HMG</option>
        <option value="ShtG" ${s.category === 'ShtG' ? 'selected' : ''}>Shotgun</option>
        <option value="Tasr" ${s.category === 'Tasr' ? 'selected' : ''}>Taser</option>
        <option value="GrLn" ${s.category === 'GrLn' ? 'selected' : ''}>Grenade Launcher</option>
        <option value="MisLn" ${s.category === 'MisLn' ? 'selected' : ''}>Missile Launcher</option>
        <option value="Las" ${s.category === 'Las' ? 'selected' : ''}>Laser</option>
        <option value="other" ${s.category === 'other' ? 'selected' : ''}>Other</option>
      </select>
    </div>
          ${this._f('Concealability', 'concealability', s.concealability)}
          ${this._f('Hands', 'hands', s.hands ?? '', 'number', `min="0" max="2" step="1" placeholder="${game.sr3e.Hands?.defaultHands(type, s.category) ?? ''}" title="Hands it takes — blank = the category's default (TODO 49)"`)}
          ${this._f('Ammunition', 'ammunition', s.ammunition, 'text', 'placeholder="15(c)"')}
          ${this._f('Mode', 'mode', s.mode, 'text', 'placeholder="SA/BF/FA"')}
          ${this._f('Damage', 'damage', s.damage, 'text', 'placeholder="9M"')}
          ${this._f('Recoil Comp', 'recoilMod', s.recoilMod ?? 0, 'number', 'min="0" max="20" title="Recoil compensation from gas vents, bipods, shock pads etc. mounted on this weapon"')}
          ${this._f('Recoil Comp (integral)', 'recoilModIntegral', s.recoilModIntegral ?? '', 'number', 'min="0" max="20" title="The RC printed in parentheses: the total when every integral accessory (folding or detachable stock, tripod) is in use, SR3 p.276. Blank if the weapon has none."')}
          ${this._f('Range Override', 'rangeOverride', s.rangeOverride ?? '', 'text', 'placeholder="5/15/30/50" title="Short/Medium/Long/Extreme max range in metres. Leave blank to use the category default."')}
          ${this._f('Weight (kg)', 'weight', s.weight, 'number', 'min="0" step="0.1"')}
          ${this._f('Availability', 'availability', s.availability)}${this._legalityField(s)}
          ${this._f('Cost (¥)', 'cost', s.cost, 'number')}
          ${this._f('Street Index', 'streetIndex', s.streetIndex)}
          ${this._f('Accessories', 'accessories', s.accessories)}
          ${this._bookPageField(s)}
          ${this._check('Area of Effect (AoE)', 'isAoE', s.isAoE)}
          ${this._check('Flechette rules (p.116)', 'flechette', s.flechette || game.sr3e.SR3EItem.parseDamageCode(s.damage)?.flechette === true)}
          ${this._check('Shotgun rules (p.117; implied for category Shotgun)', 'shotgunRules', s.shotgunRules)}
          ${this._check('Shock weapon (p.124-125; implied for category Taser)', 'shock', s.shock || s.category === 'Tasr')}
        </div>
        ${this._notes(s.notes)}`;

      case 'ammunition': {
        const ammoTypeOpts = Object.entries(SR3E.ammoTypes)
          .map(([k, v]) => `<option value="${k}" ${(s.ammoType ?? 'regular') === k ? 'selected' : ''}>${v.label}</option>`)
          .join('');
        const mechOpts = Object.entries(SR3E.ammoLoadMechanisms)
          .map(([k, v]) => `<option value="${k}" ${(s.loadMechanism ?? 'c') === k ? 'selected' : ''}>${v} (${k})</option>`)
          .join('');
        return `<div class="form-grid">
          ${this._levelField(s)}
          <div class="form-field">
            <span class="field-label">Ammo Type</span>
            <select name="system.ammoType" title="Rules (power, armour interaction, stun) are applied automatically by type">${ammoTypeOpts}</select>
          </div>
          <div class="form-field">
            <span class="field-label">Loading Mechanism</span>
            <select name="system.loadMechanism" title="Must match the weapon's loading mechanism (the code in its ammo-capacity, e.g. 15(c))">${mechOpts}</select>
          </div>
          <div class="form-field">
            <span class="field-label">Gun Class</span>
            <select name="system.gunClass" title="SR3 p.279: ammunition is made for a class of gun (the Weapon Range Table's categories) and only guns of that class share it; shotguns share across pistols and rifles. Blank = not stated yet: the first gun to load from it states it.">
              <option value="" ${!s.gunClass ? 'selected' : ''}>Not stated yet</option>
              ${Object.entries({ ...GUN_CLASSES, ...(s.gunClass && !GUN_CLASSES[s.gunClass] ? { [s.gunClass]: s.gunClass } : {}) })
                .map(([k, v]) => `<option value="${k}" ${s.gunClass === k ? 'selected' : ''}>${v}</option>`).join('')}
            </select>
          </div>
          ${AmmoStock.kind(s.loadMechanism) === 'either' ? `<div class="form-field">
            <span class="field-label">Counted In</span>
            <select name="system.countedIn" title="SR3 p.280 gives clips, cylinders and belts two ways to reload: swap in a pre-filled one (the rounds left in the old one are lost), or insert loose rounds by hand — a Complex Action per (Quickness) rounds, topping up.">
              <option value="rounds" ${s.countedIn !== 'reloads' ? 'selected' : ''}>Loose rounds</option>
              <option value="reloads" ${s.countedIn === 'reloads' ? 'selected' : ''}>${{ cy: 'Speed loaders', belt: 'Belts' }[s.loadMechanism] ?? 'Pre-filled clips'}</option>
            </select>
          </div>` : ''}
          ${AmmoStock.unit(s) === 'reloads'
            ? `${this._f('Reloads', 'reloads', s.reloads ?? 0, 'number', 'min="0" title="How many pre-filled reloads you own. Each reload of a weapon uses one, and the rounds left in the old one are lost."')}
               ${this._f('Rounds per Reload', 'roundsPerReload', s.roundsPerReload || '', 'number', `min="0" placeholder="fills the gun" title="Rounds in each reload. Blank = whatever the weapon holds."`)}`
            : this._f('Rounds in Stock', 'rounds', s.rounds ?? 0, 'number', 'min="0" title="Loose rounds you own. Reloading tops the weapon up — a Complex Action per (Quickness) rounds, 2 for break action (SR3 p.280)."')}
          ${MiniGrenade.isMiniGrenade(s) ? `
            ${this._f('Damage', 'damage', s.damage, 'text', 'placeholder="10S" title="A mini-grenade\'s Damage Code is its grenade\'s (SR3 p.283). The launcher fires it."')}
            ${this._f('Blast falloff', 'blast', s.blast ?? '', 'text', 'placeholder="-1/m" title="Power lost with distance (SR3 p.119, p.283): -1/m offensive, -1/.5m defensive. Blank = -1/m."')}
            ${this._f('Area radius (m)', 'areaRadius', s.areaRadius ?? '', 'number', 'min="0" step="1" placeholder="10" title="Gas and smoke rounds that deal no damage: the radius of the area they mark (SR3 p.283). Blank = none."')}
            ${this._f('Area effect', 'areaEffect', s.areaEffect ?? '', 'text', 'placeholder="what it does — shown on the card"')}
            ${this._check('Flechette rules (p.116)', 'flechette', s.flechette)}`
            : this._f('Description', 'damage', s.damage, 'text', 'placeholder="Ex-Explosive, Hollow Point…"')}
          ${this._f('Concealability', 'concealability', s.concealability)}
          ${this._f('Weight (kg)', 'weight', s.weight, 'number', 'min="0" step="0.1"')}
          ${this._f('Availability', 'availability', s.availability)}${this._legalityField(s)}
          ${this._f('Cost (¥)', 'cost', s.cost, 'number')}
          ${this._f('Street Index', 'streetIndex', s.streetIndex)}
          ${this._bookPageField(s)}
        </div>
        ${this._notes(s.notes)}`;
      }

      case 'armor':
        return `<div class="form-grid">
          ${this._levelField(s)}
          ${this._modForField(s)}
          ${this._f('Concealability', 'concealability', s.concealability)}
          ${this._f('Ballistic', 'ballistic', s.ballistic, 'number', 'min="0"')}
          ${this._f('Impact', 'impact', s.impact, 'number', 'min="0"')}
          ${this._check('Hardened (CC p.51)', 'hardened', s.hardened)}
          ${this._f('Weight (kg)', 'weight', s.weight, 'number', 'min="0" step="0.1"')}
          ${this._f('Availability', 'availability', s.availability)}${this._legalityField(s)}
          ${this._f('Cost (¥)', 'cost', s.cost, 'number')}
          ${this._f('Street Index', 'streetIndex', s.streetIndex)}
          ${this._bookPageField(s)}
        </div>
        ${this._notes(s.notes)}`;

      case 'skill': {
        const categories      = getSkillCategories();
        const currentCat      = s.category || '';
        // Knowledge/Language categories are inherently open-ended in SR3 — the book's lists are
        // example topics, not an exhaustive enumeration like Active skills. Give them a free-text
        // name + editable linked attribute, with the config's example list offered only as
        // <datalist> autocomplete suggestions, never a hard gate.
        const catSkillType    = currentCat ? skillTypeForCategory(currentCat) : null;
        const isFreeformSkill = catSkillType === 'knowledge' || catSkillType === 'language';
        const skills          = currentCat ? getSkillsForCategory(currentCat) : [];
        const skillEntry      = currentCat && s.skillName
          ? (SR3ESkills[currentCat] ?? []).find(sk => sk.name === s.skillName)
          : null;
        // Martial arts carry `maneuvers` instead of `specializations` — Cannon Companion
        // p.86 forbids specialising in them. Keyed on the DATA, not on the "MA:" name
        // prefix, so a future style added without the prefix is still handled correctly.
        //
        // Emptying the list alone was not enough: with no fixed specs the field below falls
        // through to a free-text input, which would still let one be typed in.
        const maneuvers         = skillEntry?.maneuvers ?? [];
        const noSpecialising    = maneuvers.length > 0;
        const specializations   = skillEntry?.specializations ?? [];
        const fixedSpecs        = specializations.filter(spec => !spec.endsWith('->'));
        const customLabels      = specializations.filter(spec => spec.endsWith('->')).map(spec => spec.slice(0, -2).trim());
        const hasDropdown       = fixedSpecs.length > 0;
        const customPlaceholder = customLabels.length ? customLabels.join(' / ') : 'Custom specialisation';
        const isCustomValue     = !!s.specialisation && !fixedSpecs.includes(s.specialisation);
        const specMode          = !s.specialisation ? 'none' : isCustomValue ? 'custom' : s.specialisation;
        const linkedAttr      = isFreeformSkill
          ? (s.linkedAttribute || getLinkedAttributeForCategory(currentCat))
          : s.skillName
            ? getLinkedAttributeForSkill(currentCat, s.skillName)
            : getLinkedAttributeForCategory(currentCat);
        const linkedAttrLabel = linkedAttr
          ? linkedAttr.charAt(0).toUpperCase() + linkedAttr.slice(1)
          : '';
        const ATTR_OPTIONS = ['body', 'quickness', 'strength', 'charisma', 'intelligence', 'willpower', 'reaction'];

        // Prefer the category-derived type (catSkillType, above) over the stored field, so
        // the badge always agrees with the actor sheet's grouping. A stored 'active' can
        // just be the schema default on a skill that never had the field written (older
        // Nullsheen imports) — persisting that below would entrench the wrong type, whereas
        // writing the derived value heals it on the next save.
        const effSkillType   = catSkillType ?? s.skillType ?? 'active';
        const skillTypeLabel = effSkillType === 'language' ? 'Language'
          : effSkillType === 'knowledge' ? 'Knowledge'
          : 'Active';
        const skillTypeColor = effSkillType === 'language' ? 'var(--sr-green)'
          : effSkillType === 'knowledge' ? 'var(--sr-gold)'
          : 'var(--sr-accent)';

        return `
          <div class="form-grid">
            <div class="form-field">
              <span class="field-label">Skill Type</span>
              <span style="font-weight:bold;color:${skillTypeColor}">${skillTypeLabel}</span>
              <input type="hidden" name="system.skillType" value="${effSkillType}"/>
            </div>
            <div class="form-field">
              <span class="field-label">Category</span>
              <select name="system.category" class="category-select">
                <option value="">— Select Category —</option>
                ${categories.map(cat =>
                  `<option value="${cat}" ${currentCat === cat ? 'selected' : ''}>${cat}</option>`
                ).join('')}
              </select>
            </div>

            ${currentCat && isFreeformSkill ? `
              <div class="form-field">
                <span class="field-label">Skill (Topic)</span>
                <input type="text" name="system.skillName" value="${s.skillName ?? ''}" list="skill-name-suggestions"
                       placeholder="Type a topic — the list below is just examples"/>
                <datalist id="skill-name-suggestions">
                  ${skills.map(skill => `<option value="${skill}"></option>`).join('')}
                </datalist>
                <small style="color:var(--sr-muted)">Knowledge/Language topics are open-ended — type anything</small>
              </div>
            ` : currentCat ? `
              <div class="form-field">
                <span class="field-label">Skill</span>
                <select name="system.skillName" class="skill-select">
                  <option value="">— Select Skill —</option>
                  ${skills.map(skill =>
                    `<option value="${skill}" ${s.skillName === skill ? 'selected' : ''}>${skill}</option>`
                  ).join('')}
                </select>
              </div>
            ` : ''}

            ${this._f('Rating', 'rating', s.rating, 'number', 'min="0" max="12"')}
            ${(() => {
              const parentActor = this.item.parent;
              const isAdept = parentActor ? (parentActor.system?.magicType ?? '') === 'Adept' : true;
              return isAdept
                ? this._f('Improved Ability (Adept force)', 'force', s.force ?? 0, 'number', 'min="0" max="10"')
                : '';
            })()}

            ${currentCat && isFreeformSkill ? `
              <div class="form-field">
                <span class="field-label">Linked Attribute (for defaulting)</span>
                <select name="system.linkedAttribute">
                  ${ATTR_OPTIONS.map(attr =>
                    `<option value="${attr}" ${linkedAttr === attr ? 'selected' : ''}>${attr.charAt(0).toUpperCase() + attr.slice(1)}</option>`
                  ).join('')}
                </select>
                <small style="color:var(--sr-muted)">Used when defaulting (full Attribute, +4 TN)</small>
              </div>
            ` : currentCat ? `
              <div class="form-field">
                <span class="field-label">Linked Attribute (for defaulting)</span>
                <input type="text" value="${linkedAttrLabel}"
                       readonly disabled style="background:var(--sr-surface); color:var(--sr-text);"/>
                <input type="hidden" name="system.linkedAttribute" value="${linkedAttr}"/>
                <small style="color:var(--sr-muted)">Used when defaulting (full Attribute, +4 TN)</small>
              </div>
            ` : ''}

            ${s.skillName && noSpecialising ? `
              <div class="form-field">
                <span class="field-label">Specialization</span>
                <span style="color:var(--sr-muted);font-size:11px">
                  Not permitted — a martial art is already a specialised style
                  (Cannon Companion p.86).
                </span>
                ${maneuvers.length ? `
                  <div style="margin-top:6px">
                    <span class="field-label">Maneuvers granted</span>
                    <div style="font-size:11px;color:var(--sr-muted);line-height:1.4">
                      ${maneuvers.map(m => m.replace(/^MN:/, '')).join(' · ')}
                    </div>
                    <small style="color:var(--sr-dim)">
                      Reference only — maneuvers are not implemented yet.
                    </small>
                  </div>` : ''}
              </div>
            ` : ''}

            ${s.skillName && !noSpecialising ? `
              <div class="form-field">
                <span class="field-label">Specialization (Optional, +2 dice)</span>
                ${hasDropdown ? `
                  <select id="spec-mode">
                    <option value="none" ${specMode === 'none' ? 'selected' : ''}>— None —</option>
                    ${fixedSpecs.map(spec =>
                      `<option value="${spec}" ${specMode === spec ? 'selected' : ''}>${spec}</option>`
                    ).join('')}
                    <option value="custom" ${specMode === 'custom' ? 'selected' : ''}>Other (type below)</option>
                  </select>
                  <input type="hidden" id="spec-hidden" name="system.specialisation" value="${s.specialisation || ''}"/>
                  <div id="spec-text-wrap" style="${isCustomValue ? '' : 'display:none;'}margin-top:4px;">
                    <input type="text" id="spec-text" placeholder="${customPlaceholder}" value="${isCustomValue ? s.specialisation : ''}"/>
                  </div>
                ` : `
                  <input type="text" name="system.specialisation" value="${s.specialisation || ''}"
                         placeholder="Custom specialization"/>
                `}
              </div>
            ` : ''}
          </div>

          ${s.skillName ? (() => {
            const specs = s.specialisations ?? [];
            const rating = s.rating ?? 0;
            return `
              <div class="form-field" style="grid-column:1/-1">
                <span class="field-label">Purchased Specialisations</span>
                <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:4px">
                  ${specs.length === 0
                    ? `<span style="color:var(--sr-muted);font-size:11px">None purchased yet</span>`
                    : specs.map((sp, i) => `
                        <div style="display:flex;align-items:center;gap:6px">
                          <span style="flex:1;font-size:12px">${sp.name}</span>
                          ${/* ⚠ **NOT capped at Lv2** · SR3 p.245. The chargen gap of 2 is where a
                              * specialisation STARTS; karma then raises it with no ceiling, each raise
                              * widening the gap by one — an NPC printed as `Etiquette 4 (Corporate 8)`
                              * is at level 4. Two hardcoded options meant such a specialisation showed
                              * with NEITHER selected, and a GM changing anything else silently wrote it
                              * back down to 1 or 2. The karma calculator has incremented past 2 since
                              * TODO 80; this was the last remnant of that cap. */ ''}
                          <select class="spec-level-select" data-spec-idx="${i}"
                                  style="width:130px;flex:0 0 130px;font-size:11px;color:var(--sr-accent);background:var(--sr-surface);border:1px solid var(--sr-border);border-radius:var(--r);padding:1px 3px"
                                  title="Specialisation level — the bonus over the base skill">
                            ${(() => {
                              const cur = sp.level ?? 1;
                              // Always offer at least 1..4, and always far enough to include the
                              // current value however high a GM or the karma calculator took it.
                              const top = Math.max(4, cur + 1);
                              // Lv0 = the base skill has caught up to the specialisation (SR3 p.245, specsAfterRatingChange).
                              return Array.from({ length: top + 1 }, (_, n) => n).map(lv =>
                                `<option value="${lv}" ${cur === lv ? 'selected' : ''}>`
                                + `Lv${lv} (${rating + lv} dice)</option>`).join('');
                            })()}
                          </select>
                          <button type="button" class="btn-xs spec-remove-btn" data-spec-idx="${i}"
                                  style="padding:0 5px;line-height:1.4" title="Remove">×</button>
                        </div>`).join('')}
                </div>
                ${specs.length < rating ? `<button type="button" class="btn-xs" id="spec-add-btn">+ Add Specialisation</button>` : `<span style="font-size:11px;color:var(--sr-muted)">Max specialisations reached (${rating})</span>`}
              </div>
            `;
          })() : ''}

          ${currentCat && s.skillName ? `
            <div class="skill-info-box">
              <strong>${getFullSkillName(currentCat, s.skillName)}</strong>
              <p>Dice Pool:
                ${s.specialisation
                  ? `<strong>${s.rating || 0} <span style="color:var(--sr-accent)">(${(s.rating || 0) + 2})</span></strong>
                     <span style="font-size:11px;color:var(--sr-muted)"> base (with ${s.specialisation})</span>`
                  : `<strong>${s.rating || 0}</strong>`}
              </p>
              <p style="font-size:11px; color:var(--sr-muted);">
                Linked Attribute: ${linkedAttrLabel}
                (for defaulting: full Attribute, +4 TN)
              </p>
            </div>
          ` : ''}

          <div class="notes-field">
            <label class="bio-label">Notes</label>
            <textarea name="system.description" class="bio-text">${s.description ?? ''}</textarea>
          </div>
        `;
      }

      case 'quality':
        return `<div class="form-grid">
          ${this._sel('Type', 'qualityType', s.qualityType, ['positive', 'negative'])}
          ${this._f('Karma Cost', 'karmaCost', s.karmaCost, 'number')}
        </div>
        <div class="notes-field">
          <label class="bio-label">Description</label>
          <textarea name="system.description" class="bio-text">${s.description ?? ''}</textarea>
        </div>`;

      case 'cyberware':
      case 'bioware': {
        const isBio    = type === 'bioware';
        const grade    = s.grade ?? 'Standard';
        const isStd    = grade === 'Standard';
        const costEff  = s.cost ?? 0;
        const availEff = s.availability ?? '';
        const essEff   = isBio ? (s.bioIndex ?? 0) : (s.essenceCost ?? 0);
        const baseEss  = isBio ? (s.bioIndexBase ?? 0) : (s.essenceCostBase ?? 0);
        const effNote  = !isStd && baseEss > 0
          ? `<span style="font-size:10px;color:var(--sr-muted)"> (base ${baseEss})</span>` : '';
        return `
        <input type="hidden" name="system.${isBio ? 'bioIndexBase' : 'essenceCostBase'}" value="${baseEss}"/>
        <input type="hidden" name="system.costBase" value="${s.costBase ?? 0}"/>
        <input type="hidden" name="system.availabilityBase" value="${s.availabilityBase ?? ''}"/>
        <div class="form-grid">
          <label class="form-field">
            <span class="field-label">${isBio ? 'Bio Index' : 'Essence Cost'}${effNote}</span>
            <input type="number" name="system.${isBio ? 'bioIndex' : 'essenceCost'}"
                   value="${essEff}" step="0.01" min="0"/>
          </label>
          ${this._sel('Grade', 'grade', grade, SR3E.cyberwareGrades, 'grade-select')}
          ${isBio ? '' : this._check(`Essence Slot (+${game.sr3e.EssenceHoles.THRESHOLD_MOD} Threshold)`, 'essenceSlot', s.essenceSlot)}
          ${this._modRatingField(s)}
          ${isBio ? '' : this._modForField(s)}
          ${this._f('Cost (¥)', 'cost', s.cost, 'number')}
          ${this._f('Availability', 'availability', availEff, 'text', 'placeholder="8/36 hrs"')}
          ${this._f('Street Index', 'streetIndex', s.streetIndex, 'number', 'step="0.1" min="0"')}
          ${isBio ? this._legalityField(s) : this._f('Legal Code', 'legalCode', s.legalCode, 'text', 'placeholder="R / Legal"')}
          ${this._bookPageField(s)}
        </div>
        <div class="form-section-hdr" style="margin:8px 0 4px;font-size:11px;font-weight:600;color:var(--sr-muted);letter-spacing:.05em;text-transform:uppercase">Attribute Bonuses</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px 8px;margin-bottom:8px">
          ${[['BOD','bonusBod'],['QUI','bonusQui'],['STR','bonusStr'],['CHA','bonusCha'],
             ['INT','bonusInt'],['WIL','bonusWil'],['REA','bonusRea'],['Init Dice','bonusInitDice']]
            .map(([lbl,field]) => `
            <label style="display:flex;flex-direction:column;align-items:center;gap:2px;font-size:10px;color:var(--sr-muted)">
              ${lbl}
              <input type="number" name="system.${field}" value="${s[field] ?? 0}"
                     min="0" style="width:42px;text-align:center"/>
            </label>`).join('')}
        </div>
        ${(() => {
          /* Implant armour (TODO 75). Blank = read from the upstream `mods` string, shown as the
           * placeholder; a typed number, 0 included, overrides it. Clearing the box returns it
           * to the `mods` value. See SR3EActor.implantArmor. */
          const fromMods = game.sr3e.SR3EActor.implantArmor([{ type, name: '', system: { mods: s.mods } }]);
          const box = (lbl, field, dflt) => `
            <label style="display:flex;flex-direction:column;align-items:center;gap:2px;font-size:10px;color:var(--sr-muted)">
              ${lbl}
              <input type="number" name="system.${field}" value="${s[field] ?? ''}" placeholder="${dflt}"
                     title="Blank = from Mods (${dflt}); a number, 0 included, overrides it"
                     style="width:42px;text-align:center"/>
            </label>`;
          return `
        <div class="form-section-hdr" style="margin:8px 0 4px;font-size:11px;font-weight:600;color:var(--sr-muted);letter-spacing:.05em;text-transform:uppercase">Implant Armour <span style="text-transform:none;font-weight:400">(cumulative with worn armour)</span></div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px 8px;margin-bottom:8px">
          ${box('Ballistic', 'bonusBallistic', fromMods.ballistic)}
          ${box('Impact', 'bonusImpact', fromMods.impact)}
        </div>`;
        })()}
        <div class="notes-field">
          <label class="bio-label">Description</label>
          <textarea name="system.description" class="bio-text">${s.description ?? ''}</textarea>
        </div>`;
      }

      case 'spell':
        return `<div class="form-grid">
          ${this._sel('Category', 'category', s.category, SR3E.spellCategories)}
          ${this._sel('Type', 'type', s.type, SR3E.spellTypes)}
          ${this._sel('Range', 'range', s.range, SR3E.spellRanges)}
          ${this._f('Target', 'target', s.target, 'text', 'placeholder="W / B / F / number" title="Resisted attribute & cast TN — W=Willpower, B=Body, F=Force, or a fixed number"')}
          ${this._sel('Duration', 'duration', s.duration, SR3E.spellDurations)}
          ${this._f('Drain Code', 'drain', s.drain, 'text', 'placeholder="(F/2) or (DL+1)"')}
          ${this._f('Learned Force', 'force', s.force, 'number', 'min="1" placeholder="not recorded" title="The Force this spell was learned at (SR3 p.178). It may be cast at or below this, never above. Blank = not recorded, which caps nothing."')}
          ${this._sel('Fetish limit (−1)', 'limitFetish', s.limitFetish ?? '', SPELL_LIMIT_SIDES)}
          ${this._sel('Exclusive limit (−2)', 'limitExclusive', s.limitExclusive ?? '', SPELL_LIMIT_SIDES)}
          ${this._sel('Damage track', 'damageTrack', s.damageTrack ?? '', [
            { value: '',         label: 'From the name (stun spells Stun, else Physical)' },
            { value: 'Physical', label: 'Physical' },
            { value: 'Stun',     label: 'Stun' },
          ])}
        </div>
        <div class="notes-field">
          <label class="bio-label">Description</label>
          <textarea name="system.description" class="bio-text">${s.description ?? ''}</textarea>
        </div>`;

      case 'complex_form':
        return `<div class="form-grid">
          ${this._f('Rating', 'rating', s.rating, 'number')}
          ${this._f('Duration', 'duration', s.duration)}
          ${this._f('Fade', 'fade', s.fade)}
        </div>
        <div class="notes-field">
          <label class="bio-label">Description</label>
          <textarea name="system.description" class="bio-text">${s.description ?? ''}</textarea>
        </div>`;

      case 'gear':
        return `<div class="form-grid">
          ${this._f('Category', 'category', s.category, 'text', 'placeholder="Surveillance and Security"')}
          ${this._modRatingField(s)}
          ${this._modForField(s)}
          ${this._f('Quantity', 'quantity', s.quantity, 'number', 'min="0"')}
          ${this._f('Concealability', 'concealability', s.concealability)}
          ${this._f('Cost (¥)', 'cost', s.cost, 'number')}
          ${this._f('Weight (kg)', 'weight', s.weight, 'number', 'min="0" step="0.1"')}
          ${this._f('Availability', 'availability', s.availability)}${this._legalityField(s)}
          ${this._f('Street Index', 'streetIndex', s.streetIndex)}
          ${this._bookPageField(s)}
        </div>
        <div class="notes-field">
          <label class="bio-label">Description</label>
          <textarea name="system.description" class="bio-text">${s.description ?? ''}</textarea>
        </div>`;

      case 'drug':
        return `<div class="form-grid">
          ${this._f('Category', 'category', s.category, 'text', 'placeholder="Stimulant, Narcotic, Toxin…"')}
          ${this._f('Addiction', 'addiction', s.addiction, 'text', 'placeholder="2M, 4M+3P, 5M/5P…"')}
          ${this._f('Tolerance', 'tolerance', s.tolerance)}
          ${this._f('Effect', 'effect', s.effect)}
          ${this._f('Speed (Onset)', 'speed', s.speed, 'text', 'placeholder="Instant, 10 min, 1D6 hrs…"')}
          ${this._f('Vector', 'vector', s.vector, 'text', 'placeholder="Ingestion, Injection, Inhalation, Contact…"')}
          ${this._f('Availability', 'availability', s.availability)}${this._legalityField(s)}
          ${this._f('Cost (¥)', 'cost', s.cost, 'number')}
          ${this._f('Street Index', 'streetIndex', s.streetIndex)}
          ${this._bookPageField(s)}
        </div>
        ${this._notes(s.notes)}`;

      case 'medical':
        return `<div class="form-grid">
          ${this._f('Category', 'category', s.category, 'text', 'placeholder="Medical Equipment — General, Medical Clinics — Alpha Grade…"')}
          ${this._levelField(s, { plain: this._f('Rating', 'rating', s.rating) })}
          ${this._f('Availability', 'availability', s.availability)}${this._legalityField(s)}
          ${this._f('Weight (kg)', 'weight', s.weight)}
          ${this._f('Cost (¥)', 'cost', s.cost, 'number')}
          ${this._f('Street Index', 'streetIndex', s.streetIndex)}
          ${this._bookPageField(s)}
        </div>
        ${this._notes(s.notes)}`;

      case 'summoning': {
        const spiritOptions = Object.entries(SPIRIT_TYPES)
          .map(([k, v]) => `<option value="${k}" ${s.spiritType === k ? 'selected' : ''}>${v.label}${v.domain ? ` — ${v.domain}` : ''}</option>`)
          .join('');
        return `<div class="form-grid">
          <label class="field-label">Spirit Type</label>
          <select name="system.spiritType">${spiritOptions}</select>
        </div>
        <div class="notes-field">
          <label class="bio-label">Notes</label>
          <textarea name="system.notes" class="bio-text">${s.notes ?? ''}</textarea>
        </div>`;
      }

      case 'program': {
        const typeOpts = SR3E.programTypes.map(t =>
          `<option value="${t}" ${s.type === t ? 'selected' : ''}>${t}</option>`).join('');
        const catOpts = SR3E.programCategories.map(c =>
          `<option value="${c}" ${s.category === c ? 'selected' : ''}>${c}</option>`).join('');
        const rating = s.rating ?? 0;
        const mult   = s.multiplier ?? 0;
        const calcMp = rating * rating * mult;
        return `<div class="form-grid">
          <label class="field-label">Type</label>
          <select name="system.type"><option value="">—</option>${typeOpts}</select>
          <label class="field-label">Category</label>
          <select name="system.category"><option value="">—</option>${catOpts}</select>
          ${this._f('Rating', 'rating', rating, 'number', 'min="0"')}
          ${this._f('Multiplier', 'multiplier', mult, 'number', 'min="0"')}
          <label class="field-label">Size (Mp)</label>
          <div style="display:flex;flex-direction:column;gap:2px">
            <input type="number" name="system.sizeMp" value="${s.sizeMp ?? 0}" min="0"
                   style="width:100%;box-sizing:border-box"/>
            <span style="font-size:11px;color:var(--sr-muted)">Formula: Rating² × Multiplier = ${calcMp} Mp</span>
          </div>
          ${this._check('Degradable', 'degradable', s.degradable ?? false)}
        </div>
        <div class="notes-field">
          <label class="bio-label">Associated Prompt</label>
          <input type="text" name="system.associatedPrompt" value="${s.associatedPrompt ?? ''}"
                 style="width:100%;box-sizing:border-box" placeholder="e.g. Hacking TN modifier"/>
        </div>
        <div class="notes-field">
          <label class="bio-label">Effect</label>
          <textarea name="system.effect" class="bio-text">${s.effect ?? ''}</textarea>
        </div>
        <div class="notes-field">
          <label class="bio-label">Description</label>
          <textarea name="system.description" class="bio-text">${s.description ?? ''}</textarea>
        </div>`;
      }

      case 'cyberdeck': {
        const da  = s.attributes   ?? {};
        const ds  = s.derivedStats ?? {};
        const mcm = s.damage?.matrixConditionMonitor ?? {};
        return `
        <h3 style="margin:8px 0 4px;font-size:13px;color:var(--sr-accent)">Core Attributes</h3>
        <div class="form-grid">
          ${this._f('MPCP', 'attributes.mpcp.base', da.mpcp?.base ?? 0, 'number', 'min="0"')}
          ${this._f('MPCP Multiplier (×¥/Mp)', 'attributes.mpcp.multiplier', da.mpcp?.multiplier ?? 8, 'number', 'min="0"')}
          ${this._f('Firewall', 'attributes.firewall.base', da.firewall?.base ?? 0, 'number', 'min="0"')}
          ${this._f('Firewall Multiplier (×¥/Mp)', 'attributes.firewall.multiplier', da.firewall?.multiplier ?? 8, 'number', 'min="0"')}
        </div>
        <h3 style="margin:8px 0 4px;font-size:13px;color:var(--sr-accent)">Response</h3>
        <div class="form-grid">
          ${this._f('Response Rating', 'attributes.response.base', da.response?.base ?? 0, 'number', 'min="0"')}
          ${this._f('Max Level', 'attributes.response.maxLevel', da.response?.maxLevel ?? 0, 'number', 'min="0"')}
          ${this._f('Initiative Dice Bonus', 'attributes.response.initiativeDice', da.response?.initiativeDice ?? 0, 'number', 'min="0"')}
          ${this._f('Reaction Bonus', 'attributes.response.reactionBonus', da.response?.reactionBonus ?? 0, 'number', 'min="0"')}
        </div>
        <h3 style="margin:8px 0 4px;font-size:13px;color:var(--sr-accent)">Memory & Slots</h3>
        <div class="form-grid">
          ${this._f('Memory Total (Mp)', 'attributes.memory.total', da.memory?.total ?? 0, 'number', 'min="0"')}
        </div>
        <h3 style="margin:8px 0 4px;font-size:13px;color:var(--sr-accent)">Transfer & Flux</h3>
        <div class="form-grid">
          ${this._f('Data Transfer Rate (Mp/CT)', 'attributes.dataTransferRate.value', da.dataTransferRate?.value ?? 0, 'number', 'min="0"')}
          ${this._f('Flux Rating', 'attributes.fluxRating.value', da.fluxRating?.value ?? 1, 'number', 'min="0"')}
          ${this._check('Wireless', 'attributes.fluxRating.wireless', da.fluxRating?.wireless ?? false)}
        </div>
        <h3 style="margin:8px 0 4px;font-size:13px;color:var(--sr-accent)">Derived / Persona</h3>
        <div class="form-grid">
          ${this._f('Matrix Initiative Base', 'derivedStats.matrixInitiative.base', ds.matrixInitiative?.base ?? 0, 'number')}
          ${this._f('Hacking Pool Bonus', 'derivedStats.hackingPoolBonus', ds.hackingPoolBonus ?? 0, 'number')}
          ${this._f('Persona Storage', 'derivedStats.personaStorage', ds.personaStorage ?? 0, 'number')}
          ${this._f('Icon Strength', 'derivedStats.iconPhysicalStats.strength', ds.iconPhysicalStats?.strength ?? 0, 'number')}
          ${this._f('Icon Quickness', 'derivedStats.iconPhysicalStats.quickness', ds.iconPhysicalStats?.quickness ?? 0, 'number')}
        </div>
        <h3 style="margin:8px 0 4px;font-size:13px;color:var(--sr-accent)">Matrix Condition Monitor</h3>
        <div class="form-grid">
          ${this._f('CM Boxes', 'damage.matrixConditionMonitor.boxes', mcm.boxes ?? 10, 'number', 'min="0"')}
          ${this._f('CM Damage', 'damage.matrixConditionMonitor.current', mcm.current ?? 0, 'number', 'min="0"')}
        </div>
        <h3 style="margin:8px 0 4px;font-size:13px;color:var(--sr-accent)">Acquisition</h3>
        <div class="form-grid">
          ${this._f('Era', 'era', s.era)}
          ${this._f('Cost (¥)', 'cost', s.cost ?? 0, 'number')}
          ${this._f('Street Index', 'streetIndex', s.streetIndex ?? 0, 'number')}
          ${this._f('Availability', 'availability', s.availability)}${this._legalityField(s)}
          ${this._f('Legality Code', 'legalityCode', s.legalityCode ?? '4P-S')}
          ${this._f('Weight (kg)', 'weight', s.weight ?? 0, 'number', 'min="0" step="0.1"')}
        </div>
        ${this._notes(s.notes)}`;
      }

      case 'contact':
        return `<div class="form-grid">
          ${this._f('Archetype', 'archetype', s.archetype, 'text', 'placeholder="Fixer, Street Doc, Cop…"')}
          ${this._f('Loyalty (1–6)', 'loyalty', s.loyalty ?? 1, 'number', 'min="1" max="6"')}
          ${this._f('Connection (1–6)', 'connection', s.connection ?? 1, 'number', 'min="1" max="6"')}
        </div>
        ${this._notes(s.notes)}`;

      case 'adeptpower': {
        /* ⚠ The fields offered depend on WHAT THE POWER IS.
         *
         * This sheet used to render every field for all 117 shipped powers, so an
         * `Attribute Boost(STR)` was offered an "Improves Skill" picker — and, reported from
         * play on 2026-08-29, someone reasonably filled it in and the character rolled +4
         * bogus dice on Unarmed Combat. Attribute Boost grants no skill dice under any
         * reading of p.168.
         *
         * Offering a control is a claim that it does something. Powers keep their own fields
         * and lose the ones that would silently do nothing (or the wrong thing).
         */
        const kind = game.sr3e?.SR3E?.adeptPowerKind?.(this.item.name) ?? 'other';
        const isBoost   = kind === 'attributeBoost';
        const isAbility = kind === 'improvedAbility';

        const actorSkills = this.item.actor
          ? this.item.actor.items.filter(i => i.type === 'skill').sort((a,b) => a.name.localeCompare(b.name))
          : null;
        const currentSkill = s.improvedSkillName ?? '';
        // Only Improved Ability names a skill. Every other power that grants dice does so
        // against a KIND of test, which `improvedSkillName` cannot express — see TODO 70.
        const skillPicker = !isAbility ? '' : (actorSkills
          ? `<label class="form-field"><span class="field-label">Improves Skill</span>
               <select name="system.improvedSkillName">
                 <option value="">— None —</option>
                 ${actorSkills.map(sk => `<option value="${sk.name}"${sk.name === currentSkill ? ' selected' : ''}>${sk.name}</option>`).join('')}
               </select></label>`
          : this._f('Improves Skill', 'improvedSkillName', currentSkill, 'text', 'placeholder="e.g. Pistols"'));

        // Attribute Boost is activated, timed and drained — it must never carry a passive
        // bonus. The derived data ignores these fields for it; hiding them stops a GM
        // filling in a box that will be silently discarded.
        const bonusGrid = isBoost ? `
        <div class="sr-alert" style="margin:8px 0;font-size:11px">
          💪 <strong>Activated power.</strong> Roll it from the character sheet's Magic tab:
          a Magic Test at TN ½ the base Attribute grants the boost for a number of Combat
          Turns equal to the successes, then costs a Drain Resistance Test (SR3 p.168-169).
          It has no passive bonus, so there are no bonus fields to set.
        </div>` : `
        <div class="form-section-hdr" style="margin:8px 0 4px;font-size:11px;font-weight:600;color:var(--sr-muted);letter-spacing:.05em;text-transform:uppercase">Attribute Bonuses${s.hasLevels ? ' — per level' : ''}</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px 8px;margin-bottom:8px">
          ${[['BOD','bonusBod'],['QUI','bonusQui'],['STR','bonusStr'],['CHA','bonusCha'],
             ['INT','bonusInt'],['WIL','bonusWil'],['MAG','bonusMag'],['REA','bonusRea'],['Init Dice','bonusInitDice']]
            .map(([lbl,field]) => `
            <label style="display:flex;flex-direction:column;align-items:center;gap:2px;font-size:10px;color:var(--sr-muted)">
              ${lbl}
              <input type="number" name="system.${field}" value="${s[field] ?? 0}"
                     min="0" style="width:42px;text-align:center"/>
            </label>`).join('')}
        </div>`;

        return `<div class="form-grid">
          ${this._f('Power Cost', 'powerCost', s.powerCost ?? 0.5, 'number', 'step="0.25" min="0"')}
          ${this._check('Has Levels', 'hasLevels', s.hasLevels ?? false)}
          ${ModRatings.options(this.document) ? this._modRatingField(s)   /* a fixed-level power's printed levels (2026-10-25) */
            : s.hasLevels ? this._f('Level', 'level', s.level ?? 1, 'number', 'min="1"') : ''}
          ${skillPicker}
          ${this._bookPageField(s)}
        </div>
        ${isAbility ? `<div class="sr-bd-note" style="margin:2px 0 6px">
          Dice are capped at the lower of your base skill rating and your Magic Attribute
          (SR3 p.169) — the sheet applies that automatically.
        </div>` : ''}
        ${bonusGrid}
        <div class="notes-field">
          <label class="bio-label">Description</label>
          <textarea name="system.description" class="bio-text">${s.description ?? ''}</textarea>
        </div>`;
      }

      case 'vehicleweapon':
        return `<div class="form-grid">
          ${this._levelField(s)}
          ${this._f('Weapon Type', 'weaponType', s.weaponType)}
          ${this._f('Mode', 'mode', s.mode)}
          ${this._f('Damage', 'damage', s.damage)}
          ${this._f('Ammunition', 'ammunition', s.ammunition)}
          ${this._f('Weight (kg)', 'weight', s.weight, 'number', 'min="0" step="0.1"')}
          ${this._f('Cost (¥)', 'cost', s.cost, 'number', 'min="0"')}
          ${this._f('Availability', 'availability', s.availability)}${this._legalityField(s)}
          ${this._f('Street Index', 'streetIndex', s.streetIndex)}
          ${this._bookPageField(s)}
        </div>
        ${this._notes(s.notes)}`;

      case 'vehiclemod':
        return `<div class="form-grid">
          ${this._modRatingField(s)}
          ${this._modForField(s)}
          ${this._f('Cost (¥)', 'cost', s.cost, 'number', 'min="0"')}
          ${this._f('CF', 'cfCost', s.cfCost, 'text', 'title="Cargo Factor the mod takes"')}
          ${this._f('Load', 'load', s.load)}
          ${this._f('Availability', 'availability', s.availability)}${this._legalityField(s)}
          ${this._f('Street Index', 'streetIndex', s.streetIndex)}
          ${this._f('Install Equipment', 'installEquipment', s.installEquipment)}
          ${this._f('Install Time', 'installTime', s.installTime)}
          ${this._bookPageField(s)}
        </div>
        <div class="notes-field">
          <label class="bio-label">Description</label>
          <textarea name="system.description" class="bio-text">${s.description ?? ''}</textarea>
        </div>`;

      default:
        return `<p class="empty-list">No fields defined for item type: ${type}</p>`;
    }
  }

  /**
   * Roll a skill from the ITEM sheet, through the same dialog the character sheet uses.
   *
   * This used to be `this.item.rollSkill()` with no arguments at all — no TN, no pool, no
   * dialog — which rolled at a hardcoded TN 4 and could not offer the specialisation tick,
   * the Karma Pool, or (now) the category-bonus checkbox. Two roll buttons for the same skill
   * behaved differently depending on which sheet you happened to have open.
   *
   * Unified 2026-08-20. `_promptSkillRollOptions` needs an ACTOR, so an unowned item — a world
   * or compendium skill — still falls through to the plain roll, which is what `rollSkill`
   * already warns about.
   */
  static async _rollSkillViaDialog(item, physicalDice = false) {
    const actor = item?.actor;
    if (!actor) return item?.rollSkill?.();

    const { SR3EActorSheet } = await import('./SR3EActorSheet.js');
    const opts = await SR3EActorSheet._promptSkillRollOptions(actor, item, { physicalDice });
    if (!opts) return null;
    // The dialog can retarget to a different skill, exactly as it does from the actor sheet.
    const chosen = actor.items.get(opts.selectedSkillId) ?? item;
    return chosen.rollSkill(opts.tn, { ...opts, pool: opts.pool });
  }

  static async _onRoll(ev) {
    const physicalDice = ev?.shiftKey ?? false;
    const type = this.item.type;
    if (type === 'skill')      return SR3EItemSheet._rollSkillViaDialog(this.item, physicalDice);
    if (type === 'firearm')    return this.item.rollWeapon?.({ physicalDice });
    if (type === 'melee')      return this.item.rollWeapon?.({ physicalDice });
    if (type === 'projectile') return this.item.rollWeapon?.({ physicalDice });
    if (type === 'thrown')     return this.item.rollWeapon?.({ physicalDice });
  }

  static async _onGradeChange(ev) {
    const grade   = ev.currentTarget.value;
    const s       = this.item.system;
    const isBio   = this.item.type === 'bioware';

    // Grade modifiers — essence/cost use multipliers; availability has a flat rating addition + time multiplier
    const GRADES = {
      Standard: { essMult: 1.0, costMult: 1.0, availAdd: 0, timeMult: 1.0 },
      Alpha:    { essMult: 0.8, costMult: 2.0, availAdd: 0, timeMult: 1.0 },
      Beta:     { essMult: 0.6, costMult: 4.0, availAdd: 5, timeMult: 1.5 },
      Delta:    { essMult: 0.5, costMult: 8.0, availAdd: 9, timeMult: 3.0 },
      Used:     { essMult: 1.0, costMult: 0.5, availAdd: 0, timeMult: 1.0 },
    };
    const { essMult, costMult, availAdd, timeMult } = GRADES[grade] ?? GRADES.Standard;

    // Capture base values if not yet set (first grade change on an existing item)
    const essBase  = isBio
      ? (s.bioIndexBase  > 0 ? s.bioIndexBase  : (s.bioIndex     ?? 0))
      : (s.essenceCostBase > 0 ? s.essenceCostBase : (s.essenceCost ?? 0));
    const costBase = s.costBase > 0 ? s.costBase : (s.cost ?? 0);
    const availBase = (s.availabilityBase ?? '') || (s.availability ?? '');

    // Recalculate essence/bioIndex and cost from base
    // Cyberware: the book's rounding — up, per item, .01 floor (M&M p.45) — through the same
    // function the Essence total uses, so the sheet and the total cannot disagree (TODO 101).
    // Bioware keeps the plain multiply: it is charged against the Bio Index, not Essence.
    const newEss  = isBio
      ? Math.round(essBase * essMult * 100) / 100
      : game.sr3e.SR3EActor.gradedEssenceCost(essBase, grade);
    const newCost = Math.round(costBase * costMult);

    // Parse and adjust availability (format: "N/M unit" e.g. "8/36 hrs" or "12/7 days")
    // Rating gets a flat addition; acquisition time gets a multiplier
    let newAvail = availBase;
    if ((availAdd !== 0 || timeMult !== 1.0) && availBase) {
      const m = availBase.match(/^(\d+)\/(\d+)(.*)$/);
      if (m) {
        const rating  = parseInt(m[1]) + availAdd;
        const timeNum = Math.round(parseInt(m[2]) * timeMult);
        newAvail = `${rating}/${timeNum}${m[3]}`;
      }
    }

    const update = {
      'system.grade':            grade,
      'system.cost':             newCost,
      'system.availability':     newAvail,
      'system.costBase':         costBase,
      'system.availabilityBase': availBase,
    };
    if (isBio) {
      update['system.bioIndex']     = newEss;
      update['system.bioIndexBase'] = essBase;
    } else {
      update['system.essenceCost']     = newEss;
      update['system.essenceCostBase'] = essBase;
    }
    await this.item.update(update);
  }

  static async _onCategoryChange(ev) {
    const category   = ev.currentTarget.value;
    const linkedAttr = getLinkedAttributeForCategory(category);
    await this.item.update({
      'system.category':        category,
      'system.skillType':       skillTypeForCategory(category),
      'system.linkedAttribute': linkedAttr,
      'system.skillName':       '',
      'system.specialisation':  '',
      name:                     category
    });
  }

  static async _onSkillChange(ev) {
    const skillName = ev.currentTarget.value;
    const category  = this.item.system.category;
    if (skillName && category) {
      const fullName   = getFullSkillName(category, skillName);
      const linkedAttr = getLinkedAttributeForSkill(category, skillName);
      await this.item.update({
        'system.skillName':       skillName,
        'system.linkedAttribute': linkedAttr,
        'system.specialisation':  '',
        name:                     fullName
      });
    }
  }

  static async _onPickFromCompendium() {
    const type = this.item.type;

    // Packs declaring this itemType, restricted to source books the GM has enabled —
    // otherwise a book hidden from the sidebar would still offer its gear here.
    const packItems = [];
    for (const pack of game.sr3e.SR3EItem._packsForType(type)) {
      await pack.getIndex();
      for (const entry of pack.index) {
        packItems.push({ uuid: entry.uuid, name: entry.name });
      }
    }
    packItems.sort((a, b) => a.name.localeCompare(b.name));

    if (packItems.length === 0) {
      ui.notifications.info(`No compendium entries found for type "${type}".`);
      return;
    }

    let chosen = null;

    // Wired per dialog through DialogV2.wait's `render` option (TODO 20) — never the global hook.
    const wireDialog = (app, html) => {

      const filterEl = html.querySelector('#sr3e-pack-filter');
      const rows     = html.querySelectorAll('.sr3e-pack-item');

      // Live filter
      filterEl.addEventListener('input', () => {
        const q = filterEl.value.toLowerCase();
        rows.forEach(row => {
          row.style.display = row.dataset.name.includes(q) ? '' : 'none';
        });
      });

      // Prevent Enter in filter box from triggering the default Pick button
      filterEl.addEventListener('keydown', e => {
        if (e.key === 'Enter') e.preventDefault();
      });

      // Single-click any row to select and immediately import
      rows.forEach(row => {
        row.addEventListener('click', () => {
          chosen = row.querySelector('input[type="radio"]')?.value ?? null;
          if (chosen) setTimeout(() => html.querySelector('[data-action="pick"]')?.click(), 0);
        });
      });

      // Foundry's own ApplicationV2 focus-management runs after this hook fires and
      // steals focus back to the default button — defer ours to win that race.
      requestAnimationFrame(() => filterEl.focus());
    };

    await foundry.applications.api.DialogV2.wait({
      render: (_event, dialog) => wireDialog(dialog, dialog.element),
      window: { title: `Pick ${type} from compendium` },
      content: `
        <div class="sr3e-pack-picker">
          <input type="text" id="sr3e-pack-filter" placeholder="Filter…" autocomplete="off">
          <div class="sr3e-pack-list">
            ${packItems.map(i => `
              <label class="sr3e-pack-item" data-name="${i.name.toLowerCase()}">
                <input type="radio" name="pack-choice" value="${i.uuid}">
                <span>${i.name}</span>
              </label>
            `).join('')}
          </div>
        </div>
      `,
      buttons: [
        {
          label: 'Pick',
          action: 'pick',
          default: true,
          callback: (_e, _b, dialog) => {
            // Fallback for keyboard users who select a radio then click Pick
            if (!chosen) chosen = dialog.element.querySelector('input[name="pack-choice"]:checked')?.value ?? null;
          }
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });

    if (!chosen) return;
    const doc = await fromUuid(chosen);
    if (!doc) return;
    const data = doc.toObject();
    await this.item.update({ name: data.name, system: data.system });
  }
}