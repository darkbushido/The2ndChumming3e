/**
 * Aircraft stall speed · pure. SR3 p.132: *"Fixed-wing aircraft have two Speed Ratings. The higher number is its
 * maximum safe speed; the lower represents the aircraft's stall speed, the minimum speed it must maintain to keep
 * flying."* Rigger 3 Revised (Running Out of Gas): *"If an aircraft runs out of gas, the pilot must make a Crash Test
 * when the vehicle's speed falls below its Stall Speed Rating."* and, for a low-altitude vehicle (thunderbird), the
 * stall speed *"applies only when the vehicle is flying at a height of 75 meters or higher"*.
 *
 * The vehicle model has `speed` (the maximum safe speed — the number the chase compares against) and
 * `stallSpeed` (this; 0 = the vehicle has none). Both are in metres per Combat Turn, the same unit as a chase
 * participant's speed, so they compare directly.
 *
 * Warn, never refuse; offer, never apply: falling below the stall speed offers the Crash Test (the existing
 * `.sr-crash-open-btn`), it does not roll it. A vehicle at rest (speed 0) is parked, not stalled — the system has no
 * altitude, so the GM reads whether the aircraft is in the air (and, for a thunderbird, above 75 m).
 */
export const StallSpeed = {
  /** The stall speed as stored, `0` when the vehicle has none (old documents read `?? 0`). */
  of(system) {
    const n = Number(system?.stallSpeed);
    return Number.isFinite(n) && n > 0 ? n : 0;
  },

  /** Is a moving vehicle slower than its stall speed? A stall speed of 0 is "none"; a speed of 0 is parked. */
  below(speed, stall) {
    const v = Number(speed) || 0;
    const s = Number(stall) || 0;
    return s > 0 && v > 0 && v < s;
  },

  /** The plain-words warning (speeds in m/turn, shown with km/h as well). */
  note(name, speed, stall) {
    const kmh = n => Math.round(n * 1.2);
    return `${name} is at ${Math.round(speed)} m/turn (${kmh(speed)} km/h), below its stall speed of ${stall} m/turn `
      + `(${kmh(stall)} km/h) — an aircraft must keep that speed to stay in the air (SR3 p.132). `
      + `A Crash Test is called for when it falls below it (Rigger 3 Revised, Running Out of Gas); a thunderbird's stall `
      + `speed applies only at 75 m of height or more. Only if it is airborne.`;
  },
};
