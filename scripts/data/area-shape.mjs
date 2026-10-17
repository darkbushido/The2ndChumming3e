/**
 * The shape of a smoke / gas / flash cloud on a map with walls — TODO 164, item 0. **Pure — no Foundry.**
 *
 * A grenade's cloud is a circle on paper (SR3 p.283: gas "within a 10-meter radius", smoke "an area 20
 * meters in diameter"), but gas and smoke do not pass through a wall. The marker is clipped to what is
 * reachable from the blast point in a straight line without crossing a wall: a visibility polygon, swept
 * from the centre, limited to the radius. The same wall test the throw already uses
 * (`SR3EActor._wallBetween`, TODO 149) decides which walls count — the caller hands in only the segments
 * that block movement and are not open doors.
 *
 * Points are flat `[x, y, x, y, …]` in scene pixels, as Foundry's polygon shapes use them. A segment is
 * `{ a: {x,y}, b: {x,y} }`.
 */

const EPS_ANGLE = 1e-4;   // radians either side of a wall end, so a corner shows its edge and not a taper
const MIN_T     = 1e-6;   // a wall under the centre point is not a wall to stand behind

/** Distance from `p` to the segment `s`. */
function distToSegment(p, s) {
  const dx = s.b.x - s.a.x, dy = s.b.y - s.a.y;
  const len2 = dx * dx + dy * dy;
  let u = len2 ? ((p.x - s.a.x) * dx + (p.y - s.a.y) * dy) / len2 : 0;
  u = Math.max(0, Math.min(1, u));
  return Math.hypot(p.x - (s.a.x + u * dx), p.y - (s.a.y + u * dy));
}

/** The distance along the ray `c + t·(cos, sin)` to the segment, or Infinity. */
function rayHit(c, cos, sin, s) {
  const ex = s.b.x - s.a.x, ey = s.b.y - s.a.y;
  const denom = cos * ey - sin * ex;
  if (Math.abs(denom) < 1e-12) return Infinity;   // parallel
  const qx = s.a.x - c.x, qy = s.a.y - c.y;
  const t = (qx * ey - qy * ex) / denom;
  const u = (qx * sin - qy * cos) / denom;
  return t > MIN_T && u >= -1e-9 && u <= 1 + 1e-9 ? t : Infinity;
}

export const AreaShape = {
  /**
   * The walls that can matter to a circle: those within `radius` of the centre.
   */
  relevant(center, radius, segments) {
    return (segments ?? []).filter(s => s?.a && s?.b && distToSegment(center, s) < radius);
  },

  /**
   * Clip the circle at `center` to what the centre can reach without crossing a wall.
   * Returns the polygon's flat points, or `null` when no wall touches the circle (keep the plain circle).
   * @param {{x:number,y:number}} center
   * @param {number} radius  scene pixels
   * @param {Array<{a:{x:number,y:number}, b:{x:number,y:number}}>} segments  movement-blocking walls
   * @param {{rays?: number, pullBack?: number}} [opts]
   */
  clipCircle(center, radius, segments, { rays = 96, pullBack = 0.5 } = {}) {
    const walls = AreaShape.relevant(center, radius, segments);
    if (!walls.length || !(radius > 0)) return null;

    const angles = [];
    for (let i = 0; i < rays; i++) angles.push((2 * Math.PI * i) / rays);
    for (const w of walls) {
      for (const p of [w.a, w.b]) {
        if (Math.hypot(p.x - center.x, p.y - center.y) > radius) continue;
        const th = Math.atan2(p.y - center.y, p.x - center.x);
        angles.push(th - EPS_ANGLE, th, th + EPS_ANGLE);
      }
    }
    // Normalise to [0, 2π) and sort, so the polygon winds once round.
    const norm = angles.map(a => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)).sort((p, q) => p - q);

    const pts = [];
    let clipped = false;
    for (const a of norm) {
      const cos = Math.cos(a), sin = Math.sin(a);
      let t = radius;
      for (const w of walls) {
        const h = rayHit(center, cos, sin, w);
        if (h < t) { t = h; clipped = true; }
      }
      const tt = t < radius ? Math.max(0, t - pullBack) : radius;   // stay on the near side of a wall
      const x = center.x + cos * tt, y = center.y + sin * tt;
      const n = pts.length;
      if (n >= 2 && Math.abs(pts[n - 2] - x) < 1e-6 && Math.abs(pts[n - 1] - y) < 1e-6) continue;
      pts.push(x, y);
    }
    return clipped && pts.length >= 6 ? pts : null;
  },

  /** Does a point stand inside one Region shape (`circle` or `polygon`; a hole is handled by `contains`)? */
  inShape(shape, pt) {
    if (!shape || !pt) return false;
    if (shape.type === 'circle') return Math.hypot(pt.x - shape.x, pt.y - shape.y) <= shape.radius;
    if (shape.type === 'polygon') return AreaShape.inPolygon(shape.points ?? [], pt);
    return false;
  },

  /** Even-odd test of a point against flat polygon points. */
  inPolygon(points, pt) {
    let inside = false;
    const n = points.length / 2;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = points[2 * i], yi = points[2 * i + 1], xj = points[2 * j], yj = points[2 * j + 1];
      if ((yi > pt.y) !== (yj > pt.y) && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  },

  /** Is a point inside a Region's shapes (any solid shape that holds it, no hole that does)? */
  contains(shapes, pt) {
    const list = shapes ?? [];
    const holes = list.filter(s => s?.hole);
    return list.some(s => !s?.hole && AreaShape.inShape(s, pt)) && !holes.some(s => AreaShape.inShape(s, pt));
  },

  /** A polygon's bounding box and its points relative to the box's top-left — what a Drawing wants. */
  relativeBox(points) {
    const xs = [], ys = [];
    for (let i = 0; i < points.length; i += 2) { xs.push(points[i]); ys.push(points[i + 1]); }
    const x = Math.min(...xs), y = Math.min(...ys);
    const width = Math.max(...xs) - x, height = Math.max(...ys) - y;
    return { x, y, width, height, points: points.map((v, i) => v - (i % 2 === 0 ? x : y)) };
  },

  /** The circle as a polygon of `n` points — for a Drawing that has no clipped shape of its own. */
  circlePoints(center, radius, n = 48) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = (2 * Math.PI * i) / n;
      out.push(center.x + Math.cos(a) * radius, center.y + Math.sin(a) * radius);
    }
    return out;
  },
};
