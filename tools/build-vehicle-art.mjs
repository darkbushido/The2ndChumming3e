#!/usr/bin/env node
/**
 * Draw the top-down token art for road vehicles and drones, and point the packs at it — TODO 241.
 *
 *   node tools/build-vehicle-art.mjs           write styles/textures/vehicles/*.svg and edit packs-src,
 *                                              then run: npm run packs:build
 *   node tools/build-vehicle-art.mjs --check   exit 1 if an SVG or a pack entry would change — changes nothing
 *   node tools/build-vehicle-art.mjs --draft   print a first-guess archetype for every in-scope vehicle
 *                                              the data file does not map yet — changes nothing
 *
 * Asked for 2026-10-24: original art for the vehicles that can ship in the public packs. The private
 * table's map art is licensed and can never be published, so EVERY shape here is drawn in this file —
 * no traced, copied or third-party art of any kind.
 *
 * In scope: every `packs-src/sr3e-*-vehicles` actor whose `vehicleType` is car, motorcycle or military,
 * and every `packs-src/sr3e-*-drones` actor (`isInScope`). Each is mapped BY NAME to an archetype in
 * `tools/data/vehicle-archetypes.json` — a reviewed file, not a guess at build time; `--draft` only
 * proposes entries for a person to check.
 *
 * The look: a straight top-down view, front facing SOUTH (Foundry's rotation 0), transparent
 * background, flat fills with a dark outline and one lighter highlight per panel. Drawn in
 * centimetres, so the viewBox IS the footprint and a token sized in metres fills its square exactly.
 * The body colour is the archetype's palette entry picked by a stable hash of the name (`paintFor`);
 * the data file can name a paint instead (Lone Star blue, DocWagon white).
 *
 * ⚠ The SVGs are build output — change a shape here and re-run, never hand-edit a file.
 *   `tests/vehicle-art.test.mjs` fails when they drift, when a file is orphaned, or when an in-scope
 *   entry has no archetype.
 * ⚠ Only a stock picture is replaced (the type texture, or one of these files); art someone chose
 *   for an entry stays, and so does its token.
 * ⚠ Owned world copies keep their old picture — Foundry embeds actors from a pack, it doesn't link
 *   them. No migration ships with this (see TODO 241).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readSourceDir, writeSourceDir } from './lib/pack-source.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const OUT = join(ROOT, 'styles', 'textures', 'vehicles');
export const MAP_FILE = join(ROOT, 'tools', 'data', 'vehicle-archetypes.json');
const SRC = join(ROOT, 'packs-src');

export const IMG_DIR = 'systems/The2ndChumming3e/styles/textures/vehicles';
/** The type textures every vehicle and drone carried before this art existed. */
export const STOCK_IMAGES = ['vehicles-default.webp', 'drone-default.webp']
  .map(f => `systems/The2ndChumming3e/styles/textures/${f}`);

/** The vehicleTypes of `-vehicles` packs that are road or ground vehicles. Drones are all in. */
export const ROAD_TYPES = ['car', 'motorcycle', 'military'];
export const isInScope = (pack, doc) =>
  /^sr3e-.+-drones$/.test(pack) || (/^sr3e-.+-vehicles$/.test(pack) && ROAD_TYPES.includes(doc?.system?.vehicleType));

/* ── Colours ───────────────────────────────────────────────────────────────────────────────── */

const INK = '#141518', TYRE = '#1d1e21', TRACK = '#2a2b2e', TREAD = '#4a4c50', GLASS = '#26313b',
  GLINT = '#6b8396', HEAD = '#fff1bf', TAIL = '#cf2f2a', METAL = '#8d9196', ROTOR = '#d8dde3', LED = '#ff9a2e';

/** Paints by name. `decal` adds a livery mark where the archetype has a roof. */
export const PAINTS = {
  white: { body: '#e6e6e1' }, silver: { body: '#a8adb3' }, black: { body: '#2e2f33' }, red: { body: '#b0282c' },
  blue: { body: '#2f5c9c' }, green: { body: '#3e6a46' }, yellow: { body: '#d8b031' }, orange: { body: '#d06f2a' },
  teal: { body: '#2a8787' }, maroon: { body: '#6d2433' }, grey: { body: '#6a6e74' }, cream: { body: '#d6cdae' },
  olive: { body: '#5b6236' }, tan: { body: '#9f895b' }, fieldgrey: { body: '#6b7167' }, forest: { body: '#3f4a33' },
  graphite: { body: '#4a4d52' }, safety: { body: '#d6a62a' }, matte: { body: '#7d8187' }, bone: { body: '#d4d5d2' },
  lonestar: { body: '#26457a', decal: 'lightbar' },
  docwagon: { body: '#ecece8', decal: 'cross' },
};
/** Which paints an archetype's hash picks from. */
export const PALETTES = {
  civilian: ['white', 'silver', 'black', 'red', 'blue', 'green', 'yellow', 'orange', 'teal', 'maroon', 'grey', 'cream'],
  military: ['olive', 'tan', 'fieldgrey', 'forest'],
  drone:    ['graphite', 'bone', 'safety', 'orange', 'matte'],
};

/** Mix two `#rrggbb` colours; `t` = 0 is `a`, 1 is `b`. */
export function mix(a, b, t) {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}
const lighter = (c, t = 0.25) => mix(c, '#ffffff', t);
const darker  = (c, t = 0.35) => mix(c, '#000000', t);

/** FNV-1a — the same name always gets the same paint, on every machine. */
export function hashName(name) {
  let h = 0x811c9dc5;
  for (const ch of String(name)) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return h;
}

/* ── Drawing primitives (centimetres; y = 0 is the REAR, y = L the front, which faces south) ── */

const n = v => +v.toFixed(1);
const SW = 3;
const rect = (x, y, w, h, fill, { rx = 0, sw = SW, stroke = INK, extra = '' } = {}) =>
  `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}"${rx ? ` rx="${n(rx)}"` : ''} fill="${fill}"${sw ? ` stroke="${stroke}" stroke-width="${sw}"` : ''}${extra}/>`;
const circle = (cx, cy, r, fill, { sw = SW, stroke = INK, extra = '' } = {}) =>
  `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${fill}"${sw ? ` stroke="${stroke}" stroke-width="${sw}"` : ''}${extra}/>`;
const ellipse = (cx, cy, rx, ry, fill, { sw = SW, stroke = INK } = {}) =>
  `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" fill="${fill}"${sw ? ` stroke="${stroke}" stroke-width="${sw}"` : ''}/>`;
const poly = (pts, fill, { sw = SW, stroke = INK } = {}) =>
  `<polygon points="${pts.map(([x, y]) => `${n(x)},${n(y)}`).join(' ')}" fill="${fill}"${sw ? ` stroke="${stroke}" stroke-width="${sw}"` : ''} stroke-linejoin="round"/>`;
const line = (x1, y1, x2, y2, stroke = INK, sw = SW) =>
  `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"/>`;

