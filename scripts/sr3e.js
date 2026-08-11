import { CharacterData, NpcData, VehicleData, ICData, HostData, AgentData, WardData } from './data/ActorDataModels.js';
import {
  MeleeData, ProjectileData, ThrownData, FirearmData, AmmunitionData,
  ArmorData, GearData, SkillData, QualityData, CyberwareData, BiowareData,
  SpellData, ComplexFormData, SummoningData, AdeptPowerData, VehicleWeaponData, VehicleModData, ProgramData, CyberdeckData, ContactData,
  DrugData, MedicalData,
} from './data/ItemDataModels.js';
import { SR3EActor } from './documents/SR3EActor.js';
import { SR3EItem } from './documents/SR3EItem.js';
import { SR3EActorSheet } from './sheets/SR3EActorSheet.js';
import { SR3EVehicleSheet } from './sheets/SR3EVehicleSheet.js';
import { SR3EItemSheet } from './sheets/SR3EItemSheet.js';
import { SR3EHostSheet } from './sheets/SR3EHostSheet.js';
import { SR3EHostSheetOrthodox } from './sheets/SR3EHostSheetOrthodox.js';
import { SR3EICSheet } from './sheets/SR3EICSheet.js';
import { SR3EICSheetOrthodox } from './sheets/SR3EICSheetOrthodox.js';
import { SR3EWardSheet } from './sheets/SR3EWardSheet.js';
import { SR3EAgentSheet } from './sheets/SR3EAgentSheet.js';
import { SR3E } from './config.js';
import { SR3ECombat } from './documents/SR3ECombat.js';
import { SR3ESpiritSummoning } from './documents/SR3ESpiritSummoning.js';
import { SR3EWard } from './documents/SR3EWard.js';
import { SR3EVehicleChase } from './SR3EVehicleChase.js';
import { SR3EMIJI } from './SR3EMIJI.js';
import { SR3EClocks } from './SR3EClocks.js';
import { SR3ESourceBooks } from './SR3ESourceBooks.js';
import { SR3ECompendiumDirectory } from './SR3ECompendiumDirectory.js';
import { SR3EQuery, SR3EQueue, SR3EGMUnavailable } from './SR3EQuery.js';

Hooks.once('init', () => {
  console.log('SR3E | Initialising');

  // Register the GM-authoritative query handlers FIRST, and in `init` rather
  // than `ready`: a fast click during world load must not reach a verb that
  // nobody is listening for.
  SR3EQuery.register();

  async function buildSkillsCompendium() {
    const PACK_ID = 'The2ndChumming3e.sr3e-skills';
    const pack = game.packs.get(PACK_ID);
    if (!pack) { ui.notifications.error('sr3e-skills pack not found — restart Foundry after the system.json change.'); return; }

    const existing = await pack.getDocuments();
    if (existing.length > 0) {
      let proceed = false;
      await foundry.applications.api.DialogV2.wait({
        window: { title: 'Rebuild Skills Compendium?' },
        content: `<p>The Skills compendium already contains ${existing.length} entries. Delete them and repopulate?</p>`,
        buttons: [
          { label: 'Repopulate', action: 'yes', default: true, callback: () => { proceed = true; } },
          { label: 'Cancel', action: 'cancel', default: false },
        ],
      });
      if (!proceed) return;
    }

    await pack.configure({ locked: false });
    for (const doc of await pack.getDocuments()) await doc.delete();

    let created = 0;
    for (const [cat, skills] of Object.entries(SR3E.skills)) {
      for (const s of skills) {
        try {
          const tmpItem = await Item.create({
            name: s.name, type: 'skill',
            system: { category: cat, skillType: SR3E.skillTypeForCategory(cat),
                      skillName: s.name, linkedAttribute: s.linkedAttribute, rating: 1 },
          }, { renderSheet: false });
          await pack.importDocument(tmpItem);
          await tmpItem.delete();
          created++;
        } catch (err) {
          console.error(`SR3E | Failed to create skill "${s.name}":`, err);
        }
      }
    }

    await pack.configure({ locked: true });
    ui.notifications.info(`SR3E: ${created} skills added to the compendium.`);
  }

  // Returns true when an actor should appear in selection/targeting dialogs.
  // Fresh world actors (no compendiumSource): shown unless explicitly marked template.
  // Compendium imports (has compendiumSource): hidden unless explicitly marked live.
  function isLiveActor(a) {
    return a._stats?.compendiumSource
      ? a.getFlag('The2ndChumming3e', 'isTemplate') === false
      : a.getFlag('The2ndChumming3e', 'isTemplate') !== true;
  }

  game.sr3e = { SR3E, SR3EActor, SR3EItem, SR3ESpiritSummoning, SR3EVehicleChase, SR3EMIJI, SR3EClocks, SR3EWard, SR3ESourceBooks, buildSkillsCompendium, isLiveActor, SR3EQuery, SR3EQueue, SR3EGMUnavailable };
  game.sr3e.openChunkySalsa = _openChunkySalsaCalculator; // (function declaration, hoisted)

  // Data models (replace template.json defaults)
  CONFIG.Actor.dataModels.character = CharacterData;
  CONFIG.Actor.dataModels.npc       = NpcData;
  CONFIG.Actor.dataModels.vehicle   = VehicleData;
  CONFIG.Actor.dataModels.host      = HostData;
  CONFIG.Actor.dataModels.ic        = ICData;
  CONFIG.Actor.dataModels.agent     = AgentData;
  CONFIG.Actor.dataModels.ward      = WardData;

  CONFIG.Item.dataModels.melee        = MeleeData;
  CONFIG.Item.dataModels.projectile   = ProjectileData;
  CONFIG.Item.dataModels.thrown       = ThrownData;
  CONFIG.Item.dataModels.firearm      = FirearmData;
  CONFIG.Item.dataModels.ammunition   = AmmunitionData;
  CONFIG.Item.dataModels.armor        = ArmorData;
  CONFIG.Item.dataModels.gear         = GearData;
  CONFIG.Item.dataModels.drug         = DrugData;
  CONFIG.Item.dataModels.medical      = MedicalData;
  CONFIG.Item.dataModels.skill        = SkillData;
  CONFIG.Item.dataModels.quality      = QualityData;
  CONFIG.Item.dataModels.cyberware    = CyberwareData;
  CONFIG.Item.dataModels.bioware      = BiowareData;
  CONFIG.Item.dataModels.spell        = SpellData;
  CONFIG.Item.dataModels.complex_form = ComplexFormData;
  CONFIG.Item.dataModels.summoning    = SummoningData;
  CONFIG.Item.dataModels.adeptpower   = AdeptPowerData;
  CONFIG.Item.dataModels.vehicleweapon = VehicleWeaponData;
  CONFIG.Item.dataModels.vehiclemod    = VehicleModData;
  CONFIG.Item.dataModels.program      = ProgramData;
  CONFIG.Item.dataModels.cyberdeck    = CyberdeckData;
  CONFIG.Item.dataModels.contact      = ContactData;

  // SR3 token status conditions. The auto-synced ones (astral/dual/VR/full-defense) are
  // driven from system state by an updateActor hook; the rest are manual GM toggles.
  CONFIG.statusEffects.push(
    { id: 'sr3e-sustaining',  name: 'Sustaining a Spell', img: 'icons/svg/daze.svg' },
    { id: 'sr3e-fulldefense', name: 'Full Defense',       img: 'icons/svg/shield.svg' },
    { id: 'sr3e-dumpshock',   name: 'Dumpshocked',        img: 'icons/svg/lightning.svg' },
    { id: 'sr3e-astral',      name: 'Astral Projection',  img: 'icons/svg/aura.svg' },
    { id: 'sr3e-dual',        name: 'Dual-Natured',       img: 'icons/svg/eye.svg' },
    { id: 'sr3e-vr',          name: 'Jacked In (VR)',     img: 'icons/svg/net.svg' },
  );

  // Default icons for each item type (must reference paths that exist in Foundry v14)
  CONFIG.Item.typeIcons = {
    melee:        'icons/svg/sword.svg',
    projectile:   'icons/svg/thrust.svg',
    thrown:       'icons/svg/target.svg',
    firearm:      'icons/svg/combat.svg',
    ammunition:   'icons/svg/skull.svg',
    armor:        'icons/svg/shield.svg',
    gear:         'icons/svg/chest.svg',
    skill:        'icons/svg/book.svg',
    quality:      'icons/svg/aura.svg',
    cyberware:    'icons/svg/upgrade.svg',
    bioware:      'icons/svg/biohazard.svg',
    spell:        'icons/svg/fire.svg',
    complex_form: 'icons/svg/net.svg',
    summoning:    'icons/svg/angel.svg',
    adeptpower:   'icons/svg/lightning.svg',
    vehicleweapon:'icons/svg/explosion.svg',
    vehiclemod:   'icons/svg/clockwork.svg',
    program:      'icons/svg/net.svg',
    cyberdeck:    'icons/svg/portal.svg',
    contact:      'icons/svg/mystery-man.svg',
  };

  CONFIG.Actor.documentClass = SR3EActor;
  CONFIG.Item.documentClass = SR3EItem;
  CONFIG.Combat.documentClass = SR3ECombat;

  // Source books — which books' compendium content is in play. Hidden books are
  // filtered out of the sidebar (via the CompendiumDirectory subclass below) and out
  // of the item pickers (SR3EItem._packsForType). Packs declare their book with
  // flags.The2ndChumming3e.book; packs without it are system content, always shown.
  SR3ESourceBooks.register();
  CONFIG.ui.compendium = SR3ECompendiumDirectory;

  // Matrix ruleset — registered first so it can gate host-sheet selection below.
  // Changing this setting triggers a page reload (requiresReload) which re-runs
  // init and registers the correct sheet class.
  game.settings.register('The2ndChumming3e', 'matrixRuleset', {
    name: 'Matrix Ruleset',
    hint: 'Choose the matrix rules for your campaign. Defragged v2 is the default simplified ruleset. Orthodox uses the standard SR3 core-book hacking rules. Changing this reloads Foundry.',
    scope: 'world',
    config: true,
    requiresReload: true,
    type: String,
    choices: {
      'defragged': 'Matrix Defragged v2',
      'orthodox':  'Orthodox SR3 Matrix',
    },
    default: 'defragged',
  });
  const _orthodoxMatrix = game.settings.get('The2ndChumming3e', 'matrixRuleset') === 'orthodox';

  // Register sheets
  foundry.documents.collections.Actors.unregisterSheet('core', foundry.appv1.sheets.ActorSheet);
  foundry.documents.collections.Actors.registerSheet('The2ndChumming3e', SR3EActorSheet, {
    types: ['character', 'npc'],
    makeDefault: true,
    label: 'SR3E Character Sheet'
  });

  foundry.documents.collections.Actors.registerSheet('The2ndChumming3e', SR3EVehicleSheet, {
    types: ['vehicle'],
    makeDefault: true,
    label: 'SR3E Vehicle Sheet'
  });

  foundry.documents.collections.Actors.registerSheet('The2ndChumming3e',
    _orthodoxMatrix ? SR3EHostSheetOrthodox : SR3EHostSheet, {
    types: ['host'],
    makeDefault: true,
    label: _orthodoxMatrix ? 'SR3E Host Sheet (Orthodox)' : 'SR3E Host Sheet (Defragged v2)',
  });

  foundry.documents.collections.Actors.registerSheet('The2ndChumming3e',
    _orthodoxMatrix ? SR3EICSheetOrthodox : SR3EICSheet, {
    types: ['ic'],
    makeDefault: true,
    label: _orthodoxMatrix ? 'SR3E IC Sheet (Orthodox)' : 'SR3E IC Sheet (Defragged v2)',
  });

  foundry.documents.collections.Actors.registerSheet('The2ndChumming3e', SR3EAgentSheet, {
    types: ['agent'],
    makeDefault: true,
    label: 'SR3E Agent Sheet'
  });

  foundry.documents.collections.Actors.registerSheet('The2ndChumming3e', SR3EWardSheet, {
    types: ['ward'],
    makeDefault: true,
    label: 'SR3E Ward Sheet'
  });

  foundry.documents.collections.Items.unregisterSheet('core', foundry.appv1.sheets.ItemSheet);
  foundry.documents.collections.Items.registerSheet('The2ndChumming3e', SR3EItemSheet, {
    makeDefault: true,
    label: 'SR3E Item Sheet'
  });

  // Register system setting for initiative mode
  game.settings.register('The2ndChumming3e', 'initiativeMode', {
    name: 'Initiative Mode',
    hint: 'SR3: Everyone acts once in order, then fast characters get additional passes. SR2: Pure descending order, subtract 10 per pass.',
    scope: 'world',
    config: true,
    type: String,
    choices: {
      'sr3': 'SR3 (Everyone acts once, then extra passes)',
      'sr2': 'SR2 (Pure descending order)'
    },
    default: 'sr3'
  });

  // Optional ammunition tracking — when on, firing decrements the loaded ammo's
  // rounds-remaining counter. Off by default; behaves as before when disabled.
  game.settings.register('The2ndChumming3e', 'gmApprovesTN', {
    name: 'GM sets the Target Number',
    hint: 'Who adjudicates the TN on a ranged attack. "Player attacks only" (default) opens the GM\'s modifier window when a player attacks, and costs the GM nothing when running NPC-vs-NPC. "Always" opens it for every attack including the GM\'s own. "Off" restores the old behaviour exactly — the attacker sets their own TN and no GM window opens.',
    scope: 'world',
    config: true,
    type: String,
    choices: {
      off:    'Off — attacker sets the TN (as before)',
      player: 'Player attacks only (recommended)',
      always: 'Always, including GM attacks',
    },
    default: 'player',
  });

  game.settings.register('The2ndChumming3e', 'trackAmmo', {
    name: 'Track Ammunition',
    hint: 'When enabled, firing decrements the selected ammo\'s rounds-remaining counter (1 SS/SA, 3 BF, N FA). Warns when empty but never blocks a shot. Reload by editing the rounds field on the ammo item.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
  });

  // GM Threat Clocks — persisted shared state, edited via game.sr3e.SR3EClocks.open().
  game.settings.register('The2ndChumming3e', 'clocks', {
    scope: 'world',
    config: false,
    type: Array,
    default: [],
  });

  console.log('SR3E | Ready');
});

// Threat Clocks live across all connected clients — re-render any open instance whenever
// the GM edits the shared world-setting state.
Hooks.on('updateSetting', setting => {
  if (setting.key !== 'The2ndChumming3e.clocks') return;
  SR3EClocks.refresh();
});

