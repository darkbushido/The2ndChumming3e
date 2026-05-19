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
        } else if (val === 'specific') {
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
          ${this.isEditable ? '<button type="button" class="btn-compendium-pick" data-action="pickFromCompendium" title="Fill from compendium">&#128218; Pick from compendium</button>' : ''}
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

  _sel(label, name, value, opts) {
    const options = opts.map(o => {
      const v = typeof o === 'string' ? o : o.value;
      const l = typeof o === 'string' ? o : o.label;
      return `<option value="${v}" ${value === v ? 'selected' : ''}>${l}</option>`;
    }).join('');
    return `<label class="form-field">
      <span class="field-label">${label}</span>
      <select name="system.${name}">${options}</select>
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
          ${this._f('Weight (kg)', 'weight', s.weight, 'number', 'min="0" step="0.1"')}
          ${this._f('Availability', 'availability', s.availability)}
          ${this._f('Cost (¥)', 'cost', s.cost, 'number')}
          ${this._f('Street Index', 'streetIndex', s.streetIndex)}
          ${this._f('Accessories', 'accessories', s.accessories)}
          ${this._f('Book / Page', 'bookPage', s.bookPage)}
          ${this._check('Area of Effect (AoE)', 'isAoE', s.isAoE)}
        </div>
        ${this._notes(s.notes)}`;

      case 'ammunition':
        return `<div class="form-grid">
          ${this._f('Concealability', 'concealability', s.concealability)}
          ${this._f('Description', 'damage', s.damage, 'text', 'placeholder="Ex-Explosive, Hollow Point…"')}
          ${this._f('Power Modifier', 'powerMod', s.powerMod ?? 0, 'number', 'title="Added to weapon power (negative reduces damage)"')}
          ${this._f('TN Modifier', 'tnMod', s.tnMod ?? 0, 'number', 'title="Added to attack TN (negative makes it easier to hit)"')}
          ${this._f('Weight (kg)', 'weight', s.weight, 'number', 'min="0" step="0.1"')}
          ${this._f('Availability', 'availability', s.availability)}
          ${this._f('Cost (¥)', 'cost', s.cost, 'number')}
          ${this._f('Street Index', 'streetIndex', s.streetIndex)}
          ${this._f('Book / Page', 'bookPage', s.bookPage)}
        </div>
        ${this._notes(s.notes)}`;

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
        const skills          = currentCat ? getSkillsForCategory(currentCat) : [];
        const skillEntry      = currentCat && s.skillName
          ? (SR3ESkills[currentCat] ?? []).find(sk => sk.name === s.skillName)
          : null;
        const specializations   = skillEntry?.specializations ?? [];
        const fixedSpecs        = specializations.filter(spec => !spec.endsWith('->'));
        const hasSpecific       = specializations.some(spec => spec.endsWith('->'));
        const hasDropdown       = fixedSpecs.length > 0;
        const isRemoteOps       = s.specialisation === 'Remote Operations';
        const isSpecificVehicle = !!s.specialisation && !isRemoteOps && !fixedSpecs.includes(s.specialisation);
        const specMode          = !s.specialisation ? 'none' : isRemoteOps ? 'Remote Operations' : isSpecificVehicle ? 'specific' : s.specialisation;
        const linkedAttr      = s.skillName
          ? getLinkedAttributeForSkill(currentCat, s.skillName)
          : getLinkedAttributeForCategory(currentCat);
        const linkedAttrLabel = linkedAttr
          ? linkedAttr.charAt(0).toUpperCase() + linkedAttr.slice(1)
          : '';

        const skillTypeLabel = s.skillType === 'language' ? 'Language'
          : s.skillType === 'knowledge' ? 'Knowledge'
          : 'Active';
        const skillTypeColor = s.skillType === 'language' ? 'var(--sr-green)'
          : s.skillType === 'knowledge' ? 'var(--sr-gold)'
          : 'var(--sr-accent)';

        return `
          <div class="form-grid">
            <div class="form-field">
              <span class="field-label">Skill Type</span>
              <span style="font-weight:bold;color:${skillTypeColor}">${skillTypeLabel}</span>
              <input type="hidden" name="system.skillType" value="${s.skillType ?? 'active'}"/>
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

            ${currentCat ? `
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

            ${currentCat ? `
              <div class="form-field">
                <span class="field-label">Linked Attribute (for defaulting)</span>
                <input type="text" value="${linkedAttrLabel}"
                       readonly disabled style="background:var(--sr-surface); color:var(--sr-text);"/>
                <input type="hidden" name="system.linkedAttribute" value="${linkedAttr}"/>
                <small style="color:var(--sr-muted)">Used when defaulting (Attribute - 2)</small>
              </div>
            ` : ''}

            ${s.skillName ? `
              <div class="form-field">
                <span class="field-label">Specialization (Optional, +2 dice)</span>
                ${hasSpecific && hasDropdown ? `
                  <select id="spec-mode">
                    <option value="none" ${specMode === 'none' ? 'selected' : ''}>— None —</option>
                    ${fixedSpecs.map(spec =>
                      `<option value="${spec}" ${specMode === spec ? 'selected' : ''}>${spec}</option>`
                    ).join('')}
                    <option value="specific" ${specMode === 'specific' ? 'selected' : ''}>Specific Vehicle</option>
                  </select>
                  <input type="hidden" id="spec-hidden" name="system.specialisation" value="${s.specialisation || ''}"/>
                  <div id="spec-text-wrap" style="${isSpecificVehicle ? '' : 'display:none;'}margin-top:4px;">
                    <input type="text" id="spec-text" placeholder="Vehicle name" value="${isSpecificVehicle ? s.specialisation : ''}"/>
                    <small style="color:var(--sr-muted)">Enter the exact vehicle name</small>
                  </div>
                ` : hasSpecific ? `
                  <input type="text" name="system.specialisation" value="${s.specialisation || ''}" placeholder="Vehicle name"/>
                ` : hasDropdown ? `
                  <select name="system.specialisation">
                    <option value="">— None —</option>
                    ${fixedSpecs.map(spec =>
                      `<option value="${spec}" ${s.specialisation === spec ? 'selected' : ''}>${spec}</option>`
                    ).join('')}
                  </select>
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
                          <span style="font-size:11px;color:var(--sr-accent);background:var(--sr-surface);border:1px solid var(--sr-border);border-radius:var(--r);padding:1px 5px"
                                title="Effective dice with this spec">${rating + (sp.level ?? 1)} dice (lv${sp.level ?? 1})</span>
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
                (for defaulting: Attribute - 2)
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
        const isBio = type === 'bioware';
        return `<div class="form-grid">
          ${isBio
            ? this._f('Bio Index', 'bioIndex', s.bioIndex, 'number', 'step="0.1" min="0"')
            : this._f('Essence Cost', 'essenceCost', s.essenceCost, 'number', 'step="0.1" min="0"')}
          ${this._sel('Grade', 'grade', s.grade, SR3E.cyberwareGrades)}
          ${this._f('Rating', 'rating', s.rating, 'number')}
          ${this._f('Cost (¥)', 'cost', s.cost, 'number')}
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
          ${this._sel('Duration', 'duration', s.duration, SR3E.spellDurations)}
          ${this._f('Damage Code', 'damage', s.damage, 'text', 'placeholder="8M"')}
          ${this._f('Drain Code', 'drain', s.drain, 'text', 'placeholder="(F/2)M"')}
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

    // Collect matching entries from packs that declare this itemType in their flags
    const packItems = [];
    for (const pack of game.packs) {
      const itemTypes = pack.metadata.flags?.[game.system.id]?.itemTypes;
      if (!Array.isArray(itemTypes) || !itemTypes.includes(type)) continue;
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

      filterEl.focus();
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