export class SR3EWardSheet extends foundry.applications.sheets.ActorSheetV2 {

  static DEFAULT_OPTIONS = {
    classes: ['sr3e', 'sheet', 'actor', 'ward'],
    tag: 'form',
    position: { width: 420, height: 460 },
    resizable: false,
    form: {
      submitOnChange: true,
      closeOnSubmit: false,
    },
    actions: {
      damageBox:      SR3EWardSheet._onDamageBox,
      attackWard:     SR3EWardSheet._onAttackWard,
      foolWard:       SR3EWardSheet._onFoolWard,
      redrawBoundary: SR3EWardSheet._onRedrawBoundary,
      dispelWard:     SR3EWardSheet._onDispelWard,
    },
  };

  static WARD_TYPES = {
    standard:  'Standard',
    alarm:     'Alarm (harder to detect)',
    polarized: 'Polarized (one-way visibility)',
    masking:   'Masking (hides magic inside)',
  };

  get title() { return `${this.actor.name} — Ward`; }

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
    const maxForce  = sys.maxForce ?? 1;
    const damage    = sys.damage ?? 0;
    const force     = sys.force ?? Math.max(0, maxForce - damage);
    const destroyed = force <= 0;
    const wardType  = sys.wardType ?? 'standard';
    const creator   = sys.creatorActorId ? game.actors.get(sys.creatorActorId) : null;

    const typeOpts = Object.entries(SR3EWardSheet.WARD_TYPES).map(([k, label]) =>
      `<option value="${k}" ${wardType === k ? 'selected' : ''}>${label}</option>`
    ).join('');

    const damageBoxes = Array.from({ length: maxForce }, (_, i) => {
      const filled = i < damage ? 'filled' : '';
      return `<div class="ward-box ${filled}" data-action="damageBox" data-index="${i}"></div>`;
    }).join('');

    return `
      <div class="sr3e-inner ward-sheet">
        <header class="ward-header">
          <img class="actor-portrait" src="${actor.img}" alt="${actor.name}" width="56" height="56">
          <div class="ward-name-block">
            <input class="actor-name" type="text" name="name" value="${actor.name}" placeholder="Ward Name"/>
            <div class="ward-subtitle">
              Astral Ward
              ${destroyed ? '<span class="ward-destroyed-badge">DESTROYED</span>' : `<span class="ward-force-badge">Force ${force}</span>`}
            </div>
          </div>
        </header>

        <div class="ward-body">
          <div class="ward-fields">
            <label class="ward-field-row">
              <span>Type</span>
              <select name="system.wardType">${typeOpts}</select>
            </label>
            <label class="ward-field-row">
              <span>Max Force</span>
              <input type="number" name="system.maxForce" value="${maxForce}" min="1"/>
            </label>
            <label class="ward-field-row ward-field-checkbox">
              <span>Permanent</span>
              <input type="checkbox" name="system.isPermanent" ${sys.isPermanent ? 'checked' : ''}/>
            </label>
            <label class="ward-field-row">
              <span>Weeks Remaining</span>
              <input type="number" name="system.weeksRemaining" value="${sys.weeksRemaining ?? 0}" min="0"
                     ${sys.isPermanent ? 'disabled title="Permanent — ignored"' : ''}/>
            </label>
            <label class="ward-field-row">
              <span>Area Radius (m)</span>
              <input type="number" name="system.areaRadius" value="${sys.areaRadius ?? 5}" min="0"/>
            </label>
            <div class="ward-field-row">
              <span>Creator</span>
              <span class="ward-derived-val">${creator?.name ?? 'Unknown'}</span>
            </div>
          </div>

          <div class="ward-box-section">
            <div class="ward-box-label">Condition Monitor (${damage} / ${maxForce})</div>
            <div class="ward-box-track">${damageBoxes}</div>
          </div>

          <div class="ward-actions">
            <button type="button" class="ward-action-btn ward-attack-btn" data-action="attackWard">⚔ Attack This Ward</button>
            <button type="button" class="ward-action-btn ward-fool-btn" data-action="foolWard">🌫 Fool This Ward</button>
            <button type="button" class="ward-action-btn-sm" data-action="redrawBoundary">🔁 Redraw Boundary</button>
            <button type="button" class="ward-action-btn-sm ward-dispel-btn" data-action="dispelWard">🧹 Dispel Ward</button>
          </div>

          <div class="ward-notes-section">
            <label class="ward-notes-label">Notes</label>
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

  static async _onDamageBox(_event, target) {
    const actor   = this.actor;
    const idx     = parseInt(target.dataset.index);
    const maxForce = actor.system.maxForce ?? 1;
    const current  = actor.system.damage ?? 0;
    const newVal   = idx < current ? idx : Math.min(idx + 1, maxForce);
    await actor.update({ 'system.damage': newVal });
  }

  static async _onAttackWard(_event, _target) {
    await game.sr3e.SR3EWard.openAttackDialog(this.actor);
  }

  static async _onFoolWard(_event, _target) {
    await game.sr3e.SR3EWard.openFoolDialog(this.actor);
  }

  static async _onRedrawBoundary(_event, _target) {
    await game.sr3e.SR3EWard.redrawBoundary(this.actor);
  }

  static async _onDispelWard(_event, _target) {
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: 'Dispel Ward' },
      content: `<p>Dispel <strong>${this.actor.name}</strong>? This deletes the ward and its boundary marker.</p>`,
    });
    if (confirmed) await this.actor.delete();
  }
}
