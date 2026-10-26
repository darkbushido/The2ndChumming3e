/**
 * Legwork — contacts and Matrix searches · SR3 pp.253-256 (TODO 268).
 *
 * ⚠ The fixtures are chosen so the wrong readings give different numbers: a fee of Charisma 4 × Intelligence 5
 * (1,000¥ base) over 3 successes is 333¥, not 1,000¥ and not 3,000¥; three successes against a 1/2/3+ table
 * reveal THREE rows, where "only the tier you hit" shows one; Intelligence 5 gives 3 searches, not 2.
 */
import { Legwork, ASK, EAR, MATRIX, BASE_TN, MODES } from '../scripts/data/legwork.mjs';

export const name = 'legwork';

export async function run(t) {
  const L = Legwork;

  /* ── The fee · p.254: Charisma × Intelligence × 50, divided by the successes ─── */
  t.eq('Charisma 4, Intelligence 5, 3 successes → 1,000¥ base, 333¥', L.fee(4, 5, 3), { base: 1000, successes: 3, fee: 333 });
  t.is('one success pays the whole base', L.fee(3, 3, 1).fee, 450);
  t.is('more successes make it cheaper — 6 successes on 1,000¥ is 167¥', L.fee(4, 5, 6).fee, 167);
  t.is('no successes: no information and no fee (nothing to divide by)', L.fee(4, 5, 0).fee, null);
  t.is('…and the base is still shown', L.fee(4, 5, 0).base, 1000);
  t.is('blank stats read as 0, never NaN', L.fee('', undefined, 2).fee, 0);

  /* ── Target numbers · p.253-254 ─────────────────────────────────────────────── */
  t.is('asking a contact is TN 4 by default', L.targetNumber({ mode: ASK }), 4);
  t.is('BASE_TN is 4', BASE_TN, 4);
  t.is("…or the success table's", L.targetNumber({ base: 6, mode: ASK }), 6);
  t.is('a rushed meeting is +2 on the information test', L.targetNumber({ base: 4, mode: ASK, rushed: true }), 6);
  t.is('an ear to the ground is the table TN +2', L.targetNumber({ base: 5, mode: EAR }), 7);
  t.is('…and "rushed" does not stack on it (no meeting)', L.targetNumber({ base: 5, mode: EAR, rushed: true }), 7);
  t.is('a Matrix search is the table TN, no +2', L.targetNumber({ base: 5, mode: MATRIX }), 5);
  t.is('…and is never rushed', L.targetNumber({ base: 5, mode: MATRIX, rushed: true }), 5);
  t.is("the runner's wounds raise the runner's test", L.targetNumber({ base: 4, mode: ASK, wounds: 2 }), 6);
  t.is("…but not the contact's own test", L.targetNumber({ base: 4, mode: EAR, wounds: 2 }), 6);
  t.is('other modifiers add, and the TN never falls below 2', L.targetNumber({ base: 4, mode: ASK, other: -5 }), 2);

  /* ── Contact levels · p.256 ─────────────────────────────────────────────────── */
  t.is('Level 1 adds no dice', L.levelDice(1, ASK), 0);
  t.is('Level 2 adds 1 die', L.levelDice(2, ASK), 1);
  t.is('Level 3 adds 2 dice', L.levelDice(3, ASK), 2);
  t.is("the level dice are the runner's — none on the contact's ear-to-the-ground test", L.levelDice(3, EAR), 0);
  t.is('…and none on a Matrix search', L.levelDice(3, MATRIX), 0);
  t.is('the dialog offers the Loyalty as the level, capped at 3', L.levelFromLoyalty(5), 3);
  t.is('…Loyalty 2 → Level 2', L.levelFromLoyalty(2), 2);
  t.is('…and never below 1', L.levelFromLoyalty(0), 1);

  /* ── The Matrix · p.254 ─────────────────────────────────────────────────────── */
  t.is('Intelligence 5 → 3 searches at once (half, rounded UP)', L.maxSearches(5), 3);
  t.is('Intelligence 6 → 3', L.maxSearches(6), 3);
  t.is('Intelligence 1 → 1', L.maxSearches(1), 1);

  /* ── Ear to the ground · p.254 ──────────────────────────────────────────────── */
  t.ok('any success: the contact reports back', L.reportsBack(1));
  t.ok('…none: nothing', !L.reportsBack(0));

  /* ── Etiquette dice and specialisations ─────────────────────────────────────── */
  const etiquette = { rating: 3, specialisations: [{ name: 'Street', level: 2 }, { name: 'Matrix', level: 1 }] };
  t.eq('base Etiquette', L.etiquetteDice(etiquette, ''), { dice: 3, spec: null });
  t.eq('Street is the rating plus its bonus', L.etiquetteDice(etiquette, 'street'), { dice: 5, spec: 'Street' });
  t.eq('a specialisation the runner lacks rolls the base', L.etiquetteDice(etiquette, 'Corporate'), { dice: 3, spec: null });
  t.eq('no Etiquette skill → 0 dice', L.etiquetteDice(null, 'Street'), { dice: 0, spec: null });
  t.is('a search starts on Matrix', L.defaultSpec(['Street', 'Matrix'], MATRIX), 'Matrix');
  t.is('asking starts on Street', L.defaultSpec(['Corporate', 'Street'], ASK), 'Street');
  t.is('…then Corporate', L.defaultSpec(['Corporate', 'Tribal'], ASK), 'Corporate');
  t.is('…else the base skill', L.defaultSpec(['Tribal'], ASK), '');

  /* ── Success tables are cumulative · p.253 ──────────────────────────────────── */
  const table = [
    { range: [3, 99], description: 'Three' },
    { range: [1, 1],  description: 'One' },
    { range: [2, 2],  description: 'Two' },
  ];
  t.eq('three successes reveal every row from 1 to 3, in order', L.revealed(table, 3).map(r => r.text), ['One', 'Two', 'Three']);
  t.eq('two successes reveal rows 1 and 2', L.revealed(table, 2).map(r => r.text), ['One', 'Two']);
  t.eq('six successes still reveal everything (3+)', L.revealed(table, 6).map(r => r.text), ['One', 'Two', 'Three']);
  t.eq('no successes reveal nothing', L.revealed(table, 0), []);
  t.eq('a GM\'s 0-success row shows on a failure', L.revealed([{ range: [0, 0], description: 'Nothing' }, ...table], 0).map(r => r.text), ['Nothing']);
  t.eq('plain { low, text } rows work too', L.revealed([{ low: 1, text: 'a' }, { low: 2, text: 'b' }], 1).map(r => r.text), ['a']);

  /* ── The table's target number ──────────────────────────────────────────────── */
  t.is('"Target Number: 5" in the description', L.tableTN('<p>Target Number: 5 — the mage\'s secret</p>'), 5);
  t.is('"TN 6"', L.tableTN('Legwork (TN 6)'), 6);
  t.is('the flag wins', L.tableTN('Target Number 5', 7), 7);
  t.is('nothing stated → null (the dialog uses 4)', L.tableTN('Who knows what'), null);

  t.ok('every mode cites a page', Object.values(MODES).every(m => /SR3 p\.\d/.test(m.page)));
}
