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
   * Assigned character → connected non-GM owner → active GM → null.
   * (Unused in Stage 1; the dodge relay in Stage 2 is its first consumer.)
   * @param {Actor} actor
   * @returns {string|null} userId
   */
  static deciderFor(actor) {
    if (!actor) return null;
    const assigned = game.users.find(u => u.active && u.character?.id === actor.id);
    if (assigned) return assigned.id;
    const owner = game.users.find(u => u.active && !u.isGM && actor.testUserPermission?.(u, 'OWNER'));
    if (owner) return owner.id;
    return game.users.activeGM?.id ?? null;
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
    const payload = { rid: foundry.utils.randomID(), ...data };

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
  }
}
