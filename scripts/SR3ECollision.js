import { Collisions } from './data/collisions.mjs';
import { StallSpeed } from './data/stall-speed.mjs';

/**
 * 💥 Collision — a vehicle hits a person, another vehicle or a barrier · TODO 189.
 *
 * ONE entry point (`open`), reached from the Chase Scene, the vehicle sheet, the Vehicle Tools HUD menu and
 * the 💥 Crash tool. It asks WHAT was hit and HOW:
 *   - **ram** (SR3 p.143): a Ramming Test first — Driving Skill against Handling. Success is the collision.
 *   - **accident**: the driver was trying to stop. A Braking Test first (p.142); the speed left is shown and
 *     the GM judges whether the braking was in time — the book has no stopping-distance rule, so none is
 *     invented. The collision card is then posted at the speed the GM confirms.
 *
 * Rules: `scripts/data/collisions.mjs` (pure, tested). The Impact Damage Levels Table stays in
 * `SR3EActor.crashDamage` and is handed to it. The cards REUSE the Ramming card and its soak buttons
 * (`SR3EActor._buildRamDamageHtml`), the crash card (`_buildCrashDamageHtml`), the ordinary Damage
 * Resistance Test (`.sr-soak-btn`) and the dodge declaration (`.sr-dodge-declare-btn`) — nothing here is a
 * second copy of those.
 *
 * ⚠ Offer, never apply: damage is only ever a button. ⚠ Warn, never refuse.
 */

