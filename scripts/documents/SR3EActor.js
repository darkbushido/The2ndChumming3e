import { SR3EItem } from './SR3EItem.js';
import { parseMods } from '../SR3EMods.js';

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
    } else if (this.type === 'ward') {
      this._prepareWard(sys);
    }
  }

  _prepareWard(sys) {
    sys.maxForce = Math.max(1, sys.maxForce ?? 1);
    sys.damage   = Math.max(0, Math.min(sys.maxForce, sys.damage ?? 0));
    sys.force    = Math.max(0, sys.maxForce - sys.damage);
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
    // Orthodox SR3 (SR3 Core p.223): Blue=1d6 Green=2d6 Orange=3d6 Red=4d6
    // Defragged uses hostSecurityTier; orthodox uses linked host's orthodoxSecurityCode.
    const isOrthodox = (() => { try { return game.settings.get('The2ndChumming3e', 'matrixRuleset') === 'orthodox'; } catch { return false; } })();
    if (isOrthodox) {
      const hostActor = (sys.activeHostId) ? game.actors?.get(sys.activeHostId) : null;
      const secCode   = hostActor?.system?.orthodoxSecurityCode ?? 'Green';
      const tierDice  = { Blue: 1, Green: 2, Orange: 3, Red: 4 };
      sys.derived.initiativeDice = tierDice[secCode] ?? 2;
    } else {
      // Matrix Defragged: tier drives dice count
      const tierDice = { Ivory: 0, Blue: 1, Green: 2, Orange: 3, Red: 4, Black: 4, Ultraviolet: 4 };
      sys.derived.initiativeDice = tierDice[sys.hostSecurityTier ?? 'Green'] ?? 2;
    }
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
      hackPoolAvail = Math.min(d.availableHackingPool ?? d.hackingPool ?? 0, def.poolCap);
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
                     skillClass, poolClass, tnClass, dmgClass, role, owner) => `
      <div class="sr-melee-corner"
           data-corner-role="${role}" data-corner-owner="${owner ?? ''}" data-corner-label="${name}">
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
        <div class="sr-roll-card sr-melee-card" data-twocorner="cybercombat">
          <div class="sr-roll-header">💻 CYBERCOMBAT — ${atk.name} vs ${def.name}</div>
          <div class="sr-melee-boxing">
            ${_corner(atk.name, ctx.atkLabel, ctx.atkSkillName, ctx.atkSkillDice, ctx.atkHackPoolAvail, ctx.atkTN,
                      ctx.atkDamageCode, ctx.atkFirewall, ctx.atkSoakPool, ctx.atkUserMode ?? '',
                      'sr-cc-atk-skill', 'sr-cc-atk-pool', 'sr-cc-atk-tn', 'sr-cc-atk-dmg',
                      'attacker', ctx.attackerActorId)}
            <div class="sr-melee-vs">VS</div>
            ${_corner(def.name, ctx.defLabel, ctx.defSkillName, ctx.defSkillDice, ctx.defHackPoolAvail, ctx.defTN,
                      ctx.defDamageCode, ctx.defFirewall, ctx.defSoakPool, ctx.defUserMode ?? '',
                      'sr-cc-def-skill', 'sr-cc-def-pool', 'sr-cc-def-tn', 'sr-cc-def-dmg',
                      'defender', ctx.defenderActorId)}
          </div>
          ${SR3EActor.cornerActions(payload, [
            { role: 'attacker', label: atk.name, owner: ctx.attackerActorId },
            { role: 'defender', label: def.name, owner: ctx.defenderActorId },
          ])}
        </div>`,
      style: CONST.CHAT_MESSAGE_STYLES.ROLL,
    });
  }

  static async handleCybercombatRoll(btn) {
    const ctx  = JSON.parse(btn.dataset.payload);
    const card = btn.closest('.sr-melee-card');

    btn.disabled    = true;
    btn.textContent = '⏳ Rolling…';

    // Each side's own submission first, this card's DOM only as a fallback (TODO 24).
    const sub = SR3EActor.meleeSubmissions(btn);
    const f   = (role, cls) => SR3EActor.cornerField(sub, role, cls, card);

    const atkSkillDice = parseInt(f('attacker', 'sr-cc-atk-skill')) || ctx.atkSkillDice || 1;
    const defSkillDice = parseInt(f('defender', 'sr-cc-def-skill')) || ctx.defSkillDice || 1;
    const atkHackPool  = parseInt(f('attacker', 'sr-cc-atk-pool'))  || 0;
    const defHackPool  = parseInt(f('defender', 'sr-cc-def-pool'))  || 0;
    const atkTN        = SR3EActor.cornerTN(f('attacker', 'sr-cc-atk-tn'), ctx.atkTN);
    const defTN        = SR3EActor.cornerTN(f('defender', 'sr-cc-def-tn'), ctx.defTN);
    const atkDmgCode   = String(f('attacker', 'sr-cc-atk-dmg') ?? '').trim() || ctx.atkDamageCode;
    const defDmgCode   = String(f('defender', 'sr-cc-def-dmg') ?? '').trim() || ctx.defDamageCode;
    const atkDmgBase   = SR3EItem.parseDamageCode(atkDmgCode) ?? ctx.atkDamageBase;
    const defDmgBase   = SR3EItem.parseDamageCode(defDmgCode) ?? ctx.defDamageBase;

    const atkActor = game.actors.get(ctx.attackerActorId);
    const defActor = game.actors.get(ctx.defenderActorId);
    if (!atkActor || !defActor) return;

    /**
     * Charge Hacking Pool, and roll only what was actually paid for.
     *
     * ⚠ Three separate bugs lived here, and each one favoured the same side.
     *
     * 1. **The defender was never charged at all.** Only the attacker's pool was spent, so
     *    a defending decker drew free Hacking Pool dice every exchange, for ever. Same
     *    family as TODO 43.
     * 2. **Over-allocation rolled free dice.** The pool was built from the raw field while
     *    the spend was clamped to what the actor had, so typing 99 rolled 99 and paid for
     *    whatever was available.
     * 3. **The write bypassed the GM.** It was a bare `actor.update`, but resolution runs on
     *    whichever client completed the pair — routinely NOT the owner of the other side.
     *    `spendHackingPool` goes through `sr3e.pool.spend`, exactly as `spendCombatPool`
     *    does for melee, and is queued per-actor so two cards cannot race.
     *
     * IC and agents have no Hacking Pool (`hackPoolAvail` 0), so they simply spend nothing.
     */
    const _spend = async (actor, want) => {
      if (want <= 0) return 0;
      if (actor.type !== 'character' && actor.type !== 'npc') return 0;
      return await actor.spendHackingPool(want);   // returns what was ACTUALLY deducted
    };
    const atkSpent = await _spend(atkActor, atkHackPool);
    const defSpent = await _spend(defActor, defHackPool);

    const atkPool = Math.max(1, atkSkillDice + atkSpent);
    const defPool = Math.max(1, defSkillDice + defSpent);

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
    const atkGlitch = SR3EActor.isRuleOfOne(atkOnes, atkPool);
    const defGlitch = SR3EActor.isRuleOfOne(defOnes, defPool);

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
      availHackPool = Math.min(d.availableHackingPool ?? d.hackingPool ?? 0, def.poolCap);
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

    // Roll what the pool granted — spendHackingPool clamps, and discarding its return
    // rolled dice that were never paid for. See handleMeleeRoll.
    const ccSpent = hackPoolDice > 0 ? await this.spendHackingPool(hackPoolDice) : 0;
    if (ccSpent !== hackPoolDice) {
      ui.notifications.warn(`${this.name}: only ${ccSpent} of ${hackPoolDice} Hacking Pool dice were available.`);
    }
    const pool = ccRating + ccSpent;
    if (pool < 1) { ui.notifications.warn(`${item.name}: roll pool is 0.`); return; }

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
      availHackPool = Math.min(d.availableHackingPool ?? d.hackingPool ?? 0, def.poolCap);
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

    const hackSpent = hackPoolDice > 0 ? await this.spendHackingPool(hackPoolDice) : 0;
    if (hackSpent !== hackPoolDice) {
      ui.notifications.warn(`${this.name}: only ${hackSpent} of ${hackPoolDice} Hacking Pool dice were available.`);
    }
    const pool = hackRating + hackSpent;
    if (pool < 1) { ui.notifications.warn('Hacking pool is 0.'); return; }

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
      availHackPool = Math.min(d.availableHackingPool ?? d.hackingPool ?? 0, def.poolCap);
      skillNote     = ` <span style="color:var(--sr-amber)">(${def.label})</span>`;
    } else {
      skillRating   = (skill.system.rating ?? 0) + SR3EItem._skillBonusDice(this, skill);
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

    const npSpent = hackPoolDice > 0 ? await this.spendHackingPool(hackPoolDice) : 0;
    if (npSpent !== hackPoolDice) {
      ui.notifications.warn(`${this.name}: only ${npSpent} of ${hackPoolDice} Hacking Pool dice were available.`);
    }
    const pool = skillRating + npSpent;
    if (pool < 1) { ui.notifications.warn(`${promptName}: roll pool is 0.`); return; }

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
  let wm        = sys.woundMod ?? 0;
  const isAdept = (sys.magicType ?? '') === 'Adept';

  /**
   * Bonus dice granted to a NAMED skill, summed across every source: `{ skillName → dice }`.
   *
   * Deliberately source-agnostic. Adept Improved Ability populates it today; cyberware and
   * bioware that boost a specific skill are meant to feed the same map, so that consumers —
   * the roll paths and the sheet's bonus column — never need to know where a die came from.
   *
   * Gate contributions HERE, at the point of derivation, not at the point of use. A reader
   * that re-checks `isAdept` can only produce one outcome: a value present in the map that
   * is silently dropped on the way to the dice. Consumers must trust this map.
   */
  const skillBonusDice = {};
  // ⚠ The same dice, keyed the same way, but remembering WHO GAVE THEM. `skillBonusDice` is a
  // flat total, so by the time anything renders "+6 augmentation" there is no way to say which
  // items made the 6 — asked in play 2026-08-21 and unanswerable without this. Consumers that
  // only need the number keep using the flat map; anything explaining itself reads this.
  const skillBonusSources = {};
  const _addSkillDice = (name, dice, label, meta = {}) => {
    const key = (name ?? '').trim();
    if (!key || !dice) return;
    skillBonusDice[key] = (skillBonusDice[key] ?? 0) + dice;
    // ⚠ `note` and `kind` are structured, not baked into the label. An earlier version
    // appended "(capped at 4 — p.169)" to the label string, which reads fine in one place and
    // is unusable everywhere else — the card wants the note on its own line, the ⓘ dialog
    // wants it in its own column, and neither can get it back out of a sentence.
    (skillBonusSources[key] ??= []).push({
      label: label ?? 'augmentation', dice,
      kind: meta.kind ?? 'augmentation',   // 'adept' | 'cyber' | 'bio' | 'augmentation'
      note: meta.note ?? null,             // why this number is what it is
    });
  };

  // Category-wide bonuses are a SEPARATE list, not entries in the map above. The map is
  // applied automatically everywhere; these are offered as a checkbox on the Roll Skill
  // dialog, because the rule they exist for (Enhanced Articulation, M&M p.66) has a clause
  // — "physical use of Vehicle Skills" — that no amount of sheet data can settle.
  // See SR3EActor.skillCategoryBonus.
  const skillCategoryBonuses = [];
  const _addSkillCategory = (label, raw, dice) => {
    const categories = SR3EActor.parseSkillCategories(raw);
    if (!categories.length || !dice) return;
    skillCategoryBonuses.push({ label, dice, categories });
  };

  /* ⚠ Declared ABOVE the cyber/bio loop, not with the adept block that first used them.
   * Since TODO 30 the cyber/bio loop feeds these too, and leaving them below it is a
   * temporal-dead-zone error the moment anything there touches one. */
  /**
   * Bonuses scoped to a SITUATION rather than to a skill or a category — TODO 70.
   *
   * `{ label, situation, dice, tn, pool }`. The third and last bonus channel: `skillBonusDice`
   * promises "always applies" and `skillCategoryBonuses` is opt-in per roll, and neither can
   * say *"these dice can only be used for counterattacks"* (MITS p.149) or *"these dice do not
   * apply to any other type of Reaction Test"* (p.151). A flow that knows its situation claims
   * the matching bonuses; everything else offers them as a checkbox.
   */
  const situationalBonuses = [];
  /** Triggered cyber/bioware — every one the actor owns, active or not (TODO 30). */
  const triggeredAugs = [];
  /** Adept powers whose rule the system states but cannot resolve — surfaced on the sheet. */
  const adeptNotes = [];

  // Cyber/bio augmentation bonuses — summed from all cyberware and bioware items
  const cyberBonus = { bod: 0, qui: 0, str: 0, cha: 0, int: 0, wil: 0, rea: 0, initDice: 0,
                       reaNotRigDeck: 0, quiNotForReaction: 0 };
  const _sr3e = globalThis.game?.sr3e?.SR3E ?? null;
  /** Items that forbid other Reaction/Initiative enhancement, and the ones that conflict. */
  const reactionExclusiveItems = [];
  const otherReactionEnhancers = [];
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
    // ⚠ Enhanced Articulation's +1 Reaction does not apply to rigging or decking (M&M p.66),
    // so the portion of `rea` that comes from such items is tracked SEPARATELY rather than
    // subtracted later by name — by the time initiative is rolled the items are long gone.
    if ((s.bonusRea ?? 0) !== 0
      && (globalThis.game?.sr3e?.SR3E?.reactionNotForRigOrDeck ?? [])
        .some(re => re.test(item.name ?? ''))) {
      cyberBonus.reaNotRigDeck += s.bonusRea ?? 0;
    }

    /* ── Move-by-Wire · M&M p.60 (TODO 4) ─────────────────────────────────────────────
     *
     * "The Quickness bonus does not count when calculating the character's Reaction
     * Attribute." Move-by-wire is a passive implant, so unlike the Adrenal Pump this cannot be
     * fixed by applying it later — the excluded portion is tracked and subtracted below.
     */
    if ((s.bonusQui ?? 0) !== 0
      && (_sr3e?.quicknessNotForReaction ?? []).some(re => re.test(item.name ?? ''))) {
      cyberBonus.quiNotForReaction += s.bonusQui ?? 0;
    }
    // "not compatible with any other Reaction- or Initiative-enhancing cyber- or bioware"
    if ((_sr3e?.reactionExclusive ?? []).some(re => re.test(item.name ?? ''))) {
      reactionExclusiveItems.push(item.name);
    } else if ((s.bonusRea ?? 0) !== 0 || (s.bonusInitDice ?? 0) !== 0) {
      otherReactionEnhancers.push(item.name);
    }
    // Named-skill dice, e.g. move-by-wire's "+N dice for Athletics and Stealth Tests".
    for (const e of (_sr3e?.augmentationSkillDice ?? [])) {
      if (!e.match.test(item.name ?? '')) continue;
      const rating = Number(/\[(\d+)\]/.exec(item.name ?? '')?.[1] ?? s.rating ?? 1) || 1;
      for (const skill of e.skills) {
        _addSkillDice(skill, (e.perRating ?? 1) * rating, item.name,
          { kind: item.type === 'bioware' ? 'bio' : 'cyber' });
      }
    }
    cyberBonus.initDice += s.bonusInitDice ?? 0;
    // Skill-specific augmentation dice. No item populates `improvedSkillName` yet — the
    // bonus fields are still being imported — but the channel is open, so an entry that
    // gains one starts working with no change to any roll path or to the sheet.
    _addSkillDice(s.improvedSkillName, s.improvedSkillDice ?? 0, item.name,
      { kind: item.type === 'bioware' ? 'bio' : 'cyber' });
    _addSkillCategory(item.name, s.improvedSkillCategory, s.improvedSkillDice ?? 0);

    /* ── Cyber/bioware that is switched on, or scoped to a situation · TODO 30 ──────── */
    const _cfg = globalThis.game?.sr3e?.SR3E ?? {};
    // Situational: the same channel the adept powers use. Nothing new was needed.
    for (const e of (_cfg.augmentationEffects ?? [])) {
      if (!e.match.test(item.name ?? '')) continue;
      if (e.note) adeptNotes.push({ label: item.name, note: e.note });
      if (e.situation && (e.dice || e.tn)) {
        situationalBonuses.push({ label: item.name, situation: e.situation,
          dice: e.dice ?? 0, tn: e.tn ?? 0, pool: 0 });
      }
    }
    // Triggered: collected whether active or not, so the sheet can offer the control.
    for (const t of (_cfg.triggeredAugmentations ?? [])) {
      if (!t.match.test(item.name ?? '')) continue;
      // Level from the bracketed number the packs use — "Adrenal Pump [2](trig)".
      const lvl   = Number(/\[(\d+)\]/.exec(item.name ?? '')?.[1] ?? 1) || 1;
      const state = sys.augmentations?.[item.id] ?? {};
      const on    = t.kind === 'toggle' ? state.active === true : (state.turns ?? 0) > 0;
      triggeredAugs.push({ id: item.id, name: item.name, cfg: t, level: lvl,
                           active: on, turns: state.turns ?? 0 });
      if (t.note) adeptNotes.push({ label: item.name, note: t.note });
    }
  }

  // Adept power bonuses — summed from all adeptpower items
  const adeptBonus    = { bod: 0, qui: 0, str: 0, cha: 0, int: 0, wil: 0, mag: 0, rea: 0, initDice: 0 };
  // Improved Ability is resolved LATER, not here: its cap is against effective Magic
  // (p.169), and Magic is not derived until Essence and Bio Index are known, well below.
  // Collect the raw claims now; a second pass past the Magic derivation applies the cap.
  const pendingImprovedAbility = [];
  /** Powers whose level exceeds Magic (p.168). Reported on the sheet, never clamped. */
  const overLevelled = [];
  // ⚠ The BASE Magic, deliberately. This cap is about what the character may have BOUGHT,
  // which does not shrink when Essence or a bio index temporarily suppresses effective Magic
  // — that is Magic loss, and the book handles it by making the adept give powers up, not by
  // retroactively invalidating the sheet.
  const magicForCaps = attr.magic?.base ?? 0;
  /** Extra COMBAT POOL dice (Combat Sense, p.169) — not skill dice, so not the map above. */
  let adeptCombatPool = 0;
  /** Pain Resistance levels (p.170) — offsets the wound modifier, resolved further down. */
  let painResistance = 0;
  /** Mystic Armor levels (p.170) — Impact armour, cumulative with worn. */
  let mysticArmor = 0;
  /** Killing Hands: the purchased Damage Level, or null. Declared per attack (p.170). */
  let killingHands = null;
  let missileParry = false;
  /** Penetrating Strike levels (SOTA2 p.67) — reduces the TARGET's Impact armour. */
  let penetratingStrike = 0;
  if (isAdept) {
    // ⚠ `globalThis.game`, not bare `game` — an undeclared identifier is a ReferenceError,
    // which optional chaining does NOT rescue. The unit tests call this with no Foundry
    // globals at all, and `game?.x` throws there just as loudly as `game.x`.
    const kindOf = globalThis.game?.sr3e?.SR3E?.adeptPowerKind;
    for (const item of (this.items ?? [])) {
      if (item.type !== 'adeptpower') continue;
      const s    = item.system;
      const lvl  = s.hasLevels ? (s.level ?? 1) : 1;
      const kind = kindOf ? kindOf(item.name) : 'other';

      // ⚠ **A levelled power's bonus is PER LEVEL** — *"Each level of this power increases
      // the Attribute by 1"* (p.169), and the upstream `Mods` string stores `+1STR` for a
      // power with `hasLevels: true`. Multiplying was missing until 2026-08-29, so Improved
      // Physical Attribute 3 would have granted +1 rather than +3 the moment the pack data
      // landed. Powers with fixed levels (Improved Reflexes 1/2/3) ship as separate items
      // with `hasLevels: false` and absolute values, so `lvl` is 1 and they are unaffected.
      const mul = n => (n ?? 0) * lvl;

      if (kind === 'attributeBoost') {
        // ⚠ **Attribute Boost contributes NOTHING passively, by design** — TODO 63.
        //
        // It is activated with a Magic Test, lasts a number of Combat Turns equal to the
        // successes, and costs Drain when it lapses (p.168-169). Letting it through this
        // branch would make it permanent, always-on, untested and undrained, AND would stack
        // with the cyberware the power is expressly incompatible with. The live boost is
        // applied from `system.attributeBoost` further down.
        //
        // The shipped packs carry no `Mods` for these, so today this guard changes nothing.
        // It exists so that an upstream edit, or a GM filling the bonus boxes by hand, cannot
        // quietly turn the power into a permanent buff.
        continue;
      }

      adeptBonus.bod      += mul(s.bonusBod);
      adeptBonus.qui      += mul(s.bonusQui);
      adeptBonus.str      += mul(s.bonusStr);
      adeptBonus.cha      += mul(s.bonusCha);
      adeptBonus.int      += mul(s.bonusInt);
      adeptBonus.wil      += mul(s.bonusWil);
      adeptBonus.mag      += mul(s.bonusMag);
      adeptBonus.rea      += mul(s.bonusRea);
      adeptBonus.initDice += mul(s.bonusInitDice);

      // Improved Ability: a levelled power grants dice equal to its level, otherwise 1.
      // The label carries the level too — a bare "Improved Ability" beside 6 dice explains
      // nothing. Deferred so the p.169 cap can see Magic; see `pendingImprovedAbility`.
      if (s.improvedSkillName) {
        // ⚠ **Every adept power that names a skill is capped**, not only the ones whose name
        // the classifier recognises. `improvedSkillName` on an adept power IS Improved
        // Ability — no other adept power grants dice to a *named skill*; the rest grant them
        // to a KIND of test (TODO 70), which this field cannot express.
        //
        // Gating the cap on `adeptPowerKind` was the first cut, and it would have made a
        // rules limit depend on name-matching against four packs that spell the power four
        // ways. A rename upstream would then un-cap it silently — failing in the direction
        // that hands out dice the rules forbid, which is the defect this whole item exists
        // to remove.
        //
        // ⚠ Cyber/bioware use the same field and are NOT capped: p.169 is an adept rule.
        // That branch is above and untouched.
        pendingImprovedAbility.push({
          skill: s.improvedSkillName,
          level: lvl,
          label: s.hasLevels ? `${item.name} ${lvl}` : item.name,
        });
      }
      /* ⚠ **Improved Ability may NOT use the category channel** · SR3 p.169 (TODO 62)
       *
       * The power applies to *"a specific Active Skill"*. The pack names invite the opposite
       * reading — `Imp Abl Combat Skl*->` looks like a scope — but the book's **Improved
       * Ability Costs Table** uses the category only to set the COST PER DIE (Physical .25,
       * Combat .5), and the trailing `->` is the upstream generator's marker for "name the
       * skill here". Left open, `Imp Abl Combat Skl` with category `Combat skills` buys dice
       * across every combat skill for half a Power Point.
       *
       * The channel itself stays — it is right for genuinely category-wide powers — so this
       * excludes one kind of power rather than removing the feature.
       */
      if (kind !== 'improvedAbility') {
        _addSkillCategory(item.name, s.improvedSkillCategory, lvl);
      }

      /* ── What the power actually DOES · TODO 66-70 ──────────────────────────────
       *
       * ⚠ `effectLvl` is NOT `lvl`. Nineteen shipped powers carry their level in the NAME
       * with `hasLevels: false` and `level: 1` — Combat Sense +3, Kinesics Level 3,
       * Penetrating Strike Level 2 — so reading `system.level` makes every one of them
       * level 1. `lvl` stays correct for Power Point cost, where a fixed-level item's cost
       * already covers its level; the two must not be conflated.
       */
      // ⚠ Checked against `lvl` (the power's own level), not `effectLvl`. p.168 limits the
      // LEVELS an adept may have in a power, and a fixed-level item like `Imp. Reflexes
      // Level 3` is one purchase, not three levels of a levelled power.
      if (s.hasLevels && lvl > magicForCaps) overLevelled.push({ name: item.name, level: lvl });
      const effectLvl = globalThis.game?.sr3e?.SR3E?.adeptPowerLevel?.(item.name, s) ?? lvl;
      const eff = globalThis.game?.sr3e?.SR3E?.adeptPowerEffect?.(item.name, effectLvl) ?? null;
      if (eff) {
        if (eff.note) adeptNotes.push({ label: item.name, note: eff.note });
        adeptCombatPool += eff.situation ? 0 : (eff.pool ?? 0);
        if (eff.situation && (eff.dice || eff.tn || eff.pool)) {
          situationalBonuses.push({
            label: item.name, situation: eff.situation,
            dice: eff.dice ?? 0, tn: eff.tn ?? 0, pool: eff.pool ?? 0,
            // Enhanced Perception is capped at min(Intelligence, Magic) exactly as Improved
            // Ability is capped (p.169). Resolved with the others, once Magic is known.
            capBy: eff.capBy ?? null,
          });
        }
      }

      // Direct effects — each changes a specific derived number rather than granting dice.
      switch (kind === 'other' ? SR3EActor._directPowerKind(item.name) : null) {
        case 'painResistance':    painResistance    += effectLvl; break;
        case 'mysticArmor':       mysticArmor       += effectLvl; break;
        case 'penetratingStrike': penetratingStrike += effectLvl; break;
        case 'killingHands':      killingHands = SR3EActor.killingHandsLevel(item.name) ?? killingHands; break;
        // Cost 1, no levels — a capability, not a quantity (p.170).
        case 'missileParry':      missileParry = true; break;
        default: break;
      }
    }
  }

  /* ── Pain Resistance · SR3 p.170 (TODO 69) ────────────────────────────────────────
   *
   * > "Subtract your level of Pain Resistance from your current damage before determining
   * > your injury modifiers."
   *
   * ⚠ Recomputed HERE rather than in `prepareDerivedData`, because the level is not known
   * until the adept items have been walked. `wm` is captured at the top of this method and
   * feeds Initiative and the pools below, so it is reassigned too — leaving it stale would
   * apply the power to the sheet's wound display and to nothing that rolls.
   * ⚠ The wound TRACK is untouched. The power changes the effect of damage, not the damage.
   */
  if (painResistance > 0) {
    const stunBoxes = SR3EActor.painAdjustedBoxes(sys.wounds?.stun?.value ?? 0, painResistance);
    const physBoxes = SR3EActor.painAdjustedBoxes(sys.wounds?.physical?.value ?? 0, painResistance);
    const raw = -(SR3EActor._trackMod(stunBoxes) + SR3EActor._trackMod(physBoxes));
    sys.rawWoundMod = raw;
    sys.woundMod    = Math.min(0, raw + (sys.stimBonus ?? 0));
    wm = sys.woundMod;
  }

  /* Natural dermal armor · SR3 p.56 — an augmentation of Body, like Dermal Plating, but kept
   * apart from `cyberBonus` because Attribute Boost reads that for TECHNOLOGICAL increases it
   * cannot combine with (p.169). See `SR3E.racialDermalArmor`. */
  const racialBonus = { bod: SR3EActor.racialDermalArmor(sys.metatype) };

  /* A dwarf's +2 Body against disease and toxins (p.56) — a SITUATIONAL bonus, beside
   * Nephritic Screen, not an attribute change. See `SR3E.racialSituational` · TODO 98. */
  for (const b of SR3EActor.racialSituational(sys.metatype)) situationalBonuses.push(b);

  // Apply cyber/bio + adept power + racial dermal bonuses to core attributes — derivations below use .value
  const _cyberKey = { body: 'bod', quickness: 'qui', strength: 'str', charisma: 'cha', intelligence: 'int', willpower: 'wil' };
  for (const key of ['body', 'quickness', 'strength', 'charisma', 'intelligence', 'willpower']) {
    if (attr[key]) {
      attr[key].value = (attr[key].base ?? 0)
        + (cyberBonus[_cyberKey[key]] ?? 0)
        + (adeptBonus[_cyberKey[key]] ?? 0)
        + (racialBonus[_cyberKey[key]] ?? 0);
    }
  }

  /* ── Attribute Boost — the live, expiring boost · SR3 p.168-169 (TODO 63) ──────────
   *
   * Applied HERE, after the passive bonuses and before Reaction, Combat Pool and armour
   * encumbrance, so a boosted Quickness flows through all three exactly as a bought point
   * would. That is RAW for the neighbouring power — *"Improving Quickness improves Reaction
   * and Combat Pool normally"* (p.169) — and there is no reason a temporary point behaves
   * differently from a permanent one.
   *
   * ⚠ The boost is read off `system.attributeBoost`, NOT off the item. See the guard in the
   * adept loop above for why.
   * ⚠ Ceiling is 2× the Racial Modified Limit (p.169). Clamped rather than refused: the
   * activation dialog already prevents overshoot, and a GM who edits an attribute upward
   * afterwards should not silently lose the boost entirely.
   */
  const boostState = sys.attributeBoost ?? {};
  const boostActive = {};
  for (const key of ['body', 'quickness', 'strength']) {
    const b = boostState[key];
    if (!attr[key] || !b || (b.turns ?? 0) <= 0 || (b.level ?? 0) <= 0) continue;
    const limit  = SR3EActor.racialLimit(sys.metatype, key);
    const capped = Math.min(attr[key].value + b.level, SR3EActor.attributeBoostCap(limit));
    boostActive[key] = {
      level:   b.level,
      turns:   b.turns,
      applied: capped - attr[key].value,   // may be less than `level` at the ceiling
      limit,
      // The Drain this boost will cost when it lapses, computed from the value it actually
      // reached. Shown on the sheet so the adept can see the bill before it arrives.
      drainLevel: SR3EActor.attributeBoostDrainLevel({ boosted: capped, limit }),
      drainTN:    SR3EActor.attributeBoostDrainTN(capped),
      // ⚠ p.169: *"not compatible with any artificial (cyberware) enhancements, nor
      // spell-based increases"*. Reported, not enforced — the system cannot see a
      // sustained spell, so refusing on the half it CAN see would be arbitrary.
      cyberConflict: (cyberBonus[_cyberKey[key]] ?? 0) > 0,
    };
    attr[key].value = capped;
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

  // Improved Reflexes does not stack with wired reflexes · SR3 p.169 — TODO 64.
  // ⚠ One resolution, read by BOTH Reaction and the Initiative dice below. Deriving it twice
  // is how the two could disagree — a character with the adept package for Reaction and the
  // cyber package for dice, which is neither of the two things the rule allows.
  const reflex = SR3EActor.reflexBonus({
    adeptRea:  adeptBonus.rea,  adeptInit: adeptBonus.initDice,
    cyberRea:  cyberBonus.rea,  cyberInit: cyberBonus.initDice,
  });

  // Reaction — derived from force-enhanced QUI + INT per RAW, minimum 1
  if (attr.reaction) {
    /* ⚠ Move-by-wire's Quickness is excluded here and ONLY here · M&M p.60 — "The Quickness
     * bonus does not count when calculating the character's Reaction Attribute." It still
     * reaches the Combat Pool below, which the book does not exclude, and it is still the
     * character's real Quickness everywhere else. */
    const quiForReaction = Math.max(0, (attr.quickness?.value ?? 0) - (cyberBonus.quiNotForReaction ?? 0));
    const baseReaction = Math.max(1, Math.floor(
      (quiForReaction + (attr.intelligence?.value ?? 0)) / 2
    ));
    attr.reaction.base = baseReaction;

    if (!attr.reaction.override) {
      attr.reaction.value = Math.max(1, baseReaction
        + (attr.reaction.reactionBonus ?? 0) + (attr.reaction.bonus ?? 0)
        + reflex.rea);
    }
  }

  // Essence — reduced by cyberware only (M&M rules: bioware uses Bio Index, not Essence)
  if (attr.essence) {
    // ⚠ Essence loss is PERMANENT — M&M p.147: "Cyberware that is removed does not
    // restore the character's lost Essence." (Core never states the removal case; it
    // only says the cost applies "when the cyberware is installed", p.60.)
    //
    // Deriving it from currently-held cyberware refunded
    // it the moment an item was deleted, and two things hang off Essence — Bio Index
    // capacity (essence + 3) and effective Magic (essence − bioIndex/2) — so a refund
    // silently inflated a character's Magic and their bioware headroom.
    //
    // `essence.lost` is the persisted high-water mark. Taking the max against the live
    // cyberware sum means an actor created before this field existed still reads
    // correctly with `lost: 0`, so no migration script is needed — and installing
    // cyberware shows immediately, before the ratchet hook has written anything.
    attr.essence.value = SR3EActor.essenceValue({
      base: attr.essence.base ?? 6,
      lost: attr.essence.lost ?? null,
      installed: SR3EActor.installedEssenceCost(this.items),
    });
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

  /* ── Improved Ability, capped · SR3 p.169 (TODO 60) ───────────────────────────────
   *
   * > "You cannot have more additional dice than your base skill rating or your Magic
   * > Attribute, whichever is less."
   *
   * Deferred to here because the cap needs **effective** Magic, which is not known until
   * Essence and Bio Index are. `SR3EActor.improvedAbilityDice` holds the rule.
   *
   * ⚠ A capped power still reports its FULL level in the label, with the cap noted, so the
   * breakdown explains a number that is smaller than the sheet's power level. Silently
   * showing the capped figure is how someone concludes their power is broken.
   */
  /* ── Enhanced Perception is capped too · SR3 p.169 ────────────────────────────────
   *
   * > "You cannot have more Enhanced Perception dice than your Intelligence or Magic
   * > Attribute, whichever is less."
   *
   * The same shape as Improved Ability's cap and resolved in the same place for the same
   * reason — it needs effective Magic. `capBy` names the OTHER attribute, so one line covers
   * any future power the book caps this way rather than hard-coding Intelligence.
   */
  for (const b of situationalBonuses) {
    if (!b.capBy) continue;
    const other  = attr[b.capBy]?.value ?? 0;
    const capped = SR3EActor.improvedAbilityDice({
      level: b.dice, skillRating: other, magic: attr.magic?.value ?? 0 });
    if (capped !== b.dice) b.cappedFrom = b.dice;
    b.dice = capped;
  }

  for (const claim of pendingImprovedAbility) {
    const skillItem = (this.items ?? []).find(
      i => i.type === 'skill' && i.name === claim.skill);
    const rating = skillItem?.system?.rating ?? 0;
    const dice   = SR3EActor.improvedAbilityDice({
      level: claim.level, skillRating: rating, magic: attr.magic?.value ?? 0 });
    // ⚠ The FULL level is still reported, with the cap as a note. Showing only the capped
    // number is how someone concludes their power is broken — the sheet says level 6 and the
    // card silently rolls 4.
    const note = dice < claim.level
      ? `level ${claim.level}, capped at ${dice} by the lower of your skill rating (${rating}) `
        + `and Magic (${attr.magic?.value ?? 0}) — SR3 p.169`
      : null;
    _addSkillDice(claim.skill, dice, claim.label, { kind: 'adept', note });
  }

  /* ── Triggered augmentations · M&M p.63, p.71 (TODO 30) ───────────────────────────
   *
   * ⚠ **Applied HERE, between the Reaction derivation and the pools, and the position is the
   * rule.** M&M p.63 on the adrenal pump: *"The Quickness bonus does not affect Reaction, nor
   * does the Reaction bonus affect the Control Pool. However, the Quickness and Willpower
   * bonuses affect the Combat Pool."*
   *
   * Reaction is already computed above, so the Quickness bonus cannot reach it. Combat Pool is
   * computed below, so Quickness and Willpower do. Control Pool is the Vehicle Skill rating in
   * this system and never reads Reaction, so that clause needs nothing. Moving this block
   * either way silently breaks one of the three.
   */
  const activeAugs = [];
  for (const a of triggeredAugs) {
    if (!a.active) continue;
    const per = a.cfg.perLevel ?? null;
    const flat = a.cfg.bonuses ?? null;
    const add = per
      ? Object.fromEntries(Object.entries(per).map(([k, v]) => [k, v * a.level]))
      : (flat ?? {});
    for (const [k, v] of Object.entries(add)) {
      if (k === 'rea') { if (attr.reaction) attr.reaction.value = Math.max(1, attr.reaction.value + v); continue; }
      const key = { qui: 'quickness', str: 'strength', wil: 'willpower', int: 'intelligence',
                    bod: 'body', cha: 'charisma' }[k];
      if (key && attr[key]) attr[key].value = Math.max(1, (attr[key].value ?? 0) + v);
    }
    activeAugs.push({ id: a.id, name: a.name, level: a.level, turns: a.turns,
                      kind: a.cfg.kind, applied: add });

    /* Pain Editor: "the character ignores all Initiative and target number penalties from Stun
     * damage. Penalties from Physical damage are applied" (M&M p.71).
     * ⚠ Recomputed from the PHYSICAL track alone — not zeroed. A character with a physical
     * wound still suffers for it; only the Stun contribution goes. */
    if (a.cfg.ignoresStunWoundMod) {
      const physBoxes = SR3EActor.painAdjustedBoxes(sys.wounds?.physical?.value ?? 0, painResistance);
      const raw = -SR3EActor._trackMod(physBoxes);
      sys.rawWoundMod = raw;
      sys.woundMod    = Math.min(0, raw + (sys.stimBonus ?? 0));
      wm = sys.woundMod;
    }
  }

  // Derived pools — all use .value so adept force benefits every relevant pool
  const combatPoolBase = Math.max(0, Math.floor(
    ((attr.quickness?.value    ?? 0) +
     (attr.intelligence?.value ?? 0) +
     (attr.willpower?.value    ?? 0)) / 2
  ));
  // ⚠ Combat Sense grants Combat Pool dice, not skill dice (p.169) — a separate channel from
  // `skillBonusDice`, and the reason `adeptCombatPool` is summed apart from everything else.
  const combatPool          = combatPoolBase + (sys.combatPoolMod ?? 0) + adeptCombatPool;
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
  // Orthodox SR3 hacking pool: derived from actor-stored deck stats (same formula, different source)
  const orthodoxMccp         = sys.orthodoxDeck?.mccp ?? 0;
  const orthodoxHackingPool  = orthodoxMccp > 0
    ? Math.max(0, Math.floor(((attr.intelligence?.value ?? 0) + orthodoxMccp) / 3))
    : 0;

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
    /* Reaction with the bonuses that do not apply to rigging or decking removed · M&M p.66.
     *
     * ⚠ Subtracted only when the CYBER package actually landed. `reflexBonus` (TODO 64) picks
     * one package or the other, so when the adept's Improved Reflexes won, `cyberBonus.rea`
     * was never applied and subtracting its exempt portion would take away a bonus nobody
     * received.
     * ⚠ Most initiative paths already read `reaction.base` and never see any cyber bonus —
     * jumped-in VCR, VR-Hot and Orthodox Matrix. The two that read `.value` are remote-control
     * rigging and TRM/AR/VR-Cold decking, and those are the ones that need this. */
    reactionNoRigDeck:  Math.max(1, (attr.reaction?.value ?? 0)
                          - (reflex.source === 'adept' ? 0 : (cyberBonus.reaNotRigDeck ?? 0))),
    initiativeDice:     1 + (sys.initiativeDiceBonus ?? 0) + (attr.reaction?.diceBonus ?? 0) + reflex.initDice,
    cyberBonus,
    adeptBonus,
    racialBonus,
    /* Powers whose level exceeds the adept's Magic · SR3 p.168 (TODO 65).
     *
     * > "An adept cannot have more levels in a power than the adept's Magic Attribute."
     *
     * ⚠ Reported, never enforced — the same treatment as the Power Point budget beside it,
     * which has flagged an overspend in red since it was written. Clamping would silently
     * change a character sheet the GM built, and the ethos is that every stat stays
     * hand-editable. The sheet renders this as a warning.
     */
    overLevelledPowers: overLevelled,
    /* Move-by-wire forbids other Reaction/Initiative enhancement (M&M p.60). Reported, not
     * enforced: both sides are cyberware the character paid Essence for, and a GM who
     * allowed the combination should not have it silently undone. */
    reactionExclusiveConflict: (reactionExclusiveItems.length && otherReactionEnhancers.length)
      ? { exclusive: reactionExclusiveItems, others: otherReactionEnhancers } : null,
    // Triggered cyber/bioware the actor owns, and which of them are running (TODO 30).
    triggeredAugmentations: triggeredAugs.map(a => ({
      id: a.id, name: a.name, kind: a.cfg.kind, level: a.level,
      active: a.active, turns: a.turns, label: a.cfg.label ?? a.name })),
    activeAugmentations: activeAugs,
    // Bonuses scoped to a SITUATION — read with SR3EActor.situationalBonus (TODO 70).
    situationalBonuses,
    // Powers whose rule the system states but cannot resolve; rendered on the Magic tab.
    adeptNotes,
    // Combat Pool dice from Combat Sense (p.169), already folded into `combatPool` above.
    adeptCombatPool,
    // Pain Resistance level (p.170) — already folded into `woundMod`.
    painResistance,
    // Mystic Armor level (p.170) — Impact armour, cumulative with worn, and it works in
    // astral combat. Applied at soak time, not here, because the soak card is where armour
    // is chosen and shown.
    mysticArmor,
    // Killing Hands Damage Level (p.170), or null. DECLARED per attack — the power lets you
    // do "normal stun damage, or physical damage as purchased", so it is never automatic.
    killingHands,
    /* Missile Parry · SR3 p.170 — a capability flag, not a bonus. Read by the defence
     * declaration to decide whether to offer the option at all. */
    missileParry,
    // Penetrating Strike (SOTA2 p.67) — reduces the TARGET's Impact armour, for damage only.
    penetratingStrike,
    // Live Attribute Boosts, keyed by attribute — `{level, turns, applied, limit,
    // drainLevel, drainTN, cyberConflict}`. Empty when nothing is boosted.
    attributeBoost: boostActive,
    // Which Reaction/Initiative package survived the p.169 non-stacking rule, and what was
    // dropped. `conflict` is true only when BOTH sources were present.
    reflex,
    skillBonusDice,
    // Who contributed each of those dice — for anything that has to explain itself.
    skillBonusSources,
    // Opt-in, offered per roll — NOT auto-applied like skillBonusDice above.
    skillCategoryBonuses,
    // Legacy alias. `improvedAbility` named an adept-only map; the same data is now fed by
    // cyberware and bioware too, so `skillBonusDice` is the name to read. Same object, not
    // a copy — kept so any world macro still referencing the old key keeps working.
    improvedAbility: skillBonusDice,
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
    orthodoxHackingPool,
    availableOrthodoxHackingPool: Math.max(0, orthodoxHackingPool - (sys.hackingPoolSpent ?? 0)),
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
        aoeCenter:           options.aoeCenter          ?? null,
        aoeRadius:           options.aoeRadius          ?? null,
        aoeThrowerCenter:    options.aoeThrowerCenter   ?? null,
        aoeChunky:           options.aoeChunky          ?? false,
        rawDamage:           options.rawDamage          ?? '',
        damageBase:          options.damageBase         ?? null,
        weaponItemId:        options.weaponItemId       ?? null,
        ammoType:            options.ammoType           ?? null,
        burstRounds:         options.burstRounds        ?? 0,
        shotgunSpread:       options.shotgunSpread      ?? 0,
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
        isAttributeBoostRoll: options.isAttributeBoostRoll ?? false,
        attributeBoostContext: options.attributeBoostContext ?? null,
        isBanishingRoll:     options.isBanishingRoll    ?? false,
        banishContext:       options.banishContext       ?? null,
        isWardCastRoll:      options.isWardCastRoll     ?? false,
        wardCastContext:     options.wardCastContext     ?? null,
        isWardAttackRoll:    options.isWardAttackRoll   ?? false,
        wardAttackContext:   options.wardAttackContext   ?? null,
        isWardSoakRoll:      options.isWardSoakRoll     ?? false,
        wardSoakContext:     options.wardSoakContext     ?? null,
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
        crashOnFailVehicleId:    options.crashOnFailVehicleId    ?? null,
      });
      return successes;
    }

    const dice = this._rollWave(pool, effectiveTN, /* isFirstWave */ true);
    const ones   = dice.filter(d => d.isOne).length;
    const glitch = SR3EActor.isRuleOfOne(ones, pool);

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
      aoeCenter:             options.aoeCenter             ?? null,
      aoeRadius:             options.aoeRadius             ?? null,
      aoeThrowerCenter:      options.aoeThrowerCenter      ?? null,
      aoeChunky:             options.aoeChunky             ?? false,
      rawDamage:             options.rawDamage             ?? '',
      damageBase:            options.damageBase            ?? null,
      weaponItemId:          options.weaponItemId          ?? null,
      ammoType:              options.ammoType              ?? null,
      burstRounds:           options.burstRounds           ?? 0,
      shotgunSpread:         options.shotgunSpread         ?? 0,
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
      isAttributeBoostRoll:  options.isAttributeBoostRoll  ?? false,
      attributeBoostContext: options.attributeBoostContext ?? null,
      isBanishingRoll:       options.isBanishingRoll       ?? false,
      banishContext:         options.banishContext         ?? null,
      isWardCastRoll:        options.isWardCastRoll        ?? false,
      wardCastContext:       options.wardCastContext       ?? null,
      isWardAttackRoll:      options.isWardAttackRoll      ?? false,
      wardAttackContext:     options.wardAttackContext     ?? null,
      isWardSoakRoll:        options.isWardSoakRoll        ?? false,
      wardSoakContext:       options.wardSoakContext       ?? null,
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
      crashOnFailVehicleId:  options.crashOnFailVehicleId  ?? null,
    });
  }

  /**
   * SR3's Rule of One (p.38) — true only when EVERY die rolled comes up 1:
   *
   *   "If ALL the dice rolled for a test come up 1s, it means that the character
   *    has made a disastrous mistake. The result may be humorous, embarrassing,
   *    or deadly. The gamemaster determines whatever tone is appropriate…"
   *
   * The consequence is GM adjudication, not a mechanical penalty, and there is no
   * second "critical" tier — a two-tier rule triggered by more than half the pool
   * showing 1s is SR4's glitch, not anything in SR3.
   *
   * Only the first wave is ever counted, which needs no special handling: a die
   * showing 1 does not explode, so no later wave can change the tally.
   *
   * Kept as one pure function because the same test is made from five separate
   * roll paths, and five copies of a rule is five chances to get it wrong.
   */
  static isRuleOfOne(ones, pool) {
    return pool > 0 && ones === pool;
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
      // Rule of One (p.38). One tier, not two: all dice showing 1s is already an
      // automatic zero-success failure, so the old "critical" tier could never be
      // anything but a second label on the same event.
      const glitchHtml = glitch
        ? '<div class="sr-rule-of-one">⚠ RULE OF ONE — every die came up 1. '
          + 'A disastrous mistake; the GM decides what it costs.</div>'
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

          // SR3 ranged sequence, core rulebook: "3. Make Attacker's Success Test …
          // 4. Resolve Dodge Test — if the target wishes to attempt to dodge …
          // 5. Resolve Target's Damage Resistance Test." The defender decides AFTER
          // seeing the attack roll, and the real choice is dodge-vs-soak: pool spent
          // dodging is gone from the Damage Resistance Test. The old flow asked them
          // to commit before the roll, so they were guessing blind.
          const canDodge = targetActor && targetActor.type !== 'vehicle' && !state.isMelee;

          if (canDodge) {
            const dodgeContext = JSON.stringify({
              attackerActorId: state.attackerActorId,
              targetActorId:   state.targetActorId,
              weaponItemId:    state.weaponItemId,
              ammoType:        state.ammoType ?? null,
              burstRounds:     state.burstRounds ?? 0,
              shotgunSpread:   state.shotgunSpread ?? 0,
              // Missile Parry (p.170): what kind of weapon, and from which range band.
              weaponType:      state.weaponType ?? null,
              rangeBandIdx:    state.rangeBandIdx ?? null,
              isMelee:         state.isMelee,
              attackSuccesses: successes,
              attackerName,
              stagedPower:     staged.power,
              stagedLevel:     staged.level,
              isStun:          staged.isStun,
              rawDamage:       state.rawDamage,
            }).replace(/'/g, '&#39;');

            postRollHtml = `
              <div class="sr-soak-action">
                <button class="sr-dodge-declare-btn" data-payload='${dodgeContext}'>
                  🎯 ${targetName} — ${successes} hit${successes === 1 ? '' : 's'} incoming. Dodge or take it?
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

      } else if (state.isAttributeBoostRoll && state.attributeBoostContext) {
        /* Attribute Boost · SR3 p.168-169 (TODO 63)
         *
         * > "If there are no successes, the Attribute is not boosted. Otherwise, the
         * > Attribute is boosted by the level of the power. The boost lasts for a number of
         * > Combat Turns equal to the number of successes."
         *
         * ⚠ **No successes means no Drain.** Drain is owed *"when the boost runs out"*, and
         * a boost that never started never runs out. This is the opposite of Conjuring,
         * whose Drain applies even on a failed test — the two branches sit next to each
         * other and the asymmetry is deliberate, not an oversight.
         */
        const ab = state.attributeBoostContext;
        if (successes === 0) {
          stagingHtml = `<div class="sr-staging-result">
            💪 Boost failed — ${ab.attrLabel} is not boosted. <em>No Drain.</em>
          </div>`;
        } else {
          const capped  = Math.min(ab.current + ab.level, ab.cap);
          const applied = capped - ab.current;
          stagingHtml = `
            <div class="sr-staging-result">
              💪 <strong>${successes} success${successes !== 1 ? 'es' : ''}</strong> →
              ${ab.attrLabel} <strong>${ab.current} → ${capped}</strong>
              for <strong>${successes} Combat Turn${successes !== 1 ? 's' : ''}</strong>.
              ${applied < ab.level
                ? `<div class="sr-bd-note">Clipped by the ceiling of 2× Racial Modified Limit (${ab.cap}) — p.169.</div>`
                : ''}
              <div class="sr-bd-note">Drain when it lapses:
                ${SR3EActor.attributeBoostDrainTN(capped)}${SR3EActor.attributeBoostDrainLevel({ boosted: capped, limit: ab.limit })}
                Stun.</div>
            </div>`;
          await SR3EActor._commitAttributeBoost({
            actorId: ab.actorId, attribute: ab.attribute, level: ab.level, turns: successes,
          });
        }

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

      } else if (state.isBanishingRoll && state.banishContext) {
        const bc           = state.banishContext;
        const banisher     = game.actors.get(bc.banisherActorId);
        const spirit       = game.actors.get(bc.spiritActorId);
        const banisherName = banisher?.name ?? 'Banisher';
        const spiritName   = spirit?.name   ?? bc.spiritLabel;

        // Auto-resolve spirit resistance: Force dice vs TN = banisher's effective Magic
        const spiritForce = bc.spiritForce;
        const miji        = game.sr3e?.SR3EMIJI;
        const spiritRes   = miji
          ? miji._resolveRoll(spirit ?? banisher, spiritForce, bc.effectiveMagic)
          : { successes: 0, dice: [] };
        const spiritHits  = spiritRes.successes;

        const net = successes - spiritHits;

        let outcomeHtml = '';
        let newForce    = spiritForce;

        if (net > 0) {
          // Banisher wins — reduce spirit's Force
          newForce = Math.max(0, spiritForce - net);
          await spirit?.setFlag('The2ndChumming3e', 'force', newForce);
          if (newForce === 0) {
            outcomeHtml = `<div class="sr-staging-result" style="color:var(--sr-green)">
              💀 <strong>${spiritName}</strong> is destroyed — Force reduced to 0.
              Remove it from the tracker when ready.
            </div>`;
          } else {
            outcomeHtml = `<div class="sr-staging-result" style="color:var(--sr-green)">
              🌀 <strong>${banisherName}</strong> wins by ${net} — ${spiritName}'s Force reduced to <strong>${newForce}</strong>.
            </div>
            <div style="font-size:11px;color:var(--sr-muted);margin-top:4px">
              ⚔ Both locked in magical combat until <strong>${banisherName}'s</strong> next Combat Phase.
            </div>`;
          }
        } else if (net < 0) {
          // Spirit wins — temporary Magic loss for banisher
          const magicLost = Math.abs(net);
          const prev      = banisher ? (banisher.getFlag('The2ndChumming3e', 'tempMagicLoss') ?? 0) : 0;
          await banisher?.setFlag('The2ndChumming3e', 'tempMagicLoss', prev + magicLost);
          outcomeHtml = `<div class="sr-staging-result" style="color:var(--sr-red)">
            🌀 <strong>${spiritName}</strong> wins by ${magicLost} — ${banisherName}'s effective Magic reduced by ${magicLost} for this combat (now ${Math.max(0, bc.effectiveMagic - magicLost)}).
            ${Math.max(0, bc.effectiveMagic - magicLost) === 0
              ? `<br><strong>⚠ Magic reached 0 — ${banisherName} takes Deadly Stun damage, passes out. Spirit goes free. Check for Magic Loss!</strong>`
              : ''}
          </div>
          <div style="font-size:11px;color:var(--sr-muted);margin-top:4px">
            ⚔ Both locked in magical combat until <strong>${spiritName}'s</strong> next Combat Phase.
          </div>`;
        } else {
          // Tie
          outcomeHtml = `<div class="sr-staging-result" style="color:var(--sr-muted)">
            🌀 Tie — no change. Contest may continue.
          </div>
          <div style="font-size:11px;color:var(--sr-muted);margin-top:4px">
            ⚔ Both locked in magical combat. Winner decides whether to continue.
          </div>`;
        }

        stagingHtml = `
          <div class="sr-staging-result" style="font-size:12px;color:var(--sr-muted);margin-bottom:4px">
            ${banisherName}: <strong>${successes}</strong> hit${successes !== 1 ? 's' : ''} &nbsp;|&nbsp;
            ${spiritName} resists (${spiritForce}d vs TN ${bc.effectiveMagic}): <strong>${spiritHits}</strong> hit${spiritHits !== 1 ? 's' : ''}
          </div>
          ${outcomeHtml}`;

      } else if (state.isWardCastRoll && state.wardCastContext) {
        // Magic Attribute Test vs TN = desired Force. Successes = weeks the ward lasts
        // (0 successes = it fails to form). Drain is always (Force)L Stun, win or lose.
        const wc = state.wardCastContext;

        if (successes === 0) {
          stagingHtml = '<div class="sr-staging-result sr-soak-blocked">🛡 Ward fails to form — no successes. (Drain still applies.)</div>';
        } else {
          const durationNote = wc.isPermanent
            ? 'Permanent (GM: deduct Force Karma to finalize)'
            : `${successes} week${successes !== 1 ? 's' : ''}`;
          stagingHtml = `
            <div class="sr-staging-result">
              🛡 <strong>${successes} success${successes !== 1 ? 'es' : ''}</strong> — ward (Force ${wc.force}) holds for <strong>${durationNote}</strong>.
            </div>`;
          const placePayload = JSON.stringify({ ...wc, weeks: successes }).replace(/'/g, '&#39;');
          postRollHtml += `
            <div class="sr-soak-action">
              <button class="sr3e-place-ward-btn" data-payload='${placePayload}'>🛡 Place Ward on Canvas</button>
            </div>`;
        }

        const wardDrainPayload = JSON.stringify({
          actorId:         wc.casterActorId,
          drainTNOverride: wc.force,
          drainLevel:      'L',
          drainIsPhysical: false,
          resistAttr:      'willpower',
          resistName:      'Willpower',
          drainStr:        '(Force)L',
          spellName:       'Ward',
        }).replace(/'/g, '&#39;');
        postRollHtml += `
          <div class="sr-soak-action">
            <button class="sr-drain-btn" data-payload='${wardDrainPayload}'>
              ⚡ Resist Ward Drain
            </button>
          </div>`;

      } else if (state.isWardAttackRoll && state.wardAttackContext) {
        // Step 1 (SR3 Core p.174): attacker's success test vs TN = ward's current Force.
        // Every 2 net successes stages the attacker's base damage code up.
        const wac    = state.wardAttackContext;
        const ward   = game.actors.get(wac.wardActorId);
        const staged = SR3EItem.stageDamage(wac.damageBase, successes);

        if (!ward) {
          stagingHtml = '<div class="sr-staging-result sr-soak-blocked">🛡 Ward not found — it may have been destroyed.</div>';
        } else if (successes === 0) {
          stagingHtml = '<div class="sr-staging-result sr-soak-blocked">🛡 Attack fails to connect with the ward.</div>';
        } else {
          stagingHtml = `
            <div class="sr-staging-result">
              ⚔ ${successes} success${successes !== 1 ? 'es' : ''} — staged to
              <strong>${staged.power}${staged.level}${staged.isStun ? ' Stun' : ''}</strong>.
            </div>`;
          const resistPayload = JSON.stringify({
            wardActorId:     wac.wardActorId,
            attackerActorId: wac.attackerActorId,
            stagedPower:     staged.power,
            stagedLevel:     staged.level,
          }).replace(/'/g, '&#39;');
          postRollHtml += `
            <div class="sr-soak-action">
              <button class="sr3e-ward-resist-btn" data-payload='${resistPayload}'>
                🛡 ${ward.name} Resists
              </button>
            </div>`;
        }

      } else if (state.isWardSoakRoll && state.wardSoakContext) {
        // Step 2/3 (SR3 Core p.174): ward rolls Force dice vs TN = attacker's Magic/Force.
        // Every 2 soak successes stages the damage down; staged-to-nothing = attacker bounced
        // back. Surviving Level converts to condition-monitor boxes (same L/M/S/D table used
        // everywhere else in this system) and reduces the ward's Force by that many boxes.
        const wsc     = state.wardSoakContext;
        const ward    = game.actors.get(wsc.wardActorId);
        const STAGES  = ['L', 'M', 'S', 'D'];
        let idx       = STAGES.indexOf(wsc.stagedLevel);
        let remaining = successes;
        while (remaining >= 2 && idx >= 0) { remaining -= 2; idx--; }

        if (idx < 0) {
          stagingHtml = '<div class="sr-staging-result sr-soak-blocked">🛡 Ward holds — attacker bounced back! (Must win another contest to try again.)</div>';
        } else {
          const finalLevel = STAGES[idx];
          const wardBoxes  = ({ L: 1, M: 3, S: 6, D: 10 })[finalLevel] ?? 1;
          const wardName   = ward?.name ?? 'Ward';
          stagingHtml = `
            <div class="sr-staging-result">
              🛡 ${successes} soak hit${successes !== 1 ? 's' : ''} — damage staged down to <strong>${wsc.stagedPower}${finalLevel}</strong>.
            </div>`;
          const assignPayload = JSON.stringify({ wardActorId: wsc.wardActorId, boxes: wardBoxes }).replace(/'/g, '&#39;');
          postRollHtml += `
            <div class="sr-soak-action">
              <button class="sr-assign-damage-btn" data-payload='${assignPayload}'>
                🩸 Assign ${SR3EActor._woundName(finalLevel)} Damage to ${wardName}
              </button>
            </div>`;
        }

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
      // A failed Driving Test → the Crash dialog (TODO 74). Offered, never automatic: SR3
      // p.147 lists when a Crash Test is required, and that is the GM's reading of the scene.
      const crashOfferHtml = (state.crashOnFailVehicleId && successes === 0)
        ? `<div class="sr-soak-action">
             <button class="sr-crash-open-btn" data-vehicle-id="${state.crashOnFailVehicleId}">
               💥 Crash — resolve for the vehicle and everyone aboard
             </button>
           </div>`
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
        ${crashOfferHtml}
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
        aoeCenter:          state.aoeCenter          ?? null,
        aoeRadius:          state.aoeRadius          ?? null,
        aoeThrowerCenter:   state.aoeThrowerCenter   ?? null,
        aoeChunky:          state.aoeChunky          ?? false,
        rawDamage:          state.rawDamage          ?? '',
        damageBase:         state.damageBase         ?? null,
        weaponItemId:       state.weaponItemId       ?? null,
        // ⚠ These are the fields an AUDIT found missing while they were being read on the
        // final wave. Every one of them is only reachable at TN ≥ 7, because `_rollWave` sets
        // `needsExplosion = face === 6 && !success` — a 6 at TN 6 or lower is already a
        // success and never explodes. That is why they survived so long, and why the audit
        // rather than play found them.
        ammoType:           state.ammoType           ?? null,
        // Dodge: without these the final wave builds no result AND no soak button, so the
        // attack simply stops — no Damage Resistance Test, no damage, no error. Unreachable
        // until the p.113 modifiers landed and a dodge TN could exceed 6.
        isChargeRecovery:   state.isChargeRecovery   ?? false,
        chargeContext:      state.chargeContext      ?? null,
        isKnockdownRoll:    state.isKnockdownRoll    ?? false,
        knockdownContext:   state.knockdownContext   ?? null,
        isFullDefenseDodge: state.isFullDefenseDodge ?? false,
        fullDefenseContext: state.fullDefenseContext ?? null,
        isDodgeRoll:        state.isDodgeRoll        ?? false,
        dodgePayload:       state.dodgePayload       ?? null,
        // Spell Defense: TN is the spell's Force, so Force 7+ reaches this. Losing it drops
        // the reduction of the caster's successes and never sets `_pendingDefenseCard`, so
        // the resist and drain cards never post either.
        isSpellDefenseRoll: state.isSpellDefenseRoll ?? false,
        spellDefenseContext: state.spellDefenseContext ?? null,
        // Escape Artist: TN is the restraint rating. Falling: TN is the distance in METRES,
        // so a 7-metre fall already explodes. Both lose their entire result card.
        escapeContext:      state.escapeContext      ?? null,
        fallingContext:     state.fallingContext     ?? null,
        burstRounds:        state.burstRounds        ?? 0,
        shotgunSpread:      state.shotgunSpread      ?? 0,
        // Missile Parry's two inputs (p.170). Dropped, the defender is never offered the
        // power on an exploded attack roll — silently, since a missing option looks like a
        // defender who simply does not have it.
        weaponType:         state.weaponType         ?? null,
        rangeBandIdx:       state.rangeBandIdx       ?? null,
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
        isAttributeBoostRoll:  state.isAttributeBoostRoll  ?? false,
        attributeBoostContext: state.attributeBoostContext ?? null,
        isBanishingRoll:    state.isBanishingRoll     ?? false,
        banishContext:      state.banishContext       ?? null,
        isWardCastRoll:     state.isWardCastRoll      ?? false,
        wardCastContext:    state.wardCastContext     ?? null,
        isWardAttackRoll:   state.isWardAttackRoll    ?? false,
        wardAttackContext:  state.wardAttackContext   ?? null,
        isWardSoakRoll:     state.isWardSoakRoll      ?? false,
        wardSoakContext:    state.wardSoakContext     ?? null,
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
        crashOnFailVehicleId:      state.crashOnFailVehicleId      ?? null,
      }).replace(/'/g, '&#39;');
      explodeBtn = `
        <div class="sr-explode-action">
          <button class="sr-explode-btn" data-payload='${payload}'>
            💥 Roll explosions (${explodingDice.length} ${explodingDice.length === 1 ? 'die' : 'dice'})
          </button>
        </div>
      `;
    }

    // ── Full Defense dodge (p.124) — NOT the same arithmetic as an ordinary dodge ──
    let fdDodgeHtml = '';
    if (allDone && state.isFullDefenseDodge && state.fullDefenseContext) {
      const fc  = state.fullDefenseContext;
      const dfn = game.actors.get(fc.defenderActorId);
      // ⚠ Successes come OFF the attacker's net before staging — an ordinary dodge instead
      // adds them to the Damage Resistance Test and never touches staging. See
      // fullDefenseOutcome for the two quotations that differ.
      const fd = SR3EActor.fullDefenseOutcome({
        attackHits: fc.net, skillHits: 0, dodgeHits: successes,
      });

      if (fd.cleanMiss) {
        fdDodgeHtml = `
          <div class="sr-dodge-result sr-dodge-success">
            ✅ Clean miss — ${successes} dodge hit${successes !== 1 ? 's' : ''}
            exceeded the attacker's ${fc.net} net. No damage.
          </div>`;
      } else {
        const base = fc.atkDamageBase;
        let html = `
          <div class="sr-dodge-result sr-dodge-fail">
            ❌ ${successes} dodge hit${successes !== 1 ? 's' : ''} vs ${fc.net} net —
            <strong>${fd.remaining}</strong> success${fd.remaining !== 1 ? 'es' : ''} remain to stage with.
          </div>`;
        if (base) {
          const st = game.sr3e.SR3EItem.stageDamage(base, fd.remaining, { meleeRules: true });
          const soakPayload = JSON.stringify({
            attackerActorId: fc.attackerActorId,
            targetActorId:   fc.defenderActorId,
            isMelee:         true,
            stagedPower:     st.power,
            stagedLevel:     st.level,
            isStun:          st.isStun,
            rawDamage:       fc.atkRawDamage,
          }).replace(/'/g, '&#39;');
          html += `
            <div class="sr-staging-result">📊 ${fc.atkRawDamage} + ${fd.remaining} → <strong>${st.power}${st.level} ${st.isStun ? 'Stun' : 'Physical'}</strong></div>
            <div class="sr-soak-action">
              <button class="sr-soak-btn" data-payload='${soakPayload}'>
                🛡 ${dfn?.name ?? 'Defender'}: Resist Damage
              </button>
            </div>`;
        }
        fdDodgeHtml = html;
      }
    }

    // A failed charge's Quickness test (CC p.86): any success keeps them upright.
    if (allDone && state.isChargeRecovery && state.chargeContext) {
      const ca = game.actors.get(state.chargeContext.actorId);
      if (ca) {
        const proneP = JSON.stringify({ actorId: ca.id }).replace(/'/g, '&#39;');
        await ChatMessage.create({
          content: successes > 0
            ? `<div class="sr-roll-card"><div class="sr-dodge-result sr-dodge-success">
                 ✅ ${ca.name} keeps their feet after the failed charge.</div></div>`
            : `<div class="sr-roll-card"><div class="sr-melee-result sr-melee-win">
                 🏃 No successes — <strong>${ca.name} falls prone.</strong></div>
                 <div class="sr-soak-action">
                   <button class="sr-prone-btn" data-payload='${proneP}'>🔻 Mark ${ca.name} prone</button>
                 </div></div>`,
          style: CONST.CHAT_MESSAGE_STYLES.OTHER,
        });
      }
    }

    // Knockdown Test resolved (p.124). Posts its own result card rather than inlining,
    // because the prone toggle belongs with the announcement.
    if (allDone && state.isKnockdownRoll && state.knockdownContext) {
      const kc  = state.knockdownContext;
      const tgt = game.actors.get(kc.targetActorId ?? kc.actorId);
      if (tgt) {
        // `needed` was settled on the dialog — it is editable, because which wound level
        // drives the threshold is ambiguous in the book. See knockdownOutcome.
        const out = SR3EActor.knockdownOutcome({ level: kc.level, successes });
        const eff = { ...out };
        if (!out.automatic && Number.isFinite(kc.needed)) {
          eff.knockedDown = successes === 0;
          eff.staggered   = successes > 0 && successes < kc.needed;
          eff.standing    = successes >= kc.needed;
        }
        await SR3EActor._postKnockdownResult(tgt, eff);
      }
    }

    // Dodge result announcement — shown when dodge wave fully resolves
    let dodgeResultHtml = '';
    if (allDone && state.isDodgeRoll && state.dodgePayload) {
      const dp          = state.dodgePayload;
      const dodgerName  = game.actors.get(dp.targetActorId)?.name   ?? 'Defender';
      const attackerName = game.actors.get(dp.attackerActorId)?.name ?? 'Attacker';
      const atkHits = dp.attackSuccesses ?? 0;

      /* ⚠ Two different rules, and the payload flag is what keeps them apart. A Missile
       * Parry (p.170) is a Reaction Test whose failed successes carry NOTHING; a Dodge Test
       * (p.113) is pool dice whose failed successes are added to the Damage Resistance
       * Test. Both are strict on ties. See `missileParryOutcome` for why they are not one
       * function. */
      const isParry = dp.isMissileParry === true;
      const { cleanMiss, carried } = isParry
        ? { cleanMiss: SR3EActor.missileParryOutcome(successes, atkHits).caught, carried: 0 }
        : SR3EActor.dodgeOutcome(successes, atkHits);

      const verb = isParry ? 'parry' : 'dodge';

      if (cleanMiss) {
        dodgeResultHtml = `
          <div class="sr-dodge-result sr-dodge-success">
            ${isParry ? '🖐 Caught it!' : '✅ Dodge Successful!'} ${successes} ${verb} hit${successes !== 1 ? 's' : ''}
            beat ${atkHits} attack hit${atkHits !== 1 ? 's' : ''} — no damage taken.
            ${isParry ? `<div style="font-size:11px;color:var(--sr-muted);margin-top:3px">
              ${dodgerName} plucks it out of the air. Missile Parry is a Free Action, so
              ${dodgerName} has not spent an action doing it.</div>` : ''}
          </div>`;
      } else {
        // A failed dodge is NOT a wasted dodge: "Even if you don't dodge completely,
        // the successes still count and are added to the Damage Resistance
        // Successes." They carry to the soak — they do NOT reduce staging, which is
        // still computed from the attacker's raw successes.
        const trackLabel = dp.isStun ? 'Stun' : 'Physical';
        const soakBtn    = dp.isSpellSoak
          ? SR3EActor._spellSoakButtonHtml({ ...dp, carriedSuccesses: carried })
          : SR3EActor._soakButtonHtml({ ...dp, carriedSuccesses: carried });
        const tieNote = (successes === atkHits && atkHits > 0)
          ? ' <span style="color:var(--sr-muted);font-size:11px">(a tie goes to the attacker)</span>'
          : '';
        dodgeResultHtml = `
          <div class="sr-dodge-result sr-dodge-fail">
            ${isParry ? '❌ Missile Parry Failed!' : '❌ Dodge Failed!'} ${successes} ${verb} hit${successes !== 1 ? 's' : ''}
            vs ${atkHits} attack hit${atkHits !== 1 ? 's' : ''}${tieNote}.
            Incoming: <strong>${dp.stagedPower}${dp.stagedLevel} ${trackLabel}</strong>
          </div>
          ${carried > 0
            ? `<div class="sr-staging-result" style="color:var(--sr-green)">
                 ➕ ${carried} dodge hit${carried !== 1 ? 's' : ''} carried into the Damage Resistance Test.
               </div>`
            : ''}
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
      const origIdx = idx;

      // SR3: "Even if you don't dodge completely, the successes still count and are
      // added to the Damage Resistance Successes to determine the final outcome."
      const carried    = Math.max(0, sp.carriedSuccesses ?? 0);
      const totalSoak  = successes + carried;
      let   remaining  = totalSoak;

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
        // Show the sum AND its parts, so a player can see the dodge was credited
        // rather than silently folded in.
        const hitsLabel  = carried > 0
          ? `${totalSoak} hit${totalSoak !== 1 ? 's' : ''} (${successes} soak + ${carried} dodge)`
          : `${successes} soak hit${successes !== 1 ? 's' : ''}`;
        const resultLine = unchanged
          ? `${hitsLabel} — damage unchanged: <strong>${power}${finalLevel} ${trackLabel}</strong>`
          : `${hitsLabel} — <strong>${sp.stagedPower}${sp.stagedLevel}</strong> staged down to <strong>${power}${finalLevel} ${trackLabel}</strong>`;
        const soakBoxes      = ({ L: 1, M: 3, S: 6, D: 10 })[finalLevel] ?? 1;
        const soakTrack      = sp.isStun ? 'stun' : 'physical';
        const soakTargetName = game.actors.get(sp.actorId)?.name ?? 'Target';
        const soakAssignPayload = JSON.stringify({ actorId: sp.actorId, track: soakTrack, boxes: soakBoxes }).replace(/'/g, '&#39;');
        // Knockdown (p.124) is a THIRD stage, after damage resolves. Offered only when a
        // wound actually lands — fully soaked means there is no wound level to test against.
        const kdPayload = JSON.stringify({
          actorId:         sp.actorId,
          targetActorId:   sp.actorId,
          attackerActorId: sp.attackerActorId ?? null,
          level:           finalLevel,
          power:           sp.stagedPower,
          isMelee:         sp.isMelee ?? false,
          ammoType:        sp.ammoType ?? null,
        }).replace(/'/g, '&#39;');

        soakResultHtml = `
          <div class="sr-soak-result">🛡 ${resultLine}</div>
          <div class="sr-soak-action">
            <button class="sr-assign-damage-btn" data-payload='${soakAssignPayload}'>
              🩸 Assign ${SR3EActor._woundName(finalLevel)} ${trackLabel} Wound to ${soakTargetName}
            </button>
          </div>
          <div class="sr-soak-action">
            <button class="sr-knockdown-btn" data-payload='${kdPayload}'>
              ${finalLevel === 'D'
                ? `💥 ${soakTargetName} — Deadly wound: knocked down automatically (p.124)`
                : `💥 ${soakTargetName} — Knockdown Test`}
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
          ${fdDodgeHtml}
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

  /**
   * Effective armour against flechette rounds · *SR3 p.116*
   *
   * > "Against armored targets, flechette rounds fare less well. For the target's Armor
   * > Rating, use either **double its Impact Armor Rating** or its **normal Ballistic Armor
   * > Rating**, whichever is higher."
   *
   * So it is `max(impact × 2, ballistic)` — the doubling applies to **Impact only**, and
   * Ballistic competes with the result at its normal value.
   *
   * ⚠ **This was `max(ballistic, impact) × 2` until 2026-08-30**, which doubles the wrong
   * number and then doubles it anyway. Against ballistic 8 / impact 2 the book gives
   * `max(4, 8) = 8`; the old reading gave `8 × 2 = 16`, exactly twice the armour, making
   * flechette useless against precisely the armour it is supposed to be merely poor against.
   * The two agree only when Impact is the higher of the two, which is why it survived — that
   * is the common case for the light armour flechette is usually fired at.
   *
   * *"Dermal armor negates the Damage Level increase of flechette ammunition"* is the
   * unarmoured case, so it lives in `flechetteRaisesLevel`, not here.
   */
  static flechetteArmor({ ballistic = 0, impact = 0 } = {}) {
    return Math.max(Math.max(0, impact) * 2, Math.max(0, ballistic));
  }

  /**
   * VEHICLE DAMAGE MODIFIERS TABLE · *SR3 p.145*
   *
   * | Damage Level | Target Number | Initiative Penalty | Speed Rating Reduction |
   * |---|---|---|---|
   * | Light    | +1 | −1 | No reduction |
   * | Moderate | +2 | −2 | 25 percent |
   * | Serious  | +3 | −3 | 50 percent |
   *
   * > "The damage modifier to the target number applies to ALL TESTS THAT INVOLVE THE VEHICLE.
   * > The Initiative penalty reduces Initiative results generated for the vehicle's driver. The
   * > Speed Rating Reduction reduces the vehicle's Speed Rating."
   *
   * ⚠ **Three rows only.** Destroyed is not a row — a destroyed vehicle is not being driven,
   * and the Impact Damage Levels Table's "Destroyed (D)" is its own outcome rather than a
   * damage level carrying modifiers.
   * ⚠ **The TN modifier applies to every test involving the vehicle**, not only to Driving —
   * Gunnery from a damaged vehicle is affected too. Only the Driving Test consumes it today,
   * so the rest is the GM's to apply; that is why this returns the numbers rather than
   * folding them into a roll.
   * ⚠ **Speed reduction also caps maximum speed**, because *"the vehicle's maximum speed is
   * equal to its Speed Rating multiplied by 1.5"*, and the reduction applies before that.
   *
   * @param {string} level  'L' | 'M' | 'S' (case-insensitive), or a box count via
   *                        `SR3EActor.vehicleDamageLevel`
   * @returns {{tn:number, initiative:number, speedReduction:number}} — `speedReduction` is a
   *          FRACTION (0, 0.25, 0.5), not a percentage.
   */
  static vehicleDamageModifiers(level) {
    const L = String(level ?? '').trim().toUpperCase();
    switch (L) {
      case 'L': return { tn: 1, initiative: -1, speedReduction: 0    };
      case 'M': return { tn: 2, initiative: -2, speedReduction: 0.25 };
      case 'S': return { tn: 3, initiative: -3, speedReduction: 0.5  };
      default:  return { tn: 0, initiative:  0, speedReduction: 0    };
    }
  }

  /**
   * A vehicle's damage level from its filled boxes.
   *
   * ⚠ Vehicles do NOT use the character Condition Monitor. Their track is `Body × 2` boxes
   * (`_prepareVehicle`), with the vehicle disabled at `Body`. The bands are therefore
   * proportional to the track rather than the fixed 1/3/6 a character uses — copying the
   * character thresholds onto a vehicle would make a Body 6 truck Serious at 6 of 12 boxes
   * and a Body 2 drone Serious at 6 of 4, which it can never reach.
   */
  static vehicleDamageLevel(boxes, maxBoxes) {
    const b = Math.max(0, Math.trunc(Number(boxes) || 0));
    const m = Math.max(1, Math.trunc(Number(maxBoxes) || 1));
    if (b <= 0) return null;
    const frac = b / m;
    if (frac >= 1)    return 'D';
    if (frac >= 0.75) return 'S';
    if (frac >= 0.5)  return 'M';
    return 'L';
  }

  /**
   * Crash / impact damage from speed · *SR3 p.145, p.147*
   *
   * > "The Power of a crash is equal to the vehicle's speed divided by 10 and rounded up"
   * > (p.145)
   *
   * **IMPACT DAMAGE LEVELS TABLE** (p.147), in metres per Combat Turn:
   *
   * | Speed | Level |
   * |---|---|
   * | 1–20 | Light |
   * | 21–60 | Moderate |
   * | 61–200 | Serious |
   * | 201+ | Destroyed |
   *
   * ⚠ **The unit is METRES PER COMBAT TURN, not km/h.** Everything in the chase layer stores
   * speed as `km/h ÷ 1.2`, and this reads it directly — so a dialog that collects km/h and
   * passes it through overstates every crash by about 20%. The field is named `speedKmct` for
   * that reason.
   *
   * ⚠ **Power floors at 1.** A vehicle barely moving still hits something; a Power of 0 would
   * make the Damage Resistance Test automatic.
   *
   * ⚠ Pure and separated from the card so it can be tested — it was inline, and the whole
   * crash path had no coverage of any kind. See `tests/tables.test.mjs`.
   */
  static crashDamage(speedMetresPerTurn) {
    const speed = Math.max(0, Number(speedMetresPerTurn) || 0);
    const power = Math.max(1, Math.ceil(speed / 10));
    const level = speed >= 201 ? 'D' : speed >= 61 ? 'S' : speed >= 21 ? 'M' : 'L';
    return { power, level };
  }

  /**
   * The Crash Test's speed modifier · *SR3 p.148, Crash Test Modifiers Table* · TODO 106.
   *
   * | Vehicle Speed | Modifier |
   * |---|---|
   * | Less than driver's Reaction × 20 | 0 |
   * | Less than Reaction × 30 | +1 |
   * | Less than Reaction × 40 | +2 |
   * | More than Reaction × 40 | +4 |
   *
   * Speed in **metres per Combat Turn** (the unit the rest of the vehicle rules use). The table
   * says "more than" ×40 for the last row; exactly ×40 is read with it, since it is not "less than".
   */
  static crashSpeedModifier(speedMetresPerTurn, reaction) {
    const s = Math.max(0, Number(speedMetresPerTurn) || 0);
    const r = Math.max(0, Number(reaction) || 0);
    if (s < r * 20) return 0;
    if (s < r * 30) return 1;
    if (s < r * 40) return 2;
    return 4;
  }

  /**
   * Crash damage from a speed in **km/h** — the unit a GM thinks in (TODO 74).
   *
   * ⚠ The Impact Damage Levels Table (p.147) reads **metres per Combat Turn**, stored across the
   * system as `km/h ÷ 1.2` (a 3-second turn). Feeding km/h straight to `crashDamage` overstates
   * every crash by ~20% and can push it a whole level: 70 km/h is 58 m/turn (Moderate), but
   * read raw it is 70 (Serious).
   * @returns {{ speedKmct: number, power: number, level: string }}
   */
  static crashDamageFromKmh(kmh) {
    const speedKmct = Math.max(0, Number(kmh) || 0) / 1.2;
    return { speedKmct, ...SR3EActor.crashDamage(speedKmct) };
  }

  static _buildCrashDamageHtml(ctx) {
    const speedKmct = ctx.speedKmct ?? 0;
    // The table's answer, unless the GM adjusted it in the standalone crash dialog (TODO 74).
    // Overrides, not a second table: the Chase Scene passes neither and gets the table.
    const table = SR3EActor.crashDamage(speedKmct);
    const power = Number.isFinite(ctx.power) ? ctx.power : table.power;
    const level = ['L', 'M', 'S', 'D'].includes(ctx.level) ? ctx.level : table.level;
    const adjusted = power !== table.power || level !== table.level;
    const soakCtx   = JSON.stringify({
      vehicleActorId:    ctx.vehicleActorId,
      vehicleName:       ctx.vehicleName,
      driverActorId:     ctx.driverActorId,
      soakPool:          ctx.vehicleBody ?? 4,
      power,
      level,
      passengerActorIds: ctx.passengerActorIds ?? [],
    }).replace(/'/g, '&#39;');

    return `
      <div class="sr-staging-result" style="color:#c94040;">
        💥 CRASH! ${ctx.vehicleName} has crashed — speed reduced to 0.
      </div>
      <div class="sr-staging-result">
        Impact at ${Math.round(speedKmct * 1.2)} km/h (${speedKmct.toFixed(1)} m per Combat Turn) → Damage: <strong>${power}${level} Physical</strong>
        ${adjusted ? `<span style="color:var(--sr-muted);font-size:11px"> — set by the GM; the table gives ${table.power}${table.level}</span>` : ''}
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

    /* Occupants · SR3 p.147 — *"If the vehicle takes damage, the driver and passengers must make
     * the same Damage Resistance Test as the vehicle. Apply all vehicle-related Damage Level
     * reductions before making these tests… the characters resist damage from an attack with a
     * Power equal to what the vehicle faced, but at the level of damage that the vehicle
     * actually took."*
     *
     * ⚠ **Ramming too, not just crashes.** The book's own worked example of this paragraph IS a
     * ramming (Cruiser #2's cops). Ramming used to hand passengers the ORIGINAL level, and still
     * made them roll after the vehicle had soaked the hit to nothing. TODO 74. */
    const resistLevel = idx >= 0 ? STAGES[idx] : null;
    const resistLabel = resistLevel ? `${ctx.power}${resistLevel}` : 'No damage';
    if (!resistLevel && (ctx.driverActorId || (ctx.passengerActorIds ?? []).length)) {
      html += `<div class="sr-soak-result" style="font-size:11px;color:var(--sr-muted)">
          The vehicle took no damage, so no one aboard does either (SR3 p.147).</div>`;
    }

    // Driver resists damage as a passenger would
    const driverActor = game.actors.get(ctx.driverActorId);
    if (driverActor && resistLevel) {
      const body = driverActor.system?.attributes?.body?.value ?? driverActor.system?.attributes?.body?.base ?? 3;
      const dCtx = JSON.stringify({ passengerActorId: driverActor.id, passengerName: driverActor.name, power: ctx.power, level: resistLevel, body }).replace(/'/g, '&#39;');
      html += `
        <div class="sr-soak-action">
          <button class="sr-ram-passenger-resist-btn" data-payload='${dCtx}'>
            🧑 ${driverActor.name} (Driver): Resist Damage (${resistLabel} before belt and armour, ${body} Body)
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
            🧑 ${pActor.name}: Resist Passenger Damage (${resistLabel} before belt and armour, ${body} Body)
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

  /**
   * An occupant's damage in a collision, before their Body roll · SR3 p.147 · TODO 74.
   *
   * > *"If a character is wearing a seat belt or other safety restraint during the collision,
   * > stage down the damage by an additional level."*
   * > *"Only impact armor protects against crash damage."*
   *
   * The book's cops: 15S → belted 15M → armour vests (4/3, so Impact 3) → **12M**, resisted with
   * Body against **TN 12**. So a seat belt drops the LEVEL and impact armour drops the POWER —
   * two different axes, and Ballistic armour counts for nothing here.
   *
   * ⚠ A belt on Light damage stages it off the bottom: **no damage** (`level: null`), not Light.
   * ⚠ Power floors at 0 and the TN at 2 — *"Target numbers cannot be reduced below 2"*.
   * @returns {{ power: number, level: string|null, tn: number }}
   */
  static collisionPassengerDamage({ power = 0, level = 'L', impact = 0, belted = false } = {}) {
    const STAGES = ['L', 'M', 'S', 'D'];
    const p   = Math.max(0, Math.trunc(Number(power) || 0) - Math.max(0, Math.trunc(Number(impact) || 0)));
    const idx = STAGES.indexOf(level) - (belted ? 1 : 0);
    return { power: p, level: idx >= 0 ? STAGES[idx] : null, tn: Math.max(2, p) };
  }

  /**
   * Ask the occupant for what the collision card cannot know — their Body dice, their impact
   * armour, and whether they were belted in (SR3 p.147). Opened BEFORE the button is claimed, so
   * cancelling leaves it usable. Impact armour starts from worn + implant armour
   * (`armorRatings`); everything is editable.
   * @returns {Promise<{body:number, impact:number, belted:boolean}|null>}
   */
  static async promptCollisionResist(ctx) {
    const pActor = game.actors.get(ctx.passengerActorId);
    if (!pActor) { ui.notifications.warn('Passenger actor not found.'); return null; }
    const body   = pActor.system?.attributes?.body?.value ?? pActor.system?.attributes?.body?.base ?? ctx.body ?? 3;
    const impact = SR3EActor.armorRatings(pActor).impact;
    const esc    = s => foundry.utils.escapeHTML(String(s ?? ''));
    let out = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: `${pActor.name} — Resist Collision Damage` },
      content: `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 12px;padding:4px 0;font-size:12px">
          <div style="grid-column:1/-1;color:var(--sr-muted)">
            The vehicle took <strong>${ctx.power}${ctx.level}</strong>; ${esc(pActor.name)} resists the same.
          </div>
          <label style="display:flex;flex-direction:column;gap:3px">Body dice
            <input id="cp-body" type="number" value="${body}" min="0" max="30"/></label>
          <label style="display:flex;flex-direction:column;gap:3px"
                 title="Only impact armour protects against crash damage (SR3 p.147). Worn + implant armour.">Impact armour
            <input id="cp-impact" type="number" value="${impact}" min="0" max="30"/></label>
          <label style="grid-column:1/-1;display:flex;align-items:center;gap:6px;cursor:pointer">
            <input id="cp-belt" type="checkbox"/> Seat belt or other restraint — stage down one level</label>
          <div id="cp-out" style="grid-column:1/-1;color:var(--sr-gold)"></div>
        </div>`,
      render: (_e, dialog) => {
        const el  = dialog.element;
        const show = () => {
          const r = SR3EActor.collisionPassengerDamage({
            power: ctx.power, level: ctx.level,
            impact: el.querySelector('#cp-impact').value, belted: el.querySelector('#cp-belt').checked });
          el.querySelector('#cp-out').textContent = r.level
            ? `→ resist ${r.power}${r.level} with Body against TN ${r.tn}`
            : '→ no damage: the belt stages Light damage away entirely';
        };
        el.querySelectorAll('input').forEach(i => { i.addEventListener('input', show); i.addEventListener('change', show); });
        show();
      },
      buttons: [
        { label: '🎲 Resist', action: 'ok', default: true, callback: (_e, _b, d) => {
          const el = d.element;
          out = { body:   Math.max(0, parseInt(el.querySelector('#cp-body').value) || 0),
                  impact: Math.max(0, parseInt(el.querySelector('#cp-impact').value) || 0),
                  belted: el.querySelector('#cp-belt').checked };
        } },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    return out;
  }

  static async handleRamPassengerResist(btn, physicalDice = false, choice = null) {
    const ctx    = JSON.parse(btn.dataset.payload);
    btn.disabled    = true;
    btn.textContent = '⏳ Rolling…';
    const pActor = game.actors.get(ctx.passengerActorId);
    if (!pActor) { ui.notifications.warn('Passenger actor not found.'); return; }
    const c = choice ?? { body: ctx.body ?? 3, impact: 0, belted: false };
    const r = SR3EActor.collisionPassengerDamage({ power: ctx.power, level: ctx.level, impact: c.impact, belted: c.belted });
    const notes = [c.belted ? 'seat belt −1 level' : '', c.impact ? `impact armour −${c.impact} Power` : '']
      .filter(Boolean).join(', ');

    if (!r.level) {
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: pActor }),
        content: `<div class="sr-roll-card"><div class="sr-roll-header">🧑 ${pActor.name}: Collision</div>
          <div class="sr-soak-result sr-soak-blocked">🛡 No damage — ${ctx.power}${ctx.level}, ${notes} (SR3 p.147)</div></div>`,
      });
      return;
    }
    await pActor.rollPool(c.body, r.tn,
      `🧑 ${pActor.name}: Resist Collision Damage — ${r.power}${r.level}${notes ? ` (${notes})` : ''}`, {
        isSoakRoll:  true,
        // ⚠ `actorId` was missing, so the Assign Wound button this roll produces named
        // "Target" and pointed at no actor.
        soakPayload: { actorId: pActor.id, stagedPower: r.power, stagedLevel: r.level, isStun: false },
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

    const _corner = (name, info, weaponName, rawDamage, damageBase, reach, tn, poolClass, tnClass, damageClass, skillDiceClass, role, owner) => {
      const specLine  = info?.specName
        ? `<div class="sr-melee-spec">${info.skillRating} (${info.skillRating + info.specBonus}) – ${info.specName}</div>`
        : '';
      const availPool = info?.availPool ?? 0;
      const skillDice = info?.skillDice ?? 1;

      // Enhanced Articulation and friends (M&M p.66) — a category-wide bonus, opt-in per
      // roll. ⚠ Until now this was read in ONE place, the Roll Skill dialog, so it reached a
      // skill rolled from the sheet and never a melee attack — which is the case it most
      // obviously applies to. Reported from play 2026-08-21.
      const _catActor = game.actors.get(owner ?? '') ?? null;
      const _cat = _catActor
        ? SR3EActor.skillCategoryBonus(
            _catActor.system?.derived?.skillCategoryBonuses ?? [], info?.skillCategory)
        : { dice: 0, labels: [] };

      // ── Where the dice came from ────────────────────────────────────────────────
      //
      // The Skill box used to show a bare total, so a player looking at "12" had no way to
      // tell whether it included their specialisation, their augmentation dice, or neither.
      // Reported from play 2026-08-21: "it's showing 12 dice but I don't see where they are
      // all coming from". Every part is already in `info`; only the rendering was missing.
      /* ── Why this corner rolls the dice it rolls ─────────────────────────────────
       *
       * Every component on its own row, each showing what it contributes and — where the
       * number needed explaining — why. Reported from play twice: first "12 dice but I
       * don't see where they are all coming from", then that a lump "+6 augmentation" named
       * nothing. A row that cannot be accounted for is the thing this exists to prevent.
       */
      const _parts = [];
      if (info?.isDefault) {
        _parts.push({ n: info.skillRating, what: 'attribute', note: 'defaulting — no pool dice' });
      } else {
        _parts.push({ n: info?.skillRating ?? 0, what: info?.skillName ?? 'skill' });
      }
      if (info?.specBonus) {
        _parts.push({ n: info.specBonus, what: info.specName, sign: '+' });
      }

      const _srcs = _catActor?.system?.derived?.skillBonusSources?.[info?.requiredSkill ?? '']
                 ?? _catActor?.system?.derived?.skillBonusSources?.[info?.skillName ?? '']
                 ?? [];
      const _kindLabel = { adept: 'adept power', cyber: 'cyberware', bio: 'bioware' };
      if (_srcs.length) {
        for (const src of _srcs) {
          _parts.push({ n: src.dice, what: src.label, sign: '+',
                        note: src.note ?? _kindLabel[src.kind] ?? null });
        }
      } else if (info?.bonusDice) {
        // Dice with no recorded source. Says so rather than inventing a name — the honest
        // answer to "where did these come from" is sometimes "an item edited by hand".
        _parts.push({ n: info.bonusDice, what: 'augmentation', sign: '+',
                      note: 'source unrecorded — likely an item edited by hand' });
      }
      // ⚠ Rendered even when there is only ONE component. Gating on `length > 1` hid it in
      // exactly the case that prompts the question — "why is this 12?" is asked most often
      // when the 12 is all skill rating and nothing on the card says so.
      //
      // Lives in the corner's RIGHT column, beside the fields rather than under them: the
      // field rows are a 52px label plus a 40px input, so the right half of every corner was
      // dead space.
      const _catRow = _cat.dice ? `
            <label class="sr-bd-opt" title="${_cat.labels.join(' + ')}">
              <input type="checkbox" class="sr-melee-${role === 'attacker' ? 'atk' : 'def'}-cat"
                     data-dice="${_cat.dice}"/>
              <span>+${_cat.dice} ${_cat.labels.join(' + ')}</span>
            </label>` : '';

      const _bdPayload = JSON.stringify({
        actorId: owner ?? '', name, skillName: info?.skillName ?? '',
        requiredSkill: info?.requiredSkill ?? '', skillCategory: info?.skillCategory ?? '',
        skillRating: info?.skillRating ?? 0, specName: info?.specName ?? '',
        specBonus: info?.specBonus ?? 0, skillDice, availPool,
        isDefault: info?.isDefault === true,
        // The corner shows a summary; the dialog shows the whole story, so it is told which
        // side of a melee this corner is — Counterstrike applies to the DEFENDER's roll only.
        role,
      }).replace(/'/g, '&#39;');

      const breakdown = `
          <div class="sr-melee-breakdown">
            <div class="sr-bd-title">Dice
              <button type="button" class="sr-dice-info-btn" data-payload='${_bdPayload}'
                      title="Full breakdown">&#9432;</button>
            </div>
            ${_parts.map(p => `
              <div class="sr-bd-row">
                <span class="sr-bd-n">${p.sign ?? ''}${p.n}</span>
                <span class="sr-bd-what">${p.what}</span>
              </div>
              ${p.note ? `<div class="sr-bd-note sr-bd-why">${p.note}</div>` : ''}`).join('')}
            <div class="sr-bd-total">= ${skillDice} skill dice</div>
            ${_catRow}
          </div>`;
      const tnCalc    = [
        '4',
        reach > 0 ? ` −${reach} reach` : '',
        (info?.isDefault && info?.defaultTnMod) ? ` +${info.defaultTnMod} defaulting` : '',
      ].join('');
      // ── The reach election (p.121) — the LONGER-REACH fighter's call, not the GM's ──
      //
      // "The character with the longer (higher) Reach can choose to apply this number as
      // either a negative target number modifier to his attack test OR as a positive
      // modifier to his opponent's target number." Same magnitude, different target, and
      // the book gives the reason: "beat the opponent's defenses" versus "make himself
      // harder to hit".
      //
      // Rendered ONLY in the holder's corner, so the per-corner owner gate already makes it
      // read-only to everyone else. The system used to take the self-bonus branch silently
      // for both sides — one of the two legal readings, so nothing was WRONG; the choice
      // simply did not exist. It matters now that #24 made the corners read-only, because
      // typing the other branch into the opponent's TN box is no longer possible.
      const holdsReach  = (ctx.reachHolder ?? null) === role;
      const reachDiff   = ctx.reachDiff ?? 0;
      const reachChoice = (holdsReach && reachDiff > 0) ? `
          <div class="sr-melee-field-row">
            <span>Reach ${reachDiff}:</span>
            <div><select class="sr-melee-${role === 'attacker' ? 'atk' : 'def'}-reach" style="width:100%">
              <option value="self" selected>−${reachDiff} to my TN</option>
              <option value="opponent">+${reachDiff} to their TN</option>
            </select></div>
          </div>` : '';

      const displayDamage = damageBase && /STR/i.test(rawDamage)
        ? `${damageBase.power}${damageBase.level}${damageBase.isStun ? ' Stun' : ''}`
        : (rawDamage || '');

      return `
        <div class="sr-melee-corner" data-corner-role="${role}" data-corner-owner="${owner ?? ''}" data-corner-label="${name}">
          <div class="sr-melee-name">${name}</div>
          <div class="sr-melee-skill">
            ${info?.isDefault
              ? `<span style="color:var(--sr-amber)">${info.skillName}</span>`
              : `${info?.skillName ?? 'Unknown skill'}${info?.specName ? '' : ` (${info?.skillRating ?? '?'})`}`}
          </div>
          ${specLine}
          <div class="sr-melee-weapon">${weaponName}
            ${reach > 0 ? (() => {
              const nat = (role === 'attacker' ? ctx.atkNaturalReach : ctx.defNaturalReach) ?? 0;
              return `<span class="sr-melee-reach"${nat > 0 ? ' title="Includes troll natural Reach (SR3 p.121)"' : ''}>`
                   + ` Reach ${reach}${nat > 0 ? ` (troll +${nat})` : ''}</span>`;
            })() : ''}
          </div>
          <div class="sr-melee-corner-body">
          <div class="sr-melee-fields">
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
          ${reachChoice}
          <div class="sr-melee-field-row">
            <span>TN:</span>
            <div style="display:flex;align-items:center;gap:4px">
              <input type="number" class="${tnClass}" value="${tn}" min="2" max="30" style="width:40px"/>
              <span style="font-size:10px">(${tnCalc})</span>
            </div>
          </div>
          </div>
          ${breakdown}
          </div>
        </div>`;
    };

    await ChatMessage.create({
      speaker: { alias: 'Melee Combat' },
      content: `
        <div class="sr-roll-card sr-melee-card" data-twocorner="melee">
          <div class="sr-roll-header">⚔ MELEE — ${atk.name} vs ${def.name}</div>
          ${ctx.calledShot && ctx.calledShot !== 'none' ? `
            <div style="font-size:11px;color:var(--sr-amber);margin:-2px 0 6px;text-align:center">
              🎯 ${atk.name} called shot${ctx.calledShot === 'stage'
                ? ' — stage damage up (+4 TN)'
                : `${ctx.calledShotTarget ? `: ${ctx.calledShotTarget}` : ''} (+4 TN)`}
            </div>` : ''}
          ${ctx.gmSituational ? `
            <div style="font-size:11px;color:var(--sr-accent);margin:-2px 0 6px;text-align:center">
              ⚖ GM situational modifier ${ctx.gmSituational > 0 ? '+' : ''}${ctx.gmSituational}
              ${ctx.gmSituationalSide === 'both' ? '— both fighters'
                : ctx.gmSituationalSide === 'def' ? `— ${def.name}`
                : `— ${atk.name}`}
              <span style="color:var(--sr-dim)">(already in the target numbers)</span>
            </div>` : ''}
          <div class="sr-melee-boxing">
            ${_corner(atk.name, ctx.atkInfo, ctx.atkWeaponName, ctx.atkRawDamage, ctx.atkDamageBase,
                      ctx.atkReach ?? 0, ctx.atkTN, 'sr-melee-atk-pool', 'sr-melee-atk-tn', 'sr-melee-atk-damage', 'sr-melee-atk-skill-dice', 'attacker', ctx.attackerActorId)}
            <div class="sr-melee-vs">VS</div>
            ${_corner(def.name, ctx.defInfo, ctx.defWeaponName, ctx.defRawDamage, ctx.defDamageBase,
                      ctx.defReach ?? 0, ctx.defTN, 'sr-melee-def-pool', 'sr-melee-def-tn', 'sr-melee-def-damage', 'sr-melee-def-skill-dice', 'defender', ctx.defenderActorId)}
          </div>
          ${SR3EActor.cornerActions(payload, [
            { role: 'attacker', label: atk.name, owner: ctx.attackerActorId },
            { role: 'defender', label: def.name, owner: ctx.defenderActorId },
          ])}
        </div>
      `,
      style: CONST.CHAT_MESSAGE_STYLES.ROLL,
    });
  }

  /**
   * The per-role submission ledger for the melee card this button belongs to (TODO 24).
   *
   * Written by each side through `sr3e.card.mark`, so it is document data and identical on
   * every client — unlike the card's DOM, which is whatever the local player has typed.
   * Returns `{}` when nothing has been submitted, which lets every caller fall back to the
   * DOM without a special case.
   */
  static meleeSubmissions(btn) {
    const mid = btn?.closest?.('.message')?.dataset?.messageId;
    return (mid && game.messages?.get(mid)?.getFlag('The2ndChumming3e', 'acted')) || {};
  }

  /**
   * Read a corner's inputs generically, keyed by their own CSS class (TODO 24).
   *
   * Keying on the class rather than on a per-card field map is what lets one mechanism
   * serve all eight two-corner cards: they name their inputs differently
   * (`sr-melee-atk-pool`, `sr-cc-atk-pool`, `sr-miji-int-dice`…) but every one of them
   * identifies a field by a single `sr-` class. Resolution then looks the value up under
   * the same class it would have used on the DOM, so each handler changes from
   * "read the card" to "read this side's submission, else the card".
   */
  /**
   * The submit row + GM override shared by every two-corner card (TODO 24).
   *
   * There is no combined Roll! button anywhere any more: each side submits its own corner
   * and the last submission resolves, which makes the old race structurally impossible
   * rather than merely gated — there is no button for one participant to reach first.
   *
   * The GM override exists because an absent participant would otherwise stall the
   * exchange for ever; unlike the dodge relay there is no blocking dialog here to time out.
   * It writes nothing, so whoever has not answered falls through to the card's defaults.
   *
   * `sides` is `[{ role, label, owner }]` — `role` must match the corner's
   * `data-corner-role`, and `owner` is the actor id whose decider may submit it.
   */
  static cornerActions(payload, sides) {
    return `
      <div class="sr-corner-submit-row" style="display:flex;gap:6px;justify-content:center;margin-top:6px;flex-wrap:wrap">
        ${sides.map(s => `
          <button class="sr-corner-submit-btn" data-role="${s.role}" data-owner="${s.owner ?? ''}"
                  data-payload='${payload}'>✋ ${s.label}: Submit</button>`).join('')}
      </div>
      <div class="sr-soak-action">
        <button class="sr-corner-resolve-btn" data-payload='${payload}'
                title="GM override — resolves now, using card defaults for anyone outstanding">
          ⚔ Resolve now (GM)
        </button>
      </div>`;
  }

  static readCornerEl(cornerEl) {
    const out = {};
    if (!cornerEl) return out;
    cornerEl.querySelectorAll('input, select, textarea').forEach(el => {
      const cls = [...el.classList].find(c => c.startsWith('sr-'));
      if (cls) out[cls] = el.type === 'checkbox' ? el.checked : el.value;
    });
    return out;
  }

  /**
   * One CHECKBOX for one side. Same submitted-first ordering as `cornerField`.
   *
   * ⚠ Separate from `cornerField` because that one falls back to `el.value`, and a
   * checkbox's `.value` is the string "on" whether it is ticked or not — so the fallback
   * path would read every box as checked.
   */
  static cornerChecked(submitted, role, cls, card) {
    const v = submitted?.[role]?.data?.[cls];
    if (typeof v === 'boolean') return v;
    return card?.querySelector(`.${cls}`)?.checked === true;
  }

  /**
   * One field for one side: that side's submitted value, else this card's DOM.
   *
   * The order is the whole point — the DOM belongs to whichever client is resolving, which
   * is exactly the bug. It stays as a fallback only so a GM forcing resolution for an
   * absent participant still gets the card's defaults.
   */
  static cornerField(submitted, role, cls, card) {
    const v = submitted?.[role]?.data?.[cls];
    if (v !== undefined && v !== null && v !== '') return v;
    return card?.querySelector(`.${cls}`)?.value;
  }

  /**
   * Handle the Roll! button click on a melee card.
   * Reads each side's SUBMITTED pool/TN values, rolls both sides, posts results, compares.
   */
  static async handleMeleeRoll(btn, physicalDice = false) {
    const ctx  = JSON.parse(btn.dataset.payload);
    const card = btn.closest('.sr-melee-card');

    // Remember the label rather than hardcoding a restore: since TODO 24 this can be
    // reached from either side's Submit button or the GM's "Resolve now", so restoring a
    // literal "Roll!" on cancel would relabel whichever button was actually clicked.
    const _btnLabel = btn.textContent;
    btn.disabled    = true;
    btn.textContent = '⏳ Rolling…';

    // ── Each side's values come from what THAT side submitted (TODO 24) ──────────────
    //
    // These used to be read straight off `card`, i.e. off whichever client happened to
    // click Roll! — so the attacker supplied the defender's combat pool, TN and damage
    // code and then rolled with them. The submitted values now live in the message flag,
    // written by each side through the GM.
    //
    // The DOM is kept only as a FALLBACK, and it matters that it is second: a GM using
    // "Resolve now" for an absent player legitimately has no submission to read, and
    // falling through to the card's defaults is exactly the intended behaviour there.
    const sub = SR3EActor.meleeSubmissions(btn);
    const f   = (role, cls) => SR3EActor.cornerField(sub, role, cls, card);

    const atkCombatPool = parseInt(f('attacker', 'sr-melee-atk-pool')) || 0;
    let   defCombatPool = parseInt(f('defender', 'sr-melee-def-pool')) || 0;

    // ── Full Defense stage 1: skill dice ONLY ────────────────────────────────────
    //
    // p.123: "A character on Full Defense still makes a Combat Skill Test, but they may not
    // add any Combat Pool dice to the test." The pool is not forbidden outright — it is
    // reserved for the SECOND stage, the Dodge Test, where "only Combat Pool dice may be
    // used". So this zeroes the allocation rather than rejecting it, and the dice go to the
    // dodge that follows.
    const _defFullDefense = !!game.actors.get(ctx.defenderActorId)?.system?.fullDefense;
    if (_defFullDefense && defCombatPool > 0) {
      ui.notifications.info('Full Defense: Combat Pool cannot be added to the skill test — it is held for the Dodge Test (p.123).');
      defCombatPool = 0;
    }
    const atkSkillDice  = parseInt(f('attacker', 'sr-melee-atk-skill-dice')) || ctx.atkSkillDice || 1;
    const defSkillDice  = parseInt(f('defender', 'sr-melee-def-skill-dice')) || ctx.defSkillDice || 1;
    // ── Category-wide bonuses, opted into per corner (M&M p.66) ──────────────────
    //
    // ⚠ Until 2026-08-21 `skillCategoryBonus` was read in ONE place — the Roll Skill dialog —
    // so Enhanced Articulation never reached a melee attack, which is the case it most
    // obviously covers. The tick lives in the corner because the choice is that fighter's,
    // and the corner is already owner-gated.
    const _catDice = (role, cls, actorId, category) => {
      if (!SR3EActor.cornerChecked(sub, role, cls, card)) return 0;
      const a = game.actors.get(actorId);
      if (!a) return 0;
      return SR3EActor.skillCategoryBonus(a.system?.derived?.skillCategoryBonuses ?? [], category).dice;
    };
    const atkCatDice = _catDice('attacker', 'sr-melee-atk-cat', ctx.attackerActorId, ctx.atkInfo?.skillCategory);
    const defCatDice = _catDice('defender', 'sr-melee-def-cat', ctx.defenderActorId, ctx.defInfo?.skillCategory);

    // Provisional: the real dice come from what the pool actually GRANTS, below.
    let atkPool = Math.max(1, atkSkillDice + atkCatDice + atkCombatPool);
    let defPool = Math.max(1, defSkillDice + defCatDice + defCombatPool);
    let atkTN = SR3EActor.cornerTN(f('attacker', 'sr-melee-atk-tn'), ctx.atkTN);
    let defTN = SR3EActor.cornerTN(f('defender', 'sr-melee-def-tn'), ctx.defTN);

    // ── Apply the reach election (p.121) ────────────────────────────────────────
    //
    // The card is posted with the DEFAULT branch already in the holder's TN (−N to
    // themselves), so only the other branch needs work: hand the N back and put it on the
    // opponent instead. Same magnitude either way — this moves it, it never doubles it.
    //
    // ⚠ Read from the holder's SUBMISSION, not from the card DOM. Resolution runs on
    // whichever client completed the pair, which is routinely the opponent — and they must
    // not be able to choose how their enemy's reach is spent. Everything else on this card
    // already works that way; this is the same rule.
    const _reachHolder = ctx.reachHolder ?? null;
    const _reachDiff   = ctx.reachDiff ?? 0;
    if (_reachHolder && _reachDiff > 0) {
      const cls    = _reachHolder === 'attacker' ? 'sr-melee-atk-reach' : 'sr-melee-def-reach';
      const choice = String(f(_reachHolder, cls) ?? 'self');
      if (choice === 'opponent') {
        // BOTH target numbers rise by N, whichever side holds the reach: the holder gives
        // back the bonus baked into the card (−N → 0) and the opponent takes the penalty
        // (0 → +N). The GAP between the two is unchanged — that is the point. Only who is
        // measured against the harder number moves.
        atkTN += _reachDiff;
        defTN += _reachDiff;
      }
    }
    atkTN = Math.max(2, atkTN);
    defTN = Math.max(2, defTN);

    // Read edited damage codes
    const atkRawDamage = String(f('attacker', 'sr-melee-atk-damage') ?? '').trim() || ctx.atkRawDamage;
    const defRawDamage = String(f('defender', 'sr-melee-def-damage') ?? '').trim() || ctx.defRawDamage;
    const atkDamageBase = game.sr3e.SR3EItem.parseDamageCode(atkRawDamage, game.actors.get(ctx.attackerActorId)) ?? ctx.atkDamageBase;
    const defDamageBase = game.sr3e.SR3EItem.parseDamageCode(defRawDamage, game.actors.get(ctx.defenderActorId)) ?? ctx.defDamageBase;

    // Spend combat pool
    const atkActor = game.actors.get(ctx.attackerActorId);
    const defActor = game.actors.get(ctx.defenderActorId);
    // ── Roll what the pool GRANTED, not what was typed ──────────────────────────
    //
    // p.122, on striking several opponents in one phase: "Dice from the Combat Pool must be
    // allocated separately for each attack." The clamp inside spendCombatPool is what
    // enforces that — a second attack can only draw on what the first left behind — and the
    // return value was being discarded, so the dice were built from the REQUEST. Ask for 4
    // with 2 left and you spent 2 and rolled 4, every phase, silently.
    const atkSpent = (atkCombatPool > 0 && atkActor) ? await atkActor.spendCombatPool(atkCombatPool) : 0;
    const defSpent = (defCombatPool > 0 && defActor) ? await defActor.spendCombatPool(defCombatPool) : 0;
    if (atkSpent !== atkCombatPool) {
      ui.notifications.warn(`${atkActor?.name ?? 'Attacker'}: only ${atkSpent} of ${atkCombatPool} Combat Pool dice were available.`);
    }
    if (defSpent !== defCombatPool) {
      ui.notifications.warn(`${defActor?.name ?? 'Defender'}: only ${defSpent} of ${defCombatPool} Combat Pool dice were available.`);
    }
    atkPool = Math.max(1, atkSkillDice + atkCatDice + atkSpent);
    defPool = Math.max(1, defSkillDice + defCatDice + defSpent);

    const atk = game.actors.get(ctx.attackerActorId);
    const def = game.actors.get(ctx.defenderActorId);
    if (!atk || !def) return;

    let atkDice, defDice;
    if (physicalDice) {
      const atkSuccesses = await SR3EActor._promptPhysicalSuccesses(atkPool, atkTN, `⚔ ${atk.name} attacks`);
      if (atkSuccesses === null) { btn.disabled = false; btn.textContent = _btnLabel; return; }
      const defSuccesses = await SR3EActor._promptPhysicalSuccesses(defPool, defTN, `⚔ ${def.name} defends`);
      if (defSuccesses === null) { btn.disabled = false; btn.textContent = _btnLabel; return; }
      atkDice = SR3EActor._buildPhysicalDice(atkPool, atkSuccesses);
      defDice = SR3EActor._buildPhysicalDice(defPool, defSuccesses);
    } else {
      atkDice = atk._rollWave(atkPool, atkTN, true);
      defDice = def._rollWave(defPool, defTN, true);
    }

    const atkOnes   = atkDice.filter(d => d.isOne).length;
    const defOnes   = defDice.filter(d => d.isOne).length;
    const atkGlitch = SR3EActor.isRuleOfOne(atkOnes, atkPool);
    const defGlitch = SR3EActor.isRuleOfOne(defOnes, defPool);

    // Post both wave cards with melee context (use edited damage codes)
    const meleeCtx = {
      ...ctx,
      atkPool, atkTN, defPool, defTN,
      atkRawDamage, atkDamageBase,
      defRawDamage, defDamageBase,
      isMeleeOpposed: true,
      defFullDefense: _defFullDefense,
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
   * Full Defense resolution — the pool-free skill compare, then the optional Dodge Test.
   *  · *SR3 p.123-124*
   *
   * The arithmetic is all in `SR3EActor.fullDefenseOutcome`; this posts what it says.
   *
   * ⚠ The defender NEVER deals damage from this exchange, including when they win the skill
   * test outright. That is the cost of the posture, stated twice in the book.
   */
  static async _postFullDefenseResult(ctx, atkSuccesses, defSuccesses) {
    const atk = game.actors.get(ctx.attackerActorId);
    const def = game.actors.get(ctx.defenderActorId);
    const fd  = SR3EActor.fullDefenseOutcome({ attackHits: atkSuccesses, skillHits: defSuccesses });

    const header = `
      <div class="sr-melee-result" style="border-left:3px solid var(--sr-accent)">
        🛡 <strong>Full Defense</strong> — ${def?.name ?? 'Defender'} rolled
        ${defSuccesses} skill success${defSuccesses !== 1 ? 'es' : ''} (no Combat Pool, p.123)
        vs ${atk?.name ?? 'Attacker'}'s ${atkSuccesses}.
      </div>`;

    let body;
    if (fd.blocked) {
      body = `
        <div class="sr-melee-result sr-melee-tie">
          ✅ Attack <strong>blocked</strong> — the defender had more successes.
          ${def?.name ?? 'The defender'} deals no damage (Full Defense).
        </div>`;
      await ChatMessage.create({ content: `<div class="sr-roll-card">${header}${body}</div>`,
        style: CONST.CHAT_MESSAGE_STYLES.OTHER });
      await def?.clearFullDefense();
      return;
    }

    // Not blocked — the defender "may at this point make a Dodge Test", Combat Pool only.
    const payload = JSON.stringify({
      attackerActorId: ctx.attackerActorId,
      defenderActorId: ctx.defenderActorId,
      targetActorId:   ctx.defenderActorId,
      net:             fd.net,
      atkRawDamage:    ctx.atkRawDamage,
      atkDamageBase:   ctx.atkDamageBase,
      calledShot:      ctx.calledShot ?? null,
      calledShotTarget: ctx.calledShotTarget ?? null,
      // The Melee Modifiers Table applies to this dodge (p.124), and the defender's own TN
      // already carries them from the GM window — so it is reused rather than recomputed.
      defTN:           ctx.defTN ?? 4,
    }).replace(/'/g, '&#39;');

    body = `
      <div class="sr-melee-result sr-melee-win">
        ⚔ Not blocked — attacker's net successes: <strong>${fd.net}</strong>.
        ${def?.name ?? 'The defender'} deals no damage regardless (Full Defense).
      </div>
      <div class="sr-soak-action">
        <button class="sr-fd-dodge-btn" data-payload='${payload}'>
          🎯 ${def?.name ?? 'Defender'} — Dodge Test (Combat Pool only, p.124)
        </button>
      </div>`;

    await ChatMessage.create({ content: `<div class="sr-roll-card">${header}${body}</div>`,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER });
  }

  /**
   * Stage 2 of Full Defense: the defender's Dodge Test, Combat Pool dice ONLY.  · *p.124*
   *
   * ⚠ Its successes SUBTRACT from the attacker's net before staging — not added to the Damage
   * Resistance Test as an ordinary dodge's are (p.113). See `fullDefenseOutcome`.
   */
  static async handleFullDefenseDodge(btn) {
    const ctx = JSON.parse(btn.dataset.payload);
    const def = game.actors.get(ctx.defenderActorId);
    if (!def) return;

    const avail = def.system.derived?.availableCombatPool ?? 0;
    let wanted  = 0;
    await foundry.applications.api.DialogV2.wait({
      window: { title: `${def.name} — Full Defense Dodge` },
      content: `
        <p style="margin-bottom:8px">The attack was not blocked — <strong>${ctx.net}</strong>
        net success${ctx.net !== 1 ? 'es' : ''} stand.</p>
        <p style="margin-bottom:8px;font-size:11px;color:var(--sr-amber)">
          Only Combat Pool dice may be used (p.124). Every dodge success cancels one of the
          attacker's net successes before damage is staged.</p>
        <label style="display:block">Combat Pool dice (available ${avail}):
          <input type="number" id="fd-dodge" value="0" min="0" max="${avail}" style="width:60px;margin-left:6px"/>
        </label>`,
      buttons: [
        { label: '🎲 Dodge', action: 'go', default: true,
          callback: (_e, _b, d) => { wanted = Math.max(0, parseInt(d.element.querySelector('#fd-dodge')?.value) || 0); } },
        { label: 'No dodge', action: 'skip' },
      ],
    });

    // Roll the grant, not the request — see tests/pool-spend.test.mjs.
    const spent = wanted > 0 ? await def.spendCombatPool(wanted) : 0;
    if (spent !== wanted) {
      ui.notifications.warn(`${def.name}: only ${spent} of ${wanted} Combat Pool dice were available.`);
    }
    await def.clearFullDefense();

    const tn = Math.max(2, parseInt(ctx.defTN) || 4);
    const dice = spent > 0 ? def._rollWave(spent, tn, true) : [];
    const ones = dice.filter(d => d.isOne).length;

    await def._postWaveCard({
      actorId:  ctx.defenderActorId,
      label:    `🎯 ${def.name} — Full Defense Dodge (TN ${tn})`,
      tn,
      pool:     spent,
      wave:     0,
      dice,
      ones,
      glitch:   SR3EActor.isRuleOfOne(ones, spent),
      isWeaponRoll: false,
      isFullDefenseDodge:  true,
      fullDefenseContext:  ctx,
    });
  }

  /**
   * Post the melee result — announces winner, staged damage, and resist button.
   */
  static async _postMeleeResult(ctx, atkDice, defDice) {
    const atkSuccesses = atkDice.filter(d => d.success).length;
    const defSuccesses = defDice.filter(d => d.success).length;

    const atk = game.actors.get(ctx.attackerActorId);
    const def = game.actors.get(ctx.defenderActorId);

    // ── Full Defense takes a different shape entirely (p.123-124) ───────────────
    if (ctx.defFullDefense) {
      return SR3EActor._postFullDefenseResult(ctx, atkSuccesses, defSuccesses);
    }

    // p.122 step 3: "The character who rolls the most successes has hit... A tie goes in
    // favor of the attacker." One pure function — see meleeOutcome.
    const _mo         = SR3EActor.meleeOutcome(atkSuccesses, defSuccesses);
    const net         = _mo.net;

    let resultHtml;

    {
      const winnerIsAtk  = _mo.winnerIsAtk;
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

      // ⚠ `net >= 0`, not `> 0`. A tie is a HIT with net 0 (p.122), so the weapon still does
      // its base Damage Level and the loser still resists — gating on `> 0` would post no soak
      // button and silently delete the attack.
      if (winnerDmgBase) {
        // Melee stages Power past Deadly (p.122) — the exception to the general
        // "Deadly is the ceiling" rule (p.113). This used to be an inline copy of the
        // staging loop, which is why capping stageDamage for the ranged fix left melee
        // silently correct and astral silently wrong. One implementation, one flag.
        const STAGES = ['L','M','S','D'];
        const origIdx = STAGES.indexOf(winnerDmgBase.level);
        const _st   = game.sr3e.SR3EItem.stageDamage(winnerDmgBase, net, { meleeRules: true });
        let   idx   = STAGES.indexOf(_st.level);
        let   power = _st.power;

        // Charging Attack (CC p.86): +1 POWER, and only when the charge actually lands. It is
        // the attacker's option, so it does nothing when the defender wins.
        if (winnerIsAtk && ctx.charging) power += SR3EActor.chargingPowerBonus(true);

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

        // A failed charge with damage taken: the charger's Knockdown Test is at +2 INSTEAD of
        // a Quickness test (CC p.86). The loser here IS the charger when the defender won.
        const _chargeFailed = ctx.charging && !winnerIsAtk;
        const _kdMod = SR3EActor.chargingFailure({
          attackFailed: _chargeFailed, knockdownRequired: true,
        }).knockdownTNMod;

        const soakPayload = JSON.stringify({
          attackerActorId: ctx.attackerActorId,
          targetActorId:   loser?.id,
          isMelee:         true,
          knockdownTNMod:  _chargeFailed ? _kdMod : 0,
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

    // ⚠ "Instead" is EXCLUSIVE — a charger who took damage does NOT also roll Quickness. When
    // no damage lands there is no Knockdown Test to modify, so the Quickness (5) Test is the
    // only consequence, and it needs its own button.
    let chargeHtml = '';
    if (ctx.charging) {
      if (winnerIsAtk) {
        chargeHtml = `<div class="sr-staging-result">🏃 Charging Attack — <strong>+1 Power</strong> (CC p.86)</div>`;
      } else {
        const cf = SR3EActor.chargingFailure({ attackFailed: true, knockdownRequired: !!winnerDmgBase });
        chargeHtml = cf.quicknessTN !== null
          ? `<div class="sr-melee-result sr-melee-tie">
               🏃 Charge failed — ${atk?.name ?? 'The attacker'} must make a
               <strong>Quickness (${cf.quicknessTN}) Test</strong> or fall prone.
               <div class="sr-soak-action">
                 <button class="sr-charge-quickness-btn" data-payload='${JSON.stringify({
                   actorId: ctx.attackerActorId, targetActorId: ctx.attackerActorId, tn: cf.quicknessTN,
                 }).replace(/'/g, '&#39;')}'>🏃 Quickness (${cf.quicknessTN}) Test</button>
               </div>
             </div>`
          : `<div class="sr-melee-result sr-melee-tie">
               🏃 Charge failed — the Knockdown Test below is at <strong>+${cf.knockdownTNMod}</strong>
               instead of a separate Quickness Test (CC p.86).
             </div>`;
      }
    }

      resultHtml = _mo.tie
        ? `<div class="sr-melee-result sr-melee-win">
             ⚔ Tie — ${atkSuccesses} vs ${defSuccesses}. <strong>A tie goes to the attacker</strong> (p.122):
             ${winnerName} hits for base damage.
           </div>
           ${stagingHtml}
           ${chargeHtml}
           ${soakBtn}`
        : `<div class="sr-melee-result sr-melee-win">
             ⚔ ${winnerName} wins! ${atkSuccesses} vs ${defSuccesses} (net ${net})
           </div>
           ${stagingHtml}
           ${chargeHtml}
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
      // Dodge hits that failed to beat the attack still count toward resisting.
      carriedSuccesses: payload.carriedSuccesses ?? 0,
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
  /**
   * Resolve the defender's post-roll defence decision (SR3 sequence step 4).
   *
   * Asks the DEFENDER — on their own screen — whether to dodge, now that they can
   * see how many successes they have to beat. The pool spend routes through the GM,
   * and a declaration of 0 falls straight through to the Damage Resistance Test.
   *
   * @param {object} ctx  payload from `.sr-dodge-declare-btn`
   */
  static async handleDodgeDeclare(ctx) {
    const { SR3EQuery, SR3EItem } = game.sr3e;
    const targetActor = game.actors.get(ctx.targetActorId);
    if (!targetActor) return;

    const exchangeId = foundry.utils.randomID();
    const deciderId  = SR3EQuery.deciderFor(targetActor);
    const reserved   = SR3EActor._fullDefenseDice(targetActor);

    // Full Defense is already declared — no question to ask.
    let wanted  = reserved;
    let mode    = 'dodge';
    let parryTN = 0;
    if (reserved === 0) {
      const declared = await SR3EQuery.ask(deciderId, 'sr3e.dodge.declare', {
        exchangeId,
        defenderUuid:    targetActor.uuid,
        attackerName:    ctx.attackerName ?? 'The attacker',
        weaponName:      ctx.rawDamage ?? 'the attack',
        attackSuccesses: ctx.attackSuccesses ?? 0,
        // So the defender sees the TN they are actually rolling against — dodging a
        // ten-round burst while wounded is a very different call from a plain 4.
        burstRounds:     ctx.burstRounds   ?? 0,
        shotgunSpread:   ctx.shotgunSpread ?? 0,
        // Missile Parry (p.170) needs both: it is offered only for a catchable weapon, and
        // its TN is 10 minus the base TN of the band the attack came from.
        weaponType:      ctx.weaponType    ?? null,
        rangeBandIdx:    ctx.rangeBandIdx  ?? null,
      }, { fallback: { dice: 0, mode: 'dodge' } });   // AFK → no defence, resolution continues
      wanted = Math.max(0, declared?.dice ?? 0);
      mode   = declared?.mode === 'parry' ? 'parry' : 'dodge';
      parryTN = declared?.parryTN ?? 0;
    }

    /* Missile Parry · SR3 p.170. A Free Action rolling REACTION plus any pool the defender
     * chose, so — unlike a dodge — zero pool is a perfectly valid declaration and must not
     * fall through to the soak. */
    if (mode === 'parry') {
      const committedPool = wanted > 0 ? await targetActor.spendCombatPool(wanted) : 0;
      return SR3EActor._rollMissileParry(targetActor, committedPool, { ...ctx, parryTN });
    }

    let committed = 0;
    if (wanted > 0) {
      committed = await targetActor.spendCombatPool(wanted);
      if (reserved > 0) {
        await SR3EActor._announceFullDefense(targetActor, committed);
        await targetActor.clearFullDefense();
      }
    }

    if (committed > 0) {
      return SR3EActor._rollDodge(targetActor, committed, { ...ctx, committedDodgeDice: committed });
    }
    // Declined, or nothing left to spend — straight to the Damage Resistance Test.
    return SR3EActor.postSoakCard(ctx.targetActorId, ctx);
  }

  /**
   * Resolve a Dodge Test against an Attack Test. **Pure — no Foundry, no I/O.**
   *
   * Both SR3 rules live here so there is exactly one place to get them wrong:
   *
   * 1. **A tie is a HIT.** "A clean miss occurs if the number of successes from the
   *    target's Combat Pool dice EXCEEDS the attacker's successes", and "if the
   *    number of successes obtained on the Dodge Test are MORE THAN the Attacker
   *    achieved". Both strict. Do not relax to `>=`.
   * 2. **A failed dodge is not a wasted dodge.** "Even if you don't dodge
   *    completely, the successes still count and are added to the Damage Resistance
   *    Successes." They carry — but they do NOT reduce staging, which is computed
   *    from the attacker's raw successes.
   *
   * @param {number} dodgeHits
   * @param {number} attackHits
   * @returns {{cleanMiss: boolean, carried: number}}
   */
  /**
   * Resolve one corner's target number on a two-corner card.
   *
   * Precedence: what the user typed → the value computed when the card was built →
   * the SR3 base of 4. Floored at 2, because "no target number can ever be less than
   * 2" (p.112).
   *
   * Pure, and extracted for a reason. This lived inline in eight handlers with two
   * different behaviours: melee, astral and Defragged cybercombat fell back to a
   * **hardcoded 4**, silently discarding the reach differential, the defaulting
   * penalty and the called-shot +4 that `ctxTN` carries; the other five fell back to
   * `ctxTN` with no final guard, so a missing field yielded `Math.max(2, undefined)`
   * — **NaN**, which fails every die. One function has one behaviour.
   *
   * ⚠ A typed **0** falls through to `ctxTN`, not to the floor of 2 — `0` is falsy.
   * That is existing behaviour, pinned by tests rather than changed: a GM typing 0
   * most likely means "as low as possible", so if this is ever revisited, treat it as
   * a deliberate decision and not a tidy-up.
   *
   * @param {string|number|undefined} raw    the card input's value, if the input exists
   * @param {number|undefined} ctxTN         the TN computed when the card was built
   * @param {number} [floor=4]               last resort when neither is usable
   * @returns {number} a target number of at least 2
   */
  static cornerTN(raw, ctxTN, floor = 4) {
    return Math.max(2, parseInt(raw) || ctxTN || floor);
  }

  /**
 * Target number for a Dodge Test — **pure**.  · *SR3 p.113*
 *
 * The book gives the base and all three modifiers in one place:
 *
 *   > "The base target number for this test is 4. The following modifiers apply:
 *   >  • +1 per 3 rounds fired from a burst-fire or full-auto weapon.
 *   >  • +1 per meter of shotgun spread at the target's position (see Shotguns, p. 117).
 *   >  • + Damage Modifiers (p. 126)."
 *
 * All three were missing: `_rollDodge` hardcoded 4, so dodging a ten-round burst was exactly
 * as easy as dodging one pistol shot, and a defender at Serious dodged as though unhurt.
 *
 * ⚠ **The wound modifier is not an oversight in the book — it is worked in the example.**
 * p.113: *"He rolls his 5 Combat Pool dice against a Target Number 5 (4, plus one from the
 * Light wound he took earlier)."* That single parenthesis is the whole rule.
 *
 * ⚠ **`woundMod` is NEGATIVE here**, matching `system.woundMod` everywhere else in this
 * codebase (`Math.min(0, …)`, a penalty carried as a negative). It is SUBTRACTED, exactly as
 * `rollPool` does at its own TN line. Passing a positive number silently makes wounded
 * characters *harder* to hit, which is the one mistake here that looks fine on screen.
 *
 * ⚠ **Burst rounds are the rounds AIMED AT THIS TARGET — not `roundsExpended`.** Walking-fire
 * waste is fired, and counts for recoil, the phase cap and the magazine (see
 * `SR3EItem.roundsExpended`), but it travels *between* targets. It is not volume of fire this
 * defender is dodging, so it is excluded here for the same reason it is excluded from damage.
 *
 * Shotgun spread is a parameter with no caller yet — `choke` is not modelled. See TODO 57.
 *
 * Every modifier is non-negative, so the p.112 floor of 2 cannot bite and is not applied;
 * the result is never below the base 4.
 *
 * @param {object}  [o]
 * @param {number}  [o.burstRounds=0]    rounds sent at THIS target from a BF/FA weapon
 * @param {number}  [o.shotgunSpread=0]  metres of shot spread at the target's position
 * @param {number}  [o.woundMod=0]       the DEFENDER's wound modifier, negative
 * @returns {number} the Dodge Test target number
 */
  static dodgeTN({ burstRounds = 0, shotgunSpread = 0, woundMod = 0 } = {}) {
    const n = v => Math.max(0, Math.trunc(Number(v) || 0));
    const wound = Math.min(0, Math.trunc(Number(woundMod) || 0));
    return 4 + Math.floor(n(burstRounds) / 3) + n(shotgunSpread) - wound;
  }

  /**
   * The parts of a Dodge Test TN, for showing the defender why it is not 4.
   * Same inputs and same arithmetic as `dodgeTN` — kept beside it so they cannot drift.
   *
   * @returns {string[]} human-readable fragments, empty when the TN is a plain 4
   */
  static dodgeTNParts({ burstRounds = 0, shotgunSpread = 0, woundMod = 0 } = {}) {
    const n = v => Math.max(0, Math.trunc(Number(v) || 0));
    const wound = Math.min(0, Math.trunc(Number(woundMod) || 0));
    const parts = [];
    const burst = Math.floor(n(burstRounds) / 3);
    if (burst)         parts.push(`+${burst} burst (${n(burstRounds)} rounds)`);
    if (n(shotgunSpread)) parts.push(`+${n(shotgunSpread)} shot spread`);
    if (wound)         parts.push(`+${-wound} wound`);
    return parts;
  }

  /**
   * Who hit, and by how much, in a standard melee exchange — **pure**.  · *SR3 p.122*
   *
   * Step 3 of the melee sequence, in full:
   *
   *   > "Compare Successes — The character who rolls the most successes has hit his or her
   *   >  opponent. **A tie goes in favor of the attacker.**"
   *
   * ⚠ **A TIE IS A HIT FOR THE ATTACKER**, with net 0 — so step 4 stages nothing and the
   * weapon does its base Damage Level, which the defender then resists at step 5. The system
   * announced "Tie! no damage dealt" instead, which deletes a whole attack.
   *
   * This is the same rule, and the same mistake, as the ranged Dodge Test tie already pinned in
   * `dodgeOutcome` — a strict comparison read as though equality favoured the defender. Melee
   * had it in the opposite direction and was never checked against the book.
   *
   * @param {number} atkHits
   * @param {number} defHits
   * @returns {{winnerIsAtk: boolean, net: number, tie: boolean}}
   */
  static meleeOutcome(atkHits, defHits) {
    const a = Math.max(0, Math.trunc(Number(atkHits) || 0));
    const d = Math.max(0, Math.trunc(Number(defHits) || 0));
    const winnerIsAtk = a >= d;                      // >= : the tie goes to the attacker
    return { winnerIsAtk, net: winnerIsAtk ? a - d : d - a, tie: a === d };
  }

  /**
   * Full Defense — the whole two-stage rule, **pure**.  · *SR3 p.123-124*
   *
   *   > "Attacked characters may choose to only defend themselves. Characters who choose this
   *   >  option **do not do any damage to their opponent**, even if they achieve more successes
   *   >  on their Combat Skill Test.
   *   >
   *   >  A character on Full Defense still makes a Combat Skill Test, but they **may not add any
   *   >  Combat Pool dice** to the test. Compare the successes… If the defender has achieved
   *   >  more successes, the attack has been blocked. Otherwise, note the attacker's net
   *   >  successes.
   *   >
   *   >  The defender may **at this point** make a Dodge Test… **Only Combat Pool dice may be
   *   >  used for this test.** The target number is 4, and any applicable modifiers from the
   *   >  Melee Modifiers Table… A clean miss occurs if the target's successes from Combat Pool
   *   >  dice alone **exceed** the attacker's net successes.
   *   >
   *   >  Otherwise, **subtract the Dodge successes from the attacker's** and apply any remaining
   *   >  successes to staging up the Damage Level."
   *
   * ⚠ **THE DODGE SUBTRACTS FROM STAGING HERE. That is the opposite of the standard rule**, and
   * it is the single most dangerous thing to "unify" in this file. p.113's ordinary Dodge Test
   * says the successes *"are added to the Damage Resistance Successes"* and explicitly do NOT
   * reduce staging (see `dodgeOutcome`). Full Defense's second-stage dodge instead comes off the
   * attacker's net BEFORE staging. Two different dodges, two different arithmetics; reusing
   * `dodgeOutcome` here would silently make Full Defense worse than a normal dodge.
   *
   * ⚠ **Both comparisons are strict, and they point in OPPOSITE directions.** The block needs
   * the defender to have *more* successes; the clean miss needs the dodge to *exceed* the net.
   * A tie on the skill test is therefore not a block — it is net 0, base damage, and the
   * defender still gets to dodge.
   *
   * ⚠ **`dealsDamage` is always false**, even when the defender wins outright. The book says so
   * twice over ("do not do any damage… even if they achieve more successes"), and it is the
   * price of the posture rather than an edge case.
   *
   * @param {object} o
   * @param {number} o.attackHits  the attacker's Combat Skill Test successes
   * @param {number} o.skillHits   the defender's Combat Skill Test successes, POOL-FREE
   * @param {number} [o.dodgeHits] second-stage Dodge Test successes, Combat Pool dice only
   * @returns {{blocked: boolean, net: number, cleanMiss: boolean, remaining: number,
   *            dealsDamage: boolean}}
   */
  static fullDefenseOutcome({ attackHits = 0, skillHits = 0, dodgeHits = 0 } = {}) {
    const n = v => Math.max(0, Math.trunc(Number(v) || 0));
    const a = n(attackHits), d = n(skillHits), g = n(dodgeHits);

    const blocked = d > a;                       // strict: a tie is NOT a block
    const net     = blocked ? 0 : a - d;
    const cleanMiss = !blocked && g > net;       // strict: "exceed the attacker's net successes"
    const remaining = blocked || cleanMiss ? 0 : Math.max(0, net - g);

    return { blocked, net, cleanMiss, remaining, dealsDamage: false };
  }

  /**
   * Knockdown — the whole rule, **pure**.  · *SR3 p.124*
   *
   *   > "Characters struck in ranged or melee combat may be knocked back or possibly down by
   *   >  the blow. When struck, the character must make a Body Test. Against ranged attacks,
   *   >  the target is equal to one-half the Power of the attack, rounding down. Against melee
   *   >  attacks, the target number is the opponent's Strength…
   *   >
   *   >  If the character rolls no successes, he falls down (prone). If he rolls successes,
   *   >  but does not generate enough for his wound level, the character remains standing but
   *   >  takes a step or two away from the direction of the attack (approximately one meter)…
   *   >  If for some reason he cannot step backward (for example, he is up against a wall), he
   *   >  fights at a +2 modifier to his target numbers until he is able to move away.
   *   >  Characters who take a Deadly wound are always knocked down."
   *
   * Knockdown Table — minimum successes to stay standing: **L 2 · M 3 · S 4 · D never**.
   * Verified against p.124 on 2026-08-20; the table extracts cleanly and the prose confirms it
   * independently (*"a character who has taken a Moderate wound must roll at least 3
   * successes"*), so the old warning about a scrambled transcription does not apply.
   *
   * ⚠ **A DEADLY WOUND SKIPS THE TEST ENTIRELY.** Not "needs a very high roll" — there is no
   * number that saves you, which is why the table prints NA rather than 5. Rolling anyway and
   * comparing against an impossible threshold gives the same answer today and stops doing so
   * the moment anyone adds a bonus to the test.
   *
   * ⚠ **WHICH wound level is genuinely ambiguous in the book**, and this takes the per-attack
   * reading. p.124 says both *"how severely damaged the character is"* / *"does not generate
   * enough for **his wound level**"* (the character's condition, cumulative) and *"has taken a
   * Moderate wound"* / *"Characters who **take** a Deadly wound"* (this blow). They agree only
   * for an unhurt target. The per-attack reading wins here for a system-specific reason:
   * damage is never applied automatically, so when this card is built the new wound is not on
   * the sheet yet and the cumulative figure would ignore the hit that caused the test. The
   * threshold is left **editable** on the card, and the target's current wound level is shown
   * beside it, so a table reading it the other way changes one number.
   *
   * @param {object} o
   * @param {string} o.level      damage level actually taken: 'L' | 'M' | 'S' | 'D'
   * @param {number} [o.successes] Body Test successes
   * @param {boolean} [o.tested=true] false when no test has been rolled yet
   * @returns {{needed: number|null, automatic: boolean, knockedDown: boolean,
   *            staggered: boolean, standing: boolean}}
   */
  static knockdownOutcome({ level, successes = 0, tested = true } = {}) {
    const NEEDED = { L: 2, M: 3, S: 4 };
    const lvl    = String(level ?? '').toUpperCase();

    // Deadly is not a hard test, it is no test: "always knocked down".
    if (lvl === 'D') {
      return { needed: null, automatic: true, knockedDown: true, staggered: false, standing: false };
    }

    const needed = NEEDED[lvl] ?? null;
    // An unknown or absent level means nothing was taken — no wound, no knockdown.
    if (needed === null || !tested) {
      return { needed, automatic: false, knockedDown: false, staggered: false, standing: true };
    }

    const hits = Math.max(0, Math.trunc(Number(successes) || 0));
    if (hits === 0)      return { needed, automatic: false, knockedDown: true,  staggered: false, standing: false };
    if (hits < needed)   return { needed, automatic: false, knockedDown: false, staggered: true,  standing: true };
    return { needed, automatic: false, knockedDown: false, staggered: false, standing: true };
  }

  /**
   * Target number for the Knockdown Body Test — **pure**.  · *SR3 p.124, p.116*
   *
   * ⚠ **Ranged uses HALF the attack's POWER — not the soak TN.** The soak rolls against
   * Power minus armour; knockdown ignores armour entirely and halves the raw Power.
   *
   * ⚠ **Melee uses the opponent's STRENGTH ATTRIBUTE**, not the weapon's damage code — even
   * though melee damage is usually written as (STR)M and the two often coincide.
   *
   * ⚠ **Gel rounds are the exception, and they are not halved** (p.116): *"against weapons
   * firing gel rounds the target number for the Body Test to resist knockdown is against the
   * full Power of the attack"*. Gel already carries an armour exception through the same
   * `ammoType`, so both live off one field.
   *
   * @param {object} o
   * @param {number} [o.power]        the attack's Power — ranged
   * @param {number} [o.strength]     the attacker's Strength — melee
   * @param {boolean} [o.isMelee]
   * @param {string} [o.ammoType]
   * @returns {number} a target number of at least 2
   */
  static knockdownTN({ power = 0, strength = 0, isMelee = false, ammoType = null } = {}) {
    if (isMelee) return Math.max(2, Math.trunc(Number(strength) || 0));
    const p = Math.max(0, Math.trunc(Number(power) || 0));
    return Math.max(2, ammoType === 'gel' ? p : Math.floor(p / 2));
  }

  /**
   * Skill-CATEGORY bonus dice available for one skill — **pure**.  · *M&M p.66*
   *
   * Enhanced Articulation is the case this exists for:
   *
   *   > "Possessors roll an additional die when making any Success Test involving Combat,
   *   >  Physical, Technical and Build/Repair Skills. The bonus **also applies to physical use
   *   >  of Vehicle Skills** — driving a car via datajack or piloting a submarine does not
   *   >  qualify for the bonus."
   *
   * ⚠ **FIVE categories, not four.** TODO 10 recorded four and missed the Vehicle sentence;
   * all five exist verbatim in `ACTIVE_SKILL_CATEGORIES`, so the mapping is exact.
   *
   * ⚠ **This is deliberately NOT folded into `skillBonusDice`.** That map is applied
   * automatically at every roll path, and its own doc says consumers must trust it. A category
   * bonus cannot make that promise: the Vehicle clause turns on *"physical use"*, which is a
   * judgement about what the character is doing, not something derivable from the sheet. So a
   * category bonus is **opt-in per roll** — a checkbox on the Roll Skill dialog — and lives in
   * its own derived list. Keeping them apart is what lets `skillBonusDice` keep meaning
   * "always applies".
   *
   * Matching is case-insensitive and trimmed, because the category is free text on the item.
   *
   * @param {Array<{label?: string, dice?: number, categories?: string[]}>} bonuses
   *        `actor.system.derived.skillCategoryBonuses`
   * @param {string} category  the skill's category, e.g. 'Combat skills'
   * @returns {{dice: number, labels: string[]}} total dice offered, and what to call them
   */
  static skillCategoryBonus(bonuses, category) {
    // ⚠ A skill matches its OWN category and anything that category COUNTS AS. Cannon
    // Companion p.87 makes martial arts "considered a Combat skill", so Enhanced Articulation
    // reaches MA:Aikido even though its category string is 'Martial Arts'. Without this a
    // martial artist got the die on Unarmed Combat and Edged Weapons but not on the skill
    // they actually roll — reported from play 2026-08-21. See SKILL_CATEGORY_COUNTS_AS.
    const want = (game.sr3e?.SR3E?.skillCategoriesFor?.(category) ?? [category])
      .map(c => String(c ?? '').trim().toLowerCase())
      .filter(Boolean);
    if (!want.length) return { dice: 0, labels: [] };

    let dice = 0;
    const labels = [];
    for (const b of (Array.isArray(bonuses) ? bonuses : [])) {
      const n = Math.trunc(Number(b?.dice) || 0);
      if (n <= 0) continue;
      const cats = (Array.isArray(b?.categories) ? b.categories : [])
        .map(c => String(c ?? '').trim().toLowerCase());
      // ⚠ `some`, not `includes` — one match anywhere is enough, and a bonus covering BOTH a
      // category and something it counts as must still only pay out once.
      if (!want.some(w => cats.includes(w))) continue;
      dice += n;
      if (b.label) labels.push(b.label);
    }
    return { dice, labels };
  }

  /**
   * Split an item's free-text `improvedSkillCategory` into category names.
   * Commas only — category names themselves contain a slash ("Build/Repair skills").
   */
  static parseSkillCategories(raw) {
    return String(raw ?? '')
      .split(',')
      .map(c => c.trim())
      .filter(Boolean);
  }

  /**
   * What a failed Charging Attack costs the charger — **pure**.  · *Cannon Companion p.86*
   *
   *   > "A running start can increase the effectiveness of an attack. If a character moved **2
   *   >  or more meters** to attack his target, he gains a **+1 bonus to the Power** of the
   *   >  attack…
   *   >
   *   >  If a character **fails** a charging attack (the defender wins or dodges), the character
   *   >  must make a **Quickness (5) Test or fall prone**. If the character must already make a
   *   >  Knockdown Test because the defender inflicted damage, **modify that target number by +2
   *   >  instead**."
   *
   * ⚠ **"Instead" is exclusive — it is one test or the other, never both.** A charger who ate a
   * counter-attack does NOT roll Quickness as well; their existing Knockdown Test simply gets
   * harder. Running both would punish the same failure twice, and is the obvious way to write
   * this wrong.
   *
   * ⚠ **The +2 lands on the CHARGER's Knockdown Test**, which is the one they make because the
   * DEFENDER hurt them — not on any test the defender makes.
   *
   * ⚠ **+1 POWER, not a target number.** Almost everything else on the melee surface moves a TN;
   * this moves damage, and only when the charge lands.
   *
   * @param {object} o
   * @param {boolean} o.attackFailed       the defender won or dodged
   * @param {boolean} [o.knockdownRequired] the charger is already making a Knockdown Test
   * @returns {{quicknessTN: number|null, knockdownTNMod: number}}
   */
  static chargingFailure({ attackFailed = false, knockdownRequired = false } = {}) {
    if (!attackFailed)     return { quicknessTN: null, knockdownTNMod: 0 };
    if (knockdownRequired) return { quicknessTN: null, knockdownTNMod: 2 };
    return { quicknessTN: 5, knockdownTNMod: 0 };
  }

  /* ══════════════════════════════════════════════════════════════════════════════
   *  Adept powers — pure rules.  TODO 60, 63, 64.
   *
   *  All of these are Foundry-free so they can be unit-tested and mutated. Each is the
   *  single implementation of its rule; nothing below re-derives them inline.
   * ══════════════════════════════════════════════════════════════════════════════ */

  /**
   * Powers that change a specific derived number rather than granting dice.
   *
   * Kept apart from `SR3E.adeptPowerEffects` because each lands somewhere different —
   * armour, the wound modifier, an unarmed damage code — and a generic table that could
   * express all of them would be harder to read than four named cases.
   */
  static _directPowerKind(name) {
    const n = String(name ?? '').trim();
    if (/^pain resistance/i.test(n))     return 'painResistance';
    if (/^mystic armor/i.test(n))        return 'mysticArmor';
    if (/^penetrating strike/i.test(n))  return 'penetratingStrike';
    if (/^killing hands/i.test(n))       return 'killingHands';
    if (/^missile parry/i.test(n))       return 'missileParry';
    return null;
  }

  /**
   * The Damage Level a Killing Hands power was purchased at · *SR3 p.170*
   *
   * Ships as four separate items — `Killing Hands STR(Light)` through `(Deadly)` — at .5, 1,
   * 2 and 4 Power Points, so the level is in the name and nowhere else.
   */
  /* ══════════════════════════════════════════════════════════════════════════════
   *  Karma & advancement · SR3 p.244-245 — TODO 80
   *
   * Pure, and living here rather than on the sheet for the usual reason: the sheet cannot be
   * imported without Foundry, and every one of these is a costing rule that a test should be
   * able to pin. `SR3EActorSheet` delegates.
   *
   * ⚠ **The book's worked examples cannot distinguish right from wrong here**, which is how
   * six defects survived. Every printed cost lands on an integer, where rounding up and
   * rounding down agree; and Brick's Stealth 5 / Quickness 6 is one apart, where the
   * skill-rating and attribute-rating specialisation caps agree. Tests must use the
   * fractional and divergent cases deliberately.
   * ══════════════════════════════════════════════════════════════════════════════ */

  /**
   * Cost to raise a skill to `newRating` · *SR3 p.245, Skill Improvement Cost Table*
   *
   * | New rating is… | Active | Knowledge/Language |
   * |---|---|---|
   * | ≤ the linked Attribute | 1.5 | 1 |
   * | ≤ 2× the linked Attribute | 2 | 1.5 |
   * | > 2× the linked Attribute | 2.5 | 2 |
   *
   * ⚠ **"Multiply the number given on the table by the new rating (round fractions DOWN)."**
   * This was `Math.ceil` until 2026-08-31, overcharging roughly half of all purchases by one
   * — an active skill to 3 at or below its attribute cost 5 where the book charges 4. Every
   * worked example in the book lands on an integer, so none of them catch it.
   */
  static karmaSkillCost(newRating, attrRating, isActive) {
    const n = Number(newRating) || 0;
    const a = Number(attrRating) || 0;
    const m = n <= a     ? (isActive ? 1.5 : 1)
            : n <= 2 * a ? (isActive ? 2   : 1.5)
            :              (isActive ? 2.5 : 2);
    return Math.floor(n * m);
  }

  /**
   * Cost to raise a specialisation to `newRating` · *SR3 p.245*
   *
   * ⚠ **Identical for active and knowledge skills** — the table's two specialisation columns
   * are the same (.5 / 1 / 1.5). Taking no `isActive` argument looks like an omission beside
   * `karmaSkillCost` and is not one; do not "fix" it.
   *
   * ⚠ Rounds DOWN, same clause as above.
   */
  static karmaSpecCost(newRating, attrRating) {
    const n = Number(newRating) || 0;
    const a = Number(attrRating) || 0;
    const m = n <= a ? 0.5 : n <= 2 * a ? 1 : 1.5;
    return Math.floor(n * m);
  }

  /**
   * Cost to learn a skill you do not have · *SR3 p.245*
   *
   * > "New skills can be purchased at a skill rating of 1, by paying a cost of 1 in Good
   * > Karma. New skills only cost 1, whether they are Active, Knowledge, or Language Skills."
   *
   * ⚠ **A flat rate that BYPASSES the cost table** — it is not `karmaSkillCost(1, …)`, which
   * would charge 2 for an active skill. That is why this is its own function taking no
   * arguments rather than a branch inside the table: there is nothing to compute, and any
   * signature that accepted a rating or a skill type would invite someone to use them.
   */
  static karmaNewSkillCost() {
    return 1;
  }

  /**
   * Cost to raise an Attribute to `newRating` · *SR3 p.244*
   *
   * > "A character can increase Physical and Mental Attributes 1 point (at a time) by paying a
   * > number of Good Karma points equal to **twice** the rating to which the Attribute is being
   * > raised… To improve an Attribute above the Racial Modified Limit has a cost equal to **3x**
   * > the rating to which the Attribute is being raised."
   *
   * ⚠ **The multiplier turns on the NEW rating against the limit, not the old one.** A human
   * going 6 → 7 is already above the limit of 6 when they pay, so it is 21 rather than 14.
   *
   * ⚠ **Cost, not cap.** Nothing here refuses a purchase past the Racial Modified Limit or
   * past the Attribute Maximum (`limit × 1.5`). The system's ethos is that a GM is never
   * fighting it; charging the right price is a rule, refusing the buy would be a guardrail.
   * `karmaAttributeMaximum` exists so the sheet can SAY which side of the line the buy is on.
   */
  static karmaAttributeCost(newRating, racialLimit) {
    const n = Number(newRating) || 0;
    const l = Number(racialLimit) || 0;
    return n * (n > l ? 3 : 2);
  }

  /** `Racial Modified Limit × 1.5` · *SR3 p.244*. Reported, never enforced. */
  static karmaAttributeMaximum(racialLimit) {
    return Math.floor((Number(racialLimit) || 0) * 1.5);
  }

  /**
   * How many specialisations a skill may carry · *SR3 p.245*
   *
   * > "There may be more than one specialization to a base skill, up to a maximum number of
   * > specializations equal to the base skill's **Linked Attribute Rating**."
   *
   * ⚠ **The LINKED ATTRIBUTE's rating, not the skill's.** The code gated on the skill rating
   * until 2026-08-31, which diverges in both directions: Stealth 2 / Quickness 6 was allowed
   * 2 where the book allows 6, and Stealth 6 / Quickness 3 was allowed 6 where the book allows
   * 3. Brick, the book's own example, has Stealth 5 and Quickness 6 — one apart, so the
   * example reads correctly under either rule and proves nothing.
   */
  static karmaMaxSpecialisations(attrRating) {
    return Math.max(0, Number(attrRating) || 0);
  }

  /**
   * The rating a specialisation is bought or raised to · *SR3 p.245*
   *
   * > "To begin a new specialization, you must buy the specialization at rating 1 point higher
   * > than your base skill… To improve the specialization beyond that, follow the rules above
   * > as normal."
   *
   * `system.specialisations[].level` is the **bonus** over the base skill, so a spec at level
   * L rolls `base + L` and the next purchase is `base + L + 1`. A brand-new one (level 0, not
   * yet bought) costs `base + 1`.
   *
   * ⚠ **There is no cap.** The sheet stopped every specialisation at level 2 until
   * 2026-08-31; the sentence above says the opposite.
   */
  static karmaSpecTargetRating(baseRating, currentLevel = 0) {
    return (Number(baseRating) || 0) + (Number(currentLevel) || 0) + 1;
  }

  /**
   * Split a karma award between the Karma Pool and Good Karma · *SR3 p.244*
   *
   * > "Shetani, an elf character, has a Total Karma of 62, Good Karma of 10, and Karma Pool of
   * > 4… Every twentieth point has been added to the Karma Pool (each character starts with 1
   * > Karma Pool) and **the rest (59)** has gone to Good Karma."
   *
   * ⚠ **The twentieth point goes to the Pool INSTEAD of Good Karma, not as well as.** 62 total
   * yields 3 Pool points and **59** Good Karma. The sheet added the full award to Good Karma
   * *and* granted the Pool points until 2026-08-31, so a character gained an extra point of
   * Good Karma per 20 earned.
   *
   * ⚠ **`poolGained` is a DELTA across the whole award**, so one large award grants every
   * twentieth point it crosses rather than only one. That part was always right.
   *
   * @returns {{newTotal:number, poolGained:number, goodKarma:number}} `goodKarma` is the
   *          amount to ADD to the spendable pool, not the new total.
   */
  static karmaAward(totalKarma, amount, metatype) {
    const t = Math.max(0, Number(totalKarma) || 0);
    const a = Math.max(0, Number(amount) || 0);
    const d = SR3EActor.karmaPoolDivisor(metatype);
    const newTotal   = t + a;
    const poolGained = Math.floor(newTotal / d) - Math.floor(t / d);
    return { newTotal, poolGained, goodKarma: a - poolGained };
  }

  /**
   * How much Karma buys a Karma Pool point · *SR3 p.246*
   *
   * > "**One-twentieth (one-tenth for humans)** of all Karma earned goes into the character's
   * > Karma Pool (every twentieth/tenth point earned)."
   *
   * ⚠ **Humans accrue at DOUBLE rate.** This is the metatype's whole mechanical compensation
   * for having no attribute advantages, and it was missing until 2026-09-01 (TODO 81).
   *
   * ⚠ **[#80](TODO.md)'s tests could not have caught it.** The only worked example on p.244 is
   * Shetani, an **elf**, so every assertion pinned to the book is pinned to the twentieth-point
   * case — and the human clause lives two pages later, in the Karma Pool chapter rather than
   * the advancement one. That is the third rule in this family the book's own examples cannot
   * distinguish.
   *
   * ⚠ **An unknown or missing metatype gives 20, not 10.** The actor field defaults to
   * `'human'`, so a real character gets the right answer; this default protects a CALL SITE
   * that forgets to pass one, where guessing human would silently double someone's Pool.
   * Matching is case-insensitive because the Bio tab renders `system.metatype` as free text
   * ("Species") — a GM typing "Human" must not fall through to 20.
   */
  static karmaPoolDivisor(metatype) {
    return String(metatype ?? '').trim().toLowerCase() === 'human' ? 10 : 20;
  }

  /**
   * The Karma Pool a character with this career total should have · *SR3 p.244, p.246*
   *
   * `1 + ⌊total / divisor⌋` — **"each character starts with 1 Karma Pool"**, which the data
   * model initialised to 0 until 2026-08-31, over a divisor that is **10 for humans** and 20
   * for everyone else.
   *
   * ⚠ **Migration `0.4.5.7` deliberately does NOT call this any more.** It corrects the
   * starting point on characters already in play, and it must keep meaning exactly that: it
   * compares against `⌊total / 20⌋`, the value the old code produced for every metatype, and
   * adds one. Wiring it to a function whose divisor later changed would have turned a
   * documented "+1" into a silent 3 → 7 jump for humans — and on a `totalKarma` that TODO 81
   * shows was never reliably written in the first place. Correcting the human accrual
   * retroactively is not something the data supports; new awards get it right.
   */
  static karmaPoolForTotal(totalKarma, metatype) {
    const d = SR3EActor.karmaPoolDivisor(metatype);
    return 1 + Math.floor(Math.max(0, Number(totalKarma) || 0) / d);
  }

  /* ── Missile Parry · SR3 p.170 ─────────────────────────────────────────────────────
   *
   * > "You can catch slow-moving missile weapons such as arrows, thrown knives, or shuriken
   * > out of the air. Make a Reaction Test (plus any Combat Pool dice you choose to allocate
   * > to the test) against a Target Number of 10, minus the base target number for the range
   * > of incoming attack… To successfully grab the missile weapon out of the air, you must
   * > generate more successes with your Reaction Test than the attacker achieved on the
   * > Attack Test. Ties go to the attacker. Using Missile Parry is a Free Action."
   */

  /**
   * The Missile Parry target number — **pure**.  · *SR3 p.170*
   *
   * `10 − the base target number for the range the attack came from`, floored at 2 like every
   * other TN (p.112). The Weapon Range Table's base numbers are 4 / 5 / 6 / 9, so a parry runs
   * TN 6 at short range down to TN 2 at extreme: **the further away the archer, the easier the
   * catch**, which is the point of the rule.
   *
   * ⚠ **The book's worked example contradicts the table it cites, and the table wins.** The
   * example reads *"against an arrow coming from long range, the target number is 2 (10 − 8,
   * the base Target Number for long range)"*. Long range on the WEAPON RANGE TABLE (p.111) is
   * **6**, not 8 — 8 is the **Grenade** Range Table's long column (p.119), and grenades are
   * not something you catch. The same sentence's short-range half (10 − 4 = 6) agrees with
   * both tables, so only the long figure is wrong. Bow, Thrown Knife and Shuriken — the exact
   * weapons this power names — are rows *in* the Weapon Range Table, which settles it.
   * This implements the RULE sentence ("the base target number for the range of incoming
   * attack"), giving TN 4 at long range where the example says 2. The number is shown with
   * its derivation and stays editable, so a table that prefers the example can use it.
   *
   * @param {number} baseRangeTN  4 / 5 / 6 / 9 — the attack's own base range TN
   * @returns {number} a target number of at least 2
   */
  static missileParryTN(baseRangeTN) {
    return Math.max(2, 10 - (Number(baseRangeTN) || 0));
  }

  /**
   * Resolve a Missile Parry against an Attack Test. **Pure — no Foundry, no I/O.**
   *
   * ⚠ **Strict, and the book says so twice over:** *"you must generate more successes… Ties
   * go to the attacker."* Same trap as `dodgeOutcome` and `meleeOutcome` — do not relax to
   * `>=`.
   *
   * ⚠ **A failed parry carries NOTHING.** This is the one place it differs from `dodgeOutcome`,
   * and the difference is not an oversight. p.113 makes its carry rule specific to the Dodge
   * Test — *"the successes still count and are added to the Damage Resistance Successes"* —
   * and Missile Parry is a **Reaction Test**, not a Dodge Test. Its text says only what counts
   * as catching the missile. Reusing `dodgeOutcome` here would silently invent a partial
   * credit the power was never given, which matters because parrying and dodging draw on the
   * same Combat Pool.
   *
   * @param {number} parryHits
   * @param {number} attackHits
   * @returns {{caught: boolean}}
   */
  static missileParryOutcome(parryHits, attackHits) {
    return { caught: (parryHits ?? 0) > (attackHits ?? 0) };
  }

  /**
   * May this defender parry this attack? **Pure.**
   *
   * ⚠ **"Slow-moving" is the whole restriction, and it excludes firearms.** The power names
   * arrows, thrown knives and shuriken — the `projectile` and `thrown` item types. A bullet is
   * not on the list and must never be offered, or the power becomes a general anti-ranged
   * defence at Cost 1.
   *
   * ⚠ Grenades are `thrown` but never reach here: the AoE path resolves by scatter and posts
   * soak cards directly, with no defence declaration. That is structural rather than checked,
   * so it is worth knowing if the AoE flow is ever reworked.
   */
  static canMissileParry(defender, weaponType) {
    if (!defender?.system?.derived?.missileParry) return false;
    return ['projectile', 'thrown'].includes(String(weaponType ?? ''));
  }

  static killingHandsLevel(name) {
    const m = /killing hands.*\((light|medium|moderate|serious|deadly)\)/i.exec(String(name ?? ''));
    if (!m) return null;
    // ⚠ The pack says "Medium"; SR3's damage levels are L/M/S/D where M is *Moderate*. The
    // shipped name is the odd one out, so both spellings map to M.
    return { light: 'L', medium: 'M', moderate: 'M', serious: 'S', deadly: 'D' }[m[1].toLowerCase()] ?? null;
  }

  /**
   * Collect the situational bonuses that apply to a given situation · TODO 70.
   *
   * @param {Array}  bonuses    `actor.system.derived.situationalBonuses`
   * @param {string} situation  a key from `SR3E.adeptSituations`
   * @returns {{dice:number, tn:number, pool:number, labels:string[]}}
   *
   * ⚠ **Summing is correct here, unlike the reflex packages.** Two powers covering the same
   * situation are two separate purchases — Rooting and Enhanced Balance both resist knockdown,
   * and an adept who paid for both gets both. Nothing in the rules makes them exclusive.
   * ⚠ Returns zeroes rather than null for an unknown situation, so a caller can add the result
   * unconditionally without a guard at every site.
   */
  static situationalBonus(bonuses, situation) {
    const want = String(situation ?? '').trim();
    const out = { dice: 0, tn: 0, pool: 0, labels: [] };
    if (!want) return out;
    for (const b of (Array.isArray(bonuses) ? bonuses : [])) {
      if (b?.situation !== want) continue;
      out.dice += Math.trunc(Number(b.dice) || 0);
      out.tn   += Math.trunc(Number(b.tn)   || 0);
      out.pool += Math.trunc(Number(b.pool) || 0);
      if (b.label) out.labels.push(b.label);
    }
    return out;
  }

  /**
   * The wound modifier, offset by Pain Resistance · *SR3 p.170*
   *
   * > "Subtract your level of Pain Resistance from your current damage before determining your
   * > injury modifiers. For example, an adept with 3 levels of Pain Resistance does not suffer
   * > any modifiers for being Lightly or Moderately wounded. At 4 boxes of damage, the adept
   * > has only a +1 injury modifier."
   *
   * ⚠ **It reduces the damage used for the LOOKUP, never the wound track.** Touching the track
   * would un-fill boxes the GM ticked and move the character further from unconscious, which
   * the power does not do — *"It does not reduce actual damage, only its effect on you."*
   * ⚠ Applies to BOTH tracks: *"Pain Resistance works equally on both the Physical and Stun
   * Condition Monitors."*
   */
  static painAdjustedBoxes(boxes, painResistance = 0) {
    return Math.max(0, (Math.trunc(Number(boxes) || 0)) - Math.max(0, Math.trunc(Number(painResistance) || 0)));
  }

  /**
   * Racial Modified Limit for one attribute · *SR3 p.245*
   *
   * Unknown metatypes fall back to human, which is the table's baseline of 6 — a metavariant
   * the GM has typed by hand reads as human rather than as zero, and zero would make every
   * boost Serious drain immediately.
   */
  static racialLimit(metatype, attribute) {
    const table = globalThis.game?.sr3e?.SR3E?.racialLimits ?? SR3EActor._RACIAL_LIMITS_FALLBACK;
    const row   = table[String(metatype ?? 'human').toLowerCase()] ?? table.human;
    return row?.[attribute] ?? 6;
  }

  /**
   * Racial Attribute Maximum — *"equal to their Racial Modified Limit times 1.5"* (p.244).
   *
   * ⚠ Rounds HALF UP, which is what reproduces every printed cell of the Racial Attribute
   * Limit Table: 7→11 (10.5), 9→14 (13.5), 11→17 (16.5), 5→8 (7.5). Rounding down would
   * miss four of the twenty non-human entries — and always in the direction that makes
   * Drain harsher.
   */
  static racialMax(limit) {
    return Math.round((limit ?? 6) * 1.5);
  }

  /**
   * Natural dermal armor's Body augmentation · *SR3 p.56* — 1 for a troll, else 0.
   * Matched case-insensitively and trimmed: `system.metatype` was free text until 2026-09-11,
   * so older actors can carry "Troll" or "troll ". See `SR3E.racialDermalArmor`.
   */
  static racialDermalArmor(metatype) {
    const table = globalThis.game?.sr3e?.SR3E?.racialDermalArmor ?? { troll: 1 };
    return table[String(metatype ?? '').trim().toLowerCase()] ?? 0;
  }

  /**
   * What a Body roll may OFFER for resisting disease or toxin · TODO 98.
   *
   * Every `toxin` source summed — a dwarf's racial +2, Nephritic Screen, Body Control — since
   * two sources covering one situation are two purchases (see `situationalBonus`). The roll
   * dialog shows it as an unticked checkbox; nothing applies it automatically, because only a
   * human knows the Body Test is against a toxin.
   * @returns {{ dice: number, label: string }}  label is '' when there is nothing to offer
   */
  static toxinResistanceOffer(bonuses) {
    const b = SR3EActor.situationalBonus(bonuses, 'toxin');
    return {
      dice:  b.dice,
      label: b.dice ? `Resisting disease or toxin: +${b.dice} (${b.labels.join(' + ')})` : '',
    };
  }

  /**
   * Racial situational bonuses · *SR3 p.56* — a dwarf's +2 against disease and toxins.
   * Returns fresh `situationalBonuses` entries (copies, so a derivation can never mutate the
   * config table). See `SR3E.racialSituational` · TODO 98.
   */
  static racialSituational(metatype) {
    const table = globalThis.game?.sr3e?.SR3E?.racialSituational
      ?? { dwarf: [{ situation: 'toxin', dice: 2, label: 'Dwarf resistance (SR3 p.56)' }] };
    return (table[String(metatype ?? '').trim().toLowerCase()] ?? [])
      .map(b => ({ label: b.label, situation: b.situation, dice: b.dice ?? 0, tn: b.tn ?? 0, pool: 0 }));
  }

  /**
   * Natural Reach · *SR3 p.56, p.121* — 1 for a troll, else 0. See `SR3E.racialReach`.
   */
  static racialReach(metatype) {
    const table = globalThis.game?.sr3e?.SR3E?.racialReach ?? { troll: 1 };
    return table[String(metatype ?? '').trim().toLowerCase()] ?? 0;
  }

  /**
   * A fighter's melee Reach · *SR3 p.121* — the weapon's Reach plus natural Reach.
   *
   * > *"Trolls have a natural Reach of 1 that is cumulative with weapon Reach."*
   *
   * ⚠ This is each fighter's ABSOLUTE Reach; the differential is taken from the pair by the
   * caller. Adding natural Reach to the difference instead would give a troll against a troll
   * a phantom +1 — equal reach must still cancel.
   *
   * `actor` may be a vehicle or a spirit; no metatype reads as 0.
   * @returns {{ total: number, weapon: number, natural: number }}
   */
  static meleeReach(weapon, actor) {
    const w = Math.trunc(Number(weapon?.system?.reach) || 0);
    const n = SR3EActor.racialReach(actor?.system?.metatype);
    return { total: w + n, weapon: w, natural: n };
  }

  /**
   * Armour the character's implants provide · *SR3 p.300; M&M p.27-28, p.68* · TODO 75.
   *
   * > *"Armor gained in this fashion is cumulative with worn armor."* (Bone Lacing, SR3 p.300)
   * > *"Armor provided is cumulative with worn armor."* (Ceramic/Kevlar lacing, M&M p.27)
   * > *"…cumulative with externally worn armor."* (Orthoskin, M&M p.68)
   * > Dermal Sheath: *"impact armor equal to one-half the rating, rounded up"* (M&M p.28)
   *
   * Per item: `bonusImpact`/`bonusBallistic` when the GM has set a number (0 included), else
   * the `IMP`/`BAL` codes in the item's upstream `mods` string, which the packs carry and
   * which match the books row for row. Cyberware and bioware only.
   *
   * ⚠ **Plastic Bone Lacing gives none**, per the Bone Lacing TABLE (p.303: *"+1 Body"* only)
   * — the p.300 prose says plastic adds impact armour too, and the table is what ships.
   * ⚠ **Not modelled:** M&M p.33's reduction of implant armour/Body bonuses for a character
   * with three or more cyber replacements, and cyberlimb body plating (M&M p.35).
   *
   * @returns {{ impact: number, ballistic: number,
   *             sources: Array<{name: string, impact: number, ballistic: number}> }}
   */
  static implantArmor(items) {
    const out = { impact: 0, ballistic: 0, sources: [] };
    for (const i of (items ?? [])) {
      if (i?.type !== 'cyberware' && i?.type !== 'bioware') continue;
      const s = i.system ?? {};
      let fromMods = null;
      const mods = () => (fromMods ??= parseMods(s.mods).unmapped.reduce((a, u) => {
        if (u.code === 'IMP') a.impact += u.value;
        if (u.code === 'BAL') a.ballistic += u.value;
        return a;
      }, { impact: 0, ballistic: 0 }));
      const impact    = Number.isFinite(s.bonusImpact)    ? s.bonusImpact    : mods().impact;
      const ballistic = Number.isFinite(s.bonusBallistic) ? s.bonusBallistic : mods().ballistic;
      if (!impact && !ballistic) continue;
      out.impact    += impact;
      out.ballistic += ballistic;
      out.sources.push({ name: i.name, impact, ballistic });
    }
    return out;
  }

  /**
   * The armour that resists damage — worn armour plus implant armour · TODO 75.
   *
   * One answer for every consumer (the soak card, Falling Damage, the Body+armour stat
   * picker), so they cannot disagree. Vehicles use their Armor attribute for both.
   *
   * ⚠ **Damage resistance only.** Armour encumbrance (the Quickness penalty) still reads worn
   * armour alone — no rule found says implant armour adds to it, and M&M p.35 says the one
   * implant armour that does count (cyberlimb plating) *"does not count toward layering"*.
   * @returns {{ ballistic: number, impact: number,
   *             worn: {name: string|null, ballistic: number, impact: number},
   *             implants: ReturnType<typeof SR3EActor.implantArmor> }}
   */
  static armorRatings(actor) {
    if (actor?.type === 'vehicle') {
      const v = actor.system?.attributes?.armor?.base ?? 0;
      return { ballistic: v, impact: v, worn: { name: null, ballistic: v, impact: v },
               implants: { impact: 0, ballistic: 0, sources: [] } };
    }
    const id    = actor?.system?.equippedArmor;
    const armor = id ? [...(actor.items ?? [])].find(i => i.id === id && i.type === 'armor') : null;
    const worn  = { name: armor?.name ?? null,
                    ballistic: armor?.system?.ballistic ?? 0, impact: armor?.system?.impact ?? 0 };
    const implants = SR3EActor.implantArmor(actor?.items);
    return { ballistic: worn.ballistic + implants.ballistic, impact: worn.impact + implants.impact,
             worn, implants };
  }

  /**
   * What gives this actor dermal armor, if anything · *SR3 p.116* · TODO 75.
   *
   * A troll's hide (`racialDermalArmor`) and any cyberware on `SR3E.dermalArmorImplants` —
   * Dermal Plating or a Dermal Sheath. Returns labels so the soak card can say which one
   * negated the flechette increase. Every owned item counts, as for Essence: there is no
   * "installed" flag.
   * @returns {string[]}  empty when the actor has none
   */
  static dermalArmorSources(actor) {
    const out = [];
    if (SR3EActor.racialDermalArmor(actor?.system?.metatype) > 0) out.push('troll dermal armor');
    const pats = globalThis.game?.sr3e?.SR3E?.dermalArmorImplants
      ?? [/^\s*dermal\s+(plating|sheath)\b/i, /^\s*d\.\s*sheath\b/i, /^\s*dermal\s+armou?r\b/i];
    for (const i of (actor?.items ?? [])) {
      if (i?.type !== 'cyberware') continue;
      if (pats.some(re => re.test(String(i.name ?? '')))) out.push(i.name);
    }
    return out;
  }

  /**
   * Does flechette raise this target's Damage Level? · *SR3 p.116*
   *
   * > *"Against unarmored targets, flechette rounds increase their Damage Codes by one level…
   * > Dermal armor negates the Damage Level increase of flechette ammunition."*
   *
   * Only an UNARMOURED target takes the increase (an armoured one gets `flechetteArmor`
   * instead), and dermal armour cancels it.
   *
   * `dermalArmor` is a count of sources — see `dermalArmorSources`, which covers a troll's
   * hide and Dermal Plating / Dermal Sheath (TODO 75).
   */
  static flechetteRaisesLevel({ ballistic = 0, impact = 0, dermalArmor = 0 } = {}) {
    if (Math.max(ballistic, impact) > 0) return false;
    return !(dermalArmor > 0);
  }

  /**
   * An imported character's finished attribute ratings · *SR3 p.56* — the importer's rule.
   *
   * The Shadowrun Character Generator exports a character's attributes in TWO parts: the points
   * the player allocated (`attributes`) and the Racial Modifications Table's contribution
   * (`raceBonuses`). Its own sheet shows their sum. The importer read only the first until
   * 2026-09-11, so a troll allocated Body 5 arrived as Body 5 instead of 10 — every imported
   * metahuman came in at human ratings.
   *
   * @param {object} o
   * @param {object} o.allocation   the export's `attributes`, keyed `Body`, `Quickness`, …
   * @param {string} o.race         the export's `race` (`'Troll'`, …)
   * @param {object} [o.raceBonuses] the export's `raceBonuses`
   * @returns {{attributes: object, modifiers: object, source: string, belowOne: string[]}}
   *
   * ⚠ **The export's own `raceBonuses` wins when it carries anything**, because that is the
   * character the player actually built. The book's table (`SR3E.racialModifiers`) is the
   * fallback, used when the export's bonuses are absent or all zero for a non-human — the
   * generator's default state is an all-zero `raceBonuses`, so zeros on a troll mean "never
   * filled in", not "this troll has no modifiers". `source` says which was used.
   *
   * ⚠ **Only the six bought attributes.** `raceBonuses` also carries `Reaction`, `Initative`
   * (sic) and a `Notes` string; Reaction is derived from Quickness and Intelligence here, so
   * adding a racial Reaction on top would count those modifiers twice.
   *
   * ⚠ **A rating below 1 is REPORTED, not clamped** — p.56: *"Magic is the only Attribute that
   * can have a value of 0."* A troll allocated 2 Charisma lands on 0, which is an illegal
   * character the GM needs to see, not one the importer should quietly repair to 1.
   */
  static racialAttributes({ allocation = {}, race = '', raceBonuses } = {}) {
    const KEYS = { body: 'Body', quickness: 'Quickness', strength: 'Strength',
                   charisma: 'Charisma', intelligence: 'Intelligence', willpower: 'Willpower' };
    const num  = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
    const key  = String(race ?? '').trim().toLowerCase() || 'human';
    const table = globalThis.game?.sr3e?.SR3E?.racialModifiers ?? SR3EActor._RACIAL_MODS_FALLBACK;

    const exported = {};
    let exportedAny = false;
    for (const [k, g] of Object.entries(KEYS)) {
      exported[k] = num(raceBonuses?.[g]);
      if (exported[k] !== 0) exportedAny = true;
    }

    let modifiers, source;
    if (exportedAny)              { modifiers = exported;                   source = 'export'; }
    else if (key === 'human')     { modifiers = { ...table.human };         source = 'none'; }
    else if (table[key])          { modifiers = { ...table[key] };          source = 'table'; }
    else                          { modifiers = { ...table.human };         source = 'unknown'; }

    const attributes = {}, belowOne = [];
    for (const [k, g] of Object.entries(KEYS)) {
      // `?? 3` is the importer's long-standing default for a missing attribute.
      attributes[k] = num(allocation?.[g] ?? 3) + (modifiers[k] ?? 0);
      if (attributes[k] < 1) belowOne.push(k);
    }
    return { attributes, modifiers, source, belowOne };
  }

  /**
   * The Attribute Boost activation TN · *SR3 p.168*
   *
   * > "make a Magic Test against a target number equal to one half the base (unaugmented)
   * > rating of the Attribute being boosted (round up)"
   *
   * ⚠ **BASE, not current.** Boosting an already-augmented Strength does not get harder,
   * which is the whole reason the book says "unaugmented" — reading `.value` here would
   * punish the adept for their own cyberware and for a boost already running.
   * ⚠ Rounds UP; the expiry TN below rounds up too, but off a different number.
   */
  static attributeBoostTN(baseRating) {
    return Math.max(2, Math.ceil((baseRating ?? 0) / 2));
  }

  /**
   * Ceiling on a boosted attribute · *SR3 p.169*
   *
   * > "No Attribute can be boosted to greater than twice its Racial Modified Limit"
   */
  static attributeBoostCap(limit) {
    return (limit ?? 6) * 2;
  }

  /**
   * The Drain Resistance TN when the boost lapses · *SR3 p.169*
   *
   * > "The target number is equal to one-half the boosted Attribute value (round up)"
   *
   * ⚠ **BOOSTED, not base** — the opposite of `attributeBoostTN`. The two are one page
   * apart and read almost identically; using the base here makes a big boost free.
   */
  static attributeBoostDrainTN(boostedValue) {
    return Math.max(2, Math.ceil((boostedValue ?? 0) / 2));
  }

  /**
   * Attribute Boost Drain Table · *SR3 p.169*
   *
   * | Boosted Attribute Rating is | Drain Level |
   * |---|---|
   * | ≤ Racial Modified Limit | L |
   * | up to Racial Attribute Maximum | M |
   * | up to 2× Racial Modified Limit | S |
   *
   * ⚠ Graded on the **total boosted value**, not on the size of the boost. A troll boosting
   * Strength 10→12 stays inside the limit table's first band far more easily than a human
   * going 6→8, and that asymmetry is the point of the rule.
   */
  static attributeBoostDrainLevel({ boosted = 0, limit = 6 } = {}) {
    if (boosted <= limit)                        return 'L';
    if (boosted <= SR3EActor.racialMax(limit))   return 'M';
    return 'S';
  }

  /**
   * Improved Ability dice, capped · *SR3 p.169* — TODO 60
   *
   * > "You cannot have more additional dice than your base skill rating or your Magic
   * > Attribute, whichever is less. For example, an adept with Pistols 4 and Magic 5 cannot
   * > have more than 4 Improved Ability (Pistols) dice."
   *
   * ⚠ Against the **base skill rating**, not the rating plus a specialisation — a
   * specialisation is not the skill getting better.
   * ⚠ Against **effective** Magic, so it moves with Essence and Bio Index. An adept who
   * loses Magic loses the dice, which is the same principle as losing the powers (p.168).
   * ⚠ A skill the adept does not have at all is rating 0, so the cap is 0. That is RAW —
   * there are no additional dice to add to a skill you cannot roll — and it is why the
   * defaulting clause (TODO 61) is a separate question rather than a special case here.
   */
  static improvedAbilityDice({ level = 0, skillRating = 0, magic = 0 } = {}) {
    return Math.max(0, Math.min(level, skillRating, magic));
  }

  /**
   * Improved Reflexes does not stack with technology · *SR3 p.169* — TODO 64
   *
   * > "The maximum level of Improved Reflexes is 3, and the increase cannot be combined
   * > with technological or other magical increases to Reaction or Initiative."
   *
   * Returns the package that applies, plus whether a conflict was suppressed so the sheet
   * can say so.
   *
   * ⚠ **The book forbids combining; it does not say which side wins.** In play nobody buys
   * both deliberately — it happens when a character is handed chrome, or the reverse — so
   * this takes the BETTER package rather than refusing to derive anything. That follows the
   * project ethos (warn, never silently sum, keep everything hand-editable): the character
   * is not punished for a combination the rules simply do not allow, and the sheet reports
   * what was dropped.
   * ⚠ **Initiative dice decide it, then Reaction.** A die is worth far more than a point of
   * Reaction across a Combat Turn, so comparing on Reaction first would pick wrong exactly
   * when the two are close.
   * ⚠ Ties go to the adept: it is the character's own Magic, and it cannot be removed
   * surgically.
   */
  static reflexBonus({ adeptRea = 0, adeptInit = 0, cyberRea = 0, cyberInit = 0 } = {}) {
    const adept = { rea: adeptRea, initDice: adeptInit };
    const cyber = { rea: cyberRea, initDice: cyberInit };
    const adeptHas = adept.rea !== 0 || adept.initDice !== 0;
    const cyberHas = cyber.rea !== 0 || cyber.initDice !== 0;

    // Only one source — no conflict, and summing is the same as choosing.
    if (!adeptHas) return { ...cyber, conflict: false, source: cyberHas ? 'cyber' : 'none', dropped: null };
    if (!cyberHas) return { ...adept, conflict: false, source: 'adept', dropped: null };

    const adeptWins = adept.initDice > cyber.initDice
      || (adept.initDice === cyber.initDice && adept.rea >= cyber.rea);
    return adeptWins
      ? { ...adept, conflict: true, source: 'adept', dropped: cyber }
      : { ...cyber, conflict: true, source: 'cyber', dropped: adept };
  }

  /**
   * Mirror of `SR3E.racialLimits`, for the pure rules to fall back on when there is no
   * Foundry global — the unit tests import this class directly. Kept beside the rule that
   * reads it; `config.js` remains the source a human edits.
   */
  static _RACIAL_LIMITS_FALLBACK = {
    human: { body: 6, quickness: 6, strength: 6, charisma: 6, intelligence: 6, willpower: 6 },
    elf:   { body: 6, quickness: 7, strength: 6, charisma: 8, intelligence: 6, willpower: 6 },
    dwarf: { body: 7, quickness: 6, strength: 8, charisma: 6, intelligence: 6, willpower: 7 },
    ork:   { body: 9, quickness: 6, strength: 8, charisma: 5, intelligence: 5, willpower: 6 },
    troll: { body: 11, quickness: 5, strength: 10, charisma: 4, intelligence: 4, willpower: 6 },
    other: { body: 6, quickness: 6, strength: 6, charisma: 6, intelligence: 6, willpower: 6 },
  };

  /** Mirror of `SR3E.racialModifiers` (SR3 p.56), for the same reason as the limits above. */
  static _RACIAL_MODS_FALLBACK = {
    human: { body: 0, quickness: 0,  strength: 0, charisma: 0,  intelligence: 0,  willpower: 0 },
    dwarf: { body: 1, quickness: 0,  strength: 2, charisma: 0,  intelligence: 0,  willpower: 1 },
    elf:   { body: 0, quickness: 1,  strength: 0, charisma: 2,  intelligence: 0,  willpower: 0 },
    ork:   { body: 3, quickness: 0,  strength: 2, charisma: -1, intelligence: -1, willpower: 0 },
    troll: { body: 5, quickness: -1, strength: 4, charisma: -2, intelligence: -2, willpower: 0 },
  };

  /* ══════════════════════════════════════════════════════════════════════════════
   *  Attribute Boost — the activated flow.  SR3 p.168-169, TODO 63.
   * ══════════════════════════════════════════════════════════════════════════════ */

  /**
   * Ask for a Force… no: ask nothing, and roll the Magic Test.
   *
   * The only choice the adept has is *whether* to boost — the level is the power's, the TN
   * is arithmetic, and the duration is the roll's. So the dialog states the bargain (TN,
   * gain, the Drain it will cost) and asks for confirmation rather than pretending to
   * collect input.
   *
   * ⚠ **No pool dice.** Spell Pool augments *"Spell Success Tests and Drain Resistance Tests
   * in spellcasting, Dispelling, and for Spell Defense"* and explicitly *"cannot be used to
   * augment Conjuring or any other magic-related tests"* (p.43). This is one of the others.
   */
  static async openAttributeBoost(actor, itemId) {
    const item = actor?.items?.get(itemId);
    if (!item) { ui.notifications.warn('SR3E: Attribute Boost power not found.'); return; }

    const attribute = globalThis.game?.sr3e?.SR3E?.attributeBoostTarget?.(item.name);
    if (!attribute) {
      ui.notifications.warn(`SR3E: could not tell which Attribute "${item.name}" boosts.`);
      return;
    }

    const attr    = actor.system.attributes ?? {};
    const base    = attr[attribute]?.base  ?? 0;
    const current = attr[attribute]?.value ?? 0;
    const magic   = attr.magic?.value ?? 0;
    if (magic < 1) { ui.notifications.warn('SR3E: no Magic dice to roll.'); return; }

    const level = item.system?.hasLevels ? (item.system?.level ?? 1) : 1;
    const limit = SR3EActor.racialLimit(actor.system.metatype, attribute);
    const cap   = SR3EActor.attributeBoostCap(limit);
    // ⚠ TN off the BASE rating (p.168 says "unaugmented"); the Drain TN below is off the
    // BOOSTED value (p.169). Two different numbers, one page apart.
    const tn      = SR3EActor.attributeBoostTN(base);
    const wouldBe = Math.min(current + level, cap);
    const label   = attribute.charAt(0).toUpperCase() + attribute.slice(1);

    const already = actor.system.attributeBoost?.[attribute];
    const running = (already?.turns ?? 0) > 0
      ? `<div class="sr-alert sr-alert--danger" style="margin-bottom:6px">
           ⚠ A boost is already running (${already.turns} turn${already.turns !== 1 ? 's' : ''} left).
           Re-rolling replaces it, and only the new one will charge Drain.
         </div>` : '';

    const cyber = (actor.items ?? []).some(i =>
      (i.type === 'cyberware' || i.type === 'bioware')
      && (i.system?.[{ body: 'bonusBod', quickness: 'bonusQui', strength: 'bonusStr' }[attribute]] ?? 0) > 0);
    const cyberWarn = cyber
      ? `<div class="sr-alert sr-alert--danger" style="margin-bottom:6px">
           ⚠ ${label} is already raised by cyberware or bioware. Attribute Boost is
           <em>"not compatible with any artificial (cyberware) enhancements, nor spell-based
           increases"</em> (p.169). Not blocked — the GM adjudicates.
         </div>` : '';

    let go = false;
    await foundry.applications.api.DialogV2.wait({
      window: { title: `${item.name} — Magic Test` },
      content: `
        <div style="font-size:12px">
          ${running}${cyberWarn}
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:2px 8px 2px 0">Magic Test</td>
                <td style="text-align:right"><strong>${magic} dice vs TN ${tn}</strong></td></tr>
            <tr><td style="padding:2px 8px 2px 0">TN is ½ the <em>base</em> ${label} (${base}), round up</td>
                <td style="text-align:right">—</td></tr>
            <tr><td style="padding:2px 8px 2px 0">${label} while boosted</td>
                <td style="text-align:right"><strong>${current} → ${wouldBe}</strong></td></tr>
            <tr><td style="padding:2px 8px 2px 0">Duration</td>
                <td style="text-align:right">successes, in Combat Turns</td></tr>
            <tr><td style="padding:2px 8px 2px 0">Drain when it lapses</td>
                <td style="text-align:right"><strong>${SR3EActor.attributeBoostDrainTN(wouldBe)}${SR3EActor.attributeBoostDrainLevel({ boosted: wouldBe, limit })}</strong> Stun</td></tr>
          </table>
          <p style="margin:8px 0 0;font-size:10px;color:var(--sr-dim)">
            No pool dice — Spell Pool cannot augment this test (p.43).
            Ceiling is 2× Racial Modified Limit = ${cap}.
          </p>
        </div>`,
      buttons: [
        { label: '🎲 Roll Magic', action: 'go', default: true, callback: () => { go = true; } },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    if (!go) return;

    await actor.rollPool(magic, tn, `💪 ${item.name} — Magic Test`, {
      isAttributeBoostRoll: true,
      attributeBoostContext: {
        actorId: actor.id, attribute, attrLabel: label, level, current, cap, limit,
      },
    });
  }

  /* ══════════════════════════════════════════════════════════════════════════════
   *  Triggered cyber/bioware.  M&M p.63 (Adrenal Pump), p.71 (Pain Editor).  TODO 30.
   * ══════════════════════════════════════════════════════════════════════════════ */

  /**
   * Switch a triggered augmentation on or off.
   *
   * A **toggle** flips and stays. A **duration** rolls its turns and starts counting down.
   *
   * ⚠ **The duration is ROLLED, not chosen** — *"roll 1D6 for each level; the die result
   * indicates the number of Combat Turns"* (p.63). The dialog reports the roll rather than
   * asking, because the character does not decide how long their own adrenaline lasts.
   */
  static async toggleAugmentation(actor, itemId) {
    const info = (actor?.system?.derived?.triggeredAugmentations ?? []).find(a => a.id === itemId);
    if (!info) { ui.notifications.warn('SR3E: that augmentation is not on this actor.'); return; }

    const set = async changes => {
      if (!game.users.activeGM?.isSelf) {
        await game.sr3e.SR3EQuery.asGM('sr3e.actor.set', { uuid: actor.uuid, changes });
        return;
      }
      await actor.update(changes);
    };

    // ── Toggle: on/off, no duration, no cost ───────────────────────────────────────
    if (info.kind === 'toggle') {
      const now = !info.active;
      await set({ [`system.augmentations.${itemId}.active`]: now });
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<div class="sr-roll-card">
          <div class="sr-roll-header">⚙ ${actor.name} — ${info.label} ${now ? 'engaged' : 'disengaged'}</div>
          ${now ? `<div class="sr-roll-meta">+1 Willpower, −1 Intelligence. Stun wound modifiers
            are ignored; Physical still apply. ⚠ The player should not be told how much damage
            the character has taken (M&M p.71).</div>` : ''}
        </div>`,
        style: CONST.CHAT_MESSAGE_STYLES.OTHER,
      });
      return;
    }

    // ── Duration: already running? ─────────────────────────────────────────────────
    if (info.active) {
      ui.notifications.info(`${info.label} is already running (${info.turns} turn${info.turns !== 1 ? 's' : ''} left).`);
      return;
    }

    const cfg   = game.sr3e.SR3E.triggeredAugmentations.find(t => t.match.test(info.name));
    const dice  = (cfg?.durationDicePerLevel ?? 1) * info.level;
    const rolls = Array.from({ length: dice }, () => Math.floor(Math.random() * 6) + 1);
    const turns = rolls.reduce((a, b) => a + b, 0);

    await set({
      [`system.augmentations.${itemId}.turns`]: turns,
      // The crash Power is the number of turns it RAN, so it is recorded at activation —
      // by the time it lapses the counter is at zero and the number would be lost.
      [`system.augmentations.${itemId}.rolledTurns`]: turns,
    });

    const per = cfg?.perLevel ?? {};
    const gain = Object.entries(per).map(([k, v]) => `+${v * info.level} ${k.toUpperCase()}`).join(', ');
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="sr-roll-card">
        <div class="sr-roll-header">⚡ ${actor.name} — ${info.label} triggered</div>
        <div class="sr-roll-result">${dice}D6 → <strong>${turns}</strong> Combat Turn${turns !== 1 ? 's' : ''}
          <span class="sr-roll-meta">(${rolls.join(' + ')})</span></div>
        <div class="sr-staging-result">${gain} for ${turns} turn${turns !== 1 ? 's' : ''}.</div>
        <div class="sr-roll-meta">⚠ When it ends: Body Test vs <strong>${turns}D Stun</strong> —
          Power equals the turns it ran (M&M p.63).</div>
      </div>`,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
    });
  }

  /**
   * Count every running augmentation down one Combat Turn, and bill the crash for any that
   * lapse. Called from the `updateCombat` round hook alongside `tickAttributeBoosts`.
   *
   * ⚠ **The crash Power is the duration it RAN, not what is left** — *"a Power equal to the
   * number of turns the hormones remained in the blood"*. Read from `rolledTurns`, recorded at
   * activation, because by expiry the counter is zero.
   */
  static async tickAugmentations() {
    for (const actor of game.actors) {
      if (actor.type !== 'character' && actor.type !== 'npc') continue;
      const state = actor.system?.augmentations;
      if (!state || !Object.keys(state).length) continue;

      const changes = {};
      const lapsed  = [];
      for (const [itemId, st] of Object.entries(state)) {
        const turns = st?.turns ?? 0;
        if (turns <= 0) continue;
        if (turns > 1) { changes[`system.augmentations.${itemId}.turns`] = turns - 1; continue; }
        changes[`system.augmentations.${itemId}.turns`] = 0;
        lapsed.push({ itemId, ran: st?.rolledTurns ?? 1,
                      name: actor.items.get(itemId)?.name ?? 'Augmentation' });
      }
      if (!Object.keys(changes).length) continue;
      await actor.update(changes);
      for (const l of lapsed) await SR3EActor._postAugmentationCrash(actor, l);
    }
  }

  /**
   * The crash when a duration augmentation lapses · *M&M p.63*
   *
   * > "the character crashes from system shock and fatigue. He must roll Body to resist Deadly
   * > Stun damage with a Power equal to the number of turns the hormones remained in the blood."
   *
   * ⚠ **Body, not Willpower** — this is physical shock, not Drain, so it reuses the soak card
   * rather than `_postDrainCard`. And it is **Deadly Stun** regardless of how long it ran; the
   * duration sets the POWER, which is the resistance TN, not the level.
   */
  static async _postAugmentationCrash(actor, { name, ran }) {
    const power = Math.max(1, Math.trunc(Number(ran) || 1));
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="sr-roll-card">
        <div class="sr-roll-header">💥 ${actor.name} — ${name} wears off</div>
        <div class="sr-staging-result">System shock: resist <strong>${power}D Stun</strong>
          (Power = the ${power} turn${power !== 1 ? 's' : ''} it ran).</div>
        <div class="sr-roll-meta">Regenerating takes 9 + 1D6 minutes; triggering again before
          then halves the next duration (M&M p.63).</div>
      </div>`,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
    });
    await actor._postSoakCard({
      power, level: 'D', isStun: true,
      label: `${name} — system shock`,
      attackerName: name,
    });
  }

  /**
   * Write the boost. Absolute values, so `sr3e.actor.set` is the right verb.
   *
   * ⚠ Routed through the GM like every other authoritative write — the roll happens on the
   * player's client, and a player cannot update their own actor in every permission setup.
   */
  static async _commitAttributeBoost({ actorId, attribute, level, turns }) {
    const actor = game.actors.get(actorId);
    if (!actor) return;
    const changes = {
      [`system.attributeBoost.${attribute}.level`]: level,
      [`system.attributeBoost.${attribute}.turns`]: turns,
    };
    if (!game.users.activeGM?.isSelf) {
      await game.sr3e.SR3EQuery.asGM('sr3e.actor.set', { uuid: actor.uuid, changes });
      return;
    }
    await actor.update(changes);
  }

  /**
   * Count every running boost down by one Combat Turn, and bill the Drain for any that
   * lapse. Called once per round from the `updateCombat` hook, GM client only.
   *
   * ⚠ **The Drain is computed from the boosted value BEFORE the boost is cleared.** Clearing
   * first and then reading the attribute gives the unboosted number, which is a smaller TN
   * and a lighter Drain Level — the bug this ordering exists to prevent.
   * ⚠ A Foundry **round** is an SR3 Combat Turn, which is the unit p.168 counts in. Do not
   * "fix" this to per-pass; a 3-success boost would then evaporate inside a single turn.
   */
  static async tickAttributeBoosts() {
    for (const actor of game.actors) {
      if (actor.type !== 'character' && actor.type !== 'npc') continue;
      const state = actor.system?.attributeBoost;
      if (!state) continue;

      const changes = {};
      const lapsed  = [];
      for (const attribute of ['body', 'quickness', 'strength']) {
        const turns = state[attribute]?.turns ?? 0;
        if (turns <= 0) continue;
        if (turns > 1) {
          changes[`system.attributeBoost.${attribute}.turns`] = turns - 1;
          continue;
        }
        // Last turn — snapshot what it reached, THEN clear.
        const boosted = actor.system.attributes?.[attribute]?.value ?? 0;
        const limit   = SR3EActor.racialLimit(actor.system.metatype, attribute);
        lapsed.push({
          attribute, boosted, limit,
          drainTN:    SR3EActor.attributeBoostDrainTN(boosted),
          drainLevel: SR3EActor.attributeBoostDrainLevel({ boosted, limit }),
        });
        changes[`system.attributeBoost.${attribute}.turns`] = 0;
        changes[`system.attributeBoost.${attribute}.level`] = 0;
      }
      if (!Object.keys(changes).length) continue;
      await actor.update(changes);
      for (const l of lapsed) await SR3EActor._postAttributeBoostDrain(actor, l);
    }
  }

  /**
   * The Drain card for a lapsed boost · *SR3 p.169*
   *
   * > "When the boost runs out, you must make a Drain Resistance Test… To offset the Drain,
   * > make a Drain Resistance Test using Willpower against the Drain target number. Every
   * > two successes reduce the Drain Level by one. Any Drain damage taken is stun damage."
   *
   * Reuses `_postDrainCard`, which already implements "every two successes reduce the level"
   * and the Willpower default. `drainTNOverride` is what lets it take a pre-computed pair
   * instead of parsing a spell's drain formula.
   *
   * ⚠ **Always Stun**, unconditionally — unlike spell Drain, which turns Physical when Force
   * exceeds Magic. The book says "Any Drain damage taken is stun damage" with no exception,
   * so `drainIsPhysical` is hard-false here rather than derived from anything.
   */
  static async _postAttributeBoostDrain(actor, { attribute, boosted, drainTN, drainLevel }) {
    const label = attribute.charAt(0).toUpperCase() + attribute.slice(1);
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="sr-roll-card">
        <div class="sr-roll-header">💪 ${actor.name} — Attribute Boost lapsed</div>
        <div class="sr-staging-result">
          ${label} returns to normal. Drain <strong>${drainTN}${drainLevel}</strong> Stun,
          from a boosted rating of ${boosted}.
        </div>
      </div>`,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
    });
    await actor._postDrainCard({
      drainTNOverride: drainTN,
      drainLevel,
      drainIsPhysical: false,
      spellName: `Attribute Boost (${label})`,
      force: boosted,
      sorceryRating: 0,
    });
  }

  /** Power bonus for a charge that lands (CC p.86). Pure, and deliberately not inlined. */
  static chargingPowerBonus(charged) {
    return charged ? 1 : 0;
  }

  static dodgeOutcome(dodgeHits, attackHits) {
    const d = Math.max(0, Number(dodgeHits) || 0);
    const a = Math.max(0, Number(attackHits) || 0);
    if (d > a) return { cleanMiss: true, carried: 0 };
    return { cleanMiss: false, carried: d };
  }

  /**
   * Roll a Missile Parry.  · *SR3 p.170*
   *
   * > "Make a Reaction Test (plus any Combat Pool dice you choose to allocate to the test)"
   *
   * ⚠ **Reaction is the dice, pool is the optional extra** — the opposite way round from a
   * dodge, which is pool dice only. A defender who allocated nothing still rolls their full
   * Reaction, so `poolDice === 0` is a real parry and not a declination.
   *
   * Rides the `isDodgeRoll` card machinery deliberately: the wave/explosion plumbing and its
   * carry are identical, and `dodgePayload.isMissileParry` picks the resolution rule apart at
   * the one point where the two differ. A parallel branch would have to duplicate ~70 carried
   * fields, which is exactly the class of bug `tests/explosion-carry.test.mjs` exists for.
   */
  static async _rollMissileParry(targetActor, poolDice, ctx) {
    const rea   = targetActor.system.attributes?.reaction?.value ?? 0;
    const dice  = Math.max(1, rea + Math.max(0, poolDice));
    const TN    = Math.max(2, ctx?.parryTN || 4);
    const label = `🖐 ${targetActor.name} parries — TN ${TN} (Reaction ${rea}`
                + `${poolDice > 0 ? ` + ${poolDice} pool` : ''})`;

    const rolled = targetActor._rollWave(dice, TN, true);
    const ones   = rolled.filter(d => d.isOne).length;

    await targetActor._postWaveCard({
      actorId:      targetActor.id,
      label,
      tn:           TN,
      pool:         dice,
      wave:         0,
      dice:         rolled,
      ones,
      glitch:       SR3EActor.isRuleOfOne(ones, dice),
      isWeaponRoll: false,
      isSoakRoll:   false,
      isDodgeRoll:  true,
      dodgePayload: { ...ctx, isMissileParry: true, parryPoolDice: poolDice, parryReaction: rea },
    });
  }

  static async _rollDodge(targetActor, dodgeDice, dodgeContext, physicalDice = false) {
    // p.113's three modifiers. `_rollWave` takes the TN as given — it is `rollPool` that
    // folds in the wound modifier, and the dodge path does not go through rollPool, which is
    // why a wounded defender used to dodge as though unhurt.
    const tnOpts = {
      burstRounds:   dodgeContext?.burstRounds   ?? 0,
      shotgunSpread: dodgeContext?.shotgunSpread ?? 0,
      woundMod:      targetActor.system.woundMod ?? 0,
    };
    const DODGE_TN  = SR3EActor.dodgeTN(tnOpts);
    const tnParts   = SR3EActor.dodgeTNParts(tnOpts);
    const label     = tnParts.length
      ? `🎯 ${targetActor.name} dodges — TN ${DODGE_TN} (4 ${tnParts.join(' ')})`
      : `🎯 ${targetActor.name} dodges`;

    let dice, ones, glitch;
    if (physicalDice) {
      const successes = await SR3EActor._promptPhysicalSuccesses(dodgeDice, DODGE_TN, label);
      if (successes === null) return;
      dice = SR3EActor._buildPhysicalDice(dodgeDice, successes); ones = 0; glitch = false;
    } else {
      dice   = targetActor._rollWave(dodgeDice, DODGE_TN, true);
      ones   = dice.filter(d => d.isOne).length;
      glitch = SR3EActor.isRuleOfOne(ones, dodgeDice);
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

  /**
   * A failed charge with no damage taken: Quickness (5) Test or fall prone.  · *CC p.86*
   *
   * ⚠ Only reachable when the defender inflicted NO damage. With damage there is a Knockdown
   * Test already, and the book says the +2 applies to that "instead" — see `chargingFailure`.
   */
  static async handleChargeQuickness(btn) {
    const ctx   = JSON.parse(btn.dataset.payload);
    const actor = game.actors.get(ctx.targetActorId ?? ctx.actorId);
    if (!actor) return;

    const tn   = Math.max(2, parseInt(ctx.tn) || 5);
    const dice = Math.max(1, actor.system?.attributes?.quickness?.value ?? 1);
    const roll = actor._rollWave(dice, tn, true);
    const ones = roll.filter(d => d.isOne).length;

    await actor._postWaveCard({
      actorId: actor.id,
      label:   `🏃 ${actor.name} — Quickness (${tn}) after a failed charge`,
      tn,
      pool:    dice,
      wave:    0,
      dice:    roll,
      ones,
      glitch:  SR3EActor.isRuleOfOne(ones, dice),
      isWeaponRoll:    false,
      isChargeRecovery: true,
      chargeContext:    { actorId: actor.id, tn },
    });
  }

  /**
   * The complete dice breakdown for one corner of an opposed card.
   *
   * The corner shows a summary in a column two inches wide; this is the whole story, including
   * the parts the summary has to leave out — every augmentation named with the item it came
   * from, category bonuses whether or not they are ticked, and what pool is still available.
   *
   * ⚠ READ-ONLY. It explains the numbers, it does not change them; the corner's own fields
   * remain the only place anything is edited. So there is no permission gate beyond being able
   * to see the card — a spectator learning why a number is 14 costs nothing.
   */
  static async showDiceBreakdown(btn) {
    const ctx   = JSON.parse(btn.dataset.payload);
    const actor = ctx.actorId ? game.actors.get(ctx.actorId) : null;
    const d     = actor?.system?.derived ?? {};

    const key   = ctx.requiredSkill || ctx.skillName || '';
    const srcs  = d.skillBonusSources?.[key] ?? d.skillBonusSources?.[ctx.skillName] ?? [];
    const auto  = d.skillBonusDice?.[key] ?? d.skillBonusDice?.[ctx.skillName] ?? 0;
    const cat   = SR3EActor.skillCategoryBonus(d.skillCategoryBonuses ?? [], ctx.skillCategory);

    const esc = v => String(v ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    const row = (label, value, note = '', cls = '') => `
      <tr class="${cls}">
        <td style="padding:3px 10px 3px 0;vertical-align:top">${label}
          ${note ? `<div style="font-size:10px;color:var(--sr-dim);margin-top:1px">${note}</div>` : ''}</td>
        <td style="padding:3px 0;text-align:right;white-space:nowrap;vertical-align:top"><strong>${value}</strong></td>
      </tr>`;

    const rows = [];

    /* ── What is being rolled ─────────────────────────────────────────────────── */
    rows.push(ctx.isDefault
      ? row(esc(ctx.skillName) || 'Attribute', ctx.skillRating,
            'Defaulting — the FULL attribute is rolled, and no pool dice are allowed (p.84)')
      : row(`${esc(ctx.skillName)} — base rating`, ctx.skillRating,
            ctx.skillCategory ? `category: ${esc(ctx.skillCategory)}` : ''));

    if (ctx.specBonus) {
      rows.push(row(`Specialisation — ${esc(ctx.specName)}`, `+${ctx.specBonus}`,
        'A specialisation rolls at base + its bonus'));
    }

    /* ── Augmentations, each named and explained ──────────────────────────────── */
    const KIND = { adept: '✨ Adept power', cyber: '⚙ Cyberware', bio: '🧬 Bioware' };
    for (const src of srcs) {
      rows.push(row(`${KIND[src.kind] ?? '⚙ Augmentation'} — ${esc(src.label)}`, `+${src.dice}`,
        src.note ? esc(src.note) : 'Always applies — folded into the Skill box automatically'));
    }

    // The named sources must account for the whole flat total. If they do not, say so
    // rather than let the two disagree in silence.
    const accounted = srcs.reduce((a, x) => a + (x.dice ?? 0), 0);
    if (auto !== accounted) {
      rows.push(row('Unattributed augmentation', `+${auto - accounted}`,
        'In the total but with no recorded source — likely an item edited by hand'));
    }

    rows.push(row('<strong>Skill dice rolled</strong>', ctx.skillDice,
      'This is the Skill box on the card', 'sr-bd-total-row'));

    /* ── Things that are OFFERED, not applied ─────────────────────────────────── */
    const optional = [];
    if (cat.dice) {
      optional.push(row(`${esc(cat.labels.join(' + '))}`, `+${cat.dice}`,
        'OPTIONAL — tick it on the card. Category bonuses are conditional, so the system '
        + 'will not decide for you (M&M p.66)'));
    }

    // Situational adept bonuses relevant to THIS side of a melee.
    // ⚠ Counterstrike is the defender's only — "these dice can only be used for
    // counterattacks" (MITS p.149), and in SR3 melee the defender's roll IS the counterattack.
    const sits = d.situationalBonuses ?? [];
    const relevant = ctx.role === 'defender' ? ['counterattack'] : [];
    for (const k of relevant) {
      const b = SR3EActor.situationalBonus(sits, k);
      if (!b.dice && !b.pool) continue;
      optional.push(row(esc(b.labels.join(' + ')), `+${b.dice || b.pool}`,
        `Applies to ${esc(game.sr3e.SR3E.adeptSituations[k] ?? k).toLowerCase()} only`));
    }

    if (ctx.availPool) {
      const dodgeB = SR3EActor.situationalBonus(sits, 'dodge');
      optional.push(row('Combat Pool available', ctx.availPool,
        'Allocate on the card. Spent for the whole Combat Turn, and dice spent dodging are '
        + 'gone from the Damage Resistance Test (p.113)'
        + (dodgeB.pool ? ` · +${dodgeB.pool} more when dodging, from ${esc(dodgeB.labels.join(' + '))}` : '')));
    }

    const reflex = d.reflex;
    const warn = reflex?.conflict
      ? `<div class="sr-alert sr-alert--danger" style="margin:8px 0 0;font-size:11px">
           ⚠ Improved Reflexes does not combine with technological or other magical
           Reaction/Initiative increases (SR3 p.169). The
           ${reflex.source === 'adept' ? 'adept' : 'cyberware'} package is applied; the other
           is ignored. This does not affect the dice above.
         </div>` : '';

    await foundry.applications.api.DialogV2.wait({
      window: { title: `${ctx.name} — why these dice?` },
      content: `
        <table style="width:100%;font-size:12px;border-collapse:collapse">${rows.join('')}</table>
        ${optional.length ? `
          <div style="margin-top:10px;font-size:11px;font-weight:600;color:var(--sr-muted);
                      text-transform:uppercase;letter-spacing:.05em">Available, not applied</div>
          <table style="width:100%;font-size:12px;border-collapse:collapse">${optional.join('')}</table>` : ''}
        ${warn}
        <p style="margin:10px 0 0;font-size:10px;color:var(--sr-dim)">
          Read-only. Edit the numbers in your own corner of the card.
        </p>`,
      buttons: [{ label: 'Close', action: 'close', default: true }],
    });
  }

  /**
   * The Knockdown Test — the target's Body Test after damage resolves.  · *SR3 p.124*
   *
   * A third stage, so a separate card and a separate click. Gated to the defender: it ROLLS.
   */
  static async handleKnockdown(btn) {
    const ctx    = JSON.parse(btn.dataset.payload);
    const target = game.actors.get(ctx.targetActorId ?? ctx.actorId);
    if (!target) return;

    const level = String(ctx.level ?? '').toUpperCase();

    // Deadly skips the test outright — there is no number that saves you.
    if (level === 'D') {
      const auto = SR3EActor.knockdownOutcome({ level: 'D' });
      await SR3EActor._postKnockdownResult(target, auto);
      return;
    }

    const attacker  = ctx.attackerActorId ? game.actors.get(ctx.attackerActorId) : null;
    const atkStr    = attacker?.system?.attributes?.strength?.value ?? 0;
    // A failed Charging Attack adds +2 here rather than costing a separate Quickness test
    // (CC p.86) — see chargingFailure. Zero for every other attack.
    const tnDefault = SR3EActor.knockdownTN({
      power: ctx.power, strength: atkStr, isMelee: ctx.isMelee, ammoType: ctx.ammoType,
    }) + Math.max(0, Math.trunc(Number(ctx.knockdownTNMod) || 0));
    const needed  = SR3EActor.knockdownOutcome({ level, tested: false }).needed ?? 2;
    /* Rooting and Enhanced Balance add dice to *"all tests to resist being knocked down,
     * thrown, levitated or otherwise moved against his will"* (MITS p.151, SOTA2 p.65).
     *
     * ⚠ Applied automatically, not offered: this flow IS the Knockdown Test, so there is
     * nothing for a human to judge. That is the whole point of scoping a bonus by situation
     * rather than by skill — the code already knows which situation it is in.
     */
    const kdBonus = SR3EActor.situationalBonus(
      target.system?.derived?.situationalBonuses ?? [], 'knockdown');
    const bodyDef = (target.system?.attributes?.body?.value ?? 1) + kdBonus.dice;

    // The target's CURRENT wound level, shown for context: p.124 can be read as using it
    // rather than the wound just taken, so the threshold is editable and this is the number a
    // table reading it that way would type. See knockdownOutcome for the two quotations.
    const curLevel = SR3EActor._currentWoundLevel(target);
    const curNeed  = curLevel
      ? (SR3EActor.knockdownOutcome({ level: curLevel, tested: false }).needed ?? null) : null;

    const tnNote = ctx.isMelee
      ? `Melee — TN is the opponent's Strength${attacker ? ` (${attacker.name} ${atkStr})` : ''}.`
      : ctx.ammoType === 'gel'
        ? `Gel rounds — TN is the <strong>full</strong> Power ${ctx.power} (p.116), not half.`
        : `Ranged — TN is half the attack's Power (${ctx.power} ÷ 2, rounding down).`;

    const curNote = (curNeed && curLevel !== level)
      ? ` ${target.name} is currently at <strong>${SR3EActor._woundName(curLevel)}</strong> — a table reading p.124 as overall condition would use <strong>${curNeed}</strong>.`
      : '';

    let go = false, bodyDice = bodyDef, tn = tnDefault, need = needed;
    await foundry.applications.api.DialogV2.wait({
      window: { title: `${target.name} — Knockdown Test` },
      content: `
        <p style="margin-bottom:8px;font-size:12px">
          ${target.name} took a <strong>${SR3EActor._woundName(level)}</strong> wound and must stay on their feet.
        </p>
        <p style="margin-bottom:8px;font-size:11px;color:var(--sr-muted)">${tnNote}</p>
        <label style="display:block;margin-bottom:6px">Body dice
          <input type="number" id="kd-body" value="${bodyDef}" min="1" max="50" style="width:60px;margin-left:6px"/>
          ${kdBonus.dice ? `<span style="font-size:11px;color:var(--sr-gold);margin-left:6px">includes +${kdBonus.dice} from ${kdBonus.labels.join(' + ')}</span>` : ''}
        </label>
        <label style="display:block;margin-bottom:6px">Target number
          <input type="number" id="kd-tn" value="${tnDefault}" min="2" max="30" style="width:60px;margin-left:6px"/>
        </label>
        <label style="display:block;margin-bottom:4px">Successes needed to stay standing
          <input type="number" id="kd-need" value="${needed}" min="1" max="10" style="width:60px;margin-left:6px"/>
        </label>
        <p style="margin:0;font-size:11px;color:var(--sr-amber)">
          Defaulted from the wound just taken.${curNote}
        </p>`,
      buttons: [
        { label: '🎲 Roll Body', action: 'go', default: true,
          callback: (_e, _b, d) => {
            go = true;
            bodyDice = Math.max(1, parseInt(d.element.querySelector('#kd-body')?.value) || bodyDef);
            tn       = Math.max(2, parseInt(d.element.querySelector('#kd-tn')?.value) || tnDefault);
            need     = Math.max(1, parseInt(d.element.querySelector('#kd-need')?.value) || needed);
          } },
        { label: 'Skip', action: 'skip' },
      ],
    });
    if (!go) return;

    const dice = target._rollWave(bodyDice, tn, true);
    const ones = dice.filter(d => d.isOne).length;

    await target._postWaveCard({
      actorId: target.id,
      label:   `💥 ${target.name} — Knockdown Test (TN ${tn}, ${need} to stay up)`,
      tn,
      pool:    bodyDice,
      wave:    0,
      dice,
      ones,
      glitch:  SR3EActor.isRuleOfOne(ones, bodyDice),
      isWeaponRoll:     false,
      isKnockdownRoll:  true,
      knockdownContext: { ...ctx, needed: need },
    });
  }

  /**
   * The wound level a character's condition monitor currently sits at, or null if unhurt.
   * Context only — the Knockdown threshold defaults from the wound just taken.
   */
  static _currentWoundLevel(actor) {
    const w = actor?.system?.wounds ?? {};
    const worst = Math.max(w.physical?.value ?? 0, w.stun?.value ?? 0);
    if (worst >= 10) return 'D';
    if (worst >= 6)  return 'S';
    if (worst >= 3)  return 'M';
    if (worst >= 1)  return 'L';
    return null;
  }

  /** Announce a knockdown outcome, with a prone toggle when they went down. */
  static async _postKnockdownResult(target, out) {
    const proneP = JSON.stringify({ actorId: target.id }).replace(/'/g, '&#39;');
    let body;
    if (out.automatic) {
      body = `<div class="sr-melee-result sr-melee-win">
                💥 <strong>Deadly wound — ${target.name} is knocked down automatically.</strong>
                <span style="color:var(--sr-dim)">No test is possible (p.124).</span>
              </div>`;
    } else if (out.knockedDown) {
      body = `<div class="sr-melee-result sr-melee-win">
                💥 No successes — <strong>${target.name} falls prone.</strong>
              </div>`;
    } else if (out.staggered) {
      body = `<div class="sr-dodge-result sr-dodge-fail">
                ↩ ${target.name} stays up but is driven back about a metre.
                <div style="font-size:11px;color:var(--sr-amber);margin-top:2px">
                  If they cannot step back — against a wall, say — they fight at
                  <strong>+2 to their target numbers</strong> until they can move away (p.124).
                </div>
              </div>`;
    } else {
      body = `<div class="sr-dodge-result sr-dodge-success">
                ✅ ${target.name} keeps their feet.
              </div>`;
    }

    const proneBtn = (out.knockedDown || out.automatic)
      ? `<div class="sr-soak-action">
           <button class="sr-prone-btn" data-payload='${proneP}'>🔻 Mark ${target.name} prone</button>
         </div>`
      : '';

    await ChatMessage.create({
      content: `<div class="sr-roll-card">${body}${proneBtn}</div>`,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
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

    // Body dice are free; Combat Pool dice are not, so they are separate fields — one merged
    // number made it impossible to tell which dice had to be charged (TODO 43).
    //
    // Read at POST time, which is also the point of the rule: a defender who burned pool on a
    // failed dodge arrives here with less, and p.113's worked example turns on exactly that —
    // Snot spends all five dodging and then has "no dice remaining in his Combat Pool with
    // which to increase his odds of survival." Showing 0 left is the trade being visible.
    const availPool = this.type === 'vehicle' ? 0 : (this.system.derived?.availableCombatPool ?? 0);

    // Worn armour plus implant armour (Bone Lacing, Dermal Sheath, Orthoskin — cumulative,
    // SR3 p.300 / M&M p.27-28, p.68). Vehicles use their Armor attribute. TODO 75.
    const armorR = SR3EActor.armorRatings(this);
    let ballistic = armorR.ballistic;
    let impact    = armorR.impact;

    /* ── Mystic Armor · SR3 p.170 (TODO 68) ───────────────────────────────────────────
     *
     * > "Each level provides you with 1 point of Impact Armor, cumulative with any worn
     * > Impact Armor. Mystic Armor does not provide Ballistic Armor. Mystic Armor also
     * > protects against damage done in astral combat."
     *
     * ⚠ **Impact only.** Adding it to Ballistic would make it the best armour in the game
     * against the most common attack in it.
     * ⚠ **Cumulative**, so it adds to worn armour rather than replacing it — and it applies
     * with no armour worn at all, which is the case the power is bought for.
     * ⚠ **It survives Flechette's doubling**, because it is added BEFORE the ammo rules run:
     * the doubled figure is "the highest of ballistic/impact", and the adept's skin is part
     * of that. Adding it afterwards would quietly halve the power against flechette.
     */
    const mysticArmor = Math.max(0, this.system.derived?.mysticArmor ?? 0);
    if (mysticArmor > 0) impact += mysticArmor;

    /* ── Penetrating Strike · SOTA2 p.67 ──────────────────────────────────────────────
     *
     * > "Each level of Penetrating Strike allows an adept to reduce the target's Impact
     * > armor by 1 for the purposes of determining damage only."
     *
     * The ATTACKER's power reducing the DEFENDER's armour, so it rides in on the payload
     * rather than being read off this actor. Floors at 0 — it cannot make armour negative
     * and start adding to the soak TN.
     */
    const penetrating = Math.max(0, payload.penetratingStrike ?? 0);
    if (penetrating > 0) impact = Math.max(0, impact - penetrating);
    // Ammo armour interactions (APDS / Flechette). Other types resolve at attack time.
    const ammoRules = game.sr3e.SR3E.ammoTypes[payload.ammoType] ?? {};
    let ammoNote = '';
    const adeptArmorNotes = [];
    // Implant armour is not an adept power, but it is the same kind of note: armour the card
    // added on top of what is worn, named so nobody has to wonder where a point came from.
    for (const src of armorR.implants.sources) {
      const parts = [src.ballistic ? `+${src.ballistic} Ballistic` : '', src.impact ? `+${src.impact} Impact` : '']
        .filter(Boolean).join(', ');
      adeptArmorNotes.push(`${src.name} ${parts}`);
    }
    if (mysticArmor > 0) adeptArmorNotes.push(`Mystic Armor +${mysticArmor} Impact (p.170)`);
    if (penetrating > 0) adeptArmorNotes.push(`Penetrating Strike −${penetrating} Impact (SOTA2 p.67)`);
    if (ammoRules.armorEffect === 'gel') {
      ammoNote = `Gel — Impact armour applies (${impact}), not Ballistic`;
    } else if (ammoRules.armorEffect === 'apds') {
      ballistic = Math.floor(ballistic / 2);
      ammoNote  = `APDS — ballistic armour halved (now ${ballistic})`;
    } else if (ammoRules.armorEffect === 'flechette') {
      const dermal = this.type === 'vehicle' ? [] : SR3EActor.dermalArmorSources(this);
      if (SR3EActor.flechetteRaisesLevel({ ballistic, impact, dermalArmor: dermal.length })) {
        // Unarmoured target — damage level stages up one
        const STAGES = ['L', 'M', 'S', 'D'];
        const li = STAGES.indexOf(effStagedLevel);
        if (li >= 0) effStagedLevel = STAGES[Math.min(3, li + 1)];
        ammoNote = `Flechette vs unarmoured — damage level raised to ${effStagedLevel}`;
      } else if (Math.max(ballistic, impact) <= 0) {
        ammoNote = `Flechette vs unarmoured — no level increase: dermal armor negates it `
                 + `(${dermal.join(', ')}; p.116)`;
      } else {
        const eff = SR3EActor.flechetteArmor({ ballistic, impact });
        ammoNote  = `Flechette vs armour — effective armour ${eff} `
                  + `(max of Impact ${impact}×2 and Ballistic ${ballistic}, p.116)`;
        ballistic = eff;
        impact    = eff;
      }
    }

    // Which armour rating resists this attack. Melee uses Impact, ranged uses Ballistic —
    // except gel rounds, which are a ranged attack the rules resist with Impact. That
    // exception is declared on the ammo type (config.js) rather than hard-coded here, so it
    // sits with the rest of the ammo-armour rules instead of hiding in the selection.
    const usesImpact   = isMelee || ammoRules.armorEffect === 'gel';
    const defaultArmor = usesImpact ? impact : ballistic;

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
      // Carried in from a failed Dodge Test; added to this test's successes.
      carriedSuccesses: payload.carriedSuccesses ?? 0,
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
          ${adeptArmorNotes.length ? `<div class="sr-roll-meta" style="color:var(--sr-gold);font-size:11px">✨ ${adeptArmorNotes.join(' · ')}</div>` : ''}
          <div class="sr-soak-fields">
            <label class="sr-soak-label">
              Body dice:
              <input type="number" class="sr-soak-body" value="${body}" min="0" max="30" style="width:55px"/>
            </label>
            ${availPool > 0
              ? `<label class="sr-soak-label">
                   Combat Pool (<strong>${availPool}</strong> left):
                   <input type="number" class="sr-soak-cp" value="0" min="0" max="${availPool}" style="width:55px"/>
                 </label>`
              : `<div class="sr-roll-meta" style="font-size:11px;color:var(--sr-amber)">
                   No Combat Pool left to soak with.
                 </div>`}
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
    const body      = Math.max(0, parseInt(card.querySelector('.sr-soak-body')?.value) || 0);
    const wantCP    = Math.max(0, parseInt(card.querySelector('.sr-soak-cp')?.value)   || 0);
    const tn        = parseInt(card.querySelector('.sr-soak-tn')?.value) || 2;

    btn.disabled    = true;
    btn.textContent = '⏳ Rolling…';

    const actor = game.actors.get(payload.actorId);
    if (!actor) return;

    // Clamp locally so the physical-dice prompt never asks about dice the actor cannot
    // have. `spendCombatPool` clamps again authoritatively — this is presentation only.
    actor.prepareDerivedData();
    const availCP = actor.system.derived?.availableCombatPool ?? 0;
    const useCP   = Math.min(wantCP, availCP);
    const pool    = Math.max(1, body + useCP);

    const effectiveTN = Math.max(2, tn);
    const label       = useCP > 0
      ? `🛡 ${actor.name} resists (${body} Body + ${useCP} Combat Pool)`
      : `🛡 ${actor.name} resists`;

    let dice, ones, glitch;
    if (physicalDice) {
      const successes = await SR3EActor._promptPhysicalSuccesses(pool, effectiveTN, label);
      // Nothing has been spent yet, so a cancel here costs the actor nothing.
      if (successes === null) { btn.disabled = false; btn.textContent = 'Roll Soak'; return; }
      dice = SR3EActor._buildPhysicalDice(pool, successes); ones = 0; glitch = false;
    } else {
      dice  = actor._rollWave(pool, effectiveTN, true);
      ones  = dice.filter(d => d.isOne).length;
      glitch = SR3EActor.isRuleOfOne(ones, pool);
    }

    // Charge AFTER the roll is certain — the physical-dice path above is cancellable, and
    // spending before it would bill an actor for a roll that never happened. Routed through
    // spendCombatPool so a player without UPDATE on their own actor still lands the write
    // on the GM.
    if (useCP > 0) {
      const spent = await actor.spendCombatPool(useCP);
      if (spent < useCP) {
        ui.notifications.warn(
          `${actor.name}: only ${spent} of ${useCP} Combat Pool dice were available — ` +
          `the roll used ${pool}. Adjust by hand if needed.`);
      }
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
    // Disable immediately as a double-click guard, but do NOT claim success yet — the
    // label is only truthful once a write has actually landed. Every bail below restores
    // the button so the user can retry rather than being left with a dead control.
    btn.disabled = true;
    const fail = msg => { ui.notifications.warn(msg); btn.disabled = false; return null; };

    let p;
    try { p = JSON.parse(btn.dataset.payload); }
    catch { return fail('Damage payload could not be read — no damage applied.'); }

    // Which track, and on what. The uuid/id is resolved GM-side.
    const kind = p.icActorId      ? 'ic'
               : p.vehicleActorId ? 'vehicle'
               : p.wardActorId    ? 'ward'
               :                    'actor';
    const uuid = p.icActorId ?? p.vehicleActorId ?? p.wardActorId ?? p.actorId;

    try {
      // Relay the DELTA (boxes). The GM reads current/max live and does the
      // Math.min itself — two players clicking Assign at once must not both
      // compute from the same stale `current` and lose one another's damage.
      const res = (!game.users.activeGM?.isSelf)
        ? await game.sr3e.SR3EQuery.asGM('sr3e.damage.apply', { uuid, kind, track: p.track, boxes: p.boxes })
        : await SR3EActor._applyDamageBoxes({ uuid, kind, track: p.track, boxes: p.boxes });
      if (!res?.ok) return fail(res?.reason ?? 'Damage could not be applied.');
    } catch (err) {
      return fail(err?.message ?? 'Damage could not be applied.');
    }

    btn.textContent = '✓ Damage Applied';   // truthful only now — a write has landed
  }

  /**
   * GM-side damage application. Reads current/max against live data inside the
   * per-document queue, so concurrent Assign clicks accumulate instead of
   * overwriting each other.
   *
   * @param {object}  p
   * @param {string}  p.uuid   actor uuid, or a legacy bare actor id
   * @param {string}  p.kind   'ic' | 'vehicle' | 'ward' | 'actor'
   * @param {string} [p.track] wound track, for kind 'actor'
   * @param {number}  p.boxes  boxes to ADD
   * @returns {Promise<{ok:boolean, reason?:string}>}
   */
  static async _applyDamageBoxes({ uuid, kind, track, boxes }) {
    const doc = game.sr3e.SR3EQuery.resolve(uuid);
    if (!doc) return { ok: false, reason: 'That target no longer exists — no damage applied.' };

    return game.sr3e.SR3EQueue.run(doc.uuid, async () => {
      if (kind === 'ic') {
        const current = doc.system.woundValue ?? 0;
        const max     = doc.system.derived?.woundMax ?? (doc.system.rating ?? 1) * 2;
        await doc.update({ 'system.woundValue': Math.min(max, current + boxes) });
      } else if (kind === 'vehicle') {
        const current = doc.system.damage?.value ?? 0;
        const max     = (doc.system.attributes?.body?.base ?? 4) * 2;
        await doc.update({ 'system.damage.value': Math.min(max, current + boxes) });
      } else if (kind === 'ward') {
        const current   = doc.system.damage ?? 0;
        const max       = doc.system.maxForce ?? 1;
        const newDamage = Math.min(max, current + boxes);
        await doc.update({ 'system.damage': newDamage });
        if (newDamage >= max) {
          await ChatMessage.create({
            speaker: { alias: 'GM' },
            content: `<div class="sr-roll-card sr-soak-card"><div class="sr-roll-header">💀 ${doc.name} destroyed</div>
              <div style="font-size:12px;color:var(--sr-muted);padding:4px 0">Force reduced to 0 — dispel it from its sheet when ready.</div></div>`,
          });
        }
      } else {
        const current = doc.system.wounds?.[track]?.value ?? 0;
        const max     = doc.system.wounds?.[track]?.max ?? 10;
        await doc.update({ [`system.wounds.${track}.value`]: Math.min(max, current + boxes) });
      }
      return { ok: true };
    });
  }

  /**
   * Reserved Full Defense dice for this actor. **PURE READ — never clears.**
   *
   * The split matters. The old code read the reserve, announced it and cleared
   * the flag all inside the dodge dialog, so a cancelled or withdrawn attack
   * still consumed the defender's entire Full Defense declaration. Reading and
   * clearing are now separate, and the clear happens only once the exchange has
   * actually committed.
   *
   * @param {Actor} actor
   * @returns {number} reserved dice, or 0
   */
  static _fullDefenseDice(actor) {
    if (!actor?.system?.fullDefense) return 0;
    return actor.system.fullDefensePool ?? 0;
  }

  /**
   * Clear a Full Defense declaration once it has actually been consumed.
   *
   * Separate from `toggleFullDefense` because this is not a toggle — it is the
   * commit half of the read/commit split, and calling toggle here would re-arm
   * Full Defense if the flag had already been cleared by something else.
   */
  async clearFullDefense() {
    const changes = { 'system.fullDefense': false, 'system.fullDefensePool': 0 };
    if (!game.users.activeGM?.isSelf) {
      await game.sr3e.SR3EQuery.asGM('sr3e.actor.set', { uuid: this.uuid, changes });
      return;
    }
    await this.update(changes);
  }

  /**
   * Announce an automatic Full Defense commit.
   *
   * Not chat pollution: it is the record of dice committed on the defender's
   * behalf without them being asked in the moment. The GM is its correct author,
   * since the GM is the client that commits it.
   *
   * @param {Actor} actor
   * @param {number} dice
   */
  static async _announceFullDefense(actor, dice) {
    if (!actor || dice <= 0) return;
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="sr-roll-card"><div class="sr-roll-header">🛡 ${actor.name} — Full Defense (${dice} dice auto-committed)</div></div>`,
      style:   CONST.CHAT_MESSAGE_STYLES.OTHER,
    });
  }

  /**
   * Spend combat pool dice, clamped to available pool.
   * Returns how many were actually spent.
   *
   * GM-authoritative: a non-GM client relays the INTENT (`n` dice) rather than a
   * pre-computed absolute, because two clients reading `combatPoolSpent: 0` would
   * both send `3` and only one would stick. The GM re-enters this method, takes
   * the local branch, and reads live data inside the per-document queue.
   */
  /**
   * Total Essence cost of the cyberware an actor is CURRENTLY carrying. **Pure.**
   *
   * Bioware is excluded on purpose: M&M charges it against the Bio Index, not Essence.
   */
  static installedEssenceCost(items) {
    let total = 0;
    for (const item of (items ?? [])) {
      if (item?.type !== 'cyberware') continue;
      const c = SR3EActor.gradedEssenceCost(item.system?.essenceCost, item.system?.grade);
      if (Number.isFinite(c)) total += c;
    }
    return parseFloat(total.toFixed(2));
  }

  /**
   * An implant's Essence cost after its grade · *M&M p.45* — **pure**.
   *
   * > "Reduce the Base Essence Cost by the percentage listed (or use the multiplier given in
   * > parentheses). **Round all numbers up. Essence Cost may never be reduced below .01** in
   * > this manner."
   *
   * ⚠ **Rounded UP, per item, to two decimals** — not on the total. Essence is tracked to 2dp
   * throughout (`4.24`, `1.76`, `0.42`), and rounding a sum instead of each part would let a
   * character with several cheap alphaware implants come out below what the book charges.
   *
   * ⚠ **The .01 floor applies to the REDUCTION, not to a free item.** A base cost of 0 stays 0
   * — that is an implant with no Essence cost, not one reduced to nothing. Reading the floor as
   * unconditional would silently charge for every cosmetic mod.
   *
   * ⚠ **An unknown grade costs FULL Essence.** Bioware's `Cultured`/`Exotic`, a GM's typo, or a
   * grade from a book we do not have all fall to ×1 — the conservative direction. A default of
   * "cheapest" would quietly hand back Essence nobody paid for, and Essence is permanent
   * ([#5](TODO.md)), so an over-refund is far worse than an over-charge.
   *
   * ⚠ **`grade` is KEPT even though only this reads it**, because a player salvaging chrome off
   * a corpse needs to know whether it is standard, alpha or beta — that is what the part is
   * worth. Do not collapse the field into a pre-multiplied number.
   *
   * @param {number|string} cost   the item's base `essenceCost`
   * @param {string} grade         the item's `grade`, free text
   * @returns {number} Essence actually paid, to 2dp
   */
  static gradedEssenceCost(cost, grade) {
    const base = parseFloat(cost ?? 0);
    if (!Number.isFinite(base) || base <= 0) return 0;
    const table = globalThis.game?.sr3e?.SR3E?.cyberwareGradeEssence ?? SR3EActor._GRADES_FALLBACK;
    /* ⚠ "Used Alpha" must read as alpha: used halves the PRICE and leaves Essence "by grade"
     * (M&M p.45), so the word is stripped rather than treated as a grade of its own. */
    const key = String(grade ?? '').toLowerCase().replace(/\bused\b/g, '').trim();
    const mult = table[key] ?? 1;
    if (mult === 1) return parseFloat(base.toFixed(2));
    return Math.max(0.01, Math.ceil(base * mult * 100) / 100);
  }

  /** Used when `game` is not available — tests, and any pre-`init` call. */
  static _GRADES_FALLBACK = {
    standard: 1, basic: 1, alpha: 0.8, alphaware: 0.8,
    beta: 0.6, betaware: 0.6, delta: 0.5, deltaware: 0.5,
  };

  /**
   * Current Essence from the persisted mark and what is installed. **Pure.**
   *
   * `max(lost, installed)` is doing two jobs at once:
   *   • it RATCHETS — removing cyberware cannot lower the mark, so the loss stays;
   *   • it MIGRATES — an actor from before `lost` existed has `lost: 0`, and still
   *     reads correctly from its installed hardware alone.
   *
   * Floors at 0: SR3 has no negative Essence, and the two values that hang off it
   * (Bio Index capacity, effective Magic) would go strange rather than merely low.
   */
  static essenceValue({ base = 6, lost = null, installed = 0 } = {}) {
    const b = Number.isFinite(Number(base)) ? Number(base) : 6;
    const inst = Number(installed) || 0;

    // `lost == null` means nothing has ever been recorded, so fall back to the hardware.
    // That is the migration path for actors saved before the field existed, and it is the
    // ONLY case where installed cyberware decides the answer.
    //
    // ⚠ Once a number is present it WINS OUTRIGHT — it is not `max`ed against installed.
    // The max was the first design and it silently blocked the one thing a GM most needs:
    // undoing a mistake. A player who installs the wrong 2.0 of chrome and has it removed
    // could not be given the Essence back, because the number they were being corrected
    // to was below what the (already deleted) hardware implied. The GM is trusted here,
    // as everywhere else in this system.
    const effective = (lost === null || lost === undefined) ? inst : (Number(lost) || 0);
    return Math.max(0, parseFloat((b - effective).toFixed(2)));
  }

  /**
   * Translate a direct edit of the DERIVED Essence field into the persisted mark.
   *
   * The sheet has always shown an editable Essence box, and it has never worked: the
   * next `prepareDerivedData` overwrote whatever was typed, so the number reverted with
   * no error. Rather than remove a control GMs need for chargen, imports and
   * houserules, a write to `essence.value` is rewritten as the `lost` it implies.
   *
   * ⚠ This is a DOWNWARD-ONLY control by nature — typing a HIGHER Essence lowers `lost`,
   * which is the one way to undo a mistaken install. That is deliberate: the ratchet
   * exists to stop cyberware REMOVAL refunding Essence, not to stop a GM correcting
   * their own data. Minimal guardrails.
   */
  async _preUpdate(changed, options, user) {
    const v = foundry.utils.getProperty(changed, 'system.attributes.essence.value');
    if (v !== undefined && foundry.utils.getProperty(changed, 'system.attributes.essence.lost') === undefined) {
      const base = this.system?.attributes?.essence?.base ?? 6;
      foundry.utils.setProperty(changed, 'system.attributes.essence.lost',
        Math.max(0, parseFloat((base - (Number(v) || 0)).toFixed(2))));
    }
    return super._preUpdate(changed, options, user);
  }

  async spendCombatPool(amount) {
    if (!game.users.activeGM?.isSelf) {
      const { spent } = await game.sr3e.SR3EQuery.asGM('sr3e.pool.spend',
        { uuid: this.uuid, pool: 'combat', n: amount });
      return spent;
    }
    return game.sr3e.SR3EQueue.run(this.uuid, async () => {
      const available = this.system.derived?.availableCombatPool ?? 0;
      const spend     = Math.min(amount, available);
      if (spend > 0) {
        await this.update({ 'system.combatPoolSpent': (this.system.combatPoolSpent ?? 0) + spend });
      }
      return spend;
    });
  }

  /**
   * Reset combat pool spending.
   */
  async refreshCombatPool() {
    if (!game.users.activeGM?.isSelf) {
      await game.sr3e.SR3EQuery.asGM('sr3e.pool.refresh', { uuid: this.uuid, pool: 'combat' });
      return;
    }
    await this.update({ 'system.combatPoolSpent': 0 });
  }

  /**
   * Spend spell pool dice, clamped to available pool.
   */
  async spendSpellPool(amount) {
    if (!game.users.activeGM?.isSelf) {
      const { spent } = await game.sr3e.SR3EQuery.asGM('sr3e.pool.spend',
        { uuid: this.uuid, pool: 'spell', n: amount });
      return spent;
    }
    return game.sr3e.SR3EQueue.run(this.uuid, async () => {
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
    });
  }

  /**
   * Reset spell pool spending.
   */
  async refreshSpellPool() {
    if (!game.users.activeGM?.isSelf) {
      await game.sr3e.SR3EQuery.asGM('sr3e.pool.refresh', { uuid: this.uuid, pool: 'spell' });
      return;
    }
    await this.update({ 'system.spellPoolSpent': 0 });
  }

  /**
   * Toggle Full Defense for this combatant.
   * Declares all available combat pool dice as defense for the current pass.
   * The pool is not pre-spent — it remains available to allocate during dodge declarations.
   */
  async toggleFullDefense() {
    const current = this.system.fullDefense ?? false;
    // fullDefense/fullDefensePool are absolute, non-accumulating values, so
    // last-writer-wins is correct here and `actor.set` is the right verb.
    const set = async changes => {
      if (!game.users.activeGM?.isSelf) {
        await game.sr3e.SR3EQuery.asGM('sr3e.actor.set', { uuid: this.uuid, changes });
        return;
      }
      await this.update(changes);
    };
    if (current) {
      await set({ 'system.fullDefense': false, 'system.fullDefensePool': 0 });
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
      await set({ 'system.fullDefense': true, 'system.fullDefensePool': avail });
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
    if (!game.users.activeGM?.isSelf) {
      await game.sr3e.SR3EQuery.asGM('sr3e.pool.refresh', { uuid: this.uuid, pool: 'hacking' });
      return;
    }
    await this.update({ 'system.hackingPoolSpent': 0 });
  }

  /**
   * Reset recoil accumulation (called at start of each new combat phase).
   * Absolute write — last-writer-wins is correct.
   */
  async resetRecoil() {
    if (!game.users.activeGM?.isSelf) {
      await game.sr3e.SR3EQuery.asGM('sr3e.actor.set',
        { uuid: this.uuid, changes: { 'system.roundsFiredThisPhase': 0 } });
      return;
    }
    await this.update({ 'system.roundsFiredThisPhase': 0 });
  }

  /**
   * Spend from the available hacking pool. Returns actual amount spent.
   */
  async spendHackingPool(amount) {
    if (!game.users.activeGM?.isSelf) {
      const { spent } = await game.sr3e.SR3EQuery.asGM('sr3e.pool.spend',
        { uuid: this.uuid, pool: 'hacking', n: amount });
      return spent;
    }
    return game.sr3e.SR3EQueue.run(this.uuid, async () => {
      // ⚠ Both rulesets, or Orthodox deckers can never spend a die.
      //
      // `availableHackingPool` is derived from an EQUIPPED CYBERDECK ITEM, which only a
      // Defragged decker has; an Orthodox decker keeps deck stats on the actor, so theirs
      // is null and this clamped every spend to 0 — silently, since spending nothing looks
      // exactly like choosing to spend nothing. Whichever pool the actor actually has wins.
      const d      = this.system.derived ?? {};
      const avail  = d.availableHackingPool ?? d.availableOrthodoxHackingPool ?? 0;
      const actual = Math.min(amount, avail);
      if (actual > 0) {
        await this.update({ 'system.hackingPoolSpent': (this.system.hackingPoolSpent ?? 0) + actual });
      }
      return actual;
    });
  }

  async spendAstralPool(amount) {
    if (!game.users.activeGM?.isSelf) {
      const { spent } = await game.sr3e.SR3EQuery.asGM('sr3e.pool.spend',
        { uuid: this.uuid, pool: 'astral', n: amount });
      return spent;
    }
    return game.sr3e.SR3EQueue.run(this.uuid, async () => {
      const available = this.system.derived?.availableAstralPool ?? 0;
      const spend     = Math.min(amount, available);
      if (spend > 0) {
        await this.update({ 'system.astralPoolSpent': (this.system.astralPoolSpent ?? 0) + spend });
      }
      return spend;
    });
  }

  /**
   * Reset astral pool spending.
   */
  async refreshAstralPool() {
    if (!game.users.activeGM?.isSelf) {
      await game.sr3e.SR3EQuery.asGM('sr3e.pool.refresh', { uuid: this.uuid, pool: 'astral' });
      return;
    }
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
    // The pool is SET here (a fresh declaration), not accumulated, so actor.set
    // is correct. spendSpellPool below routes its own intent.
    const changes = {
      'system.spellDefensePool':        pool,
      'system.spellDefenseSorceryDice': sorceryDice,
    };
    if (!game.users.activeGM?.isSelf) {
      // spellDefensePool is normally an accumulator; here it is a fresh total,
      // not a delta off the current value — hence the explicit opt-out.
      await game.sr3e.SR3EQuery.asGM('sr3e.actor.set',
        { uuid: this.uuid, changes, allowAbsolute: ['system.spellDefensePool'] });
    } else {
      await this.update(changes);
    }
    // Reserve only what was actually paid for. `spellDefensePool` was written above as an
    // ABSOLUTE, so a short grant would otherwise reserve dice that were never deducted and
    // roll them later in the turn. Between building the dialog and committing, another
    // client can have spent from the same pool — which is precisely the case this branch
    // exists to handle.
    const sdSpent = spellDice > 0 ? await this.spendSpellPool(spellDice) : 0;
    if (sdSpent !== spellDice) {
      ui.notifications.warn(`${this.name}: only ${sdSpent} of ${spellDice} Spell Pool dice were available for Spell Defense.`);
      const fix = { 'system.spellDefensePool': sdSpent };
      if (!game.users.activeGM?.isSelf) {
        await game.sr3e.SR3EQuery.asGM('sr3e.actor.set',
          { uuid: this.uuid, changes: fix, allowAbsolute: ['system.spellDefensePool'] });
      } else {
        await this.update(fix);
      }
    }
  }

  /**
   * Deduct n dice from the Spell Defense pool (clamped to available).
   * Accumulating (read-modify-write), so it relays intent like the other pools.
   */
  async useSpellDefenseDice(n) {
    if (!game.users.activeGM?.isSelf) {
      const { spent } = await game.sr3e.SR3EQuery.asGM('sr3e.pool.spend',
        { uuid: this.uuid, pool: 'spellDefense', n });
      return spent;
    }
    return game.sr3e.SR3EQueue.run(this.uuid, async () => {
      const current = this.system.spellDefensePool ?? 0;
      const spend   = Math.min(n, current);
      if (spend > 0) await this.update({ 'system.spellDefensePool': current - spend });
      return spend;
    });
  }

  /**
   * Clear Spell Defense state at round end.
   * Sorcery dice are "returned" (commitment removed); Spell Pool dice
   * remain spent until the GM manually refreshes pools.
   */
  async clearSpellDefense() {
    const changes = {
      'system.spellDefensePool':        0,
      'system.spellDefenseSorceryDice': 0,
    };
    if (!game.users.activeGM?.isSelf) {
      // Writing a constant 0, not a delta — safe as an absolute.
      await game.sr3e.SR3EQuery.asGM('sr3e.actor.set',
        { uuid: this.uuid, changes, allowAbsolute: ['system.spellDefensePool'] });
      return;
    }
    await this.update(changes);
  }

  /**
   * Show the Spell Defense declaration dialog for all Sorcery-capable actors
   * in the current combat. Called after initiative is rolled each round.
   */
  /**
   * Ask every Sorcery-capable combatant to declare Spell Defense for the round — each on
   * their OWN client.
   *
   * This used to post ONE public chat card carrying a row per mage, so whoever clicked
   * Commit (in practice the GM, since they advance the round) allocated every player
   * mage's Sorcery and Spell Pool dice. That is the dodge bug in a different costume, and
   * worse: Spell Defense commits Spell Pool for the WHOLE round, so a bad guess costs the
   * player their spellcasting rather than one exchange.
   *
   * Deliberately NOT awaited as a set. Round start must never block on a human: an active
   * but AFK mage would otherwise hold the whole table for the full query timeout. Each ask
   * is fired in parallel and resolves on its own — exactly the non-blocking behaviour the
   * old chat card had, with only the decider changed. An unreachable decider is handled by
   * `ask`'s reaper rule and simply declares nothing.
   *
   * The write was already correct before this change (`commitSpellDefense` routes through
   * the GM), so this is purely about who makes the decision.
   */
  static async promptSpellDefenseDeclaration(combatants) {
    const sorceryActors = combatants
      .map(c => c.actor)
      .filter(a => a && a.items.some(i => i.type === 'skill' && /sorcery/i.test(i.name)));
    if (sorceryActors.length === 0) return;

    const { SR3EQuery } = game.sr3e;
    for (const actor of sorceryActors) {
      SR3EQuery.ask(SR3EQuery.deciderFor(actor), 'sr3e.spelldefense.declare', {
        exchangeId: foundry.utils.randomID(),
        actorUuid:  actor.uuid,
      }, { fallback: null })
        .catch(err => console.warn(`SR3E | Spell Defense declaration for ${actor.name} failed:`, err));
    }
  }

  /**
   * The per-actor Spell Defense dialog, opened on that actor's own client by the
   * `sr3e.spelldefense.declare` query. Commits and announces what was declared.
   *
   * Unlike the dodge declaration this DOES write — there is no attacker waiting on the
   * answer to fold into a larger exchange, so there is nothing to hand back. The write
   * still lands on the GM: `commitSpellDefense` routes through `sr3e.actor.set` and
   * `spendSpellPool` through `sr3e.pool.spend`.
   */
  static async promptSpellDefenseFor(actor, opts = {}) {
    const sorcery      = actor.items.find(i => i.type === 'skill' && /sorcery/i.test(i.name));
    const sorRating    = sorcery?.system?.rating ?? 0;
    const hasSDSpec    = /spell.?defense/i.test(sorcery?.system?.specialisation ?? '');
    const sorEffective = hasSDSpec ? sorRating + 2 : sorRating;
    const specNote     = hasSDSpec ? ` (${sorRating}+2 spec)` : '';
    const spellAvail   = actor.system.derived?.availableSpellPool ?? 0;

    let sor = 0, spl = 0;
    await foundry.applications.api.DialogV2.wait({
      window: { title: `${actor.name} — Declare Spell Defense` },
      content: `
        <p style="margin:0 0 8px;font-size:13px">
          Allocate dice to resist spells cast at you this Combat Turn.
        </p>
        <p style="margin:0 0 12px;font-size:11px;color:var(--sr-amber)">
          Spell Pool dice are spent <strong>immediately</strong> and are gone for the rest of the
          turn; Sorcery dice return at round end.
        </p>
        <div style="display:flex;flex-direction:column;gap:8px">
          <label style="display:flex;align-items:center;justify-content:space-between;gap:8px">
            <span>Sorcery ${sorEffective}${specNote}</span>
            <input type="number" id="sd-sor" value="0" min="0" max="${sorEffective}" style="width:60px"/>
          </label>
          <label style="display:flex;align-items:center;justify-content:space-between;gap:8px">
            <span>Spell Pool ${spellAvail}</span>
            <input type="number" id="sd-spl" value="0" min="0" max="${spellAvail}" style="width:60px"
                   ${spellAvail === 0 ? 'disabled' : ''}/>
          </label>
        </div>`,
      buttons: [
        {
          label: 'Commit',
          action: 'commit',
          default: true,
          callback: (_e, _b, dialog) => {
            const el = dialog.element;
            sor = Math.min(Math.max(0, parseInt(el.querySelector('#sd-sor')?.value) || 0), sorEffective);
            spl = Math.min(Math.max(0, parseInt(el.querySelector('#sd-spl')?.value) || 0), spellAvail);
          }
        },
        { label: 'None', action: 'none' },
      ],
      // Per-dialog, so the GM can withdraw it if the round moves on. Never a global
      // renderDialogV2 hook — two mages declaring at once would cross-wire.
      render: (_event, dialog) => game.sr3e.SR3EQuery.trackDialog(opts.exchangeId, dialog),
    });
    game.sr3e.SR3EQuery.untrackDialog(opts.exchangeId);

    if (sor + spl === 0) return null;
    await actor.commitSpellDefense(sor, spl);

    // The GM needs to see what was committed — they are no longer the one entering it.
    await ChatMessage.create({
      speaker: { alias: 'Spell Defense' },
      content: `
        <div class="sr-roll-card">
          <div class="sr-roll-header">🛡 ${actor.name} — Spell Defense</div>
          <div class="sr-roll-result">${sor + spl} dice
            <span style="font-size:11px;color:var(--sr-muted)">
              (${sor} Sorcery${spl ? ` + ${spl} Spell Pool` : ''})
            </span>
          </div>
        </div>`,
    });
    return { sorcery: sor, spell: spl };
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

    // ⚠ Spell Pool may augment a Drain Resistance Test — but only for SORCERY.
    //
    // p.43 states both halves in consecutive sentences: "Dice from the Spell Pool can be
    // used to augment Spell Success Tests and Drain Resistance Tests in spellcasting,
    // Dispelling, and for Spell Defense. Dice from the Spell Pool cannot be used to
    // augment Conjuring or any other magic-related tests." Conjuring drain is resisted
    // with Charisma and gets no pool at all.
    //
    // The conjuring payload happens not to set spellPoolForDrain, so the field is already
    // absent today — correct by omission. This makes it correct by RULE, so adding that
    // field to the conjuring path later cannot quietly grant dice the book forbids.
    const isConjuringDrain = resistAttr === 'charisma';
    const spellPoolField = (availSpell > 0 && !isConjuringDrain)
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
    const wantSpell = Math.max(0, parseInt(card.querySelector('.sr-drain-spell-pool')?.value) || 0);
    const tn        = parseInt(card.querySelector('.sr-drain-tn')?.value)         || 2;

    btn.disabled    = true;
    btn.textContent = '⏳ Rolling…';

    const actor = game.actors.get(payload.actorId);
    if (!actor) return;

    // ⚠ Roll what was PAID FOR, not what was typed.
    //
    // The input's max attribute is a hint the browser enforces only for spinner clicks —
    // a determined player can type 99 into it. So the pool has to be built from
    // spendSpellPool's RETURN value, which is clamped against live data on the GM.
    // Building the dice from the raw field while clamping only the spend is exactly how
    // free dice appear, and it is the same defect that let a cybercombat defender roll
    // pool they never paid for.
    const spellDice = wantSpell > 0 ? await actor.spendSpellPool(wantSpell) : 0;
    if (spellDice < wantSpell) {
      ui.notifications.warn(
        `${actor.name} has only ${spellDice} Spell Pool left — rolling that, not ${wantSpell}.`);
    }
    const pool = willDice + spellDice;

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
      glitch = SR3EActor.isRuleOfOne(ones, pool);
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
            // RCD: Rigger's Reaction + normal dice, no modifiers.
            // ⚠ This is RIGGING, so Enhanced Articulation's +1 Reaction does not apply
            // (M&M p.66). Jumped-in VCR above already avoids it by reading reaction.BASE;
            // remote control reads the derived value, so it needs the corrected one.
            const base = (d.reactionNoRigDeck ?? d.initiative ?? 0)
                       + (rigger.system.woundMod ?? 0);
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
    } else if ((() => { try { return game.settings.get('The2ndChumming3e', 'matrixRuleset') === 'orthodox'; } catch { return false; } })()
              && (this.system.orthodoxRunState?.currentHostId ?? '') !== '') {
      // Orthodox SR3: decker jacked in uses reaction BASE + ResponseIncrease×2 + (1+Response)d6
      // Wired reflexes excluded while jacked in.
      const wm           = this.system.woundMod ?? 0;
      const reactionBase = this.system.attributes?.reaction?.base ?? 0;
      const resp         = this.system.orthodoxDeck?.responseIncrease ?? 0;
      base = reactionBase + wm + (resp * 2);
      dice = 1 + resp;
      modeNote = `<div class="sr-roll-meta" style="color:var(--sr-accent)">💻 Orthodox Matrix Init — REA base ${reactionBase}${resp ? ` + Response ${resp}×2` : ''}</div>`;
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
      // TRM / AR / VR-Cold: Reaction (with wired reflexes) + 1d6 (Response does not apply).
      // ⚠ This is DECKING, so Enhanced Articulation's +1 Reaction does not apply (M&M p.66).
      // Wired reflexes DO — the exclusion is specific to that bonus, not to cyberware at
      // large, which is why this uses the corrected Reaction rather than reaction.base.
      base = (d.reactionNoRigDeck ?? 0) + (this.system.woundMod ?? 0);
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
      // Roll the grant, not the request — see tests/pool-spend.test.mjs.
      const dispelSpent = spellDice > 0 ? await this.spendSpellPool(spellDice) : 0;
      if (dispelSpent !== spellDice) {
        ui.notifications.warn(`${this.name}: only ${dispelSpent} of ${spellDice} Spell Pool dice were available.`);
      }
      spellDice = dispelSpent;
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
  // BANISHING
  // ---------------------------------------------------------------------------

  async rollBanish() {
    const magicBase = this.system.attributes?.magic?.base ?? 0;
    if (magicBase <= 0) {
      ui.notifications.warn(`${this.name} is not Awakened (Magic attribute is 0).`);
      return null;
    }

    // Find spirits in the active combat tracker
    const spiritCombatants = (game.combat?.combatants ?? [])
      .map(c => c.actor)
      .filter(a => a && game.sr3e.SR3ESpiritSummoning._spiritFlag(a, 'isSpirit'));
    if (!spiritCombatants.length) {
      ui.notifications.warn('No spirits found in the active combat tracker.');
      return null;
    }

    // Spirit selection (auto-pick if only one)
    let spirit = spiritCombatants.length === 1 ? spiritCombatants[0] : null;
    if (!spirit) {
      const opts = spiritCombatants
        .map(s => `<option value="${s.id}">${s.name} [F${game.sr3e.SR3ESpiritSummoning._spiritFlag(s, 'force') ?? '?'}]</option>`)
        .join('');
      let cancelled = true;
      let spiritId = '';
      await foundry.applications.api.DialogV2.wait({
        window: { title: `${this.name} — Banish Spirit` },
        content: `<p>Select the spirit to banish:</p><select id="ban-spirit" style="width:100%">${opts}</select>`,
        buttons: [
          { label: 'Select', action: 'ok', default: true,
            callback: (_e, _b, dialog) => { cancelled = false; spiritId = dialog.element.querySelector('#ban-spirit')?.value; } },
          { label: 'Cancel', action: 'cancel' },
        ],
      });
      if (cancelled) return null;
      spirit = game.actors.get(spiritId);
      if (!spirit) return null;
    }

    const spiritForce  = game.sr3e.SR3ESpiritSummoning._spiritFlag(spirit, 'force') ?? 4;
    const isSummoner   = game.sr3e.SR3ESpiritSummoning._spiritFlag(spirit, 'conjurerId') === this.id;
    const tempLoss     = this.getFlag('The2ndChumming3e', 'tempMagicLoss') ?? 0;
    const effectiveMagic = Math.max(1, magicBase - tempLoss);

    // Conjuring skill
    const conjSkill   = this.items.find(i => i.type === 'skill' && /conjuring/i.test(i.name));
    const conjRating  = conjSkill?.system?.rating ?? 0;
    const charisma    = this.system.attributes?.charisma?.base ?? 0;

    // Build dialog
    const poolPreview = conjRating + (isSummoner ? charisma : 0);
    let cancelled = true, conjDice = conjRating, chaDice = isSummoner ? charisma : 0;
    await foundry.applications.api.DialogV2.wait({
      window: { title: `${this.name} — Banish ${spirit.name}` },
      content: `
        <p style="font-size:12px;color:var(--sr-muted);margin-bottom:8px">
          Banishing: Conjuring vs TN = Force (${spiritForce}). Spirit resists with Force vs TN = your Magic (${effectiveMagic}${tempLoss > 0 ? `, reduced by ${tempLoss} this combat` : ''}).
        </p>
        <div style="display:grid;grid-template-columns:auto 1fr;align-items:center;gap:6px 12px">
          <label>Conjuring dice:</label>
          <input type="number" id="ban-conj" value="${conjRating}" min="0" max="99" style="width:70px"/>
          ${isSummoner ? `
          <label>Charisma dice (you are the summoner):</label>
          <input type="number" id="ban-cha" value="${charisma}" min="0" max="99" style="width:70px"/>` : ''}
        </div>`,
      buttons: [
        { label: 'Roll Banish', action: 'ok', default: true,
          callback: (_e, _b, dialog) => {
            cancelled = false;
            conjDice  = Math.max(0, parseInt(dialog.element.querySelector('#ban-conj')?.value) || 0);
            chaDice   = isSummoner ? Math.max(0, parseInt(dialog.element.querySelector('#ban-cha')?.value) || 0) : 0;
          } },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    if (cancelled) return null;

    const pool  = Math.max(1, conjDice + chaDice);
    const parts = [`Conjuring ${conjDice}`];
    if (chaDice > 0) parts.push(`CHA ${chaDice} (summoner bonus)`);
    const label = `🌀 ${this.name} — Banish ${spirit.name} [F${spiritForce}] — ${parts.join(' + ')}`;

    return this.rollPool(pool, spiritForce, label, {
      isBanishingRoll: true,
      banishContext: {
        banisherActorId: this.id,
        spiritActorId:   spirit.id,
        spiritLabel:     spirit.name,
        spiritForce,
        effectiveMagic,
        isSummoner,
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

      // Armed: astral combat uses the same Armed Combat skill resolution as physical melee
      // (matching the focus's weapon category) — Sorcery has nothing to do with it.
      if (weaponFocus) {
        const meleeInfo = SR3EItem._buildMeleePoolInfo(actor, weaponFocus);
        return {
          skillName: meleeInfo.skillName,
          skillDice: meleeInfo.skillDice,
          isDefault: meleeInfo.isDefault,
          rawDamage,
          astralPool: meleeInfo.isDefault ? 0 : astralPool,
        };
      }

      // Unarmed: Unarmed Combat (incl. Martial Arts) OR Sorcery w/ Astral Combat specialisation
      // substitutes for it — use whichever gives more dice. Only default if the actor has neither.
      const unarmedCandidates = actor.items.filter(i =>
        i.type === 'skill' && (i.name === 'Unarmed Combat' || /^MA:/i.test(i.name))
      );
      const bestUnarmed = unarmedCandidates.length
        ? unarmedCandidates.reduce((best, s) => (s.system.rating ?? 0) > (best.system.rating ?? 0) ? s : best)
        : null;
      const unarmedDice = bestUnarmed ? (bestUnarmed.system.rating ?? 0) : null;

      const sorcery = actor.items.find(i => i.type === 'skill' && i.name.toLowerCase() === 'sorcery');
      let sorceryDice = null;
      let sorceryLabel = 'Sorcery';
      if (sorcery) {
        const rating  = (sorcery.system.rating ?? sorcery.system.skillRating ?? 1)
          + SR3EItem._skillBonusDice(actor, sorcery);
        const hasSpec = (sorcery.system.specialisation ?? '').toLowerCase() === 'astral combat'
          || (sorcery.system.specialisations ?? []).some(sp => (sp.name ?? '').toLowerCase() === 'astral combat');
        sorceryDice  = hasSpec ? rating + 2 : rating;
        sorceryLabel = hasSpec ? 'Sorcery (Astral Combat spec)' : 'Sorcery';
      }

      if (unarmedDice != null || sorceryDice != null) {
        const useSorcery = sorceryDice != null && (unarmedDice == null || sorceryDice > unarmedDice);
        return {
          skillName: useSorcery ? sorceryLabel : bestUnarmed.name,
          skillDice: useSorcery ? sorceryDice : unarmedDice,
          isDefault: false,
          rawDamage,
          astralPool,
        };
      }

      // No Unarmed Combat and no Sorcery — defaulting (resolved interactively below).
      return {
        skillName:    'Unarmed Combat (defaulting)',
        skillDice:    Math.max(1, actor.system.attributes?.strength?.base ?? 1),
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

    // SR3 Default Table — either side may lack a usable skill. Prompt each defaulter (attacker first).
    const _applyAstralDefault = async (info, dActor, who) => {
      if (!info.isDefault) return true;
      const def = await SR3EItem.promptDefaultChoice(dActor, {
        linkedAttr: 'strength',
        title:      `Defaulting — ${dActor.name} (${who})`,
        message:    `${dActor.name} has no <strong>Unarmed Combat</strong> or <strong>Sorcery</strong> skill — choose how to default:`,
      });
      if (!def) return false;   // cancelled
      info.skillDice    = def.pool;
      info.skillName    = def.label;
      info.defaultTnMod = def.tnMod;
      info.astralPool   = Math.min(dActor.system.derived?.availableAstralPool ?? 0, def.poolCap);
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

    const _corner = (name, skillName, skillDice, isDefault, rawDamage, astralPool, tn, poolClass, tnClass, dmgClass, role, owner) => `
      <div class="sr-melee-corner sr-astral-corner"
           data-corner-role="${role}" data-corner-owner="${owner ?? ''}" data-corner-label="${name}">
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
        <div class="sr-roll-card sr-melee-card" data-twocorner="astral">
          <div class="sr-roll-header">✦ ASTRAL COMBAT — ${atk.name} vs ${def.name}</div>
          <div class="sr-melee-boxing">
            ${_corner(atk.name, ctx.atkSkillName, ctx.atkSkillDice, ctx.atkIsDefault, ctx.atkRawDamage,
                      ctx.atkAstralPool, ctx.atkTN, 'sr-astral-atk-pool', 'sr-astral-atk-tn', 'sr-astral-atk-damage',
                      'attacker', ctx.attackerActorId)}
            <div class="sr-melee-vs">VS</div>
            ${_corner(def.name, ctx.defSkillName, ctx.defSkillDice, ctx.defIsDefault, ctx.defRawDamage,
                      ctx.defAstralPool, ctx.defTN, 'sr-astral-def-pool', 'sr-astral-def-tn', 'sr-astral-def-damage',
                      'defender', ctx.defenderActorId)}
          </div>
          <div style="margin:8px 0 4px;font-size:11px;color:var(--sr-muted)">
            <label style="display:flex;align-items:center;gap:6px">
              <input type="checkbox" class="sr-astral-physical-dmg"/>
              Physical Damage (unchecked = Stun)
            </label>
          </div>
          ${SR3EActor.cornerActions(payload, [
            { role: 'attacker', label: atk.name, owner: ctx.attackerActorId },
            { role: 'defender', label: def.name, owner: ctx.defenderActorId },
          ])}
        </div>`,
      style: CONST.CHAT_MESSAGE_STYLES.ROLL,
    });
  }

  static async handleAstralRoll(btn, physicalDice = false) {
    const ctx  = JSON.parse(btn.dataset.payload);
    const card = btn.closest('.sr-melee-card');

    btn.disabled    = true;
    btn.textContent = '⏳ Rolling…';

    // Each side's own submission first, this card's DOM only as a fallback (TODO 24).
    const sub = SR3EActor.meleeSubmissions(btn);
    const f   = (role, cls) => SR3EActor.cornerField(sub, role, cls, card);

    const atkAstralPool = parseInt(f('attacker', 'sr-astral-atk-pool')) || 0;
    const defAstralPool = parseInt(f('defender', 'sr-astral-def-pool')) || 0;
    const atkPool       = Math.max(1, (ctx.atkSkillDice ?? 1) + atkAstralPool);
    const defPool       = Math.max(1, (ctx.defSkillDice ?? 1) + defAstralPool);
    const atkTN         = SR3EActor.cornerTN(f('attacker', 'sr-astral-atk-tn'), ctx.atkTN);
    const defTN         = SR3EActor.cornerTN(f('defender', 'sr-astral-def-tn'), ctx.defTN);
    const atkRawDamage  = String(f('attacker', 'sr-astral-atk-damage') ?? '').trim() || ctx.atkRawDamage;
    const defRawDamage  = String(f('defender', 'sr-astral-def-damage') ?? '').trim() || ctx.defRawDamage;
    const isPhysical    = card.querySelector('.sr-astral-physical-dmg')?.checked ?? false;

    const atkActor = game.actors.get(ctx.attackerActorId);
    const defActor = game.actors.get(ctx.defenderActorId);
    // Same rule as melee — astral combat "uses the same rules as Melee Combat" (p.174), so
    // the pool grant is what gets rolled, not the request. See handleMeleeRoll.
    const atkAstralSpent = (atkAstralPool > 0 && atkActor) ? await atkActor.spendAstralPool(atkAstralPool) : 0;
    const defAstralSpent = (defAstralPool > 0 && defActor) ? await defActor.spendAstralPool(defAstralPool) : 0;
    if (atkAstralSpent !== atkAstralPool) {
      ui.notifications.warn(`${atkActor?.name ?? 'Attacker'}: only ${atkAstralSpent} of ${atkAstralPool} Astral Pool dice were available.`);
    }
    if (defAstralSpent !== defAstralPool) {
      ui.notifications.warn(`${defActor?.name ?? 'Defender'}: only ${defAstralSpent} of ${defAstralPool} Astral Pool dice were available.`);
    }

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
    const atkGlitch = SR3EActor.isRuleOfOne(atkOnes, atkPool);
    const defGlitch = SR3EActor.isRuleOfOne(defOnes, defPool);

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
      // "Astral combat uses the same rules as Melee Combat" (SR3 p.174), so the p.122
      // melee exception applies: past Deadly, leftover successes raise Power.
      const staged       = SR3EItem.stageDamage(baseDamage, net, { meleeRules: true });
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
    // TN = Power of the attack — must reflect any weapon-focus bonus baked into stagedPower,
    // not just the winner's raw Charisma (which ignores that bonus entirely).
    const soakTN  = Math.max(2, stagedPower ?? winnerCha);

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
              TN (Power of the attack — ${soakTN}):
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
      glitch = SR3EActor.isRuleOfOne(ones, pool);
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

    const rating   = (skill.system.skillRating ?? 1) + SR3EItem._skillBonusDice(actor, skill);
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

  /**
   * Every attribute and skill an actor could roll in a contested test, with its dice.
   *
   * Static because BOTH the setup dialog and the card need it: the initiator picks their
   * own source in the dialog, and the opponent picks theirs in their own corner on the
   * card. It used to be a closure inside the dialog, which is why the opponent's source
   * could only ever be chosen by whoever opened it.
   */
  static contestedSources(a) {
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
      const rating = (sk.system.skillRating ?? sk.system.rating ?? 0)
        + SR3EItem._skillBonusDice(a, sk);
      sources.push({ group: 'skill', label: `${sk.name} (${rating})`, value: rating });
    }
    return sources;
  }

  /** `contestedSources` as grouped <option> markup. */
  static contestedSourceOptions(a, selectedValue = null) {
    const sources = SR3EActor.contestedSources(a);
    const opt = s => `<option value="${s.value}"`
      + `${selectedValue !== null && String(s.value) === String(selectedValue) ? ' selected' : ''}`
      + `>${s.label}</option>`;
    const ao = sources.filter(s => s.group === 'attr').map(opt).join('');
    const so = sources.filter(s => s.group === 'skill').map(opt).join('');
    return `${ao.length ? `<optgroup label="Attributes">${ao}</optgroup>` : ''}`
         + `${so.length ? `<optgroup label="Skills">${so}</optgroup>` : ''}`;
  }

  static async openContestedDialog(defaultActor, shiftKey = false) {
    const buildSources = a => SR3EActor.contestedSources(a);

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
        // No listener for the opponent select — naming them is all this dialog does with
        // that side. Their dice follow from their own choice, made on the card.
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
        // ⚠ ONLY the initiator's side is configured here.
        //
        // This dialog used to set the OPPONENT's pool source, dice, TN and damage too — so
        // whoever clicked ⚔ Contested Roll chose how their opponent would fight. The button
        // is on the player's own sheet, so that was a player deciding another player's dice.
        //
        // Naming WHO is being contested is legitimate and stays: it is the same act as
        // picking a target. Everything else about that side now belongs to them, and they
        // choose it in their own corner on the card — including a Pool source dropdown of
        // their own attributes and skills.
        content: `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:8px 0">
            <div>${_side(atkActorOptions, defaultAtkData, 'atk-source', 'atk-actor', 'atk-pool', 'atk-tn', 'atk-damage')}</div>
            <div>
              <label style="display:block;margin-bottom:6px;font-size:12px;font-weight:bold">Contesting against:
                <select id="opp-actor" style="width:100%;margin-top:2px;font-weight:normal">${oppActorOptions}</select>
              </label>
              <div style="font-size:11px;color:var(--sr-muted);line-height:1.4;margin-top:10px">
                They choose their own pool source, dice, TN and damage in their corner of the
                card. You will see their numbers once they submit.
                <div style="margin-top:6px;color:var(--sr-dim)">
                  The GM can resolve without them if they are away.
                </div>
              </div>
            </div>
          </div>`,
        buttons: [
          {
            label: shiftKey ? '✏ Enter Successes' : 'Continue',
            action: 'confirm',
            default: true,
            callback: (_e, _b, dialog) => {
              const el       = dialog.element;
              const atkSrc   = el.querySelector('#atk-source');
              const atkActId = el.querySelector('#atk-actor')?.value  ?? defaultAtkId;
              const oppActId = el.querySelector('#opp-actor')?.value  ?? 'other';

              // The opponent's numbers are STARTING POINTS shown in their corner, not
              // choices made here. Their first pool source (highest attribute/skill) seeds
              // the dice so the card is playable if they just hit Submit; they can change
              // source, dice, TN and damage before they do.
              const oppData = oppActId === 'other'
                ? null
                : SR3EActor.contestedSources(game.actors.get(oppActId));

              result = {
                atkActorId:     atkActId,
                atkActorName:   game.actors.get(atkActId)?.name ?? 'Actor',
                atkSourceLabel: atkSrc?.options[atkSrc.selectedIndex]?.text ?? '',
                atkPool:   Math.max(1, parseInt(el.querySelector('#atk-pool')?.value)   || 4),
                atkTN:     Math.max(2, parseInt(el.querySelector('#atk-tn')?.value)     || 4),
                atkDamage: el.querySelector('#atk-damage')?.value.trim() || '4L',
                oppActorId:     oppActId === 'other' ? null : oppActId,
                oppActorName:   oppActId === 'other' ? 'Other' : (game.actors.get(oppActId)?.name ?? 'Other'),
                oppSourceLabel: oppData?.[0]?.label ?? '',
                oppPool:   Math.max(1, oppData?.[0]?.value || 4),
                oppTN:     4,
                oppDamage: '4L',
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

    // Each corner carries its OWN pool-source dropdown, so a participant picks the
    // attribute or skill they are contesting with rather than inheriting whatever the
    // person who opened the setup dialog chose for them. The per-corner owner gate in
    // sr3e.js disables it (like every other field) for anyone but that participant, so
    // both sides stay VISIBLE to each other and only one side is editable.
    const _corner = (name, actorId, sourceLabel, pool, tn, damage, srcClass, poolClass, tnClass, dmgClass, color, role, owner) => {
      const actor = actorId ? game.actors.get(actorId) : null;
      const opts  = actor ? SR3EActor.contestedSourceOptions(actor, pool) : '';
      return `
      <div class="sr-melee-corner"
           data-corner-role="${role}" data-corner-owner="${owner ?? ''}" data-corner-label="${name}">
        <div class="sr-melee-name" style="color:${color}">${name}</div>
        <div class="sr-contested-fields" style="display:grid;grid-template-columns:52px 1fr;gap:4px 8px;align-items:center;margin-top:8px;font-size:11px;color:#7880a0;">
          ${opts
            ? `<span>Source</span> <select class="${srcClass}" style="${INP}">${opts}</select>`
            : (sourceLabel ? `<span>Source</span> <span style="color:#7880a0">${sourceLabel}</span>` : '')}
          <span>Pool</span>   <input type="number" class="${poolClass}" value="${pool}" min="1" max="30" style="${INP}"/>
          <span>TN</span>     <input type="number" class="${tnClass}"   value="${tn}"   min="2" max="30" style="${INP}"/>
          <span>Damage</span> <input type="text"   class="${dmgClass}"  value="${damage}"                style="${INP}"/>
        </div>
      </div>`;
    };

    await ChatMessage.create({
      speaker: { alias: 'Contested Roll' },
      content: `
        <div class="sr-roll-card sr-melee-card" data-twocorner="contested">
          <div class="sr-roll-header">⚔ CONTESTED — ${ctx.atkActorName} vs ${ctx.oppActorName}</div>
          <div class="sr-melee-boxing">
            ${_corner(ctx.atkActorName, ctx.atkActorId, ctx.atkSourceLabel, ctx.atkPool, ctx.atkTN, ctx.atkDamage,
                      'sr-contested-atk-source', 'sr-contested-atk-pool', 'sr-contested-atk-tn', 'sr-contested-atk-damage',
                      'var(--sr-accent)', 'attacker', ctx.atkActorId)}
            <div class="sr-melee-vs">VS</div>
            ${_corner(ctx.oppActorName, ctx.oppActorId, ctx.oppSourceLabel, ctx.oppPool, ctx.oppTN, ctx.oppDamage,
                      'sr-contested-opp-source', 'sr-contested-opp-pool', 'sr-contested-opp-tn', 'sr-contested-opp-damage',
                      'var(--sr-red)', 'opponent', ctx.oppActorId)}
          </div>
          ${SR3EActor.cornerActions(payload, [
            { role: 'attacker', label: ctx.atkActorName, owner: ctx.atkActorId },
            { role: 'opponent', label: ctx.oppActorName, owner: ctx.oppActorId },
          ])}
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

    // Worn + implant armour, the same figure the soak card uses (TODO 75).
    const { ballistic: ball, impact: imp } = SR3EActor.armorRatings(this);

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

    // Each side's own submission first, this card's DOM only as a fallback (TODO 24).
    const sub = SR3EActor.meleeSubmissions(btn);
    const f   = (role, cls) => SR3EActor.cornerField(sub, role, cls, card);

    const atkPool   = Math.max(1, parseInt(f('attacker', 'sr-contested-atk-pool')) || ctx.atkPool);
    const oppPool   = Math.max(1, parseInt(f('opponent', 'sr-contested-opp-pool')) || ctx.oppPool);
    const atkTN     = SR3EActor.cornerTN(f('attacker', 'sr-contested-atk-tn'), ctx.atkTN);
    const oppTN     = SR3EActor.cornerTN(f('opponent', 'sr-contested-opp-tn'), ctx.oppTN);
    const atkDamage = String(f('attacker', 'sr-contested-atk-damage') ?? '').trim() || ctx.atkDamage;
    const oppDamage = String(f('opponent', 'sr-contested-opp-damage') ?? '').trim() || ctx.oppDamage;

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
    const atkGlitch = SR3EActor.isRuleOfOne(atkOnes, atkPool);
    const oppGlitch = SR3EActor.isRuleOfOne(oppOnes, oppPool);

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

  // ── Orthodox SR3 Matrix Rolls ───────────────────────────────────────────────

  /** Cybercombat Target Numbers table (SR3 p.224). */
  static _orthoCCTN = {
    intruding:  { Blue: 6, Green: 5, Orange: 4, Red: 3 },
    legitimate: { Blue: 3, Green: 4, Orange: 5, Red: 6 },
  };

  /** Damage level IC programs inflict (SR3 p.224). */
  static _orthoICDmgLevel = { Blue: 'Moderate', Green: 'Moderate', Orange: 'Serious', Red: 'Serious' };

  /** Resolve a full Rule-of-Six roll silently (no chat cards). */
  static _resolveOrthoRoll(actor, pool, tn) {
    pool = Math.max(1, pool | 0);
    tn   = Math.max(2, tn   | 0);
    let dice = actor._rollWave(pool, tn, true);
    for (let guard = 0; guard < 50; guard++) {
      const idx = dice.flatMap((d, i) => (!d.done && d.needsExplosion) ? [i] : []);
      if (!idx.length) break;
      dice = actor._rollWave(pool, tn, false, dice, idx);
    }
    return { successes: dice.filter(d => d.success).length, dice };
  }

  // ── Orthodox System Test ────────────────────────────────────────────────────

  async rollOrthodoxSystemTest() {
    const sys  = this.system;
    const run  = sys.orthodoxRunState ?? {};
    const deck = sys.orthodoxDeck    ?? {};
    const d    = sys.derived         ?? {};

    const hostId = run.currentHostId ?? '';
    const host   = hostId ? game.actors.get(hostId) : null;
    if (!host) {
      ui.notifications.warn('Not logged on to a host. Use the Matrix tab to set a host first.');
      return;
    }

    const subs = host.system.orthodoxSubsystems ?? {};
    const secVal = host.system.orthodoxSecurityValue ?? 0;
    if (!secVal) ui.notifications.warn('Host has no Security Value set — counter-roll will use 0 dice.');

    // Computer skill
    const compSkill     = this.items.find(i => i.type === 'skill' && /computer|decking/i.test(i.name));
    const compRating    = compSkill?.system?.rating ?? 0;
    const compLabel     = compSkill?.name ?? 'Computer (none)';
    // ⚠ The ORTHODOX pool, not the Defragged one. An Orthodox decker keeps their deck
    // stats on the actor (`system.orthodoxDeck`) and owns no cyberdeck ITEM, so
    // `availableHackingPool` — derived from an equipped item — is null for them
    // and was silently becoming 0. Two of the three Orthodox cards offered no Hacking Pool
    // at all while the IC-attack card correctly offered it, which is what gave the bug away.
    // Falls back to the Defragged pool so a hybrid sheet is not left worse off.
    const hackPool = d.availableOrthodoxHackingPool ?? d.availableHackingPool ?? 0;
    const detectFactor  = (() => {
      const m = deck.masking ?? 0, s = deck.sleazeRating ?? 0;
      return s > 0 ? Math.ceil((m + s) / 2) : Math.ceil(m / 2);
    })();

    const alertLevel = run.alertLevel ?? 'none';
    const alertMod   = alertLevel === 'passive' ? 2 : 0;

    const subsOpts = [
      ['access',  'Access',  subs.access  ?? 0],
      ['control', 'Control', subs.control ?? 0],
      ['index',   'Index',   subs.index   ?? 0],
      ['files',   'Files',   subs.files   ?? 0],
      ['slave',   'Slave',   subs.slave   ?? 0],
    ].map(([v, l, r]) => `<option value="${v}" data-rating="${r}">${l} (Rating ${r}${alertMod ? ` +${alertMod} alert` : ''})</option>`).join('');

    let confirmed = false, subsystem = 'access', opName = 'System Test', deckerDice = compRating, deckerTN = 0, utilMod = 0, hpAlloc = 0;

    await foundry.applications.api.DialogV2.wait({
      window: { title: `${this.name}: System Test` },
      content: `<div style="padding:8px 0;display:flex;flex-direction:column;gap:8px">
        <p style="margin:0;font-size:12px;color:var(--color-text-dark-secondary)">
          Host: <strong>${host.name}</strong> (Sec. Value ${secVal}) &nbsp;|&nbsp;
          Computer: <strong>${compRating}</strong> &nbsp;|&nbsp;
          Hacking Pool: <strong>${hackPool}</strong> &nbsp;|&nbsp;
          Detect. Factor: <strong>${detectFactor}</strong>
        </p>
        <label>Subsystem:
          <select id="ost-sub" style="width:100%;margin-top:2px">${subsOpts}</select>
        </label>
        <label>Operation name:
          <input type="text" id="ost-op" value="System Test" style="width:100%;margin-top:2px">
        </label>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <label>Utility TN modifier (−):
            <input type="number" id="ost-util" value="0" min="0" max="10" style="width:55px;margin-left:4px">
          </label>
          <label>Hacking Pool (0–${hackPool}):
            <input type="number" id="ost-hp" value="0" min="0" max="${hackPool}" style="width:55px;margin-left:4px">
          </label>
        </div>
      </div>`,
      buttons: [
        {
          label: 'Roll', action: 'ok', default: true,
          callback: (_e, _b, dlg) => {
            confirmed  = true;
            const sel  = dlg.element.querySelector('#ost-sub');
            subsystem  = sel?.value ?? 'access';
            const subR = parseInt(sel?.options[sel.selectedIndex]?.dataset.rating ?? 0);
            opName     = dlg.element.querySelector('#ost-op')?.value?.trim() || 'System Test';
            utilMod    = Math.max(0, parseInt(dlg.element.querySelector('#ost-util')?.value) || 0);
            hpAlloc    = Math.min(hackPool, Math.max(0, parseInt(dlg.element.querySelector('#ost-hp')?.value) || 0));
            deckerDice = compRating + hpAlloc;
            deckerTN   = Math.max(2, subR + alertMod - utilMod);
          },
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    if (!confirmed) return;

    if (hpAlloc > 0) await this.update({ 'system.hackingPoolSpent': (sys.hackingPoolSpent ?? 0) + hpAlloc });

    const ctx = {
      deckerActorId: this.id,
      hostActorId:   hostId,
      deckerName:    this.name,
      hostName:      host.name,
      opName,
      subsystem,
      deckerDice:    Math.max(1, deckerDice),
      deckerTN,
      hostDice:      Math.max(1, secVal),
      hostTN:        Math.max(2, detectFactor),
      compLabel,
      secVal,
    };
    const payload = JSON.stringify(ctx).replace(/'/g, '&#39;');
    const _corner = (name, skill, dice, tn, tnLabel, dcls, tcls, role, owner) => `
      <div class="sr-miji-corner"
           data-corner-role="${role}" data-corner-owner="${owner ?? ''}" data-corner-label="${name}">
        <div class="sr-miji-name">${name}</div>
        <div class="sr-miji-skill">${skill}</div>
        <div class="sr-melee-field-row"><span>Dice:</span>
          <input type="number" class="${dcls}" value="${dice}" min="1" max="40" style="width:44px"/></div>
        <div class="sr-melee-field-row"><span>${tnLabel}:</span>
          <input type="number" class="${tcls}" value="${tn}" min="2" max="30" style="width:40px"/></div>
      </div>`;

    await ChatMessage.create({
      speaker: { alias: 'System Test' },
      content: `<div class="sr-roll-card sr-miji-card" data-twocorner="ost">
        <div class="sr-roll-header">💻 ${opName} — ${this.name} on ${host.name}</div>
        <div style="font-size:11px;color:var(--sr-muted);text-align:center;margin-bottom:4px">
          Subsystem: <strong>${subsystem.toUpperCase()}</strong>
          ${hpAlloc > 0 ? ` &nbsp;|&nbsp; HP spent: ${hpAlloc}` : ''}
        </div>
        <div class="sr-melee-boxing">
          ${_corner(this.name, compLabel, ctx.deckerDice, ctx.deckerTN,
                    'TN (subsys.)', 'sr-ost-decker-dice', 'sr-ost-decker-tn', 'decker', this.id)}
          <div class="sr-melee-vs">VS</div>
          ${_corner(host.name, `Sec.Value ${secVal} dice`, ctx.hostDice, ctx.hostTN,
                    'TN (Det.Factor)', 'sr-ost-host-dice', 'sr-ost-host-tn', 'host', hostId)}
        </div>
        ${SR3EActor.cornerActions(payload, [
          { role: 'decker', label: this.name, owner: this.id },
          { role: 'host',   label: host.name, owner: hostId },
        ])}
      </div>`,
      style: CONST.CHAT_MESSAGE_STYLES.ROLL,
    });
  }

  static async handleOrthodoxSystemTestRoll(btn) {
    const ctx  = JSON.parse(btn.dataset.payload);
    const card = btn.closest('.sr-miji-card');
    btn.disabled = true; btn.textContent = '⏳ Rolling…';

    // Each side's own submission first, this card's DOM only as a fallback (TODO 24).
    const sub = SR3EActor.meleeSubmissions(btn);
    const f   = (role, cls) => SR3EActor.cornerField(sub, role, cls, card);

    const deckerDice = Math.max(1, parseInt(f('decker', 'sr-ost-decker-dice')) || ctx.deckerDice);
    const hostDice   = Math.max(1, parseInt(f('host',   'sr-ost-host-dice'))   || ctx.hostDice);
    const deckerTN   = SR3EActor.cornerTN(f('decker', 'sr-ost-decker-tn'), ctx.deckerTN);
    const hostTN     = SR3EActor.cornerTN(f('host',   'sr-ost-host-tn'), ctx.hostTN);

    const deckerActor = game.actors.get(ctx.deckerActorId);
    const hostActor   = game.actors.get(ctx.hostActorId);
    if (!deckerActor || !hostActor) { ui.notifications.warn('Orthodox System Test: missing actor.'); return; }

    const dRes = SR3EActor._resolveOrthoRoll(deckerActor, deckerDice, deckerTN);
    const hRes = SR3EActor._resolveOrthoRoll(hostActor,   hostDice,   hostTN);

    const dHits = dRes.successes, hHits = hRes.successes;
    const won   = dHits >= hHits;

    // Update Security Tally on decker actor if host scored any successes
    if (hHits > 0) {
      const curTally = deckerActor.system.orthodoxRunState?.securityTally ?? 0;
      await deckerActor.update({ 'system.orthodoxRunState.securityTally': curTally + hHits });
    }

    const _dice = r => r.dice.map(d =>
      `<span class="chase-die${d.success ? ' chase-die-best' : ''}">${d.total}</span>`
    ).join('');

    const result = won
      ? `<div class="sr-staging-result" style="color:var(--sr-green)">✓ Success — ${ctx.deckerName} wins by ${dHits - hHits} (${dHits} vs ${hHits})</div>`
      : `<div class="sr-staging-result" style="color:var(--sr-red)">✗ Failure — host wins by ${hHits - dHits} (${dHits} vs ${hHits})</div>`;
    const tallyNote = hHits > 0
      ? `<div style="font-size:11px;color:var(--sr-amber);margin-top:4px">⚠ Security Tally +${hHits} → now ${(deckerActor.system.orthodoxRunState?.securityTally ?? 0)}</div>`
      : `<div style="font-size:11px;color:var(--sr-muted);margin-top:4px">Security Tally unchanged.</div>`;

    await ChatMessage.create({
      speaker: { alias: 'System Test' },
      content: `<div class="sr-roll-card sr-miji-card">
        <div class="sr-roll-header">💻 ${ctx.opName} — Result</div>
        <div class="sr-miji-result-grid">
          <div><strong>${ctx.deckerName}</strong>: ${dHits} hit${dHits !== 1 ? 's' : ''}<br>${_dice(dRes)}</div>
          <div><strong>${ctx.hostName}</strong>: ${hHits} hit${hHits !== 1 ? 's' : ''}<br>${_dice(hRes)}</div>
        </div>
        ${result}
        ${tallyNote}
      </div>`,
      style: CONST.CHAT_MESSAGE_STYLES.ROLL,
    });
  }

  // ── Orthodox Cybercombat ────────────────────────────────────────────────────

  async rollOrthodoxCybercombat() {
    const sys  = this.system;
    const run  = sys.orthodoxRunState ?? {};
    const deck = sys.orthodoxDeck    ?? {};
    const d    = sys.derived         ?? {};

    const hostId = run.currentHostId ?? '';
    const host   = hostId ? game.actors.get(hostId) : null;
    if (!host) {
      ui.notifications.warn('Not logged on to a host. Use the Matrix tab to set a host first.');
      return;
    }

    const secCode = host.system.orthodoxSecurityCode ?? 'Green';
    const secVal  = host.system.orthodoxSecurityValue ?? 0;
    // ⚠ The ORTHODOX pool, not the Defragged one. An Orthodox decker keeps their deck
    // stats on the actor (`system.orthodoxDeck`) and owns no cyberdeck ITEM, so
    // `availableHackingPool` — derived from an equipped item — is null for them
    // and was silently becoming 0. Two of the three Orthodox cards offered no Hacking Pool
    // at all while the IC-attack card correctly offered it, which is what gave the bug away.
    // Falls back to the Defragged pool so a hybrid sheet is not left worse off.
    const hackPool = d.availableOrthodoxHackingPool ?? d.availableHackingPool ?? 0;

    // IC targets on this host
    const icTargets = game.actors.filter(a =>
      a.type === 'ic' && (a.system.activeHostId ?? '') === hostId && (a.system.deployed ?? false)
    );
    if (!icTargets.length) {
      ui.notifications.warn('No deployed IC on this host.');
      return;
    }

    const icOpts = icTargets.map(a => {
      const icType = a.system.orthodoxIcType ?? a.system.icType ?? 'IC';
      return `<option value="${a.id}">${a.name} [${icType}, Rating ${a.system.rating ?? 0}]</option>`;
    }).join('');

    const tnIntruding = SR3EActor._orthoCCTN.intruding[secCode]  ?? 4;
    const dmgLevel    = SR3EActor._orthoICDmgLevel[secCode] ?? 'Moderate';
    const dmgPower    = deck.mccp ?? 4;  // default attack power: MPCP Rating

    let confirmed = false, targetId = null, atkName = 'Attack', atkDice = 1, atkTN = tnIntruding, hpAlloc = 0, atkPower = dmgPower;

    await foundry.applications.api.DialogV2.wait({
      window: { title: `${this.name}: Cybercombat Attack` },
      content: `<div style="padding:8px 0;display:flex;flex-direction:column;gap:8px">
        <p style="margin:0;font-size:12px;color:var(--color-text-dark-secondary)">
          Host: <strong>${host.name}</strong> (${secCode}, Sec.Value ${secVal}) &nbsp;|&nbsp;
          HP Available: <strong>${hackPool}</strong>
        </p>
        <label>Target IC:
          <select id="occ-target" style="width:100%;margin-top:2px">${icOpts}</select>
        </label>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <label>Attack utility:
            <input type="text" id="occ-util" value="Attack" style="width:120px;margin-left:4px">
          </label>
          <label>Utility rating (attack dice):
            <input type="number" id="occ-dice" value="1" min="1" max="30" style="width:55px;margin-left:4px">
          </label>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <label>Attack TN (${tnIntruding} vs Intruder):
            <input type="number" id="occ-tn" value="${tnIntruding}" min="2" max="12" style="width:55px;margin-left:4px">
          </label>
          <label>Attack Power (damage):
            <input type="number" id="occ-pwr" value="${dmgPower}" min="1" max="20" style="width:55px;margin-left:4px">
          </label>
        </div>
        <label>Hacking Pool (0–${hackPool}):
          <input type="number" id="occ-hp" value="0" min="0" max="${hackPool}" style="width:55px;margin-left:4px">
        </label>
        <p style="margin:0;font-size:11px;color:var(--sr-muted)">
          ${secCode} host — IC damage level: <strong>${dmgLevel}</strong>.
          IC soak pool = Security Value (${secVal}).
        </p>
      </div>`,
      buttons: [
        {
          label: 'Attack', action: 'ok', default: true,
          callback: (_e, _b, dlg) => {
            confirmed = true;
            targetId  = dlg.element.querySelector('#occ-target')?.value;
            atkName   = dlg.element.querySelector('#occ-util')?.value?.trim() || 'Attack';
            atkDice   = Math.max(1, parseInt(dlg.element.querySelector('#occ-dice')?.value) || 1);
            atkTN     = Math.max(2, parseInt(dlg.element.querySelector('#occ-tn')?.value)   || tnIntruding);
            atkPower  = Math.max(1, parseInt(dlg.element.querySelector('#occ-pwr')?.value)  || dmgPower);
            hpAlloc   = Math.min(hackPool, Math.max(0, parseInt(dlg.element.querySelector('#occ-hp')?.value) || 0));
          },
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    if (!confirmed || !targetId) return;

    if (hpAlloc > 0) await this.update({ 'system.hackingPoolSpent': (sys.hackingPoolSpent ?? 0) + hpAlloc });
    const totalAtkDice = atkDice + hpAlloc;

    const icActor = game.actors.get(targetId);
    if (!icActor) return;
    const icType    = icActor.system.orthodoxIcType ?? icActor.system.icType ?? 'IC';
    const icRating  = icActor.system.rating ?? 0;
    // IC soak pool = Security Value; IC soak TN = attack power
    const soakPool  = secVal;
    const soakTN    = Math.max(2, atkPower);

    const ctx = {
      deckerActorId: this.id,
      icActorId:     targetId,
      hostActorId:   hostId,
      deckerName:    this.name,
      icName:        icActor.name,
      icType,
      atkName,
      atkDice:       totalAtkDice,
      atkTN,
      atkPower,
      soakPool,
      soakTN,
      secCode,
      dmgLevel,
    };
    const payload = JSON.stringify(ctx).replace(/'/g, '&#39;');
    const _corner = (name, skill, dice, tn, tnLabel, dcls, tcls, role, owner) => `
      <div class="sr-miji-corner"
           data-corner-role="${role}" data-corner-owner="${owner ?? ''}" data-corner-label="${name}">
        <div class="sr-miji-name">${name}</div>
        <div class="sr-miji-skill">${skill}</div>
        <div class="sr-melee-field-row"><span>Dice:</span>
          <input type="number" class="${dcls}" value="${dice}" min="1" max="40" style="width:44px"/></div>
        <div class="sr-melee-field-row"><span>${tnLabel}:</span>
          <input type="number" class="${tcls}" value="${tn}" min="2" max="30" style="width:40px"/></div>
      </div>`;

    await ChatMessage.create({
      speaker: { alias: 'Cybercombat' },
      content: `<div class="sr-roll-card sr-miji-card" data-twocorner="occ">
        <div class="sr-roll-header">⚔ ${this.name} attacks ${icActor.name} [${icType}]</div>
        <div style="font-size:11px;color:var(--sr-muted);text-align:center;margin-bottom:4px">
          ${host.name} (${secCode}) &nbsp;|&nbsp; Damage Level: <strong>${dmgLevel}</strong>
          ${hpAlloc > 0 ? ` &nbsp;|&nbsp; HP spent: ${hpAlloc}` : ''}
        </div>
        <div class="sr-melee-boxing">
          ${_corner(this.name, `${atkName} (${atkDice - hpAlloc}${hpAlloc > 0 ? `+${hpAlloc}HP` : ''})`,
                    totalAtkDice, atkTN, 'TN (attack)', 'sr-occ-atk-dice', 'sr-occ-atk-tn', 'attacker', this.id)}
          <div class="sr-melee-vs">VS</div>
          ${_corner(icActor.name, `Soak (Sec.Val ${secVal})`,
                    soakPool, soakTN, 'TN (power)', 'sr-occ-soak-dice', 'sr-occ-soak-tn', 'defender', targetId)}
        </div>
        ${SR3EActor.cornerActions(payload, [
          { role: 'attacker', label: this.name,    owner: this.id },
          { role: 'defender', label: icActor.name, owner: targetId },
        ])}
      </div>`,
      style: CONST.CHAT_MESSAGE_STYLES.ROLL,
    });
  }

  // ── Orthodox IC Attack (IC → Decker) ───────────────────────────────────────

  async rollOrthodoxICAttack() {
    const sys  = this.system;
    const host = sys.activeHostId ? game.actors.get(sys.activeHostId) : null;
    if (!host) return void ui.notifications.warn('No host linked — open the IC sheet and use Set Host.');

    const code   = host.system.orthodoxSecurityCode ?? 'Green';
    const secVal = host.system.orthodoxSecurityValue ?? 0;
    const rating = sys.rating ?? 1;
    const dmgLevel = SR3EActor._orthoICDmgLevel[code] ?? 'Moderate';
    const atkTN    = SR3EActor._orthoCCTN.intruding[code] ?? 5;

    if (!secVal) return void ui.notifications.warn('Host Security Value is 0 — set it on the host sheet first.');

    // Target decker selection
    const deckers = game.actors.filter(a =>
      (a.type === 'character' || a.type === 'npc') && !a.getFlag('The2ndChumming3e', 'isTemplate')
    );
    if (!deckers.length) return void ui.notifications.warn('No valid decker targets in world.');

    // Name only. The `data-cc` / `data-hp` attributes that used to ride along existed
    // solely to feed the decker's own dice and Hacking Pool into this dialog; both belong
    // to the decker's corner now, so publishing them here would only tempt a re-add.
    const deckerOpts = deckers.map(a => `<option value="${a.id}">${a.name}</option>`).join('');

    let confirmed = false, targetId = null;
    let atkDiceOverride = secVal, atkTNOverride = atkTN;

    // The `renderDialogV2` hook that lived here existed only to mirror the selected
    // decker's Cybercombat rating and Hacking Pool into fields the IC should never have
    // had. Both fields are gone, the select needs no wiring, and so the hook goes too —
    // one less global listener that could cross-wire two open dialogs.

    await foundry.applications.api.DialogV2.wait({
      window: { title: `${this.name}: Attack Decker` },
      content: `<div style="padding:8px 0;display:flex;flex-direction:column;gap:8px">
        <p style="margin:0;font-size:12px;color:var(--color-text-dark-secondary)">
          Host: <strong>${host.name}</strong> (${code}) &nbsp;|&nbsp;
          IC attack pool: <strong>${secVal}d6</strong>, TN <strong>${atkTN}</strong>
          &nbsp;|&nbsp; Base damage: <strong>${rating}${dmgLevel[0]}</strong>
        </p>
        <label>Target decker:
          <select id="icia-target" style="width:100%;margin-top:2px">${deckerOpts}</select>
        </label>
        <div style="font-size:11px;color:var(--sr-muted);line-height:1.4">
          The decker sets their own defence dice and Hacking Pool in their corner of the card.
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <label>IC attack dice (${secVal}):
            <input type="number" id="icia-atk-dice" value="${secVal}" min="1" max="30"
              style="width:54px;margin-left:4px">
          </label>
          <label>Attack TN (${atkTN}):
            <input type="number" id="icia-atk-tn" value="${atkTN}" min="2" max="12"
              style="width:54px;margin-left:4px">
          </label>
        </div>
      </div>`,
      buttons: [
        {
          label: 'Post Card', action: 'ok', default: true,
          callback: (_e, _b, dlg) => {
            confirmed       = true;
            targetId        = dlg.element.querySelector('#icia-target')?.value;
            atkDiceOverride = Math.max(1, parseInt(dlg.element.querySelector('#icia-atk-dice')?.value)  || secVal);
            atkTNOverride   = Math.max(2, parseInt(dlg.element.querySelector('#icia-atk-tn')?.value)    || atkTN);
          },
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    if (!confirmed || !targetId) return;

    const deckerActor = game.actors.get(targetId);
    if (!deckerActor) return;

    /**
     * ⚠ NOTHING of the decker's is chosen or spent here.
     *
     * This dialog used to carry "Decker defense dice" and "Decker HP allocation", and then
     * committed the allocation with `deckerActor.update({ hackingPoolSpent })` — before the
     * decker had even seen the card. IC is GM-run, so that was the GM choosing a player's
     * defence AND spending their limited Hacking Pool for them. Of all eight cards this was
     * the worst instance, because Hacking Pool does not come back until the pools refresh.
     *
     * The decker's corner is theirs: dice seeded from their own Cybercombat rating, a
     * Hacking Pool field they fill in themselves, and the owner gate makes both read-only to
     * the IC. The spend happens in `handleOrthodoxICAttackRoll`, from what they submitted.
     */
    const defCcSkill   = deckerActor.items.find(i => i.type === 'skill' && /cybercombat/i.test(i.name));
    const totalDefDice = Math.max(1, defCcSkill?.system?.rating ?? 1);
    const defHpAvail   = deckerActor.system.derived?.availableOrthodoxHackingPool
                      ?? deckerActor.system.derived?.availableHackingPool ?? 0;
    const defTN        = atkTNOverride;  // same TN for both sides
    const baseCode     = `${rating}${dmgLevel[0]}`;

    const ctx = {
      icActorId:     this.id,
      deckerActorId: targetId,
      hostActorId:   host.id,
      icName:        this.name,
      deckerName:    deckerActor.name,
      secCode:       code,
      dmgLevel,
      atkPower:      rating,
      atkDice:       atkDiceOverride,
      atkTN:         atkTNOverride,
      defDice:       totalDefDice,
      defTN,
      baseCode,
    };
    const payload = JSON.stringify(ctx).replace(/'/g, '&#39;');

    // `hpCls` is optional — only the decker's corner gets a Hacking Pool field. IC has no
    // pool of its own, and rendering an inert box there would invite someone to fill it in.
    const _corner = (name, skill, dice, tn, tnLabel, dcls, tcls, role, owner, hpCls = null, hpAvail = 0) => `
      <div class="sr-miji-corner"
           data-corner-role="${role}" data-corner-owner="${owner ?? ''}" data-corner-label="${name}">
        <div class="sr-miji-name">${name}</div>
        <div class="sr-miji-skill">${skill}</div>
        <div class="sr-melee-field-row"><span>Dice:</span>
          <input type="number" class="${dcls}" value="${dice}" min="1" max="40" style="width:44px"/></div>
        ${hpCls ? `<div class="sr-melee-field-row"><span>Hack pool:</span>
          <input type="number" class="${hpCls}" value="0" min="0" max="${hpAvail}" style="width:44px"/>
          <span style="font-size:10px;color:var(--sr-muted)">/ ${hpAvail}</span></div>` : ''}
        <div class="sr-melee-field-row"><span>${tnLabel}:</span>
          <input type="number" class="${tcls}" value="${tn}"  min="2" max="30" style="width:40px"/></div>
      </div>`;

    await ChatMessage.create({
      speaker: { alias: 'Cybercombat' },
      content: `<div class="sr-roll-card sr-miji-card" data-twocorner="icia">
        <div class="sr-roll-header">⚔ ${this.name} attacks ${deckerActor.name}</div>
        <div style="font-size:11px;color:var(--sr-muted);text-align:center;margin-bottom:4px">
          ${host.name} (${code}) &nbsp;|&nbsp; Base damage: <strong>${baseCode}</strong>
        </div>
        <div class="sr-melee-boxing">
          ${_corner(this.name, `Security Value (${atkDiceOverride}d6)`,
                    atkDiceOverride, atkTNOverride, 'TN', 'sr-icia-atk-dice', 'sr-icia-atk-tn', 'attacker', this.id)}
          <div class="sr-melee-vs">VS</div>
          ${_corner(deckerActor.name, `Cybercombat (${totalDefDice}d6)`,
                    totalDefDice, defTN, 'TN', 'sr-icia-def-dice', 'sr-icia-def-tn', 'defender', targetId,
                    'sr-icia-def-hp', defHpAvail)}
        </div>
        ${SR3EActor.cornerActions(payload, [
          { role: 'attacker', label: this.name,        owner: this.id },
          { role: 'defender', label: deckerActor.name, owner: targetId },
        ])}
      </div>`,
      style: CONST.CHAT_MESSAGE_STYLES.ROLL,
    });
  }

  static async handleOrthodoxICAttackRoll(btn) {
    const ctx  = JSON.parse(btn.dataset.payload);
    const card = btn.closest('.sr-miji-card');
    btn.disabled = true; btn.textContent = '⏳ Rolling…';

    // Each side's own submission first, this card's DOM only as a fallback (TODO 24).
    const sub = SR3EActor.meleeSubmissions(btn);
    const f   = (role, cls) => SR3EActor.cornerField(sub, role, cls, card);

    const atkDice = Math.max(1, parseInt(f('attacker', 'sr-icia-atk-dice')) || ctx.atkDice);
    const defDice = Math.max(0, parseInt(f('defender', 'sr-icia-def-dice')) || ctx.defDice);
    const atkTN   = SR3EActor.cornerTN(f('attacker', 'sr-icia-atk-tn'), ctx.atkTN);
    const defTN   = SR3EActor.cornerTN(f('defender', 'sr-icia-def-tn'), ctx.defTN);

    const icActor     = game.actors.get(ctx.icActorId);
    const deckerActor = game.actors.get(ctx.deckerActorId);
    if (!icActor || !deckerActor) { ui.notifications.warn('Orthodox IC Attack: missing actor.'); return; }

    // The decker's Hacking Pool is charged HERE, from what the decker themselves submitted,
    // and only what they actually have is deducted and rolled. It used to be committed by
    // the IC's setup dialog with a bare `update`, before the decker had seen the card.
    const defHpWant  = Math.max(0, parseInt(f('defender', 'sr-icia-def-hp')) || 0);
    const defHpSpent = defHpWant > 0 ? await deckerActor.spendHackingPool(defHpWant) : 0;

    const aRes = SR3EActor._resolveOrthoRoll(icActor,     atkDice, atkTN);
    const dRes = SR3EActor._resolveOrthoRoll(deckerActor, defDice + defHpSpent, defTN);

    const aHits = aRes.successes, dHits = dRes.successes;
    const net   = aHits - dHits;

    const _dice = r => r.dice.map(d =>
      `<span class="chase-die${d.success ? ' chase-die-best' : ''}">${d.total}</span>`
    ).join('');

    let outcome;
    if (net <= 0) {
      outcome = `<div class="sr-staging-result" style="color:var(--sr-green)">✓ Decker evades (${dHits} vs ${aHits})</div>`;
    } else {
      const { stageDamage, parseDamageCode } = game.sr3e.SR3EItem;
      const staged    = stageDamage(parseDamageCode(ctx.baseCode), Math.floor(net / 2));
      const finalCode = `${staged.power}${staged.level}`;
      const lvlBoxes  = { L: 1, M: 3, S: 6, D: 10 };
      const boxes     = lvlBoxes[staged.level] ?? 3;

      const assignCtx = JSON.stringify({
        deckerActorId: ctx.deckerActorId,
        deckerName:    ctx.deckerName,
        hostActorId:   ctx.hostActorId,
        dmgCode:       finalCode,
        boxes,
      }).replace(/'/g, '&#39;');

      outcome = `<div class="sr-staging-result" style="color:var(--sr-red)">
        ✗ Hit! Net ${net} → ${Math.floor(net / 2)} stage${Math.floor(net / 2) !== 1 ? 's' : ''} up
        → <strong>${finalCode}</strong> (${boxes} box${boxes !== 1 ? 'es' : ''}) on ${ctx.deckerName}
      </div>
      <div class="sr-soak-action">
        <button class="sr-icia-assign-btn" data-payload='${assignCtx}'>
          💻 Assign ${boxes} box${boxes !== 1 ? 'es' : ''} to ${ctx.deckerName}'s Matrix CM
        </button>
      </div>`;
    }

    await ChatMessage.create({
      speaker: { alias: 'Cybercombat' },
      content: `<div class="sr-roll-card sr-miji-card">
        <div class="sr-roll-header">⚔ IC Attack Result — ${ctx.icName} vs ${ctx.deckerName}</div>
        <div class="sr-miji-result-grid">
          <div><strong>${ctx.icName}</strong> (attack): ${aHits} hit${aHits !== 1 ? 's' : ''}<br>${_dice(aRes)}</div>
          <div><strong>${ctx.deckerName}</strong> (defend): ${dHits} hit${dHits !== 1 ? 's' : ''}<br>${_dice(dRes)}</div>
        </div>
        ${outcome}
      </div>`,
      style: CONST.CHAT_MESSAGE_STYLES.ROLL,
    });
  }

  static async handleOrthodoxICAssign(btn) {
    const ctx         = JSON.parse(btn.dataset.payload);
    btn.disabled      = true;
    const deckerActor = game.actors.get(ctx.deckerActorId);
    if (!deckerActor) { ui.notifications.warn('Target decker not found.'); return; }

    const cur    = deckerActor.system.orthodoxMatrixCM?.value ?? 0;
    const newVal = Math.min(10, cur + ctx.boxes);
    await deckerActor.update({ 'system.orthodoxMatrixCM.value': newVal });

    if (newVal >= 10 && cur < 10) {
      // Cyberdeck just crashed — trigger dumpshock
      const host      = ctx.hostActorId ? game.actors.get(ctx.hostActorId) : null;
      const secVal    = host?.system?.orthodoxSecurityValue ?? 6;
      const isVRHot   = (deckerActor.system.matrixUserMode ?? '') === 'VR-Hot';
      const isStun    = !isVRHot;
      const trackLabel = isStun ? 'Stun' : 'Physical';
      const soakCtx    = JSON.stringify({
        attackerActorId: null,
        targetActorId:   ctx.deckerActorId,
        isMelee:         false,
        stagedPower:     secVal,
        stagedLevel:     'M',
        isStun,
        rawDamage:       `${secVal}M`,
      }).replace(/'/g, '&#39;');

      await ChatMessage.create({
        speaker: { alias: 'Matrix' },
        content: `<div class="sr-roll-card">
          <div class="sr-roll-header" style="color:var(--sr-red)">⚡ Cyberdeck Crashed — ${ctx.deckerName}</div>
          <div class="sr-staging-result">
            Matrix CM full — ${ctx.deckerName} is forcibly disconnected.
            Dumpshock ${isVRHot ? '(VR-Hot → Physical)' : '(VR-Cold → Stun)'}: <strong>${secVal}M ${trackLabel}</strong>
          </div>
          <div class="sr-soak-action">
            <button class="sr-soak-btn" data-payload='${soakCtx}'>
              🛡 ${ctx.deckerName}: Resist Dumpshock (Body)
            </button>
          </div>
        </div>`,
        style: CONST.CHAT_MESSAGE_STYLES.ROLL,
      });
    } else if (newVal > cur) {
      ui.notifications.info(`${ctx.deckerName}: Matrix CM ${cur} → ${newVal}/10 (${ctx.dmgCode})`);
    }
  }

  static async handleOrthodoxCybercombatRoll(btn) {
    const ctx  = JSON.parse(btn.dataset.payload);
    const card = btn.closest('.sr-miji-card');
    btn.disabled = true; btn.textContent = '⏳ Rolling…';

    // Each side's own submission first, this card's DOM only as a fallback (TODO 24).
    const sub = SR3EActor.meleeSubmissions(btn);
    const f   = (role, cls) => SR3EActor.cornerField(sub, role, cls, card);

    const atkDice  = Math.max(1, parseInt(f('attacker', 'sr-occ-atk-dice'))  || ctx.atkDice);
    const soakDice = Math.max(1, parseInt(f('defender', 'sr-occ-soak-dice')) || ctx.soakPool);
    const atkTN    = SR3EActor.cornerTN(f('attacker', 'sr-occ-atk-tn'), ctx.atkTN);
    const soakTN   = SR3EActor.cornerTN(f('defender', 'sr-occ-soak-tn'), ctx.soakTN);

    const deckerActor = game.actors.get(ctx.deckerActorId);
    const icActor     = game.actors.get(ctx.icActorId);
    if (!deckerActor || !icActor) { ui.notifications.warn('Orthodox Cybercombat: missing actor.'); return; }

    const aRes = SR3EActor._resolveOrthoRoll(deckerActor, atkDice,  atkTN);
    const sRes = SR3EActor._resolveOrthoRoll(icActor,     soakDice, soakTN);

    const aHits = aRes.successes, sHits = sRes.successes;
    const net   = aHits - sHits;

    const _dice = r => r.dice.map(d =>
      `<span class="chase-die${d.success ? ' chase-die-best' : ''}">${d.total}</span>`
    ).join('');

    let outcome;
    if (net <= 0) {
      outcome = `<div class="sr-staging-result" style="color:var(--sr-green)">✓ IC soaks all damage (${sHits} vs ${aHits})</div>`;
    } else {
      // Stage damage: base level is dmgLevel, 2 net successes = +1 stage
      const { stageDamage, parseDamageCode } = game.sr3e.SR3EItem;
      const baseCode = `${ctx.atkPower}${ctx.dmgLevel[0]}`; // e.g. "8M"
      const staged   = stageDamage(parseDamageCode(baseCode), Math.floor(net / 2));
      const finalCode = `${staged.power}${staged.level}${staged.isStun ? 'S' : ''}`;
      outcome = `<div class="sr-staging-result" style="color:var(--sr-red)">
        ✗ Hit! Net successes: ${net} → ${Math.floor(net / 2)} stage${Math.floor(net/2) !== 1 ? 's' : ''} up
        → <strong>${finalCode}</strong> on ${ctx.icName}
      </div>`;
    }

    await ChatMessage.create({
      speaker: { alias: 'Cybercombat' },
      content: `<div class="sr-roll-card sr-miji-card">
        <div class="sr-roll-header">⚔ Cybercombat Result — ${ctx.deckerName} vs ${ctx.icName}</div>
        <div class="sr-miji-result-grid">
          <div><strong>${ctx.deckerName}</strong> (${ctx.atkName}): ${aHits} hit${aHits !== 1 ? 's' : ''}<br>${_dice(aRes)}</div>
          <div><strong>${ctx.icName}</strong> (soak): ${sHits} hit${sHits !== 1 ? 's' : ''}<br>${_dice(sRes)}</div>
        </div>
        ${outcome}
      </div>`,
      style: CONST.CHAT_MESSAGE_STYLES.ROLL,
    });
  }
}