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
  t.is('projectile and thrown items both carry a blast field',
    (models.match(/blast:\s+new StringField/g) ?? []).length, 2);

  const sheet = read('scripts/sheets/SR3EItemSheet.js');
  t.is('the projectile and thrown sheets let a GM set it',
    (sheet.match(/_f\('Blast falloff', 'blast'/g) ?? []).length, 2);

  // The flow reads it (source-level: the AoE branch cannot be imported without Foundry).
  const actor = read('scripts/documents/SR3EActor.js');
  t.ok('the blast Power uses the grenade\'s own rate, not a flat -1/m',
    /Blast\.power\(basePower, h\.dist, perM\)/.test(actor) && !/Math\.max\(0, basePower - h\.dist\)/.test(actor));
  t.is('the falloff is carried into the roll state at every site',
    (actor.match(/aoeBlast:\s+(options|state)\.aoeBlast/g) ?? []).length, 3);
  const item = read('scripts/documents/SR3EItem.js');
  t.ok('the throw hands the item\'s falloff to the roll', /options\.aoeBlast\s+= this\.system\.blast/.test(item));
  t.ok('the blast radius follows the falloff', /Blast\.radius\(power, Blast\.rate\(this\.system\.blast\)\)/.test(item));
}