// Auto-create GM utility macros on first load
Hooks.once('ready', async () => {
  if (!game.user.isGM) return;

  const macros = [
    {
      name: 'Import Nullsheen 3e Character json',
      path: 'scripts/macros/import-sr3-character.js',
      img:  'icons/svg/mystery-man.svg',
    },
    {
      name: 'Populate SR3E Programming Agents',
      path: 'scripts/macros/populate-agents.js',
      img:  'icons/svg/mystery-man.svg',
    },
    {
      name: 'Populate SR3E DataHosts',
      path: 'scripts/macros/populate-hosts.js',
      img:  'icons/svg/portal.svg',
    },
  ];

  for (const def of macros) {
    if (game.macros.find(m => m.name === def.name)) continue;
    try {
      // fetch() resolves for 404s too, and the body is Foundry's HTML error page.
      // Without this check that HTML is handed to Macro.create as script source,
      // which fails validation with a bewildering "Unexpected token '<'".
      const res = await fetch(`systems/The2ndChumming3e/${def.path}`);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText} fetching ${def.path}`);
      const src = await res.text();
      await Macro.create({ name: def.name, type: 'script', command: src, img: def.img });
      ui.notifications.info(`SR3E: "${def.name}" macro added to your macro library.`);
    } catch (err) {
      console.warn(`SR3E | Could not auto-create macro "${def.name}":`, err);
    }
  }

  // Auto-create organisational folders for non-character actor types.
  // These folders keep the world actors directory tidy — IC, agents, hosts,
  // and vehicles live in folders rather than mixing with runner characters.
  const ACTOR_FOLDERS = [
    { name: 'IC & Agents',      color: '#1a3a5c' },
    { name: 'DataHosts',        color: '#2a1a3a' },
    { name: 'Vehicles & Drones', color: '#1c2a1c' },
  ];
  for (const fd of ACTOR_FOLDERS) {
    if (!game.folders.find(f => f.type === 'Actor' && f.name === fd.name)) {
      await Folder.create({ name: fd.name, type: 'Actor', color: fd.color });
    }
  }
});

// Deleting a ward actor should also clean up its boundary marker (Region or local PIXI
// fallback) — same lifecycle the grenade/spell-AoE "🧹 Clear" buttons handle manually.
Hooks.on('deleteActor', async (actor) => {
  if (actor.type !== 'ward') return;
  await SR3EWard._clearBoundary(actor);
});

// Auto-assign newly created Matrix/vehicle actors to their organisational folder,
// and stamp fresh world actors with isTemplate:false so they appear in selection dialogs.
// Compendium imports are left unmarked (isTemplate:undefined) — GM must explicitly
// click "Mark as Live" on each one before it appears in targeting/linking dialogs.
Hooks.on('preCreateActor', (document, _data, options, _userId) => {
  if (options.pack) return; // compendium creates don't use world folders

  if (!document.folder) {
    const folderMap = {
      ic:      'IC & Agents',
      agent:   'IC & Agents',
      host:    'DataHosts',
      vehicle: 'Vehicles & Drones',
    };
    const folderName = folderMap[document.type];
    if (folderName) {
      const folder = game.folders?.find(f => f.type === 'Actor' && f.name === folderName);
      if (folder) document.updateSource({ folder: folder.id });
    }
  }

  // Fresh world creates (not imported from a compendium) are live actors.
  if (!_data._stats?.compendiumSource) {
    document.updateSource({ flags: { 'The2ndChumming3e': { isTemplate: false } } });
  }

  // Ensure tokens are linked by default so token sheet === world actor sheet.
  // Unlinked tokens create a separate actor instance, causing duplicate sheets.
  if (!_data.prototypeToken?.actorLink) {
    document.updateSource({ prototypeToken: { actorLink: true } });
  }

  // Default token bars to the wound tracks (fill as damage rises). Owners see them on hover.
  if (['character', 'npc'].includes(document.type) && !_data.prototypeToken?.bar1) {
    document.updateSource({ prototypeToken: {
      bar1: { attribute: 'wounds.physical' },
      bar2: { attribute: 'wounds.stun' },
      displayBars: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
    } });
  }
});

async function _openSessionRewardDialog() {
  const allPCs = game.actors.filter(a => a.type === 'character' && game.sr3e.isLiveActor(a));

  if (!allPCs.length) {
    ui.notifications.warn('No character actors found in this world.');
    return;
  }

  const pcRows = allPCs.map(a => `
    <label style="display:flex;align-items:center;gap:8px;margin:3px 0;cursor:pointer;">
      <input type="checkbox" data-actor-id="${a.id}" checked/>
      <span>${a.name}</span>
      <span style="color:var(--sr-muted);font-size:11px">(${a.system.karmaPool ?? 0} karma | ¥${(a.system.nuyen ?? 0).toLocaleString()})</span>
    </label>`).join('');

  let karma = 0, nuyen = 0, gearNotes = '', selectedIds = [], proceed = false;

  await foundry.applications.api.DialogV2.wait({
    window: { title: 'Session Rewards' },
    content: `
      <div style="padding:8px 0">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <label>Karma reward:
            <input type="number" id="sr-karma-reward" value="0" min="0" style="width:70px;margin-left:6px"/>
          </label>
          <label>Nuyen reward:
            <input type="number" id="sr-nuyen-reward" value="0" min="0" style="width:80px;margin-left:6px"/>
          </label>
        </div>
        <label style="display:block;margin-bottom:12px">Gear / notes (text only):
          <textarea id="sr-gear-notes" rows="2" style="width:100%;margin-top:4px;box-sizing:border-box;resize:vertical;"></textarea>
        </label>
        <p style="margin:0 0 6px;font-size:11px;color:var(--sr-muted)">Award to:</p>
        <div>${pcRows}</div>
      </div>`,
    buttons: [
      {
        label: 'Award',
        action: 'award',
        default: true,
        callback: (_e, _b, dialog) => {
          proceed = true;
          karma       = Math.max(0, parseInt(dialog.element.querySelector('#sr-karma-reward')?.value) || 0);
          nuyen       = Math.max(0, parseInt(dialog.element.querySelector('#sr-nuyen-reward')?.value) || 0);
          gearNotes   = dialog.element.querySelector('#sr-gear-notes')?.value.trim() ?? '';
          selectedIds = [...dialog.element.querySelectorAll('[data-actor-id]:checked')].map(cb => cb.dataset.actorId);
        },
      },
      { label: 'Cancel', action: 'cancel' },
    ],
  });

  if (!proceed || !selectedIds.length) return;

  const targets = allPCs.filter(a => selectedIds.includes(a.id));
  for (const actor of targets) {
    const updates = {};
    if (karma) updates['system.karmaPool'] = (actor.system.karmaPool ?? 0) + karma;
    if (nuyen)  updates['system.nuyen']    = (actor.system.nuyen ?? 0) + nuyen;
    if (Object.keys(updates).length) await actor.update(updates);
  }

  const lines = targets.map(a => `<li>${a.name}</li>`).join('');
  const karmaLine = karma ? `<div><strong>Karma:</strong> +${karma}</div>` : '';
  const nuyenLine = nuyen ? `<div><strong>Nuyen:</strong> +¥${nuyen.toLocaleString()}</div>` : '';
  const gearLine  = gearNotes ? `<div><strong>Gear:</strong> ${gearNotes}</div>` : '';

  await ChatMessage.create({
    speaker: { alias: 'GM' },
    content: `
      <div class="sr-roll-card">
        <div class="sr-roll-header" style="background:var(--sr-gold,#c8a040);color:#0a0a0a">🎖 Session Rewards</div>
        <div class="sr-roll-body" style="padding:8px">
          ${karmaLine}${nuyenLine}${gearLine}
          <div style="margin-top:6px;font-size:11px;color:var(--sr-muted)">Awarded to:</div>
          <ul style="margin:4px 0 0;padding-left:18px;font-size:12px">${lines}</ul>
        </div>
      </div>`,
    style: CONST.CHAT_MESSAGE_STYLES.OTHER,
  });
}

// opts (optional): { power, level, actorIds, returnOnly }
//   - power/level seed the blast; actorIds limits/places the participants
//   - returnOnly: resolve and RETURN [{actorId,name,power,level,waves}] instead of posting to chat
async function _openChunkySalsaCalculator(opts = {}) {
  // ── Constants ──────────────────────────────────────────────────────────────
  const CW = 420, CH = 420, CX = 210, CY = 210;
  const SCALE = 25;          // pixels per metre
  const MAX_R = 195;         // max rendered radius in px  (~7.8 m)
  const HIT   = 11;          // hit-test radius in px
  const ACTOR_COLORS = ['#e06060','#60a0e0','#60c060','#e0c060','#c060e0','#e09060','#60c0c0','#d0a060'];

  // ── Coordinate helpers ─────────────────────────────────────────────────────
  const toMx  = px => (px - CX) / SCALE;
  const toMy  = py => (py - CY) / SCALE;
  const toPx  = mx => CX + mx * SCALE;
  const toPy  = my => CY + my * SCALE;
  const hypot = (x, y) => Math.sqrt(x * x + y * y);

  function distPtSeg(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
    if (len2 < 1e-9) return hypot(px - ax, py - ay);
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
    return hypot(px - (ax + t * dx), py - (ay + t * dy));
  }

  // ── Blast physics (all in metres, blast at origin) ─────────────────────────
  function calcBlastM(amx, amy, walls, power) {
    const D = hypot(amx, amy);
    const waves = [];
    const direct = power - D;
    if (direct > 0) waves.push({ label: `Direct (${D.toFixed(1)}m)`, power: direct });
    for (const w of walls) {
      const W = distPtSeg(0, 0, w.x1, w.y1, w.x2, w.y2);
      if (W < 0.05) continue;
      let wp, label;
      if (D < 0.05) {
        wp = power - 2 * W;
        label = `Wall @${W.toFixed(1)}m`;
      } else {
        const proj = (amx / D) * (w.x1 + w.x2) / 2 + (amy / D) * (w.y1 + w.y2) / 2;
        if (proj > D) {
          wp    = power - (2 * W - D);
          label = `Behind @${W.toFixed(1)}m`;
        } else {
          wp    = power - (2 * W + D);
          label = `Opp. @${W.toFixed(1)}m`;
        }
      }
      if (wp > 0) waves.push({ label, power: wp });
    }
    return waves;
  }

  // ── Mutable state ──────────────────────────────────────────────────────────
  let eligible = game.actors.filter(a => (a.type === 'character' || a.type === 'npc') && game.sr3e.isLiveActor(a));
  if (opts.actorIds?.length) eligible = eligible.filter(a => opts.actorIds.includes(a.id));
  const actors   = eligible.map((a, i) => {
    const angle = (2 * Math.PI * i / Math.max(eligible.length, 1)) - Math.PI / 2;
    return { id: a.id, name: a.name, color: ACTOR_COLORS[i % ACTOR_COLORS.length],
             mx: 3 * Math.cos(angle), my: 3 * Math.sin(angle), checked: true };
  });
  const walls = [];
  let power = opts.power ?? 10, level = opts.level ?? 'S';
  let mode = 'idle'; // idle | draw_wall | drag_actor | drag_wall_end | drag_wall_mid
  let drag = null, wallStart = null, prevPx = 0, prevPy = 0;

  // ── Canvas draw ────────────────────────────────────────────────────────────
  function draw(canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, CW, CH);

    // Background
    ctx.fillStyle = '#0c0c0c';
    ctx.fillRect(0, 0, CW, CH);

    // Grid lines (1 m)
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let x = CX % SCALE; x < CW; x += SCALE) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CH); ctx.stroke(); }
    for (let y = CY % SCALE; y < CH; y += SCALE) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke(); }

    // Blast radial fill
    const blastR = Math.min(power * SCALE + 30, MAX_R + 60);
    const grd = ctx.createRadialGradient(CX, CY, 0, CX, CY, blastR);
    grd.addColorStop(0,   'rgba(255,80,0,0.20)');
    grd.addColorStop(0.6, 'rgba(255,140,0,0.07)');
    grd.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(CX, CY, blastR, 0, 2 * Math.PI); ctx.fill();

    // Distance rings
    const maxRing = Math.ceil(MAX_R / SCALE) + 1;
    for (let r = 1; r <= maxRing; r++) {
      const rpx = r * SCALE;
      const rem = power - r;
      const major = r % 2 === 0;
      ctx.strokeStyle = rem > 0
        ? `hsla(${(rem / power) * 120},70%,55%,${major ? 0.40 : 0.14})`
        : 'rgba(120,120,120,0.08)';
      ctx.lineWidth = major ? 1.5 : 0.7;
      ctx.setLineDash(rem > 0 ? [] : [3, 3]);
      ctx.beginPath(); ctx.arc(CX, CY, rpx, 0, 2 * Math.PI); ctx.stroke();
      ctx.setLineDash([]);
      if (major && rem > 0 && rpx <= MAX_R) {
        ctx.fillStyle = `hsla(${(rem / power) * 120},70%,65%,0.65)`;
        ctx.font = '8px monospace'; ctx.textAlign = 'left';
        ctx.fillText(`${r}m`, CX + rpx + 3, CY - 3);
      }
    }

    // Walls
    for (const w of walls) {
      const px1 = toPx(w.x1), py1 = toPy(w.y1), px2 = toPx(w.x2), py2 = toPy(w.y2);
      const mpx = (px1 + px2) / 2, mpy = (py1 + py2) / 2;
      ctx.strokeStyle = '#8888cc'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(px1, py1); ctx.lineTo(px2, py2); ctx.stroke();
      // Endpoint handles
      ctx.fillStyle = '#aaaaee';
      for (const [ex, ey] of [[px1, py1], [px2, py2]]) { ctx.beginPath(); ctx.arc(ex, ey, 5, 0, 2 * Math.PI); ctx.fill(); }
      // Midpoint handle
      ctx.fillStyle = '#ccccff';
      ctx.beginPath(); ctx.arc(mpx, mpy, 4, 0, 2 * Math.PI); ctx.fill();
      // Distance label
      const Wm = distPtSeg(0, 0, w.x1, w.y1, w.x2, w.y2);
      ctx.fillStyle = 'rgba(170,170,255,0.85)'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
      ctx.fillText(`${Wm.toFixed(1)}m`, mpx, mpy - 8);
    }

    // Wall preview while drawing
    if (mode === 'draw_wall' && wallStart) {
      ctx.strokeStyle = 'rgba(170,170,220,0.4)'; ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(toPx(wallStart.mx), toPy(wallStart.my)); ctx.lineTo(prevPx, prevPy); ctx.stroke();
      ctx.setLineDash([]);
    }

    // Blast centre marker
    ctx.fillStyle = '#ff5010';
    ctx.beginPath(); ctx.arc(CX, CY, 9, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(CX, CY, 9, 0, 2 * Math.PI); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('G', CX, CY);
    ctx.textBaseline = 'alphabetic';

    // Actors
    for (const ac of actors) {
      if (!ac.checked) continue;
      const px = toPx(ac.mx), py = toPy(ac.my);
      const D  = hypot(ac.mx, ac.my);

      // Dashed line to centre
      ctx.strokeStyle = ac.color + '44'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(CX, CY); ctx.lineTo(px, py); ctx.stroke();
      ctx.setLineDash([]);

      // Distance tag on the line
      const lx = (CX + px) / 2, ly = (CY + py) / 2;
      const dtxt = `${D.toFixed(1)}m`;
      ctx.font = '8px monospace';
      const dtw = ctx.measureText(dtxt).width;
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(lx - dtw / 2 - 2, ly - 9, dtw + 4, 11);
      ctx.fillStyle = ac.color; ctx.textAlign = 'center'; ctx.fillText(dtxt, lx, ly);

      // Actor disc
      ctx.fillStyle = ac.color;
      ctx.beginPath(); ctx.arc(px, py, 11, 0, 2 * Math.PI); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(px, py, 11, 0, 2 * Math.PI); ctx.stroke();

      // Damage label below disc
      const waves  = calcBlastM(ac.mx, ac.my, walls, power);
      const totalP = Math.round(waves.reduce((s, w) => s + w.power, 0));
      const dmgStr = waves.length ? `${totalP}${level}` : '—';
      const short  = ac.name.length > 11 ? ac.name.slice(0, 10) + '…' : ac.name;
      ctx.font = '9px monospace';
      const lw = Math.max(ctx.measureText(short).width, ctx.measureText(dmgStr).width) + 10;
      ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(px - lw / 2, py + 13, lw, 25);
      ctx.fillStyle = '#ddd'; ctx.textAlign = 'center'; ctx.fillText(short, px, py + 23);
      ctx.fillStyle = waves.length ? '#ff8060' : '#70c070';
      ctx.font = 'bold 10px monospace'; ctx.fillText(dmgStr, px, py + 34);
      ctx.textAlign = 'left';
    }

    // Status bar
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, CH - 18, CW, 18);
    ctx.fillStyle = 'rgba(150,150,150,0.85)'; ctx.font = '9px monospace'; ctx.textAlign = 'left';
    ctx.fillText(
      mode === 'draw_wall'
        ? 'Click to place second endpoint  ·  Right-click to cancel'
        : 'Click to draw wall  ·  Drag actors & walls  ·  Right-click wall to delete',
      6, CH - 5
    );
  }

  // ── Hit testing ────────────────────────────────────────────────────────────
  const hitActor   = (px, py) => actors.find(a => a.checked && hypot(px - toPx(a.mx), py - toPy(a.my)) < HIT) ?? null;
  const hitWallEP  = (px, py) => { for (const w of walls) { if (hypot(px - toPx(w.x1), py - toPy(w.y1)) < HIT) return { wall: w, end: 1 }; if (hypot(px - toPx(w.x2), py - toPy(w.y2)) < HIT) return { wall: w, end: 2 }; } return null; };
  const hitWallMid = (px, py) => walls.find(w => hypot(px - (toPx(w.x1) + toPx(w.x2)) / 2, py - (toPy(w.y1) + toPy(w.y2)) / 2) < HIT) ?? null;
  const hitWall    = (px, py) => walls.find(w => distPtSeg(px, py, toPx(w.x1), toPy(w.y1), toPx(w.x2), toPy(w.y2)) < 6) ?? null;

  // ── Interaction handlers ───────────────────────────────────────────────────
  function onDown(e, canvas) {
    const r = canvas.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;

    if (e.button === 2) {
      e.preventDefault();
      if (mode === 'draw_wall') { mode = 'idle'; wallStart = null; }
      else { const w = hitWall(px, py); if (w) walls.splice(walls.indexOf(w), 1); }
      draw(canvas); return;
    }

    if (mode === 'draw_wall') {
      if (wallStart) {
        walls.push({ x1: wallStart.mx, y1: wallStart.my, x2: toMx(px), y2: toMy(py) });
        mode = 'idle'; wallStart = null;
      }
      draw(canvas); return;
    }

    const ac = hitActor(px, py);
    if (ac) { mode = 'drag_actor'; drag = { ac }; return; }

    const ep = hitWallEP(px, py);
    if (ep) { mode = 'drag_wall_end'; drag = ep; return; }

    const wm = hitWallMid(px, py);
    if (wm) { mode = 'drag_wall_mid'; drag = { wall: wm, x1s: wm.x1, y1s: wm.y1, x2s: wm.x2, y2s: wm.y2, mxs: toMx(px), mys: toMy(py) }; return; }

    // Start wall
    mode = 'draw_wall'; wallStart = { mx: toMx(px), my: toMy(py) }; prevPx = px; prevPy = py;
    draw(canvas);
  }

  function onMove(e, canvas) {
    const r = canvas.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    const mx = toMx(px), my = toMy(py);
    switch (mode) {
      case 'drag_actor':    drag.ac.mx = mx; drag.ac.my = my; break;
      case 'drag_wall_end': drag.end === 1 ? (drag.wall.x1 = mx, drag.wall.y1 = my) : (drag.wall.x2 = mx, drag.wall.y2 = my); break;
      case 'drag_wall_mid': { const d = drag, dmx = mx - d.mxs, dmy = my - d.mys; d.wall.x1 = d.x1s + dmx; d.wall.y1 = d.y1s + dmy; d.wall.x2 = d.x2s + dmx; d.wall.y2 = d.y2s + dmy; break; }
      case 'draw_wall':     prevPx = px; prevPy = py; break;
    }
    canvas.style.cursor = mode !== 'idle' ? 'crosshair'
      : (hitActor(px, py) || hitWallEP(px, py) || hitWallMid(px, py)) ? 'grab' : 'crosshair';
    if (mode !== 'idle') draw(canvas);
  }

  function onUp(e, canvas) {
    if (mode === 'drag_actor' || mode === 'drag_wall_end' || mode === 'drag_wall_mid') {
      mode = 'idle'; drag = null; draw(canvas);
    }
  }

  // ── Dialog ─────────────────────────────────────────────────────────────────
  let proceed = false, finalPower = 0, finalLevel = 'S', finalTargets = [];

  const SALSA_TITLE = '💥 Chunky Salsa — Confined Space Blast';
  let salsaHookId;
  salsaHookId = Hooks.on('renderDialogV2', (app, html) => {
    if (app.options?.window?.title !== SALSA_TITLE) return;
    Hooks.off('renderDialogV2', salsaHookId);
    const el = html?.querySelector ? html : (html?.[0] ?? null);
    if (!el) return;
    // Canvas stripped by Foundry's sanitizer — inject it programmatically
    const container = el.querySelector('#cs-canvas-container');
    if (!container) return;
    const canvas = document.createElement('canvas');
    canvas.width  = CW;
    canvas.height = CH;
    canvas.style.cssText = 'display:block;cursor:crosshair;border:1px solid var(--sr-border);border-radius:var(--r);';
    container.appendChild(canvas);
    el.querySelector('#cs-power')?.addEventListener('input',  e => { power = Math.max(1, parseInt(e.target.value) || 1); draw(canvas); });
    el.querySelector('#cs-level')?.addEventListener('change', e => { level = e.target.value; draw(canvas); });
    el.querySelectorAll('.cs-actor-toggle').forEach(cb => cb.addEventListener('change', e => {
      const a = actors.find(a => a.id === e.target.dataset.id);
      if (a) { a.checked = e.target.checked; draw(canvas); }
    }));
    canvas.addEventListener('mousedown',   e => { e.preventDefault(); onDown(e, canvas); });
    canvas.addEventListener('mousemove',   e => onMove(e, canvas));
    canvas.addEventListener('mouseup',     e => onUp(e, canvas));
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    draw(canvas);
  });

  await foundry.applications.api.DialogV2.wait({
    window:   { title: SALSA_TITLE },
    position: { width: 478 },
    content: `
      <div style="padding:4px 0">
        <div style="display:flex;gap:14px;align-items:center;margin-bottom:6px;">
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;">Power:
            <input type="number" id="cs-power" value="10" min="1" max="30" style="width:58px;"/>
          </label>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;">Level:
            <select id="cs-level">
              <option value="L">L</option><option value="M">M</option>
              <option value="S" selected>S</option><option value="D">D</option>
            </select>
          </label>
          <span style="font-size:10px;color:var(--sr-muted);line-height:1.3;">Drag actors · click to draw walls<br/>Right-click wall to delete</span>
        </div>
        <div id="cs-canvas-container"></div>
        ${actors.length ? `<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:5px 14px;">
          ${actors.map(a => `<label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer;">
            <input type="checkbox" class="cs-actor-toggle" data-id="${a.id}" checked/>
            <span style="width:9px;height:9px;border-radius:50%;background:${a.color};display:inline-block;flex-shrink:0;"></span>${a.name}
          </label>`).join('')}
        </div>` : ''}
      </div>`,
    buttons: [
      {
        label: 'Post to Chat', action: 'post', default: true,
        callback: () => {
          proceed = true; finalPower = power; finalLevel = level;
          finalTargets = actors.filter(a => a.checked).flatMap(a => {
            const waves = calcBlastM(a.mx, a.my, walls, power);
            if (!waves.length) return [];
            return [{ actorId: a.id, name: a.name, level, power: Math.round(waves.reduce((s, w) => s + w.power, 0)), waves: waves.map(w => ({ ...w, power: Math.round(w.power) })) }];
          });
        }
      },
      { label: 'Cancel', action: 'cancel' },
    ],
  });

  Hooks.off('renderDialogV2', salsaHookId);
  if (!proceed || !finalTargets.length) return opts.returnOnly ? [] : undefined;

  // Return the computed per-target damage codes to the caller (e.g. an AoE attack)
  // instead of posting soak cards.
  if (opts.returnOnly) {
    return finalTargets.map(t => ({ actorId: t.actorId, name: t.name, power: t.power, level: t.level, waves: t.waves }));
  }

  // ── Chat output ────────────────────────────────────────────────────────────
  const targetSections = finalTargets.map(t => {
    const waveDetail = t.waves.length > 1
      ? t.waves.map(w => `<div style="font-size:11px;color:var(--sr-muted);padding-left:8px;">• ${w.label}: ${w.power}${t.level}</div>`).join('')
      : '';
    const breakdown    = t.waves.length > 1 ? ` (${t.waves.map(w => w.power).join('+')}=)` : '';
    const soakPayload  = JSON.stringify({ targetActorId: t.actorId, power: t.power, level: t.level, isStun: false, armorType: 'ballistic', label: 'Confined Blast' });
    return `
      <div style="margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid var(--sr-border);">
        <div style="font-size:12px;font-weight:bold;margin-bottom:2px;">${t.name}</div>
        ${waveDetail}
        <div style="font-size:12px;margin:3px 0;"><strong>→ ${t.power}${t.level}</strong>${breakdown}</div>
        <button class="sr-soak-btn" data-payload='${soakPayload}' style="width:100%;padding:4px 0;margin-top:2px;">💥 Resist Damage (${t.power}${t.level})</button>
      </div>`;
  }).join('');

  await ChatMessage.create({
    speaker: { alias: 'GM' },
    content: `
      <div class="sr-roll-card">
        <div class="sr-roll-header" style="background:#5a1a10;color:#ffcca0;">💥 Chunky Salsa — Confined Blast (${finalPower}${finalLevel} base · ${finalTargets.length} target${finalTargets.length !== 1 ? 's' : ''})</div>
        <div class="sr-roll-body" style="padding:8px">${targetSections}</div>
      </div>`,
    style: CONST.CHAT_MESSAGE_STYLES.OTHER,
  });
}

async function _openBarrierDamageCalculator() {
  const MATERIALS = [
    { name: 'Standard Glass',                br: 2  },
    { name: 'Cheap Material / Regular Tires', br: 3  },
    { name: 'Average Material / Ballistic Glass', br: 4  },
    { name: 'Heavy Material',                br: 6  },
    { name: 'Reinforced / Armored Glass',    br: 8  },
    { name: 'Structural Material',           br: 12 },
    { name: 'Heavy Structural Material',     br: 16 },
    { name: 'Armored / Reinforced Material', br: 24 },
    { name: 'Hardened Material',             br: 32 },
  ];

  const matOpts   = MATERIALS.map((m, i) => `<option value="${i}">${m.name} (BR ${m.br})</option>`).join('');
  const actorOpts = game.actors.filter(a => a.type === 'character' || a.type === 'npc')
    .map(a => `<option value="${a.id}">${a.name}</option>`).join('');

  const TITLE = '🧱 Barrier Damage';
  let hookId;
  hookId = Hooks.on('renderDialogV2', (app, html) => {
    if (app.options?.window?.title !== TITLE) return;
    Hooks.off('renderDialogV2', hookId);
    const el = html?.querySelector ? html : (html?.[0] ?? null);
    if (!el) return;

    function updateEffLabel() {
      const br  = parseInt(el.querySelector('#br-current')?.value) || 0;
      const att = el.querySelector('input[name="br-attack"]:checked')?.value ?? 'blast';
      const eff = att === 'blast' ? br * 2 : br;
      const lbl = el.querySelector('#br-eff-label');
      if (lbl) lbl.textContent = `Effective BR: ${eff}${att === 'blast' ? ` (${br} × 2 for blast)` : ''}`;
    }

    el.querySelector('#br-material')?.addEventListener('change', e => {
      const m = MATERIALS[parseInt(e.target.value)];
      if (m) { el.querySelector('#br-current').value = m.br; updateEffLabel(); }
    });
    el.addEventListener('change', e => {
      if (e.target.name === 'br-attack') {
        const isDemo = e.target.value === 'demo';
        el.querySelector('#br-blast-row').style.display = isDemo ? 'none' : '';
        el.querySelector('#br-demo-rows').style.display = isDemo ? '' : 'none';
      }
      updateEffLabel();
    });
    el.addEventListener('input', updateEffLabel);
    updateEffLabel();
  });

  let res = null;
  await foundry.applications.api.DialogV2.wait({
    window: { title: TITLE },
    content: `
      <div style="padding:4px 0">
        <div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:end;margin-bottom:6px;">
          <label style="font-size:12px;">Material:
            <select id="br-material" style="width:100%;margin-top:2px;">${matOpts}</select>
          </label>
          <label style="font-size:12px;">Current BR:
            <input type="number" id="br-current" value="2" min="0" max="200" style="width:60px;margin-top:2px;"/>
          </label>
        </div>
        <div id="br-eff-label" style="font-size:11px;color:var(--sr-muted);margin-bottom:10px;"></div>
        <div style="margin-bottom:10px;">
          <label style="display:flex;align-items:center;gap:6px;margin-bottom:4px;font-size:12px;">
            <input type="radio" name="br-attack" value="blast" checked/> Blast (grenade / explosive)
          </label>
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;">
            <input type="radio" name="br-attack" value="demo"/> Demolitions (placed charge)
          </label>
        </div>
        <div id="br-blast-row" style="margin-bottom:6px;">
          <label style="font-size:12px;">Blast Power (after distance reduction):
            <input type="number" id="br-blast-power" value="10" min="0" style="width:60px;margin-left:6px;"/>
          </label>
        </div>
        <div id="br-demo-rows" style="display:none;">
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px;">
            <label style="font-size:12px;">Base Power:<br/><input type="number" id="br-demo-power" value="10" min="0" style="width:100%;"/></label>
            <label style="font-size:12px;">Demo Pool:<br/><input type="number" id="br-demo-pool" value="4" min="1" style="width:100%;"/></label>
            <label style="font-size:12px;">TN:<br/><input type="number" id="br-demo-tn" value="2" min="2" max="30" style="width:100%;"/></label>
          </div>
          <label style="font-size:12px;">Attacker (for roll):
            <select id="br-demo-actor" style="width:100%;margin-top:2px;">
              ${actorOpts || '<option value="">No actors in world</option>'}
            </select>
          </label>
        </div>
      </div>`,
    buttons: [
      {
        label: 'Post / Roll', action: 'confirm', default: true,
        callback: (_e, _b, dialog) => {
          const el  = dialog.element;
          const att = el.querySelector('input[name="br-attack"]:checked')?.value ?? 'blast';
          const br  = parseInt(el.querySelector('#br-current')?.value) || 0;
          const mat = MATERIALS[parseInt(el.querySelector('#br-material')?.value) || 0]?.name ?? 'Unknown';
          if (att === 'blast') {
            res = { type: 'blast', power: parseInt(el.querySelector('#br-blast-power')?.value) || 0, br, mat };
          } else {
            res = { type: 'demo', basePower: parseInt(el.querySelector('#br-demo-power')?.value) || 0,
              pool: parseInt(el.querySelector('#br-demo-pool')?.value) || 1,
              tn:   parseInt(el.querySelector('#br-demo-tn')?.value) || 2,
              actorId: el.querySelector('#br-demo-actor')?.value, br, mat };
          }
        }
      },
      { label: 'Cancel', action: 'cancel' },
    ],
  });

  Hooks.off('renderDialogV2', hookId);
  if (!res) return;

  if (res.type === 'blast') {
    const effect = game.sr3e.SR3EActor.computeBarrierEffect(res.power, res.br, 'blast');
    await game.sr3e.SR3EActor._postBarrierDamageCard(effect, res.mat, res.br, res.power);
  } else {
    const actor = game.actors.get(res.actorId);
    if (!actor) { ui.notifications.warn('Select an actor to roll demolitions.'); return; }
    await actor.rollPool(res.pool, res.tn, 'Demolitions Test', {
      barrierContext: { basePower: res.basePower, currentBR: res.br, material: res.mat },
    });
  }
}

async function _openFallingDamageCalculator() {
  const actorOpts = game.actors
    .filter(a => (a.type === 'character' || a.type === 'npc') && game.sr3e.isLiveActor(a))
    .map(a => `<option value="${a.id}">${a.name}</option>`).join('');

  if (!actorOpts) { ui.notifications.warn('No characters or NPCs in the world.'); return; }

  const TITLE = '🪂 Falling Damage';
  let hookId;
  hookId = Hooks.on('renderDialogV2', (app, html) => {
    if (app.options?.window?.title !== TITLE) return;
    Hooks.off('renderDialogV2', hookId);
    const el = html?.querySelector ? html : (html?.[0] ?? null);
    if (!el) return;

    function updatePreview() {
      const actorId  = el.querySelector('#fall-actor')?.value;
      const distance = parseInt(el.querySelector('#fall-distance')?.value) || 0;
      const actor    = actorId ? game.actors.get(actorId) : null;

      let impactArmor = 0, athleticsPool = 0, isDefaulting = false;
      if (actor) {
        actor.prepareDerivedData();
        const armorItem = actor.system.equippedArmor ? actor.items.get(actor.system.equippedArmor) : null;
        impactArmor = armorItem?.system?.impact ?? 0;
        const skill = actor.items.find(i => i.type === 'skill' && i.name.toLowerCase() === 'athletics');
        if (skill) {
          athleticsPool = skill.system.rating;
        } else {
          const body    = actor.system.attributes?.body?.value ?? actor.system.attributes?.body?.base ?? 0;
          athleticsPool = Math.max(1, body);   // defaulting: full attribute
          isDefaulting  = true;
        }
      }

      const power       = Math.floor(distance / 2);
      const armorReduce = Math.floor(impactArmor / 2);
      const netPower    = Math.max(0, power - armorReduce);
      const level       = distance >= 21 ? 'D' : distance >= 7 ? 'S' : distance >= 3 ? 'M' : distance >= 1 ? 'L' : '—';

      el.querySelector('#fp-power').textContent     = distance >= 1 ? power : '—';
      el.querySelector('#fp-armor').textContent     = distance >= 1 ? armorReduce : '—';
      el.querySelector('#fp-net').textContent       = distance >= 1 ? netPower : '—';
      el.querySelector('#fp-level').textContent     = level;
      el.querySelector('#fp-code').textContent      = distance >= 1 ? `${netPower}${level}` : '—';
      el.querySelector('#fp-athletics').textContent = isDefaulting ? `defaulting — choose at roll` : athleticsPool;
      el.querySelector('#fp-tn').textContent        = distance >= 1 ? `${distance}${isDefaulting ? ' + default mod' : ''}` : '—';
    }

    el.querySelector('#fall-actor')?.addEventListener('change', updatePreview);
    el.querySelector('#fall-distance')?.addEventListener('input', updatePreview);
    updatePreview();
  });

  let res = null;
  await foundry.applications.api.DialogV2.wait({
    window: { title: TITLE },
    content: `
      <div style="padding:4px 0">
        <div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:end;margin-bottom:10px;">
          <label style="font-size:12px;">Faller:
            <select id="fall-actor" style="width:100%;margin-top:2px;">${actorOpts}</select>
          </label>
          <label style="font-size:12px;">Distance (m):
            <input type="number" id="fall-distance" value="5" min="1" style="width:60px;margin-top:2px;"/>
          </label>
        </div>
        <div style="background:var(--sr-surface);border:1px solid var(--sr-border);border-radius:var(--r);padding:8px;font-size:12px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
            <div>Power (distance ÷ 2): <strong id="fp-power">—</strong></div>
            <div>Impact armour ÷ 2: <strong id="fp-armor">—</strong></div>
            <div>Net power: <strong id="fp-net">—</strong></div>
            <div>Damage level: <strong id="fp-level">—</strong></div>
          </div>
          <div style="margin-top:6px;border-top:1px solid var(--sr-border);padding-top:6px;">
            Damage code: <strong id="fp-code">—</strong>
            &nbsp;·&nbsp; Athletics pool: <strong id="fp-athletics">—</strong>
            &nbsp;·&nbsp; TN: <strong id="fp-tn">—</strong>
          </div>
        </div>
        <div style="font-size:11px;color:var(--sr-muted);margin-top:6px;">Athletics test TN = distance; each success reduces Power by 1. No Athletics skill defaults to full Body, +4 TN.</div>
      </div>`,
    buttons: [
      {
        label: '🎲 Roll Athletics', action: 'confirm', default: true,
        callback: (_e, _b, dialog) => {
          const el       = dialog.element;
          const actorId  = el.querySelector('#fall-actor')?.value;
          const distance = parseInt(el.querySelector('#fall-distance')?.value) || 0;
          const actor    = game.actors.get(actorId);
          if (!actor || distance < 1) return;

          actor.prepareDerivedData();
          const armorItem   = actor.system.equippedArmor ? actor.items.get(actor.system.equippedArmor) : null;
          const impactArmor = armorItem?.system?.impact ?? 0;
          const netPower    = Math.max(0, Math.floor(distance / 2) - Math.floor(impactArmor / 2));
          const level       = distance >= 21 ? 'D' : distance >= 7 ? 'S' : distance >= 3 ? 'M' : 'L';
          const skill       = actor.items.find(i => i.type === 'skill' && i.name.toLowerCase() === 'athletics');
          let pool, defaulting = false;
          if (skill) {
            pool = skill.system.rating;
          } else {
            const body = actor.system.attributes?.body?.value ?? actor.system.attributes?.body?.base ?? 0;
            pool = Math.max(1, body);   // defaulting: full attribute
            defaulting = true;
          }

          res = { actorId, distance, netPower, level, pool, defaulting };
        }
      },
      { label: 'Cancel', action: 'cancel' },
    ],
  });

  Hooks.off('renderDialogV2', hookId);
  if (!res) return;

  const actor = game.actors.get(res.actorId);
  if (!actor) { ui.notifications.warn('Actor not found.'); return; }

  if (res.netPower <= 0) {
    await ChatMessage.create({
      content: `<div class="sr-roll-card"><div class="sr-roll-header">🪂 Falling — ${actor.name}</div><div class="sr-roll-result" style="color:var(--sr-green)">Armour fully absorbs the impact — no damage taken.</div></div>`,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
    });
    return;
  }

  // SR3 Default Table — if no Athletics skill, let the user choose how to default.
  let fallPool = res.pool;
  let fallTn   = res.distance;
  if (res.defaulting) {
    const def = await game.sr3e.SR3EItem.promptDefaultChoice(actor, {
      linkedAttr: 'body',
      title:      `Defaulting — ${actor.name}`,
      message:    `${actor.name} has no <strong>Athletics</strong> skill — choose how to default:`,
    });
    if (!def) return;
    fallPool = def.pool;
    fallTn  += def.tnMod;
  }

  await actor.rollPool(fallPool, fallTn, `🪂 ${actor.name}: Athletics (Falling)`, {
    fallingContext: { distance: res.distance, netPower: res.netPower, level: res.level, actorId: res.actorId },
  });
}

async function _openEscapeArtistCalculator() {
  const RESTRAINTS = [
    { name: 'Ropes',                tn: 4  },
    { name: 'Handcuffs',            tn: 6  },
    { name: 'Straitjacket',         tn: 8  },
    { name: 'Containment Manacles', tn: 10 },
  ];

  const actorOpts = game.actors
    .filter(a => (a.type === 'character' || a.type === 'npc') && game.sr3e.isLiveActor(a))
    .map(a => `<option value="${a.id}">${a.name}</option>`).join('');

  if (!actorOpts) { ui.notifications.warn('No characters or NPCs in the world.'); return; }

  const TITLE = '🔓 Escape Artist';
  let hookId;
  hookId = Hooks.on('renderDialogV2', (app, html) => {
    if (app.options?.window?.title !== TITLE) return;
    Hooks.off('renderDialogV2', hookId);
    const el = html?.querySelector ? html : (html?.[0] ?? null);
    if (!el) return;

    function updatePreview() {
      const actorId = el.querySelector('#ea-actor')?.value;
      const rIdx    = parseInt(el.querySelector('#ea-restraint')?.value) || 0;
      const tnMod   = parseInt(el.querySelector('#ea-tn-mod')?.value) || 0;
      const actor   = actorId ? game.actors.get(actorId) : null;
      const r       = RESTRAINTS[rIdx];

      let pool = 0, hasSpec = false, isDefaulting = false;
      if (actor) {
        actor.prepareDerivedData();
        const skill = actor.items.find(i => i.type === 'skill' && i.name.toLowerCase() === 'athletics');
        if (skill) {
          hasSpec = !!(skill.system.specialisation?.toLowerCase().includes('escape'));
          pool    = skill.system.rating + (hasSpec ? 2 : 0);
        } else {
          const body = actor.system.attributes?.body?.value ?? actor.system.attributes?.body?.base ?? 0;
          pool        = Math.max(1, body);   // defaulting: full attribute
          isDefaulting = true;
        }
      }

      const effectiveTN = Math.max(2, (r?.tn ?? 4) - tnMod);   // defaulting mod chosen at roll
      const baseTime    = 5 * (r?.tn ?? 4);

      let poolLabel;
      if (isDefaulting)    poolLabel = `defaulting — choose at roll`;
      else if (hasSpec)    poolLabel = `${pool} (Athletics +2 spec)`;
      else                 poolLabel = pool;

      el.querySelector('#ea-preview-pool').textContent = poolLabel;
      el.querySelector('#ea-preview-tn').textContent   = `${effectiveTN}${isDefaulting ? ' + default mod' : ''}`;
      el.querySelector('#ea-preview-time').textContent = `${baseTime} min`;
    }

    el.querySelector('#ea-actor')?.addEventListener('change', updatePreview);
    el.querySelector('#ea-restraint')?.addEventListener('change', updatePreview);
    el.querySelector('#ea-tn-mod')?.addEventListener('input', updatePreview);
    updatePreview();
  });

  const restraintOpts = RESTRAINTS.map((r, i) => `<option value="${i}">${r.name} (TN ${r.tn})</option>`).join('');

  let res = null;
  await foundry.applications.api.DialogV2.wait({
    window: { title: TITLE },
    content: `
      <div style="padding:4px 0">
        <div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:end;margin-bottom:10px;">
          <label style="font-size:12px;">Escapee:
            <select id="ea-actor" style="width:100%;margin-top:2px;">${actorOpts}</select>
          </label>
          <label style="font-size:12px;">TN modifier:
            <input type="number" id="ea-tn-mod" value="0" min="-10" max="10" style="width:60px;margin-top:2px;" title="Positive = easier (e.g. Pain Resistance); negative = harder"/>
          </label>
        </div>
        <label style="font-size:12px;display:block;margin-bottom:10px;">Restraint:
          <select id="ea-restraint" style="width:100%;margin-top:2px;">${restraintOpts}</select>
        </label>
        <div style="background:var(--sr-surface);border:1px solid var(--sr-border);border-radius:var(--r);padding:8px;font-size:12px;">
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;">
            <div>Pool: <strong id="ea-preview-pool">—</strong></div>
            <div>TN: <strong id="ea-preview-tn">—</strong></div>
            <div>Base time: <strong id="ea-preview-time">—</strong></div>
          </div>
        </div>
        <div style="font-size:11px;color:var(--sr-muted);margin-top:6px;">TN modifier: positive for Pain Resistance or other bonuses. No Athletics defaults to full Body, +4 TN. Spec bonus (+2) auto-detected.</div>
      </div>`,
    buttons: [
      {
        label: '🎲 Roll', action: 'confirm', default: true,
        callback: (_e, _b, dialog) => {
          const el      = dialog.element;
          const actorId = el.querySelector('#ea-actor')?.value;
          const rIdx    = parseInt(el.querySelector('#ea-restraint')?.value) || 0;
          const tnMod   = parseInt(el.querySelector('#ea-tn-mod')?.value) || 0;
          const actor   = game.actors.get(actorId);
          if (!actor) return;

          const r           = RESTRAINTS[rIdx];

          actor.prepareDerivedData();
          const skill = actor.items.find(i => i.type === 'skill' && i.name.toLowerCase() === 'athletics');
          let pool, defaulting = false;
          if (skill) {
            const hasSpec = !!(skill.system.specialisation?.toLowerCase().includes('escape'));
            pool = skill.system.rating + (hasSpec ? 2 : 0);
          } else {
            const body = actor.system.attributes?.body?.value ?? actor.system.attributes?.body?.base ?? 0;
            pool = Math.max(1, body);   // defaulting: full attribute
            defaulting = true;
          }

          const effectiveTN = Math.max(2, r.tn - tnMod);   // +4 for defaulting applied by rollPool
          const baseTime    = 5 * r.tn;

          res = { actorId, restraintName: r.name, effectiveTN, baseTime, pool, defaulting };
        }
      },
      { label: 'Cancel', action: 'cancel' },
    ],
  });

  Hooks.off('renderDialogV2', hookId);
  if (!res) return;

  const actor = game.actors.get(res.actorId);
  if (!actor) { ui.notifications.warn('Actor not found.'); return; }

  // SR3 Default Table — if no Athletics skill, let the user choose how to default.
  let eaPool = res.pool;
  let eaTn   = res.effectiveTN;
  if (res.defaulting) {
    const def = await game.sr3e.SR3EItem.promptDefaultChoice(actor, {
      linkedAttr: 'body',
      title:      `Defaulting — ${actor.name}`,
      message:    `${actor.name} has no <strong>Athletics</strong> skill — choose how to default:`,
    });
    if (!def) return;
    eaPool = def.pool;
    eaTn   = Math.max(2, res.effectiveTN + def.tnMod);
  }

  await actor.rollPool(eaPool, eaTn, `🔓 ${actor.name}: Escape Artist (${res.restraintName})`, {
    escapeContext: { restraintName: res.restraintName, baseTime: res.baseTime, actorId: res.actorId },
  });
}

// Vehicle Chase button + drone/VCR labels in the combat tracker sidebar
Hooks.on('renderCombatTracker', (_app, html) => {
  const el  = html instanceof HTMLElement ? html : html[0];

  // Label drone and jumped-in combatants
  const combat = game.combat;
  if (combat) {
    el.querySelectorAll('[data-combatant-id]').forEach(row => {
      const cid  = row.dataset.combatantId;
      const cbt  = combat.combatants.get(cid);
      if (!cbt?.actor) return;

      // Vehicle in combat: show RCD / VCR mode tag
      if (cbt.actor.type === 'vehicle') {
        const controlMode  = cbt.actor.system.controlMode ?? '';
        const driverActId  = cbt.actor.system.driverActorId?.trim() ?? '';
        const pilotActor   = driverActId ? game.actors.get(driverActId) : null;
        const pilotName    = pilotActor?.name ?? '';
        const tag = document.createElement('span');
        tag.style.cssText = 'font-size:10px;font-weight:bold;padding:1px 5px;border-radius:3px;margin-left:4px;';
        if (!driverActId) {
          tag.textContent  = 'Auto';
          tag.style.background = '#2a2010';
          tag.style.color      = '#c8a040';
        } else if (controlMode === 'vcr') {
          tag.textContent  = `VCR: ${pilotName}`;
          tag.style.background = '#1a3a5c';
          tag.style.color      = '#5ab4f5';
        } else {
          tag.textContent  = 'RCD';
          tag.style.background = '#1c2a1c';
          tag.style.color      = '#7db87d';
        }
        const nameEl = row.querySelector('.combatant-name, .token-name, h4');
        if (nameEl) nameEl.appendChild(tag);
      }

      // Jacked-in decker: show VR mode badge
      const matrixMode = cbt.actor.system?.matrixUserMode ?? '';
      if (matrixMode === 'VR-Cold' || matrixMode === 'VR-Hot') {
        const tag = document.createElement('span');
        tag.style.cssText = 'font-size:10px;font-weight:bold;padding:1px 5px;border-radius:3px;margin-left:4px;';
        tag.textContent   = matrixMode === 'VR-Hot' ? 'VR-Hot 🔥' : 'VR-Cold';
        tag.style.background = matrixMode === 'VR-Hot' ? '#3a1a1a' : '#1a2a3a';
        tag.style.color      = matrixMode === 'VR-Hot' ? '#f57070' : '#70b8f5';
        const nameEl = row.querySelector('.combatant-name, .token-name, h4');
        if (nameEl) nameEl.appendChild(tag);
      }

      // Astral state badge
      const astralMode = cbt.actor.system?.astralMode ?? '';
      if (astralMode) {
        const tag = document.createElement('span');
        tag.style.cssText = 'font-size:10px;font-weight:bold;padding:1px 5px;border-radius:3px;margin-left:4px;';
        if (astralMode === 'astral') {
          tag.textContent      = 'Astral';
          tag.style.background = '#2a1a3a';
          tag.style.color      = '#c070f5';
        } else if (astralMode === 'dual') {
          tag.textContent      = 'Dual Nat.';
          tag.style.background = '#2a2200';
          tag.style.color      = '#c8a040';
        } else if (astralMode === 'physical') {
          tag.textContent      = 'Physical';
          tag.style.background = '#1a1a1a';
          tag.style.color      = '#888';
        }
        const nameEl = row.querySelector('.combatant-name, .token-name, h4');
        if (nameEl) nameEl.appendChild(tag);
      }

      // Full Defense badge
      if (cbt.actor.system?.fullDefense) {
        const fdPool = cbt.actor.system.fullDefensePool ?? 0;
        const tag = document.createElement('span');
        tag.style.cssText = 'font-size:10px;font-weight:bold;padding:1px 5px;border-radius:3px;margin-left:4px;background:var(--sr-accent,#3a7abf);color:#fff;';
        tag.textContent = `Full Def${fdPool > 0 ? ` (${fdPool})` : ''}`;
        const nameEl = row.querySelector('.combatant-name, .token-name, h4');
        if (nameEl) nameEl.appendChild(tag);
      }

      // VCR rigger: reminder badge — vehicle bonus and non-vehicle penalty
      const jumpedInto = cbt.flags?.The2ndChumming3e?.jumpedInto;
      if (jumpedInto) {
        const vcrRating = cbt.actor?.system?.derived?.vcrRating ?? 0;
        const tnBonus   = vcrRating * 2;
        const tag = document.createElement('span');
        tag.style.cssText = 'font-size:10px;color:var(--sr-accent);margin-left:6px;';
        const bonusPart = tnBonus ? ` veh TN−${tnBonus}` : '';
        tag.textContent = `VCR: ${jumpedInto} |${bonusPart} non-veh TN+8`;
        const nameEl = row.querySelector('.combatant-name, .token-name, h4');
        if (nameEl) nameEl.appendChild(tag);
      }

      // Initiative display badge — SR3: "P2 | 12" / SR2: "@23"
      const initMode = game.settings.get?.('The2ndChumming3e', 'initiativeMode') ?? 'sr3';
      if (initMode === 'sr3') {
        const flags   = cbt.flags?.The2ndChumming3e ?? {};
        const passNum = flags.passNumber ?? 1;
        const curInit = flags.currentInitiative ?? (cbt.initiative ?? 0);
        if (cbt.initiative != null) {
          const passTag = document.createElement('span');
          if (curInit > 0) {
            passTag.style.cssText = 'font-size:10px;font-weight:bold;padding:1px 5px;border-radius:3px;margin-left:4px;background:#0a1a10;color:#7db87d;font-family:monospace;letter-spacing:0.03em;';
            passTag.textContent = `P${passNum} | ${curInit}`;
          } else {
            passTag.style.cssText = 'font-size:10px;font-weight:bold;padding:1px 5px;border-radius:3px;margin-left:4px;background:#1a1a1a;color:#555;font-family:monospace;';
            passTag.textContent = 'Done';
          }
          const nameEl = row.querySelector('.combatant-name, .token-name, h4');
          if (nameEl) nameEl.appendChild(passTag);
        }
      } else if (initMode === 'sr2' && combat) {
        const queue = combat.flags?.The2ndChumming3e?.sr2Queue ?? [];
        const qIdx  = combat.flags?.The2ndChumming3e?.sr2QueueIndex ?? 0;
        // Active slot is queue[qIdx - 1] (just activated). Next for each combatant from qIdx onward.
        const activeSlot = qIdx > 0 ? queue[qIdx - 1] : null;
        const isActive   = activeSlot?.id === cid;
        const slotScore  = isActive
          ? activeSlot.score
          : (queue.slice(qIdx).find(s => s.id === cid)?.score ?? null);
        if (slotScore != null) {
          const slotTag = document.createElement('span');
          slotTag.style.cssText = `font-size:10px;font-weight:bold;padding:1px 5px;border-radius:3px;margin-left:4px;background:#0a1a10;color:${isActive ? '#7db87d' : '#3d6640'};font-family:monospace;`;
          slotTag.textContent = `@${slotScore}`;
          const nameEl = row.querySelector('.combatant-name, .token-name, h4');
          if (nameEl) nameEl.appendChild(slotTag);
        }
      }

      // Pool tooltip — hover over any combatant row to see available pools
      if (cbt.actor) {
        const d     = cbt.actor.system?.derived ?? {};
        const parts = [];
        const cpAvail = d.availableCombatPool ?? d.combatPool ?? 0;
        const cpTotal = d.combatPool ?? 0;
        parts.push(`Combat Pool: ${cpAvail}/${cpTotal}`);
        if ((d.magicPool ?? 0) > 0) {
          const mpAvail = d.availableMagicPool ?? 0;
          parts.push(`Magic Pool: ${mpAvail}/${d.magicPool}`);
        }
        const hackMode = cbt.actor.system?.matrixUserMode ?? '';
        if (hackMode === 'VR-Hot' || hackMode === 'VR-Cold') {
          const hpAvail = d.availableHackingPool ?? 0;
          const hpTotal = d.hackingPool ?? 0;
          parts.push(`Hacking Pool: ${hpAvail}/${hpTotal}`);
        }
        row.title = parts.join('  |  ');
      }
    });
  }

  // Replace d20 icon with bolt to match actor sheet style.
  // Before the encounter begins, initiative is established only via "Begin Encounter" —
  // disable the per-combatant roll icons so nobody (esp. players) rolls ad-hoc beforehand.
  const combatStarted = !!combat?.started;
  el.querySelectorAll('[data-action="rollInitiative"]').forEach(btn => {
    const icon = btn.querySelector('i');
    if (icon) icon.className = 'fas fa-bolt';
    if (!combatStarted) {
      btn.style.opacity       = '0.3';
      btn.style.pointerEvents = 'none';
      btn.title               = 'Initiative is rolled when you Begin Encounter';
    } else {
      btn.style.opacity       = '';
      btn.style.pointerEvents = '';
      btn.title               = 'Roll Initiative (Shift: physical dice)';
    }
  });

  // Shift-click initiative buttons → physical dice mode
  el.querySelectorAll('[data-action="rollInitiative"]').forEach(btn => {
    btn.addEventListener('click', async event => {
      if (!event.shiftKey) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!game.combat?.started) return; // initiative is rolled via Begin Encounter

      const row = btn.closest('[data-combatant-id]');
      if (!row) return;
      const cbt = game.combat?.combatants.get(row.dataset.combatantId);
      if (!cbt?.actor) return;

      await cbt.actor.clearSpellDefense?.();
      const score = await cbt.actor.rollInitiative({ physicalDice: true });
      if (score === null || score === undefined) return;

      await cbt.update({
        initiative: score,
        flags: {
          The2ndChumming3e: {
            baseInitiative:    score,
            currentInitiative: score,
            passesRemaining:   Math.ceil(score / 10),
          }
        }
      });
      // Re-order the round against the new score, holding position (the updateCombatant
      // hook above covers GM edits; this covers the shift-click physical-dice entry).
      await game.combat?.rebuildQueue?.();
      if (ui.combat) ui.combat.render();
    }, true); // capture phase so we intercept before Foundry's bubble handler
  });

  // Intercept "Begin Encounter" → show multi-actor initiative selector
  const startBtn = el.querySelector('[data-action="startCombat"]');
  if (startBtn && combat) {
    startBtn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopImmediatePropagation();

      let combatants = combat.combatants.contents;

      // No combatants yet — let the GM pick tokens from the scene first
      if (!combatants.length) {
        const sceneTokens = (canvas.tokens?.placeables ?? []).filter(t => t.actor);

        if (!sceneTokens.length) {
          ui.notifications.warn('No actors selected for combat.');
          return;
        }

        const addRows = sceneTokens.map(t => `
          <label style="display:flex;align-items:center;gap:8px;margin:4px 0;cursor:pointer;">
            <input type="checkbox" data-token-id="${t.id}" data-actor-id="${t.actorId ?? ''}"/>
            <span>${t.name}</span>
          </label>
        `).join('');

        let toAdd = [];
        let addProceed = false;
        await foundry.applications.api.DialogV2.wait({
          window: { title: 'Add Actors to Encounter' },
          content: `
            <p style="margin:0 0 8px;color:var(--sr-muted);font-size:11px;">
              No actors are in the encounter. Select tokens to add.
            </p>
            <div>${addRows}</div>
          `,
          buttons: [
            {
              label: 'Add & Continue',
              action: 'add',
              default: true,
              callback: (_e, _b, dialog) => {
                addProceed = true;
                toAdd = [...dialog.element.querySelectorAll('[data-token-id]:checked')]
                  .map(cb => ({ tokenId: cb.dataset.tokenId, actorId: cb.dataset.actorId || undefined, sceneId: canvas.scene?.id }));
              }
            },
            { label: 'Cancel', action: 'cancel' },
          ],
        });

        if (!addProceed) return;
        if (!toAdd.length) {
          ui.notifications.warn('No actors selected for combat.');
          return;
        }

        await combat.createEmbeddedDocuments('Combatant', toAdd);
        combatants = combat.combatants.contents;
      }

      const rows = combatants.map(c => `
        <label style="display:flex;align-items:center;gap:8px;margin:4px 0;cursor:pointer;">
          <input type="checkbox" data-cbt-id="${c.id}" checked/>
          <span>${c.actor?.name ?? c.name}</span>
        </label>
      `).join('');

      let selectedIds = [];
      let proceed = false;
      await foundry.applications.api.DialogV2.wait({
        window: { title: 'Roll Initiative & Begin Encounter' },
        content: `
          <p style="margin:0 0 8px;color:var(--sr-muted);font-size:11px;">
            Select combatants to roll initiative for before starting the encounter.
          </p>
          <div>${rows}</div>
        `,
        buttons: [
          {
            label: 'Auto-roll Initiative',
            action: 'roll',
            default: true,
            callback: (_e, _b, dialog) => {
              proceed = true;
              selectedIds = [...dialog.element.querySelectorAll('[data-cbt-id]:checked')]
                .map(cb => cb.dataset.cbtId);
              if (!selectedIds.length) {
                const random = combatants[Math.floor(Math.random() * combatants.length)];
                selectedIds = [random.id];
              }
            }
          },
          {
            label: 'Roll Initiative',
            action: 'skip',
            callback: () => { proceed = true; }
          },
          { label: 'Cancel', action: 'cancel' },
        ],
      });

      if (!proceed) return;
      // Pools refresh BEFORE initiative is rolled — RAW p.104 orders the Combat Turn
      // Sequence that way, and _newRound() already follows it for rounds 2+.
      //
      // It matters here for a concrete reason: rollInitiative() ends by posting the Spell
      // Defense declaration card, and that card caps its Spell Pool input at
      // availableSpellPool as computed WHEN THE CARD IS BUILT. Refreshing afterwards would
      // leave a mage who arrived with a depleted pool looking at a stale, too-low cap and
      // unable to declare dice they actually have.
      await combat._endOfTurnReset();
      if (selectedIds.length) await combat.rollInitiative(selectedIds);
      await combat.startCombat();
    }, true); // capture phase — intercepts before Foundry's bubble handler
  }

  // Action Tracker — GM-only, on the active combatant's card.
  // Complex (full width) advances the turn; clicking the first Simple toggles Complex off
  // (one simple action used); the second Simple advances the turn.
  if (game.user.isGM && combat?.started && combat.combatant) {
    const activeId = combat.combatant.id;
    const row = el.querySelector(`[data-combatant-id="${activeId}"]`);
    if (row && !row.querySelector('.sr3e-action-tracker')) {
      const btnStyle = 'box-sizing:border-box;padding:2px 4px;font-size:11px;cursor:pointer;border:1px solid var(--sr-border,#444);border-radius:3px;background:var(--sr-surface,#1a1a1a);color:var(--sr-text,#ddd);';

      // Combat rows are usually flex; let the tracker wrap to a full-width line below the row content.
      row.style.flexWrap = 'wrap';
      const wrap = document.createElement('div');
      wrap.className = 'sr3e-action-tracker';
      wrap.style.cssText = 'flex-basis:100%;margin:6px 6px 2px;display:flex;flex-direction:column;gap:3px;';

      const label = document.createElement('div');
      label.textContent = 'Action Tracker';
      label.style.cssText = 'font-size:9px;text-transform:uppercase;letter-spacing:0.5px;color:var(--sr-muted,#999);text-align:center;';

      const complexBtn = document.createElement('button');
      complexBtn.type = 'button';
      complexBtn.className = 'sr3e-act-complex';
      complexBtn.textContent = 'Complex';
      complexBtn.style.cssText = btnStyle + 'width:100%;';

      const simpleRow = document.createElement('div');
      simpleRow.style.cssText = 'display:flex;gap:3px;';
      const simple1 = document.createElement('button');
      simple1.type = 'button'; simple1.className = 'sr3e-act-simple1';
      simple1.textContent = 'Simple'; simple1.style.cssText = btnStyle + 'flex:1;';
      const simple2 = document.createElement('button');
      simple2.type = 'button'; simple2.className = 'sr3e-act-simple2';
      simple2.textContent = 'Simple'; simple2.style.cssText = btnStyle + 'flex:1;';
      simpleRow.append(simple1, simple2);

      const applyState = () => {
        const used = (_actionTracker.get(activeId) ?? {}).firstSimpleUsed;
        complexBtn.style.opacity = used ? '0.35' : '1';
        complexBtn.style.cursor  = used ? 'not-allowed' : 'pointer';
        simple1.style.background = used ? 'var(--sr-accent,#3a6ea5)' : 'var(--sr-surface,#1a1a1a)';
        simple1.style.color      = used ? '#fff' : 'var(--sr-text,#ddd)';
      };

      complexBtn.addEventListener('click', async () => {
        if ((_actionTracker.get(activeId) ?? {}).firstSimpleUsed) return; // greyed out
        _actionTracker.delete(activeId);
        await combat.nextTurn();
      });
      simple1.addEventListener('click', () => {
        const s = _actionTracker.get(activeId) ?? { firstSimpleUsed: false };
        s.firstSimpleUsed = !s.firstSimpleUsed;
        _actionTracker.set(activeId, s);
        applyState();
      });
      simple2.addEventListener('click', async () => {
        _actionTracker.delete(activeId);
        await combat.nextTurn();
      });

      applyState();
      wrap.append(label, complexBtn, simpleRow);
      row.appendChild(wrap);
    }
  }

  // GM tool buttons (Chase Scene, Session Rewards, Chunky Salsa, Barrier/Falling Damage,
  // Escape Artist) live on the Rollable Tables sidebar tab — see renderRollTableDirectory below.
});

