export class SR3EVehicleSheet extends foundry.applications.sheets.ActorSheetV2 {

  _activeTab = 'stats';

  static DEFAULT_OPTIONS = {
    classes: ['sr3e', 'sheet', 'actor', 'vehicle'],
    tag: 'form',
    position: { width: 680, height: 680 },
    resizable: true,
    window: { resizable: true },
    form: {
      submitOnChange: true,
      closeOnSubmit: false,
    },
    actions: {
      switchTab:      SR3EVehicleSheet._onSwitchTab,
      damageBox:      SR3EVehicleSheet._onDamageBox,
      applyDamage:    SR3EVehicleSheet._onApplyDamage,
      healDamage:     SR3EVehicleSheet._onHealDamage,
      itemCreate:     SR3EVehicleSheet._onItemCreate,
      itemEdit:       SR3EVehicleSheet._onItemEdit,
      itemDelete:     SR3EVehicleSheet._onItemDelete,
      rollContested:  SR3EVehicleSheet._onRollContested,
      drivingTest:    SR3EVehicleSheet._onDrivingTest,
      droneComprehension: SR3EVehicleSheet._onDroneComprehension,
      openPilot:      SR3EVehicleSheet._onOpenPilot,
      rollWeapon:     SR3EVehicleSheet._onRollWeapon,
      rollMelee:      SR3EVehicleSheet._onRollMelee,
      setVcrMode:      SR3EVehicleSheet._onSetVcrMode,
      setRcdMode:      SR3EVehicleSheet._onSetRcdMode,
      setAutoMode:     SR3EVehicleSheet._onSetAutoMode,
      toggleTemplate:  SR3EVehicleSheet._onToggleTemplate,
      deployTemplate:  SR3EVehicleSheet._onDeployTemplate,
      markAsLive:      SR3EVehicleSheet._onMarkAsLive,
      // Electronic Warfare
      signalBox:           SR3EVehicleSheet._onSignalBox,
      signalInfil:         SR3EVehicleSheet._onSignalInfil,
      signalDamage:        SR3EVehicleSheet._onSignalDamage,
      recalcFootprint:     SR3EVehicleSheet._onRecalcFootprint,
      mijiAttack:          SR3EVehicleSheet._onMijiAttack,
      infiltrate:          SR3EVehicleSheet._onInfiltrate,
      detectInfiltration:  SR3EVehicleSheet._onDetectInfiltration,
      advanceInfiltration: SR3EVehicleSheet._onAdvanceInfiltration,
      eccmRepair:          SR3EVehicleSheet._onEccmRepair,
      reduceFootprint:     SR3EVehicleSheet._onReduceFootprint,
    }
  };

  get title() { return `${this.actor.name} — Vehicle`; }

  async _renderHTML(_context, _options) {
    const actor = this.actor;
    const sys   = actor.system;
    const html  = this._buildSheet(actor, sys);
    const div   = document.createElement('div');
    div.style.cssText = 'flex:1;min-height:0;display:flex;flex-direction:column;';
    div.innerHTML = html;
    return div;
  }

  _replaceHTML(result, content, _options) {
    content.replaceChildren(result);
  }

  // Called by Foundry after every render (initial open AND re-renders).
  _onRender(context, options) {
    super._onRender?.(context, options);
    if (this._selfUpdateHookId) Hooks.off('updateActor', this._selfUpdateHookId);
    this._selfUpdateHookId = Hooks.on('updateActor', (updated) => {
      if (updated.id === this.actor.id) this.render();
    });
  }

