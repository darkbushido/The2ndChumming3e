/**
 * Smoke, gas and flash clouds — walls, looks, wind, smoke visibility, gas resistance, the Flash-Pak — TODO 164.
 *
 * > "Gas Grenades: … commonly Neuro-Stun VIII (see p. 250) … The gas cloud affects everything within a 10-meter
 * > radius, and lasts for 2 Combat Turns (less in windy areas, at the gamemaster's discretion)."
 * > "Smoke Grenades: … fills an area 20 meters in diameter, lasting for 2 Combat Turns (less in windy areas).
 * > Smoke obscures vision, applying visibility modifiers to relevant tests. Infra-red smoke contains hot
 * > particles that obscure thermographic vision."
 * > "Flash-Pak: … Anyone facing a flash-pak receives a +4 target number modifier (+2 if the target has flare
 * > compensation). The pak also negates modifiers from poor or no lighting, but imposes its own +2 modifier
 * > because of the strobing flashes."                                                            — SR3 p.283
 * > "Neuro-stun VIII · Damage: 6S Stun · Speed: End of the following Combat Turn … Even if he resists this, he
 * > suffers disorientation for about an hour, adding +2 to all target numbers."                  — SR3 p.250
 * > "The Body Test to resist diseases and toxins uses the Power of the attack as the target number. Every 2
 * > successes reduces the Damage Level."                                                         — SR3 p.250
 */
import { readFileSync, existsSync } from 'node:fs';
import { AreaEffect } from '../scripts/data/area-effect.mjs';
import { AreaShape } from '../scripts/data/area-shape.mjs';
import { STEP_BUTTONS } from '../scripts/data/open-steps.mjs';

export const name = 'area-cloud';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

/** Shoelace area of flat polygon points. */
const area = p => {
  let s = 0;
  for (let i = 0, n = p.length / 2; i < n; i++) {
    const j = (i + 1) % n;
    s += p[2 * i] * p[2 * j + 1] - p[2 * j] * p[2 * i + 1];
  }
  return Math.abs(s) / 2;
};
const wall = (x0, y0, x1, y1) => ({ a: { x: x0, y: y0 }, b: { x: x1, y: y1 } });
const C = { x: 0, y: 0 };