// A GM editing an initiative value in the tracker (or via Update Combatant) must re-order
// the round, not just change the number shown. The action queue is built from the
// `initiative` field, so rebuild it — holding position, so an edit mid-round does not
// restart the round. GM client only, since it writes.
Hooks.on('updateCombatant', (combatant, changed) => {
  if (!('initiative' in changed)) return;
  if (!game.users?.activeGM?.isSelf) return;
  const combat = combatant.parent;
  if (!combat?.started || typeof combat.rebuildQueue !== 'function') return;
  combat.rebuildQueue().then(() => ui.combat?.render());
});

// Action Tracker state resets whenever the combat turn or round changes (covers both the
// tracker's own buttons and the default next-turn arrow).
Hooks.on('updateCombat', (_combat, changed) => {
  if ('turn' in changed || 'round' in changed) _actionTracker.clear();
  // Per-combat-round upkeep (GM client only): count down infiltrations; refresh IVIS Pools.
  if ('round' in changed && game.users?.activeGM?.isSelf) {
    for (const a of game.actors) {
      if (a.type === 'vehicle') {
        const left = a.system?.infiltration?.turnsRemaining ?? 0;
        if (left > 0) a.update({ 'system.infiltration.turnsRemaining': left - 1 });
      } else if (a.type === 'character' || a.type === 'npc') {
        const ip = a.system?.ew?.ivisPool;
        if (ip && (ip.max ?? 0) > 0 && (ip.value ?? 0) < ip.max) {
          a.update({ 'system.ew.ivisPool.value': ip.max });
        }
      }
    }
  }
});