const KMH = 1.2;   // km/h per metre-per-Combat-Turn (Chase Scene: speed = km/h ÷ 1.2)
const esc  = s => foundry.utils.escapeHTML(String(s ?? ''));
const json = o => JSON.stringify(o).replace(/'/g, '&#39;');
const kmh  = mct => Math.round((Number(mct) || 0) * KMH);
const pct  = (n, m) => `${n}${m ?? ''}`;

export class SR3ECollision {

  /** Who is aboard a vehicle: its driver, then its passengers. */
  static aboardOf(vehicle) {
    const sys    = vehicle?.system ?? {};
    const driver = game.actors.get(String(sys.driverActorId ?? '').trim()) ?? null;
    return [
      ...(driver ? [{ id: driver.id, name: driver.name, role: 'Driver' }] : []),
      ...(sys.passengerActorIds ?? []).map(id => game.actors.get(id)).filter(Boolean)
        .filter(a => a.id !== driver?.id).map(a => ({ id: a.id, name: a.name, role: 'Passenger' })),
    ];
  }

  /** The people a collision can hit — never templates (`isLiveActor`), the scene's tokens first. */
  static people() {
    return game.sr3e.sceneFirst(game.actors
      .filter(a => (a.type === 'character' || a.type === 'npc') && game.sr3e.isLiveActor(a)));
  }

  static vehicles(include = null) {
    const list = game.sr3e.sceneFirst(game.actors.filter(a => a.type === 'vehicle' && game.sr3e.isLiveActor(a)));
    return include && !list.includes(include) ? [include, ...list] : list;
  }

  /* ------------------------------------------------------------------ */
  /*  The context — plain JSON, because it rides inside chat buttons      */
  /* ------------------------------------------------------------------ */

  /**
   * @param {object} c  `{ kind, how, noTest, vehicle, soak, aboard:[{id,role}], speedMct, ... }` — see `open`.
   * @returns {object} the collision context `cc`
   */
  static context(c) {
    const v   = c.vehicle;
    const sys = v.system;
    const cc = {
      kind:  c.kind,                         // 'pedestrian' | 'vehicle' | 'barrier'
      how:   c.how,                          // 'ram' | 'accident'
      noTest: c.noTest === true,             // no Ramming Test happened (accident, or "post it now")
      vehicleActorId: v.id,
      vehicleName:    v.name,
      vehicleBody:    sys.attributes?.body?.base ?? 4,
      accel:          sys.attributes?.accel?.base ?? 0,
      stallSpeed:     StallSpeed.of(sys),   // an aircraft's stall speed, m/turn (0 = none) — SR3 p.132
      soakPool:       c.soak ?? (sys.attributes?.body?.base ?? 4),
      driverActorId:  (c.aboard ?? []).find(a => a.role === 'Driver')?.id ?? '',
      passengerActorIds: (c.aboard ?? []).filter(a => a.role === 'Passenger').map(a => a.id),
      speed:          Math.max(0, Number(c.speedMct) || 0),
    };
    if (c.kind === 'pedestrian') {
      const p = game.actors.get(c.pedestrianId);
      cc.pedestrianActorId = p?.id ?? '';
      cc.pedDodge  = c.pedDodge === true;
      cc.pedBeat   = c.pedBeat == null || c.pedBeat === '' ? null : Math.max(0, Math.trunc(Number(c.pedBeat) || 0));
      cc.pedPower  = Number.isFinite(c.pedPower) && c.pedPower > 0 ? Math.trunc(c.pedPower) : null;
      cc.pedLevel  = ['L', 'M', 'S', 'D'].includes(c.pedLevel) ? c.pedLevel : null;
    } else if (c.kind === 'vehicle') {
      const o = game.actors.get(c.otherId);
      const os = o?.system ?? {};
      cc.otherActorId = o?.id ?? '';
      cc.otherName    = o?.name ?? 'the other vehicle';
      cc.otherBody    = os.attributes?.body?.base ?? 4;
      cc.otherSoak    = c.otherSoak ?? cc.otherBody;
      const oAboard   = o ? SR3ECollision.aboardOf(o) : [];
      cc.otherDriverActorId = oAboard.find(a => a.role === 'Driver')?.id ?? '';
      cc.otherPassengerActorIds = oAboard.filter(a => a.role === 'Passenger').map(a => a.id);
      cc.otherSpeed = Number(c.otherSpeedMct) || 0;   // signed: a head-on is entered as a negative speed
    } else {
      cc.barrierName   = c.barrierName ?? 'Barrier';
      cc.barrierRating = Math.max(0, Math.trunc(Number(c.barrierRating) || 0));
    }
    return cc;
  }

  /* ------------------------------------------------------------------ */
  /*  The cards                                                           */
  /* ------------------------------------------------------------------ */

  /** The card body for a collision, once it is known to have happened (or been posted). */
  static cardHtml(cc, { successes = 0 } = {}) {
    if (cc.how === 'ram' && !cc.noTest && !(successes > 0)) {
      return `<div class="sr-staging-result sr-soak-blocked">💨 No successes — the ram misses (SR3 p.143).</div>`;
    }
    const SA = game.sr3e.SR3EActor;
    const head = cc.noTest && cc.how === 'ram'
      ? `<div class="sr-roll-meta" style="font-size:11px">Posted without a Ramming Test.</div>` : '';
    if (cc.kind === 'pedestrian') return head + SR3ECollision._pedestrianHtml(cc, successes);
    if (cc.kind === 'barrier')    return head + SR3ECollision._barrierHtml(cc);
    // Vehicle against vehicle IS the Ramming card — one copy of it (p.143, p.147).
    return head + SA._buildRamDamageHtml(successes, {
      attackerVehicleActorId: cc.vehicleActorId,
      defenderVehicleActorId: cc.otherActorId || null,
      attackerDriverActorId:  cc.driverActorId,
      defenderDriverActorId:  cc.otherDriverActorId || null,
      attackerVehicleName:    cc.vehicleName,
      defenderVehicleName:    cc.otherName,
      attackerSpeed:          cc.speed,
      defenderSpeed:          cc.otherSpeed ?? 0,
      attackerSoakPool:       cc.soakPool,
      defenderSoakPool:       cc.otherSoak,
      // No Ramming Test, no reduction: p.143's Body × successes is the RAMMER's alone (maintainer, 2026-10-17).
      attackerBody:           cc.noTest ? 0 : cc.vehicleBody,
      attackerPassengerActorIds: cc.passengerActorIds,
      defenderPassengerActorIds: cc.otherPassengerActorIds ?? [],
      accident:               cc.noTest,
    });
  }

  /** A vehicle's Damage Resistance Test button — the Ramming card's own `.sr-ram-vehicle-soak-btn`. */
  static _vehicleSoakButton(cc, power, level, extra = {}) {
    const payload = json({
      vehicleActorId: cc.vehicleActorId, vehicleName: cc.vehicleName, driverActorId: cc.driverActorId,
      soakPool: cc.soakPool, power, level, passengerActorIds: cc.passengerActorIds,
      offerCrash: true, ...extra,
    });
    return `
      <div class="sr-soak-action">
        <button class="sr-ram-vehicle-soak-btn" data-payload='${payload}'>
          🚗 ${esc(cc.vehicleName)}: Soak Damage (${pct(power, level)}, TN ${Math.max(2, power)})
        </button>
      </div>`;
  }

  /** Vehicle-Pedestrian Collision · SR3 p.148. */
  static _pedestrianHtml(cc, successes) {
    const SA   = game.sr3e.SR3EActor;
    const ped  = game.actors.get(cc.pedestrianActorId);
    const r    = Collisions.pedestrian({ speed: cc.speed, table: SA.crashDamage });
    const base = SA.crashDamage(cc.speed);
    const power = cc.pedPower ?? r.pedestrian.power;
    const level = cc.pedLevel ?? r.pedestrian.level;
    const edited = power !== r.pedestrian.power || level !== r.pedestrian.level;
    const pedName = ped?.name ?? 'the pedestrian';

    let html = `
      <div class="sr-staging-result" style="color:#c94040;">
        💥 ${esc(cc.vehicleName)} ${cc.how === 'ram' ? 'rams' : 'hits'} ${esc(pedName)} at ${kmh(cc.speed)} km/h (${cc.speed.toFixed(1)} m per Combat Turn)
      </div>
      <div class="sr-staging-result">
        ${esc(pedName)}: <strong>${pct(power, level)} Physical</strong> — Power = speed ÷ 10; the level is one stage above the
        table's ${base.level}${r.pedestrian.pastDeadly ? ', and past Deadly the Power grows by half, rounded down' : ''} (SR3 p.148)
        ${edited ? `<span style="color:var(--sr-muted);font-size:11px"> — set by the GM; the rule gives ${pct(r.pedestrian.power, r.pedestrian.level)}</span>` : ''}
      </div>
      <div class="sr-staging-result" style="color:var(--sr-muted);font-size:11px">
        After the resistance roll, a <strong>Knockdown Test</strong> (SR3 p.124) is offered: the core Knockdown rule applied to the
        collision's Power — the book gives no Knockdown rule specific to collisions (maintainer's ruling, 2026-10-17).
      </div>`;

    const attackerId = cc.vehicleActorId;
    if (ped) {
      const common = {
        attackerActorId: attackerId, targetActorId: ped.id, isMelee: false,
        stagedPower: power, stagedLevel: level, isStun: false,
        rawDamage: `${cc.vehicleName} ${pct(power, level)}`,
        // p.148: "Impact armor reduces the damage", and Combat Pool dice may be used. The core Knockdown rule
        // (p.124) is offered after the resistance, applied to the collision's Power — the book gives no
        // collision-specific one (maintainer ruling, 2026-10-17). See `Collisions.pedestrianSoakFlags`.
        ...Collisions.pedestrianSoakFlags(),
      };
      if (cc.pedDodge) {
        const beat = Collisions.dodgeToBeat({ how: cc.how, ramSuccesses: successes, override: cc.pedBeat });
        html += `
          <div class="sr-staging-result" style="color:var(--sr-amber)">
            🏠 HOUSE RULE — the book gives a pedestrian no dodge against a vehicle (p.148 offers only the Damage
            Resistance Test). An optional Dodge Test against ${beat} ${cc.how === 'ram' ? (beat === 1 ? 'Ramming Test success' : 'Ramming Test successes') : (beat === 1 ? 'hit' : 'hits')}
            ${cc.how === 'ram' ? '' : '(an accident has no attack roll, so the number is assumed and the GM can change it)'}: more dodge hits than that and ${esc(pedName)} is clear.
            A failed dodge's hits still add to the resistance (p.113). The GM can skip it by leaving the box unticked.
          </div>
          <div class="sr-soak-action">
            <button class="sr-dodge-declare-btn" data-payload='${json({ ...common, attackerName: cc.vehicleName, attackSuccesses: beat })}'>
              🎯 ${esc(pedName)} — ${esc(cc.vehicleName)}, ${pct(power, level)}. Dodge (house rule) or take it?
            </button>
          </div>`;
      } else {
        html += SA._soakButtonHtml(common);
      }
    }

    // The vehicle: the same Power at one stage LOWER — Light (1-20 m/turn) is no damage at all.
    if (r.vehicle.level) {
      html += `
        <div class="sr-staging-result">${esc(cc.vehicleName)}: <strong>${pct(r.vehicle.power, r.vehicle.level)} Physical</strong> — one stage below the table (SR3 p.148); armour does not apply</div>
        ${SR3ECollision._vehicleSoakButton(cc, r.vehicle.power, r.vehicle.level)}`;
    } else {
      html += `<div class="sr-staging-result">${esc(cc.vehicleName)} takes no damage: at this speed the table gives Light, one stage lower is nothing (SR3 p.148).</div>`;
    }
    return html;
  }

  /** Walls and Barriers · SR3 p.148. */
  static _barrierHtml(cc) {
    const SA = game.sr3e.SR3EActor;
    const r  = Collisions.barrier({ speed: cc.speed, rating: cc.barrierRating, table: SA.crashDamage });
    let html = `
      <div class="sr-staging-result" style="color:#c94040;">
        🧱 ${esc(cc.vehicleName)} ${cc.how === 'ram' ? 'rams' : 'hits'} ${esc(cc.barrierName)} (Barrier Rating ${r.rating}) at ${kmh(cc.speed)} km/h (${cc.speed.toFixed(1)} m/turn)
      </div>
      <div class="sr-staging-result">
        Barrier Rating × 20 = <strong>${r.threshold} m/turn</strong>; the vehicle is doing ${cc.speed.toFixed(1)}
        — ${r.breaksThrough ? 'faster, so the barrier collapses' : 'no faster, so it stops'} (SR3 p.148)
      </div>`;

    if (!r.breaksThrough) {
      // "Use the standard crash rules to resolve vehicle and passenger damage in such cases."
      html += SA._buildCrashDamageHtml({
        vehicleActorId: cc.vehicleActorId, vehicleName: cc.vehicleName, driverActorId: cc.driverActorId,
        speedKmct: cc.speed, vehicleBody: cc.soakPool, passengerActorIds: cc.passengerActorIds,
      });
    } else {
      const decel = r.lost;
      const limit = (cc.accel ?? 0) * 4;
      html += `
        <div class="sr-staging-result">
          It carries on through at <strong>${kmh(r.speedAfter)} km/h</strong> (${r.speedAfter.toFixed(1)} m/turn), having lost ${r.lost} m/turn.
          Collision damage: Power = the Barrier Rating, level read off the speed lost →
          <strong>${pct(r.power, r.level)} Physical</strong>. Restrained passengers take nothing; the unrestrained resist it
          one level lower (SR3 p.148).
        </div>
        ${limit > 0 && decel > limit
          ? `<div class="sr-staging-result" style="color:var(--sr-amber)">⚠ It decelerated ${decel} m/turn — more than Acceleration × 4 (${limit}): a Crash Test is called for (SR3 p.142, p.147).</div>`
          : ''}
        ${SR3ECollision._vehicleSoakButton(cc, r.power, r.level, { breakthrough: true })}`;
    }
    // "…the targeted object also takes collision damage" — the Barrier Damage tool's job, offered, not applied.
    html += `
      <div class="sr-soak-action">
        <button class="sr-collision-barrier-btn" data-payload='${json({ rating: r.rating, name: cc.barrierName, power: r.breaksThrough ? r.power : null })}'>
          🧱 Open the Barrier Damage tool for ${esc(cc.barrierName)}
        </button>
      </div>`;
    return html;
  }

  /** A collision card, posted straight to chat (accident confirmed, or "post it now"). */
  static async post(cc, { successes = 0 } = {}) {
    const vehicle = game.actors.get(cc.vehicleActorId);
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: vehicle }),
      content: `<div class="sr-roll-card">
          <div class="sr-roll-header">💥 Collision — ${esc(cc.vehicleName)}</div>
          ${SR3ECollision.cardHtml(cc, { successes })}
        </div>`,
    });
  }

  /* ------------------------------------------------------------------ */
  /*  The Braking Test's follow-up (SR3EActor.FOLLOW_UPS.collisionBraking) */
  /* ------------------------------------------------------------------ */

  /**
   * The Braking Test is rolled — show what the speed is now and let the GM confirm the collision.
   * @param {{cc:object, tn:number}} ctx
   * @param {{successes:number}} res
   */
  static async brakingRolled(ctx, res) {
    const cc = ctx.cc;
    const successes = res?.successes ?? 0;
    const b = Collisions.braking({ speed: cc.speed, acceleration: cc.accel, successes });
    // An aircraft braked below its stall speed (SR3 p.132): the same Crash Test offer, never rolled for anyone.
    const stalled = StallSpeed.below(b.speedAfter, cc.stallSpeed);
    const stallNote = stalled
      ? `<div class="sr-staging-result" style="color:var(--sr-amber)">${esc(StallSpeed.note(cc.vehicleName, b.speedAfter, cc.stallSpeed))}</div>`
        + (b.crashTest ? '' : `<div class="sr-soak-action">
           <button class="sr-crash-open-btn" data-vehicle-id="${cc.vehicleActorId}">💥 ${esc(cc.vehicleName)} — Crash Test</button>
         </div>`)
      : '';
    const crashBtn = stallNote + (b.crashTest
      ? `<div class="sr-staging-result" style="color:var(--sr-amber)">
           ⚠ It decelerated ${b.reduction} m/turn — more than Acceleration × 4 (${cc.accel * 4}). A Crash Test is called for (SR3 p.142, p.147).
         </div>
         <div class="sr-soak-action">
           <button class="sr-crash-open-btn" data-vehicle-id="${cc.vehicleActorId}">💥 ${esc(cc.vehicleName)} — Crash Test</button>
         </div>` : '');
    const other = cc.kind === 'vehicle'
      ? `<label style="font-size:12px">${esc(cc.otherName)} (km/h)
           <input type="number" class="sr-coll-other" value="${kmh(cc.otherSpeed ?? 0)}" style="width:5em"/></label>` : '';
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: game.actors.get(cc.vehicleActorId) }),
      content: `<div class="sr-roll-card sr-collision-card">
        <div class="sr-roll-header">🛑 Braking — ${esc(cc.vehicleName)}</div>
        <div class="sr-staging-result">
          ${successes} success${successes === 1 ? '' : 'es'} against TN ${ctx.tn} →
          ${successes
            ? `speed drops by Acceleration ${cc.accel} × ${successes} = ${b.reduction} m/turn`
            : 'the brakes bite no harder: no change'} (SR3 p.142)
        </div>
        <div class="sr-staging-result">
          <strong>${kmh(cc.speed)} km/h → ${kmh(b.speedAfter)} km/h</strong> (${cc.speed.toFixed(1)} → ${b.speedAfter.toFixed(1)} m/turn)
        </div>
        ${crashBtn}
        <div class="sr-roll-meta" style="font-size:11px">
          The book has no stopping-distance rule, so whether the car stopped in time is the GM's call. Confirm the speed it
          reaches ${cc.kind === 'pedestrian' ? esc(game.actors.get(cc.pedestrianActorId)?.name ?? 'the pedestrian')
            : cc.kind === 'vehicle' ? esc(cc.otherName) : esc(cc.barrierName)} at — or leave this card alone if it stopped short.
        </div>
        <div style="display:flex;gap:10px;align-items:end;margin:4px 0;flex-wrap:wrap">
          <label style="font-size:12px">Speed at impact (km/h)
            <input type="number" class="sr-coll-speed" value="${kmh(b.speedAfter)}" min="0" style="width:5em"/></label>
          ${other}
        </div>
        <div class="sr-soak-action">
          <button class="sr-collision-resolve-btn" data-payload='${json({ ...cc, speed: b.speedAfter })}'>
            💥 Resolve the collision
          </button>
        </div>
      </div>`,
    });
  }

  /** The GM confirmed the speed: post the collision. */
  static async resolveFromCard(btn) {
    const cc   = JSON.parse(btn.dataset.payload);
    const card = btn.closest('.sr-collision-card');
    const v    = parseFloat(card?.querySelector('.sr-coll-speed')?.value);
    if (Number.isFinite(v)) cc.speed = Math.max(0, v) / KMH;
    const o = parseFloat(card?.querySelector('.sr-coll-other')?.value);
    if (cc.kind === 'vehicle' && Number.isFinite(o)) cc.otherSpeed = o / KMH;
    cc.noTest = true;   // the Braking Test was the test; there is no Ramming Test to reduce anything
    await SR3ECollision.post(cc);
  }

  /* ------------------------------------------------------------------ */
  /*  The entry point                                                     */
  /* ------------------------------------------------------------------ */

  /**
   * @param {object} [o]
   * @param {Actor}  [o.vehicle]       the vehicle that collides (asked for when absent)
   * @param {number} [o.speedKmh]      its speed (from a Chase Scene participant, or the 💥 Crash tool)
   * @param {'pedestrian'|'vehicle'|'barrier'} [o.kind]  preselected target kind
   * @param {Object<string,number>} [o.chaseSpeeds]  vehicle id → km/h, for the vehicle dropdown
   */
  static async open({ vehicle = null, speedKmh = null, kind = 'pedestrian', chaseSpeeds = {} } = {}) {
    const vehicles = SR3ECollision.vehicles(vehicle);
    if (!vehicles.length) { ui.notifications.warn('There are no vehicles in the world to collide.'); return; }
    const SR3E    = game.sr3e.SR3E;
    const people  = SR3ECollision.people();
    const start   = vehicle ?? vehicles[0];
    const startKmh = speedKmh ?? chaseSpeeds[start.id] ?? 50;
    const FIELD = 'display:flex;flex-direction:column;gap:3px;color:var(--sr-muted);font-size:12px;';
    const optV = list => list.map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join('');
    const matOpts = SR3E.barrierRatings.map((m, i) => `<option value="${i}">${esc(m.name)} (BR ${m.br})</option>`).join('');
    const kindRadio = (k, label) => `
      <label style="display:flex;align-items:center;gap:4px;cursor:pointer">
        <input type="radio" name="cl-kind" value="${k}"${k === kind ? ' checked' : ''}/> ${label}</label>`;

    const wireDialog = (app, html) => {
      const el = html?.querySelector ? html : null;
      if (!el) return;
      const q = s => el.querySelector(s);
      const SA = game.sr3e.SR3EActor;
      const refreshAboard = () => {
        const v = game.actors.get(q('#cl-vehicle').value);
        const aboard = SR3ECollision.aboardOf(v);
        q('#cl-aboard').innerHTML = aboard.length
          ? aboard.map(a => `<label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">
              <input type="checkbox" class="cl-aboard" data-id="${a.id}" data-role="${a.role}" checked/> ${esc(a.name)}
              <span style="color:var(--sr-muted)">(${a.role})</span></label>`).join('')
          : `<span style="font-size:11px;color:var(--sr-muted)">Nobody aboard — set a pilot and passengers on the vehicle sheet.</span>`;
        q('#cl-soak').value = v?.system?.attributes?.body?.base ?? 4;
        if (chaseSpeeds[v?.id] != null) q('#cl-kmh').value = chaseSpeeds[v.id];
      };
      const refreshKind = () => {
        const k = el.querySelector('input[name="cl-kind"]:checked')?.value;
        for (const s of ['pedestrian', 'vehicle', 'barrier']) q(`#cl-sec-${s}`).style.display = s === k ? '' : 'none';
      };
      const refreshHow = () => {
        const ram = el.querySelector('input[name="cl-how"]:checked')?.value === 'ram';
        q('#cl-how-note').textContent = ram
          ? 'Ramming Test: Driving Skill against Handling, with the Ramming Modifiers Table (SR3 p.143). A success is the collision. The distance must be under the vehicle\'s Acceleration Rating.'
          : 'Accident: a Braking Test first (SR3 p.142) — speed drops by Acceleration × successes — then you confirm the speed it reaches the target at.';
        q('#cl-beat').placeholder = ram ? '= ramming successes' : '1';
        if (!q('#cl-beat').dataset.touched) q('#cl-beat').value = ram ? '' : '1';
      };
      const preview = () => {
        const mct = (parseFloat(q('#cl-kmh').value) || 0) / KMH;
        const k = el.querySelector('input[name="cl-kind"]:checked')?.value;
        let text = '';
        if (k === 'pedestrian') {
          const r = Collisions.pedestrian({ speed: mct, table: SA.crashDamage });
          text = `${Math.round(mct)} m/turn → pedestrian ${r.pedestrian.power}${r.pedestrian.level}`
            + `${r.pedestrian.pastDeadly ? ' (past Deadly: Power +½)' : ''}; vehicle ${r.vehicle.level ? `${r.vehicle.power}${r.vehicle.level}` : 'no damage'} (SR3 p.148)`;
        } else if (k === 'vehicle') {
          const d = Collisions.vehicle({ speedA: mct, speedDiff: Math.abs(mct - (parseFloat(q('#cl-okmh').value) || 0) / KMH), table: SA.crashDamage });
          text = `speed difference ${d.diff.toFixed(1)} m/turn → ${d.power}${d.level} (SR3 p.143, p.147)`;
        } else {
          const r = Collisions.barrier({ speed: mct, rating: parseInt(q('#cl-br').value) || 0, table: SA.crashDamage });
          text = r.breaksThrough
            ? `${mct.toFixed(0)} > ${r.threshold}: breaks through, loses ${r.lost}, collision ${r.power}${r.level} (SR3 p.148)`
            : `${mct.toFixed(0)} ≤ ${r.threshold}: the vehicle stops — a standard crash (SR3 p.148)`;
        }
        q('#cl-preview').textContent = text;
      };
      q('#cl-vehicle').addEventListener('change', () => { refreshAboard(); preview(); });
      el.querySelectorAll('input[name="cl-kind"]').forEach(r => r.addEventListener('change', () => { refreshKind(); preview(); }));
      el.querySelectorAll('input[name="cl-how"]').forEach(r => r.addEventListener('change', refreshHow));
      q('#cl-material').addEventListener('change', () => { q('#cl-br').value = SR3E.barrierRatings[parseInt(q('#cl-material').value)]?.br ?? 0; preview(); });
      q('#cl-beat').addEventListener('input', () => { q('#cl-beat').dataset.touched = '1'; });
      ['#cl-kmh', '#cl-okmh', '#cl-br'].forEach(s => q(s).addEventListener('input', preview));
      refreshAboard(); refreshKind(); refreshHow(); preview();
    };

    const read = (el, mode) => {
      const q = s => el.querySelector(s);
      const matIdx = parseInt(q('#cl-material').value) || 0;
      const num = s => { const v = parseFloat(q(s)?.value); return Number.isFinite(v) ? v : null; };
      return {
        mode,
        vehicleId: q('#cl-vehicle').value,
        kind:      el.querySelector('input[name="cl-kind"]:checked')?.value ?? 'pedestrian',
        how:       el.querySelector('input[name="cl-how"]:checked')?.value ?? 'accident',
        speedKmh:  Math.max(0, num('#cl-kmh') ?? 0),
        soak:      Math.max(0, parseInt(q('#cl-soak').value) || 0),
        aboard:    [...el.querySelectorAll('.cl-aboard:checked')].map(cb => ({ id: cb.dataset.id, role: cb.dataset.role })),
        pedestrianId: q('#cl-ped').value,
        pedDodge:  q('#cl-dodge').checked,
        pedBeat:   q('#cl-beat').value,
        pedPower:  num('#cl-ppower'),
        pedLevel:  q('#cl-plevel').value,
        otherId:   q('#cl-other').value,
        otherKmh:  num('#cl-okmh') ?? 0,
        otherSoak: Math.max(0, parseInt(q('#cl-osoak').value) || 0),
        barrierName:   SR3E.barrierRatings[matIdx]?.name ?? 'Barrier',
        barrierRating: parseInt(q('#cl-br').value) || 0,
      };
    };

    let choice = null;
    await foundry.applications.api.DialogV2.wait({
      window:   { title: '💥 Collision' },
      position: { width: 460 },
      render: (_event, dialog) => wireDialog(dialog, dialog.element),
      content: `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 10px;padding:4px 0;align-items:end">
          <label style="${FIELD}">Vehicle
            <select id="cl-vehicle">${vehicles.map(a => `<option value="${a.id}"${a.id === start.id ? ' selected' : ''}>${esc(a.name)}</option>`).join('')}</select></label>
          <label style="${FIELD}">Its speed (km/h)
            <input id="cl-kmh" type="number" min="0" step="1" value="${Math.round(startKmh)}"/></label>
          <label style="${FIELD}" title="Body dice by default; add Control Pool dice (up to the Vehicle Skill) if a rigger is jacked in (SR3 p.147)">Vehicle soak dice
            <input id="cl-soak" type="number" min="0" max="30" value="${start.system?.attributes?.body?.base ?? 4}"/></label>
          <div style="${FIELD}">How
            <div style="display:flex;gap:12px">
              <label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="cl-how" value="accident" checked/> Accident</label>
              <label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="cl-how" value="ram"/> Ram</label>
            </div></div>
          <div id="cl-how-note" style="grid-column:1/-1;font-size:11px;color:var(--sr-muted)"></div>
        </div>
        <div style="display:flex;gap:14px;margin:6px 0;font-size:12px">
          <span style="color:var(--sr-muted)">What was hit:</span>
          ${kindRadio('pedestrian', '🧍 Character / NPC')}${kindRadio('vehicle', '🚗 Another vehicle')}${kindRadio('barrier', '🧱 A barrier')}
        </div>
        <div id="cl-sec-pedestrian" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px 10px;align-items:end">
          <label style="${FIELD};grid-column:1/-1">Who
            <select id="cl-ped">${people.length ? optV(people) : '<option value="">— no characters —</option>'}</select></label>
          <label style="${FIELD}" title="Leave blank for the rule's figure (SR3 p.148)">Power (blank = rule)
            <input id="cl-ppower" type="number" min="1" max="99" placeholder="auto"/></label>
          <label style="${FIELD}">Level
            <select id="cl-plevel"><option value="">auto</option>${['L', 'M', 'S', 'D'].map(l => `<option value="${l}">${l}</option>`).join('')}</select></label>
          <div></div>
          <label style="grid-column:1/-1;display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px">
            <input id="cl-dodge" type="checkbox" checked/> Offer the pedestrian a dodge
            <span style="color:var(--sr-amber)">(HOUSE RULE — not in the book)</span></label>
          <label style="${FIELD};grid-column:1/-1" title="The dodge must beat this many hits. A ram uses its own Ramming Test successes; an accident has none, so the weakest hit (1) is assumed.">Hits the dodge must beat
            <input id="cl-beat" type="number" min="0" max="30" placeholder="= ramming successes"/></label>
        </div>
        <div id="cl-sec-vehicle" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px 10px;align-items:end">
          <label style="${FIELD};grid-column:1/-1">Which vehicle
            <select id="cl-other">${optV(vehicles.filter(a => a.id !== start.id))}</select></label>
          <label style="${FIELD}" title="A head-on collision: enter its speed as a negative number, so the difference is the sum.">Its speed (km/h)
            <input id="cl-okmh" type="number" step="1" value="0"/></label>
          <label style="${FIELD}">Its soak dice
            <input id="cl-osoak" type="number" min="0" max="30" value="4"/></label>
          <div></div>
        </div>
        <div id="cl-sec-barrier" style="display:grid;grid-template-columns:2fr 1fr;gap:6px 10px;align-items:end">
          <label style="${FIELD}">Material
            <select id="cl-material">${matOpts}</select></label>
          <label style="${FIELD}">Barrier Rating
            <input id="cl-br" type="number" min="0" max="200" value="${SR3E.barrierRatings[0]?.br ?? 2}"/></label>
        </div>
        <div id="cl-preview" style="font-size:11px;color:var(--sr-gold);margin:6px 0"></div>
        <div style="font-size:12px;color:var(--sr-muted);margin-bottom:2px">Aboard — the vehicle's occupants (untick anyone who got out):</div>
        <div id="cl-aboard"></div>`,
      buttons: [
        { label: '🎲 Roll the test (driver)', action: 'roll', default: true,
          callback: (_e, _b, d) => { choice = read(d.element, 'roll'); } },
        { label: '💥 Post the collision now', action: 'post',
          callback: (_e, _b, d) => { choice = read(d.element, 'post'); } },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    if (!choice) return;
    return SR3ECollision.start(choice);
  }

  /** Dialog answers → the test (or the card). */
  static async start(choice) {
    const vehicle = game.actors.get(choice.vehicleId);
    if (!vehicle) { ui.notifications.warn('That vehicle no longer exists.'); return; }
    if (choice.kind === 'pedestrian' && !choice.pedestrianId) { ui.notifications.warn('Pick who was hit.'); return; }
    if (choice.kind === 'vehicle' && !choice.otherId) { ui.notifications.warn('Pick the other vehicle.'); return; }
    const test = choice.mode === 'roll';
    const cc = SR3ECollision.context({
      ...choice, vehicle,
      speedMct:      choice.speedKmh / KMH,
      otherSpeedMct: (choice.otherKmh ?? 0) / KMH,
      noTest:        !(test && choice.how === 'ram'),
    });
    if (!test) return SR3ECollision.post(cc);
    if (!cc.driverActorId && !game.actors.get(String(vehicle.system.driverActorId ?? '').trim())) {
      ui.notifications.warn(`${vehicle.name} has no driver aboard — posting the collision without a test.`);
      return SR3ECollision.post(cc);
    }
    return game.sr3e.SR3EVehicleSheet.runDrivingTest(vehicle, null,
      { collision: { test: choice.how === 'ram' ? 'ram' : 'brake', ctx: cc } });
  }

  /**
   * A collision context for a Chase Scene ram at a pedestrian (the Ramming dialog's pedestrian target).
   * @returns {object} `cc`, ready for `rammingContext.collision`
   */
  static rammerAtPedestrian({ vehicle, driverId, passengerIds = [], speedMct, soakPool, pedestrianId, pedDodge = true }) {
    const aboard = [
      ...(driverId ? [{ id: driverId, role: 'Driver' }] : []),
      ...passengerIds.filter(id => id !== driverId).map(id => ({ id, role: 'Passenger' })),
    ];
    return SR3ECollision.context({ kind: 'pedestrian', how: 'ram', noTest: false, vehicle, soak: soakPool,
      aboard, speedMct, pedestrianId, pedDodge });
  }
}
