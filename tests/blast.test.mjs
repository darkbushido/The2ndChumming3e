/**
 * Blast falloff — TODO 150. SR3 p.119 (Grenade Damage Table, worked examples) and p.283 (Blast column).
 *
 *   Offensive 10S −1 per meter · Defensive 10S −1 per half meter · Concussion 12M (Stun) −1 per meter
 *   "3 meters away from an offensive grenade blast would suffer 7S base damage … 6 meters away …
 *    4S. … 3 meters from the blast point of a defensive grenade … only a base 4S damage (10S - 6),
 *    while a target standing 6 meters away would be out of the grenade's blast effect entirely."
 */
import { readFileSync } from 'node:fs';
import { Blast } from '../scripts/data/blast.mjs';

export const name = 'blast';

const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  const off = Blast.rate('-1/m');
  const def = Blast.rate('-1/.5m');

  // The book's notation, with the hyphen, the true minus and the en dash the PDF prints.
  t.is('-1/m is 1 per metre', Blast.perMetre('-1/m'), 1);
  t.is('en dash: –1/.5m is 2 per metre', Blast.perMetre('–1/.5m'), 2);
  t.is('true minus: −1/.5m is 2 per metre', Blast.perMetre('−1/.5m'), 2);
  t.is('commercial explosives: -6/m', Blast.perMetre('-6/m'), 6);
  t.is('blank is "none recorded", not zero', Blast.perMetre(''), null);
  t.is('the book prints -- for no blast: none recorded', Blast.perMetre('--'), null);
  t.is('blank falls back to the offensive rate', Blast.rate(''), 1);

  // p.119's worked examples, exactly.
  t.is('offensive, 3 m: 10 - 3 = 7', Blast.power(10, 3, off), 7);
  t.is('offensive, 6 m: 10 - 6 = 4', Blast.power(10, 6, off), 4);
  t.is('defensive, 3 m: 10 - 6 = 4', Blast.power(10, 3, def), 4);
  t.is('defensive, 6 m: out of the blast entirely', Blast.power(10, 6, def), 0);
  t.is('defensive, 5 m: exactly spent', Blast.power(10, 5, def), 0);
  t.is('defensive, 1 m: 10 - 2 = 8', Blast.power(10, 1, def), 8);
  t.is('offensive, 0 m: full Power', Blast.power(10, 0, off), 10);
  t.is('Power never goes negative', Blast.power(10, 40, off), 0);
  t.is('concussion (-1/m), 12M at 4 m: 8', Blast.power(12, 4, Blast.rate('-1/m')), 8);

  // Reach.
  t.is('offensive 10 reaches 10 m', Blast.radius(10, off), 10);
  t.is('defensive 10 reaches 5 m', Blast.radius(10, def), 5);

  const models = read('scripts/data/ItemDataModels.js');
  t.is('projectile, thrown and ammunition (mini-grenades, TODO 163) items carry a blast field',
    (models.match(/blast:\s+new StringField/g) ?? []).length, 3);

  const sheet = read('scripts/sheets/SR3EItemSheet.js');
  t.is('the projectile, thrown and mini-grenade sheets let a GM set it',
    (sheet.match(/_f\('Blast falloff', 'blast'/g) ?? []).length, 3);

  // The flow reads it (source-level: the AoE branch cannot be imported without Foundry).
  const actor = read('scripts/documents/SR3EActor.js');
  t.ok('the blast Power uses the grenade\'s own rate, not a flat -1/m',
    /Blast\.power\(basePower, h\.dist, perM\)/.test(actor) && !/Math\.max\(0, basePower - h\.dist\)/.test(actor));
  t.is('the falloff is carried into the roll state at every site',
    (actor.match(/aoeBlast:\s+(options|state)\.aoeBlast/g) ?? []).length, 3);
  // TODO 159 — the Chunky Salsa calculator takes the same falloff, direct wave and rebounds alike.
  const sr3e = read('scripts/sr3e.js');
  t.ok('the confined-space calculator is handed the grenade\'s falloff', /falloff: Blast\.rate\(state\.aoeBlast\)/.test(actor));
  const calc = sr3e.slice(sr3e.indexOf('function calcBlastM'), sr3e.indexOf('function calcBlastM') + 1400);
  t.is('every wave it computes goes through Blast.power', (calc.match(/Blast\.power\(power, [^)]*, FALLOFF\)/g) ?? []).length, 4);
  t.ok('…and none is a bare power − distance', !/=\s*power - /.test(calc));
  t.ok('a wave reaches half as far at −1/.5m: 10 − 2·(2·2) = 2, not 6',
    Blast.power(10, 2 * 2, def) === 2 && Blast.power(10, 2 * 2, off) === 6);

  const item = read('scripts/documents/SR3EItem.js');
  // `round` is the grenade itself, or a launcher's loaded mini-grenade (TODO 163, tests/mini-grenade.test.mjs).
  t.ok('the throw hands the grenade\'s falloff to the roll', /options\.aoeBlast\s+= round\.blast/.test(item));
  t.ok('the blast radius follows the falloff', /Blast\.radius\(power, Blast\.rate\(round\.blast\)\)/.test(item));

  /* ── Walls — TODO 149 (reported in play: scatter went through walls) ──────────────────────
   *   SR3 p.119: "When a grenade's blast hits a barrier such as a wall … If the barrier falls, the
   *   blast continues on, but its Power Level is reduced by the original Barrier Rating. If the
   *   barrier does not fall, the blast may be channeled." */
  const p = Blast.stopShort({ x: 0, y: 0 }, { x: 100, y: 0 }, 10);
  t.eq('a grenade stops just short of the wall it meets', [p.x, p.y], [90, 0]);
  const q = Blast.stopShort({ x: 0, y: 0 }, { x: 5, y: 0 }, 10);
  t.eq('…never behind where it started (a wall at the thrower\'s feet)', [q.x, q.y], [0, 0]);
  t.is('a wall that falls: Power 7 past Barrier Rating 4 is 3 (p.119)', Blast.pastBarrier(7, 4), 3);
  t.is('…and never below 0', Blast.pastBarrier(3, 12), 0);

  t.ok('walls come from Foundry\'s movement-wall collision test', /polygonBackends\?\.move[\s\S]{0,120}testCollision\(a, b, \{ type: 'move', mode: 'closest' \}\)/.test(actor));
  t.ok('the throw stops at a wall between the thrower and the aim point', /_wallBetween\(state\.aoeThrowerCenter, aimed\)/.test(actor));
  t.ok('the scatter stops at a wall', /_wallBetween\(aimed, center\)/.test(actor));
  t.ok('a token behind a wall is not caught — it is listed for the GM', /if \(SR3EActor\._wallBetween\(center, tok\.center\)\) shielded\.push/.test(actor));
  t.ok('a fallen wall takes its Barrier Rating off the Power', /Blast\.pastBarrier\(t\.power, br\)/.test(actor));
  t.ok('the GM button carries the book\'s tables as its tooltip (the maintainer asked)', /sr-blast-wall-btn[\s\S]{0,200}data-tooltip-html="\$\{SR3EActor\.barrierTablesHtml\(\)/.test(actor));
  const cfg = read('scripts/config.js');
  t.ok('the Barrier Effect Table is transcribed with its three rows', (/barrierEffects: \[([\s\S]*?)\],/.exec(cfg)?.[1].match(/power:/g) ?? []).length === 3);
  const main = read('scripts/sr3e.js');
  t.ok('only the GM may say the wall fell', /\.sr-blast-wall-btn'\)\.forEach\(\(btn, i\) => \{\s*\n\s*if \(!game\.user\.isGM\) return _denyBtn/.test(main));
}