/** A tyre seen from above, centred on (cx, cy). */
const wheel = (cx, cy, w, h) => rect(cx - w / 2, cy - h / 2, w, h, TYRE, { rx: Math.min(w, h) * 0.3, sw: 2 });
/** A pair of tyres across the vehicle at axle `y`. */
const axle = (W, y, w = 20, h = 62, out = 2) => wheel(out + w / 2, y, w, h) + wheel(W - out - w / 2, y, w, h);
/** A track run from y0 to y1 at x, w wide, with tread bars across it. */
function track(x, y0, y1, w, pitch = 14) {
  let s = rect(x, y0, w, y1 - y0, TRACK, { rx: w * 0.35 });
  for (let y = y0 + pitch / 2; y < y1 - 4; y += pitch) s += line(x + 4, y, x + w - 4, y, TREAD, 3);
  return s;
}
/** Head lamps on the front edge, tail lamps on the rear. */
const lamps = (x0, x1, yFront, yRear, w = 22, h = 7) =>
  rect(x0 + 6, yFront - h - 2, w, h, HEAD, { rx: 3, sw: 1.5 }) + rect(x1 - 6 - w, yFront - h - 2, w, h, HEAD, { rx: 3, sw: 1.5 })
  + rect(x0 + 6, yRear + 2, w * 0.8, h * 0.8, TAIL, { rx: 2, sw: 1.5 }) + rect(x1 - 6 - w * 0.8, yRear + 2, w * 0.8, h * 0.8, TAIL, { rx: 2, sw: 1.5 });
/** A livery mark centred on (cx, cy), `s` across. */
function decal(paint, cx, cy, s) {
  if (paint.decal === 'lightbar') {
    return rect(cx - s / 2, cy - s * 0.09, s / 2, s * 0.18, '#d8312c', { sw: 1.5 })
      + rect(cx, cy - s * 0.09, s / 2, s * 0.18, '#2f7be0', { sw: 1.5 });
  }
  if (paint.decal === 'cross') {
    const a = s * 0.16;
    return rect(cx - a, cy - s / 2, a * 2, s, '#d22a2a', { sw: 0 }) + rect(cx - s / 2, cy - a, s, a * 2, '#d22a2a', { sw: 0 });
  }
  return '';
}
/** A gun turret: ring at (cx, cy), barrel running forward to `yMuzzle`. */
const turret = (c, cx, cy, r, yMuzzle, bw = 8) =>
  rect(cx - bw / 2, cy, bw, yMuzzle - cy, darker(c, 0.5), { sw: 2 })
  + circle(cx, cy, r, c) + circle(cx - r * 0.3, cy - r * 0.25, r * 0.28, lighter(c, 0.2), { sw: 1.5 });

/* ── Cars ──────────────────────────────────────────────────────────────────────────────────── */

/**
 * The car every road archetype starts from. `cab` is where the glasshouse starts and ends (fractions
 * of the length, rear to front), `ws`/`rw` the windscreen and rear-window depth, `r` how round the
 * corners are, `open` drops the roof, `bed` swaps the rear for a load bed.
 */
function car(p, W, L, { cab = [0.3, 0.7], ws = 0.11, rw = 0.08, r = 0.22, axles = [0.18, 0.8], inset = 9, open = false, bed = null, rack = false } = {}) {
  const b = p.body, x0 = inset, x1 = W - inset, bw = x1 - x0;
  const y0 = cab[0] * L, y1 = cab[1] * L;
  let s = axles.map(a => axle(W, a * L, 20, Math.min(64, L * 0.14))).join('');
  s += rect(x0, 3, bw, L - 6, b, { rx: bw * r });
  // The hood's sheen and the boot's.
  s += rect(W / 2 - bw * 0.2, y1 + 6, bw * 0.4, (L - 10) - y1 - 6, lighter(b, 0.14), { rx: bw * 0.12, sw: 0 });
  if (bed === 'open') {
    s += rect(x0 + 7, 10, bw - 14, y0 - 16, darker(b, 0.5), { rx: 4, sw: 2 });
    for (let y = 22; y < y0 - 10; y += 22) s += line(x0 + 12, y, x1 - 12, y, darker(b, 0.65), 2);
  } else if (bed === 'flat') {
    s += rect(x0 + 2, 6, bw - 4, y0 - 10, lighter(b, 0.3), { rx: 3, sw: 2 });
    for (let x = x0 + 16; x < x1 - 8; x += 18) s += line(x, 10, x, y0 - 8, darker(b, 0.2), 1.5);
  } else if (bed === 'covered') {
    s += rect(x0 + 3, 6, bw - 6, y0 - 9, lighter(b, 0.45), { rx: 6, sw: 2 });
    for (let y = 20; y < y0 - 8; y += 20) s += line(x0 + 8, y, x1 - 8, y, darker(b, 0.15), 1.5);
  } else {
    s += rect(W / 2 - bw * 0.2, 9, bw * 0.4, Math.max(0, y0 - 16), lighter(b, 0.1), { rx: bw * 0.1, sw: 0 });
  }
  if (open) {
    s += rect(x0 + bw * 0.08, y1 - ws * L, bw * 0.84, ws * L * 0.55, GLASS, { rx: 5 });
    s += rect(x0 + bw * 0.1, y0, bw * 0.8, y1 - ws * L - y0, darker(b, 0.55), { rx: 8, sw: 2 });
    const seat = bw * 0.3;
    s += rect(x0 + bw * 0.14, y1 - ws * L - 52, seat, 42, '#3a3b3f', { rx: 8, sw: 2 })
      + rect(x1 - bw * 0.14 - seat, y1 - ws * L - 52, seat, 42, '#3a3b3f', { rx: 8, sw: 2 });
  } else {
    s += rect(x0 + bw * 0.07, y0, bw * 0.86, y1 - y0, GLASS, { rx: bw * 0.14 });
    const ry0 = y0 + rw * L, ry1 = y1 - ws * L;
    s += rect(x0 + bw * 0.13, ry0, bw * 0.74, ry1 - ry0, lighter(b, 0.08), { rx: bw * 0.1, sw: 2 });
    s += rect(x0 + bw * 0.2, ry0 + 6, bw * 0.12, ry1 - ry0 - 12, lighter(b, 0.3), { rx: 4, sw: 0 });
    s += line(x0 + bw * 0.22, y1 - ws * L * 0.55, x0 + bw * 0.42, y1 - ws * L * 0.3, GLINT, 3);
    if (rack) for (const f of [0.25, 0.75]) s += line(x0 + bw * 0.2, ry0 + (ry1 - ry0) * f, x1 - bw * 0.2, ry0 + (ry1 - ry0) * f, darker(b, 0.5), 3);
    s += decal(p, W / 2, (ry0 + ry1) / 2, bw * 0.6);
  }
  // Mirrors, then lamps.
  s += ellipse(x0 - 3, y1 - ws * L - 4, 6, 4, b, { sw: 2 }) + ellipse(x1 + 3, y1 - ws * L - 4, 6, 4, b, { sw: 2 });
  return s + lamps(x0, x1, L - 3, 3);
}

