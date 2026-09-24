/**
 * Stress Points on implants and Attributes · M&M pp.124-131 (TODO 109).
 *
 * The book's worked example (p.126) is the spine of this file. Leggy takes a Serious powerbolt — 6
 * boxes — and three things take wound effects:
 *   • his reaction enhancer (basic cyberware) rolls 1D6÷2 → 3 Stress, then 1 die vs TN 3 → 2: it breaks;
 *   • his nephritic screen (basic bioware) takes 1 on top of 3 → TN 4, rolls 2 dice → 3 and 5: it holds;
 *   • his Reaction rolls 1D6÷2 → 3 Stress, then half his unaugmented Reaction vs TN 3: it holds.
 */
import { readFileSync } from 'node:fs';
import { Stress, STRESS_DICE, PAGE } from '../scripts/data/stress.mjs';

export const name = 'stress';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  const S = Stress;

  /* ── The Stress Level Table · p.126 ───────────────────────────────────────── */
  t.is('0 is no Stress at all', S.level(0), null);
  t.eq('1-2 Light', [1, 2].map(n => S.level(n)), ['Light', 'Light']);
  t.eq('3-5 Moderate', [3, 4, 5].map(n => S.level(n)), ['Moderate', 'Moderate', 'Moderate']);
  t.eq('6-9 Serious', [6, 9].map(n => S.level(n)), ['Serious', 'Serious']);
  t.eq('10+ Deadly', [10, 25].map(n => S.level(n)), ['Deadly', 'Deadly']);
  t.ok('Deadly fails outright — no test is rolled', S.autoFails(10) && !S.autoFails(9));
  t.is('a sheet reads it as "3 (Moderate)"', S.describe(3), '3 (Moderate)');

  /* ── The Stress Dice Table · p.126 ────────────────────────────────────────── */
  t.eq('cyberware by grade: basic 1, alpha 2, beta 3, delta 5',
    ['Standard', 'Alpha', 'Beta', 'Delta'].map(g => S.dice({ kind: 'cyberware', grade: g })), [1, 2, 3, 5]);
  t.eq('bioware: cosmetic 1, basic 2, cultured 4',
    ['Cosmetic', 'Basic', 'Cultured'].map(g => S.dice({ kind: 'bioware', grade: g })), [1, 2, 4]);
  t.is('"Used Alpha" rolls its equivalent grade — used is a modifier ON a grade, as with Essence',
    S.dice({ kind: 'cyberware', grade: 'Used Alpha' }), 2);
  t.is('an unknown grade falls to basic', S.dice({ kind: 'cyberware', grade: 'Exotic' }), 1);
  t.is('an Attribute rolls HALF its unaugmented rating', S.dice({ kind: 'attribute', attribute: 5 }), 2);
  t.eq('the table is the book\'s', [STRESS_DICE.cyberware.delta, STRESS_DICE.bioware.cultured], [5, 4]);

  /* ── The Stress Test's target number · p.126 ──────────────────────────────── */
  t.is('the TN is the CURRENT total', S.testTN(3), 3);
  t.is('…including Stress that was already there — Leggy\'s screen: 3 + 1 = TN 4', S.testTN(4), 4);
  t.is('a cyberlimb\'s Integrity Rating lowers it', S.testTN(6, { integrity: 2 }), 4);
  t.is('a bioware Attribute boost raises it', S.testTN(4, { boost: 2 }), 6);
  t.is('…and no TN falls below 2', S.testTN(1, { integrity: 5 }), 2);

  /* ── 1D6 ÷ 2 · p.124 ─────────────────────────────────────────────────────── */
  t.eq('a 6 is 3 Stress, a 3 is 1 — rounded down', [6, 5, 4, 3, 2, 1].map(d => S.pointsFromDie(d)), [3, 2, 2, 1, 1, 0]);
  t.is('new implants start at 0', S.startingPoints({ kind: 'cyberware' }), 0);
  // M&M p.45 "1D3 permanent Stress Points" over p.124's "1D6 ÷ 2" — the maintainer's ruling (TODO 174).
  t.eq('used cyberware starts with 1D3 (M&M p.45): a d6 of 1-6 → 1,1,2,2,3,3 — never 0',
    [1, 2, 3, 4, 5, 6].map(d => S.startingPoints({ kind: 'cyberware', used: true, die: d })), [1, 1, 2, 2, 3, 3]);
  t.is('…a wound effect is still 1D6 ÷ 2 down — a 1 is 0 there', S.pointsFromDie(1), 0);
  t.is('bioware always starts with 1', S.startingPoints({ kind: 'bioware' }), 1);

  /* ── Wound effects · p.126 ───────────────────────────────────────────────── */
  // "use the results of the Damage Resistance Test as if it were a Success Test, with a target number
  //  equal to the number of damage boxes inflicted … wound effects equal to the margin of failure".
  t.is('6 boxes, highest soak die 3 → three wound effects', S.woundEffects(3, 6), 3);
  t.is('a die that matches the boxes is no effect at all', S.woundEffects(6, 6), 0);
  t.is('…nor is beating them', S.woundEffects(6, 4), 0);

  /* ── The book's worked example, end to end ───────────────────────────────── */
  const enhancer = S.plan({ kind: 'cyberware', grade: 'Standard', points: 3 });
  t.eq('Leggy\'s reaction enhancer: 1 die vs TN 3', [enhancer.dice, enhancer.tn], [1, 3]);
  t.is('…at Moderate Stress', enhancer.level, 'Moderate');
  const screen = S.plan({ kind: 'bioware', grade: 'Basic', points: 3 + 1 });
  t.eq('his nephritic screen, 3 already + 1: 2 dice vs TN 4', [screen.dice, screen.tn], [2, 4]);
  const reaction = S.plan({ kind: 'attribute', attribute: 6, points: 3 });
  t.eq('his Reaction: half of 6 unaugmented, vs TN 3', [reaction.dice, reaction.tn], [3, 3]);
  t.ok('none of the three fails automatically', ![enhancer, screen, reaction].some(p => p.autoFails));
  t.is('the page is cited', PAGE, 'M&M pp.124-131');

  /* ── The wiring, source-level ────────────────────────────────────────────── */
  const flow = read('scripts/SR3EStress.js');
  t.ok('the 1D6 ÷ 2 is rolled plainly — the Rule of Six does not apply to it',
    /new Roll\('1d6'\)/.test(flow) && /Rule of Six does not apply/.test(flow));
  t.ok('the Stress Test goes through rollPool, so ITS sixes do explode', /actor\.rollPool\(dice, tn,/.test(flow));
  t.ok('the TN is the new total, not what was added', /points:    after,/.test(flow));
  t.ok('Deadly posts no roll button', /Deadly Stress — <strong>it fails automatically<\/strong>/.test(flow));
  t.ok('applying Stress is the GM\'s', /Only the GM applies Stress/.test(flow));
  const models = read('scripts/data/ItemDataModels.js');
  t.ok('cyberware carries Stress and a cyberlimb Integrity Rating',
    /stress:            new NumberField\(\{ integer: true, initial: 0, min: 0 \}\)/.test(models)
    && /integrity:         new NumberField/.test(models));
  t.ok('bioware starts at 1, as the book says', /stress:           new NumberField\(\{ integer: true, initial: 1, min: 0 \}\)/.test(models));
  t.is('both actor types hold Attribute Stress', (read('scripts/data/ActorDataModels.js').match(/attributeStress:/g) ?? []).length, 2);
  const sheet = read('scripts/sheets/SR3EActorSheet.js');
  t.ok('the Cyber tab shows it and offers the GM the button', /_stressCell\(/.test(sheet) && /data-action="applyStress"/.test(sheet));
  t.ok('the card\'s roll button is gated to the decider', /_isDeciderId\(pl\.actorId\)/.test(read('scripts/sr3e.js')));
}
