/**
 * `sr3e.attack.negotiate` — does the GM's TN window run, and does the caller know?
 *
 * The handler answers TWO questions with one payload, and conflating them was TODO 50:
 *
 *   "what is the TN"        -> `tn`
 *   "did a GM adjudicate"   -> `adjudicated`
 *
 * The caller locks the attacker's TN field on the second one. It used to infer that from
 * the payload instead, testing `negotiation?.mods` — and the skip path returns `mods: {}`,
 * which is TRUTHY. So every GM-run NPC-vs-NPC attack locked the attacker's TN field while
 * opening no window to change it in: a target number nobody could set, by any route.
 *
 * That is why `adjudicated` is asserted as an explicit boolean here rather than inferred,
 * and why the truthiness of `mods` is pinned directly — it is the exact shape that lied.
 */
import { installGlobals, installGame } from './helpers/foundry.mjs';

installGlobals();

const { SR3EQuery } = await import('../scripts/SR3EQuery.js');

export const name = 'attack-negotiate';

let _rid = 0;

/** Build a world, register the handlers, and return the negotiate query. */
function harness({ mode = 'player', requesterIsGM = false, windowResult = { tn: 9, mods: { recoil: 2 } } } = {}) {
  let windowOpened = false;

  installGame({
    settings: { gmApprovesTN: mode },
    sr3e: {
      SR3EActor: {},
      SR3EItem: {
        _promptGMAttackWindow: async () => { windowOpened = true; return windowResult; },
      },
    },
  });

  // installGame's `users` only carries activeGM; the handler also looks the requester up.
  globalThis.game.users.get = () => ({ isGM: requesterIsGM });
  globalThis.CONFIG = { queries: {} };   // register() assigns into it, it does not create it

  SR3EQuery.register();

  const ctx = { attackerUuid: 'Actor.a', defenderUuid: 'Actor.b', weaponId: 'w', baseTN: 4 };
  return {
    // `rid` must be unique across the WHOLE file, not per harness: SR3EQuery.once memoizes
    // by rid in a module-level map that survives re-registration, so a per-harness counter
    // makes a later call silently replay an earlier harness's answer.
    call: () => globalThis.CONFIG.queries['sr3e.attack.negotiate']({ rid: `rid-${++_rid}`, ...ctx }),
    opened: () => windowOpened,
  };
}

export async function run(t) {
  /* ---- the skip paths: no window, and the caller must be TOLD no window ran ---- */
  {
    const h = harness({ mode: 'player', requesterIsGM: true });
    const res = await h.call();
    t.is('GM attacking their own NPC opens no window', h.opened(), false);
    t.is('and the TN passes through untouched',        res.tn, 4);
    t.is('adjudicated is explicitly false',            res.adjudicated, false);

    // THE REGRESSION. `mods` is an object, so it is truthy even when empty — any caller
    // testing it concludes a GM set the TN. Both halves are asserted so that "fixing" one
    // by dropping `mods` from the payload cannot quietly reintroduce the other.
    t.ok('mods is truthy despite nobody adjudicating',   Boolean(res.mods));
    t.is('but it is EMPTY',                              Object.keys(res.mods).length, 0);
    t.ok('so mods must never be used as the signal',     res.adjudicated === false && Boolean(res.mods));
  }

  {
    const h = harness({ mode: 'off', requesterIsGM: false });
    const res = await h.call();
    t.is('mode "off" opens no window even for a player', h.opened(), false);
    t.is('and reports it',                               res.adjudicated, false);
    t.is('TN untouched',                                 res.tn, 4);
  }

  /* ---- the adjudicating paths ---- */
  {
    const h = harness({ mode: 'player', requesterIsGM: false });
    const res = await h.call();
    t.is('a PLAYER attacking opens the window', h.opened(), true);
    t.is('adjudicated is true',                 res.adjudicated, true);
    t.is('and the GM\'s TN is returned',        res.tn, 9);
  }

  {
    const h = harness({ mode: 'always', requesterIsGM: true });
    const res = await h.call();
    t.is('mode "always" opens the window for the GM too', h.opened(), true);
    t.is('adjudicated is true',                           res.adjudicated, true);
  }

  // A GM who opens the window and changes nothing has still DECIDED. The lock is keyed on
  // adjudication, not on movement, so "I looked, 4 is right" still binds the attacker.
  {
    const h = harness({ mode: 'always', requesterIsGM: true, windowResult: { tn: 4, mods: {} } });
    const res = await h.call();
    t.is('an unchanged TN is still adjudicated', res.adjudicated, true);
    t.is('and equals the base',                  res.tn, 4);
  }

  /* ---- cancellation stays null, and must not read as an adjudication ---- */
  {
    const h = harness({ mode: 'always', requesterIsGM: true, windowResult: null });
    const res = await h.call();
    t.is('a cancelled window returns null', res, null);
  }
}