export async function run(t) {
  /* ══ 0 · the cloud stops at walls ══════════════════════════════════════════════════════ */
  t.is('no walls: keep the plain circle', AreaShape.clipCircle(C, 10, []), null);
  t.is('a wall beyond the radius changes nothing', AreaShape.clipCircle(C, 10, [wall(20, -50, 20, 50)]), null);

  // A long vertical wall 5 px to the right of a radius-10 circle: the circle minus its far segment.
  const half = AreaShape.clipCircle(C, 10, [wall(5, -100, 5, 100)]) ?? [];   // [] if it wrongly returns null, so the asserts below fail rather than throw
  t.ok('a wall inside the radius clips the circle', half.length >= 6);
  t.ok('…nothing of the cloud lies past the wall', half.every((v, i) => i % 2 || v <= 5));
  t.ok('…the far side of the circle is untouched', Math.min(...half.filter((_, i) => i % 2 === 0)) < -9.9);
  const analytic = Math.PI * 100 - (100 * Math.acos(0.5) - 5 * Math.sqrt(75));   // circle minus the segment past x = 5
  t.ok(`…and the area is the circle less the segment (${analytic.toFixed(1)})`, Math.abs(area(half) - analytic) / analytic < 0.03,
    `got ${area(half).toFixed(1)}`);
  t.ok('a point behind the wall is not in the cloud', !AreaShape.inPolygon(half, { x: 8, y: 0 }));
  t.ok('…a point on the blast side is', AreaShape.inPolygon(half, { x: 3, y: 0 }));

  // A closed room 4 px square round the blast point: the cloud cannot leave it.
  const room = [wall(-2, -2, 2, -2), wall(2, -2, 2, 2), wall(2, 2, -2, 2), wall(-2, 2, -2, -2)];
  const boxed = AreaShape.clipCircle(C, 10, room) ?? [];
  t.ok('a room holds the cloud', boxed.length >= 6 && boxed.every(v => Math.abs(v) <= 2.01));
  t.ok('…whose area is the room (less the pull-back from each wall)', area(boxed) > 8 && area(boxed) <= 16, `got ${area(boxed).toFixed(2)}`);

  // A wall BETWEEN the blast and a point hides that point; one off to the side does not.
  const behind = AreaShape.clipCircle(C, 10, [wall(4, -3, 4, 3)]) ?? [];
  t.ok('a short wall shadows what is behind it', behind.length >= 6 && !AreaShape.inPolygon(behind, { x: 7, y: 0 }));
  t.ok('…but not what is round it', AreaShape.inPolygon(behind, { x: 7, y: 6 }));
  t.is('a wall the blast point stands ON is no wall to hide behind', AreaShape.clipCircle(C, 10, [wall(0, -1, 0, 1)]), null);
  t.is('a wall only touching nothing changes nothing (zero radius)', AreaShape.clipCircle(C, 0, [wall(1, -1, 1, 1)]), null);

  // Region membership (smoke offered to the TN window, who is in the gas).
  const circle = [{ type: 'circle', x: 0, y: 0, radius: 10, hole: false }];
  t.ok('a point inside a circle shape', AreaShape.contains(circle, { x: 6, y: 6 }));
  t.ok('…and outside it', !AreaShape.contains(circle, { x: 8, y: 8 }));
  t.ok('a polygon shape', AreaShape.contains([{ type: 'polygon', points: half }], { x: 3, y: 0 })
    && !AreaShape.contains([{ type: 'polygon', points: half }], { x: 8, y: 0 }));
  t.ok('a hole is not inside', !AreaShape.contains([...circle, { type: 'circle', x: 0, y: 0, radius: 2, hole: true }], { x: 1, y: 0 }));
  t.ok('no shapes holds nothing', !AreaShape.contains([], { x: 0, y: 0 }));
  const box = AreaShape.relativeBox([10, 20, 30, 20, 30, 50]);
  t.eq('a Drawing wants a box and points relative to it', [box.x, box.y, box.width, box.height, box.points], [10, 20, 20, 30, [0, 0, 20, 0, 20, 30]]);

  /* ══ 2 · a look per kind, and wind ═════════════════════════════════════════════════════ */
  t.is('smoke', AreaEffect.kind('Smoke Grenade'), 'smoke');
  t.is('infra-red smoke is its own kind', AreaEffect.kind('Smoke (IR) Grenade'), 'irsmoke');
  t.is('Thermal Smoke (non-core) too', AreaEffect.kind('Thermal Smoke Grenade'), 'irsmoke');
  t.is('gas', AreaEffect.kind('Gas Grenade (Neuro-Stun VII)'), 'gas');
  t.is('flash', AreaEffect.kind('Flash-Pak'), 'flash');
  t.is('an ordinary grenade has no kind', AreaEffect.kind('Offensive HE Grenade'), '');
  const looks = ['smoke', 'irsmoke', 'gas', 'flash'].map(k => AreaEffect.look(k));
  t.ok('every kind has a look with a texture the system ships',
    looks.every(l => l && existsSync(new URL(`../${l.texture.replace('systems/The2ndChumming3e/', '')}`, import.meta.url))));
  t.is('…all different colours', new Set(looks.map(l => l.color)).size, 4);
  t.is('no look for no kind', AreaEffect.look(''), null);

  // wind: SR3 p.283 "less in windy areas, at the gamemaster's discretion"
  t.eq('laid in round 3 (ends 5), −1 at round 3: ends 4, 1 left', AreaEffect.shiftExpiry(5, -1, 3), { expires: 4, remaining: 1, ended: false });
  t.eq('…−2 at round 3: gone', AreaEffect.shiftExpiry(5, -2, 3), { expires: 3, remaining: 0, ended: true });
  t.eq('+1 extends', AreaEffect.shiftExpiry(5, 1, 3), { expires: 6, remaining: 3, ended: false });
  t.eq('a cloud with no end round is given one from now', AreaEffect.shiftExpiry(null, 2, 3), { expires: 5, remaining: 2, ended: false });
  t.is('no combat (NaN): nothing to shift', AreaEffect.shiftExpiry(5, -1, NaN).remaining, null);
  t.is('remaining turns', AreaEffect.remaining(5, 4), 1);
  t.is('…never negative', AreaEffect.remaining(5, 9), 0);
  t.is('…none for a cloud with no end', AreaEffect.remaining(null, 3), null);
  t.is('the label says what is left', AreaEffect.label('Smoke Grenade', 1), 'Smoke Grenade (1 Combat Turn left)');
  t.is('…plural', AreaEffect.label('Smoke Grenade', 2), 'Smoke Grenade (2 Combat Turns left)');

  /* ══ 3 · smoke offers a Visibility Table row (SR3 p.112) ═══════════════════════════════ */
  t.is('smoke → Heavy Smoke/Fog/Rain', AreaEffect.visibilityCondition('smoke'), 'Heavy Smoke/Fog/Rain');
  t.is('infra-red smoke → Thermal Smoke', AreaEffect.visibilityCondition('irsmoke'), 'Thermal Smoke');
  t.is('gas obscures nothing', AreaEffect.visibilityCondition('gas'), null);
  t.is('a flash changes no row', AreaEffect.visibilityCondition('flash'), null);
  // A thermographic viewer: Heavy Smoke +1, Thermal Smoke +8 — the worse row is the one offered.
  const thermo = { 'Heavy Smoke/Fog/Rain': 1, 'Thermal Smoke': 8 };
  t.is('both clouds, a thermographic viewer: Thermal Smoke (+8)', AreaEffect.pickCondition(['smoke', 'irsmoke'], c => thermo[c]), 'Thermal Smoke');
  t.is('…order does not matter', AreaEffect.pickCondition(['irsmoke', 'smoke'], c => thermo[c]), 'Thermal Smoke');
  t.is('a normal-vision viewer: Heavy (+6) beats Thermal (+4)', AreaEffect.pickCondition(['smoke', 'irsmoke'], c => ({ 'Heavy Smoke/Fog/Rain': 6, 'Thermal Smoke': 4 })[c]), 'Heavy Smoke/Fog/Rain');
  t.is('only gas about: nothing to offer', AreaEffect.pickCondition(['gas', 'flash'], () => 9), null);
  t.is('nobody in a cloud: nothing to offer', AreaEffect.pickCondition([], () => 9), null);

  /* ══ 4 · gas: Neuro-Stun, VII or VIII ══════════════════════════════════════════════════ */
  const g7 = AreaEffect.gasToxin('Gas Grenade (Neuro-Stun VII)');
  t.is('the toxin the book gives numbers for is VIII: 6S (p.250)', [g7.name, g7.damage].join(' '), 'Neuro-Stun VIII 6S');
  t.is('disorientation +2 to all target numbers', g7.disorientation, 2);
  t.ok('the grenade labelled VII says so — the p.283 row against the p.250 entry', /VII/.test(g7.discrepancy) && /p\.250/.test(g7.discrepancy) && /VIII/.test(g7.discrepancy));
  t.is('a grenade labelled VIII has no discrepancy to note', AreaEffect.gasToxin('Gas Grenade (Neuro-Stun VIII)').discrepancy, '');
  t.is('the name alone (no number): nothing to contradict', AreaEffect.gasToxin('Gas Grenade').discrepancy, '');

  /* ══ 5 · the Flash-Pak ═════════════════════════════════════════════════════════════════ */
  t.eq('facing it: +4 and the strobe +2', AreaEffect.flashMods(false), { facing: 4, strobe: 2, total: 6, flare: false });
  t.eq('with flare compensation: +2 and the strobe +2', AreaEffect.flashMods(true), { facing: 2, strobe: 2, total: 4, flare: true });

  /* ══ wiring (source level — these need a live canvas) ══════════════════════════════════ */
  const actor = read('scripts/documents/SR3EActor.js');
  const item  = read('scripts/documents/SR3EItem.js');
  const sr3e  = read('scripts/sr3e.js');
  t.ok('the effect marker is clipped to the walls', /kind: AreaEffect\.kind\(state\.aoeEffect\.name\), baseName: state\.aoeEffect\.name, clipToWalls: true/.test(actor));
  t.ok('…by the same movement walls the throw stops at, minus open doors', /static _wallSegments\(/.test(actor) && /w\.isOpen === true\) continue/.test(actor) && /d\.move === NONE\) continue/.test(actor));
  t.ok('…as a polygon Region when clipped, the circle otherwise', /type: 'polygon', points: clip/.test(actor) && /type: 'circle', x: center\.x/.test(actor));
  t.ok('the Region records its kind and its texture drawing', /areaKind: kind, baseName/.test(actor) && /decorDrawingId: decorId/.test(actor));
  t.ok('the texture is a pattern-filled Drawing', /fillType: CONST\.DRAWING_FILL_TYPES\?\.PATTERN/.test(actor) && /texture: look\.texture/.test(actor));
  t.ok('a deleted Region takes its Drawing with it, on the active GM', /Hooks\.on\('deleteRegion'/.test(sr3e) && /decorDrawingId/.test(sr3e) && /activeGM\?\.isSelf/.test(sr3e));
  t.ok('the card offers the GM wind buttons, hidden from players', /_windButtons\(resultRegionId\)/.test(actor) && /sr-wind-row'\)\.forEach\(row => \{ if \(!game\.user\.isGM\) row\.remove\(\)/.test(sr3e));
  t.ok('wind moves the end round and deletes a cloud with none left', /AreaEffect\.shiftExpiry\(region\.getFlag\(NS, 'expiresRound'\)/.test(actor) && /if \(res\.ended\) \{\s*await region\.delete\(\)/.test(actor));
  t.ok('the ranged TN window is offered the smoke row', /smoke:\s+await game\.sr3e\.SR3EActor\.smokeOffer\(actor, \[targetActor\]\)/.test(item));
  t.ok('…and a spell cast too', /smoke:\s+await game\.sr3e\.SR3EActor\.smokeOffer\(actor, isAoE \? \[\] : targetActors\)/.test(item));
  t.ok('…as a PRESELECTED, editable option — never forced', /c === smokeCond \? ' selected'/.test(item));
  t.ok('smoke is read from the token against the Region\'s own shapes', /AreaShape\.contains\(c\.shapes, p\)/.test(actor));
  t.ok('each token in a gas cloud gets its own card', /for \(const h of hits\) afterCard\.push\(\(\) => SR3EActor\.postGasExposureCard\(h\.actor, toxin/.test(actor));
  t.ok('…whose button opens the toxin soak: Body, no armour, Power 6S', /noArmor: true, noArmorNote: `\$\{p\.toxin\}/.test(actor));
  t.ok('…permission-gated to the character\'s owner', /gasresist[\s\S]{0,400}_mineId\(pl\.actorId\)/.test(sr3e));
  t.ok('the Flash-Pak\'s tick list is GM only', /sr-flash-btn[\s\S]{0,200}!game\.user\.isGM\) return _denyBtn/.test(sr3e));
  t.ok('…its dialog is a DialogV2.wait', /handleFlashTick[\s\S]{0,2500}DialogV2\.wait/.test(actor));
  t.ok('…and posts +4 (+2) and +2 per ticked token, quoting nothing applied', /AreaEffect\.flashMods\(flare\)/.test(actor) && /Nothing is applied/.test(actor));
  t.ok('both new owed buttons are open combat steps', 'sr-gas-resist-btn' in STEP_BUTTONS && 'sr-flash-btn' in STEP_BUTTONS);
}
