// SR3E IC Sheet — Orthodox SR3 matrix rules (SR3 Core p.212–223)
// Registered in place of SR3EICSheet when game setting matrixRuleset === 'orthodox'.
//
// Orthodox IC has one mechanical stat: Rating.
// Attack pool and damage resistance both use the HOST's Security Value.
// Initiative = IC Rating + Nd6, where N is set by the host's security code.

const SEC_COLORS = {
  Blue:   '#3377cc',
  Green:  '#00aa44',
  Orange: '#dd6600',
  Red:    '#cc2222',
  Black:  '#111111',
};

// SR3 Core p.223 — IC Initiative Table
const INIT_DICE = { Blue: 1, Green: 2, Orange: 3, Red: 4 };

// SR3 Core p.223 — IC Damage Table
const DAMAGE_LEVEL = { Blue: 'Moderate', Green: 'Moderate', Orange: 'Serious', Red: 'Serious' };

// SR3 Core p.223 — Cybercombat Target Numbers (TN for IC to hit an intruder)
const TN_VS_INTRUDER = { Blue: 6, Green: 5, Orange: 4, Red: 3 };

const ORTH_IC_TYPES = [
  'Probe', 'Trace', 'Blaster', 'Crippler', 'Tar Baby',
  'Scramble', 'Killer', 'Ripper', 'Marker', 'Sparky',
];

// ─────────────────────────────────────────────────────────────────────────────

export class SR3EICSheetOrthodox extends foundry.applications.sheets.ActorSheetV2 {

  static DEFAULT_OPTIONS = {
    classes: ['sr3e', 'sheet', 'actor', 'ic', 'ic-orthodox'],
    tag: 'form',
    position: { width: 420, height: 460 },
    resizable: false,
    form: {
      submitOnChange: true,
      closeOnSubmit:  false,
    },
    actions: {
      rollInit:        SR3EICSheetOrthodox._onRollInit,
      rollAttack:      SR3EICSheetOrthodox._onRollAttack,
      openHost:        SR3EICSheetOrthodox._onOpenHost,
      clearHost:       SR3EICSheetOrthodox._onClearHost,
      setHost:         SR3EICSheetOrthodox._onSetHost,
      toggleProactive: SR3EICSheetOrthodox._onToggleProactive,
      toggleTemplate:  SR3EICSheetOrthodox._onToggleTemplate,
      deployTemplate:  SR3EICSheetOrthodox._onDeployTemplate,
      markAsLive:      SR3EICSheetOrthodox._onMarkAsLive,
    },
  };

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

  _onRender(_context, _options) {
    // TODO: wire drag-drop from actor directory to set host link
  }

  // ── Sheet build ─────────────────────────────────────────────────────────────

  _buildSheet(actor, sys) {
    const isTemplate  = actor.getFlag('The2ndChumming3e', 'isTemplate');
    const appearsInUI = game.sr3e?.isLiveActor(actor) ?? !isTemplate;

    return `
      <div class="sr3e-inner">
        ${this._buildHeader(actor, sys)}
        <div style="padding:12px;display:flex;flex-direction:column;gap:14px;overflow-y:auto;flex:1;">
          ${this._buildCoreStats(actor, sys)}
          ${this._buildHostSection(sys)}
          ${this._buildDerivedPanel(sys)}
          ${this._buildRollButtons(sys)}
          ${this._buildTemplateControls(actor, isTemplate, appearsInUI)}
        </div>
      </div>`;
  }

  _buildHeader(actor, sys) {
    const icType   = sys.orthodoxIcType ?? 'Probe';
    const typeOpts = ORTH_IC_TYPES.map(t =>
      `<option value="${t}" ${t === icType ? 'selected' : ''}>${t}</option>`).join('');

    const proactive = sys.orthodoxProactive ?? true;

    return `
      <header style="display:flex;align-items:center;gap:10px;padding:8px 12px;
                     border-bottom:1px solid var(--sr-border);background:var(--sr-surface);">
        <img src="${actor.img}"
          style="width:44px;height:44px;object-fit:cover;border-radius:4px;border:1px solid var(--sr-border);">
        <div style="flex:1;min-width:0;">
          <input type="text" name="name" value="${actor.name}"
            style="font-size:15px;font-weight:bold;background:none;border:none;color:var(--sr-text);width:100%;padding:0;">
          <div style="display:flex;align-items:center;gap:8px;margin-top:5px;">
            <select name="system.orthodoxIcType"
              style="font-size:12px;background:var(--sr-surface);border:1px solid var(--sr-border);
                     color:var(--sr-text);padding:2px 4px;border-radius:3px;">${typeOpts}</select>
            <button type="button" data-action="toggleProactive"
              style="padding:2px 8px;font-size:11px;border-radius:3px;cursor:pointer;
                border:1px solid var(--sr-border);
                background:${proactive ? 'var(--sr-accent)' : 'var(--sr-surface)'};
                color:${proactive ? '#fff' : 'var(--sr-muted)'};">
              ${proactive ? 'Proactive' : 'Reactive'}
            </button>
          </div>
        </div>
      </header>`;
  }

