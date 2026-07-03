// SR3E Host Sheet — Orthodox SR3 matrix rules
// Registered in place of SR3EHostSheet when game setting matrixRuleset === 'orthodox'.

const SEC_CODES  = ['Blue', 'Green', 'Orange', 'Red', 'Black'];
const SEC_COLORS = {
  Blue:   '#3377cc',
  Green:  '#00aa44',
  Orange: '#dd6600',
  Red:    '#cc2222',
  Black:  '#111111',
};

const ALERT_LEVELS = ['passive', 'active', 'shutdown'];
const ALERT_LABELS = { passive: 'Passive', active: 'Active', shutdown: 'Shutdown' };
const ALERT_COLORS = {
  passive:  'var(--sr-green)',
  active:   'var(--sr-amber)',
  shutdown: 'var(--sr-red)',
};

const SUBSYSTEMS = [
  { key: 'access',  label: 'Access'  },
  { key: 'files',   label: 'Files'   },
  { key: 'control', label: 'Control' },
  { key: 'index',   label: 'Index'   },
  { key: 'slave',   label: 'Slave'   },
];

// ─────────────────────────────────────────────────────────────────────────────

export class SR3EHostSheetOrthodox extends foundry.applications.sheets.ActorSheetV2 {

  _activeTab = 'overview';

  static DEFAULT_OPTIONS = {
    classes: ['sr3e', 'sheet', 'actor', 'host', 'host-orthodox'],
    tag: 'form',
    position: { width: 620, height: 560 },
    resizable: true,
    window: { resizable: true },
    form: {
      submitOnChange: true,
      closeOnSubmit:  false,
    },
    actions: {
      switchTab:       SR3EHostSheetOrthodox._onSwitchTab,
      setAlertLevel:   SR3EHostSheetOrthodox._onSetAlertLevel,
      setSecCode:      SR3EHostSheetOrthodox._onSetSecCode,
      addIC:              SR3EHostSheetOrthodox._onAddIC,
      removeIC:           SR3EHostSheetOrthodox._onRemoveIC,
      deployIC:           SR3EHostSheetOrthodox._onDeployIC,
      openLinkedActor:    SR3EHostSheetOrthodox._onOpenLinkedActor,
      addTriggerStep:     SR3EHostSheetOrthodox._onAddTriggerStep,
      removeTriggerStep:  SR3EHostSheetOrthodox._onRemoveTriggerStep,
    },
  };

  get title() { return `${this.actor.name} — DataHost`; }

  async render(options = {}, _options2 = {}) {
    if (!game.user.isGM) {
      ui.notifications.warn('Host sheets are visible to Game Masters only.');
      return this;
    }
    return super.render(options, _options2);
  }

  async _renderHTML(_context, _options) {
    const div = document.createElement('div');
    div.style.cssText = 'flex:1;min-height:0;display:flex;flex-direction:column;';
    div.innerHTML = this._buildSheet(this.actor, this.actor.system);
    return div;
  }

  _replaceHTML(result, content, _options) {
    const savedScroll = content.querySelector('.host-body')?.scrollTop ?? 0;
    content.replaceChildren(result);
    const body = content.querySelector('.host-body');
    if (body) body.scrollTop = savedScroll;
  }

  _onRender(_context, _options) {
    // TODO: enrich notes field, wire drag-drop for IC assignment
  }

  // ── Sheet build ─────────────────────────────────────────────────────────────

  _buildSheet(actor, sys) {
    return `
      <div class="sr3e-inner">
        ${this._buildHeader(actor, sys)}
        ${this._buildTabBar()}
        <div class="host-body" style="flex:1;overflow-y:auto;padding:12px;">
          ${this._activeTab === 'overview' ? this._buildOverviewTab(actor, sys) : ''}
          ${this._activeTab === 'ic'       ? this._buildICTab(actor, sys)       : ''}
          ${this._activeTab === 'notes'    ? this._buildNotesTab(actor, sys)    : ''}
        </div>
      </div>`;
  }

