const SEC_TIERS = ['Ivory','Blue','Green','Orange','Red','Black','Ultraviolet'];

const TIER_DATA = {
  Ivory:       { color: '#e8e4d4', threshold: 0 },
  Blue:        { color: '#3377cc', threshold: 1 },
  Green:       { color: '#00aa44', threshold: 2 },
  Orange:      { color: '#dd6600', threshold: 3 },
  Red:         { color: '#cc2222', threshold: 4 },
  Black:       { color: '#222222', threshold: 5 },
  Ultraviolet: { color: '#8800dd', threshold: 6 },
};

const OW_COLORS = [
  '#44aa44', // 1 — green
  '#66aa33', // 2
  '#88aa22', // 3
  '#aaaa11', // 4 — yellow
  '#cc9900', // 5 — amber
  '#dd7700', // 6
  '#ee5500', // 7 — orange
  '#ee3300', // 8
  '#dd1100', // 9 — red
  '#c8a040', // 10 — gold / convergence
];
const IC_TYPES  = ['Scramble','Trace','Blaster','Barrier','Tar Baby','Killer',
                   'Probe','Crippler','Black','Gray','White','Ripper','Sparky','Marker'];
const NODE_SHAPES = ['rectangle','hexagon','square','circle','doubleHexagon','triangle'];
const ACCESS_LEVELS = ['public','private','restricted','varies'];

const NODE_TYPES = [
  { abbreviation:'SAN', name:'System Access Node',    iconShape:'rectangle',    defaultAccess:'public',    barrierProtected:false,
    description:'Gateway to the host system. Public-facing entry point for users jumping from a grid. Most often used to offer goods and services.' },
  { abbreviation:'SPU', name:'Sub-Processing Unit',   iconShape:'hexagon',      defaultAccess:'private',   barrierProtected:false,
    description:'Scheduling and task management. Routes data packets. Indexes users, projects, calendars, and system maps.' },
  { abbreviation:'DS',  name:'Data Store',             iconShape:'square',       defaultAccess:'private',   barrierProtected:false,
    description:'Digital repository for datafiles and records. Prime target for deckers seeking paydata.' },
  { abbreviation:'SN',  name:'Slave Node',             iconShape:'circle',       defaultAccess:'private',   barrierProtected:false,
    description:'Manages control of real-world devices. Handles PAN, drones, cameras, maglocks, and subscribed vehicles.' },
  { abbreviation:'CPU', name:'Central Processing Unit',iconShape:'doubleHexagon',defaultAccess:'private',   barrierProtected:true,
    description:'Core of the host. Manages Security Sheaf, passcodes, pathways, and system configuration. Protected by a barrier.' },
  { abbreviation:'I/O', name:'I/O Port',               iconShape:'triangle',     defaultAccess:'public',    barrierProtected:false,
    description:'Input/Output jackpoint linking a real-world physical location directly to a specific node. Can be set to Private (acting as a datalock).' },
];

/* Default prompts keyed by node type abbreviation — used by _defaultTopology and seedPrompts */
const _ACCESS_PROMPT = { name:'Access Node', action:'Hacking', test:'Hacking vs Sys/Sec', requiresMark:false, overwatchOnFail:true, grantsAccess:true, description:'Gain a mark on this node by overcoming its Security Threshold.' };

const DEFAULT_NODE_PROMPTS = {
  'SAN': [
    { name:'Comment / Review',  action:'Complex', test:'Computer vs System', requiresMark:false, overwatchOnFail:false, grantsAccess:false, description:'Leave a comment or feedback regarding the host or its services.' },
    { name:'Host Services',     action:'Complex', test:'Computer vs System', requiresMark:false, overwatchOnFail:false, grantsAccess:false, description:'Access public information, shop goods/services, contact customer service.' },
  ],
  'SPU': [
    { ..._ACCESS_PROMPT },
    { name:'Index Users and Scheduling', action:'Complex', test:'Computer vs System', requiresMark:true, overwatchOnFail:false, grantsAccess:false, description:'Index of all users, logon status, projects, calendars, and tasks.' },
    { name:'System Map',                 action:'Complex', test:'Computer vs System', requiresMark:true, overwatchOnFail:false, grantsAccess:false, description:'ARO map of the host. Highlights visible and hidden targets.' },
  ],
  'DS': [
    { ..._ACCESS_PROMPT },
    { name:'Access Datafile',        action:'Complex', test:'Computer vs System',              requiresMark:true, overwatchOnFail:false, grantsAccess:false, description:'Read an unprotected datafile.' },
    { name:'Duplicate / Download',   action:'Complex', test:'Passcodes or Hacking vs Sys/Sec', requiresMark:true, overwatchOnFail:true,  grantsAccess:false, description:'Copy a datafile to device Memory.' },
    { name:'Edit / Upload Datafile', action:'Complex', test:'Passcodes or Hacking vs Sys/Sec', requiresMark:true, overwatchOnFail:true,  grantsAccess:false, description:'Alter contents or upload a new datafile.' },
    { name:'Index Data Store',       action:'Complex', test:'Computer vs System',              requiresMark:true, overwatchOnFail:false, grantsAccess:false, description:'List all datafiles. Reveals hidden files and protection status.' },
    { name:'Siphon Paydata',         action:'Complex', test:'Hacking vs Sys/Sec',              requiresMark:true, overwatchOnFail:true,  grantsAccess:false, description:'Steal paydata from a data store.' },
  ],
  'SN': [
    { ..._ACCESS_PROMPT },
    { name:'Control Device',   action:'Complex', test:'Computer or applicable Skill vs System', requiresMark:true, overwatchOnFail:false, grantsAccess:false, description:'Operate a subscribed device (drone, maglock, camera).' },
    { name:'Index Devices',    action:'Complex', test:'Computer vs System',                    requiresMark:true, overwatchOnFail:false, grantsAccess:false, description:'List all devices connected to this slave node.' },
    { name:'Spoof Datastream', action:'Complex', test:'Hacking vs Sys/Sec',                    requiresMark:true, overwatchOnFail:true,  grantsAccess:false, description:'Feed false data to a device\'s datastream.' },
    { name:'Tap Datastream',   action:'Complex', test:'Hacking vs Sys/Sec',                    requiresMark:true, overwatchOnFail:true,  grantsAccess:false, description:'Access a device\'s live datastream.' },
  ],
  'CPU': [
    { ..._ACCESS_PROMPT },
    { name:'Configure I/O Ports',      action:'Complex', test:'Passcodes or Hacking vs Sys/Sec', requiresMark:true, overwatchOnFail:true, grantsAccess:false, description:'Alter pathways, authorize I/O Port connections.' },
    { name:'Configure Passcodes',      action:'Complex', test:'Passcodes or Hacking vs Sys/Sec', requiresMark:true, overwatchOnFail:true, grantsAccess:false, description:'Create or modify passcodes for any node.' },
    { name:'Configure Security Sheaf', action:'Complex', test:'Passcodes or Hacking vs Sys/Sec', requiresMark:true, overwatchOnFail:true, grantsAccess:false, description:'Activate/deactivate Alerts, reassign IC to Trigger Steps.' },
    { name:'Reboot Node',              action:'Complex', test:'Passcodes or Hacking vs Sys/Sec', requiresMark:true, overwatchOnFail:true, grantsAccess:false, description:'Power down a node. Dumps users inside.' },
  ],
  'I/O': [
    { ..._ACCESS_PROMPT },
  ],
};

/* Default topology seeded when a new host is initialised */
function _defaultTopology(systemRating) {
  const sanId = foundry.utils.randomID();
  const spuId = foundry.utils.randomID();
  const dsId  = foundry.utils.randomID();
  const snId  = foundry.utils.randomID();
  const cpuId = foundry.utils.randomID();

  const defaultPrompts = {
    [sanId]: DEFAULT_NODE_PROMPTS['SAN'].map(p => ({...p})),
    [spuId]: DEFAULT_NODE_PROMPTS['SPU'].map(p => ({...p})),
    [dsId]:  DEFAULT_NODE_PROMPTS['DS'].map(p => ({...p})),
    [snId]:  DEFAULT_NODE_PROMPTS['SN'].map(p => ({...p})),
    [cpuId]: DEFAULT_NODE_PROMPTS['CPU'].map(p => ({...p})),
  };

  function _nodeFromType(abbr, id, prompts, x, y, overrides = {}) {
    const t = NODE_TYPES.find(n => n.abbreviation === abbr);
    return {
      id, name: t.name, type: t.abbreviation, abbreviation: t.abbreviation,
      iconShape: t.iconShape, accessLevel: t.defaultAccess,
      description: t.description, barrierProtected: t.barrierProtected,
      barrierRating: 0, markedBy: [], prompts, x, y,
      ...overrides,
    };
  }

  const ioId = foundry.utils.randomID();

  // Positions mirror the typical host system map (SAN top-centre, I/O upper-right,
  // SPU centre, SN left, DS right, CPU bottom-centre).
  const nodes = [
    _nodeFromType('SAN', sanId,  defaultPrompts[sanId],  295, 15),
    _nodeFromType('I/O', ioId,   DEFAULT_NODE_PROMPTS['I/O'].map(p => ({...p})), 490, 35),
    _nodeFromType('SPU', spuId,  defaultPrompts[spuId],  300, 155),
    _nodeFromType('SN',  snId,   defaultPrompts[snId],    85, 240),
    _nodeFromType('DS',  dsId,   defaultPrompts[dsId],   490, 215),
    _nodeFromType('CPU', cpuId,  defaultPrompts[cpuId],  289, 335, { barrierRating: systemRating ?? 6 }),
  ];

  const pathways = [
    { id: foundry.utils.randomID(), fromId: sanId, toId: spuId, blocked: false, blockedBy: null },
    { id: foundry.utils.randomID(), fromId: sanId, toId: ioId,  blocked: false, blockedBy: null },
    { id: foundry.utils.randomID(), fromId: spuId, toId: snId,  blocked: false, blockedBy: null },
    { id: foundry.utils.randomID(), fromId: spuId, toId: dsId,  blocked: false, blockedBy: null },
    { id: foundry.utils.randomID(), fromId: spuId, toId: cpuId, blocked: false, blockedBy: null },
  ];

  const triggerSteps = Array.from({ length: 9 }, (_, i) => ({
    step: i + 1,
    label: `TS ${i + 1}`,
    triggered: false,
    ic: [],
    description: '',
  }));

  return { nodes, pathways, triggerSteps };
}

