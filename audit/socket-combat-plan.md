<!--
Produced 2026-08-05 by a 15-agent design workflow (run wf_d9545118-374):
5 pipeline mappers (179 findings) -> 3 independent designs -> 3 judges -> 3 adversarial
refuters -> synthesis. Winner "One Hop, Three Windows" was UNANIMOUS (3/3 judges).
The adversarial pass raised 32 breaks, 8 of them fatal; section 5 maps every one to a
handling. The brief's premise that Foundry has no built-in RPC was FALSE and is corrected
in section 0 -- verified by hand against the installed build, Foundry 14.365.0.
-->

# Definitive Implementation Plan — GM-Authoritative Socket Combat

## 0. Findings that change the design before you write a line

I verified the brief's premises against the installed Foundry and the codebase. Three of them are false, and one of those invalidates the entire transport layer of the accepted design.

| Claim in the brief | Verdict | Evidence |
|---|---|---|
| "Foundry sockets are fire-and-forget broadcast. There is no built-in request/response. Any RPC needs correlation IDs and a pending-promise registry." | **FALSE** | Installed build is generation **14, build 365** (`resources/app/package.json`); `system.json` pins `minimum/verified: "14"`. `User#query(name, data, {timeout})` exists at `client/documents/user.mjs:289`. It mints its own `queryId` via `foundry.utils.randomID()`, routes through a **server-acked** `userQuery` event (not a broadcast), supports a native `timeout`, and **throws immediately if the recipient is not active** (`user.mjs:306`). Handlers register in `CONFIG.queries` (`client/config.mjs:2964`). |
| "`DialogV2.wait()` does NOT call its `render` option" (CLAUDE.md) | **STALE for v14** | `client/applications/api/dialog.mjs:405,420-422` — `wait({rejectClose=false, close, render, ...})` and `if (typeof render === "function") dialog.addEventListener("render", event => render(event, dialog));` |
| "Foundry picks the lowest-id active GM" | **FALSE** | `Users#activeGM` → `getDesignatedUser` (`users.mjs:77-96`) sorts `(candidate.role - designated.role) \|\| designated.id.compare(candidate.id)` — **highest role first**, id only as tie-break. A full GAMEMASTER always beats an ASSISTANT. |

**Consequence: `scripts/SR3ESocket.js` as specified must not be built.** Its envelope, `to` addressing, `_pending` Map, delete-first double-resolve dance, and timeout timers are a strictly worse reimplementation of maintained core code. The valuable parts of the design — `deciderFor`, the handler bodies, the staging, the GM window — all survive unchanged.

Two more verified facts that shape the plan:

- `QUERY_USER` has `defaultRole: USER_ROLES.PLAYER` (`common/constants.mjs:1405-1410`). **Players can query the GM out of the box** — requirement 1's transport is free. But it is revocable in permission config, so it must be checked.
- `DialogV2.query(user, type, config)` exists (`dialog.mjs:442`) and has the loopback short-circuit built in — but its docstring says **"Callback options are not supported."** The config crosses the socket as JSON. This means we **cannot** use `DialogV2.query` for the dodge window: we need a live-recompute `render` callback, and we need a handle on the dialog so we can close it on withdrawal. We register our own query and construct the dialog locally on the defender's client.

### Verified codebase facts

```
scripts/documents/SR3EItem.js:919   committedDodgeDice = await targetActor.spendCombatPool(...)  ← the live bug
scripts/documents/SR3EItem.js:1946  await defender.update({fullDefense:false, fullDefensePool:0})
scripts/documents/SR3EActor.js:4083 spendCombatPool — reads derived locally, ships an ABSOLUTE
scripts/documents/SR3EActor.js:4128 refreshAstralPool  ┐ defined twice, identical bodies,
scripts/documents/SR3EActor.js:4196 refreshAstralPool  ┘ the second silently wins
scripts/documents/SR3EActor.js:4040 handleAssignDamage — btn.textContent='✓ Damage Applied' set
                                    BEFORE the await and before four `if (!x) return` bailouts
scripts/documents/SR3EItem.js:2834  _promptCombatPool — hand-rolled `new DialogV2().render(true)`,
                                    Cancel resolves(0), no close handler (Escape hangs forever)
scripts/documents/SR3EItem.js:744   _promptCombatPool call site #1 (AoE)   ← both must change together
scripts/documents/SR3EItem.js:969   _promptCombatPool call site #2 (single-target)
grep game.socket|CONFIG.queries|socketlib scripts/  →  zero hits (greenfield, confirmed)
```

**The single most important correctness finding, restated:** `spendCombatPool` computes `Math.min(amount, available)` **on the caller** and sends `(spent ?? 0) + spend` — an absolute. Relaying that changes-object to the GM buys *permission* but not *correctness*. Two clients each reading `combatPoolSpent: 0` both send `3`, and the final value is `3` for six declared dice. **The relay must carry the intent (`{pool:'combat', n:3}`), not the result**, and the clamp must re-run on the writer inside a serialised task.

---

## 1. ARCHITECTURE

### 1.1 Transport

No custom socket. Every cross-client call is a **core user query**.

```js
// Sender (any client)
const gm = game.users.activeGM;
const verdict = await gm.query('sr3e.attack.negotiate', payload, { timeout: 300_000 });

// Receiver (registered on EVERY client at init)
CONFIG.queries['sr3e.attack.negotiate'] = async (data, { user, timeout }) => { ... };
```

