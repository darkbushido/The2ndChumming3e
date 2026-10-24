/**
 * Which of Foundry's core token statuses the Token HUD offers · TODO 247.
 *
 * The maintainer, in play 2026-10-23: "shadowrun doesnt use all of them and it would be nice to cut it
 * down". Foundry 14 ships 36 core statuses (frozen, holy shield, cursed …); the GM picks which ones the
 * HUD shows in Configure Settings → System → Token Status Effects, defaulting to the SR3 set below.
 *
 * ⚠ **HIDE, NEVER REMOVE.** A hidden status gets `hud: false` (Foundry 14.365.0 `token-hud.mjs:98` skips
 * it) and stays in `CONFIG.statusEffects`, because removing it would break three things:
 *   - `Actor#toggleStatusEffect` THROWS for an id not in the list (`actor.mjs:544`) — any macro or module
 *     naming it would fail;
 *   - `CONFIG.specialStatusEffects` (DEFEATED, INVISIBLE, BLIND, BURROW, HOVER, FLY) must keep resolving;
 *   - an existing token's effect still needs its name and icon.
 * A token already carrying a hidden status keeps it: the token draws effects from the actor, not from the
 * config (`token.mjs` `_drawEffects`), and `SR3ETokenHUD` lists it, lit, so the GM can still click it off
 * (`hiddenActiveStatusIds` below).
 *
 * The system's own `sr3e-*` statuses are always shown, and so is every core id the system's code toggles
 * (`ALWAYS_SHOWN`; `tests/status-effects.test.mjs` fails if code names a core id that is not there).
 * Pure — no Foundry.
 */

/** Prefix of the system's own statuses — always shown, never offered in the setting. */
export const SYSTEM_PREFIX = 'sr3e-';

/** Is this one of the system's own statuses? */
export const isSystemStatus = id => typeof id === 'string' && id.startsWith(SYSTEM_PREFIX);

/**
 * Core statuses the system's code toggles or reads — always shown, whatever the setting says, so the GM
 * can always undo what the system did.
 *   - `dead`        — the `updateActor` hook's skull overlay (SR3 p.125); also `specialStatusEffects.DEFEATED`
 *   - `unconscious` — the same hook, a full track (SR3 p.125); read by `SR3EActor` (sustaining)
 *   - `prone`       — the result card's Mark prone button (SR3 p.105 Drop Prone)
 */
export const ALWAYS_SHOWN = Object.freeze(['dead', 'unconscious', 'prone']);

/**
 * The default SR3 set of CORE statuses, with the reason each earns its place (printed pages, SR3 core).
 * Everything else Foundry ships (sleep, stun, frozen, shock, corrode, bleeding, curse, regen, degen,
 * hover, burrow, upgrade, downgrade, target, eye, bless, the four shields, deaf) is hidden by default.
 */
export const SR3_REASONS = Object.freeze({
  dead:        'SR3 p.125-126 — physical overflow past Body; set by the system',
  unconscious: 'SR3 p.125 — a full Stun or Physical track; set by the system',
  prone:       'SR3 p.105-106 — Drop Prone (Free Action), the prone modifiers; the Mark prone button',
  restrain:    'Bound, cuffed or held — a table aid (no core status rule; Subduing Combat, SR3 p.86)',
  paralysis:   'SR3 p.193 — a Physical Attribute reduced to 0 leaves the victim paralyzed',
  blind:       'SR3 p.111-112 — Blind Fire +8; also Foundry\'s BLIND special status (vision)',
  silence:     'SR3 p.196 — the Silence spell dampens sound in its area',
  invisible:   'SR3 p.195 — Invisibility: attacks take the Blind Fire modifier; Foundry\'s INVISIBLE special status',
  fly:         'SR3 p.197 — Levitate; flying critters, spirits and aircraft; Foundry\'s FLY special status',
  fear:        'SR3 p.263 — the Fear critter power',
  burning:     'SR3 p.197 — Flamethrower: 6M at the end of every turn until the flames are out',
  poison:      'SR3 p.250 — Toxins',
  disease:     'SR3 p.251 — Diseases',
});

/** The default list (the setting's default value). */
export const DEFAULT_SHOWN = Object.freeze(Object.keys(SR3_REASONS));

/**
 * The core ids to show, given the saved setting. Anything that is not an array of strings (an unset or
 * damaged setting) falls back to the default — fail visible-and-sane, never to an empty HUD.
 * `ALWAYS_SHOWN` is added regardless.
 * @param {unknown} saved
 * @returns {Set<string>}
 */
export function shownCoreIds(saved) {
  const list = Array.isArray(saved) ? saved.filter(id => typeof id === 'string') : DEFAULT_SHOWN;
  return new Set([...list, ...ALWAYS_SHOWN]);
}

/**
 * Should the HUD offer this status? `coreIds` = the ids Foundry shipped (captured before the system adds
 * its own). A status that is neither core nor the system's — a module's — is never touched.
 * @param {string} id @param {Set<string>} shown @param {Set<string>} coreIds
 */
export function isShown(id, shown, coreIds) {
  if (isSystemStatus(id)) return true;
  if (!coreIds.has(id)) return true;
  return shown.has(id);
}

/**
 * Apply the setting to a status list IN PLACE: a hidden one gets `hud: false`; one this function hid
 * before and that is now shown has `hud` removed again. A `hud` value anyone else set is left alone.
 * Safe to re-run live (the HUD rebuilds its choices on every render).
 * @param {Array<{id: string, hud?: unknown}>} statuses
 * @param {unknown} saved            the stored setting
 * @param {Set<string>} coreIds      Foundry's own ids
 * @param {Set<string>} [hiddenBefore] ids a previous call hid
 * @returns {Set<string>} the ids now hidden (pass back in as `hiddenBefore` next time)
 */
export function applyStatusVisibility(statuses, saved, coreIds, hiddenBefore = new Set()) {
  const shown = shownCoreIds(saved);
  const hidden = new Set();
  for (const s of statuses) {
    if (!s?.id) continue;
    if (isShown(s.id, shown, coreIds)) {
      if (hiddenBefore.has(s.id) && s.hud === false) delete s.hud;
    } else if (s.hud === undefined || hiddenBefore.has(s.id)) {
      s.hud = false;
      hidden.add(s.id);
    }
  }
  return hidden;
}

/**
 * Statuses active on an actor that the HUD would not list — so the HUD can add them back, lit, and the
 * GM can click them off. Follows core's own matching (`token-hud.mjs:119-131`): an effect counts for a
 * status only when it carries that single status (core's statuses have no static `_id`) — which is also
 * exactly when `toggleStatusEffect(id)` would delete it rather than add a second one.
 * @param {Iterable<{statuses: Iterable<string>}>} effects   the actor's effects
 * @param {Set<string>} hiddenIds                           ids currently hidden
 * @returns {string[]}
 */
export function hiddenActiveStatusIds(effects, hiddenIds) {
  const out = new Set();
  for (const e of effects ?? []) {
    const ids = [...(e?.statuses ?? [])];
    if (ids.length === 1 && hiddenIds.has(ids[0])) out.add(ids[0]);
  }
  return [...out];
}
