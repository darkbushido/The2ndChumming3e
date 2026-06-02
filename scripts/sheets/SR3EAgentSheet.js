import { SR3E } from '../config.js';

export class SR3EAgentSheet extends foundry.applications.sheets.ActorSheetV2 {

  static DEFAULT_OPTIONS = {
    classes: ['sr3e', 'sheet', 'actor', 'agent'],
    tag: 'form',
    position: { width: 460, height: 580 },
    window: { resizable: true },
    form: {
      submitOnChange: true,
      closeOnSubmit: false,
    },
    actions: {
      woundBox:       SR3EAgentSheet._onWoundBox,
      rollInit:       SR3EAgentSheet._onRollInit,
      rollAttack:     SR3EAgentSheet._onRollAttack,
      toggleTemplate: SR3EAgentSheet._onToggleTemplate,
      deployTemplate: SR3EAgentSheet._onDeployTemplate,
      markAsLive:     SR3EAgentSheet._onMarkAsLive,
    },
  };

  static SEC_TIERS = ['Ivory','Blue','Green','Orange','Red','Black','Ultraviolet'];

  get title() { return `${this.actor.name} — Agent`; }

  async _renderHTML(_context, _options) {
    const div = document.createElement('div');
    div.style.cssText = 'flex:1;min-height:0;display:flex;flex-direction:column;';
    div.innerHTML = this._buildSheet(this.actor, this.actor.system);
    return div;
  }

  _replaceHTML(result, content, _options) {
    content.replaceChildren(result);
  }