// SR3E GM tools — injected into the Rollable Tables sidebar tab.
// Chase Scene is available to all players; the rest are GM-only.
Hooks.on('renderRollTableDirectory', (_app, html) => {
  const el = html instanceof HTMLElement ? html : html?.[0];
  if (!el || el.querySelector('.sr3e-table-tools')) return;

  const tools = document.createElement('div');
  tools.className = 'sr3e-table-tools';
  tools.style.cssText = 'display:flex;flex-direction:column;gap:4px;padding:6px 8px;border-top:1px solid var(--sr-border,#333);';

  const mk = (cls, label, handler, gmOnly) => {
    if (gmOnly && !game.user.isGM) return;
    const b = document.createElement('button');
    b.type        = 'button';
    b.className    = cls;
    b.textContent = label;
    b.style.cssText = 'display:block;box-sizing:border-box;width:100%;margin:0;';
    b.addEventListener('click', handler);
    tools.appendChild(b);
  };

  mk('sr3e-chase-btn',   '🚗 Chase Scene',     () => game.sr3e.SR3EVehicleChase.open(), false);
  mk('sr3e-driving-btn', '🏎 Driving Test',    () => SR3EVehicleSheet.promptVehicleDrivingTest(), false);
  mk('sr3e-clocks-btn',  '🕐 Threat Clocks',   () => game.sr3e.SR3EClocks.open(), false);
  mk('sr3e-reward-btn',  '🎖 Session Rewards', _openSessionRewardDialog,     true);
  mk('sr3e-salsa-btn',   '💥 Chunky Salsa',    _openChunkySalsaCalculator,   true);
  mk('sr3e-barrier-btn', '🧱 Barrier Damage',  _openBarrierDamageCalculator, true);
  mk('sr3e-falling-btn', '🪂 Falling Damage',  _openFallingDamageCalculator, true);
  mk('sr3e-escape-btn',  '🔓 Escape Artist',   _openEscapeArtistCalculator,  true);

  if (!tools.childElementCount) return; // non-GM with nothing to show

  // Pin below the directory header so the tools stay visible above the (scrolling) table list.
  const header = el.querySelector('.directory-header');
  if (header) header.insertAdjacentElement('afterend', tools);
  else el.prepend(tools);
});


