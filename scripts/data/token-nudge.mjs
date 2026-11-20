/**
 * Moving a token a short way without turning it · TODO 311 · SR3 p.124
 *
 * A Knockdown Test with some successes but short of the threshold leaves the target "driven back about a
 * metre". Dragging the token does that, but Foundry (and modules like About Face) then turn it to face the
 * move. This is the geometry for a nudge that changes ONLY x/y: direction → pixel offset, "directly away from
 * the attacker", metres → grid pixels, and snapping. Pure — no Foundry, so it is unit-tested.
 *
 * Canvas axes: +x is east, +y is SOUTH (down the screen). North is therefore dy = −1.
 */

const DIAG = Math.SQRT1_2;

export class TokenNudge {
  /** Eight compass directions, unit vectors, in the order the dialog lists them. */
  static COMPASS = Object.freeze({
    N:  { dx: 0,     dy: -1,    label: 'North' },
    NE: { dx: DIAG,  dy: -DIAG, label: 'North-east' },
    E:  { dx: 1,     dy: 0,     label: 'East' },
    SE: { dx: DIAG,  dy: DIAG,  label: 'South-east' },
    S:  { dx: 0,     dy: 1,     label: 'South' },
    SW: { dx: -DIAG, dy: DIAG,  label: 'South-west' },
    W:  { dx: -1,    dy: 0,     label: 'West' },
    NW: { dx: -DIAG, dy: -DIAG, label: 'North-west' },
  });

  /** The special choice that points away from the attacker. */
  static AWAY = 'away';

  /** Unit vector for a compass key, or null. */
  static compassVector(key) {
    const c = TokenNudge.COMPASS[key];
    return c ? { dx: c.dx, dy: c.dy } : null;
  }

  /**
   * Unit vector pointing from the attacker's centre THROUGH the target's centre — "directly away from the
   * attacker". Null when either point is missing or they coincide (no direction to take).
   * @param {{x:number,y:number}|null} attacker  centre of the attacker's token
   * @param {{x:number,y:number}|null} target    centre of the target's token
   */
  static awayVector(attacker, target) {
    if (!attacker || !target) return null;
    const dx = target.x - attacker.x;
    const dy = target.y - attacker.y;
    const len = Math.hypot(dx, dy);
    if (!(len > 0)) return null;
    return { dx: dx / len, dy: dy / len };
  }

  /** Resolve a dialog choice ('away' or a compass key) to a unit vector. */
  static vectorFor(choice, { attacker = null, target = null } = {}) {
    if (choice === TokenNudge.AWAY) return TokenNudge.awayVector(attacker, target);
    return TokenNudge.compassVector(choice);
  }

  /**
   * Scene distance (metres, or whatever units the scene uses) → canvas pixels.
   * @param {number} distance     in scene units
   * @param {number} gridDistance scene.grid.distance — units per grid square
   * @param {number} gridSize     scene.grid.size — pixels per grid square
   */
  static pixels(distance, gridDistance, gridSize) {
    const d = Number(distance), gd = Number(gridDistance), gs = Number(gridSize);
    if (!(d > 0) || !(gd > 0) || !(gs > 0)) return 0;
    return (d / gd) * gs;
  }

  /**
   * Snap a pixel offset to whole grid squares on each axis. If snapping would cancel the move altogether
   * (a very short push on a big grid) the raw offset is kept, so a nudge never silently does nothing.
   * A gridless scene passes gridSize 0 and is returned unchanged.
   */
  static snapDelta(dx, dy, gridSize) {
    if (!(gridSize > 0)) return { dx, dy };
    const sx = Math.round(dx / gridSize) * gridSize;
    const sy = Math.round(dy / gridSize) * gridSize;
    if (sx === 0 && sy === 0) return { dx, dy };
    return { dx: sx, dy: sy };
  }

  /**
   * The new top-left for a token: its position plus the vector × distance, in pixels. Only x and y — there
   * is deliberately no rotation here.
   * @returns {{x:number,y:number}|null} null if there is no direction or no distance
   */
  static destination({ x, y }, vector, distance, { gridDistance, gridSize, snap = true } = {}) {
    if (!vector) return null;
    const px = TokenNudge.pixels(distance, gridDistance, gridSize);
    if (!(px > 0)) return null;
    let dx = vector.dx * px, dy = vector.dy * px;
    if (snap) ({ dx, dy } = TokenNudge.snapDelta(dx, dy, gridSize));
    return { x: Math.round(x + dx), y: Math.round(y + dy) };
  }
}
