export class SR3EICSheet extends foundry.applications.sheets.ActorSheetV2 {

  static DEFAULT_OPTIONS = {
    classes: ['sr3e', 'sheet', 'actor', 'ic'],
    tag: 'form',
    position: { width: 440, height: 480 },
    resizable: false,
    form: {
      submitOnChange: true,
      closeOnSubmit: false,
    },
    actions: {
      woundBox:     SR3EICSheet._onWoundBox,
      rollInit:     SR3EICSheet._onRollInit,
      rollAttack:   SR3EICSheet._onRollAttack,
      clearDeploy:  SR3EICSheet._onClearDeploy,
    },
  };

  // Official IC/Agent types from Matrix Defragged, grouped by grading
  static IC_AGENTS = {
    White: ['ARis','Authenticator','Looper','Mr. Medkit','Scrambler'],
    Gray:  ['Blaster','Crippler','Dataworm','Gemini','Hydra','Sparky','Tar Baby','Tracker'],
    Black: ['Killer','Ripper'],
  };

  static SEC_TIERS = ['Ivory','Blue','Green','Orange','Red','Black','Ultraviolet'];

  get title() { return `${this.actor.name} — IC`; }

  async _renderHTML(_context, _options) {
    const div = document.createElement('div');
    div.style.cssText = 'flex:1;min-height:0;display:flex;flex-direction:column;';
    div.innerHTML = this._buildSheet(this.actor, this.actor.system);
    return div;
  }

  _replaceHTML(result, content, _options) {
    content.replaceChildren(result);
  }