function racer(p, W, L) {
  const b = p.body;
  let s = axle(W, L * 0.2, 30, 66, 0) + axle(W, L * 0.82, 26, 56, 4);
  s += rect(18, 0, W - 36, 24, darker(b, 0.3), { rx: 4 });                        // rear wing
  s += poly([[W / 2 - 40, 30], [W / 2 + 40, 30], [W / 2 + 32, L * 0.62], [W / 2 + 10, L - 20], [W / 2 - 10, L - 20], [W / 2 - 32, L * 0.62]], b);
  s += poly([[W / 2 - 66, 70], [W / 2 + 66, 70], [W / 2 + 56, L * 0.5], [W / 2 - 56, L * 0.5]], b);  // side pods
  s += rect(W / 2 - 18, L * 0.4, 36, 60, GLASS, { rx: 16 });                       // cockpit
  s += circle(W / 2, L * 0.4 + 24, 11, lighter(b, 0.4), { sw: 2 });               // helmet
  s += rect(14, L - 22, W - 28, 18, darker(b, 0.3), { rx: 4 });                    // front wing
  return s + rect(W / 2 - 6, L * 0.6, 12, L * 0.3, lighter(b, 0.25), { sw: 0, rx: 4 });
}

function jeep(p, W, L) {
  const b = p.body;
  let s = car(p, W, L, { cab: [0.15, 0.64], ws: 0.07, r: 0.08, open: true, axles: [0.2, 0.8] });
  s += line(18, L * 0.36, W - 18, L * 0.36, '#2a2b2e', 7);                          // roll bar
  s += circle(W / 2, 14, 24, TYRE, { sw: 2 }) + circle(W / 2, 14, 10, METAL, { sw: 1.5 }); // spare
  return s + rect(W / 2 - 8, L * 0.72, 16, L * 0.2, darker(b, 0.2), { sw: 0, rx: 3 });
}

function van(p, W, L) {
  let s = car(p, W, L, { cab: [0.08, 0.86], ws: 0.09, rw: 0.04, r: 0.1, axles: [0.17, 0.82] });
  for (let y = L * 0.22; y < L * 0.7; y += 40) s += line(30, y, W - 30, y, darker(p.body, 0.25), 2);
  return s;
}

function boxvan(p, W, L) {
  const b = p.body, box = lighter(b, 0.15), yBox = L * 0.75;
  let s = axle(W, L * 0.18, 22, 70) + axle(W, L * 0.84, 22, 70);
  s += rect(14, L * 0.68, W - 28, L - L * 0.68 - 3, b, { rx: 28 });               // cab and short nose
  s += rect(26, yBox + 4, W - 52, L * 0.1, GLASS, { rx: 12 });                     // windscreen
  s += line(40, yBox + L * 0.05, 90, yBox + L * 0.08, GLINT, 3);
  s += rect(8, 3, W - 16, yBox, box, { rx: 8 });                                   // the box
  for (let y = 40; y < yBox - 20; y += 45) s += line(16, y, W - 16, y, darker(box, 0.2), 2.5);
  s += rect(W / 2 - 30, yBox * 0.3, 60, 40, darker(box, 0.15), { rx: 5, sw: 2 });  // roof vent
  s += decal(p, W / 2, yBox * 0.62, (W - 16) * 0.6);
  s += ellipse(8, yBox + 18, 6, 5, b, { sw: 2 }) + ellipse(W - 8, yBox + 18, 6, 5, b, { sw: 2 });
  return s + lamps(14, W - 14, L - 3, 3);
}

function bus(p, W, L) {
  const b = p.body;
  let s = axle(W, L * 0.22, 22, 80) + axle(W, L * 0.8, 22, 80);
  s += rect(8, 3, W - 16, L - 6, b, { rx: 22 });
  s += rect(18, L - 70, W - 36, 50, GLASS, { rx: 14 });                            // windscreen
  s += rect(8, 60, 10, L - 150, GLASS, { sw: 1.5 }) + rect(W - 18, 60, 10, L - 150, GLASS, { sw: 1.5 });
  s += rect(30, 40, W - 60, L - 140, lighter(b, 0.18), { rx: 10, sw: 2 });         // roof panel
  s += rect(W / 2 - 50, L * 0.45, 100, 160, '#9da2a8', { rx: 8 });                // air-conditioning
  for (const y of [L * 0.2, L * 0.75]) s += rect(W / 2 - 30, y, 60, 50, darker(b, 0.25), { rx: 4, sw: 2 });
  return s + lamps(8, W - 8, L - 3, 3, 26, 8);
}

function truck(p, W, L) {
  const b = p.body, box = '#bfc2c4', yCab = L * 0.76;
  let s = axle(W, L * 0.1, 22, 80) + axle(W, L * 0.22, 22, 80) + axle(W, L * 0.88, 22, 80);
  s += rect(12, yCab + 6, W - 24, L - yCab - 9, b, { rx: 18 });                   // cab-over
  s += rect(22, L - 70, W - 44, 46, GLASS, { rx: 10 });
  s += rect(30, yCab + 18, W - 60, L - yCab - 100, lighter(b, 0.18), { rx: 8, sw: 2 });
  s += rect(6, 3, W - 12, yCab, box, { rx: 6 });                                   // cargo box
  for (let y = 50; y < yCab - 20; y += 50) s += line(14, y, W - 14, y, darker(box, 0.2), 2.5);
  s += ellipse(10, L - 64, 7, 6, b, { sw: 2 }) + ellipse(W - 10, L - 64, 7, 6, b, { sw: 2 });
  return s + lamps(12, W - 12, L - 3, 3, 26, 8);
}

function snowcat(p, W, L) {
  const b = p.body;
  let s = track(0, 10, L - 10, 70) + track(W - 70, 10, L - 10, 70);
  s += rect(60, 20, W - 120, L * 0.42, darker(b, 0.35), { rx: 8 });                // rear deck
  s += rect(54, L * 0.42, W - 108, L * 0.55, b, { rx: 30 });                        // cabin
  s += rect(70, L * 0.82, W - 140, L * 0.08, GLASS, { rx: 10 });
  s += rect(76, L * 0.5, W - 152, L * 0.28, lighter(b, 0.18), { rx: 14, sw: 2 });
  return s + lamps(60, W - 60, L - 8, 22);
}

/* ── Two wheels and skis ───────────────────────────────────────────────────────────────────── */

function bike(p, W, L, { cruiser = false } = {}) {
  const b = p.body, cx = W / 2, wl = cruiser ? 70 : 62;
  let s = wheel(cx, 4 + wl / 2, cruiser ? 22 : 18, wl) + wheel(cx, L - 4 - wl / 2, 14, wl);
  if (cruiser) s += rect(cx - 40, 22, 22, 46, darker(b, 0.3), { rx: 6, sw: 2 }) + rect(cx + 18, 22, 22, 46, darker(b, 0.3), { rx: 6, sw: 2 });
  s += ellipse(cx, L * 0.5, cruiser ? 22 : 20, L * 0.3, b);                        // frame, tank, fairing
  s += rect(cx - 13, L * 0.24, 26, L * 0.22, '#2d2e31', { rx: 11, sw: 2 });       // seat
  s += ellipse(cx, L * 0.6, 12, L * 0.08, lighter(b, 0.35), { sw: 0 });           // tank highlight
  if (cruiser) s += rect(cx - 26, L * 0.48, 52, 22, METAL, { rx: 8, sw: 2 });       // engine
  const yb = L - wl - 6;
  s += line(cx - (cruiser ? 44 : 34), yb, cx + (cruiser ? 44 : 34), yb, '#2a2b2e', 5);
  s += circle(cx - 40, yb - 3, 5, METAL, { sw: 1.5 }) + circle(cx + 40, yb - 3, 5, METAL, { sw: 1.5 });
  return s + ellipse(cx, L - wl * 0.55, 8, 5, HEAD, { sw: 1.5 }) + ellipse(cx, 8, 6, 3, TAIL, { sw: 1.5 });
}

