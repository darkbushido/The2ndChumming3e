/**
 * Train first — the optional learning roll before a Karma purchase.  · SR3 p.245, p.95 (TODO 309)
 *
 *   p.245: the learning test's target number is "twice the Skill Rating" sought.
 *   p.95:  an instructor needs the skill at 3+ and at least the rating sought; an Instruction (4) Test
 *          gives the pupil an additional die per two successes.
 */
import { readFileSync } from 'node:fs';
import { Training } from '../scripts/data/training.mjs';

export async function run(t) {
  t.is('TN is twice the rating sought (3 → 6)', Training.tn(3), 6);
  t.is('learning at 1 is TN 2', Training.tn(1), 2);
  t.is('Instruction is always TN 4', Training.INSTRUCTION_TN, 4);
  t.is('successes count dice at or over the TN', Training.successes([1, 3, 4, 6, 5], 4), 3);
  t.is('one success gives no die', Training.instructorBonus(1), 0);
  t.is('two successes give one die', Training.instructorBonus(2), 1);
  t.is('five successes give two dice', Training.instructorBonus(5), 2);
  t.is('a qualified teacher draws no warning', Training.instructorWarnings(5, 4).length, 0);
  t.is('a teacher below 3 is warned', Training.instructorWarnings(2, 2).length, 1);
  t.is('a teacher below the rating sought is warned', Training.instructorWarnings(4, 5).length, 1);

  const sk = { rating: 3, specialisations: [{ name: 'X', level: 2 }] };
  t.is('raising 3 trains toward 4', Training.targetFor('skill:abc:rating', sk), 4);
  t.is('a new spec trains toward base+1', Training.targetFor('skill:abc:addspec', sk), 4);
  t.is('improving a level-2 spec trains toward base+3', Training.targetFor('skill:abc:improvespec:0', sk), 6);
  t.is('learning trains toward 1', Training.targetFor('skill:abc:learn', { rating: 0 }), 1);
  t.is('an attribute is not trained here', Training.targetFor('attr:body', sk), null);

  // Source-level: offered, never a gate — the Train button spends nothing and returns before any charge.
  const src  = readFileSync(new URL('../scripts/sheets/SR3EActorSheet.js', import.meta.url), 'utf8');
  const calc = src.slice(src.indexOf('static async _onSpendKarmaCalculator'));
  t.ok('Spend Karma offers "Train first…"', calc.includes("action: 'train'"));
  t.ok('training returns before the purchase is charged',
    calc.indexOf('if (trainChoice) return') < calc.indexOf("'system.karma': karma - chosenCost"));
  const train = src.slice(src.indexOf('static async _trainForKarma'), src.indexOf('static async _onSpendKarmaCalculator'));
  t.ok('the training roll never writes Karma', !train.includes('system.karma'));
}