  _onClose(options) {
    super._onClose?.(options);
    if (this._selfUpdateHookId) {
      Hooks.off('updateActor', this._selfUpdateHookId);
      this._selfUpdateHookId = null;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Sheet builder                                                       */
  /* ------------------------------------------------------------------ */

  _buildSheet(actor, sys) {
    return `
      <div class="sr3e-inner">
        ${this._header(actor, sys)}
        ${this._tabs()}
        <div class="sheet-body">
          ${this._tabStats(sys)}
          ${this._tabWeapons(actor)}
          ${this._tabMods(actor)}
          ${this._tabEW(actor, sys)}
          ${this._tabNotes(sys)}
        </div>
      </div>`;
  }

  _header(actor, sys) {
    const attr        = sys.attributes ?? {};
    const dmgMax      = 10;
    const dmgVal      = sys.damage?.value ?? 0;
    const isTemplate  = actor.getFlag('The2ndChumming3e', 'isTemplate');
    const appearsInUI = game.sr3e.isLiveActor(actor);

    const VEHICLE_TYPES = [
      ['car', 'Car'], ['bike', 'Motorcycle'], ['truck', 'Truck'], ['van', 'Van'],
      ['drone', 'Drone'], ['boat', 'Boat'], ['hovercraft', 'Hovercraft'],
      ['aircraft', 'Aircraft'], ['other', 'Other'],
    ];
    const typeOpts = VEHICLE_TYPES.map(([v, l]) =>
      `<option value="${v}" ${sys.vehicleType === v ? 'selected' : ''}>${l}</option>`
    ).join('');

    const _driverActorId = sys.driverActorId?.trim() ?? '';
    const _pilotActor = _driverActorId ? game.actors.get(_driverActorId) : null;
    const _pilotName = _pilotActor?.name ?? '';
    const pilotOpts = [
      `<option value="">No pilot</option>`,
      ...game.actors
        .filter(a => (a.type === 'character' || a.type === 'npc') && game.sr3e.isLiveActor(a))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(a => `<option value="${a.id}"${_driverActorId === a.id ? ' selected' : ''}>${a.name}</option>`),
    ].join('');

    const boxes = Array.from({ length: dmgMax }, (_, i) => {
      const n   = i + 1;
      const cls = n <= dmgVal ? 'wound-box filled' : 'wound-box';
      return `<div class="${cls}" data-action="damageBox" data-box="${n}"></div>`;
    }).join('');

    const statusBadge = dmgVal >= dmgMax
      ? `<span class="veh-status-badge veh-status-destroyed">⚠ DESTROYED</span>`
      : '';

    return `
      <header class="sheet-header">
        <div class="portrait-wrap">
          <img class="profile-img" src="${actor.img}" title="${actor.name}" data-edit="img"/>
        </div>
        <div class="header-fields">
          <div class="header-top">
            <input class="actor-name" type="text" name="name" value="${actor.name}" style="flex:1"/>
            ${isTemplate === true
              ? `<span class="sr3e-template-badge">TEMPLATE</span>
                 <button type="button" class="sr3e-template-btn" data-action="deployTemplate" title="Create a working copy with the template flag removed">Deploy Copy</button>
                 <button type="button" class="sr3e-template-btn sr3e-template-btn-remove" data-action="toggleTemplate" title="Remove template flag — vehicle will appear in linking dialogs">Remove Flag</button>`
              : !appearsInUI
                ? `<button type="button" class="sr3e-template-btn sr3e-live-btn" data-action="markAsLive" title="Mark as live vehicle — will appear in linking dialogs">Mark as Live</button>`
                : `<button type="button" class="sr3e-template-btn sr3e-template-mark" data-action="toggleTemplate" title="Mark as template — hides from pilot linking dialogs">Mark as Template</button>`
            }
            <label class="inline-field" style="margin-left:10px;">Type
              <select name="system.vehicleType" style="background:var(--sr-surface);color:var(--sr-text);border:1px solid var(--sr-border);border-radius:var(--r);padding:2px 6px;">
                ${typeOpts}
              </select>
            </label>
          </div>
          <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--sr-muted);margin-top:4px;">
            <span>Pilot:</span>
            <select name="system.driverActorId"
              style="flex:1;background:var(--sr-card);border:1px solid var(--sr-border);border-radius:var(--r);color:var(--sr-text);padding:2px 6px;font-size:12px;">
              ${pilotOpts}
            </select>
            ${_pilotActor
              ? `<a data-action="openPilot" title="Open ${_pilotName}'s sheet"
                    style="color:var(--sr-accent);cursor:pointer;font-size:13px;line-height:1;">
                   <i class="fa fa-external-link"></i>
                 </a>`
              : ''}
          </div>
          <div style="display:flex;align-items:center;gap:6px;font-size:12px;margin-top:4px;">
            <span style="color:var(--sr-muted);">Mode:</span>
            ${(() => {
              const hasPilot = sys.driverActorId?.trim();
              const isVcr  = hasPilot && sys.controlMode === 'vcr';
              const isRcd  = hasPilot && sys.controlMode === 'rcd';
              const isAuto = !hasPilot || (!isVcr && !isRcd);
              const btn = (action, label, active, color) =>
                `<button type="button" data-action="${action}"
                   style="padding:2px 10px;font-size:11px;font-weight:bold;border-radius:var(--r);cursor:pointer;
                          border:1px solid ${active ? color : 'var(--sr-border)'};
                          background:${active ? `color-mix(in srgb,${color} 15%,transparent)` : 'transparent'};
                          color:${active ? color : 'var(--sr-muted)'};">${label}</button>`;
              return btn('setVcrMode', 'VCR',  isVcr,  'var(--sr-accent)')
                   + btn('setRcdMode', 'RCD',  isRcd,  'var(--sr-green)')
                   + btn('setAutoMode','Auto', isAuto, 'var(--sr-gold)');
            })()}
          </div>
          <div class="wound-tracks">
            <div class="wound-track-container">
              <div class="wound-track">
                <span class="wound-track-label">Damage</span>
                <div class="wound-boxes">${boxes}</div>
                ${statusBadge}
              </div>
              <div class="damage-buttons">
                <button type="button" class="damage-btn" data-action="applyDamage" data-amount="1"  title="Light (L)">L</button>
                <button type="button" class="damage-btn" data-action="applyDamage" data-amount="3"  title="Moderate (M)">M</button>
                <button type="button" class="damage-btn" data-action="applyDamage" data-amount="6"  title="Serious (S)">S</button>
                <button type="button" class="damage-btn" data-action="applyDamage" data-amount="10" title="Deadly (D)">D</button>
                <button type="button" class="damage-btn damage-btn-heal" data-action="healDamage"   title="Repair 1 box">−</button>
              </div>
            </div>
          </div>
        </div>
      </header>`;
  }

  _tabs() {
    const tabs = [['stats', 'Stats'], ['weapons', 'Weapons'], ['mods', 'Mods'], ['ew', 'Electronic Warfare'], ['notes', 'Notes']];
    return `<nav class="sheet-tabs">
      ${tabs.map(([id, label]) =>
        `<a class="tab-btn ${this._activeTab === id ? 'active' : ''}"
            data-action="switchTab" data-tab="${id}">${label}</a>`
      ).join('')}
    </nav>`;
  }

  /* ------------------------------------------------------------------ */
  /*  Tab: Stats                                                          */
  /* ------------------------------------------------------------------ */

  _tabStats(sys) {
    const attr = sys.attributes ?? {};

    const _stat = (key, label) => {
      const a = attr[key] ?? {};
      return `
        <div class="attr-block">
          <span class="attr-label">${label}</span>
          <div class="attr-row">
            <input class="attr-input" type="number" name="system.attributes.${key}.base" value="${a.base ?? 0}"/>
          </div>
        </div>`;
    };

    return `<div class="tab ${this._activeTab === 'stats' ? 'active' : ''}" data-tab="stats" style="overflow-y:auto">
      <div class="attributes-grid veh-stat-grid">
        ${_stat('handling', 'Handling')}
        ${_stat('speed',    'Speed')}
        ${_stat('accel',    'Accel')}
        ${_stat('body',     'Body')}
        ${_stat('armor',    'Armor')}
        ${_stat('sig',      'Sig')}
        ${_stat('autonav',  'Autonav')}
        ${_stat('pilot',    'Pilot')}
        ${_stat('sensor',   'Sensor')}
        ${_stat('cargo',    'Cargo')}
        ${_stat('load',     'Load')}
        <div class="attr-block">
          <span class="attr-label">Seating</span>
          <div class="attr-row">
            <input class="attr-input" type="number" name="system.seating" value="${sys.seating ?? 4}"/>
          </div>
        </div>
      </div>
      <div class="veh-info-grid">
        <label class="veh-info-field veh-info-full">Entry Points
          <input type="text" name="system.entryPoints" value="${sys.entryPoints ?? ''}"/>
        </label>
        <label class="veh-info-field">Cost (¥)
          <input type="number" name="system.cost" value="${sys.cost ?? 0}"/>
        </label>
        <label class="veh-info-field">Street Index
          <input type="number" name="system.streetIndex" value="${sys.streetIndex ?? 0}"/>
        </label>
        <label class="veh-info-field">Availability
          <input type="text" name="system.availability" value="${sys.availability ?? ''}"/>
        </label>
      </div>
      <div style="margin-top:8px;padding:4px 0;border-top:1px solid var(--sr-border);display:flex;gap:8px;flex-wrap:wrap;">
        <button type="button" class="btn-sm" data-action="rollContested"
                style="background:var(--sr-surface);color:var(--sr-text);border:1px solid var(--sr-border)">
          ⚔ Contested Roll
        </button>
        ${sys.driverActorId?.trim()
          ? `<button type="button" class="btn-sm" data-action="drivingTest"
                     style="background:var(--sr-surface);color:var(--sr-text);border:1px solid var(--sr-border)">
               🚗 Driving Test
             </button>`
          : `<button type="button" class="btn-sm" disabled
                     style="background:var(--sr-surface);color:var(--sr-muted);border:1px solid var(--sr-border);opacity:0.5;cursor:not-allowed;">
               No Driver
             </button>`
        }
        <button type="button" class="btn-sm" data-action="droneComprehension"
                style="background:var(--sr-surface);color:var(--sr-text);border:1px solid var(--sr-border)"
                title="Drone Comprehension Test — Pilot vs GM TN (SR3 p.157)">
          📡 Drone Comprehension
        </button>
      </div>
    </div>`;
  }

  /* ------------------------------------------------------------------ */
  /*  Tab: Weapons                                                        */
  /* ------------------------------------------------------------------ */

  _tabWeapons(actor) {
    const firearms      = actor.items.filter(i => i.type === 'firearm');
    const vehWeapons    = actor.items.filter(i => i.type === 'vehicleweapon')
      .sort((a, b) => a.name.localeCompare(b.name));

    const catFirearms   = firearms.filter(w => (w.system.category ?? '') !== '');
    const uncatFirearms = firearms.filter(w => (w.system.category ?? '') === '');

    const fRows = catFirearms.length
      ? catFirearms.map(w => `
          <div class="item-row" data-item-id="${w.id}">
            <span class="item-name">${w.name}</span>
            <span class="item-cell">${w.system.damage || '—'}</span>
            <span class="item-cell">${w.system.mode || '—'}</span>
            <span class="item-cell">${w.system.concealability ?? '—'}</span>
            <span class="item-cell">${w.system.ammunition || '—'}</span>
            ${this._itemControls(w.id, true)}
          </div>`).join('')
      : '<p class="empty-list">No firearms.</p>';

    const vwRows = vehWeapons.length
      ? vehWeapons.map(w => `
          <div class="item-row" data-item-id="${w.id}">
            <span class="item-name">${w.name}</span>
            <span class="item-cell">${w.system.weaponType || '—'}</span>
            <span class="item-cell">${w.system.damage || '—'}</span>
            <span class="item-cell">${w.system.mode || '—'}</span>
            <span class="item-cell">${w.system.ammunition || '—'}</span>
            ${this._itemControls(w.id, true)}
          </div>`).join('')
      : '<p class="empty-list">No vehicle weapons.</p>';

    return `<div class="tab ${this._activeTab === 'weapons' ? 'active' : ''}" data-tab="weapons" style="overflow-y:auto">
      <h3 class="section-hdr">Firearms</h3>
      <div class="list-header"><span>Name</span><span>Damage</span><span>Mode</span><span>Conceal</span><span>Ammo</span><span></span></div>
      ${fRows}
      ${uncatFirearms.length ? `
        <h3 class="section-hdr" style="margin-top:1rem;color:var(--sr-amber)">Uncategorised Firearms</h3>
        <div class="list-header"><span>Name</span><span>Damage</span><span>Mode</span><span>Conceal</span><span>Ammo</span><span></span></div>
        ${uncatFirearms.map(w => `
          <div class="item-row" data-item-id="${w.id}">
            <span class="item-name">${w.name}</span>
            <span class="item-cell">${w.system.damage || '—'}</span>
            <span class="item-cell">${w.system.mode || '—'}</span>
            <span class="item-cell">${w.system.concealability ?? '—'}</span>
            <span class="item-cell">${w.system.ammunition || '—'}</span>
            ${this._itemControls(w.id, true)}
          </div>`).join('')}
      ` : ''}
      <button type="button" class="btn-add" data-action="itemCreate" data-type="firearm">+ Add Firearm</button>

