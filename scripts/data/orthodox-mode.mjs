/**
 * An Orthodox decker's Matrix user mode — logging on and off, and the 0.9.0 migration · MDF p.10 · TODO 128. Pure.
 *
 * Until 2026-11-07 any Orthodox decker logged on to a host got Matrix Initiative whatever their mode; the maintainer then ruled
 * Orthodox follows Defragged — only VR-Hot uses Matrix Initiative (MDF p.10) — and added a User mode selector to the Orthodox
 * Matrix tab. Two things were left behind, and the maintainer ruled on both (2026-11-19):
 *   · deckers already logged on had NO mode saved and quietly lost Matrix Initiative → the migration sets VR-Hot, but ONLY for
 *     an Orthodox character or NPC that has deck stats, is logged on to a host, and has no mode (exactly the group that had it);
 *   · Log On never chose a mode and Log Off never cleared one (Defragged's does both) → Log On asks (default: the mode already
 *     set, else VR-Hot) and Log Off blanks it.
 */

export const MODES = ['TRM', 'AR', 'VR-Cold', 'VR-Hot'];
export const DEFAULT_MODE = 'VR-Hot';

const isMode = m => MODES.includes(m);

/**
 * `update()` delta for the migration, or null. ⚠ **This writes a mode, so it is guarded hard:** only a `character` or `npc`
 * with a deck (`orthodoxDeck.mccp` above 0), logged on to a host (`orthodoxRunState.currentHostId` set), and with NO mode
 * saved. A mode someone chose — even one that is not VR-Hot — is never touched; a decker between runs gets nothing (a mode
 * also puts the VR status icon on their token). Idempotent: once a mode is set it yields null.
 */
export function migrationDelta(actor) {
  if (actor?.type !== 'character' && actor?.type !== 'npc') return null;
  const sys = actor.system ?? {};
  if (sys.matrixUserMode) return null;
  if (!(Number(sys.orthodoxDeck?.mccp) > 0)) return null;
  if (!sys.orthodoxRunState?.currentHostId) return null;
  return { 'system.matrixUserMode': DEFAULT_MODE };
}

/** The mode a Log On should apply: the one chosen if valid, else the decker's current valid mode, else VR-Hot. */
export function modeFor(chosen, current) {
  if (isMode(chosen)) return chosen;
  if (isMode(current)) return current;
  return DEFAULT_MODE;
}

/** What Log On writes: the host, a fresh tally and alert, and the mode. */
export function logOnUpdate(hostId, chosen, current) {
  return {
    'system.orthodoxRunState.currentHostId': hostId,
    'system.orthodoxRunState.securityTally': 0,
    'system.orthodoxRunState.alertLevel': 'none',
    'system.matrixUserMode': modeFor(chosen, current),
  };
}

/** What Log Off writes: the host and tally cleared, and the mode blanked (Defragged's log-off does the same). */
export function logOffUpdate() {
  return {
    'system.orthodoxRunState.currentHostId': '',
    'system.orthodoxRunState.securityTally': 0,
    'system.orthodoxRunState.alertLevel': 'none',
    'system.matrixUserMode': '',
  };
}

export const OrthodoxMode = { MODES, DEFAULT_MODE, migrationDelta, modeFor, logOnUpdate, logOffUpdate };
