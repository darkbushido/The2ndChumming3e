import { SR3EItem } from './SR3EItem.js';

export class SR3EActor extends Actor {

  /** @inheritdoc — see SR3EItem.migrateData for explanation */
  static migrateData(source) {
    if ( source.flags ) {
      const desc = Object.getOwnPropertyDescriptor(source.flags, "exportSource");
      if ( desc?.get ) {
        delete source.flags.exportSource;
      } else if ( desc?.value !== undefined ) {
        source._stats ??= {};
        source._stats.exportSource = {
          worldId:       source.flags.exportSource?.world ?? null,
          uuid:          null,
          coreVersion:   source.flags.exportSource?.coreVersion ?? null,
          systemId:      source.flags.exportSource?.system ?? null,
          systemVersion: source.flags.exportSource?.systemVersion ?? null,
        };
        delete source.flags.exportSource;
      }
    }
    return super.migrateData(source);
  }

  // /** @override */
  // constructor(data, context) {
  //   super(data, context);
    
  //   // Ensure system object exists
  //   if (!this.system) {
  //     this.system = {};
  //   }
  //   if (!this.system.attributes) {
  //     this.system.attributes = {};
  //   }
  //   if (!this.system.wounds) {
  //     this.system.wounds = {
  //       stun: { value: 0, max: 10 },
  //       physical: { value: 0, max: 10 },
  //       overflow: { value: 0 }
  //     };
  //   }
  // }

  /** @override */
  prepareDerivedData() {
   // Guard: If system isn't ready yet, don't proceed with data preparation.
    if (!this.system) return;

    const sys  = this.system;
    // Always ensure attributes and wounds exist on sys so writes persist
    if (!sys.attributes) sys.attributes = {};
    if (!sys.wounds)     sys.wounds     = { stun: { value: 0, max: 10 }, physical: { value: 0, max: 10 }, overflow: { value: 0 } };
    const attr = sys.attributes;
    const w    = sys.wounds;

    // FIX: Ensure attributes have value property for rolling
    this._ensureAttributeValues(attr);

    const stunVal = w.stun?.value     ?? 0;
    const physVal = w.physical?.value ?? 0;
    const rawWoundMod = -(SR3EActor._trackMod(stunVal) + SR3EActor._trackMod(physVal));
    sys.rawWoundMod   = rawWoundMod;
    sys.woundMod      = Math.min(0, rawWoundMod + (sys.stimBonus ?? 0));

    if (this.type === 'character' || this.type === 'npc') {
      this._prepareCharacter(sys, attr);
    } else if (this.type === 'vehicle') {
      this._prepareVehicle(sys, attr);
    } else if (this.type === 'host') {
      this._prepareHost(sys);
    } else if (this.type === 'ic') {
      this._prepareIC(sys);
    } else if (this.type === 'agent') {
      this._prepareAgent(sys);
    }
  }

  _prepareHost(sys) {
    if (!sys.derived) sys.derived = {};
    sys.derived.memoryAvailable = (sys.memoryTotal ?? 3000) - (sys.memoryUsed ?? 0);
    sys.derived.alertTNPenalty  = (sys.alertCount ?? 0) * 2;
    sys.derived.overwatchMax    = 10;
  }

  _prepareIC(sys) {
    if (!sys.derived) sys.derived = {};
    sys.derived.woundMax   = (sys.rating ?? 1) * 2;
    sys.derived.initiative = sys.rating ?? 1;
    // Initiative dice scale with host security tier (Matrix Defragged p.22)
    const tierDice = { Ivory: 0, Blue: 1, Green: 2, Orange: 3, Red: 4, Black: 4, Ultraviolet: 4 };
    sys.derived.initiativeDice = tierDice[sys.hostSecurityTier ?? 'Green'] ?? 2;
  }

  _prepareAgent(sys) {
    if (!sys.derived) sys.derived = {};
    sys.derived.woundMax   = (sys.rating ?? 1) * 2;
    sys.derived.initiative = sys.rating ?? 1;
    const tierDice = { Ivory: 0, Blue: 1, Green: 2, Orange: 3, Red: 4, Black: 4, Ultraviolet: 4 };
    sys.derived.initiativeDice = tierDice[sys.hostSecurityTier ?? 'Green'] ?? 2;
    // Mp cost = Rating² × totalMultiplier
    const skillsMult    = (sys.additionalSkills ?? []).length;
    const utilitiesMult = (sys.utilities ?? []).reduce((s, u) => s + (u.multiplier ?? 0), 0);
    const abilitiesMult = (sys.specialAbilities ?? []).reduce((s, a) => s + (a.multiplier ?? 0), 0);
    sys.derived.totalMultiplier = 1 + skillsMult + utilitiesMult + abilitiesMult;
    sys.derived.mpCost = (sys.rating ?? 1) ** 2 * sys.derived.totalMultiplier;
  }

  /* ------------------------------------------------------------------ */
  /*  Matrix combat — shared helpers                                     */
  /* ------------------------------------------------------------------ */

  // Returns the Firewall rating that acts as armor when actorId soaks matrix damage:
  //   IC   → host's Security Threshold (neither IC nor host has a Firewall stat)
  //   Agent → operator's cyberdeck Firewall (agent runs on the operator's deck)
  static _getMatrixFirewall(actorId) {
    const actor = game.actors.get(actorId);
    if (!actor) return 0;
    if (actor.type === 'ic') {
      for (const host of game.actors.filter(a => a.type === 'host')) {
        if ((host.system.stockedIC ?? []).some(r => r.actorId === actorId)) {
          return host.system.securityTierThreshold ?? 0;
        }
      }
      return 0;
    }
    if (actor.type === 'agent') {
      const operatorId = actor.system.operatorActorId ?? '';
      const operator   = game.actors.get(operatorId);
      if (!operator) return 0;
      const deckId = operator.system.equippedCyberdeck ?? '';
      const deck   = deckId ? operator.items.get(deckId) : null;
      return deck?.system?.attributes?.firewall?.base ?? 0;
    }
    return 0;
  }

  /* ------------------------------------------------------------------ */
  /*  Matrix combat — Decker initiates cybercombat against an IC/Agent  */
  /* ------------------------------------------------------------------ */

  _matrixTNPenalty() {
    const deckId = this.system.equippedCyberdeck ?? '';
    if (!deckId) return 0;
    const deck  = this.items.get(deckId);
    const boxes = deck?.system?.damage?.matrixConditionMonitor?.current ?? 0;
    if (boxes >= 8) return 3;
    if (boxes >= 6) return 2;
    if (boxes >= 3) return 1;
    return 0;
  }

