/**
 * Dumpshock for a crashed decker — MDF p.26-27 · TODO 128. Pure.
 *
 * > "When an icon achieves 10 boxes of Overload Damage, it crashes, dumping its user from the Matrix (if applicable)." (p.26)
 * > "When a persona icon is crashed and abruptly ejected from the Matrix, the living user experiences … Dumpshock. …
 * >  The user must immediately resist Serious Biofeedback Damage. The attack's Power is equal to the System Rating of
 * >  the grid or host that dumped the user. Tortoise and AR users are immune to this damage; VR-Cold users apply the
 * >  damage to their Stun track; and VR-Hot users to Physical. … The user applies a +2 to all target numbers for the
 * >  next 10 minutes." (p.27)
 *
 * Before this module the Convergence card and the manual Dumpshock button treated every non-VR-Hot user as Stun, so a
 * Tortoise or AR user was offered damage the book says they are immune to, and neither said anything of the +2.
 *
 * Orthodox SR3 is a different rule (SR3 p.226-227, `SR3EActor.orthoDumpShock`): always Stun, Power = Security Value.
 */

export const DUMPSHOCK_TN_PENALTY = 2;       // MDF p.27 — "+2 to all target numbers for the next 10 minutes"
export const DUMPSHOCK_TN_MINUTES = 10;

/**
 * The Defragged dumpshock a user takes. `mode` is `matrixUserMode` ('TRM' | 'AR' | 'VR-Cold' | 'VR-Hot' | '').
 * Returns `{ immune, power, level, track, isStun, note }` — `track` is null when immune.
 * A user with no mode set is treated as VR-Cold (Stun): offer the damage, the GM can say otherwise ("warn, never refuse").
 */
export function defragged(mode, systemRating) {
  const power = Math.max(1, Math.round(Number(systemRating) || 6));
  const m = mode || 'VR-Cold';
  const immune = m === 'TRM' || m === 'AR';
  const isStun = m !== 'VR-Hot';
  return {
    immune,
    power,
    level: 'S',                                       // Serious — MDF p.27
    track: immune ? null : (isStun ? 'Stun' : 'Physical'),
    isStun: immune ? false : isStun,
    note: immune
      ? `${m === 'TRM' ? 'Tortoise' : 'AR'} users are immune to Dumpshock damage (MDF p.27); the +${DUMPSHOCK_TN_PENALTY} still applies.`
      : '',
  };
}

/** The first moment a track is full: it was below `boxes` and now is not. Repeated saves of a full track are not crashes. */
export function crossedFull(before, after, boxes = 10) {
  const full = Math.max(1, Math.round(Number(boxes) || 10));
  return (Number(before) || 0) < full && (Number(after) || 0) >= full;
}

export const DumpShock = { defragged, crossedFull, TN_PENALTY: DUMPSHOCK_TN_PENALTY, TN_MINUTES: DUMPSHOCK_TN_MINUTES };
