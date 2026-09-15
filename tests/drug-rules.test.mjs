/**
 * Drug rules — addiction, tolerance, Edge, withdrawal · M&M pp.108-110 (TODO 124).
 *
 * The spine of this suite is the book's own worked example: Twitch and his Cram habit
 * (Addiction 4M, Tolerance 2, Edge 5/50, Fix Factor 2 days — p.122), followed from the first hit
 * through addiction, kicking it, a relapse and forced withdrawal (pp.108-110). Every number the
 * example prints is asserted; where the example and the rule sentence disagree (voluntary
 * withdrawal's "26 days"), the RULE is asserted and the discrepancy is named.
 */
import { DrugRules, DRUG_EFFECTS } from '../scripts/data/drug-rules.mjs';

export const name = 'drug-rules';

const CRAM = { addiction: '4M', tolerance: '2', edge: '5/50' };
const dose = (s, n, sys = CRAM) => { let r = { state: s }; for (let i = 0; i < n; i++) r = DrugRules.takeDose(r.state, sys, 'Cram'); return r; };

export async function run(t) {
  /* ── Parsing the ratings ────────────────────────────────────────────────────── */
  t.eq('4M/5P — mental and physical, separately', DrugRules.parseAddiction('4M/5P'), { M: 4, P: 5 });
  t.eq('SR2 writes 4M+3P', DrugRules.parseAddiction('4M+3P'), { M: 4, P: 3 });
  t.eq('7P — physical only', DrugRules.parseAddiction('7P'), { M: null, P: 7 });
  t.eq('a non-addictive drug', DrugRules.parseAddiction(''), { M: null, P: null });
  t.eq('Edge 5/50', DrugRules.parseEdge('5/50'), { pre: 5, post: 50 });
  t.eq('Edge 10/-- has no post-addiction Edge', DrugRules.parseEdge('10/--'), { pre: 10, post: null });
  t.is('"Special" is not an Edge', DrugRules.parseEdge('Special'), null);
  t.eq('the legacy `effect` field is read when it holds an Edge', DrugRules.drugEdge({ effect: '2/8' }), { pre: 2, post: 8 });
  t.is('…and ignored when it holds a damage code', DrugRules.drugEdge({ effect: '6D stun' }), null);
  t.eq('`edge` wins over the legacy field', DrugRules.drugEdge({ edge: '3/50', effect: '2/8' }), { pre: 3, post: 50 });
  t.is('the record key drops the packaging', DrugRules.drugKey('Jazz (per dose)'), 'jazz');
  t.is('…in either spelling', DrugRules.drugKey('Doom (1 dose)'), 'doom');

  /* ── Becoming addicted · p.108, Twitch's example ───────────────────────────── */
  const d1 = dose(null, 1);
  t.eq('the first hit: a Willpower test against the BASE rating 4', d1.tests,
    [{ kind: 'addiction', type: 'M', attr: 'willpower', tn: 4 }]);
  t.is('…and a tolerance test is due once it wears off (Body vs 2)', d1.state.toleranceDue, 2);
  const passed = DrugRules.addictionResult(d1.state, 'M', 1).state;
  t.ok('one success is enough to stay clean', !passed.addicted.M);
  const d4 = dose(passed, 3);
  t.eq('doses 2-4 owe nothing', d4.tests, []);
  const d5 = DrugRules.takeDose(d4.state, CRAM, 'Cram');
  t.is('"On his fifth use, the Addiction Rating is raised +1 to 5"', d5.state.current.M, 5);
  t.eq('…"and he must make another Willpower (5) Test"', d5.tests.map(x => x.tn), [5]);
  t.is('Tolerance rises with it', d5.state.tolerance, 3);
  const d15 = dose(d5.state, 10);
  t.is('"Skipping ahead another 10 doses, the modified Addiction Rating has been raised to 7"', d15.state.current.M, 7);
  const hooked = DrugRules.addictionResult(d15.state, 'M', 0);
  t.ok('he fails and is hooked', hooked.addicted && hooked.state.addicted.M);
  t.is('"the Addiction Rating reverts to the base rating (4) +1, or 5"', hooked.state.current.M, 5);
  t.eq('an addict owes no further addiction tests as the rating climbs',
    dose(hooked.state, 35).tests, []);
  t.is('after addiction the POST Edge (50) counts — total doses, 50 → +1', dose(hooked.state, 35).state.current.M, 6);
  t.eq('stretching a fix: Willpower against the current rating (6, as the book says)',
    DrugRules.addictTests(dose(hooked.state, 35).state), [{ kind: 'addict', type: 'M', attr: 'willpower', tn: 6 }]);

  /* ── Tolerance · p.109 ─────────────────────────────────────────────────────── */
  t.ok('no successes: tolerant', DrugRules.toleranceResult(d1.state, 0).tolerant);
  t.ok('one success: not tolerant', !DrugRules.toleranceResult(d1.state, 1).tolerant);
  t.is('…and the test is no longer due either way', DrugRules.toleranceResult(d1.state, 1).state.toleranceDue, null);

  /* ── Two addictions, two tests · p.108 ─────────────────────────────────────── */
  const jazz = DrugRules.takeDose(null, { addiction: '4M/5P', tolerance: '2', edge: '2/8' }, 'Jazz');
  t.eq('4M/5P: Willpower vs 4 AND Body vs 5', jazz.tests.map(x => `${x.attr}:${x.tn}`), ['willpower:4', 'body:5']);
  t.eq('a drug with no Edge never raises its ratings',
    dose(null, 20, { addiction: '3P', tolerance: '' }).state.current, { M: null, P: 3 });

  /* ── Kicking the habit · p.109-110 ─────────────────────────────────────────── */
  const at13 = { ...hooked.state, current: { M: 13, P: null } };
  t.is('"his current Addiction Rating (13) + 1"', DrugRules.kickTN(at13), 14);
  t.is('physical: +3', DrugRules.kickTN({ addicted: { P: true }, current: { P: 5 } }), 8);
  t.is('both: +4, on the higher rating', DrugRules.kickTN({ addicted: { M: true, P: true }, current: { M: 4, P: 6 } }), 10);
  t.is('not addicted: nothing to kick', DrugRules.kickTN({ addicted: { M: false, P: false } }), null);

  /* ── Withdrawal · p.110 ────────────────────────────────────────────────────── */
  let w = DrugRules.startWithdrawal(at13, false);
  t.eq('voluntary withdrawal: +2 to every TN, +4 concentrating', DrugRules.withdrawalPenalty(w), { tn: 2, concentration: 4, stunBoxes: 0 });
  w = DrugRules.passDay(w);
  t.is('day 1 of voluntary withdrawal: no drop yet (1 point every TWO days)', w.current.M, 13);
  w = DrugRules.passDay(w);
  t.is('day 2: 12', w.current.M, 12);
  let days = 2;
  while (w.withdrawal === 'withdrawal' && days < 60) { w = DrugRules.passDay(w); days++; }
  t.is('it takes 18 days to fall from 13 to the base of 4 — the rule, not the example\'s "26 (2 x 13)"', days, 18);
  t.ok('…and he is no longer addicted', !w.addicted.M && w.formerly.M);
  t.is('then rests days equal to the Addiction Rating (4), at +1', w.withdrawal, 'recovery');
  t.eq('recovery: +1 / +2', DrugRules.withdrawalPenalty(w), { tn: 1, concentration: 2, stunBoxes: 0 });
  for (let i = 0; i < 4; i++) w = DrugRules.passDay(w);
  t.is('after 4 days of rest the penalties are gone', w.withdrawal, '');

  const relapse = DrugRules.takeDose(DrugRules.startWithdrawal(at13, false), CRAM, 'Cram');
  t.ok('a dose during withdrawal re-addicts', relapse.readdicted && relapse.state.addicted.M);
  t.is('"back to being addicted, at an Addiction Rating of 14 (13 + 1)"', relapse.state.current.M, 14);
  t.is('…and ends the withdrawal', relapse.state.withdrawal, '');
  t.is('a dose after kicking it re-addicts too, +1 (Staying Clean)', DrugRules.takeDose(w, CRAM, 'Cram').state.current.M, 5);

  let f = DrugRules.startWithdrawal(relapse.state, true);
  t.eq('forced withdrawal: +3 / +6, and a persistent Moderate mental wound (3 Stun boxes)',
    DrugRules.withdrawalPenalty(f), { tn: 3, concentration: 6, stunBoxes: 3 });
  let fdays = 0;
  while (f.withdrawal === 'forced' && fdays < 60) { f = DrugRules.passDay(f); fdays++; }
  t.is('"For 10 days (current Addiction Rating of 14 - base rating of 4)"', fdays, 10);

  /* ── Durations ─────────────────────────────────────────────────────────────── */
  const three = () => 3;
  t.is('10 × 1D6 minutes', DrugRules.rollDuration({ dice: 1, mult: 10, unit: 'min' }, {}, three).amount, 30);
  t.is('12 hours − Body', DrugRules.rollDuration({ base: 12, minusBody: true, min: 1, unit: 'hr' }, { body: 5 }).amount, 7);
  t.is('…minimum 1', DrugRules.rollDuration({ base: 6, minusBody: true, min: 1, unit: 'hr' }, { body: 9 }).amount, 1);
  t.is('Essence + 1D6 hours, maximum 12', DrugRules.rollDuration({ essencePlus: 1, max: 12, unit: 'hr' }, { essence: 6 }, () => 6).amount, 12);

  /* ── Effects: what the records add up to ───────────────────────────────────── */
  t.ok('every effects entry cites its page', DRUG_EFFECTS.every(e => /^M&M p/.test(e.page)));
  const kam = DrugRules.totals({ k: { name: 'Kamikaze', active: { duration: '30 minutes' } } });
  t.eq('Kamikaze: +1 Body, +1 Quickness, +2 Strength, +1 Willpower (p.119)', kam.attrs, { bod: 1, qui: 1, str: 2, cha: 0, int: 0, wil: 1 });
  t.is('…+1D6 Initiative', kam.initDice, 1);
  t.is('…pain resistance 4', kam.painResistance, 4);
  const both = DrugRules.totals({ a: { name: 'Kamikaze', active: {} }, b: { name: 'Nitro', active: {} } });
  t.is('two drugs\' pain resistance: the larger, not the sum', both.painResistance, 6);
  t.eq('Jazz crashing: −1 Quickness, no longer +2', DrugRules.totals({ j: { name: 'Jazz', crash: {} } }).attrs.qui, -1);
  t.is('Cram crashing: a Moderate Stun offset for the crash', DrugRules.totals({ c: { name: 'Cram', crash: {} } }).stunBoxes, 3);
  const nova = DrugRules.totals({ n: { name: 'Novacoke', crash: {} } });
  t.ok('Novacoke crashing: Charisma to 1 and Willpower halved', nova.chaTo === 1 && nova.wilHalf);
  t.is('Bliss: +1 to all target numbers', DrugRules.totals({ b: { name: 'Bliss', active: {} } }).tn, 1);
  const fw = DrugRules.totals({ c: { name: 'Cram', withdrawal: 'forced' } });
  t.ok('forced withdrawal feeds the TN penalty and the Stun lookup', fw.tn === 3 && fw.stunBoxes === 3);
  t.is('a record with nothing running adds nothing', DrugRules.totals({ c: { name: 'Cram' } }).tn, 0);
  t.ok('the pack\'s misspelling still finds Novacoke', !!DrugRules.effectsFor('Novocoke'));
}