  _buildCoreStats(_actor, sys) {
    const rating = sys.rating ?? 1;
    return `
      <section style="display:flex;align-items:center;gap:16px;">
        <div style="text-align:center;">
          <div style="font-size:11px;color:var(--sr-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px;">Rating</div>
          <input type="number" name="system.rating" value="${rating}" min="1" max="12"
            style="width:60px;text-align:center;font-size:26px;font-weight:bold;
                   background:var(--sr-surface);border:1px solid var(--sr-border);
                   color:var(--sr-text);border-radius:4px;padding:4px;">
        </div>
        <div style="flex:1;font-size:11px;color:var(--sr-dim);line-height:1.5;">
          Rating = damage Power · sets TN for decker tests · used in IC-specific rolls.<br>
          Attack pool &amp; soak come from the linked host's Security Value.
        </div>
      </section>`;
  }

  _buildHostSection(sys) {
    const hostId   = sys.activeHostId ?? '';
    const host     = hostId ? game.actors.get(hostId) : null;
    const hostName = host?.name ?? '';

    const linkRow = host
      ? `<div style="display:flex;align-items:center;gap:6px;">
           <span style="font-size:13px;color:var(--sr-text);flex:1;">${hostName}</span>
           <button type="button" data-action="openHost" title="Open host sheet"
             style="padding:2px 6px;font-size:11px;background:var(--sr-surface);
                    border:1px solid var(--sr-border);border-radius:3px;cursor:pointer;">✎</button>
           <button type="button" data-action="clearHost" title="Unlink host"
             style="padding:2px 6px;font-size:11px;background:none;border:none;
                    color:var(--sr-red);cursor:pointer;">✕</button>
         </div>`
      : `<div style="display:flex;align-items:center;gap:6px;">
           <span style="font-size:12px;color:var(--sr-dim);font-style:italic;flex:1;">No host linked</span>
           <button type="button" data-action="setHost"
             style="padding:2px 10px;font-size:12px;background:var(--sr-accent);
                    color:#fff;border:none;border-radius:3px;cursor:pointer;">Link Host</button>
         </div>`;

    return `
      <section style="padding:8px 10px;background:var(--sr-surface);border:1px solid var(--sr-border);border-radius:4px;">
        <div style="font-size:11px;color:var(--sr-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">Host</div>
        ${linkRow}
      </section>`;
  }

  _buildDerivedPanel(sys) {
    const hostId = sys.activeHostId ?? '';
    const host   = hostId ? game.actors.get(hostId) : null;
    const hsys   = host?.system;

    if (!host || !hsys) {
      return `
        <section style="padding:8px 10px;background:var(--sr-surface);border:1px solid var(--sr-border);
                        border-radius:4px;opacity:.5;">
          <div style="font-size:11px;color:var(--sr-muted);margin-bottom:4px;">Derived from Host (link a host to see)</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;color:var(--sr-dim);">
            <span>Initiative: —</span>
            <span>Attack pool: —</span>
            <span>Damage level: —</span>
            <span>TN vs intruder: —</span>
          </div>
        </section>`;
    }

    const code     = hsys.orthodoxSecurityCode ?? 'Green';
    const secVal   = hsys.orthodoxSecurityValue ?? 0;
    const rating   = sys.rating ?? 1;
    const initDice = INIT_DICE[code] ?? 2;
    const dmgLevel = DAMAGE_LEVEL[code] ?? 'Moderate';
    const tnHit    = TN_VS_INTRUDER[code] ?? 5;
    const codeColor = SEC_COLORS[code] ?? '#00aa44';

    return `
      <section style="padding:8px 10px;background:var(--sr-surface);border:1px solid var(--sr-border);border-radius:4px;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
          <div style="font-size:11px;color:var(--sr-muted);text-transform:uppercase;letter-spacing:.06em;">Derived from Host</div>
          <span style="background:${codeColor};color:#fff;padding:1px 7px;border-radius:3px;font-size:11px;font-weight:bold;">${code}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;font-size:12px;">
          <div>
            <div style="color:var(--sr-muted);font-size:10px;text-transform:uppercase;margin-bottom:2px;">Initiative</div>
            <div style="color:var(--sr-text);font-weight:bold;">${rating} + ${initDice}d6</div>
          </div>
          <div>
            <div style="color:var(--sr-muted);font-size:10px;text-transform:uppercase;margin-bottom:2px;">Attack Pool</div>
            <div style="color:var(--sr-text);font-weight:bold;">${secVal}d6</div>
          </div>
          <div>
            <div style="color:var(--sr-muted);font-size:10px;text-transform:uppercase;margin-bottom:2px;">Damage Level</div>
            <div style="color:var(--sr-text);font-weight:bold;">${rating}${dmgLevel.charAt(0)} <span style="font-weight:normal;color:var(--sr-muted);">(${dmgLevel})</span></div>
          </div>
          <div>
            <div style="color:var(--sr-muted);font-size:10px;text-transform:uppercase;margin-bottom:2px;">TN vs Intruder</div>
            <div style="color:var(--sr-text);font-weight:bold;">${tnHit}</div>
          </div>
        </div>
        <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--sr-border);
                    font-size:11px;color:var(--sr-muted);">
          Soak: ${secVal}d6 vs TN = IC Rating (${rating}) — mid-turn deploy: −10 init per completed pass
        </div>
      </section>`;
  }