// ── Canvas weapon access ──────────────────────────────────────────────────────
// "Ready" weapons for quick canvas attacks: firearms with ammo loaded (when tracking),
// the equipped melee weapon, ready thrown weapons, and bows.
function _sr3eReadyWeapons(actor) {
  const trackAmmo = game.settings.get('The2ndChumming3e', 'trackAmmo');
  const thrownCats = game.sr3e.SR3E.thrownCategories ?? [];
  const awakened   = (actor.system.attributes?.magic?.value ?? actor.system.attributes?.magic?.base ?? 0) > 0;
  const out = [];
  for (const i of actor.items) {
    if (i.type === 'firearm') {
      if (!trackAmmo || (i.system.loadedRounds ?? 0) > 0) out.push(i);
    } else if (i.type === 'melee') {
      if (actor.system.equippedMelee === i.id) out.push(i);
    } else if (i.type === 'thrown' || i.type === 'projectile') {
      const consumable = i.type === 'thrown' || thrownCats.includes(i.system.category ?? '');
      if (i.type === 'projectile' && i._usesNockedAmmo?.()) {        // bow / crossbow (nocked)
        if (!trackAmmo || (i.system.loadedRounds ?? 0) > 0) out.push(i);
      } else if (!consumable) {
        out.push(i);                                                 // sling / non-depleting bow
      } else if (!trackAmmo || (i.system.quantity ?? 0) > 0) {
        out.push(i);                                                 // thrown w/ quantity
      }
    } else if (i.type === 'spell') {
      // Combat / damaging spells (those with a damage code), Awakened actors only.
      if (awakened && (i.system.damage ?? '').trim() !== '') out.push(i);
    }
  }
  // Built-in unarmed attack — always available (not a real item).
  const unarmed = game.sr3e.SR3EItem._unarmedWeapon();
  unarmed._actor = actor;
  out.push(unarmed);
  return out;
}

