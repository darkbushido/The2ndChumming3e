/**
 * Electronic Warfare — MIJI (Meaconing / Intrusion / Jamming / Interference).
 *
 * A parallel-to-combat opposed contest between two riggers. Stats are split (the plan's
 * "hybrid" placement): deck rating / Flux / protocol-emulation module live on the rigger
 * (character/npc), while ECM / ECCM / Footprint / the 3-channel Signal Monitor / infiltration
 * state live on the vehicle (the network hub).
 *
 * Registered on game.sr3e as SR3EMIJI; launched from the vehicle EW tab. Rolls reuse the
 * actor `_rollWave` Rule-of-Six engine (resolved here in `_resolveRoll`). "Complementary
 * dice" = min(Flux, skillRating) extra pool dice — no special mechanic.
 */
export class SR3EMIJI {

  static get _cfg() { return game.sr3e.SR3E.electronicWarfare; }

  /* ------------------------------------------------------------------ */
  /*  Shared helpers                                                      */
  /* ------------------------------------------------------------------ */

  /** Electronics (Electronic Warfare) skill on an actor → { rating, name } (0 if none). */
  static _ewSkill(actor) {
    if (!actor) return { rating: 0, name: 'Electronics (EW) — none' };
    const skill = actor.items.find(i => {
      if (i.type !== 'skill') return false;
      const n = (i.system.skillName || i.name || '').toLowerCase();
      const s = (i.system.specialisation || '').toLowerCase();
      return n.includes('electronic') || s.includes('electronic warfare');
    });
    if (!skill) return { rating: 0, name: 'Electronics (EW) — none' };
    return { rating: skill.system.rating ?? 0, name: skill.system.skillName || skill.name };
  }

  static _complementary(flux, skillRating) {
    return Math.min(Math.max(0, flux | 0), Math.max(0, skillRating | 0));
  }

  /** Controlling rigger of a vehicle (its linked driver). */
  static _riggerOf(vehicle) {
    const id = vehicle?.system?.driverActorId?.trim();
    return id ? game.actors.get(id) : null;
  }

