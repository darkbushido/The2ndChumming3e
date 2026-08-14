/**
 * Spirit flag scope — `SR3ESpiritSummoning._spiritFlag`.
 *
 * ── WHAT WAS WRONG, AND WHY IT HID ───────────────────────────────────────────────────
 *
 * Spirits were created with `flags.sr3e.*`, but `sr3e` is not a valid flag scope. Foundry
 * accepts only `core`, `world`, `game.system.id` and active module ids
 * (`client/data/client-backend.mjs` → `getFlagScopes`), and this system's id is
 * `The2ndChumming3e`.
 *
 * The two directions behave completely differently, which is the whole reason this survived:
 *
 *   • A RAW create payload (`{ flags: { sr3e: {...} } }`) is **not** scope-validated. The
 *     data was written happily, with no error anywhere.
 *   • `getFlag` and `setFlag` **both THROW** on an invalid scope — `document.mjs:949` and
 *     `:976`, an explicit `throw new Error("Flag scope ... is not valid")`.
 *
 * ⚠ TODO 14 recorded this as "the reads return undefined and silently fall back to their
 * `??` defaults". They do not. They throw, so the spirit list and the banishing dialog were
 * broken outright rather than quietly degraded — a worse symptom than the task described,
 * and the reason to check the engine rather than trust the note.
 *
 * A third bug sat alongside: `services` was READ from the raw path `flags.sr3e.services` and
 * WRITTEN with `setFlag(SYSTEM, 'services')`. Both operations succeeded, on different keys,
 * so a spirit's services never decreased and it never departed.
 */
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3ESpiritSummoning } = await import('../scripts/documents/SR3ESpiritSummoning.js');

export const name = 'spirit-flags';

const SYS = 'The2ndChumming3e';

/**
 * An actor stub that enforces Foundry's real contract: `getFlag` THROWS on a scope outside
 * `getFlagScopes()`. That is the point of the stub — a helper that reaches for the legacy
 * data with `getFlag('sr3e', …)` would blow up here exactly as it does in the client.
 */
function stubActor({ modern = null, legacy = null } = {}) {
  const flags = {};
  if (modern) flags[SYS] = { ...modern };
  if (legacy) flags.sr3e = { ...legacy };
  return {
    flags,
    getFlag(scope, key) {
      if (!['core', 'world', SYS].includes(scope)) {
        throw new Error(`Flag scope "${scope}" is not valid or not currently active`);
      }
      return flags[scope]?.[key];
    },
  };
}

export async function run(t) {
  const f = (a, k) => SR3ESpiritSummoning._spiritFlag(a, k);

  // ── The normal path ────────────────────────────────────────────────────────
  t.is('reads a flag written under the system id',
    f(stubActor({ modern: { force: 5 } }), 'force'), 5);
  t.is('reads the conjurer id the banish dialog compares against',
    f(stubActor({ modern: { conjurerId: 'abc' } }), 'conjurerId'), 'abc');
  t.is('a missing key is undefined, not an error',
    f(stubActor({ modern: { force: 5 } }), 'services'), undefined);
  t.is('an actor with no flags at all is undefined',
    f(stubActor(), 'force'), undefined);

  // ── The legacy path — spirits summoned BEFORE the fix ─────────────────────
  // These exist in live worlds. Without the fallback they become unbindable the moment the
  // namespace is corrected, which would trade one broken state for another.
  t.is('falls back to the pre-fix raw path so old spirits still resolve',
    f(stubActor({ legacy: { force: 3 } }), 'force'), 3);
  t.is('and for isSpirit, which is what filters the spirit list',
    f(stubActor({ legacy: { isSpirit: true } }), 'isSpirit'), true);

  // ── THE ASSERTION THAT MATTERS MOST ───────────────────────────────────────
  // The stub throws on an invalid scope, exactly as Foundry does. So this passing is proof
  // the helper reads the legacy data by RAW PATH and never via getFlag. "Simplifying" the
  // fallback to `getFlag('sr3e', key)` looks tidier and throws on every pre-fix spirit.
  let threw = false;
  try { f(stubActor({ legacy: { force: 3 } }), 'force'); } catch { threw = true; }
  t.ok('the legacy fallback must NOT go through getFlag — that scope throws', !threw);

  // And prove the stub really would throw, so the test above is not vacuous.
  let stubThrows = false;
  try { stubActor({ legacy: { force: 3 } }).getFlag('sr3e', 'force'); } catch { stubThrows = true; }
  t.ok('the stub enforces the real contract — getFlag on "sr3e" throws', stubThrows);

  // ── Precedence ────────────────────────────────────────────────────────────
  // A spirit could carry both after a partial write. Current data wins; the legacy value is
  // a last resort, never an override.
  t.is('the system scope wins when both are present',
    f(stubActor({ modern: { force: 6 }, legacy: { force: 3 } }), 'force'), 6);

  // ⚠ `??`, not `||`. Services legitimately reach 0 — that is precisely when a spirit should
  // depart — and `||` would fall through to a stale legacy count and keep it bound.
  t.is('a modern value of 0 is kept, not treated as absent',
    f(stubActor({ modern: { services: 0 }, legacy: { services: 3 } }), 'services'), 0);
  t.is('a modern value of false is kept too',
    f(stubActor({ modern: { isSpirit: false }, legacy: { isSpirit: true } }), 'isSpirit'), false);

  t.is('null actor does not throw', f(null, 'force'), undefined);
}
