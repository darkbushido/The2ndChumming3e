/**
 * Move-by-wire's side effects — automatic Stress, TLE-x, CCSS · M&M p.60 (TODO 110).
 *
 * The bonuses are asserted in `tests/adept-powers.test.mjs` and the packs; this is the price of them.
 */
import { readFileSync } from 'node:fs';
import { MoveByWire, AUTOMATIC_STRESS_MONTHS, TLEX_SURGERY, PAGE } from '../scripts/data/move-by-wire.mjs';

export const name = 'move-by-wire';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  const M = MoveByWire;

  /* ── Which item it is ─────────────────────────────────────────────────────── */
  // ⚠ The packs abbreviate cyberware names, so this matches a stem (CLAUDE.md's rule).
  t.ok('"Move-by-Wire [2]" is the system', M.isSystem({ type: 'cyberware', name: 'Move-by-Wire [2]' }));
  t.ok('…however it is spelled', M.isSystem({ type: 'cyberware', name: 'Move by wire system' }));
  t.ok('wired reflexes are not', !M.isSystem({ type: 'cyberware', name: 'Wired Reflexes [2]' }));
  t.ok('…and neither is a gear item that says it', !M.isSystem({ type: 'gear', name: 'Move-by-Wire' }));

  /* ── The Automatic Stress Table ───────────────────────────────────────────── */
  t.eq('1 Stress every 6 / 4 / 2 / 1 months by rating', [1, 2, 3, 4].map(r => M.stressEveryMonths(r)), [6, 4, 2, 1]);
  t.eq('…that IS the table', AUTOMATIC_STRESS_MONTHS, { 1: 6, 2: 4, 3: 2, 4: 1 });
  t.is('a rating the table does not cover reads 0', M.stressEveryMonths(7), 0);
  t.eq('the Stress lands on BOTH Quickness and Reaction', M.STRESSED_ATTRIBUTES, ['quickness', 'reaction']);

  /* ── The TLE-x test ───────────────────────────────────────────────────────── */
  t.eq('unaugmented Willpower against rating × 2', [1, 2, 3, 4].map(r => M.tlexTN(r)), [2, 4, 6, 8]);
  t.is('…and never below 2', M.tlexTN(0), 2);
  t.ok('its cost is stated in both situations the book names',
    /−1 Charisma and all Charisma-based skills — in important social situations/.test(M.tlexNote())
    && /\+2 to Perception target numbers, −2 Initiative, and −1D6 Reaction/.test(M.tlexNote()));

  /* ── Brain surgery, twice at most ────────────────────────────────────────── */
  t.eq('a Correct Failure procedure at base TN 8, twice', [TLEX_SURGERY.limit, TLEX_SURGERY.targetNumber], [2, 8]);
  t.eq('…so the third is refused', [0, 1, 2, 3].map(n => M.surgeryExhausted(n)), [false, false, true, true]);
  t.is('the page is cited', PAGE, 'M&M p.60');

  /* ── The wiring, source-level ────────────────────────────────────────────── */
  const flow = read('scripts/SR3EStress.js');
  t.ok('Stress on the system — or on Quickness/Reaction — offers the Willpower test',
    /MoveByWire\.isSystem\(item\)/.test(flow) && /MoveByWire\.STRESSED_ATTRIBUTES\.includes\(id\)/.test(flow));
  t.ok('…rolled with UNAUGMENTED Willpower', /willpower: Math\.max\(0, Number\(actor\?\.system\?\.attributes\?\.willpower\?\.base\)/.test(flow));
  t.ok('…and the card says what failing it means, without setting it', /develops TLE-x/.test(flow) && /Set it on the Cyber tab/.test(flow));
  const sheet = read('scripts/sheets/SR3EActorSheet.js');
  t.ok('the Cyber tab shows the system\'s interval and the test', /_tlexLine\(actor\)/.test(sheet)
    && /1 Stress every \$\{months\} month/.test(sheet));
  t.ok('…and only the GM sets or clears TLE-x', /Only the GM sets TLE-x/.test(sheet));
  t.ok('clearing it counts a surgery, against the book\'s limit of two',
    /surgeries: has \? surg \+ 1 : surg/.test(sheet) && /it can only be done twice/.test(sheet));
  t.is('both actor types carry the flag', (read('scripts/data/ActorDataModels.js').match(/tlex:/g) ?? []).length, 2);
}