function scooter(p, W, L) {
  const b = p.body, cx = W / 2;
  let s = wheel(cx, 26, 14, 40) + wheel(cx, L - 26, 14, 40);
  s += rect(cx - 26, 22, 52, L * 0.7, b, { rx: 22 });                               // deck and body
  s += rect(cx - 15, 30, 30, L * 0.3, '#2d2e31', { rx: 10, sw: 2 });               // seat
  s += rect(cx - 22, L * 0.55, 44, 30, lighter(b, 0.3), { rx: 8, sw: 2 });         // footboard
  s += line(cx - 32, L - 52, cx + 32, L - 52, '#2a2b2e', 5);
  return s + ellipse(cx, L - 18, 8, 5, HEAD, { sw: 1.5 });
}

function snowmobile(p, W, L) {
  const b = p.body, cx = W / 2;
  let s = rect(12, L - 110, 12, 106, METAL, { rx: 5, sw: 2 }) + rect(W - 24, L - 110, 12, 106, METAL, { rx: 5, sw: 2 });
  s += track(cx - 22, 6, L * 0.5, 44, 12);
  s += poly([[cx - 34, L * 0.3], [cx + 34, L * 0.3], [cx + 38, L * 0.7], [cx + 16, L - 30], [cx - 16, L - 30], [cx - 38, L * 0.7]], b);
  s += rect(cx - 14, L * 0.3, 28, L * 0.25, '#2d2e31', { rx: 10, sw: 2 });
  s += rect(cx - 22, L * 0.62, 44, 26, GLASS, { rx: 8 });
  s += line(cx - 36, L * 0.58, cx + 36, L * 0.58, '#2a2b2e', 5);
  return s + ellipse(cx, L - 40, 10, 6, HEAD, { sw: 1.5 });
}

/* ── Military ──────────────────────────────────────────────────────────────────────────────── */

function apc(p, W, L) {
  const b = p.body;
  let s = [0.14, 0.34, 0.6, 0.8].map(a => axle(W, a * L, 30, 90, 0)).join('');
  s += poly([[22, 4], [W - 22, 4], [W - 18, L * 0.8], [W - 60, L - 4], [60, L - 4], [18, L * 0.8]], b);
  s += poly([[60, L * 0.8], [W - 60, L * 0.8], [W - 74, L - 16], [74, L - 16]], lighter(b, 0.15), { sw: 2 }); // glacis
  s += rect(70, 18, W - 140, L * 0.3, darker(b, 0.15), { rx: 6, sw: 2 });          // rear deck
  for (const x of [W * 0.33, W * 0.67]) s += circle(x, L * 0.2, 16, darker(b, 0.3), { sw: 2 });
  s += circle(W * 0.3, L * 0.86, 14, darker(b, 0.3), { sw: 2 });                   // driver's hatch
  return s + turret(b, W / 2, L * 0.52, 52, L - 2, 9);
}

function armoredTruck(p, W, L) {
  const b = p.body;
  let s = axle(W, L * 0.2, 26, 84) + axle(W, L * 0.8, 26, 84);
  s += poly([[14, 3], [W - 14, 3], [W - 10, L * 0.72], [W - 34, L - 4], [34, L - 4], [10, L * 0.72]], b);
  s += rect(46, L - 64, W - 92, 14, GLASS, { rx: 3 });                              // vision slit
  s += rect(30, 26, W - 60, L * 0.6, lighter(b, 0.12), { rx: 10, sw: 2 });
  for (const y of [L * 0.18, L * 0.36]) s += rect(W / 2 - 30, y, 60, 46, darker(b, 0.25), { rx: 4, sw: 2 });
  s += decal(p, W / 2, L * 0.74, W * 0.5);
  return s + circle(W / 2, L * 0.56, 34, darker(b, 0.1)) + rect(W / 2 - 4, L * 0.56, 8, 70, darker(b, 0.5), { sw: 2 })
    + lamps(34, W - 34, L - 4, 3, 22, 7);
}

function trackedApc(p, W, L) {
  const b = p.body;
  let s = track(0, 6, L - 20, 66) + track(W - 66, 6, L - 20, 66);
  s += poly([[48, 3], [W - 48, 3], [W - 48, L * 0.74], [W - 70, L - 6], [70, L - 6], [48, L * 0.74]], b);
  s += poly([[48, L * 0.74], [W - 48, L * 0.74], [W - 70, L - 6], [70, L - 6]], lighter(b, 0.15), { sw: 2 });
  s += rect(80, 10, W - 160, 22, darker(b, 0.25), { rx: 4, sw: 2 });               // rear door
  for (const x of [W * 0.38, W * 0.62]) s += rect(x - 26, L * 0.2, 52, 70, darker(b, 0.2), { rx: 6, sw: 2 });
  return s + turret(b, W * 0.62, L * 0.6, 40, L - 2, 7);
}

function tank(p, W, L) {
  const b = p.body, hullFront = L * 0.82;
  let s = track(0, 8, hullFront, 74) + track(W - 74, 8, hullFront, 74);
  s += poly([[40, 4], [W - 40, 4], [W - 40, hullFront - 50], [W - 70, hullFront], [70, hullFront], [40, hullFront - 50]], b);
  s += rect(70, 16, W - 140, 60, darker(b, 0.2), { rx: 6, sw: 2 });                 // engine deck
  s += circle(W * 0.33, hullFront - 34, 13, darker(b, 0.3), { sw: 2 });
  s += rect(W / 2 - 7, L * 0.45, 14, L * 0.55 - 2, darker(b, 0.45), { sw: 2 });     // main gun
  s += rect(W / 2 - 10, L - 46, 20, 40, darker(b, 0.3), { rx: 3, sw: 2 });           // muzzle brake
  s += poly([[W / 2 - 100, L * 0.3], [W / 2 + 100, L * 0.3], [W / 2 + 110, L * 0.5], [W / 2 + 70, L * 0.62], [W / 2 - 70, L * 0.62], [W / 2 - 110, L * 0.5]], b);
  s += poly([[W / 2 - 60, L * 0.32], [W / 2 + 10, L * 0.32], [W / 2 + 4, L * 0.44], [W / 2 - 66, L * 0.44]], lighter(b, 0.18), { sw: 0 });
  return s + circle(W / 2 + 46, L * 0.4, 18, darker(b, 0.2), { sw: 2 });           // commander's cupola
}

