/**
 * GM-authoritative RPC for SR3E, built on Foundry v14 core user queries.
 *
 * THERE IS NO CUSTOM SOCKET, AND YOU SHOULD NOT ADD ONE. Core's `User#query`
 * (`client/documents/user.mjs:289`) already provides correlation ids
 * (`foundry.utils.randomID()` at :308), server-routed point-to-point delivery
 * rather than a broadcast every client must filter, a native `timeout`,
 * immediate rejection when the recipient is not active (:306), and error
 * propagation across the wire (`users.mjs:228-234` wraps the handler and returns
 * `{status:'fulfilled'|'rejected'}`, which the caller rethrows).
 *
 * `QUERY_USER` defaults to `USER_ROLES.PLAYER` (`common/constants.mjs:1409`), so
 * a player may query the GM with no permission work — but it IS revocable by the
 * GM in permission config, hence the `hasPermission` check in `asGM`.
 *
 * ── Why intents, not changes-objects ──────────────────────────────────────────
 * Relaying `{'system.combatPoolSpent': 3}` would be a silent correctness bug.
 * Two clients each read `combatPoolSpent: 0`, each compute `0 + 3`, and each send
 * the absolute `3`. Six dice were declared; three are charged. Serialising the
 * writes cannot help — the stale read already happened on the sender.
 *
 * So accumulating operations relay INTENT (`{pool:'combat', n:3}`) and the GM
 * re-enters the local helper, reading live data inside a per-document queue.
 * `sr3e.actor.set` is reserved for genuinely idempotent absolute writes and
 * REFUSES accumulator keys loudly rather than corrupting them quietly.
 *
 * Handlers are registered on EVERY client at init — a non-GM client must be able
 * to answer a relayed decision in later stages. Whether a handler may WRITE is
 * decided inside the handler by `assertActiveGM()`, never by registration.
 */

/** Tagged so callers can distinguish "no GM connected" from a handler failure. */
export class SR3EGMUnavailable extends Error {
  constructor(message = 'No GM is connected — combat state cannot be updated.') {
    super(message);
    this.name = 'SR3EGMUnavailable';
  }
}

/**
 * Keys that ACCUMULATE and must never be relayed as absolutes through
 * `sr3e.actor.set`. Each needs an intent verb instead. Kept as an explicit list
 * so adding a persisted counter and forgetting to route it fails loudly on the
 * first multiplayer write rather than silently losing dice.
 */
const SR3E_ACCUMULATORS = new Set([
  'system.combatPoolSpent',
  'system.spellPoolSpent',
  'system.astralPoolSpent',
  'system.hackingPoolSpent',
  'system.spellDefensePool',
  'system.woundValue',
  'system.damage',
  'system.damage.value',
]);

/** `system.wounds.<track>.value` is an accumulator too, but the track varies. */
const SR3E_ACCUMULATOR_RE = /^system\.wounds\.[^.]+\.value$/;

/* -------------------------------------------------------------------------- */

/** Per-document write serialisation. Module-scoped, matching the `_usedButtons` pattern in sr3e.js. */
const _chains = new Map();

export class SR3EQueue {
  /**
   * Serialise work per document key.
   *
   * CRITICAL: the READ must happen INSIDE `fn`, not be captured before the call.
   * Queueing a pre-computed value preserves ordering while doing nothing about
   * staleness, which is the bug this exists to prevent.
   *
   * @param {string} key  document uuid
   * @param {() => Promise<any>} fn
   * @returns {Promise<any>}
   */
  static run(key, fn) {
    const prev   = _chains.get(key) ?? Promise.resolve();
    // Run regardless of whether the predecessor resolved or rejected — one
    // failed write must not wedge every later write to the same document.
    const result = prev.then(fn, fn);
    const tail   = result.catch(() => {});
    _chains.set(key, tail);
    tail.then(() => { if (_chains.get(key) === tail) _chains.delete(key); });
    return result;
  }
}

/* -------------------------------------------------------------------------- */

/** Receiver-side dedupe: request id → in-flight promise. Bounded, FIFO-trimmed. */
const _seen = new Map();
const _SEEN_MAX = 200;

