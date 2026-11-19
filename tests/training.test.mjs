/**
 *
 * Core · SR3 p.245, p.95:
 *   the learning test's target number is "twice the Skill Rating" sought; an instructor needs the skill
 *   at 3+ and at least the rating sought; an Instruction (4) Test gives an additional die per two successes.
 * Shadowrun Companion p.48-50 (printed):
 *   base time = Karma spent × 7 (Active) / × 15 (Knowledge, Language); TN = new rating + 2; time ÷
 *   successes, none → × 1.5 rounded up; instructor +1 SUCCESS per 2; no successes on either test →
 *   cannot teach (a day's pay, +1.5 days); −1 TN for a new skill with an instructor; Suggested
 *   Instructor Fees Table. Worked examples: Sasser (p.49) and Scarecrow/Oak (p.50).
 */
import { readFileSync } from 'node:fs';
import { Training, RULES } from '../scripts/data/training.mjs';

export async function run(t) {
  // ── Core ──
  t.is('core: TN is twice the rating sought (3 → 6)', Training.tn(3), 6);
  t.is('core: learning at 1 is TN 2', Training.tn(1), 2);
  t.is('core is the default rule for tnFor', Training.tnFor('core', 4), 8);
  t.is('Instruction is always TN 4', Training.INSTRUCTION_TN, 4);
  t.is('successes count dice at or over the TN', Training.successes([1, 3, 4, 6, 5], 4), 3);
  t.is('one success gives no bonus', Training.instructorBonus(1), 0);
  t.is('two successes give one', Training.instructorBonus(2), 1);
  t.is('five successes give two', Training.instructorBonus(5), 2);
  t.is('a qualified teacher draws no warning', Training.instructorWarnings(5, 4).length, 0);
  t.is('a teacher below 3 is warned', Training.instructorWarnings(2, 2).length, 1);
  t.is('a teacher below the rating sought is warned', Training.instructorWarnings(4, 5).length, 1);

  // ── Companion ──
  t.is('SC: TN is the new rating + 2 (Sasser, Medicine 3 → TN 5)', Training.companionTN(3), 5);
  t.is('SC: a NEW skill with an instructor takes −1 TN', Training.companionTN(1, { newSkill: true, instructor: true }), 2);
  t.is('SC: an improvement with an instructor takes no −1', Training.companionTN(4, { instructor: true }), 6);
  t.is('tnFor reads the Companion rule', Training.tnFor(RULES.companion, 4), 6);
  t.is('SC: Knowledge base time = Karma × 15 (Sasser: 3 → 45 days)', Training.baseDays(3, false), 45);
  t.is('SC: Active base time = Karma × 7 (Scarecrow: 6 → 42 days)', Training.baseDays(6, true), 42);
  t.is('SC: 45 days ÷ 2 successes rounds up to 23 (Sasser)', Training.finalDays(45, 2), 23);
  t.is('SC: no successes → × 1.5, rounded up', Training.finalDays(45, 0), 68);
  t.is('SC: alone, 42 ÷ 2 = 21 (Scarecrow)',
    Training.companionOutcome({ base: 42, studentHits: 2 }).days, 21);
  const oak = Training.companionOutcome({ base: 42, studentHits: 2, instructionHits: 2 });
  t.is('SC: Oak\'s 2 Instruction successes add ONE success → 42 ÷ 3 = 14', oak.days, 14);
  t.is('…as a success, not a die', oak.hits, 3);
  const flop = Training.companionOutcome({ base: 42, studentHits: 2, instructionHits: 0 });
  t.ok('SC: no Instruction successes → the instructor cannot teach', flop.failed && !flop.taught);
  t.is('…and 1.5 days are added (21 + 1.5 → 23)', flop.days, 23);
  t.ok('SC: the student\'s no successes also fail the lesson',
    Training.companionOutcome({ base: 42, studentHits: 0, instructionHits: 3 }).failed);

  // Fees (SC p.50)
  t.is('fee: Instruction 4 teaching rating 4 is ¥100/day (Oak)', Training.dailyFee(4, 4), 100);
  t.is('fee: Oak\'s 14 days come to ¥1,400', Training.totalFee(Training.dailyFee(4, 4), 14), 1400);
  t.is('fee: Instruction 1 is ¥40', Training.dailyFee(1, 4), 40);
  t.is('fee: Instruction 6 is ¥400', Training.dailyFee(6, 4), 400);
  t.is('fee: 7+ is +¥100 per level over 6 (8 → ¥600)', Training.dailyFee(8, 4), 600);
  t.is('fee: teaching rating 2-3 is −¥25/day', Training.dailyFee(4, 3), 75);
  t.is('fee: teaching rating 6-7 is +¥25/day', Training.dailyFee(4, 7), 125);
  t.is('fee: teaching rating 8+ is +¥50/day', Training.dailyFee(4, 9), 150);
  t.is('fee: over 4 hours a day is +50% of the daily fee', Training.dailyFee(4, 4, { overFourHours: true }), 150);
  t.is('fee: a specialization is +50% of the total', Training.totalFee(100, 10, { specialization: true }), 1500);
  t.is('fee: a classroom is −50% of the total', Training.totalFee(100, 10, { classroom: true }), 500);

  // Rule of Six for the instructor's Charisma (8) default
  const seq = vals => { let i = 0; return () => vals[i++]; };
  t.is('Rule of Six: a 6 then a 2 makes 8 against TN 8', Training.rollSuccesses(1, 8, seq([6, 2])), 1);
  t.is('…a 6 then a 1 is 7, short of 8', Training.rollSuccesses(1, 8, seq([6, 1])), 0);
  t.is('…a lone 1 always fails', Training.rollSuccesses(1, 2, seq([1])), 0);
  t.is('…at TN 4 a 6 needs no re-roll', Training.rollSuccesses(2, 4, seq([6, 4])), 2);

  // Choices
  const sk = { rating: 3, specialisations: [{ name: 'X', level: 2 }] };
  t.is('raising 3 trains toward 4', Training.targetFor('skill:abc:rating', sk), 4);
  t.is('a new spec trains toward base+1', Training.targetFor('skill:abc:addspec', sk), 4);
  t.is('improving a level-2 spec trains toward base+3', Training.targetFor('skill:abc:improvespec:0', sk), 6);
  t.is('learning trains toward 1', Training.targetFor('skill:abc:learn', { rating: 0 }), 1);
  t.is('an attribute is not trained here', Training.targetFor('attr:body', sk), null);
  t.ok('a spec choice is a specialization (fee +50%)', Training.isSpecialization('skill:a:improvespec:0'));

  // ── Source level: offered, never a gate ──
  const src  = readFileSync(new URL('../scripts/sheets/SR3EActorSheet.js', import.meta.url), 'utf8');
  const calc = src.slice(src.indexOf('static async _onSpendKarmaCalculator'));
  t.ok('Spend Karma offers "Train first…"', calc.includes("action: 'train'"));
  t.ok('training returns before the purchase is charged',
    calc.indexOf('if (trainChoice)') < calc.indexOf("'system.karma': karma - chosenCost"));
  const mod = readFileSync(new URL('../scripts/SR3ETraining.js', import.meta.url), 'utf8');
  t.ok('the training roll never writes Karma', !mod.includes('system.karma'));
  const rolledSrc = mod.slice(mod.indexOf('static async rolled'), mod.indexOf('static async pay'));
  t.ok('the result card only OFFERS the fee (no nuyen write)', !rolledSrc.includes('system.nuyen'));
  t.ok('the fee is paid only after a confirm dialog', /DialogV2\.wait[\s\S]*system\.nuyen/.test(mod.slice(mod.indexOf('static async pay'))));
  const actorSrc = readFileSync(new URL('../scripts/documents/SR3EActor.js', import.meta.url), 'utf8');
  t.ok('the follow-up is registered', /training:\s*\['SR3ETraining', 'rolled'\]/.test(actorSrc));
  const main = readFileSync(new URL('../scripts/sr3e.js', import.meta.url), 'utf8');
  t.ok('SR3ETraining is on game.sr3e', /game\.sr3e = \{[^}]*SR3ETraining/.test(main));
  t.ok('the trainingRule setting defaults to core', /'trainingRule'[\s\S]{0,600}default: 'core'/.test(main));
  t.ok('the pay button is permission-gated', /sr-train-pay-btn[\s\S]{0,300}_mine\(p\)/.test(main));
}
