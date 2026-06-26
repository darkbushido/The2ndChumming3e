/**
 * SR3EWard — Wards (astral barriers, SR3 Core p.174 / MitS p.88-89).
 *
 * Handles the full ward lifecycle:
 *   1. openCastDialog(casterActor) → Magic Attribute Test vs TN=Force (Rule of Six, via
 *      the normal actor.rollPool path — resolved in SR3EActor._postWaveCard's
 *      isWardCastRoll branch). Successes = weeks the ward lasts (0 = it fails to form).
 *      Drain is always (Force)L Stun, win or lose.
 *   2. On success: "Place Ward on Canvas" button → confirmPlaceWard(payload) — aims with
 *      the existing AoE cursor helper, creates the ward Actor + Token, and draws a
 *      persistent grey boundary Region (same mechanism as grenade/spell-AoE markers).
 *   3. openAttackDialog(wardActor) → pick an attacker + attack mode, alert the GM and the
 *      ward's creator immediately (RAW: alerted "the moment attacked", no detection test),
 *      then roll the attacker's side (resolved in isWardAttackRoll). The resulting
 *      "Ward Resists" button calls handleWardResistClick, which rolls the ward's own side
 *      (isWardSoakRoll) and ends in the normal "Assign Damage" button.
 *   4. openFoolDialog(wardActor) → a one-click simultaneous opposed contest (2×Initiate
 *      Grade vs Force, Force vs Grade) — no alert is posted, win = slip past undetected.
 *   5. redrawBoundary(wardActor) — clears and redraws the boundary marker at the token's
 *      current position/radius.
 *
 * No static imports — game.sr3e.SR3EActor / game.sr3e.SR3EItem are used at call time to
 * avoid circular imports (same convention as the rest of the system).
 */
export class SR3EWard {

  /** Sorcery (+2 if "Astral Combat" specialisation) — same lookup astral combat already uses. */
  static _astralSkillInfo(actor) {
    const sorcery = actor.items.find(i => i.type === 'skill' && i.name.toLowerCase() === 'sorcery');
    if (sorcery) {
      const rating  = sorcery.system.skillRating ?? sorcery.system.rating ?? 1;
      const hasSpec = (sorcery.system.specialisation ?? '').toLowerCase() === 'astral combat';
      return { skillName: hasSpec ? 'Sorcery (Astral Combat spec)' : 'Sorcery', skillDice: hasSpec ? rating + 2 : rating, isDefault: false };
    }
    const wil = actor.system.attributes?.willpower?.base ?? 1;
    return { skillName: 'Sorcery (defaulting)', skillDice: Math.max(1, wil), isDefault: true };
  }

  static _activeWeaponFocus(actor) {
    return actor.items.find(i => i.type === 'melee' && (i.system.isFocus ?? false) && (i.system.focusActive ?? false));
  }

  /* ------------------------------------------------------------------ */
  /*  1. Casting                                                          */
  /* ------------------------------------------------------------------ */

  static async openCastDialog(caster) {
    const magicBase = caster.system.attributes?.magic?.base ?? 0;
    if (magicBase <= 0) { ui.notifications.warn(`${caster.name} is not Awakened and cannot cast a ward.`); return; }

    let result = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: `${caster.name} — Cast Ward` },
      content: `
        <div style="display:flex;flex-direction:column;gap:8px;padding:4px 0">
          <label style="font-size:12px;color:var(--sr-muted)">Force
            <input type="number" id="ward-force" value="${magicBase}" min="1" style="width:100%"/>
          </label>
          <div style="font-size:11px;color:var(--sr-muted)">Max volume: Magic × 50 = ${magicBase * 50}m³ (GM judges actual shape).</div>
          <label style="font-size:12px;color:var(--sr-muted)">Ward Type
            <select id="ward-type" style="width:100%">
              <option value="standard">Standard</option>
              <option value="alarm">Alarm (harder to detect)</option>
              <option value="polarized">Polarized (one-way visibility)</option>
              <option value="masking">Masking (hides magic inside)</option>
            </select>
          </label>
          <label style="font-size:12px;color:var(--sr-muted)">Area Radius (m)
            <input type="number" id="ward-radius" value="5" min="1" style="width:100%"/>
          </label>
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--sr-muted)">
            <input type="checkbox" id="ward-permanent"/> Make Permanent (GM: deduct Force in Karma)
          </label>
          <div style="font-size:11px;color:var(--sr-amber)">Drain: (Force)L Stun — never physical, regardless of Force vs Magic.</div>
        </div>`,
      buttons: [
        { label: 'Cast', action: 'go', default: true, callback: (_e, _b, dialog) => {
          const el = dialog.element;
          result = {
            force:       Math.max(1, parseInt(el.querySelector('#ward-force')?.value) || magicBase),
            wardType:    el.querySelector('#ward-type')?.value ?? 'standard',
            areaRadius:  Math.max(1, parseInt(el.querySelector('#ward-radius')?.value) || 5),
            isPermanent: el.querySelector('#ward-permanent')?.checked ?? false,
          };
        } },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    if (!result) return;

    await caster.rollPool(Math.max(1, magicBase), result.force, `🛡 Cast Ward (Force ${result.force})`, {
      isWardCastRoll: true,
      wardCastContext: {
        casterActorId: caster.id,
        force:         result.force,
        wardType:      result.wardType,
        areaRadius:    result.areaRadius,
        isPermanent:   result.isPermanent,
      },
    });
  }