/**
 * exchangeId → open DialogV2, so a decision that has been resolved elsewhere can
 * actively close the now-pointless dialog instead of leaving it stacked. Three
 * exchanges in a round would otherwise leave three stale modals on the defender,
 * who then answers the wrong one.
 */
const _openDialogs = new Map();

/**
 * GM-side negotiations awaiting their commit. requestId → {defUuid, fd, requested,
 * userId, at, result}. Reaped after 10 minutes, and immediately when the
 * requesting user goes inactive, so a GM adjudicating into the void after the
 * attacker refreshed or timed out never writes.
 */
const _pending = new Map();
const _PENDING_TTL_MS = 10 * 60 * 1000;

function _reapPending() {
  const now = Date.now();
  for (const [id, e] of _pending) {
    const gone = !game.users.get(e.userId)?.active;
    if (gone || now - e.at > _PENDING_TTL_MS) _pending.delete(id);
  }
}

/** Drop pending negotiations for a user who just disconnected. */
export function sr3eReapPendingFor(userId) {
  for (const [id, e] of _pending) if (e.userId === userId) _pending.delete(id);
}

export class SR3EQuery {

  /* ---------------------------------------------------------------- */
  /*  Helpers                                                           */
  /* ---------------------------------------------------------------- */

  /**
   * Throw unless this client is the elected GM.
   *
   * Re-checked on ARRIVAL, not just before sending: the election can change
   * between the sender's emit and our receipt, and a client that has just lost
   * the election must not perform the write.
   */
  static assertActiveGM() {
    if (!game.users.activeGM?.isSelf) {
      throw new SR3EGMUnavailable('SR3E | write refused: this client is not the active GM.');
    }
  }

  /**
   * Resolve a document from a uuid, tolerating a bare actor id so existing
   * chat-card payloads (which carry `actorId`) keep working unchanged.
   * @param {string} ref
   * @returns {Document|null}
   */
  static resolve(ref) {
    if (!ref || typeof ref !== 'string') return null;
    const byId = game.actors?.get(ref);
    if (byId) return byId;
    try { return fromUuidSync(ref) ?? null; } catch { return null; }
  }

  /**
   * The single user who decides for this actor.
   * Assigned character → EXPLICIT connected owner → active GM → null.
   *
   * Two things here are deliberate and must not be "simplified":
   *
   * 1. `ownership[u.id] === OWNER`, **not** `testUserPermission(u, 'OWNER')`.
   *    `testUserPermission` resolves `ownership[user.id] ?? ownership.default`
   *    (`common/abstract/document.mjs:390`), so in a world whose Actors directory
   *    default ownership is Owner — a common setup — it is true for EVERY player,
   *    and a random player would be handed the dodge dialog for a goon they have
   *    never seen. Requiring an explicit entry stops `default` sweeping the table in.
   *
   * 2. `getDesignatedUser`, **not** `find`. Core's documented, deterministic,
   *    role-ranked selector (`users.mjs:87`; `activeGM` is built on it). `find`
   *    order is arbitrary when two players co-own a drone.
   *
   * `u.active` excludes offline owners, so a disconnected player's PC falls to the
   * GM automatically — the standing ruling, for free.
   *
   * @param {Actor} actor
   * @returns {string|null} userId, or null when no GM is connected either
   */
  static deciderFor(actor) {
    if (!actor) return game.users.activeGM?.id ?? null;
    const assigned = game.users.find(u => u.active && !u.isGM && u.character?.id === actor.id);
    if (assigned) return assigned.id;
    const OWNER = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
    const explicit = game.users.getDesignatedUser(
      u => u.active && !u.isGM && actor.ownership?.[u.id] === OWNER);
    return explicit?.id ?? game.users.activeGM?.id ?? null;
  }

