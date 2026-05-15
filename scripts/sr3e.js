import { CharacterData, NpcData, VehicleData, ICData, HostData, AgentData } from './data/ActorDataModels.js';
import {
  MeleeData, ProjectileData, ThrownData, FirearmData, AmmunitionData,
  ArmorData, GearData, SkillData, QualityData, CyberwareData, BiowareData,
  SpellData, ComplexFormData, SummoningData, AdeptPowerData, VehicleWeaponData, VehicleModData, ProgramData, CyberdeckData, ContactData,
} from './data/ItemDataModels.js';
import { SR3EActor } from './documents/SR3EActor.js';
import { SR3EItem } from './documents/SR3EItem.js';
import { SR3EActorSheet } from './sheets/SR3EActorSheet.js';
import { SR3EVehicleSheet } from './sheets/SR3EVehicleSheet.js';
import { SR3EItemSheet } from './sheets/SR3EItemSheet.js';
import { SR3EHostSheet } from './sheets/SR3EHostSheet.js';
import { SR3EICSheet } from './sheets/SR3EICSheet.js';
import { SR3EAgentSheet } from './sheets/SR3EAgentSheet.js';
import { SR3E } from './config.js';
import { SR3ECombat } from './documents/SR3ECombat.js';
import { SR3ESpiritSummoning } from './documents/SR3ESpiritSummoning.js';
import { SR3EVehicleChase } from './SR3EVehicleChase.js';

