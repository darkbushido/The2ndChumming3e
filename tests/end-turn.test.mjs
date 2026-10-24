/**
 * A player's End Turn (TODO 241). Seen in play, 2026-10-23: a player moved their character, clicked End Turn and
 * Foundry said they lacked permission. Core lets a player write only `round`, `turn` and `combatants` on a Combat
 * (common/documents/combat.mjs `#canUpdate`); SR3ECombat.nextTurn also writes the queue flags, so the player's
 * client must hand the advance to the GM — `sr3e.combat.nextTurn`.
 */
import { readFileSync } from 'node:fs';
import { installGlobals } from './helpers/foundry.mjs';
installGlobals();
const { SR3ECombat } = await import('../scripts/documents/SR3ECombat.js');

export const name = 'end-turn';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  const users = {
    gm:     { id: 'gm', isGM: true },
    owner:  { id: 'owner', isGM: false },
    other:  { id: 'other', isGM: false },
  };
  const owned = (ownerId) => ({ testUserPermission: (u, lvl) => lvl === 'OWNER' && u?.id === ownerId });

  /** A started combat whose acting combatant belongs to `owner`; counts GM-side advances. */
  function world({ started = true, acting = 'c1' } = {}) {
    const combat = Object.create(SR3ECombat.prototype);
    combat.id = 'cb';
    combat.started = started;
    combat.advanced = 0;
    Object.defineProperty(combat, 'combatant', { get: () => (acting ? { id: acting, ...owned('owner'), actor: owned('owner') } : null) });
    combat.nextTurn = async function () { this.advanced++; return this; };   // the GM-side advance itself
    const asGM = [];
    globalThis.CONFIG.queries = {};
    globalThis.game = {
      user: users.owner,
      users: { get: id => users[id] },
      combats: { get: id => (id === 'cb' ? combat : undefined) },
      sr3e: { SR3EQuery: {
        once: (_rid, fn) => fn(),
        assertActiveGM: () => {},
        asGM: async (verb, data) => { asGM.push({ verb, data }); return { ok: true }; },
      } },
    };
    SR3ECombat.registerNextTurn();
    const ask = (requester, data = {}) =>
      CONFIG.queries['sr3e.combat.nextTurn']({ rid: String(Math.random()), combatId: 'cb', combatantId: 'c1', _requesterId: requester, ...data });
    return { combat, asGM, ask };
  }

  /* ── The GM-side handler ─────────────────────────────────────────────────── */
  {
    const { combat, ask } = world();
    t.eq('the acting combatant\'s owner may end the turn', await ask('owner'), { ok: true });
    t.is('…and the GM advances the combat once', combat.advanced, 1);
  }
  {
    const { combat, ask } = world();
    t.eq('another player may not', await ask('other'), { ok: false, reason: 'it is not your turn' });
    t.is('…and nothing advances', combat.advanced, 0);
  }
  {
    const { combat, ask } = world();
    t.eq('a GM asking through the verb may', await ask('gm'), { ok: true });
    t.is('…once', combat.advanced, 1);
  }
  {
    const { combat, ask } = world({ acting: 'c2' });
    t.eq('a click for a turn that has already moved on is refused — a double click skips nobody',
      await ask('owner'), { ok: false, reason: 'the turn has already moved on' });
    t.is('…nothing advances', combat.advanced, 0);
  }
  {
    const { ask } = world({ started: false });
    t.is('a combat that is not running is refused', (await ask('owner')).ok, false);
  }

  /* ── The player's client hands the advance to the GM ─────────────────────── */
  {
    const { asGM } = world();
    const combat = Object.create(SR3ECombat.prototype);
    combat.id = 'cb';
    Object.defineProperty(combat, 'combatant', { get: () => ({ id: 'c1' }) });
    let wrote = false;
    combat.update = async () => { wrote = true; };
    combat.pruneQueue = async () => { wrote = true; return null; };
    await combat.nextTurn();
    t.eq('a player\'s nextTurn asks the GM, naming the combatant they saw acting',
      asGM.map(q => [q.verb, q.data.combatId, q.data.combatantId]), [['sr3e.combat.nextTurn', 'cb', 'c1']]);
    t.ok('…and writes nothing itself (Foundry would refuse the flags)', !wrote);
  }

  t.ok('the verb is registered at init', /SR3ECombat\.registerNextTurn\(\)/.test(read('scripts/sr3e.js')));
}