Core provides, and we therefore do not write: correlation ids, server-side point-to-point routing (no broadcast, no `to` filter, no eavesdropping on other clients' payloads), per-call timeouts, automatic rejection when the **recipient** disconnects, error propagation across the wire (`{status:'rejected', reason}` is rethrown by the caller), and the sender's authenticated identity as `context.user` — server-supplied, therefore **not spoofable** by a client-authored `from` field.

**Registration site.** `Hooks.once('init')` in `sr3e.js`, beside the existing `game.sr3e` registry. Not `ready` — registering at `ready` leaves a window during world load where an early click emits into a channel with no handler and the promise hangs to its timeout.

**Naming.** All query names are prefixed `sr3e.` per the documented `CONFIG.queries` convention for systems.

### 1.2 The verb set

Seven verbs, in two families. There is no generic `update` verb and no key whitelist — the design's own risk list admitted the whitelist "WILL bite", and a forgotten regex is a silent no-op for every non-GM client, which is exactly the failure class this work exists to kill. Intent verbs delete that class rather than warn about it.

**Write intents (any client → GM). Deltas, never absolutes.**

| Verb | Data | Result |
|---|---|---|
| `sr3e.pool.spend` | `{ uuid, pool: 'combat'\|'spell'\|'astral'\|'hacking'\|'spellDefense', n }` | `{ spent }` |
| `sr3e.pool.refresh` | `{ uuid, pool }` | `{ ok: true }` |
| `sr3e.damage.apply` | `{ uuid, track: 'physical'\|'stun'\|'ic'\|'vehicle'\|'ward', boxes, claimKey? }` | `{ applied }` |
| `sr3e.actor.set` | `{ uuid, changes }` — **idempotent absolutes only** | `{ ok: true }` |

`sr3e.actor.set` is deliberately narrow: it carries only writes where last-writer-wins is *correct* — `fullDefense:false`, `fullDefensePool:0`, `roundsFiredThisPhase:0`, the `refresh*` zeroing. It never carries an accumulator. Any accumulating field must get its own intent verb; there is a runtime assertion (below) that makes violating this loud.

**Decision relays.**

| Verb | Direction | Data | Result |
|---|---|---|---|
| `sr3e.dodge.declare` | GM → decider | `{ requestId, defenderUuid, attackerName, weaponName }` | `{ requested } \| null` |
| `sr3e.dodge.withdraw` | GM → decider | `{ requestId, reason }` | `{ ok: true }` |
| `sr3e.attack.negotiate` | attacker → GM | see §1.4 | verdict `\| null` |
| `sr3e.attack.commit` | attacker → GM | `{ requestId }` | `{ committedDodgeDice, fullDefenseUsed }` |

### 1.3 GM authority — enforced by three mechanisms

**(a) Intent routing inside each helper.** The guard goes *inside* the existing helper, so there are zero call-site changes anywhere in the codebase and the clamp always re-runs on the writer:

```js
async spendCombatPool(amount) {
  const gm = game.users.activeGM;
  if (gm && !gm.isSelf) {
    if (!game.user.hasPermission('QUERY_USER')) {
      ui.notifications.warn('SR3E | Cannot reach the GM (QUERY_USER permission is disabled).');
      return 0;
    }
    const { spent } = await gm.query('sr3e.pool.spend',
      { uuid: this.uuid, pool: 'combat', n: amount }, { timeout: 10_000 });
    return spent;
  }
  if (!gm && !this.isOwner) {
    ui.notifications.warn(`SR3E | No GM connected — cannot update ${this.name}.`);
    return 0;
  }
  return SR3EQueue.run(this.uuid, async () => {          // ← queue wraps the READ too
    const available = this.system.derived?.availableCombatPool ?? 0;
    const spend     = Math.min(amount, available);
    if (spend > 0) await this.update({ 'system.combatPoolSpent': (this.system.combatPoolSpent ?? 0) + spend });
    return spend;
  });
}
```

Three properties matter here and each fixes a specific verified break:

- The **read is inside the queue**, not captured before it. Serialising only the `update()` orders the writes but still lets each act on a pre-queue snapshot.
- The **GM's own local path also enters the queue**. The design's `if (activeGM.isSelf) return this.update(...)` short-circuit skipped the queue entirely — and the GM's own path is the one that executes in the common case, so the serialisation would have protected only the rare path.
- The **no-GM branch degrades to a local write when the caller owns the document.** Otherwise a player clicking "Full Defense" or "Reset Recoil" on their *own* sheet would silently no-op whenever no GM is connected — a guardrail the project ethos explicitly rejects.

**(b) The GM as arbiter of the negotiation.** The `attack.negotiate` handler is the only code that reads the defender's live pool and Full-Defense posture and decides the spend. The attacker's client never touches the defender's document; it receives a number.

**(c) Serialisation.** One promise chain per document uuid, with correct argument handling and self-pruning — the design's `.then(fn, fn)` passes the *previous* entry's resolution value or error into `fn` as an argument, which is a live footgun, and its map was never pruned.

```js
static run(key, fn) {
  const prev = SR3EQueue.#chains.get(key) ?? Promise.resolve();
  const next = prev.then(() => fn(), () => fn());        // no args leak through
  const tail = next.catch(() => {});
  SR3EQueue.#chains.set(key, tail);
  tail.finally(() => {                                   // prune only if still the tail
    if (SR3EQueue.#chains.get(key) === tail) SR3EQueue.#chains.delete(key);
  });
  return next;
}
```

### 1.4 The attack flow — two-phase, nothing commits until every abort has passed

This is the structural fix for the design's worst latent bug. In the design as written, `attack.negotiate` performed `def.spendCombatPool(...)` and cleared Full Defense **before returning**. But `rollWeapon` has two abort paths *after* the verdict lands — the attacker's defaulting dialog (`SR3EItem.js:951`, `if (!def) return null` at :957) and, under the design's own `_promptCombatPool` change, the pool dialog at :969. An attacker cancelling either would leave the defender's pool spent and their Full Defense burnt for an attack that never happened, on a different client, with no rollback. The design asserted "no write happens before the verdict returns"; the writes *are* what produce the verdict.

Splitting the negotiation from the commit makes the invariant structural rather than conventional:

```
ATTACKER                          GM                              DEFENDER'S DECIDER
────────                          ──                              ──────────────────
_promptTarget          (local)
_promptFireMode        (local, now also carries called shot / take aim)
        │
        ├─ sr3e.attack.negotiate ─►
        │                          fd = _fullDefenseDice(def)   ← READ ONLY, no clear
        │                          if (fd === 0 && canDodge)
        │                            ├─ sr3e.dodge.declare ────► DialogV2 (their screen)
        │                            │                            live pool recompute
        │                          _promptGMAttackWindow()      ◄─┘ resolves in parallel
        │                            checkbox modifier table
        │                            editable TN, editable assertions
        │                            "⏭ Roll — no dodge" force button
        │                          if (cancelled) → return null   (nothing written)
        │                          if (dodge still pending)
        │                            └─ sr3e.dodge.withdraw ───► dialog.close() + toast
        │                          stash pending[requestId] = {defUuid, fd, requested}
        │  ◄── {requestId, tn, damageCode, dodgeDice, fullDefenseDice, deciderUserId}
        │
promptDefaultChoice    (local)  ← can still abort, nothing committed
_promptCombatPool      (local)  ← can still abort, nothing committed
        │
╔═══════╪═══════════════ POINT OF NO RETURN ═══════════════════════════════╗
        ├─ sr3e.attack.commit ────►  SR3EQueue.run(defUuid, …)
        │                             spend pool / clear Full Defense
        │                             post the Full-Defense announcement card
        │  ◄── {committedDodgeDice, fullDefenseUsed}
        │
   attacker's own commits: spendCombatPool, roundsFiredThisPhase,
   magazine, nocked round, _consumeThrown        ← all already below this line
        │
   actor.rollPool(...)  → dice roll LOCALLY
╚══════════════════════════════════════════════════════════════════════════╝
```

`attack.commit` is **idempotent by `requestId`** — a module-scoped `Map` on the GM holds the pending negotiation; commit consumes and deletes the entry, and a second commit with the same id returns the stored result without re-writing. The entry is reaped after 10 minutes, and immediately if the requesting user goes inactive (`Hooks.on('userConnected')`), so a GM who adjudicates into the void after the attacker timed out or refreshed never writes.

A five-line comment block goes at the seam, because the invariant is otherwise enforced only by ordering and the next person to add a write above it silently reintroduces 0c45bc5's unrefundable-resources failure.

### 1.5 Parallel slots, and why the deadline ordering matters

The GM window and the dodge query open **simultaneously**. This is safe because the defender does not need the TN to decide how much pool to commit, and it matters because serial human latency is what makes a firefight feel slow. This gets a comment so nobody "simplifies" it into a sequential await later.

**Both use the same 300 s timeout.** The design gave the dodge 45 s and the GM window 180 s with `.catch(() => null)` — so a GM taking 50 s (which is *normal* for a human reading a modifier table) produces the default behaviour of the defender's answer being silently discarded while their dialog stays open. The defender declares four dice, watches the attack resolve with zero, and no error surfaces anywhere.

Equal deadlines plus an explicit `dodge.withdraw` close both halves of that: the GM's window resolving is what ends the dodge query, and the defender's dialog is actively closed with `ui.notifications.info('The GM resolved the attack without your dodge.')` rather than left stacked. Three exchanges in a round can no longer leave three stale modals on the defender.

**Reaper semantics, written down as a rule:** on timeout, *fill the missing slot with the conservative default and resolve* — never cancel. A stuck exchange always resolves to "0 dodge dice, attack proceeds". Only the GM (cancel on the TN window) and the attacker (cancel on fire-mode, defaulting or pool) may abort. This is a deliberate behaviour change from today, where a cancelled dodge dialog aborts the whole attack: under a relay that would let any defender kill an attacker's turn with one click, and an AFK defender would do it by doing nothing.

### 1.6 Decider resolution

```js
/**
 * Resolve the single user who decides for this actor.
 * Order: the user whose assigned character IS this actor → an EXPLICIT owner → the active GM.
 * @param {Actor} actor
 * @returns {string|null} userId, or null when no GM is connected either
 */
static deciderFor(actor) {
  if (!actor) return game.users.activeGM?.id ?? null;
  const assigned = game.users.find(u => u.active && !u.isGM && u.character?.id === actor.id);
  if (assigned) return assigned.id;
  const OWNER = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
  const explicit = game.users.getDesignatedUser(
    u => u.active && !u.isGM && actor.ownership?.[u.id] === OWNER);   // NOT testUserPermission
  return explicit?.id ?? game.users.activeGM?.id ?? null;
}
```

Two corrections to the design's version, both from verified breaks. `testUserPermission(u,'OWNER')` resolves `ownership[user.id] ?? ownership.default` (`common/abstract/document.mjs:386-395`), so in a world with Actors-directory default ownership set to Owner — a common setup — it is **true for every player**, and `game.users.find` then hands a random player the dodge dialog for a goon they have never seen. Requiring an *explicit* ownership entry stops `default` sweeping in the whole table. And `getDesignatedUser` is core's documented, deterministic, role-ranked selector; `find` order is arbitrary when two players co-own a drone.

`u.active` excludes offline owners, so a disconnected player's PC falls to the GM automatically — the standing ruling, for free.

---

## 2. NEW FILES

### `scripts/SR3EQuery.js` (~180 lines)

```js
/**
 * GM-authoritative RPC for SR3E, built on Foundry v14 core user queries.
 *
 * There is no custom socket. Core's User#query provides correlation ids,
 * server-routed point-to-point delivery, timeouts, recipient-disconnect
 * rejection and cross-wire error propagation. Do not reimplement any of it.
 *
 * Handlers are registered on EVERY client at init (a non-GM client must be
 * able to answer a relayed decision). Whether a handler is allowed to WRITE
 * is decided inside the handler by `assertActiveGM()`, not by registration.
 */
export class SR3EQuery {

  /** Register every CONFIG.queries handler. Call from Hooks.once('init'). */
  static register()

  /**
   * The single user who decides for this actor.
   * Assigned character → explicit OWNER → active GM → null.
   * @param {Actor} actor
   * @returns {string|null} userId
   */
  static deciderFor(actor)

  /**
   * Send an intent to the elected GM, or run it locally if we are the GM.
   * Throws SR3EGMUnavailable when no GM is connected.
   * Retries ONCE against the new activeGM if the election changed mid-flight.
   * @param {string} verb   e.g. 'sr3e.pool.spend'
   * @param {object} data
   * @param {object} [opts]
   * @param {number} [opts.timeout=10000]
   * @returns {Promise<*>}
   */
  static async asGM(verb, data, opts = {})

  /**
   * Resolve a document from a uuid, tolerating a legacy bare actor id so the
   * existing chat-card payloads (which carry actorId, not uuid) keep working.
   * @param {string} ref
   * @returns {Document|null}
   */
  static resolve(ref)

  /**
   * Throw unless this client is the elected GM. Called at the TOP of every
   * write handler — re-checked on ARRIVAL, because the election can change
   * between the sender's emit and our receipt.
   * @throws {Error}
   */
  static assertActiveGM()

  /**
   * Receiver-side dedupe. A redelivered request returns the SAME promise
   * rather than running the handler twice (two dialogs, two writes).
   * Bounded at 200 entries, LRU-trimmed.
   * @param {string} key
   * @param {() => Promise<*>} fn
   */
  static once(key, fn)
}

/**
 * Per-document write serialisation. The READ must happen inside the task,
 * not be captured before it, or ordering is preserved while staleness is not.
 */
export class SR3EQueue {
  /**
   * @param {string} key  document uuid
   * @param {() => Promise<T>} fn
   * @returns {Promise<T>}
   */
  static run(key, fn)
}

/** Tagged error so callers can distinguish "no GM" from a handler failure. */
export class SR3EGMUnavailable extends Error {}
```

### `scripts/SR3ECombatModifiers.js` (~120 lines, Stage 3)

```js
/**
 * SR3 p.112 Ranged Combat Modifiers Table and Visibility Table,
 * transcribed from `Shadowrun 3e - Core Rules {FAN25000}.pdf` (PDF page 114)
 * with `pdftotext`. Values are verbatim from the book — do not "improve" them.
 * Rendered as the checkbox rows in the GM's TN window.
 */
export const SR3E_RANGED_MODIFIERS = [ /* … see §3, Stage 3 … */ ];
export const SR3E_VISIBILITY_TABLE = { /* … */ };

/**
 * Sum the checked modifier rows into a TN delta.
 * @param {Record<string, boolean|number>} checked
 * @returns {{ total:number, breakdown:Array<{label:string, mod:number}> }}
 */
export function foldModifiers(checked)
```

**No other new files.** Modified: `scripts/documents/SR3EItem.js`, `scripts/documents/SR3EActor.js`, `scripts/sr3e.js`, `scripts/config.js`. **No `system.json` change** — `"socket": true` at line 6 is unrelated to core queries and already set; the one new world setting in Stage 3 does need a restart.

---

## 3. STAGED PLAN

Each stage leaves the system working, is separately committable, and is separately revertable. This is the structural answer to why 0c45bc5 had to be reverted wholesale — it was one 273-line commit mixing transport, flow and UI.

### Stage 0 — prerequisites (four small independent commits, ~2 hours total)

These are not optional. Three of them are latent bugs that the socket work would otherwise amplify or edit around.

**0a. Fix `_promptCombatPool` (TODO #13).** `SR3EItem.js:2834`. Three defects in one dialog: it hand-rolls `new DialogV2(...).render(true)` inside a Promise against CLAUDE.md; Cancel `resolve(0)` so cancelling silently fires the attack with no pool; and with no close handler, Escape never resolves, so `rollWeapon` awaits forever. Convert to `DialogV2.wait()` returning `null` on both cancel and close. **Update both call sites in the same commit** — `:969` (single-target) *and* `:744` (AoE). The AoE site reads `if (combatDice > 0)`, and `null > 0` is `false`, so leaving it would silently swallow the abort and roll the grenade with no pool. Verified: `DialogV2.wait` defaults `rejectClose = false` and resolves `null` on dismissal, so the conversion genuinely fixes the hang.

**0b. Delete the duplicate `refreshAstralPool`.** Defined twice at `SR3EActor.js:4128` and `:4196` with identical bodies; the second silently wins. Stage 1 touches both lines, so without this it would edit dead code.

**0c. Fix `handleAssignDamage`'s lying button.** `SR3EActor.js:4041-4042` sets `btn.textContent = '✓ Damage Applied'` **before** the await and before four `if (!x) return` bailouts. Move it after the write.

**0d. Settle the version (TODO #15).** CLAUDE.md says "Foundry v13"; the manifest and the install say 14. Correct CLAUDE.md, and in the same commit correct the **stale `DialogV2.wait` / `render` claim** — this is load-bearing for Stage 3 and for a follow-up pass over the 19 `renderDialogV2` hook sites.

### Stage 1 — transport + single writer. ~½ day. **ZERO UI change.** Fixes `SR3EItem.js:919`.

The smallest thing that fixes the live permission bug. New `scripts/SR3EQuery.js`; register in `Hooks.once('init')`; implement the four write intents; rewire the 14 pool helpers and `handleAssignDamage` to route intents.

**Observable change:** pool spends and damage assignment actually persist in multiplayer instead of failing with a red toast or lying via `'✓ Damage Applied'`. No dialog moves. No click changes anywhere. If this regresses, revert one file and ~15 guards.

### Stage 2 — requirement 2: the dodge window on the defender's screen. ~1 day.

Add `sr3e.dodge.declare` / `sr3e.dodge.withdraw`. Split `_promptDodgeDeclaration` into a pure `SR3EActor._fullDefenseDice(actor)` read and a relayable dialog. Gate the three chat buttons. **Ship the `promptDefaultChoice` guard here too** — it is three lines inside one function, it fixes three flows where your *opponent* currently picks your defaulting tier, and it proves the relay end-to-end on a low-stakes dialog before the dodge window depends on it.

### Stage 3 — requirement 3: the GM's TN window with modifier checkboxes. ~1.5 days.

Add `sr3e.attack.negotiate` / `sr3e.attack.commit`, folding Stage 2's direct dodge relay into the GM hub. Write `SR3ECombatModifiers.js` from the transcription in §3 below. Write `SR3EItem._promptGMAttackWindow`. Add the `gmApprovesTN` setting.

### Stage 4 — out of scope for this pass. See §7.

---

## 4. PER-STAGE FILE-AND-FUNCTION CHANGE LIST

### Stage 1

**NEW `scripts/SR3EQuery.js`** — `SR3EQuery`, `SR3EQueue`, `SR3EGMUnavailable` per §2.

Handlers registered:

```js
CONFIG.queries['sr3e.pool.spend'] = async ({uuid, pool, n}, {user}) => {
  SR3EQuery.assertActiveGM();
  const actor = SR3EQuery.resolve(uuid);
  if (!actor) throw new Error(`SR3E | unknown actor ${uuid}`);
  const fn = { combat:'spendCombatPool', spell:'spendSpellPool',
               astral:'spendAstralPool', hacking:'spendHackingPool',
               spellDefense:'useSpellDefenseDice' }[pool];
  if (!fn) throw new Error(`SR3E | unknown pool '${pool}'`);
  return { spent: await actor[fn](n) };          // re-enters the local branch → queued, clamped live
};

CONFIG.queries['sr3e.actor.set'] = async ({uuid, changes}, {user}) => {
  SR3EQuery.assertActiveGM();
  for (const k of Object.keys(changes)) {
    if (SR3E_ACCUMULATORS.has(k)) {              // loud, not silent
      ui.notifications.error(`SR3E | '${k}' is an accumulator and must not use actor.set — add an intent verb.`);
      throw new Error(`SR3E | accumulator '${k}' sent to actor.set`);
    }
  }
  const doc = SR3EQuery.resolve(uuid);
  return SR3EQueue.run(uuid, () => doc.update(changes)).then(() => ({ ok: true }));
};
```

**`scripts/documents/SR3EActor.js`** — add the guard *inside* each helper (call sites unchanged everywhere in the codebase):

| Function | Line | Routes to |
|---|---|---|
| `spendCombatPool` | 4083 | `sr3e.pool.spend` |
| `refreshCombatPool` | 4095 | `sr3e.pool.refresh` |
| `spendSpellPool` | 4102 | `sr3e.pool.spend` |
| `refreshSpellPool` | 4124 | `sr3e.pool.refresh` |
| `refreshAstralPool` | 4128 | `sr3e.pool.refresh` (the 4196 dup deleted in 0b) |
| `toggleFullDefense` | 4137 | `sr3e.actor.set` |
| `refreshHackingPool` | 4164 | `sr3e.pool.refresh` |
| `resetRecoil` | 4171 | `sr3e.actor.set` |
| `spendHackingPool` | 4178 | `sr3e.pool.spend` |
| `spendAstralPool` | 4187 | `sr3e.pool.spend` |
| `commitSpellDefense` | 4209 | `sr3e.actor.set` |
| `useSpellDefenseDice` | 4222 | `sr3e.pool.spend` |
| `clearSpellDefense` | 4234 | `sr3e.actor.set` |
| `handleAssignDamage` | 4040 | `sr3e.damage.apply` — all four branches send `{boxes}`; the GM does the `Math.min(max, current + boxes)` |

**`scripts/sr3e.js`** — `import { SR3EQuery }`; `SR3EQuery.register()` in `Hooks.once('init')`; add `SR3EQuery` to the `game.sr3e` registry; add the `userConnected` hook that reaps pending entries for departed users.

*Not touched, deliberately:* `SR3ECombat.js:377` and `:436` clear Full Defense with direct `actor.update()`. Both are GM-only paths (`_endOfTurnReset`, `endCombat`) so they are already correct — but note they are **not** in the "complete mutation catalogue" the design claimed.

### Stage 2

**`scripts/documents/SR3EActor.js`**
- **NEW** `static _fullDefenseDice(actor)` — **pure read**, returns the reserved pool or 0. It must not clear.
- **NEW** `static async _announceFullDefense(actor, dice)` — posts the `🛡 … Full Defense (n dice auto-committed)` card. This restores the announcement the design silently dropped; it is not chat pollution, it is the record of an automatic commit the defender never consented to in the moment, and the GM is now its correct author.

**`scripts/documents/SR3EItem.js`**
- `_promptDodgeDeclaration(defender, …)` → `_promptDodgeDeclaration(defenderUuid, attackerName, weaponName)`. Strip **both** writes (the `ChatMessage.create` at :1940 and the `defender.update` at :1946). Rebuild the recompute wiring on `DialogV2.wait`'s **`render:` option**, not a `renderDialogV2` hook.
- `rollWeapon` — replace the `:916` await with a relay to `SR3EQuery.deciderFor(target)`; **delete** the `spendCombatPool` at `:919` (the GM does it). Add the module-scoped in-flight guard (below).
- `promptDefaultChoice` (`:432`) — three lines at the top: if the actor's decider is not this client, relay `sr3e.default.choose` instead of opening locally. One edit fixes the melee defender (`:213`), the vehicle pilot (`:1087`) and the cybercombat defender (`SR3EActor.js:348`).

**`scripts/sr3e.js`** — add `_mine()` and gate `.sr-soak-btn` (2016), `.sr-dodge-roll-btn` (2032), `.sr-soak-roll-btn` (2121). For the dodge button specifically, gate on the **resolved decider id** stamped into the payload during negotiation, so `_mine` and `deciderFor` agree:

```js
function _mine(p)      { return game.user.isGM || game.actors.get(p.targetActorId)?.isOwner === true; }
function _isDecider(p) { return game.user.isGM || game.user.id === p.deciderUserId; }
```

The design's `_mine` was `!a || a.isOwner || game.user.isGM` — a *set* — while `deciderFor` returns exactly *one* user. The two predicates disagreed, and the broader one guarded the button that actually rolls, so two co-owners of a party drone could both click "roll to dodge". Also drop the fail-open `!a` branch to `game.user.isGM`.

Verified while tracing, recorded so it is not re-litigated: all three gated buttons *do* carry a resolvable key — `soakPayload` sets `targetActorId: payload.targetActorId ?? this.id` at `SR3EActor.js:3947`.

### Stage 3

**NEW `scripts/SR3ECombatModifiers.js`** — transcribed from the PDF (PDF page 114 = book p.112), verbatim:

```js
export const SR3E_RANGED_MODIFIERS = [
  { key:'recoilSA',      label:'Recoil, semi-automatic',           mod:+1, auto:true,  note:'second shot that Combat Phase' },
  { key:'recoilBF',      label:'Recoil, burst-fire',               mod:+3, auto:true,  note:'per burst that Combat Phase' },
  { key:'recoilFA',      label:'Recoil, full-auto',                mod:+1, auto:true,  note:'per round fired that Combat Phase' },
  { key:'recoilHeavy',   label:'Recoil, heavy weapon',             mod:null, auto:true, note:'2 × uncompensated recoil' },
  { key:'blindFire',     label:'Blind fire',                       mod:+8 },
  { key:'partialCover',  label:'Partial cover',                    mod:+4 },
  { key:'visibility',    label:'Visibility impaired',              mod:null, select:'visibility' },
  { key:'multiTarget',   label:'Multiple targets',                 mod:+2, per:true, note:'per additional target that Combat Phase' },
  { key:'targetRunning', label:'Target running',                   mod:+2 },
  { key:'targetStill',   label:'Target stationary',                mod:-1 },
  { key:'atkMelee',      label:'Attacker in melee combat',         mod:+2, per:true, note:'per opponent' },
  { key:'atkRunning',    label:'Attacker running',                 mod:+4 },
  { key:'atkRunningDiff',label:'Attacker running (difficult)',     mod:+6 },
  { key:'atkWalking',    label:'Attacker walking',                 mod:+1 },
  { key:'atkWalkingDiff',label:'Attacker walking (difficult)',     mod:+2 },
  { key:'wounded',       label:'Attacker wounded',                 mod:null, auto:true, note:'Damage Modifiers Table, p.126' },
  { key:'smartlink',     label:'Smartlink (with smartgun)',        mod:-2 },
  { key:'smartGoggles',  label:'Smart goggles (with smartgun)',    mod:-1 },
  { key:'laserSight',    label:'Laser sight',                      mod:-1 },
  { key:'secondFirearm', label:'Using a second firearm',           mod:+2 },
  { key:'aimedShot',     label:'Aimed shot',                       mod:-1, per:true, note:'per Simple Action' },
  { key:'calledShot',    label:'Called shot',                      mod:+4 },
  { key:'imageMag',      label:'Image magnification',              mod:null, note:'Special' },
];

// Visibility Table, p.112. Columns: Normal / Low-Light / Thermographic.
export const SR3E_VISIBILITY_TABLE = {
  'Full Darkness':        { normal:+8, lowLight:'+8/+8', thermo:'+4/+2' },
  'Minimal Light':        { normal:+6, lowLight:'+4/+2', thermo:'+4/+2' },
  'Partial Light':        { normal:+2, lowLight:'+1/0',  thermo:'+2/+1' },
  'Glare':                { normal:+2, lowLight:'+4/+2', thermo:'+4/+2' },
  'Mist':                 { normal:+2, lowLight:'+2/0',  thermo:0       },
  'Light Smoke/Fog/Rain': { normal:+4, lowLight:'+4/+2', thermo:0       },
  'Heavy Smoke/Fog/Rain': { normal:+6, lowLight:'+6/+4', thermo:'+1/0'  },
  'Thermal Smoke':        { normal:+4, lowLight:'+4',    thermo:'+8/+6' },
};
```

⚠ `Multiple targets` is **+2 per additional target** in the book; reconcile against whatever the
existing `additionalTNPenalty` in `rollWeapon` currently computes before wiring, since these must
not double-count.

⚠ **`Gyro stabilization` and `Recoil compensation` are missing from the array above.** Both are
rows in the book's table. `recoilCompensation` is already handled by the existing recoil maths, but
gyro is not represented anywhere — see the decisions below.

### ✅ RESOLVED — the Visibility Table slash notation

**First number = cybernetic or electronic vision. Second number = natural vision.** Stated twice
in the core rulebook, just not on p.112 itself:

> "If the number listed is split by a slash, the first modifier applies to cybernetic or electronic
> vision and the second to natural vision. Modifiers listed singly apply equally to all types of
> vision." — visibility prose, p.111

> "When target modifiers are separated by a slash, the first number applies to cybernetic vision
> enhancements and the second to natural vision." — Perception Table footnote

Note the direction: **cyber vision is worse.** In Mist, low-light is `+2` cyber / **`0`** natural —
an elf's own eyes beat cybereyes. So the GM window **can** eventually render a single number, because
the system knows metatype (natural low-light / thermographic) and can read cyberware. The GM picks
the *condition*; the system derives the modifier from the attacker's eyes. **Not in the MVP** — see
below — but the blocker is removed.

### Maintainer decisions — 2026-08-05

**1. Partial cover is `+4`.** The Quick Start Rules give `+2`; the core rulebook p.112 gives `+4`, and
core governs — the system follows core everywhere else (recoil, ranges, staging). Verified against
the PDF. *(The QSG could not be checked directly: it is 23 MB of scanned images with no text layer,
unlike the other 31 books. CLAUDE.md's blanket "they carry a real text layer, no OCR needed" is wrong
for that one file.)*

**2. Gear modifiers ship as checkboxes the system PRE-TICKS by best guess.** There is no structured
gear data to drive them today:

- `accessories` on a firearm is a free-text `StringField` (`ItemDataModels.js:119`)
- 'Smartgun Link' exists as cyberware in a populate macro, but nothing reads it for TN maths
- **zero** references to laser sight or gyro as mechanics anywhere in `scripts/`

So pre-tick from a name match on the actor's cyberware plus a substring match on the weapon's
`accessories` string, and let the GM override freely. Degrades gracefully when the data is absent,
and improves for free once gear data is structured (same root cause as TODO #8). Two rules details
that constrain this:

- **Smartlink and smart goggles are PAIR conditions, not character properties.** Both read
  *"with a properly equipped smart-weapon"* — the cyberware alone earns nothing. Check character
  gear **AND** weapon gear.
- **Gyro stabilization "reduces recoil *or* movement modifier"** — a per-shot choice, not a fixed
  number. It cannot be a plain checkbox; it needs a small "apply gyro to: recoil / movement" control.

### MVP checkbox set for Stage 3

Ship exactly these. Everything else in the array stays `auto:true` or waits.

| Checkbox | Mod |
|---|---|
| Partial cover | **+4** |
| Target running | +2 |
| Target stationary | −1 |
| Attacker running | +4 |
| Aimed shot | −1 per Simple Action |
| Smartlink (with smartgun) | −2 · *pre-ticked by guess* |
| Smart goggles (with smartgun) | −1 · *pre-ticked by guess* |
| Laser sight | −1 · *pre-ticked by guess* |
| Gyro stabilization | *control, not checkbox — see above* |

**Already computed, never a checkbox:** range → base TN, wound modifier, recoil (all modes incl.
heavy-weapon doubling), and the defaulting penalty for using a skill you lack.

**Deferred to the "elegant / automated suggestions" pass:** visibility (now unblocked), blind fire,
multiple targets, attacker in melee, walking, difficult ground, second firearm, image magnification.

### ⚠ The GM window MUST clamp its DISPLAYED target number at 2

**"No target number can ever be less than 2" is a core rule** (stated twice in the core rulebook —
the general mechanics section and again in the ranged-combat modifiers text, plus a third
"treat a result less than 2 as 2" in the compensation rules).

**The engine already enforces it on every roll path** — audited 2026-08-05, all 20 `_rollWave` call
sites and all 34 `rollPool` calls:

`rollPool` `SR3EActor.js:1826-1828` · cybercombat `:472-473` · melee `:3598-3599` · astral
`:5436-5437` · contested `:6157-6158` · drain `:4729` · spell resist `:5628` · soak `:3942/:1368/:1408`
· hacking `:910` · node `:1028` · orthodox resolver `:6293` · `SR3EWard._resolveRoll:280` ·
`SR3EMIJI._resolveRoll:47` · dodge is a fixed TN 4.

**So there is no rules bug to fix — but there is a display trap this window walks straight into.**
On card-based rolls the clamp happens at **read** time:

```js
const atkTN = Math.max(2, parseInt(card.querySelector('.sr-melee-atk-tn')?.value) || 4);
```

The input itself holds whatever was written. Melee happens to clamp at *write* time too
(`SR3EItem.js:249` — `Math.max(2, 4 + Math.min(0, defReach - atkReach) + defaultTnMod + calledShot.tnMod)`),
so today display and roll agree everywhere.

The GM window breaks that by construction: it sums checkboxes into a **live-updating TN field**, and
the MVP set alone reaches −4 (Target stationary −1, Aimed shot −1, Smartlink −2) against a base of 4.
Without a clamp on the rendered value the GM reads **"TN 0"**, confirms, and the dice roll at 2 — the
window lying about the roll it is about to cause, which is the one thing a GM adjudication surface
must never do.

**Requirement:** clamp in the `render` recompute, not only on submit. Show the clamped value with the
raw sum alongside when they differ (e.g. `TN 2 (floored, sum was 0)`) so the GM can see the modifiers
are stacking past the floor rather than silently losing them. Keep the field editable — a GM typing
`1` is still floored at roll time by `rollPool`, and per the project's ethos the field should not
fight them.

**`scripts/documents/SR3EItem.js`**
- **NEW** `static async _promptGMAttackWindow(payload, opts)`. Uses `DialogV2.wait({ render: … })` — **not** a `renderDialogV2` hook. This matters: with two attacks in flight the hook pattern's shared `#sr-gm-tn` guard cross-wires, because both hooks register before either dialog renders, so dialog A gets wired twice (the second time with B's closure variables) and dialog B gets no wiring at all — the GM ticks a checkbox and the TN silently never recomputes. A per-dialog `render` callback cannot cross-wire. Window title carries `${attackerName} → ${targetName} · ${weaponName}` plus a queue-depth line.
- Delete `_promptWeaponRollOptions` (`:1715`); move called shot / take aim / karma into `_promptFireMode`.
- `rollWeapon` — replace the two awaits with `attack.negotiate`; add `attack.commit` at the point of no return.

**`scripts/config.js`** — `SR3E.rangedCombatModifiers`, `SR3E.visibilityTable`.

**`scripts/sr3e.js`** — register the `gmApprovesTN` setting: `'off' | 'player' | 'always'`, **default `'player'`** (`requiresReload: true`). `'player'` means a GM firing NPCs at NPCs never sees the window, so the GM's added click lands only on genuine player attacks where they were adjudicating out loud anyway. `'off'` is the literal zero-click-delta escape hatch that turns a play-test rejection into a toggle rather than a revert — the thing 0c45bc5 did not have.

---

## 5. HOW EACH ADVERSARIAL BREAK IS HANDLED

| # | Break (severity) | Resolution | Stage |
|---|---|---|---|
| 1 | **RPC reimplementation** — `SR3ESocket` re-does maintained core code (fatal, raised 3×) | **Design changed.** Delete `SR3ESocket`. Use `CONFIG.queries` + `User#query`. Envelope, `to`, `_pending`, delete-first dance, timers all vanish. | 1 |
| 2 | **Stage 1 relays absolutes, not deltas** — two clients both send `3`, final is `3` for six dice (fatal) | Intent verbs. `sr3e.pool.spend {pool,n}`; the GM re-enters `actor.spendCombatPool(n)` locally so the clamp runs on live data. `sr3e.actor.set` is restricted to idempotent absolutes and **errors loudly** on an accumulator key. | 1 |
| 3 | **GM's own writes bypass the queue** — `activeGM.isSelf` short-circuit skips `queued()`, and that is the common path (fatal) | The guard is inside the helper; **both** the remote and local branches enter `SR3EQueue.run`. | 1 |
| 4 | **Reads captured before the queue** — serialisation orders writes but each acts on a pre-queue snapshot (fatal) | The read is *inside* the queued closure. | 1 |
| 5 | **Writes commit before the attacker's remaining aborts** — defender loses pool + Full Defense to an attack that never happened (fatal) | **Two-phase.** `negotiate` is pure; `commit` is a separate verb issued below the point of no return, idempotent by `requestId`, reaped on requester disconnect. | 3 |
| 6 | **Dodge deadline < GM deadline** — slow GM ⇒ defender's answer silently discarded, dialog orphaned (fatal) | Equal 300 s deadlines + explicit `sr3e.dodge.withdraw` that closes the remote dialog and toasts the defender. | 2 |
| 7 | **`gm.update` key whitelist "will bite"** (serious, self-admitted) | Whitelist deleted. Intent verbs remove the failure class; the accumulator assertion is a `ui.notifications.error`, not a `console.warn`. | 1 |
| 8 | **Full Defense: relay dispatched before the FD check** — adds a pointless click and discards the answer (serious, ×2) | `_fullDefenseDice(def)` is evaluated **before** `dodgeP` is created; `fd > 0` skips the relay entirely. Vehicle targets skip it too. | 2/3 |
| 9 | **Full-Defense announcement card silently dropped** (serious) | `_announceFullDefense` restores it, authored by the GM in the `commit` handler. | 2 |
| 10 | **`deciderFor` + default ownership** — `testUserPermission` is true for every player, random player gets the dialog (serious) | `u.character?.id` first, then **explicit** `ownership[u.id] === OWNER`, via `getDesignatedUser`. | 2 |
| 11 | **Concurrent GM dialogs cross-wire the `renderDialogV2` hook** — TN silently stops recomputing (serious) | `DialogV2.wait({render})`, verified present at `dialog.mjs:420-422`. Per-dialog callback cannot cross-wire. | 3 |
| 12 | **Concurrent GM windows stack** (serious) | One global FIFO chain for `attack.negotiate`; identifying title `A → B · weapon`; queue-depth line. | 3 |
| 13 | **`activeGM` election misunderstood** — highest-role-first, not lowest-id; an Assistant GM actually running the table loses to an idle full GM (serious) | Use `game.user.isActiveGM` (`user.mjs:86`). Show the arbiter's name in the attacker's waiting toast so a mis-election is visible in one second, not 300. World setting `combatArbiterUserId` (default empty = `activeGM`) to pin it. | 3 |
| 14 | **GM churn mid-negotiation → 180 s dead stall** (serious) | Core rejects a query when the **recipient** disconnects. `asGM` catches the tagged error and retries **once** against the new `activeGM`; second failure propagates. Handlers re-check `assertActiveGM()` on arrival. | 1 |
| 15 | **GM timeout orphan write** — attacker timed out, GM confirms later, defender silently pays (serious) | The pending entry is reaped on `userConnected` when the requester goes inactive, and `commit` never fires because the attacker is gone. `negotiate` writes nothing. | 3 |
| 16 | **Attacker dead air → double-fire** (serious) | Module-scoped `_inFlight` Set keyed `${actor.id}|${item.id}`, cleared in `finally`; plus a visible "Waiting for {GM}…" toast naming the arbiter. | 3 |
| 17 | **No GM connected → own-actor sheet writes break** (serious) | `_gmUpdate`-equivalent degrades to a **local write when `this.isOwner`**; warns and no-ops only when not owned. Full Defense and Reset Recoil keep working solo. | 1 |
| 18 | **`_mine()` ⊃ `deciderFor()`** — co-owners double-fire the dodge roll (serious) | Stamp `deciderUserId` into the dodge payload; gate on `_isDecider`. Fail-open `!a` narrowed to `game.user.isGM`. | 2 |
| 19 | **Called shot legal in Full Auto** if moved into `_promptFireMode` (serious) | Mirror the existing `#fa-section` change listener: selecting FA hides/disables the called-shot block and forces it to `'none'`, re-read in the confirm callback so a stale value cannot leak. | 3 |
| 20 | **Receiver-side double-execute** on redelivery (serious) | `SR3EQuery.once(key, fn)` — `#inflight` Map returning the same promise, bounded/LRU-trimmed at 200. | 1 |
| 21 | **Broadcast leaks payloads to every client** (serious) | Moot: core queries are server-routed point-to-point. | 1 |
| 22 | **TN field replaced by checkboxes** — houserules unreachable; design internally contradictory (minor) | `#sr-gm-tn` stays an **editable number input** that checkboxes fold into, exactly like the existing `#sr-tn` / `#sr-range` relationship. Amber breakdown retained as checked rows. | 3 |
| 23 | **`_promptCombatPool` AoE call site missed** — `null > 0` swallows the abort (minor) | Both `:744` and `:969` change in commit 0a. | 0a |
| 24 | **Silent clamp divergence** — defender declares 8, gets 3, never told (minor) | When `committed !== requested`, the GM notifies the decider and the clamped number is rendered on the public dodge button. | 3 |
| 25 | **Self-target opens two dialogs** (minor) | `merged = decider === context.user.id \|\| decider === game.user.id`. | 3 |
| 26 | **`actorId` cannot address unlinked token actors** (minor) | New verbs carry `actor.uuid`; `SR3EQuery.resolve()` accepts a bare id for the legacy chat payloads. | 1 |
| 27 | **`queued()` `.then(fn,fn)` arg leak + unbounded map** (minor) | `.then(() => fn(), () => fn())` + self-pruning tail check. | 1 |
| 28 | **Client-authored `from` is spoofable** (minor) | Moot: core supplies the authenticated sender as `context.user`. | 1 |
| 29 | **Version mis-stated as v13** (minor) | Commit 0d. | 0d |
| 30 | **`handleAssignDamage` lying button** (minor) | Commit 0c. | 0c |
| 31 | **Duplicate `refreshAstralPool`** (minor) | Commit 0b. | 0b |
| 32 | **`_claimBtn` per-tab; reload re-arms all history** | **NOT SOLVED — honestly out of scope.** Partial mitigation only: `sr3e.damage.apply` takes an optional `claimKey` and the GM refuses repeats from a module-scoped Set, which closes cross-client double-click *at the writer*. The durable ChatMessage-flag ledger that would fix all 37 selectors is a separate commit. | 1 (partial) |

---

## 6. CLICK BUDGET

Single-target firearm, non-vehicle target, attacker has the skill, target already selected. Counting only clicks needed to get dice on the table (explosion clicks are unchanged and excluded).

| Step | Today | After |
|---|---|---|
| Weapon dice icon | A | A |
| Fire-mode dialog Confirm | A | A *(now also carries called shot / take aim / karma)* |
| Roll-options dialog Confirm | **A** | *(deleted — TN moves to the GM window)* |
| Dodge declaration Confirm | **A** *(wrong screen)* | **D** |
| Combat-pool Confirm | A | A |
| GM TN + modifiers Confirm | — | **G** |
| **Pre-roll totals** | **A 5 · D 0 · G 0** | **A 3 · D 1 · G 1** |
| Dodge roll button | *whoever* (in practice A) | D *(gated)* |
| Soak roll button | *whoever* (in practice A) | D *(gated)* |

**Attacker: 5 → 3.** The modal chain's bottleneck human loses two clicks.
**Defender: 0 → 1** new click — the declaration they should always have had. Their dodge-roll and soak clicks already existed; those merely stop being clickable by the attacker.
**GM: 0 → 1.**

Two honest points about the GM's +1.

First, **it is the requirement, not overhead.** Requirement 3 literally asks for a GM window with modifier checkboxes. This is the categorical difference from 0c45bc5, whose added clicks were pure transport ceremony ("🎲 Roll Attack" existed only to resume a promise) and whose GM got **+2 per attack on every exchange in the session**, including PC-vs-PC fights they had no part in.

Second, **it is bounded and switchable.** `gmApprovesTN` defaults to `'player'`, so a GM running NPC-vs-NPC never sees it. When the GM owns the defender — the single most common case, a player shooting an NPC — `deciderFor` returns the GM, the `merged` branch fires, and the **dodge rows render inside the TN window**: still one GM dialog, and **zero socket hops**. And `'off'` restores today's behaviour exactly, so a play-test rejection is a setting change rather than a revert.

**Chat entries per attack: unchanged.** No hand-off card is created. The only chat addition anywhere is the restored Full-Defense announcement, which fires once per *declaration*, not per attack, and which exists in today's code already.

---

## 7. EXPLICITLY OUT OF SCOPE

Named so nobody relitigates them mid-implementation.

- **Melee, astral, cybercombat, MIJI, vehicle weapons, spells.** All keep today's behaviour. Melee already runs through a public boxing card that play-test never rejected. The four boxing cards (`postMeleeCard` / `postCybercombatCard` / `postAstralCard` / `postMIJICard`) share one shape, and fixing the shape once with per-corner ownership is a separate task worth doing — not a stretch goal on this one. *(Exception: `promptDefaultChoice`'s three-line guard in Stage 2 incidentally fixes the melee, vehicle-pilot and cybercombat defaulting relays. That is deliberate — one edit, no call-site changes.)*
- **AoE / grenades / spell AoE.** Untouched. Record in CLAUDE.md that `_placeBlastTemplate` **structurally cannot** move off the aiming client — canvas aiming is inherently local; it must ship `{center, radius}` as data.
- **Moving dice to the GM.** Dice stay local, deliberately. `_rollWave` is bare `Math.random()`, never persisted, surviving only as card HTML. Pinning it to the GM buys nothing and would cost the attacker their own explosion clicks. **GM authority is over the ledger, not the randomness.** Write this into CLAUDE.md.
- **`_postWaveCard`.** 980 lines of renderer *and* rules engine. Not moved.
- **The durable claim ledger.** ChatMessage-flag persistence + teaching `_checkBtn` to read it. Fully independent of everything here; ships on its own and fixes all 37 selectors at once.
- **The explosion-payload whitelist drift** (`SR3EActor.js:2811`) — real, live, and orthogonal. `ammoType`, `fallingContext`, `escapeContext`, `dodgePayload` and `meleeCtx` are all silently dropped when a die explodes. **File it as its own task; it is arguably higher user-visible impact than requirement 3.**
- **The stale `flags.sr3e` scope** (TODO #14).
- **Dead `_handleKarmaReroll`** (`SR3EActor.js:3421`) — no callers. Do not port it.
- **The 19 `renderDialogV2` hook sites.** Stage 3 uses `render:` for the new dialog only; converting the rest is a follow-up pass enabled by the CLAUDE.md correction in 0d.

---

## 8. TEST PLAN

### Manual — two browser windows (GM + Player), one world

Set up: Player owns PC "Dave"; GM owns NPC "Ganger". A second PC "Mika" owned by the Player for the PC-vs-PC cases.

**Stage 1 (no UI change — verify persistence, not appearance)**

1. *The live bug.* Player attacks Ganger, declares 3 dodge dice. **Before:** red permission toast on the player, Ganger's `combatPoolSpent` unchanged. **After:** no toast, GM's sheet shows Ganger down 3.
2. *Clamp on the writer.* Ganger has 4 pool left. Player attacks twice in one phase declaring 3 each. Expect **4 spent, not 6, and not 3** — the second clamps to what actually remains.
3. *Assign Damage.* Player clicks Assign on a Ganger soak card. Wounds actually rise on the GM's sheet; the button says `✓` only after the write.
4. *No GM connected.* GM logs out. Player toggles Full Defense and Reset Recoil on Dave. Both must still work (own actor). Player clicks Assign Damage on Ganger — expect a clear warning, no silent no-op.
5. *Solo GM.* GM alone in the world runs a full attack. Expect **zero** query traffic (`CONFIG.debug.queries = true` to confirm) and byte-identical behaviour to today.
6. *Assistant GM.* Log in an Assistant GM alongside a full GM; confirm the full GM is elected (this is the direction core actually chooses).

**Stage 2**

7. Player attacks Ganger → dodge dialog appears on **GM's** screen (GM is Ganger's decider), not the player's.
8. GM attacks Dave → dodge dialog on the **player's** screen. Attacker's client shows a waiting toast naming the arbiter.
9. *Full Defense.* Dave declares Full Defense; GM attacks. **No dialog on the player at all**, pool auto-committed, announcement card posted. This must be **zero** extra clicks.
10. *Withdraw.* GM attacks Dave; player leaves the dialog open; GM presses "⏭ Roll — no dodge". Player's dialog must **close itself** with an explanatory toast.
11. *Offline owner.* Player logs out; GM attacks Dave → dialog falls to the GM.
12. *Default ownership trap.* Set Actors-directory default ownership to Owner. GM attacks an NPC with no players involved. The player must **not** receive a dialog.
13. *Cancel semantics.* Player cancels the dodge dialog → attack proceeds at 0 dice (does **not** abort the attacker's turn).
14. *Chat gating.* On the public attack card, the attacker's "roll to dodge" button is disabled; the defender's is live.

**Stage 3**

15. Player attacks → GM window opens with checkbox rows; ticking "Partial cover" moves the TN by +4 live; the TN field remains editable and its typed value wins.
16. *Concurrent.* Two players fire within a second. GM windows must **queue**, not stack; each is titled with its own attacker→target; ticking a box in the second window must still recompute (this is the cross-wiring regression).
17. *Abort after verdict.* Player attacks with a weapon they have no skill for; GM confirms the TN window; player **cancels** the defaulting dialog. Defender's pool must be **unchanged** and Full Defense **still set**.
18. *GM cancel.* GM cancels the TN window → clean abort, nothing spent on either side.
19. *Merged dodge.* Player attacks a GM-owned NPC → dodge radio group renders **inside** the TN window; GM total is one dialog.
20. *FA + called shot.* Select Full Auto in fire-mode; the called-shot control must disable and force to `none`.
21. *Setting.* `gmApprovesTN: 'off'` → click counts identical to today.

### Unit tests (`SR3EQuery` / `SR3EQueue` are pure and testable without Foundry)

- `SR3EQueue.run` — ordering under concurrency; **the read observes the previous task's write** (the specific defect that makes the naive version wrong); no argument leaks into `fn`; the map self-prunes.
- `deciderFor` — assigned-character precedence; explicit-owner precedence over `default: OWNER`; inactive owners excluded; GM fallback; null when no GM.
- `foldModifiers` — every row in `SR3E_RANGED_MODIFIERS`; `per:true` multipliers; negative modifiers; **TN floor of 2** ("No target number can ever be less than 2", p.112 — currently unenforced anywhere in the codebase, worth adding here).
- `SR3EQuery.once` — a redelivered key returns the identical promise; LRU trims at 200.
- `sr3e.actor.set` accumulator assertion — sending `system.combatPoolSpent` throws.
- `stageDamage` / `parseDamageCode` regression guard (already pure; cheap insurance while touching this area).

---

## Summary of what changed from the brief's accepted design

1. **The transport is deleted.** `scripts/SR3ESocket.js` is not built. Core `CONFIG.queries` + `User#query` replaces ~150 lines of correlation/registry/timeout code with a maintained API that also gets recipient-disconnect rejection and point-to-point routing right. This is the single largest reduction in both code and risk.
2. **Stage 1 relays intents, not changes-objects.** As specified it would have shipped "the single biggest structural win" that bought permission without correctness, while the writeup sold it as both.
3. **The negotiation is split from the commit,** so the "nothing commits until every slot is filled" invariant is structural. As specified, the design shipped a brand-new abort path into a window it believed was closed.
4. **Full Defense is checked before the relay is dispatched,** and its announcement card is restored. As specified it added a click in the one posture that today has zero — the exact constraint that got 0c45bc5 reverted.
5. **`DialogV2.wait({render})` replaces the `renderDialogV2` hook** for the GM window, which deletes the concurrent-dialog cross-wiring bug class outright rather than guarding against it.

The thing I'd most want the maintainer to weigh in on before Stage 3: **the Visibility Table's slash notation**, and whether the GM window should render a computed number there at all versus the verbatim string plus a typed TN.

> **✅ Answered 2026-08-05.** First number = cybernetic/electronic vision, second = natural vision
> (core p.111 prose + the Perception Table footnote). The window *can* render a computed number,
> since the system knows metatype and cyberware — but visibility is **out of the MVP** either way.
> See "RESOLVED — the Visibility Table slash notation" and the maintainer decisions in §2.