      <h3 class="section-hdr" style="margin-top:1.2rem">Vehicle Weapons</h3>
      <div class="list-header"><span>Name</span><span>Type</span><span>Damage</span><span>Mode</span><span>Ammo</span><span></span></div>
      ${vwRows}
      <button type="button" class="btn-add" data-action="itemCreate" data-type="vehicleweapon">+ Add Vehicle Weapon</button>
    </div>`;
  }

  _itemControls(itemId, hasRoll) {
    return `<div class="item-controls">
      ${hasRoll ? `<i class="fas fa-dice-d6 rollable" data-action="rollWeapon" data-item-id="${itemId}" title="Roll"></i>` : ''}
      <i class="fas fa-edit" data-action="itemEdit" data-item-id="${itemId}" title="Edit"></i>
      <i class="fas fa-trash" data-action="itemDelete" data-item-id="${itemId}" title="Delete"></i>
    </div>`;
  }

  _meleeControls(itemId) {
    return `<div class="item-controls">
      <i class="fas fa-dice-d6 rollable" data-action="rollMelee" data-item-id="${itemId}" title="Melee attack"></i>
      <i class="fas fa-edit" data-action="itemEdit" data-item-id="${itemId}" title="Edit"></i>
      <i class="fas fa-trash" data-action="itemDelete" data-item-id="${itemId}" title="Delete"></i>
    </div>`;
  }

  /* ------------------------------------------------------------------ */
  /*  Tab: Mods                                                           */
  /* ------------------------------------------------------------------ */

  _tabMods(actor) {
    const mods = actor.items.filter(i => i.type === 'vehiclemod')
      .sort((a, b) => a.name.localeCompare(b.name));

    const rows = mods.length ? mods.map(m => `
      <div class="item-row" data-item-id="${m.id}">
        <span class="item-name">${m.name}</span>
        <span class="item-cell">${m.system.cfCost || '—'}</span>
        <span class="item-cell">${m.system.installEquipment || '—'}</span>
        <span class="item-cell" style="color:var(--sr-muted);font-size:11px">${m.system.installTime || '—'}</span>
        <span class="item-cell">${m.system.cost ? m.system.cost.toLocaleString() + '¥' : '—'}</span>
        <span class="item-cell">
          <a class="item-control" data-action="itemEdit" data-item-id="${m.id}" title="Edit">✎</a>
          <a class="item-control" data-action="itemDelete" data-item-id="${m.id}" title="Delete">✕</a>
        </span>
      </div>`).join('') : '<p class="empty-list">No mods installed.</p>';

    return `<div class="tab ${this._activeTab === 'mods' ? 'active' : ''}" data-tab="mods" style="overflow-y:auto">
      <div class="list-header">
        <span>Mod</span><span>CF</span><span>Equipment</span><span>Install Time</span><span>Cost</span><span></span>
      </div>
      ${rows}
      <button type="button" class="btn-add" data-action="itemCreate" data-type="vehiclemod">+ Add Mod</button>
    </div>`;
  }

  /* ------------------------------------------------------------------ */
  /*  Tab: Electronic Warfare                                             */
  /* ------------------------------------------------------------------ */

  // Derived Footprint = round((rigger deck Flux + vehicle Flux + ECM) / 10).
  _ewFootprintDerived(sys) {
    const rigger   = game.actors.get(sys.driverActorId?.trim() ?? '');
    const deckFlux = rigger?.system?.ew?.fluxRating ?? 0;
    const vehFlux  = sys.ew?.fluxRating ?? 0;
    const ecm      = sys.ew?.ecm ?? 0;
    return Math.round((deckFlux + vehFlux + ecm) / 10);
  }

  _signalTier(value) {
    const tiers = game.sr3e.SR3E.electronicWarfare.degradationTiers;
    const t = tiers.find(t => value >= t.min && value <= t.max);
    if (!t) return '<span class="signal-tier">—</span>';
    if (t.mod === null) return `<span class="signal-tier signal-tier-lost">⚠ ${t.label}</span>`;
    return `<span class="signal-tier">+${t.mod} ${t.label}</span>`;
  }

  _signalChannel(channel, label, value, infiltrated) {
    const locked = !infiltrated;
    const boxes = Array.from({ length: 10 }, (_, i) => {
      const n   = i + 1;
      const cls = n <= value ? 'signal-box filled' : 'signal-box';
      const lost = n === 10 ? ' signal-box-lost' : '';
      return `<div class="${cls}${lost}" data-action="signalBox" data-channel="${channel}" data-box="${n}"
                   title="Box ${n}"></div>`;
    }).join('');
    return `
      <div class="signal-track">
        <span class="signal-label">${label}</span>
        <button type="button" class="sig-btn sig-btn-infil${infiltrated ? ' sig-btn-on' : ''}"
                data-action="signalInfil" data-channel="${channel}"
                title="${infiltrated ? 'Infiltrated — click to clear the breach' : 'Not infiltrated — click to breach this channel and enable jamming'}">Infiltrated</button>
        <div class="signal-boxes${locked ? ' signal-faded' : ''}">${boxes}</div>
        ${this._signalTier(value)}
        <span class="signal-quick${locked ? ' signal-faded' : ''}">
          <button type="button" class="sig-btn" data-action="signalDamage" data-channel="${channel}" data-delta="1" title="+1 degradation">+1</button>
          <button type="button" class="sig-btn sig-btn-heal" data-action="signalDamage" data-channel="${channel}" data-delta="-1" title="−1 degradation">−1</button>
        </span>
      </div>`;
  }

  // Active degradation modifiers — a reference panel listing each degraded channel's TN penalty
  // and exactly which tests it hits (the ones with no roll path are GM-applied from here).
  _degradationReadout(sm, rigger) {
    const cfg      = game.sr3e.SR3E.electronicWarfare;
    const isJacked = rigger ? this.actor.system.controlMode === 'vcr' : false;
    const rows = cfg.channels.map(c => {
      const boxes = sm[c.key] ?? 0;
      if (boxes <= 0) return '';
      const tier = cfg.degradationTiers.find(t => boxes >= t.min && boxes <= t.max);
      if (!tier) return '';
      const head = tier.mod === null
        ? `<span style="color:var(--sr-red);font-weight:600">${c.label}: Channel Lost</span> — ${c.fullEffect}`
        : `<span style="color:var(--sr-amber);font-weight:600">${c.label}: +${tier.mod} ${tier.label}</span> — applies to ${c.appliesTo}`;
      const auto = (c.key === 'simsense' && isJacked && tier.mod !== null)
        ? ` <span style="color:var(--sr-green)">(auto-applied: ${rigger.name} is VCR-jacked)</span>`
        : '';
      return `<div class="ew-deg-row">${head}${auto}</div>`;
    }).filter(Boolean).join('');
    if (!rows) return '';
    return `
      <div class="ew-deg-readout">
        <div class="ew-deg-title">Active Degradation Modifiers</div>
        ${rows}
      </div>`;
  }

  _tabEW(actor, sys) {
    const ew     = sys.ew ?? {};
    const sm     = sys.signalMonitor ?? {};
    const inf    = sys.infiltration ?? {};
    const rigger = game.actors.get(sys.driverActorId?.trim() ?? '');
    const rew    = rigger?.system?.ew ?? {};
    const derivedFp = this._ewFootprintDerived(sys);
    const sigBase   = sys.attributes?.sig?.base ?? 0;
    const footprint = ew.footprint ?? 0;

    const _ewStat = (key, label) => `
      <div class="attr-block">
        <span class="attr-label">${label}</span>
        <div class="attr-row">
          <input class="attr-input" type="number" name="system.ew.${key}" value="${ew[key] ?? 0}" min="0"/>
        </div>
      </div>`;

    const channels = game.sr3e.SR3E.electronicWarfare.channels;
    const intruder = inf.intruderActorId ? game.actors.get(inf.intruderActorId) : null;
    const infChannelTag = (k) => inf[k]
      ? `<span class="ew-breach ew-breach-on">breached</span>`
      : `<span class="ew-breach">clear</span>`;

    return `<div class="tab ${this._activeTab === 'ew' ? 'active' : ''}" data-tab="ew" style="overflow-y:auto">