  _buildHeader(actor, sys) {
    const code  = sys.orthodoxSecurityCode ?? 'Green';
    const alert = sys.orthodoxAlertLevel   ?? 'passive';

    const codeBtns = SEC_CODES.map(c => {
      const active = c === code;
      return `<button type="button" data-action="setSecCode" data-code="${c}"
        style="padding:2px 8px;border-radius:3px;font-size:11px;cursor:pointer;
          background:${active ? SEC_COLORS[c] : 'var(--sr-surface)'};
          color:${active ? '#fff' : 'var(--sr-muted)'};
          border:1px solid ${active ? SEC_COLORS[c] : 'var(--sr-border)'};"
        >${c}</button>`;
    }).join('');

    const alertBtns = ALERT_LEVELS.map(a => {
      const active = a === alert;
      return `<button type="button" data-action="setAlertLevel" data-level="${a}"
        style="padding:2px 8px;border-radius:3px;font-size:11px;cursor:pointer;
          background:${active ? ALERT_COLORS[a] : 'var(--sr-surface)'};
          color:${active ? '#fff' : 'var(--sr-muted)'};
          border:1px solid ${active ? ALERT_COLORS[a] : 'var(--sr-border)'};"
        >${ALERT_LABELS[a]}</button>`;
    }).join('');

    return `
      <header style="display:flex;align-items:center;gap:10px;padding:8px 12px;
                     border-bottom:1px solid var(--sr-border);background:var(--sr-surface);">
        <img src="${actor.img}"
          style="width:44px;height:44px;object-fit:cover;border-radius:4px;border:1px solid var(--sr-border);">
        <div style="flex:1;min-width:0;">
          <input type="text" name="name" value="${actor.name}"
            style="font-size:16px;font-weight:bold;background:none;border:none;color:var(--sr-text);width:100%;padding:0;">
          <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:5px;align-items:center;">
            <span style="font-size:11px;color:var(--sr-muted);margin-right:2px;">Security:</span>
            ${codeBtns}
            <span style="font-size:11px;color:var(--sr-muted);margin-left:8px;margin-right:2px;">Alert:</span>
            ${alertBtns}
          </div>
        </div>
      </header>`;
  }

  _buildTabBar() {
    const tabs = [
      { id: 'overview', label: 'Overview' },
      { id: 'ic',       label: 'IC'       },
      { id: 'notes',    label: 'Notes'    },
    ];
    const btns = tabs.map(t => {
      const active = this._activeTab === t.id;
      return `<button type="button" data-action="switchTab" data-tab="${t.id}"
        style="padding:5px 14px;border:none;border-radius:3px;font-size:12px;cursor:pointer;
          background:${active ? 'var(--sr-accent)' : 'transparent'};
          color:${active ? '#fff' : 'var(--sr-muted)'};"
        >${t.label}</button>`;
    }).join('');
    return `<nav style="display:flex;gap:4px;padding:6px 12px;
                        border-bottom:1px solid var(--sr-border);background:var(--sr-surface);">${btns}</nav>`;
  }

  // ── Overview tab ─────────────────────────────────────────────────────────────

  _buildOverviewTab(_actor, sys) {
    const sub = sys.orthodoxSubsystems ?? {};

    const rows = SUBSYSTEMS.map(s => {
      const val = sub[s.key] ?? 0;
      return `
        <div style="display:flex;align-items:center;gap:10px;padding:4px 0;">
          <label style="width:56px;font-size:13px;color:var(--sr-muted);text-align:right;">${s.label}</label>
          <input type="number" name="system.orthodoxSubsystems.${s.key}"
            value="${val}" min="0" max="12"
            style="width:54px;text-align:center;background:var(--sr-surface);
                   border:1px solid var(--sr-border);color:var(--sr-text);
                   border-radius:3px;padding:3px 4px;font-size:14px;">
          ${val === 0
            ? '<span style="font-size:11px;color:var(--sr-dim);font-style:italic;">not present</span>'
            : `<span style="font-size:11px;color:var(--sr-muted);">Rating ${val}</span>`}
        </div>`;
    }).join('');

    const secVal = sys.orthodoxSecurityValue ?? 0;

    return `
      <section>
        <h3 style="font-size:12px;color:var(--sr-accent);margin:0 0 8px;
                   text-transform:uppercase;letter-spacing:.06em;">Subsystem Ratings</h3>
        <p style="font-size:11px;color:var(--sr-dim);margin:0 0 10px;">
          Set to 0 for subsystems this host does not support.
        </p>
        <div style="display:inline-flex;flex-direction:column;gap:2px;">${rows}</div>

        <div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--sr-border);">
          <h3 style="font-size:12px;color:var(--sr-accent);margin:0 0 8px;
                     text-transform:uppercase;letter-spacing:.06em;">Security Value</h3>
          <p style="font-size:11px;color:var(--sr-dim);margin:0 0 8px;">
            Dice pool for IC attack tests and IC damage resistance tests (SR3 p.223).
          </p>
          <div style="display:flex;align-items:center;gap:10px;">
            <input type="number" name="system.orthodoxSecurityValue"
              value="${secVal}" min="0" max="20"
              style="width:54px;text-align:center;background:var(--sr-surface);
                     border:1px solid var(--sr-border);color:var(--sr-text);
                     border-radius:3px;padding:3px 4px;font-size:14px;">
            <span style="font-size:12px;color:var(--sr-muted);">${secVal}d6 for IC attacks &amp; soak</span>
          </div>
        </div>

        ${this._buildTriggerSteps(sys)}
      </section>`;
  }