/* ── Aircraft (misfiled as cars in the r3 pack — TODO 240) ──────────────────────────────── */

function aircraft(p, W, L) {
  const b = p.body, cx = W / 2, sw = 12;
  let s = poly([[cx - 200, L * 0.18], [cx + 200, L * 0.18], [cx + 1440, L * 0.06], [cx + 300, L * 0.6], [cx - 300, L * 0.6], [cx - 1440, L * 0.06]], darker(b, 0.12), { sw });
  s += poly([[cx - 160, 40], [cx + 160, 40], [cx + 520, 20], [cx + 140, L * 0.14], [cx - 140, L * 0.14], [cx - 520, 20]], darker(b, 0.12), { sw });
  s += poly([[cx - 160, 0], [cx + 160, 0], [cx + 170, L * 0.75], [cx, L], [cx - 170, L * 0.75]], b, { sw });
  for (const x of [-700, -380, 380, 700]) s += rect(cx + x - 60, L * 0.2, 120, 380, METAL, { rx: 50, sw });
  s += poly([[cx - 90, L * 0.88], [cx + 90, L * 0.88], [cx, L * 0.96]], GLASS, { sw: 6 });
  return s + rect(cx - 40, L * 0.15, 80, L * 0.65, lighter(b, 0.2), { rx: 30, sw: 0 });
}

/* ── Drones ────────────────────────────────────────────────────────────────────────────────── */

const disc = (cx, cy, r) => circle(cx, cy, r, ROTOR, { sw: 1.5, stroke: '#9aa3ad', extra: ' fill-opacity="0.35"' })
  + line(cx - r * 0.8, cy, cx + r * 0.8, cy, '#3a3d42', 2.5) + circle(cx, cy, r * 0.18, '#3a3d42', { sw: 1.5 });

function rotor(p, W, L) {
  const b = p.body, c = W / 2, d = W * 0.29, r = W * 0.2;
  let s = '';
  for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) s += line(c, c, c + x * d, c + y * d, darker(b, 0.4), 7);
  for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) s += disc(c + x * d, c + y * d, r);
  s += rect(c - 17, c - 20, 34, 40, b, { rx: 10, sw: 2.5 });
  s += rect(c - 10, c - 14, 20, 14, lighter(b, 0.3), { rx: 5, sw: 0 });
  s += circle(c, c + 15, 6, GLASS, { sw: 1.5 });                                   // camera, facing front
  return s + circle(c - d, c + d, 4, LED, { sw: 0 }) + circle(c + d, c + d, 4, LED, { sw: 0 });
}

function helidrone(p, W, L) {
  const b = p.body, cx = W / 2;
  let s = line(cx, 18, cx, L * 0.5, darker(b, 0.3), 9);                            // tail boom
  s += rect(cx - 30, 6, 60, 10, b, { rx: 4, sw: 2 });                               // tail plane
  s += ellipse(cx + 12, 20, 4, 16, ROTOR, { sw: 1.5 });                            // tail rotor
  s += line(cx - 30, L * 0.5, cx - 30, L * 0.85, '#2a2b2e', 4) + line(cx + 30, L * 0.5, cx + 30, L * 0.85, '#2a2b2e', 4);
  s += ellipse(cx, L * 0.66, 26, L * 0.22, b);
  s += ellipse(cx, L * 0.78, 18, L * 0.08, GLASS, { sw: 2 });
  return s + disc(cx, L * 0.62, W / 2 - 3) + decal(p, cx, L * 0.55, 30);
}

function fixedwing(p, W, L) {
  const b = p.body, cx = W / 2;
  let s = poly([[cx - 12, L * 0.42], [cx + 12, L * 0.42], [W - 4, L * 0.5], [W - 8, L * 0.6], [cx + 12, L * 0.62], [cx - 12, L * 0.62], [8, L * 0.6], [4, L * 0.5]], darker(b, 0.1));
  s += poly([[cx - 10, 26], [cx + 10, 26], [cx + 70, 16], [cx + 70, 36], [cx + 10, 46], [cx - 10, 46], [cx - 70, 36], [cx - 70, 16]], darker(b, 0.1));
  s += ellipse(cx, L * 0.52, 18, L * 0.46, b);
  s += ellipse(cx, L * 0.8, 9, L * 0.08, GLASS, { sw: 1.5 });                      // sensor nose
  s += rect(cx - 30, 2, 60, 8, ROTOR, { rx: 4, sw: 1.5, extra: ' fill-opacity="0.5"' }); // pusher prop
  s += line(cx - 120, L * 0.52, cx + 120, L * 0.52, lighter(b, 0.25), 3);
  return s + decal(p, cx, L * 0.4, 26) + circle(10, L * 0.56, 3, '#3cff7a', { sw: 0 }) + circle(W - 10, L * 0.56, 3, '#ff3c3c', { sw: 0 });
}

function ductfan(p, W, L) {
  const b = p.body, cx = W / 2, r = W * 0.24;
  let s = '';
  for (const x of [r + 4, W - r - 4]) {
    s += circle(x, L * 0.45, r, darker(b, 0.2)) + circle(x, L * 0.45, r - 10, ROTOR, { sw: 1.5, extra: ' fill-opacity="0.35"' });
    s += line(x - r + 12, L * 0.45, x + r - 12, L * 0.45, '#3a3d42', 3);
  }
  s += ellipse(cx, L * 0.52, 22, L * 0.42, b);
  s += ellipse(cx, L * 0.8, 12, L * 0.1, GLASS, { sw: 1.5 });
  return s + rect(cx - 8, L * 0.25, 16, L * 0.3, lighter(b, 0.3), { rx: 6, sw: 0 }) + decal(p, cx, L * 0.4, 24);
}

function ground(p, W, L, { gun = false, axles = [0.2, 0.8] } = {}) {
  const b = p.body, cx = W / 2;
  let s = axles.map(a => axle(W, a * L, W * 0.2, L * 0.2, 0)).join('');
  s += rect(W * 0.14, 6, W * 0.72, L - 12, b, { rx: W * 0.14 });
  s += rect(W * 0.26, L * 0.15, W * 0.48, L * 0.45, lighter(b, 0.15), { rx: 8, sw: 2 });
  s += decal(p, cx, L * 0.3, W * 0.4);
  if (gun) return s + turret(darker(b, 0.1), cx, L * 0.55, W * 0.2, L - 2, 6);
  s += circle(cx, L * 0.78, W * 0.12, darker(b, 0.3), { sw: 2 }) + circle(cx, L * 0.82, W * 0.05, GLASS, { sw: 1 });
  return s + line(W * 0.3, L * 0.12, W * 0.3, -1, '#2a2b2e', 2);
}