Hooks.once('init', () => {
  console.log('SR3E | Initialising');

  game.sr3e = { SR3E, SR3EActor, SR3EItem, SR3ESpiritSummoning, SR3EVehicleChase };

  // Data models (replace template.json defaults)
  CONFIG.Actor.dataModels.character = CharacterData;
  CONFIG.Actor.dataModels.npc       = NpcData;
  CONFIG.Actor.dataModels.vehicle   = VehicleData;
  CONFIG.Actor.dataModels.host      = HostData;
  CONFIG.Actor.dataModels.ic        = ICData;
  CONFIG.Actor.dataModels.agent     = AgentData;

  CONFIG.Item.dataModels.melee        = MeleeData;
  CONFIG.Item.dataModels.projectile   = ProjectileData;
  CONFIG.Item.dataModels.thrown       = ThrownData;
  CONFIG.Item.dataModels.firearm      = FirearmData;
  CONFIG.Item.dataModels.ammunition   = AmmunitionData;
  CONFIG.Item.dataModels.armor        = ArmorData;
  CONFIG.Item.dataModels.gear         = GearData;
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

  foundry.documents.collections.Actors.registerSheet('The2ndChumming3e', SR3EHostSheet, {
    types: ['host'],
    makeDefault: true,
    label: 'SR3E Host Sheet'
  });

  foundry.documents.collections.Actors.registerSheet('The2ndChumming3e', SR3EICSheet, {
    types: ['ic'],
    makeDefault: true,
    label: 'SR3E IC Sheet'
  });

  foundry.documents.collections.Actors.registerSheet('The2ndChumming3e', SR3EAgentSheet, {
    types: ['agent'],
    makeDefault: true,
    label: 'SR3E Agent Sheet'
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

  console.log('SR3E | Ready');
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
      name: 'Populate SR3E Sample Characters (1–5)',
      path: 'scripts/macros/populate-sample-characters.js',
      img:  'icons/svg/mystery-man.svg',
    },
    {
      name: 'Populate SR3E Sample Characters (6–14)',
      path: 'scripts/macros/populate-sample-characters-2.js',
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
      const src = await fetch(`systems/The2ndChumming3e/${def.path}`).then(r => r.text());
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

// Auto-assign newly created Matrix/vehicle actors to their organisational folder.
// Fires before creation so the actor is placed in the right folder from the start.
Hooks.on('preCreateActor', (document, _data, options, _userId) => {
  if (options.pack) return; // compendium creates don't use world folders
  if (document.folder) return; // already in a folder — respect manual placement
  const folderMap = {
    ic:      'IC & Agents',
    agent:   'IC & Agents',
    host:    'DataHosts',
    vehicle: 'Vehicles & Drones',
  };
  const folderName = folderMap[document.type];
  if (!folderName) return;
  const folder = game.folders?.find(f => f.type === 'Actor' && f.name === folderName);
  if (folder) document.updateSource({ folder: folder.id });
});

async function _openSessionRewardDialog() {
  const allPCs = game.actors.filter(a => a.type === 'character' && !a.getFlag('The2ndChumming3e', 'isTemplate'));

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
    type: CONST.CHAT_MESSAGE_STYLES.OTHER,
  });
}

async function _openChunkySalsaCalculator() {
  // Blast formulas (all distances in metres from blast epicentre):
  //   Direct wave      : P − D
  //   Same-side wall   : P − (2W − D)  — wall must be behind the character (W > D)
  //   Opposite/perp    : P − (2W + D)
  function calcBlast(power, charDist, walls) {
    const waves = [];
    const direct = power - charDist;
    if (direct > 0) waves.push({ label: `Direct (${power} − ${charDist}m)`, power: direct });

    for (const w of walls) {
      let wp;
      if (w.type === 'same') {
        if (w.dist <= charDist) continue; // wall between blast and character — not a valid rebound
        wp = power - (2 * w.dist - charDist);
      } else {
        wp = power - (2 * w.dist + charDist);
      }
      if (wp > 0) {
        const lbl = w.type === 'same' ? 'Same-side wall' : 'Opposite/perp. wall';
        waves.push({ label: `${lbl} @${w.dist}m`, power: wp });
      }
    }
    return waves;
  }

  function updatePreview(el) {
    const power    = parseInt(el.querySelector('#sr-salsa-power')?.value) || 0;
    const charDist = parseInt(el.querySelector('#sr-salsa-dist')?.value)  || 0;
    const level    = el.querySelector('#sr-salsa-level')?.value || 'S';
    const walls    = [];
    el.querySelectorAll('.sr-wall-row').forEach(row => {
      walls.push({
        type: row.querySelector('.sr-wall-type')?.value || 'same',
        dist: parseInt(row.querySelector('.sr-wall-dist')?.value) || 1,
      });
    });

    const waves      = calcBlast(power, charDist, walls);
    const totalPower = waves.reduce((s, w) => s + w.power, 0);
    const preview    = el.querySelector('#sr-salsa-preview');
    if (!preview) return;

    if (!waves.length) {
      preview.innerHTML = '<span style="color:var(--sr-muted)">No blast reaches the target.</span>';
      return;
    }

    const lines = waves.map(w =>
      `<div>• ${w.label}: <strong>${w.power}${level}</strong></div>`
    ).join('');
    const total = waves.length > 1
      ? `<div style="margin-top:4px;border-top:1px solid var(--sr-border);padding-top:4px;font-weight:bold;">Total: ${totalPower}${level}</div>`
      : '';
    preview.innerHTML = lines + total;
  }

  function addWallRow(wallList, el) {
    const div = document.createElement('div');
    div.className = 'sr-wall-row';
    div.style.cssText = 'display:flex;align-items:center;gap:8px;margin:3px 0;';
    div.innerHTML = `
      <select class="sr-wall-type" style="flex:1;">
        <option value="same">Same-side (behind char)</option>
        <option value="opposite">Opposite / perpendicular</option>
      </select>
      <label style="display:flex;align-items:center;gap:4px;white-space:nowrap;">Dist:
        <input type="number" class="sr-wall-dist" value="3" min="1" style="width:50px;"/>m
      </label>
      <button type="button" class="sr-remove-wall-btn" style="padding:2px 8px;">✕</button>`;
    div.querySelector('.sr-remove-wall-btn').addEventListener('click', () => {
      div.remove();
      updatePreview(el);
    });
    wallList.appendChild(div);
    updatePreview(el);
  }

  const actorOptions = game.actors
    .filter(a => a.type === 'character' || a.type === 'npc')
    .map(a => `<option value="${a.id}">${a.name}</option>`)
    .join('');

  let proceed = false, finalPower = 0, finalDist = 0, finalLevel = 'S';
  let finalWaves = [], finalTargetId = '';

  await foundry.applications.api.DialogV2.wait({
    window: { title: '💥 Chunky Salsa — Confined Space Blast' },
    content: `
      <div style="padding:8px 0">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px;">
          <label>Power:<br/><input type="number" id="sr-salsa-power" value="6" min="1" style="width:100%;"/></label>
          <label>Level:<br/>
            <select id="sr-salsa-level" style="width:100%;">
              <option value="L">L — Light</option>
              <option value="M">M — Moderate</option>
              <option value="S" selected>S — Serious</option>
              <option value="D">D — Deadly</option>
            </select>
          </label>
          <label>Char. dist (m):<br/><input type="number" id="sr-salsa-dist" value="0" min="0" style="width:100%;"/></label>
        </div>
        <div style="margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <strong style="font-size:12px;">Walls</strong>
            <button type="button" id="sr-add-wall-btn" style="padding:2px 10px;font-size:11px;">+ Add Wall</button>
          </div>
          <div id="sr-wall-list"></div>
        </div>
        <div id="sr-salsa-preview" style="background:var(--sr-surface);border:1px solid var(--sr-border);border-radius:var(--r);padding:8px;margin-bottom:10px;font-size:12px;min-height:36px;"></div>
        <label style="font-size:12px;">Post soak card for:
          <select id="sr-salsa-target" style="margin-left:6px;max-width:180px;">
            <option value="">— none —</option>
            ${actorOptions}
          </select>
        </label>
      </div>`,
    render: (_event, html) => {
      const el = html instanceof HTMLElement ? html : (html?.[0] ?? null);
      if (!el) return;
      updatePreview(el);
      el.addEventListener('input',  () => updatePreview(el));
      el.addEventListener('change', () => updatePreview(el));
      const wallList = el.querySelector('#sr-wall-list');
      el.querySelector('#sr-add-wall-btn')?.addEventListener('click', () => addWallRow(wallList, el));
    },
    buttons: [
      {
        label: 'Post to Chat',
        action: 'post',
        default: true,
        callback: (_e, _b, dialog) => {
          proceed       = true;
          finalPower    = parseInt(dialog.element.querySelector('#sr-salsa-power')?.value) || 0;
          finalDist     = parseInt(dialog.element.querySelector('#sr-salsa-dist')?.value)  || 0;
          finalLevel    = dialog.element.querySelector('#sr-salsa-level')?.value || 'S';
          finalTargetId = dialog.element.querySelector('#sr-salsa-target')?.value || '';
          const walls   = [];
          dialog.element.querySelectorAll('.sr-wall-row').forEach(row => {
            walls.push({
              type: row.querySelector('.sr-wall-type')?.value || 'same',
              dist: parseInt(row.querySelector('.sr-wall-dist')?.value) || 1,
            });
          });
          finalWaves = calcBlast(finalPower, finalDist, walls);
        }
      },
      { label: 'Cancel', action: 'cancel' },
    ],
  });

  if (!proceed) return;

  const totalPower = finalWaves.reduce((s, w) => s + w.power, 0);
  const waveLines  = finalWaves.map(w => `<li>${w.label}: <strong>${w.power}${finalLevel}</strong></li>`).join('');
  const totalLine  = finalWaves.length > 1
    ? `<div style="margin-top:6px;font-weight:bold;border-top:1px solid var(--sr-border);padding-top:4px;">Combined: ${totalPower}${finalLevel}</div>`
    : '';

  const soakPayload = finalTargetId ? JSON.stringify({
    targetActorId: finalTargetId,
    power:    totalPower,
    level:    finalLevel,
    isStun:   false,
    armorType: 'ballistic',
    label:    'Confined Blast',
  }) : null;

  const soakBtn = soakPayload
    ? `<button class="sr-soak-btn" data-payload='${soakPayload}' style="margin-top:8px;width:100%;padding:4px 0;">💥 Resist Damage (${totalPower}${finalLevel})</button>`
    : '';

  await ChatMessage.create({
    speaker: { alias: 'GM' },
    content: `
      <div class="sr-roll-card">
        <div class="sr-roll-header" style="background:#5a1a10;color:#ffcca0;">💥 Chunky Salsa — Confined Blast</div>
        <div class="sr-roll-body" style="padding:8px">
          <div style="font-size:11px;color:var(--sr-muted);margin-bottom:6px">Base power ${finalPower}${finalLevel} · character ${finalDist}m from blast · ${finalWaves.length} wave${finalWaves.length !== 1 ? 's' : ''}</div>
          <ul style="margin:0 0 4px;padding-left:18px;font-size:12px;">${waveLines}</ul>
          ${totalLine}
          ${soakBtn}
        </div>
      </div>`,
    type: CONST.CHAT_MESSAGE_STYLES.OTHER,
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
        const vcrMode   = cbt.actor.system.vcrMode ?? false;
        const pilotName = cbt.actor.system.controlledBy?.trim() ?? '';
        const tag = document.createElement('span');
        tag.style.cssText = 'font-size:10px;font-weight:bold;padding:1px 5px;border-radius:3px;margin-left:4px;';
        if (!pilotName) {
          tag.textContent  = 'Auto';
          tag.style.background = '#2a2010';
          tag.style.color      = '#c8a040';
        } else if (vcrMode) {
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

  // Replace d20 icon with bolt to match actor sheet style
  el.querySelectorAll('[data-action="rollInitiative"]').forEach(btn => {
    const icon = btn.querySelector('i');
    if (icon) icon.className = 'fas fa-bolt';
    btn.title = 'Roll Initiative (Shift: physical dice)';
  });

  // Shift-click initiative buttons → physical dice mode
  el.querySelectorAll('[data-action="rollInitiative"]').forEach(btn => {
    btn.addEventListener('click', async event => {
      if (!event.shiftKey) return;
      event.preventDefault();
      event.stopImmediatePropagation();

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
            passesRemaining:   Math.floor(score / 10) + 1,
          }
        }
      });
      await game.combat?.update({ flags: { The2ndChumming3e: { sr2Queue: null, sr2QueueIndex: 0 } } });
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
      if (selectedIds.length) await combat.rollInitiative(selectedIds);
      await combat.startCombat();
    }, true); // capture phase — intercepts before Foundry's bubble handler
  }

  if (!el.querySelector('.sr3e-chase-btn')) {
    const footer = el.querySelector('footer') ?? el.querySelector('.combat-controls');
    const btn = document.createElement('button');
    btn.type      = 'button';
    btn.className = 'sr3e-chase-btn';
    btn.textContent = '🚗 Chase Scene';
    btn.style.cssText = 'display:block;box-sizing:border-box;margin:4px 8px 0;width:calc(100% - 16px);';
    btn.addEventListener('click', () => game.sr3e.SR3EVehicleChase.open());
    if (footer) footer.insertAdjacentElement('afterend', btn);
    else el.appendChild(btn);
  }

  if (game.user.isGM && !el.querySelector('.sr3e-reward-btn')) {
    const anchor = el.querySelector('.sr3e-chase-btn') ?? el.querySelector('footer') ?? el.querySelector('.combat-controls');
    const rewardBtn = document.createElement('button');
    rewardBtn.type      = 'button';
    rewardBtn.className = 'sr3e-reward-btn';
    rewardBtn.textContent = '🎖 Session Rewards';
    rewardBtn.style.cssText = 'display:block;box-sizing:border-box;margin:4px 8px 0;width:calc(100% - 16px);';
    rewardBtn.addEventListener('click', _openSessionRewardDialog);
    if (anchor) anchor.insertAdjacentElement('afterend', rewardBtn);
    else el.appendChild(rewardBtn);
  }

  if (game.user.isGM && !el.querySelector('.sr3e-salsa-btn')) {
    const anchor = el.querySelector('.sr3e-reward-btn') ?? el.querySelector('.sr3e-chase-btn') ?? el.querySelector('footer') ?? el.querySelector('.combat-controls');
    const salsaBtn = document.createElement('button');
    salsaBtn.type      = 'button';
    salsaBtn.className = 'sr3e-salsa-btn';
    salsaBtn.textContent = '💥 Chunky Salsa';
    salsaBtn.style.cssText = 'display:block;box-sizing:border-box;margin:4px 8px 0;width:calc(100% - 16px);';
    salsaBtn.addEventListener('click', _openChunkySalsaCalculator);
    if (anchor) anchor.insertAdjacentElement('afterend', salsaBtn);
    else el.appendChild(salsaBtn);
  }
});

// Auto-flag actors imported from any compendium as templates so they don't
// pollute combat targeting dialogs until the GM explicitly deploys a copy.
Hooks.on('preCreateActor', (actor) => {
  if (actor._stats?.compendiumSource) {
    actor.updateSource({ 'flags.The2ndChumming3e.isTemplate': true });
  }
});

// Re-render combat tracker when a vehicle actor's control mode changes so the
// VCR / RCD / Auto badge in the sidebar stays current without needing a turn advance.
Hooks.on('updateActor', (actor, changes) => {
  if (actor.type !== 'vehicle') return;
  const sys = changes?.system ?? {};
  if ('vcrMode' in sys || 'controlledBy' in sys) {
    ui.combat?.render();
  }
});

// Attach explosion button handler to each chat message as it renders.
// renderChatMessage fires for every new message, ensuring buttons are always wired.
Hooks.on('renderChatMessageHTML', (_message, html, _data) => {
  // Rule of Six explosion button
  html.querySelectorAll('.sr-explode-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      const payload = btn.dataset.payload;
      if (!payload) return;
      btn.disabled    = true;
      btn.textContent = '\u23f3 Rolling\u2026';
      await SR3EActor.handleExplosionClick(payload);
    });
  });

  // "Resist Damage" button — posts soak card for the identified target
  html.querySelectorAll('.sr-soak-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      const payload = btn.dataset.payload;
      if (!payload) return;
      btn.disabled    = true;
      btn.textContent = '\u23f3 Preparing\u2026';
      const p = JSON.parse(payload);
      await SR3EActor.postSoakCard(p.targetActorId, p);
    });
  });

  // Dodge roll button — triggered by player after seeing attack hits
  html.querySelectorAll('.sr-dodge-roll-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
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
  html.querySelectorAll('.sr-melee-roll-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      await SR3EActor.handleMeleeRoll(btn, event.shiftKey);
    });
  });

  // Roll Soak button on soak card (also handles spell-resist soak via same handler)
  html.querySelectorAll('.sr-soak-roll-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      await SR3EActor.handleSoakRollClick(btn, event.shiftKey);
    });
  });

  // Spell resist button — posts a spell-specific soak card (Willpower/Body, TN = Force)
  html.querySelectorAll('.sr-spell-soak-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      const p = JSON.parse(btn.dataset.payload);
      btn.disabled    = true;
      btn.textContent = '⏳ Preparing…';
      await SR3EActor.postSpellSoakCard(p.targetActorId, p);
    });
  });

  // Confirm Summoning button — creates the spirit actor
  html.querySelectorAll('.sr-summon-confirm-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      const p = JSON.parse(btn.dataset.payload);
      btn.disabled    = true;
      btn.textContent = '⏳ Summoning…';
      await SR3ESpiritSummoning.confirmSummoning(p);
    });
  });

  // Drain button — posts drain resist card for the caster
  html.querySelectorAll('.sr-drain-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      const p = JSON.parse(btn.dataset.payload);
      btn.disabled    = true;
      btn.textContent = '⏳ Preparing…';
      await SR3EActor.postDrainCard(p.actorId, p);
    });
  });

  // Roll Drain button on drain card
  html.querySelectorAll('.sr-drain-roll-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      await SR3EActor.handleDrainRollClick(btn, event.shiftKey);
    });
  });

  // Spell Defense declaration card — Commit
  html.querySelectorAll('.sr-sd-declare-commit-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      await SR3EActor.handleSpellDefenseDeclareCommit(btn);
    });
  });

  // Spell Defense declaration card — Skip (delete card without committing)
  html.querySelectorAll('.sr-sd-declare-skip-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      const msgEl = btn.closest('[data-message-id]');
      const msg = msgEl ? game.messages.get(msgEl.dataset.messageId) : null;
      if (msg) await msg.delete();
    });
  });

  // Spell Defense roll button — on the spell defense phase card
  html.querySelectorAll('.sr-spell-defense-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      await SR3EActor.handleSpellDefenseRoll(btn, event.shiftKey);
    });
  });

  // Proceed to Resist Spell — skips remaining defense rolls
  html.querySelectorAll('.sr-spell-defense-proceed-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      await SR3EActor.handleSpellDefenseProceed(btn);
    });
  });

  // Astral Combat Roll! button on boxing card
  html.querySelectorAll('.sr-astral-roll-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      await SR3EActor.handleAstralRoll(btn, event.shiftKey);
    });
  });

  // Astral soak button — posts astral resist card (INT dice, TN = winner's CHA)
  html.querySelectorAll('.sr-astral-soak-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      const p = JSON.parse(btn.dataset.payload);
      btn.disabled    = true;
      btn.textContent = '⏳ Preparing…';
      await SR3EActor.postAstralSoakCard(p.actorId, p);
    });
  });

  // Roll to Resist (Astral) button on astral soak card
  html.querySelectorAll('.sr-astral-soak-roll-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      await SR3EActor.handleAstralSoakRoll(btn, event.shiftKey);
    });
  });

  // Aura Reading complementary roll button on assensing result card
  html.querySelectorAll('.sr-aura-reading-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      btn.disabled    = true;
      btn.textContent = '⏳ Rolling…';
      await SR3EActor.handleAuraReadingClick(btn, event.shiftKey);
    });
  });

  // Universal contested roll button
  html.querySelectorAll('.sr-contested-roll-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      btn.disabled    = true;
      btn.textContent = '⏳ Rolling…';
      await SR3EActor.handleContestedRoll(btn, event.shiftKey);
    });
  });

  // Ramming — vehicle soak button (body + control pool vs TN power)
  html.querySelectorAll('.sr-ram-vehicle-soak-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      await SR3EActor.handleRamVehicleSoak(btn, event.shiftKey);
    });
  });

  // Ramming — individual passenger resist button
  html.querySelectorAll('.sr-ram-passenger-resist-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      await SR3EActor.handleRamPassengerResist(btn, event.shiftKey);
    });
  });

  // Matrix combat — IC resist matrix damage (opens IC resist card)
  html.querySelectorAll('.sr-matrix-ic-resist-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      btn.disabled    = true;
      btn.textContent = '⏳ Preparing…';
      await SR3EActor.handleMatrixICResistClick(btn);
    });
  });

  // Matrix combat — IC rolls to resist (on IC resist card)
  html.querySelectorAll('.sr-matrix-ic-resist-roll-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      await SR3EActor.handleMatrixICResistRollClick(btn);
    });
  });

  // Matrix combat — Decker rolls Cybercombat defense against IC
  html.querySelectorAll('.sr-matrix-defend-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      btn.disabled    = true;
      btn.textContent = '⏳ Preparing…';
      await SR3EActor.handleMatrixDefendClick(btn);
    });
  });
});