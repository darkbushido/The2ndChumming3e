/**
 * Vehicle tokens to scale — `scripts/data/token-scale.mjs` · TODO 297. The maintainer, 2026-11-10: tokens are "always to
 * scale"; a vehicle's footprint in metres ÷ the scene's grid distance.
 */
import { readFileSync } from 'node:fs';
import { TokenScale as T, DESIGN_SIZE, MIN_SQUARES } from '../scripts/data/token-scale.mjs';
import { CHASSIS_INFO } from '../scripts/data/chassis-catalog.mjs';

export const name = 'token-scale';

const m1 = { distance: 1, units: 'm' };
const veh = (extra = {}) => ({ type: 'vehicle', name: 'A designed van', flags: { The2ndChumming3e: { sizeM: [2, 5.5] } },
  prototypeToken: { width: 2, height: 5.5 }, ...extra });

export async function run(t) {
  /* ── Every chassis drawing has a footprint ─────────────────────────────── */
  const arts = [...new Set(Object.values(CHASSIS_INFO).map(([a]) => a))];
  t.eq('every designer chassis art has a footprint', arts.filter(a => !DESIGN_SIZE[a]), []);
  t.eq('every footprint is two positive metres', Object.entries(DESIGN_SIZE).filter(([, f]) => !(f.length === 2 && f.every(n => n > 0))).map(([k]) => k), []);

  /* ── Metres → squares ──────────────────────────────────────────────────── */
  t.eq('a 9 m truck on a 1 m grid is 9 squares long', T.size([2.5, 9], m1), { width: 2.5, height: 9 });
  t.eq('…and 6 on a 1.5 m grid', T.size([2.5, 9], { distance: 1.5, units: 'm' }), { width: 1.75, height: 6 });
  t.is('a 330 m carrier on a 20 m grid is about 16.5 squares', T.squares(330, { distance: 20, units: 'm' }), 16.5);
  t.is('feet are converted (5 ft squares = 1.524 m)', T.squares(9, { distance: 5, units: 'ft' }), 6);
  t.is('a tiny drone on a 5 m grid stays clickable', T.squares(1, { distance: 5, units: 'm' }), MIN_SQUARES);
  t.is('no grid reads as 1 m', T.gridMetres({}), 1);

  /* ── Which tokens are scaled ───────────────────────────────────────────── */
  const g2 = { distance: 2, units: 'm' };
  t.eq('a designed vehicle\'s token is scaled to the scene', T.forToken({ width: 2, height: 5.5 }, veh(), g2), { width: 1, height: 2.75 });
  t.is('…a token the GM resized is left alone', T.forToken({ width: 3, height: 3 }, veh(), g2), null);
  t.is('…a prototype sized by hand is left alone', T.forToken({ width: 4, height: 4 }, veh({ prototypeToken: { width: 4, height: 4 } }), g2), null);
  t.eq('…an old 1 × 1 prototype is scaled too', T.forToken({ width: 1, height: 1 }, veh({ prototypeToken: { width: 1, height: 1 } }), m1), { width: 2, height: 5.5 });
  t.is('…already the right size: nothing to change', T.forToken({ width: 2, height: 5.5 }, veh(), m1), null);
  t.is('not a vehicle: never', T.forToken({ width: 1, height: 1 }, { type: 'npc', prototypeToken: {} }, m1), null);
  t.eq('a pack vehicle uses its art metres', T.footprint({ type: 'vehicle', name: 'GMC 4201', flags: {} }), [2.5, 9]);

  const sr3e = readFileSync(new URL('../scripts/sr3e.js', import.meta.url), 'utf8');
  /* ── A copy keeps its footprint after a rename ─────────────────────────── */
  t.eq('a pack vehicle is stamped with its metres as it is created', T.stamp({ type: 'vehicle', name: 'GMC 4201', flags: {} }), [2.5, 9]);
  t.is('…not one that already carries a footprint', T.stamp({ type: 'vehicle', name: 'GMC 4201', flags: { The2ndChumming3e: { sizeM: [1, 1] } } }), null);
  t.is('…not an unknown name', T.stamp({ type: 'vehicle', name: 'Bob', flags: {} }), null);
  t.eq('…so after a rename it still scales', T.footprint({ type: 'vehicle', name: "Bob's 4201", flags: { The2ndChumming3e: { sizeM: [2.5, 9] } } }), [2.5, 9]);
  t.ok('the preCreateActor hook stamps it', /TokenScale\.stamp\(document\)/.test(sr3e));

  /* ── Rideable seats ────────────────────────────────────────────────────── */
  const ride = T.rideable({ flags: {} }, veh({ system: { seating: 5 } }));
  t.is('Rideable: as many riders as the vehicle has seats', ride?.MaxRiderFlag, 5);
  t.ok('…and the token is rideable, a rectangle, free to move inside', !!(ride?.issetRideableFlag && ride?.TokenFormFlag === 'TokenFormRectangle' && ride?.InsideMovementFlag));
  t.is('…a token with its own Rideable settings is left alone', T.rideable({ flags: { Rideable: { MaxRiderFlag: 2 } } }, veh({ system: { seating: 5 } })), null);
  t.is('…never on a character', T.rideable({ flags: {} }, { type: 'character', system: {} }), null);
  t.ok('the hook only sets Rideable flags when the module is active', /game\.modules\.get\('Rideable'\)\?\.active \? TokenScale\.rideable/.test(sr3e));

  /* ── Wiring ────────────────────────────────────────────────────────────── */
  t.ok('the preCreateToken hook scales vehicle tokens', /TokenScale\.forToken\(token, token\.actor, token\.parent\?\.grid/.test(sr3e));
  const des = readFileSync(new URL('../scripts/SR3EVehicleDesigner.js', import.meta.url), 'utf8');
  t.ok('the designer stamps the footprint on a new vehicle', des.includes('[`flags.${SCOPE}.sizeM`]: fp'));
}
