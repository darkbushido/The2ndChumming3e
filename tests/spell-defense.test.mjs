/**
 * Spell Defense declaration routing — SR3EActor.promptSpellDefenseDeclaration.
 *
 * The bug this guards: declaring used to be ONE public chat card carrying a row per
 * Sorcery-capable actor, so whoever clicked Commit — in practice the GM, since they are
 * the one advancing the round — allocated every player mage's Sorcery and Spell Pool
 * dice. That is the dodge bug in a different costume, and worse: Spell Defense commits
 * Spell Pool for the WHOLE Combat Turn, so a bad guess costs the player their
 * spellcasting rather than a single exchange.
 *
 * Two properties are asserted, and they fail in opposite directions:
 *
 *   1. Each mage is asked on THEIR OWN decider. A regression that re-centralises the
 *      decision shows up as every ask going to one user.
 *   2. Round start does NOT block on a human. The asks are fired in parallel and
 *      deliberately not awaited as a set — an active-but-AFK mage would otherwise hold
 *      the whole table for the full query timeout.
 */
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');

/** A combatant wrapping an actor, optionally Sorcery-capable. */
function combatant(id, { sorcery = true } = {}) {
  return {
    actor: {
      id, name: id, uuid: `Actor.${id}`,
      items: sorcery ? [{ type: 'skill', name: 'Sorcery', system: { rating: 5 } }] : [],
    },
  };
}

export const name = 'spell-defense';

export async function run(t) {
  /** Install a SR3EQuery stub that records every ask instead of opening dialogs. */
  const setup = (askImpl) => {
    const asks = [];
    const SR3EQuery = {
      // Each actor's decider is its own id, so "who was asked" is directly readable.
      deciderFor: actor => `user-for-${actor.id}`,
      ask: (userId, verb, data, opts) => {
        asks.push({ userId, verb, data, opts });
        return askImpl ? askImpl(userId) : Promise.resolve(null);
      },
    };
    installGame({ sr3e: { SR3E, SR3EQuery, SR3EActor } });
    return asks;
  };

  /* ---- one ask per mage, each to that mage's own decider ---- */
  {
    const asks = setup();
    await SR3EActor.promptSpellDefenseDeclaration([combatant('mage-a'), combatant('mage-b')]);

    t.is('one declaration per Sorcery-capable actor', asks.length, 2);
    t.is('each is routed to that actor\'s OWN decider',
      asks.map(a => a.userId).join(','), 'user-for-mage-a,user-for-mage-b');
    t.is('and carries that actor, not the whole roster',
      asks.map(a => a.data.actorUuid).join(','), 'Actor.mage-a,Actor.mage-b');
    t.ok('every ask names the spell-defense verb',
      asks.every(a => a.verb === 'sr3e.spelldefense.declare'),
      `verbs: ${asks.map(a => a.verb).join(',')}`);
    // The reaper rule: an unreachable decider must declare nothing, never cancel or hang.
    t.ok('an unreachable decider falls back to declaring nothing',
      asks.every(a => a.opts?.fallback === null));
    // Distinct exchange ids — a shared one would let one withdrawal close both dialogs.
    t.is('each exchange is tracked separately',
      new Set(asks.map(a => a.data.exchangeId)).size, 2);
  }

  /* ---- actors without Sorcery are not asked ---- */
  {
    const asks = setup();
    await SR3EActor.promptSpellDefenseDeclaration([
      combatant('mage', { sorcery: true }),
      combatant('grunt', { sorcery: false }),
    ]);
    t.is('a combatant with no Sorcery skill is not asked', asks.length, 1);
    t.is('and it is the mage who was', asks[0].data.actorUuid, 'Actor.mage');
  }

  /* ---- an actorless combatant is skipped, not fatal ---- */
  {
    const asks = setup();
    let threw = false;
    try { await SR3EActor.promptSpellDefenseDeclaration([{ actor: null }, combatant('mage')]); }
    catch { threw = true; }
    t.is('a combatant with no actor does not throw', threw, false);
    t.is('and the real mage is still asked', asks.length, 1);
  }

  /* ---- nothing to ask means no work at all ---- */
  {
    const asks = setup();
    await SR3EActor.promptSpellDefenseDeclaration([combatant('grunt', { sorcery: false })]);
    t.is('a party with no mages asks nobody', asks.length, 0);
  }

  /* ---- round start must not block on a human ----
   * The load-bearing one. A mage who never answers must not hold up the round: if these
   * asks were awaited as a set, an active-but-AFK player would freeze the table until the
   * query timed out. Here the ask never settles at all — the call must still return.
   */
  {
    const asks = setup(() => new Promise(() => {}));   // never resolves, never rejects
    let returned = false;
    const call = SR3EActor.promptSpellDefenseDeclaration([combatant('afk-mage')])
      .then(() => { returned = true; });
    // Yield generously; an awaited hang would still be pending after these turns.
    for (let i = 0; i < 10; i++) await Promise.resolve();
    await call;
    t.is('a mage who never answers does not block round start', returned, true);
    t.is('and their dialog was still opened', asks.length, 1);
  }

  /* ---- a rejected ask is contained ----
   * The asks are fired without being awaited, so an unhandled rejection would surface as
   * a process-level warning (and, on newer Node, could take the client down) rather than
   * anything the caller could catch.
   */
  {
    setup(() => Promise.reject(new Error('decider exploded')));
    let threw = false;
    try { await SR3EActor.promptSpellDefenseDeclaration([combatant('mage')]); }
    catch { threw = true; }
    // Let the rejection propagate to any handler before the suite moves on.
    for (let i = 0; i < 10; i++) await Promise.resolve();
    t.is('a failing declaration does not escape into round start', threw, false);
  }
}
