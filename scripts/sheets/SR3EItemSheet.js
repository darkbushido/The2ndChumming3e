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
    }
  };

  get title() { return `${this.item.name} [${this._typeLabel()}]`; }

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
        specs[idx] = { ...specs[idx], level: parseInt(sel.value) || 1 };
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
            <input class="item-name-input" type="text" name="name" value="${item.name}"/>
            <span class="item-type-badge">${this._typeLabel()}</span>
          </div>
          ${this.isEditable && item.type !== 'skill' ? '<button type="button" class="btn-compendium-pick" data-action="pickFromCompendium" title="Fill from compendium">&#128218; Pick from compendium</button>' : ''}
        </header>
        <div class="item-body">
          ${this._details()}
          ${canRoll ? '<button type="button" class="btn-roll item-roll">Roll</button>' : ''}
        </div>
      </div>`;
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
    };
    return labels[this.item.type] ?? this.item.type;
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
          ${this._f('Reach', 'reach', s.reach, 'number', 'min="0"')}
          ${this._f('Damage', 'damage', s.damage, 'text', 'placeholder="(STR+2)M"')}
          ${this._f('Weight (kg)', 'weight', s.weight, 'number', 'min="0" step="0.1"')}
          ${this._f('Availability', 'availability', s.availability)}
          ${this._f('Cost (¥)', 'cost', s.cost, 'number')}
          ${this._f('Street Index', 'streetIndex', s.streetIndex)}
          ${this._f('Book / Page', 'bookPage', s.bookPage)}
          ${this._check('Legal', 'legal', s.legal)}
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
    ${this._f('Str. Min.', 'strMin', s.strMin, 'text', 'placeholder="3 or -"')}
    ${this._f('Damage', 'damage', s.damage, 'text', 'placeholder="(STR)L or 6M"')}
    ${this._f('Quantity', 'quantity', s.quantity ?? 0, 'number', 'min="0" title="How many you carry. Thrown weapons (not bows) are consumed on use when ammo tracking is enabled."')}
    ${this._f('Weight (kg)', 'weight', s.weight, 'number', 'min="0" step="0.1"')}
    ${this._f('Availability', 'availability', s.availability)}
    ${this._f('Cost (¥)', 'cost', s.cost, 'number')}
    ${this._f('Street Index', 'streetIndex', s.streetIndex)}
    ${this._f('Book / Page', 'bookPage', s.bookPage)}
    ${this._check('Legal', 'legal', s.legal)}
    ${this._check('Area of Effect (AoE)', 'isAoE', s.isAoE)}
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
    ${this._f('Str. Min.', 'strMin', s.strMin, 'text', 'placeholder="3 or -"')}
    ${this._f('Damage', 'damage', s.damage, 'text', 'placeholder="(STR)L or 6M"')}
    ${this._f('Quantity', 'quantity', s.quantity ?? 0, 'number', 'min="0" title="How many you carry. Consumed on use when ammo tracking is enabled."')}
    ${this._f('Weight (kg)', 'weight', s.weight, 'number', 'min="0" step="0.1"')}
    ${this._f('Availability', 'availability', s.availability)}
    ${this._f('Cost (¥)', 'cost', s.cost, 'number')}
    ${this._f('Street Index', 'streetIndex', s.streetIndex)}
    ${this._f('Book / Page', 'bookPage', s.bookPage)}
    ${this._check('Legal', 'legal', s.legal)}
    ${this._check('Area of Effect (AoE)', 'isAoE', s.isAoE)}
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
          ${this._f('Ammunition', 'ammunition', s.ammunition, 'text', 'placeholder="15(c)"')}
          ${this._f('Mode', 'mode', s.mode, 'text', 'placeholder="SA/BF/FA"')}
          ${this._f('Damage', 'damage', s.damage, 'text', 'placeholder="9M"')}
          ${this._f('Recoil Comp', 'recoilMod', s.recoilMod ?? 0, 'number', 'min="0" max="20" title="Recoil compensation from gas vents, bipods, shock pads etc. mounted on this weapon"')}
          ${this._f('Range Override', 'rangeOverride', s.rangeOverride ?? '', 'text', 'placeholder="5/15/30/50" title="Short/Medium/Long/Extreme max range in metres. Leave blank to use the category default."')}
          ${this._f('Weight (kg)', 'weight', s.weight, 'number', 'min="0" step="0.1"')}
          ${this._f('Availability', 'availability', s.availability)}
          ${this._f('Cost (¥)', 'cost', s.cost, 'number')}
          ${this._f('Street Index', 'streetIndex', s.streetIndex)}
          ${this._f('Accessories', 'accessories', s.accessories)}
          ${this._f('Book / Page', 'bookPage', s.bookPage)}
          ${this._check('Area of Effect (AoE)', 'isAoE', s.isAoE)}
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
          <div class="form-field">
            <span class="field-label">Ammo Type</span>
            <select name="system.ammoType" title="Rules (power, armour interaction, stun) are applied automatically by type">${ammoTypeOpts}</select>
          </div>
          <div class="form-field">
            <span class="field-label">Loading Mechanism</span>
            <select name="system.loadMechanism" title="Must match the weapon's loading mechanism (the code in its ammo-capacity, e.g. 15(c))">${mechOpts}</select>
          </div>
          ${this._f('Rounds in Stock', 'rounds', s.rounds ?? 0, 'number', 'min="0" title="Total rounds of this ammo you own (the stockpile). Reloading a weapon draws from this; the weapon\'s magazine size comes from its own ammo-capacity (e.g. 15(c))."')}
          ${this._f('Description', 'damage', s.damage, 'text', 'placeholder="Ex-Explosive, Hollow Point…"')}
          ${this._f('Concealability', 'concealability', s.concealability)}
          ${this._f('Weight (kg)', 'weight', s.weight, 'number', 'min="0" step="0.1"')}
          ${this._f('Availability', 'availability', s.availability)}
          ${this._f('Cost (¥)', 'cost', s.cost, 'number')}
          ${this._f('Street Index', 'streetIndex', s.streetIndex)}
          ${this._f('Book / Page', 'bookPage', s.bookPage)}
        </div>
        ${this._notes(s.notes)}`;
      }

      case 'armor':
        return `<div class="form-grid">
          ${this._f('Concealability', 'concealability', s.concealability)}
          ${this._f('Ballistic', 'ballistic', s.ballistic, 'number', 'min="0"')}
          ${this._f('Impact', 'impact', s.impact, 'number', 'min="0"')}
          ${this._f('Weight (kg)', 'weight', s.weight, 'number', 'min="0" step="0.1"')}
          ${this._f('Availability', 'availability', s.availability)}
          ${this._f('Cost (¥)', 'cost', s.cost, 'number')}
          ${this._f('Street Index', 'streetIndex', s.streetIndex)}
          ${this._f('Book / Page', 'bookPage', s.bookPage)}
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
                          <select class="spec-level-select" data-spec-idx="${i}"
                                  style="width:130px;flex:0 0 130px;font-size:11px;color:var(--sr-accent);background:var(--sr-surface);border:1px solid var(--sr-border);border-radius:var(--r);padding:1px 3px"
                                  title="Specialisation level">
                            <option value="1" ${(sp.level ?? 1) === 1 ? 'selected' : ''}>Lv1 (${rating + 1} dice)</option>
                            <option value="2" ${(sp.level ?? 1) === 2 ? 'selected' : ''}>Lv2 (${rating + 2} dice)</option>
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
          ${this._f('Rating', 'rating', s.rating, 'number')}
          ${this._f('Cost (¥)', 'cost', s.cost, 'number')}
          ${this._f('Availability', 'availability', availEff, 'text', 'placeholder="8/36 hrs"')}
          ${this._f('Street Index', 'streetIndex', s.streetIndex, 'number', 'step="0.1" min="0"')}
          ${isBio ? '' : this._f('Legal Code', 'legalCode', s.legalCode, 'text', 'placeholder="R / Legal"')}
          ${this._f('Book / Page', 'bookPage', s.bookPage, 'text')}
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
          ${this._f('Quantity', 'quantity', s.quantity, 'number', 'min="0"')}
          ${this._f('Cost (¥)', 'cost', s.cost, 'number')}
          ${this._f('Weight (kg)', 'weight', s.weight, 'number', 'min="0" step="0.1"')}
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
          ${this._f('Availability', 'availability', s.availability)}
          ${this._f('Cost (¥)', 'cost', s.cost, 'number')}
          ${this._f('Street Index', 'streetIndex', s.streetIndex)}
          ${this._f('Book / Page', 'bookPage', s.bookPage)}
        </div>
        ${this._notes(s.notes)}`;

      case 'medical':
        return `<div class="form-grid">
          ${this._f('Category', 'category', s.category, 'text', 'placeholder="Medical Equipment — General, Medical Clinics — Alpha Grade…"')}
          ${this._f('Rating', 'rating', s.rating)}
          ${this._f('Availability', 'availability', s.availability)}
          ${this._f('Weight (kg)', 'weight', s.weight)}
          ${this._f('Cost (¥)', 'cost', s.cost, 'number')}
          ${this._f('Street Index', 'streetIndex', s.streetIndex)}
          ${this._f('Book / Page', 'bookPage', s.bookPage)}
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
          ${this._f('Availability', 'availability', s.availability)}
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
        const actorSkills = this.item.actor
          ? this.item.actor.items.filter(i => i.type === 'skill').sort((a,b) => a.name.localeCompare(b.name))
          : null;
        const currentSkill = s.improvedSkillName ?? '';
        const skillPicker = actorSkills
          ? `<label class="form-field"><span class="field-label">Improves Skill</span>
               <select name="system.improvedSkillName">
                 <option value="">— None —</option>
                 ${actorSkills.map(sk => `<option value="${sk.name}"${sk.name === currentSkill ? ' selected' : ''}>${sk.name}</option>`).join('')}
               </select></label>`
          : this._f('Improves Skill', 'improvedSkillName', currentSkill, 'text', 'placeholder="e.g. Pistols"');
        return `<div class="form-grid">
          ${this._f('Power Cost', 'powerCost', s.powerCost ?? 0.5, 'number', 'step="0.25" min="0"')}
          ${this._check('Has Levels', 'hasLevels', s.hasLevels ?? false)}
          ${s.hasLevels ? this._f('Level', 'level', s.level ?? 1, 'number', 'min="1"') : ''}
          ${skillPicker}
          ${this._f('Book / Page', 'bookPage', s.bookPage, 'text')}
        </div>
        <div class="form-section-hdr" style="margin:8px 0 4px;font-size:11px;font-weight:600;color:var(--sr-muted);letter-spacing:.05em;text-transform:uppercase">Attribute Bonuses</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px 8px;margin-bottom:8px">
          ${[['BOD','bonusBod'],['QUI','bonusQui'],['STR','bonusStr'],['CHA','bonusCha'],
             ['INT','bonusInt'],['WIL','bonusWil'],['MAG','bonusMag'],['REA','bonusRea'],['Init Dice','bonusInitDice']]
            .map(([lbl,field]) => `
            <label style="display:flex;flex-direction:column;align-items:center;gap:2px;font-size:10px;color:var(--sr-muted)">
              ${lbl}
              <input type="number" name="system.${field}" value="${s[field] ?? 0}"
                     min="0" style="width:42px;text-align:center"/>
            </label>`).join('')}
        </div>
        <div class="notes-field">
          <label class="bio-label">Description</label>
          <textarea name="system.description" class="bio-text">${s.description ?? ''}</textarea>
        </div>`;
      }

      default:
        return `<p class="empty-list">No fields defined for item type: ${type}</p>`;
    }
  }

  static async _onRoll(ev) {
    const physicalDice = ev?.shiftKey ?? false;
    const type = this.item.type;
    if (type === 'skill')      return this.item.rollSkill?.();
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
    const newEss  = Math.round(essBase  * essMult  * 100) / 100;
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

    // DialogV2.wait() does not call its render option — use the Foundry hook instead
    let hookId = Hooks.on('renderDialogV2', (app, html) => {
      if (!html.querySelector?.('#sr3e-pack-filter')) return; // not our dialog
      Hooks.off('renderDialogV2', hookId);

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
    });

    await foundry.applications.api.DialogV2.wait({
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

    Hooks.off('renderDialogV2', hookId); // clean up if dialog was cancelled

    if (!chosen) return;
    const doc = await fromUuid(chosen);
    if (!doc) return;
    const data = doc.toObject();
    await this.item.update({ name: data.name, system: data.system });
  }
}