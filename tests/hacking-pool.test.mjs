/**
 * The Hacking Pool follows the world's Matrix ruleset — TODO 275.
 *   Orthodox SR3: ⌊(INT + MPCP) ÷ 3⌋ (SR3 p.207). Matrix Defragged: INT + ⌊MPCP ÷ 3⌋ (MDF p.11).
 * Found live 2026-10-26: the Combat Decker sample showed 7 where the core book gives 4.
 */
import { readFileSync } from 'node:fs';
import { HackingPool } from '../scripts/data/hacking-pool.mjs';

export const name = 'hacking-pool';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  t.is('core: INT 6, MPCP 10 → 5', HackingPool.core(6, 10), 5);
  t.is('core: INT 5, MPCP 6 → 3', HackingPool.core(5, 6), 3);
  t.is('core: INT 4, MPCP 0 → 1', HackingPool.core(4, 0), 1);
  t.is('core: rounds down — INT 4, MPCP 7 → 3', HackingPool.core(4, 7), 3);
  t.is('core: junk is 0', HackingPool.core(undefined, 'x'), 0);

  t.is('Orthodox INT 4, MPCP 8 → 4', HackingPool.forRuleset('orthodox', 4, 8), 4);
  t.is('Defragged INT 4, MPCP 8 → 6', HackingPool.forRuleset('defragged', 4, 8), 6);
  t.is('an unknown / missing setting is Defragged (the default)', HackingPool.forRuleset(undefined, 4, 8), 6);

  t.is('equipped deck wins (Orthodox)', HackingPool.mpcpFor('orthodox', 7, 9), 7);
  t.is('equipped deck wins (Defragged)', HackingPool.mpcpFor('defragged', 7, 9), 7);
  t.is('Orthodox with no deck item uses the actor deck stats', HackingPool.mpcpFor('orthodox', null, 9), 9);
  t.is('Defragged with no deck item has none (actor stats ignored)', HackingPool.mpcpFor('defragged', null, 9), null);
  t.is('Orthodox with neither has none', HackingPool.mpcpFor('orthodox', null, 0), null);

  t.is('figure: no deck → null (no pool)', HackingPool.figure('defragged', 5, null, 0), null);
  t.is('figure: Orthodox, actor deck only', HackingPool.figure('orthodox', 5, null, 7), 4);
  t.is('figure: the same equipped deck differs by ruleset — 4 vs 7', [
    HackingPool.figure('orthodox', 5, 7, 0), HackingPool.figure('defragged', 5, 7, 0)].join('/'), '4/7');

  const actor = read('scripts/documents/SR3EActor.js');
  t.ok('the actor derives it through HackingPool.figure with the ruleset setting',
    /HackingPool\.figure\(matrixRuleset, /.test(actor) && /game\.settings\.get\('The2ndChumming3e', 'matrixRuleset'\)/.test(actor));
  const all = ['scripts/documents/SR3EActor.js', 'scripts/sheets/SR3EActorSheet.js', 'scripts/sr3e.js'].map(read).join('\n');
  t.ok('no consumer reads a separate Orthodox pool any more', !/OrthodoxHackingPool/.test(all));
  t.ok('the Orthodox Matrix tab shows the derived pool, not its own sum',
    /const hackingPool\s+= actor\.system\.derived\?\.hackingPool \?\? 0;/.test(read('scripts/sheets/SR3EActorSheet.js')));
}