  _buildSheet(actor, sys) {
    const derived      = sys.derived ?? {};
    const woundMax     = derived.woundMax ?? (sys.rating ?? 1) * 2;
    const woundVal     = sys.woundValue ?? 0;
    const grading      = sys.grading ?? 'White';
    const tier         = sys.hostSecurityTier ?? 'Green';
    const initDice     = derived.initiativeDice ?? 2;
    const initiative   = derived.initiative ?? sys.rating ?? 1;
    const systemRating = sys.systemRating ?? 6;
    const deployed     = sys.deployed ?? false;
    const activeHostId = sys.activeHostId ?? '';
    const activeHost   = activeHostId ? game.actors.get(activeHostId) : null;

    const agentsForGrading = SR3EICSheet.IC_AGENTS[grading] ?? SR3EICSheet.IC_AGENTS.White;
    const currentType = sys.icType ?? agentsForGrading[0];
    const typeOpts = agentsForGrading.map(t =>
      `<option value="${t}" ${currentType === t ? 'selected' : ''}>${t}</option>`
    ).join('');

    const gradingOpts = ['White','Gray','Black'].map(g =>
      `<option value="${g}" ${grading === g ? 'selected' : ''}>${g}</option>`
    ).join('');

    const tierOpts = SR3EICSheet.SEC_TIERS.map(t =>
      `<option value="${t}" ${tier === t ? 'selected' : ''}>${t}</option>`
    ).join('');

    const woundBoxes = Array.from({ length: woundMax }, (_, i) => {
      const filled = i < woundVal ? 'filled' : '';
      return `<div class="ic-wound-box ${filled}" data-action="woundBox" data-index="${i}"></div>`;
    }).join('');

    const initFormula = initDice > 0
      ? `${initiative} + ${initDice}d6`
      : `${initiative} (no dice)`;

    const gradingColor = { White: 'var(--sr-text)', Gray: 'var(--sr-amber)', Black: 'var(--sr-red)' };
    const gradingStyle = `color:${gradingColor[grading] ?? 'var(--sr-text)'}`;

    const damageCode = sys.damage && sys.damage.trim() ? sys.damage.trim() : `${sys.rating ?? 1}S`;

    return `
      <div class="sr3e-inner ic-sheet">
        <header class="ic-header">
          <img class="actor-portrait" src="${actor.img}" alt="${actor.name}" width="56" height="56">
          <div class="ic-name-block">
            <input class="actor-name" type="text" name="name" value="${actor.name}" placeholder="IC Name"/>
            <div class="ic-subtitle">Intrusion Countermeasure
              <span class="ic-grading-badge" style="${gradingStyle}">[${grading}]</span>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px">
            <button type="button" class="ic-init-btn" data-action="rollInit" title="Roll Initiative (${initFormula})">
              ⚡ Init
            </button>
            <button type="button" class="ic-attack-btn" data-action="rollAttack"
                    title="Cybercombat attack (${sys.rating ?? 1}d vs MPCP, damage ${damageCode})">
              ⚔ Attack
            </button>
          </div>
        </header>

        <div class="ic-body">
          <div class="ic-fields">
            <label class="ic-field-row">
              <span>Grading</span>
              <select name="system.grading">${gradingOpts}</select>
            </label>
            <label class="ic-field-row">
              <span>Type</span>
              <select name="system.icType">${typeOpts}</select>
            </label>
            <label class="ic-field-row">
              <span>Rating</span>
              <input type="number" name="system.rating" value="${sys.rating ?? 1}" min="1" max="12"/>
            </label>
            <label class="ic-field-row">
              <span>System Rating</span>
              <input type="number" name="system.systemRating" value="${systemRating}" min="1" max="12"
                     title="Host's System Rating — TN for attacks, pool for soaking matrix damage"/>
            </label>
            <label class="ic-field-row">
              <span>Memory (Mp)</span>
              <input type="number" name="system.memoryRequired" value="${sys.memoryRequired ?? 0}" min="0"/>
            </label>
            <label class="ic-field-row">
              <span>Damage Code</span>
              <input type="text" name="system.damage" value="${sys.damage ?? ''}" placeholder="e.g. 6S"/>
            </label>
            <label class="ic-field-row">
              <span>Host Tier</span>
              <select name="system.hostSecurityTier">${tierOpts}</select>
            </label>
            <div class="ic-field-row ic-derived-row">
              <span>Initiative</span>
              <span class="ic-derived-val">${initFormula}</span>
            </div>
          </div>

          <div class="ic-wound-section">
            <div class="ic-wound-label">Matrix Damage (${woundVal} / ${woundMax})</div>
            <div class="ic-wound-track">${woundBoxes}</div>
          </div>

          <div class="ic-field-row ic-derived-row" style="margin-top:6px">
            <span>Status</span>
            <span>
              ${deployed
                ? `<span style="color:var(--sr-red);font-weight:600">⚔ Deployed</span>${activeHost ? ` — ${activeHost.name}` : ''}
                   <button type="button" class="btn-xs" data-action="clearDeploy"
                           style="margin-left:6px;color:var(--sr-muted)" title="Clear deployment flag">✕ Clear</button>`
                : `<span style="color:var(--sr-muted)">Stocked</span>${activeHost ? ` — ${activeHost.name}` : ''}`
              }
            </span>
          </div>

          <div class="ic-notes-section">
            <label class="ic-notes-label">Notes</label>
            <div class="prosemirror-content" data-edit="system.notes">
              ${sys.notes ?? ''}
            </div>
          </div>
        </div>
      </div>`;
  }

  /* ------------------------------------------------------------------ */
  /*  Action handlers                                                     */
  /* ------------------------------------------------------------------ */

  static async _onWoundBox(_event, target) {
    const actor    = this.actor;
    const idx      = parseInt(target.dataset.index);
    const sys      = actor.system;
    const derived  = sys.derived ?? {};
    const woundMax = derived.woundMax ?? (sys.rating ?? 1) * 2;
    const current  = sys.woundValue ?? 0;

    const newVal = idx < current ? idx : Math.min(idx + 1, woundMax);
    await actor.update({ 'system.woundValue': newVal });
  }

  static async _onRollInit(_event, _target) {
    await this.actor.rollInitiative();
  }

  static async _onRollAttack(_event, _target) {
    await this.actor.rollICAttack();
  }

  static async _onClearDeploy(_event, _target) {
    await this.actor.update({ 'system.deployed': false, 'system.activeHostId': '' });
  }
}