  /** "Place Ward on Canvas" button click — aim, create the Actor + Token, draw the boundary. */
  static async confirmPlaceWard(payload) {
    const caster = game.actors.get(payload.casterActorId);
    if (!caster) { ui.notifications.warn('Ward: caster actor not found.'); return; }

    const placed = await game.sr3e.SR3EItem._placeBlastTemplate(caster, payload.areaRadius);
    if (!placed) { ui.notifications.info('Ward placement cancelled.'); return; }

    const ward = await Actor.create({
      name: `${caster.name}'s Ward`,
      type: 'ward',
      system: {
        maxForce:       payload.force,
        damage:         0,
        wardType:       payload.wardType,
        isPermanent:    payload.isPermanent,
        weeksRemaining: payload.isPermanent ? 0 : (payload.weeks ?? 0),
        areaRadius:     payload.areaRadius,
        creatorActorId: caster.id,
      },
    }, { renderSheet: false });
    if (!ward) return;

    const tokenDoc = await ward.getTokenDocument({
      x: placed.center.x - (canvas.grid.size / 2),
      y: placed.center.y - (canvas.grid.size / 2),
    });
    await canvas.scene?.createEmbeddedDocuments('Token', [tokenDoc.toObject()]);

    const { regionId, markerId } = await game.sr3e.SR3EActor._drawBlastArea(placed.center, payload.areaRadius, {
      name: `${ward.name} (boundary)`,
      color: '#c8d4d8',
    });
    await ward.update({ 'system.regionId': regionId ?? '', 'system.markerId': markerId ?? '', 'system.sceneId': canvas.scene?.id ?? '' });

    ui.notifications.info(`${ward.name} placed (Force ${payload.force}).`);
  }

  /* ------------------------------------------------------------------ */
  /*  2. Attacking (breaking)                                             */
  /* ------------------------------------------------------------------ */

