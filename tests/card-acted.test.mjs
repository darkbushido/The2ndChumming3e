/**
 * `sr3e.card.mark` — the shared "who has acted" ledger (TODO 42).
 *
 * The bug this exists for: both mechanisms that mark a chat button as used
 * (`_usedButtons` and `btn.disabled`) are per CLIENT. A player clicked Dodge, their
 * button greyed out, and the GM's copy of the card still showed a live button with no
 * way to tell "thinking" from "already answered".
 *
 * Message flags fix it because they are document data — Foundry syncs them. What these
 * assertions protect is the ledger's two structural promises:
 *
 *   1. APPEND-ONLY. The first claim on a role stands; a second click cannot overwrite
 *      it. [#24]'s agreed flow is "the last one to submit triggers the roll", which is
 *      only well-defined if who-was-first is immutable.
 *   2. INDEPENDENT ROLES. Marking the defender must not disturb the attacker, or a
 *      two-corner card would lose one side's submission as the other arrives.
 */
import { installGlobals, installGame } from './helpers/foundry.mjs';

installGlobals();

const { SR3EQuery } = await import('../scripts/SR3EQuery.js');

export const name = 'card-acted';

let _rid = 0;

/** A world with one chat message whose flags behave like Foundry's. */
function harness({ isGM = true } = {}) {
  const flags = {};
  const message = {
    id: 'msg1',
    getFlag: (_ns, key) => flags[key],
    setFlag: async (_ns, key, val) => { flags[key] = val; return message; },
  };

  installGame({});
  globalThis.game.messages = { get: id => (id === 'msg1' ? message : null) };
  globalThis.game.users.activeGM = { isSelf: isGM };
  globalThis.CONFIG = { queries: {} };
  SR3EQuery.register();

  return {
    mark: (role, label) => globalThis.CONFIG.queries['sr3e.card.mark'](
      { rid: `rid-${++_rid}`, messageId: 'msg1', role, label }),
    markOn: (messageId, role) => globalThis.CONFIG.queries['sr3e.card.mark'](
      { rid: `rid-${++_rid}`, messageId, role, label: role }),
    flags,
  };
}

export async function run(t) {
  /* ---- a first claim records, and reports itself as new ---- */
  {
    const h = harness();
    const res = await h.mark('defender', 'Snot');
    t.is('the role is recorded',        res.acted.defender.label, 'Snot');
    t.is('and reported as a new claim', res.already, false);
    t.ok('a timestamp is stored',       typeof res.acted.defender.at === 'number');
    t.ok('it landed in the message flag', !!h.flags.acted?.defender);
  }

  /* ---- APPEND-ONLY: the first claim stands ----
   * Without this, whoever clicks last wins and "the last one to submit triggers the
   * roll" has no stable notion of who was already in.
   */
  {
    const h = harness();
    await h.mark('defender', 'Snot');
    const second = await h.mark('defender', 'Somebody Else');
    t.is('a second claim does NOT overwrite the first', second.acted.defender.label, 'Snot');
    t.is('and says so',                                 second.already, true);
  }

  /* ---- roles are independent ---- */
  {
    const h = harness();
    await h.mark('attacker', 'Liam');
    const res = await h.mark('defender', 'Snot');
    t.is('the attacker survives a defender write', res.acted.attacker.label, 'Liam');
    t.is('and the defender is recorded',           res.acted.defender.label, 'Snot');
    t.is('both are present',                       Object.keys(res.acted).length, 2);
  }

  /* ---- label defaults to the role, so a missing name never renders "undefined" ---- */
  {
    const h = harness();
    const res = await h.mark('soaker');
    t.is('a missing label falls back to the role', res.acted.soaker.label, 'soaker');
  }

  /* ---- refuses to write from a non-GM client ----
   * Only a GM may update a message they do not own; the client helper routes for this
   * reason, and the handler must not quietly succeed if that routing is bypassed.
   */
  {
    const h = harness({ isGM: false });
    let threw = false;
    try { await h.mark('defender', 'Snot'); } catch { threw = true; }
    t.ok('a non-GM client is refused', threw);
  }

  /* ---- unknown message and missing role are errors, not silent no-ops ---- */
  {
    const h = harness();
    let threw = false;
    try { await h.markOn('nope', 'defender'); } catch { threw = true; }
    t.ok('an unknown message throws', threw);

    let threw2 = false;
    try { await h.mark(''); } catch { threw2 = true; }
    t.ok('a missing role throws', threw2);
  }
}