function _sr3eFireWeapon(item) {
  if (item._unarmed) return game.sr3e.SR3EItem.rollMeleeAttack(item._actor, item);
  if (item.type === 'spell') return item.rollSpell();
  return item.type === 'melee' ? item.rollMelee() : item.rollWeapon();
}

// Open the ready-weapon picker for an actor and fire the chosen weapon.
async function _sr3eQuickAttack(actor) {
  const weapons = _sr3eReadyWeapons(actor);
  if (!weapons.length) { ui.notifications.warn(`${actor.name} has no ready weapons (load/equip one).`); return; }
  if (weapons.length === 1) return _sr3eFireWeapon(weapons[0]);

  const opts = weapons.map(w => `<option value="${w.id}">${w.name} (${w.system.damage || '—'})</option>`).join('');
  let chosen = null;
  await foundry.applications.api.DialogV2.wait({
    window: { title: `${actor.name} — Attack` },
    content: `<div style="padding:6px 0"><label style="font-size:12px;color:var(--sr-muted)">Weapon
      <select id="qa-weapon" style="width:100%;margin-top:4px">${opts}</select></label></div>`,
    buttons: [
      { label: 'Attack', action: 'fire', default: true, callback: (_e, _b, d) => { chosen = d.element.querySelector('#qa-weapon')?.value; } },
      { label: 'Cancel', action: 'cancel' },
    ],
  });
  if (!chosen) return;
  const item = weapons.find(w => w.id === chosen);
  if (item) _sr3eFireWeapon(item);
}

// Token HUD: add an Attack button on owned character/npc tokens.
Hooks.on('renderTokenHUD', (hud, html) => {
  const actor = hud.object?.actor;
  if (!actor || !actor.isOwner) return;
  if (!['character', 'npc'].includes(actor.type)) return;
  const el = html instanceof HTMLElement ? html : html?.[0];
  if (!el || el.querySelector('.sr3e-attack-hud')) return;

  const btn = document.createElement('div');
  btn.className = 'control-icon sr3e-attack-hud';
  btn.innerHTML = '<i class="fas fa-crosshairs"></i>';
  btn.dataset.tooltip = 'Attack with a weapon';
  btn.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); _sr3eQuickAttack(actor); });

  const col = el.querySelector('.col.left') ?? el.querySelector('.col.right') ?? el;
  col.appendChild(btn);

  // Riggers (have Small Unit Tactics / Vehicle Tactics) get an IVIS Test button.
  const hasSUT = actor.items.some(i => i.type === 'skill'
    && /small unit tactics|vehicle tactics/i.test(i.system.skillName || i.name || ''));
  if (hasSUT && !el.querySelector('.sr3e-ivis-hud')) {
    const ivis = document.createElement('div');
    ivis.className = 'control-icon sr3e-ivis-hud';
    ivis.innerHTML = '<i class="fas fa-tower-broadcast"></i>';
    ivis.dataset.tooltip = 'IVIS Test (BattleTac)';
    ivis.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); game.sr3e.SR3EMIJI.openIVIS(actor); });
    col.appendChild(ivis);
  }
});

// Vehicle tools available from the token HUD (and reusable elsewhere). Add new entries here —
// the HUD button nests them in a single picker so it never sprawls.
const _sr3eVehicleTools = [
  { label: '🚗 Driving Test',        run: (a) => SR3EVehicleSheet.runDrivingTest(a) },
  { label: '📡 Drone Comprehension', run: (a) => SR3EVehicleSheet.runDroneComprehension(a) },
];

async function _sr3eVehicleToolMenu(actor) {
  const opts = _sr3eVehicleTools.map((t, i) => `<option value="${i}">${t.label}</option>`).join('');
  let chosen = null;
  await foundry.applications.api.DialogV2.wait({
    window: { title: `${actor.name} — Vehicle Tools` },
    content: `<div style="padding:6px 0"><label style="font-size:12px;color:var(--sr-muted)">Tool
      <select id="vt-tool" style="width:100%;margin-top:4px">${opts}</select></label></div>`,
    buttons: [
      { label: 'Open', action: 'go', default: true, callback: (_e, _b, d) => { chosen = d.element.querySelector('#vt-tool')?.value; } },
      { label: 'Cancel', action: 'cancel' },
    ],
  });
  if (chosen === null) return;
  return _sr3eVehicleTools[parseInt(chosen)]?.run(actor);
}

// Token HUD — vehicle/drone tokens get a nested Vehicle Tools button.
Hooks.on('renderTokenHUD', (hud, html) => {
  const actor = hud.object?.actor;
  if (!actor || !actor.isOwner || actor.type !== 'vehicle') return;
  const el = html instanceof HTMLElement ? html : html?.[0];
  if (!el || el.querySelector('.sr3e-vehicle-hud')) return;

  const btn = document.createElement('div');
  btn.className = 'control-icon sr3e-vehicle-hud';
  btn.innerHTML = '<i class="fas fa-satellite-dish"></i>';
  btn.dataset.tooltip = 'Vehicle Tools (Driving Test, Drone Comprehension…)';
  btn.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); _sr3eVehicleToolMenu(actor); });

  const col = el.querySelector('.col.left') ?? el.querySelector('.col.right') ?? el;
  col.appendChild(btn);
});

// Hotbar: dropping a weapon item creates a one-click "fire this weapon" macro.
Hooks.on('hotbarDrop', (_hotbar, data, slot) => {
  if (data?.type !== 'Item' || !data.uuid) return;
  (async () => {
    const item = await fromUuid(data.uuid);
    if (!item || !['firearm', 'melee', 'projectile', 'thrown'].includes(item.type)) return;
    const command =
      `const it = await fromUuid("${data.uuid}");\n` +
      `if (!it) return ui.notifications.warn("SR3E: weapon not found.");\n` +
      `if (it.type === "melee") it.rollMelee(); else it.rollWeapon();`;
    let macro = game.macros.find(m => m.name === `Fire: ${item.name}` && m.command === command);
    if (!macro) {
      macro = await Macro.create({
        name: `Fire: ${item.name}`,
        type: 'script',
        img:  item.img || 'icons/svg/target.svg',
        command,
        flags: { 'The2ndChumming3e': { weaponMacro: true } },
      });
    }
    await game.user.assignHotbarMacro(macro, slot);
  })();
  return false; // we handled the drop
});

// Auto-sync token status icons from system state, and auto-mark combatants defeated when down.
// Runs only on the active GM's client to avoid every client racing to apply effects.
Hooks.on('updateActor', async (actor, changes) => {
  if (!game.users.activeGM?.isSelf) return;
  const sys = changes.system;
  if (!sys) return;
  const set = (id, active, overlay = false) => actor.toggleStatusEffect(id, { active, overlay });

  if ('astralMode' in sys) {
    await set('sr3e-astral', sys.astralMode === 'astral');
    await set('sr3e-dual',   sys.astralMode === 'dual');
  }
  if ('matrixUserMode' in sys) {
    await set('sr3e-vr', sys.matrixUserMode === 'VR-Cold' || sys.matrixUserMode === 'VR-Hot');
  }
  if ('fullDefense' in sys) {
    await set('sr3e-fulldefense', !!sys.fullDefense);
  }

  // Auto-defeated / down / dead from the wound tracks (reversible on healing).
  if (sys.wounds && ['character', 'npc'].includes(actor.type)) {
    const w        = actor.system.wounds ?? {};
    const body     = actor.system.attributes?.body?.value ?? actor.system.attributes?.body?.base ?? 6;
    const physFull = (w.physical?.value ?? 0) >= (w.physical?.max ?? 10);
    const stunFull = (w.stun?.value ?? 0) >= (w.stun?.max ?? 10);
    const dead     = physFull && (w.overflow?.value ?? 0) >= body;
    const down     = physFull || stunFull;

    await set('dead', dead, true);                // skull overlay
    await set('unconscious', down && !dead);      // KO when down but not dead
    for (const cbt of (game.combat?.combatants ?? []).filter(c => c.actorId === actor.id)) {
      if (cbt.isDefeated !== down) await cbt.update({ defeated: down });
    }
  }
});


// Re-render combat tracker when a vehicle actor's control mode changes so the
// VCR / RCD / Auto badge in the sidebar stays current without needing a turn advance.
Hooks.on('updateActor', (actor, changes) => {
  if (actor.type !== 'vehicle') return;
  const sys = changes?.system ?? {};
  if ('controlMode' in sys || 'driverActorId' in sys) {
    ui.combat?.render();
  }
});


// Sync actor currentMatrixNode / matrixMarks → host activeUsers entry.
// Runs only on the GM's client so host updates always have permission.
// The _sr3eSync flag on the options object prevents recursive loops.
Hooks.on('updateActor', async (actor, changes, options) => {
  if (options?._sr3eSync) return;
  if (!game.user?.isGM) return;
  if (actor.type === 'host' || actor.type === 'ic' || actor.type === 'agent') return;

  const hostId = actor.system?.activeHostId ?? '';
  if (!hostId) return;
  const host = game.actors.get(hostId);
  if (!host) return;

  const users = foundry.utils.deepClone(host.system.activeUsers ?? []);
  const entry = users.find(u => u.actorId === actor.id);
  if (!entry) return;

  let changed = false;
  if (changes.system?.currentMatrixNode !== undefined) {
    entry.currentNodeId = changes.system.currentMatrixNode;
    changed = true;
  }
  if (changes.system?.matrixMarks !== undefined) {
    entry.marks = [...(changes.system.matrixMarks ?? [])];
    changed = true;
  }
  if (changed) await host.update({ 'system.activeUsers': users }, { _sr3eSync: true });
});

// ── One-shot button guard ────────────────────────────────────────────────────
// Prevents a button from firing twice when both the Foundry pop-up notification
// and the main chat log render the same card with live buttons simultaneously.
// Key = messageId|class|index. In-memory only; clears on page reload.
const _usedButtons = new Set();

// Action Tracker state — per active combatant, this turn only. Keyed by combatant id,
// value { firstSimpleUsed }. Cleared whenever the combat turn/round changes (below).
const _actionTracker = new Map();

function _checkBtn(btn, mid, cls, idx) {
  if (!_usedButtons.has(`${mid}|${cls}|${idx}`)) return true;
  btn.disabled = true;
  return false;
}