  /**
   * Ask a SPECIFIC user to make a decision, with a conservative fallback.
   *
   * Reaper rule (see plan §1.5): on timeout or an unreachable decider, **fill the
   * missing slot with `opts.fallback` and resolve — never cancel.** Under a relay,
   * letting a defender's cancelled dialog abort the attack would let any defender
   * kill an attacker's turn with one click, and an AFK defender would do it by
   * doing nothing.
   *
   * @param {string|null} userId
   * @param {string} verb
   * @param {object} data
   * @param {object} [opts]
   * @param {number} [opts.timeout=300000]  Matches the GM window in Stage 3 — unequal
   *   deadlines silently discard the slower participant's answer.
   * @param {*} [opts.fallback]
   */
  static async ask(userId, verb, data, opts = {}) {
    const timeout  = opts.timeout ?? 300_000;
    const fallback = opts.fallback;
    const user     = userId ? game.users.get(userId) : null;
    if (!user?.active) return fallback;

    const payload = { rid: foundry.utils.randomID(), ...data };
    try {
      if (user.isSelf) {
        const handler = CONFIG.queries[verb];
        if (!handler) throw new Error(`SR3E | no handler registered for '${verb}'`);
        return await handler(payload, { user: game.user, timeout });
      }
      return await user.query(verb, payload, { timeout });
    } catch (err) {
      console.warn(`SR3E | '${verb}' to ${user.name} failed or timed out — using the safe default.`, err);
      return fallback;
    }
  }

  /** Tell a client to close a decision dialog it no longer needs to answer. */
  static async withdraw(userId, exchangeId, reason) {
    const user = userId ? game.users.get(userId) : null;
    if (!user?.active) return;
    try {
      if (user.isSelf) return CONFIG.queries['sr3e.dialog.withdraw']({ exchangeId, reason }, { user: game.user });
      await user.query('sr3e.dialog.withdraw', { exchangeId, reason }, { timeout: 5000 });
    } catch { /* the dialog is already gone, or the user left — nothing to do */ }
  }

  /**
   * Return the same promise for a repeated request id rather than running the
   * handler twice. Belt-and-braces — core's query layer is server-acked and
   * should not redeliver — but a duplicated write here costs real dice.
   * @param {string|undefined} key
   * @param {() => Promise<any>} fn
   */
  static once(key, fn) {
    if (!key) return fn();
    if (_seen.has(key)) return _seen.get(key);
    const p = fn();
    _seen.set(key, p);
    if (_seen.size > _SEEN_MAX) _seen.delete(_seen.keys().next().value);
    return p;
  }

  /**
   * Send an intent to the elected GM, or run it locally when we ARE the GM.
   *
   * The local short-circuit matters: a solo or GM-only world does zero round
   * trips and behaves exactly as it did before this layer existed.
   *
   * @param {string} verb   e.g. 'sr3e.pool.spend'
   * @param {object} data
   * @param {object} [opts]
   * @param {number} [opts.timeout=10000]
   * @returns {Promise<any>}
   * @throws {SR3EGMUnavailable} when no GM is connected
   */
  static async asGM(verb, data, opts = {}) {
    const timeout = opts.timeout ?? 10000;
    // `_requesterId` lets a GM-side handler tell who asked, which the gmApprovesTN
    // 'player' mode needs — `user` in the handler context is the sender, but the
    // local short-circuit below bypasses that path entirely.
    const payload = { rid: foundry.utils.randomID(), _requesterId: game.user.id, ...data };

    // Two attempts: the GM election can change between reading activeGM and the
    // query landing, which core surfaces as a "not active"/"disconnected" reject.
    for (let attempt = 0; attempt < 2; attempt++) {
      const gm = game.users.activeGM;
      if (!gm) throw new SR3EGMUnavailable();

      if (gm.isSelf) {
        const handler = CONFIG.queries[verb];
        if (!handler) throw new Error(`SR3E | no handler registered for '${verb}'`);
        return handler(payload, { user: game.user, timeout });
      }

      if (!game.user.hasPermission('QUERY_USER')) {
        throw new SR3EGMUnavailable(
          'SR3E | your user lacks the "Query User" permission, so combat updates cannot reach the GM. Ask the GM to enable it.'
        );
      }

      try {
        return await gm.query(verb, payload, { timeout });
      } catch (err) {
        const msg = String(err?.message ?? err);
        if (attempt === 0 && /not active|disconnect/i.test(msg)) continue;  // re-elect and retry
        throw err;
      }
    }
    throw new SR3EGMUnavailable();
  }