  // ── IC tab ───────────────────────────────────────────────────────────────────

  _buildICTab(_actor, sys) {
    const icList = sys.orthodoxActiveIC ?? [];

    const rows = icList.length
      ? icList.map((ic, i) => `
          <div style="display:flex;align-items:center;gap:8px;padding:5px 0;
                      border-bottom:1px solid var(--sr-border);">
            <span style="flex:1;font-size:13px;">${ic.name}</span>
            <span style="font-size:11px;color:var(--sr-muted);min-width:70px;">${ic.icType ?? ''}</span>
            <span style="font-size:11px;color:var(--sr-muted);">Rtg ${ic.rating ?? '—'}</span>
            <span style="font-size:11px;color:var(--sr-muted);min-width:80px;">
              ${ic.alertRequired === 'any' ? 'Any alert' : (ic.alertRequired ?? 'any')}
            </span>
            <button type="button" data-action="deployIC" data-index="${i}" title="Deploy to combat tracker"
              style="padding:2px 7px;font-size:11px;background:var(--sr-accent);color:#fff;
                     border:none;border-radius:3px;cursor:pointer;">▶</button>
            <button type="button" data-action="openLinkedActor" data-actor-id="${ic.actorId}"
              title="Open actor sheet"
              style="padding:2px 6px;font-size:11px;background:var(--sr-surface);
                     border:1px solid var(--sr-border);border-radius:3px;cursor:pointer;">✎</button>
            <button type="button" data-action="removeIC" data-index="${i}" title="Remove from host"
              style="padding:2px 6px;font-size:11px;background:none;border:none;
                     color:var(--sr-red);cursor:pointer;">✕</button>
          </div>`)
        .join('')
      : `<p style="color:var(--sr-dim);font-size:12px;font-style:italic;">No IC assigned to this host.</p>`;

    return `
      <section>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <h3 style="font-size:12px;color:var(--sr-accent);margin:0;
                     text-transform:uppercase;letter-spacing:.06em;">IC Programs</h3>
          <button type="button" data-action="addIC"
            style="padding:3px 10px;font-size:12px;background:var(--sr-accent);
                   color:#fff;border:none;border-radius:3px;cursor:pointer;">+ Add IC</button>
        </div>
        ${rows}
      </section>`;
  }

  // ── Notes tab ────────────────────────────────────────────────────────────────

  _buildNotesTab(_actor, sys) {
    return `
      <section>
        <h3 style="font-size:12px;color:var(--sr-accent);margin:0 0 8px;
                   text-transform:uppercase;letter-spacing:.06em;">Notes</h3>
        <textarea name="system.notes"
          style="width:100%;min-height:320px;box-sizing:border-box;
                 background:var(--sr-surface);border:1px solid var(--sr-border);
                 color:var(--sr-text);border-radius:4px;padding:8px;
                 font-size:12px;resize:vertical;">${sys.notes ?? ''}</textarea>
      </section>`;
  }

  // ── Trigger step table ───────────────────────────────────────────────────────