function trackedDrone(p, W, L) {
  const b = p.body, cx = W / 2;
  let s = track(0, 6, L - 6, W * 0.24, 10) + track(W * 0.76, 6, L - 6, W * 0.24, 10);
  s += rect(W * 0.2, 12, W * 0.6, L * 0.7, b, { rx: 8 });
  s += rect(W * 0.3, 22, W * 0.4, L * 0.3, lighter(b, 0.15), { rx: 5, sw: 2 });
  s += line(cx, L * 0.55, cx - 10, L - 10, METAL, 7) + line(cx - 10, L - 10, cx + 8, L - 4, METAL, 5); // manipulator
  return s + circle(cx, L * 0.55, 10, darker(b, 0.3), { sw: 2 });
}

function crawler(p, W, L) {
  const b = p.body, c = W / 2;
  let s = '';
  for (const [a, k] of [[-0.6, 1], [-0.2, 1.1], [0.2, 1.1], [0.6, 1]]) {
    const dx = Math.cos(a) * c * 0.92 * k, dy = Math.sin(a) * c * 0.92;
    s += line(c, c, c + dx, c + dy, darker(b, 0.45), 3) + line(c, c, c - dx, c + dy, darker(b, 0.45), 3);
  }
  s += ellipse(c, c, W * 0.22, L * 0.3, b, { sw: 2 });
  return s + circle(c, c + L * 0.2, W * 0.08, GLASS, { sw: 1.2 });
}

function micro(p, W, L) {
  const b = p.body, c = W / 2;
  return circle(c, c, c - 3, b, { sw: 2 }) + circle(c, c, c * 0.55, lighter(b, 0.2), { sw: 1.2 })
    + circle(c, c + c * 0.62, 4, GLASS, { sw: 1 }) + circle(c, c + c * 0.62, 1.5, LED, { sw: 0 });
}

function anthro(p, W, L) {
  const b = p.body, c = W / 2;
  let s = rect(c - 34, L * 0.38, 16, 34, darker(b, 0.2), { rx: 6, sw: 2 })                 // forearms reach forward
    + rect(c + 18, L * 0.38, 16, 34, darker(b, 0.2), { rx: 6, sw: 2 });
  s += ellipse(c, L * 0.42, 34, 14, b);                                             // shoulders
  s += rect(c - 12, L * 0.3, 24, 14, darker(b, 0.3), { rx: 4, sw: 2 });             // back pack
  s += circle(c, L * 0.48, 11, lighter(b, 0.2), { sw: 2.5 });                       // head
  return s + rect(c - 8, L * 0.48 + 5, 16, 5, GLASS, { rx: 2, sw: 1 }) + decal(p, c, L * 0.4, 18);
}

function sentry(p, W, L) {
  const b = p.body, c = W / 2;
  let s = '';
  for (const a of [Math.PI / 2 + 2.1, Math.PI / 2 - 2.1, -Math.PI / 2]) s += line(c, c, c + Math.cos(a) * 44, c - Math.sin(a) * 44, '#2a2b2e', 5);
  return s + rect(c - 5, c, 10, L / 2 - 4, darker(b, 0.45), { sw: 2 }) + rect(c + 8, c + 6, 6, L / 2 - 14, darker(b, 0.45), { sw: 1.5 })
    + circle(c, c, 20, b) + rect(c - 12, c - 12, 12, 12, lighter(b, 0.25), { rx: 3, sw: 0 });
}

/* ── The archetypes ────────────────────────────────────────────────────────────────────────── */

/**
 * `size` is [width across, length nose-to-tail] in METRES — the token's width and height in 1 m
 * squares, so multiples of ½ m (Foundry's token step). `palette` is the hash's choice of paints.
 */
export const ARCHETYPES = {
  compact:        { size: [1.5, 3.5], palette: 'civilian', draw: (p, W, L) => car(p, W, L, { cab: [0.14, 0.68], ws: 0.12, rw: 0.06, r: 0.26, axles: [0.16, 0.82] }), about: 'city car / subcompact' },
  sedan:          { size: [2, 5],     palette: 'civilian', draw: (p, W, L) => car(p, W, L, { cab: [0.27, 0.68] }), about: 'saloon / family car' },
  sports:         { size: [2, 4.5],   palette: 'civilian', draw: (p, W, L) => car(p, W, L, { cab: [0.26, 0.58], ws: 0.1, rw: 0.06, r: 0.3 }), about: 'coupé / sports car' },
  racer:          { size: [2, 5],     palette: 'civilian', draw: racer, about: 'open-wheel race car' },
  limo:           { size: [2, 6.5],   palette: 'civilian', draw: (p, W, L) => car(p, W, L, { cab: [0.22, 0.72], ws: 0.08, rw: 0.06, r: 0.16, axles: [0.15, 0.84] }), about: 'limousine' },
  suv:            { size: [2, 5],     palette: 'civilian', draw: (p, W, L) => car(p, W, L, { cab: [0.08, 0.7], ws: 0.1, rw: 0.04, r: 0.12, rack: true }), about: 'SUV / off-roader' },
  jeep:           { size: [2, 4],     palette: 'military', draw: jeep, about: 'open utility / light strike vehicle' },
  pickup:         { size: [2, 5.5],   palette: 'civilian', draw: (p, W, L) => car(p, W, L, { cab: [0.42, 0.7], ws: 0.09, rw: 0.04, r: 0.1, bed: 'open' }), about: 'pickup, open bed' },
  'pickup-flat':  { size: [2, 5.5],   palette: 'civilian', draw: (p, W, L) => car(p, W, L, { cab: [0.42, 0.72], ws: 0.09, rw: 0.04, r: 0.08, bed: 'flat' }), about: 'cab with a flatbed' },
  'pickup-cover': { size: [2, 5.5],   palette: 'civilian', draw: (p, W, L) => car(p, W, L, { cab: [0.42, 0.72], ws: 0.09, rw: 0.04, r: 0.08, bed: 'covered' }), about: 'cab with a covered bed / canopy' },
  van:            { size: [2, 5],     palette: 'civilian', draw: van, about: 'minivan / minibus' },
  boxvan:         { size: [2.5, 6.5], palette: 'civilian', draw: boxvan, about: 'step-van / box van / ambulance' },
  bus:            { size: [2.5, 12],  palette: 'civilian', draw: bus, about: 'bus / motorhome' },
  truck:          { size: [2.5, 9],   palette: 'civilian', draw: truck, about: 'cab-over box truck' },
  snowcat:        { size: [3, 6.5],   palette: 'civilian', draw: snowcat, about: 'tracked civilian crawler' },
  scooter:        { size: [1, 1.5],   palette: 'civilian', draw: scooter, about: 'scooter / folding bike' },
  sportbike:      { size: [1, 2],     palette: 'civilian', draw: bike, about: 'sport or trail bike' },
  cruiser:        { size: [1, 2.5],   palette: 'civilian', draw: (p, W, L) => bike(p, W, L, { cruiser: true }), about: 'cruiser / touring bike' },
  snowmobile:     { size: [1, 3],     palette: 'civilian', draw: snowmobile, about: 'snowmobile' },
  apc:            { size: [3, 7.5],   palette: 'military', draw: apc, about: 'wheeled APC / armoured car' },
  'armored-truck':{ size: [2.5, 7],   palette: 'military', draw: armoredTruck, about: 'armoured riot or security truck' },
  'tracked-apc':  { size: [3.5, 7],   palette: 'military', draw: trackedApc, about: 'tracked APC / IFV' },
  tank:           { size: [3.5, 10],  palette: 'military', draw: tank, about: 'tank / self-propelled gun' },
  aircraft:       { size: [30, 50],   palette: 'civilian', draw: aircraft, about: 'jet transport (misfiled as cars, TODO 240)' },
  rotor:          { size: [1, 1],     palette: 'drone',    draw: rotor, about: 'multirotor drone' },
  helidrone:      { size: [1.5, 2.5], palette: 'drone',    draw: helidrone, about: 'single-rotor helicopter drone' },
  fixedwing:      { size: [3, 2],     palette: 'drone',    draw: fixedwing, about: 'fixed-wing RPV / glider' },
  ductfan:        { size: [1.5, 1.5], palette: 'drone',    draw: ductfan, about: 'vectored-thrust / ducted-fan drone' },
  ground:         { size: [1, 1.5],   palette: 'drone',    draw: ground, about: 'wheeled utility drone' },
  'combat-rover': { size: [1.5, 2.5], palette: 'military', draw: (p, W, L) => ground(p, W, L, { gun: true, axles: [0.18, 0.5, 0.82] }), about: 'six-wheeled armed ground drone' },
  'tracked-drone':{ size: [1, 1.5],   palette: 'drone',    draw: trackedDrone, about: 'tracked work drone with an arm' },
  crawler:        { size: [0.5, 0.5], palette: 'drone',    draw: crawler, about: 'legged crawler' },
  micro:          { size: [0.5, 0.5], palette: 'drone',    draw: micro, about: 'micro / household puck drone' },
  anthro:         { size: [1, 1],     palette: 'drone',    draw: anthro, about: 'anthroform drone' },
  sentry:         { size: [1, 1],     palette: 'military', draw: sentry, about: 'tripod sentry gun' },
};

