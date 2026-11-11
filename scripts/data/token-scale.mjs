/**
 * Vehicle tokens to scale · TODO 297. The maintainer, 2026-11-10: tokens are "always to scale"; a big vehicle goes on a scene
 * with bigger squares. A vehicle carries its real footprint in metres; when its token is placed, the footprint is divided by
 * that scene's grid distance — a 9 m truck is 9 squares on a 1 m grid and 3 on a 3 m one.
 *
 * Footprints: the designer's chassis families below (real-world sizes of the kind of vehicle each drawing shows, rounded), and
 * the pack vehicles' own metres (`VEHICLE_ART`, TODO 257). Width × length; tokens are drawn nose up, so length is the height.
 * Pure — no Foundry.
 */
import { VehicleArt } from './vehicle-art.mjs';

/** Designer art id (`chassis-catalog.mjs`) → [width m, length m]. */
export const DESIGN_SIZE = {
  'racing-bike': [0.8, 2], 'chopper': [1, 2.5], 'dirt-bike': [0.8, 2.2], 'scooter': [0.7, 1.8], 'atv': [1.2, 2],
  'skiff': [1.6, 4], 'water-scooter': [1.2, 3], 'speedboat': [2.5, 8], 'cruiser-boat': [4, 14], 'yacht': [8, 40],
  'corvette': [10, 80], 'cruiser-ship': [20, 170], 'destroyer': [18, 150], 'frigate': [15, 130], 'carrier': [75, 330],
  'freighter': [32, 220], 'merchantman': [16, 90], 'tug': [9, 25], 'patrol-boat': [5, 20], 'trawler': [7, 25], 'barge': [10, 60],
  'sedan': [1.8, 4.8], 'sports-car': [2, 4.5], 'subcompact': [1.6, 3], 'limo': [2, 7], 'suv': [2, 5], 'van': [2, 5.5],
  'rv': [2.5, 11], 'sand-buggy': [1.8, 3.5], 'semi-tractor': [2.5, 7], 'box-truck': [2.5, 9], 'apc-wheeled': [3, 8],
  'apc-tracked': [3.2, 7], 'caterpillar': [4, 9], 'forklift': [1.2, 3],
  'airliner': [36, 40], 'hsct': [28, 60], 'jet-fighter': [12, 18], 'single-engine': [11, 8], 'twin-engine': [14, 12],
  'ultralight': [10, 6], 'attack-heli': [14, 17], 'utility-heli': [16, 19], 'cargo-heli': [18, 30], 'autogyro': [8, 5],
  'tilt-wing': [25, 18], 'thunderbird': [10, 15], 'jump-jet': [9, 14], 'hovercraft': [6, 15], 'zeppelin': [40, 240],
  'mini-blimp': [4, 15], 'semiballistic': [40, 80], 'suborbital': [25, 45],
  'loco-bullet': [3.4, 25], 'loco-bulk': [3.2, 22], 'loco-express': [3.2, 20], 'loco-switcher': [3.1, 14],
  'loco-nonrail': [3, 15], 'streetcar': [2.6, 20], 'railcar-freight': [3.2, 18], 'railcar-passenger': [3.2, 25],
  'trailer-box': [2.6, 12], 'trailer-axle': [1.5, 3],
  'attack-sub': [10, 110], 'boomer': [13, 170], 'patrol-sub': [6, 50], 'commercial-sub': [8, 60], 'minisub': [2.5, 8],
  'bathyscaph': [4, 15],
  'crawler-wheeled': [1, 1.5], 'crawler-tracked': [1, 1.5], 'uav-fixed': [3, 2], 'rotor-uav': [1.5, 1.5], 'vt-uav': [2, 2],
  'skimmer': [3, 6], 'walker': [1.5, 1.5], 'anthroform': [1, 1], 'sea-sled': [1, 2.5],
};

const FEET = 0.3048;
/** Smallest token side, in squares: a person-sized drone on a 5 m grid stays clickable. */
export const MIN_SQUARES = 0.5;

export class TokenScale {
  /** The scene grid's square size in metres; feet are converted. Anything unreadable → 1 m. */
  static gridMetres(grid = {}) {
    const d = Number(grid.distance);
    if (!(d > 0)) return 1;
    return /^(ft|feet|foot|')$/i.test(String(grid.units ?? '').trim()) ? d * FEET : d;
  }

  /** Metres → squares on that grid, to the nearest quarter, never under MIN_SQUARES. */
  static squares(metres, grid) {
    const n = Math.round((Number(metres) / TokenScale.gridMetres(grid)) * 4) / 4;
    return Math.max(MIN_SQUARES, n);
  }

  /** [width m, length m] → { width, height } in squares (nose up: length is the height). */
  static size(footprint, grid) {
    const [w, l] = footprint;
    return { width: TokenScale.squares(w, grid), height: TokenScale.squares(l, grid) };
  }

  /** A designer chassis' footprint by its art id, or null. */
  static forArt(art) { return DESIGN_SIZE[art] ?? null; }

  /** A vehicle actor's footprint: the designer's stamp (`flags.<scope>.sizeM`), else the pack art's metres, else null. */
  static footprint(actor, scope = 'The2ndChumming3e') {
    if (actor?.type !== 'vehicle') return null;
    const own = actor.flags?.[scope]?.sizeM;
    if (Array.isArray(own) && own.length === 2 && own.every(n => Number(n) > 0)) return own.map(Number);
    const art = VehicleArt.artFor(actor.name);
    return art ? [art.width, art.height] : null;
  }

  /**
   * The size a new token of this vehicle takes on a scene, or null to leave it. Only a token still at its prototype's size is
   * scaled — a GM who sized the prototype by hand keeps that size everywhere.
   */
  static forToken(token, actor, grid, scope) {
    const fp = TokenScale.footprint(actor, scope);
    if (!fp) return null;
    const proto = actor.prototypeToken ?? {};
    const untouched = (token.width ?? 1) === (proto.width ?? 1) && (token.height ?? 1) === (proto.height ?? 1);
    const protoIsMetres = (proto.width ?? 1) === fp[0] && (proto.height ?? 1) === fp[1];
    const protoIsDefault = (proto.width ?? 1) === 1 && (proto.height ?? 1) === 1;
    if (!untouched || !(protoIsMetres || protoIsDefault)) return null;
    const size = TokenScale.size(fp, grid);
    return size.width === token.width && size.height === token.height ? null : size;
  }

  /**
   * Flags for the Rideable module (v5) on a new vehicle token: rideable, a rectangle, riders move freely inside, and as many
   * riders as the vehicle has seats (Seating includes the driver) — the maintainer, 2026-11-11: "set the number of seats in
   * rideable to the vehicle stats". Null when it isn't a vehicle or the token already carries its own Rideable settings.
   */
  static rideable(token, actor) {
    if (actor?.type !== 'vehicle') return null;
    if (token?.flags?.Rideable && Object.keys(token.flags.Rideable).length) return null;
    const seats = Math.max(0, Math.trunc(Number(actor.system?.seating ?? 0)) || 0);
    return { issetRideableFlag: true, MaxRiderFlag: seats, TokenFormFlag: 'TokenFormRectangle', InsideMovementFlag: true };
  }
}