      <h3 class="section-hdr">Electronics</h3>
      <div class="attributes-grid veh-stat-grid">
        ${_ewStat('ecm',        'ECM')}
        ${_ewStat('eccm',       'ECCM')}
        ${_ewStat('fluxRating', 'Flux')}
        ${_ewStat('footprint',  'Footprint')}
      </div>
      <div class="ew-note">
        Derived Footprint <strong>${derivedFp}</strong> = ⌊(deck Flux ${rew.fluxRating ?? 0} + veh Flux ${ew.fluxRating ?? 0} + ECM ${ew.ecm ?? 0}) ÷ 10⌉.
        <button type="button" class="btn-sm" data-action="recalcFootprint" title="Write derived value into the Footprint field">↻ Recalc</button>
        <br>Targeting this vehicle's Sig: TN = ${sigBase} − ${footprint} (Footprint) = <strong>${Math.max(2, sigBase - footprint)}</strong>.
      </div>
      <div class="ew-note ew-note-muted">
        Controlling rigger: ${rigger ? rigger.name : '<em>none linked</em>'}
        ${rigger ? `— Deck ${rew.deckRating ?? 0}, Flux ${rew.fluxRating ?? 0}, Protocol Module ${rew.protocolModule ?? 0}` : ''}
      </div>