/** Texture resolution: 200 px a metre, capped so no side passes 4096 px (the usual GPU limit). */
export const pxPerMetre = ([w, l]) => Math.min(200, Math.floor(4096 / Math.max(w, l)));

/** The SVG text of one archetype in one paint. */
export function renderSvg(archetype, paintName) {
  const a = ARCHETYPES[archetype], paint = PAINTS[paintName];
  if (!a || !paint) throw new Error(`no archetype "${archetype}" or paint "${paintName}"`);
  const [W, L] = a.size.map(m => m * 100), k = pxPerMetre(a.size) / 100;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W * k}" height="${L * k}" viewBox="0 0 ${W} ${L}">
<!-- ${archetype} (${a.about}), ${paintName}, ${a.size[0]} × ${a.size[1]} m, front facing south. Drawn by tools/build-vehicle-art.mjs. -->
<g stroke-linejoin="round">
${a.draw(paint, W, L)}
</g>
</svg>
`;
}

/* ── The mapping ───────────────────────────────────────────────────────────────────────────── */

/** The reviewed name → archetype map. A value is an archetype, or `{ archetype, paint }`. */
export function readMap(file = MAP_FILE) {
  const raw = JSON.parse(readFileSync(file, 'utf8')).entries;
  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, typeof v === 'string' ? { archetype: v } : v]));
}

/** The paint for a vehicle: the data file's choice, else its archetype's palette by name hash. */
export function paintFor(name, entry) {
  if (entry.paint) return entry.paint;
  const pal = PALETTES[ARCHETYPES[entry.archetype].palette];
  return pal[hashName(name) % pal.length];
}

/** What a mapped vehicle gets: the file, its `img` path and its token size. */
export function artFor(name, entry) {
  const paint = paintFor(name, entry);
  const file = `${entry.archetype}-${paint}.svg`;
  const [width, height] = ARCHETYPES[entry.archetype].size;
  return { file, img: `${IMG_DIR}/${file}`, width, height };
}

export const isStock = img => !img || STOCK_IMAGES.includes(img) || img.startsWith(`${IMG_DIR}/`);

/** Every in-scope pack entry: `{ pack, key, doc }`. */
export function inScopeEntries(src = SRC) {
  const out = [];
  for (const pack of readdirSync(src).sort()) {
    if (!/^sr3e-.+-(vehicles|drones)$/.test(pack)) continue;
    for (const [key, doc] of readSourceDir(join(src, pack))) {
      if (key.startsWith('!actors!') && isInScope(pack, doc)) out.push({ pack, key, doc });
    }
  }
  return out;
}

/** The files the mapping needs: file name → SVG text. */
export function renderAll(map = readMap()) {
  const files = new Map();
  for (const [name, entry] of Object.entries(map)) {
    const { file } = artFor(name, entry);
    if (!files.has(file)) files.set(file, renderSvg(entry.archetype, paintFor(name, entry)));
  }
  return new Map([...files].sort(([a], [b]) => a.localeCompare(b)));
}

/** Point one pack entry at its art. Returns true when it changed. */
export function applyArt(doc, art) {
  if (!isStock(doc.img)) return false;
  const tok = doc.prototypeToken ?? {};
  if (tok.texture?.src && !isStock(tok.texture.src)) return false;
  const before = JSON.stringify([doc.img, doc.prototypeToken]);
  doc.img = art.img;
  doc.prototypeToken = { ...tok, width: art.width, height: art.height, texture: { ...(tok.texture ?? {}), src: art.img } };
  return JSON.stringify([doc.img, doc.prototypeToken]) !== before;
}

/* ── The first-draft heuristic (`--draft` only — the data file is what counts) ─────────────── */

export function guessArchetype(pack, doc) {
  const name = doc.name, t = `${name} ${doc.system?.notes ?? ''}`;
  if (pack.endsWith('-drones')) {
    if (/sentry/i.test(name)) return 'sentry';
    if (/roto|vtol|aeroquip/i.test(name)) return /roto-|aeroquip/i.test(name) ? 'helidrone' : 'rotor';
    if (/rpv|condor|strato|gossamer|indrahar/i.test(name)) return 'fixedwing';
    if (/Alt-mode Speed/i.test(t)) return 'ductfan';
    if (/arachnoid|kanmushi|felix|bright/i.test(name)) return 'crawler';
    if (/hachiman|guyver|butler|barback|fix-it/i.test(name)) return 'anthro';
    if (/skimmer|spectator|dust devil|house helper/i.test(name)) return 'micro';
    if (/turret/i.test(t)) return 'combat-rover';
    if (/crawler|kodiak|dlk/i.test(name)) return 'tracked-drone';
    return 'ground';
  }
  const vt = doc.system?.vehicleType;
  if (vt === 'motorcycle') {
    if (/scoot|papoose/i.test(name)) return 'scooter';
    if (/snow/i.test(name)) return 'snowmobile';
    if (/harley|viking|eagle|pinto/i.test(name)) return 'cruiser';
    return 'sportbike';
  }
  if (vt === 'military') {
    if (/leopard|kreuzritter|striker|tank/i.test(name)) return 'tank';
    if (/citymaster|roadmaster|mobmaster|mariah/i.test(name)) return 'armored-truck';
    if (/bmv|keller|falkener|semaphore/i.test(name)) return 'tracked-apc';
    return 'apc';
  }
  if (/Alt-mode Speed\/Accel: \d+\(\d{3,}\)/.test(t) && (doc.system?.attributes?.speed?.value ?? 0) >= 500) return 'aircraft';
  if (/snowbear/i.test(name)) return 'snowcat';
  if (/ambulance|step-van|cl bed|media van/i.test(name)) return 'boxvan';
  if (/flat bed/i.test(name)) return 'pickup-flat';
  if (/cov\. bed/i.test(name)) return 'pickup-cover';
  if (/pickup|brumby/i.test(name)) return 'pickup';
  if (/mini|kombi|eurovan|g12a|journeyman|multipla|mulipla|van/i.test(name)) return 'van';
  if (/rv\)|bison|4201/i.test(name)) return 'bus';
  if (/racer/i.test(name)) return 'racer';
  if (/phaeton|tsarina|stratocruiser/i.test(name)) return 'limo';
  if (/nomad|gopher|lsv|mpuv/i.test(name)) return 'jeep';
  if (/prairie|trailblazer|land rover|otter|snowbear/i.test(name)) return 'suv';
  if (/warp|dynamit|camaro|spider|avus|scirocco|slipstream|nightsky|westwind/i.test(name)) return 'sports';
  if (/runabout|jackrabbit|elektro|beetle|mayfly|swatch|citycab|commuter|salsa/i.test(name)) return 'compact';
  return 'sedan';
}

/* ── The contact sheet (`--sheet`) ─────────────────────────────────────────────────────────── */

/**
 * One cell per archetype on a 1 m grid, in its first palette paint, scaled to fit the cell (the
 * label gives the true size), plus a strip of every paint on the sedan. Needs Playwright's Chromium,
 * which is why only this mode imports it.
 */
export async function writeContactSheet(outFile) {
  const cell = 220;
  const tile = (svg, w, l, label) => {
    const k = Math.min((cell - 30) / w, (cell - 50) / l, 100);
    const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    const grid = `background-image:linear-gradient(#0000 calc(100% - 1px),#ffffff14 0),linear-gradient(90deg,#0000 calc(100% - 1px),#ffffff14 0);background-size:${k}px ${k}px`;
    return `<div class="c"><div class="g" style="${grid}"><img src="${src}" style="width:${w * k}px;height:${l * k}px"></div><b>${label}${k < 100 ? ' · scaled' : ''}</b></div>`;
  };
  const cells = Object.entries(ARCHETYPES).map(([name, a]) =>
    tile(renderSvg(name, PALETTES[a.palette][0]), a.size[0], a.size[1], `${name} · ${a.size[0]}×${a.size[1]} m`));
  const paints = Object.keys(PAINTS).map(p => tile(renderSvg('sedan', p), 2, 5, p));
  const html = `<!doctype html><html><head><style>
body{margin:0;padding:16px;background:#202226;color:#cfd2d6;font:12px system-ui,sans-serif}
h1{font-size:15px;margin:4px 0 10px} .w{display:flex;flex-wrap:wrap;gap:8px}
.c{width:${cell}px;display:flex;flex-direction:column;align-items:center;background:#2a2c31;border-radius:6px;padding:6px 0}
.g{width:${cell - 12}px;height:${cell - 40}px;display:flex;align-items:center;justify-content:center;background-color:#3b4a3a}
b{font-weight:500;margin-top:5px}
</style></head><body><h1>Vehicle token art — every archetype (front faces south · 1 m grid · TODO 241)</h1><div class="w">${cells.join('')}</div>
<h1 style="margin-top:18px">Paints (sedan)</h1><div class="w">${paints.join('')}</div></body></html>`;
  const { chromium } = await import('playwright');
  // SR3E_CHROMIUM names a browser when the installed Playwright has none of its own.
  const browser = await chromium.launch(process.env.SR3E_CHROMIUM ? { executablePath: process.env.SR3E_CHROMIUM } : {});
  try {
    const page = await browser.newPage({ viewport: { width: 8 * (cell + 8) + 32, height: 600 } });
    await page.setContent(html);
    await page.screenshot({ path: outFile, fullPage: true });
  } finally { await browser.close(); }
  console.log(`wrote ${outFile}`);
}