/* Node centre point for SVG line drawing */
function _nodeCentre(node) {
  const W = { rectangle:80, hexagon:60, square:60, circle:60, doubleHexagon:72, triangle:70 };
  const H = { rectangle:50, hexagon:60, square:60, circle:60, doubleHexagon:72, triangle:65 };
  const w = W[node.iconShape] ?? 60;
  const h = H[node.iconShape] ?? 60;
  return { cx: (node.x ?? 0) + w / 2, cy: (node.y ?? 0) + h / 2 };
}

/* ─────────────────────────────────────────────────────────────────────── */

export class SR3EHostSheet extends foundry.applications.sheets.ActorSheetV2 {

  _activeTab = 'overview';
  _dragNodeId = null;
  _dragOffsetX = 0;
  _dragOffsetY = 0;

  static DEFAULT_OPTIONS = {
    classes: ['sr3e', 'sheet', 'actor', 'host'],
    tag: 'form',
    position: { width: 800, height: 720 },
    resizable: true,
    window: { resizable: true },
    form: {
      submitOnChange: true,
      closeOnSubmit: false,
    },
    actions: {
      switchTab:          SR3EHostSheet._onSwitchTab,
      initTopology:       SR3EHostSheet._onInitTopology,
      seedPrompts:        SR3EHostSheet._onSeedPrompts,
      initSheaf:          SR3EHostSheet._onInitSheaf,
      addNode:            SR3EHostSheet._onAddNode,
      editNode:           SR3EHostSheet._onEditNode,
      deleteNode:         SR3EHostSheet._onDeleteNode,
      addPathway:         SR3EHostSheet._onAddPathway,
      togglePathwayBlock: SR3EHostSheet._onTogglePathwayBlock,
      deletePathway:      SR3EHostSheet._onDeletePathway,
      addIOPort:          SR3EHostSheet._onAddIOPort,
      deleteIOPort:       SR3EHostSheet._onDeleteIOPort,
      overwatchBox:       SR3EHostSheet._onOverwatchBox,
      alertInc:           SR3EHostSheet._onAlertInc,
      alertDec:           SR3EHostSheet._onAlertDec,
      toggleTriggered:    SR3EHostSheet._onToggleTriggered,
      toggleStepHidden:   SR3EHostSheet._onToggleStepHidden,
      assignIC:           SR3EHostSheet._onAssignIC,
      deployStepIC:       SR3EHostSheet._onDeployStepIC,
      removeStepIC:       SR3EHostSheet._onRemoveStepIC,
      addStockedIC:            SR3EHostSheet._onAddStockedIC,
      removeStockedIC:         SR3EHostSheet._onRemoveStockedIC,
      toggleStockedICHidden:   SR3EHostSheet._onToggleStockedICHidden,
      toggleAllStockedICHidden: SR3EHostSheet._onToggleAllStockedICHidden,
      toggleAllStepsHidden:    SR3EHostSheet._onToggleAllStepsHidden,
      deployICToEncounter:     SR3EHostSheet._onDeployICToEncounter,
      openLinkedActor:    SR3EHostSheet._onOpenLinkedActor,
      addUser:            SR3EHostSheet._onAddUser,
      removeUser:         SR3EHostSheet._onRemoveUser,
      moveUser:           SR3EHostSheet._onMoveUser,
      toggleUserHidden:   SR3EHostSheet._onToggleUserHidden,
      toggleUserLinkLock: SR3EHostSheet._onToggleUserLinkLock,
      addMark:            SR3EHostSheet._onAddMark,
      removeMark:         SR3EHostSheet._onRemoveMark,
      addAgent:           SR3EHostSheet._onAddAgent,
      removeAgent:        SR3EHostSheet._onRemoveAgent,
      toggleTemplate:     SR3EHostSheet._onToggleTemplate,
      deployTemplate:     SR3EHostSheet._onDeployTemplate,
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

    if (savedScroll > 0) {
      const el = content.querySelector('.host-body');
      if (el) el.scrollTop = savedScroll;
    }

    this._attachDragListeners(content);
    this._redrawPathways(content);
  }

  /* ================================================================== */
  /*  Sheet builder                                                      */
  /* ================================================================== */

  _buildSheet(actor, sys) {
    return `
      <div class="sr3e-inner host-sheet">
        ${this._header(actor, sys)}
        ${this._tabBar()}
        <div class="sheet-body host-body">
          ${this._tabOverview(sys)}
          ${this._tabNetworkMap(sys)}
          ${this._tabSecuritySheaf(sys)}
          ${this._tabIOPorts(sys)}
          ${this._tabActivePresence(sys)}
        </div>
      </div>`;
  }

  /* ── Header ─────────────────────────────────────────────────────── */

  _header(actor, sys) {
    const tierColor  = sys.securityTierColor ?? '#00AA00';
    const sysSec     = `${sys.systemRating ?? 6}/${sys.securityTierName ?? 'Green'}(${sys.securityTierThreshold ?? 2})`;
    const isTemplate = !!actor.getFlag('The2ndChumming3e', 'isTemplate');
    return `
      <header class="host-header">
        <img class="actor-portrait" src="${actor.img}" alt="${actor.name}" width="56" height="56">
        <div class="host-name-block">
          <input class="actor-name" type="text" name="name" value="${actor.name}" placeholder="Host Name"/>
          <div class="host-syssec" style="color:${tierColor}">
            <span class="host-syssec-badge">${sysSec}</span>
            ${sys.mainframeSupport ? '<span class="host-mainframe-badge">MAINFRAME</span>' : ''}
          </div>
          <div class="sr3e-template-controls">
            ${isTemplate
              ? `<span class="sr3e-template-badge">TEMPLATE</span>
                 <button type="button" class="sr3e-template-btn" data-action="deployTemplate" title="Create a working copy with the template flag removed">Deploy Copy</button>
                 <button type="button" class="sr3e-template-btn sr3e-template-btn-remove" data-action="toggleTemplate" title="Remove template flag">Remove Flag</button>`
              : `<button type="button" class="sr3e-template-btn sr3e-template-mark" data-action="toggleTemplate" title="Mark as template — hides from host selection dialogs">Mark as Template</button>`
            }
          </div>
        </div>
      </header>`;
  }

  /* ── Tab bar ─────────────────────────────────────────────────────── */

  _tabBar() {
    const tabs = [
      { id:'overview',    label:'Overview'  },
      { id:'network',     label:'Network Map' },
      { id:'sheaf',       label:'Security Sheaf' },
      { id:'ioports',     label:'I/O Ports' },
      { id:'presence',    label:'Active Presence' },
    ];
    const btns = tabs.map(t => `
      <button type="button" class="tab-btn ${this._activeTab === t.id ? 'active' : ''}"
              data-action="switchTab" data-tab="${t.id}">${t.label}</button>`).join('');
    return `<nav class="host-tab-nav">${btns}</nav>`;
  }

  /* ================================================================== */
  /*  Tab: Overview                                                      */
  /* ================================================================== */

  _tabOverview(sys) {
    const tierOpts = SEC_TIERS.map(t =>
      `<option value="${t}" ${sys.securityTierName === t ? 'selected' : ''}>${t}</option>`
    ).join('');
    const derived       = sys.derived ?? {};
    const memAvail      = derived.memoryAvailable ?? ((sys.memoryTotal ?? 3000) - (sys.memoryUsed ?? 0));
    const alertPenalty  = derived.alertTNPenalty ?? 0;
    const memPct        = Math.max(0, Math.min(100, ((sys.memoryUsed ?? 0) / (sys.memoryTotal ?? 3000)) * 100));

    return `
      <div class="tab ${this._activeTab === 'overview' ? 'active' : ''}" data-tab="overview">
        <div class="host-overview-grid">

          <section class="host-section">
            <h3 class="host-section-title">System</h3>
            <div class="host-field-row">
              <label>System Rating</label>
              <input type="number" name="system.systemRating" value="${sys.systemRating ?? 6}" min="1" max="12"/>
            </div>
            <div class="host-field-row">
              <label>Security Tier</label>
              <select name="system.securityTierName">${tierOpts}</select>
            </div>
            <div class="host-field-row">
              <label>Tier Threshold</label>
              <input type="number" name="system.securityTierThreshold" value="${sys.securityTierThreshold ?? 2}" min="0" max="9"/>
            </div>
            <div class="host-field-row">
              <label>Tier Colour</label>
              <input type="color" name="system.securityTierColor" value="${sys.securityTierColor ?? '#00AA00'}"/>
            </div>
            <div class="host-field-row">
              <label>Mainframe Support</label>
              <input type="checkbox" name="system.mainframeSupport" ${sys.mainframeSupport ? 'checked' : ''}/>
            </div>
          </section>

          <section class="host-section">
            <h3 class="host-section-title">Memory</h3>
            <div class="host-field-row">
              <label>Total (Mp)</label>
              <input type="number" name="system.memoryTotal" value="${sys.memoryTotal ?? 3000}" min="0"/>
            </div>
            <div class="host-field-row">
              <label>Used (Mp)</label>
              <input type="number" name="system.memoryUsed" value="${sys.memoryUsed ?? 0}" min="0"/>
            </div>
            <div class="host-field-row">
              <label>Available</label>
              <span class="host-derived">${memAvail} Mp</span>
            </div>
            <div class="host-mem-bar">
              <div class="host-mem-fill" style="width:${memPct}%"></div>
            </div>
          </section>

          <section class="host-section">
            <h3 class="host-section-title">Alerts</h3>
            <div class="host-field-row">
              <label>Alert Level</label>
              <select name="system.alertCount">
                <option value="0" ${(sys.alertCount ?? 0) === 0 ? 'selected' : ''}>0 — Passive</option>
                <option value="1" ${(sys.alertCount ?? 0) === 1 ? 'selected' : ''}>1 — Active Alert</option>
                <option value="2" ${(sys.alertCount ?? 0) === 2 ? 'selected' : ''}>2 — Full Alert</option>
              </select>
            </div>
            <div class="host-field-row">
              <label>Hacking TN Penalty</label>
              <span class="host-derived ${alertPenalty ? 'host-derived-warn' : ''}"
                    title="Applied to all hacking actions inside this host">
                ${alertPenalty ? `+${alertPenalty}` : 'None'}
              </span>
            </div>
            ${(sys.alertCount ?? 0) >= 1 ? `
            <div class="host-alert-status">
              ${(sys.alertCount ?? 0) === 2
                ? '⚠ FULL ALERT — GOD notified, maximum IC response, all exits monitored'
                : '⚠ Active Alert — IC patrol increased, all hacking TNs +2'}
            </div>` : ''}
          </section>

        </div>

        <section class="host-section host-notes-section">
          <h3 class="host-section-title">Notes</h3>
          <textarea name="system.notes" class="host-notes-textarea">${sys.notes ?? ''}</textarea>
        </section>
      </div>`;
  }

  /* ================================================================== */
  /*  Tab: Network Map                                                   */
  /* ================================================================== */

  _tabNetworkMap(sys) {
    const nodes    = sys.nodes ?? [];
    const pathways = sys.pathways ?? [];

    const nodeEls = nodes.map(n => {
      const cx = n.x ?? 0;
      const cy = n.y ?? 0;
      const barrierClass = n.barrierProtected ? 'has-barrier' : '';
      const markedCount  = (n.markedBy ?? []).length;
      const markedBadge  = markedCount ? `<span class="node-marked-badge">${markedCount}✓</span>` : '';
      return `
        <div class="host-node shape-${n.iconShape ?? 'square'} ${barrierClass}"
             data-node-id="${n.id}"
             style="left:${cx}px;top:${cy}px;"
             data-action="editNode"
             title="${n.name}${n.barrierProtected ? ' [Barrier]' : ''}">
          <span class="node-abbr">${n.abbreviation ?? n.type ?? '?'}</span>
          ${markedBadge}
        </div>`;
    }).join('');

    // Pathway lines are drawn via JS in _redrawPathways after render
    const pathwayControls = pathways.map(p => {
      const fromNode = nodes.find(n => n.id === p.fromId);
      const toNode   = nodes.find(n => n.id === p.toId);
      const label    = `${fromNode?.abbreviation ?? p.fromId} → ${toNode?.abbreviation ?? p.toId}`;
      return `
        <div class="pathway-row" data-pathway-id="${p.id}">
          <span class="pathway-label">${label}</span>
          <button type="button" class="pathway-block-btn ${p.blocked ? 'blocked' : ''}"
                  data-action="togglePathwayBlock" data-pathway-id="${p.id}"
                  title="${p.blocked ? 'Unblock' : 'Block'} pathway">
            ${p.blocked ? '🔴' : '🟢'}
          </button>
          <button type="button" class="ctrl-btn ctrl-delete"
                  data-action="deletePathway" data-pathway-id="${p.id}" title="Delete pathway">✕</button>
        </div>`;
    }).join('');

    const initBtn = nodes.length === 0 ? `
      <button type="button" class="host-action-btn" data-action="initTopology">
        Initialize Standard Topology
      </button>` : '';

    const seedPromptsBtn = nodes.length > 0 ? `
      <button type="button" class="host-action-btn-sm" data-action="seedPrompts"
              title="Populate empty prompt lists from defaults (does not overwrite existing prompts)">
        Seed Prompts
      </button>` : '';

    return `
      <div class="tab ${this._activeTab === 'network' ? 'active' : ''}" data-tab="network">
        <div class="network-map-wrap">
          <div class="network-map" id="host-network-map">
            <svg class="pathway-layer" id="host-pathway-svg" width="700" height="460" xmlns="http://www.w3.org/2000/svg"></svg>
            ${nodeEls}
            ${initBtn}
          </div>
        </div>
        <div class="network-controls">
          <div class="network-controls-row">
            <button type="button" class="host-action-btn" data-action="addNode">+ Add Node</button>
            <button type="button" class="host-action-btn" data-action="addPathway">+ Add Pathway</button>
            ${seedPromptsBtn}
          </div>
          <div class="pathway-list">
            ${pathwayControls || '<span class="host-empty">No pathways defined.</span>'}
          </div>
        </div>
      </div>`;
  }

  /* ================================================================== */
  /*  Tab: Security Sheaf                                                */
  /* ================================================================== */

  _tabSecuritySheaf(sys) {
    const overwatch  = sys.overwatchCurrent ?? 0;
    const alertCount = sys.alertCount ?? 0;
    const steps      = sys.triggerSteps ?? [];
    const stocked    = sys.stockedIC ?? [];

    // Overwatch track — 10 boxes, colour shifts green→amber→red→gold
    const owBoxes = Array.from({ length: 10 }, (_, i) => {
      const isFilled = i < overwatch;
      const conv     = i === 9 ? 'convergence' : '';
      const style    = isFilled
        ? `style="background:${OW_COLORS[i]};border-color:${OW_COLORS[i]}"`
        : '';
      return `<div class="overwatch-box ${isFilled ? 'filled' : ''} ${conv}"
                   data-action="overwatchBox" data-index="${i}"
                   ${style}
                   title="${i === 9 ? 'CONVERGENCE' : `Box ${i + 1}`}"></div>`;
    }).join('');

    // Stocked IC list
    const hostNodes      = sys.nodes ?? [];
    const nodeBlankOpt   = `<option value="">— node —</option>`;
    const stockedRows = stocked.map((ic, idx) => {
      const isHidden   = ic.hidden ?? false;
      const icActor    = ic.actorId ? game.actors.get(ic.actorId) : null;
      const icDeployed = icActor?.system?.deployed ?? false;
      const nodeSelOpts = nodeBlankOpt + hostNodes.map(n =>
        `<option value="${n.id}" ${ic.nodeId === n.id ? 'selected' : ''}>${n.abbreviation ?? n.name}</option>`
      ).join('');
      return `
        <div class="stocked-ic-row ${isHidden ? 'sheaf-hidden' : ''}">
          <div class="sheaf-blurrable">
            <span class="ic-chip">${ic.name ?? 'IC'}</span>
            <span class="stocked-ic-mem"><span class="mem-n">${ic.memoryRequired ?? 0}</span> Mp</span>
          </div>
          <select class="stocked-ic-node" data-ic-field="nodeId" data-index="${idx}"
                  title="Starting node for this IC">
            ${nodeSelOpts}
          </select>
          <span class="stocked-ic-deployed ${icDeployed ? 'ic-deployed' : ''}"
                title="${icDeployed ? 'Deployed to encounter' : 'Not deployed'}">
            ${icDeployed ? '⚔' : '·'}
          </span>
          <button type="button" class="sheaf-eye-btn ${isHidden ? 'eye-off' : ''}"
                  data-action="toggleStockedICHidden" data-index="${idx}"
                  title="${isHidden ? 'Hidden from players — click to reveal' : 'Visible — click to hide'}">
            ${isHidden ? '👁' : '👁'}
          </button>
          <button type="button" class="ctrl-btn ctrl-delete"
                  data-action="removeStockedIC" data-index="${idx}" title="Remove">✕</button>
        </div>`;
    }).join('');

    // Trigger step rows
    const stepRows = steps.length ? steps.map((s, idx) => {
      const isHidden   = s.hidden ?? false;
      const assignedIC = (s.ic ?? []).map((icRef, iIdx) => `
        <span class="ic-chip">
          ${icRef.name ?? 'IC'}
          <button type="button" class="chip-remove"
                  data-action="removeStepIC" data-step="${idx}" data-ic-index="${iIdx}">✕</button>
        </span>`).join('');

      return `
        <div class="trigger-step ${s.triggered ? 'triggered' : ''} ${isHidden ? 'sheaf-hidden' : ''}" data-step="${idx}">
          <div class="ts-left">
            <button type="button" class="sheaf-eye-btn ${isHidden ? 'eye-off' : ''}"
                    data-action="toggleStepHidden" data-step="${idx}"
                    title="${isHidden ? 'Hidden from players — click to reveal' : 'Visible — click to hide'}">
              ${isHidden ? '🚫' : '👁'}
            </button>
            <span class="ts-num">${s.step ?? idx + 1}</span>
            <input type="checkbox" ${s.triggered ? 'checked' : ''}
                   data-action="toggleTriggered" data-step="${idx}" title="Mark triggered"/>
          </div>
          <div class="ts-middle">
            <input type="text" class="ts-desc"
                   value="${s.description ?? ''}" placeholder="Description…"
                   data-step-field="description" data-step="${idx}"/>
            <div class="ts-ic-chips">${assignedIC}</div>
          </div>
          <div class="ts-right">
            <button type="button" class="host-action-btn-sm"
                    data-action="assignIC" data-step="${idx}">Assign IC</button>
            <button type="button" class="host-action-btn-sm"
                    data-action="deployStepIC" data-step="${idx}"
                    ${!(s.ic?.length) ? 'disabled' : ''}
                    title="Deploy this step's IC to the active encounter">⚔ Deploy</button>
          </div>
        </div>`;
    }).join('') : `<div class="host-empty">No trigger steps defined.</div>`;

    const initSheafBtn = steps.length === 0 ? `
      <button type="button" class="host-action-btn" data-action="initSheaf">
        Add Default Security Sheaf (10 steps)
      </button>` : '';

    const alertLabel = alertCount === 0 ? 'Passive' : alertCount === 1 ? 'Active Alert (+2 TN)' : 'Full Alert (+4 TN)';
    const alertDesc  = alertCount === 0
      ? 'No alert — standard monitoring only. Overwatch accumulates on failed hacks.'
      : alertCount === 1
      ? 'Active Alert — IC patrols increased. All hacking actions +2 TN.'
      : 'Full Alert — GOD notified. Maximum IC response. All hacking +4 TN. Physical security alerted.';

    const anyStepsVisible  = steps.some(s => !(s.hidden ?? false));
    const anyStockedVisible = stocked.some(s => !(s.hidden ?? false));

    return `
      <div class="tab ${this._activeTab === 'sheaf' ? 'active' : ''}" data-tab="sheaf">

        <section class="host-section">
          <div class="ow-alert-row">
            <h3 class="host-section-title" style="margin:0">Overwatch
              <span class="ts-ow-count">${overwatch} / 10</span>
            </h3>
            <div class="ow-alert-controls">
              <span class="ow-alert-label host-alert-${alertCount}">${alertLabel}</span>
              <button type="button" class="host-num-btn" data-action="alertDec" ${alertCount <= 0 ? 'disabled' : ''}>−</button>
              <button type="button" class="host-num-btn" data-action="alertInc" ${alertCount >= 2 ? 'disabled' : ''}>+</button>
            </div>
          </div>
          <div class="host-ow-desc">${alertDesc}</div>
          <div class="overwatch-track">${owBoxes}</div>
          <div class="host-convergence-note ${overwatch >= 10 ? 'active' : ''}">
            ⚠ CONVERGENCE — Dumpshock + GOD notification + Physical security response
          </div>
        </section>

        <section class="host-section">
          <h3 class="host-section-title">Trigger Steps
            <button type="button" class="sheaf-eye-btn" data-action="toggleAllStepsHidden"
                    title="${anyStepsVisible ? 'Hide all steps from players' : 'Reveal all steps to players'}">👁</button>
          </h3>
          ${initSheafBtn}
          <div class="trigger-steps-list">${stepRows}</div>
        </section>

        <section class="host-section">
          <h3 class="host-section-title">Stocked IC
            <div style="display:flex;gap:4px;align-items:center">
              <button type="button" class="sheaf-eye-btn" data-action="toggleAllStockedICHidden"
                      title="${anyStockedVisible ? 'Hide all IC from players' : 'Reveal all IC to players'}">👁</button>
              <button type="button" class="host-action-btn-sm" data-action="deployICToEncounter"
                      style="font-size:11px;padding:2px 8px;"
                      title="Add selected IC to the active combat encounter">⚔ Deploy</button>
            </div>
          </h3>
          <div class="stocked-ic-list">${stockedRows || '<span class="host-empty">No IC stocked.</span>'}</div>
          <button type="button" class="host-action-btn" data-action="addStockedIC">+ Add IC</button>
        </section>

      </div>`;
  }

  /* ================================================================== */
  /*  Tab: I/O Ports                                                     */
  /* ================================================================== */

  _tabIOPorts(sys) {
    const nodes   = sys.nodes ?? [];
    const ports   = sys.ioPorts ?? [];
    const nodeOpts = nodes.map(n =>
      `<option value="${n.id}">${n.abbreviation ?? n.name}</option>`
    ).join('');

    const rows = ports.map((p, idx) => `
      <div class="ioport-row">
        <input type="text" value="${p.name ?? ''}" placeholder="Port name"
               data-port-field="name" data-index="${idx}"/>
        <select data-port-field="connectedNodeId" data-index="${idx}">
          ${nodes.map(n => `<option value="${n.id}" ${p.connectedNodeId === n.id ? 'selected' : ''}>${n.abbreviation ?? n.name}</option>`).join('')}
        </select>
        <select data-port-field="accessLevel" data-index="${idx}">
          ${ACCESS_LEVELS.map(a => `<option value="${a}" ${p.accessLevel === a ? 'selected' : ''}>${a}</option>`).join('')}
        </select>
        <label class="ioport-passcode" title="Requires passcode">
          🔑<input type="checkbox" ${p.requiresPasscode ? 'checked' : ''}
                   data-port-field="requiresPasscode" data-index="${idx}"/>
        </label>
        <input type="text" value="${p.physicalLocation ?? ''}" placeholder="Physical location"
               data-port-field="physicalLocation" data-index="${idx}"/>
        <button type="button" class="ctrl-btn ctrl-delete"
                data-action="deleteIOPort" data-index="${idx}" title="Delete">✕</button>
      </div>`).join('');

    return `
      <div class="tab ${this._activeTab === 'ioports' ? 'active' : ''}" data-tab="ioports">
        <section class="host-section">
          <h3 class="host-section-title">I/O Ports</h3>
          <div class="ioport-header">
            <span>Name</span><span>Node</span><span>Access</span><span>🔑</span><span>Physical Location</span><span></span>
          </div>
          <div class="ioport-list">
            ${rows || '<span class="host-empty">No I/O ports defined.</span>'}
          </div>
          <button type="button" class="host-action-btn" data-action="addIOPort">+ Add Port</button>
        </section>
      </div>`;
  }

  /* ================================================================== */
  /*  Tab: Active Presence                                               */
  /* ================================================================== */

  _tabActivePresence(sys) {
    const users  = sys.activeUsers  ?? [];
    const agents = sys.activeAgents ?? [];
    const nodes  = sys.nodes ?? [];
    const hostId = this.actor.id;

    // Deployed IC actors linked to this host (populated by the deploy buttons)
    const deployedIC = game.actors
      ? game.actors.filter(a =>
          a.type === 'ic' &&
          (a.system.activeHostId ?? '') === hostId &&
          (a.system.deployed ?? false)
        )
      : [];

    const nodeOpts = nodes.map(n =>
      `<option value="${n.id}">${n.abbreviation ?? n.name}</option>`
    ).join('');

    const userRows = users.map((u, idx) => {
      const marks = (u.marks ?? []).map(nid => {
        const n = nodes.find(x => x.id === nid);
        return `<span class="mark-chip">
          ${n?.abbreviation ?? nid}
          <button type="button" class="chip-remove"
                  data-action="removeMark" data-user="${idx}" data-node="${nid}">✕</button>
        </span>`;
      }).join('');

      const nameEl = u.actorId
        ? `<button type="button" class="presence-name ${u.hidden ? 'presence-hidden' : ''}"
                   data-action="openLinkedActor" data-actor-id="${u.actorId}"
                   style="background:none;border:none;cursor:pointer;text-align:left;text-decoration:underline;padding:0"
                   title="Open actor sheet">${u.name ?? 'Unknown'}</button>`
        : `<span class="presence-name ${u.hidden ? 'presence-hidden' : ''}">${u.name ?? 'Unknown'}</span>`;

      return `
        <div class="presence-row user-row">
          ${nameEl}
          <select data-user-field="currentNodeId" data-index="${idx}">
            <option value="">—</option>
            ${nodes.map(n => `<option value="${n.id}" ${u.currentNodeId === n.id ? 'selected' : ''}>${n.abbreviation ?? n.name}</option>`).join('')}
          </select>
          <div class="presence-marks">${marks}
            <button type="button" class="host-action-btn-sm"
                    data-action="addMark" data-user="${idx}" title="Add mark">+</button>
          </div>
          <label title="Hidden">
            👁<input type="checkbox" ${u.hidden ? 'checked' : ''}
                     data-user-field="hidden" data-index="${idx}"/>
          </label>
          <label title="Link-Locked">
            🔒<input type="checkbox" ${u.linkLocked ? 'checked' : ''}
                     data-user-field="linkLocked" data-index="${idx}"/>
          </label>
          <button type="button" class="ctrl-btn ctrl-delete"
                  data-action="removeUser" data-index="${idx}" title="Remove">✕</button>
        </div>`;
    }).join('');

    const agentRows = agents.map((a, idx) => `
      <div class="presence-row agent-row">
        <span class="presence-name">${a.name ?? 'Agent'}</span>
        <select data-agent-field="currentNodeId" data-index="${idx}">
          <option value="">—</option>
          ${nodes.map(n => `<option value="${n.id}" ${a.currentNodeId === n.id ? 'selected' : ''}>${n.abbreviation ?? n.name}</option>`).join('')}
        </select>
        <span class="agent-role">
          <input type="text" value="${a.role ?? ''}" placeholder="Role (IC / Agent)"
                 data-agent-field="role" data-index="${idx}"/>
        </span>
        <label title="Hidden">
          👁<input type="checkbox" ${a.hidden ? 'checked' : ''}
                   data-agent-field="hidden" data-index="${idx}"/>
        </label>
        <button type="button" class="ctrl-btn ctrl-delete"
                data-action="removeAgent" data-index="${idx}" title="Remove">✕</button>
      </div>`).join('');

    return `
      <div class="tab ${this._activeTab === 'presence' ? 'active' : ''}" data-tab="presence">
        <section class="host-section">
          <h3 class="host-section-title">Active Users</h3>
          <div class="presence-header user-header">
            <span>Name</span><span>Node</span><span>Marks</span><span>👁</span><span>🔒</span><span></span>
          </div>
          <div class="presence-list">${userRows || '<span class="host-empty">No active users.</span>'}</div>
          <button type="button" class="host-action-btn" data-action="addUser">+ Add User</button>
        </section>

        <section class="host-section">
          <h3 class="host-section-title">Active Agents / IC</h3>
          <div class="presence-header agent-header">
            <span>Name</span><span>Node</span><span>Role</span><span>👁</span><span></span>
          </div>
          <div class="presence-list">
            ${deployedIC.map(ic => `
              <div class="presence-row agent-row">
                <span class="presence-name">${ic.name}</span>
                <span style="font-size:11px;color:var(--sr-muted)">—</span>
                <span class="agent-role" style="color:var(--sr-red);font-weight:600">⚔ Deployed (Rtg ${ic.system.rating ?? '?'})</span>
                <span></span>
                <span></span>
              </div>`).join('')}
            ${agentRows}
            ${!deployedIC.length && !agentRows ? '<span class="host-empty">No active agents or IC.</span>' : ''}
          </div>
          <button type="button" class="host-action-btn" data-action="addAgent">+ Add Agent</button>
        </section>
      </div>`;
  }

  /* ================================================================== */
  /*  Post-render wiring                                                 */
  /* ================================================================== */

  _attachDragListeners(content) {
    const map = content.querySelector('#host-network-map');
    if (!map) return;

    let dragging = null;
    let offX = 0, offY = 0;

    map.querySelectorAll('.host-node').forEach(el => {
      el.addEventListener('mousedown', e => {
        if (!this.isEditable) return;
        e.preventDefault();
        e.stopPropagation();
        dragging = el.dataset.nodeId;
        const rect = map.getBoundingClientRect();
        const nodeRect = el.getBoundingClientRect();
        offX = e.clientX - nodeRect.left;
        offY = e.clientY - nodeRect.top;
      });
    });

    map.addEventListener('mousemove', e => {
      if (!dragging) return;
      const rect = map.getBoundingClientRect();
      const node = map.querySelector(`[data-node-id="${dragging}"]`);
      if (!node) return;
      const nx = Math.max(0, e.clientX - rect.left - offX);
      const ny = Math.max(0, e.clientY - rect.top - offY);
      node.style.left = nx + 'px';
      node.style.top  = ny + 'px';
      this._redrawPathways(content);
    });

    map.addEventListener('mouseup', async e => {
      if (!dragging) return;
      const rect     = map.getBoundingClientRect();
      const nodeId   = dragging;
      const node     = map.querySelector(`[data-node-id="${nodeId}"]`);
      dragging = null;
      if (!node) return;
      const nx = parseInt(node.style.left) || 0;
      const ny = parseInt(node.style.top)  || 0;
      const nodes = (this.actor.system.nodes ?? []).map(n =>
        n.id === nodeId ? { ...n, x: nx, y: ny } : n
      );
      await this.actor.update({ 'system.nodes': nodes });
    });

    // Inline changes on I/O Port fields
    content.querySelectorAll('[data-port-field]').forEach(el => {
      el.addEventListener('change', async e => {
        await this._onPortFieldChange(e.target);
      });
    });

    // Inline changes on Trigger Step description fields
    content.querySelectorAll('[data-step-field]').forEach(el => {
      el.addEventListener('change', async e => {
        await this._onStepFieldChange(e.target);
      });
    });

    // Inline changes on Active User fields
    content.querySelectorAll('[data-user-field]').forEach(el => {
      el.addEventListener('change', async e => {
        await this._onUserFieldChange(e.target);
      });
    });

    // Inline changes on Active Agent fields
    content.querySelectorAll('[data-agent-field]').forEach(el => {
      el.addEventListener('change', async e => {
        await this._onAgentFieldChange(e.target);
      });
    });

    // Inline changes on Stocked IC fields (node assignment)
    content.querySelectorAll('[data-ic-field]').forEach(el => {
      el.addEventListener('change', async e => {
        await this._onICFieldChange(e.target);
      });
    });

    // Alert level select — coerce string to integer (NumberField expects a number)
    const alertSelect = content.querySelector('[name="system.alertCount"]');
    if (alertSelect && this.isEditable) {
      alertSelect.addEventListener('change', async e => {
        e.stopPropagation();
        await this.actor.update({ 'system.alertCount': parseInt(e.target.value) || 0 });
      });
    }

    // Auto-sync tier colour + threshold when Security Tier dropdown changes
    const tierSelect = content.querySelector('[name="system.securityTierName"]');
    if (tierSelect && this.isEditable) {
      tierSelect.addEventListener('change', async e => {
        e.stopPropagation(); // one atomic update — don't let form's submitOnChange double-fire
        const name = e.target.value;
        const tier = TIER_DATA[name] ?? { color: '#888888', threshold: 0 };
        await this.actor.update({
          'system.securityTierName':      name,
          'system.securityTierColor':     tier.color,
          'system.securityTierThreshold': tier.threshold,
        });
      });
    }

    // Auto-suggest Security Tier when System Rating changes.
    // Uses a standard SR3 rating→tier mapping so the GM gets a sensible starting
    // point; they can always override the tier dropdown and colour independently.
    const ratingInput = content.querySelector('[name="system.systemRating"]');
    if (ratingInput && this.isEditable) {
      ratingInput.addEventListener('change', async e => {
        e.stopPropagation();
        const rating   = parseInt(e.target.value) || 1;
        const tierName = rating <= 1  ? 'Ivory'
                       : rating <= 3  ? 'Blue'
                       : rating <= 5  ? 'Green'
                       : rating <= 7  ? 'Orange'
                       : rating <= 9  ? 'Red'
                       : rating <= 11 ? 'Black'
                       :                'Ultraviolet';
        const tier = TIER_DATA[tierName];
        await this.actor.update({
          'system.systemRating':          rating,
          'system.securityTierName':      tierName,
          'system.securityTierColor':     tier.color,
          'system.securityTierThreshold': tier.threshold,
        });
      });
    }
  }

  _redrawPathways(content) {
    const svg   = content.querySelector('#host-pathway-svg');
    const map   = content.querySelector('#host-network-map');
    if (!svg || !map) return;
    const nodes = this.actor.system.nodes ?? [];
    const paths = this.actor.system.pathways ?? [];

    // Build position map from live DOM (supports mid-drag positions)
    const posMap = {};
    map.querySelectorAll('.host-node').forEach(el => {
      const nid = el.dataset.nodeId;
      const node = nodes.find(n => n.id === nid);
      if (!node) return;
      posMap[nid] = {
        x: parseInt(el.style.left) || node.x || 0,
        y: parseInt(el.style.top)  || node.y || 0,
        iconShape: node.iconShape ?? 'square',
      };
    });

    const W = { rectangle:80, hexagon:60, square:60, pentagon:70, doubleHexagon:72, triangle:70 };
    const H = { rectangle:50, hexagon:60, square:60, pentagon:70, doubleHexagon:72, triangle:65 };

    const lines = paths.map(p => {
      const a = posMap[p.fromId];
      const b = posMap[p.toId];
      if (!a || !b) return '';
      const cx1 = a.x + (W[a.iconShape] ?? 60) / 2;
      const cy1 = a.y + (H[a.iconShape] ?? 60) / 2;
      const cx2 = b.x + (W[b.iconShape] ?? 60) / 2;
      const cy2 = b.y + (H[b.iconShape] ?? 60) / 2;
      const strokeAttr = p.blocked
        ? 'stroke="var(--sr-red)" stroke-dasharray="6 4" stroke-width="2"'
        : 'stroke="var(--sr-accent)" stroke-width="2"';
      return `<line x1="${cx1}" y1="${cy1}" x2="${cx2}" y2="${cy2}" ${strokeAttr} stroke-opacity="0.7"/>`;
    }).join('');

    svg.innerHTML = lines;
  }

  /* ================================================================== */
  /*  Inline field helpers                                               */
  /* ================================================================== */

  async _onPortFieldChange(el) {
    const field  = el.dataset.portField;
    const idx    = parseInt(el.dataset.index);
    const ports  = foundry.utils.deepClone(this.actor.system.ioPorts ?? []);
    if (!ports[idx]) return;
    ports[idx][field] = el.type === 'checkbox' ? el.checked : el.value;
    await this.actor.update({ 'system.ioPorts': ports });
  }

  async _onStepFieldChange(el) {
    const field  = el.dataset.stepField;
    const idx    = parseInt(el.dataset.step);
    const steps  = foundry.utils.deepClone(this.actor.system.triggerSteps ?? []);
    if (!steps[idx]) return;
    steps[idx][field] = el.value;
    await this.actor.update({ 'system.triggerSteps': steps });
  }

  async _onUserFieldChange(el) {
    const field = el.dataset.userField;
    const idx   = parseInt(el.dataset.index);
    const users = foundry.utils.deepClone(this.actor.system.activeUsers ?? []);
    if (!users[idx]) return;
    users[idx][field] = el.type === 'checkbox' ? el.checked : el.value;
    await this.actor.update({ 'system.activeUsers': users });

    // When GM moves a linked actor to a new node, keep the actor's currentMatrixNode in sync.
    // _sr3eSync:true prevents the updateActor hook from looping back.
    if (field === 'currentNodeId') {
      const actorId = users[idx].actorId;
      if (actorId) {
        const linked = game.actors.get(actorId);
        if (linked) await linked.update({ 'system.currentMatrixNode': el.value }, { _sr3eSync: true });
      }
    }
  }

  async _onAgentFieldChange(el) {
    const field  = el.dataset.agentField;
    const idx    = parseInt(el.dataset.index);
    const agents = foundry.utils.deepClone(this.actor.system.activeAgents ?? []);
    if (!agents[idx]) return;
    agents[idx][field] = el.type === 'checkbox' ? el.checked : el.value;
    await this.actor.update({ 'system.activeAgents': agents });
  }

  async _onICFieldChange(el) {
    const field   = el.dataset.icField;
    const idx     = parseInt(el.dataset.index);
    const stocked = foundry.utils.deepClone(this.actor.system.stockedIC ?? []);
    if (!stocked[idx]) return;
    stocked[idx][field] = el.type === 'checkbox' ? el.checked : el.value;
    await this.actor.update({ 'system.stockedIC': stocked });
  }

  /* ================================================================== */
  /*  Action handlers                                                    */
  /* ================================================================== */

  static async _onSwitchTab(_e, target) {
    this._activeTab = target.dataset.tab;
    this.render();
  }

  /* ── Topology ──────────────────────────────────────────────────── */

  static async _onInitTopology(_e, _t) {
    const { nodes, pathways, triggerSteps } = _defaultTopology(this.actor.system.systemRating);
    await this.actor.update({
      'system.nodes':        nodes,
      'system.pathways':     pathways,
      'system.triggerSteps': triggerSteps,
    });
  }

  // Populate empty prompts arrays on existing nodes without touching IDs, positions, or other data
  static async _onSeedPrompts(_e, _t) {
    const nodes = foundry.utils.deepClone(this.actor.system.nodes ?? []);
    let seeded = 0;
    for (const node of nodes) {
      if ((node.prompts ?? []).length > 0) continue;
      const defaults = DEFAULT_NODE_PROMPTS[node.abbreviation ?? node.type ?? ''];
      if (defaults) {
        node.prompts = defaults.map(p => ({...p}));
        seeded++;
      }
    }
    if (seeded === 0) { ui.notifications.info('SR3E: All nodes already have prompts.'); return; }
    await this.actor.update({ 'system.nodes': nodes });
    ui.notifications.info(`SR3E: Seeded prompts for ${seeded} node(s).`);
  }

  static async _onInitSheaf(_e, _t) {
    const steps = Array.from({ length: 10 }, (_, i) => ({
      step: i + 1, label: `TS ${i + 1}`, triggered: false, hidden: false, ic: [], description: '',
    }));
    await this.actor.update({ 'system.triggerSteps': steps });
  }

  static async _onAddNode(_e, _t) {
    // Step 1 — pick type
    const typeOpts = NODE_TYPES.map(t =>
      `<option value="${t.abbreviation}">${t.name} (${t.abbreviation})</option>`
    ).join('');

    let selectedAbbr = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: 'Add Node — Choose Type' },
      content: `
        <div style="padding:8px 0">
          <label style="font-size:0.85rem">Node Type
            <select id="nd-type" style="width:100%;margin-top:4px">${typeOpts}</select>
          </label>
        </div>`,
      buttons: [
        { label: 'Next →', action: 'next', default: true, callback: (_e, _b, dlg) => {
          selectedAbbr = dlg.element.querySelector('#nd-type').value;
        }},
        { label: 'Cancel', action: 'cancel' },
      ],
    });

    if (!selectedAbbr) return;

    // Step 2 — edit pre-filled fields
    const t = NODE_TYPES.find(x => x.abbreviation === selectedAbbr) ?? NODE_TYPES[0];
    const resolvedAccess = t.defaultAccess === 'varies' ? 'public' : t.defaultAccess;
    const shapeOpts  = NODE_SHAPES.map(s =>
      `<option value="${s}" ${s === t.iconShape ? 'selected' : ''}>${s}</option>`
    ).join('');
    const accessOpts = ACCESS_LEVELS.map(a =>
      `<option value="${a}" ${a === resolvedAccess ? 'selected' : ''}>${a}</option>`
    ).join('');

    let saved = false;
    let result = {};

    await foundry.applications.api.DialogV2.wait({
      window: { title: `Add Node — ${t.name}` },
      content: `
        <div style="display:grid;gap:8px;padding:8px 0">
          <label>Name <input id="nd-name" type="text" value="${t.name}" style="width:100%"/></label>
          <label>Abbreviation <input id="nd-abbr" type="text" value="${t.abbreviation}" maxlength="8" style="width:90px"/></label>
          <label>Shape <select id="nd-shape" style="width:100%">${shapeOpts}</select></label>
          <label>Access <select id="nd-access" style="width:100%">${accessOpts}</select></label>
          <label>Barrier Protected <input id="nd-barrier" type="checkbox" ${t.barrierProtected ? 'checked' : ''}/></label>
          <label>Description <input id="nd-desc" type="text" value="${t.description}" style="width:100%"/></label>
        </div>`,
      buttons: [
        { label: 'Add', action: 'add', default: true, callback: (_e, _b, dlg) => {
          result = {
            id:               foundry.utils.randomID(),
            name:             dlg.element.querySelector('#nd-name').value || 'Node',
            type:             dlg.element.querySelector('#nd-abbr').value || 'ND',
            abbreviation:     dlg.element.querySelector('#nd-abbr').value || 'ND',
            iconShape:        dlg.element.querySelector('#nd-shape').value,
            accessLevel:      dlg.element.querySelector('#nd-access').value,
            description:      dlg.element.querySelector('#nd-desc').value,
            barrierProtected: dlg.element.querySelector('#nd-barrier').checked,
            barrierRating:    0,
            markedBy:         [],
            prompts:          [],
            x: 50, y: 50,
          };
          saved = true;
        }},
        { label: 'Cancel', action: 'cancel' },
      ],
    });

    if (!saved) return;
    const nodes = [...(this.actor.system.nodes ?? []), result];
    await this.actor.update({ 'system.nodes': nodes });
  }

  static async _onEditNode(_e, target) {
    const nodeId = target.dataset.nodeId;
    const nodes  = foundry.utils.deepClone(this.actor.system.nodes ?? []);
    const n      = nodes.find(x => x.id === nodeId);
    if (!n) return;

    const shapeOpts  = NODE_SHAPES.map(s => `<option value="${s}" ${n.iconShape === s ? 'selected' : ''}>${s}</option>`).join('');
    const accessOpts = ACCESS_LEVELS.map(a => `<option value="${a}" ${n.accessLevel === a ? 'selected' : ''}>${a}</option>`).join('');

    let saved = false;

    await foundry.applications.api.DialogV2.wait({
      window: { title: `Edit Node — ${n.name}` },
      content: `
        <div style="display:grid;gap:8px;padding:8px 0">
          <label>Name <input id="nd-name" type="text" value="${n.name ?? ''}" style="width:100%"/></label>
          <label>Abbreviation <input id="nd-abbr" type="text" value="${n.abbreviation ?? ''}" maxlength="8" style="width:90px"/></label>
          <label>Shape <select id="nd-shape" style="width:100%">${shapeOpts}</select></label>
          <label>Access <select id="nd-access" style="width:100%">${accessOpts}</select></label>
          <label>Barrier Protected <input id="nd-barrier" type="checkbox" ${n.barrierProtected ? 'checked' : ''}/></label>
          <label>Barrier Rating <input id="nd-brating" type="number" value="${n.barrierRating ?? 0}" min="0" style="width:60px"/></label>
          <label>Description <input id="nd-desc" type="text" value="${n.description ?? ''}" style="width:100%"/></label>
        </div>`,
      buttons: [
        { label: 'Save', action: 'save', default: true, callback: (_e, _b, dlg) => {
          n.name             = dlg.element.querySelector('#nd-name').value;
          n.abbreviation     = dlg.element.querySelector('#nd-abbr').value;
          n.type             = n.abbreviation;
          n.iconShape        = dlg.element.querySelector('#nd-shape').value;
          n.accessLevel      = dlg.element.querySelector('#nd-access').value;
          n.description      = dlg.element.querySelector('#nd-desc').value;
          n.barrierProtected = dlg.element.querySelector('#nd-barrier').checked;
          n.barrierRating    = parseInt(dlg.element.querySelector('#nd-brating').value) || 0;
          saved = true;
        }},
        { label: 'Delete', action: 'delete', callback: () => { saved = 'delete'; } },
        { label: 'Cancel', action: 'cancel' },
      ],
    });

    if (!saved) return;
    if (saved === 'delete') {
      const updated = nodes.filter(x => x.id !== nodeId);
      const pathways = (this.actor.system.pathways ?? []).filter(p => p.fromId !== nodeId && p.toId !== nodeId);
      await this.actor.update({ 'system.nodes': updated, 'system.pathways': pathways });
    } else {
      await this.actor.update({ 'system.nodes': nodes });
    }
  }

  static async _onDeleteNode(_e, target) {
    const nodeId   = target.dataset.nodeId;
    const nodes    = (this.actor.system.nodes ?? []).filter(n => n.id !== nodeId);
    const pathways = (this.actor.system.pathways ?? []).filter(p => p.fromId !== nodeId && p.toId !== nodeId);
    await this.actor.update({ 'system.nodes': nodes, 'system.pathways': pathways });
  }

  /* ── Pathways ──────────────────────────────────────────────────── */

  static async _onAddPathway(_e, _t) {
    const nodes = this.actor.system.nodes ?? [];
    if (nodes.length < 2) {
      ui.notifications.warn('Need at least 2 nodes to create a pathway.');
      return;
    }
    const nodeOpts = nodes.map(n => `<option value="${n.id}">${n.abbreviation ?? n.name}</option>`).join('');
    let saved = false, fromId, toId;

    await foundry.applications.api.DialogV2.wait({
      window: { title: 'Add Pathway' },
      content: `
        <div style="display:grid;gap:8px;padding:8px 0">
          <label>From <select id="pw-from">${nodeOpts}</select></label>
          <label>To <select id="pw-to">${nodeOpts}</select></label>
        </div>`,
      buttons: [
        { label: 'Add', action: 'add', default: true, callback: (_e, _b, dlg) => {
          fromId = dlg.element.querySelector('#pw-from').value;
          toId   = dlg.element.querySelector('#pw-to').value;
          saved  = true;
        }},
        { label: 'Cancel', action: 'cancel' },
      ],
    });

    if (!saved || fromId === toId) return;
    const pathways = [...(this.actor.system.pathways ?? []), {
      id: foundry.utils.randomID(), fromId, toId, blocked: false, blockedBy: null,
    }];
    await this.actor.update({ 'system.pathways': pathways });
  }

  static async _onTogglePathwayBlock(_e, target) {
    const pwId    = target.dataset.pathwayId;
    const paths   = foundry.utils.deepClone(this.actor.system.pathways ?? []);
    const p       = paths.find(x => x.id === pwId);
    if (!p) return;
    p.blocked = !p.blocked;
    await this.actor.update({ 'system.pathways': paths });
  }

  static async _onDeletePathway(_e, target) {
    const pwId    = target.dataset.pathwayId;
    const paths   = (this.actor.system.pathways ?? []).filter(p => p.id !== pwId);
    await this.actor.update({ 'system.pathways': paths });
  }

  /* ── I/O Ports ─────────────────────────────────────────────────── */

  static async _onAddIOPort(_e, _t) {
    const nodes = this.actor.system.nodes ?? [];
    const port  = {
      id:              foundry.utils.randomID(),
      name:            'New Port',
      connectedNodeId: nodes[0]?.id ?? '',
      accessLevel:     'public',
      requiresPasscode: false,
      physicalLocation: '',
    };
    const ports = [...(this.actor.system.ioPorts ?? []), port];
    await this.actor.update({ 'system.ioPorts': ports });
  }

  static async _onDeleteIOPort(_e, target) {
    const idx   = parseInt(target.dataset.index);
    const ports = (this.actor.system.ioPorts ?? []).filter((_, i) => i !== idx);
    await this.actor.update({ 'system.ioPorts': ports });
  }

  /* ── Overwatch / Alerts ────────────────────────────────────────── */

  static async _onOverwatchBox(_e, target) {
    const idx     = parseInt(target.dataset.index);
    const current = this.actor.system.overwatchCurrent ?? 0;
    const newVal  = idx < current ? idx : Math.min(idx + 1, 10);
    await this.actor.update({ 'system.overwatchCurrent': newVal });
  }

  static async _onAlertInc(_e, _t) {
    const current = this.actor.system.alertCount ?? 0;
    if (current >= 2) return;
    await this.actor.update({ 'system.alertCount': current + 1 });
  }

  static async _onAlertDec(_e, _t) {
    const current = this.actor.system.alertCount ?? 0;
    if (current <= 0) return;
    await this.actor.update({ 'system.alertCount': current - 1 });
  }

  /* ── Trigger Steps ─────────────────────────────────────────────── */

  static async _onToggleTriggered(_e, target) {
    const idx   = parseInt(target.dataset.step);
    const steps = foundry.utils.deepClone(this.actor.system.triggerSteps ?? []);
    if (!steps[idx]) return;
    steps[idx].triggered = !steps[idx].triggered;
    await this.actor.update({ 'system.triggerSteps': steps });
  }

  static async _onToggleStepHidden(_e, target) {
    const idx   = parseInt(target.dataset.step);
    const steps = foundry.utils.deepClone(this.actor.system.triggerSteps ?? []);
    if (!steps[idx]) return;
    steps[idx].hidden = !(steps[idx].hidden ?? false);
    await this.actor.update({ 'system.triggerSteps': steps });
  }

  static async _onToggleStockedICHidden(_e, target) {
    const idx    = parseInt(target.dataset.index);
    const stocked = foundry.utils.deepClone(this.actor.system.stockedIC ?? []);
    if (!stocked[idx]) return;
    stocked[idx].hidden = !(stocked[idx].hidden ?? false);
    await this.actor.update({ 'system.stockedIC': stocked });
  }

  static async _onToggleAllStockedICHidden(_e, _t) {
    const stocked  = foundry.utils.deepClone(this.actor.system.stockedIC ?? []);
    const hideAll  = stocked.some(ic => !(ic.hidden ?? false));
    stocked.forEach(ic => { ic.hidden = hideAll; });
    await this.actor.update({ 'system.stockedIC': stocked });
  }

  static async _onToggleAllStepsHidden(_e, _t) {
    const steps   = foundry.utils.deepClone(this.actor.system.triggerSteps ?? []);
    const hideAll = steps.some(s => !(s.hidden ?? false));
    steps.forEach(s => { s.hidden = hideAll; });
    await this.actor.update({ 'system.triggerSteps': steps });
  }

  static async _onAssignIC(_e, target) {
    const stepIdx = parseInt(target.dataset.step);
    const stocked = this.actor.system.stockedIC ?? [];
    if (!stocked.length) {
      ui.notifications.warn('No stocked IC to assign. Add IC to the Stocked IC list first.');
      return;
    }
    const icOpts = stocked.map((ic, i) =>
      `<option value="${i}">${ic.name ?? 'IC'} (${ic.memoryRequired ?? 0} Mp)</option>`
    ).join('');
    let icIdx = null;

    await foundry.applications.api.DialogV2.wait({
      window: { title: 'Assign IC to Trigger Step' },
      content: `<select id="ic-pick" style="width:100%;margin-top:8px">${icOpts}</select>`,
      buttons: [
        { label: 'Assign', action: 'assign', default: true, callback: (_e, _b, dlg) => {
          icIdx = parseInt(dlg.element.querySelector('#ic-pick').value);
        }},
        { label: 'Cancel', action: 'cancel' },
      ],
    });

    if (icIdx === null || !stocked[icIdx]) return;
    const steps = foundry.utils.deepClone(this.actor.system.triggerSteps ?? []);
    if (!steps[stepIdx]) return;
    if (!steps[stepIdx].ic) steps[stepIdx].ic = [];
    steps[stepIdx].ic.push({ actorId: stocked[icIdx].actorId ?? '', name: stocked[icIdx].name ?? 'IC' });
    await this.actor.update({ 'system.triggerSteps': steps });
  }

  static async _onDeployStepIC(_e, target) {
    if (!game.combat) {
      ui.notifications.warn('No active encounter. Start or join an encounter first.');
      return;
    }
    const stepIdx = parseInt(target.dataset.step);
    const steps   = this.actor.system.triggerSteps ?? [];
    const icRefs  = steps[stepIdx]?.ic ?? [];
    if (!icRefs.length) {
      ui.notifications.warn('No IC assigned to this trigger step.');
      return;
    }

    const toCreate = [];
    const noToken  = [];

    for (const ref of icRefs) {
      if (!ref.actorId) continue;
      const actor = game.actors.get(ref.actorId);
      if (!actor) continue;
      const sceneToken = (canvas.tokens?.placeables ?? []).find(t => t.actor?.id === ref.actorId);
      if (sceneToken) {
        toCreate.push({ tokenId: sceneToken.id, actorId: ref.actorId, sceneId: canvas.scene?.id });
      } else {
        toCreate.push({ actorId: ref.actorId });
        noToken.push(ref.name ?? actor.name);
      }
    }

    if (!toCreate.length) {
      ui.notifications.warn('No deployable IC found (missing actor IDs?).');
      return;
    }

    await game.combat.createEmbeddedDocuments('Combatant', toCreate);

    // Mark IC actors as deployed on this host for matrix targeting
    const hostId = this.actor.id;
    for (const ref of icRefs) {
      if (!ref.actorId) continue;
      const icActor = game.actors.get(ref.actorId);
      if (icActor) await icActor.update({ 'system.deployed': true, 'system.activeHostId': hostId });
    }

    ui.notifications.info(`Deployed ${toCreate.length} IC to the encounter.`);
    if (noToken.length) ui.notifications.warn(`No scene token for: ${noToken.join(', ')}. Added as actor-only.`);
  }

  static async _onRemoveStepIC(_e, target) {
    const stepIdx = parseInt(target.dataset.step);
    const icIdx   = parseInt(target.dataset.icIndex);
    const steps   = foundry.utils.deepClone(this.actor.system.triggerSteps ?? []);
    if (!steps[stepIdx]?.ic) return;
    steps[stepIdx].ic.splice(icIdx, 1);
    await this.actor.update({ 'system.triggerSteps': steps });
  }

  /* ── Stocked IC ────────────────────────────────────────────────── */

  static async _onAddStockedIC(_e, _t) {
    // Pick from existing IC actors in the world
    const icActors = game.actors.filter(a => a.type === 'ic');
    let entry = null;

    if (icActors.length) {
      const icOpts = icActors.map(a =>
        `<option value="${a.id}">${a.name} (Rating ${a.system.rating ?? '?'}, ${a.system.memoryRequired ?? 0} Mp)</option>`
      ).join('');
      await foundry.applications.api.DialogV2.wait({
        window: { title: 'Add IC to Stocked List' },
        content: `
          <div style="padding:8px 0">
            <label>Select IC actor <select id="ic-actor" style="width:100%">${icOpts}</select></label>
          </div>`,
        buttons: [
          { label: 'Add', action: 'add', default: true, callback: (_e, _b, dlg) => {
            const aid = dlg.element.querySelector('#ic-actor').value;
            const a   = game.actors.get(aid);
            entry = { actorId: aid, name: a?.name ?? 'IC', memoryRequired: a?.system?.memoryRequired ?? 0 };
          }},
          { label: 'Cancel', action: 'cancel' },
        ],
      });
    } else {
      // Manual entry fallback
      await foundry.applications.api.DialogV2.wait({
        window: { title: 'Add IC (Manual)' },
        content: `
          <div style="display:grid;gap:8px;padding:8px 0">
            <label>Name <input id="ic-name" type="text" placeholder="Scramble" style="width:100%"/></label>
            <label>Memory (Mp) <input id="ic-mem" type="number" value="0" min="0" style="width:80px"/></label>
          </div>`,
        buttons: [
          { label: 'Add', action: 'add', default: true, callback: (_e, _b, dlg) => {
            entry = {
              actorId: '',
              name: dlg.element.querySelector('#ic-name').value || 'IC',
              memoryRequired: parseInt(dlg.element.querySelector('#ic-mem').value) || 0,
            };
          }},
          { label: 'Cancel', action: 'cancel' },
        ],
      });
    }

    if (!entry) return;
    const stocked = [...(this.actor.system.stockedIC ?? []), entry];
    const memUsed = stocked.reduce((s, ic) => s + (ic.memoryRequired ?? 0), 0);
    await this.actor.update({ 'system.stockedIC': stocked, 'system.memoryUsed': memUsed });
  }

  static async _onRemoveStockedIC(_e, target) {
    const idx     = parseInt(target.dataset.index);
    const stocked = (this.actor.system.stockedIC ?? []).filter((_, i) => i !== idx);
    const memUsed = stocked.reduce((s, ic) => s + (ic.memoryRequired ?? 0), 0);
    await this.actor.update({ 'system.stockedIC': stocked, 'system.memoryUsed': memUsed });
  }

  static async _onDeployICToEncounter(_e, _t) {
    if (!game.combat) {
      ui.notifications.warn('No active encounter. Start or join an encounter first.');
      return;
    }

    const stocked = this.actor.system.stockedIC ?? [];
    const deployable = stocked
      .map(ic => ({ ...ic, actor: ic.actorId ? game.actors.get(ic.actorId) : null }))
      .filter(ic => ic.actor?.type === 'ic');

    if (!deployable.length) {
      ui.notifications.warn('No stocked IC with linked actors found. Use "Add IC" to link actor records to stocked entries.');
      return;
    }

    // Check which are already in the encounter
    const alreadyIn = new Set(game.combat.combatants.contents.map(c => c.actor?.id).filter(Boolean));

    const rows = deployable.map(ic => {
      const inCombat = alreadyIn.has(ic.actorId);
      return `
        <label style="display:flex;align-items:center;gap:8px;margin:4px 0;cursor:pointer;${inCombat ? 'opacity:0.5' : ''}">
          <input type="checkbox" data-actor-id="${ic.actorId}" ${inCombat ? 'disabled' : 'checked'}/>
          <span>${ic.actor.name} <span style="font-size:11px;color:var(--sr-muted)">(Rating ${ic.actor.system.rating ?? '?'})${inCombat ? ' — already in encounter' : ''}</span></span>
        </label>`;
    }).join('');

    let selected = [];
    await foundry.applications.api.DialogV2.wait({
      window: { title: `Deploy IC — ${this.actor.name}` },
      content: `
        <div style="padding:8px 0">
          <p style="margin:0 0 8px;font-size:12px;color:var(--color-text-dark-secondary)">Select IC to add to the active encounter:</p>
          ${rows}
        </div>`,
      buttons: [
        { label: 'Deploy', action: 'deploy', default: true, callback: (_e, _b, dlg) => {
          selected = [...dlg.element.querySelectorAll('[data-actor-id]:checked')]
            .map(cb => cb.dataset.actorId);
        }},
        { label: 'Cancel', action: 'cancel' },
      ],
    });

    if (!selected.length) return;

    const toCreate   = [];
    const noToken    = [];

    for (const actorId of selected) {
      // Prefer a scene token so the combatant has a visual presence
      const sceneToken = (canvas.tokens?.placeables ?? []).find(t => t.actor?.id === actorId);
      if (sceneToken) {
        toCreate.push({ tokenId: sceneToken.id, actorId, sceneId: canvas.scene?.id });
      } else {
        toCreate.push({ actorId });
        noToken.push(game.actors.get(actorId)?.name ?? actorId);
      }
    }

    await game.combat.createEmbeddedDocuments('Combatant', toCreate);

    // Mark deployed IC actors for matrix targeting; apply assigned starting node
    const hostId = this.actor.id;
    for (const actorId of selected) {
      const icActor      = game.actors.get(actorId);
      const stockedEntry = stocked.find(ic => ic.actorId === actorId);
      if (icActor) {
        const upd = { 'system.deployed': true, 'system.activeHostId': hostId };
        if (stockedEntry?.nodeId) upd['system.currentMatrixNode'] = stockedEntry.nodeId;
        await icActor.update(upd);
      }
    }

    ui.notifications.info(`Added ${toCreate.length} IC to the encounter.`);
    if (noToken.length) {
      ui.notifications.warn(`No scene token found for: ${noToken.join(', ')}. Added as actor-only combatants.`);
    }
  }

  /* ── Active Users ──────────────────────────────────────────────── */

  static async _onOpenLinkedActor(_e, target) {
    const actor = game.actors.get(target.dataset.actorId);
    actor?.sheet.render(true);
  }

  static async _onAddUser(_e, _t) {
    const nodes    = this.actor.system.nodes ?? [];
    const nodeOpts = nodes.map(n => `<option value="${n.id}">${n.abbreviation ?? n.name}</option>`).join('');
    let entry = null;

    await foundry.applications.api.DialogV2.wait({
      window: { title: 'Add Active User' },
      content: `
        <div style="display:grid;gap:8px;padding:8px 0">
          <label>Name / Handle <input id="u-name" type="text" placeholder="Fazetripper" style="width:100%"/></label>
          <label>Starting Node <select id="u-node">${nodeOpts}</select></label>
          <label>Icon Type
            <select id="u-type">
              <option value="persona">Persona</option>
              <option value="agent">Agent</option>
            </select>
          </label>
        </div>`,
      buttons: [
        { label: 'Add', action: 'add', default: true, callback: (_e, _b, dlg) => {
          entry = {
            actorId:       '',
            name:          dlg.element.querySelector('#u-name').value || 'Unknown',
            iconType:      dlg.element.querySelector('#u-type').value,
            currentNodeId: dlg.element.querySelector('#u-node').value,
            hidden:        false,
            linkLocked:    false,
            marks:         [],
            marksFalsified:false,
          };
        }},
        { label: 'Cancel', action: 'cancel' },
      ],
    });

    if (!entry) return;
    const users = [...(this.actor.system.activeUsers ?? []), entry];
    await this.actor.update({ 'system.activeUsers': users });
  }

  static async _onRemoveUser(_e, target) {
    const idx   = parseInt(target.dataset.index);
    const users = (this.actor.system.activeUsers ?? []).filter((_, i) => i !== idx);
    await this.actor.update({ 'system.activeUsers': users });
  }

  static async _onMoveUser(_e, target) {
    const idx   = parseInt(target.dataset.index);
    const users = foundry.utils.deepClone(this.actor.system.activeUsers ?? []);
    if (!users[idx]) return;
    users[idx].currentNodeId = target.value;
    await this.actor.update({ 'system.activeUsers': users });

    const actorId = users[idx].actorId;
    if (actorId) {
      const linked = game.actors.get(actorId);
      if (linked) await linked.update({ 'system.currentMatrixNode': target.value }, { _sr3eSync: true });
    }
  }

  static async _onToggleUserHidden(_e, target) {
    const idx   = parseInt(target.dataset.index);
    const users = foundry.utils.deepClone(this.actor.system.activeUsers ?? []);
    if (!users[idx]) return;
    users[idx].hidden = !users[idx].hidden;
    await this.actor.update({ 'system.activeUsers': users });
  }

  static async _onToggleUserLinkLock(_e, target) {
    const idx   = parseInt(target.dataset.index);
    const users = foundry.utils.deepClone(this.actor.system.activeUsers ?? []);
    if (!users[idx]) return;
    users[idx].linkLocked = !users[idx].linkLocked;
    await this.actor.update({ 'system.activeUsers': users });
  }

  static async _onAddMark(_e, target) {
    const userIdx = parseInt(target.dataset.user);
    const nodes   = this.actor.system.nodes ?? [];
    const nodeOpts = nodes.map(n =>
      `<option value="${n.id}">${n.abbreviation ?? n.name}</option>`
    ).join('');
    let nodeId = null;

    await foundry.applications.api.DialogV2.wait({
      window: { title: 'Mark Node' },
      content: `<select id="mark-node" style="width:100%;margin-top:8px">${nodeOpts}</select>`,
      buttons: [
        { label: 'Mark', action: 'mark', default: true, callback: (_e, _b, dlg) => {
          nodeId = dlg.element.querySelector('#mark-node').value;
        }},
        { label: 'Cancel', action: 'cancel' },
      ],
    });

    if (!nodeId) return;
    const users = foundry.utils.deepClone(this.actor.system.activeUsers ?? []);
    if (!users[userIdx]) return;
    if (!users[userIdx].marks) users[userIdx].marks = [];
    if (!users[userIdx].marks.includes(nodeId)) users[userIdx].marks.push(nodeId);
    await this.actor.update({ 'system.activeUsers': users });

    // Sync to linked actor's matrixMarks (_sr3eSync prevents the hook from echoing back)
    const actorId = users[userIdx].actorId;
    if (actorId) {
      const linked = game.actors.get(actorId);
      if (linked) {
        const marks = [...new Set([...(linked.system.matrixMarks ?? []), nodeId])];
        await linked.update({ 'system.matrixMarks': marks }, { _sr3eSync: true });
      }
    }
  }

  static async _onRemoveMark(_e, target) {
    const userIdx = parseInt(target.dataset.user);
    const nodeId  = target.dataset.node;
    const users   = foundry.utils.deepClone(this.actor.system.activeUsers ?? []);
    if (!users[userIdx]) return;
    users[userIdx].marks = (users[userIdx].marks ?? []).filter(id => id !== nodeId);
    await this.actor.update({ 'system.activeUsers': users });

    // Sync removal to linked actor's matrixMarks (_sr3eSync prevents the hook from echoing back)
    const actorId = users[userIdx].actorId;
    if (actorId) {
      const linked = game.actors.get(actorId);
      if (linked) {
        const marks = (linked.system.matrixMarks ?? []).filter(m => m !== nodeId);
        await linked.update({ 'system.matrixMarks': marks }, { _sr3eSync: true });
      }
    }
  }

  /* ── Active Agents ─────────────────────────────────────────────── */

  static async _onAddAgent(_e, _t) {
    const nodes       = this.actor.system.nodes ?? [];
    const nodeOpts    = nodes.map(n => `<option value="${n.id}">${n.abbreviation ?? n.name}</option>`).join('');
    const agentActors = game.actors.filter(a => a.type === 'agent' && !a.getFlag('The2ndChumming3e', 'isTemplate'));
    const alreadyOn   = new Set((this.actor.system.activeAgents ?? []).map(a => a.actorId).filter(Boolean));

    let entry    = null;
    let actorId  = null;

    if (agentActors.length) {
      const agentOpts = agentActors
        .map(a => `<option value="${a.id}" ${alreadyOn.has(a.id) ? 'disabled' : ''}>${a.name} (Rating ${a.system.rating ?? '?'})${alreadyOn.has(a.id) ? ' — already here' : ''}</option>`)
        .join('');

      await foundry.applications.api.DialogV2.wait({
        window: { title: 'Add Agent to Host' },
        content: `
          <div style="display:grid;gap:8px;padding:8px 0">
            <label>Agent Actor <select id="ag-actor" style="width:100%">${agentOpts}</select></label>
            ${nodeOpts ? `<label>Starting Node <select id="ag-node">${nodeOpts}</select></label>` : ''}
          </div>`,
        buttons: [
          { label: 'Add', action: 'add', default: true, callback: (_e, _b, dlg) => {
            actorId = dlg.element.querySelector('#ag-actor')?.value;
            const a = actorId ? game.actors.get(actorId) : null;
            entry = {
              actorId:       actorId ?? '',
              name:          a?.name ?? 'Agent',
              iconType:      'agent',
              currentNodeId: dlg.element.querySelector('#ag-node')?.value ?? null,
              hidden:        false,
              role:          'Agent',
            };
          }},
          { label: 'Cancel', action: 'cancel' },
        ],
      });
    } else {
      await foundry.applications.api.DialogV2.wait({
        window: { title: 'Add Agent (Manual)' },
        content: `
          <div style="display:grid;gap:8px;padding:8px 0">
            <label>Name <input id="ag-name" type="text" placeholder="Authenticator-4" style="width:100%"/></label>
            ${nodeOpts ? `<label>Node <select id="ag-node">${nodeOpts}</select></label>` : ''}
          </div>`,
        buttons: [
          { label: 'Add', action: 'add', default: true, callback: (_e, _b, dlg) => {
            entry = {
              actorId: '', name: dlg.element.querySelector('#ag-name').value || 'Agent',
              iconType: 'agent', currentNodeId: dlg.element.querySelector('#ag-node')?.value ?? null,
              hidden: false, role: 'Agent',
            };
          }},
          { label: 'Cancel', action: 'cancel' },
        ],
      });
    }

    if (!entry) return;
    const agents = [...(this.actor.system.activeAgents ?? []), entry];
    await this.actor.update({ 'system.activeAgents': agents });

    // Sync activeHostId on the agent actor
    if (actorId) {
      const agentActor = game.actors.get(actorId);
      if (agentActor) await agentActor.update({ 'system.activeHostId': this.actor.id });
    }
  }

  static async _onRemoveAgent(_e, target) {
    const idx    = parseInt(target.dataset.index);
    const agents = (this.actor.system.activeAgents ?? []);
    const removed = agents[idx];
    const updated = agents.filter((_, i) => i !== idx);
    await this.actor.update({ 'system.activeAgents': updated });

    // Clear activeHostId on the removed agent actor
    if (removed?.actorId) {
      const agentActor = game.actors.get(removed.actorId);
      if (agentActor) await agentActor.update({ 'system.activeHostId': '' });
    }
  }

  static async _onToggleTemplate(_ev, _target) {
    const current = !!this.actor.getFlag('The2ndChumming3e', 'isTemplate');
    await this.actor.setFlag('The2ndChumming3e', 'isTemplate', !current);
  }

  static async _onDeployTemplate(_ev, _target) {
    const data = this.actor.toObject();
    delete data._id;
    data.name = `${data.name} (copy)`;
    if (data.flags?.['The2ndChumming3e']) delete data.flags['The2ndChumming3e'].isTemplate;
    const newActor = await Actor.create(data);
    newActor.sheet.render(true);
  }
}