  static async openAttackDialog(ward) {
    const actorOpts = game.actors
      .filter(a => (a.type === 'character' || a.type === 'npc') && !a.getFlag('The2ndChumming3e', 'isTemplate'))
      .map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    if (!actorOpts) { ui.notifications.warn('No actors available to attack the ward.'); return; }

    const title = `Attack ${ward.name}`;
    let hookId = Hooks.on('renderDialogV2', (app, html) => {
      if (app.options?.window?.title !== title) return;
      Hooks.off('renderDialogV2', hookId);
      const el     = html?.querySelector ? html : html?.[0];
      const modeEl = el?.querySelector?.('#wa-mode');
      const rowEl  = el?.querySelector?.('#wa-force-row');
      modeEl?.addEventListener('change', () => {
        rowEl.style.display = (modeEl.value === 'sorcery' || modeEl.value === 'spirit') ? '' : 'none';
      });
    });

    let result = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title },
      content: `
        <div style="display:flex;flex-direction:column;gap:8px;padding:4px 0">
          <label style="font-size:12px;color:var(--sr-muted)">Attacker
            <select id="wa-attacker" style="width:100%">${actorOpts}</select>
          </label>
          <label style="font-size:12px;color:var(--sr-muted)">Attack Mode
            <select id="wa-mode" style="width:100%">
              <option value="unarmed">Unarmed astral form — (Magic)M Stun</option>
              <option value="focus">Weapon focus — focus's own damage code</option>
              <option value="sorcery">Sorcery used offensively — (Force)M Physical</option>
              <option value="spirit">Spirit — (Force)M Stun</option>
            </select>
          </label>
          <label id="wa-force-row" style="font-size:12px;color:var(--sr-muted);display:none">Force (for Sorcery/Spirit modes)
            <input type="number" id="wa-force" value="${ward.system.force}" min="1" style="width:100%"/>
          </label>
        </div>`,
      buttons: [
        { label: 'Declare Attack', action: 'go', default: true, callback: (_e, _b, dialog) => {
          const el = dialog.element;
          result = {
            attackerActorId: el.querySelector('#wa-attacker')?.value,
            mode:             el.querySelector('#wa-mode')?.value ?? 'unarmed',
            force:            Math.max(1, parseInt(el.querySelector('#wa-force')?.value) || ward.system.force),
          };
        } },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    Hooks.off('renderDialogV2', hookId);
    if (!result) return;

    const attacker = game.actors.get(result.attackerActorId);
    if (!attacker) return;

    let damageBase, rawDamage;
    if (result.mode === 'focus') {
      const focus = SR3EWard._activeWeaponFocus(attacker);
      rawDamage  = focus?.system?.damage ?? `${attacker.system.attributes?.magic?.base ?? 1}M`;
      damageBase = game.sr3e.SR3EItem.parseDamageCode(rawDamage, attacker) ?? { power: 1, level: 'M', isStun: true };
    } else if (result.mode === 'sorcery') {
      rawDamage  = `${result.force}M`;
      damageBase = { power: result.force, level: 'M', isStun: false };
    } else if (result.mode === 'spirit') {
      rawDamage  = `${result.force}M`;
      damageBase = { power: result.force, level: 'M', isStun: true };
    } else {
      const magicBase = attacker.system.attributes?.magic?.base ?? 1;
      rawDamage  = `${magicBase}M`;
      damageBase = { power: magicBase, level: 'M', isStun: true };
    }

    const skillInfo = SR3EWard._astralSkillInfo(attacker);
    let pool = skillInfo.skillDice, tnMod = 0;
    if (skillInfo.isDefault) {
      const def = await game.sr3e.SR3EItem.promptDefaultChoice(attacker, {
        linkedAttr: 'willpower',
        title:      `Defaulting — ${attacker.name} (attacking ${ward.name})`,
        message:    `${attacker.name} has no <strong>Sorcery</strong> skill — choose how to default:`,
      });
      if (!def) return;
      pool  = def.pool;
      tnMod = def.tnMod;
    }

    // RAW: the ward's creator is automatically alerted the moment the ward is attacked —
    // no detection test, posted immediately (before the dice even resolve).
    const creator = ward.system.creatorActorId ? game.actors.get(ward.system.creatorActorId) : null;
    const whisperTargets = new Set([...game.users.filter(u => u.isGM).map(u => u.id)]);
    if (creator) for (const u of game.users) if (creator.testUserPermission(u, 'OWNER')) whisperTargets.add(u.id);
    await ChatMessage.create({
      speaker: { alias: 'Ward' },
      whisper: Array.from(whisperTargets),
      content: `<div class="sr-roll-card"><div class="sr-roll-header">⚠ ${ward.name} attacked!</div>
        <div style="font-size:12px;padding:4px 0">${attacker.name} is attacking ${ward.name}${creator ? ` (warded by ${creator.name})` : ''}.</div></div>`,
    });

    await attacker.rollPool(Math.max(1, pool), Math.max(2, ward.system.force + tnMod), `⚔ ${attacker.name} attacks ${ward.name}`, {
      isWardAttackRoll: true,
      wardAttackContext: {
        wardActorId:      ward.id,
        attackerActorId:  attacker.id,
        damageBase,
        rawDamage,
      },
    });
  }

  /** "Ward Resists" button click — rolls the ward's own Force-dice soak. */
  static async handleWardResistClick(btn) {
    const p    = JSON.parse(btn.dataset.payload);
    const ward = game.actors.get(p.wardActorId);
    const attacker = game.actors.get(p.attackerActorId);
    if (!ward) { ui.notifications.warn('Ward: actor not found.'); return; }
    btn.disabled = true;
    btn.textContent = '⏳ Resisting…';

    const attackerMagic = attacker?.system?.attributes?.magic?.base ?? attacker?.system?.attributes?.magic?.value ?? 1;
    await ward.rollPool(Math.max(1, ward.system.force), Math.max(2, attackerMagic), `🛡 ${ward.name} Resists`, {
      isWardSoakRoll: true,
      wardSoakContext: {
        wardActorId:  ward.id,
        stagedPower:  p.stagedPower,
        stagedLevel:  p.stagedLevel,
      },
    });
  }

  /* ------------------------------------------------------------------ */
  /*  3. Fooling (Masking metamagic, MitS p.88-89) — no alert posted     */
  /* ------------------------------------------------------------------ */

  static _resolveRoll(actor, pool, tn) {
    pool = Math.max(1, pool | 0);
    tn   = Math.max(2, tn | 0);
    let dice = actor._rollWave(pool, tn, true);
    let guard = 0;
    while (guard++ < 50) {
      const idx = dice.map((d, i) => (d.needsExplosion && !d.done) ? i : -1).filter(i => i >= 0);
      if (!idx.length) break;
      dice = actor._rollWave(pool, tn, false, dice, idx);
    }
    return { successes: dice.filter(d => d.success).length, dice };
  }