      <h3 class="section-hdr" style="margin-top:1rem">Signal Monitor</h3>
      <div class="signal-monitor">
        ${channels.map(c => this._signalChannel(c.key, c.label, sm[c.key] ?? 0, inf[c.key] ?? false)).join('')}
      </div>
      ${this._degradationReadout(sm, rigger)}

      <h3 class="section-hdr" style="margin-top:1rem">Infiltration</h3>
      <div class="ew-infiltration">
        <div class="ew-inf-row">
          <span>Intruder: <strong>${intruder ? intruder.name : '—'}</strong></span>
          <span>Turns left:
            <input class="ew-inline-num" type="number" name="system.infiltration.turnsRemaining" value="${inf.turnsRemaining ?? 0}" min="0"/>
            <button type="button" class="sig-btn" data-action="advanceInfiltration" title="Advance one combat turn (−1)">−1</button>
          </span>
          <span>Intrusion Factor:
            <input class="ew-inline-num" type="number" name="system.infiltration.intrusionFactor" value="${inf.intrusionFactor ?? 0}" min="0"/>
          </span>
        </div>
        <div class="ew-inf-row">
          ${channels.map(c => `<span class="ew-breach-cell">${c.label}: ${infChannelTag(c.key)}</span>`).join('')}
        </div>
        <div class="ew-btn-row">
          <button type="button" class="btn-sm" data-action="infiltrate">📡 Attempt Infiltration</button>
          <button type="button" class="btn-sm" data-action="detectInfiltration">🔍 Detect Infiltration</button>
        </div>
      </div>