  async rollCybercombat() {
    const targets = SR3EActor._getMatrixCombatTargets(this.id);
    if (!targets.length) {
      const hostId = this.system.activeHostId ?? '';
      if (!hostId) {
        ui.notifications.warn('Not connected to a host. Select a User Mode and host on the Matrix tab.');
      } else {
        ui.notifications.warn('No valid matrix targets on this host. Other actors must be connected to the same host (and IC must be deployed).');
      }
      return;
    }

    const atk = await SR3EActor._buildCCParticipant(this);
    if (!atk) return;   // defaulting cancelled
    const mcmPenalty = this._matrixTNPenalty?.() ?? 0;
    const mcmNote = mcmPenalty > 0
      ? `<p style="margin:0 0 8px;font-size:11px;color:var(--sr-red)">⚠ Deck damage: +${mcmPenalty} TN on all matrix rolls</p>`
      : '';

    const targetOptions = targets.map(a => {
      const typeTag = a.type === 'agent' ? 'Agent' : a.type === 'ic' ? 'IC' : a.type.toUpperCase();
      const rtgTag  = (a.type === 'ic' || a.type === 'agent') ? ` (Rating ${a.system.rating ?? 1})` : '';
      const vrTag   = a.system.matrixUserMode ? ` [${a.system.matrixUserMode}]` : '';
      return `<option value="${a.id}">${a.name} [${typeTag}]${rtgTag}${vrTag}</option>`;
    }).join('');

    let targetId  = null;
    let confirmed = false;

    await foundry.applications.api.DialogV2.wait({
      window: { title: `${this.name}: Cybercombat` },
      content: `
        <div style="padding:8px 0">
          ${mcmNote}
          <p style="margin:0 0 8px;font-size:12px;color:var(--color-text-dark-secondary)">
            ${atk.skillName} &nbsp;|&nbsp; Damage: <strong>${atk.damageCode}</strong>
          </p>
          <label style="display:block">
            Target:
            <select id="cc-target" style="width:100%;margin-top:4px">${targetOptions}</select>
          </label>
        </div>`,
      buttons: [
        {
          label: 'Confirm',
          action: 'confirm',
          default: true,
          callback: (_e, _b, dlg) => {
            targetId  = dlg.element.querySelector('#cc-target')?.value ?? null;
            confirmed = true;
          },
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    if (!confirmed || !targetId) return;

    const defActor = game.actors.get(targetId);
    if (!defActor) return;

    const def = await SR3EActor._buildCCParticipant(defActor);
    if (!def) return;   // defaulting cancelled

    await SR3EActor.postCybercombatCard({
      attackerActorId:  this.id,
      defenderActorId:  targetId,

      atkLabel:         atk.label,
      atkSkillName:     atk.skillName,
      atkSkillDice:     atk.skillDice,
      atkHackPoolAvail: atk.hackPoolAvail,
      atkTN:            atk.tn,
      atkDamageCode:    atk.damageCode,
      atkDamageBase:    atk.damageBase,
      atkFirewall:      atk.firewall,
      atkSoakPool:      atk.soakPool,
      atkUserMode:      atk.userMode,

      defLabel:         def.label,
      defSkillName:     def.skillName,
      defSkillDice:     def.skillDice,
      defHackPoolAvail: def.hackPoolAvail,
      defTN:            def.tn,
      defDamageCode:    def.damageCode,
      defDamageBase:    def.damageBase,
      defFirewall:      def.firewall,
      defSoakPool:      def.soakPool,
      defUserMode:      def.userMode,

      attackerProgramId:       atk.programId,
      attackerOperatorActorId: atk.operatorActorId,
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Matrix combat — host-based target resolution                        */
  /* ------------------------------------------------------------------ */

  static _getMatrixCombatTargets(actorId) {
    const actor = game.actors.get(actorId);
    if (!actor) return [];
    const hostId = actor.system.activeHostId ?? '';
    if (!hostId) return [];

    return game.actors.filter(a => {
      if (a.id === actorId) return false;
      // Deployed IC bypass the template filter — deployment is an explicit GM action
      if (a.type === 'ic') return (a.system.activeHostId ?? '') === hostId && (a.system.deployed ?? false);
      // All other types: respect the template flag
      if (a.getFlag('The2ndChumming3e', 'isTemplate') === true) return false;
      if (a.type === 'agent')
        return (a.system.activeHostId ?? '') === hostId;
      if (a.type === 'character' || a.type === 'npc')
        return (a.system.activeHostId ?? '') === hostId && !!(a.system.matrixUserMode ?? '');
      return false;
    });
  }

  static async _buildCCParticipant(actor) {
    const sys = actor.system;

    if (actor.type === 'ic') {
      const rating   = sys.rating ?? 1;
      const dmgCode  = sys.damage?.trim() || `${rating}S`;
      const firewall = SR3EActor._getMatrixFirewall(actor.id);
      return {
        label: 'IC', skillName: `Cybercombat (Rating ${rating})`,
        skillDice: rating, hackPoolAvail: 0, tn: 4,
        damageCode: dmgCode, damageBase: SR3EItem.parseDamageCode(dmgCode),
        firewall, soakPool: rating, userMode: '',
        programId: null, operatorActorId: null,
      };
    }

    if (actor.type === 'agent') {
      const rating    = sys.rating ?? 1;
      const firewall  = SR3EActor._getMatrixFirewall(actor.id);
      const opId      = sys.operatorActorId ?? '';
      const operator  = opId ? game.actors.get(opId) : null;
      let dmgCode     = `${rating}L`;
      let programId   = null;

      if (operator) {
        const progs = operator.items.filter(i => i.type === 'program' && /attack|offensive/i.test(i.system.category ?? ''));
        const best  = progs.reduce((b, p) => {
          const eR  = (p.system.currentRating ?? 0) > 0 ? p.system.currentRating : p.system.rating;
          const bR  = b ? ((b.system.currentRating ?? 0) > 0 ? b.system.currentRating : b.system.rating) : 0;
          return eR > bR ? p : b;
        }, null);
        if (best) {
          const effR = (best.system.currentRating ?? 0) > 0 ? best.system.currentRating : best.system.rating;
          dmgCode   = `${effR}S`;
          programId = best.id;
        }
      }

      return {
        label: 'Agent', skillName: `Cybercombat (Rating ${rating})`,
        skillDice: rating, hackPoolAvail: 0, tn: 4,
        damageCode: dmgCode, damageBase: SR3EItem.parseDamageCode(dmgCode),
        firewall, soakPool: rating, userMode: '',
        programId, operatorActorId: opId || null,
      };
    }

    // character / npc (decker)
    const ccSkill      = actor.items.find(i => i.type === 'skill' && i.name.toLowerCase().includes('cybercombat'));
    const isDefaulting = !ccSkill;
    const d            = sys.derived ?? {};
    const mcmPenalty   = actor._matrixTNPenalty?.() ?? 0;
    const deckId       = sys.equippedCyberdeck ?? '';
    const deck         = deckId ? actor.items.get(deckId) : null;

    let ccRating, hackPoolAvail, skillName, defTnMod = 0;
    if (isDefaulting) {
      // SR3 Default Table — let the user choose specialization / skill / attribute.
      const def = await game.sr3e.SR3EItem.promptDefaultChoice(actor, {
        linkedAttr: 'intelligence',
        title:      `Defaulting — ${actor.name}`,
        message:    `${actor.name} has no <strong>Cybercombat</strong> skill — choose how to default:`,
      });
      if (!def) return null;   // cancelled
      ccRating      = def.pool;
      defTnMod      = def.tnMod;
      hackPoolAvail = def.allowPool ? (d.availableHackingPool ?? d.hackingPool ?? 0) : 0;
      skillName     = def.label;
    } else {
      ccRating      = ccSkill.system.rating ?? 0;
      hackPoolAvail = d.availableHackingPool ?? d.hackingPool ?? 0;
      skillName     = `Cybercombat ${ccRating}`;
    }

    const deckMpcp     = deck?.system?.attributes?.mpcp?.base ?? ccRating;
    const deckFirewall = deck?.system?.attributes?.firewall?.base ?? 0;
    const attackProg   = actor.items.find(i => i.type === 'program' && /attack|offensive/i.test(i.system.category ?? ''));
    const progEffR     = attackProg ? ((attackProg.system.currentRating ?? 0) > 0 ? attackProg.system.currentRating : attackProg.system.rating) : 0;
    const dmgCode      = progEffR > 0 ? `${progEffR}S` : `${deckMpcp}L`;

    return {
      label: 'Decker', skillName,
      skillDice: ccRating, hackPoolAvail, tn: 4 + mcmPenalty + defTnMod,
      damageCode: dmgCode, damageBase: SR3EItem.parseDamageCode(dmgCode),
      firewall: deckFirewall, soakPool: deckMpcp, userMode: sys.matrixUserMode ?? '',
      programId: attackProg?.id ?? null, operatorActorId: null,
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Matrix combat — Cybercombat boxing card                            */
  /* ------------------------------------------------------------------ */

  static async postCybercombatCard(ctx) {
    const atk = game.actors.get(ctx.attackerActorId);
    const def = game.actors.get(ctx.defenderActorId);
    if (!atk || !def) return;

    const payload = JSON.stringify(ctx).replace(/'/g, '&#39;');

    const _vrBadge = (mode) => {
      if (!mode) return '';
      const map = {
        'VR-Hot':  { label: 'VR-Hot',  color: 'var(--sr-red)' },
        'VR-Cold': { label: 'VR-Cold', color: 'var(--sr-accent)' },
        'AR':      { label: 'AR',       color: 'var(--sr-green)' },
        'TRM':     { label: 'Tortoise', color: 'var(--sr-muted)' },
      };
      const m = map[mode];
      if (!m) return '';
      return `<span style="font-size:10px;font-weight:600;color:${m.color};margin-left:4px">[${m.label}]</span>`;
    };

    const _corner = (name, label, skillName, skillDice, hackPoolAvail, tn, damageCode, firewall, soakPool, userMode,
                     skillClass, poolClass, tnClass, dmgClass) => `
      <div class="sr-melee-corner">
        <div class="sr-melee-name">${name} <span style="font-size:11px;color:var(--sr-muted)">[${label}]</span>${_vrBadge(userMode)}</div>
        <div class="sr-melee-skill">${skillName}</div>
        <div class="sr-melee-field-row">
          <span>Damage:</span>
          <div><input type="text" class="${dmgClass}" value="${damageCode}" style="width:55px"/></div>
        </div>
        <div class="sr-melee-field-row">
          <span>Skill:</span>
          <div style="display:flex;align-items:center;gap:4px">
            <input type="number" class="${skillClass}" value="${skillDice}" min="1" max="30" style="width:40px"/>
          </div>
        </div>
        <div class="sr-melee-field-row">
          <span>Pool:</span>
          <div style="display:flex;align-items:center;gap:4px">
            <input type="number" class="${poolClass}" value="0" min="0" max="${hackPoolAvail}" style="width:40px"/>
            <span>/ ${hackPoolAvail}</span>
          </div>
        </div>
        <div class="sr-melee-field-row">
          <span>TN:</span>
          <div>
            <input type="number" class="${tnClass}" value="${tn}" min="2" max="30" style="width:40px"/>
          </div>
        </div>
        <div style="font-size:10px;color:var(--sr-muted);margin-top:4px">
          Firewall: ${firewall} &nbsp;·&nbsp; Soak pool: ${soakPool}
        </div>
      </div>`;

    await ChatMessage.create({
      speaker: { alias: 'Matrix Combat' },
      content: `
        <div class="sr-roll-card sr-melee-card">
          <div class="sr-roll-header">💻 CYBERCOMBAT — ${atk.name} vs ${def.name}</div>
          <div class="sr-melee-boxing">
            ${_corner(atk.name, ctx.atkLabel, ctx.atkSkillName, ctx.atkSkillDice, ctx.atkHackPoolAvail, ctx.atkTN,
                      ctx.atkDamageCode, ctx.atkFirewall, ctx.atkSoakPool, ctx.atkUserMode ?? '',
                      'sr-cc-atk-skill', 'sr-cc-atk-pool', 'sr-cc-atk-tn', 'sr-cc-atk-dmg')}
            <div class="sr-melee-vs">VS</div>
            ${_corner(def.name, ctx.defLabel, ctx.defSkillName, ctx.defSkillDice, ctx.defHackPoolAvail, ctx.defTN,
                      ctx.defDamageCode, ctx.defFirewall, ctx.defSoakPool, ctx.defUserMode ?? '',
                      'sr-cc-def-skill', 'sr-cc-def-pool', 'sr-cc-def-tn', 'sr-cc-def-dmg')}
          </div>
          <div class="sr-soak-action" style="text-align:center;padding:4px 0">
            <button class="sr-cc-roll-btn" data-payload='${payload}'>
              💻 Roll Cybercombat
            </button>
          </div>
        </div>`,
      style: CONST.CHAT_MESSAGE_STYLES.ROLL,
    });
  }

  static async handleCybercombatRoll(btn) {
    const ctx  = JSON.parse(btn.dataset.payload);
    const card = btn.closest('.sr-melee-card');

    btn.disabled    = true;
    btn.textContent = '⏳ Rolling…';

    // Read live values from card
    const atkSkillDice = parseInt(card.querySelector('.sr-cc-atk-skill')?.value) || ctx.atkSkillDice || 1;
    const defSkillDice = parseInt(card.querySelector('.sr-cc-def-skill')?.value) || ctx.defSkillDice || 1;
    const atkHackPool  = parseInt(card.querySelector('.sr-cc-atk-pool')?.value)  || 0;
    const defHackPool  = parseInt(card.querySelector('.sr-cc-def-pool')?.value)  || 0;
    const atkTN        = Math.max(2, parseInt(card.querySelector('.sr-cc-atk-tn')?.value)  || 4);
    const defTN        = Math.max(2, parseInt(card.querySelector('.sr-cc-def-tn')?.value)  || 4);
    const atkDmgCode   = card.querySelector('.sr-cc-atk-dmg')?.value.trim() || ctx.atkDamageCode;
    const defDmgCode   = card.querySelector('.sr-cc-def-dmg')?.value.trim() || ctx.defDamageCode;
    const atkDmgBase   = SR3EItem.parseDamageCode(atkDmgCode) ?? ctx.atkDamageBase;
    const defDmgBase   = SR3EItem.parseDamageCode(defDmgCode) ?? ctx.defDamageBase;

    const atkPool = Math.max(1, atkSkillDice + atkHackPool);
    const defPool = Math.max(1, defSkillDice + defHackPool);

    const atkActor = game.actors.get(ctx.attackerActorId);
    const defActor = game.actors.get(ctx.defenderActorId);
    if (!atkActor || !defActor) return;

    // Spend hacking pool for decker side
    if (atkHackPool > 0 && (atkActor.type === 'character' || atkActor.type === 'npc')) {
      const avail = atkActor.system.derived?.availableHackingPool ?? 0;
      const spend = Math.min(atkHackPool, avail);
      if (spend > 0) await atkActor.update({ 'system.hackingPoolSpent': (atkActor.system.hackingPoolSpent ?? 0) + spend });
    }

    // Program degradation — attacker's program (may be on operator's deck if agent)
    if (ctx.attackerProgramId) {
      const progOwner = ctx.attackerOperatorActorId
        ? game.actors.get(ctx.attackerOperatorActorId)
        : atkActor;
      const prog = progOwner?.items.get(ctx.attackerProgramId);
      if (prog?.system?.degradable) {
        const effR     = (prog.system.currentRating ?? 0) > 0 ? prog.system.currentRating : prog.system.rating;
        const progName = prog.name;
        if (effR <= 1) {
          await prog.delete();
          await ChatMessage.create({
            content: `
              <div class="sr-roll-card">
                <div class="sr-roll-header" style="color:var(--sr-red)">💻 Program Crash — ${progName}</div>
                <div class="sr-roll-result">${progName} (Rating ${effR}) degraded to 0 — crashed and removed from ${progOwner.name}'s deck.</div>
              </div>`,
            style: CONST.CHAT_MESSAGE_STYLES.OTHER,
          });
        } else {
          await prog.update({ 'system.currentRating': effR - 1 });
          await ChatMessage.create({
            content: `
              <div class="sr-roll-card">
                <div class="sr-roll-header" style="color:var(--sr-amber)">💻 Program Degraded — ${progName}</div>
                <div class="sr-roll-result">${progName} degraded: Rating ${effR} → ${effR - 1} (on ${progOwner.name}'s deck)</div>
              </div>`,
            style: CONST.CHAT_MESSAGE_STYLES.OTHER,
          });
        }
      }
    }

    // Roll both sides
    const atkDice = atkActor._rollWave(atkPool, atkTN, true);
    const defDice = defActor._rollWave(defPool, defTN, true);

    const atkOnes   = atkDice.filter(d => d.isOne).length;
    const defOnes   = defDice.filter(d => d.isOne).length;
    const atkGlitch = atkOnes > Math.floor(atkPool / 2);
    const defGlitch = defOnes > Math.floor(defPool / 2);

    // Post wave cards for both sides
    await atkActor._postWaveCard({
      actorId: ctx.attackerActorId,
      label:   `💻 ${atkActor.name} attacks`,
      tn: atkTN, pool: atkPool, wave: 0,
      dice: atkDice, ones: atkOnes, glitch: atkGlitch,
      isWeaponRoll: false, isMeleeAtk: true, meleeCtx: null,
    });
    await defActor._postWaveCard({
      actorId: ctx.defenderActorId,
      label:   `💻 ${defActor.name} defends`,
      tn: defTN, pool: defPool, wave: 0,
      dice: defDice, ones: defOnes, glitch: defGlitch,
      isWeaponRoll: false, isMeleeDef: true, meleeCtx: null,
    });

    // Post result
    await SR3EActor._postCCResult({
      ...ctx,
      atkPool, atkTN, defPool, defTN,
      atkDamageCode: atkDmgCode, atkDamageBase: atkDmgBase,
      defDamageCode: defDmgCode, defDamageBase: defDmgBase,
    }, atkDice, defDice);
  }

  static async _postCCResult(ctx, atkDice, defDice) {
    const atkHits = atkDice.filter(d => d.success).length;
    const defHits = defDice.filter(d => d.success).length;
    const net     = Math.abs(atkHits - defHits);

    const atkActor = game.actors.get(ctx.attackerActorId);
    const defActor = game.actors.get(ctx.defenderActorId);

    let resultHtml;

    if (atkHits === defHits) {
      resultHtml = `
        <div class="sr-melee-result sr-melee-tie">
          🤝 Tie! ${atkHits} vs ${defHits} — no damage dealt.
        </div>`;
    } else {
      const atkWins = atkHits > defHits;
      const winner  = atkWins ? atkActor : defActor;
      const loser   = atkWins ? defActor : atkActor;

      const winnerDmgBase = atkWins ? ctx.atkDamageBase : ctx.defDamageBase;
      const winnerDmgCode = atkWins ? ctx.atkDamageCode : ctx.defDamageCode;
      const loserFirewall = atkWins ? (ctx.defFirewall ?? 0) : (ctx.atkFirewall ?? 0);
      const loserSoakPool = atkWins ? (ctx.defSoakPool ?? 1) : (ctx.atkSoakPool ?? 1);

      const staged     = SR3EItem.stageDamage(winnerDmgBase, net);
      const isVRHot    = (loser?.system?.matrixUserMode ?? '') === 'VR-Hot';
      const isStun     = staged.isStun && !isVRHot;
      const trackLabel = isStun ? 'Stun' : 'Physical';

      const stagingHtml = `
        <div class="sr-staging-result">
          💻 ${atkWins ? '⚔ Attacker' : '🛡 Defender'} wins! ${atkHits} vs ${defHits} (net ${net}):
          ${winnerDmgCode} → <strong>${staged.power}${staged.level} ${trackLabel}</strong>
          ${isVRHot ? '<span style="color:var(--sr-red);font-size:11px"> (VR-Hot: Physical)</span>' : ''}
        </div>`;

      const loserIsIC = loser?.type === 'ic' || loser?.type === 'agent';
      let soakBtn;
      if (loserIsIC) {
        const resistCtx = JSON.stringify({
          icActorId:      loser.id,
          stagedPower:    staged.power,
          stagedLevel:    staged.level,
          isStun:         staged.isStun,
          rawDamage:      winnerDmgCode,
          firewallRating: loserFirewall,
        }).replace(/'/g, '&#39;');
        soakBtn = `
          <div class="sr-soak-action">
            <button class="sr-matrix-ic-resist-btn" data-payload='${resistCtx}'>
              💻 ${loser.name}: Resist Matrix Damage (Rating ${loserSoakPool})
            </button>
          </div>`;
      } else {
        const resistCtx = JSON.stringify({
          deckerActorId:  loser.id,
          icActorId:      winner?.id ?? '',
          stagedPower:    staged.power,
          stagedLevel:    staged.level,
          isStun,
          rawDamage:      winnerDmgCode,
          deckerMPCP:     loserSoakPool,
          firewallRating: loserFirewall,
        }).replace(/'/g, '&#39;');
        soakBtn = `
          <div class="sr-soak-action">
            <button class="sr-matrix-decker-resist-btn" data-payload='${resistCtx}'>
              🛡 ${loser.name}: Resist Matrix Damage (MPCP ${loserSoakPool})
            </button>
          </div>`;
      }

      resultHtml = stagingHtml + soakBtn;
    }

    await ChatMessage.create({
      speaker: { alias: 'Matrix Combat' },
      content: `
        <div class="sr-roll-card">
          <div class="sr-roll-header">💻 Cybercombat Result — ${atkActor?.name ?? 'Attacker'} vs ${defActor?.name ?? 'Defender'}</div>
          ${resultHtml}
        </div>`,
      style: CONST.CHAT_MESSAGE_STYLES.ROLL,
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Matrix combat — Roll a program from the matrix tab                 */
  /* ------------------------------------------------------------------ */

  async rollProgram(item, options = {}) {
    const sys = this.system;
    const d   = sys.derived ?? {};

    const ccSkill       = this.items.find(i => i.type === 'skill' && i.name.toLowerCase().includes('cybercombat'));
    const isDefaulting  = !ccSkill;
    const mcmPenalty    = this._matrixTNPenalty();

    // SR3 Default Table — choose how to default before building the dialog.
    let ccRating, availHackPool, defTnMod = 0, ccNote = '';
    if (isDefaulting) {
      const def = await game.sr3e.SR3EItem.promptDefaultChoice(this, {
        linkedAttr: 'intelligence',
        title:      `Defaulting — ${this.name}`,
        message:    `${this.name} has no <strong>Cybercombat</strong> skill — choose how to default:`,
      });
      if (!def) return;   // cancelled
      ccRating      = def.pool;
      defTnMod      = def.tnMod;
      availHackPool = def.allowPool ? (d.availableHackingPool ?? d.hackingPool ?? 0) : 0;
      ccNote        = ` <span style="color:var(--sr-amber)">(${def.label})</span>`;
    } else {
      ccRating      = ccSkill.system.rating ?? 0;
      availHackPool = d.availableHackingPool ?? d.hackingPool ?? 0;
    }

    const category    = (item.system.category ?? '').toLowerCase();
    const isOffensive = /exploit|attack|offensive|hammer/.test(category);

    const _combatIds = game.combat?.combatants.size
      ? new Set(game.combat.combatants.contents.map(c => c.actorId).filter(Boolean))
      : null;
    const icActors   = isOffensive ? game.actors.filter(a => a.type === 'ic' && game.sr3e.isLiveActor(a) && (!_combatIds || _combatIds.has(a.id))) : [];
    const hostActors = game.actors.filter(a => a.type === 'host' && game.sr3e.isLiveActor(a));

    const firstAlertPenalty = hostActors.length ? (hostActors[0]?.system?.derived?.alertTNPenalty ?? 0) : 0;
    const defaultTN = 6 + mcmPenalty + firstAlertPenalty + defTnMod;   // defaulting TN modifier baked in
    const tnLabel   = isOffensive ? 'Target System Rating' : 'System Rating / Threshold';

    const icOptions = isOffensive && icActors.length
      ? icActors.map(a => `<option value="${a.id}">${a.name} (Rating ${a.system.rating ?? 1}, Sys ${a.system.systemRating ?? 6})</option>`).join('')
      : '';
    const hostOptions = hostActors.length
      ? `<option value="">— none —</option>` + hostActors.map(a => {
          const ap = a.system?.derived?.alertTNPenalty ?? 0;
          return `<option value="${a.id}">${a.name} (Tier: ${a.system.securityTierName ?? '?'}, Threshold: ${a.system.securityTierThreshold ?? 0}${ap > 0 ? `, Alert +${ap}TN` : ''})</option>`;
        }).join('')
      : null;
    const mcmNote = mcmPenalty > 0
      ? `<p style="margin:0 0 8px;font-size:11px;color:var(--sr-red)">⚠ Deck damage: +${mcmPenalty} TN penalty included in default TN</p>`
      : '';
    const alertNote = firstAlertPenalty > 0
      ? `<p style="margin:0 0 8px;font-size:11px;color:var(--sr-amber)">⚠ Host alert: +${firstAlertPenalty} TN included in default TN</p>`
      : '';

    let hackPoolDice = 0;
    let tn           = defaultTN;
    let targetId     = null;
    let hostActorId  = null;
    let confirmed    = false;

    await foundry.applications.api.DialogV2.wait({
      window: { title: `${item.name}: Roll Program` },
      content: `
        <div style="padding:8px 0">
          ${mcmNote}${alertNote}
          <p style="margin:0 0 8px;font-size:12px;color:var(--color-text-dark-secondary)">
            ${item.name} [${item.system.category || item.system.type || '?'}] Rating ${item.system.rating ?? 0}
          </p>
          <p style="margin:0 0 8px;font-size:12px;color:var(--color-text-dark-secondary)">
            Cybercombat: <strong>${ccRating}</strong>${ccNote} &nbsp;|&nbsp; Hacking Pool: <strong>${availHackPool}</strong>
          </p>
          ${isOffensive && icOptions ? `
          <label style="display:block;margin-bottom:8px">
            Target IC:
            <select id="prog-target" style="width:100%;margin-top:4px">${icOptions}</select>
          </label>` : ''}
          <label style="display:block;margin-bottom:8px">
            Allocate Hacking Pool (0–${availHackPool}):
            <input type="number" id="prog-pool" value="0" min="0" max="${availHackPool}" style="width:60px;margin-left:4px">
          </label>
          <label style="display:block;margin-bottom:8px">
            TN (${tnLabel}):
            <input type="number" id="prog-tn" value="${defaultTN}" min="2" style="width:60px;margin-left:4px">
          </label>
          ${hostOptions ? `
          <label style="display:block">
            Host (for Overwatch tracking):
            <select id="prog-host" style="width:100%;margin-top:4px">${hostOptions}</select>
          </label>` : ''}
        </div>`,
      buttons: [
        {
          label: 'Roll',
          action: 'confirm',
          default: true,
          callback: (_e, _b, dlg) => {
            hackPoolDice = Math.min(availHackPool, parseInt(dlg.element.querySelector('#prog-pool')?.value) || 0);
            tn           = parseInt(dlg.element.querySelector('#prog-tn')?.value) || defaultTN;
            targetId     = dlg.element.querySelector('#prog-target')?.value || null;
            hostActorId  = dlg.element.querySelector('#prog-host')?.value   || null;
            confirmed    = true;
          },
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    if (!confirmed) return;

    const pool = ccRating + hackPoolDice;
    if (pool < 1) { ui.notifications.warn(`${item.name}: roll pool is 0.`); return; }

    await this.spendHackingPool(hackPoolDice);

    const hostActor       = hostActorId ? game.actors.get(hostActorId) : null;
    const securityThreshold = hostActor?.system?.securityTierThreshold ?? 0;

    // Offensive programs damage = program rating + S by default
    const damageCode = `${item.system.rating ?? 1}S`;
    const damageBase = SR3EItem.parseDamageCode(damageCode);

    const label = `${this.name}: ${item.name} (Rating ${item.system.rating ?? 0})`;
    await this.rollPool(pool, tn, label, {
      isProgramRoll:  true,
      programContext: {
        actorId:           this.id,
        itemId:            item.id,
        category,
        isOffensive,
        tn,
        targetActorId:     isOffensive ? (targetId ?? null) : null,
        hostActorId:       hostActorId ?? null,
        securityThreshold,
        damageCode,
        damageBase,
      },
      ...(options.physicalDice ? { physicalDice: true } : {}),
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Matrix — General hacking action (3-step threshold check)           */
  /* ------------------------------------------------------------------ */

  async rollHackingAction() {
    const sys = this.system;
    const d   = sys.derived ?? {};

    const hackSkill      = this.items.find(i => i.type === 'skill' && /hacking|computer/i.test(i.name));
    const isDefaulting   = !hackSkill;
    const mcmPenalty     = this._matrixTNPenalty();
    const mcmNote        = mcmPenalty > 0
      ? `<p style="margin:0 0 8px;font-size:11px;color:var(--sr-red)">⚠ Deck damage: +${mcmPenalty} TN penalty included in default TN</p>`
      : '';

    const hostActors = game.actors.filter(a => a.type === 'host' && game.sr3e.isLiveActor(a));

    // If actor is already connected to a host, use it without prompting for selection
    const activeHostId   = sys.activeHostId ?? '';
    const connectedHost  = activeHostId ? game.actors.get(activeHostId) : null;
    const isConnected    = !!connectedHost;

    if (!isConnected && !hostActors.length) {
      ui.notifications.warn('No host actors found. Create a host actor first.');
      return;
    }

    // SR3 Default Table — choose how to default before building the dialog.
    let hackRating, availHackPool, defTnMod = 0, hackNote = '';
    if (isDefaulting) {
      const def = await game.sr3e.SR3EItem.promptDefaultChoice(this, {
        linkedAttr: 'intelligence',
        title:      `Defaulting — ${this.name}`,
        message:    `${this.name} has no <strong>Hacking/Computer</strong> skill — choose how to default:`,
      });
      if (!def) return;   // cancelled
      hackRating    = def.pool;
      defTnMod      = def.tnMod;
      availHackPool = def.allowPool ? (d.availableHackingPool ?? d.hackingPool ?? 0) : 0;
      hackNote      = ` <span style="color:var(--sr-amber)">(${def.label})</span>`;
    } else {
      hackRating    = hackSkill.system.rating ?? 0;
      availHackPool = d.availableHackingPool ?? d.hackingPool ?? 0;
    }

    const primaryHost      = connectedHost ?? hostActors[0];
    const alertPenalty     = primaryHost?.system?.derived?.alertTNPenalty ?? 0;
    const defaultTN        = (primaryHost?.system.systemRating ?? 6) + mcmPenalty + alertPenalty + defTnMod;   // defaulting TN modifier baked in
    const defaultThresh    = primaryHost?.system.securityTierThreshold ?? 1;
    const alertNote        = alertPenalty > 0
      ? `<p style="margin:0 0 8px;font-size:11px;color:var(--sr-amber)">⚠ Host alert: +${alertPenalty} TN included in default TN</p>`
      : '';

    // Node context for label
    const currentNodeId  = sys.currentMatrixNode ?? '';
    const currentNode    = primaryHost?.system?.nodes?.find(n => n.id === currentNodeId);
    const nodeTag        = currentNode ? ` [${currentNode.abbreviation ?? currentNode.name}]` : '';

    const hostOptions = hostActors.map(a => {
      const ap = a.system?.derived?.alertTNPenalty ?? 0;
      const alertTag = ap > 0 ? ` ⚠+${ap}TN` : '';
      return `<option value="${a.id}" ${a.id === activeHostId ? 'selected' : ''}>${a.name} (Sys ${a.system.systemRating ?? 6}, Threshold ${a.system.securityTierThreshold ?? 1}${alertTag})</option>`;
    }).join('');

    const hostRow = isConnected
      ? `<p style="margin:0 0 8px;font-size:12px;color:var(--color-text-dark-secondary)">
           Host: <strong>${primaryHost.name}</strong>${nodeTag ? `&nbsp;|&nbsp; Node: <strong>${currentNode.abbreviation ?? currentNode.name}</strong>` : ''}
         </p>`
      : `<label style="display:block;margin-bottom:8px">Host:
           <select id="ha-host" style="width:100%;margin-top:4px">${hostOptions}</select>
         </label>`;

    let confirmed         = false;
    let hostActorId       = primaryHost?.id ?? null;
    let actionName        = 'Hacking Action';
    let tn                = defaultTN;
    let securityThreshold = defaultThresh;
    let hackPoolDice      = 0;
    let overwatchOnFail   = true;

    await foundry.applications.api.DialogV2.wait({
      window: { title: `${this.name}: Hacking Action` },
      content: `
        <div style="padding:8px 0">
          ${mcmNote}${alertNote}
          <p style="margin:0 0 8px;font-size:12px;color:var(--color-text-dark-secondary)">
            Hacking: <strong>${hackRating}</strong>${hackNote} &nbsp;|&nbsp; Hacking Pool: <strong>${availHackPool}</strong>
          </p>
          ${hostRow}
          <label style="display:block;margin-bottom:8px">
            Action name:
            <input type="text" id="ha-name" value="Hacking Action" style="width:100%;margin-top:4px">
          </label>
          <div style="display:flex;gap:12px;margin-bottom:8px">
            <label>TN (System Rating):
              <input type="number" id="ha-tn" value="${defaultTN}" min="2" style="width:60px;margin-left:4px">
            </label>
            <label>Security Threshold:
              <input type="number" id="ha-threshold" value="${defaultThresh}" min="0" style="width:60px;margin-left:4px">
            </label>
          </div>
          <label style="display:block;margin-bottom:8px">
            Allocate Hacking Pool (0–${availHackPool}):
            <input type="number" id="ha-pool" value="0" min="0" max="${availHackPool}" style="width:60px;margin-left:4px">
          </label>
          <label style="display:flex;align-items:center;gap:6px">
            <input type="checkbox" id="ha-overwatch" checked>
            Increment Overwatch if threshold missed
          </label>
        </div>`,
      buttons: [
        {
          label: 'Roll',
          action: 'confirm',
          default: true,
          callback: (_e, _b, dlg) => {
            confirmed         = true;
            if (!isConnected) hostActorId = dlg.element.querySelector('#ha-host')?.value || null;
            actionName        = dlg.element.querySelector('#ha-name')?.value?.trim() || 'Hacking Action';
            tn                = Math.max(2, parseInt(dlg.element.querySelector('#ha-tn')?.value) || defaultTN);
            securityThreshold = parseInt(dlg.element.querySelector('#ha-threshold')?.value) || 0;
            hackPoolDice      = Math.min(availHackPool, parseInt(dlg.element.querySelector('#ha-pool')?.value) || 0);
            overwatchOnFail   = dlg.element.querySelector('#ha-overwatch')?.checked ?? true;
          },
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });

    if (!confirmed || !hostActorId) return;

    const pool = hackRating + hackPoolDice;
    if (pool < 1) { ui.notifications.warn('Hacking pool is 0.'); return; }

    await this.spendHackingPool(hackPoolDice);

    await this.rollPool(pool, tn, `${this.name}: ${actionName}${nodeTag}`, {
      isHackingActionRoll:  true,
      hackingActionContext: {
        attackerActorId: this.id,
        hostActorId,
        securityThreshold,
        overwatchOnFail,
        actionName,
      },
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Matrix — Roll a specific node prompt                               */
  /* ------------------------------------------------------------------ */

  async rollNodePrompt(promptData, nodeId) {
    const sys = this.system;
    const d   = sys.derived ?? {};

    const isHacking    = promptData.overwatchOnFail ?? false;
    const grantsAccess = promptData.grantsAccess ?? false;
    const promptName   = promptData.name ?? 'Node Action';
    const requiresMark = promptData.requiresMark ?? false;

    const marks = Array.isArray(sys.matrixMarks) ? sys.matrixMarks : [];
    if (requiresMark && nodeId && !marks.includes(nodeId)) {
      const proceed = await foundry.applications.api.DialogV2.confirm({
        window: { title: promptName },
        content: `<p style="padding:8px 0">This action requires a mark on this node. Proceed anyway?</p>`,
      });
      if (!proceed) return;
    }

    const skillName     = isHacking ? 'hacking' : 'computer';
    const skill         = this.items.find(i => i.type === 'skill' && new RegExp(skillName, 'i').test(i.name));
    const isDefaulting  = !skill;
    const skillLabel    = isHacking ? 'Hacking' : 'Computer';
    const mcmPenalty    = this._matrixTNPenalty?.() ?? 0;

    // SR3 Default Table — choose how to default before building the dialog.
    let skillRating, availHackPool, defTnMod = 0, skillNote = '';
    if (isDefaulting) {
      const def = await game.sr3e.SR3EItem.promptDefaultChoice(this, {
        linkedAttr: 'intelligence',
        title:      `Defaulting — ${this.name}`,
        message:    `${this.name} has no <strong>${skillLabel}</strong> skill — choose how to default:`,
      });
      if (!def) return;   // cancelled
      skillRating   = def.pool;
      defTnMod      = def.tnMod;
      availHackPool = def.allowPool ? (d.availableHackingPool ?? d.hackingPool ?? 0) : 0;
      skillNote     = ` <span style="color:var(--sr-amber)">(${def.label})</span>`;
    } else {
      skillRating   = skill.system.rating ?? 0;
      availHackPool = d.availableHackingPool ?? d.hackingPool ?? 0;
    }

    const hostId     = sys.activeHostId ?? '';
    const hostActor  = hostId ? game.actors.get(hostId) : null;
    const alertPenalty = hostActor?.system?.derived?.alertTNPenalty ?? 0;
    const defaultTN  = (hostActor?.system?.systemRating ?? 6) + mcmPenalty + alertPenalty + defTnMod;   // defaulting TN modifier baked in
    const threshold  = isHacking ? (hostActor?.system?.securityTierThreshold ?? 0) : 0;

    const mcmNote   = mcmPenalty > 0 ? `<p style="margin:0 0 6px;font-size:11px;color:var(--sr-red)">⚠ Deck damage: +${mcmPenalty} TN</p>` : '';
    const alertNote = alertPenalty > 0 ? `<p style="margin:0 0 6px;font-size:11px;color:var(--sr-amber)">⚠ Host alert: +${alertPenalty} TN</p>` : '';

    let hackPoolDice = 0;
    let tn           = defaultTN;
    let confirmed    = false;

    await foundry.applications.api.DialogV2.wait({
      window: { title: `${this.name}: ${promptName}` },
      content: `
        <div style="padding:8px 0">
          ${mcmNote}${alertNote}
          ${promptData.description ? `<p style="margin:0 0 8px;font-size:12px;color:var(--color-text-dark-secondary)">${promptData.description}</p>` : ''}
          <p style="margin:0 0 8px;font-size:12px;color:var(--color-text-dark-secondary)">
            ${skillLabel}: <strong>${skillRating}</strong>${skillNote}
            &nbsp;|&nbsp; Hacking Pool: <strong>${availHackPool}</strong>
          </p>
          <p style="margin:0 0 8px;font-size:12px;color:var(--color-text-dark-secondary)">
            Test: <em>${promptData.test ?? 'vs System Rating'}</em>
            ${isHacking && threshold > 0 ? `&nbsp;|&nbsp; Threshold: <strong>${threshold}</strong>` : ''}
          </p>
          <label style="display:block;margin-bottom:8px">
            Allocate Hacking Pool (0–${availHackPool}):
            <input type="number" id="np-pool" value="0" min="0" max="${availHackPool}" style="width:60px;margin-left:4px">
          </label>
          <label style="display:block">
            TN:
            <input type="number" id="np-tn" value="${defaultTN}" min="2" style="width:60px;margin-left:4px">
          </label>
        </div>`,
      buttons: [
        {
          label: 'Roll',
          action: 'confirm',
          default: true,
          callback: (_e, _b, dlg) => {
            hackPoolDice = Math.min(availHackPool, parseInt(dlg.element.querySelector('#np-pool')?.value) || 0);
            tn           = Math.max(2, parseInt(dlg.element.querySelector('#np-tn')?.value) || defaultTN);
            confirmed    = true;
          },
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    if (!confirmed) return;

    const pool = skillRating + hackPoolDice;
    if (pool < 1) { ui.notifications.warn(`${promptName}: roll pool is 0.`); return; }

    if (hackPoolDice > 0) await this.spendHackingPool(hackPoolDice);

    const label = `${this.name}: ${promptName}`;

    if (isHacking) {
      await this.rollPool(pool, tn, label, {
        isHackingActionRoll:  true,
        hackingActionContext: {
          attackerActorId:   this.id,
          hostActorId:       hostId,
          securityThreshold: threshold,
          overwatchOnFail:   true,
          actionName:        promptName,
          grantsAccess,
          nodeId,
        },
      });
    } else {
      await this.rollPool(pool, tn, label);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Dumpshock — manual trigger for GM                                   */
  /* ------------------------------------------------------------------ */

  async rollDumpshock() {
    const isVRHot = (this.system.matrixUserMode ?? '') === 'VR-Hot';
    const isStun  = !isVRHot;

    const hostActors = game.actors.filter(a => a.type === 'host' && game.sr3e.isLiveActor(a));
    const hostOptions = hostActors.length
      ? hostActors.map(a => `<option value="${a.system.systemRating ?? 6}">${a.name} (Sys ${a.system.systemRating ?? 6})</option>`).join('')
      : `<option value="6">Manual (default 6)</option>`;

    let power     = 6;
    let confirmed = false;

    await foundry.applications.api.DialogV2.wait({
      window: { title: `${this.name}: Dumpshock` },
      content: `
        <div style="padding:8px 0">
          <p style="margin:0 0 8px">
            Mode: <strong>${this.system.matrixUserMode || 'Unknown'}</strong> → damage type: <strong>${isStun ? 'Stun' : 'Physical'}</strong>
          </p>
          ${hostActors.length ? `<label style="display:block;margin-bottom:8px">
            Host (sets Power):
            <select id="ds-host" style="width:100%;margin-top:4px">${hostOptions}</select>
          </label>` : ''}
          <label>Dumpshock Power (System Rating):
            <input type="number" id="ds-power" value="6" min="1" style="width:60px;margin-left:4px">
          </label>
        </div>`,
      buttons: [
        {
          label: 'Apply Dumpshock',
          action: 'confirm',
          default: true,
          callback: (_e, _b, dlg) => {
            confirmed = true;
            const hostSel = dlg.element.querySelector('#ds-host');
            if (hostSel) power = parseInt(hostSel.value) || 6;
            const manualPower = parseInt(dlg.element.querySelector('#ds-power')?.value);
            if (!isNaN(manualPower) && manualPower > 0) power = manualPower;
          },
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });

    if (!confirmed) return;

    const trackLabel = isStun ? 'Stun' : 'Physical';
    const soakCtx = JSON.stringify({
      attackerActorId: null,
      targetActorId:   this.id,
      isMelee:         false,
      stagedPower:     power,
      stagedLevel:     'M',
      isStun,
      rawDamage:       `${power}M`,
    }).replace(/'/g, '&#39;');

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `
        <div class="sr-roll-card">
          <div class="sr-roll-header" style="color:var(--sr-red)">⚡ Dumpshock — ${this.name}</div>
          <div class="sr-staging-result">
            Dumpshock ${isVRHot ? '(VR-Hot → Physical)' : '(VR-Cold → Stun)'}: <strong>${power}M ${trackLabel}</strong>
          </div>
          <div class="sr-soak-action">
            <button class="sr-soak-btn" data-payload='${soakCtx}'>🛡 ${this.name}: Resist Dumpshock (Body)</button>
          </div>
        </div>`,
      style: CONST.CHAT_MESSAGE_STYLES.ROLL,
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Overwatch / Convergence helpers                                     */
  /* ------------------------------------------------------------------ */

  static async _incrementOverwatch(hostActorId, attackerActorId) {
    const hostActor = game.actors.get(hostActorId);
    if (!hostActor) return;
    const current = hostActor.system.overwatchCurrent ?? 0;
    const newOW   = Math.min(10, current + 1);
    await hostActor.update({ 'system.overwatchCurrent': newOW });

    await ChatMessage.create({
      content: `
        <div class="sr-roll-card">
          <div class="sr-roll-header" style="color:var(--sr-amber)">⚠ Overwatch: ${newOW}/10 — ${hostActor.name}</div>
          <div style="font-size:12px;color:var(--sr-text);margin-top:4px">Hack attempt failed Security Threshold check.</div>
        </div>`,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
    });

    await SR3EActor._postSheafPrompt(hostActor, newOW);

    if (newOW >= 10) {
      await SR3EActor._postConvergenceCard(hostActor, attackerActorId);
    }
  }

  static async _postSheafPrompt(hostActor, owCount) {
    const steps = hostActor.system.triggerSteps ?? [];
    if (!steps.length) return;

    // Match by stored step number first, then fall back to 1-indexed position
    let stepIdx = steps.findIndex(s => (s.step ?? 0) === owCount);
    if (stepIdx === -1) stepIdx = owCount - 1;
    const step = steps[stepIdx];
    if (!step || step.triggered) return;

    const icList = (step.ic ?? []).map(r => r.name ?? 'IC').join(', ') || 'None';
    const desc   = step.description
      ? `<div style="font-size:11px;color:var(--sr-muted);font-style:italic;margin:3px 0">${step.description}</div>`
      : '';

    const gmUsers = game.users.filter(u => u.isGM).map(u => u.id);
    await ChatMessage.create({
      content: `
        <div class="sr-roll-card">
          <div class="sr-roll-header" style="color:var(--sr-red)">⚠ Security Sheaf — Level ${owCount}</div>
          ${desc}
          <div style="font-size:11px;color:var(--sr-text);margin:3px 0">IC: <strong>${icList}</strong></div>
          <div style="display:flex;gap:6px;margin-top:8px">
            <button class="sheaf-activate-btn" data-choice="public"
                    data-host-id="${hostActor.id}" data-step-index="${stepIdx}">📢 Public</button>
            <button class="sheaf-activate-btn" data-choice="silent"
                    data-host-id="${hostActor.id}" data-step-index="${stepIdx}">🔇 Silent</button>
            <button class="sheaf-activate-btn" data-choice="no"
                    data-host-id="${hostActor.id}" data-step-index="${stepIdx}">✗ No</button>
          </div>
        </div>`,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
      whisper: gmUsers,
    });
  }

  static async _addMatrixMark(actorId, nodeId, hostActorId) {
    const actor = game.actors.get(actorId);
    if (!actor || !nodeId) return;
    const marks = [...new Set([...(actor.system.matrixMarks ?? []), nodeId])];
    await actor.update({ 'system.matrixMarks': marks });

    const host = hostActorId ? game.actors.get(hostActorId) : null;
    if (host) {
      const activeUsers = foundry.utils.deepClone(host.system.activeUsers ?? []);
      const userEntry   = activeUsers.find(u => u.actorId === actorId);
      if (userEntry) {
        userEntry.marks = [...new Set([...(userEntry.marks ?? []), nodeId])];
        await host.update({ 'system.activeUsers': activeUsers });
      }
    }

    const nodeName = host?.system?.nodes?.find(n => n.id === nodeId)?.abbreviation ?? 'node';
    await ChatMessage.create({
      content: `
        <div class="sr-roll-card">
          <div class="sr-roll-header" style="color:var(--sr-green)">✓ Mark Granted — ${actor.name}</div>
          <div style="font-size:12px;color:var(--sr-text);margin-top:4px">Access mark added for <strong>${nodeName}</strong>.</div>
        </div>`,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
    });
  }

  static async _postConvergenceCard(hostActor, attackerActorId) {
    const systemRating  = hostActor.system.systemRating ?? 6;
    const attacker      = game.actors.get(attackerActorId);
    const attackerName  = attacker?.name ?? 'Decker';
    const isVRHot       = (attacker?.system?.matrixUserMode ?? '') === 'VR-Hot';
    const isStun        = !isVRHot;
    const damageCode    = `${systemRating}M`;
    const trackLabel    = isStun ? 'Stun' : 'Physical';

    const soakCtx = JSON.stringify({
      attackerActorId: hostActor.id,
      targetActorId:   attackerActorId,
      isMelee:         false,
      stagedPower:     systemRating,
      stagedLevel:     'M',
      isStun,
      rawDamage:       damageCode,
    }).replace(/'/g, '&#39;');

    await ChatMessage.create({
      content: `
        <div class="sr-roll-card">
          <div class="sr-roll-header" style="color:var(--sr-red)">⚠ CONVERGENCE — ${hostActor.name}</div>
          <div class="sr-roll-result" style="color:var(--sr-red)">GOD Response activated! Overwatch reached 10.</div>
          <div class="sr-staging-result">
            Dumpshock on ${attackerName}${isVRHot ? ' (VR-Hot → Physical)' : ' (VR-Cold → Stun)'}: <strong>${systemRating}M ${trackLabel}</strong>
          </div>
          <div class="sr-soak-action">
            <button class="sr-soak-btn" data-payload='${soakCtx}'>
              🛡 ${attackerName}: Resist Dumpshock (Body, TN ${systemRating})
            </button>
          </div>
        </div>`,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Matrix combat — IC/Agent initiates cybercombat against a decker   */
  /* ------------------------------------------------------------------ */

  async rollICAttack() {
    const targets = SR3EActor._getMatrixCombatTargets(this.id);
    if (!targets.length) {
      const hostId = this.system.activeHostId ?? '';
      if (!hostId) {
        ui.notifications.warn('Not deployed to a host. Deploy this IC from a host sheet first.');
      } else {
        ui.notifications.warn('No valid matrix targets on this host. Deckers must be connected to the same host.');
      }
      return;
    }

    const atk = await SR3EActor._buildCCParticipant(this);
    if (!atk) return;   // defaulting cancelled

    const targetOptions = targets.map(a => {
      const typeTag = a.type === 'agent' ? 'Agent' : a.type === 'ic' ? 'IC' : a.type.toUpperCase();
      const rtgTag  = (a.type === 'ic' || a.type === 'agent') ? ` (Rating ${a.system.rating ?? 1})` : '';
      const vrTag   = a.system.matrixUserMode ? ` [${a.system.matrixUserMode}]` : '';
      return `<option value="${a.id}">${a.name} [${typeTag}]${rtgTag}${vrTag}</option>`;
    }).join('');

    let targetId  = null;
    let confirmed = false;

    await foundry.applications.api.DialogV2.wait({
      window: { title: `${this.name}: Attack` },
      content: `
        <div style="padding:8px 0">
          <p style="margin:0 0 8px;font-size:12px;color:var(--color-text-dark-secondary)">
            ${atk.label}: <strong>${atk.skillName}</strong> &nbsp;|&nbsp; Damage: <strong>${atk.damageCode}</strong>
          </p>
          <label style="display:block">
            Target:
            <select id="ic-target" style="width:100%;margin-top:4px">${targetOptions}</select>
          </label>
        </div>`,
      buttons: [
        {
          label: 'Attack',
          action: 'confirm',
          default: true,
          callback: (_e, _b, dlg) => {
            targetId  = dlg.element.querySelector('#ic-target')?.value ?? null;
            confirmed = true;
          },
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    if (!confirmed || !targetId) return;

    const defActor = game.actors.get(targetId);
    if (!defActor) return;

    const def = await SR3EActor._buildCCParticipant(defActor);
    if (!def) return;   // defaulting cancelled

    await SR3EActor.postCybercombatCard({
      attackerActorId:  this.id,
      defenderActorId:  targetId,

      atkLabel:         atk.label,
      atkSkillName:     atk.skillName,
      atkSkillDice:     atk.skillDice,
      atkHackPoolAvail: atk.hackPoolAvail,
      atkTN:            atk.tn,
      atkDamageCode:    atk.damageCode,
      atkDamageBase:    atk.damageBase,
      atkFirewall:      atk.firewall,
      atkSoakPool:      atk.soakPool,
      atkUserMode:      atk.userMode,

      defLabel:         def.label,
      defSkillName:     def.skillName,
      defSkillDice:     def.skillDice,
      defHackPoolAvail: def.hackPoolAvail,
      defTN:            def.tn,
      defDamageCode:    def.damageCode,
      defDamageBase:    def.damageBase,
      defFirewall:      def.firewall,
      defSoakPool:      def.soakPool,
      defUserMode:      def.userMode,

      attackerProgramId:       atk.programId,
      attackerOperatorActorId: atk.operatorActorId,
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Matrix combat — IC resist card and roll handler                     */
  /* ------------------------------------------------------------------ */

  async _postICResistCard(payload) {
    const { stagedPower, stagedLevel, isStun, rawDamage, firewallRating = 0 } = payload;
    const sys        = this.system;
    const ownRating  = sys.rating ?? 1;
    const trackLabel = isStun ? 'Stun' : 'Physical';
    const soakTN     = Math.max(2, stagedPower - firewallRating);

    const resistPayload = JSON.stringify({
      icActorId:   this.id,
      stagedPower,
      stagedLevel,
      isStun,
      rawDamage,
    }).replace(/'/g, '&#39;');

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `
        <div class="sr-soak-card">
          <div class="sr-soak-header">💻 ${this.name}: Resist Matrix Damage</div>
          <div class="sr-soak-incoming">
            Incoming: <strong>${stagedPower}${stagedLevel} ${trackLabel}</strong>
            <span style="color:var(--sr-muted);font-size:11px"> (${rawDamage})</span>
          </div>
          <div class="sr-soak-pool-row">
            <label>Pool (Rating):
              <input type="number" class="sr-matrix-resist-pool" value="${ownRating}" min="1" max="20">
            </label>
            <label style="margin-left:12px">TN (Power − Firewall):
              <input type="number" class="sr-matrix-resist-tn" value="${soakTN}" min="2">
            </label>
          </div>
          <div class="sr-soak-pool-row" style="margin-top:6px">
            <button class="sr-matrix-ic-resist-roll-btn" data-payload='${resistPayload}'>
              🎲 Roll to Resist
            </button>
          </div>
        </div>`,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
    });
  }

  async _postDeckerMatrixSoakCard(payload) {
    const { stagedPower, stagedLevel, isStun, rawDamage, icActorId, deckerMPCP, firewallRating = 0 } = payload;
    const trackLabel = isStun ? 'Stun' : 'Physical';
    const soakTN     = Math.max(2, stagedPower - firewallRating);
    const icName     = game.actors.get(icActorId)?.name ?? 'IC';

    const rollPayload = JSON.stringify({
      deckerActorId: this.id,
      stagedPower,
      stagedLevel,
      isStun,
      rawDamage,
      icActorId,
    }).replace(/'/g, '&#39;');

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `
        <div class="sr-soak-card">
          <div class="sr-soak-header">💻 ${this.name}: Resist Matrix Damage (MPCP)</div>
          <div class="sr-soak-incoming">
            Incoming from ${icName}: <strong>${stagedPower}${stagedLevel} ${trackLabel}</strong>
            <span style="color:var(--sr-muted);font-size:11px"> (${rawDamage})</span>
          </div>
          <div class="sr-soak-pool-row">
            <label>Pool (MPCP):
              <input type="number" class="sr-matrix-decker-resist-pool" value="${deckerMPCP}" min="1" max="20">
            </label>
            <label style="margin-left:12px">TN (Power − Firewall):
              <input type="number" class="sr-matrix-decker-resist-tn" value="${soakTN}" min="2">
            </label>
          </div>
          <div class="sr-soak-pool-row" style="margin-top:6px">
            <button class="sr-matrix-decker-resist-roll-btn" data-payload='${rollPayload}'>
              🎲 Roll to Resist (MPCP)
            </button>
          </div>
        </div>`,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
    });
  }

  static async handleMatrixICResistClick(btn) {
    const payload = JSON.parse(btn.dataset.payload);
    const actor   = game.actors.get(payload.icActorId);
    if (!actor) return;
    await actor._postICResistCard(payload);
  }

  static async handleMatrixICResistRollClick(btn) {
    const payload = JSON.parse(btn.dataset.payload);
    const card    = btn.closest('.sr-soak-card');
    const pool    = parseInt(card.querySelector('.sr-matrix-resist-pool')?.value) || 1;
    const tn      = parseInt(card.querySelector('.sr-matrix-resist-tn')?.value)   || 2;
    const actor   = game.actors.get(payload.icActorId);
    if (!actor) return;

    btn.disabled    = true;
    btn.textContent = '⏳ Rolling…';

    const label = `${actor.name}: Resist Matrix Damage`;
    await actor.rollPool(pool, tn, label, {
      isMatrixSoakRoll:  true,
      matrixSoakContext: {
        icActorId:   payload.icActorId,
        stagedPower: payload.stagedPower,
        stagedLevel: payload.stagedLevel,
        isStun:      payload.isStun,
        rawDamage:   payload.rawDamage,
      },
    });
  }

  static async handleDeckerMatrixResistClick(btn) {
    const payload = JSON.parse(btn.dataset.payload);
    const actor   = game.actors.get(payload.deckerActorId);
    if (!actor) return;
    await actor._postDeckerMatrixSoakCard(payload);
  }

  static async handleDeckerMatrixResistRollClick(btn) {
    const payload = JSON.parse(btn.dataset.payload);
    const card    = btn.closest('.sr-soak-card');
    const pool    = parseInt(card.querySelector('.sr-matrix-decker-resist-pool')?.value) || 1;
    const tn      = parseInt(card.querySelector('.sr-matrix-decker-resist-tn')?.value)   || 2;
    const actor   = game.actors.get(payload.deckerActorId);
    if (!actor) return;

    btn.disabled    = true;
    btn.textContent = '⏳ Rolling…';

    const label = `${actor.name}: Resist Matrix Damage (MPCP)`;
    await actor.rollPool(pool, tn, label, {
      isDeckerMatrixSoakRoll:  true,
      deckerMatrixSoakContext: {
        deckerActorId: payload.deckerActorId,
        icActorId:     payload.icActorId,
        stagedPower:   payload.stagedPower,
        stagedLevel:   payload.stagedLevel,
        isStun:        payload.isStun,
        rawDamage:     payload.rawDamage,
      },
    });
  }

  /**
 * Ensure all attributes have a numeric value property
 * @protected
 */
_ensureAttributeValues(attr) {
  if (!attr) {
    this.system.attributes = {};
    return;
  }
  
  const defaults = {
    body: 3, quickness: 3, strength: 3, charisma: 3,
    intelligence: 3, willpower: 3, essence: 6, magic: 0
  };
  
  for (const [key, defaultVal] of Object.entries(defaults)) {
    if (!attr[key]) {
      attr[key] = { base: defaultVal, value: defaultVal };
    } else {
      // Ensure base exists
      if (attr[key].base === undefined || attr[key].base === null) {
        attr[key].base = defaultVal;
      }
      // Ensure value exists and is a number
      if (attr[key].value === undefined || attr[key].value === null) {
        attr[key].value = attr[key].base;
      }
      // Convert to numbers
      attr[key].base = Number(attr[key].base);
      attr[key].value = Number(attr[key].value);
    }
  }
  
  // Special handling for reaction
  if (!attr.reaction) {
    const quick = attr.quickness?.base ?? 3;
    const intel = attr.intelligence?.base ?? 3;
    const reactionBase = Math.max(1, Math.floor((quick + intel) / 2));
    attr.reaction = {
      base: reactionBase,
      value: reactionBase,
      bonus: 0,
      override: false
    };
  } else {
    if (attr.reaction.base === undefined) {
      const quick = attr.quickness?.base ?? 3;
      const intel = attr.intelligence?.base ?? 3;
      attr.reaction.base = Math.max(1, Math.floor((quick + intel) / 2));
    }
    if (attr.reaction.value === undefined) {
      attr.reaction.value = attr.reaction.base + (attr.reaction.bonus ?? 0);
    }
    if (attr.reaction.bonus === undefined) attr.reaction.bonus = 0;
    if (attr.reaction.override === undefined) attr.reaction.override = false;
    
    // Convert to numbers
    attr.reaction.base = Number(attr.reaction.base);
    attr.reaction.value = Number(attr.reaction.value);
    attr.reaction.bonus = Number(attr.reaction.bonus);
  }
}

_prepareVehicle(sys, attr) {
  if (!sys.derived) sys.derived = {};
  if (!sys.damage)  sys.damage  = { value: 0 };
  const body = attr.body?.base ?? 4;
  sys.derived.damageMax      = body * 2;
  sys.derived.damageDisabled = body;
}

_prepareCharacter(sys, attr) {
  const wm      = sys.woundMod ?? 0;
  const isAdept = (sys.magicType ?? '') === 'Adept';

  // Cyber/bio augmentation bonuses — summed from all cyberware and bioware items
  const cyberBonus = { bod: 0, qui: 0, str: 0, cha: 0, int: 0, wil: 0, rea: 0, initDice: 0 };
  for (const item of (this.items ?? [])) {
    if (item.type !== 'cyberware' && item.type !== 'bioware') continue;
    const s = item.system;
    cyberBonus.bod      += s.bonusBod      ?? 0;
    cyberBonus.qui      += s.bonusQui      ?? 0;
    cyberBonus.str      += s.bonusStr      ?? 0;
    cyberBonus.cha      += s.bonusCha      ?? 0;
    cyberBonus.int      += s.bonusInt      ?? 0;
    cyberBonus.wil      += s.bonusWil      ?? 0;
    cyberBonus.rea      += s.bonusRea      ?? 0;
    cyberBonus.initDice += s.bonusInitDice ?? 0;
  }

  // Adept power bonuses — summed from all adeptpower items
  const adeptBonus    = { bod: 0, qui: 0, str: 0, cha: 0, int: 0, wil: 0, mag: 0, rea: 0, initDice: 0 };
  const improvedAbility = {};  // { skillName → total bonus dice }
  if (isAdept) {
    for (const item of (this.items ?? [])) {
      if (item.type !== 'adeptpower') continue;
      const s = item.system;
      adeptBonus.bod      += s.bonusBod      ?? 0;
      adeptBonus.qui      += s.bonusQui      ?? 0;
      adeptBonus.str      += s.bonusStr      ?? 0;
      adeptBonus.cha      += s.bonusCha      ?? 0;
      adeptBonus.int      += s.bonusInt      ?? 0;
      adeptBonus.wil      += s.bonusWil      ?? 0;
      adeptBonus.mag      += s.bonusMag      ?? 0;
      adeptBonus.rea      += s.bonusRea      ?? 0;
      adeptBonus.initDice += s.bonusInitDice ?? 0;
      const skillName = (s.improvedSkillName ?? '').trim();
      if (skillName) {
        const dice = s.hasLevels ? (s.level ?? 1) : 1;
        improvedAbility[skillName] = (improvedAbility[skillName] ?? 0) + dice;
      }
    }
  }

  // Apply cyber/bio + adept power bonuses to core attributes — derivations below use .value
  const _cyberKey = { body: 'bod', quickness: 'qui', strength: 'str', charisma: 'cha', intelligence: 'int', willpower: 'wil' };
  for (const key of ['body', 'quickness', 'strength', 'charisma', 'intelligence', 'willpower']) {
    if (attr[key]) {
      attr[key].value = (attr[key].base ?? 0)
        + (cyberBonus[_cyberKey[key]] ?? 0)
        + (adeptBonus[_cyberKey[key]] ?? 0);
    }
  }

  // Armor encumbrance: per 2 pts (or fraction) that max(ballistic, impact) > QUI, reduce QUI by 1
  let armorEncPenalty = 0;
  {
    const armorItem = sys.equippedArmor
      ? (this.items ?? []).find(i => i.id === sys.equippedArmor && i.type === 'armor')
      : null;
    if (armorItem) {
      const armorRating = Math.max(armorItem.system?.ballistic ?? 0, armorItem.system?.impact ?? 0);
      const quickVal    = attr.quickness?.value ?? 0;
      if (armorRating > quickVal) {
        armorEncPenalty = Math.ceil((armorRating - quickVal) / 2);
        if (attr.quickness) attr.quickness.value = Math.max(1, quickVal - armorEncPenalty);
      }
    }
  }

  // Reaction — derived from force-enhanced QUI + INT per RAW, minimum 1
  if (attr.reaction) {
    const baseReaction = Math.max(1, Math.floor(
      ((attr.quickness?.value ?? 0) + (attr.intelligence?.value ?? 0)) / 2
    ));
    attr.reaction.base = baseReaction;

    if (!attr.reaction.override) {
      attr.reaction.value = Math.max(1, baseReaction
        + (attr.reaction.reactionBonus ?? 0) + (attr.reaction.bonus ?? 0)
        + adeptBonus.rea
        + cyberBonus.rea);
    }
  }

  // Essence — reduced by cyberware only (M&M rules: bioware uses Bio Index, not Essence)
  if (attr.essence) {
    let essenceLoss = 0;
    for (const item of (this.items ?? [])) {
      if (item.type === 'cyberware') {
        essenceLoss += parseFloat(item.system?.essenceCost ?? 0);
      }
    }
    attr.essence.value = Math.max(0, parseFloat((6 - essenceLoss).toFixed(2)));
  }

  // Bio Index (M&M p.XX): capacity = Essence + 3; effective magic = Essence − (totalBioIndex ÷ 2)
  let totalBioIndex = 0;
  for (const item of (this.items ?? [])) {
    if (item.type === 'bioware') {
      totalBioIndex += parseFloat(item.system?.bioIndex ?? 0);
    }
  }
  totalBioIndex = Math.round(totalBioIndex * 1000) / 1000;
  const bioIndexCapacity = Math.round(((attr.essence?.value ?? 6) + 3) * 100) / 100;
  const bioIndexOver     = totalBioIndex > bioIndexCapacity;

  // Magic — capped by effective magic (Essence − bioIndex÷2), then add adept force
  const magicBase     = attr.magic?.base ?? 0;
  const essenceVal    = attr.essence?.value ?? 6;
  const effectiveMagic = Math.max(0, essenceVal - (totalBioIndex / 2));
  if (attr.magic && magicBase > 0) {
    attr.magic.value = Math.min(magicBase, Math.floor(effectiveMagic))
      + adeptBonus.mag;
  }
  const magicSuppressed = magicBase > 0 && effectiveMagic < magicBase;

  // Derived pools — all use .value so adept force benefits every relevant pool
  const combatPoolBase = Math.max(0, Math.floor(
    ((attr.quickness?.value    ?? 0) +
     (attr.intelligence?.value ?? 0) +
     (attr.willpower?.value    ?? 0)) / 2
  ));
  const combatPool          = combatPoolBase + (sys.combatPoolMod ?? 0);
  const combatPoolSpent     = sys.combatPoolSpent ?? 0;
  const availableCombatPool = Math.max(0, combatPool - combatPoolSpent);

  const magicEff      = attr.magic?.value ?? 0;
  const spellPoolBase = magicBase > 0
    ? Math.max(0, Math.floor(
        ((attr.intelligence?.value ?? 0) +
         (attr.willpower?.value    ?? 0) +
         magicEff) / 3
      ))
    : null;
  const spellPool          = spellPoolBase !== null ? spellPoolBase + (sys.spellPoolMod ?? 0) : null;
  const spellPoolSpent     = magicBase > 0 ? (sys.spellPoolSpent ?? 0) : 0;
  const availableSpellPool = spellPool !== null ? Math.max(0, spellPool - spellPoolSpent) : null;

  const deckItem        = sys.equippedCyberdeck ? this.items?.get(sys.equippedCyberdeck) : null;
  const mpcp            = deckItem?.system?.attributes?.mpcp?.base ?? null;
  const hackingPoolBase = mpcp !== null
    ? Math.max(0, Math.floor(((attr.intelligence?.value ?? 0) + mpcp) / 3))
    : null;

  const astralPoolBase = magicBase > 0
    ? Math.max(0, Math.floor(
        ((attr.intelligence?.value ?? 0) +
         (attr.charisma?.value    ?? 0) +
         (attr.willpower?.value   ?? 0)) / 2
      ))
    : null;
  const astralPool          = astralPoolBase !== null ? astralPoolBase + (sys.astralPoolMod ?? 0) : null;
  const astralPoolSpent     = magicBase > 0 ? (sys.astralPoolSpent ?? 0) : 0;
  const availableAstralPool = astralPool !== null ? Math.max(0, astralPool - astralPoolSpent) : null;

  const vcrItem   = sys.activeVCRItemId ? this.items?.get(sys.activeVCRItemId) : null;
  const vcrRating = vcrItem ? (vcrItem.system?.rating ?? 0) : 0;

  sys.derived = {
    initiative:         (attr.reaction?.value ?? 0) + wm,
    initiativeDice:     1 + (sys.initiativeDiceBonus ?? 0) + (attr.reaction?.diceBonus ?? 0) + cyberBonus.initDice + adeptBonus.initDice,
    cyberBonus,
    adeptBonus,
    improvedAbility,
    combatPoolBase,
    combatPool,
    availableCombatPool,
    karmaPool:          Math.max(0, sys.karmaPool ?? 0),
    spellPoolBase,
    spellPool,
    availableSpellPool,
    astralPoolBase,
    astralPool,
    availableAstralPool,
    hackingPoolBase,
    hackingPool:          hackingPoolBase !== null ? Math.max(0, hackingPoolBase) : null,
    availableHackingPool: hackingPoolBase !== null ? Math.max(0, hackingPoolBase - (sys.hackingPoolSpent ?? 0)) : null,
    vcrRating,
    vcrActive:          vcrRating > 0,
    totalBioIndex,
    bioIndexCapacity,
    bioIndexOver,
    effectiveMagic:     Math.round(effectiveMagic * 100) / 100,
    magicSuppressed,
    armorEncPenalty,
  };
}

  // ---------------------------------------------------------------------------
  // ROLLING — Interactive Rule of Six
  //
  // Each die is tracked as a state object throughout the explosion chain:
  //   { index, total, faces, isOne, needsExplosion, done, success }
  //
  // Wave 0  — initial roll of the full pool, one face per die.
  // Wave N  — roll only dice whose last face was 6 AND whose running total
  //           is still below TN. A die that rolls 6 but is already >= TN
  //           is a success and stops immediately.
  //
  // Between waves the player clicks "Roll explosions" in the chat card.
  // All state is serialised into a data attribute on the button so no
  // server-side storage is needed.
  // ---------------------------------------------------------------------------

  /**
   * Entry point for all skill/weapon/attribute rolls.
   */
  async rollPool(pool, tn = 4, label = 'Roll', options = {}) {
    pool = parseInt(pool) || 0;
    if (pool < 1) {
      ui.notifications.warn(`${this.name}: dice pool is 0.`);
      return null;
    }

    // SR3 Default Table: defaulting to an attribute is +4 TN (full attribute dice, no pool).
    if (options.defaulting) tn += 4;

    // Simsense degradation on a VCR-jacked rigger applies to ALL their actions (wound-like).
    const signalMod    = options.skipSignalMod ? 0 : SR3EActor._jackedSignalMod(this);
    const effectiveTN  = options.skipWoundMod
      ? Math.max(2, tn + signalMod)
      : Math.max(2, tn - (this.system.woundMod ?? 0) + signalMod);
    const woundDisplay = (options.skipWoundMod ? 0 : -(this.system.woundMod ?? 0)) + signalMod;

    if (options.physicalDice) {
      const successes = await SR3EActor._promptPhysicalSuccesses(pool, effectiveTN, label, tn, woundDisplay);
      if (successes === null) return null;
      await this._postWaveCard({
        actorId:             this.id,
        label,
        tn:                  effectiveTN,
        pool,
        wave:                0,
        dice:                SR3EActor._buildPhysicalDice(pool, successes),
        ones:                0,
        glitch:              false,
        physicalDice:        true,
        physicalSuccesses:   successes,
        isWeaponRoll:        options.isWeaponRoll       ?? false,
        isMelee:             options.isMelee            ?? false,
        isAoE:               options.isAoE              ?? false,
        aoeTargetIds:        options.aoeTargetIds       ?? null,
        chunkySalsa:         options.chunkySalsa        ?? null,
        aoeCenter:           options.aoeCenter          ?? null,
        aoeRadius:           options.aoeRadius          ?? null,
        aoeThrowerCenter:    options.aoeThrowerCenter   ?? null,
        aoeChunky:           options.aoeChunky          ?? false,
        rawDamage:           options.rawDamage          ?? '',
        damageBase:          options.damageBase         ?? null,
        weaponItemId:        options.weaponItemId       ?? null,
        ammoType:            options.ammoType           ?? null,
        attackerActorId:     this.id,
        targetActorId:       options.targetActorId      ?? null,
        committedDodgeDice:  options.committedDodgeDice ?? 0,
        isSpellRoll:         options.isSpellRoll        ?? false,
        spellContext:        options.spellContext        ?? null,
        isSpellResist:       options.isSpellResist      ?? false,
        spellResistContext:  options.spellResistContext  ?? null,
        isDispelRoll:        options.isDispelRoll       ?? false,
        dispelContext:       options.dispelContext       ?? null,
        isConjuringRoll:     options.isConjuringRoll    ?? false,
        conjuringContext:    options.conjuringContext    ?? null,
        isAssensingRoll:     options.isAssensingRoll    ?? false,
        isAuraReadingRoll:   options.isAuraReadingRoll  ?? false,
        auraReadingContext:  options.auraReadingContext  ?? null,
        isRammingRoll:       options.isRammingRoll      ?? false,
        rammingContext:      options.rammingContext      ?? null,
        isCrashRoll:         options.isCrashRoll         ?? false,
        crashContext:        options.crashContext         ?? null,
        isSoakRoll:          options.isSoakRoll         ?? false,
        soakPayload:         options.soakPayload        ?? null,
        isVehicleSoakRoll:     options.isVehicleSoakRoll    ?? false,
        vehicleSoakContext:    options.vehicleSoakContext    ?? null,
        isMatrixSoakRoll:        options.isMatrixSoakRoll        ?? false,
        matrixSoakContext:       options.matrixSoakContext       ?? null,
        isDeckerMatrixSoakRoll:  options.isDeckerMatrixSoakRoll  ?? false,
        deckerMatrixSoakContext: options.deckerMatrixSoakContext ?? null,
        isProgramRoll:           options.isProgramRoll           ?? false,
        programContext:          options.programContext          ?? null,
        isHackingActionRoll:     options.isHackingActionRoll     ?? false,
        hackingActionContext:    options.hackingActionContext    ?? null,
        barrierContext:          options.barrierContext          ?? null,
        fallingContext:          options.fallingContext          ?? null,
        escapeContext:           options.escapeContext           ?? null,
        grenadeType:             options.grenadeType             ?? 'standard',
        footerNote:              options.footerNote              ?? null,
      });
      return successes;
    }

    const dice = this._rollWave(pool, effectiveTN, /* isFirstWave */ true);
    const ones   = dice.filter(d => d.isOne).length;
    const glitch = ones > Math.floor(pool / 2);

    await this._postWaveCard({
      actorId:         this.id,
      label,
      tn:              effectiveTN,
      pool,
      wave:            0,
      dice,
      ones,
      glitch,
      isWeaponRoll:          options.isWeaponRoll          ?? false,
      isMelee:               options.isMelee               ?? false,
      isAoE:                 options.isAoE                 ?? false,
      aoeTargetIds:          options.aoeTargetIds          ?? null,
      chunkySalsa:           options.chunkySalsa           ?? null,
      aoeCenter:             options.aoeCenter             ?? null,
      aoeRadius:             options.aoeRadius             ?? null,
      aoeThrowerCenter:      options.aoeThrowerCenter      ?? null,
      aoeChunky:             options.aoeChunky             ?? false,
      rawDamage:             options.rawDamage             ?? '',
      damageBase:            options.damageBase            ?? null,
      weaponItemId:          options.weaponItemId          ?? null,
      ammoType:              options.ammoType              ?? null,
      attackerActorId:       this.id,
      targetActorId:         options.targetActorId         ?? null,
      committedDodgeDice:    options.committedDodgeDice    ?? 0,
      isSpellRoll:           options.isSpellRoll           ?? false,
      spellContext:          options.spellContext          ?? null,
      isSpellResist:         options.isSpellResist         ?? false,
      spellResistContext:    options.spellResistContext    ?? null,
      isDispelRoll:          options.isDispelRoll          ?? false,
      dispelContext:         options.dispelContext         ?? null,
      isConjuringRoll:       options.isConjuringRoll       ?? false,
      conjuringContext:      options.conjuringContext      ?? null,
      isAssensingRoll:       options.isAssensingRoll       ?? false,
      isAuraReadingRoll:     options.isAuraReadingRoll     ?? false,
      auraReadingContext:    options.auraReadingContext     ?? null,
      isRammingRoll:         options.isRammingRoll         ?? false,
      rammingContext:        options.rammingContext        ?? null,
      isCrashRoll:           options.isCrashRoll           ?? false,
      crashContext:          options.crashContext           ?? null,
      isSoakRoll:            options.isSoakRoll            ?? false,
      soakPayload:           options.soakPayload           ?? null,
      isVehicleSoakRoll:     options.isVehicleSoakRoll     ?? false,
      vehicleSoakContext:    options.vehicleSoakContext    ?? null,
      isMatrixSoakRoll:        options.isMatrixSoakRoll        ?? false,
      matrixSoakContext:       options.matrixSoakContext       ?? null,
      isDeckerMatrixSoakRoll:  options.isDeckerMatrixSoakRoll  ?? false,
      deckerMatrixSoakContext: options.deckerMatrixSoakContext ?? null,
      isProgramRoll:           options.isProgramRoll           ?? false,
      programContext:          options.programContext          ?? null,
      isHackingActionRoll:     options.isHackingActionRoll     ?? false,
      hackingActionContext:    options.hackingActionContext    ?? null,
      barrierContext:          options.barrierContext          ?? null,
      fallingContext:          options.fallingContext          ?? null,
      escapeContext:           options.escapeContext           ?? null,
      grenadeType:           options.grenadeType           ?? 'standard',
      footerNote:            options.footerNote            ?? null,
    });
  }

  /**
   * Roll one wave of dice.
   *
   * Wave 0: builds a fresh array of `count` dice, each rolled once.
   * Wave N: clones prevDice, advances only the indices listed in explodeIdx.
   *
   * Stopping rule: a die stops exploding when either
   *   (a) its running total >= TN  (success, done), or
   *   (b) its latest face != 6     (failure or success without explosion).
   */
  _rollWave(count, tn, isFirstWave = false, prevDice = [], explodeIdx = []) {
    if (isFirstWave) {
      const dice = [];
      for (let i = 0; i < count; i++) {
        const face    = Math.floor(Math.random() * 6) + 1;
        const total   = face;
        const success = total >= tn;
        // A 6 that already meets TN is a success — no explosion.
        const needsExplosion = face === 6 && !success;
        dice.push({
          index: i,
          total,
          faces: [face],
          isOne: face === 1,
          needsExplosion,
          done:    !needsExplosion,
          success,
        });
      }
      return dice;
    }

    // Clone previous state and advance only the exploding dice.
    const dice = prevDice.map(d => ({ ...d, faces: [...d.faces] }));
    for (const idx of explodeIdx) {
      const d    = dice[idx];
      const face = Math.floor(Math.random() * 6) + 1;
      d.faces.push(face);
      d.total  += face;
      d.success = d.total >= tn;

      if (d.success) {
        // Hit or exceeded TN — done regardless of face.
        d.needsExplosion = false;
        d.done           = true;
      } else if (face === 6) {
        // Still below TN and another 6 — keep going.
        d.needsExplosion = true;
        d.done           = false;
      } else {
        // Below TN, no 6 — final failure.
        d.needsExplosion = false;
        d.done           = true;
      }
    }
    return dice;
  }

  static async _promptPhysicalSuccesses(pool, tn, label, baseTN = tn, woundPenalty = 0) {
    const woundNote = woundPenalty > 0
      ? `<div style="font-size:11px;color:var(--sr-amber);margin-bottom:8px">⚡ TN modifiers: Wound +${woundPenalty} (base ${baseTN} → ${tn})</div>`
      : '';
    let successes = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: `${label} — Physical Dice` },
      content: `
        <div style="padding:8px 0">
          <p>TN: <strong>${tn}</strong> &nbsp;—&nbsp; Pool: <strong>${pool}</strong> dice</p>
          ${woundNote}
          <label style="display:flex;align-items:center;gap:8px">
            Successes:
            <input type="number" id="phys-successes" value="0" min="0" max="${pool * 5}"
                   style="width:60px" autofocus/>
          </label>
        </div>`,
      buttons: [
        {
          label: 'Confirm',
          action: 'confirm',
          default: true,
          callback: (_e, _b, dlg) => {
            successes = parseInt(dlg.element.querySelector('#phys-successes')?.value) || 0;
          },
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    return successes;
  }

  // SR3 wound modifier per track: Light (1+ boxes) = 1, Moderate (3+) = 2, Serious (6+) = 3
  static _trackMod(boxes) { return boxes >= 6 ? 3 : boxes >= 3 ? 2 : boxes >= 1 ? 1 : 0; }

  // Signal-monitor degradation → TN penalty (+N). 0 boxes or full (10, channel lost) → 0;
  // 1-3 → +1, 4-6 → +2, 7-9 → +3 (from SR3E.electronicWarfare.degradationTiers).
  static _signalTierMod(boxes) {
    const tiers = game.sr3e?.SR3E?.electronicWarfare?.degradationTiers ?? [];
    const t = tiers.find(t => boxes >= t.min && boxes <= t.max);
    return (t && t.mod) ? t.mod : 0;   // mod === null (channel lost) → no TN penalty (other effect)
  }

  // A vehicle's Simsense-channel degradation penalty (+N TN).
  static _vehicleSimsenseMod(vehicle) {
    return SR3EActor._signalTierMod(vehicle?.system?.signalMonitor?.simsense ?? 0);
  }

  // For a rigger jumped into a VCR drone, the Simsense degradation acts exactly like a wound
  // modifier (R3 p.145): +N to ALL their target numbers and −N to initiative. Returns +N (0 if
  // not jacked in or no degradation). The VCR is exclusive, so at most one drone applies.
  static _jackedSignalMod(actor) {
    if (!actor || (actor.type !== 'character' && actor.type !== 'npc')) return 0;
    const veh = game.actors?.find(a =>
      a.type === 'vehicle' &&
      a.system?.driverActorId === actor.id &&
      a.system?.controlMode === 'vcr'
    );
    return veh ? SR3EActor._vehicleSimsenseMod(veh) : 0;
  }

  static _buildPhysicalDice(pool, successes) {
    return Array.from({ length: pool }, (_, i) => ({
      index:          i,
      total:          i < successes ? 4 : 1,
      faces:          [i < successes ? 4 : 1],
      isOne:          false,
      needsExplosion: false,
      done:           true,
      success:        i < successes,
    }));
  }

  /**
   * Draw a circular blast/area marker visible to all players. Prefers a Region document
   * (v14-native, synced, warning-free to delete); falls back to a local PIXI circle if the
   * caller lacks Region-create permission. `radiusM` is in scene metres.
   * Returns { regionId, markerId } — feed both to the chat 🧹 Clear button (sr3e.js handles each).
   */
  static async _drawBlastArea(center, radiusM, { name = 'Blast', color = '#cc3300' } = {}) {
    const out = { regionId: null, markerId: null };
    if (!canvas?.ready || !center) return out;
    const pxPerM   = canvas.dimensions.size / canvas.dimensions.distance;
    const radiusPx = Math.max(1, radiusM * pxPerM);
    const hex      = Number(`0x${color.replace('#', '')}`);
    try {
      const [region] = await canvas.scene.createEmbeddedDocuments('Region', [{
        name,
        color,
        visibility: CONST.REGION_VISIBILITY?.ALWAYS ?? 2,
        shapes: [{ type: 'circle', x: center.x, y: center.y, radius: radiusPx, hole: false }],
        flags: { 'The2ndChumming3e': { blastResult: true } },
      }]);
      out.regionId = region?.id ?? null;
    } catch {
      // No create permission — local PIXI circle so the caster at least sees it.
      try {
        const layer = canvas.interface ?? canvas.primary ?? canvas.stage;
        const g = new PIXI.Graphics();
        g.beginFill(hex, 0.20);
        g.lineStyle(2, hex, 0.9);
        g.drawCircle(center.x, center.y, radiusPx);
        g.endFill();
        layer.addChild(g);
        out.markerId = foundry.utils.randomID();
        (game.sr3e._blastMarkers ??= new Map()).set(out.markerId, g);
      } catch (err) { console.error('SR3E | could not draw blast marker', err); }
    }
    return out;
  }

  /** Markup for the chat 🧹 Clear-blast-marker button from a { regionId, markerId } pair. */
  static _clearBlastButton({ regionId, markerId } = {}) {
    if (!regionId && !markerId) return '';
    const attrs = regionId
      ? `data-region-id="${regionId}" data-scene-id="${canvas.scene?.id ?? ''}"`
      : `data-marker-id="${markerId}"`;
    return `<div style="margin-top:5px"><button type="button" class="sr3e-clear-blast-btn btn-sm" ${attrs} style="font-size:11px;padding:1px 8px">🧹 Clear blast marker</button></div>`;
  }

  /** Damage-level letter → wound name (L→Light, M→Moderate, S→Serious, D→Deadly).
   *  Used on "Assign … Wound" buttons — the Power number is dropped (it doesn't change the
   *  wound severity; only the level does), and "Wound" is used in place of "damage". */
  static _woundName(level) {
    return ({ L: 'Light', M: 'Moderate', S: 'Serious', D: 'Deadly' })[String(level).toUpperCase()] ?? String(level);
  }

  /**
   * Post a wave result as a chat card.
   *
   * All roll state is embedded as JSON in the explosion button's data-payload
   * attribute so the click handler can resume without any server storage.
   */
  async _postWaveCard(state) {
    const { actorId, label, tn, pool, wave, dice, ones, glitch } = state;
    const successes     = state.physicalDice ? (state.physicalSuccesses ?? 0) : dice.filter(d => d.success).length;
    const explodingDice = state.physicalDice ? [] : dice.filter(d => d.needsExplosion);
    const allDone       = state.physicalDice || explodingDice.length === 0;

    // Build dice display — exploding dice get a pending style (no glyph, just the running total).
    const diceHtml = state.physicalDice
      ? `<span class="sr-phys-summary">📋 ${successes} success${successes !== 1 ? 'es' : ''} entered</span>`
      : dice.map(d => {
          const cls = ['sr-die'];
          if (d.done && d.success)  cls.push('sr-hit');
          else if (d.done)          cls.push('sr-miss');
          else                      cls.push('sr-exploding');
          if (d.isOne)              cls.push('sr-one');

          const title = d.faces.length > 1 ? `${d.faces.join(' + ')} = ${d.total}` : `${d.total}`;
          return `<span class="${cls.join(' ')}" title="${title}">${d.total}</span>`;
        }).join('');

    // Result block — only shown when all dice are resolved.
    let resultHtml = '';
    if (allDone) {
      const criticalGlitch = glitch && successes === 0;
      const glitchHtml     = criticalGlitch
        ? '<div class="sr-critical-glitch">⚠ CRITICAL GLITCH! ⚠</div>'
        : glitch
          ? '<div class="sr-glitch">⚠ Glitch</div>'
          : '';

      // Weapon roll result — dodge was pre-declared, so we resolve immediately
      let stagingHtml = '';
      let postRollHtml = '';

      if (state.isWeaponRoll && state.damageBase) {
        if (state.isAoE && state.aoeCenter) {
          // Grenade: ALWAYS detonates. Successes only reduce scatter (RAW). Scatter relocates
          // the blast; we re-detect who's caught (incl. the thrower) and apply power − distance.
          const SR3E   = game.sr3e.SR3E;
          const gType  = state.grenadeType ?? 'standard';
          const gCfg   = SR3E.grenadeTypes?.[gType] ?? { scatterDice: 1, scatterReduction: 2 };
          const dirRoll   = Math.ceil(Math.random() * 6);
          const distRolls = Array.from({ length: gCfg.scatterDice ?? 1 }, () => Math.ceil(Math.random() * 6));
          const rawDist   = distRolls.reduce((a, b) => a + b, 0);
          const reduction = successes * (gCfg.scatterReduction ?? 2);
          const scatterDist = Math.max(0, rawDist - reduction);
          const DIRS = ['', 'overthrown (long)', 'long & right', 'short & right', 'short', 'short & left', 'long & left'];

          const basePower = state.damageBase.power;
          const level     = state.damageBase.level;
          const isStun    = state.damageBase.isStun;

          // Relocate the epicentre along the throw axis (1 = overthrow, 4 = short).
          let center = { ...state.aoeCenter };
          let scatterDesc;
          if (scatterDist <= 0) {
            scatterDesc = `🎯 Direct hit (scatter ${rawDist}m − ${reduction}m = 0).`;
          } else {
            const thr = state.aoeThrowerCenter;
            let ax = thr ? state.aoeCenter.x - thr.x : 0;
            let ay = thr ? state.aoeCenter.y - thr.y : -1;
            const al = Math.hypot(ax, ay) || 1; ax /= al; ay /= al;
            const ang = (dirRoll - 1) * Math.PI / 3;
            const cos = Math.cos(ang), sin = Math.sin(ang);
            const dx = ax * cos - ay * sin, dy = ax * sin + ay * cos;
            const pxPerM = canvas?.dimensions ? canvas.dimensions.size / canvas.dimensions.distance : 1;
            center = { x: state.aoeCenter.x + dx * scatterDist * pxPerM, y: state.aoeCenter.y + dy * scatterDist * pxPerM };
            const diceStr = distRolls.length > 1 ? `[${distRolls.join('+')}]=${rawDist}` : `${rawDist}`;
            scatterDesc = `💨 Scattered <strong>${scatterDist}m ${DIRS[dirRoll]}</strong> (${diceStr}m − ${reduction}m).`;
          }

          // Show where it actually went off, visible to ALL players (Region, with a local
          // PIXI fallback if the thrower lacks Region-create permission).
          const { regionId: resultRegionId, markerId: resultMarkerId } =
            await SR3EActor._drawBlastArea(center, state.aoeRadius, { name: 'Grenade Blast' });

          // Re-detect everyone caught in the (scattered) blast — the thrower can be hit.
          const hits = [];
          for (const tok of (canvas?.tokens?.placeables ?? [])) {
            if (!tok.actor) continue;
            let dM; try { dM = canvas.grid.measurePath([center, tok.center])?.distance ?? Infinity; } catch { dM = Infinity; }
            if (dM <= state.aoeRadius) hits.push({ actor: tok.actor, dist: Math.round(dM) });
          }

          // Per-target codes: Chunky Salsa GUI (confined) or open-air power − distance.
          let codes;
          if (state.aoeChunky && game.sr3e.openChunkySalsa && hits.length) {
            codes = (await game.sr3e.openChunkySalsa({
              power: basePower, level, actorIds: hits.map(h => h.actor.id), returnOnly: true,
            })) ?? [];
          } else {
            codes = hits.map(h => ({ actorId: h.actor.id, name: h.actor.name, power: Math.max(0, basePower - h.dist), level, dist: h.dist }))
                        .filter(t => t.power > 0);
          }

          const hitLines = codes.length
            ? codes.map(t => `<div style="font-size:11px;margin-top:2px"><strong>${t.name}</strong>: ${t.power}${t.level}${t.dist != null ? ` <span style="color:var(--sr-muted)">(${t.dist}m)</span>` : ''}</div>`).join('')
            : '<div style="font-size:11px;color:var(--sr-muted)">No one caught in the blast.</div>';
          const clearBtn = SR3EActor._clearBlastButton({ regionId: resultRegionId, markerId: resultMarkerId });
          stagingHtml = `<div class="sr-staging-result">💥 ${basePower}${level}${isStun ? ' Stun' : ''} grenade — ${successes} hit${successes !== 1 ? 's' : ''}<div style="margin-top:3px">${scatterDesc}</div>${hitLines}${clearBtn}</div>`;

          for (const t of codes) {
            const tActor = game.actors.get(t.actorId);
            if (!tActor) continue;
            const soakCtx = JSON.stringify({
              attackerActorId: state.attackerActorId,
              targetActorId:   t.actorId,
              weaponItemId:    state.weaponItemId,
              isMelee:         false,
              stagedPower:     t.power,
              stagedLevel:     t.level,
              isStun,
              rawDamage:       `${t.power}${t.level}`,
            }).replace(/'/g, '&#39;');
            postRollHtml += `<div class="sr-soak-action"><button class="sr-soak-btn" data-payload='${soakCtx}'>🛡 ${tActor.name}: Resist Damage (${t.power}${t.level})</button></div>`;
          }
        } else if (successes === 0) {
          stagingHtml = '<div class="sr-staging-result">0 hits — no damage</div>';
        } else {
          const staged     = SR3EItem.stageDamage(state.damageBase, successes);
          const trackLabel = staged.isStun ? 'Stun' : 'Physical';
          const stagedStr  = `${staged.power}${staged.level}`;
          stagingHtml = `
            <div class="sr-staging-result">
              📊 ${state.rawDamage} + ${successes} hits → <strong>${stagedStr} ${trackLabel}</strong>
            </div>`;

          const targetActor  = game.actors.get(state.targetActorId);
          const targetName   = targetActor?.name ?? 'Target';
          const attackerName = game.actors.get(state.attackerActorId)?.name ?? 'Attacker';

          if (state.isAoE && state.aoeTargetIds?.length) {
            // Scatter roll — always happens for AoE grenades
            const grenadeType = state.grenadeType ?? 'standard';
            const numDistDice = grenadeType === 'standard' ? 1 : grenadeType === 'aerodynamic' ? 2 : 3;
            const reductionPerSuccess = grenadeType === 'standard' ? 2 : 4;
            const SCATTER_DIRS = ['', 'past the target', 'past and to the right of the target', 'short and to the right of the target', 'short of the target', 'short and to the left of the target', 'past and to the left of the target'];
            const dirRoll     = Math.ceil(Math.random() * 6);
            const distRolls   = Array.from({ length: numDistDice }, () => Math.ceil(Math.random() * 6));
            const rawDist     = distRolls.reduce((a, b) => a + b, 0);
            const reduction   = successes * reductionPerSuccess;
            const scatterDist = Math.max(0, rawDist - reduction);

            let scatterHtml;
            if (scatterDist <= 0) {
              scatterHtml = `<div style="font-size:12px;color:var(--sr-green);margin-top:4px;">🎯 Scatter: <strong>Direct hit</strong> — grenade detonates at target (rolled ${rawDist}m, reduced by ${reduction}m).</div>`;
            } else {
              const diceStr = distRolls.length > 1 ? `[${distRolls.join('+')}]=${rawDist}` : rawDist;
              scatterHtml = `<div style="font-size:12px;color:var(--sr-amber);margin-top:4px;">💨 Scatter: grenade landed <strong>${scatterDist}m ${SCATTER_DIRS[dirRoll]}</strong> (rolled ${diceStr}m − ${reduction}m reduction = ${scatterDist}m). Power reduced by ${scatterDist}.</div>`;
            }

            if (state.chunkySalsa?.length) {
              // Confined space (Chunky Salsa): each target has its own blast power, reduced by scatter
              const csMap = new Map(state.chunkySalsa.map(t => [t.actorId, t]));
              const adjustedCs = state.chunkySalsa.map(t => ({ ...t, power: Math.max(0, t.power - scatterDist) }));
              const csLines = adjustedCs.map(t => {
                const waveDetail = (t.waves?.length ?? 0) > 1
                  ? ` <span style="font-weight:normal;color:var(--sr-muted)">(${t.waves.map(w => `${w.label}: ${w.power}`).join(' + ')})</span>`
                  : '';
                return `<div style="margin-top:3px;font-size:11px;"><strong>${t.name}</strong>: ${t.power}${t.level}${waveDetail}</div>`;
              }).join('');
              stagingHtml = `
                <div class="sr-staging-result">
                  💥 Confined blast — ${state.chunkySalsa.length} target${state.chunkySalsa.length !== 1 ? 's' : ''} affected
                  ${csLines}
                  ${scatterHtml}
                </div>`;
              for (const tid of state.aoeTargetIds) {
                const orig = csMap.get(tid);
                if (!orig) continue;
                const adjPower = Math.max(0, orig.power - scatterDist);
                if (adjPower <= 0) continue;
                const tActor = game.actors.get(tid);
                if (!tActor) continue;
                const soakCtx = JSON.stringify({
                  attackerActorId: state.attackerActorId,
                  targetActorId:   tid,
                  weaponItemId:    state.weaponItemId,
                  isMelee:         false,
                  stagedPower:     adjPower,
                  stagedLevel:     orig.level,
                  isStun:          staged.isStun,
                  rawDamage:       `${adjPower}${orig.level}`,
                }).replace(/'/g, '&#39;');
                postRollHtml += `
                  <div class="sr-soak-action">
                    <button class="sr-soak-btn" data-payload='${soakCtx}'>
                      🛡 ${tActor.name}: Resist Damage (${adjPower}${orig.level})
                    </button>
                  </div>`;
              }
            } else {
              // Standard AoE — same staged damage for all targets, reduced by scatter
              const adjPower = Math.max(0, staged.power - scatterDist);
              stagingHtml = `
                <div class="sr-staging-result">
                  📊 ${state.rawDamage} + ${successes} hits → <strong>${staged.power}${staged.level} ${staged.isStun ? 'Stun' : 'Physical'}</strong>
                  ${scatterHtml}
                  ${scatterDist > 0 ? `<div style="font-size:12px;color:var(--sr-muted);margin-top:2px;">Effective power at target: <strong>${adjPower}${staged.level}</strong></div>` : ''}
                </div>`;
              if (adjPower <= 0) {
                postRollHtml = `<div style="font-size:12px;color:var(--sr-muted);padding:4px;">Blast too weak at target location — no soak needed.</div>`;
              } else {
                for (const tid of state.aoeTargetIds) {
                  const tActor = game.actors.get(tid);
                  if (!tActor) continue;
                  const soakCtx = JSON.stringify({
                    attackerActorId: state.attackerActorId,
                    targetActorId:   tid,
                    weaponItemId:    state.weaponItemId,
                    isMelee:         false,
                    stagedPower:     adjPower,
                    stagedLevel:     staged.level,
                    isStun:          staged.isStun,
                    rawDamage:       `${adjPower}${staged.level}`,
                  }).replace(/'/g, '&#39;');
                  postRollHtml += `
                    <div class="sr-soak-action">
                      <button class="sr-soak-btn" data-payload='${soakCtx}'>
                        🛡 ${tActor.name}: Resist Damage (${adjPower}${staged.level})
                      </button>
                    </div>`;
                }
              }
            }
          } else if ((state.committedDodgeDice ?? 0) > 0) {
            // Defender committed dice — show a button to trigger the dodge roll
            const dodgeContext = JSON.stringify({
              attackerActorId: state.attackerActorId,
              targetActorId:   state.targetActorId,
              weaponItemId:    state.weaponItemId,
              ammoType:        state.ammoType ?? null,
              isMelee:         state.isMelee,
              attackSuccesses: successes,
              committedDodgeDice: state.committedDodgeDice,
              stagedPower:     staged.power,
              stagedLevel:     staged.level,
              isStun:          staged.isStun,
              rawDamage:       state.rawDamage,
            }).replace(/'/g, '&#39;');

            postRollHtml = `
              <div class="sr-soak-action">
                <button class="sr-dodge-roll-btn" data-payload='${dodgeContext}'>
                  🎯 ${targetName}, roll to dodge.
                </button>
              </div>`;
          } else {
            // No dodge — show resist button
            const soakContext = JSON.stringify({
              attackerActorId: state.attackerActorId,
              targetActorId:   state.targetActorId,
              weaponItemId:    state.weaponItemId,
              ammoType:        state.ammoType ?? null,
              isMelee:         state.isMelee,
              stagedPower:     staged.power,
              stagedLevel:     staged.level,
              isStun:          staged.isStun,
              rawDamage:       state.rawDamage,
            }).replace(/'/g, '&#39;');

            postRollHtml = `
              <div class="sr-soak-action">
                <button class="sr-soak-btn" data-payload='${soakContext}'>
                  🛡 ${targetName}: Resist Damage
                </button>
              </div>`;
          }
        }
      } else if (state.isWeaponRoll && !state.damageBase) {
        stagingHtml = '<div class="sr-staging-result sr-warn">⚠ No damage code set on this weapon</div>';

      } else if (state.isSpellRoll && state.spellContext) {
        const sc = state.spellContext;

        if (successes === 0) {
          stagingHtml = '<div class="sr-staging-result">0 successes — spell fails (targets resist automatically), no effect</div>';
        } else {
          // SR3 opposed test: caster's successes are carried to each target's resistance
          // roll (Willpower/Body vs Force). Net successes there stage the base damage — no
          // pre-staging here, no soak afterwards. Preview the staging from the cast hits.
          const previewStaged = SR3EItem.stageDamage(sc.damageBase, successes);
          const stagedStr     = `${previewStaged.power}${previewStaged.level}`;
          const stages        = Math.floor(successes / 2);
          const hitsTxt       = `${successes} hit${successes !== 1 ? 's' : ''}`;
          const stageLine     = stages > 0
            ? `${hitsTxt} stages up ×${stages}. <strong>${sc.rawDamage} → ${stagedStr}</strong>`
            : `${hitsTxt} — no stage up. <strong>${sc.rawDamage}</strong>`;
          stagingHtml = `
            <div class="sr-staging-result">
              🔮 ${sc.spellName ?? 'Spell'} (${sc.rawDamage}) cast — <strong>${successes} success${successes !== 1 ? 'es' : ''}</strong> vs TN ${tn}${sc.tnSource ? ` <span style="color:var(--sr-muted)">(${sc.tnSource})</span>` : ''}<br>
              ${stageLine}
            </div>`;

          // Counterspelling (Spell Defense) reduces the caster's successes first, if anyone has it.
          const spellDefenders = game.actors.contents.filter(
            a => (a.system.spellDefensePool ?? 0) > 0 && a.id !== sc.attackerActorId
          );
          if (spellDefenders.length > 0) {
            state._pendingDefenseCard = { currentSuccesses: successes, sc, force: sc.force };
          } else {
            for (const targetId of (sc.targetActorIds ?? [])) {
              postRollHtml += SR3EActor._spellResistButton(sc, targetId, successes);
            }
          }
        }

        // AoE area marker — Clear button (the marker was drawn at cast time).
        if (sc.isAoE && (sc.aoeRegionId || sc.aoeMarkerId)) {
          stagingHtml += SR3EActor._clearBlastButton({ regionId: sc.aoeRegionId, markerId: sc.aoeMarkerId });
        }

        // Drain button always — caster pays drain regardless of hit/miss
        const drainPayload = JSON.stringify({
          actorId:          sc.attackerActorId,
          drainStr:         sc.drainStr,
          force:            sc.force,
          drainLevel:       sc.drainLevel ?? undefined,   // nominated Damage Level (combat spells)
          sorceryRating:    sc.sorceryRating,
          drainIsPhysical:  sc.drainIsPhysical,
          spellName:        sc.spellName,
          spellPoolForDrain: sc.spellPoolForDrain ?? 0,
        }).replace(/'/g, '&#39;');
        const casterName = game.actors.get(sc.attackerActorId)?.name ?? 'Caster';
        postRollHtml += `
          <div class="sr-soak-action">
            <button class="sr-drain-btn" data-payload='${drainPayload}'>
              ⚡ ${casterName}: Resist Drain
            </button>
          </div>`;

      } else if (state.isDispelRoll && state.dispelContext) {
        const dc = state.dispelContext;
        const dispellerName = game.actors.get(dc.actorId)?.name ?? 'Dispeller';
        const dispelled    = Math.min(successes, dc.originalSuccesses);
        const remaining    = dc.originalSuccesses - dispelled;
        stagingHtml = `
          <div class="sr-staging-result">
            ✦ ${dispellerName}: ${successes} dispel hit${successes !== 1 ? 's' : ''}
            — ${dispelled} of ${dc.originalSuccesses} successes dispelled,
            <strong>${remaining}</strong> remain${remaining !== 1 ? '' : 's'}
          </div>`;

        // Drain button — dispeller always resists drain
        const drainPayload = JSON.stringify({
          actorId:         dc.actorId,
          drainStr:        dc.drainCode,
          force:           dc.force,
          sorceryRating:   dc.sorceryRating,
          drainIsPhysical: dc.drainIsPhysical,
          spellName:       `Dispel [F${dc.force}]`,
          spellPoolForDrain: dc.spellPoolForDrain ?? 0,
        }).replace(/'/g, '&#39;');
        postRollHtml += `
          <div class="sr-soak-action">
            <button class="sr-drain-btn" data-payload='${drainPayload}'>
              ⚡ ${dispellerName}: Resist Drain
            </button>
          </div>`;

      } else if (state.isConjuringRoll && state.conjuringContext) {
        const cc       = state.conjuringContext;
        const conjurer = game.actors.get(cc.conjurerActorId);
        const conjName = conjurer?.name ?? 'Conjurer';

        if (successes === 0) {
          stagingHtml = '<div class="sr-staging-result">🌀 Conjuring failed — no spirit appears. (Drain still applies.)</div>';
        } else {
          // SR3: straight Conjuring Test — each success = one service the spirit owes (no spirit resist).
          stagingHtml = `
            <div class="sr-staging-result">
              🌀 <strong>${successes} success${successes !== 1 ? 'es' : ''}</strong> → ${cc.spiritLabel} [F${cc.force}] is bound for <strong>${successes} service${successes !== 1 ? 's' : ''}</strong>.
            </div>`;
          const confirmPayload = JSON.stringify({
            conjurerActorId: cc.conjurerActorId,
            spiritTypeKey:   cc.spiritTypeKey,
            force:           cc.force,
            services:        successes,
          }).replace(/'/g, '&#39;');
          postRollHtml += `
            <div class="sr-soak-action">
              <button class="sr-summon-confirm-btn" data-payload='${confirmPayload}'>
                🌀 Confirm Summoning (${successes} service${successes !== 1 ? 's' : ''})
              </button>
            </div>`;
        }

        // Drain — always, even on failure. Level from the Force-vs-Charisma table (computed at
        // cast); TN = Force; resisted with Charisma + any dice held back from the Conjuring Test.
        const drainPayload = JSON.stringify({
          actorId:          cc.conjurerActorId,
          drainTNOverride:  cc.force,
          drainLevel:       cc.drainLevel ?? 'M',
          drainIsPhysical:  cc.drainIsPhysical,
          resistAttr:       'charisma',
          resistName:       'Charisma',
          bonusDice:        cc.heldBack ?? 0,
          drainNote:        'GM: add totem modifiers / spirit foci dice as applicable.',
          spellName:        `Conjure ${cc.spiritLabel} [F${cc.force}]`,
        }).replace(/'/g, '&#39;');
        postRollHtml += `
          <div class="sr-soak-action">
            <button class="sr-drain-btn" data-payload='${drainPayload}'>
              ⚡ ${conjName}: Resist Drain
            </button>
          </div>`;

      } else if (state.isSpellDefenseRoll && state.spellDefenseContext) {
        // Spell Defense wave resolved — reduce the carried success count
        const sdc         = state.spellDefenseContext;
        const newSuccesses = Math.max(0, sdc.currentSuccesses - successes);
        const defenderName = game.actors.get(sdc.defenderActorId)?.name ?? 'Defender';

        stagingHtml = `
          <div class="sr-staging-result">
            🛡 ${defenderName}: ${successes} defense hit${successes !== 1 ? 's' : ''}
            — caster successes ${sdc.currentSuccesses} → <strong>${newSuccesses}</strong>
          </div>`;

        if (newSuccesses === 0) {
          stagingHtml += `<div class="sr-staging-result sr-soak-blocked">✨ Spell completely defended!</div>`;
          // Only drain remains
          state._pendingDefenseCard = { currentSuccesses: 0, sc: sdc.spellContext, force: sdc.force };
        } else {
          state._pendingDefenseCard = { currentSuccesses: newSuccesses, sc: sdc.spellContext, force: sdc.force };
        }
      } else if (state.isRammingRoll && state.rammingContext) {
        stagingHtml = SR3EActor._buildRamDamageHtml(successes, state.rammingContext);
      } else if (state.isCrashRoll && state.crashContext) {
        if (successes === 0) {
          stagingHtml = SR3EActor._buildCrashDamageHtml(state.crashContext);
        } else {
          stagingHtml = `<div class="sr-staging-result" style="color:#4caf50;">✅ ${successes} success${successes !== 1 ? 'es' : ''} — vehicle remains under control.</div>`;
        }
      } else if (state.isProgramRoll && state.programContext) {
        const pc = state.programContext;

        // Overwatch check
        if (pc.hostActorId && (pc.securityThreshold ?? 0) > 0 && successes < pc.securityThreshold) {
          await SR3EActor._incrementOverwatch(pc.hostActorId, pc.actorId);
        }

        if (pc.isOffensive && pc.targetActorId) {
          // Auto-roll IC defense (program offensive roll vs IC)
          const targetIC = game.actors.get(pc.targetActorId);
          const icRating = targetIC?.system?.rating ?? 1;
          const icName   = targetIC?.name ?? 'IC';

          let icHits = 0;
          const icFaces = [];
          for (let i = 0; i < icRating; i++) {
            const f = Math.floor(Math.random() * 6) + 1;
            icFaces.push(f);
            if (f >= state.tn) icHits++;
          }

          const netHits = Math.max(0, successes - icHits);
          stagingHtml = `
            <div class="sr-staging-result" style="color:var(--sr-muted)">
              💻 ${icName} defends: ${icRating}d6 vs TN ${state.tn} → [${icFaces.join(', ')}] = <strong>${icHits}</strong> hit${icHits !== 1 ? 's' : ''}
            </div>`;

          if (netHits <= 0) {
            stagingHtml += '<div class="sr-staging-result sr-soak-blocked">✅ IC blocks all hits — no effect!</div>';
          } else {
            const staged = SR3EItem.stageDamage(pc.damageBase, netHits);
            const trackLabel = staged.isStun ? 'Stun' : 'Physical';
            stagingHtml += `
              <div class="sr-staging-result">
                💻 Net ${netHits} hit${netHits !== 1 ? 's' : ''}: ${pc.damageCode} → <strong>${staged.power}${staged.level} ${trackLabel}</strong>
              </div>`;
            const resistCtx = JSON.stringify({
              icActorId:   pc.targetActorId,
              stagedPower: staged.power,
              stagedLevel: staged.level,
              isStun:      staged.isStun,
              rawDamage:   pc.damageCode,
            }).replace(/'/g, '&#39;');
            postRollHtml = `
              <div class="sr-soak-action">
                <button class="sr-matrix-ic-resist-btn" data-payload='${resistCtx}'>
                  💻 ${icName}: Resist Matrix Damage
                </button>
              </div>`;
          }
        } else {
          // Utility/defensive program — show successes, GM resolves effect
          stagingHtml = `
            <div class="sr-staging-result">
              💻 ${successes} success${successes !== 1 ? 'es' : ''} — apply program effect as appropriate
            </div>`;
        }

      } else if (state.isMatrixSoakRoll && state.matrixSoakContext) {
        // IC soaking damage — same staging logic as normal soak
        const msc     = state.matrixSoakContext;
        const STAGES  = ['L', 'M', 'S', 'D'];
        let idx       = STAGES.indexOf(msc.stagedLevel);
        let remaining = successes;
        const origIdx = idx;
        while (remaining >= 2 && idx >= 0) { remaining -= 2; idx--; }

        if (idx < 0) {
          stagingHtml = '<div class="sr-staging-result sr-soak-blocked">💻 Matrix damage fully resisted!</div>';
        } else {
          const finalLevel = STAGES[idx];
          const unchanged  = idx === origIdx;
          const resultLine = unchanged
            ? `${successes} resist hit${successes !== 1 ? 's' : ''} — damage unchanged: <strong>${msc.stagedPower}${finalLevel} Matrix</strong>`
            : `${successes} resist hit${successes !== 1 ? 's' : ''} — <strong>${msc.stagedPower}${msc.stagedLevel}</strong> staged down to <strong>${msc.stagedPower}${finalLevel} Matrix</strong>`;
          const icBoxes = ({ L: 1, M: 3, S: 6, D: 10 })[finalLevel] ?? 1;
          const icName  = game.actors.get(msc.icActorId)?.name ?? 'IC';
          const icAssignPayload = JSON.stringify({ icActorId: msc.icActorId, boxes: icBoxes }).replace(/'/g, '&#39;');
          stagingHtml = `
            <div class="sr-staging-result">💻 ${resultLine}</div>
            <div class="sr-soak-action">
              <button class="sr-assign-damage-btn" data-payload='${icAssignPayload}'>
                💉 Assign ${SR3EActor._woundName(finalLevel)} Matrix Wound to ${icName}
              </button>
            </div>`;
        }

      } else if (state.isDeckerMatrixSoakRoll && state.deckerMatrixSoakContext) {
        // Decker soaking matrix damage with MPCP
        const dsc    = state.deckerMatrixSoakContext;
        const STAGES = ['L', 'M', 'S', 'D'];
        let idx      = STAGES.indexOf(dsc.stagedLevel);
        let remaining = successes;
        const origIdx = idx;
        while (remaining >= 2 && idx >= 0) { remaining -= 2; idx--; }

        if (idx < 0) {
          stagingHtml = '<div class="sr-staging-result sr-soak-blocked">💻 Matrix damage fully resisted!</div>';
        } else {
          const finalLevel = STAGES[idx];
          const unchanged  = idx === origIdx;
          const resultLine = unchanged
            ? `${successes} resist hit${successes !== 1 ? 's' : ''} — damage unchanged: <strong>${dsc.stagedPower}${finalLevel} Matrix</strong>`
            : `${successes} resist hit${successes !== 1 ? 's' : ''} — <strong>${dsc.stagedPower}${dsc.stagedLevel}</strong> staged down to <strong>${dsc.stagedPower}${finalLevel} Matrix</strong>`;
          stagingHtml = `<div class="sr-staging-result">💻 ${resultLine}</div>`;
        }
      }

      const footerNoteHtml = state.footerNote
        ? `<div class="sr-roll-note">${state.footerNote.replace('{successes}', successes)}</div>`
        : '';

      resultHtml = `
        <div class="sr-roll-stats">
          <span class="sr-stat">🎲 Successes: ${successes}</span>
          ${state.physicalDice ? '' : `<span class="sr-stat">⚠️ 1s: ${ones}</span>`}
        </div>
        <div class="sr-roll-result">
          <strong>${successes}</strong> success${successes !== 1 ? 'es' : ''}
        </div>
        ${stagingHtml}
        ${glitchHtml}
        ${postRollHtml}
        ${footerNoteHtml}
      `;
    } else {
      resultHtml = `
        <div class="sr-roll-stats">
          <span class="sr-stat">🎲 Successes so far: ${successes}</span>
          <span class="sr-stat">💥 Exploding: ${explodingDice.length}</span>
        </div>
      `;
    }

    // Explosion button with full state payload.
    let explodeBtn = '';
    if (!allDone) {
      const payload = JSON.stringify({
        actorId, label, tn, pool, wave: wave + 1, dice, ones, glitch,
        explodeIdx: explodingDice.map(d => d.index),
        isWeaponRoll:       state.isWeaponRoll       ?? false,
        isMelee:            state.isMelee            ?? false,
        isAoE:              state.isAoE              ?? false,
        aoeTargetIds:       state.aoeTargetIds       ?? null,
        chunkySalsa:        state.chunkySalsa        ?? null,
        aoeCenter:          state.aoeCenter          ?? null,
        aoeRadius:          state.aoeRadius          ?? null,
        aoeThrowerCenter:   state.aoeThrowerCenter   ?? null,
        aoeChunky:          state.aoeChunky          ?? false,
        rawDamage:          state.rawDamage          ?? '',
        damageBase:         state.damageBase         ?? null,
        weaponItemId:       state.weaponItemId       ?? null,
        attackerActorId:    state.attackerActorId    ?? null,
        targetActorId:      state.targetActorId      ?? null,
        committedDodgeDice: state.committedDodgeDice ?? 0,
        isSoakRoll:         state.isSoakRoll         ?? false,
        soakPayload:        state.soakPayload        ?? null,
        isSpellRoll:        state.isSpellRoll        ?? false,
        spellContext:       state.spellContext        ?? null,
        isSpellResist:      state.isSpellResist       ?? false,
        spellResistContext: state.spellResistContext  ?? null,
        isDrainRoll:        state.isDrainRoll         ?? false,
        drainPayload:       state.drainPayload        ?? null,
        isDispelRoll:       state.isDispelRoll        ?? false,
        dispelContext:      state.dispelContext       ?? null,
        isConjuringRoll:    state.isConjuringRoll     ?? false,
        conjuringContext:   state.conjuringContext    ?? null,
        isAssensingRoll:    state.isAssensingRoll     ?? false,
        isAuraReadingRoll:  state.isAuraReadingRoll   ?? false,
        auraReadingContext: state.auraReadingContext   ?? null,
        isRammingRoll:      state.isRammingRoll       ?? false,
        rammingContext:     state.rammingContext       ?? null,
        isCrashRoll:        state.isCrashRoll          ?? false,
        crashContext:       state.crashContext          ?? null,
        isVehicleSoakRoll:    state.isVehicleSoakRoll    ?? false,
        vehicleSoakContext:   state.vehicleSoakContext   ?? null,
        isMatrixSoakRoll:          state.isMatrixSoakRoll          ?? false,
        matrixSoakContext:         state.matrixSoakContext         ?? null,
        isDeckerMatrixSoakRoll:    state.isDeckerMatrixSoakRoll    ?? false,
        deckerMatrixSoakContext:   state.deckerMatrixSoakContext   ?? null,
        isProgramRoll:             state.isProgramRoll             ?? false,
        programContext:            state.programContext            ?? null,
        isHackingActionRoll:       state.isHackingActionRoll       ?? false,
        hackingActionContext:      state.hackingActionContext      ?? null,
        barrierContext:            state.barrierContext            ?? null,
        grenadeType:               state.grenadeType               ?? 'standard',
        footerNote:                state.footerNote                ?? null,
      }).replace(/'/g, '&#39;');
      explodeBtn = `
        <div class="sr-explode-action">
          <button class="sr-explode-btn" data-payload='${payload}'>
            💥 Roll explosions (${explodingDice.length} ${explodingDice.length === 1 ? 'die' : 'dice'})
          </button>
        </div>
      `;
    }

    // Dodge result announcement — shown when dodge wave fully resolves
    let dodgeResultHtml = '';
    if (allDone && state.isDodgeRoll && state.dodgePayload) {
      const dp          = state.dodgePayload;
      const dodgerName  = game.actors.get(dp.targetActorId)?.name   ?? 'Defender';
      const attackerName = game.actors.get(dp.attackerActorId)?.name ?? 'Attacker';
      const netHits     = dp.attackSuccesses - successes;

      if (netHits <= 0) {
        // Dodge cancelled all hits — miss
        dodgeResultHtml = `
          <div class="sr-dodge-result sr-dodge-success">
            ✅ Dodge Successful! No damage taken.
          </div>`;
      } else {
        // Dodge failed — full hit lands, staging based on raw attack successes (dodge doesn't reduce staging)
        const trackLabel = dp.isStun ? 'Stun' : 'Physical';
        const soakBtn    = dp.isSpellSoak
          ? SR3EActor._spellSoakButtonHtml(dp)
          : SR3EActor._soakButtonHtml(dp);
        dodgeResultHtml = `
          <div class="sr-dodge-result sr-dodge-fail">
            ❌ Dodge Failed! Incoming: <strong>${dp.stagedPower}${dp.stagedLevel} ${trackLabel}</strong>
          </div>
          ${soakBtn}`;
      }
    }

    // Drain roll result — shown when drain resist wave fully resolves
    let drainResultHtml = '';
    if (allDone && state.isDrainRoll && state.drainPayload) {
      const dp     = state.drainPayload;
      const STAGES = ['L', 'M', 'S', 'D'];
      let idx      = STAGES.indexOf(dp.drainLevel);
      const origIdx = idx;
      let remaining = successes;
      while (remaining >= 2 && idx >= 0) { remaining -= 2; idx--; }
      const trackLabel = dp.drainIsPhysical ? 'Physical' : 'Stun';
      if (idx < 0) {
        drainResultHtml = '<div class="sr-soak-result sr-soak-blocked">⚡ Drain completely resisted!</div>';
      } else {
        const finalLevel = STAGES[idx];
        const unchanged  = idx === origIdx;
        const resultLine = unchanged
          ? `${successes} hit${successes !== 1 ? 's' : ''} — drain unchanged: <strong>${finalLevel} ${trackLabel}</strong>`
          : `${successes} hit${successes !== 1 ? 's' : ''} — <strong>${dp.drainLevel} ${trackLabel}</strong> staged down to <strong>${finalLevel} ${trackLabel}</strong>`;
        const drainBoxes   = ({ L: 1, M: 3, S: 6, D: 10 })[finalLevel] ?? 1;
        const drainTrack   = dp.drainIsPhysical ? 'physical' : 'stun';
        const drainActorName = game.actors.get(dp.actorId)?.name ?? 'Caster';
        const drainAssignPayload = JSON.stringify({ actorId: dp.actorId, track: drainTrack, boxes: drainBoxes }).replace(/'/g, '&#39;');
        drainResultHtml = `
          <div class="sr-soak-result">⚡ ${resultLine}</div>
          <div class="sr-soak-action">
            <button class="sr-assign-damage-btn" data-payload='${drainAssignPayload}'>
              ⚡ Assign ${SR3EActor._woundName(finalLevel)} ${trackLabel} Wound to ${drainActorName}
            </button>
          </div>
        `;
      }
    }

    // Soak result announcement — shown when soak wave fully resolves
    let soakResultHtml = '';
    if (allDone && state.isSoakRoll && state.soakPayload) {
      const sp      = state.soakPayload;
      const STAGES  = ['L', 'M', 'S', 'D'];
      let idx       = STAGES.indexOf(sp.stagedLevel);
      let power     = sp.stagedPower;
      let remaining = successes;
      const origIdx = idx;

      while (remaining >= 2 && idx >= 0) {
        remaining -= 2;
        idx--;
      }

      if (idx < 0) {
        soakResultHtml = '<div class="sr-soak-result sr-soak-blocked">🛡 Damage completely soaked!</div>';
      } else {
        const finalLevel = STAGES[idx];
        const trackLabel = sp.isStun ? 'Stun' : 'Physical';
        const unchanged  = idx === origIdx && power === sp.stagedPower;
        const resultLine = unchanged
          ? `${successes} soak hit${successes !== 1 ? 's' : ''} — damage unchanged: <strong>${power}${finalLevel} ${trackLabel}</strong>`
          : `${successes} soak hit${successes !== 1 ? 's' : ''} — <strong>${sp.stagedPower}${sp.stagedLevel}</strong> staged down to <strong>${power}${finalLevel} ${trackLabel}</strong>`;
        const soakBoxes      = ({ L: 1, M: 3, S: 6, D: 10 })[finalLevel] ?? 1;
        const soakTrack      = sp.isStun ? 'stun' : 'physical';
        const soakTargetName = game.actors.get(sp.actorId)?.name ?? 'Target';
        const soakAssignPayload = JSON.stringify({ actorId: sp.actorId, track: soakTrack, boxes: soakBoxes }).replace(/'/g, '&#39;');
        soakResultHtml = `
          <div class="sr-soak-result">🛡 ${resultLine}</div>
          <div class="sr-soak-action">
            <button class="sr-assign-damage-btn" data-payload='${soakAssignPayload}'>
              🩸 Assign ${SR3EActor._woundName(finalLevel)} ${trackLabel} Wound to ${soakTargetName}
            </button>
          </div>
        `;
      }
    }

    let vehicleSoakResultHtml = '';
    if (allDone && state.isVehicleSoakRoll && state.vehicleSoakContext) {
      vehicleSoakResultHtml = SR3EActor._buildVehicleSoakResultHtml(successes, state.vehicleSoakContext);
    }

    // Spell resistance result — net (caster − resister) successes stage the base damage.
    // No further soak: the resistance test IS the defence.
    let spellResistResultHtml = '';
    if (allDone && state.isSpellResist && state.spellResistContext) {
      const rc    = state.spellResistContext;
      const net   = Math.max(0, (rc.attackSuccesses ?? 0) - successes);
      const tName = game.actors.get(rc.targetActorId)?.name ?? 'Target';
      if (net <= 0) {
        spellResistResultHtml = `<div class="sr-soak-result sr-soak-blocked">✨ Spell resisted — ${successes} resistance hit${successes !== 1 ? 's' : ''} ≥ ${rc.attackSuccesses ?? 0} casting hit${(rc.attackSuccesses ?? 0) !== 1 ? 's' : ''}. No effect.</div>`;
      } else {
        const staged     = SR3EItem.stageDamage(rc.baseDamage, net);
        const trackLabel = staged.isStun ? 'Stun' : 'Physical';
        const boxes      = ({ L: 1, M: 3, S: 6, D: 10 })[staged.level] ?? 1;
        const track      = staged.isStun ? 'stun' : 'physical';
        const payload    = JSON.stringify({ actorId: rc.targetActorId, track, boxes }).replace(/'/g, '&#39;');
        spellResistResultHtml = `
          <div class="sr-soak-result">🔮 net <strong>${net}</strong> success${net !== 1 ? 'es' : ''} → <strong>${staged.power}${staged.level} ${trackLabel}</strong></div>
          <div class="sr-soak-action">
            <button class="sr-assign-damage-btn" data-payload='${payload}'>
              🩸 Assign ${SR3EActor._woundName(staged.level)} ${trackLabel} Wound to ${tName}
            </button>
          </div>`;
      }
    }

    const waveMeta = wave === 0
      ? `${pool} dice vs TN ${tn}`
      : `Wave ${wave} — ${explodingDice.length} dice exploding`;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `
        <div class="sr-roll-card">
          <div class="sr-roll-header">${label}</div>
          <div class="sr-roll-meta">${waveMeta}</div>
          <div class="sr-roll-dice">${diceHtml}</div>
          ${resultHtml}
          ${dodgeResultHtml}
          ${soakResultHtml}
          ${spellResistResultHtml}
          ${vehicleSoakResultHtml}
          ${drainResultHtml}
          ${explodeBtn}
        </div>
      `,
      style: CONST.CHAT_MESSAGE_STYLES.ROLL,
    });

    // Post the Spell Defense phase card after the wave card so messages are in order
    if (state._pendingDefenseCard) {
      await SR3EActor.postSpellDefenseCard(state._pendingDefenseCard);
    }

    // Post assensing result after all explosions resolve
    if (allDone && state.isAssensingRoll) {
      const actorName = game.actors.get(state.actorId)?.name ?? 'Unknown';
      await SR3EActor._postAssensingResult(successes, state.tn, actorName, { actorId: state.actorId });
    }

    // Post updated assensing result after Aura Reading complementary roll resolves
    if (allDone && state.isAuraReadingRoll && state.auraReadingContext) {
      const arc      = state.auraReadingContext;
      const bonus    = Math.floor(successes / 2);
      const newTotal = arc.originalSuccesses + bonus;
      await SR3EActor._postAssensingResult(newTotal, state.tn, arc.actorName ?? game.actors.get(arc.actorId)?.name ?? 'Unknown', {
        actorId:       arc.actorId,
        auraBonus:     bonus,
        auraSuccesses: successes,
      });
    }

    // Demolitions barrier damage — apply successes to Power and post result
    if (allDone && state.barrierContext) {
      const { basePower, currentBR, material } = state.barrierContext;
      const effectivePower = basePower + successes;
      const effect = SR3EActor.computeBarrierEffect(effectivePower, currentBR, 'demolitions');
      await SR3EActor._postBarrierDamageCard(effect, material, currentBR, effectivePower, successes);
    }

    // Escape Artist — post success (with time) or failure (with retry time)
    if (allDone && state.escapeContext) {
      const { restraintName, baseTime, actorId } = state.escapeContext;
      const actor = game.actors.get(actorId);
      if (actor) {
        if (successes > 0) {
          const time = Math.ceil(baseTime / successes);
          await ChatMessage.create({
            content: `
              <div class="sr-roll-card">
                <div class="sr-roll-header" style="color:var(--sr-green)">🔓 ${actor.name} — Escaped (${restraintName})</div>
                <div class="sr-roll-result">${successes} success${successes !== 1 ? 'es' : ''} — escaped in <strong>${time} minute${time !== 1 ? 's' : ''}</strong>.</div>
              </div>`,
            style: CONST.CHAT_MESSAGE_STYLES.OTHER,
          });
        } else {
          await ChatMessage.create({
            content: `
              <div class="sr-roll-card">
                <div class="sr-roll-header" style="color:var(--sr-red)">🔒 ${actor.name} — Escape Failed (${restraintName})</div>
                <div class="sr-roll-result">Cannot try again for <strong>${baseTime} minute${baseTime !== 1 ? 's' : ''}</strong>.</div>
              </div>`,
            style: CONST.CHAT_MESSAGE_STYLES.OTHER,
          });
        }
      }
    }

    // Falling damage — subtract Athletics successes from power, then post soak card
    if (allDone && state.fallingContext) {
      const { netPower, level, actorId } = state.fallingContext;
      const finalPower = Math.max(0, netPower - successes);
      const actor = game.actors.get(actorId);
      if (actor) {
        if (finalPower <= 0) {
          await ChatMessage.create({
            content: `
              <div class="sr-roll-card">
                <div class="sr-roll-header">🪂 Falling — ${actor.name}</div>
                <div class="sr-roll-result" style="color:var(--sr-green)">Athletics negates all damage — ${successes} success${successes !== 1 ? 'es' : ''} reduces Power to 0.</div>
              </div>`,
            style: CONST.CHAT_MESSAGE_STYLES.OTHER,
          });
        } else {
          await actor._postSoakCard({
            stagedPower: finalPower, stagedLevel: level, isStun: false, isMelee: true,
            rawDamage: `${finalPower}${level}`, attackerActorId: null, targetActorId: actorId,
          });
        }
      }
    }

    // Hacking action threshold check — increment Overwatch if below Security Threshold
    if (allDone && state.isHackingActionRoll && state.hackingActionContext) {
      const hac = state.hackingActionContext;
      if (successes < hac.securityThreshold) {
        if (hac.overwatchOnFail && hac.hostActorId) {
          await SR3EActor._incrementOverwatch(hac.hostActorId, hac.attackerActorId);
        } else {
          await ChatMessage.create({
            content: `
              <div class="sr-roll-card">
                <div class="sr-roll-header" style="color:var(--sr-amber)">⚠ Threshold Missed — ${hac.actionName}</div>
                <div class="sr-roll-result">${successes} hit${successes !== 1 ? 's' : ''} — need ${hac.securityThreshold}. Action failed.</div>
              </div>`,
            style: CONST.CHAT_MESSAGE_STYLES.OTHER,
          });
        }
      } else {
        await ChatMessage.create({
          content: `
            <div class="sr-roll-card">
              <div class="sr-roll-header" style="color:var(--sr-green)">✅ Threshold Met — ${hac.actionName}</div>
              <div class="sr-roll-result">${successes} hit${successes !== 1 ? 's' : ''} vs threshold ${hac.securityThreshold} — proceed with action.</div>
            </div>`,
          style: CONST.CHAT_MESSAGE_STYLES.OTHER,
        });
        if (hac.grantsAccess && hac.nodeId) {
          await SR3EActor._addMatrixMark(hac.attackerActorId, hac.nodeId, hac.hostActorId);
        }
      }
    }
  }

  // ── Barrier damage ─────────────────────────────────────────────────────────

  static computeBarrierEffect(power, currentBR, attackType = 'blast') {
    const effectiveBR = attackType === 'blast' ? currentBR * 2 : currentBR;
    const halfEffBR   = effectiveBR / 2;
    if (power < halfEffBR) {
      return { result: 'no_effect', effectiveBR, brReduction: 0, holes: 0, remainingPower: null };
    }
    if (power <= effectiveBR) {
      return { result: 'damage', effectiveBR, brReduction: 1, holes: 0, remainingPower: null };
    }
    const halfCurrentBR = currentBR / 2;
    const excess        = power - effectiveBR;
    const increments    = halfCurrentBR > 0 ? Math.floor(excess / halfCurrentBR) : 1;
    const remainPower   = attackType === 'blast' ? power - currentBR : null;
    return { result: 'breach', effectiveBR, brReduction: increments, holes: increments * 0.5, remainingPower: remainPower };
  }

  static async _postBarrierDamageCard(effect, material, currentBR, power, demSuccesses = 0) {
    const { result, effectiveBR, brReduction, holes, remainingPower } = effect;
    const newBR = Math.max(0, currentBR - brReduction);

    let headerBg, headerColor, resultHtml;
    if (result === 'no_effect') {
      headerBg = '#1a1a2a'; headerColor = '#8888cc';
      resultHtml = `<div style="font-size:13px;color:var(--sr-muted);">Barrier holds — no structural damage. Minor cosmetic damage only.</div>`;
    } else if (result === 'damage') {
      headerBg = '#2a1a0a'; headerColor = '#c8a040';
      resultHtml = `<div style="font-size:13px;">Barrier damaged — reduce BR by 1 <span style="color:var(--sr-muted)">(${currentBR} → ${newBR})</span>.</div>`;
    } else {
      headerBg = '#5a1010'; headerColor = '#ff8060';
      if (newBR <= 0) {
        resultHtml = `
          <div style="font-size:13px;"><strong>Barrier destroyed.</strong></div>
          ${remainingPower > 0 ? `<div style="font-size:12px;margin-top:4px;color:var(--sr-amber);">Blast continues through — remaining Power <strong>${Math.round(remainingPower)}</strong>.</div>` : ''}`;
      } else {
        const holeStr = holes === 0.5 ? '0.5m hole' : `${holes}m of holes`;
        resultHtml = `
          <div style="font-size:13px;"><strong>${holeStr} opened.</strong> BR reduced by ${brReduction} <span style="color:var(--sr-muted)">(${currentBR} → ${newBR})</span>.</div>
          ${remainingPower > 0 ? `<div style="font-size:12px;margin-top:4px;color:var(--sr-amber);">Blast continues through — remaining Power <strong>${Math.round(remainingPower)}</strong>.</div>` : ''}`;
      }
    }

    const modNote = effectiveBR !== currentBR
      ? `<span style="color:var(--sr-muted)"> (${currentBR} × 2 for blast)</span>` : '';
    const demNote = demSuccesses > 0
      ? `<div style="font-size:11px;color:var(--sr-muted);">Demolitions: ${demSuccesses} success${demSuccesses !== 1 ? 'es' : ''} added → Power ${power}</div>` : '';

    await ChatMessage.create({
      speaker: { alias: 'GM' },
      content: `
        <div class="sr-roll-card">
          <div class="sr-roll-header" style="background:${headerBg};color:${headerColor};">🧱 Barrier Damage — ${material}</div>
          <div class="sr-roll-body" style="padding:8px">
            <div style="font-size:11px;color:var(--sr-muted);margin-bottom:6px;">
              Current BR <strong>${currentBR}</strong> · effective BR <strong>${effectiveBR}</strong>${modNote} · Power <strong>${power}</strong>
              ${demNote}
            </div>
            ${resultHtml}
          </div>
        </div>`,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
    });
  }

  /**
   * Handle a click on "Roll explosions".
   * Registered as a static handler in sr3e.js via a delegated click listener
   * on the chat log. Deserialises state from the button payload and fires the
   * next wave.
   *
   * @param {string} payloadJson
   */
  static async handleExplosionClick(payloadJson) {
    const state = JSON.parse(payloadJson);
    const actor = game.actors.get(state.actorId);
    if (!actor) return;

    const newDice = actor._rollWave(
      state.explodeIdx.length,
      state.tn,
      /* isFirstWave */ false,
      state.dice,
      state.explodeIdx,
    );

    await actor._postWaveCard({
      ...state,
      dice: newDice,
      wave: state.wave,
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Ramming damage resolution                                           */
  /* ------------------------------------------------------------------ */

  static _buildRamDamageHtml(successes, ctx) {
    // speeds in km/ct; standard SR3 impact table in km/ct
    const speedDiff = Math.abs((ctx.attackerSpeed ?? 0) - (ctx.defenderSpeed ?? 0));
    const power     = Math.max(1, Math.ceil(speedDiff / 10));
    const STAGES    = ['L', 'M', 'S', 'D'];
    const baseLevel = speedDiff >= 201 ? 'D' : speedDiff >= 61 ? 'S' : speedDiff >= 21 ? 'M' : 'L';

    // Attacker benefits: stage DOWN by floor(successes/2)
    let atkIdx    = STAGES.indexOf(baseLevel);
    const stageDn = Math.floor(successes / 2);
    atkIdx = Math.max(-1, atkIdx - stageDn);

    const atkDamage = atkIdx >= 0 ? `${power}${STAGES[atkIdx]} Physical` : 'No damage (completely staged off)';

    const _ctx = (soakPool, power, level, isAtk) => JSON.stringify({
      vehicleActorId:    isAtk ? ctx.attackerVehicleActorId : ctx.defenderVehicleActorId,
      vehicleName:       isAtk ? ctx.attackerVehicleName    : ctx.defenderVehicleName,
      driverActorId:     isAtk ? ctx.attackerDriverActorId  : ctx.defenderDriverActorId,
      soakPool,
      power,
      level,
      passengerActorIds: isAtk ? (ctx.attackerPassengerActorIds ?? []) : (ctx.defenderPassengerActorIds ?? []),
    }).replace(/'/g, '&#39;');

    let html = `
      <div class="sr-staging-result">
        💥 Speed difference: ${Math.round(speedDiff * 1.2)} km/h (${speedDiff.toFixed(1)} km/ct) → Base damage: <strong>${power}${baseLevel} Physical</strong>
      </div>
      <div class="sr-staging-result">
        Attacker ${successes} success${successes !== 1 ? 'es' : ''}: −${stageDn} stage${stageDn !== 1 ? 's' : ''} → <strong>${atkDamage}</strong>
      </div>`;

    if (atkIdx >= 0) {
      html += `
      <div class="sr-soak-action">
        <button class="sr-ram-vehicle-soak-btn" data-payload='${_ctx(ctx.attackerSoakPool ?? 4, power, STAGES[atkIdx], true)}'>
          🚗 ${ctx.attackerVehicleName}: Soak Damage (${power}${STAGES[atkIdx]}, TN ${power})
        </button>
      </div>`;
    }

    html += `
      <div class="sr-soak-action">
        <button class="sr-ram-vehicle-soak-btn" data-payload='${_ctx(ctx.defenderSoakPool ?? 4, power, baseLevel, false)}'>
          🚗 ${ctx.defenderVehicleName}: Soak Damage (${power}${baseLevel}, TN ${power})
        </button>
      </div>`;

    return html;
  }

  static _buildCrashDamageHtml(ctx) {
    // speedKmct stored in km/ct; standard SR3 impact table
    const speedKmct = ctx.speedKmct ?? 0;
    const power     = Math.max(1, Math.ceil(speedKmct / 10));
    const level     = speedKmct >= 201 ? 'D' : speedKmct >= 61 ? 'S' : speedKmct >= 21 ? 'M' : 'L';
    const soakCtx   = JSON.stringify({
      vehicleActorId:    ctx.vehicleActorId,
      vehicleName:       ctx.vehicleName,
      driverActorId:     ctx.driverActorId,
      soakPool:          ctx.vehicleBody ?? 4,
      power,
      level,
      passengerActorIds: ctx.passengerActorIds ?? [],
      useStaged:         true,
    }).replace(/'/g, '&#39;');

    return `
      <div class="sr-staging-result" style="color:#c94040;">
        💥 CRASH! ${ctx.vehicleName} has crashed — speed reduced to 0.
      </div>
      <div class="sr-staging-result">
        Impact at ${Math.round(speedKmct * 1.2)} km/h (${speedKmct.toFixed(1)} km/ct) → Damage: <strong>${power}${level} Physical</strong>
      </div>
      <div class="sr-soak-action">
        <button class="sr-ram-vehicle-soak-btn" data-payload='${soakCtx}'>
          🚗 ${ctx.vehicleName}: Soak Impact (${power}${level}, ${ctx.vehicleBody ?? 4} Body, TN ${power})
        </button>
      </div>`;
  }

  static _buildVehicleSoakResultHtml(successes, ctx) {
    const STAGES  = ['L', 'M', 'S', 'D'];
    let idx       = STAGES.indexOf(ctx.level);
    const origIdx = idx;
    let remaining = successes;
    while (remaining >= 2 && idx >= 0) { remaining -= 2; idx--; }

    let html = '';
    if (idx < 0) {
      html += `<div class="sr-soak-result sr-soak-blocked">🛡 ${ctx.vehicleName}: Damage completely soaked!</div>`;
    } else {
      const finalLevel = STAGES[idx];
      const unchanged  = idx === origIdx;
      const resultLine = unchanged
        ? `${successes} soak hit${successes !== 1 ? 's' : ''} — damage unchanged: <strong>${ctx.power}${finalLevel} Physical</strong>`
        : `${successes} soak hit${successes !== 1 ? 's' : ''} — <strong>${ctx.power}${ctx.level}</strong> staged down to <strong>${ctx.power}${finalLevel} Physical</strong>`;
      const vehBoxes = ({ L: 1, M: 3, S: 6, D: 10 })[finalLevel] ?? 1;
      const vehAssignPayload = JSON.stringify({ vehicleActorId: ctx.vehicleActorId, boxes: vehBoxes }).replace(/'/g, '&#39;');
      html += `
        <div class="sr-soak-result">🛡 ${ctx.vehicleName}: ${resultLine}</div>
        <div class="sr-soak-action">
          <button class="sr-assign-damage-btn" data-payload='${vehAssignPayload}'>
            🩸 Assign ${SR3EActor._woundName(finalLevel)} Wound to ${ctx.vehicleName}
          </button>
        </div>`;
    }

    // Occupants resist the staged-down level (ctx.useStaged=true for crash)
    // or the original level (ramming default).
    const resistLevel = (ctx.useStaged && idx >= 0) ? STAGES[idx] : ctx.level;
    const resistLabel = resistLevel ? `${ctx.power}${resistLevel}` : 'No damage';

    // Driver resists damage as a passenger would
    const driverActor = game.actors.get(ctx.driverActorId);
    if (driverActor && resistLevel) {
      const body = driverActor.system?.attributes?.body?.value ?? driverActor.system?.attributes?.body?.base ?? 3;
      const dCtx = JSON.stringify({ passengerActorId: driverActor.id, passengerName: driverActor.name, power: ctx.power, level: resistLevel, body }).replace(/'/g, '&#39;');
      html += `
        <div class="sr-soak-action">
          <button class="sr-ram-passenger-resist-btn" data-payload='${dCtx}'>
            🧑 ${driverActor.name} (Driver): Resist Damage (${resistLabel}, ${body} Body, TN ${ctx.power})
          </button>
        </div>`;
    }

    for (const pid of (ctx.passengerActorIds ?? [])) {
      const pActor = game.actors.get(pid);
      if (!pActor || !resistLevel) continue;
      const body = pActor.system?.attributes?.body?.value ?? pActor.system?.attributes?.body?.base ?? 3;
      const pCtx = JSON.stringify({ passengerActorId: pid, passengerName: pActor.name, power: ctx.power, level: resistLevel, body }).replace(/'/g, '&#39;');
      html += `
        <div class="sr-soak-action">
          <button class="sr-ram-passenger-resist-btn" data-payload='${pCtx}'>
            🧑 ${pActor.name}: Resist Passenger Damage (${resistLabel}, ${body} Body, TN ${ctx.power})
          </button>
        </div>`;
    }

    return html;
  }

  static async handleRamVehicleSoak(btn, physicalDice = false) {
    const ctx       = JSON.parse(btn.dataset.payload);
    btn.disabled    = true;
    btn.textContent = '⏳ Posting…';
    const driverActor = game.actors.get(ctx.driverActorId);
    const rollActor   = driverActor ?? game.actors.get(ctx.vehicleActorId);
    if (!rollActor) { ui.notifications.warn('No driver/vehicle actor found for soak.'); return; }
    const pool = ctx.soakPool ?? 4;
    const tn   = Math.max(2, ctx.power ?? 4);
    await rollActor.rollPool(pool, tn, `🛡 ${ctx.vehicleName}: Vehicle Soak`, {
      isVehicleSoakRoll:  true,
      vehicleSoakContext: ctx,
      physicalDice,
    });
  }

  static async handleRamPassengerResist(btn, physicalDice = false) {
    const ctx    = JSON.parse(btn.dataset.payload);
    btn.disabled    = true;
    btn.textContent = '⏳ Rolling…';
    const pActor = game.actors.get(ctx.passengerActorId);
    if (!pActor) { ui.notifications.warn('Passenger actor not found.'); return; }
    const pool = ctx.body ?? pActor.system?.attributes?.body?.value ?? pActor.system?.attributes?.body?.base ?? 3;
    const tn   = Math.max(2, ctx.power ?? 4);
    await pActor.rollPool(pool, tn, `🧑 ${pActor.name}: Resist Passenger Damage`, {
      isSoakRoll:  true,
      soakPayload: { stagedPower: ctx.power, stagedLevel: ctx.level, isStun: false },
      physicalDice,
    });
  }

  /**
   * Karma reroll — available after all explosions are resolved.
   * Replaces up to `amount` failed dice with fresh single-face rolls;
   * any of those that show 6 and are still below TN start a new chain.
   * Karma rerolls never contribute to the glitch count.
   */
  async _handleKarmaReroll(dice, tn, ones, glitch, pool, label) {
    const failures = dice.filter(d => !d.success);
    if (failures.length === 0) {
      ui.notifications.info('No failures to re-roll with Karma.');
      return;
    }

    const maxKarma = Math.min(this.system.karmaPool, failures.length);

    return foundry.applications.api.DialogV2.wait({
      window: { title: 'Use Karma Pool' },
      content: `
        <p>You have ${this.system.karmaPool} Karma available.</p>
        <p>${failures.length} dice failed. How many Karma points to spend?</p>
        <input type="number" id="karma-amount" min="1" max="${maxKarma}" value="1" style="width:80px"/>
      `,
      buttons: [
        {
          label: 'Re-roll',
          action: 'reroll',
          default: true,
          callback: async (_event, _button, dialog) => {
            const amount = parseInt(dialog.element.querySelector('#karma-amount')?.value) || 0;
            if (amount <= 0) return;

            await this.update({ 'system.karmaPool': this.system.karmaPool - amount });

            const newDice = [...dice];
            let replaced  = 0;
            for (let i = 0; i < newDice.length && replaced < amount; i++) {
              if (!newDice[i].success) {
                const face  = Math.floor(Math.random() * 6) + 1;
                const total = face;
                newDice[i] = {
                  ...newDice[i],
                  total,
                  faces:          [face],
                  isOne:          false,
                  needsExplosion: face === 6 && total < tn,
                  done:           !(face === 6 && total < tn),
                  success:        total >= tn,
                };
                replaced++;
              }
            }
            await this._postWaveCard({
              actorId: this.id,
              label:   `${label} (Karma re-roll)`,
              tn, pool, wave: 0, dice: newDice, ones, glitch,
              isWeaponRoll: false,
            });
          }
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
  }

  // ---------------------------------------------------------------------------
  // MELEE
  // ---------------------------------------------------------------------------

  /**
   * Post the boxing card — shows both combatants side by side.
   * GM can edit TN and pool before clicking Roll.
   */
  static async postMeleeCard(ctx) {
    const atk = game.actors.get(ctx.attackerActorId);
    const def = game.actors.get(ctx.defenderActorId);
    if (!atk || !def) return;

    ctx.atkSkillDice = ctx.atkInfo?.skillDice ?? ctx.atkPool ?? 1;
    ctx.defSkillDice = ctx.defInfo?.skillDice ?? ctx.defPool ?? 1;

    const payload = JSON.stringify(ctx).replace(/'/g, '&#39;');

    const _corner = (name, info, weaponName, rawDamage, damageBase, reach, tn, poolClass, tnClass, damageClass, skillDiceClass) => {
      const specLine  = info?.specName
        ? `<div class="sr-melee-spec">${info.skillRating} (${info.skillRating + info.specBonus}) – ${info.specName}</div>`
        : '';
      const availPool = info?.availPool ?? 0;
      const skillDice = info?.skillDice ?? 1;
      const tnCalc    = [
        '4',
        reach > 0 ? ` −${reach} reach` : '',
        (info?.isDefault && info?.defaultTnMod) ? ` +${info.defaultTnMod} defaulting` : '',
      ].join('');
      const displayDamage = damageBase && /STR/i.test(rawDamage)
        ? `${damageBase.power}${damageBase.level}${damageBase.isStun ? ' Stun' : ''}`
        : (rawDamage || '');

      return `
        <div class="sr-melee-corner">
          <div class="sr-melee-name">${name}</div>
          <div class="sr-melee-skill">
            ${info?.isDefault
              ? `<span style="color:var(--sr-amber)">${info.skillName}</span>`
              : `${info?.skillName ?? 'Unknown skill'}${info?.specName ? '' : ` (${info?.skillRating ?? '?'})`}`}
          </div>
          ${specLine}
          <div class="sr-melee-weapon">${weaponName}
            ${reach > 0 ? `<span class="sr-melee-reach"> Reach ${reach}</span>` : ''}
          </div>
          <div class="sr-melee-field-row">
            <span>Damage:</span>
            <div><input type="text" class="${damageClass}" value="${displayDamage}" style="width:55px"/></div>
          </div>
          <div class="sr-melee-field-row">
            <span>Skill:</span>
            <div style="display:flex;align-items:center;gap:4px">
              <input type="number" class="${skillDiceClass}" value="${skillDice}" min="1" max="30" style="width:40px"/>
            </div>
          </div>
          <div class="sr-melee-field-row">
            <span>Pool:</span>
            <div style="display:flex;align-items:center;gap:4px">
              <input type="number" class="${poolClass}" value="0" min="0" max="${availPool}" style="width:40px"/>
              <span>/ ${availPool}</span>
            </div>
          </div>
          <div class="sr-melee-field-row">
            <span>TN:</span>
            <div style="display:flex;align-items:center;gap:4px">
              <input type="number" class="${tnClass}" value="${tn}" min="2" max="30" style="width:40px"/>
              <span style="font-size:10px">(${tnCalc})</span>
            </div>
          </div>
        </div>`;
    };

    await ChatMessage.create({
      speaker: { alias: 'Melee Combat' },
      content: `
        <div class="sr-roll-card sr-melee-card">
          <div class="sr-roll-header">⚔ MELEE — ${atk.name} vs ${def.name}</div>
          ${ctx.calledShot && ctx.calledShot !== 'none' ? `
            <div style="font-size:11px;color:var(--sr-amber);margin:-2px 0 6px;text-align:center">
              🎯 ${atk.name} called shot${ctx.calledShot === 'stage'
                ? ' — stage damage up (+4 TN)'
                : `${ctx.calledShotTarget ? `: ${ctx.calledShotTarget}` : ''} (+4 TN)`}
            </div>` : ''}
          <div class="sr-melee-boxing">
            ${_corner(atk.name, ctx.atkInfo, ctx.atkWeaponName, ctx.atkRawDamage, ctx.atkDamageBase,
                      ctx.atkReach ?? 0, ctx.atkTN, 'sr-melee-atk-pool', 'sr-melee-atk-tn', 'sr-melee-atk-damage', 'sr-melee-atk-skill-dice')}
            <div class="sr-melee-vs">VS</div>
            ${_corner(def.name, ctx.defInfo, ctx.defWeaponName, ctx.defRawDamage, ctx.defDamageBase,
                      ctx.defReach ?? 0, ctx.defTN, 'sr-melee-def-pool', 'sr-melee-def-tn', 'sr-melee-def-damage', 'sr-melee-def-skill-dice')}
          </div>
          <div class="sr-soak-action">
            <button class="sr-melee-roll-btn" data-payload='${payload}'>
              ⚔ Roll!
            </button>
          </div>
        </div>
      `,
      style: CONST.CHAT_MESSAGE_STYLES.ROLL,
    });
  }

    /**
   * Handle the Roll! button click on a melee card.
   * Reads live pool/TN values, rolls both sides, posts results, then compares.
   */
  static async handleMeleeRoll(btn, physicalDice = false) {
    const ctx  = JSON.parse(btn.dataset.payload);
    const card = btn.closest('.sr-melee-card');

    btn.disabled    = true;
    btn.textContent = '⏳ Rolling…';

    // Pool = skill dice + combat pool dice added by player
    const atkCombatPool = parseInt(card.querySelector('.sr-melee-atk-pool')?.value) || 0;
    const defCombatPool = parseInt(card.querySelector('.sr-melee-def-pool')?.value) || 0;
    const atkSkillDice  = parseInt(card.querySelector('.sr-melee-atk-skill-dice')?.value) || ctx.atkSkillDice || 1;
    const defSkillDice  = parseInt(card.querySelector('.sr-melee-def-skill-dice')?.value) || ctx.defSkillDice || 1;
    const atkPool = Math.max(1, atkSkillDice + atkCombatPool);
    const defPool = Math.max(1, defSkillDice + defCombatPool);
    const atkTN   = Math.max(2, parseInt(card.querySelector('.sr-melee-atk-tn')?.value) || 4);
    const defTN   = Math.max(2, parseInt(card.querySelector('.sr-melee-def-tn')?.value) || 4);

    // Read edited damage codes
    const atkRawDamage = card.querySelector('.sr-melee-atk-damage')?.value.trim() || ctx.atkRawDamage;
    const defRawDamage = card.querySelector('.sr-melee-def-damage')?.value.trim() || ctx.defRawDamage;
    const atkDamageBase = game.sr3e.SR3EItem.parseDamageCode(atkRawDamage, game.actors.get(ctx.attackerActorId)) ?? ctx.atkDamageBase;
    const defDamageBase = game.sr3e.SR3EItem.parseDamageCode(defRawDamage, game.actors.get(ctx.defenderActorId)) ?? ctx.defDamageBase;

    // Spend combat pool
    const atkActor = game.actors.get(ctx.attackerActorId);
    const defActor = game.actors.get(ctx.defenderActorId);
    if (atkCombatPool > 0 && atkActor) await atkActor.spendCombatPool(atkCombatPool);
    if (defCombatPool > 0 && defActor) await defActor.spendCombatPool(defCombatPool);

    const atk = game.actors.get(ctx.attackerActorId);
    const def = game.actors.get(ctx.defenderActorId);
    if (!atk || !def) return;

    let atkDice, defDice;
    if (physicalDice) {
      const atkSuccesses = await SR3EActor._promptPhysicalSuccesses(atkPool, atkTN, `⚔ ${atk.name} attacks`);
      if (atkSuccesses === null) { btn.disabled = false; btn.textContent = 'Roll!'; return; }
      const defSuccesses = await SR3EActor._promptPhysicalSuccesses(defPool, defTN, `⚔ ${def.name} defends`);
      if (defSuccesses === null) { btn.disabled = false; btn.textContent = 'Roll!'; return; }
      atkDice = SR3EActor._buildPhysicalDice(atkPool, atkSuccesses);
      defDice = SR3EActor._buildPhysicalDice(defPool, defSuccesses);
    } else {
      atkDice = atk._rollWave(atkPool, atkTN, true);
      defDice = def._rollWave(defPool, defTN, true);
    }

    const atkOnes   = atkDice.filter(d => d.isOne).length;
    const defOnes   = defDice.filter(d => d.isOne).length;
    const atkGlitch = atkOnes > Math.floor(atkPool / 2);
    const defGlitch = defOnes > Math.floor(defPool / 2);

    // Post both wave cards with melee context (use edited damage codes)
    const meleeCtx = {
      ...ctx,
      atkPool, atkTN, defPool, defTN,
      atkRawDamage, atkDamageBase,
      defRawDamage, defDamageBase,
      isMeleeOpposed: true,
    };

    await atk._postWaveCard({
      actorId:          ctx.attackerActorId,
      label:            `⚔ ${atk.name} attacks`,
      tn:               atkTN,
      pool:             atkPool,
      wave:             0,
      dice:             atkDice,
      ones:             atkOnes,
      glitch:           atkGlitch,
      physicalDice,
      physicalSuccesses: physicalDice ? atkDice.filter(d => d.success).length : undefined,
      isWeaponRoll:     false,
      isMeleeAtk:       true,
      meleeCtx,
    });

    await def._postWaveCard({
      actorId:          ctx.defenderActorId,
      label:            `⚔ ${def.name} defends`,
      tn:               defTN,
      pool:             defPool,
      wave:             0,
      dice:             defDice,
      ones:             defOnes,
      glitch:           defGlitch,
      physicalDice,
      physicalSuccesses: physicalDice ? defDice.filter(d => d.success).length : undefined,
      isWeaponRoll:     false,
      isMeleeDef:       true,
      meleeCtx,
    });

    // Post comparison card once both are done
    await SR3EActor._postMeleeResult(meleeCtx, atkDice, defDice);
  }

  /**
   * Post the melee result — announces winner, staged damage, and resist button.
   */
  static async _postMeleeResult(ctx, atkDice, defDice) {
    const atkSuccesses = atkDice.filter(d => d.success).length;
    const defSuccesses = defDice.filter(d => d.success).length;
    const net          = Math.abs(atkSuccesses - defSuccesses);

    const atk = game.actors.get(ctx.attackerActorId);
    const def = game.actors.get(ctx.defenderActorId);

    let resultHtml;

    if (atkSuccesses === defSuccesses) {
      // Tie — no damage
      resultHtml = `
        <div class="sr-melee-result sr-melee-tie">
          🤝 Tie! ${atkSuccesses} vs ${defSuccesses} — no damage dealt.
        </div>`;
    } else {
      const winnerIsAtk  = atkSuccesses > defSuccesses;
      const winner       = winnerIsAtk ? atk : def;
      const loser        = winnerIsAtk ? def : atk;
      const winnerName   = winner?.name ?? 'Winner';
      const loserName    = loser?.name  ?? 'Loser';

      // Winner's weapon damage code
      const winnerWeaponId = winnerIsAtk ? ctx.atkWeaponId : ctx.defWeaponId;
      const winnerRawDmg   = winnerIsAtk ? ctx.atkRawDamage : ctx.defRawDamage;
      const winnerDmgBase  = winnerIsAtk ? ctx.atkDamageBase : ctx.defDamageBase;

      let stagingHtml = '';
      let soakBtn     = '';

      if (winnerDmgBase && net > 0) {
        // Stage damage — need SR3EItem, use inline fallback if import failed
        const STAGES = ['L','M','S','D'];
        let idx   = STAGES.indexOf(winnerDmgBase.level);
        let power = winnerDmgBase.power;
        let rem   = net;
        const origIdx = idx;
        while (rem >= 2 && idx < STAGES.length - 1) { rem -= 2; idx++; }
        if (idx === STAGES.length - 1 && rem >= 2) { power += Math.floor(rem / 2); }

        // Called shot (attacker only): stage damage up one further level (cap Deadly).
        const calledStage = winnerIsAtk && ctx.calledShot === 'stage';
        if (calledStage) idx = Math.min(STAGES.length - 1, idx + 1);
        const calledSub   = winnerIsAtk && ctx.calledShot === 'subtarget';

        const finalLevel = STAGES[idx];
        const trackLabel = winnerDmgBase.isStun ? 'Stun' : 'Physical';
        const unchanged  = idx === origIdx && power === winnerDmgBase.power;

        stagingHtml = unchanged
          ? `<div class="sr-staging-result">${winnerRawDmg} — net ${net} hit${net !== 1 ? 's' : ''}, no stage up → <strong>${power}${finalLevel} ${trackLabel}</strong></div>`
          : `<div class="sr-staging-result">📊 ${winnerRawDmg} + ${net} net hits${calledStage ? ' + 🎯 called shot' : ''} → <strong>${power}${finalLevel} ${trackLabel}</strong></div>`;
        if (calledSub) {
          stagingHtml += `<div class="sr-staging-result">🎯 Called shot${ctx.calledShotTarget ? `: ${ctx.calledShotTarget}` : ''} — damage applies to that component.</div>`;
        }

        const soakPayload = JSON.stringify({
          attackerActorId: ctx.attackerActorId,
          targetActorId:   loser?.id,
          isMelee:         true,
          stagedPower:     power,
          stagedLevel:     finalLevel,
          isStun:          winnerDmgBase.isStun,
          rawDamage:       winnerRawDmg,
        }).replace(/'/g, '&#39;');

        soakBtn = `
          <div class="sr-soak-action">
            <button class="sr-soak-btn" data-payload='${soakPayload}'>
              🛡 ${loserName}: Resist Damage
            </button>
          </div>`;
      }

      resultHtml = `
        <div class="sr-melee-result sr-melee-win">
          ⚔ ${winnerName} wins! ${atkSuccesses} vs ${defSuccesses} (net ${net})
        </div>
        ${stagingHtml}
        ${soakBtn}`;
    }

    await ChatMessage.create({
      speaker: { alias: 'Melee Result' },
      content: `
        <div class="sr-roll-card sr-melee-card">
          <div class="sr-roll-header">⚔ ${atk?.name ?? ''} vs ${def?.name ?? ''} — Result</div>
          ${resultHtml}
        </div>`,
      style: CONST.CHAT_MESSAGE_STYLES.ROLL,
    });
  }

  // ---------------------------------------------------------------------------
  // SOAK
  // ---------------------------------------------------------------------------

  /**
   * Present the "who's soaking?" multi-select, then post a soak card for
   * each selected actor. Called from the soak button in a weapon roll card.
   *
   * @param {object} payload  — deserialised from the button's data-payload
   */
  // handleSoakClick removed — target is always identified from the attack context.

    /**
   * Build the soak button HTML — shared between no-dodge and failed-dodge paths.
   */
  static _soakButtonHtml(payload) {
    const targetActor = game.actors.get(payload.targetActorId);
    const targetName  = targetActor?.name ?? 'Target';
    const soakPayload = JSON.stringify({
      attackerActorId: payload.attackerActorId,
      targetActorId:   payload.targetActorId,
      weaponItemId:    payload.weaponItemId,
      ammoType:        payload.ammoType ?? null,
      isMelee:         payload.isMelee,
      stagedPower:     payload.stagedPower,
      stagedLevel:     payload.stagedLevel,
      isStun:          payload.isStun,
      rawDamage:       payload.rawDamage,
    }).replace(/'/g, '&#39;');

    return `
      <div class="sr-soak-action">
        <button class="sr-soak-btn" data-payload='${soakPayload}'>
          🛡 ${targetName}: Resist Damage
        </button>
      </div>`;
  }

  static _spellSoakButtonHtml(payload) {
    const targetActor      = game.actors.get(payload.targetActorId);
    const targetName       = targetActor?.name ?? 'Target';
    const spellSoakPayload = JSON.stringify({
      actorId:         payload.targetActorId,
      targetActorId:   payload.targetActorId,
      attackerActorId: payload.attackerActorId,
      isSpellSoak:     true,
      spellType:       payload.spellType,
      spellTarget:     payload.spellTarget ?? '',
      force:           payload.force,
      stagedPower:     payload.stagedPower,
      stagedLevel:     payload.stagedLevel,
      isStun:          payload.isStun,
      rawDamage:       payload.rawDamage,
    }).replace(/'/g, '&#39;');
    return `
      <div class="sr-soak-action">
        <button class="sr-spell-soak-btn" data-payload='${spellSoakPayload}'>
          🔮 ${targetName}: Resist Spell
        </button>
      </div>`;
  }

    /**
   * Roll committed dodge dice and post result card.
   * Called automatically after the attack roll resolves.
   */
  static async _rollDodge(targetActor, dodgeDice, dodgeContext, physicalDice = false) {
    const DODGE_TN = 4;
    const label    = `🎯 ${targetActor.name} dodges`;

    let dice, ones, glitch;
    if (physicalDice) {
      const successes = await SR3EActor._promptPhysicalSuccesses(dodgeDice, DODGE_TN, label);
      if (successes === null) return;
      dice = SR3EActor._buildPhysicalDice(dodgeDice, successes); ones = 0; glitch = false;
    } else {
      dice   = targetActor._rollWave(dodgeDice, DODGE_TN, true);
      ones   = dice.filter(d => d.isOne).length;
      glitch = ones > Math.floor(dodgeDice / 2);
    }

    await targetActor._postWaveCard({
      actorId:           targetActor.id,
      label,
      tn:                DODGE_TN,
      pool:              dodgeDice,
      wave:              0,
      dice,
      ones,
      glitch,
      physicalDice,
      physicalSuccesses: physicalDice ? dice.filter(d => d.success).length : undefined,
      isWeaponRoll:      false,
      isSoakRoll:        false,
      isDodgeRoll:       true,
      dodgePayload:      dodgeContext,
    });
  }

  static async postSoakCard(actorId, payload) {
    const actor = game.actors.get(actorId);
    if (!actor) {
      console.error('SR3E | postSoakCard: actor not found', actorId);
      return;
    }
    return actor._postSoakCard(payload);
  }

  /**
   * Post an editable resist card for this actor.
   */
  async _postSoakCard(payload) {
    const { stagedPower, stagedLevel, isStun, isMelee, rawDamage } = payload;
    const trackLabel = isStun ? 'Stun' : 'Physical';
    let   effStagedLevel = stagedLevel;

    // Ensure derived data is current — prepareDerivedData now guarantees sys.attributes exists
    this.prepareDerivedData();
    const bodyAttr = this.system.attributes?.body;
    const body     = Math.max(bodyAttr?.value ?? 0, bodyAttr?.base ?? 0, 1);

    let ballistic, impact;
    if (this.type === 'vehicle') {
      // Vehicles use their Armor attribute directly; no equipped-armor item
      const vArmor = this.system.attributes?.armor?.base ?? 0;
      ballistic = vArmor;
      impact    = vArmor;
    } else {
      const equippedId = this.system.equippedArmor;
      const armorItem  = equippedId ? this.items.get(equippedId) : null;
      ballistic = armorItem?.system?.ballistic ?? 0;
      impact    = armorItem?.system?.impact    ?? 0;
    }
    // Ammo armour interactions (APDS / Flechette). Other types resolve at attack time.
    const ammoRules = game.sr3e.SR3E.ammoTypes[payload.ammoType] ?? {};
    let ammoNote = '';
    if (ammoRules.armorEffect === 'apds') {
      ballistic = Math.floor(ballistic / 2);
      ammoNote  = `APDS — ballistic armour halved (now ${ballistic})`;
    } else if (ammoRules.armorEffect === 'flechette') {
      const maxArmor = Math.max(ballistic, impact);
      if (maxArmor <= 0) {
        // Unarmoured target — damage level stages up one
        const STAGES = ['L', 'M', 'S', 'D'];
        const li = STAGES.indexOf(effStagedLevel);
        if (li >= 0) effStagedLevel = STAGES[Math.min(3, li + 1)];
        ammoNote = `Flechette vs unarmoured — damage level raised to ${effStagedLevel}`;
      } else {
        // Armoured target — effective armour = highest of ballistic/impact, doubled
        const doubled = maxArmor * 2;
        ballistic = doubled;
        impact    = doubled;
        ammoNote  = `Flechette vs armour — effective armour ×2 (now ${doubled})`;
      }
    }

    const defaultArmor = isMelee ? impact : ballistic;

    const soakTN = Math.max(2, stagedPower - defaultArmor);

    const soakPayload = JSON.stringify({
      actorId:         this.id,
      attackerActorId: payload.attackerActorId,
      targetActorId:   payload.targetActorId ?? this.id,
      isMelee,
      stagedPower,
      stagedLevel:     effStagedLevel,
      isStun,
      rawDamage,
      ballistic,
      impact,
    }).replace(/'/g, '&#39;');

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `
        <div class="sr-roll-card sr-soak-card">
          <div class="sr-roll-header">🛡 ${this.name} — Resist Damage</div>
          <div class="sr-roll-meta">
            Incoming: <strong>${stagedPower}${effStagedLevel} ${trackLabel}</strong>
          </div>
          ${ammoNote ? `<div class="sr-roll-meta" style="color:var(--sr-gold);font-size:11px">🔸 ${ammoNote}</div>` : ''}
          <div class="sr-soak-fields">
            <label class="sr-soak-label">
              Resist Pool (Body ${body} + bonuses):
              <input type="number" class="sr-soak-pool" value="${body}" min="1" max="30" style="width:55px"/>
            </label>
            <label class="sr-soak-label">
              TN (Power ${stagedPower} − Armour):
              <input type="number" class="sr-soak-tn" value="${soakTN}" min="2" max="30" style="width:55px"/>
            </label>
            <label class="sr-soak-label">
              Armour type:
              <select class="sr-soak-armor-type">
                <option value="ballistic" ${!isMelee ? 'selected' : ''}>Ballistic (${ballistic})</option>
                <option value="impact"    ${isMelee  ? 'selected' : ''}>Impact (${impact})</option>
              </select>
            </label>
          </div>
          <div class="sr-soak-action">
            <button class="sr-soak-roll-btn" data-payload='${soakPayload}'>
              🎲 ${this.name}: Roll to Resist
            </button>
          </div>
        </div>
      `,
      style: CONST.CHAT_MESSAGE_STYLES.ROLL,
    });
  }

  /**
   * Handle a click on "Roll to Resist".
   */
  static async handleSoakRollClick(btn, physicalDice = false) {
    const payload   = JSON.parse(btn.dataset.payload);
    const card      = btn.closest('.sr-soak-card');
    const pool      = parseInt(card.querySelector('.sr-soak-pool')?.value) || 1;
    const tn        = parseInt(card.querySelector('.sr-soak-tn')?.value)   || 2;

    btn.disabled    = true;
    btn.textContent = '⏳ Rolling…';

    const actor = game.actors.get(payload.actorId);
    if (!actor) return;

    const effectiveTN = Math.max(2, tn);
    const label       = `🛡 ${actor.name} resists`;

    let dice, ones, glitch;
    if (physicalDice) {
      const successes = await SR3EActor._promptPhysicalSuccesses(pool, effectiveTN, label);
      if (successes === null) { btn.disabled = false; btn.textContent = 'Roll Soak'; return; }
      dice = SR3EActor._buildPhysicalDice(pool, successes); ones = 0; glitch = false;
    } else {
      dice  = actor._rollWave(pool, effectiveTN, true);
      ones  = dice.filter(d => d.isOne).length;
      glitch = ones > Math.floor(pool / 2);
    }

    await actor._postWaveCard({
      actorId:      payload.actorId,
      label,
      tn:           effectiveTN,
      pool,
      wave:         0,
      dice,
      ones,
      glitch,
      physicalDice,
      physicalSuccesses: physicalDice ? dice.filter(d => d.success).length : undefined,
      isWeaponRoll: false,
      isSoakRoll:   true,
      soakPayload:  payload,
    });
  }

  static async handleAssignDamage(btn) {
    btn.disabled    = true;
    btn.textContent = '✓ Damage Applied';
    const p = JSON.parse(btn.dataset.payload);
    if (p.icActorId) {
      const ic  = game.actors.get(p.icActorId);
      if (!ic) return;
      const current = ic.system.woundValue ?? 0;
      const max     = ic.system.derived?.woundMax ?? (ic.system.rating ?? 1) * 2;
      await ic.update({ 'system.woundValue': Math.min(max, current + p.boxes) });
    } else if (p.vehicleActorId) {
      const veh = game.actors.get(p.vehicleActorId);
      if (!veh) return;
      const current = veh.system.damage?.value ?? 0;
      const max     = (veh.system.attributes?.body?.base ?? 4) * 2;
      await veh.update({ 'system.damage.value': Math.min(max, current + p.boxes) });
    } else {
      const actor = game.actors.get(p.actorId);
      if (!actor) return;
      const current = actor.system.wounds?.[p.track]?.value ?? 0;
      const max     = actor.system.wounds?.[p.track]?.max ?? 10;
      await actor.update({ [`system.wounds.${p.track}.value`]: Math.min(max, current + p.boxes) });
    }
  }

  /**
   * Spend combat pool dice, clamped to available pool.
   * Returns how many were actually spent.
   */
  async spendCombatPool(amount) {
    const available = this.system.derived?.availableCombatPool ?? 0;
    const spend     = Math.min(amount, available);
    if (spend > 0) {
      await this.update({ 'system.combatPoolSpent': (this.system.combatPoolSpent ?? 0) + spend });
    }
    return spend;
  }

  /**
   * Reset combat pool spending.
   */
  async refreshCombatPool() {
    await this.update({ 'system.combatPoolSpent': 0 });
  }

  /**
   * Spend spell pool dice, clamped to available pool.
   */
  async spendSpellPool(amount) {
    // Compute available directly — derived cache may be stale
    const attr       = this.system.attributes ?? {};
    const magicBase  = attr.magic?.base ?? 0;
    let available    = 0;
    if (magicBase > 0) {
      const int2     = attr.intelligence?.base ?? 0;
      const wil2     = attr.willpower?.base    ?? 0;
      const spBase   = Math.max(0, Math.floor((int2 + wil2 + magicBase) / 3));
      const spTotal  = spBase + (this.system.spellPoolMod ?? 0);
      available      = Math.max(0, spTotal - (this.system.spellPoolSpent ?? 0));
    }
    const spend = Math.min(amount, available);
    if (spend > 0) {
      await this.update({ 'system.spellPoolSpent': (this.system.spellPoolSpent ?? 0) + spend });
    }
    return spend;
  }

  /**
   * Reset spell pool spending.
   */
  async refreshSpellPool() {
    await this.update({ 'system.spellPoolSpent': 0 });
  }

  async refreshAstralPool() {
    await this.update({ 'system.astralPoolSpent': 0 });
  }

  /**
   * Toggle Full Defense for this combatant.
   * Declares all available combat pool dice as defense for the current pass.
   * The pool is not pre-spent — it remains available to allocate during dodge declarations.
   */
  async toggleFullDefense() {
    const current = this.system.fullDefense ?? false;
    if (current) {
      await this.update({ 'system.fullDefense': false, 'system.fullDefensePool': 0 });
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        content: `<div class="sr-roll-card"><div class="sr-roll-header">🛡 ${this.name} — Full Defense cancelled</div></div>`,
        style: CONST.CHAT_MESSAGE_STYLES.OTHER,
      });
    } else {
      const avail = this.system.derived?.availableCombatPool ?? 0;
      if (avail < 1) {
        ui.notifications.warn('No combat pool available for Full Defense.');
        return;
      }
      await this.update({ 'system.fullDefense': true, 'system.fullDefensePool': avail });
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        content: `<div class="sr-roll-card"><div class="sr-roll-header">🛡 ${this.name} — Full Defense declared (${avail} dice)</div><div class="sr-roll-result">All combat pool committed to defense for this pass. Dodge declarations auto-fill.</div></div>`,
        style: CONST.CHAT_MESSAGE_STYLES.OTHER,
      });
    }
  }

  /**
   * Reset hacking pool spending.
   */
  async refreshHackingPool() {
    await this.update({ 'system.hackingPoolSpent': 0 });
  }

  /**
   * Reset recoil accumulation (called at start of each new combat phase).
   */
  async resetRecoil() {
    await this.update({ 'system.roundsFiredThisPhase': 0 });
  }

  /**
   * Spend from the available hacking pool. Returns actual amount spent.
   */
  async spendHackingPool(amount) {
    const avail  = this.system.derived?.availableHackingPool ?? 0;
    const actual = Math.min(amount, avail);
    if (actual > 0) {
      await this.update({ 'system.hackingPoolSpent': (this.system.hackingPoolSpent ?? 0) + actual });
    }
    return actual;
  }

  async spendAstralPool(amount) {
    const available = this.system.derived?.availableAstralPool ?? 0;
    const spend     = Math.min(amount, available);
    if (spend > 0) {
      await this.update({ 'system.astralPoolSpent': (this.system.astralPoolSpent ?? 0) + spend });
    }
    return spend;
  }

  async refreshAstralPool() {
    await this.update({ 'system.astralPoolSpent': 0 });
  }

  // ---------------------------------------------------------------------------
  // SPELL DEFENSE
  // ---------------------------------------------------------------------------

  /**
   * Commit dice to the Spell Defense pool for this round.
   * Spell Pool dice are spent immediately; Sorcery dice are tracked separately
   * so they can be restored at round end without touching spellPoolSpent.
   */
  async commitSpellDefense(sorceryDice, spellDice) {
    const pool = Math.max(0, sorceryDice + spellDice);
    if (pool <= 0) return;
    await this.update({
      'system.spellDefensePool':        pool,
      'system.spellDefenseSorceryDice': sorceryDice,
    });
    if (spellDice > 0) await this.spendSpellPool(spellDice);
  }

  /**
   * Deduct n dice from the Spell Defense pool (clamped to available).
   */
  async useSpellDefenseDice(n) {
    const current = this.system.spellDefensePool ?? 0;
    const spend   = Math.min(n, current);
    if (spend > 0) await this.update({ 'system.spellDefensePool': current - spend });
    return spend;
  }

  /**
   * Clear Spell Defense state at round end.
   * Sorcery dice are "returned" (commitment removed); Spell Pool dice
   * remain spent until the GM manually refreshes pools.
   */
  async clearSpellDefense() {
    await this.update({
      'system.spellDefensePool':        0,
      'system.spellDefenseSorceryDice': 0,
    });
  }

  /**
   * Show the Spell Defense declaration dialog for all Sorcery-capable actors
   * in the current combat. Called after initiative is rolled each round.
   */
  static async promptSpellDefenseDeclaration(combatants) {
    const sorceryActors = combatants
      .map(c => c.actor)
      .filter(a => a && a.items.some(i => i.type === 'skill' && /sorcery/i.test(i.name)));
    if (sorceryActors.length === 0) return;

    const rows = sorceryActors.map(actor => {
      const sorcery      = actor.items.find(i => i.type === 'skill' && /sorcery/i.test(i.name));
      const sorRating    = sorcery?.system?.rating ?? 0;
      const hasSDSpec    = /spell.?defense/i.test(sorcery?.system?.specialisation ?? '');
      const sorEffective = hasSDSpec ? sorRating + 2 : sorRating;
      const specNote     = hasSDSpec ? ` <span style="color:var(--sr-accent)">(${sorRating}+2 spec)</span>` : '';
      const spellAvail   = actor.system.derived?.availableSpellPool ?? 0;
      return `
        <div class="sr-sd-row">
          <span class="sr-sd-name">${actor.name}</span>
          <div class="sr-sd-fields">
            <div class="sr-sd-field">
              <span class="sr-sd-label">Sorcery ${sorEffective}${specNote}</span>
              <input type="number" class="sd-sor" data-actor-id="${actor.id}"
                     value="0" min="0" max="${sorEffective}"/>
            </div>
            <div class="sr-sd-field">
              <span class="sr-sd-label">Spell Pool ${spellAvail}</span>
              <input type="number" class="sd-sp" data-actor-id="${actor.id}"
                     value="0" min="0" max="${spellAvail}"/>
            </div>
          </div>
        </div>`;
    }).join('');

    await ChatMessage.create({
      speaker: { alias: 'Spell Defense' },
      content: `
        <div class="sr-roll-card sr-sd-declare-card">
          <div class="sr-roll-header">🛡 Declare Spell Defense</div>
          <div class="sr-roll-meta">Allocate Sorcery and/or Spell Pool dice for this round. Spell Pool dice are spent immediately; Sorcery dice return at round end.</div>
          ${rows}
          <div class="sr-sd-declare-actions">
            <button class="sr-sd-declare-commit-btn">Commit</button>
            <button class="sr-sd-declare-skip-btn">Skip</button>
          </div>
        </div>`,
    });
  }

  static async handleSpellDefenseDeclareCommit(btn) {
    const card = btn.closest('.sr-sd-declare-card');
    const alloc = {};
    card.querySelectorAll('.sd-sor').forEach(inp => {
      const id = inp.dataset.actorId;
      if (!alloc[id]) alloc[id] = {};
      alloc[id].sorcery = parseInt(inp.value) || 0;
    });
    card.querySelectorAll('.sd-sp').forEach(inp => {
      const id = inp.dataset.actorId;
      if (!alloc[id]) alloc[id] = {};
      alloc[id].spell = parseInt(inp.value) || 0;
    });
    for (const [actorId, a] of Object.entries(alloc)) {
      if ((a.sorcery ?? 0) + (a.spell ?? 0) === 0) continue;
      const actor = game.actors.get(actorId);
      if (actor) await actor.commitSpellDefense(a.sorcery ?? 0, a.spell ?? 0);
    }
    const msgEl = btn.closest('[data-message-id]');
    const msg = msgEl ? game.messages.get(msgEl.dataset.messageId) : null;
    if (msg) await msg.delete();
  }

  /**
   * Post the Spell Defense phase card.
   * Shows remaining hit count and a roll button for each actor with defense dice.
   * When currentSuccesses reaches 0, shows "completely defended" + drain only.
   */
  static async postSpellDefenseCard({ currentSuccesses, sc, force }) {
    const defenders  = game.actors.contents.filter(
      a => (a.system.spellDefensePool ?? 0) > 0 && a.id !== sc.attackerActorId
    );
    const casterName = game.actors.get(sc.attackerActorId)?.name ?? 'Caster';

    if (currentSuccesses === 0 || defenders.length === 0) {
      // Nothing left to defend or no one active — go straight to post-spell cleanup
      await SR3EActor._postSpellResistOrDoneCard({ currentSuccesses, sc, force });
      return;
    }

    const defenderHtml = defenders.map(a => {
      const pool       = a.system.spellDefensePool;
      const btnPayload = JSON.stringify({
        defenderActorId:  a.id,
        currentSuccesses,
        sc,
        force,
      }).replace(/'/g, '&#39;');
      return `
        <div class="sr-soak-action">
          <button class="sr-spell-defense-btn" data-payload='${btnPayload}'>
            🛡 ${a.name}: Roll Spell Defense (${pool} ${pool === 1 ? 'die' : 'dice'} vs TN ${force})
          </button>
        </div>`;
    }).join('');

    const proceedPayload = JSON.stringify({ currentSuccesses, sc, force }).replace(/'/g, '&#39;');

    await ChatMessage.create({
      speaker: { alias: 'Spell Defense' },
      content: `
        <div class="sr-roll-card">
          <div class="sr-roll-header">🛡 Spell Defense — ${sc.spellName} [F${force}]</div>
          <div class="sr-roll-meta">
            ${casterName} — <strong>${currentSuccesses}</strong> hit${currentSuccesses !== 1 ? 's' : ''} remaining
          </div>
          ${defenderHtml}
          <div class="sr-soak-action">
            <button class="sr-spell-defense-proceed-btn" data-payload='${proceedPayload}'>
              ➡ Proceed to Resist Spell
            </button>
          </div>
        </div>`,
    });
  }

  /**
   * Post the final Resist Spell / drain buttons after defense is resolved.
   */
  static async _postSpellResistOrDoneCard({ currentSuccesses, sc, force }) {
    const casterName = game.actors.get(sc.attackerActorId)?.name ?? 'Caster';
    let html = `<div class="sr-roll-card">`;

    if (currentSuccesses > 0) {
      html += `<div class="sr-roll-meta">
        🔮 ${sc.spellName} — <strong>${currentSuccesses} casting hit${currentSuccesses !== 1 ? 's' : ''}</strong> after defense;
        base <strong>${sc.rawDamage}</strong>. Each target resists vs Force ${force}.
      </div>`;
      for (const targetId of (sc.targetActorIds ?? [])) {
        html += SR3EActor._spellResistButton(sc, targetId, currentSuccesses);
      }
    } else {
      html += `<div class="sr-roll-meta">✨ Spell completely defended — no damage to resist.</div>`;
    }

    // Drain is always owed
    const drainPayload = JSON.stringify({
      actorId:         sc.attackerActorId,
      drainStr:        sc.drainStr,
      force,
      drainLevel:      sc.drainLevel ?? undefined,   // nominated Damage Level (combat spells)
      sorceryRating:   sc.sorceryRating,
      drainIsPhysical: sc.drainIsPhysical,
      spellName:       sc.spellName,
    }).replace(/'/g, '&#39;');
    html += `<div class="sr-soak-action">
      <button class="sr-drain-btn" data-payload='${drainPayload}'>
        ⚡ ${casterName}: Resist Drain
      </button>
    </div></div>`;

    await ChatMessage.create({ speaker: { alias: 'Spell Defense' }, content: html });
  }

  /**
   * Handle click on "Roll Spell Defense" button.
   */
  static async handleSpellDefenseRoll(btn, physicalDice = false) {
    const p        = JSON.parse(btn.dataset.payload);
    const { defenderActorId, currentSuccesses, sc, force } = p;

    const defender = game.actors.get(defenderActorId);
    if (!defender) return;

    const poolAvail = defender.system.spellDefensePool ?? 0;
    if (poolAvail <= 0) {
      ui.notifications.warn(`${defender.name} has no Spell Defense dice remaining.`);
      return;
    }

    btn.disabled    = true;
    btn.textContent = '⏳ Rolling…';

    const rollLabel = `🛡 ${defender.name} — Spell Defense vs ${sc.spellName} [F${force}]`;

    if (physicalDice) {
      const successes = await SR3EActor._promptPhysicalSuccesses(poolAvail, force, rollLabel);
      if (successes === null) { btn.disabled = false; btn.textContent = `🛡 Roll Spell Defense`; return; }
      await defender.useSpellDefenseDice(poolAvail);
      await defender.rollPool(poolAvail, force, rollLabel, {
        isSpellDefenseRoll:  true,
        spellDefenseContext: { defenderActorId, currentSuccesses, spellContext: sc, force },
        physicalDice:        true,
      });
      return;
    }

    let dicesToUse = 0;
    await foundry.applications.api.DialogV2.wait({
      window: { title: `${defender.name} — Spell Defense` },
      content: `
        <p>Defending against <strong>${sc.spellName}</strong> [F${force}]</p>
        <p style="font-size:11px;color:var(--sr-muted)">TN: <strong>${force}</strong> &nbsp;|&nbsp; Available: <strong>${poolAvail}</strong></p>
        <label style="display:flex;align-items:center;gap:8px">
          Dice to use:
          <input type="number" id="sd-dice" value="${poolAvail}" min="1" max="${poolAvail}" style="width:55px"/>
        </label>`,
      buttons: [
        {
          label: 'Roll',
          action: 'roll',
          default: true,
          callback: (_e, _b, dialog) => {
            dicesToUse = Math.min(
              parseInt(dialog.element.querySelector('#sd-dice')?.value) || 0,
              poolAvail
            );
          },
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });

    if (dicesToUse <= 0) {
      btn.disabled    = false;
      btn.textContent = `🛡 ${defender.name}: Roll Spell Defense (${poolAvail} ${poolAvail === 1 ? 'die' : 'dice'} vs TN ${force})`;
      return;
    }

    await defender.useSpellDefenseDice(dicesToUse);

    await defender.rollPool(
      dicesToUse,
      force,
      rollLabel,
      {
        isSpellDefenseRoll:   true,
        spellDefenseContext:  { defenderActorId, currentSuccesses, spellContext: sc, force },
      }
    );
  }

  /**
   * Handle click on "Proceed to Resist Spell" button.
   */
  static async handleSpellDefenseProceed(btn) {
    btn.disabled    = true;
    btn.textContent = '⏳ Proceeding…';
    const { currentSuccesses, sc, force } = JSON.parse(btn.dataset.payload);
    await SR3EActor._postSpellResistOrDoneCard({ currentSuccesses, sc, force });
  }

  // ---------------------------------------------------------------------------
  // SPELLCASTING — Spell soak and drain
  // ---------------------------------------------------------------------------

  static async postSpellSoakCard(actorId, payload) {
    const actor = game.actors.get(actorId);
    if (!actor) { console.error('SR3E | postSpellSoakCard: actor not found', actorId); return; }
    return actor._postSpellSoakCard(payload);
  }

  /** The "🔮 Resist Spell" button markup for one target — carries the caster's successes + base damage. */
  static _spellResistButton(sc, targetId, attackSuccesses) {
    const tActor = game.actors.get(targetId);
    if (!tActor) return '';
    const payload = JSON.stringify({
      actorId:         targetId,
      targetActorId:   targetId,
      attackerActorId: sc.attackerActorId,
      spellType:       sc.spellType,
      spellTarget:     sc.spellTarget ?? '',
      spellName:       sc.spellName ?? 'Spell',
      force:           sc.force,
      attackSuccesses,
      baseDamage:      sc.damageBase,
      rawDamage:       sc.rawDamage,
    }).replace(/'/g, '&#39;');
    return `
      <div class="sr-soak-action">
        <button class="sr-spell-soak-btn" data-payload='${payload}'>
          🔮 ${tActor.name}: Resist Spell
        </button>
      </div>`;
  }

  /**
   * Post an editable Resist-Spell card: target rolls the spell's Target attribute (W→Willpower,
   * B→Body, I→Intelligence, Q→Quickness; F/number/other default to Willpower) — attribute only —
   * vs TN = Force. The roll's net vs the caster's successes stages the base damage. No soak.
   */
  async _postSpellSoakCard(payload) {
    const { baseDamage, attackSuccesses, spellType, spellTarget, force, rawDamage, spellName } = payload;
    // Same parser as the cast, so the resist attribute matches the cast's Target code exactly.
    const { resistAttr, resistName } = game.sr3e.SR3EItem._parseSpellTarget(spellTarget, this, force, spellType);

    this.prepareDerivedData();
    const attrVal = this.system.attributes?.[resistAttr]?.value
                 ?? this.system.attributes?.[resistAttr]?.base
                 ?? 1;
    const pool   = Math.max(1, attrVal);
    const tn     = Math.max(2, force);

    const resistPayload = JSON.stringify({
      actorId:         this.id,
      attackerActorId: payload.attackerActorId,
      targetActorId:   this.id,
      attackSuccesses,
      baseDamage,
      force,
      rawDamage,
      spellName,
    }).replace(/'/g, '&#39;');

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `
        <div class="sr-roll-card sr-soak-card">
          <div class="sr-roll-header">🔮 ${this.name} — Resist ${spellName ?? 'Spell'}</div>
          <div class="sr-roll-meta">
            Opposing <strong>${attackSuccesses}</strong> casting hit${attackSuccesses !== 1 ? 's' : ''} — base <strong>${rawDamage}</strong>
          </div>
          <div class="sr-soak-fields">
            <label class="sr-soak-label">
              Resist Pool (${resistName} ${attrVal}):
              <input type="number" class="sr-soak-pool" value="${pool}" min="1" max="30" style="width:55px"/>
            </label>
            <label class="sr-soak-label">
              TN (Force ${force}):
              <input type="number" class="sr-soak-tn" value="${tn}" min="2" max="30" style="width:55px"/>
            </label>
          </div>
          <div class="sr-soak-action">
            <button class="sr-spell-resist-roll-btn" data-payload='${resistPayload}'>
              🎲 ${this.name}: Roll to Resist
            </button>
          </div>
        </div>
      `,
      style: CONST.CHAT_MESSAGE_STYLES.ROLL,
    });
  }

  /** Handle "Roll to Resist" on a spell-resist card → interactive Willpower/Body roll vs Force. */
  static async handleSpellResistRoll(btn, physicalDice = false) {
    const payload = JSON.parse(btn.dataset.payload);
    const card    = btn.closest('.sr-soak-card');
    const pool    = parseInt(card?.querySelector('.sr-soak-pool')?.value) || 1;
    const tn      = parseInt(card?.querySelector('.sr-soak-tn')?.value)   || 2;
    const actor   = game.actors.get(payload.actorId);
    if (!actor) return;

    btn.disabled    = true;
    btn.textContent = '⏳ Rolling…';

    await actor.rollPool(pool, tn, `🔮 ${actor.name} resists ${payload.spellName ?? 'spell'}`, {
      isSpellResist:      true,
      spellResistContext: {
        attackerActorId: payload.attackerActorId,
        targetActorId:   actor.id,
        attackSuccesses: payload.attackSuccesses ?? 0,
        baseDamage:      payload.baseDamage,
        force:           payload.force,
        rawDamage:       payload.rawDamage,
      },
      skipWoundMod: true,
      physicalDice,
    });
  }

  static async postDrainCard(actorId, payload) {
    const actor = game.actors.get(actorId);
    if (!actor) { console.error('SR3E | postDrainCard: actor not found', actorId); return; }
    return actor._postDrainCard(payload);
  }

  /**
   * Post an editable drain resist card for this actor (the caster).
   */
  async _postDrainCard(payload) {
    const { drainStr, force, sorceryRating, drainIsPhysical, spellName } = payload;

    let drainTN, drainLevel;
    if (payload.drainTNOverride !== undefined) {
      // Pre-computed values (conjuring drain: TN = Force, level from Force/2)
      drainTN    = payload.drainTNOverride;
      drainLevel = payload.drainLevel ?? 'S';
    } else {
      // The drain code = drain Power (→ TN); the level is the nominated Damage Level, optionally
      // shifted by a "Damage Level"/"DL" token in the code. parseDrainFormula folds both in.
      const parsed = SR3EItem.parseDrainFormula(drainStr, force, payload.drainLevel ?? null);
      if (!parsed) {
        ui.notifications.warn(`SR3E: Could not parse drain formula "${drainStr}". Check the spell item.`);
        return;
      }
      drainTN    = parsed.tn;
      drainLevel = parsed.level;
    }
    const trackLabel = drainIsPhysical ? 'Physical' : 'Stun';

    // Drain is normally resisted with Willpower (spells); conjuring overrides to Charisma and
    // adds any dice the conjurer held back from the Conjuring Test (payload.bonusDice).
    const attr2      = this.system.attributes ?? {};
    const resistAttr = payload.resistAttr ?? 'willpower';
    const resistName = payload.resistName ?? 'Willpower';
    const attrVal    = attr2[resistAttr]?.base ?? attr2[resistAttr]?.value ?? 1;
    const bonusDice  = Math.max(0, payload.bonusDice ?? 0);
    const basePool   = Math.max(1, attrVal + bonusDice);
    const magicBase  = attr2.magic?.base ?? 0;

    // Use the spell pool count computed at roll time and carried in the payload.
    // This avoids any stale-derived-cache or wrong-actor-reference issues.
    const availSpell = payload.spellPoolForDrain ?? 0;

    const drainRollPayload = JSON.stringify({
      actorId:         this.id,
      drainStr,
      drainLevel,
      drainTN,
      drainIsPhysical,
      force,
      sorceryRating,
      spellName,
    }).replace(/'/g, '&#39;');

    const physWarning = drainIsPhysical
      ? `<div style="color:var(--sr-red);font-size:11px;margin-top:4px">⚠ Force (${force}) &gt; Magic (${magicBase}) — Drain is Physical!</div>`
      : '';

    const spellPoolField = availSpell > 0
      ? `<label class="sr-soak-label">
           Spell Pool (${availSpell} available):
           <input type="number" class="sr-drain-spell-pool" value="0" min="0" max="${availSpell}" style="width:55px"/>
         </label>`
      : '';

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `
        <div class="sr-roll-card sr-soak-card">
          <div class="sr-roll-header">⚡ ${this.name} — Resist Drain</div>
          <div class="sr-roll-meta">
            Drain: <strong>${drainLevel} ${trackLabel}</strong>
            (${drainStr ? `formula: ${drainStr}, F=${force} → ` : ''}TN ${drainTN})
            ${physWarning}
          </div>
          ${payload.drainNote ? `<div style="color:var(--sr-muted);font-size:11px;margin:2px 0 4px">${payload.drainNote}</div>` : ''}
          <div class="sr-soak-fields">
            <label class="sr-soak-label">
              Drain Pool (${resistName} ${attrVal}${bonusDice ? ` + ${bonusDice} held back` : ''}):
              <input type="number" class="sr-drain-pool" value="${basePool}" min="1" max="30" style="width:55px"/>
            </label>
            ${spellPoolField}
            <label class="sr-soak-label">
              TN:
              <input type="number" class="sr-drain-tn" value="${drainTN}" min="2" max="30" style="width:55px"/>
            </label>
          </div>
          <div class="sr-soak-action">
            <button class="sr-drain-roll-btn" data-payload='${drainRollPayload}'>
              🎲 ${this.name}: Roll to Resist Drain
            </button>
          </div>
        </div>
      `,
      style: CONST.CHAT_MESSAGE_STYLES.ROLL,
    });
  }

  /**
   * Handle click on "Roll to Resist Drain".
   */
  static async handleDrainRollClick(btn, physicalDice = false) {
    const payload   = JSON.parse(btn.dataset.payload);
    const card      = btn.closest('.sr-soak-card');
    const willDice  = parseInt(card.querySelector('.sr-drain-pool')?.value)       || 1;
    const spellDice = parseInt(card.querySelector('.sr-drain-spell-pool')?.value) || 0;
    const tn        = parseInt(card.querySelector('.sr-drain-tn')?.value)         || 2;
    const pool      = willDice + spellDice;

    btn.disabled    = true;
    btn.textContent = '⏳ Rolling…';

    const actor = game.actors.get(payload.actorId);
    if (!actor) return;

    if (spellDice > 0) await actor.spendSpellPool(spellDice);

    const effectiveTN = Math.max(2, tn);
    const label       = `⚡ ${actor.name} resists drain`;

    let dice, ones, glitch;
    if (physicalDice) {
      const successes = await SR3EActor._promptPhysicalSuccesses(pool, effectiveTN, label);
      if (successes === null) { btn.disabled = false; btn.textContent = 'Roll Drain'; return; }
      dice = SR3EActor._buildPhysicalDice(pool, successes); ones = 0; glitch = false;
    } else {
      dice   = actor._rollWave(pool, effectiveTN, true);
      ones   = dice.filter(d => d.isOne).length;
      glitch = ones > Math.floor(pool / 2);
    }

    await actor._postWaveCard({
      actorId:           payload.actorId,
      label,
      tn:                effectiveTN,
      pool,
      wave:              0,
      dice,
      ones,
      glitch,
      physicalDice,
      physicalSuccesses: physicalDice ? dice.filter(d => d.success).length : undefined,
      isWeaponRoll:      false,
      isSoakRoll:        false,
      isDrainRoll:       true,
      drainPayload:      payload,
    });
  }

  async rollInitiative(options = {}) {
    // --- Vehicle: VCR, RCD, or Auto initiative ---
    if (this.type === 'vehicle') {
      const controlMode = this.system.controlMode ?? '';
      const driverActId = this.system.driverActorId?.trim() ?? '';
      const pilotRating = this.system.attributes?.pilot?.base ?? 0;

      if (driverActId) {
        const rigger = game.actors.get(driverActId);
        if (rigger) {
          const d = rigger.system.derived ?? {};

          if (controlMode === 'vcr') {
            // VCR: Rigger's reaction BASE (no wired reflexes) + vcrLevel + woundMod, (1 + vcrLevel)d6
            let vcrLevel = 0;
            const activeVCRId = rigger.system.activeVCRItemId ?? '';
            if (activeVCRId) {
              const vcrItem = rigger.items.get(activeVCRId);
              if (vcrItem) vcrLevel = vcrItem.system.rating ?? 0;
            }
            if (!vcrLevel) {
              const vcrItem = rigger.items.find(i =>
                i.type === 'cyberware' && /vcr|vehicle\s*control\s*rig/i.test(i.name)
              );
              if (vcrItem) vcrLevel = vcrItem.system.rating ?? 1;
            }

            // Wired reflexes excluded in VCR — use reaction.base not reaction.value
            const wm          = rigger.system.woundMod ?? 0;
            const reactionBase = rigger.system.attributes?.reaction?.base ?? 0;
            // Simsense jamming on this drone lowers the jacked rigger's initiative (wound-like).
            const jam = SR3EActor._vehicleSimsenseMod(this);
            const base = reactionBase + wm + vcrLevel - jam;
            const dice = 1 + vcrLevel;

            const rolls    = Array.from({ length: dice }, () => Math.floor(Math.random() * 6) + 1);
            const rolled   = rolls.reduce((s, r) => s + r, 0);
            const score    = base + rolled;
            const diceHtml = rolls.map(r => `<span class="sr-die ${r === 6 ? 'sr-hit' : ''}">${r}</span>`).join('');
            const wmPart  = wm !== 0 ? ` + wound (${wm})` : '';
            const vcrPart = ` + VCR ${vcrLevel}`;
            const jamPart = jam ? ` − Simsense jam (${jam})` : '';
            await ChatMessage.create({
              speaker: ChatMessage.getSpeaker({ actor: this }),
              content: `
                <div class="sr-roll-card">
                  <div class="sr-roll-header">⚡ Initiative — ${this.name}
                    <span style="font-size:11px;font-weight:normal;color:var(--sr-accent)"> VCR: ${rigger.name}</span>
                  </div>
                  <div class="sr-roll-meta">REA base ${reactionBase}${vcrPart}${wmPart}${jamPart} = ${base} base (${rigger.name}) + ${dice}d6</div>
                  <div class="sr-roll-dice">${diceHtml}</div>
                  <div class="sr-roll-result">Score: <strong>${score}</strong>
                    <span style="font-size:11px;color:var(--sr-muted)">(${base} + ${rolled})</span>
                  </div>
                </div>`,
              style: CONST.CHAT_MESSAGE_STYLES.ROLL,
            });
            return score;
          } else {
            // RCD: Rigger's Reaction + normal dice, no modifiers
            const base = d.initiative ?? 0;
            const dice = d.initiativeDice ?? 1;

            const rolls    = Array.from({ length: dice }, () => Math.floor(Math.random() * 6) + 1);
            const rolled   = rolls.reduce((s, r) => s + r, 0);
            const score    = base + rolled;
            const diceHtml = rolls.map(r => `<span class="sr-die ${r === 6 ? 'sr-hit' : ''}">${r}</span>`).join('');
            const reaVal  = rigger.system.attributes?.reaction?.value ?? 0;
            const wm      = rigger.system.woundMod ?? 0;
            const wmPart  = wm !== 0 ? ` + wound (${wm})` : '';
            await ChatMessage.create({
              speaker: ChatMessage.getSpeaker({ actor: this }),
              content: `
                <div class="sr-roll-card">
                  <div class="sr-roll-header">⚡ Initiative — ${this.name}
                    <span style="font-size:11px;font-weight:normal;color:var(--sr-green)"> RCD: ${rigger.name}</span>
                  </div>
                  <div class="sr-roll-meta">REA ${reaVal}${wmPart} = ${base} base (${rigger.name}) + ${dice}d6</div>
                  <div class="sr-roll-dice">${diceHtml}</div>
                  <div class="sr-roll-result">Score: <strong>${score}</strong>
                    <span style="font-size:11px;color:var(--sr-muted)">(${base} + ${rolled})</span>
                  </div>
                </div>`,
              style: CONST.CHAT_MESSAGE_STYLES.ROLL,
            });
            return score;
          }
        } else {
          ui.notifications.warn(`${this.name}: driver not found — rolling Auto instead.`);
        }
      }

      // Auto: Pilot rating base + 2d6
      const base     = pilotRating;
      const rolls    = [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1];
      const rolled   = rolls[0] + rolls[1];
      const score    = base + rolled;
      const diceHtml = rolls.map(r => `<span class="sr-die ${r === 6 ? 'sr-hit' : ''}">${r}</span>`).join('');
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        content: `
          <div class="sr-roll-card">
            <div class="sr-roll-header">⚡ Initiative — ${this.name}
              <span style="font-size:11px;font-weight:normal;color:var(--sr-gold)"> Auto</span>
            </div>
            <div class="sr-roll-meta">Pilot ${pilotRating} base + 2d6</div>
            <div class="sr-roll-dice">${diceHtml}</div>
            <div class="sr-roll-result">Score: <strong>${score}</strong>
              <span style="font-size:11px;color:var(--sr-muted)">(${base} + ${rolled})</span>
            </div>
          </div>`,
        style: CONST.CHAT_MESSAGE_STYLES.ROLL,
      });
      return score;
    }

    // --- Character / NPC initiative ---
    const d           = this.system.derived ?? {};
    const matrixMode  = this.system.matrixUserMode ?? '';
    const astralMode  = this.system.astralMode ?? '';
    const useMatrixHot    = matrixMode === 'VR-Hot';
    const useMatrixJacked = matrixMode === 'TRM' || matrixMode === 'AR' || matrixMode === 'VR-Cold';
    const useAstral       = astralMode === 'astral';

    let base, dice, modeNote;

    // VCR (jumped-in): rigger uses reaction BASE + VCR level (wired reflexes excluded).
    const vcrVehicle = game.actors?.find(a =>
      a.type === 'vehicle' &&
      a.system?.driverActorId === this.id &&
      a.system?.controlMode === 'vcr'
    );
    if (vcrVehicle) {
      let vcrLevel = 0;
      const activeVCRId = this.system.activeVCRItemId ?? '';
      if (activeVCRId) {
        const vcrItem = this.items.get(activeVCRId);
        if (vcrItem) vcrLevel = vcrItem.system.rating ?? 0;
      }
      if (!vcrLevel) {
        const vcrItem = this.items.find(i =>
          i.type === 'cyberware' && /vcr|vehicle\s*control\s*rig/i.test(i.name)
        );
        if (vcrItem) vcrLevel = vcrItem.system.rating ?? 1;
      }
      const wm = this.system.woundMod ?? 0;
      const reactionBase = this.system.attributes?.reaction?.base ?? 0;
      // Simsense jamming on the jumped-in drone lowers initiative (wound-like).
      const jam = SR3EActor._vehicleSimsenseMod(vcrVehicle);
      base = reactionBase + vcrLevel + wm - jam;
      dice = 1 + vcrLevel;
      modeNote = `<div class="sr-roll-meta" style="color:var(--sr-accent)">🎮 VCR Lv${vcrLevel} — REA base ${reactionBase}${vcrLevel ? ` + VCR ${vcrLevel}` : ''}${jam ? ` − Simsense jam (${jam})` : ''}</div>`;
    } else if (useAstral) {
      // Astral initiative: Intelligence + 20 + 1d6
      const intel = this.system.attributes?.intelligence?.value ?? 0;
      base = intel + 20;
      dice = 1;
      modeNote = `<div class="sr-roll-meta" style="color:#c070f5">✦ Astral Init — INT ${intel} + 20</div>`;
    } else if (useMatrixHot) {
      // VR-Hot: (base Reaction + woundMod + Response×2) + (1+Response)d6
      // Wired reflexes excluded — use reaction.base, not reaction.value
      const wm           = this.system.woundMod ?? 0;
      const reactionBase = this.system.attributes?.reaction?.base ?? 0;
      const deckId       = this.system.equippedCyberdeck ?? '';
      const deck         = deckId ? this.items.get(deckId) : null;
      const response     = deck?.system?.attributes?.response?.base ?? 0;
      base = reactionBase + wm + (response * 2);
      dice = 1 + response;
      modeNote = `<div class="sr-roll-meta" style="color:var(--sr-accent)">💻 VR-Hot Init — REA ${reactionBase} + Response ${response}×2</div>`;
    } else if (useMatrixJacked) {
      // TRM / AR / VR-Cold: Reaction (with wired reflexes) + 1d6 (Response does not apply)
      base = d.initiative ?? 0;
      dice = 1;
      modeNote = `<div class="sr-roll-meta" style="color:var(--sr-accent)">🔌 Matrix Init (${matrixMode})</div>`;
    } else {
      base = d.initiative     ?? 0;
      dice = d.initiativeDice ?? 1;
      modeNote = '';
    }

    const woundMod = this.system.woundMod ?? 0;
    const woundNote = (woundMod < 0 && !useAstral && !useMatrixHot)
      ? `<div class="sr-roll-meta" style="color:var(--sr-amber)">Wound −${-woundMod}: reaction ${base - woundMod} → ${base} base</div>`
      : '';

    let score;
    let cardContent;

    if (options.physicalDice) {
      let entered = null;
      await foundry.applications.api.DialogV2.wait({
        window: { title: `⚡ Initiative — ${this.name}` },
        content: `
          <div style="padding:8px 0">
            <p style="margin-bottom:8px">${base} base + ${dice}d6 — roll your dice then enter the total.</p>
            <label style="display:flex;align-items:center;gap:8px">
              Score:
              <input type="number" id="init-score" value="${base}" min="0" max="99"
                     style="width:60px" autofocus/>
            </label>
          </div>`,
        buttons: [
          { label: 'Confirm', action: 'confirm', default: true,
            callback: (_e, _b, dlg) => { entered = parseInt(dlg.element.querySelector('#init-score')?.value) || base; } },
          { label: 'Cancel', action: 'cancel' },
        ],
      });
      if (entered === null) return null;
      score = entered;
      cardContent = `
        <div class="sr-roll-card">
          <div class="sr-roll-header">⚡ Initiative — ${this.name}</div>
          <div class="sr-roll-meta">${base} base + ${dice}d6</div>
          ${woundNote}
          ${modeNote}
          <div class="sr-roll-dice"><span class="sr-die sr-hit" title="Physical dice">📋 ${score}</span></div>
          <div class="sr-roll-result">Score: <strong>${score}</strong></div>
        </div>`;
    } else {
      const rolls = Array.from({ length: dice }, () => Math.floor(Math.random() * 6) + 1);
      const initiativeRoll = rolls.reduce((sum, r) => sum + r, 0);
      score = base + initiativeRoll;
      const diceHtml = rolls.map(r =>
        `<span class="sr-die ${r === 6 ? 'sr-hit' : ''}" title="${r}">${r}</span>`
      ).join('');
      cardContent = `
        <div class="sr-roll-card">
          <div class="sr-roll-header">⚡ Initiative — ${this.name}</div>
          <div class="sr-roll-meta">${base} base + ${dice}d6</div>
          ${woundNote}
          ${modeNote}
          <div class="sr-roll-dice">${diceHtml}</div>
          <div class="sr-roll-result">
            Score: <strong>${score}</strong>
            <span style="font-size:11px;color:var(--sr-muted)">(${base} + ${initiativeRoll})</span>
          </div>
        </div>`;
    }

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: cardContent,
      style: CONST.CHAT_MESSAGE_STYLES.ROLL,
    });

    return score;
  }

  /**
   * Dispel a spell: roll Sorcery vs TN=Force, report successes vs original cast hits,
   * then post a drain card for the dispeller.
   */
  async rollDispel() {
    const magicBase = this.system.attributes?.magic?.base ?? 0;
    if (magicBase <= 0) {
      ui.notifications.warn(`${this.name} is not Awakened (Magic attribute is 0).`);
      return null;
    }

    // Find Sorcery skill and check Dispelling specialisation
    const sorcerySkill  = this.items.find(i => i.type === 'skill' && /sorcery/i.test(i.name));
    const sorceryRating = sorcerySkill?.system?.rating ?? 0;
    const sorcerySpec   = sorcerySkill?.system?.specialisation ?? '';
    const hasDispelSpec = /dispel/i.test(sorcerySpec);

    // Dialog: gather spell info
    let force = null, originalSuccesses = null, drainCode = '', cancelled = true;
    await foundry.applications.api.DialogV2.wait({
      window: { title: `${this.name} — Dispel Spell` },
      content: `
        <p>Enter the details of the spell you are dispelling.</p>
        <div style="font-size:12px;margin-bottom:8px">
          Sorcery dice:
          <strong>${hasDispelSpec
            ? `${sorceryRating} <span style="color:var(--sr-accent)">(${sorceryRating + 2})</span> — Dispelling spec`
            : (sorceryRating || '(none)')
          }</strong>
        </div>
        <div style="display:grid;grid-template-columns:auto 1fr;align-items:center;gap:8px 12px">
          <label>Force:</label>
          <input type="number" id="dispel-force" value="4" min="1" max="99" style="width:70px"/>
          <label>Original Successes:</label>
          <input type="number" id="dispel-orig" value="1" min="0" max="99" style="width:70px"/>
          <label>Drain Code:</label>
          <input type="text" id="dispel-drain" value="" placeholder="e.g. (F/2)S" style="width:120px"/>
        </div>
      `,
      buttons: [
        {
          label: 'Roll Dispel',
          action: 'confirm',
          default: true,
          callback: (_e, _b, dialog) => {
            cancelled           = false;
            force               = Math.max(1, parseInt(dialog.element.querySelector('#dispel-force')?.value) || 1);
            originalSuccesses   = Math.max(0, parseInt(dialog.element.querySelector('#dispel-orig')?.value) || 0);
            drainCode           = dialog.element.querySelector('#dispel-drain')?.value?.trim() ?? '';
          }
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    if (cancelled || force === null) return null;

    const specBonus   = hasDispelSpec ? 2 : 0;
    const sorceryDice = Math.max(0, sorceryRating + specBonus);

    const intVal  = this.system.attributes?.intelligence?.base ?? 0;
    const wilVal  = this.system.attributes?.willpower?.base    ?? 0;
    const spBase  = Math.max(0, Math.floor((intVal + wilVal + magicBase) / 3));
    const spTotal   = spBase + (this.system.spellPoolMod ?? 0);
    const spSpent   = this.system.spellPoolSpent ?? 0;
    const availSpell = Math.max(0, spTotal - spSpent);

    let spellDice = 0;
    if (availSpell > 0) {
      await foundry.applications.api.DialogV2.wait({
        window: { title: `${this.name} — Spell Pool (Dispel)` },
        content: `
          <p>Allocate Spell Pool dice to the dispel roll.</p>
          <p style="font-size:11px;color:var(--sr-muted)">Available: <strong>${availSpell}</strong> dice (0 = none)</p>
          <input type="number" id="dispel-spell-dice" min="0" max="${availSpell}" value="0" style="width:80px"/>
        `,
        buttons: [
          {
            label: 'Confirm',
            action: 'confirm',
            default: true,
            callback: (_e, _b, dialog) => {
              spellDice = Math.min(availSpell, Math.max(0, parseInt(dialog.element.querySelector('#dispel-spell-dice')?.value) || 0));
            }
          },
          { label: 'Skip', action: 'skip' },
        ],
      });
      if (spellDice > 0) await this.spendSpellPool(spellDice);
    }

    const pool = Math.max(1, sorceryDice + spellDice);
    // Remaining spell pool for drain resist (spent is now updated)
    const spellPoolForDrain = Math.max(0, spTotal - (this.system.spellPoolSpent ?? 0));

    const sorceryLabel = hasDispelSpec
      ? `Sorcery ${sorceryRating} (${sorceryRating + 2}) — Dispelling`
      : `Sorcery ${sorceryRating}`;
    const label = `✦ ${this.name} — Dispel [F${force}] ${sorceryLabel}`;

    // Drain is Physical if Force > Magic attribute (same rule as casting)
    const drainIsPhysical = force > magicBase;

    return this.rollPool(pool, force, label, {
      isDispelRoll:  true,
      dispelContext: {
        actorId:          this.id,
        force,
        originalSuccesses,
        drainCode,
        drainIsPhysical,
        sorceryRating,
        spellPoolForDrain,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // ASTRAL COMBAT
  // ---------------------------------------------------------------------------

  async rollAstralCombat(options = {}) {
    const magicBase = this.system.attributes?.magic?.base ?? 0;
    if (magicBase <= 0) {
      ui.notifications.warn(`${this.name} is not Awakened and cannot initiate astral combat.`);
      return null;
    }

    const _getAstralInfo = (actor) => {
      const cha        = actor.system.attributes?.charisma?.base   ?? 1;
      const wil        = actor.system.attributes?.willpower?.base  ?? 1;
      const astralPool = actor.system.derived?.availableAstralPool ?? 0;

      // Damage: armed if active weapon focus, unarmed otherwise
      const weaponFocus = actor.items.find(i =>
        i.type === 'melee' && (i.system.isFocus ?? false) && (i.system.focusActive ?? false)
      );
      let rawDamage;
      if (weaponFocus) {
        const focusBase = SR3EItem.parseDamageCode(weaponFocus.system.damage ?? '', actor);
        if (focusBase) {
          rawDamage = `${cha + focusBase.power}${focusBase.level}`;
        } else {
          rawDamage = `${cha}M`; // fallback if focus has no damage code
        }
      } else {
        rawDamage = `${cha}M`;
      }

      // Attack dice: Sorcery skill (+2 if Astral Combat specialisation)
      const sorcery = actor.items.find(i =>
        i.type === 'skill' && i.name.toLowerCase() === 'sorcery'
      );
      if (sorcery) {
        const rating  = sorcery.system.skillRating ?? sorcery.system.rating ?? 1;
        const hasSpec = (sorcery.system.specialisation ?? '').toLowerCase() === 'astral combat';
        return {
          skillName:  hasSpec ? `Sorcery (Astral Combat spec)` : `Sorcery`,
          skillDice:  hasSpec ? rating + 2 : rating,
          isDefault:  false,
          rawDamage,
          astralPool,
        };
      }

      // No Sorcery skill — defaulting (resolved interactively below).
      return {
        skillName:    'Sorcery (defaulting)',
        skillDice:    Math.max(1, wil),
        isDefault:    true,
        defaultTnMod: 0,
        rawDamage,
        astralPool:   0,
      };
    };

    const atkInfo     = _getAstralInfo(this);
    const targetActor = await SR3EItem._promptTarget(this);
    if (!targetActor) return null;

    const defInfo = _getAstralInfo(targetActor);

    // SR3 Default Table — either side may lack Sorcery. Prompt each defaulter (attacker first).
    const _applyAstralDefault = async (info, dActor, who) => {
      if (!info.isDefault) return true;
      const def = await SR3EItem.promptDefaultChoice(dActor, {
        linkedAttr: 'willpower',
        title:      `Defaulting — ${dActor.name} (${who})`,
        message:    `${dActor.name} has no <strong>Sorcery</strong> skill — choose how to default:`,
      });
      if (!def) return false;   // cancelled
      info.skillDice    = def.pool;
      info.skillName    = def.label;
      info.defaultTnMod = def.tnMod;
      info.astralPool   = def.allowPool ? (dActor.system.derived?.availableAstralPool ?? 0) : 0;
      return true;
    };
    if (!await _applyAstralDefault(atkInfo, this, 'attacker'))         return null;
    if (!await _applyAstralDefault(defInfo, targetActor, 'defender'))  return null;

    const atkTN = 4 + (atkInfo.defaultTnMod ?? 0);   // defaulting TN modifier
    const defTN = 4 + (defInfo.defaultTnMod ?? 0);

    await SR3EActor.postAstralCard({
      attackerActorId: this.id,
      defenderActorId: targetActor.id,
      atkSkillName:    atkInfo.skillName,
      atkSkillDice:    atkInfo.skillDice,
      atkIsDefault:    atkInfo.isDefault,
      atkAstralPool:   atkInfo.astralPool,
      atkRawDamage:    atkInfo.rawDamage,
      atkTN,
      defSkillName:    defInfo.skillName,
      defSkillDice:    defInfo.skillDice,
      defIsDefault:    defInfo.isDefault,
      defAstralPool:   defInfo.astralPool,
      defRawDamage:    defInfo.rawDamage,
      defTN,
    });
  }

  static async postAstralCard(ctx) {
    const atk = game.actors.get(ctx.attackerActorId);
    const def = game.actors.get(ctx.defenderActorId);
    if (!atk || !def) return;

    const payload = JSON.stringify(ctx).replace(/'/g, '&#39;');

    const _corner = (name, skillName, skillDice, isDefault, rawDamage, astralPool, tn, poolClass, tnClass, dmgClass) => `
      <div class="sr-melee-corner sr-astral-corner">
        <div class="sr-melee-name">${name}</div>
        <div class="sr-astral-skill-line">
          ${isDefault
            ? `<span style="color:var(--sr-amber)">${skillName} (${skillDice})</span>`
            : `${skillName} (${skillDice})`}
        </div>
        <div class="sr-astral-field-row">
          <label class="sr-astral-field-label">Damage</label>
          <input type="text" class="${dmgClass} sr-astral-input" value="${rawDamage}" style="width:60px"/>
        </div>
        <div class="sr-astral-field-row">
          <span class="sr-astral-field-label">Charisma dice</span>
          <strong class="sr-astral-field-value">${skillDice}</strong>
        </div>
        <div class="sr-astral-field-row">
          <label class="sr-astral-field-label">+ Astral Pool (avail. ${astralPool})</label>
          <input type="number" class="${poolClass} sr-astral-input" value="0" min="0" max="${astralPool}"/>
        </div>
        <div class="sr-astral-field-row">
          <label class="sr-astral-field-label">TN</label>
          <input type="number" class="${tnClass} sr-astral-input" value="${tn}" min="2" max="30"/>
        </div>
      </div>`;

    await ChatMessage.create({
      speaker: { alias: 'Astral Combat' },
      content: `
        <div class="sr-roll-card sr-melee-card">
          <div class="sr-roll-header">✦ ASTRAL COMBAT — ${atk.name} vs ${def.name}</div>
          <div class="sr-melee-boxing">
            ${_corner(atk.name, ctx.atkSkillName, ctx.atkSkillDice, ctx.atkIsDefault, ctx.atkRawDamage,
                      ctx.atkAstralPool, ctx.atkTN, 'sr-astral-atk-pool', 'sr-astral-atk-tn', 'sr-astral-atk-damage')}
            <div class="sr-melee-vs">VS</div>
            ${_corner(def.name, ctx.defSkillName, ctx.defSkillDice, ctx.defIsDefault, ctx.defRawDamage,
                      ctx.defAstralPool, ctx.defTN, 'sr-astral-def-pool', 'sr-astral-def-tn', 'sr-astral-def-damage')}
          </div>
          <div style="margin:8px 0 4px;font-size:11px;color:var(--sr-muted)">
            <label style="display:flex;align-items:center;gap:6px">
              <input type="checkbox" class="sr-astral-physical-dmg"/>
              Physical Damage (unchecked = Stun)
            </label>
          </div>
          <div class="sr-soak-action">
            <button class="sr-astral-roll-btn" data-payload='${payload}'>✦ Roll!</button>
          </div>
        </div>`,
      style: CONST.CHAT_MESSAGE_STYLES.ROLL,
    });
  }

  static async handleAstralRoll(btn, physicalDice = false) {
    const ctx  = JSON.parse(btn.dataset.payload);
    const card = btn.closest('.sr-melee-card');

    btn.disabled    = true;
    btn.textContent = '⏳ Rolling…';

    const atkAstralPool = parseInt(card.querySelector('.sr-astral-atk-pool')?.value) || 0;
    const defAstralPool = parseInt(card.querySelector('.sr-astral-def-pool')?.value) || 0;
    const atkPool       = Math.max(1, (ctx.atkSkillDice ?? 1) + atkAstralPool);
    const defPool       = Math.max(1, (ctx.defSkillDice ?? 1) + defAstralPool);
    const atkTN         = Math.max(2, parseInt(card.querySelector('.sr-astral-atk-tn')?.value) || 4);
    const defTN         = Math.max(2, parseInt(card.querySelector('.sr-astral-def-tn')?.value) || 4);
    const atkRawDamage  = card.querySelector('.sr-astral-atk-damage')?.value.trim() || ctx.atkRawDamage;
    const defRawDamage  = card.querySelector('.sr-astral-def-damage')?.value.trim() || ctx.defRawDamage;
    const isPhysical    = card.querySelector('.sr-astral-physical-dmg')?.checked ?? false;

    const atkActor = game.actors.get(ctx.attackerActorId);
    const defActor = game.actors.get(ctx.defenderActorId);
    if (atkAstralPool > 0 && atkActor) await atkActor.spendAstralPool(atkAstralPool);
    if (defAstralPool > 0 && defActor) await defActor.spendAstralPool(defAstralPool);

    const atk = game.actors.get(ctx.attackerActorId);
    const def = game.actors.get(ctx.defenderActorId);
    if (!atk || !def) return;

    let atkDice, defDice;
    if (physicalDice) {
      const atkSuccesses = await SR3EActor._promptPhysicalSuccesses(atkPool, atkTN, `✦ ${atk.name} — Astral Combat`);
      if (atkSuccesses === null) { btn.disabled = false; btn.textContent = 'Roll!'; return; }
      const defSuccesses = await SR3EActor._promptPhysicalSuccesses(defPool, defTN, `✦ ${def.name} — Astral Combat`);
      if (defSuccesses === null) { btn.disabled = false; btn.textContent = 'Roll!'; return; }
      atkDice = SR3EActor._buildPhysicalDice(atkPool, atkSuccesses);
      defDice = SR3EActor._buildPhysicalDice(defPool, defSuccesses);
    } else {
      atkDice = atk._rollWave(atkPool, atkTN, true);
      defDice = def._rollWave(defPool, defTN, true);
    }

    const atkOnes   = atkDice.filter(d => d.isOne).length;
    const defOnes   = defDice.filter(d => d.isOne).length;
    const atkGlitch = atkOnes > Math.floor(atkPool / 2);
    const defGlitch = defOnes > Math.floor(defPool / 2);

    const astralCtx = { ...ctx, atkPool, atkTN, defPool, defTN, atkRawDamage, defRawDamage, isPhysical };

    await atk._postWaveCard({
      actorId: atk.id, label: `✦ ${atk.name} — Astral Combat`,
      tn: atkTN, pool: atkPool, wave: 0,
      dice: atkDice, ones: atkOnes, glitch: atkGlitch,
      physicalDice, physicalSuccesses: physicalDice ? atkDice.filter(d => d.success).length : undefined,
      isWeaponRoll: false, isMeleeAtk: true, meleeCtx: astralCtx,
    });

    await def._postWaveCard({
      actorId: def.id, label: `✦ ${def.name} — Astral Combat`,
      tn: defTN, pool: defPool, wave: 0,
      dice: defDice, ones: defOnes, glitch: defGlitch,
      physicalDice, physicalSuccesses: physicalDice ? defDice.filter(d => d.success).length : undefined,
      isWeaponRoll: false, isMeleeDef: true, meleeCtx: astralCtx,
    });

    await SR3EActor._postAstralResult(astralCtx, atkDice, defDice);
  }

  static async _postAstralResult(ctx, atkDice, defDice) {
    const atkSuccesses = atkDice.filter(d => d.success).length;
    const defSuccesses = defDice.filter(d => d.success).length;
    const net          = Math.abs(atkSuccesses - defSuccesses);

    const atk = game.actors.get(ctx.attackerActorId);
    const def = game.actors.get(ctx.defenderActorId);

    let resultHtml;

    if (atkSuccesses === defSuccesses) {
      resultHtml = `
        <div class="sr-melee-result sr-melee-tie">
          🤝 Tie! ${atkSuccesses} vs ${defSuccesses} — no damage dealt.
        </div>`;
    } else {
      const winnerIsAtk = atkSuccesses > defSuccesses;
      const winner      = winnerIsAtk ? atk : def;
      const loser       = winnerIsAtk ? def : atk;
      const winnerName  = winner?.name ?? 'Winner';
      const loserName   = loser?.name  ?? 'Loser';

      const winnerCha    = winner?.system?.attributes?.charisma?.base ?? 1;
      const isStun       = !(ctx.isPhysical ?? false);
      const winnerRaw    = winnerIsAtk ? (ctx.atkRawDamage || `${winnerCha}M`) : (ctx.defRawDamage || `${winnerCha}M`);
      const baseDamage   = SR3EItem.parseDamageCode(winnerRaw, winner) ?? { power: winnerCha, level: 'M', isStun: false };
      const staged       = SR3EItem.stageDamage(baseDamage, net);
      const finalIsStun  = isStun ?? staged.isStun;
      const trackLabel   = finalIsStun ? 'Stun' : 'Physical';

      const stagingHtml = `<div class="sr-staging-result">📊 ${winnerRaw} + ${net} net hit${net !== 1 ? 's' : ''} → <strong>${staged.power}${staged.level} ${trackLabel}</strong></div>`;

      const soakPayload = JSON.stringify({
        actorId:         loser?.id,
        attackerActorId: winner?.id,
        winnerCha,
        stagedPower:     staged.power,
        stagedLevel:     staged.level,
        isStun:          finalIsStun,
      }).replace(/'/g, '&#39;');

      const soakBtn = `
        <div class="sr-soak-action">
          <button class="sr-astral-soak-btn" data-payload='${soakPayload}'>
            🛡 ${loserName}: Resist Damage (Astral)
          </button>
        </div>`;

      resultHtml = `
        <div class="sr-melee-result sr-melee-win">
          ✦ ${winnerName} wins! ${atkSuccesses} vs ${defSuccesses} (net ${net})
        </div>
        ${stagingHtml}
        ${soakBtn}`;
    }

    await ChatMessage.create({
      speaker: { alias: 'Astral Result' },
      content: `
        <div class="sr-roll-card sr-melee-card">
          <div class="sr-roll-header">✦ ${atk?.name ?? ''} vs ${def?.name ?? ''} — Astral Result</div>
          ${resultHtml}
        </div>`,
      style: CONST.CHAT_MESSAGE_STYLES.ROLL,
    });
  }

  static async postAstralSoakCard(actorId, payload) {
    const actor = game.actors.get(actorId);
    if (!actor) return;
    return actor._postAstralSoakCard(payload);
  }

  async _postAstralSoakCard(payload) {
    const { stagedPower, stagedLevel, isStun, winnerCha } = payload;
    const trackLabel = isStun ? 'Stun' : 'Physical';

    this.prepareDerivedData();
    const wilAttr = this.system.attributes?.willpower;
    const wilVal  = Math.max(wilAttr?.value ?? 0, wilAttr?.base ?? 0, 1);
    const soakTN  = Math.max(2, winnerCha ?? stagedPower);

    const soakPayload = JSON.stringify({
      actorId:         this.id,
      attackerActorId: payload.attackerActorId,
      stagedPower,
      stagedLevel,
      isStun,
      winnerCha,
    }).replace(/'/g, '&#39;');

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `
        <div class="sr-roll-card sr-astral-soak-card">
          <div class="sr-roll-header">✦ ${this.name} — Resist Astral Damage</div>
          <div class="sr-roll-meta">
            Incoming: <strong>${stagedPower}${stagedLevel} ${trackLabel}</strong>
          </div>
          <div class="sr-soak-fields">
            <label class="sr-soak-label">
              Resist Pool — Willpower / Astral Body (${wilVal}):
              <input type="number" class="sr-astral-soak-pool" value="${wilVal}" min="1" max="30" style="width:55px"/>
            </label>
            <label class="sr-soak-label">
              TN (Winner's Charisma ${winnerCha ?? stagedPower}):
              <input type="number" class="sr-astral-soak-tn" value="${soakTN}" min="2" max="30" style="width:55px"/>
            </label>
          </div>
          <div class="sr-soak-action">
            <button class="sr-astral-soak-roll-btn" data-payload='${soakPayload}'>
              🎲 ${this.name}: Roll to Resist (Astral)
            </button>
          </div>
        </div>`,
      style: CONST.CHAT_MESSAGE_STYLES.ROLL,
    });
  }

  static async handleAstralSoakRoll(btn, physicalDice = false) {
    const payload = JSON.parse(btn.dataset.payload);
    const card    = btn.closest('.sr-astral-soak-card');
    const pool    = parseInt(card.querySelector('.sr-astral-soak-pool')?.value) || 1;
    const tn      = parseInt(card.querySelector('.sr-astral-soak-tn')?.value)   || 2;

    btn.disabled    = true;
    btn.textContent = '⏳ Rolling…';

    const actor = game.actors.get(payload.actorId);
    if (!actor) return;

    const effectiveTN = Math.max(2, tn);
    const label       = `✦ ${actor.name} resists astral damage`;

    let dice, ones, glitch;
    if (physicalDice) {
      const successes = await SR3EActor._promptPhysicalSuccesses(pool, effectiveTN, label);
      if (successes === null) { btn.disabled = false; btn.textContent = 'Roll to Resist'; return; }
      dice = SR3EActor._buildPhysicalDice(pool, successes); ones = 0; glitch = false;
    } else {
      dice   = actor._rollWave(pool, effectiveTN, true);
      ones   = dice.filter(d => d.isOne).length;
      glitch = ones > Math.floor(pool / 2);
    }

    await actor._postWaveCard({
      actorId:           payload.actorId,
      label,
      tn:                effectiveTN,
      pool,
      wave:              0,
      dice,
      ones,
      glitch,
      physicalDice,
      physicalSuccesses: physicalDice ? dice.filter(d => d.success).length : undefined,
      isWeaponRoll:      false,
      isSoakRoll:        true,
      soakPayload:       payload,
    });
  }

  // ---------------------------------------------------------------------------
  // ASSENSING
  // ---------------------------------------------------------------------------

  static async _postAssensingResult(successes, tn, actorName, { actorId = null, auraBonus = null, auraSuccesses = null } = {}) {
    const _li = text => `<li class="sr-assen-item">${text}</li>`;

    const TIER_1_2 = `
      <ul class="sr-assen-list">
        ${_li('The general state of the subject\'s health (healthy, injured, ill, etc.) along with the presence or absence of cyberware implants.')}
        ${_li('The subject\'s general emotional state or impression.')}
        ${_li('The class of a magical subject (fire elemental, manipulation spell, power focus, and so on).')}
        ${_li('Whether the subject is mundane or Awakened.')}
        ${_li('If you have seen the subject\'s aura before, you will recognise it regardless of physical disguises or alterations.')}
      </ul>`;

    const TIER_3_4_EXTRA = `
      <ul class="sr-assen-list sr-assen-extra">
        ${_li('Whether the subject\'s Essence and Magic Attribute are higher, lower, or equal to your own.')}
        ${_li('The general location of any implants.')}
        ${_li('A general diagnosis for any maladies (diseases or toxins) the subject suffers from.')}
        ${_li('The subject\'s <em>exact</em> emotional state or impression.')}
        ${_li('Whether the subject\'s Force is higher, lower, or equal to your Magic Attribute.')}
        ${_li('Any astral signatures present on the subject.')}
      </ul>`;

    const TIER_5_EXTRA = `
      <ul class="sr-assen-list sr-assen-extra">
        ${_li('The <strong>exact</strong> Essence, Magic Attribute, and Force of the subject.')}
        ${_li('The exact location of any implants.')}
        ${_li('An accurate diagnosis of any disease or toxin the subject suffers from.')}
        ${_li('The general cause of any emotional impression (a murder, a riot, a religious ceremony, and so on).')}
        ${_li('The general cause of any astral signature (combat spell, hearth spirit, and so on).')}
      </ul>`;

    let tierLabel, tierClass, bodyHtml;

    if (successes === 0) {
      tierLabel = 'No Information';
      tierClass = 'sr-assen-tier-fail';
      bodyHtml  = `
        <p class="sr-assen-fail-text">You learn nothing from this assensing attempt.</p>
        <p class="sr-assen-retry">💡 You may try again with a TN+2 penalty (retry at TN ${tn + 2}).</p>`;
    } else if (successes <= 2) {
      tierLabel = `${successes} Success${successes > 1 ? 'es' : ''} — Basic Reading`;
      tierClass = 'sr-assen-tier-low';
      bodyHtml  = TIER_1_2;
    } else if (successes <= 4) {
      tierLabel = `${successes} Successes — Detailed Reading`;
      tierClass = 'sr-assen-tier-mid';
      bodyHtml  = TIER_1_2 + `<div class="sr-assen-also">Additionally:</div>` + TIER_3_4_EXTRA;
    } else {
      tierLabel = `${successes} Successes — Full Aura Read`;
      tierClass = 'sr-assen-tier-high';
      bodyHtml  = TIER_1_2 + `<div class="sr-assen-also">Additionally:</div>` + TIER_3_4_EXTRA
                + `<div class="sr-assen-also">Furthermore:</div>` + TIER_5_EXTRA;
    }

    // Aura Reading bonus line (shown when a complementary roll was applied)
    const bonusHtml = auraBonus !== null
      ? `<div class="sr-assen-bonus">✦ Aura Reading: ${auraSuccesses} hit${auraSuccesses !== 1 ? 's' : ''} → +${auraBonus} bonus success${auraBonus !== 1 ? 'es' : ''}</div>`
      : '';

    // Complementary roll offer — only when 1–4 successes and not already a bonus result
    const canOfferAura = actorId && successes >= 1 && successes <= 4 && auraBonus === null;
    const auraPayload  = canOfferAura
      ? JSON.stringify({ actorId, originalSuccesses: successes }).replace(/'/g, '&#39;')
      : null;
    const auraBtn = canOfferAura
      ? `<div class="sr-soak-action">
           <button class="sr-aura-reading-btn" data-payload='${auraPayload}'>
             ✦ Roll Aura Reading (Complementary)
           </button>
         </div>`
      : '';

    await ChatMessage.create({
      speaker: { alias: actorName },
      content: `
        <div class="sr-roll-card sr-assen-card">
          <div class="sr-roll-header">👁 ASSENSING — ${actorName}</div>
          ${bonusHtml}
          <div class="sr-assen-tier ${tierClass}">${tierLabel}</div>
          <div class="sr-assen-body">${bodyHtml}</div>
          ${auraBtn}
        </div>
      `,
    });
  }

  static async handleAuraReadingClick(btn, physicalDice = false) {
    const p     = JSON.parse(btn.dataset.payload);
    const actor = game.actors.get(p.actorId);
    if (!actor) return;

    const skill = actor.items.find(i =>
      i.type === 'skill' && i.name.toLowerCase() === 'aura reading'
    );
    if (!skill) {
      ui.notifications.warn(`${actor.name} does not have the Aura Reading skill.`);
      btn.disabled    = false;
      btn.textContent = '✦ Roll Aura Reading (Complementary)';
      return;
    }

    const rating   = skill.system.skillRating ?? 1;
    const basePool = Math.max(1, rating);

    let opts = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: 'Aura Reading — Complementary Roll' },
      content: `
        <div style="padding:8px 0">
          <div style="margin-bottom:10px">
            <label>Dice Pool (Aura Reading ${rating}):
              <input type="number" id="ar-pool" value="${basePool}" min="1" max="30" style="width:60px;margin-left:8px"/>
            </label>
          </div>
          <div style="margin-bottom:10px">
            <label>Target Number:
              <input type="number" id="ar-tn" value="4" min="2" max="30" style="width:60px;margin-left:8px"/>
            </label>
          </div>
          <div style="color:var(--sr-muted);font-size:11px;margin-top:4px">Every 2 successes add 1 to the Assensing result</div>
        </div>
      `,
      buttons: [
        {
          label: 'Roll',
          action: 'roll',
          default: true,
          callback: (_e, _b, dialog) => {
            const html = dialog.element;
            opts = {
              pool: Math.max(1, parseInt(html.querySelector('#ar-pool')?.value) || 1),
              tn:   Math.max(2, parseInt(html.querySelector('#ar-tn')?.value)   || 4),
            };
          }
        },
        { label: 'Cancel', action: 'cancel' }
      ],
    });
    if (!opts) return;

    await actor.rollPool(opts.pool, opts.tn, `Aura Reading (Complementary)`, {
      isAuraReadingRoll:  true,
      auraReadingContext: {
        originalSuccesses: p.originalSuccesses,
        actorId:           actor.id,
        actorName:         actor.name,
      },
      physicalDice,
    });
  }

  // ---------------------------------------------------------------------------
  // UNIVERSAL CONTESTED ROLL
  // ---------------------------------------------------------------------------

  static async openContestedDialog(defaultActor, shiftKey = false) {
    const buildSources = (a) => {
      const attr    = a.system.attributes ?? {};
      const sources = [];
      const defs = a.type === 'vehicle'
        ? [['handling','Handling'],['speed','Speed'],['accel','Accel'],['body','Body'],['armor','Armor'],['sig','Sig'],['autonav','Autonav'],['pilot','Pilot'],['sensor','Sensor'],['cargo','Cargo'],['load','Load']]
        : [['body','Body'],['quickness','Quickness'],['strength','Strength'],['charisma','Charisma'],
           ['intelligence','Intelligence'],['willpower','Willpower'],['reaction','Reaction'],['essence','Essence']];
      for (const [key, label] of defs) {
        const val = attr[key]?.base ?? attr[key]?.value ?? 0;
        // Always include vehicle stats (even if 0); filter characters to non-zero only
        if (a.type === 'vehicle' || val > 0) sources.push({ group: 'attr', label: `${label} (${val})`, value: val });
      }
      if (a.type !== 'vehicle') {
        const mag = attr.magic?.base ?? 0;
        if (mag > 0) sources.push({ group: 'attr', label: `Magic (${mag})`, value: mag });
      }
      for (const sk of a.items.filter(i => i.type === 'skill').sort((x,y) => x.name.localeCompare(y.name))) {
        const rating = sk.system.skillRating ?? sk.system.rating ?? 0;
        sources.push({ group: 'skill', label: `${sk.name} (${rating})`, value: rating });
      }
      return sources;
    };

    const buildOptions = (sources) => {
      const attrs  = sources.filter(s => s.group === 'attr');
      const skills = sources.filter(s => s.group === 'skill');
      const ao = attrs.map(s  => `<option value="${s.value}">${s.label}</option>`).join('');
      const so = skills.map(s => `<option value="${s.value}">${s.label}</option>`).join('');
      return `${ao.length ? `<optgroup label="Attributes">${ao}</optgroup>` : ''}
              ${so.length ? `<optgroup label="Skills">${so}</optgroup>` : ''}`;
    };

    const allActors    = game.actors.contents;
    const allActorData = {};
    for (const a of allActors) {
      const srcs = buildSources(a);
      allActorData[a.id] = { name: a.name, sources: srcs, firstVal: srcs[0]?.value ?? 4 };
    }

    const defaultAtkId   = defaultActor.id;
    const defaultAtkData = allActorData[defaultAtkId];
    const otherActors    = allActors.filter(a => a.id !== defaultAtkId);
    const defaultOppId   = otherActors[0]?.id ?? 'other';
    const defaultOppData = defaultOppId !== 'other' ? allActorData[defaultOppId] : null;

    const atkActorOptions = allActors.map(a =>
      `<option value="${a.id}"${a.id === defaultAtkId ? ' selected' : ''}>${a.name}</option>`
    ).join('');
    const oppActorOptions = [
      '<option value="other">Other (manual)</option>',
      ...allActors.map(a => `<option value="${a.id}"${a.id === defaultOppId ? ' selected' : ''}>${a.name}</option>`),
    ].join('');

    let result = null;

    const ContestedDialog = class extends foundry.applications.api.DialogV2 {
      async _onRender(context, options) {
        await super._onRender(context, options);
        const el = this.element;

        el.querySelector('#atk-actor')?.addEventListener('change', (e) => {
          const data = allActorData[e.target.value];
          if (!data) return;
          el.querySelector('#atk-source').innerHTML = buildOptions(data.sources);
          el.querySelector('#atk-pool').value = data.firstVal ?? 4;
        });
        el.querySelector('#atk-source')?.addEventListener('change', (e) => {
          el.querySelector('#atk-pool').value = parseInt(e.target.value) || 1;
        });
        el.querySelector('#opp-actor')?.addEventListener('change', (e) => {
          const id  = e.target.value;
          const src = el.querySelector('#opp-source');
          const poo = el.querySelector('#opp-pool');
          if (id === 'other') {
            src.innerHTML = '<option value="4">Manual</option>';
            if (poo) poo.value = 4;
          } else {
            const data = allActorData[id];
            if (data) { src.innerHTML = buildOptions(data.sources); if (poo) poo.value = data.firstVal ?? 4; }
          }
        });
        el.querySelector('#opp-source')?.addEventListener('change', (e) => {
          el.querySelector('#opp-pool').value = parseInt(e.target.value) || 1;
        });
      }
    };

    const _side = (actorOptsHtml, defaultData, srcId, actorId, poolId, tnId, dmgId) => `
      <label style="display:block;margin-bottom:6px;font-size:12px;font-weight:bold">Actor:
        <select id="${actorId}" style="width:100%;margin-top:2px;font-weight:normal">${actorOptsHtml}</select>
      </label>
      <label style="display:block;margin-bottom:6px;font-size:12px">Pool source:
        <select id="${srcId}" style="width:100%;margin-top:2px">${defaultData ? buildOptions(defaultData.sources) : '<option value="4">Manual</option>'}</select>
      </label>
      <label style="display:block;margin-bottom:6px;font-size:12px">Pool:
        <input type="number" id="${poolId}" value="${defaultData?.firstVal ?? 4}" min="1" max="30" style="width:55px;margin-left:4px"/>
      </label>
      <label style="display:block;margin-bottom:6px;font-size:12px">TN:
        <input type="number" id="${tnId}" value="4" min="2" max="30" style="width:55px;margin-left:4px"/>
      </label>
      <label style="display:block;margin-bottom:0;font-size:12px">Damage:
        <input type="text" id="${dmgId}" value="4L" style="width:55px;margin-left:4px"/>
      </label>`;

    await new Promise(resolve => {
      new ContestedDialog({
        window: { title: 'Contested Roll Setup' },
        content: `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:8px 0">
            <div>${_side(atkActorOptions, defaultAtkData, 'atk-source', 'atk-actor', 'atk-pool', 'atk-tn', 'atk-damage')}</div>
            <div>${_side(oppActorOptions, defaultOppData, 'opp-source', 'opp-actor', 'opp-pool', 'opp-tn', 'opp-damage')}</div>
          </div>`,
        buttons: [
          {
            label: shiftKey ? '✏ Enter Successes' : 'Continue',
            action: 'confirm',
            default: true,
            callback: (_e, _b, dialog) => {
              const el       = dialog.element;
              const atkSrc   = el.querySelector('#atk-source');
              const oppSrc   = el.querySelector('#opp-source');
              const atkActId = el.querySelector('#atk-actor')?.value  ?? defaultAtkId;
              const oppActId = el.querySelector('#opp-actor')?.value  ?? 'other';
              result = {
                atkActorId:     atkActId,
                atkActorName:   game.actors.get(atkActId)?.name ?? 'Actor',
                atkSourceLabel: atkSrc?.options[atkSrc.selectedIndex]?.text ?? '',
                atkPool:   Math.max(1, parseInt(el.querySelector('#atk-pool')?.value)   || 4),
                atkTN:     Math.max(2, parseInt(el.querySelector('#atk-tn')?.value)     || 4),
                atkDamage: el.querySelector('#atk-damage')?.value.trim() || '4L',
                oppActorId:     oppActId === 'other' ? null : oppActId,
                oppActorName:   oppActId === 'other' ? 'Other' : (game.actors.get(oppActId)?.name ?? 'Other'),
                oppSourceLabel: oppSrc?.options[oppSrc.selectedIndex]?.text ?? '',
                oppPool:   Math.max(1, parseInt(el.querySelector('#opp-pool')?.value)   || 4),
                oppTN:     Math.max(2, parseInt(el.querySelector('#opp-tn')?.value)     || 4),
                oppDamage: el.querySelector('#opp-damage')?.value.trim() || '4L',
                physicalDice: shiftKey,
              };
              resolve();
            },
          },
          { label: 'Cancel', action: 'cancel', callback: () => resolve() },
        ],
      }).render(true);
    });

    if (!result) return;
    await SR3EActor.postContestedCard(result);
  }

  static async postContestedCard(ctx) {
    const payload = JSON.stringify(ctx).replace(/'/g, '&#39;');

    const INP = 'background:#1c2030;border:1px solid #3a9fd6;color:#dde1f0;border-radius:3px;padding:2px 5px;width:100%;box-sizing:border-box;';
    const _corner = (name, sourceLabel, pool, tn, damage, poolClass, tnClass, dmgClass, color) => `
      <div class="sr-melee-corner">
        <div class="sr-melee-name" style="color:${color}">${name}</div>
        ${sourceLabel ? `<div style="font-size:11px;color:#7880a0;margin-top:2px">${sourceLabel}</div>` : ''}
        <div class="sr-contested-fields" style="display:grid;grid-template-columns:52px 1fr;gap:4px 8px;align-items:center;margin-top:8px;font-size:11px;color:#7880a0;">
          <span>Pool</span>   <input type="number" class="${poolClass}" value="${pool}" min="1" max="30" style="${INP}"/>
          <span>TN</span>     <input type="number" class="${tnClass}"   value="${tn}"   min="2" max="30" style="${INP}"/>
          <span>Damage</span> <input type="text"   class="${dmgClass}"  value="${damage}"                style="${INP}"/>
        </div>
      </div>`;

    await ChatMessage.create({
      speaker: { alias: 'Contested Roll' },
      content: `
        <div class="sr-roll-card sr-melee-card">
          <div class="sr-roll-header">⚔ CONTESTED — ${ctx.atkActorName} vs ${ctx.oppActorName}</div>
          <div class="sr-melee-boxing">
            ${_corner(ctx.atkActorName, ctx.atkSourceLabel, ctx.atkPool, ctx.atkTN, ctx.atkDamage,
                      'sr-contested-atk-pool', 'sr-contested-atk-tn', 'sr-contested-atk-damage',
                      'var(--sr-accent)')}
            <div class="sr-melee-vs">VS</div>
            ${_corner(ctx.oppActorName, ctx.oppSourceLabel, ctx.oppPool, ctx.oppTN, ctx.oppDamage,
                      'sr-contested-opp-pool', 'sr-contested-opp-tn', 'sr-contested-opp-damage',
                      'var(--sr-red)')}
          </div>
          <div class="sr-soak-action">
            <button class="sr-contested-roll-btn" data-payload='${payload}'
                    title="Shift-click to enter successes manually">
              ${ctx.physicalDice ? '✏ Enter Successes' : '⚔ Roll!'}
            </button>
          </div>
        </div>`,
      style: CONST.CHAT_MESSAGE_STYLES.ROLL,
    });
  }

  // ---------------------------------------------------------------------------
  // STANDALONE RESIST DAMAGE
  // ---------------------------------------------------------------------------

  async resistDamagePrompt(shiftKey = false) {
    this.prepareDerivedData();
    const sys  = this.system;
    const attr = sys.attributes ?? {};

    const body  = attr.body?.value         ?? attr.body?.base         ?? 1;
    const qui   = attr.quickness?.value    ?? attr.quickness?.base    ?? 1;
    const str   = attr.strength?.value     ?? attr.strength?.base     ?? 1;
    const cha   = attr.charisma?.value     ?? attr.charisma?.base     ?? 1;
    const int_  = attr.intelligence?.value ?? attr.intelligence?.base ?? 1;
    const wil   = attr.willpower?.value    ?? attr.willpower?.base    ?? 1;
    const react = attr.reaction?.value     ?? 0;
    const mag   = attr.magic?.value        ?? attr.magic?.base        ?? 0;

    let ball = 0, imp = 0;
    if (this.type === 'vehicle') {
      ball = imp = attr.armor?.base ?? 0;
    } else {
      const armorItem = sys.equippedArmor ? this.items.get(sys.equippedArmor) : null;
      ball = armorItem?.system?.ballistic ?? 0;
      imp  = armorItem?.system?.impact    ?? 0;
    }

    const statOpts = [
      { label: `Body (${body})`,                                                    dice: body,          ad: 0        },
      { label: `Body + Ballistic Armour (${body} + ${ball} = ${body+ball})`,        dice: body + ball,   ad: ball     },
      { label: `Body + Impact Armour (${body} + ${imp} = ${body+imp})`,             dice: body + imp,    ad: imp      },
      { label: `Body + Ballistic + Impact (${body} + ${ball+imp} = ${body+ball+imp})`, dice: body+ball+imp, ad: ball+imp },
      { label: `Willpower (${wil})`,                                                dice: wil,           ad: 0        },
      { label: `Body + Willpower (${body + wil})`,                                  dice: body + wil,    ad: 0        },
      { label: `Intelligence (${int_})`,                                            dice: int_,          ad: 0        },
      { label: `Quickness (${qui})`,                                                dice: qui,           ad: 0        },
      { label: `Strength (${str})`,                                                 dice: str,           ad: 0        },
      { label: `Charisma (${cha})`,                                                 dice: cha,           ad: 0        },
      { label: `Reaction (${react})`,                                               dice: react,         ad: 0        },
    ];
    if (mag > 0) statOpts.push({ label: `Magic (${mag})`, dice: mag, ad: 0 });

    const optHtml = statOpts.map((o, i) =>
      `<option value="${i}" data-dice="${o.dice}" data-ad="${o.ad}">${o.label}</option>`
    ).join('');

    let config = null;

    const ResistDialog = class extends foundry.applications.api.DialogV2 {
      async _onRender(context, options) {
        await super._onRender(context, options);
        const el       = this.element;
        const statSel  = el.querySelector('#rd-stat');
        const dmgInput = el.querySelector('#rd-dmg');
        const diceInp  = el.querySelector('#rd-dice');
        const tnInp    = el.querySelector('#rd-tn');

        const recalc = () => {
          const sel  = statSel.selectedOptions[0];
          const ad   = parseInt(sel?.dataset.ad   ?? 0);
          const dice = parseInt(sel?.dataset.dice ?? 1);
          const pwr  = parseInt(dmgInput.value) || 0;
          diceInp.value = dice;
          if (pwr > 0) tnInp.value = Math.max(2, pwr - ad);
        };

        statSel.addEventListener('change', recalc);
        dmgInput.addEventListener('input', recalc);
      }
    };

    await new Promise(resolve => {
      new ResistDialog({
        window: { title: `${this.name} — Resist Damage` },
        content: `
          <div style="padding:8px 0">
            <div style="margin-bottom:10px">
              <label style="font-size:12px">Damage code (e.g. <em>9M</em>, <em>12S Stun</em>):
                <input type="text" id="rd-dmg" value="" placeholder="9M" style="width:80px;margin-left:8px"/>
              </label>
            </div>
            <div style="margin-bottom:10px">
              <label style="display:block;font-size:12px">Resist pool:
                <select id="rd-stat" style="width:100%;margin-top:4px">${optHtml}</select>
              </label>
            </div>
            <div style="display:flex;gap:16px;align-items:center;margin-bottom:4px">
              <label style="font-size:12px">Dice:
                <input type="number" id="rd-dice" value="${statOpts[0].dice}" min="1" max="50"
                       style="width:55px;margin-left:4px"/>
              </label>
              <label style="font-size:12px">TN:
                <input type="number" id="rd-tn" value="4" min="2" max="30"
                       style="width:55px;margin-left:4px"/>
              </label>
              <label style="font-size:12px">
                <input type="checkbox" id="rd-stun"/> Stun track
              </label>
            </div>
          </div>
        `,
        buttons: [
          {
            label: shiftKey ? '✏ Enter Successes' : '🎲 Roll',
            action: 'roll',
            default: true,
            callback: (_e, _b, dialog) => {
              const el2    = dialog.element;
              const code   = (el2.querySelector('#rd-dmg')?.value.trim() || '4M').toUpperCase();
              const parsed = game.sr3e.SR3EItem.parseDamageCode(code, this);
              config = {
                dice:   Math.max(1, parseInt(el2.querySelector('#rd-dice')?.value) || 1),
                tn:     Math.max(2, parseInt(el2.querySelector('#rd-tn')?.value)   || 4),
                isStun: el2.querySelector('#rd-stun')?.checked || (parsed?.isStun ?? false),
                power:  parsed?.power ?? (parseInt(code) || 4),
                level:  parsed?.level ?? 'M',
                code,
              };
              resolve();
            },
          },
          { label: 'Cancel', action: 'cancel', callback: () => resolve() },
        ],
      }).render(true);
    });

    if (!config) return;

    const trackLabel = config.isStun ? 'Stun' : 'Physical';
    await this.rollPool(config.dice, config.tn, `🛡 ${this.name} resists ${config.code} ${trackLabel}`, {
      isSoakRoll:  true,
      soakPayload: {
        actorId:     this.id,
        stagedPower: config.power,
        stagedLevel: config.level,
        isStun:      config.isStun,
        rawDamage:   config.code,
      },
      physicalDice: shiftKey,
    });
  }

  static async handleContestedRoll(btn, physicalDice = false) {
    const ctx         = JSON.parse(btn.dataset.payload);
    const usePhysical = physicalDice || (ctx.physicalDice ?? false);
    const card        = btn.closest('.sr-melee-card');

    btn.disabled    = true;
    btn.textContent = '⏳ Rolling…';

    const atkPool   = Math.max(1, parseInt(card.querySelector('.sr-contested-atk-pool')?.value)   || ctx.atkPool);
    const oppPool   = Math.max(1, parseInt(card.querySelector('.sr-contested-opp-pool')?.value)   || ctx.oppPool);
    const atkTN     = Math.max(2, parseInt(card.querySelector('.sr-contested-atk-tn')?.value)     || ctx.atkTN);
    const oppTN     = Math.max(2, parseInt(card.querySelector('.sr-contested-opp-tn')?.value)     || ctx.oppTN);
    const atkDamage = card.querySelector('.sr-contested-atk-damage')?.value.trim() || ctx.atkDamage;
    const oppDamage = card.querySelector('.sr-contested-opp-damage')?.value.trim() || ctx.oppDamage;

    const atkActor = game.actors.get(ctx.atkActorId);
    const oppActor = ctx.oppActorId ? game.actors.get(ctx.oppActorId) : null;
    if (!atkActor) return;

    let atkDice, oppDice;
    if (usePhysical) {
      const atkSuccesses = await SR3EActor._promptPhysicalSuccesses(atkPool, atkTN, `⚔ ${ctx.atkActorName}`);
      if (atkSuccesses === null) { btn.disabled = false; btn.textContent = 'Roll'; return; }
      const oppSuccesses = await SR3EActor._promptPhysicalSuccesses(oppPool, oppTN, `⚔ ${ctx.oppActorName}`);
      if (oppSuccesses === null) { btn.disabled = false; btn.textContent = 'Roll'; return; }
      atkDice = SR3EActor._buildPhysicalDice(atkPool, atkSuccesses);
      oppDice = SR3EActor._buildPhysicalDice(oppPool, oppSuccesses);
    } else {
      atkDice = atkActor._rollWave(atkPool, atkTN, true);
      oppDice = atkActor._rollWave(oppPool, oppTN, true);
    }

    const updatedCtx = { ...ctx, atkPool, oppPool, atkTN, oppTN, atkDamage, oppDamage };

    const atkOnes   = atkDice.filter(d => d.isOne).length;
    const oppOnes   = oppDice.filter(d => d.isOne).length;
    const atkGlitch = atkOnes > Math.floor(atkPool / 2);
    const oppGlitch = oppOnes > Math.floor(oppPool / 2);

    await atkActor._postWaveCard({
      actorId: ctx.atkActorId, label: `⚔ ${ctx.atkActorName}`,
      tn: atkTN, pool: atkPool, wave: 0,
      dice: atkDice, ones: atkOnes, glitch: atkGlitch,
      physicalDice: usePhysical, physicalSuccesses: usePhysical ? atkDice.filter(d => d.success).length : undefined,
      isWeaponRoll: false, isMeleeAtk: true, meleeCtx: updatedCtx,
    });

    const oppCardActorId = oppActor ? ctx.oppActorId : ctx.atkActorId;
    await atkActor._postWaveCard({
      actorId: oppCardActorId, label: `⚔ ${ctx.oppActorName}`,
      tn: oppTN, pool: oppPool, wave: 0,
      dice: oppDice, ones: oppOnes, glitch: oppGlitch,
      physicalDice: usePhysical, physicalSuccesses: usePhysical ? oppDice.filter(d => d.success).length : undefined,
      isWeaponRoll: false, isMeleeDef: true, meleeCtx: updatedCtx,
    });

    await SR3EActor._postContestedResult(updatedCtx, atkDice, oppDice);
  }

  static async _postContestedResult(ctx, atkDice, oppDice) {
    const atkSuccesses = atkDice.filter(d => d.success).length;
    const oppSuccesses = oppDice.filter(d => d.success).length;
    const net          = Math.abs(atkSuccesses - oppSuccesses);

    let resultHtml;

    if (atkSuccesses === oppSuccesses) {
      resultHtml = `
        <div class="sr-melee-result sr-melee-tie">
          🤝 Tie! ${atkSuccesses} vs ${oppSuccesses} — no effect.
        </div>`;
    } else {
      const winnerIsAtk  = atkSuccesses > oppSuccesses;
      const winnerName   = winnerIsAtk ? ctx.atkActorName : ctx.oppActorName;
      const loserName    = winnerIsAtk ? ctx.oppActorName : ctx.atkActorName;
      const winnerId     = winnerIsAtk ? ctx.atkActorId   : ctx.oppActorId;
      const loserId      = winnerIsAtk ? ctx.oppActorId   : ctx.atkActorId;
      const winnerDamage = winnerIsAtk ? ctx.atkDamage    : ctx.oppDamage;

      const winnerActor  = winnerId ? game.actors.get(winnerId) : null;
      const winnerDmgBase = SR3EItem.parseDamageCode(winnerDamage ?? '4L', winnerActor);

      let stagingHtml = '';
      let soakBtn     = '';

      if (winnerDmgBase) {
        const staged     = SR3EItem.stageDamage(winnerDmgBase, net);
        const trackLabel = staged.isStun ? 'Stun' : 'Physical';

        if (net === 0) {
          stagingHtml = `<div class="sr-staging-result">${winnerDamage} — tie in net, no stage up → <strong>${staged.power}${staged.level} ${trackLabel}</strong></div>`;
        } else {
          stagingHtml = `<div class="sr-staging-result">📊 ${winnerDamage} + ${net} net hit${net !== 1 ? 's' : ''} → <strong>${staged.power}${staged.level} ${trackLabel}</strong></div>`;
        }

        if (loserId) {
          const soakPayload = JSON.stringify({
            attackerActorId: winnerId,
            targetActorId:   loserId,
            isMelee:         false,
            stagedPower:     staged.power,
            stagedLevel:     staged.level,
            isStun:          staged.isStun,
            rawDamage:       winnerDamage,
          }).replace(/'/g, '&#39;');
          soakBtn = `
            <div class="sr-soak-action">
              <button class="sr-soak-btn" data-payload='${soakPayload}'>
                🛡 ${loserName}: Resist Damage
              </button>
            </div>`;
        }
      }

      resultHtml = `
        <div class="sr-melee-result sr-melee-win">
          ⚔ ${winnerName} wins! ${atkSuccesses} vs ${oppSuccesses} (net ${net})
        </div>
        ${stagingHtml}
        ${soakBtn}`;
    }

    await ChatMessage.create({
      speaker: { alias: 'Contested Result' },
      content: `
        <div class="sr-roll-card sr-melee-card">
          <div class="sr-roll-header">⚔ ${ctx.atkActorName} vs ${ctx.oppActorName} — Result</div>
          ${resultHtml}
        </div>`,
      style: CONST.CHAT_MESSAGE_STYLES.ROLL,
    });
  }
}