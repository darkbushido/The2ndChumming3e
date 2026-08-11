/**
 * SR3ECombat - Custom Combat with SR2/SR3 initiative modes
 */
export class SR3ECombat extends Combat {

  /**
   * Roll initiative for all combatants
   * @override
   */
  async rollInitiative(ids, options = {}) {
    const combatants = ids?.length ? ids.map(id => this.combatants.get(id)) : this.combatants.contents;

    // Clear Spell Defense from the previous round — Sorcery dice return, Spell Pool stays spent
    for (const c of combatants) {
      if (c.actor) await c.actor.clearSpellDefense();
    }

    // Vehicles in VCR/RCD mode copy their rigger's initiative instead of rolling independently.
    // Pre-compute which vehicle combatants will sync so we can skip them in the roll loop.
    const vehiclesToSync = new Set();
    for (const vc of this.combatants.contents) {
      if (vc.actor?.type !== 'vehicle') continue;
      const mode = vc.actor.system.controlMode ?? '';
      if (mode !== 'vcr' && mode !== 'rcd') continue;
      const driverId = vc.actor.system.driverActorId?.trim() ?? '';
      if (!driverId) continue;
      if (this.combatants.find(rc => rc.actor?.id === driverId)) vehiclesToSync.add(vc.id);
    }

    for (const c of combatants) {
      if (!c.actor) continue;
      if (vehiclesToSync.has(c.id)) continue; // initiative will be copied from rigger below

      // Roll initiative using actor's method
      const score = await c.actor.rollInitiative();

      // Store base initiative and calculate passes
      await c.update({
        initiative: score,
        flags: {
          The2ndChumming3e: {
            baseInitiative: score,
            currentInitiative: score,
            passesRemaining: Math.ceil(score / 10)
          }
        }
      });
    }

    // Sync VCR/RCD vehicle initiatives to their rigger's score.
    for (const vcId of vehiclesToSync) {
      const vc = this.combatants.get(vcId);
      if (!vc?.actor) continue;
      const mode = vc.actor.system.controlMode ?? '';
      const driverId = vc.actor.system.driverActorId?.trim() ?? '';
      const riggerC = this.combatants.find(rc => rc.actor?.id === driverId);
      if (!riggerC || riggerC.initiative == null) {
        ui.notifications.info(
          `${vc.actor.name} is in ${mode.toUpperCase()} mode — roll ${riggerC?.actor?.name ?? 'the pilot'}'s initiative first.`
        );
        continue;
      }

      const score = riggerC.initiative;
      const modeColor = mode === 'vcr' ? 'var(--sr-accent)' : 'var(--sr-green)';
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: vc.actor }),
        content: `
          <div class="sr-roll-card">
            <div class="sr-roll-header">⚡ Initiative — ${vc.actor.name}
              <span style="font-size:11px;font-weight:normal;color:${modeColor}"> ${mode.toUpperCase()}: ${riggerC.actor?.name}</span>
            </div>
            <div class="sr-roll-meta">Initiative derived from ${riggerC.actor?.name}</div>
            <div class="sr-roll-result">Score: <strong>${score}</strong></div>
          </div>`,
        style: CONST.CHAT_MESSAGE_STYLES.ROLL,
      });
      await vc.update({
        initiative: score,
        flags: {
          The2ndChumming3e: {
            baseInitiative:    score,
            currentInitiative: score,
            passesRemaining:   Math.ceil(score / 10),
          }
        }
      });
    }

    // VCR: stamp the jumped-in rigger combatant with which drone they're controlling
    // (used for the VCR badge in the combat tracker sidebar).
    for (const vc of this.combatants.contents) {
      if (vc.actor?.type !== 'vehicle') continue;
      if (vc.actor.system.controlMode !== 'vcr') continue;
      const driverActId = vc.actor.system.driverActorId?.trim();
      if (!driverActId) continue;
      const pilotActor = game.actors.get(driverActId);
      const riggerCombatant = pilotActor && this.combatants.find(rc => rc.actor?.id === pilotActor.id);
      if (riggerCombatant) {
        await riggerCombatant.update({
          flags: { The2ndChumming3e: { jumpedInto: vc.actor.name } },
        });
      }
    }

    // Rebuild the action queue against the new scores and point the tracker back at its
    // head. Previously only the SR2 queue was invalidated and the SR3 pass state was left
    // alone, so a mid-combat re-roll updated the numbers while the turn pointer stayed on
    // the previously-active combatant — every combatant ordered above them was then skipped
    // for the rest of that round.
    const queue = await this.rebuildQueue({ resetIndex: true });
    if (this.started && queue.length) await this._applySlot(queue, 0);

    // Prompt Spell Defense declaration for Sorcery-capable actors
    await game.sr3e.SR3EActor.promptSpellDefenseDeclaration(combatants);

    return this;
  }

  /**
   * Start the combat encounter
   * @override
   */
  async startCombat() {
    await super.startCombat();
    // Round 1 is a Combat Turn like any other, and RAW p.104 makes "All Dice Pools
    // Refresh" step 1 of the Combat Turn Sequence. Without this the first turn inherited
    // whatever pool state was lying around, and endCombat()'s refresh prompt was the only
    // thing keeping the NEXT fight clean — so declining that prompt, or closing a tracker
    // without it, quietly started the following fight on depleted pools.
    //
    // The Begin Encounter flow refreshes earlier still, before rolling initiative, so the
    // Spell Defense card is built against full pools. This call covers every other entry
    // point; it is dirty-checked, so arriving here already clean writes nothing.
    await this._endOfTurnReset();
    await this.rebuildQueue({ resetIndex: true });
    return this;
  }

  /**
   * Build this round's action queue from combatant `initiative` values.
   *
   * One slot per action a combatant gets: initiative, initiative-10, -20 … while > 0.
   * Both initiative modes use the SAME slot list and differ only in how it is sorted:
   *
   *   SR3 — pass-grouped.  Everyone acts once at pass 1 (highest first), then everyone
   *         still above 0 acts at pass 2, and so on.
   *   SR2 — interleaved.   All slots merged and walked strictly by descending score.
   *
   * `initiative` (the Combatant document field) is the SINGLE SOURCE OF TRUTH for order.
   * It used to be mirrored into a `currentInitiative` flag that the pass logic read
   * instead, which meant a GM editing initiative in the tracker changed the displayed
   * number and nothing else. Those flags are still written, but only as a display echo
   * (see _applySlot) — nothing reads them to decide order.
   *
   * Ties on score are broken by the `tieBreak` rank resolved in assignTieBreaks() —
   * Reaction first, then a dice-off. Combatant id is the final fallback purely so the
   * comparator is always a total order; it should never actually decide anything.
   *
   * Without any tie-break at all, JS's stable sort left tied combatants in
   * `combatants.contents` (insertion) order while Foundry's `turns` held them in id
   * order — the two disagreed, and a tied combatant got skipped entirely.
   *
   * @returns {Array<{id: string, score: number, pass: number}>}
   */
  buildRoundQueue() {
    const mode  = game.settings.get('The2ndChumming3e', 'initiativeMode');
    const slots = [];
    const rank  = new Map();

    for (const c of this.combatants.contents) {
      const base = Number(c.initiative);
      if (!Number.isFinite(base) || base <= 0) continue;
      rank.set(c.id, c.flags?.The2ndChumming3e?.tieBreak ?? 0);
      let pass = 1;
      for (let score = base; score > 0; score -= 10, pass++) slots.push({ id: c.id, score, pass });
    }

    const tie = (a, b) => (rank.get(a.id) - rank.get(b.id)) || (a.id > b.id ? 1 : -1);
    slots.sort(mode === 'sr3'
      // pass first: everyone acts once before anyone acts twice
      ? (a, b) => (a.pass - b.pass) || (b.score - a.score) || tie(a, b)
      // strict descending score: a fast combatant may act twice before a slow one acts once
      : (a, b) => (b.score - a.score) || tie(a, b));

    return slots;
  }

  /**
   * Resolve the order of combatants who tied on initiative, and store it as a `tieBreak`
   * rank flag (lower acts first).
   *
   * SR3: highest Reaction goes first; on equal Reaction the tied combatants roll off, and
   * anyone still level re-rolls until separated.
   *
   * The dice CANNOT be rolled inside the sort comparator. Array.prototype.sort requires a
   * consistent total order, and a comparator that returns a fresh random answer each time
   * it is asked about the same pair produces a garbage ordering. So the ranks are resolved
   * once here and the comparator just reads them.
   *
   * Combatants tied on base initiative stay tied at every pass — they decrement in step —
   * so one rank per combatant covers the whole round.
   * @private
   */
  async _assignTieBreaks() {
    const byScore = new Map();
    for (const c of this.combatants.contents) {
      const init = Number(c.initiative);
      if (!Number.isFinite(init) || init <= 0) continue;
      if (!byScore.has(init)) byScore.set(init, []);
      byScore.get(init).push(c);
    }

    const notes   = [];
    const updates = [];
    for (const [score, group] of byScore) {
      if (group.length === 1) {
        updates.push({ _id: group[0].id, flags: { The2ndChumming3e: { tieBreak: 0 } } });
        continue;
      }
      // Reaction descending, then dice-off within each equal-Reaction run.
      const withRea = group.map(c => ({ c, rea: c.actor?.system?.attributes?.reaction?.value ?? 0 }));
      withRea.sort((a, b) => b.rea - a.rea);

      const ordered = [];
      for (let i = 0; i < withRea.length;) {
        let j = i + 1;
        while (j < withRea.length && withRea[j].rea === withRea[i].rea) j++;
        const run = withRea.slice(i, j).map(x => x.c);
        ordered.push(...(run.length > 1 ? await this._diceOff(run, score, notes) : run));
        i = j;
      }
      ordered.forEach((c, idx) => updates.push({ _id: c.id, flags: { The2ndChumming3e: { tieBreak: idx } } }));
    }

    if (updates.length) await this.updateEmbeddedDocuments('Combatant', updates);
    if (notes.length) {
      await ChatMessage.create({
        content: `<div class="sr-roll-card">
            <div class="sr-roll-header">⚡ Initiative Tie-Break</div>
            ${notes.map(n => `<div class="sr-roll-meta">${n}</div>`).join('')}
          </div>`,
      });
    }
  }

  /**
   * Roll off between combatants tied on both initiative AND Reaction. Anyone still level
   * after a roll re-rolls among themselves, per "repeat until one is higher".
   *
   * Bounded at 20 rounds of re-rolling. The probability of getting that far is negligible,
   * but an unbounded loop here would hang the client rather than merely order two goons
   * arbitrarily.
   * @private
   */
  async _diceOff(members, score, notes, depth = 0) {
    const rolled = [];
    for (const c of members) {
      const roll = await new Roll('1d6').evaluate();
      rolled.push({ c, v: roll.total });
    }
    notes.push(`Initiative ${score} — ${rolled.map(r => `${r.c.name} rolled ${r.v}`).join(', ')}`);
    rolled.sort((a, b) => b.v - a.v);

    const out = [];
    for (let i = 0; i < rolled.length;) {
      let j = i + 1;
      while (j < rolled.length && rolled[j].v === rolled[i].v) j++;
      const run = rolled.slice(i, j).map(x => x.c);
      if (run.length > 1 && depth < 20) out.push(...await this._diceOff(run, score, notes, depth + 1));
      else out.push(...run);
      i = j;
    }
    return out;
  }

  /**
   * Rebuild the stored queue from current initiative values.
   *
   * Called on start, after any initiative roll, and whenever a GM edits an initiative
   * value in the tracker. Without `resetIndex` it tries to hold position: the pointer is
   * clamped into the new queue so an edit mid-round does not restart the round.
   */
  async rebuildQueue({ resetIndex = false } = {}) {
    await this._assignTieBreaks();
    const queue = this.buildRoundQueue();
    const prev  = resetIndex ? 0 : (this.flags?.The2ndChumming3e?.queueIndex ?? 0);
    const index = Math.min(Math.max(0, prev), queue.length);
    await this.update({ flags: { The2ndChumming3e: { queue, queueIndex: index, sr2Queue: null, sr2QueueIndex: 0 } } });
    return queue;
  }

  /**
   * Advance to next turn/combatant
   * @override
   */
  async nextTurn() {
    let queue = this.flags?.The2ndChumming3e?.queue ?? null;
    if (!queue?.length) queue = await this.rebuildQueue({ resetIndex: true });
    if (!queue.length) return this._newRound();   // nobody has initiative yet

    const index = this.flags?.The2ndChumming3e?.queueIndex ?? 0;
    const next  = index + 1;

    // Queue exhausted — the combat round is over.
    if (next >= queue.length) return this._newRound();

    // A new pass means a new combat phase: recoil resets.
    if (queue[next].pass !== queue[index]?.pass) {
      for (const c of this.combatants.contents) await c.actor?.resetRecoil?.();
    }

    await this._applySlot(queue, next);
    return this;
  }

  /**
   * Point the tracker at queue[index] and echo that slot onto the combatant for display.
   *
   * The position in the round is the stored index — it is NOT re-derived by searching the
   * queue for whoever is currently active. That search was the original defect: it assumed
   * queue order and `turns` order agreed, and when they did not (ties, or a mid-round
   * re-roll) the current combatant was found at the wrong offset and the rest of the pass
   * was silently dropped.
   * @private
   */
  async _applySlot(queue, index) {
    const slot      = queue[index];
    const turnIndex = this.turns.findIndex(t => t.id === slot.id);

    // Display-only echo. Nothing reads these to decide order.
    const c = this.combatants.get(slot.id);
    if (c) {
      await c.update({ flags: { The2ndChumming3e: {
        currentInitiative: slot.score,
        passNumber:        slot.pass,
        passesRemaining:   queue.slice(index).filter(s => s.id === slot.id).length,
      } } });
    }

    await this.update({ turn: Math.max(0, turnIndex), flags: { The2ndChumming3e: { queueIndex: index } } });
    if (ui.combat) ui.combat.render();
  }

  /**
   * End of round. SR3 RAW: initiative is re-rolled every combat round, so roll for
   * everyone, rebuild the queue and carry straight on into the next round.
   *
   * This used to call endCombat(), which forced the GM to create a brand new encounter
   * for every round of a fight. endCombat is now reached only from the tracker's own
   * End Combat control.
   * @private
   */
  /**
   * Everything that refreshes at a Combat Turn boundary.
   *
   * ONE place for per-turn state, deliberately. All of this used to be reset only in
   * endCombat(), which was correct purely by accident: every completed round used to call
   * endCombat, so the resets happened once per round for the wrong reason. Making rounds
   * continue removed that, and each item then had to be rediscovered as its own bug —
   * recoil first, then the pools, then Full Defense. Anything else that should expire per
   * turn belongs here, not in a fourth scattered place.
   *
   * Called from BOTH ends of a turn boundary: `_newRound()` for rounds 2+, and
   * `startCombat()` for round 1 (RAW p.104 makes "All Dice Pools Refresh" step 1 of the
   * Combat Turn Sequence, and round 1 is a Combat Turn like any other). The Begin
   * Encounter flow calls it a third time, ahead of rolling initiative — see sr3e.js.
   *
   * Every write is dirty-checked, so those overlapping calls cost nothing. That matters
   * beyond tidiness: each helper writes unconditionally and every write fires the
   * `updateActor` hook, which drives status icons and the auto-defeated logic. Firing it
   * several times per combatant per round for values that never changed is pure churn.
   *
   * NOT here: clearSpellDefense, which rollInitiative already does for every combatant on
   * its way through — doing it twice would be harmless but misleading.
   *
   * Silent by design. The pool refresh in endCombat sits behind a GM prompt because ending
   * a fight is a decision; a turn rolling over is not, and the rules make the refresh
   * unconditional, so a confirmation every round would be pure noise.
   * @private
   */
  async _endOfTurnReset() {
    for (const c of this.combatants.contents) {
      const actor = c.actor;
      if (!actor) continue;
      const sys = actor.system ?? {};
      // New combat phase — the rounds-fired counter that drives recoil starts over.
      if (sys.roundsFiredThisPhase) await actor.resetRecoil?.();
      // Pools refresh at the start of each Combat Turn.
      if (sys.combatPoolSpent)      await actor.refreshCombatPool?.();
      if (sys.spellPoolSpent)       await actor.refreshSpellPool?.();
      if (sys.astralPoolSpent)      await actor.refreshAstralPool?.();
      if (sys.hackingPoolSpent)     await actor.refreshHackingPool?.();
      // Full Defense is a declared posture for the turn, not a standing state. The
      // updateActor hook in sr3e.js drives the status icon off this field, so clearing it
      // clears the icon too.
      if (sys.fullDefense) {
        await actor.update({ 'system.fullDefense': false, 'system.fullDefensePool': 0 });
      }
    }
  }

  async _newRound() {
    await this.nextRound();                       // increments round, resets turn
    await this._endOfTurnReset();
    await this.rollInitiative();                  // RAW: re-roll every round
    const queue = await this.rebuildQueue({ resetIndex: true });
    if (!queue.length) {
      ui.notifications.warn('New round: nobody has an initiative score above 0.');
      return this;
    }
    await this._applySlot(queue, 0);
    ui.notifications.info(`Round ${this.round} — initiative re-rolled.`);
    return this;
  }

  /**
   * Override endCombat to offer a combat pool refresh before closing.
   * @override
   */
  async endCombat() {
    // Ask GM if combat pools should be refreshed
    let refresh = false;
    await foundry.applications.api.DialogV2.wait({
      window: { title: 'Combat Ended' },
      content: `
        <p>Combat is over.</p>
        <p>Refresh all combat pools?</p>
      `,
      buttons: [
        {
          label: 'Refresh Pools',
          action: 'yes',
          default: true,
          callback: () => { refresh = true; }
        },
        {
          label: 'No',
          action: 'no',
        },
      ],
    });

    if (refresh) {
      const actors = this.combatants.contents
        .map(c => c.actor)
        .filter(Boolean);
      for (const actor of actors) {
        await actor.refreshCombatPool();
        await actor.refreshSpellPool();
        await actor.refreshAstralPool?.();
        await actor.refreshHackingPool();
        await actor.clearSpellDefense();
        await actor.resetRecoil?.();
        await actor.unsetFlag('The2ndChumming3e', 'tempMagicLoss').catch(() => {});
        if (actor.system?.fullDefense) {
          await actor.update({ 'system.fullDefense': false, 'system.fullDefensePool': 0 });
        }
      }
      ui.notifications.info('Combat pools refreshed.');
    }

    return super.endCombat();
  }
}