  /** Fully resolve a Rule-of-Six roll (loops explosions) → { successes, ones, dice }. */
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
    return {
      successes: dice.filter(d => d.success).length,
      ones:      dice.filter(d => d.isOne).length,
      dice,
    };
  }

  static _liveVehicles(excludeId = null) {
    return game.actors
      .filter(a => a.type === 'vehicle' && a.id !== excludeId
        && a.getFlag('The2ndChumming3e', 'isTemplate') !== true)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /* ------------------------------------------------------------------ */
  /*  MIJI attack — opposed contest                                       */
  /* ------------------------------------------------------------------ */

  static async openAttackDialog(targetVehicle) {
    if (!targetVehicle) return;
    const ops      = this._cfg.operations;
    const channels = this._cfg.channels;

    const vehOpts = this._liveVehicles(targetVehicle.id)
      .map(v => `<option value="${v.id}">${v.name}</option>`).join('');
    if (!vehOpts) { ui.notifications.warn('No other vehicles to act as the intruder.'); return; }

    const opOpts = Object.entries(ops)
      .map(([k, o]) => `<option value="${k}">${o.label}</option>`).join('');
    const chanOpts = (opKey) => {
      const allowed = ops[opKey]?.channels ?? channels.map(c => c.key);
      return channels.filter(c => allowed.includes(c.key))
        .map(c => `<option value="${c.key}">${c.label}</option>`).join('');
    };

    // Live channel-list refresh when operation changes.
    let hookId = Hooks.on('renderDialogV2', (_app, html) => {
      const el = html?.querySelector ? html : html?.[0];
      if (!el?.querySelector?.('#miji-op')) return;
      Hooks.off('renderDialogV2', hookId);
      const opSel = el.querySelector('#miji-op');
      const chSel = el.querySelector('#miji-channel');
      const descEl = el.querySelector('#miji-op-desc');
      opSel.addEventListener('change', () => {
        chSel.innerHTML = chanOpts(opSel.value);
        if (descEl) descEl.textContent = ops[opSel.value]?.desc ?? '';
      });
    });

    let result = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: `MIJI Attack — target ${targetVehicle.name}` },
      content: `
        <div style="display:flex;flex-direction:column;gap:8px;padding:4px 0">
          <label style="font-size:12px;color:var(--sr-muted)">Intruder vehicle
            <select id="miji-intruder" style="width:100%">${vehOpts}</select>
          </label>
          <label style="font-size:12px;color:var(--sr-muted)">Operation
            <select id="miji-op" style="width:100%">${opOpts}</select>
          </label>
          <div id="miji-op-desc" style="font-size:11px;color:var(--sr-muted)">${Object.values(ops)[0]?.desc ?? ''}</div>
          <label style="font-size:12px;color:var(--sr-muted)">Target channel
            <select id="miji-channel" style="width:100%">${chanOpts(Object.keys(ops)[0])}</select>
          </label>
        </div>`,
      buttons: [
        { label: 'Continue', action: 'go', default: true, callback: (_e, _b, dialog) => {
            const el = dialog.element;
            result = {
              intruderVehicleId: el.querySelector('#miji-intruder')?.value,
              operation:         el.querySelector('#miji-op')?.value,
              channel:           el.querySelector('#miji-channel')?.value,
            };
          } },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    if (hookId) Hooks.off('renderDialogV2', hookId);
    if (!result?.intruderVehicleId) return;

    const intVehicle = game.actors.get(result.intruderVehicleId);
    const intRigger  = this._riggerOf(intVehicle);
    const defRigger  = this._riggerOf(targetVehicle);
    const op         = ops[result.operation];

    const intSkill = this._ewSkill(intRigger);
    const defSkill = this._ewSkill(defRigger);
    const intFlux  = intRigger?.system?.ew?.fluxRating ?? 0;
    const defFlux  = defRigger?.system?.ew?.fluxRating ?? 0;
    const intComp  = this._complementary(intFlux, intSkill.rating);
    const defComp  = this._complementary(defFlux, defSkill.rating);

    // Intruder TN = defender's remote-control deck rating.
    const intTN = Math.max(2, defRigger?.system?.ew?.deckRating ?? 4);
    // Defender TN = intruder's ECM (Jamming) or protocol-emulation module (others).
    const defTN = Math.max(2, op.tnStat === 'ecm'
      ? (intVehicle?.system?.ew?.ecm ?? 0)
      : (intRigger?.system?.ew?.protocolModule ?? 0));

    await this.postMIJICard({
      targetVehicleId:   targetVehicle.id,
      targetVehicleName: targetVehicle.name,
      intruderVehicleId: intVehicle.id,
      intruderName:      intVehicle.name,
      intruderRiggerId:  intRigger?.id ?? null,
      defenderRiggerId:  defRigger?.id ?? null,
      operation:         result.operation,
      operationLabel:    op.label,
      channel:           result.channel,
      channelLabel:      channels.find(c => c.key === result.channel)?.label ?? result.channel,
      intDice: Math.max(1, intSkill.rating + intComp), intTN, intComp, intSkillName: intSkill.name,
      defDice: Math.max(1, defSkill.rating + defComp), defTN, defComp, defSkillName: defSkill.name,
      tnStat: op.tnStat,
    });
  }

  static async postMIJICard(ctx) {
    const payload = JSON.stringify(ctx).replace(/'/g, '&#39;');
    const defName = ctx.defenderRiggerId ? game.actors.get(ctx.defenderRiggerId)?.name : ctx.targetVehicleName;
    const _corner = (who, dice, tn, comp, skillName, diceCls, tnCls, tnLabel) => `
      <div class="sr-miji-corner">
        <div class="sr-miji-name">${who}</div>
        <div class="sr-miji-skill">${skillName}</div>
        <div class="sr-melee-field-row"><span>Dice:</span>
          <input type="number" class="${diceCls}" value="${dice}" min="1" max="40" style="width:44px"/></div>
        <div class="sr-melee-field-row"><span>${tnLabel}:</span>
          <input type="number" class="${tnCls}" value="${tn}" min="2" max="30" style="width:40px"/></div>
        <div class="sr-miji-comp">incl. +${comp} Flux comp.</div>
      </div>`;

    await ChatMessage.create({
      speaker: { alias: 'Electronic Warfare' },
      content: `
        <div class="sr-roll-card sr-miji-card">
          <div class="sr-roll-header">⚡ MIJI — ${ctx.operationLabel} on ${ctx.channelLabel}</div>
          <div style="font-size:11px;color:var(--sr-muted);text-align:center;margin-bottom:4px">
            ${ctx.intruderName} → ${ctx.targetVehicleName}
          </div>
          <div class="sr-melee-boxing">
            ${_corner(ctx.intruderName, ctx.intDice, ctx.intTN, ctx.intComp, ctx.intSkillName,
                      'sr-miji-int-dice', 'sr-miji-int-tn', 'TN (deck)')}
            <div class="sr-melee-vs">VS</div>
            ${_corner(defName, ctx.defDice, ctx.defTN, ctx.defComp, ctx.defSkillName,
                      'sr-miji-def-dice', 'sr-miji-def-tn', ctx.tnStat === 'ecm' ? 'TN (ECM)' : 'TN (proto)')}
          </div>
          <div class="sr-soak-action">
            <button class="sr-miji-roll-btn" data-payload='${payload}'>⚡ Roll MIJI Test</button>
          </div>
        </div>`,
      style: CONST.CHAT_MESSAGE_STYLES.ROLL,
    });
  }

  static async handleMIJIRoll(btn) {
    const ctx  = JSON.parse(btn.dataset.payload);
    const card = btn.closest('.sr-miji-card');
    btn.disabled = true; btn.textContent = '⏳ Rolling…';

    const intDice = Math.max(1, parseInt(card?.querySelector('.sr-miji-int-dice')?.value) || ctx.intDice);
    const defDice = Math.max(1, parseInt(card?.querySelector('.sr-miji-def-dice')?.value) || ctx.defDice);
    const intTN   = Math.max(2, parseInt(card?.querySelector('.sr-miji-int-tn')?.value) || ctx.intTN);
    const defTN   = Math.max(2, parseInt(card?.querySelector('.sr-miji-def-tn')?.value) || ctx.defTN);

    const intActor = game.actors.get(ctx.intruderRiggerId) ?? game.actors.get(ctx.intruderVehicleId);
    const defActor = game.actors.get(ctx.defenderRiggerId) ?? game.actors.get(ctx.targetVehicleId);
    if (!intActor || !defActor) { ui.notifications.warn('MIJI: missing intruder or defender actor.'); return; }

    const intRes = this._resolveRoll(intActor, intDice, intTN);
    const defRes = this._resolveRoll(defActor, defDice, defTN);
    await this._postMIJIResult(ctx, intRes, defRes);
  }

  static async _postMIJIResult(ctx, intRes, defRes) {
    const net = intRes.successes - defRes.successes;
    const _dice = (r) => r.dice.map(d => `<span class="chase-die${d.success ? ' chase-die-best' : ''}">${d.total}</span>`).join('');

    let outcome;
    if (net > 0) {
      const payload = JSON.stringify({
        targetVehicleId: ctx.targetVehicleId, channel: ctx.channel,
        channelLabel: ctx.channelLabel, amount: net,
      }).replace(/'/g, '&#39;');
      outcome = `
        <div class="sr-staging-result">Intruder wins by <strong>${net}</strong> →
          <strong>${net}</strong> box${net !== 1 ? 'es' : ''} of degradation on <strong>${ctx.channelLabel}</strong>.</div>
        <div class="sr-soak-action">
          <button class="sr-miji-degradation-btn" data-payload='${payload}'>
            📉 Apply ${net} degradation → ${ctx.channelLabel} on ${ctx.targetVehicleName}
          </button>
        </div>`;
    } else {
      outcome = `<div class="sr-staging-result">Defender holds — <strong>${ctx.channelLabel}</strong> channel stays clear.</div>`;
    }

    await ChatMessage.create({
      speaker: { alias: 'Electronic Warfare' },
      content: `
        <div class="sr-roll-card sr-miji-card">
          <div class="sr-roll-header">⚡ MIJI Result — ${ctx.operationLabel}</div>
          <div class="sr-miji-result-grid">
            <div><strong>${ctx.intruderName}</strong> (intruder): ${intRes.successes} hit${intRes.successes !== 1 ? 's' : ''}<br>${_dice(intRes)}</div>
            <div><strong>${ctx.targetVehicleName}</strong> (defender): ${defRes.successes} hit${defRes.successes !== 1 ? 's' : ''}<br>${_dice(defRes)}</div>
          </div>
          ${outcome}
        </div>`,
      style: CONST.CHAT_MESSAGE_STYLES.ROLL,
    });
  }

  static async applyDegradation(btn) {
    const ctx = JSON.parse(btn.dataset.payload);
    const veh = game.actors.get(ctx.targetVehicleId);
    if (!veh) return;
    btn.disabled = true; btn.textContent = '✓ Applied';
    const cur    = veh.system.signalMonitor?.[ctx.channel] ?? 0;
    const newVal = Math.min(10, cur + (ctx.amount ?? 0));
    // Jamming a channel implies it's breached — keep the Signal Monitor's Infil flag in sync.
    await veh.update({
      [`system.signalMonitor.${ctx.channel}`]: newVal,
      [`system.infiltration.${ctx.channel}`]:  true,
    });

    const tier = this._cfg.degradationTiers.find(t => newVal >= t.min && newVal <= t.max);
    const chan = this._cfg.channels.find(c => c.key === ctx.channel);
    let note;
    if (newVal >= 10) {
      note = `<div class="sr-staging-result" style="color:var(--sr-red)">⚠ ${ctx.channelLabel} CHANNEL LOST — ${chan?.fullEffect ?? ''}</div>`;
      // Simsense full → the VCR-jacked rigger takes Dumpshock.
      if (ctx.channel === 'simsense') {
        const rigger = veh.system?.controlMode === 'vcr' ? game.actors.get(veh.system?.driverActorId) : null;
        if (rigger) note += `<div class="sr-staging-result" style="color:var(--sr-red)">🧠 ${rigger.name} is jacked in — trigger <strong>Dumpshock</strong> (Matrix tab → ⚡ Dumpshock).</div>`;
      }
    } else {
      note = `<div class="sr-staging-result">${ctx.channelLabel} now ${newVal}/10 (${tier ? (tier.mod === null ? tier.label : `+${tier.mod} ${tier.label}`) : '—'}).</div>`;
      if (tier?.mod) note += `<div class="sr-staging-result" style="font-size:11px;color:var(--sr-muted)">+${tier.mod} TN applies to: ${chan?.appliesTo ?? ''}.</div>`;
    }
    await ChatMessage.create({
      speaker: { alias: 'Electronic Warfare' },
      content: `<div class="sr-roll-card sr-miji-card"><div class="sr-roll-header">📉 ${veh.name} — Signal Degradation</div>${note}</div>`,
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Infiltration                                                        */
  /* ------------------------------------------------------------------ */

  static async openInfiltration(targetVehicle) {
    if (!targetVehicle) return;
    const vehOpts = this._liveVehicles(targetVehicle.id)
      .map(v => `<option value="${v.id}">${v.name}</option>`).join('');
    if (!vehOpts) { ui.notifications.warn('No other vehicles to act as the intruder.'); return; }

    let pick = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: `Infiltration — target ${targetVehicle.name}` },
      content: `
        <div style="display:flex;flex-direction:column;gap:8px;padding:4px 0">
          <label style="font-size:12px;color:var(--sr-muted)">Intruder vehicle
            <select id="inf-intruder" style="width:100%">${vehOpts}</select>
          </label>
          <div style="font-size:11px;color:var(--sr-muted)">Roll: Electronics (EW) + Flux comp. vs TN 6, modified by −(intruder Protocol − target Deck). Each success infiltrates one channel or adds to the Intrusion Factor.</div>
        </div>`,
      buttons: [
        { label: 'Roll', action: 'go', default: true, callback: (_e, _b, d) => {
            pick = d.element.querySelector('#inf-intruder')?.value; } },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    if (!pick) return;

    const intVehicle = game.actors.get(pick);
    const intRigger  = this._riggerOf(intVehicle);
    if (!intRigger) { ui.notifications.warn(`${intVehicle?.name ?? 'Intruder'} has no linked rigger.`); return; }
    const defRigger  = this._riggerOf(targetVehicle);

    const skill = this._ewSkill(intRigger);
    const flux  = intRigger.system?.ew?.fluxRating ?? 0;
    const pool  = Math.max(1, skill.rating + this._complementary(flux, skill.rating));
    const proto = intRigger.system?.ew?.protocolModule ?? 0;
    const deck  = defRigger?.system?.ew?.deckRating ?? 0;
    const tn    = Math.max(2, 6 - (proto - deck));

    const res = this._resolveRoll(intRigger, pool, tn);

    if (res.successes <= 0) {
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: intRigger }),
        content: `<div class="sr-roll-card sr-miji-card"><div class="sr-roll-header">📡 Infiltration Failed</div>
          <div class="sr-staging-result">${intVehicle.name} scored 0 successes vs TN ${tn} — no channels breached.</div></div>`,
      });
      return;
    }

    // Allocate successes three ways (R3 p.37): channels breached (1 each), time reduction
    // (base 10 turns ÷ successes spent here), and the leftover → Intrusion Factor.
    const channels = this._cfg.channels;
    const base     = this._cfg.infiltrationTurns;
    const total    = res.successes;
    const turnsFor = (t) => t > 0 ? Math.ceil(base / t) : base;

    // Live "spent / remaining" counter. Channels cost 1 each; time reduction and Intrusion
    // Factor are free inputs — the user allocates all three as they wish (unspent is allowed).
    let hookId = Hooks.on('renderDialogV2', (_app, html) => {
      const el = html?.querySelector ? html : html?.[0];
      if (!el?.querySelector?.('#inf-time')) return;
      Hooks.off('renderDialogV2', hookId);
      const timeInp   = el.querySelector('#inf-time');
      const factorInp = el.querySelector('#inf-factor');
      const out       = el.querySelector('#inf-preview');
      const refresh = () => {
        const ch     = el.querySelectorAll('.inf-ch:checked').length;
        const time   = Math.max(0, parseInt(timeInp.value)   || 0);
        const factor = Math.max(0, parseInt(factorInp.value) || 0);
        const spent  = ch + time + factor;
        const rem    = total - spent;
        if (out) out.innerHTML =
          `Channels ${ch} · Time ${time} (→ infiltrate in <strong>${turnsFor(time)}</strong> turn(s)) · Intrusion Factor ${factor}`
          + `<br>Spent <strong>${spent}</strong> / ${total} — `
          + (rem < 0
              ? `<span style="color:var(--sr-red)">over-allocated by ${-rem}</span>`
              : `<span style="color:var(--sr-muted)">${rem} unspent</span>`);
      };
      el.querySelectorAll('.inf-ch').forEach(c => c.addEventListener('change', refresh));
      timeInp.addEventListener('input', refresh);
      factorInp.addEventListener('input', refresh);
      refresh();
    });

    let alloc = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: `Infiltration — ${total} successes` },
      content: `
        <div style="display:flex;flex-direction:column;gap:6px;padding:4px 0">
          <div style="font-size:12px">Scored <strong>${total}</strong> successes vs TN ${tn}. Allocate them across the three options as you wish:</div>
          <div style="font-size:11px;color:var(--sr-muted)">① channels to breach (1 each) ② time reduction (10 turns ÷ spent) ③ Intrusion Factor (stay hidden).</div>
          ${channels.map(c => `<label style="font-size:12px"><input type="checkbox" class="inf-ch" value="${c.key}"/> ${c.label}</label>`).join('')}
          <label style="font-size:12px">Successes on time reduction
            <input type="number" id="inf-time" value="0" min="0" max="${total}" style="width:50px;margin-left:6px"/>
          </label>
          <label style="font-size:12px">Successes on Intrusion Factor
            <input type="number" id="inf-factor" value="0" min="0" max="${total}" style="width:50px;margin-left:6px"/>
          </label>
          <div id="inf-preview" style="font-size:11px;color:var(--sr-text);margin-top:2px"></div>
        </div>`,
      buttons: [
        { label: 'Establish', action: 'go', default: true, callback: (_e, _b, d) => {
            const checked = [...d.element.querySelectorAll('.inf-ch:checked')].map(i => i.value);
            const time    = Math.max(0, parseInt(d.element.querySelector('#inf-time')?.value)   || 0);
            const factor  = Math.max(0, parseInt(d.element.querySelector('#inf-factor')?.value) || 0);
            alloc = { channels: checked, time, factor };
          } },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    if (hookId) Hooks.off('renderDialogV2', hookId);
    if (!alloc) return;

    // Guard against over-allocation (channels are mandatory; trim Factor then Time to fit).
    let over = (alloc.channels.length + alloc.time + alloc.factor) - total;
    if (over > 0) {
      const trimF = Math.min(alloc.factor, over); alloc.factor -= trimF; over -= trimF;
      if (over > 0) alloc.time = Math.max(0, alloc.time - over);
      ui.notifications.warn(`Infiltration over-allocated — trimmed to ${total} successes.`);
    }

    const turns = turnsFor(alloc.time);
    const update = {
      'system.infiltration.intruderActorId': intRigger.id,
      'system.infiltration.turnsRemaining':  turns,
      'system.infiltration.intrusionFactor': alloc.factor,
      'system.infiltration.command':  alloc.channels.includes('command'),
      'system.infiltration.simsense': alloc.channels.includes('simsense'),
      'system.infiltration.system':   alloc.channels.includes('system'),
    };
    await targetVehicle.update(update);

    const breachedLabels = alloc.channels.map(k => channels.find(c => c.key === k)?.label).join(', ') || 'none';
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: intRigger }),
      content: `<div class="sr-roll-card sr-miji-card"><div class="sr-roll-header">📡 Infiltration Established</div>
        <div class="sr-staging-result">${intVehicle.name} breached <strong>${breachedLabels}</strong> on ${targetVehicle.name}.</div>
        <div class="sr-staging-result">Intrusion Factor <strong>${alloc.factor}</strong>${alloc.time ? ` · ${alloc.time} success${alloc.time !== 1 ? 'es' : ''} on time` : ''} · infiltrate in <strong>${turns}</strong> combat turn(s).</div></div>`,
    });
  }

  static async detectInfiltration(targetVehicle) {
    const inf = targetVehicle?.system?.infiltration ?? {};
    const defRigger = this._riggerOf(targetVehicle);
    if (!defRigger) { ui.notifications.warn('No rigger linked to this vehicle to run the check.'); return; }
    const skill = this._ewSkill(defRigger);
    const pool  = Math.max(1, skill.rating);
    const tn    = Math.max(2, inf.intrusionFactor ?? 0);
    const res   = this._resolveRoll(defRigger, pool, tn);
    const found = res.successes > 0;
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: defRigger }),
      content: `<div class="sr-roll-card sr-miji-card"><div class="sr-roll-header">🔍 Detect Infiltration — ${targetVehicle.name}</div>
        <div class="sr-staging-result">${defRigger.name}: Electronics (EW) ${pool} vs Intrusion Factor ${tn} → ${res.successes} hit${res.successes !== 1 ? 's' : ''}.</div>
        <div class="sr-staging-result" style="color:${found ? 'var(--sr-green)' : 'var(--sr-muted)'}">${found ? '✓ Intrusion detected!' : 'Nothing detected.'}</div></div>`,
    });
  }

  /* ------------------------------------------------------------------ */
  /*  IVIS — BattleTac Inter-Vehicle Information System (R3 p.96)         */
  /* ------------------------------------------------------------------ */

  static _smallUnitTactics(actor) {
    const skill = actor?.items.find(i => {
      if (i.type !== 'skill') return false;
      const n = (i.system.skillName || i.name || '').toLowerCase();
      const s = (i.system.specialisation || '').toLowerCase();
      return n.includes('small unit tactics') || n.includes('vehicle tactics') || s.includes('vehicle tactics');
    });
    return skill
      ? { rating: skill.system.rating ?? 0, name: skill.system.skillName || skill.name }
      : { rating: 0, name: 'Small Unit Tactics — none' };
  }

  // IVIS Test: Small Unit Tactics (Vehicle Tactics) vs TN 5, made before a drone group's
  // Comprehension Test. Successes split between Comprehension bonus dice and a shared IVIS Pool.
  static async openIVIS(rigger) {
    if (!rigger) return;
    const skill = this._smallUnitTactics(rigger);

    // Setup — pool (default SUT rating), TN (default 5), System-channel degradation (editable).
    let hook1 = Hooks.on('renderDialogV2', (_app, html) => {
      const el = html?.querySelector ? html : html?.[0];
      if (!el?.querySelector?.('#ivis-tn')) return;
      Hooks.off('renderDialogV2', hook1);
      const out = el.querySelector('#ivis-tn-out');
      const recompute = () => {
        const tn  = parseInt(el.querySelector('#ivis-tn')?.value)  || 5;
        const deg = parseInt(el.querySelector('#ivis-deg')?.value) || 0;
        if (out) out.textContent = Math.max(2, tn + deg);
      };
      el.querySelectorAll('#ivis-tn, #ivis-deg').forEach(n => { n.addEventListener('input', recompute); });
      recompute();
    });

    let setup = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: `IVIS Test — ${rigger.name}` },
      content: `
        <div style="display:flex;flex-direction:column;gap:8px;padding:4px 0;font-size:12px">
          <div style="color:var(--sr-muted);font-size:11px">Small Unit Tactics (Vehicle Tactics) vs TN 5, before the drone group's Comprehension Test. Requires a BattleTac IVIS master on the deck + IVIS-compatible drone pilots. Not usable by drones the rigger has jumped into.</div>
          <label>Small Unit Tactics dice
            <input type="number" id="ivis-pool" value="${skill.rating}" min="1" max="30" style="width:60px;margin-left:6px"/>
          </label>
          <label>Base TN
            <input type="number" id="ivis-tn" value="5" min="2" max="30" style="width:60px;margin-left:6px"/>
          </label>
          <label>System-channel degradation (+TN)
            <input type="number" id="ivis-deg" value="0" min="0" max="9" style="width:60px;margin-left:6px"/>
          </label>
          <div style="margin-top:2px">Final TN: <strong id="ivis-tn-out">5</strong></div>
        </div>`,
      buttons: [
        { label: 'Roll', action: 'go', default: true, callback: (_e, _b, d) => {
            const el = d.element;
            setup = {
              pool: Math.max(1, parseInt(el.querySelector('#ivis-pool')?.value) || skill.rating || 1),
              tn:   Math.max(2, (parseInt(el.querySelector('#ivis-tn')?.value) || 5) + (parseInt(el.querySelector('#ivis-deg')?.value) || 0)),
            };
          } },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    if (hook1) Hooks.off('renderDialogV2', hook1);
    if (!setup) return;

    const res = this._resolveRoll(rigger, setup.pool, setup.tn);
    if (res.successes <= 0) {
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: rigger }),
        content: `<div class="sr-roll-card sr-miji-card"><div class="sr-roll-header">📶 IVIS Test Failed</div>
          <div class="sr-staging-result">${skill.name} vs TN ${setup.tn} → 0 successes. No coordination bonus.</div></div>`,
      });
      return;
    }

    // Split successes: Comprehension bonus dice vs IVIS Pool.
    const total = res.successes;
    let hook2 = Hooks.on('renderDialogV2', (_app, html) => {
      const el = html?.querySelector ? html : html?.[0];
      if (!el?.querySelector?.('#ivis-comp')) return;
      Hooks.off('renderDialogV2', hook2);
      const compInp = el.querySelector('#ivis-comp');
      const poolInp = el.querySelector('#ivis-poolalloc');
      const out     = el.querySelector('#ivis-alloc-out');
      const refresh = () => {
        const comp = Math.max(0, parseInt(compInp.value) || 0);
        const pool = Math.max(0, parseInt(poolInp.value) || 0);
        const rem  = total - comp - pool;
        if (out) out.innerHTML = `Spent <strong>${comp + pool}</strong> / ${total} — `
          + (rem < 0 ? `<span style="color:var(--sr-red)">over by ${-rem}</span>` : `<span style="color:var(--sr-muted)">${rem} unspent</span>`);
      };
      compInp.addEventListener('input', refresh);
      poolInp.addEventListener('input', refresh);
      refresh();
    });

    let alloc = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: `IVIS — ${total} successes` },
      content: `
        <div style="display:flex;flex-direction:column;gap:6px;padding:4px 0;font-size:12px">
          <div>Scored <strong>${total}</strong> successes. Split them between the group's Comprehension bonus and the shared IVIS Pool:</div>
          <label>Comprehension bonus dice
            <input type="number" id="ivis-comp" value="0" min="0" max="${total}" style="width:50px;margin-left:6px"/>
          </label>
          <label>IVIS Pool dice
            <input type="number" id="ivis-poolalloc" value="${total}" min="0" max="${total}" style="width:50px;margin-left:6px"/>
          </label>
          <div id="ivis-alloc-out" style="font-size:11px;color:var(--sr-text);margin-top:2px"></div>
        </div>`,
      buttons: [
        { label: 'Confirm', action: 'go', default: true, callback: (_e, _b, d) => {
            const comp = Math.max(0, parseInt(d.element.querySelector('#ivis-comp')?.value) || 0);
            const pool = Math.max(0, parseInt(d.element.querySelector('#ivis-poolalloc')?.value) || 0);
            alloc = { comp, pool };
          } },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    if (hook2) Hooks.off('renderDialogV2', hook2);
    if (!alloc) return;

    // Trim Pool then Comprehension to fit the available successes.
    let over = (alloc.comp + alloc.pool) - total;
    if (over > 0) {
      const trimP = Math.min(alloc.pool, over); alloc.pool -= trimP; over -= trimP;
      if (over > 0) alloc.comp = Math.max(0, alloc.comp - over);
      ui.notifications.warn(`IVIS over-allocated — trimmed to ${total}.`);
    }

    await rigger.update({ 'system.ew.ivisPool.value': alloc.pool, 'system.ew.ivisPool.max': alloc.pool });

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: rigger }),
      content: `<div class="sr-roll-card sr-miji-card"><div class="sr-roll-header">📶 IVIS Test — ${rigger.name}</div>
        <div class="sr-staging-result">${skill.name} vs TN ${setup.tn} → <strong>${total}</strong> success${total !== 1 ? 'es' : ''}.</div>
        <div class="sr-staging-result">→ <strong>+${alloc.comp}</strong> dice to the group's Comprehension Test · <strong>${alloc.pool}</strong> IVIS Pool.</div>
        <div class="sr-staging-result" style="font-size:11px;color:var(--sr-muted)">IVIS Pool is shared by the group, refreshes each Combat Turn, expires on task end. Not for jumped-in drones.</div></div>`,
    });
  }

  /* ------------------------------------------------------------------ */
  /*  ECCM repair / Footprint reduction                                   */
  /* ------------------------------------------------------------------ */

  static async openECCMRepair(targetVehicle, channel) {
    const sm  = targetVehicle?.system?.signalMonitor ?? {};
    const cur = sm[channel] ?? 0;
    if (cur <= 0) { ui.notifications.info(`${channel} channel has no degradation to repair.`); return; }

    const eccm     = targetVehicle.system?.ew?.eccm ?? 0;
    if (eccm <= 0) { ui.notifications.warn('This vehicle has no ECCM rating.'); return; }
    const rigger   = this._riggerOf(targetVehicle);
    const skill    = this._ewSkill(rigger);
    const pool     = Math.max(1, eccm + this._complementary(skill.rating, eccm));

    // TN = attacker's ECM or protocol-emulation module + 3 (use the recorded intruder).
    const inf      = targetVehicle.system?.infiltration ?? {};
    const intruder = inf.intruderActorId ? game.actors.get(inf.intruderActorId) : null;
    const attackerStat = Math.max(
      intruder?.system?.ew?.protocolModule ?? 0,
      // intruder's vehicle ECM, if we can find it
      (this._liveVehicles().find(v => this._riggerOf(v)?.id === intruder?.id)?.system?.ew?.ecm ?? 0),
    );
    const tn = Math.max(2, attackerStat + 3);

    const roller = rigger ?? targetVehicle;
    const res    = this._resolveRoll(roller, pool, tn);
    const removed = Math.min(cur, res.successes);
    const newVal  = Math.max(0, cur - removed);
    await targetVehicle.update({ [`system.signalMonitor.${channel}`]: newVal });

    const chanLabel = this._cfg.channels.find(c => c.key === channel)?.label ?? channel;
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: roller }),
      content: `<div class="sr-roll-card sr-miji-card"><div class="sr-roll-header">🛡 ECCM Repair — ${chanLabel}</div>
        <div class="sr-staging-result">ECCM ${pool} vs TN ${tn} → ${res.successes} hit${res.successes !== 1 ? 's' : ''}; removed <strong>${removed}</strong> box${removed !== 1 ? 'es' : ''}.</div>
        <div class="sr-staging-result">${chanLabel} now ${newVal}/10.</div></div>`,
    });
  }

  static async reduceFootprint(targetVehicle) {
    const ew     = targetVehicle?.system?.ew ?? {};
    const fp      = ew.footprint ?? 0;
    const rigger  = this._riggerOf(targetVehicle);
    const skill   = this._ewSkill(rigger);
    const pool    = Math.max(1, skill.rating);
    const tn      = Math.max(2, fp + 4);
    const roller  = rigger ?? targetVehicle;
    const res     = this._resolveRoll(roller, pool, tn);

    // Each success lowers total Flux by 1 — applied to the vehicle's own Flux field — then recompute.
    const newFlux = Math.max(0, (ew.fluxRating ?? 0) - res.successes);
    const rew     = rigger?.system?.ew ?? {};
    const newFp   = Math.round(((rew.fluxRating ?? 0) + newFlux + (ew.ecm ?? 0)) / 10);
    await targetVehicle.update({ 'system.ew.fluxRating': newFlux, 'system.ew.footprint': newFp });

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: roller }),
      content: `<div class="sr-roll-card sr-miji-card"><div class="sr-roll-header">📉 Reduce Footprint — ${targetVehicle.name}</div>
        <div class="sr-staging-result">Electronics (EW) ${pool} vs TN ${tn} → ${res.successes} success${res.successes !== 1 ? 'es' : ''}; vehicle Flux ${ew.fluxRating ?? 0} → ${newFlux}, Footprint → ${Math.round(newFp)}.</div>
        <div class="sr-staging-result" style="font-size:11px;color:var(--sr-muted)">Each retry raises the TN by +2 (apply manually).</div></div>`,
    });
  }
}