function _claimBtn(btn, mid, cls, idx) {
  const key = `${mid}|${cls}|${idx}`;
  if (_usedButtons.has(key)) { btn.disabled = true; return false; }
  _usedButtons.add(key);
  btn.disabled = true;
  return true;
}

/**
 * May this client act for the payload's actor at all? A SET — any owner, or a GM.
 * Used for buttons that merely post a card onward.
 */
/**
 * Which actor a chat payload is *about*. Different cards name it differently, and
 * the order matters: `actorId` is the roller on a wave payload and the damaged
 * actor on a soak/assign payload, both of which are the actor whose owner should
 * be acting. `attackerActorId` is deliberately absent — an attacker must not
 * inherit rights over their target's card.
 */
function _payloadActorId(p) {
  return p?.actorId ?? p?.icActorId ?? p?.vehicleActorId ?? p?.wardActorId ?? p?.targetActorId ?? null;
}

/**
 * May this client act on this payload's actor? A SET — any owner, or a GM.
 * Fails CLOSED when no actor can be resolved: the GM can always still click.
 */
function _mine(p) {
  if (game.user.isGM) return true;
  const id = _payloadActorId(p);
  if (!id) return false;
  return game.actors.get(id)?.isOwner === true;
}

/**
 * Is this client THE decider for the payload's actor? Exactly ONE user, resolved
 * by the same `deciderFor` that routed the decision in the first place.
 *
 * Used for buttons that actually ROLL. `_mine` is deliberately broader, and
 * gating a rolling button on it would let two co-owners of a party drone both
 * click "roll to dodge" for the same attack.
 *
 * Computed live rather than read from a stamped payload id: it cannot drift out
 * of agreement with `deciderFor`, and if the decider disconnects mid-exchange it
 * re-resolves to the GM so the roll can still be finished.
 */
function _isDecider(p) {
  if (game.user.isGM) return true;
  return _isTheDecider(p);
}

/**
 * Strictly THE decider — no GM shortcut.
 *
 * `_isDecider` lets a GM click anything, which is right for an override but wrong
 * for deciding whose screen a prompt should open on: with the GM shortcut the GM
 * would have every player's decision thrust at them.
 */
function _isTheDecider(p) {
  const a = game.actors.get(_payloadActorId(p));
  if (!a) return false;                    // fail CLOSED — no fail-open `!a` branch
  return game.sr3e.SR3EQuery.deciderFor(a) === game.user.id;
}

/**
 * One-shot guard for prompts this client opens by itself.
 *
 * Separate from `_usedButtons`: that marks a button as *spent*, whereas this marks
 * it as *already offered*. `renderChatMessageHTML` fires for both the pop-up
 * notification and the chat log, so without this the same decision opens twice.
 */
const _autoOpened = new Set();
function _claimAuto(key) {
  if (_autoOpened.has(key)) return false;
  _autoOpened.add(key);
  return true;
}

/**
 * The two predicates above, but for a payload that names its actor under a key
 * `_payloadActorId` does not know.
 *
 * Most cards do not use `actorId`. Auditing every chat button turned up eleven that
 * carry `deckerActorId`, `conjurerActorId`, `passengerActorId`, `targetVehicleId`,
 * `defenderActorId`, `atkActorId`/`oppActorId` or `intruderRiggerId`. Passing the id
 * explicitly is deliberate: widening `_payloadActorId` to swallow them all would drag
 * `attackerActorId` in by the back door on the cards that carry both, and an attacker
 * must never inherit rights over their target's card.
 */
function _mineId(actorId) {
  if (game.user.isGM) return true;
  if (!actorId) return false;
  return game.actors.get(actorId)?.isOwner === true;
}

function _isDeciderId(actorId) {
  if (game.user.isGM) return true;
  const a = actorId ? game.actors.get(actorId) : null;
  if (!a) return false;                    // fail CLOSED
  return game.sr3e.SR3EQuery.deciderFor(a) === game.user.id;
}

/**
 * Either side of a two-corner card may act.
 *
 * A stopgap, not a fix. The astral, contested and MIJI cards carry BOTH participants and
 * one button rolls the whole exchange — the same structural flaw as the melee boxing card
 * (see TODO #24). Narrowing "anyone at the table" to "one of the two people involved" is
 * a real improvement; it does not make each side edit only its own corner.
 */
function _mineAny(...actorIds) {
  return actorIds.some(id => _mineId(id));
}

/** Parse a button's payload, or null if it is unreadable. Callers leave those alone. */
function _payload(btn) {
  try { return JSON.parse(btn.dataset.payload ?? '{}'); }
  catch { return null; }
}

/** Dim a button this client must not press, with the reason on hover. */
function _denyBtn(btn, why) {
  btn.disabled = true;
  btn.title    = why;
  btn.style.opacity = '0.45';
}


// Inject red warning below the matrixRuleset setting in Configure Settings.
Hooks.on('renderSettingsConfig', (_app, html) => {
  const input = html.querySelector('[name="The2ndChumming3e.matrixRuleset"]');
  if (!input) return;
  const formGroup = input.closest('.form-group');
  if (!formGroup) return;
  const warn = document.createElement('p');
  warn.className = 'notes';
  warn.style.cssText = 'color:#cc2222;font-weight:bold;margin-top:4px';
  warn.textContent = '⚠ Changing Matrix rules midgame could break your game.';
  formGroup.appendChild(warn);
});