  /* ---------------------------------------------------------------- */
  /*  Handler registration                                              */
  /* ---------------------------------------------------------------- */

  /**
   * Register every `CONFIG.queries` handler.
   * MUST be called from `Hooks.once('init')` — if it slips to `ready`, a fast
   * click during world load reaches a verb nobody is listening for.
   */
  static register() {

    /** Spend from a pool. Relays INTENT; the GM clamps against live data. */
    CONFIG.queries['sr3e.pool.spend'] = async ({ rid, uuid, pool, n }) => SR3EQuery.once(rid, async () => {
      SR3EQuery.assertActiveGM();
      const actor = SR3EQuery.resolve(uuid);
      if (!actor) throw new Error(`SR3E | pool.spend: unknown actor '${uuid}'`);
      const fn = {
        combat:       'spendCombatPool',
        spell:        'spendSpellPool',
        astral:       'spendAstralPool',
        hacking:      'spendHackingPool',
        spellDefense: 'useSpellDefenseDice',
      }[pool];
      if (!fn) throw new Error(`SR3E | pool.spend: unknown pool '${pool}'`);
      // Re-enters the helper, which takes its local branch here and reads live.
      return { spent: await actor[fn](n) };
    });

    /** Reset a pool to zero. Idempotent, but routed for consistency. */
    CONFIG.queries['sr3e.pool.refresh'] = async ({ rid, uuid, pool }) => SR3EQuery.once(rid, async () => {
      SR3EQuery.assertActiveGM();
      const actor = SR3EQuery.resolve(uuid);
      if (!actor) throw new Error(`SR3E | pool.refresh: unknown actor '${uuid}'`);
      const fn = {
        combat:  'refreshCombatPool',
        spell:   'refreshSpellPool',
        astral:  'refreshAstralPool',
        hacking: 'refreshHackingPool',
      }[pool];
      if (!fn) throw new Error(`SR3E | pool.refresh: unknown pool '${pool}'`);
      await actor[fn]();
      return { ok: true };
    });

    /**
     * Absolute, non-accumulating writes only. Refuses accumulators loudly.
     *
     * `allowAbsolute` is a deliberate, per-call escape hatch for keys that are
     * usually read-modify-write but are genuinely being SET here. The only
     * current users are `commitSpellDefense` (writes a freshly declared total,
     * not a delta off the current value) and `clearSpellDefense` (writes a
     * constant 0). Listing the key at the call site keeps the exception visible
     * and auditable instead of quietly removing the key from the guard.
     */
    CONFIG.queries['sr3e.actor.set'] = async ({ rid, uuid, changes, allowAbsolute = [] }) => SR3EQuery.once(rid, async () => {
      SR3EQuery.assertActiveGM();
      const allow = new Set(allowAbsolute);
      for (const k of Object.keys(changes ?? {})) {
        if (allow.has(k)) continue;
        if (SR3E_ACCUMULATORS.has(k) || SR3E_ACCUMULATOR_RE.test(k)) {
          const msg = `SR3E | '${k}' accumulates and must not use actor.set — add an intent verb.`;
          ui.notifications?.error(msg);
          throw new Error(msg);
        }
      }
      const doc = SR3EQuery.resolve(uuid);
      if (!doc) throw new Error(`SR3E | actor.set: unknown document '${uuid}'`);
      await SR3EQueue.run(doc.uuid, () => doc.update(changes));
      return { ok: true };
    });

    /**
     * Apply damage boxes. Relays the DELTA; the GM reads current/max and does
     * the `Math.min(max, current + boxes)` against live data.
     */
    CONFIG.queries['sr3e.damage.apply'] = async ({ rid, uuid, kind, track, boxes }) => SR3EQuery.once(rid, async () => {
      SR3EQuery.assertActiveGM();
      return game.sr3e.SR3EActor._applyDamageBoxes({ uuid, kind, track, boxes });
    });

    /* ---------------------------------------------------------------- */
    /*  Decisions — run on the DECIDER's client, not the GM's             */
    /* ---------------------------------------------------------------- */

    /**
     * Open the dodge declaration on the defender's own screen.
     * NOTE: no `assertActiveGM` — this deliberately runs on a player client.
     * It performs NO writes; it returns a number and the GM commits it.
     */
    CONFIG.queries['sr3e.dodge.declare'] = async ({ rid, exchangeId, defenderUuid, attackerName, weaponName }) =>
      SR3EQuery.once(rid, async () => {
        const defender = SR3EQuery.resolve(defenderUuid);
        if (!defender) return { dice: 0 };
        const dice = await game.sr3e.SR3EItem._promptDodgeDeclaration(
          defender, attackerName, weaponName, { exchangeId });
        return { dice: dice ?? 0 };
      });

    /**
     * Open the SR3 Default Table on the actor's own client.
     * Also write-free — it returns the chosen tier and the caller uses it.
     */
    CONFIG.queries['sr3e.default.choose'] = async ({ rid, exchangeId, actorUuid, message, linkedAttr, title }) =>
      SR3EQuery.once(rid, async () => {
        const actor = SR3EQuery.resolve(actorUuid);
        if (!actor) return null;
        return game.sr3e.SR3EItem.promptDefaultChoice(
          actor, { message, linkedAttr, title, exchangeId, _local: true });
      });

    /**
     * PHASE 1 — negotiate. Runs on the GM. **Writes NOTHING.**
     *
     * Opens the GM's TN window and the defender's dodge query IN PARALLEL: the
     * defender does not need the TN to decide how much pool to commit, and serial
     * human latency is what makes a firefight drag. Do not "simplify" this into a
     * sequential await. Both use the same deadline — unequal ones silently discard
     * the slower participant's answer.
     */
    CONFIG.queries['sr3e.attack.negotiate'] = async ({ rid, ...ctx }) => SR3EQuery.once(rid, async () => {
      SR3EQuery.assertActiveGM();
      const { SR3EActor, SR3EItem } = game.sr3e;

      // Escape hatch: 'off' restores the pre-Stage-3 behaviour exactly — no GM
      // window, the attacker's own TN stands. 'player' (default) skips the window
      // when the GM is attacking with their own NPCs, so GM-vs-NPC costs nothing.
      const mode = game.settings.get('The2ndChumming3e', 'gmApprovesTN');
      const requesterIsGM = game.users.get(ctx._requesterId)?.isGM === true;
      if (mode === 'off' || (mode === 'player' && requesterIsGM)) {
        const def = SR3EQuery.resolve(ctx.defenderUuid);
        const fdOff = SR3EActor._fullDefenseDice(def);
        const canDodgeOff = Boolean(def) && def.type !== 'vehicle' && fdOff === 0;
        const decider = def ? SR3EQuery.deciderFor(def) : null;
        const res = canDodgeOff
          ? await SR3EQuery.ask(decider, 'sr3e.dodge.declare', {
              exchangeId: foundry.utils.randomID(), defenderUuid: ctx.defenderUuid,
              attackerName: ctx.attackerName, weaponName: ctx.weaponName,
            }, { fallback: { dice: 0 } })
          : null;
        const want = fdOff > 0 ? fdOff : Math.max(0, res?.dice ?? 0);
        const rq = foundry.utils.randomID();
        _pending.set(rq, { defUuid: ctx.defenderUuid, fd: fdOff, requested: want,
                           userId: ctx._requesterId, at: Date.now(), result: null });
        _reapPending();
        return { requestId: rq, tn: ctx.baseTN, mods: {}, requested: want, fullDefenseDice: fdOff };
      }

      const defender  = SR3EQuery.resolve(ctx.defenderUuid);
      const attacker  = SR3EQuery.resolve(ctx.attackerUuid);
      const weapon    = attacker?.items?.get(ctx.weaponId) ?? null;
      const fd        = SR3EActor._fullDefenseDice(defender);
      const canDodge  = Boolean(defender) && defender.type !== 'vehicle' && fd === 0;
      const deciderId = defender ? SR3EQuery.deciderFor(defender) : null;
      const gmDecides = deciderId === game.user.id;
      const exchangeId = foundry.utils.randomID();
      const availPool = defender?.system?.derived?.availableCombatPool ?? 0;

      // Merged branch: when the GM also decides for the defender, the dodge row
      // renders INSIDE the TN window so the GM is never asked twice per attack.
      const dodgeP = (canDodge && !gmDecides)
        ? SR3EQuery.ask(deciderId, 'sr3e.dodge.declare', {
            exchangeId, defenderUuid: ctx.defenderUuid,
            attackerName: ctx.attackerName, weaponName: ctx.weaponName,
          }, { fallback: { dice: 0 } })
        : Promise.resolve(null);

      const gmP = SR3EItem._promptGMAttackWindow(
        { ...ctx, attacker, weapon },
        { dodge: (canDodge && gmDecides) ? { availPool, defenderName: defender.name } : null });

      const [dodgeRes, gmRes] = await Promise.all([dodgeP, gmP]);

      if (!gmRes) {
        // GM cancelled — close the defender's now-pointless dialog. Nothing written.
        if (canDodge && !gmDecides) {
          await SR3EQuery.withdraw(deciderId, exchangeId, 'The GM cancelled that attack.');
        }
        return null;
      }

      const requested = fd > 0 ? fd
                      : gmDecides ? (gmRes.dodgeDice ?? 0)
                      : Math.max(0, dodgeRes?.dice ?? 0);

      // Stash for the commit phase. NOTHING is written yet — the attacker still
      // has two abort paths ahead (defaulting, combat pool).
      const requestId = foundry.utils.randomID();
      _pending.set(requestId, {
        defUuid: ctx.defenderUuid, fd, requested,
        // The REQUESTER, not game.user — this handler runs on the GM, so
        // game.user.id would be the GM and the disconnect reaper would never
        // match the attacker who actually left.
        userId: ctx._requesterId, at: Date.now(), result: null,
      });
      _reapPending();

      return { requestId, tn: gmRes.tn, mods: gmRes.mods, requested, fullDefenseDice: fd };
    });

    /**
     * PHASE 2 — commit. The point of no return, and idempotent by `requestId`:
     * a repeat returns the stored result rather than spending the pool twice.
     */
    CONFIG.queries['sr3e.attack.commit'] = async ({ requestId }) => {
      SR3EQuery.assertActiveGM();
      const entry = _pending.get(requestId);
      if (!entry) return { committedDodgeDice: 0, fullDefenseUsed: false, stale: true };
      if (entry.result) return entry.result;          // already committed

      const { SR3EActor } = game.sr3e;
      const defender = SR3EQuery.resolve(entry.defUuid);
      let committed = 0;

      if (defender && entry.requested > 0) {
        committed = await defender.spendCombatPool(entry.requested);
        if (entry.fd > 0) {
          await SR3EActor._announceFullDefense(defender, committed);
          await defender.clearFullDefense();
        }
      }

      entry.result = { committedDodgeDice: committed, fullDefenseUsed: entry.fd > 0 };
      _pending.delete(requestId);
      return entry.result;
    };

    /** Close a decision dialog whose answer is no longer wanted. */
    CONFIG.queries['sr3e.dialog.withdraw'] = async ({ exchangeId, reason }) => {
      const dlg = _openDialogs.get(exchangeId);
      if (!dlg) return { ok: true };
      _openDialogs.delete(exchangeId);
      if (reason) ui.notifications?.info(reason);
      try { await dlg.close(); } catch { /* already closing */ }
      return { ok: true };
    };
  }

  /* ---------------------------------------------------------------- */
  /*  Dialog registry — lets `withdraw` reach an open decision dialog   */
  /* ---------------------------------------------------------------- */

  /** Register an open dialog against its exchange id. No-op without an id. */
  static trackDialog(exchangeId, dialog) {
    if (exchangeId && dialog) _openDialogs.set(exchangeId, dialog);
  }

  /** Stop tracking a dialog that has resolved on its own. */
  static untrackDialog(exchangeId) {
    if (exchangeId) _openDialogs.delete(exchangeId);
  }

  /** True when this dialog was closed by a withdraw rather than by the user. */
  static wasWithdrawn(exchangeId) {
    return Boolean(exchangeId) && !_openDialogs.has(exchangeId);
  }
}