      <h3 class="section-hdr" style="margin-top:1rem">Actions</h3>
      <div class="ew-btn-row">
        <button type="button" class="btn-sm ew-attack-btn" data-action="mijiAttack">⚡ MIJI Attack</button>
        <button type="button" class="btn-sm" data-action="reduceFootprint">📉 Reduce Footprint</button>
      </div>
      <div class="ew-btn-row" style="margin-top:4px">
        ${channels.map(c => `<button type="button" class="btn-sm" data-action="eccmRepair" data-channel="${c.key}">🛡 ECCM: ${c.label}</button>`).join('')}
      </div>
    </div>`;
  }

  /* ------------------------------------------------------------------ */
  /*  Tab: Notes                                                          */
  /* ------------------------------------------------------------------ */

  _tabNotes(sys) {
    return `<div class="tab ${this._activeTab === 'notes' ? 'active' : ''}" data-tab="notes">
      <textarea name="system.notes"
        style="width:100%;height:300px;background:var(--sr-surface);color:var(--sr-text);border:1px solid var(--sr-border);border-radius:var(--r);padding:8px;resize:vertical;box-sizing:border-box;"
      >${sys.notes ?? ''}</textarea>
    </div>`;
  }

  /* ------------------------------------------------------------------ */
  /*  Actions                                                             */
  /* ------------------------------------------------------------------ */

  static _onSwitchTab(ev, target) {
    this._activeTab = target.dataset.tab;
    this.render();
  }

  static async _onDamageBox(ev, target) {
    const box    = parseInt(target.dataset.box);
    const cur    = this.actor.system.damage?.value ?? 0;
    const newVal = cur === box ? box - 1 : box;
    await this.actor.update({ 'system.damage.value': newVal });
  }

  static async _onApplyDamage(ev, target) {
    const amount  = parseInt(target.dataset.amount);
    const current = this.actor.system.damage?.value ?? 0;
    const max     = 10;
    await this.actor.update({ 'system.damage.value': Math.min(max, current + amount) });
  }

  static async _onHealDamage(_ev, _target) {
    const current = this.actor.system.damage?.value ?? 0;
    await this.actor.update({ 'system.damage.value': Math.max(0, current - 1) });
  }

  /* ------------------------------------------------------------------ */
  /*  Electronic Warfare actions                                          */
  /* ------------------------------------------------------------------ */

  // Click a Signal-Monitor box: toggle-at-index (same as wound/overwatch tracks).
  // Gated on the channel being infiltrated (boxes are faded/locked otherwise).
  static async _onSignalBox(_ev, target) {
    const ch  = target.dataset.channel;
    if (!(this.actor.system.infiltration?.[ch])) return;   // channel not infiltrated → locked
    const box = parseInt(target.dataset.box);
    const cur = this.actor.system.signalMonitor?.[ch] ?? 0;
    const newVal = cur === box ? box - 1 : box;
    await this.actor.update({ [`system.signalMonitor.${ch}`]: Math.max(0, Math.min(10, newVal)) });
  }

  // Toggle the per-channel infiltration breach (the same flag the infiltration roll sets).
  // Activating a channel unlocks its degradation controls; deactivating keeps the value.
  static async _onSignalInfil(_ev, target) {
    const ch  = target.dataset.channel;
    const cur = this.actor.system.infiltration?.[ch] ?? false;
    await this.actor.update({ [`system.infiltration.${ch}`]: !cur });
  }

  // +1 / −1 a channel's degradation. Only works once the channel is infiltrated.
  static async _onSignalDamage(_ev, target) {
    const ch = target.dataset.channel;
    if (!(this.actor.system.infiltration?.[ch])) return;   // locked until infiltrated
    const delta = parseInt(target.dataset.delta) || 0;
    const cur   = this.actor.system.signalMonitor?.[ch] ?? 0;
    await this.actor.update({ [`system.signalMonitor.${ch}`]: Math.max(0, Math.min(10, cur + delta)) });
  }

  static async _onRecalcFootprint(_ev, _target) {
    const derived = this._ewFootprintDerived(this.actor.system);
    await this.actor.update({ 'system.ew.footprint': derived });
  }

  static async _onAdvanceInfiltration(_ev, _target) {
    const cur = this.actor.system.infiltration?.turnsRemaining ?? 0;
    await this.actor.update({ 'system.infiltration.turnsRemaining': Math.max(0, cur - 1) });
  }

  static async _onMijiAttack(_ev, _target) {
    return game.sr3e.SR3EMIJI?.openAttackDialog(this.actor);
  }

  static async _onInfiltrate(_ev, _target) {
    return game.sr3e.SR3EMIJI?.openInfiltration(this.actor);
  }

  static async _onDetectInfiltration(_ev, _target) {
    return game.sr3e.SR3EMIJI?.detectInfiltration(this.actor);
  }

  static async _onEccmRepair(_ev, target) {
    return game.sr3e.SR3EMIJI?.openECCMRepair(this.actor, target.dataset.channel);
  }

  static async _onReduceFootprint(_ev, _target) {
    return game.sr3e.SR3EMIJI?.reduceFootprint(this.actor);
  }

  static async _onItemCreate(_ev, target) {
    const type = target.dataset.type ?? 'firearm';
    await this.actor.createEmbeddedDocuments('Item', [{ name: `New ${type}`, type }]);
    this.render();
  }

  static async _onItemEdit(_ev, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    item?.sheet.render(true);
  }

  static async _onRollContested(_ev, _target) {
    await game.sr3e.SR3EActor.openContestedDialog(this.actor);
  }

  static async _onOpenPilot(_ev, _target) {
    const id    = this.actor.system.driverActorId?.trim();
    const pilot = id ? game.actors.get(id) : null;
    if (pilot) pilot.sheet.render({ force: true });
    else if (id) ui.notifications.warn('Pilot actor not found.');
  }

  static async _onDrivingTest(_ev, _target) {
    return SR3EVehicleSheet.runDrivingTest(this.actor);
  }

  static async _onDroneComprehension(_ev, _target) {
    return SR3EVehicleSheet.runDroneComprehension(this.actor);
  }

  /**
   * Drone Comprehension Test (SR3 p.157) — a drone understanding a rigger's command.
   * Simple, fully-editable dialog: Pilot Rating dice vs a GM-set TN (default 4), no pool.
   * Modifiers offered: secondary-drone +2, and the vehicle's Command-channel degradation.
   * Not forced into any flow — just an accessible button (sheet + token HUD).
   */
  static async runDroneComprehension(vehicle) {
    if (!vehicle) return;
    const sys     = vehicle.system ?? {};
    const pilot   = sys.attributes?.pilot?.base ?? 0;
    const cmdDeg  = game.sr3e.SR3EActor._signalTierMod(sys.signalMonitor?.command ?? 0);

    let hookId = Hooks.on('renderDialogV2', (_app, html) => {
      const el = html?.querySelector ? html : html?.[0];
      if (!el?.querySelector?.('#dc-tn')) return;
      Hooks.off('renderDialogV2', hookId);
      const out = el.querySelector('#dc-tn-out');
      const recompute = () => {
        const tn  = parseInt(el.querySelector('#dc-tn')?.value) || 4;
        const sec = el.querySelector('#dc-secondary')?.checked ? 2 : 0;
        const deg = parseInt(el.querySelector('#dc-deg')?.value) || 0;
        if (out) out.textContent = Math.max(2, tn + sec + deg);
      };
      el.querySelectorAll('#dc-tn, #dc-secondary, #dc-deg').forEach(n => {
        n.addEventListener('input', recompute);
        n.addEventListener('change', recompute);
      });
      recompute();
    });

    let result = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: `Drone Comprehension — ${vehicle.name}` },
      content: `
        <div style="display:flex;flex-direction:column;gap:8px;padding:4px 0;font-size:12px">
          <div style="color:var(--sr-muted);font-size:11px">Roll the drone's Pilot Rating vs a GM-set TN (Difficulty table, p.92): simple order ≈ 4, complex ≈ 8+. 0 = no comprehension · 1 = literal · 2+ = intelligent leeway. (Applies to RC-bridged drones on Auto.)</div>
          <label>Pilot dice
            <input type="number" id="dc-pool" value="${pilot}" min="1" max="30" style="width:60px;margin-left:6px"/>
          </label>
          <label>Base TN (command complexity)
            <input type="number" id="dc-tn" value="4" min="2" max="30" style="width:60px;margin-left:6px"/>
          </label>
          <label><input type="checkbox" id="dc-secondary"/> Issuing to a secondary drone while jumped into a primary (+2 TN)</label>
          <label>Command-channel degradation (+TN)
            <input type="number" id="dc-deg" value="${cmdDeg}" min="0" max="9" style="width:60px;margin-left:6px"/>
          </label>
          <div style="margin-top:2px">Final TN: <strong id="dc-tn-out">${Math.max(2, 4 + cmdDeg)}</strong></div>
        </div>`,
      buttons: [
        { label: 'Roll', action: 'roll', default: true, callback: (_e, _b, d) => {
            const el  = d.element;
            const pool = Math.max(1, parseInt(el.querySelector('#dc-pool')?.value) || pilot || 1);
            const tn   = parseInt(el.querySelector('#dc-tn')?.value) || 4;
            const sec  = el.querySelector('#dc-secondary')?.checked ? 2 : 0;
            const deg  = parseInt(el.querySelector('#dc-deg')?.value) || 0;
            result = { pool, tn: Math.max(2, tn + sec + deg) };
          } },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    if (hookId) Hooks.off('renderDialogV2', hookId);
    if (!result) return;

    return vehicle.rollPool(result.pool, result.tn, `📡 Drone Comprehension — ${vehicle.name}`, {
      footerNote: '0 successes = no comprehension · 1 = executes literally · 2+ = interprets intelligently',
    });
  }

  /**
   * Prompt for a vehicle (and driver) then run the driving test. Entry point for the
   * Rollable Tables sidebar tool, where there is no vehicle sheet context.
   */
  static async promptVehicleDrivingTest() {
    const vehicles = game.actors
      .filter(a => a.type === 'vehicle' && a.getFlag('The2ndChumming3e', 'isTemplate') !== true)
      .sort((a, b) => a.name.localeCompare(b.name));
    if (!vehicles.length) {
      ui.notifications.warn('No vehicles available.');
      return;
    }
    const drivers = game.actors
      .filter(a => (a.type === 'character' || a.type === 'npc') && a.getFlag('The2ndChumming3e', 'isTemplate') !== true)
      .sort((a, b) => a.name.localeCompare(b.name));

    const vehOpts = vehicles.map(v => `<option value="${v.id}">${v.name}</option>`).join('');
    const drvOpts = ['<option value="">— Use vehicle\'s linked driver —</option>',
      ...drivers.map(d => `<option value="${d.id}">${d.name}</option>`)].join('');

    let result = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: 'Driving Test — Select Vehicle' },
      content: `
        <div style="display:flex;flex-direction:column;gap:8px;padding:4px 0">
          <label style="display:flex;flex-direction:column;gap:3px;font-size:12px;color:var(--sr-muted)">Vehicle
            <select id="dt-vehicle" style="width:100%">${vehOpts}</select>
          </label>
          <label style="display:flex;flex-direction:column;gap:3px;font-size:12px;color:var(--sr-muted)">Driver
            <select id="dt-driver" style="width:100%">${drvOpts}</select>
          </label>
        </div>`,
      buttons: [
        {
          label: 'Continue',
          action: 'go',
          default: true,
          callback: (_e, _b, dialog) => {
            const el = dialog.element;
            result = {
              vehicleId: el.querySelector('#dt-vehicle')?.value ?? '',
              driverId:  el.querySelector('#dt-driver')?.value ?? '',
            };
          },
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });

    if (!result?.vehicleId) return;
    const vehicle = game.actors.get(result.vehicleId);
    if (!vehicle) return;
    const driverOverride = result.driverId ? game.actors.get(result.driverId) : null;
    return SR3EVehicleSheet.runDrivingTest(vehicle, driverOverride);
  }

  /**
   * Run the driving-test dialog + roll for a vehicle. Driver is the override if given,
   * otherwise the vehicle's linked driverActorId.
   */
  static async runDrivingTest(actor, driverOverride = null) {
    const sys        = actor.system;
    const driver = driverOverride ?? game.actors.get(sys.driverActorId?.trim() ?? '');
    if (!driver) {
      ui.notifications.warn('No driver set for this vehicle — select one.');
      return;
    }

    // Map vehicle type → skill name keywords
    const TYPE_KEYWORDS = {
      car:        ['car', 'automobile'],
      van:        ['car', 'automobile', 'van'],
      bike:       ['motorcycle', 'bike', 'cycle'],
      truck:      ['truck'],
      drone:      ['rpv', 'remotely piloted', 'drone'],
      boat:       ['boat', 'watercraft'],
      hovercraft: ['hovercraft'],
      aircraft:   ['aircraft', 'rotorcraft', 'fixed-wing', 'vectored'],
      other:      [],
    };

    const vType    = sys.vehicleType ?? 'car';
    const keywords = TYPE_KEYWORDS[vType] ?? [];
    const skills   = driver.items.filter(i => i.type === 'skill');

    let matchedSkill     = null;
    let useSpecialisation = false;

    for (const skill of skills) {
      const sName = (skill.system.skillName || skill.name || '').toLowerCase();
      if (keywords.some(kw => sName.includes(kw))) {
        matchedSkill = skill;
        const spec = (skill.system.specialisation || '').toLowerCase();
        if (spec && actor.name.toLowerCase().includes(spec)) useSpecialisation = true;
        break;
      }
    }

    let skillDice, skillRating, poolLabel;
    const isDefaulting = !matchedSkill;
    let defTnMod = 0;
    if (matchedSkill) {
      const rating    = matchedSkill.system.rating ?? 1;
      const specBonus = useSpecialisation ? 2 : 0;
      skillDice   = rating + specBonus;
      skillRating = rating;   // plain Vehicle Skill rating → rigger Control Pool
      const specNote = useSpecialisation ? ` + spec (${matchedSkill.system.specialisation})` : '';
      poolLabel = `${matchedSkill.system.skillName || matchedSkill.name} ${rating}${specNote}`;
    } else {
      // SR3 Default Table — let the user choose specialization / skill / attribute.
      const def = await game.sr3e.SR3EItem.promptDefaultChoice(driver, {
        linkedAttr: 'reaction',
        title:      `Defaulting — ${driver.name}`,
        message:    `${driver.name} has no vehicle skill for this test — choose how to default:`,
      });
      if (!def) return;   // cancelled
      skillDice   = def.pool;
      // skillRating feeds the jacked-in rigger's Control Pool. Defaulting caps pool
      // dice at half the rating defaulted from, and forbids them outright when
      // defaulting to an Attribute (SR3 p.85), so the cap is the ceiling here — not
      // the dice being rolled.
      skillRating = def.poolCap;
      defTnMod    = def.tnMod;
      poolLabel   = `${def.label}`;
    }

    // Vehicle stats
    const autonav  = sys.attributes?.autonav?.base ?? 0;
    const handling = (sys.attributes?.handling?.base ?? 4) + defTnMod;   // defaulting TN modifier baked in
    const basePool = skillDice + autonav;

    // Check for VCR cyberware
    const vcrItem   = driver.items.find(i =>
      i.type === 'cyberware' &&
      (i.name.toLowerCase().includes('vcr') || i.name.toLowerCase().includes('vehicle control rig'))
    );
    const vcrRating = vcrItem ? (vcrItem.system.rating ?? 1) : 0;

    // Inline styles — DialogV2 does not reliably apply an injected <style> block.
    const FIELD_S = 'display:flex;flex-direction:column;gap:3px;color:#7880a0;font-size:12px;';
    const FULL_S  = FIELD_S + 'grid-column:1/-1;';
    const INPUT_S = 'background:#1c2030;color:#dde1f0;border:1px solid #3a9fd6;border-radius:3px;padding:2px 5px;width:100%;box-sizing:border-box;';
    const infoRow = (l, v) => `<div style="display:flex;justify-content:space-between;margin:2px 0;color:#7880a0;"><span>${l}</span><span style="color:#dde1f0;font-weight:bold;">${v}</span></div>`;

    const datajackRow = !vcrRating ? `
      <label style="${FIELD_S}">Non-Rigger w/ Datajack
        <select id="drv-datajack" style="${INPUT_S}">
          <option value="0">No (0)</option>
          <option value="-1">Yes (−1 TN)</option>
        </select>
      </label>` : '';

    const riggerRow = vcrRating ? `
      <label style="${FULL_S}">Rigger — VCR Rating ${vcrRating}
        <select id="drv-rigger" style="${INPUT_S}">
          <option value="0">Not using VCR (0)</option>
          <option value="${-vcrRating * 2}">Using VCR (−${vcrRating * 2} TN)</option>
        </select>
      </label>` : '';

    let result = null;

    await foundry.applications.api.DialogV2.wait({
      window: { title: `Driving Test — ${actor.name}` },
      position: { width: 460 },
      content: `
        <div style="background:#1c2030;border-radius:4px;padding:8px;margin-bottom:10px;font-size:12px;">
          ${infoRow('Driver', driver.name)}
          ${infoRow('Skill', poolLabel)}
          ${infoRow('Autonav', `${autonav} (added out of combat)`)}
          ${infoRow('Handling (base TN)', handling)}
          ${vcrRating ? infoRow('VCR', `Rating ${vcrRating} — Control Pool = Vehicle Skill when rigging`) : ''}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 12px;">
          <label style="${FIELD_S}">Unfamiliar Vehicle
            <select id="drv-unfamiliar" style="${INPUT_S}">
              <option value="0">No (0)</option>
              <option value="1">Yes (+1 TN)</option>
            </select>
          </label>
          <label style="${FIELD_S}">Stress Level
            <select id="drv-stress" style="${INPUT_S}">
              <option value="-1">Relaxed (−1 TN)</option>
              <option value="0" selected>Normal (0)</option>
              <option value="1">Stressed (+1 TN)</option>
              <option value="2">Tense (+2 TN)</option>
              <option value="3">High (+3 TN)</option>
              <option value="4">Very High (+4 TN)</option>
              <option value="5">Extreme (+5 TN)</option>
            </select>
          </label>
          <label style="${FIELD_S}">Vehicle Size
            <select id="drv-size" style="${INPUT_S}">
              <option value="0">Normal (0)</option>
              <option value="2">Large (+2 TN)</option>
              <option value="3">Very Large (+3 TN)</option>
            </select>
          </label>
          <label style="${FIELD_S}">Weather
            <select id="drv-weather" style="${INPUT_S}">
              <option value="0">Normal (0)</option>
              <option value="2">Bad (+2 TN)</option>
              <option value="4">Terrible (+4 TN)</option>
            </select>
          </label>
          <label style="${FIELD_S}">Terrain
            <select id="drv-terrain" style="${INPUT_S}">
              <option value="-1">Open (−1 TN)</option>
              <option value="0" selected>Normal (0)</option>
              <option value="1">Restricted (+1 TN)</option>
              <option value="3">Tight (+3 TN)</option>
            </select>
          </label>
          <label style="${FIELD_S}">Action During Combat
            <select id="drv-combat" style="${INPUT_S}">
              <option value="0">No (0)</option>
              <option value="2">Yes (+2 TN)</option>
            </select>
          </label>
          ${datajackRow}
          ${riggerRow}
          <label style="${FIELD_S}">Base TN
            <input id="drv-tn" type="number" value="${handling}" min="2" max="30" style="${INPUT_S}"/>
          </label>
          <label style="${FULL_S}">Total Pool Dice
            <input id="drv-pool" type="number" value="${basePool}" min="1" max="30" style="${INPUT_S}"/>
          </label>
        </div>
        <div style="margin-top:10px;padding:6px 10px;background:#1c2030;border-radius:4px;display:flex;gap:20px;font-size:12px;color:#7880a0;">
          <span>Final TN: <strong style="color:#dde1f0;" id="drv-tn-out">${handling}</strong></span>
          <span>Pool: <strong style="color:#dde1f0;" id="drv-pool-out">${basePool}</strong></span>
        </div>
      `,
      render: (_ev, dialog) => {
        const el      = dialog.element;
        const poolInp = el.querySelector('#drv-pool');

        const update = () => {
          const baseTN     = parseInt(el.querySelector('#drv-tn')?.value   ?? handling);
          const basePoolEl = parseInt(el.querySelector('#drv-pool')?.value ?? basePool);
          const selIds     = ['#drv-unfamiliar','#drv-stress','#drv-size',
                              '#drv-weather','#drv-terrain','#drv-combat',
                              '#drv-datajack','#drv-rigger'];
          const mods = selIds.reduce((sum, id) => {
            const node = el.querySelector(id);
            return sum + (node ? parseInt(node.value ?? 0) : 0);
          }, 0);
          const tnOut   = el.querySelector('#drv-tn-out');
          const poolOut = el.querySelector('#drv-pool-out');
          if (tnOut)   tnOut.textContent   = Math.max(2, baseTN + mods);
          if (poolOut) poolOut.textContent = basePoolEl;
        };

        // SR3 pool: Vehicle Skill + (rigger using VCR → Control Pool = Vehicle Skill;
        // else out of combat → Autonav; else nothing). Recomputed when combat/VCR changes.
        const riggerEl = el.querySelector('#drv-rigger');
        const combatEl = el.querySelector('#drv-combat');
        const recomputePool = () => {
          const usingVCR = riggerEl ? (parseInt(riggerEl.value) || 0) !== 0 : false;
          const combatOn = (parseInt(combatEl?.value) || 0) > 0;
          const bonus    = usingVCR ? skillRating : (combatOn ? 0 : autonav);
          if (poolInp) poolInp.value = Math.max(1, skillDice + bonus);
          update();
        };
        riggerEl?.addEventListener('change', recomputePool);
        combatEl?.addEventListener('change', recomputePool);

        el.querySelectorAll('select, input').forEach(n => {
          n.addEventListener('change', update);
          n.addEventListener('input',  update);
        });
      },
      buttons: [
        {
          label: 'Roll',
          action: 'roll',
          default: true,
          callback: (_e, _b, dialog) => {
            const el     = dialog.element;
            const getInt = id => parseInt(el.querySelector(id)?.value ?? 0);
            const baseTN   = getInt('#drv-tn');
            const totalPool = getInt('#drv-pool');
            const selIds   = ['#drv-unfamiliar','#drv-stress','#drv-size',
                              '#drv-weather','#drv-terrain','#drv-combat',
                              '#drv-datajack','#drv-rigger'];
            const mods = selIds.reduce((sum, id) => {
              const node = el.querySelector(id);
              return sum + (node ? parseInt(node.value ?? 0) : 0);
            }, 0);
            result = { pool: totalPool, tn: Math.max(2, baseTN + mods) };
          },
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });

    if (!result) return;
    await driver.rollPool(result.pool, result.tn, `Driving Test — ${actor.name}`);
  }

  static async _onItemDelete(_ev, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: `Delete ${item.name}?` },
      content: `<p>Delete <strong>${item.name}</strong>? This cannot be undone.</p>`,
    });
    if (confirmed) await item.delete();
  }

  static async _onRollWeapon(ev, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    await item.rollWeapon({ physicalDice: ev.shiftKey ?? false });
  }

  static async _onRollMelee(ev, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    await item.rollMelee({ physicalDice: ev.shiftKey ?? false });
  }

  static async _onSetVcrMode(_ev, _target) {
    await this.actor.update({ 'system.controlMode': 'vcr' });
  }

  static async _onSetRcdMode(_ev, _target) {
    await this.actor.update({ 'system.controlMode': 'rcd' });
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

  static async _onSetAutoMode(_ev, _target) {
    await this.actor.update({ 'system.controlMode': '', 'system.driverActorId': '' });
  }
}