  static async openFoolDialog(ward) {
    const actorOpts = game.actors
      .filter(a => (a.type === 'character' || a.type === 'npc') && !a.getFlag('The2ndChumming3e', 'isTemplate'))
      .map(a => `<option value="${a.id}">${a.name} (Grade ${a.system.initiateGrade ?? 0})</option>`).join('');
    if (!actorOpts) { ui.notifications.warn('No actors available to attempt this.'); return; }

    let attackerId = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: `Fool ${ward.name}` },
      content: `
        <div style="font-size:12px;color:var(--sr-muted);padding:4px 0">
          Requires the Masking metamagic. Rolls 2 × Initiate Grade vs the ward's Force; the ward
          rolls its Force vs the Initiate's Grade. More successes wins — a tie favors the ward.
        </div>
        <label style="font-size:12px;color:var(--sr-muted)">Initiate
          <select id="fool-actor" style="width:100%">${actorOpts}</select>
        </label>`,
      buttons: [
        { label: 'Attempt', action: 'go', default: true, callback: (_e, _b, dialog) => {
          attackerId = dialog.element.querySelector('#fool-actor')?.value;
        } },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    if (!attackerId) return;

    const attacker = game.actors.get(attackerId);
    const grade    = Math.max(0, attacker?.system?.initiateGrade ?? 0);
    if (grade <= 0) ui.notifications.warn(`${attacker?.name ?? 'Attacker'} has no Initiate Grade — proceeding anyway (minimal guardrails).`);

    const atkRes = SR3EWard._resolveRoll(attacker, Math.max(1, grade * 2), Math.max(2, ward.system.force));
    const wardRes = SR3EWard._resolveRoll(ward, Math.max(1, ward.system.force), Math.max(2, grade));

    const _dice = (r) => r.dice.map(d => `<span class="chase-die${d.success ? ' chase-die-best' : ''}">${d.total}</span>`).join('');
    const won = atkRes.successes > wardRes.successes;
    const outcome = won
      ? `<div class="sr-staging-result">✨ ${attacker.name} slips past ${ward.name} undetected.</div>`
      : `<div class="sr-staging-result sr-soak-blocked">🛡 ${ward.name} holds — ${attacker.name} cannot pass (must try again).</div>`;

    await ChatMessage.create({
      speaker: { alias: 'Ward' },
      content: `
        <div class="sr-roll-card">
          <div class="sr-roll-header">🌫 Fooling ${ward.name}</div>
          <div class="sr-miji-result-grid">
            <div><strong>${attacker.name}</strong> (${grade * 2} dice): ${atkRes.successes} hit${atkRes.successes !== 1 ? 's' : ''}<br>${_dice(atkRes)}</div>
            <div><strong>${ward.name}</strong> (${ward.system.force} dice): ${wardRes.successes} hit${wardRes.successes !== 1 ? 's' : ''}<br>${_dice(wardRes)}</div>
          </div>
          ${outcome}
        </div>`,
      style: CONST.CHAT_MESSAGE_STYLES.ROLL,
    });
  }

  /* ------------------------------------------------------------------ */
  /*  4. Boundary marker maintenance                                      */
  /* ------------------------------------------------------------------ */

  static async redrawBoundary(ward) {
    await SR3EWard._clearBoundary(ward);
    const token = ward.getActiveTokens?.()[0];
    const center = token ? { x: token.center.x, y: token.center.y } : null;
    if (!center) { ui.notifications.warn(`${ward.name} has no token on the active scene.`); return; }
    const { regionId, markerId } = await game.sr3e.SR3EActor._drawBlastArea(center, ward.system.areaRadius ?? 5, {
      name: `${ward.name} (boundary)`,
      color: '#c8d4d8',
    });
    await ward.update({ 'system.regionId': regionId ?? '', 'system.markerId': markerId ?? '', 'system.sceneId': canvas.scene?.id ?? '' });
  }

  static async _clearBoundary(ward) {
    const { regionId, markerId, sceneId } = ward.system;
    if (regionId) {
      const scene = sceneId ? game.scenes.get(sceneId) : canvas.scene;
      const region = scene?.regions?.get(regionId);
      if (region) await region.delete().catch(() => {});
    }
    if (markerId) {
      const g = game.sr3e._blastMarkers?.get(markerId);
      if (g) { try { g.destroy(); } catch { /* ignore */ } game.sr3e._blastMarkers.delete(markerId); }
    }
  }
}