  _buildTriggerSteps(sys) {
    const steps = (sys.triggerSteps ?? []).slice().sort((a, b) => (a.tally ?? 0) - (b.tally ?? 0));
    const code  = sys.orthodoxSecurityCode ?? 'Green';
    const secColor = SEC_COLORS[code] ?? 'var(--sr-accent)';

    const rows = steps.length
      ? steps.map((s, i) => {
          const tally = s.tally ?? 0;
          const event = (s.event ?? '').replace(/"/g, '&quot;');
          return `
            <tr style="border-bottom:1px solid var(--sr-border);">
              <td style="width:56px;padding:4px 6px;text-align:center;">
                <input type="number" id="ost-tally-${i}" data-step-idx="${i}"
                  value="${tally}" min="0"
                  style="width:46px;text-align:center;background:var(--sr-surface);
                         border:1px solid var(--sr-border);color:var(--sr-text);
                         border-radius:3px;padding:2px;font-size:13px;">
              </td>
              <td style="padding:4px 6px;">
                <input type="text" id="ost-event-${i}" data-step-idx="${i}"
                  value="${event}"
                  placeholder="e.g. Probe 5 activates / Passive Alert"
                  style="width:100%;background:var(--sr-surface);
                         border:1px solid var(--sr-border);color:var(--sr-text);
                         border-radius:3px;padding:3px 6px;font-size:12px;box-sizing:border-box;">
              </td>
              <td style="width:28px;padding:4px 2px;text-align:center;">
                <button type="button" data-action="removeTriggerStep" data-index="${i}"
                  title="Remove step"
                  style="background:none;border:none;color:var(--sr-red);
                         font-size:14px;cursor:pointer;padding:2px 4px;">✕</button>
              </td>
            </tr>`;
        }).join('')
      : `<tr><td colspan="3" style="padding:8px 6px;font-size:12px;color:var(--sr-dim);
                                     font-style:italic;">No trigger steps defined.</td></tr>`;

    return `
      <div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--sr-border);">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <div>
            <h3 style="font-size:12px;color:${secColor};margin:0;
                       text-transform:uppercase;letter-spacing:.06em;">Security Sheaf</h3>
            <p style="font-size:11px;color:var(--sr-dim);margin:2px 0 0;">
              Tally threshold → triggered event (SR3 p.222). GM applies these manually.
            </p>
          </div>
          <button type="button" data-action="addTriggerStep"
            style="padding:3px 10px;font-size:12px;background:var(--sr-surface);
                   color:var(--sr-accent);border:1px solid var(--sr-accent);
                   border-radius:3px;cursor:pointer;">+ Step</button>
        </div>
        <table id="ost-trigger-table"
          style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="border-bottom:1px solid var(--sr-border);">
              <th style="width:56px;padding:2px 6px;font-size:11px;
                         color:var(--sr-muted);font-weight:normal;text-align:center;">Tally</th>
              <th style="padding:2px 6px;font-size:11px;
                         color:var(--sr-muted);font-weight:normal;text-align:left;">Event</th>
              <th style="width:28px;"></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  // ── Action handlers ──────────────────────────────────────────────────────────

  static _onSwitchTab(_event, btn) {
    this._activeTab = btn.dataset.tab;
    this.render();
  }

  static async _onSetAlertLevel(_event, btn) {
    await this.actor.update({ 'system.orthodoxAlertLevel': btn.dataset.level });
  }

  static async _onSetSecCode(_event, btn) {
    await this.actor.update({ 'system.orthodoxSecurityCode': btn.dataset.code });
  }

  static async _onAddIC() {
    const icActors = game.actors.filter(a => a.type === 'ic');
    if (!icActors.length) {
      return void ui.notifications.warn('No IC actors found. Create IC actors in the Actors directory first.');
    }

    const actorOpts = icActors
      .map(a => `<option value="${a.id}">${a.name}</option>`)
      .join('');
    const alertOpts = ['any', ...ALERT_LEVELS]
      .map(a => `<option value="${a}">${a === 'any' ? 'Any (always present)' : ALERT_LABELS[a]}</option>`)
      .join('');

    let result = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: 'Assign IC to Host' },
      content: `
        <div style="display:flex;flex-direction:column;gap:8px;padding:4px 0;">
          <label style="font-size:12px;color:var(--sr-muted);">IC Actor</label>
          <select id="orth-ic-actor"
            style="background:var(--sr-surface);border:1px solid var(--sr-border);
                   color:var(--sr-text);padding:4px;border-radius:3px;">${actorOpts}</select>
          <label style="font-size:12px;color:var(--sr-muted);margin-top:4px;">Deploys when alert reaches</label>
          <select id="orth-ic-alert"
            style="background:var(--sr-surface);border:1px solid var(--sr-border);
                   color:var(--sr-text);padding:4px;border-radius:3px;">${alertOpts}</select>
        </div>`,
      buttons: [
        {
          label: 'Add',
          action: 'add',
          default: true,
          callback: (_e, _b, dialog) => {
            const actorId      = dialog.element.querySelector('#orth-ic-actor')?.value;
            const alertRequired = dialog.element.querySelector('#orth-ic-alert')?.value;
            const a = game.actors.get(actorId);
            if (a) result = {
              actorId,
              name:          a.name,
              icType:        a.system?.icType ?? '',
              rating:        a.system?.rating ?? 0,
              alertRequired,
            };
          },
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    if (!result) return;

    const current = foundry.utils.deepClone(this.actor.system.orthodoxActiveIC ?? []);
    current.push(result);
    await this.actor.update({ 'system.orthodoxActiveIC': current });
  }

  static async _onRemoveIC(_event, btn) {
    const idx     = parseInt(btn.dataset.index);
    const current = foundry.utils.deepClone(this.actor.system.orthodoxActiveIC ?? []);
    current.splice(idx, 1);
    await this.actor.update({ 'system.orthodoxActiveIC': current });
  }

  static async _onDeployIC(_event, btn) {
    const idx   = parseInt(btn.dataset.index);
    const entry = (this.actor.system.orthodoxActiveIC ?? [])[idx];
    if (!entry) return;

    const icActor = game.actors.get(entry.actorId);
    if (!icActor) return void ui.notifications.warn(`IC actor "${entry.name}" not found in world.`);

    const combat = game.combat;
    if (!combat) return void ui.notifications.warn('No active combat encounter. Start one first.');

    const token = icActor.getActiveTokens()[0];
    await combat.createEmbeddedDocuments('Combatant', [{
      actorId: icActor.id,
      tokenId: token?.id ?? null,
      name:    icActor.name,
    }]);
    ui.notifications.info(`${icActor.name} deployed to the combat tracker.`);
  }

  static _onOpenLinkedActor(_event, btn) {
    game.actors.get(btn.dataset.actorId)?.sheet.render(true);
  }

  static async _onAddTriggerStep() {
    const current = foundry.utils.deepClone(this.actor.system.triggerSteps ?? []);
    current.push({ tally: (current.length ? Math.max(...current.map(s => s.tally ?? 0)) + 1 : 1), event: '' });
    await this.actor.update({ 'system.triggerSteps': current });
  }

  static async _onRemoveTriggerStep(_event, btn) {
    const idx     = parseInt(btn.dataset.index);
    const current = foundry.utils.deepClone(this.actor.system.triggerSteps ?? []);
    // Steps are rendered sorted; find the step by its sorted position
    const sorted = current.map((s, i) => ({ s, i })).sort((a, b) => (a.s.tally ?? 0) - (b.s.tally ?? 0));
    const realIdx = sorted[idx]?.i;
    if (realIdx === undefined) return;
    current.splice(realIdx, 1);
    await this.actor.update({ 'system.triggerSteps': current });
  }

  _onRender(_context, _options) {
    // Save trigger step edits on blur/change
    const table = this.element?.querySelector('#ost-trigger-table');
    if (!table) return;

    const save = async () => {
      const sorted = foundry.utils.deepClone(this.actor.system.triggerSteps ?? [])
        .map((s, i) => ({ s, i })).sort((a, b) => (a.s.tally ?? 0) - (b.s.tally ?? 0));
      const rows = table.querySelectorAll('tbody tr');
      rows.forEach((row, i) => {
        if (i >= sorted.length) return;
        const tallyEl = row.querySelector(`#ost-tally-${i}`);
        const eventEl = row.querySelector(`#ost-event-${i}`);
        if (tallyEl) sorted[i].s.tally = parseInt(tallyEl.value) || 0;
        if (eventEl) sorted[i].s.event = eventEl.value;
      });
      const updated = sorted.map(x => x.s);
      await this.actor.update({ 'system.triggerSteps': updated });
    };

    table.querySelectorAll('input[id^="ost-tally-"], input[id^="ost-event-"]').forEach(inp => {
      inp.addEventListener('blur', save);
      inp.addEventListener('change', save);
    });
  }
}
