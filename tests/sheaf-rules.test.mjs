/** Security Sheaf numbers · MDF p.23-24 · TODO 128 part 3. */
import { readFileSync } from 'node:fs';
import { SheafRules } from '../scripts/data/sheaf-rules.mjs';

export const name = 'sheaf-rules';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  const { ACTIONS } = await import('../scripts/data/action-economy.mjs');
  t.eq('a Matrix action is Complex, MDF p.8', [ACTIONS.matrixAction.cost, ACTIONS.matrixAction.page], ['complex', 'MDF p.8']);
  t.eq('the five decker flows charge it', (read('scripts/documents/SR3EActor.js').match(/charge\(this, 'matrixAction'/g) ?? []).length, 5);
  t.eq('pass 1: nothing has transpired', SheafRules.initiativePenalty(1), 0);
  t.eq('pass 3: two phases transpired → −20', SheafRules.initiativePenalty(3), -20);
  t.eq('a missing pass is 0, not positive', SheafRules.initiativePenalty(undefined), 0);
  t.eq('default Memory is System Rating × 500', SheafRules.defaultMemory(6), 3000);
  const ic = [{ name: 'Killer', grading: 'Gray', memoryRequired: 800 }, { name: 'Probe', grading: 'White', memoryRequired: 300 }];
  t.eq('within memory, no Mainframe: Gray IC is named',
    SheafRules.stockingReport({ memoryTotal: 3000, ic }), { used: 1100, total: 3000, over: 0, graded: ['Killer'] });
  t.eq('over memory is reported', SheafRules.stockingReport({ memoryTotal: 1000, ic }).over, 100);
  t.eq('Mainframe Support lifts both limits',
    SheafRules.stockingReport({ memoryTotal: 1000, mainframeSupport: true, ic }), { used: 1100, total: 1000, over: 0, graded: [] });
  t.ok('activation rolls triggered IC with the editable penalty', /rollTriggeredICInitiative/.test(read('scripts/sr3e.js')) && /static async rollTriggeredICInitiative/.test(read('scripts/documents/SR3EActor.js')));
  t.ok('an IC turn posts a GM prompt card and a ruleset-aware attack button', ['sr-ic-turn-btn', 'ic.rollOrthodoxICAttack()', 'whisper: game.users.filter(u => u.isGM)'].every(s => read('scripts/sr3e.js').includes(s)));
  t.ok('Orthodox Matrix Initiative is VR-Hot only, and the Orthodox tab can set the mode', read('scripts/documents/SR3EActor.js').includes('&& useMatrixHot) {') && read('scripts/documents/SR3EActor.js').includes('Orthodox SR3 — VR-Hot ONLY') && read('scripts/sheets/SR3EActorSheet.js').includes('User mode:'));
  t.ok('the sheaf prompt reports it', /SheafRules\.stockingReport/.test(read('scripts/documents/SR3EActor.js')));
}