  _buildRollButtons(sys) {
    const host   = game.actors.get(sys.activeHostId ?? '');
    const noHost = !host;
    const dim    = 'opacity:.4;pointer-events:none;';

    return `
      <div style="display:flex;gap:8px;">
        <button type="button" data-action="rollInit" ${noHost ? 'disabled' : ''}
          style="flex:1;padding:6px;font-size:13px;background:var(--sr-surface);
                 border:1px solid var(--sr-border);border-radius:4px;cursor:pointer;
                 color:var(--sr-text);${noHost ? dim : ''}"
          title="${noHost ? 'Link a host first' : 'Roll initiative'}">
          ⚡ Roll Initiative
        </button>
        <button type="button" data-action="rollAttack" ${noHost ? 'disabled' : ''}
          style="flex:1;padding:6px;font-size:13px;background:var(--sr-accent);
                 color:#fff;border:none;border-radius:4px;cursor:pointer;
                 ${noHost ? dim : ''}"
          title="${noHost ? 'Link a host first' : 'Roll IC attack'}">
          ⚔ Roll Attack
        </button>
      </div>`;
  }

  _buildTemplateControls(actor, isTemplate, appearsInUI) {
    if (!game.user.isGM) return '';
    if (appearsInUI) return '';

    return `
      <div style="padding:8px;background:var(--sr-surface);border:1px solid var(--sr-border);
                  border-radius:4px;font-size:11px;color:var(--sr-muted);display:flex;gap:8px;align-items:center;">
        <span style="flex:1;">Compendium template — not visible in dialogs</span>
        <button type="button" data-action="deployTemplate"
          style="padding:2px 8px;font-size:11px;background:var(--sr-accent);color:#fff;
                 border:none;border-radius:3px;cursor:pointer;">Deploy as Live</button>
      </div>`;
  }

  // ── Action handlers ──────────────────────────────────────────────────────────

  static async _onRollInit() {
    const sys    = this.actor.system;
    const host   = game.actors.get(sys.activeHostId ?? '');
    if (!host) return void ui.notifications.warn('No host linked — cannot determine initiative formula.');

    const code     = host.system.orthodoxSecurityCode ?? 'Green';
    const initDice = INIT_DICE[code] ?? 2;
    const rating   = sys.rating ?? 1;

    // Roll initiative and post to chat, then update combatant if in tracker
    const roll    = new Roll(`${rating} + ${initDice}d6`);
    await roll.evaluate();
    const total   = roll.total;
    await roll.toMessage({ flavor: `${this.actor.name} Initiative (${code} host)`, speaker: { actor: this.actor.id } });

    const combatant = game.combat?.combatants.find(c => c.actorId === this.actor.id);
    if (combatant) await combatant.update({ initiative: total });
  }

  static async _onRollAttack() {
    await this.actor.rollOrthodoxICAttack();
  }

  static async _onSetHost() {
    const hostActors = game.actors
      .filter(a => a.type === 'host' && !a.getFlag('The2ndChumming3e', 'isTemplate'));
    if (!hostActors.length) return void ui.notifications.warn('No host actors found in the world.');

    const opts = hostActors.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    let chosen = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: 'Link IC to Host' },
      content: `
        <div style="padding:4px 0;">
          <label style="font-size:12px;color:var(--sr-muted);">Host actor</label>
          <select id="orth-host-sel"
            style="width:100%;margin-top:4px;background:var(--sr-surface);
                   border:1px solid var(--sr-border);color:var(--sr-text);
                   padding:4px;border-radius:3px;">${opts}</select>
        </div>`,
      buttons: [
        {
          label: 'Link',
          action: 'link',
          default: true,
          callback: (_e, _b, dialog) => {
            chosen = dialog.element.querySelector('#orth-host-sel')?.value ?? null;
          },
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    if (chosen) await this.actor.update({ 'system.activeHostId': chosen });
  }

  static async _onClearHost() {
    await this.actor.update({ 'system.activeHostId': '' });
  }

  static _onOpenHost() {
    game.actors.get(this.actor.system.activeHostId ?? '')?.sheet.render(true);
  }

  static async _onToggleProactive() {
    const current = this.actor.system.orthodoxProactive ?? true;
    await this.actor.update({ 'system.orthodoxProactive': !current });
  }

  static _onToggleTemplate() {
    const current = this.actor.getFlag('The2ndChumming3e', 'isTemplate') ?? false;
    this.actor.setFlag('The2ndChumming3e', 'isTemplate', !current);
  }

  static async _onDeployTemplate() {
    await this.actor.setFlag('The2ndChumming3e', 'isTemplate', false);
    ui.notifications.info(`${this.actor.name} is now a live IC actor.`);
  }

  static async _onMarkAsLive() {
    await this.actor.setFlag('The2ndChumming3e', 'isTemplate', false);
  }
}