// Attach action button handlers to each chat message as it renders.
// renderChatMessageHTML fires for every render (new message AND pop-up notification),
// so the guard above is what prevents double-firing across the two DOM instances.
Hooks.on('renderChatMessageHTML', (message, html, _data) => {
  const mid = message.id;

  // Clear-blast-marker button — removes the grenade's landing marker. Two kinds:
  //  • data-region-id → a Region document (visible to all); deleted via the document API
  //    (Region is NOT deprecated, so this is warning-free).
  //  • data-marker-id → a local non-persisted placeable (fallback); destroyed via PIXI.
  // Idempotent; harmless no-op on clients that don't hold the target.
  html.querySelectorAll('.sr3e-clear-blast-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      const regionId = btn.dataset.regionId;
      const markerId = btn.dataset.markerId;
      if (regionId) {
        const scene  = game.scenes?.get(btn.dataset.sceneId) ?? canvas?.scene;
        const region = scene?.regions?.get(regionId);
        if (region) { try { await region.delete(); } catch { /* already gone */ } }
      } else if (markerId) {
        const marker = game.sr3e?._blastMarkers?.get(markerId);
        if (marker) {
          try { marker.destroy(); } catch { /* already gone */ }
          game.sr3e._blastMarkers.delete(markerId);
        }
      }
      btn.disabled    = true;
      btn.textContent = '🧹 Cleared';
    });
  });

  // Rule of Six explosion button
  html.querySelectorAll('.sr-explode-btn').forEach((btn, i) => {
    if (!_checkBtn(btn, mid, 'explode', i)) return;
    // Continuing someone's roll is continuing THEIR roll — the card is visible to
    // the whole table, but only the roller's owner (or the GM) may advance it.
    try {
      if (!_mine(JSON.parse(btn.dataset.payload ?? '{}'))) {
        return _denyBtn(btn, 'Only this actor\'s owner (or the GM) can roll these explosions.');
      }
    } catch { /* unreadable payload — leave the button alone */ }
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      if (!_claimBtn(btn, mid, 'explode', i)) return;
      const payload = btn.dataset.payload;
      if (!payload) return;
      btn.disabled    = true;
      btn.textContent = '\u23f3 Rolling\u2026';
      await SR3EActor.handleExplosionClick(payload);
    });
  });

  // "Resist Damage" button — posts soak card for the identified target
  html.querySelectorAll('.sr-soak-btn').forEach((btn, i) => {
    if (!_checkBtn(btn, mid, 'soak', i)) return;
    try {
      if (!_mine(JSON.parse(btn.dataset.payload ?? '{}'))) {
        return _denyBtn(btn, 'Only the target or the GM can resist this damage.');
      }
    } catch { /* unreadable payload — leave the button alone and let the handler warn */ }
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      if (!_claimBtn(btn, mid, 'soak', i)) return;
      const payload = btn.dataset.payload;
      if (!payload) return;
      btn.disabled    = true;
      btn.textContent = '\u23f3 Preparing\u2026';
      const p = JSON.parse(payload);
      await SR3EActor.postSoakCard(p.targetActorId, p);
    });
  });

  // Dodge roll button — triggered by player after seeing attack hits
  // Post-roll defence declaration (SR3 sequence step 4). The defender decides
  // AFTER seeing the attack successes — dodge, or save the pool for the Damage
  // Resistance Test. Gated to the defender: it spends their pool.
  html.querySelectorAll('.sr-dodge-declare-btn').forEach((btn, i) => {
    if (!_checkBtn(btn, mid, 'dodgedeclare', i)) return;
    try {
      if (!_isDecider(JSON.parse(btn.dataset.payload ?? '{}'))) {
        return _denyBtn(btn, 'Only the defender (or the GM) declares this defence.');
      }
    } catch { /* unreadable payload — leave the button alone */ }
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      if (!_claimBtn(btn, mid, 'dodgedeclare', i)) return;
      const payload = btn.dataset.payload;
      if (!payload) return;
      btn.disabled    = true;
      btn.textContent = '⏳ Declaring…';
      await SR3EActor.handleDodgeDeclare(JSON.parse(payload));
    });

    // Come to the defender rather than waiting to be spotted. The attack is
    // already resolved and everything downstream is blocked on this answer, so a
    // button the defender has to notice in a scrolling chat log is the wrong
    // shape. Strictly the decider — a GM must not have every player's defence
    // decision thrust at them, though they can still click it as an override.
    try {
      const p = JSON.parse(btn.dataset.payload ?? '{}');
      if (_isTheDecider(p) && _claimAuto(`${mid}|dodgeauto|${i}`)) {
        // Deferred so the card finishes rendering first, and routed through the
        // button's own click so the _claimBtn guard still applies exactly once.
        setTimeout(() => { if (!btn.disabled) btn.click(); }, 0);
      }
    } catch { /* unreadable payload — the button still works manually */ }
  });

  html.querySelectorAll('.sr-dodge-roll-btn').forEach((btn, i) => {
    if (!_checkBtn(btn, mid, 'dodge', i)) return;
    try {
      if (!_isDecider(JSON.parse(btn.dataset.payload ?? '{}'))) {
        return _denyBtn(btn, 'Only the defender (or the GM) rolls this dodge.');
      }
    } catch { /* unreadable payload — leave the button alone */ }
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      if (!_claimBtn(btn, mid, 'dodge', i)) return;
      const payload = btn.dataset.payload;
      if (!payload) return;
      btn.disabled    = true;
      btn.textContent = '\u23f3 Rolling\u2026';
      const p           = JSON.parse(payload);
      const targetActor = game.actors.get(p.targetActorId);
      if (targetActor) await SR3EActor._rollDodge(targetActor, p.committedDodgeDice, p, event.shiftKey);
    });
  });

  // Melee Roll! button on boxing card
  html.querySelectorAll('.sr-melee-roll-btn').forEach((btn, i) => {
    if (!_checkBtn(btn, mid, 'melee', i)) return;
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      if (!_claimBtn(btn, mid, 'melee', i)) return;
      await SR3EActor.handleMeleeRoll(btn, event.shiftKey);
    });
  });

  // MIJI test (electronic warfare) — roll both sides + apply degradation
  html.querySelectorAll('.sr-miji-roll-btn').forEach((btn, i) => {
    if (!_checkBtn(btn, mid, 'mijiroll', i)) return;
    const pl = _payload(btn);
    if (pl && !_mineAny(pl.intruderRiggerId, pl.defenderRiggerId)) return _denyBtn(btn, 'Only a rigger in this contest (or the GM) can roll it.');
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      if (!_claimBtn(btn, mid, 'mijiroll', i)) return;
      await game.sr3e.SR3EMIJI.handleMIJIRoll(btn);
    });
  });

  html.querySelectorAll('.sr-miji-degradation-btn').forEach((btn, i) => {
    if (!_checkBtn(btn, mid, 'mijideg', i)) return;
    const pl = _payload(btn);
    if (pl && !_mineId(pl.targetVehicleId)) return _denyBtn(btn, 'Only the target vehicle\'s owner (or the GM) can apply this degradation.');
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      if (!_claimBtn(btn, mid, 'mijideg', i)) return;
      await game.sr3e.SR3EMIJI.applyDegradation(btn);
    });
  });

  html.querySelectorAll('.sr-ost-roll-btn').forEach((btn, i) => {
    if (!_checkBtn(btn, mid, 'ostroll', i)) return;
    const pl = _payload(btn);
    if (pl && !_isDeciderId(pl.deckerActorId)) return _denyBtn(btn, 'Only the decker (or the GM) rolls this System Test.');
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      if (!_claimBtn(btn, mid, 'ostroll', i)) return;
      await SR3EActor.handleOrthodoxSystemTestRoll(btn);
    });
  });

  html.querySelectorAll('.sr-occ-roll-btn').forEach((btn, i) => {
    if (!_checkBtn(btn, mid, 'occroll', i)) return;
    const pl = _payload(btn);
    if (pl && !_isDeciderId(pl.deckerActorId)) return _denyBtn(btn, 'Only the decker (or the GM) rolls this cybercombat.');
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      if (!_claimBtn(btn, mid, 'occroll', i)) return;
      await SR3EActor.handleOrthodoxCybercombatRoll(btn);
    });
  });

  html.querySelectorAll('.sr-icia-roll-btn').forEach((btn, i) => {
    if (!_checkBtn(btn, mid, 'iciaroll', i)) return;
    const pl = _payload(btn);
    if (pl && !_isDecider(pl)) return _denyBtn(btn, 'Only the IC\'s owner (or the GM) rolls this attack.');
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      if (!_claimBtn(btn, mid, 'iciaroll', i)) return;
      await SR3EActor.handleOrthodoxICAttackRoll(btn);
    });
  });

  html.querySelectorAll('.sr-icia-assign-btn').forEach((btn, i) => {
    if (!_checkBtn(btn, mid, 'iciaassign', i)) return;
    const pl = _payload(btn);
    if (pl && !_mineId(pl.deckerActorId)) return _denyBtn(btn, 'Only the decker\'s owner (or the GM) can assign this.');
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      if (!_claimBtn(btn, mid, 'iciaassign', i)) return;
      await SR3EActor.handleOrthodoxICAssign(btn);
    });
  });

  // Roll Soak button on soak card (also handles spell-resist soak via same handler)
  html.querySelectorAll('.sr-soak-roll-btn').forEach((btn, i) => {
    if (!_checkBtn(btn, mid, 'soakroll', i)) return;
    try {
      if (!_isDecider(JSON.parse(btn.dataset.payload ?? '{}'))) {
        return _denyBtn(btn, 'Only the target (or the GM) rolls this soak.');
      }
    } catch { /* unreadable payload — leave the button alone */ }
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      if (!_claimBtn(btn, mid, 'soakroll', i)) return;
      await SR3EActor.handleSoakRollClick(btn, event.shiftKey);
    });
  });

  // Spell resist button — posts the editable Resist-Spell card (Willpower/Body, TN = Force)
  html.querySelectorAll('.sr-spell-soak-btn').forEach((btn, i) => {
    if (!_checkBtn(btn, mid, 'spellsoak', i)) return;
    const pl = _payload(btn);
    if (pl && !_mine(pl)) return _denyBtn(btn, 'Only the target\'s owner (or the GM) can open this resistance card.');
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      if (!_claimBtn(btn, mid, 'spellsoak', i)) return;
      const p = JSON.parse(btn.dataset.payload);
      btn.disabled    = true;
      btn.textContent = '⏳ Preparing…';
      await SR3EActor.postSpellSoakCard(p.targetActorId, p);
    });
  });

  // Roll-to-Resist on a spell-resist card — opposed roll (net vs caster stages damage, no soak)
  html.querySelectorAll('.sr-spell-resist-roll-btn').forEach((btn, i) => {
    if (!_checkBtn(btn, mid, 'spellresistroll', i)) return;
    const pl = _payload(btn);
    if (pl && !_isDecider(pl)) return _denyBtn(btn, 'Only the target (or the GM) rolls this resistance.');
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      if (!_claimBtn(btn, mid, 'spellresistroll', i)) return;
      await SR3EActor.handleSpellResistRoll(btn, event.shiftKey);
    });
  });

  // Place Ward button — aims with the AoE cursor helper, creates the ward Actor + Token
  html.querySelectorAll('.sr3e-place-ward-btn').forEach((btn, i) => {
    if (!_checkBtn(btn, mid, 'placeward', i)) return;
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      if (!_claimBtn(btn, mid, 'placeward', i)) return;
      const p = JSON.parse(btn.dataset.payload);
      btn.disabled    = true;
      btn.textContent = '⏳ Placing…';
      await SR3EWard.confirmPlaceWard(p);
    });
  });

  // Ward Resists button — rolls the ward's own Force-dice soak
  html.querySelectorAll('.sr3e-ward-resist-btn').forEach((btn, i) => {
    if (!_checkBtn(btn, mid, 'wardresist', i)) return;
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      if (!_claimBtn(btn, mid, 'wardresist', i)) return;
      await SR3EWard.handleWardResistClick(btn);
    });
  });

  // Confirm Summoning button — creates the spirit actor
  html.querySelectorAll('.sr-summon-confirm-btn').forEach((btn, i) => {
    if (!_checkBtn(btn, mid, 'summon', i)) return;
    const pl = _payload(btn);
    if (pl && !_mineId(pl.conjurerActorId)) return _denyBtn(btn, 'Only the conjurer\'s owner (or the GM) can confirm this summoning.');
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      if (!_claimBtn(btn, mid, 'summon', i)) return;
      const p = JSON.parse(btn.dataset.payload);
      btn.disabled    = true;
      btn.textContent = '⏳ Summoning…';
      await SR3ESpiritSummoning.confirmSummoning(p);
    });
  });

  // Drain button — posts drain resist card for the caster
  html.querySelectorAll('.sr-drain-btn').forEach((btn, i) => {
    if (!_checkBtn(btn, mid, 'drain', i)) return;
    const pl = _payload(btn);
    if (pl && !_mine(pl)) return _denyBtn(btn, 'Only the caster\'s owner (or the GM) can open this drain card.');
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      if (!_claimBtn(btn, mid, 'drain', i)) return;
      const p = JSON.parse(btn.dataset.payload);
      btn.disabled    = true;
      btn.textContent = '⏳ Preparing…';
      await SR3EActor.postDrainCard(p.actorId, p);
    });
  });

  // Roll Drain button on drain card
  html.querySelectorAll('.sr-drain-roll-btn').forEach((btn, i) => {
    if (!_checkBtn(btn, mid, 'drainroll', i)) return;
    const pl = _payload(btn);
    if (pl && !_isDecider(pl)) return _denyBtn(btn, 'Only the caster (or the GM) rolls this drain.');
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      if (!_claimBtn(btn, mid, 'drainroll', i)) return;
      await SR3EActor.handleDrainRollClick(btn, event.shiftKey);
    });
  });

  // The Spell Defense DECLARATION card is gone — declaring is now a per-mage dialog on
  // that mage's own client (SR3EActor.promptSpellDefenseFor, via the
  // 'sr3e.spelldefense.declare' query), so there are no commit/skip buttons to wire and
  // no card for one player to answer on another's behalf. The phase card below, which
  // ROLLS an already-declared defense, is unaffected.

  // Spell Defense roll button — on the spell defense phase card
  html.querySelectorAll('.sr-spell-defense-btn').forEach((btn, i) => {
    if (!_checkBtn(btn, mid, 'spelldef', i)) return;
    const pl = _payload(btn);
    if (pl && !_isDeciderId(pl.defenderActorId)) return _denyBtn(btn, 'Only the defender (or the GM) rolls their Spell Defense.');
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      if (!_claimBtn(btn, mid, 'spelldef', i)) return;
      await SR3EActor.handleSpellDefenseRoll(btn, event.shiftKey);
    });
  });

  // Proceed to Resist Spell — skips remaining defense rolls
  html.querySelectorAll('.sr-spell-defense-proceed-btn').forEach((btn, i) => {
    if (!_checkBtn(btn, mid, 'spelldefproceed', i)) return;
    const pl = _payload(btn);
    if (pl && !_mineId(pl.sc?.attackerActorId)) return _denyBtn(btn, 'Only the caster (or the GM) can skip the remaining defenses.');
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      if (!_claimBtn(btn, mid, 'spelldefproceed', i)) return;
      await SR3EActor.handleSpellDefenseProceed(btn);
    });
  });

  // Astral Combat Roll! button on boxing card
  html.querySelectorAll('.sr-astral-roll-btn').forEach((btn, i) => {
    if (!_checkBtn(btn, mid, 'astral', i)) return;
    const pl = _payload(btn);
    if (pl && !_mineAny(pl.attackerActorId, pl.defenderActorId)) return _denyBtn(btn, 'Only a combatant in this exchange (or the GM) can roll it.');
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      if (!_claimBtn(btn, mid, 'astral', i)) return;
      await SR3EActor.handleAstralRoll(btn, event.shiftKey);
    });
  });

  // Astral soak button — posts astral resist card (INT dice, TN = winner's CHA)
  html.querySelectorAll('.sr-astral-soak-btn').forEach((btn, i) => {
    if (!_checkBtn(btn, mid, 'astralsoak', i)) return;
    const pl = _payload(btn);
    if (pl && !_mine(pl)) return _denyBtn(btn, 'Only the target\'s owner (or the GM) can open this astral resistance card.');
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      if (!_claimBtn(btn, mid, 'astralsoak', i)) return;
      const p = JSON.parse(btn.dataset.payload);
      btn.disabled    = true;
      btn.textContent = '⏳ Preparing…';
      await SR3EActor.postAstralSoakCard(p.actorId, p);
    });
  });

  // Roll to Resist (Astral) button on astral soak card
  html.querySelectorAll('.sr-astral-soak-roll-btn').forEach((btn, i) => {
    if (!_checkBtn(btn, mid, 'astralsoakroll', i)) return;
    const pl = _payload(btn);
    if (pl && !_isDecider(pl)) return _denyBtn(btn, 'Only the target (or the GM) rolls this astral resistance.');
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      if (!_claimBtn(btn, mid, 'astralsoakroll', i)) return;
      await SR3EActor.handleAstralSoakRoll(btn, event.shiftKey);
    });
  });

  // Aura Reading complementary roll button on assensing result card
  html.querySelectorAll('.sr-aura-reading-btn').forEach((btn, i) => {
    if (!_checkBtn(btn, mid, 'aurareading', i)) return;
    const pl = _payload(btn);
    if (pl && !_isDecider(pl)) return _denyBtn(btn, 'Only this actor\'s owner (or the GM) rolls this aura reading.');
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      if (!_claimBtn(btn, mid, 'aurareading', i)) return;
      btn.disabled    = true;
      btn.textContent = '⏳ Rolling…';
      await SR3EActor.handleAuraReadingClick(btn, event.shiftKey);
    });
  });

  // Universal contested roll button
  html.querySelectorAll('.sr-contested-roll-btn').forEach((btn, i) => {
    if (!_checkBtn(btn, mid, 'contested', i)) return;
    const pl = _payload(btn);
    if (pl && !_mineAny(pl.atkActorId, pl.oppActorId)) return _denyBtn(btn, 'Only a participant in this test (or the GM) can roll it.');
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      if (!_claimBtn(btn, mid, 'contested', i)) return;
      btn.disabled    = true;
      btn.textContent = '⏳ Rolling…';
      await SR3EActor.handleContestedRoll(btn, event.shiftKey);
    });
  });

  // Ramming — vehicle soak button (body + control pool vs TN power)
  html.querySelectorAll('.sr-ram-vehicle-soak-btn').forEach((btn, i) => {
    if (!_checkBtn(btn, mid, 'ramvehicle', i)) return;
    const pl = _payload(btn);
    if (pl && !_isDecider(pl)) return _denyBtn(btn, 'Only the vehicle\'s owner (or the GM) rolls this soak.');
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      if (!_claimBtn(btn, mid, 'ramvehicle', i)) return;
      await SR3EActor.handleRamVehicleSoak(btn, event.shiftKey);
    });
  });

  // Ramming — individual passenger resist button
  html.querySelectorAll('.sr-ram-passenger-resist-btn').forEach((btn, i) => {
    if (!_checkBtn(btn, mid, 'rampassenger', i)) return;
    const pl = _payload(btn);
    if (pl && !_isDeciderId(pl.passengerActorId)) return _denyBtn(btn, 'Only this passenger\'s owner (or the GM) rolls this resistance.');
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      if (!_claimBtn(btn, mid, 'rampassenger', i)) return;
      await SR3EActor.handleRamPassengerResist(btn, event.shiftKey);
    });
  });

  // Assign damage button — applies final staged damage directly to actor wound track
  html.querySelectorAll('.sr-assign-damage-btn').forEach((btn, i) => {
    if (!_checkBtn(btn, mid, 'assign', i)) return;
    // Writes to a wound track. Owner or GM only — an attacker must not be able to
    // apply damage to the actor they just shot.
    try {
      if (!_mine(JSON.parse(btn.dataset.payload ?? '{}'))) {
        return _denyBtn(btn, 'Only this actor\'s owner (or the GM) can apply this damage.');
      }
    } catch { /* unreadable payload — leave the button alone */ }
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      if (!_claimBtn(btn, mid, 'assign', i)) return;
      await SR3EActor.handleAssignDamage(btn);
    });
  });

  // Matrix combat — IC resist matrix damage (opens IC resist card)
  html.querySelectorAll('.sr-matrix-ic-resist-btn').forEach((btn, i) => {
    if (!_checkBtn(btn, mid, 'maticresist', i)) return;
    const pl = _payload(btn);
    if (pl && !_mine(pl)) return _denyBtn(btn, 'Only the IC\'s owner (or the GM) can open this resistance card.');
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      if (!_claimBtn(btn, mid, 'maticresist', i)) return;
      btn.disabled    = true;
      btn.textContent = '⏳ Preparing…';
      await SR3EActor.handleMatrixICResistClick(btn);
    });
  });

  // Matrix combat — IC rolls to resist (on IC resist card)
  html.querySelectorAll('.sr-matrix-ic-resist-roll-btn').forEach((btn, i) => {
    if (!_checkBtn(btn, mid, 'maticresistroll', i)) return;
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      if (!_claimBtn(btn, mid, 'maticresistroll', i)) return;
      await SR3EActor.handleMatrixICResistRollClick(btn);
    });
  });

  // Matrix combat — Cybercombat boxing card Roll button
  html.querySelectorAll('.sr-cc-roll-btn').forEach((btn, i) => {
    if (!_checkBtn(btn, mid, 'ccroll', i)) return;
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      if (!_claimBtn(btn, mid, 'ccroll', i)) return;
      await SR3EActor.handleCybercombatRoll(btn);
    });
  });

  // Matrix combat — Decker opens their MPCP soak card
  html.querySelectorAll('.sr-matrix-decker-resist-btn').forEach((btn, i) => {
    if (!_checkBtn(btn, mid, 'maticdeckerresist', i)) return;
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      if (!_claimBtn(btn, mid, 'maticdeckerresist', i)) return;
      btn.disabled    = true;
      btn.textContent = '⏳ Preparing…';
      await SR3EActor.handleDeckerMatrixResistClick(btn);
    });
  });

  // Matrix combat — Decker rolls to resist on MPCP soak card
  html.querySelectorAll('.sr-matrix-decker-resist-roll-btn').forEach((btn, i) => {
    if (!_checkBtn(btn, mid, 'maticdeckerresistroll', i)) return;
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      if (!_claimBtn(btn, mid, 'maticdeckerresistroll', i)) return;
      await SR3EActor.handleDeckerMatrixResistRollClick(btn);
    });
  });

  // Security sheaf activation — GM-whisper card after failed hack
  html.querySelectorAll('.sheaf-activate-btn').forEach((btn, i) => {
    if (!_checkBtn(btn, mid, 'sheafactivate', i)) return;
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      if (!_claimBtn(btn, mid, 'sheafactivate', i)) return;

      const choice    = btn.dataset.choice;
      const hostId    = btn.dataset.hostId;
      const stepIndex = parseInt(btn.dataset.stepIndex);

      if (choice === 'no') return;

      const host = game.actors.get(hostId);
      if (!host) return;

      const steps = foundry.utils.deepClone(host.system.triggerSteps ?? []);
      const step  = steps[stepIndex];
      if (!step) return;

      const icRefs   = step.ic ?? [];
      const toCreate = [];
      let   newAlert = null;

      for (const ref of icRefs) {
        if (!ref.actorId) continue;
        const icActor = game.actors.get(ref.actorId);
        if (!icActor) continue;

        const icTypeLower = (icActor.system.icType ?? '').toLowerCase();
        if (icTypeLower.startsWith('alert')) {
          const level = icTypeLower.includes('active') ? 2 : 1;
          if (newAlert === null || level > newAlert) newAlert = level;
          await icActor.update({ 'system.deployed': true, 'system.activeHostId': hostId });
        } else {
          if (game.combat) {
            const alreadyIn = game.combat.combatants.contents.some(c => c.actor?.id === ref.actorId);
            if (!alreadyIn) {
              const tok = (canvas.tokens?.placeables ?? []).find(t => t.actor?.id === ref.actorId);
              toCreate.push(tok
                ? { tokenId: tok.id, actorId: ref.actorId, sceneId: canvas.scene?.id }
                : { actorId: ref.actorId }
              );
            }
          }
          const stockedEntry = (host.system.stockedIC ?? []).find(r => r.actorId === ref.actorId);
          const upd = { 'system.deployed': true, 'system.activeHostId': hostId };
          if (stockedEntry?.nodeId) upd['system.currentMatrixNode'] = stockedEntry.nodeId;
          await icActor.update(upd);
        }
      }

      if (toCreate.length && game.combat) {
        await game.combat.createEmbeddedDocuments('Combatant', toCreate);
      }
      if (newAlert !== null) {
        await host.update({ 'system.alertCount': newAlert });
      }

      steps[stepIndex].triggered = true;
      await host.update({ 'system.triggerSteps': steps });

      const stepNum = step.step ?? (stepIndex + 1);
      const gmUsers = game.users.filter(u => u.isGM).map(u => u.id);

      if (choice === 'public') {
        const desc    = step.description
          ? `<div class="sr-roll-result" style="font-style:italic">${step.description}</div>`
          : '';
        const icNames = icRefs.map(r => r.name ?? 'IC').join(', ');
        await ChatMessage.create({
          content: `
            <div class="sr-roll-card">
              <div class="sr-roll-header" style="color:var(--sr-red)">🚨 Security Level ${stepNum} — ${host.name}</div>
              ${desc}
              ${icNames ? `<div class="sr-roll-result">Deploying: <strong>${icNames}</strong></div>` : ''}
            </div>`,
          style: CONST.CHAT_MESSAGE_STYLES.OTHER,
        });
      } else {
        await ChatMessage.create({
          content: `<div class="sr-roll-card"><div class="sr-roll-result">🔇 Sheaf level ${stepNum} activated silently.</div></div>`,
          style: CONST.CHAT_MESSAGE_STYLES.OTHER,
          whisper: gmUsers,
        });
      }
    });
  });
});