/* ── Run ───────────────────────────────────────────────────────────────────────────────────── */

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const entries = inScopeEntries();

  if (args.includes('--draft')) {
    const map = existsSync(MAP_FILE) ? readMap() : {};
    const guesses = Object.fromEntries(entries.filter(e => !map[e.doc.name]).map(e => [e.doc.name, guessArchetype(e.pack, e.doc)]));
    console.log(JSON.stringify(guesses, null, 2));
    process.exit(0);
  }

  const sheetAt = args.indexOf('--sheet');
  if (sheetAt >= 0) {
    await writeContactSheet(args[sheetAt + 1] ?? join(ROOT, 'audit', 'vehicle-art-contact-sheet.png'));
    process.exit(0);
  }

  const map = readMap();
  const missing =entries.filter(e => !map[e.doc.name]).map(e => `${e.pack}: ${e.doc.name}`);
  const unknown = Object.entries(map).filter(([, v]) => !ARCHETYPES[v.archetype] || (v.paint && !PAINTS[v.paint])).map(([k]) => k);
  if (missing.length || unknown.length) {
    for (const m of missing) console.error(`no archetype for ${m} — add it to tools/data/vehicle-archetypes.json (--draft suggests one)`);
    for (const u of unknown) console.error(`unknown archetype or paint for "${u}"`);
    process.exit(1);
  }

  // The SVGs.
  const files = renderAll(map);
  let drift = 0;
  if (!check) mkdirSync(OUT, { recursive: true });
  for (const [file, text] of files) {
    const p = join(OUT, file);
    if (existsSync(p) && readFileSync(p, 'utf8') === text) continue;
    drift++;
    if (!check) writeFileSync(p, text);
  }
  for (const f of existsSync(OUT) ? readdirSync(OUT) : []) {
    if (files.has(f)) continue;
    drift++;
    if (!check) rmSync(join(OUT, f));
  }
  console.log(`${check ? 'would write' : 'wrote'} ${drift} of ${files.size} SVG(s) in styles/textures/vehicles/`);

  // The packs.
  let total = 0;
  for (const pack of [...new Set(entries.map(e => e.pack))]) {
    const all = readSourceDir(join(SRC, pack));
    let changed = 0;
    for (const [key, doc] of all) {
      if (!key.startsWith('!actors!') || !isInScope(pack, doc)) continue;
      if (applyArt(doc, artFor(doc.name, map[doc.name]))) changed++;
    }
    if (!changed) continue;
    total += changed;
    console.log(`${check ? 'would update' : 'updated'}  ${pack}: ${changed} document(s)`);
    if (!check) writeSourceDir(join(SRC, pack), all);
  }
  console.log(total ? (check ? `${total} document(s) to update.` : `${total} document(s) updated — now run: npm run packs:build`) : 'Packs up to date.');
  process.exit(check && (total || drift) ? 1 : 0);
}