  _onRender(_context, _options) {
    if (!this.isEditable) return;
    const html = this.element;

    html.querySelectorAll('.agent-row-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        this._removeRow(btn.dataset.section, parseInt(btn.dataset.idx));
      });
    });
    html.querySelectorAll('.agent-row-add').forEach(btn => {
      btn.addEventListener('click', () => this._addRow(btn.dataset.section));
    });
    html.querySelectorAll('select[data-agent-section]').forEach(sel => {
      sel.addEventListener('change', () => {
        this._updateRowSelect(sel.dataset.agentSection, parseInt(sel.dataset.agentIdx), sel.value);
      });
    });
  }

  _buildSheet(actor, sys) {
    const derived    = sys.derived ?? {};
    const woundMax   = derived.woundMax ?? (sys.rating ?? 1) * 2;
    const woundVal   = sys.woundValue ?? 0;
    const tier       = sys.hostSecurityTier ?? 'Green';
    const initDice   = derived.initiativeDice ?? 2;
    const initiative = derived.initiative ?? sys.rating ?? 1;
    const totalMult  = derived.totalMultiplier ?? 1;
    const mpCost     = derived.mpCost ?? 0;
    const operatorId   = sys.operatorActorId ?? '';
    const activeHostId = sys.activeHostId ?? '';
    const activeHost   = activeHostId ? game.actors.get(activeHostId) : null;
    const isTemplate   = actor.getFlag('The2ndChumming3e', 'isTemplate');
    const appearsInUI  = game.sr3e.isLiveActor(actor);

    const tierOpts = SR3EAgentSheet.SEC_TIERS.map(t =>
      `<option value="${t}" ${tier === t ? 'selected' : ''}>${t}</option>`
    ).join('');

    const operatorOpts = `<option value="">— none —</option>` +
      game.actors
        .filter(a => (a.type === 'character' || a.type === 'npc') && game.sr3e.isLiveActor(a))
        .map(a => `<option value="${a.id}" ${a.id === operatorId ? 'selected' : ''}>${a.name}</option>`)
        .join('');

    const woundBoxes = Array.from({ length: woundMax }, (_, i) => {
      const filled = i < woundVal ? 'filled' : '';
      return `<div class="ic-wound-box ${filled}" data-action="woundBox" data-index="${i}"></div>`;
    }).join('');

    const initFormula = initDice > 0
      ? `${initiative} + ${initDice}d6`
      : `${initiative} (no dice)`;

    return `
      <div class="sr3e-inner agent-sheet">
        <header class="ic-header">
          <img class="actor-portrait" src="${actor.img}" alt="${actor.name}" width="56" height="56">
          <div class="ic-name-block">
            <input class="actor-name" type="text" name="name" value="${actor.name}" placeholder="Agent Name"/>
            <div class="ic-subtitle">Programming Agent
              ${sys.graded ? '<span class="prog-graded-badge">Graded</span>' : ''}
            </div>
            <div class="sr3e-template-controls">
              ${isTemplate === true
                ? `<span class="sr3e-template-badge">TEMPLATE</span>
                   <button type="button" class="sr3e-template-btn" data-action="deployTemplate" title="Create a working copy with the template flag removed">Deploy Copy</button>
                   <button type="button" class="sr3e-template-btn sr3e-template-btn-remove" data-action="toggleTemplate" title="Remove template flag">Remove Flag</button>`
                : !appearsInUI
                  ? `<button type="button" class="sr3e-template-btn sr3e-live-btn" data-action="markAsLive" title="Mark as live agent — will appear in host agent dialogs">Mark as Live</button>`
                  : `<button type="button" class="sr3e-template-btn sr3e-template-mark" data-action="toggleTemplate" title="Mark as template — hides from combat targeting dialogs">Mark as Template</button>`
              }
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px">
            <button type="button" class="ic-init-btn" data-action="rollInit" title="Roll Initiative (${initFormula})">
              ⚡ Init
            </button>
            <button type="button" class="ic-attack-btn" data-action="rollAttack"
                    title="Cybercombat attack (${sys.rating ?? 1}d)">
              ⚔ Attack
            </button>
          </div>
        </header>

        <div class="agent-body">

          <div class="ic-fields">
            <label class="ic-field-row">
              <span>Rating</span>
              <input type="number" name="system.rating" value="${sys.rating ?? 1}" min="1" max="12"/>
            </label>
            <label class="ic-field-row">
              <span>Host Tier</span>
              <select name="system.hostSecurityTier">${tierOpts}</select>
            </label>
            <label class="ic-field-row">
              <span>Operator</span>
              <select name="system.operatorActorId">${operatorOpts}</select>
            </label>
            <div class="ic-field-row ic-derived-row">
              <span>Initiative</span>
              <span class="ic-derived-val">${initFormula}</span>
            </div>
            <label class="ic-field-row form-field--check">
              <span>IC Graded</span>
              <input type="checkbox" name="system.graded" ${sys.graded ? 'checked' : ''}/>
            </label>
            <div class="ic-field-row ic-derived-row">
              <span>Active Host</span>
              <span>${activeHost ? activeHost.name : '<span style="color:var(--sr-muted)">— none —</span>'}</span>
            </div>
          </div>

          <div class="ic-wound-section">
            <div class="ic-wound-label">Matrix Damage (${woundVal} / ${woundMax})</div>
            <div class="ic-wound-track">${woundBoxes}</div>
          </div>

          ${this._buildSkillsSection(sys)}
          ${this._buildUtilitiesSection(sys)}
          ${sys.graded ? this._buildAbilitiesSection(sys) : ''}

          <div class="prog-cost-summary">
            <span>Multiplier: <strong>${this._multBreakdown(sys)} = ${totalMult}</strong></span>
            <span>Mp Cost: <strong>${sys.rating ?? 1}² × ${totalMult} = ${mpCost} Mp</strong></span>
            <span style="font-size:11px;color:var(--sr-muted)">Programming test: Programming vs Rating ${sys.rating ?? 1}</span>
          </div>

          <div class="ic-notes-section">
            <label class="ic-notes-label">Notes</label>
            <div class="prosemirror-content" data-edit="system.notes">${sys.notes ?? ''}</div>
          </div>
        </div>
      </div>`;
  }

  _multBreakdown(sys) {
    const skills    = (sys.additionalSkills ?? []).length;
    const utilities = (sys.utilities ?? []).reduce((s, u) => s + (u.multiplier ?? 0), 0);
    const abilities = (sys.specialAbilities ?? []).reduce((s, a) => s + (a.multiplier ?? 0), 0);
    let parts = ['1 base'];
    if (skills)    parts.push(`+${skills} skills`);
    if (utilities) parts.push(`+${utilities} utilities`);
    if (abilities) parts.push(`+${abilities} abilities`);
    return parts.join(' ');
  }

  _buildSkillsSection(sys) {
    const skills = sys.additionalSkills ?? [];
    const rows = skills.map((sk, i) => `
      <div class="prog-row">
        <select data-agent-section="additionalSkills" data-agent-idx="${i}">
          <option value="">— Select Category —</option>
          ${SR3E.agentSkillCategories.map(c =>
            `<option value="${c}" ${sk.category === c ? 'selected' : ''}>${c} (+1)</option>`
          ).join('')}
        </select>
        <span class="prog-mult">+1</span>
        <button type="button" class="agent-row-remove" data-section="additionalSkills" data-idx="${i}" title="Remove">×</button>
      </div>`).join('');

    return `
      <div class="prog-section">
        <h3 class="prog-section-title">Skills</h3>
        <div class="prog-row prog-row--default">
          <span>Computer</span><span class="prog-mult prog-mult--default">default</span>
        </div>
        <div class="prog-row prog-row--default">
          <span>Cybercombat</span><span class="prog-mult prog-mult--default">default</span>
        </div>
        ${rows}
        <button type="button" class="agent-row-add btn-minor" data-section="additionalSkills">+ Add Skill Category</button>
      </div>`;
  }

  _buildUtilitiesSection(sys) {
    const utils = sys.utilities ?? [];
    const rows = utils.map((u, i) => `
      <div class="prog-row">
        <select data-agent-section="utilities" data-agent-idx="${i}">
          <option value="">— Select Utility —</option>
          ${SR3E.agentUtilities.map(opt =>
            `<option value="${opt.name}" ${u.name === opt.name ? 'selected' : ''}>${opt.name} (+${opt.multiplier})</option>`
          ).join('')}
        </select>
        <span class="prog-mult">${u.multiplier ? `+${u.multiplier}` : '—'}</span>
        <button type="button" class="agent-row-remove" data-section="utilities" data-idx="${i}" title="Remove">×</button>
      </div>`).join('');

    return `
      <div class="prog-section">
        <h3 class="prog-section-title">Utilities</h3>
        ${rows || '<p class="prog-empty">No utilities added.</p>'}
        <button type="button" class="agent-row-add btn-minor" data-section="utilities">+ Add Utility</button>
      </div>`;
  }

  _buildAbilitiesSection(sys) {
    const abilities = sys.specialAbilities ?? [];
    const rows = abilities.map((a, i) => `
      <div class="prog-row">
        <select data-agent-section="specialAbilities" data-agent-idx="${i}">
          <option value="">— Select Ability —</option>
          ${SR3E.agentSpecialAbilities.map(opt =>
            `<option value="${opt.name}" ${a.name === opt.name ? 'selected' : ''}>${opt.name} (+${opt.multiplier})</option>`
          ).join('')}
        </select>
        <span class="prog-mult">${a.multiplier ? `+${a.multiplier}` : '—'}</span>
        <button type="button" class="agent-row-remove" data-section="specialAbilities" data-idx="${i}" title="Remove">×</button>
      </div>`).join('');

    return `
      <div class="prog-section">
        <h3 class="prog-section-title">Special Abilities <span class="prog-graded-badge">Graded</span></h3>
        ${rows || '<p class="prog-empty">No special abilities added.</p>'}
        <button type="button" class="agent-row-add btn-minor" data-section="specialAbilities">+ Add Special Ability</button>
      </div>`;
  }

  /* ------------------------------------------------------------------ */
  /*  Array management                                                    */
  /* ------------------------------------------------------------------ */

  _removeRow(section, idx) {
    const arr = [...(this.actor.system[section] ?? [])];
    arr.splice(idx, 1);
    this.actor.update({ [`system.${section}`]: arr });
  }

  _addRow(section) {
    const defaults = {
      additionalSkills: { category: '' },
      utilities:        { name: '', multiplier: 0 },
      specialAbilities: { name: '', multiplier: 0 },
    };
    const arr = [...(this.actor.system[section] ?? [])];
    arr.push(defaults[section] ?? {});
    this.actor.update({ [`system.${section}`]: arr });
  }

  _updateRowSelect(section, idx, value) {
    const arr = (this.actor.system[section] ?? []).map(o => ({ ...o }));
    if (!arr[idx]) return;
    if (section === 'additionalSkills') {
      arr[idx] = { category: value };
    } else if (section === 'utilities') {
      const entry = SR3E.agentUtilities.find(u => u.name === value);
      arr[idx] = { name: value, multiplier: entry?.multiplier ?? 0 };
    } else if (section === 'specialAbilities') {
      const entry = SR3E.agentSpecialAbilities.find(a => a.name === value);
      arr[idx] = { name: value, multiplier: entry?.multiplier ?? 0 };
    }
    this.actor.update({ [`system.${section}`]: arr });
  }

  /* ------------------------------------------------------------------ */
  /*  Action handlers                                                     */
  /* ------------------------------------------------------------------ */

  static async _onWoundBox(_event, target) {
    const actor    = this.actor;
    const idx      = parseInt(target.dataset.index);
    const derived  = actor.system.derived ?? {};
    const woundMax = derived.woundMax ?? (actor.system.rating ?? 1) * 2;
    const current  = actor.system.woundValue ?? 0;
    const newVal   = idx < current ? idx : Math.min(idx + 1, woundMax);
    await actor.update({ 'system.woundValue': newVal });
  }

  static async _onRollInit(_event, _target) {
    await this.actor.rollInitiative();
  }

  static async _onRollAttack(_event, _target) {
    await this.actor.rollICAttack();
  }

  static async _onToggleTemplate(_ev, _target) {
    const current = !!this.actor.getFlag('The2ndChumming3e', 'isTemplate');
    await this.actor.setFlag('The2ndChumming3e', 'isTemplate', !current);
  }

  static async _onMarkAsLive(_ev, _target) {
    await this.actor.setFlag('The2ndChumming3e', 'isTemplate', false);
  }

  static async _onDeployTemplate(_ev, _target) {
    const data = this.actor.toObject();
    delete data._id;
    delete data._stats;
    data.name = `${data.name} (copy)`;
    foundry.utils.setProperty(data, 'flags.The2ndChumming3e.isTemplate', false);
    const newActor = await Actor.create(data);
    newActor.sheet.render(true);
  }
}
